import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest) {
  // Return empty export when DB is not available
  return NextResponse.json({
    exported_at: new Date().toISOString(),
    total_links: 0,
    links: [],
  })
}
