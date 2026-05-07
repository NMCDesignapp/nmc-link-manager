import { NextResponse } from 'next/server'

export async function GET() {
  // Return default stats when DB is not available
  return NextResponse.json({
    total_links: 0,
    total_clicks: 0,
    favorites: 0,
    categories: [],
    top_links: [],
  })
}
