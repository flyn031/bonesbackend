// backend/src/routes/quotes.ts

import express, { Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { PrismaClient, QuoteStatus, Prisma } from '@prisma/client';

import {
  getFrequentItems,
  getQuoteById,
  updateQuoteStatus,
  updateQuote,
  deleteQuote,
  createQuote,
} from '../controllers/quoteController';

import { 
  getQuoteHistoryByReference,
  cloneQuoteController,
  convertQuoteToOrderController,
  createQuoteV1 
} from '../services/quoteService';

import { auditQuoteMiddleware, auditStatusChangeMiddleware } from '../middleware/auditMiddleware';

console.log('!!! QUOTES ROUTE FILE BEING LOADED !!!');

const prisma = new PrismaClient();
const router = express.Router();

interface UserPayload {
  id: string;
  role: string;
  [key: string]: any;
}
interface AuthRequest extends Request {
  user?: UserPayload;
}

const asyncHandler = (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as AuthRequest, res, next)).catch(next);
  };

router.use((req, res, next) => {
    console.log('🎯 [QUOTES ROUTER] ENTRY - before auth:', req.method, req.path);
    next();
});

router.use(authenticateToken);

router.use((req, res, next) => {
    console.log('🎯 [QUOTES ROUTER] AFTER AUTH:', req.method, req.path);
    next();
});

// HELPER FUNCTIONS
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

// FIXED: Added 4 new fields to prepareQuoteForFrontend
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
        termsAndConditions: quote.termsAndConditions || '',
        paymentTerms: quote.paymentTerms || '', // FIXED: Added
        deliveryTerms: quote.deliveryTerms || '', // FIXED: Added
        warranty: quote.warranty || '', // FIXED: Added
        exclusions: quote.exclusions || '', // FIXED: Added
    };
    return baseQuote;
}

// ROUTES

router.get('/simple-test', (req, res) => {
    console.log('🧪 [QUOTES] SIMPLE TEST ROUTE HIT !!!');
    res.json({ message: 'Simple test works!', timestamp: new Date().toISOString() });
});

router.get('/frequent-items', asyncHandler(getFrequentItems));

router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
    console.log('🎯 [QUOTES] === MAIN GET ROUTE HIT ===');
    console.log('🎯 [QUOTES] Query params:', req.query);
    console.log('🎯 [QUOTES] User from auth:', req.user?.id);
    
    try {
        const onlyLatest = req.query.all !== 'true';
        console.log('🎯 [QUOTES] onlyLatest filter:', onlyLatest);
        
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

const getQuoteHistoryByReferenceHandler = async (req: AuthRequest, res: Response) => {
    const { quoteReference } = req.params;
    const history = await getQuoteHistoryByReference(quoteReference);
    const formattedHistory = history.map(quote => prepareQuoteForFrontend(quote));
    res.json(formattedHistory);
};

router.get('/history/:quoteReference', asyncHandler(getQuoteHistoryByReferenceHandler));
router.get('/:id', asyncHandler(getQuoteById));

// FIXED: Added 4 new fields to destructuring and quoteData
router.post('/', auditQuoteMiddleware('CREATE'), asyncHandler(async (req: AuthRequest, res: Response) => {
    console.log('🎯 [QUOTES] CREATE route hit');
    const { 
        customerId, 
        title, 
        description, 
        items = [], 
        validUntil, 
        status, 
        customerReference, 
        contactEmail, 
        contactPerson, 
        contactPhone, 
        value, 
        totalAmount, 
        termsAndConditions,
        paymentTerms, // FIXED: Added
        deliveryTerms, // FIXED: Added
        warranty, // FIXED: Added
        exclusions // FIXED: Added
    } = req.body;
    
    if (!customerId || !title || !items || !Array.isArray(items)) {
        res.status(400).json({ message: 'Missing required fields: customerId, title, items' });
        return;
    }
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ message: 'User authentication failed or user ID missing' });
        return;
    }
    const quoteData = {
        customerId, 
        title, 
        description,
        termsAndConditions,
        paymentTerms, // FIXED: Added
        deliveryTerms, // FIXED: Added
        warranty, // FIXED: Added
        exclusions, // FIXED: Added
        lineItems: items.map((item: any) => ({
            description: item.description || '',
            quantity: parseFloat(item.quantity?.toString() || '1') || 1,
            unitPrice: parseFloat(item.unitPrice?.toString() || '0') || 0,
            materialId: item.materialId || null
        })),
        validUntil: validUntil ? new Date(validUntil) : undefined,
        status: status as QuoteStatus || undefined,
        customerReference, 
        contactEmail, 
        contactPerson, 
        contactPhone,
        createdById: userId,
        totalAmount: value || totalAmount
    };
    try {
        const newQuoteVersion = await createQuoteV1(quoteData);
        
        console.log('🎯 [QUOTES] Successfully created quote with ID:', newQuoteVersion.id);
        console.log('🎯 [QUOTES] Quote isLatestVersion flag:', newQuoteVersion.isLatestVersion);
        
        const frontendCompatibleResponse = prepareQuoteForFrontend(newQuoteVersion);
        res.status(201).json(frontendCompatibleResponse);
    } catch (error) {
        console.error('🚨 [QUOTES] Error creating quote v1:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : error.meta?.target as string | undefined;
            const field_name = error.meta?.field_name as string | undefined;
            if (error.code === 'P2002') {
                res.status(409).json({ message: `Conflict creating quote. Unique constraint failed on field(s): ${target || 'unknown'}` });
                return;
            }
            if (error.code === 'P2003') {
                res.status(400).json({ message: `Invalid input. Foreign key constraint failed on field: ${field_name || 'unknown'}` });
                return;
            }
        }
        res.status(500).json({ message: 'Failed to create quote', error: (error as Error).message });
    }
}));

router.put('/:id', auditQuoteMiddleware('UPDATE'), asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    console.log('🚦 [PROD DEBUG] Incoming PUT /quotes/:id');
    console.log('🚦 [PROD DEBUG] Quote ID:', req.params.id);
    console.log('🚦 [PROD DEBUG] Full request body:', JSON.stringify(req.body, null, 2));
    console.log('🚦 [PROD DEBUG] termsAndConditions field:', req.body?.termsAndConditions);
    console.log('🚦 [PROD DEBUG] termsAndConditions length:', req.body?.termsAndConditions?.length);
    console.log('🚦 [PROD DEBUG] Content-Type:', req.headers['content-type']);
    
    return updateQuote(req, res, next);
}));

router.delete('/:id', auditQuoteMiddleware('DELETE'), asyncHandler(deleteQuote));

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

router.post('/:id/clone', auditQuoteMiddleware('CREATE'), asyncHandler(cloneQuoteHandler));
router.post('/:id/convert-to-order', auditQuoteMiddleware('CONVERTED_TO_ORDER'), asyncHandler(convertQuoteToOrderHandler));

console.log('🎯 [QUOTES] Router setup complete - exporting router');

export default router;
console.log('Force rebuild Sat Sep 27 10:10:22 BST 2025');