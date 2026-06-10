import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  gacetaActual,
  listarGacetas,
  obtenerGaceta,
  editarMetadatos,
  marcarPaginaVista,
  guardarMarcador,
  finalizarGaceta,
  reasignarGaceta,
  descargarPdf,
  eliminarGaceta,
} from '../controllers/gacetaController.js';
import { exportarGaceta } from '../controllers/registroController.js';

const router = Router();

router.use(requireAuth);

// Transcriptor: su gaceta activa (o la siguiente de la cola)
router.get('/actual', gacetaActual);

// Admin: listado con filtros
router.get('/', requireRole('admin'), listarGacetas);

router.get('/:id', obtenerGaceta);
router.get('/:id/file', descargarPdf);
router.get('/:id/export', exportarGaceta);
router.patch('/:id', editarMetadatos);
router.post('/:id/visto', marcarPaginaVista);
router.post('/:id/marcador', guardarMarcador);
router.post('/:id/finalizar', finalizarGaceta);
router.post('/:id/reasignar', requireRole('admin'), reasignarGaceta);
router.delete('/:id', requireRole('admin'), eliminarGaceta);

export default router;
