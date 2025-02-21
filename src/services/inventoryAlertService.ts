import { PrismaClient } from '@prisma/client';

export class InventoryAlertService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async checkLowStockLevels(): Promise<any[]> {
    const lowStockMaterials = await this.prisma.material.findMany({
      where: {
        currentStockLevel: { lte: this.prisma.material.reorderPoint }
      },
      include: { supplier: true }
    });

    return lowStockMaterials.map(material => ({
      id: material.id,
      name: material.name,
      currentStock: material.currentStockLevel,
      reorderPoint: material.reorderPoint,
      supplier: material.supplier.name
    }));
  }
}