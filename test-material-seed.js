// test-material-seed.js
// Import with the correct path to where Prisma generated the client
const { PrismaClient } = require('./prisma/node_modules/.prisma/client');

// Initialize with debug mode to see what's happening
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('Attempting to create Material with category...');

  // First, ensure a supplier exists, as Material needs a supplierId
  const supplier = await prisma.supplier.upsert({
    where: { email: 'temp.supplier@example.com' },
    update: {},
    create: {
      name: 'Temporary Supplier for Test',
      email: 'temp.supplier@example.com',
      status: 'ACTIVE', // Assuming ACTIVE is a valid SupplierStatus from your enum
    },
  });
  console.log('Upserted temporary supplier:', supplier.id);

  try {
    const material = await prisma.material.create({
      data: {
        code: 'TEST-CAT-001', // Ensure this code is unique for testing
        name: 'Test Category Material',
        unitPrice: 1.0,
        unit: 'test',
        minStock: 1,
        currentStock: 1,
        supplierId: supplier.id,
        // category: "TEST_CATEGORY_FIELD", // Removed - this field doesn't exist in your schema
        // Optional fields from your schema
        description: "Test description",
        // Add any other fields that are actually in your schema
      },
    });
    console.log('Successfully created material with category:', material);
  } catch (e) {
    console.error('Error creating material with category:', e);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error in main execution:', e);
    await prisma.$disconnect();
    process.exit(1);
  });