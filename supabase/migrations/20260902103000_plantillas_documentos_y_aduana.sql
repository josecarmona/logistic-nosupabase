-- Migración: Plantillas de Documentos (Guías de Despacho y Declaraciones de Aduana)

-- 1. Crear tabla public.plantillas_documentos
create table if not exists public.plantillas_documentos (
  id bigint primary key generated always as identity,
  nombre varchar(255) not null,
  tipo varchar(50) not null check (tipo in ('guia', 'declaracion_aduana')),
  encabezado_titulo varchar(255),
  contenido_html text not null,
  recomendaciones_aduana text,
  es_default boolean not null default false,
  activo boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.plantillas_documentos enable row level security;

-- Políticas RLS
drop policy if exists "Plantillas visibles para autenticados" on public.plantillas_documentos;
drop policy if exists "Plantillas gestionables por autenticados" on public.plantillas_documentos;

create policy "Plantillas visibles para autenticados"
  on public.plantillas_documentos for select
  to authenticated
  using (true);

create policy "Plantillas gestionables por autenticados"
  on public.plantillas_documentos for all
  to authenticated
  using (true);

-- 2. Catalogar Permisos
insert into public.permisos (codigo, descripcion, tipo) values
  ('plantillas_documentos.ver',        'Ver diseñador de plantillas de documentos', 'data'),
  ('plantillas_documentos.crear',      'Crear plantillas de documentos', 'data'),
  ('plantillas_documentos.editar',     'Editar plantillas de documentos', 'data'),
  ('plantillas_documentos.desactivar', 'Desactivar plantillas de documentos', 'data')
on conflict (codigo) do nothing;

-- 3. Plantillas Semilla Iniciales
insert into public.plantillas_documentos (nombre, tipo, encabezado_titulo, contenido_html, recomendaciones_aduana, es_default, activo) values
(
  'Guía de Despacho Estándar de Envíos',
  'guia',
  'GUÍA DE DESPACHO Y EMBARQUE INTERNACIONAL',
  '<div class="guia-container"><h1>GUÍA DE DESPACHO</h1><p>Venta: {{codigo_venta}}</p></div>',
  'Verificar empaque sellado antes de firmar la conformidad de entrega.',
  true,
  true
),
(
  'Manifiesto y Declaración de Aduana',
  'declaracion_aduana',
  'DECLARACIÓN JURADA DE CONTENIDO Y EMBARQUE ADUANERO',
  '<div class="aduana-container"><h1>DECLARACIÓN DE ADUANA</h1></div>',
  '1. Declaración Jurada: El remitente declara bajo fe de juramento que la mercancía descrita no contiene sustancias estupefacientes, psicotrópicas, dinero en efectivo no autorizado, explosivos o mercancías de prohibida importación/exportación.\n2. Inspecicón Fiscal: El envío queda sujeto a los controles, aforos y retenciones de la administración aduanera del país de destino.\n3. Cobertura de Seguro y Reclamos: En caso de mermas, averías o faltantes, el destinatario debe dejar constancia escrita en el acta de recepción en un plazo no mayor a 48 horas.',
  true,
  true
)
on conflict do nothing;
