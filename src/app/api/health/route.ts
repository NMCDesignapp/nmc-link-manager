import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Health endpoint intentionally exposes connection status only, never database credentials.
export async function GET() {
  const databaseUrl = process.env.DATABASE_URL || ''
  const directUrl = process.env.DIRECT_URL || ''
  const postgresPrismaUrl = process.env.POSTGRES_PRISMA_URL || ''

  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      hasDatabaseUrl: !!databaseUrl,
      hasDirectUrl: !!directUrl,
      hasPostgresPrismaUrl: !!postgresPrismaUrl,
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
      message: error?.message?.substring(0, 300),
    }
  }

  const statusCode = checks.db.status === 'connected' ? 200 : 503
  return NextResponse.json(checks, { status: statusCode })
}
