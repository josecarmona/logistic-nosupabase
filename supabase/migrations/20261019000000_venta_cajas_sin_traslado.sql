-- ==============================================================================
-- Migración: Venta de Cajas (Sin Servicio de Traslado) y Precio de Venta en Productos
-- Fecha: 2026-10-19
-- ==============================================================================

-- 1. Agregar columna precio_venta a la tabla productos (Precio de venta directa en USD)
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS precio_venta numeric(12,2) NOT NULL DEFAULT 0;

-- 2. Agregar columna tipo_operacion a la tabla ventas ('envio' | 'venta_cajas')
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS tipo_operacion text NOT NULL DEFAULT 'envio';
