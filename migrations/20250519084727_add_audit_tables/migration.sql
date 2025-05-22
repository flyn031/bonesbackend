-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "currentVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "currentVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "currentVersion" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "QuoteHistory" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "changeType" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changeReason" TEXT,
    "customerApproved" BOOLEAN,
    "customerSignature" TEXT,
    "approvalTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "QuoteHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "changeType" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changeReason" TEXT,
    "customerApproved" BOOLEAN,
    "customerSignature" TEXT,
    "approvalTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "OrderHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobHistory" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "changeType" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changeReason" TEXT,
    "materialChanges" JSONB,
    "progressNotes" TEXT,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "JobHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileHash" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "storageType" TEXT NOT NULL DEFAULT 'LOCAL',
    "category" TEXT NOT NULL,
    "quoteId" TEXT,
    "orderId" TEXT,
    "jobId" TEXT,
    "isLegalDocument" BOOLEAN NOT NULL DEFAULT false,
    "retentionPeriod" INTEGER,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteHistory_quoteId_idx" ON "QuoteHistory"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteHistory_changedBy_idx" ON "QuoteHistory"("changedBy");

-- CreateIndex
CREATE INDEX "QuoteHistory_createdAt_idx" ON "QuoteHistory"("createdAt");

-- CreateIndex
CREATE INDEX "OrderHistory_orderId_idx" ON "OrderHistory"("orderId");

-- CreateIndex
CREATE INDEX "OrderHistory_changedBy_idx" ON "OrderHistory"("changedBy");

-- CreateIndex
CREATE INDEX "OrderHistory_createdAt_idx" ON "OrderHistory"("createdAt");

-- CreateIndex
CREATE INDEX "JobHistory_jobId_idx" ON "JobHistory"("jobId");

-- CreateIndex
CREATE INDEX "JobHistory_changedBy_idx" ON "JobHistory"("changedBy");

-- CreateIndex
CREATE INDEX "JobHistory_createdAt_idx" ON "JobHistory"("createdAt");

-- CreateIndex
CREATE INDEX "Document_quoteId_idx" ON "Document"("quoteId");

-- CreateIndex
CREATE INDEX "Document_orderId_idx" ON "Document"("orderId");

-- CreateIndex
CREATE INDEX "Document_jobId_idx" ON "Document"("jobId");

-- CreateIndex
CREATE INDEX "Document_uploadedBy_idx" ON "Document"("uploadedBy");

-- CreateIndex
CREATE INDEX "Document_category_idx" ON "Document"("category");

-- AddForeignKey
ALTER TABLE "QuoteHistory" ADD CONSTRAINT "QuoteHistory_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteHistory" ADD CONSTRAINT "QuoteHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderHistory" ADD CONSTRAINT "OrderHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderHistory" ADD CONSTRAINT "OrderHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobHistory" ADD CONSTRAINT "JobHistory_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobHistory" ADD CONSTRAINT "JobHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
