import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Performs a health check for the application and database connection.
 *
 * @returns A JSON response containing environment details and database status, with HTTP status `200` when the database check succeeds or `503` when it fails.
 */
export async function GET() {
  const databaseUrl = process.env.DATABASE_URL || ''
  const directUrl = process.env.DIRECT_URL || ''
  
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      hasDatabaseUrl: !!databaseUrl,
      databaseUrlProtocol: databaseUrl.split('://')[0] || 'NOT SET',
      hasDirectUrl: !!directUrl,
      directUrlProtocol: directUrl.split('://')[0] || 'NOT SET',
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
