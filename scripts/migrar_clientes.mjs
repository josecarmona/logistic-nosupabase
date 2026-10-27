import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Cargar .env manualmente
const envPath = path.resolve(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.error('ERROR: No se encontró el archivo .env en la raíz del proyecto.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

// 2. Parámetros de ejecución
const args = process.argv.slice(2);
const isPilot = args.includes('--pilot');
const pilotLimit = isPilot ? (parseInt(args[args.indexOf('--pilot') + 1], 10) || 100) : Infinity;

const urlArgIdx = args.indexOf('--url');
const keyArgIdx = args.indexOf('--key');

const SUPABASE_URL = (urlArgIdx !== -1 ? args[urlArgIdx + 1] : null) || process.env.TARGET_SUPABASE_URL || env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = (keyArgIdx !== -1 ? args[keyArgIdx + 1] : null) || process.env.TARGET_SUPABASE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están definidos.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

console.log('====================================================');
console.log('   MIGRACIÓN DE CLIENTES A SUPABASE');
console.log('====================================================');
console.log(`Destino: ${SUPABASE_URL}`);
console.log(`Modo: ${isPilot ? `PILOTO (${pilotLimit} registros)` : 'MIGRACIÓN COMPLETA'}`);
console.log('====================================================\n');

// 3. Tablas de mapeo de catálogos
const COUNTRY_MAP = {
  'USA': 1, 'usa': 1, 'Est': 1, 'EST': 1, 'US': 1,
  'MEX': 2, 'mex': 2, 'MX': 2,
  'GTM': 3, 'gtm': 3, 'GT': 3,
  'COL': 4, 'col': 4, 'CO': 4,
  'SLV': 5, 'slv': 5, 'SV': 5,
  'HND': 6, 'hnd': 6, 'HN': 6,
  'VEN': 7, 'Ven': 7, 'VE': 7, 'ven': 7,
  'CUB': 8, 'cub': 8, 'CU': 8,
  'NIC': 9, 'nic': 9, 'NI': 9,
  'ECU': 10, 'ecu': 10, 'EC': 10,
  'PAN': 11, 'pan': 11, 'PA': 11,
  'CHL': 12, 'chl': 12, 'CL': 12
};

const ADQUISICION_MAP = {
  'Web': 1,
  'Facebook': 2,
  'Instagram': 3,
  'Google': 4,
  'SMS': 5,
  'Whatsapp': 6,
  'Business': 7,
  'Revista': 8,
  'DropOff': 9,
  'Agencias': 10,
  'Otro': 11,
  'Otros': 11
};

async function runMigration() {
  // Pre-verificación de esquema
  console.log('🔍 Verificando estructura previa en Supabase...');
  const { error: testColErr } = await supabase.from('profiles').select('id, id_antiguo').limit(1);
  if (testColErr) {
    console.error(`\n❌ ERROR: Falta la columna 'id_antiguo' en public.profiles: ${testColErr.message}`);
    console.error('Ejecuta el script SQL de migración en Supabase antes de continuar.\n');
    process.exit(1);
  }

  // Pre-verificar inserción nula de email
  const { data: testNull, error: testNullErr } = await supabase.from('profiles').insert({
    nombre_completo: 'TEST VERIFICACION INICIAL TEMPORAL',
    email: null,
    rol_id: 4
  }).select();

  if (testNullErr) {
    console.error(`\n❌ ERROR: La columna 'email' aún tiene restricción NOT NULL: ${testNullErr.message}`);
    console.error('Ejecuta en Supabase: ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;\n');
    process.exit(1);
  } else if (testNull?.[0]?.id) {
    await supabase.from('profiles').delete().eq('id', testNull[0].id);
  }

  console.log('✅ Esquema validado con éxito. Iniciando lectura del archivo...\n');

  const filePath = path.resolve(__dirname, '../datos_old/clientes.json');
  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: Archivo no encontrado: ${filePath}`);
    process.exit(1);
  }

  const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const seenCodes = new Set();
  const seenEmails = new Set();
  const seenCloneSignatures = new Set();

  const BATCH_SIZE = 1000;
  let batch = [];
  let totalRead = 0;
  let totalInserted = 0;
  let totalClonesSkipped = 0;
  let totalEmailDuplicatesCleaned = 0;
  let batchNumber = 0;

  const startTime = Date.now();

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{"id":')) continue;

    let jsonStr = trimmed.endsWith(',') ? trimmed.slice(0, -1) : trimmed;
    let row;
    try {
      row = JSON.parse(jsonStr);
    } catch {
      continue;
    }

    totalRead++;

    // 1. Manejo de clones idénticos
    const cloneSig = `${(row.contactName || '').trim()}|${(row.cellPhone || '').trim()}|${(row.address1 || '').trim()}|${(row.city || '').trim()}`;
    if (seenCloneSignatures.has(cloneSig)) {
      totalClonesSkipped++;
      continue;
    }
    seenCloneSignatures.add(cloneSig);

    // 2. Normalización de Código de Cliente
    let codigo = (row.customerNumber || '').trim();
    const idNum = parseInt(row.id, 10);

    // Corrección específica de colisión histórica conocida (ID 141367)
    if (idNum === 141367 && codigo === 'C008966') {
      codigo = 'C141367';
    }

    if (!codigo || seenCodes.has(codigo)) {
      codigo = `C${String(idNum).padStart(6, '0')}`;
    }
    seenCodes.add(codigo);

    // 3. Normalización de Nombre y Razón Social
    const nombre_completo = (row.contactName || '').trim().toUpperCase() || 'CLIENTE SIN NOMBRE';
    let razon_social = (row.corporateName || '').trim().toUpperCase();
    if (razon_social === nombre_completo || ['-', '--', '---', '.', '..', '...'].includes(razon_social) || !razon_social) {
      razon_social = null;
    }

    // 4. Normalización de Email
    let email = (row.email || '').trim().toLowerCase();
    if (!email || !email.includes('@') || email.length < 5) {
      email = null;
    } else if (seenEmails.has(email)) {
      totalEmailDuplicatesCleaned++;
      email = null; // Evitar colisión de restricción UNIQUE en los pocos emails repetidos
    } else {
      seenEmails.add(email);
    }

    // 5. Normalización de Teléfonos
    let numero_celular = (row.cellPhone || '').replace(/[^\d+]/g, '').trim() || null;
    let telefono = (row.phoneNumber || '').replace(/[^\d+]/g, '').trim() || null;

    // 6. Normalización de Cédula
    let cedula = (row.cedula || '').trim().toUpperCase();
    if (!cedula || cedula === '0' || cedula === '00' || cedula === 'S/C') {
      cedula = null;
    }

    // 7. Normalización de Direcciones
    const direccion_1 = (row.address1 || '').trim().toUpperCase() || null;
    const direccion_2 = (row.address2 || '').trim().toUpperCase() || null;
    const ciudad = (row.city || '').trim().toUpperCase() || null;
    const estado = (row.state || '').trim().toUpperCase() || null;
    const municipio = (row.neighborhood || '').trim().toUpperCase() || null;
    const codigo_postal = (row.zipCode || '').trim() || null;

    // 8. Catálogos
    const pais_id = COUNTRY_MAP[row.country] || null;
    const tipo_adquisicion_id = ADQUISICION_MAP[row.adquisicion] || null;

    // 9. Referencia
    let referencia = (row.reference || '').trim();
    const cual = (row.cual || '').trim();
    if (cual && cual !== 'DATA INICIAL' && cual !== referencia) {
      referencia = referencia ? `${referencia} - ${cual}` : cual;
    }
    referencia = referencia || null;

    // Fila estructurada
    batch.push({
      id_antiguo: idNum,
      codigo,
      nombre_completo,
      razon_social,
      email,
      direccion_1,
      direccion_2,
      ciudad,
      estado,
      municipio,
      codigo_postal,
      numero_celular,
      telefono,
      cedula,
      pais_id,
      tipo_adquisicion_id,
      referencia,
      rol_id: 4, // Cliente
      activo: true
    });

    // Envío por lotes
    if (batch.length >= BATCH_SIZE) {
      batchNumber++;
      await insertBatch(batch, batchNumber);
      totalInserted += batch.length;
      batch = [];

      if (isPilot && totalInserted >= pilotLimit) {
        break;
      }
    }
  }

  // Insertar remanente si queda
  if (batch.length > 0 && (!isPilot || totalInserted < pilotLimit)) {
    batchNumber++;
    await insertBatch(batch, batchNumber);
    totalInserted += batch.length;
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n====================================================');
  console.log('   RESULTADO DE LA MIGRACIÓN');
  console.log('====================================================');
  console.log(`⏱️  Tiempo transcurrido: ${durationSec} segundos`);
  console.log(`📥  Registros leídos: ${totalRead}`);
  console.log(`🔄  Clones omitidos: ${totalClonesSkipped}`);
  console.log(`📧  Emails duplicados convertidos a NULL: ${totalEmailDuplicatesCleaned}`);
  console.log(`✅  Registros insertados/actualizados: ${totalInserted}`);
  console.log('====================================================\n');
}

async function insertBatch(items, num) {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      const { error } = await supabase
        .from('profiles')
        .upsert(items, { onConflict: 'id_antiguo' });

      if (error) {
        throw error;
      }

      process.stdout.write(`\r🚀 Lote #${num}: ${items.length} clientes procesados...`);
      return;
    } catch (err) {
      console.error(`\n⚠️  Error en lote #${num} (intento ${attempts}/${maxAttempts}):`, err.message);
      if (attempts >= maxAttempts) {
        console.error(`❌ Fallo crítico en lote #${num}. Deteniendo proceso para resguardar integridad.`);
        throw err;
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

runMigration().catch(err => {
  console.error('\n❌ Proceso terminado con errores:', err);
  process.exit(1);
});
