-- CreateEnum
CREATE TYPE "JobCostCategory" AS ENUM ('MATERIALS', 'LABOR', 'EQUIPMENT', 'SUBCONTRACTOR', 'ADMINISTRATIVE', 'TRAVEL', 'OTHER');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "totalCosts" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "JobCost" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" "JobCostCategory" NOT NULL DEFAULT 'OTHER',
    "invoiced" BOOLEAN NOT NULL DEFAULT false,
    "materialId" TEXT,
    "supplierId" TEXT,
    "attachmentUrl" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobCost_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "JobCost" ADD CONSTRAINT "JobCost_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCost" ADD CONSTRAINT "JobCost_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCost" ADD CONSTRAINT "JobCost_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCost" ADD CONSTRAINT "JobCost_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
