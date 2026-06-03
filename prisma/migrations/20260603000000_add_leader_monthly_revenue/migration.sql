-- CreateTable
CREATE TABLE "LeaderInfo" (
    "id" TEXT NOT NULL,
    "agentCode" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT '',
    "ban" TEXT NOT NULL DEFAULT '',
    "nhom" TEXT NOT NULL DEFAULT '',
    "maNhom" TEXT NOT NULL DEFAULT '',
    "salary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyRevenue" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "maNhom" TEXT NOT NULL DEFAULT '',
    "nhom" TEXT NOT NULL DEFAULT '',
    "agentCode" TEXT NOT NULL DEFAULT '',
    "agentName" TEXT NOT NULL DEFAULT '',
    "totalFYP" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAFYP" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contractCount" INTEGER NOT NULL DEFAULT 0,
    "activityRounds" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyRevenue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeaderInfo_agentCode_key" ON "LeaderInfo"("agentCode");
