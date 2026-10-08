'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, RefreshCw, Search, Table2, Users, X, XCircle } from 'lucide-react';

type MonthRef = { year: number; month: number; key: string; label: string };
type RetentionRow = {
  id: string;
  ad: string;
  nhom: string;
  agentCode: string;
  agentName: string;
  chucVu: string;
  note: string;
  monthlyIP: number[];
  qualifyingMonths: number;
  passed: boolean;
  result: string;
};
type RetentionResponse = {
  assessment: { year: number; month: number; label: string };
  rule: { ipThreshold: number; requiredMonths: number; totalMonths: number; description: string };
  months: MonthRef[];
  summary: { total: number; passed: number; failed: number };
  rows: RetentionRow[];
};

type Props = { year: number; month: number; refreshToken: number };

const SELECT_CLASS = 'h-8 rounded-md border border-[#83c9a8] bg-white px-2.5 text-[11px] font-semibold text-[#102a22] outline-none transition focus:border-[#239a69]';

function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(value || 0));
}
function formatMoney(value: number) { return formatNumber(value); }
function assessmentLabel(month: number, year: number) { return `Đợt 1/${month}/${year}`; }

export function CLBDuyTriTVVSection({ year, month, refreshToken }: Props) {
  const [data, setData] = useState<RetentionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [exporting, setExporting] = useState(false);

  const loadResult = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/clb-sao-viet/duy-tri?year=${year}&month=${month}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || 'Không thể tính kết quả');
      setData(json);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Không thể tính kết quả');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { loadResult(); }, [loadResult, refreshToken]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi-VN');
    return (data?.rows || []).filter((row) => {
      if (statusFilter === 'passed' && !row.passed) return false;
      if (statusFilter === 'failed' && row.passed) return false;
      if (!keyword) return true;
      return [row.agentCode, row.agentName, row.nhom, row.ad, row.chucVu].join(' ').toLocaleLowerCase('vi-VN').includes(keyword);
    });
  }, [data?.rows, search, statusFilter]);

  const handleExportExcel = useCallback(async () => {
    if (!data || data.rows.length === 0) return;
    setExporting(true);
    try {
      const XLSX = await import('xlsx-js-style');
      const monthHeaders = data.months.map((m) => `TỔNG IP T${m.month}`);
      const headers = ['STT', 'AD', 'NHÓM', 'MÃ ĐL', 'HỌ TÊN', 'CHỨC VỤ', ...monthHeaders, 'SỐ THÁNG IP ≥ 12 TRIỆU', 'KẾT QUẢ'];
      const rows = data.rows.map((row, index) => [index + 1, row.ad, row.nhom, row.agentCode, row.agentName, row.chucVu, ...row.monthlyIP, row.qualifyingMonths, row.result]);
      const ws = XLSX.utils.aoa_to_sheet([
        ['CLB SAO VIỆT - XÉT DUY TRÌ TVV'],
        [`Đợt xét: ${data.assessment.label}`],
        [`Điều kiện: ${data.rule.description}`],
        [],
        headers,
        ...rows,
      ]);
      const lastCol = headers.length - 1;
      const lastRow = rows.length + 4;
      ws['!merges'] = [0, 1, 2].map((r) => ({ s: { r, c: 0 }, e: { r, c: lastCol } }));
      ws['!cols'] = headers.map((_, i) => ({ wch: i === 4 ? 28 : i === 5 ? 20 : i >= 6 && i <= 8 ? 17 : i === lastCol - 1 ? 22 : i === lastCol ? 18 : i === 0 ? 7 : 16 }));
      ws['!rows'] = [{ hpt: 28 }, { hpt: 22 }, { hpt: 30 }, { hpt: 8 }, { hpt: 32 }, ...rows.map(() => ({ hpt: 24 }))];
      ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 4, c: 0 }, e: { r: lastRow, c: lastCol } }) };
      ws['!views'] = [{ state: 'frozen', ySplit: 5 }];

      const border = {
        top: { style: 'thin', color: { rgb: 'E7D8A8' } }, bottom: { style: 'thin', color: { rgb: 'E7D8A8' } },
        left: { style: 'thin', color: { rgb: 'E7D8A8' } }, right: { style: 'thin', color: { rgb: 'E7D8A8' } },
      } as const;
      for (let c = 0; c <= lastCol; c++) {
        for (const r of [0, 1, 2]) {
          const cell = ws[XLSX.utils.encode_cell({ r, c })];
          if (!cell) continue;
          cell.s = {
            font: { bold: true, color: { rgb: r === 0 ? '7A5200' : '5B4300' }, sz: r === 0 ? 16 : 11 },
            fill: { fgColor: { rgb: r === 0 ? 'FFF2CC' : 'FFF9E6' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          };
        }
        const h = ws[XLSX.utils.encode_cell({ r: 4, c })];
        if (h) h.s = { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 }, fill: { fgColor: { rgb: '7A5200' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border };
      }
      for (let r = 5; r <= lastRow; r++) {
        const source = data.rows[r - 5];
        for (let c = 0; c <= lastCol; c++) {
          const cell = ws[XLSX.utils.encode_cell({ r, c })];
          if (!cell) continue;
          const numeric = c === 0 || (c >= 6 && c <= 9);
          const result = c === lastCol;
          cell.s = {
            font: result ? { bold: true, color: { rgb: source?.passed ? '137333' : 'C5221F' } } : { color: { rgb: '202124' } },
            fill: result ? { fgColor: { rgb: source?.passed ? 'E6F4EA' : 'FCE8E6' } } : undefined,
            alignment: { horizontal: numeric || result ? 'center' : 'left', vertical: 'center', wrapText: true },
            border,
          };
          if (c >= 6 && c <= 8 && typeof cell.v === 'number') cell.z = '#,##0';
        }
      }
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Xét duy trì - TVV');
      XLSX.writeFile(wb, `CLB_Sao_Viet_Xet_Duy_Tri_TVV_${data.assessment.label.replace(/\//g, '-')}.xlsx`);
    } catch (err) {
      alert(`Không thể xuất Excel: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setExporting(false); }
  }, [data]);

  return (
    <>
      <section className="mt-3 grid grid-cols-3 gap-1.5 sm:mt-5 sm:gap-3">
        <div className="border border-[#2f4a3f] bg-[#335b72] p-2 sm:p-4 shadow-none">
          <div className="flex items-center justify-between"><span className="text-[9px] font-bold uppercase leading-tight tracking-[0.04em] sm:text-xs sm:tracking-[0.12em] text-[#edf4f0]">Đối tượng xét TVV</span><Users className="h-4 w-4 text-amber-300 sm:h-5 sm:w-5" /></div>
          <div className="mt-1.5 text-xl font-black sm:mt-3 sm:text-3xl text-white">{loading ? '—' : data?.summary.total ?? 0}</div>
          <div className="mt-1 hidden text-xs text-[#edf4f0] sm:block">Toàn bộ DS thành viên CLB Sao Việt</div>
        </div>
        <div className="border border-[#2f6e56] bg-[#156443] p-2 sm:p-4 shadow-none">
          <div className="flex items-center justify-between"><span className="text-[9px] font-bold uppercase leading-tight tracking-[0.04em] sm:text-xs sm:tracking-[0.12em] text-[#b4e1ce]">Đạt duy trì TVV</span><CheckCircle2 className="h-4 w-4 text-emerald-300 sm:h-5 sm:w-5" /></div>
          <div className="mt-1.5 text-xl font-black sm:mt-3 sm:text-3xl text-emerald-200">{loading ? '—' : data?.summary.passed ?? 0}</div>
          <div className="mt-1 hidden text-xs text-[#d7f4e4] sm:block">Có ít nhất 2/3 tháng đạt chuẩn</div>
        </div>
        <div className="border border-[#7c3b3f] bg-[#843a40] p-2 sm:p-4 shadow-none">
          <div className="flex items-center justify-between"><span className="text-[9px] font-bold uppercase leading-tight tracking-[0.04em] sm:text-xs sm:tracking-[0.12em] text-[#f2c4c5]">Không đạt TVV</span><XCircle className="h-4 w-4 text-rose-300 sm:h-5 sm:w-5" /></div>
          <div className="mt-1.5 text-xl font-black sm:mt-3 sm:text-3xl text-rose-200">{loading ? '—' : data?.summary.failed ?? 0}</div>
          <div className="mt-1 hidden text-xs text-[#ffe1e2] sm:block">Có dưới 2 tháng đạt chuẩn</div>
        </div>
      </section>

      {error && <div className="mt-5 border border-[#8e4b4e] bg-[#351b1d] px-4 py-3 text-sm text-[#ffd9da]">{error}</div>}

      <section className="mt-5">
        <div className="relative overflow-hidden border border-[#6e5922] bg-[#0b1511] shadow-none">
          <div className="absolute left-0 top-0 h-full w-1 bg-[#d4a72c]" />
          <div className="grid gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-[1fr_auto] lg:items-center lg:p-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#8b6d22] bg-[#32280f] text-lg font-black text-[#f6d77f]">1</div>
                <div><h2 className="text-lg font-black text-amber-100 sm:text-xl">Xét duy trì - TVV</h2><p className="mt-1 text-sm text-[#ded7c2]">{assessmentLabel(month, year)}</p></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#c7d3cd]">
                <span>Điều kiện: <strong className="text-white">ít nhất 2/3 tháng có Tổng IP ≥ 12 triệu</strong></span>
                {data?.months?.length === 3 && <span>Kỳ doanh số: <strong className="text-amber-100">{data.months.map((m) => m.label).join(' • ')}</strong></span>}
              </div>
              <p className="mt-3 text-xs leading-5 text-[#edf4f0]">IP từng tháng được tổng hợp duy nhất theo Ngày phát hành của hợp đồng.</p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <button onClick={() => setDetailOpen(true)} disabled={loading || !data} className="inline-flex h-11 items-center gap-2 border border-amber-300/35 bg-amber-300/10 px-4 text-sm font-bold text-amber-100 transition hover:bg-amber-300/15 disabled:opacity-40"><Table2 className="h-4 w-4" /> Xem bảng chi tiết</button>
              <button onClick={handleExportExcel} disabled={loading || exporting || !data || data.rows.length === 0} className="inline-flex h-11 items-center gap-2 border border-emerald-400/30 bg-emerald-400/10 px-4 text-sm font-bold text-emerald-100 transition hover:bg-emerald-400/15 disabled:opacity-40">{exporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Xuất Excel kết quả</button>
            </div>
          </div>
        </div>
      </section>

      {detailOpen && data && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020706] p-2 sm:p-3">
          <div className="flex h-[82vh] w-[min(96vw,1380px)] flex-col overflow-hidden border border-[#c9dfd4] bg-[#f6fbf8] shadow-none nmc-clb-detail-solid-v1">
            <div className="flex flex-col gap-2 border-b border-[#c9dfd4] bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div><h3 className="text-sm font-black text-[#174c37]">XÉT DUY TRÌ - TVV</h3><p className="mt-0.5 text-[10px] text-[#4b6558]">{assessmentLabel(data.assessment.month, data.assessment.year)} • {data.rule.description}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[220px] flex-1 sm:flex-none"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4f7462]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên, mã ĐL, nhóm..." className="h-8 w-full rounded-md border border-[#83c9a8] bg-white pl-8 pr-2.5 text-[11px] text-[#102a22] outline-none placeholder:text-[#8aa092] focus:border-[#239a69] sm:w-[240px]" /></div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'passed' | 'failed')} className={SELECT_CLASS}><option value="all" className="bg-white text-[#102a22]">Tất cả kết quả</option><option value="passed" className="bg-white text-[#102a22]">Đạt duy trì</option><option value="failed" className="bg-white text-[#102a22]">Không đạt</option></select>
                <button onClick={handleExportExcel} disabled={exporting} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#1b7f59] bg-[#239a69] px-2.5 text-[10px] font-bold text-white hover:bg-[#1d875d]"><Download className="h-4 w-4" /> Excel</button>
                <button onClick={() => setDetailOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-md border border-[#b9d4c6] bg-white text-[#2f5948] hover:bg-[#eef7f2]" aria-label="Đóng"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-white">
              <table className="min-w-[820px] w-max table-auto border-separate border-spacing-0 bg-white text-[10px] [&_th]:!whitespace-nowrap [&_th]:!border-[#527969] [&_th]:!border-[0.5px] [&_th]:!px-1.5 [&_th]:!py-1.5 [&_th]:!text-center [&_td]:!whitespace-nowrap [&_td]:!border-[#78998d] [&_td]:!border-[0.5px] [&_td]:!bg-white [&_td]:!px-1.5 [&_td]:!py-1 [&_td]:!text-[#102a22]">
                <thead className="sticky top-0 z-20 bg-[#239a69] text-[9px] uppercase tracking-[0.04em] text-white shadow-none"><tr>
                  <th className="border-[0.5px] border-[#527969] px-2 py-3 text-center">STT</th><th className="border-[0.5px] border-[#527969] px-3 py-3 text-center">AD</th><th className="border-[0.5px] border-[#527969] px-3 py-3 text-center">Nhóm</th><th className="border-[0.5px] border-[#527969] px-3 py-3 text-center">Mã ĐL</th><th className="border-[0.5px] border-[#527969] px-3 py-3 text-center">Họ tên</th><th className="border-[0.5px] border-[#527969] px-3 py-3 text-center">Chức vụ</th>
                  {data.months.map((m) => <th key={m.key} className="border-[0.5px] border-[#527969] px-3 py-3 text-center">Tổng IP T{m.month}</th>)}
                  <th className="border-[0.5px] border-[#527969] px-3 py-3 text-center">Số tháng ≥ 12tr</th><th className="border-[0.5px] border-[#527969] px-3 py-3 text-center">Kết quả</th>
                </tr></thead>
                <tbody>{filteredRows.map((row, index) => <tr key={row.id} className="odd:bg-white even:bg-[#f4faf6] hover:bg-[#e3f2e8]">
                  <td className="border-[0.5px] border-[#78998d] px-2 py-2.5 text-center text-[#b9c7c0]">{index + 1}</td><td className="border-[0.5px] border-[#78998d] px-3 py-2.5 text-[#c7d3cd]">{row.ad || '—'}</td><td className="border-[0.5px] border-[#78998d] px-3 py-2.5 text-[#c7d3cd]">{row.nhom || '—'}</td><td className="border-[0.5px] border-[#78998d] px-3 py-2.5 text-center font-mono text-xs text-[#f6dc96]">{row.agentCode || '—'}</td><td className="border-[0.5px] border-[#78998d] px-3 py-2.5 font-semibold text-white">{row.agentName || '—'}</td><td className="border-[0.5px] border-[#78998d] px-3 py-2.5 text-[#eee8d4]">{row.chucVu || '—'}</td>
                  {row.monthlyIP.map((value, i) => <td key={`${row.id}-${i}`} className={`border-[0.5px] border-[#78998d] px-3 py-2.5 text-center font-semibold ${value >= data.rule.ipThreshold ? 'bg-[#e5f3ea] text-[#075f38]' : 'text-[#f4f0df]'}`}>{formatMoney(value)}</td>)}
                  <td className="border-[0.5px] border-[#78998d] px-3 py-2.5 text-center text-sm font-black text-[#705300]">{row.qualifyingMonths}</td><td className="border-[0.5px] border-[#78998d] px-3 py-2.5 text-center"><span className={`inline-flex min-w-[108px] items-center justify-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[9px] font-black whitespace-nowrap ${row.passed ? 'border-[#96d0ae] bg-[#e3f2e8] text-[#075f38]' : 'border-[#efb7b2] bg-[#f7e4e1] text-[#b3261e]'}`}>{row.passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}{row.result}</span></td>
                </tr>)}</tbody>
              </table>
              {filteredRows.length === 0 && <div className="flex h-32 items-center justify-center bg-white text-[10px] text-[#4b6558]">Không có dữ liệu phù hợp bộ lọc.</div>}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#c9dfd4] bg-[#eef7f2] px-3 py-2 text-[10px] text-[#2f5948] [&_strong]:!text-[#176b4a]"><span>Hiển thị {filteredRows.length}/{data.rows.length} thành viên</span><span>Chuẩn tháng: <strong className="text-amber-100">IP ≥ {formatNumber(data.rule.ipThreshold)}</strong> • Chuẩn duy trì: <strong className="text-emerald-200">≥ {data.rule.requiredMonths}/{data.rule.totalMonths} tháng</strong></span></div>
          </div>
        </div>
      )}
    </>
  );
}

// nmc-clb-solid-compact-v2
