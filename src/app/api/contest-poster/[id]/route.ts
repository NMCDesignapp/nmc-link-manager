import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createDefaultContestPoster } from '@/lib/contest-poster';

export const dynamic = 'force-dynamic';

type PosterBinary = {
  data: Buffer;
  contentType: string;
  updatedAt: Date;
};

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

async function loadPosterImage(key: string): Promise<PosterBinary | null> {
  try {
    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT "data", "contentType", "updatedAt" FROM "PosterImage" WHERE "key" = $1 LIMIT 1`,
      key,
    );
    const row = rows?.[0];
    if (!row?.data) return null;

    const data = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data);
    if (!data.length) return null;

    const updatedAt = row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt);
    return {
      data,
      contentType: row.contentType || 'image/jpeg',
      updatedAt: Number.isNaN(updatedAt.getTime()) ? new Date(0) : updatedAt,
    };
  } catch (error: any) {
    console.warn('[contest-poster] PosterImage lookup failed:', error?.message || error);
    return null;
  }
}

function binaryResponse(
  request: NextRequest,
  id: string,
  binary: PosterBinary,
  version: number,
) {
  const etag = `"contest-${id}-${version}-${binary.data.length}"`;
  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  return new NextResponse(binary.data, {
    status: 200,
    headers: {
      'Content-Type': binary.contentType,
      'Content-Length': String(binary.data.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: etag,
      'Last-Modified': binary.updatedAt.toUTCString(),
    },
  });
}

function dataUrlResponse(
  request: NextRequest,
  id: string,
  decoded: { contentType: string; data: Buffer },
  updatedAt: Date,
) {
  return binaryResponse(
    request,
    id,
    { data: decoded.data, contentType: decoded.contentType, updatedAt },
    updatedAt.getTime(),
  );
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

    const contestUpdatedAt = contest.updatedAt instanceof Date
      ? contest.updatedAt
      : new Date(contest.updatedAt);
    const safeContestUpdatedAt = Number.isNaN(contestUpdatedAt.getTime()) ? new Date(0) : contestUpdatedAt;
    const posterUrl = (contest.posterUrl || '').trim();
    const storedKey = `contest-poster-${contest.id}`;

    // Legacy records can accidentally point posterUrl back to this same route.
    // Resolve those directly from PosterImage instead of redirecting forever.
    if (posterUrl) {
      try {
        const resolved = new URL(posterUrl, request.url);
        const currentPath = `/api/contest-poster/${encodeURIComponent(contest.id)}`;
        const decodedPath = decodeURIComponent(resolved.pathname);
        const decodedCurrentPath = decodeURIComponent(currentPath);

        if (decodedPath === decodedCurrentPath) {
          const stored = await loadPosterImage(storedKey);
          if (stored) {
            return binaryResponse(request, contest.id, stored, stored.updatedAt.getTime());
          }
        }

        const posterImagePrefix = '/api/poster-image/';
        if (decodedPath.startsWith(posterImagePrefix)) {
          const key = decodeURIComponent(decodedPath.slice(posterImagePrefix.length));
          const stored = key ? await loadPosterImage(key) : null;
          if (stored) {
            return binaryResponse(request, contest.id, stored, stored.updatedAt.getTime());
          }
          // Missing/corrupt stored image falls through to the generated default.
        } else if (/^https?:\/\//i.test(posterUrl)) {
          return NextResponse.redirect(posterUrl, 307);
        } else if (posterUrl.startsWith('/')) {
          return NextResponse.redirect(resolved, 307);
        } else {
          const decoded = decodeDataUrl(posterUrl);
          if (decoded) {
            return dataUrlResponse(request, contest.id, decoded, safeContestUpdatedAt);
          }
        }
      } catch {
        // Invalid legacy URL: use the default poster below.
      }
    }

    // Last-resort fallback keeps the KPI notice usable even if an old poster URL
    // is broken or its binary record was removed.
    const fallback = createDefaultContestPoster(contest);
    const decodedFallback = decodeDataUrl(fallback);
    if (!decodedFallback) {
      return NextResponse.json({ error: 'Poster không hợp lệ' }, { status: 404 });
    }

    return dataUrlResponse(request, contest.id, decodedFallback, safeContestUpdatedAt);
  } catch (error: any) {
    console.error('[contest-poster] GET failed:', error?.message || error);
    return NextResponse.json({ error: 'Không thể tải poster' }, { status: 500 });
  }
}
