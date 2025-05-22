// backend/src/controllers/dashboardController.ts

import { Request, Response } from 'express';
import prisma from '../utils/prismaClient'; // Keep if needed for specific formatting not in service
import { calculateCustomerHealth } from '../services/customerHealthService'; // Assuming path is correct
import {
  getDashboardStats,
  getOrderTrends,
  getRecentActivity,
  getOrderTrendKPI
} from '../services/dashboardService'; // Adjust path if needed

// --- getDashboardData ---
export const getDashboardData = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Controller: Fetching dashboard stats...');
    const dashboardData = await getDashboardStats();
    console.log('Controller: Dashboard stats fetched:', dashboardData);
    res.json(dashboardData);
  } catch (error: any) {
    console.error('Controller: Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data', details: error.message });
  }
};

// --- getOrderTrendsData ---
export const getOrderTrendsData = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Controller: Fetching order trends data for chart...');
    const monthlyTrendsArray = await getOrderTrends();
    console.log('Controller: Processed Monthly Trends for chart:', monthlyTrendsArray);
    res.json(monthlyTrendsArray);
  } catch (error: any) {
    console.error('Controller: Error fetching order trends for chart:', error);
    res.status(500).json({ error: 'Failed to fetch order trends', details: error.message });
  }
};

// --- getRecentActivityData ---
export const getRecentActivityData = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('Controller: Fetching recent activity...');
        const activityData = await getRecentActivity();
        const recentOrders = activityData.recentOrders || [];
        const recentCustomers = activityData.recentCustomers || [];
        console.log('Controller: Raw recent orders from service:', recentOrders);
        console.log('Controller: Raw recent customers from service:', recentCustomers);

        // Formatting Logic
        const formatDate = (date: Date | string | null | undefined): string => {
          if (!date) return 'N/A';
          const dateObj = typeof date === 'string' ? new Date(date) : date;
          if (isNaN(dateObj.getTime())) return 'Invalid Date';
          return dateObj.toLocaleString('en-GB', {
             day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
          });
        };

        const orderActivities = recentOrders.map((order: any) => ({
            id: order.id,
            title: `Order: ${order.projectTitle || 'N/A'}`,
            time: formatDate(order.updatedAt),
            status: `Status: ${order.status}`,
            description: `Customer: ${order.customerName || order.customer?.name || 'Unknown'}`,
            type: 'order' as const,
            entityId: order.id,
            originalDate: order.updatedAt
        }));

        const customerActivities = recentCustomers.map((customer: any) => ({
            id: customer.id,
            title: `New Customer: ${customer.name}`,
            time: formatDate(customer.createdAt),
            status: 'Added',
            description: `Email: ${customer.email || 'N/A'}`,
            type: 'customer' as const,
            entityId: customer.id,
            originalDate: customer.createdAt
        }));

        const combinedActivities = [ ...orderActivities, ...customerActivities ]
            .sort((a, b) => new Date(b.originalDate).getTime() - new Date(a.originalDate).getTime())
            .slice(0, 5)
            .map(({ originalDate, ...rest }: any) => rest);
        // End Formatting

        console.log('Controller: Combined recent activity:', combinedActivities);
        res.json(combinedActivities);
    } catch (error: any) {
        console.error('Controller: Error fetching/formatting recent activity:', error);
        res.status(500).json({ error: 'Failed to fetch recent activity', details: error.message });
    }
};


// --- getCustomerHealthDashboard --- (VERIFY THIS FUNCTION IS FULLY REPLACED)
export const getCustomerHealthDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Controller: Fetching customer health dashboard data...');
    // Call the service function - it returns the summary object
    const customerHealthSummary = await calculateCustomerHealth();

    // Construct the response using the data ALREADY calculated by the service
    const dashboardData = {
      healthScores: customerHealthSummary.healthScores, // Use array from summary
      lastUpdated: new Date(),
      totalCustomers: customerHealthSummary.totalCustomers, // Use count from summary
      churnRiskBreakdown: customerHealthSummary.churnRiskBreakdown, // Use breakdown from summary
      // upsellOpportunities: customerHealthSummary.upsellOpportunities // Optionally include if needed
    };

    console.log('Controller: Customer health dashboard data fetched:', dashboardData); // Log the data being sent
    res.json(dashboardData); // Send the correctly structured data

  } catch (error: any) {
    console.error('Controller: Error in getCustomerHealthDashboard:', error instanceof Error ? error.message : error); // Log specific error
    // Send back a generic error message + the specific details from the caught error
    res.status(500).json({
        error: 'Failed to generate customer health dashboard', // Keep generic error message
        details: error instanceof Error ? error.message : String(error) // Send specific details
    });
  }
};


// --- getOrderTrendKPIData ---
export const getOrderTrendKPIData = async (req: Request, res: Response): Promise<void> => {
   try {
     console.log('Controller: Fetching order trend KPI data...');
     const kpiData = await getOrderTrendKPI();
     console.log('Controller: Order trend KPI data fetched:', kpiData);
     res.json(kpiData);
   } catch (error: any) {
     console.error('Controller: Error fetching order trend KPI:', error);
     res.status(500).json({ error: 'Failed to fetch order trend KPI data', details: error.message });
   }
};