"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/orders.ts
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const orderController_1 = require("../controllers/orderController");
// ADD AUDIT MIDDLEWARE IMPORT
const auditMiddleware_1 = require("../middleware/auditMiddleware");
const router = (0, express_1.Router)();
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
router.use(authMiddleware_1.authenticateToken);
// --- NEW ROUTE for creating an order from a quote - ADD AUDIT ---
router.post('/from-quote/:quoteId', (0, auditMiddleware_1.auditOrderMiddleware)('CREATED_FROM_QUOTE'), orderController_1.createOrderFromQuoteHandler);
// --- NEW ROUTE for converting order to job - ADD AUDIT ---
router.post('/:id/convert-to-job', (0, auditMiddleware_1.auditOrderMiddleware)('CONVERTED_TO_JOB'), orderController_1.convertOrderToJob);
// CREATE route - ADD AUDIT MIDDLEWARE
router.post('/', (0, auditMiddleware_1.auditOrderMiddleware)('CREATE'), orderController_1.createOrder); // For direct order creation
// GET routes don't need auditing - they don't change data
router.get('/', orderController_1.getOrders);
router.get('/:id', orderController_1.getOrder);
// STATUS UPDATE route - ADD SPECIFIC STATUS AUDIT
router.patch('/:id/status', (0, auditMiddleware_1.auditStatusChangeMiddleware)('order'), orderController_1.updateOrderStatus);
// UPDATE route - ADD AUDIT MIDDLEWARE
router.patch('/:id', (0, auditMiddleware_1.auditOrderMiddleware)('UPDATE'), orderController_1.updateOrder); // General update
exports.default = router;
