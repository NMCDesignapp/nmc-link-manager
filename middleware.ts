import { NextRequest, NextResponse } from 'next/server';

/**
 * Các màn hình KPI/Sao Việt đang gọi /api/contests?id=... để lấy cấu hình.
 * Chuyển riêng GET có id sang endpoint nhẹ để JSON không còn mang poster base64
 * dung lượng lớn. POST/PATCH/DELETE và danh sách summary vẫn giữ nguyên.
 */
export function middleware(request: NextRequest) {
  if (
    request.method === 'GET'
    && request.nextUrl.pathname === '/api/contests'
    && request.nextUrl.searchParams.has('id')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/api/contest-detail-lite';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/contests'],
};
