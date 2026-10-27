import type { SupabaseClient } from '@supabase/supabase-js';

export interface VentaInventarioInfo {
	id: number;
	codigo_venta?: string | null;
	es_multiple_cajas?: boolean;
	total_cajas?: number;
	cajas_detalle?: any;
	producto_id?: number | null;
	descontar_inventario?: boolean;
}

/**
 * Descuenta el inventario de los productos asociados a una venta confirmada.
 * Admite tanto ventas simples (1 producto) como ventas con múltiples cajas.
 * Respeta la propiedad descontar_inventario por caja (por defecto true).
 */
export async function descontarInventarioPorVenta(
	supabase: SupabaseClient,
	venta: VentaInventarioInfo,
	operadorId?: string | null
) {
	try {
		// 1. Agrupar cantidades a descontar por producto_id
		const productosMap = new Map<number, number>();

		if (venta.es_multiple_cajas && Array.isArray(venta.cajas_detalle) && venta.cajas_detalle.length > 0) {
			for (const c of venta.cajas_detalle) {
				if (c.descontar_inventario === false) continue;
				const prodId = Number(c.producto_id);
				if (prodId && !isNaN(prodId)) {
					productosMap.set(prodId, (productosMap.get(prodId) || 0) + 1);
				}
			}
		} else if (venta.producto_id) {
			const singleNoDescontar =
				venta.descontar_inventario === false ||
				(Array.isArray(venta.cajas_detalle) &&
					venta.cajas_detalle.length > 0 &&
					venta.cajas_detalle[0]?.descontar_inventario === false);

			if (!singleNoDescontar) {
				const prodId = Number(venta.producto_id);
				const qty = Number(venta.total_cajas) || 1;
				productosMap.set(prodId, (productosMap.get(prodId) || 0) + qty);
			}
		}

		if (productosMap.size === 0) return;

		// 2. Procesar cada producto
		for (const [productoId, cantidadADescontar] of productosMap.entries()) {
			const { data: prod, error: pErr } = await supabase
				.from('productos')
				.select('id, stock, controla_inventario, descripcion')
				.eq('id', productoId)
				.maybeSingle();

			if (pErr || !prod) {
				console.warn(`[Inventario] No se pudo consultar producto ${productoId}:`, pErr?.message);
				continue;
			}

			// Si el producto no controla inventario, omitir
			if (prod.controla_inventario === false) {
				continue;
			}

			const stockAnterior = Number(prod.stock || 0);
			const stockNuevo = stockAnterior - cantidadADescontar;

			// Actualizar stock en la tabla productos
			const { error: updErr } = await supabase
				.from('productos')
				.update({ stock: stockNuevo, updated_at: new Date().toISOString() })
				.eq('id', productoId);

			if (updErr) {
				console.error(`[Inventario] Error al descontar stock de producto ${productoId}:`, updErr.message);
				continue;
			}

			// Registrar movimiento en el kárdex (inventario_movimientos)
			const refVenta = venta.codigo_venta ? `Venta ${venta.codigo_venta}` : `Venta #${venta.id}`;
			const { error: movErr } = await supabase.from('inventario_movimientos').insert({
				producto_id: productoId,
				tipo_movimiento: 'salida',
				cantidad: cantidadADescontar,
				stock_anterior: stockAnterior,
				stock_nuevo: stockNuevo,
				referencia: refVenta,
				motivo: `Despacho de venta realizada (${cantidadADescontar} unid.)`,
				operador_id: operadorId || null
			});

			if (movErr) {
				console.warn(`[Inventario] No se pudo registrar movimiento kárdex:`, movErr.message);
			}
		}
	} catch (err: any) {
		console.error('[Inventario] Excepción al descontar inventario por venta:', err);
	}
}

/**
 * Restaura el stock de los productos asociados a una venta que fue anulada.
 */
export async function revertirInventarioPorVenta(
	supabase: SupabaseClient,
	venta: VentaInventarioInfo,
	operadorId?: string | null
) {
	try {
		const productosMap = new Map<number, number>();

		if (venta.es_multiple_cajas && Array.isArray(venta.cajas_detalle) && venta.cajas_detalle.length > 0) {
			for (const c of venta.cajas_detalle) {
				if (c.descontar_inventario === false) continue;
				const prodId = Number(c.producto_id);
				if (prodId && !isNaN(prodId)) {
					productosMap.set(prodId, (productosMap.get(prodId) || 0) + 1);
				}
			}
		} else if (venta.producto_id) {
			const singleNoDescontar =
				venta.descontar_inventario === false ||
				(Array.isArray(venta.cajas_detalle) &&
					venta.cajas_detalle.length > 0 &&
					venta.cajas_detalle[0]?.descontar_inventario === false);

			if (!singleNoDescontar) {
				const prodId = Number(venta.producto_id);
				const qty = Number(venta.total_cajas) || 1;
				productosMap.set(prodId, (productosMap.get(prodId) || 0) + qty);
			}
		}

		if (productosMap.size === 0) return;

		for (const [productoId, cantidadARestaurar] of productosMap.entries()) {
			const { data: prod, error: pErr } = await supabase
				.from('productos')
				.select('id, stock, controla_inventario')
				.eq('id', productoId)
				.maybeSingle();

			if (pErr || !prod || prod.controla_inventario === false) continue;

			const stockAnterior = Number(prod.stock || 0);
			const stockNuevo = stockAnterior + cantidadARestaurar;

			await supabase
				.from('productos')
				.update({ stock: stockNuevo, updated_at: new Date().toISOString() })
				.eq('id', productoId);

			const refVenta = venta.codigo_venta ? `Anulación Venta ${venta.codigo_venta}` : `Anulación Venta #${venta.id}`;
			await supabase.from('inventario_movimientos').insert({
				producto_id: productoId,
				tipo_movimiento: 'entrada',
				cantidad: cantidadARestaurar,
				stock_anterior: stockAnterior,
				stock_nuevo: stockNuevo,
				referencia: refVenta,
				motivo: `Restitución por venta anulada`,
				operador_id: operadorId || null
			});
		}
	} catch (err: any) {
		console.error('[Inventario] Excepción al revertir inventario por venta anulada:', err);
	}
}

