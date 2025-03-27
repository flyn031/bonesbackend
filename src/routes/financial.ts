import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
    createPaymentMilestone,
    createRegionalTaxSetting,
    createCurrencyRate,
    getCurrentRate,
    getFinancialMetrics
} from '../controllers/financialController';
import { 
    getFinancialSummary, 
    getSupplierFinancialPerformance 
} from '../controllers/financialReportController';

const router = Router();

router.use(authenticateToken);

// Existing routes
router.post('/milestones', createPaymentMilestone);
router.post('/tax-settings', createRegionalTaxSetting);
router.post('/currency-rates', createCurrencyRate);
router.get('/currency-rates/:fromCurrency/:toCurrency', getCurrentRate);

// New reporting routes
router.get('/summary', getFinancialSummary);
router.get('/supplier-performance', getSupplierFinancialPerformance);

// New financial metrics endpoint
router.get('/metrics', getFinancialMetrics);

export default router;