import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedDataHubRequest, isDataHubImport } from '@/lib/data-hub-auth';

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

// The revenue dashboard groups a contract by issueDate, falling back to
// effectiveDate. Keep the replacement window on exactly the same rule.
function getCurrentBangkokMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit',
  }).formatToParts(new Date());
  const year = Number(parts.find(part => part.type === 'year')?.value);
  const month = Number(parts.find(part => part.type === 'month')?.value);
  return {
    from: new Date(Date.UTC(year, month - 1, 1)),
    until: new Date(Date.UTC(year, month, 1)),
    label: `${year}-${String(month).padStart(2, '0')}`,
  };
}

function isInMonth(date: Date | null, from: Date, until: Date) {
  return !!date && date >= from && date < until;
}

// POST /api/sync - Sync all 3 CSVs simultaneously
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (isDataHubImport(body) && !isAuthorizedDataHubRequest(request)) {
      return NextResponse.json({ error: 'Không được phép ghi dữ liệu Data Hub' }, { status: 401 });
    }
    const { contractCsv, staffCsv, recruiterCsv, replaceCurrentRevenueMonth } = body as {
      contractCsv?: string;
      staffCsv?: string;
      recruiterCsv?: string;
      replaceCurrentRevenueMonth?: boolean;
    };
    const replaceDataHubCurrentRevenueMonth = isDataHubImport(body) && replaceCurrentRevenueMonth === true;

    const results = { contracts: 0, deletedContracts: 0, currentMonth: '', staff: 0, recruiters: 0, errors: [] as string[] };

    // 1. Import Contracts — HEADER-BASED mapping (không dùng vị trí cột nữa!)
    if (contractCsv) {
      try {
        const rows = parseCSV(contractCsv);
        const records = csvToObjects(rows);
        const seenContractNumbers = new Set<string>();
        let upserted = 0;

        // A blank Số HĐ is a valid business value. PostgreSQL unique indexes
        // allow many NULLs, so the database can preserve it as truly blank.
        await db.$executeRawUnsafe('ALTER TABLE "Contract" ALTER COLUMN "contractNumber" DROP NOT NULL');

        // The local Tamthu file is authoritative for the current month only.
        // Validate real HĐ numbers before deleting anything, then remove stale
        // records and upsert the file. Blank HĐ numbers are allowed.
        let importRows = records.map((row, index) => ({ row, index }));
        let currentMonth = '';
        if (replaceDataHubCurrentRevenueMonth) {
          const window = getCurrentBangkokMonth();
          currentMonth = window.label;
          importRows = importRows.filter(({ row }) => {
            const issueDate = parseDate(getVal(row, 'Ngày phát hành', 'Ngày PH', 'Ngày cấp', 'issueDate'));
            const effectiveDate = parseDate(getVal(row, 'Ngày hiệu lực', 'Ngày HL', 'effectiveDate'));
            return isInMonth(issueDate || effectiveDate, window.from, window.until) && !!effectiveDate;
          });

          if (importRows.length === 0) {
            throw new Error(`Không có HĐ hợp lệ của tháng ${currentMonth} trong file; dữ liệu trên app không bị xóa.`);
          }

          const realNumbers = new Set<string>();
          const duplicates = new Set<string>();
          for (const { row } of importRows) {
            const contractNumber = getVal(row, 'Số hợp đồng', 'Số HĐ', 'contractNumber').trim();
            if (!contractNumber) continue;
            if (realNumbers.has(contractNumber)) duplicates.add(contractNumber);
            realNumbers.add(contractNumber);
          }
          if (duplicates.size > 0) {
            throw new Error(`Số HĐ trùng trong file tháng ${currentMonth}: ${[...duplicates].slice(0, 10).join(', ')}. Không xóa hoặc cập nhật dữ liệu.`);
          }

          // The current month is fully rebuilt from the file. Historical
          // months are untouched, while any cancellation or edited row in the
          // source is reflected exactly after this replacement.
          const deleted = await db.contract.deleteMany({
            where: {
              OR: [
                { issueDate: { gte: window.from, lt: window.until } },
                { issueDate: null, effectiveDate: { gte: window.from, lt: window.until } },
              ],
            },
          });
          results.deletedContracts = deleted.count;
          results.currentMonth = currentMonth;
        }

        for (const { row, index } of importRows) {
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
          // Blank contract numbers use a unique import key and are removed at
          // the next authoritative current-month replacement.
          const finalContractNumber = contractNumber || `AUTO_${currentMonth.replace('-', '') || 'IMPORT'}_${String(index + 1).padStart(6, '0')}`;
          if (seenContractNumbers.has(finalContractNumber)) {
            throw new Error(`Số HĐ trùng sau khi chuẩn hóa: ${finalContractNumber}`);
          }
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
            const savedContract = await db.contract.upsert({
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
            if (!contractNumber.trim()) {
              await db.$executeRawUnsafe('UPDATE "Contract" SET "contractNumber" = NULL WHERE "id" = $1', savedContract.id);
            }
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

    // 2. Import Staff CSV — header-based mapping
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
          const startDateStr = getVal(row, 'Ngày bắt đầu', 'startDate');

          if (!maNhom && nhom) maNhom = nhomToMaNhom.get(nhom) || '';
          if (!agentCode || !agentName) continue;

          try {
            await db.staff.upsert({
              where: { agentCode },
              update: { nhom, maNhom, agentName, position, startDate: parseDate(startDateStr) },
              create: { nhom, maNhom, agentCode, agentName, position, startDate: parseDate(startDateStr) },
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
