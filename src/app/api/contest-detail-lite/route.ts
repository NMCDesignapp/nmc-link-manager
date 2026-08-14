import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Trả cấu hình đầy đủ của một chương trình nhưng không đưa poster base64 lớn
 * vào JSON. Poster được phục vụ riêng qua endpoint có cache CDN/browser.
 */
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')?.trim();
    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID chương trình thi đua' }, { status: 400 });
    }

    const contest = await db.contest.findUnique({ where: { id } });
    if (!contest) {
      return NextResponse.json({ error: 'Không tìm thấy chương trình thi đua' }, { status: 404 });
    }

    const version = contest.updatedAt instanceof Date
      ? contest.updatedAt.getTime()
      : new Date(contest.updatedAt).getTime();

    return NextResponse.json(
      {
        ...contest,
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
