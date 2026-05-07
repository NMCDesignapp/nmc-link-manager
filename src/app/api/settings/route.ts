import { NextResponse } from 'next/server'

export async function GET() {
  // Settings are now primarily stored in localStorage on the client side.
  // This endpoint returns empty object as fallback when DB is unavailable.
  return NextResponse.json({})
}

export async function PUT(request: Request) {
  // Settings are saved to localStorage on the client side.
  // This endpoint is a no-op when DB is unavailable.
  return NextResponse.json({ success: true })
}
