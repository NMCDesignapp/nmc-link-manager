import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const recruitedAgentScopeKey = (id: string) => `contest-recruited-agent-scope-${id}`;

const contestDetailSelect = {
  id: true, title: true, startDate: true, endDate: true, issueDate: true,
  conditionType: true, targetType: true, bonusTiers: true, participants: true,
  usePhase2: true, phase2StartDate: true, phase2EndDate: true, bonusTiers2: true,
  useSecondaryCondition: true, secondaryAFYPMin: true, secondaryIPMin: true,
  secondaryLuotHDMin: true, secondaryLuotHDCMin: true, secondaryLuotHDFilter: true,
  secondaryLuotHDCFilter: true, secondaryTotalAFYPMin: true, secondaryTotalIPMin: true,
  hideNotAchieved: true, includeIndividualNTD: true, includeIndividualTN: true,
  luotHDThreshold: true, luotHDCTThreshold: true, tvv90MaxMonths: true,
  tvv90MinIP: true, referenceContestId: true, includeTNInPassCount: true,
  topN: true, topNMinIP: true, topNValueType: true,
  useTopRanking: true, topRewardAmounts: true,
  filterByEffectiveDate: true,
  csvContractUrl: true, csvStaffUrl: true, csvRecruiterUrl: true,
  createdAt: true, updatedAt: true,
} as const;

/**
 * Trả cấu hình đầy đủ của một chương trình nhưng không đưa poster base64 lớn
 * vào JSON. recruitedAgentScope được lưu tương thích trong Setting vì DB production
 * hiện chưa có cột tương ứng trên Contest.
 */
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')?.trim();
    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID chương trình thi đua' }, { status: 400 });
    }

    const contest = await db.contest.findUnique({ where: { id }, select: contestDetailSelect });
    if (!contest) {
      return NextResponse.json({ error: 'Không tìm thấy chương trình thi đua' }, { status: 404 });
    }

    let recruitedAgentScope = 'all';
    try {
      const setting = await db.setting.findUnique({
        where: { key: recruitedAgentScopeKey(id) },
        select: { value: true },
      });
      if (setting?.value === 'tvvm') recruitedAgentScope = 'tvvm';
    } catch (error) {
      console.warn('[contest-detail-lite] recruitedAgentScope fallback read failed:', (error as Error)?.message);
    }

    const version = contest.updatedAt instanceof Date
      ? contest.updatedAt.getTime()
      : new Date(contest.updatedAt).getTime();

    return NextResponse.json(
      {
        ...contest,
        recruitedAgentScope,
        posterUrl: `/api/contest-poster/${encodeURIComponent(contest.id)}?v=${Number.isFinite(version) ? version : 0}`,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } },
    );
  } catch (error: any) {
    console.error('[contest-detail-lite] GET failed:', error?.message || error);
    return NextResponse.json(
      { error: 'Không thể tải chương trình thi đua', details: error?.message || String(error) },
      { status: 500 },
    );
  }
}
