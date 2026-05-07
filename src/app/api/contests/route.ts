import { NextResponse } from 'next/server'

// GET /api/contests - Return empty when DB not available
export async function GET() {
  return NextResponse.json([])
}
