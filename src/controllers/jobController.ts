import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';

const prisma = new PrismaClient();

// Validation function for job creation
const validateJobCreation = async (orderId: string) => {
  // Check if the order exists and is eligible for job creation
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      job: true,
      customer: true
    }
  });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.job) {
    throw new Error('A job has already been created for this order');
  }

  // Additional business rules can be added here
  // For example, check order status, customer standing, etc.
  if (order.status !== 'APPROVED') {
    throw new Error('Only approved orders can have jobs created');
  }

  return order;
};

// Automatic job duration estimation
const estimateJobDuration = (order: any) => {
  // Simple estimation based on project value
  // This is a placeholder - you'd want more sophisticated logic
  const baseHours = 40; // Starting point
  const valueFactor = Math.log(order.projectValue + 1) * 5; // Logarithmic scaling
  
  return {
    estimatedDuration: Math.round(baseHours + valueFactor),
    expectedEndDate: dayjs().add(Math.round(baseHours + valueFactor), 'hour').toDate()
  };
};

export const createJob = async (req: Request, res: Response) => {
  try {
    console.log("Job creation request:", req.body);
    
    const { 
      title, 
      description, 
      orderId, 
      assignedUserIds 
    } = req.body;

    // Validate required fields
    if (!title || !orderId) {
      return res.status(400).json({ error: 'Title and Order ID are required' });
    }

    // Find the order first
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true }
    });

    if (!order) {
      return res.status(400).json({ error: 'Order not found' });
    }

    console.log("Found order:", order);

    // Find a customer to associate with this job
    // First try to use the order's customer, or find the first available customer
    let customerToUse = null;
    
    if (order.customerId) {
      customerToUse = { id: order.customerId };
    } else {
      // Look for the customer mentioned in the order
      if (order.customerName) {
        const existingCustomer = await prisma.customer.findFirst({
          where: { name: order.customerName }
        });
        
        if (existingCustomer) {
          customerToUse = { id: existingCustomer.id };
        } else {
          // Create a new customer based on order info if needed
          const newCustomer = await prisma.customer.create({
            data: {
              name: order.customerName || 'Customer from order',
              email: order.contactEmail || '',
              phone: order.contactPhone || ''
            }
          });
          customerToUse = { id: newCustomer.id };
        }
      } else {
        // Try to get any customer as fallback
        const anyCustomer = await prisma.customer.findFirst();
        if (anyCustomer) {
          customerToUse = { id: anyCustomer.id };
        } else {
          return res.status(400).json({ 
            error: 'No customer available. Please create a customer first.' 
          });
        }
      }
    }

    console.log("Using customer:", customerToUse);

    // Create the job with minimal fields and explicit customer connection
    const job = await prisma.job.create({
      data: {
        title,
        description: description || 'Job from order',
        status: 'DRAFT',
        startDate: new Date(),
        expectedEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        estimatedCost: order.projectValue || 0,
        
        // Connect to order
        orders: {
          connect: { id: orderId }
        },
        
        // Connect to customer (REQUIRED)
        customer: {
          connect: customerToUse
        },
        
        // Connect to creator
        createdBy: {
          connect: { id: req.user?.id }
        }
      },
      include: {
        customer: true,
        orders: true
      }
    });

    console.log("Job created successfully:", job);

    // Update order to link the job
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        jobId: job.id,
        status: 'IN_PRODUCTION'
      }
    });

    return res.status(201).json(job);
  } catch (error) {
    console.error('Job creation error:', error);
    
    // Return detailed error info
    if (error instanceof Error) {
      return res.status(400).json({ 
        error: error.message,
        stack: error.stack 
      });
    }
    
    return res.status(500).json({ error: 'Failed to create job' });
  }
};

