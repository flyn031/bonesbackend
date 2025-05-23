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
exports.MaterialService = void 0;
// In src/services/materialService.ts
const client_1 = require("@prisma/client");
class MaterialService {
    constructor() {
        this.prisma = new client_1.PrismaClient();
    }
    createSampleMaterialsForSupplier(supplierId) {
        return __awaiter(this, void 0, void 0, function* () {
            const sampleMaterials = [
                {
                    name: 'Steel Pipe',
                    description: 'Industrial grade steel pipe',
                    unitPrice: 50.00,
                    unit: 'meter',
                    minStock: 100,
                    currentStock: 500,
                    supplierId: supplierId,
                    code: 'SP-001' // Added required code field
                },
                {
                    name: 'Aluminum Sheet',
                    description: 'Thin aluminum sheet',
                    unitPrice: 75.50,
                    unit: 'square meter',
                    minStock: 50,
                    currentStock: 250,
                    supplierId: supplierId,
                    code: 'AS-001' // Added required code field
                },
                {
                    name: 'Copper Wire',
                    description: 'Electrical grade copper wire',
                    unitPrice: 25.75,
                    unit: 'kg',
                    minStock: 200,
                    currentStock: 1000,
                    supplierId: supplierId,
                    code: 'CW-001' // Added required code field
                }
            ];
            return this.prisma.material.createMany({
                data: sampleMaterials
            });
        });
    }
}
exports.MaterialService = MaterialService;
