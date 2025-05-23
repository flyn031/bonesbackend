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
exports.createSampleMaterials = exports.updateStock = exports.deleteMaterial = exports.updateMaterial = exports.getMaterialCategories = exports.getMaterialById = exports.getMaterials = exports.createMaterial = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const createMaterial = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        console.log('Request body:', req.body); // Debug log
        // Map frontend field names to backend schema fields
        const { name, code, description, category, unitPrice, unit, minStockLevel, // Frontend sends this
        currentStockLevel, // Frontend sends this
        reorderPoint, leadTimeInDays, supplierId, customerId, manufacturer, productSpecifications, 
        // Add inventory-specific fields
        inventoryPurpose = 'INTERNAL', isQuotable = false, isOrderable = true, customerMarkupPercent, visibleToCustomers = false } = req.body;
        // Comprehensive validation
        const validationErrors = [];
        if (!name)
            validationErrors.push('Name is required');
        if (!code)
            validationErrors.push('Code is required');
        if (!unitPrice && unitPrice !== 0)
            validationErrors.push('Unit Price is required');
        if (validationErrors.length > 0) {
            res.status(400).json({
                error: 'Validation Failed',
                details: validationErrors
            });
            return; // Important: Exit after sending response
        }
        // Log what we're attempting to create
        console.log('Attempting to create material with data:', {
            name, code, description, category, unitPrice, unit,
            minStockLevel, currentStockLevel, reorderPoint, leadTimeInDays,
            supplierId, customerId, inventoryPurpose, isQuotable, isOrderable
        });
        // Create material with schema field names
        const material = yield prisma.material.create({
            data: {
                name,
                code,
                description,
                category,
                unitPrice: typeof unitPrice === 'string' ? parseFloat(unitPrice) : unitPrice,
                unit,
                // Map frontend field names to schema field names
                minStock: minStockLevel ? (typeof minStockLevel === 'string' ? parseInt(minStockLevel) : minStockLevel) : 0,
                currentStock: currentStockLevel ? (typeof currentStockLevel === 'string' ? parseInt(currentStockLevel) : currentStockLevel) : 0,
                reorderPoint: reorderPoint ? (typeof reorderPoint === 'string' ? parseInt(reorderPoint) : reorderPoint) : null,
                leadTimeInDays: leadTimeInDays ? (typeof leadTimeInDays === 'string' ? parseInt(leadTimeInDays) : leadTimeInDays) : null,
                supplierId: supplierId || null,
                customerId: customerId || null,
                manufacturer: manufacturer || null,
                productSpecifications: productSpecifications
                    ? JSON.stringify(productSpecifications)
                    : null,
                // Add inventory-specific fields
                inventoryPurpose,
                isQuotable,
                isOrderable,
                customerMarkupPercent: customerMarkupPercent ? parseFloat(customerMarkupPercent) : null,
                visibleToCustomers
            },
            include: {
                supplier: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                customer: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        console.log('Material created successfully:', material);
        // Map schema field names back to frontend expected names
        const responseData = Object.assign(Object.assign({}, material), { minStockLevel: material.minStock, currentStockLevel: material.currentStock });
        res.status(201).json(responseData);
    }
    catch (error) { // Explicitly type error as 'any' or 'unknown'
        console.error('Error creating material:', error);
        // Enhanced error handling with specific error types
        if (error.code === 'P2002') {
            res.status(400).json({
                error: 'Material with this code already exists',
                details: ((_a = error.meta) === null || _a === void 0 ? void 0 : _a.target) || 'Duplicate field'
            });
            return; // Important: Exit after sending response
        }
        else if (error.code === 'P2003') {
            res.status(400).json({
                error: 'Invalid foreign key reference',
                details: ((_b = error.meta) === null || _b === void 0 ? void 0 : _b.field_name) || 'Invalid reference'
            });
            return; // Important: Exit after sending response
        }
        res.status(500).json({
            error: 'Failed to create material',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.createMaterial = createMaterial;
const getMaterials = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { category, customerId, page = '1', limit = '20', search = '', minStock, maxPrice, purpose } = req.query;
        // Parse pagination parameters
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;
        // Build where clause for filtering
        const where = {};
        if (category && category !== 'all') {
            where.category = category;
        }
        if (customerId) {
            where.customerId = customerId;
        }
        // Fix the trim() method issue by adding a type guard
        if (search && typeof search === 'string' && search.trim()) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (minStock) {
            where.currentStock = Object.assign(Object.assign({}, where.currentStock), { gte: parseInt(minStock) });
        }
        if (maxPrice) {
            where.unitPrice = Object.assign(Object.assign({}, where.unitPrice), { lte: parseFloat(maxPrice) });
        }
        if (purpose && purpose !== 'ALL') {
            where.inventoryPurpose = purpose;
        }
        // Get total count for pagination
        const total = yield prisma.material.count({ where });
        // Get materials with includes
        const materials = yield prisma.material.findMany({
            where,
            include: {
                supplier: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                customer: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip: offset,
            take: limitNum
        });
        // Calculate pagination info
        const totalPages = Math.ceil(total / limitNum);
        // Map schema field names to frontend expected names
        const mappedMaterials = materials.map(material => (Object.assign(Object.assign({}, material), { minStockLevel: material.minStock, currentStockLevel: material.currentStock })));
        // Return in format expected by frontend
        res.json({
            items: mappedMaterials,
            materials: mappedMaterials, // Alternative key the frontend checks for
            data: mappedMaterials, // Another alternative key
            total,
            totalPages,
            currentPage: pageNum,
            hasMore: pageNum < totalPages
        });
    }
    catch (error) {
        console.error('Error fetching materials:', error);
        res.status(500).json({
            error: 'Failed to fetch materials',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.getMaterials = getMaterials;
const getMaterialById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const material = yield prisma.material.findUnique({
            where: { id },
            include: {
                supplier: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                customer: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                jobMaterials: {
                    include: {
                        job: {
                            select: {
                                id: true,
                                title: true,
                                status: true
                            }
                        }
                    }
                }
            }
        });
        if (!material) {
            res.status(404).json({ error: 'Material not found' });
            return; // Important: Exit after sending response
        }
        // Map schema field names to frontend expected names
        const materialWithMappedFields = Object.assign(Object.assign({}, material), { minStockLevel: material.minStock, currentStockLevel: material.currentStock, supplierName: ((_a = material.supplier) === null || _a === void 0 ? void 0 : _a.name) || null });
        res.json(materialWithMappedFields);
    }
    catch (error) {
        console.error('Error fetching material:', error);
        res.status(500).json({
            error: 'Failed to fetch material',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.getMaterialById = getMaterialById;
const getMaterialCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categories = [
            'RAW_MATERIAL',
            'MACHINE_PART',
            'CONVEYOR_COMPONENT',
            'OFFICE_SUPPLY',
            'KITCHEN_SUPPLY',
            'SAFETY_EQUIPMENT',
            'CLEANING_SUPPLY',
            'ELECTRICAL_COMPONENT',
            'MECHANICAL_COMPONENT',
            'OTHER'
        ];
        res.json(categories);
    }
    catch (error) {
        console.error('Error fetching material categories:', error);
        res.status(500).json({ error: 'Failed to fetch material categories' });
    }
});
exports.getMaterialCategories = getMaterialCategories;
const updateMaterial = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, code, description, category, unitPrice, unit, minStockLevel, // Frontend sends this
        currentStockLevel, // Frontend sends this
        reorderPoint, leadTimeInDays, supplierId, customerId, manufacturer, productSpecifications, inventoryPurpose, isQuotable, isOrderable, customerMarkupPercent, visibleToCustomers } = req.body;
        const updatedMaterial = yield prisma.material.update({
            where: { id },
            data: {
                name,
                code,
                description,
                category,
                unitPrice,
                unit,
                // Map frontend field names to schema field names
                minStock: minStockLevel,
                currentStock: currentStockLevel,
                reorderPoint,
                leadTimeInDays,
                supplierId,
                customerId,
                manufacturer,
                productSpecifications: productSpecifications
                    ? JSON.stringify(productSpecifications)
                    : null,
                inventoryPurpose,
                isQuotable,
                isOrderable,
                customerMarkupPercent,
                visibleToCustomers
            },
            include: {
                supplier: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                customer: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        // Map schema field names back to frontend expected names
        const responseData = Object.assign(Object.assign({}, updatedMaterial), { minStockLevel: updatedMaterial.minStock, currentStockLevel: updatedMaterial.currentStock });
        res.json(responseData);
    }
    catch (error) {
        console.error('Error updating material:', error);
        res.status(500).json({ error: 'Failed to update material' });
    }
});
exports.updateMaterial = updateMaterial;
const deleteMaterial = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.material.delete({
            where: { id }
        });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting material:', error);
        res.status(500).json({ error: 'Failed to delete material' });
    }
});
exports.deleteMaterial = deleteMaterial;
const updateStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { quantity, transactionType } = req.body;
        // Validate transaction type
        if (!['ADD', 'REMOVE'].includes(transactionType)) {
            res.status(400).json({ error: 'Invalid transaction type' });
            return; // Important: Exit after sending response
        }
        const material = yield prisma.material.findUnique({
            where: { id }
        });
        if (!material) {
            res.status(404).json({ error: 'Material not found' });
            return; // Important: Exit after sending response
        }
        // Calculate new stock based on transaction type - using schema field name
        const newStock = transactionType === 'ADD'
            ? material.currentStock + quantity
            : material.currentStock - quantity;
        // Prevent negative stock
        if (newStock < 0) {
            res.status(400).json({ error: 'Insufficient stock' });
            return; // Important: Exit after sending response
        }
        const updatedMaterial = yield prisma.material.update({
            where: { id },
            data: {
                currentStock: newStock // Use schema field name
            }
        });
        // Map schema field names back to frontend expected names
        const responseData = Object.assign(Object.assign({}, updatedMaterial), { minStockLevel: updatedMaterial.minStock, currentStockLevel: updatedMaterial.currentStock });
        res.json(responseData);
    }
    catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({ error: 'Failed to update stock' });
    }
});
exports.updateStock = updateStock;
const createSampleMaterials = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { supplierId } = req.params;
        const sampleMaterials = [
            {
                name: 'Steel Pipe',
                code: 'STEEL-PIPE-001',
                description: 'Industrial grade steel pipe',
                category: 'RAW_MATERIAL',
                unitPrice: 50.00,
                unit: 'meter',
                minStock: 100, // Use schema field name
                currentStock: 500, // Use schema field name
                reorderPoint: 200,
                leadTimeInDays: 14,
                manufacturer: 'Steel Co Ltd',
                inventoryPurpose: 'INTERNAL',
                isQuotable: false,
                isOrderable: true,
                visibleToCustomers: false
            },
            {
                name: 'Aluminum Sheet',
                code: 'ALU-SHEET-001',
                description: 'Thin aluminum sheet',
                category: 'RAW_MATERIAL',
                unitPrice: 75.50,
                unit: 'square meter',
                minStock: 50, // Use schema field name
                currentStock: 250, // Use schema field name
                reorderPoint: 100,
                leadTimeInDays: 10,
                manufacturer: 'Aluminum Industries',
                inventoryPurpose: 'DUAL',
                isQuotable: true,
                isOrderable: true,
                visibleToCustomers: true
            }
        ];
        const createdMaterials = yield Promise.all(sampleMaterials.map(material => prisma.material.create({
            data: Object.assign(Object.assign({}, material), { supplier: { connect: { id: supplierId } } })
        })));
        // Map schema field names to frontend expected names
        const mappedMaterials = createdMaterials.map(material => (Object.assign(Object.assign({}, material), { minStockLevel: material.minStock, currentStockLevel: material.currentStock })));
        res.status(201).json(mappedMaterials);
    }
    catch (error) {
        console.error('Error creating sample materials:', error);
        res.status(500).json({ error: 'Failed to create sample materials' });
    }
});
exports.createSampleMaterials = createSampleMaterials;
