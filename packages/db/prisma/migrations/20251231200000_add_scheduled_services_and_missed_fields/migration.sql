-- Add missed session fields to ServiceLog
ALTER TABLE "ServiceLog" ADD COLUMN IF NOT EXISTS "missedReason" TEXT;
ALTER TABLE "ServiceLog" ADD COLUMN IF NOT EXISTS "makeupPlanned" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum for ScheduledServiceStatus
DO $$ BEGIN
    CREATE TYPE "ScheduledServiceStatus" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable for ScheduledServicePlan
CREATE TABLE IF NOT EXISTS "ScheduledServicePlan" (
    "id" TEXT NOT NULL,
    "status" "ScheduledServiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planInstanceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "ScheduledServicePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable for ScheduledServiceItem
CREATE TABLE IF NOT EXISTS "ScheduledServiceItem" (
    "id" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "expectedMinutesPerWeek" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "providerRole" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scheduledPlanId" TEXT NOT NULL,

    CONSTRAINT "ScheduledServiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for ScheduledServicePlan
CREATE UNIQUE INDEX IF NOT EXISTS "ScheduledServicePlan_planInstanceId_key" ON "ScheduledServicePlan"("planInstanceId");
CREATE INDEX IF NOT EXISTS "ScheduledServicePlan_planInstanceId_idx" ON "ScheduledServicePlan"("planInstanceId");
CREATE INDEX IF NOT EXISTS "ScheduledServicePlan_status_idx" ON "ScheduledServicePlan"("status");

-- CreateIndex for ScheduledServiceItem
CREATE INDEX IF NOT EXISTS "ScheduledServiceItem_scheduledPlanId_idx" ON "ScheduledServiceItem"("scheduledPlanId");
CREATE INDEX IF NOT EXISTS "ScheduledServiceItem_serviceType_idx" ON "ScheduledServiceItem"("serviceType");

-- AddForeignKey for ScheduledServicePlan
DO $$ BEGIN
    ALTER TABLE "ScheduledServicePlan" ADD CONSTRAINT "ScheduledServicePlan_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ScheduledServicePlan" ADD CONSTRAINT "ScheduledServicePlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ScheduledServicePlan" ADD CONSTRAINT "ScheduledServicePlan_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey for ScheduledServiceItem
DO $$ BEGIN
    ALTER TABLE "ScheduledServiceItem" ADD CONSTRAINT "ScheduledServiceItem_scheduledPlanId_fkey" FOREIGN KEY ("scheduledPlanId") REFERENCES "ScheduledServicePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
