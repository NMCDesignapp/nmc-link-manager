import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/contracts/delete-by-range - Delete contracts by effectiveDate range
// Body: { fromMonth: "2026-01", toMonth: "2026-05" }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromMonth, toMonth } = body as { fromMonth?: string; toMonth?: string };

    if (!fromMonth || !toMonth) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp fromMonth và toMonth (vd: "2026-01", "2026-05")' },
        { status: 400 }
      );
    }

    // Parse months to date ranges
    const [fromYear, fromM] = fromMonth.split('-').map(Number);
    const [toYear, toM] = toMonth.split('-').map(Number);

    if (isNaN(fromYear) || isNaN(fromM) || isNaN(toYear) || isNaN(toM)) {
      return NextResponse.json({ error: 'Định dạng tháng không hợp lệ' }, { status: 400 });
    }

    const startDate = new Date(Date.UTC(fromYear, fromM - 1, 1));
    const endDate = new Date(Date.UTC(toYear, toM, 1)); // first day of next month

    const result = await db.contract.deleteMany({
      where: {
        effectiveDate: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    return NextResponse.json({
      message: `Đã xóa ${result.count} hợp đồng từ tháng ${fromMonth} đến tháng ${toMonth}`,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error('Error deleting contracts by range:', error);
    return NextResponse.json(
      { error: 'Không thể xóa: ' + (error instanceof Error ? error.message : 'Lỗi') },
      { status: 500 }
    );
  }
}
