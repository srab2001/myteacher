-- CreateEnum
CREATE TYPE "PlanVersionStatus" AS ENUM ('FINAL', 'DISTRIBUTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('PDF', 'DOCX', 'HTML');

-- CreateEnum
CREATE TYPE "DecisionType" AS ENUM ('ELIGIBILITY_CATEGORY', 'PLACEMENT_LRE', 'SERVICES_CHANGE', 'GOALS_CHANGE', 'ACCOMMODATIONS_CHANGE', 'ESY_DECISION', 'ASSESSMENT_PARTICIPATION', 'BEHAVIOR_SUPPORTS', 'TRANSITION_SERVICES', 'OTHER');

-- CreateEnum
CREATE TYPE "DecisionStatus" AS ENUM ('ACTIVE', 'VOID');

-- CreateEnum
CREATE TYPE "SignaturePacketStatus" AS ENUM ('OPEN', 'COMPLETE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SignatureRole" AS ENUM ('PARENT_GUARDIAN', 'CASE_MANAGER', 'SPECIAL_ED_TEACHER', 'GENERAL_ED_TEACHER', 'RELATED_SERVICE_PROVIDER', 'ADMINISTRATOR', 'STUDENT', 'OTHER');

-- CreateEnum
CREATE TYPE "SignatureMethod" AS ENUM ('ELECTRONIC', 'IN_PERSON', 'PAPER_RETURNED');

-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('PENDING', 'SIGNED', 'DECLINED');

-- CreateTable
CREATE TABLE "PlanVersion" (
    "id" TEXT NOT NULL,
    "planInstanceId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "PlanVersionStatus" NOT NULL DEFAULT 'FINAL',
    "snapshotJson" JSONB NOT NULL,
    "finalizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedByUserId" TEXT NOT NULL,
    "distributedAt" TIMESTAMP(3),
    "distributedByUserId" TEXT,
    "versionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanExport" (
    "id" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "format" "ExportFormat" NOT NULL DEFAULT 'PDF',
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSizeBytes" INTEGER,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "exportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exportedByUserId" TEXT NOT NULL,

    CONSTRAINT "PlanExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionLedgerEntry" (
    "id" TEXT NOT NULL,
    "planInstanceId" TEXT NOT NULL,
    "planVersionId" TEXT,
    "meetingId" TEXT,
    "decisionType" "DecisionType" NOT NULL,
    "summary" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "optionsConsidered" TEXT,
    "participants" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL,
    "decidedByUserId" TEXT NOT NULL,
    "status" "DecisionStatus" NOT NULL DEFAULT 'ACTIVE',
    "voidedAt" TIMESTAMP(3),
    "voidedByUserId" TEXT,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DecisionLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignaturePacket" (
    "id" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "status" "SignaturePacketStatus" NOT NULL DEFAULT 'OPEN',
    "requiredRoles" JSONB NOT NULL DEFAULT '[]',
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignaturePacket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureRecord" (
    "id" TEXT NOT NULL,
    "packetId" TEXT NOT NULL,
    "role" "SignatureRole" NOT NULL,
    "signerUserId" TEXT,
    "signerName" TEXT NOT NULL,
    "signerEmail" TEXT,
    "signerTitle" TEXT,
    "method" "SignatureMethod",
    "status" "SignatureStatus" NOT NULL DEFAULT 'PENDING',
    "signedAt" TIMESTAMP(3),
    "attestationText" TEXT,
    "ipAddress" TEXT,
    "declinedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignatureRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanVersion_planInstanceId_idx" ON "PlanVersion"("planInstanceId");

-- CreateIndex
CREATE INDEX "PlanVersion_finalizedAt_idx" ON "PlanVersion"("finalizedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlanVersion_planInstanceId_versionNumber_key" ON "PlanVersion"("planInstanceId", "versionNumber");

-- CreateIndex
CREATE INDEX "PlanExport_planVersionId_idx" ON "PlanExport"("planVersionId");

-- CreateIndex
CREATE INDEX "PlanExport_exportedAt_idx" ON "PlanExport"("exportedAt");

-- CreateIndex
CREATE INDEX "DecisionLedgerEntry_planInstanceId_idx" ON "DecisionLedgerEntry"("planInstanceId");

-- CreateIndex
CREATE INDEX "DecisionLedgerEntry_planVersionId_idx" ON "DecisionLedgerEntry"("planVersionId");

-- CreateIndex
CREATE INDEX "DecisionLedgerEntry_meetingId_idx" ON "DecisionLedgerEntry"("meetingId");

-- CreateIndex
CREATE INDEX "DecisionLedgerEntry_decisionType_idx" ON "DecisionLedgerEntry"("decisionType");

-- CreateIndex
CREATE INDEX "DecisionLedgerEntry_decidedAt_idx" ON "DecisionLedgerEntry"("decidedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SignaturePacket_planVersionId_key" ON "SignaturePacket"("planVersionId");

-- CreateIndex
CREATE INDEX "SignaturePacket_status_idx" ON "SignaturePacket"("status");

-- CreateIndex
CREATE INDEX "SignaturePacket_createdAt_idx" ON "SignaturePacket"("createdAt");

-- CreateIndex
CREATE INDEX "SignatureRecord_packetId_idx" ON "SignatureRecord"("packetId");

-- CreateIndex
CREATE INDEX "SignatureRecord_role_idx" ON "SignatureRecord"("role");

-- CreateIndex
CREATE INDEX "SignatureRecord_status_idx" ON "SignatureRecord"("status");

-- AddForeignKey
ALTER TABLE "PlanVersion" ADD CONSTRAINT "PlanVersion_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanVersion" ADD CONSTRAINT "PlanVersion_finalizedByUserId_fkey" FOREIGN KEY ("finalizedByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanVersion" ADD CONSTRAINT "PlanVersion_distributedByUserId_fkey" FOREIGN KEY ("distributedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanExport" ADD CONSTRAINT "PlanExport_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanExport" ADD CONSTRAINT "PlanExport_exportedByUserId_fkey" FOREIGN KEY ("exportedByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionLedgerEntry" ADD CONSTRAINT "DecisionLedgerEntry_planInstanceId_fkey" FOREIGN KEY ("planInstanceId") REFERENCES "PlanInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionLedgerEntry" ADD CONSTRAINT "DecisionLedgerEntry_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionLedgerEntry" ADD CONSTRAINT "DecisionLedgerEntry_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "PlanMeeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionLedgerEntry" ADD CONSTRAINT "DecisionLedgerEntry_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionLedgerEntry" ADD CONSTRAINT "DecisionLedgerEntry_voidedByUserId_fkey" FOREIGN KEY ("voidedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignaturePacket" ADD CONSTRAINT "SignaturePacket_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignaturePacket" ADD CONSTRAINT "SignaturePacket_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureRecord" ADD CONSTRAINT "SignatureRecord_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "SignaturePacket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureRecord" ADD CONSTRAINT "SignatureRecord_signerUserId_fkey" FOREIGN KEY ("signerUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
