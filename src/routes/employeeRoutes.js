"use strict";
// backend/src/routes/employeeRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employeeController_1 = require("../controllers/employeeController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Apply authentication middleware to all employee routes
router.use(authMiddleware_1.authenticateToken);
// GET all employees (with optional isActive filter)
router.get('/', employeeController_1.getAllEmployees);
// GET employee by ID
router.get('/:id', employeeController_1.getEmployeeById);
// POST create new employee
router.post('/', employeeController_1.createEmployee);
// PUT update employee by ID
router.put('/:id', employeeController_1.updateEmployee);
// DELETE employee by ID (or deactivate)
router.delete('/:id', employeeController_1.deleteEmployee);
exports.default = router;
