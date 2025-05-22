// backend/src/routes/jobs.ts

import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prismaClient';
import jobService from '../services/jobService';

// ADD AUDIT MIDDLEWARE IMPORT
import { auditJobMiddleware } from '../middleware/auditMiddleware';

// Import authentication middleware directly
// Assuming authorizeRole is the correct export for role-based authorization
// This import is correct, assuming authorizeRole is a named export in authMiddleware.ts
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware';

// Import job controllers directly
import {
  createJob,
  updateJob,
  getJobs,
  getJobById,
  deleteJob,
  getAvailableOrders,
  getAvailableUsers,
  getJobStats,
} from '../controllers/jobController';

// Define AuthRequest interface for type safety
// Assuming 'role' will always be a string when authenticated via the token
interface UserPayload {
  id: string;
  role: string;
  [key: string]: any;
}

// Extend the Request type to include the 'user' property from AuthRequest
// This ensures that `req.user` is correctly typed when used within controllers.
interface AuthRequest extends Request {
  user?: UserPayload;
}

const router = Router();

// Utility to wrap async functions to catch errors and pass to Express error handling
// Ensure that the 'req' parameter passed to fn is `AuthRequest` for type safety
const asyncHandler = (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    // Cast req to AuthRequest inside asyncHandler to ensure proper typing for the wrapped function
    Promise.resolve(fn(req as AuthRequest, res, next)).catch(next);
  };

// Protect all job routes with authentication
router.use(authenticateToken);

// IMPORTANT: Specific string routes like '/at-risk', '/stats' must come BEFORE routes with parameters like '/:id'
router.get('/stats', asyncHandler(getJobStats));
router.get('/available-orders', asyncHandler(getAvailableOrders));
router.get('/available-users', asyncHandler(getAvailableUsers));

router.get('/at-risk', asyncHandler(async (req: AuthRequest, res: Response) => {
  const daysThreshold = req.query.days ? Number(req.query.days) : 7;

  // Type assertion for jobService methods to ensure TS knows they exist (if they truly should)
  // This assumes jobService will have these methods. If not, you need to add them.
  if (typeof jobService.findJobsAtRisk !== 'function') {
    // It's better to type jobService directly or ensure it has these methods.
    // For now, keeping the runtime check as a safeguard.
    return res.status(500).json({
      error: 'Service not available',
      message: 'findJobsAtRisk method not implemented in jobService'
    });
  }

  const atRiskJobs = await jobService.findJobsAtRisk(daysThreshold);
  return res.json(atRiskJobs);
}));

// Job CRUD Operations - ADD AUDIT MIDDLEWARE
router.post('/', auditJobMiddleware('CREATE'), asyncHandler(createJob));

// GET routes don't need auditing - they don't change data
router.get('/', asyncHandler(getJobs));
router.get('/:id', asyncHandler(getJobById));

// UPDATE routes - ADD AUDIT MIDDLEWARE
router.patch('/:id', auditJobMiddleware('UPDATE'), asyncHandler(updateJob));

// DELETE route - ADD AUDIT MIDDLEWARE
// Using authorizeRole for admin permissions, as per typical setup
router.delete('/:id', authorizeRole(['admin', 'super_admin']), auditJobMiddleware('DELETE'), asyncHandler(deleteJob));

// Job Costs endpoints
router.get('/:jobId/costs', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { jobId } = req.params;

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const jobCosts = await prisma.jobCost.findMany({
    where: { jobId: jobId },
    include: {
      // Add includes based on your schema relationships (uncomment and adjust as needed)
      // material: true,
      // supplier: true,
      // createdBy: { select: { id: true, name: true } }
    },
    orderBy: { costDate: 'desc' }
  });

  return res.json(jobCosts);
}));

// ADD AUDIT for cost creation
router.post('/:jobId/costs', auditJobMiddleware('COST_ADDED'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { jobId } = req.params;
  const { description, amount, category, date } = req.body;
  const userId = req.user?.id; // Access user from AuthRequest

  if (!userId) {
    // Use res.status().json() and return for early exit
    res.status(401).json({ error: 'Unauthorized: User ID not found in token.' });
    return;
  }
  if (!description || amount === undefined || amount === null) {
    res.status(400).json({ error: 'Description and amount are required for job cost' });
    return;
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount)) {
    res.status(400).json({ error: 'Invalid amount format for job cost' });
    return;
  }

  try {
    const jobCost = await prisma.jobCost.create({
      data: {
        description,
        amount: parsedAmount,
        category: category || null, // Ensure category is null if not provided, not undefined
        costDate: date ? new Date(date) : new Date(),
        job: { connect: { id: jobId } },
        // Add other fields based on your schema (uncomment and adjust as needed)
        // createdBy: { connect: { id: userId } },
      },
      // include: { material: true, supplier: true, createdBy: { select: { id: true, name: true } } }
    });

    res.status(201).json(jobCost); // Removed 'return'
  } catch (error: any) { // Explicitly type error as any for safer access to .message
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      res.status(400).json({ message: `Failed to create job cost: Invalid Job ID or other related ID. Field: ${error.meta?.field_name}` });
      return;
    }
    console.error(`Error creating job cost for job ${req.params.jobId}:`, error.message);
    res.status(500).json({ error: 'Failed to create job cost', details: error.message });
  }
}));

// Job Performance Metrics & Other Custom Routes
router.get('/:id/performance-metrics', asyncHandler(async (req: AuthRequest, res: Response) => {
  // Assuming jobService.getJobPerformanceMetrics is a function
  if (typeof jobService.getJobPerformanceMetrics !== 'function') {
    res.status(500).json({ // Removed 'return' here
      error: 'Service not available',
      message: 'getJobPerformanceMetrics method not implemented in jobService'
    });
    return; // Added return for early exit
  }

  const metrics = await jobService.getJobPerformanceMetrics(req.params.id);
  res.json(metrics); // Removed 'return'
}));

router.get('/:id/progress-report', asyncHandler(async (req: AuthRequest, res: Response) => {
  // Assuming jobService.generateJobProgressReport is a function
  if (typeof jobService.generateJobProgressReport !== 'function') {
    res.status(500).json({ // Removed 'return' here
      error: 'Service not available',
      message: 'generateJobProgressReport method not implemented in jobService'
    });
    return; // Added return for early exit
  }

  const report = await jobService.generateJobProgressReport(req.params.id);
  res.json(report); // Removed 'return'
}));

router.get('/:id/resource-recommendations', asyncHandler(async (req: AuthRequest, res: Response) => {
  // Assuming jobService.recommendResourceAllocation is a function
  if (typeof jobService.recommendResourceAllocation !== 'function') {
    res.status(500).json({ // Removed 'return' here
      error: 'Service not available',
      message: 'recommendResourceAllocation method not implemented in jobService'
    });
    return; // Added return for early exit
  }

  const recommendations = await jobService.recommendResourceAllocation(req.params.id);
  res.json(recommendations); // Removed 'return'
}));

export default router;