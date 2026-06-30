/**
 * Utility: Export "Tôn vinh" data to Excel
 *
 * Output: 1 workbook with 4 sheets (one per Top 5 board):
 *   1. Top 5 TVV (IP H1)
 *   2. Top 5 TVVm (IP H1)  — excludes TVVm already in Top 5 TVV
 *   3. Top 5 Nhóm (IP H1)
 *   4. Nhóm hoàn thành KH H1 (AFYP)
 *
 * Uses xlsx-js-style (drop-in for SheetJS community, with full styling).
 */

import * as XLSX from 'xlsx-js-style';

// ============================================================================
// TYPES — must match vinhDanhData shape in quan-ly/page.tsx
// ============================================================================

export interface VinhDanhTvvRow {
  agentCode: string;
  agentName: string;
  maBanNhom: string;
  tenNhom: string;
  ip: number;
}

export interface VinhDanhNhomRow {
  maBanNhom: string;
  tenNhom: string;
  ip: number;
}

export interface VinhDanhHoanThanhRow {
  maBanNhom: string;
  tenNhom: string;
  afypH1: number;
  khH1: number;
  pct: number;
  hoanThanh: boolean;
}

export interface VinhDanhExportData {
  top5Tvv: VinhDanhTvvRow[];
  top5TvvM: VinhDanhTvvRow[];
  top5Nhom: VinhDanhNhomRow[];
  nhomHoanThanhKH: VinhDanhHoanThanhRow[];
  h1RatioPct: number;
  year: number;
}

// ============================================================================
// STYLING HELPERS
// ============================================================================

const HEADER_FILL: XLSX.CellObject['s'] = {
  fill: { patternType: 'solid', fgColor: { rgb: 'B45309' } }, // amber-700
  font: { bold: true, color: { rgb: 'FFF8E0' }, sz: 11, name: 'Calibri' },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: {
    top:    { style: 'thin', color: { rgb: 'FCD34D' } },
    bottom: { style: 'thin', color: { rgb: 'FCD34D' } },
    left:   { style: 'thin', color: { rgb: 'FCD34D' } },
    right:  { style: 'thin', color: { rgb: 'FCD34D' } },
  },
};

const BODY_CELL: XLSX.CellObject['s'] = {
  font: { color: { rgb: '1A2332' }, sz: 10, name: 'Calibri' },
  alignment: { vertical: 'center', wrapText: false },
  border: {
    top:    { style: 'thin', color: { rgb: 'E5E7EB' } },
    bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
    left:   { style: 'thin', color: { rgb: 'E5E7EB' } },
    right:  { style: 'thin', color: { rgb: 'E5E7EB' } },
  },
};

const RANK_COLORS: string[] = ['FFD700', 'C0C0C0', 'CD7F32', '9CA3AF', '9CA3AF']; // gold, silver, bronze, gray, gray

