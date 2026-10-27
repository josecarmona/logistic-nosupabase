import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { TarifaWithRelations, TipoTarifa, Pais, Zona, Producto } from '$lib/types/database';
import { getRolesForUser } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.session) {
		throw redirect(303, '/login');
	}

	const userRoles = locals.user ? await getRolesForUser(locals, locals.user) : [];
	const isAllowed = userRoles.includes('admin') || userRoles.includes('gerente');
	if (!isAllowed) {
		throw redirect(303, '/');
	}

	const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
	const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
	const pageSize = 10;

	const search = (url.searchParams.get('search') || '').trim();
	const tipoTarifaFilter = url.searchParams.get('tipo_tarifa_id') || '';
	const paisFilter = url.searchParams.get('pais_id') || '';
	const zonaFilter = url.searchParams.get('zona_id') || '';
	const productoFilter = url.searchParams.get('producto_id') || '';
	const tipoCalculoFilter = url.searchParams.get('tipo_calculo') || '';

	let query = locals.supabase
		.from('tarifas')
		.select(
			`
			*,
			tipo_tarifa:tipos_tarifa(id, nombre, promocion, numero_productos),
			pais:paises(id, nombre, codigo_iso2),
			zona:zonas(id, nombre),
			producto:productos(id, codigo, descripcion, costo)
		`,
			{ count: 'exact' }
		)
		.order('created_at', { ascending: false });

	if (tipoTarifaFilter) {
		query = query.eq('tipo_tarifa_id', tipoTarifaFilter);
	}
	if (paisFilter) {
		query = query.eq('pais_id', paisFilter);
	}
	if (zonaFilter) {
		query = query.eq('zona_id', zonaFilter);
	}
	if (productoFilter) {
		query = query.eq('producto_id', productoFilter);
	}
	if (tipoCalculoFilter) {
		query = query.eq('tipo_calculo', tipoCalculoFilter);
	}

	const from = (page - 1) * pageSize;
	const to = from + pageSize - 1;

	const { data: tarifas, count, error: tarErr } = await query.range(from, to);

	if (tarErr) {
		console.error('Error al cargar tarifas:', tarErr.message);
	}

	// Cargar catálogos auxiliares para el formulario y filtros
	const { data: tiposTarifa } = await locals.supabase
		.from('tipos_tarifa')
		.select('*')
		.eq('activo', true)
		.order('nombre', { ascending: true });

	const { data: paises } = await locals.supabase
		.from('paises')
		.select('*')
		.eq('activo', true)
		.order('nombre', { ascending: true });

	const { data: zonas } = await locals.supabase
		.from('zonas')
		.select('*')
		.eq('activo', true)
		.order('nombre', { ascending: true });

	const { data: productos } = await locals.supabase
		.from('productos')
		.select('id, codigo, descripcion, costo')
		.eq('activo', true)
		.order('descripcion', { ascending: true });

	const totalItems = count || 0;
	const totalPages = Math.ceil(totalItems / pageSize) || 1;

	return {
		tarifas: (tarifas || []) as TarifaWithRelations[],
		totalItems,
		totalPages,
		currentPage: page,
		search,
		tipoTarifaFilter,
		paisFilter,
		zonaFilter,
		productoFilter,
		tipoCalculoFilter,
		tiposTarifa: (tiposTarifa || []) as TipoTarifa[],
		paises: (paises || []) as Pais[],
		zonas: (zonas || []) as Zona[],
		productos: (productos || []) as Pick<Producto, 'id' | 'codigo' | 'descripcion' | 'costo'>[]
	};
};

