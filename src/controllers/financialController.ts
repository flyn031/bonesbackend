import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Add type definition for items stored in Order.items JSON
interface OrderItem {
    quantity: number;
    unitPrice: number;
    // Add other properties present in your items JSON if needed for calculations
    description?: string;
    materialId?: string;
}


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
      compareWithPrevious = 'true' // This param isn't used currently, add logic if needed
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
        job: {
          include: {
            // jobCosts: true, // <-- FIX: Use the correct relation name 'costs'
            costs: true
          }
        }
        // Include customer if needed: customer: true
      }
    });

    // Calculate revenue, costs, and profit
    let currentRevenue = 0;
    let currentCosts = 0;

    currentPeriodOrders.forEach(order => {
      // Parse order.items JSON and calculate revenue
      let orderItems: OrderItem[] = [];
      if (order.items && typeof order.items === 'object' && !Array.isArray(order.items)) {
         console.warn(`Order ${order.id} items is an object, expected array or stringified array. Skipping item processing.`);
      } else if (Array.isArray(order.items)) {
         orderItems = order.items as unknown as OrderItem[]; // Fixed: Cast to unknown first
      } else if (typeof order.items === 'string') {
         // If Prisma returns it as a stringified JSON
         try {
             orderItems = JSON.parse(order.items);
             if (!Array.isArray(orderItems)) { // Validate parsing result
                console.warn(`Parsed items for order ${order.id} is not an array. Skipping item processing.`);
                orderItems = [];
             }
         } catch (e) {
             console.error(`Failed to parse items JSON for order ${order.id}:`, e);
             orderItems = []; // Ensure it's an empty array on error
         }
      } else {
         console.log(`Order ${order.id} has no items or items field is null/unexpected type.`);
      }

      // Now iterate over the parsed items
      orderItems.forEach(item => {
         const quantity = Number(item.quantity) || 0; // Ensure numbers, default to 0
         const unitPrice = Number(item.unitPrice) || 0; // Ensure numbers, default to 0
         if (!isNaN(quantity) && !isNaN(unitPrice)) {
            currentRevenue += quantity * unitPrice;
         } else {
            console.warn(`Invalid quantity/price in items for order ${order.id}:`, item);
         }
      });

      // Calculate costs from job costs (using the CORRECT relation name 'costs')
      if (order.job && order.job.costs) { // Check if job and costs exist
        order.job.costs.forEach(cost => { // <-- FIX: Use order.job.costs
          currentCosts += cost.amount; // Assuming amount is always a number
        });
      }
    });

    const currentProfit = currentRevenue - currentCosts;
    // Handle division by zero
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
      previousPeriod: null, // Add logic for previous period calculation if needed
      monthlyTrends
    };

    res.json(response);
  } catch (error: any) { // Ensure error is typed
    console.error('Error getting financial metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch financial metrics',
      details: error.message // Provide error message
    });
  }
};

// Helper function to get monthly financial data
const getMonthlyFinancialData = async () => {
  // Get the last 12 months of data
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 11); // Go back 11 months (total 12 including current)
  startDate.setDate(1); // Start from the 1st of that month
  startDate.setHours(0, 0, 0, 0); // Set to start of the day

  const monthlyData = [];

  // For each of the last 12 months
  for (let i = 0; i < 12; i++) {
    const monthStart = new Date(startDate);
    monthStart.setMonth(startDate.getMonth() + i); // Move to the target month

    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthStart.getMonth() + 1); // Go to the start of the *next* month
    monthEnd.setSeconds(monthEnd.getSeconds() - 1); // End of the target month

    // Get orders completed within this specific month
    const orders = await prisma.order.findMany({
      where: {
        // Use updatedAt or a specific completion date field if more accurate than createdAt
        createdAt: { // Or filter by a 'completedAt' date if available
          gte: monthStart,
          lte: monthEnd // Use lte (less than or equal to) end of month
        },
        status: 'COMPLETED'
      },
      include: {
        job: {
          include: {
            // jobCosts: true // <-- FIX: Use the correct relation name 'costs'
            costs: true
          }
        }
      }
    });

    // Calculate metrics for this month
    let revenue = 0;
    let costs = 0;

    orders.forEach(order => {
      // Parse order.items JSON and calculate revenue
       let orderItems: OrderItem[] = [];
       if (order.items && typeof order.items === 'object' && !Array.isArray(order.items)) {
          console.warn(`[Monthly] Order ${order.id} items is an object, expected array or stringified array. Skipping item processing.`);
       } else if (Array.isArray(order.items)) {
           orderItems = order.items as unknown as OrderItem[]; // Fixed: Cast to unknown first
       } else if (typeof order.items === 'string') {
           try {
               orderItems = JSON.parse(order.items);
               if (!Array.isArray(orderItems)) {
                  console.warn(`[Monthly] Parsed items for order ${order.id} is not an array. Skipping item processing.`);
                  orderItems = [];
               }
           } catch (e) {
               console.error(`[Monthly] Failed to parse items JSON for order ${order.id}:`, e);
               orderItems = [];
           }
        } else {
            // console.log(`[Monthly] Order ${order.id} has no items or items field is null/unexpected type.`);
        }

       // Now iterate over the parsed items
       orderItems.forEach(item => {
           const quantity = Number(item.quantity) || 0;
           const unitPrice = Number(item.unitPrice) || 0;
           if (!isNaN(quantity) && !isNaN(unitPrice)) {
               revenue += quantity * unitPrice;
           } else {
               console.warn(`[Monthly] Invalid quantity/price in items for order ${order.id}:`, item);
           }
       });

      // Calculate costs from job costs (using the CORRECT relation name 'costs')
      if (order.job && order.job.costs) { // Check if job and costs exist
        order.job.costs.forEach(cost => { // <-- FIX: Use order.job.costs
          costs += cost.amount;
        });
      }
    });

    const profit = revenue - costs;

    monthlyData.push({
      month: monthStart.toLocaleString('default', { month: 'short' }), // e.g., "Mar"
      year: monthStart.getFullYear(),
      revenue,
      costs,
      profit
    });
  }

  return monthlyData;
};