import { NextResponse } from 'next/server'

export async function GET() {
  // Return empty array when DB is not available
  return NextResponse.json([])
}
