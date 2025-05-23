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
exports.SupplierPerformanceService = void 0;
const client_1 = require("@prisma/client");
class SupplierPerformanceService {
    constructor() {
        this.prisma = new client_1.PrismaClient();
    }
    calculatePerformanceScore(supplierId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Calculating performance for supplier: ${supplierId}`);
            // Get the base supplier info
            const supplierBase = yield this.prisma.supplier.findUnique({
                where: { id: supplierId },
                include: {
                // Include any relevant relations to help calculate performance metrics
                // For example:
                // materials: true,
                // orders: true, // Assuming there might be an orders relation
                }
            });
            if (!supplierBase) {
                console.error(`No supplier found with ID: ${supplierId}`);
                throw new Error('Supplier not found');
            }
            // Create an extended supplier object with calculated performance data
            const supplier = supplierBase;
            // Calculate performance metrics dynamically
            // Here you would normally calculate these from related data like orders
            // For now, using default values as placeholders
            // Example calculation (in a real system, this would be based on actual data)
            const calculatedTotalOrders = 0; // This would be calculated from orders relation
            const calculatedCompletedOrders = 0; // This would be calculated from orders relation
            const calculatedAvgDeliveryTime = 0; // This would be calculated from orders relation
            // Assign calculated values
            supplier.totalOrders = calculatedTotalOrders;
            supplier.completedOrders = calculatedCompletedOrders;
            supplier.averageDeliveryTime = calculatedAvgDeliveryTime;
            supplier.performanceHistory = '[]'; // Default empty history as JSON string
            // Parse performanceHistory or use empty array if not available
            const performanceHistory = supplier.performanceHistory
                ? JSON.parse(supplier.performanceHistory)
                : [];
            // Calculate completion rate safely
            const completionRate = (supplier.totalOrders || 0) > 0
                ? ((supplier.completedOrders || 0) / (supplier.totalOrders || 1)) * 100
                : 0;
            const performanceTrend = performanceHistory.length > 0
                ? this.determinePerformanceTrend(performanceHistory.slice(-5))
                : 'STABLE';
            let performanceScore = 0;
            performanceScore += completionRate * 0.4;
            performanceScore += (100 - Math.min(supplier.averageDeliveryTime || 0, 100)) * 0.3;
            performanceScore += this.getTrendScore(performanceTrend) * 0.3;
            return {
                supplierId: supplier.id,
                name: supplier.name,
                totalOrders: supplier.totalOrders || 0,
                completedOrders: supplier.completedOrders || 0,
                completionRate: Number(completionRate.toFixed(2)),
                averageDeliveryTime: supplier.averageDeliveryTime || 0,
                status: supplier.status,
                performanceScore: Number(performanceScore.toFixed(2)),
                lastOrderDate: supplier.lastOrderDate || undefined,
                performanceTrend,
                recentPerformanceHistory: performanceHistory
            };
        });
    }
    determinePerformanceTrend(history) {
        if (history.length < 2)
            return 'STABLE';
        const completedOrderRates = history.map(entry => entry.orderCompleted ? 1 : 0);
        const trend = completedOrderRates.reduce((acc, curr, index) => {
            if (index > 0) {
                acc += curr - completedOrderRates[index - 1];
            }
            return acc;
        }, 0);
        if (trend > 0.5)
            return 'IMPROVING';
        if (trend < -0.5)
            return 'DECLINING';
        return 'STABLE';
    }
    getTrendScore(trend) {
        switch (trend) {
            case 'IMPROVING': return 100;
            case 'STABLE': return 50;
            case 'DECLINING': return 0;
        }
    }
    getSupplierPerformanceReport(supplierId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.calculatePerformanceScore(supplierId);
        });
    }
    getAllSuppliersPerformance() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Starting getAllSuppliersPerformance');
            try {
                const suppliers = yield this.prisma.supplier.findMany();
                console.log(`Total suppliers found: ${suppliers.length}`);
                console.log('Supplier IDs:', suppliers.map(s => s.id));
                if (suppliers.length === 0) {
                    return [];
                }
                const performanceReports = [];
                for (const supplier of suppliers) {
                    try {
                        const report = yield this.calculatePerformanceScore(supplier.id);
                        performanceReports.push(report);
                    }
                    catch (error) {
                        console.error(`Error calculating performance for supplier ${supplier.id}:`, error);
                    }
                }
                console.log(`Total performance reports: ${performanceReports.length}`);
                return performanceReports;
            }
            catch (error) {
                console.error('Unexpected error in getAllSuppliersPerformance:', error);
                throw error;
            }
        });
    }
}
exports.SupplierPerformanceService = SupplierPerformanceService;
