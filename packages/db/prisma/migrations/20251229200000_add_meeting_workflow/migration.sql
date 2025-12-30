-- Add meeting workflow enhancements

-- Add new columns to PlanMeeting
ALTER TABLE "PlanMeeting" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);
ALTER TABLE "PlanMeeting" ADD COLUMN IF NOT EXISTS "preDocsDeliveredAt" TIMESTAMP(3);
ALTER TABLE "PlanMeeting" ADD COLUMN IF NOT EXISTS "preDocsDeliveryMethod" "ParentDeliveryMethod";
ALTER TABLE "PlanMeeting" ADD COLUMN IF NOT EXISTS "postDocsDeliveredAt" TIMESTAMP(3);
ALTER TABLE "PlanMeeting" ADD COLUMN IF NOT EXISTS "postDocsDeliveryMethod" "ParentDeliveryMethod";
ALTER TABLE "PlanMeeting" ADD COLUMN IF NOT EXISTS "consentObtainedAt" TIMESTAMP(3);
ALTER TABLE "PlanMeeting" ADD COLUMN IF NOT EXISTS "consentStatus" TEXT;
ALTER TABLE "PlanMeeting" ADD COLUMN IF NOT EXISTS "outcomeNotes" TEXT;
ALTER TABLE "PlanMeeting" ADD COLUMN IF NOT EXISTS "actionItems" JSONB;
ALTER TABLE "PlanMeeting" ADD COLUMN IF NOT EXISTS "rulePackId" TEXT;
ALTER TABLE "PlanMeeting" ADD COLUMN IF NOT EXISTS "rulePackVersion" INTEGER;
ALTER TABLE "PlanMeeting" ADD COLUMN IF NOT EXISTS "closedByUserId" TEXT;
ALTER TABLE "PlanMeeting" ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT;

-- Add new columns to MeetingEvidence
ALTER TABLE "MeetingEvidence" ADD COLUMN IF NOT EXISTS "evidenceDate" TIMESTAMP(3);
ALTER TABLE "MeetingEvidence" ADD COLUMN IF NOT EXISTS "deliveryMethod" "ParentDeliveryMethod";

-- Create MeetingTask table
CREATE TABLE IF NOT EXISTS "MeetingTask" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedTo" TEXT,
    "dueDate" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingTask_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint for MeetingEvidence (one evidence per type per meeting)
-- First check if it already exists to avoid errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MeetingEvidence_meetingId_evidenceTypeId_key'
    ) THEN
        ALTER TABLE "MeetingEvidence" ADD CONSTRAINT "MeetingEvidence_meetingId_evidenceTypeId_key" UNIQUE ("meetingId", "evidenceTypeId");
    END IF;
END $$;

-- Add foreign key for MeetingTask
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MeetingTask_meetingId_fkey'
    ) THEN
        ALTER TABLE "MeetingTask" ADD CONSTRAINT "MeetingTask_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "PlanMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Create indexes for MeetingTask
CREATE INDEX IF NOT EXISTS "MeetingTask_meetingId_idx" ON "MeetingTask"("meetingId");
CREATE INDEX IF NOT EXISTS "MeetingTask_isCompleted_idx" ON "MeetingTask"("isCompleted");
