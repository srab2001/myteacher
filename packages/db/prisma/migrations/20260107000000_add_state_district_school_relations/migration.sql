-- CreateTable
CREATE TABLE "State" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- AlterTable InAppAlert: Add missing entity tracking fields and indexes
ALTER TABLE "InAppAlert" ADD COLUMN IF NOT EXISTS "relatedEntityType" TEXT;
ALTER TABLE "InAppAlert" ADD COLUMN IF NOT EXISTS "relatedEntityId" TEXT;

-- AlterTable Student: Add schoolId field for rules hierarchy
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;

-- CreateIndex State
CREATE UNIQUE INDEX "State_code_key" ON "State"("code");
CREATE INDEX "State_isActive_idx" ON "State"("isActive");

-- CreateIndex District
CREATE INDEX "District_stateId_idx" ON "District"("stateId");
CREATE INDEX "District_isActive_idx" ON "District"("isActive");
CREATE UNIQUE INDEX "District_stateId_code_key" ON "District"("stateId", "code");

-- CreateIndex InAppAlert
CREATE INDEX IF NOT EXISTS "InAppAlert_reviewScheduleId_idx" ON "InAppAlert"("reviewScheduleId");
CREATE INDEX IF NOT EXISTS "InAppAlert_disputeCaseId_idx" ON "InAppAlert"("disputeCaseId");
CREATE INDEX IF NOT EXISTS "InAppAlert_relatedEntityId_idx" ON "InAppAlert"("relatedEntityId");

-- CreateIndex Student
CREATE INDEX IF NOT EXISTS "Student_schoolId_idx" ON "Student"("schoolId");

-- AddForeignKey District -> State
ALTER TABLE "District" ADD CONSTRAINT "District_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey School -> District
ALTER TABLE "School" ADD CONSTRAINT "School_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey Student -> School
ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey InAppAlert -> ReviewSchedule
ALTER TABLE "InAppAlert" ADD CONSTRAINT "InAppAlert_reviewScheduleId_fkey" FOREIGN KEY ("reviewScheduleId") REFERENCES "ReviewSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey InAppAlert -> DisputeCase
ALTER TABLE "InAppAlert" ADD CONSTRAINT "InAppAlert_disputeCaseId_fkey" FOREIGN KEY ("disputeCaseId") REFERENCES "DisputeCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
