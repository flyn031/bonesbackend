"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware"); // Ensure path is correct
const dashboardController_1 = require("../controllers/dashboardController"); // Ensure path is correct
const router = (0, express_1.Router)();
// Apply authentication middleware to all dashboard routes
router.use(authMiddleware_1.authenticateToken);
// Basic dashboard endpoints
router.get('/stats', dashboardController_1.getDashboardData);
router.get('/trends', dashboardController_1.getOrderTrendsData); // Route for the line chart data
router.get('/activity', dashboardController_1.getRecentActivityData);
// --- **** NEW KPI ROUTE **** ---
router.get('/order-trend-kpi', dashboardController_1.getOrderTrendKPIData);
// --- **** END NEW KPI ROUTE **** ---
// Customer health endpoint
router.get('/customer-health', dashboardController_1.getCustomerHealthDashboard);
exports.default = router;
