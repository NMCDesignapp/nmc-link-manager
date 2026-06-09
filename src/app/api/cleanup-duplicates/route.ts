import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// POST /api/cleanup-duplicates - Remove duplicate contracts and revenue data
export async function POST() {
  try {
    const results = { contractsRemoved: 0, revenueRemoved: 0 };

    // 1. Find and remove duplicate contracts (same agentCode + effectiveDate + pdt10DT + afyp)
    // Keep the most recent one (highest id), delete older ones
    const duplicateContracts = await db.$queryRaw<Array<{ ids: string }>>`
      SELECT string_agg(id::text, ',' ORDER BY id) as ids
      FROM "Contract"
      GROUP BY "agentCode", "effectiveDate", "pdt10DT", "afyp"
      HAVING COUNT(*) > 1
    `;

    for (const row of duplicateContracts) {
      const ids = row.ids.split(',');
      // Keep the last one (most recent), delete the rest
      const idsToDelete = ids.slice(0, -1);
      if (idsToDelete.length > 0) {
        await db.contract.deleteMany({
          where: { id: { in: idsToDelete } }
        });
        results.contractsRemoved += idsToDelete.length;
      }
    }

    // 2. Find and remove duplicate MonthlyRevenue (same month + agentCode + maNhom)
    // Keep the most recent one, delete older ones
    const duplicateRevenue = await db.$queryRaw<Array<{ ids: string }>>`
      SELECT string_agg(id::text, ',' ORDER BY id) as ids
      FROM "MonthlyRevenue"
      GROUP BY month, "agentCode", "maNhom"
      HAVING COUNT(*) > 1
    `;

    for (const row of duplicateRevenue) {
      const ids = row.ids.split(',');
      const idsToDelete = ids.slice(0, -1);
      if (idsToDelete.length > 0) {
        await db.monthlyRevenue.deleteMany({
          where: { id: { in: idsToDelete } }
        });
        results.revenueRemoved += idsToDelete.length;
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `Đã xóa ${results.contractsRemoved} hợp đồng trùng, ${results.revenueRemoved} doanh số trùng`
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: 'Lỗi khi dọn dẹp dữ liệu trùng: ' + String(error) }, { status: 500 });
  }
}
