import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/revenue/sync-from-contracts
// Tự động tính doanh thu từ bảng Contract và lưu vào MonthlyRevenue
// DOANH SỐ HÀNG THÁNG: căn cứ vào NGÀY PHÁT HÀNH (issueDate)
//   - HĐ hiệu lực tháng 3 nhưng phát hành tháng 4 → tính doanh số tháng 4
//   - Nếu không có issueDate → dùng effectiveDate làm fallback
// Group by: month + maNhom + agentCode → tổng IP, AFYP, SL HĐ, lượt HĐ
export async function POST() {
  try {
    const allContracts = await db.contract.findMany({
      select: {
        effectiveDate: true,
        issueDate: true,
        nhom: true,
        maNhom: true,
        agentCode: true,
        agentName: true,
        pdt10DT: true,
        afyp: true,
        tinhLuot3tr: true,
      },
    });
    // Chỉ cần HĐ có ít nhất effectiveDate hoặc issueDate
    const contracts = allContracts.filter(c => c.issueDate !== null || c.effectiveDate !== null);

    if (contracts.length === 0) {
      return NextResponse.json({ error: 'Không có hợp đồng nào để tính doanh thu' }, { status: 400 });
    }

    // Group by month + maNhom + agentCode
    // Tháng doanh số = tháng của issueDate (ngày phát hành)
    const grouped = new Map<string, {
      month: string;
      maNhom: string;
      nhom: string;
      agentCode: string;
      agentName: string;
      totalFYP: number;
      totalAFYP: number;
      contractCount: number;
      activityRounds: number;
    }>();

    for (const c of contracts) {
      // DOANH SỐ: dùng issueDate (ngày phát hành), fallback effectiveDate
      const dateForRevenue = c.issueDate || c.effectiveDate;
      if (!dateForRevenue) continue;

      // Lấy tháng từ date (dùng UTC vì date đã được lưu dạng UTC midnight trong DB)
      const d = new Date(dateForRevenue);
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const monthStr = `${year}-${month}`;

      const maNhom = c.maNhom || '';
      const agentCode = c.agentCode || '';
      const key = `${monthStr}|${maNhom}|${agentCode}`;

      if (grouped.has(key)) {
        const g = grouped.get(key)!;
        g.totalFYP += c.pdt10DT;
        g.totalAFYP += c.afyp;
        g.contractCount += 1;
        // Lượt HĐ: TVV có ít nhất 1 HĐ với tinhLuot3tr >= 3,000,000 = 1 lượt
        if (c.tinhLuot3tr >= 3000000) {
          g.activityRounds = 1;
        }
      } else {
        grouped.set(key, {
          month: monthStr,
          maNhom,
          nhom: c.nhom || '',
          agentCode,
          agentName: c.agentName || '',
          totalFYP: c.pdt10DT,
          totalAFYP: c.afyp,
          contractCount: 1,
          activityRounds: c.tinhLuot3tr >= 3000000 ? 1 : 0,
        });
      }
    }

    const revenueRows = Array.from(grouped.values());
    const monthsInData = [...new Set(revenueRows.map(r => r.month))].filter(Boolean);

    // Xóa dữ liệu doanh thu cũ của các tháng đã tính (replace months)
    if (monthsInData.length > 0) {
      await db.monthlyRevenue.deleteMany({
        where: { month: { in: monthsInData } }
      });
    }

    // Insert dữ liệu mới
    const result = await db.monthlyRevenue.createMany({
      data: revenueRows.map(r => ({
        month: r.month,
        maNhom: r.maNhom,
        nhom: r.nhom,
        agentCode: r.agentCode,
        agentName: r.agentName,
        totalFYP: r.totalFYP,
        totalAFYP: r.totalAFYP,
        contractCount: r.contractCount,
        activityRounds: r.activityRounds,
        note: '',
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      count: result.count,
      months: monthsInData,
      totalContracts: contracts.length,
      message: `Đã tính doanh thu từ ${contracts.length} HĐ (theo Ngày phát hành) → ${result.count} dòng doanh số cho ${monthsInData.length} tháng`
    }, { status: 201 });
  } catch (error) {
    console.error('Error syncing revenue from contracts:', error);
    return NextResponse.json({ error: 'Không thể tính doanh thu: ' + String(error) }, { status: 500 });
  }
}
