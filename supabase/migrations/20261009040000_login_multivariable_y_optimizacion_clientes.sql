-- ==============================================================================
-- Migración: Login Multivariable, Índices de Búsqueda y Soporte para Clientes
-- ==============================================================================

-- 1. Permitir que el email sea opcional para clientes de mostrador / carga masiva
ALTER TABLE public.profiles 
  ALTER COLUMN email DROP NOT NULL;

-- 2. Índice optimizado para búsquedas por email ignorando vacíos o nulos
DROP INDEX IF EXISTS idx_profiles_email;
CREATE INDEX idx_profiles_email ON public.profiles (lower(email)) 
WHERE email IS NOT NULL AND email <> '';

-- 3. Columna para preservar el ID histórico del cliente y su índice
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS id_antiguo integer UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_id_antiguo ON public.profiles (id_antiguo);

-- 4. Índices de aceleración para búsqueda y filtrado de alto rendimiento
CREATE INDEX IF NOT EXISTS idx_profiles_rol_id ON public.profiles (rol_id);
CREATE INDEX IF NOT EXISTS idx_profiles_codigo ON public.profiles (codigo);
CREATE INDEX IF NOT EXISTS idx_profiles_numero_celular ON public.profiles (numero_celular);
CREATE INDEX IF NOT EXISTS idx_profiles_cedula ON public.profiles (cedula);
CREATE INDEX IF NOT EXISTS idx_profiles_nombre_completo ON public.profiles (nombre_completo);

-- 5. Actualizar el consecutivo de clientes para evitar colisiones con códigos históricos
UPDATE public.configuracion_codigo_perfil
SET consecutivo_actual = GREATEST(consecutivo_actual, 145260),
    updated_at = now()
WHERE rol_id = 4;

-- 6. Función RPC con SECURITY DEFINER para resolución de login por Usuario / Teléfono / Correo
CREATE OR REPLACE FUNCTION public.obtener_email_login(p_identificador text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email text;
  v_limpio text := trim(p_identificador);
BEGIN
  -- Si ya contiene '@', se asume que es el correo directo
  IF v_limpio LIKE '%@%' THEN
    RETURN lower(v_limpio);
  END IF;

  -- Buscar por código de usuario, celular o teléfono fijo
  SELECT email INTO v_email
  FROM public.profiles
  WHERE lower(codigo) = lower(v_limpio)
     OR numero_celular = v_limpio
     OR telefono = v_limpio
  LIMIT 1;

  RETURN v_email;
END;
$$;

COMMENT ON FUNCTION public.obtener_email_login(text) IS 'Resuelve el email registrado para iniciar sesión con código consecutivo, teléfono o email directo';
