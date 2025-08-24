import { Router } from 'express';
import { authenticateToken as authMiddleware } from '../middleware/authMiddleware';
import { customerPricingController } from '../controllers/customerPricingController';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// GET /api/customer-pricing?materialId=X&customerId=Y
// Get pricing for a specific customer and material combination
router.get('/', async (req, res) => {
  await customerPricingController.getCustomerPricing(req, res);
});

// GET /api/customer-pricing/:customerId/history  
// Get all pricing records for a customer
router.get('/:customerId/history', async (req, res) => {
  await customerPricingController.getCustomerPricingHistory(req, res);
});

// PUT /api/customer-pricing/:customerId/:materialId
// Update or create customer-specific pricing
router.put('/:customerId/:materialId', async (req, res) => {
  await customerPricingController.updateCustomerPricing(req, res);
});

// DELETE /api/customer-pricing/:customerId/:materialId
// Remove customer-specific pricing (will fall back to material default)
router.delete('/:customerId/:materialId', async (req, res) => {
  await customerPricingController.deleteCustomerPricing(req, res);
});

export default router;