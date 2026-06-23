import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { DataPerson } from '../models/DataPerson.js';
import { Registro } from '../models/Registro.js';

// Crea/llena la colección "datapersons":
//   1) Importa el NDJSON extraído del DBF (npm run extraer:dbf).
//   2) Copia los registros existentes (Registro) a datapersons.
// En ambos pasos deduplica por { nacionalidad, cedula } usando $setOnInsert:
// si la persona ya existe NO se sobrescribe; si no existe, se inserta.
//
// Uso:
//   npm run importar:datapersons                 (NDJSON en /import_db/datapersons.ndjson)
//   npm run importar:datapersons -- ruta.ndjson

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../');
const NDJSON_DEFAULT = path.join(REPO_ROOT, 'import_db', 'datapersons.ndjson');

const BATCH = 5000;

function opUpsert({ nacionalidad, cedula, nombres, apellidos }) {
  return {
    updateOne: {
      filter: { nacionalidad, cedula },
      update: { $setOnInsert: { nacionalidad, cedula, nombres: nombres || '', apellidos: apellidos || '' } },
      upsert: true,
    },
  };
}

async function aplicar(ops) {
  if (ops.length === 0) return 0;
  const res = await DataPerson.bulkWrite(ops, { ordered: false });
  return res.upsertedCount || 0;
}

async function importarNdjson(ruta) {
  if (!fs.existsSync(ruta)) {
    console.warn(`[importar:datapersons] NDJSON no encontrado (${ruta}); se omite el paso del DBF.`);
    return;
  }
  console.log(`[importar:datapersons] Importando NDJSON: ${ruta}`);
  const rl = readline.createInterface({
    input: fs.createReadStream(ruta, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let ops = [];
  let leidas = 0;
  let insertadas = 0;
  for await (const linea of rl) {
    const txt = linea.trim();
    if (!txt) continue;
    let doc;
    try {
      doc = JSON.parse(txt);
    } catch {
      continue; // línea corrupta: la saltamos
    }
    if (!doc.nacionalidad || !doc.cedula) continue;
    ops.push(opUpsert(doc));
    leidas++;
    if (ops.length >= BATCH) {
      insertadas += await aplicar(ops);
      ops = [];
      if (leidas % 500000 < BATCH) {
        console.log(`[importar:datapersons] NDJSON: ${leidas.toLocaleString()} leídas, ${insertadas.toLocaleString()} nuevas…`);
      }
    }
  }
  insertadas += await aplicar(ops);
  console.log(`[importar:datapersons] NDJSON listo. Leídas: ${leidas.toLocaleString()}, nuevas: ${insertadas.toLocaleString()}.`);
}

async function copiarRegistros() {
  console.log('[importar:datapersons] Copiando registros existentes…');
  const cursor = Registro.find({}, 'idPrefijo idNumero nombres apellidos').lean().cursor();
  let ops = [];
  let leidos = 0;
  let insertados = 0;
  for await (const r of cursor) {
    if (!r.idPrefijo || !r.idNumero) continue;
    ops.push(
      opUpsert({ nacionalidad: r.idPrefijo, cedula: r.idNumero, nombres: r.nombres, apellidos: r.apellidos })
    );
    leidos++;
    if (ops.length >= BATCH) {
      insertados += await aplicar(ops);
      ops = [];
    }
  }
  insertados += await aplicar(ops);
  console.log(`[importar:datapersons] Registros listos. Revisados: ${leidos.toLocaleString()}, nuevos: ${insertados.toLocaleString()}.`);
}

async function main() {
  const ruta = process.argv[2] || process.env.NDJSON_PATH || NDJSON_DEFAULT;
  await connectDB();
  await DataPerson.syncIndexes(); // garantiza el índice único { nacionalidad, cedula }

  await importarNdjson(ruta);
  await copiarRegistros();

  const total = await DataPerson.estimatedDocumentCount();
  console.log(`[importar:datapersons] Total en datapersons: ${total.toLocaleString()}.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[importar:datapersons] Error:', err);
  process.exit(1);
});
