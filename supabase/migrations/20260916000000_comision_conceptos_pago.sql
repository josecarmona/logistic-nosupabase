-- Migración: Agregar porcentaje_comision a conceptos_pago y columnas de desglose a venta_pagos

-- 1. Columna porcentaje_comision en public.conceptos_pago
alter table public.conceptos_pago
  add column if not exists porcentaje_comision numeric(5, 2) not null default 0;

-- Asegurar restricción check
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'check_porcentaje_comision'
  ) then
    alter table public.conceptos_pago
      add constraint check_porcentaje_comision check (porcentaje_comision >= 0 and porcentaje_comision <= 100);
  end if;
end $$;

-- 2. Sembrar o actualizar 'TARJETA DE CRÉDITO' con 5% de comisión
insert into public.conceptos_pago (nombre, requiere_referencia, activo, porcentaje_comision)
values ('TARJETA DE CRÉDITO', true, true, 5.00)
on conflict (nombre) do update set
  porcentaje_comision = excluded.porcentaje_comision,
  requiere_referencia = excluded.requiere_referencia;

-- 3. Columnas en public.venta_pagos
alter table public.venta_pagos
  add column if not exists porcentaje_comision numeric(5, 2) not null default 0,
  add column if not exists monto_comision numeric(12, 2) not null default 0,
  add column if not exists monto_cobrado numeric(12, 2) not null default 0;

-- Actualizar registros anteriores donde monto_cobrado sea 0
update public.venta_pagos
set monto_cobrado = monto
where monto_cobrado = 0 and monto > 0;
