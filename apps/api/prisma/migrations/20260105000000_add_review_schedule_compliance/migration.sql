-- Add Review Schedule, Compliance Tracking, and Related Models
-- This migration adds tables for tracking review schedules, compliance tasks,
-- in-app alerts, dispute cases, scheduled services, audit logs, and geographic hierarchy

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

-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "ScheduledServiceStatus" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "AuditActionType" AS ENUM ('PLAN_VIEWED', 'PLAN_UPDATED', 'PLAN_FINALIZED', 'PDF_EXPORTED', 'PDF_DOWNLOADED', 'SIGNATURE_ADDED', 'REVIEW_SCHEDULE_CREATED', 'CASE_VIEWED', 'CASE_EXPORTED', 'PERMISSION_DENIED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "AuditEntityType" AS ENUM ('PLAN', 'PLAN_VERSION', 'PLAN_EXPORT', 'STUDENT', 'GOAL', 'SERVICE', 'REVIEW_SCHEDULE', 'COMPLIANCE_TASK', 'DISPUTE_CASE', 'SIGNATURE_PACKET', 'MEETING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add BIP to FormType enum (idempotent)
DO $$ BEGIN
    ALTER TYPE "FormType" ADD VALUE IF NOT EXISTS 'BIP';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add CHECKBOX_GROUP to ControlType enum (idempotent)
DO $$ BEGIN
    ALTER TYPE "ControlType" ADD VALUE IF NOT EXISTS 'CHECKBOX_GROUP';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum SchoolType (idempotent)
DO $$ BEGIN
    CREATE TYPE "SchoolType" AS ENUM ('ELEMENTARY', 'MIDDLE', 'HIGH', 'K8', 'K12', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABLES
-- ============================================

-- CreateTable State (idempotent)
CREATE TABLE IF NOT EXISTS "State" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable District (idempotent)
CREATE TABLE IF NOT EXISTS "District" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

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
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceTask_pkey" PRIMARY KEY ("id")
);

-- Add createdByUserId column if not exists (for existing tables)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ComplianceTask' AND column_name = 'createdByUserId') THEN
        ALTER TABLE "ComplianceTask" ADD COLUMN "createdByUserId" TEXT;
    END IF;
END $$;

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
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InAppAlert_pkey" PRIMARY KEY ("id")
);

-- Add relatedEntityType and relatedEntityId columns if not exists (for existing tables)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InAppAlert' AND column_name = 'relatedEntityType') THEN
        ALTER TABLE "InAppAlert" ADD COLUMN "relatedEntityType" TEXT;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InAppAlert' AND column_name = 'relatedEntityId') THEN
        ALTER TABLE "InAppAlert" ADD COLUMN "relatedEntityId" TEXT;
    END IF;
END $$;

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

