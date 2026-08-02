CREATE TABLE IF NOT EXISTS "TamthuDetail" (
  "id" TEXT NOT NULL,
  "rowNo" INTEGER NOT NULL DEFAULT 0,
  "nhom" TEXT NOT NULL DEFAULT '',
  "maNhom" TEXT NOT NULL DEFAULT '',
  "agentCode" TEXT NOT NULL DEFAULT '',
  "agentName" TEXT NOT NULL DEFAULT '',
  "effectiveDate" TEXT NOT NULL DEFAULT '',
  "issueDate" TEXT NOT NULL DEFAULT '',
  "pdt" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "afyp" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "contractStatus" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TamthuDetail_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TamthuDetail_nhom_idx" ON "TamthuDetail"("nhom");
CREATE INDEX IF NOT EXISTS "TamthuDetail_agentCode_idx" ON "TamthuDetail"("agentCode");
