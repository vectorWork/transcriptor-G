import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { listarUsuarios, crearUsuario, actualizarUsuario } from '../controllers/userController.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));
router.get('/', listarUsuarios);
router.post('/', crearUsuario);
router.patch('/:id', actualizarUsuario);

export default router;
