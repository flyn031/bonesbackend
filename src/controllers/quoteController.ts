import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all quotes
export const getAllQuotes = async (req: Request, res: Response) => {
  try {
    const quotes = await prisma.quote.findMany({
      include: {
        customer: true,
        lineItems: true
      }
    });
    res.json(quotes);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ message: 'Failed to fetch quotes' });
  }
};

// Get quote by ID
export const getQuoteById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const quote = await prisma.quote.findUnique({
      where: { id: parseInt(id) },
      include: {
        customer: true,
        lineItems: true
      }
    });
    
    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }
    
    res.json(quote);
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ message: 'Failed to fetch quote' });
  }
};

// Create new quote
export const createQuote = async (req: Request, res: Response) => {
  try {
    const { customerId, title, description, lineItems, ...quoteData } = req.body;
    
    const newQuote = await prisma.quote.create({
      data: {
        customerId,
        title,
        description,
        status: 'DRAFT',
        createdBy: req.user.id,
        ...quoteData
      }
    });
    
    if (lineItems && lineItems.length > 0) {
      await Promise.all(
        lineItems.map((item: any) => 
          prisma.quoteLineItem.create({
            data: {
              quoteId: newQuote.id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              materialId: item.materialId
            }
          })
        )
      );
    }
    
    res.status(201).json(newQuote);
  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({ message: 'Failed to create quote' });
  }
};

// Update quote
export const updateQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customerId, title, description, lineItems, ...quoteData } = req.body;
    
    const updatedQuote = await prisma.quote.update({
      where: { id: parseInt(id) },
      data: {
        customerId,
        title,
        description,
        ...quoteData
      }
    });
    
    if (lineItems) {
      // Delete existing line items
      await prisma.quoteLineItem.deleteMany({
        where: { quoteId: parseInt(id) }
      });
      
      // Create new line items
      await Promise.all(
        lineItems.map((item: any) => 
          prisma.quoteLineItem.create({
            data: {
              quoteId: updatedQuote.id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              materialId: item.materialId
            }
          })
        )
      );
    }
    
    res.json(updatedQuote);
  } catch (error) {
    console.error('Error updating quote:', error);
    res.status(500).json({ message: 'Failed to update quote' });
  }
};

// Delete quote
export const deleteQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Delete related line items first
    await prisma.quoteLineItem.deleteMany({
      where: { quoteId: parseInt(id) }
    });
    
    // Delete the quote
    await prisma.quote.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: 'Quote deleted successfully' });
  } catch (error) {
    console.error('Error deleting quote:', error);
    res.status(500).json({ message: 'Failed to delete quote' });
  }
};

// Clone quote
export const cloneQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customerId, title, adjustments = {} } = req.body;
    
    // Find the original quote with all its line items
    const originalQuote = await prisma.quote.findUnique({
      where: { id: parseInt(id) },
      include: { 
        lineItems: true,
        customer: true 
      }
    });
    
    if (!originalQuote) {
      return res.status(404).json({ message: 'Quote not found' });
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
        createdBy: req.user.id,
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
    
    // Return the newly created quote with its line items
    const completeQuote = await prisma.quote.findUnique({
      where: { id: newQuote.id },
      include: {
        customer: true,
        lineItems: true
      }
    });
    
    res.status(201).json(completeQuote);
  } catch (error) {
    console.error('Error cloning quote:', error);
    res.status(500).json({ message: 'Failed to clone quote' });
  }
};