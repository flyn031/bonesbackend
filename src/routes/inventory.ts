import express from 'express';
import { 
    createInventoryItem, 
    getInventoryItems, 
    deleteInventoryItem,
    getInventoryItemById,
    updateInventoryItem,
    getLowStockItems,
    getInventoryStats
} from '../controllers/inventoryController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// Apply authentication middleware to all inventory routes
router.use(authenticateToken);

// Base inventory routes
router.post('/', createInventoryItem);
router.get('/', getInventoryItems);
router.get('/stats', getInventoryStats);
router.get('/low-stock', getLowStockItems);

// Individual item routes
router.get('/:id', getInventoryItemById);
router.put('/:id', updateInventoryItem);
router.delete('/:id', deleteInventoryItem);

export default router;