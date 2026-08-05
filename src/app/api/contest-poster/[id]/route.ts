import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createDefaultContestPoster } from '@/lib/contest-poster';

export const dynamic = 'force-dynamic';

function decodeDataUrl(dataUrl: string): { contentType: string; data: Buffer } | null {
  const match = dataUrl.match(/^data:([^;,]+)(?:;charset=[^;,]+)?(;base64)?,([\s\S]*)$/i);
  if (!match) return null;

  const contentType = match[1] || 'image/jpeg';
  try {
    const data = match[2]
      ? Buffer.from(match[3], 'base64')
      : Buffer.from(decodeURIComponent(match[3]), 'utf8');
    return data.length ? { contentType, data } : null;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = decodeURIComponent(rawId || '').trim();
    if (!id) return NextResponse.json({ error: 'Thiếu ID' }, { status: 400 });

    const contest = await db.contest.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        targetType: true,
        posterUrl: true,
        updatedAt: true,
      },
    });
    if (!contest) return NextResponse.json({ error: 'Không tìm thấy poster' }, { status: 404 });

    const posterUrl = contest.posterUrl || createDefaultContestPoster(contest);

    if (posterUrl.startsWith('/')) {
      return NextResponse.redirect(new URL(posterUrl, request.url), 307);
    }
    if (/^https?:\/\//i.test(posterUrl)) {
      return NextResponse.redirect(posterUrl, 307);
    }

    const decoded = decodeDataUrl(posterUrl);
    if (!decoded) return NextResponse.json({ error: 'Poster không hợp lệ' }, { status: 404 });

    const updatedAt = contest.updatedAt instanceof Date
      ? contest.updatedAt
      : new Date(contest.updatedAt);
    const etag = `"contest-${contest.id}-${updatedAt.getTime()}-${decoded.data.length}"`;

    if (request.headers.get('if-none-match') === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    return new NextResponse(decoded.data, {
      status: 200,
      headers: {
        'Content-Type': decoded.contentType,
        'Content-Length': String(decoded.data.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        ETag: etag,
        'Last-Modified': updatedAt.toUTCString(),
      },
    });
  } catch (error: any) {
    console.error('[contest-poster] GET failed:', error?.message || error);
    return NextResponse.json({ error: 'Không thể tải poster' }, { status: 500 });
  }
}
