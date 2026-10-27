import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { ConceptoPago } from '$lib/types/database';
import { getRolesForUser } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.session) throw redirect(303, '/login');

	const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
	if (!roles.includes('admin')) throw redirect(303, '/');

	const search = (url.searchParams.get('search') || '').trim();

	let query = locals.supabase
		.from('conceptos_pago')
		.select('*')
		.order('nombre', { ascending: true });

	if (search) {
		query = query.ilike('nombre', `%${search}%`);
	}

	const { data, error } = await query;
	if (error) {
		console.error('Error al cargar conceptos de pago:', error.message);
	}

	return {
		conceptos: (data || []) as ConceptoPago[],
		search
	};
};

export const actions: Actions = {
	createConceptoPago: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!roles.includes('admin')) return fail(403, { message: 'Acceso no autorizado' });

		const formData = await request.formData();
		const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();
		const requiere_referencia = formData.get('requiere_referencia') === 'true';
		const porcentaje_comision = Math.max(0, Math.min(100, parseFloat(formData.get('porcentaje_comision') as string) || 0));

		if (!nombre) {
			return fail(400, { message: 'El nombre del concepto de pago es obligatorio' });
		}

		const { error } = await locals.supabase.from('conceptos_pago').insert({
			nombre,
			requiere_referencia,
			porcentaje_comision,
			activo: true
		});

		if (error) {
			return fail(500, { message: `Error al crear concepto de pago: ${error.message}` });
		}

		return { success: true, action: 'createConceptoPago' };
	},

	updateConceptoPago: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!roles.includes('admin')) return fail(403, { message: 'Acceso no autorizado' });

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();
		const requiere_referencia = formData.get('requiere_referencia') === 'true';
		const porcentaje_comision = Math.max(0, Math.min(100, parseFloat(formData.get('porcentaje_comision') as string) || 0));

		if (!id || !nombre) {
			return fail(400, { message: 'ID y nombre son obligatorios' });
		}

		const { error } = await locals.supabase
			.from('conceptos_pago')
			.update({
				nombre,
				requiere_referencia,
				porcentaje_comision,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (error) {
			return fail(500, { message: `Error al actualizar concepto de pago: ${error.message}` });
		}

		return { success: true, action: 'updateConceptoPago' };
	},

	toggleActiveConceptoPago: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!roles.includes('admin')) return fail(403, { message: 'Acceso no autorizado' });

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const activo = formData.get('activo') === 'true';

		if (!id) return fail(400, { message: 'ID de concepto no proporcionado' });

		const { error } = await locals.supabase
			.from('conceptos_pago')
			.update({
				activo: !activo,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (error) {
			return fail(500, { message: `Error al cambiar estado: ${error.message}` });
		}

		return { success: true, action: 'toggleActiveConceptoPago' };
	}
};
