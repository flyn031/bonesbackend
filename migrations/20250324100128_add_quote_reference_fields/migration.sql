/*
  Warnings:

  - A unique constraint covering the columns `[quoteNumber]` on the table `Quote` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "customerReference" TEXT,
ADD COLUMN     "quoteNumber" TEXT;

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL,
    "quoteNumberPrefix" TEXT NOT NULL DEFAULT 'Q',
    "quoteNumberFormat" TEXT NOT NULL DEFAULT '{PREFIX}-{YEAR}-{SEQ}',
    "lastQuoteNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");
