import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlProtocol: process.env.DATABASE_URL?.split('://')[0],
      hasDirectUrl: !!process.env.DIRECT_URL,
      directUrlProtocol: process.env.DIRECT_URL?.split('://')[0],
      nodeEnv: process.env.NODE_ENV,
      vercelRegion: process.env.VERCEL_REGION,
    },
    tests: {} as Record<string, any>,
  }

  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || ''
  const hostMatch = directUrl.match(/@([^:/]+)/)
  const host = hostMatch?.[1] || ''
  results.tests.host = host

  if (host) {
    // Test 1: Neon HTTP driver (bypasses TCP restrictions)
    try {
      const sql = neon(directUrl)
      const rows = await sql`SELECT NOW() as now`
      results.tests.neonHttp = { status: 'ok', data: rows[0] }
    } catch (e: any) {
      results.tests.neonHttp = { status: 'error', message: e.message?.slice(0, 200) }
    }

    // Test 2: Prisma Client (TCP-based)
    try {
      const count = await db.setting.count()
      results.tests.prismaTcp = { status: 'ok', count }
    } catch (e: any) {
      results.tests.prismaTcp = {
        status: 'error',
        message: e.message?.slice(0, 300),
        code: e.code,
      }
    }
  }

  const allOk = Object.values(results.tests).every(
    (t: any) => t?.status === 'ok' || typeof t === 'string'
  )
  return NextResponse.json(results, { status: allOk ? 200 : 503 })
}
