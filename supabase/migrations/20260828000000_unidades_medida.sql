-- Migración: Tabla de Unidades de Medida y Vínculo con Países

-- 1. Tabla de unidades de medida (Peso, Volumen, Cantidad)
create table if not exists public.unidades_medida (
  id serial primary key,
  codigo varchar(20) not null unique,
  nombre varchar(100) not null,
  tipo varchar(20) not null check (tipo in ('peso', 'volumen', 'cantidad')),
  activo boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Habilitar RLS en unidades_medida
alter table public.unidades_medida enable row level security;

-- Políticas de RLS
create policy "Lectura pública de unidades para autenticados"
  on public.unidades_medida for select
  to authenticated
  using (true);

create policy "Administradores controlan unidades_medida"
  on public.unidades_medida for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 3. Añadir columna unidad_peso_id a la tabla de países si no existe
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'paises' 
    and column_name = 'unidad_peso_id'
  ) then
    alter table public.paises 
    add column unidad_peso_id integer references public.unidades_medida(id) on delete set null;
  end if;
end $$;

-- 4. Sembrar datos iniciales de unidades de medida
insert into public.unidades_medida (codigo, nombre, tipo, activo) values
  ('KG', 'KILOGRAMO', 'peso', true),
  ('LB', 'LIBRA', 'peso', true),
  ('G', 'GRAMO', 'peso', true),
  ('OZ', 'ONZA', 'peso', true),
  ('TN', 'TONELADA', 'peso', true),
  ('M3', 'METRO CÚBICO', 'volumen', true),
  ('FT3', 'PIE CÚBICO', 'volumen', true),
  ('L', 'LITRO', 'volumen', true),
  ('GAL', 'GALÓN', 'volumen', true),
  ('UND', 'UNIDAD', 'cantidad', true),
  ('CJ', 'CAJA', 'cantidad', true),
  ('PQT', 'PAQUETE', 'cantidad', true),
  ('PLT', 'PALLET', 'cantidad', true)
on conflict (codigo) do update set
  nombre = excluded.nombre,
  tipo = excluded.tipo;

-- 5. Vincular unidad de peso por defecto a los países existentes
-- EE.UU. (LB), Resto de Latinoamérica por defecto KILOGRAMO (KG)
update public.paises
set unidad_peso_id = (select id from public.unidades_medida where codigo = 'LB' limit 1)
where codigo_iso2 = 'US';

update public.paises
set unidad_peso_id = (select id from public.unidades_medida where codigo = 'KG' limit 1)
where codigo_iso2 != 'US' or codigo_iso2 is null;
