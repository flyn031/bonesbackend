import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prismaClient';
import csv from 'csv-parser';
import fs from 'fs';

export const createCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { name, email, phone, address } = req.body;

        if (!name) {
            res.status(400).json({ error: 'Name is required' });
            return;
        }

        if (email) {
            const existingCustomer = await prisma.customer.findUnique({
                where: { email }
            });
            if (existingCustomer) {
                res.status(400).json({ error: 'Email already in use' });
                return;
            }
        }

        const customer = await prisma.customer.create({
            data: {
                name,
                email,
                phone,
                address
            }
        });

        res.status(201).json(customer);
    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(400).json({ error: 'Failed to create customer' });
    }
};

export const getCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {
            page = '1',
            limit = '20',
            search,
            status,
            minOrders,
            minSpent,
            lastOrderAfter
        } = req.query;

        const filter: any = {};

        if (search) {
            filter.OR = [
                { name: { contains: search as string, mode: 'insensitive' } },
                { email: { contains: search as string, mode: 'insensitive' } }
            ];
        }

        if (status && status !== 'all') {
            filter.status = status as string;
        }

        if (minOrders) {
            filter.totalOrders = { gte: parseInt(minOrders as string) };
        }

        if (minSpent) {
            filter.totalSpent = { gte: parseFloat(minSpent as string) };
        }

        if (lastOrderAfter) {
            filter.lastOrderDate = { gte: new Date(lastOrderAfter as string) };
        }

        const customers = await prisma.customer.findMany({
            where: filter,
            include: {
                // Simplified includes to avoid totalCosts reference
                jobs: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        startDate: true,
                        expectedEndDate: true
                    }
                },
                orders: true
            },
            skip: (parseInt(page as string) - 1) * parseInt(limit as string),
            take: parseInt(limit as string),
            orderBy: { createdAt: 'desc' }
        });

        const totalCustomers = await prisma.customer.count({ where: filter });

        res.json({
            customers,
            totalPages: Math.ceil(totalCustomers / parseInt(limit as string)),
            currentPage: parseInt(page as string),
            totalCustomers
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        // Return empty data as fallback
        res.json({
            customers: [],
            totalPages: 1,
            currentPage: parseInt(page as string) || 1,
            totalCustomers: 0
        });
    }
};

export const getCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;

        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                // Simplified includes to avoid totalCosts reference
                jobs: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        startDate: true,
                        expectedEndDate: true
                    }
                },
                orders: true
            }
        });

        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }

        res.json(customer);
    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ error: 'Failed to fetch customer details' });
    }
};

export const getCustomerOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { customerId } = req.params;

        // First, check if the customer exists
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: { id: true, name: true }
        });

        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }

        // Find orders directly linked to the customer by ID
        const linkedOrders = await prisma.order.findMany({
            where: { customerId: customerId },
            orderBy: { createdAt: 'desc' }
        });

        // Find orders linked to the customer by name
        const customerNameOrders = await prisma.order.findMany({
            where: { 
                customerName: { 
                    contains: customer.name,
                    mode: 'insensitive'
                },
                customerId: null // Only include orders not already linked by ID
            },
            orderBy: { createdAt: 'desc' }
        });

        // Combine both sets of orders
        const orders = [...linkedOrders, ...customerNameOrders];

        res.json(orders);
    } catch (error) {
        console.error('Error fetching customer orders:', error);
        res.status(500).json({ error: 'Failed to fetch customer orders' });
    }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, email, phone, address } = req.body;

        const existingCustomer = await prisma.customer.findUnique({
            where: { id }
        });

        if (!existingCustomer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }

        const customer = await prisma.customer.update({
            where: { id },
            data: {
                name,
                email,
                phone,
                address
            }
        });

        res.json(customer);
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ error: 'Failed to update customer' });
    }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;

        const existingCustomer = await prisma.customer.findUnique({
            where: { id }
        });

        if (!existingCustomer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }

        await prisma.customer.delete({
            where: { id }
        });

        res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ error: 'Failed to delete customer' });
    }
};

export const importCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }

    const results: any[] = [];

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            try {
                const validCustomers = results.map(customer => ({
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                    address: customer.address
                }));

                await prisma.customer.createMany({
                    data: validCustomers,
                    skipDuplicates: true
                });

                fs.unlinkSync(req.file.path);

                res.status(200).json({ message: `Imported ${validCustomers.length} customers successfully` });
            } catch (error) {
                console.error('Error importing customers:', error);
                res.status(500).json({ error: 'Failed to import customers' });
            }
        });
};