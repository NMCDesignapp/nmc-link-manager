import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Self-healing migration helper:
// Vercel chỉ chạy `prisma generate` (postinstall), KHÔNG tự chạy `prisma migrate deploy`.
// Khi schema.prisma có column mới nhưng production DB chưa được migrate,
// `findMany`/`create` sẽ fail với lỗi "column does not exist".
// Helper này chạy ALTER TABLE IF NOT EXISTS để đảm bảo schema đồng bộ.
async function ensureTopNColumns(): Promise<void> {
  try {
    await db.$executeRawUnsafe('ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "topN" INTEGER NOT NULL DEFAULT 3');
    await db.$executeRawUnsafe('ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "topNMinIP" DOUBLE PRECISION NOT NULL DEFAULT 50000000');
  } catch (e) {
    // Bỏ qua — có thể DB đã có cột rồi, hoặc DB không phải Postgres (local SQLite)
    console.warn('[ensureTopNColumns] Skipped:', (e as Error)?.message);
  }
}

// Self-heal cho filterByEffectiveDate (boolean column mới)
async function ensureFilterByEffectiveDateColumn(): Promise<void> {
  try {
    await db.$executeRawUnsafe('ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "filterByEffectiveDate" BOOLEAN NOT NULL DEFAULT false');
  } catch (e) {
    console.warn('[ensureFilterByEffectiveDateColumn] Skipped:', (e as Error)?.message);
  }
}

// Self-heal cho topNValueType (text column mới — 'ip' | 'afyp')
async function ensureTopNValueTypeColumn(): Promise<void> {
  try {
    await db.$executeRawUnsafe('ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "topNValueType" TEXT NOT NULL DEFAULT \'ip\'');
  } catch (e) {
    console.warn('[ensureTopNValueTypeColumn] Skipped:', (e as Error)?.message);
  }
}

// GET /api/contests - List all saved contests
export async function GET() {
  try {
    const contests = await db.contest.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(contests);
  } catch (error) {
    // Có thể do thiếu column topN/topNMinIP/filterByEffectiveDate (DB chưa migrate) — thử self-heal rồi retry 1 lần
    console.warn('[GET /api/contests] First attempt failed, trying self-heal migration:', (error as Error)?.message);
    await Promise.all([ensureTopNColumns(), ensureFilterByEffectiveDateColumn(), ensureTopNValueTypeColumn()]);
    try {
      const contests = await db.contest.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(contests);
    } catch (retryError) {
      console.error('Error fetching contests after self-heal:', retryError);
      return NextResponse.json({ error: 'Không thể tải danh sách chương trình thi đua', details: (retryError as Error)?.message }, { status: 500 });
    }
  }
}

