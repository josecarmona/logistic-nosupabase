import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type {
	VentaWithRelations,
	ProfileWithRelations,
	ProductoWithRelations,
	TarifaWithRelations,
	Zona,
	Pais,
	TipoTarifa,
	ConceptoPago,
	CargoDescuento,
	TipoAdquisicion
} from '$lib/types/database';
import { getRolesForUser } from '$lib/server/auth';
import { generarGuiaDespachoZoomAPI } from '$lib/services/zoom-api';
import { createSupabaseAdminClient } from '$lib/server/supabase';
import { descontarInventarioPorVenta } from '$lib/server/inventory';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.session) throw redirect(303, '/login');

	const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
	const isAllowed = roles.includes('admin') || roles.includes('gerente') || roles.includes('operador') || roles.includes('cliente');
	if (!isAllowed) throw redirect(303, '/login');

	const isCliente = roles.includes('cliente') && !roles.includes('admin') && !roles.includes('gerente') && !roles.includes('operador');

	const adminClient = createSupabaseAdminClient();

	// 1. Obtener ID del rol 'cliente' para filtrar perfiles que son clientes
	const { data: clienteRol } = await adminClient
		.from('roles')
		.select('id')
		.eq('nombre', 'cliente')
		.maybeSingle();

	let clientesQuery = adminClient
		.from('profiles')
		.select('*, pais:paises(id, nombre, codigo_iso2, codigo_iso3), tipo_adquisicion:tipo_adquisiciones(id, nombre)')
		.eq('activo', true)
		.order('nombre_completo', { ascending: true })
		.limit(50);

	if (clienteRol) {
		clientesQuery = clientesQuery.or(`rol_id.eq.${clienteRol.id},rol_id.is.null`);
	}

	const { data: clientes } = await clientesQuery;

	// 2. Cargar productos con sus tipos y unidades
	const { data: productos } = await locals.supabase
		.from('productos')
		.select('*, tipo_producto:tipos_producto(id, nombre, prefijo, atributos), unidad_medida:unidades_medida(id, codigo, nombre)')
		.eq('activo', true)
		.order('descripcion', { ascending: true });

	// 3. Cargar tarifas de ventas configuradas
	const { data: tarifas } = await locals.supabase
		.from('tarifas')
		.select('*, tipo_tarifa:tipos_tarifa(id, nombre, promocion, numero_productos), pais:paises(id, nombre, codigo_iso2, codigo_iso3), zona:zonas(id, nombre), producto:productos(id, codigo, descripcion, costo)')
		.eq('activo', true);

	// 4. Cargar catálogos generales
	const { data: zonas } = await locals.supabase.from('zonas').select('*').eq('activo', true).order('nombre');
	const { data: paises } = await locals.supabase.from('paises').select('*').eq('activo', true).order('nombre');
	const { data: tiposTarifa } = await locals.supabase.from('tipos_tarifa').select('*').eq('activo', true).order('nombre');
	const { data: conceptosPago } = await locals.supabase.from('conceptos_pago').select('*').eq('activo', true).order('nombre');
	const { data: cargosDescuentos } = await locals.supabase.from('cargos_descuentos').select('*').eq('activo', true).order('nombre');
	const { data: tipoAdquisiciones } = await locals.supabase.from('tipo_adquisiciones').select('*').eq('activo', true).order('nombre');
	const { data: articulos } = await locals.supabase.from('articulos').select('*').eq('activo', true).order('nombre');
	let { data: proveedoresRaw } = await locals.supabase
		.from('proveedores')
		.select(`
			*,
			proveedores_paises(
				pais:paises(id, nombre, codigo_iso2, codigo_iso3)
			),
			proveedor_direcciones(*)
		`)
		.eq('activo', true)
		.order('nombre');

	if (!proveedoresRaw) {
		const fb = await locals.supabase
			.from('proveedores')
			.select(`
				*,
				proveedores_paises(
					pais:paises(id, nombre, codigo_iso2, codigo_iso3)
				)
			`)
			.eq('activo', true)
			.order('nombre');
		proveedoresRaw = fb.data;
	}

	const proveedores = (proveedoresRaw || []).map((p: any) => ({
		...p,
		paises_atendidos: (p.proveedores_paises || []).map((pp: any) => pp.pais).filter(Boolean),
		direcciones: (p.proveedor_direcciones || (p.direccion ? [{ id: 0, proveedor_id: p.id, titulo: 'Principal', direccion: p.direccion, es_principal: true, activo: true }] : []))
	}));

	const editId = url.searchParams.get('edit') || url.searchParams.get('id');
	let editingVenta: VentaWithRelations | null = null;
	if (editId) {
		const { data: v } = await locals.supabase
			.from('ventas')
			.select(`
				*,
				cliente_origen:profiles!cliente_origen_id(id, nombre_completo, email, codigo, cedula, telefono, numero_celular, direccion_1, pais:paises(id, nombre, codigo_iso2, codigo_iso3)),
				cliente_destino:profiles!cliente_destino_id(id, nombre_completo, email, codigo, cedula, telefono, numero_celular, direccion_1, ciudad, pais:paises(id, nombre, codigo_iso2, codigo_iso3)),
				producto:productos(id, codigo, descripcion, atributos_valores, carga_maxima),
				pais_destino:paises(id, nombre, codigo_iso2, codigo_iso3, limite_peso),
				zona:zonas(id, nombre),
				proveedor:proveedores(id, nombre, tiene_api, direccion),
				cargos_descuentos_aplicados:venta_cargos_descuentos(*),
				pagos_registrados:venta_pagos(*),
				articulos_registrados:venta_articulos(*)
			`)
			.eq('id', editId)
			.maybeSingle();

		if (v) {
			if (v.estatus_venta === 'realizada' && !roles.includes('admin')) {
				throw redirect(303, '/ventas/historial');
			}
			const isVentaCajas =
				(v as any).tipo_operacion === 'venta_cajas' ||
				String(v.codigo_venta || '').startsWith('CAJ-') ||
				String(v.codigo_venta || '').startsWith('BOR-CAJ-');
			editingVenta = {
				...v,
				tipo_operacion: isVentaCajas ? 'venta_cajas' : 'envio'
			} as VentaWithRelations;
		}
	}

	const productosNormalized = (productos || []).map((p: any) => ({
		...p,
		precio_venta: Number(p.precio_venta ?? p.atributos_valores?.__precio_venta ?? 0)
	})) as ProductoWithRelations[];

	return {
		isCliente,
		userZonaId: locals.user?.zona_id || null,
		clientes: (clientes || []) as ProfileWithRelations[],
		productos: productosNormalized,
		tarifas: (tarifas || []) as TarifaWithRelations[],
		zonas: (zonas || []) as Zona[],
		paises: (paises || []) as Pais[],
		tiposTarifa: (tiposTarifa || []) as TipoTarifa[],
		conceptosPago: (conceptosPago || []) as ConceptoPago[],
		cargosDescuentos: (cargosDescuentos || []) as CargoDescuento[],
		tipoAdquisiciones: (tipoAdquisiciones || []) as TipoAdquisicion[],
		articulos: (articulos || []) as import('$lib/types/database').Articulo[],
		proveedores: (proveedores || []) as import('$lib/types/database').Proveedor[],
		editingVenta
	};
};

