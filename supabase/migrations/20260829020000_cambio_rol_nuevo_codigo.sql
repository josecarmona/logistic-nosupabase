-- Migración: Asignación automática de nuevo código de perfil al cambiar de rol (Línea 78 del PROMPT.md)

create or replace function public.trg_auto_codigo_perfil()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- 1. Al crear un nuevo perfil si no trae código
  if (TG_OP = 'INSERT' and (new.codigo is null or trim(new.codigo) = '')) then
    new.codigo := public.generar_codigo_perfil(new.rol_id);

  -- 2. Al cambiar el rol_id de un perfil existente, genera un nuevo código consecutivo según la configuración del nuevo rol
  elsif (TG_OP = 'UPDATE' and old.rol_id is distinct from new.rol_id) then
    new.codigo := public.generar_codigo_perfil(new.rol_id);
  end if;

  return new;
end;
$$;

-- Asegurar que el trigger responda a INSERT y a UPDATE
drop trigger if exists trg_assign_codigo_perfil on public.profiles;

create trigger trg_assign_codigo_perfil
  before insert or update on public.profiles
  for each row
  execute function public.trg_auto_codigo_perfil();
