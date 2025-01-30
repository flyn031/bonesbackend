import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
    createMaterial,
    getMaterials,
    updateStock
} from '../controllers/materialController';

const router = Router();

router.use(authenticateToken);

router.post('/', createMaterial);
router.get('/', getMaterials);
router.put('/:id/stock', updateStock);

export default router;