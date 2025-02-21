import express from 'express';
import { getDashboardData, getOrderTrendsData, getRecentActivityData } from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// Apply authentication middleware to all dashboard routes
router.use(authenticateToken);

// Dashboard endpoints
router.get('/stats', getDashboardData);
router.get('/trends', getOrderTrendsData);
router.get('/activity', getRecentActivityData);

export default router;