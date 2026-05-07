import { NextRequest, NextResponse } from 'next/server'

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Database không khả dụng. Vui lòng kết nối database để dùng tính năng này.' },
    { status: 503 }
  )
}
