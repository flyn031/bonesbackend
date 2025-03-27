import { Request, Response } from 'express';
import { PrismaClient, MaterialCategory } from '@prisma/client';

const prisma = new PrismaClient();

export const createInventoryItem = async (req: Request, res: Response) => {
    try {
        console.log('Received create item request with data:', JSON.stringify(req.body, null, 2));
        const {
            name,
            code,
            category,
            description,
            currentStockLevel,
            minStockLevel,
            unit,
            unitPrice,
            reorderPoint,
            leadTimeInDays
        } = req.body;

        console.log('Extracted data for creation:', {
            name,
            code,
            category,
            description,
            currentStockLevel,
            minStockLevel,
            unit,
            unitPrice,
            reorderPoint,
            leadTimeInDays
        });

        const item = await prisma.material.create({
            data: {
                name,
                code,
                category,
                description,
                currentStockLevel: Number(currentStockLevel),
                minStockLevel: Number(minStockLevel),
                unit,
                unitPrice: Number(unitPrice),
                reorderPoint: Number(reorderPoint),
                leadTimeInDays: Number(leadTimeInDays)
            }
        });

        console.log('Successfully created item:', item);
        res.status(201).json(item);
    } catch (error) {
        console.error('Detailed error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Failed to create inventory item', 
            details: error.message,
            stack: error.stack 
        });
    }
};

export const getInventoryItems = async (req: Request, res: Response) => {
    try {
        const items = await prisma.material.findMany({
            include: {
                supplier: true
            }
        });
        res.json(items);
    } catch (error) {
        console.error('Error fetching inventory items:', error);
        res.status(500).json({ error: 'Failed to fetch inventory items' });
    }
};

export const getInventoryItemById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const item = await prisma.material.findUnique({
            where: { id },
            include: {
                supplier: true
            }
        });
        
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        res.json(item);
    } catch (error) {
        console.error('Error fetching inventory item:', error);
        res.status(500).json({ error: 'Failed to fetch inventory item' });
    }
};

export const updateInventoryItem = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const item = await prisma.material.update({
            where: { id },
            data: updateData
        });

        res.json(item);
    } catch (error) {
        console.error('Error updating inventory item:', error);
        res.status(500).json({ error: 'Failed to update inventory item' });
    }
};

export const deleteInventoryItem = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.material.delete({
            where: { id }
        });
        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        res.status(500).json({ error: 'Failed to delete inventory item' });
    }
};

export const getLowStockItems = async (req: Request, res: Response) => {
    try {
        const items = await prisma.material.findMany({
            where: {
                currentStockLevel: {
                    lte: prisma.material.fields.minStockLevel
                }
            },
            include: {
                supplier: true
            }
        });
        res.json(items);
    } catch (error) {
        console.error('Error fetching low stock items:', error);
        res.status(500).json({ error: 'Failed to fetch low stock items' });
    }
};

export const getInventoryStats = async (req: Request, res: Response) => {
    try {
        const [totalItems, lowStockItems, totalValue] = await Promise.all([
            prisma.material.count(),
            prisma.material.count({
                where: {
                    currentStockLevel: {
                        lte: prisma.material.fields.minStockLevel
                    }
                }
            }),
            prisma.material.aggregate({
                _sum: {
                    unitPrice: true
                }
            })
        ]);

        res.json({
            totalItems,
            lowStockItems,
            totalValue: totalValue._sum.unitPrice || 0
        });
    } catch (error) {
        console.error('Error fetching inventory stats:', error);
        res.status(500).json({ error: 'Failed to fetch inventory stats' });
    }
};

export const getInventoryAlerts = async (req: Request, res: Response) => {
    try {
        console.log("Fetching inventory alerts...");
        
        // Find items with low stock (below or at minimum stock level)
        const lowStockItems = await prisma.material.findMany({
            where: {
                currentStockLevel: {
                    lte: prisma.material.fields.minStockLevel
                }
            },
            include: {
                supplier: true
            },
            orderBy: {
                currentStockLevel: 'asc' // Show most critical first
            }
        });
        
        console.log(`Found ${lowStockItems.length} items with low stock`);
        
        // Find items with zero stock
        const outOfStockItems = await prisma.material.findMany({
            where: {
                currentStockLevel: 0
            },
            include: {
                supplier: true
            }
        });
        
        console.log(`Found ${outOfStockItems.length} items out of stock`);
        
        // Find items below reorder point but not yet at minimum level
        const reorderItems = await prisma.material.findMany({
            where: {
                currentStockLevel: {
                    lte: prisma.material.fields.reorderPoint,
                    gt: prisma.material.fields.minStockLevel
                }
            },
            include: {
                supplier: true
            }
        });
        
        console.log(`Found ${reorderItems.length} items at reorder point`);
        
        // Transform items to include alert category and time-to-critical
        const alerts = [
            ...outOfStockItems.map(item => ({
                ...item,
                alertType: 'CRITICAL',
                alertMessage: 'Out of stock',
                severity: 3, // Highest severity
                daysToRestock: item.leadTimeInDays
            })),
            ...lowStockItems
                .filter(item => item.currentStockLevel > 0) // Exclude already counted out-of-stock items
                .map(item => ({
                    ...item,
                    alertType: 'LOW_STOCK',
                    alertMessage: `Below minimum level (${item.minStockLevel})`,
                    severity: 2, // Medium severity
                    daysToRestock: item.leadTimeInDays
                })),
            ...reorderItems.map(item => ({
                ...item,
                alertType: 'REORDER',
                alertMessage: `Below reorder point (${item.reorderPoint})`,
                severity: 1, // Lowest severity
                daysToRestock: item.leadTimeInDays
            }))
        ];
        
        // Sort by severity (highest first)
        alerts.sort((a, b) => b.severity - a.severity);
        
        // Group alerts by category for the dashboard
        const alertsByCategory = {
            critical: alerts.filter(alert => alert.alertType === 'CRITICAL'),
            lowStock: alerts.filter(alert => alert.alertType === 'LOW_STOCK'),
            reorder: alerts.filter(alert => alert.alertType === 'REORDER')
        };
        
        // Add summary stats
        const summary = {
            totalAlerts: alerts.length,
            criticalCount: alertsByCategory.critical.length,
            lowStockCount: alertsByCategory.lowStock.length,
            reorderCount: alertsByCategory.reorder.length,
            categoryCounts: {
                RAW_MATERIAL: alerts.filter(a => a.category === 'RAW_MATERIAL').length,
                MACHINE_PART: alerts.filter(a => a.category === 'MACHINE_PART').length,
                ELECTRICAL_COMPONENT: alerts.filter(a => a.category === 'ELECTRICAL_COMPONENT').length,
                MECHANICAL_COMPONENT: alerts.filter(a => a.category === 'MECHANICAL_COMPONENT').length,
                // Add other categories as needed
            }
        };
        
        console.log(`Returning ${alerts.length} total inventory alerts`);
        
        res.json({
            alerts,
            alertsByCategory,
            summary
        });
    } catch (error) {
        console.error('Error fetching inventory alerts:', error);
        res.status(500).json({ error: 'Failed to fetch inventory alerts', details: error.message });
    }
};