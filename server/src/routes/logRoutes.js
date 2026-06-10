import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { listarLogs } from '../controllers/logController.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));
router.get('/', listarLogs);

export default router;
