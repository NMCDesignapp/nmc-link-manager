'use client';

/**
 * SavedContestInline — Hiển thị kết quả chi tiết của 1 saved contest
 * trực tiếp trong trang Quản Lý (mục Sao Việt), KHÔNG dùng iframe.
 *
 * Cách hoạt động:
 *   1. Lấy saved contest object (đã parse thành ContestConfig)
 *   2. Lấy contracts / staff / recruiters từ useAppData()
 *   3. Tính toán kết quả bằng contest-calculator (cùng logic với Trang Thi Đua)
 *   4. Render bảng chi tiết theo targetType × conditionType, bọc trong
 *      renderSaovietDetailShell để có filter + footer + responsive CSS
 *      đồng nhất với 3 chương trình ca-nhan / tn-ktm / tn-td.
 *
 * Bảng được render theo đúng logic của Trang Thi Đua (thi-dua-chau/page.tsx)
 * để kết quả khớp 100% với popup "Kết quả chi tiết" trên trang đó.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Trophy, Search, ChevronDown, ChevronRight, X, Award, Gift, Percent, FileDown, Crown, Medal, LoaderCircle } from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';
import {
  ContestConfig,
  Contract,
  StaffMember,
  RecruiterMember,
  TVVStructMember,
  BonusTier,
  GroupData,
  NYDData,
  NYDResultRow,
  parseContestConfig,
  filterContractsByContest,
  filterDisplayContracts,
  computeGroupedData,
  computeTVVTotalRows,
  computeTVVPerContractRows,
  computeContestStats,
  computeNYDData,
  computeNYDResultRows,
  getGroupTVVPassCountIPAFYP,
  calculateBonusWithTiers,
  getRemainingToNextTier,
  calculateActivityRoundBonusWithTiers,
  calculateLuot,
  computeBonusFromTier,
  isActivityRoundMode,
  isPerContractMode,
  isTotalMode,
  isTVVPassCountMode,
  isStandardMode,
  isTVVmMode,
  isTopNMode,
  hasPercentBonus,
  formatCurrency,
  formatNumber,
  formatDate,
  formatBonusAmount,
  formatRate,
  getConditionLabel,
  getTargetLabel,
  norm,
  type TVVTotalRow,
  type TVVPerContractRow,
} from '@/lib/contest-calculator';

interface SavedContestInlineProps {
  /** Raw saved contest object (from /api/contests). Will be parsed internally. */
  contest: any;
  /** Optional: child render-prop or shell function — if you want to wrap with
   *  renderSaovietDetailShell from parent, pass tableJsx via this. Unused here
   *  because this component renders its own shell-agnostic table block. */
}

// ============================================================
// Helper: build a row phase bonus for TVV total rows (already
// computed in calculator — re-exported here just for clarity).
// ============================================================

