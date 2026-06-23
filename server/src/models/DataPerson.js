import mongoose from 'mongoose';

// Colección "datapersons": catálogo central de personas para el autocompletado.
// Se alimenta del Registro Electoral (DBF) + copia de los registros existentes,
// y crece cuando se registra a alguien cuya identificación aún no está aquí.
// La identidad única es la combinación nacionalidad (prefijo) + cédula.
const dataPersonSchema = new mongoose.Schema(
  {
    nacionalidad: { type: String, required: true, uppercase: true, trim: true }, // V, E, J, C, G, P
    cedula: { type: String, required: true, trim: true },
    nombres: { type: String, default: '', trim: true },
    apellidos: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

// Índice único para deduplicar y para que el autocompletado consulte rápido.
dataPersonSchema.index({ nacionalidad: 1, cedula: 1 }, { unique: true });

export const DataPerson = mongoose.model('DataPerson', dataPersonSchema, 'datapersons');
