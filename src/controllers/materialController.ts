import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createMaterial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { code, name, description, unitPrice, unit, minStock, currentStock, supplierId } = req.body;

        const material = await prisma.material.create({
            data: {
                code,
                name,
                description,
                unitPrice,
                unit,
                minStock,
                currentStock,
                supplierId
            }
        });

        res.status(201).json(material);
    } catch (error) {
        next(error);
    }
};

export const getMaterials = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const materials = await prisma.material.findMany({
            include: {
                supplier: true
            }
        });
        res.json(materials);
    } catch (error) {
        next(error);
    }
};

export const updateStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { currentStock } = req.body;

        const material = await prisma.material.update({
            where: { id },
            data: { currentStock }
        });

        // Check if stock is below minimum
        if (material.currentStock < material.minStock) {
            // In a real application, you might want to trigger notifications here
            console.warn(`Low stock alert for ${material.name}`);
        }

        res.json(material);
    } catch (error) {
        next(error);
    }
};