-- CreateEnum
CREATE TYPE "InventoryPurpose" AS ENUM ('INTERNAL', 'CUSTOMER', 'DUAL');

-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "customerMarkupPercent" DOUBLE PRECISION,
ADD COLUMN     "inventoryPurpose" "InventoryPurpose" NOT NULL DEFAULT 'INTERNAL',
ADD COLUMN     "isOrderable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isQuotable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preferredSupplierId" TEXT,
ADD COLUMN     "visibleToCustomers" BOOLEAN NOT NULL DEFAULT false;
