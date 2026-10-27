import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseAdminClient } from '$lib/server/supabase';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Verificar que el usuario tenga sesión activa
	if (!locals.session) {
		return json({ error: 'No autorizado' }, { status: 401 });
	}

	const q = (url.searchParams.get('q') || '').trim();
	const adminClient = createSupabaseAdminClient();

	// Si no hay búsqueda o es muy corta, devolver los primeros 30 clientes recientes
	if (!q || q.length < 2) {
		const { data: defaultClientes, error: defErr } = await adminClient
			.from('profiles')
			.select('*, pais:paises(id, nombre, codigo_iso2, codigo_iso3), tipo_adquisicion:tipo_adquisiciones(id, nombre)')
			.eq('activo', true)
			.or('rol_id.eq.4,rol_id.is.null')
			.order('nombre_completo', { ascending: true })
			.limit(50);

		if (defErr) {
			console.error('Error al obtener clientes por defecto:', defErr.message);
			return json([]);
		}
		return json(defaultClientes || []);
	}

	// Búsqueda dinámica en todos los 143,000 clientes por nombre, código, celular, teléfono o cédula
	const { data, error } = await adminClient
		.from('profiles')
		.select('*, pais:paises(id, nombre, codigo_iso2, codigo_iso3), tipo_adquisicion:tipo_adquisiciones(id, nombre)')
		.eq('activo', true)
		.or('rol_id.eq.4,rol_id.is.null')
		.or(`nombre_completo.ilike.%${q}%,codigo.ilike.%${q}%,numero_celular.ilike.%${q}%,telefono.ilike.%${q}%,cedula.ilike.%${q}%`)
		.order('nombre_completo', { ascending: true })
		.limit(50);

	if (error) {
		console.error('Error en búsqueda de clientes:', error.message);
		return json([]);
	}

	return json(data || []);
};
