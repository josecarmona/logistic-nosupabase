-- Migración: Maestro de Proveedores y Configuración de Tipo de Entrega en Ventas (Domicilio / Oficina Ocurre)

-- 1. Tabla maestro: public.proveedores
create table if not exists public.proveedores (
  id bigint primary key generated always as identity,
  nombre varchar(255) not null,
  tiene_api boolean not null default false,
  direccion text,
  activo boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.proveedores enable row level security;

-- Políticas RLS para public.proveedores
drop policy if exists "Proveedores visibles para autenticados" on public.proveedores;
drop policy if exists "Proveedores gestionables por autenticados" on public.proveedores;

create policy "Proveedores visibles para autenticados"
  on public.proveedores for select
  to authenticated
  using (true);

create policy "Proveedores gestionables por autenticados"
  on public.proveedores for all
  to authenticated
  using (true);

-- 2. Modificar tabla public.ventas para incorporar Proveedor y Tipo de Entrega
alter table public.ventas
  add column if not exists tipo_entrega varchar(50) not null default 'domicilio',
  add column if not exists proveedor_id bigint references public.proveedores(id) on delete set null,
  add column if not exists direccion_entrega text;

-- 3. Catalogar Permisos de Proveedores
insert into public.permisos (codigo, descripcion, tipo) values
  ('proveedores.ver',        'Ver maestro de proveedores', 'data'),
  ('proveedores.crear',      'Crear proveedores en el maestro', 'data'),
  ('proveedores.editar',     'Editar proveedores en el maestro', 'data'),
  ('proveedores.desactivar', 'Desactivar proveedores en el maestro', 'data')
on conflict (codigo) do nothing;

-- 4. Datos Semilla Iniciales de Proveedores
insert into public.proveedores (nombre, tiene_api, direccion, activo) values
  ('MRW EXPRESS', true, 'Av. Principal de Logística, Edif. MRW Central', true),
  ('TEALCA ENVIOS', true, 'Av. Francisco de Miranda, Torre Tealca', true),
  ('ZOOM LOGÍSTICA', true, 'Calle Los Laboratorios, Edif. Zoom Central', true),
  ('TRANSPORTE PROPIO / INTERNO', false, 'Almacén Central Principal - Zona Industrial Barquisimeto', true)
on conflict do nothing;
