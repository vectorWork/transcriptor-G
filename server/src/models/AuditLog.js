import mongoose from 'mongoose';

export const ACCIONES_LOG = [
  'LOGIN',
  'LOGOUT',
  'LOGIN_FALLIDO',
  'CREAR_USUARIO',
  'ACTUALIZAR_USUARIO',
  'SUBIR_GACETA',
  'FINALIZAR_GACETA',
  'REASIGNAR_GACETA',
  'VER_PDF',
  'CREAR_REGISTRO',
  'EDITAR_REGISTRO',
  'ELIMINAR_REGISTRO',
  'EXPORTAR',
];

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    username: { type: String, default: 'anónimo' },
    accion: { type: String, required: true, index: true },
    entidad: { type: String, default: null },
    entidadId: { type: String, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    detalle: { type: String, default: null },
  },
  { timestamps: { createdAt: 'timestamp', updatedAt: false } }
);

auditLogSchema.index({ timestamp: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
