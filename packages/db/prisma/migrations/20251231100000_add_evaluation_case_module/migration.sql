-- CreateEnum
CREATE TYPE "EvaluationCaseStatus" AS ENUM ('OPEN', 'ASSESSMENTS_IN_PROGRESS', 'MEETING_SCHEDULED', 'DETERMINATION_COMPLETE', 'CLOSED');

-- CreateEnum
CREATE TYPE "EvaluationCaseType" AS ENUM ('IDEA', 'SECTION_504');

-- CreateEnum
CREATE TYPE "DeterminationOutcome" AS ENUM ('ELIGIBLE', 'NOT_ELIGIBLE', 'PENDING_ADDITIONAL_DATA');

-- CreateEnum
CREATE TYPE "IDEADisabilityCategory" AS ENUM ('AUTISM', 'DEAF_BLINDNESS', 'DEAFNESS', 'DEVELOPMENTAL_DELAY', 'EMOTIONAL_DISTURBANCE', 'HEARING_IMPAIRMENT', 'INTELLECTUAL_DISABILITY', 'MULTIPLE_DISABILITIES', 'ORTHOPEDIC_IMPAIRMENT', 'OTHER_HEALTH_IMPAIRMENT', 'SPECIFIC_LEARNING_DISABILITY', 'SPEECH_LANGUAGE_IMPAIRMENT', 'TRAUMATIC_BRAIN_INJURY', 'VISUAL_IMPAIRMENT');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('PARENT', 'GENERAL_ED_TEACHER', 'SPECIAL_ED_TEACHER', 'SCHOOL_PSYCHOLOGIST', 'ADMINISTRATOR', 'SPEECH_LANGUAGE_PATHOLOGIST', 'OCCUPATIONAL_THERAPIST', 'PHYSICAL_THERAPIST', 'SCHOOL_COUNSELOR', 'BEHAVIOR_SPECIALIST', 'STUDENT', 'OTHER');

