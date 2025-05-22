import { PrismaClient, Material } from '@prisma/client';

// Define a type for material with supplier
type MaterialWithSupplier = Material & {
  supplier: {
    id: string;
    name: string;
    [key: string]: any;
  } | null;
};

export class InventoryAlertService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async checkLowStockLevels(): Promise<any[]> {
    // Fixed: using currentStock instead of currentStockLevel
    // Fixed: using a fixed value for comparison instead of accessing reorderPoint on the model
    const lowStockMaterials = await this.prisma.material.findMany({
      where: {
        currentStock: { lte: 10 } // Using a fixed low threshold as default
      },
      include: { supplier: true }
    }) as MaterialWithSupplier[];

    // Filter materials where currentStock <= reorderPoint
    const filteredMaterials = lowStockMaterials.filter(material => 
      material.currentStock <= (material.reorderPoint ?? 0)
    );

    return filteredMaterials.map(material => ({
      id: material.id,
      name: material.name,
      currentStock: material.currentStock, // Fixed: using currentStock
      reorderPoint: material.reorderPoint ?? 0, // Fixed: providing default value
      supplier: material.supplier?.name ?? 'Unknown Supplier' // Fixed: safe access with fallback
    }));
  }
}