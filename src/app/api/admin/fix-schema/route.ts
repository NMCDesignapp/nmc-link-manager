import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// POST /api/admin/fix-schema
// One-time admin endpoint to apply missing schema changes directly via raw SQL.
// Use case: prisma migrate deploy fails on Vercel because _prisma_migrations table
// is out of sync with the actual DB state. This endpoint bypasses migrations and
// applies the SQL directly (idempotent — safe to call multiple times).
//
// What it does:
// 1. Create TuyenNgang table if not exists (fixes "table public.TuyenNgang does not exist")
// 2. Add maTVVTuyendung column to TVVStruct if not exists (fixes NTD column empty in CS TVVm)
// 3. Mark both migrations as applied in _prisma_migrations (so future prisma migrate deploy works)
export async function POST() {
  const results: string[] = [];

  try {
    // 1. Create TuyenNgang table if not exists
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "TuyenNgang" (
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
      )
    `;
    results.push('OK: TuyenNgang table ensured');

    // 2. Create unique index on agentCode if not exists
    await db.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "TuyenNgang_agentCode_key" ON "TuyenNgang"("agentCode")
    `;
    results.push('OK: TuyenNgang_agentCode_key index ensured');

    // 3. Add maTVVTuyendung column to TVVStruct if not exists
    await db.$executeRaw`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'TVVStruct' AND column_name = 'maTVVTuyendung'
        ) THEN
          ALTER TABLE "TVVStruct" ADD COLUMN "maTVVTuyendung" TEXT NOT NULL DEFAULT '';
        END IF;
      END $$;
    `;
    results.push('OK: TVVStruct.maTVVTuyendung column ensured');

    // 4. Mark migrations as applied in _prisma_migrations (best-effort, ignore errors)
    try {
      await db.$executeRaw`
        INSERT INTO "_prisma_migrations" (id, checksum, migration_name, logs, started_at, finished_at, applied_steps_count)
        SELECT
          gen_random_uuid()::text,
          'manual-fix-' || extract(epoch from now())::text,
          '20260617040000_add_tvv_maTVVTuyendung',
          NULL,
          NOW(),
          NOW(),
          1
        WHERE NOT EXISTS (
          SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20260617040000_add_tvv_maTVVTuyendung'
        )
      `;
      results.push('OK: migration 20260617040000 marked applied');
    } catch (e: any) {
      results.push(`SKIP: mark migration 20260617040000 failed (${e?.message?.substring(0, 80) || 'unknown'}) — not critical`);
    }
    try {
      await db.$executeRaw`
        INSERT INTO "_prisma_migrations" (id, checksum, migration_name, logs, started_at, finished_at, applied_steps_count)
        SELECT
          gen_random_uuid()::text,
          'manual-fix-' || extract(epoch from now())::text,
          '20260620030000_add_tuyen_ngang',
          NULL,
          NOW(),
          NOW(),
          1
        WHERE NOT EXISTS (
          SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20260620030000_add_tuyen_ngang'
        )
      `;
      results.push('OK: migration 20260620030000 marked applied');
    } catch (e: any) {
      results.push(`SKIP: mark migration 20260620030000 failed (${e?.message?.substring(0, 80) || 'unknown'}) — not critical`);
    }

    // 5. Verify TuyenNgang table exists
    const verify = await db.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'TuyenNgang'
      ) as exists
    `;
    const tableExists = verify[0]?.exists === true;
    results.push(tableExists ? 'VERIFY: TuyenNgang table exists' : 'VERIFY FAILED: TuyenNgang table still missing');

    // 6. Verify maTVVTuyendung column exists
    const verifyCol = await db.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'TVVStruct' AND column_name = 'maTVVTuyendung'
      ) as exists
    `;
    const colExists = verifyCol[0]?.exists === true;
    results.push(colExists ? 'VERIFY: maTVVTuyendung column exists' : 'VERIFY FAILED: maTVVTuyendung column still missing');

    // Tình trạng hợp đồng — nguồn dữ liệu thô từ Tamthu.xlsx, giữ nguyên giá trị file.
    await db.$executeRaw`
      ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "contractStatus" TEXT NOT NULL DEFAULT ''
    `;
    results.push('OK: Contract.contractStatus column ensured');

    // Sheet2 của Tamthu.xlsx chỉ phục vụ bảng xem chi tiết, tách khỏi Contract/KPI.
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "TamthuDetail" (
        "id" TEXT NOT NULL,
        "rowNo" INTEGER NOT NULL DEFAULT 0,
        "nhom" TEXT NOT NULL DEFAULT '',
        "maNhom" TEXT NOT NULL DEFAULT '',
        "agentCode" TEXT NOT NULL DEFAULT '',
        "agentName" TEXT NOT NULL DEFAULT '',
        "effectiveDate" TEXT NOT NULL DEFAULT '',
        "issueDate" TEXT NOT NULL DEFAULT '',
        "pdt" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "afyp" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "contractStatus" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "TamthuDetail_pkey" PRIMARY KEY ("id")
      )
    `;
    await db.$executeRaw`CREATE INDEX IF NOT EXISTS "TamthuDetail_nhom_idx" ON "TamthuDetail"("nhom")`;
    await db.$executeRaw`CREATE INDEX IF NOT EXISTS "TamthuDetail_agentCode_idx" ON "TamthuDetail"("agentCode")`;
    results.push('OK: TamthuDetail (Sheet2 read-only) table ensured');

    // 7. Create SaoVietData table if not exists (for per-program sync/upload)
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "SaoVietData" (
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
      )
    `;
    results.push('OK: SaoVietData table ensured');

    // 8. Create index on program
    await db.$executeRaw`
      CREATE INDEX IF NOT EXISTS "SaoVietData_program_idx" ON "SaoVietData"("program")
    `;
    results.push('OK: SaoVietData_program_idx index ensured');

    // 9. Mark migration 20260628030000 as applied
    try {
      await db.$executeRaw`
        INSERT INTO "_prisma_migrations" (id, checksum, migration_name, logs, started_at, finished_at, applied_steps_count)
        SELECT
          gen_random_uuid()::text,
          'manual-fix-' || extract(epoch from now())::text,
          '20260628030000_add_saoviet_data',
          NULL,
          NOW(),
          NOW(),
          1
        WHERE NOT EXISTS (
          SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20260628030000_add_saoviet_data'
        )
      `;
      results.push('OK: migration 20260628030000 marked applied');
    } catch (e: any) {
      results.push(`SKIP: mark migration 20260628030000 failed (${e?.message?.substring(0, 80) || 'unknown'}) — not critical`);
    }

    // 10. Verify SaoVietData table exists
    const verifySV = await db.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'SaoVietData'
      ) as exists
    `;
    const svExists = verifySV[0]?.exists === true;
    results.push(svExists ? 'VERIFY: SaoVietData table exists' : 'VERIFY FAILED: SaoVietData table still missing');

    // 11. Create ClbMember table if not exists (DS Thành viên CLB — đồng bộ đa thiết bị)
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "ClbMember" (
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
      )
    `;
    results.push('OK: ClbMember table ensured');

    // 12. Create PendingMember table if not exists (DS Chờ xét gia nhập)
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "PendingMember" (
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
      )
    `;
    results.push('OK: PendingMember table ensured');

    // 13. Mark migration 20260630030000 as applied
    try {
      await db.$executeRaw`
        INSERT INTO "_prisma_migrations" (id, checksum, migration_name, logs, started_at, finished_at, applied_steps_count)
        SELECT
          gen_random_uuid()::text,
          'manual-fix-' || extract(epoch from now())::text,
          '20260630030000_add_clb_pending_members',
          NULL,
          NOW(),
          NOW(),
          1
        WHERE NOT EXISTS (
          SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20260630030000_add_clb_pending_members'
        )
      `;
      results.push('OK: migration 20260630030000 marked applied');
    } catch (e: any) {
      results.push(`SKIP: mark migration 20260630030000 failed (${e?.message?.substring(0, 80) || 'unknown'}) — not critical`);
    }

    // 14. Verify ClbMember + PendingMember tables exist
    const verifyClb = await db.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'ClbMember'
      ) as exists
    `;
    const clbExists = verifyClb[0]?.exists === true;
    results.push(clbExists ? 'VERIFY: ClbMember table exists' : 'VERIFY FAILED: ClbMember table still missing');

    const verifyPen = await db.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'PendingMember'
      ) as exists
    `;
    const penExists = verifyPen[0]?.exists === true;
    results.push(penExists ? 'VERIFY: PendingMember table exists' : 'VERIFY FAILED: PendingMember table still missing');

    return NextResponse.json({
      success: tableExists && colExists && svExists && clbExists && penExists,
      message: tableExists && colExists && svExists && clbExists && penExists
        ? 'Schema fixed. You can now upload DS TTN Tuyển Ngang, sync Sao Việt data per program. NTD column in CS TVVm will populate. CLB & Pending members sync across devices.'
        : 'Schema fix completed but verification failed. Check server logs.',
      steps: results,
    });
  } catch (error: any) {
    console.error('fix-schema error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || String(error),
      steps: results,
    }, { status: 500 });
  }
}

// GET — same as POST for easy browser testing
export async function GET() {
  return POST();
}
