-- Migration: configuracion_general y almacenamiento de branding

-- 1. Tabla public.configuracion_general (Fila única id = 1)
create table if not exists public.configuracion_general (
    id integer primary key default 1 check (id = 1),
    
    -- Identidad Corporativa
    nombre_empresa varchar(255) not null default 'LOGISTIC SYSTEM',
    eslogan varchar(255) default 'Soluciones Logísticas Globales',
    identificacion_fiscal varchar(100) default 'J-12345678-9',
    direccion_empresa text default 'Caracas, Venezuela',
    telefono_empresa varchar(100) default '+58 212-1234567',
    email_empresa varchar(255) default 'contacto@logisticsystem.com',
    
    -- Archivos de Marca / Logos
    logo_url text,
    logo_dark_url text,
    favicon_url text,

    -- Colores y Apariencia Visual (Variables CSS Tailwind)
    color_primary varchar(100) not null default 'oklch(0.205 0 0)',
    color_primary_foreground varchar(100) not null default 'oklch(0.985 0 0)',
    color_accent varchar(100) not null default 'oklch(0.97 0 0)',
    color_accent_foreground varchar(100) not null default 'oklch(0.205 0 0)',
    sidebar_theme varchar(50) not null default 'default',
    border_radius varchar(50) not null default '0.625rem',

    -- Operativo y Documentos
    moneda_nombre varchar(100) not null default 'Dólares Americanos',
    moneda_simbolo varchar(10) not null default '$',
    moneda_iso varchar(10) not null default 'USD',
    pie_pagina_ticket text default '¡Gracias por preferir nuestros servicios de envío y encomiendas!',
    terminos_condiciones text default 'El cliente declara que el contenido del envío cumple con todas las regulaciones vigentes.',

    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS en public.configuracion_general
alter table public.configuracion_general enable row level security;

drop policy if exists "Configuración visible para usuarios autenticados" on public.configuracion_general;
create policy "Configuración visible para usuarios autenticados"
  on public.configuracion_general for select
  to authenticated
  using (true);

drop policy if exists "Configuración editable solo por administradores" on public.configuracion_general;
create policy "Configuración editable solo por administradores"
  on public.configuracion_general for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Insertar fila por defecto si no existe
insert into public.configuracion_general (id)
values (1)
on conflict (id) do nothing;

-- 2. Crear Storage Bucket para logos y branding si no existe
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

-- Políticas para Storage Bucket 'branding'
drop policy if exists "Logos visibles públicamente" on storage.objects;
create policy "Logos visibles públicamente"
  on storage.objects for select
  to public
  using (bucket_id = 'branding');

drop policy if exists "Logos gestionables por administradores" on storage.objects;
create policy "Logos gestionables por administradores"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'branding' and public.is_admin())
  with check (bucket_id = 'branding' and public.is_admin());

-- 3. Registrar permisos de configuración en la tabla permisos
insert into public.permisos (codigo, descripcion, tipo)
values
  ('menu.configuracion', 'Menú Configuración del Sistema', 'menu'),
  ('configuracion.ver', 'Ver Configuración del Sistema', 'accion'),
  ('configuracion.editar', 'Editar Configuración y Apariencia del Sistema', 'accion')
on conflict (codigo) do nothing;

-- Asignar permisos al rol admin por defecto
insert into public.rol_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r
cross join public.permisos p
where r.nombre = 'admin'
  and p.codigo in ('menu.configuracion', 'configuracion.ver', 'configuracion.editar')
on conflict (rol_id, permiso_id) do nothing;
