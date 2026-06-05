-- CreateTable
CREATE TABLE "Phong" (
    "id" TEXT NOT NULL,
    "maPhong" TEXT NOT NULL,
    "tenPhong" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Phong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AD" (
    "id" TEXT NOT NULL,
    "maAD" TEXT NOT NULL,
    "tenAD" TEXT NOT NULL,
    "maPhong" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AD_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BanNhom" (
    "id" TEXT NOT NULL,
    "maBanNhom" TEXT NOT NULL,
    "tenBanNhom" TEXT NOT NULL,
    "maAD" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BanNhom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TVVStruct" (
    "id" TEXT NOT NULL,
    "agentCode" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "maBanNhom" TEXT NOT NULL DEFAULT '',
    "chucVu" TEXT NOT NULL DEFAULT '',
    "ngayBatDau" TIMESTAMP(3),
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TVVStruct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Phong_maPhong_key" ON "Phong"("maPhong");

-- CreateIndex
CREATE UNIQUE INDEX "AD_maAD_key" ON "AD"("maAD");

-- CreateIndex
CREATE UNIQUE INDEX "BanNhom_maBanNhom_key" ON "BanNhom"("maBanNhom");

-- CreateIndex
CREATE UNIQUE INDEX "TVVStruct_agentCode_key" ON "TVVStruct"("agentCode");
