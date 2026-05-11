import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Optimize for Neon serverless:
// - Use connection_limit=1 to avoid pool exhaustion on serverless
// - Use connect_timeout for faster cold start
const connectionString = process.env.DATABASE_URL || ''

function buildPrismaClient() {
  const url = connectionString.includes('?')
    ? `${connectionString}&connection_limit=1&connect_timeout=10&pool_timeout=10`
    : `${connectionString}?connection_limit=1&connect_timeout=10&pool_timeout=10`

  return new PrismaClient({
    datasourceUrl: url,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? buildPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
