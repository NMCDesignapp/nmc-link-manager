import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// POST /api/backfill - Sửa dữ liệu cũ: tinhLuot3tr=0 nhưng tinhLuot>0 → copy tinhLuot sang tinhLuot3tr
export async function POST() {
  try {
    // Tìm tất cả contracts có tinhLuot3tr = 0 nhưng tinhLuot > 0
    const contractsToFix = await db.contract.findMany({
      where: {
        tinhLuot3tr: 0,
        tinhLuot: { gt: 0 },
      },
      select: { id: true, tinhLuot: true },
    });

    if (contractsToFix.length === 0) {
      return NextResponse.json({ message: 'Không có dữ liệu cần sửa', fixed: 0 });
    }

    // Batch update
    let fixed = 0;
    for (const c of contractsToFix) {
      try {
        await db.contract.update({
          where: { id: c.id },
          data: { tinhLuot3tr: c.tinhLuot },
        });
        fixed++;
      } catch {
        // Skip individual errors
      }
    }

    return NextResponse.json({
      message: `Đã sửa ${fixed}/${contractsToFix.length} hợp đồng: tinhLuot3tr ← tinhLuot`,
      fixed,
      total: contractsToFix.length,
    });
  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json(
      { error: 'Lỗi backfill: ' + (error instanceof Error ? error.message : 'Unknown') },
      { status: 500 }
    );
  }
}
