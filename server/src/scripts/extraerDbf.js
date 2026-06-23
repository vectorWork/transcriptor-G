import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { separarNombre } from '../utils/nombres.js';

// Extrae CEDULA, NACIONALI y NOMBRE de un DBF (dBASE III, Registro Electoral)
// y los vuelca en un archivo NDJSON (un JSON por línea) listo para importar a
// la colección "datapersons". Lee por bloques para no cargar los ~3GB en RAM.
//
// Uso:
//   npm run extraer:dbf                 (autodetecta el .dbf en /import_db)
//   npm run extraer:dbf -- ruta.dbf salida.ndjson
//   DBF_PATH=... NDJSON_PATH=... npm run extraer:dbf

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../');
const IMPORT_DB_DIR = path.join(REPO_ROOT, 'import_db');

const CAMPOS = ['CEDULA', 'NACIONALI', 'NOMBRE']; // campos que extraemos

function resolverRutaDbf() {
  const explicito = process.argv[2] || process.env.DBF_PATH;
  if (explicito) return path.resolve(explicito);
  const dbfs = fs.readdirSync(IMPORT_DB_DIR).filter((f) => f.toLowerCase().endsWith('.dbf'));
  if (dbfs.length === 0) throw new Error(`No se encontró ningún .dbf en ${IMPORT_DB_DIR}`);
  return path.join(IMPORT_DB_DIR, dbfs[0]);
}

// Lee la cabecera del DBF: nº de registros, tamaños y posición de cada campo.
function leerCabecera(fd) {
  const head = Buffer.alloc(32);
  fs.readSync(fd, head, 0, 32, 0);
  const numRecords = head.readUInt32LE(4);
  const headerLen = head.readUInt16LE(8);
  const recordLen = head.readUInt16LE(10);

  const fieldsBuf = Buffer.alloc(headerLen);
  fs.readSync(fd, fieldsBuf, 0, headerLen, 0);
  let off = 32;
  let disp = 1; // el primer byte de cada registro es la marca de borrado
  const campos = {};
  while (off < headerLen && fieldsBuf[off] !== 0x0d) {
    const name = fieldsBuf.toString('ascii', off, off + 11).replace(/\0.*$/, '').trim();
    const len = fieldsBuf[off + 16];
    campos[name] = { start: disp, len };
    disp += len;
    off += 32;
  }
  return { numRecords, headerLen, recordLen, campos };
}

async function extraer() {
  const rutaDbf = resolverRutaDbf();
  const rutaSalida =
    process.argv[3] || process.env.NDJSON_PATH || path.join(IMPORT_DB_DIR, 'datapersons.ndjson');

  const fd = fs.openSync(rutaDbf, 'r');
  const { numRecords, headerLen, recordLen, campos } = leerCabecera(fd);

  for (const c of CAMPOS) {
    if (!campos[c]) throw new Error(`El DBF no contiene el campo esperado "${c}"`);
  }
  const fCedula = campos.CEDULA;
  const fNacion = campos.NACIONALI;
  const fNombre = campos.NOMBRE;

  console.log(`[extraer:dbf] Origen: ${rutaDbf}`);
  console.log(`[extraer:dbf] Registros declarados: ${numRecords.toLocaleString()}`);
  console.log(`[extraer:dbf] Salida: ${rutaSalida}`);

  const out = fs.createWriteStream(rutaSalida, { encoding: 'utf8' });
  const escribir = (chunk) =>
    out.write(chunk) ? Promise.resolve() : new Promise((res) => out.once('drain', res));

  const sub = (buf, base, campo) =>
    buf.toString('latin1', base + campo.start, base + campo.start + campo.len).trim();

  const BATCH = 5000;
  const block = Buffer.alloc(recordLen * BATCH);
  let pos = headerLen;
  let leidos = 0;
  let escritos = 0;
  let borrados = 0;
  let vacios = 0;

  while (leidos < numRecords) {
    const aLeer = Math.min(BATCH, numRecords - leidos);
    const bytes = fs.readSync(fd, block, 0, aLeer * recordLen, pos);
    if (bytes <= 0) break;
    const recs = Math.floor(bytes / recordLen);

    let lineas = '';
    for (let r = 0; r < recs; r++) {
      const base = r * recordLen;
      if (block[base] === 0x2a) {
        borrados++;
        continue; // registro marcado como borrado
      }
      const cedula = sub(block, base, fCedula).replace(/^0+/, ''); // sin ceros a la izquierda
      const nacionalidad = sub(block, base, fNacion).toUpperCase();
      const { apellidos, nombres } = separarNombre(sub(block, base, fNombre));
      if (!cedula || (!apellidos && !nombres)) {
        vacios++;
        continue;
      }
      lineas += JSON.stringify({ nacionalidad, cedula, nombres, apellidos }) + '\n';
      escritos++;
    }
    if (lineas) await escribir(lineas);

    pos += bytes;
    leidos += recs;
    if (leidos % 500000 < BATCH) {
      console.log(`[extraer:dbf] Procesados ${leidos.toLocaleString()} / ${numRecords.toLocaleString()}…`);
    }
  }

  await new Promise((res) => out.end(res));
  fs.closeSync(fd);
  console.log(
    `[extraer:dbf] Listo. Escritos: ${escritos.toLocaleString()}, ` +
      `borrados omitidos: ${borrados.toLocaleString()}, vacíos omitidos: ${vacios.toLocaleString()}.`
  );
}

extraer().catch((err) => {
  console.error('[extraer:dbf] Error:', err);
  process.exit(1);
});
