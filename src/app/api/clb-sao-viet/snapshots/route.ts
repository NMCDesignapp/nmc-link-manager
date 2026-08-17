import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

async function ensureSnapshotTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ClbAssessmentSnapshot" (
      "id" TEXT PRIMARY KEY,
      "assessmentYear" INTEGER NOT NULL,
      "assessmentMonth" INTEGER NOT NULL,
      "assessmentLabel" TEXT NOT NULL,
      "payload" JSONB NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE ("assessmentYear", "assessmentMonth")
    )
  `);
}

function validateAssessment(year: number, month: number): string | null {
  if (!Number.isInteger(year) || year < 2020 || year > 2100) return 'Năm xét không hợp lệ';
  if (!Number.isInteger(month) || month < 1 || month > 12) return 'Đợt xét không hợp lệ';
  return null;
}

export async function GET(request: NextRequest) {
  try {
    await ensureSnapshotTable();
    const { searchParams } = new URL(request.url);
    const yearRaw = searchParams.get('year');
    const monthRaw = searchParams.get('month');

    if (yearRaw !== null || monthRaw !== null) {
      const year = Number(yearRaw);
      const month = Number(monthRaw);
      const invalid = validateAssessment(year, month);
      if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

      const rows = await db.$queryRawUnsafe<Array<{
        id: string;
        assessmentYear: number;
        assessmentMonth: number;
        assessmentLabel: string;
        payload: any;
        createdAt: Date;
        updatedAt: Date;
      }>>(
        `SELECT "id", "assessmentYear", "assessmentMonth", "assessmentLabel", "payload", "createdAt", "updatedAt"
         FROM "ClbAssessmentSnapshot"
         WHERE "assessmentYear" = $1 AND "assessmentMonth" = $2
         LIMIT 1`,
        year,
        month,
      );
      if (!rows.length) return NextResponse.json({ error: 'Chưa có bản lưu cho đợt xét này' }, { status: 404 });
      return NextResponse.json(rows[0], { headers: { 'Cache-Control': 'no-store' } });
    }

    const rows = await db.$queryRawUnsafe<Array<{
      id: string;
      assessmentYear: number;
      assessmentMonth: number;
      assessmentLabel: string;
      createdAt: Date;
      updatedAt: Date;
    }>>(
      `SELECT "id", "assessmentYear", "assessmentMonth", "assessmentLabel", "createdAt", "updatedAt"
       FROM "ClbAssessmentSnapshot"
       ORDER BY "assessmentYear" DESC, "assessmentMonth" DESC`,
    );
    return NextResponse.json(rows, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('GET /api/clb-sao-viet/snapshots error:', error);
    return NextResponse.json({ error: 'Không thể đọc lịch sử đợt xét' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSnapshotTable();
    const body = await request.json();
    const year = Number(body?.year);
    const month = Number(body?.month);
    const invalid = validateAssessment(year, month);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
    if (!body?.payload || !Array.isArray(body.payload?.rows) || !body.payload?.calculations) {
      return NextResponse.json({ error: 'Dữ liệu tổng hợp không hợp lệ' }, { status: 400 });
    }

    const payloadText = JSON.stringify(body.payload);
    if (payloadText.length > 8_000_000) {
      return NextResponse.json({ error: 'Bản lưu quá lớn' }, { status: 413 });
    }

    const id = `clb-${year}-${String(month).padStart(2, '0')}`;
    const label = `1/${month}/${year}`;
    await db.$executeRawUnsafe(
      `INSERT INTO "ClbAssessmentSnapshot"
        ("id", "assessmentYear", "assessmentMonth", "assessmentLabel", "payload", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5::jsonb, NOW(), NOW())
       ON CONFLICT ("assessmentYear", "assessmentMonth")
       DO UPDATE SET "assessmentLabel" = EXCLUDED."assessmentLabel", "payload" = EXCLUDED."payload", "updatedAt" = NOW()`,
      id,
      year,
      month,
      label,
      payloadText,
    );

    return NextResponse.json({ success: true, id, assessmentYear: year, assessmentMonth: month, assessmentLabel: label });
  } catch (error) {
    console.error('POST /api/clb-sao-viet/snapshots error:', error);
    return NextResponse.json({ error: 'Không thể lưu đợt xét' }, { status: 500 });
  }
}
