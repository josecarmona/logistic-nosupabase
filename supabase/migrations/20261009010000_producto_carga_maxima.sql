-- Migración: Adición del campo carga_maxima a la tabla productos
-- Permite especificar una capacidad de carga máxima por producto.
-- Si el valor es 0, se usa el tope del país destino.
-- Si es mayor que el del país, sobreescribe y se convierte en el tope máximo de peso permitido.

alter table public.productos
  add column if not exists carga_maxima numeric(12, 2) not null default 0;

comment on column public.productos.carga_maxima is 'Capacidad de carga máxima del producto en LB. Si es 0 se usa el tope del país destino; si es mayor que el del país sobreescribe el límite de peso.';
