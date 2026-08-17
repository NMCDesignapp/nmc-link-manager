'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, Download, Eye, FileSpreadsheet, RefreshCw, Save, Search, Users, X } from 'lucide-react';

type Props = { year: number; month: number; refreshToken: number };

type AggregateRow = {
  id: string;
  ad: string;
  nhom: string;
  agentCode: string;
  agentName: string;
  chucVu: string;
  note: string;
  permanent: boolean;
  permanentYear: number | null;
  sources: string[];
};

type AggregateData = {
  assessment: { year: number; month: number; label: string };
  generatedAt: string;
  summary: {
    total: number;
    permanent: number;
    qualifiedRetention: number;
    qualifiedEntry: number;
    duplicatesRemoved: number;
  };
  rows: AggregateRow[];
  calculations: Record<string, any>;
};

type SnapshotMeta = {
  id: string;
  assessmentYear: number;
  assessmentMonth: number;
  assessmentLabel: string;
  createdAt: string;
  updatedAt: string;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function snapshotKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function styleSheet(XLSX: any, ws: any, headers: string[], rowCount: number) {
  const lastCol = headers.length - 1;
  const lastRow = rowCount + 3;
  const border = {
    top: { style: 'thin', color: { rgb: '8CA99B' } },
    bottom: { style: 'thin', color: { rgb: '8CA99B' } },
    left: { style: 'thin', color: { rgb: '8CA99B' } },
    right: { style: 'thin', color: { rgb: '8CA99B' } },
  };

  for (let c = 0; c <= lastCol; c += 1) {
    const title = ws[XLSX.utils.encode_cell({ r: 0, c })];
    if (title) title.s = { font: { bold: true, color: { rgb: '174C37' }, sz: 15 }, fill: { fgColor: { rgb: 'EAF3EE' } }, alignment: { horizontal: 'center', vertical: 'center' } };
    const sub = ws[XLSX.utils.encode_cell({ r: 1, c })];
    if (sub) sub.s = { font: { bold: true, color: { rgb: '40564B' }, sz: 10 }, fill: { fgColor: { rgb: 'F4F7F5' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } };
    const header = ws[XLSX.utils.encode_cell({ r: 3, c })];
    if (header) header.s = { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 9 }, fill: { fgColor: { rgb: '239A69' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border };
  }

  for (let r = 4; r <= lastRow; r += 1) {
    for (let c = 0; c <= lastCol; c += 1) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (!cell) continue;
      cell.s = {
        font: { color: { rgb: '183548' }, sz: 9 },
        fill: { fgColor: { rgb: r % 2 === 0 ? 'FFFFFF' : 'F6FAF8' } },
        alignment: { horizontal: typeof cell.v === 'number' ? 'center' : 'left', vertical: 'center', wrapText: true },
        border,
      };
      if (typeof cell.v === 'number') cell.z = '#,##0';
    }
  }
  ws['!views'] = [{ state: 'frozen', ySplit: 4 }];
  ws['!autofilter'] = rowCount > 0 ? { ref: XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: lastRow, c: lastCol } }) } : undefined;
}

function addSheet(XLSX: any, wb: any, name: string, title: string, subtitle: string, headers: string[], rows: any[][], widths?: number[]) {
  const ws = XLSX.utils.aoa_to_sheet([[title], [subtitle], [], headers, ...rows]);
  const lastCol = Math.max(0, headers.length - 1);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
  ];
  ws['!cols'] = headers.map((header, index) => ({
    wch: widths?.[index] || (index === 0 ? 6 : /HỌ TÊN|GHI CHÚ|KẾT QUẢ|ĐẠT THEO/.test(header) ? 24 : /NHÓM|CHỨC VỤ/.test(header) ? 18 : 14),
  }));
  styleSheet(XLSX, ws, headers, rows.length);
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
}

