"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const materialController_1 = require("../controllers/materialController");
// Import the direct purpose update function from inventoryController
const inventoryController_1 = require("../controllers/inventoryController");
const router = (0, express_1.Router)();
// Material routes
router.post('/', materialController_1.createMaterial);
router.get('/', materialController_1.getMaterials);
router.get('/categories', materialController_1.getMaterialCategories);
router.get('/:id', materialController_1.getMaterialById);
router.put('/:id', materialController_1.updateMaterial);
router.delete('/:id', materialController_1.deleteMaterial);
router.patch('/:id/stock', materialController_1.updateStock);
router.post('/samples/:supplierId', materialController_1.createSampleMaterials);
// Add the new direct purpose update endpoint
router.put('/:id/purpose', inventoryController_1.updateInventoryPurposeDirectly);
exports.default = router;
