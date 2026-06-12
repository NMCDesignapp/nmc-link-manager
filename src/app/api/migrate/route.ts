import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/migrate - Run structure table creation
export async function POST() {
  try {
    // Check if Phong table exists by trying to count
    try {
      await db.phong.count();
      return NextResponse.json({ message: 'Tables already exist', status: 'ok' });
    } catch {
      // Tables don't exist yet, need to create them
    }

    // Use raw SQL to create tables
    const sqls = [
      `CREATE TABLE IF NOT EXISTS "Phong" (
        "id" TEXT NOT NULL,
        "maPhong" TEXT NOT NULL,
        "tenPhong" TEXT NOT NULL,
        "note" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Phong_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Phong_maPhong_key" ON "Phong"("maPhong")`,

      `CREATE TABLE IF NOT EXISTS "AD" (
        "id" TEXT NOT NULL,
        "maAD" TEXT NOT NULL,
        "tenAD" TEXT NOT NULL,
        "maPhong" TEXT NOT NULL DEFAULT '',
        "note" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "AD_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "AD_maAD_key" ON "AD"("maAD")`,

      `CREATE TABLE IF NOT EXISTS "BanNhom" (
        "id" TEXT NOT NULL,
        "maBanNhom" TEXT NOT NULL,
        "tenBanNhom" TEXT NOT NULL,
        "maAD" TEXT NOT NULL DEFAULT '',
        "note" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "BanNhom_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "BanNhom_maBanNhom_key" ON "BanNhom"("maBanNhom")`,

      `CREATE TABLE IF NOT EXISTS "TVVStruct" (
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
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "TVVStruct_agentCode_key" ON "TVVStruct"("agentCode")`,
    ];

    for (const sql of sqls) {
      await db.$executeRawUnsafe(sql);
    }

    return NextResponse.json({ message: 'Structure tables created successfully', status: 'created' });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed: ' + String(error) },
      { status: 500 }
    );
  }
}

// PATCH /api/migrate - Add missing columns to existing tables
export async function PATCH() {
  try {
    const results: string[] = [];

    // Add secondaryTotalAFYPMin and secondaryTotalIPMin to Contest if missing
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "secondaryTotalAFYPMin" DOUBLE PRECISION NOT NULL DEFAULT 0`);
      results.push('Added secondaryTotalAFYPMin to Contest');
    } catch (e: any) {
      if (e?.message?.includes('already exists')) results.push('secondaryTotalAFYPMin already exists');
      else results.push('Error adding secondaryTotalAFYPMin: ' + String(e));
    }
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "secondaryTotalIPMin" DOUBLE PRECISION NOT NULL DEFAULT 0`);
      results.push('Added secondaryTotalIPMin to Contest');
    } catch (e: any) {
      if (e?.message?.includes('already exists')) results.push('secondaryTotalIPMin already exists');
      else results.push('Error adding secondaryTotalIPMin: ' + String(e));
    }
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "referenceContestId" TEXT NOT NULL DEFAULT ''`);
      results.push('Added referenceContestId to Contest');
    } catch (e: any) {
      if (e?.message?.includes('already exists')) results.push('referenceContestId already exists');
      else results.push('Error adding referenceContestId: ' + String(e));
    }

    return NextResponse.json({ message: 'Column migration completed', results });
  } catch (error) {
    console.error('Column migration error:', error);
    return NextResponse.json(
      { error: 'Column migration failed: ' + String(error) },
      { status: 500 }
    );
  }
}
