import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
    createOrder,
    getOrders,
    getOrder,
    updateOrderStatus
} from '../controllers/orderController';

const router = Router();

// Protect all order routes
router.use(authenticateToken);

// Order routes
router.post('/', createOrder);
router.get('/', getOrders);
router.get('/:id', getOrder);
router.patch('/:id/status', updateOrderStatus);

export default router;