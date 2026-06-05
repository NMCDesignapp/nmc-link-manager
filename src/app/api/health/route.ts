import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + '...' || 'NOT SET',
      hasDirectUrl: !!process.env.DIRECT_URL,
      nodeEnv: process.env.NODE_ENV,
    },
  }

  try {
    const start = Date.now()
    const settingsCount = await db.setting.count()
    checks.db = {
      status: 'connected',
      latencyMs: Date.now() - start,
      settingsCount,
    }
  } catch (error: any) {
    checks.db = {
      status: 'error',
      code: error?.code,
      message: error?.message?.substring(0, 200),
    }
  }

  const statusCode = checks.db.status === 'connected' ? 200 : 503
  return NextResponse.json(checks, { status: statusCode })
}
