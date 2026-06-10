import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { dashboard } from '../controllers/statsController.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));
router.get('/dashboard', dashboard);

export default router;
