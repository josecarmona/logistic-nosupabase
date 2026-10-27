import type { VentaWithRelations, ConfiguracionGeneral } from '$lib/types/database';
import { generateQRCodeSVG } from '$lib/services/qrcode';
import { generateBarcodeSVG } from '$lib/services/barcode';

export interface DocumentTokenDefinition {
	token: string;
	label: string;
	category: 'remitente' | 'consignatario' | 'logistica' | 'producto' | 'finanzas' | 'graficos';
	description: string;
}

export const DOCUMENT_TOKENS: DocumentTokenDefinition[] = [
	// 1. Remitente
	{ token: '{{remitente_nombre}}', label: 'Nombre Remitente', category: 'remitente', description: 'Nombre completo del remitente' },
	{ token: '{{remitente_cedula}}', label: 'Cédula / Doc. Remitente', category: 'remitente', description: 'Número de documento de identidad' },
	{ token: '{{remitente_telefono}}', label: 'Teléfono Remitente', category: 'remitente', description: 'Teléfono o celular de contacto' },
	{ token: '{{remitente_email}}', label: 'Email Remitente', category: 'remitente', description: 'Correo electrónico' },
	{ token: '{{remitente_direccion}}', label: 'Dirección Remitente', category: 'remitente', description: 'Dirección fiscal o residencia' },
	{ token: '{{remitente_ciudad}}', label: 'Ciudad / Estado Remitente', category: 'remitente', description: 'Ciudad y estado de origen' },
	{ token: '{{remitente_codigo_postal}}', label: 'C.P. Remitente', category: 'remitente', description: 'Código postal de origen' },

	// 2. Consignatario / Destino
	{ token: '{{consignatario_nombre}}', label: 'Nombre Consignatario', category: 'consignatario', description: 'Nombre completo de quien recibe' },
	{ token: '{{consignatario_cedula}}', label: 'Cédula Consignatario', category: 'consignatario', description: 'Documento o RIF destinatario' },
	{ token: '{{consignatario_telefono}}', label: 'Teléfono Consignatario', category: 'consignatario', description: 'Teléfono de contacto destino' },
	{ token: '{{consignatario_email}}', label: 'Email Consignatario', category: 'consignatario', description: 'Correo electrónico destino' },
	{ token: '{{consignatario_direccion}}', label: 'Dirección Destino', category: 'consignatario', description: 'Dirección de entrega' },
	{ token: '{{consignatario_ciudad}}', label: 'Ciudad Destino', category: 'consignatario', description: 'Ciudad del destinatario' },
	{ token: '{{consignatario_estado}}', label: 'Estado / Región Destino', category: 'consignatario', description: 'Estado o departamento' },
	{ token: '{{consignatario_codigo_postal}}', label: 'C.P. Destino', category: 'consignatario', description: 'Código postal destino' },
	{ token: '{{pais_destino}}', label: 'País Destino', category: 'consignatario', description: 'País receptor del despacho' },

	// 3. Logística y Operación
	{ token: '{{codigo_venta}}', label: 'Código Venta / Tracking', category: 'logistica', description: 'Código secuencial o identificador' },
	{ token: '{{fecha_emision}}', label: 'Fecha de Emisión', category: 'logistica', description: 'Fecha de registro de la venta' },
	{ token: '{{hora_emision}}', label: 'Hora de Emisión', category: 'logistica', description: 'Hora de registro' },
	{ token: '{{empresa_transporte}}', label: 'Empresa de Transporte', category: 'logistica', description: 'Proveedor logístico asignado' },
	{ token: '{{guia_proveedor}}', label: 'Guía del Proveedor / API', category: 'logistica', description: 'Número de tracking del transportista' },
	{ token: '{{tipo_entrega}}', label: 'Tipo Entrega', category: 'logistica', description: 'Entrega a Domicilio o Retiro en Oficina' },
	{ token: '{{direccion_entrega}}', label: 'Dirección Entrega Final', category: 'logistica', description: 'Lugar exacto de entrega' },
	{ token: '{{packer_operador}}', label: 'Packer / Operador', category: 'logistica', description: 'Nombre del usuario que emite la orden' },
	{ token: '{{condiciones_pago}}', label: 'Condiciones de Pago', category: 'logistica', description: 'Efectivo, Tarjeta, Zelle o Mixto' },

	// 4. Pesos y Producto
	{ token: '{{producto_codigo}}', label: 'Código Producto', category: 'producto', description: 'Código del producto o caja' },
	{ token: '{{producto_descripcion}}', label: 'Descripción Producto', category: 'producto', description: 'Nombre o medidas de la caja' },
	{ token: '{{producto_tipo}}', label: 'Tipo de Producto', category: 'producto', description: 'Tipo / Categoría de mercancía' },
	{ token: '{{peso_facturable}}', label: 'Peso Facturable (LB)', category: 'producto', description: 'Peso final liquidado' },
	{ token: '{{peso_reportado}}', label: 'Peso Reportado (LB)', category: 'producto', description: 'Peso físico en báscula' },
	{ token: '{{peso_volumetrico}}', label: 'Peso Volumétrico (LB)', category: 'producto', description: 'Peso por dimensiones' },
	{ token: '{{dimension_largo}}', label: 'Largo (IN)', category: 'producto', description: 'Longitud de la caja en pulgadas' },
	{ token: '{{dimension_alto}}', label: 'Alto (IN)', category: 'producto', description: 'Altura de la caja en pulgadas' },
	{ token: '{{dimension_ancho}}', label: 'Ancho (IN)', category: 'producto', description: 'Anchura de la caja en pulgadas' },

	// 5. Finanzas y Desglose
	{ token: '{{monto_base}}', label: 'Monto Base Tarifa ($)', category: 'finanzas', description: 'Costo base del flete' },
	{ token: '{{monto_seguro}}', label: 'Monto Seguro ($)', category: 'finanzas', description: 'Prima de seguro liquidada' },
	{ token: '{{porcentaje_seguro}}', label: '% Seguro Aplicado', category: 'finanzas', description: 'Tasa porcentual de seguro' },
	{ token: '{{valor_declarado}}', label: 'Valor Declarado ($)', category: 'finanzas', description: 'Valor total declarado de los bienes' },
	{ token: '{{monto_caja}}', label: 'Costo Caja ($)', category: 'finanzas', description: 'Costo por suministro de caja' },
	{ token: '{{monto_herramientas}}', label: 'Costo Herramientas ($)', category: 'finanzas', description: 'Fee por envío de herramientas' },
	{ token: '{{monto_empaque}}', label: 'Costo Empaque ($)', category: 'finanzas', description: 'Costo por empaque o wrap' },
	{ token: '{{monto_reempaque}}', label: 'Costo Reempaque ($)', category: 'finanzas', description: 'Costo por reempaque adicional' },
	{ token: '{{monto_otros_cargos}}', label: 'Cargos Adicionales ($)', category: 'finanzas', description: 'Otros recargos extraordinarios' },
	{ token: '{{monto_recoleccion}}', label: 'Costo Recolección ($)', category: 'finanzas', description: 'Recargo por pickup' },
	{ token: '{{monto_cargos}}', label: 'Total Cargos ($)', category: 'finanzas', description: 'Suma de recargos extraordinarios' },
	{ token: '{{monto_descuentos}}', label: 'Descuentos ($)', category: 'finanzas', description: 'Descuentos comerciales aplicados' },
	{ token: '{{monto_total}}', label: 'Monto Total Facturado ($)', category: 'finanzas', description: 'Total de la orden' },
	{ token: '{{monto_pagado}}', label: 'Total Pagado / Abonado ($)', category: 'finanzas', description: 'Monto recaudado' },
	{ token: '{{pago_efectivo}}', label: 'Pago Efectivo ($)', category: 'finanzas', description: 'Monto pagado en efectivo' },
	{ token: '{{pago_tarjeta}}', label: 'Pago Tarjeta / Elec. ($)', category: 'finanzas', description: 'Monto pagado con tarjeta o electrónico' },
	{ token: '{{saldo_pendiente}}', label: 'Saldo Pendiente ($)', category: 'finanzas', description: 'Monto por cobrar' },
	{ token: '{{estatus_pago}}', label: 'Estatus del Pago', category: 'finanzas', description: 'Pagada, Parcial o Pendiente' },

	// 6. Elementos Gráficos, Tablas y Membretes
	{ token: '{{nombre_empresa}}', label: 'Nombre de la Empresa', category: 'graficos', description: 'Razón comercial configurada' },
	{ token: '{{eslogan_empresa}}', label: 'Eslogan de la Empresa', category: 'graficos', description: 'Eslogan comercial' },
	{ token: '{{direccion_empresa}}', label: 'Dirección de la Empresa', category: 'graficos', description: 'Dirección del centro de operaciones' },
	{ token: '{{telefono_empresa}}', label: 'Teléfono de la Empresa', category: 'graficos', description: 'Teléfono de atención al cliente' },
	{ token: '{{email_empresa}}', label: 'Email de la Empresa', category: 'graficos', description: 'Correo de soporte' },
	{ token: '{{logo_empresa}}', label: 'Logotipo de la Empresa', category: 'graficos', description: 'Imagen del logo institucional' },
	{ token: '{{codigo_qr}}', label: 'Código QR de Tracking', category: 'graficos', description: 'QR vectorial para escaneo y seguimiento' },
	{ token: '{{codigo_barras}}', label: 'Código de Barras 1D', category: 'graficos', description: 'Código de barras Code 128B con ID' },
	{ token: '{{tabla_articulos}}', label: 'Tabla de Artículos Declarados', category: 'graficos', description: 'Tabla HTML formateada con artículos' },
	{ token: '{{tabla_pagos}}', label: 'Tabla de Pagos / Cobro Mixto', category: 'graficos', description: 'Tabla HTML con abonos y métodos' },
	{ token: '{{firmas_conformidad}}', label: 'Bloque de Firmas y Sellos', category: 'graficos', description: 'Espacio para firma del emisor y cliente' },
	{ token: '{{fecha_hora_emision}}', label: 'Fecha y Hora de Emisión', category: 'logistica', description: 'Fecha y hora combinadas de la orden' },
	{ token: '{{numero_caja}}', label: 'Número de Caja (ej. 001/002)', category: 'logistica', description: 'Identificador de caja en envíos múltiples' }
];

