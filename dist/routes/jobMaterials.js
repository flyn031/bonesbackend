"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/jobMaterials.ts
const express_1 = require("express");
const jobMaterialController_1 = require("../controllers/jobMaterialController");
// ADD AUDIT MIDDLEWARE IMPORT - Use the correct export name
const auditMiddleware_1 = require("../middleware/auditMiddleware");
const router = (0, express_1.Router)();
// Note: Authentication is handled at the app level through the main jobs routes
// since these routes are mounted under /api/jobs, authentication is already applied
// GET routes don't need auditing - they don't change data
// Get all materials for a job
router.get('/:jobId/materials', jobMaterialController_1.getJobMaterials);
// Get available materials for a job (not yet added)
router.get('/:jobId/materials/available', jobMaterialController_1.getAvailableMaterialsForJob);
// MATERIAL OPERATIONS - ADD AUDIT MIDDLEWARE
// Add material to job - AUDIT as MATERIAL_ADDED
router.post('/:jobId/materials', (0, auditMiddleware_1.auditJobMiddleware)('MATERIAL_ADDED'), jobMaterialController_1.addMaterialToJob);
// Update material allocation/usage for a job - AUDIT as MATERIAL_UPDATED
router.patch('/:jobId/materials/:materialId', (0, auditMiddleware_1.auditJobMiddleware)('MATERIAL_UPDATED'), jobMaterialController_1.updateJobMaterialAllocation);
// Remove material from job - AUDIT as MATERIAL_REMOVED
router.delete('/:jobId/materials/:materialId', (0, auditMiddleware_1.auditJobMiddleware)('MATERIAL_REMOVED'), jobMaterialController_1.removeJobMaterial);
exports.default = router;
