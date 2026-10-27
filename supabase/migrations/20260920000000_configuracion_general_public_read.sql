-- Migration: Permitir lectura pública de configuracion_general para que visitantes
-- no autenticados (login, registro) carguen de inmediato los logotipos, nombre de empresa y colores.

drop policy if exists "Configuración visible para usuarios autenticados" on public.configuracion_general;
drop policy if exists "Configuración visible para todos (pública)" on public.configuracion_general;

create policy "Configuración visible para todos (pública)"
  on public.configuracion_general for select
  to public
  using (true);
