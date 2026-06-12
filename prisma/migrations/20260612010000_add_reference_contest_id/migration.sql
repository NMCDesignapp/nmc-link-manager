-- AlterTable: Add referenceContestId to Contest
ALTER TABLE "Contest" ADD COLUMN "referenceContestId" TEXT NOT NULL DEFAULT '';
