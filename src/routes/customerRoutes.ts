import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { importCustomers } from '../controllers/customerController';
import multer from 'multer';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Add import route
router.post('/import', authenticateToken, upload.single('customers'), importCustomers);

export default router;