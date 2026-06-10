import mongoose from 'mongoose';
import { env } from './env.js';

let bucket = null;

export async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  console.log('[db] Conectado a MongoDB');

  // GridFSBucket para almacenar los PDF de las gacetas
  bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'pdfs',
  });
  return mongoose.connection;
}

export function getBucket() {
  if (!bucket) {
    throw new Error('GridFSBucket no inicializado: llama a connectDB() primero');
  }
  return bucket;
}
