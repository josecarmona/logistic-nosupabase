import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { VentaWithRelations, PlantillaDocumento, ConfiguracionGeneral } from '$lib/types/database';
import { getRolesForUser } from '$lib/server/auth';
import { renderDocumentTemplate, buildVentasPorCaja } from '$lib/services/documentTemplate';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.session || !locals.user) throw redirect(303, '/login');

	const { plantilla_id, venta_id } = params;
	const cajaParam = url.searchParams.get('caja') || 'ALL';

	// Verificar roles del usuario
	const userRoles = await getRolesForUser(locals, locals.user);
	const isAllowed = userRoles.includes('admin') || userRoles.includes('gerente') || userRoles.includes('operador') || userRoles.includes('cliente');
	if (!isAllowed) throw redirect(303, '/login');

	// Cargar la plantilla de documento solicitada
	const { data: plantilla, error: pErr } = await locals.supabase
		.from('plantillas_documentos')
		.select('*')
		.eq('id', plantilla_id)
		.maybeSingle();

	if (pErr || !plantilla) {
		throw error(404, 'Plantilla de documento no encontrada');
	}

	// Validar permisos por rol en la plantilla
	if (plantilla.roles_permitidos && plantilla.roles_permitidos.length > 0) {
		const hasRoleAccess = plantilla.roles_permitidos.some((r: string) => userRoles.includes(r));
		if (!hasRoleAccess) {
			throw error(403, 'No tienes permisos asignados por el administrador para imprimir este formato de documento');
		}
	}

	// Cargar la venta con todas sus relaciones operativas y financieras
	const { data: venta, error: vErr } = await locals.supabase
		.from('ventas')
		.select(`
			*,
			cliente_origen:profiles!cliente_origen_id(id, nombre_completo, email, codigo, cedula, telefono, numero_celular, direccion_1, ciudad, estado, codigo_postal, pais:paises(id, nombre, codigo_iso2, codigo_iso3)),
			cliente_destino:profiles!cliente_destino_id(id, nombre_completo, email, codigo, cedula, telefono, numero_celular, direccion_1, ciudad, estado, codigo_postal, pais:paises(id, nombre, codigo_iso2, codigo_iso3)),
			producto:productos(id, codigo, descripcion, atributos_valores, tipo_producto:tipos_producto(id, nombre)),
			pais_destino:paises(id, nombre, codigo_iso2, codigo_iso3, limite_peso),
			zona:zonas(id, nombre),
			proveedor:proveedores(id, nombre, tiene_api, direccion),
			cargos_descuentos_aplicados:venta_cargos_descuentos(*),
			pagos_registrados:venta_pagos(*),
			articulos_registrados:venta_articulos(*)
		`)
		.eq('id', venta_id)
		.maybeSingle();

	if (vErr || !venta) {
		throw error(404, 'Operación de Venta no encontrada');
	}

	// Si es cliente, validar que la venta le pertenezca
	const isClienteOnly = userRoles.includes('cliente') && !userRoles.includes('admin') && !userRoles.includes('gerente') && !userRoles.includes('operador');
	if (isClienteOnly && venta.cliente_origen_id !== locals.user.id) {
		throw error(403, 'No tienes acceso a esta orden de venta');
	}

	// Cargar configuración general
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

	const configTyped = (config || null) as ConfiguracionGeneral | null;
	const documentosPorCaja = buildVentasPorCaja(venta as VentaWithRelations, productosCatalog).map((doc) => ({
		...doc,
		renderedHtml: renderDocumentTemplate(plantilla.contenido_html || '', doc.venta, configTyped)
	}));

	const renderedHtml = documentosPorCaja[0]?.renderedHtml || renderDocumentTemplate(
		plantilla.contenido_html || '',
		venta as VentaWithRelations,
		configTyped
	);

	return {
		plantilla: plantilla as PlantillaDocumento,
		venta: venta as VentaWithRelations,
		configuracion: configTyped,
		renderedHtml,
		documentosPorCaja,
		cajaParam
	};
};
