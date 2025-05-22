"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEmployee = exports.updateEmployee = exports.getEmployeeById = exports.getAllEmployees = exports.createEmployee = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Create a new employee
const createEmployee = (employeeData) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma.employee.create({
        data: {
            name: employeeData.name,
            email: employeeData.email,
            phone: employeeData.phone,
            jobTitle: employeeData.jobTitle,
            technicalQualifications: employeeData.technicalQualifications || [], // Ensure it's an array, even if empty
            isActive: typeof employeeData.isActive === 'boolean' ? employeeData.isActive : true, // Default to true if not provided
            hireDate: employeeData.hireDate ? new Date(employeeData.hireDate) : undefined,
            terminationDate: employeeData.terminationDate ? new Date(employeeData.terminationDate) : undefined,
            notes: employeeData.notes,
            userId: employeeData.userId, // Link to existing User if provided
        },
    });
});
exports.createEmployee = createEmployee;
// Get all employees
const getAllEmployees = (isActive) => __awaiter(void 0, void 0, void 0, function* () {
    const whereClause = {};
    if (typeof isActive === 'boolean') {
        whereClause.isActive = isActive;
    }
    return prisma.employee.findMany({
        where: whereClause,
        orderBy: { name: 'asc' }, // Order alphabetically by name
    });
});
exports.getAllEmployees = getAllEmployees;
// Get employee by ID
const getEmployeeById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma.employee.findUnique({
        where: { id },
        include: {
            user: true, // Include associated user details
            timeEntries: true, // Optionally include time entries here, or fetch separately
        },
    });
});
exports.getEmployeeById = getEmployeeById;
// Update an employee
const updateEmployee = (id, employeeData) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma.employee.update({
        where: { id },
        data: {
            name: employeeData.name,
            email: employeeData.email,
            phone: employeeData.phone,
            jobTitle: employeeData.jobTitle,
            technicalQualifications: employeeData.technicalQualifications,
            isActive: typeof employeeData.isActive === 'boolean' ? employeeData.isActive : undefined, // Allow setting to undefined if not provided in partial update
            hireDate: employeeData.hireDate ? new Date(employeeData.hireDate) : undefined,
            terminationDate: employeeData.terminationDate ? new Date(employeeData.terminationDate) : undefined,
            notes: employeeData.notes,
            userId: employeeData.userId,
        },
    });
});
exports.updateEmployee = updateEmployee;
// Delete an employee (consider soft delete by setting isActive to false instead)
const deleteEmployee = (id) => __awaiter(void 0, void 0, void 0, function* () {
    // Option 1: Hard delete (removes record from DB)
    return prisma.employee.delete({
        where: { id },
    });
    // Option 2: Soft delete (recommended for retaining historical data and relations)
    // return prisma.employee.update({
    //   where: { id },
    //   data: { isActive: false },
    // });
});
exports.deleteEmployee = deleteEmployee;
