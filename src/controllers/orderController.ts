// backend/src/controllers/orderController.ts
import { Request, Response, NextFunction } from 'express';
import { PrismaClient, OrderStatus } from '@prisma/client'; // Import OrderStatus if needed for updateOrderStatus
import * as quoteService from '../services/quoteService'; // Import your quoteService

const prisma = new PrismaClient();

// --- Existing createOrder (for direct order creation, if any) ---
export const createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // ... (your existing createOrder logic)
        // This function would be for creating orders NOT from a quote directly.
        // For safety, I'm keeping your existing logic. If this function is not meant
        // to be used for direct order creation, you might want to remove or refactor it.
        const {
            projectTitle, quoteRef, customerName, contactPerson, contactPhone, contactEmail,
            projectValue, marginPercent, leadTimeWeeks, items, currency = 'USD', vatRate = 0,
            paymentTerms = 'THIRTY_DAYS', customPaymentTerms, costBreakdown, exchangeRate,
            discounts, paymentSchedule, budgetAllocations
        } = req.body;

        const missingFields = [];
        if (!projectTitle) missingFields.push('Project Title');
        // if (!quoteRef) missingFields.push('Quote Reference'); // quoteRef might not be mandatory for direct orders
        if (!customerName) missingFields.push('Customer');
        if (!contactPerson) missingFields.push('Contact Person');
        // ... other validations
        if (projectValue === undefined || projectValue === null || projectValue === 0) missingFields.push('Project Value');


        if (missingFields.length > 0) {
            console.log('Missing required fields for direct order:', missingFields);
            res.status(400).json({ error: 'Missing required fields', missingFields });
            return;
        }

        const subTotal = projectValue;
        const totalTax = subTotal * (vatRate / 100);
        const totalAmount = subTotal + totalTax;
        const profitMargin = (marginPercent !== undefined ? marginPercent / 100 : 0) * subTotal;

        const order = await prisma.order.create({
            data: {
                projectTitle, quoteRef, customerName, contactPerson, contactPhone, contactEmail,
                projectValue, marginPercent: marginPercent !== undefined ? marginPercent : 0, 
                leadTimeWeeks: leadTimeWeeks !== undefined ? leadTimeWeeks : 4, 
                items, currency, vatRate, subTotal, totalTax, totalAmount, profitMargin,
                paymentTerms, customPaymentTerms, costBreakdown, exchangeRate, discounts,
                paymentSchedule, budgetAllocations,
                orderType: 'CUSTOMER_LINKED', // Or another type for direct orders
                status: 'DRAFT',
                createdBy: { connect: { id: (req as any).user.id } },
                projectOwner: { connect: { id: (req as any).user.id } }
            }
        });
        console.log('Direct Order created successfully:', order);
        res.status(201).json(order);

    } catch (error: any) {
        console.error('Create direct order error:', error);
        if (error.code === 'P2002' && error.meta?.target?.includes('quoteRef')) {
            res.status(400).json({ error: 'Unique constraint violation', details: 'A quote reference (if provided for direct order) must be unique or handled appropriately.' });
            return;
        }
        res.status(500).json({ error: 'Failed to create order', details: error.message });
    }
};


// --- NEW: Handler for Creating Order from Quote ---
export const createOrderFromQuoteHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { quoteId } = req.params;
        const userId = (req as any).user.id; // Assuming authMiddleware adds user to req

        if (!quoteId) {
            res.status(400).json({ error: 'Quote ID is required in path parameters.' });
            return;
        }
        if (!userId) {
            res.status(401).json({ error: 'User authentication required.' }); // Should be caught by authMiddleware
            return;
        }

        console.log(`[OrderController] Request to convert quote ${quoteId} to order by user ${userId}`);
        const result = await quoteService.convertQuoteToOrder(quoteId, userId);
        
        console.log(`[OrderController] Successfully converted quote ${quoteId}. New Order ID: ${result.order.id}`);
        res.status(201).json({
            message: 'Order created successfully from quote.',
            order: result.order,
            updatedQuote: result.quote
        });
    } catch (error: any) {
        console.error(`[OrderController] Error creating order from quote ${req.params.quoteId}:`, error.message);
        if (error.message.includes("not found") || error.message.includes("does not have a valid customer")) {
            res.status(404).json({ error: error.message });
        } else if (error.message.includes("Only APPROVED quotes can be converted") || error.message.includes("not in APPROVED status")) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to create order from quote.', details: error.message });
        }
    }
};


// --- Existing getOrders, getOrder, updateOrderStatus, updateOrder ---
// (Keep your existing implementations for these, ensure they are robust)
export const getOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // console.log('[OrdersController] Fetching all orders');
        const orders = await prisma.order.findMany({
            include: { customer: true, createdBy: { select: { id: true, name: true, email: true } }, projectOwner: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc'}
        });
        // console.log(`[OrdersController] Found ${orders.length} orders`);
        res.json(orders);
    } catch (error) { console.error('[OrdersController] Error fetching orders:', error); next(error); }
};

