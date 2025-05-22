import { Prisma } from '@prisma/client'; // Import Prisma namespace for JsonValue type
// Use the actual exported prisma client instance
import prisma from '../utils/prismaClient'; // Corrected import path assuming prismaClient.ts is in ../utils

// --- Interfaces remain the same ---
export interface CustomerHealthScore {
  customerId: string;
  name: string;
  overallScore: number;
  churnRisk: 'Low' | 'Medium' | 'High';
  potentialUpsell: boolean;
  insights: string[];
  metrics: {
    recency: number;
    frequency: number;
    monetary: number;
    loyalty: number;
    growth: number;
  };
  lastOrderDate?: string;
  totalOrders: number;
  totalSpent: number;
}

export interface CustomerHealthSummary {
  healthScores: CustomerHealthScore[];
  totalCustomers: number;
  churnRiskBreakdown: {
    low: number;
    medium: number;
    high: number;
  };
  upsellOpportunities: number;
}

// Define an interface for the expected structure within the Order's items JSON
interface OrderItem {
    quantity: number;
    unitPrice: number;
    // Add other properties if they exist and are needed, e.g., description, materialId
    description?: string;
}

// Helper function to safely calculate total from items JSON
const calculateTotalFromItems = (itemsJson: Prisma.JsonValue | null | undefined): number => {
    if (!itemsJson || typeof itemsJson !== 'object' || !Array.isArray(itemsJson)) {
        // Handle cases where itemsJson is null, not an object, or not an array
        // console.warn('Invalid or empty items JSON found in order:', itemsJson);
        return 0;
    }

    // Type assertion: Treat itemsJson as an array of potential OrderItems
    const items = itemsJson as unknown[];

    // Fixed: Explicitly type the reducer parameters and return value as number
    return items.reduce<number>((sum: number, item: unknown) => {
        // Type guard to check if item has the required properties and types
        if (item && typeof item === 'object' &&
            'quantity' in item && typeof (item as any).quantity === 'number' &&
            'unitPrice' in item && typeof (item as any).unitPrice === 'number') {
            // Cast item to access properties safely
            const typedItem = item as OrderItem;
            return sum + (typedItem.quantity * typedItem.unitPrice);
        }
        // console.warn('Skipping invalid item in order items JSON:', item);
        return sum; // Skip invalid items
    }, 0);
};


