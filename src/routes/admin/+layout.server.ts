import { redirect, error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { requireProfile, getRolesForUser } from '$lib/server/auth';
import { buildGuard } from '$lib/server/permissions';

export const load: LayoutServerLoad = async ({ locals }) => {
	const profile = await requireProfile(locals);
	const roleNames = await getRolesForUser(locals, profile);

	const roleIds = profile.rol_id ? [profile.rol_id] : [];
	const guard = await buildGuard(locals.supabase, roleIds, roleNames);

	if (!guard.has('menu.admin') && !roleNames.includes('admin')) {
		throw error(403, 'Acceso denegado: Se requiere rol de Administrador para acceder a esta área');
	}

	return {
		profile,
		roleNames
	};
};
