import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions, Action } from './$types';
import type { TipoAdquisicion } from '$lib/types/database';
import { getRolesForUser } from '$lib/server/auth';
import { buildGuard, PERMISSIONS } from '$lib/server/permissions';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.session) throw redirect(303, '/login');

	const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
	const roleIds = locals.user?.rol_id ? [locals.user.rol_id] : [];
	const guard = await buildGuard(locals.supabase, roleIds, roles);

	if (!guard.has(PERMISSIONS.adquisicionesVer) && !roles.includes('admin')) {
		throw redirect(303, '/');
	}

	const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
	const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
	const pageSize = 10;

	const search = (url.searchParams.get('search') || '').trim();

	let query = locals.supabase
		.from('tipo_adquisiciones')
		.select('*', { count: 'exact' })
		.order('nombre', { ascending: true });

	if (search) {
		query = query.ilike('nombre', `%${search}%`);
	}

	const from = (page - 1) * pageSize;
	const to = from + pageSize - 1;

	const { data, count, error: err } = await query.range(from, to);

	const totalItems = count || 0;
	const totalPages = Math.ceil(totalItems / pageSize) || 1;

	return {
		adquisiciones: (data || []) as TipoAdquisicion[],
		totalItems,
		totalPages,
		currentPage: page,
		search
	};
};

const create: Action = async ({ request, locals }) => {
	if (!locals.session) return fail(401, { message: 'No autenticado' });

	const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
	const roleIds = locals.user?.rol_id ? [locals.user.rol_id] : [];
	const guard = await buildGuard(locals.supabase, roleIds, roles);

	if (!guard.has(PERMISSIONS.adquisicionesCrear) && !roles.includes('admin')) {
		return fail(403, { message: 'Acceso no autorizado para registrar adquisiciones' });
	}

	const formData = await request.formData();
	const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();

	if (!nombre) {
		return fail(400, { message: 'El nombre es obligatorio' });
	}

	const { error: insErr } = await locals.supabase.from('tipo_adquisiciones').insert({
		nombre,
		activo: true
	});

	if (insErr) {
		return fail(500, { message: `Error al crear tipo de adquisición: ${insErr.message}` });
	}

	return { success: true, action: 'create' };
};

const update: Action = async ({ request, locals }) => {
	if (!locals.session) return fail(401, { message: 'No autenticado' });

	const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
	const roleIds = locals.user?.rol_id ? [locals.user.rol_id] : [];
	const guard = await buildGuard(locals.supabase, roleIds, roles);

	if (!guard.has(PERMISSIONS.adquisicionesEditar) && !roles.includes('admin')) {
		return fail(403, { message: 'Acceso no autorizado para actualizar adquisiciones' });
	}

	const formData = await request.formData();
	const idRaw = formData.get('id') as string;
	const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();

	if (!idRaw || !nombre) {
		return fail(400, { message: 'Todos los campos obligatorios deben completarse' });
	}

	const id = parseInt(idRaw, 10);

	const { error: updErr } = await locals.supabase
		.from('tipo_adquisiciones')
		.update({
			nombre,
			updated_at: new Date().toISOString()
		})
		.eq('id', id);

	if (updErr) {
		return fail(500, { message: `Error al actualizar tipo de adquisición: ${updErr.message}` });
	}

	return { success: true, action: 'update' };
};

const toggleActive: Action = async ({ request, locals }) => {
	if (!locals.session) return fail(401, { message: 'No autenticado' });

	const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
	const roleIds = locals.user?.rol_id ? [locals.user.rol_id] : [];
	const guard = await buildGuard(locals.supabase, roleIds, roles);

	if (!guard.has(PERMISSIONS.adquisicionesDesactivar) && !roles.includes('admin')) {
		return fail(403, { message: 'Acceso no autorizado para modificar estado' });
	}

	const formData = await request.formData();
	const idRaw = formData.get('id') as string;
	const currentActive = formData.get('activo') === 'true';

	if (!idRaw) return fail(400, { message: 'ID no especificado' });

	const id = parseInt(idRaw, 10);

	const { error: toggleErr } = await locals.supabase
		.from('tipo_adquisiciones')
		.update({
			activo: !currentActive,
			updated_at: new Date().toISOString()
		})
		.eq('id', id);

	if (toggleErr) {
		return fail(500, { message: `Error al cambiar estado: ${toggleErr.message}` });
	}

	return { success: true, action: 'toggleActive' };
};

export const actions: Actions = {
	create,
	createAcquisitionType: create,
	update,
	updateAcquisitionType: update,
	toggleActive,
	toggleActiveAcquisitionType: toggleActive
};
