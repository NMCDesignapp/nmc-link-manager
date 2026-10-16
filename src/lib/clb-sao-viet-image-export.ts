'use client';

type CommunicationImageOptions = {
  table: HTMLTableElement;
  title: string;
  subtitle: string;
  posterUrl?: string;
  startRow: number;
  endRow: number;
  pageNumber?: number;
  pageCount?: number;
  accentColor: string;
  brand?: string;
  category?: 'policy' | 'contest' | 'club';
  programKey?: string;
};

type ZipEntry = {
  name: string;
  blob: Blob;
};

const EXPORT_ROW_COUNT = 20;
const POSTER_LOAD_TIMEOUT_MS = 8_000;
const IMAGE_RENDER_TIMEOUT_MS = 45_000;

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[index] = value >>> 0;
  }
  return table;
})();

const crc32Blob = async (blob: Blob) => {
  let value = 0xffffffff;
  const reader = blob.stream().getReader();
  try {
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      for (const byte of chunk) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
    }
  } finally {
    reader.releaseLock();
  }
  return (value ^ 0xffffffff) >>> 0;
};

const zipDateTime = (date = new Date()) => {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
};

const concatBytes = (parts: Uint8Array[]) => {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
};

const zipHeader = (size: number, nameLength: number, checksum: number, time: number, date: number) => {
  const bytes = new Uint8Array(30);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, time, true);
  view.setUint16(12, date, true);
  view.setUint32(14, checksum, true);
  view.setUint32(18, size, true);
  view.setUint32(22, size, true);
  view.setUint16(26, nameLength, true);
  return bytes;
};

const centralHeader = (
  size: number,
  nameLength: number,
  checksum: number,
  offset: number,
  time: number,
  date: number,
) => {
  const bytes = new Uint8Array(46);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, time, true);
  view.setUint16(14, date, true);
  view.setUint32(16, checksum, true);
  view.setUint32(20, size, true);
  view.setUint32(24, size, true);
  view.setUint16(28, nameLength, true);
  view.setUint32(42, offset, true);
  return bytes;
};

export async function createStoredZip(
  entries: ZipEntry[],
  onProgress?: (completed: number, total: number) => void,
) {
  const encoder = new TextEncoder();
  // Keep the original PNG blobs as Blob parts. Converting every image to a
  // Uint8Array and retaining those arrays until the end roughly doubled the
  // archive's memory footprint and could terminate a mobile browser tab.
  const localParts: Blob[] = [];
  const centralParts: Uint8Array[] = [];
  const { time, date } = zipDateTime();
  let localOffset = 0;

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const name = encoder.encode(entry.name);
    const size = entry.blob.size;
    const checksum = await crc32Blob(entry.blob);
    const local = zipHeader(size, name.byteLength, checksum, time, date);
    localParts.push(new Blob([local]), new Blob([name]), entry.blob);
    centralParts.push(centralHeader(size, name.byteLength, checksum, localOffset, time, date), name);
    localOffset += local.byteLength + name.byteLength + size;
    onProgress?.(index + 1, entries.length);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  const central = concatBytes(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, central.byteLength, true);
  endView.setUint32(16, localOffset, true);

  return new Blob(
    [...localParts, new Blob([central]), new Blob([end])],
    { type: 'application/zip' },
  );
}

const waitForImage = (image: HTMLImageElement) => new Promise<void>((resolve) => {
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timeoutId);
    image.removeEventListener('load', finish);
    image.removeEventListener('error', finish);
    resolve();
  };
  const timeoutId = window.setTimeout(finish, POSTER_LOAD_TIMEOUT_MS);
  if (image.complete) {
    finish();
    return;
  }
  image.addEventListener('load', finish, { once: true });
  image.addEventListener('error', finish, { once: true });
});

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, message: string) => {
  let timeoutId = 0;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    window.clearTimeout(timeoutId);
  }
};


type CommunicationExportProfile = {
  posterFraction: number;
  bodyFont: number;
  rowHeight: number;
  headerFont: number;
  headerWidth: number;
  minColumnWidth: number;
};

