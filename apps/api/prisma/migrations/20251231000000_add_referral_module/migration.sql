-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'CONSENT_REQUESTED', 'CONSENT_RECEIVED', 'CONSENT_DECLINED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReferralType" AS ENUM ('IDEA_EVALUATION', 'SECTION_504_EVALUATION', 'BEHAVIOR_SUPPORT');

-- CreateEnum
CREATE TYPE "ReferralSource" AS ENUM ('TEACHER', 'PARENT', 'ADMINISTRATOR', 'STUDENT_SUPPORT_TEAM', 'OTHER');

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "referralType" "ReferralType" NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'DRAFT',
    "source" "ReferralSource" NOT NULL,
    "sourceOther" TEXT,
    "referredByUserId" TEXT,
    "referredByName" TEXT,
    "referredByEmail" TEXT,
    "reasonForReferral" TEXT NOT NULL,
    "areasOfConcern" JSONB,
    "interventionsTried" TEXT,
    "supportingData" TEXT,
    "caseManagerId" TEXT,
    "consentStatus" TEXT,
    "consentRequestedAt" TIMESTAMP(3),
    "consentReceivedAt" TIMESTAMP(3),
    "consentDeclinedAt" TIMESTAMP(3),
    "consentDeclineReason" TEXT,
    "parentContactEmail" TEXT,
    "parentContactPhone" TEXT,
    "evaluationDueDate" TIMESTAMP(3),
    "consentDueDate" TIMESTAMP(3),
    "internalNotes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closedByUserId" TEXT,
    "closedReason" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralAttachment" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "fileUploadId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "attachmentType" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralTimelineEvent" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB,
    "description" TEXT NOT NULL,
    "performedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Referral_studentId_idx" ON "Referral"("studentId");

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE INDEX "Referral_referralType_idx" ON "Referral"("referralType");

-- CreateIndex
CREATE INDEX "Referral_caseManagerId_idx" ON "Referral"("caseManagerId");

-- CreateIndex
CREATE INDEX "Referral_createdAt_idx" ON "Referral"("createdAt");

-- CreateIndex
CREATE INDEX "ReferralAttachment_referralId_idx" ON "ReferralAttachment"("referralId");

-- CreateIndex
CREATE INDEX "ReferralAttachment_attachmentType_idx" ON "ReferralAttachment"("attachmentType");

-- CreateIndex
CREATE INDEX "ReferralTimelineEvent_referralId_idx" ON "ReferralTimelineEvent"("referralId");

-- CreateIndex
CREATE INDEX "ReferralTimelineEvent_eventType_idx" ON "ReferralTimelineEvent"("eventType");

-- CreateIndex
CREATE INDEX "ReferralTimelineEvent_createdAt_idx" ON "ReferralTimelineEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_caseManagerId_fkey" FOREIGN KEY ("caseManagerId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredByUserId_fkey" FOREIGN KEY ("referredByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralAttachment" ADD CONSTRAINT "ReferralAttachment_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralAttachment" ADD CONSTRAINT "ReferralAttachment_fileUploadId_fkey" FOREIGN KEY ("fileUploadId") REFERENCES "FileUpload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralAttachment" ADD CONSTRAINT "ReferralAttachment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralTimelineEvent" ADD CONSTRAINT "ReferralTimelineEvent_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralTimelineEvent" ADD CONSTRAINT "ReferralTimelineEvent_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
