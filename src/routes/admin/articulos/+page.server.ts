import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { Articulo } from '$lib/types/database';
import { getRolesForUser } from '$lib/server/auth';
import { buildGuard, PERMISSIONS } from '$lib/server/permissions';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.session) throw redirect(303, '/login');

	const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
	const roleIds = locals.user?.rol_id ? [locals.user.rol_id] : [];
	const guard = await buildGuard(locals.supabase, roleIds, roles);

	if (!guard.has(PERMISSIONS.articulosVer) && !roles.includes('admin') && !roles.includes('gerente')) {
		throw redirect(303, '/');
	}

	const search = (url.searchParams.get('search') || '').trim();

	let query = locals.supabase
		.from('articulos')
		.select('*')
		.order('nombre', { ascending: true });

	if (search) {
		query = query.ilike('nombre', `%${search}%`);
	}

	const { data, error } = await query;
	if (error) {
		console.error('Error al cargar artículos:', error.message);
	}

	return {
		articulos: (data || []) as Articulo[],
		search
	};
};

export const actions: Actions = {
	createArticulo: async ({ request, locals }) => {
		if (!locals.session) return fail(401, { message: 'No autenticado' });

		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		const roleIds = locals.user?.rol_id ? [locals.user.rol_id] : [];
		const guard = await buildGuard(locals.supabase, roleIds, roles);

		if (!guard.has(PERMISSIONS.articulosCrear) && !roles.includes('admin') && !roles.includes('gerente')) {
			return fail(403, { message: 'Acceso no autorizado para registrar artículos' });
		}

		const formData = await request.formData();
		const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();

		if (!nombre) {
			return fail(400, { message: 'El nombre del artículo es obligatorio' });
		}

		const { error } = await locals.supabase.from('articulos').insert({
			nombre,
			activo: true
		});

		if (error) {
			return fail(500, { message: `Error al crear artículo: ${error.message}` });
		}

		return { success: true, action: 'createArticulo' };
	},

	updateArticulo: async ({ request, locals }) => {
		if (!locals.session) return fail(401, { message: 'No autenticado' });

		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		const roleIds = locals.user?.rol_id ? [locals.user.rol_id] : [];
		const guard = await buildGuard(locals.supabase, roleIds, roles);

		if (!guard.has(PERMISSIONS.articulosEditar) && !roles.includes('admin') && !roles.includes('gerente')) {
			return fail(403, { message: 'Acceso no autorizado para actualizar artículos' });
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();

		if (!id || !nombre) {
			return fail(400, { message: 'ID y nombre son obligatorios' });
		}

		const { error } = await locals.supabase
			.from('articulos')
			.update({
				nombre,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (error) {
			return fail(500, { message: `Error al actualizar artículo: ${error.message}` });
		}

		return { success: true, action: 'updateArticulo' };
	},

	toggleActiveArticulo: async ({ request, locals }) => {
		if (!locals.session) return fail(401, { message: 'No autenticado' });

		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		const roleIds = locals.user?.rol_id ? [locals.user.rol_id] : [];
		const guard = await buildGuard(locals.supabase, roleIds, roles);

		if (!guard.has(PERMISSIONS.articulosDesactivar) && !roles.includes('admin') && !roles.includes('gerente')) {
			return fail(403, { message: 'Acceso no autorizado para modificar estado' });
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const activo = formData.get('activo') === 'true';

		if (!id) return fail(400, { message: 'ID no proporcionado' });

		const { error } = await locals.supabase
			.from('articulos')
			.update({
				activo: !activo,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (error) {
			return fail(500, { message: `Error al cambiar estado: ${error.message}` });
		}

		return { success: true, action: 'toggleActiveArticulo' };
	}
};
