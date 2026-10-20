'use client';

import { useMemo, useState } from 'react';
import { bangkokMonth } from '@/lib/carryover-contracts';

type Row = { id: string; carryoverMonth: string; [key: string]: any };
type Props = { rows: Row[]; snapshots: { month: string; updatedAt: string; count: number }[]; onRefresh: () => Promise<void>; onBack: () => void };
const columns = [
  ['nhom', 'NHÓM'], ['maNhom', 'MÃ NHÓM'], ['agentCode', 'MÃ TVV'], ['agentName', 'HỌ TÊN TVV'],
  ['position', 'CHỨC VỤ'], ['contractNumber', 'SỐ HĐ'], ['effectiveDate', 'NGÀY HL'], ['issueDate', 'NGÀY PH'],
  ['pdt10DT', 'IP'], ['afyp', 'AFYP'], ['tinhLuot3tr', 'TÍNH LƯỢT 3 TR'], ['maDaiLyTD', 'MÃ ĐL TD'],
] as const;
const numberFields = new Set(['pdt10DT', 'afyp', 'tinhLuot3tr']);
function display(row: Row, key: string) {
  const value = row[key];
  if (numberFields.has(key)) return Number(value || 0).toLocaleString('vi-VN');
  if (key === 'effectiveDate' || key === 'issueDate') {
    const date = value ? new Date(value) : null;
    return date && Number.isFinite(date.getTime()) ? date.toLocaleDateString('vi-VN', { timeZone: 'UTC' }) : '—';
  }
  return String(value || '—');
}

