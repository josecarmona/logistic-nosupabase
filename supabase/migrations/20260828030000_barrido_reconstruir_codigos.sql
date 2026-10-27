-- Migración: Función PL/pgSQL para barrido y reconstrucción masiva de códigos de perfil

create or replace function public.reconstruir_codigos_perfil()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_prefijo text;
  v_sufijo text;
  v_longitud integer;
  v_count integer := 0;
  v_index integer := 0;
  v_num_str text;
  v_codigo_final text;
  r record;
begin
  -- Control de seguridad estricto: Solo administradores pueden ejecutar la reconstrucción
  if not public.is_admin() then
    raise exception 'Acceso denegado: Solo el administrador puede realizar el barrido de códigos de perfil';
  end if;

  -- Obtener la configuración actual
  select coalesce(prefijo, ''), coalesce(sufijo, ''), coalesce(longitud_numero, 6)
  into v_prefijo, v_sufijo, v_longitud
  from public.configuracion_codigo_perfil
  order by id asc
  limit 1;

  if v_longitud is null or v_longitud < 1 then
    v_longitud := 6;
  end if;

  v_prefijo := upper(trim(v_prefijo));
  v_sufijo := upper(trim(v_sufijo));

  -- Recorrer todos los perfiles existentes ordenados cronológicamente por su fecha de creación
  for r in select id from public.profiles order by created_at asc, id asc loop
    v_index := v_index + 1;
    v_num_str := lpad(v_index::text, v_longitud, '0');

    -- Construir el nuevo código según prefijo y sufijo
    if v_prefijo <> '' and v_sufijo <> '' then
      v_codigo_final := v_prefijo || '-' || v_num_str || '-' || v_sufijo;
    elsif v_prefijo <> '' and v_sufijo = '' then
      v_codigo_final := v_prefijo || '-' || v_num_str;
    elsif v_prefijo = '' and v_sufijo <> '' then
      v_codigo_final := v_num_str || '-' || v_sufijo;
    else
      v_codigo_final := v_num_str;
    end if;

    -- Actualizar el código del perfil
    update public.profiles
    set codigo = v_codigo_final,
        updated_at = now()
    where id = r.id;

    v_count := v_count + 1;
  end loop;

  -- Actualizar el contador del consecutivo en la configuración al total de perfiles procesados
  update public.configuracion_codigo_perfil
  set consecutivo_actual = v_count,
      updated_at = now()
  where id = (select id from public.configuracion_codigo_perfil order by id asc limit 1);

  return v_count;
end;
$$;
