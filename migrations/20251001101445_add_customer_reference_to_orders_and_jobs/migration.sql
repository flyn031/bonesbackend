-- AlterTable
ALTER TABLE "public"."Job" ADD COLUMN     "customerReference" TEXT;

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "customerReference" TEXT;
