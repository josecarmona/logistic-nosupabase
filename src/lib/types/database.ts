// Tipos de la base de datos (PostgreSQL en Supabase)
// Esquema: public

export type Roles = 'admin' | 'gerente' | 'operador' | 'cliente';

export interface GrupoUnidadMedida {
	id: number;
	codigo: string;
	nombre: string;
	descripcion: string | null;
	activo: boolean;
	created_at: string;
	updated_at: string;
}

export interface UnidadMedida {
	id: number;
	codigo: string;
	nombre: string;
	tipo?: string | null;
	grupo_id: number | null;
	grupo?: Pick<GrupoUnidadMedida, 'id' | 'codigo' | 'nombre'> | null;
	activo: boolean;
	created_at: string;
	updated_at: string;
}

export interface MaestroRol {
	id: number;
	nombre: string;
	descripcion: string | null;
	activo: boolean;
	created_at: string;
	updated_at: string;
}

export interface Permiso {
	id: number;
	codigo: string;
	descripcion: string;
	tipo: 'data' | 'menu' | 'form' | 'accion';
	created_at: string;
}

export interface RolPermiso {
	rol_id: number;
	permiso_id: number;
}

export interface Pais {
	id: number;
	nombre: string;
	codigo_iso2: string;
	codigo_iso3: string;
	limite_peso: number;
	capacidad_minima?: number;
	unidad_peso_id: number | null;
	activo: boolean;
	created_at: string;
	updated_at: string;
	unidad_peso?: Pick<UnidadMedida, 'id' | 'codigo' | 'nombre'> | null;
}

export interface TipoAdquisicion {
	id: number;
	nombre: string;
	activo: boolean;
	created_at: string;
	updated_at: string;
}

export interface Perfil {
	id: string;
	user_id: string | null;
	codigo: string | null;
	cedula?: string | null;
	email: string;
	password_visible?: string | null;
	nombre_completo: string;
	razon_social: string | null;
	direccion_1: string | null;
	direccion_2: string | null;
	pais_id: number | null;
	codigo_postal: string | null;
	ciudad: string | null;
	estado: string | null;
	municipio: string | null;
	numero_celular: string | null;
	telefono: string | null;
	tipo_adquisicion_id: number | null;
	referencia: string | null;
	rol_id: number | null;
	zona_id?: number | null;
	activo: boolean;
	created_at: string;
	updated_at: string;
}

export interface ProfileWithRelations extends Perfil {
	pais: Pick<Pais, 'id' | 'nombre' | 'codigo_iso2' | 'codigo_iso3'> | null;
	tipo_adquisicion: Pick<TipoAdquisicion, 'id' | 'nombre'> | null;
	rol: Pick<MaestroRol, 'id' | 'nombre'> | null;
}

export interface ConfiguracionCodigoPerfil {
	id: number;
	rol_id?: number | null;
	prefijo: string | null;
	sufijo: string | null;
	longitud_numero: number;
	consecutivo_actual: number;
	updated_at: string;
}

export interface ConfiguracionCodigoTienda {
	id: number;
	prefijo: string | null;
	sufijo: string | null;
	longitud_numero: number;
	consecutivo_actual: number;
	updated_at: string;
}

export interface Zona {
	id: number;
	nombre: string;
	descripcion: string | null;
	activo: boolean;
	created_at: string;
	updated_at: string;
}

export interface Tienda {
	id: number;
	numero_oficina: string;
	nombre: string;
	supervisor_id: string | null;
	email: string | null;
	telefono: string | null;
	celular: string | null;
	calle: string | null;
	otra_direccion: string | null;
	pais_id: number | null;
	codigo_postal: string | null;
	estado: string | null;
	ciudad: string | null;
	municipio: string | null;
	zona_id: number | null;
	activo: boolean;
	created_at: string;
	updated_at: string;
}

export interface TiendaWithRelations extends Tienda {
	supervisor: Pick<Perfil, 'id' | 'nombre_completo' | 'email'> | null;
	pais: Pick<Pais, 'id' | 'nombre'> | null;
	zona: Pick<Zona, 'id' | 'nombre'> | null;
}

export interface AtributoDefinicion {
	nombre: string;
	tipo: 'texto' | 'numero' | 'opciones';
	unidad_medida_id?: number | null;
	opciones?: string[];
	requerido: boolean;
}

export interface TipoProducto {
	id: number;
	nombre: string;
	prefijo: string;
	descripcion: string | null;
	consecutivo_actual: number;
	atributos: AtributoDefinicion[];
	activo: boolean;
	created_at: string;
	updated_at: string;
}

export interface Producto {
	id: number;
	codigo: string;
	descripcion: string;
	tipo_producto_id: number;
	costo: number;
	precio_venta?: number;
	inventario_minimo: number;
	stock?: number;
	carga_maxima?: number;
	unidad_medida_id: number | null;
	atributos_valores: Record<string, any>;
	controla_inventario: boolean;
	requiere_seguro: boolean;
	porcentaje_seguro: number;
	activo: boolean;
	created_at: string;
	updated_at: string;
}

