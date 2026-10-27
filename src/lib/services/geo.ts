// Servicio de geolocalización por país y código postal
// Utiliza endpoint proxy interno (/api/geo) para evitar bloqueos del navegador por AdBlockers (net::ERR_BLOCKED_BY_CLIENT)

export interface GeoResult {
	ciudad: string;
	estado: string;
	municipio: string;
}

export interface GeoLookupResponse {
	result: GeoResult | null;
	message?: string;
	suggestedCountry?: string;
}

/**
 * Consulta la API de geolocalización y retorna tanto el resultado como diagnósticos informativos / sugerencias.
 */
export async function lookupGeoLocationWithDetails(
	iso2: string,
	postalCode: string,
	countryName?: string
): Promise<GeoLookupResponse> {
	let cleanIso = (iso2 || '').trim().toLowerCase();
	let cleanZip = (postalCode || '').trim();

	if (!cleanZip) return { result: null, message: 'Ingresa un código postal.' };

	// Detección defensiva por si los parámetros se enviaron invertidos
	if (/^\d{3,10}$/.test(cleanIso) && /^[a-zA-Z]{2}$/i.test(cleanZip)) {
		const temp = cleanIso;
		cleanIso = cleanZip.toLowerCase();
		cleanZip = temp;
	}

	try {
		// 1. Intento a través del endpoint proxy del servidor
		const params = new URLSearchParams({
			iso2: cleanIso,
			postalcode: cleanZip,
			country: countryName || ''
		});

		const res = await fetch(`/api/geo?${params.toString()}`);
		if (res.ok) {
			const data = await res.json();
			return {
				result: data.result || null,
				message: data.message,
				suggestedCountry: data.suggestedCountry
			};
		}
	} catch (e) {
		console.warn('Fallo consulta proxy /api/geo, intentando directo:', e);
	}

	// 2. Direct Fallback si el proxy interno no respondiera
	try {
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

				return { result: { ciudad, estado, municipio } };
			}
		}
	} catch (e) {
		console.warn('Fallo consulta directa Zippopotam:', e);
	}

	return { result: null, message: `No se encontró ubicación para el código postal ${cleanZip}.` };
}

/**
 * Consulta la API de geolocalización según el código ISO de 2 letras del país y el código postal.
 */
export async function lookupGeoLocation(
	iso2: string,
	postalCode: string,
	countryName?: string
): Promise<GeoResult | null> {
	const resp = await lookupGeoLocationWithDetails(iso2, postalCode, countryName);
	return resp.result;
}
