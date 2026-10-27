-- ==============================================================================
-- Migración: Cumplimiento de permisos Data API Supabase (Octubre 30)
-- Fecha: 2026-10-20
-- Descripción:
--   A partir del 30 de octubre, Supabase deja de otorgar acceso automático a
--   las nuevas tablas del esquema "public" a través de la Data API (PostgREST,
--   supabase-js, GraphQL).
--
--   Esta migración:
--   1. Otorga permisos explícitos sobre todas las tablas y secuencias actuales
--      en el esquema public a los roles 'anon', 'authenticated' y 'service_role'.
--   2. Configura ALTER DEFAULT PRIVILEGES para que cualquier tabla o secuencia
--      futura creada en public por postgres o supabase_admin herede automáticamente
--      los permisos necesarios sin romper la API.
-- ==============================================================================

-- 1. Permisos sobre el esquema public
grant usage on schema public to anon, authenticated, service_role;

-- 2. Permisos explícitos sobre todas las tablas existentes en public
-- Nota: RLS (Row Level Security) sigue activo y controla el acceso a nivel de fila.
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- 3. Permisos explícitos sobre todas las secuencias existentes en public (claves autoincrementales)
grant usage, select on all sequences in schema public to anon;
grant usage, select, update on all sequences in schema public to authenticated;
grant all on all sequences in schema public to service_role;

-- 4. Permisos por defecto para futuras tablas y secuencias creadas en public
-- Aplica para los roles estándar de administración en Supabase/PostgreSQL
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant all on tables to service_role;

alter default privileges in schema public grant usage, select on sequences to anon;
alter default privileges in schema public grant usage, select, update on sequences to authenticated;
alter default privileges in schema public grant all on sequences to service_role;
