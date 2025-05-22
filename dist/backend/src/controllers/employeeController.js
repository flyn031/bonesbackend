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
        // Fix for the role issue - using an appropriate existing role from the enum
        const employees = yield prismaClient_1.default.user.findMany({
            where: {
                // Using equals filter with an existing role from the enum
                role: client_1.Role.USER
            }
        });
        res.json(employees);
    }
    catch (error) {
        next(error);
    }
});
exports.getAllEmployees = getAllEmployees;
const getEmployeeById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const employee = yield prismaClient_1.default.user.findUnique({
            where: { id }
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
