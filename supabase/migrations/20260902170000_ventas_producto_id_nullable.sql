-- Migración: Hacer producto_id opcional (NULLABLE) en la tabla public.ventas para borradores de clientes
alter table public.ventas alter column producto_id drop not null;
