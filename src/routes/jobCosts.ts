import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Import your authentication middleware
// Uncomment and adjust the import path as needed
// import { authMiddleware } from '../middleware/authMiddleware';

// Helper function to update job total costs
async function updateJobTotalCosts(jobId: string) {
  try {
    const costs = await prisma.jobCost.findMany({
      where: { jobId }
    });
    
    const totalCosts = costs.reduce((sum, cost) => sum + cost.amount, 0);
    
    await prisma.job.update({
      where: { id: jobId },
      data: { totalCosts }
    });
  } catch (error) {
    console.error('Error updating job total costs:', error);
  }
}

// Get all costs for a job
router.get('/jobs/:jobId/costs', 
  // Uncomment this to add authentication
  // authMiddleware,
  async (req, res) => {
    try {
      const { jobId } = req.params;
      const jobCosts = await prisma.jobCost.findMany({
        where: { jobId: jobId },
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
      res.json(jobCosts);
    } catch (error) {
      console.error('Error fetching job costs:', error);
      res.status(500).json({ error: 'Failed to fetch job costs' });
    }
  }
);

// Other routes following the same pattern...

export default router;