function buildSevenSheetWorkbook(XLSX: any, data: AggregateData) {
  const wb = XLSX.utils.book_new();
  const label = data.assessment.label;
  const calc = data.calculations || {};

  addSheet(
    XLSX,
    wb,
    'DS',
    'DS THÀNH VIÊN CLB SAO VIỆT SAU ĐỢT XÉT',
    `Đợt xét: ${label} • SV 2025/SV 2026 là thành viên mặc định và được giữ nguyên ghi chú`,
    ['STT', 'AD', 'NHÓM', 'MÃ TVV', 'HỌ TÊN TVV', 'CHỨC VỤ', 'GHI CHÚ'],
    data.rows.map((row, index) => [index + 1, row.ad, row.nhom, row.agentCode, row.agentName, row.chucVu, row.note]),
    [6, 16, 20, 14, 28, 18, 34],
  );

  const dtTVV = calc.duyTriTVV || {};
  const dtTVVMonths = dtTVV.months || [];
  addSheet(
    XLSX, wb, 'Duy trì - TVV', 'CLB SAO VIỆT - XÉT DUY TRÌ TVV',
    `Đợt xét: ${label} • ${dtTVV.rule?.description || ''}`,
    ['STT', 'AD', 'NHÓM', 'MÃ TVV', 'HỌ TÊN TVV', 'CHỨC VỤ', ...dtTVVMonths.map((m: any) => `TỔNG IP ${m.label}`), 'SỐ THÁNG ≥ 12TR', 'KẾT QUẢ'],
    (dtTVV.rows || []).map((row: any, index: number) => [index + 1, row.ad, row.nhom, row.agentCode, row.agentName, row.chucVu, ...(row.monthlyIP || []), row.qualifyingMonths, row.result]),
  );

  const dtTN = calc.duyTriTN || {};
  const dtTNMonths = dtTN.months || [];
  addSheet(
    XLSX, wb, 'Duy trì - TN', 'CLB SAO VIỆT - XÉT DUY TRÌ TN',
    `Đợt xét: ${label} • ${dtTN.rule?.description || ''}`,
    [
      'STT', 'AD', 'NHÓM', 'MÃ TVV', 'HỌ TÊN TVV', 'CHỨC VỤ',
      ...dtTNMonths.map((m: any) => `IP NHÓM ${m.label}`), 'TỔNG IP 3 THÁNG', 'IP ≥ 120TR',
      ...dtTNMonths.map((m: any) => `TUYỂN LUYỆN ${m.label}`), 'SỐ THÁNG TL', 'TL ≥ 2/3', 'ĐẠT THEO', 'KẾT QUẢ',
    ],
    (dtTN.rows || []).map((row: any, index: number) => [
      index + 1, row.ad, row.nhom, row.agentCode, row.agentName, row.chucVu,
      ...(row.monthlyGroupIP || []), row.totalGroupIP, row.groupIpPassed ? 'ĐẠT' : 'Không',
      ...(row.monthlyTuyenLuyen || []).map((item: any) => `${item.achieved ? 'ĐẠT' : 'Không'} | ${item.tvvmHDC} TVVm HĐC | ${formatNumber(item.rewardAmount)}`),
      row.tuyenLuyenMonths, row.tuyenLuyenPassed ? 'ĐẠT' : 'Không', row.passedBy, row.result,
    ]),
  );

  const addDongHanhSheet = (sheetName: string, title: string, source: any) => {
    const months = source?.months || [];
    const monthHeaders = months.flatMap((m: any) => [
      `TVVm HĐC ${m.label}`, `FYP TVVm ${m.label}`, `TỔNG THƯỞNG TVVm ${m.label}`,
      `TL ĐỒNG HÀNH ${m.label}`, `THƯỞNG ĐỒNG HÀNH ${m.label}`, `KẾT QUẢ ${m.label}`,
    ]);
    addSheet(
      XLSX, wb, sheetName, title,
      `Đợt xét: ${label} • ${source?.rule?.description || ''}`,
      ['STT', 'AD', 'NHÓM', 'MÃ TVV', 'HỌ TÊN TVV', 'CHỨC VỤ', ...monthHeaders, 'SỐ THÁNG ĐẠT', 'KẾT QUẢ'],
      (source?.rows || []).map((row: any, index: number) => [
        index + 1, row.ad, row.nhom, row.agentCode, row.agentName, row.chucVu,
        ...(row.monthlyDongHanh || []).flatMap((item: any) => [item.tvvmHDC, item.fypTVVm, item.totalTVVmReward, `${item.rewardRate}%`, item.rewardAmount, item.achieved ? 'ĐẠT' : 'Không']),
        row.achievedMonths, row.result,
      ]),
    );
  };

  addDongHanhSheet('Duy trì - TTN', 'CLB SAO VIỆT - XÉT DUY TRÌ TTN', calc.duyTriTTN || {});

  const gnTVV = calc.giaNhapTVV || {};
  const gnTVVMonths = gnTVV.months || [];
  addSheet(
    XLSX, wb, 'Gia nhập - TVV', 'CLB SAO VIỆT - XÉT GIA NHẬP TVV',
    `Đợt xét: ${label} • ${gnTVV.rule?.description || ''}`,
    ['STT', 'AD', 'NHÓM', 'MÃ TVV', 'HỌ TÊN TVV', 'CHỨC VỤ', ...gnTVVMonths.map((m: any) => `TỔNG IP ${m.label}`), 'TỔNG IP 3 THÁNG', 'KẾT QUẢ'],
    (gnTVV.rows || []).map((row: any, index: number) => [index + 1, row.ad, row.nhom, row.agentCode, row.agentName, row.chucVu, ...(row.monthlyIP || []), row.totalIP, row.result]),
  );

  const gnTN = calc.giaNhapTN || {};
  const gnTNMonths = gnTN.months || [];
  addSheet(
    XLSX, wb, 'Gia nhập - TN', 'CLB SAO VIỆT - XÉT GIA NHẬP TN',
    `Đợt xét: ${label} • ${gnTN.rule?.description || ''}`,
    ['STT', 'AD', 'NHÓM', 'MÃ TVV', 'HỌ TÊN TVV', 'CHỨC VỤ', ...gnTNMonths.map((m: any) => `IP NHÓM ${m.label}`), 'TỔNG IP 3 THÁNG', 'KẾT QUẢ'],
    (gnTN.rows || []).map((row: any, index: number) => [index + 1, row.ad, row.nhom, row.agentCode, row.agentName, row.chucVu, ...(row.monthlyGroupIP || []), row.totalGroupIP, row.result]),
  );

  addDongHanhSheet('Gia nhập - TTN', 'CLB SAO VIỆT - XÉT GIA NHẬP TTN', calc.giaNhapTTN || {});
  return wb;
}

