'use client';
import Image from 'next/image';
import React, { useMemo, useRef, useState } from 'react';
import { Download, Search, Trophy } from 'lucide-react';
import { calculateSVBreakthrough, type SVSourceRow, type SVTier, type SVRecruitTier, type SVLeader } from '@/lib/sao-viet-breakthrough';
import { downloadTableExcel } from '@/app/quan-ly/policy-excel-export';

type Props = { sources: Record<string, SVSourceRow[]>; personalTiers: SVTier[]; businessTiers: SVTier[]; recruitmentTiers: SVRecruitTier[]; leaders: SVLeader[] };
const shortRankNote = (note: string) => note
  .replace(/Cá nhân:/gi, 'CN:')
  .replace(/TN tuyển dụng:/gi, 'TN TD:')
  .replace(/Hạng bạch kim/gi, 'BK')
  .replace(/Hạng kim cương/gi, 'KC')
  .replace(/Hạng vàng/gi, 'V');
const money = (value: number) => value.toLocaleString('vi-VN') + ' đ';
export function SaoVietBreakthrough(props: Props) {
  const [query, setQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const tableRef = useRef<HTMLTableElement>(null);
  const allGroups = useMemo(() => calculateSVBreakthrough(props.sources, props.personalTiers, props.businessTiers, props.recruitmentTiers, props.leaders), [props.sources, props.personalTiers, props.businessTiers, props.recruitmentTiers, props.leaders]);
  // Keep the entire group visible when a matching person is searched: merged awards
  // must always correspond to the displayed full group and must not be recomputed.
  const q = query.trim().toLocaleLowerCase('vi-VN');
  const groups = allGroups.filter(g => (!selectedGroup || g.key === selectedGroup) && (!q || [g.name, g.leaderName, g.leaderCode, ...g.members.flatMap(m => [m.code, m.name])].some(s => s.toLocaleLowerCase('vi-VN').includes(q))));
  const totalPeople = groups.reduce((s, g) => s + g.members.length, 0);
  const totalReward = groups.reduce((s, g) => s + g.leaderReward + g.members.reduce((sum, m) => sum + m.reward, 0), 0);
  return <section className="flex flex-col gap-3 min-h-0" aria-label="Đột phá số lượng – Bùng nổ Sao Việt">
    <div className="flex flex-wrap gap-2 items-center justify-between">
      <h2 className="text-sm sm:text-base font-extrabold text-amber-300 flex items-center gap-2"><Trophy className="w-5 h-5" />ĐỘT PHÁ SỐ LƯỢNG – BÙNG NỔ SAO VIỆT</h2>
      <button type="button" disabled={!groups.length} className="flex items-center gap-1.5 rounded border border-amber-500 px-3 py-1.5 text-xs font-bold text-amber-100 disabled:opacity-40" onClick={() => { if (tableRef.current) downloadTableExcel('Dot_pha_so_luong_Bung_no_Sao_Viet_2026', tableRef.current); }}><Download size={14} />Tải Excel</button>
    </div>
    <div className="w-full bg-slate-950/30">
      <Image src="/posters/sao-viet-breakthrough-2026.jpg" alt="Poster chương trình Đột phá số lượng – Bùng nổ Sao Việt 2026" width={1536} height={864} unoptimized priority className="w-full h-auto max-h-[40vh] object-contain" />
    </div>
    <div className="flex flex-wrap gap-2">
      <select aria-label="Lọc nhóm" value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} className="min-w-0 flex-1 rounded border border-amber-600 bg-white p-2 text-xs text-slate-900"><option value="">Tất cả nhóm</option>{allGroups.map(g => <option key={g.key} value={g.key}>{g.name}</option>)}</select>
      <label className="flex flex-1 min-w-40 items-center gap-1 rounded border border-amber-600 bg-white p-2 text-slate-800"><Search size={14} /><input aria-label="Tìm tên hoặc mã số" placeholder="Tìm tên / mã số…" value={query} onChange={e => setQuery(e.target.value)} className="w-full min-w-0 bg-transparent text-xs outline-none" /></label>
    </div>
    <div className="overflow-auto max-h-[65vh] border border-slate-400 bg-white text-slate-900">
      <table ref={tableRef} className="w-full border-collapse text-xs sv-breakthrough-table">
        <colgroup>{[34, 90, 100, 185, 200, 110, 110, 230].map((width, i) => <col key={i} style={{ width }} />)}</colgroup>
        <thead className="sticky top-0 z-10 text-[#1E3A8A] bg-[#FFA07A]">
          <tr>{['STT', 'NHÓM', 'MÃ SỐ TN', 'HỌ TÊN TN', 'HỌ TÊN TVV ĐẠT SAO VIỆT'].map(h => <th key={h} rowSpan={2}>{h}</th>)}<th colSpan={2}>THƯỞNG</th><th rowSpan={2}>GHI CHÚ</th></tr>
          <tr><th>TN</th><th>TVV</th></tr>
        </thead>
        <tbody>{groups.length === 0 ? <tr><td colSpan={8} className="text-center text-slate-500 py-8">{allGroups.length ? 'Không có kết quả phù hợp.' : 'Chưa có người đạt Sao Việt từ 3 chương trình toàn chặng.'}</td></tr> : groups.map((g, groupIndex) => g.members.map((m, index) => <tr key={m.code} className={`${index === 0 ? 'sv-group-start' : ''} hover:bg-amber-50`}>
          {index === 0 && <><td rowSpan={g.members.length} className="text-center">{groupIndex + 1}</td><td rowSpan={g.members.length} className="font-bold whitespace-nowrap">{g.name}</td><td rowSpan={g.members.length} className="text-center whitespace-nowrap">{g.leaderCode || '—'}</td><td rowSpan={g.members.length} className="font-semibold whitespace-nowrap">{g.leaderName || '—'}</td></>}
          <td className="font-semibold whitespace-nowrap">{m.name || m.code}</td>
          {index === 0 && <td rowSpan={g.members.length} className="text-center font-bold text-blue-800 whitespace-nowrap">{g.issue ? <span className="text-red-700 whitespace-normal">{g.issue}</span> : money(g.leaderReward)}</td>}
          <td className="text-center font-bold text-red-700 whitespace-nowrap">{money(m.reward)}</td>
          <td className="text-right">{m.notes.map(note => <div key={note} className="sv-rank-note whitespace-nowrap">{shortRankNote(note)}</div>)}</td>
        </tr>))}</tbody>
      </table>
    </div>
    <div className="flex flex-wrap justify-between gap-2 text-xs font-bold text-amber-200"><span>{groups.length} nhóm · {totalPeople} người đạt</span><span>Tổng thưởng dự kiến: {money(totalReward)}</span></div>
    <p className="text-[11px] text-slate-300">Mỗi mã số tính 1 người, kể cả đạt nhiều vai trò hoặc nhiều vé. Tổng thưởng tối đa 30 triệu đồng/cá nhân.</p>
    <style>{`.sv-breakthrough-table th,.sv-breakthrough-table td{border:1px solid #cbd5e1;padding:8px 6px;vertical-align:middle;font-size:12px;line-height:1.45}.sv-breakthrough-table td:not(.text-blue-800):not(.text-red-700){color:#1e293b!important}.sv-breakthrough-table td .sv-rank-note{font-size:8px!important;line-height:1.25}.sv-breakthrough-table th{font-weight:800;text-align:center;background:#FFA07A}.sv-breakthrough-table .sv-group-start>td{border-top:2px solid #94a3b8}.sv-breakthrough-table th:first-child{padding-left:3px;padding-right:3px}@media(max-width:767px){.sv-breakthrough-table th,.sv-breakthrough-table td{padding:6px 4px;font-size:11px}}`}</style>
  </section>;
}
