// backend/src/routes/timeEntries.ts

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
  createTimeEntry,
  getTimeEntries,
  getTimeEntryById,
  updateTimeEntry,
  deleteTimeEntry,
  getRdSummary,
  bulkMarkAsRd,
  getEmployeeTimesheet,
} from '../controllers/timeEntryController';

const router = express.Router();

// Protect all routes with authentication
router.use(authenticateToken);

// Time entry CRUD routes
router.post('/', createTimeEntry);
router.get('/', getTimeEntries);
router.get('/rd-summary', getRdSummary); // Must come before /:id route
router.get('/:id', getTimeEntryById);
router.put('/:id', updateTimeEntry);
router.delete('/:id', deleteTimeEntry);

// Bulk operations
router.patch('/bulk/mark-rd', bulkMarkAsRd);

// Employee-specific routes
router.get('/employee/:employeeId/timesheet', getEmployeeTimesheet);

export default router;