-- Add missing columns to ReviewSchedule
ALTER TABLE "ReviewSchedule" ADD COLUMN IF NOT EXISTS "leadDays" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "ReviewSchedule" ADD COLUMN IF NOT EXISTS "completedByUserId" TEXT;
ALTER TABLE "ReviewSchedule" ADD COLUMN IF NOT EXISTS "assignedToUserId" TEXT;
ALTER TABLE "ReviewSchedule" ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT;

-- Add foreign keys for ReviewSchedule (if not exist)
DO $$ BEGIN
    ALTER TABLE "ReviewSchedule" ADD CONSTRAINT "ReviewSchedule_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ReviewSchedule" ADD CONSTRAINT "ReviewSchedule_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ReviewSchedule" ADD CONSTRAINT "ReviewSchedule_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing column to ComplianceTask
ALTER TABLE "ComplianceTask" ADD COLUMN IF NOT EXISTS "reviewScheduleId" TEXT;

-- Add foreign key for ComplianceTask reviewSchedule
DO $$ BEGIN
    ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_reviewScheduleId_fkey" FOREIGN KEY ("reviewScheduleId") REFERENCES "ReviewSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "ReviewSchedule_completedByUserId_idx" ON "ReviewSchedule"("completedByUserId");
CREATE INDEX IF NOT EXISTS "ReviewSchedule_assignedToUserId_idx" ON "ReviewSchedule"("assignedToUserId");
CREATE INDEX IF NOT EXISTS "ReviewSchedule_createdByUserId_idx" ON "ReviewSchedule"("createdByUserId");
CREATE INDEX IF NOT EXISTS "ComplianceTask_reviewScheduleId_idx" ON "ComplianceTask"("reviewScheduleId");
