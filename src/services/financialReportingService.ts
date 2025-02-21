import { PrismaClient } from '@prisma/client';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface SupplierFinancialPerformance {
  supplierId: string;
  supplierName: string;
  totalOrderValue: number;
  totalMaterialCost: number;
  profitContribution: number;
  materialCount: number;
  averageMaterialPrice: number;
  potentialRevenue: number;
}

export class FinancialReportingService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getSupplierFinancialPerformance(): Promise<SupplierFinancialPerformance[]> {
    try {
      const suppliers = await this.prisma.supplier.findMany({
        include: {
          materials: true
        }
      });

      return suppliers.map(supplier => {
        // Calculate material-related metrics
        const materialCount = supplier.materials.length;
        const totalMaterialCost = supplier.materials.reduce((sum, material) => 
          sum + (material.unitPrice * material.currentStock), 0);
        
        const averageMaterialPrice = materialCount > 0 
          ? totalMaterialCost / materialCount 
          : 0;

        // Simulate potential revenue based on materials
        const potentialRevenue = supplier.materials.reduce((sum, material) => 
          sum + (material.unitPrice * material.currentStock * 1.5), 0); // 50% markup

        return {
          supplierId: supplier.id,
          supplierName: supplier.name,
          totalOrderValue: potentialRevenue,
          totalMaterialCost,
          profitContribution: potentialRevenue - totalMaterialCost,
          materialCount,
          averageMaterialPrice,
          potentialRevenue
        };
      });
    } catch (error) {
      console.error('Error in getSupplierFinancialPerformance:', error);
      throw error;
    }
  }

  // Additional methods can be added for more detailed financial analysis
  async simulateSupplierFinancialGrowth(supplierId: string) {
    // Future method to project financial growth
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      include: { materials: true }
    });

    if (!supplier) {
      throw new Error('Supplier not found');
    }

    // Placeholder for more complex financial projection
    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      projectedGrowth: 1.2 // 20% projected growth
    };
  }
}