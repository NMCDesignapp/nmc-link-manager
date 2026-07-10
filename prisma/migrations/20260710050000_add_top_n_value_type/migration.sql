-- Add topNValueType column to Contest table
-- Cho phép user chọn loại chỉ tiêu xét Top N: 'ip' (IP - default) hoặc 'afyp' (AFYP)
ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "topNValueType" TEXT NOT NULL DEFAULT 'ip';
