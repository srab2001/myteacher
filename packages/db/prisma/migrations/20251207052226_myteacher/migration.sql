/*
  Warnings:

  - You are about to drop the column `studentIdNum` on the `Student` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[recordId]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `recordId` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PriorPlanSource" AS ENUM ('UPLOADED', 'SIS_IMPORT');

-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETE', 'ERROR');

-- DropIndex
DROP INDEX "Student_studentIdNum_idx";

-- DropIndex
DROP INDEX "Student_studentIdNum_key";

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "studentIdNum",
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "recordId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "PriorPlanDocument" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "planDate" TIMESTAMP(3),
    "source" "PriorPlanSource" NOT NULL DEFAULT 'UPLOADED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" TEXT NOT NULL,
    "planTypeId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "PriorPlanDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BestPracticeDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "gradeBand" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ingestionStatus" "IngestionStatus" NOT NULL DEFAULT 'PENDING',
    "ingestionMessage" TEXT,
    "ingestionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planTypeId" TEXT NOT NULL,
    "jurisdictionId" TEXT,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "BestPracticeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planTypeId" TEXT NOT NULL,
    "jurisdictionId" TEXT,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "FormTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BestPracticeChunk" (
    "id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "sectionTag" TEXT,
    "text" TEXT NOT NULL,
    "embedding" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "planTypeCode" TEXT NOT NULL,
    "jurisdictionId" TEXT,
    "gradeBand" TEXT,
    "bestPracticeDocumentId" TEXT NOT NULL,

    CONSTRAINT "BestPracticeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriorPlanDocument_studentId_idx" ON "PriorPlanDocument"("studentId");

-- CreateIndex
CREATE INDEX "PriorPlanDocument_studentId_planTypeId_idx" ON "PriorPlanDocument"("studentId", "planTypeId");

-- CreateIndex
CREATE INDEX "PriorPlanDocument_uploadedById_idx" ON "PriorPlanDocument"("uploadedById");

-- CreateIndex
CREATE INDEX "BestPracticeDocument_planTypeId_idx" ON "BestPracticeDocument"("planTypeId");

-- CreateIndex
CREATE INDEX "BestPracticeDocument_jurisdictionId_idx" ON "BestPracticeDocument"("jurisdictionId");

-- CreateIndex
CREATE INDEX "BestPracticeDocument_isActive_idx" ON "BestPracticeDocument"("isActive");

-- CreateIndex
CREATE INDEX "BestPracticeDocument_ingestionStatus_idx" ON "BestPracticeDocument"("ingestionStatus");

-- CreateIndex
CREATE INDEX "FormTemplate_planTypeId_idx" ON "FormTemplate"("planTypeId");

-- CreateIndex
CREATE INDEX "FormTemplate_jurisdictionId_idx" ON "FormTemplate"("jurisdictionId");

-- CreateIndex
CREATE INDEX "FormTemplate_planTypeId_jurisdictionId_isDefault_idx" ON "FormTemplate"("planTypeId", "jurisdictionId", "isDefault");

-- CreateIndex
CREATE INDEX "BestPracticeChunk_bestPracticeDocumentId_idx" ON "BestPracticeChunk"("bestPracticeDocumentId");

-- CreateIndex
CREATE INDEX "BestPracticeChunk_planTypeCode_jurisdictionId_gradeBand_sec_idx" ON "BestPracticeChunk"("planTypeCode", "jurisdictionId", "gradeBand", "sectionTag");

-- CreateIndex
CREATE INDEX "BestPracticeChunk_sectionTag_idx" ON "BestPracticeChunk"("sectionTag");

-- CreateIndex
CREATE UNIQUE INDEX "Student_recordId_key" ON "Student"("recordId");

-- CreateIndex
CREATE INDEX "Student_recordId_idx" ON "Student"("recordId");

-- CreateIndex
CREATE INDEX "Student_externalId_idx" ON "Student"("externalId");

-- AddForeignKey
ALTER TABLE "PriorPlanDocument" ADD CONSTRAINT "PriorPlanDocument_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorPlanDocument" ADD CONSTRAINT "PriorPlanDocument_planTypeId_fkey" FOREIGN KEY ("planTypeId") REFERENCES "PlanType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorPlanDocument" ADD CONSTRAINT "PriorPlanDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BestPracticeDocument" ADD CONSTRAINT "BestPracticeDocument_planTypeId_fkey" FOREIGN KEY ("planTypeId") REFERENCES "PlanType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BestPracticeDocument" ADD CONSTRAINT "BestPracticeDocument_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "Jurisdiction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BestPracticeDocument" ADD CONSTRAINT "BestPracticeDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormTemplate" ADD CONSTRAINT "FormTemplate_planTypeId_fkey" FOREIGN KEY ("planTypeId") REFERENCES "PlanType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormTemplate" ADD CONSTRAINT "FormTemplate_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "Jurisdiction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormTemplate" ADD CONSTRAINT "FormTemplate_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BestPracticeChunk" ADD CONSTRAINT "BestPracticeChunk_bestPracticeDocumentId_fkey" FOREIGN KEY ("bestPracticeDocumentId") REFERENCES "BestPracticeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
