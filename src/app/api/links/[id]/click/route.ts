import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({ error: 'Link not found' }, { status: 404 })
}
