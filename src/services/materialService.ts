// In src/services/materialService.ts
import { PrismaClient } from '@prisma/client';

export class MaterialService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createSampleMaterialsForSupplier(supplierId: string) {
    const sampleMaterials = [
      {
        name: 'Steel Pipe',
        description: 'Industrial grade steel pipe',
        unitPrice: 50.00,
        unit: 'meter',
        minStock: 100,
        currentStock: 500,
        supplierId: supplierId,
        code: 'SP-001' // Added required code field
      },
      {
        name: 'Aluminum Sheet',
        description: 'Thin aluminum sheet',
        unitPrice: 75.50,
        unit: 'square meter',
        minStock: 50,
        currentStock: 250,
        supplierId: supplierId,
        code: 'AS-001' // Added required code field
      },
      {
        name: 'Copper Wire',
        description: 'Electrical grade copper wire',
        unitPrice: 25.75,
        unit: 'kg',
        minStock: 200,
        currentStock: 1000,
        supplierId: supplierId,
        code: 'CW-001' // Added required code field
      }
    ];

    return this.prisma.material.createMany({
      data: sampleMaterials
    });
  }
}