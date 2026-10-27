import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { ProductoWithRelations, TipoProducto, UnidadMedida } from '$lib/types/database';
import { getRolesForUser } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.session) {
		throw redirect(303, '/login');
	}

	const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
	const isClienteOnly = roles.includes('cliente') && !roles.includes('admin') && !roles.includes('gerente') && !roles.includes('operador');
	if (isClienteOnly) throw redirect(303, '/ventas/historial');

	const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
	const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
	const pageSize = 10;

	const search = (url.searchParams.get('search') || '').trim();

	// Consulta de productos con tipo y unidad de medida
	let query = locals.supabase
		.from('productos')
		.select(
			`
			*,
			tipo_producto:tipos_producto(id, nombre, prefijo, atributos),
			unidad_medida:unidades_medida(id, codigo, nombre)
		`,
			{ count: 'exact' }
		)
		.order('descripcion', { ascending: true });

	if (search) {
		query = query.or(`descripcion.ilike.%${search}%,codigo.ilike.%${search}%`);
	}

	const from = (page - 1) * pageSize;
	const to = from + pageSize - 1;

	const { data: productos, count, error: prodErr } = await query.range(from, to);

	if (prodErr) {
		console.error('Error al cargar productos:', prodErr.message);
	}

	// Cargar catálogos para formularios
	const { data: tiposProducto } = await locals.supabase
		.from('tipos_producto')
		.select('*')
		.order('nombre', { ascending: true });

	const { data: unidadesMedida } = await locals.supabase
		.from('unidades_medida')
		.select('*')
		.order('nombre', { ascending: true });

	const userRoles = locals.user ? await getRolesForUser(locals, locals.user) : [];
	const isAdmin = userRoles.includes('admin');

	const totalItems = count || 0;
	const totalPages = Math.ceil(totalItems / pageSize) || 1;

	const productosNormalized = (productos || []).map((p: any) => ({
		...p,
		precio_venta: Number(p.precio_venta ?? p.atributos_valores?.__precio_venta ?? 0)
	})) as ProductoWithRelations[];

	return {
		productos: productosNormalized,
		totalItems,
		totalPages,
		currentPage: page,
		search,
		tiposProducto: (tiposProducto || []) as TipoProducto[],
		unidadesMedida: (unidadesMedida || []) as UnidadMedida[],
		isAdmin
	};
};

