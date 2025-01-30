import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
    createSupplier,
    getSuppliers,
    getSupplier,
    updateSupplier
} from '../controllers/supplierController';

const router = Router();

router.use(authenticateToken);

router.post('/', createSupplier);
router.get('/', getSuppliers);
router.get('/:id', getSupplier);
router.put('/:id', updateSupplier);

export default router;