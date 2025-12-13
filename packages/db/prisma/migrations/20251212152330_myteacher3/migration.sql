-- CreateEnum
CREATE TYPE "FormType" AS ENUM ('IEP', 'IEP_REPORT', 'FIVE_OH_FOUR');

-- CreateEnum
CREATE TYPE "ControlType" AS ENUM ('TEXT', 'TEXTAREA', 'DROPDOWN', 'RADIO', 'SIGNATURE', 'CHECKBOX', 'DATE');

-- CreateEnum
CREATE TYPE "OptionsEditableBy" AS ENUM ('ADMIN_ONLY', 'TEACHER_ALLOWED', 'NONE');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('AUDIOLOGICAL', 'EDUCATIONAL', 'OCCUPATIONAL_THERAPY', 'PHYSICAL_THERAPY', 'PSYCHOLOGICAL', 'SPEECH_LANGUAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "IEPServiceCategory" AS ENUM ('SPECIAL_EDUCATION', 'RELATED_SERVICE', 'SUPPLEMENTARY_AID', 'PROGRAM_MODIFICATION', 'SUPPORT_FOR_PERSONNEL');

-- CreateEnum
CREATE TYPE "IEPServiceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'AS_NEEDED', 'OTHER');

-- CreateEnum
CREATE TYPE "TransitionAssessmentType" AS ENUM ('INTEREST_INVENTORY', 'APTITUDE_ASSESSMENT', 'CAREER_ASSESSMENT', 'INDEPENDENT_LIVING_ASSESSMENT', 'SELF_DETERMINATION_ASSESSMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "PostsecondaryGoalArea" AS ENUM ('EDUCATION_TRAINING', 'EMPLOYMENT', 'INDEPENDENT_LIVING');

-- CreateEnum
CREATE TYPE "AccommodationType" AS ENUM ('PRESENTATION', 'RESPONSE', 'SETTING', 'TIMING_SCHEDULING', 'OTHER');

-- CreateEnum
CREATE TYPE "AssessmentDecision" AS ENUM ('STANDARD_WITH_ACCOMMODATIONS', 'ALTERNATE_ASSESSMENT', 'NOT_APPLICABLE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'RELATED_SERVICE_PROVIDER';
ALTER TYPE "UserRole" ADD VALUE 'READ_ONLY';

-- DropForeignKey
ALTER TABLE "ArtifactComparison" DROP CONSTRAINT "ArtifactComparison_planTypeId_fkey";

-- AlterTable
ALTER TABLE "ArtifactComparison" ALTER COLUMN "planInstanceId" DROP NOT NULL,
ALTER COLUMN "planTypeId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "comarAlignmentJson" JSONB,
ADD COLUMN     "draftStatus" TEXT,
ADD COLUMN     "presentLevelJson" JSONB,
ADD COLUMN     "templateSourceId" TEXT;

-- CreateTable
CREATE TABLE "GoalObjective" (
    "id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "objectiveText" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3),
    "measurementCriteria" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "goalId" TEXT NOT NULL,

    CONSTRAINT "GoalObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalArtifactLink" (
    "id" TEXT NOT NULL,
    "relevanceNote" TEXT,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "goalId" TEXT NOT NULL,
    "artifactComparisonId" TEXT NOT NULL,

    CONSTRAINT "GoalArtifactLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "area" "GoalArea" NOT NULL,
    "gradeBand" TEXT,
    "goalTextTemplate" TEXT NOT NULL,
    "objectivesTemplate" JSONB,
    "comarReference" TEXT,
    "measurementSuggestions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "jurisdictionId" TEXT,

    CONSTRAINT "GoalTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IEPService" (
    "id" TEXT NOT NULL,
    "category" "IEPServiceCategory" NOT NULL,
    "serviceType" TEXT NOT NULL,
    "description" TEXT,
    "provider" TEXT,
    "location" TEXT,
    "frequency" "IEPServiceFrequency" NOT NULL,
    "frequencyDetail" TEXT,
    "duration" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planInstanceId" TEXT NOT NULL,

    CONSTRAINT "IEPService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IEPAccommodation" (
    "id" TEXT NOT NULL,
    "accommodationType" "AccommodationType" NOT NULL,
    "description" TEXT NOT NULL,
    "setting" TEXT,
    "forStateAssessment" BOOLEAN NOT NULL DEFAULT false,
    "forDistrictAssessment" BOOLEAN NOT NULL DEFAULT false,
    "forClassroom" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planInstanceId" TEXT NOT NULL,

    CONSTRAINT "IEPAccommodation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IEPAssessmentDecision" (
    "id" TEXT NOT NULL,
    "assessmentName" TEXT NOT NULL,
    "assessmentArea" TEXT,
    "decision" "AssessmentDecision" NOT NULL,
    "alternateAssessmentRationale" TEXT,
    "accommodationsApplied" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planInstanceId" TEXT NOT NULL,

    CONSTRAINT "IEPAssessmentDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IEPTransition" (
    "id" TEXT NOT NULL,
    "studentVision" TEXT,
    "studentStrengths" TEXT,
    "studentPreferences" TEXT,
    "studentInterests" TEXT,
    "assessmentsCompleted" JSONB,
    "assessmentsSummary" TEXT,
    "courseOfStudy" TEXT,
    "diplomaTrack" TEXT,
    "educationTrainingGoal" TEXT,
    "employmentGoal" TEXT,
    "independentLivingGoal" TEXT,
    "independentLivingApplicable" BOOLEAN NOT NULL DEFAULT true,
    "transitionServices" JSONB,
    "agencyParticipation" TEXT,
    "agenciesInvited" JSONB,
    "studentInvited" BOOLEAN NOT NULL DEFAULT true,
    "studentAttended" BOOLEAN,
    "transferOfRightsDiscussed" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planInstanceId" TEXT NOT NULL,

    CONSTRAINT "IEPTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IEPExtendedSchoolYear" (
    "id" TEXT NOT NULL,
    "esyEligible" BOOLEAN NOT NULL,
    "esyDecisionDate" TIMESTAMP(3),
    "regressionRecoupmentData" TEXT,
    "regressionRisk" BOOLEAN,
    "regressionNotes" TEXT,
    "criticalLifeSkillsAtRisk" BOOLEAN,
    "criticalLifeSkillsNotes" TEXT,
    "emergingSkillsAtRisk" BOOLEAN,
    "emergingSkillsNotes" TEXT,
    "interferingBehaviors" BOOLEAN,
    "interferingBehaviorsNotes" TEXT,
    "severityOfDisability" TEXT,
    "specialCircumstances" BOOLEAN,
    "specialCircumstancesNotes" TEXT,
    "esyServicesDescription" TEXT,
    "esyGoals" JSONB,
    "esyStartDate" TIMESTAMP(3),
    "esyEndDate" TIMESTAMP(3),
    "esyLocation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planInstanceId" TEXT NOT NULL,

    CONSTRAINT "IEPExtendedSchoolYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IEPIndependentAssessmentReview" (
    "id" TEXT NOT NULL,
    "school" TEXT,
    "grade" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "dateOfReport" TIMESTAMP(3),
    "dateOfTeamReview" TIMESTAMP(3),
    "assessmentType" "AssessmentType" NOT NULL,
    "assessmentTypeOther" TEXT,
    "schoolReviewerName" TEXT,
    "schoolReviewerTitle" TEXT,
    "schoolReviewerCredentials" TEXT,
    "examinerName" TEXT,
    "examinerTitle" TEXT,
    "examinerLicensed" BOOLEAN,
    "examinerLicenseDetails" TEXT,
    "examinerQualified" BOOLEAN,
    "examinerQualificationNotes" TEXT,
    "reportWrittenDatedSigned" BOOLEAN,
    "materialsTechnicallySound" BOOLEAN,
    "materialsFollowedInstructions" BOOLEAN,
    "materialsInstructionsNotes" TEXT,
    "materialsLanguageAccurate" BOOLEAN,
    "materialsLanguageNotes" TEXT,
    "materialsBiasFree" BOOLEAN,
    "materialsBiasNotes" TEXT,
    "materialsValidPurpose" BOOLEAN,
    "materialsValidNotes" TEXT,
    "resultsReflectAptitude" BOOLEAN,
    "resultsReflectAptitudeNA" BOOLEAN,
    "resultsNotes" TEXT,
    "describesPerformanceAllAreas" BOOLEAN,
    "performanceAreasNotes" TEXT,
    "includesVariedAssessmentData" BOOLEAN,
    "assessmentDataNotes" TEXT,
    "includesInstructionalImplications" BOOLEAN,
    "instructionalNotes" TEXT,
    "findingsMatchData" BOOLEAN,
    "findingsMatchDataNote" TEXT,
    "dataMatchExistingSchoolData" BOOLEAN,
    "dataMatchExistingNote" TEXT,
    "recommendationsSupported" BOOLEAN,
    "recommendationsToConsider" TEXT,
    "schoolAssessmentWaived" BOOLEAN,
    "schoolAssessmentWaivedNote" TEXT,
    "includesDataForIEPContent" BOOLEAN,
    "iepContentNotes" TEXT,
    "disabilityConsistentWithCOMAR" BOOLEAN,
    "comarDisabilityNotes" TEXT,
    "additionalNotes" TEXT,
    "teamMembers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,
    "planInstanceId" TEXT,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "IEPIndependentAssessmentReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "stateCode" TEXT,
    "districtId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormFieldDefinition" (
    "id" TEXT NOT NULL,
    "formType" "FormType" NOT NULL,
    "section" TEXT NOT NULL,
    "sectionOrder" INTEGER NOT NULL DEFAULT 0,
    "fieldKey" TEXT NOT NULL,
    "fieldLabel" TEXT NOT NULL,
    "controlType" "ControlType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "valueEditableBy" JSONB NOT NULL,
    "optionsEditableBy" "OptionsEditableBy" NOT NULL DEFAULT 'NONE',
    "helpText" TEXT,
    "placeholder" TEXT,
    "validationRegex" TEXT,
    "minLength" INTEGER,
    "maxLength" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormFieldOption" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fieldDefinitionId" TEXT NOT NULL,

    CONSTRAINT "FormFieldOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentFieldValue" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GoalObjective_goalId_idx" ON "GoalObjective"("goalId");

-- CreateIndex
CREATE UNIQUE INDEX "GoalObjective_goalId_sequence_key" ON "GoalObjective"("goalId", "sequence");

-- CreateIndex
CREATE INDEX "GoalArtifactLink_goalId_idx" ON "GoalArtifactLink"("goalId");

-- CreateIndex
CREATE INDEX "GoalArtifactLink_artifactComparisonId_idx" ON "GoalArtifactLink"("artifactComparisonId");

-- CreateIndex
CREATE UNIQUE INDEX "GoalArtifactLink_goalId_artifactComparisonId_key" ON "GoalArtifactLink"("goalId", "artifactComparisonId");

-- CreateIndex
CREATE INDEX "GoalTemplate_area_idx" ON "GoalTemplate"("area");

-- CreateIndex
CREATE INDEX "GoalTemplate_gradeBand_idx" ON "GoalTemplate"("gradeBand");

-- CreateIndex
CREATE INDEX "GoalTemplate_isActive_idx" ON "GoalTemplate"("isActive");

-- CreateIndex
CREATE INDEX "GoalTemplate_jurisdictionId_idx" ON "GoalTemplate"("jurisdictionId");

-- CreateIndex
CREATE INDEX "IEPService_planInstanceId_idx" ON "IEPService"("planInstanceId");

-- CreateIndex
CREATE INDEX "IEPService_category_idx" ON "IEPService"("category");

-- CreateIndex
CREATE INDEX "IEPAccommodation_planInstanceId_idx" ON "IEPAccommodation"("planInstanceId");

-- CreateIndex
CREATE INDEX "IEPAccommodation_accommodationType_idx" ON "IEPAccommodation"("accommodationType");

-- CreateIndex
CREATE INDEX "IEPAssessmentDecision_planInstanceId_idx" ON "IEPAssessmentDecision"("planInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "IEPTransition_planInstanceId_key" ON "IEPTransition"("planInstanceId");

-- CreateIndex
CREATE INDEX "IEPTransition_planInstanceId_idx" ON "IEPTransition"("planInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "IEPExtendedSchoolYear_planInstanceId_key" ON "IEPExtendedSchoolYear"("planInstanceId");

-- CreateIndex
CREATE INDEX "IEPExtendedSchoolYear_planInstanceId_idx" ON "IEPExtendedSchoolYear"("planInstanceId");

-- CreateIndex
CREATE INDEX "IEPIndependentAssessmentReview_studentId_idx" ON "IEPIndependentAssessmentReview"("studentId");

-- CreateIndex
CREATE INDEX "IEPIndependentAssessmentReview_planInstanceId_idx" ON "IEPIndependentAssessmentReview"("planInstanceId");

-- CreateIndex
CREATE INDEX "IEPIndependentAssessmentReview_assessmentType_idx" ON "IEPIndependentAssessmentReview"("assessmentType");

-- CreateIndex
CREATE INDEX "IEPIndependentAssessmentReview_dateOfTeamReview_idx" ON "IEPIndependentAssessmentReview"("dateOfTeamReview");

-- CreateIndex
CREATE INDEX "School_stateCode_idx" ON "School"("stateCode");

-- CreateIndex
CREATE INDEX "School_districtId_idx" ON "School"("districtId");

-- CreateIndex
CREATE INDEX "School_isActive_idx" ON "School"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "School_stateCode_code_key" ON "School"("stateCode", "code");

-- CreateIndex
CREATE INDEX "FormFieldDefinition_formType_idx" ON "FormFieldDefinition"("formType");

-- CreateIndex
CREATE INDEX "FormFieldDefinition_formType_section_idx" ON "FormFieldDefinition"("formType", "section");

-- CreateIndex
CREATE INDEX "FormFieldDefinition_isActive_idx" ON "FormFieldDefinition"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "FormFieldDefinition_formType_fieldKey_key" ON "FormFieldDefinition"("formType", "fieldKey");

-- CreateIndex
CREATE INDEX "FormFieldOption_fieldDefinitionId_idx" ON "FormFieldOption"("fieldDefinitionId");

-- CreateIndex
CREATE INDEX "FormFieldOption_isActive_idx" ON "FormFieldOption"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "FormFieldOption_fieldDefinitionId_value_key" ON "FormFieldOption"("fieldDefinitionId", "value");

-- CreateIndex
CREATE INDEX "StudentFieldValue_studentId_idx" ON "StudentFieldValue"("studentId");

-- CreateIndex
CREATE INDEX "StudentFieldValue_fieldKey_idx" ON "StudentFieldValue"("fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "StudentFieldValue_studentId_fieldKey_key" ON "StudentFieldValue"("studentId", "fieldKey");

-- CreateIndex
CREATE INDEX "Goal_draftStatus_idx" ON "Goal"("draftStatus");

-- AddForeignKey
ALTER TABLE "GoalObjective" ADD CONSTRAINT "GoalObjective_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalArtifactLink" ADD CONSTRAINT "GoalArtifactLink_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalArtifactLink" ADD CONSTRAINT "GoalArtifactLink_artifactComparisonId_fkey" FOREIGN KEY ("artifactComparisonId") REFERENCES "ArtifactComparison"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalTemplate" ADD CONSTRAINT "GoalTemplate_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "Jurisdiction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactComparison" ADD CONSTRAINT "ArtifactComparison_planTypeId_fkey" FOREIGN KEY ("planTypeId") REFERENCES "PlanType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IEPService" ADD CONSTRAINT "IEPService_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IEPAccommodation" ADD CONSTRAINT "IEPAccommodation_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IEPAssessmentDecision" ADD CONSTRAINT "IEPAssessmentDecision_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IEPTransition" ADD CONSTRAINT "IEPTransition_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IEPExtendedSchoolYear" ADD CONSTRAINT "IEPExtendedSchoolYear_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IEPIndependentAssessmentReview" ADD CONSTRAINT "IEPIndependentAssessmentReview_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IEPIndependentAssessmentReview" ADD CONSTRAINT "IEPIndependentAssessmentReview_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IEPIndependentAssessmentReview" ADD CONSTRAINT "IEPIndependentAssessmentReview_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormFieldOption" ADD CONSTRAINT "FormFieldOption_fieldDefinitionId_fkey" FOREIGN KEY ("fieldDefinitionId") REFERENCES "FormFieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
