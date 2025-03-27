import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get all quote templates
 */
export const getAllQuoteTemplates = async () => {
  return prisma.quoteTemplate.findMany({
    include: {
      items: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
};

/**
 * Get quote template by ID
 */
export const getQuoteTemplateById = async (id: string) => {
  return prisma.quoteTemplate.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          material: true
        }
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
};

/**
 * Create a new quote template
 */
export const createQuoteTemplate = async (data: {
  name: string;
  description?: string;
  createdById: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    materialId?: string;
    isFrequentlyUsed: boolean;
  }>;
}) => {
  return prisma.quoteTemplate.create({
    data: {
      name: data.name,
      description: data.description,
      createdById: data.createdById,
      items: {
        create: data.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          materialId: item.materialId,
          isFrequentlyUsed: item.isFrequentlyUsed
        }))
      }
    },
    include: {
      items: true
    }
  });
};

/**
 * Update an existing quote template
 */
export const updateQuoteTemplate = async (
  id: string,
  data: {
    name?: string;
    description?: string;
    items?: Array<{
      id?: string;
      description: string;
      quantity: number;
      unitPrice: number;
      materialId?: string;
      isFrequentlyUsed: boolean;
    }>;
  }
) => {
  // Start a transaction to handle the update
  return prisma.$transaction(async (tx) => {
    // Update the template basic info
    const updatedTemplate = await tx.quoteTemplate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
      }
    });
    
    // If items are provided, handle them
    if (data.items) {
      // Delete existing items
      await tx.quoteTemplateItem.deleteMany({
        where: { templateId: id }
      });
      
      // Create new items
      const newItems = await Promise.all(
        data.items.map(item => 
          tx.quoteTemplateItem.create({
            data: {
              templateId: id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              materialId: item.materialId,
              isFrequentlyUsed: item.isFrequentlyUsed
            }
          })
        )
      );
      
      // Return the complete updated template
      return tx.quoteTemplate.findUnique({
        where: { id },
        include: {
          items: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
    }
    
    // If no items were provided, just return the updated template
    return tx.quoteTemplate.findUnique({
      where: { id },
      include: {
        items: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  });
};

/**
 * Delete a quote template
 */
export const deleteQuoteTemplate = async (id: string) => {
  // Start a transaction to handle the delete
  return prisma.$transaction(async (tx) => {
    // Delete all items first
    await tx.quoteTemplateItem.deleteMany({
      where: { templateId: id }
    });
    
    // Then delete the template
    return tx.quoteTemplate.delete({
      where: { id }
    });
  });
};

/**
 * Get all frequently used items
 */
export const getFrequentlyUsedItems = async (customerId?: string) => {
  // Get all items marked as frequently used
  const frequentItems = await prisma.quoteTemplateItem.findMany({
    where: {
      isFrequentlyUsed: true
    },
    include: {
      material: true
    }
  });
  
  // If a customer ID is provided, check for customer-specific pricing
  if (customerId) {
    const itemsWithCustomerPricing = await Promise.all(
      frequentItems.map(async (item) => {
        if (item.materialId) {
          // Check for customer-specific pricing
          const customerPricing = await prisma.customerPricing.findFirst({
            where: {
              customerId,
              materialId: item.materialId,
              validFrom: { lte: new Date() },
              OR: [
                { validUntil: null },
                { validUntil: { gte: new Date() } }
              ]
            },
            orderBy: {
              createdAt: 'desc'
            }
          });
          
          if (customerPricing) {
            // Apply customer-specific pricing
            if (customerPricing.unitPrice !== null) {
              return { ...item, unitPrice: