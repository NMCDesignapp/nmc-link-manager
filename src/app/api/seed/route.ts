import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  // Format: DD/MM/YYYY
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
}

function parseNumber(numStr: string): number {
  if (!numStr || numStr.trim() === '') return 0;
  // Remove dots (thousand separators) and parse
  const cleaned = numStr.trim().replace(/\./g, '').replace(/,/g, '.');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

// POST /api/seed - Import data from Google Sheets CSV
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { csvData } = body as { csvData?: string };

    if (!csvData) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp dữ liệu CSV' },
        { status: 400 }
      );
    }

    // Clear existing data
    await db.contract.deleteMany();

    const lines = csvData.split('\n').filter((line) => line.trim() !== '');
    // Skip header row
    const dataLines = lines.slice(1);

    const contracts = [];
    const seenContractNumbers = new Set<string>();

    for (const line of dataLines) {
      // Parse CSV respecting quoted fields
      const columns: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          columns.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      columns.push(current.trim());

      // Column mapping (0-indexed):
      // 0: STT, 1: Ban, 2: Mã trưởng ban, 3: Nhóm, 4: Mã Ban/Nhóm (MC NHÓM),
      // 5: Mã trưởng Ban/Nhóm (leaderAgentCode), 6: Mã ĐL, 7: Tên, 8: Chức vụ,
      // 9: Ngày bắt đầu làm việc (startDate), 10: Số hợp đồng, 11: Ngày hiệu lực,
      // 12: Ngày phát hành, 13: PĐT + 10% ĐT = FYP/IP,
      // ... 20: AFYP, 26: Tính Lượt (tinhLuot)

      const contractNumber = columns[10] || '';
      const agentCode = columns[6] || '';
      const agentName = columns[7] || '';
      const position = columns[8] || '';
      const ban = columns[1] || '';
      const nhom = columns[3] || '';
      const maNhom = columns[4] || '';  // Mã Ban/Nhóm (MC NHÓM)
      const leaderAgentCode = columns[5] || '';  // Mã trưởng Ban/Nhóm
      const startDateStr = columns[9] || '';     // Ngày bắt đầu làm việc
      const effectiveDateStr = columns[11] || '';
      const issueDateStr = columns[12] || '';
      const fypStr = columns[13] || '';
      const afypStr = columns[20] || '';
      const tinhLuotStr = columns[26] || '0';   // Tính Lượt

      // Skip rows without effective date; auto-generate contract number if missing
      if (!effectiveDateStr) continue;
      const finalContractNumber = contractNumber || `AUTO_${Date.now()}_${columns.length}_${Math.random().toString(36).slice(2, 8)}`;
      if (seenContractNumbers.has(finalContractNumber)) continue;
      seenContractNumbers.add(finalContractNumber);

      const effectiveDate = parseDate(effectiveDateStr);
      const issueDate = parseDate(issueDateStr);
      const startDate = parseDate(startDateStr);

      if (!effectiveDate) continue;

      const fyp = parseNumber(fypStr);
      const afyp = parseNumber(afypStr);
      const tinhLuot = parseNumber(tinhLuotStr);

      contracts.push({
        contractNumber: finalContractNumber,
        agentCode,
        agentName,
        position,
        ban,
        nhom,
        maNhom,
        leaderAgentCode,
        recruiterCode: '', // Not available in current CSV format
        startDate,
        effectiveDate,
        issueDate: issueDate || effectiveDate,
        fyp,
        afyp,
        tinhLuot,
        tinhLuot3tr: tinhLuot, // Fallback: seed route CSV không có cột TÍNH LƯỢT 3TR → dùng tinhLuot
      });
    }

    if (contracts.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy hợp đồng hợp lệ trong dữ liệu CSV' },
        { status: 400 }
      );
    }

    // Use createMany with skipDuplicates for PostgreSQL
    const result = await db.contract.createMany({
      data: contracts,
      skipDuplicates: true,
    });

    // Staff KHÔNG được upsert từ contracts — Staff chỉ từ Staff CSV
    // Bảng doanh số chỉ dùng để tính số liệu, không dùng để lấy thông tin nhân sự

    return NextResponse.json({
      message: `Đã nhập ${result.count} hợp đồng từ Google Sheets`,
      count: result.count,
    });
  } catch (error) {
    console.error('Error importing data:', error);
    return NextResponse.json(
      { error: 'Không thể nhập dữ liệu: ' + (error instanceof Error ? error.message : 'Lỗi không xác định') },
      { status: 500 }
    );
  }
}
