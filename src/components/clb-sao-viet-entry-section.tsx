'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, RefreshCw, Search, Table2, X, XCircle } from 'lucide-react';

type MonthRef = { year: number; month: number; key: string; label: string };
type Variant = 'tvv' | 'tn' | 'ttn';
type BaseRow = {
  id: string;
  ad: string;
  nhom: string;
  agentCode: string;
  agentName: string;
  chucVu: string;
  passed: boolean;
  result: string;
  monthlyIP?: number[];
  totalIP?: number;
  monthlyGroupIP?: number[];
  totalGroupIP?: number;
  monthlyDongHanh?: Array<{
    key: string;
    label: string;
    tvvmHDC: number;
    fypTVVm: number;
    totalTVVmReward: number;
    rewardRate: number;
    rewardAmount: number;
    achieved: boolean;
  }>;
  achievedMonths?: number;
};
type EntryResponse = {
  assessment: { year: number; month: number; label: string };
  months: MonthRef[];
  rule: Record<string, number | string>;
  summary: { total: number; passed: number; failed: number };
  rows: BaseRow[];
};
type Props = { variant: Variant; year: number; month: number; refreshToken: number };

const CONFIG: Record<Variant, { title: string; endpoint: string; subject: string; passedLabel: string; description: string }> = {
  tvv: {
    title: 'Xét gia nhập - TVV',
    endpoint: '/api/clb-sao-viet/gia-nhap-tvv',
    subject: 'Toàn bộ DS TVV trong Cấu trúc, chỉ loại người đã là thành viên CLB',
    passedLabel: 'Đạt gia nhập TVV',
    description: 'Tổng IP 3 tháng liền trước ≥ 60 triệu',
  },
  tn: {
    title: 'Xét gia nhập - TN',
    endpoint: '/api/clb-sao-viet/gia-nhap-tn',
    subject: 'TB/TN trong Cấu trúc, chỉ loại TB/TN đã là thành viên CLB',
    passedLabel: 'Đạt gia nhập TN',
    description: 'Tổng IP nhóm 3 tháng liền trước ≥ 150 triệu, gồm cả IP cá nhân TB/TN',
  },
  ttn: {
    title: 'Xét gia nhập - TTN',
    endpoint: '/api/clb-sao-viet/gia-nhap-ttn',
    subject: 'TTN trong Cấu trúc, chỉ loại TTN đã là thành viên CLB',
    passedLabel: 'Đạt gia nhập TTN',
    description: 'Đạt Thưởng Đồng Hành đủ 3/3 tháng liền trước',
  },
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(value || 0));
}
function formatMoney(value: number) { return `${formatNumber(value)}đ`; }

