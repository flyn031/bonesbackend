// backend/src/controllers/jobController.ts

import prisma from '../utils/prismaClient';
import { Response } from 'express'; // NextFunction removed as not used
import { AuthRequest } from '../middleware/authMiddleware';
import { JobStatus, Prisma, Role as PrismaRole } from '@prisma/client';

// --- Controller Functions ---

export const createJob = async (req: AuthRequest, res: Response) => {
  try {
    console.log("[JobController][createJob] Request body:", req.body);

    const {
      title,
      description,
      orderId,
      customerId,
      status,
      startDate,
      expectedEndDate,
      // estimatedCost, // This field is not on the Job model in your schema. Add to schema or handle via JobCost.
      // assignedUserIds // Relation 'assignedUsers' is not on Job model in your schema.
    } = req.body;

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    // Adjusted required fields: estimatedCost is removed as it's not in schema.
    if (!title || !expectedEndDate) {
      return res.status(400).json({ message: 'Missing required fields: title, expectedEndDate' });
    }
    if (!orderId && !customerId) {
        return res.status(400).json({ message: 'Either Order ID or Customer ID must be provided' });
    }
    
    // const parsedEstimatedCost = parseFloat(estimatedCost); // Only if estimatedCost is part of req and Job model
    // if (estimatedCost !== undefined && isNaN(parsedEstimatedCost)) {
    //     return res.status(400).json({ message: 'Invalid format for estimatedCost. Must be a number.' });
    // }

    let validExpectedEndDate: Date;
    try {
        validExpectedEndDate = new Date(expectedEndDate);
        if (isNaN(validExpectedEndDate.getTime())) throw new Error('Invalid date');
    } catch (e) {
        return res.status(400).json({ message: 'Invalid format for expectedEndDate. Please use a valid date format.' });
    }

    let determinedCustomerId: string | undefined = undefined;
    let orderConnect: Prisma.OrderCreateNestedManyWithoutJobInput | undefined = undefined;

    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { customerId: true, customerName: true, contactEmail: true, contactPhone: true, id: true }
      });

      if (!order) {
        return res.status(404).json({ message: `Order with ID ${orderId} not found` });
      }
      console.log("[JobController][createJob] Found order:", order.id);
      orderConnect = { connect: { id: orderId } };
      determinedCustomerId = order.customerId ?? undefined;

      if (!determinedCustomerId && order.customerName) {
           console.log(`[JobController][createJob] Order ${orderId} has no linked customerId. Trying to find/create customer: ${order.customerName}`);
           let existingCustomer = await prisma.customer.findFirst({ where: { name: order.customerName } });
           if (!existingCustomer && order.contactEmail) {
                existingCustomer = await prisma.customer.findUnique({ where: { email: order.contactEmail }});
           }
           if (existingCustomer) {
               determinedCustomerId = existingCustomer.id;
               console.log(`[JobController][createJob] Linked to existing customer by name/email: ${existingCustomer.id}`);
           } else {
               try {
                 const newCustomer = await prisma.customer.create({
                     data: {
                         name: order.customerName,
                         email: order.contactEmail || `${order.customerName.replace(/\s+/g, '.').toLowerCase()}_job_auto@example.com`,
                         phone: order.contactPhone || undefined,
                         status: "ACTIVE",
                     }
                 });
                 determinedCustomerId = newCustomer.id;
                 console.log(`[JobController][createJob] Created new customer from order details: ${newCustomer.id}`);
               } catch(custCreateError) {
                 console.error("[JobController][createJob] Error creating customer from order details:", custCreateError);
                 return res.status(500).json({ message: "Failed to auto-create customer for the order."});
               }
           }
       }
    }

    if (customerId && !determinedCustomerId) {
        const customer = await prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) {
            return res.status(404).json({ message: `Customer with ID ${customerId} not found` });
        }
        determinedCustomerId = customer.id;
        console.log(`[JobController][createJob] Using directly provided customerId: ${customerId}`);
    }

    if (!determinedCustomerId) {
        return res.status(400).json({ message: 'Could not determine a customer to link the job to.' });
    }

    const jobData: Prisma.JobCreateInput = {
      title,
      description: description || undefined,
      status: (status as JobStatus) || JobStatus.DRAFT, // ✅ FIXED: Default to DRAFT (new jobs start as drafts)
      startDate: startDate ? new Date(startDate) : new Date(),
      expectedEndDate: validExpectedEndDate,
      // estimatedCost: parsedEstimatedCost, // Add if 'estimatedCost' is on Job model
      customer: { connect: { id: determinedCustomerId } },
      ...(orderConnect && { orders: orderConnect }),
      // createdBy is not on Job model.
      // assignedUsers relation is not defined in schema.
    };

    const newJob = await prisma.job.create({
      data: jobData,
      include: {
        customer: { select: { id: true, name: true } },
        orders: { select: { id: true, projectTitle: true } },
      }
    });
    console.log("[JobController][createJob] Job created successfully:", newJob.id);

    if (orderId) {
      try {
          // ✅ FIXED: Only link the job, don't change order status
          // Order status is managed by orderController - orders stay APPROVED
          await prisma.order.update({
              where: { id: orderId },
              data: { jobId: newJob.id }
          });
          console.log(`[JobController][createJob] Linked job ${newJob.id} to order ${orderId}`);
      } catch (orderUpdateError) {
           console.error(`[JobController][createJob] Failed to update order ${orderId}:`, orderUpdateError);
      }
    }
    return res.status(201).json(newJob);

  } catch (error: any) {
    console.error('[JobController][createJob] Error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
             return res.status(400).json({ message: `Invalid input: A related record (e.g., customer) was not found. Field: ${error.meta?.field_name}` });
        }
        if (error.code === 'P2002') {
            return res.status(400).json({ message: `A job with this unique information already exists. Field: ${error.meta?.target}` });
       }
         return res.status(400).json({ message: `Database error. Code: ${error.code}` });
    }
    return res.status(500).json({ message: 'Failed to create job.', details: error.message });
  }
};

