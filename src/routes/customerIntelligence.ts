import { Router } from 'express';
import { authenticateToken as authMiddleware } from '../middleware/authMiddleware';
import { customerIntelligenceController } from '../controllers/customerIntelligenceController';

const router = Router();
router.use(authMiddleware);

router.get('/:customerId', async (req, res) => {
  await customerIntelligenceController.getCustomerIntelligence(req, res);
});

router.get('/:customerId/suggestions', async (req, res) => {
  await customerIntelligenceController.getCustomerSuggestions(req, res);
});

router.get('/:customerId/bundles', async (req, res) => {
  await customerIntelligenceController.getBundleRecommendations(req, res);
});

router.get('/quick-templates', async (req, res) => {
  await customerIntelligenceController.getQuickTemplates(req, res);
});

router.post('/bundles', async (req, res) => {
  await customerIntelligenceController.getDynamicBundles(req, res);
});

router.post('/quote-health', async (req, res) => {
  await customerIntelligenceController.analyzeQuoteHealth(req, res);
});

export default router;
