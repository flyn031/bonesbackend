-- Add structured term fields to Quote
ALTER TABLE "Quote" ADD COLUMN "paymentTerms" TEXT;
ALTER TABLE "Quote" ADD COLUMN "deliveryTerms" TEXT;
ALTER TABLE "Quote" ADD COLUMN "warranty" TEXT;
ALTER TABLE "Quote" ADD COLUMN "exclusions" TEXT;

-- Add padding config to CompanySettings
ALTER TABLE "CompanySettings" ADD COLUMN "quoteNumberPadding" INTEGER DEFAULT 4;

-- Remove duplicate numbering fields (commented out - run manually if safe)
-- ALTER TABLE "CompanySettings" DROP COLUMN "lastQuoteNumber";
-- ALTER TABLE "CompanySettings" DROP COLUMN "quoteNumberPrefix";
-- ALTER TABLE "CompanySettings" DROP COLUMN "quoteNumberFormat";
