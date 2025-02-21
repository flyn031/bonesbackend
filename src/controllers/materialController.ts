import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createMaterial = async (req: Request, res: Response) => {
 try {
   const { 
     name, 
     code, 
     description,
     category,
     unitPrice, 
     unit, 
     minStockLevel, 
     currentStockLevel, 
     reorderPoint,
     leadTimeInDays,
     supplierId,
     customerId,
     manufacturer,
     productSpecifications
   } = req.body;

   // Comprehensive validation
   const validationErrors: string[] = [];
   if (!name) validationErrors.push('Name is required');
   if (!code) validationErrors.push('Code is required');
   if (!unitPrice && unitPrice !== 0) validationErrors.push('Unit Price is required');
   if (!supplierId && !customerId) validationErrors.push('Either Supplier or Customer is required');

   if (validationErrors.length > 0) {
     return res.status(400).json({ 
       error: 'Validation Failed', 
       details: validationErrors 
     });
   }

   const material = await prisma.material.create({
     data: {
       name,
       code,
       description,
       category,
       unitPrice,
       unit,
       minStockLevel: minStockLevel || 0,
       currentStockLevel: currentStockLevel || 0,
       reorderPoint: reorderPoint || 0,
       leadTimeInDays: leadTimeInDays || 0,
       supplierId,
       customerId,
       manufacturer,
       productSpecifications: productSpecifications 
         ? JSON.stringify(productSpecifications) 
         : undefined
     }
   });

   res.status(201).json(material);
 } catch (error) {
   console.error('Error creating material:', error);
   res.status(500).json({ 
     error: 'Failed to create material', 
     details: error instanceof Error ? error.message : 'Unknown error' 
   });
 }
};

export const getMaterials = async (req: Request, res: Response) => {
 try {
   const { category, customerId } = req.query;
   
   const materials = await prisma.material.findMany({
     where: {
       category: category ? category as string : undefined,
       customerId: customerId ? customerId as string : undefined
     },
     include: {
       supplier: true,
       customer: true
     }
   });
   res.json(materials);
 } catch (error) {
   console.error('Error fetching materials:', error);
   res.status(500).json({ error: 'Failed to fetch materials' });
 }
};

export const getMaterialCategories = async (req: Request, res: Response) => {
 try {
   const categories = [
     'RAW_MATERIAL',
     'MACHINE_PART',
     'CONVEYOR_COMPONENT',
     'OFFICE_SUPPLY',
     'KITCHEN_SUPPLY',
     'SAFETY_EQUIPMENT',
     'CLEANING_SUPPLY',
     'ELECTRICAL_COMPONENT',
     'MECHANICAL_COMPONENT',
     'OTHER'
   ];
   res.json(categories);
 } catch (error) {
   console.error('Error fetching material categories:', error);
   res.status(500).json({ error: 'Failed to fetch material categories' });
 }
};

export const updateMaterial = async (req: Request, res: Response) => {
 try {
   const { id } = req.params;
   const { 
     name, 
     code,
     description,
     category,
     unitPrice, 
     unit, 
     minStockLevel, 
     currentStockLevel, 
     reorderPoint,
     leadTimeInDays,
     supplierId,
     customerId,
     manufacturer,
     productSpecifications
   } = req.body;

   const updatedMaterial = await prisma.material.update({
     where: { id },
     data: {
       name,
       code,
       description,
       category,
       unitPrice,
       unit,
       minStockLevel,
       currentStockLevel,
       reorderPoint,
       leadTimeInDays,
       supplierId,
       customerId,
       manufacturer,
       productSpecifications: productSpecifications 
         ? JSON.stringify(productSpecifications) 
         : undefined
     }
   });

   res.json(updatedMaterial);
 } catch (error) {
   console.error('Error updating material:', error);
   res.status(500).json({ error: 'Failed to update material' });
 }
};

export const deleteMaterial = async (req: Request, res: Response) => {
 try {
   const { id } = req.params;

   await prisma.material.delete({
     where: { id }
   });

   res.status(204).send();
 } catch (error) {
   console.error('Error deleting material:', error);
   res.status(500).json({ error: 'Failed to delete material' });
 }
};

export const updateStock = async (req: Request, res: Response) => {
 try {
   const { id } = req.params;
   const { 
     quantity, 
     transactionType 
   } = req.body;

   // Validate transaction type
   if (!['ADD', 'REMOVE'].includes(transactionType)) {
     return res.status(400).json({ error: 'Invalid transaction type' });
   }

   const material = await prisma.material.findUnique({
     where: { id }
   });

   if (!material) {
     return res.status(404).json({ error: 'Material not found' });
   }

   // Calculate new stock based on transaction type
   const newStock = transactionType === 'ADD' 
     ? material.currentStockLevel + quantity 
     : material.currentStockLevel - quantity;

   // Prevent negative stock
   if (newStock < 0) {
     return res.status(400).json({ error: 'Insufficient stock' });
   }

   const updatedMaterial = await prisma.material.update({
     where: { id },
     data: { 
       currentStockLevel: newStock 
     }
   });

   res.json(updatedMaterial);
 } catch (error) {
   console.error('Error updating stock:', error);
   res.status(500).json({ error: 'Failed to update stock' });
 }
};

export const createSampleMaterials = async (req: Request, res: Response) => {
 try {
   const { supplierId } = req.params;
   const sampleMaterials = [
     {
       name: 'Steel Pipe',
       code: 'STEEL-PIPE-001',
       description: 'Industrial grade steel pipe',
       category: 'RAW_MATERIAL',
       unitPrice: 50.00,
       unit: 'meter',
       minStockLevel: 100,
       currentStockLevel: 500,
       reorderPoint: 200,
       leadTimeInDays: 14,
       manufacturer: 'Steel Co Ltd'
     },
     {
       name: 'Aluminum Sheet',
       code: 'ALU-SHEET-001',
       description: 'Thin aluminum sheet',
       category: 'RAW_MATERIAL',
       unitPrice: 75.50,
       unit: 'square meter',
       minStockLevel: 50,
       currentStockLevel: 250,
       reorderPoint: 100,
       leadTimeInDays: 10,
       manufacturer: 'Aluminum Industries'
     }
   ];

   const createdMaterials = await Promise.all(
     sampleMaterials.map(material => 
       prisma.material.create({
         data: {
           ...material,
           supplier: { connect: { id: supplierId } }
         }
       })
     )
   );

   res.status(201).json(createdMaterials);
 } catch (error) {
   console.error('Error creating sample materials:', error);
   res.status(500).json({ error: 'Failed to create sample materials' });
 }
};