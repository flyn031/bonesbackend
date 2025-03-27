import { Router } from 'express';
import prisma from '../utils/prismaClient';
import { 
  createJob, 
  updateJob, 
  getJobs, 
  getJobById, 
  deleteJob,
  getAvailableOrders,
  getAvailableUsers,
  addJobNote,
  getJobStats
} from '../controllers/jobController';
import { authenticateToken } from '../middleware/authMiddleware';
import jobService from '../services/jobService';

const router = Router();

// Protect all job routes with authentication
router.use(authenticateToken);

// IMPORTANT: The at-risk endpoint needs to be placed BEFORE the /:id pattern
// otherwise Express will treat "at-risk" as an ID parameter
router.get('/at-risk', async (req, res) => {
  try {
    const daysThreshold = req.query.days ? Number(req.query.days) : 7;
    const atRiskJobs = await jobService.findJobsAtRisk(daysThreshold);
    res.json(atRiskJobs);
  } catch (error) {
    console.error('At-risk jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch at-risk jobs' });
  }
});

// Available resources endpoints also need to be before the /:id pattern
router.get('/available-orders', getAvailableOrders);
router.get('/available-users', getAvailableUsers);
router.get('/stats', getJobStats);

// Job Creation
router.post('/', createJob);

// Job Retrieval
router.get('/', getJobs);
router.get('/:id', getJobById);

// Job Updates
router.patch('/:id', updateJob);

// Job Deletion
router.delete('/:id', deleteJob);

// Job Notes
router.post('/:id/notes', addJobNote);

// Job Costs endpoints
router.get('/:jobId/costs', async (req, res) => {
  try {
    const { jobId } = req.params;
    console.log(`Fetching costs for job ${jobId}`);
    
    // First check if the job exists
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Now fetch the costs
    const jobCosts = await prisma.jobCost.findMany({
      where: { jobId: jobId },
      include: {
        material: true,
        supplier: true,
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    console.log(`Found ${jobCosts.length} costs for job ${jobId}`);
    res.json(jobCosts);
  } catch (error) {
    console.error('Error fetching job costs:', error);
    console.error('Error details:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch job costs', 
      details: error.message 
    });
  }
});

// POST - Add a new job cost with proper relation handling
router.post('/:jobId/costs', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { description, amount, category, date, materialId, supplierId, notes } = req.body;
    
    // Validation
    if (!description || amount === undefined) {
      return res.status(400).json({ error: 'Description and amount are required' });
    }
    
    // Create the job cost with all required relations
    const jobCost = await prisma.jobCost.create({
      data: {
        description,
        amount: parseFloat(amount),
        category: category || 'OTHER',
        date: date ? new Date(date) : new Date(),
        job: { connect: { id: jobId } },
        createdBy: { connect: { id: req.user.id } },
        ...(materialId && { material: { connect: { id: materialId } } }),
        ...(supplierId && { supplier: { connect: { id: supplierId } } }),
        notes
      },
      include: {
        material: true,
        supplier: true,
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    res.status(201).json(jobCost);
  } catch (error) {
    console.error('Error creating job cost:', error);
    console.error('Error details:', error.stack);
    res.status(500).json({ 
      error: 'Failed to create job cost', 
      details: error.message 
    });
  }
});

// Job Performance Metrics
router.get('/:id/performance-metrics', async (req, res) => {
  try {
    const metrics = await jobService.getJobPerformanceMetrics(req.params.id);
    res.json(metrics);
  } catch (error) {
    console.error('Performance metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

router.get('/:id/progress-report', async (req, res) => {
  try {
    const report = await jobService.generateJobProgressReport(req.params.id);
    res.json(report);
  } catch (error) {
    console.error('Progress report error:', error);
    res.status(500).json({ error: 'Failed to generate progress report' });
  }
});

router.get('/:id/resource-recommendations', async (req, res) => {
  try {
    const recommendations = await jobService.recommendResourceAllocation(req.params.id);
    res.json(recommendations);
  } catch (error) {
    console.error('Resource recommendations error:', error);
    res.status(500).json({ error: 'Failed to generate resource recommendations' });
  }
});

export default router;