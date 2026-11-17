'use client';

import React, { useMemo, useState } from 'react';
import { Award, BookOpen, ChevronDown, ChevronLeft, Download, ImageIcon, Search, ShieldCheck, Shirt, Users, X } from 'lucide-react';
import { buildCskkRows, CSKK_THRESHOLDS, getCskkStatus, type CskkKind, type CskkRow } from '@/lib/cskk-2026';

type Props = { contracts: any[]; leaders: any[]; tvvMembers: any[]; groups: any[] };

const shortMoney = (value: number) => value >= 1_000_000_000
  ? `${(value / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`
  : `${Math.round(value / 1_000_000).toLocaleString('vi-VN')}tr`;
const fullMoney = (value: number) => value.toLocaleString('vi-VN');

const labels: Record<CskkKind, string[]> = {
  leader: ['200–500tr', '≥ 1,5 tỷ', '≥ 2,5 tỷ', '≥ 3,5 tỷ'],
  tvv: ['≥ 100tr', '≥ 250tr', '≥ 500tr', '≥ 750tr'],
};

const programInfo: Record<CskkKind, { label: string; desc: string; color: string; icon: typeof Users }> = {
  leader: { label: 'CSKK DÀNH CHO TB/TN', desc: 'Theo dõi FYP nhóm trực tiếp, danh hiệu và chế độ đồng phục năm 2026', color: '#F59E0B', icon: Users },
  tvv: { label: 'CSKK DÀNH CHO TVV', desc: 'Theo dõi FYP cá nhân, danh hiệu và chế độ đồng phục năm 2026', color: '#06B6D4', icon: Award },
};

function MilestoneCell({ row, kind, index }: { row: CskkRow; kind: CskkKind; index: number }) {
  const status = getCskkStatus(kind, row.totalFyp, row.alternateCount);
  const threshold = CSKK_THRESHOLDS[kind][index];
  if (status.achievedIndex === index) return <span className="font-black text-emerald-700">{status.reward}</span>;
  if (status.achievedIndex > index) return <span className="font-bold text-sky-700">✓ Đã vượt</span>;
  return <span className="text-[10px] italic font-semibold text-rose-600">-{shortMoney(Math.max(0, threshold - row.totalFyp))}</span>;
}

