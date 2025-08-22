import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface QuoteItemSearchParams {
  searchTerm?: string;
  category?: string;
  priceMin?: number;
  priceMax?: number;
  limit?: number;
  offset?: number;
  companyId: string;
}

export interface QuoteItemSearchResult {
  id: string;
  description: string;
  unitPrice: number;
  quantity: number;
  category?: string;
  quotedToCustomer: string;
  customerId: string;
  lastQuoted: Date;
  timesQuoted: number;
  quoteId: string;
}

export class QuoteItemSearchService {
  static async searchQuoteItems(params: QuoteItemSearchParams): Promise<{
    items: QuoteItemSearchResult[];
    total: number;
  }> {
    const {
      searchTerm,
      category,
      priceMin,
      priceMax,
      limit = 50,
      offset = 0,
      companyId
    } = params;

    console.log('[QuoteItemSearchService] Searching with params:', params);

    try {
      // Build where clause using the correct schema
      const whereClause: any = {
        quote: {
          createdById: companyId  // Correct field name from schema
        }
      };

      if (searchTerm) {
        whereClause.description = {
          contains: searchTerm,
          mode: 'insensitive'
        };
      }

      if (priceMin !== undefined || priceMax !== undefined) {
        whereClause.unitPrice = {};
        if (priceMin !== undefined) whereClause.unitPrice.gte = priceMin;
        if (priceMax !== undefined) whereClause.unitPrice.lte = priceMax;
      }

      // Use the correct table name: quoteLineItem (from QuoteLineItem model)
      const total = await prisma.quoteLineItem.count({
        where: whereClause
      });

      const rawItems = await prisma.quoteLineItem.findMany({
        where: whereClause,
        include: {
          quote: {
            include: {
              customer: {
                select: {
                  name: true,
                  id: true
                }
              }
            }
          },
          material: {
            select: {
              name: true,
              category: true
            }
          }
        },
        orderBy: [
          { createdAt: 'desc' }
        ],
        take: limit,
        skip: offset
      });

      // Process results to match expected format
      const items: QuoteItemSearchResult[] = rawItems.map(item => ({
        id: item.id,
        description: item.description,
        unitPrice: parseFloat(item.unitPrice.toString()) || 0,
        quantity: parseFloat(item.quantity.toString()) || 1,
        category: item.material?.category || undefined,
        quotedToCustomer: item.quote?.customer?.name || 'Unknown Customer',
        customerId: item.quote?.customer?.id || '',
        lastQuoted: item.createdAt || new Date(),
        timesQuoted: 1, // TODO: Calculate actual usage count with aggregation
        quoteId: item.quoteId || ''
      }));

      console.log(`[QuoteItemSearchService] Found ${items.length} items (total: ${total})`);

      return {
        items,
        total
      };

    } catch (error) {
      console.error('[QuoteItemSearchService] Error searching quote items:', error);
      throw error;
    }
  }

  static async getFrequentItems(companyId: string, limit: number = 50): Promise<QuoteItemSearchResult[]> {
    console.log('[QuoteItemSearchService] Getting frequent items for company:', companyId);

    try {
      // Query the actual QuoteLineItem table with correct relationships
      const frequentItems = await prisma.quoteLineItem.findMany({
        where: {
          quote: {
            createdById: companyId  // Correct field name
          }
        },
        include: {
          quote: {
            include: {
              customer: {
                select: {
                  name: true,
                  id: true
                }
              }
            }
          },
          material: {
            select: {
              name: true,
              category: true
            }
          }
        },
        orderBy: [
          { createdAt: 'desc' }
        ],
        take: limit
      });

      return frequentItems.map(item => ({
        id: item.id,
        description: item.description,
        unitPrice: parseFloat(item.unitPrice.toString()) || 0,
        quantity: parseFloat(item.quantity.toString()) || 1,
        category: item.material?.category || undefined,
        quotedToCustomer: item.quote?.customer?.name || 'Unknown Customer',
        customerId: item.quote?.customer?.id || '',
        lastQuoted: item.createdAt || new Date(),
        timesQuoted: 1, // TODO: Calculate actual usage count
        quoteId: item.quoteId || ''
      }));

    } catch (error) {
      console.error('[QuoteItemSearchService] Error getting frequent items:', error);
      throw error;
    }
  }
}