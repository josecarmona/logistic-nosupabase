-- ==============================================================================
-- Migración: Mejoras de Evaluación del Cliente (RLS Operador, Clave Visible y Email Flexible)
-- Fecha: 2026-10-17
-- ==============================================================================

-- 1. Columna para almacenar la contraseña visible para administración autorizada (Hilvic Hernández / Admin)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_visible text;

-- 2. Flexibilizar restricción UNIQUE de email en profiles para permitir correos genéricos de mostrador (ej. noregistra@gmail.com) o vacíos
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_email_key;

-- 3. Función helper que indica si el usuario autenticado es personal de Staff (admin, gerente u operador)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.roles r ON r.id = p.rol_id
    WHERE (p.user_id = auth.uid() OR p.id = auth.uid())
      AND r.nombre IN ('admin', 'gerente', 'operador')
      AND r.activo = true
      AND p.activo = true
  );
$$;

-- 4. Actualizar políticas RLS de public.profiles para permitir a Operadores y Gerentes consultar, crear y editar clientes
DROP POLICY IF EXISTS "profiles select own or admin" ON public.profiles;
CREATE POLICY "profiles select own or admin" ON public.profiles
  FOR SELECT USING (
    user_id = auth.uid()
    OR id = auth.uid()
    OR public.is_admin()
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "profiles insert own" ON public.profiles;
CREATE POLICY "profiles insert own" ON public.profiles
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR id = auth.uid()
    OR public.is_admin()
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "profiles update own or admin" ON public.profiles;
CREATE POLICY "profiles update own or admin" ON public.profiles
  FOR UPDATE USING (
    user_id = auth.uid()
    OR id = auth.uid()
    OR public.is_admin()
    OR public.is_staff()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR id = auth.uid()
    OR public.is_admin()
    OR public.is_staff()
  );
