import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { generateQuote } from '../controllers/pdfController';

const router = Router();

router.use(authenticateToken);
router.get('/quote/:orderId', (req: Request, res: Response) => generateQuote(req, res));

export default router;