/*
  Warnings:

  - You are about to drop the column `lastQuoteNumber` on the `CompanySettings` table. All the data in the column will be lost.
  - You are about to drop the column `quoteNumberFormat` on the `CompanySettings` table. All the data in the column will be lost.
  - You are about to drop the column `quoteNumberPrefix` on the `CompanySettings` table. All the data in the column will be lost.
  - You are about to drop the column `actualCost` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `actualEndDate` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedCost` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `totalCosts` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `attachmentUrl` on the `JobCost` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `JobCost` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `JobCost` table. All the data in the column will be lost.
  - You are about to drop the column `invoiced` on the `JobCost` table. All the data in the column will be lost.
  - You are about to drop the column `materialId` on the `JobCost` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `JobCost` table. All the data in the column will be lost.
  - You are about to drop the column `supplierId` on the `JobCost` table. All the data in the column will be lost.
  - The `category` column on the `JobCost` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `category` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `currentStockLevel` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `customerMarkupPercent` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `inventoryPurpose` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `isOrderable` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `isQuotable` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `leadTimeInDays` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `manufacturer` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `minStockLevel` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `preferredSupplierId` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `productSpecifications` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `reorderPoint` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `visibleToCustomers` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `averageDeliveryTime` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `completedOrders` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `lastOrderDate` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `performanceHistory` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `totalOrders` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `companyAddress` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `companyEmail` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `companyLogo` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `companyName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `companyPhone` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `companyVatNumber` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `companyWebsite` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `useCompanyDetailsOnQuotes` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `BundleItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CustomerPricing` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ItemBundle` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JobMaterial` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JobNote` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PriceHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuoteTemplate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuoteTemplateItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserJobAssignment` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `currentStock` to the `Material` table without a default value. This is not possible if the table is not empty.
  - Added the required column `minStock` to the `Material` table without a default value. This is not possible if the table is not empty.
  - Made the column `supplierId` on table `Material` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `quoteReference` to the `Quote` table without a default value. This is not possible if the table is not empty.
  - Made the column `totalAmount` on table `Quote` required. This step will fail if there are existing NULL values in that column.
  - Made the column `quoteNumber` on table `Quote` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `QuoteLineItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContactRole" ADD VALUE 'PRIMARY';
ALTER TYPE "ContactRole" ADD VALUE 'BILLING';
ALTER TYPE "ContactRole" ADD VALUE 'TECHNICAL';
ALTER TYPE "ContactRole" ADD VALUE 'SALES';
ALTER TYPE "ContactRole" ADD VALUE 'SUPPORT';

-- AlterEnum
ALTER TYPE "JobStatus" ADD VALUE 'ON_HOLD';

-- DropForeignKey
ALTER TABLE "BundleItem" DROP CONSTRAINT "BundleItem_bundleId_fkey";

-- DropForeignKey
ALTER TABLE "BundleItem" DROP CONSTRAINT "BundleItem_materialId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerPricing" DROP CONSTRAINT "CustomerPricing_customerId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerPricing" DROP CONSTRAINT "CustomerPricing_materialId_fkey";

-- DropForeignKey
ALTER TABLE "ItemBundle" DROP CONSTRAINT "ItemBundle_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_createdById_fkey";

-- DropForeignKey
ALTER TABLE "JobCost" DROP CONSTRAINT "JobCost_createdById_fkey";

-- DropForeignKey
ALTER TABLE "JobCost" DROP CONSTRAINT "JobCost_jobId_fkey";

-- DropForeignKey
ALTER TABLE "JobCost" DROP CONSTRAINT "JobCost_materialId_fkey";

-- DropForeignKey
ALTER TABLE "JobCost" DROP CONSTRAINT "JobCost_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "JobMaterial" DROP CONSTRAINT "JobMaterial_jobId_fkey";

-- DropForeignKey
ALTER TABLE "JobMaterial" DROP CONSTRAINT "JobMaterial_materialId_fkey";

-- DropForeignKey
ALTER TABLE "JobNote" DROP CONSTRAINT "JobNote_authorId_fkey";

-- DropForeignKey
ALTER TABLE "JobNote" DROP CONSTRAINT "JobNote_jobId_fkey";

-- DropForeignKey
ALTER TABLE "Material" DROP CONSTRAINT "Material_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Material" DROP CONSTRAINT "Material_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentMilestone" DROP CONSTRAINT "PaymentMilestone_orderId_fkey";

-- DropForeignKey
ALTER TABLE "PriceHistory" DROP CONSTRAINT "PriceHistory_materialId_fkey";

-- DropForeignKey
ALTER TABLE "Quote" DROP CONSTRAINT "Quote_customerId_fkey";

-- DropForeignKey
ALTER TABLE "QuoteLineItem" DROP CONSTRAINT "QuoteLineItem_quoteId_fkey";

-- DropForeignKey
ALTER TABLE "QuoteTemplate" DROP CONSTRAINT "QuoteTemplate_createdById_fkey";

-- DropForeignKey
ALTER TABLE "QuoteTemplateItem" DROP CONSTRAINT "QuoteTemplateItem_materialId_fkey";

-- DropForeignKey
ALTER TABLE "QuoteTemplateItem" DROP CONSTRAINT "QuoteTemplateItem_templateId_fkey";

-- DropForeignKey
ALTER TABLE "UserJobAssignment" DROP CONSTRAINT "UserJobAssignment_jobId_fkey";

-- DropForeignKey
ALTER TABLE "UserJobAssignment" DROP CONSTRAINT "UserJobAssignment_userId_fkey";

-- DropIndex
DROP INDEX "ContactPerson_email_key";

-- DropIndex
DROP INDEX "Order_quoteRef_key";

-- AlterTable
ALTER TABLE "CompanySettings" DROP COLUMN "lastQuoteNumber",
DROP COLUMN "quoteNumberFormat",
DROP COLUMN "quoteNumberPrefix",
ADD COLUMN     "lastQuoteReferenceSeq" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quoteReferencePrefix" TEXT NOT NULL DEFAULT 'QR';

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "totalOrders" DROP NOT NULL,
ALTER COLUMN "totalOrders" DROP DEFAULT,
ALTER COLUMN "totalSpent" DROP NOT NULL,
ALTER COLUMN "totalSpent" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "actualCost",
DROP COLUMN "actualEndDate",
DROP COLUMN "createdById",
DROP COLUMN "estimatedCost",
DROP COLUMN "totalCosts",
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "JobCost" DROP COLUMN "attachmentUrl",
DROP COLUMN "createdById",
DROP COLUMN "date",
DROP COLUMN "invoiced",
DROP COLUMN "materialId",
DROP COLUMN "notes",
DROP COLUMN "supplierId",
ADD COLUMN     "costDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "category",
ADD COLUMN     "category" TEXT;

-- AlterTable
ALTER TABLE "Material" DROP COLUMN "category",
DROP COLUMN "currentStockLevel",
DROP COLUMN "customerId",
DROP COLUMN "customerMarkupPercent",
DROP COLUMN "inventoryPurpose",
DROP COLUMN "isOrderable",
DROP COLUMN "isQuotable",
DROP COLUMN "leadTimeInDays",
DROP COLUMN "manufacturer",
DROP COLUMN "minStockLevel",
DROP COLUMN "preferredSupplierId",
DROP COLUMN "productSpecifications",
DROP COLUMN "reorderPoint",
DROP COLUMN "visibleToCustomers",
ADD COLUMN     "currentStock" INTEGER NOT NULL,
ADD COLUMN     "minStock" INTEGER NOT NULL,
ALTER COLUMN "supplierId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "sourceQuoteId" TEXT,
ALTER COLUMN "contactPerson" DROP NOT NULL,
ALTER COLUMN "contactPhone" DROP NOT NULL,
ALTER COLUMN "contactEmail" DROP NOT NULL,
ALTER COLUMN "marginPercent" DROP NOT NULL,
ALTER COLUMN "leadTimeWeeks" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "changeReason" TEXT,
ADD COLUMN     "isLatestVersion" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "parentQuoteId" TEXT,
ADD COLUMN     "quoteReference" TEXT NOT NULL,
ADD COLUMN     "versionNumber" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "totalAmount" SET NOT NULL,
ALTER COLUMN "totalAmount" SET DEFAULT 0,
ALTER COLUMN "quoteNumber" SET NOT NULL;

-- AlterTable
ALTER TABLE "QuoteLineItem" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "quantity" SET DEFAULT 1,
ALTER COLUMN "unitPrice" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Supplier" DROP COLUMN "averageDeliveryTime",
DROP COLUMN "completedOrders",
DROP COLUMN "lastOrderDate",
DROP COLUMN "notes",
DROP COLUMN "performanceHistory",
DROP COLUMN "totalOrders",
ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "companyAddress",
DROP COLUMN "companyEmail",
DROP COLUMN "companyLogo",
DROP COLUMN "companyName",
DROP COLUMN "companyPhone",
DROP COLUMN "companyVatNumber",
DROP COLUMN "companyWebsite",
DROP COLUMN "useCompanyDetailsOnQuotes";

-- DropTable
DROP TABLE "BundleItem";

-- DropTable
DROP TABLE "CustomerPricing";

-- DropTable
DROP TABLE "ItemBundle";

-- DropTable
DROP TABLE "JobMaterial";

-- DropTable
DROP TABLE "JobNote";

-- DropTable
DROP TABLE "PriceHistory";

-- DropTable
DROP TABLE "QuoteTemplate";

-- DropTable
DROP TABLE "QuoteTemplateItem";

-- DropTable
DROP TABLE "UserJobAssignment";

-- DropEnum
DROP TYPE "InventoryPurpose";

-- DropEnum
DROP TYPE "JobCostCategory";

-- DropEnum
DROP TYPE "MaterialCategory";

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Job_customerId_idx" ON "Job"("customerId");

-- CreateIndex
CREATE INDEX "JobCost_jobId_idx" ON "JobCost"("jobId");

-- CreateIndex
CREATE INDEX "Material_supplierId_idx" ON "Material"("supplierId");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_jobId_idx" ON "Order"("jobId");

-- CreateIndex
CREATE INDEX "Order_projectOwnerId_idx" ON "Order"("projectOwnerId");

-- CreateIndex
CREATE INDEX "Order_createdById_idx" ON "Order"("createdById");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_quoteRef_idx" ON "Order"("quoteRef");

-- CreateIndex
CREATE INDEX "Order_sourceQuoteId_idx" ON "Order"("sourceQuoteId");

-- CreateIndex
CREATE INDEX "PaymentMilestone_orderId_idx" ON "PaymentMilestone"("orderId");

-- CreateIndex
CREATE INDEX "Quote_quoteReference_idx" ON "Quote"("quoteReference");

-- CreateIndex
CREATE INDEX "Quote_customerId_idx" ON "Quote"("customerId");

-- CreateIndex
CREATE INDEX "Quote_createdById_idx" ON "Quote"("createdById");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE INDEX "Quote_parentQuoteId_idx" ON "Quote"("parentQuoteId");

-- CreateIndex
CREATE INDEX "QuoteLineItem_quoteId_idx" ON "QuoteLineItem"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteLineItem_materialId_idx" ON "QuoteLineItem"("materialId");

-- CreateIndex
CREATE INDEX "Supplier_email_idx" ON "Supplier"("email");

-- AddForeignKey
ALTER TABLE "JobCost" ADD CONSTRAINT "JobCost_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sourceQuoteId_fkey" FOREIGN KEY ("sourceQuoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMilestone" ADD CONSTRAINT "PaymentMilestone_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_parentQuoteId_fkey" FOREIGN KEY ("parentQuoteId") REFERENCES "Quote"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
