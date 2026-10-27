-- Migración: Ampliación de Plantillas de Documentos para Diseñador WYSIWYG y Control de Roles
-- Permite múltiples tipos de documentos (guia, picking, factura, aduana, etiqueta, personalizado)
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

-- 2. Insertar plantillas predeterminadas completas con diseño enriquecido

-- Plantilla: Picking List & Invoice Comercial
insert into public.plantillas_documentos (
  nombre,
  tipo,
  encabezado_titulo,
  contenido_html,
  roles_permitidos,
  paper_size,
  orientation,
  es_default,
  activo
) values (
  'Picking List & Invoice Comercial de Paquetería',
  'picking',
  'PICKING LIST & COMMERCIAL INVOICE',
  '<div class="doc-container font-sans text-slate-900 p-4 space-y-4">
  <div class="flex justify-between items-start border-b pb-4">
    <div>
      <h1 class="text-xl font-black text-primary uppercase">{{nombre_empresa}}</h1>
      <p class="text-xs text-slate-600 font-medium">{{direccion_empresa}}</p>
      <p class="text-xs text-slate-600">TEL: {{telefono_empresa}} | {{email_empresa}}</p>
      <p class="text-[10px] font-bold text-primary uppercase">{{eslogan_empresa}}</p>
    </div>
    <div class="text-right flex flex-col items-end">
      {{logo_empresa}}
      <div class="mt-2">{{codigo_barras}}</div>
    </div>
  </div>

  <div class="grid grid-cols-3 gap-2 text-xs border-b pb-2">
    <div><span class="font-bold text-slate-500 text-[10px] block">FECHA:</span><span class="font-bold">{{fecha_emision}}</span></div>
    <div class="text-center"><span class="font-bold text-slate-500 text-[10px] block">HORA:</span><span class="font-bold">{{hora_emision}}</span></div>
    <div class="text-right"><span class="font-bold text-slate-500 text-[10px] block">FACTURA / ID:</span><span class="font-black text-primary">{{codigo_venta}}</span></div>
  </div>

  <div class="grid grid-cols-2 gap-4 text-xs border rounded-lg p-3 bg-slate-50">
    <div class="space-y-1 border-r pr-2">
      <div class="font-black text-[11px] text-primary border-b pb-1">BILL TO (REMITENTE)</div>
      <p class="font-bold text-slate-900">{{remitente_nombre}}</p>
      <p><span class="text-slate-500">DIR:</span> {{remitente_direccion}}</p>
      <p><span class="text-slate-500">CIUDAD/ESTADO:</span> {{remitente_ciudad}}</p>
      <p><span class="text-slate-500">TEL:</span> {{remitente_telefono}}</p>
    </div>
    <div class="space-y-1">
      <div class="font-black text-[11px] text-primary border-b pb-1">SHIP TO (DESTINATARIO) - {{pais_destino}}</div>
      <p class="font-bold text-slate-900">{{consignatario_nombre}}</p>
      <p><span class="text-slate-500">DIR:</span> {{direccion_entrega}}</p>
      <p><span class="text-slate-500">CIUDAD/ESTADO:</span> {{consignatario_ciudad}}</p>
      <p><span class="text-slate-500">TEL:</span> {{consignatario_telefono}}</p>
    </div>
  </div>

  <div class="border rounded-lg overflow-hidden text-xs">
    <table class="w-full text-center divide-y">
      <thead class="bg-slate-100 text-[10px] font-bold uppercase text-slate-700">
        <tr>
          <th class="p-1.5 border-r">PACKER</th>
          <th class="p-1.5 border-r">AGENT</th>
          <th class="p-1.5 border-r">SHIPPING DATE</th>
          <th class="p-1.5 border-r">SHIPPING VIA</th>
          <th class="p-1.5 border-r">QTY</th>
          <th class="p-1.5">CONDITIONS</th>
        </tr>
      </thead>
      <tbody class="text-[11px] font-semibold bg-white">
        <tr>
          <td class="p-1.5 border-r uppercase">{{packer_operador}}</td>
          <td class="p-1.5 border-r uppercase">{{empresa_transporte}}</td>
          <td class="p-1.5 border-r">{{fecha_emision}}</td>
          <td class="p-1.5 border-r uppercase">{{tipo_entrega}}</td>
          <td class="p-1.5 border-r">1</td>
          <td class="p-1.5 uppercase font-bold text-primary">{{condiciones_pago}}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="border rounded-lg overflow-hidden text-xs">
    <table class="w-full text-left">
      <thead class="bg-slate-100 text-[10px] font-bold uppercase text-slate-700 border-b">
        <tr>
          <th class="p-2">INVOICE</th>
          <th class="p-2">BOX SIZE / PRODUCTO</th>
          <th class="p-2 text-center">PAQUETERÍA</th>
          <th class="p-2 text-center">PESO</th>
          <th class="p-2 text-right">TOTAL</th>
        </tr>
      </thead>
      <tbody class="divide-y text-[11px] bg-white">
        <tr>
          <td class="p-2 font-bold text-primary">{{codigo_venta}}</td>
          <td class="p-2 uppercase font-semibold">[{{producto_codigo}}] {{producto_descripcion}}</td>
          <td class="p-2 text-center uppercase">{{empresa_transporte}}</td>
          <td class="p-2 text-center font-bold">{{peso_facturable}} LB</td>
          <td class="p-2 text-right font-bold">${{monto_base}}</td>
        </tr>
        <tr>
          <td class="p-2"></td>
          <td class="p-2" colspan="3">Seguro de Carga (Declarado: ${{valor_declarado}})</td>
          <td class="p-2 text-right font-bold">${{monto_seguro}}</td>
        </tr>
        <tr class="bg-slate-100/80 font-bold">
          <td colspan="3" class="p-2 text-right uppercase text-slate-700">TOTAL FACTURADO:</td>
          <td colspan="2" class="p-2 text-right font-black text-emerald-600 text-sm">${{monto_total}}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="border rounded-lg p-3 bg-slate-50 text-[10px] space-y-1 text-slate-700 leading-relaxed">
    <p class="font-bold text-primary uppercase">AVISO IMPORTANTE / IMPORTANT NOTICE:</p>
    <p>1. Revisión y Reclamos: Por favor revise sus cajas y paquetes al momento de recibir o en un plazo máximo de 3 días hábiles.</p>
    <p>2. Aduanas: Los pagos son por concepto de logística y flete. Tributos o aforos extraordinarios corresponden al cliente.</p>
    <p>3. Seguro: Cobertura por extravío total de cajas estándar hasta $500. Empaque frágil es responsabilidad del remitente.</p>
  </div>

  <div class="pt-6 border-t">{{firmas_conformidad}}</div>
</div>',
  array['admin', 'gerente', 'operador'],
  'letter',
  'portrait',
  false,
  true
),