export interface ProductoWithRelations extends Producto {
	tipo_producto: Pick<TipoProducto, 'id' | 'nombre' | 'prefijo' | 'atributos'> | null;
	unidad_medida: Pick<UnidadMedida, 'id' | 'codigo' | 'nombre'> | null;
}

export interface InventarioMovimiento {
	id: number;
	producto_id: number;
	tipo_movimiento: 'entrada' | 'salida' | 'ajuste';
	cantidad: number;
	stock_anterior: number;
	stock_nuevo: number;
	referencia: string | null;
	motivo: string | null;
	operador_id: string | null;
	created_at: string;
}

export interface InventarioMovimientoWithRelations extends InventarioMovimiento {
	producto?: Pick<Producto, 'id' | 'codigo' | 'descripcion' | 'unidad_medida_id'> | null;
	operador?: Pick<Perfil, 'id' | 'nombre_completo' | 'email'> | null;
}

export interface TipoTarifa {
	id: number;
	nombre: string;
	promocion: boolean;
	numero_productos: number;
	activo: boolean;
	created_at: string;
	updated_at: string;
}

export interface Tarifa {
	id: number;
	tipo_tarifa_id: number;
	pais_id: number;
	zona_id: number;
	producto_id: number;
	precio: number;
	tipo_calculo?: 'unica' | 'peso';
	es_por_peso?: boolean;
	descripcion?: string | null;
	activo: boolean;
	created_at: string;
	updated_at: string;
}

export interface TarifaWithRelations extends Tarifa {
	tipo_tarifa: Pick<TipoTarifa, 'id' | 'nombre' | 'promocion' | 'numero_productos'> | null;
	pais: Pick<Pais, 'id' | 'nombre' | 'codigo_iso2'> | null;
	zona: Pick<Zona, 'id' | 'nombre'> | null;
	producto: Pick<Producto, 'id' | 'codigo' | 'descripcion' | 'costo'> | null;
}

export interface ConceptoPago {
	id: number;
	nombre: string;
	requiere_referencia: boolean;
	porcentaje_comision: number;
	activo: boolean;
	created_at: string;
	updated_at: string;
}

export interface CargoDescuento {
	id: number;
	nombre: string;
	tipo: 'cargo' | 'descuento';
	monto_defecto: number;
	es_porcentaje: boolean;
	activo: boolean;
	created_at: string;
	updated_at: string;
}

export interface ProveedorDireccion {
	id: number;
	proveedor_id: number;
	titulo: string;
	direccion: string;
	ciudad?: string | null;
	estado?: string | null;
	telefono?: string | null;
	es_principal: boolean;
	activo: boolean;
	created_at?: string;
	updated_at?: string;
}

export interface Proveedor {
	id: number;
	nombre: string;
	tiene_api: boolean;
	direccion?: string | null;
	activo: boolean;
	paises_atendidos?: Pick<Pais, 'id' | 'nombre' | 'codigo_iso2' | 'codigo_iso3'>[];
	direcciones?: ProveedorDireccion[];
	created_at: string;
	updated_at: string;
}

export interface Venta {
	id: number;
	codigo_venta: string;
	cliente_origen_id: string;
	cliente_destino_id: string;
	producto_id: number;
	tarifa_id?: number | null;
	pais_destino_id: number;
	zona_id: number;
	peso: number;
	peso_reportado?: number | null;
	alto?: number | null;
	ancho?: number | null;
	largo?: number | null;
	peso_volumetrico?: number | null;
	peso_cobrar?: number | null;
	requiere_seguro: boolean;
	valor_declarado: number;
	porcentaje_seguro_aplicado: number;
	monto_seguro: number;
	monto_base: number;
	monto_subtotal: number;
	monto_total_cargos: number;
	monto_total_descuentos: number;
	monto_total: number;
	monto_pagado: number;
	estatus_venta: 'borrador' | 'realizada' | 'anulada';
	estatus_pago: 'pendiente' | 'parcial' | 'pagada';
	tipo_entrega?: 'domicilio' | 'oficina';
	proveedor_id?: number | null;
	direccion_entrega?: string | null;
	guia_proveedor?: string | null;
	url_documento_proveedor?: string | null;
	es_multiple_cajas?: boolean;
	total_cajas?: number;
	cajas_detalle?: CajaDetalle[];
	descontar_inventario?: boolean;
	tipo_operacion?: 'envio' | 'venta_cajas';
	operador_id?: string | null;
	created_at: string;
	updated_at: string;
}

export interface CajaDetalle {
	numero: string; // ej. '001/003'
	indice: number; // 1, 2, 3...
	tipo_tarifa_id: string;
	tipo_tarifa_nombre?: string;
	producto_id: string;
	producto_codigo?: string;
	producto_descripcion?: string;
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
}

