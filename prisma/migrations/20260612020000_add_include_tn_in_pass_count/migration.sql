-- AlterTable: Add includeTNInPassCount to Contest
-- When using tvv_pass_count mode for groups, this flag determines whether
-- the Trưởng Nhóm (TN) is counted as a TVV who achieved the reference contest.
-- Default: false = do NOT count TN (they already achieved in individual contest)
ALTER TABLE "Contest" ADD COLUMN "includeTNInPassCount" BOOLEAN NOT NULL DEFAULT false;