export const getJobs = async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 10, sortBy = 'expectedEndDate', order = 'asc', customerId, searchTerm } = req.query;
    console.log(`[JobController][getJobs] Filters: status=${status}, page=${page}, limit=${limit}, sortBy=${sortBy}, order=${order}, customerId=${customerId}, searchTerm=${searchTerm}`);

    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.JobWhereInput = {};
    if (status && typeof status === 'string' && Object.values(JobStatus).includes(status as JobStatus)) {
        where.status = status as JobStatus;
    }
    if (customerId && typeof customerId === 'string') {
        where.customerId = customerId;
    }
    if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim() !== '') {
        const term = searchTerm.trim();
        where.OR = [
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
            { id: { equals: term } }, // Exact match for ID
            { customer: { name: { contains: term, mode: 'insensitive' } } },
        ];
    }

    const validSortFields = ['title', 'createdAt', 'expectedEndDate', 'status'];
    const sortField = validSortFields.includes(String(sortBy)) ? String(sortBy) : 'expectedEndDate';
    const sortOrder = String(order).toLowerCase() === 'desc' ? 'desc' : 'asc';
    
    // FIX: Use a properly typed object for orderBy
    const orderBy: Prisma.JobOrderByWithRelationInput = {};
    // Create a typed object for dynamic property access
    const typedOrderBy: Record<string, Prisma.SortOrder> = {};
    typedOrderBy[sortField] = sortOrder as Prisma.SortOrder;
    
    if (sortField === 'expectedEndDate') { // Handle nulls for expectedEndDate
        orderBy.expectedEndDate = { sort: sortOrder as Prisma.SortOrder, nulls: sortOrder === 'asc' ? 'last' : 'first'};
    } else {
        // Use the typed object to assign to orderBy
        Object.assign(orderBy, typedOrderBy);
    }

    const jobs = await prisma.job.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        expectedEndDate: true,
        // estimatedCost: true, // REMOVED
        status: true,
        customer: { select: { id: true, name: true } },
        costs: { select: { amount: true } },
        _count: { select: { orders: true, materials: true }}
      },
      skip: skip,
      take: limitNum,
      orderBy: [orderBy] // orderBy should be an array
    });

    const totalJobs = await prisma.job.count({ where });

    const augmentedJobs = jobs.map(job => {
        const totalActualCost = job.costs.reduce((sum, cost) => sum + cost.amount, 0);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { costs, ...jobWithoutCosts } = job;
        return { 
          ...jobWithoutCosts, 
          totalActualCost, 
          orderCount: job._count.orders,
          materialCount: job._count.materials 
        };
    });

    res.status(200).json({
      jobs: augmentedJobs,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalJobs / limitNum),
        totalItems: totalJobs,
        pageSize: limitNum
      }
    });

  } catch (error: any) {
    console.error('[JobController][getJobs] Error:', error);
    res.status(500).json({ message: 'Failed to fetch jobs.', error: error.message });
  }
};

