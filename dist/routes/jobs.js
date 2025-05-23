"use strict";
// backend/src/routes/jobs.ts
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
const express_1 = require("express");
const client_1 = require("@prisma/client");
const prismaClient_1 = __importDefault(require("../utils/prismaClient"));
const jobService_1 = __importDefault(require("../services/jobService"));
// ADD AUDIT MIDDLEWARE IMPORT
const auditMiddleware_1 = require("../middleware/auditMiddleware");
// Import authentication middleware directly
// Assuming authorizeRole is the correct export for role-based authorization
// This import is correct, assuming authorizeRole is a named export in authMiddleware.ts
const authMiddleware_1 = require("../middleware/authMiddleware");
// Import job controllers directly
const jobController_1 = require("../controllers/jobController");
const router = (0, express_1.Router)();
// Utility to wrap async functions to catch errors and pass to Express error handling
// Ensure that the 'req' parameter passed to fn is `AuthRequest` for type safety
const asyncHandler = (fn) => (req, res, next) => {
    // Cast req to AuthRequest inside asyncHandler to ensure proper typing for the wrapped function
    Promise.resolve(fn(req, res, next)).catch(next);
};
// Protect all job routes with authentication
router.use(authMiddleware_1.authenticateToken);
// IMPORTANT: Specific string routes like '/at-risk', '/stats' must come BEFORE routes with parameters like '/:id'
router.get('/stats', asyncHandler(jobController_1.getJobStats));
router.get('/available-orders', asyncHandler(jobController_1.getAvailableOrders));
router.get('/available-users', asyncHandler(jobController_1.getAvailableUsers));
router.get('/at-risk', asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const daysThreshold = req.query.days ? Number(req.query.days) : 7;
    // Type assertion for jobService methods to ensure TS knows they exist (if they truly should)
    // This assumes jobService will have these methods. If not, you need to add them.
    if (typeof jobService_1.default.findJobsAtRisk !== 'function') {
        // It's better to type jobService directly or ensure it has these methods.
        // For now, keeping the runtime check as a safeguard.
        return res.status(500).json({
            error: 'Service not available',
            message: 'findJobsAtRisk method not implemented in jobService'
        });
    }
    const atRiskJobs = yield jobService_1.default.findJobsAtRisk(daysThreshold);
    return res.json(atRiskJobs);
})));
// Job CRUD Operations - ADD AUDIT MIDDLEWARE
router.post('/', (0, auditMiddleware_1.auditJobMiddleware)('CREATE'), asyncHandler(jobController_1.createJob));
// GET routes don't need auditing - they don't change data
router.get('/', asyncHandler(jobController_1.getJobs));
router.get('/:id', asyncHandler(jobController_1.getJobById));
// UPDATE routes - ADD AUDIT MIDDLEWARE
router.patch('/:id', (0, auditMiddleware_1.auditJobMiddleware)('UPDATE'), asyncHandler(jobController_1.updateJob));
// DELETE route - ADD AUDIT MIDDLEWARE
// Using authorizeRole for admin permissions, as per typical setup
router.delete('/:id', (0, authMiddleware_1.authorizeRole)(['admin', 'super_admin']), (0, auditMiddleware_1.auditJobMiddleware)('DELETE'), asyncHandler(jobController_1.deleteJob));
// Job Costs endpoints
router.get('/:jobId/costs', asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { jobId } = req.params;
    const job = yield prismaClient_1.default.job.findUnique({ where: { id: jobId } });
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    const jobCosts = yield prismaClient_1.default.jobCost.findMany({
        where: { jobId: jobId },
        include: {
        // Add includes based on your schema relationships (uncomment and adjust as needed)
        // material: true,
        // supplier: true,
        // createdBy: { select: { id: true, name: true } }
        },
        orderBy: { costDate: 'desc' }
    });
    return res.json(jobCosts);
})));
// ADD AUDIT for cost creation
router.post('/:jobId/costs', (0, auditMiddleware_1.auditJobMiddleware)('COST_ADDED'), asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { jobId } = req.params;
    const { description, amount, category, date } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Access user from AuthRequest
    if (!userId) {
        // Use res.status().json() and return for early exit
        res.status(401).json({ error: 'Unauthorized: User ID not found in token.' });
        return;
    }
    if (!description || amount === undefined || amount === null) {
        res.status(400).json({ error: 'Description and amount are required for job cost' });
        return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
        res.status(400).json({ error: 'Invalid amount format for job cost' });
        return;
    }
    try {
        const jobCost = yield prismaClient_1.default.jobCost.create({
            data: {
                description,
                amount: parsedAmount,
                category: category || null, // Ensure category is null if not provided, not undefined
                costDate: date ? new Date(date) : new Date(),
                job: { connect: { id: jobId } },
                // Add other fields based on your schema (uncomment and adjust as needed)
                // createdBy: { connect: { id: userId } },
            },
            // include: { material: true, supplier: true, createdBy: { select: { id: true, name: true } } }
        });
        res.status(201).json(jobCost); // Removed 'return'
    }
    catch (error) { // Explicitly type error as any for safer access to .message
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
            res.status(400).json({ message: `Failed to create job cost: Invalid Job ID or other related ID. Field: ${(_b = error.meta) === null || _b === void 0 ? void 0 : _b.field_name}` });
            return;
        }
        console.error(`Error creating job cost for job ${req.params.jobId}:`, error.message);
        res.status(500).json({ error: 'Failed to create job cost', details: error.message });
    }
})));
// Job Performance Metrics & Other Custom Routes
router.get('/:id/performance-metrics', asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Assuming jobService.getJobPerformanceMetrics is a function
    if (typeof jobService_1.default.getJobPerformanceMetrics !== 'function') {
        res.status(500).json({
            error: 'Service not available',
            message: 'getJobPerformanceMetrics method not implemented in jobService'
        });
        return; // Added return for early exit
    }
    const metrics = yield jobService_1.default.getJobPerformanceMetrics(req.params.id);
    res.json(metrics); // Removed 'return'
})));
router.get('/:id/progress-report', asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Assuming jobService.generateJobProgressReport is a function
    if (typeof jobService_1.default.generateJobProgressReport !== 'function') {
        res.status(500).json({
            error: 'Service not available',
            message: 'generateJobProgressReport method not implemented in jobService'
        });
        return; // Added return for early exit
    }
    const report = yield jobService_1.default.generateJobProgressReport(req.params.id);
    res.json(report); // Removed 'return'
})));
router.get('/:id/resource-recommendations', asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Assuming jobService.recommendResourceAllocation is a function
    if (typeof jobService_1.default.recommendResourceAllocation !== 'function') {
        res.status(500).json({
            error: 'Service not available',
            message: 'recommendResourceAllocation method not implemented in jobService'
        });
        return; // Added return for early exit
    }
    const recommendations = yield jobService_1.default.recommendResourceAllocation(req.params.id);
    res.json(recommendations); // Removed 'return'
})));
exports.default = router;
