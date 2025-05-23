// src/routes/employeeRoutes.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee
} from '../controllers/employeeController';  // Fixed path - removed ../../backend/src

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all employees (used for time tracking employee selection)
router.get('/', getAllEmployees);

// Get employee by ID
router.get('/:id', getEmployeeById);

// Create new employee
router.post('/', createEmployee);

// Update employee
router.put('/:id', updateEmployee);

// Delete employee
router.delete('/:id', deleteEmployee);

export default router;