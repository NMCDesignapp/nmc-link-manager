import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Lightweight read-only feed for the KPI contest notice carousel.
// Keep this intentionally small: the KPI does not need participants, reward tiers,
// contract data, or contest calculations just to render the notice panel.
export async function GET() {
  try {
    const contests = await db.contest.findMany({
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        targetType: true,
        conditionType: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const items = contests.map((contest) => ({
      id: contest.id,
      title: contest.title,
      startDate: contest.startDate,
      endDate: contest.endDate,
      targetType: contest.targetType,
      conditionType: contest.conditionType,
      // This endpoint is resilient to stored, external and generated legacy posters.
      // The poster route itself has immutable browser/CDN caching after first load.
      posterUrl: `/api/contest-poster/${encodeURIComponent(contest.id)}?v=${new Date(contest.updatedAt).getTime()}`,
    }));

    return NextResponse.json(items, {
      headers: {
        // Contest setup changes infrequently; a short CDN cache keeps this feed cheap
        // without making a newly saved contest feel stale for long.
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    console.error('[GET /api/contest-notices] Error:', error?.message || error);
    return NextResponse.json(
      { error: 'Không thể tải thông báo thi đua' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
