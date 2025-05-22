"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const supplierController_1 = require("../controllers/supplierController");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
router.post('/', supplierController_1.createSupplier);
router.get('/', supplierController_1.getSuppliers);
// Performance routes BEFORE individual supplier route
router.get('/performance', supplierController_1.getAllSuppliersPerformance);
router.get('/:id/performance', supplierController_1.getSupplierPerformanceReport);
router.get('/:id', supplierController_1.getSupplier);
router.put('/:id', supplierController_1.updateSupplier);
exports.default = router;
