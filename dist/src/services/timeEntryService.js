"use strict";
// backend/src/services/timeEntryService.ts
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
exports.timeEntryService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class TimeEntryService {
    /**
     * Create a new time entry
     */
    createTimeEntry(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            // Validation
            if (data.hours <= 0 || data.hours > 24) {
                throw new Error('Hours must be between 0 and 24');
            }
            if (data.isRdActivity && !((_a = data.rdDescription) === null || _a === void 0 ? void 0 : _a.trim())) {
                throw new Error('R&D activities require a description for HMRC compliance');
            }
            // Check if employee exists
            const employee = yield prisma.employee.findUnique({
                where: { id: data.employeeId },
            });
            if (!employee) {
                throw new Error('Employee not found');
            }
            // Check if job exists
            const job = yield prisma.job.findUnique({
                where: { id: data.jobId },
            });
            if (!job) {
                throw new Error('Job not found');
            }
            // Check for duplicate entry on same date for same employee/job
            const existingEntry = yield prisma.timeEntry.findFirst({
                where: {
                    employeeId: data.employeeId,
                    jobId: data.jobId,
                    date: new Date(data.date),
                },
            });
            if (existingEntry) {
                throw new Error('Time entry already exists for this employee, job, and date');
            }
            return prisma.timeEntry.create({
                data: {
                    employeeId: data.employeeId,
                    jobId: data.jobId,
                    date: new Date(data.date),
                    hours: data.hours,
                    isRdActivity: data.isRdActivity,
                    rdDescription: ((_b = data.rdDescription) === null || _b === void 0 ? void 0 : _b.trim()) || null,
                },
                include: {
                    employee: {
                        select: {
                            name: true,
                            jobTitle: true,
                        },
                    },
                    job: {
                        select: {
                            title: true,
                            customer: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                },
            });
        });
    }
    /**
     * Get time entries with filters
     */
    getTimeEntries() {
        return __awaiter(this, arguments, void 0, function* (filters = {}) {
            const where = {};
            if (filters.employeeId) {
                where.employeeId = filters.employeeId;
            }
            if (filters.jobId) {
                where.jobId = filters.jobId;
            }
            if (filters.startDate || filters.endDate) {
                where.date = {};
                if (filters.startDate) {
                    where.date.gte = new Date(filters.startDate);
                }
                if (filters.endDate) {
                    where.date.lte = new Date(filters.endDate);
                }
            }
            if (filters.rdOnly) {
                where.isRdActivity = true;
            }
            return prisma.timeEntry.findMany({
                where,
                include: {
                    employee: {
                        select: {
                            name: true,
                            jobTitle: true,
                        },
                    },
                    job: {
                        select: {
                            title: true,
                            customer: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    date: 'desc',
                },
            });
        });
    }
    /**
     * Get time entry by ID
     */
    getTimeEntryById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const timeEntry = yield prisma.timeEntry.findUnique({
                where: { id },
                include: {
                    employee: {
                        select: {
                            name: true,
                            jobTitle: true,
                        },
                    },
                    job: {
                        select: {
                            title: true,
                            customer: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                },
            });
            if (!timeEntry) {
                throw new Error('Time entry not found');
            }
            return timeEntry;
        });
    }
    /**
     * Update time entry
     */
    updateTimeEntry(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get existing entry
            const existing = yield this.getTimeEntryById(id);
            // Validation
            if (data.hours !== undefined && (data.hours <= 0 || data.hours > 24)) {
                throw new Error('Hours must be between 0 and 24');
            }
            const isRdActivity = data.isRdActivity !== undefined ? data.isRdActivity : existing.isRdActivity;
            const rdDescription = data.rdDescription !== undefined ? data.rdDescription : existing.rdDescription;
            if (isRdActivity && !(rdDescription === null || rdDescription === void 0 ? void 0 : rdDescription.trim())) {
                throw new Error('R&D activities require a description for HMRC compliance');
            }
            return prisma.timeEntry.update({
                where: { id },
                data: {
                    hours: data.hours,
                    isRdActivity: data.isRdActivity,
                    rdDescription: (rdDescription === null || rdDescription === void 0 ? void 0 : rdDescription.trim()) || null,
                },
                include: {
                    employee: {
                        select: {
                            name: true,
                            jobTitle: true,
                        },
                    },
                    job: {
                        select: {
                            title: true,
                            customer: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                },
            });
        });
    }
    /**
     * Delete time entry
     */
    deleteTimeEntry(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const existing = yield this.getTimeEntryById(id);
            return prisma.timeEntry.delete({
                where: { id },
            });
        });
    }
    /**
     * Get R&D time entries for HMRC reporting
     */
    getRdTimeEntries(startDate, endDate, employeeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const where = {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                isRdActivity: true,
            };
            if (employeeId) {
                where.employeeId = employeeId;
            }
            return prisma.timeEntry.findMany({
                where,
                include: {
                    employee: {
                        select: {
                            name: true,
                            jobTitle: true,
                        },
                    },
                    job: {
                        select: {
                            title: true,
                            customer: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                },
                orderBy: [
                    { jobId: 'asc' },
                    { date: 'asc' },
                ],
            });
        });
    }
    /**
     * Get R&D summary statistics
     */
    getRdSummary(startDate, endDate, employeeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const where = {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            };
            if (employeeId) {
                where.employeeId = employeeId;
            }
            // Get all time entries for the period
            const allEntries = yield prisma.timeEntry.findMany({
                where,
                select: {
                    hours: true,
                    isRdActivity: true,
                    employeeId: true,
                    jobId: true,
                },
            });
            // Get R&D entries only
            const rdEntries = allEntries.filter(entry => entry.isRdActivity);
            // Calculate totals
            const totalHours = allEntries.reduce((sum, entry) => sum + entry.hours, 0);
            const rdHours = rdEntries.reduce((sum, entry) => sum + entry.hours, 0);
            const rdPercentage = totalHours > 0 ? (rdHours / totalHours) * 100 : 0;
            // Get unique employees and jobs involved in R&D
            const uniqueEmployees = new Set(rdEntries.map(entry => entry.employeeId));
            const uniqueJobs = new Set(rdEntries.map(entry => entry.jobId));
            return {
                totalHours,
                rdHours,
                rdPercentage,
                totalEntries: allEntries.length,
                rdEntries: rdEntries.length,
                uniqueEmployees: uniqueEmployees.size,
                uniqueJobs: uniqueJobs.size,
            };
        });
    }
    /**
     * Bulk mark time entries as R&D
     */
    bulkMarkAsRd(timeEntryIds, rdDescription) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!rdDescription.trim()) {
                throw new Error('R&D description is required for HMRC compliance');
            }
            return prisma.timeEntry.updateMany({
                where: {
                    id: {
                        in: timeEntryIds,
                    },
                },
                data: {
                    isRdActivity: true,
                    rdDescription: rdDescription.trim(),
                },
            });
        });
    }
    /**
     * Get time entries by employee for a specific period
     */
    getEmployeeTimesheet(employeeId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma.timeEntry.findMany({
                where: {
                    employeeId,
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                include: {
                    job: {
                        select: {
                            title: true,
                            customer: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    date: 'asc',
                },
            });
        });
    }
}
exports.timeEntryService = new TimeEntryService();
