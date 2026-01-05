-- Add Review Schedule and Compliance Tracking Models
-- This migration adds tables for tracking review schedules, compliance tasks,
-- in-app alerts, and dispute cases

-- ============================================
-- ENUMS
-- ============================================

-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "ScheduleType" AS ENUM ('IEP_ANNUAL_REVIEW', 'IEP_REEVALUATION', 'PLAN_AMENDMENT_REVIEW', 'SECTION504_PERIODIC_REVIEW', 'BIP_REVIEW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "ReviewScheduleStatus" AS ENUM ('OPEN', 'COMPLETE', 'OVERDUE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "ComplianceTaskType" AS ENUM ('REVIEW_DUE_SOON', 'REVIEW_OVERDUE', 'DOCUMENT_REQUIRED', 'SIGNATURE_NEEDED', 'MEETING_REQUIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "ComplianceTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETE', 'DISMISSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "AlertType" AS ENUM ('REVIEW_DUE_SOON', 'REVIEW_OVERDUE', 'COMPLIANCE_TASK', 'SIGNATURE_REQUESTED', 'MEETING_SCHEDULED', 'DOCUMENT_UPLOADED', 'GENERAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "DisputeCaseType" AS ENUM ('SECTION504_COMPLAINT', 'IEP_DISPUTE', 'RECORDS_REQUEST', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "DisputeCaseStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "DisputeEventType" AS ENUM ('INTAKE', 'MEETING', 'RESPONSE_SENT', 'DOCUMENT_RECEIVED', 'RESOLUTION', 'STATUS_CHANGE', 'NOTE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABLES
-- ============================================

-- CreateTable ReviewSchedule (idempotent)
CREATE TABLE IF NOT EXISTS "ReviewSchedule" (
    "id" TEXT NOT NULL,
    "planInstanceId" TEXT NOT NULL,
    "scheduleType" "ScheduleType" NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "leadDays" INTEGER NOT NULL DEFAULT 30,
    "status" "ReviewScheduleStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedByUserId" TEXT,
    "assignedToUserId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable ComplianceTask (idempotent)
CREATE TABLE IF NOT EXISTS "ComplianceTask" (
    "id" TEXT NOT NULL,
    "taskType" "ComplianceTaskType" NOT NULL,
    "status" "ComplianceTaskStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 1,
    "assignedToUserId" TEXT,
    "reviewScheduleId" TEXT,
    "planInstanceId" TEXT,
    "studentId" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedByUserId" TEXT,
    "dismissedAt" TIMESTAMP(3),
    "dismissedByUserId" TEXT,
    "dismissReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable InAppAlert (idempotent)
CREATE TABLE IF NOT EXISTS "InAppAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alertType" "AlertType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "linkUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "dismissedAt" TIMESTAMP(3),
    "complianceTaskId" TEXT,
    "reviewScheduleId" TEXT,
    "disputeCaseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InAppAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable DisputeCase (idempotent)
CREATE TABLE IF NOT EXISTS "DisputeCase" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "planInstanceId" TEXT,
    "caseType" "DisputeCaseType" NOT NULL,
    "status" "DisputeCaseStatus" NOT NULL DEFAULT 'OPEN',
    "summary" TEXT NOT NULL,
    "filedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedDate" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "ownerUserId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisputeCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable DisputeEvent (idempotent)
CREATE TABLE IF NOT EXISTS "DisputeEvent" (
    "id" TEXT NOT NULL,
    "disputeCaseId" TEXT NOT NULL,
    "eventType" "DisputeEventType" NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "performedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable DisputeAttachment (idempotent)
CREATE TABLE IF NOT EXISTS "DisputeAttachment" (
    "id" TEXT NOT NULL,
    "disputeCaseId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "description" TEXT,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeAttachment_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- INDEXES
-- ============================================

-- ReviewSchedule indexes
CREATE INDEX IF NOT EXISTS "ReviewSchedule_planInstanceId_idx" ON "ReviewSchedule"("planInstanceId");
CREATE INDEX IF NOT EXISTS "ReviewSchedule_scheduleType_idx" ON "ReviewSchedule"("scheduleType");
CREATE INDEX IF NOT EXISTS "ReviewSchedule_status_idx" ON "ReviewSchedule"("status");
CREATE INDEX IF NOT EXISTS "ReviewSchedule_dueDate_idx" ON "ReviewSchedule"("dueDate");
CREATE INDEX IF NOT EXISTS "ReviewSchedule_assignedToUserId_idx" ON "ReviewSchedule"("assignedToUserId");

-- ComplianceTask indexes
CREATE INDEX IF NOT EXISTS "ComplianceTask_taskType_idx" ON "ComplianceTask"("taskType");
CREATE INDEX IF NOT EXISTS "ComplianceTask_status_idx" ON "ComplianceTask"("status");
CREATE INDEX IF NOT EXISTS "ComplianceTask_dueDate_idx" ON "ComplianceTask"("dueDate");
CREATE INDEX IF NOT EXISTS "ComplianceTask_assignedToUserId_idx" ON "ComplianceTask"("assignedToUserId");
CREATE INDEX IF NOT EXISTS "ComplianceTask_reviewScheduleId_idx" ON "ComplianceTask"("reviewScheduleId");
CREATE INDEX IF NOT EXISTS "ComplianceTask_planInstanceId_idx" ON "ComplianceTask"("planInstanceId");
CREATE INDEX IF NOT EXISTS "ComplianceTask_studentId_idx" ON "ComplianceTask"("studentId");

-- InAppAlert indexes
CREATE INDEX IF NOT EXISTS "InAppAlert_userId_idx" ON "InAppAlert"("userId");
CREATE INDEX IF NOT EXISTS "InAppAlert_isRead_idx" ON "InAppAlert"("isRead");
CREATE INDEX IF NOT EXISTS "InAppAlert_alertType_idx" ON "InAppAlert"("alertType");
CREATE INDEX IF NOT EXISTS "InAppAlert_createdAt_idx" ON "InAppAlert"("createdAt");

-- DisputeCase indexes
CREATE UNIQUE INDEX IF NOT EXISTS "DisputeCase_caseNumber_key" ON "DisputeCase"("caseNumber");
CREATE INDEX IF NOT EXISTS "DisputeCase_studentId_idx" ON "DisputeCase"("studentId");
CREATE INDEX IF NOT EXISTS "DisputeCase_planInstanceId_idx" ON "DisputeCase"("planInstanceId");
CREATE INDEX IF NOT EXISTS "DisputeCase_caseType_idx" ON "DisputeCase"("caseType");
CREATE INDEX IF NOT EXISTS "DisputeCase_status_idx" ON "DisputeCase"("status");
CREATE INDEX IF NOT EXISTS "DisputeCase_ownerUserId_idx" ON "DisputeCase"("ownerUserId");
CREATE INDEX IF NOT EXISTS "DisputeCase_filedDate_idx" ON "DisputeCase"("filedDate");

-- DisputeEvent indexes
CREATE INDEX IF NOT EXISTS "DisputeEvent_disputeCaseId_idx" ON "DisputeEvent"("disputeCaseId");
CREATE INDEX IF NOT EXISTS "DisputeEvent_eventType_idx" ON "DisputeEvent"("eventType");
CREATE INDEX IF NOT EXISTS "DisputeEvent_eventDate_idx" ON "DisputeEvent"("eventDate");

-- DisputeAttachment indexes
CREATE INDEX IF NOT EXISTS "DisputeAttachment_disputeCaseId_idx" ON "DisputeAttachment"("disputeCaseId");

-- ============================================
-- FOREIGN KEYS
-- ============================================

-- ReviewSchedule foreign keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReviewSchedule_planInstanceId_fkey') THEN
        ALTER TABLE "ReviewSchedule" ADD CONSTRAINT "ReviewSchedule_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReviewSchedule_completedByUserId_fkey') THEN
        ALTER TABLE "ReviewSchedule" ADD CONSTRAINT "ReviewSchedule_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReviewSchedule_assignedToUserId_fkey') THEN
        ALTER TABLE "ReviewSchedule" ADD CONSTRAINT "ReviewSchedule_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReviewSchedule_createdByUserId_fkey') THEN
        ALTER TABLE "ReviewSchedule" ADD CONSTRAINT "ReviewSchedule_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- ComplianceTask foreign keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ComplianceTask_assignedToUserId_fkey') THEN
        ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ComplianceTask_reviewScheduleId_fkey') THEN
        ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_reviewScheduleId_fkey" FOREIGN KEY ("reviewScheduleId") REFERENCES "ReviewSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ComplianceTask_planInstanceId_fkey') THEN
        ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ComplianceTask_studentId_fkey') THEN
        ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ComplianceTask_completedByUserId_fkey') THEN
        ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ComplianceTask_dismissedByUserId_fkey') THEN
        ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_dismissedByUserId_fkey" FOREIGN KEY ("dismissedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- InAppAlert foreign keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InAppAlert_userId_fkey') THEN
        ALTER TABLE "InAppAlert" ADD CONSTRAINT "InAppAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InAppAlert_complianceTaskId_fkey') THEN
        ALTER TABLE "InAppAlert" ADD CONSTRAINT "InAppAlert_complianceTaskId_fkey" FOREIGN KEY ("complianceTaskId") REFERENCES "ComplianceTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- DisputeCase foreign keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DisputeCase_studentId_fkey') THEN
        ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DisputeCase_planInstanceId_fkey') THEN
        ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DisputeCase_ownerUserId_fkey') THEN
        ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DisputeCase_createdByUserId_fkey') THEN
        ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- DisputeEvent foreign keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DisputeEvent_disputeCaseId_fkey') THEN
        ALTER TABLE "DisputeEvent" ADD CONSTRAINT "DisputeEvent_disputeCaseId_fkey" FOREIGN KEY ("disputeCaseId") REFERENCES "DisputeCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DisputeEvent_performedByUserId_fkey') THEN
        ALTER TABLE "DisputeEvent" ADD CONSTRAINT "DisputeEvent_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- DisputeAttachment foreign keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DisputeAttachment_disputeCaseId_fkey') THEN
        ALTER TABLE "DisputeAttachment" ADD CONSTRAINT "DisputeAttachment_disputeCaseId_fkey" FOREIGN KEY ("disputeCaseId") REFERENCES "DisputeCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DisputeAttachment_uploadedByUserId_fkey') THEN
        ALTER TABLE "DisputeAttachment" ADD CONSTRAINT "DisputeAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
