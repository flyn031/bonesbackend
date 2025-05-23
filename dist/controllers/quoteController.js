"use strict";
// src/controllers/quoteController.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.updateQuoteStatus = exports.getFrequentItems = exports.convertQuoteToOrderController = exports.cloneQuoteController = exports.deleteQuote = exports.updateQuote = exports.createQuote = exports.getQuoteHistoryByReference = exports.getQuoteById = exports.getAllQuotes = void 0;
const quoteService = __importStar(require("../services/quoteService"));
const client_1 = require("@prisma/client");
const prismaClient_1 = __importDefault(require("../utils/prismaClient"));
// --- Controller Functions ---
const getAllQuotes = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const onlyLatest = req.query.all !== 'true';
        const quotes = yield quoteService.getQuotes(onlyLatest);
        res.json(quotes);
    }
    catch (error) {
        console.error("Error in getAllQuotes:", error);
        next(error);
    }
});
exports.getAllQuotes = getAllQuotes;
const getQuoteById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const quote = yield quoteService.getQuoteVersionById(id);
        if (!quote) {
            res.status(404).json({ message: 'Quote version not found' });
            return;
        }
        res.json(quote);
    }
    catch (error) {
        console.error(`Error in getQuoteById for ID ${req.params.id}:`, error);
        next(error);
    }
});
exports.getQuoteById = getQuoteById;
const getQuoteHistoryByReference = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { quoteReference } = req.params;
        const history = yield quoteService.getQuoteHistory(quoteReference);
        if (!history || history.length === 0) {
            res.status(404).json({ message: `No quote history found for reference ${quoteReference}` });
            return;
        }
        res.json(history);
    }
    catch (error) {
        console.error(`Error in getQuoteHistoryByReference for Ref ${req.params.quoteReference}:`, error);
        next(error);
    }
});
exports.getQuoteHistoryByReference = getQuoteHistoryByReference;
const createQuote = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        const _b = req.body, { customerId, title, lineItems, items, validUntil, status, customerReference, contactEmail, contactPerson, contactPhone, quoteNumberPrefix, lastQuoteNumber } = _b, otherData = __rest(_b, ["customerId", "title", "lineItems", "items", "validUntil", "status", "customerReference", "contactEmail", "contactPerson", "contactPhone", "quoteNumberPrefix", "lastQuoteNumber"]);
        const itemsToProcess = items || lineItems || [];
        if (!customerId || !title || !Array.isArray(itemsToProcess) || itemsToProcess.length === 0) {
            res.status(400).json({ message: 'Missing required fields: customerId, title, and at least one line item.' });
            return;
        }
        let calculatedTotal = 0;
        // Calculate total if not provided
        if (!otherData.calculatedTotal) {
            calculatedTotal = itemsToProcess.reduce((sum, item) => {
                var _a, _b;
                const quantity = parseFloat(((_a = item.quantity) === null || _a === void 0 ? void 0 : _a.toString()) || '1') || 1;
                const unitPrice = parseFloat(((_b = item.unitPrice) === null || _b === void 0 ? void 0 : _b.toString()) || '0') || 0;
                if (!isNaN(quantity) && !isNaN(unitPrice)) {
                    return sum + (quantity * unitPrice);
                }
                return sum;
            }, 0);
        }
        else {
            calculatedTotal = parseFloat(otherData.calculatedTotal.toString()) || 0;
        }
        const quoteData = {
            customerId,
            title,
            description: otherData.description,
            lineItems: itemsToProcess.map((item) => {
                var _a, _b;
                return ({
                    description: item.description || '',
                    quantity: parseFloat(((_a = item.quantity) === null || _a === void 0 ? void 0 : _a.toString()) || '1') || 1,
                    unitPrice: parseFloat(((_b = item.unitPrice) === null || _b === void 0 ? void 0 : _b.toString()) || '0') || 0,
                    materialId: item.materialId || null
                });
            }),
            validUntil: validUntil ? new Date(validUntil) : undefined,
            status: status || undefined,
            customerReference,
            contactEmail,
            contactPerson,
            contactPhone,
            createdById: req.user.id,
            totalAmount: otherData.totalAmount,
            calculatedTotal: calculatedTotal,
            quoteNumberPrefix,
            lastQuoteNumber
        };
        const newQuote = yield quoteService.createQuoteV1(quoteData);
        res.status(201).json(newQuote);
    }
    catch (error) {
        console.error("Error in createQuote:", error);
        next(error);
    }
});
exports.createQuote = createQuote;
const updateQuote = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        const _b = req.body, { changeReason, lineItems, items, quoteNumberPrefix, lastQuoteNumber } = _b, updateData = __rest(_b, ["changeReason", "lineItems", "items", "quoteNumberPrefix", "lastQuoteNumber"]);
        const itemsToProcess = items || lineItems;
        const currentQuote = yield quoteService.getQuoteVersionById(id);
        if (!currentQuote) {
            res.status(404).json({ message: `Quote version ${id} not found.` });
            return;
        }
        let calculatedTotal = 0;
        // Calculate total if necessary
        if (itemsToProcess && Array.isArray(itemsToProcess)) {
            calculatedTotal = itemsToProcess.reduce((sum, item) => {
                var _a, _b;
                const quantity = parseFloat(((_a = item.quantity) === null || _a === void 0 ? void 0 : _a.toString()) || '1') || 1;
                const unitPrice = parseFloat(((_b = item.unitPrice) === null || _b === void 0 ? void 0 : _b.toString()) || '0') || 0;
                if (!isNaN(quantity) && !isNaN(unitPrice)) {
                    return sum + (quantity * unitPrice);
                }
                return sum;
            }, 0);
        }
        else if (updateData.calculatedTotal) {
            calculatedTotal = parseFloat(updateData.calculatedTotal.toString()) || 0;
        }
        // Convert itemsToProcess quantities/prices to numbers for the service layer
        const processedLineItemsForService = itemsToProcess ? itemsToProcess.map((item) => {
            var _a, _b;
            return ({
                description: item.description || '',
                quantity: parseFloat(((_a = item.quantity) === null || _a === void 0 ? void 0 : _a.toString()) || '1') || 1,
                unitPrice: parseFloat(((_b = item.unitPrice) === null || _b === void 0 ? void 0 : _b.toString()) || '0') || 0,
                materialId: item.materialId || null
            });
        }) : undefined;
        if (currentQuote.status === client_1.QuoteStatus.DRAFT && !changeReason) {
            const draftUpdatePayload = Object.assign(Object.assign({}, updateData), { validUntil: updateData.validUntil ? new Date(updateData.validUntil) : undefined, status: updateData.status || undefined, lineItems: processedLineItemsForService, totalAmount: updateData.totalAmount, calculatedTotal: calculatedTotal });
            // Fix for incorrect parameter count
            const updatedDraft = yield quoteService.updateDraftQuote(id, draftUpdatePayload);
            res.json(updatedDraft);
        }
        else {
            if (!changeReason) {
                res.status(400).json({ message: 'Change reason required for new version.' });
                return;
            }
            if (!processedLineItemsForService || !Array.isArray(processedLineItemsForService) || processedLineItemsForService.length === 0) {
                res.status(400).json({ message: 'Line items are required for new version.' });
                return;
            }
            const versionData = Object.assign(Object.assign({}, updateData), { parentQuoteId: id, changeReason: changeReason, createdById: req.user.id, validUntil: updateData.validUntil ? new Date(updateData.validUntil) : undefined, status: updateData.status || undefined, lineItems: processedLineItemsForService, totalAmount: updateData.totalAmount, calculatedTotal: calculatedTotal, customerId: currentQuote.customerId });
            const newVersion = yield quoteService.createNewQuoteVersion(versionData);
            res.status(201).json(newVersion);
        }
    }
    catch (error) {
        console.error(`Error in updateQuote for ID ${req.params.id}:`, error);
        if (error instanceof Error) {
            if (error.message.includes("Cannot create") || error.message.includes("not in DRAFT")) {
                res.status(409).json({ message: error.message });
                return;
            }
            if (error.message.includes("not found")) {
                res.status(404).json({ message: error.message });
                return;
            }
        }
        next(error);
    }
});
exports.updateQuote = updateQuote;
const deleteQuote = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const quoteToDelete = yield prismaClient_1.default.quote.findUnique({ where: { id: id }, select: { status: true, isLatestVersion: true, childQuotes: { select: { id: true } } } });
        if (!quoteToDelete) {
            res.status(404).json({ message: 'Quote version not found for deletion.' });
            return;
        }
        // Example: Only allow deletion of DRAFT quotes that are the latest version and have no children
        if (quoteToDelete.status !== client_1.QuoteStatus.DRAFT || !quoteToDelete.isLatestVersion || quoteToDelete.childQuotes.length > 0) {
            res.status(403).json({ message: 'Deletion forbidden. Only the latest DRAFT version without child versions can be deleted.' });
            return;
        }
        yield prismaClient_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            yield tx.quoteLineItem.deleteMany({ where: { quoteId: id } });
            yield tx.quote.delete({ where: { id: id } });
        }));
        res.json({ message: `Quote version ${id} deleted successfully` });
    }
    catch (error) {
        console.error(`Error in deleteQuote for ID ${req.params.id}:`, error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            res.status(404).json({ message: 'Quote version not found for deletion.' });
            return;
        }
        next(error);
    }
});
exports.deleteQuote = deleteQuote;
const cloneQuoteController = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id: sourceQuoteId } = req.params;
        const { customerId, title } = req.body; // FIXED: Removed extra parameters
        if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        // FIXED: Only passing the required parameters that cloneQuote expects
        const clonedQuote = yield quoteService.cloneQuote(sourceQuoteId, req.user.id, customerId, title);
        res.status(201).json(clonedQuote);
    }
    catch (error) {
        console.error(`Error in cloneQuoteController for ID ${req.params.id}:`, error);
        if (error instanceof Error && error.message.includes("not found")) {
            res.status(404).json({ message: error.message });
            return;
        }
        // Handle specific invalid customerId error
        if (error instanceof Error && error.message.includes("Invalid Customer ID")) {
            const errorMsg = error.message;
            const cIdMatch = errorMsg.match(/\(([^)]+)\)/);
            const invalidCustId = cIdMatch ? cIdMatch[1] : "unknown";
            res.status(400).json({
                message: `Failed to clone quote: Invalid Customer ID (${invalidCustId}). ${((_b = error.meta) === null || _b === void 0 ? void 0 : _b.field_name) || ''}`
            });
            return;
        }
        next(error);
    }
});
exports.cloneQuoteController = cloneQuoteController;
const convertQuoteToOrderController = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id: quoteId } = req.params;
        // FIXED: Removed the destructuring of unused parameters
        if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        // FIXED: Only passing the required parameters that convertQuoteToOrder expects
        const result = yield quoteService.convertQuoteToOrder(quoteId, req.user.id);
        res.status(201).json(result);
    }
    catch (error) {
        console.error(`Error in convertQuoteToOrderController for ID ${req.params.id}:`, error);
        if (error instanceof Error) {
            if (error.message.includes("not found")) {
                res.status(404).json({ message: error.message });
                return;
            }
            if (error.message.includes("APPROVED") || error.message.includes("customer") || error.message.includes("missing creator")) {
                res.status(400).json({ message: error.message });
                return;
            }
        }
        next(error);
    }
});
exports.convertQuoteToOrderController = convertQuoteToOrderController;
const getFrequentItems = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // FIXED: Changed from prisma.quoteTemplateItem to prisma.quote
        const frequentItems = yield prismaClient_1.default.quote.findMany({
            where: { isLatestVersion: true },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                lineItems: true
            }
        });
        res.json(frequentItems);
    }
    catch (error) {
        console.error("Error in getFrequentItems:", error);
        next(error);
    }
});
exports.getFrequentItems = getFrequentItems;
const updateQuoteStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id: quoteId } = req.params;
        const { status: newStatus } = req.body; // FIXED: Removed unused parameters
        if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        const userId = req.user.id;
        if (!quoteId) {
            res.status(400).json({ message: "Quote ID is required in path parameters." });
            return;
        }
        if (!newStatus) {
            res.status(400).json({ message: "New status is required in the request body." });
            return;
        }
        if (!Object.values(client_1.QuoteStatus).includes(newStatus)) {
            res.status(400).json({ message: `Invalid status value provided: ${newStatus}.` });
            return;
        }
        console.log(`[QuoteController] Request to update status for quote ${quoteId} to ${newStatus} by user ${userId}`);
        // FIXED: Only passing the required parameters that updateQuoteStatus expects
        const updatedQuote = yield quoteService.updateQuoteStatus(quoteId, newStatus, userId);
        // Fix for lineItems property access
        const quoteWithLineItems = yield prismaClient_1.default.quote.findUnique({
            where: { id: quoteId },
            include: { lineItems: true }
        });
        console.log(`[QuoteController] Successfully updated status for quote ${quoteId}.`);
        res.status(200).json(Object.assign(Object.assign({}, updatedQuote), { items: (quoteWithLineItems === null || quoteWithLineItems === void 0 ? void 0 : quoteWithLineItems.lineItems) || [], status: newStatus }));
    }
    catch (error) {
        console.error(`[QuoteController] Error updating status for quote ${req.params.id}:`, error.message, error.stack);
        if (error instanceof Error) {
            if (error.message.includes("not found")) {
                res.status(404).json({ message: error.message });
                return;
            }
            else if (error.message.includes("Cannot change status from") || error.message.includes("Consider cloning")) {
                res.status(400).json({ message: error.message });
                return;
            }
        }
        next(error);
    }
});
exports.updateQuoteStatus = updateQuoteStatus;
