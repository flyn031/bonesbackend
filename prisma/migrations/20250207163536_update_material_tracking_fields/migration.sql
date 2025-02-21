/*
  Warnings:

  - You are about to drop the column `currentStock` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `minStock` on the `Material` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Material" DROP COLUMN "currentStock",
DROP COLUMN "minStock",
ADD COLUMN     "currentStockLevel" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "leadTimeInDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "minStockLevel" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reorderPoint" INTEGER NOT NULL DEFAULT 0;
