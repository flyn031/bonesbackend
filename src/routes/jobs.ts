import { Router } from 'express';
import { 
  createJob, 
  updateJob, 
  getJobs, 
  getJobById, 
  deleteJob,
  getAvailableOrders,
  getAvailableUsers,
  addJobNote
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