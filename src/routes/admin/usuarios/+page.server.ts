import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { ProfileWithRelations, Pais, TipoAdquisicion, MaestroRol, ConfiguracionCodigoPerfil } from '$lib/types/database';
import { createSupabaseAdminClient } from '$lib/server/supabase';
import { syncAuthUser, generarCorreoVirtualCliente, getRolesForUser } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Verificar autenticación
	if (!locals.session) {
		throw redirect(303, '/login');
	}

	const adminClient = createSupabaseAdminClient();

	const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
	const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
	const pageSize = 15;
	const search = (url.searchParams.get('search') || '').trim();
	const rolParam = (url.searchParams.get('rol') || 'staff').trim();

	// Cargar catálogos usando cliente administrativo (bypasses RLS timeouts)
	const [
		{ data: paises },
		{ data: adquisiciones },
		{ data: roles },
		{ data: configsCodigo }
	] = await Promise.all([
		adminClient.from('paises').select('*').order('nombre'),
		adminClient.from('tipo_adquisiciones').select('*').order('nombre'),
		adminClient.from('roles').select('*').order('id', { ascending: true }),
		adminClient.from('configuracion_codigo_perfil').select('*').order('id', { ascending: true })
	]);

	const clienteRol = roles?.find((r) => r.nombre.toLowerCase() === 'cliente');
	const clienteRolId = clienteRol?.id ?? 4;

	// Consulta base de perfiles con sus relaciones
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

	// Filtro por rol: 'staff' (personal administrativo / no clientes), 'all' (todos), o ID numérico específico
	if (rolParam === 'staff') {
		query = query.neq('rol_id', clienteRolId);
	} else if (rolParam !== 'all') {
		const targetRolId = parseInt(rolParam, 10);
		if (!isNaN(targetRolId)) {
			query = query.eq('rol_id', targetRolId);
		}
	}

	if (search) {
		query = query.or(`nombre_completo.ilike.%${search}%,email.ilike.%${search}%,codigo.ilike.%${search}%,numero_celular.ilike.%${search}%,cedula.ilike.%${search}%`);
	}

	query = query.order('created_at', { ascending: true });

	const from = (page - 1) * pageSize;
	const to = from + pageSize - 1;

	const { data, count, error: err } = await query.range(from, to);

	if (err) {
		console.error('Error al cargar perfiles en admin/usuarios:', err.message);
	}

	let profilesList = (data || []) as ProfileWithRelations[];

	// Resolver password_visible desde user_metadata de Supabase Auth como respaldo si no está en la fila
	try {
		const { data: authUsersData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
		if (authUsersData?.users) {
			const authMap = new Map(authUsersData.users.map((u) => [u.id, u]));
			const authEmailMap = new Map(
				authUsersData.users
					.filter((u) => u.email)
					.map((u) => [u.email!.toLowerCase(), u])
			);
			profilesList = profilesList.map((p) => {
				if (p.password_visible) return p;
				const matchedUser =
					(p.user_id ? authMap.get(p.user_id) : undefined) ||
					(p.email ? authEmailMap.get(p.email.toLowerCase()) : undefined);
				const metaPass = matchedUser?.user_metadata?.password_visible as string | undefined;
				return metaPass ? { ...p, password_visible: metaPass } : p;
			});
		}
	} catch (e) {
		console.warn('No se pudo consultar user_metadata de auth.users:', e);
	}

	const userRoles = locals.user ? await getRolesForUser(locals, locals.user) : [];
	const currentUserEmail = (locals.user?.email || locals.session?.user?.email || '').toLowerCase();
	const currentUserName = (locals.user?.nombre_completo || '').toUpperCase();
	const canViewPasswords =
		currentUserEmail === 'hilvic.hernandez@hhworldgroup.com' ||
		currentUserName.includes('HILVIC') ||
		locals.user?.codigo === 'ADM-000003' ||
		userRoles.includes('admin');

	const totalItems = count || 0;
	const totalPages = Math.ceil(totalItems / pageSize) || 1;

	return {
		profiles: profilesList,
		canViewPasswords,
		totalItems,
		totalPages,
		currentPage: page,
		search,
		currentRol: rolParam,
		paises: (paises || []) as Pais[],
		adquisiciones: (adquisiciones || []) as TipoAdquisicion[],
		roles: (roles || []) as MaestroRol[],
		configsCodigo: (configsCodigo || []) as ConfiguracionCodigoPerfil[]
	};
};

