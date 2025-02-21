import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
    createSupplier,
    getSuppliers,
    getSupplier,
    updateSupplier,
    getSupplierPerformanceReport,
    getAllSuppliersPerformance
} from '../controllers/supplierController';

const router = Router();

router.use(authenticateToken);

router.post('/', createSupplier);
router.get('/', getSuppliers);

// Performance routes BEFORE individual supplier route
router.get('/performance', getAllSuppliersPerformance);
router.get('/:id/performance', getSupplierPerformanceReport);

router.get('/:id', getSupplier);
router.put('/:id', updateSupplier);

export default router;