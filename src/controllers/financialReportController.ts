import { Request, Response } from 'express';
import { FinancialReportingService } from '../services/financialReportingService';

const financialReportService = new FinancialReportingService();

export const getFinancialSummary = async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const summary = await financialReportService.getOverallFinancialSummary(startDate, endDate);
    res.json(summary);
  } catch (error) {
    console.error('Financial summary generation error:', error);
    res.status(500).json({ error: 'Failed to generate financial summary' });
  }
};

export const getSupplierFinancialPerformance = async (req: Request, res: Response) => {
  try {
    const performanceReport = await financialReportService.getSupplierFinancialPerformance();
    res.json(performanceReport);
  } catch (error) {
    console.error('Supplier financial performance error:', error);
    res.status(500).json({ error: 'Failed to generate supplier financial performance' });
  }
};