/**
 * Adiciona unidades de stock a un producto y registra la entrada en el kárdex.
 */
export async function adicionarStock(
	supabase: SupabaseClient,
	params: {
		producto_id: number;
		cantidad: number;
		referencia?: string;
		motivo?: string;
		operador_id?: string | null;
	}
) {
	const { data: prod, error: pErr } = await supabase
		.from('productos')
		.select('id, stock, descripcion, controla_inventario')
		.eq('id', params.producto_id)
		.single();

	if (pErr || !prod) {
		if (pErr?.message?.includes('stock') || pErr?.message?.includes('does not exist')) {
			throw new Error("La columna 'stock' aún no existe en Supabase. Debes ejecutar la migración SQL en el SQL Editor de Supabase para agregar la columna 'stock' y la tabla 'inventario_movimientos'.");
		}
		throw new Error(`Producto no encontrado: ${pErr?.message || ''}`);
	}

	const cantidad = Number(params.cantidad);
	if (isNaN(cantidad) || cantidad <= 0) {
		throw new Error('La cantidad a ingresar debe ser mayor a 0');
	}

	const stockAnterior = Number(prod.stock || 0);
	const stockNuevo = stockAnterior + cantidad;

	// Actualizar stock
	const { error: updErr } = await supabase
		.from('productos')
		.update({ stock: stockNuevo, updated_at: new Date().toISOString() })
		.eq('id', params.producto_id);

	if (updErr) {
		throw new Error(`Error al actualizar stock del producto: ${updErr.message}`);
	}

	// Registrar movimiento
	const { error: movErr } = await supabase.from('inventario_movimientos').insert({
		producto_id: params.producto_id,
		tipo_movimiento: 'entrada',
		cantidad,
		stock_anterior: stockAnterior,
		stock_nuevo: stockNuevo,
		referencia: (params.referencia || '').trim().toUpperCase() || 'ENTRADA MANUAL DE STOCK',
		motivo: (params.motivo || '').trim().toUpperCase() || 'INGRESO DE INVENTARIO',
		operador_id: params.operador_id || null
	});

	if (movErr) {
		console.warn('[Inventario] No se pudo guardar el registro en inventario_movimientos:', movErr.message);
	}

	return { stockAnterior, stockNuevo, cantidad };
}

/**
 * Ajusta el stock de un producto a una cifra determinada (conteo físico) y registra el movimiento de ajuste.
 */
export async function ajustarStock(
	supabase: SupabaseClient,
	params: {
		producto_id: number;
		nuevo_stock: number;
		motivo?: string;
		operador_id?: string | null;
	}
) {
	const { data: prod, error: pErr } = await supabase
		.from('productos')
		.select('id, stock, descripcion')
		.eq('id', params.producto_id)
		.single();

	if (pErr || !prod) {
		if (pErr?.message?.includes('stock') || pErr?.message?.includes('does not exist')) {
			throw new Error("La columna 'stock' aún no existe en Supabase. Debes ejecutar la migración SQL en el SQL Editor de Supabase para agregar la columna 'stock' y la tabla 'inventario_movimientos'.");
		}
		throw new Error(`Producto no encontrado: ${pErr?.message || ''}`);
	}

	const stockNuevo = Number(params.nuevo_stock);
	if (isNaN(stockNuevo) || stockNuevo < 0) {
		throw new Error('El nuevo stock debe ser un número válido mayor o igual a 0');
	}

	const stockAnterior = Number(prod.stock || 0);
	const diferencia = stockNuevo - stockAnterior;

	// Actualizar stock
	const { error: updErr } = await supabase
		.from('productos')
		.update({ stock: stockNuevo, updated_at: new Date().toISOString() })
		.eq('id', params.producto_id);

	if (updErr) {
		throw new Error(`Error al actualizar stock del producto: ${updErr.message}`);
	}

	// Registrar movimiento
	const { error: movErr } = await supabase.from('inventario_movimientos').insert({
		producto_id: params.producto_id,
		tipo_movimiento: 'ajuste',
		cantidad: Math.abs(diferencia),
		stock_anterior: stockAnterior,
		stock_nuevo: stockNuevo,
		referencia: 'AJUSTE FÍSICO DE INVENTARIO',
		motivo: (params.motivo || '').trim().toUpperCase() || (diferencia >= 0 ? `AJUSTE POSITIVO (+${diferencia})` : `AJUSTE NEGATIVO (${diferencia})`),
		operador_id: params.operador_id || null
	});

	if (movErr) {
		console.warn('[Inventario] No se pudo guardar el registro en inventario_movimientos:', movErr.message);
	}

	return { stockAnterior, stockNuevo, diferencia };
}