// Different programs have different column counts and content density.
// A program may override its category defaults without changing other tables.
const exportProfiles: Record<string, Partial<CommunicationExportProfile>> = {
  'policy:tvvm': { posterFraction: 0.16, bodyFont: 17, headerWidth: 150 },
  'policy:ns-tvv': { posterFraction: 0.20, bodyFont: 17, headerWidth: 155 },
  'policy:quy-tvv': { posterFraction: 0.20, bodyFont: 17 },
  'policy:tuyen-luyen': { posterFraction: 0.19, bodyFont: 16 },
  'policy:dong-hanh': { posterFraction: 0.19, bodyFont: 16 },
  'policy:ptkd-tn': { posterFraction: 0.18, bodyFont: 16 },
  'policy:quy-tn': { posterFraction: 0.20, bodyFont: 17 },
  'policy:tuyen-ngang': { posterFraction: 0.19, bodyFont: 16 },
  'club:ca-nhan': { posterFraction: 0.17, bodyFont: 16, headerWidth: 145 },
  'club:tn-td': { posterFraction: 0.20, bodyFont: 17 },
  'club:tn-ktm': { posterFraction: 0.20, bodyFont: 17 },
  'contest:ca-nhan': { posterFraction: 0.18, bodyFont: 16 },
  'contest:tn-td': { posterFraction: 0.19, bodyFont: 16 },
  'contest:tn-ktm': { posterFraction: 0.19, bodyFont: 16 },
};

export const resolveCommunicationExportProfile = (
  category: 'policy' | 'contest' | 'club',
  programKey: string,
  columnCount: number,
): CommunicationExportProfile => ({
  posterFraction: columnCount > 13 ? 0.16 : columnCount > 10 ? 0.19 : 0.23,
  bodyFont: columnCount > 13 ? 15 : 17,
  rowHeight: columnCount > 13 ? 35 : 39,
  headerFont: columnCount > 13 ? 15 : 16,
  headerWidth: 155,
  minColumnWidth: 85,
  ...exportProfiles[category + ':' + programKey],
});

const preserveAppearance = (source: Element, target: Element): void => {
  if (target instanceof HTMLElement || target instanceof SVGElement) {
    const computed = window.getComputedStyle(source);
    const style = target.style;
    // Preserve exact popup colors including nested badges, row striping, and
    // all header tiers. Do not add tint / highlight overlays in the export.
    for (const property of [
      'background-color', 'background-image', 'color',
      'border-top-color', 'border-right-color', 'border-bottom-color',
      'border-left-color', 'border-top-style', 'border-bottom-style',
      'border-left-style', 'border-right-style', 'font-weight', 'font-style',
      'text-align', 'vertical-align',
    ]) style.setProperty(property, computed.getPropertyValue(property), 'important');
  }
  const originals = Array.from(source.children);
  const copies = Array.from(target.children);
  originals.forEach((child, index) => {
    if (copies[index]) preserveAppearance(child, copies[index]);
  });
};

const createProgramCover = (title: string, subtitle: string, brand: string, accent: string): HTMLElement => {
  const cover = document.createElement('div');
  cover.style.cssText = [
    'display:flex', 'flex-direction:column', 'justify-content:center',
    'width:100%', 'height:100%', 'padding:30px 24px',
    'box-sizing:border-box', 'text-align:center',
    'background:linear-gradient(155deg,' + accent + ' 0%,#082f32 100%)',
    'border:2px solid rgba(255,255,255,.18)', 'color:#fff',
  ].join(';');
  const eyebrow = document.createElement('div');
  eyebrow.textContent = brand;
  eyebrow.style.cssText = 'font:800 16px Arial,sans-serif;letter-spacing:3px;color:#fef08a;margin-bottom:22px';
  const name = document.createElement('div');
  name.textContent = title;
  name.style.cssText = 'font:900 32px/1.2 Arial,sans-serif;color:#fff;overflow-wrap:break-word';
  const description = document.createElement('div');
  description.textContent = subtitle;
  description.style.cssText = 'font:600 17px/1.35 Arial,sans-serif;color:#d1fae5;margin-top:24px';
  cover.append(eyebrow, name, description);
  return cover;
};

