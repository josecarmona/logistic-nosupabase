import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kjgxmgcginyzxjcafmkb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZ3htZ2NnaW55enhqY2FmbWtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzg5ODUyOSwiZXhwIjoyMTAzNDc0NTI5fQ.dJxzgBnKWoFH9i-fgKfUH63ITIaPo-CNw3MbjfacyKI'
);

async function main() {
  const { data, error } = await supabase.from('plantillas_documentos').select('id, nombre, tipo, es_default, activo, orientation, paper_size');
  console.log('PLANTILLAS:', JSON.stringify(data, null, 2));
  if (error) console.error('ERROR:', error);
}

main();