export const actions: Actions = {
	createProduct: async ({ request, locals }) => {
		const formData = await request.formData();

		const descripcion = (formData.get('descripcion') as string || '').trim().toUpperCase();
		const tipo_producto_id_raw = formData.get('tipo_producto_id') as string;
		const costo_raw = formData.get('costo') as string;
		const precio_venta_raw = formData.get('precio_venta') as string;
		const inventario_minimo_raw = formData.get('inventario_minimo') as string;
		const unidad_medida_id_raw = formData.get('unidad_medida_id') as string;
		const atributos_valores_raw = formData.get('atributos_valores') as string;
		const controla_inventario = formData.has('controla_inventario')
			? formData.get('controla_inventario') === 'true' || formData.get('controla_inventario') === 'on'
			: true;
		const requiere_seguro = formData.has('requiere_seguro')
			? formData.get('requiere_seguro') === 'true' || formData.get('requiere_seguro') === 'on'
			: false;
		const porcentaje_seguro_raw = formData.get('porcentaje_seguro') as string;
		const porcentaje_seguro = requiere_seguro ? parseFloat(porcentaje_seguro_raw || '0') : 0;

		if (!descripcion || !tipo_producto_id_raw) {
			return fail(400, { message: 'La descripción y el tipo de producto son obligatorios' });
		}

		const tipo_producto_id = parseInt(tipo_producto_id_raw, 10);
		const costo = parseFloat(costo_raw || '0');
		const precio_venta = parseFloat(precio_venta_raw || '0');
		const inventario_minimo = parseFloat(inventario_minimo_raw || '0');
		const stock_raw = formData.get('stock') as string;
		const stock = parseFloat(stock_raw || '0');
		const carga_maxima_raw = formData.get('carga_maxima') as string;
		const carga_maxima = parseFloat(carga_maxima_raw || '0');
		const unidad_medida_id = unidad_medida_id_raw ? parseInt(unidad_medida_id_raw, 10) : null;

		let atributos_valores: Record<string, any> = {};
		try {
			if (atributos_valores_raw) {
				atributos_valores = JSON.parse(atributos_valores_raw);
			}
		} catch (e) {
			console.warn('Error al parsear atributos de producto:', e);
		}
		atributos_valores.__precio_venta = isNaN(precio_venta) ? 0 : precio_venta;

		const insertPayload: Record<string, any> = {
			descripcion,
			tipo_producto_id,
			costo: isNaN(costo) ? 0 : costo,
			precio_venta: isNaN(precio_venta) ? 0 : precio_venta,
			inventario_minimo: isNaN(inventario_minimo) ? 0 : inventario_minimo,
			stock: isNaN(stock) ? 0 : stock,
			carga_maxima: isNaN(carga_maxima) ? 0 : carga_maxima,
			unidad_medida_id,
			atributos_valores,
			controla_inventario,
			requiere_seguro,
			porcentaje_seguro: isNaN(porcentaje_seguro) ? 0 : porcentaje_seguro,
			activo: true
		};

		// Insertar producto. El trigger trg_auto_codigo_producto auto-generará el código PREFIJO-000001
		let { error: insErr } = await locals.supabase.from('productos').insert(insertPayload);

		if (insErr && (insErr.message.includes('precio_venta') || insErr.code === '42703')) {
			delete insertPayload.precio_venta;
			const retry = await locals.supabase.from('productos').insert(insertPayload);
			insErr = retry.error;
		}

		if (insErr && insErr.code === '42703') {
			if (insErr.message.includes('carga_maxima')) delete insertPayload.carga_maxima;
			if (insErr.message.includes('stock')) delete insertPayload.stock;
			const retry = await locals.supabase.from('productos').insert(insertPayload);
			insErr = retry.error;
		}

		// Si falla por colisión o desfase de consecutivo (código 23505), auto-sincronizar y asignar código secuencial garantizado
		// Si falla por colisión en la secuencia de ID (productos_pkey / Key (id)=(X) already exists)
		if (insErr && (insErr.message.includes('productos_pkey') || insErr.message.includes('(id)='))) {
			console.warn('Secuencia de ID de productos desfasada (productos_pkey), resolviendo automáticamente con max(id) + 1...');
			const { data: maxProd } = await locals.supabase
				.from('productos')
				.select('id')
				.order('id', { ascending: false })
				.limit(1);

			let nextId = ((maxProd?.[0]?.id as number) || 0) + 1;
			insertPayload.id = nextId;

			let retry = await locals.supabase.from('productos').insert(insertPayload);
			insErr = retry.error;

			let attempts = 0;
			while (insErr && (insErr.message.includes('productos_pkey') || insErr.message.includes('(id)=')) && attempts < 5) {
				nextId++;
				insertPayload.id = nextId;
				retry = await locals.supabase.from('productos').insert(insertPayload);
				insErr = retry.error;
				attempts++;
			}
		}

		// Si falla por colisión en código de producto (productos_codigo_key)
		if (insErr && (insErr.message.includes('productos_codigo_key') || (insErr.code === '23505' && !insErr.message.includes('productos_pkey')))) {
			console.warn('Colisión detectada en código de producto, resolviendo automáticamente con el consecutivo más alto...');
			const { data: tp } = await locals.supabase
				.from('tipos_producto')
				.select('id, prefijo, consecutivo_actual')
				.eq('id', tipo_producto_id)
				.maybeSingle();

			const prefijo = (tp?.prefijo || 'PRD').toUpperCase().trim();
			const { data: prods } = await locals.supabase
				.from('productos')
				.select('codigo')
				.like('codigo', `${prefijo}-%`);

			let maxNum = tp?.consecutivo_actual || 0;
			for (const p of prods || []) {
				const numPart = parseInt((p.codigo || '').replace(`${prefijo}-`, ''), 10);
				if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
			}
			const nextNum = maxNum + 1;
			insertPayload.codigo = `${prefijo}-${String(nextNum).padStart(6, '0')}`;

			// Actualizar consecutivo_actual en tipos_producto
			await locals.supabase
				.from('tipos_producto')
				.update({ consecutivo_actual: nextNum, updated_at: new Date().toISOString() })
				.eq('id', tipo_producto_id);

			const retry = await locals.supabase.from('productos').insert(insertPayload);
			insErr = retry.error;
		}

		if (insErr) {
			return fail(500, { message: `Error al crear producto: ${insErr.message}` });
		}

		return { success: true, action: 'createProduct' };
	},

	updateProduct: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { message: 'ID de producto no proporcionado' });

		const descripcion = (formData.get('descripcion') as string || '').trim().toUpperCase();
		const tipo_producto_id_raw = formData.get('tipo_producto_id') as string;
		const costo_raw = formData.get('costo') as string;
		const precio_venta_raw = formData.get('precio_venta') as string;
		const inventario_minimo_raw = formData.get('inventario_minimo') as string;
		const unidad_medida_id_raw = formData.get('unidad_medida_id') as string;
		const atributos_valores_raw = formData.get('atributos_valores') as string;
		const controla_inventario = formData.has('controla_inventario')
			? formData.get('controla_inventario') === 'true' || formData.get('controla_inventario') === 'on'
			: false;
		const requiere_seguro = formData.has('requiere_seguro')
			? formData.get('requiere_seguro') === 'true' || formData.get('requiere_seguro') === 'on'
			: false;
		const porcentaje_seguro_raw = formData.get('porcentaje_seguro') as string;
		const porcentaje_seguro = requiere_seguro ? parseFloat(porcentaje_seguro_raw || '0') : 0;

		if (!descripcion || !tipo_producto_id_raw) {
			return fail(400, { message: 'La descripción y el tipo de producto son obligatorios' });
		}

		const tipo_producto_id = parseInt(tipo_producto_id_raw, 10);
		const costo = parseFloat(costo_raw || '0');
		const precio_venta = parseFloat(precio_venta_raw || '0');
		const inventario_minimo = parseFloat(inventario_minimo_raw || '0');
		const stock_raw = formData.get('stock') as string;
		const carga_maxima_raw = formData.get('carga_maxima') as string;
		const carga_maxima = parseFloat(carga_maxima_raw || '0');
		const unidad_medida_id = unidad_medida_id_raw ? parseInt(unidad_medida_id_raw, 10) : null;

		let atributos_valores: Record<string, any> = {};
		try {
			if (atributos_valores_raw) {
				atributos_valores = JSON.parse(atributos_valores_raw);
			}
		} catch (e) {
			console.warn('Error al parsear atributos de producto:', e);
		}
		atributos_valores.__precio_venta = isNaN(precio_venta) ? 0 : precio_venta;

		const updatePayload: Record<string, any> = {
			descripcion,
			tipo_producto_id,
			costo: isNaN(costo) ? 0 : costo,
			precio_venta: isNaN(precio_venta) ? 0 : precio_venta,
			inventario_minimo: isNaN(inventario_minimo) ? 0 : inventario_minimo,
			carga_maxima: isNaN(carga_maxima) ? 0 : carga_maxima,
			unidad_medida_id,
			atributos_valores,
			controla_inventario,
			requiere_seguro,
			porcentaje_seguro: isNaN(porcentaje_seguro) ? 0 : porcentaje_seguro,
			updated_at: new Date().toISOString()
		};

		if (stock_raw !== null && stock_raw !== undefined && stock_raw !== '') {
			const parsedStock = parseFloat(stock_raw);
			updatePayload.stock = isNaN(parsedStock) ? 0 : parsedStock;
		}

		let { error: updErr } = await locals.supabase
			.from('productos')
			.update(updatePayload)
			.eq('id', id);

		if (updErr && (updErr.message.includes('precio_venta') || updErr.code === '42703')) {
			delete updatePayload.precio_venta;
			const retry = await locals.supabase.from('productos').update(updatePayload).eq('id', id);
			updErr = retry.error;
		}

		if (updErr) {
			return fail(500, { message: `Error al actualizar producto: ${updErr.message}` });
		}

		return { success: true, action: 'updateProduct' };
	},

	toggleActiveProduct: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		const currentActive = formData.get('activo') === 'true';

		if (!id) return fail(400, { message: 'ID no proporcionado' });

		const { error: toggleErr } = await locals.supabase
			.from('productos')
			.update({
				activo: !currentActive,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (toggleErr) {
			return fail(500, { message: `Error al cambiar estado del producto: ${toggleErr.message}` });
		}

		return { success: true, action: 'toggleActiveProduct' };
	},

	createTipoProducto: async ({ request, locals }) => {
		const userRoles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!userRoles.includes('admin')) {
			return fail(403, { message: 'Acceso denegado: Solo administradores pueden gestionar tipos de producto' });
		}

		const formData = await request.formData();
		const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();
		const prefijo = (formData.get('prefijo') as string || '').trim().toUpperCase();
		const descripcion = (formData.get('descripcion') as string || '').trim().toUpperCase();
		const atributos_raw = formData.get('atributos') as string;

		if (!nombre || !prefijo) {
			return fail(400, { message: 'El nombre y el prefijo de 3 letras son obligatorios' });
		}

		if (prefijo.length !== 3) {
			return fail(400, { message: 'El prefijo debe tener exactamente 3 letras' });
		}

		let atributos: any[] = [];
		try {
			if (atributos_raw) atributos = JSON.parse(atributos_raw);
		} catch (e) {
			console.warn('Error al parsear definiciones de atributos:', e);
		}

		const { error: insErr } = await locals.supabase.from('tipos_producto').insert({
			nombre,
			prefijo,
			descripcion: descripcion || null,
			atributos,
			activo: true
		});

		if (insErr) {
			return fail(500, { message: `Error al crear tipo de producto: ${insErr.message}` });
		}

		return { success: true, action: 'createTipoProducto' };
	},

	updateTipoProducto: async ({ request, locals }) => {
		const userRoles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!userRoles.includes('admin')) {
			return fail(403, { message: 'Acceso denegado: Solo administradores pueden gestionar tipos de producto' });
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();
		const prefijo = (formData.get('prefijo') as string || '').trim().toUpperCase();
		const descripcion = (formData.get('descripcion') as string || '').trim().toUpperCase();
		const atributos_raw = formData.get('atributos') as string;

		if (!id || !nombre || !prefijo) {
			return fail(400, { message: 'ID, nombre y prefijo son obligatorios' });
		}

		if (prefijo.length !== 3) {
			return fail(400, { message: 'El prefijo debe tener exactamente 3 letras' });
		}

		let atributos: any[] = [];
		try {
			if (atributos_raw) atributos = JSON.parse(atributos_raw);
		} catch (e) {
			console.warn('Error al parsear definiciones de atributos:', e);
		}

		const { error: updErr } = await locals.supabase
			.from('tipos_producto')
			.update({
				nombre,
				prefijo,
				descripcion: descripcion || null,
				atributos,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (updErr) {
			return fail(500, { message: `Error al actualizar tipo de producto: ${updErr.message}` });
		}

		return { success: true, action: 'updateTipoProducto' };
	},

	toggleActiveTipoProducto: async ({ request, locals }) => {
		const userRoles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!userRoles.includes('admin')) {
			return fail(403, { message: 'Acceso denegado: Solo administradores pueden gestionar tipos de producto' });
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const currentActive = formData.get('activo') === 'true';

		if (!id) return fail(400, { message: 'ID no proporcionado' });

		const { error: toggleErr } = await locals.supabase
			.from('tipos_producto')
			.update({
				activo: !currentActive,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (toggleErr) {
			return fail(500, { message: `Error al cambiar estado del tipo de producto: ${toggleErr.message}` });
		}

		return { success: true, action: 'toggleActiveTipoProducto' };
	}
};
