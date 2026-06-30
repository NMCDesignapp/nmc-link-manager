import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Resolve the correct database URL for PostgreSQL
// Priority: 1) DATABASE_URL if it starts with postgres, 2) DIRECT_URL if postgres, 3) fallback Neon URL
function resolveDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL || ''
  const directUrl = process.env.DIRECT_URL || ''
  
  // If DATABASE_URL is already PostgreSQL, use it
  if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
    return databaseUrl
  }
  
  // If DATABASE_URL points to SQLite/LibSQL, fall back to DIRECT_URL
  if (directUrl.startsWith('postgresql://') || directUrl.startsWith('postgres://')) {
    console.warn('[DB] DATABASE_URL is not PostgreSQL, using DIRECT_URL instead')
    return directUrl
  }
  
  // Last resort: use DATABASE_URL as-is (will error but at least try)
  console.error('[DB] No PostgreSQL URL found! DATABASE_URL:', databaseUrl.substring(0, 30), 'DIRECT_URL:', directUrl.substring(0, 30))
  return databaseUrl
}

const resolvedUrl = resolveDatabaseUrl()

// Create Prisma client with proper settings for Neon PostgreSQL
export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: resolvedUrl,
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Retry helper for database operations (Neon free tier can have cold starts)
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      const isConnectionError = 
        error?.code === 'P1001' || // Can't reach database server
        error?.code === 'P1002' || // Database server timeout
        error?.code === 'P1008' || // Operations timed out
        error?.code === 'P1017' || // Server has closed the connection
        error?.message?.includes('connect') ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('ECONNRESET')
      
      if (!isConnectionError) throw error
      
      const delay = Math.min(1000 * Math.pow(2, i), 5000)
      console.warn(`DB retry ${i + 1}/${maxRetries} after ${delay}ms:`, error?.message)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw lastError
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await db.$disconnect()
  })
}
