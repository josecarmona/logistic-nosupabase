import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchZoomCiudades } from '$lib/services/zoom-api';

export const GET: RequestHandler = async ({ url, locals }) => {
	const proveedorIdRaw = url.searchParams.get('proveedorId');
	if (!proveedorIdRaw) {
		return json({ error: 'proveedorId requerido' }, { status: 400 });
	}

	const proveedorId = parseInt(proveedorIdRaw, 10);
	if (isNaN(proveedorId)) {
		return json({ error: 'ID de proveedor inválido' }, { status: 400 });
	}

	// Consultar proveedor
	const { data: prov, error: provErr } = await locals.supabase
		.from('proveedores')
		.select('id, nombre, tiene_api')
		.eq('id', proveedorId)
		.maybeSingle();

	if (provErr || !prov) {
		return json({ error: 'Proveedor no encontrado' }, { status: 404 });
	}

	// Si tiene API asociada, obtener ciudades desde la API del proveedor
	if (prov.tiene_api) {
		try {
			const ciudadesApi = await fetchZoomCiudades();
			return json({
				ciudades: ciudadesApi,
				tiene_api: true,
				origen: 'api'
			});
		} catch (err) {
			console.error('Error al obtener ciudades desde la API del proveedor:', err);
		}
	}

	// Si no tiene API o falló, obtener ciudades de las direcciones registradas
	try {
		const { data: dirs } = await locals.supabase
			.from('proveedor_direcciones')
			.select('ciudad')
			.eq('proveedor_id', proveedorId)
			.eq('activo', true);

		const ciudades = Array.from(
			new Set((dirs || []).map((d) => (d.ciudad || '').trim().toUpperCase()).filter(Boolean))
		).sort();

		return json({
			ciudades,
			tiene_api: false,
			origen: 'direcciones'
		});
	} catch {
		return json({
			ciudades: [],
			tiene_api: false,
			origen: 'vacio'
		});
	}
};
