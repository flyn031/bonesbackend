import { prisma } from '../utils/prismaClient';

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

export const calculateCustomerHealth = async (): Promise<CustomerHealthSummary> => {
  try {
    // Get all customers with their orders
    const customers = await prisma.customer.findMany({
      include: {
        orders: {
          include: {
            lineItems: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    // Current date for calculations
    const now = new Date();
    
    // Calculate health scores for each customer
    const healthScores: CustomerHealthScore[] = customers.map(customer => {
      // Skip calculation if no orders
      if (customer.orders.length === 0) {
        return {
          customerId: customer.id,
          name: customer.name,
          overallScore: 0,
          churnRisk: 'High',
          potentialUpsell: false,
          insights: ['No orders placed yet'],
          metrics: {
            recency: 0,
            frequency: 0,
            monetary: 0,
            loyalty: 0,
            growth: 0
          },
          totalOrders: 0,
          totalSpent: 0
        };
      }

      // Calculate total spent
      const totalSpent = customer.orders.reduce((total, order) => {
        const orderTotal = order.lineItems.reduce((sum, item) => {
          return sum + (item.quantity * item.unitPrice);
        }, 0);
        return total + orderTotal;
      }, 0);

      // Calculate days since last order (recency)
      const lastOrderDate = new Date(customer.orders[0].createdAt);
      const daysSinceLastOrder = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate order frequency (average days between orders)
      let orderFrequency = 0;
      if (customer.orders.length > 1) {
        const firstOrderDate = new Date(customer.orders[customer.orders.length - 1].createdAt);
        const daysBetweenFirstAndLastOrder = Math.floor(
          (lastOrderDate.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        orderFrequency = customer.orders.length > 1 
          ? daysBetweenFirstAndLastOrder / (customer.orders.length - 1)
          : 0;
      }
      
      // Calculate average order value
      const averageOrderValue = totalSpent / customer.orders.length;
      
      // Calculate customer lifetime (days)
      const firstOrderDate = new Date(customer.orders[customer.orders.length - 1].createdAt);
      const customerLifetimeDays = Math.floor(
        (now.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Calculate metrics (normalized to 0-100 scale)
      // Recency: Higher score for more recent orders
      const recencyScore = Math.max(0, 100 - (daysSinceLastOrder / 3)); // Decrease score by 1/3 point per day
      
      // Frequency: Higher score for more frequent orders
      const frequencyScore = orderFrequency > 0 
        ? Math.min(100, 100 / (orderFrequency / 30)) // 30 days = 100 points, 60 days = 50 points
        : 0;
      
      // Monetary: Higher score for higher average order value
      const monetaryScore = Math.min(100, (averageOrderValue / 1000) * 100); // £1000 = 100 points
      
      // Loyalty: Higher score for longer customer relationship
      const loyaltyScore = Math.min(100, (customerLifetimeDays / 365) * 100); // 1 year = 100 points
      
      // Growth: Higher score for increasing order value over time
      let growthScore = 50; // Default to neutral
      if (customer.orders.length > 1) {
        const oldestOrderValue = customer.orders[customer.orders.length - 1].lineItems.reduce(
          (sum, item) => sum + (item.quantity * item.unitPrice), 0
        );
        const newestOrderValue = customer.orders[0].lineItems.reduce(
          (sum, item) => sum + (item.quantity * item.unitPrice), 0
        );
        
        if (newestOrderValue > oldestOrderValue) {
          const growthRate = (newestOrderValue - oldestOrderValue) / oldestOrderValue;
          growthScore = Math.min(100, 50 + (growthRate * 100));
        } else if (newestOrderValue < oldestOrderValue) {
          const declineRate = (oldestOrderValue - newestOrderValue) / oldestOrderValue;
          growthScore = Math.max(0, 50 - (declineRate * 100));
        }
      }
      
      // Calculate overall score (weighted average)
      const weights = {
        recency: 0.3,
        frequency: 0.2,
        monetary: 0.2,
        loyalty: 0.15,
        growth: 0.15
      };
      
      const overallScore = Math.round(
        recencyScore * weights.recency +
        frequencyScore * weights.frequency +
        monetaryScore * weights.monetary +
        loyaltyScore * weights.loyalty +
        growthScore * weights.growth
      );
      
      // Determine churn risk based on overall score
      let churnRisk: 'Low' | 'Medium' | 'High' = 'Medium';
      if (overallScore >= 70) {
        churnRisk = 'Low';
      } else if (overallScore <= 40) {
        churnRisk = 'High';
      }
      
      // Determine potential upsell opportunity
      const potentialUpsell = 
        churnRisk !== 'High' && 
        (growthScore > 60 || monetaryScore > 70);
      
      // Generate insights based on the metrics
      const insights: string[] = [];
      
      if (daysSinceLastOrder > 90) {
        insights.push(`No orders in the last ${Math.floor(daysSinceLastOrder / 30)} months`);
      }
      
      if (customer.orders.length > 5) {
        insights.push(`Loyal customer with ${customer.orders.length} orders`);
      }
      
      if (growthScore > 75) {
        insights.push('Increasing order values over time');
      } else if (growthScore < 25) {
        insights.push('Decreasing order values over time');
      }
      
      if (orderFrequency > 0 && orderFrequency < 30) {
        insights.push('Orders frequently (less than monthly interval)');
      }
      
      if (averageOrderValue > 1000) {
        insights.push('High-value customer');
      }
      
      if (churnRisk === 'High') {
        insights.push('At risk of churning');
      }
      
      if (potentialUpsell) {
        insights.push('Good candidate for upselling');
      }
      
      // Return the customer health score
      return {
        customerId: customer.id,
        name: customer.name,
        overallScore,
        churnRisk,
        potentialUpsell,
        insights,
        metrics: {
          recency: Math.round(recencyScore),
          frequency: Math.round(frequencyScore),
          monetary: Math.round(monetaryScore),
          loyalty: Math.round(loyaltyScore),
          growth: Math.round(growthScore)
        },
        lastOrderDate: customer.orders.length > 0 ? lastOrderDate.toISOString() : undefined,
        totalOrders: customer.orders.length,
        totalSpent
      };
    });
    
    // Calculate summary statistics
    const totalCustomers = customers.length;
    const churnRiskBreakdown = {
      low: healthScores.filter(c => c.churnRisk === 'Low').length,
      medium: healthScores.filter(c => c.churnRisk === 'Medium').length,
      high: healthScores.filter(c => c.churnRisk === 'High').length
    };
    const upsellOpportunities = healthScores.filter(c => c.potentialUpsell).length;
    
    // Sort health scores by overall score (descending)
    healthScores.sort((a, b) => b.overallScore - a.overallScore);
    
    return {
      healthScores,
      totalCustomers,
      churnRiskBreakdown,
      upsellOpportunities
    };
  } catch (error) {
    console.error('Error calculating customer health:', error);
    throw error;
  }
};