import { AuditLog } from '../models/AuditLog.js';

// Registra un evento en la bitácora. Nunca lanza: si falla el log no debe
// tumbar la operación principal (solo se reporta por consola).
export async function registrarBitacora({
  req,
  user,
  accion,
  entidad = null,
  entidadId = null,
  detalle = null,
}) {
  try {
    await AuditLog.create({
      userId: user?.id || user?._id || null,
      username: user?.username || 'anónimo',
      accion,
      entidad,
      entidadId: entidadId ? String(entidadId) : null,
      ip: req?.ip || req?.headers?.['x-forwarded-for'] || null,
      userAgent: req?.headers?.['user-agent'] || null,
      detalle,
    });
  } catch (err) {
    console.error('[bitacora] No se pudo registrar el evento:', err.message);
  }
}
