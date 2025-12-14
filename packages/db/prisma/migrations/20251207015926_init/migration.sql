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
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "studentIdNum" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "grade" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "jurisdictionId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,

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

    CONSTRAINT "PlanSchema_pkey" PRIMARY KEY ("id")
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
    "goalCode" TEXT NOT NULL,
    "area" "GoalArea" NOT NULL,
    "baselineJson" JSONB,
    "annualGoalText" TEXT NOT NULL,
    "shortTermObjectives" JSONB,
    "progressSchedule" TEXT,
    "targetDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planInstanceId" TEXT NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalProgress" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quickSelect" "ProgressLevel" NOT NULL,
    "measureJson" JSONB,
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
CREATE UNIQUE INDEX "Student_studentIdNum_key" ON "Student"("studentIdNum");

-- CreateIndex
CREATE INDEX "Student_studentIdNum_idx" ON "Student"("studentIdNum");

-- CreateIndex
CREATE INDEX "Student_lastName_firstName_idx" ON "Student"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Student_teacherId_idx" ON "Student"("teacherId");

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
CREATE INDEX "Goal_area_idx" ON "Goal"("area");

-- CreateIndex
CREATE UNIQUE INDEX "Goal_planInstanceId_goalCode_key" ON "Goal"("planInstanceId", "goalCode");

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

-- AddForeignKey
ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "Jurisdiction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "Jurisdiction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentStatus" ADD CONSTRAINT "StudentStatus_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentStatus" ADD CONSTRAINT "StudentStatus_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanType" ADD CONSTRAINT "PlanType_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "Jurisdiction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanSchema" ADD CONSTRAINT "PlanSchema_planTypeId_fkey" FOREIGN KEY ("planTypeId") REFERENCES "PlanType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanInstance" ADD CONSTRAINT "PlanInstance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanInstance" ADD CONSTRAINT "PlanInstance_planTypeId_fkey" FOREIGN KEY ("planTypeId") REFERENCES "PlanType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanInstance" ADD CONSTRAINT "PlanInstance_schemaId_fkey" FOREIGN KEY ("schemaId") REFERENCES "PlanSchema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFieldValue" ADD CONSTRAINT "PlanFieldValue_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
