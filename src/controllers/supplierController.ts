import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SupplierPerformanceService } from '../services/supplierPerformanceService';

const prisma = new PrismaClient();
const performanceService = new SupplierPerformanceService();

export const createSupplier = async (req: Request, res: Response) => {
    try {
        console.log('Creating supplier with data:', req.body);
        const { name, email, phone, address, rating, status, notes } = req.body;
        
        // Validate required fields
        if (!name || !email) {
            console.log('Validation failed: Missing required fields');
            return res.status(400).json({ error: 'Name and email are required' });
        }

        // Check if a supplier with this email already exists
        const existingSupplier = await prisma.supplier.findUnique({
            where: { email }
        });

        if (existingSupplier) {
            console.log('Supplier with email already exists');
            return res.status(409).json({ 
                error: 'A supplier with this email already exists', 
                supplierName: existingSupplier.name 
            });
        }

        const supplier = await prisma.supplier.create({
            data: {
                name,
                email,
                phone: phone || null,
                address: address || null,
                rating: rating ? parseFloat(rating) : 3, // Default to 3 if not provided
                status: status || 'ACTIVE',
                notes: notes || null,
                totalOrders: 0,
                completedOrders: 0,
                averageDeliveryTime: 0
            }
        });
        console.log('Supplier created successfully:', supplier);
        res.status(201).json(supplier);
    } catch (error) {
        console.error('Error creating supplier:', error);
        
        // Handle specific Prisma error codes
        if (error.code === 'P2002') {
            res.status(409).json({ 
                error: 'A supplier with this email already exists',
                details: error.message 
            });
        } else {
            res.status(500).json({ 
                error: 'Failed to create supplier', 
                details: error.message 
            });
        }
    }
};

export const getSuppliers = async (req: Request, res: Response) => {
    try {
        const { search, status } = req.query;

        const suppliers = await prisma.supplier.findMany({
            where: {
                AND: [
                    search ? {
                        OR: [
                            { name: { contains: search as string, mode: 'insensitive' } },
                            { email: { contains: search as string, mode: 'insensitive' } }
                        ]
                    } : {},
                    status ? { status: status as string } : {}
                ]
            },
            include: {
                materials: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(suppliers);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
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
        console.error('Error fetching supplier:', error);
        res.status(500).json({ error: 'Failed to fetch supplier' });
    }
};

export const updateSupplier = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, email, phone, address, rating, status, notes } = req.body;

        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        const supplier = await prisma.supplier.update({
            where: { id },
            data: {
                name,
                email,
                phone,
                address,
                rating,
                status,
                notes
            }
        });
        res.json(supplier);
    } catch (error) {
        console.error('Error updating supplier:', error);
        
        // Handle specific Prisma error codes
        if (error.code === 'P2002') {
            res.status(409).json({ 
                error: 'A supplier with this email already exists',
                details: error.message 
            });
        } else {
            res.status(500).json({ 
                error: 'Failed to update supplier', 
                details: error.message 
            });
        }
    }
};

export const getSupplierPerformanceReport = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const performance = await performanceService.getSupplierPerformanceReport(id);
        res.json(performance);
    } catch (error) {
        console.error('Error fetching supplier performance:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getAllSuppliersPerformance = async (req: Request, res: Response) => {
    try {
        const performanceReports = await performanceService.getAllSuppliersPerformance();
        res.json(performanceReports);
    } catch (error) {
        console.error('Error fetching all suppliers performance:', error);
        res.status(500).json({ error: error.message });
    }
};