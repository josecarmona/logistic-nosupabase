// Sistema de roles y permisos.
// Enfoque aprobado: RLS de Supabase se usa sólo para el aislamiento base
// (admin acceso completo, cada usuario su propio perfil); la autorización
// fina por rol/entidad/menú se valida en la capa de aplicación (servidor).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { error } from '@sveltejs/kit';

// Códigos de permisos del sistema (entidad.operacion)
export const PERMISSIONS = {
	// Maestro de usuarios
	usuariosVer: 'usuarios.ver',
	usuariosCrear: 'usuarios.crear',
	usuariosEditar: 'usuarios.editar',
	usuariosDesactivar: 'usuarios.desactivar',
	usuariosAsignarRol: 'usuarios.asignar_rol',

	// Maestro de roles
	rolesVer: 'roles.ver',
	rolesCrear: 'roles.crear',
	rolesEditar: 'roles.editar',
	rolesDesactivar: 'roles.desactivar',
	rolesAsignarPermisos: 'roles.asignar_permisos',

	// Maestro de países
	paisesVer: 'paises.ver',
	paisesCrear: 'paises.crear',
	paisesEditar: 'paises.editar',
	paisesDesactivar: 'paises.desactivar',

	// Maestro de tipos de adquisición
	adquisicionesVer: 'adquisiciones.ver',
	adquisicionesCrear: 'adquisiciones.crear',
	adquisicionesEditar: 'adquisiciones.editar',
	adquisicionesDesactivar: 'adquisiciones.desactivar',

	// Unidades de Medida y Grupos
	unidadesVer: 'unidades.ver',
	unidadesCrear: 'unidades.crear',
	unidadesEditar: 'unidades.editar',
	unidadesDesactivar: 'unidades.desactivar',
	gruposUnidadesVer: 'grupos_unidades.ver',
	gruposUnidadesCrear: 'grupos_unidades.crear',
	gruposUnidadesEditar: 'grupos_unidades.editar',
	gruposUnidadesDesactivar: 'grupos_unidades.desactivar',

	// Zonas Logísticas
	zonasVer: 'zonas.ver',
	zonasCrear: 'zonas.crear',
	zonasEditar: 'zonas.editar',
	zonasDesactivar: 'zonas.desactivar',

	// Tiendas
	tiendasVer: 'tiendas.ver',
	tiendasCrear: 'tiendas.crear',
	tiendasEditar: 'tiendas.editar',
	tiendasDesactivar: 'tiendas.desactivar',

	// Clientes
	clientesVer: 'clientes.ver',
	clientesCrear: 'clientes.crear',
	clientesEditar: 'clientes.editar',
	clientesDesactivar: 'clientes.desactivar',

	// Tipos de Producto
	tiposProductoVer: 'tipos_producto.ver',
	tiposProductoCrear: 'tipos_producto.crear',
	tiposProductoEditar: 'tipos_producto.editar',
	tiposProductoDesactivar: 'tipos_producto.desactivar',

	// Productos
	productosVer: 'productos.ver',
	productosCrear: 'productos.crear',
	productosEditar: 'productos.editar',
	productosDesactivar: 'productos.desactivar',

	// Control de Inventario
	inventarioVer: 'inventario.ver',
	inventarioAdicionar: 'inventario.adicionar',
	inventarioAjustar: 'inventario.ajustar',

	// Tipos de Tarifa
	tiposTarifaVer: 'tipos_tarifa.ver',
	tiposTarifaCrear: 'tipos_tarifa.crear',
	tiposTarifaEditar: 'tipos_tarifa.editar',
	tiposTarifaDesactivar: 'tipos_tarifa.desactivar',

	// Tarifas de Ventas
	tarifasVer: 'tarifas.ver',
	tarifasCrear: 'tarifas.crear',
	tarifasEditar: 'tarifas.editar',
	tarifasDesactivar: 'tarifas.desactivar',

	// Conceptos de Pago
	conceptosPagoVer: 'conceptos_pago.ver',
	conceptosPagoCrear: 'conceptos_pago.crear',
	conceptosPagoEditar: 'conceptos_pago.editar',
	conceptosPagoDesactivar: 'conceptos_pago.desactivar',

	// Cargos y Descuentos
	cargosDescuentosVer: 'cargos_descuentos.ver',
	cargosDescuentosCrear: 'cargos_descuentos.crear',
	cargosDescuentosEditar: 'cargos_descuentos.editar',
	cargosDescuentosDesactivar: 'cargos_descuentos.desactivar',

	// Configuración General y Apariencia
	configuracionVer: 'configuracion.ver',
	configuracionEditar: 'configuracion.editar',

	// Maestro de Artículos
	articulosVer: 'articulos.ver',
	articulosCrear: 'articulos.crear',
	articulosEditar: 'articulos.editar',
	articulosDesactivar: 'articulos.desactivar',

	// Maestro de Proveedores
	proveedoresVer: 'proveedores.ver',
	proveedoresCrear: 'proveedores.crear',
	proveedoresEditar: 'proveedores.editar',
	proveedoresDesactivar: 'proveedores.desactivar',

	// Diseñador de Plantillas de Documentos
	plantillasDocumentosVer: 'plantillas_documentos.ver',
	plantillasDocumentosCrear: 'plantillas_documentos.crear',
	plantillasDocumentosEditar: 'plantillas_documentos.editar',
	plantillasDocumentosDesactivar: 'plantillas_documentos.desactivar',

	// Módulo de Ventas / Operaciones
	ventasVer: 'ventas.ver',
	ventasCrear: 'ventas.crear',
	ventasEditar: 'ventas.editar',
	ventasCobrar: 'ventas.cobrar',
	ventasAnular: 'ventas.anular',

	// Opciones de menú
	menuAdmin: 'menu.admin',
	menuConfiguracion: 'menu.configuracion',
	menuUsuarios: 'menu.usuarios',
	menuRoles: 'menu.roles',
	menuPaises: 'menu.paises',
	menuAdquisiciones: 'menu.adquisiciones',
	menuCatalogos: 'menu.catalogos',
	menuUnidades: 'menu.unidades',
	menuZonas: 'menu.zonas',
	menuTiendas: 'menu.tiendas',
	menuClientes: 'menu.clientes',
	menuProductos: 'menu.productos',
	menuTiposTarifa: 'menu.tipos_tarifa',
	menuTarifas: 'menu.tarifas',
	menuConceptosPago: 'menu.conceptos_pago',
	menuCargosDescuentos: 'menu.cargos_descuentos',
	menuVentas: 'menu.ventas',
	menuArticulos: 'menu.articulos',
	menuProveedores: 'menu.proveedores',
	menuPlantillasDocumentos: 'menu.plantillas_documentos',

	// Formularios / acciones
	formPerfil: 'form.perfil',
	formVenta: 'form.venta',
	accionEliminar: 'accion.eliminar',
	accionExportarCsv: 'accion.exportar_csv'
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ADMIN_ROLE = 'admin';

/**
 * Carga los permisos del perfil del usuario según sus roles.
 * El rol 'admin' tiene acceso a todos los permisos.
 * Devuelve un conjunto de códigos de permiso.
 */
export async function getUserPermissions(
	supabase: SupabaseClient<Database>,
	roleIds: number[]
): Promise<Set<string>> {
	if (roleIds.length === 0) return new Set();

	// 1) Obtener los ids de permisos asociados a los roles del usuario.
	const { data: rp } = await supabase.from('rol_permisos').select('permiso_id').in('rol_id', roleIds);
	if (!rp || rp.length === 0) return new Set();

	// 2) Obtener los códigos de esos permisos.
	const permisoIds = (rp as { permiso_id: number }[]).map((r) => r.permiso_id);
	const { data } = await supabase.from('permisos').select('codigo').in('id', permisoIds);

	const codes = new Set<string>();
	((data ?? []) as { codigo: string }[]).forEach((p) => {
		if (p.codigo) codes.add(p.codigo);
	});
	return codes;
}

/**
 * Clase de guard reutilizable para comprobar permisos en el lado del servidor.
 * Se construye con el perfil y sus roles.
 */
export class PermissionGuard {
	constructor(
		private readonly isAdmin: boolean,
		private readonly permissions: Set<string>,
		private readonly roleNames: string[]
	) {}

	/**
	 * Devuelve true si el usuario tiene el permiso indicado.
	 * El rol 'admin' siempre lo tiene.
	 */
	has(code: PermissionCode | string): boolean {
		if (this.isAdmin) return true;
		return this.permissions.has(code);
	}

	/**
	 * Exige que el usuario tenga un permiso concreto.
	 * Lanza HttpError 403 si no lo cumple.
	 */
	require(code: PermissionCode | string, message = 'No tienes permiso para realizar esta acción'): void {
		if (!this.has(code)) {
			throw error(403, { message });
		}
	}

	/**
	 * Exige que el usuario pertenezca a al menos uno de los roles indicados.
	 * Lanza HttpError 403 si no lo cumple.
	 */
	requireRole(roles: string[], message = 'Acceso denegado para tu rol'): void {
		if (this.isAdmin) return;
		const match = this.roleNames.some((r) => roles.includes(r));
		if (!match) {
			throw error(403, { message });
		}
	}
}

/**
 * Helper para construir una instancia de PermissionGuard para la petición actual.
 */
export async function buildGuard(
	supabase: SupabaseClient<Database>,
	roleIds: number[],
	roleNames: string[]
): Promise<PermissionGuard> {
	const isAdmin = roleNames.includes(ADMIN_ROLE);
	const permissions = isAdmin ? new Set<string>() : await getUserPermissions(supabase, roleIds);
	return new PermissionGuard(isAdmin, permissions, roleNames);
}
