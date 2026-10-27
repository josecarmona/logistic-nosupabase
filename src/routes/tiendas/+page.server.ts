import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { TiendaWithRelations, Perfil, Pais, Zona, ConfiguracionCodigoTienda } from '$lib/types/database';
import { getRolesForUser } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.session) throw redirect(303, '/login');

	const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
	const isClienteOnly = roles.includes('cliente') && !roles.includes('admin') && !roles.includes('gerente') && !roles.includes('operador');
	if (isClienteOnly) throw redirect(303, '/ventas/historial');

	const search = url.searchParams.get('search') || '';
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const pageSize = 10;
	const from = (page - 1) * pageSize;
	const to = from + pageSize - 1;

	// Consulta base de tiendas con relaciones
	let query = locals.supabase
		.from('tiendas')
		.select(
			`
			*,
			supervisor:profiles!tiendas_supervisor_id_fkey(id, nombre_completo, email),
			pais:paises(id, nombre),
			zona:zonas(id, nombre)
		`,
			{ count: 'exact' }
		)
		.order('nombre', { ascending: true });

	if (search) {
		query = query.or(`nombre.ilike.%${search}%,numero_oficina.ilike.%${search}%,ciudad.ilike.%${search}%`);
	}

	const { data, count, error } = await query.range(from, to);

	if (error) {
		console.error('Error al cargar tiendas:', error);
	}

	// Cargar supervisores (Perfiles con rol distinto a 'cliente')
	const { data: rolesCliente } = await locals.supabase.from('roles').select('id').eq('nombre', 'cliente');
	const clienteRolId = rolesCliente && rolesCliente.length > 0 ? rolesCliente[0].id : null;

	let supervisoresQuery = locals.supabase
		.from('profiles')
		.select('id, nombre_completo, email, rol_id')
		.eq('activo', true)
		.order('nombre_completo', { ascending: true });

	if (clienteRolId) {
		supervisoresQuery = supervisoresQuery.neq('rol_id', clienteRolId);
	}

	const { data: supervisores } = await supervisoresQuery;

	// Cargar catálogos de Países, Zonas y Configuración de Código de Tienda
	const { data: paises } = await locals.supabase.from('paises').select('*').eq('activo', true).order('nombre');
	const { data: zonas } = await locals.supabase.from('zonas').select('*').order('nombre');
	const { data: configCodigo } = await locals.supabase
		.from('configuracion_codigo_tienda')
		.select('*')
		.order('id', { ascending: true })
		.maybeSingle();

	const totalItems = count || 0;
	const totalPages = Math.ceil(totalItems / pageSize) || 1;

	// Obtener roles reales del usuario para validar permiso de Admin
	const userRoles = locals.user ? await getRolesForUser(locals, locals.user) : [];
	const isAdmin = userRoles.includes('admin');

	return {
		tiendas: (data || []) as TiendaWithRelations[],
		totalItems,
		totalPages,
		currentPage: page,
		search,
		supervisores: (supervisores || []) as Pick<Perfil, 'id' | 'nombre_completo' | 'email'>[],
		paises: (paises || []) as Pais[],
		zonas: (zonas || []) as Zona[],
		configCodigo: (configCodigo || {
			prefijo: 'OFI',
			sufijo: null,
			longitud_numero: 6,
			consecutivo_actual: 0
		}) as ConfiguracionCodigoTienda,
		isAdmin
	};
};

