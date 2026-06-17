import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const body = await req.json()
  try {
    const item = await db.tVVStruct.create({
      data: {
        agentCode: body.agentCode || 'DEBUG_001',
        agentName: body.agentName || 'Debug Test',
      }
    })
    return NextResponse.json({ ok: true, item })
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e.message,
      code: e.code,
    }, { status: 500 })
  }
}
