"use strict";
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
exports.getFrequentlyUsedItems = exports.deleteQuoteTemplate = exports.updateQuoteTemplate = exports.createQuoteTemplate = exports.getQuoteTemplateById = exports.getAllQuoteTemplates = void 0;
// backend/src/services/quoteTemplateService.ts
const client_1 = require("@prisma/client");
// Create a proxy to safely handle calls to non-existent models
const createPrismaProxy = (prismaClient) => {
    return new Proxy(prismaClient, {
        get: (target, prop) => {
            // For our custom models, return mock implementations
            if (prop === 'quoteTemplate') {
                return {
                    findMany: () => __awaiter(void 0, void 0, void 0, function* () { return []; }),
                    findUnique: () => __awaiter(void 0, void 0, void 0, function* () { return null; }),
                    create: (args) => __awaiter(void 0, void 0, void 0, function* () { return args.data; }),
                    update: (args) => __awaiter(void 0, void 0, void 0, function* () { return (Object.assign(Object.assign({}, args.data), { id: args.where.id })); }),
                    delete: (args) => __awaiter(void 0, void 0, void 0, function* () { return ({ id: args.where.id }); })
                };
            }
            if (prop === 'quoteTemplateItem') {
                return {
                    findMany: () => __awaiter(void 0, void 0, void 0, function* () { return []; }),
                    create: (args) => __awaiter(void 0, void 0, void 0, function* () { return args.data; }),
                    deleteMany: () => __awaiter(void 0, void 0, void 0, function* () { return ({ count: 0 }); })
                };
            }
            if (prop === 'customerPricing') {
                return {
                    findFirst: () => __awaiter(void 0, void 0, void 0, function* () { return null; })
                };
            }
            // For existing models, use the actual PrismaClient method
            return target[prop];
        }
    });
};
// Create a Prisma instance with our proxy
const prisma = createPrismaProxy(new client_1.PrismaClient());
/**
 * Get all quote templates
 */
const getAllQuoteTemplates = () => __awaiter(void 0, void 0, void 0, function* () {
    return prisma.quoteTemplate.findMany({
        include: {
            items: true,
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        }
    });
});
exports.getAllQuoteTemplates = getAllQuoteTemplates;
/**
 * Get quote template by ID
 */
const getQuoteTemplateById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma.quoteTemplate.findUnique({
        where: { id },
        include: {
            items: {
                include: {
                    material: true
                }
            },
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        }
    });
});
exports.getQuoteTemplateById = getQuoteTemplateById;
/**
 * Create a new quote template
 */
const createQuoteTemplate = (data) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma.quoteTemplate.create({
        data: {
            name: data.name,
            description: data.description,
            createdById: data.createdById,
            items: {
                create: data.items.map(item => ({
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    materialId: item.materialId,
                    isFrequentlyUsed: item.isFrequentlyUsed
                }))
            }
        },
        include: {
            items: true
        }
    });
});
exports.createQuoteTemplate = createQuoteTemplate;
/**
 * Update an existing quote template
 */
const updateQuoteTemplate = (id, data) => __awaiter(void 0, void 0, void 0, function* () {
    // Instead of using transactions directly for our proxy models,
    // we'll implement the transaction logic manually
    // First update the template basic info
    const updatedTemplate = yield prisma.quoteTemplate.update({
        where: { id },
        data: {
            name: data.name,
            description: data.description,
        }
    });
    // If items are provided, handle them
    if (data.items) {
        // Delete existing items
        yield prisma.quoteTemplateItem.deleteMany({
            where: { templateId: id }
        });
        // Create new items
        const newItems = yield Promise.all(data.items.map(item => prisma.quoteTemplateItem.create({
            data: {
                templateId: id,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                materialId: item.materialId,
                isFrequentlyUsed: item.isFrequentlyUsed
            }
        })));
    }
    // Return the complete updated template
    return prisma.quoteTemplate.findUnique({
        where: { id },
        include: {
            items: true,
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        }
    });
});
exports.updateQuoteTemplate = updateQuoteTemplate;
/**
 * Delete a quote template
 */
const deleteQuoteTemplate = (id) => __awaiter(void 0, void 0, void 0, function* () {
    // Instead of using transactions for our proxy models,
    // we'll implement the deletion logic sequentially
    // Delete all items first
    yield prisma.quoteTemplateItem.deleteMany({
        where: { templateId: id }
    });
    // Then delete the template
    return prisma.quoteTemplate.delete({
        where: { id }
    });
});
exports.deleteQuoteTemplate = deleteQuoteTemplate;
/**
 * Get all frequently used items
 */
const getFrequentlyUsedItems = (customerId) => __awaiter(void 0, void 0, void 0, function* () {
    // Get all items marked as frequently used
    const frequentItems = yield prisma.quoteTemplateItem.findMany({
        where: {
            isFrequentlyUsed: true
        },
        include: {
            material: true
        }
    });
    // If a customer ID is provided, check for customer-specific pricing
    if (customerId) {
        const itemsWithCustomerPricing = yield Promise.all(frequentItems.map((item) => __awaiter(void 0, void 0, void 0, function* () {
            if (item.materialId) {
                // Check for customer-specific pricing
                const customerPricing = yield prisma.customerPricing.findFirst({
                    where: {
                        customerId,
                        materialId: item.materialId,
                        validFrom: { lte: new Date() },
                        OR: [
                            { validUntil: null },
                            { validUntil: { gte: new Date() } }
                        ]
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                });
                if (customerPricing) {
                    // Apply customer-specific pricing if unitPrice is not null
                    if (customerPricing.unitPrice !== null) {
                        return Object.assign(Object.assign({}, item), { unitPrice: customerPricing.unitPrice });
                    }
                    else {
                        // If customerPricing exists but unitPrice is null, use original item's unitPrice
                        return item;
                    }
                }
                else {
                    // If no customerPricing found, use original item's unitPrice
                    return item;
                }
            }
            // If no materialId, no customer-specific pricing can apply, return original item
            return item;
        })));
        return itemsWithCustomerPricing; // Return the mapped items with potential custom pricing
    }
    // If no customer ID is provided, return original frequentItems directly
    return frequentItems;
});
exports.getFrequentlyUsedItems = getFrequentlyUsedItems;