export interface DocumentoPorCaja {
	cajaNumero: string | null;
	cajaIndex: number;
	totalCajas: number;
	venta: VentaWithRelations & { caja_numero?: string | null };
	invoiceCode: string;
	qrSvg: string;
	barcodeSvg: string;
	barcodeSvgWide: string;
}

/**
 * Transforma una venta en una lista de documentos individuales por caja cuando es_multiple_cajas está activo.
 * Si es una venta de caja única, retorna un arreglo con un único elemento.
 */
export function buildVentasPorCaja(
	venta: VentaWithRelations,
	productosCatalog?: Array<{
		id: number;
		codigo: string;
		descripcion: string;
		atributos_valores?: any;
		tipo_producto?: { id: number; nombre: string } | null;
	}>
): DocumentoPorCaja[] {
	const baseCode = venta.codigo_venta || `INV-${String(venta.id).padStart(6, '0')}`;

	if (!venta.es_multiple_cajas || !venta.cajas_detalle || venta.cajas_detalle.length === 0) {
		return [
			{
				cajaNumero: null,
				cajaIndex: 1,
				totalCajas: 1,
				venta: { ...venta, caja_numero: null },
				invoiceCode: baseCode,
				qrSvg: generateQRCodeSVG(baseCode, 140),
				barcodeSvg: generateBarcodeSVG(baseCode, 50, 2, true),
				barcodeSvgWide: generateBarcodeSVG(baseCode, 65, 2.5, true)
			}
		];
	}

	const totalCajas = venta.cajas_detalle.length;
	const allArticulos = venta.articulos_registrados || [];
	const hasAnyBoxAssigned = allArticulos.some((a) => Boolean(a.caja_numero));

	return venta.cajas_detalle.map((caja, idx) => {
		const cajaNumero =
			caja.numero || `${String(idx + 1).padStart(3, '0')}/${String(totalCajas).padStart(3, '0')}`;
		const boxCodeForBarcode = `${baseCode}-${cajaNumero.replace('/', '-')}`;
		const boxDisplayCode = `${baseCode} (CAJA ${cajaNumero})`;

		const catalogProd = productosCatalog?.find((p) => String(p.id) === String(caja.producto_id));
		const boxProducto = catalogProd
			? {
					id: catalogProd.id,
					codigo: catalogProd.codigo,
					descripcion: catalogProd.descripcion,
					atributos_valores: catalogProd.atributos_valores || {},
					tipo_producto: catalogProd.tipo_producto || venta.producto?.tipo_producto || null
				}
			: {
					id: Number(caja.producto_id) || venta.producto?.id || 0,
					codigo: caja.producto_codigo || venta.producto?.codigo || 'CAJA',
					descripcion: caja.producto_descripcion || venta.producto?.descripcion || 'CAJA ESTÁNDAR',
					atributos_valores: venta.producto?.atributos_valores || {},
					tipo_producto: venta.producto?.tipo_producto || null
				};

		const cAlto = Number(caja.alto || venta.alto || 14);
		const cAncho = Number(caja.ancho || venta.ancho || 14);
		const cLargo = Number(caja.largo || venta.largo || 14);
		const cPesoReportado = Number(caja.peso_reportado || 0);
		const cPesoVolumetrico = Number(
			caja.peso_volumetrico ??
				(cAlto > 0 && cAncho > 0 && cLargo > 0
					? Number(((cAlto * cAncho * cLargo) / 166).toFixed(1))
					: 0)
		);
		const cPesoFacturable = Number(
			caja.peso_facturable ?? Math.max(cPesoReportado, cPesoVolumetrico)
		);

		const boxArticulos = hasAnyBoxAssigned
			? allArticulos.filter((a) => a.caja_numero === cajaNumero)
			: allArticulos;

		const boxValorDeclarado = hasAnyBoxAssigned
			? Number(
					boxArticulos.reduce((acc, a) => acc + Number(a.valor_total || 0), 0).toFixed(2)
				)
			: Number(venta.valor_declarado || 0);

		const boxMontoBase =
			caja.monto_base !== undefined ? Number(caja.monto_base) : Number(venta.monto_base || 0);

		const boxMontoSeguro = venta.requiere_seguro
			? Number(
					((boxValorDeclarado * Number(venta.porcentaje_seguro_aplicado || 0)) / 100).toFixed(2)
				)
			: 0;

		const ventaCaja: VentaWithRelations & { caja_numero?: string | null } = {
			...venta,
			caja_numero: cajaNumero,
			codigo_venta: boxDisplayCode,
			producto: boxProducto as any,
			alto: cAlto,
			ancho: cAncho,
			largo: cLargo,
			peso_reportado: cPesoReportado,
			peso_volumetrico: cPesoVolumetrico,
			peso: cPesoFacturable,
			peso_cobrar: cPesoFacturable,
			monto_base: boxMontoBase,
			valor_declarado: boxValorDeclarado,
			monto_seguro: boxMontoSeguro,
			articulos_registrados: boxArticulos
		};

		return {
			cajaNumero,
			cajaIndex: idx + 1,
			totalCajas,
			venta: ventaCaja,
			invoiceCode: boxDisplayCode,
			qrSvg: generateQRCodeSVG(boxCodeForBarcode, 140),
			barcodeSvg: generateBarcodeSVG(boxCodeForBarcode, 50, 2, true),
			barcodeSvgWide: generateBarcodeSVG(boxCodeForBarcode, 65, 2.5, true)
		};
	});
}

