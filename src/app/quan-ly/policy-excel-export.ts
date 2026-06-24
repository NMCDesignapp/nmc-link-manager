/**
 * Utility: Export policy table to Excel with 2 sheets
 *   - Sheet 1 "Chính sách": scrape from DOM table, preserve styles (color, font, alignment)
 *   - Sheet 2 "Hợp đồng chi tiết": list of contracts used in calculations
 *
 * Uses xlsx-js-style (drop-in replacement for SheetJS community, with full styling support).
 */

import * as XLSX from 'xlsx-js-style';

// ============================================================================
// TYPES
// ============================================================================

export interface ContractDetailRow {
  stt: number;
  nhom: string;             // Nhóm KD
  maTVV: string;            // Mã TVV
  hoTenTVV: string;         // Họ tên TVV
  soHD: string;             // Số hợp đồng
  ngayPH: string;           // Ngày phát hành
  thangDS: string;          // Tháng doanh số (TXX/YYYY)
  pdt10DT: number;          // PĐT + 10% ĐT (IP)
  afyp: number;             // AFYP
  nguoiTD: string;          // Người tuyển dụng
  ghiChu: string;           // Ghi chú (changelog: tháng IP, chặng, v.v.)
}

export interface ScrapeResult {
  /** 2D array of cells: rows[r][c] = { v, s } */
  cells: Array<Array<{ v: string | number; s?: any }>>;
  /** Merge ranges (xlsx format: { s: {r,c}, e: {r,c} }) */
  merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }>;
  /** Column widths (in characters) */
  colWidths: number[];
}

// ============================================================================
// HELPERS — color / font / alignment conversion
// ============================================================================

