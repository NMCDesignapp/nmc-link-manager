-- AlterTable: Add topN, topNMinIP to Contest
-- Used for conditionType = 'top_n_ip': xét Top N TVV có tổng IP cao nhất
-- (điều kiện IP đạt tối thiểu topNMinIP). Mặc định Top 3, IP tối thiểu 50 triệu.
ALTER TABLE "Contest" ADD COLUMN "topN" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "Contest" ADD COLUMN "topNMinIP" DOUBLE PRECISION NOT NULL DEFAULT 50000000;
