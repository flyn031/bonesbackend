// backend/src/services/jobService.ts
import prisma from '../utils/prismaClient';
import dayjs from 'dayjs';
import { JobStatus, Prisma, Job, Material } from '@prisma/client'; // Import needed types

// Define types for included relations to help TypeScript
type JobWithRelations = Prisma.JobGetPayload<{
  include: {
    orders: true;
    materials: { include: { material: true } }; // Correct relation is 'materials' not 'materialUsed'
    customer: true;
    history: true; // Correct relation is 'history' not 'jobHistory'
  };
}>;

// Extend Material type for the include in recommendResourceAllocation
type MaterialWithStock = Prisma.MaterialGetPayload<{
  select: {
    id: true;
    name: true;
    currentStock: true; // Correct field name is currentStock
    reorderPoint: true;
  }
}>;

export class JobService {
  // Calculate job performance metrics
  async getJobPerformanceMetrics(jobId: string) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        orders: true,
        materials: { // Correct field is 'materials' not 'materialUsed'
          include: { material: true }
        },
        history: true, // Correct field is 'history' not 'jobHistory'
      }
    });

    if (!job) {
      throw new Error('Job not found');
    }

    // ✅ FIXED: Since no COMPLETED status exists, use most recent history entry for end date
    const mostRecentHistoryEntry = job.history?.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )?.[0];
    const actualEndDate = mostRecentHistoryEntry ? dayjs(mostRecentHistoryEntry.createdAt) : dayjs();

    // Calculate actual vs estimated duration
    const startDate = job.startDate ? dayjs(job.startDate) : null;
    const endDate = actualEndDate; // Use the derived actualEndDate
    const estimatedDuration = job.expectedEndDate && startDate
      ? dayjs(job.expectedEndDate).diff(startDate, 'hour')
      : 0;
    const actualDuration = startDate ? endDate.diff(startDate, 'hour') : 0;

    // Calculate material usage efficiency
    // Explicitly typing the reducer parameters
    const materialCosts = job.materials?.reduce((total: number, materialUsage) => {
      // Safely access actual or estimated cost with optional chaining
      return total + (materialUsage.totalCost || 0);
    }, 0) || 0;

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
        itemsUsed: job.materials?.length || 0
      },
      performance: {
        durationVariancePercentage: estimatedDuration
          ? ((actualDuration - estimatedDuration) / estimatedDuration) * 100
          : 0,
        isBehindSchedule: actualDuration > estimatedDuration
      }
    };
  }

  // Generate job progress report
  async generateJobProgressReport(jobId: string) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        customer: true,
        orders: true,
        materials: { // Correct relation is 'materials'
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
    const mostRecentHistoryEntry = job.history?.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )?.[0];
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
        id: job.customer?.id || '',
        name: job.customer?.name || 'Unknown Customer'
      },
      order: job.orders && job.orders.length > 0 ? {
        id: job.orders[0].id,
        projectTitle: job.orders[0].projectTitle
      } : undefined,
      assignedTeam: [], // You may need to implement this based on your business logic
      materials: job.materials?.map((materialUsage) => ({
        materialId: materialUsage.material?.id || '',
        materialName: materialUsage.material?.name || 'Unknown Material',
        quantityNeeded: materialUsage.quantityNeeded ?? 0,
        quantityUsed: materialUsage.quantityUsed ?? 0,
        estimatedCost: (materialUsage.unitCost ?? 0) * (materialUsage.quantityNeeded ?? 0),
        actualCost: materialUsage.totalCost ?? 0
      })) || [],
      recentNotes: [], // You may need to implement this based on your business logic
      progressSummary: await this.getJobPerformanceMetrics(jobId)
    };
  }

  // Find jobs at risk of delay
  async findJobsAtRisk(daysThreshold: number = 7) {
    try {
      const now = new Date();

      const atRiskJobs = await prisma.job.findMany({
        where: {
          status: {
            // ✅ FIXED: Use correct JobStatus enum values for active jobs
            in: [JobStatus.ACTIVE, JobStatus.IN_PROGRESS] // ✅ FIXED: Use valid JobStatus enum values from database
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
        // ✅ FIXED: Since no COMPLETED status exists, use most recent history entry
        const mostRecentHistoryEntry = job.history?.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )?.[0];
        const actualEndDate = mostRecentHistoryEntry ? mostRecentHistoryEntry.createdAt : null;

        return {
          id: job.id,
          title: job.title,
          status: job.status,
          expectedEndDate: job.expectedEndDate,
          actualEndDate: actualEndDate,
          customer: job.customer?.name || 'Unknown Customer',
          assignedUsers: [], // You may need to implement this based on your business logic
          projectTitle: job.orders && job.orders.length > 0 ? job.orders[0].projectTitle : undefined,
          totalCosts: 0 // If totalCosts is calculated, it should be done here or in a separate function
        };
      });
    } catch (error) {
      console.error('Error finding at-risk jobs:', error);
      return []; // Return empty array as fallback
    }
  }

  // Recommend resource allocation
  async recommendResourceAllocation(jobId: string) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        materials: { // Correct relation is 'materials'
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
    const resourceRecommendations = job.materials?.map((usage) => {
      const material = usage.material;
      return {
        materialId: material?.id || '',
        materialName: material?.name || '',
        quantityNeeded: usage.quantityNeeded ?? 0,
        recommendedStockAction:
          material && material.currentStock !== undefined && material.reorderPoint !== undefined && 
          material.currentStock < (material.reorderPoint || 0)
            ? 'URGENT_REORDER'
            : 'SUFFICIENT_STOCK'
      };
    }) || [];

    return {
      jobId: job.id,
      resourceRecommendations
    };
  }
}

export default new JobService();