export const actions: Actions = {
	createProfile: async ({ request }) => {
		const formData = await request.formData();
		const adminClient = createSupabaseAdminClient();

		let email = (formData.get('email') as string || '').trim().toLowerCase();
		const password = (formData.get('password') as string || '').trim();
		const nombre_completo = (formData.get('nombre_completo') as string || '').trim().toUpperCase();
		const razon_social = (formData.get('razon_social') as string || '').trim().toUpperCase();
		const cedula = (formData.get('cedula') as string || '').trim().toUpperCase();
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
		const rol_id_raw = formData.get('rol_id') as string;

		if (!nombre_completo) {
			return fail(400, { message: 'El nombre completo es obligatorio' });
		}

		if (password && password.length < 6) {
			return fail(400, { message: 'La contraseña de acceso debe contener al menos 6 caracteres' });
		}

		let rol_id = rol_id_raw ? parseInt(rol_id_raw, 10) : null;
		if (!rol_id) {
			const { data: defaultRole } = await adminClient
				.from('roles')
				.select('id')
				.eq('nombre', 'cliente')
				.single();
			rol_id = defaultRole?.id || null;
		}

		// Para personal administrativo (1: admin, 2: gerente, 3: operador), el correo es obligatorio
		if (rol_id && [1, 2, 3].includes(rol_id) && !email) {
			return fail(400, { message: 'El correo electrónico es obligatorio para el personal administrativo' });
		}

		const pais_id = pais_id_raw ? parseInt(pais_id_raw, 10) : null;
		const tipo_adquisicion_id = tipo_adquisicion_id_raw ? parseInt(tipo_adquisicion_id_raw, 10) : null;

		// Si se proporcionó contraseña pero no correo (cliente con acceso), generar código y correo virtual
		let codigoAsignado: string | null = null;
		if (password && !email) {
			const { data: newCode } = await adminClient.rpc('generar_codigo_perfil', { p_rol_id: rol_id });
			codigoAsignado = newCode || null;
			email = generarCorreoVirtualCliente(codigoAsignado);
		}

		const insertPayload: any = {
			email: email || null,
			nombre_completo,
			razon_social: razon_social || null,
			cedula: cedula || null,
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
		};

		if (codigoAsignado) {
			insertPayload.codigo = codigoAsignado;
		}

		const { data: createdProfile, error: insErr } = await adminClient
			.from('profiles')
			.insert(insertPayload)
			.select('id, email, codigo')
			.single();

		if (insErr || !createdProfile) {
			return fail(500, { message: `Error al registrar usuario/perfil: ${insErr?.message || 'Error desconocido'}` });
		}

		// Guardar password_visible si se proporcionó contraseña (con tolerancia si la columna aún no existe)
		if (password) {
			await adminClient.from('profiles').update({ password_visible: password }).eq('id', createdProfile.id);
		}

		// Sincronizar o crear usuario en Supabase Auth si se proporcionó contraseña
		let authUserId: string | null = null;
		if (email && password) {
			authUserId = await syncAuthUser(email, password, nombre_completo);
			if (authUserId) {
				await adminClient.from('profiles').delete().eq('user_id', authUserId).neq('id', createdProfile.id);
				await adminClient.from('profiles').update({ user_id: authUserId }).eq('id', createdProfile.id);
			}
		}

		return { success: true, action: 'create', createdUser: !!authUserId };
	},

	updateProfile: async ({ request }) => {
		const formData = await request.formData();
		const adminClient = createSupabaseAdminClient();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { message: 'ID no proporcionado' });

		let email = (formData.get('email') as string || '').trim().toLowerCase();
		const password = (formData.get('password') as string || '').trim();
		const nombre_completo = (formData.get('nombre_completo') as string || '').trim().toUpperCase();
		const razon_social = (formData.get('razon_social') as string || '').trim().toUpperCase();
		const cedula = (formData.get('cedula') as string || '').trim().toUpperCase();
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
		const rol_id_raw = formData.get('rol_id') as string;

		if (!nombre_completo) {
			return fail(400, { message: 'El nombre completo es obligatorio' });
		}

		const newRolId = rol_id_raw ? parseInt(rol_id_raw, 10) : null;

		// Si es personal de staff (1: admin, 2: gerente, 3: operador), el correo es obligatorio
		if (newRolId && [1, 2, 3].includes(newRolId) && !email) {
			return fail(400, { message: 'El correo electrónico es obligatorio para el personal administrativo' });
		}

		if (password && password.length < 6) {
			return fail(400, { message: 'La contraseña debe tener al menos 6 caracteres' });
		}

		const pais_id = pais_id_raw ? parseInt(pais_id_raw, 10) : null;
		const tipo_adquisicion_id = tipo_adquisicion_id_raw ? parseInt(tipo_adquisicion_id_raw, 10) : null;

		// Obtener datos actuales del perfil
		const { data: currentP } = await adminClient
			.from('profiles')
			.select('codigo, email, rol_id')
			.eq('id', id)
			.maybeSingle();

		// Si se proporcionó contraseña pero no correo, auto-generar correo virtual si no tiene ninguno previo
		let targetEmail = email;
		if (!targetEmail) {
			targetEmail = (currentP?.email || '').trim().toLowerCase();
		}
		if (password && password.length >= 6 && !targetEmail) {
			targetEmail = generarCorreoVirtualCliente(currentP?.codigo, id);
		}

		// Actualizar preventivamente el correo en el perfil si cambió o es nuevo virtual
		if (targetEmail && targetEmail !== currentP?.email) {
			await adminClient.from('profiles').update({ email: targetEmail }).eq('id', id);
		}

		// Sincronizar contraseña o usuario auth si se proporcionó contraseña
		let authUserId: string | null = null;
		if (targetEmail && password) {
			authUserId = await syncAuthUser(targetEmail, password, nombre_completo);
			if (authUserId) {
				await adminClient.from('profiles').delete().eq('user_id', authUserId).neq('id', id);
			}
		}

		const updatePayload: any = {
			email: targetEmail || null,
			nombre_completo,
			razon_social: razon_social || null,
			cedula: cedula || null,
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
			rol_id: newRolId,
			updated_at: new Date().toISOString()
		};

		if (authUserId) {
			updatePayload.user_id = authUserId;
		}

		// Si el rol cambia, se genera automáticamente el nuevo código correspondiente al nuevo rol
		if (newRolId && currentP && currentP.rol_id !== newRolId) {
			const { data: newCode } = await adminClient.rpc('generar_codigo_perfil', { p_rol_id: newRolId });
			if (newCode) {
				updatePayload.codigo = newCode;
			}
		}

		const { error: updErr } = await adminClient
			.from('profiles')
			.update(updatePayload)
			.eq('id', id);

		if (updErr) {
			return fail(500, { message: `Error al actualizar perfil: ${updErr.message}` });
		}

		if (password) {
			await adminClient.from('profiles').update({ password_visible: password }).eq('id', id);
		}

		return { success: true, action: 'update' };
	},

	linkAuthUser: async ({ request }) => {
		const formData = await request.formData();
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
			return fail(404, { message: 'Perfil no encontrado' });
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
			message: isVirtualEmail
				? `Cuenta vinculada exitosamente con correo virtual: ${email}. El usuario puede ingresar con su código (${profile.codigo || ''}) o número de celular.`
				: 'Cuenta de acceso vinculada exitosamente'
		};
	},

	updateCodeConfig: async ({ request }) => {
		const formData = await request.formData();
		const adminClient = createSupabaseAdminClient();
		const rol_id_raw = formData.get('rol_id') as string;
		const prefijo = (formData.get('prefijo') as string || '').trim().toUpperCase();
		const sufijo = (formData.get('sufijo') as string || '').trim().toUpperCase();
		const longitud_raw = formData.get('longitud_numero') as string;

		const targetRolId = rol_id_raw ? parseInt(rol_id_raw, 10) : null;

		let longitud_numero = parseInt(longitud_raw || '6', 10);
		if (isNaN(longitud_numero) || longitud_numero < 1 || longitud_numero > 12) {
			return fail(400, { message: 'La longitud de dígitos debe estar entre 1 y 12' });
		}

		// Buscar configuración previa para este rol específico
		let query = adminClient.from('configuracion_codigo_perfil').select('id');
		if (targetRolId) {
			query = query.eq('rol_id', targetRolId);
		}
		const { data: current } = await query.order('id', { ascending: true }).maybeSingle();

		if (current) {
			const { error: updErr } = await adminClient
				.from('configuracion_codigo_perfil')
				.update({
					prefijo: prefijo || null,
					sufijo: sufijo || null,
					longitud_numero,
					updated_at: new Date().toISOString()
				})
				.eq('id', current.id);

			if (updErr) {
				return fail(500, { message: `Error al actualizar configuración de código: ${updErr.message}` });
			}
		} else {
			const { error: insErr } = await adminClient
				.from('configuracion_codigo_perfil')
				.insert({
					rol_id: targetRolId,
					prefijo: prefijo || null,
					sufijo: sufijo || null,
					longitud_numero,
					consecutivo_actual: 0
				});

			if (insErr) {
				return fail(500, { message: `Error al crear configuración: ${insErr.message}` });
			}
		}

		// Ejecutar reconstrucción de códigos para el rol con la nueva configuración
		const { data: updatedCount, error: rpcErr } = await adminClient.rpc('reconstruir_codigos_perfil', {
			p_rol_id: targetRolId
		});

		let count = updatedCount;

		if (rpcErr) {
			console.warn('RPC reconstruir_codigos_perfil falló, ejecutando barrido manual:', rpcErr.message);

			let pQuery = adminClient.from('profiles').select('id').order('created_at', { ascending: true });
			if (targetRolId) {
				pQuery = pQuery.eq('rol_id', targetRolId);
			}
			const { data: allProfiles } = await pQuery;

			if (allProfiles && allProfiles.length > 0) {
				const pFix = prefijo ? prefijo.trim().toUpperCase() : '';
				const sFix = sufijo ? sufijo.trim().toUpperCase() : '';
				let idx = 0;

				for (const p of allProfiles) {
					idx++;
					const numStr = String(idx).padStart(longitud_numero, '0');
					let finalCode = numStr;
					if (pFix && sFix) finalCode = `${pFix}-${numStr}-${sFix}`;
					else if (pFix && !sFix) finalCode = `${pFix}-${numStr}`;
					else if (!pFix && sFix) finalCode = `${numStr}-${sFix}`;

					await adminClient
						.from('profiles')
						.update({ codigo: finalCode, updated_at: new Date().toISOString() })
						.eq('id', p.id);
				}

				count = allProfiles.length;

				const targetId = current?.id || 1;
				await adminClient
					.from('configuracion_codigo_perfil')
					.update({ consecutivo_actual: count })
					.eq('id', targetId);
			}
		}

		return { success: true, action: 'updateCodeConfig', updatedCount: count || 0 };
	},

	toggleActive: async ({ request }) => {
		const formData = await request.formData();
		const adminClient = createSupabaseAdminClient();
		const id = formData.get('id') as string;
		const currentActive = formData.get('activo') === 'true';

		if (!id) return fail(400, { message: 'ID no proporcionado' });

		const { error: toggleErr } = await adminClient
			.from('profiles')
			.update({
				activo: !currentActive,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (toggleErr) {
			return fail(500, { message: `Error al cambiar estado del usuario: ${toggleErr.message}` });
		}

		return { success: true, action: 'toggleActive' };
	}
};
