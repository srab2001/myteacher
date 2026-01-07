-- Add all missing columns to ComplianceTask
ALTER TABLE "ComplianceTask" ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ComplianceTask" ADD COLUMN IF NOT EXISTS "completedByUserId" TEXT;
ALTER TABLE "ComplianceTask" ADD COLUMN IF NOT EXISTS "dismissedAt" TIMESTAMP(3);
ALTER TABLE "ComplianceTask" ADD COLUMN IF NOT EXISTS "dismissedByUserId" TEXT;
ALTER TABLE "ComplianceTask" ADD COLUMN IF NOT EXISTS "dismissReason" TEXT;

-- Add all missing columns to InAppAlert
ALTER TABLE "InAppAlert" ADD COLUMN IF NOT EXISTS "linkUrl" TEXT;
ALTER TABLE "InAppAlert" ADD COLUMN IF NOT EXISTS "isDismissed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InAppAlert" ADD COLUMN IF NOT EXISTS "dismissedAt" TIMESTAMP(3);
ALTER TABLE "InAppAlert" ADD COLUMN IF NOT EXISTS "complianceTaskId" TEXT;
ALTER TABLE "InAppAlert" ADD COLUMN IF NOT EXISTS "reviewScheduleId" TEXT;
ALTER TABLE "InAppAlert" ADD COLUMN IF NOT EXISTS "disputeCaseId" TEXT;

-- Add foreign keys for ComplianceTask
DO $$ BEGIN
    ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_dismissedByUserId_fkey" FOREIGN KEY ("dismissedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add foreign keys for InAppAlert
DO $$ BEGIN
    ALTER TABLE "InAppAlert" ADD CONSTRAINT "InAppAlert_complianceTaskId_fkey" FOREIGN KEY ("complianceTaskId") REFERENCES "ComplianceTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS "ComplianceTask_completedByUserId_idx" ON "ComplianceTask"("completedByUserId");
CREATE INDEX IF NOT EXISTS "ComplianceTask_dismissedByUserId_idx" ON "ComplianceTask"("dismissedByUserId");
CREATE INDEX IF NOT EXISTS "ComplianceTask_priority_idx" ON "ComplianceTask"("priority");
CREATE INDEX IF NOT EXISTS "InAppAlert_complianceTaskId_idx" ON "InAppAlert"("complianceTaskId");
CREATE INDEX IF NOT EXISTS "InAppAlert_alertType_idx" ON "InAppAlert"("alertType");
