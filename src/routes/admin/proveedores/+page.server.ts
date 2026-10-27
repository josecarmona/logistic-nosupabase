import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { Proveedor, Pais } from '$lib/types/database';
import { getRolesForUser } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.session) throw redirect(303, '/login');

	const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
	if (!roles.includes('admin') && !roles.includes('gerente')) {
		throw redirect(303, '/');
	}

	const search = (url.searchParams.get('search') || '').trim();

	const { data: paises } = await locals.supabase
		.from('paises')
		.select('id, nombre, codigo_iso2, codigo_iso3')
		.eq('activo', true)
		.order('nombre', { ascending: true });

	let query = locals.supabase
		.from('proveedores')
		.select(`
			*,
			proveedores_paises(
				pais:paises(id, nombre, codigo_iso2, codigo_iso3)
			),
			proveedor_direcciones(*)
		`)
		.order('nombre', { ascending: true });

	if (search) {
		query = query.ilike('nombre', `%${search}%`);
	}

	let { data: proveedoresRaw, error } = await query;

	if (error) {
		// Fallback defensivo si la tabla proveedor_direcciones aún no existe en caché
		const fallbackQuery = locals.supabase
			.from('proveedores')
			.select(`
				*,
				proveedores_paises(
					pais:paises(id, nombre, codigo_iso2, codigo_iso3)
				)
			`)
			.order('nombre', { ascending: true });
		const fb = await fallbackQuery;
		proveedoresRaw = fb.data;
	}

	const proveedores = (proveedoresRaw || []).map((p: any) => ({
		...p,
		paises_atendidos: (p.proveedores_paises || [])
			.map((pp: any) => pp.pais)
			.filter(Boolean),
		direcciones: (p.proveedor_direcciones || (p.direccion ? [{ id: 0, proveedor_id: p.id, titulo: 'Principal', direccion: p.direccion, es_principal: true, activo: true }] : []))
	})) as Proveedor[];

	return {
		proveedores,
		paises: (paises || []) as Pais[],
		search
	};
};

export const actions: Actions = {
	createProveedor: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!roles.includes('admin') && !roles.includes('gerente')) return fail(403, { message: 'Acceso no autorizado' });

		const formData = await request.formData();
		const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();
		const tiene_api = formData.get('tiene_api') === 'true';
		const direccion = (formData.get('direccion') as string || '').trim();
		const paises_ids = formData.getAll('paises_ids').map((v) => parseInt(v as string, 10)).filter((n) => !isNaN(n));

		if (!nombre) {
			return fail(400, { message: 'El nombre del proveedor es obligatorio' });
		}

		const direccionesRaw = (formData.get('direcciones') as string || '').trim();
		let direccionesList: Array<{ titulo: string; direccion: string; ciudad?: string; estado?: string; telefono?: string; es_principal?: boolean }> = [];
		try {
			if (direccionesRaw) direccionesList = JSON.parse(direccionesRaw);
		} catch {}

		let effectiveDireccion = direccion;
		if (!effectiveDireccion && direccionesList.length > 0) {
			const princ = direccionesList.find((d) => d.es_principal) || direccionesList[0];
			effectiveDireccion = princ.direccion;
		}

		const { data: newProv, error } = await locals.supabase
			.from('proveedores')
			.insert({
				nombre,
				tiene_api,
				direccion: effectiveDireccion || null,
				activo: true
			})
			.select('id')
			.single();

		if (error || !newProv) {
			return fail(500, { message: `Error al crear proveedor: ${error?.message}` });
		}

		// Insertar en proveedor_direcciones si existen
		if (direccionesList.length > 0) {
			const dirRows = direccionesList.map((d) => ({
				proveedor_id: newProv.id,
				titulo: d.titulo || 'Principal',
				direccion: d.direccion,
				ciudad: d.ciudad || null,
				estado: d.estado || null,
				telefono: d.telefono || null,
				es_principal: !!d.es_principal,
				activo: true
			}));
			await locals.supabase.from('proveedor_direcciones').insert(dirRows);
		} else if (effectiveDireccion) {
			await locals.supabase.from('proveedor_direcciones').insert({
				proveedor_id: newProv.id,
				titulo: 'Sede Principal',
				direccion: effectiveDireccion,
				es_principal: true,
				activo: true
			});
		}

		if (paises_ids.length > 0) {
			const junctionRows = paises_ids.map((pid) => ({
				proveedor_id: newProv.id,
				pais_id: pid
			}));
			await locals.supabase.from('proveedores_paises').insert(junctionRows);
		}

		return { success: true, action: 'createProveedor' };
	},

	updateProveedor: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!roles.includes('admin') && !roles.includes('gerente')) return fail(403, { message: 'Acceso no autorizado' });

		const formData = await request.formData();
		const id = parseInt(formData.get('id') as string, 10);
		const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();
		const tiene_api = formData.get('tiene_api') === 'true';
		const direccion = (formData.get('direccion') as string || '').trim();
		const paises_ids = formData.getAll('paises_ids').map((v) => parseInt(v as string, 10)).filter((n) => !isNaN(n));

		if (!id || !nombre) {
			return fail(400, { message: 'ID y nombre son obligatorios' });
		}

		const direccionesRaw = (formData.get('direcciones') as string || '').trim();
		let direccionesList: Array<{ titulo: string; direccion: string; ciudad?: string; estado?: string; telefono?: string; es_principal?: boolean }> = [];
		try {
			if (direccionesRaw) direccionesList = JSON.parse(direccionesRaw);
		} catch {}

		let effectiveDireccion = direccion;
		if (direccionesList.length > 0) {
			const princ = direccionesList.find((d) => d.es_principal) || direccionesList[0];
			effectiveDireccion = princ.direccion;
		}

		const { error } = await locals.supabase
			.from('proveedores')
			.update({
				nombre,
				tiene_api,
				direccion: effectiveDireccion || null,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (error) {
			return fail(500, { message: `Error al actualizar proveedor: ${error.message}` });
		}

		// Sincronizar proveedor_direcciones
		if (direccionesList.length > 0) {
			await locals.supabase.from('proveedor_direcciones').delete().eq('proveedor_id', id);
			const dirRows = direccionesList.map((d) => ({
				proveedor_id: id,
				titulo: d.titulo || 'Principal',
				direccion: d.direccion,
				ciudad: d.ciudad || null,
				estado: d.estado || null,
				telefono: d.telefono || null,
				es_principal: !!d.es_principal,
				activo: true
			}));
			await locals.supabase.from('proveedor_direcciones').insert(dirRows);
		}

		// Sincronizar países atendidos en la tabla proveedores_paises
		await locals.supabase.from('proveedores_paises').delete().eq('proveedor_id', id);
		if (paises_ids.length > 0) {
			const junctionRows = paises_ids.map((pid) => ({
				proveedor_id: id,
				pais_id: pid
			}));
			await locals.supabase.from('proveedores_paises').insert(junctionRows);
		}

		return { success: true, action: 'updateProveedor' };
	},

	toggleActiveProveedor: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!roles.includes('admin') && !roles.includes('gerente')) return fail(403, { message: 'Acceso no autorizado' });

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const activoCurrent = formData.get('activo') === 'true';

		if (!id) return fail(400, { message: 'ID no proporcionado' });

		const { error } = await locals.supabase
			.from('proveedores')
			.update({
				activo: !activoCurrent,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (error) {
			return fail(500, { message: `Error al cambiar estado del proveedor: ${error.message}` });
		}

		return { success: true, action: 'toggleActiveProveedor' };
	}
};
