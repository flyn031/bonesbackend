import { Request, Response } from 'express';
import { InventoryDashboardService } from '../services/inventoryDashboardService';

const inventoryDashboardService = new InventoryDashboardService();

export const getInventoryStatusSummary = async (req: Request, res: Response) => {
  try {
    const summary = await inventoryDashboardService.getInventoryStatusSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error fetching inventory status summary:', error);
    res.status(500).json({ error: 'Failed to fetch inventory status summary' });
  }
};

export const getLowStockMaterials = async (req: Request, res: Response) => {
  try {
    const lowStockMaterials = await inventoryDashboardService.getLowStockMaterials();
    res.json(lowStockMaterials);
  } catch (error) {
    console.error('Error fetching low stock materials:', error);
    res.status(500).json({ error: 'Failed to fetch low stock materials' });
  }
};