export const actions: Actions = {
	createVenta: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		const isAdmin = roles.includes('admin');
		const isUserCliente = roles.includes('cliente') && !isAdmin && !roles.includes('gerente') && !roles.includes('operador');

		const formData = await request.formData();

		const tipo_operacion_raw = (formData.get('tipo_operacion') as string || 'envio').trim();
		const esVentaCajas = tipo_operacion_raw === 'venta_cajas';

		// Permitir asignar/modificar la fecha de registro de venta ÚNICAMENTE al rol administrador
		const fecha_venta_raw = (formData.get('fecha_venta') as string || '').trim();
		let customCreatedAt: string | null = null;
		if (isAdmin && fecha_venta_raw) {
			const parsedDate = new Date(fecha_venta_raw);
			if (!isNaN(parsedDate.getTime())) {
				customCreatedAt = parsedDate.toISOString();
			}
		}

		let cliente_origen_id = (formData.get('cliente_origen_id') as string || '').trim();
		if (isUserCliente && locals.user) {
			cliente_origen_id = String(locals.user.id);
		}

		const destinatario_en_tienda = formData.get('destinatario_en_tienda') === 'true';
		let cliente_destino_id = (formData.get('cliente_destino_id') as string || '').trim();

		if ((destinatario_en_tienda || esVentaCajas) && !cliente_destino_id) {
			cliente_destino_id = cliente_origen_id;
		}

		// 1. Validar Cliente Origen (Comprador / Remitente)
		if (!cliente_origen_id) {
			return fail(400, {
				message: esVentaCajas
					? 'Debe seleccionar el Cliente Comprador'
					: 'Debe seleccionar el Cliente Remitente (Origen)'
			});
		}

		// 2. Validar Cliente Destino (Solo para Servicio de Traslado)
		if (!esVentaCajas && !cliente_destino_id) {
			return fail(400, { message: 'Debe seleccionar el Cliente Consignatario (Destino) o indicar la entrega en tienda' });
		}
		const producto_id_raw = formData.get('producto_id') as string;
		const tipo_tarifa_id_raw = formData.get('tipo_tarifa_id') as string;
		const pais_destino_id_raw = formData.get('pais_destino_id') as string;
		const zona_id_raw = formData.get('zona_id') as string;
		const peso_raw = formData.get('peso') as string;
		const peso_reportado_raw = formData.get('peso_reportado') as string;
		const alto_raw = formData.get('alto') as string;
		const ancho_raw = formData.get('ancho') as string;
		const largo_raw = formData.get('largo') as string;
		const requiere_seguro = !esVentaCajas && formData.get('requiere_seguro') === 'true';
		const valor_declarado_raw = formData.get('valor_declarado') as string;
		const porcentaje_seguro_raw = formData.get('porcentaje_seguro') as string;

		let estatus_venta = (formData.get('estatus_venta') as string || 'borrador') as 'borrador' | 'realizada';
		if (isUserCliente) {
			// El cliente SOLO puede generar operaciones en borrador
			estatus_venta = 'borrador';
		}
		const tipo_entrega = (formData.get('tipo_entrega') as string || 'domicilio').trim() as 'domicilio' | 'oficina';
		const proveedor_id_raw = formData.get('proveedor_id') as string;
		const proveedor_id = !esVentaCajas && proveedor_id_raw ? parseInt(proveedor_id_raw, 10) : null;
		const direccion_entrega = esVentaCajas
			? 'ENTREGA EN TIENDA (VENTA DE CAJAS)'
			: (formData.get('direccion_entrega') as string || '').trim();

		const cargos_descuentos_json = formData.get('cargos_descuentos_json') as string;
		const pagos_json = formData.get('pagos_json') as string;
		const articulos_json = formData.get('articulos_json') as string;
		const es_multiple_cajas = formData.get('es_multiple_cajas') === 'true';
		const total_cajas_raw = parseInt((formData.get('total_cajas') as string) || '1', 10);
		const total_cajas = isNaN(total_cajas_raw) || total_cajas_raw < 1 ? 1 : total_cajas_raw;
		const cajas_json = formData.get('cajas_json') as string;
		const descontar_inventario_caja = formData.get('descontar_inventario_caja') !== 'false';

		let parsedCajas: Array<{
			numero: string;
			indice: number;
			tipo_tarifa_id: string;
			producto_id: string;
			peso_reportado: number;
			alto?: number;
			ancho?: number;
			largo?: number;
			peso_volumetrico?: number;
			peso_facturable?: number;
			tarifa_id?: number | null;
			monto_base?: number;
			descontar_inventario?: boolean;
			descuento_caja?: number;
		}> = [];
		try {
			parsedCajas = JSON.parse(cajas_json || '[]');
		} catch (e) {
			parsedCajas = [];
		}

		let parsedArticulos: Array<{ articulo_id?: number; nombre: string; cantidad: number; valor_total: number; caja_numero?: string }> = [];
		try {
			parsedArticulos = JSON.parse(articulos_json || '[]');
		} catch (e) {
			parsedArticulos = [];
		}

		// 3. Validar Producto y Cajas
		if (es_multiple_cajas) {
			if (parsedCajas.length === 0) {
				return fail(400, { message: 'Debe configurar al menos las especificaciones de las cajas' });
			}
			for (const c of parsedCajas) {
				if (esVentaCajas) {
					if (!c.producto_id) {
						return fail(400, { message: `La caja ${c.numero} debe tener asignado un Producto` });
					}
				} else {
					if (!c.tipo_tarifa_id || !c.producto_id) {
						return fail(400, { message: `La caja ${c.numero} debe tener asignado Tipo de Tarifa y Producto` });
					}
					if (!c.peso_reportado || Number(c.peso_reportado) <= 0) {
						return fail(400, { message: `La caja ${c.numero} debe tener un peso válido mayor a 0 LB` });
					}
				}
			}
		} else {
			if (!producto_id_raw && (estatus_venta === 'realizada' || !isUserCliente)) {
				return fail(400, { message: 'Debe seleccionar un Producto para poder confirmar la venta realizada' });
			}
		}

		// 3.5 Validar Mínimo 1 Artículo Obligatorio (Solo para Servicio de Traslado)
		if (!esVentaCajas && (!parsedArticulos || parsedArticulos.length === 0)) {
			return fail(400, { message: 'Debe incluir al menos un (1) artículo en el envío/venta' });
		}

		// 4. Determinar País Destino (para Venta de Cajas se asigna de forma transparente sin exigirlo al usuario)
		let pais_destino_id_num = pais_destino_id_raw ? parseInt(pais_destino_id_raw, 10) : null;
		if (!pais_destino_id_num && cliente_destino_id) {
			const { data: destProfile } = await locals.supabase
				.from('profiles')
				.select('pais_id')
				.eq('id', cliente_destino_id)
				.maybeSingle();
			if (destProfile?.pais_id) {
				pais_destino_id_num = destProfile.pais_id;
			}
		}
		if (!pais_destino_id_num && esVentaCajas) {
			const { data: firstPais } = await locals.supabase
				.from('paises')
				.select('id')
				.eq('activo', true)
				.order('id')
				.limit(1)
				.maybeSingle();
			if (firstPais) {
				pais_destino_id_num = firstPais.id;
			}
		}

		if (!pais_destino_id_num) {
			return fail(400, { message: 'El Cliente Consignatario no posee un País Destino asignado. Por favor asigne el País de destino.' });
		}

		// 5. Determinar Zona Logística (del usuario autenticado, de zona_id_raw o primera zona activa)
		let user_zona_id = locals.user?.zona_id ? locals.user.zona_id : (zona_id_raw ? parseInt(zona_id_raw, 10) : null);
		if (!user_zona_id) {
			const { data: firstZona } = await locals.supabase
				.from('zonas')
				.select('id')
				.eq('activo', true)
				.order('id')
				.limit(1)
				.maybeSingle();
			if (firstZona) {
				user_zona_id = firstZona.id;
			}
		}

		if (!user_zona_id) {
			return fail(400, { message: 'No se encontró una Zona Logística activa registrada en el sistema.' });
		}

		let producto_id = producto_id_raw ? parseInt(producto_id_raw, 10) : null;
		const pais_destino_id = pais_destino_id_num;
		const zona_id = user_zona_id;
		let tipo_tarifa_id = !esVentaCajas && tipo_tarifa_id_raw ? parseInt(tipo_tarifa_id_raw, 10) : null;

		const peso_ingresado = esVentaCajas ? 0 : (parseFloat(peso_raw) || 0);
		let peso_reportado = esVentaCajas ? 0 : (parseFloat(peso_reportado_raw) || peso_ingresado);
		const alto = parseFloat(alto_raw) || 0;
		const ancho = parseFloat(ancho_raw) || 0;
		const largo = parseFloat(largo_raw) || 0;
		const valor_declarado = esVentaCajas ? 0 : (parseFloat(valor_declarado_raw) || 0);
		const porcentaje_seguro_aplicado = esVentaCajas ? 0 : (parseFloat(porcentaje_seguro_raw) || 0);

		// Calcular Peso Volumétrico (LB) con factor estándar de logística (Alto x Ancho x Largo en pulgadas / 166)
		const peso_volumetrico = (!esVentaCajas && alto > 0 && ancho > 0 && largo > 0)
			? parseFloat(((alto * ancho * largo) / 166).toFixed(2))
			: 0;

		// El Peso Facturable es el mayor entre el peso reportado y el peso volumétrico
		const peso_cobrar = esVentaCajas ? 0 : Math.max(peso_reportado, peso_volumetrico, peso_ingresado);
		let peso_final = esVentaCajas ? 0 : (peso_cobrar > 0 ? peso_cobrar : peso_ingresado);

		let singleProdObj: any = null;

		// 1. Verificar Límite de Peso Dinámico (Solo para Servicio de Traslado)
		const { data: paisDest } = await locals.supabase.from('paises').select('codigo_iso3, limite_peso, capacidad_minima').eq('id', pais_destino_id).single();
		if (producto_id) {
			const { data: prodData } = await locals.supabase
				.from('productos')
				.select('*')
				.eq('id', producto_id)
				.maybeSingle();

			if (prodData) {
				singleProdObj = prodData;
			}
		}

		if (!esVentaCajas && !es_multiple_cajas) {
			const capacidadMinima = paisDest && Number(paisDest.capacidad_minima) > 0 ? Number(paisDest.capacidad_minima) : 0;
			if (capacidadMinima > 0 && peso_final < capacidadMinima) {
				return fail(400, {
					message: `El peso facturable (${peso_final} LB) es inferior a la capacidad mínima requerida (${capacidadMinima} LB) para el país destino`
				});
			}

			let limiteEfectivo = paisDest && paisDest.limite_peso > 0 ? Number(paisDest.limite_peso) : 0;
			let origenLimite = 'este país';

			if (singleProdObj) {
				if (singleProdObj.carga_maxima && Number(singleProdObj.carga_maxima) > limiteEfectivo) {
					limiteEfectivo = Number(singleProdObj.carga_maxima);
					origenLimite = `el producto (${singleProdObj.descripcion})`;
				}
			}

			if (limiteEfectivo > 0 && peso_final > limiteEfectivo) {
				return fail(400, {
					message: `El peso mayor facturable (${peso_final} LB) excede el límite máximo permitido (${limiteEfectivo} LB) para ${origenLimite}`
				});
			}
		}

		const venta_id_raw = formData.get('venta_id') as string;
		const venta_id = venta_id_raw ? parseInt(venta_id_raw, 10) : null;

		let existingVenta: { id: number; codigo_venta: string; estatus_venta: string; guia_proveedor?: string | null; url_documento_proveedor?: string | null } | null = null;
		if (venta_id) {
			const { data: eV } = await locals.supabase.from('ventas').select('id, codigo_venta, estatus_venta, guia_proveedor, url_documento_proveedor').eq('id', venta_id).maybeSingle();
			if (eV) existingVenta = eV;
		}

		if (existingVenta && existingVenta.estatus_venta === 'realizada') {
			if (!isAdmin) {
				return fail(403, { message: 'Solo el administrador tiene autorización para modificar una venta cerrada' });
			}
			estatus_venta = 'realizada';
		}

		const codigo_iso3 = paisDest?.codigo_iso3 || 'VEN';
		let codigo_venta = existingVenta?.codigo_venta || '';

		// 6.5. Generar o recibir Guía del Proveedor (Solo Servicio de Traslado)
		let guia_proveedor = (existingVenta?.guia_proveedor || null) as string | null;
		let url_documento_proveedor = (existingVenta?.url_documento_proveedor || null) as string | null;
		const guia_proveedor_manual = (formData.get('guia_proveedor') as string || '').trim();

		if (!esVentaCajas && proveedor_id) {
			const { data: provObj } = await locals.supabase
				.from('proveedores')
				.select('*')
				.eq('id', proveedor_id)
				.maybeSingle();

			if (provObj) {
				if (provObj.tiene_api && !guia_proveedor) {
					const { data: cOrigen } = await locals.supabase.from('profiles').select('nombre_completo').eq('id', cliente_origen_id).maybeSingle();
					const { data: cDestino } = await locals.supabase.from('profiles').select('nombre_completo, ciudad').eq('id', cliente_destino_id).maybeSingle();

					const zoomRes = await generarGuiaDespachoZoomAPI({
						codigoVenta: codigo_venta || 'VEN-0000',
						remitenteNombre: cOrigen?.nombre_completo || 'REMITENTE',
						consignatarioNombre: cDestino?.nombre_completo || 'CONSIGNATARIO',
						consignatarioCiudad: cDestino?.ciudad || 'DESTINO',
						direccionEntrega: direccion_entrega || 'DIRECCIÓN OCURRE',
						pesoLb: peso_final,
						valorDeclaradoUsd: valor_declarado,
						tipoEntrega: tipo_entrega
					});

					if (zoomRes.success) {
						guia_proveedor = zoomRes.numero_guia;
						url_documento_proveedor = zoomRes.url_documento;
					}
				} else if (!provObj.tiene_api && guia_proveedor_manual) {
					const cleanDigits = guia_proveedor_manual.replace(/[^0-9]/g, '').slice(0, 22);
					if (cleanDigits.length > 0) {
						guia_proveedor = cleanDigits;
					}
				}
			}
		}

		if (estatus_venta === 'realizada') {
			if (!codigo_venta || codigo_venta.startsWith('BOR-')) {
				if (esVentaCajas) {
					// Secuencia exclusiva para Venta de Cajas (CAJ-0000001)
					const { data: lastCaj } = await locals.supabase
						.from('ventas')
						.select('codigo_venta')
						.like('codigo_venta', 'CAJ-%')
						.order('id', { ascending: false })
						.limit(20);

					let maxCajNum = 0;
					for (const row of lastCaj || []) {
						const match = String(row.codigo_venta || '').match(/^CAJ-(\d+)$/);
						if (match) {
							const n = parseInt(match[1], 10);
							if (!isNaN(n) && n > maxCajNum) maxCajNum = n;
						}
					}
					codigo_venta = `ATL-${String(maxCajNum + 1).padStart(6, '0')}-${codigo_iso3.toUpperCase()}`;
				} else {
					// Generar Código de Venta Secuencial: ATL - 6 dígitos - ISO3 país (ej: ATL-000001-VEN)
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

					codigo_venta = `ATL-${String(nuevoNumero).padStart(6, '0')}-${codigo_iso3.toUpperCase()}`;
				}
			}
		} else {
			if (!codigo_venta) {
				const prefix = esVentaCajas ? 'BOR-CAJ' : 'BOR';
				codigo_venta = `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
			}
		}

		// 3. Calcular Monto Base (Precio directo de Producto en Venta de Cajas, o Tarifa en Servicio de Traslado)
		let tarifa_id: number | null = null;
		let monto_base = 0;
		let esPromocionSingle = false;
		let todasCajasCeroSonPromocion = true;

		const getProdPrecioVenta = (p: any): number => {
			if (!p) return 0;
			const pv = Number(p.precio_venta ?? p.atributos_valores?.__precio_venta ?? 0);
			return pv > 0 ? pv : Number(p.costo ?? 0);
		};

		if (esVentaCajas) {
			if (es_multiple_cajas) {
				let totalMontoBase = 0;
				for (const c of parsedCajas) {
					c.peso_reportado = 0;
					c.peso_volumetrico = 0;
					c.peso_facturable = 0;
					c.tarifa_id = null;
					(c as any).tipo_tarifa_nombre = 'VENTA DE CAJA';

					if (c.producto_id) {
						const { data: cProdData } = await locals.supabase
							.from('productos')
							.select('*')
							.eq('id', c.producto_id)
							.maybeSingle();

						if (cProdData) {
							(c as any).producto_codigo = cProdData.codigo;
							(c as any).producto_descripcion = cProdData.descripcion;
							const cMonto = getProdPrecioVenta(cProdData);
							c.monto_base = Number(cMonto.toFixed(2));
							totalMontoBase += c.monto_base;
						}
					}
				}
				monto_base = Number(totalMontoBase.toFixed(2));
				if (parsedCajas.length > 0) {
					producto_id = parseInt(parsedCajas[0].producto_id, 10);
				}
			} else if (producto_id) {
				const { data: prodData } = await locals.supabase
					.from('productos')
					.select('*')
					.eq('id', producto_id)
					.maybeSingle();

				const unitPrice = getProdPrecioVenta(prodData);
				monto_base = Number((unitPrice * total_cajas).toFixed(2));
			}

			if (estatus_venta === 'realizada' && monto_base <= 0) {
				return fail(400, {
					message: 'El producto seleccionado no tiene configurado un Precio de Venta (ni Costo) mayor a $0.00 en el Catálogo de Productos.'
				});
			}
		} else if (es_multiple_cajas) {
			let totalMontoBase = 0;
			let totalPesoFinal = 0;
			let totalPesoReportado = 0;

			for (const c of parsedCajas) {
				const cAlto = Number(c.alto || 0);
				const cAncho = Number(c.ancho || 0);
				const cLargo = Number(c.largo || 0);
				const cPesoVol = Number((cAlto > 0 && cAncho > 0 && cLargo > 0 ? (cAlto * cAncho * cLargo) / 166 : 0).toFixed(1));
				const cPesoFac = Math.max(Number(c.peso_reportado || 0), cPesoVol);
				c.peso_volumetrico = cPesoVol;
				c.peso_facturable = cPesoFac;
				totalPesoFinal += cPesoFac;
				totalPesoReportado += Number(c.peso_reportado || 0);

				const cCapacidadMinima = paisDest && Number(paisDest.capacidad_minima) > 0 ? Number(paisDest.capacidad_minima) : 0;
				if (cCapacidadMinima > 0 && cPesoFac < cCapacidadMinima) {
					return fail(400, {
						message: `La caja ${c.numero} con peso facturable ${cPesoFac} LB es inferior a la capacidad mínima requerida (${cCapacidadMinima} LB) para el país destino`
					});
				}

				// Validar límite de peso individual para esta caja (producto vs país)
				let cLimiteEfectivo = paisDest && paisDest.limite_peso > 0 ? Number(paisDest.limite_peso) : 0;
				let cOrigenLimite = 'este país';

				if (c.producto_id) {
					const { data: cProdData } = await locals.supabase
						.from('productos')
						.select('*')
						.eq('id', c.producto_id)
						.maybeSingle();

					if (cProdData) {
						(c as any).producto_codigo = cProdData.codigo;
						(c as any).producto_descripcion = cProdData.descripcion;
						(c as any).precio_venta = getProdPrecioVenta(cProdData);
						if (cProdData.carga_maxima && Number(cProdData.carga_maxima) > cLimiteEfectivo) {
							cLimiteEfectivo = Number(cProdData.carga_maxima);
							cOrigenLimite = `el producto (${cProdData.descripcion})`;
						}
					}
				}

				if (cLimiteEfectivo > 0 && cPesoFac > cLimiteEfectivo) {
					return fail(400, {
						message: `La caja ${c.numero} con peso facturable ${cPesoFac} LB excede el límite máximo permitido (${cLimiteEfectivo} LB) para ${cOrigenLimite}`
					});
				}

				const { data: cTarifa } = await locals.supabase
					.from('tarifas')
					.select('*, tipo_tarifa:tipos_tarifa(id, nombre, promocion)')
					.eq('tipo_tarifa_id', c.tipo_tarifa_id)
					.eq('pais_id', pais_destino_id)
					.eq('zona_id', zona_id)
					.eq('producto_id', c.producto_id)
					.eq('activo', true)
					.maybeSingle();

				if (!cTarifa) {
					if (!isUserCliente) {
						return fail(400, {
							message: `No existe tarifa configurada para la combinación de la caja ${c.numero}. Por favor revise las tarifas activas.`
						});
					}
				} else {
					c.tarifa_id = cTarifa.id;
					const tipoTarifaRel = cTarifa.tipo_tarifa as { nombre?: string; promocion?: boolean } | null;
					(c as any).tipo_tarifa_nombre = tipoTarifaRel?.nombre || '';
					const tipoNombre = tipoTarifaRel?.nombre?.toLowerCase() || '';
					const cEsPromocion = Boolean(tipoTarifaRel?.promocion);
					const isLegacyLibre = tipoNombre.includes('libre') || tipoNombre.includes('peso') || tipoNombre.includes('libra') || tipoNombre.includes('lb');
					const esPorPeso = (cTarifa as any).tipo_calculo === 'peso' || Boolean((cTarifa as any).es_por_peso) || (!(cTarifa as any).tipo_calculo && isLegacyLibre);
					const cPesoRep = Number(c.peso_reportado || 0);
					const cMonto = esPorPeso ? Number((Number(cTarifa.precio) * cPesoRep).toFixed(2)) : Number(cTarifa.precio);

					if ((cMonto < 0 || (cMonto === 0 && !cEsPromocion)) && !isUserCliente) {
						todasCajasCeroSonPromocion = false;
						return fail(400, {
							message: `El costo base de la caja ${c.numero} es $0.00. Solo se permite precio base $0.00 cuando el Tipo de Tarifa está definido como una Promoción.`
						});
					}

					c.monto_base = cMonto;
					totalMontoBase += cMonto;
				}
			}

			monto_base = Number(totalMontoBase.toFixed(2));
			peso_final = Number(totalPesoFinal.toFixed(1));
			peso_reportado = Number(totalPesoReportado.toFixed(1));

			if (parsedCajas.length > 0) {
				producto_id = parseInt(parsedCajas[0].producto_id, 10);
				tipo_tarifa_id = parseInt(parsedCajas[0].tipo_tarifa_id, 10);
				tarifa_id = parsedCajas[0].tarifa_id || null;
			}
		} else if (tipo_tarifa_id && producto_id) {
			const { data: tarifaFound } = await locals.supabase
				.from('tarifas')
				.select('*, tipo_tarifa:tipos_tarifa(id, nombre, promocion)')
				.eq('tipo_tarifa_id', tipo_tarifa_id)
				.eq('pais_id', pais_destino_id)
				.eq('zona_id', zona_id)
				.eq('producto_id', producto_id)
				.eq('activo', true)
				.maybeSingle();

			if (!tarifaFound) {
				if (!isUserCliente) {
					return fail(400, {
						message: 'No existe una tarifa configurada en el sistema para la combinación seleccionada (Tipo de Tarifa + Producto + País Destino + Zona Logística). Por favor revise las condiciones o configure la tarifa correspondiente.'
					});
				}
			} else {
				tarifa_id = tarifaFound.id;
				const tipoTarifaRel = tarifaFound.tipo_tarifa as { nombre?: string; promocion?: boolean } | null;
				const tipoNombre = tipoTarifaRel?.nombre?.toLowerCase() || '';
				esPromocionSingle = Boolean(tipoTarifaRel?.promocion);
				const isLegacyLibre = tipoNombre.includes('libre') || tipoNombre.includes('peso') || tipoNombre.includes('libra') || tipoNombre.includes('lb');
				const esPorPeso = (tarifaFound as any).tipo_calculo === 'peso' || Boolean((tarifaFound as any).es_por_peso) || (!(tarifaFound as any).tipo_calculo && isLegacyLibre);

				const pesoRep = Number(peso_reportado) || 0;
				if (esPorPeso && pesoRep > 0) {
					monto_base = Number((Number(tarifaFound.precio) * pesoRep).toFixed(2));
				} else {
					monto_base = Number(tarifaFound.precio);
				}

				if ((monto_base < 0 || (monto_base === 0 && !esPromocionSingle)) && !isUserCliente) {
					return fail(400, {
						message: 'El costo base calculado para esta tarifa es $0.00. Solo se permite precio base $0.00 cuando el Tipo de Tarifa está definido como una Promoción.'
					});
				}
			}
		} else if (!isUserCliente || estatus_venta === 'realizada') {
			return fail(400, { message: 'Debe seleccionar un Tipo de Tarifa y Producto para poder confirmar la venta realizada' });
		}

		// 3.5. Si la venta se va a confirmar como REALIZADA, exigir estrictamente Producto, Tipo de Tarifa y Costo Base > $0 (salvo que sea Promoción o Venta de Cajas)
		if (!esVentaCajas && estatus_venta === 'realizada') {
			if (!es_multiple_cajas) {
				if (!producto_id) {
					return fail(400, { message: 'Debe seleccionar un Producto para poder confirmar la venta realizada' });
				}
				if (!tipo_tarifa_id) {
					return fail(400, { message: 'Debe seleccionar un Tipo de Tarifa para poder confirmar la venta realizada' });
				}
				if (!tarifa_id || monto_base < 0 || (monto_base === 0 && !esPromocionSingle)) {
					return fail(400, { message: 'Para confirmar la venta realizada, debe contar con una tarifa activa válida y un costo base mayor a $0.00 (o estar definida como Promoción)' });
				}
			} else if (monto_base < 0 || (monto_base === 0 && !todasCajasCeroSonPromocion)) {
				return fail(400, { message: 'Para confirmar la venta de múltiples cajas, el costo base debe ser mayor a $0.00 (salvo que aplique una tarifa de Promoción)' });
			}
		}

		// 4. Calcular Seguro
		const monto_seguro = requiere_seguro ? (valor_declarado * porcentaje_seguro_aplicado) / 100 : 0;

		// 5. Procesar Cargos y Descuentos
		let parsedCargosDescuentos: Array<{
			id?: number;
			nombre: string;
			tipo: 'cargo' | 'descuento';
			monto: number;
			es_porcentaje?: boolean;
			porcentaje?: number | null;
		}> = [];
		try {
			parsedCargosDescuentos = JSON.parse(cargos_descuentos_json || '[]');
		} catch (e) {
			parsedCargosDescuentos = [];
		}

		// Filtrar descuentos automáticos previos de inventario para evitar duplicación
		parsedCargosDescuentos = parsedCargosDescuentos.filter(
			(cd) => !String(cd.nombre || '').toUpperCase().startsWith('DESCUENTO CAJA SIN DESCUENTO DE INVENTARIO')
		);

		// Calcular descuentos por cajas que NO se descuentan del inventario
		if (es_multiple_cajas) {
			for (const c of parsedCajas) {
				const noDescontar = c.descontar_inventario === false;
				c.descontar_inventario = !noDescontar;
				if (noDescontar) {
					const cPrecioVenta = Number((c as any).precio_venta ?? 0);
					c.descuento_caja = cPrecioVenta;
					if (cPrecioVenta > 0) {
						parsedCargosDescuentos.push({
							nombre: `DESCUENTO CAJA SIN DESCUENTO DE INVENTARIO (CAJA ${c.numero}${(c as any).producto_codigo ? ` - ${(c as any).producto_codigo}` : ''})`,
							tipo: 'descuento',
							monto: cPrecioVenta,
							es_porcentaje: false
						});
					}
				} else {
					c.descuento_caja = 0;
				}
			}
		} else if (!descontar_inventario_caja && singleProdObj) {
			const unitPrecioVenta = getProdPrecioVenta(singleProdObj);
			const totalDescuentoCaja = Number((unitPrecioVenta * (esVentaCajas ? total_cajas : 1)).toFixed(2));
			if (totalDescuentoCaja > 0) {
				parsedCargosDescuentos.push({
					nombre: `DESCUENTO CAJA SIN DESCUENTO DE INVENTARIO [${singleProdObj.codigo || 'CAJA'}]`,
					tipo: 'descuento',
					monto: totalDescuentoCaja,
					es_porcentaje: false
				});
			}
		}

		let monto_total_cargos = 0;
		let monto_total_descuentos = 0;

		for (const item of parsedCargosDescuentos) {
			if (item.es_porcentaje && item.porcentaje != null && Number(item.porcentaje) >= 0) {
				item.monto = Number(((monto_base * Number(item.porcentaje)) / 100).toFixed(2));
			}
			if (item.tipo === 'cargo') monto_total_cargos += Number(item.monto) || 0;
			if (item.tipo === 'descuento') monto_total_descuentos += Number(item.monto) || 0;
		}

		const monto_subtotal = monto_base + monto_total_cargos - monto_total_descuentos;
		const monto_total = Math.max(0, monto_subtotal + monto_seguro);

		// 6. Procesar Pagos Registrados
		let parsedPagos: Array<{ concepto_pago_id?: number; concepto_nombre: string; monto: number; porcentaje_comision?: number; monto_comision?: number; monto_cobrado?: number; referencia?: string }> = [];
		try {
			parsedPagos = JSON.parse(pagos_json || '[]');
		} catch (e) {
			parsedPagos = [];
		}

		let monto_pagado_acumulado = 0;
		for (const p of parsedPagos) {
			monto_pagado_acumulado += Number(p.monto) || 0;
		}

		let estatus_pago: 'pendiente' | 'parcial' | 'pagada' = 'pendiente';
		if (estatus_venta === 'realizada') {
			if (monto_total === 0 || (monto_pagado_acumulado >= monto_total && monto_total > 0)) {
				estatus_pago = 'pagada';
			} else if (monto_pagado_acumulado > 0) {
				estatus_pago = 'parcial';
			}
		}

		// 7. Insertar o Actualizar Venta
		let targetVenta: { id: number } | null = null;
		let vErr: any = null;

		const effectiveTotalCajas = es_multiple_cajas ? total_cajas : (esVentaCajas ? total_cajas : 1);

		// Si es caja única y no se descuenta de inventario, registrar metadata en cajas_detalle
		const finalCajasDetalle = es_multiple_cajas
			? parsedCajas
			: !descontar_inventario_caja
				? [
						{
							numero: '001/001',
							indice: 1,
							tipo_tarifa_id: String(tipo_tarifa_id || ''),
							producto_id: String(producto_id || ''),
							peso_reportado,
							alto,
							ancho,
							largo,
							peso_volumetrico,
							peso_facturable: peso_final,
							tarifa_id,
							monto_base,
							descontar_inventario: false,
							descuento_caja: singleProdObj ? getProdPrecioVenta(singleProdObj) : 0
						}
					]
				: [];

		const ventaPayload: Record<string, any> = {
			codigo_venta,
			tipo_operacion: esVentaCajas ? 'venta_cajas' : 'envio',
			cliente_origen_id,
			cliente_destino_id,
			producto_id,
			tarifa_id,
			pais_destino_id,
			zona_id,
			peso: peso_final,
			peso_reportado,
			alto,
			ancho,
			largo,
			peso_volumetrico,
			peso_cobrar: peso_final,
			requiere_seguro,
			valor_declarado,
			porcentaje_seguro_aplicado,
			monto_seguro,
			monto_base,
			monto_subtotal,
			monto_total_cargos,
			monto_total_descuentos,
			monto_total,
			monto_pagado: estatus_venta === 'realizada' ? monto_pagado_acumulado : 0,
			estatus_venta,
			estatus_pago,
			tipo_entrega,
			proveedor_id,
			direccion_entrega,
			guia_proveedor,
			url_documento_proveedor,
			es_multiple_cajas,
			total_cajas: effectiveTotalCajas,
			cajas_detalle: finalCajasDetalle,
			descontar_inventario: descontar_inventario_caja,
			operador_id: locals.user?.id || null,
			updated_at: new Date().toISOString()
		};

		// Modificar la fecha de registro (created_at) únicamente si el rol administrador la especificó
		if (customCreatedAt) {
			ventaPayload.created_at = customCreatedAt;
		}

		const saveVentaWithFallback = async (payload: Record<string, any>, editIdNum?: number) => {
			let currentPayload = { ...payload };
			let res = editIdNum
				? await locals.supabase.from('ventas').update(currentPayload).eq('id', editIdNum).select().single()
				: await locals.supabase.from('ventas').insert(currentPayload).select().single();

			if (res.error && (res.error.message?.includes('descontar_inventario') || res.error.code === '42703')) {
				delete currentPayload.descontar_inventario;
				res = editIdNum
					? await locals.supabase.from('ventas').update(currentPayload).eq('id', editIdNum).select().single()
					: await locals.supabase.from('ventas').insert(currentPayload).select().single();
			}

			if (res.error && (res.error.message?.includes('tipo_operacion') || res.error.code === '42703')) {
				delete currentPayload.tipo_operacion;
				res = editIdNum
					? await locals.supabase.from('ventas').update(currentPayload).eq('id', editIdNum).select().single()
					: await locals.supabase.from('ventas').insert(currentPayload).select().single();
			}
			return res;
		};

		if (existingVenta) {
			const { data: uV, error: uErr } = await saveVentaWithFallback(ventaPayload, existingVenta.id);
			targetVenta = uV;
			vErr = uErr;

			if (targetVenta) {
				await locals.supabase.from('venta_articulos').delete().eq('venta_id', targetVenta.id);
				await locals.supabase.from('venta_cargos_descuentos').delete().eq('venta_id', targetVenta.id);
				await locals.supabase.from('venta_pagos').delete().eq('venta_id', targetVenta.id);
			}
		} else {
			const { data: nV, error: iErr } = await saveVentaWithFallback(ventaPayload);
			targetVenta = nV;
			vErr = iErr;
		}

		// Si el esquema de base de datos actual requiere un producto_id (restricción NOT NULL), asignar un producto base en BD de forma transparente
		if (vErr && !producto_id && (vErr.code === '23502' || vErr.message?.includes('producto_id'))) {
			const { data: firstProd } = await locals.supabase.from('productos').select('id').eq('activo', true).order('id').limit(1).maybeSingle();
			if (firstProd) {
				ventaPayload.producto_id = firstProd.id;
				if (existingVenta) {
					const { data: uV, error: uErr } = await saveVentaWithFallback(ventaPayload, existingVenta.id);
					targetVenta = uV;
					vErr = uErr;
				} else {
					const { data: nV, error: iErr } = await saveVentaWithFallback(ventaPayload);
					targetVenta = nV;
					vErr = iErr;
				}
			}
		}

		if (vErr || !targetVenta) {
			return fail(500, { message: `Error al guardar la venta: ${vErr?.message}` });
		}

		// Insertar cargos/descuentos
		if (parsedCargosDescuentos.length > 0) {
			const cdPayloads = parsedCargosDescuentos.map((cd) => ({
				venta_id: targetVenta.id,
				cargo_descuento_id: cd.id || null,
				nombre: cd.nombre,
				tipo: cd.tipo,
				monto: cd.monto,
				es_porcentaje: !!cd.es_porcentaje,
				porcentaje: cd.es_porcentaje && cd.porcentaje != null ? Number(cd.porcentaje) : null
			}));
			const { error: cdError } = await locals.supabase.from('venta_cargos_descuentos').insert(cdPayloads);
			if (cdError) {
				console.warn('Fallo al insertar venta_cargos_descuentos con porcentaje, reintentando básico:', cdError.message);
				const fallbackPayloads = parsedCargosDescuentos.map((cd) => ({
					venta_id: targetVenta.id,
					cargo_descuento_id: cd.id || null,
					nombre: cd.nombre,
					tipo: cd.tipo,
					monto: cd.monto
				}));
				await locals.supabase.from('venta_cargos_descuentos').insert(fallbackPayloads);
			}
		}

		// Insertar pagos
		if (parsedPagos.length > 0) {
			const pagoPayloads = parsedPagos.map((p) => ({
				venta_id: targetVenta.id,
				concepto_pago_id: p.concepto_pago_id || null,
				concepto_nombre: p.concepto_nombre,
				monto: p.monto,
				porcentaje_comision: Number(p.porcentaje_comision || 0),
				monto_comision: Number(p.monto_comision || 0),
				monto_cobrado: Number(p.monto_cobrado || p.monto),
				referencia: p.referencia || null
			}));
			await locals.supabase.from('venta_pagos').insert(pagoPayloads);
		}

		// Insertar artículos declarados en la venta
		if (parsedArticulos.length > 0) {
			const artPayloads = parsedArticulos.map((art) => ({
				venta_id: targetVenta.id,
				articulo_id: art.articulo_id || null,
				nombre: art.nombre,
				cantidad: Number(art.cantidad) || 1,
				valor_total: Number(art.valor_total) || 0,
				caja_numero: art.caja_numero || '001/001'
			}));
			const { error: artErr } = await locals.supabase.from('venta_articulos').insert(artPayloads);
			if (artErr) {
				// Fallback si la columna caja_numero aún no existe en el catálogo de BD
				const fallbackPayloads = artPayloads.map(({ caja_numero, ...rest }) => ({
					...rest,
					nombre: caja_numero && caja_numero !== '001/001' && !rest.nombre.includes(caja_numero)
						? `[${caja_numero}] ${rest.nombre}`
						: rest.nombre
				}));
				await locals.supabase.from('venta_articulos').insert(fallbackPayloads);
			}
		}

		// 8. Descontar Inventario si la venta está REALIZADA
		if (estatus_venta === 'realizada') {
			await descontarInventarioPorVenta(
				locals.supabase,
				{
					id: targetVenta.id,
					codigo_venta,
					es_multiple_cajas,
					total_cajas: effectiveTotalCajas,
					cajas_detalle: finalCajasDetalle,
					producto_id,
					descontar_inventario: descontar_inventario_caja
				},
				locals.user?.id
			);
		}

		return { success: true, action: 'createVenta', codigo_venta, tipo_operacion: esVentaCajas ? 'venta_cajas' : 'envio' };
	},

	createClientFromVenta: async ({ request, locals }) => {
		if (!locals.session) {
			return fail(401, { message: 'Sesión no válida' });
		}
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		const isAllowed =
			roles.includes('admin') ||
			roles.includes('gerente') ||
			roles.includes('operador') ||
			roles.includes('cliente');
		if (!isAllowed) {
			return fail(403, { message: 'No tiene permisos para registrar clientes' });
		}

		const adminClient = createSupabaseAdminClient();
		const formData = await request.formData();
		const emailRaw = (formData.get('email') as string || '').trim().toLowerCase();
		const nombre_completo = (formData.get('nombre_completo') as string || '').trim().toUpperCase();
		const cedula = (formData.get('cedula') as string || '').trim().toUpperCase();
		const razon_social = (formData.get('razon_social') as string || '').trim().toUpperCase();
		const direccion_1 = (formData.get('direccion_1') as string || '').trim().toUpperCase();
		const direccion_2 = (formData.get('direccion_2') as string || '').trim().toUpperCase();
		const codigo_postal = (formData.get('codigo_postal') as string || '').trim().toUpperCase();
		const ciudad = (formData.get('ciudad') as string || '').trim().toUpperCase();
		const estado = (formData.get('estado') as string || '').trim().toUpperCase();
		const municipio = (formData.get('municipio') as string || '').trim().toUpperCase();
		const telefono = (formData.get('telefono') as string || '').trim();
		const numero_celular = (formData.get('numero_celular') as string || '').trim();
		const pais_id_raw = formData.get('pais_id') as string;
		const tipo_adquisicion_id_raw = formData.get('tipo_adquisicion_id') as string;
		const referencia = (formData.get('referencia') as string || '').trim().toUpperCase();

		if (!nombre_completo) {
			return fail(400, { message: 'El nombre completo del cliente es obligatorio' });
		}

		// Ignorar validación de unicidad si el operador coloca un correo genérico (ej. noregistra@gmail.com) o vacío
		const isGenericEmail =
			!emailRaw ||
			/^(no[-_.]?registra|no[-_.]?tiene|sin[-_.]?correo|sin[-_.]?email|na|n\/a|ninguno|cliente)@/i.test(
				emailRaw
			);

		if (emailRaw && !isGenericEmail) {
			const { data: existingEmail } = await adminClient
				.from('profiles')
				.select('id')
				.ilike('email', emailRaw)
				.maybeSingle();

			if (existingEmail) {
				return fail(400, { message: 'Ya existe un cliente registrado con este correo electrónico.' });
			}
		}

		// 2. Validación de Teléfono / Celular único (solo si no son genéricos de ceros)
		const cleanTel = telefono.replace(/[^0-9]/g, '');
		const cleanCel = numero_celular.replace(/[^0-9]/g, '');
		const hasValidTel = cleanTel.length >= 7 && !/^0+$/.test(cleanTel);
		const hasValidCel = cleanCel.length >= 7 && !/^0+$/.test(cleanCel);

		if (hasValidTel || hasValidCel) {
			const orConditions: string[] = [];
			if (hasValidTel) {
				orConditions.push(`telefono.eq.${telefono}`, `numero_celular.eq.${telefono}`);
			}
			if (hasValidCel) {
				orConditions.push(`telefono.eq.${numero_celular}`, `numero_celular.eq.${numero_celular}`);
			}
			const { data: existingPhone } = await adminClient
				.from('profiles')
				.select('id, nombre_completo, codigo')
				.or(orConditions.join(','))
				.maybeSingle();

			if (existingPhone) {
				return fail(400, {
					message: `Ya existe un cliente registrado con este número telefónico o celular (${existingPhone.nombre_completo}${existingPhone.codigo ? ` [${existingPhone.codigo}]` : ''}).`
				});
			}
		}

		const pais_id = pais_id_raw ? parseInt(pais_id_raw, 10) : null;
		const tipo_adquisicion_id = tipo_adquisicion_id_raw ? parseInt(tipo_adquisicion_id_raw, 10) : null;

		// 3. Asignar rol 'cliente' por defecto
		const { data: defaultRole } = await adminClient
			.from('roles')
			.select('id')
			.eq('nombre', 'cliente')
			.maybeSingle();
		const rol_id = defaultRole?.id || null;

		// 4. Generación automática del Código Secuencial del Cliente
		let codigo: string | null = null;
		if (rol_id) {
			const { data: codeData } = await adminClient.rpc('generar_codigo_perfil', { p_rol_id: rol_id });
			if (codeData) codigo = codeData;
		}

		const { data: newProfile, error: insErr } = await adminClient
			.from('profiles')
			.insert({
				email: emailRaw || null,
				nombre_completo,
				cedula: cedula || null,
				razon_social: razon_social || null,
				direccion_1: direccion_1 || null,
				direccion_2: direccion_2 || null,
				codigo_postal: codigo_postal || null,
				ciudad: ciudad || null,
				estado: estado || null,
				municipio: municipio || null,
				telefono: telefono || null,
				numero_celular: numero_celular || null,
				pais_id,
				tipo_adquisicion_id,
				referencia: referencia || null,
				rol_id,
				codigo,
				activo: true
			})
			.select('*, pais:paises(id, nombre, codigo_iso2, codigo_iso3), tipo_adquisicion:tipo_adquisiciones(id, nombre)')
			.single();

		if (insErr || !newProfile) {
			return fail(500, { message: `Error al crear el cliente: ${insErr?.message}` });
		}

		return {
			success: true,
			action: 'createClientFromVenta',
			newClientId: newProfile.id,
			newClient: newProfile as ProfileWithRelations
		};
	},

	updateClientFromVenta: async ({ request, locals }) => {
		if (!locals.session) {
			return fail(401, { message: 'Sesión no válida' });
		}
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		const isAllowed =
			roles.includes('admin') ||
			roles.includes('gerente') ||
			roles.includes('operador') ||
			roles.includes('cliente');
		if (!isAllowed) {
			return fail(403, { message: 'No tiene permisos para actualizar clientes' });
		}

		const adminClient = createSupabaseAdminClient();
		const formData = await request.formData();
		const id = formData.get('id') as string;
		const emailRaw = (formData.get('email') as string || '').trim().toLowerCase();
		const nombre_completo = (formData.get('nombre_completo') as string || '').trim().toUpperCase();
		const cedula = (formData.get('cedula') as string || '').trim().toUpperCase();
		const razon_social = (formData.get('razon_social') as string || '').trim().toUpperCase();
		const direccion_1 = (formData.get('direccion_1') as string || '').trim().toUpperCase();
		const direccion_2 = (formData.get('direccion_2') as string || '').trim().toUpperCase();
		const codigo_postal = (formData.get('codigo_postal') as string || '').trim().toUpperCase();
		const ciudad = (formData.get('ciudad') as string || '').trim().toUpperCase();
		const estado = (formData.get('estado') as string || '').trim().toUpperCase();
		const municipio = (formData.get('municipio') as string || '').trim().toUpperCase();
		const telefono = (formData.get('telefono') as string || '').trim();
		const numero_celular = (formData.get('numero_celular') as string || '').trim();
		const pais_id_raw = formData.get('pais_id') as string;
		const tipo_adquisicion_id_raw = formData.get('tipo_adquisicion_id') as string;
		const referencia = (formData.get('referencia') as string || '').trim().toUpperCase();

		if (!id || !nombre_completo) {
			return fail(400, { message: 'ID y nombre completo son obligatorios' });
		}

		const pais_id = pais_id_raw ? parseInt(pais_id_raw, 10) : null;
		const tipo_adquisicion_id = tipo_adquisicion_id_raw ? parseInt(tipo_adquisicion_id_raw, 10) : null;

		const { data: updatedProfile, error: updErr } = await adminClient
			.from('profiles')
			.update({
				email: emailRaw || null,
				nombre_completo,
				cedula: cedula || null,
				razon_social: razon_social || null,
				direccion_1: direccion_1 || null,
				direccion_2: direccion_2 || null,
				codigo_postal: codigo_postal || null,
				ciudad: ciudad || null,
				estado: estado || null,
				municipio: municipio || null,
				telefono: telefono || null,
				numero_celular: numero_celular || null,
				pais_id,
				tipo_adquisicion_id,
				referencia: referencia || null,
				updated_at: new Date().toISOString()
			})
			.eq('id', id)
			.select('*, pais:paises(id, nombre, codigo_iso2, codigo_iso3), tipo_adquisicion:tipo_adquisiciones(id, nombre)')
			.single();

		if (updErr) {
			return fail(500, { message: `Error al actualizar el cliente: ${updErr.message}` });
		}

		return {
			success: true,
			action: 'updateClientFromVenta',
			updatedClient: updatedProfile as ProfileWithRelations
		};
	},

	cambiarFechaOperacion: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		const isAdmin = roles.includes('admin');
		if (!isAdmin) {
			return fail(403, { message: 'Solo el administrador tiene autorización para cambiar la fecha de operación de una venta' });
		}

		const formData = await request.formData();
		const venta_id = formData.get('id') as string;
		const nueva_fecha_raw = (formData.get('nueva_fecha') as string || '').trim();

		if (!venta_id) {
			return fail(400, { message: 'ID de venta no proporcionado' });
		}

		if (!nueva_fecha_raw) {
			return fail(400, { message: 'Debe especificar una fecha y hora de operación válidas' });
		}

		const parsedDate = new Date(nueva_fecha_raw);
		if (isNaN(parsedDate.getTime())) {
			return fail(400, { message: 'El formato de fecha y hora no es válido' });
		}

		const { data: venta, error: vErr } = await locals.supabase
			.from('ventas')
			.select('id, codigo_venta, estatus_venta, created_at')
			.eq('id', venta_id)
			.maybeSingle();

		if (vErr || !venta) {
			return fail(404, { message: 'Venta no encontrada' });
		}

		if (venta.estatus_venta === 'anulada') {
			return fail(400, { message: 'No se puede cambiar la fecha de operación de una venta anulada' });
		}

		const isoDate = parsedDate.toISOString();

		const { error: updErr } = await locals.supabase
			.from('ventas')
			.update({
				created_at: isoDate,
				updated_at: new Date().toISOString()
			})
			.eq('id', venta.id);

		if (updErr) {
			return fail(500, { message: `Error al actualizar la fecha de operación: ${updErr.message}` });
		}

		return {
			success: true,
			action: 'cambiarFechaOperacion',
			codigo_venta: venta.codigo_venta,
			nueva_fecha: isoDate
		};
	}
};
