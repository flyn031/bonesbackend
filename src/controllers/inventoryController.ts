import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

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