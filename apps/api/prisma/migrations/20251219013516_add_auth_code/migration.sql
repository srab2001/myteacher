-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('TEACHER', 'CASE_MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PlanTypeCode" AS ENUM ('IEP', 'FIVE_OH_FOUR', 'BEHAVIOR_PLAN');

-- CreateEnum
CREATE TYPE "StatusScope" AS ENUM ('OVERALL', 'ACADEMIC', 'BEHAVIOR', 'SERVICES');

-- CreateEnum
CREATE TYPE "StatusCode" AS ENUM ('ON_TRACK', 'WATCH', 'CONCERN', 'URGENT');

-- CreateEnum
CREATE TYPE "GoalArea" AS ENUM ('READING', 'WRITING', 'MATH', 'COMMUNICATION', 'SOCIAL_EMOTIONAL', 'BEHAVIOR', 'MOTOR_SKILLS', 'DAILY_LIVING', 'VOCATIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ProgressLevel" AS ENUM ('NOT_ADDRESSED', 'FULL_SUPPORT', 'SOME_SUPPORT', 'LOW_SUPPORT', 'MET_TARGET');

-- CreateEnum
CREATE TYPE "WorkSampleRating" AS ENUM ('BELOW_TARGET', 'NEAR_TARGET', 'MEETS_TARGET', 'ABOVE_TARGET');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('SPECIAL_EDUCATION', 'SPEECH_LANGUAGE', 'OCCUPATIONAL_THERAPY', 'PHYSICAL_THERAPY', 'COUNSELING', 'BEHAVIORAL_SUPPORT', 'READING_SPECIALIST', 'PARAPROFESSIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceSetting" AS ENUM ('GENERAL_EDUCATION', 'SPECIAL_EDUCATION', 'RESOURCE_ROOM', 'THERAPY_ROOM', 'COMMUNITY', 'HOME', 'OTHER');

-- CreateEnum
CREATE TYPE "PriorPlanSource" AS ENUM ('UPLOADED', 'SIS_IMPORT');

-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETE', 'ERROR');

-- CreateEnum
CREATE TYPE "BehaviorMeasurementType" AS ENUM ('FREQUENCY', 'DURATION', 'INTERVAL', 'RATING');

-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('ELEMENTARY', 'MIDDLE', 'HIGH', 'K8', 'K12', 'OTHER');

-- CreateEnum
CREATE TYPE "FormType" AS ENUM ('IEP', 'IEP_REPORT', 'FIVE_OH_FOUR', 'BIP');

-- CreateEnum
CREATE TYPE "ControlType" AS ENUM ('TEXT', 'TEXTAREA', 'DROPDOWN', 'RADIO', 'CHECKBOX', 'CHECKBOX_GROUP', 'DATE', 'SIGNATURE');

-- CreateEnum
CREATE TYPE "OptionsEditableBy" AS ENUM ('ADMIN_ONLY', 'TEACHER_ALLOWED', 'NONE');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('INITIAL', 'REEVALUATION', 'TRIENNIAL', 'INDEPENDENT');

-- CreateTable
CREATE TABLE "AppUser" (
    "id" TEXT NOT NULL,
    "googleId" TEXT,
    "username" TEXT,
    "passwordHash" TEXT,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "UserRole",
    "stateCode" TEXT,
    "districtName" TEXT,
    "schoolName" TEXT,
    "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "jurisdictionId" TEXT,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jurisdiction" (
    "id" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "stateName" TEXT NOT NULL,
    "districtCode" TEXT NOT NULL,
    "districtName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jurisdiction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "State" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "stateCode" TEXT,
    "schoolType" "SchoolType" NOT NULL DEFAULT 'OTHER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "externalId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "grade" TEXT,
    "schoolName" TEXT,
    "districtName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "jurisdictionId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "schoolId" TEXT,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentStatus" (
    "id" TEXT NOT NULL,
    "scope" "StatusScope" NOT NULL,
    "code" "StatusCode" NOT NULL,
    "summary" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,

    CONSTRAINT "StudentStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanType" (
    "id" TEXT NOT NULL,
    "code" "PlanTypeCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "jurisdictionId" TEXT NOT NULL,

    CONSTRAINT "PlanType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanSchema" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planTypeId" TEXT NOT NULL,
    "jurisdictionId" TEXT,

    CONSTRAINT "PlanSchema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanFieldConfig" (
    "id" TEXT NOT NULL,
    "planSchemaId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "isRequired" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanFieldConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanInstance" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,
    "planTypeId" TEXT NOT NULL,
    "schemaId" TEXT NOT NULL,

    CONSTRAINT "PlanInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanFieldValue" (
    "id" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planInstanceId" TEXT NOT NULL,

    CONSTRAINT "PlanFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "planInstanceId" TEXT NOT NULL,
    "goalCode" TEXT NOT NULL,
    "area" "GoalArea" NOT NULL,
    "annualGoalText" TEXT NOT NULL,
    "shortTermObjectives" JSONB,
    "baselineJson" JSONB,
    "baselineValue" DOUBLE PRECISION,
    "targetValue" DOUBLE PRECISION,
    "presentLevelJson" JSONB,
    "draftStatus" TEXT,
    "comarAlignmentJson" JSONB,
    "progressSchedule" TEXT NOT NULL DEFAULT 'WEEKLY',
    "targetDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalProgress" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quickSelect" "ProgressLevel" NOT NULL,
    "measureJson" JSONB,
    "percentCorrect" DOUBLE PRECISION,
    "trials" TEXT,
    "notes" TEXT,
    "comment" TEXT,
    "isDictated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "goalId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,

    CONSTRAINT "GoalProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkSample" (
    "id" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "rating" "WorkSampleRating" NOT NULL,
    "comment" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "goalId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "WorkSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "minutes" INTEGER NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "setting" "ServiceSetting" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planInstanceId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,

    CONSTRAINT "ServiceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriorPlanDocument" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "planDate" TIMESTAMP(3),
    "source" "PriorPlanSource" NOT NULL DEFAULT 'UPLOADED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" TEXT NOT NULL,
    "planTypeId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "PriorPlanDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BestPracticeDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "gradeBand" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ingestionStatus" "IngestionStatus" NOT NULL DEFAULT 'PENDING',
    "ingestionMessage" TEXT,
    "ingestionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planTypeId" TEXT NOT NULL,
    "jurisdictionId" TEXT,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "BestPracticeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planTypeId" TEXT NOT NULL,
    "jurisdictionId" TEXT,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "FormTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BestPracticeChunk" (
    "id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "sectionTag" TEXT,
    "text" TEXT NOT NULL,
    "embedding" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "planTypeCode" TEXT NOT NULL,
    "jurisdictionId" TEXT,
    "gradeBand" TEXT,
    "bestPracticeDocumentId" TEXT NOT NULL,

    CONSTRAINT "BestPracticeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BehaviorPlan" (
    "id" TEXT NOT NULL,
    "planInstanceId" TEXT NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BehaviorPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BehaviorTarget" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "examples" TEXT,
    "nonExamples" TEXT,
    "measurementType" "BehaviorMeasurementType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "behaviorPlanId" TEXT NOT NULL,

    CONSTRAINT "BehaviorTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BehaviorEvent" (
    "id" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "count" INTEGER,
    "rating" INTEGER,
    "durationSeconds" INTEGER,
    "contextJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "behaviorTargetId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,

    CONSTRAINT "BehaviorEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canCreatePlans" BOOLEAN NOT NULL DEFAULT false,
    "canUpdatePlans" BOOLEAN NOT NULL DEFAULT false,
    "canReadAll" BOOLEAN NOT NULL DEFAULT false,
    "canManageUsers" BOOLEAN NOT NULL DEFAULT false,
    "canManageDocs" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "StudentAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtifactComparison" (
    "id" TEXT NOT NULL,
    "planInstanceId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "planTypeId" TEXT NOT NULL,
    "artifactDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "baselineFileUrl" TEXT NOT NULL,
    "compareFileUrl" TEXT NOT NULL,
    "analysisText" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtifactComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "sid" VARCHAR(255) NOT NULL,
    "sess" JSONB NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

-- CreateTable
CREATE TABLE "FormFieldDefinition" (
    "id" TEXT NOT NULL,
    "formType" "FormType" NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldLabel" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "sectionOrder" INTEGER NOT NULL DEFAULT 0,
    "controlType" "ControlType" NOT NULL,
    "placeholder" TEXT,
    "helpText" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isGoalsSection" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "valueEditableBy" TEXT[] DEFAULT ARRAY['ADMIN', 'TEACHER', 'CASE_MANAGER']::TEXT[],
    "optionsEditableBy" "OptionsEditableBy" NOT NULL DEFAULT 'NONE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormFieldOption" (
    "id" TEXT NOT NULL,
    "formFieldDefinitionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormFieldOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentFieldValue" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "value" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalArtifactLink" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "artifactComparisonId" TEXT NOT NULL,
    "linkType" TEXT NOT NULL DEFAULT 'EVIDENCE',
    "relevanceNote" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalArtifactLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalObjective" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "objectiveText" TEXT NOT NULL,
    "measurementCriteria" TEXT,
    "targetDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoalObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IEPIndependentAssessmentReview" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "planInstanceId" TEXT NOT NULL,
    "assessmentType" "AssessmentType" NOT NULL,
    "assessmentTypeOther" TEXT,
    "assessmentDate" TIMESTAMP(3),
    "dateOfReport" TIMESTAMP(3),
    "dateOfTeamReview" TIMESTAMP(3),
    "evaluator" TEXT,
    "school" TEXT,
    "grade" TEXT,
    "summary" TEXT NOT NULL DEFAULT '',
    "recommendations" TEXT NOT NULL DEFAULT '',
    "attachmentUrl" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IEPIndependentAssessmentReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_googleId_key" ON "AppUser"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_username_key" ON "AppUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_email_key" ON "AppUser"("email");

-- CreateIndex
CREATE INDEX "AppUser_googleId_idx" ON "AppUser"("googleId");

-- CreateIndex
CREATE INDEX "AppUser_email_idx" ON "AppUser"("email");

-- CreateIndex
CREATE INDEX "AppUser_username_idx" ON "AppUser"("username");

-- CreateIndex
CREATE INDEX "Jurisdiction_stateCode_idx" ON "Jurisdiction"("stateCode");

-- CreateIndex
CREATE UNIQUE INDEX "Jurisdiction_stateCode_districtCode_key" ON "Jurisdiction"("stateCode", "districtCode");

-- CreateIndex
CREATE UNIQUE INDEX "State_code_key" ON "State"("code");

-- CreateIndex
CREATE INDEX "State_code_idx" ON "State"("code");

-- CreateIndex
CREATE INDEX "State_isActive_idx" ON "State"("isActive");

-- CreateIndex
CREATE INDEX "District_stateId_idx" ON "District"("stateId");

-- CreateIndex
CREATE INDEX "District_isActive_idx" ON "District"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "District_stateId_code_key" ON "District"("stateId", "code");

-- CreateIndex
CREATE INDEX "School_districtId_idx" ON "School"("districtId");

-- CreateIndex
CREATE INDEX "School_isActive_idx" ON "School"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "School_districtId_name_key" ON "School"("districtId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Student_recordId_key" ON "Student"("recordId");

-- CreateIndex
CREATE INDEX "Student_recordId_idx" ON "Student"("recordId");

-- CreateIndex
CREATE INDEX "Student_externalId_idx" ON "Student"("externalId");

-- CreateIndex
CREATE INDEX "Student_lastName_firstName_idx" ON "Student"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Student_teacherId_idx" ON "Student"("teacherId");

-- CreateIndex
CREATE INDEX "Student_schoolId_idx" ON "Student"("schoolId");

-- CreateIndex
CREATE INDEX "StudentStatus_studentId_scope_idx" ON "StudentStatus"("studentId", "scope");

-- CreateIndex
CREATE INDEX "StudentStatus_studentId_effectiveDate_idx" ON "StudentStatus"("studentId", "effectiveDate");

-- CreateIndex
CREATE INDEX "PlanType_code_idx" ON "PlanType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PlanType_jurisdictionId_code_key" ON "PlanType"("jurisdictionId", "code");

-- CreateIndex
CREATE INDEX "PlanSchema_planTypeId_isActive_idx" ON "PlanSchema"("planTypeId", "isActive");

-- CreateIndex
CREATE INDEX "PlanFieldConfig_planSchemaId_idx" ON "PlanFieldConfig"("planSchemaId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanFieldConfig_planSchemaId_sectionKey_fieldKey_key" ON "PlanFieldConfig"("planSchemaId", "sectionKey", "fieldKey");

-- CreateIndex
CREATE INDEX "PlanInstance_studentId_planTypeId_idx" ON "PlanInstance"("studentId", "planTypeId");

-- CreateIndex
CREATE INDEX "PlanInstance_status_idx" ON "PlanInstance"("status");

-- CreateIndex
CREATE INDEX "PlanFieldValue_planInstanceId_idx" ON "PlanFieldValue"("planInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanFieldValue_planInstanceId_fieldKey_key" ON "PlanFieldValue"("planInstanceId", "fieldKey");

-- CreateIndex
CREATE INDEX "Goal_planInstanceId_idx" ON "Goal"("planInstanceId");

-- CreateIndex
CREATE INDEX "GoalProgress_goalId_date_idx" ON "GoalProgress"("goalId", "date");

-- CreateIndex
CREATE INDEX "GoalProgress_goalId_idx" ON "GoalProgress"("goalId");

-- CreateIndex
CREATE INDEX "WorkSample_goalId_idx" ON "WorkSample"("goalId");

-- CreateIndex
CREATE INDEX "WorkSample_capturedAt_idx" ON "WorkSample"("capturedAt");

-- CreateIndex
CREATE INDEX "ServiceLog_planInstanceId_date_idx" ON "ServiceLog"("planInstanceId", "date");

-- CreateIndex
CREATE INDEX "ServiceLog_planInstanceId_serviceType_idx" ON "ServiceLog"("planInstanceId", "serviceType");

-- CreateIndex
CREATE INDEX "ServiceLog_providerId_idx" ON "ServiceLog"("providerId");

-- CreateIndex
CREATE INDEX "PriorPlanDocument_studentId_idx" ON "PriorPlanDocument"("studentId");

-- CreateIndex
CREATE INDEX "PriorPlanDocument_studentId_planTypeId_idx" ON "PriorPlanDocument"("studentId", "planTypeId");

-- CreateIndex
CREATE INDEX "PriorPlanDocument_uploadedById_idx" ON "PriorPlanDocument"("uploadedById");

-- CreateIndex
CREATE INDEX "BestPracticeDocument_planTypeId_idx" ON "BestPracticeDocument"("planTypeId");

-- CreateIndex
CREATE INDEX "BestPracticeDocument_jurisdictionId_idx" ON "BestPracticeDocument"("jurisdictionId");

-- CreateIndex
CREATE INDEX "BestPracticeDocument_isActive_idx" ON "BestPracticeDocument"("isActive");

-- CreateIndex
CREATE INDEX "BestPracticeDocument_ingestionStatus_idx" ON "BestPracticeDocument"("ingestionStatus");

-- CreateIndex
CREATE INDEX "FormTemplate_planTypeId_idx" ON "FormTemplate"("planTypeId");

-- CreateIndex
CREATE INDEX "FormTemplate_jurisdictionId_idx" ON "FormTemplate"("jurisdictionId");

-- CreateIndex
CREATE INDEX "FormTemplate_planTypeId_jurisdictionId_isDefault_idx" ON "FormTemplate"("planTypeId", "jurisdictionId", "isDefault");

-- CreateIndex
CREATE INDEX "BestPracticeChunk_bestPracticeDocumentId_idx" ON "BestPracticeChunk"("bestPracticeDocumentId");

-- CreateIndex
CREATE INDEX "BestPracticeChunk_planTypeCode_jurisdictionId_gradeBand_sec_idx" ON "BestPracticeChunk"("planTypeCode", "jurisdictionId", "gradeBand", "sectionTag");

-- CreateIndex
CREATE INDEX "BestPracticeChunk_sectionTag_idx" ON "BestPracticeChunk"("sectionTag");

-- CreateIndex
CREATE UNIQUE INDEX "BehaviorPlan_planInstanceId_key" ON "BehaviorPlan"("planInstanceId");

-- CreateIndex
CREATE INDEX "BehaviorTarget_behaviorPlanId_idx" ON "BehaviorTarget"("behaviorPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "BehaviorTarget_behaviorPlanId_code_key" ON "BehaviorTarget"("behaviorPlanId", "code");

-- CreateIndex
CREATE INDEX "BehaviorEvent_behaviorTargetId_eventDate_idx" ON "BehaviorEvent"("behaviorTargetId", "eventDate");

-- CreateIndex
CREATE INDEX "BehaviorEvent_behaviorTargetId_idx" ON "BehaviorEvent"("behaviorTargetId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_key" ON "UserPermission"("userId");

-- CreateIndex
CREATE INDEX "UserPermission_userId_idx" ON "UserPermission"("userId");

-- CreateIndex
CREATE INDEX "StudentAccess_userId_idx" ON "StudentAccess"("userId");

-- CreateIndex
CREATE INDEX "StudentAccess_studentId_idx" ON "StudentAccess"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAccess_userId_studentId_key" ON "StudentAccess"("userId", "studentId");

-- CreateIndex
CREATE INDEX "ArtifactComparison_planInstanceId_idx" ON "ArtifactComparison"("planInstanceId");

-- CreateIndex
CREATE INDEX "ArtifactComparison_studentId_idx" ON "ArtifactComparison"("studentId");

-- CreateIndex
CREATE INDEX "IDX_session_expire" ON "session"("expire");

-- CreateIndex
CREATE UNIQUE INDEX "FormFieldDefinition_formType_fieldKey_key" ON "FormFieldDefinition"("formType", "fieldKey");

-- CreateIndex
CREATE INDEX "FormFieldOption_formFieldDefinitionId_idx" ON "FormFieldOption"("formFieldDefinitionId");

-- CreateIndex
CREATE INDEX "StudentFieldValue_studentId_idx" ON "StudentFieldValue"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentFieldValue_studentId_fieldKey_key" ON "StudentFieldValue"("studentId", "fieldKey");

-- CreateIndex
CREATE INDEX "GoalArtifactLink_goalId_idx" ON "GoalArtifactLink"("goalId");

-- CreateIndex
CREATE INDEX "GoalArtifactLink_artifactComparisonId_idx" ON "GoalArtifactLink"("artifactComparisonId");

-- CreateIndex
CREATE INDEX "GoalObjective_goalId_idx" ON "GoalObjective"("goalId");

-- CreateIndex
CREATE INDEX "IEPIndependentAssessmentReview_studentId_idx" ON "IEPIndependentAssessmentReview"("studentId");

-- CreateIndex
CREATE INDEX "IEPIndependentAssessmentReview_planInstanceId_idx" ON "IEPIndependentAssessmentReview"("planInstanceId");

-- CreateIndex
CREATE INDEX "AuthCode_expiresAt_idx" ON "AuthCode"("expiresAt");

-- AddForeignKey
ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "Jurisdiction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "Jurisdiction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentStatus" ADD CONSTRAINT "StudentStatus_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentStatus" ADD CONSTRAINT "StudentStatus_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanType" ADD CONSTRAINT "PlanType_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "Jurisdiction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanSchema" ADD CONSTRAINT "PlanSchema_planTypeId_fkey" FOREIGN KEY ("planTypeId") REFERENCES "PlanType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanSchema" ADD CONSTRAINT "PlanSchema_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "Jurisdiction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFieldConfig" ADD CONSTRAINT "PlanFieldConfig_planSchemaId_fkey" FOREIGN KEY ("planSchemaId") REFERENCES "PlanSchema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanInstance" ADD CONSTRAINT "PlanInstance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanInstance" ADD CONSTRAINT "PlanInstance_planTypeId_fkey" FOREIGN KEY ("planTypeId") REFERENCES "PlanType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanInstance" ADD CONSTRAINT "PlanInstance_schemaId_fkey" FOREIGN KEY ("schemaId") REFERENCES "PlanSchema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFieldValue" ADD CONSTRAINT "PlanFieldValue_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalProgress" ADD CONSTRAINT "GoalProgress_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalProgress" ADD CONSTRAINT "GoalProgress_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkSample" ADD CONSTRAINT "WorkSample_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkSample" ADD CONSTRAINT "WorkSample_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceLog" ADD CONSTRAINT "ServiceLog_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceLog" ADD CONSTRAINT "ServiceLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorPlanDocument" ADD CONSTRAINT "PriorPlanDocument_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorPlanDocument" ADD CONSTRAINT "PriorPlanDocument_planTypeId_fkey" FOREIGN KEY ("planTypeId") REFERENCES "PlanType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorPlanDocument" ADD CONSTRAINT "PriorPlanDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BestPracticeDocument" ADD CONSTRAINT "BestPracticeDocument_planTypeId_fkey" FOREIGN KEY ("planTypeId") REFERENCES "PlanType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BestPracticeDocument" ADD CONSTRAINT "BestPracticeDocument_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "Jurisdiction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BestPracticeDocument" ADD CONSTRAINT "BestPracticeDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormTemplate" ADD CONSTRAINT "FormTemplate_planTypeId_fkey" FOREIGN KEY ("planTypeId") REFERENCES "PlanType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormTemplate" ADD CONSTRAINT "FormTemplate_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "Jurisdiction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormTemplate" ADD CONSTRAINT "FormTemplate_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BestPracticeChunk" ADD CONSTRAINT "BestPracticeChunk_bestPracticeDocumentId_fkey" FOREIGN KEY ("bestPracticeDocumentId") REFERENCES "BestPracticeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorPlan" ADD CONSTRAINT "BehaviorPlan_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorTarget" ADD CONSTRAINT "BehaviorTarget_behaviorPlanId_fkey" FOREIGN KEY ("behaviorPlanId") REFERENCES "BehaviorPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorEvent" ADD CONSTRAINT "BehaviorEvent_behaviorTargetId_fkey" FOREIGN KEY ("behaviorTargetId") REFERENCES "BehaviorTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorEvent" ADD CONSTRAINT "BehaviorEvent_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAccess" ADD CONSTRAINT "StudentAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAccess" ADD CONSTRAINT "StudentAccess_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactComparison" ADD CONSTRAINT "ArtifactComparison_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactComparison" ADD CONSTRAINT "ArtifactComparison_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactComparison" ADD CONSTRAINT "ArtifactComparison_planTypeId_fkey" FOREIGN KEY ("planTypeId") REFERENCES "PlanType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactComparison" ADD CONSTRAINT "ArtifactComparison_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormFieldOption" ADD CONSTRAINT "FormFieldOption_formFieldDefinitionId_fkey" FOREIGN KEY ("formFieldDefinitionId") REFERENCES "FormFieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFieldValue" ADD CONSTRAINT "StudentFieldValue_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFieldValue" ADD CONSTRAINT "StudentFieldValue_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalArtifactLink" ADD CONSTRAINT "GoalArtifactLink_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalArtifactLink" ADD CONSTRAINT "GoalArtifactLink_artifactComparisonId_fkey" FOREIGN KEY ("artifactComparisonId") REFERENCES "ArtifactComparison"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalObjective" ADD CONSTRAINT "GoalObjective_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IEPIndependentAssessmentReview" ADD CONSTRAINT "IEPIndependentAssessmentReview_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IEPIndependentAssessmentReview" ADD CONSTRAINT "IEPIndependentAssessmentReview_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IEPIndependentAssessmentReview" ADD CONSTRAINT "IEPIndependentAssessmentReview_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthCode" ADD CONSTRAINT "AuthCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
