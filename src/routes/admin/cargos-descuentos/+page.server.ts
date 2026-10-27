import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { CargoDescuento } from '$lib/types/database';
import { getRolesForUser } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.session) throw redirect(303, '/login');

	const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
	if (!roles.includes('admin')) throw redirect(303, '/');

	const search = (url.searchParams.get('search') || '').trim();

	let query = locals.supabase
		.from('cargos_descuentos')
		.select('*')
		.order('nombre', { ascending: true });

	if (search) {
		query = query.ilike('nombre', `%${search}%`);
	}

	const { data, error } = await query;
	if (error) {
		console.error('Error al cargar cargos y descuentos:', error.message);
	}

	return {
		cargosDescuentos: (data || []) as CargoDescuento[],
		search
	};
};

export const actions: Actions = {
	createCargoDescuento: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!roles.includes('admin')) return fail(403, { message: 'Acceso no autorizado' });

		const formData = await request.formData();
		const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();
		const tipo = (formData.get('tipo') as string || 'cargo') as 'cargo' | 'descuento';
		const monto_defecto_raw = formData.get('monto_defecto') as string;
		const es_porcentaje = formData.get('es_porcentaje') === 'true';

		if (!nombre) {
			return fail(400, { message: 'El nombre es obligatorio' });
		}

		const monto_defecto = parseFloat(monto_defecto_raw) || 0;

		const { error } = await locals.supabase.from('cargos_descuentos').insert({
			nombre,
			tipo,
			monto_defecto,
			es_porcentaje,
			activo: true
		});

		if (error) {
			return fail(500, { message: `Error al crear cargo/descuento: ${error.message}` });
		}

		return { success: true, action: 'createCargoDescuento' };
	},

	updateCargoDescuento: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!roles.includes('admin')) return fail(403, { message: 'Acceso no autorizado' });

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();
		const tipo = (formData.get('tipo') as string || 'cargo') as 'cargo' | 'descuento';
		const monto_defecto_raw = formData.get('monto_defecto') as string;
		const es_porcentaje = formData.get('es_porcentaje') === 'true';

		if (!id || !nombre) {
			return fail(400, { message: 'ID y nombre son obligatorios' });
		}

		const monto_defecto = parseFloat(monto_defecto_raw) || 0;

		const { error } = await locals.supabase
			.from('cargos_descuentos')
			.update({
				nombre,
				tipo,
				monto_defecto,
				es_porcentaje,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (error) {
			return fail(500, { message: `Error al actualizar cargo/descuento: ${error.message}` });
		}

		return { success: true, action: 'updateCargoDescuento' };
	},

	toggleActiveCargoDescuento: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!roles.includes('admin')) return fail(403, { message: 'Acceso no autorizado' });

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const activo = formData.get('activo') === 'true';

		if (!id) return fail(400, { message: 'ID no proporcionado' });

		const { error } = await locals.supabase
			.from('cargos_descuentos')
			.update({
				activo: !activo,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (error) {
			return fail(500, { message: `Error al cambiar estado: ${error.message}` });
		}

		return { success: true, action: 'toggleActiveCargoDescuento' };
	}
};
