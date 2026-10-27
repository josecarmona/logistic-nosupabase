-- ======================================================================
-- ESQUEMA DE BASE DE DATOS LIMPIA PARA PRODUCCIÓN (SUPABASE)
-- Tablas, Funciones, Triggers, RLS y Permisos del Sistema
-- BASE DE DATOS 100% VACÍA (SIN CATÁLOGOS NI DATOS DEMO)
-- Fecha de generación: 2026-10-07 12:26:28
-- ======================================================================


-- ======================================================================
-- MIGRACIÓN: 20260827000000_initial_schema.sql
-- ======================================================================

-- ============================================================
-- MigraciÃ³n inicial: esquema de la aplicaciÃ³n de usuarios y perfiles
-- Fecha: 2026-08-27
-- Proyecto: logistic
-- DescripciÃ³n: Crea las tablas de maestros (roles, paÃ­ses, tipos de
-- adquisiciÃ³n), la tabla de perfiles y el sistema de permisos por rol.
-- TambiÃ©n configura RLS (Row Level Security) y el trigger que crea el
-- perfil automÃ¡ticamente al registrarse un usuario en auth.users.
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
-- TABLA: permisos (catÃ¡logo de permisos: datos, menÃº, formularios, acciones)
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
-- TABLA: rol_permisos (relaciÃ³n muchos a muchos rol <-> permiso)
-- ============================================================
create table if not exists public.rol_permisos (
  rol_id      integer not null references public.roles (id) on delete cascade,
  permiso_id  integer not null references public.permisos (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (rol_id, permiso_id)
);

-- ============================================================
-- TABLA: paises (maestro de paÃ­ses con cÃ³digos ISO y peso lÃ­mite)
-- ============================================================
create table if not exists public.paises (
  id           serial primary key,
  nombre       text not null unique,
  codigo_iso2  char(2) not null unique,
  codigo_iso3  char(3) not null unique,
  -- 0 = sin lÃ­mite de peso
  limite_peso  numeric(15,2) not null default 0,
  activo       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- TABLA: tipo_adquisiciones (maestro de tipos de adquisiciÃ³n)
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

-- Ãndice auxiliar para bÃºsqueda
create index if not exists idx_profiles_email on public.profiles (lower(email));
create index if not exists idx_profiles_nombre on public.profiles (lower(nombre_completo));
create index if not exists idx_profiles_user_id on public.profiles (user_id);

-- ============================================================
-- TRIGGER: crear o vincular perfil automÃ¡ticamente al registrarse un usuario
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
-- RLS: POLÃTICAS DE SEGURIDAD A NIVEL DE FILA
-- Enfoque aprobado: sÃ³lo aislamiento base en la BD.
--   - profiles: el usuario ve/edita su propio perfil; admin ve/edita todos.
--   - maestros: lectura para usuarios autenticados; escritura para admin.
--   - Los permisos finos se validan en la capa de aplicaciÃ³n.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permisos enable row level security;
alter table public.rol_permisos enable row level security;
alter table public.paises enable row level security;
alter table public.tipo_adquisiciones enable row level security;

-- FunciÃ³n que indica si el usuario actual es admin (por rol del perfil)
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

-- PROFILES: el dueÃ±o ve/edita su propio perfil; admin todo.
create policy "profiles select own or admin" on public.profiles
  for select using (user_id = auth.uid() or id = auth.uid() or public.is_admin());

create policy "profiles insert own" on public.profiles
  for insert with check (user_id = auth.uid() or id = auth.uid() or public.is_admin());

create policy "profiles update own or admin" on public.profiles
  for update using (user_id = auth.uid() or id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or id = auth.uid() or public.is_admin());

-- Permitir borrado fÃ­sico sÃ³lo para admin (por auditorÃ­a se prefiere el
-- desactivado vÃ­a campo activo, pero se deja la polÃ­tica por completitud).
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


-- ======================================================================
-- SEED BASE: ROLES Y PERMISOS DEL SISTEMA
-- ======================================================================

-- ============================================================
-- SEED: datos iniciales de la aplicaciÃ³n
-- Proyecto: logistic
-- ============================================================

-- ============================================================
-- ROLES iniciales
-- ============================================================
insert into public.roles (nombre, descripcion)
values
  ('admin',    'Administrador del sistema. Acceso completo.'),
  ('gerente',  'Gerente con permiso de gestiÃ³n de datos.'),
  ('operador', 'Operador con permisos de lectura/escritura limitados.'),
  ('cliente',  'Cliente / usuario final. Rol por defecto.')
on conflict (nombre) do nothing;

-- ============================================================
-- PERMISOS (catÃ¡logo)
--   tipo: data | menu | form | accion
-- ============================================================
insert into public.permisos (codigo, descripcion, tipo) values
  -- Maestro de usuarios
  ('usuarios.ver',            'Ver usuarios', 'data'),
  ('usuarios.crear',          'Crear usuarios', 'data'),
  ('usuarios.editar',         'Editar usuarios', 'data'),
  ('usuarios.desactivar',     'Desactivar usuarios', 'data'),
  ('usuarios.asignar_rol',    'Asignar roles a usuarios', 'data'),
  -- Maestro de roles
  ('roles.ver',               'Ver roles', 'data'),
  ('roles.crear',             'Crear roles', 'data'),
  ('roles.editar',            'Editar roles', 'data'),
  ('roles.desactivar',        'Desactivar roles', 'data'),
  ('roles.asignar_permisos',  'Asignar permisos a roles', 'data'),
  -- Maestro de paÃ­ses
  ('paises.ver',              'Ver paÃ­ses', 'data'),
  ('paises.crear',            'Crear paÃ­ses', 'data'),
  ('paises.editar',           'Editar paÃ­ses', 'data'),
  ('paises.desactivar',       'Desactivar paÃ­ses', 'data'),
  -- Maestro de tipos de adquisiciÃ³n
  ('adquisiciones.ver',       'Ver tipos de adquisiciÃ³n', 'data'),
  ('adquisiciones.crear',     'Crear tipos de adquisiciÃ³n', 'data'),
  ('adquisiciones.editar',    'Editar tipos de adquisiciÃ³n', 'data'),
  ('adquisiciones.desactivar','Desactivar tipos de adquisiciÃ³n', 'data'),
  -- Opciones de menÃº
  ('menu.admin',              'Acceso al menÃº de AdministraciÃ³n', 'menu'),
  ('menu.usuarios',           'Acceso al menÃº de Usuarios', 'menu'),
  ('menu.roles',              'Acceso al menÃº de Roles', 'menu'),
  ('menu.paises',             'Acceso al menÃº de PaÃ­ses', 'menu'),
  ('menu.adquisiciones',      'Acceso al menÃº de Tipos de AdquisiciÃ³n', 'menu'),
  ('menu.catalogos',          'Acceso al menÃº de CatÃ¡logos', 'menu'),
  -- Formularios / acciones
  ('form.perfil',             'Acceso al formulario de perfil', 'form'),
  ('accion.eliminar',         'Poder eliminar registros', 'accion')
on conflict (codigo) do nothing;

-- ============================================================
-- PERMISOS por ROL
-- El admin accede a todo: se le asignan todos los permisos existentes.
-- ============================================================
insert into public.rol_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r cross join public.permisos p
where r.nombre = 'admin'
on conflict do nothing;

-- Gerente: gestiÃ³n de datos y maestros (sin asignar roles).
insert into public.rol_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r
join public.permisos p
  on p.codigo in (
    'usuarios.ver','usuarios.crear','usuarios.editar','usuarios.desactivar',
    'roles.ver','paises.ver','paises.crear','paises.editar',
    'adquisiciones.ver','adquisiciones.crear','adquisiciones.editar',
    'menu.admin','menu.usuarios','menu.roles','menu.paises','menu.adquisiciones','menu.catalogos',
    'form.perfil','accion.eliminar'
  )
where r.nombre = 'gerente'
on conflict do nothing;

-- Operador: lectura y escritura de catÃ¡logos (sin eliminar, sin asignar roles).
insert into public.rol_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r
join public.permisos p
  on p.codigo in (
    'usuarios.ver','roles.ver','paises.ver','adquisiciones.ver',
    'menu.usuarios','menu.roles','menu.paises','menu.adquisiciones','menu.catalogos',
    'form.perfil'
  )
where r.nombre = 'operador'
on conflict do nothing;

-- Cliente: sÃ³lo su propio perfil (el resto se valida por RLS/guards).
insert into public.rol_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r
join public.permisos p on p.codigo = 'form.perfil'
where r.nombre = 'cliente'
on conflict do nothing;


-- ======================================================================
-- MIGRACIÓN: 20260828000000_unidades_medida.sql
-- ======================================================================

-- MigraciÃ³n: Tabla de Unidades de Medida y VÃ­nculo con PaÃ­ses

-- 1. Tabla de unidades de medida (Peso, Volumen, Cantidad)
create table if not exists public.unidades_medida (
  id serial primary key,
  codigo varchar(20) not null unique,
  nombre varchar(100) not null,
  tipo varchar(20) not null check (tipo in ('peso', 'volumen', 'cantidad')),
  activo boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Habilitar RLS en unidades_medida
alter table public.unidades_medida enable row level security;

-- PolÃ­ticas de RLS
create policy "Lectura pÃºblica de unidades para autenticados"
  on public.unidades_medida for select
  to authenticated
  using (true);

create policy "Administradores controlan unidades_medida"
  on public.unidades_medida for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 3. AÃ±adir columna unidad_peso_id a la tabla de paÃ­ses si no existe
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'paises' 
    and column_name = 'unidad_peso_id'
  ) then
    alter table public.paises 
    add column unidad_peso_id integer references public.unidades_medida(id) on delete set null;
  end if;
end $$;

-- 4. Sembrar datos iniciales de unidades de medida
-- [INSERT DEMO OMITIDO]

-- 5. Vincular unidad de peso por defecto a los paÃ­ses existentes
-- EE.UU. (LB), Resto de LatinoamÃ©rica por defecto KILOGRAMO (KG)
-- [UPDATE DEMO OMITIDO]

-- [UPDATE DEMO OMITIDO]


-- ======================================================================
-- MIGRACIÓN: 20260828010000_codigo_perfiles.sql
-- ======================================================================

-- MigraciÃ³n: CodificaciÃ³n Consecutiva Secuencial para Perfiles

-- 1. Tabla de configuraciÃ³n del cÃ³digo de perfiles
create table if not exists public.configuracion_codigo_perfil (
  id serial primary key,
  prefijo varchar(10) not null default 'CLI',
  sufijo varchar(10) not null default 'MX',
  consecutivo_actual integer not null default 0,
  updated_at timestamptz default now()
);

-- RLS en configuracion_codigo_perfil
alter table public.configuracion_codigo_perfil enable row level security;

create policy "Lectura pÃºblica de configuraciÃ³n de cÃ³digo"
  on public.configuracion_codigo_perfil for select
  to authenticated
  using (true);

create policy "Administradores editan configuraciÃ³n de cÃ³digo"
  on public.configuracion_codigo_perfil for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 2. Registro inicial de configuraciÃ³n si no existe
insert into public.configuracion_codigo_perfil (prefijo, sufijo, consecutivo_actual)
select 'CLI', 'MX', 0
where not exists (select 1 from public.configuracion_codigo_perfil);

-- 3. AÃ±adir columna 'codigo' a la tabla profiles
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'codigo'
  ) then
    alter table public.profiles add column codigo varchar(50) unique;
  end if;
end $$;

-- 4. FunciÃ³n atÃ³mica para generar el cÃ³digo consecutivo (PREFIJO-000001-SUFIJO)
create or replace function public.generar_codigo_perfil()
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_prefijo text;
  v_sufijo text;
  v_nuevo_num integer;
  v_codigo_final text;
begin
  -- Obtener y actualizar el consecutivo de forma atÃ³mica con bloqueo de fila
  select prefijo, sufijo, consecutivo_actual + 1
  into v_prefijo, v_sufijo, v_nuevo_num
  from public.configuracion_codigo_perfil
  order by id asc
  limit 1
  for update;

  if v_prefijo is null then
    v_prefijo := 'CLI';
    v_sufijo := 'MX';
    v_nuevo_num := 1;
  end if;

  -- Actualizar el contador en la tabla de configuraciÃ³n
  update public.configuracion_codigo_perfil
  set consecutivo_actual = v_nuevo_num,
      updated_at = now()
  where id = (select id from public.configuracion_codigo_perfil order by id asc limit 1);

  -- Formatear con 6 ceros a la izquierda
  v_codigo_final := upper(v_prefijo) || '-' || lpad(v_nuevo_num::text, 6, '0') || '-' || upper(v_sufijo);

  return v_codigo_final;
end;
$$;

-- 5. Trigger en profiles para auto-asignar cÃ³digo si viene nulo
create or replace function public.trg_auto_codigo_perfil()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.codigo is null or trim(new.codigo) = '' then
    new.codigo := public.generar_codigo_perfil();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_codigo_perfil on public.profiles;

create trigger trg_assign_codigo_perfil
  before insert on public.profiles
  for each row
  execute function public.trg_auto_codigo_perfil();

-- 6. Retro-asignar cÃ³digo a perfiles existentes que no tengan cÃ³digo
do $$
declare
  r record;
begin
  for r in select id from public.profiles where codigo is null or trim(codigo) = '' order by created_at asc loop
    update public.profiles
    set codigo = public.generar_codigo_perfil()
    where id = r.id;
  end loop;
end $$;


-- ======================================================================
-- MIGRACIÓN: 20260828020000_opcional_prefijo_sufijo_longitud.sql
-- ======================================================================

-- MigraciÃ³n: Prefijo y Sufijo opcionales y longitud de dÃ­gitos configurable

-- 1. AÃ±adir columna longitud_numero a configuracion_codigo_perfil si no existe
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'configuracion_codigo_perfil' 
    and column_name = 'longitud_numero'
  ) then
    alter table public.configuracion_codigo_perfil 
    add column longitud_numero integer not null default 6;
  end if;
