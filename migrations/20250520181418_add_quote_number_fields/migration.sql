/*
  Warnings:

  - A unique constraint covering the columns `[employeeId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN     "defaultVatRate" DOUBLE PRECISION DEFAULT 20.0,
ADD COLUMN     "lastQuoteNumber" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quoteNumberFormat" TEXT NOT NULL DEFAULT '{PREFIX}-{NUMBER}',
ADD COLUMN     "quoteNumberPrefix" TEXT NOT NULL DEFAULT 'Q';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "employeeId" TEXT;

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "jobTitle" TEXT NOT NULL,
    "technicalQualifications" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hireDate" TIMESTAMP(3),
    "terminationDate" TIMESTAMP(3),
    "notes" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "is_rd_activity" BOOLEAN NOT NULL DEFAULT false,
    "rd_description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE INDEX "Employee_jobTitle_idx" ON "Employee"("jobTitle");

-- CreateIndex
CREATE INDEX "Employee_isActive_idx" ON "Employee"("isActive");

-- CreateIndex
CREATE INDEX "TimeEntry_employee_id_idx" ON "TimeEntry"("employee_id");

-- CreateIndex
CREATE INDEX "TimeEntry_job_id_idx" ON "TimeEntry"("job_id");

-- CreateIndex
CREATE INDEX "TimeEntry_date_idx" ON "TimeEntry"("date");

-- CreateIndex
CREATE INDEX "TimeEntry_is_rd_activity_idx" ON "TimeEntry"("is_rd_activity");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
