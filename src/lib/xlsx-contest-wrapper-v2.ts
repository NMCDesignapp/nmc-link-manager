import * as XLSXCore from 'xlsx-js-style';

export * from 'xlsx-js-style';
export const utils = XLSXCore.utils;
export const read = XLSXCore.read;
export const write = XLSXCore.write;

type CellValue = string | number | boolean | Date | null | undefined;
type Matrix = CellValue[][];
type MergeRange = { s: { r: number; c: number }; e: { r: number; c: number } };

type DetailRecord = {
  agentName: string;
  startDate: CellValue;
  contractNumber: string;
};

type SheetInfo = { name: string; sheet: any };

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
  fill: { fgColor: { rgb: '103667' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: '8EA9C1' } },
    bottom: { style: 'thin', color: { rgb: '8EA9C1' } },
    left: { style: 'thin', color: { rgb: '8EA9C1' } },
    right: { style: 'thin', color: { rgb: '8EA9C1' } },
  },
};

const BODY_STYLE = {
  font: { sz: 11 },
  alignment: { vertical: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: 'D9E2F3' } },
    bottom: { style: 'thin', color: { rgb: 'D9E2F3' } },
    left: { style: 'thin', color: { rgb: 'D9E2F3' } },
    right: { style: 'thin', color: { rgb: 'D9E2F3' } },
  },
};

const LEADER_STYLE = {
  ...BODY_STYLE,
  font: { bold: true, color: { rgb: '103667' }, sz: 11 },
  fill: { fgColor: { rgb: 'DDEBF7' } },
};

function text(value: CellValue): string {
  return value == null ? '' : String(value).trim();
}

function normalized(value: CellValue): string {
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function findHeader(headers: CellValue[], candidates: string[], partial = false): number {
  const values = headers.map(normalized);
  const wanted = candidates.map(normalized);
  for (const candidate of wanted) {
    const exact = values.indexOf(candidate);
    if (exact >= 0) return exact;
  }
  if (partial) {
    for (let i = 0; i < values.length; i++) {
      if (wanted.some(candidate => values[i].includes(candidate))) return i;
    }
  }
  return -1;
}

function sheetMatrix(sheet: any): Matrix {
  if (!sheet) return [];
  return XLSXCore.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: '',
    blankrows: false,
  }) as Matrix;
}

function existingSheet(workbook: any, names: string[]): SheetInfo | null {
  for (const name of names) {
    if (workbook?.Sheets?.[name]) return { name, sheet: workbook.Sheets[name] };
  }
  return null;
}

function parseDetails(matrix: Matrix): DetailRecord[] {
  if (matrix.length < 2) return [];
  const headers = matrix[0] || [];
  const nameIdx = findHeader(headers, ['Tên', 'Họ tên']);
  const startDateIdx = findHeader(headers, ['Ngày bắt đầu làm việc', 'Ngày BĐLV']);
  const contractIdx = findHeader(headers, ['Số hợp đồng', 'Số HĐ']);

  return matrix.slice(1).map(row => ({
    agentName: nameIdx >= 0 ? text(row[nameIdx]) : '',
    startDate: startDateIdx >= 0 ? row[startDateIdx] : '',
    contractNumber: contractIdx >= 0 ? text(row[contractIdx]) : '',
  })).filter(row => row.agentName || row.contractNumber);
}

function isTVVmActivityResult(headers: CellValue[]): boolean {
  return headers.some(header => {
    const value = normalized(header);
    return value.includes('LUOT') && value.includes('TVVM');
  });
}

function cloneMerges(merges: MergeRange[] | undefined): MergeRange[] {
  return (merges || []).map(merge => ({
    s: { r: merge.s.r, c: merge.s.c },
    e: { r: merge.e.r, c: merge.e.c },
  }));
}

function shiftMergesForInsertedColumn(merges: MergeRange[], insertAt: number): MergeRange[] {
  return merges.map(merge => ({
    s: {
      r: merge.s.r,
      c: merge.s.c >= insertAt ? merge.s.c + 1 : merge.s.c,
    },
    e: {
      r: merge.e.r,
      c: merge.e.c >= insertAt ? merge.e.c + 1 : merge.e.c,
    },
  }));
}

function compareVietnameseName(a: CellValue, b: CellValue): number {
  const aa = text(a);
  const bb = text(b);
  if (!aa && !bb) return 0;
  if (!aa) return 1;
  if (!bb) return -1;
  return aa.localeCompare(bb, 'vi', { sensitivity: 'base' });
}

