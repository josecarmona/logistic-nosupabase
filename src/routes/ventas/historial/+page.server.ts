import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { VentaWithRelations, ConceptoPago, PlantillaDocumento } from '$lib/types/database';
import { getRolesForUser } from '$lib/server/auth';
import { generarGuiaDespachoZoomAPI } from '$lib/services/zoom-api';
import { descontarInventarioPorVenta, revertirInventarioPorVenta } from '$lib/server/inventory';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.session) throw redirect(303, '/login');

	const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
	const isAllowed = roles.includes('admin') || roles.includes('gerente') || roles.includes('operador') || roles.includes('cliente');
	if (!isAllowed) throw redirect(303, '/login');

	const isCliente = roles.includes('cliente') && !roles.includes('admin') && !roles.includes('gerente') && !roles.includes('operador');
	const isAdmin = roles.includes('admin');

	const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
	const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
	const pageSize = 15;

	const search = (url.searchParams.get('search') || '').trim();
	const estatusVenta = (url.searchParams.get('estatus_venta') || 'borrador').trim();
	const estatusPago = (url.searchParams.get('estatus_pago') || '').trim();

	// Conteos para pestañas
	let countBorradoresQuery = locals.supabase
		.from('ventas')
		.select('id', { count: 'exact', head: true })
		.eq('estatus_venta', 'borrador');

	let countProcesadasQuery = locals.supabase
		.from('ventas')
		.select('id', { count: 'exact', head: true })
		.eq('estatus_venta', 'realizada');

	if (isCliente && locals.user) {
		countBorradoresQuery = countBorradoresQuery.eq('cliente_origen_id', locals.user.id);
		countProcesadasQuery = countProcesadasQuery.eq('cliente_origen_id', locals.user.id);
	}

	const { count: countBorradores } = await countBorradoresQuery;
	const { count: countProcesadas } = await countProcesadasQuery;

	// Cargar conceptos de pago activos
	const { data: conceptosPago } = await locals.supabase
		.from('conceptos_pago')
		.select('*')
		.eq('activo', true)
		.order('nombre');

	let query = locals.supabase
		.from('ventas')
		.select(
			`
			*,
			cliente_origen:profiles!cliente_origen_id(id, nombre_completo, email, codigo, cedula, telefono, numero_celular, direccion_1, pais:paises(id, nombre, codigo_iso2, codigo_iso3)),
			cliente_destino:profiles!cliente_destino_id(id, nombre_completo, email, codigo, cedula, telefono, numero_celular, direccion_1, ciudad, pais:paises(id, nombre, codigo_iso2, codigo_iso3)),
			producto:productos(id, codigo, descripcion, atributos_valores),
			pais_destino:paises(id, nombre, codigo_iso2, codigo_iso3, limite_peso),
			zona:zonas(id, nombre),
			proveedor:proveedores(id, nombre, tiene_api, direccion),
			cargos_descuentos_aplicados:venta_cargos_descuentos(*),
			pagos_registrados:venta_pagos(*),
			articulos_registrados:venta_articulos(*)
		`,
			{ count: 'exact' }
		)
		.order('created_at', { ascending: false });

	if (isCliente && locals.user) {
		query = query.eq('cliente_origen_id', locals.user.id);
	}

	if (search) {
		query = query.or(`codigo_venta.ilike.%${search}%`);
	}

	if (estatusVenta && estatusVenta !== 'todos') {
		query = query.eq('estatus_venta', estatusVenta);
	}

	if (estatusPago && estatusPago !== 'todos') {
		query = query.eq('estatus_pago', estatusPago);
	}

	const from = (page - 1) * pageSize;
	const to = from + pageSize - 1;

	const { data: ventas, count } = await query.range(from, to);

	const ventasNormalized = (ventas || []).map((v: any) => ({
		...v,
		tipo_operacion:
			v.tipo_operacion === 'venta_cajas' ||
			String(v.codigo_venta || '').startsWith('CAJ-') ||
			String(v.codigo_venta || '').startsWith('BOR-CAJ-')
				? 'venta_cajas'
				: 'envio'
	}));

	const totalItems = count || 0;
	const totalPages = Math.ceil(totalItems / pageSize) || 1;

	// Cargar plantillas de documentos activas permitidas para los roles del usuario
	const { data: plantillas } = await locals.supabase
		.from('plantillas_documentos')
		.select('id, nombre, tipo, paper_size, orientation, roles_permitidos, es_default')
		.eq('activa', true)
		.order('nombre');

	const plantillasPermitidas = (plantillas || []).filter((p: any) => {
		if (!p.roles_permitidos || p.roles_permitidos.length === 0) return true;
		return p.roles_permitidos.some((r: string) => roles.includes(r));
	});

	return {
		ventas: ventasNormalized as VentaWithRelations[],
		totalItems,
		totalPages,
		currentPage: page,
		search,
		estatusVenta,
		estatusPago,
		countBorradores: countBorradores || 0,
		countProcesadas: countProcesadas || 0,
		conceptosPago: (conceptosPago || []) as ConceptoPago[],
		plantillasDocumentos: plantillasPermitidas as Partial<PlantillaDocumento>[],
		isCliente,
		isAdmin
	};
};

