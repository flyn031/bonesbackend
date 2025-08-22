import { Request, Response } from 'express';
import { QuoteItemSearchService } from '../services/quoteItemSearchService';

export class QuoteItemSearchController {
  static async searchQuoteItems(req: Request, res: Response) {
    try {
      console.log('[QuoteItemSearchController] POST /quote-items/search');
      console.log('[QuoteItemSearchController] Body:', req.body);
      console.log('[QuoteItemSearchController] User ID:', req.user?.id);

      const {
        searchTerm,
        category,
        priceMin,
        priceMax,
        limit,
        offset
      } = req.body;

      // Get user ID from authenticated request
      const companyId = req.user?.id;
      if (!companyId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const result = await QuoteItemSearchService.searchQuoteItems({
        searchTerm,
        category,
        priceMin,
        priceMax,
        limit,
        offset,
        companyId
      });

      console.log(`[QuoteItemSearchController] Returning ${result.items.length} items`);

      res.json({
        success: true,
        data: result.items,
        total: result.total,
        hasMore: (offset || 0) + result.items.length < result.total
      });

    } catch (error) {
      console.error('[QuoteItemSearchController] Error in searchQuoteItems:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async getFrequentItems(req: Request, res: Response) {
    try {
      console.log('[QuoteItemSearchController] POST /quote-items/frequent');
      console.log('[QuoteItemSearchController] Body:', req.body);

      const { limit } = req.body;
      const companyId = req.user?.id;

      if (!companyId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const items = await QuoteItemSearchService.getFrequentItems(companyId, limit || 50);

      console.log(`[QuoteItemSearchController] Returning ${items.length} frequent items`);

      res.json({
        success: true,
        data: items,
        items: items // Alternative key for frontend compatibility
      });

    } catch (error) {
      console.error('[QuoteItemSearchController] Error in getFrequentItems:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}