-- CreateTable
CREATE TABLE "EvaluationCase" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "referralId" TEXT,
    "caseType" "EvaluationCaseType" NOT NULL,
    "status" "EvaluationCaseStatus" NOT NULL DEFAULT 'OPEN',
    "caseManagerId" TEXT,
    "meetingScheduledAt" TIMESTAMP(3),
    "meetingLocation" TEXT,
    "meetingLink" TEXT,
    "meetingHeldAt" TIMESTAMP(3),
    "determinationOutcome" "DeterminationOutcome",
    "determinationDate" TIMESTAMP(3),
    "determinationRationale" TEXT,
    "primaryDisabilityCategory" "IDEADisabilityCategory",
    "secondaryDisabilities" JSONB,
    "qualifyingImpairment" TEXT,
    "nonEligibilityReason" TEXT,
    "alternativeRecommendations" TEXT,
    "parentNotifiedAt" TIMESTAMP(3),
    "parentAgreement" TEXT,
    "parentDisagreementReason" TEXT,
    "internalNotes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closedByUserId" TEXT,
    "closedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationAssessment" (
    "id" TEXT NOT NULL,
    "evaluationCaseId" TEXT NOT NULL,
    "assessmentType" "AssessmentType" NOT NULL,
    "assessmentName" TEXT NOT NULL,
    "assessorName" TEXT,
    "assessorTitle" TEXT,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "resultsJson" JSONB,
    "resultsSummary" TEXT,
    "reportFileUploadId" TEXT,
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationParticipant" (
    "id" TEXT NOT NULL,
    "evaluationCaseId" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL,
    "roleOther" TEXT,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "invitedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "attended" BOOLEAN,
    "attendanceNotes" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EligibilityDetermination" (
    "id" TEXT NOT NULL,
    "evaluationCaseId" TEXT NOT NULL,
    "isEligible" BOOLEAN NOT NULL,
    "determinationDate" TIMESTAMP(3) NOT NULL,
    "primaryDisabilityCategory" "IDEADisabilityCategory",
    "secondaryDisabilities" JSONB,
    "eligibilityCriteriaMet" JSONB,
    "nonEligibilityReason" TEXT,
    "alternativeRecommendations" TEXT,
    "rationale" TEXT NOT NULL,
    "parentNotifiedAt" TIMESTAMP(3),
    "parentAgreement" TEXT,
    "parentDisagreementReason" TEXT,
    "resultingPlanInstanceId" TEXT,
    "signatureRequestId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EligibilityDetermination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationCaseTimelineEvent" (
    "id" TEXT NOT NULL,
    "evaluationCaseId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB,
    "description" TEXT NOT NULL,
    "performedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationCaseTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvaluationCase_studentId_idx" ON "EvaluationCase"("studentId");

-- CreateIndex
CREATE INDEX "EvaluationCase_referralId_idx" ON "EvaluationCase"("referralId");

-- CreateIndex
CREATE INDEX "EvaluationCase_status_idx" ON "EvaluationCase"("status");

-- CreateIndex
CREATE INDEX "EvaluationCase_caseType_idx" ON "EvaluationCase"("caseType");

-- CreateIndex
CREATE INDEX "EvaluationCase_caseManagerId_idx" ON "EvaluationCase"("caseManagerId");

-- CreateIndex
CREATE INDEX "EvaluationCase_createdAt_idx" ON "EvaluationCase"("createdAt");

-- CreateIndex
CREATE INDEX "EvaluationAssessment_evaluationCaseId_idx" ON "EvaluationAssessment"("evaluationCaseId");

-- CreateIndex
CREATE INDEX "EvaluationAssessment_assessmentType_idx" ON "EvaluationAssessment"("assessmentType");

-- CreateIndex
CREATE INDEX "EvaluationAssessment_status_idx" ON "EvaluationAssessment"("status");

-- CreateIndex
CREATE INDEX "EvaluationParticipant_evaluationCaseId_idx" ON "EvaluationParticipant"("evaluationCaseId");

-- CreateIndex
CREATE INDEX "EvaluationParticipant_role_idx" ON "EvaluationParticipant"("role");

-- CreateIndex
CREATE INDEX "EvaluationParticipant_userId_idx" ON "EvaluationParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EligibilityDetermination_evaluationCaseId_key" ON "EligibilityDetermination"("evaluationCaseId");

-- CreateIndex
CREATE INDEX "EligibilityDetermination_evaluationCaseId_idx" ON "EligibilityDetermination"("evaluationCaseId");

-- CreateIndex
CREATE INDEX "EligibilityDetermination_isEligible_idx" ON "EligibilityDetermination"("isEligible");

-- CreateIndex
CREATE INDEX "EligibilityDetermination_determinationDate_idx" ON "EligibilityDetermination"("determinationDate");

-- CreateIndex
CREATE INDEX "EvaluationCaseTimelineEvent_evaluationCaseId_idx" ON "EvaluationCaseTimelineEvent"("evaluationCaseId");

-- CreateIndex
CREATE INDEX "EvaluationCaseTimelineEvent_eventType_idx" ON "EvaluationCaseTimelineEvent"("eventType");

-- CreateIndex
CREATE INDEX "EvaluationCaseTimelineEvent_createdAt_idx" ON "EvaluationCaseTimelineEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "EvaluationCase" ADD CONSTRAINT "EvaluationCase_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationCase" ADD CONSTRAINT "EvaluationCase_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationCase" ADD CONSTRAINT "EvaluationCase_caseManagerId_fkey" FOREIGN KEY ("caseManagerId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationCase" ADD CONSTRAINT "EvaluationCase_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationCase" ADD CONSTRAINT "EvaluationCase_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationAssessment" ADD CONSTRAINT "EvaluationAssessment_evaluationCaseId_fkey" FOREIGN KEY ("evaluationCaseId") REFERENCES "EvaluationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationAssessment" ADD CONSTRAINT "EvaluationAssessment_reportFileUploadId_fkey" FOREIGN KEY ("reportFileUploadId") REFERENCES "FileUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationAssessment" ADD CONSTRAINT "EvaluationAssessment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationParticipant" ADD CONSTRAINT "EvaluationParticipant_evaluationCaseId_fkey" FOREIGN KEY ("evaluationCaseId") REFERENCES "EvaluationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationParticipant" ADD CONSTRAINT "EvaluationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EligibilityDetermination" ADD CONSTRAINT "EligibilityDetermination_evaluationCaseId_fkey" FOREIGN KEY ("evaluationCaseId") REFERENCES "EvaluationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EligibilityDetermination" ADD CONSTRAINT "EligibilityDetermination_resultingPlanInstanceId_fkey" FOREIGN KEY ("resultingPlanInstanceId") REFERENCES "PlanInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EligibilityDetermination" ADD CONSTRAINT "EligibilityDetermination_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationCaseTimelineEvent" ADD CONSTRAINT "EvaluationCaseTimelineEvent_evaluationCaseId_fkey" FOREIGN KEY ("evaluationCaseId") REFERENCES "EvaluationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationCaseTimelineEvent" ADD CONSTRAINT "EvaluationCaseTimelineEvent_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