function resultBlockStarts(matrix: Matrix): number[] {
  if (matrix.length < 2) return [];
  const headers = matrix[0] || [];
  const isNTD = findHeader(headers, ['Họ tên NTD']) >= 0;
  const leaderNameIdx = isNTD
    ? findHeader(headers, ['Họ tên NTD'])
    : findHeader(headers, ['Tên TTN', 'Họ tên TN']);
  const leaderCodeIdx = isNTD
    ? findHeader(headers, ['Mã ĐL', 'Mã số NTD'])
    : findHeader(headers, ['Mã TTN', 'Mã TN']);

  if (leaderNameIdx < 0 && leaderCodeIdx < 0) return [];

  const starts: number[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r] || [];
    const hasLeader = (leaderNameIdx >= 0 && text(row[leaderNameIdx]))
      || (leaderCodeIdx >= 0 && text(row[leaderCodeIdx]));
    if (hasLeader) starts.push(r);
  }
  if (!starts.length && matrix.length > 1) starts.push(1);
  return starts;
}

function sortTVVDetailColumns(matrix: Matrix): Matrix {
  if (matrix.length < 3) return matrix;
  const headers = matrix[0] || [];
  const tvvIdx = findHeader(headers, ['Họ tên TVV', 'TVV']);
  if (tvvIdx < 0) return matrix;

  const detailEndCandidates = [
    findHeader(headers, ['Số hợp đồng', 'Số HĐ']),
    findHeader(headers, ['Ngày hiệu lực']),
    findHeader(headers, ['Ngày phát hành']),
    findHeader(headers, ['IP']),
    findHeader(headers, ['AFYP']),
  ].filter(index => index >= tvvIdx);
  const detailEnd = detailEndCandidates.length ? Math.max(...detailEndCandidates) : tvvIdx + 1;

  const starts = resultBlockStarts(matrix);
  if (!starts.length) return matrix;

  const next = matrix.map(row => [...row]);
  for (let block = 0; block < starts.length; block++) {
    const start = starts[block];
    const end = block + 1 < starts.length ? starts[block + 1] - 1 : next.length - 1;
    if (end <= start) continue;

    const slices = next.slice(start, end + 1).map(row => row.slice(tvvIdx, detailEnd + 1));
    slices.sort((a, b) => {
      const byName = compareVietnameseName(a[0], b[0]);
      if (byName !== 0) return byName;
      return text(a[2]).localeCompare(text(b[2]), 'vi', { sensitivity: 'base' });
    });
    for (let offset = 0; offset < slices.length; offset++) {
      next[start + offset].splice(tvvIdx, detailEnd - tvvIdx + 1, ...slices[offset]);
    }
  }
  return next;
}

function transformTVVmResult(
  matrix: Matrix,
  details: DetailRecord[],
  originalMerges: MergeRange[],
): { matrix: Matrix; merges: MergeRange[] } {
  if (!isTVVmActivityResult(matrix[0] || [])) {
    return { matrix, merges: cloneMerges(originalMerges) };
  }

  let next = matrix.map(row => [...row]);
  let merges = cloneMerges(originalMerges);
  let headers = next[0] || [];
  let tvvIdx = findHeader(headers, ['Họ tên TVV', 'TVV']);
  if (tvvIdx < 0) return { matrix: next, merges };

  const immediateNext = normalized(headers[tvvIdx + 1]);
  const alreadyHasStartDate = immediateNext.includes('NGAY BAT DAU');
  if (!alreadyHasStartDate) {
    const contractIdx = findHeader(headers, ['Số hợp đồng', 'Số HĐ']);
    const byContract = new Map<string, DetailRecord>();
    const byName = new Map<string, DetailRecord>();
    for (const detail of details) {
      const contractKey = normalized(detail.contractNumber);
      const nameKey = normalized(detail.agentName);
      if (contractKey && !byContract.has(contractKey)) byContract.set(contractKey, detail);
      if (nameKey && !byName.has(nameKey)) byName.set(nameKey, detail);
    }

    const insertAt = tvvIdx + 1;
    next[0] = [...headers.slice(0, insertAt), 'Ngày bắt đầu làm việc', ...headers.slice(insertAt)];
    for (let r = 1; r < next.length; r++) {
      const row = next[r] || [];
      const contract = contractIdx >= 0 ? text(row[contractIdx]) : '';
      const tvvName = text(row[tvvIdx]);
      const detail = byContract.get(normalized(contract)) || byName.get(normalized(tvvName));
      next[r] = [...row.slice(0, insertAt), detail?.startDate ?? '', ...row.slice(insertAt)];
    }
    merges = shiftMergesForInsertedColumn(merges, insertAt);
    headers = next[0] || [];
    tvvIdx = findHeader(headers, ['Họ tên TVV', 'TVV']);
  }

  next = sortTVVDetailColumns(next);
  return { matrix: next, merges };
}

function isCenterColumn(header: CellValue): boolean {
  const h = normalized(header);
  return h === 'STT'
    || h === 'HANG'
    || h.startsWith('MA ')
    || h.startsWith('MA SO')
    || h.includes('SO HD')
    || h.includes('SO HOP DONG')
    || h.includes('NGAY')
    || h === 'IP'
    || h === 'AFYP'
    || h === 'AD'
    || h.includes('PDT')
    || h.includes('LUOT')
    || h.includes('TONG')
    || h.includes('THUONG')
    || h.includes('TY LE');
}

