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
exports.InventoryAlertService = void 0;
const client_1 = require("@prisma/client");
class InventoryAlertService {
    constructor() {
        this.prisma = new client_1.PrismaClient();
    }
    checkLowStockLevels() {
        return __awaiter(this, void 0, void 0, function* () {
            // Fixed: using currentStock instead of currentStockLevel
            // Fixed: using a fixed value for comparison instead of accessing reorderPoint on the model
            const lowStockMaterials = yield this.prisma.material.findMany({
                where: {
                    currentStock: { lte: 10 } // Using a fixed low threshold as default
                },
                include: { supplier: true }
            });
            // Filter materials where currentStock <= reorderPoint
            const filteredMaterials = lowStockMaterials.filter(material => { var _a; return material.currentStock <= ((_a = material.reorderPoint) !== null && _a !== void 0 ? _a : 0); });
            return filteredMaterials.map(material => {
                var _a, _b, _c;
                return ({
                    id: material.id,
                    name: material.name,
                    currentStock: material.currentStock, // Fixed: using currentStock
                    reorderPoint: (_a = material.reorderPoint) !== null && _a !== void 0 ? _a : 0, // Fixed: providing default value
                    supplier: (_c = (_b = material.supplier) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : 'Unknown Supplier' // Fixed: safe access with fallback
                });
            });
        });
    }
}
exports.InventoryAlertService = InventoryAlertService;