export const updateJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      status, 
      assignedUserIds 
    } = req.body;

    // Validate status transitions
    const currentJob = await prisma.job.findUnique({ where: { id } });
    if (!currentJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Optional: Add state machine logic for status transitions
    const validStatusTransitions = {
      'DRAFT': ['PENDING', 'CANCELLED'],
      'PENDING': ['IN_PROGRESS', 'CANCELLED'],
      'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
      'COMPLETED': ['IN_PROGRESS'] // Allow reopening if needed
    };

    if (status && 
        (!validStatusTransitions[currentJob.status] || 
         !validStatusTransitions[currentJob.status].includes(status))) {
      return res.status(400).json({ 
        error: `Invalid status transition from ${currentJob.status} to ${status}` 
      });
    }

    // Prepare update data
    const updateData: any = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (status) updateData.status = status;

    // Update job with optional user reassignment
    const updatedJob = await prisma.job.update({
      where: { id },
      data: {
        ...updateData,
        // Handle user assignments if provided
        ...(assignedUserIds && {
          assignedUsers: {
            // First, disconnect all existing assignments
            deleteMany: {},
            // Then create new assignments
            create: assignedUserIds.map((userId: string) => ({
              user: { connect: { id: userId } }
            }))
          }
        }),
        // Automatically update end date for completed jobs
        ...(status === 'COMPLETED' && { 
          actualEndDate: new Date() 
        })
      },
      include: {
        customer: true,
        orders: true,
        assignedUsers: {
          include: {
            user: {
              select: { 
                id: true, 
                name: true 
              }
            }
          }
        }
      }
    });

    // Optional: Create a note for significant status changes
    if (status && status !== currentJob.status) {
      await prisma.jobNote.create({
        data: {
          jobId: id,
          authorId: req.user?.id,
          content: `Job status changed from ${currentJob.status} to ${status}`
        }
      });
    }

    res.json(updatedJob);
  } catch (error) {
    console.error('Job update error:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
};

// Get list of jobs with optional filtering
export const getJobs = async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const where: any = {};
    if (status) where.status = status;

    const jobs = await prisma.job.findMany({
      where,
      include: {
        customer: true,
        orders: true,
        assignedUsers: {
          include: {
            user: {
              select: { 
                id: true, 
                name: true 
              }
            }
          }
        }
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.job.count({ where });

    res.json({
      jobs,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalJobs: total
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};

// Get a specific job by ID
export const getJobById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        customer: true,
        orders: true,
        assignedUsers: {
          include: {
            user: {
              select: { 
                id: true, 
                name: true 
              }
            }
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
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Get job by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch job details' });
  }
};

// Delete a job
export const deleteJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Optional: Add additional validation before deletion
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Prevent deletion of active jobs
    if (job.status !== 'DRAFT' && job.status !== 'CANCELLED') {
      return res.status(400).json({ error: 'Cannot delete an active job' });
    }

    // Delete the job
    await prisma.job.delete({
      where: { id }
    });

    res.status(204).send(); // No content
  } catch (error) {
    console.error('Job deletion error:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
};

// Get available orders for job creation
export const getAvailableOrders = async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        // Find orders without an associated job
        job: null,
        // Only approved orders can be used to create jobs
        status: 'APPROVED'
      },
      include: {
        customer: true
      }
    });

    res.json(orders);
  } catch (error) {
    console.error('Available orders error:', error);
    res.status(500).json({ error: 'Failed to fetch available orders' });
  }
};

// Get available users for job assignment
export const getAvailableUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    res.json(users);
  } catch (error) {
    console.error('Available users error:', error);
    res.status(500).json({ error: 'Failed to fetch available users' });
  }
};

// Add a note to a job
export const addJobNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const note = await prisma.jobNote.create({
      data: {
        jobId: id,
        authorId: req.user?.id, // Assuming authenticated user
        content
      },
      include: {
        author: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json(note);
  } catch (error) {
    console.error('Add job note error:', error);
    res.status(500).json({ error: 'Failed to add job note' });
  }
};