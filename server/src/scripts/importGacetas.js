import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { PDFDocument } from 'pdf-lib';
import { connectDB } from '../config/db.js';
import { guardarPdf } from '../services/gridfsStorage.js';
import { Gaceta } from '../models/Gaceta.js';

// Carpeta-repositorio de PDFs (se monta como volumen en docker-compose).
const IMPORT_DIR = process.env.IMPORT_DIR || '/import';

async function contarPaginas(buffer) {
  try {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch {
    return 0; // si no se puede leer, queda en 0 (se podrá recalcular luego)
  }
}

async function importar() {
  await connectDB();

  let archivos;
  try {
    archivos = (await fs.readdir(IMPORT_DIR)).filter((f) => f.toLowerCase().endsWith('.pdf'));
  } catch (err) {
    console.error(`[import] No se pudo leer la carpeta ${IMPORT_DIR}:`, err.message);
    process.exit(1);
  }

  if (archivos.length === 0) {
    console.log(`[import] No hay PDFs en ${IMPORT_DIR}`);
    await mongoose.disconnect();
    return;
  }

  let nuevas = 0;
  let omitidas = 0;

  for (const archivo of archivos) {
    const ruta = path.join(IMPORT_DIR, archivo);
    const buffer = await fs.readFile(ruta);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    const existe = await Gaceta.findOne({ hash });
    if (existe) {
      omitidas++;
      console.log(`[import] Omitida (ya existe): ${archivo}`);
      continue;
    }

    const totalPaginas = await contarPaginas(buffer);
    const fileId = await guardarPdf(buffer, archivo, { hash, origen: 'script' });

    await Gaceta.create({
      numero: path.parse(archivo).name, // placeholder editable por el transcriptor
      fecha: null,
      tipo: null,
      fileId,
      nombreArchivo: archivo,
      hash,
      totalPaginas,
      estado: 'en_cola',
    });
    nuevas++;
    console.log(`[import] Agregada: ${archivo} (${totalPaginas} págs.)`);
  }

  console.log(`[import] Listo. Nuevas: ${nuevas}, omitidas: ${omitidas}, total revisadas: ${archivos.length}`);
  await mongoose.disconnect();
}

importar().catch((err) => {
  console.error('[import] Error:', err);
  process.exit(1);
});
