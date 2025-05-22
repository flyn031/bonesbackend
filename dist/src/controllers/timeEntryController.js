"use strict";
// backend/src/controllers/timeEntryController.ts
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
exports.getEmployeeTimesheet = exports.bulkMarkAsRd = exports.getRdSummary = exports.deleteTimeEntry = exports.updateTimeEntry = exports.getTimeEntryById = exports.getTimeEntries = exports.createTimeEntry = void 0;
const timeEntryService_1 = require("../services/timeEntryService");
const createTimeEntry = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { employeeId, jobId, date, hours, isRdActivity, rdDescription } = req.body;
        // Validation
        if (!employeeId || !jobId || !date || hours === undefined) {
            res.status(400).json({
                message: 'Missing required fields: employeeId, jobId, date, hours'
            });
            return;
        }
        const timeEntry = yield timeEntryService_1.timeEntryService.createTimeEntry({
            employeeId,
            jobId,
            date,
            hours: parseFloat(hours),
            isRdActivity: Boolean(isRdActivity),
            rdDescription,
        });
        res.status(201).json(timeEntry);
    }
    catch (error) {
        console.error('Error creating time entry:', error);
        if (error instanceof Error) {
            res.status(400).json({ message: error.message });
        }
        else {
            res.status(500).json({ message: 'Internal server error' });
        }
    }
});
exports.createTimeEntry = createTimeEntry;
const getTimeEntries = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { employeeId, jobId, startDate, endDate, rdOnly } = req.query;
        const filters = {
            employeeId: employeeId,
            jobId: jobId,
            startDate: startDate,
            endDate: endDate,
            rdOnly: rdOnly === 'true',
        };
        // Remove undefined values
        Object.keys(filters).forEach(key => {
            if (filters[key] === undefined || filters[key] === '') {
                delete filters[key];
            }
        });
        const timeEntries = yield timeEntryService_1.timeEntryService.getTimeEntries(filters);
        res.json(timeEntries);
    }
    catch (error) {
        console.error('Error fetching time entries:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getTimeEntries = getTimeEntries;
const getTimeEntryById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const timeEntry = yield timeEntryService_1.timeEntryService.getTimeEntryById(id);
        res.json(timeEntry);
    }
    catch (error) {
        console.error('Error fetching time entry:', error);
        if (error instanceof Error && error.message === 'Time entry not found') {
            res.status(404).json({ message: error.message });
        }
        else {
            res.status(500).json({ message: 'Internal server error' });
        }
    }
});
exports.getTimeEntryById = getTimeEntryById;
const updateTimeEntry = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { hours, isRdActivity, rdDescription } = req.body;
        const updateData = {};
        if (hours !== undefined)
            updateData.hours = parseFloat(hours);
        if (isRdActivity !== undefined)
            updateData.isRdActivity = Boolean(isRdActivity);
        if (rdDescription !== undefined)
            updateData.rdDescription = rdDescription;
        const timeEntry = yield timeEntryService_1.timeEntryService.updateTimeEntry(id, updateData);
        res.json(timeEntry);
    }
    catch (error) {
        console.error('Error updating time entry:', error);
        if (error instanceof Error) {
            res.status(400).json({ message: error.message });
        }
        else {
            res.status(500).json({ message: 'Internal server error' });
        }
    }
});
exports.updateTimeEntry = updateTimeEntry;
const deleteTimeEntry = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield timeEntryService_1.timeEntryService.deleteTimeEntry(id);
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting time entry:', error);
        if (error instanceof Error && error.message === 'Time entry not found') {
            res.status(404).json({ message: error.message });
        }
        else {
            res.status(500).json({ message: 'Internal server error' });
        }
    }
});
exports.deleteTimeEntry = deleteTimeEntry;
const getRdSummary = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate, employeeId } = req.query;
        if (!startDate || !endDate) {
            res.status(400).json({
                message: 'Start date and end date are required'
            });
            return;
        }
        const summary = yield timeEntryService_1.timeEntryService.getRdSummary(new Date(startDate), new Date(endDate), employeeId);
        res.json(summary);
    }
    catch (error) {
        console.error('Error fetching R&D summary:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getRdSummary = getRdSummary;
const bulkMarkAsRd = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { timeEntryIds, rdDescription } = req.body;
        if (!timeEntryIds || !Array.isArray(timeEntryIds) || timeEntryIds.length === 0) {
            res.status(400).json({
                message: 'timeEntryIds array is required'
            });
            return;
        }
        if (!rdDescription || !rdDescription.trim()) {
            res.status(400).json({
                message: 'R&D description is required for HMRC compliance'
            });
            return;
        }
        const result = yield timeEntryService_1.timeEntryService.bulkMarkAsRd(timeEntryIds, rdDescription);
        res.json({
            message: `${result.count} time entries marked as R&D`,
            updated: result.count
        });
    }
    catch (error) {
        console.error('Error bulk marking as R&D:', error);
        if (error instanceof Error) {
            res.status(400).json({ message: error.message });
        }
        else {
            res.status(500).json({ message: 'Internal server error' });
        }
    }
});
exports.bulkMarkAsRd = bulkMarkAsRd;
const getEmployeeTimesheet = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { employeeId } = req.params;
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            res.status(400).json({
                message: 'Start date and end date are required'
            });
            return;
        }
        const timesheet = yield timeEntryService_1.timeEntryService.getEmployeeTimesheet(employeeId, new Date(startDate), new Date(endDate));
        res.json(timesheet);
    }
    catch (error) {
        console.error('Error fetching employee timesheet:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getEmployeeTimesheet = getEmployeeTimesheet;
