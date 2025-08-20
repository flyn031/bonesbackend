import { PrismaClient } from '@prisma/client';
import { SmartQuoteItem, QuoteHealthScore, CustomerIntelligence } from '../types/smartQuote';

const prisma = new PrismaClient();

export class SmartQuoteService {
  
  async searchQuoteItems(filters: any): Promise<SmartQuoteItem[]> {
    try {
      const whereClause: any = {};
      
      if (filters.customerId) {
        whereClause.quote = { customerId: filters.customerId };
      }
      
      if (filters.searchTerm) {
        whereClause.description = {
          contains: filters.searchTerm,
          mode: 'insensitive'
        };
      }

      const quoteLineItems = await prisma.quoteLineItem.findMany({
        where: whereClause,
        include: {
          material: true,
          quote: { include: { customer: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      return quoteLineItems.map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        materialId: item.materialId || undefined,
        source: 'previous_quote',
        sourceQuoteId: item.quoteId,
        sourceQuoteNumber: item.quote.quoteNumber,
        confidence: 0.8,
        reason: `Used in ${item.quote.quoteNumber} for ${item.quote.customer.name}`,
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

    } catch (error) {
      console.error('Error searching quote items:', error);
      return [];
    }
  }

  async getFrequentItems(customerId?: string): Promise<SmartQuoteItem[]> {
    try {
      const whereClause: any = {};
      
      if (customerId) {
        whereClause.quote = { customerId: customerId };
      }

      const frequentItems = await prisma.quoteLineItem.groupBy({
        by: ['materialId', 'description'],
        where: whereClause,
        _count: { id: true },
        _avg: { unitPrice: true, quantity: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20
      });

      const itemsWithDetails = await Promise.all(
        frequentItems.map(async (item) => {
          let material = null;
          if (item.materialId) {
            material = await prisma.material.findUnique({
              where: { id: item.materialId }
            });
          }

          return {
            id: `freq_${item.materialId || 'custom'}_${Date.now()}`,
            description: item.description,
            quantity: Math.round(item._avg.quantity || 1),
            unitPrice: item._avg.unitPrice || 0,
            materialId: item.materialId || undefined,
            source: 'customer_history' as const,
            confidence: Math.min(0.9, 0.5 + (item._count.id * 0.1)),
            reason: `Used ${item._count.id} times previously`,
            material: material ? {
              id: material.id,
              code: material.code,
              name: material.name,
              description: material.description || '',
              unitPrice: material.unitPrice,
              unit: material.unit,
              category: material.category || undefined
            } : undefined
          };
        })
      );

      return itemsWithDetails;

    } catch (error) {
      console.error('Error getting frequent items:', error);
      return [];
    }
  }

  async getCustomerIntelligence(customerId: string): Promise<CustomerIntelligence> {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          quotes: {
            include: { lineItems: { include: { material: true } } }
          }
        }
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      const quotes = customer.quotes;
      const totalValue = quotes.reduce((sum, q) => sum + q.totalAmount, 0);
      const averageOrderValue = quotes.length > 0 ? totalValue / quotes.length : 0;

      const allItems = quotes.flatMap(q => q.lineItems);
      const categoryMap = new Map<string, number>();
      
      allItems.forEach(item => {
        if (item.material?.category) {
          const count = categoryMap.get(item.material.category) || 0;
          categoryMap.set(item.material.category, count + 1);
        }
      });

      const preferredCategories = Array.from(categoryMap.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category]) => category);

      return {
        customerId: customer.id,
        customerName: customer.name,
        industry: 'manufacturing', // You might want to add this field to Customer model
        totalQuotes: quotes.length,
        totalValue,
        lastQuoteDate: quotes.length > 0 ? quotes[0].createdAt : undefined,
        commonItems: [], // Could be populated with frequent items
        averageOrderValue,
        preferredCategories
      };

    } catch (error) {
      console.error('Error getting customer intelligence:', error);
      throw error;
    }
  }

  async analyzeQuoteHealth(quoteData: {
    items: any[];
    customerId?: string;
    totalValue: number;
  }): Promise<QuoteHealthScore> {
    try {
      let score = 100;
      const issues: any[] = [];
      const suggestions: any[] = [];

      if (quoteData.items.length === 0) {
        score -= 50;
        issues.push({
          type: 'completeness',
          severity: 'high',
          description: 'Quote has no items',
          suggestion: 'Add items to the quote'
        });
      }

      if (quoteData.totalValue < 100) {
        score -= 10;
        issues.push({
          type: 'pricing',
          severity: 'low',
          description: 'Low quote value',
          suggestion: 'Consider bundling additional items'
        });
      }

      return {
        score: Math.max(0, score),
        issues,
        suggestions,
        metrics: {
          itemCount: quoteData.items.length,
          totalValue: quoteData.totalValue,
          completeness: quoteData.items.length > 0 ? 0.8 : 0.2,
          customerFit: 0.7
        }
      };

    } catch (error) {
      console.error('Error analyzing quote health:', error);
      throw error;
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const categories = await prisma.material.findMany({
        where: { category: { not: null } },
        select: { category: true },
        distinct: ['category']
      });

      return categories
        .map(c => c.category)
        .filter((category): category is string => category !== null)
        .sort();

    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }
}
