-- DropForeignKey
ALTER TABLE "Material" DROP CONSTRAINT "Material_supplierId_fkey";

-- AlterTable
ALTER TABLE "Material" ALTER COLUMN "supplierId" DROP NOT NULL,
ALTER COLUMN "currentStock" SET DEFAULT 0,
ALTER COLUMN "minStock" SET DEFAULT 0,
ALTER COLUMN "leadTimeInDays" SET DEFAULT 0,
ALTER COLUMN "reorderPoint" SET DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
