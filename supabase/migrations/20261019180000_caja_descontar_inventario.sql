-- ==============================================================================
-- Migración: Control de Descuento de Inventario por Caja en Ventas
-- Fecha: 2026-10-19
-- ==============================================================================

-- 1. Agregar columna descontar_inventario a la tabla ventas (por defecto true)
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS descontar_inventario boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.ventas.descontar_inventario IS 'Indica si la caja (en caja única) se descuenta del inventario. Si es false, se aplica descuento del precio de venta de la caja.';
