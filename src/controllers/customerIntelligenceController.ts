import { Request, Response } from 'express';
import { UserPayload } from '../types/express';
import { SmartQuoteService } from '../services/smartQuoteService';

interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

const smartQuoteService = new SmartQuoteService();

class CustomerIntelligenceController {
  async getCustomerIntelligence(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      
      const intelligence = await smartQuoteService.getCustomerIntelligence(customerId);
      
      res.json({
        success: true,
        data: intelligence
      });
    } catch (error) {
      console.error('Error getting customer intelligence:', error);
      res.status(500).json({ 
        error: 'Failed to get customer intelligence',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getCustomerSuggestions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      
      const suggestions = await smartQuoteService.getFrequentItems(customerId);
      
      res.json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      console.error('Error getting customer suggestions:', error);
      res.status(500).json({ 
        error: 'Failed to get customer suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getBundleRecommendations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      
      // For now, return empty array - bundle logic can be implemented later
      // Could analyze frequently bought together items from customer's quote history
      res.json({ 
        success: true, 
        data: [],
        message: 'Bundle recommendations feature coming soon'
      });
    } catch (error) {
      console.error('Error getting bundle recommendations:', error);
      res.status(500).json({ 
        error: 'Failed to get bundle recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getDynamicBundles(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { existingItems, customerId } = req.body;
      
      // Could implement logic to suggest complementary items based on existing items
      // For now, return empty array
      res.json({ 
        success: true, 
        data: [],
        message: 'Dynamic bundle suggestions feature coming soon'
      });
    } catch (error) {
      console.error('Error getting dynamic bundles:', error);
      res.status(500).json({ 
        error: 'Failed to get dynamic bundles',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getQuickTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const industryType = req.query.industry as string;
      
      // Basic templates - could be expanded to database-stored templates
      const templates = [
        {
          id: 'office_basic',
          name: 'Basic Office Setup',
          description: 'Essential items for a small office',
          category: 'Office',
          estimatedValue: 1500,
          industryType: 'Office',
          items: []
        },
        {
          id: 'warehouse_starter',
          name: 'Warehouse Starter Kit', 
          description: 'Basic warehouse equipment and supplies',
          category: 'Warehouse',
          estimatedValue: 5000,
          industryType: 'Logistics',
          items: []
        },
        {
          id: 'safety_basic',
          name: 'Safety Equipment Package',
          description: 'Essential safety equipment for manufacturing',
          category: 'Safety',
          estimatedValue: 2500,
          industryType: 'Manufacturing',
          items: []
        }
      ];

      const filteredTemplates = industryType 
        ? templates.filter(t => !t.industryType || t.industryType.toLowerCase() === industryType.toLowerCase())
        : templates;

      res.json({ 
        success: true, 
        data: filteredTemplates
      });
    } catch (error) {
      console.error('Error getting quick templates:', error);
      res.status(500).json({ 
        error: 'Failed to get quick templates',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async analyzeQuoteHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const quoteData = req.body;
      
      const healthAnalysis = await smartQuoteService.analyzeQuoteHealth(quoteData);
      
      res.json({
        success: true,
        data: {
          score: healthAnalysis.score,
          factors: {
            margin: 80, // Could be calculated from actual profit margins
            pricing: 90, // Could be based on competitive pricing analysis
            completeness: healthAnalysis.metrics.completeness * 100
          },
          recommendations: healthAnalysis.suggestions.map(s => s.description),
          issues: healthAnalysis.issues,
          metrics: healthAnalysis.metrics,
          analyzedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error analyzing quote health:', error);
      res.status(500).json({ 
        error: 'Failed to analyze quote health',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getComprehensiveInsights(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      
      const [customerProfile, itemSuggestions] = await Promise.all([
        smartQuoteService.getCustomerIntelligence(customerId),
        smartQuoteService.getFrequentItems(customerId)
      ]);

      res.json({
        success: true,
        data: {
          customerProfile,
          itemSuggestions,
          bundleRecommendations: [], // To be implemented
          quickTemplates: [], // Could be filtered by customer industry
          summary: {
            totalSuggestions: itemSuggestions.length,
            totalBundles: 0,
            averageConfidence: itemSuggestions.reduce((sum, item) => sum + (item.confidence || 0), 0) / itemSuggestions.length || 0,
            riskLevel: "low", // Could be calculated based on customer payment history
            conversionRate: 75 // Could be calculated from quote->order conversion rate
          }
        }
      });
    } catch (error) {
      console.error('Error getting comprehensive insights:', error);
      res.status(500).json({ 
        error: 'Failed to get comprehensive insights',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const customerIntelligenceController = new CustomerIntelligenceController();