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
exports.getSupplierFinancialPerformance = exports.getFinancialSummary = void 0;
const financialReportingService_1 = require("../services/financialReportingService");
const financialReportService = new financialReportingService_1.FinancialReportingService();
const getFinancialSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
        const summary = yield financialReportService.getOverallFinancialSummary(startDate, endDate);
        res.json(summary);
    }
    catch (error) {
        console.error('Financial summary generation error:', error);
        res.status(500).json({ error: 'Failed to generate financial summary' });
    }
});
exports.getFinancialSummary = getFinancialSummary;
const getSupplierFinancialPerformance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const performanceReport = yield financialReportService.getSupplierFinancialPerformance();
        res.json(performanceReport);
    }
    catch (error) {
        console.error('Supplier financial performance error:', error);
        res.status(500).json({ error: 'Failed to generate supplier financial performance' });
    }
});
exports.getSupplierFinancialPerformance = getSupplierFinancialPerformance;
