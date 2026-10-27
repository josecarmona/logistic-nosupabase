-- Migración: Incorporar Número de Guía del Proveedor (Zoom) y URL del Documento generado por la API

alter table public.ventas
  add column if not exists guia_proveedor varchar(255),
  add column if not exists url_documento_proveedor text;
