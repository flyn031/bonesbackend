import { PrismaClient, OrderStatus, SupplierStatus } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboardStats = async () => {
  try {
    console.log('[Dashboard] Fetching dashboard stats');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [activeOrders, totalSuppliers, lowStockMaterials, monthlyRevenue, totalCustomers] = await Promise.all([
      // Get active orders count
      prisma.order.count({
        where: {
          status: {
            in: [
              OrderStatus.DRAFT,
              OrderStatus.PENDING_APPROVAL,
              OrderStatus.APPROVED,
              OrderStatus.IN_PRODUCTION,
              OrderStatus.ON_HOLD,
              OrderStatus.READY_FOR_DELIVERY
            ]
          }
        }
      }),

      // Get total suppliers count
      prisma.supplier.count({
        where: {
          status: SupplierStatus.ACTIVE
        }
      }),

      // Get low stock materials count
      prisma.material.count({
        where: {
          currentStockLevel: {
            lte: prisma.material.fields.minStockLevel
          }
        }
      }),

      // Calculate monthly revenue from completed orders
      prisma.order.aggregate({
        where: {
          status: OrderStatus.COMPLETED,
          updatedAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        _sum: {
          totalAmount: true
        }
      }),

      // Get total customers count
      prisma.customer.count()
    ]);

    const stats = {
      activeOrders,
      totalSuppliers,
      lowStock: lowStockMaterials,
      monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
      totalCustomers
    };

    console.log('[Dashboard] Stats fetched successfully:', stats);
    return stats;
  } catch (error) {
    console.error('[Dashboard] Error in getDashboardStats:', error);
    throw error;
  }
};

export const getOrderTrends = async () => {
  try {
    console.log('[Dashboard] Fetching order trends');
    // Get last 6 months of data
    const trends = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const orderCount = await prisma.order.count({
        where: {
          status: OrderStatus.COMPLETED,
          updatedAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      });

      trends.push({
        month: date.toLocaleString('default', { month: 'short' }),
        value: orderCount
      });
    }

    console.log('[Dashboard] Trends fetched successfully:', trends);
    return trends;
  } catch (error) {
    console.error('[Dashboard] Error in getOrderTrends:', error);
    throw error;
  }
};

export const getRecentActivity = async () => {
  try {
    console.log('[Dashboard] Fetching recent activity');
    // Fetch recent orders with their status changes
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        id: true,
        projectTitle: true,
        status: true,
        updatedAt: true,
        customer: {
          select: {
            name: true
          }
        }
      }
    });

    const activity = recentOrders.map(order => ({
      id: order.id,
      title: `Order: ${order.projectTitle}`,
      time: order.updatedAt.toISOString(),
      status: `Status updated to ${order.status}`,
      description: `Customer: ${order.customer?.name || 'N/A'}`
    }));

    console.log('[Dashboard] Activity fetched successfully:', activity);
    return activity;
  } catch (error) {
    console.error('[Dashboard] Error in getRecentActivity:', error);
    throw error;
  }
};