export function Cskk2026({ contracts, leaders, tvvMembers, groups }: Props) {
  const [kind, setKind] = useState<CskkKind | null>(null);
  const [query, setQuery] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const data = useMemo(() => buildCskkRows(contracts, leaders, tvvMembers, groups), [contracts, leaders, tvvMembers, groups]);
  const source = kind === 'leader' ? data.leaders : kind === 'tvv' ? data.tvv : [];
  const groupOptions = useMemo(() => [...new Set(source.map(row => row.nhom).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi')), [source]);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('vi-VN');
    return source.filter(row => {
      const matchesGroup = selectedGroups.length === 0 || selectedGroups.includes(row.nhom);
      const matchesQuery = !q || `${row.nhom} ${row.agentCode} ${row.agentName}`.toLocaleLowerCase('vi-VN').includes(q);
      return matchesGroup && matchesQuery;
    });
  }, [query, selectedGroups, source]);
  const achievedCount = kind ? filtered.filter(row => getCskkStatus(kind, row.totalFyp, row.alternateCount).achievedIndex >= 0).length : 0;

  const openProgram = (nextKind: CskkKind) => {
    setKind(nextKind);
    setQuery('');
    setSelectedGroups([]);
    setGroupMenuOpen(false);
  };

  const downloadExcel = async () => {
    if (!kind) return;
    const XLSX = await import('xlsx');
    const rows = filtered.map((row, index) => {
      const status = getCskkStatus(kind, row.totalFyp, row.alternateCount);
      const tiers = [0, 1, 2, 3].map(tierIndex => status.achievedIndex === tierIndex
        ? status.reward
        : status.achievedIndex > tierIndex
          ? 'Đã vượt'
          : `-${shortMoney(Math.max(0, CSKK_THRESHOLDS[kind][tierIndex] - row.totalFyp))}`);
      return [index + 1, row.nhom, row.agentCode, row.agentName, row.totalFyp, row.alternateCount, ...tiers, status.title || '', status.uniform || ''];
    });
    const sheet = XLSX.utils.aoa_to_sheet([
      [programInfo[kind].label],
      ['Dữ liệu FYP từ 01/01/2026 đến ngày tải file'],
      ['STT', 'NHÓM', 'MÃ SỐ', kind === 'leader' ? 'HỌ TÊN TN' : 'HỌ TÊN TVV', 'TỔNG FYP', kind === 'leader' ? 'SỐ LẦN ĐẠT THƯỜNG QUÝ TN' : 'SỐ THÁNG HOẠT ĐỘNG CHUẨN', ...labels[kind], 'DANH HIỆU NĂM 2026', 'CHẾ ĐỘ ĐỒNG PHỤC'],
      ...rows,
    ]);
    sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } }];
    sheet['!cols'] = [6, 24, 16, 28, 18, 22, 22, 22, 22, 22, 22, 34].map(wch => ({ wch }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'CSKK 2026');
    XLSX.writeFile(workbook, `${kind === 'leader' ? 'CSKK-TB-TN' : 'CSKK-TVV'}-2026.xlsx`);
  };

  if (!kind) {
    return (
      <section className="h-full overflow-auto p-2 text-white" data-cskk-2026>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-emerald-300 sm:text-base"><BookOpen className="h-4 w-4" /> TỔNG QUAN CHÍNH SÁCH KHUYẾN KHÍCH 2026</h2>
          <span className="text-[11px] italic text-emerald-200/60">2 chính sách</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(['leader', 'tvv'] as CskkKind[]).map(itemKind => {
            const item = programInfo[itemKind];
            const Icon = item.icon;
            return (
              <button key={itemKind} onClick={() => openProgram(itemKind)} className="group overflow-hidden rounded-lg border-2 bg-slate-900 text-left shadow-lg transition hover:-translate-y-1 hover:scale-[1.01] hover:shadow-2xl active:scale-95" style={{ borderColor: `${item.color}AA` }}>
                <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-slate-950">
                  <div className="flex flex-col items-center gap-2 text-center"><span className="grid h-14 w-14 place-items-center rounded-full border-2 border-dashed" style={{ borderColor: `${item.color}88`, backgroundColor: `${item.color}18` }}><ImageIcon className="h-7 w-7" style={{ color: item.color }} /></span><span className="text-[10px] italic text-slate-500">Ảnh poster sẽ được bổ sung sau</span></div>
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-80" style={{ color: item.color }} />
                </div>
                <div className="border-t px-3 py-3" style={{ borderColor: `${item.color}44` }}><div className="flex items-center gap-2"><Icon className="h-4 w-4" style={{ color: item.color }} /><h3 className="text-sm font-black" style={{ color: item.color }}>{item.label}</h3></div><p className="mt-1 text-[11px] text-slate-400">{item.desc}</p></div>
              </button>
            );
          })}
        </div>
        <div className="mt-3 rounded-xl border-2 border-emerald-500/20 bg-emerald-500/5 p-2.5 text-[11px] text-emerald-200/70"><strong className="text-emerald-300">Ghi chú:</strong> Bấm vào một chính sách để xem chi tiết. Ảnh poster sẽ được cập nhật khi bạn gửi.</div>
      </section>
    );
  }

  const item = programInfo[kind];
  return (
    <section className="flex h-full min-h-0 flex-col gap-2 bg-slate-950 p-2 text-slate-900" data-cskk-2026>
      <div className="grid flex-shrink-0 gap-2 md:grid-cols-2">
        <div className="relative hidden aspect-video max-h-[160px] items-center justify-center overflow-hidden border border-slate-600 bg-slate-900 md:flex"><div className="flex flex-col items-center gap-1 text-slate-500"><ImageIcon className="h-8 w-8" /><span className="text-[10px] italic">Ảnh poster sẽ được bổ sung sau</span></div><button onClick={downloadExcel} className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-md bg-emerald-600 text-white shadow-lg hover:bg-emerald-500" title="Tải file Excel"><Download className="h-4 w-4" /></button></div>
        <div className="flex min-h-[120px] flex-col gap-2 rounded-lg border border-slate-500 bg-slate-300 p-2 shadow-xl">
          <div className="grid grid-cols-2 gap-2"><div className="rounded bg-emerald-600 px-3 py-2 text-center text-white shadow"><div className="text-[9px] font-bold uppercase">Đạt chính sách</div><div className="text-xl font-black">{achievedCount}</div></div><div className="rounded bg-amber-600 px-3 py-2 text-center text-white shadow"><div className="text-[9px] font-bold uppercase">Tổng đối tượng</div><div className="text-xl font-black">{filtered.length}</div></div></div>
          <div className="flex min-w-0 gap-2">
            <div className="relative min-w-0 flex-1"><button onClick={() => setGroupMenuOpen(value => !value)} className="flex w-full items-center justify-between gap-2 rounded border border-emerald-800 bg-white px-2 py-2 text-[11px] font-bold text-slate-700"><span className="truncate">Nhóm: {selectedGroups.length === 0 ? 'Tất cả' : selectedGroups.length === 1 ? selectedGroups[0] : `${selectedGroups.length} nhóm`}</span><ChevronDown className="h-3.5 w-3.5" /></button>{groupMenuOpen && <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-auto rounded border border-emerald-500 bg-slate-900 p-1 shadow-2xl"><button onClick={() => setSelectedGroups([])} className="w-full px-2 py-1.5 text-left text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/20">Tất cả nhóm</button>{groupOptions.map(group => <button key={group} onClick={() => setSelectedGroups(values => values.includes(group) ? values.filter(value => value !== group) : [...values, group])} className="flex w-full justify-between px-2 py-1.5 text-left text-[10px] text-slate-200 hover:bg-emerald-500/20"><span className="truncate">{group}</span>{selectedGroups.includes(group) && <span className="font-black text-emerald-300">✓</span>}</button>)}</div>}</div>
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded border border-emerald-800 bg-white px-2 py-1.5 text-slate-600"><Search className="h-3.5 w-3.5" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm mã số, họ tên..." className="min-w-0 flex-1 bg-transparent text-[11px] outline-none" />{query && <button onClick={() => setQuery('')} aria-label="Xóa tìm kiếm"><X className="h-3.5 w-3.5" /></button>}</label>
          </div>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center justify-between rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-white"><button onClick={() => setKind(null)} className="flex items-center gap-1 text-xs font-bold text-emerald-300 hover:text-emerald-200"><ChevronLeft className="h-4 w-4" /> Tổng quan</button><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-amber-300" /><span className="text-xs font-black">{item.label}</span></div><button onClick={downloadExcel} className="grid h-8 w-8 place-items-center rounded-md bg-emerald-600 text-white shadow hover:bg-emerald-500 md:hidden" title="Tải file Excel"><Download className="h-4 w-4" /></button></div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-500 bg-white shadow-2xl">
        <table className="w-full min-w-[1320px] border-collapse text-[11px]">
          <thead className="sticky top-0 z-10 text-white"><tr className="bg-[#234f9a]"><th rowSpan={2} className="border border-blue-300/40 px-2 py-2">STT</th><th rowSpan={2} className="border border-blue-300/40 px-2 py-2">NHÓM</th><th rowSpan={2} className="border border-blue-300/40 px-2 py-2">MÃ SỐ</th><th rowSpan={2} className="border border-blue-300/40 px-2 py-2">{kind === 'leader' ? 'HỌ TÊN TN' : 'HỌ TÊN TVV'}</th><th rowSpan={2} className="border border-blue-300/40 bg-[#ffbf16] px-3 py-2 text-blue-950">TỔNG FYP<br/><span className="text-[9px] italic font-semibold">01/01/2026 – nay</span></th><th rowSpan={2} className="border border-blue-300/40 bg-[#0f766e] px-3 py-2">{kind === 'leader' ? <>SỐ LẦN ĐẠT<br/>THƯỜNG QUÝ TN</> : <>SỐ THÁNG<br/>HOẠT ĐỘNG CHUẨN</>}</th><th colSpan={4} className="border border-blue-300/40 px-2 py-2 text-center">CHỈ TIÊU / PHẦN THƯỞNG</th><th rowSpan={2} className="border border-blue-300/40 px-3 py-2">DANH HIỆU NĂM 2026</th><th rowSpan={2} className="border border-blue-300/40 px-3 py-2"><span className="inline-flex items-center gap-1"><Shirt className="h-4 w-4" /> CHẾ ĐỘ ĐỒNG PHỤC</span></th></tr><tr className="bg-[#2e63ad]">{labels[kind].map(label => <th key={label} className="border border-blue-300/40 px-2 py-1.5 text-[10px] italic">{label}</th>)}</tr></thead>
          <tbody>{filtered.length === 0 ? <tr><td colSpan={12} className="p-10 text-center italic text-slate-400">Không có dữ liệu phù hợp.</td></tr> : filtered.map((row, rowIndex) => { const status = getCskkStatus(kind, row.totalFyp, row.alternateCount); return <tr key={row.key} className="border-b border-slate-200 odd:bg-white even:bg-slate-50 hover:bg-cyan-50"><td className="border-r border-slate-200 px-2 py-2 text-center text-slate-400">{rowIndex + 1}</td><td className="border-r border-slate-200 px-2 py-2 font-bold text-blue-800">{row.nhom}</td><td className="border-r border-slate-200 px-2 py-2 font-mono text-slate-600">{row.agentCode}</td><td className="border-r border-slate-200 px-2 py-2 font-semibold text-slate-800">{row.agentName}</td><td className="border-r border-slate-200 bg-amber-50 px-3 py-2 text-right font-black text-amber-800">{fullMoney(row.totalFyp)}</td><td className="border-r border-slate-200 bg-teal-50 px-3 py-2 text-center font-black text-teal-800">{row.alternateCount}</td>{[0, 1, 2, 3].map(index => <td key={index} className={`border-r border-slate-200 px-2 py-2 text-center ${status.achievedIndex === index ? 'bg-emerald-50' : ''}`}><MilestoneCell row={row} kind={kind} index={index} /></td>)}<td className="border-r border-slate-200 px-3 py-2 text-center font-black text-blue-800">{status.title || '—'}</td><td className="px-3 py-2 text-center font-bold text-slate-700">{status.uniform || '—'}</td></tr>; })}</tbody>
        </table>
      </div>
      <div className="flex-shrink-0 rounded-md border border-amber-300/30 bg-amber-950/50 px-3 py-2 text-[10px] font-semibold text-amber-100">Điều kiện thay thế: TB/TN đạt ít nhất 1 lần Thường Quý TN trong năm 2026; TVV có ít nhất 5 tháng hoạt động chuẩn trong năm 2026.</div>
    </section>
  );
}
