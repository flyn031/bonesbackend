-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "productSpecifications" TEXT;

-- CreateIndex
CREATE INDEX "Material_customerId_idx" ON "Material"("customerId");

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
