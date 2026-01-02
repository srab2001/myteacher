-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "ScheduleType" AS ENUM ('IEP_ANNUAL_REVIEW', 'IEP_REEVALUATION', 'PLAN_AMENDMENT_REVIEW', 'SECTION504_PERIODIC_REVIEW', 'BIP_REVIEW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ReviewScheduleStatus" AS ENUM ('OPEN', 'COMPLETE', 'OVERDUE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ComplianceTaskType" AS ENUM ('REVIEW_DUE_SOON', 'REVIEW_OVERDUE', 'DOCUMENT_REQUIRED', 'SIGNATURE_NEEDED', 'MEETING_REQUIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ComplianceTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETE', 'DISMISSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AlertType" AS ENUM ('REVIEW_DUE_SOON', 'REVIEW_OVERDUE', 'COMPLIANCE_TASK', 'SIGNATURE_REQUESTED', 'MEETING_SCHEDULED', 'DOCUMENT_UPLOADED', 'GENERAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable ReviewSchedule
CREATE TABLE IF NOT EXISTS "ReviewSchedule" (
    "id" TEXT NOT NULL,
    "planInstanceId" TEXT NOT NULL,
    "scheduleType" "ScheduleType" NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "ReviewScheduleStatus" NOT NULL DEFAULT 'OPEN',
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable ComplianceTask
CREATE TABLE IF NOT EXISTS "ComplianceTask" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "planInstanceId" TEXT,
    "taskType" "ComplianceTaskType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "ComplianceTaskStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToUserId" TEXT,
    "createdByUserId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable InAppAlert
CREATE TABLE IF NOT EXISTS "InAppAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alertType" "AlertType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InAppAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "ReviewSchedule_planInstanceId_idx" ON "ReviewSchedule"("planInstanceId");
CREATE INDEX IF NOT EXISTS "ReviewSchedule_dueDate_idx" ON "ReviewSchedule"("dueDate");
CREATE INDEX IF NOT EXISTS "ReviewSchedule_status_idx" ON "ReviewSchedule"("status");

CREATE INDEX IF NOT EXISTS "ComplianceTask_studentId_idx" ON "ComplianceTask"("studentId");
CREATE INDEX IF NOT EXISTS "ComplianceTask_planInstanceId_idx" ON "ComplianceTask"("planInstanceId");
CREATE INDEX IF NOT EXISTS "ComplianceTask_assignedToUserId_idx" ON "ComplianceTask"("assignedToUserId");
CREATE INDEX IF NOT EXISTS "ComplianceTask_status_idx" ON "ComplianceTask"("status");
CREATE INDEX IF NOT EXISTS "ComplianceTask_dueDate_idx" ON "ComplianceTask"("dueDate");

CREATE INDEX IF NOT EXISTS "InAppAlert_userId_idx" ON "InAppAlert"("userId");
CREATE INDEX IF NOT EXISTS "InAppAlert_isRead_idx" ON "InAppAlert"("isRead");
CREATE INDEX IF NOT EXISTS "InAppAlert_createdAt_idx" ON "InAppAlert"("createdAt");

-- AddForeignKey (only if tables exist)
DO $$ BEGIN
    ALTER TABLE "ReviewSchedule" ADD CONSTRAINT "ReviewSchedule_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "InAppAlert" ADD CONSTRAINT "InAppAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