export interface VentaCargoDescuento {
	id: number;
	venta_id: number;
	cargo_descuento_id?: number | null;
	nombre: string;
	tipo: 'cargo' | 'descuento';
	monto: number;
	es_porcentaje?: boolean;
	porcentaje?: number;
	created_at: string;
}

export interface VentaPago {
	id: number;
	venta_id: number;
	concepto_pago_id?: number | null;
	concepto_nombre: string;
	monto: number;
	porcentaje_comision?: number;
	monto_comision?: number;
	monto_cobrado?: number;
	referencia?: string | null;
	created_at: string;
}

export interface Articulo {
	id: number;
	nombre: string;
	activo: boolean;
	created_at: string;
	updated_at: string;
}

export interface VentaArticulo {
	id: number;
	venta_id: number;
	articulo_id?: number | null;
	nombre: string;
	cantidad: number;
	valor_total: number;
	caja_numero?: string; // ej. '001/003'
	created_at: string;
}

export interface VentaWithRelations extends Venta {
	cliente_origen: Pick<Perfil, 'id' | 'nombre_completo' | 'email' | 'codigo' | 'cedula' | 'telefono' | 'numero_celular' | 'direccion_1' | 'ciudad' | 'estado' | 'codigo_postal'> | null;
	cliente_destino: Pick<Perfil, 'id' | 'nombre_completo' | 'email' | 'codigo' | 'cedula' | 'telefono' | 'numero_celular' | 'direccion_1' | 'ciudad' | 'estado' | 'codigo_postal'> | null;
	producto: (Pick<Producto, 'id' | 'codigo' | 'descripcion' | 'atributos_valores' | 'carga_maxima'> & { tipo_producto?: Pick<TipoProducto, 'id' | 'nombre'> | null }) | null;
	pais_destino: Pick<Pais, 'id' | 'nombre' | 'codigo_iso2' | 'codigo_iso3' | 'limite_peso'> | null;
	zona: Pick<Zona, 'id' | 'nombre'> | null;
	vendedor?: Pick<Perfil, 'id' | 'nombre_completo' | 'email'> | null;
	tarifa?: Pick<Tarifa, 'id' | 'precio'> | null;
	proveedor?: Pick<Proveedor, 'id' | 'nombre' | 'tiene_api' | 'direccion'> | null;
	cargos_descuentos_aplicados?: VentaCargoDescuento[];
	pagos_registrados?: VentaPago[];
	articulos_registrados?: VentaArticulo[];
}

export interface ConfiguracionGeneral {
	id: number;
	nombre_empresa: string;
	eslogan?: string | null;
	identificacion_fiscal?: string | null;
	direccion_empresa?: string | null;
	telefono_empresa?: string | null;
	email_empresa?: string | null;
	logo_url?: string | null;
	logo_dark_url?: string | null;
	favicon_url?: string | null;
	color_primary: string;
	color_primary_foreground: string;
	color_accent: string;
	color_accent_foreground: string;
	sidebar_theme: string;
	border_radius: string;
	moneda_nombre: string;
	moneda_simbolo: string;
	moneda_iso: string;
	pie_pagina_ticket?: string | null;
	terminos_condiciones?: string | null;
	created_at: string;
	updated_at: string;
}

export interface PlantillaDocumento {
	id: number;
	nombre: string;
	tipo: 'guia' | 'picking' | 'factura' | 'declaracion_aduana' | 'etiqueta' | 'personalizado';
	encabezado_titulo?: string | null;
	contenido_html: string;
	recomendaciones_aduana?: string | null;
	roles_permitidos: string[];
	orientation?: 'portrait' | 'landscape';
	paper_size?: 'letter' | 'a4' | 'a5' | 'legal' | 'thermal_80mm' | 'thermal_58mm' | 'ticket' | 'label_4x6';
	es_default: boolean;
	activo: boolean;
	created_at: string;
	updated_at: string;
}

export interface TicketSoporte {
	id: number;
	codigo: string;
	tipo: 'falla' | 'requerimiento' | 'mejora';
	titulo: string;
	descripcion: string;
	modulo_afectado: string;
	prioridad: 'baja' | 'media' | 'alta' | 'critica';
	estatus: 'abierto' | 'en_revision' | 'en_progreso' | 'resuelto' | 'cerrado';
	usuario_reporta_id?: string | null;
	asignado_a_id?: string | null;
	captura_url?: string | null;
	respuesta_soporte?: string | null;
	fecha_resolucion?: string | null;
	created_at: string;
	updated_at: string;
	usuario_reporta?: Pick<Perfil, 'id' | 'nombre_completo' | 'email' | 'codigo'> | null;
	asignado_a?: Pick<Perfil, 'id' | 'nombre_completo' | 'email'> | null;
}

export type Database = any;
