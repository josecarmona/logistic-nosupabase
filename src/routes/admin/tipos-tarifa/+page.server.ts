import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { TipoTarifa } from '$lib/types/database';
import { getRolesForUser } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.session) {
		throw redirect(303, '/login');
	}

	const userRoles = locals.user ? await getRolesForUser(locals, locals.user) : [];
	if (!userRoles.includes('admin')) {
		throw redirect(303, '/');
	}

	const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
	const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
	const pageSize = 10;

	const search = (url.searchParams.get('search') || '').trim();

	let query = locals.supabase
		.from('tipos_tarifa')
		.select('*', { count: 'exact' })
		.order('nombre', { ascending: true });

	if (search) {
		query = query.ilike('nombre', `%${search}%`);
	}

	const from = (page - 1) * pageSize;
	const to = from + pageSize - 1;

	const { data: tiposTarifa, count, error } = await query.range(from, to);

	if (error) {
		console.error('Error al cargar tipos de tarifa:', error.message);
	}

	const totalItems = count || 0;
	const totalPages = Math.ceil(totalItems / pageSize) || 1;

	return {
		tiposTarifa: (tiposTarifa || []) as TipoTarifa[],
		totalItems,
		totalPages,
		currentPage: page,
		search
	};
};

export const actions: Actions = {
	createTipoTarifa: async ({ request, locals }) => {
		const userRoles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!userRoles.includes('admin')) return fail(403, { message: 'No autorizado' });

		const formData = await request.formData();
		const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();
		const promocion = formData.has('promocion')
			? formData.get('promocion') === 'true' || formData.get('promocion') === 'on'
			: false;
		const numero_productos_raw = formData.get('numero_productos') as string;
		const numero_productos = parseInt(numero_productos_raw || '1', 10);

		if (!nombre) {
			return fail(400, { message: 'El nombre del tipo de tarifa es obligatorio' });
		}

		const { error } = await locals.supabase.from('tipos_tarifa').insert({
			nombre,
			promocion,
			numero_productos: isNaN(numero_productos) || numero_productos < 1 ? 1 : numero_productos,
			activo: true
		});

		if (error) {
			return fail(500, { message: `Error al crear tipo de tarifa: ${error.message}` });
		}

		return { success: true, action: 'createTipoTarifa' };
	},

	updateTipoTarifa: async ({ request, locals }) => {
		const userRoles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!userRoles.includes('admin')) return fail(403, { message: 'No autorizado' });

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();
		const promocion = formData.has('promocion')
			? formData.get('promocion') === 'true' || formData.get('promocion') === 'on'
			: false;
		const numero_productos_raw = formData.get('numero_productos') as string;
		const numero_productos = parseInt(numero_productos_raw || '1', 10);

		if (!id || !nombre) {
			return fail(400, { message: 'ID y Nombre son obligatorios' });
		}

		const { error } = await locals.supabase
			.from('tipos_tarifa')
			.update({
				nombre,
				promocion,
				numero_productos: isNaN(numero_productos) || numero_productos < 1 ? 1 : numero_productos,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (error) {
			return fail(500, { message: `Error al actualizar tipo de tarifa: ${error.message}` });
		}

		return { success: true, action: 'updateTipoTarifa' };
	},

	toggleActiveTipoTarifa: async ({ request, locals }) => {
		const userRoles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!userRoles.includes('admin')) return fail(403, { message: 'No autorizado' });

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const currentActive = formData.get('activo') === 'true';

		if (!id) return fail(400, { message: 'ID no proporcionado' });

		const { error } = await locals.supabase
			.from('tipos_tarifa')
			.update({
				activo: !currentActive,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (error) {
			return fail(500, { message: `Error al cambiar estado: ${error.message}` });
		}

		return { success: true, action: 'toggleActiveTipoTarifa' };
	}
};
