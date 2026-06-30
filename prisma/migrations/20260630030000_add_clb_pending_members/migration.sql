-- CreateTable: ClbMember (DS Thành viên CLB — đồng bộ đa thiết bị, thay localStorage)
CREATE TABLE "ClbMember" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL DEFAULT '',
    "nhom" TEXT NOT NULL DEFAULT '',
    "agentCode" TEXT NOT NULL DEFAULT '',
    "agentName" TEXT NOT NULL DEFAULT '',
    "chucVu" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClbMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PendingMember (DS Chờ xét gia nhập — đồng bộ đa thiết bị)
CREATE TABLE "PendingMember" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL DEFAULT '',
    "nhom" TEXT NOT NULL DEFAULT '',
    "agentCode" TEXT NOT NULL DEFAULT '',
    "agentName" TEXT NOT NULL DEFAULT '',
    "chucVu" TEXT NOT NULL DEFAULT '',
    "ipT2" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ipT1" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ipT0" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingMember_pkey" PRIMARY KEY ("id")
);
