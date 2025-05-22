// backend/src/routes/jobMaterials.ts
import { Router } from 'express';
import {
  addMaterialToJob,
  getJobMaterials,
  updateJobMaterialAllocation,
  removeJobMaterial,
  getAvailableMaterialsForJob
} from '../controllers/jobMaterialController';

// ADD AUDIT MIDDLEWARE IMPORT - Use the correct export name
import { auditJobMiddleware } from '../middleware/auditMiddleware';

const router = Router();

// Note: Authentication is handled at the app level through the main jobs routes
// since these routes are mounted under /api/jobs, authentication is already applied

// GET routes don't need auditing - they don't change data
// Get all materials for a job
router.get('/:jobId/materials', getJobMaterials);

// Get available materials for a job (not yet added)
router.get('/:jobId/materials/available', getAvailableMaterialsForJob);

// MATERIAL OPERATIONS - ADD AUDIT MIDDLEWARE

// Add material to job - AUDIT as MATERIAL_ADDED
router.post('/:jobId/materials', auditJobMiddleware('MATERIAL_ADDED'), addMaterialToJob);

// Update material allocation/usage for a job - AUDIT as MATERIAL_UPDATED
router.patch('/:jobId/materials/:materialId', auditJobMiddleware('MATERIAL_UPDATED'), updateJobMaterialAllocation);

// Remove material from job - AUDIT as MATERIAL_REMOVED
router.delete('/:jobId/materials/:materialId', auditJobMiddleware('MATERIAL_REMOVED'), removeJobMaterial);

export default router;