export function CLBPostAssessmentMembers({ year, month, refreshToken }: Props) {
  const [data, setData] = useState<AggregateData | null>(null);
  const [liveData, setLiveData] = useState<AggregateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState('');
  const [viewingSnapshot, setViewingSnapshot] = useState(false);

  const loadSnapshots = useCallback(async () => {
    try {
      const response = await fetch('/api/clb-sao-viet/snapshots', { cache: 'no-store' });
      if (response.ok) setSnapshots(await response.json());
    } catch {}
  }, []);

  const loadCurrent = useCallback(async () => {
    setLoading(true);
    setError('');
    setViewingSnapshot(false);
    try {
      const response = await fetch(`/api/clb-sao-viet/tong-hop?year=${year}&month=${month}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || 'Không thể tổng hợp DS thành viên CLB');
      setData(json);
      setLiveData(json);
    } catch (err) {
      setData(null);
      setLiveData(null);
      setError(err instanceof Error ? err.message : 'Không thể tổng hợp DS thành viên CLB');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    loadCurrent();
    loadSnapshots();
  }, [loadCurrent, loadSnapshots, refreshToken]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi-VN');
    if (!keyword) return data?.rows || [];
    return (data?.rows || []).filter((row) =>
      [row.ad, row.nhom, row.agentCode, row.agentName, row.chucVu, row.note]
        .join(' ')
        .toLocaleLowerCase('vi-VN')
        .includes(keyword),
    );
  }, [data?.rows, search]);

  const handleExport = useCallback(async () => {
    if (!data) return;
    setExporting(true);
    try {
      const XLSX = await import('xlsx-js-style');
      const wb = buildSevenSheetWorkbook(XLSX, data);
      const suffix = data.assessment.label.replace(/\//g, '-');
      XLSX.writeFile(wb, `CLB_Sao_Viet_DS_Sau_Dot_Xet_${suffix}.xlsx`);
    } catch (err) {
      alert(`Không thể xuất Excel: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExporting(false);
    }
  }, [data]);

  const handleSaveSnapshot = useCallback(async () => {
    if (!liveData) return;
    setSaving(true);
    try {
      const response = await fetch('/api/clb-sao-viet/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, payload: liveData }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || 'Không thể lưu đợt xét');
      await loadSnapshots();
      alert(`Đã lưu đợt xét ${liveData.assessment.label}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể lưu đợt xét');
    } finally {
      setSaving(false);
    }
  }, [liveData, loadSnapshots, month, year]);

  const handleOpenSnapshot = useCallback(async () => {
    if (!selectedSnapshot) return;
    const [snapshotYear, snapshotMonth] = selectedSnapshot.split('-').map(Number);
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/clb-sao-viet/snapshots?year=${snapshotYear}&month=${snapshotMonth}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || 'Không thể mở bản lưu');
      setData(json.payload);
      setViewingSnapshot(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể mở bản lưu');
    } finally {
      setLoading(false);
    }
  }, [selectedSnapshot]);

  if (loading && !data) {
    return <div className="bg-[#fbfaf5] px-3 py-5 text-center text-xs font-semibold text-[#40564b]">Đang tổng hợp 6 mục xét theo thứ tự...</div>;
  }

  return (
    <div className="bg-[#fbfaf5] p-2.5 sm:p-4">
      {error ? <div className="mb-3 border border-[#9b4b4f] bg-[#f3dddd] px-3 py-2 text-xs font-semibold text-[#842c33]">{error}</div> : null}

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
        <div className="border border-[#8ca1af] bg-[#e7edf2] p-2 sm:p-3">
          <div className="text-[9px] font-black uppercase text-[#40596a] sm:text-[10px]">Tổng thành viên</div>
          <div className="mt-1 text-xl font-black text-[#183548] sm:text-2xl">{data?.summary.total ?? 0}</div>
        </div>
        <div className="border border-[#b79b45] bg-[#fff0bd] p-2 sm:p-3">
          <div className="text-[9px] font-black uppercase text-[#6b5208] sm:text-[10px]">SV 2025 / SV 2026</div>
          <div className="mt-1 text-xl font-black text-[#59430b] sm:text-2xl">{data?.summary.permanent ?? 0}</div>
        </div>
        <div className="border border-[#72a084] bg-[#dcefe3] p-2 sm:p-3">
          <div className="text-[9px] font-black uppercase text-[#17643f] sm:text-[10px]">Đạt duy trì</div>
          <div className="mt-1 text-xl font-black text-[#075f38] sm:text-2xl">{data?.summary.qualifiedRetention ?? 0}</div>
        </div>
        <div className="border border-[#7e9db0] bg-[#dce9f1] p-2 sm:p-3">
          <div className="text-[9px] font-black uppercase text-[#235d78] sm:text-[10px]">Đạt gia nhập</div>
          <div className="mt-1 text-xl font-black text-[#145b73] sm:text-2xl">{data?.summary.qualifiedEntry ?? 0}</div>
        </div>
      </div>

      <div className="mt-2 border border-[#aeb8b0] bg-[#f4f0e4] p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-black text-[#24352d]">DS THÀNH VIÊN SAU ĐỢT XÉT {data?.assessment.label}</div>
            <div className="mt-1 text-[11px] leading-5 text-[#4b5d53]">
              {viewingSnapshot ? 'Đang xem bản đã lưu. ' : ''}SV 2025/SV 2026 luôn được giữ; các dòng còn lại được hợp nhất từ 6 mục xét và tự lọc trùng.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setDetailOpen(true)} disabled={!data} className="inline-flex h-9 items-center gap-1.5 border border-[#80691b] bg-[#fff0bd] px-3 text-[11px] font-bold text-[#59430b] disabled:opacity-40">
              <Eye className="h-4 w-4" /> Xem bảng chi tiết
            </button>
            <button onClick={handleExport} disabled={!data || exporting} className="inline-flex h-9 items-center gap-1.5 border border-[#1b7f59] bg-[#239a69] px-3 text-[11px] font-bold text-white disabled:opacity-40">
              {exporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Excel 7 sheet
            </button>
            <button onClick={handleSaveSnapshot} disabled={!liveData || saving || viewingSnapshot} className="inline-flex h-9 items-center gap-1.5 border border-[#245d59] bg-[#155c58] px-3 text-[11px] font-bold text-white disabled:opacity-40">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lưu/Cập nhật đợt xét
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2 border border-[#9eb0ba] bg-[#e7edf2] p-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase text-[#40596a]"><Archive className="h-4 w-4" /> Bản đã lưu</div>
          <select value={selectedSnapshot} onChange={(event) => setSelectedSnapshot(event.target.value)} className="h-9 min-w-[180px] border border-[#78909e] bg-white px-2.5 text-xs font-semibold text-[#183548] outline-none">
            <option value="">Chọn đợt xét...</option>
            {snapshots.map((snapshot) => <option key={snapshot.id} value={snapshotKey(snapshot.assessmentYear, snapshot.assessmentMonth)}>{snapshot.assessmentLabel}</option>)}
          </select>
          <button onClick={handleOpenSnapshot} disabled={!selectedSnapshot || loading} className="inline-flex h-9 items-center justify-center gap-1.5 border border-[#496b80] bg-[#2e566d] px-3 text-[11px] font-bold text-[#f4fbff] disabled:opacity-40">
            <Eye className="h-4 w-4" /> Xem bản lưu
          </button>
          {viewingSnapshot ? <button onClick={() => { if (liveData) setData(liveData); setViewingSnapshot(false); }} className="inline-flex h-9 items-center justify-center gap-1.5 border border-[#7f8f86] bg-[#f7f4ea] px-3 text-[11px] font-bold text-[#40564b]">Xem kết quả hiện tại</button> : null}
        </div>
      </div>

      {detailOpen && data ? (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#020706] p-2 sm:p-4">
          <div className="flex h-[84vh] w-[min(97vw,1180px)] flex-col overflow-hidden border border-[#78998d] bg-white">
            <div className="flex flex-col gap-2 border-b border-[#78998d] bg-[#eef4f0] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-black text-[#174c37]">DS THÀNH VIÊN CLB SAO VIỆT SAU ĐỢT XÉT {data.assessment.label}</h3>
                <p className="mt-0.5 text-[10px] text-[#4b6558]">{data.rows.length} thành viên • đã lọc trùng • SV 2025/SV 2026 ưu tiên đầu danh sách</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative min-w-[210px] flex-1 sm:flex-none">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#4f7462]" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên, mã TVV, nhóm, ghi chú..." className="h-8 w-full border border-[#83a697] bg-white pl-8 pr-2 text-[11px] text-[#183548] outline-none sm:w-[280px]" />
                </div>
                <button onClick={() => setDetailOpen(false)} aria-label="Đóng" className="flex h-8 w-8 items-center justify-center border border-[#78998d] bg-white text-[#40564b]"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="clbsv-detail-table-wrapper flex-1 overflow-auto bg-white">
              <table className="w-max min-w-[820px] table-auto border-separate border-spacing-0 bg-white text-[10px]">
                <thead className="sticky top-0 z-20 bg-[#239a69] text-[9px] font-black uppercase text-white">
                  <tr>
                    {['STT', 'AD', 'NHÓM', 'MÃ TVV', 'HỌ TÊN TVV', 'CHỨC VỤ', 'GHI CHÚ'].map((header) => <th key={header} className="border-[0.5px] border-[#527969] px-1.5 py-1.5 text-center whitespace-nowrap">{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => (
                    <tr key={`${row.agentCode}-${row.id}`} className={row.permanent ? 'bg-[#fff4c9]' : 'bg-white'}>
                      <td className="border-[0.5px] border-[#78998d] px-1.5 py-1 text-center font-bold text-[#183548]">{index + 1}</td>
                      <td className="border-[0.5px] border-[#78998d] px-1.5 py-1 text-[#183548] whitespace-nowrap">{row.ad}</td>
                      <td className="border-[0.5px] border-[#78998d] px-1.5 py-1 text-[#183548] whitespace-nowrap">{row.nhom}</td>
                      <td className="border-[0.5px] border-[#78998d] px-1.5 py-1 text-center font-bold text-[#183548] whitespace-nowrap">{row.agentCode}</td>
                      <td className="border-[0.5px] border-[#78998d] px-1.5 py-1 font-semibold text-[#183548] whitespace-nowrap">{row.agentName}</td>
                      <td className="border-[0.5px] border-[#78998d] px-1.5 py-1 text-center text-[#183548] whitespace-nowrap">{row.chucVu}</td>
                      <td className={`border-[0.5px] border-[#78998d] px-1.5 py-1 font-semibold ${row.permanent ? 'text-[#6b5208]' : 'text-[#075f38]'} whitespace-nowrap`}>{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
