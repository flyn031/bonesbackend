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
exports.getAllSuppliersPerformance = exports.getSupplierPerformanceReport = exports.updateSupplier = exports.getSupplier = exports.getSuppliers = exports.createSupplier = void 0;
const client_1 = require("@prisma/client");
const supplierPerformanceService_1 = require("../services/supplierPerformanceService");
const prisma = new client_1.PrismaClient();
const performanceService = new supplierPerformanceService_1.SupplierPerformanceService();
const createSupplier = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Creating supplier with data:', req.body);
        const { name, email, phone, address, rating, status, notes } = req.body;
        // Validate required fields
        if (!name || !email) {
            console.log('Validation failed: Missing required fields');
            res.status(400).json({ error: 'Name and email are required' });
            return; // Exit after sending response
        }
        // Check if a supplier with this email already exists
        const existingSupplier = yield prisma.supplier.findUnique({
            where: { email }
        });
        if (existingSupplier) {
            console.log('Supplier with email already exists');
            res.status(409).json({
                error: 'A supplier with this email already exists',
                supplierName: existingSupplier.name
            });
            return; // Exit after sending response
        }
        // Store notes in a separate object to pass to metadata or another approach later
        const notesInfo = notes || null;
        const supplier = yield prisma.supplier.create({
            data: {
                name,
                email,
                phone: phone || null,
                address: address || null,
                rating: rating ? parseFloat(rating) : 3, // Default to 3 if not provided
                status: status || 'ACTIVE',
                // Remove notes property since it doesn't exist in the Prisma model
                // Instead, we could store it in metadata or a separate table if needed
            }
        });
        // If you want to return notes with the response even though it's not stored
        const responseData = Object.assign(Object.assign({}, supplier), { notes: notesInfo // Add notes back to the response object
         });
        console.log('Supplier created successfully:', supplier);
        res.status(201).json(responseData);
    }
    catch (error) { // Explicitly type error as 'any'
        console.error('Error creating supplier:', error);
        // Handle specific Prisma error codes
        if (error.code === 'P2002') {
            res.status(409).json({
                error: 'A supplier with this email already exists',
                details: error.message
            });
        }
        else {
            res.status(500).json({
                error: 'Failed to create supplier',
                details: error.message
            });
        }
    }
});
exports.createSupplier = createSupplier;
const getSuppliers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { search, status } = req.query;
        const whereClause = {
            AND: [
                search ? {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } }
                    ]
                } : {},
            ]
        };
        // Proper type handling for status filter
        if (status) {
            // Validate if the status is a valid enum value
            const validStatuses = Object.values(client_1.SupplierStatus);
            const statusValue = status;
            if (validStatuses.includes(statusValue)) {
                whereClause.status = statusValue;
            }
            else {
                console.warn(`Invalid status value: ${statusValue}`);
                // You could either ignore invalid status or return an error
                // For now, we'll just ignore it
            }
        }
        const suppliers = yield prisma.supplier.findMany({
            where: whereClause,
            include: {
                materials: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(suppliers);
    }
    catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
});
exports.getSuppliers = getSuppliers;
const getSupplier = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const supplier = yield prisma.supplier.findUnique({
            where: { id },
            include: {
                materials: true
            }
        });
        if (!supplier) {
            res.status(404).json({ error: 'Supplier not found' });
            return; // Exit after sending response
        }
        res.json(supplier);
    }
    catch (error) {
        console.error('Error fetching supplier:', error);
        res.status(500).json({ error: 'Failed to fetch supplier' });
    }
});
exports.getSupplier = getSupplier;
const updateSupplier = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, email, phone, address, rating, status, notes } = req.body;
        // Validate required fields
        if (!name || !email) {
            res.status(400).json({ error: 'Name and email are required' });
            return; // Exit after sending response
        }
        // Store notes separately
        const notesInfo = notes || null;
        const supplier = yield prisma.supplier.update({
            where: { id },
            data: {
                name,
                email,
                phone,
                address,
                rating,
                status: status,
                // Remove notes property as it doesn't exist in the Prisma model
            }
        });
        // Add notes to the response
        const responseData = Object.assign(Object.assign({}, supplier), { notes: notesInfo });
        res.json(responseData);
    }
    catch (error) {
        console.error('Error updating supplier:', error);
        // Handle specific Prisma error codes
        if (error.code === 'P2002') {
            res.status(409).json({
                error: 'A supplier with this email already exists',
                details: error.message
            });
        }
        else {
            res.status(500).json({
                error: 'Failed to update supplier',
                details: error.message
            });
        }
    }
});
exports.updateSupplier = updateSupplier;
const getSupplierPerformanceReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const performance = yield performanceService.getSupplierPerformanceReport(id);
        res.json(performance);
    }
    catch (error) {
        console.error('Error fetching supplier performance:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getSupplierPerformanceReport = getSupplierPerformanceReport;
const getAllSuppliersPerformance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const performanceReports = yield performanceService.getAllSuppliersPerformance();
        res.json(performanceReports);
    }
    catch (error) {
        console.error('Error fetching all suppliers performance:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.getAllSuppliersPerformance = getAllSuppliersPerformance;
