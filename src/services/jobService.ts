import prisma from '../utils/prismaClient';
import dayjs from 'dayjs';

export class JobService {
  // Calculate job performance metrics
  async getJobPerformanceMetrics(jobId: string) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        orders: true,
        materialUsed: true
      }
    });

    if (!job) {
      throw new Error('Job not found');
    }

    // Calculate actual vs estimated duration
    const startDate = job.startDate ? dayjs(job.startDate) : null;
    const endDate = job.actualEndDate ? dayjs(job.actualEndDate) : dayjs();
    const estimatedDuration = job.expectedEndDate 
      ? dayjs(job.expectedEndDate).diff(startDate, 'hour')
      : 0;
    const actualDuration = startDate ? endDate.diff(startDate, 'hour') : 0;

    // Calculate material usage efficiency
    const materialCosts = job.materialUsed.reduce((total, material) => {
      return total + (material.actualCost || material.estimatedCost || 0);
    }, 0);

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
        itemsUsed: job.materialUsed.length
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
        assignedUsers: {
          include: {
            user: true
          }
        },
        materialUsed: {
          include: {
            material: true
          }
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!job) {
      throw new Error('Job not found');
    }

    return {
      jobDetails: {
        id: job.id,
        title: job.title,
        description: job.description,
        status: job.status,
        startDate: job.startDate,
        expectedEndDate: job.expectedEndDate,
        actualEndDate: job.actualEndDate
      },
      customer: {
        id: job.customer.id,
        name: job.customer.name
      },
      order: {
        id: job.orders[0]?.id,
        projectTitle: job.orders[0]?.projectTitle
      },
      assignedTeam: job.assignedUsers.map(assignment => ({
        id: assignment.user.id,
        name: assignment.user.name
      })),
      materials: job.materialUsed.map(materialUsage => ({
        materialId: materialUsage.material.id,
        materialName: materialUsage.material.name,
        quantityUsed: materialUsage.quantityUsed,
        estimatedCost: materialUsage.estimatedCost,
        actualCost: materialUsage.actualCost
      })),
      recentNotes: job.notes.map(note => ({
        content: note.content,
        createdAt: note.createdAt,
        authorName: note.authorId // You might want to include author details
      })),
      progressSummary: await this.getJobPerformanceMetrics(jobId)
    };
  }

  // Find jobs at risk of delay - Fixed to avoid totalCosts issue
  async findJobsAtRisk(daysThreshold: number = 7) {
    try {
      const now = new Date();
      
      const atRiskJobs = await prisma.job.findMany({
        where: {
          status: {
            in: ['PENDING', 'IN_PROGRESS']
          },
          expectedEndDate: {
            lte: new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000)
          }
        },
        include: {
          customer: true,
          orders: true,
          assignedUsers: {
            include: {
              user: true
            }
          }
        }
      });

      return atRiskJobs.map(job => ({
        id: job.id,
        title: job.title,
        status: job.status,
        expectedEndDate: job.expectedEndDate,
        customer: job.customer.name,
        assignedUsers: job.assignedUsers.map(a => a.user.name),
        projectTitle: job.orders[0]?.projectTitle,
        totalCosts: 0 // Add the totalCosts field manually
      }));
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
        materialUsed: {
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
    const resourceRecommendations = job.materialUsed.map(usage => ({
      materialId: usage.material.id,
      materialName: usage.material.name,
      quantityNeeded: usage.quantityUsed,
      recommendedStockAction: 
        usage.material.currentStockLevel < usage.quantityUsed 
          ? 'URGENT_REORDER' 
          : 'SUFFICIENT_STOCK'
    }));

    return {
      jobId: job.id,
      resourceRecommendations
    };
  }
}

export default new JobService();