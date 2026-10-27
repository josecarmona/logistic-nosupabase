import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { ProductoWithRelations, InventarioMovimientoWithRelations } from '$lib/types/database';
import { getRolesForUser } from '$lib/server/auth';
import { adicionarStock, ajustarStock } from '$lib/server/inventory';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.session) {
		throw redirect(303, '/login');
	}

	const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
	const isStaff = roles.includes('admin') || roles.includes('gerente') || roles.includes('operador');
	if (!isStaff) {
		throw redirect(303, '/ventas/historial');
	}

	const search = (url.searchParams.get('search') || '').trim();
	const filtroStock = (url.searchParams.get('filtro_stock') || 'todos').trim();

	// 1. Consultar todos los productos con sus tipos y unidades
	let query = locals.supabase
		.from('productos')
		.select(
			`
			*,
			tipo_producto:tipos_producto(id, nombre, prefijo),
			unidad_medida:unidades_medida(id, codigo, nombre)
		`
		)
		.order('descripcion', { ascending: true });

	if (search) {
		query = query.or(`descripcion.ilike.%${search}%,codigo.ilike.%${search}%`);
	}

	const { data: productosRaw, error: prodErr } = await query;
	if (prodErr) {
		console.error('Error al cargar productos en inventario:', prodErr.message);
	}

	const allProductos = (productosRaw || []) as ProductoWithRelations[];

	// Filtrar por estado de stock si aplica
	let productosFiltrados = allProductos;
	if (filtroStock === 'bajo') {
		productosFiltrados = allProductos.filter(
			(p) => p.controla_inventario && (Number(p.stock) || 0) <= (Number(p.inventario_minimo) || 0) && (Number(p.stock) || 0) > 0
		);
	} else if (filtroStock === 'agotado') {
		productosFiltrados = allProductos.filter((p) => p.controla_inventario && (Number(p.stock) || 0) <= 0);
	} else if (filtroStock === 'positivo') {
		productosFiltrados = allProductos.filter((p) => (Number(p.stock) || 0) > (Number(p.inventario_minimo) || 0));
	}

	// 2. Consultar historial de movimientos (Kárdex)
	let movimientos: InventarioMovimientoWithRelations[] = [];
	try {
		const { data: movsData, error: movsErr } = await locals.supabase
			.from('inventario_movimientos')
			.select(
				`
				*,
				producto:productos(id, codigo, descripcion, unidad_medida_id),
				operador:profiles!operador_id(id, nombre_completo, email)
			`
			)
			.order('created_at', { ascending: false })
			.limit(100);

		if (!movsErr && movsData) {
			movimientos = movsData as InventarioMovimientoWithRelations[];
		}
	} catch (e) {
		console.warn('Tabla inventario_movimientos aún no disponible o sin registros:', e);
	}

	// 3. Métricas KPI
	const totalProductos = allProductos.length;
	const totalUnidades = allProductos.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
	const bajoStock = allProductos.filter(
		(p) => p.controla_inventario && (Number(p.stock) || 0) <= (Number(p.inventario_minimo) || 0) && (Number(p.stock) || 0) > 0
	).length;
	const agotados = allProductos.filter((p) => p.controla_inventario && (Number(p.stock) || 0) <= 0).length;

	return {
		productos: productosFiltrados,
		allProductos, // Para selector de modales
		movimientos,
		kpis: {
			totalProductos,
			totalUnidades,
			bajoStock,
			agotados
		},
		search,
		filtroStock,
		isAdmin: roles.includes('admin')
	};
};

export const actions: Actions = {
	adicionarStock: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		const isStaff = roles.includes('admin') || roles.includes('gerente') || roles.includes('operador');
		if (!isStaff) return fail(403, { message: 'No tiene permisos para adicionar inventario' });

		const formData = await request.formData();
		const producto_id_raw = formData.get('producto_id') as string;
		const cantidad_raw = formData.get('cantidad') as string;
		const referencia = (formData.get('referencia') as string || '').trim().toUpperCase();
		const motivo = (formData.get('motivo') as string || '').trim().toUpperCase();

		if (!producto_id_raw) return fail(400, { message: 'Debe seleccionar un producto' });
		const cantidad = parseFloat(cantidad_raw);
		if (isNaN(cantidad) || cantidad <= 0) {
			return fail(400, { message: 'La cantidad a ingresar debe ser mayor a 0' });
		}

		const producto_id = parseInt(producto_id_raw, 10);

		try {
			const res = await adicionarStock(locals.supabase, {
				producto_id,
				cantidad,
				referencia,
				motivo,
				operador_id: locals.user?.id
			});
			return {
				success: true,
				action: 'adicionarStock',
				message: `Se adicionaron ${cantidad} unidades correctamente. Nuevo stock: ${res.stockNuevo}`
			};
		} catch (err: any) {
			return fail(500, { message: err.message || 'Error al adicionar stock' });
		}
	},

	ajustarStock: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		const isStaff = roles.includes('admin') || roles.includes('gerente') || roles.includes('operador');
		if (!isStaff) return fail(403, { message: 'No tiene permisos para ajustar inventario' });

		const formData = await request.formData();
		const producto_id_raw = formData.get('producto_id') as string;
		const nuevo_stock_raw = formData.get('nuevo_stock') as string;
		const motivo = (formData.get('motivo') as string || '').trim().toUpperCase();

		if (!producto_id_raw) return fail(400, { message: 'Debe seleccionar un producto' });
		const nuevo_stock = parseFloat(nuevo_stock_raw);
		if (isNaN(nuevo_stock) || nuevo_stock < 0) {
			return fail(400, { message: 'El stock ajustado debe ser un número igual o mayor a 0' });
		}

		const producto_id = parseInt(producto_id_raw, 10);

		try {
			const res = await ajustarStock(locals.supabase, {
				producto_id,
				nuevo_stock,
				motivo,
				operador_id: locals.user?.id
			});
			return {
				success: true,
				action: 'ajustarStock',
				message: `Stock ajustado exitosamente a ${res.stockNuevo} unidades.`
			};
		} catch (err: any) {
			return fail(500, { message: err.message || 'Error al ajustar stock' });
		}
	}
};
