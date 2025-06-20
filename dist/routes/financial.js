"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const financialController_1 = require("../controllers/financialController");
const financialReportController_1 = require("../controllers/financialReportController");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
// Existing routes
router.post('/milestones', financialController_1.createPaymentMilestone);
router.post('/tax-settings', financialController_1.createRegionalTaxSetting);
router.post('/currency-rates', financialController_1.createCurrencyRate);
router.get('/currency-rates/:fromCurrency/:toCurrency', financialController_1.getCurrentRate);
// New reporting routes
router.get('/summary', financialReportController_1.getFinancialSummary);
router.get('/supplier-performance', financialReportController_1.getSupplierFinancialPerformance);
// New financial metrics endpoint
router.get('/metrics', financialController_1.getFinancialMetrics);
exports.default = router;
