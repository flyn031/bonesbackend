import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { name, email, phone, address, rating } = req.body;

        const supplier = await prisma.supplier.create({
            data: {
                name,
                email,
                phone,
                address,
                rating
            }
        });

        res.status(201).json(supplier);
    } catch (error) {
        next(error);
    }
};

export const getSuppliers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const suppliers = await prisma.supplier.findMany({
            include: {
                materials: true
            }
        });
        res.json(suppliers);
    } catch (error) {
        next(error);
    }
};

export const getSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const supplier = await prisma.supplier.findUnique({
            where: { id },
            include: {
                materials: true
            }
        });

        if (!supplier) {
            res.status(404).json({ error: 'Supplier not found' });
            return;
        }

        res.json(supplier);
    } catch (error) {
        next(error);
    }
};

export const updateSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, email, phone, address, rating, status } = req.body;

        const supplier = await prisma.supplier.update({
            where: { id },
            data: {
                name,
                email,
                phone,
                address,
                rating,
                status
            }
        });

        res.json(supplier);
    } catch (error) {
        next(error);
    }
};