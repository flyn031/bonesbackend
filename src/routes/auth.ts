import { Router, Response } from 'express';
import { register, login } from '../controllers/authController';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({ message: 'Protected route accessed successfully', user: req.user });
});

export default router;