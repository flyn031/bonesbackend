import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { PrismaClient } from '@prisma/client';
import { 
  getAllQuotes, 
  getQuoteById, 
  createQuote, 
  updateQuote, 
  deleteQuote,
  cloneQuote,
  getFrequentItems 
} from '../controllers/quoteController';

const prisma = new PrismaClient();
const router = express.Router();

// Helper to ensure all values, even deeply nested ones, are simple types (string, number, boolean, null)
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
    
    // Convert object to a simple object with string values
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      if (key === 'customer' && val && typeof val === 'object' && val.name) {
        // Special case for customer objects
        result.customerName = val.name;
        result.customerId = val.id;
      } else {
        result[key] = simplifyValue(val);
      }
    }
    return result;
  }
  
  return value;
}

// Ensure quote has all fields frontend expects
function prepareQuoteForFrontend(quote) {
  // Create a base object with all required fields and defaults
  const baseQuote = {
    id: quote.id,
    title: quote.title || '',
    description: quote.description || '',
    status: quote.status || 'DRAFT',
    customerId: quote.customerId || '',
    createdById: quote.createdById || '',
    
    // Additional fields the frontend might expect
    date: quote.date || quote.createdAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
    validUntil: quote.validUntil || new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
    value: quote.value || quote.totalAmount || 0,
    
    // Contact information
    contactPerson: quote.contactPerson || '',
    contactEmail: quote.contactEmail || '',
    contactPhone: quote.contactPhone || '',
    
    // Timestamps
    createdAt: quote.createdAt || new Date().toISOString(),
    updatedAt: quote.updatedAt || new Date().toISOString(),
    
    // Customer details
    customerName: quote.customer?.name || quote.customerName || '',
    
    // Ensure lineItems is always an array
    lineItems: Array.isArray(quote.lineItems) ? quote.lineItems : []
  };
  
  // Simplify all values to ensure they're frontend-safe
  return simplifyValue(baseQuote);
}

// Frequent items endpoint
router.get('/frequent-items', authenticateToken, getFrequentItems);

// Get all quotes
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching all quotes...');
    const quotes = await prisma.quote.findMany({
      include: {
        customer: true,
        lineItems: true
      }
    });
    
    // Format quotes for frontend compatibility
    const formattedQuotes = quotes.map(quote => prepareQuoteForFrontend(quote));
    
    console.log(`Found ${formattedQuotes.length} quotes`);
    
    // Return a consistent structure always
    res.json(formattedQuotes);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ message: 'Failed to fetch quotes' });
  }
});

// Get quote by ID
router.get('/:id', authenticateToken, getQuoteById);

// Create new quote
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('Creating quote:', req.body);
    
    const { customerId, title, description, items = [] } = req.body;
    
    // Validate required fields
    if (!customerId) {
      console.log('Missing customerId in request');
      return res.status(400).json({ message: 'Customer ID is required' });
    }
    
    // Create the quote with minimal fields
    const newQuote = await prisma.quote.create({
      data: {
        customerId,
        title: title || 'Untitled Quote',
        description: description || '',
        status: 'DRAFT',
        createdById: req.user.id
      }
    });
    
    console.log('Quote created successfully with ID:', newQuote.id);
    
    // Create line items if provided
    const lineItems = [];
    if (items && Array.isArray(items) && items.length > 0) {
      try {
        for (const item of items) {
          const createdItem = await prisma.quoteLineItem.create({
            data: {
              quoteId: newQuote.id,
              description: item.description || '',
              quantity: parseInt(item.quantity) || 1,
              unitPrice: parseFloat(item.unitPrice) || 0
            }
          });
          lineItems.push(createdItem);
        }
        console.log('Line items created successfully');
      } catch (lineItemError) {
        console.error('Error creating line items:', lineItemError);
      }
    }
    
    // Get the customer info
    const customer = await prisma.customer.findUnique({ 
      where: { id: customerId } 
    });
    
    // Format response for frontend
    const frontendCompatibleResponse = prepareQuoteForFrontend({
      ...newQuote,
      lineItems,
      customer
    });
    
    res.status(201).json(frontendCompatibleResponse);
  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({ 
      message: 'Failed to create quote', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update quote - Add this route for updating quotes
router.put('/:id', authenticateToken, updateQuote);

// Delete quote
router.delete('/:id', authenticateToken, deleteQuote);

// Clone quote
router.post('/:id/clone', authenticateToken, cloneQuote);

export default router;