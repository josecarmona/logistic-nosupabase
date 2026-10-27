import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { ProfileWithRelations, Pais, TipoAdquisicion, MaestroRol } from '$lib/types/database';
import { getRolesForUser, syncAuthUser, generarCorreoVirtualCliente } from '$lib/server/auth';
import { createSupabaseAdminClient } from '$lib/server/supabase';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Verificar que haya sesión iniciada
	if (!locals.session) {
		throw redirect(303, '/login');
	}

	const userRoles = locals.user ? await getRolesForUser(locals, locals.user) : [];
	const isClienteOnly = userRoles.includes('cliente') && !userRoles.includes('admin') && !userRoles.includes('gerente') && !userRoles.includes('operador');
	if (isClienteOnly) throw redirect(303, '/ventas/historial');

	const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
	const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
	const pageSize = 10;

	const search = (url.searchParams.get('search') || '').trim();

	const adminClient = createSupabaseAdminClient();

	// Buscar id del rol 'cliente'
	const { data: clienteRol } = await adminClient
		.from('roles')
		.select('id')
		.eq('nombre', 'cliente')
		.maybeSingle();

	const clienteRolId = clienteRol?.id;

	// Consulta de perfiles filtrados por el rol 'cliente'
	let query = adminClient
		.from('profiles')
		.select(
			`
			*,
			pais:paises(id, nombre, codigo_iso2),
			tipo_adquisicion:tipo_adquisiciones(id, nombre),
			rol:roles(id, nombre)
		`,
			{ count: 'exact' }
		);

	if (clienteRolId) {
		query = query.eq('rol_id', clienteRolId);
	}

	query = query.order('nombre_completo', { ascending: true });

	if (search) {
		query = query.or(`nombre_completo.ilike.%${search}%,email.ilike.%${search}%,codigo.ilike.%${search}%,numero_celular.ilike.%${search}%,cedula.ilike.%${search}%`);
	}

	const from = (page - 1) * pageSize;
	const to = from + pageSize - 1;

	const { data, count, error: err } = await query.range(from, to);

	if (err) {
		console.error('Error al cargar clientes:', err.message);
	}

	// Catálogos para formularios de creación y edición
	const { data: paises } = await adminClient.from('paises').select('*').order('nombre');
	const { data: adquisiciones } = await adminClient.from('tipo_adquisiciones').select('*').order('nombre');
	const { data: roles } = await adminClient.from('roles').select('*').order('nombre');

	const isAdmin = userRoles.includes('admin');

	const totalItems = count || 0;
	const totalPages = Math.ceil(totalItems / pageSize) || 1;

	return {
		clientes: (data || []) as ProfileWithRelations[],
		totalItems,
		totalPages,
		currentPage: page,
		search,
		paises: (paises || []) as Pais[],
		adquisiciones: (adquisiciones || []) as TipoAdquisicion[],
		roles: (roles || []) as MaestroRol[],
		isAdmin
	};
};

