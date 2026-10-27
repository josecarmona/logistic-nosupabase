-- Migración: Soporte de cálculo porcentual en cargos y descuentos de ventas
-- Permite registrar si un cargo o descuento se aplicó como porcentaje del valor base o monto fijo absoluto.

alter table public.venta_cargos_descuentos
  add column if not exists es_porcentaje boolean not null default false,
  add column if not exists porcentaje numeric(5, 2) not null default 0;

comment on column public.venta_cargos_descuentos.es_porcentaje is 'Indica si el cargo o descuento fue calculado como porcentaje del valor base';
comment on column public.venta_cargos_descuentos.porcentaje is 'Porcentaje del valor base aplicado (si es_porcentaje = true)';
