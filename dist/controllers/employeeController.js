"use strict";
// backend/src/controllers/employeeController.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEmployee = exports.updateEmployee = exports.createEmployee = exports.getEmployeeById = exports.getAllEmployees = void 0;
const prismaClient_1 = __importDefault(require("../utils/prismaClient"));
const client_1 = require("@prisma/client");
const getAllEmployees = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get all users who can be employees (exclude customer-only roles if any)
        const employees = yield prismaClient_1.default.user.findMany({
            where: {
                // Include all employee roles that can track time
                role: {
                    in: [client_1.Role.USER, client_1.Role.ADMIN] // Only roles that exist in your schema
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                // Add other fields you want in the dropdown
                createdAt: true
            },
            orderBy: {
                name: 'asc' // Sort alphabetically for better UX
            }
        });
        console.log('🔍 Backend found employees:', employees.length);
        // *** THIS IS THE KEY FIX: Return wrapped format ***
        res.json({ employees });
    }
    catch (error) {
        console.error('Error fetching employees:', error);
        next(error);
    }
});
exports.getAllEmployees = getAllEmployees;
const getEmployeeById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
            }
        });
        if (!employee) {
            res.status(404).json({ message: 'Employee not found' });
            return;
        }
        res.json(employee);
    }
    catch (error) {
        next(error);
    }
});
exports.getEmployeeById = getEmployeeById;
const createEmployee = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const _a = req.body, { name, email, role } = _a, data = __rest(_a, ["name", "email", "role"]);
        const employee = yield prismaClient_1.default.user.create({
            data: Object.assign({ name,
                email, role: client_1.Role.USER }, data)
        });
        res.status(201).json(employee);
    }
    catch (error) {
        next(error);
    }
});
exports.createEmployee = createEmployee;
const updateEmployee = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const data = __rest(req.body, []);
        const employee = yield prismaClient_1.default.user.update({
            where: { id },
            data
        });
        res.json(employee);
    }
    catch (error) {
        next(error);
    }
});
exports.updateEmployee = updateEmployee;
const deleteEmployee = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prismaClient_1.default.user.delete({
            where: { id }
        });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
exports.deleteEmployee = deleteEmployee;
