import mongoose from 'mongoose';

export const ESTADOS_GACETA = ['en_cola', 'en_proceso', 'finalizada'];

const gacetaSchema = new mongoose.Schema(
  {
    // Metadatos: pueden venir vacíos del script y los completa el transcriptor.
    numero: { type: String, default: '', trim: true },
    fecha: { type: Date, default: null },
    tipo: { type: String, enum: ['ordinaria', 'extraordinaria', null], default: null },

    // Archivo
    fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
    nombreArchivo: { type: String, required: true },
    hash: { type: String, index: true }, // sha256 del PDF para evitar duplicados
    totalPaginas: { type: Number, default: 0 },

    // Cola / asignación
    estado: { type: String, enum: ESTADOS_GACETA, default: 'en_cola', index: true },
    asignadoA: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    paginasVistas: { type: [Number], default: [] },
    startedAt: { type: Date, default: null },
    finalizadaAt: { type: Date, default: null },
    finalizadaPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    importadaPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// ¿Se vieron todas las páginas? (1..totalPaginas)
gacetaSchema.methods.todasVistas = function () {
  if (!this.totalPaginas) return false;
  const vistas = new Set(this.paginasVistas);
  for (let p = 1; p <= this.totalPaginas; p++) {
    if (!vistas.has(p)) return false;
  }
  return true;
};

export const Gaceta = mongoose.model('Gaceta', gacetaSchema);
