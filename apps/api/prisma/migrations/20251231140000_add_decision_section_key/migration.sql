-- Add sectionKey column to DecisionLedgerEntry
ALTER TABLE "DecisionLedgerEntry" ADD COLUMN IF NOT EXISTS "sectionKey" TEXT;

-- Add index for sectionKey
CREATE INDEX IF NOT EXISTS "DecisionLedgerEntry_sectionKey_idx" ON "DecisionLedgerEntry"("sectionKey");