-- CreateTable ScheduledServicePlan (idempotent)
CREATE TABLE IF NOT EXISTS "ScheduledServicePlan" (
    "id" TEXT NOT NULL,
    "status" "ScheduledServiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planInstanceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "ScheduledServicePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable ScheduledServiceItem (idempotent)
CREATE TABLE IF NOT EXISTS "ScheduledServiceItem" (
    "id" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "expectedMinutesPerWeek" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "providerRole" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scheduledPlanId" TEXT NOT NULL,

    CONSTRAINT "ScheduledServiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable AuditLog (idempotent)
CREATE TABLE IF NOT EXISTS "AuditLog" (
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

-- ============================================
-- ADD COLUMNS TO EXISTING TABLES
-- ============================================

-- Add schoolType to School (idempotent)
DO $$ BEGIN
    ALTER TABLE "School" ADD COLUMN "schoolType" "SchoolType";
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add districtId to School if not exists (already exists, but ensure FK)
DO $$ BEGIN
    ALTER TABLE "School" ADD COLUMN "districtId" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add baselineValue and targetValue to Goal (idempotent)
DO $$ BEGIN
    ALTER TABLE "Goal" ADD COLUMN "baselineValue" DOUBLE PRECISION;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Goal" ADD COLUMN "targetValue" DOUBLE PRECISION;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add percentCorrect, trials, notes to GoalProgress (idempotent)
DO $$ BEGIN
    ALTER TABLE "GoalProgress" ADD COLUMN "percentCorrect" DOUBLE PRECISION;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "GoalProgress" ADD COLUMN "trials" INTEGER;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "GoalProgress" ADD COLUMN "notes" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add missedReason and makeupPlanned to ServiceLog (idempotent)
DO $$ BEGIN
    ALTER TABLE "ServiceLog" ADD COLUMN "missedReason" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ServiceLog" ADD COLUMN "makeupPlanned" BOOLEAN DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add evaluator to IEPIndependentAssessmentReview (idempotent)
DO $$ BEGIN
    ALTER TABLE "IEPIndependentAssessmentReview" ADD COLUMN "evaluator" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add schoolId to Student (idempotent)
DO $$ BEGIN
    ALTER TABLE "Student" ADD COLUMN "schoolId" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- ============================================
-- INDEXES
-- ============================================

-- State indexes
CREATE UNIQUE INDEX IF NOT EXISTS "State_code_key" ON "State"("code");
CREATE INDEX IF NOT EXISTS "State_code_idx" ON "State"("code");
CREATE INDEX IF NOT EXISTS "State_isActive_idx" ON "State"("isActive");

-- District indexes
CREATE UNIQUE INDEX IF NOT EXISTS "District_stateId_code_key" ON "District"("stateId", "code");
CREATE INDEX IF NOT EXISTS "District_stateId_idx" ON "District"("stateId");
CREATE INDEX IF NOT EXISTS "District_code_idx" ON "District"("code");
CREATE INDEX IF NOT EXISTS "District_isActive_idx" ON "District"("isActive");

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

-- ScheduledServicePlan indexes
CREATE UNIQUE INDEX IF NOT EXISTS "ScheduledServicePlan_planInstanceId_key" ON "ScheduledServicePlan"("planInstanceId");
CREATE INDEX IF NOT EXISTS "ScheduledServicePlan_planInstanceId_idx" ON "ScheduledServicePlan"("planInstanceId");
CREATE INDEX IF NOT EXISTS "ScheduledServicePlan_status_idx" ON "ScheduledServicePlan"("status");

-- ScheduledServiceItem indexes
CREATE INDEX IF NOT EXISTS "ScheduledServiceItem_scheduledPlanId_idx" ON "ScheduledServiceItem"("scheduledPlanId");
CREATE INDEX IF NOT EXISTS "ScheduledServiceItem_serviceType_idx" ON "ScheduledServiceItem"("serviceType");

-- AuditLog indexes
CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
CREATE INDEX IF NOT EXISTS "AuditLog_actorUserId_timestamp_idx" ON "AuditLog"("actorUserId", "timestamp");
CREATE INDEX IF NOT EXISTS "AuditLog_studentId_timestamp_idx" ON "AuditLog"("studentId", "timestamp");
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- School indexes
CREATE INDEX IF NOT EXISTS "School_schoolType_idx" ON "School"("schoolType");

-- Student schoolId index
CREATE INDEX IF NOT EXISTS "Student_schoolId_idx" ON "Student"("schoolId");

-- ============================================
-- FOREIGN KEYS
-- ============================================

-- District foreign keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'District_stateId_fkey') THEN
        ALTER TABLE "District" ADD CONSTRAINT "District_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- School foreign keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'School_districtId_fkey') THEN
        ALTER TABLE "School" ADD CONSTRAINT "School_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Student foreign keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Student_schoolId_fkey') THEN
        ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

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

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ComplianceTask_createdByUserId_fkey') THEN
        ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
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

-- ScheduledServicePlan foreign keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScheduledServicePlan_planInstanceId_fkey') THEN
        ALTER TABLE "ScheduledServicePlan" ADD CONSTRAINT "ScheduledServicePlan_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScheduledServicePlan_createdById_fkey') THEN
        ALTER TABLE "ScheduledServicePlan" ADD CONSTRAINT "ScheduledServicePlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScheduledServicePlan_updatedById_fkey') THEN
        ALTER TABLE "ScheduledServicePlan" ADD CONSTRAINT "ScheduledServicePlan_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- ScheduledServiceItem foreign keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScheduledServiceItem_scheduledPlanId_fkey') THEN
        ALTER TABLE "ScheduledServiceItem" ADD CONSTRAINT "ScheduledServiceItem_scheduledPlanId_fkey" FOREIGN KEY ("scheduledPlanId") REFERENCES "ScheduledServicePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AuditLog foreign keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_actorUserId_fkey') THEN
        ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
