import { PrismaClient } from '@prisma/client';

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
  reorderPoint: number;
  supplierName: string;
  unitPrice: number;
  percentageOfReorderPoint: number;
}

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
    });

    // Total materials
    const totalMaterials = materials.length;

    // Low stock materials
    const lowStockMaterials = materials.filter(m => 
      m.currentStock <= m.reorderPoint
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
    const materials = await this.prisma.material.findMany({
      where: {
        currentStock: {
          lte: this.prisma.material.reorderPoint
        }
      },
      include: {
        supplier: true
      }
    });

    return materials.map(material => ({
      id: material.id,
      name: material.name,
      currentStock: material.currentStock,
      minStock: material.minStock,
      reorderPoint: material.reorderPoint,
      supplierName: material.supplier.name,
      unitPrice: material.unitPrice,
      percentageOfReorderPoint: 
        material.reorderPoint > 0 
          ? Math.round((material.currentStock / material.reorderPoint) * 100)
          : 0
    }));
  }

  private groupMaterialsByCategory(materials: any[]): any[] {
    const categoriesMap = materials.reduce((acc, material) => {
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
      if (material.currentStock <= material.reorderPoint) {
        acc[category].lowStockCount++;
      }
      return acc;
    }, {});

    return Object.values(categoriesMap);
  }

  private calculateSupplierInventoryBreakdown(materials: any[]): any[] {
    const supplierMap = materials.reduce((acc, material) => {
      const supplierId = material.supplierId;
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
      
      if (material.currentStock <= material.reorderPoint) {
        acc[supplierId].lowStockMaterials++;
      }
      return acc;
    }, {});

    return Object.values(supplierMap);
  }
}