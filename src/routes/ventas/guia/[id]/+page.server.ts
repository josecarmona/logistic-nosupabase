import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { VentaWithRelations, PlantillaDocumento, ConfiguracionGeneral } from '$lib/types/database';
import { generateQRCodeSVG } from '$lib/services/qrcode';
import { buildVentasPorCaja } from '$lib/services/documentTemplate';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.session) throw redirect(303, '/login');

	const { id } = params;
	const cajaParam = url.searchParams.get('caja') || 'ALL';

	const { data: venta, error: vErr } = await locals.supabase
		.from('ventas')
		.select(`
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
		`)
		.eq('id', id)
		.maybeSingle();

	if (vErr || !venta) {
		throw error(404, 'Operación de Venta no encontrada');
	}

	const { data: plantilla } = await locals.supabase
		.from('plantillas_documentos')
		.select('*')
		.eq('tipo', 'guia')
		.eq('activo', true)
		.order('es_default', { ascending: false })
		.limit(1)
		.maybeSingle();

	const { data: config } = await locals.supabase
		.from('configuraciones_generales')
		.select('*')
		.limit(1)
		.maybeSingle();

	let productosCatalog: any[] = [];
	if (venta.es_multiple_cajas && venta.cajas_detalle && venta.cajas_detalle.length > 0) {
		const { data: prods } = await locals.supabase
			.from('productos')
			.select('id, codigo, descripcion, atributos_valores, tipo_producto:tipos_producto(id, nombre)');
		productosCatalog = prods || [];
	}

	const documentosPorCaja = buildVentasPorCaja(venta as VentaWithRelations, productosCatalog);
	const qrSvg = generateQRCodeSVG(venta.codigo_venta || `VENTA-${venta.id}`, 160);

	return {
		venta: venta as VentaWithRelations,
		plantilla: (plantilla || null) as PlantillaDocumento | null,
		configuracion: (config || null) as ConfiguracionGeneral | null,
		qrSvg,
		documentosPorCaja,
		cajaParam
	};
};
