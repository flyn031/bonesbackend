-- AlterTable
ALTER TABLE "User" ADD COLUMN     "companyAddress" TEXT,
ADD COLUMN     "companyEmail" TEXT,
ADD COLUMN     "companyLogo" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "companyPhone" TEXT,
ADD COLUMN     "companyVatNumber" TEXT,
ADD COLUMN     "companyWebsite" TEXT,
ADD COLUMN     "useCompanyDetailsOnQuotes" BOOLEAN DEFAULT false;