end $$;

-- Permitir prefijo y sufijo como cadenas vacÃ­as u opcionales
alter table public.configuracion_codigo_perfil alter column prefijo drop not null;
alter table public.configuracion_codigo_perfil alter column sufijo drop not null;

-- 2. FunciÃ³n PL/pgSQL actualizada para soportar prefijo/sufijo opcionales y longitud configurable
create or replace function public.generar_codigo_perfil()
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_prefijo text;
  v_sufijo text;
  v_longitud integer;
  v_nuevo_num integer;
  v_num_str text;
  v_codigo_final text;
begin
  -- Obtener configuraciÃ³n actual con bloqueo de fila
  select coalesce(prefijo, ''), coalesce(sufijo, ''), coalesce(longitud_numero, 6), consecutivo_actual + 1
  into v_prefijo, v_sufijo, v_longitud, v_nuevo_num
  from public.configuracion_codigo_perfil
  order by id asc
  limit 1
  for update;

  if v_longitud is null or v_longitud < 1 then
    v_longitud := 6;
  end if;

  -- Actualizar el contador en la tabla de configuraciÃ³n
  update public.configuracion_codigo_perfil
  set consecutivo_actual = v_nuevo_num,
      updated_at = now()
  where id = (select id from public.configuracion_codigo_perfil order by id asc limit 1);

  -- Formatear nÃºmero con relleno dinÃ¡mico de ceros de acuerdo con longitud_numero
  v_num_str := lpad(v_nuevo_num::text, v_longitud, '0');
  v_prefijo := upper(trim(v_prefijo));
  v_sufijo := upper(trim(v_sufijo));

  -- Construir el cÃ³digo segÃºn la presencia de prefijo y sufijo
  if v_prefijo <> '' and v_sufijo <> '' then
    v_codigo_final := v_prefijo || '-' || v_num_str || '-' || v_sufijo;
  elsif v_prefijo <> '' and v_sufijo = '' then
    v_codigo_final := v_prefijo || '-' || v_num_str;
  elsif v_prefijo = '' and v_sufijo <> '' then
    v_codigo_final := v_num_str || '-' || v_sufijo;
  else
    v_codigo_final := v_num_str;
  end if;

  return v_codigo_final;
end;
$$;


-- ======================================================================
-- MIGRACIÓN: 20260828030000_barrido_reconstruir_codigos.sql
-- ======================================================================

-- MigraciÃ³n: FunciÃ³n PL/pgSQL para barrido y reconstrucciÃ³n masiva de cÃ³digos de perfil

create or replace function public.reconstruir_codigos_perfil()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_prefijo text;
  v_sufijo text;
  v_longitud integer;
  v_count integer := 0;
  v_index integer := 0;
  v_num_str text;
  v_codigo_final text;
  r record;
begin
  -- Control de seguridad estricto: Solo administradores pueden ejecutar la reconstrucciÃ³n
  if not public.is_admin() then
    raise exception 'Acceso denegado: Solo el administrador puede realizar el barrido de cÃ³digos de perfil';
  end if;

  -- Obtener la configuraciÃ³n actual
  select coalesce(prefijo, ''), coalesce(sufijo, ''), coalesce(longitud_numero, 6)
  into v_prefijo, v_sufijo, v_longitud
  from public.configuracion_codigo_perfil
  order by id asc
  limit 1;

  if v_longitud is null or v_longitud < 1 then
    v_longitud := 6;
  end if;

  v_prefijo := upper(trim(v_prefijo));
  v_sufijo := upper(trim(v_sufijo));

  -- Recorrer todos los perfiles existentes ordenados cronolÃ³gicamente por su fecha de creaciÃ³n
  for r in select id from public.profiles order by created_at asc, id asc loop
    v_index := v_index + 1;
    v_num_str := lpad(v_index::text, v_longitud, '0');

    -- Construir el nuevo cÃ³digo segÃºn prefijo y sufijo
    if v_prefijo <> '' and v_sufijo <> '' then
      v_codigo_final := v_prefijo || '-' || v_num_str || '-' || v_sufijo;
    elsif v_prefijo <> '' and v_sufijo = '' then
      v_codigo_final := v_prefijo || '-' || v_num_str;
    elsif v_prefijo = '' and v_sufijo <> '' then
      v_codigo_final := v_num_str || '-' || v_sufijo;
    else
      v_codigo_final := v_num_str;
    end if;

    -- Actualizar el cÃ³digo del perfil
    update public.profiles
    set codigo = v_codigo_final,
        updated_at = now()
    where id = r.id;

    v_count := v_count + 1;
  end loop;

  -- Actualizar el contador del consecutivo en la configuraciÃ³n al total de perfiles procesados
  update public.configuracion_codigo_perfil
  set consecutivo_actual = v_count,
      updated_at = now()
  where id = (select id from public.configuracion_codigo_perfil order by id asc limit 1);

  return v_count;
