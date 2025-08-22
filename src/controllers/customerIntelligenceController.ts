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
      
      const bundles = await smartQuoteService.getBundleRecommendations(customerId);
      
      res.json({ 
        success: true, 
        data: bundles
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
      // Handle both GET (query params) and POST (body) requests
      const customerId = req.query.customerId || req.body.customerId;
      const existingItems = req.query.existingItems || req.body.existingItems || [];
      
      // For now, return empty array - could implement logic later
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
      
      // Conveyor-specific templates for customer's business
      const templates = [
        {
          id: 'basic_conveyor_system',
          name: 'Basic Conveyor System',
          description: 'Standard conveyor setup with motor, belt, and control panel',
          category: 'Conveyor Systems',
          estimatedValue: 2080,
          industryType: 'Manufacturing',
          items: [
            { materialCode: 'SP003', quantity: 1, description: 'Standard 0.75kW 3-Phase Motor' },
            { materialCode: 'BC001', quantity: 1, description: 'Light Duty Flat Belt Conveyor' },
            { materialCode: 'EP001', quantity: 1, description: 'Electrical Control Panel' },
            { materialCode: 'RM001', quantity: 5, description: 'Rubber Conveyor Matting' }
          ]
        },
        {
          id: 'heavy_duty_material_handling',
          name: 'Heavy Duty Material Handling',
          description: 'Robust conveyor solution for heavy materials with safety systems',
          category: 'Material Handling',
          estimatedValue: 2890,
          industryType: 'Warehouse',
          items: [
            { materialCode: 'RC002', quantity: 2, description: 'Heavy Duty Roller Conveyor' },
            { materialCode: 'SP003', quantity: 2, description: 'Standard 0.75kW 3-Phase Motor' },
            { materialCode: 'SB001', quantity: 3, description: 'Safety Barrier System' },
            { materialCode: 'RM001', quantity: 10, description: 'Rubber Conveyor Matting' }
          ]
        },
        {
          id: 'conveyor_safety_package',
          name: 'Conveyor Safety & Control Package',
          description: 'Essential safety and control systems for conveyor installations',
          category: 'Safety & Controls',
          estimatedValue: 1810,
          industryType: 'Manufacturing',
          items: [
            { materialCode: 'EP001', quantity: 1, description: 'Electrical Control Panel' },
            { materialCode: 'SB001', quantity: 4, description: 'Safety Barrier System' },
            { materialCode: 'SP003', quantity: 1, description: 'Standard 0.75kW 3-Phase Motor' },
            { materialCode: 'RM001', quantity: 15, description: 'Rubber Conveyor Matting' }
          ]
        },
        {
          id: 'complete_conveyor_line',
          name: 'Complete Conveyor Production Line',
          description: 'Full conveyor system with multiple sections and comprehensive controls',
          category: 'Production Line',
          estimatedValue: 4235,
          industryType: 'Manufacturing',
          items: [
            { materialCode: 'BC001', quantity: 2, description: 'Light Duty Flat Belt Conveyor' },
            { materialCode: 'RC002', quantity: 1, description: 'Heavy Duty Roller Conveyor' },
            { materialCode: 'SP003', quantity: 3, description: 'Standard 0.75kW 3-Phase Motor' },
            { materialCode: 'EP001', quantity: 2, description: 'Electrical Control Panel' },
            { materialCode: 'SB001', quantity: 2, description: 'Safety Barrier System' },
            { materialCode: 'RM001', quantity: 20, description: 'Rubber Conveyor Matting' }
          ]
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