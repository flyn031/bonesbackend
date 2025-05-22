// backend/src/routes/orders.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
    createOrder,
    getOrders,
    getOrder,
    updateOrderStatus,
    updateOrder,
    createOrderFromQuoteHandler,
    convertOrderToJob // NEW: Import the convert function
} from '../controllers/orderController';

// ADD AUDIT MIDDLEWARE IMPORT
import { auditOrderMiddleware, auditStatusChangeMiddleware } from '../middleware/auditMiddleware';

const router = Router();

// Debug logging middleware (already present, good)
router.use((req, res, next) => {
    console.log(`[Orders Route] ${req.method} ${req.path}`, {
        params: req.params,
        query: req.query,
        // Avoid logging full body for POST/PATCH in production if it contains sensitive data
        body: Object.keys(req.body).length > 0 ? '[BODY PRESENT]' : '{}' 
    });
    next();
});

// Protect all order routes
router.use(authenticateToken);

// --- NEW ROUTE for creating an order from a quote - ADD AUDIT ---
router.post('/from-quote/:quoteId', auditOrderMiddleware('CREATED_FROM_QUOTE'), createOrderFromQuoteHandler);

// --- NEW ROUTE for converting order to job - ADD AUDIT ---
router.post('/:id/convert-to-job', auditOrderMiddleware('CONVERTED_TO_JOB'), convertOrderToJob);

// CREATE route - ADD AUDIT MIDDLEWARE
router.post('/', auditOrderMiddleware('CREATE'), createOrder); // For direct order creation

// GET routes don't need auditing - they don't change data
router.get('/', getOrders);
router.get('/:id', getOrder);

// STATUS UPDATE route - ADD SPECIFIC STATUS AUDIT
router.patch('/:id/status', auditStatusChangeMiddleware('order'), updateOrderStatus);

// UPDATE route - ADD AUDIT MIDDLEWARE
router.patch('/:id', auditOrderMiddleware('UPDATE'), updateOrder); // General update

export default router;