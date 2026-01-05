-- CreateEnum
CREATE TYPE "AuditActionType" AS ENUM ('PLAN_VIEWED', 'PLAN_UPDATED', 'PLAN_FINALIZED', 'PDF_EXPORTED', 'PDF_DOWNLOADED', 'SIGNATURE_ADDED', 'REVIEW_SCHEDULE_CREATED', 'CASE_VIEWED', 'CASE_EXPORTED', 'PERMISSION_DENIED');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('PLAN', 'PLAN_VERSION', 'PLAN_EXPORT', 'STUDENT', 'GOAL', 'SERVICE', 'REVIEW_SCHEDULE', 'COMPLIANCE_TASK', 'DISPUTE_CASE', 'SIGNATURE_PACKET', 'MEETING');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actionType" "AuditActionType" NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "studentId" TEXT,
    "planId" TEXT,
    "planVersionId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadataJson" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_timestamp_idx" ON "AuditLog"("actorUserId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_studentId_timestamp_idx" ON "AuditLog"("studentId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
