import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
    createCustomer,
    getCustomers,
    getCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerOrders  // Add this new import
} from '../controllers/customerController';

const router = Router();

router.use(authenticateToken);

router.post('/', createCustomer);
router.get('/', getCustomers);
router.get('/:id', getCustomer);
router.get('/:customerId/orders', getCustomerOrders);  // Add this new route
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;