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
          current += '"';
          i++;
        } else {
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

// Helper: tìm giá trị theo tên header (hỗ trợ nhiều tên khác nhau)
function getVal(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
  }
  return '';
}

// Chuyển CSV rows (mảng 2D) thành mảng object theo header
function csvToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const header = rows[0];
  const dataRows = rows.slice(1);
  return dataRows.map(cols => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => {
      if (h) obj[h.trim()] = (cols[i] || '').trim();
    });
    return obj;
  });
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

    // 1. Import Contracts — HEADER-BASED mapping (không dùng vị trí cột nữa!)
    if (contractCsv) {
      try {
        const rows = parseCSV(contractCsv);
        const records = csvToObjects(rows);
        const seenContractNumbers = new Set<string>();
        let upserted = 0;

        for (const row of records) {
          // Đọc theo tên header — hỗ trợ nhiều tên khác nhau
          const agentCode = getVal(row, 'Mã ĐL', 'Mã đại lý', 'Mã số', 'agentCode');
          const agentName = getVal(row, 'Tên', 'Họ tên', 'Tên TVV', 'agentName');
          const position = getVal(row, 'Chức vụ', 'position');
          const ban = getVal(row, 'Ban', 'ban');
          const nhom = getVal(row, 'Nhóm', 'nhom');
          const maNhom = getVal(row, 'Mã Ban/Nhóm', 'Mã nhóm', 'maNhom');
          const maTruongBan = getVal(row, 'Mã trưởng ban', 'Mã Trưởng Ban', 'maTruongBan');
          const leaderAgentCode = getVal(row, 'Mã trưởng Ban/Nhóm', 'leaderAgentCode');
          const startDateStr = getVal(row, 'Ngày bắt đầu làm việc', 'Ngày bắt đầu', 'Ngày BĐLV', 'startDate');
          const contractNumber = getVal(row, 'Số hợp đồng', 'Số HĐ', 'contractNumber');
          const effectiveDateStr = getVal(row, 'Ngày hiệu lực', 'Ngày HL', 'effectiveDate');
          const issueDateStr = getVal(row, 'Ngày phát hành', 'Ngày PH', 'Ngày cấp', 'issueDate');
          const pdt10DTStr = getVal(row, 'PĐT + 10% ĐT', 'IP+10%PĐT', 'PĐT+10%ĐT', 'pdt10DT');
          const fypStr = getVal(row, 'FYP', 'fyp');
          const nguonDuLieu = getVal(row, 'Nguồn dữ liệu', 'Nguồn DL', 'nguonDuLieu');
          const hopDongToChuc = getVal(row, 'Hợp đồng tổ chức', 'HĐ tổ chức', 'hopDongToChuc');
          const dkDongPhi = getVal(row, 'ĐK ĐÓNG PHÍ', 'ĐK đóng phí', 'dkDongPhi');
          const phiDongThemStr = getVal(row, 'PHÍ ĐÓNG THÊM', 'Phí đóng thêm', 'phiDongThem');
          const afypChuaTru10DTStr = getVal(row, 'AFYP chưa trừ 10% ĐT', 'afypChuaTru10DT');
          const afypStr = getVal(row, 'AFYP', 'afyp');
          const ad = getVal(row, 'AD', 'ad');
          const nhom2 = getVal(row, 'NHÓM', 'Nhóm 2', 'nhom2');
          const ngayBatDauLamViec2Str = getVal(row, 'NGÀY BẮT ĐẦU LÀM VIỆC', 'Ngày BĐLV 2', 'ngayBatDauLamViec2');
          const thangTDStr = getVal(row, 'THÁNG TD', 'thangTD');
          const namTDStr = getVal(row, 'NĂM TD', 'namTD');
          const thangHLStr = getVal(row, 'THÁNG HL', 'thangHL');
          // Cột "TÍNH LƯỢT 3 tr" — cột duy nhất trong file user
          const tinhLuot3trStr = getVal(row, 'TÍNH LƯỢT 3 tr', 'TÍNH LƯỢT 3TR', 'TÍNH LƯỢT 3tr', 'Tính lượt 3tr', 'Tính lượt 3 tr', 'tinhLuot3tr');
          const maDaiLyTD = getVal(row, 'MÃ ĐL TD', 'Mã đại lý tuyển dụng', 'Mã NTD', 'MÃ ĐLTD', 'maDaiLyTD');
          const danhDauTVV = getVal(row, 'ĐÁNH DẤU TVVm TUYỂN DỤNG QUÝ 1', 'danhDauTVV');
          const chucVu2 = getVal(row, 'Chức vụ', 'Chức vụ 2', 'chucVu2');
          const recruiterCode = getVal(row, 'Mã tuyển dụng', 'MÃ TUYỂN DỤNG', 'recruiterCode');
          const sttStr = getVal(row, 'STT', 'stt');

          if (!effectiveDateStr) continue;
          // Generate deterministic contractNumber if missing: agentCode_effectiveDate_pdt10DT
          // This ensures same CSV row maps to same contract across sync runs (no duplicates)
          const finalContractNumber = contractNumber || (() => {
            const key = `${agentCode || 'X'}_${effectiveDateStr || 'X'}_${pdt10DTStr || fypStr || '0'}_${afypStr || '0'}`;
            return `AUTO_${key.replace(/[^a-zA-Z0-9_]/g, '')}`;
          })();
          if (seenContractNumbers.has(finalContractNumber)) continue;
          seenContractNumbers.add(finalContractNumber);

          const effectiveDate = parseDate(effectiveDateStr);
          const issueDate = parseDate(issueDateStr);
          const startDate = parseDate(startDateStr);
          const ngayBatDauLamViec2 = parseDate(ngayBatDauLamViec2Str);
          if (!effectiveDate) continue;

          const fyp = parseNumber(fypStr) || parseNumber(pdt10DTStr); // FYP fallback to PĐT+10%
          const afyp = parseNumber(afypStr);
          const tinhLuot3tr = parseNumber(tinhLuot3trStr);

          try {
            await db.contract.upsert({
              where: { contractNumber: finalContractNumber },
              update: {
                stt: parseInt(sttStr) || 0,
                agentCode, agentName, position, ban, nhom, maNhom, leaderAgentCode,
                maTruongBan, ngayBatDauLamViec: startDate,
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
                tinhLuot3tr,
                maDaiLyTD, danhDauTVV, chucVu2,
              },
              create: {
                stt: parseInt(sttStr) || 0,
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
                tinhLuot3tr,
                maDaiLyTD, danhDauTVV, chucVu2,
              },
            });
            upserted++;
          } catch {
            // Skip duplicate or error on individual record
          }
        }

        results.contracts = upserted;
      } catch (err) {
        results.errors.push(`HĐ: ${err instanceof Error ? err.message : 'Lỗi'}`);
      }
    }

    // 2. Import Staff CSV — header-based mapping → into LeaderInfo (DS TB/TN) table
    if (staffCsv) {
      try {
        const rows = parseCSV(staffCsv);
        const records = csvToObjects(rows);

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

        let upserted = 0;
        for (const row of records) {
          const nhom = getVal(row, 'Nhóm', 'nhom');
          let maNhom = getVal(row, 'Mã nhóm', 'Mã Ban/Nhóm', 'maNhom');
          const agentCode = getVal(row, 'Mã số', 'Mã TN', 'Mã trưởng nhóm', 'agentCode');
          const agentName = getVal(row, 'Họ tên', 'Họ tên TN', 'agentName');
          const position = getVal(row, 'Chức vụ', 'position');
          const ban = getVal(row, 'Ban', 'ban');
          const salaryStr = getVal(row, 'Tiền/tháng', 'Lương', 'salary');
          const phone = getVal(row, 'SĐT', 'phone');
          const email = getVal(row, 'Email', 'email');
          const note = getVal(row, 'Ghi chú', 'note');
          const startDateStr = getVal(row, 'Ngày bắt đầu', 'startDate');

          if (!maNhom && nhom) maNhom = nhomToMaNhom.get(nhom) || '';
          if (!agentCode || !agentName) continue;

          const salary = parseNumber(salaryStr);
          const startDate = parseDate(startDateStr);

          try {
            // Import into LeaderInfo (DS TB/TN) — this is the primary table the app reads from
            await db.leaderInfo.upsert({
              where: { agentCode },
              update: { nhom, maNhom, agentName, position, ban, salary, phone, email, note, startDate },
              create: { agentCode, agentName, position, ban, nhom, maNhom, salary, phone, email, note, startDate },
            });
            upserted++;
          } catch {
            // Skip individual errors
          }
        }

        results.staff = upserted;
      } catch (err) {
        results.errors.push(`NV: ${err instanceof Error ? err.message : 'Lỗi'}`);
      }
    }

    // 3. Import Recruiter CSV — header-based mapping
    if (recruiterCsv) {
      try {
        const rows = parseCSV(recruiterCsv);
        const records = csvToObjects(rows);

        const recruitersData: Array<{
          nhom: string;
          agentCode: string;
          agentName: string;
          position: string;
          startDate: Date | null;
        }> = [];

        for (const row of records) {
          const nhom = getVal(row, 'Nhóm', 'nhom');
          const agentCode = getVal(row, 'Mã số', 'Mã TN', 'agentCode');
          const agentName = getVal(row, 'Họ tên', 'Họ tên TN', 'agentName');
          const position = getVal(row, 'Chức vụ', 'position');
          const startDateStr = getVal(row, 'Ngày bắt đầu', 'startDate');

          if (!agentCode || !agentName) continue;

          recruitersData.push({
            nhom,
            agentCode,
            agentName,
            position,
            startDate: parseDate(startDateStr),
          });
        }

        let synced = 0;
        if (recruitersData.length > 0) {
          try {
            const result = await db.recruiter.createMany({
              data: recruitersData,
              skipDuplicates: true,
            });
            synced = result.count;
          } catch {
            for (const r of recruitersData) {
              try {
                await db.recruiter.create({ data: r });
                synced++;
              } catch {
                // Skip duplicates or errors
              }
            }
          }
        }

        results.recruiters = synced;
      } catch (err) {
        results.errors.push(`NYD: ${err instanceof Error ? err.message : 'Lỗi'}`);
      }
    }

    const message = `Đã đồng bộ: ${results.contracts} HĐ | ${results.staff} NV | ${results.recruiters} NTD${results.errors.length > 0 ? ` | Lỗi: ${results.errors.join('; ')}` : ''}`;
    return NextResponse.json({ message, ...results });
  } catch (error) {
    console.error('Error syncing data:', error);
    return NextResponse.json(
      { error: 'Không thể đồng bộ: ' + (error instanceof Error ? error.message : 'Lỗi') },
      { status: 500 }
    );
  }
}
