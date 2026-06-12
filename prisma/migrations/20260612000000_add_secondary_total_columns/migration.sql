-- AlterTable: Add supplementary total condition columns to Contest
ALTER TABLE "Contest" ADD COLUMN "secondaryTotalAFYPMin" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Contest" ADD COLUMN "secondaryTotalIPMin" DOUBLE PRECISION NOT NULL DEFAULT 0;
