-- CreateTable
CREATE TABLE "Link" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'globe',
    "category" TEXT NOT NULL DEFAULT 'General',
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "link_type" TEXT NOT NULL DEFAULT 'web',
    "file_url" TEXT,
    "file_name" TEXT,
    "file_type" TEXT,
    "thumbnail" TEXT,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#00ff88',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "agentCode" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT '',
    "ban" TEXT NOT NULL DEFAULT '',
    "nhom" TEXT NOT NULL DEFAULT '',
    "maNhom" TEXT NOT NULL DEFAULT '',
    "leaderAgentCode" TEXT NOT NULL DEFAULT '',
    "recruiterCode" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3),
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "fyp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "afyp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tinhLuot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "nhom" TEXT NOT NULL DEFAULT '',
    "maNhom" TEXT NOT NULL DEFAULT '',
    "agentCode" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recruiter" (
    "id" TEXT NOT NULL,
    "nhom" TEXT NOT NULL DEFAULT '',
    "agentCode" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recruiter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "issueDate" TIMESTAMP(3),
    "conditionType" TEXT NOT NULL DEFAULT 'per_contract_ip',
    "targetType" TEXT NOT NULL DEFAULT 'tvv',
    "bonusTiers" TEXT NOT NULL,
    "posterUrl" TEXT NOT NULL DEFAULT '',
    "participants" TEXT NOT NULL DEFAULT '[]',
    "usePhase2" BOOLEAN NOT NULL DEFAULT false,
    "phase2StartDate" TIMESTAMP(3),
    "phase2EndDate" TIMESTAMP(3),
    "bonusTiers2" TEXT NOT NULL DEFAULT '[]',
    "useSecondaryCondition" BOOLEAN NOT NULL DEFAULT false,
    "secondaryAFYPMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "secondaryIPMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "secondaryLuotHDMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "secondaryLuotHDCMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "secondaryLuotHDFilter" TEXT NOT NULL DEFAULT 'all',
    "secondaryLuotHDCFilter" TEXT NOT NULL DEFAULT 'all',
    "hideNotAchieved" BOOLEAN NOT NULL DEFAULT false,
    "includeIndividualNTD" BOOLEAN NOT NULL DEFAULT false,
    "includeIndividualTN" BOOLEAN NOT NULL DEFAULT false,
    "luotHDThreshold" DOUBLE PRECISION NOT NULL DEFAULT 3000000,
    "luotHDCTThreshold" DOUBLE PRECISION NOT NULL DEFAULT 12000000,
    "tvv90MaxMonths" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "tvv90MinIP" DOUBLE PRECISION NOT NULL DEFAULT 12000000,
    "csvContractUrl" TEXT NOT NULL DEFAULT '',
    "csvStaffUrl" TEXT NOT NULL DEFAULT '',
    "csvRecruiterUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_contractNumber_key" ON "Contract"("contractNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_agentCode_key" ON "Staff"("agentCode");

-- CreateIndex
CREATE UNIQUE INDEX "Recruiter_agentCode_key" ON "Recruiter"("agentCode");
