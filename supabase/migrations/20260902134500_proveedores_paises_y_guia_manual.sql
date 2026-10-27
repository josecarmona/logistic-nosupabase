-- Migración: Asignación de Países Atendidos por Proveedor de Transporte

-- 1. Tabla de unión proveedores_paises
create table if not exists public.proveedores_paises (
  id bigint primary key generated always as identity,
  proveedor_id bigint not null references public.proveedores(id) on delete cascade,
  pais_id bigint not null references public.paises(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(proveedor_id, pais_id)
);

-- Habilitar RLS
alter table public.proveedores_paises enable row level security;

-- Políticas RLS
drop policy if exists "Proveedores países visibles para autenticados" on public.proveedores_paises;
drop policy if exists "Proveedores países gestionables por autenticados" on public.proveedores_paises;

create policy "Proveedores países visibles para autenticados"
  on public.proveedores_paises for select
  to authenticated
  using (true);

create policy "Proveedores países gestionables por autenticados"
  on public.proveedores_paises for all
  to authenticated
  using (true);

-- Seed de relación inicial de países para los proveedores existentes
insert into public.proveedores_paises (proveedor_id, pais_id)
select p.id, pa.id
from public.proveedores p
cross join public.paises pa
on conflict do nothing;
