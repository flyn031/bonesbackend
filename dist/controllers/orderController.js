"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertOrderToJob = exports.updateOrder = exports.updateOrderStatus = exports.getOrder = exports.getOrders = exports.createOrderFromQuoteHandler = exports.createOrder = void 0;
const client_1 = require("@prisma/client");
const quoteService = __importStar(require("../services/quoteService"));
const prisma = new client_1.PrismaClient();
// --- Existing createOrder (for direct order creation, if any) ---
const createOrder = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { projectTitle, quoteRef, customerName, contactPerson, contactPhone, contactEmail, projectValue, marginPercent, leadTimeWeeks, items, currency = 'USD', vatRate = 0, paymentTerms = 'THIRTY_DAYS', customPaymentTerms, costBreakdown, exchangeRate, discounts, paymentSchedule, budgetAllocations } = req.body;
        const missingFields = [];
        if (!projectTitle)
            missingFields.push('Project Title');
        if (!customerName)
            missingFields.push('Customer');
        if (!contactPerson)
            missingFields.push('Contact Person');
        if (projectValue === undefined || projectValue === null || projectValue === 0)
            missingFields.push('Project Value');
        if (missingFields.length > 0) {
            console.log('Missing required fields for direct order:', missingFields);
            res.status(400).json({ error: 'Missing required fields', missingFields });
            return;
        }
        const subTotal = projectValue;
        const totalTax = subTotal * (vatRate / 100);
        const totalAmount = subTotal + totalTax;
        const profitMargin = (marginPercent !== undefined ? marginPercent / 100 : 0) * subTotal;
        const order = yield prisma.order.create({
            data: {
                projectTitle, quoteRef, customerName, contactPerson, contactPhone, contactEmail,
                projectValue, marginPercent: marginPercent !== undefined ? marginPercent : 0,
                leadTimeWeeks: leadTimeWeeks !== undefined ? leadTimeWeeks : 4,
                items, currency, vatRate, subTotal, totalTax, totalAmount, profitMargin,
                paymentTerms, customPaymentTerms, costBreakdown, exchangeRate, discounts,
                paymentSchedule, budgetAllocations,
                orderType: 'CUSTOMER_LINKED',
                status: client_1.OrderStatus.IN_PRODUCTION, // ✅ FIXED: Use actual OrderStatus from database
                createdBy: { connect: { id: req.user.id } },
                projectOwner: { connect: { id: req.user.id } }
            }
        });
        console.log('Direct Order created successfully:', order);
        res.status(201).json(order);
    }
    catch (error) {
        console.error('Create direct order error:', error);
        if (error.code === 'P2002' && ((_b = (_a = error.meta) === null || _a === void 0 ? void 0 : _a.target) === null || _b === void 0 ? void 0 : _b.includes('quoteRef'))) {
            res.status(400).json({ error: 'Unique constraint violation', details: 'A quote reference must be unique.' });
            return;
        }
        res.status(500).json({ error: 'Failed to create order', details: error.message });
    }
});
exports.createOrder = createOrder;
// --- Handler for Creating Order from Quote ---
const createOrderFromQuoteHandler = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { quoteId } = req.params;
        const userId = req.user.id;
        if (!quoteId) {
            res.status(400).json({ error: 'Quote ID is required in path parameters.' });
            return;
        }
        if (!userId) {
            res.status(401).json({ error: 'User authentication required.' });
            return;
        }
        console.log(`[OrderController] Converting quote ${quoteId} to order by user ${userId}`);
        const result = yield quoteService.convertQuoteToOrder(quoteId, userId);
        console.log(`[OrderController] Successfully converted quote ${quoteId}. New Order ID: ${result.order.id}`);
        res.status(201).json({
            message: 'Order created successfully from quote.',
            order: result.order,
            updatedQuote: result.quote
        });
    }
    catch (error) {
        console.error(`[OrderController] Error creating order from quote ${req.params.quoteId}:`, error.message);
        if (error.message.includes("not found") || error.message.includes("does not have a valid customer")) {
            res.status(404).json({ error: error.message });
        }
        else if (error.message.includes("Only APPROVED quotes can be converted") || error.message.includes("not in APPROVED status")) {
            res.status(400).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Failed to create order from quote.', details: error.message });
        }
    }
});
exports.createOrderFromQuoteHandler = createOrderFromQuoteHandler;
// --- Get Orders ---
const getOrders = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orders = yield prisma.order.findMany({
            include: {
                customer: true,
                job: {
                    select: { id: true, status: true, title: true }
                },
                createdBy: { select: { id: true, name: true, email: true } },
                projectOwner: { select: { id: true, name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
    }
    catch (error) {
        console.error('[OrdersController] Error fetching orders:', error);
        next(error);
    }
});
exports.getOrders = getOrders;
// --- Get Single Order ---
const getOrder = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const order = yield prisma.order.findUnique({
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
    }
    catch (error) {
        console.error(`[OrdersController] Error fetching order ${req.params.id}:`, error);
        next(error);
    }
});
exports.getOrder = getOrder;
// --- CLEAN: Update Order Status with Auto-Job Creation ---
const updateOrderStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.user.id;
        console.log(`[OrdersController] Updating order ${id} status to ${status}`);
        if (!id || !status) {
            res.status(400).json({ error: 'Order ID and status are required' });
            return;
        }
        // ✅ FIXED: Use actual OrderStatus enum values from database
        const validOrderStatuses = [client_1.OrderStatus.IN_PRODUCTION, client_1.OrderStatus.ON_HOLD, client_1.OrderStatus.READY_FOR_DELIVERY, client_1.OrderStatus.DELIVERED, client_1.OrderStatus.COMPLETED];
        if (!validOrderStatuses.includes(status)) {
            res.status(400).json({
                error: 'Invalid order status',
                validStatuses: validOrderStatuses
            });
            return;
        }
        // Get the current order with customer info
        const existingOrder = yield prisma.order.findUnique({
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
        let jobCreated = null;
        if (status === client_1.OrderStatus.READY_FOR_DELIVERY && !existingOrder.jobId) {
            console.log(`[OrdersController] Auto-creating job for READY_FOR_DELIVERY order ${id}`);
            try {
                // Calculate expected end date using leadTimeWeeks if available or default to 30 days
                const expectedEndDate = new Date();
                if (existingOrder.leadTimeWeeks) {
                    expectedEndDate.setDate(expectedEndDate.getDate() + (existingOrder.leadTimeWeeks * 7));
                }
                else {
                    expectedEndDate.setDate(expectedEndDate.getDate() + 30); // Default 30 days
                }
                // ✅ FIXED: Create job with valid JobStatus from database
                jobCreated = yield prisma.job.create({
                    data: {
                        title: existingOrder.projectTitle,
                        description: existingOrder.notes || `Job created from approved order ${existingOrder.quoteRef || existingOrder.id}`,
                        status: client_1.JobStatus.ACTIVE, // ✅ FIXED: Use valid JobStatus from database
                        customerId: existingOrder.customerId || ((_a = existingOrder.customer) === null || _a === void 0 ? void 0 : _a.id) || '',
                        startDate: new Date(),
                        expectedEndDate: expectedEndDate
                    }
                });
                console.log(`[OrdersController] Auto-created job ${jobCreated.id} for approved order ${id}`);
            }
            catch (jobError) {
                console.error(`[OrdersController] Failed to auto-create job for order ${id}:`, jobError);
                // Continue with status update even if job creation fails
            }
        }
        // Update the order status (and link job if created)
        const updateData = {
            status: status,
            updatedAt: new Date()
        };
        if (jobCreated) {
            updateData.jobId = jobCreated.id;
        }
        const order = yield prisma.order.update({
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
            jobId: (jobCreated === null || jobCreated === void 0 ? void 0 : jobCreated.id) || null,
            message: jobCreated ? 'Order moved to ready for delivery and job created automatically' : `Order status updated to ${status}`
        });
    }
    catch (error) {
        console.error(`[OrdersController] Error updating order ${req.params.id} status:`, error);
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        next(error);
    }
});
exports.updateOrderStatus = updateOrderStatus;
// --- Update Order ---
const updateOrder = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const allowedFields = {};
        if (updateData.projectTitle)
            allowedFields.projectTitle = updateData.projectTitle;
        if (updateData.status)
            allowedFields.status = updateData.status;
        if (updateData.notes)
            allowedFields.notes = updateData.notes;
        if (updateData.customerName)
            allowedFields.customerName = updateData.customerName;
        if (updateData.contactPerson)
            allowedFields.contactPerson = updateData.contactPerson;
        if (updateData.contactEmail)
            allowedFields.contactEmail = updateData.contactEmail;
        if (updateData.contactPhone)
            allowedFields.contactPhone = updateData.contactPhone;
        if (updateData.projectValue !== undefined)
            allowedFields.projectValue = updateData.projectValue;
        if (updateData.leadTimeWeeks !== undefined)
            allowedFields.leadTimeWeeks = updateData.leadTimeWeeks;
        const order = yield prisma.order.update({
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
    }
    catch (error) {
        console.error(`[OrdersController] Error updating order ${req.params.id}:`, error);
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        res.status(500).json({ error: 'Failed to update order', details: error.message });
    }
});
exports.updateOrder = updateOrder;
// --- DEPRECATED: Convert Order to Job (now happens automatically on READY_FOR_DELIVERY) ---
const convertOrderToJob = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: orderId } = req.params;
        // Find the order
        const order = yield prisma.order.findUnique({
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
        if (order.status !== client_1.OrderStatus.READY_FOR_DELIVERY) {
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
    }
    catch (error) {
        console.error(`[OrderController] Error in convertOrderToJob ${req.params.id}:`, error);
        res.status(500).json({
            error: 'Failed to process job conversion request',
            details: error.message
        });
    }
});
exports.convertOrderToJob = convertOrderToJob;