/** Convert rgb()/rgba()/#hex color string → "RRGGBB" (no #) for xlsx-js-style */
function colorToHex(color: string): string | null {
  if (!color) return null;
  // Handle transparent / rgba with alpha 0
  if (color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return null;
  // #RRGGBB
  const hexMatch = color.match(/^#([0-9a-fA-F]{6})$/);
  if (hexMatch) return hexMatch[1].toUpperCase();
  // rgb(r, g, b) or rgba(r, g, b, a)
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return null;
  const r = parseInt(m[1], 10);
  const g = parseInt(m[2], 10);
  const b = parseInt(m[3], 10);
  return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

/** Parse font-weight string → boolean isBold */
function isFontBold(fontWeight: string): boolean {
  if (!fontWeight) return false;
  if (fontWeight === 'bold') return true;
  const n = parseInt(fontWeight, 10);
  return !isNaN(n) && n >= 600;
}

/** Parse text-align string → 'left'|'center'|'right' */
function parseAlign(textAlign: string, isNumeric: boolean): 'left' | 'center' | 'right' {
  if (textAlign === 'center') return 'center';
  if (textAlign === 'right' || textAlign === 'end') return 'right';
  if (textAlign === 'left' || textAlign === 'start') return 'left';
  return isNumeric ? 'right' : 'left';
}

/** Estimate column width (in characters) from text length + padding */
function estimateColWidth(text: string, isBold: boolean): number {
  if (!text) return 8;
  // CJK chars take ~2x width
  const cjkChars = (text.match(/[\u3000-\u9fff\u1E00-\u1EFF]/g) || []).length;
  const latinChars = text.length - cjkChars;
  const width = cjkChars * 2 + latinChars + 2; // +2 for padding
  return Math.min(Math.max(width, 8), 40) * (isBold ? 1.05 : 1);
}

/** Build xlsx-js-style style object from a DOM element's computed style */
function buildCellStyle(el: HTMLElement, isHeader: boolean): any {
  const cs = window.getComputedStyle(el);

  // Background color — only set if not transparent/white
  const bgHex = colorToHex(cs.backgroundColor);

  // Text color
  const fgHex = colorToHex(cs.color) || '000000';

  // Font
  const isBold = isFontBold(cs.fontWeight);
  const isItalic = cs.fontStyle === 'italic' || cs.fontStyle === 'oblique';
  const fontSize = parseInt(cs.fontSize, 10) || 11;
  // Detect font family — pick first from list, sanitize to a known Excel font
  const fontFamilies = cs.fontFamily.split(',').map(f => f.trim().replace(/['"]/g, ''));
  let fontName = 'Calibri';
  for (const f of fontFamilies) {
    if (/Inter|Roboto|Calibri|Arial/i.test(f)) { fontName = f; break; }
  }

  // Alignment — use text-align, but override for numeric cells
  const txtAlign = cs.textAlign === 'start' ? 'left' : cs.textAlign;
  const isNumeric = el.dataset && el.dataset.numeric === '1';
  const hAlign = parseAlign(txtAlign, isNumeric);
  const vAlign = cs.verticalAlign === 'middle' ? 'center' : (cs.verticalAlign === 'top' ? 'top' : 'center');

  const style: any = {
    font: {
      name: fontName,
      sz: Math.max(9, Math.min(fontSize, 14)),
      bold: isBold,
      italic: isItalic,
      color: { rgb: fgHex },
    },
    alignment: {
      horizontal: hAlign,
      vertical: vAlign,
      wrapText: true,
    },
    border: {
      top: { style: 'thin', color: { rgb: 'BFBFBF' } },
      bottom: { style: 'thin', color: { rgb: 'BFBFBF' } },
      left: { style: 'thin', color: { rgb: 'BFBFBF' } },
      right: { style: 'thin', color: { rgb: 'BFBFBF' } },
    },
  };

  if (bgHex && bgHex !== 'FFFFFF') {
    style.fill = { patternType: 'solid', fgColor: { rgb: bgHex } };
  }

  return style;
}

// ============================================================================
// DOM TABLE SCRAPER
// ============================================================================

/**
 * Extract text content of a table cell, preserving <br/> as newline.
 * Skips hidden elements (display:none, visibility:hidden).
 */
function extractCellText(cell: HTMLElement): string {
  // Clone the cell to manipulate without affecting DOM
  const clone = cell.cloneNode(true) as HTMLElement;

  // Replace <br> with newline marker
  clone.querySelectorAll('br').forEach(br => {
    const txt = document.createTextNode('\n');
    br.replaceWith(txt);
  });

  // Remove hidden children
  clone.querySelectorAll('*').forEach(el => {
    const cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') {
      el.remove();
    }
  });

  // Get text — use innerText to preserve newlines (textContent doesn't)
  const text = (clone as any).innerText || clone.textContent || '';
  return text.trim().replace(/\u00a0/g, ' ');  // replace &nbsp; with regular space
}

/**
 * Scrape a <table> element → 2D array of cells with styles + merges + col widths.
 *
 * Algorithm:
 *   1. Walk through all <tr> in <thead> + <tbody> (skip hidden rows)
 *   2. For each row, walk through <td>/<th> cells
 *   3. Track colSpan/rowSpan → compute merges
 *   4. Skip cells already occupied by a previous merge
 *   5. Build style from computed style of each cell
 */
export function scrapePolicyTable(tableEl: HTMLTableElement): ScrapeResult {
  const cells: Array<Array<{ v: string | number; s?: any }>> = [];
  const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [];
  const colWidths: number[] = [];

  // Grid to track which cells are occupied by merges
  const occupied: Set<string> = new Set();
  const occupyKey = (r: number, c: number) => `${r},${c}`;

  // Helper: find next free column in row r starting from col c
  const findNextFreeCol = (r: number, c: number): number => {
    let col = c;
    while (occupied.has(occupyKey(r, col))) col++;
    return col;
  };

  // Get all rows in order: thead first, then tbody
  const allRows: HTMLTableRowElement[] = [];
  tableEl.querySelectorAll('thead > tr').forEach(tr => allRows.push(tr as HTMLTableRowElement));
  tableEl.querySelectorAll('tbody > tr').forEach(tr => allRows.push(tr as HTMLTableRowElement));

  let rowIdx = 0;
  for (const tr of allRows) {
    // Skip hidden rows
    const trStyle = window.getComputedStyle(tr);
    if (trStyle.display === 'none' || trStyle.visibility === 'hidden') continue;

    // Initialize row array
    if (!cells[rowIdx]) cells[rowIdx] = [];

    let colIdx = 0;
    const tableCells = tr.querySelectorAll(':scope > th, :scope > td');
    for (const cell of tableCells) {
      const th = cell as HTMLTableCellElement;

      // Find next free column (skip cells occupied by previous merges)
      colIdx = findNextFreeCol(rowIdx, colIdx);

      const text = extractCellText(th);
      const isHeader = th.tagName === 'TH';
      const style = buildCellStyle(th as HTMLElement, isHeader);

      // Try to parse as number if it looks like one (for proper Excel sorting)
      let value: string | number = text;
      const cleaned = text.replace(/[.,\s₫%]/g, '');
      if (/^-?\d+$/.test(cleaned) && text.match(/\d/)) {
        // Keep as text if it contains formatting like thousand separators, currency symbols
        // — better to keep as text to preserve display
        value = text;
      }

      cells[rowIdx][colIdx] = { v: value, s: style };

      // Update col width estimate
      const w = estimateColWidth(text, isHeader || (style.font && style.font.bold));
      if (!colWidths[colIdx] || colWidths[colIdx] < w) colWidths[colIdx] = w;

      // Handle colSpan / rowSpan → mark occupied + add merge
      const colSpan = th.colSpan || 1;
      const rowSpan = th.rowSpan || 1;
      if (colSpan > 1 || rowSpan > 1) {
        merges.push({
          s: { r: rowIdx, c: colIdx },
          e: { r: rowIdx + rowSpan - 1, c: colIdx + colSpan - 1 },
        });
        // Mark occupied
        for (let r = rowIdx; r < rowIdx + rowSpan; r++) {
          for (let c = colIdx; c < colIdx + colSpan; c++) {
            if (r === rowIdx && c === colIdx) continue;  // skip the origin cell
            occupied.add(occupyKey(r, c));
            // Ensure row array exists
            if (!cells[r]) cells[r] = [];
            // Placeholder — will be filled with empty value
            cells[r][c] = { v: '', s: style };
          }
        }
      }

      colIdx += colSpan;
    }

    rowIdx++;
  }

  // Fill any gaps in row arrays (in case of merge placeholders missing)
  for (let r = 0; r < cells.length; r++) {
    if (!cells[r]) cells[r] = [];
    for (let c = 0; c < colWidths.length; c++) {
      if (!cells[r][c]) {
        cells[r][c] = { v: '', s: undefined };
      }
    }
  }

  return { cells, merges, colWidths };
}

// ============================================================================
// CONTRACT DETAIL SHEET BUILDER
// ============================================================================

/** Build Sheet 2 from contract detail rows */
function buildContractSheet(rows: ContractDetailRow[]) {
  const headers = [
    'STT', 'NHÓM', 'MÃ TVV', 'HỌ TÊN TVV', 'SỐ HĐ',
    'NGÀY PH', 'THÁNG DS', 'PĐT+10%ĐT', 'AFYP', 'NGƯỜI TD', 'GHI CHÚ',
  ];

  const headerStyle = {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: '065F46' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '047857' } },
      bottom: { style: 'thin', color: { rgb: '047857' } },
      left: { style: 'thin', color: { rgb: '047857' } },
      right: { style: 'thin', color: { rgb: '047857' } },
    },
  };

  const cellStyle = {
    font: { name: 'Calibri', sz: 10, color: { rgb: '000000' } },
    alignment: { vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'D1D5DB' } },
      bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
      left: { style: 'thin', color: { rgb: 'D1D5DB' } },
      right: { style: 'thin', color: { rgb: 'D1D5DB' } },
    },
  };

  const numStyle = { ...cellStyle, alignment: { ...cellStyle.alignment, horizontal: 'right' as const } };
  const centerStyle = { ...cellStyle, alignment: { ...cellStyle.alignment, horizontal: 'center' as const } };

  // Build AOA
  const aoa: any[][] = [headers];
  for (const row of rows) {
    aoa.push([
      row.stt,
      row.nhom,
      row.maTVV,
      row.hoTenTVV,
      row.soHD,
      row.ngayPH,
      row.thangDS,
      row.pdt10DT,
      row.afyp,
      row.nguoiTD,
      row.ghiChu,
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Apply header styles
  for (let c = 0; c < headers.length; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[ref]) ws[ref].s = headerStyle;
  }

  // Apply body styles
  for (let r = 1; r < aoa.length; r++) {
    for (let c = 0; c < headers.length; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) continue;
      // Numeric columns: 7 (PĐT+10%ĐT), 8 (AFYP)
      if (c === 7 || c === 8) {
        ws[ref].s = { ...numStyle, numFmt: '#,##0' };
      } else if (c === 0 || c === 6) {
        // STT + Tháng DS → center
        ws[ref].s = centerStyle;
      } else {
        ws[ref].s = cellStyle;
      }
    }
  }

  // Column widths
  ws['!cols'] = [
    { wch: 5 },   // STT
    { wch: 18 },  // NHÓM
    { wch: 12 },  // MÃ TVV
    { wch: 22 },  // HỌ TÊN TVV
    { wch: 18 },  // SỐ HĐ
    { wch: 12 },  // NGÀY PH
    { wch: 10 },  // THÁNG DS
    { wch: 14 },  // PĐT+10%ĐT
    { wch: 14 },  // AFYP
    { wch: 18 },  // NGƯỜI TD
    { wch: 30 },  // GHI CHÚ
  ];

  return ws;
}

// ============================================================================
// MAIN ENTRY — download Excel file
// ============================================================================

export function downloadPolicyExcel(
  policyLabel: string,
  tableScrape: ScrapeResult,
  contractRows: ContractDetailRow[],
  meta?: { monthLabel?: string; policyKey?: string },
) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Chính sách (from DOM scrape) ──
  const aoa1 = tableScrape.cells.map(row => row.map(cell => cell.v));
  const ws1 = XLSX.utils.aoa_to_sheet(aoa1);

  // Apply styles cell-by-cell
  for (let r = 0; r < tableScrape.cells.length; r++) {
    for (let c = 0; c < tableScrape.cells[r].length; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (ws1[ref] && tableScrape.cells[r][c].s) {
        ws1[ref].s = tableScrape.cells[r][c].s;
      }
    }
  }

  // Apply merges
  if (tableScrape.merges.length > 0) {
    ws1['!merges'] = tableScrape.merges;
  }

  // Apply column widths
  ws1['!cols'] = tableScrape.colWidths.map(w => ({ wch: Math.ceil(w) }));

  XLSX.utils.book_append_sheet(wb, ws1, 'Chính sách');

  // ── Sheet 2: Hợp đồng chi tiết ──
  const ws2 = buildContractSheet(contractRows);
  XLSX.utils.book_append_sheet(wb, ws2, 'Hợp đồng chi tiết');

  // Generate file name
  const now = new Date();
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const monthStr = meta?.monthLabel ? `_${meta.monthLabel.replace(/[\/\s]/g, '-')}` : '';
  const fileName = `${policyLabel}${monthStr}_${yyyymmdd}.xlsx`;

  // Generate and download
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