function columnFloor(header: CellValue): number {
  const h = normalized(header);
  if (h === 'STT' || h === 'HANG') return 7;
  if (h.includes('GHI CHU')) return 28;
  if (h.includes('HO TEN') || h === 'TEN' || h.includes('TVV')) return 24;
  if (h.includes('CHUC VU')) return 18;
  if (h.includes('NGAY')) return 15;
  if (h.includes('SO HD') || h.includes('SO HOP DONG')) return 18;
  if (h.startsWith('MA')) return 14;
  if (h.includes('NHOM') || h === 'BAN') return 18;
  if (h.includes('THUONG')) return 18;
  if (h === 'IP' || h === 'AFYP' || h.includes('PDT') || h.includes('TONG') || h.includes('LUOT')) return 16;
  return 12;
}

function styleSheet(
  matrix: Matrix,
  merges: MergeRange[] = [],
  leaderRows: number[] = [],
): any {
  const headers = matrix[0] || [];
  const rows = matrix.slice(1);
  const sheet = XLSXCore.utils.aoa_to_sheet(matrix);
  const range = XLSXCore.utils.decode_range(sheet['!ref'] || 'A1:A1');
  const leaderSet = new Set(leaderRows);

  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const address = XLSXCore.utils.encode_cell({ r, c });
      const cell = sheet[address];
      if (!cell) continue;
      if (r === 0) {
        cell.s = HEADER_STYLE;
        continue;
      }

      const base = leaderSet.has(r) ? LEADER_STYLE : BODY_STYLE;
      const horizontal = typeof cell.v === 'number' || isCenterColumn(headers[c]) ? 'center' : 'left';
      cell.s = {
        ...base,
        alignment: { horizontal, vertical: 'center', wrapText: true },
      };
      if (typeof cell.v === 'number') cell.z = '#,##0';
    }
  }

  sheet['!rows'] = [{ hpt: 32 }, ...rows.map(() => ({ hpt: 24 }))];
  sheet['!cols'] = headers.map((header, col) => {
    const max = Math.max(
      text(header).length,
      ...rows.map(row => text(row[col]).length),
    );
    const floor = columnFloor(header);
    const cap = normalized(header).includes('GHI CHU') ? 42 : 36;
    return { wch: Math.min(Math.max(max + 2, floor), cap) };
  });
  if (headers.length) {
    sheet['!autofilter'] = {
      ref: XLSXCore.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }),
    };
  }
  if (merges.length) sheet['!merges'] = cloneMerges(merges);
  sheet['!views'] = [{ state: 'frozen', ySplit: 1 }];
  return sheet;
}

function normalizeContestWorkbook(workbook: any): void {
  const resultInfo = existingSheet(workbook, ['Kết quả thi đua', 'Kết quả', 'Kết_quả']);
  if (!resultInfo) return;
  const detailInfo = existingSheet(workbook, ['Chi tiết HĐ', 'Chi tiết', 'Chi_tiết']);

  const resultMatrix = sheetMatrix(resultInfo.sheet);
  if (!resultMatrix.length) return;
  const detailMatrix = detailInfo ? sheetMatrix(detailInfo.sheet) : [];
  const details = parseDetails(detailMatrix);

  const transformed = transformTVVmResult(
    resultMatrix,
    details,
    cloneMerges(resultInfo.sheet?.['!merges']),
  );
  const leaderRows = resultBlockStarts(transformed.matrix);
  workbook.Sheets[resultInfo.name] = styleSheet(transformed.matrix, transformed.merges, leaderRows);

  if (detailInfo && detailMatrix.length) {
    // Giữ nguyên tuyệt đối nội dung/cột/thứ tự của sheet Chi tiết, chỉ đồng bộ trình bày.
    workbook.Sheets[detailInfo.name] = styleSheet(
      detailMatrix,
      cloneMerges(detailInfo.sheet?.['!merges']),
      [],
    );
  }
}

export function writeFile(workbook: any, filename: string, options?: any): any {
  const resultInfo = existingSheet(workbook, ['Kết quả thi đua', 'Kết quả', 'Kết_quả']);
  const detailInfo = existingSheet(workbook, ['Chi tiết HĐ', 'Chi tiết', 'Chi_tiết']);
  const isContestWorkbook = Boolean(resultInfo && (detailInfo || resultInfo.name === 'Kết quả thi đua'));

  if (isContestWorkbook || /^ket_qua_thi_dua_/i.test(filename || '')) {
    try {
      normalizeContestWorkbook(workbook);
    } catch (error) {
      // Không bao giờ chặn việc tải file; nếu định dạng gặp lỗi thì vẫn lưu workbook gốc.
      console.error('[contest-excel-template] Không thể chuẩn hóa file:', error);
    }
  }
  return XLSXCore.writeFile(workbook, filename, options);
}

export default XLSXCore;
