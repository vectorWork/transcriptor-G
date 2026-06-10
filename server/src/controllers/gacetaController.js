import { z } from 'zod';
import { Gaceta } from '../models/Gaceta.js';
import { Registro } from '../models/Registro.js';
import { User } from '../models/User.js';
import { abrirPdfStream, infoPdf, eliminarPdf } from '../services/gridfsStorage.js';
import { gacetaActualDe, asignarSiguiente } from '../services/cola.js';
import { registrarBitacora } from '../utils/logger.js';

const esAdmin = (user) => user.role === 'admin';
const esAsignado = (gaceta, user) => String(gaceta.asignadoA) === String(user._id);

// --- Transcriptor: su gaceta activa (o se le asigna la siguiente de la cola) ---
export async function gacetaActual(req, res, next) {
  try {
    // Los administradores no transcriben: no se les asigna de la cola.
    if (esAdmin(req.user)) return res.json({ gaceta: null, paginaGuardada: null });
    const gaceta = await gacetaActualDe(req.user._id);
    // Marcador: solo aplica si pertenece a la gaceta activa.
    let paginaGuardada = null;
    if (gaceta && String(req.user.gacetaGuardada) === String(gaceta._id)) {
      paginaGuardada = req.user.paginaGuardada;
    }
    res.json({ gaceta: gaceta || null, paginaGuardada });
  } catch (err) {
    next(err);
  }
}

// --- Transcriptor: guarda en qué página se quedó (marcador) ---
export async function guardarMarcador(req, res, next) {
  try {
    const schema = z.object({ pagina: z.coerce.number().int().min(1) });
    const { pagina } = schema.parse(req.body);
    const gaceta = await Gaceta.findById(req.params.id);
    if (!gaceta) return res.status(404).json({ error: 'Gaceta no encontrada' });
    if (!esAsignado(gaceta, req.user)) {
      return res.status(403).json({ error: 'No tienes asignada esta gaceta' });
    }
    await User.updateOne(
      { _id: req.user._id },
      { $set: { paginaGuardada: pagina, gacetaGuardada: gaceta._id } }
    );
    res.json({ ok: true, paginaGuardada: pagina });
  } catch (err) {
    next(err);
  }
}

// --- Admin: listado con filtros ---
export async function listarGacetas(req, res, next) {
  try {
    const filtro = {};
    if (req.query.estado) filtro.estado = req.query.estado;
    if (req.query.asignadoA) filtro.asignadoA = req.query.asignadoA;

    const gacetas = await Gaceta.find(filtro)
      .populate('asignadoA', 'nombre username')
      .populate('finalizadaPor', 'nombre username')
      .sort({ createdAt: -1 })
      .lean();

    const conteos = await Registro.aggregate([
      { $group: { _id: '$gacetaId', total: { $sum: 1 } } },
    ]);
    const mapa = Object.fromEntries(conteos.map((c) => [String(c._id), c.total]));
    res.json({
      gacetas: gacetas.map((g) => ({ ...g, totalRegistros: mapa[String(g._id)] || 0 })),
    });
  } catch (err) {
    next(err);
  }
}

export async function obtenerGaceta(req, res, next) {
  try {
    const gaceta = await Gaceta.findById(req.params.id).populate('asignadoA', 'nombre username');
    if (!gaceta) return res.status(404).json({ error: 'Gaceta no encontrada' });
    if (!esAdmin(req.user) && !esAsignado(gaceta, req.user)) {
      return res.status(403).json({ error: 'No tienes acceso a esta gaceta' });
    }
    res.json({ gaceta });
  } catch (err) {
    next(err);
  }
}

// --- Editar metadatos (vienen vacíos del script): asignado o admin ---
const metadatosSchema = z.object({
  numero: z.string().optional(),
  fecha: z.coerce.date().nullable().optional(),
  tipo: z.enum(['ordinaria', 'extraordinaria']).nullable().optional(),
});

export async function editarMetadatos(req, res, next) {
  try {
    const gaceta = await Gaceta.findById(req.params.id);
    if (!gaceta) return res.status(404).json({ error: 'Gaceta no encontrada' });
    if (!esAdmin(req.user) && !esAsignado(gaceta, req.user)) {
      return res.status(403).json({ error: 'No tienes acceso a esta gaceta' });
    }
    const data = metadatosSchema.parse(req.body);
    if (data.numero !== undefined) gaceta.numero = data.numero;
    if (data.fecha !== undefined) gaceta.fecha = data.fecha;
    if (data.tipo !== undefined) gaceta.tipo = data.tipo;
    await gaceta.save();
    res.json({ gaceta });
  } catch (err) {
    next(err);
  }
}

// --- Marcar una página como vista (control de lectura completa) ---
export async function marcarPaginaVista(req, res, next) {
  try {
    const schema = z.object({ pagina: z.coerce.number().int().min(1) });
    const { pagina } = schema.parse(req.body);
    const gaceta = await Gaceta.findById(req.params.id);
    if (!gaceta) return res.status(404).json({ error: 'Gaceta no encontrada' });
    if (!esAsignado(gaceta, req.user)) {
      return res.status(403).json({ error: 'No tienes asignada esta gaceta' });
    }
    // $addToSet es atómico: evita la condición de carrera (read-modify-write)
    // que hacía perder páginas al navegar rápido (p.ej. quedaba 23/24).
    if (pagina >= 1 && (!gaceta.totalPaginas || pagina <= gaceta.totalPaginas)) {
      await Gaceta.updateOne({ _id: gaceta._id }, { $addToSet: { paginasVistas: pagina } });
    }
    const actualizada = await Gaceta.findById(gaceta._id);
    res.json({
      paginasVistas: actualizada.paginasVistas,
      totalPaginas: actualizada.totalPaginas,
      todasVistas: actualizada.todasVistas(),
    });
  } catch (err) {
    next(err);
  }
}

