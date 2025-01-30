import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {
            projectTitle,
            quoteRef,
            customerName,
            contactPerson,
            contactPhone,
            contactEmail,
            projectValue,
            marginPercent,
            leadTimeWeeks,
            items,
            // New financial fields
            currency = 'USD',
            vatRate = 0,
            paymentTerms = 'THIRTY_DAYS',
            customPaymentTerms,
            costBreakdown,
            exchangeRate,
            discounts,
            paymentSchedule,
            budgetAllocations
        } = req.body;

        // Basic validation
        if (!projectTitle || !quoteRef || !customerName || !projectValue) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        // Calculate financial values
        const subTotal = projectValue;
        const totalTax = subTotal * (vatRate / 100);
        const totalAmount = subTotal + totalTax;
        const profitMargin = (marginPercent / 100) * subTotal;

        // Create order with all fields
        const order = await prisma.order.create({
            data: {
                projectTitle,
                quoteRef,
                customerName,
                contactPerson,
                contactPhone,
                contactEmail,
                projectValue,
                marginPercent,
                leadTimeWeeks,
                items,
                // Financial details
                currency,
                vatRate,
                subTotal,
                totalTax,
                totalAmount,
                profitMargin,
                paymentTerms,
                customPaymentTerms,
                costBreakdown,
                exchangeRate,
                discounts,
                paymentSchedule,
                budgetAllocations,
                // Relations
                orderType: 'CUSTOMER_LINKED',
                status: 'DRAFT',
                createdBy: {
                    connect: { id: (req as any).user.id }
                },
                projectOwner: {
                    connect: { id: (req as any).user.id }
                }
            }
        });

        res.status(201).json(order);
    } catch (error) {
        console.error('Create order error:', error);
        next(error);
    }
};

export const getOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const orders = await prisma.order.findMany({
            include: {
                customer: true,
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                projectOwner: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        res.json(orders);
    } catch (error) {
        next(error);
    }
};

export const getOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;

        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                customer: true,
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                projectOwner: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        res.json(order);
    } catch (error) {
        next(error);
    }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const order = await prisma.order.update({
            where: { id },
            data: { status }
        });

        res.json(order);
    } catch (error) {
        next(error);
    }
};