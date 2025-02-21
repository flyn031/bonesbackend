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

        // More detailed validation
        const missingFields = [];
        if (!projectTitle) missingFields.push('Project Title');
        if (!quoteRef) missingFields.push('Quote Reference');
        if (!customerName) missingFields.push('Customer');
        if (!contactPerson) missingFields.push('Contact Person');
        if (!contactPhone) missingFields.push('Contact Phone');
        if (!contactEmail) missingFields.push('Contact Email');
        if (projectValue === undefined || projectValue === null || projectValue === 0) missingFields.push('Project Value');
        if (marginPercent === undefined || marginPercent === null) missingFields.push('Margin Percentage');
        if (leadTimeWeeks === undefined || leadTimeWeeks === null || leadTimeWeeks === 0) missingFields.push('Lead Time');

        if (missingFields.length > 0) {
            console.log('Missing required fields:', missingFields);
            res.status(400).json({ 
                error: 'Missing required fields', 
                missingFields: missingFields 
            });
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

        console.log('Order created successfully:', order);
        res.status(201).json(order);
    } catch (error) {
        console.error('Create order error:', error);
        // More detailed error handling
        console.error('Full error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        
        // Handle unique constraint violations (e.g., duplicate quote reference)
        if (error.code === 'P2002') {
            res.status(400).json({ 
                error: 'Unique constraint violation', 
                details: 'A quote reference must be unique' 
            });
            return;
        }

        // Generic error response
        res.status(500).json({ 
            error: 'Failed to create order', 
            details: error.message 
        });
    }
};

export const getOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        console.log('[Orders] Fetching all orders');
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
        console.log(`[Orders] Found ${orders.length} orders`);
        res.json(orders);
    } catch (error) {
        console.error('[Orders] Error fetching orders:', error);
        next(error);
    }
};

export const getOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        console.log(`[Orders] Fetching order ${id}`);

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
            console.log(`[Orders] Order ${id} not found`);
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        console.log(`[Orders] Found order ${id}`);
        res.json(order);
    } catch (error) {
        console.error(`[Orders] Error fetching order ${req.params.id}:`, error);
        next(error);
    }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        console.log(`[Orders] Updating order ${id} status to ${status}`);

        if (!id) {
            console.log('[Orders] No order ID provided');
            res.status(400).json({ error: 'Order ID is required' });
            return;
        }

        if (!status) {
            console.log('[Orders] No status provided');
            res.status(400).json({ error: 'Status is required' });
            return;
        }

        const order = await prisma.order.update({
            where: { id },
            data: { status }
        });

        console.log(`[Orders] Order ${id} status updated successfully:`, order);
        res.json(order);
    } catch (error) {
        console.error(`[Orders] Error updating order ${req.params.id} status:`, error);
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        next(error);
    }
};

export const updateOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        console.log(`[Orders] Updating order ${id}`, updateData);

        // Prepare an object with only updatable fields
        const allowedFields = {
            projectTitle: updateData.projectTitle,
            quoteRef: updateData.quoteRef,
            customerName: updateData.customerName,
            contactPerson: updateData.contactPerson,
            contactPhone: updateData.contactPhone,
            contactEmail: updateData.contactEmail,
            projectValue: updateData.projectValue,
            marginPercent: updateData.marginPercent,
            leadTimeWeeks: updateData.leadTimeWeeks,
            status: updateData.status,
            items: updateData.items,
            currency: updateData.currency,
            vatRate: updateData.vatRate,
            paymentTerms: updateData.paymentTerms,
            notes: updateData.notes
        };

        // Calculate financial values if project value is being updated
        if (updateData.projectValue) {
            allowedFields.subTotal = updateData.projectValue;
            allowedFields.totalTax = allowedFields.subTotal * ((updateData.vatRate || 0) / 100);
            allowedFields.totalAmount = allowedFields.subTotal + allowedFields.totalTax;
            allowedFields.profitMargin = (updateData.marginPercent / 100) * allowedFields.subTotal;
        }

        const order = await prisma.order.update({
            where: { id },
            data: allowedFields
        });

        console.log(`[Orders] Order ${id} updated successfully:`, order);
        res.json(order);
    } catch (error) {
        console.error(`[Orders] Error updating order ${req.params.id}:`, error);
        
        // More detailed error logging
        console.error('Full error object:', JSON.stringify(error, null, 2));

        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        
        // Send more detailed error response
        res.status(500).json({ 
            error: 'Failed to update order', 
            details: error.message 
        });
    }
};