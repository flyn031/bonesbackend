import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
    createPaymentMilestone,
    createRegionalTaxSetting,
    createCurrencyRate,
    getCurrentRate
} from '../controllers/financialController';

const router = Router();

router.use(authenticateToken);

router.post('/milestones', createPaymentMilestone);
router.post('/tax-settings', createRegionalTaxSetting);
router.post('/currency-rates', createCurrencyRate);
router.get('/currency-rates/:fromCurrency/:toCurrency', getCurrentRate);

export default router;