export const actions: Actions = {
	createTienda: async ({ request, locals }) => {
		if (!locals.session) return fail(401, { message: 'No autorizado' });

		const formData = await request.formData();
		let numero_oficina = (formData.get('numero_oficina') as string || '').trim().toUpperCase();
		const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();
		const supervisor_id = (formData.get('supervisor_id') as string) || null;
		const email = (formData.get('email') as string || '').trim().toLowerCase();
		const telefono = (formData.get('telefono') as string || '').trim();
		const celular = (formData.get('celular') as string || '').trim();
		const calle = (formData.get('calle') as string || '').trim().toUpperCase();
		const otra_direccion = (formData.get('otra_direccion') as string || '').trim().toUpperCase();
		const pais_id_raw = formData.get('pais_id') as string;
		const codigo_postal = (formData.get('codigo_postal') as string || '').trim().toUpperCase();
		const estado = (formData.get('estado') as string || '').trim().toUpperCase();
		const ciudad = (formData.get('ciudad') as string || '').trim().toUpperCase();
		const municipio = (formData.get('municipio') as string || '').trim().toUpperCase();
		const zona_id_raw = formData.get('zona_id') as string;

		if (!nombre) {
			return fail(400, { message: 'El nombre de la tienda es obligatorio' });
		}

		const pais_id = pais_id_raw ? parseInt(pais_id_raw, 10) : null;
		const zona_id = zona_id_raw ? parseInt(zona_id_raw, 10) : null;

		// Si numero_oficina viene vacío, se pasa null para que el trigger trg_auto_numero_oficina lo genere automáticamente
		const finalNumeroOficina = numero_oficina || null;

		const { error: insErr } = await locals.supabase.from('tiendas').insert({
			numero_oficina: finalNumeroOficina,
			nombre,
			supervisor_id: supervisor_id || null,
			email: email || null,
			telefono: telefono || null,
			celular: celular || null,
			calle: calle || null,
			otra_direccion: otra_direccion || null,
			pais_id,
			codigo_postal: codigo_postal || null,
			estado: estado || null,
			ciudad: ciudad || null,
			municipio: municipio || null,
			zona_id,
			activo: true
		});

		if (insErr) {
			return fail(500, { message: `Error al crear tienda: ${insErr.message}` });
		}

		return { success: true, action: 'createTienda' };
	},

	updateTienda: async ({ request, locals }) => {
		if (!locals.session) return fail(401, { message: 'No autorizado' });

		const formData = await request.formData();
		const id_raw = formData.get('id') as string;
		const id = id_raw ? parseInt(id_raw, 10) : null;

		if (!id) return fail(400, { message: 'ID de tienda no proporcionado' });

		const numero_oficina = (formData.get('numero_oficina') as string || '').trim().toUpperCase();
		const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();
		const supervisor_id = (formData.get('supervisor_id') as string) || null;
		const email = (formData.get('email') as string || '').trim().toLowerCase();
		const telefono = (formData.get('telefono') as string || '').trim();
		const celular = (formData.get('celular') as string || '').trim();
		const calle = (formData.get('calle') as string || '').trim().toUpperCase();
		const otra_direccion = (formData.get('otra_direccion') as string || '').trim().toUpperCase();
		const pais_id_raw = formData.get('pais_id') as string;
		const codigo_postal = (formData.get('codigo_postal') as string || '').trim().toUpperCase();
		const estado = (formData.get('estado') as string || '').trim().toUpperCase();
		const ciudad = (formData.get('ciudad') as string || '').trim().toUpperCase();
		const municipio = (formData.get('municipio') as string || '').trim().toUpperCase();
		const zona_id_raw = formData.get('zona_id') as string;

		if (!nombre) {
			return fail(400, { message: 'El nombre de la tienda es obligatorio' });
		}

		const pais_id = pais_id_raw ? parseInt(pais_id_raw, 10) : null;
		const zona_id = zona_id_raw ? parseInt(zona_id_raw, 10) : null;

		const updatePayload: any = {
			nombre,
			supervisor_id: supervisor_id || null,
			email: email || null,
			telefono: telefono || null,
			celular: celular || null,
			calle: calle || null,
			otra_direccion: otra_direccion || null,
			pais_id,
			codigo_postal: codigo_postal || null,
			estado: estado || null,
			ciudad: ciudad || null,
			municipio: municipio || null,
			zona_id,
			updated_at: new Date().toISOString()
		};

		if (numero_oficina) {
			updatePayload.numero_oficina = numero_oficina;
		}

		const { error: updErr } = await locals.supabase
			.from('tiendas')
			.update(updatePayload)
			.eq('id', id);

		if (updErr) {
			return fail(500, { message: `Error al actualizar tienda: ${updErr.message}` });
		}

		return { success: true, action: 'updateTienda' };
	},

	toggleActiveTienda: async ({ request, locals }) => {
		if (!locals.session) return fail(401, { message: 'No autorizado' });

		const formData = await request.formData();
		const id_raw = formData.get('id') as string;
		const id = id_raw ? parseInt(id_raw, 10) : null;
		const currentActive = formData.get('activo') === 'true';

		if (!id) return fail(400, { message: 'ID de tienda no proporcionado' });

		const { error: toggleErr } = await locals.supabase
			.from('tiendas')
			.update({ activo: !currentActive, updated_at: new Date().toISOString() })
			.eq('id', id);

		if (toggleErr) {
			return fail(500, { message: `Error al cambiar estado de tienda: ${toggleErr.message}` });
		}

		return { success: true, action: 'toggleActiveTienda' };
	},

	// Acciones de Configuración del Número de Oficina de Tiendas
	updateConfigCodigoTienda: async ({ request, locals }) => {
		const userRoles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!locals.session || !userRoles.includes('admin')) {
			return fail(403, { message: 'Acceso denegado. Solo el administrador puede modificar la configuración del código de tienda.' });
		}

		const formData = await request.formData();
		const prefijo = (formData.get('prefijo') as string || '').trim().toUpperCase();
		const sufijo = (formData.get('sufijo') as string || '').trim().toUpperCase();
		const longitud_raw = formData.get('longitud_numero') as string;

		let longitud_numero = parseInt(longitud_raw || '6', 10);
		if (isNaN(longitud_numero) || longitud_numero < 1 || longitud_numero > 12) {
			return fail(400, { message: 'La longitud de dígitos debe estar entre 1 y 12' });
		}

		const { data: current } = await locals.supabase
			.from('configuracion_codigo_tienda')
			.select('id')
			.order('id', { ascending: true })
			.maybeSingle();

		if (current) {
			const { error: updErr } = await locals.supabase
				.from('configuracion_codigo_tienda')
				.update({
					prefijo: prefijo || null,
					sufijo: sufijo || null,
					longitud_numero,
					updated_at: new Date().toISOString()
				})
				.eq('id', current.id);

			if (updErr) {
				return fail(500, { message: `Error al actualizar configuración de número de oficina: ${updErr.message}` });
			}
		} else {
			const { error: insErr } = await locals.supabase
				.from('configuracion_codigo_tienda')
				.insert({
					prefijo: prefijo || null,
					sufijo: sufijo || null,
					longitud_numero,
					consecutivo_actual: 0
				});

			if (insErr) {
				return fail(500, { message: `Error al crear configuración: ${insErr.message}` });
			}
		}

		// Ejecutar barrido masivo de reconstrucción de números de oficina con la nueva configuración
		const { data: updatedCount, error: rpcErr } = await locals.supabase.rpc('reconstruir_codigos_tienda');

		let count = updatedCount;

		if (rpcErr) {
			console.warn('RPC reconstruir_codigos_tienda no disponible o falló, ejecutando barrido manual desde servidor:', rpcErr.message);

			const { data: allTiendas } = await locals.supabase
				.from('tiendas')
				.select('id')
				.order('created_at', { ascending: true });

			if (allTiendas && allTiendas.length > 0) {
				const pFix = prefijo ? prefijo.trim().toUpperCase() : '';
				const sFix = sufijo ? sufijo.trim().toUpperCase() : '';
				let idx = 0;

				for (const t of allTiendas) {
					idx++;
					const numStr = String(idx).padStart(longitud_numero, '0');
					let finalCode = numStr;
					if (pFix && sFix) finalCode = `${pFix}-${numStr}-${sFix}`;
					else if (pFix && !sFix) finalCode = `${pFix}-${numStr}`;
					else if (!pFix && sFix) finalCode = `${numStr}-${sFix}`;

					await locals.supabase
						.from('tiendas')
						.update({ numero_oficina: finalCode, updated_at: new Date().toISOString() })
						.eq('id', t.id);
				}

				count = allTiendas.length;

				const targetId = current?.id || 1;
				await locals.supabase
					.from('configuracion_codigo_tienda')
					.update({ consecutivo_actual: count })
					.eq('id', targetId);
			}
		}

		return { success: true, action: 'updateConfigCodigoTienda', updatedCount: count || 0 };
	},

	// Acciones del Maestro de Zonas (Exclusivas de Administrador)
	createZone: async ({ request, locals }) => {
		const userRoles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!locals.session || !userRoles.includes('admin')) {
			return fail(403, { message: 'Acceso denegado. Solo el administrador puede gestionar zonas.' });
		}

		const formData = await request.formData();
		const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();
		const descripcion = (formData.get('descripcion') as string || '').trim().toUpperCase();

		if (!nombre) return fail(400, { message: 'El nombre de la zona es obligatorio' });

		const { error: insErr } = await locals.supabase.from('zonas').insert({
			nombre,
			descripcion: descripcion || null,
			activo: true
		});

		if (insErr) {
			return fail(500, { message: `Error al crear zona: ${insErr.message}` });
		}

		return { success: true, action: 'createZone' };
	},

	updateZone: async ({ request, locals }) => {
		const userRoles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!locals.session || !userRoles.includes('admin')) {
			return fail(403, { message: 'Acceso denegado. Solo el administrador puede gestionar zonas.' });
		}

		const formData = await request.formData();
		const id_raw = formData.get('id') as string;
		const id = id_raw ? parseInt(id_raw, 10) : null;
		const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();
		const descripcion = (formData.get('descripcion') as string || '').trim().toUpperCase();

		if (!id || !nombre) return fail(400, { message: 'ID y nombre de zona son obligatorios' });

		const { error: updErr } = await locals.supabase
			.from('zonas')
			.update({
				nombre,
				descripcion: descripcion || null,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (updErr) {
			return fail(500, { message: `Error al actualizar zona: ${updErr.message}` });
		}

		return { success: true, action: 'updateZone' };
	},

	toggleActiveZone: async ({ request, locals }) => {
		const userRoles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!locals.session || !userRoles.includes('admin')) {
			return fail(403, { message: 'Acceso denegado. Solo el administrador puede gestionar zonas.' });
		}

		const formData = await request.formData();
		const id_raw = formData.get('id') as string;
		const id = id_raw ? parseInt(id_raw, 10) : null;
		const currentActive = formData.get('activo') === 'true';

		if (!id) return fail(400, { message: 'ID de zona no proporcionado' });

		const { error: toggleErr } = await locals.supabase
			.from('tiendas')
			.update({ activo: !currentActive, updated_at: new Date().toISOString() })
			.eq('id', id);

		if (toggleErr) {
			return fail(500, { message: `Error al cambiar estado de zona: ${toggleErr.message}` });
		}

		return { success: true, action: 'toggleActiveZone' };
	}
};
