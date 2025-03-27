import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Payment Milestones
export const createPaymentMilestone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { orderId, description, amount, dueDate } = req.body;

        const milestone = await prisma.paymentMilestone.create({
            data: {
                orderId,
                description,
                amount,
                dueDate: new Date(dueDate),
                status: 'PENDING'
            }
        });

        res.status(201).json(milestone);
    } catch (error) {
        next(error);
    }
};

// Regional Tax Settings
export const createRegionalTaxSetting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { country, region, standardVatRate, reducedVatRate, taxCode } = req.body;

        const taxSetting = await prisma.regionalTaxSetting.create({
            data: {
                country,
                region,
                standardVatRate,
                reducedVatRate,
                taxCode
            }
        });

        res.status(201).json(taxSetting);
    } catch (error) {
        next(error);
    }
};

// Currency Rates
export const createCurrencyRate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { fromCurrency, toCurrency, rate, validFrom, validTo } = req.body;

        const currencyRate = await prisma.currencyRate.create({
            data: {
                fromCurrency,
                toCurrency,
                rate,
                validFrom: new Date(validFrom),
                validTo: new Date(validTo)
            }
        });

        res.status(201).json(currencyRate);
    } catch (error) {
        next(error);
    }
};

// Get current exchange rate
export const getCurrentRate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { fromCurrency, toCurrency } = req.params;
        const now = new Date();

        const rate = await prisma.currencyRate.findFirst({
            where: {
                fromCurrency,
                toCurrency,
                validFrom: { lte: now },
                validTo: { gte: now }
            },
            orderBy: {
                validFrom: 'desc'
            }
        });

        if (!rate) {
            res.status(404).json({ error: 'Exchange rate not found' });
            return;
        }

        res.json(rate);
    } catch (error) {
        next(error);
    }
};

// Financial metrics API endpoint
export const getFinancialMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get the date range from the query parameters, default to current month
    const { 
      startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      endDate = new Date().toISOString(),
      compareWithPrevious = 'true'
    } = req.query;

    // Convert strings to Date objects
    const startDateTime = new Date(startDate as string);
    const endDateTime = new Date(endDate as string);
    
    // Get completed orders in the current period
    const currentPeriodOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDateTime,
          lte: endDateTime
        },
        status: 'COMPLETED'
      },
      include: {
        lineItems: true,
        job: {
          include: {
            jobCosts: true
          }
        }
      }
    });
    
    // Calculate revenue, costs, and profit
    let currentRevenue = 0;
    let currentCosts = 0;
    
    currentPeriodOrders.forEach(order => {
      // Calculate revenue from order line items
      order.lineItems.forEach(item => {
        currentRevenue += item.quantity * item.unitPrice;
      });
      
      // Calculate costs from job costs
      if (order.job) {
        order.job.jobCosts.forEach(cost => {
          currentCosts += cost.amount;
        });
      }
    });
    
    const currentProfit = currentRevenue - currentCosts;
    const currentProfitMargin = currentRevenue > 0 ? (currentProfit / currentRevenue) * 100 : 0;
    
    // Calculate monthly trends
    const monthlyTrends = await getMonthlyFinancialData();
    
    // Prepare response
    const response = {
      currentPeriod: {
        startDate: startDateTime,
        endDate: endDateTime,
        revenue: currentRevenue,
        costs: currentCosts,
        profit: currentProfit,
        profitMargin: currentProfitMargin,
        orderCount: currentPeriodOrders.length
      },
      previousPeriod: null,
      monthlyTrends
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting financial metrics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch financial metrics', 
      details: error.message 
    });
  }
};

// Helper function to get monthly financial data
const getMonthlyFinancialData = async () => {
  // Get the last 12 months of data
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 11);
  startDate.setDate(1);
  
  const monthlyData = [];
  
  // For each month, calculate financial metrics
  for (let i = 0; i < 12; i++) {
    const monthStart = new Date(startDate);
    monthStart.setMonth(monthStart.getMonth() + i);
    
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0); // Last day of month
    
    // Get orders for this month
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: monthStart,
          lte: monthEnd
        },
        status: 'COMPLETED'
      },
      include: {
        lineItems: true,
        job: {
          include: {
            jobCosts: true
          }
        }
      }
    });
    
    // Calculate metrics
    let revenue = 0;
    let costs = 0;
    
    orders.forEach(order => {
      order.lineItems.forEach(item => {
        revenue += item.quantity * item.unitPrice;
      });
      
      if (order.job) {
        order.job.jobCosts.forEach(cost => {
          costs += cost.amount;
        });
      }
    });
    
    const profit = revenue - costs;
    
    monthlyData.push({
      month: monthStart.toLocaleString('default', { month: 'short' }),
      year: monthStart.getFullYear(),
      revenue,
      costs,
      profit
    });
  }
  
  return monthlyData;
};