export const calculateCustomerHealth = async (): Promise<CustomerHealthSummary> => {
  try {
    console.log('[CustomerHealth] Starting calculation...');
    // Get all customers with their orders.
    // REMOVED invalid include for lineItems on Order.
    const customers = await prisma.customer.findMany({
      include: {
        orders: {
          // No need to include anything further *within* order unless absolutely necessary
          // for other calculations AND it's a valid relation/field.
          // We will use the 'items' JSON field directly.
          select: { // Select only needed fields from Order to optimize
              id: true,
              createdAt: true,
              items: true, // Select the JSON field
              status: true // Potentially useful for health score
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
    console.log(`[CustomerHealth] Fetched ${customers.length} customers.`);

    const now = new Date();

    const healthScores: CustomerHealthScore[] = customers.map(customer => {
      //console.log(`[CustomerHealth] Processing customer: ${customer.name} (${customer.id})`);
      if (!customer.orders || customer.orders.length === 0) {
        //console.log(`[CustomerHealth] Customer ${customer.name} has no orders.`);
        return { /* ... default score for no orders ... */
          customerId: customer.id,
          name: customer.name,
          overallScore: 0,
          churnRisk: 'High',
          potentialUpsell: false,
          insights: ['No orders placed yet'],
          metrics: { recency: 0, frequency: 0, monetary: 0, loyalty: 0, growth: 0 },
          totalOrders: 0,
          totalSpent: 0
        };
      }

      // --- CORRECTED totalSpent calculation using helper function ---
      // Fixed: Explicitly type the reducer parameters and return value
      const totalSpent = customer.orders.reduce<number>((total: number, order) => {
          return total + calculateTotalFromItems(order.items);
      }, 0);
      //console.log(`[CustomerHealth] Customer ${customer.name}: Total Spent = ${totalSpent}`);


      // Recency calculation (remains the same)
      const lastOrderDate = new Date(customer.orders[0].createdAt);
      const daysSinceLastOrder = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));

      // Frequency calculation (remains the same)
      let orderFrequency = 0;
      if (customer.orders.length > 1) {
        const firstOrderDate = new Date(customer.orders[customer.orders.length - 1].createdAt);
        const daysBetweenFirstAndLastOrder = Math.floor((lastOrderDate.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24));
        orderFrequency = customer.orders.length > 1 ? Math.max(0, daysBetweenFirstAndLastOrder / (customer.orders.length - 1)) : 0; // Ensure frequency isn't negative
      }

      // Average order value calculation (remains the same conceptually)
      const averageOrderValue = customer.orders.length > 0 ? totalSpent / customer.orders.length : 0;

      // Customer lifetime calculation (remains the same)
      const firstOrderDate = new Date(customer.orders[customer.orders.length - 1].createdAt);
      const customerLifetimeDays = Math.floor((now.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24));

      // Metrics calculation (remain the same conceptually)
      const recencyScore = Math.max(0, 100 - (daysSinceLastOrder / 3));
      const frequencyScore = orderFrequency > 0 ? Math.min(100, 100 / (orderFrequency / 30)) : (customer.orders.length === 1 ? 25 : 0); // Give some score for single order
      const monetaryScore = Math.min(100, (averageOrderValue / 1000) * 100); // Adjust baseline (1000) as needed
      const loyaltyScore = Math.min(100, (customerLifetimeDays / 365) * 100); // 1 year = 100

      // --- CORRECTED growthScore calculation using helper function ---
      let growthScore = 50; // Default neutral
      if (customer.orders.length > 1) {
        const oldestOrder = customer.orders[customer.orders.length - 1];
        const newestOrder = customer.orders[0];
        // Use the helper function to get totals from the 'items' JSON field
        const oldestOrderValue = calculateTotalFromItems(oldestOrder.items);
        const newestOrderValue = calculateTotalFromItems(newestOrder.items);

        //console.log(`[CustomerHealth] Customer ${customer.name}: Oldest Order Value = ${oldestOrderValue}, Newest = ${newestOrderValue}`);

        // Avoid division by zero if oldest order value was 0
        if (oldestOrderValue > 0) {
          if (newestOrderValue > oldestOrderValue) {
            const growthRate = (newestOrderValue - oldestOrderValue) / oldestOrderValue;
            growthScore = Math.min(100, 50 + (growthRate * 50)); // Adjusted scaling
          } else if (newestOrderValue < oldestOrderValue) {
            const declineRate = (oldestOrderValue - newestOrderValue) / oldestOrderValue;
            growthScore = Math.max(0, 50 - (declineRate * 50)); // Adjusted scaling
          }
        } else if (newestOrderValue > 0) {
            growthScore = 75; // Growth from zero, assign a positive score
        }
        // else remains 50 if both are 0 or oldest is 0 and newest is 0
      }

      // Overall score calculation (remains the same)
      const weights = { recency: 0.3, frequency: 0.2, monetary: 0.2, loyalty: 0.15, growth: 0.15 };
      const overallScore = Math.round(
        recencyScore * weights.recency + frequencyScore * weights.frequency +
        monetaryScore * weights.monetary + loyaltyScore * weights.loyalty +
        growthScore * weights.growth
      );

      // Churn risk determination (remains the same)
      let churnRisk: 'Low' | 'Medium' | 'High' = 'Medium';
      if (overallScore >= 70) churnRisk = 'Low';
      else if (overallScore <= 40) churnRisk = 'High';

      // Upsell potential (remains the same)
      const potentialUpsell = churnRisk !== 'High' && (growthScore > 60 || monetaryScore > 70);

      // Insights generation (remains the same conceptually)
      const insights: string[] = [];
      if (daysSinceLastOrder > 90) insights.push(`Inactive: Last order >${Math.floor(daysSinceLastOrder / 30)} months ago`);
      if (customer.orders.length >= 5) insights.push(`Loyal (${customer.orders.length} orders)`); else if (customer.orders.length === 1) insights.push('New customer');
      if (growthScore > 75) insights.push('Spending trend: Increasing'); else if (growthScore < 30) insights.push('Spending trend: Decreasing');
      if (frequencyScore > 75) insights.push('High purchase frequency'); else if (frequencyScore < 25 && customer.orders.length > 1) insights.push('Low purchase frequency');
      if (monetaryScore > 75) insights.push('High average order value'); else if (monetaryScore < 25 && customer.orders.length > 0) insights.push('Low average order value');
      if (potentialUpsell) insights.push('Potential for upsell');
      if (churnRisk === 'High') insights.push('High churn risk'); else if (churnRisk === 'Low') insights.push('Low churn risk');
      if (insights.length === 0) insights.push('Standard customer profile'); // Default insight


      return { /* ... construct the CustomerHealthScore object ... */
        customerId: customer.id,
        name: customer.name,
        overallScore,
        churnRisk,
        potentialUpsell,
        insights: insights.slice(0, 3), // Limit insights shown
        metrics: {
          recency: Math.round(recencyScore),
          frequency: Math.round(frequencyScore),
          monetary: Math.round(monetaryScore),
          loyalty: Math.round(loyaltyScore),
          growth: Math.round(growthScore)
        },
        lastOrderDate: customer.orders.length > 0 ? lastOrderDate.toISOString() : undefined,
        totalOrders: customer.orders.length,
        totalSpent // Use calculated totalSpent
      };
    });
    console.log(`[CustomerHealth] Calculated scores for ${healthScores.length} customers.`);

    // Summary statistics calculation (remains the same)
    const totalCustomers = customers.length;
    const churnRiskBreakdown = {
      low: healthScores.filter(c => c.churnRisk === 'Low').length,
      medium: healthScores.filter(c => c.churnRisk === 'Medium').length,
      high: healthScores.filter(c => c.churnRisk === 'High').length
    };
    const upsellOpportunities = healthScores.filter(c => c.potentialUpsell).length;

    healthScores.sort((a, b) => b.overallScore - a.overallScore);
    console.log('[CustomerHealth] Calculation completed successfully.');

    return { healthScores, totalCustomers, churnRiskBreakdown, upsellOpportunities };

  } catch (error) {
    // Log the error more informatively before re-throwing
    console.error('Error calculating customer health:', error instanceof Error ? error.message : error);
    console.error(error instanceof Error ? error.stack : ''); // Log stack trace if available
    // Re-throw the original error so the controller can catch it
    throw error;
  }
};