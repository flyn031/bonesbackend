"use strict";
// backend/src/services/hmrcReportingService.ts
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
exports.hmrcReportingService = void 0;
const client_1 = require("@prisma/client");
const timeEntryService_1 = require("./timeEntryService");
const prisma = new client_1.PrismaClient();
class HmrcReportingService {
    constructor() {
        /**
         * Standard hourly rates by job title for cost calculations
         * These should ideally be configurable in your system
         */
        this.HOURLY_RATES = {
            'Software Engineer': 45,
            'Senior Software Engineer': 65,
            'Lead Software Engineer': 85,
            'Principal Engineer': 95,
            'Engineering Manager': 90,
            'Product Manager': 70,
            'UX Designer': 55,
            'Data Scientist': 75,
            'DevOps Engineer': 60,
            'QA Engineer': 50,
            'Junior Developer': 35,
            'Intern': 25,
            // Add more as needed, or pull from database
        };
    }
    /**
     * Get hourly rate for an employee based on job title
     */
    getHourlyRate(jobTitle) {
        return this.HOURLY_RATES[jobTitle] || 50; // Default rate if not found
    }
    /**
     * Generate comprehensive HMRC R&D tax credit report
     */
    generateHmrcReport(startDate, endDate, generatedBy) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get all R&D time entries for the period
            const rdTimeEntries = yield timeEntryService_1.timeEntryService.getRdTimeEntries(startDate, endDate);
            // Get all time entries for context
            const allTimeEntries = yield timeEntryService_1.timeEntryService.getTimeEntries({
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
            });
            // Get company information
            const companySettings = yield prisma.companySettings.findFirst();
            // Calculate summary statistics
            const totalRdHours = rdTimeEntries.reduce((sum, entry) => sum + entry.hours, 0);
            const totalAllHours = allTimeEntries.reduce((sum, entry) => sum + entry.hours, 0);
            // Generate project details
            const projectDetails = yield this.generateProjectDetails(rdTimeEntries, startDate, endDate);
            // Generate staff costs breakdown
            const staffCosts = yield this.generateStaffCostsBreakdown(rdTimeEntries, allTimeEntries);
            // Generate technological advances summary
            const technologicalAdvances = this.generateTechnologicalAdvancesSummary(rdTimeEntries);
            // Calculate executive summary
            const executiveSummary = {
                totalQualifyingExpenditure: staffCosts.rdStaffCosts,
                totalRdHours,
                totalProjects: projectDetails.length,
                totalEmployees: new Set(rdTimeEntries.map(e => e.employeeId)).size,
                averageHourlyRate: totalRdHours > 0 ? staffCosts.rdStaffCosts / totalRdHours : 0,
                rdIntensity: totalAllHours > 0 ? (totalRdHours / totalAllHours) * 100 : 0,
            };
            return {
                reportMetadata: {
                    generatedAt: new Date(),
                    reportPeriod: { startDate, endDate },
                    generatedBy,
                },
                companyInfo: {
                    name: (companySettings === null || companySettings === void 0 ? void 0 : companySettings.companyName) || 'Your Company Name',
                    vatNumber: (companySettings === null || companySettings === void 0 ? void 0 : companySettings.companyVatNumber) || undefined,
                    address: (companySettings === null || companySettings === void 0 ? void 0 : companySettings.companyAddress) || undefined,
                },
                executiveSummary,
                staffCosts,
                projectDetails,
                technologicalAdvances,
                complianceNotes: {
                    recordKeeping: 'Time entries recorded contemporaneously with detailed R&D activity descriptions. All entries validated and approved by project leads.',
                    methodology: 'Staff costs calculated using standard hourly rates based on job titles and market rates. R&D activities identified and classified according to HMRC guidelines for technological advancement and uncertainty resolution.',
                    limitations: 'This report covers staff costs only. Additional qualifying costs such as subcontractor fees, consumables, and externally provided workers should be added separately if applicable.',
                },
            };
        });
    }
    /**
     * Generate detailed project breakdown for HMRC submission
     */
    generateProjectDetails(rdTimeEntries, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            // Group entries by job
            const projectMap = new Map();
            rdTimeEntries.forEach(entry => {
                if (!projectMap.has(entry.jobId)) {
                    projectMap.set(entry.jobId, []);
                }
                projectMap.get(entry.jobId).push(entry);
            });
            const projects = [];
            for (const [jobId, entries] of projectMap) {
                const firstEntry = entries[0];
                // Extract unique R&D descriptions as technological uncertainties
                const uncertainties = entries
                    .map(e => e.rdDescription)
                    .filter((desc, index, arr) => desc && arr.indexOf(desc) === index);
                // Group by employee
                const employeeMap = new Map();
                entries.forEach(entry => {
                    if (!employeeMap.has(entry.employeeId)) {
                        employeeMap.set(entry.employeeId, []);
                    }
                    employeeMap.get(entry.employeeId).push(entry);
                });
                const employeeBreakdown = Array.from(employeeMap.entries()).map(([employeeId, empEntries]) => {
                    const employee = empEntries[0].employee;
                    const totalHours = empEntries.reduce((sum, e) => sum + e.hours, 0);
                    const hourlyRate = this.getHourlyRate(employee.jobTitle);
                    return {
                        employeeId,
                        employeeName: employee.name,
                        jobTitle: employee.jobTitle,
                        rdHours: totalHours,
                        hourlyRate,
                        rdCost: totalHours * hourlyRate,
                    };
                });
                const totalRdHours = employeeBreakdown.reduce((sum, e) => sum + e.rdHours, 0);
                const totalRdCost = employeeBreakdown.reduce((sum, e) => sum + e.rdCost, 0);
                projects.push({
                    jobId,
                    jobTitle: firstEntry.job.title,
                    customerName: firstEntry.job.customer.name,
                    description: `R&D project: ${firstEntry.job.title}`,
                    technologicalUncertainties: uncertainties,
                    innovationObjectives: [
                        `Advance technological capabilities in ${firstEntry.job.title}`,
                        'Resolve technical uncertainties through systematic investigation',
                        'Develop innovative solutions not readily available in the field',
                    ],
                    totalRdHours,
                    totalRdCost,
                    employeeBreakdown,
                    period: { startDate, endDate },
                });
            }
            return projects;
        });
    }
    /**
     * Generate staff costs breakdown
     */
    generateStaffCostsBreakdown(rdTimeEntries, allTimeEntries) {
        return __awaiter(this, void 0, void 0, function* () {
            // Group all entries by employee
            const employeeMap = new Map();
            rdTimeEntries.forEach(entry => {
                if (!employeeMap.has(entry.employeeId)) {
                    employeeMap.set(entry.employeeId, { rdEntries: [], allEntries: [] });
                }
                employeeMap.get(entry.employeeId).rdEntries.push(entry);
            });
            allTimeEntries.forEach(entry => {
                if (!employeeMap.has(entry.employeeId)) {
                    employeeMap.set(entry.employeeId, { rdEntries: [], allEntries: [] });
                }
                employeeMap.get(entry.employeeId).allEntries.push(entry);
            });
            const employeeSummary = Array.from(employeeMap.entries()).map(([employeeId, data]) => {
                var _a, _b;
                const employee = ((_a = data.allEntries[0]) === null || _a === void 0 ? void 0 : _a.employee) || ((_b = data.rdEntries[0]) === null || _b === void 0 ? void 0 : _b.employee);
                const totalHours = data.allEntries.reduce((sum, e) => sum + e.hours, 0);
                const rdHours = data.rdEntries.reduce((sum, e) => sum + e.hours, 0);
                const hourlyRate = this.getHourlyRate(employee.jobTitle);
                return {
                    employeeId,
                    employeeName: employee.name,
                    jobTitle: employee.jobTitle,
                    totalHours,
                    rdHours,
                    rdPercentage: totalHours > 0 ? (rdHours / totalHours) * 100 : 0,
                    hourlyRate,
                    totalCost: totalHours * hourlyRate,
                    rdCost: rdHours * hourlyRate,
                };
            });
            const totalStaffCosts = employeeSummary.reduce((sum, e) => sum + e.totalCost, 0);
            const rdStaffCosts = employeeSummary.reduce((sum, e) => sum + e.rdCost, 0);
            return {
                totalStaffCosts,
                rdStaffCosts,
                employeeSummary,
            };
        });
    }
    /**
     * Generate technological advances summary from R&D descriptions
     */
    generateTechnologicalAdvancesSummary(rdTimeEntries) {
        const allDescriptions = rdTimeEntries
            .map(e => e.rdDescription)
            .filter(desc => desc && desc.trim());
        // Extract unique technological uncertainties
        const detailedUncertainties = allDescriptions
            .filter((desc, index, arr) => arr.indexOf(desc) === index);
        // Generate innovation areas based on common themes
        const innovationAreas = this.extractInnovationAreas(allDescriptions);
        return {
            summary: `During this period, the company conducted R&D activities across ${detailedUncertainties.length} distinct technological challenges, involving ${new Set(rdTimeEntries.map(e => e.employeeId)).size} qualified technical personnel.`,
            detailedUncertainties,
            innovationAreas,
        };
    }
    /**
     * Extract innovation areas from R&D descriptions using keyword analysis
     */
    extractInnovationAreas(descriptions) {
        const areas = new Set();
        const text = descriptions.join(' ').toLowerCase();
        // Common R&D innovation areas - extend this based on your business
        const areaKeywords = {
            'Machine Learning/AI': ['machine learning', 'artificial intelligence', 'ai', 'neural network', 'deep learning'],
            'Cloud Computing': ['cloud', 'aws', 'azure', 'scalability', 'distributed'],
            'Software Architecture': ['architecture', 'design pattern', 'framework', 'system design'],
            'Data Processing': ['data processing', 'big data', 'analytics', 'algorithm'],
            'User Experience': ['user experience', 'ux', 'interface', 'usability'],
            'Security': ['security', 'encryption', 'authentication', 'vulnerability'],
            'Performance Optimization': ['performance', 'optimization', 'efficiency', 'speed'],
            'Integration': ['integration', 'api', 'interoperability', 'connectivity'],
        };
        Object.entries(areaKeywords).forEach(([area, keywords]) => {
            if (keywords.some(keyword => text.includes(keyword))) {
                areas.add(area);
            }
        });
        return Array.from(areas);
    }
    /**
     * Export report to CSV format suitable for HMRC submission
     */
    exportReportToCsv(report) {
        return __awaiter(this, void 0, void 0, function* () {
            const csvLines = [];
            // Report header
            csvLines.push('HMRC R&D Tax Credit Report');
            csvLines.push(`Generated: ${report.reportMetadata.generatedAt.toISOString()}`);
            csvLines.push(`Period: ${report.reportMetadata.reportPeriod.startDate.toDateString()} to ${report.reportMetadata.reportPeriod.endDate.toDateString()}`);
            csvLines.push('');
            // Executive Summary
            csvLines.push('Executive Summary');
            csvLines.push(`Total Qualifying Expenditure,£${report.executiveSummary.totalQualifyingExpenditure.toFixed(2)}`);
            csvLines.push(`Total R&D Hours,${report.executiveSummary.totalRdHours}`);
            csvLines.push(`Total Projects,${report.executiveSummary.totalProjects}`);
            csvLines.push(`Total Employees,${report.executiveSummary.totalEmployees}`);
            csvLines.push(`Average Hourly Rate,£${report.executiveSummary.averageHourlyRate.toFixed(2)}`);
            csvLines.push(`R&D Intensity,${report.executiveSummary.rdIntensity.toFixed(1)}%`);
            csvLines.push('');
            // Staff Costs
            csvLines.push('Staff Costs Breakdown');
            csvLines.push('Employee,Job Title,Total Hours,R&D Hours,R&D %,Hourly Rate,Total Cost,R&D Cost');
            report.staffCosts.employeeSummary.forEach(emp => {
                csvLines.push([
                    emp.employeeName,
                    emp.jobTitle,
                    emp.totalHours.toString(),
                    emp.rdHours.toString(),
                    emp.rdPercentage.toFixed(1) + '%',
                    '£' + emp.hourlyRate.toFixed(2),
                    '£' + emp.totalCost.toFixed(2),
                    '£' + emp.rdCost.toFixed(2),
                ].join(','));
            });
            csvLines.push('');
            // Project Details
            csvLines.push('Project Details');
            report.projectDetails.forEach(project => {
                csvLines.push(`Project: ${project.jobTitle}`);
                csvLines.push(`Customer: ${project.customerName}`);
                csvLines.push(`Total R&D Hours: ${project.totalRdHours}`);
                csvLines.push(`Total R&D Cost: £${project.totalRdCost.toFixed(2)}`);
                csvLines.push('Technological Uncertainties:');
                project.technologicalUncertainties.forEach(uncertainty => {
                    csvLines.push(`"${uncertainty}"`);
                });
                csvLines.push('');
            });
            return csvLines.join('\n');
        });
    }
}
exports.hmrcReportingService = new HmrcReportingService();
