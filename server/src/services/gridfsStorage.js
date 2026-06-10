import mongoose from 'mongoose';
import { Readable } from 'stream';
import { getBucket } from '../config/db.js';

// Guarda un buffer de PDF en GridFS y resuelve con el ObjectId del archivo.
export function guardarPdf(buffer, nombreArchivo, metadata = {}) {
  return new Promise((resolve, reject) => {
    const bucket = getBucket();
    const uploadStream = bucket.openUploadStream(nombreArchivo, {
      contentType: 'application/pdf',
      metadata,
    });
    Readable.from(buffer)
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => resolve(uploadStream.id));
  });
}

// Devuelve un stream de lectura del PDF para hacer streaming al cliente.
// Acepta opciones { start, end } para servir rangos de bytes (end exclusivo).
export function abrirPdfStream(fileId, opciones = {}) {
  const bucket = getBucket();
  return bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId), opciones);
}

// Devuelve los metadatos del archivo (incluye .length en bytes) o null.
export async function infoPdf(fileId) {
  const bucket = getBucket();
  const files = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
  return files[0] || null;
}

// Elimina un PDF de GridFS (usado al borrar una gaceta).
export async function eliminarPdf(fileId) {
  const bucket = getBucket();
  await bucket.delete(new mongoose.Types.ObjectId(fileId));
}
