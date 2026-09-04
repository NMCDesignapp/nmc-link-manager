'use client';

import { useEffect, useMemo, useState } from 'react';
import { Award, FileSpreadsheet, Loader2, Search, X } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import {
  buildTitleTiers,
  getTitleTierStatus,
  type TitleAssessmentProgram,
} from '@/lib/clb-title-tier-display';

type Program = TitleAssessmentProgram;

type Summary = {
  total: number;
  vang: number;
  bachkim: number;
  kimcuong: number;
  chuaDat: number;
};

type Row = {
  ad: string;
  nhom: string;
  agentCode: string;
  agentName: string;
  chucVu: string;
  fypThang?: number;
  fypLuyKe?: number;
  fypTVVm?: number;
  slTvvmHDC?: number;
  eligible?: boolean;
  rank: string;
};

type Data = {
  assessment: { year: number; month: number; label: string };
  performancePeriod: { year: number; month: number; label: string };
  thresholdPeriod: { year: number; month: number; thresholdIndex: number; label: string };
  thresholds: any;
  tvv: { summary: Summary; rows: Row[] };
  tnKtm: { summary: Summary; rows: Row[] };
  tnTd: { summary: Summary; rows: Row[] };
};

const requestCache = new Map<string, Promise<Data>>();

function getData(year: number, month: number, refreshToken: number) {
  const key = `${year}-${month}-${refreshToken}`;
  let request = requestCache.get(key);
  if (!request) {
    request = fetch(`/api/clb-sao-viet/danh-hieu?year=${year}&month=${month}`, { cache: 'no-store' }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || 'Không thể tải kết quả xét danh hiệu');
      return body as Data;
    });
    requestCache.set(key, request);
  }
  return request;
}

function formatNumber(value: number | undefined) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function programMeta(program: Program) {
  if (program === 'tvv') return { title: 'Xét danh hiệu - TVV', key: 'tvv' as const };
  if (program === 'tnKtm') return { title: 'Xét danh hiệu - TN KTM', key: 'tnKtm' as const };
  return { title: 'Xét danh hiệu - TN TD', key: 'tnTd' as const };
}

