-- CreateEnum
CREATE TYPE "RuleScopeType" AS ENUM ('STATE', 'DISTRICT', 'SCHOOL');

-- CreateEnum
CREATE TYPE "RulePlanType" AS ENUM ('IEP', 'PLAN504', 'BIP', 'ALL');

-- CreateEnum
CREATE TYPE "MeetingTypeCode" AS ENUM ('INITIAL', 'ANNUAL', 'REVIEW', 'AMENDMENT', 'CONTINUED');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'HELD', 'CLOSED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ParentDeliveryMethod" AS ENUM ('SEND_HOME', 'US_MAIL', 'PICK_UP');

-- CreateTable
CREATE TABLE "RuleDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RuleDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleEvidenceType" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "planType" "RulePlanType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RuleEvidenceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RulePack" (
    "id" TEXT NOT NULL,
    "scopeType" "RuleScopeType" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "planType" "RulePlanType" NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RulePack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RulePackRule" (
    "id" TEXT NOT NULL,
    "rulePackId" TEXT NOT NULL,
    "ruleDefinitionId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RulePackRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RulePackEvidenceRequirement" (
    "id" TEXT NOT NULL,
    "rulePackRuleId" TEXT NOT NULL,
    "evidenceTypeId" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RulePackEvidenceRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingType" (
    "id" TEXT NOT NULL,
    "code" "MeetingTypeCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanMeeting" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "planInstanceId" TEXT,
    "planType" "RulePlanType" NOT NULL,
    "meetingTypeId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "heldAt" TIMESTAMP(3),
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "isContinued" BOOLEAN NOT NULL DEFAULT false,
    "continuedFromMeetingId" TEXT,
    "parentDeliveryMethod" "ParentDeliveryMethod",
    "mutualAgreementForContinuedDate" BOOLEAN,
    "noticeWaiverSigned" BOOLEAN,
    "parentRecording" BOOLEAN,
    "staffRecording" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingEvidence" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "evidenceTypeId" TEXT NOT NULL,
    "fileUploadId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "MeetingEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileUpload" (
    "id" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "FileUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RuleDefinition_key_key" ON "RuleDefinition"("key");

-- CreateIndex
CREATE INDEX "RuleDefinition_key_idx" ON "RuleDefinition"("key");

-- CreateIndex
CREATE UNIQUE INDEX "RuleEvidenceType_key_key" ON "RuleEvidenceType"("key");

-- CreateIndex
CREATE INDEX "RuleEvidenceType_key_idx" ON "RuleEvidenceType"("key");

-- CreateIndex
CREATE INDEX "RuleEvidenceType_planType_idx" ON "RuleEvidenceType"("planType");

-- CreateIndex
CREATE INDEX "RulePack_scopeType_scopeId_idx" ON "RulePack"("scopeType", "scopeId");

-- CreateIndex
CREATE INDEX "RulePack_planType_idx" ON "RulePack"("planType");

-- CreateIndex
CREATE INDEX "RulePack_isActive_idx" ON "RulePack"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RulePack_scopeType_scopeId_planType_version_key" ON "RulePack"("scopeType", "scopeId", "planType", "version");

-- CreateIndex
CREATE INDEX "RulePackRule_rulePackId_idx" ON "RulePackRule"("rulePackId");

-- CreateIndex
CREATE INDEX "RulePackRule_ruleDefinitionId_idx" ON "RulePackRule"("ruleDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "RulePackRule_rulePackId_ruleDefinitionId_key" ON "RulePackRule"("rulePackId", "ruleDefinitionId");

-- CreateIndex
CREATE INDEX "RulePackEvidenceRequirement_rulePackRuleId_idx" ON "RulePackEvidenceRequirement"("rulePackRuleId");

-- CreateIndex
CREATE INDEX "RulePackEvidenceRequirement_evidenceTypeId_idx" ON "RulePackEvidenceRequirement"("evidenceTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "RulePackEvidenceRequirement_rulePackRuleId_evidenceTypeId_key" ON "RulePackEvidenceRequirement"("rulePackRuleId", "evidenceTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingType_code_key" ON "MeetingType"("code");

-- CreateIndex
CREATE INDEX "MeetingType_code_idx" ON "MeetingType"("code");

-- CreateIndex
CREATE INDEX "PlanMeeting_studentId_idx" ON "PlanMeeting"("studentId");

-- CreateIndex
CREATE INDEX "PlanMeeting_planInstanceId_idx" ON "PlanMeeting"("planInstanceId");

-- CreateIndex
CREATE INDEX "PlanMeeting_meetingTypeId_idx" ON "PlanMeeting"("meetingTypeId");

-- CreateIndex
CREATE INDEX "PlanMeeting_status_idx" ON "PlanMeeting"("status");

-- CreateIndex
CREATE INDEX "PlanMeeting_scheduledAt_idx" ON "PlanMeeting"("scheduledAt");

-- CreateIndex
CREATE INDEX "MeetingEvidence_meetingId_idx" ON "MeetingEvidence"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingEvidence_evidenceTypeId_idx" ON "MeetingEvidence"("evidenceTypeId");

-- CreateIndex
CREATE INDEX "FileUpload_ownerType_ownerId_idx" ON "FileUpload"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "FileUpload_createdByUserId_idx" ON "FileUpload"("createdByUserId");

-- AddForeignKey
ALTER TABLE "RulePackRule" ADD CONSTRAINT "RulePackRule_rulePackId_fkey" FOREIGN KEY ("rulePackId") REFERENCES "RulePack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RulePackRule" ADD CONSTRAINT "RulePackRule_ruleDefinitionId_fkey" FOREIGN KEY ("ruleDefinitionId") REFERENCES "RuleDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RulePackEvidenceRequirement" ADD CONSTRAINT "RulePackEvidenceRequirement_rulePackRuleId_fkey" FOREIGN KEY ("rulePackRuleId") REFERENCES "RulePackRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RulePackEvidenceRequirement" ADD CONSTRAINT "RulePackEvidenceRequirement_evidenceTypeId_fkey" FOREIGN KEY ("evidenceTypeId") REFERENCES "RuleEvidenceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanMeeting" ADD CONSTRAINT "PlanMeeting_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanMeeting" ADD CONSTRAINT "PlanMeeting_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanMeeting" ADD CONSTRAINT "PlanMeeting_meetingTypeId_fkey" FOREIGN KEY ("meetingTypeId") REFERENCES "MeetingType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanMeeting" ADD CONSTRAINT "PlanMeeting_continuedFromMeetingId_fkey" FOREIGN KEY ("continuedFromMeetingId") REFERENCES "PlanMeeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingEvidence" ADD CONSTRAINT "MeetingEvidence_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "PlanMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingEvidence" ADD CONSTRAINT "MeetingEvidence_evidenceTypeId_fkey" FOREIGN KEY ("evidenceTypeId") REFERENCES "RuleEvidenceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingEvidence" ADD CONSTRAINT "MeetingEvidence_fileUploadId_fkey" FOREIGN KEY ("fileUploadId") REFERENCES "FileUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingEvidence" ADD CONSTRAINT "MeetingEvidence_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
