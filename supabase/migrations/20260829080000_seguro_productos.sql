-- Migración: Agregar campos requiere_seguro y porcentaje_seguro a la tabla productos

alter table public.productos
  add column if not exists requiere_seguro boolean not null default false,
  add column if not exists porcentaje_seguro numeric(5, 2) not null default 0;

comment on column public.productos.requiere_seguro is 'Indica si el producto requiere o puede aplicar seguro de envío/carga';
comment on column public.productos.porcentaje_seguro is 'Porcentaje (%) del valor declarado requerido para el cálculo de la prima de seguro';
