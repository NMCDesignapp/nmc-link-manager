import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/cleanup-all - Comprehensive cleanup of all data for specified months
// Body: { fromMonth: "2026-01", toMonth: "2026-05", includeStaff?: boolean, includeRecruiters?: boolean }
// This deletes: Contracts, MonthlyRevenue, and optionally Staff/Recruiters
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromMonth, toMonth, includeStaff = true, includeRecruiters = true } = body as {
      fromMonth?: string;
      toMonth?: string;
      includeStaff?: boolean;
      includeRecruiters?: boolean;
    };

    if (!fromMonth || !toMonth) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp fromMonth và toMonth (vd: "2026-01", "2026-05")' },
        { status: 400 }
      );
    }

    const [fromYear, fromM] = fromMonth.split('-').map(Number);
    const [toYear, toM] = toMonth.split('-').map(Number);

    if (isNaN(fromYear) || isNaN(fromM) || isNaN(toYear) || isNaN(toM)) {
      return NextResponse.json({ error: 'Định dạng tháng không hợp lệ' }, { status: 400 });
    }

    const startDate = new Date(Date.UTC(fromYear, fromM - 1, 1));
    const endDate = new Date(Date.UTC(toYear, toM, 1)); // first day of next month after toMonth

    const results: Record<string, number> = {};

    // 1. Delete Contracts where issueDate OR effectiveDate falls in range
    // Using BOTH fields (not just issueDate with fallback) to be thorough
    const contractDelete1 = await db.contract.deleteMany({
      where: {
        OR: [
          { issueDate: { gte: startDate, lt: endDate } },
          { effectiveDate: { gte: startDate, lt: endDate } },
        ],
      },
    });
    results.contracts = contractDelete1.count;

    // Also delete any remaining contracts with other date fields in the range
    const contractDelete2 = await db.contract.deleteMany({
      where: {
        OR: [
          { ngayBatDauLamViec: { gte: startDate, lt: endDate } },
          { startDate: { gte: startDate, lt: endDate } },
        ],
      },
    });
    results.contracts += contractDelete2.count;

    // 2. Delete MonthlyRevenue for the month range
    const monthsToDelete: string[] = [];
    let currentYear = fromYear;
    let currentMonth = fromM;
    while (currentYear < toYear || (currentYear === toYear && currentMonth <= toM)) {
      monthsToDelete.push(`${currentYear}-${String(currentMonth).padStart(2, '0')}`);
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }

    const revenueDelete = await db.monthlyRevenue.deleteMany({
      where: { month: { in: monthsToDelete } },
    });
    results.monthlyRevenue = revenueDelete.count;

    // 3. Delete Staff if requested (they'll re-upload)
    if (includeStaff) {
      const staffDelete = await db.staff.deleteMany();
      results.staff = staffDelete.count;
    }

    // 4. Delete Recruiters if requested (they'll re-upload)
    if (includeRecruiters) {
      const recruiterDelete = await db.recruiter.deleteMany();
      results.recruiters = recruiterDelete.count;
    }

    // 5. Delete LeaderInfo (these come from CSV uploads too)
    const leaderDelete = await db.leaderInfo.deleteMany();
    results.leaderInfo = leaderDelete.count;

    // 6. Delete Contests that have dates in the range
    const contestDelete = await db.contest.deleteMany({
      where: {
        OR: [
          { startDate: { gte: startDate, lt: endDate } },
          { endDate: { gte: startDate, lt: endDate } },
        ],
      },
    });
    results.contests = contestDelete.count;

    return NextResponse.json({
      message: `Đã xóa toàn bộ dữ liệu từ tháng ${fromMonth} đến tháng ${toMonth}`,
      results,
      monthsDeleted: monthsToDelete,
    });
  } catch (error) {
    console.error('Error in comprehensive cleanup:', error);
    return NextResponse.json(
      { error: 'Không thể xóa: ' + (error instanceof Error ? error.message : 'Lỗi') },
      { status: 500 }
    );
  }
}
