import { AuditLog } from '../models/AuditLog.js';

export async function listarLogs(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 25);
    const filtro = {};
    if (req.query.accion) filtro.accion = req.query.accion;
    if (req.query.username) filtro.username = new RegExp(req.query.username, 'i');
    if (req.query.desde || req.query.hasta) {
      filtro.timestamp = {};
      if (req.query.desde) filtro.timestamp.$gte = new Date(req.query.desde);
      if (req.query.hasta) filtro.timestamp.$lte = new Date(req.query.hasta);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filtro)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filtro),
    ]);

    res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}
