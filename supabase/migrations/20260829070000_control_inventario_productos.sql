-- Migración: Agregar columna controla_inventario a la tabla productos

alter table public.productos
  add column if not exists controla_inventario boolean not null default true;

comment on column public.productos.controla_inventario is 'Indica si el producto requiere control de stock e inventario mínimo';
