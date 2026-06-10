import { Gaceta } from '../models/Gaceta.js';

// Asigna atómicamente la siguiente gaceta en cola al usuario indicado.
// Devuelve la gaceta asignada o null si la cola está vacía.
export async function asignarSiguiente(userId) {
  // No se reinicia paginasVistas: si la gaceta vuelve de la cola con progreso
  // previo (devuelta por el admin "conservando todo"), se mantiene. Las gacetas
  // nuevas ya tienen paginasVistas = [] por defecto.
  return Gaceta.findOneAndUpdate(
    { estado: 'en_cola', asignadoA: null },
    {
      $set: {
        estado: 'en_proceso',
        asignadoA: userId,
        startedAt: new Date(),
      },
    },
    { sort: { createdAt: 1 }, new: true }
  );
}

// Devuelve la gaceta activa del usuario o, si no tiene, le asigna la siguiente.
export async function gacetaActualDe(userId) {
  const activa = await Gaceta.findOne({ asignadoA: userId, estado: 'en_proceso' });
  if (activa) return activa;
  return asignarSiguiente(userId);
}
