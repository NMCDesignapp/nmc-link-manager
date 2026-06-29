-- CreateTable: SaoVietData (số liệu Sao Việt — upload/sync thủ công per chương trình)
CREATE TABLE "SaoVietData" (
    "id" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "agentCode" TEXT NOT NULL DEFAULT '',
    "agentName" TEXT NOT NULL DEFAULT '',
    "nhomKD" TEXT NOT NULL DEFAULT '',
    "fyp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fypTVVm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "slTvvmHDC" INTEGER NOT NULL DEFAULT 0,
    "tvvmCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaoVietData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: index on program for fast filtering by chapter
CREATE INDEX "SaoVietData_program_idx" ON "SaoVietData"("program");