-- Plantilla: Guía de Paquetería / Shipping Label con Código de Barras
(
  'Guía de Paquetería con Código de Barras 1D',
  'etiqueta',
  'GUÍA DE PAQUETERÍA / SHIPPING LABEL',
  '<div class="doc-container font-sans text-slate-900 p-6 space-y-6">
  <div class="text-center border-b pb-4 space-y-1">
    {{logo_empresa}}
    <h1 class="text-2xl font-black text-primary uppercase">{{nombre_empresa}}</h1>
    <p class="text-xs font-bold uppercase text-slate-600">{{eslogan_empresa}}</p>
  </div>

  <div class="grid grid-cols-2 gap-6 border-b pb-6">
    <div class="space-y-4 border-r pr-4">
      <div>
        <span class="font-black text-base uppercase text-slate-900 border-b-2 border-slate-900 pb-0.5 inline-block">BILL TO (REMITENTE):</span>
        <p class="font-black text-base uppercase text-slate-800 pt-1">{{remitente_nombre}}</p>
        <p class="font-bold text-sm text-slate-700">TEL: {{remitente_telefono}}</p>
      </div>

      <div class="pt-2">
        <span class="font-black text-base uppercase text-slate-900 border-b-2 border-slate-900 pb-0.5 inline-block">SHIP TO (DESTINATARIO):</span>
        <p class="font-black text-base uppercase text-slate-900 pt-1">{{consignatario_nombre}}</p>
        <p class="font-bold text-sm uppercase text-slate-800">{{direccion_entrega}}</p>
        <p class="font-bold text-sm uppercase text-slate-700">{{consignatario_ciudad}}</p>
        <p class="font-black text-sm uppercase text-primary">DESTINO: {{pais_destino}}</p>
        <p class="font-bold text-sm text-slate-700">TEL: {{consignatario_telefono}}</p>
      </div>
    </div>

    <div class="space-y-4 flex flex-col justify-between">
      <div class="border rounded-xl p-3 bg-slate-50 text-center">
        <span class="font-bold text-xs uppercase text-slate-600 block">OBSERVACIÓN:</span>
        <span class="font-black text-sm uppercase text-primary block">{{tipo_entrega}} (NORMAL)</span>
      </div>

      <div class="space-y-2 text-sm font-semibold">
        <div class="flex justify-between border-b pb-1"><span class="text-slate-600">TAMAÑO/PRODUCTO:</span><span class="font-bold uppercase">{{producto_descripcion}}</span></div>
        <div class="flex justify-between border-b pb-1"><span class="text-slate-600">PESO:</span><span class="font-black text-slate-900">{{peso_facturable}} LBS</span></div>
        <div class="flex justify-between border-b pb-1"><span class="text-slate-600">FECHA:</span><span class="font-bold">{{fecha_emision}}</span></div>
        <div class="flex justify-between border-b pb-1"><span class="text-slate-600">PAQUETERÍA:</span><span class="font-black uppercase text-primary">{{empresa_transporte}}</span></div>
      </div>
    </div>
  </div>

  <div class="text-center space-y-1">
    <span class="text-xs font-bold uppercase text-slate-500">TRACKING / INVOICE ID</span>
    <h2 class="text-2xl font-black font-mono text-primary">{{codigo_venta}}</h2>
  </div>

  <div class="flex justify-center p-3 border rounded-xl bg-white">{{codigo_barras}}</div>
</div>',
  array['admin', 'gerente', 'operador'],
  'letter',
  'portrait',
  false,
  true
)
on conflict do nothing;
