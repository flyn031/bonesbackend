import express from 'express';
import { 
  getDashboardData, 
  getOrderTrendsData, 
  getRecentActivityData,
  getCustomerHealthDashboard 
} from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// Apply authentication middleware to all dashboard routes
router.use(authenticateToken);

// Dashboard endpoints
router.get('/stats', getDashboardData as express.RequestHandler);
router.get('/trends', getOrderTrendsData as express.RequestHandler);
router.get('/activity', getRecentActivityData as express.RequestHandler);
router.get('/customer-health', getCustomerHealthDashboard as express.RequestHandler);

export default router;