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

export default router;