// POST /api/contests - Save a new contest
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const bodySize = JSON.stringify(body).length;
    console.log('[POST /api/contests] Start', {
      title: body.title,
      bodySize,
      hasParticipants: !!body.participants,
      participantsLength: body.participants?.length || 0,
    });

    const {
      title, startDate, endDate, issueDate, conditionType, targetType,
      bonusTiers, posterUrl, participants,
      usePhase2, phase2StartDate, phase2EndDate, bonusTiers2,
      useSecondaryCondition, secondaryAFYPMin, secondaryIPMin,
      secondaryLuotHDMin, secondaryLuotHDCMin,
      secondaryLuotHDFilter, secondaryLuotHDCFilter,
      secondaryTotalAFYPMin, secondaryTotalIPMin,
      hideNotAchieved, includeIndividualNTD, includeIndividualTN,
      luotHDThreshold, luotHDCTThreshold, tvv90MaxMonths, tvv90MinIP,
      referenceContestId, includeTNInPassCount,
      topN, topNMinIP, topNValueType, filterByEffectiveDate,
    } = body as {
      title: string;
      startDate: string;
      endDate: string;
      issueDate?: string;
      conditionType: string;
      targetType: string;
      bonusTiers: string;
      posterUrl?: string;
      participants?: string;
      usePhase2?: boolean;
      phase2StartDate?: string;
      phase2EndDate?: string;
      bonusTiers2?: string;
      useSecondaryCondition?: boolean;
      secondaryAFYPMin?: number;
      secondaryIPMin?: number;
      secondaryLuotHDMin?: number;
      secondaryLuotHDCMin?: number;
      secondaryLuotHDFilter?: string;
      secondaryLuotHDCFilter?: string;
      secondaryTotalAFYPMin?: number;
      secondaryTotalIPMin?: number;
      hideNotAchieved?: boolean;
      includeIndividualNTD?: boolean;
      includeIndividualTN?: boolean;
      luotHDThreshold?: number;
      luotHDCTThreshold?: number;
      tvv90MaxMonths?: number;
      tvv90MinIP?: number;
      referenceContestId?: string;
      includeTNInPassCount?: boolean;
      topN?: number;
      topNMinIP?: number;
      topNValueType?: string;
      filterByEffectiveDate?: boolean;
    };

    if (!title || !startDate || !endDate) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    // Đảm bảo DB có các cột mới trước khi query/create (self-heal)
    await Promise.all([ensureTopNColumns(), ensureFilterByEffectiveDateColumn(), ensureTopNValueTypeColumn()]);

    // Validate dates - Prisma will throw if invalid, but we want a clearer message
    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);
    if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
      return NextResponse.json({ error: 'Ngày bắt đầu/kết thúc không hợp lệ', details: `startDate=${startDate}, endDate=${endDate}` }, { status: 400 });
    }

    // Check if contest with same title exists, update it
    console.log('[POST /api/contests] Checking existing contest with title:', title);
    const existing = await db.contest.findFirst({ where: { title } });
    console.log('[POST /api/contests] Existing contest found:', !!existing, `(${Date.now() - startTime}ms)`);

    const data = {
      title,
      startDate: parsedStart,
      endDate: parsedEnd,
      issueDate: issueDate ? new Date(issueDate) : null,
      conditionType,
      targetType: targetType || 'tvv',
      bonusTiers,
      posterUrl: posterUrl || '',
      participants: participants || '[]',
      usePhase2: usePhase2 ?? false,
      phase2StartDate: phase2StartDate ? new Date(phase2StartDate) : null,
      phase2EndDate: phase2EndDate ? new Date(phase2EndDate) : null,
      bonusTiers2: bonusTiers2 || '[]',
      useSecondaryCondition: useSecondaryCondition ?? false,
      secondaryAFYPMin: secondaryAFYPMin ?? 0,
      secondaryIPMin: secondaryIPMin ?? 0,
      secondaryLuotHDMin: secondaryLuotHDMin ?? 0,
      secondaryLuotHDCMin: secondaryLuotHDCMin ?? 0,
      secondaryLuotHDFilter: secondaryLuotHDFilter || 'all',
      secondaryLuotHDCFilter: secondaryLuotHDCFilter || 'all',
      secondaryTotalAFYPMin: secondaryTotalAFYPMin ?? 0,
      secondaryTotalIPMin: secondaryTotalIPMin ?? 0,
      hideNotAchieved: hideNotAchieved ?? false,
      includeIndividualNTD: includeIndividualNTD ?? false,
      includeIndividualTN: includeIndividualTN ?? false,
      luotHDThreshold: luotHDThreshold ?? 3_000_000,
      luotHDCTThreshold: luotHDCTThreshold ?? 12_000_000,
      tvv90MaxMonths: tvv90MaxMonths ?? 3,
      tvv90MinIP: tvv90MinIP ?? 12_000_000,
      referenceContestId: referenceContestId || '',
      includeTNInPassCount: includeTNInPassCount ?? false,
      topN: topN ?? 3,
      topNMinIP: topNMinIP ?? 50_000_000,
      topNValueType: topNValueType === 'afyp' ? 'afyp' : 'ip',
      filterByEffectiveDate: filterByEffectiveDate ?? false,
    };

    if (existing) {
      const updated = await db.contest.update({
        where: { id: existing.id },
        data,
      });
      console.log('[POST /api/contests] Updated contest', existing.id, `(${Date.now() - startTime}ms total)`);
      return NextResponse.json({ message: 'Đã cập nhật chương trình thi đua', contest: updated });
    }

    const contest = await db.contest.create({ data });
    console.log('[POST /api/contests] Created contest', contest.id, `(${Date.now() - startTime}ms total)`);

    return NextResponse.json({ message: 'Đã lưu chương trình thi đua', contest });
  } catch (error: any) {
    console.error('[POST /api/contests] Error after', Date.now() - startTime, 'ms:', error);
    // Trả về chi tiết lỗi Prisma để client hiển thị được lỗi cụ thể
    // (giúp diagnose: thiếu column, NULL constraint, connection, v.v.)
    const details = error?.message || String(error);
    const errorCode = error?.code || undefined;
    return NextResponse.json(
      { error: 'Không thể lưu chương trình thi đua', details, code: errorCode },
      { status: 500 }
    );
  }
}

// DELETE /api/contests?id=xxx - Delete a contest
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID chương trình thi đua' }, { status: 400 });
    }

    await db.contest.delete({ where: { id } });
    return NextResponse.json({ message: 'Đã xóa chương trình thi đua' });
  } catch (error) {
    console.error('Error deleting contest:', error);
    return NextResponse.json({ error: 'Không thể xóa chương trình thi đua' }, { status: 500 });
  }
}

// PATCH /api/contests - Update specific fields by id
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body as { id: string; [key: string]: any };

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID chương trình thi đua' }, { status: 400 });
    }

    const contest = await db.contest.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ message: 'Đã cập nhật chương trình thi đua', contest });
  } catch (error: any) {
    console.error('Error updating contest:', error);
    return NextResponse.json({ error: 'Không thể cập nhật chương trình thi đua', details: error?.message }, { status: 500 });
  }
}
