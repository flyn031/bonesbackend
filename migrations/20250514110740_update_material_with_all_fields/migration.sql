-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN     "companyAddress" TEXT,
ADD COLUMN     "companyEmail" TEXT,
ADD COLUMN     "companyLogo" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "companyPhone" TEXT,
ADD COLUMN     "companyVatNumber" TEXT,
ADD COLUMN     "companyWebsite" TEXT;

-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "category" TEXT,
ADD COLUMN     "customerMarkupPercent" DOUBLE PRECISION,
ADD COLUMN     "inventoryPurpose" TEXT DEFAULT 'INTERNAL',
ADD COLUMN     "isOrderable" BOOLEAN DEFAULT true,
ADD COLUMN     "isQuotable" BOOLEAN DEFAULT false,
ADD COLUMN     "leadTimeInDays" INTEGER,
ADD COLUMN     "reorderPoint" INTEGER,
ADD COLUMN     "visibleToCustomers" BOOLEAN DEFAULT false;

-- CreateIndex
CREATE INDEX "Material_code_idx" ON "Material"("code");
