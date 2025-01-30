import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
        next(error);
    }
};

export const getCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const customers = await prisma.customer.findMany({
            include: {
                jobs: true,
                orders: true
            }
        });
        res.json(customers);
    } catch (error) {
        next(error);
    }
};

export const getCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;

        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                jobs: true,
                orders: true
            }
        });

        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }

        res.json(customer);
    } catch (error) {
        next(error);
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
        next(error);
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
        next(error);
    }
};