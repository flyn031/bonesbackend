import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all costs for a job
export const getJobCosts = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    
    const costs = await prisma.jobCost.findMany({
      where: { jobId },
      include: {
        material: true,
        supplier: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });
    
    res.json(costs);
  } catch (error) {
    console.error('Error fetching job costs:', error);
    res.status(500).json({ message: 'Failed to fetch job costs' });
  }
};

// Get cost summary for a job
export const getJobCostSummary = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    
    // Get all costs for the job
    const costs = await prisma.jobCost.findMany({
      where: { jobId }
    });
    
    // Calculate total costs
    const totalCosts = costs.reduce((total, cost) => total + cost.amount, 0);
    
    // Group by category
    const categoryTotals: Record<string, number> = {};
    
    costs.forEach(cost => {
      if (!categoryTotals[cost.category]) {
        categoryTotals[cost.category] = 0;
      }
      categoryTotals[cost.category] += cost.amount;
    });
    
    // Create category breakdown with percentages
    const byCategoryBreakdown = Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalCosts > 0 ? (amount / totalCosts) * 100 : 0
    }));
    
    // Return the summary
    res.json({
      totalCosts,
      byCategoryBreakdown
    });
  } catch (error) {
    console.error('Error getting job cost summary:', error);
    res.status(500).json({ message: 'Failed to get job cost summary' });
  }
};

// Create a new job cost
export const createJobCost = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const { description, amount, category, date, supplierId, materialId, notes, attachmentUrl } = req.body;
    
    // Get user ID from auth middleware
    const userId = req.user.id;
    
    // Create the job cost
    const newCost = await prisma.jobCost.create({
      data: {
        description,
        amount: parseFloat(amount),
        category,
        date: new Date(date),
        job: { connect: { id: jobId } },
        createdBy: { connect: { id: userId } },
        ...(supplierId && { supplier: { connect: { id: supplierId } } }),
        ...(materialId && { material: { connect: { id: materialId } } }),
        notes,
        attachmentUrl
      },
      include: {
        material: true,
        supplier: true
      }
    });
    
    // Update the job's total costs
    await updateJobTotalCosts(jobId);
    
    res.status(201).json(newCost);
  } catch (error) {
    console.error('Error creating job cost:', error);
    res.status(500).json({ message: 'Failed to create job cost' });
  }
};

// Update a job cost
export const updateJobCost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { description, amount, category, date, supplierId, materialId, notes, attachmentUrl, invoiced } = req.body;
    
    // First, get the current cost to retrieve the jobId
    const currentCost = await prisma.jobCost.findUnique({
      where: { id }
    });
    
    if (!currentCost) {
      return res.status(404).json({ message: 'Cost not found' });
    }
    
    // Update the cost
    const updatedCost = await prisma.jobCost.update({
      where: { id },
      data: {
        description,
        amount: parseFloat(amount),
        category,
        date: new Date(date),
        ...(supplierId === null 
          ? { supplier: { disconnect: true } } 
          : supplierId && { supplier: { connect: { id: supplierId } } }),
        ...(materialId === null 
          ? { material: { disconnect: true } } 
          : materialId && { material: { connect: { id: materialId } } }),
        notes,
        attachmentUrl,
        ...(invoiced !== undefined && { invoiced })
      },
      include: {
        material: true,
        supplier: true
      }
    });
    
    // Update the job's total costs
    await updateJobTotalCosts(currentCost.jobId);
    
    res.json(updatedCost);
  } catch (error) {
    console.error('Error updating job cost:', error);
    res.status(500).json({ message: 'Failed to update job cost' });
  }
};

// Delete a job cost
export const deleteJobCost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // First, get the cost to retrieve the jobId
    const cost = await prisma.jobCost.findUnique({
      where: { id }
    });
    
    if (!cost) {
      return res.status(404).json({ message: 'Cost not found' });
    }
    
    // Delete the cost
    await prisma.jobCost.delete({
      where: { id }
    });
    
    // Update the job's total costs
    await updateJobTotalCosts(cost.jobId);
    
    res.json({ message: 'Job cost deleted successfully' });
  } catch (error) {
    console.error('Error deleting job cost:', error);
    res.status(500).json({ message: 'Failed to delete job cost' });
  }
};

// Helper function to update the job's total costs
async function updateJobTotalCosts(jobId: string) {
  const costs = await prisma.jobCost.findMany({
    where: { jobId }
  });
  
  const totalCosts = costs.reduce((sum, cost) => sum + cost.amount, 0);
  
  await prisma.job.update({
    where: { id: jobId },
    data: { totalCosts }
  });
}