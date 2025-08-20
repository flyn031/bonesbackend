import { Request, Response } from 'express';
import { UserPayload } from '../types/express';
import { SmartQuoteService } from '../services/smartQuoteService';

interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

const smartQuoteService = new SmartQuoteService();

class QuoteItemSearchController {
  async searchQuoteItems(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const filters = {
        customerId: req.query.customerId as string,
        searchTerm: req.query.query as string,
        materialCategory: req.query.category as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        minValue: req.query.minValue ? parseFloat(req.query.minValue as string) : undefined,
        maxValue: req.query.maxValue ? parseFloat(req.query.maxValue as string) : undefined
      };

      const items = await smartQuoteService.searchQuoteItems(filters);
      
      res.json({ 
        success: true, 
        data: items,
        total: items.length,
        filters: filters
      });
    } catch (error) {
      console.error('Error searching quote items:', error);
      res.status(500).json({ 
        error: 'Failed to search quote items',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getQuoteItems(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { quoteId } = req.params;
      
      // Get items from a specific quote using Prisma
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const quoteItems = await prisma.quoteLineItem.findMany({
        where: { quoteId: quoteId },
        include: {
          material: true,
          quote: {
            include: { customer: true }
          }
        }
      });

      const formattedItems = quoteItems.map((item: any) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        materialId: item.materialId,
        source: 'quote_copy',
        sourceQuoteId: item.quoteId,
        sourceQuoteNumber: item.quote.quoteNumber,
        confidence: 1.0,
        reason: `From ${item.quote.quoteNumber}`,
        material: item.material ? {
          id: item.material.id,
          code: item.material.code,
          name: item.material.name,
          description: item.material.description || '',
          unitPrice: item.material.unitPrice,
          unit: item.material.unit,
          category: item.material.category || undefined
        } : undefined
      }));

      res.json({ 
        success: true, 
        data: formattedItems
      });
    } catch (error) {
      console.error('Error getting quote items:', error);
      res.status(500).json({ 
        error: 'Failed to get quote items',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getFrequentItems(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const customerId = req.query.customerId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      const items = await smartQuoteService.getFrequentItems(customerId);
      
      res.json({ 
        success: true, 
        data: items.slice(0, limit),
        total: items.length
      });
    } catch (error) {
      console.error('Error getting frequent items:', error);
      res.status(500).json({ 
        error: 'Failed to get frequent items',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getSimilarItems(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { itemId } = req.query;
      
      if (!itemId) {
        res.status(400).json({
          error: 'Item ID is required'
        });
        return;
      }

      // Find similar items based on description or category
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      // First get the reference item
      const referenceItem = await prisma.quoteLineItem.findUnique({
        where: { id: itemId as string },
        include: { material: true }
      });

      if (!referenceItem) {
        res.status(404).json({
          error: 'Reference item not found'
        });
        return;
      }

      // Find similar items by category or description keywords
      const similarItems = await prisma.quoteLineItem.findMany({
        where: {
          AND: [
            { id: { not: itemId as string } },
            {
              OR: [
                // Same material category
                referenceItem.material?.category ? {
                  material: { category: referenceItem.material.category }
                } : {},
                // Similar description (contains key words)
                {
                  description: {
                    contains: referenceItem.description.split(' ')[0], // First word similarity
                    mode: 'insensitive'
                  }
                }
              ]
            }
          ]
        },
        include: {
          material: true,
          quote: { include: { customer: true } }
        },
        take: 10,
        orderBy: { createdAt: 'desc' }
      });

      const formattedItems = similarItems.map((item: any) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        materialId: item.materialId,
        source: 'similar_item',
        sourceQuoteId: item.quoteId,
        sourceQuoteNumber: item.quote.quoteNumber,
        confidence: 0.7,
        reason: `Similar to ${referenceItem.description}`,
        material: item.material ? {
          id: item.material.id,
          code: item.material.code,
          name: item.material.name,
          description: item.material.description || '',
          unitPrice: item.material.unitPrice,
          unit: item.material.unit,
          category: item.material.category || undefined
        } : undefined
      }));

      res.json({ 
        success: true, 
        data: formattedItems
      });
    } catch (error) {
      console.error('Error getting similar items:', error);
      res.status(500).json({ 
        error: 'Failed to get similar items',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getSearchSuggestions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const query = req.query.q as string || '';
      
      if (query.length < 2) {
        res.json({ success: true, data: [] });
        return;
      }

      // Get search suggestions from item descriptions and material names
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const [itemSuggestions, materialSuggestions] = await Promise.all([
        // Suggestions from quote line items
        prisma.quoteLineItem.findMany({
          where: {
            description: {
              contains: query,
              mode: 'insensitive'
            }
          },
          select: { description: true },
          distinct: ['description'],
          take: 5
        }),
        // Suggestions from materials
        prisma.material.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } }
            ]
          },
          select: { name: true, description: true },
          take: 5
        })
      ]);

      const suggestions = [
        ...itemSuggestions.map((item: any) => ({
          text: item.description,
          type: 'item_description',
          source: 'quote_history'
        })),
        ...materialSuggestions.map((material: any) => ({
          text: material.name,
          type: 'material_name',
          source: 'inventory'
        }))
      ];

      // Remove duplicates and limit results
      const uniqueSuggestions = suggestions.filter((item, index, self) => 
        index === self.findIndex(t => t.text === item.text)
      ).slice(0, 8);

      res.json({ 
        success: true, 
        data: uniqueSuggestions
      });
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      res.status(500).json({ 
        error: 'Failed to get search suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getFilterOptions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const categories = await smartQuoteService.getCategories();
      
      // Get customers that have quotes
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const [customers, priceStats] = await Promise.all([
        prisma.customer.findMany({
          where: {
            quotes: {
              some: {}
            }
          },
          select: {
            id: true,
            name: true
          },
          take: 50,
          orderBy: { name: 'asc' }
        }),
        // Get price range from quote line items
        prisma.quoteLineItem.aggregate({
          _min: { unitPrice: true },
          _max: { unitPrice: true }
        })
      ]);

      res.json({
        success: true,
        data: {
          categories: ['all', ...categories],
          priceRange: { 
            min: priceStats._min.unitPrice || 0, 
            max: priceStats._max.unitPrice || 10000 
          },
          customers: customers.map((c: any) => ({ id: c.id, name: c.name })),
          dateRanges: [
            { label: 'Last 30 days', value: '30d' },
            { label: 'Last 3 months', value: '3m' },
            { label: 'Last 6 months', value: '6m' },
            { label: 'Last year', value: '1y' },
            { label: 'All time', value: 'all' }
          ]
        }
      });
    } catch (error) {
      console.error('Error getting filter options:', error);
      res.status(500).json({ 
        error: 'Failed to get filter options',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const quoteItemSearchController = new QuoteItemSearchController();