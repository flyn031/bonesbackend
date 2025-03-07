import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
   createMaterial,
   getMaterials,
   updateStock,
   createSampleMaterials,
   updateMaterial,
   deleteMaterial,
   getMaterialCategories,
   getMaterialById  // Add this import
} from '../controllers/materialController';

const router = Router();

router.use(authenticateToken);

router.post('/', createMaterial);
router.get('/', getMaterials);
router.get('/:id', getMaterialById);  // Add this route
router.put('/:id/stock', updateStock);
router.post('/:supplierId/sample-materials', createSampleMaterials);

// New routes
router.put('/:id', updateMaterial);
router.delete('/:id', deleteMaterial);
router.get('/categories', getMaterialCategories);

export default router;