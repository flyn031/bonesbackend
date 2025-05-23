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
exports.getOrderableItems = exports.getQuotableItems = exports.getMaterialsByPurpose = exports.getInventoryAlerts = exports.getInventoryStats = exports.getLowStockItems = exports.deleteInventoryItem = exports.updateInventoryItem = exports.getInventoryItemById = exports.getInventoryItems = exports.createInventoryItem = exports.updateInventoryPurposeDirectly = void 0;
const client_1 = require("@prisma/client"); // Removed MaterialCategory which doesn't exist
const prisma = new client_1.PrismaClient();
// Add this new emergency function for direct purpose updates
const updateInventoryPurposeDirectly = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { inventoryPurpose } = req.body;
        console.log('🔧 EMERGENCY DIRECT UPDATE ENDPOINT CALLED');
        console.log('Material ID:', id);
        console.log('Requested purpose:', inventoryPurpose);
        if (!id) {
            res.status(400).json({ error: 'Material ID is required' });
            return; // Exit after sending response
        }
        // Assuming InventoryPurpose is an enum in your schema, validate against it
        // If inventoryPurpose is not defined in your schema for Material model, this check needs adjustment
        // For now, assuming it might be a string field with these specific allowed values
        const validPurposes = ['INTERNAL', 'CUSTOMER', 'DUAL']; // Define valid values
        if (!inventoryPurpose || !validPurposes.includes(inventoryPurpose)) {
            res.status(400).json({
                error: 'Valid inventoryPurpose is required',
                received: inventoryPurpose,
                valid_values: validPurposes
            });
            return; // Exit after sending response
        }
        const currentMaterial = yield prisma.material.findUnique({
            where: { id }
        });
        if (!currentMaterial) {
            res.status(404).json({ error: 'Material not found' });
            return; // Exit after sending response
        }
        console.log('Current purpose:', currentMaterial.inventoryPurpose);
        const updatedMaterial = yield prisma.material.update({
            where: { id },
            data: {
                inventoryPurpose: inventoryPurpose // Cast if not a strict enum type in schema
            }
        });
        console.log('New purpose after update:', updatedMaterial.inventoryPurpose);
        if (updatedMaterial.inventoryPurpose !== inventoryPurpose) {
            console.error('⚠️ UPDATE FAILED - Values don\'t match!');
            res.status(500).json({
                error: 'Update failed',
                requested: inventoryPurpose,
                current: updatedMaterial.inventoryPurpose
            });
            return; // Exit after sending response
        }
        res.json({
            success: true,
            id,
            previous: currentMaterial.inventoryPurpose,
            current: updatedMaterial.inventoryPurpose
        });
    }
    catch (error) { // Explicitly type error as 'any'
        console.error('Error in direct update:', error);
        res.status(500).json({
            error: 'Failed to update inventory purpose directly',
            details: error.message,
            stack: error.stack
        });
    }
});
exports.updateInventoryPurposeDirectly = updateInventoryPurposeDirectly;
const createInventoryItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Received create item request with data:', JSON.stringify(req.body, null, 2));
        const { name, code, 
        // category, // Assuming 'category' is not a direct field on Material based on the last schema
        description, currentStock, // CORRECTED
        minStock, // CORRECTED
        unit, unitPrice, reorderPoint, leadTimeInDays, inventoryPurpose, // Ensure this is part of your Material schema, or remove
        isQuotable, // Ensure this is part of your Material schema, or remove
        isOrderable, // Ensure this is part of your Material schema, or remove
        customerMarkupPercent, // Ensure this is part of your Material schema, or remove
        visibleToCustomers, // Ensure this is part of your Material schema, or remove
        supplierId // CORRECTED from preferredSupplierId if schema has supplierId
         } = req.body;
        // Validate that supplierId is provided if it's mandatory in your schema
        if (!supplierId) {
            res.status(400).json({ error: 'supplierId is required to create a material.' });
            return; // Exit after sending response
        }
        console.log('Extracted data for creation:', {
            name, code, description, currentStock, minStock, unit, unitPrice,
            reorderPoint, leadTimeInDays, inventoryPurpose, isQuotable, isOrderable,
            customerMarkupPercent, visibleToCustomers, supplierId
        });
        const item = yield prisma.material.create({
            data: {
                name,
                code,
                // category, // Remove if 'category' is not a field
                description,
                currentStock: Number(currentStock), // CORRECTED
                minStock: Number(minStock), // CORRECTED
                unit,
                unitPrice: Number(unitPrice),
                reorderPoint: reorderPoint ? Number(reorderPoint) : null, // Handle optional
                leadTimeInDays: leadTimeInDays ? Number(leadTimeInDays) : null, // Handle optional
                inventoryPurpose: inventoryPurpose || 'INTERNAL', // Default if schema allows
                isQuotable: isQuotable || false,
                isOrderable: isOrderable !== undefined ? isOrderable : true,
                customerMarkupPercent: customerMarkupPercent ? Number(customerMarkupPercent) : null,
                visibleToCustomers: visibleToCustomers || false,
                supplierId // Use the supplierId from request body
            }
        });
        console.log('Successfully created item:', item);
        res.status(201).json(item);
    }
    catch (error) {
        console.error('Detailed error:', error);
        res.status(500).json({
            error: 'Failed to create inventory item',
            details: error.message,
            stack: error.stack,
            code: error.code // If it's a Prisma error, it might have a code
        });
    }
});
exports.createInventoryItem = createInventoryItem;
const getInventoryItems = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { purpose } = req.query;
        const whereClause = {};
        if (purpose && purpose !== 'ALL' && typeof purpose === 'string') {
            // Assuming inventoryPurpose is a field in your Material model
            // If it's an enum, ensure 'purpose as string' matches an enum value
            whereClause.inventoryPurpose = purpose;
        }
        const items = yield prisma.material.findMany({
            where: whereClause,
            include: {
                supplier: true
            }
        });
        res.json(items);
    }
    catch (error) {
        console.error('Error fetching inventory items:', error);
        res.status(500).json({ error: 'Failed to fetch inventory items', details: error.message });
    }
});
exports.getInventoryItems = getInventoryItems;
const getInventoryItemById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const item = yield prisma.material.findUnique({
            where: { id },
            include: {
                supplier: true
            }
        });
        if (!item) {
            res.status(404).json({ error: 'Item not found' });
            return; // Exit after sending response
        }
        res.json(item);
    }
    catch (error) {
        console.error('Error fetching inventory item:', error);
        res.status(500).json({ error: 'Failed to fetch inventory item', details: error.message });
    }
});
exports.getInventoryItemById = getInventoryItemById;
const updateInventoryItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updateData = req.body;
        console.log('=== INVENTORY ITEM UPDATE ===');
        console.log('Item ID:', id);
        console.log('Update payload:', JSON.stringify(updateData, null, 2));
        // If 'currentStockLevel' or 'minStockLevel' are in updateData, rename them
        if (updateData.hasOwnProperty('currentStockLevel')) {
            updateData.currentStock = updateData.currentStockLevel;
            delete updateData.currentStockLevel;
        }
        if (updateData.hasOwnProperty('minStockLevel')) {
            updateData.minStock = updateData.minStockLevel;
            delete updateData.minStockLevel;
        }
        // Convert to numbers if they exist after potential rename
        if (updateData.hasOwnProperty('currentStock') && updateData.currentStock !== null) {
            updateData.currentStock = Number(updateData.currentStock);
        }
        if (updateData.hasOwnProperty('minStock') && updateData.minStock !== null) {
            updateData.minStock = Number(updateData.minStock);
        }
        if (updateData.hasOwnProperty('unitPrice') && updateData.unitPrice !== null) {
            updateData.unitPrice = Number(updateData.unitPrice);
        }
        if (updateData.hasOwnProperty('reorderPoint') && updateData.reorderPoint !== null) {
            updateData.reorderPoint = Number(updateData.reorderPoint);
        }
        if (updateData.hasOwnProperty('leadTimeInDays') && updateData.leadTimeInDays !== null) {
            updateData.leadTimeInDays = Number(updateData.leadTimeInDays);
        }
        if (updateData.hasOwnProperty('customerMarkupPercent') && updateData.customerMarkupPercent !== null) {
            updateData.customerMarkupPercent = Number(updateData.customerMarkupPercent);
        }
        if (updateData.inventoryPurpose) {
            console.log('inventoryPurpose detected in update:', updateData.inventoryPurpose);
            const validPurposes = ['INTERNAL', 'CUSTOMER', 'DUAL'];
            if (!validPurposes.includes(updateData.inventoryPurpose)) {
                console.error('Invalid inventoryPurpose value:', updateData.inventoryPurpose);
                res.status(400).json({
                    error: 'Invalid inventory purpose value',
                    validValues: validPurposes
                });
                return; // Exit after sending response
            }
        }
        else {
            console.log('No inventoryPurpose in update data');
        }
        const currentItem = yield prisma.material.findUnique({
            where: { id }
        });
        if (!currentItem) {
            console.error('Item not found:', id);
            res.status(404).json({ error: 'Item not found' });
            return; // Exit after sending response
        }
        console.log('Current item before update:', JSON.stringify({
            id: currentItem.id,
            name: currentItem.name,
            inventoryPurpose: currentItem.inventoryPurpose
        }, null, 2));
        const item = yield prisma.material.update({
            where: { id },
            data: updateData // Prisma will ignore fields not in schema
        });
        console.log('Updated item result:', JSON.stringify({
            id: item.id,
            name: item.name,
            inventoryPurpose: item.inventoryPurpose
        }, null, 2));
        if (updateData.inventoryPurpose && currentItem.inventoryPurpose !== item.inventoryPurpose) {
            console.log(`✅ inventoryPurpose changed: ${currentItem.inventoryPurpose} → ${item.inventoryPurpose}`);
        }
        else if (updateData.inventoryPurpose && currentItem.inventoryPurpose === item.inventoryPurpose) {
            console.log(`⚠️ inventoryPurpose unchanged despite update request: ${item.inventoryPurpose}`);
        }
        res.json(item);
    }
    catch (error) { // Explicitly type error as 'any'
        const prismaError = error; // Cast to any to access potential code
        console.error('Error updating inventory item:', prismaError);
        if (prismaError.code === 'P2025') {
            res.status(404).json({ error: 'Item not found' });
        }
        else if (prismaError.code === 'P2002') {
            res.status(400).json({ error: 'Unique constraint violation. Check if code is already in use.' });
        }
        else {
            res.status(500).json({
                error: 'Failed to update inventory item',
                details: prismaError.message,
                code: prismaError.code
            });
        }
    }
});
exports.updateInventoryItem = updateInventoryItem;
const deleteInventoryItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.material.delete({
            where: { id }
        });
        res.json({ message: 'Item deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting inventory item:', error);
        res.status(500).json({ error: 'Failed to delete inventory item', details: error.message });
    }
});
exports.deleteInventoryItem = deleteInventoryItem;
// To find items where currentStock <= minStock, we query all and filter in JS
// as Prisma does not directly support comparing two fields in a where clause like that.
// For more complex scenarios, prisma.$queryRaw could be used.
const getLowStockItems = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allItems = yield prisma.material.findMany({
            include: {
                supplier: true
            }
        });
        const lowStockItems = allItems.filter(item => item.currentStock !== null && item.minStock !== null && item.currentStock <= item.minStock);
        res.json(lowStockItems);
    }
    catch (error) {
        console.error('Error fetching low stock items:', error);
        res.status(500).json({ error: 'Failed to fetch low stock items', details: error.message });
    }
});
exports.getLowStockItems = getLowStockItems;
const getInventoryStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const totalItems = yield prisma.material.count();
        // For lowStockItems, fetch all and filter as above
        const allItemsForStats = yield prisma.material.findMany({
            select: { currentStock: true, minStock: true } // Select only necessary fields
        });
        const lowStockItemsCount = allItemsForStats.filter(item => item.currentStock !== null && item.minStock !== null && item.currentStock <= item.minStock).length;
        // For totalValue, sum of (currentStock * unitPrice)
        const materialsWithStockAndPrice = yield prisma.material.findMany({
            select: { currentStock: true, unitPrice: true }
        });
        const totalInventoryValue = materialsWithStockAndPrice.reduce((sum, item) => {
            return sum + ((item.currentStock || 0) * (item.unitPrice || 0));
        }, 0);
        res.json({
            totalItems,
            lowStockItems: lowStockItemsCount, // Use the count from JS filter
            totalValue: totalInventoryValue
        });
    }
    catch (error) {
        console.error('Error fetching inventory stats:', error);
        res.status(500).json({ error: 'Failed to fetch inventory stats', details: error.message });
    }
});
exports.getInventoryStats = getInventoryStats;
const getInventoryAlerts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Fetching inventory alerts...");
        const allMaterials = yield prisma.material.findMany({
            include: {
                supplier: true
            }
        });
        const lowStockItems = allMaterials.filter(item => item.currentStock !== null && item.minStock !== null && item.currentStock <= item.minStock && item.currentStock > 0);
        console.log(`Found ${lowStockItems.length} items with low stock (but not zero)`);
        const outOfStockItems = allMaterials.filter(item => item.currentStock === 0);
        console.log(`Found ${outOfStockItems.length} items out of stock`);
        const reorderItems = allMaterials.filter(item => item.reorderPoint !== null &&
            item.currentStock !== null &&
            item.minStock !== null &&
            item.currentStock <= item.reorderPoint &&
            item.currentStock > item.minStock // Only items not yet at critical low stock
        );
        console.log(`Found ${reorderItems.length} items at reorder point`);
        const alerts = [
            ...outOfStockItems.map(item => (Object.assign(Object.assign({}, item), { alertType: 'CRITICAL', alertMessage: 'Out of stock', severity: 3, daysToRestock: item.leadTimeInDays }))),
            ...lowStockItems.map(item => (Object.assign(Object.assign({}, item), { alertType: 'LOW_STOCK', alertMessage: `Below minimum level (${item.minStock})`, severity: 2, daysToRestock: item.leadTimeInDays }))),
            ...reorderItems.map(item => (Object.assign(Object.assign({}, item), { alertType: 'REORDER', alertMessage: `Below reorder point (${item.reorderPoint})`, severity: 1, daysToRestock: item.leadTimeInDays })))
        ];
        alerts.sort((a, b) => b.severity - a.severity);
        const alertsByCategory = {
            critical: alerts.filter(alert => alert.alertType === 'CRITICAL'),
            lowStock: alerts.filter(alert => alert.alertType === 'LOW_STOCK'),
            reorder: alerts.filter(alert => alert.alertType === 'REORDER')
        };
        // Assuming Material model has a 'category' field of type String?
        // If not, this part needs to be adjusted or removed.
        // Based on your createInventoryItem, it seems you might be passing 'category' but it might not be in schema.
        // For now, I will assume 'category' might exist or this part can be adapted.
        const categoryCounts = {};
        alerts.forEach(alert => {
            const category = alert.category || 'UNCATEGORIZED'; // Handle if category is missing
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });
        const summary = {
            totalAlerts: alerts.length,
            criticalCount: alertsByCategory.critical.length,
            lowStockCount: alertsByCategory.lowStock.length,
            reorderCount: alertsByCategory.reorder.length,
            categoryCounts // Use dynamically built category counts
        };
        console.log(`Returning ${alerts.length} total inventory alerts`);
        res.json({
            alerts,
            alertsByCategory,
            summary
        });
    }
    catch (error) {
        console.error('Error fetching inventory alerts:', error);
        res.status(500).json({ error: 'Failed to fetch inventory alerts', details: error.message });
    }
});
exports.getInventoryAlerts = getInventoryAlerts;
const getMaterialsByPurpose = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { purpose } = req.query;
        if (!purpose || !['INTERNAL', 'CUSTOMER', 'DUAL', 'ALL'].includes(purpose)) {
            res.status(400).json({ error: 'Invalid inventory purpose' });
            return; // Exit after sending response
        }
        if (purpose === 'ALL') {
            // Call getInventoryItems which fetches all if no purpose is specified in its logic
            // or adjust getInventoryItems to truly fetch all when purpose is 'ALL'
            const allItems = yield prisma.material.findMany({ include: { supplier: true } });
            res.json(allItems); // Keep this return as it's an early exit and sends response
            return;
        }
        const whereClause = {};
        if (typeof purpose === 'string' && purpose !== 'ALL') {
            // Assuming inventoryPurpose is a field in your Material model
            whereClause.inventoryPurpose = purpose;
        }
        const items = yield prisma.material.findMany({
            where: whereClause,
            include: {
                supplier: true
            }
        });
        res.json(items);
    }
    catch (error) {
        console.error('Error fetching materials by purpose:', error);
        res.status(500).json({ error: 'Failed to fetch materials by purpose', details: error.message });
    }
});
exports.getMaterialsByPurpose = getMaterialsByPurpose;
// Assuming Material model has `isQuotable` (Boolean) and `inventoryPurpose` (String/Enum)
// And a relation `priceHistory` - if this relation doesn't exist, this function needs adjustment
const getQuotableItems = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield prisma.material.findMany({
            where: {
                isQuotable: true, // Assuming this field exists
                OR: [
                    { inventoryPurpose: 'CUSTOMER' }, // Assuming this field exists
                    { inventoryPurpose: 'DUAL' }
                ]
            },
            // include: { // Remove if priceHistory relation doesn't exist on Material
            //     priceHistory: {
            //         orderBy: { effectiveFrom: 'desc' },
            //         take: 1
            //     }
            // }
        });
        res.json(items);
    }
    catch (error) {
        console.error('Error fetching quotable items:', error);
        res.status(500).json({ error: 'Failed to fetch quotable items', details: error.message });
    }
});
exports.getQuotableItems = getQuotableItems;
// Assuming Material model has `isOrderable` (Boolean) and `inventoryPurpose` (String/Enum)
const getOrderableItems = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield prisma.material.findMany({
            where: {
                isOrderable: true, // Assuming this field exists
                OR: [
                    { inventoryPurpose: 'INTERNAL' }, // Assuming this field exists
                    { inventoryPurpose: 'DUAL' }
                ]
            },
            include: {
                supplier: true
            }
        });
        res.json(items);
    }
    catch (error) {
        console.error('Error fetching orderable items:', error);
        res.status(500).json({ error: 'Failed to fetch orderable items', details: error.message });
    }
});
exports.getOrderableItems = getOrderableItems;
