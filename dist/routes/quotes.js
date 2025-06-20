"use strict";
// backend/src/routes/quotes.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const client_1 = require("@prisma/client");
// Import all controller functions directly for better type checking
const quoteController_1 = require("../controllers/quoteController");
// Import the missing functions directly from the service
const quoteService_1 = require("../services/quoteService");
// ADD AUDIT MIDDLEWARE IMPORT
const auditMiddleware_1 = require("../middleware/auditMiddleware");
console.log('!!! QUOTES ROUTE FILE BEING LOADED !!!');
const prisma = new client_1.PrismaClient();
const router = express_1.default.Router();
// Utility to wrap async functions to catch errors and pass to Express error handling
// Ensure that the 'req' parameter passed to fn is `AuthRequest` for type safety
const asyncHandler = (fn) => (req, res, next) => {
    // Cast req to AuthRequest inside asyncHandler to ensure proper typing for the wrapped function
    Promise.resolve(fn(req, res, next)).catch(next);
};
// 🔧 DEBUGGING: First middleware - should hit before auth
router.use((req, res, next) => {
    console.log('🎯 [QUOTES ROUTER] ENTRY - before auth:', req.method, req.path);
    next();
});
// Protect all quote routes with authentication
router.use(authMiddleware_1.authenticateToken);
// 🔧 DEBUGGING: Second middleware - should hit after auth
router.use((req, res, next) => {
    console.log('🎯 [QUOTES ROUTER] AFTER AUTH:', req.method, req.path);
    next();
});
// --- HELPER FUNCTIONS (Copied from your provided file - ensure these are correctly typed elsewhere or in this file) ---
// These helper functions might be better placed in a utility file or within the service/controller
// as they are presentation logic. For now, keeping them as-is.
function simplifyValue(value) {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === 'object') {
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (Array.isArray(value)) {
            return value.map(item => simplifyValue(item));
        }
        const result = {};
        for (const [key, val] of Object.entries(value)) {
            const typedVal = val;
            if (key === 'customer' && typedVal && typeof typedVal === 'object' && typedVal.name) {
                result.customerName = typedVal.name;
                result.customerId = typedVal.id;
            }
            else {
                result[key] = simplifyValue(typedVal);
            }
        }
        return result;
    }
    return value;
}
function prepareQuoteForFrontend(quote) {
    var _a, _b, _c, _d;
    const baseQuote = {
        id: quote.id,
        title: quote.title || '',
        description: quote.description || '',
        status: quote.status || 'DRAFT',
        customerId: quote.customerId || '',
        createdById: quote.createdById || '',
        validUntil: ((_a = quote.validUntil) === null || _a === void 0 ? void 0 : _a.toISOString().split('T')[0]) || new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
        value: quote.value || quote.totalAmount || 0,
        contactPerson: quote.contactPerson || '',
        contactEmail: quote.contactEmail || '',
        contactPhone: quote.contactPhone || '',
        createdAt: ((_b = quote.createdAt) === null || _b === void 0 ? void 0 : _b.toISOString()) || new Date().toISOString(),
        updatedAt: ((_c = quote.updatedAt) === null || _c === void 0 ? void 0 : _c.toISOString()) || new Date().toISOString(),
        customerName: ((_d = quote.customer) === null || _d === void 0 ? void 0 : _d.name) || '',
        lineItems: Array.isArray(quote.lineItems) ? quote.lineItems.map(simplifyValue) : [],
        quoteNumber: quote.quoteNumber || '',
        customerReference: quote.customerReference || '',
        quoteReference: quote.quoteReference || '',
        versionNumber: quote.versionNumber || 0,
        isLatestVersion: quote.isLatestVersion,
        changeReason: quote.changeReason || '',
        parentQuoteId: quote.parentQuoteId || null,
    };
    return baseQuote;
}
// --- END HELPER FUNCTIONS ---
// --- ROUTES ---
// 🔧 DEBUGGING: Simple test route with enhanced logging
router.get('/simple-test', (req, res) => {
    console.log('🧪 [QUOTES] SIMPLE TEST ROUTE HIT !!!');
    res.json({ message: 'Simple test works!', timestamp: new Date().toISOString() });
});
// GET routes (applying asyncHandler)
router.get('/frequent-items', asyncHandler(quoteController_1.getFrequentItems));
// 🔧 ENHANCED DEBUGGING: Main GET route with step-by-step logging
router.get('/', asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log('🎯 [QUOTES] === MAIN GET ROUTE HIT ===');
    console.log('🎯 [QUOTES] Query params:', req.query);
    console.log('🎯 [QUOTES] User from auth:', (_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
    try {
        const onlyLatest = req.query.all !== 'true';
        console.log('🎯 [QUOTES] onlyLatest filter:', onlyLatest);
        // Test query without any filters first
        console.log('🎯 [QUOTES] Testing database connection...');
        const allQuotes = yield prisma.quote.findMany();
        console.log(`🎯 [QUOTES] Total quotes in DB (no filters): ${allQuotes.length}`);
        if (allQuotes.length > 0) {
            console.log('🎯 [QUOTES] Sample quote from DB:', {
                id: allQuotes[0].id,
                title: allQuotes[0].title,
                isLatestVersion: allQuotes[0].isLatestVersion
            });
        }
        // Now with the actual query
        console.log('🎯 [QUOTES] Running filtered query...');
        const quotes = yield prisma.quote.findMany({
            where: onlyLatest ? { isLatestVersion: true } : undefined,
            include: { customer: true, lineItems: true, createdBy: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' }
        });
        console.log(`🎯 [QUOTES] Filtered quotes found: ${quotes.length}`);
        if (quotes.length > 0) {
            console.log('🎯 [QUOTES] First filtered quote:', {
                id: quotes[0].id,
                title: quotes[0].title,
                isLatestVersion: quotes[0].isLatestVersion
            });
        }
        console.log('🎯 [QUOTES] Preparing quotes for frontend...');
        const formattedQuotes = quotes.map(quote => prepareQuoteForFrontend(quote));
        console.log(`🎯 [QUOTES] Returning ${formattedQuotes.length} formatted quotes to frontend`);
        res.json(formattedQuotes);
    }
    catch (error) {
        console.error('🚨 [QUOTES] ERROR in GET /quotes route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
})));
// Create a wrapper to adapt service function to work with route handler
const getQuoteHistoryByReferenceHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { quoteReference } = req.params;
    const history = yield (0, quoteService_1.getQuoteHistoryByReference)(quoteReference);
    const formattedHistory = history.map(quote => prepareQuoteForFrontend(quote));
    res.json(formattedHistory);
});
router.get('/history/:quoteReference', asyncHandler(getQuoteHistoryByReferenceHandler));
router.get('/:id', asyncHandler(quoteController_1.getQuoteById));
// CREATE route - ADD AUDIT MIDDLEWARE
router.post('/', (0, auditMiddleware_1.auditQuoteMiddleware)('CREATE'), asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    console.log('🎯 [QUOTES] CREATE route hit');
    const { customerId, title, description, items = [], validUntil, status, customerReference, contactEmail, contactPerson, contactPhone, value, totalAmount } = req.body;
    if (!customerId || !title || !items || !Array.isArray(items)) {
        res.status(400).json({ message: 'Missing required fields: customerId, title, items' });
        return; // Add return for early exit
    }
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        res.status(401).json({ message: 'User authentication failed or user ID missing' });
        return; // Add return for early exit
    }
    const quoteData = {
        customerId, title, description,
        lineItems: items.map((item) => {
            var _a, _b;
            return ({
                description: item.description || '',
                quantity: parseFloat(((_a = item.quantity) === null || _a === void 0 ? void 0 : _a.toString()) || '1') || 1,
                unitPrice: parseFloat(((_b = item.unitPrice) === null || _b === void 0 ? void 0 : _b.toString()) || '0') || 0,
                materialId: item.materialId || null
            });
        }),
        validUntil: validUntil ? new Date(validUntil) : undefined,
        status: status || undefined, // Ensure status is explicitly of QuoteStatus type or undefined
        customerReference, contactEmail, contactPerson, contactPhone,
        createdById: userId,
        totalAmount: value || totalAmount
    };
    try {
        // Direct call to service function - the audit middleware will use the 'CREATE' action.
        // If you want `createQuote` controller to handle the response, then you would call `createQuote` here.
        // Assuming createQuoteV1 is intended to be called directly from the route for now.
        const newQuoteVersion = yield (0, quoteService_1.createQuoteV1)(quoteData);
        // ADDED: Logging the created quote before sending to frontend
        console.log('🎯 [QUOTES] Successfully created quote with ID:', newQuoteVersion.id);
        console.log('🎯 [QUOTES] Quote isLatestVersion flag:', newQuoteVersion.isLatestVersion);
        const frontendCompatibleResponse = prepareQuoteForFrontend(newQuoteVersion);
        res.status(201).json(frontendCompatibleResponse); // Removed 'return'
    }
    catch (error) {
        console.error('🚨 [QUOTES] Error creating quote v1:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            const target = Array.isArray((_b = error.meta) === null || _b === void 0 ? void 0 : _b.target) ? error.meta.target.join(', ') : (_c = error.meta) === null || _c === void 0 ? void 0 : _c.target;
            const field_name = (_d = error.meta) === null || _d === void 0 ? void 0 : _d.field_name;
            if (error.code === 'P2002') {
                res.status(409).json({ message: `Conflict creating quote. Unique constraint failed on field(s): ${target || 'unknown'}` });
                return; // Add return for early exit
            }
            if (error.code === 'P2003') {
                res.status(400).json({ message: `Invalid input. Foreign key constraint failed on field: ${field_name || 'unknown'}` });
                return; // Add return for early exit
            }
        }
        res.status(500).json({ message: 'Failed to create quote', error: error.message });
    }
})));
// STATUS UPDATE route - ADD SPECIFIC STATUS AUDIT
router.patch('/:id/status', (0, auditMiddleware_1.auditStatusChangeMiddleware)('quote'), asyncHandler(quoteController_1.updateQuoteStatus));
// UPDATE route - ADD AUDIT MIDDLEWARE
router.put('/:id', (0, auditMiddleware_1.auditQuoteMiddleware)('UPDATE'), asyncHandler(quoteController_1.updateQuote));
// DELETE route - ADD AUDIT MIDDLEWARE
router.delete('/:id', (0, auditMiddleware_1.auditQuoteMiddleware)('DELETE'), asyncHandler(quoteController_1.deleteQuote));
// Create wrappers for service functions to work with route handlers
const cloneQuoteHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const { customerId, title } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        return res.status(401).json({ message: 'User authentication failed or user ID missing' });
    }
    try {
        const clonedQuote = yield (0, quoteService_1.cloneQuoteController)(id, userId, customerId, title);
        return res.status(201).json(prepareQuoteForFrontend(clonedQuote));
    }
    catch (error) {
        console.error('Error cloning quote:', error);
        return res.status(500).json({ message: 'Failed to clone quote', error: error.message });
    }
});
const convertQuoteToOrderHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        return res.status(401).json({ message: 'User authentication failed or user ID missing' });
    }
    try {
        const result = yield (0, quoteService_1.convertQuoteToOrderController)(id, userId);
        return res.status(200).json({
            order: result.order,
            quote: prepareQuoteForFrontend(result.quote)
        });
    }
    catch (error) {
        console.error('Error converting quote to order:', error);
        return res.status(500).json({ message: 'Failed to convert quote to order', error: error.message });
    }
});
// CLONE route - This creates a new quote, so audit as CREATE
router.post('/:id/clone', (0, auditMiddleware_1.auditQuoteMiddleware)('CREATE'), asyncHandler(cloneQuoteHandler));
// CONVERT TO ORDER route - Important for audit trail
router.post('/:id/convert-to-order', (0, auditMiddleware_1.auditQuoteMiddleware)('CONVERTED_TO_ORDER'), asyncHandler(convertQuoteToOrderHandler));
console.log('🎯 [QUOTES] Router setup complete - exporting router');
exports.default = router;
