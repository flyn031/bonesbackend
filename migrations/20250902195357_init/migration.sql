-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN     "defaultLeadTimeWeeks" INTEGER,
ADD COLUMN     "standardDeliveryTerms" TEXT,
ADD COLUMN     "standardExclusions" TEXT,
ADD COLUMN     "standardWarranty" TEXT,
ADD COLUMN     "useCompanyDetailsOnQuotes" BOOLEAN DEFAULT false;
