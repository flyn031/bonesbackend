// seed-test-user.js
const { PrismaClient, PaymentTerms } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash('password123', saltRounds);

  console.log('Upserting User...');
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {
        name: 'Test Admin User',
        password: hashedPassword,
        role: 'ADMIN',
    },
    create: {
      email: 'test@example.com',
      name: 'Test Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  console.log('Upserted user:', user.id);

  console.log('Upserting Company Settings...');
  let settings = await prisma.companySettings.findFirst();
  if (!settings) {
    settings = await prisma.companySettings.create({
      data: {
        quoteReferencePrefix: 'QR',
        lastQuoteReferenceSeq: 0, // Start sequence at 0, first will be 1
        companyName: 'Test Company Inc.',
        companyEmail: 'contact@testcompany.com',
        // Add other default company settings if needed, e.g., defaultVatRate
        // defaultVatRate: new Prisma.Decimal(20.0), // Assuming it's a Decimal
      },
    });
    console.log('Created default company settings:', settings);
  } else {
     // Ensure lastQuoteReferenceSeq is at least 0 if settings exist
     if (settings.lastQuoteReferenceSeq < 0) {
        settings = await prisma.companySettings.update({
            where: { id: settings.id },
            data: { lastQuoteReferenceSeq: 0 }
        });
        console.log('Updated company settings lastQuoteReferenceSeq to 0');
     }
    console.log('Default company settings already exist or updated:', settings);
  }
  console.log('Company settings ID:', settings?.id);


  console.log('Upserting Customer...');
  const customer = await prisma.customer.upsert({
    where: { email: 'customer@example.com' },
    update: {
        name: 'Valued Seed Customer',
        phone: '555-123-4567',
        address: '123 Seed Street, Data City',
        paymentTerms: PaymentTerms.THIRTY_DAYS,
        status: 'ACTIVE',
    },
    create: {
      name: 'Valued Seed Customer',
      email: 'customer@example.com',
      phone: '555-123-4567',
      address: '123 Seed Street, Data City',
      shippingAddress: '123 Seed Street, Data City',
      billingAddress: '123 Seed Street, Data City',
      paymentTerms: PaymentTerms.THIRTY_DAYS,
      status: 'ACTIVE', // Ensure your CustomerStatus enum (if any) matches or use a string
    },
  });
  console.log('Upserted customer:', customer.id);

  console.log('Upserting Supplier...');
  const supplier = await prisma.supplier.upsert({
    where: { email: 'supplier.one@example.com' },
    update: {
        name: 'Reliable Parts Co.',
        phone: '555-987-6543',
        address: '789 Supply Row',
    },
    create: {
      name: 'Reliable Parts Co.',
      email: 'supplier.one@example.com',
      phone: '555-987-6543',
      address: '789 Supply Row',
      status: 'ACTIVE', // Ensure your SupplierStatus enum matches
    },
  });
  console.log('Upserted supplier:', supplier.id);

  // Upsert "Standard Widget" Material (SEED-MAT-001)
  console.log('Upserting Material: SEED-MAT-001...');
  const material1Data = {
      code: 'SEED-MAT-001',
      name: 'Standard Widget',
      description: 'A reliable standard widget for all purposes.',
      unitPrice: 19.99,
      unit: 'piece',
      minStock: 10,
      currentStock: 100,
      supplierId: supplier.id,
      category: "GENERAL_COMPONENTS",
      reorderPoint: 20,
      leadTimeInDays: 7,
      inventoryPurpose: "DUAL",
      isQuotable: true,
      isOrderable: true,
      customerMarkupPercent: 25.0,
      visibleToCustomers: true,
  };
  const material1 = await prisma.material.upsert({
    where: { code: 'SEED-MAT-001' },
    update: {
        name: 'Standard Widget V2',
        currentStock: 150,
        unitPrice: 20.50,
        category: "GENERAL_COMPONENTS_V2",
        reorderPoint: 25,
    },
    create: material1Data,
  });
  console.log('Upserted material (SEED-MAT-001):', material1.id);

  // Upsert "Conveyor Belt" Material (SP004)
  console.log('Upserting Material: SP004...');
  const materialSP004Data = {
      code: 'SP004',
      name: 'Polyurethane Conveyor Belt',
      description: 'Polyurethane conveyor belt, 300mm width, food grade.',
      unitPrice: 45.00,
      unit: 'meter',
      minStock: 50,
      currentStock: 200,
      supplierId: supplier.id,
      category: "CONVEYOR_PARTS",
      reorderPoint: 75,
      leadTimeInDays: 10,
      inventoryPurpose: "INTERNAL",
      isQuotable: true,
      isOrderable: true,
      customerMarkupPercent: 30.0,
      visibleToCustomers: true,
  };
  const materialSP004 = await prisma.material.upsert({
    where: { code: 'SP004' },
    update: {
        name: 'Polyurethane Conveyor Belt (Updated)',
        currentStock: 220,
        unitPrice: 47.50,
    },
    create: materialSP004Data,
  });
  console.log('Upserted material (SP004):', materialSP004.id);

  // Upsert "Roller Conveyor" Material (RC002)
  console.log('Upserting Material: RC002...');
  const materialRC002Data = {
      code: 'RC002',
      name: 'Medium Duty Gravity Roller Conveyor',
      description: 'Medium duty gravity roller conveyor, 500mm wide sections.',
      unitPrice: 350.00,
      unit: 'section',
      minStock: 5,
      currentStock: 20,
      supplierId: supplier.id,
      category: "CONVEYORS_SYSTEMS",
      reorderPoint: 8,
      leadTimeInDays: 21,
      inventoryPurpose: "PROJECT",
      isQuotable: true,
      isOrderable: true,
      customerMarkupPercent: 20.0,
      visibleToCustomers: false,
  };
  const materialRC002 = await prisma.material.upsert({
    where: { code: 'RC002' },
    update: {
        name: 'Medium Duty Gravity Roller Conveyor (Revised)',
        currentStock: 25,
        unitPrice: 355.00,
    },
    create: materialRC002Data,
  });
  console.log('Upserted material (RC002):', materialRC002.id);
  
  // Upsert Test Category Material (TEST-CAT-001)
  console.log('Upserting Material: TEST-CAT-001...');
  const materialTestCatData = {
      code: 'TEST-CAT-001',
      name: 'Test Category Material',
      description: 'Test description for category material',
      unitPrice: 1.00,
      unit: 'unit',
      minStock: 1,
      currentStock: 10,
      supplierId: supplier.id,
      category: "TESTING", // This was "TEST_CATEGORY_FIELD" which might not match your schema
      reorderPoint: 2,
      leadTimeInDays: 1,
      inventoryPurpose: "INTERNAL",
      isQuotable: false,
      isOrderable: false,
      customerMarkupPercent: 0,
      visibleToCustomers: false,
  };
  const materialTestCat = await prisma.material.upsert({
    where: { code: 'TEST-CAT-001' },
    update: {
        currentStock: 15,
        description: 'Test description for category material (updated)',
    },
    create: materialTestCatData,
  });
  console.log('Upserted material (TEST-CAT-001):', materialTestCat.id);

  // Upsert "Flat Belt Conveyor" Material (BC001) - From latest error
  console.log('Upserting Material: BC001...');
  const materialBC001Data = {
      code: 'BC001',
      name: 'Light Duty Flat Belt Conveyor',
      description: 'Light duty flat belt conveyor, ideal for small parts transfer.',
      unitPrice: 950.00,
      unit: 'meter',
      minStock: 3,
      currentStock: 10,
      supplierId: supplier.id,
      category: "BELT_CONVEYORS",
      reorderPoint: 5,
      leadTimeInDays: 14,
      inventoryPurpose: "PROJECT",
      isQuotable: true,
      isOrderable: true,
      customerMarkupPercent: 22.0,
      visibleToCustomers: true,
  };
  const materialBC001 = await prisma.material.upsert({
    where: { code: 'BC001' },
    update: {
        currentStock: 12,
        unitPrice: 955.00,
        description: 'Light duty flat belt conveyor, ideal for small parts transfer. (Rev. A)',
    },
    create: materialBC001Data,
  });
  console.log('Upserted material (BC001):', materialBC001.id);

  // Upsert "Standard Motor" Material (SP003) - From latest error
  console.log('Upserting Material: SP003...');
  const materialSP003Data = {
      code: 'SP003',
      name: 'Standard 0.75kW 3-Phase Motor',
      description: 'Standard 0.75kW 3-phase motor, commonly used in conveyor systems.',
      unitPrice: 280.00,
      unit: 'piece',
      minStock: 10,
      currentStock: 30,
      supplierId: supplier.id,
      category: "MOTORS_DRIVES",
      reorderPoint: 15,
      leadTimeInDays: 5,
      inventoryPurpose: "INTERNAL",
      isQuotable: true,
      isOrderable: true,
      customerMarkupPercent: 20.0,
      visibleToCustomers: false,
  };
  const materialSP003 = await prisma.material.upsert({
    where: { code: 'SP003' },
    update: {
        currentStock: 35,
        unitPrice: 285.00,
        description: 'Standard 0.75kW 3-phase motor, TEFC. (Rev. B)',
    },
    create: materialSP003Data,
  });
  console.log('Upserted material (SP003):', materialSP003.id);

  console.log('Seeding complete.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error during seeding:', e);
    if (e.code) {
        console.error('Prisma error code:', e.code);
    }
    if (e.meta) {
        console.error('Prisma error meta:', e.meta);
    }
    await prisma.$disconnect();
    process.exit(1);
  });