function rankCellStyle(rank: number): XLSX.CellObject['s'] {
  const color = RANK_COLORS[rank - 1] || '9CA3AF';
  return {
    fill: { patternType: 'solid', fgColor: { rgb: color } },
    font: { bold: true, color: { rgb: '1A2332' }, sz: 11, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BODY_CELL.border,
  };
}

function numberCellStyle(bold: boolean = false, color: string = '059669'): XLSX.CellObject['s'] {
  return {
    ...BODY_CELL,
    font: { bold, color: { rgb: color }, sz: 10, name: 'Calibri' },
    alignment: { horizontal: 'right', vertical: 'center' },
    numFmt: '#,##0',
  };
}

function textCellStyle(bold: boolean = false): XLSX.CellObject['s'] {
  return {
    ...BODY_CELL,
    font: { bold, color: { rgb: '1A2332' }, sz: 10, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'center' },
  };
}

// ============================================================================
// SHEET BUILDERS
// ============================================================================

/** Build sheet for Top 5 TVV or Top 5 TVVm */
function buildTvvSheet(
  title: string,
  subtitle: string,
  rows: VinhDanhTvvRow[],
  colWidths: { wch: number }[]
): XLSX.WorkSheet {
  const aoa: any[][] = [];
  const styles: XLSX.CellObject['s'][][] = [];

  // Row 0: Title (merged across 5 cols)
  aoa.push([title, '', '', '', '']);
  styles.push([
    { fill: { patternType: 'solid', fgColor: { rgb: '92400E' } }, font: { bold: true, color: { rgb: 'FFF8E0' }, sz: 13, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'center' } },
    null as any, null as any, null as any, null as any,
  ]);

  // Row 1: Subtitle (merged)
  aoa.push([subtitle, '', '', '', '']);
  styles.push([
    { fill: { patternType: 'solid', fgColor: { rgb: 'FEF3C7' } }, font: { italic: true, color: { rgb: '92400E' }, sz: 9, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'center' } },
    null as any, null as any, null as any, null as any,
  ]);

  // Row 2: Empty spacer
  aoa.push(['', '', '', '', '']);
  styles.push([null as any, null as any, null as any, null as any, null as any]);

  // Row 3: Header
  aoa.push(['Hạng', 'Mã số', 'Họ tên TVV', 'Nhóm', 'Tổng IP (đ)']);
  styles.push([HEADER_FILL, HEADER_FILL, HEADER_FILL, HEADER_FILL, HEADER_FILL]);

  // Data rows
  if (rows.length === 0) {
    aoa.push(['(Chưa có dữ liệu)', '', '', '', '']);
    styles.push([textCellStyle(true), textCellStyle(), textCellStyle(), textCellStyle(), textCellStyle()]);
  } else {
    rows.forEach((r, i) => {
      const rank = i + 1;
      aoa.push([rank, r.agentCode, r.agentName, r.tenNhom, r.ip]);
      styles.push([
        rankCellStyle(rank),
        textCellStyle(),
        textCellStyle(true),
        textCellStyle(),
        numberCellStyle(true),
      ]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Apply styles
  for (let r = 0; r < aoa.length; r++) {
    for (let c = 0; c < aoa[r].length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = ws[cellRef];
      if (cell) {
        const st = styles[r]?.[c];
        if (st) cell.s = st;
      }
    }
  }
  // Merges: title row (0) and subtitle row (1) merge across all 5 cols
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
  ];
  ws['!cols'] = colWidths;
  ws['!rows'] = [
    { hpt: 22 }, // title
    { hpt: 16 }, // subtitle
    { hpt: 6 },  // spacer
    { hpt: 22 }, // header
  ];
  return ws;
}

/** Build sheet for Top 5 Nhóm (IP) */
function buildNhomSheet(
  title: string,
  subtitle: string,
  rows: VinhDanhNhomRow[],
  colWidths: { wch: number }[]
): XLSX.WorkSheet {
  const aoa: any[][] = [];
  const styles: XLSX.CellObject['s'][][] = [];

  aoa.push([title, '', '', '']);
  styles.push([
    { fill: { patternType: 'solid', fgColor: { rgb: '92400E' } }, font: { bold: true, color: { rgb: 'FFF8E0' }, sz: 13, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'center' } },
    null as any, null as any, null as any,
  ]);

  aoa.push([subtitle, '', '', '']);
  styles.push([
    { fill: { patternType: 'solid', fgColor: { rgb: 'FEF3C7' } }, font: { italic: true, color: { rgb: '92400E' }, sz: 9, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'center' } },
    null as any, null as any, null as any,
  ]);

  aoa.push(['', '', '', '']);
  styles.push([null as any, null as any, null as any, null as any]);

  aoa.push(['Hạng', 'Nhóm', 'Mã nhóm', 'Tổng IP (đ)']);
  styles.push([HEADER_FILL, HEADER_FILL, HEADER_FILL, HEADER_FILL]);

  if (rows.length === 0) {
    aoa.push(['(Chưa có dữ liệu)', '', '', '']);
    styles.push([textCellStyle(true), textCellStyle(), textCellStyle(), textCellStyle()]);
  } else {
    rows.forEach((r, i) => {
      const rank = i + 1;
      aoa.push([rank, r.tenNhom, r.maBanNhom, r.ip]);
      styles.push([
        rankCellStyle(rank),
        textCellStyle(true),
        textCellStyle(),
        numberCellStyle(true),
      ]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  for (let r = 0; r < aoa.length; r++) {
    for (let c = 0; c < aoa[r].length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = ws[cellRef];
      if (cell) {
        const st = styles[r]?.[c];
        if (st) cell.s = st;
      }
    }
  }
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
  ];
  ws['!cols'] = colWidths;
  ws['!rows'] = [
    { hpt: 22 },
    { hpt: 16 },
    { hpt: 6 },
    { hpt: 22 },
  ];
  return ws;
}

/** Build sheet for Nhóm hoàn thành KH (AFYP) */
function buildHoanThanhSheet(
  title: string,
  subtitle: string,
  rows: VinhDanhHoanThanhRow[],
  colWidths: { wch: number }[]
): XLSX.WorkSheet {
  const aoa: any[][] = [];
  const styles: XLSX.CellObject['s'][][] = [];

  aoa.push([title, '', '', '', '', '']);
  styles.push([
    { fill: { patternType: 'solid', fgColor: { rgb: '92400E' } }, font: { bold: true, color: { rgb: 'FFF8E0' }, sz: 13, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'center' } },
    null as any, null as any, null as any, null as any, null as any,
  ]);

  aoa.push([subtitle, '', '', '', '', '']);
  styles.push([
    { fill: { patternType: 'solid', fgColor: { rgb: 'FEF3C7' } }, font: { italic: true, color: { rgb: '92400E' }, sz: 9, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'center' } },
    null as any, null as any, null as any, null as any, null as any,
  ]);

  aoa.push(['', '', '', '', '', '']);
  styles.push([null as any, null as any, null as any, null as any, null as any, null as any]);

  aoa.push(['STT', 'Nhóm', 'Mã nhóm', 'AFYP H1 (đ)', 'KH H1 (đ)', '% HT']);
  styles.push([HEADER_FILL, HEADER_FILL, HEADER_FILL, HEADER_FILL, HEADER_FILL, HEADER_FILL]);

  if (rows.length === 0) {
    aoa.push(['(Chưa có nhóm nào hoàn thành KH H1)', '', '', '', '', '']);
    styles.push([textCellStyle(true), textCellStyle(), textCellStyle(), textCellStyle(), textCellStyle(), textCellStyle()]);
  } else {
    rows.forEach((r, i) => {
      const stt = i + 1;
      aoa.push([stt, r.tenNhom, r.maBanNhom, r.afypH1, r.khH1, r.pct / 100]); // pct as decimal → format as %
      styles.push([
        textCellStyle(true),
        textCellStyle(true),
        textCellStyle(),
        numberCellStyle(true),
        numberCellStyle(false, '1A2332'),
        {
          ...BODY_CELL,
          font: { bold: true, color: { rgb: '059669' }, sz: 10, name: 'Calibri' },
          alignment: { horizontal: 'right', vertical: 'center' },
          numFmt: '0.0%',
        },
      ]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  for (let r = 0; r < aoa.length; r++) {
    for (let c = 0; c < aoa[r].length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = ws[cellRef];
      if (cell) {
        const st = styles[r]?.[c];
        if (st) cell.s = st;
      }
    }
  }
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
  ];
  ws['!cols'] = colWidths;
  ws['!rows'] = [
    { hpt: 22 },
    { hpt: 16 },
    { hpt: 6 },
    { hpt: 22 },
  ];
  return ws;
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export function downloadVinhDanhExcel(data: VinhDanhExportData): void {
  const wb = XLSX.utils.book_new();

  const tvvColWidths = [{ wch: 6 }, { wch: 14 }, { wch: 26 }, { wch: 22 }, { wch: 18 }];
  const nhomColWidths = [{ wch: 6 }, { wch: 26 }, { wch: 18 }, { wch: 18 }];
  const htColWidths = [{ wch: 6 }, { wch: 26 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 10 }];

  // Sheet 1: Top 5 TVV
  const ws1 = buildTvvSheet(
    `TOP 5 TVV — TỔNG IP CAO NHẤT 6 THÁNG ĐẦU NĂM ${data.year}`,
    `Kỳ tính: 6 tháng đầu năm (T01-T06) • IP = tổng FYP theo tháng phát hành`,
    data.top5Tvv,
    tvvColWidths
  );
  XLSX.utils.book_append_sheet(wb, ws1, 'Top 5 TVV');

  // Sheet 2: Top 5 TVVm
  const ws2 = buildTvvSheet(
    `TOP 5 TVVm — TỔNG IP CAO NHẤT 6 THÁNG ĐẦU NĂM ${data.year}`,
    `TVVm = TVV mới (≤12 tháng) • Lưu ý: TVVm đã lọt Top 5 TVV chung sẽ KHÔNG hiển thị ở đây (chỉ lấy hạng cao hơn)`,
    data.top5TvvM,
    tvvColWidths
  );
  XLSX.utils.book_append_sheet(wb, ws2, 'Top 5 TVVm');

  // Sheet 3: Top 5 Nhóm
  const ws3 = buildNhomSheet(
    `TOP 5 NHÓM — TỔNG IP CAO NHẤT 6 THÁNG ĐẦU NĂM ${data.year}`,
    `Kỳ tính: 6 tháng đầu năm (T01-T06) • IP = tổng FYP theo tháng phát hành • Loại trừ nhóm Banca`,
    data.top5Nhom,
    nhomColWidths
  );
  XLSX.utils.book_append_sheet(wb, ws3, 'Top 5 Nhóm');

  // Sheet 4: Nhóm hoàn thành KH
  const ws4 = buildHoanThanhSheet(
    `NHÓM KINH DOANH HOÀN THÀNH KẾ HOẠCH 6 THÁNG ĐẦU NĂM ${data.year}`,
    `AFYP H1 ≥ KH H1 (KH H1 = KH năm × ${(data.h1RatioPct * 100).toFixed(1)}% tỷ lệ tháng T01-T06) • Chỉ hiển thị các nhóm đã đạt`,
    data.nhomHoanThanhKH,
    htColWidths
  );
  XLSX.utils.book_append_sheet(wb, ws4, 'Nhóm hoàn thành KH');

  // Generate filename with current date
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
  const filename = `Ton-vinh-H1-${data.year}-${dateStr}.xlsx`;

  // Write & trigger download
  XLSX.writeFile(wb, filename);
}