export const getOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        // console.log(`[OrdersController] Fetching order ${id}`);
        const order = await prisma.order.findUnique({
            where: { id },
            include: { customer: true, createdBy: { select: { id: true, name: true, email: true } }, projectOwner: { select: { id: true, name: true, email: true } }, paymentMilestones: true, sourceQuote: {select: {quoteNumber: true, versionNumber: true}} }
        });
        if (!order) { /* console.log(`[OrdersController] Order ${id} not found`); */ res.status(404).json({ error: 'Order not found' }); return; }
        // console.log(`[OrdersController] Found order ${id}`);
        res.json(order);
    } catch (error) { console.error(`[OrdersController] Error fetching order ${req.params.id}:`, error); next(error); }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        // console.log(`[OrdersController] Updating order ${id} status to ${status}`);
        if (!id || !status) { res.status(400).json({ error: 'Order ID and status are required' }); return; }
        // Add validation for status enum if necessary
        const order = await prisma.order.update({ where: { id }, data: { status: status as OrderStatus } });
        // console.log(`[OrdersController] Order ${id} status updated successfully:`, order);
        res.json(order);
    } catch (error: any) {
        console.error(`[OrdersController] Error updating order ${req.params.id} status:`, error);
        if (error.code === 'P2025') { res.status(404).json({ error: 'Order not found' }); return; }
        next(error);
    }
};

export const updateOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        // console.log(`[OrdersController] Updating order ${id}`, updateData);
        // Simplified updateData for now, add more fields and validation as needed
        const allowedFields: any = {};
        if (updateData.projectTitle) allowedFields.projectTitle = updateData.projectTitle;
        if (updateData.status) allowedFields.status = updateData.status as OrderStatus;
        if (updateData.notes) allowedFields.notes = updateData.notes;
        // Add more fields as necessary from your updateOrder logic
        // Be careful with financial recalculations here, ensure consistency

        const order = await prisma.order.update({ where: { id }, data: allowedFields });
        // console.log(`[OrdersController] Order ${id} updated successfully:`, order);
        res.json(order);
    } catch (error: any) {
        console.error(`[OrdersController] Error updating order ${req.params.id}:`, error);
        if (error.code === 'P2025') { res.status(404).json({ error: 'Order not found' }); return; }
        res.status(500).json({ error: 'Failed to update order', details: error.message });
    }
};

// --- NEW: Convert Order to Job ---
export const convertOrderToJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id: orderId } = req.params;
        const userId = (req as any).user.id;

        if (!orderId) {
            res.status(400).json({ error: 'Order ID is required' });
            return;
        }

        if (!userId) {
            res.status(401).json({ error: 'User authentication required' });
            return;
        }

        console.log(`[OrderController] Converting order ${orderId} to job by user ${userId}`);

        // Find the order with all necessary data
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { 
                customer: true,
                projectOwner: true
            }
        });

        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        if (order.status !== 'APPROVED') {
            res.status(400).json({ 
                error: 'Order must be approved before converting to job',
                currentStatus: order.status 
            });
            return;
        }

        if (order.jobId) {
            res.status(400).json({ 
                error: 'Order has already been converted to a job',
                existingJobId: order.jobId 
            });
            return;
        }

        // Calculate expected end date using leadTimeWeeks if available or default to 30 days
        const expectedEndDate = new Date();
        // Add either leadTimeWeeks converted to days, or default 30 days
        if (order.leadTimeWeeks) {
            expectedEndDate.setDate(expectedEndDate.getDate() + (order.leadTimeWeeks * 7)); // leadTimeWeeks * 7 days
        } else {
            expectedEndDate.setDate(expectedEndDate.getDate() + 30); // Default 30 days
        }

        // Create the job with only the fields that actually exist in the schema
        const newJob = await prisma.job.create({
            data: {
                title: order.projectTitle,
                description: order.notes || `Job created from order ${order.quoteRef || order.id}`,
                status: 'ACTIVE', // Using ACTIVE as default since that's what the schema shows
                customerId: order.customerId || (order.customer?.id || ''), // Required field
                startDate: new Date(),
                expectedEndDate: expectedEndDate
                // Removed all fields that don't exist in the schema
            }
        });

        // Update the order to link it to the job and change status
        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: { 
                jobId: newJob.id,
                status: 'IN_PRODUCTION',
                updatedAt: new Date()
            },
            include: {
                customer: true,
                job: true
            }
        });

        console.log(`[OrderController] Successfully converted order ${orderId} to job ${newJob.id}`);

        res.status(201).json({
            success: true,
            message: 'Order successfully converted to job',
            jobId: newJob.id,
            orderId: orderId,
            order: updatedOrder,
            job: newJob
        });

    } catch (error: any) {
        console.error(`[OrderController] Error converting order ${req.params.id} to job:`, error);
        res.status(500).json({ 
            error: 'Failed to convert order to job', 
            details: error.message 
        });
    }
};