export const actions: Actions = {
	anularVenta: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		const isAllowed = roles.includes('admin') || roles.includes('gerente');
		if (!isAllowed) return fail(403, { message: 'Solo Administradores y Gerentes pueden anular ventas' });

		const formData = await request.formData();
		const venta_id = formData.get('id') as string;

		if (!venta_id) return fail(400, { message: 'ID de venta no proporcionado' });

		// 1. Obtener datos de la venta para saber si ya estaba realizada y revertir inventario
		const { data: ventaToAnular } = await locals.supabase
			.from('ventas')
			.select('id, codigo_venta, estatus_venta, producto_id, es_multiple_cajas, total_cajas, cajas_detalle')
			.eq('id', venta_id)
			.maybeSingle();

		const { error } = await locals.supabase
			.from('ventas')
			.update({
				estatus_venta: 'anulada',
				updated_at: new Date().toISOString()
			})
			.eq('id', venta_id);

		if (error) {
			return fail(500, { message: `Error al anular la venta: ${error.message}` });
		}

		if (ventaToAnular && ventaToAnular.estatus_venta === 'realizada') {
			await revertirInventarioPorVenta(locals.supabase, ventaToAnular, locals.user?.id);
		}

		return { success: true, action: 'anularVenta' };
	},

	procesarBorrador: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		const isAllowed = roles.includes('admin') || roles.includes('gerente') || roles.includes('operador');
		if (!isAllowed) return fail(403, { message: 'Sólo administradores, gerentes u operadores pueden procesar borradores de ventas' });

		const formData = await request.formData();
		const venta_id = formData.get('id') as string;

		if (!venta_id) return fail(400, { message: 'ID de venta no proporcionado' });

		// 1. Consultar la venta actual
		const { data: ventaFound, error: fErr } = await locals.supabase
			.from('ventas')
			.select(`
				*,
				tarifa:tarifas(id, precio, tipo_tarifa:tipos_tarifa(id, nombre, promocion)),
				cliente_origen:profiles!cliente_origen_id(nombre_completo),
				cliente_destino:profiles!cliente_destino_id(nombre_completo, ciudad),
				pais_destino:paises(codigo_iso3)
			`)
			.eq('id', venta_id)
			.single();

		if (fErr || !ventaFound) {
			return fail(404, { message: 'Venta en borrador no encontrada' });
		}

		if (ventaFound.estatus_venta === 'realizada') {
			return fail(400, { message: 'Esta venta ya se encuentra procesada y cuenta con un código asignado' });
		}

		const esVentaCajas =
			(ventaFound as any).tipo_operacion === 'venta_cajas' ||
			String((ventaFound as any).codigo_venta || '').startsWith('BOR-CAJ-') ||
			String((ventaFound as any).codigo_venta || '').startsWith('CAJ-');

		const tarifaRel = Array.isArray((ventaFound as any).tarifa) ? (ventaFound as any).tarifa[0] : (ventaFound as any).tarifa;
		const tipoTarifaRel = Array.isArray(tarifaRel?.tipo_tarifa) ? tarifaRel?.tipo_tarifa[0] : tarifaRel?.tipo_tarifa;
		const esPromocion = Boolean(tipoTarifaRel?.promocion);
		const montoBaseVal = Number(ventaFound.monto_base ?? -1);

		if (esVentaCajas) {
			if (montoBaseVal <= 0) {
				return fail(400, {
					message: 'Este borrador de Venta de Cajas no tiene un precio de venta válido ($0.00). Edite el borrador o configure el precio del producto.'
				});
			}
		} else if (!ventaFound.tarifa_id || montoBaseVal < 0 || (montoBaseVal === 0 && !esPromocion && !ventaFound.es_multiple_cajas)) {
			return fail(400, {
				message: 'Este borrador no tiene un costo base o tarifa válida ($0.00 solo se permite en Promociones). Por favor edite la venta en borrador para seleccionar una combinación de tarifa válida antes de procesarla.'
			});
		}

		let nuevo_codigo_venta = '';
		let guia_proveedor = (ventaFound.guia_proveedor || null) as string | null;
		let url_documento_proveedor = (ventaFound.url_documento_proveedor || null) as string | null;

		if (esVentaCajas) {
			const { data: ultimasCajas } = await locals.supabase
				.from('ventas')
				.select('codigo_venta')
				.ilike('codigo_venta', 'CAJ-%')
				.order('id', { ascending: false })
				.limit(50);

			let maxNum = 0;
			for (const row of ultimasCajas || []) {
				const m = String(row.codigo_venta || '').match(/^CAJ-(\d+)$/i);
				if (m) {
					const n = parseInt(m[1], 10);
					if (!isNaN(n) && n > maxNum) maxNum = n;
				}
			}
			const isoCaj = (ventaFound.pais_destino as { codigo_iso3?: string } | null)?.codigo_iso3 || 'VEN';
			nuevo_codigo_venta = `ATL-${String(maxNum + 1).padStart(6, '0')}-${isoCaj.toUpperCase()}`;
		} else {
			const pais_destino_id = ventaFound.pais_destino_id;
			const codigo_iso3 = (ventaFound.pais_destino as { codigo_iso3?: string } | null)?.codigo_iso3 || 'VEN';

			// 2. Generar Código Secuencial: ATL - 6 dígitos - ISO3 país (ej: ATL-000001-VEN)
			let { data: secData } = await locals.supabase
				.from('secuencias_ventas_pais')
				.select('ultimo_numero')
				.eq('pais_id', pais_destino_id)
				.maybeSingle();

			let nuevoNumero = (secData?.ultimo_numero || 0) + 1;

			if (secData) {
				await locals.supabase.from('secuencias_ventas_pais').update({ ultimo_numero: nuevoNumero }).eq('pais_id', pais_destino_id);
			} else {
				await locals.supabase.from('secuencias_ventas_pais').insert({ pais_id: pais_destino_id, ultimo_numero: nuevoNumero });
			}

			nuevo_codigo_venta = `ATL-${String(nuevoNumero).padStart(6, '0')}-${codigo_iso3.toUpperCase()}`;

			// 3. Generar Guía en API del Proveedor si aplica y aún no tiene guía asignada
			if (ventaFound.proveedor_id && !guia_proveedor) {
				const { data: provObj } = await locals.supabase
					.from('proveedores')
					.select('*')
					.eq('id', ventaFound.proveedor_id)
					.maybeSingle();

				if (provObj?.tiene_api) {
					const zoomRes = await generarGuiaDespachoZoomAPI({
						codigoVenta: nuevo_codigo_venta,
						remitenteNombre: (ventaFound as any).cliente_origen?.nombre_completo || 'REMITENTE',
						consignatarioNombre: (ventaFound as any).cliente_destino?.nombre_completo || 'CONSIGNATARIO',
						consignatarioCiudad: (ventaFound as any).cliente_destino?.ciudad || 'DESTINO',
						direccionEntrega: ventaFound.direccion_entrega || 'DIRECCIÓN OCURRE',
						pesoLb: ventaFound.peso,
						valorDeclaradoUsd: ventaFound.valor_declarado,
						tipoEntrega: ventaFound.tipo_entrega || 'domicilio'
					});

					if (zoomRes.success) {
						guia_proveedor = zoomRes.numero_guia;
						url_documento_proveedor = zoomRes.url_documento;
					}
				}
			}
		}

		// 4. Actualizar Venta a 'realizada' con su Código Oficial Secuencial y datos de guía de proveedor
		const nuevoEstatusPago = Number(ventaFound.monto_total || 0) === 0 ? 'pagada' : ventaFound.estatus_pago;
		const { error: updateErr } = await locals.supabase
			.from('ventas')
			.update({
				codigo_venta: nuevo_codigo_venta,
				estatus_venta: 'realizada',
				estatus_pago: nuevoEstatusPago,
				guia_proveedor,
				url_documento_proveedor,
				updated_at: new Date().toISOString()
			})
			.eq('id', venta_id);

		if (updateErr) {
			return fail(500, { message: `Error al procesar la venta: ${updateErr.message}` });
		}

		// 5. Descontar Inventario de los productos de la venta procesada
		await descontarInventarioPorVenta(
			locals.supabase,
			{
				id: ventaFound.id,
				codigo_venta: nuevo_codigo_venta,
				es_multiple_cajas: ventaFound.es_multiple_cajas,
				total_cajas: ventaFound.total_cajas,
				cajas_detalle: ventaFound.cajas_detalle,
				producto_id: ventaFound.producto_id,
				descontar_inventario: (ventaFound as any).descontar_inventario
			},
			locals.user?.id
		);

		return { success: true, action: 'procesarBorrador', codigo_venta: nuevo_codigo_venta };
	},

	registrarAbono: async ({ request, locals }) => {
		const formData = await request.formData();
		const venta_id = formData.get('venta_id') as string;
		const concepto_pago_id_raw = formData.get('concepto_pago_id') as string;
		const monto_raw = formData.get('monto') as string;
		const referencia = (formData.get('referencia') as string || '').trim();

		if (!venta_id || !concepto_pago_id_raw) {
			return fail(400, { message: 'Faltan datos obligatorios para el abono' });
		}

		const montoAbono = parseFloat(monto_raw) || 0;
		if (montoAbono <= 0) {
			return fail(400, { message: 'El monto del abono debe ser mayor a 0' });
		}

		// 1. Obtener la venta actual
		const { data: venta, error: vErr } = await locals.supabase
			.from('ventas')
			.select('id, monto_total, monto_pagado, estatus_venta')
			.eq('id', venta_id)
			.single();

		if (vErr || !venta) {
			return fail(404, { message: 'Venta no encontrada' });
		}

		if (venta.estatus_venta === 'anulada') {
			return fail(400, { message: 'No se pueden registrar abonos en una venta anulada' });
		}

		const saldoPendiente = Math.max(0, Number((venta.monto_total - (venta.monto_pagado || 0)).toFixed(2)));

		if (montoAbono > saldoPendiente + 0.001) {
			return fail(400, { message: `El monto del abono ($${montoAbono.toFixed(2)}) no puede ser mayor al saldo por pagar ($${saldoPendiente.toFixed(2)})` });
		}

		// 2. Obtener concepto de pago
		const { data: concepto } = await locals.supabase
			.from('conceptos_pago')
			.select('id, nombre, requiere_referencia, porcentaje_comision')
			.eq('id', concepto_pago_id_raw)
			.single();

		if (!concepto) {
			return fail(400, { message: 'Concepto de pago no encontrado' });
		}

		if (concepto.requiere_referencia) {
			if (!/^\d{4,9}$/.test(referencia)) {
				return fail(400, { message: 'El código de referencia debe contener entre 4 y 9 dígitos numéricos' });
			}
		}

		const porcentaje_comision = Number(concepto.porcentaje_comision || 0);
		const monto_comision = porcentaje_comision > 0 ? Number((montoAbono * (porcentaje_comision / 100)).toFixed(2)) : 0;
		const monto_cobrado = Number((montoAbono + monto_comision).toFixed(2));

		// 3. Registrar el pago en public.venta_pagos
		const { error: pErr } = await locals.supabase
			.from('venta_pagos')
			.insert({
				venta_id: venta.id,
				concepto_pago_id: concepto.id,
				concepto_nombre: concepto.nombre,
				monto: montoAbono,
				porcentaje_comision,
				monto_comision,
				monto_cobrado,
				referencia: concepto.requiere_referencia ? referencia : null
			});

		if (pErr) {
			return fail(500, { message: `Error al registrar el pago: ${pErr.message}` });
		}

		// 4. Actualizar total pagado y estatus_pago en la venta
		const nuevoMontoPagado = Number(((venta.monto_pagado || 0) + montoAbono).toFixed(2));
		let nuevoEstatusPago: 'pendiente' | 'parcial' | 'pagada' = 'parcial';
		if (nuevoMontoPagado >= venta.monto_total && venta.monto_total > 0) {
			nuevoEstatusPago = 'pagada';
		}

		await locals.supabase
			.from('ventas')
			.update({
				monto_pagado: nuevoMontoPagado,
				estatus_pago: nuevoEstatusPago,
				updated_at: new Date().toISOString()
			})
			.eq('id', venta.id);

		return {
			success: true,
			action: 'registrarAbono',
			montoAbono,
			montoComision: monto_comision,
			montoCobrado: monto_cobrado,
			saldoRestante: Math.max(0, Number((venta.monto_total - nuevoMontoPagado).toFixed(2)))
		};
	},

	actualizarFechaVenta: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		const isAdmin = roles.includes('admin');
		if (!isAdmin) {
			return fail(403, { message: 'Solo los administradores tienen autorización para modificar la fecha de ventas procesadas' });
		}

		const formData = await request.formData();
		const venta_id = formData.get('id') as string;
		const fecha_venta_raw = ((formData.get('fecha_venta') || formData.get('nueva_fecha')) as string || '').trim();

		if (!venta_id) {
			return fail(400, { message: 'ID de venta no proporcionado' });
		}

		if (!fecha_venta_raw) {
			return fail(400, { message: 'Debe especificar una fecha de venta válida' });
		}

		const parsedDate = new Date(fecha_venta_raw);
		if (isNaN(parsedDate.getTime())) {
			return fail(400, { message: 'El formato de la fecha especificada es inválido' });
		}

		// Consultar la venta para verificar su existencia y estatus
		const { data: venta, error: vErr } = await locals.supabase
			.from('ventas')
			.select('id, codigo_venta, estatus_venta')
			.eq('id', venta_id)
			.single();

		if (vErr || !venta) {
			return fail(404, { message: 'Venta no encontrada' });
		}

		if (venta.estatus_venta === 'anulada') {
			return fail(400, { message: 'No se puede modificar la fecha de una venta que ha sido anulada' });
		}

		// Actualizar la fecha de registro (created_at) en public.ventas
		const { error: uErr } = await locals.supabase
			.from('ventas')
			.update({
				created_at: parsedDate.toISOString(),
				updated_at: new Date().toISOString()
			})
			.eq('id', venta_id);

		if (uErr) {
			return fail(500, { message: `Error al actualizar la fecha de la venta: ${uErr.message}` });
		}

		return {
			success: true,
			action: 'actualizarFechaVenta',
			message: `Fecha de la venta #${venta.codigo_venta || ''} actualizada con éxito`,
			id: venta_id,
			codigo_venta: venta.codigo_venta,
			nuevaFecha: parsedDate.toISOString(),
			nueva_fecha: parsedDate.toISOString()
		};
	},

	cambiarFechaOperacion: async (event) => {
		return actions.actualizarFechaVenta(event);
	}
};
