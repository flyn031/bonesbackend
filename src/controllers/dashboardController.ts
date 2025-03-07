import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CustomerHealthService } from '../services/customerHealthService';

const prisma = new PrismaClient();
const customerHealthService = new CustomerHealthService();

export const getDashboardData = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Fetching dashboard data...');
    const [activeOrders, totalSuppliers, totalCustomers, lowStock, monthlyRevenue] = await Promise.all([
      prisma.order.count({
        where: { 
          status: { 
            notIn: ['COMPLETED', 'CANCELLED', 'DELIVERED'] 
          } 
        }
      }),
      prisma.supplier.count(),
      prisma.customer.count(),
      prisma.material.count({
        where: {
          currentStockLevel: {
            lte: 10 // or whatever your low stock threshold is
          }
        }
      }),
      prisma.order.aggregate({
        where: {
          status: 'COMPLETED', // Only count completed orders
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lte: new Date() // Add upper bound to be safe
          }
        },
        _sum: {
          totalAmount: true
        }
      })
    ]);

    const dashboardData = {
      activeOrders,
      totalSuppliers,
      lowStock,
      monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
      totalCustomers
    };

    console.log('Dashboard data fetched:', dashboardData);
    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data', details: error.message });
  }
};

export const getOrderTrendsData = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Fetching order trends data...');
    
    // Expand the time range to ensure we have data
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: oneYearAgo
        }
      },
      select: {
        createdAt: true,
        totalAmount: true
      }
    });

    console.log('Total orders found:', orders.length);

    // Group orders by month with more robust month naming
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const monthlyTrends = orders.reduce((acc, order) => {
      const date = new Date(order.createdAt);
      const monthYear = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      
      if (!acc[monthYear]) {
        acc[monthYear] = { count: 0, totalAmount: 0 };
      }
      acc[monthYear].count += 1;
      acc[monthYear].totalAmount += order.totalAmount;
      return acc;
    }, {});

    // Convert to array and sort
    const monthlyTrendsArray = Object.entries(monthlyTrends)
      .map(([month, data]) => ({
        month,
        value: data.count, // Changed to match frontend expectation
        totalAmount: data.totalAmount
      }))
      .sort((a, b) => {
        // Custom sorting to ensure chronological order
        const monthOrder = monthNames;
        const [aMonth, aYear] = a.month.split(' ');
        const [bMonth, bYear] = b.month.split(' ');
        
        if (aYear !== bYear) {
          return parseInt(aYear) - parseInt(bYear);
        }
        return monthOrder.indexOf(aMonth) - monthOrder.indexOf(bMonth);
      });

    console.log('Processed Monthly Trends:', monthlyTrendsArray);

    // Ensure we always have some data
    if (monthlyTrendsArray.length === 0) {
      monthlyTrendsArray.push(
        { month: 'Jan', value: 0, totalAmount: 0 },
        { month: 'Feb', value: 0, totalAmount: 0 }
      );
    }

    res.json(monthlyTrendsArray);
  } catch (error) {
    console.error('Error fetching order trends:', error);
    res.status(500).json({ error: 'Failed to fetch order trends', details: error.message });
  }
};

export const getRecentActivityData = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Fetching recent orders...');
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { customer: true }
    });
    console.log('Recent orders fetched:', recentOrders);

    console.log('Fetching recent customers...');
    const recentCustomers = await prisma.customer.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    console.log('Recent customers fetched:', recentCustomers);

    // Format date to a user-friendly format
    const formatDate = (date: Date): string => {
      return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) + ' ' + new Date(date).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    // Transform orders into activity format expected by the dashboard
    const orderActivities = recentOrders.map(order => ({
      id: order.id,
      title: `Order: ${order.projectTitle || 'New Order'}`,
      time: formatDate(order.createdAt),
      status: `Status: ${order.status}`,
      description: `Customer: ${order.customer?.name || order.customerName || 'Unknown'}`
    }));

    // Transform customers into activity format
    const customerActivities = recentCustomers.map(customer => ({
      id: customer.id,
      title: `New Customer: ${customer.name}`,
      time: formatDate(customer.createdAt),
      status: 'Added',
      description: `Email: ${customer.email}`
    }));

    // Combine and sort by time (most recent first)
    // We need to get the original dates for sorting
    const combinedActivities = [
      ...recentOrders.map((order, index) => ({ 
        ...orderActivities[index], 
        originalDate: order.createdAt 
      })),
      ...recentCustomers.map((customer, index) => ({ 
        ...customerActivities[index], 
        originalDate: customer.createdAt 
      }))
    ]
      .sort((a, b) => new Date(b.originalDate).getTime() - new Date(a.originalDate).getTime())
      .slice(0, 5) // Take only the 5 most recent activities
      .map(({ originalDate, ...rest }) => rest); // Remove the originalDate field used for sorting

    res.json(combinedActivities);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity', details: error.message });
  }
};

export const getCustomerHealthDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Fetching customer health dashboard data...');
    
    const healthScores = await customerHealthService.calculateHealthScores();

    const dashboardData = {
      healthScores,
      lastUpdated: new Date(),
      totalCustomers: healthScores.length,
      churnRiskBreakdown: {
        low: healthScores.filter(score => score.churnRisk === 'Low').length,
        medium: healthScores.filter(score => score.churnRisk === 'Medium').length,
        high: healthScores.filter(score => score.churnRisk === 'High').length
      }
    };

    console.log('Customer health dashboard data fetched:', dashboardData);
    res.json(dashboardData);
  } catch (error) {
    console.error('Error generating customer health dashboard:', error);
    res.status(500).json({ error: 'Failed to generate customer health dashboard', details: error.message });
  }
};