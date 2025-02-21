/*
  Warnings:

  - Made the column `email` on table `Supplier` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SupplierStatus" ADD VALUE 'SUSPENDED';
ALTER TYPE "SupplierStatus" ADD VALUE 'UNDER_REVIEW';

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "averageDeliveryTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "completedOrders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastOrderDate" TIMESTAMP(3),
ADD COLUMN     "performanceHistory" JSONB,
ADD COLUMN     "totalOrders" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "email" SET NOT NULL;
