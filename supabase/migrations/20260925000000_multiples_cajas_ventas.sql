-- Migración: Soporte para despacho de múltiples cajas por venta y declaración de artículos por caja
-- Permite que un cliente despache varias cajas en una sola operación de venta

-- 1. Nuevas columnas en public.ventas para registrar control de múltiples cajas
alter table public.ventas add column if not exists es_multiple_cajas boolean not null default false;
alter table public.ventas add column if not exists total_cajas integer not null default 1;
alter table public.ventas add column if not exists cajas_detalle jsonb default '[]'::jsonb;

-- 2. Nueva columna en public.venta_articulos para asociar cada artículo a su caja correspondiente (ej. '001/003')
alter table public.venta_articulos add column if not exists caja_numero varchar(20) default '001/001';

-- Comentarios explicativos en el catálogo de base de datos
comment on column public.ventas.es_multiple_cajas is 'Indica si la venta contiene múltiples cajas o bultos';
comment on column public.ventas.total_cajas is 'Número total de cajas que componen el envío (ej. 3)';
comment on column public.ventas.cajas_detalle is 'Arreglo JSON con las especificaciones de cada caja (número 001/003, tipo tarifa, producto, peso, dimensiones, tarifa y costo base)';
comment on column public.venta_articulos.caja_numero is 'Identificador correlativo de la caja a la que pertenece el artículo dentro del envío (ej. 001/003)';
