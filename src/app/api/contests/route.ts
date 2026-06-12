import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/contests - List all saved contests
export async function GET() {
  try {
    const contests = await db.contest.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(contests);
  } catch (error) {
    console.error('Error fetching contests:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách chương trình thi đua' }, { status: 500 });
  }
}

// POST /api/contests - Save a new contest
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
    };

    if (!title || !startDate || !endDate) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    // Check if contest with same title exists, update it
    const existing = await db.contest.findFirst({ where: { title } });

    const data = {
      title,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
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
    };

    if (existing) {
      const updated = await db.contest.update({
        where: { id: existing.id },
        data,
      });
      return NextResponse.json({ message: 'Đã cập nhật chương trình thi đua', contest: updated });
    }

    const contest = await db.contest.create({ data });

    return NextResponse.json({ message: 'Đã lưu chương trình thi đua', contest });
  } catch (error: any) {
    console.error('Error saving contest:', error);
    const details = error?.message || String(error);
    return NextResponse.json({ error: 'Không thể lưu chương trình thi đua', details }, { status: 500 });
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
