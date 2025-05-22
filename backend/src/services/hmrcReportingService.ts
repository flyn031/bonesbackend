// backend/src/services/hmrcReportingService.ts

import { PrismaClient } from '@prisma/client';
import { timeEntryService } from './timeEntryService';

const prisma = new PrismaClient();

export interface RdProject {
  jobId: string;
  jobTitle: string;
  customerName: string;
  description: string;
  technologicalUncertainties: string[];
  innovationObjectives: string[];
  totalRdHours: number;
  totalRdCost: number;
  employeeBreakdown: Array<{
    employeeId: string;
    employeeName: string;
    jobTitle: string;
    rdHours: number;
    hourlyRate: number;
    rdCost: number;
  }>;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export interface HmrcRdReport {
  reportMetadata: {
    generatedAt: Date;
    reportPeriod: {
      startDate: Date;
      endDate: Date;
    };
    generatedBy: string;
  };
  companyInfo: {
    name?: string;
    vatNumber?: string;
    address?: string;
  };
  executiveSummary: {
    totalQualifyingExpenditure: number;
    totalRdHours: number;
    totalProjects: number;
    totalEmployees: number;
    averageHourlyRate: number;
    rdIntensity: number; // Percentage of total hours that are R&D
  };
  staffCosts: {
    totalStaffCosts: number;
    rdStaffCosts: number;
    employeeSummary: Array<{
      employeeId: string;
      employeeName: string;
      jobTitle: string;
      totalHours: number;
      rdHours: number;
      rdPercentage: number;
      hourlyRate: number;
      totalCost: number;
      rdCost: number;
    }>;
  };
  projectDetails: RdProject[];
  technologicalAdvances: {
    summary: string;
    detailedUncertainties: string[];
    innovationAreas: string[];
  };
  complianceNotes: {
    recordKeeping: string;
    methodology: string;
    limitations: string;
  };
}

class HmrcReportingService {
  /**
   * Standard hourly rates by job title for cost calculations
   * These should ideally be configurable in your system
   */
  private readonly HOURLY_RATES: Record<string, number> = {
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

  /**
   * Get hourly rate for an employee based on job title
   */
  private getHourlyRate(jobTitle: string): number {
    return this.HOURLY_RATES[jobTitle] || 50; // Default rate if not found
  }

  /**
   * Generate comprehensive HMRC R&D tax credit report
   */
  async generateHmrcReport(
    startDate: Date, 
    endDate: Date, 
    generatedBy: string
  ): Promise<HmrcRdReport> {
    // Get all R&D time entries for the period
    const rdTimeEntries = await timeEntryService.getRdTimeEntries(startDate, endDate);
    
    // Get all time entries for context
    const allTimeEntries = await timeEntryService.getTimeEntries({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });

    // Get company information
    const companySettings = await prisma.companySettings.findFirst();
    
    // Calculate summary statistics
    const totalRdHours = rdTimeEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const totalAllHours = allTimeEntries.reduce((sum, entry) => sum + entry.hours, 0);
    
    // Generate project details
    const projectDetails = await this.generateProjectDetails(rdTimeEntries, startDate, endDate);
    
    // Generate staff costs breakdown
    const staffCosts = await this.generateStaffCostsBreakdown(rdTimeEntries, allTimeEntries);
    
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
        name: companySettings?.companyName || 'Your Company Name',
        vatNumber: companySettings?.companyVatNumber || undefined,
        address: companySettings?.companyAddress || undefined,
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
  }

  /**
   * Generate detailed project breakdown for HMRC submission
   */
  private async generateProjectDetails(
    rdTimeEntries: any[], 
    startDate: Date, 
    endDate: Date
  ): Promise<RdProject[]> {
    // Group entries by job
    const projectMap = new Map<string, any[]>();
    
    rdTimeEntries.forEach(entry => {
      if (!projectMap.has(entry.jobId)) {
        projectMap.set(entry.jobId, []);
      }
      projectMap.get(entry.jobId)!.push(entry);
    });

    const projects: RdProject[] = [];

    for (const [jobId, entries] of projectMap) {
      const firstEntry = entries[0];
      
      // Extract unique R&D descriptions as technological uncertainties
      const uncertainties = entries
        .map(e => e.rdDescription)
        .filter((desc, index, arr) => desc && arr.indexOf(desc) === index);

      // Group by employee
      const employeeMap = new Map<string, any[]>();
      entries.forEach(entry => {
        if (!employeeMap.has(entry.employeeId)) {
          employeeMap.set(entry.employeeId, []);
        }
        employeeMap.get(entry.employeeId)!.push(entry);
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
  }

  /**
   * Generate staff costs breakdown
   */
  private async generateStaffCostsBreakdown(rdTimeEntries: any[], allTimeEntries: any[]) {
    // Group all entries by employee
    const employeeMap = new Map<string, { rdEntries: any[], allEntries: any[] }>();
    
    rdTimeEntries.forEach(entry => {
      if (!employeeMap.has(entry.employeeId)) {
        employeeMap.set(entry.employeeId, { rdEntries: [], allEntries: [] });
      }
      employeeMap.get(entry.employeeId)!.rdEntries.push(entry);
    });

    allTimeEntries.forEach(entry => {
      if (!employeeMap.has(entry.employeeId)) {
        employeeMap.set(entry.employeeId, { rdEntries: [], allEntries: [] });
      }
      employeeMap.get(entry.employeeId)!.allEntries.push(entry);
    });

    const employeeSummary = Array.from(employeeMap.entries()).map(([employeeId, data]) => {
      const employee = data.allEntries[0]?.employee || data.rdEntries[0]?.employee;
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
  }

  /**
   * Generate technological advances summary from R&D descriptions
   */
  private generateTechnologicalAdvancesSummary(rdTimeEntries: any[]) {
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
  private extractInnovationAreas(descriptions: string[]): string[] {
    const areas = new Set<string>();
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
  async exportReportToCsv(report: HmrcRdReport): Promise<string> {
    const csvLines: string[] = [];
    
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
  }
}

export const hmrcReportingService = new HmrcReportingService();