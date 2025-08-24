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
                // Look for historical pricing from previous quotes
                const quoteLineItems = yield prisma.quoteLineItem.findMany({
                    where: {
                        materialId: materialId,
                        quote: {
                            customerId: customerId,
                            status: { not: 'DRAFT' } // Only consider non-draft quotes
                        }
                    },
                    include: {
                        quote: {
                            select: {
                                id: true,
                                quoteNumber: true,
                                createdAt: true,
                                status: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 10 // Get last 10 instances
                });
                if (quoteLineItems.length > 0) {
                    // Calculate pricing statistics from historical data
                    const prices = quoteLineItems.map(item => item.unitPrice);
                    const latestPrice = prices[0];
                    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
                    const minPrice = Math.min(...prices);
                    const maxPrice = Math.max(...prices);
                    res.json({
                        success: true,
                        data: {
                            materialId: materialId,
                            customerId: customerId,
                            unitPrice: latestPrice, // Use most recent price
                            averagePrice,
                            minPrice,
                            maxPrice,
                            lastUpdated: quoteLineItems[0].createdAt,
                            hasCustomPricing: true,
                            historicalQuotes: quoteLineItems.length,
                            lastQuoteNumber: quoteLineItems[0].quote.quoteNumber,
                            priceHistory: quoteLineItems.map(item => ({
                                price: item.unitPrice,
                                date: item.createdAt,
                                quoteNumber: item.quote.quoteNumber
                            }))
                        }
                    });
                }
                else {
                    // No historical pricing found - return material's default price
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
                                hasCustomPricing: false,
                                historicalQuotes: 0
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
                // Get all materials this customer has been quoted for
                const quoteLineItems = yield prisma.quoteLineItem.findMany({
                    where: {
                        quote: {
                            customerId,
                            status: { not: 'DRAFT' }
                        }
                    },
                    include: {
                        material: {
                            select: {
                                id: true,
                                code: true,
                                name: true,
                                description: true,
                                unit: true
                            }
                        },
                        quote: {
                            select: {
                                quoteNumber: true,
                                createdAt: true,
                                status: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                });
                // Group by material and get latest pricing for each
                const materialPricingMap = new Map();
                quoteLineItems.forEach(item => {
                    if (item.material) {
                        const materialId = item.material.id;
                        if (!materialPricingMap.has(materialId)) {
                            materialPricingMap.set(materialId, {
                                material: item.material,
                                unitPrice: item.unitPrice,
                                lastUpdated: item.createdAt,
                                lastQuoteNumber: item.quote.quoteNumber,
                                quoteCount: 1
                            });
                        }
                        else {
                            // Update quote count
                            materialPricingMap.get(materialId).quoteCount++;
                        }
                    }
                });
                const pricingHistory = Array.from(materialPricingMap.values());
                res.json({
                    success: true,
                    data: pricingHistory
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
    // Simplified method - just returns analysis since we don't have a dedicated pricing table
    updateCustomerPricing(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            res.status(501).json({
                error: 'Not implemented',
                message: 'Customer pricing is based on quote history. Create new quotes to establish pricing patterns.'
            });
        });
    }
    deleteCustomerPricing(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            res.status(501).json({
                error: 'Not implemented',
                message: 'Customer pricing is based on quote history. Cannot delete historical quote data.'
            });
        });
    }
}
exports.customerPricingController = new CustomerPricingController();
