-- Migración: Configuración de Código por ROL para Perfiles y Edición de Rol (Puntos 76 y 77 de PROMPT.md)

-- 1. Añadir columna rol_id a configuracion_codigo_perfil si no existe
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'configuracion_codigo_perfil' 
    and column_name = 'rol_id'
  ) then
    alter table public.configuracion_codigo_perfil 
    add column rol_id bigint references public.roles(id) on delete cascade;

    alter table public.configuracion_codigo_perfil
    add constraint configuracion_codigo_perfil_rol_id_key unique (rol_id);
  end if;
end $$;

-- 2. Insertar configuraciones semilla por defecto para cada rol existente
insert into public.configuracion_codigo_perfil (rol_id, prefijo, sufijo, longitud_numero, consecutivo_actual)
select r.id, 
       case 
         when r.nombre = 'admin' then 'ADM'
         when r.nombre = 'gerente' then 'GER'
         when r.nombre = 'operador' then 'OPE'
         else 'CLI'
       end,
       null, 6, 0
from public.roles r
on conflict (rol_id) do nothing;

-- 3. Actualizar la función generar_codigo_perfil para aceptar p_rol_id
create or replace function public.generar_codigo_perfil(p_rol_id bigint default null)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_config_id bigint;
  v_prefijo text;
  v_sufijo text;
  v_longitud integer;
  v_nuevo_num integer;
  v_num_str text;
  v_codigo_final text;
  v_target_rol_id bigint := p_rol_id;
begin
  -- Si no se pasó rol_id, usar id del rol 'cliente'
  if v_target_rol_id is null then
    select id into v_target_rol_id from public.roles where nombre = 'cliente' limit 1;
  end if;

  -- Buscar configuración para el rol especificado con bloqueo FOR UPDATE
  select id, coalesce(prefijo, ''), coalesce(sufijo, ''), coalesce(longitud_numero, 6), consecutivo_actual + 1
  into v_config_id, v_prefijo, v_sufijo, v_longitud, v_nuevo_num
  from public.configuracion_codigo_perfil
  where rol_id = v_target_rol_id
  limit 1
  for update;

  -- Fallback si no existe fila para ese rol
  if v_config_id is null then
    select id, coalesce(prefijo, ''), coalesce(sufijo, ''), coalesce(longitud_numero, 6), consecutivo_actual + 1
    into v_config_id, v_prefijo, v_sufijo, v_longitud, v_nuevo_num
    from public.configuracion_codigo_perfil
    order by id asc
    limit 1
    for update;
  end if;

  if v_longitud is null or v_longitud < 1 then
    v_longitud := 6;
  end if;

  if v_nuevo_num is null then
    v_nuevo_num := 1;
  end if;

  -- Actualizar consecutivo en la tabla de configuración
  if v_config_id is not null then
    update public.configuracion_codigo_perfil
    set consecutivo_actual = v_nuevo_num,
        updated_at = now()
    where id = v_config_id;
  end if;

  -- Formatear número con ceros a la izquierda
  v_num_str := lpad(v_nuevo_num::text, v_longitud, '0');
  v_prefijo := upper(trim(v_prefijo));
  v_sufijo := upper(trim(v_sufijo));

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

-- 4. Actualizar trigger para enviar new.rol_id a generar_codigo_perfil
create or replace function public.trg_auto_codigo_perfil()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.codigo is null or trim(new.codigo) = '' then
    new.codigo := public.generar_codigo_perfil(new.rol_id);
  end if;
  return new;
end;
$$;

-- 5. Actualizar función de reconstrucción masiva para soportar reconstrucción por rol
create or replace function public.reconstruir_codigos_perfil(p_rol_id bigint default null)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer := 0;
  r_rol record;
  r_prof record;
  v_prefijo text;
  v_sufijo text;
  v_longitud integer;
  v_index integer;
  v_num_str text;
  v_codigo_final text;
  v_config_id bigint;
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado: Solo el administrador puede realizar el barrido de códigos de perfil';
  end if;

  for r_rol in select id from public.roles where (p_rol_id is null or id = p_rol_id) order by id asc loop
    select id, coalesce(prefijo, ''), coalesce(sufijo, ''), coalesce(longitud_numero, 6)
    into v_config_id, v_prefijo, v_sufijo, v_longitud
    from public.configuracion_codigo_perfil
    where rol_id = r_rol.id
    limit 1;

    if v_config_id is not null then
      v_prefijo := upper(trim(v_prefijo));
      v_sufijo := upper(trim(v_sufijo));
      if v_longitud is null or v_longitud < 1 then v_longitud := 6; end if;

      v_index := 0;
      for r_prof in select id from public.profiles where rol_id = r_rol.id order by created_at asc, id asc loop
        v_index := v_index + 1;
        v_num_str := lpad(v_index::text, v_longitud, '0');

        if v_prefijo <> '' and v_sufijo <> '' then
          v_codigo_final := v_prefijo || '-' || v_num_str || '-' || v_sufijo;
        elsif v_prefijo <> '' and v_sufijo = '' then
          v_codigo_final := v_prefijo || '-' || v_num_str;
        elsif v_prefijo = '' and v_sufijo <> '' then
          v_codigo_final := v_num_str || '-' || v_sufijo;
        else
          v_codigo_final := v_num_str;
        end if;

        update public.profiles
        set codigo = v_codigo_final,
            updated_at = now()
        where id = r_prof.id;

        v_count := v_count + 1;
      end loop;

      update public.configuracion_codigo_perfil
      set consecutivo_actual = v_index,
          updated_at = now()
      where id = v_config_id;
    end if;
  end loop;

  return v_count;
end;
$$;
