-- Add missing column maTVVTuyendung to TVVStruct
-- This column was added to schema.prisma but never had a corresponding
-- migration created. Caused Prisma error P2022 "column does not exist"
-- when TVV API tried to insert with maTVVTuyendung field.

ALTER TABLE "TVVStruct" ADD COLUMN IF NOT EXISTS "maTVVTuyendung" TEXT NOT NULL DEFAULT '';