export function CLBGiaNhapSection({ variant, year, month, refreshToken }: Props) {
  const cfg = CONFIG[variant];
  const [data, setData] = useState<EntryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'passed' | 'failed'>('all');
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${cfg.endpoint}?year=${year}&month=${month}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || 'Không thể tính kết quả');
      setData(json);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Không thể tính kết quả');
    } finally {
      setLoading(false);
    }
  }, [cfg.endpoint, month, year]);

  useEffect(() => { load(); }, [load, refreshToken]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi-VN');
    return (data?.rows || []).filter((row) => {
      if (status === 'passed' && !row.passed) return false;
      if (status === 'failed' && row.passed) return false;
      if (!keyword) return true;
      return [row.ad, row.nhom, row.agentCode, row.agentName, row.chucVu].join(' ').toLocaleLowerCase('vi-VN').includes(keyword);
    });
  }, [data?.rows, search, status]);

  const exportExcel = useCallback(async () => {
    if (!data?.rows.length) return;
    setExporting(true);
    try {
      const XLSX = await import('xlsx-js-style');
      let headers: string[] = [];
      let rows: Array<Array<string | number>> = [];
      if (variant === 'tvv') {
        headers = ['STT', 'AD', 'NHÓM', 'MÃ ĐL', 'HỌ TÊN', 'CHỨC VỤ', ...data.months.map((m) => `IP T${m.month}`), 'TỔNG IP 3 THÁNG', 'KẾT QUẢ'];
        rows = data.rows.map((r, i) => [i + 1, r.ad, r.nhom, r.agentCode, r.agentName, r.chucVu, ...(r.monthlyIP || []), r.totalIP || 0, r.result]);
      } else if (variant === 'tn') {
        headers = ['STT', 'AD', 'NHÓM', 'MÃ ĐL', 'HỌ TÊN', 'CHỨC VỤ', ...data.months.map((m) => `IP NHÓM T${m.month}`), 'TỔNG IP NHÓM 3 THÁNG', 'KẾT QUẢ'];
        rows = data.rows.map((r, i) => [i + 1, r.ad, r.nhom, r.agentCode, r.agentName, r.chucVu, ...(r.monthlyGroupIP || []), r.totalGroupIP || 0, r.result]);
      } else {
        headers = ['STT', 'AD', 'NHÓM', 'MÃ ĐL', 'HỌ TÊN', 'CHỨC VỤ', ...data.months.flatMap((m) => [`ĐỒNG HÀNH T${m.month}`, `THƯỞNG ĐH T${m.month}`]), 'SỐ THÁNG ĐẠT', 'KẾT QUẢ'];
        rows = data.rows.map((r, i) => [
          i + 1, r.ad, r.nhom, r.agentCode, r.agentName, r.chucVu,
          ...(r.monthlyDongHanh || []).flatMap((d) => [d.achieved ? `Đạt (${d.tvvmHDC} TVVm HĐC)` : `Không (${d.tvvmHDC} TVVm HĐC)`, d.rewardAmount]),
          r.achievedMonths || 0, r.result,
        ]);
      }

      const ws = XLSX.utils.aoa_to_sheet([[`CLB SAO VIỆT - ${cfg.title.toUpperCase()}`], [`Đợt xét: ${data.assessment.label}`], [`Điều kiện: ${String(data.rule.description || cfg.description)}`], [], headers, ...rows]);
      const lastCol = headers.length - 1;
      const lastRow = rows.length + 4;
      ws['!merges'] = [0, 1, 2].map((r) => ({ s: { r, c: 0 }, e: { r, c: lastCol } }));
      ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 4, c: 0 }, e: { r: lastRow, c: lastCol } }) };
      ws['!views'] = [{ state: 'frozen', ySplit: 5 }];
      ws['!cols'] = headers.map((h, i) => ({ wch: i === 0 ? 7 : h === 'HỌ TÊN' ? 28 : h === 'NHÓM' || h === 'CHỨC VỤ' ? 20 : h === 'KẾT QUẢ' ? 20 : 16 }));
      const border = {
        top: { style: 'thin', color: { rgb: 'C9DFD4' } }, bottom: { style: 'thin', color: { rgb: 'C9DFD4' } },
        left: { style: 'thin', color: { rgb: 'C9DFD4' } }, right: { style: 'thin', color: { rgb: 'C9DFD4' } },
      } as const;
      for (let c = 0; c <= lastCol; c++) {
        for (const r of [0, 1, 2]) {
          const cell = ws[XLSX.utils.encode_cell({ r, c })];
          if (cell) cell.s = { font: { bold: true, color: { rgb: '174C37' }, sz: r === 0 ? 15 : 10 }, fill: { fgColor: { rgb: 'EEF7F2' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } };
        }
        const h = ws[XLSX.utils.encode_cell({ r: 4, c })];
        if (h) h.s = { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 9 }, fill: { fgColor: { rgb: '239A69' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border };
      }
      for (let r = 5; r <= lastRow; r++) {
        const source = data.rows[r - 5];
        for (let c = 0; c <= lastCol; c++) {
          const cell = ws[XLSX.utils.encode_cell({ r, c })];
          if (!cell) continue;
          const isResult = c === lastCol;
          cell.s = {
            font: isResult ? { bold: true, color: { rgb: source?.passed ? '137333' : 'B3261E' } } : { color: { rgb: '183548' } },
            fill: isResult ? { fgColor: { rgb: source?.passed ? 'E6F6EB' : 'FCE8E6' } } : undefined,
            alignment: { horizontal: c === 0 || c >= 6 ? 'center' : 'left', vertical: 'center', wrapText: true }, border,
          };
          if (typeof cell.v === 'number' && c >= 6) cell.z = '#,##0';
        }
      }
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, cfg.title.replace('Xét ', '').slice(0, 31));
      XLSX.writeFile(wb, `CLB_Sao_Viet_${cfg.title.replace(/\s+/g, '_').replace(/-/g, '')}_${data.assessment.label.replace(/\//g, '-')}.xlsx`);
    } catch (err) {
      alert(`Không thể xuất Excel: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExporting(false);
    }
  }, [cfg.description, cfg.title, data, variant]);

  return (
    <div className="border-t border-white/10 bg-black/10 p-3 sm:p-4">
      {error ? <div className="border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">{error}</div> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border border-white/10 bg-white/[0.035] p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-white/45">Đối tượng xét</div><div className="mt-1 text-2xl font-black text-white">{loading ? '—' : data?.summary.total ?? 0}</div><div className="mt-1 text-[10px] text-white/40">{cfg.subject}</div></div>
        <div className="border border-emerald-400/20 bg-emerald-400/[0.055] p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-emerald-100/55">Đạt gia nhập</div><div className="mt-1 text-2xl font-black text-emerald-200">{loading ? '—' : data?.summary.passed ?? 0}</div></div>
        <div className="border border-rose-400/20 bg-rose-400/[0.05] p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-rose-100/55">Chưa đạt</div><div className="mt-1 text-2xl font-black text-rose-200">{loading ? '—' : data?.summary.failed ?? 0}</div></div>
      </div>

      <div className="mt-3 flex flex-col gap-3 border border-amber-300/20 bg-[#0b1511] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-black text-amber-100">{cfg.title}</div>
          <div className="mt-1 text-xs text-white/55">Điều kiện: <strong className="text-white">{cfg.description}</strong></div>
          {data?.months?.length === 3 ? <div className="mt-1 text-[10px] text-white/40">Kỳ tính: {data.months.map((m) => m.label).join(' • ')} • Doanh số theo Ngày phát hành</div> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setDetailOpen(true)} disabled={loading || !data} className="inline-flex h-9 items-center gap-2 border border-amber-300/30 bg-amber-300/10 px-3 text-xs font-bold text-amber-100 disabled:opacity-40"><Table2 className="h-4 w-4" /> Xem bảng chi tiết</button>
          <button onClick={exportExcel} disabled={loading || exporting || !data?.rows.length} className="inline-flex h-9 items-center gap-2 border border-emerald-400/30 bg-emerald-400/10 px-3 text-xs font-bold text-emerald-100 disabled:opacity-40">{exporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Xuất Excel</button>
        </div>
      </div>

      {detailOpen && data ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-3 sm:p-5">
          <div className="flex h-[82vh] w-[min(96vw,1380px)] flex-col overflow-hidden border border-[#c9dfd4] bg-[#f6fbf8] shadow-[0_18px_48px_rgba(0,0,0,0.48)]">
            <div className="flex flex-col gap-2 border-b border-[#c9dfd4] bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div><h3 className="text-sm font-black text-[#174c37]">{cfg.title.toUpperCase()}</h3><p className="mt-0.5 text-[10px] text-[#6b7f74]">Đợt 1/{month}/{year} • {String(data.rule.description || cfg.description)}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[210px] flex-1 sm:flex-none"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b8a79]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên, mã ĐL, nhóm..." className="h-8 w-full rounded-md border border-[#83c9a8] bg-white pl-8 pr-2.5 text-[11px] text-[#183548] outline-none placeholder:text-[#8aa092] focus:border-[#239a69] sm:w-[240px]" /></div>
                <select value={status} onChange={(e) => setStatus(e.target.value as 'all' | 'passed' | 'failed')} className="h-8 rounded-md border border-[#83c9a8] bg-white px-2.5 text-[11px] font-semibold text-[#183548] outline-none"><option value="all">Tất cả</option><option value="passed">Đạt gia nhập</option><option value="failed">Chưa đạt</option></select>
                <button onClick={exportExcel} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#1b7f59] bg-[#239a69] px-2.5 text-[10px] font-bold text-white"><Download className="h-3.5 w-3.5" /> Excel</button>
                <button onClick={() => setDetailOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-md border border-[#b9d4c6] bg-white text-[#48695a]" aria-label="Đóng"><X className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-white">
              <table className={`w-full table-fixed border-separate border-spacing-0 bg-white text-[11px] ${variant === 'ttn' ? 'min-w-[1420px]' : 'min-w-[1120px]'}`}>
                <thead className="sticky top-0 z-20 bg-[#239a69] text-[9px] uppercase tracking-[0.04em] text-white">
                  <tr>
                    {['STT', 'AD', 'NHÓM', 'MÃ ĐL', 'HỌ TÊN', 'CHỨC VỤ'].map((h) => <th key={h} className="border border-[#d2e7dc] px-2 py-2 text-center">{h}</th>)}
                    {variant === 'tvv' ? data.months.map((m) => <th key={m.key} className="border border-[#d2e7dc] px-2 py-2 text-center">IP T{m.month}</th>) : null}
                    {variant === 'tvv' ? <th className="border border-[#d2e7dc] px-2 py-2 text-center">Tổng IP 3 tháng</th> : null}
                    {variant === 'tn' ? data.months.map((m) => <th key={m.key} className="border border-[#d2e7dc] px-2 py-2 text-center">IP nhóm T{m.month}</th>) : null}
                    {variant === 'tn' ? <th className="border border-[#d2e7dc] px-2 py-2 text-center">Tổng IP nhóm 3 tháng</th> : null}
                    {variant === 'ttn' ? data.months.map((m) => <th key={m.key} className="border border-[#d2e7dc] px-2 py-2 text-center">Đồng Hành T{m.month}</th>) : null}
                    {variant === 'ttn' ? <th className="border border-[#d2e7dc] px-2 py-2 text-center">Số tháng đạt</th> : null}
                    <th className="border border-[#d2e7dc] px-2 py-2 text-center">Kết quả</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => (
                    <tr key={row.id} className="odd:bg-white even:bg-[#f4faf6] hover:bg-[#e6f6eb]">
                      <td className="border border-[#d8e7df] px-2 py-1.5 text-center text-[#183548]">{index + 1}</td>
                      <td className="border border-[#d8e7df] px-2 py-1.5 text-[#183548]">{row.ad || '—'}</td>
                      <td className="border border-[#d8e7df] px-2 py-1.5 text-[#183548]">{row.nhom || '—'}</td>
                      <td className="border border-[#d8e7df] px-2 py-1.5 text-center font-mono text-[10px] text-[#183548]">{row.agentCode || '—'}</td>
                      <td className="border border-[#d8e7df] px-2 py-1.5 font-semibold text-[#183548]">{row.agentName || '—'}</td>
                      <td className="border border-[#d8e7df] px-2 py-1.5 text-[#48695a]">{row.chucVu || '—'}</td>
                      {variant === 'tvv' ? (row.monthlyIP || []).map((v, i) => <td key={`${row.id}-ip-${i}`} className="border border-[#d8e7df] px-2 py-1.5 text-center font-semibold text-[#183548]">{formatMoney(v)}</td>) : null}
                      {variant === 'tvv' ? <td className="border border-[#d8e7df] px-2 py-1.5 text-center font-black text-[#176b4a]">{formatMoney(row.totalIP || 0)}</td> : null}
                      {variant === 'tn' ? (row.monthlyGroupIP || []).map((v, i) => <td key={`${row.id}-gip-${i}`} className="border border-[#d8e7df] px-2 py-1.5 text-center font-semibold text-[#183548]">{formatMoney(v)}</td>) : null}
                      {variant === 'tn' ? <td className="border border-[#d8e7df] px-2 py-1.5 text-center font-black text-[#176b4a]">{formatMoney(row.totalGroupIP || 0)}</td> : null}
                      {variant === 'ttn' ? (row.monthlyDongHanh || []).map((d) => <td key={`${row.id}-${d.key}`} className="border border-[#d8e7df] px-2 py-1.5 text-center text-[#183548]"><div className={`font-black ${d.achieved ? 'text-[#137333]' : 'text-[#6b7f74]'}`}>{d.achieved ? 'ĐẠT' : 'Không'}</div><div className="mt-0.5 text-[9px] text-[#6b7f74]">{d.tvvmHDC} TVVm HĐC • {formatMoney(d.rewardAmount)}</div></td>) : null}
                      {variant === 'ttn' ? <td className="border border-[#d8e7df] px-2 py-1.5 text-center font-black text-[#176b4a]">{row.achievedMonths || 0}/3</td> : null}
                      <td className="border border-[#d8e7df] px-2 py-1.5 text-center"><span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-black ${row.passed ? 'border-[#96d0ae] bg-[#e6f6eb] text-[#137333]' : 'border-[#efb7b2] bg-[#fce8e6] text-[#b3261e]'}`}>{row.passed ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}{row.result}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRows.length === 0 ? <div className="flex h-32 items-center justify-center bg-white text-[11px] text-[#6b7f74]">Không có dữ liệu phù hợp bộ lọc.</div> : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#c9dfd4] bg-[#eef7f2] px-3 py-2 text-[10px] text-[#48695a]"><span>Hiển thị {filteredRows.length}/{data.rows.length} đối tượng</span><strong className="text-[#176b4a]">{cfg.description}</strong></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
