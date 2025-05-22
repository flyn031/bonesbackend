// backend/src/services/timeEntryService.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateTimeEntryInput {
  employeeId: string;
  jobId: string;
  date: string; // ISO date string
  hours: number;
  isRdActivity: boolean;
  rdDescription?: string;
}

export interface UpdateTimeEntryInput {
  hours?: number;
  isRdActivity?: boolean;
  rdDescription?: string;
}

export interface TimeEntryFilters {
  employeeId?: string;
  jobId?: string;
  startDate?: string;
  endDate?: string;
  rdOnly?: boolean;
}

class TimeEntryService {
  /**
   * Create a new time entry
   */
  async createTimeEntry(data: CreateTimeEntryInput) {
    // Validation
    if (data.hours <= 0 || data.hours > 24) {
      throw new Error('Hours must be between 0 and 24');
    }

    if (data.isRdActivity && !data.rdDescription?.trim()) {
      throw new Error('R&D activities require a description for HMRC compliance');
    }

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    // Check if job exists
    const job = await prisma.job.findUnique({
      where: { id: data.jobId },
    });

    if (!job) {
      throw new Error('Job not found');
    }

    // Check for duplicate entry on same date for same employee/job
    const existingEntry = await prisma.timeEntry.findFirst({
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
        rdDescription: data.rdDescription?.trim() || null,
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
  }

  /**
   * Get time entries with filters
   */
  async getTimeEntries(filters: TimeEntryFilters = {}) {
    const where: any = {};

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
  }

  /**
   * Get time entry by ID
   */
  async getTimeEntryById(id: string) {
    const timeEntry = await prisma.timeEntry.findUnique({
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
  }

  /**
   * Update time entry
   */
  async updateTimeEntry(id: string, data: UpdateTimeEntryInput) {
    // Get existing entry
    const existing = await this.getTimeEntryById(id);

    // Validation
    if (data.hours !== undefined && (data.hours <= 0 || data.hours > 24)) {
      throw new Error('Hours must be between 0 and 24');
    }

    const isRdActivity = data.isRdActivity !== undefined ? data.isRdActivity : existing.isRdActivity;
    const rdDescription = data.rdDescription !== undefined ? data.rdDescription : existing.rdDescription;

    if (isRdActivity && !rdDescription?.trim()) {
      throw new Error('R&D activities require a description for HMRC compliance');
    }

    return prisma.timeEntry.update({
      where: { id },
      data: {
        hours: data.hours,
        isRdActivity: data.isRdActivity,
        rdDescription: rdDescription?.trim() || null,
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
  }

  /**
   * Delete time entry
   */
  async deleteTimeEntry(id: string) {
    const existing = await this.getTimeEntryById(id);
    
    return prisma.timeEntry.delete({
      where: { id },
    });
  }

  /**
   * Get R&D time entries for HMRC reporting
   */
  async getRdTimeEntries(startDate: Date, endDate: Date, employeeId?: string) {
    const where: any = {
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
  }

  /**
   * Get R&D summary statistics
   */
  async getRdSummary(startDate: Date, endDate: Date, employeeId?: string) {
    const where: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    // Get all time entries for the period
    const allEntries = await prisma.timeEntry.findMany({
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
  }

  /**
   * Bulk mark time entries as R&D
   */
  async bulkMarkAsRd(timeEntryIds: string[], rdDescription: string) {
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
  }

  /**
   * Get time entries by employee for a specific period
   */
  async getEmployeeTimesheet(employeeId: string, startDate: Date, endDate: Date) {
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
  }
}

export const timeEntryService = new TimeEntryService();