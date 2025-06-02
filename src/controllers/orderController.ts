// backend/src/controllers/orderController.ts
import { Request, Response, NextFunction } from 'express';
import { PrismaClient, OrderStatus, JobStatus, Job } from '@prisma/client';
import * as quoteService from '../services/quoteService';

const prisma = new PrismaClient();

// Define types for better type safety
interface OrderUpdateData {
    status?: OrderStatus;
    updatedAt?: Date;
    jobId?: string;
}

interface AllowedOrderFields {
    projectTitle?: string;
    status?: OrderStatus;
    notes?: string;
    customerName?: string;
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
    projectValue?: number;
    leadTimeWeeks?: number;
}

// --- Existing createOrder (for direct order creation, if any) ---
export const createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {
            projectTitle, quoteRef, customerName, contactPerson, contactPhone, contactEmail,
            projectValue, marginPercent, leadTimeWeeks, items, currency = 'USD', vatRate = 0,
            paymentTerms = 'THIRTY_DAYS', customPaymentTerms, costBreakdown, exchangeRate,
            discounts, paymentSchedule, budgetAllocations
        } = req.body;

        const missingFields: string[] = [];
        if (!projectTitle) missingFields.push('Project Title');
        if (!customerName) missingFields.push('Customer');
        if (!contactPerson) missingFields.push('Contact Person');
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
                orderType: 'CUSTOMER_LINKED',
                status: OrderStatus.IN_PRODUCTION, // ✅ FIXED: Use actual OrderStatus from database
                createdBy: { connect: { id: (req as any).user.id } },
                projectOwner: { connect: { id: (req as any).user.id } }
            }
        });
        console.log('Direct Order created successfully:', order);
        res.status(201).json(order);

    } catch (error: any) {
        console.error('Create direct order error:', error);
        if (error.code === 'P2002' && error.meta?.target?.includes('quoteRef')) {
            res.status(400).json({ error: 'Unique constraint violation', details: 'A quote reference must be unique.' });
            return;
        }
        res.status(500).json({ error: 'Failed to create order', details: error.message });
    }
};

// --- Handler for Creating Order from Quote ---
export const createOrderFromQuoteHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { quoteId } = req.params;
        const userId = (req as any).user.id;

        if (!quoteId) {
            res.status(400).json({ error: 'Quote ID is required in path parameters.' });
            return;
        }
        if (!userId) {
            res.status(401).json({ error: 'User authentication required.' });
            return;
        }

        console.log(`[OrderController] Converting quote ${quoteId} to order by user ${userId}`);
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

// --- Get Orders ---
export const getOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const orders = await prisma.order.findMany({
            include: { 
                customer: true, 
                job: {
                    select: { id: true, status: true, title: true }
                },
                createdBy: { select: { id: true, name: true, email: true } }, 
                projectOwner: { select: { id: true, name: true, email: true } } 
            },
            orderBy: { createdAt: 'desc'}
        });
        res.json(orders);
    } catch (error) { 
        console.error('[OrdersController] Error fetching orders:', error); 
        next(error); 
    }
};

// --- Get Single Order ---
export const getOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const order = await prisma.order.findUnique({
            where: { id },
            include: { 
                customer: true, 
                job: {
                    select: { id: true, status: true, title: true }
                },
                createdBy: { select: { id: true, name: true, email: true } }, 
                projectOwner: { select: { id: true, name: true, email: true } }, 
                paymentMilestones: true, 
                sourceQuote: { select: { quoteNumber: true, versionNumber: true } } 
            }
        });
        if (!order) { 
            res.status(404).json({ error: 'Order not found' }); 
            return; 
        }
        res.json(order);
    } catch (error) { 
        console.error(`[OrdersController] Error fetching order ${req.params.id}:`, error); 
        next(error); 
    }
};

