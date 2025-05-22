-- CreateEnum
CREATE TYPE "ContactRole" AS ENUM ('ACCOUNTS', 'DELIVERIES', 'PRIMARY_BUYER', 'TECHNICAL_CONTACT', 'SITE_CONTACT', 'PROJECT_MANAGER', 'GENERAL_INQUIRY', 'OTHER');

-- CreateTable
CREATE TABLE "ContactPerson" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" "ContactRole",
    "notes" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactPerson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContactPerson_email_key" ON "ContactPerson"("email");

-- CreateIndex
CREATE INDEX "ContactPerson_customerId_idx" ON "ContactPerson"("customerId");

-- CreateIndex
CREATE INDEX "ContactPerson_email_idx" ON "ContactPerson"("email");

-- AddForeignKey
ALTER TABLE "ContactPerson" ADD CONSTRAINT "ContactPerson_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