export const actions: Actions = {
	createTarifa: async ({ request, locals }) => {
		const userRoles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!userRoles.includes('admin') && !userRoles.includes('gerente')) {
			return fail(403, { message: 'No autorizado' });
		}

		const formData = await request.formData();
		const tipo_tarifa_id_raw = formData.get('tipo_tarifa_id') as string;
		const pais_id_raw = formData.get('pais_id') as string;
		const zona_id_raw = formData.get('zona_id') as string;
		const producto_id_raw = formData.get('producto_id') as string;
		const precio_raw = formData.get('precio') as string;
		const descripcion = (formData.get('descripcion') as string || '').trim().toUpperCase();

		if (!tipo_tarifa_id_raw || !pais_id_raw || !zona_id_raw || !producto_id_raw || !precio_raw) {
			return fail(400, { message: 'Todos los campos obligatorios deben ser completados' });
		}

		const tipo_tarifa_id = parseInt(tipo_tarifa_id_raw, 10);
		const pais_id = parseInt(pais_id_raw, 10);
		const zona_id = parseInt(zona_id_raw, 10);
		const producto_id = parseInt(producto_id_raw, 10);
		const precio = parseFloat(precio_raw);

		if (isNaN(precio) || precio < 0) {
			return fail(400, { message: 'El precio debe ser un número válido igual o mayor a 0' });
		}

		if (precio === 0) {
			const { data: tipoTarifaObj } = await locals.supabase
				.from('tipos_tarifa')
				.select('promocion')
				.eq('id', tipo_tarifa_id)
				.maybeSingle();
			if (!tipoTarifaObj?.promocion) {
				return fail(400, {
					message: 'Solo se permite asignar precio $0.00 cuando el Tipo de Tarifa está definido como una Promoción.'
				});
			}
		}

		const tipo_calculo_raw = (formData.get('tipo_calculo') as string || 'unica').trim().toLowerCase();
		const tipo_calculo = tipo_calculo_raw === 'peso' ? 'peso' : 'unica';
		const es_por_peso = tipo_calculo === 'peso';

		let { error } = await locals.supabase.from('tarifas').insert({
			tipo_tarifa_id,
			pais_id,
			zona_id,
			producto_id,
			precio,
			tipo_calculo,
			es_por_peso,
			descripcion: descripcion || null,
			activo: true
		});

		if (error && (error.message.includes('tipo_calculo') || error.message.includes('es_por_peso') || error.code === '42703')) {
			console.warn('Fallback al insertar tarifa sin columnas tipo_calculo/es_por_peso:', error.message);
			const res = await locals.supabase.from('tarifas').insert({
				tipo_tarifa_id,
				pais_id,
				zona_id,
				producto_id,
				precio,
				descripcion: descripcion || null,
				activo: true
			});
			error = res.error;
		}

		if (error) {
			if (error.code === '23505') {
				return fail(400, { message: 'Ya existe una tarifa registrada con esa misma combinación de Tipo, País, Zona y Producto' });
			}
			return fail(500, { message: `Error al crear tarifa: ${error.message}` });
		}

		return { success: true, action: 'createTarifa' };
	},

	updateTarifa: async ({ request, locals }) => {
		const userRoles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!userRoles.includes('admin') && !userRoles.includes('gerente')) {
			return fail(403, { message: 'No autorizado' });
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const tipo_tarifa_id_raw = formData.get('tipo_tarifa_id') as string;
		const pais_id_raw = formData.get('pais_id') as string;
		const zona_id_raw = formData.get('zona_id') as string;
		const producto_id_raw = formData.get('producto_id') as string;
		const precio_raw = formData.get('precio') as string;
		const tipo_calculo_raw = (formData.get('tipo_calculo') as string || 'unica').trim().toLowerCase();
		const tipo_calculo = tipo_calculo_raw === 'peso' ? 'peso' : 'unica';
		const es_por_peso = tipo_calculo === 'peso';
		const descripcion = (formData.get('descripcion') as string || '').trim().toUpperCase();

		if (!id || !tipo_tarifa_id_raw || !pais_id_raw || !zona_id_raw || !producto_id_raw || !precio_raw) {
			return fail(400, { message: 'Todos los campos obligatorios deben ser completados' });
		}

		const tipo_tarifa_id = parseInt(tipo_tarifa_id_raw, 10);
		const pais_id = parseInt(pais_id_raw, 10);
		const zona_id = parseInt(zona_id_raw, 10);
		const producto_id = parseInt(producto_id_raw, 10);
		const precio = parseFloat(precio_raw);

		if (isNaN(precio) || precio < 0) {
			return fail(400, { message: 'El precio debe ser un número válido igual o mayor a 0' });
		}

		if (precio === 0) {
			const { data: tipoTarifaObj } = await locals.supabase
				.from('tipos_tarifa')
				.select('promocion')
				.eq('id', tipo_tarifa_id)
				.maybeSingle();
			if (!tipoTarifaObj?.promocion) {
				return fail(400, {
					message: 'Solo se permite asignar precio $0.00 cuando el Tipo de Tarifa está definido como una Promoción.'
				});
			}
		}

		let { error } = await locals.supabase
			.from('tarifas')
			.update({
				tipo_tarifa_id,
				pais_id,
				zona_id,
				producto_id,
				precio,
				tipo_calculo,
				es_por_peso,
				descripcion: descripcion || null,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (error && (error.message.includes('tipo_calculo') || error.message.includes('es_por_peso') || error.code === '42703')) {
			console.warn('Fallback al actualizar tarifa sin columnas tipo_calculo/es_por_peso:', error.message);
			const res = await locals.supabase
				.from('tarifas')
				.update({
					tipo_tarifa_id,
					pais_id,
					zona_id,
					producto_id,
					precio,
					descripcion: descripcion || null,
					updated_at: new Date().toISOString()
				})
				.eq('id', id);
			error = res.error;
		}

		if (error) {
			if (error.code === '23505') {
				return fail(400, { message: 'Ya existe otra tarifa registrada con esa misma combinación' });
			}
			return fail(500, { message: `Error al actualizar tarifa: ${error.message}` });
		}

		return { success: true, action: 'updateTarifa' };
	},

	toggleActiveTarifa: async ({ request, locals }) => {
		const userRoles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!userRoles.includes('admin') && !userRoles.includes('gerente')) {
			return fail(403, { message: 'No autorizado' });
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const currentActive = formData.get('activo') === 'true';

		if (!id) return fail(400, { message: 'ID no proporcionado' });

		const { error } = await locals.supabase
			.from('tarifas')
			.update({
				activo: !currentActive,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (error) {
			return fail(500, { message: `Error al cambiar estado: ${error.message}` });
		}

		return { success: true, action: 'toggleActiveTarifa' };
	}
};
