import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({ error: 'Link not found' }, { status: 404 })
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({ error: 'Link not found' }, { status: 404 })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({ message: 'Link deleted successfully' })
}
