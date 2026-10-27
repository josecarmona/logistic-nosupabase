import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	let cleanIso = (url.searchParams.get('iso2') || '').trim().toLowerCase();
	let cleanZip = (url.searchParams.get('postalcode') || '').trim().replace(/[\s-]/g, '');
	const countryName = (url.searchParams.get('country') || '').trim();

	if (!cleanZip) {
		return json({ result: null, message: 'Ingresa un código postal.' });
	}

	// Detección defensiva por si los parámetros se invirtieron
	if (/^\d{3,10}$/.test(cleanIso) && /^[a-zA-Z]{2}$/i.test(cleanZip)) {
		const temp = cleanIso;
		cleanIso = cleanZip.toLowerCase();
		cleanZip = temp;
	}

	// Normalizaciones comunes por país:
	// México y EE.UU. usan códigos postales de 5 dígitos (ej. CDMX 01000 si el usuario escribe 1000)
	if ((cleanIso === 'mx' || cleanIso === 'us') && /^\d{1,4}$/.test(cleanZip)) {
		cleanZip = cleanZip.padStart(5, '0');
	}

	try {
		// 1. Intento con Zippopotam.us desde el servidor Node.js
		const zipUrl = `https://api.zippopotam.us/${encodeURIComponent(cleanIso)}/${encodeURIComponent(cleanZip)}`;
		const resZip = await fetch(zipUrl, {
			headers: { Accept: 'application/json' }
		});

		if (resZip.ok) {
			const data = await resZip.json();
			if (data && data.places && data.places.length > 0) {
				const place = data.places[0];
				const ciudad = (place['place name'] || '').toUpperCase();
				const estado = (place['state'] || place['state abbreviation'] || '').toUpperCase();
				const municipio = (place['community'] || place['place name'] || '').toUpperCase();

				return json({ result: { ciudad, estado, municipio } });
			}
		}
	} catch (e) {
		console.warn('Fallo consulta Zippopotam servidor:', e);
	}

	try {
		// 2. Intento con Nominatim OpenStreetMap usando countrycodes (código ISO2 estándar)
		const nomUrl = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(cleanZip)}&countrycodes=${encodeURIComponent(cleanIso)}&format=json&addressdetails=1&limit=1`;
		const resNom = await fetch(nomUrl, {
			headers: {
				'User-Agent': 'LogisticApp/1.0',
				Accept: 'application/json'
			}
		});

		if (resNom.ok) {
			const results = await resNom.json();
			if (Array.isArray(results) && results.length > 0) {
				const addr = results[0].address || {};
				const ciudad = (
					addr.city ||
					addr.town ||
					addr.village ||
					addr.suburb ||
					addr.municipality ||
					''
				).toUpperCase();
				const estado = (addr.state || addr.region || '').toUpperCase();
				const municipio = (
					addr.county ||
					addr.municipality ||
					addr.city_district ||
					ciudad
				).toUpperCase();

				if (ciudad || estado || municipio) {
					return json({ result: { ciudad, estado, municipio } });
				}
			}
		}
	} catch (e) {
		console.warn('Fallo consulta Nominatim por countrycodes:', e);
	}

	// 3. Fallback adicional con Nominatim OpenStreetMap por nombre de país
	if (countryName) {
		try {
			const nomUrlName = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(cleanZip)}&country=${encodeURIComponent(countryName)}&format=json&addressdetails=1&limit=1`;
			const resNom = await fetch(nomUrlName, {
				headers: {
					'User-Agent': 'LogisticApp/1.0',
					Accept: 'application/json'
				}
			});

			if (resNom.ok) {
				const results = await resNom.json();
				if (Array.isArray(results) && results.length > 0) {
					const addr = results[0].address || {};
					const ciudad = (
						addr.city ||
						addr.town ||
						addr.village ||
						addr.suburb ||
						addr.municipality ||
						''
					).toUpperCase();
					const estado = (addr.state || addr.region || '').toUpperCase();
					const municipio = (
						addr.county ||
						addr.municipality ||
						addr.city_district ||
						ciudad
					).toUpperCase();

					if (ciudad || estado || municipio) {
						return json({ result: { ciudad, estado, municipio } });
					}
				}
			}
		} catch (e) {
			console.warn('Fallo consulta Nominatim por nombre de país:', e);
		}
	}

	// 4. Si no se encontró en el país seleccionado, diagnóstico inteligente y sugerencia para el usuario:
	let diagnosticMessage = `No se encontró ubicación para el código postal ${cleanZip} en ${countryName || cleanIso.toUpperCase()}.`;
	let suggestedCountry: string | undefined = undefined;

	// Si se buscaba en México y no se encontró:
	if (cleanIso === 'mx') {
		// Verificar si pertenece a EE.UU. (ej. 96101 = Alturas, CA)
		try {
			const usCheck = await fetch(`https://api.zippopotam.us/us/${encodeURIComponent(cleanZip)}`);
			if (usCheck.ok) {
				const usData = await usCheck.json();
				if (usData?.places?.[0]) {
					const p = usData.places[0];
					diagnosticMessage = `El código postal ${cleanZip} no existe en México (SEPOMEX). Corresponde a ${p['place name']}, ${p['state']} (Estados Unidos). Si buscas Veracruz, los códigos válidos en esa zona son 96100 (Santa Rita Laurel / Acayucan) o 96102 (Campo de Águila).`;
					suggestedCountry = 'US';
				}
			}
		} catch {
			// ignore
		}

		// Si no fue detectado en EE.UU. pero inicia con la serie 961xx:
		if (!suggestedCountry && cleanZip.startsWith('961')) {
			diagnosticMessage = `El código postal ${cleanZip} no existe en el catálogo oficial de Correos de México (SEPOMEX). En esa región de Veracruz los códigos válidos son 96100 (Santa Rita Laurel / Acayucan) o 96102 (Campo de Águila).`;
		}
	} else if (cleanIso === 'us') {
		// Si se buscaba en EE.UU., verificar si pertenece a México
		try {
			const mxCheck = await fetch(`https://api.zippopotam.us/mx/${encodeURIComponent(cleanZip)}`);
			if (mxCheck.ok) {
				const mxData = await mxCheck.json();
				if (mxData?.places?.[0]) {
					const p = mxData.places[0];
					diagnosticMessage = `El código postal ${cleanZip} no se encontró en EE.UU., pero corresponde a ${p['place name']}, ${p['state']} en México.`;
					suggestedCountry = 'MX';
				}
			}
		} catch {
			// ignore
		}
	}

	return json({
		result: null,
		message: diagnosticMessage,
		suggestedCountry
	});
};
