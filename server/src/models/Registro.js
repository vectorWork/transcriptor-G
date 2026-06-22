import mongoose from 'mongoose';

export const ACCIONES = [
  'Nombramiento',
  'Designacion',
  'Reemplazo (e/r)',
  'Constitucion (integrantes de)',
  'Actuacion',
  'Otorgamiento',
  'Delegacion',
  'Inhabilitacion',
  'Mencion',
];

export const TIPOS_ID = ['cedula', 'pasaporte'];

// Prefijos de nomenclatura de la identificación (RIF/cédula venezolana).
export const PREFIJOS_ID = ['V', 'E', 'J', 'C', 'G', 'P'];

const registroSchema = new mongoose.Schema(
  {
    gacetaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gaceta',
      required: true,
      index: true,
    },
    nombres: { type: String, required: true, trim: true },
    apellidos: { type: String, required: true, trim: true },
    // Prefijo de nomenclatura seleccionado en el formulario (V/E/J/C/G/P).
    idPrefijo: { type: String, enum: PREFIJOS_ID, required: true, default: 'V', uppercase: true },
    // Tipo "legacy" derivado del prefijo (cedula/pasaporte); lo fija el controlador.
    idTipo: { type: String, enum: TIPOS_ID, required: true },
    // Solo el número (sin prefijo). Para pasaporte (P) puede ser alfanumérico.
    idNumero: { type: String, required: true, trim: true, index: true },
    accion: { type: String, enum: ACCIONES, required: true },
    pagina: { type: Number, required: true, min: 1 },
    contexto: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Registro = mongoose.model('Registro', registroSchema);
