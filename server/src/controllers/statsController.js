import mongoose from 'mongoose';
import { Gaceta } from '../models/Gaceta.js';
import { Registro } from '../models/Registro.js';
import { User } from '../models/User.js';

// Dashboard del administrador. Filtros por query:
//   userId  -> restringe a un transcriptor
//   desde, hasta -> rango de fechas (sobre finalizadaAt para lo finalizado)
export async function dashboard(req, res, next) {
  try {
    const { userId, desde, hasta } = req.query;

    // Filtro de finalizadas (por fecha de finalización y usuario)
    const matchFin = { estado: 'finalizada' };
    if (userId) matchFin.finalizadaPor = new mongoose.Types.ObjectId(userId);
    if (desde || hasta) {
      matchFin.finalizadaAt = {};
      if (desde) matchFin.finalizadaAt.$gte = new Date(desde);
      if (hasta) matchFin.finalizadaAt.$lte = new Date(hasta + 'T23:59:59');
    }

    // 1) Procesadas por usuario + productividad (tiempo promedio, registros)
    const porUsuarioAgg = await Gaceta.aggregate([
      { $match: matchFin },
      {
        $group: {
          _id: '$finalizadaPor',
          finalizadas: { $sum: 1 },
          tiempoPromedioMs: {
            $avg: {
              $cond: [
                { $and: ['$startedAt', '$finalizadaAt'] },
                { $subtract: ['$finalizadaAt', '$startedAt'] },
                null,
              ],
            },
          },
        },
      },
    ]);

    // registros capturados por usuario (createdBy)
    const matchReg = {};
    if (userId) matchReg.createdBy = new mongoose.Types.ObjectId(userId);
    if (desde || hasta) {
      matchReg.createdAt = {};
      if (desde) matchReg.createdAt.$gte = new Date(desde);
      if (hasta) matchReg.createdAt.$lte = new Date(hasta + 'T23:59:59');
    }
    const regsPorUsuario = await Registro.aggregate([
      { $match: matchReg },
      { $group: { _id: '$createdBy', total: { $sum: 1 } } },
    ]);
    const mapaRegs = Object.fromEntries(regsPorUsuario.map((r) => [String(r._id), r.total]));

    const users = await User.find({ role: 'transcriptor' }).lean();
    const mapaUser = Object.fromEntries(users.map((u) => [String(u._id), u]));
    const mapaFin = Object.fromEntries(porUsuarioAgg.map((g) => [String(g._id), g]));

    const idsUsuarios = userId ? [userId] : users.map((u) => String(u._id));
    const porUsuario = idsUsuarios.map((id) => {
      const u = mapaUser[id];
      const fin = mapaFin[id];
      return {
        userId: id,
        nombre: u?.nombre || '—',
        username: u?.username || '—',
        finalizadas: fin?.finalizadas || 0,
        registros: mapaRegs[id] || 0,
        tiempoPromedioMs: fin?.tiempoPromedioMs || null,
      };
    });

    // 2) Por mes (finalizadas)
    const porMes = await Gaceta.aggregate([
      { $match: matchFin },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$finalizadaAt' } },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 3) Estado de la cola + quién trabaja qué (no afectado por rango de fechas)
    const colaAgg = await Gaceta.aggregate([
      { $group: { _id: '$estado', total: { $sum: 1 } } },
    ]);
    const cola = { en_cola: 0, en_proceso: 0, finalizada: 0 };
    colaAgg.forEach((c) => {
      cola[c._id] = c.total;
    });

    const enProcesoDetalle = await Gaceta.find({ estado: 'en_proceso' })
      .populate('asignadoA', 'nombre username')
      .select('numero nombreArchivo asignadoA startedAt paginasVistas totalPaginas')
      .lean();

    res.json({
      porUsuario,
      porMes: porMes.map((m) => ({ mes: m._id, total: m.total })),
      cola,
      enProceso: enProcesoDetalle.map((g) => ({
        id: g._id,
        numero: g.numero,
        nombreArchivo: g.nombreArchivo,
        asignadoA: g.asignadoA,
        startedAt: g.startedAt,
        progreso: `${(g.paginasVistas || []).length}/${g.totalPaginas || 0}`,
      })),
    });
  } catch (err) {
    next(err);
  }
}
