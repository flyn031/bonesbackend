import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
  getDashboardData,
  getOrderTrendsData,
  getRecentActivityData,
  getCustomerHealthDashboard
} from '../controllers/dashboardController';

const router = Router();

router.use(authenticateToken);

// Basic dashboard endpoints
router.get('/stats', getDashboardData);
router.get('/trends', getOrderTrendsData);
router.get('/activity', getRecentActivityData);

// Customer health endpoint
router.get('/customer-health', getCustomerHealthDashboard);

export default router;