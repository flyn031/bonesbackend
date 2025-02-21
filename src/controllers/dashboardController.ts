import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getDashboardStats, getOrderTrends, getRecentActivity } from '../services/dashboardService';

const prisma = new PrismaClient();

export const getDashboardData = async (req: Request, res: Response) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

export const getOrderTrendsData = async (req: Request, res: Response) => {
  try {
    const trends = await getOrderTrends();
    res.json(trends);
  } catch (error) {
    console.error('Error fetching order trends:', error);
    res.status(500).json({ error: 'Failed to fetch order trends' });
  }
};

export const getRecentActivityData = async (req: Request, res: Response) => {
  try {
    const activity = await getRecentActivity();
    res.json(activity);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
};