end;
$$;


-- ======================================================================
-- MIGRACIÓN: 20260828040000_zonas_y_tiendas.sql
-- ======================================================================

-- MigraciÃ³n: Tablas public.zonas y public.tiendas para gestiÃ³n de Zonas y CRUD de Tiendas

-- 1. Tabla public.zonas (Maestro de Zonas)
create table if not exists public.zonas (
  id bigint generated by default as identity primary key,
  nombre varchar(100) not null unique,
  descripcion text,
  activo boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Habilitar RLS en zonas
alter table public.zonas enable row level security;

-- PolÃ­ticas de RLS para zonas
drop policy if exists "Zonas visibles para usuarios autenticados" on public.zonas;
create policy "Zonas visibles para usuarios autenticados"
  on public.zonas for select
  to authenticated
  using (true);

drop policy if exists "Zonas gestionables solo por admin" on public.zonas;
create policy "Zonas gestionables solo por admin"
  on public.zonas for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Datos semilla iniciales para zonas
-- [INSERT DEMO OMITIDO]


-- 2. Tabla public.tiendas (CRUD de Tiendas)
create table if not exists public.tiendas (
  id bigint generated by default as identity primary key,
  numero_oficina varchar(50) not null,
  nombre varchar(150) not null,
  supervisor_id uuid references public.profiles(id) on delete set null,
  email varchar(255),
  telefono varchar(50),
  celular varchar(50),
  calle text,
  otra_direccion text,
  pais_id bigint references public.paises(id) on delete set null,
  codigo_postal varchar(20),
  estado varchar(100),
  ciudad varchar(100),
  municipio varchar(100),
  zona_id bigint references public.zonas(id) on delete set null,
  activo boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Habilitar RLS en tiendas
alter table public.tiendas enable row level security;

-- PolÃ­ticas de RLS para tiendas
drop policy if exists "Tiendas visibles para usuarios autenticados" on public.tiendas;
create policy "Tiendas visibles para usuarios autenticados"
  on public.tiendas for select
  to authenticated
  using (true);

drop policy if exists "Tiendas gestionables por usuarios autenticados" on public.tiendas;
create policy "Tiendas gestionables por usuarios autenticados"
  on public.tiendas for all
  to authenticated
  using (true)
  with check (true);


-- ======================================================================
-- MIGRACIÓN: 20260829000000_codigo_tiendas.sql
-- ======================================================================

-- MigraciÃ³n: ConfiguraciÃ³n del NÃºmero de Oficina para Tiendas (SecciÃ³n 12 del PROMPT.md)

-- 1. Tabla public.configuracion_codigo_tienda
create table if not exists public.configuracion_codigo_tienda (
  id bigint generated by default as identity primary key,
  prefijo varchar(20),
  sufijo varchar(20),
  longitud_numero integer not null default 6,
  consecutivo_actual integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Habilitar RLS
alter table public.configuracion_codigo_tienda enable row level security;

-- PolÃ­ticas RLS
drop policy if exists "ConfiguraciÃ³n cÃ³digo tienda visible para autenticados" on public.configuracion_codigo_tienda;
create policy "ConfiguraciÃ³n cÃ³digo tienda visible para autenticados"
  on public.configuracion_codigo_tienda for select
  to authenticated
  using (true);

drop policy if exists "ConfiguraciÃ³n cÃ³digo tienda gestionable solo por admin" on public.configuracion_codigo_tienda;
create policy "ConfiguraciÃ³n cÃ³digo tienda gestionable solo por admin"
  on public.configuracion_codigo_tienda for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Registro semilla por defecto
insert into public.configuracion_codigo_tienda (prefijo, sufijo, longitud_numero, consecutivo_actual)
select 'OFI', null, 6, 0
where not exists (select 1 from public.configuracion_codigo_tienda);

-- 2. FunciÃ³n PL/pgSQL para generar el nÃºmero de oficina secuencial
create or replace function public.generar_numero_oficina()
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_prefijo text;
  v_sufijo text;
  v_longitud integer;
  v_nuevo_num integer;
  v_num_str text;
  v_codigo_final text;
begin
  -- Obtener configuraciÃ³n actual con bloqueo FOR UPDATE
  select coalesce(prefijo, ''), coalesce(sufijo, ''), coalesce(longitud_numero, 6), consecutivo_actual + 1
  into v_prefijo, v_sufijo, v_longitud, v_nuevo_num
  from public.configuracion_codigo_tienda
  order by id asc
  limit 1
  for update;

  if v_longitud is null or v_longitud < 1 then
    v_longitud := 6;
  end if;

  -- Actualizar el contador consecutivo
  update public.configuracion_codigo_tienda
  set consecutivo_actual = v_nuevo_num,
      updated_at = now()
  where id = (select id from public.configuracion_codigo_tienda order by id asc limit 1);

  -- Formatear nÃºmero con relleno de ceros
  v_num_str := lpad(v_nuevo_num::text, v_longitud, '0');
  v_prefijo := upper(trim(v_prefijo));
  v_sufijo := upper(trim(v_sufijo));

  -- Construir nÃºmero segÃºn prefijo y sufijo
  if v_prefijo <> '' and v_sufijo <> '' then
    v_codigo_final := v_prefijo || '-' || v_num_str || '-' || v_sufijo;
  elsif v_prefijo <> '' and v_sufijo = '' then
    v_codigo_final := v_prefijo || '-' || v_num_str;
  elsif v_prefijo = '' and v_sufijo <> '' then
    v_codigo_final := v_num_str || '-' || v_sufijo;
  else
    v_codigo_final := v_num_str;
  end if;

  return v_codigo_final;
end;
$$;

-- 3. Trigger para auto-asignar nÃºmero de oficina si viene nulo o vacÃ­o
create or replace function public.trg_auto_numero_oficina()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.numero_oficina is null or trim(new.numero_oficina) = '' then
    new.numero_oficina := public.generar_numero_oficina();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_numero_oficina on public.tiendas;
create trigger trg_assign_numero_oficina
  before insert on public.tiendas
  for each row
  execute function public.trg_auto_numero_oficina();

-- 4. FunciÃ³n de barrido y reconstrucciÃ³n masiva de nÃºmeros de oficina (Admin Only)
create or replace function public.reconstruir_codigos_tienda()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_prefijo text;
  v_sufijo text;
  v_longitud integer;
  v_count integer := 0;
  v_index integer := 0;
  v_num_str text;
  v_codigo_final text;
  r record;
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado: Solo el administrador puede realizar el barrido de nÃºmeros de oficina de tiendas';
  end if;

  select coalesce(prefijo, ''), coalesce(sufijo, ''), coalesce(longitud_numero, 6)
  into v_prefijo, v_sufijo, v_longitud
  from public.configuracion_codigo_tienda
  order by id asc
  limit 1;

  if v_longitud is null or v_longitud < 1 then
    v_longitud := 6;
  end if;

  v_prefijo := upper(trim(v_prefijo));
  v_sufijo := upper(trim(v_sufijo));

  for r in select id from public.tiendas order by created_at asc, id asc loop
    v_index := v_index + 1;
    v_num_str := lpad(v_index::text, v_longitud, '0');

    if v_prefijo <> '' and v_sufijo <> '' then
      v_codigo_final := v_prefijo || '-' || v_num_str || '-' || v_sufijo;
    elsif v_prefijo <> '' and v_sufijo = '' then
      v_codigo_final := v_prefijo || '-' || v_num_str;
    elsif v_prefijo = '' and v_sufijo <> '' then
      v_codigo_final := v_num_str || '-' || v_sufijo;
    else
      v_codigo_final := v_num_str;
    end if;

    update public.tiendas
    set numero_oficina = v_codigo_final,
        updated_at = now()
    where id = r.id;

    v_count := v_count + 1;
  end loop;

  update public.configuracion_codigo_tienda
  set consecutivo_actual = v_count,
      updated_at = now()
  where id = (select id from public.configuracion_codigo_tienda order by id asc limit 1);

  return v_count;
end;
$$;


-- ======================================================================
-- MIGRACIÓN: 20260829010000_codigo_perfiles_por_rol.sql
-- ======================================================================

-- MigraciÃ³n: ConfiguraciÃ³n de CÃ³digo por ROL para Perfiles y EdiciÃ³n de Rol (Puntos 76 y 77 de PROMPT.md)

-- 1. AÃ±adir columna rol_id a configuracion_codigo_perfil si no existe
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'configuracion_codigo_perfil' 
    and column_name = 'rol_id'
  ) then
    alter table public.configuracion_codigo_perfil 
    add column rol_id bigint references public.roles(id) on delete cascade;

    alter table public.configuracion_codigo_perfil
    add constraint configuracion_codigo_perfil_rol_id_key unique (rol_id);
  end if;
end $$;

-- 2. Insertar configuraciones semilla por defecto para cada rol existente
insert into public.configuracion_codigo_perfil (rol_id, prefijo, sufijo, longitud_numero, consecutivo_actual)
select r.id, 
       case 
         when r.nombre = 'admin' then 'ADM'
         when r.nombre = 'gerente' then 'GER'
         when r.nombre = 'operador' then 'OPE'
         else 'CLI'
       end,
       null, 6, 0
from public.roles r
on conflict (rol_id) do nothing;

-- 3. Actualizar la funciÃ³n generar_codigo_perfil para aceptar p_rol_id
create or replace function public.generar_codigo_perfil(p_rol_id bigint default null)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_config_id bigint;
  v_prefijo text;
  v_sufijo text;
  v_longitud integer;
  v_nuevo_num integer;
  v_num_str text;
  v_codigo_final text;
  v_target_rol_id bigint := p_rol_id;
begin
  -- Si no se pasÃ³ rol_id, usar id del rol 'cliente'
  if v_target_rol_id is null then
    select id into v_target_rol_id from public.roles where nombre = 'cliente' limit 1;
  end if;

  -- Buscar configuraciÃ³n para el rol especificado con bloqueo FOR UPDATE
  select id, coalesce(prefijo, ''), coalesce(sufijo, ''), coalesce(longitud_numero, 6), consecutivo_actual + 1
  into v_config_id, v_prefijo, v_sufijo, v_longitud, v_nuevo_num
  from public.configuracion_codigo_perfil
  where rol_id = v_target_rol_id
  limit 1
  for update;

  -- Fallback si no existe fila para ese rol
  if v_config_id is null then
    select id, coalesce(prefijo, ''), coalesce(sufijo, ''), coalesce(longitud_numero, 6), consecutivo_actual + 1
    into v_config_id, v_prefijo, v_sufijo, v_longitud, v_nuevo_num
    from public.configuracion_codigo_perfil
    order by id asc
    limit 1
    for update;
  end if;

  if v_longitud is null or v_longitud < 1 then
    v_longitud := 6;
  end if;

  if v_nuevo_num is null then
    v_nuevo_num := 1;
  end if;

  -- Actualizar consecutivo en la tabla de configuraciÃ³n
  if v_config_id is not null then
    update public.configuracion_codigo_perfil
    set consecutivo_actual = v_nuevo_num,
        updated_at = now()
    where id = v_config_id;
  end if;

  -- Formatear nÃºmero con ceros a la izquierda
  v_num_str := lpad(v_nuevo_num::text, v_longitud, '0');
  v_prefijo := upper(trim(v_prefijo));
  v_sufijo := upper(trim(v_sufijo));

  if v_prefijo <> '' and v_sufijo <> '' then
    v_codigo_final := v_prefijo || '-' || v_num_str || '-' || v_sufijo;
  elsif v_prefijo <> '' and v_sufijo = '' then
    v_codigo_final := v_prefijo || '-' || v_num_str;
  elsif v_prefijo = '' and v_sufijo <> '' then
    v_codigo_final := v_num_str || '-' || v_sufijo;
  else
    v_codigo_final := v_num_str;
  end if;

  return v_codigo_final;
end;
$$;

-- 4. Actualizar trigger para enviar new.rol_id a generar_codigo_perfil
create or replace function public.trg_auto_codigo_perfil()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.codigo is null or trim(new.codigo) = '' then
    new.codigo := public.generar_codigo_perfil(new.rol_id);
  end if;
  return new;
end;
$$;

-- 5. Actualizar funciÃ³n de reconstrucciÃ³n masiva para soportar reconstrucciÃ³n por rol
create or replace function public.reconstruir_codigos_perfil(p_rol_id bigint default null)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer := 0;
  r_rol record;
  r_prof record;
  v_prefijo text;
  v_sufijo text;
  v_longitud integer;
  v_index integer;
  v_num_str text;
  v_codigo_final text;
  v_config_id bigint;
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado: Solo el administrador puede realizar el barrido de cÃ³digos de perfil';
  end if;

  for r_rol in select id from public.roles where (p_rol_id is null or id = p_rol_id) order by id asc loop
    select id, coalesce(prefijo, ''), coalesce(sufijo, ''), coalesce(longitud_numero, 6)
    into v_config_id, v_prefijo, v_sufijo, v_longitud
    from public.configuracion_codigo_perfil
    where rol_id = r_rol.id
    limit 1;

    if v_config_id is not null then
      v_prefijo := upper(trim(v_prefijo));
      v_sufijo := upper(trim(v_sufijo));
      if v_longitud is null or v_longitud < 1 then v_longitud := 6; end if;

      v_index := 0;
      for r_prof in select id from public.profiles where rol_id = r_rol.id order by created_at asc, id asc loop
        v_index := v_index + 1;
        v_num_str := lpad(v_index::text, v_longitud, '0');

        if v_prefijo <> '' and v_sufijo <> '' then
          v_codigo_final := v_prefijo || '-' || v_num_str || '-' || v_sufijo;
        elsif v_prefijo <> '' and v_sufijo = '' then
          v_codigo_final := v_prefijo || '-' || v_num_str;
        elsif v_prefijo = '' and v_sufijo <> '' then
          v_codigo_final := v_num_str || '-' || v_sufijo;
        else
          v_codigo_final := v_num_str;
        end if;

        update public.profiles
        set codigo = v_codigo_final,
            updated_at = now()
        where id = r_prof.id;

        v_count := v_count + 1;
      end loop;

      update public.configuracion_codigo_perfil
      set consecutivo_actual = v_index,
          updated_at = now()
      where id = v_config_id;
    end if;
  end loop;

  return v_count;
end;
$$;


-- ======================================================================
-- MIGRACIÓN: 20260829020000_cambio_rol_nuevo_codigo.sql
-- ======================================================================

-- MigraciÃ³n: AsignaciÃ³n automÃ¡tica de nuevo cÃ³digo de perfil al cambiar de rol (LÃ­nea 78 del PROMPT.md)

create or replace function public.trg_auto_codigo_perfil()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- 1. Al crear un nuevo perfil si no trae cÃ³digo
  if (TG_OP = 'INSERT' and (new.codigo is null or trim(new.codigo) = '')) then
    new.codigo := public.generar_codigo_perfil(new.rol_id);

  -- 2. Al cambiar el rol_id de un perfil existente, genera un nuevo cÃ³digo consecutivo segÃºn la configuraciÃ³n del nuevo rol
  elsif (TG_OP = 'UPDATE' and old.rol_id is distinct from new.rol_id) then
    new.codigo := public.generar_codigo_perfil(new.rol_id);
  end if;

  return new;
end;
$$;

-- Asegurar que el trigger responda a INSERT y a UPDATE
drop trigger if exists trg_assign_codigo_perfil on public.profiles;

create trigger trg_assign_codigo_perfil
  before insert or update on public.profiles
  for each row
  execute function public.trg_auto_codigo_perfil();


-- ======================================================================
-- MIGRACIÓN: 20260829030000_productos_y_tipos_producto.sql
-- ======================================================================

-- MigraciÃ³n: Tabla de Tipos de Producto y Productos con cÃ³digo PREFIJO-000001 (Puntos 16 y 17)

-- 1. Tabla tipos_producto
create table if not exists public.tipos_producto (
  id bigint generated by default as identity primary key,
  nombre text not null unique,
  prefijo varchar(3) not null,
  descripcion text,
  consecutivo_actual integer not null default 0,
  atributos jsonb not null default '[]'::jsonb,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. FunciÃ³n para generar cÃ³digo consecutivo de producto (PREFIJO-000001)
create or replace function public.generar_codigo_producto(p_tipo_producto_id bigint)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_prefijo text;
  v_nuevo_num integer;
  v_codigo_final text;
begin
  -- Obtener prefijo y consecutivo actual del tipo de producto
  select upper(trim(prefijo)), consecutivo_actual + 1
  into v_prefijo, v_nuevo_num
  from public.tipos_producto
  where id = p_tipo_producto_id;

  if v_prefijo is null or v_prefijo = '' then
    v_prefijo := 'PRD';
  end if;

  if v_nuevo_num is null then
    v_nuevo_num := 1;
  end if;

  -- Actualizar consecutivo en la tabla tipos_producto
  update public.tipos_producto
  set consecutivo_actual = v_nuevo_num,
      updated_at = now()
  where id = p_tipo_producto_id;

  -- Formatear con prefijo de 3 letras y 6 dÃ­gitos numÃ©ricos
  v_codigo_final := v_prefijo || '-' || lpad(v_nuevo_num::text, 6, '0');

  return v_codigo_final;
end;
$$;

-- 3. Tabla productos
create table if not exists public.productos (
  id bigint generated by default as identity primary key,
  codigo text unique not null,
  descripcion text not null,
  tipo_producto_id bigint not null references public.tipos_producto(id) on delete restrict,
  costo numeric(12, 2) not null default 0,
  inventario_minimo numeric(12, 2) not null default 0,
  unidad_medida_id bigint references public.unidades_medida(id) on delete set null,
  atributos_valores jsonb not null default '{}'::jsonb,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Trigger auto-cÃ³digo de productos
create or replace function public.trg_auto_codigo_producto()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (TG_OP = 'INSERT' and (new.codigo is null or trim(new.codigo) = '')) then
    new.codigo := public.generar_codigo_producto(new.tipo_producto_id);
  elsif (TG_OP = 'UPDATE' and old.tipo_producto_id is distinct from new.tipo_producto_id) then
    new.codigo := public.generar_codigo_producto(new.tipo_producto_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_codigo_producto on public.productos;

create trigger trg_assign_codigo_producto
  before insert or update on public.productos
  for each row
  execute function public.trg_auto_codigo_producto();

-- 5. RLS y Permisos
alter table public.tipos_producto enable row level security;
alter table public.productos enable row level security;

drop policy if exists "Lectura de tipos_producto para autenticados" on public.tipos_producto;
create policy "Lectura de tipos_producto para autenticados"
  on public.tipos_producto for select
  to authenticated using (true);

drop policy if exists "Escritura de tipos_producto para autenticados" on public.tipos_producto;
create policy "Escritura de tipos_producto para autenticados"
  on public.tipos_producto for all
  to authenticated using (true);

drop policy if exists "Lectura de productos para autenticados" on public.productos;
create policy "Lectura de productos para autenticados"
  on public.productos for select
  to authenticated using (true);

drop policy if exists "Escritura de productos para autenticados" on public.productos;
create policy "Escritura de productos para autenticados"
  on public.productos for all
  to authenticated using (true);

-- 6. Insertar tipos de producto iniciales
-- [INSERT DEMO OMITIDO]


-- ======================================================================
-- MIGRACIÓN: 20260829050000_grupos_unidades_medida.sql
-- ======================================================================

-- MigraciÃ³n: Tabla grupos_unidad_medida y relaciÃ³n FK con unidades_medida

-- 1. Crear tabla grupos_unidad_medida
create table if not exists public.grupos_unidad_medida (
  id bigint generated by default as identity primary key,
  codigo text not null unique,
  nombre text not null,
  descripcion text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Insertar grupos iniciales
-- [INSERT DEMO OMITIDO]

-- 2. Modificar la tabla unidades_medida para vincular a grupos_unidad_medida
alter table public.unidades_medida drop constraint if exists unidades_medida_tipo_check;

alter table public.unidades_medida 
  add column if not exists grupo_id bigint references public.grupos_unidad_medida(id) on delete restrict;

-- Migrar datos existentes de unidades_medida basados en la columna 'tipo'
-- [UPDATE DEMO OMITIDO]

-- Si quedan nulos, asignar por defecto al grupo CANTIDAD
-- [UPDATE DEMO OMITIDO]

-- 3. RLS para grupos_unidad_medida
alter table public.grupos_unidad_medida enable row level security;

drop policy if exists "Lectura de grupos_unidad_medida para autenticados" on public.grupos_unidad_medida;
create policy "Lectura de grupos_unidad_medida para autenticados"
  on public.grupos_unidad_medida for select
  to authenticated using (true);

drop policy if exists "Escritura de grupos_unidad_medida para autenticados" on public.grupos_unidad_medida;
create policy "Escritura de grupos_unidad_medida para autenticados"
  on public.grupos_unidad_medida for all
  to authenticated using (true);


-- [MIGRACIÓN 20260829060000_tipo_producto_caja.sql OMITIDA: SOLO CONTENÍA DATOS DEMO]


-- ======================================================================
-- MIGRACIÓN: 20260829070000_control_inventario_productos.sql
-- ======================================================================

-- MigraciÃ³n: Agregar columna controla_inventario a la tabla productos

alter table public.productos
  add column if not exists controla_inventario boolean not null default true;

comment on column public.productos.controla_inventario is 'Indica si el producto requiere control de stock e inventario mÃ­nimo';


-- ======================================================================
-- MIGRACIÓN: 20260829080000_seguro_productos.sql
-- ======================================================================

-- MigraciÃ³n: Agregar campos requiere_seguro y porcentaje_seguro a la tabla productos

alter table public.productos
  add column if not exists requiere_seguro boolean not null default false,
  add column if not exists porcentaje_seguro numeric(5, 2) not null default 0;

comment on column public.productos.requiere_seguro is 'Indica si el producto requiere o puede aplicar seguro de envÃ­o/carga';
comment on column public.productos.porcentaje_seguro is 'Porcentaje (%) del valor declarado requerido para el cÃ¡lculo de la prima de seguro';


-- ======================================================================
-- MIGRACIÓN: 20260830090000_maestro_tipos_tarifa.sql
-- ======================================================================

-- MigraciÃ³n: Tabla de Maestro de Tipos de Tarifa

create table if not exists public.tipos_tarifa (
  id bigint generated by default as identity primary key,
  nombre varchar(100) not null unique,
  promocion boolean not null default false,
  numero_productos integer not null default 1 check (numero_productos >= 1),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Habilitar RLS en tipos_tarifa
alter table public.tipos_tarifa enable row level security;

-- PolÃ­ticas de RLS para tipos_tarifa
drop policy if exists "Lectura pÃºblica de tipos de tarifa para autenticados" on public.tipos_tarifa;
create policy "Lectura pÃºblica de tipos de tarifa para autenticados"
  on public.tipos_tarifa for select
  to authenticated
  using (true);

drop policy if exists "Escritura de tipos de tarifa para autenticados" on public.tipos_tarifa;
create policy "Escritura de tipos de tarifa para autenticados"
  on public.tipos_tarifa for all
  to authenticated
  using (true);

-- Sembrar tipos de tarifa iniciales
-- [INSERT DEMO OMITIDO]


-- ======================================================================
-- MIGRACIÓN: 20260830100000_tarifas_ventas.sql
-- ======================================================================

-- MigraciÃ³n: Tabla de Tarifas por Producto, PaÃ­s, Zona y Tipo de Tarifa

create table if not exists public.tarifas (
  id bigint generated by default as identity primary key,
  tipo_tarifa_id bigint not null references public.tipos_tarifa(id) on delete restrict,
  pais_id bigint not null references public.paises(id) on delete restrict,
  zona_id bigint not null references public.zonas(id) on delete restrict,
  producto_id bigint not null references public.productos(id) on delete restrict,
  precio numeric(12, 2) not null default 0 check (precio >= 0),
  descripcion text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_tarifa_combinacion unique (tipo_tarifa_id, pais_id, zona_id, producto_id)
);

-- Habilitar RLS en tarifas
alter table public.tarifas enable row level security;

-- PolÃ­ticas de RLS para tarifas
drop policy if exists "Lectura pÃºblica de tarifas para autenticados" on public.tarifas;
create policy "Lectura pÃºblica de tarifas para autenticados"
  on public.tarifas for select
  to authenticated
  using (true);

drop policy if exists "Escritura de tarifas para autenticados" on public.tarifas;
create policy "Escritura de tarifas para autenticados"
  on public.tarifas for all
  to authenticated
  using (true);


-- ======================================================================
-- MIGRACIÓN: 20260831000000_cedula_venezuela_profiles.sql
-- ======================================================================

-- MigraciÃ³n: Atributo CÃ©dula de Identidad / RIF para Perfiles y Clientes de Venezuela

alter table public.profiles
  add column if not exists cedula text;

comment on column public.profiles.cedula is 'CÃ©dula de Identidad o RIF exclusivo para perfiles pertenecientes a Venezuela (VE)';


-- ======================================================================
-- MIGRACIÓN: 20260831010000_maestro_conceptos_pago.sql
-- ======================================================================

-- MigraciÃ³n: Maestro CRUD de Conceptos y MÃ©todos de Pago

create table if not exists public.conceptos_pago (
  id bigint generated by default as identity primary key,
  nombre varchar(100) not null unique,
  requiere_referencia boolean not null default true,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Habilitar RLS
alter table public.conceptos_pago enable row level security;

drop policy if exists "Lectura pÃºblica de conceptos_pago para autenticados" on public.conceptos_pago;
create policy "Lectura pÃºblica de conceptos_pago para autenticados"
  on public.conceptos_pago for select
  to authenticated
  using (true);

drop policy if exists "Escritura de conceptos_pago para autenticados" on public.conceptos_pago;
create policy "Escritura de conceptos_pago para autenticados"
  on public.conceptos_pago for all
  to authenticated
  using (true);

-- Sembrar conceptos de pago iniciales
-- [INSERT DEMO OMITIDO]


-- ======================================================================
-- MIGRACIÓN: 20260831020000_maestro_cargos_descuentos.sql
-- ======================================================================

-- MigraciÃ³n: Maestro CRUD de Cargos Adicionales y Descuentos

create table if not exists public.cargos_descuentos (
  id bigint generated by default as identity primary key,
  nombre varchar(100) not null unique,
  -- cargo (+) o descuento (-)
  tipo varchar(20) not null check (tipo in ('cargo', 'descuento')),
  monto_defecto numeric(12, 2) not null default 0 check (monto_defecto >= 0),
  es_porcentaje boolean not null default false,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Habilitar RLS
alter table public.cargos_descuentos enable row level security;

drop policy if exists "Lectura pÃºblica de cargos_descuentos para autenticados" on public.cargos_descuentos;
create policy "Lectura pÃºblica de cargos_descuentos para autenticados"
  on public.cargos_descuentos for select
  to authenticated
  using (true);

drop policy if exists "Escritura de cargos_descuentos para autenticados" on public.cargos_descuentos;
create policy "Escritura de cargos_descuentos para autenticados"
  on public.cargos_descuentos for all
  to authenticated
  using (true);

-- Sembrar cargos y descuentos por defecto
-- [INSERT DEMO OMITIDO]


-- ======================================================================
-- MIGRACIÓN: 20260831030000_ventas_y_pagos.sql
-- ======================================================================

-- MigraciÃ³n: Tablas de Ventas, Detalle de Cargos/Descuentos, Pagos Mixtos y Secuencia por PaÃ­s Destino

-- Tabla auxiliar de secuencias numÃ©ricas por paÃ­s de destino
create table if not exists public.secuencias_ventas_pais (
  pais_id integer primary key references public.paises(id) on delete cascade,
  ultimo_numero integer not null default 0
);

-- Tabla principal de Ventas
create table if not exists public.ventas (
  id bigint generated by default as identity primary key,
  codigo_venta varchar(20) not null unique,
  cliente_origen_id uuid not null references public.profiles(id) on delete restrict,
  cliente_destino_id uuid not null references public.profiles(id) on delete restrict,
  producto_id bigint not null references public.productos(id) on delete restrict,
  tarifa_id bigint references public.tarifas(id) on delete set null,
  pais_destino_id integer not null references public.paises(id) on delete restrict,
  zona_id bigint not null references public.zonas(id) on delete restrict,
  peso numeric(10, 2) not null default 0 check (peso >= 0),
  requiere_seguro boolean not null default false,
  valor_declarado numeric(12, 2) not null default 0 check (valor_declarado >= 0),
  porcentaje_seguro_aplicado numeric(5, 2) not null default 0 check (porcentaje_seguro_aplicado >= 0),
  monto_seguro numeric(12, 2) not null default 0 check (monto_seguro >= 0),
  monto_base numeric(12, 2) not null default 0 check (monto_base >= 0),
  monto_subtotal numeric(12, 2) not null default 0 check (monto_subtotal >= 0),
  monto_total_cargos numeric(12, 2) not null default 0 check (monto_total_cargos >= 0),
  monto_total_descuentos numeric(12, 2) not null default 0 check (monto_total_descuentos >= 0),
  monto_total numeric(12, 2) not null default 0 check (monto_total >= 0),
  monto_pagado numeric(12, 2) not null default 0 check (monto_pagado >= 0),
  estatus_venta varchar(20) not null default 'borrador' check (estatus_venta in ('borrador', 'realizada', 'anulada')),
  estatus_pago varchar(20) not null default 'pendiente' check (estatus_pago in ('pendiente', 'parcial', 'pagada')),
  operador_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabla de Cargos/Descuentos asociados a la venta
create table if not exists public.venta_cargos_descuentos (
  id bigint generated by default as identity primary key,
  venta_id bigint not null references public.ventas(id) on delete cascade,
  cargo_descuento_id bigint references public.cargos_descuentos(id) on delete set null,
  nombre varchar(100) not null,
  tipo varchar(20) not null check (tipo in ('cargo', 'descuento')),
  monto numeric(12, 2) not null check (monto >= 0),
  created_at timestamptz not null default now()
);

-- Tabla de Pagos de la Venta (Cobro Mixto)
create table if not exists public.venta_pagos (
  id bigint generated by default as identity primary key,
  venta_id bigint not null references public.ventas(id) on delete cascade,
  concepto_pago_id bigint references public.conceptos_pago(id) on delete set null,
  concepto_nombre varchar(100) not null,
  monto numeric(12, 2) not null check (monto > 0),
  referencia varchar(20),
  created_at timestamptz not null default now()
);

-- Habilitar RLS
alter table public.secuencias_ventas_pais enable row level security;
alter table public.ventas enable row level security;
alter table public.venta_cargos_descuentos enable row level security;
alter table public.venta_pagos enable row level security;

-- PolÃ­ticas RLS
create policy "Lectura de secuencias para autenticados" on public.secuencias_ventas_pais for select to authenticated using (true);
create policy "Escritura de secuencias para autenticados" on public.secuencias_ventas_pais for all to authenticated using (true);

create policy "Lectura de ventas para autenticados" on public.ventas for select to authenticated using (true);
create policy "Escritura de ventas para autenticados" on public.ventas for all to authenticated using (true);

create policy "Lectura de venta_cargos_descuentos para autenticados" on public.venta_cargos_descuentos for select to authenticated using (true);
create policy "Escritura de venta_cargos_descuentos para autenticados" on public.venta_cargos_descuentos for all to authenticated using (true);

create policy "Lectura de venta_pagos para autenticados" on public.venta_pagos for select to authenticated using (true);
create policy "Escritura de venta_pagos para autenticados" on public.venta_pagos for all to authenticated using (true);


-- ======================================================================
-- MIGRACIÓN: 20260831040000_catalogar_todos_los_permisos.sql
-- ======================================================================

-- MigraciÃ³n: Catalogar todos los permisos requeridos para las entidades y mÃ³dulos desarrollados

insert into public.permisos (codigo, descripcion, tipo) values
  -- Unidades de Medida y Grupos
  ('unidades.ver',               'Ver unidades de medida', 'data'),
  ('unidades.crear',             'Crear unidades de medida', 'data'),
  ('unidades.editar',            'Editar unidades de medida', 'data'),
  ('unidades.desactivar',        'Desactivar unidades de medida', 'data'),
  ('grupos_unidades.ver',        'Ver grupos de unidades de medida', 'data'),
  ('grupos_unidades.crear',      'Crear grupos de unidades de medida', 'data'),
  ('grupos_unidades.editar',     'Editar grupos de unidades de medida', 'data'),
  ('grupos_unidades.desactivar', 'Desactivar grupos de unidades de medida', 'data'),

  -- Zonas LogÃ­sticas
  ('zonas.ver',                  'Ver zonas logÃ­sticas', 'data'),
  ('zonas.crear',                'Crear zonas logÃ­sticas', 'data'),
  ('zonas.editar',               'Editar zonas logÃ­sticas', 'data'),
  ('zonas.desactivar',           'Desactivar zonas logÃ­sticas', 'data'),

  -- Tiendas
  ('tiendas.ver',                 'Ver tiendas', 'data'),
  ('tiendas.crear',               'Crear tiendas', 'data'),
  ('tiendas.editar',              'Editar tiendas', 'data'),
  ('tiendas.desactivar',          'Desactivar tiendas', 'data'),

  -- Clientes
  ('clientes.ver',                'Ver clientes', 'data'),
  ('clientes.crear',              'Crear clientes', 'data'),
  ('clientes.editar',             'Editar clientes', 'data'),
  ('clientes.desactivar',         'Desactivar clientes', 'data'),

  -- Tipos de Producto
  ('tipos_producto.ver',         'Ver tipos de producto', 'data'),
  ('tipos_producto.crear',       'Crear tipos de producto', 'data'),
  ('tipos_producto.editar',      'Editar tipos de producto', 'data'),
  ('tipos_producto.desactivar',  'Desactivar tipos de producto', 'data'),

  -- Productos
  ('productos.ver',              'Ver productos', 'data'),
  ('productos.crear',            'Crear productos', 'data'),
  ('productos.editar',           'Editar productos', 'data'),
  ('productos.desactivar',       'Desactivar productos', 'data'),

  -- Tipos de Tarifa
  ('tipos_tarifa.ver',           'Ver tipos de tarifa', 'data'),
  ('tipos_tarifa.crear',         'Crear tipos de tarifa', 'data'),
  ('tipos_tarifa.editar',        'Editar tipos de tarifa', 'data'),
  ('tipos_tarifa.desactivar',    'Desactivar tipos de tarifa', 'data'),

  -- Tarifas de Ventas
  ('tarifas.ver',                'Ver tarifas de ventas', 'data'),
  ('tarifas.crear',              'Crear tarifas de ventas', 'data'),
  ('tarifas.editar',             'Editar tarifas de ventas', 'data'),
  ('tarifas.desactivar',         'Desactivar tarifas de ventas', 'data'),

  -- Conceptos de Pago
  ('conceptos_pago.ver',         'Ver conceptos de pago', 'data'),
  ('conceptos_pago.crear',       'Crear conceptos de pago', 'data'),
  ('conceptos_pago.editar',      'Editar conceptos de pago', 'data'),
  ('conceptos_pago.desactivar',  'Desactivar conceptos de pago', 'data'),

  -- Cargos y Descuentos
  ('cargos_descuentos.ver',        'Ver cargos y descuentos', 'data'),
  ('cargos_descuentos.crear',      'Crear cargos y descuentos', 'data'),
  ('cargos_descuentos.editar',     'Editar cargos y descuentos', 'data'),
  ('cargos_descuentos.desactivar', 'Desactivar cargos y descuentos', 'data'),

  -- MÃ³dulo de Ventas / Operaciones
  ('ventas.ver',                 'Ver operaciones de ventas', 'data'),
  ('ventas.crear',               'Crear operaciones de ventas', 'data'),
  ('ventas.editar',              'Editar operaciones de ventas', 'data'),
  ('ventas.cobrar',              'Registrar cobros y pagos mixtos de ventas', 'data'),
  ('ventas.anular',              'Anular operaciones de ventas', 'data'),

  -- Opciones de MenÃº adicionales
  ('menu.unidades',              'Acceso al menÃº de Unidades de Medida', 'menu'),
  ('menu.zonas',                 'Acceso al menÃº de Zonas LogÃ­sticas', 'menu'),
  ('menu.tiendas',               'Acceso al menÃº de Tiendas', 'menu'),
  ('menu.clientes',              'Acceso al menÃº de Clientes', 'menu'),
  ('menu.productos',             'Acceso al menÃº de Productos', 'menu'),
  ('menu.tipos_tarifa',          'Acceso al menÃº de Tipos de Tarifa', 'menu'),
  ('menu.tarifas',               'Acceso al menÃº de Tarifas de Ventas', 'menu'),
  ('menu.conceptos_pago',        'Acceso al menÃº de Conceptos de Pago', 'menu'),
  ('menu.cargos_descuentos',     'Acceso al menÃº de Cargos y Descuentos', 'menu'),
  ('menu.ventas',                'Acceso al menÃº principal de Ventas', 'menu'),

  -- Formulario / Acciones
  ('form.venta',                 'Acceso al formulario de ventas', 'form'),
  ('accion.exportar_csv',        'Exportar listados a CSV', 'accion')
on conflict (codigo) do nothing;

-- Asignar TODOS los permisos al rol 'admin'
insert into public.rol_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r cross join public.permisos p
where r.nombre = 'admin'
on conflict do nothing;

-- Asignar permisos correspondientes a 'gerente'
insert into public.rol_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r join public.permisos p
  on p.codigo in (
    'tiendas.ver', 'tiendas.crear', 'tiendas.editar',
    'clientes.ver', 'clientes.crear', 'clientes.editar',
    'productos.ver', 'productos.crear', 'productos.editar',
    'tarifas.ver', 'tarifas.crear', 'tarifas.editar',
    'ventas.ver', 'ventas.crear', 'ventas.editar', 'ventas.cobrar',
    'menu.tiendas', 'menu.clientes', 'menu.productos', 'menu.tarifas', 'menu.ventas',
    'form.venta', 'accion.exportar_csv'
  )
where r.nombre = 'gerente'
on conflict do nothing;

-- Asignar permisos correspondientes a 'operador'
insert into public.rol_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r join public.permisos p
  on p.codigo in (
    'clientes.ver', 'clientes.crear',
    'productos.ver',
    'tarifas.ver',
    'ventas.ver', 'ventas.crear', 'ventas.cobrar',
    'menu.clientes', 'menu.productos', 'menu.ventas',
    'form.venta'
  )
where r.nombre = 'operador'
on conflict do nothing;


-- ======================================================================
-- MIGRACIÓN: 20260831050000_configuracion_general.sql
-- ======================================================================

-- Migration: configuracion_general y almacenamiento de branding

-- 1. Tabla public.configuracion_general (Fila Ãºnica id = 1)
create table if not exists public.configuracion_general (
    id integer primary key default 1 check (id = 1),
    
    -- Identidad Corporativa
    nombre_empresa varchar(255) not null default 'LOGISTIC SYSTEM',
    eslogan varchar(255) default 'Soluciones LogÃ­sticas Globales',
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
    moneda_nombre varchar(100) not null default 'DÃ³lares Americanos',
    moneda_simbolo varchar(10) not null default '$',
    moneda_iso varchar(10) not null default 'USD',
    pie_pagina_ticket text default 'Â¡Gracias por preferir nuestros servicios de envÃ­o y encomiendas!',
    terminos_condiciones text default 'El cliente declara que el contenido del envÃ­o cumple con todas las regulaciones vigentes.',

    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS en public.configuracion_general
alter table public.configuracion_general enable row level security;

drop policy if exists "ConfiguraciÃ³n visible para usuarios autenticados" on public.configuracion_general;
create policy "ConfiguraciÃ³n visible para usuarios autenticados"
  on public.configuracion_general for select
  to authenticated
  using (true);

drop policy if exists "ConfiguraciÃ³n editable solo por administradores" on public.configuracion_general;
create policy "ConfiguraciÃ³n editable solo por administradores"
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

-- PolÃ­ticas para Storage Bucket 'branding'
drop policy if exists "Logos visibles pÃºblicamente" on storage.objects;
create policy "Logos visibles pÃºblicamente"
  on storage.objects for select
  to public
  using (bucket_id = 'branding');

drop policy if exists "Logos gestionables por administradores" on storage.objects;
create policy "Logos gestionables por administradores"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'branding' and public.is_admin())
  with check (bucket_id = 'branding' and public.is_admin());

-- 3. Registrar permisos de configuraciÃ³n en la tabla permisos
insert into public.permisos (codigo, descripcion, tipo)
values
  ('menu.configuracion', 'MenÃº ConfiguraciÃ³n del Sistema', 'menu'),
  ('configuracion.ver', 'Ver ConfiguraciÃ³n del Sistema', 'accion'),
  ('configuracion.editar', 'Editar ConfiguraciÃ³n y Apariencia del Sistema', 'accion')
on conflict (codigo) do nothing;

-- Asignar permisos al rol admin por defecto
insert into public.rol_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r
cross join public.permisos p
where r.nombre = 'admin'
  and p.codigo in ('menu.configuracion', 'configuracion.ver', 'configuracion.editar')
on conflict (rol_id, permiso_id) do nothing;


-- ======================================================================
-- MIGRACIÓN: 20260831060000_peso_libre_dimensiones.sql
-- ======================================================================

-- MigraciÃ³n: Columnas para Peso Libre, Dimensiones de Caja y Peso VolumÃ©trico en Ventas

alter table public.ventas
  add column if not exists peso_reportado numeric(10, 2) default 0 check (peso_reportado >= 0),
  add column if not exists alto numeric(10, 2) default 0 check (alto >= 0),
  add column if not exists ancho numeric(10, 2) default 0 check (ancho >= 0),
  add column if not exists largo numeric(10, 2) default 0 check (largo >= 0),
  add column if not exists peso_volumetrico numeric(10, 2) default 0 check (peso_volumetrico >= 0),
  add column if not exists peso_cobrar numeric(10, 2) default 0 check (peso_cobrar >= 0);


-- ======================================================================
-- MIGRACIÓN: 20260902080000_maestro_articulos_y_venta_articulos.sql
-- ======================================================================

-- MigraciÃ³n: Maestro de ArtÃ­culos y Detalle de ArtÃ­culos por Venta

-- 1. Tabla maestro: public.articulos (Contiene catÃ¡logo general de nombres de artÃ­culos)
create table if not exists public.articulos (
  id bigint primary key generated always as identity,
  nombre varchar(255) not null,
  activo boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.articulos enable row level security;

-- PolÃ­ticas de RLS para public.articulos
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

-- PolÃ­ticas de RLS para public.venta_articulos
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

-- 3. Catalogar permisos de ArtÃ­culos
insert into public.permisos (codigo, descripcion, tipo) values
  ('articulos.ver',        'Ver maestro de artÃ­culos', 'data'),
  ('articulos.crear',      'Crear artÃ­culos en el maestro', 'data'),
  ('articulos.editar',     'Editar artÃ­culos en el maestro', 'data'),
  ('articulos.desactivar', 'Desactivar artÃ­culos en el maestro', 'data')
on conflict (codigo) do nothing;

-- 4. Datos Semilla Iniciales (Solo Nombres de ArtÃ­culos)
-- [INSERT DEMO OMITIDO]


-- ======================================================================
-- MIGRACIÓN: 20260902090000_maestro_proveedores_y_tipo_entrega.sql
-- ======================================================================

-- MigraciÃ³n: Maestro de Proveedores y ConfiguraciÃ³n de Tipo de Entrega en Ventas (Domicilio / Oficina Ocurre)

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

-- PolÃ­ticas RLS para public.proveedores
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
-- [INSERT DEMO OMITIDO]


-- ======================================================================
-- MIGRACIÓN: 20260902103000_plantillas_documentos_y_aduana.sql
-- ======================================================================

-- MigraciÃ³n: Plantillas de Documentos (GuÃ­as de Despacho y Declaraciones de Aduana)

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

-- PolÃ­ticas RLS
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
  ('plantillas_documentos.ver',        'Ver diseÃ±ador de plantillas de documentos', 'data'),
  ('plantillas_documentos.crear',      'Crear plantillas de documentos', 'data'),
  ('plantillas_documentos.editar',     'Editar plantillas de documentos', 'data'),
  ('plantillas_documentos.desactivar', 'Desactivar plantillas de documentos', 'data')
on conflict (codigo) do nothing;

-- 3. Plantillas Semilla Iniciales
-- [INSERT DEMO OMITIDO]


-- ======================================================================
-- MIGRACIÓN: 20260902130000_datos_proveedor_guia_y_url.sql
-- ======================================================================

-- MigraciÃ³n: Incorporar NÃºmero de GuÃ­a del Proveedor (Zoom) y URL del Documento generado por la API

alter table public.ventas
  add column if not exists guia_proveedor varchar(255),
  add column if not exists url_documento_proveedor text;


-- ======================================================================
-- MIGRACIÓN: 20260902134500_proveedores_paises_y_guia_manual.sql
-- ======================================================================

-- MigraciÃ³n: AsignaciÃ³n de PaÃ­ses Atendidos por Proveedor de Transporte

-- 1. Tabla de uniÃ³n proveedores_paises
create table if not exists public.proveedores_paises (
  id bigint primary key generated always as identity,
  proveedor_id bigint not null references public.proveedores(id) on delete cascade,
  pais_id bigint not null references public.paises(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(proveedor_id, pais_id)
);

-- Habilitar RLS
alter table public.proveedores_paises enable row level security;

-- PolÃ­ticas RLS
drop policy if exists "Proveedores paÃ­ses visibles para autenticados" on public.proveedores_paises;
drop policy if exists "Proveedores paÃ­ses gestionables por autenticados" on public.proveedores_paises;

create policy "Proveedores paÃ­ses visibles para autenticados"
  on public.proveedores_paises for select
  to authenticated
  using (true);

create policy "Proveedores paÃ­ses gestionables por autenticados"
  on public.proveedores_paises for all
  to authenticated
  using (true);

-- Seed de relaciÃ³n inicial de paÃ­ses para los proveedores existentes
-- [INSERT DEMO OMITIDO]


-- ======================================================================
-- MIGRACIÓN: 20260902170000_ventas_producto_id_nullable.sql
-- ======================================================================

-- MigraciÃ³n: Hacer producto_id opcional (NULLABLE) en la tabla public.ventas para borradores de clientes
alter table public.ventas alter column producto_id drop not null;


-- ======================================================================
-- MIGRACIÓN: 20260913000000_plantillas_wysiwyg_y_roles.sql
-- ======================================================================

-- MigraciÃ³n: AmpliaciÃ³n de Plantillas de Documentos para DiseÃ±ador WYSIWYG y Control de Roles
-- Permite mÃºltiples tipos de documentos (guia, picking, factura, aduana, etiqueta, personalizado)
-- y control de acceso por roles (admin, gerente, operador, cliente).

-- 1. Modificar check constraint de tipo y agregar roles_permitidos
alter table public.plantillas_documentos drop constraint if exists plantillas_documentos_tipo_check;

alter table public.plantillas_documentos 
  add constraint plantillas_documentos_tipo_check 
  check (tipo in ('guia', 'picking', 'factura', 'declaracion_aduana', 'etiqueta', 'personalizado'));

alter table public.plantillas_documentos
  add column if not exists roles_permitidos text[] not null default array['admin', 'gerente', 'operador'];

alter table public.plantillas_documentos
  add column if not exists orientation varchar(20) not null default 'portrait' check (orientation in ('portrait', 'landscape'));

alter table public.plantillas_documentos
  add column if not exists paper_size varchar(20) not null default 'letter' check (paper_size in ('letter', 'a4', 'ticket', 'label_4x6'));

-- 2. Insertar plantillas predeterminadas completas con diseÃ±o enriquecido

-- Plantilla: Picking List & Invoice Comercial
-- [INSERT DEMO OMITIDO]


-- ======================================================================
-- MIGRACIÓN: 20260915180000_sincronizar_permisos_faltantes.sql
-- ======================================================================

-- MigraciÃ³n: Sincronizar catÃ¡logo completo de permisos para ArtÃ­culos, Proveedores y Plantillas de Documentos
-- Fecha: 2026-09-15

insert into public.permisos (codigo, descripcion, tipo) values
  -- Maestro de ArtÃ­culos (Data)
  ('articulos.ver',               'Ver maestro de artÃ­culos', 'data'),
  ('articulos.crear',             'Crear artÃ­culos en el maestro', 'data'),
  ('articulos.editar',            'Editar artÃ­culos en el maestro', 'data'),
  ('articulos.desactivar',        'Desactivar artÃ­culos en el maestro', 'data'),

  -- Opciones de MenÃº adicionales
  ('menu.articulos',              'Acceso al menÃº de Maestro de ArtÃ­culos', 'menu'),
  ('menu.proveedores',            'Acceso al menÃº de Maestro de Proveedores', 'menu'),
  ('menu.plantillas_documentos',  'Acceso al menÃº de Plantillas de Documentos', 'menu')
on conflict (codigo) do nothing;

-- Asignar TODOS los permisos al rol 'admin'
insert into public.rol_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r cross join public.permisos p
where r.nombre = 'admin'
on conflict do nothing;

-- Asignar permisos correspondientes a 'gerente'
insert into public.rol_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r join public.permisos p
  on p.codigo in (
    'articulos.ver', 'articulos.crear', 'articulos.editar',
    'menu.articulos', 'menu.proveedores', 'menu.plantillas_documentos'
  )
where r.nombre = 'gerente'
on conflict do nothing;


-- ======================================================================
-- MIGRACIÓN: 20260916000000_comision_conceptos_pago.sql
-- ======================================================================

-- MigraciÃ³n: Agregar porcentaje_comision a conceptos_pago y columnas de desglose a venta_pagos

-- 1. Columna porcentaje_comision en public.conceptos_pago
alter table public.conceptos_pago
  add column if not exists porcentaje_comision numeric(5, 2) not null default 0;

-- Asegurar restricciÃ³n check
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'check_porcentaje_comision'
  ) then
    alter table public.conceptos_pago
      add constraint check_porcentaje_comision check (porcentaje_comision >= 0 and porcentaje_comision <= 100);
  end if;
end $$;

-- 2. Sembrar o actualizar 'TARJETA DE CRÃ‰DITO' con 5% de comisiÃ³n
-- [INSERT DEMO OMITIDO]

-- 3. Columnas en public.venta_pagos
alter table public.venta_pagos
  add column if not exists porcentaje_comision numeric(5, 2) not null default 0,
  add column if not exists monto_comision numeric(12, 2) not null default 0,
  add column if not exists monto_cobrado numeric(12, 2) not null default 0;

-- Actualizar registros anteriores donde monto_cobrado sea 0
-- [UPDATE DEMO OMITIDO]


-- ======================================================================
-- MIGRACIÓN: 20260920000000_configuracion_general_public_read.sql
-- ======================================================================

-- Migration: Permitir lectura pÃºblica de configuracion_general para que visitantes
-- no autenticados (login, registro) carguen de inmediato los logotipos, nombre de empresa y colores.

drop policy if exists "ConfiguraciÃ³n visible para usuarios autenticados" on public.configuracion_general;
drop policy if exists "ConfiguraciÃ³n visible para todos (pÃºblica)" on public.configuracion_general;

create policy "ConfiguraciÃ³n visible para todos (pÃºblica)"
  on public.configuracion_general for select
  to public
  using (true);


-- ======================================================================
-- MIGRACIÓN: 20260925000000_multiples_cajas_ventas.sql
-- ======================================================================

-- MigraciÃ³n: Soporte para despacho de mÃºltiples cajas por venta y declaraciÃ³n de artÃ­culos por caja
-- Permite que un cliente despache varias cajas en una sola operaciÃ³n de venta

-- 1. Nuevas columnas en public.ventas para registrar control de mÃºltiples cajas
alter table public.ventas add column if not exists es_multiple_cajas boolean not null default false;
alter table public.ventas add column if not exists total_cajas integer not null default 1;
alter table public.ventas add column if not exists cajas_detalle jsonb default '[]'::jsonb;

-- 2. Nueva columna en public.venta_articulos para asociar cada artÃ­culo a su caja correspondiente (ej. '001/003')
alter table public.venta_articulos add column if not exists caja_numero varchar(20) default '001/001';

-- Comentarios explicativos en el catÃ¡logo de base de datos
comment on column public.ventas.es_multiple_cajas is 'Indica si la venta contiene mÃºltiples cajas o bultos';
comment on column public.ventas.total_cajas is 'NÃºmero total de cajas que componen el envÃ­o (ej. 3)';
comment on column public.ventas.cajas_detalle is 'Arreglo JSON con las especificaciones de cada caja (nÃºmero 001/003, tipo tarifa, producto, peso, dimensiones, tarifa y costo base)';
comment on column public.venta_articulos.caja_numero is 'Identificador correlativo de la caja a la que pertenece el artÃ­culo dentro del envÃ­o (ej. 001/003)';


-- [MIGRACIÓN 20260928000000_plantilla_picking_list.sql OMITIDA: SOLO CONTENÍA DATOS DEMO]

-- ==============================================================================
-- CONTROL DE INVENTARIO Y CARGA MÁXIMA DE PRODUCTOS
-- ==============================================================================
alter table public.productos
  add column if not exists stock numeric(12, 2) not null default 0,
  add column if not exists carga_maxima numeric(12, 2) not null default 0;

comment on column public.productos.stock is 'Stock o existencias actuales del producto en almacén';
comment on column public.productos.carga_maxima is 'Capacidad de carga máxima del producto en LB. Si es 0 se usa el tope del país; si es mayor sobreescribe el límite de peso.';

create table if not exists public.inventario_movimientos (
  id bigint generated by default as identity primary key,
  producto_id bigint not null references public.productos(id) on delete cascade,
  tipo_movimiento text not null check (tipo_movimiento in ('entrada', 'salida', 'ajuste')),
  cantidad numeric(12, 2) not null,
  stock_anterior numeric(12, 2) not null default 0,
  stock_nuevo numeric(12, 2) not null default 0,
  referencia text,
  motivo text,
  operador_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.inventario_movimientos is 'Registro de movimientos de inventario (entradas manuales, salidas por ventas y ajustes)';

create index if not exists idx_inv_mov_producto on public.inventario_movimientos(producto_id);
create index if not exists idx_inv_mov_tipo on public.inventario_movimientos(tipo_movimiento);
create index if not exists idx_inv_mov_created_at on public.inventario_movimientos(created_at desc);

alter table public.inventario_movimientos enable row level security;

create policy "inv_mov_select_auth"
  on public.inventario_movimientos
  for select
  to authenticated
  using (true);

create policy "inv_mov_insert_auth"
  on public.inventario_movimientos
  for insert
  to authenticated
  with check (true);
