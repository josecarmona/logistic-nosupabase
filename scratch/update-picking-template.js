import { createClient } from '@supabase/supabase-js';
import { PICKING_LIST_TEMPLATE_HTML } from '../src/lib/services/documentTemplate.js';

const supabase = createClient(
  'https://kjgxmgcginyzxjcafmkb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZ3htZ2NnaW55enhqY2FmbWtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzg5ODUyOSwiZXhwIjoyMTAzNDc0NTI5fQ.dJxzgBnKWoFH9i-fgKfUH63ITIaPo-CNw3MbjfacyKI'
);

async function main() {
  console.log('Actualizando o insertando plantilla PickingList...');

  // Verificar si existe plantilla con nombre PickingList o id 3
  const { data: existing } = await supabase
    .from('plantillas_documentos')
    .select('id, nombre, tipo')
    .or('nombre.eq.PickingList,tipo.eq.picking')
    .maybeSingle();

  if (existing) {
    console.log('Plantilla encontrada con ID:', existing.id, 'Actualizando a PickingList...');
    const { data, error } = await supabase
      .from('plantillas_documentos')
      .update({
        nombre: 'PickingList',
        tipo: 'picking',
        encabezado_titulo: 'LISTA DE EMPAQUE / PACKING LIST',
        contenido_html: PICKING_LIST_TEMPLATE_HTML,
        paper_size: 'letter',
        orientation: 'portrait',
        roles_permitidos: ['admin', 'gerente', 'operador'],
        es_default: true,
        activo: true
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando:', error);
    } else {
      console.log('¡Plantilla PickingList actualizada con éxito! ID:', data.id);
    }
  } else {
    console.log('Insertando nueva plantilla PickingList...');
    const { data, error } = await supabase
      .from('plantillas_documentos')
      .insert({
        nombre: 'PickingList',
        tipo: 'picking',
        encabezado_titulo: 'LISTA DE EMPAQUE / PACKING LIST',
        contenido_html: PICKING_LIST_TEMPLATE_HTML,
        paper_size: 'letter',
        orientation: 'portrait',
        roles_permitidos: ['admin', 'gerente', 'operador'],
        es_default: true,
        activo: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error insertando:', error);
    } else {
      console.log('¡Plantilla PickingList creada con éxito! ID:', data.id);
    }
  }
}

main();
