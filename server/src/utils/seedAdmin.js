import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';

// Crea el usuario admin inicial si no existe ninguno.
export async function seedAdmin() {
  const existe = await User.findOne({ username: env.admin.username.toLowerCase() });
  if (existe) return;
  const passwordHash = await bcrypt.hash(env.admin.password, 10);
  await User.create({
    nombre: env.admin.nombre,
    username: env.admin.username.toLowerCase(),
    passwordHash,
    role: 'admin',
    activo: true,
  });
  console.log(`[seed] Usuario admin "${env.admin.username}" creado`);
}

// Permite ejecutar el seed de forma independiente con `npm run seed`.
const esEjecucionDirecta = process.argv[1] && process.argv[1].endsWith('seedAdmin.js');
if (esEjecucionDirecta) {
  connectDB()
    .then(seedAdmin)
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