// --- Finalizar transcripción: requiere haber visto todas las páginas ---
export async function finalizarGaceta(req, res, next) {
  try {
    const gaceta = await Gaceta.findById(req.params.id);
    if (!gaceta) return res.status(404).json({ error: 'Gaceta no encontrada' });
    if (!esAsignado(gaceta, req.user)) {
      return res.status(403).json({ error: 'No tienes asignada esta gaceta' });
    }
    if (gaceta.estado !== 'en_proceso') {
      return res.status(409).json({ error: 'La gaceta no está en proceso' });
    }
    if (!gaceta.todasVistas()) {
      return res.status(400).json({ error: 'Debes leer todas las páginas antes de finalizar' });
    }

    gaceta.estado = 'finalizada';
    gaceta.finalizadaAt = new Date();
    gaceta.finalizadaPor = req.user._id;
    await gaceta.save();

    await registrarBitacora({
      req,
      user: req.user,
      accion: 'FINALIZAR_GACETA',
      entidad: 'Gaceta',
      entidadId: gaceta._id,
      detalle: `Finalizó la gaceta "${gaceta.numero}"`,
    });

    // Asigna automáticamente la siguiente de la cola.
    const siguiente = await asignarSiguiente(req.user._id);
    res.json({ ok: true, siguiente: siguiente || null });
  } catch (err) {
    next(err);
  }
}

// --- Admin: devolver a la cola o reasignar a un usuario (conserva datos) ---
const reasignarSchema = z.object({ destino: z.string().min(1) }); // 'cola' o un userId

export async function reasignarGaceta(req, res, next) {
  try {
    const { destino } = reasignarSchema.parse(req.body);
    const gaceta = await Gaceta.findById(req.params.id);
    if (!gaceta) return res.status(404).json({ error: 'Gaceta no encontrada' });

    let detalle;
    if (destino === 'cola') {
      gaceta.estado = 'en_cola';
      gaceta.asignadoA = null;
      gaceta.startedAt = null;
      detalle = `Devuelta a la cola general (Nº ${gaceta.numero})`;
    } else {
      const u = await User.findById(destino).catch(() => null);
      if (!u || u.role !== 'transcriptor' || !u.activo) {
        return res.status(400).json({ error: 'Transcriptor destino inválido' });
      }
      gaceta.estado = 'en_proceso';
      gaceta.asignadoA = u._id;
      gaceta.startedAt = gaceta.startedAt || new Date();
      detalle = `Reasignada a ${u.username} (Nº ${gaceta.numero})`;
    }
    // Conserva registros y progreso (paginasVistas); solo se quita la finalización.
    gaceta.finalizadaAt = null;
    gaceta.finalizadaPor = null;
    await gaceta.save();

    await registrarBitacora({
      req,
      user: req.user,
      accion: 'REASIGNAR_GACETA',
      entidad: 'Gaceta',
      entidadId: gaceta._id,
      detalle,
    });
    const poblada = await Gaceta.findById(gaceta._id).populate('asignadoA', 'nombre username');
    res.json({ gaceta: poblada });
  } catch (err) {
    next(err);
  }
}

export async function descargarPdf(req, res, next) {
  try {
    const gaceta = await Gaceta.findById(req.params.id);
    if (!gaceta) return res.status(404).json({ error: 'Gaceta no encontrada' });
    // Un transcriptor solo puede ver el PDF de su gaceta en proceso.
    if (!esAdmin(req.user)) {
      if (!esAsignado(gaceta, req.user) || gaceta.estado !== 'en_proceso') {
        return res.status(403).json({ error: 'No tienes acceso a este PDF' });
      }
    }

    const info = await infoPdf(gaceta.fileId);
    if (!info) return res.status(404).json({ error: 'Archivo no encontrado' });
    const total = info.length;

    res.set('Content-Type', 'application/pdf');
    res.set('Accept-Ranges', 'bytes');
    res.set('Content-Disposition', `inline; filename="${gaceta.nombreArchivo}"`);

    // Soporte de peticiones por rango (necesario para que pdf.js cargue PDFs grandes).
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d+)-(\d*)/.exec(range);
      if (m) {
        const start = parseInt(m[1], 10);
        const end = m[2] ? parseInt(m[2], 10) : total - 1;
        if (start >= total || end >= total || start > end) {
          res.set('Content-Range', `bytes */${total}`);
          return res.status(416).end();
        }
        res.status(206);
        res.set('Content-Range', `bytes ${start}-${end}/${total}`);
        res.set('Content-Length', end - start + 1);
        const stream = abrirPdfStream(gaceta.fileId, { start, end: end + 1 });
        stream.on('error', () => res.destroy());
        return stream.pipe(res);
      }
    }

    res.set('Content-Length', total);
    const stream = abrirPdfStream(gaceta.fileId);
    stream.on('error', () => res.destroy());
    stream.pipe(res);

    await registrarBitacora({
      req,
      user: req.user,
      accion: 'VER_PDF',
      entidad: 'Gaceta',
      entidadId: gaceta._id,
    });
  } catch (err) {
    next(err);
  }
}

export async function eliminarGaceta(req, res, next) {
  try {
    const gaceta = await Gaceta.findById(req.params.id);
    if (!gaceta) return res.status(404).json({ error: 'Gaceta no encontrada' });
    await Registro.deleteMany({ gacetaId: gaceta._id });
    await eliminarPdf(gaceta.fileId).catch(() => {});
    await gaceta.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
