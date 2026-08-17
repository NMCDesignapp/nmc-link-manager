'use client';

import { useEffect, useMemo, useState } from 'react';
import { Crown, FileSpreadsheet, Loader2, Medal, Search, Trophy, X } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';

type Row = {
  id: string;
  ad: string;
  nhom: string;
  agentCode: string;
  agentName: string;
  chucVu: string;
  note: string;
  permanent: boolean;
  totalIP: number;
  qualified: boolean;
  position: number | null;
  title: string;
  result: string;
};

type Data = {
  assessment: { year: number; month: number; label: string };
  performancePeriod: { year: number; month: number; label: string };
  rule: { ipThreshold: number; winnerCount: number; description: string };
  source: string;
  summary: { totalMembers: number; qualified: number; winners: number; champion: number; runnersUp: number };
  winners: Row[];
  rows: Row[];
};

const requestCache = new Map<string, Promise<Data>>();

function getData(year: number, month: number, refreshToken: number) {
  const key = `${year}-${month}-${refreshToken}`;
  let request = requestCache.get(key);
  if (!request) {
    request = fetch(`/api/clb-sao-viet/top-ip?year=${year}&month=${month}`, { cache: 'no-store' }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || 'Không thể tải kết quả Top IP');
      return body as Data;
    });
    requestCache.set(key, request);
  }
  return request;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function winnerStyle(position: number | null) {
  if (position === 1) return { bg: '#8A6116', border: '#F2BD3F', icon: Crown };
  if (position === 2) return { bg: '#475569', border: '#CBD5E1', icon: Medal };
  return { bg: '#6B4B2A', border: '#D7A56D', icon: Medal };
}

function exportExcel(data: Data) {
  const winnerRows: any[][] = [
    ['XÉT TOP IP - CLB SAO VIỆT'],
    [`Đợt xét ${data.assessment.label} • Doanh số ${data.performancePeriod.label} theo Ngày PH • Điều kiện IP >= ${formatNumber(data.rule.ipThreshold)}`],
    [],
    ['XẾP HẠNG', 'DANH HIỆU', 'AD', 'NHÓM', 'MÃ TVV', 'HỌ TÊN', 'CHỨC VỤ', `TỔNG IP ${data.performancePeriod.label}`],
  ];
  data.winners.forEach((row) => winnerRows.push([row.position, row.title, row.ad, row.nhom, row.agentCode, row.agentName, row.chucVu, row.totalIP]));

  const allRows: any[][] = [
    ['DS XÉT TOP IP - CLB SAO VIỆT'],
    [`Đợt xét ${data.assessment.label} • Doanh số ${data.performancePeriod.label} theo Ngày PH`],
    [],
    ['STT', 'AD', 'NHÓM', 'MÃ TVV', 'HỌ TÊN', 'CHỨC VỤ', `TỔNG IP ${data.performancePeriod.label}`, 'KẾT QUẢ'],
  ];
  data.rows.forEach((row, index) => allRows.push([
    index + 1,
    row.ad,
    row.nhom,
    row.agentCode,
    row.agentName,
    row.chucVu,
    row.totalIP,
    row.position ? row.result : row.qualified ? 'Đủ điều kiện - ngoài Top 3' : 'Chưa đủ 80 triệu',
  ]));

  const wb = XLSX.utils.book_new();
  const wsTop = XLSX.utils.aoa_to_sheet(winnerRows);
  const wsAll = XLSX.utils.aoa_to_sheet(allRows);
  wsTop['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }];
  wsAll['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }];
  wsTop['!cols'] = [{ wch: 9 }, { wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 15 }, { wch: 28 }, { wch: 18 }, { wch: 20 }];
  wsAll['!cols'] = [{ wch: 7 }, { wch: 14 }, { wch: 20 }, { wch: 15 }, { wch: 28 }, { wch: 18 }, { wch: 20 }, { wch: 28 }];

  for (const ws of [wsTop, wsAll]) {
    if (ws.A1) ws.A1.s = { font: { bold: true, sz: 16 }, alignment: { horizontal: 'center' } };
    if (ws.A2) ws.A2.s = { font: { italic: true, sz: 10 }, alignment: { horizontal: 'center' } };
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    for (let c = 0; c <= range.e.c; c += 1) {
      const cell = ws[XLSX.utils.encode_cell({ r: 3, c })];
      if (cell) cell.s = {
        fill: { fgColor: { rgb: '0F766E' } },
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '334155' } },
          bottom: { style: 'thin', color: { rgb: '334155' } },
          left: { style: 'thin', color: { rgb: '334155' } },
          right: { style: 'thin', color: { rgb: '334155' } },
        },
      };
    }
  }

  XLSX.utils.book_append_sheet(wb, wsTop, 'Top 3');
  XLSX.utils.book_append_sheet(wb, wsAll, 'Toàn bộ');
  XLSX.writeFile(wb, `CLB_Sao_Viet_Xet_Top_IP_${data.assessment.label.replaceAll('/', '-')}.xlsx`);
}

