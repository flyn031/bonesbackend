// src/routes/inventory.ts
import express from 'express';
import { 
    createInventoryItem, 
    getInventoryItems, 
    getInventoryItemById, 
    updateInventoryItem, 
    deleteInventoryItem, 
    getLowStockItems, 
    getInventoryStats, 
    getInventoryAlerts,
    getMaterialsByPurpose,
    getQuotableItems,
    getOrderableItems
} from '../controllers/inventoryController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// Routes with authentication middleware
router.post('/', authenticateToken, createInventoryItem);
router.get('/', authenticateToken, getInventoryItems);
router.get('/low-stock', authenticateToken, getLowStockItems);
router.get('/stats', authenticateToken, getInventoryStats);
router.get('/alerts', authenticateToken, getInventoryAlerts);
router.get('/purpose', authenticateToken, getMaterialsByPurpose);
router.get('/quotable', authenticateToken, getQuotableItems);
router.get('/orderable', authenticateToken, getOrderableItems);
router.get('/:id', authenticateToken, getInventoryItemById);
router.put('/:id', authenticateToken, updateInventoryItem);
router.delete('/:id', authenticateToken, deleteInventoryItem);

export default router;