import { Router } from 'express';
import { 
  createMaterial, 
  getMaterials, 
  getMaterialById,
  updateMaterial,
  deleteMaterial,
  updateStock,
  getMaterialCategories,
  createSampleMaterials
} from '../controllers/materialController';

// Import the direct purpose update function from inventoryController
import { updateInventoryPurposeDirectly } from '../controllers/inventoryController';

const router = Router();

// Material routes
router.post('/', createMaterial);
router.get('/', getMaterials);
router.get('/categories', getMaterialCategories);
router.get('/:id', getMaterialById);
router.put('/:id', updateMaterial);
router.delete('/:id', deleteMaterial);
router.patch('/:id/stock', updateStock);
router.post('/samples/:supplierId', createSampleMaterials);

// Add the new direct purpose update endpoint
router.put('/:id/purpose', updateInventoryPurposeDirectly);

export default router;