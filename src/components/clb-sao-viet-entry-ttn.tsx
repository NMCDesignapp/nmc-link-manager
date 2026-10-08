'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, RefreshCw, Search, Table2, UserRoundCheck, X, XCircle } from 'lucide-react';

type MonthRef = { year: number; month: number; key: string; label: string };
type DongHanhMonth = {
  key: string; label: string; tvvmHDC: number; fypTVVm: number; totalTVVmReward: number;
  rewardRate: number; rewardAmount: number; achieved: boolean;
};
type Row = {
  id: string; ad: string; nhom: string; agentCode: string; agentName: string; chucVu: string;
  monthlyDongHanh: DongHanhMonth[]; achievedMonths: number; passed: boolean; result: string;
};
type ResponseData = {
  assessment: { year: number; month: number; label: string };
  months: MonthRef[];
  rule: { requiredMonths: number; totalMonths: number; description: string; rewardDescription: string };
  summary: { total: number; passed: number; failed: number };
  rows: Row[];
};
type Props = { year: number; month: number; refreshToken: number };

const SELECT_CLASS = 'h-8 rounded-md border border-[#83c9a8] bg-white px-2.5 text-[11px] font-semibold text-[#102a22] outline-none transition focus:border-[#239a69]';
function formatNumber(value: number) { return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(value || 0)); }
function formatMoney(value: number) { return formatNumber(value); }

