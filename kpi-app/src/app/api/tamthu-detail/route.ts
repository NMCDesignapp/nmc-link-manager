import { NextResponse } from 'next/server';

// KPI tách dùng cùng snapshot Sheet2 đã được Data Hub đồng bộ vào main app.
// Endpoint chỉ đọc/proxy, tuyệt đối không chạy tính toán hay ghi dữ liệu.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetch('https://nc-link.vercel.app/api/tamthu-detail', { cache: 'no-store' });
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ rows: [], count: 0, error: 'Không thể tải chi tiết tạm thu.' }, { status: 502 });
  }
}
