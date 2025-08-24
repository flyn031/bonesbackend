"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const customerPricingController_1 = require("../controllers/customerPricingController");
const router = (0, express_1.Router)();
// Apply authentication middleware to all routes
router.use(authMiddleware_1.authenticateToken);
// GET /api/customer-pricing?materialId=X&customerId=Y
// Get pricing for a specific customer and material combination
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield customerPricingController_1.customerPricingController.getCustomerPricing(req, res);
}));
// GET /api/customer-pricing/:customerId/history  
// Get all pricing records for a customer
router.get('/:customerId/history', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield customerPricingController_1.customerPricingController.getCustomerPricingHistory(req, res);
}));
// PUT /api/customer-pricing/:customerId/:materialId
// Update or create customer-specific pricing
router.put('/:customerId/:materialId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield customerPricingController_1.customerPricingController.updateCustomerPricing(req, res);
}));
// DELETE /api/customer-pricing/:customerId/:materialId
// Remove customer-specific pricing (will fall back to material default)
router.delete('/:customerId/:materialId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield customerPricingController_1.customerPricingController.deleteCustomerPricing(req, res);
}));
exports.default = router;
