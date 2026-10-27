-- Migración: Atributo Cédula de Identidad / RIF para Perfiles y Clientes de Venezuela

alter table public.profiles
  add column if not exists cedula text;

comment on column public.profiles.cedula is 'Cédula de Identidad o RIF exclusivo para perfiles pertenecientes a Venezuela (VE)';
