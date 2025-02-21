import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SupplierPerformanceService } from '../services/supplierPerformanceService';

const prisma = new PrismaClient();
const performanceService = new SupplierPerformanceService();

export const createSupplier = async (req: Request, res: Response) => {
    try {
        const { name, email, phone, address, rating } = req.body;
        const supplier = await prisma.supplier.create({
            data: {
                name,
                email,
                phone,
                address,
                rating,
                status: 'ACTIVE',
                totalOrders: 0,
                completedOrders: 0,
                averageDeliveryTime: 0
            }
        });
        res.status(201).json(supplier);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create supplier' });
    }
};

export const getSuppliers = async (req: Request, res: Response) => {
    try {
        const suppliers = await prisma.supplier.findMany({
            include: {
                materials: true
            }
        });
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
};

export const getSupplier = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const supplier = await prisma.supplier.findUnique({
            where: { id },
            include: {
                materials: true
            }
        });
        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        res.json(supplier);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch supplier' });
    }
};

export const updateSupplier = async (req: Request, res: Response) => {
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
        res.status(500).json({ error: 'Failed to update supplier' });
    }
};

export const getSupplierPerformanceReport = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const performance = await performanceService.getSupplierPerformanceReport(id);
        res.json(performance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getAllSuppliersPerformance = async (req: Request, res: Response) => {
    try {
        const performanceReports = await performanceService.getAllSuppliersPerformance();
        res.json(performanceReports);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};