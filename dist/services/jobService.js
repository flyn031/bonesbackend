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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobService = void 0;
// backend/src/services/jobService.ts
const prismaClient_1 = __importDefault(require("../utils/prismaClient"));
const dayjs_1 = __importDefault(require("dayjs"));
const client_1 = require("@prisma/client"); // Import needed types
class JobService {
    // Calculate job performance metrics
    getJobPerformanceMetrics(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const job = yield prismaClient_1.default.job.findUnique({
                where: { id: jobId },
                include: {
                    orders: true,
                    materials: {
                        include: { material: true }
                    },
                    history: true, // Correct field is 'history' not 'jobHistory'
                }
            });
            if (!job) {
                throw new Error('Job not found');
            }
            // ✅ FIXED: Since no COMPLETED status exists, use most recent history entry for end date
            const mostRecentHistoryEntry = (_b = (_a = job.history) === null || _a === void 0 ? void 0 : _a.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())) === null || _b === void 0 ? void 0 : _b[0];
            const actualEndDate = mostRecentHistoryEntry ? (0, dayjs_1.default)(mostRecentHistoryEntry.createdAt) : (0, dayjs_1.default)();
            // Calculate actual vs estimated duration
            const startDate = job.startDate ? (0, dayjs_1.default)(job.startDate) : null;
            const endDate = actualEndDate; // Use the derived actualEndDate
            const estimatedDuration = job.expectedEndDate && startDate
                ? (0, dayjs_1.default)(job.expectedEndDate).diff(startDate, 'hour')
                : 0;
            const actualDuration = startDate ? endDate.diff(startDate, 'hour') : 0;
            // Calculate material usage efficiency
            // Explicitly typing the reducer parameters
            const materialCosts = ((_c = job.materials) === null || _c === void 0 ? void 0 : _c.reduce((total, materialUsage) => {
                // Safely access actual or estimated cost with optional chaining
                return total + (materialUsage.totalCost || 0);
            }, 0)) || 0;
            return {
                jobId: job.id,
                status: job.status,
                duration: {
                    estimated: estimatedDuration,
                    actual: actualDuration,
                    variance: actualDuration - estimatedDuration
                },
                materials: {
                    totalCost: materialCosts,
                    itemsUsed: ((_d = job.materials) === null || _d === void 0 ? void 0 : _d.length) || 0
                },
                performance: {
                    durationVariancePercentage: estimatedDuration
                        ? ((actualDuration - estimatedDuration) / estimatedDuration) * 100
                        : 0,
                    isBehindSchedule: actualDuration > estimatedDuration
                }
            };
        });
    }
    // Generate job progress report
    generateJobProgressReport(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const job = yield prismaClient_1.default.job.findUnique({
                where: { id: jobId },
                include: {
                    customer: true,
                    orders: true,
                    materials: {
                        include: {
                            material: true
                        }
                    },
                    history: true, // Correct relation is 'history'
                }
            });
            if (!job) {
                throw new Error('Job not found');
            }
            // ✅ FIXED: Since no COMPLETED status exists, use most recent history entry
            const mostRecentHistoryEntry = (_b = (_a = job.history) === null || _a === void 0 ? void 0 : _a.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())) === null || _b === void 0 ? void 0 : _b[0];
            const actualEndDate = mostRecentHistoryEntry ? mostRecentHistoryEntry.createdAt : null;
            return {
                jobDetails: {
                    id: job.id,
                    title: job.title,
                    description: job.description,
                    status: job.status,
                    startDate: job.startDate,
                    expectedEndDate: job.expectedEndDate,
                    actualEndDate: actualEndDate
                },
                customer: {
                    id: ((_c = job.customer) === null || _c === void 0 ? void 0 : _c.id) || '',
                    name: ((_d = job.customer) === null || _d === void 0 ? void 0 : _d.name) || 'Unknown Customer'
                },
                order: job.orders && job.orders.length > 0 ? {
                    id: job.orders[0].id,
                    projectTitle: job.orders[0].projectTitle
                } : undefined,
                assignedTeam: [], // You may need to implement this based on your business logic
                materials: ((_e = job.materials) === null || _e === void 0 ? void 0 : _e.map((materialUsage) => {
                    var _a, _b, _c, _d, _e, _f, _g;
                    return ({
                        materialId: ((_a = materialUsage.material) === null || _a === void 0 ? void 0 : _a.id) || '',
                        materialName: ((_b = materialUsage.material) === null || _b === void 0 ? void 0 : _b.name) || 'Unknown Material',
                        quantityNeeded: (_c = materialUsage.quantityNeeded) !== null && _c !== void 0 ? _c : 0,
                        quantityUsed: (_d = materialUsage.quantityUsed) !== null && _d !== void 0 ? _d : 0,
                        estimatedCost: ((_e = materialUsage.unitCost) !== null && _e !== void 0 ? _e : 0) * ((_f = materialUsage.quantityNeeded) !== null && _f !== void 0 ? _f : 0),
                        actualCost: (_g = materialUsage.totalCost) !== null && _g !== void 0 ? _g : 0
                    });
                })) || [],
                recentNotes: [], // You may need to implement this based on your business logic
                progressSummary: yield this.getJobPerformanceMetrics(jobId)
            };
        });
    }
    // Find jobs at risk of delay
    findJobsAtRisk() {
        return __awaiter(this, arguments, void 0, function* (daysThreshold = 7) {
            try {
                const now = new Date();
                const atRiskJobs = yield prismaClient_1.default.job.findMany({
                    where: {
                        status: {
                            // ✅ FIXED: Use correct JobStatus enum values for active jobs
                            in: [client_1.JobStatus.ACTIVE, client_1.JobStatus.IN_PROGRESS] // ✅ FIXED: Use valid JobStatus enum values from database
                        },
                        expectedEndDate: {
                            lte: new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000)
                        }
                    },
                    include: {
                        customer: true,
                        orders: true,
                        history: true, // Correct relation is 'history'
                    }
                });
                return atRiskJobs.map(job => {
                    var _a, _b, _c;
                    // ✅ FIXED: Since no COMPLETED status exists, use most recent history entry
                    const mostRecentHistoryEntry = (_b = (_a = job.history) === null || _a === void 0 ? void 0 : _a.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())) === null || _b === void 0 ? void 0 : _b[0];
                    const actualEndDate = mostRecentHistoryEntry ? mostRecentHistoryEntry.createdAt : null;
                    return {
                        id: job.id,
                        title: job.title,
                        status: job.status,
                        expectedEndDate: job.expectedEndDate,
                        actualEndDate: actualEndDate,
                        customer: ((_c = job.customer) === null || _c === void 0 ? void 0 : _c.name) || 'Unknown Customer',
                        assignedUsers: [], // You may need to implement this based on your business logic
                        projectTitle: job.orders && job.orders.length > 0 ? job.orders[0].projectTitle : undefined,
                        totalCosts: 0 // If totalCosts is calculated, it should be done here or in a separate function
                    };
                });
            }
            catch (error) {
                console.error('Error finding at-risk jobs:', error);
                return []; // Return empty array as fallback
            }
        });
    }
    // Recommend resource allocation
    recommendResourceAllocation(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const job = yield prismaClient_1.default.job.findUnique({
                where: { id: jobId },
                include: {
                    materials: {
                        include: {
                            material: true
                        }
                    }
                }
            });
            if (!job) {
                throw new Error('Job not found');
            }
            // Simple resource recommendation based on material needs
            const resourceRecommendations = ((_a = job.materials) === null || _a === void 0 ? void 0 : _a.map((usage) => {
                var _a;
                const material = usage.material;
                return {
                    materialId: (material === null || material === void 0 ? void 0 : material.id) || '',
                    materialName: (material === null || material === void 0 ? void 0 : material.name) || '',
                    quantityNeeded: (_a = usage.quantityNeeded) !== null && _a !== void 0 ? _a : 0,
                    recommendedStockAction: material && material.currentStock !== undefined && material.reorderPoint !== undefined &&
                        material.currentStock < (material.reorderPoint || 0)
                        ? 'URGENT_REORDER'
                        : 'SUFFICIENT_STOCK'
                };
            })) || [];
            return {
                jobId: job.id,
                resourceRecommendations
            };
        });
    }
}
exports.JobService = JobService;
exports.default = new JobService();
