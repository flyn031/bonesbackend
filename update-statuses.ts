import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateStatuses() {
  console.log('Updating Job statuses...');
  
  // Update Jobs
  await prisma.$executeRaw`UPDATE "Job" SET status = 'IN_PRODUCTION' WHERE status = 'ACTIVE'`;
  await prisma.$executeRaw`UPDATE "Job" SET status = 'IN_PRODUCTION' WHERE status = 'DRAFT'`;
  await prisma.$executeRaw`UPDATE "Job" SET status = 'IN_PRODUCTION' WHERE status = 'PENDING'`;
  await prisma.$executeRaw`UPDATE "Job" SET status = 'IN_PRODUCTION' WHERE status = 'IN_PROGRESS'`;
  await prisma.$executeRaw`UPDATE "Job" SET status = 'CANCELLED' WHERE status = 'CANCELED'`;
  
  console.log('Updating Order statuses...');
  
  // Update Orders  
  await prisma.$executeRaw`UPDATE "Order" SET status = 'APPROVED' WHERE status = 'IN_PRODUCTION'`;
  await prisma.$executeRaw`UPDATE "Order" SET status = 'APPROVED' WHERE status = 'ON_HOLD'`;
  await prisma.$executeRaw`UPDATE "Order" SET status = 'APPROVED' WHERE status = 'READY_FOR_DELIVERY'`;
  await prisma.$executeRaw`UPDATE "Order" SET status = 'APPROVED' WHERE status = 'DELIVERED'`;
  await prisma.$executeRaw`UPDATE "Order" SET status = 'APPROVED' WHERE status = 'COMPLETED'`;
  
  console.log('Status updates complete!');
  
  // Verify results
  const jobStatuses = await prisma.$queryRaw`SELECT status, COUNT(*) as count FROM "Job" GROUP BY status`;
  const orderStatuses = await prisma.$queryRaw`SELECT status, COUNT(*) as count FROM "Order" GROUP BY status`;
  
  console.log('Job statuses:', jobStatuses);
  console.log('Order statuses:', orderStatuses);
  
  await prisma.$disconnect();
}

updateStatuses().catch(console.error);
