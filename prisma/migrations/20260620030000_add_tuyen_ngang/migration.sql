-- CreateTable
CREATE TABLE "TuyenNgang" (
    "id" TEXT NOT NULL,
    "nhom" TEXT NOT NULL DEFAULT '',
    "agentCode" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "ngayBatDau" DATETIME,
    "ngayHieuLuc" DATETIME,
    "maNguoiTuyenDung" TEXT NOT NULL DEFAULT '',
    "tenNguoiTuyenDung" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    CONSTRAINT "TuyenNgang_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TuyenNgang_agentCode_key" ON "TuyenNgang"("agentCode");
