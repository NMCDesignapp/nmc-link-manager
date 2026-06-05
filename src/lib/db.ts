import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Ensure we use the Neon PostgreSQL URL, not any SQLite override from env
const databaseUrl = process.env.DATABASE_URL?.startsWith('file:') 
  ? process.env.DIRECT_URL || process.env.DATABASE_URL 
  : process.env.DATABASE_URL

// Create Prisma client with proper settings for Neon PostgreSQL
export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: databaseUrl,
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
