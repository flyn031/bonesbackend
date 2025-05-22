-- CreateTable
CREATE TABLE "JobMaterial" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantityNeeded" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "quantityUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantityAllocated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "allocatedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobMaterial_jobId_idx" ON "JobMaterial"("jobId");

-- CreateIndex
CREATE INDEX "JobMaterial_materialId_idx" ON "JobMaterial"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "JobMaterial_jobId_materialId_key" ON "JobMaterial"("jobId", "materialId");

-- AddForeignKey
ALTER TABLE "JobMaterial" ADD CONSTRAINT "JobMaterial_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobMaterial" ADD CONSTRAINT "JobMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
