"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLowStockMaterials = exports.getInventoryStatusSummary = void 0;
const inventoryDashboardService_1 = require("../services/inventoryDashboardService");
const inventoryDashboardService = new inventoryDashboardService_1.InventoryDashboardService();
const getInventoryStatusSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const summary = yield inventoryDashboardService.getInventoryStatusSummary();
        res.json(summary);
    }
    catch (error) {
        console.error('Error fetching inventory status summary:', error);
        res.status(500).json({ error: 'Failed to fetch inventory status summary' });
    }
});
exports.getInventoryStatusSummary = getInventoryStatusSummary;
const getLowStockMaterials = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const lowStockMaterials = yield inventoryDashboardService.getLowStockMaterials();
        res.json(lowStockMaterials);
    }
    catch (error) {
        console.error('Error fetching low stock materials:', error);
        res.status(500).json({ error: 'Failed to fetch low stock materials' });
    }
});
exports.getLowStockMaterials = getLowStockMaterials;
