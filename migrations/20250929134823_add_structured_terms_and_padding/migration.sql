-- AlterTable
ALTER TABLE "public"."CompanySettings" ADD COLUMN     "quoteNumberPadding" INTEGER NOT NULL DEFAULT 4;

-- AlterTable
ALTER TABLE "public"."Quote" ADD COLUMN     "deliveryTerms" TEXT,
ADD COLUMN     "exclusions" TEXT,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "termsAndConditions" TEXT,
ADD COLUMN     "warranty" TEXT;
