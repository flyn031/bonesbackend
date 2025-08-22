import express from 'express';
import { QuoteItemSearchController } from '../controllers/quoteItemSearchController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Search quote items across all company quotes
router.post('/search', QuoteItemSearchController.searchQuoteItems);

// Get frequently used items
router.post('/frequent', QuoteItemSearchController.getFrequentItems);

export default router;
