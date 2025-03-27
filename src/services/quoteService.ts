import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getQuotes = async () => {
  return prisma.quote.findMany({
    include: {
      customer: true,
      lineItems: true
    }
  });
};

export const getQuoteById = async (id: string) => {
  return prisma.quote.findUnique({
    where: { id },
    include: {
      customer: true,
      lineItems: true
    }
  });
};

export const cloneQuote = async (quoteId: string, customerId?: string, title?: string, adjustments: any = {}) => {
  // Find the original quote with all its line items
  const originalQuote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { 
      lineItems: true,
      customer: true 
    }
  });
  
  if (!originalQuote) {
    throw new Error('Quote not found');
  }
  
  // Create a new quote based on the original one
  const newQuote = await prisma.quote.create({
    data: {
      customerId: customerId || originalQuote.customerId,
      title: title || `${originalQuote.title} (Copy)`,
      description: originalQuote.description,
      totalAmount: originalQuote.totalAmount,
      status: 'DRAFT', // Always start as draft
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      createdById: originalQuote.createdById, // Changed from createdBy to createdById
    }
  });
  
  // Clone all line items from the original quote
  // First need to check if lineItems exists and is an array
  const lineItems = originalQuote.lineItems || [];
  
  if (Array.isArray(lineItems)) {
    const lineItemPromises = lineItems.map(item => {
      return prisma.quoteLineItem.create({
        data: {
          quoteId: newQuote.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          materialId: item.materialId,
          // Apply any adjustments if specified
          ...(adjustments[item.id] || {})
        }
      });
    });
    
    await Promise.all(lineItemPromises);
  }
  
  // Return the complete quote with its related data
  return prisma.quote.findUnique({
    where: { id: newQuote.id },
    include: {
      customer: true,
      lineItems: true
    }
  });
};

// Add these interfaces if you don't already have similar ones
interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total?: number;
}

interface QuoteTotals {
  subtotal: number;
  vat: number;
  total: number;
}

export const calculateQuoteTotals = (items: QuoteItem[]): QuoteTotals => {
  if (!items || items.length === 0) {
    return { subtotal: 0, vat: 0, total: 0 };
  }
  
  const subtotal = items.reduce((sum, item) => {
    // Use the provided total if available, otherwise calculate it
    const itemTotal = item.total !== undefined ? 
      item.total : 
      (item.quantity * item.unitPrice);
    return sum + itemTotal;
  }, 0);
  
  const vatRate = 0.2; // 20% VAT
  const vat = subtotal * vatRate;
  const total = subtotal + vat;
  
  return {
    subtotal,
    vat,
    total
  };
};