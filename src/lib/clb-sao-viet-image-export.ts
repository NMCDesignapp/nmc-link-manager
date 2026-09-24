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
};

type ZipEntry = {
  name: string;
  blob: Blob;
};

const IMAGE_WIDTH = 1920;
const IMAGE_HEIGHT = 1080;
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

export async function createClbCommunicationImage({
  table,
  title,
  subtitle,
  posterUrl = '',
  startRow,
  endRow,
  pageNumber = 1,
  pageCount = 1,
  accentColor,
}: CommunicationImageOptions) {
  const { toBlob } = await import('html-to-image');
  const root = document.createElement('section');
  root.setAttribute('aria-hidden', 'true');
  root.className = 'nmc-clb-communication-export';
  root.style.cssText = [
    'position:fixed',
    // html-to-image preserves positional styles in its SVG clone. Moving the
    // source far off-screen therefore also moves all content outside the
    // exported 1920x1080 viewport and produces a solid background image. Keep
    // it at the capture origin but behind the app so it never flashes on-screen.
    'left:0',
    'top:0',
    'z-index:-2147483648',
    'pointer-events:none',
    `width:${IMAGE_WIDTH}px`,
    `height:${IMAGE_HEIGHT}px`,
    'display:grid',
    'grid-template-columns:1fr 2fr',
    'overflow:hidden',
    'font-family:Arial,Helvetica,sans-serif',
    'background:#07140f',
    'color:#fff',
  ].join(';');

  const left = document.createElement('div');
  left.style.cssText = [
    'position:relative',
    'display:flex',
    'flex-direction:column',
    'padding:54px 44px 46px',
    'overflow:hidden',
    `background:linear-gradient(155deg,${accentColor} 0%,#0f2f27 52%,#07140f 100%)`,
    'border-right:6px solid rgba(255,215,0,.8)',
  ].join(';');

  const brand = document.createElement('div');
  brand.textContent = 'CLB SAO VIỆT';
  brand.style.cssText = 'font-size:20px;font-weight:900;letter-spacing:7px;color:#fde68a;margin-bottom:24px';

  const heading = document.createElement('h1');
  heading.textContent = title;
  heading.style.cssText = 'margin:0;font-size:48px;line-height:1.08;font-weight:1000;letter-spacing:.5px;text-transform:uppercase;text-shadow:0 4px 14px rgba(0,0,0,.4)';

  const subheading = document.createElement('div');
  subheading.textContent = subtitle;
  subheading.style.cssText = 'margin-top:18px;font-size:22px;line-height:1.35;font-weight:700;color:#d1fae5';

  const posterFrame = document.createElement('div');
  posterFrame.style.cssText = 'position:relative;flex:1;min-height:0;margin-top:34px;display:flex;align-items:center;justify-content:center;padding:18px;border:2px solid rgba(253,230,138,.72);background:rgba(2,18,13,.48);box-shadow:0 18px 44px rgba(0,0,0,.35);overflow:hidden';
  let posterImage: HTMLImageElement | null = null;
  if (posterUrl) {
    posterImage = document.createElement('img');
    posterImage.crossOrigin = 'anonymous';
    posterImage.src = posterUrl;
    posterImage.alt = title;
    posterImage.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain;object-position:center';
    posterFrame.appendChild(posterImage);
  } else {
    const placeholder = document.createElement('div');
    placeholder.textContent = 'CHƯA CÓ POSTER';
    placeholder.style.cssText = 'font-size:24px;font-weight:900;letter-spacing:3px;color:rgba(255,255,255,.5)';
    posterFrame.appendChild(placeholder);
  }
  left.append(brand, heading, subheading, posterFrame);

  const right = document.createElement('div');
  right.style.cssText = 'display:flex;flex-direction:column;min-width:0;padding:34px 32px 30px;background:#f8fafc;color:#0f172a';

  const tableTitle = document.createElement('div');
  tableTitle.style.cssText = `display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:0 4px 20px;border-bottom:5px solid ${accentColor}`;
  const tableTitleText = document.createElement('div');
  tableTitleText.innerHTML = '<div style="font-size:20px;font-weight:900;letter-spacing:3px;color:#64748b">BẢNG CHI TIẾT</div><div style="margin-top:6px;font-size:30px;line-height:1.12;font-weight:1000;color:#0f172a">KẾT QUẢ CHƯƠNG TRÌNH</div>';
  const page = document.createElement('div');
  page.textContent = pageCount > 1 ? `PHẦN ${pageNumber}/${pageCount}` : `TOP ${Math.max(0, endRow - startRow)} DÒNG`;
  page.style.cssText = `flex:none;padding:10px 16px;font-size:18px;font-weight:900;color:#fff;background:${accentColor}`;
  tableTitle.append(tableTitleText, page);

  const tableFrame = document.createElement('div');
  tableFrame.style.cssText = 'flex:1;min-height:0;margin-top:20px;overflow:hidden;border:2px solid #94a3b8;background:#fff;box-shadow:0 12px 30px rgba(15,23,42,.15)';
  // Some CLB tables contain hundreds of rows. Deep-cloning the complete table
  // before deleting all but 18 rows briefly duplicates the full DOM twice
  // (once here and once inside html-to-image), which can terminate a mobile
  // browser tab. Build a small export-only table from the requested rows.
  const sourceRows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody > tr'));
  const tableClone = table.cloneNode(false) as HTMLTableElement;
  Array.from(table.children).forEach((section) => {
    if (section.tagName !== 'TBODY') {
      tableClone.appendChild(section.cloneNode(true));
      return;
    }

    const bodyClone = section.cloneNode(false) as HTMLTableSectionElement;
    Array.from(section.children)
      .slice(startRow, endRow)
      .forEach((row) => bodyClone.appendChild(row.cloneNode(true)));
    tableClone.appendChild(bodyClone);
  });
  tableClone.style.cssText = 'width:100%;height:auto;border-collapse:collapse;table-layout:fixed;font-size:17px;background:#fff';
  tableClone.querySelectorAll<HTMLElement>('th,td').forEach((cell) => {
    cell.style.setProperty('width', 'auto', 'important');
    cell.style.setProperty('min-width', '0', 'important');
    cell.style.setProperty('max-width', 'none', 'important');
    cell.style.setProperty('height', 'auto', 'important');
    cell.style.setProperty('padding', '7px 5px', 'important');
    cell.style.setProperty('font-size', '16px', 'important');
    cell.style.setProperty('line-height', '1.15', 'important');
    cell.style.setProperty('white-space', 'normal', 'important');
    cell.style.setProperty('overflow-wrap', 'anywhere', 'important');
    cell.style.setProperty('border', '1px solid #cbd5e1', 'important');
    cell.style.setProperty('box-sizing', 'border-box', 'important');
  });
  tableClone.querySelectorAll<HTMLElement>('thead th').forEach((cell) => {
    cell.style.setProperty('font-size', '15px', 'important');
    cell.style.setProperty('font-weight', '900', 'important');
  });
  tableClone.querySelectorAll('svg').forEach((svg) => {
    (svg as SVGElement).style.width = '17px';
    (svg as SVGElement).style.height = '17px';
  });
  tableFrame.appendChild(tableClone);

  const footer = document.createElement('div');
  const shownStart = Math.min(startRow + 1, sourceRows.length);
  const shownEnd = Math.min(endRow, sourceRows.length);
  footer.textContent = sourceRows.length > 0
    ? `Hiển thị dòng ${shownStart}–${shownEnd} / ${sourceRows.length} • Xuất ngày ${new Date().toLocaleDateString('vi-VN')}`
    : `Chưa có dữ liệu • Xuất ngày ${new Date().toLocaleDateString('vi-VN')}`;
  footer.style.cssText = 'padding:16px 4px 0;text-align:right;font-size:16px;font-weight:700;color:#64748b';
  right.append(tableTitle, tableFrame, footer);
  root.append(left, right);
  document.body.appendChild(root);

  try {
    if (posterImage) await waitForImage(posterImage);
    if (document.fonts?.ready) await document.fonts.ready;
    const blob = await withTimeout(
      toBlob(root, {
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        pixelRatio: 1,
        quality: 1,
        backgroundColor: '#07140f',
        cacheBust: false,
        skipAutoScale: true,
        skipFonts: true,
      }),
      IMAGE_RENDER_TIMEOUT_MS,
      'Tạo ảnh quá thời gian cho phép. Vui lòng thử lại sau khi tải lại trang.',
    );
    if (!blob) throw new Error('Không thể tạo ảnh truyền thông');
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
