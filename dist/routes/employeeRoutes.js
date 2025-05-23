"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/employeeRoutes.ts
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const employeeController_1 = require("../controllers/employeeController"); // Fixed path - removed ../../backend/src
const router = (0, express_1.Router)();
// Apply authentication middleware to all routes
router.use(authMiddleware_1.authenticateToken);
// Get all employees (used for time tracking employee selection)
router.get('/', employeeController_1.getAllEmployees);
// Get employee by ID
router.get('/:id', employeeController_1.getEmployeeById);
// Create new employee
router.post('/', employeeController_1.createEmployee);
// Update employee
router.put('/:id', employeeController_1.updateEmployee);
// Delete employee
router.delete('/:id', employeeController_1.deleteEmployee);
exports.default = router;
