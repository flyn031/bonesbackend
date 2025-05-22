"use strict";
// src/controllers/employeeController.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEmployee = exports.updateEmployee = exports.createEmployee = exports.getEmployeeById = exports.getAllEmployees = void 0;
const prismaClient_1 = __importDefault(require("../utils/prismaClient"));
// Basic implementation to resolve import errors
const getAllEmployees = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const employees = yield prismaClient_1.default.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
        res.json(employees);
    }
    catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Failed to fetch employees', details: error.message });
    }
});
exports.getAllEmployees = getAllEmployees;
const getEmployeeById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const employee = yield prismaClient_1.default.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json(employee);
    }
    catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({ error: 'Failed to fetch employee', details: error.message });
    }
});
exports.getEmployeeById = getEmployeeById;
const createEmployee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password, role } = req.body;
        // Basic validation
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        const existingUser = yield prismaClient_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: 'Email already in use' });
        }
        const newEmployee = yield prismaClient_1.default.user.create({
            data: {
                name,
                email,
                password, // In a real app, this would be hashed
                role: role || 'USER'
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
        res.status(201).json(newEmployee);
    }
    catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({ error: 'Failed to create employee', details: error.message });
    }
});
exports.createEmployee = createEmployee;
const updateEmployee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, email, role } = req.body;
        const existingEmployee = yield prismaClient_1.default.user.findUnique({ where: { id } });
        if (!existingEmployee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        // Check if email is being changed and is already in use
        if (email && email !== existingEmployee.email) {
            const emailInUse = yield prismaClient_1.default.user.findUnique({ where: { email } });
            if (emailInUse) {
                return res.status(409).json({ error: 'Email already in use' });
            }
        }
        const updatedEmployee = yield prismaClient_1.default.user.update({
            where: { id },
            data: {
                name: name !== undefined ? name : undefined,
                email: email !== undefined ? email : undefined,
                role: role !== undefined ? role : undefined
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
        res.json(updatedEmployee);
    }
    catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ error: 'Failed to update employee', details: error.message });
    }
});
exports.updateEmployee = updateEmployee;
const deleteEmployee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existingEmployee = yield prismaClient_1.default.user.findUnique({ where: { id } });
        if (!existingEmployee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        yield prismaClient_1.default.user.delete({ where: { id } });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ error: 'Failed to delete employee', details: error.message });
    }
});
exports.deleteEmployee = deleteEmployee;
