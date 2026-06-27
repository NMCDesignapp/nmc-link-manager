#!/usr/bin/env python3
"""
Replace the renderSaoViet() placeholder in /home/z/my-project/src/app/quan-ly/page.tsx
with a full implementation showing 3 sub-sections:

1. SAO VIỆT CÁ NHÂN — TVV-based, 10 columns, 5 rank tiers
2. SAO VIỆT TN KTM — TN-based, 10 columns, 5 rank tiers
3. SAO VIỆT TN TD — TN-based, 10 columns with grouped headers (Hạng vàng, Hạng bạch kim)

Period: 01/12/2025 - 30/11/2026 (Sao Việt year)
"""

import re
from pathlib import Path

PAGE_PATH = Path('/home/z/my-project/src/app/quan-ly/page.tsx')
src = PAGE_PATH.read_text(encoding='utf-8')

# --- Locate the existing placeholder renderSaoViet ---
# Pattern: from "const renderSaoViet = () => (" up to the closing "  );\n" before "const renderSheet"
start_marker = "  // ========== RENDER SHEET DISPATCHER ==========\n  const renderSaoViet = () => (\n"
end_marker = "  );\n\n  const renderSheet = () => {"

start_idx = src.find(start_marker)
if start_idx < 0:
    raise SystemExit("ERROR: cannot find start_marker for renderSaoViet")

end_idx = src.find(end_marker, start_idx)
if end_idx < 0:
    raise SystemExit("ERROR: cannot find end_marker for renderSaoViet")

old_block = src[start_idx:end_idx + len("  );")]
print(f"Found old renderSaoViet block: {len(old_block)} chars, lines {src[:start_idx].count(chr(10))+1}-{src[:end_idx].count(chr(10))+1}")