export async function createClbCommunicationImage({
  table, title, subtitle, posterUrl = '', startRow, endRow,
  pageNumber = 1, pageCount = 1, accentColor,
  brand: brandLabel = 'CLB SAO VIỆT', category = 'club', programKey = '',
}: CommunicationImageOptions) {
  const { toBlob } = await import('html-to-image');
  const sourceRows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody > tr'));
  const safeEnd = Math.min(endRow, startRow + EXPORT_ROW_COUNT);
  const selectedRows = sourceRows.slice(startRow, safeEnd);
  const countColumns = (row: HTMLTableRowElement) =>
    Array.from(row.cells).reduce((sum, cell) => sum + (cell.colSpan || 1), 0);
  const columnCount = Math.max(
    1,
    ...Array.from(table.querySelectorAll<HTMLTableRowElement>('thead tr')).map(countColumns),
    ...selectedRows.map(countColumns),
  );
  const profile = resolveCommunicationExportProfile(category, programKey, columnCount);

  // Clone only the requested rows. A full clone can exceed mobile memory limits.
  const tableCopy = table.cloneNode(false) as HTMLTableElement;
  Array.from(table.children).forEach(section => {
    const sectionCopy = section.cloneNode(false) as HTMLElement;
    const originalRows = section.tagName === 'TBODY'
      ? Array.from(section.children).slice(startRow, safeEnd)
      : Array.from(section.children);
    if (section.tagName === 'COLGROUP') {
      sectionCopy.append(...Array.from(section.children).map(node => node.cloneNode(true)));
    } else {
      originalRows.forEach(row => {
        const rowCopy = row.cloneNode(true) as HTMLElement;
        preserveAppearance(row, rowCopy);
        sectionCopy.appendChild(rowCopy);
      });
    }
    tableCopy.appendChild(sectionCopy);
  });
  // Original <col> constraints and overflow rules came from the scrolling
  // page, not from a print layout. Replace only column geometry, not colors.
  tableCopy.querySelectorAll('colgroup').forEach(col => col.remove());
  tableCopy.style.cssText = [
    'border-collapse:collapse', 'border-spacing:0',
    'table-layout:fixed', 'margin:0', 'max-width:none',
    'font-family:Arial,Helvetica,sans-serif', 'background:#fff',
  ].join(';');
  const context = document.createElement('canvas').getContext('2d');
  const widths = Array.from({ length: columnCount }, () => profile.minColumnWidth);
  tableCopy.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach(row => {
    let column = 0;
    Array.from(row.cells).forEach(cell => {
      if (cell.colSpan === 1 && context) {
        const computed = window.getComputedStyle(cell);
        context.font = (computed.fontWeight === 'bold' ? '700 ' : '400 ')
          + profile.bodyFont + 'px Arial';
        const content = (cell.textContent || '').replace(/\s+/g, ' ').trim();
        // Keep every data row on one line, with space for icons/badges.
        widths[column] = Math.max(widths[column], Math.ceil(context.measureText(content).width) + 33);
      }
      column += cell.colSpan || 1;
    });
  });
  // Headers may wrap; cap their preferred width to avoid widening a column
  // merely because its label has several words.
  tableCopy.querySelectorAll<HTMLTableRowElement>('thead tr').forEach(row => {
    let column = 0;
    Array.from(row.cells).forEach(cell => {
      if (cell.colSpan === 1 && context) {
        context.font = '800 ' + profile.headerFont + 'px Arial';
        const label = (cell.textContent || '').replace(/\s+/g, ' ').trim();
        const preferred = Math.max(profile.minColumnWidth,
          Math.min(profile.headerWidth, Math.ceil(context.measureText(label).width) + 20));
        widths[column] = Math.max(widths[column], preferred);
      }
      column += cell.colSpan || 1;
    });
  });

  // Multi-column grouped rows should not dictate a single column's width.
  const tableWidth = widths.reduce((sum, width) => sum + width, 0);
  const cols = document.createElement('colgroup');
  widths.forEach(width => {
    const col = document.createElement('col');
    col.style.setProperty('width', width + 'px', 'important');
    cols.appendChild(col);
  });
  tableCopy.insertBefore(cols, tableCopy.firstChild);
  tableCopy.style.setProperty('width', tableWidth + 'px', 'important');
  tableCopy.style.setProperty('min-width', tableWidth + 'px', 'important');
  tableCopy.style.setProperty('max-width', 'none', 'important');
  tableCopy.style.setProperty('table-layout', 'fixed', 'important');
  tableCopy.style.setProperty('zoom', '1', 'important');
  tableCopy.style.setProperty('transform', 'none', 'important');
  tableCopy.querySelectorAll<HTMLElement>('th,td').forEach(cell => {
    cell.style.setProperty('box-sizing', 'border-box', 'important');
    cell.style.setProperty('font-family', 'Arial,Helvetica,sans-serif', 'important');
    cell.style.setProperty('white-space', cell.closest('thead') ? 'normal' : 'nowrap', 'important');
    cell.style.setProperty('overflow-wrap', cell.closest('thead') ? 'break-word' : 'normal', 'important');
    cell.style.setProperty('word-break', 'normal', 'important');
    cell.style.setProperty('overflow', 'visible', 'important');
    cell.style.setProperty('text-overflow', 'clip', 'important');
    cell.style.setProperty('padding', '5px 7px', 'important');
    cell.style.setProperty('line-height', '1.2', 'important');
    cell.style.setProperty('font-size',
      (cell.closest('thead') ? profile.headerFont : profile.bodyFont) + 'px', 'important');
    if (!cell.closest('thead')) cell.style.setProperty('height', profile.rowHeight + 'px', 'important');
    cell.querySelectorAll<HTMLElement>('*').forEach(content => {
      content.style.setProperty('font-family', 'Arial,Helvetica,sans-serif', 'important');
      content.style.setProperty('white-space', cell.closest('thead') ? 'normal' : 'nowrap', 'important');
      content.style.setProperty('overflow', 'visible', 'important');
      content.style.setProperty('text-overflow', 'clip', 'important');
    });
  });

  const rightPadding = 32;
  let rightWidth = tableWidth + rightPadding * 2;
  const leftWidth = Math.max(280, Math.min(540,
    Math.ceil((rightWidth * profile.posterFraction) / (1 - profile.posterFraction))));
  let imageWidth = leftWidth + rightWidth;
  const root = document.createElement('section');
  root.className = 'nmc-clb-communication-export';
  root.setAttribute('aria-hidden', 'true');
  root.style.cssText = [
    'position:fixed', 'left:0', 'top:0', 'z-index:-2147483647',
    'pointer-events:none', 'display:grid',
    'grid-template-columns:' + leftWidth + 'px ' + rightWidth + 'px',
    'width:' + imageWidth + 'px', 'font-family:Arial,Helvetica,sans-serif',
    'background:#f8fafc', 'overflow:hidden',
  ].join(';');
  const left = document.createElement('div');
  left.style.cssText = [
    'box-sizing:border-box','display:flex','flex-direction:column',
    'width:' + leftWidth + 'px','min-width:0','padding:30px 18px',
    'background:' + accentColor,'color:white',
    'border-right:4px solid #eab308',
  ].join(';');
  const eyebrow = document.createElement('div');
  eyebrow.textContent = brandLabel;
  eyebrow.style.cssText = 'font:800 17px Arial,sans-serif;letter-spacing:3px;color:#fef08a;margin-bottom:16px';
  const heading = document.createElement('div');
  heading.textContent = title;
  heading.style.cssText = 'font:900 34px/1.13 Arial,sans-serif;color:#fff;overflow-wrap:break-word';
  const subheading = document.createElement('div');
  subheading.textContent = subtitle;
  subheading.style.cssText = 'font:600 18px/1.35 Arial,sans-serif;color:#e2f8ee;margin-top:12px';
  const posterFrame = document.createElement('div');
  posterFrame.style.cssText = 'display:flex;align-items:center;justify-content:center;min-height:160px;flex:1;overflow:hidden;margin-top:25px';
  const cover = createProgramCover(title, subtitle, brandLabel, accentColor);
  posterFrame.appendChild(cover);
  let posterImage: HTMLImageElement | null = null;
  if (posterUrl.trim()) {
    posterImage = document.createElement('img');
    if (posterUrl.startsWith('http://') || posterUrl.startsWith('https://')) posterImage.crossOrigin = 'anonymous';
    posterImage.src = posterUrl;
    posterImage.alt = title;
    posterImage.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain;object-position:center';
  }
  left.append(eyebrow, heading, subheading, posterFrame);

  const right = document.createElement('div');
  right.style.cssText = [
    'display:flex','flex-direction:column','box-sizing:border-box',
    'width:' + rightWidth + 'px','min-width:0','padding:24px ' + rightPadding + 'px 18px',
    'background:#f8fafc','color:#0f172a',
  ].join(';');
  const tableTitle = document.createElement('div');
  tableTitle.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:14px;border-bottom:4px solid ' + accentColor;
  const t = document.createElement('div');
  const label = document.createElement('div');
  label.textContent = 'BẢNG CHI TIẾT';
  label.style.cssText = 'font:900 15px Arial,sans-serif;letter-spacing:3px;color:#64748b';
  const headingLabel = document.createElement('div');
  headingLabel.textContent = 'KẾT QUẢ CHƯƠNG TRÌNH';
  headingLabel.style.cssText = 'font:900 27px Arial,sans-serif;color:#0f172a;margin-top:4px';
  t.append(label, headingLabel);
  const indicator = document.createElement('div');
  indicator.textContent = pageCount > 1 ? 'PHẦN ' + pageNumber + '/' + pageCount : 'TOP ' + EXPORT_ROW_COUNT + ' DÒNG';
  indicator.style.cssText = 'flex:none;padding:10px 14px;font:900 16px Arial,sans-serif;color:#fff;background:' + accentColor;
  tableTitle.append(t, indicator);
  const frame = document.createElement('div');
  frame.style.cssText = 'margin-top:14px;width:' + tableWidth + 'px;flex:none;overflow:visible;border:1px solid #94a3b8;background:#fff';
  frame.appendChild(tableCopy);
  const footer = document.createElement('div');
  const shown = sourceRows.length ? 'Hiển thị dòng ' +
    Math.min(startRow + 1, sourceRows.length) + '–' + Math.min(safeEnd, sourceRows.length) +
    ' / ' + sourceRows.length : 'Chưa có dữ liệu';
  footer.textContent = shown + ' • Xuất ngày ' + new Date().toLocaleDateString('vi-VN');
  footer.style.cssText = 'font:700 14px Arial,sans-serif;color:#64748b;text-align:right;margin-top:14px';
  right.append(tableTitle, frame, footer);
  root.append(left, right);
  document.body.appendChild(root);

  try {
    if (posterImage) {
      await waitForImage(posterImage);
      if (posterImage.naturalWidth > 0) {
        // Embed loaded poster bytes where CORS permits, so the SVG screenshot
        // doesn't have to fetch the same remote URL again while rasterizing.
        if (posterUrl.startsWith('http://') || posterUrl.startsWith('https://')) {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = posterImage.naturalWidth;
            canvas.height = posterImage.naturalHeight;
            canvas.getContext('2d')?.drawImage(posterImage, 0, 0);
            posterImage.src = canvas.toDataURL('image/png');
          } catch (error) {
            console.warn('[Communication export] Could not inline poster:', error);
          }
        }
        cover.replaceWith(posterImage);
      } else {
        console.warn('[Communication export] Poster URL did not load; used branded program cover:', title);
      }
    }
    // Detect extra width from icons, span badges and multi-level headers:
    // never rely solely on text metrics to decide the output crop.
    const measuredWidth = Math.ceil(Math.max(
      tableWidth, tableCopy.scrollWidth, tableCopy.getBoundingClientRect().width,
      ...Array.from(tableCopy.rows).map(row => row.scrollWidth),
    ));
    if (measuredWidth > tableWidth) {
      rightWidth = measuredWidth + rightPadding * 2;
      imageWidth = leftWidth + rightWidth;
      tableCopy.style.setProperty('width', measuredWidth + 'px', 'important');
      tableCopy.style.setProperty('min-width', measuredWidth + 'px', 'important');
      frame.style.width = measuredWidth + 'px';
      right.style.width = rightWidth + 'px';
      root.style.width = imageWidth + 'px';
      root.style.gridTemplateColumns = leftWidth + 'px ' + rightWidth + 'px';
    }
    if (document.fonts) await withTimeout(document.fonts.ready, 3000, 'Font loading timed out').catch(() => undefined);
    // Header labels can have two or three rows; compute the actual height
    // AFTER adding the table, and never clip long multi-level headers.
    const neededHeight = Math.ceil(frame.getBoundingClientRect().height + 220);
    const imageHeight = Math.max(Math.ceil(imageWidth * 9 / 16), neededHeight);
    if (imageWidth > 7600 || imageHeight > 7000) {
      throw new Error('Bảng quá rộng để xuất ảnh an toàn: ' + title + '. Vui lòng kiểm tra dữ liệu.');
    }
    root.style.height = imageHeight + 'px';
    const blob = await withTimeout(toBlob(root, {
      width: imageWidth,
      height: imageHeight,
      pixelRatio: 1,
      quality: 1,
      backgroundColor: '#f8fafc',
      cacheBust: false,
      skipAutoScale: true,
      skipFonts: true,
    }), IMAGE_RENDER_TIMEOUT_MS, 'Tạo ảnh quá thời gian cho phép.');
    if (!blob) throw new Error('Không thể kết xuất ảnh: ' + title);
    return blob;
  } finally {
    root.remove();
  }
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Mobile browsers can start reading a large blob noticeably after click().
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
