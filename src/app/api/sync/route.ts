import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Parse date string (supports dd/mm/yyyy, yyyy-mm-dd, ISO) - UTC safe
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const s = dateStr.trim();
  // yyyy-mm-dd → UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00Z');
  // dd/mm/yyyy → UTC
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmy) return new Date(Date.UTC(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1])));
  // Fallback
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function parseCSV(csv: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const nextChar = csv[i + 1];
    
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote ""
          current += '"';
          i++; // Skip next quote
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(current.trim());
        current = '';
      } else if (char === '\r') {
        // Skip carriage return
        continue;
      } else if (char === '\n') {
        currentRow.push(current.trim());
        if (currentRow.some(c => c !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        current = '';
      } else {
        current += char;
      }
    }
  }
  // Don't forget the last field/row
  currentRow.push(current.trim());
  if (currentRow.some(c => c !== '')) {
    rows.push(currentRow);
  }
  
  return rows;
}

function parseNumber(numStr: string): number {
  if (!numStr || numStr.trim() === '') return 0;
  const cleaned = numStr.trim().replace(/\./g, '').replace(/,/g, '.');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

// POST /api/sync - Sync all 3 CSVs simultaneously
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractCsv, staffCsv, recruiterCsv } = body as {
      contractCsv?: string;
      staffCsv?: string;
      recruiterCsv?: string;
    };

    const results = { contracts: 0, staff: 0, recruiters: 0, errors: [] as string[] };

    // 1. Import Contracts
    if (contractCsv) {
      try {
        await db.contract.deleteMany();
        const rows = parseCSV(contractCsv);
        const dataRows = rows.slice(1); // Skip header
        const contracts = [];
        const seenContractNumbers = new Set<string>();

        for (const columns of dataRows) {
          const stt = columns[0] || '';
          const ban = columns[1] || '';
          const maTruongBan = columns[2] || '';
          const nhom = columns[3] || '';
          const maNhom = columns[4] || '';
          const leaderAgentCode = columns[5] || '';
          const agentCode = columns[6] || '';
          const agentName = columns[7] || '';
          const position = columns[8] || '';
          const startDateStr = columns[9] || '';
          const contractNumber = columns[10] || '';
          const effectiveDateStr = columns[11] || '';
          const issueDateStr = columns[12] || '';
          const fypStr = columns[13] || '';
          const pdt10DTStr = columns[14] || '';
          const nguonDuLieu = columns[15] || '';
          const hopDongToChuc = columns[16] || '';
          const dkDongPhi = columns[17] || '';
          const phiDongThemStr = columns[18] || '';
          const afypChuaTru10DTStr = columns[19] || '';
          const afypStr = columns[20] || '';
          const ad = columns[21] || '';
          const nhom2 = columns[22] || '';
          const ngayBatDauLamViec2Str = columns[23] || '';
          const thangTDStr = columns[24] || '';
          const namTDStr = columns[25] || '';
          const thangHLStr = columns[26] || '';
          const tinhLuotStr = columns[27] || '0';
          const tinhLuot3trStr = columns[28] || '0';
          const maDaiLyTD = columns[29] || '';
          const danhDauTVV = columns[30] || '';
          const chucVu2 = columns[31] || '';
          const recruiterCode = columns[32] || '';

          if (!effectiveDateStr) continue;
          // Auto-generate contract number if missing
          const finalContractNumber = contractNumber || `AUTO_${Date.now()}_${columns.length}_${Math.random().toString(36).slice(2, 8)}`;
          if (seenContractNumbers.has(finalContractNumber)) continue;
          seenContractNumbers.add(finalContractNumber);

          const effectiveDate = parseDate(effectiveDateStr);
          const issueDate = parseDate(issueDateStr);
          const startDate = parseDate(startDateStr);
          const ngayBatDauLamViec2 = parseDate(ngayBatDauLamViec2Str);
          if (!effectiveDate) continue;

          const fyp = parseNumber(fypStr);
          const afyp = parseNumber(afypStr);
          const tinhLuot = parseNumber(tinhLuotStr);

          contracts.push({
            stt: parseInt(stt) || 0,
            contractNumber: finalContractNumber,
            agentCode, agentName, position, ban, nhom, maNhom, leaderAgentCode,
            maTruongBan, maBanNhom: '', maTruongBanNhom: '', maDL: '',
            ngayBatDauLamViec: startDate,
            recruiterCode: recruiterCode || '',
            startDate,
            effectiveDate,
            issueDate: issueDate || effectiveDate,
            pdt10DT: parseNumber(pdt10DTStr),
            fyp,
            nguonDuLieu, hopDongToChuc, dkDongPhi,
            phiDongThem: parseNumber(phiDongThemStr),
            afypChuaTru10DT: parseNumber(afypChuaTru10DTStr),
            afyp,
            ad, nhom2,
            ngayBatDauLamViec2,
            thangTD: parseInt(thangTDStr) || 0,
            namTD: parseInt(namTDStr) || 0,
            thangHL: parseInt(thangHLStr) || 0,
            tinhLuot,
            tinhLuot3tr: parseNumber(tinhLuot3trStr),
            maDaiLyTD, danhDauTVV, chucVu2,
          });
        }

        if (contracts.length > 0) {
          const result = await db.contract.createMany({ data: contracts });
          results.contracts = result.count;
        }
        // KHÔNG upsert Staff từ contracts — Staff chỉ từ Staff CSV
      } catch (err) {
        results.errors.push(`HĐ: ${err instanceof Error ? err.message : 'Lỗi'}`);
      }
    }

    // 2. Import Staff CSV (6 columns: STT, Nhóm, Mã số, Họ tên, Chức vụ, Ngày bắt đầu)
    // DS Nhóm — chỉ chứa trưởng nhóm/trưởng ban
    // CSV KHÔNG có cột Mã nhóm → phải lookup từ contracts
    if (staffCsv) {
      try {
        await db.staff.deleteMany();
        const rows = parseCSV(staffCsv);
        const header = rows[0] || [];
        const dataRows = rows.slice(1); // Skip header

        // Xác định cấu trúc CSV dựa trên số cột header
        const colCount = header.length;

        // Build nhóm→mã nhóm mapping từ contracts đã import
        const nhomToMaNhom = new Map<string, string>();
        if (results.contracts > 0) {
          const allContracts = await db.contract.findMany({ select: { nhom: true, maNhom: true } });
          for (const c of allContracts) {
            if (c.nhom && c.maNhom && !nhomToMaNhom.has(c.nhom)) {
              nhomToMaNhom.set(c.nhom, c.maNhom);
            }
          }
        }

        const staffRecords = [];
        for (const columns of dataRows) {
          let nhom: string, maNhom: string, agentCode: string, agentName: string, position: string, startDateStr: string;

          if (colCount >= 7) {
            // 7 columns: STT, Nhóm, Mã nhóm, Mã TN, Họ tên TN, Chức vụ, Ngày bắt đầu
            nhom = columns[1] || '';
            maNhom = columns[2] || '';
            agentCode = columns[3] || '';
            agentName = columns[4] || '';
            position = columns[5] || '';
            startDateStr = columns[6] || '';
          } else {
            // 6 columns: STT, Nhóm, Mã số, Họ tên, Chức vụ, Ngày bắt đầu
            nhom = columns[1] || '';
            maNhom = nhomToMaNhom.get(nhom) || ''; // Lookup từ contracts
            agentCode = columns[2] || '';
            agentName = columns[3] || '';
            position = columns[4] || '';
            startDateStr = columns[5] || '';
          }

          if (!agentCode || !agentName) continue;

          staffRecords.push({
            nhom, maNhom, agentCode, agentName, position,
            startDate: parseDate(startDateStr),
          });
        }

        if (staffRecords.length > 0) {
          const result = await db.staff.createMany({ data: staffRecords });
          results.staff = result.count;
        }
      } catch (err) {
        results.errors.push(`NV: ${err instanceof Error ? err.message : 'Lỗi'}`);
      }
    }

    // 3. Import Recruiter CSV (7 columns: STT, Nhóm, Mã nhóm, Mã TN, Họ tên TN, Chức vụ, Ngày bắt đầu)
    if (recruiterCsv) {
      try {
        await db.recruiter.deleteMany();
        const rows = parseCSV(recruiterCsv);
        const header = rows[0] || [];
        const dataRows = rows.slice(1); // Skip header

        const colCount = header.length;
        const recruiters = [];

        for (const columns of dataRows) {
          let nhom: string, agentCode: string, agentName: string, position: string, startDateStr: string;

          if (colCount >= 7) {
            // 7 columns: STT, Nhóm, Mã nhóm, Mã TN, Họ tên TN, Chức vụ, Ngày bắt đầu
            nhom = columns[1] || '';
            agentCode = columns[3] || '';
            agentName = columns[4] || '';
            position = columns[5] || '';
            startDateStr = columns[6] || '';
          } else {
            // 6 columns: STT, Nhóm, Mã số, Họ tên, Chức vụ, Ngày bắt đầu
            nhom = columns[1] || '';
            agentCode = columns[2] || '';
            agentName = columns[3] || '';
            position = columns[4] || '';
            startDateStr = columns[5] || '';
          }

          if (!agentCode || !agentName) continue;

          recruiters.push({
            nhom,
            agentCode,
            agentName,
            position,
            startDate: parseDate(startDateStr),
          });
        }

        if (recruiters.length > 0) {
          const result = await db.recruiter.createMany({ data: recruiters });
          results.recruiters = result.count;
        }
      } catch (err) {
        results.errors.push(`NYD: ${err instanceof Error ? err.message : 'Lỗi'}`);
      }
    }

    const message = `Đã nhập: ${results.contracts} HĐ | ${results.staff} NV | ${results.recruiters} NYD-TVV${results.errors.length > 0 ? ` | Lỗi: ${results.errors.join('; ')}` : ''}`;
    return NextResponse.json({ message, ...results });
  } catch (error) {
    console.error('Error syncing data:', error);
    return NextResponse.json(
      { error: 'Không thể đồng bộ: ' + (error instanceof Error ? error.message : 'Lỗi') },
      { status: 500 }
    );
  }
}
