-- Migración: Catalogar todos los permisos requeridos para las entidades y módulos desarrollados

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

  -- Zonas Logísticas
  ('zonas.ver',                  'Ver zonas logísticas', 'data'),
  ('zonas.crear',                'Crear zonas logísticas', 'data'),
  ('zonas.editar',               'Editar zonas logísticas', 'data'),
  ('zonas.desactivar',           'Desactivar zonas logísticas', 'data'),

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

  -- Módulo de Ventas / Operaciones
  ('ventas.ver',                 'Ver operaciones de ventas', 'data'),
  ('ventas.crear',               'Crear operaciones de ventas', 'data'),
  ('ventas.editar',              'Editar operaciones de ventas', 'data'),
  ('ventas.cobrar',              'Registrar cobros y pagos mixtos de ventas', 'data'),
  ('ventas.anular',              'Anular operaciones de ventas', 'data'),

  -- Opciones de Menú adicionales
  ('menu.unidades',              'Acceso al menú de Unidades de Medida', 'menu'),
  ('menu.zonas',                 'Acceso al menú de Zonas Logísticas', 'menu'),
  ('menu.tiendas',               'Acceso al menú de Tiendas', 'menu'),
  ('menu.clientes',              'Acceso al menú de Clientes', 'menu'),
  ('menu.productos',             'Acceso al menú de Productos', 'menu'),
  ('menu.tipos_tarifa',          'Acceso al menú de Tipos de Tarifa', 'menu'),
  ('menu.tarifas',               'Acceso al menú de Tarifas de Ventas', 'menu'),
  ('menu.conceptos_pago',        'Acceso al menú de Conceptos de Pago', 'menu'),
  ('menu.cargos_descuentos',     'Acceso al menú de Cargos y Descuentos', 'menu'),
  ('menu.ventas',                'Acceso al menú principal de Ventas', 'menu'),

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
