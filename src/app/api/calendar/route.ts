import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  // Return empty events when DB is not available
  return NextResponse.json([])
}
