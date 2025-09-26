// backend/src/routes/quotes.ts

import express, { Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { PrismaClient, QuoteStatus, Prisma } from '@prisma/client';

// Import all controller functions directly for better type checking
import {
  getFrequentItems,
  getQuoteById,
  updateQuoteStatus,
  updateQuote,
  deleteQuote,
  createQuote, // This exists in the controller
  // Import these directly from the service since they're not exported from the controller
} from '../controllers/quoteController';

// Import the missing functions directly from the service
import { 
  getQuoteHistoryByReference,
  cloneQuoteController,
  convertQuoteToOrderController,
  createQuoteV1 
} from '../services/quoteService';

// ADD AUDIT MIDDLEWARE IMPORT
import { auditQuoteMiddleware, auditStatusChangeMiddleware } from '../middleware/auditMiddleware';

console.log('!!! QUOTES ROUTE FILE BEING LOADED !!!');

const prisma = new PrismaClient();
const router = express.Router();

// Define AuthRequest interface for type safety (assuming user property)
// This interface should ideally be in src/types/express.d.ts for global augmentation
// but defining it here for immediate clarity if that's not fully set up.
interface UserPayload {
  id: string;
  role: string;
  [key: string]: any;
}
interface AuthRequest extends Request {
  user?: UserPayload; // Assuming user always has id and role
}

// Utility to wrap async functions to catch errors and pass to Express error handling
// Ensure that the 'req' parameter passed to fn is `AuthRequest` for type safety
const asyncHandler = (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    // Cast req to AuthRequest inside asyncHandler to ensure proper typing for the wrapped function
    Promise.resolve(fn(req as AuthRequest, res, next)).catch(next);
  };

// 🔧 DEBUGGING: First middleware - should hit before auth
router.use((req, res, next) => {
    console.log('🎯 [QUOTES ROUTER] ENTRY - before auth:', req.method, req.path);
    next();
});

// Protect all quote routes with authentication
router.use(authenticateToken);

// 🔧 DEBUGGING: Second middleware - should hit after auth
router.use((req, res, next) => {
    console.log('🎯 [QUOTES ROUTER] AFTER AUTH:', req.method, req.path);
    next();
});

// --- HELPER FUNCTIONS (Copied from your provided file - ensure these are correctly typed elsewhere or in this file) ---
// These helper functions might be better placed in a utility file or within the service/controller
// as they are presentation logic. For now, keeping them as-is.
function simplifyValue(value: any): any {
    if (value === null || value === undefined) { return null; }
    if (typeof value === 'object') {
        if (value instanceof Date) { return value.toISOString(); }
        if (Array.isArray(value)) { return value.map(item => simplifyValue(item)); }
        const result: Record<string, any> = {};
        for (const [key, val] of Object.entries(value)) {
            const typedVal: any = val;
            if (key === 'customer' && typedVal && typeof typedVal === 'object' && typedVal.name) {
                result.customerName = typedVal.name;
                result.customerId = typedVal.id;
            } else {
                result[key] = simplifyValue(typedVal);
            }
        }
        return result;
    }
    return value;
}

function prepareQuoteForFrontend(quote: any): any {
    const baseQuote = {
        id: quote.id,
        title: quote.title || '',
        description: quote.description || '',
        notes: quote.notes || '',
        status: quote.status || 'DRAFT',
        customerId: quote.customerId || '',
        createdById: quote.createdById || '',
        validUntil: quote.validUntil?.toISOString().split('T')[0] || new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
        value: quote.value || quote.totalAmount || 0,
        contactPerson: quote.contactPerson || '',
        contactEmail: quote.contactEmail || '',
        contactPhone: quote.contactPhone || '',
        createdAt: quote.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: quote.updatedAt?.toISOString() || new Date().toISOString(),
        customerName: quote.customer?.name || '',
        lineItems: Array.isArray(quote.lineItems) ? quote.lineItems.map(simplifyValue) : [],
        quoteNumber: quote.quoteNumber || '',
        customerReference: quote.customerReference || '',
        quoteReference: quote.quoteReference || '',
        versionNumber: quote.versionNumber || 0,
        isLatestVersion: quote.isLatestVersion,
        changeReason: quote.changeReason || '',
        parentQuoteId: quote.parentQuoteId || null,
        termsAndConditions: quote.termsAndConditions || '', // Add this to preserve terms in frontend response
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
router.get('/frequent-items', asyncHandler(getFrequentItems));

// 🔧 ENHANCED DEBUGGING: Main GET route with step-by-step logging
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
    console.log('🎯 [QUOTES] === MAIN GET ROUTE HIT ===');
    console.log('🎯 [QUOTES] Query params:', req.query);
    console.log('🎯 [QUOTES] User from auth:', req.user?.id);
    
    try {
        const onlyLatest = req.query.all !== 'true';
        console.log('🎯 [QUOTES] onlyLatest filter:', onlyLatest);
        
        // Test query without any filters first
        console.log('🎯 [QUOTES] Testing database connection...');
        const allQuotes = await prisma.quote.findMany();
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
        const quotes = await prisma.quote.findMany({
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
    } catch (error) {
        console.error('🚨 [QUOTES] ERROR in GET /quotes route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));

// Create a wrapper to adapt service function to work with route handler
const getQuoteHistoryByReferenceHandler = async (req: AuthRequest, res: Response) => {
    const { quoteReference } = req.params;
    const history = await getQuoteHistoryByReference(quoteReference);
    const formattedHistory = history.map(quote => prepareQuoteForFrontend(quote));
    res.json(formattedHistory);
};

router.get('/history/:quoteReference', asyncHandler(getQuoteHistoryByReferenceHandler));
router.get('/:id', asyncHandler(getQuoteById));

// CREATE route - ADD AUDIT MIDDLEWARE
router.post('/', auditQuoteMiddleware('CREATE'), asyncHandler(async (req: AuthRequest, res: Response) => {
    console.log('🎯 [QUOTES] CREATE route hit');
    // FIXED: Added termsAndConditions to destructuring
    const { customerId, title, description, items = [], validUntil, status, customerReference, contactEmail, contactPerson, contactPhone, value, totalAmount, termsAndConditions } = req.body;
    
    if (!customerId || !title || !items || !Array.isArray(items)) {
        res.status(400).json({ message: 'Missing required fields: customerId, title, items' });
        return; // Add return for early exit
    }
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ message: 'User authentication failed or user ID missing' });
        return; // Add return for early exit
    }
    const quoteData = {
        customerId, title, description,
        termsAndConditions, // FIXED: Added termsAndConditions to quoteData
        lineItems: items.map((item: any) => ({
            description: item.description || '',
            quantity: parseFloat(item.quantity?.toString() || '1') || 1,
            unitPrice: parseFloat(item.unitPrice?.toString() || '0') || 0,
            materialId: item.materialId || null
        })),
        validUntil: validUntil ? new Date(validUntil) : undefined,
        status: status as QuoteStatus || undefined, // Ensure status is explicitly of QuoteStatus type or undefined
        customerReference, contactEmail, contactPerson, contactPhone,
        createdById: userId,
        totalAmount: value || totalAmount
    };
    try {
        // Direct call to service function - the audit middleware will use the 'CREATE' action.
        // If you want `createQuote` controller to handle the response, then you would call `createQuote` here.
        // Assuming createQuoteV1 is intended to be called directly from the route for now.
        const newQuoteVersion = await createQuoteV1(quoteData);
        
        // ADDED: Logging the created quote before sending to frontend
        console.log('🎯 [QUOTES] Successfully created quote with ID:', newQuoteVersion.id);
        console.log('🎯 [QUOTES] Quote isLatestVersion flag:', newQuoteVersion.isLatestVersion);
        
        const frontendCompatibleResponse = prepareQuoteForFrontend(newQuoteVersion);
        res.status(201).json(frontendCompatibleResponse); // Removed 'return'
    } catch (error) {
        console.error('🚨 [QUOTES] Error creating quote v1:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : error.meta?.target as string | undefined;
            const field_name = error.meta?.field_name as string | undefined;
            if (error.code === 'P2002') {
                res.status(409).json({ message: `Conflict creating quote. Unique constraint failed on field(s): ${target || 'unknown'}` });
                return; // Add return for early exit
            }
            if (error.code === 'P2003') {
                res.status(400).json({ message: `Invalid input. Foreign key constraint failed on field: ${field_name || 'unknown'}` });
                return; // Add return for early exit
            }
        }
        res.status(500).json({ message: 'Failed to create quote', error: (error as Error).message });
    }
}));

// STATUS UPDATE route - ADD SPECIFIC STATUS AUDIT
router.patch('/:id/status', auditStatusChangeMiddleware('quote'), asyncHandler(updateQuoteStatus));

// UPDATE route - ADD AUDIT MIDDLEWARE
router.put('/:id', auditQuoteMiddleware('UPDATE'), asyncHandler(updateQuote));

// DELETE route - ADD AUDIT MIDDLEWARE
router.delete('/:id', auditQuoteMiddleware('DELETE'), asyncHandler(deleteQuote));

// Create wrappers for service functions to work with route handlers
const cloneQuoteHandler = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { customerId, title } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
        return res.status(401).json({ message: 'User authentication failed or user ID missing' });
    }
    
    try {
        const clonedQuote = await cloneQuoteController(id, userId, customerId, title);
        return res.status(201).json(prepareQuoteForFrontend(clonedQuote));
    } catch (error) {
        console.error('Error cloning quote:', error);
        return res.status(500).json({ message: 'Failed to clone quote', error: (error as Error).message });
    }
};

const convertQuoteToOrderHandler = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
        return res.status(401).json({ message: 'User authentication failed or user ID missing' });
    }
    
    try {
        const result = await convertQuoteToOrderController(id, userId);
        return res.status(200).json({
            order: result.order,
            quote: prepareQuoteForFrontend(result.quote)
        });
    } catch (error) {
        console.error('Error converting quote to order:', error);
        return res.status(500).json({ message: 'Failed to convert quote to order', error: (error as Error).message });
    }
};

// CLONE route - This creates a new quote, so audit as CREATE
router.post('/:id/clone', auditQuoteMiddleware('CREATE'), asyncHandler(cloneQuoteHandler));

// CONVERT TO ORDER route - Important for audit trail
router.post('/:id/convert-to-order', auditQuoteMiddleware('CONVERTED_TO_ORDER'), asyncHandler(convertQuoteToOrderHandler));

console.log('🎯 [QUOTES] Router setup complete - exporting router');

export default router;