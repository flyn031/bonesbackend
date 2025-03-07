import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import * as quoteController from '../controllers/quoteController';

const router = express.Router();

// Quote routes
router.get('/', authMiddleware, quoteController.getAllQuotes);
router.get('/:id', authMiddleware, quoteController.getQuoteById);
router.post('/', authMiddleware, quoteController.createQuote);
router.put('/:id', authMiddleware, quoteController.updateQuote);
router.delete('/:id', authMiddleware, quoteController.deleteQuote);

// New route for cloning quotes
router.post('/:id/clone', authMiddleware, quoteController.cloneQuote);

export default router;