/** Read-only source table: no writes to Contract or revenue, even when importing. */
export function CarryoverContractsTable({ rows, snapshots, onRefresh, onBack }: Props) {
  const currentMonth = bangkokMonth();
  const [month, setMonth] = useState(currentMonth);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const sourceRows = useMemo(() => rows.filter(row => row.carryoverMonth === month), [rows, month]);
  const groups = useMemo(() => [...new Set(sourceRows.map(row => row.nhom).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi')), [sourceRows]);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('vi');
    return sourceRows.filter(row => (!group || row.nhom === group) && (!term || ['agentName', 'agentCode', 'contractNumber', 'nhom'].some(key => String(row[key] || '').toLocaleLowerCase('vi').includes(term))))
      .sort((a, b) => String(a.nhom || '').localeCompare(String(b.nhom || ''), 'vi') || String(a.agentName || '').localeCompare(String(b.agentName || ''), 'vi'));
  }, [sourceRows, search, group]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / 100));
  const visiblePage = Math.min(page, totalPages);
  const visibleRows = filtered.slice((visiblePage - 1) * 100, visiblePage * 100);
  const snapshot = snapshots.find(item => item.month === month);
  async function importFile(file: File) {
    setBusy(true); setMessage('');
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const sheet = workbook.Sheets[String(Number(currentMonth.slice(5)))];
      if (!sheet) throw new Error(`File Doanhso thiếu sheet ${Number(currentMonth.slice(5))}.`);
      const values = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '', raw: true, blankrows: false })
        .filter(row => row.some(value => String(value ?? '').trim() !== ''))
        .map(row => row.map(value => value instanceof Date ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}` : typeof value === 'number' ? String(value) : value));
      if (values.length < 2) throw new Error('Sheet chưa có HĐ; giữ nguyên dữ liệu đã lưu.');
      const csv = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(values), { forceQuotes: true });
      const response = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contractCsv: csv, carryoverMonth: currentMonth }) });
      const result = await response.json();
      if (!response.ok || result.error || result.errors?.length) throw new Error(result.error || result.errors?.join('; ') || 'Nhập HĐ tồn thất bại.');
      await onRefresh(); setMonth(currentMonth); setPage(1);
      setMessage(`Đã nhập ${result.count} HĐ tồn của ${currentMonth}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể đọc file.'); }
    finally { setBusy(false); }
  }
  async function exportFile() {
    const XLSX = await import('xlsx');
    const data = [['STT', ...columns.map(([, label]) => label)], ...filtered.map((row, index) => [index + 1, ...columns.map(([key]) => numberFields.has(key) ? Number(row[key] || 0) : display(row, key))])];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet['!cols'] = [{ wch: 6 }, ...columns.map(([key]) => ({ wch: key === 'agentName' ? 28 : 18 }))];
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, 'HĐ tồn tháng trước');
    XLSX.writeFile(workbook, `HD_ton_thang_truoc_${month}.xlsx`);
  }
  return <section className="rounded-lg bg-white p-3 sm:p-4 text-slate-800 space-y-3" aria-label="HĐ tồn tháng trước">
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={onBack} className="rounded border px-3 py-2 text-sm">← Doanh số 12 tháng</button>
      <h2 className="text-base font-bold flex-1">HĐ tồn tháng trước</h2>
      <button type="button" disabled={busy} onClick={() => { setBusy(true); onRefresh().catch(() => setMessage('Không thể làm mới dữ liệu.')).finally(() => setBusy(false)); }} className="rounded border px-3 py-2 text-sm disabled:opacity-50">Làm mới</button>
      <button type="button" onClick={exportFile} className="rounded border px-3 py-2 text-sm">Xuất Excel</button>
      <label className="rounded bg-cyan-700 px-3 py-2 text-sm text-white cursor-pointer">{busy ? 'Đang xử lý…' : 'Nhập file Doanhso'}<input aria-label="Nhập file Doanhso" type="file" accept=".xlsx,.xls,.xlsm" disabled={busy} className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) void importFile(file); event.target.value = ''; }} /></label>
    </div>
    <p className="text-sm text-slate-600">Nguồn: Doanhso — sheet {Number(month.slice(5))}/{month.slice(0, 4)}. Chỉ dùng cho thi đua có cài ngày phát hành; không cộng doanh thu và KPI.</p>
    <div className="flex flex-wrap gap-2">
      <label className="text-sm">Kỳ dữ liệu <select aria-label="Kỳ dữ liệu HĐ tồn" value={month} onChange={e => { setMonth(e.target.value); setGroup(''); setPage(1); }} className="rounded border p-2">{[...new Set([currentMonth, ...snapshots.map(s => s.month)])].sort().reverse().map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <select aria-label="Lọc Nhóm HĐ tồn" value={group} onChange={e => { setGroup(e.target.value); setPage(1); }} className="rounded border p-2 text-sm"><option value="">Tất cả Nhóm</option>{groups.map(value => <option key={value}>{value}</option>)}</select>
      <input aria-label="Tìm HĐ tồn" placeholder="Tên TVV, mã TVV, số HĐ…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="min-w-0 flex-1 rounded border p-2 text-sm" />
    </div>
    <p className="text-xs text-slate-600">{filtered.length} HĐ • IP: {filtered.reduce((sum, row) => sum + Number(row.pdt10DT || 0), 0).toLocaleString('vi-VN')} • AFYP: {filtered.reduce((sum, row) => sum + Number(row.afyp || 0), 0).toLocaleString('vi-VN')}{snapshot ? ` • Cập nhật: ${new Date(snapshot.updatedAt).toLocaleString('vi-VN')}` : ' • Chưa có dữ liệu đồng bộ cho kỳ này'}</p>
    {message && <p role="status" className="text-sm font-semibold text-cyan-800">{message}</p>}
    <div className="max-h-[65vh] overflow-auto rounded border border-slate-300">
      <table className="w-full text-xs whitespace-nowrap border-collapse">
        <thead className="sticky top-0 bg-emerald-900 text-white"><tr><th className="p-2">STT</th>{columns.map(([key, label]) => <th key={key} className="p-2 text-center">{label}</th>)}</tr></thead>
        <tbody>{visibleRows.map((row, index) => <tr key={row.id} className="border-b border-slate-200 even:bg-slate-50"><td className="p-2 text-center">{(visiblePage - 1) * 100 + index + 1}</td>{columns.map(([key]) => <td key={key} className={`p-2 ${numberFields.has(key) ? 'text-center tabular-nums' : ''}`}>{display(row, key)}</td>)}</tr>)}{!filtered.length && <tr><td colSpan={columns.length + 1} className="p-6 text-center">{snapshot ? 'Không có HĐ phù hợp.' : `Chưa nhận dữ liệu Doanhso — sheet ${Number(month.slice(5))}.`}</td></tr>}</tbody>
      </table>
    </div>
    {totalPages > 1 && <div className="flex items-center justify-end gap-3 text-sm"><button type="button" disabled={visiblePage <= 1} onClick={() => setPage(visiblePage - 1)} className="rounded border p-2 disabled:opacity-40">Trước</button><span>{visiblePage}/{totalPages}</span><button type="button" disabled={visiblePage >= totalPages} onClick={() => setPage(visiblePage + 1)} className="rounded border p-2 disabled:opacity-40">Sau</button></div>}
  </section>;
}
