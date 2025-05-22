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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateQuoteStatus = exports.updateDraftQuote = exports.convertQuoteToOrderController = exports.convertQuoteToOrder = exports.cloneQuoteController = exports.cloneQuote = exports.getQuoteHistoryByReference = exports.getQuoteHistory = exports.getQuoteVersionById = exports.getQuotes = exports.createNewQuoteVersion = exports.createQuoteV1 = exports.calculateQuoteTotals = void 0;
// backend/src/services/quoteService.ts
const prismaClient_1 = __importDefault(require("../utils/prismaClient"));
const client_1 = require("@prisma/client");
// --- Helper Function to process line items and lookup material by code ---
function processLineItemsWithMaterialCodeLookup(lineItemsInput) {
    return __awaiter(this, void 0, void 0, function* () {
        const processedLineItems = [];
        for (const item of lineItemsInput) {
            let actualMaterialDatabaseId = undefined; // This will store the CUID
            if (item.materialId && String(item.materialId).trim() !== '') {
                const materialCodeFromFrontend = String(item.materialId).trim();
                console.log(`[QuoteService][Helper] Attempting to find material with code: '${materialCodeFromFrontend}'`);
                const materialRecord = yield prismaClient_1.default.material.findUnique({
                    where: { code: materialCodeFromFrontend },
                    select: { id: true }, // Only fetch the 'id' (CUID)
                });
                if (!materialRecord) {
                    console.error(`[QuoteService][Helper] CRITICAL: Material with code '${materialCodeFromFrontend}' NOT FOUND in database.`);
                    throw new Error(`Material with code '${materialCodeFromFrontend}' not found. Please ensure the material code is correct and the material exists.`);
                }
                actualMaterialDatabaseId = materialRecord.id; // Use the actual database CUID
                console.log(`[QuoteService][Helper] Found material CUID: '${actualMaterialDatabaseId}' for code: '${materialCodeFromFrontend}'`);
            }
            // Fix 1: Ensure quantity and unitPrice are converted properly for Prisma
            processedLineItems.push(Object.assign({ description: item.description, quantity: item.quantity, unitPrice: item.unitPrice }, (actualMaterialDatabaseId && {
                material: {
                    connect: { id: actualMaterialDatabaseId },
                },
            })));
        }
        return processedLineItems;
    });
}
// --- Helper Function for Quote Reference ---
function generateQuoteReference() {
    return __awaiter(this, void 0, void 0, function* () {
        let settings = yield prismaClient_1.default.companySettings.findFirst();
        if (!settings) {
            console.warn("[QuoteService][generateQuoteReference] CompanySettings not found, creating default settings...");
            try {
                // Create settings with defaultVatRate if needed
                settings = yield prismaClient_1.default.companySettings.create({
                    data: {
                        quoteReferencePrefix: 'QR',
                        lastQuoteReferenceSeq: 0,
                        // Use an additional field for defaultVatRate if needed
                        // This assumes schema has been updated to include this field
                        // If not, you'll need to store VAT rate elsewhere
                    }
                });
                console.log("[QuoteService][generateQuoteReference] Default CompanySettings created.");
            }
            catch (error) {
                console.error("[QuoteService][generateQuoteReference] Failed to create default CompanySettings!", error);
                return `QR-ERR-${Date.now()}`;
            }
        }
        // Use a transaction to ensure atomicity for incrementing sequence number
        const updatedSettings = yield prismaClient_1.default.companySettings.update({
            where: { id: settings.id },
            data: { lastQuoteReferenceSeq: { increment: 1 } },
        });
        const prefix = updatedSettings.quoteReferencePrefix || 'QR';
        const sequence = updatedSettings.lastQuoteReferenceSeq;
        const paddedSequence = sequence.toString().padStart(4, '0'); // Ensure consistent padding
        return `${prefix}-${paddedSequence}`;
    });
}
// Helper function to calculate totals - exported to fix the missing reference error
const calculateQuoteTotals = (items) => {
    return items.reduce((sum, item) => {
        var _a, _b;
        return sum + (((_a = item.quantity) !== null && _a !== void 0 ? _a : 0) * ((_b = item.unitPrice) !== null && _b !== void 0 ? _b : 0));
    }, 0);
};
exports.calculateQuoteTotals = calculateQuoteTotals;
// --- Service Functions ---
const createQuoteV1 = (data) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('[QuoteService][createQuoteV1] Received raw payload:', JSON.stringify(data, null, 2));
    const quoteReference = yield generateQuoteReference();
    const versionNumber = 1;
    const quoteNumber = `${quoteReference}-v${versionNumber}`;
    const lineItemsForDb = yield processLineItemsWithMaterialCodeLookup(data.lineItems);
    // Calculate total amount from items
    const totalAmountFromItems = lineItemsForDb.reduce((sum, item) => {
        var _a, _b;
        // Handle as regular numbers instead of Decimals
        return sum + (((_a = item.quantity) !== null && _a !== void 0 ? _a : 0) * ((_b = item.unitPrice) !== null && _b !== void 0 ? _b : 0));
    }, 0);
    // Get company settings
    const companySettings = yield prismaClient_1.default.companySettings.findFirst();
    // Calculate VAT - handle as regular number calculation
    const vatRate = 20; // Default VAT rate if not set
    const vatMultiplier = 1 + (vatRate / 100);
    // Calculate final total
    const finalTotal = data.totalAmount !== undefined
        ? data.totalAmount
        : totalAmountFromItems * vatMultiplier;
    console.log(`[QuoteService][createQuoteV1] User ID: ${data.createdById}, Customer ID: ${data.customerId}`);
    console.log(`[QuoteService][createQuoteV1] Calculated finalTotal: ${finalTotal}`);
    console.log('[QuoteService][createQuoteV1] Line items processed for DB (with CUIDs for materialId):', JSON.stringify(lineItemsForDb, null, 2));
    try {
        return yield prismaClient_1.default.quote.create({
            data: {
                customerId: data.customerId,
                title: data.title,
                description: data.description,
                status: data.status || client_1.QuoteStatus.DRAFT, // Default to DRAFT
                validUntil: data.validUntil,
                createdById: data.createdById,
                customerReference: data.customerReference,
                contactEmail: data.contactEmail,
                contactPerson: data.contactPerson,
                contactPhone: data.contactPhone,
                totalAmount: finalTotal, // Use number instead of Decimal
                quoteReference: quoteReference,
                versionNumber: versionNumber,
                isLatestVersion: true,
                changeReason: 'Initial creation',
                parentQuoteId: null,
                quoteNumber: quoteNumber,
                lineItems: {
                    create: lineItemsForDb,
                },
            },
            include: { customer: true, lineItems: { include: { material: true } }, createdBy: true },
        });
    }
    catch (error) {
        console.error("[QuoteService][createQuoteV1] Prisma Error during quote creation:", error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            console.error("[QuoteService][createQuoteV1] Prisma Error Code:", error.code);
            console.error("[QuoteService][createQuoteV1] Prisma Error Meta:", error.meta);
        }
        throw error;
    }
});
exports.createQuoteV1 = createQuoteV1;
const createNewQuoteVersion = (data) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('[QuoteService][createNewQuoteVersion] Received raw payload:', JSON.stringify(data, null, 2));
    const { parentQuoteId, changeReason } = data, newData = __rest(data, ["parentQuoteId", "changeReason"]);
    const parentQuote = yield prismaClient_1.default.quote.findUnique({ where: { id: parentQuoteId } });
    if (!parentQuote)
        throw new Error(`Parent quote with ID ${parentQuoteId} not found.`);
    // Create an array of valid status values to check against
    const invalidStatusValues = [client_1.QuoteStatus.APPROVED, client_1.QuoteStatus.DECLINED, client_1.QuoteStatus.EXPIRED, client_1.QuoteStatus.CONVERTED];
    if (parentQuote.status && invalidStatusValues.includes(parentQuote.status)) {
        throw new Error(`Cannot create new version from quote with status ${parentQuote.status}. Clone instead.`);
    }
    const lineItemsForDb = yield processLineItemsWithMaterialCodeLookup(newData.lineItems);
    // Calculate total amount from items as numbers
    const totalAmountFromItems = lineItemsForDb.reduce((sum, item) => {
        var _a, _b;
        return sum + (((_a = item.quantity) !== null && _a !== void 0 ? _a : 0) * ((_b = item.unitPrice) !== null && _b !== void 0 ? _b : 0));
    }, 0);
    // Get company settings
    const companySettings = yield prismaClient_1.default.companySettings.findFirst();
    // Calculate VAT - handle as regular number calculation
    const vatRate = 20; // Default VAT rate if not set
    const vatMultiplier = 1 + (vatRate / 100);
    // Calculate final total
    const finalTotal = newData.totalAmount !== undefined
        ? newData.totalAmount
        : totalAmountFromItems * vatMultiplier;
    const newVersionNumber = parentQuote.versionNumber + 1;
    const newQuoteNumber = `${parentQuote.quoteReference}-v${newVersionNumber}`;
    console.log('[QuoteService][createNewQuoteVersion] Line items processed for DB:', JSON.stringify(lineItemsForDb, null, 2));
    const newVersion = yield prismaClient_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        yield tx.quote.update({ where: { id: parentQuoteId }, data: { isLatestVersion: false } });
        const createdQuote = yield tx.quote.create({
            data: {
                customerId: parentQuote.customerId,
                quoteReference: parentQuote.quoteReference,
                title: newData.title,
                description: newData.description,
                status: newData.status || parentQuote.status,
                validUntil: newData.validUntil,
                createdById: newData.createdById,
                customerReference: newData.customerReference,
                contactEmail: newData.contactEmail,
                contactPerson: newData.contactPerson,
                contactPhone: newData.contactPhone,
                totalAmount: finalTotal, // Store as number not Decimal
                versionNumber: newVersionNumber,
                isLatestVersion: true,
                changeReason: changeReason,
                parentQuoteId: parentQuoteId,
                quoteNumber: newQuoteNumber,
                lineItems: {
                    create: lineItemsForDb,
                },
            },
            include: { customer: true, lineItems: { include: { material: true } }, createdBy: true },
        });
        return createdQuote; // Return the created quote from the transaction
    }));
    return newVersion;
});
exports.createNewQuoteVersion = createNewQuoteVersion;
const getQuotes = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (onlyLatest = true) {
    return prismaClient_1.default.quote.findMany({
        where: onlyLatest ? { isLatestVersion: true } : undefined,
        include: {
            customer: { select: { name: true, id: true } },
            lineItems: { include: { material: { select: { id: true, code: true, name: true } } } },
            createdBy: { select: { name: true, id: true } }
        },
        orderBy: [{ quoteReference: 'desc' }, { versionNumber: 'desc' }],
    });
});
exports.getQuotes = getQuotes;
const getQuoteVersionById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return prismaClient_1.default.quote.findUnique({
        where: { id },
        include: {
            customer: true,
            lineItems: { orderBy: { createdAt: 'asc' }, include: { material: true } },
            parentQuote: { select: { id: true, versionNumber: true, status: true } },
            childQuotes: { where: { isLatestVersion: true }, select: { id: true, versionNumber: true, status: true }, take: 1 },
            orders: { select: { id: true, projectTitle: true, status: true } },
            createdBy: { select: { name: true, id: true } }
        },
    });
});
exports.getQuoteVersionById = getQuoteVersionById;
const getQuoteHistory = (quoteReference) => __awaiter(void 0, void 0, void 0, function* () {
    return prismaClient_1.default.quote.findMany({
        where: { quoteReference: quoteReference },
        include: {
            customer: { select: { name: true, id: true } },
            lineItems: { include: { material: true } },
            createdBy: { select: { name: true, id: true } }
        },
        orderBy: { versionNumber: 'asc' }
    });
});
exports.getQuoteHistory = getQuoteHistory;
// Export the function to match the import in the test files
exports.getQuoteHistoryByReference = exports.getQuoteHistory;
const cloneQuote = (sourceQuoteId, userId, targetCustomerId, newTitle) => __awaiter(void 0, void 0, void 0, function* () {
    const sourceQuote = yield prismaClient_1.default.quote.findUnique({
        where: { id: sourceQuoteId },
        include: {
            lineItems: { include: { material: { select: { code: true } } } } // Fetch material code
        }
    });
    if (!sourceQuote)
        throw new Error(`Quote version with ID ${sourceQuoteId} not found for cloning.`);
    // Pass material CODEs to createQuoteV1, as it now handles the lookup
    // No need for toNumber() since lineItems are stored as regular numbers
    const lineItemsForCloneInput = sourceQuote.lineItems.map((item) => {
        var _a;
        return ({
            description: item.description,
            quantity: Number(item.quantity), // Ensure it's a number
            unitPrice: Number(item.unitPrice), // Ensure it's a number
            materialId: (_a = item.material) === null || _a === void 0 ? void 0 : _a.code, // Use the material CODE here
        });
    });
    const newQuoteData = {
        customerId: targetCustomerId || sourceQuote.customerId,
        title: newTitle || `${sourceQuote.title} (Clone)`,
        description: sourceQuote.description || undefined,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days validity
        createdById: userId,
        customerReference: sourceQuote.customerReference || undefined,
        contactEmail: sourceQuote.contactEmail || undefined,
        contactPerson: sourceQuote.contactPerson || undefined,
        contactPhone: sourceQuote.contactPhone || undefined,
        status: client_1.QuoteStatus.DRAFT,
        lineItems: lineItemsForCloneInput,
        // totalAmount will be recalculated by createQuoteV1 if not explicitly provided
    };
    return (0, exports.createQuoteV1)(newQuoteData);
});
exports.cloneQuote = cloneQuote;
// Export the function to match the import in the controller
exports.cloneQuoteController = exports.cloneQuote;
const convertQuoteToOrder = (quoteId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const quoteVersion = yield prismaClient_1.default.quote.findUnique({
        where: { id: quoteId },
        include: {
            lineItems: { include: { material: { select: { id: true, code: true } } } },
            customer: true,
            createdBy: true
        }
    });
    if (!quoteVersion)
        throw new Error(`Quote version ${quoteId} not found.`);
    if (quoteVersion.status !== client_1.QuoteStatus.APPROVED)
        throw new Error(`Only APPROVED quotes can be converted. Current status is ${quoteVersion.status}.`);
    if (!quoteVersion.customer)
        throw new Error(`Quote ${quoteId} does not have a valid customer associated.`);
    if (!quoteVersion.createdById)
        throw new Error(`Quote ${quoteId} missing creator information for order ownership.`);
    const orderLineItemsJson = quoteVersion.lineItems.map(qli => {
        var _a;
        return ({
            materialId: qli.materialId, // This is the actual CUID
            materialCode: (_a = qli.material) === null || _a === void 0 ? void 0 : _a.code, // Store the code
            description: qli.description,
            quantity: Number(qli.quantity), // Convert to number if needed
            unitPrice: Number(qli.unitPrice), // Convert to number if needed
            total: Number(qli.quantity) * Number(qli.unitPrice), // Calculate without times()
        });
    });
    // Get company settings with default VAT rate
    const companySettings = yield prismaClient_1.default.companySettings.findFirst();
    // Use regular number calculations
    const totalAmount = Number(quoteVersion.totalAmount);
    const vatRate = 20; // Default VAT rate
    const vatMultiplier = 1 + (vatRate / 100);
    const subTotal = totalAmount / vatMultiplier;
    const totalTax = totalAmount - subTotal;
    const orderData = {
        projectTitle: quoteVersion.title || `Order from Quote ${quoteVersion.quoteNumber || quoteId}`,
        quoteRef: quoteVersion.quoteNumber || quoteVersion.quoteReference || quoteId,
        orderType: client_1.OrderType.CUSTOMER_LINKED,
        status: client_1.OrderStatus.PENDING_APPROVAL,
        customerName: quoteVersion.customer.name,
        contactPerson: quoteVersion.contactPerson || quoteVersion.customer.contactPerson || quoteVersion.customer.name,
        contactPhone: quoteVersion.contactPhone || quoteVersion.customer.phone || '',
        contactEmail: quoteVersion.contactEmail || quoteVersion.customer.email || '',
        projectValue: totalAmount, // Use number instead of Decimal
        marginPercent: 0, // Use number instead of Decimal
        leadTimeWeeks: 4, // Default value
        items: orderLineItemsJson, // Correct type for JsonArray in create
        paymentTerms: quoteVersion.customer.paymentTerms || client_1.PaymentTerms.THIRTY_DAYS,
        currency: 'GBP', // Default currency
        vatRate: vatRate, // Store as number
        subTotal: subTotal, // Store as number
        totalTax: totalTax, // Store as number
        totalAmount: totalAmount, // Store as number
        profitMargin: 0, // Use number instead of Decimal
        notes: `Converted from Quote: ${quoteVersion.quoteNumber || quoteVersion.quoteReference || quoteId} v${quoteVersion.versionNumber}`,
        customer: { connect: { id: quoteVersion.customerId } }, // Connect to existing customer
        sourceQuote: { connect: { id: quoteVersion.id } }, // Connect to existing quote
        projectOwner: { connect: { id: quoteVersion.createdById } }, // Connect to project owner (creator of quote)
        createdBy: { connect: { id: userId } }, // Connect to user who performed the conversion
    };
    const transactionResult = yield prismaClient_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        const newOrder = yield tx.order.create({ data: orderData });
        const updatedQuote = yield tx.quote.update({
            where: { id: quoteId },
            data: { status: client_1.QuoteStatus.CONVERTED },
            include: { customer: true, lineItems: true, createdBy: true }
        });
        return { order: newOrder, quote: updatedQuote };
    }));
    return transactionResult;
});
exports.convertQuoteToOrder = convertQuoteToOrder;
// Export the function to match the import in the controller
exports.convertQuoteToOrderController = exports.convertQuoteToOrder;
const updateDraftQuote = (quoteId, data) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`[QuoteService][updateDraftQuote] Updating draft quote ${quoteId}. Raw input:`, JSON.stringify(data, null, 2));
    const quote = yield prismaClient_1.default.quote.findUnique({ where: { id: quoteId } });
    if (!quote)
        throw new Error(`Quote ${quoteId} not found.`);
    if (quote.status !== client_1.QuoteStatus.DRAFT)
        throw new Error(`Quote ${quoteId} is not in DRAFT status.`);
    const dataToUpdate = {};
    if (data.title !== undefined)
        dataToUpdate.title = data.title;
    if (data.description !== undefined)
        dataToUpdate.description = data.description;
    if (data.validUntil !== undefined)
        dataToUpdate.validUntil = data.validUntil;
    if (data.customerReference !== undefined)
        dataToUpdate.customerReference = data.customerReference;
    if (data.contactEmail !== undefined)
        dataToUpdate.contactEmail = data.contactEmail;
    if (data.contactPerson !== undefined)
        dataToUpdate.contactPerson = data.contactPerson;
    if (data.contactPhone !== undefined)
        dataToUpdate.contactPhone = data.contactPhone;
    // Only allow status change to DRAFT if explicitly provided and is DRAFT
    if (data.status !== undefined && data.status === client_1.QuoteStatus.DRAFT)
        dataToUpdate.status = data.status;
    if (data.lineItems || data.totalAmount !== undefined) {
        let finalTotal;
        if (data.lineItems) {
            // Delete existing line items first
            yield prismaClient_1.default.quoteLineItem.deleteMany({
                where: { quoteId: quoteId }
            });
            const lineItemsForDb = yield processLineItemsWithMaterialCodeLookup(data.lineItems);
            console.log('[QuoteService][updateDraftQuote] Line items processed for DB:', JSON.stringify(lineItemsForDb, null, 2));
            // Calculate total using regular number math
            const totalAmountFromItems = lineItemsForDb.reduce((sum, item) => {
                var _a, _b;
                return sum + (((_a = item.quantity) !== null && _a !== void 0 ? _a : 0) * ((_b = item.unitPrice) !== null && _b !== void 0 ? _b : 0));
            }, 0);
            // Get company settings with default VAT rate
            const companySettings = yield prismaClient_1.default.companySettings.findFirst();
            // Use regular number calculations
            const vatRate = 20; // Default VAT rate
            const vatMultiplier = 1 + (vatRate / 100);
            finalTotal = data.totalAmount !== undefined
                ? data.totalAmount
                : totalAmountFromItems * vatMultiplier;
            dataToUpdate.lineItems = {
                create: lineItemsForDb,
            };
        }
        else if (data.totalAmount !== undefined) {
            finalTotal = data.totalAmount;
        }
        else {
            finalTotal = Number(quote.totalAmount); // Ensure it's a number
        }
        dataToUpdate.totalAmount = finalTotal;
    }
    return prismaClient_1.default.quote.update({
        where: { id: quoteId },
        data: dataToUpdate,
        include: { customer: true, lineItems: { include: { material: true } }, createdBy: true }
    });
});
exports.updateDraftQuote = updateDraftQuote;
const updateQuoteStatus = (quoteId, newStatus, userId) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`[QuoteService][updateQuoteStatus] User ${userId} updating quote ${quoteId} to ${newStatus}`);
    const quote = yield prismaClient_1.default.quote.findUnique({
        where: { id: quoteId },
        select: { status: true, description: true, createdById: true }
    });
    if (!quote)
        throw new Error(`Quote ${quoteId} not found.`);
    if (quote.status === newStatus) {
        // If status is already the desired status, just return the current quote
        return prismaClient_1.default.quote.findUnique({
            where: { id: quoteId },
            include: { customer: { select: { name: true, id: true } }, lineItems: { include: { material: true } }, createdBy: { select: { name: true, id: true } } }
        });
    }
    if (quote.status === client_1.QuoteStatus.CONVERTED)
        throw new Error(`Cannot change status from ${client_1.QuoteStatus.CONVERTED}.`);
    if (quote.status === client_1.QuoteStatus.EXPIRED && newStatus !== client_1.QuoteStatus.DRAFT) {
        throw new Error(`Cannot change status from ${client_1.QuoteStatus.EXPIRED} to ${newStatus}. Consider cloning.`);
    }
    const dataToUpdate = { status: newStatus };
    if (newStatus === client_1.QuoteStatus.SENT && quote.status !== client_1.QuoteStatus.SENT) {
        const sentDateStr = new Date().toISOString().split('T')[0];
        let currentDescription = quote.description || '';
        // Use regex to remove existing "Sent on: YYYY-MM-DD;" entries to avoid duplication
        currentDescription = currentDescription.replace(/Sent on:\s*\d{4}-\d{2}-\d{2}\s*;?\s*/g, '').trim();
        dataToUpdate.description = `Sent on: ${sentDateStr}; ${currentDescription}`.replace(/;\s*$/, '').trim();
    }
    const updatedQuote = yield prismaClient_1.default.quote.update({
        where: { id: quoteId },
        data: dataToUpdate,
        include: {
            customer: { select: { name: true, id: true } },
            lineItems: { include: { material: true } },
            createdBy: { select: { name: true, id: true } }
        }
    });
    return updatedQuote;
});
exports.updateQuoteStatus = updateQuoteStatus;
