// backend/src/services/dashboardService.ts

import { PrismaClient, OrderStatus, SupplierStatus } from '@prisma/client';
// Assuming prismaClient.ts exports a singleton instance
import prisma from '../utils/prismaClient'; // Make sure this path is correct

// Define interfaces for better type safety
interface OrderTrend {
  month: string;
  value: number;
  totalAmount: number;
}

interface DashboardStats {
  activeOrders: number;
  totalSuppliers: number;
  lowStock: number;
  monthlyRevenue: number;
  totalCustomers: number;
}

interface OrderTrendKPI {
  currentPeriodValue: number;
  previousPeriodValue: number;
  percentageChange: number | null;
}

interface RecentActivityData {
  recentOrders: Array<{
    id: string;
    projectTitle: string;
    status: string;
    updatedAt: Date;
    createdAt: Date;
    customerName: string;
  }>;
  recentCustomers: Array<{
    id: string;
    name: string;
    email: string | null; // Fix: Prisma schema has email as nullable
    createdAt: Date;
  }>;
}

// --- Function to get main dashboard stats ---
export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    console.log('[Dashboard] Fetching dashboard stats');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Fetch core stats in parallel
    const [activeOrders, totalSuppliers, monthlyRevenue, totalCustomers] = await Promise.all([
      // ✅ FIXED: Use actual OrderStatus values from your database
      prisma.order.count({
        where: {
          status: {
            in: [
              OrderStatus.IN_PRODUCTION, 
              OrderStatus.ON_HOLD, 
              OrderStatus.READY_FOR_DELIVERY
              // These represent "active" orders in progress
            ]
          }
        }
      }),
      prisma.supplier.count({
        where: { status: SupplierStatus.ACTIVE } // Verified against schema
      }),
      // ✅ FIXED: Use COMPLETED for revenue calculation (final status)
      prisma.order.aggregate({
        where: {
          status: OrderStatus.COMPLETED, // ✅ FIXED: Use COMPLETED for revenue
          createdAt: { gte: startOfMonth, lte: endOfMonth } // Verified field 'createdAt'
        },
        _sum: { totalAmount: true } // Verified field 'totalAmount' is Float
      }),
      prisma.customer.count()
    ]);

    // --- Corrected Low Stock Calculation (based on schema) ---
    const potentiallyLowStockMaterials = await prisma.material.findMany({
      select: {
        currentStock: true, // CORRECTED: Was currentStockLevel
        minStock: true,     // CORRECTED: Was minStockLevel
        // You might want to select id and name for logging/debugging if needed
        // id: true,
        // name: true,
      }
    });

    // Filter in application code for accurate comparison
    const lowStockCount = potentiallyLowStockMaterials.filter(
      material => (material.currentStock !== null && material.minStock !== null && material.currentStock <= material.minStock)
    ).length;
    // --- End Corrected Low Stock Calculation ---

    const stats: DashboardStats = {
      activeOrders,
      totalSuppliers,
      lowStock: lowStockCount, // Use the correctly calculated count
      monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
      totalCustomers
    };

    console.log('[Dashboard] Stats fetched successfully:', stats);
    return stats;

  } catch (error) {
    console.error('[Dashboard] Error in getDashboardStats:', error);
    throw error; // Re-throw for controller
  }
};

// --- Function to get data for the monthly trends chart ---
export const getOrderTrends = async (): Promise<OrderTrend[]> => {
    try {
        console.log('[Dashboard] Fetching order trends for chart');
        // ✅ FIXED: Properly type the trends array to prevent "never" type inference
        const trends: OrderTrend[] = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

            const monthlyData = await prisma.order.aggregate({
                where: {
                    createdAt: { gte: startOfMonth, lte: endOfMonth },
                    // Optional: Filter by status if needed
                },
                _sum: { totalAmount: true },
                _count: { id: true }
            });

            trends.push({
                month: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
                value: monthlyData._count.id || 0, // 'value' used by original chart for count
                totalAmount: monthlyData._sum.totalAmount || 0
            });
        }

        console.log('[Dashboard] Chart Trends fetched successfully:', trends);
        return trends;
    } catch (error) {
        console.error('[Dashboard] Error in getOrderTrends:', error);
        throw error;
    }
};

// --- Function to get data for the new KPI Card ---
export const getOrderTrendKPI = async (): Promise<OrderTrendKPI> => {
  try {
    console.log('[Dashboard] Fetching order trend KPI data');
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDayOfMonth = now.getDate();

    // Current Period (Month-to-Date)
    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    const endOfCurrentPeriod = now;

    const currentPeriodData = await prisma.order.aggregate({
      where: {
        createdAt: { gte: startOfCurrentMonth, lte: endOfCurrentPeriod },
        // ✅ FIXED: Include all revenue-generating orders (all statuses represent value)
        // Since all your OrderStatus values represent orders with value, include all
      },
      _sum: { totalAmount: true },
    });
    const currentPeriodValue = currentPeriodData._sum.totalAmount || 0;

    // Previous Period (Same Day Last Month)
    const previousMonthDate = new Date(now);
    previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
    const previousMonthYear = previousMonthDate.getFullYear();
    const previousMonth = previousMonthDate.getMonth();

    const startOfPreviousMonth = new Date(previousMonthYear, previousMonth, 1);
    const endOfPreviousPeriod = new Date(previousMonthYear, previousMonth, currentDayOfMonth, 23, 59, 59, 999);
    const lastDayOfPreviousMonth = new Date(currentYear, currentMonth, 0).getDate();
    if (endOfPreviousPeriod.getMonth() !== previousMonth) {
         endOfPreviousPeriod.setDate(lastDayOfPreviousMonth);
         endOfPreviousPeriod.setHours(23, 59, 59, 999);
    }

    const previousPeriodData = await prisma.order.aggregate({
      where: {
        createdAt: { gte: startOfPreviousMonth, lte: endOfPreviousPeriod },
        // ✅ FIXED: Include all revenue-generating orders
      },
      _sum: { totalAmount: true },
    });
    const previousPeriodValue = previousPeriodData._sum.totalAmount || 0;

    // Calculate Percentage Change
    let percentageChange: number | null = null;
    if (previousPeriodValue !== 0) {
      percentageChange = ((currentPeriodValue - previousPeriodValue) / previousPeriodValue) * 100;
    } else if (currentPeriodValue > 0) {
      percentageChange = 100.0; // Indicate infinite growth from zero
    } // else remains null if both are 0

    const result: OrderTrendKPI = { currentPeriodValue, previousPeriodValue, percentageChange };
    console.log('[Dashboard] KPI data fetched successfully:', result);
    return result;

  } catch (error) {
    console.error('[Dashboard] Error in getOrderTrendKPI:', error);
    throw error;
  }
};

// --- Function to get raw data for Recent Activity feed ---
export const getRecentActivity = async (): Promise<RecentActivityData> => {
  try {
    console.log('[Dashboard] Fetching recent activity data');
    // Fetch recent orders
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' }, // Use updatedAt for "activity"
      select: {
        id: true, projectTitle: true, status: true, updatedAt: true, createdAt: true,
        customerName: true, // Use direct field from schema
        // Include customer relation if needed by formatter
        // customer: { select: { name: true } }
      }
    });

     // Fetch recent customers
     const recentCustomers = await prisma.customer.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, createdAt: true } // Verified fields
    });

    console.log('[Dashboard] Raw activity data fetched successfully');
    // Return raw data for the controller to format
    return { recentOrders, recentCustomers };

  } catch (error) {
    console.error('[Dashboard] Error in getRecentActivity:', error);
    throw error;
  }
};