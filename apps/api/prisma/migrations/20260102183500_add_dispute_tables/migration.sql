-- Create dispute-related enums
DO $$ BEGIN
    CREATE TYPE "DisputeCaseType" AS ENUM ('SECTION504_COMPLAINT', 'IEP_DISPUTE', 'RECORDS_REQUEST', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DisputeCaseStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DisputeEventType" AS ENUM ('INTAKE', 'MEETING', 'RESPONSE_SENT', 'DOCUMENT_RECEIVED', 'RESOLUTION', 'STATUS_CHANGE', 'NOTE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable DisputeCase
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
    "externalReference" TEXT,
    "assignedToUserId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable DisputeEvent
CREATE TABLE IF NOT EXISTS "DisputeEvent" (
    "id" TEXT NOT NULL,
    "disputeCaseId" TEXT NOT NULL,
    "eventType" "DisputeEventType" NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT NOT NULL,
    "details" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable DisputeAttachment
CREATE TABLE IF NOT EXISTS "DisputeAttachment" (
    "id" TEXT NOT NULL,
    "disputeCaseId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "description" TEXT,
    "uploadedByUserId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeAttachment_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on caseNumber
CREATE UNIQUE INDEX IF NOT EXISTS "DisputeCase_caseNumber_key" ON "DisputeCase"("caseNumber");

-- CreateIndexes for DisputeCase
CREATE INDEX IF NOT EXISTS "DisputeCase_studentId_idx" ON "DisputeCase"("studentId");
CREATE INDEX IF NOT EXISTS "DisputeCase_planInstanceId_idx" ON "DisputeCase"("planInstanceId");
CREATE INDEX IF NOT EXISTS "DisputeCase_caseType_idx" ON "DisputeCase"("caseType");
CREATE INDEX IF NOT EXISTS "DisputeCase_status_idx" ON "DisputeCase"("status");
CREATE INDEX IF NOT EXISTS "DisputeCase_assignedToUserId_idx" ON "DisputeCase"("assignedToUserId");
CREATE INDEX IF NOT EXISTS "DisputeCase_filedDate_idx" ON "DisputeCase"("filedDate");

-- CreateIndexes for DisputeEvent
CREATE INDEX IF NOT EXISTS "DisputeEvent_disputeCaseId_idx" ON "DisputeEvent"("disputeCaseId");
CREATE INDEX IF NOT EXISTS "DisputeEvent_eventType_idx" ON "DisputeEvent"("eventType");
CREATE INDEX IF NOT EXISTS "DisputeEvent_eventDate_idx" ON "DisputeEvent"("eventDate");

-- CreateIndexes for DisputeAttachment
CREATE INDEX IF NOT EXISTS "DisputeAttachment_disputeCaseId_idx" ON "DisputeAttachment"("disputeCaseId");

-- AddForeignKey for DisputeCase
DO $$ BEGIN
    ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey for DisputeEvent
DO $$ BEGIN
    ALTER TABLE "DisputeEvent" ADD CONSTRAINT "DisputeEvent_disputeCaseId_fkey" FOREIGN KEY ("disputeCaseId") REFERENCES "DisputeCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "DisputeEvent" ADD CONSTRAINT "DisputeEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey for DisputeAttachment
DO $$ BEGIN
    ALTER TABLE "DisputeAttachment" ADD CONSTRAINT "DisputeAttachment_disputeCaseId_fkey" FOREIGN KEY ("disputeCaseId") REFERENCES "DisputeCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "DisputeAttachment" ADD CONSTRAINT "DisputeAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
