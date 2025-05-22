import { Request, Response } from 'express';
import { PrismaClient, SupplierStatus, Prisma } from '@prisma/client';
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
            res.status(400).json({ error: 'Name and email are required' });
            return; // Exit after sending response
        }

        // Check if a supplier with this email already exists
        const existingSupplier = await prisma.supplier.findUnique({
            where: { email }
        });

        if (existingSupplier) {
            console.log('Supplier with email already exists');
            res.status(409).json({
                error: 'A supplier with this email already exists',
                supplierName: existingSupplier.name
            });
            return; // Exit after sending response
        }

        // Store notes in a separate object to pass to metadata or another approach later
        const notesInfo = notes || null;

        const supplier = await prisma.supplier.create({
            data: {
                name,
                email,
                phone: phone || null,
                address: address || null,
                rating: rating ? parseFloat(rating) : 3, // Default to 3 if not provided
                status: (status as SupplierStatus) || 'ACTIVE',
                // Remove notes property since it doesn't exist in the Prisma model
                // Instead, we could store it in metadata or a separate table if needed
            }
        });
        
        // If you want to return notes with the response even though it's not stored
        const responseData = {
            ...supplier,
            notes: notesInfo // Add notes back to the response object
        };
        
        console.log('Supplier created successfully:', supplier);
        res.status(201).json(responseData);
    } catch (error: any) { // Explicitly type error as 'any'
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

        const whereClause: Prisma.SupplierWhereInput = {
            AND: [
                search ? {
                    OR: [
                        { name: { contains: search as string, mode: 'insensitive' } },
                        { email: { contains: search as string, mode: 'insensitive' } }
                    ]
                } : {},
            ]
        };

        // Proper type handling for status filter
        if (status) {
            // Validate if the status is a valid enum value
            const validStatuses = Object.values(SupplierStatus);
            const statusValue = status as string;
            
            if (validStatuses.includes(statusValue as SupplierStatus)) {
                whereClause.status = statusValue as SupplierStatus;
            } else {
                console.warn(`Invalid status value: ${statusValue}`);
                // You could either ignore invalid status or return an error
                // For now, we'll just ignore it
            }
        }

        const suppliers = await prisma.supplier.findMany({
            where: whereClause,
            include: {
                materials: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(suppliers);
    } catch (error: any) {
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
            res.status(404).json({ error: 'Supplier not found' });
            return; // Exit after sending response
        }
        res.json(supplier);
    } catch (error: any) {
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
            res.status(400).json({ error: 'Name and email are required' });
            return; // Exit after sending response
        }

        // Store notes separately
        const notesInfo = notes || null;

        const supplier = await prisma.supplier.update({
            where: { id },
            data: {
                name,
                email,
                phone,
                address,
                rating,
                status: status as SupplierStatus,
                // Remove notes property as it doesn't exist in the Prisma model
            }
        });

        // Add notes to the response
        const responseData = {
            ...supplier,
            notes: notesInfo
        };
        
        res.json(responseData);
    } catch (error: any) {
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
    } catch (error: any) {
        console.error('Error fetching supplier performance:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getAllSuppliersPerformance = async (req: Request, res: Response) => {
    try {
        const performanceReports = await performanceService.getAllSuppliersPerformance();
        res.json(performanceReports);
    } catch (error: any) {
        console.error('Error fetching all suppliers performance:', error);
        res.status(500).json({ error: error.message });
    }
};