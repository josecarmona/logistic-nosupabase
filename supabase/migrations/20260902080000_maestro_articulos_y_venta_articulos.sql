-- Migración: Maestro de Artículos y Detalle de Artículos por Venta

-- 1. Tabla maestro: public.articulos (Contiene catálogo general de nombres de artículos)
create table if not exists public.articulos (
  id bigint primary key generated always as identity,
  nombre varchar(255) not null,
  activo boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.articulos enable row level security;

-- Políticas de RLS para public.articulos
drop policy if exists "Articulos visibles por usuarios autenticados" on public.articulos;
drop policy if exists "Administradores y gerentes pueden gestionar articulos" on public.articulos;
drop policy if exists "Articulos gestionables por usuarios autenticados" on public.articulos;

create policy "Articulos visibles por usuarios autenticados"
  on public.articulos for select
  to authenticated
  using (true);

create policy "Articulos gestionables por usuarios autenticados"
  on public.articulos for all
  to authenticated
  using (true);

-- 2. Tabla detalle por venta: public.venta_articulos (Almacena cantidad y valor especificados en la venta)
create table if not exists public.venta_articulos (
  id bigint primary key generated always as identity,
  venta_id bigint not null references public.ventas(id) on delete cascade,
  articulo_id bigint references public.articulos(id) on delete set null,
  nombre varchar(255) not null,
  cantidad numeric(10, 2) not null default 1,
  valor_total numeric(12, 2) not null default 0.00,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.venta_articulos enable row level security;

-- Políticas de RLS para public.venta_articulos
drop policy if exists "Venta articulos visibles por usuarios autenticados" on public.venta_articulos;
drop policy if exists "Operadores y administradores pueden insertar venta articulos" on public.venta_articulos;
drop policy if exists "Venta articulos gestionables por usuarios autenticados" on public.venta_articulos;

create policy "Venta articulos visibles por usuarios autenticados"
  on public.venta_articulos for select
  to authenticated
  using (true);

create policy "Venta articulos gestionables por usuarios autenticados"
  on public.venta_articulos for all
  to authenticated
  using (true);

-- 3. Catalogar permisos de Artículos
insert into public.permisos (codigo, descripcion, tipo) values
  ('articulos.ver',        'Ver maestro de artículos', 'data'),
  ('articulos.crear',      'Crear artículos en el maestro', 'data'),
  ('articulos.editar',     'Editar artículos en el maestro', 'data'),
  ('articulos.desactivar', 'Desactivar artículos en el maestro', 'data')
on conflict (codigo) do nothing;

-- 4. Datos Semilla Iniciales (Solo Nombres de Artículos)
insert into public.articulos (nombre, activo) values
  ('ROPA / CALZADO PERSONAL', true),
  ('ARTÍCULOS DE HIGIENE / COSMÉTICOS', true),
  ('ELECTRÓNICOS Y ACCESORIOS', true),
  ('ALIMENTOS NO PERECEDEROS', true),
  ('HERRAMIENTAS / REPUESTOS', true)
on conflict do nothing;
