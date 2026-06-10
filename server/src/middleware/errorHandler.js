import { ZodError } from 'zod';

// Manejador de errores centralizado.
export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Datos inválidos',
      detalles: err.errors.map((e) => ({ campo: e.path.join('.'), mensaje: e.message })),
    });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: 'Registro duplicado', campos: err.keyValue });
  }
  console.error('[error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
}

export function notFound(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}
