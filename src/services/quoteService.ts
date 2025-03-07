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

export const getQuoteById = async (id: number) => {
  return prisma.quote.findUnique({
    where: { id },
    include: {
      customer: true,
      lineItems: true
    }
  });
};

export const cloneQuote = async (quoteId: number, customerId?: number, title?: string, adjustments: any = {}) => {
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
      createdBy: originalQuote.createdBy, // This should be updated in the controller
    }
  });
  
  // Clone all line items from the original quote
  const lineItemPromises = originalQuote.lineItems.map(item => {
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
  
  // Return the complete quote with its related data
  return prisma.quote.findUnique({
    where: { id: newQuote.id },
    include: {
      customer: true,
      lineItems: true
    }
  });
};