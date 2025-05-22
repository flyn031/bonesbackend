// src/routes/jobCosts.ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// Get all job costs for a specific job
router.get('/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const costs = await prisma.jobCost.findMany({
      where: { jobId },
      include: {
        job: true // Include job details
        // Note: material is not a relation on JobCost, removed from include
      },
      orderBy: { costDate: 'desc' } // Changed from 'date' to 'costDate' to match schema
    });
    
    res.json(costs);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Add a new job cost
router.post('/', async (req: Request, res: Response) => {
  try {
    const { jobId, description, amount, category } = req.body;
    
    const newCost = await prisma.jobCost.create({
      data: {
        jobId,
        description,
        amount: parseFloat(amount),
        category,
        costDate: new Date() // Use costDate field from schema
      }
    });
    
    res.status(201).json(newCost);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update job total costs (via separate tracking method rather than direct field)
router.put('/total/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const { totalCost } = req.body; // Changed from totalCosts
    
    // Since totalCosts doesn't exist on Job model, we need a different approach
    // Could track via JobCost records or via appropriate calculation
    
    // Option: Update job record (without setting non-existent totalCosts field)
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        // No totalCosts field in schema to update
        // We might need to handle this logically elsewhere
      }
    });
    
    // Return updated job and calculated total costs
    const totalCosts = await prisma.jobCost.aggregate({
      where: { jobId },
      _sum: { amount: true }
    });
    
    res.json({
      job: updatedJob,
      totalCosts: totalCosts._sum.amount || 0
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Delete a job cost
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.jobCost.delete({
      where: { id }
    });
    
    res.json({ message: 'Job cost deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;