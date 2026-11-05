'use client';

import { useCallback, useState, type ChangeEvent } from 'react';
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type ImportRow = { code: string; note: string };
type Preview = {
  inputCount: number;
  matched: number;
  changed: number;
  cleared: number;
  unchanged: number;
  unmatched: number;
  unmatchedCodes: string[];
};
type ApiReply = Preview & { error?: string; success?: boolean };

const normalizedHeader = (value: unknown) => String(value ?? '')
  .trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ');

export function TVVNotesExcelImport({ onImported }: { onImported: () => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState<ImportRow[]>([]);

  const previewAndApply = useCallback(async (rows: ImportRow[]) => {
    const send = (dryRun: boolean) => fetch('/api/structure/tvv/notes-import', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, dryRun }),
    });
    const result = await send(true);
    const preview = await result.json().catch(() => ({})) as ApiReply;
    if (result.status === 401) {
      setPending(rows);
      setLoginOpen(true);
      return;
    }
    if (!result.ok) throw new Error(preview.error || 'Không thể kiểm tra dữ liệu Excel.');

    const overview = `File có ${preview.inputCount} mã TVV.\n` +
      `Khớp DS TVV: ${preview.matched}. Thay đổi Ghi chú: ${preview.changed} (xóa trống: ${preview.cleared}).\n` +
      `Không tìm thấy mã: ${preview.unmatched}.` +
      (preview.unmatchedCodes?.length ? `\nVí dụ mã không tìm thấy: ${preview.unmatchedCodes.join(', ')}.` : '') +
      '\n\nChỉ cập nhật cột Ghi chú của các mã khớp. Bạn có muốn áp dụng?';
    if (!window.confirm(overview)) return;

    const response = await send(false);
    const data = await response.json().catch(() => ({})) as ApiReply;
    if (!response.ok) throw new Error(data.error || 'Không thể lưu Ghi chú.');
    await onImported();
    setPending([]);
    toast({
      title: 'Đã cập nhật Ghi chú TVV',
      description: `${data.changed} ghi chú thay đổi; ${data.unmatched} mã không có trong DS TVV. Các cột khác giữ nguyên.`,
    });
  }, [onImported]);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || busy) return;
    setBusy(true);
    try {
      if (!/\.xlsx?$/i.test(file.name)) throw new Error('Chọn file Excel .xlsx hoặc .xls.');
      if (file.size > 5 * 1024 * 1024) throw new Error('File vượt quá 5 MB.');
      const XLSX = await import('xlsx');
      const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = book.Sheets[book.SheetNames[0]];
      if (!sheet) throw new Error('File Excel không có sheet dữ liệu.');
      const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '', blankrows: false });
      if (raw.length < 2) throw new Error('File thiếu dữ liệu: cần hai cột Mã TVV và Ghi chú.');
      const headers = raw[0];
      if (normalizedHeader(headers[0]) !== 'ma tvv' || normalizedHeader(headers[1]) !== 'ghi chu' ||
        headers.slice(2).some(v => String(v ?? '').trim())) {
        throw new Error('Chỉ chấp nhận 2 cột: cột A là Mã TVV, cột B là Ghi chú.');
      }
      const rows: ImportRow[] = [];
      const seen = new Set<string>();
      for (let i = 1; i < raw.length; i++) {
        const cells = raw[i];
        if (!cells.some(v => String(v ?? '').trim())) continue;
        if (cells.slice(2).some(v => String(v ?? '').trim())) {
          throw new Error(`Dòng ${i + 1} có dữ liệu ngoài 2 cột quy định.`);
        }
        const code = String(cells[0] ?? '').trim().toUpperCase();
        const note = String(cells[1] ?? '').trim();
        if (!code) throw new Error(`Dòng ${i + 1} thiếu Mã TVV.`);
        if (seen.has(code)) throw new Error(`Mã TVV trùng trong file: ${code}.`);
        seen.add(code);
        rows.push({ code, note });
      }
      if (!rows.length) throw new Error('Không tìm thấy dòng TVV hợp lệ.');
      if (rows.length > 10000) throw new Error('File vượt quá giới hạn 10.000 TVV.');
      setPending(rows);
      await previewAndApply(rows);
    } catch (error) {
      toast({ title: 'Không thể nhập Ghi chú', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const loginAndRetry = async () => {
    if (busy || !pending.length || !password) return;
    setBusy(true);
    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Không thể xác minh quyền quản trị.');
      setPassword('');
      setLoginOpen(false);
      await previewAndApply(pending);
    } catch (error) {
      toast({ title: 'Chưa xác thực được quyền quản trị', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <>
      <input type="file" id="tvv-notes-excel-file" accept=".xlsx,.xls"
        className="hidden" disabled={busy} onChange={handleFile}/>
      <label htmlFor="tvv-notes-excel-file" title="Excel gồm Mã TVV và Ghi chú; chỉ thay đổi Ghi chú"
        className={`inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 rounded-md text-xs font-medium ${busy ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Upload className="w-3.5 h-3.5"/>}
        Nhập Ghi chú (Excel 2 cột)
      </label>
      {loginOpen && (
        <div className="basis-full w-full flex flex-wrap items-center gap-2 rounded-md border border-amber-500/40 bg-[#1a2332] p-2">
          <FileSpreadsheet className="w-4 h-4 text-amber-300"/>
          <span className="text-xs text-amber-200">Nhập mật khẩu quản trị để cập nhật ghi chú:</span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void loginAndRetry(); }}
            autoComplete="current-password" aria-label="Mật khẩu quản trị"
            className="min-w-[160px] rounded border border-amber-600/40 bg-slate-950 px-2 py-1 text-sm text-white"/>
          <button type="button" onClick={() => void loginAndRetry()} disabled={busy || !password}
            className="rounded bg-emerald-700 px-3 py-1 text-xs text-white disabled:opacity-40">Xác nhận</button>
          <button type="button" onClick={() => { setLoginOpen(false); setPassword(''); setPending([]); }}
            className="px-2 py-1 text-xs text-gray-300">Hủy</button>
        </div>
      )}
    </>
  );
}
