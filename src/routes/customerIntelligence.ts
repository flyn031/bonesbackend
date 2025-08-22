import { Router } from 'express';
import { authenticateToken as authMiddleware } from '../middleware/authMiddleware';
import { customerIntelligenceController } from '../controllers/customerIntelligenceController';

const router = Router();
router.use(authMiddleware);

// Move quick-templates BEFORE /:customerId to avoid route conflicts
router.get('/quick-templates', async (req, res) => {
  await customerIntelligenceController.getQuickTemplates(req, res);
});

// Add missing routes that frontend expects
router.get('/dynamic-bundles', async (req, res) => {
  await customerIntelligenceController.getDynamicBundles(req, res);
});

router.get('/seasonal-recommendations', async (req, res) => {
  // Add a simple seasonal recommendations handler
  res.json({ 
    success: true, 
    data: [] // Empty for now, can be implemented later
  });
});

// Customer-specific routes
router.get('/:customerId', async (req, res) => {
  await customerIntelligenceController.getCustomerIntelligence(req, res);
});

router.get('/:customerId/suggestions', async (req, res) => {
  await customerIntelligenceController.getCustomerSuggestions(req, res);
});

router.get('/:customerId/bundles', async (req, res) => {
  await customerIntelligenceController.getBundleRecommendations(req, res);
});

router.get('/:customerId/comprehensive', async (req, res) => {
  await customerIntelligenceController.getComprehensiveInsights(req, res);
});

// POST routes
router.post('/bundles', async (req, res) => {
  await customerIntelligenceController.getDynamicBundles(req, res);
});

router.post('/quote-health', async (req, res) => {
  await customerIntelligenceController.analyzeQuoteHealth(req, res);
});

router.post('/analyze-quote-health', async (req, res) => {
  await customerIntelligenceController.analyzeQuoteHealth(req, res);
});

export default router;