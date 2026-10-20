import { db } from '@/lib/db';
import { CARRYOVER_SETTING_PREFIX } from '@/lib/carryover-contracts';
import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedDataHubRequest, isDataHubImport, isGoogleSyncImport } from '@/lib/data-hub-auth';
import { parseBusinessNumber } from '@/lib/parse-business-number';
import { getSyncSource } from '@/lib/sync-source';

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
  return parseBusinessNumber(numStr);
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

const TAMTHU_SOURCE_PREFIX = 'NMC_TAMTHU:';
const DOANHSO_SOURCE_PREFIX = 'NMC_DOANHSO:';
const revenueSourceMonth = (source: string): string | null => {
  const match = source.match(/^NMC_(?:TAMTHU|DOANHSO):(\d{4})-(\d{2})(?:\||$)/);
  return match ? `${match[1]}-${match[2]}` : null;
};

function tagTamthuSourceMonth(rawSource: string, month: string): string {
  const original = rawSource.replace(/^NMC_TAMTHU:\d{4}-\d{2}\|?/, '').trim();
  return `${TAMTHU_SOURCE_PREFIX}${month}${original ? `|${original}` : ''}`;
}

// POST /api/sync - Sync all 3 CSVs simultaneously
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fromDataHub = isDataHubImport(body);
    const fromGoogleSync = isGoogleSyncImport(body);
    if (fromDataHub && !isAuthorizedDataHubRequest(request)) {
      return NextResponse.json({ error: 'Không được phép ghi dữ liệu Data Hub' }, { status: 401 });
    }
    const activeSource = await getSyncSource();
    if (fromDataHub && activeSource !== 'data-hub') {
      return NextResponse.json({ error: 'Data Hub đã tắt vì Google Sheets đang là nguồn đồng bộ' }, { status: 409 });
    }
    if (fromGoogleSync && activeSource !== 'google') {
      return NextResponse.json({ error: 'Google Sheets đã tắt vì Data Hub trên máy tính đang là nguồn đồng bộ' }, { status: 409 });
    }
    const { contractCsv, staffCsv, recruiterCsv, replaceCurrentRevenueMonth, replaceHistoricalRevenueMonths, replaceRevenueMonths } = body as {
      contractCsv?: string;
      staffCsv?: string;
      recruiterCsv?: string;
      replaceCurrentRevenueMonth?: boolean;
      replaceHistoricalRevenueMonths?: string[];
      replaceRevenueMonths?: string[];
    };
    const carryoverMonth = body.carryoverMonth as string | undefined;
    const carryoverOnly = carryoverMonth !== undefined;
    if (carryoverOnly && (carryoverMonth !== getCurrentBangkokMonth().label || replaceCurrentRevenueMonth || replaceHistoricalRevenueMonths || replaceRevenueMonths || staffCsv || recruiterCsv)) {
      return NextResponse.json({ error: 'HĐ tồn chỉ nhận sheet tháng hiện tại và không được ghi kèm doanh thu/cấu trúc' }, { status: 400 });
    }
    if (carryoverOnly && (!contractCsv || typeof contractCsv !== 'string')) return NextResponse.json({ error: 'Thiếu dữ liệu sheet HĐ tồn' }, { status: 400 });
    const validMonth = (month: unknown): month is string => typeof month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
    const replaceDataHubCurrentRevenueMonth = fromDataHub && replaceCurrentRevenueMonth === true;
    const historicalRevenueMonths = fromDataHub && Array.isArray(replaceHistoricalRevenueMonths)
      ? replaceHistoricalRevenueMonths.filter(validMonth)
      : [];
    const googleRevenueMonths = fromGoogleSync && Array.isArray(replaceRevenueMonths)
      ? replaceRevenueMonths.filter(validMonth)
      : [];
    const replacementRevenueMonths = historicalRevenueMonths.length > 0 ? historicalRevenueMonths : googleRevenueMonths;

    const results = { contracts: 0, deletedContracts: 0, currentMonth: '', historicalMonths: [] as string[], staff: 0, recruiters: 0, errors: [] as string[] };

    // 1. Import Contracts — HEADER-BASED mapping (không dùng vị trí cột nữa!)
    if (contractCsv) {
      try {
        const rows = parseCSV(contractCsv);
        const records = csvToObjects(rows);
        if (carryoverOnly) {
          const headers = rows[0] || [];
          const has = (...names: string[]) => names.some(name => headers.includes(name));
          if (!has('Mã ĐL', 'Mã đại lý', 'Mã số', 'agentCode') || !has('Ngày hiệu lực', 'Ngày HL', 'effectiveDate') || !has('Ngày phát hành', 'Ngày PH', 'Ngày cấp', 'issueDate') || !has('AFYP', 'afyp') || !has('PĐT + 10% ĐT', 'IP+10%PĐT', 'PĐT+10%ĐT', 'pdt10DT')) throw new Error('Sheet HĐ tồn thiếu tiêu đề bắt buộc, giữ dữ liệu cũ.');
          if (records.some(row => Object.values(row).some(Boolean) && !getVal(row, 'Mã ĐL', 'Mã đại lý', 'Mã số', 'agentCode'))) throw new Error('Sheet HĐ tồn có dòng thiếu mã TVV, giữ dữ liệu cũ.');
        }
        const seenContractNumbers = new Set<string>();
        let upserted = 0;
        const authoritativeReplacement = carryoverOnly || replaceDataHubCurrentRevenueMonth || replacementRevenueMonths.length > 0;
        const contractsToCreate: any[] = [];
        let currentMonthWindow: ReturnType<typeof getCurrentBangkokMonth> | null = null;

        // contractNumber nullability is a schema concern handled by migrations.
        // Never execute ALTER TABLE from a serverless runtime request.

        // The local Tamthu file is authoritative for the current month only.
        // Validate all real HĐ numbers before deleting anything, then remove
        // stale records and upsert the file. Blank HĐ numbers are allowed.
        let importRows = records.map((row, index) => ({ row, index }));
        let currentMonth = '';
        if (replaceDataHubCurrentRevenueMonth) {
          const window = getCurrentBangkokMonth();
          currentMonth = window.label;
          currentMonthWindow = window;
          // Sheet 4: giữ TẤT CẢ các hàng dữ liệu thực, kể cả thiếu Mã ĐL và ngày.
          // Data Hub đã bỏ hàng hoàn toàn trống khi chuyển Excel sang CSV.
          if (importRows.length === 0) {
            throw new Error(`Không có dòng nào có Mã đại lý trong Tạm thu tháng ${currentMonth}; dữ liệu trên app không bị xóa.`);
          }

          results.currentMonth = currentMonth;
        }

        // Doanhso.xlsx is the authoritative source for completed months.
        // The Data Hub never sends the current month here (Tamthu owns it).
        if (replacementRevenueMonths.length > 0) {
          const requestedMonths = [...new Set(replacementRevenueMonths)];
          const requestedSet = new Set(requestedMonths);
          const activeMonth = getCurrentBangkokMonth().label;
          if (fromDataHub && requestedSet.has(activeMonth)) throw new Error(`Không được thay thế tháng hiện tại ${activeMonth} từ Doanhso.`);
          importRows = importRows.filter(({ row }) => {
            if (fromDataHub) {
              // Doanhso.xlsx: tháng = tên Sheet (đã ghi NMC_DOANHSO:YYYY-MM).
              // Không lọc bản ghi theo ngày PH/HL, mã TVV hoặc chỉ tiêu.
              const month = revenueSourceMonth(getVal(row, 'Nguồn dữ liệu', 'Nguồn DL', 'nguonDuLieu'));
              if (!month) throw new Error('Thiếu nhãn tháng nguồn Doanhso trong dữ liệu Data Hub. Hãy nâng cấp Data Hub trước khi đồng bộ.');
              return requestedSet.has(month);
            }
            // Giữ hợp đồng Google cũ theo quy tắc nhập của nguồn Google.
            const issueDate = parseDate(getVal(row, 'Ngày phát hành', 'Ngày PH', 'Ngày cấp', 'issueDate'));
            const effectiveDate = parseDate(getVal(row, 'Ngày hiệu lực', 'Ngày HL', 'effectiveDate'));
            const date = issueDate || effectiveDate;
            if (!date || !effectiveDate) return false;
            const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
            return requestedSet.has(month);
          });
          // An empty completed-month sheet from the authenticated Data Hub is
          // still authoritative: delete stale rows for that month and import
          // nothing. Other import channels keep the existing non-empty guard.
          if (importRows.length === 0 && !fromDataHub) {
            throw new Error('Nguồn đồng bộ không có HĐ hợp lệ cho các tháng cần cập nhật; dữ liệu app không bị xóa.');
          }
          // Xóa và tạo mới được thực hiện SAU khi đọc đủ hàng, trong cùng transaction.
          // HĐ trùng mã cũng phải được giữ đủ dòng; xử lý khóa unique ở bước tạo.
          results.historicalMonths = requestedMonths;
        }

        // A full historical workbook can contain hundreds of contracts. Process
        // modest parallel batches so Data Hub imports finish within Vercel's
        // function limit, while keeping the database connection pool healthy.
        const batchSize = 20;
        for (let batchStart = 0; batchStart < importRows.length; batchStart += batchSize) {
          const batch = importRows.slice(batchStart, batchStart + batchSize);
          await Promise.all(batch.map(async ({ row, index }) => {
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
          const contractStatus = getVal(row, 'Tình trạng hợp đồng', 'Tình trạng HĐ', 'Tình trạng', 'contractStatus');
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

          if (!authoritativeReplacement && !agentCode) return;
          if (!authoritativeReplacement && !effectiveDateStr) return;
          // Blank contract numbers are normalised to a unique import key. They
          // are removed at the next authoritative current-month replacement.
          const finalContractNumber = contractNumber || (() => {
            return `AUTO_${currentMonth.replace('-', '') || 'IMPORT'}_${String(index + 1).padStart(6, '0')}`;
          })();
          if (!authoritativeReplacement) {
            if (seenContractNumbers.has(finalContractNumber)) {
              throw new Error(`Số HĐ trùng sau khi chuẩn hóa: ${finalContractNumber}`);
            }
            seenContractNumbers.add(finalContractNumber);
          }

          const effectiveDate = parseDate(effectiveDateStr);
          const issueDate = parseDate(issueDateStr);
          const startDate = parseDate(startDateStr);
          const ngayBatDauLamViec2 = parseDate(ngayBatDauLamViec2Str);
          if (!authoritativeReplacement && !effectiveDate) return;

          if (carryoverOnly && ((effectiveDateStr && (!effectiveDate || !Number.isFinite(effectiveDate.getTime()))) || (issueDateStr && (!issueDate || !Number.isFinite(issueDate.getTime()))))) throw new Error('Ngày trong HĐ tồn không hợp lệ, giữ dữ liệu cũ.');
          const fyp = parseNumber(fypStr) || parseNumber(pdt10DTStr); // FYP fallback to PĐT+10%
          const afyp = parseNumber(afypStr);
          const tinhLuot3tr = parseNumber(tinhLuot3trStr);

          if (authoritativeReplacement) {
            contractsToCreate.push({
              stt: parseInt(sttStr) || 0,
              contractNumber: contractNumber || null,
              agentCode, agentName, position, ban, nhom, maNhom, leaderAgentCode,
              maTruongBan, maBanNhom: '', maTruongBanNhom: '', maDL: '',
              ngayBatDauLamViec: startDate, recruiterCode: recruiterCode || '', startDate,
              effectiveDate, issueDate, contractStatus, pdt10DT: parseNumber(pdt10DTStr), fyp,
              nguonDuLieu: replaceDataHubCurrentRevenueMonth
                ? tagTamthuSourceMonth(nguonDuLieu, currentMonth)
                : nguonDuLieu,
              hopDongToChuc, dkDongPhi,
              phiDongThem: parseNumber(phiDongThemStr),
              afypChuaTru10DT: parseNumber(afypChuaTru10DTStr), afyp, ad, nhom2,
              ngayBatDauLamViec2, thangTD: parseInt(thangTDStr) || 0,
              namTD: parseInt(namTDStr) || 0, thangHL: parseInt(thangHLStr) || 0,
              tinhLuot3tr, maDaiLyTD, danhDauTVV, chucVu2,
            });
            upserted++;
            return;
          }

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
                // Ngày phát hành là dữ liệu thô: để trống trong Excel thì giữ trống.
                // Không được suy diễn từ ngày hiệu lực.
                issueDate,
                contractStatus,
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
                // Ngày phát hành là dữ liệu thô: để trống trong Excel thì giữ trống.
                // Không được suy diễn từ ngày hiệu lực.
                issueDate,
                contractStatus,
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
          }));
        }

        if (carryoverOnly) {
          const now = new Date().toISOString();
          const snapshot = { month: carryoverMonth, updatedAt: now, contracts: contractsToCreate.map((row, index) => ({ ...row, id: `carryover:${carryoverMonth}:${index + 1}`, contractNumber: row.contractNumber || '', carryoverMonth })) };
          const key = `${CARRYOVER_SETTING_PREFIX}${carryoverMonth}`;
          const value = JSON.stringify(snapshot);
          await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
          return NextResponse.json({ success: true, carryoverMonth, count: snapshot.contracts.length, errors: [] });
        }
        if (authoritativeReplacement) {
          // Import nguyên vẹn từng hàng của Sheet gốc. Không loại trùng theo HĐ;
          // do Contract.contractNumber UNIQUE, bản ghi trùng mã được lưu NULL
          // ở cột khóa, còn số HĐ thật được ghi trong nguồn dữ liệu để truy vết.
          // Toàn bộ DELETE + CREATE nằm trong transaction: nếu lỗi, DB giữ bản cũ.
          const result = await db.$transaction(async tx => {
            let deletedCount = 0;
            if (replaceDataHubCurrentRevenueMonth && currentMonthWindow) {
              const window = currentMonthWindow;
              const removed = await tx.contract.deleteMany({ where: { OR: [
                { nguonDuLieu: { startsWith: TAMTHU_SOURCE_PREFIX } },
                { AND: [
                  { nguonDuLieu: { not: { startsWith: DOANHSO_SOURCE_PREFIX } } },
                  { OR: [
                    { issueDate: { gte: window.from, lt: window.until } },
                    { issueDate: null, effectiveDate: { gte: window.from, lt: window.until } },
                  ] },
                ] },
              ] } });
              deletedCount += removed.count;
            }
            if (replacementRevenueMonths.length > 0) {
              for (const month of [...new Set(replacementRevenueMonths)]) {
                const from = new Date(`${month}-01T00:00:00.000Z`);
                const until = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
                const removed = await tx.contract.deleteMany({ where: { OR: [
                  { nguonDuLieu: { startsWith: `${DOANHSO_SOURCE_PREFIX}${month}` } },
                  { AND: [
                    { nguonDuLieu: { not: { startsWith: DOANHSO_SOURCE_PREFIX } } },
                    { nguonDuLieu: { not: { startsWith: TAMTHU_SOURCE_PREFIX } } },
                    { OR: [
                      { issueDate: { gte: from, lt: until } },
                      { issueDate: null, effectiveDate: { gte: from, lt: until } },
                    ] },
                  ] },
                ] } });
                deletedCount += removed.count;
              }
            }
            const numbers = [...new Set(contractsToCreate.map(c => c.contractNumber).filter(Boolean))];
            const existing = numbers.length ? await tx.contract.findMany({
              where: { contractNumber: { in: numbers } },
              select: { contractNumber: true },
            }) : [];
            const usedNumbers = new Set(existing.map(c => c.contractNumber).filter(Boolean));
            let duplicates = 0;
            for (const item of contractsToCreate) {
              const number = item.contractNumber;
              if (!number) continue;
              if (usedNumbers.has(number)) {
                item.contractNumber = null;
                item.nguonDuLieu = `${item.nguonDuLieu || ''}|SO_HD_GOC:${number}`;
                duplicates++;
              } else {
                usedNumbers.add(number);
              }
            }
            const created = contractsToCreate.length
              ? await tx.contract.createMany({ data: contractsToCreate })
              : { count: 0 };
            if (created.count !== contractsToCreate.length) throw new Error('Số hàng nhập khác Sheet nguồn, đã hủy transaction.');
            return { deletedCount, importedCount: created.count, duplicates };
          }, { timeout: 60000 });
          results.deletedContracts += result.deletedCount;
          results.contracts = result.importedCount;
          if (result.duplicates > 0) {
            // Cảnh báo không phải lỗi: vẫn đưa đủ mọi dòng vào tháng nguồn.
            console.info(`[Revenue sync] Đã giữ ${result.duplicates} dòng trùng Số HĐ bằng khóa NULL, số gốc nằm trong Nguồn dữ liệu.`);
          }
        } else {
          results.contracts = upserted;
        }
      } catch (err) {
        if (carryoverOnly) return NextResponse.json({ error: err instanceof Error ? err.message : 'Không thể nhập HĐ tồn' }, { status: 400 });
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

        const validRecords = records.filter(row =>
          !!getVal(row, 'Mã số', 'Mã TN', 'Mã trưởng nhóm', 'agentCode') &&
          !!getVal(row, 'Họ tên', 'Họ tên TN', 'agentName')
        );
        if (fromGoogleSync && validRecords.length === 0) {
          throw new Error('Google Sheets không có dòng nhân sự hợp lệ; dữ liệu cũ không bị xóa.');
        }
        if (fromGoogleSync) await db.staff.deleteMany({});

        let upserted = 0;
        for (const row of validRecords) {
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
          if (fromGoogleSync) await db.recruiter.deleteMany({});
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
