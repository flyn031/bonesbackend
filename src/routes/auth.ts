import { Router, Response } from 'express';
import { 
  login, 
  register, 
  getUserProfile,
  updateUserProfile
} from '../controllers/authController';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

// Auth routes
router.post('/login', login);
router.post('/register', register);

// User me route
router.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({ message: 'Protected route accessed successfully', user: req.user });
});

// User profile routes
router.get('/profile', authenticateToken, getUserProfile);
router.put('/profile', authenticateToken, updateUserProfile);

export default router;