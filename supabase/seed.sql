-- ============================================================
-- SEED: datos iniciales de la aplicación
-- Proyecto: logistic
-- ============================================================

-- ============================================================
-- ROLES iniciales
-- ============================================================
insert into public.roles (nombre, descripcion)
values
  ('admin',    'Administrador del sistema. Acceso completo.'),
  ('gerente',  'Gerente con permiso de gestión de datos.'),
  ('operador', 'Operador con permisos de lectura/escritura limitados.'),
  ('cliente',  'Cliente / usuario final. Rol por defecto.')
on conflict (nombre) do nothing;

-- ============================================================
-- PERMISOS (catálogo)
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
  -- Maestro de países
  ('paises.ver',              'Ver países', 'data'),
  ('paises.crear',            'Crear países', 'data'),
  ('paises.editar',           'Editar países', 'data'),
  ('paises.desactivar',       'Desactivar países', 'data'),
  -- Maestro de tipos de adquisición
  ('adquisiciones.ver',       'Ver tipos de adquisición', 'data'),
  ('adquisiciones.crear',     'Crear tipos de adquisición', 'data'),
  ('adquisiciones.editar',    'Editar tipos de adquisición', 'data'),
  ('adquisiciones.desactivar','Desactivar tipos de adquisición', 'data'),
  -- Opciones de menú
  ('menu.admin',              'Acceso al menú de Administración', 'menu'),
  ('menu.usuarios',           'Acceso al menú de Usuarios', 'menu'),
  ('menu.roles',              'Acceso al menú de Roles', 'menu'),
  ('menu.paises',             'Acceso al menú de Países', 'menu'),
  ('menu.adquisiciones',      'Acceso al menú de Tipos de Adquisición', 'menu'),
  ('menu.catalogos',          'Acceso al menú de Catálogos', 'menu'),
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

-- Gerente: gestión de datos y maestros (sin asignar roles).
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

-- Operador: lectura y escritura de catálogos (sin eliminar, sin asignar roles).
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

-- Cliente: sólo su propio perfil (el resto se valida por RLS/guards).
insert into public.rol_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r
join public.permisos p on p.codigo = 'form.perfil'
where r.nombre = 'cliente'
on conflict do nothing;

-- ============================================================
-- PAÍSES iniciales (con códigos ISO 2 y 3)
-- limite_peso = 0 indica "sin límite"
-- ============================================================
insert into public.paises (nombre, codigo_iso2, codigo_iso3, limite_peso) values
  ('Estados Unidos', 'US', 'USA', 0),
  ('México',         'MX', 'MEX', 0),
  ('Guatemala',      'GT', 'GTM', 0),
  ('Colombia',       'CO', 'COL', 0),
  ('El Salvador',    'SV', 'SLV', 0),
  ('Honduras',       'HN', 'HND', 0),
  ('Venezuela',      'VE', 'VEN', 0),
  ('Cuba',           'CU', 'CUB', 0),
  ('Nicaragua',      'NI', 'NIC', 0),
  ('Ecuador',        'EC', 'ECU', 0),
  ('Panamá',         'PA', 'PAN', 0),
  ('Chile',          'CL', 'CHL', 0)
on conflict (nombre) do nothing;

-- ============================================================
-- TIPOS DE ADQUISICIÓN iniciales
-- ============================================================
insert into public.tipo_adquisiciones (nombre) values
  ('Web'), ('Facebook'), ('Instagram'), ('Google'), ('SMS'),
  ('Whatsapp'), ('Business'), ('Revista'), ('DropOff'), ('Agencias'), ('Otros')
on conflict (nombre) do nothing;
