-- AlterTable: Add ngayHieuLuc to Recruiter (Ngày hiệu lực chức vụ gần nhất — mỗi lần thăng/hạ thì ghi đè)
ALTER TABLE "Recruiter" ADD COLUMN IF NOT EXISTS "ngayHieuLuc" TIMESTAMP(3);

-- AlterTable: Add filterByEffectiveDate to Contest
-- Khi true: chỉ tính TVV có ngày bắt đầu LV (lấy từ DS TVV) sau ngày hiệu lực chức vụ gần nhất của NTD recruiter
ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "filterByEffectiveDate" BOOLEAN NOT NULL DEFAULT false;
