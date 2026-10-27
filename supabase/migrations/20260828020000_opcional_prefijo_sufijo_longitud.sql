-- Migración: Prefijo y Sufijo opcionales y longitud de dígitos configurable

-- 1. Añadir columna longitud_numero a configuracion_codigo_perfil si no existe
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'configuracion_codigo_perfil' 
    and column_name = 'longitud_numero'
  ) then
    alter table public.configuracion_codigo_perfil 
    add column longitud_numero integer not null default 6;
  end if;
end $$;

-- Permitir prefijo y sufijo como cadenas vacías u opcionales
alter table public.configuracion_codigo_perfil alter column prefijo drop not null;
alter table public.configuracion_codigo_perfil alter column sufijo drop not null;

-- 2. Función PL/pgSQL actualizada para soportar prefijo/sufijo opcionales y longitud configurable
create or replace function public.generar_codigo_perfil()
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_prefijo text;
  v_sufijo text;
  v_longitud integer;
  v_nuevo_num integer;
  v_num_str text;
  v_codigo_final text;
begin
  -- Obtener configuración actual con bloqueo de fila
  select coalesce(prefijo, ''), coalesce(sufijo, ''), coalesce(longitud_numero, 6), consecutivo_actual + 1
  into v_prefijo, v_sufijo, v_longitud, v_nuevo_num
  from public.configuracion_codigo_perfil
  order by id asc
  limit 1
  for update;

  if v_longitud is null or v_longitud < 1 then
    v_longitud := 6;
  end if;

  -- Actualizar el contador en la tabla de configuración
  update public.configuracion_codigo_perfil
  set consecutivo_actual = v_nuevo_num,
      updated_at = now()
  where id = (select id from public.configuracion_codigo_perfil order by id asc limit 1);

  -- Formatear número con relleno dinámico de ceros de acuerdo con longitud_numero
  v_num_str := lpad(v_nuevo_num::text, v_longitud, '0');
  v_prefijo := upper(trim(v_prefijo));
  v_sufijo := upper(trim(v_sufijo));

  -- Construir el código según la presencia de prefijo y sufijo
  if v_prefijo <> '' and v_sufijo <> '' then
    v_codigo_final := v_prefijo || '-' || v_num_str || '-' || v_sufijo;
  elsif v_prefijo <> '' and v_sufijo = '' then
    v_codigo_final := v_prefijo || '-' || v_num_str;
  elsif v_prefijo = '' and v_sufijo <> '' then
    v_codigo_final := v_num_str || '-' || v_sufijo;
  else
    v_codigo_final := v_num_str;
  end if;

  return v_codigo_final;
end;
$$;