export function CLBTopIPSection({ year, month, refreshToken }: { year: number; month: number; refreshToken: number }) {
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
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Không thể tải kết quả Top IP'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [year, month, refreshToken]);

  const filteredRows = useMemo(() => {
    const rows = data?.rows || [];
    const q = search.trim().toLocaleLowerCase('vi-VN');
    if (!q) return rows;
    return rows.filter((row) => [row.ad, row.nhom, row.agentCode, row.agentName, row.chucVu, row.result].some((value) => String(value || '').toLocaleLowerCase('vi-VN').includes(q)));
  }, [data, search]);

  if (loading) {
    return <div className="mt-3 flex items-center justify-center gap-2 bg-[#F8FAFC] px-3 py-5 text-xs font-semibold text-[#334155]"><Loader2 className="h-4 w-4 animate-spin" /> Đang tính Top IP...</div>;
  }
  if (error || !data) {
    return <div className="mt-3 bg-[#FEE2E2] px-3 py-4 text-xs font-bold text-[#991B1B]">{error || 'Không có dữ liệu'}</div>;
  }

  return (
    <div className="mt-3 bg-[#FFFDF7] p-2.5 sm:p-3">
      <div className="bg-[#E2E8F0] px-2.5 py-2 text-[10px] font-bold leading-4 text-[#1E293B] sm:text-xs">
        Đợt {data.assessment.label}: chỉ tính Tổng IP của {data.performancePeriod.label} theo Ngày PH. Điều kiện được xét Top: IP ≥ {formatNumber(data.rule.ipThreshold)}. Chọn 1 Quán quân + 2 Á quân có IP cao nhất.
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <div className="bg-[#334155] px-2 py-2 text-center text-white"><div className="text-[9px] font-bold uppercase">DS Mục 3</div><div className="text-lg font-black">{data.summary.totalMembers}</div></div>
        <div className="bg-[#0F766E] px-2 py-2 text-center text-white"><div className="text-[9px] font-bold uppercase">Đủ ≥ 80 triệu</div><div className="text-lg font-black">{data.summary.qualified}</div></div>
        <div className="bg-[#8A6116] px-2 py-2 text-center text-white"><div className="text-[9px] font-bold uppercase">Quán quân</div><div className="text-lg font-black">{data.summary.champion}</div></div>
        <div className="bg-[#475569] px-2 py-2 text-center text-white"><div className="text-[9px] font-bold uppercase">Á quân</div><div className="text-lg font-black">{data.summary.runnersUp}</div></div>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-3">
        {data.winners.length > 0 ? data.winners.map((winner) => {
          const style = winnerStyle(winner.position);
          const Icon = style.icon;
          return (
            <div key={winner.id} className="border-2 p-3 text-white" style={{ backgroundColor: style.bg, borderColor: style.border }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2"><Icon className="h-5 w-5" /><span className="text-xs font-black uppercase">{winner.title}</span></div>
                <span className="text-lg font-black">#{winner.position}</span>
              </div>
              <div className="mt-2 truncate text-base font-black">{winner.agentName}</div>
              <div className="mt-0.5 truncate text-[10px] font-semibold">{winner.agentCode} • {winner.nhom || '—'} • {winner.ad || '—'}</div>
              <div className="mt-2 bg-[#FFFDF7] px-2 py-1.5 text-right text-sm font-black text-[#111827]">IP {data.performancePeriod.label}: {formatNumber(winner.totalIP)}</div>
            </div>
          );
        }) : <div className="lg:col-span-3 bg-[#FEE2E2] p-4 text-center text-xs font-bold text-[#991B1B]">Chưa có thành viên nào đạt điều kiện IP từ 80 triệu trong {data.performancePeriod.label}.</div>}
      </div>

      {data.winners.length < 3 && data.winners.length > 0 ? (
        <div className="mt-2 bg-[#FEF3C7] px-2.5 py-2 text-[10px] font-bold text-[#78350F]">Hiện chỉ có {data.winners.length} người đủ điều kiện vào Top 3; hệ thống không lấy người dưới 80 triệu để bù đủ 3 vị trí.</div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[10px] font-semibold text-[#475569]">Nguồn đối tượng: DS thành viên Mục 3 • Nguồn IP: pdt10DT, lọc tuyệt đối theo issueDate (Ngày PH)</div>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => exportExcel(data)} className="inline-flex h-8 items-center gap-1 bg-[#0F766E] px-2.5 text-[10px] font-bold text-white hover:bg-[#115E59]"><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</button>
          <button type="button" onClick={() => setDetailOpen(true)} className="inline-flex h-8 items-center gap-1 bg-[#1D4ED8] px-3 text-[10px] font-bold text-white hover:bg-[#1E40AF]"><Trophy className="h-3.5 w-3.5" /> Xem bảng chi tiết</button>
        </div>
      </div>

      {detailOpen ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#0F172A] p-2 sm:p-4">
          <div className="flex h-[84vh] w-full max-w-[1420px] flex-col bg-[#F8FAFC] shadow-2xl">
            <div className="flex items-center justify-between bg-[#0F766E] px-3 py-2 text-white">
              <div>
                <div className="text-sm font-black uppercase">Xét Top IP</div>
                <div className="text-[10px] font-semibold text-[#ECFDF5]">Đợt {data.assessment.label} • Doanh số {data.performancePeriod.label} • Điều kiện ≥ {formatNumber(data.rule.ipThreshold)}</div>
              </div>
              <button type="button" onClick={() => setDetailOpen(false)} className="flex h-8 w-8 items-center justify-center bg-[#134E4A] text-white hover:bg-[#7F1D1D]"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex items-center gap-2 bg-[#E2E8F0] px-2 py-1.5">
              <Search className="h-3.5 w-3.5 text-[#334155]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm AD, nhóm, mã, họ tên, chức vụ..." className="h-7 flex-1 bg-white px-2 text-[10px] font-semibold text-[#111827] outline-none" />
              <span className="text-[10px] font-bold text-[#334155]">{filteredRows.length}/{data.rows.length}</span>
            </div>
            <div className="flex-1 overflow-auto bg-white">
              <table className="w-max min-w-full border-collapse text-[10px] text-[#111827]">
                <thead className="sticky top-0 z-10 bg-[#CBD5E1] text-[#0F172A]">
                  <tr>
                    {['STT', 'XẾP HẠNG', 'AD', 'NHÓM', 'MÃ TVV', 'HỌ TÊN', 'CHỨC VỤ', `TỔNG IP ${data.performancePeriod.label}`, 'KẾT QUẢ'].map((head) => (
                      <th key={head} className="border-[0.5px] border-[#334155] px-1.5 py-1 text-center font-black whitespace-nowrap">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => (
                    <tr key={`${row.id}-${row.agentCode}`} className={row.position ? 'bg-[#FFF7D6]' : row.qualified ? 'bg-[#E7F6EF]' : 'bg-white'}>
                      <td className="border-[0.5px] border-[#475569] px-1.5 py-1 text-center">{index + 1}</td>
                      <td className="border-[0.5px] border-[#475569] px-1.5 py-1 text-center font-black">{row.position || '—'}</td>
                      <td className="border-[0.5px] border-[#475569] px-1.5 py-1 whitespace-nowrap">{row.ad || '—'}</td>
                      <td className="border-[0.5px] border-[#475569] px-1.5 py-1 whitespace-nowrap">{row.nhom || '—'}</td>
                      <td className="border-[0.5px] border-[#475569] px-1.5 py-1 font-mono whitespace-nowrap">{row.agentCode || '—'}</td>
                      <td className="border-[0.5px] border-[#475569] px-1.5 py-1 font-bold whitespace-nowrap">{row.agentName || '—'}</td>
                      <td className="border-[0.5px] border-[#475569] px-1.5 py-1 whitespace-nowrap">{row.chucVu || '—'}</td>
                      <td className="border-[0.5px] border-[#475569] px-1.5 py-1 text-right font-black whitespace-nowrap">{formatNumber(row.totalIP)}</td>
                      <td className="border-[0.5px] border-[#475569] px-1.5 py-1 text-center font-black whitespace-nowrap">
                        {row.position ? row.result : row.qualified ? 'Đủ điều kiện - ngoài Top 3' : 'Chưa đủ 80 triệu'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between bg-[#DCE7E1] px-3 py-2 text-[10px] font-bold text-[#1F2937]">
              <span>Tổng DS Mục 3: {data.summary.totalMembers}</span>
              <span>Đủ điều kiện: {data.summary.qualified} • Top được chọn: {data.summary.winners}/3</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
