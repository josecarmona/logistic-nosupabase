-- ============================================================
-- Migración inicial: esquema de la aplicación de usuarios y perfiles
-- Fecha: 2026-08-27
-- Proyecto: logistic
-- Descripción: Crea las tablas de maestros (roles, países, tipos de
-- adquisición), la tabla de perfiles y el sistema de permisos por rol.
-- También configura RLS (Row Level Security) y el trigger que crea el
-- perfil automáticamente al registrarse un usuario en auth.users.
-- ============================================================

-- Extensiones requeridas
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ============================================================
-- TABLA: roles (maestro de roles de usuarios)
-- ============================================================
create table if not exists public.roles (
  id          serial primary key,
  nombre      text not null unique,
  descripcion text,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- TABLA: permisos (catálogo de permisos: datos, menú, formularios, acciones)
-- ============================================================
create table if not exists public.permisos (
  id          serial primary key,
  codigo      text not null unique,
  descripcion text,
  -- data | menu | form | accion
  tipo        text not null default 'data',
  created_at  timestamptz not null default now()
);

-- ============================================================
-- TABLA: rol_permisos (relación muchos a muchos rol <-> permiso)
-- ============================================================
create table if not exists public.rol_permisos (
  rol_id      integer not null references public.roles (id) on delete cascade,
  permiso_id  integer not null references public.permisos (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (rol_id, permiso_id)
);

-- ============================================================
-- TABLA: paises (maestro de países con códigos ISO y peso límite)
-- ============================================================
create table if not exists public.paises (
  id           serial primary key,
  nombre       text not null unique,
  codigo_iso2  char(2) not null unique,
  codigo_iso3  char(3) not null unique,
  -- 0 = sin límite de peso
  limite_peso  numeric(15,2) not null default 0,
  activo       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- TABLA: tipo_adquisiciones (maestro de tipos de adquisición)
-- ============================================================
create table if not exists public.tipo_adquisiciones (
  id         serial primary key,
  nombre     text not null unique,
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TABLA: profiles (perfiles de negocio, separada de auth.users)
-- ============================================================
create table if not exists public.profiles (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users (id) on delete set null unique,
  email                 text not null unique,
  nombre_completo       text not null default '',
  razon_social          text,
  direccion_1           text,
  direccion_2           text,
  pais_id               integer references public.paises (id),
  codigo_postal         text,
  ciudad                text,
  estado                text,
  municipio             text,
  numero_celular        text,
  telefono              text,
  tipo_adquisicion_id   integer references public.tipo_adquisiciones (id),
  referencia            text,
  rol_id                integer references public.roles (id),
  activo                boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Índice auxiliar para búsqueda
create index if not exists idx_profiles_email on public.profiles (lower(email));
create index if not exists idx_profiles_nombre on public.profiles (lower(nombre_completo));
create index if not exists idx_profiles_user_id on public.profiles (user_id);

-- ============================================================
-- TRIGGER: crear o vincular perfil automáticamente al registrarse un usuario
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_profile_id uuid;
begin
  select id into v_profile_id from public.profiles where lower(email) = lower(new.email) limit 1;
  if v_profile_id is not null then
    update public.profiles
    set user_id = new.id, updated_at = now()
    where id = v_profile_id;
  else
    insert into public.profiles (user_id, email, rol_id)
    values (
      new.id,
      new.email,
      (select r.id from public.roles r where r.nombre = 'cliente' limit 1)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- RLS: POLÍTICAS DE SEGURIDAD A NIVEL DE FILA
-- Enfoque aprobado: sólo aislamiento base en la BD.
--   - profiles: el usuario ve/edita su propio perfil; admin ve/edita todos.
--   - maestros: lectura para usuarios autenticados; escritura para admin.
--   - Los permisos finos se validan en la capa de aplicación.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permisos enable row level security;
alter table public.rol_permisos enable row level security;
alter table public.paises enable row level security;
alter table public.tipo_adquisiciones enable row level security;

-- Función que indica si el usuario actual es admin (por rol del perfil)
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    join public.roles r on r.id = p.rol_id
    where (p.user_id = auth.uid() or p.id = auth.uid()) and r.nombre = 'admin' and r.activo = true and p.activo = true
  );
$$;

-- PROFILES: el dueño ve/edita su propio perfil; admin todo.
create policy "profiles select own or admin" on public.profiles
  for select using (user_id = auth.uid() or id = auth.uid() or public.is_admin());

create policy "profiles insert own" on public.profiles
  for insert with check (user_id = auth.uid() or id = auth.uid() or public.is_admin());

create policy "profiles update own or admin" on public.profiles
  for update using (user_id = auth.uid() or id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or id = auth.uid() or public.is_admin());

-- Permitir borrado físico sólo para admin (por auditoría se prefiere el
-- desactivado vía campo activo, pero se deja la política por completitud).
create policy "profiles delete admin" on public.profiles
  for delete using (public.is_admin());

-- ROLES: solo lectura para autenticados (todos necesitan conocer el maestro),
-- escritura solo admin.
create policy "roles select autenticados" on public.roles
  for select using (auth.role() = 'authenticated');
create policy "roles insert admin" on public.roles
  for insert with check (public.is_admin());
create policy "roles update admin" on public.roles
  for update using (public.is_admin()) with check (public.is_admin());
create policy "roles delete admin" on public.roles
  for delete using (public.is_admin());

-- PERMISOS: lectura para autenticados, escritura solo admin.
create policy "permisos select autenticados" on public.permisos
  for select using (auth.role() = 'authenticated');
create policy "permisos insert admin" on public.permisos
  for insert with check (public.is_admin());
create policy "permisos update admin" on public.permisos
  for update using (public.is_admin()) with check (public.is_admin());
create policy "permisos delete admin" on public.permisos
  for delete using (public.is_admin());

-- ROL_PERMISOS: lectura para autenticados, escritura solo admin.
create policy "rol_permisos select autenticados" on public.rol_permisos
  for select using (auth.role() = 'authenticated');
create policy "rol_permisos insert admin" on public.rol_permisos
  for insert with check (public.is_admin());
create policy "rol_permisos delete admin" on public.rol_permisos
  for delete using (public.is_admin());
create policy "rol_permisos update admin" on public.rol_permisos
  for update using (public.is_admin()) with check (public.is_admin());

-- PAISES: lectura para autenticados, escritura solo admin.
create policy "paises select autenticados" on public.paises
  for select using (auth.role() = 'authenticated');
create policy "paises insert admin" on public.paises
  for insert with check (public.is_admin());
create policy "paises update admin" on public.paises
  for update using (public.is_admin()) with check (public.is_admin());
create policy "paises delete admin" on public.paises
  for delete using (public.is_admin());

-- TIPO_ADQUISICIONES: lectura para autenticados, escritura solo admin.
create policy "tipo_adquisiciones select autenticados" on public.tipo_adquisiciones
  for select using (auth.role() = 'authenticated');
create policy "tipo_adquisiciones insert admin" on public.tipo_adquisiciones
  for insert with check (public.is_admin());
create policy "tipo_adquisiciones update admin" on public.tipo_adquisiciones
  for update using (public.is_admin()) with check (public.is_admin());
create policy "tipo_adquisiciones delete admin" on public.tipo_adquisiciones
  for delete using (public.is_admin());
