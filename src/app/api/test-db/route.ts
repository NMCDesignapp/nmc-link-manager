import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  try {
    // Direct connection test without Drizzle
    const sql = neon('postgresql://neondb_owner:npg_EJpK9D0UTSuz@ep-divine-butterfly-ap71xees-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require')
    
    const result = await sql`SELECT COUNT(*) as count FROM links`
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful',
      linkCount: result[0].count 
    })
  } catch (error) {
    console.error('[v0] Database test error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