export function CLBGiaNhapTTNSection({ year, month, refreshToken }: Props) {
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [exporting, setExporting] = useState(false);

  const loadResult = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/clb-sao-viet/gia-nhap-ttn?year=${year}&month=${month}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || 'Không thể tính kết quả gia nhập TTN');
      setData(json);
    } catch (err) {
      setData(null); setError(err instanceof Error ? err.message : 'Không thể tính kết quả gia nhập TTN');
    } finally { setLoading(false); }
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
      const monthHeaders = data.months.flatMap((m) => [
        `TVVm HĐC T${m.month}`, `FYP TVVm T${m.month}`, `TỔNG THƯỞNG TVVm T${m.month}`,
        `TL ĐỒNG HÀNH T${m.month}`, `THƯỞNG ĐỒNG HÀNH T${m.month}`, `KẾT QUẢ T${m.month}`,
      ]);
      const headers = ['STT', 'AD', 'NHÓM', 'MÃ ĐL', 'HỌ TÊN', 'CHỨC VỤ', ...monthHeaders, 'SỐ THÁNG ĐẠT ĐỒNG HÀNH', 'KẾT QUẢ GIA NHẬP TTN'];
      const rows = data.rows.map((row, index) => [
        index + 1, row.ad, row.nhom, row.agentCode, row.agentName, row.chucVu,
        ...row.monthlyDongHanh.flatMap((item) => [item.tvvmHDC, item.fypTVVm, item.totalTVVmReward, `${item.rewardRate}%`, item.rewardAmount, item.achieved ? 'Đạt' : 'Không']),
        row.achievedMonths, row.result,
      ]);
      const ws = XLSX.utils.aoa_to_sheet([
        ['CLB SAO VIỆT - XÉT GIA NHẬP TTN'], [`Đợt xét: ${data.assessment.label}`], [`Điều kiện: ${data.rule.description}`], [`Lưu ý: ${data.rule.rewardDescription}`], [], headers, ...rows,
      ]);
      const lastCol = headers.length - 1;
      const lastRow = rows.length + 5;
      ws['!merges'] = [0, 1, 2, 3].map((r) => ({ s: { r, c: 0 }, e: { r, c: lastCol } }));
      ws['!cols'] = headers.map((header, i) => ({ wch: i === 0 ? 7 : header === 'HỌ TÊN' ? 28 : header === 'NHÓM' || header === 'CHỨC VỤ' ? 20 : header.includes('THƯỞNG') || header.startsWith('FYP') ? 20 : header.startsWith('KẾT QUẢ') ? 22 : 16 }));
      ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 5, c: 0 }, e: { r: lastRow, c: lastCol } }) };
      ws['!views'] = [{ state: 'frozen', ySplit: 6 }];
      const border = { top: { style: 'thin', color: { rgb: 'D2E7DC' } }, bottom: { style: 'thin', color: { rgb: 'D2E7DC' } }, left: { style: 'thin', color: { rgb: 'D2E7DC' } }, right: { style: 'thin', color: { rgb: 'D2E7DC' } } } as const;
      for (let c = 0; c <= lastCol; c++) {
        for (const r of [0, 1, 2, 3]) {
          const cell = ws[XLSX.utils.encode_cell({ r, c })];
          if (cell) cell.s = { font: { bold: true, color: { rgb: '174C37' }, sz: r === 0 ? 16 : 11 }, fill: { fgColor: { rgb: 'EEF7F2' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } };
        }
        const header = ws[XLSX.utils.encode_cell({ r: 5, c })];
        if (header) header.s = { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 }, fill: { fgColor: { rgb: '239A69' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border };
      }
      for (let r = 6; r <= lastRow; r++) {
        const source = data.rows[r - 6];
        for (let c = 0; c <= lastCol; c++) {
          const cell = ws[XLSX.utils.encode_cell({ r, c })];
          if (!cell) continue;
          const header = headers[c];
          const money = header.startsWith('FYP') || header.includes('THƯỞNG TVVm') || header.startsWith('THƯỞNG ĐỒNG');
          const centered = c === 0 || c === 3 || money || header.startsWith('TVVm HĐC') || header.startsWith('TL ĐỒNG') || header.startsWith('KẾT QUẢ') || header.startsWith('SỐ THÁNG');
          const finalResult = header === 'KẾT QUẢ GIA NHẬP TTN';
          cell.s = { font: finalResult ? { bold: true, color: { rgb: source?.passed ? '137333' : 'B3261E' } } : { color: { rgb: '183548' } }, fill: finalResult ? { fgColor: { rgb: source?.passed ? 'E6F6EB' : 'FCE8E6' } } : undefined, alignment: { horizontal: centered ? 'center' : 'left', vertical: 'center', wrapText: true }, border };
          if (money && typeof cell.v === 'number') cell.z = '#,##0';
        }
      }
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Gia nhập - TTN');
      XLSX.writeFile(wb, `CLB_Sao_Viet_Gia_Nhap_TTN_${data.assessment.label.replace(/\//g, '-')}.xlsx`);
    } catch (err) {
      alert(`Không thể xuất Excel: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setExporting(false); }
  }, [data]);

  return (
    <>
      {error && <div className="mt-3 border border-[#8e4b4e] bg-[#351b1d] px-4 py-3 text-sm text-[#ffd9da]">{error}</div>}
      <div className="mt-2 grid grid-cols-3 gap-1.5 sm:mt-3 sm:gap-2">
        <div className="border border-[#2f4a3f] bg-[#335b72] p-2 sm:p-3"><div className="flex items-center justify-between text-[9px] font-bold uppercase leading-tight tracking-normal sm:text-[11px] sm:tracking-wider text-[#edf4f0]"><span>Đối tượng TTN</span><UserRoundCheck className="h-4 w-4" /></div><div className="mt-1 text-xl font-black sm:mt-2 sm:text-2xl text-white">{loading ? '—' : data?.summary.total ?? 0}</div></div>
        <div className="border border-[#2f6e56] bg-[#156443] p-2 sm:p-3"><div className="text-[9px] font-bold uppercase leading-tight tracking-normal sm:text-[11px] sm:tracking-wider text-[#d7f4e4]">Đạt gia nhập</div><div className="mt-1 text-xl font-black sm:mt-2 sm:text-2xl text-emerald-200">{loading ? '—' : data?.summary.passed ?? 0}</div></div>
        <div className="border border-[#7c3b3f] bg-[#843a40] p-2 sm:p-3"><div className="text-[9px] font-bold uppercase leading-tight tracking-normal sm:text-[11px] sm:tracking-wider text-[#ffe1e2]">Chưa đạt</div><div className="mt-1 text-xl font-black sm:mt-2 sm:text-2xl text-rose-200">{loading ? '—' : data?.summary.failed ?? 0}</div></div>
      </div>

      <div className="mt-2 border border-[#6e5922] bg-[#4a3b16] p-3 sm:mt-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="text-sm font-black text-amber-100">XÉT GIA NHẬP - TTN</div><div className="mt-1 text-xs text-[#ded7c2]">Đợt 1/{month}/{year}</div><div className="mt-2 text-sm text-[#f4f0df]"><strong className="text-white">Đạt Thưởng Đồng Hành đủ 3/3 tháng liền trước</strong></div>{data?.months?.length === 3 && <div className="mt-1 text-xs text-[#edf4f0]">Kỳ xét: {data.months.map((m) => m.label).join(' • ')}</div>}</div>
          <div className="flex flex-wrap gap-2"><button onClick={() => setDetailOpen(true)} disabled={loading || !data} className="inline-flex h-10 items-center gap-2 border border-amber-300/35 bg-amber-300/10 px-3 text-xs font-bold text-amber-100 disabled:opacity-40"><Table2 className="h-4 w-4" /> Xem bảng chi tiết</button><button onClick={handleExportExcel} disabled={loading || exporting || !data || data.rows.length === 0} className="inline-flex h-10 items-center gap-2 border border-emerald-400/30 bg-emerald-400/10 px-3 text-xs font-bold text-emerald-100 disabled:opacity-40">{exporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Xuất Excel</button></div>
        </div>
      </div>

      {detailOpen && data && <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[#020706] p-2 sm:p-3">
        <div className="flex h-[82vh] w-[min(96vw,1380px)] flex-col overflow-hidden border border-[#c9dfd4] bg-[#f6fbf8] shadow-none">
          <div className="flex flex-col gap-2 border-b border-[#c9dfd4] bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="text-sm font-black text-[#174c37]">XÉT GIA NHẬP - TTN</h3><p className="mt-0.5 text-[10px] text-[#4b6558]">Đợt {data.assessment.label} • {data.rule.description}</p></div>
            <div className="flex flex-wrap items-center gap-2"><div className="relative min-w-[210px] flex-1 sm:flex-none"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#4f7462]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên, mã ĐL, nhóm..." className="h-8 w-full rounded-md border border-[#83c9a8] bg-white pl-8 pr-2.5 text-[11px] text-[#102a22] outline-none placeholder:text-[#8aa092] focus:border-[#239a69] sm:w-[240px]" /></div><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'passed' | 'failed')} className={SELECT_CLASS}><option value="all">Tất cả</option><option value="passed">Đạt gia nhập</option><option value="failed">Chưa đạt</option></select><button onClick={handleExportExcel} disabled={exporting} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#1b7f59] bg-[#239a69] px-2.5 text-[10px] font-bold text-white"><Download className="h-3.5 w-3.5" /> Excel</button><button onClick={() => setDetailOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-md border border-[#b9d4c6] bg-white text-[#2f5948]" aria-label="Đóng"><X className="h-4 w-4" /></button></div>
          </div>
          <div className="flex-1 overflow-auto bg-white">
            <table className="min-w-[1160px] w-max table-auto border-separate border-spacing-0 bg-white text-[10px]">
              <thead className="sticky top-0 z-20 bg-[#239a69] text-[9px] uppercase tracking-[0.04em] text-white"><tr><th className="border-[0.5px] border-[#527969] px-1.5 py-1.5 whitespace-nowrap text-center">STT</th><th className="border-[0.5px] border-[#527969] px-1.5 py-1.5 whitespace-nowrap text-center">AD</th><th className="border-[0.5px] border-[#527969] px-1.5 py-1.5 whitespace-nowrap text-center">Nhóm</th><th className="border-[0.5px] border-[#527969] px-1.5 py-1.5 whitespace-nowrap text-center">Mã ĐL</th><th className="border-[0.5px] border-[#527969] px-1.5 py-1.5 whitespace-nowrap text-center">Họ tên</th><th className="border-[0.5px] border-[#527969] px-1.5 py-1.5 whitespace-nowrap text-center">Chức vụ</th>{data.months.map((m) => <th key={m.key} className="border-[0.5px] border-[#527969] px-1.5 py-1.5 whitespace-nowrap text-center">Đồng Hành T{m.month}</th>)}<th className="border-[0.5px] border-[#527969] px-1.5 py-1.5 whitespace-nowrap text-center">Số tháng đạt</th><th className="border-[0.5px] border-[#527969] px-1.5 py-1.5 whitespace-nowrap text-center">Kết quả</th></tr></thead>
              <tbody>{filteredRows.map((row, index) => <tr key={row.id} className="odd:bg-white even:bg-[#f4faf6] hover:bg-[#e3f2e8]"><td className="border-[0.5px] border-[#78998d] px-1.5 py-1 whitespace-nowrap text-center text-[#102a22]">{index + 1}</td><td className="border-[0.5px] border-[#78998d] px-1.5 py-1 whitespace-nowrap text-[#102a22]">{row.ad || '—'}</td><td className="border-[0.5px] border-[#78998d] px-1.5 py-1 whitespace-nowrap text-[#102a22]">{row.nhom || '—'}</td><td className="border-[0.5px] border-[#78998d] px-1.5 py-1 whitespace-nowrap text-center font-mono text-[#102a22]">{row.agentCode}</td><td className="border-[0.5px] border-[#78998d] px-1.5 py-1 whitespace-nowrap font-semibold text-[#102a22]">{row.agentName}</td><td className="border-[0.5px] border-[#78998d] px-1.5 py-1 whitespace-nowrap text-[#2f5948]">{row.chucVu || '—'}</td>{row.monthlyDongHanh.map((item) => <td key={`${row.id}-${item.key}`} className={`border-[0.5px] border-[#78998d] px-1.5 py-1 whitespace-nowrap text-center ${item.achieved ? 'bg-[#e3f2e8] text-[#075f38]' : 'text-[#2f5948]'}`}><div className="font-black">{item.achieved ? 'ĐẠT' : 'Không'}</div><div className="mt-0.5 text-[9px]">{item.tvvmHDC} TVVm HĐC • {formatMoney(item.rewardAmount)}</div></td>)}<td className="border-[0.5px] border-[#78998d] px-1.5 py-1 whitespace-nowrap text-center text-sm font-black text-[#075f38]">{row.achievedMonths}/3</td><td className="border-[0.5px] border-[#78998d] px-1.5 py-1 whitespace-nowrap text-center"><span className={`inline-flex items-center justify-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-black whitespace-nowrap ${row.passed ? 'border-[#96d0ae] bg-[#e3f2e8] text-[#075f38]' : 'border-[#efb7b2] bg-[#f7e4e1] text-[#b3261e]'}`}>{row.passed ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}{row.passed ? 'Đạt gia nhập TTN' : 'Chưa đạt'}</span></td></tr>)}</tbody>
            </table>
            {filteredRows.length === 0 && <div className="flex h-32 items-center justify-center bg-white text-[10px] text-[#4b6558]">Không có dữ liệu phù hợp bộ lọc.</div>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#c9dfd4] bg-[#eef7f2] px-3 py-2 text-[10px] text-[#2f5948]"><span>Hiển thị {filteredRows.length}/{data.rows.length} TTN chưa thuộc CLB</span><span><strong className="text-[#176b4a]">Đồng Hành đủ 3/3 tháng</strong></span></div>
        </div>
      </div>}
    </>
  );
}

// nmc-clb-solid-compact-v2