// ============================================================
// Main component
// ============================================================
export const SavedContestInline: React.FC<SavedContestInlineProps> = ({ contest }) => {
  const { data: appData, isLoading, isReloading } = useAppData();
  const [nhomFilter, setNhomFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  // Danh sáº¡ch card táº£i nhanh khÃ´ng kÃ¨m base64 poster. Khi má»Ÿ chi tiáº¿t,
  // láº¥y poster cá»§a Ä‘Ãºng chÆ°Æ¡ng trÃ¬nh nÃ y tá»« server Ä‘á»ƒ khÃ´ng bao giá» máº¥t áº£nh.
  const [posterUrl, setPosterUrl] = useState<string>(contest?.posterUrl || '');

  useEffect(() => {
    const initialPoster = contest?.posterUrl || '';
    if (initialPoster) {
      setPosterUrl(initialPoster);
      return;
    }
    if (!contest?.id) return;
    let cancelled = false;
    fetch(`/api/contests?id=${encodeURIComponent(contest.id)}`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((detail) => {
        if (!cancelled) setPosterUrl(detail?.posterUrl || '');
      })
      .catch(() => {
        if (!cancelled) setPosterUrl('');
      });
    return () => { cancelled = true; };
  }, [contest?.id, contest?.posterUrl]);

  // Parse contest into config
  const config = useMemo<ContestConfig>(() => parseContestConfig(contest), [contest]);

  // Data from app context (cast to typed arrays)
  const allContracts = (appData.contracts || []) as Contract[];
  const staffList = (appData.staff || []) as StaffMember[];
  const recruiterList = (appData.recruiters || []) as RecruiterMember[];
  // DS TVV (Cấu trúc) — cần cho filterByEffectiveDate mode và TopN mode
  const tvvStructList = (appData.structureTvv || []) as TVVStructMember[];
  // DS TB/TN (Cấu trúc) — nguồn ĐÚNG cho danh sách nhóm thi đua
  const leadersList = (appData.leaders || []) as any[];
  // Ưu tiên TVV thuộc các Phòng đã khai báo trong Cấu trúc khi đồng điểm.
  const priorityTvvCodes = useMemo(() => {
    const phongCodes = new Set((appData.structurePhong || []).map((p: any) => p.maPhong).filter(Boolean));
    const adCodes = new Set((appData.structureAd || []).filter((ad: any) => phongCodes.has(ad.maPhong)).map((ad: any) => ad.maAD).filter(Boolean));
    const banNhomCodes = new Set((appData.structureBanNhom || []).filter((bn: any) => adCodes.has(bn.maAD)).map((bn: any) => bn.maBanNhom).filter(Boolean));
    return new Set(tvvStructList.filter((tvv: any) => banNhomCodes.has(tvv.maBanNhom)).map((tvv: any) => tvv.agentCode).filter(Boolean));
  }, [appData.structurePhong, appData.structureAd, appData.structureBanNhom, tvvStructList]);

  // Step 1: filter contracts by contest dates
  const filteredContracts = useMemo(
    () => filterContractsByContest(allContracts, config),
    [allContracts, config]
  );

  // Step 2: filter by target (TVV / Nhóm / NTD) — pass tvvStructList for filterByEffectiveDate
  const displayContracts = useMemo(
    () => filterDisplayContracts(filteredContracts, config, staffList, recruiterList, tvvStructList),
    [filteredContracts, config, staffList, recruiterList, tvvStructList]
  );

  // Step 3: compute groupedData / tvvTotalRows / tvvPerContractRows / nydData
  const groupedData = useMemo(
    () => computeGroupedData(displayContracts, config, staffList, recruiterList, leadersList),
    [displayContracts, config, staffList, recruiterList, leadersList]
  );
  const tvvTotalRows = useMemo(
    () => computeTVVTotalRows(displayContracts, config, staffList, recruiterList, tvvStructList, priorityTvvCodes),
    [displayContracts, config, staffList, recruiterList, tvvStructList, priorityTvvCodes]
  );
  const tvvPerContractRows = useMemo(
    () => computeTVVPerContractRows(displayContracts, config),
    [displayContracts, config]
  );
  // NYD data — tính cho targetType='nyd' (trước đây báo "chưa hỗ trợ")
  const nydData = useMemo(
    () => computeNYDData(displayContracts, config, recruiterList, staffList, tvvStructList),
    [displayContracts, config, recruiterList, staffList, tvvStructList]
  );
  const nydResultRows = useMemo(
    () => computeNYDResultRows(nydData, config),
    [nydData, config]
  );

  // Step 4: stats summary
  const stats = useMemo(
    () =>
      computeContestStats(
        displayContracts,
        groupedData,
        tvvTotalRows,
        tvvPerContractRows,
        config
      ),
    [displayContracts, groupedData, tvvTotalRows, tvvPerContractRows, config]
  );

  // ===== Apply local filters (nhom + name) =====
  // Note: filter on top of computed results to keep calculator logic untouched
  const q = nameFilter.trim().toLowerCase();
  const applyLocalFilter = <T extends { matchesName?: boolean; nhomLabel?: string }>(rows: T[]): T[] => {
    return rows.filter((r) => {
      if (nhomFilter && r.nhomLabel !== nhomFilter) return false;
      if (q && !(r as any).matchesName) return false;
      return true;
    });
  };

  // Build list of unique nhom for filter dropdown
  const uniqueNhomList = useMemo(() => {
    const set = new Set<string>();
    if (config.targetType === 'nhom') {
      for (const g of groupedData) if (g.nhom) set.add(g.nhom);
    } else if (config.targetType === 'tvv') {
      for (const c of displayContracts) if (c.nhom) set.add(c.nhom);
      // Also from tvvTotalRows
      for (const r of tvvTotalRows) if (r.agent.nhom) set.add(r.agent.nhom);
    } else if (config.targetType === 'nyd') {
      // NYD uses nydData — collect nhom from NTD records
      for (const n of nydData) if (n.nhom) set.add(n.nhom);
    }
    return Array.from(set).sort();
  }, [groupedData, displayContracts, tvvTotalRows, nydData, config.targetType]);

  // ===== Build table header + body based on targetType × conditionType =====
  // Hỗ trợ TẤT CẢ target: tvv (per-contract + total) / nhom (total/activity/pass-count) / nyd (NTD)
  const isAFYP = config.conditionType === 'per_contract_afyp' || config.conditionType === 'total_afyp';
  const showRateColumn = hasPercentBonus(config.bonusTiers) && !config.usePhase2;
  const showSecondaryTotalColumn =
    (config.useSecondaryCondition ?? false) &&
    ((config.secondaryTotalAFYPMin ?? 0) > 0 || (config.secondaryTotalIPMin ?? 0) > 0);
  const usePhase2 = config.usePhase2 ?? false;
  const hideNotAchieved = config.hideNotAchieved ?? false;
  // The contest card can be opened while the shared AppDataProvider is still
  // fetching its source arrays. Keep the table in an explicit loading state
  // instead of briefly showing a misleading empty-result message.
  const isContestDataLoading = isLoading || isReloading;
  const renderLoadingTableRow = (colSpan: number) => (
    <TableRow>
      <TableCell colSpan={colSpan} className="bg-white py-10 text-center">
        <span className="inline-flex items-center justify-center gap-2 text-xs font-bold text-emerald-700">
          <LoaderCircle className="h-5 w-5 animate-spin text-emerald-500" aria-hidden="true" />
          Đang tải dữ liệu...
        </span>
      </TableCell>
    </TableRow>
  );
  const sortedTiers = useMemo(
    () => [...config.bonusTiers].sort((a, b) => a.minFYP - b.minFYP),
    [config.bonusTiers]
  );

  // ===== Render functions =====
  const renderPosterBlock = () => {
    const currentPosterUrl = posterUrl || config.posterUrl || '';
    const startDateStr = config.startDate ? formatDate(config.startDate) : '...';
    const endDateStr = config.endDate ? formatDate(config.endDate) : '...';
    return (
      <div className="relative flex-shrink-0 w-full overflow-hidden" style={{ aspectRatio: '16 / 9', backgroundColor: '#0F1729' }}>
        {currentPosterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentPosterUrl} alt={config.title} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 text-[10px] text-center p-3 gap-1">
            <Trophy className="w-8 h-8 text-emerald-400/70" />
            <span className="text-emerald-300 text-[11px] font-bold">{config.title}</span>
            <span className="text-[8px] italic text-gray-500">Chưa có poster</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent flex items-end px-2 pb-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-white text-[10px] font-black uppercase tracking-wider truncate">{config.title}</span>
            <span className="text-amber-200 text-[9px] font-semibold whitespace-nowrap">{startDateStr} — {endDateStr}</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {getConditionLabel(config.conditionType)}
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
              {getTargetLabel(config.targetType)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderFilterRow = () => (
    <>
      {/* Nhóm KD dropdown */}
      <div className="relative z-[200] flex-1 min-w-0">
        <button
          onClick={(e) => {
            const dd = e.currentTarget.nextElementSibling as HTMLElement;
            if (dd) dd.classList.toggle('hidden');
          }}
          className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #92400E', color: '#374151' }}
        >
          <span className="truncate flex items-center gap-1">
            <span className="text-amber-700/70 text-[8px] uppercase tracking-wider">Nhóm</span>
            <span className="truncate">{nhomFilter || 'Tất cả'}</span>
          </span>
          <ChevronDown className="w-3 h-3 flex-shrink-0" />
        </button>
        <div className="hidden absolute top-full left-0 right-0 mt-0.5 z-[300] bg-[#1a2332] border border-amber-500/40 max-h-[120px] overflow-y-auto rounded-[2px] shadow-2xl">
          <button
            onClick={(e) => { setNhomFilter(''); (e.currentTarget.closest('.relative')?.querySelector('.absolute') as HTMLElement)?.classList.add('hidden'); }}
            className={`w-full text-left px-2 py-1 text-[10px] hover:bg-amber-500/20 ${!nhomFilter ? 'text-amber-300 font-bold' : 'text-amber-200/70'}`}
          >Tất cả nhóm</button>
          {uniqueNhomList.map((n) => (
            <button
              key={n}
              onClick={(e) => { setNhomFilter(n); (e.currentTarget.closest('.relative')?.querySelector('.absolute') as HTMLElement)?.classList.add('hidden'); }}
              className={`w-full text-left px-2 py-1 text-[10px] hover:bg-amber-500/20 ${nhomFilter === n ? 'text-amber-300 font-bold' : 'text-amber-200/70'}`}
            >{n}</button>
          ))}
        </div>
      </div>
      {/* Tên / Mã search */}
      <div className="relative z-[200] flex-1 min-w-0">
        <div className="flex items-center gap-1 px-2 py-1" style={{ backgroundColor: '#FFFFFF', border: '1px solid #92400E' }}>
          <Search className="w-3 h-3 text-amber-700 flex-shrink-0" />
          <input
            type="text"
            placeholder="Tìm tên / mã..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="text-[10px] bg-transparent outline-none flex-1 min-w-0 text-gray-800 placeholder:text-gray-500"
          />
          {nameFilter && (
            <button onClick={() => setNameFilter('')} className="text-gray-500 hover:text-red-600 flex-shrink-0">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </>
  );

  // ===== Build header cell for a tier (bonus column) =====
  const renderTierHeader = (tier: BonusTier, idx: number) => {
    const isActivity = isActivityRoundMode(config.conditionType);
    return (
      <TableHead
        key={tier.id}
        className="text-[10px] font-bold uppercase text-center align-middle whitespace-nowrap p-1"
        style={{ backgroundColor: '#065F46', color: '#FEF3C7', width: '115px', minWidth: '115px' }}
      >
        <div className="leading-tight">
          <div>Mức {idx + 1}</div>
          <div className="italic font-normal text-[9px]">
            {isActivity
              ? `${tier.minFYP}${tier.maxFYP ? ` - ${tier.maxFYP}` : ' ↑'} lượt`
              : `${formatCurrency(tier.minFYP)}${tier.maxFYP ? ` - ${formatCurrency(tier.maxFYP)}` : ' ↑'}`}
          </div>
          <div className="italic font-normal text-[9px]">
            {tier.bonusType === 'gift' && tier.bonusText ? tier.bonusText : formatBonusAmount(tier)}
          </div>
        </div>
      </TableHead>
    );
  };

  // ===== Render: TVV per-contract table (per_contract_ip / per_contract_afyp) =====
  const renderTVVPerContractTable = () => {
    const filteredRows = tvvPerContractRows.filter((row) => {
      if (hideNotAchieved && !row.tier) return false;
      if (!row.contract.nhom && !row.contract.maNhom) return false;
      if (nhomFilter && row.contract.nhom !== nhomFilter && row.contract.maNhom !== nhomFilter) return false;
      if (q && !((row.contract.agentName || '').toLowerCase().includes(q) || (row.contract.agentCode || '').toLowerCase().includes(q))) return false;
      return true;
    });

    return (
      <Table>
        <TableHeader className="sticky top-0 z-10">
          <TableRow className="border-b" style={{ backgroundColor: '#065F46', borderColor: '#047857' }}>
            <TableHead className="text-[10px] font-bold uppercase text-center align-middle w-[40px]" style={{ color: '#FEF3C7', backgroundColor: '#065F46' }}>STT</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: '#FEF3C7', backgroundColor: '#065F46' }}>NHÓM KD</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: '#FEF3C7', backgroundColor: '#065F46' }}>MÃ SỐ ĐẠI LÝ</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: '#FEF3C7', backgroundColor: '#065F46' }}>HỌ TÊN TVV</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: '#FEF3C7', backgroundColor: '#065F46' }}>NGÀY HL</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: '#FEF3C7', backgroundColor: '#065F46' }}>{isAFYP ? 'AFYP/HĐ' : 'IP/HĐ'}</TableHead>
            {showRateColumn && (
              <TableHead className="text-[10px] font-bold uppercase text-center align-middle bg-violet-100 whitespace-nowrap" style={{ color: '#5B21B6' }}><Percent className="w-3 h-3 inline -mt-0.5" /> Tỷ lệ</TableHead>
            )}
            {usePhase2 ? (
              <>
                <TableHead className="text-[10px] font-bold uppercase text-center align-middle" style={{ backgroundColor: '#047857', color: '#FEF3C7' }}>Thưởng GD1</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-center align-middle" style={{ backgroundColor: '#047857', color: '#FEF3C7' }}>Thưởng GD2</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-center align-middle" style={{ backgroundColor: '#92400E', color: '#FEF3C7' }}>Tổng Thưởng</TableHead>
              </>
            ) : (
              <TableHead className="text-[10px] font-bold uppercase text-center align-middle" style={{ backgroundColor: '#047857', color: '#FEF3C7' }}>Thưởng</TableHead>
            )}
            <TableHead className="text-[10px] font-bold uppercase text-center align-middle" style={{ color: '#FEF3C7', backgroundColor: '#065F46' }}>Ghi chú</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isContestDataLoading ? renderLoadingTableRow(usePhase2 ? 11 : 9) : filteredRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={usePhase2 ? 11 : 9} className="text-center text-gray-400 py-10 italic text-xs bg-white">
                Không có dữ liệu phù hợp.
              </TableCell>
            </TableRow>
          ) : filteredRows.map((row, idx) => (
            <TableRow key={`${row.contract.id}-${idx}`} className={`${row.effectiveTier ? 'bg-white' : 'bg-red-50'} hover:bg-emerald-50 border-b border-gray-200`}>
              <TableCell className="text-center text-gray-400 text-xs whitespace-nowrap">{idx + 1}</TableCell>
              <TableCell className="text-xs text-emerald-700 font-semibold whitespace-nowrap">{row.contract.nhom || '—'}</TableCell>
              <TableCell className="text-xs text-gray-600 font-mono whitespace-nowrap">{row.contract.agentCode}</TableCell>
              <TableCell className="text-xs text-gray-800 whitespace-nowrap">{row.contract.agentName}</TableCell>
              <TableCell className="text-center text-xs text-gray-600 whitespace-nowrap">{formatDate(row.contract.effectiveDate)}</TableCell>
              <TableCell className="text-center text-xs text-gray-900 whitespace-nowrap">{formatNumber(row.cValue)}</TableCell>
              {showRateColumn && (
                <TableCell className="text-center bg-violet-50 text-xs whitespace-nowrap">
                  {row.effectiveTier ? <span className="font-bold text-violet-600">{formatRate(row.effectiveTier)}</span> : <span className="text-gray-400">—</span>}
                </TableCell>
              )}
              {usePhase2 ? (
                <>
                  <TableCell className="text-center bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{row.effectiveTier && row.phaseInfo.phase1Bonus > 0 ? formatCurrency(row.phaseInfo.phase1Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                  <TableCell className="text-center bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{row.effectiveTier && row.phaseInfo.phase2Bonus > 0 ? formatCurrency(row.phaseInfo.phase2Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                  <TableCell className="text-center bg-amber-50 text-xs font-bold text-amber-600 whitespace-nowrap">{row.effectiveTier ? formatCurrency(row.phaseInfo.phase1Bonus + row.phaseInfo.phase2Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                </>
              ) : (
                <TableCell className="text-center bg-emerald-50 whitespace-nowrap">
                  {row.effectiveTier ? (
                    <span className="inline-flex items-center gap-1">
                      {row.effectiveTier.bonusType === 'gift' ? <Gift className="w-4 h-4 text-pink-500" /> : <Award className="w-4 h-4 text-amber-500" />}
                      <span className="font-bold text-emerald-600 text-sm">{formatBonusAmount(row.effectiveTier, row.cValue)}</span>
                    </span>
                  ) : <span className="text-gray-400 text-xs">—</span>}
                </TableCell>
              )}
              <TableCell className="whitespace-nowrap">
                {!row.effectiveTier && row.remaining !== null ? (
                  <span className="text-[10px] italic text-gray-400">{!row.secondaryPassed && row.tier ? 'Chưa đạt ĐKB' : `Cần thêm ${formatNumber(row.remaining)}`}</span>
                ) : !row.effectiveTier ? (
                  <span className="text-[10px] italic text-gray-400">{!row.secondaryPassed && row.tier ? 'Chưa đạt ĐKB' : 'Chưa đạt'}</span>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  // ===== Render: TVV total table (total_ip / total_afyp / activity_round*) =====
  const renderTVVTotalTable = () => {
    const filteredRows = tvvTotalRows.filter((row) => {
      if (hideNotAchieved && !row.tier) return false;
      if (!row.agent.nhom && !row.agent.maNhom) return false;
      if (nhomFilter && row.agent.nhom !== nhomFilter && row.agent.maNhom !== nhomFilter) return false;
      if (q && !((row.agent.agentName || '').toLowerCase().includes(q) || (row.agent.agentCode || '').toLowerCase().includes(q))) return false;
      return true;
    });
    const isActivity = isActivityRoundMode(config.conditionType);
    const isTopN = isTopNMode(config.conditionType);
    const isPassCount = isTVVPassCountMode(config.conditionType);
    const topNValueType = config.topNValueType === 'afyp' ? 'afyp' : 'ip';
    const valueLabel = isActivity ? 'LƯỢT HĐ' : (isTopN ? (topNValueType === 'afyp' ? 'TỔNG AFYP' : 'TỔNG IP') : (isAFYP ? 'TỔNG AFYP' : 'TỔNG IP'));

    return (
      <Table>
        <TableHeader className="sticky top-0 z-10">
          <TableRow className="border-b" style={{ backgroundColor: '#065F46', borderColor: '#047857' }}>
            <TableHead className="text-[10px] font-bold uppercase text-center align-middle w-[40px]" style={{ color: '#FEF3C7', backgroundColor: '#065F46' }}>STT</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: '#FEF3C7', backgroundColor: '#065F46' }}>NHÓM KD</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: '#FEF3C7', backgroundColor: '#065F46' }}>MÃ SỐ ĐẠI LÝ</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: '#FEF3C7', backgroundColor: '#065F46' }}>HỌ TÊN TVV</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: '#FEF3C7', backgroundColor: '#065F46' }}>{valueLabel}</TableHead>
            {showRateColumn && (
              <TableHead className="text-[10px] font-bold uppercase text-center align-middle bg-violet-100 whitespace-nowrap" style={{ color: '#5B21B6' }}><Percent className="w-3 h-3 inline -mt-0.5" /> Tỷ lệ</TableHead>
            )}
            {usePhase2 ? (
              <>
                <TableHead className="text-[10px] font-bold uppercase text-center align-middle" style={{ backgroundColor: '#047857', color: '#FEF3C7' }}>Thưởng GD1</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-center align-middle" style={{ backgroundColor: '#047857', color: '#FEF3C7' }}>Thưởng GD2</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-center align-middle" style={{ backgroundColor: '#92400E', color: '#FEF3C7' }}>Tổng Thưởng</TableHead>
              </>
            ) : (
              <TableHead className="text-[10px] font-bold uppercase text-center align-middle" style={{ backgroundColor: '#047857', color: '#FEF3C7' }}>Thưởng</TableHead>
            )}
            <TableHead className="text-[10px] font-bold uppercase text-center align-middle" style={{ color: '#FEF3C7', backgroundColor: '#065F46' }}>Ghi chú</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isContestDataLoading ? renderLoadingTableRow(usePhase2 ? 10 : 8) : filteredRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={usePhase2 ? 10 : 8} className="text-center text-gray-400 py-10 italic text-xs bg-white">
                Không có dữ liệu phù hợp.
              </TableCell>
            </TableRow>
          ) : filteredRows.map((row, idx) => {
            // Secondary check
            const agentContracts = displayContracts.filter((c) => c.agentCode === row.agent.agentCode);
            const totalAFYP = agentContracts.reduce((s, c) => s + c.afyp, 0);
            const totalIP = agentContracts.reduce((s, c) => s + c.pdt10DT, 0);
            let secondaryPassed = true;
            if (config.useSecondaryCondition) {
              if ((config.secondaryTotalAFYPMin ?? 0) > 0 && totalAFYP < (config.secondaryTotalAFYPMin ?? 0)) secondaryPassed = false;
              if ((config.secondaryTotalIPMin ?? 0) > 0 && totalIP < (config.secondaryTotalIPMin ?? 0)) secondaryPassed = false;
            }
            const effectiveTier = secondaryPassed ? row.tier : ((config.secondaryTotalAFYPMin ?? 0) > 0 || (config.secondaryTotalIPMin ?? 0) > 0 ? null : row.tier);
            // Top N mode: tính label hạng để ghi vào cột Ghi chú (KHÔNG có cột HẠNG riêng)
            let noteLabel: React.ReactNode = null;
            if (isTopN) {
              if (effectiveTier) {
                const qualifierRank = filteredRows
                  .slice(0, idx)
                  .filter(r => r.tier).length;
                if (qualifierRank === 0) {
                  noteLabel = <span className="inline-flex items-center gap-1 text-amber-600 font-bold text-sm"><Crown className="w-4 h-4" />Quán quân</span>;
                } else if (qualifierRank === 1) {
                  noteLabel = <span className="inline-flex items-center gap-1 text-slate-500 font-bold text-sm"><Medal className="w-4 h-4" />Á quân</span>;
                } else {
                  noteLabel = <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-sm"><Trophy className="w-4 h-4" />Hạng {qualifierRank + 1}</span>;
                }
              } else if (row.remaining !== null) {
                noteLabel = <span className="text-[10px] italic text-gray-400">{!secondaryPassed && row.tier ? 'Chưa đạt ĐKB' : `Cần thêm ${formatNumber(row.remaining)}`}</span>;
              } else {
                noteLabel = <span className="text-[10px] italic text-gray-400">{!secondaryPassed && row.tier ? 'Chưa đạt ĐKB' : 'Chưa đạt'}</span>;
              }
            } else {
              // Non-Top N: giữ nguyên logic cột Ghi chú
              noteLabel = !effectiveTier && row.remaining !== null
                ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && row.tier ? 'Chưa đạt ĐKB' : `Cần thêm ${formatNumber(row.remaining)}`}</span>
                : !effectiveTier
                  ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && row.tier ? 'Chưa đạt ĐKB' : 'Chưa đạt'}</span>
                  : null;
            }
            return (
              <TableRow key={row.agent.agentCode} className={`${effectiveTier ? 'bg-white' : 'bg-red-50'} hover:bg-emerald-50 border-b border-gray-200`}>
                <TableCell className="text-center text-xs whitespace-nowrap text-gray-400">{idx + 1}</TableCell>
                <TableCell className="text-xs text-emerald-700 font-semibold whitespace-nowrap">{row.agent.nhom || '—'}</TableCell>
                <TableCell className="text-xs text-gray-600 font-mono whitespace-nowrap">{row.agent.agentCode}</TableCell>
                <TableCell className="text-xs text-gray-800 whitespace-nowrap">{row.agent.agentName}</TableCell>
                <TableCell className="text-center text-xs text-gray-900 whitespace-nowrap font-semibold">{isPassCount ? `${row.value} TVV` : isActivity ? row.value : formatNumber(row.value)}</TableCell>
                {showRateColumn && (
                  <TableCell className="text-center bg-violet-50 text-xs whitespace-nowrap">
                    {effectiveTier ? <span className="font-bold text-violet-600">{formatRate(effectiveTier)}</span> : <span className="text-gray-400">—</span>}
                  </TableCell>
                )}
                {usePhase2 ? (
                  <>
                    <TableCell className="text-center bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{effectiveTier && row.phaseInfo.phase1Bonus > 0 ? formatCurrency(row.phaseInfo.phase1Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                    <TableCell className="text-center bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{effectiveTier && row.phaseInfo.phase2Bonus > 0 ? formatCurrency(row.phaseInfo.phase2Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                    <TableCell className="text-center bg-amber-50 text-xs font-bold text-amber-600 whitespace-nowrap">{effectiveTier ? formatCurrency(row.phaseInfo.phase1Bonus + row.phaseInfo.phase2Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                  </>
                ) : (
                  <TableCell className="text-center bg-emerald-50 whitespace-nowrap">
                    {effectiveTier ? (
                      <span className="inline-flex items-center gap-1">
                        {effectiveTier.bonusType === 'gift' ? <Gift className="w-4 h-4 text-pink-500" /> : <Award className="w-4 h-4 text-amber-500" />}
                        <span className="font-bold text-emerald-600 text-sm">{formatBonusAmount(effectiveTier, row.value, isActivity ? row.value : undefined)}</span>
                      </span>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </TableCell>
                )}
                <TableCell className="whitespace-nowrap">{noteLabel}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  // ===== Render: Nhóm (group) table =====
  // Hỗ trợ TẤT CẢ mode: total_ip / total_afyp / activity_round* / tvv_pass_count / pass_count_ip_afyp
  // - total_ip / total_afyp: value = tổng FYP/AFYP nhóm
  // - activity_round*: value = tổng lượt HĐ nhóm
  // - tvv_pass_count: value = số TVV đạt CTĐK (cần referenceContest) — hiện fallback 0 nếu không có
  // - pass_count_ip_afyp: value = số TVV trong nhóm đạt IP >= secondaryIPMin AND AFYP >= secondaryAFYPMin
  const renderNhomTable = () => {
    // Sort groups by value desc
    const isActivity = isActivityRoundMode(config.conditionType);
    const isPassCountIPAFYP = config.conditionType === 'pass_count_ip_afyp';
    const isPassCount = isTVVPassCountMode(config.conditionType);
    const sortedGroups = [...groupedData]
      .map((g) => {
        let value: number;
        if (isPassCountIPAFYP) {
          // Đếm TVV trong nhóm đạt IP+AFYP threshold
          value = getGroupTVVPassCountIPAFYP(g, displayContracts, staffList, config);
        } else if (isPassCount) {
          // tvv_pass_count mode — cần referenceContest + savedContests để tính
          // Hiện chưa có context savedContests trong SavedContestInline → fallback 0
          // (User hiếm khi dùng mode này với SavedContestInline — thường dùng thi-dua-chau page)
          value = 0;
        } else if (isActivity) {
          value = g.activityRounds;
        } else if (config.conditionType === 'total_afyp') {
          value = g.totalAFYP;
        } else {
          value = g.totalFYP;
        }
        const { tier } = isActivity
          ? calculateActivityRoundBonusWithTiers(value, config.bonusTiers)
          : calculateBonusWithTiers(value, config.bonusTiers);
        // Secondary check
        const totalAFYP = g.contracts.reduce((s, c) => s + c.afyp, 0);
        const totalIP = g.contracts.reduce((s, c) => s + c.pdt10DT, 0);
        let secondaryPassed = true;
        if (config.useSecondaryCondition) {
          if ((config.secondaryTotalAFYPMin ?? 0) > 0 && totalAFYP < (config.secondaryTotalAFYPMin ?? 0)) secondaryPassed = false;
          if ((config.secondaryTotalIPMin ?? 0) > 0 && totalIP < (config.secondaryTotalIPMin ?? 0)) secondaryPassed = false;
        }
        const effectiveTier = secondaryPassed ? tier : ((config.secondaryTotalAFYPMin ?? 0) > 0 || (config.secondaryTotalIPMin ?? 0) > 0 ? null : tier);
        // Phase 2 split — chỉ áp dụng cho non-pass-count modes (pass count dùng giá trị đếm được, không chia phase)
        let phase1Bonus = 0, phase2Bonus = 0;
        if (usePhase2 && config.phase2StartDate && !isPassCountIPAFYP && !isPassCount) {
          const p2Start = new Date(config.phase2StartDate);
          const p1Contracts = g.contracts.filter((c) => new Date(c.effectiveDate) < p2Start);
          const p2Contracts = g.contracts.filter((c) => new Date(c.effectiveDate) >= p2Start);
          if (isActivity) {
            const p1Rounds = calculateLuot(p1Contracts, isStandardMode(config.conditionType) ? config.luotHDCTThreshold : config.luotHDThreshold, config.conditionType, config.tvv90MaxMonths, config.tvv90MinIP);
            const p2Rounds = calculateLuot(p2Contracts, isStandardMode(config.conditionType) ? config.luotHDCTThreshold : config.luotHDThreshold, config.conditionType, config.tvv90MaxMonths, config.tvv90MinIP);
            const p1Res = calculateActivityRoundBonusWithTiers(p1Rounds, config.bonusTiers);
            const p2Res = calculateActivityRoundBonusWithTiers(p2Rounds, config.bonusTiers2);
            phase1Bonus = p1Res.tier ? computeBonusFromTier(p1Res.tier, p1Contracts.reduce((s, c) => s + c.pdt10DT, 0), p1Rounds) : 0;
            phase2Bonus = p2Res.tier ? computeBonusFromTier(p2Res.tier, p2Contracts.reduce((s, c) => s + c.pdt10DT, 0), p2Rounds) : 0;
          } else {
            const isAFYPLocal = config.conditionType === 'total_afyp';
            const p1Value = isAFYPLocal ? p1Contracts.reduce((s, c) => s + c.afyp, 0) : p1Contracts.reduce((s, c) => s + c.pdt10DT, 0);
            const p2Value = isAFYPLocal ? p2Contracts.reduce((s, c) => s + c.afyp, 0) : p2Contracts.reduce((s, c) => s + c.pdt10DT, 0);
            const p1Res = calculateBonusWithTiers(p1Value, config.bonusTiers);
            const p2Res = calculateBonusWithTiers(p2Value, config.bonusTiers2);
            phase1Bonus = p1Res.tier ? computeBonusFromTier(p1Res.tier, p1Value) : 0;
            phase2Bonus = p2Res.tier ? computeBonusFromTier(p2Res.tier, p2Value) : 0;
          }
        }
        return { g, value, tier, effectiveTier, secondaryPassed, totalAFYP, totalIP, phase1Bonus, phase2Bonus };
      })
      .filter((row) => {
        if (hideNotAchieved && !row.tier) return false;
        if (nhomFilter && row.g.nhom !== nhomFilter) return false;
        if (q) {
          const leaderName = row.g.leader?.agentName || '';
          const leaderCode = row.g.leader?.agentCode || '';
          if (!(leaderName.toLowerCase().includes(q) || leaderCode.toLowerCase().includes(q) || row.g.nhom.toLowerCase().includes(q) || row.g.maNhom.toLowerCase().includes(q))) return false;
        }
        return true;
      })
      .sort((a, b) => b.value - a.value);

    const valueLabel = isPassCountIPAFYP
      ? 'SL TVV ĐẠT'
      : isPassCount
      ? 'SL TVV ĐẠT CTĐK'
      : isActivity
      ? 'LƯỢT HĐ'
      : isAFYP
      ? 'TỔNG AFYP'
      : 'TỔNG IP';
    const valueSubLabel = isPassCountIPAFYP
      ? `IP ≥ ${formatCurrency(config.secondaryIPMin ?? 0)} + AFYP ≥ ${formatCurrency(config.secondaryAFYPMin ?? 0)}${config.includeTNInPassCount ? '' : ' · Không tính TN'}`
      : isPassCount
      ? `${config.referenceContestId ? 'Theo chương trình tham chiếu' : 'Theo CTĐK'}${config.includeTNInPassCount ? '' : ' · Không tính TN'}`
      : '';

    return (
      <Table>
        <TableHeader className="sticky top-0 z-10">
          <TableRow className="border-b" style={{ backgroundColor: '#065F46', borderColor: '#047857' }}>
            <TableHead className="text-[10px] font-bold uppercase text-center align-middle w-[40px]" style={{ color: '#FEF3C7', backgroundColor: '#065F46' }}>STT</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: '#FEF3C7', backgroundColor: '#065F46' }}>NHÓM</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: '#FEF3C7', backgroundColor: '#065F46' }}>MÃ TN</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: '#FEF3C7', backgroundColor: '#065F46' }}>TÊN TRƯỞNG NHÓM</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: '#FEF3C7', backgroundColor: '#065F46' }}>CHỨC VỤ</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: '#FEF3C7', backgroundColor: '#065F46' }}>
              <div>{valueLabel}</div>
              {valueSubLabel && <div className="text-[9px] italic font-normal normal-case" style={{ color: '#FCD34D' }}>{valueSubLabel}</div>}
            </TableHead>
            {showRateColumn && (
              <TableHead className="text-[10px] font-bold uppercase text-center align-middle bg-violet-100 whitespace-nowrap" style={{ color: '#5B21B6' }}><Percent className="w-3 h-3 inline -mt-0.5" /> Tỷ lệ</TableHead>
            )}
            {usePhase2 ? (
              <>
                <TableHead className="text-[10px] font-bold uppercase text-center align-middle" style={{ backgroundColor: '#047857', color: '#FEF3C7' }}>Thưởng GD1</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-center align-middle" style={{ backgroundColor: '#047857', color: '#FEF3C7' }}>Thưởng GD2</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-center align-middle" style={{ backgroundColor: '#92400E', color: '#FEF3C7' }}>Tổng Thưởng</TableHead>
              </>
            ) : (
              <TableHead className="text-[10px] font-bold uppercase text-center align-middle" style={{ backgroundColor: '#047857', color: '#FEF3C7' }}>Thưởng</TableHead>
            )}
            <TableHead className="text-[10px] font-bold uppercase text-center align-middle" style={{ color: '#FEF3C7', backgroundColor: '#065F46' }}>Ghi chú</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isContestDataLoading ? renderLoadingTableRow(usePhase2 ? 11 : 9) : sortedGroups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={usePhase2 ? 11 : 9} className="text-center text-gray-400 py-10 italic text-xs bg-white">
                Không có dữ liệu phù hợp.
              </TableCell>
            </TableRow>
          ) : sortedGroups.map((row, idx) => (
            <TableRow key={row.g.maNhom} className={`${row.effectiveTier ? 'bg-white' : 'bg-red-50'} hover:bg-emerald-50 border-b border-gray-200`}>
              <TableCell className="text-center text-gray-400 text-xs whitespace-nowrap">{idx + 1}</TableCell>
              <TableCell className="text-xs text-emerald-700 font-semibold whitespace-nowrap">{row.g.nhom || '—'}</TableCell>
              <TableCell className="text-xs text-gray-600 font-mono whitespace-nowrap">{row.g.leader?.agentCode || '—'}</TableCell>
              <TableCell className="text-xs text-gray-800 whitespace-nowrap">{row.g.leader?.agentName || '—'}</TableCell>
              <TableCell className="text-xs text-gray-600 whitespace-nowrap">{row.g.leader?.position || '—'}</TableCell>
              <TableCell className="text-right text-xs text-gray-900 whitespace-nowrap font-semibold">{(isActivity || isPassCountIPAFYP || isPassCount) ? row.value : formatNumber(row.value)}</TableCell>
              {showRateColumn && (
                <TableCell className="text-center bg-violet-50 text-xs whitespace-nowrap">
                  {row.effectiveTier ? <span className="font-bold text-violet-600">{formatRate(row.effectiveTier)}</span> : <span className="text-gray-400">—</span>}
                </TableCell>
              )}
              {usePhase2 ? (
                <>
                  <TableCell className="text-center bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{row.effectiveTier && row.phase1Bonus > 0 ? formatCurrency(row.phase1Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                  <TableCell className="text-center bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{row.effectiveTier && row.phase2Bonus > 0 ? formatCurrency(row.phase2Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                  <TableCell className="text-center bg-amber-50 text-xs font-bold text-amber-600 whitespace-nowrap">{row.effectiveTier ? formatCurrency(row.phase1Bonus + row.phase2Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                </>
              ) : (
                <TableCell className="text-center bg-emerald-50 whitespace-nowrap">
                  {row.effectiveTier ? (
                    <span className="inline-flex items-center gap-1">
                      {row.effectiveTier.bonusType === 'gift' ? <Gift className="w-4 h-4 text-pink-500" /> : <Award className="w-4 h-4 text-amber-500" />}
                      <span className="font-bold text-emerald-600 text-sm">{formatBonusAmount(row.effectiveTier, row.value, (isActivity || isPassCountIPAFYP || isPassCount) ? row.value : undefined)}</span>
                    </span>
                  ) : <span className="text-gray-400 text-xs">—</span>}
                </TableCell>
              )}
              <TableCell className="whitespace-nowrap">
                {!row.effectiveTier ? (
                  <span className="text-[10px] italic text-gray-400">{!row.secondaryPassed && row.tier ? 'Chưa đạt ĐKB' : 'Chưa đạt'}</span>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  // ===== Render: NYD (NTD) table — hỗ trợ TẤT CẢ mode =====
  // Trước đây targetType='nyd' báo "chưa hỗ trợ" → giờ render đầy đủ.
  // Cột VALUE:
  //   - activity_round*: số lượt HĐ của TVV do NTD tuyển (recruitCount)
  //   - total_ip / total_afyp: tổng FYP/AFYP tuyển dụng (+ ownFYP nếu includeIndividualNTD)
  //   - pass_count_*: recruitCount (số TVV do NTD tuyển có FYP ≥ luotHDThreshold)
  const renderNYDTable = () => {
    const isActivity = isActivityRoundMode(config.conditionType);
    const includeIndividualTN = config.includeIndividualNTD ?? false;
    const filteredRows = nydResultRows.filter((row) => {
      if (hideNotAchieved && !row.tier) return false;
      if (!row.nyd.nhom) return false;
      if (nhomFilter && row.nyd.nhom !== nhomFilter) return false;
      if (q && !((row.nyd.nydName || '').toLowerCase().includes(q) || (row.nyd.nydCode || '').toLowerCase().includes(q))) return false;
      return true;
    });
    const valueLabel = isActivity ? 'LƯỢT HĐ CHUẨN' : 'TỔNG FYP TUYỂN';

    return (
      <Table className="saved-contest-nyd-table">
        <TableHeader className="sticky top-0 z-10">
          <TableRow className="border-b" style={{ backgroundColor: '#D1FAE5', borderColor: '#10B981' }}>
            <TableHead className="text-[10px] font-bold uppercase text-center align-middle w-[40px]" style={{ color: '#065F46', backgroundColor: '#D1FAE5' }}>STT</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: '#065F46', backgroundColor: '#D1FAE5' }}>NHÓM</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: '#065F46', backgroundColor: '#D1FAE5' }}>MÃ NTD</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: '#065F46', backgroundColor: '#D1FAE5' }}>TÊN NTD</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: '#065F46', backgroundColor: '#D1FAE5' }}>CHỨC VỤ</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: '#ECFDF5', backgroundColor: '#047857' }}>{valueLabel}</TableHead>
            {showRateColumn && (
              <TableHead className="text-[10px] font-bold uppercase text-center align-middle whitespace-nowrap" style={{ color: '#ECFDF5', backgroundColor: '#047857' }}><Percent className="w-3 h-3 inline -mt-0.5" /> Tỷ lệ</TableHead>
            )}
            {usePhase2 ? (
              <>
                <TableHead className="text-[10px] font-bold uppercase text-center align-middle" style={{ backgroundColor: '#065F46', color: '#FEF3C7' }}>Thưởng GD1</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-center align-middle" style={{ backgroundColor: '#065F46', color: '#FEF3C7' }}>Thưởng GD2</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-center align-middle" style={{ backgroundColor: '#92400E', color: '#FEF3C7' }}>Tổng Thưởng</TableHead>
              </>
            ) : (
              <TableHead className="text-[10px] font-bold uppercase text-center align-middle" style={{ backgroundColor: '#065F46', color: '#FEF3C7' }}>Thưởng</TableHead>
            )}
            <TableHead className="text-[10px] font-bold uppercase text-center align-middle" style={{ color: '#ECFDF5', backgroundColor: '#047857' }}>Ghi chú</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isContestDataLoading ? renderLoadingTableRow(usePhase2 ? 10 : 8) : filteredRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={usePhase2 ? 10 : 8} className="text-center text-gray-400 py-10 italic text-xs bg-white">
                Không có dữ liệu phù hợp.
              </TableCell>
            </TableRow>
          ) : filteredRows.map((row, idx) => (
            <TableRow key={row.nyd.nydCode} className={`${row.tier ? 'bg-white' : 'bg-red-50'} hover:bg-emerald-50 border-b border-gray-200`}>
              <TableCell className="text-center text-gray-400 text-xs whitespace-nowrap">{idx + 1}</TableCell>
              <TableCell className="text-xs text-emerald-700 font-semibold whitespace-nowrap">{row.nyd.nhom || '—'}</TableCell>
              <TableCell className="text-xs text-gray-600 font-mono whitespace-nowrap">{row.nyd.nydCode}</TableCell>
              <TableCell className="text-xs text-gray-800 whitespace-nowrap">{row.nyd.nydName}</TableCell>
              <TableCell className="text-xs text-gray-600 whitespace-nowrap">{row.nyd.position || '—'}</TableCell>
              <TableCell className="text-center text-xs text-gray-900 whitespace-nowrap font-semibold">{isActivity ? row.value : formatNumber(row.value)}</TableCell>
              {showRateColumn && (
                <TableCell className="text-center bg-violet-50 text-xs whitespace-nowrap">
                  {row.tier ? <span className="font-bold text-violet-600">{formatRate(row.tier)}</span> : <span className="text-gray-400">—</span>}
                </TableCell>
              )}
              {usePhase2 ? (
                <>
                  <TableCell className="text-center bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{row.tier ? <span className="text-gray-400">—</span> : <span className="text-gray-400">—</span>}</TableCell>
                  <TableCell className="text-center bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{row.tier ? <span className="text-gray-400">—</span> : <span className="text-gray-400">—</span>}</TableCell>
                  <TableCell className="text-center bg-amber-50 text-xs font-bold text-amber-600 whitespace-nowrap">{row.tier ? formatCurrency(0) : <span className="text-gray-400">—</span>}</TableCell>
                </>
              ) : (
                <TableCell className="text-center bg-emerald-50 whitespace-nowrap">
                  {row.tier ? (
                    <span className="flex items-center justify-center gap-1">
                      {row.tier.bonusType === 'gift' ? <Gift className="w-4 h-4 text-pink-500" /> : <Award className="w-4 h-4 text-amber-500" />}
                      <span className="font-bold text-emerald-600 text-sm">{formatBonusAmount(row.tier, row.value, isActivity ? row.value : undefined)}</span>
                    </span>
                  ) : <span className="text-gray-400 text-xs">—</span>}
                </TableCell>
              )}
              <TableCell className="text-left px-3 whitespace-nowrap">
                {!row.tier && row.remaining !== null ? (
                  <span className="text-[10px] italic text-gray-400">{isActivity ? `Cần thêm ${row.remaining} lượt` : `Cần thêm ${formatNumber(row.remaining)}`}</span>
                ) : !row.tier ? (
                  <span className="text-[10px] italic text-gray-400">Chưa đạt</span>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  // ===== Choose table based on targetType × conditionType =====
  const renderTable = () => {
    if (config.targetType === 'nyd') {
      return renderNYDTable();
    }
    if (config.targetType === 'tvv') {
      if (isPerContractMode(config.conditionType)) return renderTVVPerContractTable();
      return renderTVVTotalTable();
    }
    if (config.targetType === 'nhom') {
      return renderNhomTable();
    }
    return null;
  };

  // ===== Build the shell layout (mobile + desktop) =====
  // Reuse the same structure as renderSaovietDetailShell — poster + filters + table + footer
  // Use emerald color theme (saved contest) instead of amber (3 main SV programs)
  const SHELL_COLOR = '#10B981'; // emerald-500
  const FOOTER_BG = '#10B981';
  const FOOTER_BORDER = '#047857';

  const tableBlock = (
    <div
      className="flex-1 min-h-0 overflow-auto border bg-white saoviet-detail-table-wrapper"
      style={{ borderColor: '#9CA3AF', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}
      data-saoviet-table={`saved-${config.id}`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        const row = target.closest('tr');
        if (!row) return;
        if (row.closest('thead')) return;
        if (row.cells.length < 2) return;
        const wrapper = e.currentTarget;
        wrapper.querySelectorAll('tr.sv-row-highlighted').forEach((r) => {
          if (r !== row) r.classList.remove('sv-row-highlighted');
        });
        row.classList.toggle('sv-row-highlighted');
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .saoviet-detail-table-wrapper thead {
          position: sticky;
          top: 0;
          z-index: 20;
          box-shadow: 0 2px 5px rgba(6, 95, 70, .26);
        }
        .saoviet-detail-table-wrapper .saved-contest-nyd-table thead tr:first-child th {
          background-color: #065F46 !important;
          color: #FEF3C7 !important;
        }
        @media (max-width: 767px) {
          .saoviet-detail-table-wrapper table { font-size: 9px !important; }
          .saoviet-detail-table-wrapper th,
          .saoviet-detail-table-wrapper td {
            padding: 3px !important;
            min-width: auto !important;
            width: auto !important;
            font-size: 9px !important;
          }
          .saoviet-detail-table-wrapper th span,
          .saoviet-detail-table-wrapper td span,
          .saoviet-detail-table-wrapper th br + span,
          .saoviet-detail-table-wrapper td br + span {
            font-size: 8px !important;
          }
          .saoviet-detail-table-wrapper td[style*="13px"],
          .saoviet-detail-table-wrapper td[style*="13px"] span {
            font-size: 10px !important;
          }
          .saoviet-detail-table-wrapper th.w-\\[32px\\] { width: 20px !important; min-width: 20px !important; }
        }
        .saoviet-detail-table-wrapper tr.sv-row-highlighted > td {
          background-color: #FED7AA !important;
          color: #7C2D12 !important;
          font-weight: 700 !important;
        }
      `}} />
      {renderTable()}
    </div>
  );

  const footerBlock = (
    <div
      className="flex-shrink-0 flex items-center justify-between px-3 text-white"
      style={{ height: '32px', backgroundColor: FOOTER_BG, borderTop: `2px solid ${FOOTER_BORDER}` }}
    >
      <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
        <span className="text-emerald-100">ĐẠT / TỔNG:</span>
        <span className="text-white">{stats.achievedCount} / {stats.filteredCount}</span>
      </span>
      <span className="text-[11px] font-bold flex items-center gap-1.5">
        <span className="text-emerald-100 uppercase">Tổng thưởng:</span>
        <span className="text-white font-black">{formatCurrency(stats.totalBonus)}</span>
      </span>
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-2" data-saoviet-table={`saved-${config.id}`}>
      <div
        className="flex-1 min-h-0 flex flex-col relative"
        style={{ backgroundColor: '#0F172A', boxShadow: '0 6px 24px rgba(0,0,0,0.55), 0 0 0 1px rgba(16, 185, 129, 0.10)' }}
      >
        {/* ====== MOBILE LAYOUT ====== */}
        <div className="md:hidden flex flex-col flex-1 min-h-0">
          {renderPosterBlock()}
          <div
            className="flex flex-shrink-0 items-center gap-1 px-1 py-1 border-b"
            style={{ backgroundColor: '#A7F3D0', borderColor: SHELL_COLOR }}
          >
            {renderFilterRow()}
          </div>
          {tableBlock}
          {footerBlock}
        </div>

        {/* ====== DESKTOP LAYOUT ====== */}
        <div className="hidden md:flex flex-col flex-1 min-h-0">
          <div
            className="flex flex-shrink-0 border mb-1.5"
            style={{ height: '160px', backgroundColor: '#C0C0C0', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}
          >
            {/* Left: poster */}
            <div className="relative w-1/2 overflow-hidden flex-shrink-0" style={{ backgroundColor: '#0F1729' }}>
              {(posterUrl || config.posterUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={posterUrl || config.posterUrl} alt={config.title} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 text-[10px] text-center p-3 gap-1">
                  <Trophy className="w-5 h-5 text-emerald-400/70" />
                  <span className="text-emerald-300">{config.title}</span>
                  <span className="text-[8px] italic text-gray-500">Chưa có poster</span>
                </div>
              )}
            </div>
            {/* Right: filter nhóm + search tên TVV */}
            <div
              className="w-1/2 flex flex-col justify-center gap-1.5 p-2 overflow-visible relative z-[200] border-l-2"
              style={{ backgroundColor: '#D1D5DB', boxShadow: 'inset 2px 0 6px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.15)', borderColor: '#9CA3AF' }}
            >
              <div className="relative z-[200]">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-700 mb-0.5">Nhóm KD</span>
                <button
                  onClick={(e) => {
                    const dd = e.currentTarget.nextElementSibling as HTMLElement;
                    if (dd) dd.classList.toggle('hidden');
                  }}
                  className="w-full flex items-center justify-between px-1.5 py-1 text-[9px] font-bold"
                  style={{ backgroundColor: '#F9FAFB', border: '1px solid #6B7280', color: '#374151', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                >
                  <span className="truncate">{nhomFilter || 'Tất cả nhóm'}</span>
                  <ChevronDown className="w-3 h-3 flex-shrink-0" />
                </button>
                <div className="hidden absolute top-full left-0 right-0 mt-0.5 z-[300] bg-[#1a2332] border border-emerald-500/40 max-h-[120px] overflow-y-auto rounded-[2px] shadow-2xl">
                  <button
                    onClick={(e) => { setNhomFilter(''); (e.currentTarget.closest('.relative')?.querySelector('.absolute') as HTMLElement)?.classList.add('hidden'); }}
                    className={`w-full text-left px-2 py-0.5 text-[9px] hover:bg-emerald-500/20 ${!nhomFilter ? 'text-emerald-300 font-bold' : 'text-emerald-200/70'}`}
                  >Tất cả nhóm</button>
                  {uniqueNhomList.map((n) => (
                    <button
                      key={n}
                      onClick={(e) => { setNhomFilter(n); (e.currentTarget.closest('.relative')?.querySelector('.absolute') as HTMLElement)?.classList.add('hidden'); }}
                      className={`w-full text-left px-2 py-0.5 text-[9px] hover:bg-emerald-500/20 ${nhomFilter === n ? 'text-emerald-300 font-bold' : 'text-emerald-200/70'}`}
                    >{n}</button>
                  ))}
                </div>
              </div>
              <div className="relative z-[200]">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-700 mb-0.5">Tên / Mã</span>
                <div className="flex items-center gap-1 px-1.5 py-1" style={{ backgroundColor: '#F9FAFB', border: '1px solid #6B7280', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                  <Search className="w-2.5 h-2.5 text-gray-600 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Tìm tên / mã..."
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    className="text-[9px] bg-transparent outline-none flex-1 min-w-0 text-gray-800 placeholder:text-gray-500"
                  />
                  {nameFilter && (
                    <button onClick={() => setNameFilter('')} className="text-gray-500 hover:text-red-600 flex-shrink-0">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {tableBlock}
          {footerBlock}
        </div>
      </div>
    </div>
  );
};

export default SavedContestInline;
