// scripts/createSampleData.ts
import { PrismaClient, MaterialCategory, SupplierStatus } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Create some sample suppliers
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        name: 'ABC Suppliers',
        email: 'contact@abcsuppliers.com',
        phone: '01234 567890',
        address: '123 Main Street, London',
        rating: 4.5,
        status: SupplierStatus.ACTIVE,
        notes: 'Reliable supplier for construction materials',
        totalOrders: 0,
        completedOrders: 0,
        averageDeliveryTime: 0
      }
    }),
    prisma.supplier.create({
      data: {
        name: 'XYZ Materials',
        email: 'sales@xyzmaterials.com',
        phone: '01234 098765',
        address: '456 Market Street, Birmingham',
        rating: 4.2,
        status: SupplierStatus.ACTIVE,
        notes: 'Specialized in raw materials',
        totalOrders: 0,
        completedOrders: 0,
        averageDeliveryTime: 0
      }
    }),
    prisma.supplier.create({
      data: {
        name: 'Build Co.',
        email: 'info@buildco.com',
        phone: '01234 123456',
        address: '789 Industry Avenue, Manchester',
        rating: 3.8,
        status: SupplierStatus.ACTIVE,
        notes: 'Good for equipment and parts',
        totalOrders: 0,
        completedOrders: 0,
        averageDeliveryTime: 0
      }
    })
  ]);

  // Create some sample materials
  const materials = await Promise.all([
    prisma.material.create({
      data: {
        name: 'Lumber',
        code: 'LMB-001',
        description: 'High quality construction lumber',
        category: MaterialCategory.RAW_MATERIAL,
        unitPrice: 25.50,
        unit: 'BOARD',
        minStockLevel: 10,
        currentStockLevel: 35,
        reorderPoint: 15,
        leadTimeInDays: 7,
        manufacturer: 'WoodWorks Inc.',
        supplierId: suppliers[0].id
      }
    }),
    prisma.material.create({
      data: {
        name: 'Concrete Mix',
        code: 'CON-001',
        description: 'Standard grade concrete mix',
        category: MaterialCategory.RAW_MATERIAL,
        unitPrice: 0.85,
        unit: 'KG',
        minStockLevel: 100,
        currentStockLevel: 350,
        reorderPoint: 150,
        leadTimeInDays: 3,
        manufacturer: 'Concrete Solutions Ltd',
        supplierId: suppliers[1].id
      }
    }),
    prisma.material.create({
      data: {
        name: 'Industrial Paint',
        code: 'PNT-001',
        description: 'Weather-resistant exterior paint',
        category: MaterialCategory.RAW_MATERIAL,
        unitPrice: 12.99,
        unit: 'LITER',
        minStockLevel: 5,
        currentStockLevel: 22,
        reorderPoint: 10,
        leadTimeInDays: 5,
        manufacturer: 'ColorTech Industries',
        supplierId: suppliers[2].id
      }
    })
  ]);

  console.log('Created suppliers:', suppliers);
  console.log('Created materials:', materials);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });