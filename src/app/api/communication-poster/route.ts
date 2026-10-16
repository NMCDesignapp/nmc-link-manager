import { NextRequest, NextResponse } from 'next/server';

// Only permit the exact Googleusercontent image host used by policy poster
// cards in Main App. Never proxy arbitrary URLs or accept redirects.
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url') || '';
  let source: URL;
  try {
    source = new URL(raw);
    if (source.protocol !== 'https:' || source.hostname !== 'lh3.googleusercontent.com' ||
        source.port || source.username || source.password ||
        !/^\/d\/[a-zA-Z0-9_-]{15,100}\/?$/.test(source.pathname) ||
        source.search || source.hash) throw new Error('Unsupported poster source');
  } catch {
    return NextResponse.json({ error: 'Invalid poster URL' }, { status: 400 });
  }

  try {
    const response = await fetch(source.toString(), {
      redirect: 'error',
      cache: 'force-cache',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('Poster HTTP ' + response.status);
    const type = response.headers.get('content-type')?.split(';')[0]?.trim() || '';
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(type)) {
      throw new Error('Invalid poster content type');
    }
    const length = Number(response.headers.get('content-length') || '0');
    if (length > 8_000_000) throw new Error('Poster too large');
    const blob = await response.arrayBuffer();
    if (blob.byteLength > 8_000_000) throw new Error('Poster too large');
    return new NextResponse(blob, {
      headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch (error) {
    console.warn('[communication-poster] Failed to fetch policy image:', error);
    return NextResponse.json({ error: 'Poster unavailable' }, { status: 502 });
  }
}
