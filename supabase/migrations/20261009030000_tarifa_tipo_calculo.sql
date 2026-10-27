-- ==============================================================================
-- Migración: Modalidad de Cálculo en Tarifas de Venta (Tarifa Única vs Por Peso)
-- ==============================================================================

-- 1. Incorporar columnas de modalidad de cálculo en public.tarifas
ALTER TABLE public.tarifas
ADD COLUMN IF NOT EXISTS tipo_calculo VARCHAR(20) NOT NULL DEFAULT 'unica',
ADD COLUMN IF NOT EXISTS es_por_peso BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Asegurar restricción de valores permitidos
ALTER TABLE public.tarifas
DROP CONSTRAINT IF EXISTS tarifas_tipo_calculo_check;

ALTER TABLE public.tarifas
ADD CONSTRAINT tarifas_tipo_calculo_check CHECK (tipo_calculo IN ('unica', 'peso'));

-- 3. Actualizar registros existentes según si su Tipo de Tarifa corresponde a peso
UPDATE public.tarifas t
SET tipo_calculo = 'peso', es_por_peso = TRUE
FROM public.tipos_tarifa tt
WHERE t.tipo_tarifa_id = tt.id
  AND (
    LOWER(tt.nombre) LIKE '%libre%'
    OR LOWER(tt.nombre) LIKE '%peso%'
    OR LOWER(tt.nombre) LIKE '%libra%'
    OR LOWER(tt.nombre) LIKE '%lb%'
  );

COMMENT ON COLUMN public.tarifas.tipo_calculo IS 'Modalidad de cobro de la tarifa: unica (caja completa) o peso (por peso reportado)';
COMMENT ON COLUMN public.tarifas.es_por_peso IS 'Indica si el precio se multiplica por el peso reportado de la caja';
