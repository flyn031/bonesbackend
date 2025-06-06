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
// scripts/createSampleData.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Define the category enum locally since it's missing from client
var MaterialCategory;
(function (MaterialCategory) {
    MaterialCategory["RAW_MATERIAL"] = "RAW_MATERIAL";
    MaterialCategory["FINISHED_GOOD"] = "FINISHED_GOOD";
    MaterialCategory["CONSUMABLE"] = "CONSUMABLE";
    MaterialCategory["EQUIPMENT"] = "EQUIPMENT";
})(MaterialCategory || (MaterialCategory = {}));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // Create some sample suppliers
        const suppliers = yield Promise.all([
            prisma.supplier.create({
                data: {
                    name: 'ABC Suppliers',
                    email: 'contact@abcsuppliers.com',
                    phone: '01234 567890',
                    address: '123 Main Street, London',
                    rating: 4.5,
                    status: client_1.SupplierStatus.ACTIVE
                    // notes: 'Reliable supplier for construction materials', // Removed notes field
                    // totalOrders, completedOrders, averageDeliveryTime removed - these fields don't exist in the schema
                }
            }),
            prisma.supplier.create({
                data: {
                    name: 'XYZ Materials',
                    email: 'sales@xyzmaterials.com',
                    phone: '01234 098765',
                    address: '456 Market Street, Birmingham',
                    rating: 4.2,
                    status: client_1.SupplierStatus.ACTIVE
                    // notes: 'Specialized in raw materials', // Removed notes field
                    // totalOrders, completedOrders, averageDeliveryTime removed - these fields don't exist in the schema
                }
            }),
            prisma.supplier.create({
                data: {
                    name: 'Build Co.',
                    email: 'info@buildco.com',
                    phone: '01234 123456',
                    address: '789 Industry Avenue, Manchester',
                    rating: 3.8,
                    status: client_1.SupplierStatus.ACTIVE
                    // notes: 'Good for equipment and parts', // Removed notes field
                    // totalOrders, completedOrders, averageDeliveryTime removed - these fields don't exist in the schema
                }
            })
        ]);
        // Create some sample materials
        const materials = yield Promise.all([
            prisma.material.create({
                data: {
                    name: 'Lumber',
                    code: 'LMB-001',
                    description: 'High quality construction lumber',
                    category: MaterialCategory.RAW_MATERIAL.toString(), // Convert enum to string
                    unitPrice: 25.50,
                    unit: 'BOARD',
                    minStock: 10, // Changed from minStockLevel
                    currentStock: 35, // Changed from currentStockLevel
                    reorderPoint: 15,
                    leadTimeInDays: 7,
                    manufacturer: 'WoodWorks Inc.',
                    supplierId: suppliers[0].id
                }
            }),
            prisma.material.create({
                data: {
                    name: 'Concrete Mix',
                    code: 'CON-001',
                    description: 'Standard grade concrete mix',
                    category: MaterialCategory.RAW_MATERIAL.toString(), // Convert enum to string
                    unitPrice: 0.85,
                    unit: 'KG',
                    minStock: 100, // Changed from minStockLevel
                    currentStock: 350, // Changed from currentStockLevel
                    reorderPoint: 150,
                    leadTimeInDays: 3,
                    manufacturer: 'Concrete Solutions Ltd',
                    supplierId: suppliers[1].id
                }
            }),
            prisma.material.create({
                data: {
                    name: 'Industrial Paint',
                    code: 'PNT-001',
                    description: 'Weather-resistant exterior paint',
                    category: MaterialCategory.RAW_MATERIAL.toString(), // Convert enum to string
                    unitPrice: 12.99,
                    unit: 'LITER',
                    minStock: 5, // Changed from minStockLevel
                    currentStock: 22, // Changed from currentStockLevel
                    reorderPoint: 10,
                    leadTimeInDays: 5,
                    manufacturer: 'ColorTech Industries',
                    supplierId: suppliers[2].id
                }
            })
        ]);
        console.log('Created suppliers:', suppliers);
        console.log('Created materials:', materials);
    });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
