// src/routes/customers.ts
import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware'; // Changed import to middleware file

// Import controller functions
import {
    createCustomer,
    getCustomers,
    getCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerOrders,
} from '../controllers/customerController';

// TEMPORARILY use direct imports instead of contactRoutes
import {
    createContactPerson,
    getContactPersonsForCustomer,
    setPrimaryContactPerson
} from '../controllers/contactController';

// Assuming authenticateToken expects (req: Request, res: Response, next: NextFunction)
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Apply authentication middleware to all customer routes
router.use(authenticateToken);

// --- Standard Customer Routes ---
router.route('/')
    .post(createCustomer)
    .get(getCustomers);

router.route('/:id')
    .get(getCustomer)
    .put(updateCustomer)
    .delete(deleteCustomer);

// --- Route for getting orders for a specific customer ---
router.get('/:customerId/orders', getCustomerOrders);

// DIRECT CONTACT ROUTES (temporary until we implement modular approach)
// Fix: Use RequestHandler pattern instead of async arrow functions
router.post('/:customerId/contacts', (req, res, next) => {
    createContactPerson(req as AuthRequest, res)
        .catch(next);
});

router.get('/:customerId/contacts', (req, res, next) => {
    getContactPersonsForCustomer(req as AuthRequest, res)
        .catch(next);
});

router.put('/:customerId/contacts/:contactId/set-primary', (req, res, next) => {
    setPrimaryContactPerson(req as AuthRequest, res)
        .catch(next);
});

export default router;