import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id.length > 200) {
    return NextResponse.json({ error: 'Invalid contest ID' }, { status: 400 });
  }

  const destination = new URL('/thi-dua-chau', 'https://nmc-link-manager.onrender.com');
  destination.searchParams.set('embed', '1');
  destination.searchParams.set('contest', id);
  destination.searchParams.set('autocalc', '1');
  destination.searchParams.set('actions', '1');

  return NextResponse.redirect(destination, 307);
}
