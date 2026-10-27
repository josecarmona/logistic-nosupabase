-- Migración: Tipo de producto CAJA con unidades de medida para dimensiones (CM, IN) y cálculo de peso volumétrico (KG, LB)

-- 0. Eliminar el CHECK constraint 'unidades_medida_tipo_check' que restringía los valores a ('peso', 'volumen', 'cantidad')
alter table public.unidades_medida drop constraint if exists unidades_medida_tipo_check;

-- 1. Asegurar unidades de medida de longitud (CM, IN, M, FT) en unidades_medida
do $$
declare
  grupo_longitud_id bigint;
  grupo_peso_id bigint;
begin
  select id into grupo_longitud_id from public.grupos_unidad_medida where codigo = 'LONGITUD' limit 1;
  select id into grupo_peso_id from public.grupos_unidad_medida where codigo = 'PESO' limit 1;

  -- Insertar unidades de longitud si no existen
  insert into public.unidades_medida (codigo, nombre, tipo, grupo_id, activo) values
    ('CM', 'CENTÍMETRO', 'longitud', grupo_longitud_id, true),
    ('IN', 'PULGADA (INCH)', 'longitud', grupo_longitud_id, true),
    ('M', 'METRO', 'longitud', grupo_longitud_id, true),
    ('FT', 'PIE (FEET)', 'longitud', grupo_longitud_id, true)
  on conflict (codigo) do update set
    grupo_id = excluded.grupo_id,
    nombre = excluded.nombre,
    tipo = excluded.tipo;
end $$;

-- 2. Insertar o actualizar el tipo de producto CAJA con atributos de Largo, Ancho, Alto y Peso Volumétrico
do $$
declare
  cm_id bigint;
  kg_id bigint;
begin
  select id into cm_id from public.unidades_medida where codigo = 'CM' limit 1;
  select id into kg_id from public.unidades_medida where codigo = 'KG' limit 1;

  insert into public.tipos_producto (nombre, prefijo, descripcion, atributos)
  values (
    'CAJA',
    'CAJ',
    'Cajas, paquetes y empaques de envío con cálculo de peso volumétrico en KG (CM) o LB (IN)',
    jsonb_build_array(
      jsonb_build_object('nombre', 'LARGO', 'tipo', 'numero', 'unidad_medida_id', cm_id, 'requerido', true),
      jsonb_build_object('nombre', 'ANCHO', 'tipo', 'numero', 'unidad_medida_id', cm_id, 'requerido', true),
      jsonb_build_object('nombre', 'ALTO', 'tipo', 'numero', 'unidad_medida_id', cm_id, 'requerido', true),
      jsonb_build_object('nombre', 'PESO VOLUMÉTRICO', 'tipo', 'numero', 'unidad_medida_id', kg_id, 'requerido', false)
    )
  )
  on conflict (nombre) do update
  set 
    prefijo = excluded.prefijo,
    descripcion = excluded.descripcion,
    atributos = excluded.atributos;
end $$;
