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
exports.InventoryDashboardService = void 0;
const client_1 = require("@prisma/client");
class InventoryDashboardService {
    constructor() {
        this.prisma = new client_1.PrismaClient();
    }
    getInventoryStatusSummary() {
        return __awaiter(this, void 0, void 0, function* () {
            const materials = yield this.prisma.material.findMany({
                include: {
                    supplier: true
                }
            });
            // Total materials
            const totalMaterials = materials.length;
            // Low stock materials
            const lowStockMaterials = materials.filter(m => { var _a; return m.currentStock <= ((_a = m.reorderPoint) !== null && _a !== void 0 ? _a : 0); } // Handle nullable reorderPoint
            ).length;
            // Total inventory value
            const totalInventoryValue = materials.reduce((sum, material) => sum + (material.currentStock * material.unitPrice), 0);
            // Material categories (simulated as unit type)
            const materialCategories = this.groupMaterialsByCategory(materials);
            // Supplier inventory breakdown
            const supplierInventoryBreakdown = this.calculateSupplierInventoryBreakdown(materials);
            return {
                totalMaterials,
                lowStockMaterials,
                totalInventoryValue,
                materialCategories,
                supplierInventoryBreakdown
            };
        });
    }
    getLowStockMaterials() {
        return __awaiter(this, void 0, void 0, function* () {
            // Fix the where clause to use a proper comparison with a number instead of trying to access reorderPoint on the model
            const materials = yield this.prisma.material.findMany({
                where: {
                    currentStock: {
                        lte: 10 // Using a fixed value as a temporary solution, ideally this should be dynamic
                    }
                },
                include: {
                    supplier: true
                }
            });
            // Filter in memory to get materials where currentStock <= reorderPoint
            const lowStockMaterials = materials.filter(m => { var _a; return m.currentStock <= ((_a = m.reorderPoint) !== null && _a !== void 0 ? _a : 0); });
            return lowStockMaterials.map(material => {
                var _a, _b, _c, _d, _e;
                return ({
                    id: material.id,
                    name: material.name,
                    currentStock: material.currentStock,
                    minStock: material.minStock,
                    reorderPoint: (_a = material.reorderPoint) !== null && _a !== void 0 ? _a : 0, // Provide default value for null
                    supplierName: (_c = (_b = material.supplier) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : 'Unknown Supplier', // Safe access with fallback
                    unitPrice: material.unitPrice,
                    percentageOfReorderPoint: ((_d = material.reorderPoint) !== null && _d !== void 0 ? _d : 0) > 0
                        ? Math.round((material.currentStock / ((_e = material.reorderPoint) !== null && _e !== void 0 ? _e : 1)) * 100)
                        : 0
                });
            });
        });
    }
    groupMaterialsByCategory(materials) {
        const categoriesMap = materials.reduce((acc, material) => {
            var _a;
            const category = material.unit;
            if (!acc[category]) {
                acc[category] = {
                    category,
                    materialCount: 0,
                    totalValue: 0,
                    lowStockCount: 0
                };
            }
            acc[category].materialCount++;
            acc[category].totalValue += material.currentStock * material.unitPrice;
            if (material.currentStock <= ((_a = material.reorderPoint) !== null && _a !== void 0 ? _a : 0)) {
                acc[category].lowStockCount++;
            }
            return acc;
        }, {});
        return Object.values(categoriesMap);
    }
    calculateSupplierInventoryBreakdown(materials) {
        const supplierMap = materials.reduce((acc, material) => {
            var _a;
            const supplierId = material.supplierId;
            if (!supplierId || !material.supplier)
                return acc;
            if (!acc[supplierId]) {
                acc[supplierId] = {
                    supplierId,
                    supplierName: material.supplier.name,
                    totalMaterials: 0,
                    totalInventoryValue: 0,
                    lowStockMaterials: 0
                };
            }
            acc[supplierId].totalMaterials++;
            acc[supplierId].totalInventoryValue +=
                material.currentStock * material.unitPrice;
            if (material.currentStock <= ((_a = material.reorderPoint) !== null && _a !== void 0 ? _a : 0)) {
                acc[supplierId].lowStockMaterials++;
            }
            return acc;
        }, {});
        return Object.values(supplierMap);
    }
}
exports.InventoryDashboardService = InventoryDashboardService;