export const updateJob = async (req: AuthRequest, res: Response) => {
  try {
    const { id: jobId } = req.params;
    const userId = req.user?.id;
    const {
      title, description, status, startDate, expectedEndDate, customerId,
      // estimatedCost, actualEndDate, actualCost, assignedUserIds (fields not on Job model or relations not defined)
    } = req.body;
    console.log(`[JobController][updateJob] Attempting for job ${jobId} by user ${userId}. Body:`, req.body);

     if (!userId) return res.status(401).json({ message: 'User not authenticated' });

    const currentJob = await prisma.job.findUnique({ where: { id: jobId } });
    if (!currentJob) return res.status(404).json({ message: 'Job not found' });

    const updateData: Prisma.JobUpdateInput = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description === null ? null : description; // Allow setting to null
    if (status !== undefined) updateData.status = status as JobStatus;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (expectedEndDate !== undefined) updateData.expectedEndDate = expectedEndDate ? new Date(expectedEndDate) : null;
    // if (estimatedCost !== undefined) updateData.estimatedCost = estimatedCost !== null ? parseFloat(estimatedCost) : null;
    // if (actualEndDate !== undefined) updateData.actualEndDate = actualEndDate ? new Date(actualEndDate) : null;
    // if (actualCost !== undefined) updateData.actualCost = actualCost !== null ? parseFloat(actualCost) : null;

    if (customerId !== undefined) {
        if (customerId === null) { // Allow unsetting customer if schema allows (customerId String?)
            // updateData.customer = { disconnect: true }; // If customerId is optional on Job
        } else {
            const customerExists = await prisma.customer.findUnique({where: {id: customerId}});
            if (!customerExists) return res.status(400).json({message: `Customer with ID ${customerId} not found.`});
            updateData.customer = { connect: { id: customerId }};
        }
    }

    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: updateData,
      include: { customer: { select: { id: true, name: true } }, orders: { select: { id: true, projectTitle: true } } }
    });

    console.log(`[JobController][updateJob] Job ${jobId} updated successfully.`);
    res.status(200).json(updatedJob);

  } catch (error: any) {
    console.error(`[JobController][updateJob] Error for ID ${req.params.id}:`, error);
     if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
         return res.status(404).json({ message: `Job with ID ${req.params.id} not found.` });
     }
    res.status(500).json({ message: 'Failed to update job', details: error.message });
  }
};

