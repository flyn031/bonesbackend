-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentTerms" ADD VALUE 'SPLIT_50_50';
ALTER TYPE "PaymentTerms" ADD VALUE 'SPLIT_50_40_10';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "billingAddress" TEXT,
ADD COLUMN     "creditLimit" DOUBLE PRECISION,
ADD COLUMN     "discountPercentage" DOUBLE PRECISION,
ADD COLUMN     "paymentTerms" "PaymentTerms",
ADD COLUMN     "shippingAddress" TEXT,
ADD COLUMN     "specialTermsNotes" TEXT;
