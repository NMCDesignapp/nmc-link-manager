ALTER TABLE "TamthuDetail" ADD COLUMN IF NOT EXISTS "monthKey" TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS "TamthuDetail_monthKey_idx" ON "TamthuDetail"("monthKey");