# --- Build the new renderSaoViet implementation ---
new_block = '''  // ========== RENDER SHEET DISPATCHER ==========
  // ========== RENDER: Sao Việt (3 sub-sections) ==========
  // Period: 01/12/2025 - 30/11/2026 (Sao Việt year — fixed)
  // Section 1: SAO VIỆT CÁ NHÂN — TVV-based, 5 rank tiers (Vàng, BạchKim, BạchKim, KimCương, KimCương)
  // Section 2: SAO VIỆT TN KTM — TN-based (individual FYP), 5 rank tiers
  // Section 3: SAO VIỆT TN TD — TN-based (team TVVm FYP + HĐC count), 2 ranks (Vàng, BạchKim) with sub-cols
  const SAO_VIET_START = new Date(2025, 11, 1);  // Dec 1, 2025
  const SAO_VIET_END = new Date(2026, 10, 30);   // Nov 30, 2026

  // Filter contracts within Sao Việt period (by doanh so month = effective/issue date)
  const saoVietContracts = contracts.filter(c => {
    const d = getDoanhSoMonth(c);
    return !isNaN(d.getTime()) && d >= SAO_VIET_START && d <= SAO_VIET_END;
  });

  // ---------- Section 1: SAO VIỆT CÁ NHÂN ----------
  // Data source: tvvStructList — each TVV's personal FYP in Sao Việt period
  // Rank thresholds (cumulative, each tier gives vouchers independently):
  //   Vàng:       FYP ≥ 550tr  → 01 vé
  //   Bạch kim 1: FYP ≥ 900tr  → 01 vé
  //   Bạch kim 2: FYP ≥ 1400tr → 02 vé
  //   Kim cương 1: FYP ≥ 1600tr → 01 vé
  //   Kim cương 2: FYP ≥ 3000tr → 02 vé
  const SV1_THRESHOLDS = [
    { key: 'vang',      label: 'Hạng vàng',       sub: 'FYP ≥ 550tr\\n01 vé',      min: 550_000_000,    vouchers: 1, bg: '#FEF3C7', fg: '#92400E' },
    { key: 'bachkim1',  label: 'Hạng bạch kim',   sub: 'FYP ≥ 900tr\\n01 vé',      min: 900_000_000,    vouchers: 1, bg: '#E5E7EB', fg: '#374151' },
    { key: 'bachkim2',  label: 'Hạng bạch kim',   sub: 'FYP ≥ 1400tr\\n02 vé',     min: 1_400_000_000,  vouchers: 2, bg: '#E5E7EB', fg: '#374151' },
    { key: 'kimcuong1', label: 'Hạng kim cương',  sub: 'FYP ≥ 1600tr\\n01 vé',     min: 1_600_000_000,  vouchers: 1, bg: '#CFFAFE', fg: '#155E75' },
    { key: 'kimcuong2', label: 'Hạng kim cương',  sub: 'FYP ≥ 3000tr\\n02 vé',     min: 3_000_000_000,  vouchers: 2, bg: '#CFFAFE', fg: '#155E75' },
  ];
  const saoVietCaNhanRows = tvvStructList.map(tvv => {
    const fyp = saoVietContracts
      .filter(c => (c.agentCode || '').trim().toLowerCase() === (tvv.agentCode || '').trim().toLowerCase())
      .reduce((s, c) => s + (c.fyp || 0), 0);
    const nhomKD = resolveNhomName(tvv.agentCode, tvv.maBanNhom, banNhomList, contracts, leaders, { allowPA: true });
    return {
      agentCode: tvv.agentCode || '',
      agentName: tvv.agentName || '',
      nhomKD,
      fyp,
    };
  }).filter(r => r.fyp > 0)
    .sort((a, b) => b.fyp - a.fyp);

  // ---------- Section 2: SAO VIỆT TN KTM ----------
  // Data source: leaders (DS TB/TN) — each TN's personal FYP in Sao Việt period
  // Rank thresholds:
  //   Vàng:       FYP ≥ 1,6 tỷ  → 01 vé
  //   Bạch kim:   FYP ≥ 3,5 tỷ  → 01 vé
  //   Kim cương:  FYP ≥ 5,5 tỷ  → 02 vé
  //   Tier 4:     FYP ≥ 7,0 tỷ  → 01 vé
  //   Tier 5:     FYP ≥ 13 tỷ   → 02 vé
  const SV2_THRESHOLDS = [
    { key: 'vang',     label: 'Hạng vàng',      sub: 'FYP ≥ 1,6 tỷ\\n01 vé', min: 1_600_000_000,  vouchers: 1, bg: '#FEF3C7', fg: '#92400E' },
    { key: 'bachkim',  label: 'Hạng bạch kim',  sub: 'FYP ≥ 3,5 tỷ\\n01 vé', min: 3_500_000_000,  vouchers: 1, bg: '#E5E7EB', fg: '#374151' },
    { key: 'kimcuong', label: 'Hạng kim cương', sub: 'FYP ≥ 5,5 tỷ\\n02 vé', min: 5_500_000_000,  vouchers: 2, bg: '#CFFAFE', fg: '#155E75' },
    { key: 'tier4',    label: 'Hạng đặc biệt',  sub: 'FYP ≥ 7,0 tỷ\\n01 vé', min: 7_000_000_000,  vouchers: 1, bg: '#FEE2E2', fg: '#991B1B' },
    { key: 'tier5',    label: 'Hạng tối cao',   sub: 'FYP ≥ 13 tỷ\\n02 vé',  min: 13_000_000_000, vouchers: 2, bg: '#FEE2E2', fg: '#991B1B' },
  ];
  const saoVietTNKTMRows = leaders
    .filter(l => isTBorTNPosition(l.position))
    .map(tn => {
      const fyp = saoVietContracts
        .filter(c => (c.agentCode || '').trim().toLowerCase() === (tn.agentCode || '').trim().toLowerCase())
        .reduce((s, c) => s + (c.fyp || 0), 0);
      return {
        agentCode: tn.agentCode || '',
        agentName: tn.agentName || '',
        nhomKD: tn.nhom || '',
        fyp,
      };
    }).filter(r => r.fyp > 0)
      .sort((a, b) => b.fyp - a.fyp);

  // ---------- Section 3: SAO VIỆT TN TD ----------
  // Data source: leaders (DS TB/TN) — each TN's team TVVm performance
  // TVVm = TVV newly recruited by this TN (tvvStructList.maTVVTuyendung == TN.agentCode)
  // Metrics:
  //   TỔNG FYP TVVm = sum of all contracts in period where contract.agentCode ∈ TVVm list
  //   SL TVVm HĐC   = count of TVVm with at least 1 contract in period having tinhLuot3tr >= 12,000,000
  // Ranks (require BOTH sub-conditions):
  //   Hạng vàng:     FYP TVVm ≥ 500 Trđ  AND  TVVm HĐC ≥ 08 TVV
  //   Hạng bạch kim: FYP TVVm ≥ 1200 Trđ AND  TVVm HĐC ≥ 12 TVV
  const SV3_RANKS = [
    {
      key: 'vang', label: 'HẠNG VÀNG', bg: '#FEF3C7', fg: '#92400E',
      subFypLabel: 'FYP TVVm ≥ 500 Trđ',
      subHdcLabel: 'TVVm HĐC ≥ 08 TVV',
      minFyp: 500_000_000,
      minHdc: 8,
    },
    {
      key: 'bachkim', label: 'HẠNG BẠCH KIM', bg: '#E5E7EB', fg: '#374151',
      subFypLabel: 'FYP TVVm ≥ 1200 Trđ',
      subHdcLabel: 'TVVm HĐC ≥ 12 TVV',
      minFyp: 1_200_000_000,
      minHdc: 12,
    },
  ];
  const saoVietTNTDRows = leaders
    .filter(l => isTBorTNPosition(l.position))
    .map(tn => {
      const tnCode = (tn.agentCode || '').trim().toLowerCase();
      // TVVm recruited by this TN
      const tvvmList = tvvStructList.filter(t =>
        (t.maTVVTuyendung || '').trim().toLowerCase() === tnCode
      );
      const tvvmCodes = new Set(tvvmList.map(t => (t.agentCode || '').trim().toLowerCase()));
      // Contracts of these TVVm in Sao Việt period
      const tvvmContracts = saoVietContracts.filter(c =>
        tvvmCodes.has((c.agentCode || '').trim().toLowerCase())
      );
      const fypTVVm = tvvmContracts.reduce((s, c) => s + (c.fyp || 0), 0);
      // SL TVVm HĐC = unique TVVm with at least 1 contract having tinhLuot3tr >= 12,000,000
      const hdcTvvmCodes = new Set(
        tvvmContracts.filter(c => (c.tinhLuot3tr || 0) >= 12_000_000)
          .map(c => (c.agentCode || '').trim().toLowerCase())
      );
      const slTvvmHDC = hdcTvvmCodes.size;
      return {
        agentCode: tn.agentCode || '',
        agentName: tn.agentName || '',
        nhomKD: tn.nhom || '',
        fypTVVm,
        slTvvmHDC,
        tvvmCount: tvvmList.length,
      };
    }).filter(r => r.fypTVVm > 0 || r.slTvvmHDC > 0)
      .sort((a, b) => b.fypTVVm - a.fypTVVm);

  // ---------- Render helper: rank cell (sections 1 & 2) ----------
  const renderSaoVietRankCell = (fyp: number, threshold: { min: number; vouchers: number; bg: string; fg: string }) => {
    const achieved = fyp >= threshold.min;
    return (
      <TableCell
        className="text-xs text-center p-1 whitespace-nowrap"
        style={{ backgroundColor: threshold.bg, color: threshold.fg, fontWeight: achieved ? 800 : 400 }}
      >
        {achieved ? `${threshold.vouchers} vé` : <span style={{ color: '#9CA3AF' }}>—</span>}
      </TableCell>
    );
  };

  // ---------- Render helper: rank sub-cell (section 3 — boolean check) ----------
  const renderSaoVietRankSubCell = (achieved: boolean, bg: string, fg: string) => (
    <TableCell
      className="text-xs text-center p-1"
      style={{ backgroundColor: bg, color: fg, fontWeight: achieved ? 800 : 400 }}
    >
      {achieved ? '✓' : <span style={{ color: '#9CA3AF' }}>—</span>}
    </TableCell>
  );

  const renderSaoViet = () => (
    <div className="space-y-4">
      {/* Header card — Sao Việt period info */}
      <div className="p-4 border border-violet-500/30 rounded-lg" style={{ backgroundColor: 'rgba(124, 58, 237, 0.08)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-5 h-5 text-violet-400" />
          <h2 className="text-lg font-extrabold text-violet-300">Số liệu Sao Việt Năm 2026</h2>
        </div>
        <p className="text-sm text-violet-200/70">
          Kỳ tính thưởng: <span className="font-bold text-violet-200">01/12/2025 - 30/11/2026</span>
          <br />
          Bao gồm 3 mục: <span className="font-semibold">Sao Việt Cá Nhân</span> (TVV),
          <span className="font-semibold"> Sao Việt TN KTM</span> (TN — FYP cá nhân),
          <span className="font-semibold"> Sao Việt TN TD</span> (TN — FYP &amp; HĐC của TVVm do TN tuyển).
        </p>
      </div>

      {/* ============ SECTION 1: SAO VIỆT CÁ NHÂN ============ */}
      <div className="border border-violet-500/20 rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-violet-800 text-white flex items-center gap-2">
          <UserCircle className="w-4 h-4" />
          <h3 className="text-sm font-bold uppercase tracking-wider">Mục 1 · Sao Việt Cá Nhân (TVV)</h3>
          <span className="ml-auto text-[11px] bg-violet-600/60 px-2 py-0.5 rounded">{saoVietCaNhanRows.length} TVV</span>
        </div>
        <div className="overflow-x-auto bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-violet-700 hover:bg-violet-700 border-b border-violet-600">
                <TableHead className="text-yellow-100 text-[10px] font-bold uppercase text-center w-[40px]">STT</TableHead>
                <TableHead className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap">NHÓM KD</TableHead>
                <TableHead className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap">MÃ SỐ ĐẠI LÝ</TableHead>
                <TableHead className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap">HỌ TÊN TVV</TableHead>
                <TableHead className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap text-right">TỔNG FYP<br /><span className="font-normal text-[9px]">01/12/25 - 30/11/26</span></TableHead>
                {SV1_THRESHOLDS.map(t => (
                  <TableHead
                    key={t.key}
                    className="text-[10px] font-bold uppercase text-center whitespace-nowrap p-1"
                    style={{ backgroundColor: t.bg, color: t.fg }}
                  >
                    <div className="leading-tight">
                      <div>{t.label}</div>
                      <div className="font-normal text-[9px]">{t.sub.split('\\n')[0]}</div>
                      <div className="font-normal text-[9px]">{t.sub.split('\\n')[1]}</div>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {saoVietCaNhanRows.map((r, i) => (
                <TableRow key={`sv1-${r.agentCode}-${i}`} className="bg-white hover:bg-violet-50 border-b border-gray-200">
                  <TableCell className="text-xs text-center p-1 text-gray-600">{i + 1}</TableCell>
                  <TableCell className="text-xs p-1 text-gray-800 whitespace-nowrap">{r.nhomKD || '—'}</TableCell>
                  <TableCell className="text-xs p-1 text-gray-800 whitespace-nowrap font-mono">{r.agentCode}</TableCell>
                  <TableCell className="text-xs p-1 text-gray-900 font-medium whitespace-nowrap">{r.agentName}</TableCell>
                  <TableCell className="text-xs p-1 text-right font-bold text-violet-700 whitespace-nowrap">{formatCurrency(r.fyp)}</TableCell>
                  {SV1_THRESHOLDS.map(t => (
                    <React.Fragment key={`sv1-${r.agentCode}-${t.key}`}>
                      {renderSaoVietRankCell(r.fyp, t)}
                    </React.Fragment>
                  ))}
                </TableRow>
              ))}
              {saoVietCaNhanRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-gray-500 text-sm py-8">
                    Chưa có dữ liệu TVV đạt FYP &gt; 0 trong kỳ 01/12/2025 - 30/11/2026
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ============ SECTION 2: SAO VIỆT TN KTM ============ */}
      <div className="border border-violet-500/20 rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-violet-800 text-white flex items-center gap-2">
          <Users className="w-4 h-4" />
          <h3 className="text-sm font-bold uppercase tracking-wider">Mục 2 · Sao Việt TN KTM (TN — FYP cá nhân)</h3>
          <span className="ml-auto text-[11px] bg-violet-600/60 px-2 py-0.5 rounded">{saoVietTNKTMRows.length} TN</span>
        </div>
        <div className="overflow-x-auto bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-violet-700 hover:bg-violet-700 border-b border-violet-600">
                <TableHead className="text-yellow-100 text-[10px] font-bold uppercase text-center w-[40px]">STT</TableHead>
                <TableHead className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap">NHÓM KD</TableHead>
                <TableHead className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap">MS ĐẠI LÝ</TableHead>
                <TableHead className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap">HỌ TÊN TN</TableHead>
                <TableHead className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap text-right">TỔNG FYP<br /><span className="font-normal text-[9px]">01/12/25 - 30/11/26</span></TableHead>
                {SV2_THRESHOLDS.map(t => (
                  <TableHead
                    key={t.key}
                    className="text-[10px] font-bold uppercase text-center whitespace-nowrap p-1"
                    style={{ backgroundColor: t.bg, color: t.fg }}
                  >
                    <div className="leading-tight">
                      <div>{t.label}</div>
                      <div className="font-normal text-[9px]">{t.sub.split('\\n')[0]}</div>
                      <div className="font-normal text-[9px]">{t.sub.split('\\n')[1]}</div>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {saoVietTNKTMRows.map((r, i) => (
                <TableRow key={`sv2-${r.agentCode}-${i}`} className="bg-white hover:bg-violet-50 border-b border-gray-200">
                  <TableCell className="text-xs text-center p-1 text-gray-600">{i + 1}</TableCell>
                  <TableCell className="text-xs p-1 text-gray-800 whitespace-nowrap">{r.nhomKD || '—'}</TableCell>
                  <TableCell className="text-xs p-1 text-gray-800 whitespace-nowrap font-mono">{r.agentCode}</TableCell>
                  <TableCell className="text-xs p-1 text-gray-900 font-medium whitespace-nowrap">{r.agentName}</TableCell>
                  <TableCell className="text-xs p-1 text-right font-bold text-violet-700 whitespace-nowrap">{formatCurrency(r.fyp)}</TableCell>
                  {SV2_THRESHOLDS.map(t => (
                    <React.Fragment key={`sv2-${r.agentCode}-${t.key}`}>
                      {renderSaoVietRankCell(r.fyp, t)}
                    </React.Fragment>
                  ))}
                </TableRow>
              ))}
              {saoVietTNKTMRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-gray-500 text-sm py-8">
                    Chưa có dữ liệu TN đạt FYP cá nhân &gt; 0 trong kỳ 01/12/2025 - 30/11/2026
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ============ SECTION 3: SAO VIỆT TN TD ============ */}
      <div className="border border-violet-500/20 rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-violet-800 text-white flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          <h3 className="text-sm font-bold uppercase tracking-wider">Mục 3 · Sao Việt TN TD (TN — FYP &amp; HĐC của TVVm do TN tuyển)</h3>
          <span className="ml-auto text-[11px] bg-violet-600/60 px-2 py-0.5 rounded">{saoVietTNTDRows.length} TN</span>
        </div>
        <div className="overflow-x-auto bg-white">
          <Table>
            <TableHeader>
              {/* Row 1: main headers — Hạng vàng and Hạng bạch kim span 2 cols each */}
              <TableRow className="bg-violet-700 hover:bg-violet-700 border-b border-violet-600">
                <TableHead rowSpan={2} className="text-yellow-100 text-[10px] font-bold uppercase text-center align-middle w-[40px]">STT</TableHead>
                <TableHead rowSpan={2} className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap align-middle">NHÓM KD</TableHead>
                <TableHead rowSpan={2} className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap align-middle">MS ĐẠI LÝ</TableHead>
                <TableHead rowSpan={2} className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap align-middle">HỌ TÊN TN</TableHead>
                <TableHead rowSpan={2} className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap text-right align-middle">
                  TỔNG FYP TVVm<br /><span className="font-normal text-[9px]">01/12/25 - 30/11/26</span>
                </TableHead>
                <TableHead rowSpan={2} className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle">
                  SL TVVm HĐC<br /><span className="font-normal text-[9px]">01/12/25 - 30/11/26</span>
                </TableHead>
                {SV3_RANKS.map(rk => (
                  <TableHead
                    key={rk.key}
                    colSpan={2}
                    className="text-[10px] font-bold uppercase text-center align-middle p-1"
                    style={{ backgroundColor: rk.bg, color: rk.fg }}
                  >
                    {rk.label}
                  </TableHead>
                ))}
              </TableRow>
              {/* Row 2: sub-headers for rank columns */}
              <TableRow className="bg-violet-700 hover:bg-violet-700 border-b border-violet-600">
                {SV3_RANKS.flatMap(rk => [
                  <TableHead
                    key={`${rk.key}-fyp`}
                    className="text-[9px] font-semibold text-center p-1 whitespace-nowrap"
                    style={{ backgroundColor: rk.bg, color: rk.fg }}
                  >
                    {rk.subFypLabel}
                  </TableHead>,
                  <TableHead
                    key={`${rk.key}-hdc`}
                    className="text-[9px] font-semibold text-center p-1 whitespace-nowrap"
                    style={{ backgroundColor: rk.bg, color: rk.fg }}
                  >
                    {rk.subHdcLabel}
                  </TableHead>,
                ])}
              </TableRow>
            </TableHeader>
            <TableBody>
              {saoVietTNTDRows.map((r, i) => (
                <TableRow key={`sv3-${r.agentCode}-${i}`} className="bg-white hover:bg-violet-50 border-b border-gray-200">
                  <TableCell className="text-xs text-center p-1 text-gray-600">{i + 1}</TableCell>
                  <TableCell className="text-xs p-1 text-gray-800 whitespace-nowrap">{r.nhomKD || '—'}</TableCell>
                  <TableCell className="text-xs p-1 text-gray-800 whitespace-nowrap font-mono">{r.agentCode}</TableCell>
                  <TableCell className="text-xs p-1 text-gray-900 font-medium whitespace-nowrap">{r.agentName}</TableCell>
                  <TableCell className="text-xs p-1 text-right font-bold text-violet-700 whitespace-nowrap">{formatCurrency(r.fypTVVm)}</TableCell>
                  <TableCell className="text-xs p-1 text-center font-bold text-violet-700">{r.slTvvmHDC}<span className="text-[9px] text-gray-400 font-normal"> / {r.tvvmCount} TVVm</span></TableCell>
                  {SV3_RANKS.flatMap(rk => [
                    renderSaoVietRankSubCell(r.fypTVVm >= rk.minFyp, rk.bg, rk.fg),
                    renderSaoVietRankSubCell(r.slTvvmHDC >= rk.minHdc, rk.bg, rk.fg),
                  ])}
                </TableRow>
              ))}
              {saoVietTNTDRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-gray-500 text-sm py-8">
                    Chưa có dữ liệu TN có TVVm hoạt động trong kỳ 01/12/2025 - 30/11/2026
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer note — rank legend */}
      <div className="p-3 border border-violet-500/20 rounded-lg bg-violet-500/5">
        <p className="text-[11px] text-violet-200/80 leading-relaxed">
          <strong className="text-violet-300">Ghi chú:</strong> FYP được tính theo tháng hiệu lực hợp đồng (effectiveDate) trong kỳ 01/12/2025 - 30/11/2026.
          Mỗi ô hạng hiển thị số vé đạt được nếu FYP (hoặc FYP TVVm + SL TVVm HĐC) đủ điều kiện.
          Mục 1 dùng cho TVV; Mục 2 dùng cho TN (FYP cá nhân); Mục 3 dùng cho TN (FYP và HĐC của TVVm do TN tuyển dụng).
        </p>
      </div>
    </div>
  );'''

# Replace the old block with the new one
new_src = src[:start_idx] + new_block + src[end_idx + len("  );"):]

# Quick sanity checks
assert "const renderSaoViet = () => (" in new_src, "renderSaoViet function not found in new src"
assert "const renderSheet = () => {" in new_src, "renderSheet function not found in new src"
assert new_src.count("const renderSaoViet = () => (") == 1, "Multiple renderSaoViet definitions"
assert new_src.count("SV1_THRESHOLDS") >= 2, "SV1_THRESHOLDS not properly defined/used"
assert new_src.count("SV3_RANKS") >= 2, "SV3_RANKS not properly defined/used"
# Make sure we didn't accidentally duplicate the file
assert new_src.count("'use client';") == 1, "Multiple 'use client' — file got duplicated"

PAGE_PATH.write_text(new_src, encoding='utf-8')
print(f"✅ Wrote new renderSaoViet to {PAGE_PATH}")
print(f"   Old block size: {len(old_block)} chars")
print(f"   New block size: {len(new_block)} chars")
print(f"   New file size: {len(new_src)} chars, {new_src.count(chr(10))+1} lines")
