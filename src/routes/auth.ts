import { Router, Request, Response } from 'express'; // <--- IMPORTANT: Ensure 'Request' is imported here
import {
  login,
  register,
  getUserProfile,
  updateUserProfile
} from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware'; // <--- REMOVED AuthRequest from this import

const router = Router();

// Auth routes
router.post('/login', login);
router.post('/register', register);

// User me route
router.get('/me', authenticateToken, (req: Request, res: Response) => { // <--- CHANGED AuthRequest to Request
  res.json({ message: 'Protected route accessed successfully', user: req.user });
});

// User profile routes
router.get('/profile', authenticateToken, getUserProfile);
router.put('/profile', authenticateToken, updateUserProfile);

export default router;