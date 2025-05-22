// backend/src/controllers/jobMaterialController.ts

import prisma from '../utils/prismaClient';
import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { Prisma } from '@prisma/client';

// --- Job Material Controller Functions ---

export const getJobMaterials = async (req: AuthRequest, res: Response) => {
  try {
    const { jobId } = req.params;
    console.log(`[JobMaterialController][getJobMaterials] Fetching materials for job ${jobId}`);

    const jobMaterials = await prisma.jobMaterial.findMany({
      where: { jobId },
      include: {
        material: {
          include: {
            supplier: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`[JobMaterialController][getJobMaterials] Found ${jobMaterials.length} materials for job`);

    // Calculate totals
    const totals = {
      totalMaterials: jobMaterials.length,
      totalCost: jobMaterials.reduce((sum, jm) => sum + (jm.totalCost || 0), 0),
      totalQuantityNeeded: jobMaterials.reduce((sum, jm) => sum + jm.quantityNeeded, 0),
      totalQuantityAllocated: jobMaterials.reduce((sum, jm) => sum + jm.quantityUsed, 0), // Using quantityUsed as allocated
      totalQuantityUsed: jobMaterials.reduce((sum, jm) => sum + jm.quantityUsed, 0)
    };

    // Map materials for frontend compatibility
    const mappedMaterials = jobMaterials.map(jm => ({
      ...jm,
      quantityAllocated: jm.quantityUsed, // Map quantityUsed to quantityAllocated for frontend
      material: {
        ...jm.material,
        // Ensure currentStockLevel and minStockLevel are correctly mapped from Prisma
        // assuming your Prisma Material model has 'minStock' and 'currentStock'
        minStockLevel: jm.material.minStock,
        currentStockLevel: jm.material.currentStock,
        unitPrice: jm.material.unitPrice // Changed from unitCost to unitPrice
      }
    }));

    // Match the expected response format from the frontend
    res.status(200).json({
      materials: mappedMaterials,
      totals
    });
  } catch (error: any) {
    console.error(`[JobMaterialController][getJobMaterials] Error for job ${req.params.jobId}:`, error);
    res.status(500).json({ message: 'Failed to fetch job materials', details: error.message });
  }
};

export const getAvailableMaterialsForJob = async (req: AuthRequest, res: Response) => {
  try {
    const { jobId } = req.params;
    const { search } = req.query;
    console.log(`[JobMaterialController][getAvailableMaterialsForJob] Fetching available materials for job ${jobId}, search: "${search}"`);

    // Get materials already assigned to this job
    const assignedMaterials = await prisma.jobMaterial.findMany({
      where: { jobId },
      select: { materialId: true }
    });

    const assignedMaterialIds = assignedMaterials.map(jm => jm.materialId);

    // Build the where clause for materials
    let materialWhere: any = {
      id: {
        notIn: assignedMaterialIds
      }
    };

    // Add search functionality if search term is provided
    if (search && typeof search === 'string' && search.trim() !== '') {
      const searchTerm = search.trim();
      materialWhere.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { code: { contains: searchTerm, mode: 'insensitive' } },
        { category: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { supplier: { name: { contains: searchTerm, mode: 'insensitive' } } }
      ];
    }

    // Get all materials NOT assigned to this job
    const availableMaterials = await prisma.material.findMany({
      where: materialWhere,
      include: {
        supplier: {
          select: { id: true, name: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    console.log(`[JobMaterialController][getAvailableMaterialsForJob] Found ${availableMaterials.length} available materials`);

    // Map materials for frontend compatibility
    const mappedMaterials = availableMaterials.map(material => ({
      id: material.id,
      name: material.name,
      code: material.code || '',
      category: material.category || '',
      currentStockLevel: material.currentStock || 0, // Ensure 'currentStock' is correct Prisma field
      minStockLevel: material.minStock || 0,         // Ensure 'minStock' is correct Prisma field
      unit: material.unit || 'units',
      unitPrice: material.unitPrice || 0,            // Changed from unitCost to unitPrice
      description: material.description || '',
      supplier: material.supplier
    }));

    // Return in the format expected by frontend
    res.status(200).json({
      materials: mappedMaterials
    });
  } catch (error: any) {
    console.error(`[JobMaterialController][getAvailableMaterialsForJob] Error for job ${req.params.jobId}:`, error);
    res.status(500).json({ message: 'Failed to fetch available materials', details: error.message });
  }
};

export const addMaterialToJob = async (req: AuthRequest, res: Response) => {
  try {
    const { jobId } = req.params;
    const { materialId, quantityNeeded, notes, unitCost } = req.body;
    console.log(`[JobMaterialController][addMaterialToJob] Adding material ${materialId} to job ${jobId}`);

    if (!materialId || quantityNeeded === undefined || quantityNeeded === null) { // Check for undefined/null quantity
      res.status(400).json({ message: 'Missing required fields: materialId, quantityNeeded' });
      return; // Added return here for early exit
    }

    // Check if job exists
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      res.status(404).json({ message: `Job with ID ${jobId} not found` });
      return; // Added return here for early exit
    }

    // Check if material exists
    const material = await prisma.material.findUnique({ where: { id: materialId } });
    if (!material) {
      res.status(404).json({ message: `Material with ID ${materialId} not found` });
      return; // Added return here for early exit
    }

    // Check if material is already assigned to this job
    const existingJobMaterial = await prisma.jobMaterial.findFirst({
      where: { jobId, materialId }
    });
    if (existingJobMaterial) {
      res.status(400).json({ message: 'Material is already assigned to this job' });
      return; // Added return here for early exit
    }

    // Calculate total cost
    const parsedUnitCost = unitCost ? parseFloat(unitCost) : material.unitPrice; // Changed from unitCost to unitPrice
    const totalCost = parsedUnitCost * quantityNeeded;

    const jobMaterial = await prisma.jobMaterial.create({
      data: {
        jobId,
        materialId,
        quantityNeeded: quantityNeeded,
        quantityUsed: 0,
        unitCost: parsedUnitCost,
        totalCost,
        notes: notes || null
      },
      include: {
        material: {
          include: {
            supplier: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    // Map material for frontend compatibility
    const mappedJobMaterial = {
      ...jobMaterial,
      material: {
        ...jobMaterial.material,
        minStockLevel: jobMaterial.material.minStock,
        currentStockLevel: jobMaterial.material.currentStock
      }
    };

    console.log(`[JobMaterialController][addMaterialToJob] Material added successfully`);
    res.status(201).json(mappedJobMaterial); // Removed 'return'
  } catch (error: any) {
    console.error(`[JobMaterialController][addMaterialToJob] Error:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        res.status(400).json({ message: 'Material is already assigned to this job' });
        return; // Added return here for early exit
      }
    }
    res.status(500).json({ message: 'Failed to add material to job', details: error.message });
  }
};

export const updateJobMaterialAllocation = async (req: AuthRequest, res: Response) => {
  try {
    const { jobId, materialId } = req.params;
    const { quantityNeeded, quantityUsed, unitCost, notes } = req.body;
    console.log(`[JobMaterialController][updateJobMaterialAllocation] Updating material ${materialId} for job ${jobId}`);

    // Find the job material record
    const jobMaterial = await prisma.jobMaterial.findFirst({
      where: { jobId, materialId },
      include: { material: true }
    });

    if (!jobMaterial) {
      res.status(404).json({ message: 'Material assignment not found for this job' });
      return; // Added return here for early exit
    }

    const updateData: Prisma.JobMaterialUpdateInput = {};

    if (quantityNeeded !== undefined) {
      updateData.quantityNeeded = quantityNeeded;
    }
    
    if (quantityUsed !== undefined) {
      updateData.quantityUsed = quantityUsed;
      
      // Check if quantity used exceeds available stock
      if (quantityUsed > jobMaterial.material.currentStock) {
        console.warn(`[JobMaterialController][updateJobMaterialAllocation] Warning: Quantity used (${quantityUsed}) exceeds available stock (${jobMaterial.material.currentStock})`);
      }
    }

    if (unitCost !== undefined) {
      updateData.unitCost = parseFloat(unitCost);
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Recalculate total cost if quantity or unit cost changed
    if (quantityNeeded !== undefined || unitCost !== undefined) {
      const newQuantity = quantityNeeded !== undefined ? quantityNeeded : jobMaterial.quantityNeeded;
      const newUnitCost = unitCost !== undefined ? parseFloat(unitCost) : jobMaterial.unitCost ?? 0; // Added nullish coalescing
      updateData.totalCost = newQuantity * newUnitCost;
    }

    const updatedJobMaterial = await prisma.jobMaterial.update({
      where: { 
        jobId_materialId: { jobId, materialId }
      },
      data: updateData,
      include: {
        material: {
          include: {
            supplier: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    // Update material stock if quantity used changed
    if (quantityUsed !== undefined) {
      const stockDifference = quantityUsed - jobMaterial.quantityUsed;
      if (stockDifference !== 0) {
        await prisma.material.update({
          where: { id: materialId },
          data: {
            currentStock: {
              decrement: stockDifference
            }
          }
        });
        console.log(`[JobMaterialController][updateJobMaterialAllocation] Updated material stock by ${-stockDifference}`);
      }
    }

    // Map material for frontend compatibility
    const mappedJobMaterial = {
      ...updatedJobMaterial,
      material: {
        ...updatedJobMaterial.material,
        minStockLevel: updatedJobMaterial.material.minStock,
        currentStockLevel: updatedJobMaterial.material.currentStock
      }
    };

    console.log(`[JobMaterialController][updateJobMaterialAllocation] Material allocation updated successfully`);
    res.status(200).json(mappedJobMaterial); // Removed 'return'
  } catch (error: any) {
    console.error(`[JobMaterialController][updateJobMaterialAllocation] Error:`, error);
    res.status(500).json({ message: 'Failed to update material allocation', details: error.message });
  }
};

export const removeJobMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const { jobId, materialId } = req.params;
    console.log(`[JobMaterialController][removeJobMaterial] Removing material ${materialId} from job ${jobId}`);

    // Find the job material record
    const jobMaterial = await prisma.jobMaterial.findFirst({
      where: { jobId, materialId }
    });

    if (!jobMaterial) {
      res.status(404).json({ message: 'Material assignment not found for this job' });
      return; // Added return here for early exit
    }

    // If material was used, restore it to stock
    if (jobMaterial.quantityUsed > 0) {
      await prisma.material.update({
        where: { id: materialId },
        data: {
          currentStock: {
            increment: jobMaterial.quantityUsed
          }
        }
      });
      console.log(`[JobMaterialController][removeJobMaterial] Restored ${jobMaterial.quantityUsed} units to material stock`);
    }

    // Delete the job material record
    await prisma.jobMaterial.delete({
      where: {
        jobId_materialId: { jobId, materialId }
      }
    });

    console.log(`[JobMaterialController][removeJobMaterial] Material removed successfully`);
    res.status(204).send(); // Removed 'return'
  } catch (error: any) {
    console.error(`[JobMaterialController][removeJobMaterial] Error:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ message: 'Material assignment not found for this job' });
      return; // Added return here for early exit
    }
    res.status(500).json({ message: 'Failed to remove material from job', details: error.message });
  }
};