/**
 * Reemplaza todos los tokens dinámicos en una plantilla HTML con los datos reales de la venta y configuración.
 */
export function renderDocumentTemplate(
	templateHtml: string,
	venta: VentaWithRelations,
	config: ConfiguracionGeneral | null
): string {
	if (!templateHtml) return '';

	const cajaNumero = (venta as any).caja_numero || (venta.es_multiple_cajas ? '001/001' : '');
	const invoiceCode = venta.codigo_venta || `INV-${String(venta.id).padStart(6, '0')}`;
	const fechaEmision = new Date(venta.created_at).toLocaleDateString();
	const horaEmision = new Date(venta.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

	// Códigos gráficos
	const qrSvg = generateQRCodeSVG(invoiceCode, 130);
	const barcodeSvg = generateBarcodeSVG(invoiceCode, 55, 2.2, true);
	const logoHtml = config?.logo_url
		? `<img src="${config.logo_url}" alt="${config.nombre_empresa || 'Logo'}" class="max-h-14 object-contain" />`
		: `<span class="font-black text-xl text-primary uppercase">${config?.nombre_empresa || 'LOGÍSTICA'}</span>`;

	// Métodos de pago consolidado
	let condicionesPago = 'PENDIENTE';
	if (venta.pagos_registrados && venta.pagos_registrados.length > 0) {
		const metodos = Array.from(new Set(venta.pagos_registrados.map((p) => p.concepto_nombre?.toUpperCase() || '')));
		condicionesPago = metodos.join(' / ');
	} else if (venta.estatus_pago === 'pagada') {
		condicionesPago = 'PAGADA';
	}

	// Recolección y cargos
	const recoleccionMonto =
		venta.cargos_descuentos_aplicados
			?.filter((c) => c.nombre?.toLowerCase().includes('recoleccion') || c.nombre?.toLowerCase().includes('pickup'))
			?.reduce((acc, curr) => acc + Number(curr.monto || 0), 0) || 0;

	const montoCaja =
		venta.cargos_descuentos_aplicados
			?.filter((c) => c.nombre?.toLowerCase().includes('caja'))
			?.reduce((acc, curr) => acc + Number(curr.monto || 0), 0) || 0;

	const montoHerramientas =
		venta.cargos_descuentos_aplicados
			?.filter((c) => c.nombre?.toLowerCase().includes('herramienta') || c.nombre?.toLowerCase().includes('wood'))
			?.reduce((acc, curr) => acc + Number(curr.monto || 0), 0) || 25.0;

	const montoEmpaque =
		venta.cargos_descuentos_aplicados
			?.filter((c) => c.nombre?.toLowerCase().includes('empaque') && !c.nombre?.toLowerCase().includes('reempaque'))
			?.reduce((acc, curr) => acc + Number(curr.monto || 0), 0) || 15.0;

	const montoReempaque =
		venta.cargos_descuentos_aplicados
			?.filter((c) => c.nombre?.toLowerCase().includes('reempaque') || c.nombre?.toLowerCase().includes('aditional wrap'))
			?.reduce((acc, curr) => acc + Number(curr.monto || 0), 0) || 25.0;

	const montoOtrosCargos =
		venta.cargos_descuentos_aplicados
			?.filter(
				(c) =>
					c.tipo === 'cargo' &&
					!c.nombre?.toLowerCase().includes('seguro') &&
					!c.nombre?.toLowerCase().includes('herramienta') &&
					!c.nombre?.toLowerCase().includes('empaque') &&
					!c.nombre?.toLowerCase().includes('reempaque') &&
					!c.nombre?.toLowerCase().includes('caja')
			)
			?.reduce((acc, curr) => acc + Number(curr.monto || 0), 0) || 0;

	const pagoEfectivo =
		venta.pagos_registrados
			?.filter((p) => p.concepto_nombre?.toLowerCase().includes('efectivo') || p.concepto_nombre?.toLowerCase().includes('cash'))
			?.reduce((acc, curr) => acc + Number(curr.monto || 0), 0) || 0;

	const pagoTarjeta =
		venta.pagos_registrados
			?.filter(
				(p) =>
					p.concepto_nombre?.toLowerCase().includes('tarjeta') ||
					p.concepto_nombre?.toLowerCase().includes('card') ||
					p.concepto_nombre?.toLowerCase().includes('zelle') ||
					p.concepto_nombre?.toLowerCase().includes('transferencia')
			)
			?.reduce((acc, curr) => acc + Number(curr.monto || 0), 0) || 0;

	const largo = venta.largo || 14;
	const alto = venta.alto || 14;
	const ancho = venta.ancho || 14;

	// Tabla de artículos declarados
	let tablaArticulosHtml = '<p class="text-xs text-muted-foreground italic">Sin artículos detallados registrados.</p>';
	let filasArticulosPickingHtml = '';
	if (venta.articulos_registrados && venta.articulos_registrados.length > 0) {
		const filas = venta.articulos_registrados
			.map(
				(art) => `
			<tr class="border-b">
				<td class="p-1.5 uppercase font-semibold text-xs">${art.nombre}</td>
				<td class="p-1.5 text-center font-mono text-xs">${art.cantidad}</td>
				<td class="p-1.5 text-right font-mono font-bold text-xs">$${Number(art.valor_total).toFixed(2)}</td>
			</tr>
		`
			)
			.join('');

		filasArticulosPickingHtml = venta.articulos_registrados
			.map(
				(art) => `
        <tr>
          <td style="border-left: 1px solid #000; border-right: 1px solid #000; padding: 3px 6px; text-align: center;">${art.cantidad}</td>
          <td style="border-left: 1px solid #000; border-right: 1px solid #000; padding: 3px 6px; text-align: center; text-transform: uppercase;">${art.nombre}</td>
          <td style="border-left: 1px solid #000; border-right: 1px solid #000; padding: 3px 6px; text-align: right; padding-right: 16px;">${Number(art.valor_total).toFixed(2)}</td>
        </tr>`
			)
			.join('');

		tablaArticulosHtml = `
			<div class="border rounded-lg overflow-hidden text-xs my-2">
				<table class="w-full text-left">
					<thead class="bg-slate-100 text-[10px] font-bold uppercase text-slate-700 border-b">
						<tr>
							<th class="p-1.5">Artículo / Contenido</th>
							<th class="p-1.5 text-center">Cant.</th>
							<th class="p-1.5 text-right">Valor Declarado ($)</th>
						</tr>
					</thead>
					<tbody class="divide-y">${filas}</tbody>
				</table>
			</div>
		`;
	}

	// Tabla de pagos
	let tablaPagosHtml = '<p class="text-xs text-muted-foreground italic">Sin pagos registrados.</p>';
	if (venta.pagos_registrados && venta.pagos_registrados.length > 0) {
		const filas = venta.pagos_registrados
			.map(
				(p) => `
			<tr class="border-b">
				<td class="p-1.5 uppercase font-bold text-xs">${p.concepto_nombre} ${p.referencia ? `<span class="text-[9px] font-normal text-slate-500">Ref: ${p.referencia}</span>` : ''}</td>
				<td class="p-1.5 text-right font-mono font-bold text-xs text-emerald-600">$${Number(p.monto).toFixed(2)}</td>
			</tr>
		`
			)
			.join('');

		tablaPagosHtml = `
			<div class="border rounded-lg overflow-hidden text-xs my-2">
				<table class="w-full text-left">
					<thead class="bg-slate-100 text-[10px] font-bold uppercase text-slate-700 border-b">
						<tr>
							<th class="p-1.5">Método / Concepto de Pago</th>
							<th class="p-1.5 text-right">Monto Abonado ($)</th>
						</tr>
					</thead>
					<tbody class="divide-y">${filas}</tbody>
				</table>
			</div>
		`;
	}

	// Firmas
	const firmasHtml = `
		<div class="grid grid-cols-2 gap-10 pt-6 text-xs text-center font-semibold">
			<div class="space-y-6">
				<div class="border-b border-slate-400 w-3/4 mx-auto"></div>
				<p class="uppercase text-slate-700">Firma y Sello del Agente / Despacho</p>
			</div>
			<div class="space-y-6">
				<div class="border-b border-slate-400 w-3/4 mx-auto"></div>
				<p class="uppercase text-slate-700">Firma de Conformidad del Cliente / Receptor</p>
			</div>
		</div>
	`;

	const mapReplacements: Record<string, string> = {
		// Remitente
		'{{remitente_nombre}}': venta.cliente_origen?.nombre_completo || 'N/A',
		'{{remitente_cedula}}': venta.cliente_origen?.cedula || 'N/A',
		'{{remitente_telefono}}': venta.cliente_origen?.telefono || venta.cliente_origen?.numero_celular || 'N/A',
		'{{remitente_email}}': venta.cliente_origen?.email || 'N/A',
		'{{remitente_direccion}}': venta.cliente_origen?.direccion_1 || 'N/A',
		'{{remitente_ciudad}}': venta.cliente_origen?.ciudad || 'N/A',
		'{{remitente_codigo_postal}}': venta.cliente_origen?.codigo_postal || 'N/A',

		// Consignatario
		'{{consignatario_nombre}}': venta.cliente_destino?.nombre_completo || 'N/A',
		'{{consignatario_cedula}}': venta.cliente_destino?.cedula || 'N/A',
		'{{consignatario_telefono}}': venta.cliente_destino?.telefono || venta.cliente_destino?.numero_celular || 'N/A',
		'{{consignatario_email}}': venta.cliente_destino?.email || 'N/A',
		'{{consignatario_direccion}}': venta.direccion_entrega || venta.cliente_destino?.direccion_1 || 'N/A',
		'{{consignatario_ciudad}}': venta.cliente_destino?.ciudad || 'N/A',
		'{{consignatario_estado}}': venta.cliente_destino?.estado || 'N/A',
		'{{consignatario_codigo_postal}}': venta.cliente_destino?.codigo_postal || 'N/A',
		'{{pais_destino}}': venta.pais_destino?.nombre || 'DESTINO',

		// Logística
		'{{codigo_venta}}': invoiceCode,
		'{{numero_caja}}': cajaNumero || '001/001',
		'{{fecha_emision}}': fechaEmision,
		'{{hora_emision}}': horaEmision,
		'{{empresa_transporte}}': venta.proveedor?.nombre || 'TRANSPORTE PROPIO',
		'{{guia_proveedor}}': venta.guia_proveedor || 'N/A',
		'{{tipo_entrega}}': venta.tipo_entrega === 'oficina' ? 'RETIRO EN OFICINA / OCURRE' : 'ENTREGA A DOMICILIO',
		'{{direccion_entrega}}': venta.direccion_entrega || venta.cliente_destino?.direccion_1 || 'N/A',
		'{{packer_operador}}': venta.vendedor?.nombre_completo || 'OPERADOR',
		'{{condiciones_pago}}': condicionesPago,

		// Producto
		'{{producto_codigo}}': venta.producto?.codigo || 'N/A',
		'{{producto_descripcion}}': venta.producto?.descripcion || 'ENVÍO ESTÁNDAR',
		'{{producto_tipo}}': venta.producto?.tipo_producto?.nombre || 'PAQUETERÍA',
		'{{peso_facturable}}': String(venta.peso || 0),
		'{{peso_reportado}}': String(venta.peso_reportado || venta.peso || 0),
		'{{peso_volumetrico}}': String(venta.peso_volumetrico || 0),

		// Finanzas
		'{{monto_base}}': venta.monto_base.toFixed(2),
		'{{monto_seguro}}': venta.monto_seguro.toFixed(2),
		'{{porcentaje_seguro}}': String(venta.porcentaje_seguro_aplicado || 0),
		'{{valor_declarado}}': venta.valor_declarado.toFixed(2),
		'{{monto_recoleccion}}': recoleccionMonto.toFixed(2),
		'{{monto_cargos}}': venta.monto_total_cargos.toFixed(2),
		'{{monto_descuentos}}': venta.monto_total_descuentos.toFixed(2),
		'{{monto_total}}': venta.monto_total.toFixed(2),
		'{{monto_pagado}}': (venta.monto_pagado || 0).toFixed(2),
		'{{saldo_pendiente}}': Math.max(0, venta.monto_total - (venta.monto_pagado || 0)).toFixed(2),
		'{{estatus_pago}}': (venta.estatus_pago || 'pendiente').toUpperCase(),

		// Gráficos y Tablas
		'{{nombre_empresa}}': config?.nombre_empresa || 'LOGISTIC SYSTEM',
		'{{eslogan_empresa}}': config?.eslogan || 'Soluciones de transporte y logística integral',
		'{{direccion_empresa}}': config?.direccion_empresa || 'Centro de Operaciones y Despacho',
		'{{telefono_empresa}}': config?.telefono_empresa || 'N/A',
		'{{email_empresa}}': config?.email_empresa || 'info@logistica.com',
		'{{logo_empresa}}': logoHtml,
		'{{codigo_qr}}': qrSvg,
		'{{codigo_barras}}': barcodeSvg,
		'{{tabla_articulos}}': tablaArticulosHtml,
		'{{tabla_pagos}}': tablaPagosHtml,
		'{{firmas_conformidad}}': firmasHtml,

		// Dimensiones y Desglose Picking List
		'{{dimension_largo}}': String(largo),
		'{{dimension_alto}}': String(alto),
		'{{dimension_ancho}}': String(ancho),
		'{{monto_caja}}': montoCaja.toFixed(2),
		'{{monto_herramientas}}': montoHerramientas.toFixed(2),
		'{{monto_empaque}}': montoEmpaque.toFixed(2),
		'{{monto_reempaque}}': montoReempaque.toFixed(2),
		'{{monto_otros_cargos}}': montoOtrosCargos.toFixed(2),
		'{{pago_efectivo}}': pagoEfectivo.toFixed(2),
		'{{pago_tarjeta}}': pagoTarjeta.toFixed(2),
		'{{fecha_hora_emision}}': `${fechaEmision}, ${horaEmision}`
	};

	let rendered = templateHtml;
	for (const [token, value] of Object.entries(mapReplacements)) {
		rendered = rendered.replaceAll(token, value);
	}

	// Si la plantilla contiene la fila de ejemplo "ALMOHADAS" de PICKING_LIST_TEMPLATE_HTML y la venta tiene artículos, reemplazarla con los artículos reales de la caja
	if (filasArticulosPickingHtml && rendered.includes('>ALMOHADAS<')) {
		rendered = rendered.replace(
			/<tr>\s*<td[^>]*>1<\/td>\s*<td[^>]*>ALMOHADAS<\/td>\s*<td[^>]*>20<\/td>\s*<\/tr>/i,
			filasArticulosPickingHtml
		);
	}

	if (cajaNumero && rendered.includes('LISTA DE EMPAQUE / PACKING LIST') && !rendered.includes(`CAJA ${cajaNumero}`)) {
		rendered = rendered.replace(
			'LISTA DE EMPAQUE / PACKING LIST',
			`LISTA DE EMPAQUE / PACKING LIST — CAJA ${cajaNumero}`
		);
	}

	return rendered;
}

/**
 * Renderiza la plantilla con datos de prueba realistas para el previsualizador en tiempo real del diseñador.
 */
export function renderMockDocument(templateHtml: string): string {
	const mockVenta: any = {
		id: 1042,
		codigo_venta: 'VEN-2026-001042',
		created_at: new Date().toISOString(),
		largo: 14,
		alto: 14,
		ancho: 14,
		peso: 50,
		peso_reportado: 50,
		peso_volumetrico: 17,
		monto_base: 125.0,
		monto_seguro: 35.0,
		porcentaje_seguro_aplicado: 7,
		valor_declarado: 500.0,
		monto_total_cargos: 65.0,
		monto_total_descuentos: 0,
		monto_total: 225.0,
		monto_pagado: 0.0,
		estatus_pago: 'pendiente',
		tipo_entrega: 'domicilio',
		direccion_entrega: 'LAGUNA DE TORONTO SN EL NARANJO MANZANILLO COLIMA 28868 MEX',
		guia_proveedor: '123456789123456789123',
		cliente_origen: {
			id: 'mock-rem-1',
			nombre_completo: 'JHONATAN FLORES',
			cedula: 'N/A',
			telefono: '4706230710',
			numero_celular: '4706230710',
			email: '',
			direccion_1: '48 BROCLYN CHASE JEFFERSON GA 30549 USA',
			ciudad: 'JEFFERSON',
			estado: 'GA',
			codigo_postal: '30549'
		},
		cliente_destino: {
			id: 'mock-des-1',
			nombre_completo: 'ANGELICA CASILDO',
			cedula: 'N/A',
			telefono: '3141475199',
			numero_celular: '3141475199',
			email: '',
			direccion_1: 'LAGUNA DE TORONTO SN EL NARANJO MANZANILLO COLIMA 28868 MEX',
			ciudad: 'MANZANILLO',
			estado: 'COLIMA',
			codigo_postal: '28868'
		},
		pais_destino: {
			id: 1,
			nombre: 'México',
			codigo_iso2: 'MX',
			codigo_iso3: 'MEX',
			limite_peso: 150
		},
		proveedor: {
			id: 1,
			nombre: 'PRINCIPAL',
			tiene_api: false,
			direccion: 'Plaza Las Américas Lilburn GA'
		},
		vendedor: {
			id: 'mock-vend-1',
			nombre_completo: 'PRINCIPAL',
			email: 'operaciones@hhworldgroup.com'
		},
		producto: {
			id: 1,
			codigo: 'BOX-MED',
			descripcion: 'CAJA ESTÁNDAR 14X14X14',
			atributos_valores: {},
			tipo_producto: {
				id: 1,
				nombre: 'Carga General'
			}
		},
		articulos_registrados: [
			{ id: 1, venta_id: 1042, nombre: 'ALMOHADAS', cantidad: 1, valor_total: 20.0, created_at: '' }
		],
		pagos_registrados: [],
		cargos_descuentos_aplicados: [
			{ id: 1, venta_id: 1042, nombre: 'Herramientas / Tools', tipo: 'cargo', monto: 25.0, created_at: '' },
			{ id: 2, venta_id: 1042, nombre: 'Empaque / Wrap', tipo: 'cargo', monto: 15.0, created_at: '' },
			{ id: 3, venta_id: 1042, nombre: 'Reempaque / Aditional Wrap', tipo: 'cargo', monto: 25.0, created_at: '' }
		]
	};

	const mockConfig: any = {
		id: 1,
		nombre_empresa: 'H&H WORLD GROUP',
		eslogan: 'MERCADERÍA Y PAQUETERÍA A TU MEDIDA',
		direccion_empresa: 'Plaza Las Américas: 733 Pleasant Hill Rd. Ste 1100 Lilburn, GA, 30047',
		telefono_empresa: '4706230710',
		email_empresa: 'info@hhworldgroup.com',
		logo_url: '/logo.png'
	};

	return renderDocumentTemplate(templateHtml, mockVenta, mockConfig);
}

export const PICKING_LIST_TEMPLATE_HTML = `<div class="picking-doc-wrapper font-sans text-black" style="font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; width: 100%;">
  <!-- PÁGINA 1 -->
  <div class="picking-sheet sheet-page-1" style="width: 8.5in; min-height: 11in; padding: 0.42in 0.48in; box-sizing: border-box; background: #ffffff; margin: 0 auto 20px auto; border: 1px solid #000;">
    <!-- Encabezado Superior -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
      <div style="width: 35%; font-size: 9.5px; line-height: 1.35; color: #1e293b;">
        Plaza Las Américas: 733 Pleasant Hill Rd. Ste 1100 Lilburn,<br>
        GA, 30047
      </div>
      <div style="width: 30%; text-align: center;">
        <img src="/logo.png" alt="H&H WORLD GROUP" style="height: 72px; display: inline-block; object-fit: contain;" />
      </div>
      <div style="width: 35%; text-align: right; font-size: 11px; font-weight: bold; color: #000; padding-top: 36px;">
        www.hhworldgroup.com
      </div>
    </div>

    <!-- Subencabezado: Solicitud a domicilio -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
      <div style="font-size: 10.5px; font-weight: bold; color: #000; letter-spacing: 0.2px;">
        SOLICITE SU RECOLECCIÓN A DOMICILIO
      </div>
    </div>

    <!-- Título Central -->
    <div style="font-size: 12px; font-weight: bold; letter-spacing: 0.5px; margin: 6px 0 10px 0; text-transform: uppercase; text-align: center; color: #000;">
      LISTA DE EMPAQUE / PACKING LIST
    </div>

    <!-- Bloque Remitente / Shipper & Destinatario / Consignee -->
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 9px; margin-bottom: 6px;">
      <tbody>
        <tr>
          <td style="width: 13.5%; border: 1px solid #000; font-weight: bold; vertical-align: top; padding: 6px 4px; line-height: 1.3;">
            Remitente / Shipper
          </td>
          <td style="width: 36.5%; border: 1px solid #000; vertical-align: top; padding: 3px 5px; line-height: 1.35;">
            <div style="display: flex; margin-bottom: 2px;">
              <span style="font-weight: bold; width: 68px; flex-shrink: 0;">NOMBRE</span>
              <span style="font-weight: normal; text-transform: uppercase;">{{remitente_nombre}}</span>
            </div>
            <div style="display: flex; margin-bottom: 2px;">
              <span style="font-weight: bold; width: 68px; flex-shrink: 0;">DIRECCIÓN</span>
              <span style="text-transform: uppercase;">{{remitente_direccion}}</span>
            </div>
            <div style="display: flex; margin-bottom: 2px;">
              <span style="font-weight: bold; width: 68px; flex-shrink: 0;">E-MAIL</span>
              <span>{{remitente_email}}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: bold; width: 68px; flex-shrink: 0;">TELÉFONO</span>
              <span>{{remitente_telefono}}</span>
            </div>
          </td>
          <td style="width: 13.5%; border: 1px solid #000; font-weight: bold; vertical-align: top; padding: 6px 4px; line-height: 1.3;">
            Destinatario /<br>Consignee
          </td>
          <td style="width: 36.5%; border: 1px solid #000; vertical-align: top; padding: 3px 5px; line-height: 1.35;">
            <div style="display: flex; margin-bottom: 2px;">
              <span style="font-weight: bold; width: 68px; flex-shrink: 0;">NOMBRE</span>
              <span style="font-weight: normal; text-transform: uppercase;">{{consignatario_nombre}}</span>
            </div>
            <div style="display: flex; margin-bottom: 2px;">
              <span style="font-weight: bold; width: 68px; flex-shrink: 0;">DIRECCIÓN</span>
              <span style="text-transform: uppercase;">{{consignatario_direccion}}</span>
            </div>
            <div style="display: flex; margin-bottom: 2px;">
              <span style="font-weight: bold; width: 68px; flex-shrink: 0;">E-MAIL</span>
              <span>{{consignatario_email}}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: bold; width: 68px; flex-shrink: 0;">TELÉFONO</span>
              <span>{{consignatario_telefono}}</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Fila Operativa -->
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 9px; text-align: center; margin-bottom: 6px;">
      <thead>
        <tr style="border-bottom: 1px solid #000;">
          <th style="width: 33.33%; border: 1px solid #000; padding: 3px; font-weight: bold;">Agente / Agent</th>
          <th style="width: 33.33%; border: 1px solid #000; padding: 3px; font-weight: bold;">Fecha / Date</th>
          <th style="width: 33.34%; border: 1px solid #000; padding: 3px; font-weight: bold;">Código de rastreo / Tracking number</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #000; padding: 3.5px; text-transform: uppercase;">{{packer_operador}}</td>
          <td style="border: 1px solid #000; padding: 3.5px;">{{fecha_hora_emision}}</td>
          <td style="border: 1px solid #000; padding: 3.5px; font-family: monospace; font-size: 10px;">{{codigo_venta}}</td>
        </tr>
      </tbody>
    </table>

    <!-- Tabla Mercancía -->
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 9px; margin-bottom: 6px;">
      <thead>
        <tr style="border-bottom: 1px solid #000;">
          <th style="width: 25%; border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">Cantidad / Quantity</th>
          <th style="width: 50%; border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">Descripción de mercancía / Merchandise description</th>
          <th style="width: 25%; border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">Valor / Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border-left: 1px solid #000; border-right: 1px solid #000; padding: 3px 6px; text-align: center;">1</td>
          <td style="border-left: 1px solid #000; border-right: 1px solid #000; padding: 3px 6px; text-align: center; text-transform: uppercase;">ALMOHADAS</td>
          <td style="border-left: 1px solid #000; border-right: 1px solid #000; padding: 3px 6px; text-align: right; padding-right: 16px;">20</td>
        </tr>
        <tr>
          <td style="border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; height: 16px;"></td>
          <td style="border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; height: 16px;"></td>
          <td style="border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; height: 16px;"></td>
        </tr>
        <tr>
          <td colspan="2" style="border: 1px solid #000; padding: 4px 12px; text-align: right; font-weight: bold;">Total factura / Invoice total</td>
          <td style="border: 1px solid #000; padding: 4px 12px; text-align: right; font-weight: bold;">\${{monto_total}}</td>
        </tr>
      </tbody>
    </table>

    <!-- Tabla Dimensiones -->
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 8.5px; text-align: center; margin-bottom: 7px;">
      <thead>
        <tr style="border-bottom: 1px solid #000;">
          <th style="width: 20%; border: 1px solid #000; padding: 3px 2px; font-weight: bold;">PESO / WEIGHT (LBS.)</th>
          <th style="width: 20%; border: 1px solid #000; padding: 3px 2px; font-weight: bold;">LARGO / LENGTH (IN.)</th>
          <th style="width: 20%; border: 1px solid #000; padding: 3px 2px; font-weight: bold;">ALTO / HEIGHT (IN.)</th>
          <th style="width: 20%; border: 1px solid #000; padding: 3px 2px; font-weight: bold;">ANCHO / WIDTH (IN.)</th>
          <th style="width: 20%; border: 1px solid #000; padding: 3px 2px; font-weight: bold;">PESO VOL / VOL. WT.</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #000; padding: 3.5px; font-size: 9.5px;">{{peso_facturable}}</td>
          <td style="border: 1px solid #000; padding: 3.5px; font-size: 9.5px;">{{dimension_largo}}</td>
          <td style="border: 1px solid #000; padding: 3.5px; font-size: 9.5px;">{{dimension_alto}}</td>
          <td style="border: 1px solid #000; padding: 3.5px; font-size: 9.5px;">{{dimension_ancho}}</td>
          <td style="border: 1px solid #000; padding: 3.5px; font-size: 9.5px;">{{peso_volumetrico}}</td>
        </tr>
      </tbody>
    </table>

    <!-- Desglose Financiero -->
    <div style="display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 8px; line-height: 1.45;">
      <div style="width: 58%;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Peso total / Total weight &nbsp;&nbsp;<strong>{{peso_facturable}}</strong> &nbsp;Lbs. x $ <strong>\${{monto_base}}</strong></span>
          <span style="padding-right: 24px;">= $</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Seguro / Insurance (opcional / optional) Caja / Box &nbsp;<strong>\${{valor_declarado}}</strong> &nbsp;x {{porcentaje_seguro}}% TV &nbsp;<strong>$0.00</strong> &nbsp;x 10%</span>
          <span style="padding-right: 24px;">= $</span>
        </div>
        <table style="width: 200px; border-collapse: collapse; border: 1px solid #000; text-align: center; font-size: 8.5px; margin-top: 6px;">
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="width: 50%; border: 1px solid #000; padding: 2.5px; font-weight: bold;">EFECTIVO / CASH</th>
              <th style="width: 50%; border: 1px solid #000; padding: 2.5px; font-weight: bold;">TARJETA / CARD</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #000; padding: 2.5px;">\${{pago_efectivo}}</td>
              <td style="border: 1px solid #000; padding: 2.5px;">\${{pago_tarjeta}}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="width: 40%; text-align: right;">
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 1.5px;">
          <span>= $</span>
          <span style="width: 62px; text-align: right;">\${{monto_base}}</span>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 1.5px;">
          <span>= $</span>
          <span style="width: 62px; text-align: right;">\${{monto_seguro}}</span>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 1.5px;">
          <span>Caja / Box = $</span>
          <span style="width: 62px; text-align: right;">\${{monto_caja}}</span>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 1.5px;">
          <span>Herramientas / Tools = $</span>
          <span style="width: 62px; text-align: right;">\${{monto_herramientas}}</span>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 1.5px;">
          <span>Cargos Adicionales / Aditional Chargers = $</span>
          <span style="width: 62px; text-align: right;">\${{monto_otros_cargos}}</span>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 1.5px;">
          <span>Empaque / Wrap = $</span>
          <span style="width: 62px; text-align: right;">\${{monto_empaque}}</span>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 1.5px;">
          <span>Reempaque / Aditional Wrap = $</span>
          <span style="width: 62px; text-align: right;">\${{monto_reempaque}}</span>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 3px; padding-top: 2px; border-top: 1px solid #d1d5db; font-weight: bold;">
          <span>Pago Total / Total Payment = $</span>
          <span style="width: 62px; text-align: right;">\${{monto_total}}</span>
        </div>
      </div>
    </div>

    <!-- Condiciones Generales P1 -->
    <div style="font-size: 7px; line-height: 1.32; color: #1a1a1a; text-align: justify; margin-top: 8px; margin-bottom: 16px;">
      <p style="font-weight: bold; margin: 0 0 2px 0;">CONDICIONES GENERALES DEL ENVÍO</p>
      <p style="margin: 0 0 5px 0;">
        Conozco y estoy de acuerdo con las condiciones para el envío de artículos a través de H&amp;H WORLD GROUP LLC. El envío de armas de cualquier tipo incluidas las de fuego, municiones, bebidas alcohólicas, líquidos corrosivos/flamables documentos ilegales, animales vivos o muertos, pieles exóticas, artículos perecederos, joyería, valores y cualquier otro artículo restringido por la Asociación Internacional de Transporte (IATA) está estrictamente prohibido. El seguro adicional cubre hasta un 80% del bien afectado, siempre y cuando se cumpla con los requisitos que exige la aseguradora. El seguro opcional es del 7% o 10% del valor declarado. Es para artículos nuevos. Si usted no adquiere el seguro opcional, en caso de pérdida o daño H&amp;H WORLD GROUP LLC no será responsable de reembolsar ningún importe al cliente. Los gastos de flete no son reembolsables bajo ninguna circunstancia. Conozco y estoy de acuerdo con las condiciones y la responsabilidad por el contenido de los artículos dentro del envío a través de H&amp;H WORLD GROUP LLC. Todos los envíos están sujetos a inspección por parte de H&amp;H WORLD GROUP LLC o de las autoridades aduanales.
      </p>
      <p style="font-weight: bold; margin: 0 0 2px 0;">GENERAL TERMS OF DELIVERY</p>
      <p style="margin: 0;">
        I do understand H&amp;H WORLD GROUP LLC shipping terms and conditions. Sending firearms, any type of weapons, ammunition, alcoholic beverages, corrosive/flammable liquids, illegal documents, live/dead animals, exotic leathers, perishable items, jewelry, values and any other forbidden items by IATA it is prohibited without exception. The additional insurance covers up to 80% of the affected items, as long as the requirements demanded by the insurer are met. The optional 7% or 10% insurance is of the declared value. Is for new items if you do not purchase the optional insurance, in case of loss or damage H&amp;H WORLD GROUP LLC will not be responsible for refunding any amount to the customer. Freight costs are not refundable under any circumstances. I understand, accept, and agree to the terms and conditions where I am responsible for the content in the shipments I made through H&amp;H WORLD GROUP LLC. For all shipments received at H&amp;H WORLD GROUP LLC, the customs authorities might review and in case of violation confiscate the shipment. It is also in our rights to inspect and review the content of the shipments.
      </p>
    </div>

    <!-- Firmas P1 -->
    <div style="display: flex; justify-content: space-between; font-size: 8.5px; text-align: center; margin-top: 12px;">
      <div style="width: 44%;">
        <div style="border-bottom: 1px solid #000; height: 18px; margin-bottom: 4px;"></div>
        <div>Firma del cliente / Customer's signature</div>
      </div>
      <div style="width: 44%;">
        <div style="border-bottom: 1px solid #000; height: 18px; margin-bottom: 4px;"></div>
        <div>No quiero seguro adicional / No additional insurance requested</div>
      </div>
    </div>
    <div style="text-align: center; font-size: 8px; font-weight: bold; color: #000; margin-top: 8px;">
      * Por favor firme como se muestra en su identificación / Please sign as shown on your Identification
    </div>
  </div>

  <!-- PÁGINA 2 -->
  <div class="picking-sheet sheet-page-2" style="width: 8.5in; min-height: 11in; padding: 0.55in 0.48in; box-sizing: border-box; background: #ffffff; margin: 0 auto; border: 1px solid #000; page-break-before: always; break-before: page;">
    <div style="font-size: 8.5px; line-height: 1.42; color: #111; text-align: left;">
      <p style="font-weight: bold; font-size: 9px; margin-bottom: 8px;">
        Al momento de realizar su envío, usted declara conocer y acepta las siguientes condiciones:
      </p>
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>SI NO ASEGURO SU CAJA EN CASO DE PÉRDIDA O DAÑO EN SU ENVÍO H&amp;H WORLD GROUP LLC NO SERÁ RESPONSABLE DE REEMBOLSAR NINGÚN IMPORTE.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>LOS GASTOS DE ENVÍO NO SON REEMBOLSABLES BAJO NINGUNA CIRCUNSTANCIA.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>SE LE ENTREGARÁ UN CÓDIGO DE RASTREO CON EL QUE USTED PODRÁ RASTREAR SU PAQUETE. EL CLIENTE ES RESPONSABLE DE REALIZAR EL RASTREO DE SU CAJA.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>SI REQUIERE HACER ALGÚN CAMBIO EN LA INFORMACIÓN DE SU PAQUETE CUENTA CON 24 HORAS DESPUÉS QUE HACE SU ENVÍO EN NUESTRAS OFICINAS Y TIENE UN COSTO ADICIONAL DE $20.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>EN CASO DE DAÑOS, PÉRDIDAS, ROBOS O EXTRAVÍOS CON SEGURO USTED CUENTA CON 48 HORAS CONTINUAS DESDE QUE RECIBIÓ SU PAQUETE PARA COMUNICARSE O DIRIGIRSE A LA OFICINA DONDE REALIZÓ SU ENVÍO Y PROCESAR SU RECLAMO.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>LOS REQUISITOS PARA PROCESAR UN RECLAMO SON LOS SIGUIENTES: CUALQUIER DOCUMENTO DE IDENTIFICACIÓN DEL REMITENTE (LA MISMA DEBE ESTAR VIGENTE Y QUE CONTENGA LA FIRMA DEL CLIENTE), FACTURAS O COMPROBANTES DE COMPRA DEL BIEN AFECTADO, FOTOS DE LA CAJA QUE RECIBIÓ, FIRMAR UNA CARTA DE RECLAMO ELABORADA POR LA OFICINA DONDE REALIZÓ EL ENVÍO. DEBE CUMPLIR CON TODOS ESTOS REQUISITOS DE LO CONTRARIO NO PODRÁ SER PROCESADO SU RECLAMO.</span>
        </li>
      </ul>

      <p style="font-weight: bold; font-size: 9px; margin-top: 18px; margin-bottom: 8px;">
        Antes de realizar su envío usted debe saber:
      </p>

      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>LAS CAJAS NO PUEDEN PERDER SU FORMA CUADRADA, NO PUEDEN ESTAR ABULTADAS NI ROTAS.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>EL PESO MÁXIMO PERMITIDO SON 150 LIBRAS POR CAJA. NO SE COBRA SOBREPESO.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>DEBE REALIZAR UNA LISTA DETALLADA DE LO QUE VA DENTRO DE LA CAJA EN CANTIDAD, DESCRIPCIÓN Y VALOR. H&amp;H WORLD GROUP LLC NO SE HACE RESPONSABLE DE LOS ARTÍCULOS QUE NO ESTÉN DECLARADOS EN SU LISTA DE EMPAQUE, NI POR VALORES QUE NO CORRESPONDAN AL VALOR REAL DEL ARTÍCULO.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>NO SE HACEN CARGOS EXTRAS POR ENVIAR ARTÍCULOS NUEVOS O ELECTRÓNICOS.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>AL ENVIAR ARTÍCULOS NUEVOS Y DE VALOR ASEGÚRESE DE GUARDAR SUS RECIBOS O FACTURAS DE COMPRA, ES INDISPENSABLE PARA PODER ASEGURAR SU ENVÍO.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>AL ENVIAR ARTÍCULOS ELECTRÓNICOS Y DE VALOR DEBE TRAER LA CAJA ABIERTA YA QUE DICHOS ARTÍCULOS SON REVISADOS ANTES DE EFECTUAR EL ENVÍO.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>AL REALIZAR EL ENVÍO DE HERRAMIENTAS DEBE PAGAR UN FEE ADICIONAL, ESTE COBRO ES POR CAJA MÁS NO POR HERRAMIENTA. EL COBRO DEPENDERÁ DEL TAMAÑO DE SU CAJA.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>ASEGÚRESE DE NO ENVIAR NINGÚN ARTÍCULO PROHIBIDO COMO: ARMAS DE CUALQUIER TIPO, DINERO, JOYAS, PLANTAS Y ANIMALES VIVOS O MUERTOS, PRODUCTOS COMBUSTIBLES O INFLAMABLES, BEBIDAS ALCOHÓLICAS, MATERIAL PORNOGRÁFICO, MERCANCÍA FALSIFICADA, ESTUPEFACIENTES Y SUSTANCIAS PSICOTRÓPICAS, OBJETOS MAGNÉTICOS O RADIOACTIVOS, ENTRE OTROS.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>PARA SOLICITAR LA RECOLECCIÓN A DOMICILIO USTED DEBE COMUNICARSE AL XXXXXX. EL SERVICIO DE RECOLECCIÓN TIENE UN COSTO ADICIONAL.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>USTED PODRÁ ASEGURAR SUS ARTÍCULOS NUEVOS Y DE VALOR PAGANDO EL 7% DEL VALOR QUE DECLARE EN SU LISTA DE EMPAQUE Y LA ASEGURANZA LE REEMBOLSARÁ EN CASO DE RECLAMO HASTA EL 80% DEL VALOR DEL BIEN AFECTADO.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>USTED PUEDE ENVIAR ARTÍCULOS DE VIDRIO, CERÁMICA, CRISTAL O ALGÚN OTRO MATERIAL DELICADO BAJO SU RESPONSABILIDAD, ESTOS PRODUCTOS NO PUEDEN SER ASEGURADOS. USTED ES RESPONSABLE DEL EMBALAJE DE SU CAJA Y DE LOS ARTÍCULOS QUE ENVÍE, RECOMENDAMOS USAR PAPEL DE BURBUJAS PARA PROTEGER SUS ARTÍCULOS YA QUE H&amp;H WORLD GROUP LLC NO SE HACE RESPONSABLE DE LO QUE LLEGUEN QUEBRADO A SU DESTINO.</span>
        </li>
      </ul>
    </div>

    <!-- Firma P2 -->
    <div style="margin-top: 45px; text-align: center; font-size: 8.5px;">
      <div style="border-bottom: 1px solid #000; width: 65%; margin: 0 auto 6px auto; height: 20px;"></div>
      <div style="margin-bottom: 5px;">
        He leído y entiendo los "Términos y Condiciones" / I have read and understood the "Terms and Conditions"
      </div>
      <div style="font-size: 8px; font-weight: bold;">
        * Por favor firme como se muestra en su identificación / Please sign as shown on your Identification
      </div>
    </div>
  </div>
</div>`;


