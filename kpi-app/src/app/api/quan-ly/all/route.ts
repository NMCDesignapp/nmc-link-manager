import { NextResponse } from 'next/server'

// KPI tách luôn đọc snapshot dữ liệu lớn từ Main App để tránh lệch Prisma schema
// giữa hai Vercel project. Endpoint này chỉ proxy dữ liệu, không ghi database.
export const dynamic = 'force-dynamic'

const MAIN_APP_URL = 'https://nc-link.vercel.app'

export async function GET() {
  try {
    const response = await fetch(`${MAIN_APP_URL}/api/quan-ly/all`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    const body = await response.text()

    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[KPI standalone] quan-ly/all proxy error:', error)
    return NextResponse.json(
      { error: 'Không thể tải dữ liệu KPI từ Main App.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
