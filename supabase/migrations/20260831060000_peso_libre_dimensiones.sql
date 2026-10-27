-- Migración: Columnas para Peso Libre, Dimensiones de Caja y Peso Volumétrico en Ventas

alter table public.ventas
  add column if not exists peso_reportado numeric(10, 2) default 0 check (peso_reportado >= 0),
  add column if not exists alto numeric(10, 2) default 0 check (alto >= 0),
  add column if not exists ancho numeric(10, 2) default 0 check (ancho >= 0),
  add column if not exists largo numeric(10, 2) default 0 check (largo >= 0),
  add column if not exists peso_volumetrico numeric(10, 2) default 0 check (peso_volumetrico >= 0),
  add column if not exists peso_cobrar numeric(10, 2) default 0 check (peso_cobrar >= 0);
