import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { Pais, UnidadMedida } from '$lib/types/database';
import { getRolesForUser } from '$lib/server/auth';
import { buildGuard, PERMISSIONS } from '$lib/server/permissions';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.session) throw redirect(303, '/login');

	const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
	const roleIds = locals.user?.rol_id ? [locals.user.rol_id] : [];
	const guard = await buildGuard(locals.supabase, roleIds, roles);

	if (!guard.has(PERMISSIONS.paisesVer) && !roles.includes('admin')) {
		throw redirect(303, '/');
	}

	const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
	const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
	const pageSize = 10;

	const search = (url.searchParams.get('search') || '').trim();

	// Carga de unidades de peso para el selector
	const { data: unidadesPeso } = await locals.supabase
		.from('unidades_medida')
		.select('*')
		.eq('tipo', 'peso')
		.eq('activo', true)
		.order('nombre', { ascending: true });

	let query = locals.supabase
		.from('paises')
		.select('*, unidad_peso:unidades_medida(id, codigo, nombre)', { count: 'exact' })
		.order('nombre', { ascending: true });

	if (search) {
		query = query.or(`nombre.ilike.%${search}%,codigo_iso2.ilike.%${search}%,codigo_iso3.ilike.%${search}%`);
	}

	const from = (page - 1) * pageSize;
	const to = from + pageSize - 1;

	const { data, count, error: err } = await query.range(from, to);

	const totalItems = count || 0;
	const totalPages = Math.ceil(totalItems / pageSize) || 1;

	return {
		paises: (data || []) as Pais[],
		unidadesPeso: (unidadesPeso || []) as UnidadMedida[],
		totalItems,
		totalPages,
		currentPage: page,
		search
	};
};

export const actions: Actions = {
	createCountry: async ({ request, locals }) => {
		if (!locals.session) return fail(401, { message: 'No autenticado' });

		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		const roleIds = locals.user?.rol_id ? [locals.user.rol_id] : [];
		const guard = await buildGuard(locals.supabase, roleIds, roles);

		if (!guard.has(PERMISSIONS.paisesCrear) && !roles.includes('admin')) {
			return fail(403, { message: 'Acceso no autorizado para registrar países' });
		}

		const formData = await request.formData();
		const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();
		const codigo_iso2 = (formData.get('codigo_iso2') as string || '').trim().toUpperCase();
		const codigo_iso3 = (formData.get('codigo_iso3') as string || '').trim().toUpperCase();
		const limite_peso_raw = formData.get('limite_peso') as string;
		const capacidad_minima_raw = formData.get('capacidad_minima') as string;
		const unidad_peso_id_raw = formData.get('unidad_peso_id') as string;

		if (!nombre || !codigo_iso2 || !codigo_iso3) {
			return fail(400, { message: 'Nombre, código ISO2 y código ISO3 son obligatorios' });
		}

		const limite_peso = limite_peso_raw ? parseFloat(limite_peso_raw) : 0;
		const capacidad_minima = capacidad_minima_raw ? parseFloat(capacidad_minima_raw) : 0;
		const unidad_peso_id = unidad_peso_id_raw ? parseInt(unidad_peso_id_raw, 10) : null;

		if (capacidad_minima > 0 && limite_peso > 0 && capacidad_minima > limite_peso) {
			return fail(400, { message: 'La capacidad mínima no puede ser mayor a la capacidad máxima (límite de peso)' });
		}

		const insertPayload: Record<string, any> = {
			nombre,
			codigo_iso2,
			codigo_iso3,
			limite_peso,
			capacidad_minima,
			unidad_peso_id,
			activo: true
		};

		let { error: insErr } = await locals.supabase.from('paises').insert(insertPayload);

		if (insErr && insErr.code === '42703') {
			delete insertPayload.capacidad_minima;
			const retry = await locals.supabase.from('paises').insert(insertPayload);
			insErr = retry.error;
		}

		if (insErr) {
			return fail(500, { message: `Error al crear país: ${insErr.message}` });
		}

		return { success: true, action: 'create' };
	},

	updateCountry: async ({ request, locals }) => {
		if (!locals.session) return fail(401, { message: 'No autenticado' });

		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		const roleIds = locals.user?.rol_id ? [locals.user.rol_id] : [];
		const guard = await buildGuard(locals.supabase, roleIds, roles);

		if (!guard.has(PERMISSIONS.paisesEditar) && !roles.includes('admin')) {
			return fail(403, { message: 'Acceso no autorizado para actualizar países' });
		}

		const formData = await request.formData();
		const idRaw = formData.get('id') as string;
		const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();
		const codigo_iso2 = (formData.get('codigo_iso2') as string || '').trim().toUpperCase();
		const codigo_iso3 = (formData.get('codigo_iso3') as string || '').trim().toUpperCase();
		const limite_peso_raw = formData.get('limite_peso') as string;
		const capacidad_minima_raw = formData.get('capacidad_minima') as string;
		const unidad_peso_id_raw = formData.get('unidad_peso_id') as string;

		if (!idRaw || !nombre || !codigo_iso2 || !codigo_iso3) {
			return fail(400, { message: 'Todos los campos obligatorios deben completarse' });
		}

		const id = parseInt(idRaw, 10);
		const limite_peso = limite_peso_raw ? parseFloat(limite_peso_raw) : 0;
		const capacidad_minima = capacidad_minima_raw ? parseFloat(capacidad_minima_raw) : 0;
		const unidad_peso_id = unidad_peso_id_raw ? parseInt(unidad_peso_id_raw, 10) : null;

		if (capacidad_minima > 0 && limite_peso > 0 && capacidad_minima > limite_peso) {
			return fail(400, { message: 'La capacidad mínima no puede ser mayor a la capacidad máxima (límite de peso)' });
		}

		const updatePayload: Record<string, any> = {
			nombre,
			codigo_iso2,
			codigo_iso3,
			limite_peso,
			capacidad_minima,
			unidad_peso_id,
			updated_at: new Date().toISOString()
		};

		let { error: updErr } = await locals.supabase
			.from('paises')
			.update(updatePayload)
			.eq('id', id);

		if (updErr && updErr.code === '42703') {
			delete updatePayload.capacidad_minima;
			const retry = await locals.supabase.from('paises').update(updatePayload).eq('id', id);
			updErr = retry.error;
		}

		if (updErr) {
			return fail(500, { message: `Error al actualizar país: ${updErr.message}` });
		}

		return { success: true, action: 'update' };
	},

	toggleActiveCountry: async ({ request, locals }) => {
		if (!locals.session) return fail(401, { message: 'No autenticado' });

		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		const roleIds = locals.user?.rol_id ? [locals.user.rol_id] : [];
		const guard = await buildGuard(locals.supabase, roleIds, roles);

		if (!guard.has(PERMISSIONS.paisesDesactivar) && !roles.includes('admin')) {
			return fail(403, { message: 'Acceso no autorizado para modificar estado' });
		}

		const formData = await request.formData();
		const idRaw = formData.get('id') as string;
		const currentActive = formData.get('activo') === 'true';

		if (!idRaw) return fail(400, { message: 'ID no especificado' });

		const id = parseInt(idRaw, 10);

		const { error: toggleErr } = await locals.supabase
			.from('paises')
			.update({
				activo: !currentActive,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (toggleErr) {
			return fail(500, { message: `Error al cambiar estado del país: ${toggleErr.message}` });
		}

		return { success: true, action: 'toggleActive' };
	}
};
