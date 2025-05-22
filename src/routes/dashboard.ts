import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware'; // Ensure path is correct
import {
  getDashboardData,
  getOrderTrendsData, // Keep for the chart
  getRecentActivityData,
  getCustomerHealthDashboard,
  getOrderTrendKPIData // **** Import the new controller function ****
} from '../controllers/dashboardController'; // Ensure path is correct

const router = Router();

// Apply authentication middleware to all dashboard routes
router.use(authenticateToken);

// Basic dashboard endpoints
router.get('/stats', getDashboardData);
router.get('/trends', getOrderTrendsData); // Route for the line chart data
router.get('/activity', getRecentActivityData);

// --- **** NEW KPI ROUTE **** ---
router.get('/order-trend-kpi', getOrderTrendKPIData);
// --- **** END NEW KPI ROUTE **** ---

// Customer health endpoint
router.get('/customer-health', getCustomerHealthDashboard);

export default router;