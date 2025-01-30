import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
    createCustomer,
    getCustomers,
    getCustomer,
    updateCustomer,
    deleteCustomer
} from '../controllers/customerController';

const router = Router();

router.use(authenticateToken);

router.post('/', createCustomer);
router.get('/', getCustomers);
router.get('/:id', getCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;