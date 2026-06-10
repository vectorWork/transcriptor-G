import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { registrarBitacora } from '../utils/logger.js';

const loginSchema = z.object({
  username: z.string().min(1, 'Usuario requerido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.cookieSecure,
    maxAge: 8 * 60 * 60 * 1000,
  };
}

export async function login(req, res, next) {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user || !user.activo || !(await bcrypt.compare(password, user.passwordHash))) {
      await registrarBitacora({
        req,
        user: { username },
        accion: 'LOGIN_FALLIDO',
        detalle: `Intento fallido para usuario "${username}"`,
      });
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ sub: user._id, role: user.role }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    });
    res.cookie('token', token, cookieOptions());

    await registrarBitacora({ req, user, accion: 'LOGIN' });
    res.json({ user: user.toSafeJSON(), token });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    await registrarBitacora({ req, user: req.user, accion: 'LOGOUT' });
    res.clearCookie('token', cookieOptions());
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  res.json({ user: req.user.toSafeJSON() });
}
