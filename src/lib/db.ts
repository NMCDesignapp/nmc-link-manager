import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Vercel serverless functions must use Supavisor transaction mode. If the
// configured URL points at Supabase session mode (5432), normalize it to the
// transaction pooler (6543) at runtime without exposing or changing secrets.
function normalizeRuntimeDatabaseUrl(value: string): string {
  if (!value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
    return value
  }

  try {
    const url = new URL(value)
    const isSupabasePooler = url.hostname.endsWith('.pooler.supabase.com')

    if (isSupabasePooler && url.port === '5432') {
      url.port = '6543'
      url.searchParams.set('pgbouncer', 'true')
      // A single connection caused P2024 timeouts when heartbeat, KPI and
      // dashboard requests overlapped in the same Vercel function instance.
      // Keep this deliberately small while allowing modest concurrency.
      url.searchParams.set('connection_limit', '3')
      if (!url.searchParams.has('sslmode')) {
        url.searchParams.set('sslmode', 'require')
      }
    }

    return url.toString()
  } catch {
    return value
  }
}

// Resolve the production connection managed by the Supabase ↔ Vercel
// integration. Legacy variables remain only as compatibility fallbacks.
function resolveDatabaseUrl(): string {
  const supabasePrismaUrl = process.env.POSTGRES_PRISMA_URL || ''
  const databaseUrl = process.env.DATABASE_URL || ''
  const directUrl = process.env.DIRECT_URL || ''

  if (supabasePrismaUrl.startsWith('postgresql://') || supabasePrismaUrl.startsWith('postgres://')) {
    return normalizeRuntimeDatabaseUrl(supabasePrismaUrl)
  }

  if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
    return normalizeRuntimeDatabaseUrl(databaseUrl)
  }

  if (directUrl.startsWith('postgresql://') || directUrl.startsWith('postgres://')) {
    console.warn('[DB] DATABASE_URL is not PostgreSQL, using DIRECT_URL instead')
    return normalizeRuntimeDatabaseUrl(directUrl)
  }

  console.error('[DB] No PostgreSQL connection URL is configured')
  return databaseUrl
}

const resolvedUrl = resolveDatabaseUrl()

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: resolvedUrl,
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      const message = String(error?.message || '')
      const isConnectionError =
        error?.code === 'P1001' ||
        error?.code === 'P1002' ||
        error?.code === 'P1008' ||
        error?.code === 'P1017' ||
        message.includes('connect') ||
        message.includes('timeout') ||
        message.includes('ECONNRESET') ||
        message.includes('EMAXCONNSESSION') ||
        message.includes('max clients reached')

      if (!isConnectionError) throw error

      const delay = Math.min(1000 * Math.pow(2, i), 5000)
      console.warn(`DB retry ${i + 1}/${maxRetries} after ${delay}ms:`, error?.message)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw lastError
}

if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await db.$disconnect()
  })
}
