import { z } from 'zod';
import ExcelJS from 'exceljs';
import { Registro, ACCIONES, TIPOS_ID } from '../models/Registro.js';
import { Gaceta } from '../models/Gaceta.js';
import { validarIdentificacion } from '../utils/validators.js';
import { registrarBitacora } from '../utils/logger.js';

const registroSchema = z.object({
  gacetaId: z.string().min(1, 'gacetaId requerido'),
  nombres: z.string().min(1, 'Nombres requeridos'),
  apellidos: z.string().min(1, 'Apellidos requeridos'),
  idTipo: z.enum(TIPOS_ID),
  idNumero: z.string().min(1, 'Identificación requerida'),
  accion: z.enum(ACCIONES),
  pagina: z.coerce.number().int().min(1, 'Página inválida'),
  contexto: z.string().optional().default(''),
});

const editarSchema = registroSchema.partial().omit({ gacetaId: true });

// Un transcriptor solo puede escribir en su gaceta asignada y en proceso.
function puedeEscribir(gaceta, user) {
  if (user.role === 'admin') return true;
  return String(gaceta.asignadoA) === String(user._id) && gaceta.estado === 'en_proceso';
}

export async function listarRegistros(req, res, next) {
  try {
    const filtro = {};
    if (req.query.gacetaId) filtro.gacetaId = req.query.gacetaId;
    const registros = await Registro.find(filtro).sort({ createdAt: -1 }).lean();
    res.json({ registros });
  } catch (err) {
    next(err);
  }
}

export async function crearRegistro(req, res, next) {
  try {
    const data = registroSchema.parse(req.body);
    const idCheck = validarIdentificacion(data.idTipo, data.idNumero);
    if (!idCheck.ok) return res.status(400).json({ error: idCheck.mensaje });

    const gaceta = await Gaceta.findById(data.gacetaId);
    if (!gaceta) return res.status(404).json({ error: 'Gaceta no encontrada' });
    if (!puedeEscribir(gaceta, req.user)) {
      return res.status(403).json({ error: 'No puedes agregar registros a esta gaceta' });
    }

    const registro = await Registro.create({ ...data, createdBy: req.user._id });
    await registrarBitacora({
      req,
      user: req.user,
      accion: 'CREAR_REGISTRO',
      entidad: 'Registro',
      entidadId: registro._id,
      detalle: `${data.nombres} ${data.apellidos} — ${data.accion} (Gaceta ${gaceta.numero})`,
    });
    res.status(201).json({ registro });
  } catch (err) {
    next(err);
  }
}

export async function editarRegistro(req, res, next) {
  try {
    const data = editarSchema.parse(req.body);
    if (data.idTipo && data.idNumero) {
      const idCheck = validarIdentificacion(data.idTipo, data.idNumero);
      if (!idCheck.ok) return res.status(400).json({ error: idCheck.mensaje });
    }
    const existente = await Registro.findById(req.params.id);
    if (!existente) return res.status(404).json({ error: 'Registro no encontrado' });
    const gaceta = await Gaceta.findById(existente.gacetaId);
    if (gaceta && !puedeEscribir(gaceta, req.user)) {
      return res.status(403).json({ error: 'No puedes editar registros de esta gaceta' });
    }
    const registro = await Registro.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });

    await registrarBitacora({
      req,
      user: req.user,
      accion: 'EDITAR_REGISTRO',
      entidad: 'Registro',
      entidadId: registro._id,
    });
    res.json({ registro });
  } catch (err) {
    next(err);
  }
}

export async function eliminarRegistro(req, res, next) {
  try {
    const registro = await Registro.findById(req.params.id);
    if (!registro) return res.status(404).json({ error: 'Registro no encontrado' });
    const gaceta = await Gaceta.findById(registro.gacetaId);
    if (gaceta && !puedeEscribir(gaceta, req.user)) {
      return res.status(403).json({ error: 'No puedes eliminar registros de esta gaceta' });
    }
    await registro.deleteOne();
    await registrarBitacora({
      req,
      user: req.user,
      accion: 'ELIMINAR_REGISTRO',
      entidad: 'Registro',
      entidadId: registro._id,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function exportarGaceta(req, res, next) {
  try {
    const gaceta = await Gaceta.findById(req.params.id);
    if (!gaceta) return res.status(404).json({ error: 'Gaceta no encontrada' });
    const registros = await Registro.find({ gacetaId: gaceta._id }).sort({ pagina: 1 }).lean();

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`Gaceta ${gaceta.numero}`);
    ws.columns = [
      { header: 'Gaceta', key: 'gaceta', width: 12 },
      { header: 'Fecha', key: 'fecha', width: 14 },
      { header: 'Tipo', key: 'tipo', width: 14 },
      { header: 'Nombres', key: 'nombres', width: 22 },
      { header: 'Apellidos', key: 'apellidos', width: 22 },
      { header: 'Tipo ID', key: 'idTipo', width: 12 },
      { header: 'Identificación', key: 'idNumero', width: 18 },
      { header: 'Acción', key: 'accion', width: 26 },
      { header: 'Página', key: 'pagina', width: 9 },
      { header: 'Contexto', key: 'contexto', width: 60 },
    ];
    ws.getRow(1).font = { bold: true };
    const fechaGaceta = gaceta.fecha ? gaceta.fecha.toISOString().slice(0, 10) : '';
    for (const r of registros) {
      ws.addRow({
        gaceta: gaceta.numero,
        fecha: fechaGaceta,
        tipo: gaceta.tipo,
        nombres: r.nombres,
        apellidos: r.apellidos,
        idTipo: r.idTipo,
        idNumero: r.idNumero,
        accion: r.accion,
        pagina: r.pagina,
        contexto: r.contexto,
      });
    }

    await registrarBitacora({
      req,
      user: req.user,
      accion: 'EXPORTAR',
      entidad: 'Gaceta',
      entidadId: gaceta._id,
      detalle: `Exportó ${registros.length} registros`,
    });

    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.set('Content-Disposition', `attachment; filename="gaceta-${gaceta.numero}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}
