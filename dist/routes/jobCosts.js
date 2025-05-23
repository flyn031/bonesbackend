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
// src/routes/jobCosts.ts
const express_1 = require("express");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
// Get all job costs for a specific job
router.get('/:jobId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { jobId } = req.params;
        const costs = yield prisma.jobCost.findMany({
            where: { jobId },
            include: {
                job: true // Include job details
                // Note: material is not a relation on JobCost, removed from include
            },
            orderBy: { costDate: 'desc' } // Changed from 'date' to 'costDate' to match schema
        });
        res.json(costs);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
// Add a new job cost
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { jobId, description, amount, category } = req.body;
        const newCost = yield prisma.jobCost.create({
            data: {
                jobId,
                description,
                amount: parseFloat(amount),
                category,
                costDate: new Date() // Use costDate field from schema
            }
        });
        res.status(201).json(newCost);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
// Update job total costs (via separate tracking method rather than direct field)
router.put('/total/:jobId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { jobId } = req.params;
        const { totalCost } = req.body; // Changed from totalCosts
        // Since totalCosts doesn't exist on Job model, we need a different approach
        // Could track via JobCost records or via appropriate calculation
        // Option: Update job record (without setting non-existent totalCosts field)
        const updatedJob = yield prisma.job.update({
            where: { id: jobId },
            data: {
            // No totalCosts field in schema to update
            // We might need to handle this logically elsewhere
            }
        });
        // Return updated job and calculated total costs
        const totalCosts = yield prisma.jobCost.aggregate({
            where: { jobId },
            _sum: { amount: true }
        });
        res.json({
            job: updatedJob,
            totalCosts: totalCosts._sum.amount || 0
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
// Delete a job cost
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.jobCost.delete({
            where: { id }
        });
        res.json({ message: 'Job cost deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
exports.default = router;
