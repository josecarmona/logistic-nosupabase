-- Migración: Codificación Consecutiva Secuencial para Perfiles

-- 1. Tabla de configuración del código de perfiles
create table if not exists public.configuracion_codigo_perfil (
  id serial primary key,
  prefijo varchar(10) not null default 'CLI',
  sufijo varchar(10) not null default 'MX',
  consecutivo_actual integer not null default 0,
  updated_at timestamptz default now()
);

-- RLS en configuracion_codigo_perfil
alter table public.configuracion_codigo_perfil enable row level security;

create policy "Lectura pública de configuración de código"
  on public.configuracion_codigo_perfil for select
  to authenticated
  using (true);

create policy "Administradores editan configuración de código"
  on public.configuracion_codigo_perfil for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 2. Registro inicial de configuración si no existe
insert into public.configuracion_codigo_perfil (prefijo, sufijo, consecutivo_actual)
select 'CLI', 'MX', 0
where not exists (select 1 from public.configuracion_codigo_perfil);

-- 3. Añadir columna 'codigo' a la tabla profiles
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'codigo'
  ) then
    alter table public.profiles add column codigo varchar(50) unique;
  end if;
end $$;

-- 4. Función atómica para generar el código consecutivo (PREFIJO-000001-SUFIJO)
create or replace function public.generar_codigo_perfil()
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_prefijo text;
  v_sufijo text;
  v_nuevo_num integer;
  v_codigo_final text;
begin
  -- Obtener y actualizar el consecutivo de forma atómica con bloqueo de fila
  select prefijo, sufijo, consecutivo_actual + 1
  into v_prefijo, v_sufijo, v_nuevo_num
  from public.configuracion_codigo_perfil
  order by id asc
  limit 1
  for update;

  if v_prefijo is null then
    v_prefijo := 'CLI';
    v_sufijo := 'MX';
    v_nuevo_num := 1;
  end if;

  -- Actualizar el contador en la tabla de configuración
  update public.configuracion_codigo_perfil
  set consecutivo_actual = v_nuevo_num,
      updated_at = now()
  where id = (select id from public.configuracion_codigo_perfil order by id asc limit 1);

  -- Formatear con 6 ceros a la izquierda
  v_codigo_final := upper(v_prefijo) || '-' || lpad(v_nuevo_num::text, 6, '0') || '-' || upper(v_sufijo);

  return v_codigo_final;
end;
$$;

-- 5. Trigger en profiles para auto-asignar código si viene nulo
create or replace function public.trg_auto_codigo_perfil()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.codigo is null or trim(new.codigo) = '' then
    new.codigo := public.generar_codigo_perfil();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_codigo_perfil on public.profiles;

create trigger trg_assign_codigo_perfil
  before insert on public.profiles
  for each row
  execute function public.trg_auto_codigo_perfil();

-- 6. Retro-asignar código a perfiles existentes que no tengan código
do $$
declare
  r record;
begin
  for r in select id from public.profiles where codigo is null or trim(codigo) = '' order by created_at asc loop
    update public.profiles
    set codigo = public.generar_codigo_perfil()
    where id = r.id;
  end loop;
end $$;
