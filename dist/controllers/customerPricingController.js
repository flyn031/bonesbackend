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
exports.customerPricingController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class CustomerPricingController {
    getCustomerPricing(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { materialId, customerId } = req.query;
                if (!materialId || !customerId) {
                    res.status(400).json({
                        error: 'Missing required parameters',
                        details: 'Both materialId and customerId are required'
                    });
                    return;
                }
                // Look for customer-specific pricing
                const customerPricing = yield prisma.customerPricing.findFirst({
                    where: {
                        customerId: customerId,
                        materialId: materialId
                    }
                });
                if (customerPricing) {
                    res.json({
                        success: true,
                        data: {
                            materialId: customerPricing.materialId,
                            customerId: customerPricing.customerId,
                            unitPrice: customerPricing.unitPrice,
                            lastUpdated: customerPricing.updatedAt,
                            hasCustomPricing: true
                        }
                    });
                }
                else {
                    // No custom pricing found - return material's default price
                    const material = yield prisma.material.findUnique({
                        where: { id: materialId }
                    });
                    if (material) {
                        res.json({
                            success: true,
                            data: {
                                materialId: material.id,
                                customerId: customerId,
                                unitPrice: material.unitPrice,
                                lastUpdated: material.updatedAt,
                                hasCustomPricing: false
                            }
                        });
                    }
                    else {
                        res.status(404).json({
                            error: 'Material not found',
                            details: `Material with ID ${materialId} does not exist`
                        });
                    }
                }
            }
            catch (error) {
                console.error('Error getting customer pricing:', error);
                res.status(500).json({
                    error: 'Failed to get customer pricing',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
    getCustomerPricingHistory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { customerId } = req.params;
                // Get all pricing records for this customer
                const pricingHistory = yield prisma.customerPricing.findMany({
                    where: { customerId },
                    include: {
                        material: {
                            select: {
                                id: true,
                                code: true,
                                name: true,
                                description: true,
                                unit: true
                            }
                        }
                    },
                    orderBy: { updatedAt: 'desc' }
                });
                res.json({
                    success: true,
                    data: pricingHistory.map(pricing => ({
                        materialId: pricing.materialId,
                        material: pricing.material,
                        unitPrice: pricing.unitPrice,
                        lastUpdated: pricing.updatedAt,
                        notes: pricing.notes || null
                    }))
                });
            }
            catch (error) {
                console.error('Error getting customer pricing history:', error);
                res.status(500).json({
                    error: 'Failed to get customer pricing history',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
    updateCustomerPricing(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { customerId, materialId } = req.params;
                const { unitPrice, notes } = req.body;
                if (!unitPrice || unitPrice <= 0) {
                    res.status(400).json({
                        error: 'Invalid unit price',
                        details: 'Unit price must be a positive number'
                    });
                    return;
                }
                const customerPricing = yield prisma.customerPricing.upsert({
                    where: {
                        customerId_materialId: {
                            customerId,
                            materialId
                        }
                    },
                    update: {
                        unitPrice,
                        notes,
                        updatedAt: new Date()
                    },
                    create: {
                        customerId,
                        materialId,
                        unitPrice,
                        notes
                    },
                    include: {
                        material: {
                            select: {
                                code: true,
                                name: true
                            }
                        }
                    }
                });
                res.json({
                    success: true,
                    data: {
                        materialId: customerPricing.materialId,
                        customerId: customerPricing.customerId,
                        unitPrice: customerPricing.unitPrice,
                        notes: customerPricing.notes,
                        material: customerPricing.material,
                        updatedAt: customerPricing.updatedAt
                    }
                });
            }
            catch (error) {
                console.error('Error updating customer pricing:', error);
                res.status(500).json({
                    error: 'Failed to update customer pricing',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
    deleteCustomerPricing(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { customerId, materialId } = req.params;
                yield prisma.customerPricing.delete({
                    where: {
                        customerId_materialId: {
                            customerId,
                            materialId
                        }
                    }
                });
                res.json({
                    success: true,
                    message: 'Customer pricing deleted successfully'
                });
            }
            catch (error) {
                console.error('Error deleting customer pricing:', error);
                if (error instanceof Error && 'code' in error && error.code === 'P2025') {
                    res.status(404).json({
                        error: 'Customer pricing not found',
                        details: 'No custom pricing found for this customer and material combination'
                    });
                }
                else {
                    res.status(500).json({
                        error: 'Failed to delete customer pricing',
                        details: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
        });
    }
}
exports.customerPricingController = new CustomerPricingController();
