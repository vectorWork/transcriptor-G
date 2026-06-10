import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listarRegistros,
  crearRegistro,
  editarRegistro,
  eliminarRegistro,
} from '../controllers/registroController.js';

const router = Router();

router.use(requireAuth);
router.get('/', listarRegistros);
router.post('/', crearRegistro);
router.patch('/:id', editarRegistro);
router.delete('/:id', eliminarRegistro);

export default router;
