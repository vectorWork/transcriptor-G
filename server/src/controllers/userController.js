import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { registrarBitacora } from '../utils/logger.js';

const crearSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  username: z.string().min(3, 'Usuario de al menos 3 caracteres'),
  password: z.string().min(6, 'Contraseña de al menos 6 caracteres'),
  role: z.enum(['admin', 'transcriptor']).default('transcriptor'),
});

const actualizarSchema = z.object({
  nombre: z.string().min(1).optional(),
  role: z.enum(['admin', 'transcriptor']).optional(),
  activo: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export async function listarUsuarios(req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ users: users.map((u) => u.toSafeJSON()) });
  } catch (err) {
    next(err);
  }
}

export async function crearUsuario(req, res, next) {
  try {
    const data = crearSchema.parse(req.body);
    const existe = await User.findOne({ username: data.username.toLowerCase() });
    if (existe) {
      return res.status(409).json({ error: 'El nombre de usuario ya existe' });
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await User.create({
      nombre: data.nombre,
      username: data.username.toLowerCase(),
      passwordHash,
      role: data.role,
      createdBy: req.user._id,
    });
    await registrarBitacora({
      req,
      user: req.user,
      accion: 'CREAR_USUARIO',
      entidad: 'User',
      entidadId: user._id,
      detalle: `Creó usuario "${user.username}" (${user.role})`,
    });
    res.status(201).json({ user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

export async function actualizarUsuario(req, res, next) {
  try {
    const data = actualizarSchema.parse(req.body);
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (data.nombre !== undefined) user.nombre = data.nombre;
    if (data.role !== undefined) user.role = data.role;
    if (data.activo !== undefined) user.activo = data.activo;
    if (data.password) user.passwordHash = await bcrypt.hash(data.password, 10);
    await user.save();

    await registrarBitacora({
      req,
      user: req.user,
      accion: 'ACTUALIZAR_USUARIO',
      entidad: 'User',
      entidadId: user._id,
      detalle: `Actualizó usuario "${user.username}"`,
    });
    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}