// --- CLEAN: Update Order Status with Auto-Job Creation ---
export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = (req as any).user.id;
        
        console.log(`[OrdersController] Updating order ${id} status to ${status}`);
        
        if (!id || !status) { 
            res.status(400).json({ error: 'Order ID and status are required' }); 
            return; 
        }

        // ✅ FIXED: Use actual OrderStatus enum values from database with proper typing
        const validOrderStatuses: OrderStatus[] = [
            OrderStatus.IN_PRODUCTION, 
            OrderStatus.ON_HOLD, 
            OrderStatus.READY_FOR_DELIVERY, 
            OrderStatus.DELIVERED, 
            OrderStatus.COMPLETED
        ];
        
        if (!validOrderStatuses.includes(status)) {
            res.status(400).json({ 
                error: 'Invalid order status', 
                validStatuses: validOrderStatuses 
            });
            return;
        }

        // Get the current order with customer info
        const existingOrder = await prisma.order.findUnique({
            where: { id },
            include: { 
                customer: true,
                job: true
            }
        });

        if (!existingOrder) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        // AUTO-CREATE JOB WHEN ORDER STATUS CHANGES TO READY_FOR_DELIVERY (orders ready for work)
        let jobCreated: Job | null = null;
        if (status === OrderStatus.READY_FOR_DELIVERY && !existingOrder.jobId) {
            console.log(`[OrdersController] Auto-creating job for READY_FOR_DELIVERY order ${id}`);
            
            try {
                // Calculate expected end date using leadTimeWeeks if available or default to 30 days
                const expectedEndDate = new Date();
                if (existingOrder.leadTimeWeeks) {
                    expectedEndDate.setDate(expectedEndDate.getDate() + (existingOrder.leadTimeWeeks * 7));
                } else {
                    expectedEndDate.setDate(expectedEndDate.getDate() + 30); // Default 30 days
                }

                // ✅ FIXED: Create job with valid JobStatus from database
                jobCreated = await prisma.job.create({
                    data: {
                        title: existingOrder.projectTitle,
                        description: existingOrder.notes || `Job created from approved order ${existingOrder.quoteRef || existingOrder.id}`,
                        status: JobStatus.ACTIVE, // ✅ FIXED: Use valid JobStatus from database
                        customerId: existingOrder.customerId || existingOrder.customer?.id || '',
                        startDate: new Date(),
                        expectedEndDate: expectedEndDate
                    }
                });

                console.log(`[OrdersController] Auto-created job ${jobCreated.id} for approved order ${id}`);
            } catch (jobError) {
                console.error(`[OrdersController] Failed to auto-create job for order ${id}:`, jobError);
                // Continue with status update even if job creation fails
            }
        }

        // Update the order status (and link job if created)
        const updateData: OrderUpdateData = { 
            status: status as OrderStatus,
            updatedAt: new Date()
        };
        
        if (jobCreated) {
            updateData.jobId = jobCreated.id;
        }

        const order = await prisma.order.update({ 
            where: { id }, 
            data: updateData,
            include: {
                customer: true,
                job: {
                    select: { id: true, status: true, title: true }
                },
                createdBy: { select: { id: true, name: true, email: true } },
                projectOwner: { select: { id: true, name: true, email: true } }
            }
        });

        console.log(`[OrdersController] Order ${id} status updated to ${status}. Job created: ${!!jobCreated}`);
        
        res.json({
            order,
            jobCreated: !!jobCreated,
            jobId: jobCreated?.id || null,
            message: jobCreated ? 'Order moved to ready for delivery and job created automatically' : `Order status updated to ${status}`
        });

    } catch (error: any) {
        console.error(`[OrdersController] Error updating order ${req.params.id} status:`, error);
        if (error.code === 'P2025') { 
            res.status(404).json({ error: 'Order not found' }); 
            return; 
        }
        next(error);
    }
};

// --- Update Order ---
export const updateOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const allowedFields: AllowedOrderFields = {};
        if (updateData.projectTitle) allowedFields.projectTitle = updateData.projectTitle;
        if (updateData.status) allowedFields.status = updateData.status as OrderStatus;
        if (updateData.notes) allowedFields.notes = updateData.notes;
        if (updateData.customerName) allowedFields.customerName = updateData.customerName;
        if (updateData.contactPerson) allowedFields.contactPerson = updateData.contactPerson;
        if (updateData.contactEmail) allowedFields.contactEmail = updateData.contactEmail;
        if (updateData.contactPhone) allowedFields.contactPhone = updateData.contactPhone;
        if (updateData.projectValue !== undefined) allowedFields.projectValue = updateData.projectValue;
        if (updateData.leadTimeWeeks !== undefined) allowedFields.leadTimeWeeks = updateData.leadTimeWeeks;

        const order = await prisma.order.update({ 
            where: { id }, 
            data: allowedFields,
            include: {
                customer: true,
                job: {
                    select: { id: true, status: true, title: true }
                }
            }
        });
        
        res.json(order);
    } catch (error: any) {
        console.error(`[OrdersController] Error updating order ${req.params.id}:`, error);
        if (error.code === 'P2025') { 
            res.status(404).json({ error: 'Order not found' }); 
            return; 
        }
        res.status(500).json({ error: 'Failed to update order', details: error.message });
    }
};

// --- DEPRECATED: Convert Order to Job (now happens automatically on READY_FOR_DELIVERY) ---
export const convertOrderToJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id: orderId } = req.params;

        // Find the order
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { job: true }
        });

        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        if (order.jobId) {
            // Job already exists, return the existing job info
            res.status(200).json({
                success: true,
                message: 'Order already has an associated job',
                jobId: order.jobId,
                orderId: orderId,
                note: 'Jobs are now created automatically when orders are ready for delivery'
            });
            return;
        }

        // If order is not ready for delivery yet, suggest proper workflow
        if (order.status !== OrderStatus.READY_FOR_DELIVERY) {
            res.status(400).json({ 
                error: 'Order must be ready for delivery before it can have a job',
                currentStatus: order.status,
                suggestion: 'Change order status to READY_FOR_DELIVERY to automatically create a job'
            });
            return;
        }

        // This shouldn't happen if the auto-creation worked, but handle it gracefully
        res.status(500).json({
            error: 'Order is ready for delivery but no job was created automatically',
            suggestion: 'Try updating the order status to READY_FOR_DELIVERY again'
        });

    } catch (error: any) {
        console.error(`[OrderController] Error in convertOrderToJob ${req.params.id}:`, error);
        res.status(500).json({ 
            error: 'Failed to process job conversion request', 
            details: error.message 
        });
    }
};