function exportExcel(program: Program, data: Data, rows: Row[]) {
  const meta = programMeta(program);
  const period = data.performancePeriod.label;
  const tiers = buildTitleTiers(program, data.thresholds[meta.key]);
  const tierHeaders = tiers.map((tier) => `${tier.rank.toUpperCase()}\n${tier.requirements.join('\n')}`);
  const tierValues = (row: Row) => tiers.map((tier) => getTitleTierStatus(program, row, tier).label);
  const aoa: any[][] = [[meta.title.toUpperCase()], [`Đợt xét: ${data.assessment.label} • Bộ chỉ tiêu ${data.thresholdPeriod.label} • Doanh số chốt ${period}`], []];

  if (program === 'tvv') {
    aoa.push(['STT', 'AD', 'NHÓM', 'MÃ TVV', 'HỌ TÊN TVV', 'CHỨC VỤ', `FYP ${period}`, 'FYP LŨY KẾ', ...tierHeaders]);
    rows.forEach((r, i) => aoa.push([i + 1, r.ad, r.nhom, r.agentCode, r.agentName, r.chucVu, r.fypThang || 0, r.fypLuyKe || 0, ...tierValues(r)]));
  } else if (program === 'tnKtm') {
    aoa.push(['STT', 'AD', 'NHÓM', 'MÃ TVV', 'HỌ TÊN TN', 'CHỨC VỤ', 'FYP LŨY KẾ', ...tierHeaders]);
    rows.forEach((r, i) => aoa.push([i + 1, r.ad, r.nhom, r.agentCode, r.agentName, r.chucVu, r.fypLuyKe || 0, ...tierValues(r)]));
  } else {
    aoa.push(['STT', 'AD', 'NHÓM', 'MÃ TVV', 'HỌ TÊN TN', 'CHỨC VỤ', 'FYP TVVm', 'SL TVVm HĐC', ...tierHeaders]);
    rows.forEach((r, i) => aoa.push([i + 1, r.ad, r.nhom, r.agentCode, r.agentName, r.chucVu, r.fypTVVm || 0, r.slTvvmHDC || 0, ...tierValues(r)]));
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const lastCol = aoa[3].length - 1;
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
  ];
  ws['!cols'] = aoa[3].map((_: unknown, index: number) => ({
    wch: index >= aoa[3].length - tiers.length ? 26 : [6, 14, 20, 15, 28, 18, 18, 18][index] || 18,
  }));
  ws['!rows'] = [{ hpt: 26 }, { hpt: 22 }, { hpt: 8 }, { hpt: 46 }];
  if (ws.A1) ws.A1.s = { font: { bold: true, sz: 16 }, alignment: { horizontal: 'center' } };
  if (ws.A2) ws.A2.s = { font: { italic: true, sz: 10 }, alignment: { horizontal: 'center' } };
  const headerRow = 3;
  for (let c = 0; c <= lastCol; c += 1) {
    const cell = ws[XLSX.utils.encode_cell({ r: headerRow, c })];
    if (cell) cell.s = { fill: { fgColor: { rgb: '0F766E' } }, font: { bold: true, color: { rgb: 'FFFFFF' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: { top: { style: 'thin', color: { rgb: '334155' } }, bottom: { style: 'thin', color: { rgb: '334155' } }, left: { style: 'thin', color: { rgb: '334155' } }, right: { style: 'thin', color: { rgb: '334155' } } } };
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Xét danh hiệu');
  XLSX.writeFile(wb, `CLB_Sao_Viet_${meta.title.replace(/\s+/g, '_')}_${data.assessment.label.replaceAll('/', '-')}.xlsx`);
}

export function CLBTitleAssessmentSection({ year, month, refreshToken, program }: { year: number; month: number; refreshToken: number; program: Program }) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getData(year, month, refreshToken)
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [year, month, refreshToken]);

  const meta = programMeta(program);
  const section = data ? data[meta.key] : null;
  const tiers = data ? buildTitleTiers(program, data.thresholds[meta.key]) : [];
  const rows = useMemo(() => {
    const allRows = section?.rows || [];
    const q = search.trim().toLocaleLowerCase('vi-VN');
    if (!q) return allRows;
    return allRows.filter((row) => [row.ad, row.nhom, row.agentCode, row.agentName, row.chucVu, row.rank].some((value) => String(value || '').toLocaleLowerCase('vi-VN').includes(q)));
  }, [section, search]);

  if (loading) {
    return <div className="mt-3 flex items-center justify-center gap-2 bg-[#F8FAFC] px-3 py-5 text-xs font-semibold text-[#334155]"><Loader2 className="h-4 w-4 animate-spin" /> Đang tính kết quả danh hiệu...</div>;
  }
  if (error || !data || !section) {
    return <div className="mt-3 bg-[#FEE2E2] px-3 py-4 text-xs font-bold text-[#991B1B]">{error || 'Không có dữ liệu'}</div>;
  }

  const summary = section.summary;
  const cards = program === 'tnTd'
    ? [
        ['Đối tượng', summary.total, '#334155'], ['Hạng Vàng', summary.vang, '#B7791F'], ['Bạch Kim', summary.bachkim, '#4B5563'], ['Chưa đạt', summary.chuaDat, '#991B1B'],
      ]
    : [
        ['Đối tượng', summary.total, '#334155'], ['Hạng Vàng', summary.vang, '#B7791F'], ['Bạch Kim', summary.bachkim, '#4B5563'], ['Kim Cương', summary.kimcuong, '#0E7490'],
      ];

  const thresholdText = (() => {
    if (program === 'tvv') {
      const t = data.thresholds.tvv;
      return `Bộ chỉ tiêu ${data.thresholdPeriod.label}: Vàng ${formatNumber(t.vang)} • Bạch Kim ${formatNumber(t.bachkim)} • Kim Cương ${formatNumber(t.kimcuong)} • FYP tháng ≥ ${formatNumber(t.monthlyFypMin)}`;
    }
    if (program === 'tnKtm') {
      const t = data.thresholds.tnKtm;
      return `Bộ chỉ tiêu ${data.thresholdPeriod.label}: Vàng ${formatNumber(t.vang)} • Bạch Kim ${formatNumber(t.bachkim)} • Kim Cương ${formatNumber(t.kimcuong)}`;
    }
    const t = data.thresholds.tnTd;
    return `Bộ chỉ tiêu ${data.thresholdPeriod.label}: Vàng FYP TVVm ${formatNumber(t.vang.fyp)} + ${t.vang.hdc} HĐC • Bạch Kim ${formatNumber(t.bachkim.fyp)} + ${t.bachkim.hdc} HĐC`;
  })();

  return (
    <div className="mt-3 bg-[#FFFDF7] p-2.5 sm:p-3">
      <div className="mb-2 bg-[#E2E8F0] px-2.5 py-2 text-[10px] font-bold leading-4 text-[#1E293B] sm:text-xs">{thresholdText}</div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {cards.map(([label, value, bg]) => (
          <div key={String(label)} className="min-w-0 px-2 py-2 text-center text-white" style={{ backgroundColor: String(bg) }}>
            <div className="truncate text-[9px] font-bold uppercase tracking-wide">{label}</div>
            <div className="mt-0.5 text-lg font-black leading-none">{value}</div>
          </div>
        ))}
      </div>
      {program !== 'tnTd' && summary.chuaDat > 0 ? <div className="mt-1 text-right text-[10px] font-bold text-[#991B1B]">Chưa đạt: {summary.chuaDat}</div> : null}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[10px] font-semibold text-[#475569]">Đối tượng lấy duy nhất từ DS thành viên Mục 3 • Doanh số theo nguồn đồng bộ hiện tại</div>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => exportExcel(program, data, section.rows)} className="inline-flex h-8 items-center gap-1 bg-[#0F766E] px-2.5 text-[10px] font-bold text-white hover:bg-[#115E59]"><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</button>
          <button type="button" onClick={() => setDetailOpen(true)} className="h-8 bg-[#1D4ED8] px-3 text-[10px] font-bold text-white hover:bg-[#1E40AF]">Xem bảng chi tiết</button>
        </div>
      </div>

      {detailOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0F172A] p-2 sm:p-4">
          <div className="flex h-[84vh] w-full max-w-[1420px] flex-col bg-[#F8FAFC] shadow-2xl">
            <div className="flex items-center justify-between bg-[#0F766E] px-3 py-2 text-white">
              <div>
                <div className="text-sm font-black uppercase">{meta.title}</div>
                <div className="text-[10px] font-semibold text-[#ECFDF5]">Đợt {data.assessment.label} • Bộ chỉ tiêu {data.thresholdPeriod.label} • Doanh số {data.performancePeriod.label}</div>
              </div>
              <button type="button" onClick={() => setDetailOpen(false)} className="flex h-8 w-8 items-center justify-center bg-[#134E4A] text-white hover:bg-[#7F1D1D]"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex items-center gap-2 bg-[#E2E8F0] px-2 py-1.5">
              <Search className="h-3.5 w-3.5 text-[#334155]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm AD, nhóm, mã, họ tên, chức vụ, danh hiệu..." className="h-7 flex-1 bg-white px-2 text-[10px] font-semibold text-[#111827] outline-none" />
              <span className="text-[10px] font-bold text-[#334155]">{rows.length}/{section.rows.length}</span>
            </div>
            <div className="flex-1 overflow-auto bg-white">
              <table className="w-max min-w-full border-collapse text-[10px] text-[#111827]">
                <thead className="sticky top-0 z-10 bg-[#CBD5E1] text-[#0F172A]">
                  <tr>
                    {['STT', 'AD', 'NHÓM', 'MÃ TVV', program === 'tvv' ? 'HỌ TÊN TVV' : 'HỌ TÊN TN', 'CHỨC VỤ'].map((head) => <th key={head} className="border-[0.5px] border-[#334155] px-1.5 py-1 text-center font-black whitespace-nowrap">{head}</th>)}
                    {program === 'tvv' ? <><th className="border-[0.5px] border-[#334155] px-1.5 py-1 text-center font-black whitespace-nowrap">FYP {data.performancePeriod.label}</th><th className="border-[0.5px] border-[#334155] px-1.5 py-1 text-center font-black whitespace-nowrap">FYP LŨY KẾ</th></> : null}
                    {program === 'tnKtm' ? <th className="border-[0.5px] border-[#334155] px-1.5 py-1 text-center font-black whitespace-nowrap">FYP LŨY KẾ</th> : null}
                    {program === 'tnTd' ? <><th className="border-[0.5px] border-[#334155] px-1.5 py-1 text-center font-black whitespace-nowrap">FYP TVVm</th><th className="border-[0.5px] border-[#334155] px-1.5 py-1 text-center font-black whitespace-nowrap">SL TVVm HĐC</th></> : null}
                    {tiers.map((tier) => (
                      <th key={tier.rank} className="min-w-[132px] border-[0.5px] border-[#334155] px-2 py-1.5 text-center font-black" style={{ backgroundColor: tier.colors.header, color: '#FFFFFF' }}>
                        <span className="block text-[10px] uppercase">Hạng {tier.rank}</span>
                        {tier.requirements.map((requirement) => <span key={requirement} className="mt-0.5 block text-[8px] font-bold normal-case leading-3">{requirement}</span>)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    return (
                      <tr key={`${row.agentCode}-${index}`} className="bg-white hover:bg-[#F1F5F9]">
                        <td className="border-[0.5px] border-[#475569] px-1.5 py-1 text-center">{index + 1}</td>
                        <td className="border-[0.5px] border-[#475569] px-1.5 py-1 whitespace-nowrap">{row.ad || '—'}</td>
                        <td className="border-[0.5px] border-[#475569] px-1.5 py-1 whitespace-nowrap">{row.nhom || '—'}</td>
                        <td className="border-[0.5px] border-[#475569] px-1.5 py-1 text-center font-mono whitespace-nowrap">{row.agentCode || '—'}</td>
                        <td className="border-[0.5px] border-[#475569] px-1.5 py-1 font-bold whitespace-nowrap">{row.agentName || '—'}</td>
                        <td className="border-[0.5px] border-[#475569] px-1.5 py-1 text-center whitespace-nowrap">{row.chucVu || '—'}</td>
                        {program === 'tvv' ? <><td className="border-[0.5px] border-[#475569] px-1.5 py-1 text-right whitespace-nowrap">{formatNumber(row.fypThang)}</td><td className="border-[0.5px] border-[#475569] px-1.5 py-1 text-right font-bold whitespace-nowrap">{formatNumber(row.fypLuyKe)}</td></> : null}
                        {program === 'tnKtm' ? <td className="border-[0.5px] border-[#475569] px-1.5 py-1 text-right font-bold whitespace-nowrap">{formatNumber(row.fypLuyKe)}</td> : null}
                        {program === 'tnTd' ? <><td className="border-[0.5px] border-[#475569] px-1.5 py-1 text-right font-bold whitespace-nowrap">{formatNumber(row.fypTVVm)}</td><td className="border-[0.5px] border-[#475569] px-1.5 py-1 text-center font-bold">{row.slTvvmHDC || 0}</td></> : null}
                        {tiers.map((tier) => {
                          const status = getTitleTierStatus(program, row, tier);
                          return (
                            <td key={tier.rank} className="border-[0.5px] border-[#475569] px-1.5 py-1 text-center font-bold" style={{ backgroundColor: tier.colors.body, color: tier.colors.text }}>
                              <span className={status.kind === 'achieved' ? 'text-[10px] font-black text-emerald-700' : status.kind === 'surpassed' ? 'text-[9px] font-black text-slate-500' : 'text-[9px] font-bold leading-3 text-rose-700'}>
                                {status.label}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
