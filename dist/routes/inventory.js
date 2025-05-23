"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/inventory.ts
const express_1 = __importDefault(require("express"));
const inventoryController_1 = require("../controllers/inventoryController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Routes with authentication middleware
router.post('/', authMiddleware_1.authenticateToken, inventoryController_1.createInventoryItem);
router.get('/', authMiddleware_1.authenticateToken, inventoryController_1.getInventoryItems);
router.get('/low-stock', authMiddleware_1.authenticateToken, inventoryController_1.getLowStockItems);
router.get('/stats', authMiddleware_1.authenticateToken, inventoryController_1.getInventoryStats);
router.get('/alerts', authMiddleware_1.authenticateToken, inventoryController_1.getInventoryAlerts);
router.get('/purpose', authMiddleware_1.authenticateToken, inventoryController_1.getMaterialsByPurpose);
router.get('/quotable', authMiddleware_1.authenticateToken, inventoryController_1.getQuotableItems);
router.get('/orderable', authMiddleware_1.authenticateToken, inventoryController_1.getOrderableItems);
router.get('/:id', authMiddleware_1.authenticateToken, inventoryController_1.getInventoryItemById);
router.put('/:id', authMiddleware_1.authenticateToken, inventoryController_1.updateInventoryItem);
router.delete('/:id', authMiddleware_1.authenticateToken, inventoryController_1.deleteInventoryItem);
exports.default = router;
