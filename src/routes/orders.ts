import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
    createOrder,
    getOrders,
    getOrder,
    updateOrderStatus,
    updateOrder
} from '../controllers/orderController';

const router = Router();

// Protect all order routes
router.use(authenticateToken);

// Debug logging middleware
router.use((req, res, next) => {
    console.log(`[Orders] ${req.method} ${req.path}`, {
        params: req.params,
        body: req.body,
        query: req.query
    });
    next();
});

// Order routes
router.post('/', createOrder);
router.get('/', getOrders);
router.get('/:id', getOrder);
router.patch('/:id/status', updateOrderStatus);
router.patch('/:id', updateOrder);

export default router;