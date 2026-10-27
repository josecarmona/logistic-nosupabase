-- Migración: Sincronizar catálogo completo de permisos para Artículos, Proveedores y Plantillas de Documentos
-- Fecha: 2026-09-15

insert into public.permisos (codigo, descripcion, tipo) values
  -- Maestro de Artículos (Data)
  ('articulos.ver',               'Ver maestro de artículos', 'data'),
  ('articulos.crear',             'Crear artículos en el maestro', 'data'),
  ('articulos.editar',            'Editar artículos en el maestro', 'data'),
  ('articulos.desactivar',        'Desactivar artículos en el maestro', 'data'),

  -- Opciones de Menú adicionales
  ('menu.articulos',              'Acceso al menú de Maestro de Artículos', 'menu'),
  ('menu.proveedores',            'Acceso al menú de Maestro de Proveedores', 'menu'),
  ('menu.plantillas_documentos',  'Acceso al menú de Plantillas de Documentos', 'menu')
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
