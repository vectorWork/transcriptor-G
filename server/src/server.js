import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import { seedAdmin } from './utils/seedAdmin.js';

async function start() {
  try {
    await connectDB();
    await seedAdmin();
    const app = createApp();
    app.listen(env.port, () => {
      console.log(`[server] API escuchando en http://localhost:${env.port}`);
    });
  } catch (err) {
    console.error('[server] Error al arrancar:', err);
    process.exit(1);
  }
}

start();
