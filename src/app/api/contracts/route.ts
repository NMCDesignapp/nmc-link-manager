import { NextResponse } from 'next/server'

// GET /api/contracts - Return empty when DB not available
export async function GET() {
  return NextResponse.json([])
}