export const getJobById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`[JobController][getJobById] Fetching job ${id}`);

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        orders: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            projectOwner: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        costs: {
          orderBy: {
            costDate: 'desc'
          }
        },
        // Include materials with their details
        materials: {
          include: {
            material: {
              include: {
                supplier: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!job) {
      return res.status(404).json({ message: `Job with ID ${id} not found` });
    }

    // Calculate material totals
    const materialTotals = {
      totalMaterials: job.materials.length,
      totalMaterialCost: job.materials.reduce((sum, jm) => sum + (jm.totalCost || 0), 0),
      totalQuantityNeeded: job.materials.reduce((sum, jm) => sum + jm.quantityNeeded, 0),
      totalQuantityUsed: job.materials.reduce((sum, jm) => sum + jm.quantityUsed, 0)
    };

    // Calculate financial totals including material costs
    const orderTotal = job.orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const costTotal = job.costs.reduce((sum, cost) => sum + cost.amount, 0);
    const materialCostTotal = materialTotals.totalMaterialCost;
    
    // Map material fields for frontend compatibility
    const jobWithMappedMaterials = {
      ...job,
      materials: job.materials.map(jobMaterial => ({
        ...jobMaterial,
        material: {
          ...jobMaterial.material,
          minStockLevel: jobMaterial.material.minStock,
          currentStockLevel: jobMaterial.material.currentStock
        }
      })),
      materialTotals,
      totals: {
        orderTotal,
        costTotal,
        materialCostTotal,
        totalCosts: costTotal + materialCostTotal,
        estimatedProfit: orderTotal - (costTotal + materialCostTotal)
      }
    };

    res.status(200).json(jobWithMappedMaterials);
  } catch (error: any) {
    console.error(`[JobController][getJobById] Error for ${req.params.id}:`, error);
    res.status(500).json({ message: 'Failed to fetch job details', details: error.message });
  }
};

export const deleteJob = async (req: AuthRequest, res: Response) => {
  try {
    const { id: jobId } = req.params;
    const userId = req.user?.id;
    console.log(`[JobController][deleteJob] User ${userId} attempting to delete job ${jobId}`);

    const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: { status: true, orders: { select: { id: true }} }
    });

    if (!job) return res.status(404).json({ message: `Job not found with ID ${jobId}` });

    // ✅ FIXED: Use correct JobStatus values from database
    if (job.status !== JobStatus.DRAFT && job.status !== JobStatus.CANCELED) {
        console.warn(`[JobController][deleteJob] Attempt to delete job ${jobId} with status ${job.status}. Restricted.`);
        return res.status(400).json({ message: `Cannot delete job: Only DRAFT or CANCELED jobs can be deleted.` });
    }
    
    if (job.orders.length > 0) { // Check if orders are linked
        await prisma.order.updateMany({
            where: { jobId: jobId },
            data: { jobId: null } // Unlink orders
        });
        console.log(`[JobController][deleteJob] Unlinked job ${jobId} from ${job.orders.length} order(s).`);
    }
    // Assuming JobCost has onDelete: Cascade or will be handled separately if needed.

    await prisma.job.delete({ where: { id: jobId } });
    console.log(`[JobController][deleteJob] Job ${jobId} deleted successfully.`);
    res.status(204).send();

  } catch (error: any) {
    console.error(`[JobController][deleteJob] Error for ID ${req.params.id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') return res.status(404).json({ message: `Job with ID ${req.params.id} not found.` });
        console.error(`[JobController][deleteJob] Prisma Error Code: ${error.code}`);
    }
    res.status(500).json({ message: 'Failed to delete job', details: error.message });
  }
};

export const getAvailableOrders = async (req: AuthRequest, res: Response) => {
  try {
    console.log("[JobController][getAvailableOrders] Fetching orders not yet linked to a job.");
    const orders = await prisma.order.findMany({
      where: { jobId: null },
      select: {
          id: true, projectTitle: true, quoteRef: true, customerName: true, status: true, customerId: true,
          customer: { select: { name: true }}
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`[JobController][getAvailableOrders] Found ${orders.length} available orders.`);
    res.status(200).json(orders);
  } catch (error: any) {
    console.error('[JobController][getAvailableOrders] Error:', error);
    res.status(500).json({ message: 'Failed to fetch available orders', details: error.message });
  }
};

export const getAvailableUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' }
    });
    res.status(200).json(users);
  } catch (error: any) {
    console.error('[JobController][getAvailableUsers] Error:', error);
    res.status(500).json({ message: 'Failed to fetch available users', details: error.message });
  }
};

// addJobNote is still commented out as JobNote model is not in schema.prisma
/*
export const addJobNote = async (req: AuthRequest, res: Response) => { ... };
*/

export const getJobStats = async (req: AuthRequest, res: Response) => {
  try {
    console.log("[JobController][getJobStats] Fetching job stats grouped by status...");
    const jobStatsGrouped = await prisma.job.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    const stats: Record<string, number> = {};
    Object.values(JobStatus).forEach(statusValue => {
        stats[statusValue] = 0;
    });

    jobStatsGrouped.forEach(stat => {
      if (stat.status) stats[stat.status] = stat._count.id;
    });

    console.log("[JobController][getJobStats] Transformed job stats:", stats);
    res.status(200).json(stats);
  } catch (error: any) {
    console.error('[JobController][getJobStats] Error:', error);
    res.status(500).json({ message: 'Failed to fetch job statistics', details: error.message });
  }
};