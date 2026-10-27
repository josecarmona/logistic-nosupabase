// Hooks del lado del servidor.
// Gestiona la sesión segura de Supabase en cada petición expuesta en locals para load/actions.

import { createSupabaseServerClient } from '$lib/server/supabase';
import { buildGuard } from '$lib/server/permissions';
import { getProfile, getRolesForUser } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';

const supabaseHandle: Handle = async ({ event, resolve }) => {
	const { locals, cookies } = event;
	locals.supabase = createSupabaseServerClient(cookies);
	locals.session = null;
	locals.user = null;
	locals.guard = null;

	/**
	 * Uso de getUser() para autenticar la sesión de manera segura con el servidor de Supabase Auth,
	 * tal como recomienda Supabase para evitar el aviso de inseguridad de getSession().
	 */
	const {
		data: { user },
		error: userError
	} = await locals.supabase.auth.getUser();

	if (user && !userError) {
		const {
			data: { session }
		} = await locals.supabase.auth.getSession();

		if (session) {
			locals.session = session;
			// Asegura que session.user tenga los datos auténticos validados por getUser()
			locals.session.user = user;

			const profile = await getProfile(locals, locals.supabase);
			locals.user = profile;

			if (profile) {
				const roleIds = profile.rol_id ? [profile.rol_id] : [];
				const roleNames = await getRolesForUser(locals, profile);
				locals.guard = await buildGuard(locals.supabase, roleIds, roleNames);
			}
		}
	}

	return resolve(event);
};

export const handle: Handle = supabaseHandle;
