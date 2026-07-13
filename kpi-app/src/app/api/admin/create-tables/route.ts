import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/admin/create-tables
// Tạo tất cả tables trong DB mới (Neon project mới chưa có tables).
// Vercel build chỉ run `prisma generate` (postinstall), KHÔNG run `prisma migrate deploy`
// → DB mới trống → API lỗi "table does not exist".
// Endpoint này CREATE TABLE IF NOT EXISTS cho tất cả tables + columns theo Prisma schema.

export async function POST() {
  const results: string[] = [];

  try {
    // Tạo tables theo thứ tự (independent tables trước, dependent sau)
    const createTableSQLs: { name: string; sql: string }[] = [
      // ===== Independent tables =====
      {
        name: 'Phong',
        sql: `CREATE TABLE IF NOT EXISTS "Phong" (
          "id" TEXT NOT NULL,
          "maPhong" TEXT NOT NULL,
          "tenPhong" TEXT NOT NULL,
          "note" TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "Phong_pkey" PRIMARY KEY ("id")
        )`
      },
      {
        name: 'Category',
        sql: `CREATE TABLE IF NOT EXISTS "Category" (
          "id" SERIAL NOT NULL,
          "name" TEXT NOT NULL,
          "icon" TEXT,
          "color" TEXT NOT NULL DEFAULT '#3b82f6',
          "sort_order" INTEGER NOT NULL DEFAULT 0,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
        )`
      },
      {
        name: 'Setting',
        sql: `CREATE TABLE IF NOT EXISTS "Setting" (
          "id" SERIAL NOT NULL,
          "key" TEXT NOT NULL,
          "value" TEXT,
          "updated_at" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
        )`
      },
      {
        name: 'Link',
        sql: `CREATE TABLE IF NOT EXISTS "Link" (
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
        )`
      },
      {
        name: 'CalendarEvent',
        sql: `CREATE TABLE IF NOT EXISTS "CalendarEvent" (
          "id" SERIAL NOT NULL,
          "title" TEXT NOT NULL,
          "date" TEXT NOT NULL,
          "color" TEXT NOT NULL DEFAULT '#00ff88',
          "owner" TEXT NOT NULL DEFAULT '',
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
        )`
      },
      {
        name: 'AD',
        sql: `CREATE TABLE IF NOT EXISTS "AD" (
          "id" TEXT NOT NULL,
          "maAD" TEXT NOT NULL,
          "tenAD" TEXT NOT NULL,
          "maPhong" TEXT NOT NULL DEFAULT '',
          "note" TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "AD_pkey" PRIMARY KEY ("id")
        )`
      },
      {
        name: 'BanNhom',
        sql: `CREATE TABLE IF NOT EXISTS "BanNhom" (
          "id" TEXT NOT NULL,
          "maBanNhom" TEXT NOT NULL,
          "tenBanNhom" TEXT NOT NULL,
          "maAD" TEXT NOT NULL DEFAULT '',
          "note" TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "BanNhom_pkey" PRIMARY KEY ("id")
        )`
      },
      {
        name: 'Staff',
        sql: `CREATE TABLE IF NOT EXISTS "Staff" (
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
        )`
      },
      {
        name: 'Recruiter',
        sql: `CREATE TABLE IF NOT EXISTS "Recruiter" (
          "id" TEXT NOT NULL,
          "nhom" TEXT NOT NULL DEFAULT '',
          "agentCode" TEXT NOT NULL,
          "agentName" TEXT NOT NULL,
          "position" TEXT NOT NULL DEFAULT '',
          "startDate" TIMESTAMP(3),
          "ngayHieuLuc" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "Recruiter_pkey" PRIMARY KEY ("id")
        )`
      },
      {
        name: 'TuyenNgang',
        sql: `CREATE TABLE IF NOT EXISTS "TuyenNgang" (
          "id" TEXT NOT NULL,
          "nhom" TEXT NOT NULL DEFAULT '',
          "agentCode" TEXT NOT NULL,
          "agentName" TEXT NOT NULL,
          "ngayBatDau" TIMESTAMP(3),
          "ngayHieuLuc" TIMESTAMP(3),
          "maNguoiTuyenDung" TEXT NOT NULL DEFAULT '',
          "tenNguoiTuyenDung" TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "TuyenNgang_pkey" PRIMARY KEY ("id")
        )`
      },
      {
        name: 'TVVStruct',
        sql: `CREATE TABLE IF NOT EXISTS "TVVStruct" (
          "id" TEXT NOT NULL,
          "agentCode" TEXT NOT NULL,
          "agentName" TEXT NOT NULL,
          "maBanNhom" TEXT NOT NULL DEFAULT '',
          "chucVu" TEXT NOT NULL DEFAULT '',
          "ngayBatDau" TIMESTAMP(3),
          "maTVVTuyendung" TEXT NOT NULL DEFAULT '',
          "note" TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "TVVStruct_pkey" PRIMARY KEY ("id")
        )`
      },
      {
        name: 'LeaderInfo',
        sql: `CREATE TABLE IF NOT EXISTS "LeaderInfo" (
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
        )`
      },
      {
        name: 'Contract',
        sql: `CREATE TABLE IF NOT EXISTS "Contract" (
          "id" TEXT NOT NULL,
          "stt" INTEGER NOT NULL DEFAULT 0,
          "contractNumber" TEXT NOT NULL,
          "agentCode" TEXT NOT NULL,
          "agentName" TEXT NOT NULL,
          "position" TEXT NOT NULL DEFAULT '',
          "ban" TEXT NOT NULL DEFAULT '',
          "maTruongBan" TEXT NOT NULL DEFAULT '',
          "nhom" TEXT NOT NULL DEFAULT '',
          "maBanNhom" TEXT NOT NULL DEFAULT '',
          "maTruongBanNhom" TEXT NOT NULL DEFAULT '',
          "maDL" TEXT NOT NULL DEFAULT '',
          "maNhom" TEXT NOT NULL DEFAULT '',
          "leaderAgentCode" TEXT NOT NULL DEFAULT '',
          "ngayBatDauLamViec" TIMESTAMP(3),
          "effectiveDate" TIMESTAMP(3),
          "issueDate" TIMESTAMP(3),
          "pdt10DT" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "fyp" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "nguonDuLieu" TEXT NOT NULL DEFAULT '',
          "hopDongToChuc" TEXT NOT NULL DEFAULT '',
          "dkDongPhi" TEXT NOT NULL DEFAULT '',
          "phiDongThem" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "afypChuaTru10DT" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "afyp" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "ad" TEXT NOT NULL DEFAULT '',
          "nhom2" TEXT NOT NULL DEFAULT '',
          "ngayBatDauLamViec2" TIMESTAMP(3),
          "thangTD" INTEGER NOT NULL DEFAULT 0,
          "namTD" INTEGER NOT NULL DEFAULT 0,
          "thangHL" INTEGER NOT NULL DEFAULT 0,
          "tinhLuot" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "tinhLuot3tr" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "maDaiLyTD" TEXT NOT NULL DEFAULT '',
          "danhDauTVV" TEXT NOT NULL DEFAULT '',
          "chucVu2" TEXT NOT NULL DEFAULT '',
          "recruiterCode" TEXT NOT NULL DEFAULT '',
          "startDate" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
        )`
      },
      {
        name: 'Contest',
        sql: `CREATE TABLE IF NOT EXISTS "Contest" (
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
          "secondaryTotalAFYPMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "secondaryTotalIPMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "hideNotAchieved" BOOLEAN NOT NULL DEFAULT false,
          "includeIndividualNTD" BOOLEAN NOT NULL DEFAULT false,
          "includeIndividualTN" BOOLEAN NOT NULL DEFAULT false,
          "luotHDThreshold" DOUBLE PRECISION NOT NULL DEFAULT 3000000,
          "luotHDCTThreshold" DOUBLE PRECISION NOT NULL DEFAULT 12000000,
          "tvv90MaxMonths" DOUBLE PRECISION NOT NULL DEFAULT 3,
          "tvv90MinIP" DOUBLE PRECISION NOT NULL DEFAULT 12000000,
          "referenceContestId" TEXT NOT NULL DEFAULT '',
          "includeTNInPassCount" BOOLEAN NOT NULL DEFAULT false,
          "topN" INTEGER NOT NULL DEFAULT 3,
          "topNMinIP" DOUBLE PRECISION NOT NULL DEFAULT 50000000,
          "topNValueType" TEXT NOT NULL DEFAULT 'ip',
          "filterByEffectiveDate" BOOLEAN NOT NULL DEFAULT false,
          "csvContractUrl" TEXT NOT NULL DEFAULT '',
          "csvStaffUrl" TEXT NOT NULL DEFAULT '',
          "csvRecruiterUrl" TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
        )`
      },
      {
        name: 'MonthlyRevenue',
        sql: `CREATE TABLE IF NOT EXISTS "MonthlyRevenue" (
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
        )`
      },
      {
        name: 'SaoVietData',
        sql: `CREATE TABLE IF NOT EXISTS "SaoVietData" (
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
        )`
      },
      {
        name: 'ClbMember',
        sql: `CREATE TABLE IF NOT EXISTS "ClbMember" (
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
        )`
      },
      {
        name: 'PendingMember',
        sql: `CREATE TABLE IF NOT EXISTS "PendingMember" (
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
        )`
      },
      {
        name: 'PosterImage',
        sql: `CREATE TABLE IF NOT EXISTS "PosterImage" (
          "key" TEXT NOT NULL,
          "data" BYTEA,
          "contentType" TEXT NOT NULL DEFAULT 'image/jpeg',
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "PosterImage_pkey" PRIMARY KEY ("key")
        )`
      },
    ];

    // Create tables
    for (const { name, sql } of createTableSQLs) {
      try {
        await db.$executeRawUnsafe(sql);
        results.push(`OK: Created table ${name}`);
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.includes('already exists')) {
          results.push(`SKIP: Table ${name} already exists`);
        } else {
          results.push(`ERROR: Failed to create ${name}: ${msg.substring(0, 100)}`);
        }
      }
    }

    // Create unique indexes
    const indexSQLs = [
      `CREATE UNIQUE INDEX IF NOT EXISTS "Phong_maPhong_key" ON "Phong"("maPhong")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "AD_maAD_key" ON "AD"("maAD")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "BanNhom_maBanNhom_key" ON "BanNhom"("maBanNhom")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "TVVStruct_agentCode_key" ON "TVVStruct"("agentCode")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Staff_agentCode_key" ON "Staff"("agentCode")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Recruiter_agentCode_key" ON "Recruiter"("agentCode")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "TuyenNgang_agentCode_key" ON "TuyenNgang"("agentCode")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "LeaderInfo_agentCode_key" ON "LeaderInfo"("agentCode")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Contract_contractNumber_key" ON "Contract"("contractNumber")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Setting_key_key" ON "Setting"("key")`,
      `CREATE INDEX IF NOT EXISTS "SaoVietData_program_idx" ON "SaoVietData"("program")`,
    ];
    for (const sql of indexSQLs) {
      try {
        await db.$executeRawUnsafe(sql);
      } catch (err: any) {
        // Ignore index errors (index might already exist or table missing)
      }
    }
    results.push('OK: Created indexes');

    return NextResponse.json({
      success: true,
      message: `Created ${createTableSQLs.length} tables + indexes`,
      results,
    });

  } catch (error: any) {
    console.error('[create-tables] Fatal:', error);
    return NextResponse.json({
      error: 'Failed to create tables',
      details: error?.message || String(error),
      results,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to create all tables in current DB',
    usage: 'curl -X POST https://nc-link.vercel.app/api/admin/create-tables',
  });
}
