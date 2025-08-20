import { Router } from 'express';
import { authenticateToken as authMiddleware } from '../middleware/authMiddleware';
import { quoteItemSearchController } from '../controllers/quoteItemSearchController';

const router = Router();
router.use(authMiddleware);

router.get('/search', async (req, res) => {
  await quoteItemSearchController.searchQuoteItems(req, res);
});

router.get('/quote/:quoteId', async (req, res) => {
  await quoteItemSearchController.getQuoteItems(req, res);
});

router.get('/frequent', async (req, res) => {
  await quoteItemSearchController.getFrequentItems(req, res);
});

router.get('/similar', async (req, res) => {
  await quoteItemSearchController.getSimilarItems(req, res);
});

router.get('/suggestions', async (req, res) => {
  await quoteItemSearchController.getSearchSuggestions(req, res);
});

router.get('/filters', async (req, res) => {
  await quoteItemSearchController.getFilterOptions(req, res);
});

export default router;