export const actions: Actions = {
	createClient: async ({ request, locals }) => {
		const formData = await request.formData();

		const email = (formData.get('email') as string || '').trim().toLowerCase();
		const nombre_completo = (formData.get('nombre_completo') as string || '').trim().toUpperCase();
		const razon_social = (formData.get('razon_social') as string || '').trim().toUpperCase();
		const direccion_1 = (formData.get('direccion_1') as string || '').trim().toUpperCase();
		const direccion_2 = (formData.get('direccion_2') as string || '').trim().toUpperCase();
		const pais_id_raw = formData.get('pais_id') as string;
		const codigo_postal = (formData.get('codigo_postal') as string || '').trim().toUpperCase();
		const ciudad = (formData.get('ciudad') as string || '').trim().toUpperCase();
		const estado = (formData.get('estado') as string || '').trim().toUpperCase();
		const municipio = (formData.get('municipio') as string || '').trim().toUpperCase();
		const numero_celular = (formData.get('numero_celular') as string || '').trim();
		const telefono = (formData.get('telefono') as string || '').trim();
		const tipo_adquisicion_id_raw = formData.get('tipo_adquisicion_id') as string;
		const referencia = (formData.get('referencia') as string || '').trim().toUpperCase();
		const cedula = (formData.get('cedula') as string || '').trim().toUpperCase();

		if (!nombre_completo) {
			return fail(400, { message: 'El nombre completo es obligatorio' });
		}

		const userRoles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		const isAdmin = userRoles.includes('admin');
		const adminClient = createSupabaseAdminClient();

		// Asignar rol: Si es admin y especificó un rol, se usa ese rol; de lo contrario, se asigna el rol 'cliente'
		let rol_id: number | null = null;
		const rol_id_raw = formData.get('rol_id') as string;
		if (isAdmin && rol_id_raw) {
			rol_id = parseInt(rol_id_raw, 10);
		} else {
			const { data: defaultRole } = await adminClient
				.from('roles')
				.select('id')
				.eq('nombre', 'cliente')
				.single();
			rol_id = defaultRole?.id || null;
		}

		const pais_id = pais_id_raw ? parseInt(pais_id_raw, 10) : null;
		const tipo_adquisicion_id = tipo_adquisicion_id_raw ? parseInt(tipo_adquisicion_id_raw, 10) : null;

		const { error: insErr } = await adminClient.from('profiles').insert({
			email: email || null,
			nombre_completo,
			cedula: cedula || null,
			razon_social: razon_social || null,
			direccion_1: direccion_1 || null,
			direccion_2: direccion_2 || null,
			pais_id,
			codigo_postal: codigo_postal || null,
			ciudad: ciudad || null,
			estado: estado || null,
			municipio: municipio || null,
			numero_celular: numero_celular || null,
			telefono: telefono || null,
			tipo_adquisicion_id,
			referencia: referencia || null,
			rol_id,
			activo: true
		});

		if (insErr) {
			return fail(500, { message: `Error al registrar cliente: ${insErr.message}` });
		}

		return { success: true, action: 'create' };
	},

	updateClient: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { message: 'ID de cliente no proporcionado' });

		const email = (formData.get('email') as string || '').trim().toLowerCase();
		const nombre_completo = (formData.get('nombre_completo') as string || '').trim().toUpperCase();
		const razon_social = (formData.get('razon_social') as string || '').trim().toUpperCase();
		const direccion_1 = (formData.get('direccion_1') as string || '').trim().toUpperCase();
		const direccion_2 = (formData.get('direccion_2') as string || '').trim().toUpperCase();
		const pais_id_raw = formData.get('pais_id') as string;
		const codigo_postal = (formData.get('codigo_postal') as string || '').trim().toUpperCase();
		const ciudad = (formData.get('ciudad') as string || '').trim().toUpperCase();
		const estado = (formData.get('estado') as string || '').trim().toUpperCase();
		const municipio = (formData.get('municipio') as string || '').trim().toUpperCase();
		const numero_celular = (formData.get('numero_celular') as string || '').trim();
		const telefono = (formData.get('telefono') as string || '').trim();
		const tipo_adquisicion_id_raw = formData.get('tipo_adquisicion_id') as string;
		const referencia = (formData.get('referencia') as string || '').trim().toUpperCase();
		const cedula = (formData.get('cedula') as string || '').trim().toUpperCase();

		if (!nombre_completo) {
			return fail(400, { message: 'El nombre completo es obligatorio' });
		}

		const userRoles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		const isAdmin = userRoles.includes('admin');
		const adminClient = createSupabaseAdminClient();

		const pais_id = pais_id_raw ? parseInt(pais_id_raw, 10) : null;
		const tipo_adquisicion_id = tipo_adquisicion_id_raw ? parseInt(tipo_adquisicion_id_raw, 10) : null;

		const updatePayload: Record<string, any> = {
			email: email || null,
			nombre_completo,
			cedula: cedula || null,
			razon_social: razon_social || null,
			direccion_1: direccion_1 || null,
			direccion_2: direccion_2 || null,
			pais_id,
			codigo_postal: codigo_postal || null,
			ciudad: ciudad || null,
			estado: estado || null,
			municipio: municipio || null,
			numero_celular: numero_celular || null,
			telefono: telefono || null,
			tipo_adquisicion_id,
			referencia: referencia || null,
			updated_at: new Date().toISOString()
		};

		// Permiso exclusivo para administrador de actualizar el rol del perfil
		// Si el rol cambia, se genera automáticamente el nuevo código correspondiente al nuevo rol
		if (isAdmin) {
			const rol_id_raw = formData.get('rol_id') as string;
			if (rol_id_raw) {
				const newRolId = parseInt(rol_id_raw, 10);
				const { data: currentP } = await adminClient
					.from('profiles')
					.select('rol_id')
					.eq('id', id)
					.maybeSingle();

				updatePayload.rol_id = newRolId;

				if (currentP && currentP.rol_id !== newRolId) {
					const { data: newCode } = await adminClient.rpc('generar_codigo_perfil', { p_rol_id: newRolId });
					if (newCode) {
						updatePayload.codigo = newCode;
					}
				}
			}
		}

		const { error: updErr } = await adminClient
			.from('profiles')
			.update(updatePayload)
			.eq('id', id);

		if (updErr) {
			return fail(500, { message: `Error al actualizar cliente: ${updErr.message}` });
		}

		return { success: true, action: 'update' };
	},

	toggleActiveClient: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		const currentActive = formData.get('activo') === 'true';

		if (!id) return fail(400, { message: 'ID no proporcionado' });

		const adminClient = createSupabaseAdminClient();
		const { error: toggleErr } = await adminClient
			.from('profiles')
			.update({
				activo: !currentActive,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (toggleErr) {
			return fail(500, { message: `Error al cambiar estado del cliente: ${toggleErr.message}` });
		}

		return { success: true, action: 'toggleActive' };
	},

	linkAuthUser: async ({ request, locals }) => {
		const formData = await request.formData();
		const userRoles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!userRoles.includes('admin')) {
			return fail(403, { message: 'Solo los administradores pueden activar accesos de usuario.' });
		}

		const adminClient = createSupabaseAdminClient();
		const profileId = formData.get('profile_id') as string;
		let email = (formData.get('email') as string || '').trim().toLowerCase();
		const password = (formData.get('password') as string || '').trim();
		let nombre_completo = (formData.get('nombre_completo') as string || '').trim().toUpperCase();

		if (!profileId) {
			return fail(400, { message: 'El identificador de perfil es obligatorio' });
		}

		if (!password || password.length < 6) {
			return fail(400, { message: 'La contraseña de acceso debe contener al menos 6 caracteres' });
		}

		const { data: profile, error: pErr } = await adminClient
			.from('profiles')
			.select('id, codigo, email, nombre_completo, numero_celular')
			.eq('id', profileId)
			.maybeSingle();

		if (pErr || !profile) {
			return fail(404, { message: 'Cliente no encontrado' });
		}

		if (!nombre_completo) {
			nombre_completo = profile.nombre_completo || 'CLIENTE';
		}

		let isVirtualEmail = false;
		if (!email) {
			email = (profile.email || '').trim().toLowerCase();
		}

		if (!email) {
			email = generarCorreoVirtualCliente(profile.codigo, profile.id);
			isVirtualEmail = true;
		}

		// Actualizar preventivamente el email en el perfil para que el trigger handle_new_user lo asocie correctamente
		if (profile.email !== email) {
			await adminClient.from('profiles').update({ email }).eq('id', profileId);
		}

		const authUserId = await syncAuthUser(email, password, nombre_completo);
		if (!authUserId) {
			return fail(500, { message: 'No se pudo crear o sincronizar el usuario en Supabase Auth' });
		}

		// Eliminar posibles perfiles duplicados creados por el trigger
		await adminClient.from('profiles').delete().eq('user_id', authUserId).neq('id', profileId);

		const { error: updErr } = await adminClient
			.from('profiles')
			.update({
				user_id: authUserId,
				email: email,
				updated_at: new Date().toISOString()
			})
			.eq('id', profileId);

		if (updErr) {
			return fail(500, { message: `Error al actualizar perfil con usuario auth: ${updErr.message}` });
		}

		await adminClient.from('profiles').update({ password_visible: password }).eq('id', profileId);

		return {
			success: true,
			action: 'linkAuthUser',
			profileId,
			userId: authUserId,
			email,
			message: isVirtualEmail
				? `Cuenta vinculada exitosamente con correo virtual: ${email}. El usuario puede ingresar con su código (${profile.codigo || ''}) o número celular.`
				: 'Cuenta de acceso vinculada exitosamente'
		};
	}
};
