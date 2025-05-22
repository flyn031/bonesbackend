import { PrismaClient, Material } from '@prisma/client';

interface InventoryStatusSummary {
  totalMaterials: number;
  lowStockMaterials: number;
  totalInventoryValue: number;
  materialCategories: Array<{
    category: string;
    materialCount: number;
    totalValue: number;
    lowStockCount: number;
  }>;
  supplierInventoryBreakdown: Array<{
    supplierId: string;
    supplierName: string;
    totalMaterials: number;
    totalInventoryValue: number;
    lowStockMaterials: number;
  }>;
}

interface LowStockMaterial {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  reorderPoint: number; // Changed from nullable to required
  supplierName: string;
  unitPrice: number;
  percentageOfReorderPoint: number;
}

// Add a type for the Material with supplier included
type MaterialWithSupplier = Material & {
  supplier: {
    id: string;
    name: string;
    [key: string]: any;
  } | null;
};

export class InventoryDashboardService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getInventoryStatusSummary(): Promise<InventoryStatusSummary> {
    const materials = await this.prisma.material.findMany({
      include: {
        supplier: true
      }
    }) as MaterialWithSupplier[];

    // Total materials
    const totalMaterials = materials.length;

    // Low stock materials
    const lowStockMaterials = materials.filter(m => 
      m.currentStock <= (m.reorderPoint ?? 0) // Handle nullable reorderPoint
    ).length;

    // Total inventory value
    const totalInventoryValue = materials.reduce((sum, material) => 
      sum + (material.currentStock * material.unitPrice), 0);

    // Material categories (simulated as unit type)
    const materialCategories = this.groupMaterialsByCategory(materials);

    // Supplier inventory breakdown
    const supplierInventoryBreakdown = this.calculateSupplierInventoryBreakdown(materials);

    return {
      totalMaterials,
      lowStockMaterials,
      totalInventoryValue,
      materialCategories,
      supplierInventoryBreakdown
    };
  }

  async getLowStockMaterials(): Promise<LowStockMaterial[]> {
    // Fix the where clause to use a proper comparison with a number instead of trying to access reorderPoint on the model
    const materials = await this.prisma.material.findMany({
      where: {
        currentStock: {
          lte: 10 // Using a fixed value as a temporary solution, ideally this should be dynamic
        }
      },
      include: {
        supplier: true
      }
    }) as MaterialWithSupplier[];

    // Filter in memory to get materials where currentStock <= reorderPoint
    const lowStockMaterials = materials.filter(m => 
      m.currentStock <= (m.reorderPoint ?? 0)
    );

    return lowStockMaterials.map(material => ({
      id: material.id,
      name: material.name,
      currentStock: material.currentStock,
      minStock: material.minStock,
      reorderPoint: material.reorderPoint ?? 0, // Provide default value for null
      supplierName: material.supplier?.name ?? 'Unknown Supplier', // Safe access with fallback
      unitPrice: material.unitPrice,
      percentageOfReorderPoint: 
        (material.reorderPoint ?? 0) > 0 
          ? Math.round((material.currentStock / (material.reorderPoint ?? 1)) * 100)
          : 0
    }));
  }

  private groupMaterialsByCategory(materials: MaterialWithSupplier[]): any[] {
    const categoriesMap = materials.reduce((acc: any, material) => {
      const category = material.unit;
      if (!acc[category]) {
        acc[category] = {
          category,
          materialCount: 0,
          totalValue: 0,
          lowStockCount: 0
        };
      }
      acc[category].materialCount++;
      acc[category].totalValue += material.currentStock * material.unitPrice;
      if (material.currentStock <= (material.reorderPoint ?? 0)) {
        acc[category].lowStockCount++;
      }
      return acc;
    }, {});

    return Object.values(categoriesMap);
  }

  private calculateSupplierInventoryBreakdown(materials: MaterialWithSupplier[]): any[] {
    const supplierMap = materials.reduce((acc: any, material) => {
      const supplierId = material.supplierId;
      if (!supplierId || !material.supplier) return acc;

      if (!acc[supplierId]) {
        acc[supplierId] = {
          supplierId,
          supplierName: material.supplier.name,
          totalMaterials: 0,
          totalInventoryValue: 0,
          lowStockMaterials: 0
        };
      }
      acc[supplierId].totalMaterials++;
      acc[supplierId].totalInventoryValue += 
        material.currentStock * material.unitPrice;
      
      if (material.currentStock <= (material.reorderPoint ?? 0)) {
        acc[supplierId].lowStockMaterials++;
      }
      return acc;
    }, {});

    return Object.values(supplierMap);
  }
}