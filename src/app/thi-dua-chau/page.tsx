'use client';

// nmc-contest-top-eligibility-v1

// nmc-contest-combined-top-ranking-v3

// nmc-contest-combined-top-ranking-v2

// nmc-contest-combined-top-ranking-v1

import { RegisteredTargetSetup, RegisteredTargetResults, exportRegisteredTargets } from '@/components/registered-target-contest';
import { defaultRegisteredProgram, decodeRegisteredProgram, type RegisteredProgram } from '@/lib/contest-registered-targets';
import { computeRegisteredResults, registeredExportRows } from '@/lib/contest-registered-results';
import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// useSettings removed — no CSV sync, data from Quản lý page
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/back-button';
import { MainAppBottomNav } from '@/components/main-app-bottom-nav';
import { AppLoader } from '@/components/app-loader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppData } from '@/lib/app-data-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import {
  Plus, Trash2, Trophy, FileText, TrendingUp, Database,
  Download, X, Link, Loader2, Printer, Copy, Save, BookmarkPlus,
  Sparkles, Target, Award, Users, Banknote, CalendarRange, Gift,
  UserCheck, Percent, Image as ImageIcon, ChevronDown, ChevronUp, ArrowLeft,
  Camera, UserPlus, EyeOff, Filter, Layers, Settings2, Maximize2, Minimize2,
  RefreshCw, CheckCircle2, CalendarClock, Crown, Medal, FolderArchive,
} from 'lucide-react';
import { NeonDatePicker } from '@/components/neon-date-picker';
import { TVVContractCountTable } from '@/components/tvv-contract-count-table';
import { computeNYDData, filterNYDDisplayContracts, getNYDContributingContracts, getGroupTVVContractDetails, getGroupTVVContractProgress, formatTVVContractProgressNote } from '@/lib/contest-calculator';
import { expandActivityExportDetails } from '@/lib/contest-export-details';
import { buildCombinedTopRanking, passesCombinedTopEligibility, supportsCombinedTopRanking } from '@/lib/contest-combined-top-ranking';
import {
  createYearArchivePayload,
  getContestArchiveYear,
  groupChotContestsByMonth,
  isChotContestTitle,
} from '@/lib/contest-archive';
import {
  calculateEntityPhaseOutcome,
  calculateLuot as calculateContestLuot,
  filterContractsByContest,
  filterDisplayContracts,
  parseContestConfig,
  calculateNYDPhaseOutcome,
  computeBonusFromContracts,
  getReferenceContestPassingAgentCodes,
  evaluateSecondaryConditions,
  filterQualifyingActivityContracts,
  getContestMetricLabel,
  formatBonusAmountFromContracts,
  matchesBonusTier,
  sumContractIP,
  computeRecruitmentContestRows,
  usesPerContractIPPercentReward,
  formatContestConditionValue,
  formatContestConditionProgress,
  formatSecondaryConditionDeficit,
  getContestDateBoundary,
  type RecruitmentContestConfig,
  type SecondaryConditionResult,
} from '@/lib/contest-calculator';

interface Contract {
  id: string; contractNumber: string; agentCode: string; agentName: string;
  position: string; ban: string; nhom: string; maNhom: string;
  leaderAgentCode: string; recruiterCode: string;
  startDate: string | null; effectiveDate: string; issueDate: string;
  fyp: number; afyp: number;
  pdt10DT: number; tinhLuot3tr: number; maDaiLyTD: string; ngayBatDauLamViec: string | null;
  ad?: string;
}

interface BonusTier {
  id: string; minFYP: number; maxFYP: number | null; bonusAmount: number;
  bonusType: 'money' | 'gift' | 'percent' | 'percent_total_ip' | 'money_per_round' | 'money_per_tvv' | 'percent_fyc'; bonusText: string; bonusPercent: number;
}

type BonusType = BonusTier['bonusType'];

const createBlankBonusTier = (id: string, bonusType: BonusType = 'money'): BonusTier => ({
  id,
  minFYP: 0,
  maxFYP: null,
  bonusAmount: 0,
  bonusType,
  bonusText: '',
  bonusPercent: 0,
});

const createDefaultBonusTiers = (prefix = 'draft-tier'): BonusTier[] =>
  Array.from({ length: 3 }, (_, index) => createBlankBonusTier(`${prefix}-${index + 1}`));

const CONTEST_SOURCE_PAGE_SIZE = 100;
const CONTEST_RESULT_PAGE_SIZE = 100;

interface GroupLeader {
  agentCode: string; agentName: string; position: string;
}

interface GroupData {
  maNhom: string; nhom: string;
  leader: GroupLeader | null;   // Trưởng nhóm (hoặc Trưởng ban tham dự với vai trò Trưởng nhóm)
  totalFYP: number;
  totalAFYP: number;
  contractCount: number; activityRounds: number; contracts: Contract[];
  memberCount: number;  // Số TVV trong nhóm (từ Staff table)
}

interface NYDData {
  nydCode: string;
  nydName: string;
  nhom: string;
  position: string;
  startDate: string | null;
  recruitCount: number;
  recruitFYP: number;
  ownFYP: number;
  ownActivityRounds: number;
  contracts: Contract[];
}

interface StaffMember {
  id: string; nhom: string; maNhom: string; agentCode: string; agentName: string;
  position: string; startDate: string | null;
}

interface RecruiterMember {
  id: string; nhom: string; agentCode: string; agentName: string;
  position: string; startDate: string | null;
  ngayHieuLuc?: string | null; // Ngày hiệu lực chức vụ gần nhất của NTD
}

// TVV structure item — DS TVV đầy đủ từ /api/structure/tvv (gồm TẤT CẢ TVV, TTN, TB, TN)
// QUAN TRỌNG: nguồn này để xác định DS đối tượng thi đua (TVVm / TVV cũ / TN), KHÔNG dùng /api/staff
// vì /api/staff chỉ có 26 records (DS TB/TN leaders), không có TVV thường.
interface TVVStructItem {
  id: string;
  agentCode: string;
  agentName: string;
  maBanNhom: string;
  chucVu: string;        // "Tư vấn tài chính" | "Tiền trưởng nhóm" | "Trưởng nhóm" | "Trưởng ban" | ...
  ngayBatDau: string | null;  // startDate — ISO date string
  maTVVTuyendung?: string;
  note?: string;
  ghiChu?: string;
}

// MonthlyRevenueRow removed — all data now sourced from Contracts table only

interface SavedContest {
  id: string; title: string; startDate: string; endDate: string;
  issueDate: string | null; issueEndDate?: string | null; conditionType: string; targetType: string;
  bonusTiers: string; posterUrl?: string; participants?: string;
  usePhase2?: boolean; phase2StartDate?: string | null; phase2EndDate?: string | null; bonusTiers2?: string;
  useSecondaryCondition?: boolean; secondaryAFYPMin?: number; secondaryIPMin?: number;
  secondaryLuotHDMin?: number; secondaryLuotHDCMin?: number;
  secondaryLuotHDFilter?: string; secondaryLuotHDCFilter?: string;
  secondaryTotalAFYPMin?: number; secondaryTotalIPMin?: number;
  secondaryContractCountMin?: number; secondaryContractIPMin?: number;
  hideNotAchieved?: boolean; includeIndividualNTD?: boolean; includeIndividualTN?: boolean;
  luotHDThreshold?: number; luotHDCTThreshold?: number;
  tvv90MaxMonths?: number; tvv90MinIP?: number;
  referenceContestId?: string;
  includeTNInPassCount?: boolean; tvvContractCountMin?: number;
  topN?: number;
  topNMinIP?: number;
  topNValueType?: 'ip' | 'afyp';
  useTopRanking?: boolean;
  topRewardAmounts?: string;
  filterByEffectiveDate?: boolean;
  recruitedAgentScope?: 'all' | 'tvvm';
  recruitmentConfig?: RecruitmentContestConfig | null;
  csvContractUrl?: string; csvStaffUrl?: string; csvRecruiterUrl?: string;
  createdAt: string; updatedAt: string;
}

type ConditionType = 'per_contract_ip' | 'per_contract_afyp' | 'total_ip' | 'total_afyp' | 'activity_round' | 'activity_round_tvvm' | 'activity_round_standard' | 'activity_round_standard_tvvm' | 'activity_round_tvv90' | 'tvv_pass_count' | 'top_n_ip' | 'pass_count_contracts' | 'pass_count_ip_afyp' | 'recruitment_count';
type TargetType = 'tvv' | 'nhom' | 'nyd';
type RecruitedAgentScope = 'all' | 'tvvm';
type ContestKind = 'sales' | 'recruitment' | 'top' | 'pass_count' | 'two_phase';

const CONTEST_IMAGE_FONT_TIMEOUT_MS = 5_000;
const CONTEST_IMAGE_RENDER_TIMEOUT_MS = 15_000;
const CONTEST_IMAGE_FALLBACK_TIMEOUT_MS = 12_000;
let contestImageFontEmbedCSS = '';

const withContestImageTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, message: string) => {
  let timeoutId = 0;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const canvasToBlob = (canvas: HTMLCanvasElement) => new Promise<Blob | null>((resolve) => {
  canvas.toBlob(resolve, 'image/png', 1);
});

const CONTEST_KIND_META: Record<ContestKind, { title: string; detail: string }> = {
  sales: { title: 'Thi đua doanh số', detail: 'Chọn đối tượng, cách xét và chỉ tiêu doanh số hoặc lượt hoạt động.' },
  recruitment: { title: 'Thi đua tuyển dụng', detail: 'Chọn TTN, TB/TN hoặc cả hai; kết quả đếm TVVm tuyển mới trong kỳ.' },
  top: { title: 'Thi đua xét TOP', detail: 'Xếp hạng theo IP hoặc AFYP và thưởng theo từng vị trí TOP.' },
  pass_count: { title: 'Thi đua đếm TVV đạt', detail: 'Xét theo Nhóm và đếm số TVV đạt chương trình hoặc bộ chỉ tiêu tham chiếu.' },
  two_phase: { title: 'Thi đua 2 giai đoạn', detail: 'Dùng cùng một chỉ tiêu, tách riêng bảng thưởng giai đoạn 1 và giai đoạn 2.' },
};

function isActivityRoundMode(ct: ConditionType): boolean {
  return ct === 'activity_round' || ct === 'activity_round_tvvm' || ct === 'activity_round_standard' || ct === 'activity_round_standard_tvvm' || ct === 'activity_round_tvv90';
}

function getIndividualMetricLabel(ct: ConditionType): string {
  if (isActivityRoundMode(ct)) return `${getConditionLabel(ct)} cá nhân`;
  if (ct === 'total_afyp' || ct === 'per_contract_afyp') return 'AFYP cá nhân';
  return 'IP cá nhân';
}

function getNYDContestValue(
  ct: ConditionType,
  recruitValue: number,
  ownRevenue: number,
  ownActivityRounds: number,
  includeIndividual: boolean
): number {
  if (!includeIndividual) return recruitValue;
  return recruitValue + (isActivityRoundMode(ct) ? ownActivityRounds : ownRevenue);
}
function isTVVPassCountMode(ct: ConditionType): boolean {
  return ct === 'tvv_pass_count' || ct === 'pass_count_ip_afyp' || ct === 'pass_count_contracts';
}
function isPerContractMode(ct: ConditionType): boolean {
  return ct === 'per_contract_ip' || ct === 'per_contract_afyp';
}
function isTotalMode(ct: ConditionType): boolean {
  return ct === 'total_ip' || ct === 'total_afyp';
}
function isTVVmMode(ct: ConditionType): boolean {
  return ct === 'activity_round_tvvm' || ct === 'activity_round_standard_tvvm';
}
function isStandardMode(ct: ConditionType): boolean {
  return ct === 'activity_round_standard' || ct === 'activity_round_standard_tvvm';
}
function isTopNMode(ct: ConditionType): boolean {
  return ct === 'top_n_ip';
}
function isRecruitmentMode(ct: ConditionType): boolean { return ct === 'recruitment_count'; }

function isTVVm(startDate: string | null, maxMonths: number = 12): boolean {
  if (!startDate) return false;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return false;
  const now = new Date();
  if (start.getTime() > now.getTime()) return false;
  const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return diffMonths >= 0 && diffMonths <= maxMonths;
}

// Helper: kiểm tra chức vụ TTN (Tiền/Tổ Trưởng Nhóm) — để loại khỏi "TVV cũ"
function isTTNPosition(position: string | null | undefined): boolean {
  const pos = (position || '').toLowerCase().trim();
  if (!pos) return false;
  return pos.includes('tiền trưởng nhóm')
      || pos.includes('trưởng tổ nhóm')
      || pos === 'ttn'
      || pos.includes('ttn ')
      || pos.includes(' ttn');
}

// Helper: kiểm tra chức vụ TB/TN (Trưởng Ban / Trưởng Nhóm) — để loại khỏi "TVV cũ"
function isTBorTNPosition(position: string | null | undefined): boolean {
  const p = (position || '').toLowerCase().trim();
  if (!p) return false;
  // Loại TTN trước (trường hợp position gộp)
  if (isTTNPosition(position)) return false;
  if (p.includes('trưởng ban') || p.includes('trưởng nhóm')) return true;
  const tokens = p.split(/[\s,;/|\\-]+/).filter(Boolean);
  return tokens.includes('tb') || tokens.includes('tn');
}

// BanCa không thuộc các danh sách đối tượng thi đua.  Việc loại trừ này
// dựa trên Cấu trúc, tuyệt đối không suy ra từ bảng doanh số.
function isBancaPosition(position: string | null | undefined): boolean {
  const pos = (position || '').toLowerCase().replace(/\s+/g, '');
  return pos.includes('banca');
}

// TVV90: TVV có thời gian làm việc không quá N tháng
function isTVV90Agent(contracts: Contract[], agentCode: string, maxMonths: number = 3, _minIP?: number, structureStartDate?: string | null): boolean {
  const agentContract = contracts.find(c => c.agentCode === agentCode);
  const startDate = structureStartDate || agentContract?.ngayBatDauLamViec || agentContract?.startDate;
  if (!startDate) return false;
  return isTVVm(startDate, maxMonths);
}

// Use the same unique-TVV counting rule as saved contests, secondary checks and exports.
function calculateLuot(contracts: Contract[], luotThreshold: number, conditionType: ConditionType, tvv90MaxMonths?: number, tvv90MinIP?: number, structureStartDates?: Map<string, string | null>, periodContracts: Contract[] = contracts): number {
  return calculateContestLuot(contracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP, structureStartDates, periodContracts);
}

// CSV auto-sync removed — data is now sourced from Quản lý page only

// Chuẩn hóa Unicode NFC để so sánh tiếng Việt (NFD vs NFC, vd: "ề" vs "ề")
function norm(s: string): string { return s.normalize('NFC'); }

// Nhóm PA chỉ bị đẩy xuống cuối khi các TVV cùng có kết quả 0.
function isPAGroup(nhom?: string | null, maNhom?: string | null): boolean {
  const values = [nhom, maNhom]
    .map(value => norm(value || '').toUpperCase().trim())
    .filter(Boolean);
  return values.some(value =>
    value === 'U104101014' ||
    /(^|[\s._\/-])PA(?:$|[\s._\/-]|\d)/.test(value)
  );
}

const currencyFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat('vi-VN');
const dateFormatter = new Intl.DateTimeFormat('vi-VN');
function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}
function formatNumber(amount: number): string { return numberFormatter.format(amount); }
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date);
}
function nganToVnd(val: number): number { return val * 1_000; }
function vndToNgan(val: number): number { return val / 1_000; }
function trieuToVnd(val: number): number { return val * 1_000_000; }
function vndToTrieu(val: number): number { return val / 1_000_000; }

function formatBonus(tier: BonusTier, ipBase?: number, rounds?: number, totalIPBase?: number): string {
  if (tier.bonusType === 'gift' && tier.bonusText) return tier.bonusText;
  if (tier.bonusType === 'percent' && tier.bonusPercent > 0) {
    const calculated = ipBase ? tier.bonusPercent / 100 * ipBase : 0;
    return `${tier.bonusPercent}% IP${ipBase ? ` = ${formatCurrency(calculated)}` : ''}`;
  }
  if (tier.bonusType === 'percent_total_ip' && tier.bonusPercent > 0) {
    const base = totalIPBase ?? ipBase ?? 0;
    const calculated = tier.bonusPercent / 100 * base;
    return `${tier.bonusPercent}% Tổng IP${base ? ` = ${formatCurrency(calculated)}` : ''}`;
  }
  if (tier.bonusType === 'percent_fyc' && tier.bonusPercent > 0) {
    const fyc = ipBase ? ipBase * 0.25 : 0;
    const calculated = fyc ? tier.bonusPercent / 100 * fyc : 0;
    return `${tier.bonusPercent}% FYC${ipBase ? ` = ${formatCurrency(calculated)}` : ''}`;
  }
  if (tier.bonusType === 'money_per_round') {
    const calculated = rounds ? tier.bonusAmount * rounds : 0;
    return rounds ? `${formatCurrency(tier.bonusAmount)}/lượt × ${rounds} = ${formatCurrency(calculated)}` : `${formatCurrency(tier.bonusAmount)}/lượt`;
  }
  if (tier.bonusType === 'money_per_tvv') {
    const tvvCount = rounds || 0; // rounds param doubles as tvvCount for tvv_pass_count
    const calculated = tvvCount ? tier.bonusAmount * tvvCount : 0;
    return tvvCount ? `${formatCurrency(tier.bonusAmount)}/TVV × ${tvvCount} = ${formatCurrency(calculated)}` : `${formatCurrency(tier.bonusAmount)}/TVV`;
  }
  return formatCurrency(tier.bonusAmount);
}

function formatBonusFromContracts(
  tier: BonusTier,
  rewardContracts: ReadonlyArray<Pick<Contract, 'pdt10DT'>>,
  rounds?: number,
  totalIPContracts: ReadonlyArray<Pick<Contract, 'pdt10DT'>> = rewardContracts,
): string {
  return formatBonus(
    tier,
    sumContractIP(rewardContracts),
    rounds,
    sumContractIP(totalIPContracts),
  );
}

// Format rate label for percent-based bonus types
function formatRate(tier: BonusTier): string {
  if (tier.bonusType === 'percent') return `${tier.bonusPercent}%`;
  if (tier.bonusType === 'percent_total_ip') return `${tier.bonusPercent}%`;
  if (tier.bonusType === 'percent_fyc') return `${tier.bonusPercent}%`;
  return '';
}

// Check if any tier uses percent-based bonus
function hasPercentBonus(tiers: BonusTier[]): boolean {
  return tiers.some(t => t.bonusType === 'percent' || t.bonusType === 'percent_total_ip' || t.bonusType === 'percent_fyc');
}

function computeBonusFromTier(tier: BonusTier, ipBase: number, rounds?: number, totalIPBase = ipBase): number {
  if (tier.bonusType === 'percent') return tier.bonusPercent / 100 * ipBase;
  if (tier.bonusType === 'percent_total_ip') return tier.bonusPercent / 100 * totalIPBase;
  if (tier.bonusType === 'percent_fyc') return tier.bonusPercent / 100 * (ipBase * 0.25);
  if (tier.bonusType === 'money_per_round') return tier.bonusAmount * (rounds || 0);
  if (tier.bonusType === 'money_per_tvv') return tier.bonusAmount * (rounds || 0); // rounds doubles as tvvCount
  return tier.bonusAmount;
}

function BonusTypeIcon({ type, className }: { type: string; className?: string }) {
  if (type === 'gift') return <Gift className={className} />;
  if (type === 'percent') return <Percent className={className} />;
  if (type === 'percent_total_ip') return <Percent className={className} />;
  if (type === 'percent_fyc') return <Percent className={className} />;
  if (type === 'money_per_round') return <Layers className={className} />;
  if (type === 'money_per_tvv') return <UserCheck className={className} />;
  return <Sparkles className={className} />;
}

function getConditionLabel(ct: ConditionType): string {
  switch (ct) {
    case 'per_contract_ip': return 'IP/HĐ';
    case 'per_contract_afyp': return 'AFYP/HĐ';
    case 'total_ip': return 'Tổng IP';
    case 'total_afyp': return 'Tổng AFYP';
    case 'activity_round': return 'Lượt HĐ';
    case 'activity_round_tvvm': return 'Lượt TVVm HĐ';
    case 'activity_round_standard': return 'Lượt HĐ Chuẩn';
    case 'activity_round_standard_tvvm': return 'Lượt TVVm HĐC';
    case 'activity_round_tvv90': return 'Lượt TVV90';
    case 'tvv_pass_count': return 'TVV đạt CTĐK';
    case 'pass_count_contracts': return 'Đếm TVV đủ số HĐ';
    case 'pass_count_ip_afyp': return 'Đếm TVV đạt IP+AFYP';
    case 'top_n_ip': return 'Xét Top N IP';
    case 'recruitment_count': return 'Tuyển dụng TVVm';
  }
}

function getTargetLabel(tt: TargetType): string {
  switch (tt) {
    case 'tvv': return 'TVV';
    case 'nhom': return 'Nhóm';
    case 'nyd': return 'NTD';
  }
}

const TIER_COLORS = ['from-amber-400 to-orange-500','from-emerald-400 to-teal-500','from-sky-400 to-cyan-500','from-violet-400 to-purple-500','from-rose-400 to-pink-500','from-lime-400 to-green-500'];

const BONUS_TYPE_BUTTONS = [
  ['money', 'Tiền', Banknote, 'bg-emerald-600'],
  ['gift', 'Quà', Gift, 'bg-pink-600'],
  ['percent', '% IP', Percent, 'bg-violet-600'],
  ['percent_total_ip', '% Tổng IP', Percent, 'bg-blue-600'],
  ['percent_fyc', '% FYC', Percent, 'bg-cyan-600'],
  ['money_per_round', '/Lượt', Layers, 'bg-teal-600'],
  ['money_per_tvv', '/TVV', UserCheck, 'bg-indigo-600'],
] as const;

// ContestPoster Component - supports white & gradient variants
const ContestPoster = React.memo(function ContestPoster({ contestTitle, startDate, endDate, conditionType, targetType, sortedTiers, filteredContracts, groupedData, totalFYP, totalBonus, achievedCount, notAchievedCount, formatCurrency: fc, formatNumber: fn, formatDate: fd, isPreview = false, variant = 'gradient' }: {
  contestTitle: string; startDate: string; endDate: string; conditionType: ConditionType;
  targetType: TargetType; sortedTiers: BonusTier[]; filteredContracts: Contract[];
  groupedData: GroupData[]; totalFYP: number; totalBonus: number;
  achievedCount: number; notAchievedCount: number;
  formatCurrency: (n: number) => string; formatNumber: (n: number) => string;
  formatDate: (d: string) => string; isPreview?: boolean; variant?: 'gradient' | 'white';
}) {
  const rowCount = targetType === 'nhom' ? groupedData.length : filteredContracts.length;
  const hasData = rowCount > 0;
  const achievementPercent = hasData ? Math.round((achievedCount / rowCount) * 100) : 0;
  const tierColors = TIER_COLORS;
  const isWhite = variant === 'white';

  const conditionLabel = getConditionLabel(conditionType);
  const targetLabel = getTargetLabel(targetType);

  if (isWhite) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-[rgba(14,14,30,0.85)] backdrop-blur overflow-hidden shadow-[0_0_15px_rgba(0,255,136,0.1)]">
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg flex-shrink-0">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-wide leading-tight break-words">{contestTitle || 'CHƯƠNG TRÌNH THI ĐUA'}</h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <div className="flex items-center gap-1 text-emerald-200 text-sm"><CalendarRange className="w-4 h-4" /><span>{startDate ? fd(startDate) : '...'} — {endDate ? fd(endDate) : '...'}</span></div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"><Target className="w-3.5 h-3.5" />{conditionLabel}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {targetType === 'tvv' ? <Users className="w-3.5 h-3.5" /> : targetType === 'nyd' ? <UserPlus className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                  {' '}{targetLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-none">
            {sortedTiers.map((tier, i) => (
              <div key={tier.id} className={`flex-shrink-0 rounded-lg px-3 py-2 bg-gradient-to-br ${tierColors[i % tierColors.length]} text-white min-w-[80px] shadow-md`}>
                <div className="flex items-center gap-1 mb-0.5"><BonusTypeIcon type={tier.bonusType} className="w-3.5 h-3.5 opacity-80" /><span className="text-[10px] font-bold uppercase opacity-90">Mức {i + 1}</span></div>
                <div className="text-xs font-semibold leading-tight">{isActivityRoundMode(conditionType) ? `${tier.minFYP}${tier.maxFYP ? ` - ${tier.maxFYP}` : ' ↑'} lượt` : `${fc(tier.minFYP)}${tier.maxFYP ? ` - ${fc(tier.maxFYP)}` : ' ↑'}`}</div>
                <div className="text-sm font-extrabold mt-0.5 truncate" title={formatBonus(tier)}>{formatBonus(tier)}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 mb-2">
            <div className="bg-emerald-500/10 rounded-lg p-3 text-center border border-emerald-500/30 shadow-[0_0_10px_rgba(0,255,136,0.05)]"><div className="flex items-center justify-center gap-1 mb-1"><FileText className="w-4 h-4 text-emerald-300" /><span className="text-xs text-emerald-300 uppercase font-bold">{targetType === 'nhom' ? 'Nhóm' : targetType === 'nyd' ? 'NYD' : 'HĐ'}</span></div><p className="text-xl font-extrabold text-white">{hasData ? rowCount : '—'}</p></div>
            <div className="bg-emerald-500/10 rounded-lg p-3 text-center border border-emerald-500/30 shadow-[0_0_10px_rgba(0,255,136,0.05)]"><div className="flex items-center justify-center gap-1 mb-1"><Banknote className="w-4 h-4 text-amber-300" /><span className="text-xs text-amber-300 uppercase font-bold">Tổng IP</span></div><p className="text-base font-extrabold text-amber-200 whitespace-nowrap">{hasData ? fc(totalFYP) : '—'}</p></div>
            <div className="bg-emerald-500/10 rounded-lg p-3 text-center border border-emerald-500/30 shadow-[0_0_10px_rgba(0,255,136,0.05)]"><div className="flex items-center justify-center gap-1 mb-1"><Users className="w-4 h-4 text-sky-300" /><span className="text-xs text-sky-300 uppercase font-bold">Đạt/Chưa</span></div><p className="text-xl font-extrabold">{hasData ? <><span className="text-emerald-300">{achievedCount}</span><span className="text-white mx-0.5">/</span><span className="text-red-400">{notAchievedCount}</span></> : <span className="text-white">—</span>}</p></div>
            <div className="bg-amber-500/10 rounded-lg p-3 text-center border border-amber-500/30 shadow-[0_0_10px_rgba(255,191,0,0.05)]"><div className="flex items-center justify-center gap-1 mb-1"><Award className="w-4 h-4 text-amber-200" /><span className="text-xs text-amber-200 uppercase font-bold">Tổng Thưởng</span></div><p className="text-base font-extrabold text-white whitespace-nowrap">{hasData ? fc(totalBonus) : '—'}</p></div>
          </div>
          {hasData && (<div className="space-y-1"><div className="flex items-center justify-between text-sm"><span className="text-emerald-200 font-medium">Tỷ lệ đạt</span><span className="text-white font-bold text-base">{achievementPercent}%</span></div><div className="relative h-3 bg-emerald-500/10 rounded-full overflow-hidden"><div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-amber-400 rounded-full transition-all duration-700" style={{ width: `${achievementPercent}%` }} /><div className="absolute inset-0 flex items-center justify-center"><span className="text-[10px] font-bold text-white drop-shadow-sm">{achievedCount}/{rowCount}</span></div></div></div>)}
        </div>
      </div>
    );
  }

  // Original gradient variant
  return (
    <div className={`relative overflow-hidden rounded-2xl ${isPreview ? 'border border-emerald-500/30' : ''} shadow-[0_0_15px_rgba(0,255,136,0.1)]`}>
      <div className="absolute inset-0 bg-[rgba(14,14,30,0.85)] backdrop-blur" />
      <div className="relative z-10 p-4 sm:p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg flex-shrink-0">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-wide leading-tight break-words">{contestTitle || 'CHƯƠNG TRÌNH THI ĐUA'}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <div className="flex items-center gap-1 text-emerald-200 text-sm"><CalendarRange className="w-4 h-4" /><span>{startDate ? fd(startDate) : '...'} — {endDate ? fd(endDate) : '...'}</span></div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"><Target className="w-3.5 h-3.5" />{conditionLabel}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {targetType === 'tvv' ? <Users className="w-3.5 h-3.5" /> : targetType === 'nyd' ? <UserPlus className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                {' '}{targetLabel}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-none">
          {sortedTiers.map((tier, i) => (
            <div key={tier.id} className={`flex-shrink-0 rounded-lg px-3 py-2 bg-gradient-to-br ${tierColors[i % tierColors.length]} text-white min-w-[80px] shadow-md`}>
              <div className="flex items-center gap-1 mb-0.5"><BonusTypeIcon type={tier.bonusType} className="w-3.5 h-3.5 opacity-80" /><span className="text-[10px] font-bold uppercase opacity-90">Mức {i + 1}</span></div>
              <div className="text-xs font-semibold leading-tight">{isActivityRoundMode(conditionType) ? `${tier.minFYP}${tier.maxFYP ? ` - ${tier.maxFYP}` : ' ↑'} lượt` : `${fc(tier.minFYP)}${tier.maxFYP ? ` - ${fc(tier.maxFYP)}` : ' ↑'}`}</div>
              <div className="text-sm font-extrabold mt-0.5 truncate" title={formatBonus(tier)}>{formatBonus(tier)}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 mb-2">
          <div className="bg-emerald-500/10 rounded-lg p-3 text-center border border-emerald-500/30 shadow-[0_0_10px_rgba(0,255,136,0.05)]"><div className="flex items-center justify-center gap-1 mb-1"><FileText className="w-4 h-4 text-emerald-300" /><span className="text-xs text-emerald-300 uppercase font-bold">{targetType === 'nhom' ? 'Nhóm' : targetType === 'nyd' ? 'NYD' : 'HĐ'}</span></div><p className="text-xl font-extrabold text-white">{hasData ? rowCount : '—'}</p></div>
          <div className="bg-emerald-500/10 rounded-lg p-3 text-center border border-emerald-500/30 shadow-[0_0_10px_rgba(0,255,136,0.05)]"><div className="flex items-center justify-center gap-1 mb-1"><Banknote className="w-4 h-4 text-amber-300" /><span className="text-xs text-amber-300 uppercase font-bold">Tổng IP</span></div><p className="text-base font-extrabold text-amber-200 whitespace-nowrap">{hasData ? fc(totalFYP) : '—'}</p></div>
          <div className="bg-emerald-500/10 rounded-lg p-3 text-center border border-emerald-500/30 shadow-[0_0_10px_rgba(0,255,136,0.05)]"><div className="flex items-center justify-center gap-1 mb-1"><Users className="w-4 h-4 text-sky-300" /><span className="text-xs text-sky-300 uppercase font-bold">Đạt/Chưa</span></div><p className="text-xl font-extrabold">{hasData ? <><span className="text-emerald-300">{achievedCount}</span><span className="text-white mx-0.5">/</span><span className="text-red-400">{notAchievedCount}</span></> : <span className="text-white">—</span>}</p></div>
          <div className="bg-amber-500/10 rounded-lg p-3 text-center border border-amber-500/30 shadow-[0_0_10px_rgba(255,191,0,0.05)]"><div className="flex items-center justify-center gap-1 mb-1"><Award className="w-4 h-4 text-amber-200" /><span className="text-xs text-amber-200 uppercase font-bold">Tổng Thưởng</span></div><p className="text-base font-extrabold text-white whitespace-nowrap">{hasData ? fc(totalBonus) : '—'}</p></div>
        </div>
        {hasData && (<div className="space-y-1"><div className="flex items-center justify-between text-sm"><span className="text-emerald-200 font-medium">Tỷ lệ đạt</span><span className="text-white font-bold text-base">{achievementPercent}%</span></div><div className="relative h-3 bg-emerald-500/10 rounded-full overflow-hidden"><div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-amber-400 rounded-full transition-all duration-700" style={{ width: `${achievementPercent}%` }} /><div className="absolute inset-0 flex items-center justify-center"><span className="text-[10px] font-bold text-white drop-shadow-sm">{achievedCount}/{rowCount}</span></div></div></div>)}
        {!hasData && isPreview && (<div className="text-center py-1"><p className="text-emerald-200 text-sm italic">Nhấn &ldquo;Tính kết quả&rdquo; để xem</p></div>)}
      </div>
    </div>
  );
});

// Bonus tier editor component
// Source rows do not depend on the contest draft. Keep their large subtree out
// of input updates even when the source panel is open.
const ContestSourceRows = React.memo(function ContestSourceRows({ contracts, onDelete }: {
  contracts: Contract[];
  onDelete: (id: string) => Promise<void>;
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(contracts.length / CONTEST_SOURCE_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const startIndex = safePage * CONTEST_SOURCE_PAGE_SIZE;
  const visibleContracts = contracts.slice(startIndex, startIndex + CONTEST_SOURCE_PAGE_SIZE);

  return <TableBody>{visibleContracts.map((c, idx) => (
    <TableRow key={c.id} className="hover:bg-emerald-500/10 border-emerald-500/20"><TableCell className="text-center text-emerald-400/50 text-xs">{startIndex + idx + 1}</TableCell><TableCell className="font-mono text-[10px] text-emerald-400 whitespace-nowrap">{c.maNhom}</TableCell><TableCell className="font-mono text-[10px] text-emerald-300/60 whitespace-nowrap">{c.agentCode}</TableCell><TableCell className="text-xs text-emerald-200 whitespace-nowrap">{c.agentName}</TableCell><TableCell className="text-[10px] text-emerald-300/70 whitespace-nowrap">{formatDate(c.effectiveDate)}</TableCell><TableCell className="font-semibold text-emerald-400 text-xs whitespace-nowrap">{formatNumber(c.pdt10DT)}</TableCell><TableCell><Button variant="ghost" size="sm" onClick={() => onDelete(c.id)} className="h-5 w-5 p-0 text-red-400 hover:text-red-300"><Trash2 className="w-3 h-3" /></Button></TableCell></TableRow>
  ))}
  {pageCount > 1 && (
    <TableRow className="border-emerald-500/20 bg-gray-950/70 hover:bg-gray-950/70">
      <TableCell colSpan={7} className="py-2">
        <div className="flex items-center justify-center gap-2 text-[10px] text-emerald-200/70">
          <Button type="button" variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage(current => Math.max(0, current - 1))} className="h-6 border-emerald-500/30 bg-transparent px-2 text-[10px]">Trước</Button>
          <span>Hiển thị {startIndex + 1}–{Math.min(startIndex + CONTEST_SOURCE_PAGE_SIZE, contracts.length)} / {contracts.length}</span>
          <Button type="button" variant="outline" size="sm" disabled={safePage >= pageCount - 1} onClick={() => setPage(current => Math.min(pageCount - 1, current + 1))} className="h-6 border-emerald-500/30 bg-transparent px-2 text-[10px]">Sau</Button>
        </div>
      </TableCell>
    </TableRow>
  )}
  </TableBody>;
});

function getBonusMetricLabel(conditionType: ConditionType): string {
  if (isActivityRoundMode(conditionType)) return 'Lượt';
  if (isTVVPassCountMode(conditionType) || isRecruitmentMode(conditionType)) return 'TVV';
  if (isTopNMode(conditionType)) return 'Hạng';
  if (conditionType === 'per_contract_afyp' || conditionType === 'total_afyp') return 'AFYP';
  return 'IP';
}

function getBonusRewardLabel(type: BonusType): string {
  if (type === 'money') return 'Thưởng (nđ)';
  if (type === 'gift') return 'Quà tặng';
  if (type === 'percent') return '% IP';
  if (type === 'percent_total_ip') return '% Tổng IP';
  if (type === 'percent_fyc') return '% FYC';
  if (type === 'money_per_round') return '/Lượt (nđ)';
  return '/TVV (nđ)';
}

function BonusRewardInput({ tier, rewardType, label, onUpdate }: {
  tier: BonusTier;
  rewardType: BonusType;
  label: string;
  onUpdate: (field: keyof BonusTier, value: string | number | null) => void;
}) {
  const inputClassName = 'h-9 min-w-0 px-2 border-emerald-500/30 bg-gray-900 text-xs text-white';
  if (rewardType === 'money' || rewardType === 'money_per_round' || rewardType === 'money_per_tvv') {
    return <Input aria-label={label} type="number" inputMode="decimal" placeholder="0" value={vndToNgan(tier.bonusAmount) || ''} onChange={(event) => onUpdate('bonusAmount', event.target.value === '' ? 0 : nganToVnd(parseFloat(event.target.value) || 0))} className={inputClassName} />;
  }
  if (rewardType === 'percent' || rewardType === 'percent_total_ip' || rewardType === 'percent_fyc') {
    return <Input aria-label={label} type="number" inputMode="decimal" placeholder="0" value={tier.bonusPercent || ''} onChange={(event) => onUpdate('bonusPercent', event.target.value === '' ? 0 : parseFloat(event.target.value) || 0)} className={inputClassName} />;
  }
  return <Input aria-label={label} type="text" placeholder="Nhập quà tặng" value={tier.bonusText} onChange={(event) => onUpdate('bonusText', event.target.value)} className={inputClassName} />;
}

function BonusRewardCell({ tier, label, accent, onUpdate }: {
  tier: BonusTier;
  label: string;
  accent: 'emerald' | 'sky';
  onUpdate: (field: keyof BonusTier, value: string | number | null) => void;
}) {
  const borderClass = accent === 'sky' ? 'border-sky-500/30 focus:border-sky-400' : 'border-emerald-500/30 focus:border-emerald-400';
  return (
    <div className="grid min-w-0 gap-1">
      <select
        aria-label={`Hình thức ${label}`}
        value={tier.bonusType}
        onChange={(event) => onUpdate('bonusType', event.target.value as BonusType)}
        style={{ colorScheme: 'dark' }}
        className={`h-7 min-w-0 w-full rounded-md border bg-gray-950 px-1 text-[10px] font-semibold text-white outline-none ${borderClass}`}
      >
        {BONUS_TYPE_BUTTONS.map(([type, optionLabel]) => <option key={type} value={type} className="bg-slate-950 text-white">{optionLabel}</option>)}
      </select>
      <BonusRewardInput tier={tier} rewardType={tier.bonusType} label={`${getBonusRewardLabel(tier.bonusType)} ${label}`} onUpdate={onUpdate} />
    </div>
  );
}

const BonusTierEditor = React.memo(function BonusTierEditor({ tiers, conditionType, onUpdate, onAdd, onRemove }: {
  tiers: BonusTier[];
  conditionType: ConditionType;
  onUpdate: (id: string, field: keyof BonusTier, value: string | number | null) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const metricLabel = getBonusMetricLabel(conditionType);
  const isCountMetric = isActivityRoundMode(conditionType) || isTVVPassCountMode(conditionType) || isRecruitmentMode(conditionType) || isTopNMode(conditionType);
  const metricHeaderLabel = isCountMetric ? metricLabel : `${metricLabel} (trđ)`;
  const gridClassName = 'grid w-full grid-cols-[28px_minmax(48px,0.85fr)_minmax(48px,0.85fr)_minmax(105px,1.5fr)_28px] items-center gap-1 sm:min-w-[620px] sm:grid-cols-[42px_minmax(92px,1fr)_minmax(92px,1fr)_minmax(176px,1.5fr)_36px] sm:gap-2';

  return (
    <div className="space-y-3">
      <div className="overflow-x-hidden pb-1 sm:overflow-x-auto">
        <div className="w-full space-y-2 sm:min-w-[620px]">
          <div className={gridClassName}>
            <span className="text-center text-[10px] font-bold uppercase text-amber-300">STT</span>
            <span className="col-span-2 text-center text-[10px] font-bold uppercase text-amber-300">Chỉ tiêu · {metricHeaderLabel}</span>
            <span className="text-center text-[10px] font-bold uppercase text-amber-300">Hình thức · Thưởng</span>
            <Button type="button" variant="ghost" size="sm" onClick={onAdd} className="h-8 w-8 p-0 text-amber-300 hover:text-amber-200" aria-label="Thêm mức thưởng" title="Thêm mức thưởng"><Plus className="h-4 w-4" /></Button>
          </div>
        {tiers.map((tier, index) => (
          <div key={tier.id} className={gridClassName}>
            <span className="text-center text-xs font-semibold text-emerald-200/80">{index + 1}</span>
            <Input aria-label={`${metricLabel} từ mức ${index + 1}`} type="number" inputMode="decimal" placeholder="Từ" value={isCountMetric ? (tier.minFYP || '') : (vndToTrieu(tier.minFYP) || '')} onChange={(event) => onUpdate(tier.id, 'minFYP', event.target.value === '' ? 0 : isCountMetric ? parseInt(event.target.value) || 0 : trieuToVnd(parseFloat(event.target.value) || 0))} className="h-9 min-w-0 px-2 border-emerald-500/30 bg-gray-900 text-xs text-white" />
            <Input aria-label={`${metricLabel} đến mức ${index + 1}`} type="number" inputMode="decimal" placeholder="Đến ∞" value={tier.maxFYP ? (isCountMetric ? tier.maxFYP : vndToTrieu(tier.maxFYP)) : ''} onChange={(event) => onUpdate(tier.id, 'maxFYP', event.target.value === '' ? null : isCountMetric ? parseInt(event.target.value) || null : trieuToVnd(parseFloat(event.target.value) || 0))} className="h-9 min-w-0 px-2 border-emerald-500/30 bg-gray-900 text-xs text-white" />
            <BonusRewardCell tier={tier} label={`mức ${index + 1}`} accent="emerald" onUpdate={(field, value) => onUpdate(tier.id, field, value)} />
            <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(tier.id)} className="h-8 w-8 p-0 text-red-400 hover:text-red-300" aria-label={`Xóa mức ${index + 1}`}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
});

const DualPhaseBonusTierEditor = React.memo(function DualPhaseBonusTierEditor({
  phase1Tiers,
  phase2Tiers,
  conditionType,
  onAdd,
  onRemove,
  onMilestoneUpdate,
  onPhase1Update,
  onPhase2Update,
}: {
  phase1Tiers: BonusTier[];
  phase2Tiers: BonusTier[];
  conditionType: ConditionType;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onMilestoneUpdate: (index: number, field: 'minFYP' | 'maxFYP', value: number | null) => void;
  onPhase1Update: (id: string, field: keyof BonusTier, value: string | number | null) => void;
  onPhase2Update: (id: string, field: keyof BonusTier, value: string | number | null) => void;
}) {
  const metricLabel = getBonusMetricLabel(conditionType);
  const isCountMetric = isActivityRoundMode(conditionType) || isTVVPassCountMode(conditionType) || isRecruitmentMode(conditionType) || isTopNMode(conditionType);
  const metricHeaderLabel = isCountMetric ? metricLabel : `${metricLabel} (trđ)`;
  const rowCount = Math.max(phase1Tiers.length, phase2Tiers.length);
  const gridClassName = 'grid w-full grid-cols-[24px_minmax(42px,0.7fr)_minmax(42px,0.7fr)_minmax(94px,1.4fr)_minmax(94px,1.4fr)_24px] items-center gap-1 sm:min-w-[820px] sm:grid-cols-[42px_minmax(92px,1fr)_minmax(92px,1fr)_minmax(190px,1.4fr)_minmax(190px,1.4fr)_36px] sm:gap-2';

  return (
    <div className="space-y-3">
      <div className="overflow-x-hidden pb-1 sm:overflow-x-auto">
        <div className="w-full space-y-2 sm:min-w-[820px]">
          <div className={gridClassName}>
            <span className="text-center text-[10px] font-bold uppercase text-sky-300">STT</span>
            <span className="col-span-2 text-center text-[10px] font-bold uppercase text-sky-300">Chỉ tiêu · {metricHeaderLabel}</span>
            <span className="text-center text-[10px] font-bold uppercase text-sky-300">Thưởng GĐ1</span>
            <span className="text-center text-[10px] font-bold uppercase text-sky-300">Thưởng GĐ2</span>
            <Button type="button" variant="ghost" size="sm" onClick={onAdd} className="h-8 w-8 p-0 text-sky-300 hover:text-sky-200" aria-label="Thêm mức thưởng" title="Thêm mức thưởng"><Plus className="h-4 w-4" /></Button>
          </div>
        {Array.from({ length: rowCount }, (_, index) => {
          const phase1 = phase1Tiers[index];
          const phase2 = phase2Tiers[index];
          if (!phase1 || !phase2) return null;
          return (
            <div key={`${phase1.id}-${phase2.id}`} className={gridClassName}>
              <span className="text-center text-xs font-semibold text-sky-200/80">{index + 1}</span>
              <Input aria-label={`${metricLabel} từ mức ${index + 1}`} type="number" inputMode="decimal" placeholder="Từ" value={isCountMetric ? (phase1.minFYP || '') : (vndToTrieu(phase1.minFYP) || '')} onChange={(event) => onMilestoneUpdate(index, 'minFYP', event.target.value === '' ? 0 : isCountMetric ? parseInt(event.target.value) || 0 : trieuToVnd(parseFloat(event.target.value) || 0))} className="h-9 min-w-0 px-1.5 border-sky-500/30 bg-gray-900 text-xs text-white" />
              <Input aria-label={`${metricLabel} đến mức ${index + 1}`} type="number" inputMode="decimal" placeholder="Đến ∞" value={phase1.maxFYP ? (isCountMetric ? phase1.maxFYP : vndToTrieu(phase1.maxFYP)) : ''} onChange={(event) => onMilestoneUpdate(index, 'maxFYP', event.target.value === '' ? null : isCountMetric ? parseInt(event.target.value) || null : trieuToVnd(parseFloat(event.target.value) || 0))} className="h-9 min-w-0 px-1.5 border-sky-500/30 bg-gray-900 text-xs text-white" />
              <BonusRewardCell tier={phase1} label={`GĐ1 mức ${index + 1}`} accent="sky" onUpdate={(field, value) => onPhase1Update(phase1.id, field, value)} />
              <BonusRewardCell tier={phase2} label={`GĐ2 mức ${index + 1}`} accent="sky" onUpdate={(field, value) => onPhase2Update(phase2.id, field, value)} />
              <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)} className="h-8 w-8 p-0 text-red-400 hover:text-red-300" aria-label={`Xóa mức ${index + 1}`}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
});

function ThiDuaPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ===== EMBED MODE: khi được nhúng trong iframe (từ trang Quản lý) =====
  //   ?embed=1          → ẩn header + form, chỉ hiện bảng kết quả
  //   ?contest=<id>     → tự động load contest theo id
  //   ?autocalc=1       → tự động tính kết quả sau khi load
  const isEmbedMode = searchParams.get('embed') === '1';
  const embedContestId = searchParams.get('contest');
  const isAutocalc = searchParams.get('autocalc') === '1';
  const showEmbedActions = searchParams.get('actions') === '1';
  // Data sourced from Quản lý page — no CSV sync

  const [startDate, setStartDate] = useState(''); // Ngày hiệu lực từ
  const [endDate, setEndDate] = useState('');     // Ngày hiệu lực đến
  const [issueStartDate, setIssueStartDate] = useState(''); // Ngày phát hành từ
  const [issueEndDate, setIssueEndDate] = useState('');     // Ngày phát hành đến
  const [contestTitle, setContestTitle] = useState('CHƯƠNG TRÌNH THI ĐUA');
  const [conditionType, setConditionType] = useState<ConditionType>('per_contract_ip');
  const [targetType, setTargetType] = useState<TargetType>('tvv');
  const [bonusTiers, setBonusTiers] = useState<BonusTier[]>(() => createDefaultBonusTiers());
  // Phase 2
  const [usePhase2, setUsePhase2] = useState(false);
  const [phase2StartDate, setPhase2StartDate] = useState('');
  const [phase2EndDate, setPhase2EndDate] = useState('');
  const [bonusTiers2, setBonusTiers2] = useState<BonusTier[]>([]);
  // Secondary Condition
  const [useSecondaryCondition, setUseSecondaryCondition] = useState(false);
  const [secondaryAFYPMin, setSecondaryAFYPMin] = useState(0);
  const [secondaryIPMin, setSecondaryIPMin] = useState(0);
  const [secondaryLuotHDMin, setSecondaryLuotHDMin] = useState(0);
  const [secondaryLuotHDCMin, setSecondaryLuotHDCMin] = useState(0);
  const [secondaryLuotHDFilter, setSecondaryLuotHDFilter] = useState<'all' | 'tvvm'>('all');
  const [secondaryLuotHDCFilter, setSecondaryLuotHDCFilter] = useState<'all' | 'tvvm'>('all');
  const [secondaryTotalAFYPMin, setSecondaryTotalAFYPMin] = useState(0);
  const [secondaryTotalIPMin, setSecondaryTotalIPMin] = useState(0);
  const [secondaryContractCountMin, setSecondaryContractCountMin] = useState(0);
  const [secondaryContractIPMin, setSecondaryContractIPMin] = useState(0);
  // Options
  const [hideNotAchieved, setHideNotAchieved] = useState(false);
  const [includeIndividualNTD, setIncludeIndividualNTD] = useState(false);
  const [includeIndividualTN, setIncludeIndividualTN] = useState(false);
  // Configurable thresholds
  const [luotHDThreshold, setLuotHDThreshold] = useState(3_000_000);
  const [luotHDCTThreshold, setLuotHDCTThreshold] = useState(12_000_000);
  const [tvv90MaxMonths, setTvv90MaxMonths] = useState(3);
  const [tvv90MinIP, setTvv90MinIP] = useState(12_000_000);
  // Reference contest for tvv_pass_count mode
  const [referenceContestId, setReferenceContestId] = useState<string>('');
  const [includeTNInPassCount, setIncludeTNInPassCount] = useState(false);
  // pass_count_ip_afyp mode: đếm TVV đạt Tổng IP >= X + Tổng AFYP >= Y
  // Reuse secondaryIPMin (IP min) + secondaryAFYPMin (AFYP min) để lưu vào DB
  const [tvvContractCountMin, setTVVContractCountMin] = useState(2);
  const [passCountIPMin, setPassCountIPMin] = useState(6000000);    // 6 triệu
  const [passCountAFYPMin, setPassCountAFYPMin] = useState(12000000); // 12 triệu
  // Top N mode config (top_n_ip)
  const [topN, setTopN] = useState(3);
  const [topNMinIP, setTopNMinIP] = useState(50_000_000);
  // Top N value type: 'ip' (default) hoặc 'afyp' — cho phép user chọn chỉ tiêu xét Top N
  const [topNValueType, setTopNValueType] = useState<'ip' | 'afyp'>('ip');
  // ${MARKER}: TOP bổ sung chạy song song với điều kiện chính; tiền TOP chỉ ghi ở Ghi chú.
  const [useTopRanking, setUseTopRanking] = useState(false);
  const [topRewardAmounts, setTopRewardAmounts] = useState<number[]>([1_000_000, 500_000, 300_000]);
  const [topEligibilityType, setTopEligibilityType] = useState<'none' | 'per_contract_ip' | 'per_contract_afyp' | 'total_ip' | 'total_afyp'>('none');
  const [topEligibilityMin, setTopEligibilityMin] = useState(0);
  // Filter by effective date — khi true: chỉ tính TVV có ngày LV (DS TVV) bằng hoặc sau ngày hiệu lực chức vụ gần nhất của NTD recruiter
  const [filterByEffectiveDate, setFilterByEffectiveDate] = useState(false);
  // Với hình thức NTD: chọn rõ tổng/lượt lấy từ toàn bộ TVV hay chỉ TVVm do từng NTD tuyển.
  const [recruitedAgentScope, setRecruitedAgentScope] = useState<RecruitedAgentScope>('all');
  const [recruitmentConfig, setRecruitmentConfig] = useState<RecruitmentContestConfig>({
    subjectScope: 'both',
    filterByEffectiveDate: false,
    activityEnabled: false,
    activityMetric: 'total_ip',
    activityComparator: 'gte',
    activityThreshold: 0,
    activityBonusAmount: 0,
  });

  const [posterUrl, setPosterUrl] = useState<string>('');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoadedCount, setDataLoadedCount] = useState<number>(0);
  const [dataLoadedVisible, setDataLoadedVisible] = useState<boolean>(false);
  const [savedContests, setSavedContests] = useState<SavedContest[]>([]);
  const [selectedContestId, setSelectedContestId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [contestListOpen, setContestListOpen] = useState(false);
  const [contestArchiveOpen, setContestArchiveOpen] = useState(false);
  const [contestArchiveLoaded, setContestArchiveLoaded] = useState(false);
  const [contestArchiveLoading, setContestArchiveLoading] = useState(false);
  const [selectedArchiveYear, setSelectedArchiveYear] = useState<number | null>(null);
  const [expandedArchiveMonth, setExpandedArchiveMonth] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showSourceData, setShowSourceData] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [isResultExpanded, setIsResultExpanded] = useState(false);
  const [resultPage, setResultPage] = useState(0);
  const [thiDuaSubjects, setThiDuaSubjects] = useState<string>('');
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  // Bộ đối tượng chính là chọn đơn (1 trong 9).  Mã ở mục “Khác” vẫn có
  // thể cộng thêm vào bộ đang chọn.
  const [selectedSubjectTypes, setSelectedSubjectTypes] = useState<Set<string>>(new Set());
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [recruiterList, setRecruiterList] = useState<RecruiterMember[]>([]);
  // NGUỒN ĐÚNG cho DS đối tượng thi đua (theo yêu cầu user):
  //   - TN  ← leaders (DS TB/TN mục Cấu trúc)
  //   - TTN ← recruiterList (DS TTN mục Cấu trúc)
  //   - TVV/TVVm ← tvvStructList (DS TVV mục Cấu trúc, lọc TVVm theo ngayBatDau ≤ 12 tháng)
  const [tvvStructList, setTvvStructList] = useState<TVVStructItem[]>([]);
  const [leadersList, setLeadersList] = useState<any[]>([]);
  // Structure data cho Phòng subject selection (TVV → BanNhom → AD → Phòng)
  const [phongStructList, setPhongStructList] = useState<any[]>([]);
  const [adStructList, setAdStructList] = useState<any[]>([]);
  const [banNhomStructList, setBanNhomStructList] = useState<any[]>([]);
  // revenueData removed — all data now sourced from Contracts table only
  const printRef = useRef<HTMLDivElement>(null);
  const resultContentRef = useRef<HTMLDivElement>(null);

  const [registeredProgram, setRegisteredProgram] = useState<RegisteredProgram | null>(null);
  const registeredConfig = useMemo(() => parseContestConfig({ startDate, endDate, issueDate: issueStartDate, issueEndDate }), [startDate, endDate, issueStartDate, issueEndDate]);


  const contestKind = useMemo<ContestKind>(() => {
    if (usePhase2) return 'two_phase';
    if (isRecruitmentMode(conditionType)) return 'recruitment';
    if (isTopNMode(conditionType)) return 'top';
    if (isTVVPassCountMode(conditionType)) return 'pass_count';
    return 'sales';
  }, [conditionType, usePhase2]);

  const contestKindMeta = CONTEST_KIND_META[contestKind];

  const visibleSubjectKeys = useMemo(() => {
    if (contestKind === 'recruitment') return new Set(['ttn', 'leader', 'ntd']);
    if (contestKind === 'pass_count' || targetType === 'nhom') return new Set(['nhom']);
    if (targetType === 'nyd') return new Set(['ttn', 'leader', 'ntd']);
    return new Set(['allTvv', 'tvvm', 'tvvCu']);
  }, [contestKind, targetType]);

  const chooseContestKind = useCallback((kind: ContestKind) => {
    setShowConfig(true);
    setRegisteredProgram(null);
    if (kind !== contestKind) {
      setSelectedSubjectTypes(new Set());
      setThiDuaSubjects('');
    }
    if (kind === 'two_phase') {
      setUsePhase2(true);
      if (isRecruitmentMode(conditionType) || isTopNMode(conditionType) || isTVVPassCountMode(conditionType)) setConditionType('total_ip');
      setBonusTiers2(current => current.length > 0 ? current : bonusTiers.map(tier => ({ ...tier, id: crypto.randomUUID() })));
      return;
    }

    setUsePhase2(false);
    if (kind === 'recruitment') {
      setConditionType('recruitment_count');
      setTargetType('nyd');
      setRecruitmentConfig(current => ({ ...current, subjectScope: 'both' }));
    } else if (kind === 'top') {
      setConditionType('top_n_ip');
      setTargetType('tvv');
    } else if (kind === 'pass_count') {
      setConditionType('tvv_pass_count');
      setTargetType('nhom');
    } else if (isRecruitmentMode(conditionType) || isTopNMode(conditionType) || isTVVPassCountMode(conditionType)) {
      setConditionType('total_ip');
    }
  }, [bonusTiers, conditionType, contestKind]);

  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Poster Ä‘Æ°á»£c lÆ°u cÃ¹ng chÆ°Æ¡ng trÃ¬nh, nhÆ°ng nÃ©n ngay táº¡i trÃ¬nh duyá»‡t
    // (cáº¡nh dÃ i tá»‘i Ä‘a 1280px, JPEG 72%) Ä‘á»ƒ card váº«n cÃ³ áº£nh mÃ  app khÃ´ng náº·ng.
    try {
      const sourceUrl = URL.createObjectURL(file);
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Không đọc được ảnh poster'));
        img.src = sourceUrl;
      });
      const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
      const scale = longestSide > 1280 ? 1280 / longestSide : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(sourceUrl);
      setPosterUrl(canvas.toDataURL('image/jpeg', 0.72));
    } catch (error) {
      toast({ title: 'Lỗi ảnh poster', description: error instanceof Error ? error.message : 'Không thể xử lý ảnh', variant: 'destructive' });
    }
  };

  // Helper: fetch với cache-bust — đảm bảo luôn lấy data mới từ server
  // Trước đây fetch không có cache: 'no-store' → browser cache API response → data cũ
  const fetchFresh = useCallback(async (url: string) => {
    const sep = url.includes('?') ? '&' : '?';
    const bustUrl = `${url}${sep}_t=${Date.now()}`;
    return fetch(bustUrl, { cache: 'no-store', headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' } });
  }, []);

  const fetchContracts = useCallback(async () => {
    setIsLoading(true);
    try { const res = await fetchFresh('/api/contracts'); if (res.ok) { const data = await res.json(); setContracts(data); } }
    catch { /* silent - status shown by green check / spinner */ }
    finally { setIsLoading(false); }
  }, [fetchFresh]);

  const fetchSavedContests = useCallback(async () => {
    // Danh sách chỉ lấy cấu hình tóm tắt, không kéo dữ liệu ảnh poster nặng.
    // Chi tiết/poster của chương trình được tải riêng khi người dùng mở chương trình đó.
    try {
      const res = await fetchFresh('/api/contests?summary=1&scope=active');
      if (res.ok) {
        const data = await res.json();
        setSavedContests(previous => [
          ...data,
          ...previous.filter(contest => isChotContestTitle(contest.title)),
        ]);
      }
    } catch { /* silent */ }
  }, [fetchFresh]);

  const fetchArchivedContests = useCallback(async () => {
    if (contestArchiveLoading) return;
    setContestArchiveLoading(true);
    try {
      const res = await fetchFresh('/api/contests?summary=1&scope=archive');
      if (!res.ok) throw new Error('Không thể tải kho CHỐT');
      const archived: SavedContest[] = await res.json();
      setSavedContests(previous => {
        const active = previous.filter(contest => !isChotContestTitle(contest.title));
        return [...active, ...archived];
      });
      setContestArchiveLoaded(true);
    } catch (error) {
      toast({
        title: 'Không thể mở kho CHỐT',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại',
        variant: 'destructive',
      });
    } finally {
      setContestArchiveLoading(false);
    }
  }, [contestArchiveLoading, fetchFresh]);

  const deleteSourceContract = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/contracts?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Thành công', description: 'Đã xóa' });
        fetchContracts();
        setFilteredContracts(prev => prev.filter(fc => fc.id !== id));
      }
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể xóa', variant: 'destructive' });
    }
  }, [fetchContracts]);

  // Fetch staff list for group membership reference
  const fetchStaff = useCallback(async () => {
    try { const res = await fetchFresh('/api/staff'); if (res.ok) { const data = await res.json(); setStaffList(data); } } catch { /* silent */ }
  }, [fetchFresh]);

  // Fetch recruiter list for NYD reference
  const fetchRecruiters = useCallback(async () => {
    try { const res = await fetchFresh('/api/recruiters'); if (res.ok) { const data = await res.json(); setRecruiterList(data); } } catch { /* silent */ }
  }, [fetchFresh]);

  // Fetch DS TVV từ Cấu trúc — nguồn ĐÚNG cho DS đối tượng TVV/TVVm
  const fetchTvvStruct = useCallback(async () => {
    try { const res = await fetchFresh('/api/structure/tvv'); if (res.ok) { const data = await res.json(); setTvvStructList(data); } } catch { /* silent */ }
  }, [fetchFresh]);

  // Fetch DS TB/TN (Leaders) từ Cấu trúc — nguồn ĐÚNG cho DS đối tượng TN
  const fetchLeaders = useCallback(async () => {
    try { const res = await fetchFresh('/api/leaders'); if (res.ok) { const data = await res.json(); setLeadersList(data); } } catch { /* silent */ }
  }, [fetchFresh]);

  // ===== AppDataContext: đọc dữ liệu đã preload khi app mở =====
  const { data: appData, dataVersion, reload: reloadAppData } = useAppData();
  const registeredContracts = useMemo(() => [...contracts, ...(appData.carryoverContracts || [])], [contracts, appData.carryoverContracts]);
  const registeredResultProps = registeredProgram ? { program: registeredProgram, contracts: registeredContracts, config: registeredConfig, title: contestTitle, structure: tvvStructList, leaders: leadersList } : null;

  // Sync từ context → local state. Chỉ chạy khi dataVersion đổi (tức là context vừa load xong).
  // QUAN TRỌNG: tvvStructList + leadersList cũng sync từ context → tự động cập nhật khi
  // user sửa DS TVV / DS TB/TN ở trang Quản lý (Cấu trúc) → reload context → dataVersion bump.
  useEffect(() => {
    if (appData.contracts && appData.contracts.length > 0) setContracts(appData.contracts);
    if (appData.contests) {
      setSavedContests(previous => [
        ...appData.contests,
        ...previous.filter(contest => isChotContestTitle(contest.title)),
      ]);
    }
    if (appData.staff) setStaffList(appData.staff);
    if (appData.recruiters) setRecruiterList(appData.recruiters);
    if (appData.structureTvv) setTvvStructList(appData.structureTvv);
    if (appData.leaders) setLeadersList(appData.leaders);
    if (appData.structurePhong) setPhongStructList(appData.structurePhong);
    if (appData.structureAd) setAdStructList(appData.structureAd);
    if (appData.structureBanNhom) setBanNhomStructList(appData.structureBanNhom);
  }, [appData.contracts, appData.contests, appData.staff, appData.recruiters, appData.structureTvv, appData.leaders, appData.structurePhong, appData.structureAd, appData.structureBanNhom, dataVersion]);

  // fetchRevenue removed — all data now sourced from Contracts table only

  // Data is loaded directly from DB (populated by Quản lý page) — no CSV sync needed
  // Refresh all data from DB — dùng fetchFresh để tránh browser cache
  const handleRefreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchContracts(), fetchStaff(), fetchRecruiters(), fetchTvvStruct(), fetchLeaders()]);
      // Show success indicator
      const contractRes = await fetchFresh('/api/contracts');
      if (contractRes.ok) {
        const contractData = await contractRes.json();
        setDataLoadedCount(contractData.length || contracts.length);
      } else {
        setDataLoadedCount(contracts.length);
      }
      setDataLoadedVisible(true);
      setTimeout(() => setDataLoadedVisible(false), 3000);
    } finally {
      setIsLoading(false);
    }
  }, [fetchContracts, fetchStaff, fetchRecruiters, fetchTvvStruct, fetchLeaders, fetchFresh, contracts.length]);

  const handleSearch = useCallback(() => {
    if (!startDate && !endDate && !issueStartDate && !issueEndDate) { setFilteredContracts([]); toast({ title: 'Thông báo', description: 'Vui lòng nhập ít nhất một khoảng thời gian' }); return; }
    const results = filterContractsByContest([...contracts, ...(appData.carryoverContracts || [])], parseContestConfig({
      startDate, endDate, issueDate: issueStartDate, issueEndDate, usePhase2, phase2StartDate, phase2EndDate,
      conditionType, useSecondaryCondition,
      secondaryAFYPMin: (conditionType === 'pass_count_ip_afyp' || conditionType === 'pass_count_contracts') ? passCountAFYPMin : secondaryAFYPMin,
      secondaryIPMin: (conditionType === 'pass_count_ip_afyp' || conditionType === 'pass_count_contracts') ? passCountIPMin : secondaryIPMin,
    }));
    setFilteredContracts(results);
    return results;
  }, [startDate, endDate, issueStartDate, issueEndDate, contracts, appData.carryoverContracts, useSecondaryCondition, secondaryAFYPMin, secondaryIPMin, usePhase2, phase2StartDate, phase2EndDate, conditionType, passCountAFYPMin, passCountIPMin]);

  const handleSearchRef = useRef(handleSearch);
  handleSearchRef.current = handleSearch;

  // Bonus calculation helpers - takes tiers as parameter for Phase2 support
  const calculateBonusWithTiers = useCallback((fyp: number, tiers: BonusTier[]): { tier: BonusTier | null; tierIndex: number } => {
    const sortedTiers = [...tiers].sort((a, b) => a.minFYP - b.minFYP);
    for (let i = sortedTiers.length - 1; i >= 0; i--) { const tier = sortedTiers[i]; if (matchesBonusTier(fyp, tier)) return { tier, tierIndex: i }; }
    return { tier: null, tierIndex: -1 };
  }, []);

  const calculateBonus = useCallback((fyp: number): { tier: BonusTier | null; tierIndex: number } => {
    return calculateBonusWithTiers(fyp, bonusTiers);
  }, [calculateBonusWithTiers, bonusTiers]);

  const getRemainingToNextTier = useCallback((fyp: number): number | null => {
    const sortedTiers = [...bonusTiers].sort((a, b) => a.minFYP - b.minFYP);
    for (const tier of sortedTiers) { if (tier.minFYP > fyp) return tier.minFYP - fyp; }
    return null;
  }, [bonusTiers]);

  const calculateActivityRoundBonus = useCallback((activityRounds: number): { tier: BonusTier | null; tierIndex: number } => {
    const sortedTiers = [...bonusTiers].sort((a, b) => a.minFYP - b.minFYP);
    for (let i = sortedTiers.length - 1; i >= 0; i--) { const tier = sortedTiers[i]; if (matchesBonusTier(activityRounds, tier)) return { tier, tierIndex: i }; }
    return { tier: null, tierIndex: -1 };
  }, [bonusTiers]);

  const calculateActivityRoundBonusWithTiers = useCallback((activityRounds: number, tiers: BonusTier[]): { tier: BonusTier | null; tierIndex: number } => {
    const sortedTiers = [...tiers].sort((a, b) => a.minFYP - b.minFYP);
    for (let i = sortedTiers.length - 1; i >= 0; i--) { const tier = sortedTiers[i]; if (matchesBonusTier(activityRounds, tier)) return { tier, tierIndex: i }; }
    return { tier: null, tierIndex: -1 };
  }, []);

  const getActivityRoundBonusAmount = useCallback((activityRounds: number, groupTotalFYP?: number): number => {
    const { tier } = calculateActivityRoundBonus(activityRounds); if (!tier) return 0;
    return computeBonusFromTier(tier, groupTotalFYP || 0, activityRounds);
  }, [calculateActivityRoundBonus]);

  const getRemainingToNextActivityRoundTier = useCallback((activityRounds: number): number | null => {
    const sortedTiers = [...bonusTiers].sort((a, b) => a.minFYP - b.minFYP);
    for (const tier of sortedTiers) { if (tier.minFYP > activityRounds) return tier.minFYP - activityRounds; }
    return null;
  }, [bonusTiers]);

  // Chỉ mục thâm niên chuẩn: mọi chế độ TVVm/TVV90 dùng ngày bắt đầu trong Cấu trúc.
  const structureStartDateByCode = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const member of tvvStructList) {
      const key = member.agentCode?.trim().toUpperCase();
      if (key && !map.has(key)) map.set(key, member.ngayBatDau || null);
    }
    return map;
  }, [tvvStructList]);

  const calculateLuotWithStructure = useCallback(
    (rows: Contract[], threshold: number, type: ConditionType, maxMonths?: number, minIP?: number, periodRows: Contract[] = rows) =>
      calculateLuot(rows, threshold, type, maxMonths, minIP, structureStartDateByCode, periodRows),
    [structureStartDateByCode],
  );

  // Subject filter - loại bỏ trùng lặp
  const subjectCodes = useMemo(() => {
    const raw = thiDuaSubjects.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    return [...new Set(raw)];
  }, [thiDuaSubjects]);

  // ===== 4 danh sách đối tượng dùng cho nút chọn nhanh =====
  // NGUỒN (theo yêu cầu user — lấy từ mục Cấu trúc của trang Quản lý):
  //   - TVVm:   DS TVV (Cấu trúc) có ngayBatDau ≤ 12 tháng, KHÔNG phải TB/TN/TTN
  //   - TVV cũ: DS TVV (Cấu trúc) KHÔNG phải TVVm VÀ KHÔNG phải TB/TN/TTN
  //   - TTN:    DS TTN (Cấu trúc) — recruiterList (/api/recruiters)
  //   - TN:     DS TB/TN (Cấu trúc) — leadersList (/api/leaders), lọc isTBorTNPosition
  //
  // KHÔNG dùng /api/staff (chỉ 26 records TB/TN) để xác định TVV.
  // KHÔNG dùng Contracts (file doanh số) để xác định ai là TVV.
  // KHÔNG dùng fallback — null/empty thì giữ null/empty.
  //
  // Tự động cập nhật: tvvStructList/leadersList/recruiterList được sync từ AppDataContext,
  // khi user sửa ở trang Quản lý (Cấu trúc) → context reload → dataVersion bump → sync lại.
  const subjectLists = useMemo(() => {
    // Unique theo agentCode — tvvStructList có thể có trùng (cùng agentCode nhiều nhóm)
    const tvvMap = new Map<string, TVVStructItem>();
    for (const t of tvvStructList) {
      if (t.agentCode && !tvvMap.has(t.agentCode)) tvvMap.set(t.agentCode, t);
    }
    const tvvAll = Array.from(tvvMap.values());

    // Tất cả TVV: toàn bộ nhân sự trong Cấu trúc, trừ BanCa.
    const allTvv = tvvAll
      .filter(t => !isBancaPosition(t.chucVu))
      .map(t => t.agentCode)
      .filter(Boolean);

    // TVVm: DS TVV có ngayBatDau → nay ≤ 12 tháng, KHÔNG phải TB/TN/TTN
    const tvvm = tvvAll
      .filter(t => isTVVm(t.ngayBatDau))
      .filter(t => !isTTNPosition(t.chucVu) && !isTBorTNPosition(t.chucVu))
      .map(t => t.agentCode)
      .filter(Boolean);

    // TVV cũ: DS TVV KHÔNG phải TVVm VÀ KHÔNG phải TB/TN/TTN
    const tvvCu = tvvAll
      .filter(t => !isTVVm(t.ngayBatDau))
      .filter(t => !isTTNPosition(t.chucVu) && !isTBorTNPosition(t.chucVu))
      .map(t => t.agentCode)
      .filter(Boolean);

    // TN: DS TB/TN từ leadersList (/api/leaders — DS TB/TN mục Cấu trúc)
    //    lọc isTBorTNPosition (loại TTN)
    const tnMap = new Map<string, any>();
    for (const l of leadersList) {
      if (l.agentCode && !tnMap.has(l.agentCode)) tnMap.set(l.agentCode, l);
    }
    const tn = Array.from(tnMap.values())
      .filter(l => isTBorTNPosition(l.position))
      .map(l => l.agentCode)
      .filter(Boolean);

    // TTN: DS TTN từ recruiterList (/api/recruiters — DS TTN mục Cấu trúc)
    const ttn = recruiterList
      .map(r => r.agentCode)
      .filter(Boolean);

    // Nhóm: danh sách nhóm được lấy từ DS TB/TN trong Cấu trúc, không lấy
    // từ doanh số.  Mã nhóm chỉ dùng nội bộ để tính, giao diện hiển thị tên.
    const nhom = Array.from(new Set(
      Array.from(tnMap.values())
        .filter(l => l.maNhom && !norm(l.nhom || '').toLowerCase().includes('dso'))
        .map(l => l.maNhom)
    ));

    // NTD: cả TN và TTN đều có quyền tuyển dụng.
    const ntd = Array.from(new Set([...tn, ...ttn]));

    // Phòng: tất cả TVV (mọi chức vụ: TB, TN, TTN, TVV) trong từng Phòng KD
    // Map: maBanNhom → maAD, maAD → maPhong
    const bnToAd = new Map<string, string>();
    for (const bn of banNhomStructList) {
      if (bn.maBanNhom) bnToAd.set(bn.maBanNhom, bn.maAD || '');
    }
    const adToPhong = new Map<string, string>();
    for (const ad of adStructList) {
      if (ad.maAD) adToPhong.set(ad.maAD, ad.maPhong || '');
    }
    // Build per-Phòng TVV lists
    const phongLists: Record<string, string[]> = {};
    for (const p of phongStructList) {
      const maPhong = p.maPhong;
      if (!maPhong) continue;
      const tvvInPhong = tvvAll
        .filter(t => {
          const maAD = bnToAd.get(t.maBanNhom || '');
          const pCode = adToPhong.get(maAD || '');
          return pCode === maPhong;
        })
        .map(t => t.agentCode)
        .filter(Boolean);
      phongLists[`phong_${maPhong}`] = tvvInPhong;
    }

    return { allTvv, tvvm, tvvCu, nhom, leader: tn, ttn, ntd, phongLists };
  }, [tvvStructList, leadersList, recruiterList, phongStructList, adStructList, banNhomStructList]);

  // Danh sách NTD hợp nhất từ DS TN và DS TTN của Cấu trúc.  TTN được ưu
  // tiên metadata riêng, sau đó bổ sung TN chưa có trong DS TTN.
  const ntdCandidates = useMemo(() => {
    const map = new Map<string, RecruiterMember>();
    for (const person of recruiterList) {
      if (person.agentCode && !map.has(person.agentCode)) map.set(person.agentCode, person);
    }
    for (const leader of leadersList) {
      if (!leader.agentCode || map.has(leader.agentCode)) continue;
      map.set(leader.agentCode, {
        id: leader.id || leader.agentCode,
        nhom: leader.nhom || '',
        agentCode: leader.agentCode,
        agentName: leader.agentName || '',
        position: leader.position || leader.chucVu || '',
        startDate: leader.startDate || leader.ngayBatDau || null,
        ngayHieuLuc: leader.ngayHieuLuc || null,
      });
    }
    return Array.from(map.values()).filter(person => !norm(person.nhom || '').toLowerCase().includes('dso'));
  }, [recruiterList, leadersList]);

  const recruitmentRows = useMemo(() => {
    if (!isRecruitmentMode(conditionType)) return [];
    return computeRecruitmentContestRows({
      startDate,
      endDate,
      recruiters: ntdCandidates,
      tvvStructList,
      contracts: filteredContracts,
      bonusTiers,
      selectedRecruiterCodes: subjectCodes,
      config: recruitmentConfig,
    });
  }, [conditionType, startDate, endDate, ntdCandidates, tvvStructList, filteredContracts, bonusTiers, subjectCodes, recruitmentConfig]);

  const chooseSubjectType = useCallback((type: string) => {
    const list = type.startsWith('phong_')
      ? (subjectLists.phongLists?.[type] || [])
      : (subjectLists as any)[type] || [];
    const nextTarget: TargetType = type === 'nhom' ? 'nhom' : (type === 'ntd' || type === 'ttn' || type === 'leader') ? 'nyd' : 'tvv';
    setTargetType(nextTarget);
    if (nextTarget === 'nhom') {
      setIncludeIndividualTN(false); // mặc định không tính cá nhân trưởng nhóm
    }
    if (nextTarget === 'nyd') {
      setIncludeIndividualNTD(false); // mặc định không tính cá nhân người tuyển dụng
    }
    if (isRecruitmentMode(conditionType)) {
      const subjectScope = type === 'ttn' ? 'ttn' : type === 'leader' ? 'leader' : 'both';
      setRecruitmentConfig(current => ({ ...current, subjectScope }));
    }
    if (isTVVPassCountMode(conditionType) && nextTarget !== 'nhom') setConditionType('total_ip');
    setSelectedSubjectTypes(new Set([type]));
    setThiDuaSubjects(Array.from(new Set(list)).join('\n'));
  }, [subjectLists, conditionType]);

  const chooseRecruitedAgentScope = useCallback((scope: RecruitedAgentScope) => {
    setRecruitedAgentScope(scope);
    // Khi nguồn chính đã giới hạn TVVm, hai chỉ tiêu lượt bổ sung phải dùng cùng nguồn đó.
    if (scope === 'tvvm') {
      setSecondaryLuotHDFilter('tvvm');
      setSecondaryLuotHDCFilter('tvvm');
    }
  }, []);

  const chooseSecondaryRoundScope = useCallback((scope: 'all' | 'tvvm') => {
    setSecondaryLuotHDFilter(scope);
    setSecondaryLuotHDCFilter(scope);
  }, []);

  // Toggle tại hộp “Khác”: chỉ có thể chọn một bộ đối tượng chính; khi đổi
  // bộ thì danh sách được thay bằng đúng danh sách lấy từ Cấu trúc.
  const toggleSubjectType = useCallback((type: string) => {
    if (selectedSubjectTypes.has(type)) {
      setSelectedSubjectTypes(new Set());
      setThiDuaSubjects('');
    } else {
      chooseSubjectType(type);
    }
  }, [chooseSubjectType, selectedSubjectTypes]);

  // Display contracts with subject filter applied
  // LOGIC: Dùng DS nguồn (Staff/Recruiter) làm chuẩn, ánh xạ HĐ vào
  const displayContracts = useMemo(() => filterDisplayContracts(filteredContracts, parseContestConfig({
    targetType, participants: JSON.stringify(subjectCodes), includeIndividualNTD, recruitedAgentScope, filterByEffectiveDate,
  }), staffList, ntdCandidates, tvvStructList, leadersList),
  [filteredContracts, subjectCodes, targetType, staffList, leadersList, ntdCandidates, filterByEffectiveDate, tvvStructList, includeIndividualNTD, recruitedAgentScope]);

  // Several contest summaries need every contract for the same agent. Build the
  // index once instead of scanning the full contract list again for every row.
  const displayContractsByAgent = useMemo(() => {
    const index = new Map<string, Contract[]>();
    for (const contract of displayContracts) {
      if (!contract.agentCode) continue;
      const rows = index.get(contract.agentCode);
      if (rows) rows.push(contract);
      else index.set(contract.agentCode, [contract]);
    }
    return index;
  }, [displayContracts]);

  // filteredRevenueData & displayRevenueData removed — all data now sourced from Contracts table only

  // NYD data computation - use Recruiter table as primary reference
  const nydData: NYDData[] = useMemo(() => computeNYDData(displayContracts, {
    targetType, conditionType, participants: subjectCodes, includeIndividualNTD, recruitedAgentScope,
    luotHDThreshold, luotHDCTThreshold, tvv90MaxMonths, tvv90MinIP,
  } as import('@/lib/contest-calculator').ContestConfig, ntdCandidates, staffList, tvvStructList),
  [displayContracts, targetType, conditionType, subjectCodes, includeIndividualNTD, recruitedAgentScope, luotHDThreshold, luotHDCTThreshold, tvv90MaxMonths, tvv90MinIP, ntdCandidates, staffList, tvvStructList]);

  // Nhóm hiển thị luôn lấy theo Cấu trúc. Dữ liệu hợp đồng chỉ là nguồn doanh
  // số nên có thể thiếu tên/mã nhóm, nhưng không được làm trống cột Nhóm.
  const resolveTvvGroup = useMemo(() => {
    const normalizeKey = (value: string) => norm(value || '').toLowerCase();
    const groupNameByCode = new Map<string, string>();
    const groupByAgentCode = new Map<string, { maNhom: string; nhom: string; agentName: string }>();

    for (const group of banNhomStructList) {
      if (group.maBanNhom && group.tenBanNhom) {
        groupNameByCode.set(normalizeKey(group.maBanNhom), group.tenBanNhom);
      }
    }
    // DS TB/TN là nguồn dự phòng cho trường hợp mã nhóm đã có TVV nhưng chưa
    // kịp có một dòng tương ứng trong danh mục Ban/Nhóm.
    for (const member of [...staffList, ...leadersList]) {
      const maNhom = member.maBanNhom || member.maNhom || '';
      if (maNhom && member.nhom) {
        groupNameByCode.set(normalizeKey(maNhom), member.nhom);
      }
    }
    const addMember = (member: { agentCode?: string; agentName?: string; maBanNhom?: string; maNhom?: string; nhom?: string }) => {
      const agentCode = normalizeKey(member.agentCode || '');
      if (!agentCode) return;
      const maNhom = member.maBanNhom || member.maNhom || '';
      const nhom = groupNameByCode.get(normalizeKey(maNhom)) || member.nhom || '';
      const current = groupByAgentCode.get(agentCode);
      if (maNhom || nhom || member.agentName) {
        groupByAgentCode.set(agentCode, {
          maNhom: current?.maNhom || maNhom,
          nhom: current?.nhom || nhom,
          agentName: current?.agentName || member.agentName || '',
        });
      }
    };
    tvvStructList.forEach(addMember);
    staffList.forEach(addMember);
    leadersList.forEach(addMember);

    return (agentCode: string, maNhom = '', nhom = '') => {
      const structureGroup = groupByAgentCode.get(normalizeKey(agentCode));
      const resolvedMaNhom = maNhom || structureGroup?.maNhom || '';
      return {
        maNhom: resolvedMaNhom,
        nhom: groupNameByCode.get(normalizeKey(resolvedMaNhom)) || structureGroup?.nhom || nhom || '—',
        agentName: structureGroup?.agentName || '',
      };
    };
  }, [tvvStructList, staffList, leadersList, banNhomStructList]);

  // Theo-HĐ vẫn phải hiện đủ TVV thuộc đối tượng chương trình. Dòng giữ chỗ
  // chỉ phục vụ bảng kết quả; không được đưa vào bảng chi tiết hợp đồng hay
  // làm tăng số lượng hợp đồng thực tế.
  const perContractDisplayContracts = useMemo<Contract[]>(() => {
    if (targetType !== 'tvv' || !isPerContractMode(conditionType)) return displayContracts;

    const rows = [...displayContracts];
    if (!tvvStructList.length) return rows;

    const candidates = subjectCodes.length === 0
      ? tvvStructList.filter(member => !isBancaPosition(member.chucVu))
      : tvvStructList.filter(member =>
          subjectCodes.includes(member.agentCode) || subjectCodes.includes(member.agentName)
        );

    const uniqueCandidates = new Map<string, TVVStructItem>();
    for (const member of candidates) {
      const key = norm(member.agentCode || '').toLowerCase();
      if (key && !uniqueCandidates.has(key)) uniqueCandidates.set(key, member);
    }

    const existingCodes = new Set(rows.map(row => norm(row.agentCode || '').toLowerCase()));
    for (const [key, member] of uniqueCandidates) {
      if (existingCodes.has(key)) continue;
      const group = resolveTvvGroup(member.agentCode, member.maBanNhom || '');
      if (norm(`${group.nhom} ${group.maNhom}`).toLowerCase().includes('dso')) continue;
      rows.push({
        id: `zero-sales-${member.agentCode}`,
        contractNumber: '',
        agentCode: member.agentCode,
        agentName: member.agentName || member.agentCode,
        position: member.chucVu || '',
        ban: '',
        nhom: group.nhom === '—' ? '' : group.nhom,
        maNhom: group.maNhom,
        leaderAgentCode: '',
        recruiterCode: '',
        startDate: member.ngayBatDau || null,
        effectiveDate: '',
        issueDate: '',
        fyp: 0,
        afyp: 0,
        pdt10DT: 0,
        tinhLuot3tr: 0,
        maDaiLyTD: member.maTVVTuyendung || '',
        ngayBatDauLamViec: member.ngayBatDau || null,
        ad: '',
      });
    }

    const valueOf = (row: Contract) => conditionType === 'per_contract_afyp' ? row.afyp : row.pdt10DT;
    return rows.sort((a, b) => {
      const valueDiff = valueOf(b) - valueOf(a);
      if (valueDiff !== 0) return valueDiff;
      if (valueOf(a) === 0) {
        const aPA = isPAGroup(a.nhom, a.maNhom);
        const bPA = isPAGroup(b.nhom, b.maNhom);
        if (aPA !== bPA) return aPA ? 1 : -1;
      }
      return (a.agentName || a.agentCode).localeCompare(b.agentName || b.agentCode, 'vi');
    });
  }, [displayContracts, targetType, conditionType, tvvStructList, subjectCodes, resolveTvvGroup]);

  // TVV total mode result rows - bao gồm TẤT CẢ TVV trong DS áp dụng, kể cả không có doanh thu (giá trị 0)
  // Dùng Contracts (bảng HĐ) làm nguồn duy nhất cho TẤT CẢ chế độ
  // Top N mode: nếu KHÔNG có DS đối tượng → thêm TẤT CẢ TVV từ DS TVV (Cấu trúc) để hiển thị hết danh sách
  const tvvTotalRows = useMemo(() => {
    if (targetType !== 'tvv' || isPerContractMode(conditionType)) return [];
    const isTopN = isTopNMode(conditionType);
    const isAFYP = conditionType === 'total_afyp' || (isTopN && topNValueType === 'afyp');
    const isActivityMode = isActivityRoundMode(conditionType);
    const luotThreshold = isStandardMode(conditionType) ? luotHDCTThreshold : luotHDThreshold;
    const agentMap = new Map<string, {
      agentCode: string; agentName: string; nhom: string; maNhom: string;
      totalFYP: number; totalAFYP: number; contractCount: number; activityRounds: number;
    }>();

    // TẤT CẢ chế độ: dùng displayContracts (nguồn duy nhất)
    for (const c of displayContracts) {
      const key = c.agentCode;
      if (!key) continue;
      const existing = agentMap.get(key);
      const group = resolveTvvGroup(c.agentCode, c.maNhom, c.nhom);
      if (existing) {
        existing.totalFYP += c.pdt10DT;
        existing.totalAFYP += c.afyp;
        existing.contractCount += 1;
        if (!existing.agentName || existing.agentName === existing.agentCode) {
          existing.agentName = group.agentName || c.agentName || c.agentCode;
        }
        if ((!existing.maNhom || existing.nhom === '—') && group.maNhom) {
          existing.maNhom = group.maNhom;
          existing.nhom = group.nhom;
        }
      } else {
        agentMap.set(key, {
          agentCode: c.agentCode, agentName: group.agentName || c.agentName || c.agentCode,
          nhom: group.nhom, maNhom: group.maNhom,
          totalFYP: c.pdt10DT, totalAFYP: c.afyp, contractCount: 1,
          activityRounds: 0,
        });
      }
    }
    // Tính activityRounds từ Contracts cho từng agent
    for (const [key, agent] of agentMap) {
      const agentContracts = displayContractsByAgent.get(key) || [];
      agent.activityRounds = calculateLuotWithStructure(agentContracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
    }
    const normalizedAgentCodes = new Set(Array.from(agentMap.keys(), key => norm(key).toLowerCase()));
    // Thêm TVV từ subjectCodes KHÔNG có trong dữ liệu (không có doanh thu → giá trị 0)
    if (subjectCodes.length > 0) {
      for (const code of subjectCodes) {
        const codeLower = norm(code).toLowerCase();
        const found = normalizedAgentCodes.has(codeLower);
        if (!found) {
          const info = tvvStructList.find(t => t.agentCode.toLowerCase() === codeLower || norm(t.agentName || '').toLowerCase() === codeLower);
          const group = resolveTvvGroup(info?.agentCode || code, info?.maBanNhom || '');
          const resolvedCode = info?.agentCode || code;
          agentMap.set(resolvedCode, {
            agentCode: resolvedCode,
            agentName: group.agentName || info?.agentName || code,
            nhom: group.nhom,
            maNhom: group.maNhom,
            totalFYP: 0, totalAFYP: 0, contractCount: 0, activityRounds: 0,
          });
          normalizedAgentCodes.add(norm(resolvedCode).toLowerCase());
        }
      }
    } else if (isTopN && tvvStructList && tvvStructList.length > 0) {
      // Top N mode + KHÔNG có DS đối tượng → thêm TẤT CẢ TVV từ DS TVV (Cấu trúc) để hiển thị hết
      // Yêu cầu user: bảng kết quả phải hiển thị hết danh sách đối tượng tham gia thi đua,
      // không chỉ những người có doanh số. User dùng "Ẩn chưa đạt mức" để ẩn người k có doanh số.
      for (const t of tvvStructList) {
        if (!t.agentCode) continue;
        const codeLower = t.agentCode.toLowerCase();
        const found = normalizedAgentCodes.has(codeLower);
        if (!found) {
          const group = resolveTvvGroup(t.agentCode, t.maBanNhom || '');
          agentMap.set(t.agentCode, {
            agentCode: t.agentCode,
            agentName: t.agentName || t.agentCode,
            nhom: group.nhom,
            maNhom: group.maNhom,
            totalFYP: 0, totalAFYP: 0, contractCount: 0, activityRounds: 0,
          });
          normalizedAgentCodes.add(codeLower);
        }
      }
    } else if (tvvStructList && tvvStructList.length > 0) {
      // FIX (user request): TẤT CẢ chế độ (total_ip / total_afyp / activity_round / ...)
      // khi KHÔNG có DS đối tượng → thêm TẤT CẢ TVV từ DS TVV (Cấu trúc Quản lý) vào
      // bảng kết quả. Trước đây chỉ TopN mode mới thêm → các chế độ khác chỉ hiện TVV
      // có doanh số, làm user tưởng "lấy DS đối tượng từ file doanh số".
      // TVV trong Cấu trúc mà không có HĐ → giá trị 0, sẽ hiện "chưa đạt" (user có thể
      // dùng "Ẩn chưa đạt mức" để ẩn).
      for (const t of tvvStructList) {
        if (!t.agentCode) continue;
        const codeLower = t.agentCode.toLowerCase();
        const found = normalizedAgentCodes.has(codeLower);
        if (!found) {
          const group = resolveTvvGroup(t.agentCode, t.maBanNhom || '');
          agentMap.set(t.agentCode, {
            agentCode: t.agentCode,
            agentName: t.agentName || t.agentCode,
            nhom: group.nhom,
            maNhom: group.maNhom,
            totalFYP: 0, totalAFYP: 0, contractCount: 0, activityRounds: 0,
          });
          normalizedAgentCodes.add(codeLower);
        }
      }
    }
    const priorityBanNhomCodes = new Set(
      banNhomStructList
        .filter(bn => adStructList.some(ad => ad.maAD === bn.maAD && phongStructList.some(p => p.maPhong === ad.maPhong)))
        .map(bn => bn.maBanNhom)
        .filter(Boolean)
    );
    const priorityTvvCodes = new Set(
      tvvStructList.filter(tvv => priorityBanNhomCodes.has(tvv.maBanNhom)).map(tvv => tvv.agentCode).filter(Boolean)
    );
    const allRows = Array.from(agentMap.values()).map(agent => {
      // Top N mode: chọn giá trị theo topNValueType ('ip' hoặc 'afyp')
      const value = isTopN
        ? (topNValueType === 'afyp' ? agent.totalAFYP : agent.totalFYP)
        : (isAFYP ? agent.totalAFYP : (isActivityMode ? agent.activityRounds : agent.totalFYP));
      let tier: BonusTier | null = null;
      let remaining: number | null = null;
      if (isTopN) {
        // Tier will be assigned by rank after sort; placeholder null here
        remaining = value < topNMinIP ? topNMinIP - value : null;
      } else {
        const res = calculateBonus(value);
        tier = res.tier;
        remaining = getRemainingToNextTier(value);
      }
      // Phase 2 - split by date using contracts
      let phaseInfo = { phase1Bonus: 0, phase2Bonus: 0, phase1Tier: null as BonusTier | null, phase2Tier: null as BonusTier | null };
      if (usePhase2 && phase2StartDate) {
        const p2Start = new Date(phase2StartDate);
        const agentContracts = displayContractsByAgent.get(agent.agentCode) || [];
        const p1Contracts = agentContracts.filter(c => new Date(c.effectiveDate) < p2Start);
        const p2Contracts = agentContracts.filter(c => new Date(c.effectiveDate) >= p2Start);
        const p1Revenue = p1Contracts.reduce((s, c) => s + c.pdt10DT, 0);
        const p2Revenue = p2Contracts.reduce((s, c) => s + c.pdt10DT, 0);
        const p1Value = isActivityMode
          ? calculateLuotWithStructure(p1Contracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP, agentContracts)
          : isAFYP
            ? p1Contracts.reduce((s, c) => s + c.afyp, 0)
            : p1Revenue;
        const p2Value = isActivityMode
          ? calculateLuotWithStructure(p2Contracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP, agentContracts)
          : isAFYP
            ? p2Contracts.reduce((s, c) => s + c.afyp, 0)
            : p2Revenue;
        const p1Res = isActivityMode
          ? calculateActivityRoundBonusWithTiers(p1Value, bonusTiers)
          : calculateBonusWithTiers(p1Value, bonusTiers);
        const p2Res = isActivityMode
          ? calculateActivityRoundBonusWithTiers(p2Value, bonusTiers2)
          : calculateBonusWithTiers(p2Value, bonusTiers2);
        phaseInfo = {
          phase1Bonus: p1Res.tier ? computeBonusFromTier(p1Res.tier, p1Revenue, isActivityMode ? p1Value : undefined, p1Revenue) : 0,
          phase2Bonus: p2Res.tier ? computeBonusFromTier(p2Res.tier, p2Revenue, isActivityMode ? p2Value : undefined, p2Revenue) : 0,
          phase1Tier: p1Res.tier, phase2Tier: p2Res.tier,
        };
      }
      return { agent, value, tier: usePhase2 && phase2StartDate ? phaseInfo.phase1Tier || phaseInfo.phase2Tier : tier, remaining, phaseInfo };
    }).sort((a, b) => {
      const valueDiff = b.value - a.value;
      if (valueDiff !== 0) return valueDiff;
      if (a.value === 0) {
        const aPA = isPAGroup(a.agent.nhom, a.agent.maNhom);
        const bPA = isPAGroup(b.agent.nhom, b.agent.maNhom);
        if (aPA !== bPA) return aPA ? 1 : -1;
      }
      const aPriority = priorityTvvCodes.has(a.agent.agentCode) ? 1 : 0;
      const bPriority = priorityTvvCodes.has(b.agent.agentCode) ? 1 : 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      return a.agent.agentName.localeCompare(b.agent.agentName, 'vi');
    });

    // For top_n_ip mode: assign tier by rank (only top N with value >= topNMinIP get reward)
    if (isTopN) {
      // QUAN TRỌNG: Trong Top N mode, tier theo THỨ TỰ hạng (Mức 1 = Hạng 1, Mức 2 = Hạng 2, ...)
      // KHÔNG sort theo minFYP (sẽ sai: user setup Mức 1 minFYP=50M bonusAmount=1M,
      // Mức 2 minFYP=0 bonusAmount=500K → sort sẽ đặt Mức 2 lên trước → Hạng 1 nhận 500K thay vì 1M)
      const orderedTiers = [...bonusTiers];
      // Auto-create default tiers if user hasn't added any — Top N mode cần tier theo từng hạng
      // Nếu không có tier nào → Hạng 1 = 1 triệu, Hạng 2 = 500k, Hạng 3 = 300k (mặc định)
      // User có thể override bằng cách add tier trong UI
      const effectiveTiers = orderedTiers.length > 0
        ? orderedTiers
        : Array.from({ length: topN }, (_, i) => ({
            id: `default-tier-${i + 1}`,
            minFYP: 0,
            maxFYP: null,
            bonusAmount: i === 0 ? 1000000 : i === 1 ? 500000 : 300000,
            bonusType: 'money' as const,
            bonusText: '',
            bonusPercent: 0,
          }));
      return allRows.map((row, idx) => {
        const rank = idx + 1;
        const qualified = row.value >= topNMinIP && rank <= topN;
        const tierByRank = qualified && rank <= effectiveTiers.length ? effectiveTiers[rank - 1] : null;
        return {
          ...row,
          tier: tierByRank,
          remaining: row.value < topNMinIP ? topNMinIP - row.value : null,
        };
      });
    }
    return allRows;
  }, [displayContracts, displayContractsByAgent, targetType, conditionType, subjectCodes, staffList, recruiterList, usePhase2, phase2StartDate, calculateBonus, getRemainingToNextTier, calculateBonusWithTiers, bonusTiers, bonusTiers2, computeBonusFromTier, luotHDThreshold, luotHDCTThreshold, tvv90MaxMonths, tvv90MinIP, topN, topNMinIP, topNValueType, tvvStructList, phongStructList, adStructList, banNhomStructList, resolveTvvGroup]);

  // Grouped data - CHỈ lấy nhóm từ Staff table (DS TN)
  // TẤT CẢ số liệu (FYP, lượt) đều từ Contracts (bảng HĐ) — không dùng MonthlyRevenue
  // Thi đua nhóm: Dùng Staff table làm nguồn chính để xây dựng danh sách nhóm
  // Ánh xạ doanh số từ displayContracts vào nhóm theo mã nhóm
  // Loại bỏ nhóm PA
  // Trưởng ban tham dự với vai trò Trưởng nhóm
  // Nếu có DS đối tượng → chỉ hiển thị nhóm trong DS
  // Nhóm không có HĐ vẫn hiện với giá trị 0
  const groupedData: GroupData[] = useMemo(() => {
    if (targetType !== 'nhom') return [];
    const map = new Map<string, GroupData>();

    // NGUỒN ĐÚNG: DS TB/TN (leadersList = /api/leaders) — 30 nhóm, mỗi nhóm có 1 TB hoặc TN
    // Nhóm không có TB/TN → không tham gia thi đua nhóm → không hiển thị
    // (User: "nhóm nào mà không có trưởng nhóm thì lấy trưởng ban, nếu không có trưởng ban trưởng nhóm luôn thì không cần lấy")

    // Xác định tập mã nhóm hợp lệ
    // 1. Nếu có nhập đối tượng → chỉ lấy nhóm trong DS
    // 2. Nếu không nhập → lấy tất cả nhóm từ DS TB/TN (trừ DSO)
    const allowedMaNhom = new Set<string>();

    if (subjectCodes.length > 0) {
      // Có nhập đối tượng → tìm mã nhóm từ tên nhóm nhập vào (dùng leadersList)
      for (const code of subjectCodes) {
        const codeLower = norm(code).toLowerCase();
        if (codeLower.includes('dso')) continue;
        const leader = leadersList.find(l => norm(l.nhom || '').toLowerCase() === codeLower);
        if (leader?.maNhom) {
          allowedMaNhom.add(leader.maNhom);
        } else {
          allowedMaNhom.add(code);
        }
      }
    } else {
      // Không nhập → lấy tất cả nhóm từ DS TB/TN (trừ DSO)
      for (const l of leadersList) {
        const nhomLower = norm(l.nhom || '').toLowerCase();
        const maNhomLower = (l.maNhom || '').toLowerCase();
        if (l.maNhom && !nhomLower.includes('dso') && !maNhomLower.includes('dso')) {
          allowedMaNhom.add(l.maNhom);
        }
      }
    }

    // Step 1: Build groups từ DS TB/TN (leadersList) — nguồn ĐÚNG
    for (const l of leadersList) {
      if (!l.maNhom) continue;
      if (map.has(l.maNhom)) continue;
      const nhomLower = norm(l.nhom || '').toLowerCase();
      const maNhomLower = (l.maNhom || '').toLowerCase();
      if (nhomLower.includes('dso') || maNhomLower.includes('dso')) continue;
      if (allowedMaNhom.size > 0 && !allowedMaNhom.has(l.maNhom)) continue;

      map.set(l.maNhom, { maNhom: l.maNhom, nhom: l.nhom, leader: null, totalFYP: 0, totalAFYP: 0, contractCount: 0, activityRounds: 0, contracts: [], memberCount: 0 });
    }

    // Thêm nhóm trong DS đối tượng nhưng chưa có trong DS TB/TN (nhóm mới, giá trị 0)
    if (subjectCodes.length > 0) {
      for (const maNhom of allowedMaNhom) {
        if (!map.has(maNhom)) {
          const leader = leadersList.find(l => l.maNhom === maNhom);
          const nhomName = leader?.nhom || maNhom;
          map.set(maNhom, { maNhom, nhom: nhomName, leader: null, totalFYP: 0, totalAFYP: 0, contractCount: 0, activityRounds: 0, contracts: [], memberCount: 0 });
        }
      }
    }

    // Tìm Trưởng nhóm tham dự thi đua
    // NGUỒN ĐÚNG: DS TB/TN (leadersList) — mỗi dòng = 1 TB hoặc TN của nhóm đó
    // Ưu tiên: Trưởng ban > Trưởng nhóm (TB tham dự với vai trò TN)
    // Fallback sang Recruiter table (DS TTN) nếu DS TB/TN không có
    for (const [maNhom, g] of map) {
      // Tìm leader từ DS TB/TN (leadersList) — nguồn CHÍNH
      const leader = leadersList.find(l => l.maNhom === maNhom);
      if (leader) {
        g.leader = { agentCode: leader.agentCode, agentName: leader.agentName, position: leader.position };
        continue;
      }

      // Fallback: Tìm trong DS TTN (recruiterList) theo tên nhóm
      const groupRecruiters = recruiterList.filter(r => r.nhom === g.nhom || r.nhom === g.maNhom);
      const rBan = groupRecruiters.find(r => {
        const pos = norm(r.position || '').toLowerCase().trim();
        return pos === 'trưởng ban';
      });
      if (rBan) {
        g.leader = { agentCode: rBan.agentCode, agentName: rBan.agentName, position: rBan.position };
        continue;
      }
      const rNhom = groupRecruiters.find(r => {
        const pos = norm(r.position || '').toLowerCase().trim();
        return pos === 'trưởng nhóm';
      });
      if (rNhom) {
        g.leader = { agentCode: rNhom.agentCode, agentName: rNhom.agentName, position: rNhom.position };
      }
    }

    // Step 2: Map doanh số vào nhóm ĐÃ CÓ
    // Dùng mã nhóm (maNhom) để ánh xạ, hỗ trợ case-insensitive
    const mapKeyIndex = new Map<string, string>(); // lowercase → actual key
    for (const key of map.keys()) {
      mapKeyIndex.set(key.toLowerCase(), key);
    }

    // TẤT CẢ chế độ: dùng displayContracts (nguồn duy nhất) cho FYP, AFYP, contractCount
    // QUAN TRỌNG: Khi includeIndividualTN = false → LOẠI TRỪ HĐ của TB/TN (leader)
    // Theo yêu cầu user: mặc định không tính cá nhân TB/TN vào nhóm, trừ khi tích checkbox
    const luotThreshold = isStandardMode(conditionType) ? luotHDCTThreshold : luotHDThreshold;
    // Build set of leader agentCodes (TB/TN) để loại trừ khi includeIndividualTN = false
    const leaderCodes = new Set<string>();
    if (!includeIndividualTN) {
      for (const [maNhom, g] of map) {
        if (g.leader?.agentCode) leaderCodes.add(g.leader.agentCode);
      }
    }
    const contractByNhom = new Map<string, { totalFYP: number; totalAFYP: number; contractCount: number }>();
    for (const c of displayContracts) {
      if (!c.maNhom) continue;
      // Nếu includeIndividualTN = false → bỏ qua HĐ của TB/TN (leader)
      if (!includeIndividualTN && leaderCodes.has(c.agentCode)) continue;
      const existing = contractByNhom.get(c.maNhom);
      if (existing) {
        existing.totalFYP += c.pdt10DT;
        existing.totalAFYP += c.afyp;
        existing.contractCount += 1;
      } else {
        contractByNhom.set(c.maNhom, { totalFYP: c.pdt10DT, totalAFYP: c.afyp, contractCount: 1 });
      }
    }
    for (const [cNhom, cData] of contractByNhom) {
      const actualKey = map.get(cNhom) ? cNhom : mapKeyIndex.get(cNhom.toLowerCase());
      const g = actualKey ? map.get(actualKey) : null;
      if (g) {
        g.totalFYP += cData.totalFYP;
        g.totalAFYP += cData.totalAFYP;
        g.contractCount += cData.contractCount;
      }
    }
    // Tính lượt HĐ từ Contracts cho từng nhóm + gán contracts vào group
    // Khi includeIndividualTN = false → groupContracts cũng loại trừ HĐ của TB/TN
    for (const [maNhom, g] of map) {
      const groupContracts = displayContracts.filter(c => {
        if (c.maNhom !== maNhom && (!c.maNhom || c.maNhom.toLowerCase() !== maNhom.toLowerCase())) return false;
        if (!includeIndividualTN && leaderCodes.has(c.agentCode)) return false;
        return true;
      });
      g.contracts = groupContracts;
      g.activityRounds = calculateLuotWithStructure(groupContracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
    }

    // Step 4: Thành viên luôn lấy từ DS TVV của Cấu trúc, kể cả khi chưa có HĐ.
    for (const g of Array.from(map.values())) {
      g.memberCount = tvvStructList.filter(member => member.maBanNhom === g.maNhom).length;
    }

    return Array.from(map.values());
  }, [displayContracts, targetType, conditionType, leadersList, recruiterList, subjectCodes, includeIndividualTN, luotHDThreshold, luotHDCTThreshold, tvv90MaxMonths, tvv90MinIP, tvvStructList, calculateLuotWithStructure]);

  const phaseConfig = useMemo(() => parseContestConfig({
    conditionType, targetType, includeIndividualNTD, recruitedAgentScope, usePhase2, phase2StartDate, phase2EndDate, luotHDThreshold, luotHDCTThreshold, tvv90MaxMonths, tvv90MinIP, useSecondaryCondition, secondaryTotalAFYPMin, secondaryTotalIPMin, secondaryContractCountMin, secondaryContractIPMin, secondaryLuotHDMin, secondaryLuotHDCMin, secondaryLuotHDFilter, secondaryLuotHDCFilter, bonusTiers: JSON.stringify(bonusTiers), bonusTiers2: JSON.stringify(bonusTiers2),
  }), [conditionType, targetType, includeIndividualNTD, recruitedAgentScope, usePhase2, phase2StartDate, phase2EndDate, luotHDThreshold, luotHDCTThreshold, tvv90MaxMonths, tvv90MinIP, useSecondaryCondition, secondaryTotalAFYPMin, secondaryTotalIPMin, secondaryContractCountMin, secondaryContractIPMin, secondaryLuotHDMin, secondaryLuotHDCMin, secondaryLuotHDFilter, secondaryLuotHDCFilter, bonusTiers, bonusTiers2]);

  // Phase 2: Split contracts by date and compute bonus — dùng Contracts (nguồn duy nhất) cho TẤT CẢ chế độ
  const phase2Results = useMemo(() => {
    if (!usePhase2 || !phase2StartDate || conditionType === 'pass_count_contracts') return null;
    if (isTVVPassCountMode(conditionType) || isRecruitmentMode(conditionType) || isTopNMode(conditionType)) return null;
    const p2Start = getContestDateBoundary(phase2StartDate);
    let phase1Bonus = 0, phase2Bonus = 0, phaseAchievedCount = 0;
    const entityRows = targetType === 'nhom' ? groupedData.map(g => g.contracts)
      : targetType === 'nyd' ? nydData.map(n => n.contracts)
      : Array.from(displayContractsByAgent.values());
    for (const rows of entityRows) {
      if (!evaluateSecondaryConditions(rows, phaseConfig, tvvStructList).passed) continue;
      if (targetType === 'tvv' && isPerContractMode(conditionType)) {
        const ip = sumContractIP(rows);
        for (const c of rows) {
          const first = new Date(c.effectiveDate) < p2Start;
          const value = conditionType === 'per_contract_afyp' ? c.afyp : c.pdt10DT;
          const { tier } = calculateBonusWithTiers(value, first ? bonusTiers : bonusTiers2);
          if (tier) phaseAchievedCount++;
          const bonus = tier ? computeBonusFromTier(tier, c.pdt10DT, undefined, ip) : 0;
          if (first) phase1Bonus += bonus; else phase2Bonus += bonus;
        }
      } else {
        const nydCode = targetType === 'nyd' ? nydData[entityRows.indexOf(rows)].nydCode : undefined;
        const phase = calculateEntityPhaseOutcome(rows, phaseConfig, tvvStructList, nydCode);
        if (phase.phase1Tier || phase.phase2Tier) phaseAchievedCount++;
        phase1Bonus += phase.phase1Bonus; phase2Bonus += phase.phase2Bonus;
      }
    }

    return { phase1Bonus, phase2Bonus, phaseAchievedCount, totalBonus: phase1Bonus + phase2Bonus,
      phase1Count: displayContracts.filter(c => new Date(c.effectiveDate) < p2Start).length,
      phase2Count: displayContracts.filter(c => new Date(c.effectiveDate) >= p2Start).length };
  }, [usePhase2, phase2StartDate, conditionType, targetType, groupedData, nydData, displayContracts, displayContractsByAgent, phaseConfig, tvvStructList, bonusTiers, bonusTiers2, includeIndividualNTD, luotHDCTThreshold, luotHDThreshold, tvv90MaxMonths, tvv90MinIP, structureStartDateByCode, recruitedAgentScope, calculateBonusWithTiers]);

  // Helper: get the value for comparison based on condition type
  const getContractValue = useCallback((c: Contract): number => {
    if (conditionType === 'per_contract_afyp') return c.afyp;
    return c.pdt10DT;
  }, [conditionType]);

  const getEntityValue = useCallback((contracts: Contract[]): number => {
    if (conditionType === 'total_afyp' || conditionType === 'per_contract_afyp') return contracts.reduce((sum, c) => sum + c.afyp, 0);
    return contracts.reduce((sum, c) => sum + c.pdt10DT, 0);
  }, [conditionType]);

  const getGroupValue = useCallback((g: GroupData): number => {
    if (conditionType === 'total_afyp' || conditionType === 'per_contract_afyp') return g.totalAFYP;
    return g.totalFYP;
  }, [conditionType]);

  const combinedTopRankByKey = useMemo(() => {
    if (!useTopRanking || !supportsCombinedTopRanking(conditionType)) return new Map();

    const passesSecondaryConditions = (rows: Contract[]) => evaluateSecondaryConditions(rows, {
      useSecondaryCondition, secondaryTotalAFYPMin, secondaryTotalIPMin,
      secondaryContractCountMin, secondaryContractIPMin,
      secondaryLuotHDMin, secondaryLuotHDCMin, secondaryLuotHDFilter, secondaryLuotHDCFilter,
      luotHDThreshold, luotHDCTThreshold,
    }, tvvStructList).passed;

    const passesTopEligibility = (rows: Contract[], focusContract?: Contract) =>
      passesCombinedTopEligibility(topEligibilityType, topEligibilityMin, rows, focusContract);

    const candidates: { key: string; value: number; qualified: boolean }[] = [];
    if (targetType === 'tvv' && isPerContractMode(conditionType)) {
      for (const contract of perContractDisplayContracts) {
        const value = getContractValue(contract);
        const tiers = usePhase2 && phase2StartDate && new Date(contract.effectiveDate) >= getContestDateBoundary(phase2StartDate) ? bonusTiers2 : bonusTiers;
        const tier = calculateBonusWithTiers(value, tiers).tier;
        const agentContracts = displayContractsByAgent.get(contract.agentCode) || [];
        candidates.push({ key: `contract:${contract.id}`, value, qualified: Boolean(tier) && passesSecondaryConditions(agentContracts) && passesTopEligibility(agentContracts, contract) });
      }
    } else if (targetType === 'tvv') {
      for (const row of tvvTotalRows) {
        const agentContracts = displayContractsByAgent.get(row.agent.agentCode) || [];
        candidates.push({ key: `tvv:${row.agent.agentCode}`, value: row.value, qualified: Boolean(row.tier) && passesSecondaryConditions(agentContracts) && passesTopEligibility(agentContracts) });
      }
    } else if (targetType === 'nhom') {
      for (const group of groupedData) {
        const value = getGroupValue(group);
        const phase = usePhase2 && phase2StartDate ? calculateEntityPhaseOutcome(group.contracts, phaseConfig, tvvStructList) : null;
        const tier = phase ? phase.phase1Tier || phase.phase2Tier : calculateBonus(value).tier;
        candidates.push({ key: `nhom:${group.maNhom}`, value, qualified: Boolean(tier) && passesSecondaryConditions(group.contracts || []) && passesTopEligibility(group.contracts || []) });
      }
    } else if (targetType === 'nyd') {
      for (const person of nydData) {
        const value = getNYDContestValue(conditionType, isActivityRoundMode(conditionType) ? person.recruitCount : person.recruitFYP, person.ownFYP, person.ownActivityRounds, includeIndividualNTD);
        const tier = calculateBonus(value).tier;
        const personContracts = getNYDContributingContracts(person.contracts || displayContracts, person.nydCode, includeIndividualNTD, recruitedAgentScope, structureStartDateByCode);
        const phase = usePhase2 && phase2StartDate ? calculateEntityPhaseOutcome(personContracts, phaseConfig, tvvStructList, person.nydCode) : null;
        const qualifiedTier = phase ? phase.phase1Tier || phase.phase2Tier : tier;
        candidates.push({ key: `nyd:${person.nydCode}`, value, qualified: Boolean(qualifiedTier) && passesSecondaryConditions(personContracts) && passesTopEligibility(personContracts) });
      }
    }

    return buildCombinedTopRanking(candidates, topN, topRewardAmounts);
  }, [
    useTopRanking, conditionType, targetType, perContractDisplayContracts, tvvTotalRows, groupedData, nydData,
    displayContracts, displayContractsByAgent, getContractValue, getGroupValue, calculateBonus, includeIndividualNTD, topN, topRewardAmounts,
    useSecondaryCondition, secondaryTotalAFYPMin, secondaryTotalIPMin,
    secondaryContractCountMin, secondaryContractIPMin, secondaryLuotHDMin, secondaryLuotHDCMin,
    secondaryLuotHDFilter, secondaryLuotHDCFilter, luotHDThreshold, luotHDCTThreshold, tvvStructList,
    topEligibilityType, topEligibilityMin, usePhase2, phase2StartDate, bonusTiers, bonusTiers2, phaseConfig, calculateBonusWithTiers,
  ]);

  const getCombinedTopNote = useCallback((key: string) => combinedTopRankByKey.get(key)?.note || '', [combinedTopRankByKey]);

  // Nhóm TVV chỉ được dựng lại khi dữ liệu Cấu trúc/HĐ thay đổi, không
  // quét tất cả nguồn cho từng nhóm, từng lần thống kê hoặc mở popup.
  const groupTVVCodes = useMemo(() => {
    const groups = new Map<string, Set<string>>();
    const add = (group: string | undefined | null, code: string | undefined | null) => {
      if (!group || !code) return;
      const key = norm(group).toLowerCase();
      const codes = groups.get(key);
      if (codes) codes.add(code);
      else groups.set(key, new Set([code]));
    };
    if (tvvStructList.length > 0) {
      tvvStructList.forEach(member => add(member.maBanNhom, member.agentCode));
    } else {
      contracts.forEach(contract => add(contract.maNhom, contract.agentCode));
      staffList.forEach(member => add(member.maNhom, member.agentCode));
    }
    return groups;
  }, [tvvStructList, contracts, staffList]);

  // Quan trọng: tính CTĐK tham chiếu MỘT lần theo dữ liệu hiện có.
  // Không tính lại toàn bộ chương trình cho từng TVV trong mỗi nhóm.
  const referencePassingAgentCodes = useMemo(() => {
    if (conditionType !== 'tvv_pass_count' || !referenceContestId) return new Set<string>();
    const reference = savedContests.find(contest => contest.id === referenceContestId);
    if (!reference) return new Set<string>();
    return getReferenceContestPassingAgentCodes(
      reference, [...contracts, ...(appData.carryoverContracts || [])], staffList, recruiterList, tvvStructList,
    );
  }, [conditionType, referenceContestId, savedContests, contracts, appData.carryoverContracts, staffList, recruiterList, tvvStructList]);

  // IP+AFYP cũng là phép đếm trên từng TVV, do đó tổng hợp đúng một lần.
  const passingIPAFYPAgentCodes = useMemo(() => {
    if (conditionType !== 'pass_count_ip_afyp') return new Set<string>();
    const totals = new Map<string, { ip: number; afyp: number }>();
    for (const contract of displayContracts) {
      if (!contract.agentCode) continue;
      const value = totals.get(contract.agentCode) || { ip: 0, afyp: 0 };
      value.ip += contract.pdt10DT;
      value.afyp += contract.afyp;
      totals.set(contract.agentCode, value);
    }
    const passing = new Set<string>();
    // Giữ cách tính cho TVV doanh số 0 nếu người dùng đặt cả hai ngưỡng = 0.
    for (const codes of groupTVVCodes.values()) {
      for (const code of codes) {
        const totalsForTvv = totals.get(code);
        if ((totalsForTvv?.ip || 0) >= passCountIPMin && (totalsForTvv?.afyp || 0) >= passCountAFYPMin) {
          passing.add(code);
        }
      }
    }
    return passing;
  }, [conditionType, displayContracts, groupTVVCodes, passCountIPMin, passCountAFYPMin, tvvContractCountMin]);

  const countPassingTVVs = useCallback((group: GroupData, passing: ReadonlySet<string>) => {
    const codes = groupTVVCodes.get(norm(group.maNhom || '').toLowerCase());
    if (!codes) return 0;
    const leaderCode = group.leader?.agentCode || '';
    let count = 0;
    for (const code of codes) {
      if (!includeTNInPassCount && leaderCode && code === leaderCode) continue;
      if (passing.has(code)) count++;
    }
    return count;
  }, [groupTVVCodes, includeTNInPassCount]);

  const getGroupTVVPassCount = useCallback((group: GroupData): number =>
    conditionType === 'tvv_pass_count' && referenceContestId
      ? countPassingTVVs(group, referencePassingAgentCodes)
      : 0,
  [conditionType, referenceContestId, referencePassingAgentCodes, countPassingTVVs]);

  const getGroupTVVPassCountIPAFYP = useCallback((group: GroupData): number =>
    conditionType === 'pass_count_contracts'
      ? getGroupTVVContractDetails(group, displayContracts, staffList, { secondaryIPMin: passCountIPMin, secondaryAFYPMin: passCountAFYPMin, tvvContractCountMin, includeTNInPassCount }, tvvStructList).length
      : conditionType === 'pass_count_ip_afyp'
      ? countPassingTVVs(group, passingIPAFYPAgentCodes)
      : 0,
  [conditionType, passingIPAFYPAgentCodes, countPassingTVVs, displayContracts, staffList, passCountIPMin, passCountAFYPMin, tvvContractCountMin, includeTNInPassCount, tvvStructList]);

  // Tất cả chỉ tiêu phụ được đánh giá độc lập trên cùng đúng một đối tượng.
  // Ví dụ NTD A: mọi TVVm hợp lệ của A cùng tạo Tổng IP, còn Lượt HĐC chỉ
  // đếm các TVVm trong tập đó đạt ngưỡng chuẩn 12 triệu.
  const checkSecondaryTotalCondition = useCallback((entityContracts: Contract[]): SecondaryConditionResult => (
    evaluateSecondaryConditions(entityContracts, {
      useSecondaryCondition,
      secondaryTotalAFYPMin,
      secondaryTotalIPMin,
      secondaryContractCountMin,
      secondaryContractIPMin,
      secondaryLuotHDMin,
      secondaryLuotHDCMin,
      secondaryLuotHDFilter,
      secondaryLuotHDCFilter,
      luotHDThreshold,
      luotHDCTThreshold,
    }, tvvStructList)
  ), [
    useSecondaryCondition,
    secondaryTotalAFYPMin,
    secondaryTotalIPMin,
    secondaryContractCountMin,
    secondaryContractIPMin,
    secondaryLuotHDMin,
    secondaryLuotHDCMin,
    secondaryLuotHDFilter,
    secondaryLuotHDCFilter,
    luotHDThreshold,
    luotHDCTThreshold,
    tvvStructList,
  ]);

  const getTotalFYPBonus = useCallback((): { totalFYP: number; bonus: number; tier: BonusTier | null; remaining: number | null } => {
    const totalFYP = displayContracts.reduce((sum, c) => sum + c.pdt10DT, 0);
    const { tier } = calculateBonus(totalFYP); const remaining = getRemainingToNextTier(totalFYP);
    const bonus = tier ? computeBonusFromTier(tier, totalFYP) : 0;
    return { totalFYP, bonus, tier, remaining };
  }, [displayContracts, calculateBonus, getRemainingToNextTier]);

  const addBonusTier = () => setBonusTiers(previous => [...previous, createBlankBonusTier(crypto.randomUUID(), previous.at(-1)?.bonusType || 'money')]);
  const removeBonusTier = (id: string) => { setBonusTiers(previous => previous.filter((tier) => tier.id !== id)); };
  const updateTopReward = useCallback((index: number, value: number) => {
    setTopRewardAmounts(prev => {
      const next = [...prev];
      while (next.length <= index) next.push(0);
      next[index] = Math.max(0, Number(value) || 0);
      return next;
    });
  }, []);
  const updateBonusTier = (id: string, field: keyof BonusTier, value: string | number | null) => setBonusTiers(previous => previous.map((tier) => (tier.id === id ? { ...tier, [field]: value } : tier)));

  const updateBonusTier2 = (id: string, field: keyof BonusTier, value: string | number | null) => setBonusTiers2(previous => previous.map((tier) => (tier.id === id ? { ...tier, [field]: value } : tier)));

  const addDualPhaseTier = () => {
    setBonusTiers(previous => [...previous, createBlankBonusTier(crypto.randomUUID(), previous.at(-1)?.bonusType || 'money')]);
    setBonusTiers2(previous => [...previous, createBlankBonusTier(crypto.randomUUID(), previous.at(-1)?.bonusType || 'money')]);
  };
  const removeDualPhaseTier = (index: number) => {
    setBonusTiers(previous => previous.filter((_, tierIndex) => tierIndex !== index));
    setBonusTiers2(previous => previous.filter((_, tierIndex) => tierIndex !== index));
  };
  const updateDualPhaseMilestone = (index: number, field: 'minFYP' | 'maxFYP', value: number | null) => {
    setBonusTiers(previous => previous.map((tier, tierIndex) => tierIndex === index ? { ...tier, [field]: value } : tier));
    setBonusTiers2(previous => previous.map((tier, tierIndex) => tierIndex === index ? { ...tier, [field]: value } : tier));
  };

  // Save contest with all new fields
  const handleSaveContest = async () => {
    if (!contestTitle) { toast({ title: 'Lỗi', description: 'Nhập tên chương trình' }); return; }
    if (registeredProgram && (!registeredProgram.rows.length || !registeredProgram.tiers.length)) { toast({title:'Thiếu cấu hình',description:'Nạp Excel đối tượng và ít nhất một mức thưởng.'}); return; }
    if (registeredProgram) { try { decodeRegisteredProgram(registeredProgram); } catch(e) { toast({title:'Cấu hình không hợp lệ',description:String(e)}); return; } }
    setIsSaving(true);
    try {
      const res = await fetch('/api/contests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        title: contestTitle, startDate, endDate, issueDate: issueStartDate || undefined,
        issueEndDate: issueEndDate || null,
        conditionType: registeredProgram ? (registeredProgram.metric === 'ip' ? 'total_ip' : 'total_afyp') : conditionType, targetType: registeredProgram ? (registeredProgram.scope === 'nhom' ? 'nhom' : 'tvv') : (conditionType === 'tvv_pass_count' || (conditionType === 'pass_count_ip_afyp' || conditionType === 'pass_count_contracts')) ? 'nhom' : targetType, bonusTiers: JSON.stringify(bonusTiers),
        posterUrl, participants: JSON.stringify(registeredProgram || subjectCodes),
        usePhase2: registeredProgram || conditionType === 'pass_count_contracts' ? false : usePhase2, phase2StartDate: phase2StartDate || undefined, phase2EndDate: phase2EndDate || undefined,
        bonusTiers2: JSON.stringify(bonusTiers2),
        useSecondaryCondition: registeredProgram ? false : useSecondaryCondition,
        secondaryLuotHDMin, secondaryLuotHDCMin, secondaryLuotHDFilter, secondaryLuotHDCFilter,
        secondaryTotalAFYPMin, secondaryTotalIPMin,
        secondaryContractCountMin, secondaryContractIPMin,
        hideNotAchieved, includeIndividualNTD, includeIndividualTN,
        luotHDThreshold, luotHDCTThreshold, tvv90MaxMonths, tvv90MinIP,
        referenceContestId: referenceContestId || undefined,
        includeTNInPassCount, tvvContractCountMin,
        topN, topNMinIP, topNValueType,
        useTopRanking: supportsCombinedTopRanking(conditionType) ? useTopRanking : false,
        topRewardAmounts: JSON.stringify({
          rewards: topRewardAmounts.slice(0, Math.max(0, topN)),
          eligibilityType: topEligibilityType,
          eligibilityMin: Math.max(0, Number(topEligibilityMin) || 0),
        }),
        filterByEffectiveDate, recruitedAgentScope, recruitmentConfig,
        secondaryIPMin: (conditionType === 'pass_count_ip_afyp' || conditionType === 'pass_count_contracts') ? passCountIPMin : secondaryIPMin,
        secondaryAFYPMin: (conditionType === 'pass_count_ip_afyp' || conditionType === 'pass_count_contracts') ? passCountAFYPMin : secondaryAFYPMin,
      }) });
      if (res.ok) {
        const data = await res.json();
        toast({ title: 'Thành công', description: data.message });
        await Promise.all([
          fetchSavedContests(),
          contestArchiveLoaded ? fetchArchivedContests() : Promise.resolve(),
          reloadAppData(),
        ]);
      }
      else {
        let errMsg = 'Không thể lưu';
        try {
          const errData = await res.json();
          // Ưu tiên hiển thị `details` (lỗi Prisma cụ thể) trước, sau đó mới đến `error` (message chung)
          const detail = errData.details || errData.error || '';
          const code = errData.code ? `[${errData.code}] ` : '';
          errMsg = detail ? `${code}${detail}` : errMsg;
          console.error('[Contest save] Server error:', { status: res.status, body: errData });
        } catch (parseErr) {
          // Response không phải JSON (có thể là HTML error page từ Vercel)
          const txt = await res.text().catch(() => '');
          errMsg = `Lỗi ${res.status}: ${txt.slice(0, 200) || 'phản hồi không hợp lệ'}`;
          console.error('[Contest save] Non-JSON error:', { status: res.status, body: txt.slice(0, 500) });
        }
        toast({ title: 'Lỗi lưu', description: errMsg, variant: 'destructive' });
      }
    } catch (err: any) {
      // "TypeError: Failed to fetch" xảy ra khi request không đến được server:
      //   - Mất mạng / server unreachable
      //   - Vercel function timeout (>60s) → connection bị đóng
      //   - Function crash during cold start
      // Phân biệt rõ để user biết phải làm gì.
      const errStr = String(err?.message || err);
      const isNetworkError = errStr.includes('Failed to fetch') || errStr.includes('NetworkError') || errStr.includes('network');
      const desc = isNetworkError
        ? 'Không kết nối được đến server. Nguyên nhân: mất mạng, server quá tải, hoặc Vercel function timeout (>60s). Vui lòng thử lại sau 1 phút.'
        : errStr;
      toast({ title: 'Lỗi lưu', description: desc, variant: 'destructive' });
      console.error('[Contest save] Network/client error:', err);
    }
    finally { setIsSaving(false); }
  };

  const activeSavedContests = useMemo(
    () => savedContests.filter(contest => !isChotContestTitle(contest.title)),
    [savedContests],
  );
  const archivedSavedContests = useMemo(
    () => savedContests.filter(contest => isChotContestTitle(contest.title)),
    [savedContests],
  );
  const archiveYears = useMemo(() => (
    Array.from(new Set(
      archivedSavedContests
        .map(getContestArchiveYear)
        .filter((year): year is number => year !== null),
    )).sort((a, b) => b - a)
  ), [archivedSavedContests]);
  const activeArchiveYear = selectedArchiveYear && archiveYears.includes(selectedArchiveYear)
    ? selectedArchiveYear
    : archiveYears[0] ?? null;
  const archiveMonthGroups = useMemo(
    () => activeArchiveYear === null
      ? []
      : groupChotContestsByMonth(archivedSavedContests, activeArchiveYear),
    [activeArchiveYear, archivedSavedContests],
  );

  const handleToggleContestArchive = async () => {
    const nextOpen = !contestArchiveOpen;
    setContestArchiveOpen(nextOpen);
    if (nextOpen && !contestArchiveLoaded) await fetchArchivedContests();
  };

  const handleDownloadContestArchiveYear = () => {
    if (activeArchiveYear === null) return;
    const payload = createYearArchivePayload(archivedSavedContests, activeArchiveYear);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `thi-dua-chot-${activeArchiveYear}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    toast({
      title: 'Đã tải kho CHỐT',
      description: `${payload.count} chương trình của năm ${activeArchiveYear}`,
    });
  };

  // Load contest with all new fields
  const handleLoadContest = (contestId: string) => {
    setResultPage(0);
    setSelectedContestId(contestId); const contest = savedContests.find(c => c.id === contestId); if (!contest) return;
    setContestTitle(contest.title); setStartDate(new Date(contest.startDate).toISOString().slice(0, 10)); setEndDate(new Date(contest.endDate).toISOString().slice(0, 10));
    setRegisteredProgram(decodeRegisteredProgram(contest.participants || '[]'));
    setConditionType(contest.conditionType as ConditionType);
    // tvv_pass_count chỉ dành cho nhóm → tự động set targetType = 'nhom'
    setTargetType((contest.conditionType === 'tvv_pass_count' || (contest.conditionType === 'pass_count_ip_afyp' || contest.conditionType === 'pass_count_contracts') ? 'nhom' : (contest.targetType || 'tvv')) as TargetType);
    if (contest.issueDate) setIssueStartDate(new Date(contest.issueDate).toISOString().slice(0, 10)); else setIssueStartDate('');
    setIssueEndDate(contest.issueEndDate ? String(contest.issueEndDate).slice(0, 10) : '');
    try { const tiers = JSON.parse(contest.bonusTiers); if (Array.isArray(tiers)) setBonusTiers(tiers.length > 0 ? tiers : createDefaultBonusTiers()); } catch { setBonusTiers(createDefaultBonusTiers()); }
    // Startup only preloads the lightweight contest summary. Load the potentially
    // large poster only when this particular contest is opened.
    setPosterUrl('');
    void fetchFresh(`/api/contests?id=${encodeURIComponent(contestId)}`)
      .then(res => res.ok ? res.json() : null)
      .then(detail => {
        if (detail?.id === contestId) setPosterUrl(detail.posterUrl || '');
      })
      .catch(() => {});
    try { const parts = JSON.parse(contest.participants || '[]'); if (Array.isArray(parts) && parts.length > 0) setThiDuaSubjects(parts.join('\n')); else setThiDuaSubjects(''); } catch { setThiDuaSubjects(''); }
    // Phase 2
    setUsePhase2(contest.usePhase2 ?? false);
    setPhase2StartDate(contest.phase2StartDate ? new Date(contest.phase2StartDate).toISOString().slice(0, 10) : '');
    setPhase2EndDate(contest.phase2EndDate ? new Date(contest.phase2EndDate).toISOString().slice(0, 10) : '');
    try { const tiers2 = JSON.parse(contest.bonusTiers2 || '[]'); if (Array.isArray(tiers2)) setBonusTiers2(tiers2.length > 0 ? tiers2 : createDefaultBonusTiers('draft-tier-phase2')); } catch { setBonusTiers2(createDefaultBonusTiers('draft-tier-phase2')); }
    // Secondary condition
    setUseSecondaryCondition(contest.useSecondaryCondition ?? false);
    setSecondaryAFYPMin(contest.secondaryAFYPMin ?? 0);
    setSecondaryIPMin(contest.secondaryIPMin ?? 0);
    setSecondaryLuotHDMin(contest.secondaryLuotHDMin ?? 0);
    setSecondaryLuotHDCMin(contest.secondaryLuotHDCMin ?? 0);
    // Giao diện mới dùng một phạm vi chung cho cả hai chỉ tiêu lượt. Với dữ
    // liệu cũ từng lưu lệch nhau, ưu tiên TVVm để không vô tình mở rộng tập tính.
    const savedRoundScope: 'all' | 'tvvm' = contest.secondaryLuotHDFilter === 'tvvm' || contest.secondaryLuotHDCFilter === 'tvvm' ? 'tvvm' : 'all';
    setSecondaryLuotHDFilter(savedRoundScope);
    setSecondaryLuotHDCFilter(savedRoundScope);
    setSecondaryTotalAFYPMin(contest.secondaryTotalAFYPMin ?? 0);
    setSecondaryTotalIPMin(contest.secondaryTotalIPMin ?? 0);
    setSecondaryContractCountMin(contest.secondaryContractCountMin ?? 0);
    setSecondaryContractIPMin(contest.secondaryContractIPMin ?? 0);
    // Options
    setHideNotAchieved(contest.hideNotAchieved ?? false);
    setIncludeIndividualNTD(contest.includeIndividualNTD ?? false);
    setIncludeIndividualTN(contest.includeIndividualTN ?? false);
    // Thresholds
    setLuotHDThreshold(contest.luotHDThreshold ?? 3_000_000);
    setLuotHDCTThreshold(contest.luotHDCTThreshold ?? 12_000_000);
    setTvv90MaxMonths(contest.tvv90MaxMonths ?? 3);
    setTvv90MinIP(contest.tvv90MinIP ?? 12_000_000);
    // Reference contest for tvv_pass_count
    setReferenceContestId(contest.referenceContestId || '');
    setIncludeTNInPassCount(contest.includeTNInPassCount ?? false);
    // Top N mode
    setTopN(contest.topN ?? 3);
    setTopNMinIP(contest.topNMinIP ?? 50_000_000);
    setTopNValueType(contest.topNValueType === 'afyp' ? 'afyp' : 'ip');
    setUseTopRanking(contest.useTopRanking ?? false);
    try {
      const parsedTopRewards = JSON.parse(contest.topRewardAmounts || '[]');
      const rewards = Array.isArray(parsedTopRewards)
        ? parsedTopRewards
        : (Array.isArray(parsedTopRewards?.rewards) ? parsedTopRewards.rewards : []);
      setTopRewardAmounts(rewards.length > 0
        ? rewards.map((value: unknown) => Math.max(0, Number(value) || 0))
        : [1_000_000, 500_000, 300_000]);
      const rawEligibilityType = Array.isArray(parsedTopRewards) ? 'none' : parsedTopRewards?.eligibilityType;
      setTopEligibilityType(rawEligibilityType === 'per_contract_ip' || rawEligibilityType === 'per_contract_afyp' || rawEligibilityType === 'total_ip' || rawEligibilityType === 'total_afyp'
        ? rawEligibilityType
        : 'none');
      setTopEligibilityMin(Array.isArray(parsedTopRewards) ? 0 : Math.max(0, Number(parsedTopRewards?.eligibilityMin) || 0));
    } catch {
      setTopRewardAmounts([1_000_000, 500_000, 300_000]);
      setTopEligibilityType('none');
      setTopEligibilityMin(0);
    }
    // Filter by effective date
    setFilterByEffectiveDate(contest.filterByEffectiveDate ?? false);
    setRecruitedAgentScope(contest.recruitedAgentScope === 'tvvm' ? 'tvvm' : 'all');
    setRecruitmentConfig(contest.recruitmentConfig || {
      subjectScope: 'both', filterByEffectiveDate: false, activityEnabled: false,
      activityMetric: 'total_ip', activityComparator: 'gte', activityThreshold: 0, activityBonusAmount: 0,
    });
    // pass_count_ip_afyp: load IP min + AFYP min (reuse secondaryIPMin + secondaryAFYPMin)
    setTVVContractCountMin(Math.max(1, Math.floor(contest.tvvContractCountMin ?? 2)));
    setPassCountIPMin(contest.secondaryIPMin ?? 6000000);
    setPassCountAFYPMin(contest.secondaryAFYPMin ?? 12000000);
    setTimeout(() => handleSearchRef.current(), 100);
  };

  const handleDeleteContest = async (id: string) => {
    try {
      const res = await fetch(`/api/contests?id=${encodeURIComponent(id)}`, { method: 'DELETE', cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) {
        setSavedContests(prev => prev.filter(contest => contest.id !== id));
        if (selectedContestId === id) setSelectedContestId('');
        await Promise.all([
          fetchSavedContests(),
          contestArchiveLoaded ? fetchArchivedContests() : Promise.resolve(),
          reloadAppData(),
        ]);
        window.dispatchEvent(new Event('nmc-contests-updated'));
        toast({ title: 'Thành công', description: 'Đã xóa' });
      } else {
        const data = await res.json();
        toast({ title: 'Lỗi', description: data.error || 'Không thể xóa', variant: 'destructive' });
      }
    }
    catch { toast({ title: 'Lỗi', description: 'Không thể xóa', variant: 'destructive' }); }
    setDeleteConfirmId(null);
  };

  // handleImportFromUrl removed — data sourced from Quản lý page only

  const handlePrint = () => {
    if (!printRef.current) return; const printWindow = window.open('', '_blank'); if (!printWindow) return;
    const styles = `<style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',Arial,sans-serif;padding:20px;background:white;color:#1a1a1a}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#064e3b;color:white;padding:8px 6px;text-align:center;font-weight:700;font-size:11px}td{padding:6px;border-bottom:1px solid #e5e7eb;font-size:12px;white-space:nowrap}tr:nth-child(even){background:#f9fafb}.bonus-col{background:#ecfdf5;font-weight:700;color:#047857}</style>`;
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">${styles}</head><body>${printRef.current.innerHTML}</body></html>`);
    printWindow.document.close(); setTimeout(() => { printWindow.print(); }, 500);
  };

  const handleCopyText = () => {
    if (registeredProgram) { void navigator.clipboard.writeText(registeredExportRows(computeRegisteredResults(registeredContracts,registeredConfig,registeredProgram,tvvStructList,leadersList),registeredProgram).map(r=>r.join('\t')).join('\n')); return; }
    if (perContractDisplayContracts.length === 0 && nydData.length === 0 && recruitmentRows.length === 0 && tvvTotalRows.length === 0 && groupedData.length === 0) return;
    const sTiers = [...bonusTiers].sort((a, b) => a.minFYP - b.minFYP);
    let text = `🏆 ${contestTitle}\n📅 Từ ${startDate ? formatDate(startDate) : '...'} đến ${(phase2EndDate || endDate) ? formatDate(phase2EndDate || endDate) : '...'}\n🎯 ${getTargetLabel(targetType)}\n━━━━━━━━━━━━━━━━━━━━\n📊 Mức thưởng:\n`;
    sTiers.forEach((t, i) => { text += `  Mức ${i + 1}: ${isActivityRoundMode(conditionType) || isRecruitmentMode(conditionType) ? `${t.minFYP}${t.maxFYP ? ` - ${t.maxFYP}` : ' ↑'} ${isRecruitmentMode(conditionType) ? 'TVVm' : 'lượt'}` : `${formatCurrency(t.minFYP)}${t.maxFYP ? ` - ${formatCurrency(t.maxFYP)}` : ' ↑'}`} → ${formatBonus(t)}\n`; });
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    if (targetType === 'nyd' && isRecruitmentMode(conditionType)) {
      recruitmentRows.forEach((row, idx) => {
        text += `${idx + 1}. ${row.recruiter.nhom || '—'} | ${row.recruiter.agentCode} | ${row.recruiter.agentName} | ${row.recruitCount} TVVm | Thưởng chính: ${formatCurrency(row.baseBonus)}${recruitmentConfig.activityEnabled ? ` | ${row.activityQualifiedCount} TVVm đạt hoạt động | Thưởng thêm: ${formatCurrency(row.activityBonus)}` : ''} | Tổng: ${formatCurrency(row.totalBonus)}\n`;
      });
    } else if (targetType === 'nyd') {
      nydData.map(n => {
        const value = getNYDContestValue(conditionType, isActivityRoundMode(conditionType) ? n.recruitCount : n.recruitFYP, n.ownFYP, n.ownActivityRounds, includeIndividualNTD);
        const { tier } = calculateBonus(value);
        const rewardContracts = getNYDContributingContracts(n.contracts || displayContracts, n.nydCode, includeIndividualNTD, recruitedAgentScope, structureStartDateByCode);
        return { nyd: n, tier: checkSecondaryTotalCondition(rewardContracts).passed ? tier : null, value, rewardContracts };
      }).sort((a, b) => b.value - a.value).forEach(({ nyd: n, tier, value, rewardContracts }, idx) => {
        const displayVal = isActivityRoundMode(conditionType) ? `${value} Lượt` : formatNumber(value);
        if (usePhase2 && phase2StartDate) {
          const phase = calculateEntityPhaseOutcome(rewardContracts, phaseConfig, tvvStructList, n.nydCode);
          text += `${idx + 1}. ${n.nhom || '—'} | ${n.nydCode} | ${n.nydName} | ${displayVal} | GD1: ${formatCurrency(phase.phase1Bonus)} | GD2: ${formatCurrency(phase.phase2Bonus)} | Tổng: ${formatCurrency(phase.phase1Bonus + phase.phase2Bonus)}\n`;
          return;
        }
        text += `${idx + 1}. ${n.nhom || '—'} | ${n.nydCode} | ${n.nydName} | ${n.position || '—'} | ${displayVal} | ${tier ? `Thưởng: ${formatBonusFromContracts(tier, rewardContracts, isActivityRoundMode(conditionType) ? value : n.recruitCount)}` : 'Chưa đạt'}\n`;
      });
    } else if (targetType === 'nhom') {
      [...groupedData].map((g) => {
        const groupPhase = getGroupPhaseBonus(g);
        const tvvPassCount = (conditionType === 'pass_count_ip_afyp' || conditionType === 'pass_count_contracts') ? getGroupTVVPassCountIPAFYP(g) : getGroupTVVPassCount(g);
        const tier = isTVVPassCountMode(conditionType) ? calculateBonus(tvvPassCount).tier : isActivityRoundMode(conditionType) ? calculateActivityRoundBonus(g.activityRounds).tier : calculateBonus(getGroupValue(g)).tier;
        return { group: g, tier: usePhase2 && phase2StartDate && !isTVVPassCountMode(conditionType) ? groupPhase.phase1Tier || groupPhase.phase2Tier : tier, groupPhase, tvvPassCount };
      }).sort((a, b) => {
        const aValue = isTVVPassCountMode(conditionType) ? a.tvvPassCount : isActivityRoundMode(conditionType) ? a.group.activityRounds : getGroupValue(a.group);
        const bValue = isTVVPassCountMode(conditionType) ? b.tvvPassCount : isActivityRoundMode(conditionType) ? b.group.activityRounds : getGroupValue(b.group);
        return bValue - aValue;
      }).forEach(({ group: g, tier: rawTier, groupPhase, tvvPassCount }, idx) => {
        const tier = checkSecondaryTotalCondition(g.contracts).passed ? rawTier : null;
        if (isTVVPassCountMode(conditionType)) {
          // Bảng đơn giản cho TVV đạt thi đua
          const bonusLabel = tier ? `Thưởng: ${formatBonusFromContracts(tier, g.contracts, tvvPassCount)}` : 'Chưa đạt';
          text += `${idx + 1}. ${g.nhom || '—'} | ${g.leader?.agentCode || '—'} | ${g.leader?.agentName || '—'} | ${tvvPassCount} TVV đạt${!includeTNInPassCount ? ' (KO tính TN)' : ''} | ${bonusLabel}\n`;
        } else {
          const valueLabel = isActivityRoundMode(conditionType)
            ? `${g.activityRounds} ${isStandardMode(conditionType) ? 'Lượt chuẩn' : 'Lượt'}`
            : `${getContestMetricLabel(conditionType, topNValueType, 'nhom')}: ${formatNumber(getGroupValue(g))}`;
          const leaderLabel = g.leader ? `${g.leader.agentCode} ${g.leader.agentName} (${g.leader.position || 'TN'})` : '';
          if (usePhase2 && phase2StartDate) {
            text += `${idx + 1}. ${g.nhom || '—'} | ${leaderLabel} | ${valueLabel} | GD1: ${formatCurrency(groupPhase.phase1Bonus)} | GD2: ${formatCurrency(groupPhase.phase2Bonus)} | Tổng: ${formatCurrency(groupPhase.phase1Bonus + groupPhase.phase2Bonus)}\n`;
          } else {
            text += `${idx + 1}. ${g.nhom || '—'} | ${leaderLabel} | ${valueLabel} | ${tier ? `Thưởng: ${formatBonusFromContracts(tier, g.contracts, g.activityRounds)}` : 'Chưa đạt'}\n`;
          }
        }
      });
    } else if (isPerContractMode(conditionType)) {
      const mainColLabel = isAFYP ? 'AFYP' : 'IP';
      perContractDisplayContracts.map((c) => {
        const cValue = getContractValue(c);
        const tier = calculateBonus(cValue).tier;
        const agentTotalIP = displayContracts
          .filter((contract) => contract.agentCode === c.agentCode)
          .reduce((sum, contract) => sum + contract.pdt10DT, 0);
        const phaseInfo = getRowPhaseBonus(cValue, c.pdt10DT, agentTotalIP, c.effectiveDate);
        const passed = checkSecondaryTotalCondition(displayContractsByAgent.get(c.agentCode) || []).passed;
        return { contract: c, cValue, tier: passed ? tier : null, phaseInfo: passed ? phaseInfo : { ...phaseInfo, phase1Bonus: 0, phase2Bonus: 0 }, agentTotalIP };
      }).sort((a, b) => b.cValue - a.cValue).forEach(({ contract: c, cValue, tier, phaseInfo, agentTotalIP }, idx) => {
        const ipRewardBaseLabel = showPerContractIPRewardBase ? ` | IP: ${formatNumber(c.pdt10DT)}` : '';
        if (usePhase2 && phase2StartDate) {
          text += `${idx + 1}. ${c.agentCode} | ${c.agentName} | ${formatDate(c.effectiveDate)} | ${mainColLabel}: ${formatNumber(cValue)}${ipRewardBaseLabel} | GD1: ${formatCurrency(phaseInfo.phase1Bonus)} | GD2: ${formatCurrency(phaseInfo.phase2Bonus)} | Tổng: ${formatCurrency(phaseInfo.phase1Bonus + phaseInfo.phase2Bonus)}\n`;
        } else {
          text += `${idx + 1}. ${c.nhom || '—'} | ${c.agentCode} | ${c.agentName} | ${formatDate(c.effectiveDate)} | ${mainColLabel}: ${formatNumber(cValue)}${ipRewardBaseLabel} | ${tier ? `Thưởng: ${formatBonus(tier, c.pdt10DT, undefined, agentTotalIP)}` : 'Chưa đạt'}\n`;
        }
      });
    } else {
      // total_ip / total_afyp mode: use tvvTotalRows (includes TVV with 0 contracts)
      const isAFYP = conditionType === 'total_afyp' || conditionType === 'per_contract_afyp';
      tvvTotalRows.forEach(({ agent, value, tier: rawTier, phaseInfo }, idx) => {
        const valueLabel = isAFYP ? `AFYP: ${formatNumber(value)}` : `IP: ${formatNumber(value)}`;
        const rewardContracts = displayContracts.filter(contract => contract.agentCode === agent.agentCode);
        const passed = checkSecondaryTotalCondition(rewardContracts).passed;
        const tier = passed ? rawTier : null;
        if (usePhase2 && phase2StartDate) {
          text += `${idx + 1}. ${agent.nhom || '—'} | ${agent.agentCode} | ${agent.agentName} | ${valueLabel} | GD1: ${formatCurrency(passed ? phaseInfo.phase1Bonus : 0)} | GD2: ${formatCurrency(passed ? phaseInfo.phase2Bonus : 0)} | Tổng: ${formatCurrency(passed ? phaseInfo.phase1Bonus + phaseInfo.phase2Bonus : 0)}\n`;
          return;
        }
        text += `${idx + 1}. ${agent.nhom || '—'} | ${agent.agentCode} | ${agent.agentName} | ${valueLabel} | ${tier ? `Thưởng: ${formatBonusFromContracts(tier, rewardContracts, isActivityRoundMode(conditionType) ? value : undefined)}` : 'Chưa đạt'}\n`;
      });
    }
    navigator.clipboard.writeText(text).then(() => toast({ title: 'Đã sao chép!', description: 'Dán vào Zalo/Telegram' })).catch(() => toast({ title: 'Lỗi', description: 'Không thể sao chép', variant: 'destructive' }));
  };

  const handleExport = async () => {
    try {
    if (registeredProgram) { await exportRegisteredTargets(computeRegisteredResults(registeredContracts, registeredConfig, registeredProgram, tvvStructList, leadersList), registeredProgram, contestTitle); return; }
    if (perContractDisplayContracts.length === 0 && nydData.length === 0 && recruitmentRows.length === 0 && groupedData.length === 0 && tvvTotalRows.length === 0) { toast({ title: 'Thông báo', description: 'Không có dữ liệu' }); return; }
    let headers: string[];
    let rows: (string | number)[][];
    let merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];

    // Supplementary total column flags
    const expSecAFYP = showSecondaryAFYPValueColumn;
    const expSecIP = showSecondaryIPValueColumn;
    const expSecLuotHD = showSecondaryRoundColumn && secondaryLuotHDMin > 0;
    const expSecLuotHDC = showSecondaryRoundColumn && secondaryLuotHDCMin > 0;
    const expSecCount = showSecondaryContractCountColumn;
    const extraMetricHeaders: string[] = [
      ...(expSecCount ? [`SL HĐ (≥ ${secondaryContractCountMin} HĐ · IP/HĐ ≥ ${formatContestConditionValue(secondaryContractIPMin)})`] : []),
      ...(expSecLuotHD ? [`Lượt HĐ (≥ ${secondaryLuotHDMin} lượt)`] : []),
      ...(expSecLuotHDC ? [`Lượt HĐC (≥ ${secondaryLuotHDCMin} lượt)`] : []),
    ];
    const extraMetricValues = (sc: SecondaryConditionResult, first = true): (string | number)[] => [
      ...(expSecCount ? [first ? formatContestConditionProgress(sc.qualifyingContractCount, secondaryContractCountMin, 'contract') : ''] : []),
      ...(expSecLuotHD ? [first ? formatContestConditionProgress(sc.luotHD, secondaryLuotHDMin, 'round') : ''] : []),
      ...(expSecLuotHDC ? [first ? formatContestConditionProgress(sc.luotHDC, secondaryLuotHDCMin, 'round') : ''] : []),
    ];
    const secondaryAFYPHeader = `Tổng AFYP (≥ ${formatContestConditionValue(secondaryTotalAFYPMin)})`;
    const secondaryIPHeader = `Tổng IP (≥ ${formatContestConditionValue(secondaryTotalIPMin)})`;
    const exportSecondaryDeficit = (sc: SecondaryConditionResult) => formatSecondaryConditionDeficit(sc, {
      useSecondaryCondition,
      secondaryTotalAFYPMin,
      secondaryTotalIPMin,
      secondaryContractCountMin,
      secondaryContractIPMin,
      secondaryLuotHDMin,
      secondaryLuotHDCMin,
    });

    // Hai cột phục vụ kiểm tra điều kiện NTD: ngày hiệu lực chức vụ của người
    // tuyển dụng và ngày bắt đầu làm việc của TVV được tính vào chương trình.
    const includeEligibilityDateColumns = filterByEffectiveDate && (targetType === 'nyd' || targetType === 'nhom');
    const recruiterEffectiveDateMap = new Map<string, string>();
    for (const recruiter of ntdCandidates) {
      if (recruiter.agentCode && recruiter.ngayHieuLuc) {
        recruiterEffectiveDateMap.set(recruiter.agentCode, recruiter.ngayHieuLuc);
      }
    }
    const recruiterEffectiveDateFor = (recruiterCode: string): string => {
      const date = recruiterEffectiveDateMap.get(recruiterCode);
      return date ? formatDate(date) : '';
    };
    const activityThreshold = isStandardMode(conditionType)
      ? luotHDCTThreshold
      : luotHDThreshold;
    const resultMetricLabel = getContestMetricLabel(conditionType, topNValueType, targetType);
    const qualifyingActivityContracts = (sourceContracts: Contract[]): Contract[] => (
      isActivityRoundMode(conditionType)
        ? filterQualifyingActivityContracts(
            sourceContracts,
            activityThreshold,
            conditionType,
            tvv90MaxMonths,
            tvv90MinIP,
            structureStartDateByCode,
          )
        : sourceContracts
    );
    const tvvStartDateFor = (contract: Contract): string => {
      const date = structureStartDateByCode.get(contract.agentCode.trim().toUpperCase())
        || contract.ngayBatDauLamViec
        || contract.startDate;
      return date ? formatDate(date) : '';
    };
    const getNYDPhaseOutcome = (
      nydCode: string,
      phaseContracts: Contract[],
      tiers: BonusTier[],
    ) => calculateNYDPhaseOutcome(
      phaseContracts,
      nydCode,
      tiers,
      conditionType,
      includeIndividualNTD,
      activityThreshold,
      tvv90MaxMonths,
      tvv90MinIP,
      structureStartDateByCode,
      recruitedAgentScope,
      displayContracts,
    );
    const phaseRewardCell = (tier: BonusTier | null, bonus: number): string | number => {
      if (!tier) return '';
      if (tier.bonusType === 'gift') return tier.bonusText || 'Quà tặng';
      return bonus || '';
    };

    if (targetType === 'nyd' && isRecruitmentMode(conditionType)) {
      headers = ['STT', 'Nhóm', 'Mã NTD', 'Họ tên NTD', 'Chức vụ', 'SL TVVm tuyển', ...(recruitmentConfig.activityEnabled ? ['TVVm đạt hoạt động'] : []), 'Thưởng chính', ...(recruitmentConfig.activityEnabled ? ['Thưởng thêm'] : []), 'Tổng thưởng', 'Danh sách TVVm'];
      rows = recruitmentRows.map((row, idx) => [
        idx + 1, row.recruiter.nhom || '', row.recruiter.agentCode, row.recruiter.agentName,
        row.recruiter.position || '', row.recruitCount,
        ...(recruitmentConfig.activityEnabled ? [row.activityQualifiedCount] : []),
        row.baseBonus,
        ...(recruitmentConfig.activityEnabled ? [row.activityBonus] : []),
        row.totalBonus,
        row.recruits.map(item => `${item.agentCode} - ${item.agentName}`).join('; '),
      ]);
    } else if (targetType === 'nyd') {
      // NTD: mở rộng mỗi NTD thành nhiều dòng, mỗi dòng = 1 HĐ của TVV đóng góp
      const showTVVStartDate = isTVVmMode(conditionType) || includeEligibilityDateColumns;
      const showTVVmContributions = isTVVmMode(conditionType);
      headers = [
        'STT', 'Nhóm', 'Mã ĐL', 'Họ tên NTD',
        ...(includeEligibilityDateColumns ? ['Ngày hiệu lực chức vụ NTD'] : []),
        'Chức vụ', ...(!includeIndividualNTD ? [resultMetricLabel] : []),
        ...(expSecAFYP ? [secondaryAFYPHeader] : []),
        ...(expSecIP ? [secondaryIPHeader] : []),
        ...extraMetricHeaders,
        'Họ tên TVV',
        ...(showTVVStartDate ? ['Ngày bắt đầu làm việc'] : []),
        ...(showTVVmContributions ? ['Mã TVV', 'Tổng IP TVV trong kỳ', 'Lượt TVVm'] : []),
        'Số hợp đồng', 'Ngày hiệu lực', 'Ngày phát hành', 'IP', 'AFYP',
        'Tổng cộng',
        ...(usePhase2
          ? ['Thưởng GD1', 'Thưởng GD2', 'Tổng Thưởng']
          : [...(showRateColumn ? ['Tỷ lệ'] : []), 'Thưởng']),
        'Ghi chú',
      ];
      rows = [];
      merges = [];
      let currentRow = 1; // row 0 = header
      const sortedNYD = [...nydData].sort((a, b) => {
        const aVal = getNYDContestValue(conditionType, isActivityRoundMode(conditionType) ? a.recruitCount : a.recruitFYP, a.ownFYP, a.ownActivityRounds, includeIndividualNTD);
        const bVal = getNYDContestValue(conditionType, isActivityRoundMode(conditionType) ? b.recruitCount : b.recruitFYP, b.ownFYP, b.ownActivityRounds, includeIndividualNTD);
        return bVal - aVal;
      });
      sortedNYD.forEach((n, nIdx) => {
        const value = getNYDContestValue(conditionType, isActivityRoundMode(conditionType) ? n.recruitCount : n.recruitFYP, n.ownFYP, n.ownActivityRounds, includeIndividualNTD);
        const { tier } = calculateBonus(value);
        // Check supplementary total condition
        const nydContracts = getNYDContributingContracts(n.contracts || displayContracts, n.nydCode, includeIndividualNTD, recruitedAgentScope, structureStartDateByCode);
        const sc = checkSecondaryTotalCondition(nydContracts);
        const effectiveTier = sc.passed ? tier : null;
        const p2Start = usePhase2 && phase2StartDate ? new Date(phase2StartDate) : null;
        const phase1Result = p2Start
          ? getNYDPhaseOutcome(n.nydCode, displayContracts.filter(c => new Date(c.effectiveDate) < p2Start), bonusTiers)
          : { bonus: 0, tier: null };
        const phase2Result = p2Start
          ? getNYDPhaseOutcome(n.nydCode, displayContracts.filter(c => new Date(c.effectiveDate) >= p2Start), bonusTiers2)
          : { bonus: 0, tier: null };
        const effectivePhase1Bonus = sc.passed ? phase1Result.bonus : 0;
        const effectivePhase2Bonus = sc.passed ? phase2Result.bonus : 0;
        const hasEffectiveReward = usePhase2
          ? sc.passed && Boolean(phase1Result.tier || phase2Result.tier)
          : Boolean(effectiveTier);
        const rewardNote = hasEffectiveReward ? '' : (!sc.passed ? exportSecondaryDeficit(sc) : 'Chưa đạt mức');
        const startRow = currentRow;
        const countedContracts = getNYDContributingContracts(n.contracts, n.nydCode, includeIndividualNTD, recruitedAgentScope, structureStartDateByCode);
        const contracts = qualifyingActivityContracts(countedContracts);
        // nmc-ntd-standard-export-all-contracts-v1
        // Với Lượt HĐ Chuẩn của NTD: dùng HĐ đạt ngưỡng chỉ để xác định TVV đủ điều kiện,
        // sau đó xuất toàn bộ HĐ trong kỳ của đúng TVV đó. Không thay đổi số lượt/kết quả.
        const contributionDetails = (showTVVmContributions || conditionType === 'activity_round_standard')
          ? expandActivityExportDetails(countedContracts, contracts)
          : null;
        if (contracts.length === 0) {
          // NTD không có HĐ, vẫn ghi 1 dòng
          const row: (string | number)[] = [nIdx + 1, n.nhom || '', n.nydCode, n.nydName];
          if (includeEligibilityDateColumns) row.push(recruiterEffectiveDateFor(n.nydCode));
          row.push(n.position || '');
          if (!includeIndividualNTD) row.push(value);
          if (expSecAFYP) row.push(formatContestConditionProgress(sc.totalAFYP, secondaryTotalAFYPMin));
          if (expSecIP) row.push(formatContestConditionProgress(sc.totalIP, secondaryTotalIPMin));
          row.push(...extraMetricValues(sc));
          row.push('');
          if (showTVVStartDate) row.push('');
          if (showTVVmContributions) row.push('', '', '');
          row.push('', '', '', '', '', value);
          if (usePhase2) {
            row.push(
              sc.passed ? phaseRewardCell(phase1Result.tier, effectivePhase1Bonus) : '',
              sc.passed ? phaseRewardCell(phase2Result.tier, effectivePhase2Bonus) : '',
              effectivePhase1Bonus + effectivePhase2Bonus || '',
            );
          } else {
            if (showRateColumn) row.push(effectiveTier ? formatRate(effectiveTier) : '');
            row.push(effectiveTier ? formatBonusAmountFromContracts(effectiveTier, nydContracts, isActivityRoundMode(conditionType) ? value : n.recruitCount) : '');
          }
          row.push(getCombinedTopNote(`nyd:${n.nydCode}`) || rewardNote);
          rows.push(row);
          currentRow++;
        } else {
          const sortedContracts = contributionDetails
            ? contributionDetails.map(detail => detail.contract)
            : [...contracts].sort((a, b) => b.pdt10DT - a.pdt10DT);
          sortedContracts.forEach((c, cIdx) => {
            const row: (string | number)[] = [
              cIdx === 0 ? nIdx + 1 : '',
              n.nhom || '',
              cIdx === 0 ? n.nydCode : '',
              cIdx === 0 ? n.nydName : '',
            ];
            if (includeEligibilityDateColumns) row.push(cIdx === 0 ? recruiterEffectiveDateFor(n.nydCode) : '');
            row.push(cIdx === 0 ? (n.position || '') : '');
            if (!includeIndividualNTD) row.push(cIdx === 0 ? value : '');
            if (expSecAFYP) row.push(cIdx === 0 ? formatContestConditionProgress(sc.totalAFYP, secondaryTotalAFYPMin) : '');
            if (expSecIP) row.push(cIdx === 0 ? formatContestConditionProgress(sc.totalIP, secondaryTotalIPMin) : '');
            row.push(...extraMetricValues(sc, cIdx === 0));
            row.push(c.agentName || '');
            if (showTVVStartDate) row.push(tvvStartDateFor(c));
            if (showTVVmContributions && contributionDetails) {
              const detail = contributionDetails[cIdx];
              row.push(c.agentCode, detail.totalIP, detail.rounds);
            }
            row.push(
              c.contractNumber || '',
              c.effectiveDate ? formatDate(c.effectiveDate) : '',
              c.issueDate ? formatDate(c.issueDate) : '',
              c.pdt10DT,
              c.afyp,
              cIdx === 0 ? value : '',
            );
            if (usePhase2) {
              row.push(
                cIdx === 0 && sc.passed ? phaseRewardCell(phase1Result.tier, effectivePhase1Bonus) : '',
                cIdx === 0 && sc.passed ? phaseRewardCell(phase2Result.tier, effectivePhase2Bonus) : '',
                cIdx === 0 ? (effectivePhase1Bonus + effectivePhase2Bonus || '') : '',
              );
            } else {
              if (showRateColumn) row.push(cIdx === 0 ? (effectiveTier ? formatRate(effectiveTier) : '') : '');
              row.push(cIdx === 0 ? (effectiveTier ? formatBonusAmountFromContracts(effectiveTier, nydContracts, isActivityRoundMode(conditionType) ? value : n.recruitCount) : '') : '');
            }
            row.push(cIdx === 0 ? (getCombinedTopNote(`nyd:${n.nydCode}`) || rewardNote) : '');
            rows.push(row);
            currentRow++;
          });
          // Merge cells for NTD-level columns
          if (sortedContracts.length > 1) {
            const endRow = currentRow - 1;
            const detailHeaders = new Set([
              'Họ tên TVV', 'Ngày bắt đầu làm việc', 'Số hợp đồng',
              'Mã TVV', 'Tổng IP TVV trong kỳ', 'Lượt TVVm',
              'Ngày hiệu lực', 'Ngày phát hành', 'IP', 'AFYP',
            ]);
            for (let col = 0; col < headers.length; col++) {
              if (!detailHeaders.has(headers[col])) {
                merges.push({ s: { r: startRow, c: col }, e: { r: endRow, c: col } });
              }
            }
          }
        }
      });
    } else if (targetType === 'nhom') {
      // NHÓM
      if (isTVVPassCountMode(conditionType)) {
        // Bảng đơn giản cho TVV đạt thi đua: STT - NHÓM - MÃ TN - HỌ TÊN TN - SL TVV đạt thi đua - THƯỞNG - GHI CHÚ
        const refContestLabel = referenceContestId ? (() => { const rc = savedContests.find(sc => sc.id === referenceContestId); return rc ? ` (${rc.title})` : ''; })() : '';
        const passCountCondLabel = (conditionType === 'pass_count_ip_afyp' || conditionType === 'pass_count_contracts')
          ? ` (IP≥${vndToNgan(passCountIPMin)}k + AFYP≥${vndToNgan(passCountAFYPMin)}k)`
          : refContestLabel || ' (CTĐK)';
        headers = ['STT', 'Nhóm', 'Mã TN', 'Họ tên TN', `SL TVV đủ điều kiện${passCountCondLabel}${!includeTNInPassCount ? ' (KO tính TN)' : ''}`, ...extraMetricHeaders, 'Thưởng', 'Ghi chú'];
        rows = [];
        const sortedGroups = [...groupedData].map((g) => {
          const tvvPassCount = (conditionType === 'pass_count_ip_afyp' || conditionType === 'pass_count_contracts') ? getGroupTVVPassCountIPAFYP(g) : getGroupTVVPassCount(g);
          const tier = calculateBonus(tvvPassCount).tier;
          return { g, tier, tvvPassCount };
        }).sort((a, b) => b.tvvPassCount - a.tvvPassCount);
        sortedGroups.forEach(({ g, tier, tvvPassCount }, gIdx) => {
          const sc = checkSecondaryTotalCondition(g.contracts || []);
          const effectiveTier = sc.passed ? tier : null;
          const remaining = getRemainingToNextTier(tvvPassCount);
          const row: (string | number)[] = [
            gIdx + 1,
            g.nhom || '—',
            g.leader?.agentCode || '',
            g.leader?.agentName || '',
            tvvPassCount,
            ...extraMetricValues(sc),
            effectiveTier ? formatBonusAmountFromContracts(effectiveTier, g.contracts, tvvPassCount) : '',
            !effectiveTier && remaining !== null ? `- ${remaining} TVV` : !effectiveTier ? 'Chưa đạt' : '',
          ];
          rows.push(row);
        });
        merges = [];
      } else {
        // NHÓM: mở rộng mỗi nhóm thành nhiều dòng, mỗi dòng = 1 HĐ của TVV đóng góp
        const showTVVStartDate = isTVVmMode(conditionType) || includeEligibilityDateColumns;
        const groupDetailHeaders = [
          'Họ tên TVV',
          ...(includeEligibilityDateColumns ? ['Ngày hiệu lực chức vụ NTD'] : []),
          ...(showTVVStartDate ? ['Ngày bắt đầu làm việc'] : []),
          'Số hợp đồng', 'Ngày hiệu lực', 'Ngày phát hành', 'IP', 'AFYP',
        ];
        if (usePhase2) {
          headers = ['STT', 'Nhóm', 'Mã TTN', 'Tên TTN', 'Chức vụ', ...(!includeIndividualTN ? [resultMetricLabel] : []), ...(expSecAFYP ? [secondaryAFYPHeader] : []), ...(expSecIP ? [secondaryIPHeader] : []), ...extraMetricHeaders, ...groupDetailHeaders, 'Tổng cộng', 'Thưởng GD1', 'Thưởng GD2', 'Tổng Thưởng', 'Ghi chú'];
        } else {
          headers = ['STT', 'Nhóm', 'Mã TTN', 'Tên TTN', 'Chức vụ', ...(!includeIndividualTN ? [resultMetricLabel] : []), ...(expSecAFYP ? [secondaryAFYPHeader] : []), ...(expSecIP ? [secondaryIPHeader] : []), ...extraMetricHeaders, ...groupDetailHeaders, 'Tổng cộng', ...(showRateColumn ? ['Tỷ lệ'] : []), 'Thưởng', 'Ghi chú'];
        }
        rows = [];
        merges = [];
        let currentRow = 1;
        const sortedGroups = [...groupedData].map((g) => {
          const groupPhase = getGroupPhaseBonus(g);
          const tier = isActivityRoundMode(conditionType) ? calculateActivityRoundBonus(g.activityRounds).tier : calculateBonus(getGroupValue(g)).tier;
          return { g, tier, groupPhase };
        }).sort((a, b) => {
          const aValue = isActivityRoundMode(conditionType) ? a.g.activityRounds : getGroupValue(a.g);
          const bValue = isActivityRoundMode(conditionType) ? b.g.activityRounds : getGroupValue(b.g);
          return bValue - aValue;
        });
        sortedGroups.forEach(({ g, tier, groupPhase }, gIdx) => {
          const startRow = currentRow;
          const contracts = qualifyingActivityContracts(g.contracts || [])
            .slice()
            .sort((a, b) => isActivityRoundMode(conditionType)
              ? b.tinhLuot3tr - a.tinhLuot3tr
              : ((conditionType === 'total_afyp' || conditionType === 'per_contract_afyp') ? b.afyp - a.afyp : b.pdt10DT - a.pdt10DT));
          const groupMetricValue = isActivityRoundMode(conditionType)
            ? g.activityRounds
            : getGroupValue(g);
          const condValue = isActivityRoundMode(conditionType)
            ? `${groupMetricValue} ${isStandardMode(conditionType) ? 'Lượt chuẩn' : 'Lượt'}`
            : groupMetricValue;
          // Check supplementary total condition
          const sc = checkSecondaryTotalCondition(g.contracts || []);
          const effectiveTier = sc.passed ? tier : null;
          const effectiveGroupPhase1Bonus = sc.passed ? groupPhase.phase1Bonus : 0;
          const effectiveGroupPhase2Bonus = sc.passed ? groupPhase.phase2Bonus : 0;
          const groupHasEffectivePhaseTier = sc.passed && Boolean(groupPhase.phase1Tier || groupPhase.phase2Tier);
          const groupPhaseRewardNote = groupHasEffectivePhaseTier
            ? ''
            : (!sc.passed ? exportSecondaryDeficit(sc) : 'Chưa đạt mức');
          if (contracts.length === 0) {
            const row: (string | number)[] = [gIdx + 1, g.nhom || '—', g.leader?.agentCode || '', g.leader?.agentName || '', g.leader?.position || ''];
            if (!includeIndividualTN) row.push(condValue);
            if (expSecAFYP) row.push(formatContestConditionProgress(sc.totalAFYP, secondaryTotalAFYPMin));
            if (expSecIP) row.push(formatContestConditionProgress(sc.totalIP, secondaryTotalIPMin));
            row.push(...extraMetricValues(sc));
            row.push(...groupDetailHeaders.map(() => ''), groupMetricValue);
            if (usePhase2) {
              row.push(
                sc.passed ? phaseRewardCell(groupPhase.phase1Tier, effectiveGroupPhase1Bonus) : '',
                sc.passed ? phaseRewardCell(groupPhase.phase2Tier, effectiveGroupPhase2Bonus) : '',
                effectiveGroupPhase1Bonus + effectiveGroupPhase2Bonus || '',
                getCombinedTopNote(`nhom:${g.maNhom}`) || groupPhaseRewardNote,
              );
            } else {
              if (showRateColumn) row.push(effectiveTier ? formatRate(effectiveTier) : '');
              row.push(effectiveTier ? formatBonusAmountFromContracts(effectiveTier, g.contracts, g.activityRounds) : '', getCombinedTopNote(`nhom:${g.maNhom}`) || (effectiveTier ? '' : (tier ? exportSecondaryDeficit(sc) : 'Chưa đạt mức')));
            }
            rows.push(row);
            currentRow++;
          } else {
            contracts.forEach((c, cIdx) => {
              const row: (string | number)[] = [
                cIdx === 0 ? gIdx + 1 : '',
                cIdx === 0 ? (g.nhom || '—') : '',
                cIdx === 0 ? (g.leader?.agentCode || '') : '',
                cIdx === 0 ? (g.leader?.agentName || '') : '',
                cIdx === 0 ? (g.leader?.position || '') : '',
              ];
              if (!includeIndividualTN) row.push(cIdx === 0 ? condValue : '');
              if (expSecAFYP) row.push(cIdx === 0 ? formatContestConditionProgress(sc.totalAFYP, secondaryTotalAFYPMin) : '');
              if (expSecIP) row.push(cIdx === 0 ? formatContestConditionProgress(sc.totalIP, secondaryTotalIPMin) : '');
              row.push(...extraMetricValues(sc, cIdx === 0));
              row.push(c.agentName || '');
              if (includeEligibilityDateColumns) row.push(recruiterEffectiveDateFor(c.maDaiLyTD || c.recruiterCode || ''));
              if (showTVVStartDate) row.push(tvvStartDateFor(c));
              row.push(
                c.contractNumber || '',
                c.effectiveDate ? formatDate(c.effectiveDate) : '',
                c.issueDate ? formatDate(c.issueDate) : '',
                c.pdt10DT,
                c.afyp,
                cIdx === 0 ? groupMetricValue : '',
              );
              if (usePhase2) {
                row.push(
                  cIdx === 0 && sc.passed ? phaseRewardCell(groupPhase.phase1Tier, effectiveGroupPhase1Bonus) : '',
                  cIdx === 0 && sc.passed ? phaseRewardCell(groupPhase.phase2Tier, effectiveGroupPhase2Bonus) : '',
                  cIdx === 0 ? (effectiveGroupPhase1Bonus + effectiveGroupPhase2Bonus || '') : '',
                  cIdx === 0 ? (getCombinedTopNote(`nhom:${g.maNhom}`) || groupPhaseRewardNote) : '',
                );
              } else {
                if (showRateColumn) row.push(cIdx === 0 ? (effectiveTier ? formatRate(effectiveTier) : '') : '');
                row.push(cIdx === 0 ? (effectiveTier ? formatBonusAmountFromContracts(effectiveTier, g.contracts, g.activityRounds) : '') : '');
                row.push(cIdx === 0 ? (getCombinedTopNote(`nhom:${g.maNhom}`) || (effectiveTier ? '' : (tier ? exportSecondaryDeficit(sc) : 'Chưa đạt mức'))) : '');
              }
              rows.push(row);
              currentRow++;
            });
            // Merge cells cho nhóm
            if (contracts.length > 1) {
              const endRow = currentRow - 1;
              const detailHeaderSet = new Set(groupDetailHeaders);
              for (let col = 0; col < headers.length; col++) {
                if (!detailHeaderSet.has(headers[col])) {
                  merges.push({ s: { r: startRow, c: col }, e: { r: endRow, c: col } });
                }
              }
            }
          }
        });
      }
    } else {
      // TVV
      if (isPerContractMode(conditionType)) {
        // TVV per-contract: thêm Số hợp đồng, Ngày hiệu lực, Ngày phát hành
        const mainColLabel = isAFYP ? 'AFYP' : 'IP';
        if (usePhase2) {
          headers = ['STT', 'Nhóm', 'Mã ĐL', 'Họ tên', 'Số hợp đồng', 'Ngày hiệu lực', 'Ngày phát hành', mainColLabel, ...(useSecondaryCondition && secondaryAFYPMin > 0 && !isAFYP ? [`AFYP (≥ ${formatContestConditionValue(secondaryAFYPMin)})`] : []), ...(useSecondaryCondition && secondaryIPMin > 0 && isAFYP ? [`IP (≥ ${formatContestConditionValue(secondaryIPMin)})`] : []), ...(expSecAFYP ? [secondaryAFYPHeader] : []), ...(expSecIP ? [secondaryIPHeader] : []), ...extraMetricHeaders, 'Thưởng GD1', 'Thưởng GD2', 'Tổng Thưởng', 'Ghi chú'];
          if (showPerContractIPRewardBase && !(useSecondaryCondition && secondaryIPMin > 0 && isAFYP)) {
            headers.splice(headers.indexOf(mainColLabel) + 1, 0, 'IP');
          }
          rows = perContractDisplayContracts.map((c) => {
            const cValue = getContractValue(c);
            // Check supplementary total for this TVV's contracts
            const agentContracts = displayContracts.filter(ac => ac.agentCode === c.agentCode);
            const phaseInfo = getRowPhaseBonus(cValue, c.pdt10DT, sumContractIP(agentContracts), c.effectiveDate);
            const sc = checkSecondaryTotalCondition(agentContracts);
            return { c, cValue, phaseInfo, sc };
          }).sort((a, b) => b.cValue - a.cValue).map(({ c, cValue, phaseInfo, sc }, idx) => {
            const base: (string | number)[] = [idx + 1, c.nhom || '—', c.agentCode, c.agentName, c.contractNumber || '', formatDate(c.effectiveDate), formatDate(c.issueDate), cValue];
            if (useSecondaryCondition && secondaryAFYPMin > 0 && !isAFYP) base.push(c.afyp);
            if (useSecondaryCondition && secondaryIPMin > 0 && isAFYP) base.push(c.pdt10DT);
            if (showPerContractIPRewardBase && !(useSecondaryCondition && secondaryIPMin > 0 && isAFYP)) base.push(c.pdt10DT);
            if (expSecAFYP) base.push(formatContestConditionProgress(sc.totalAFYP, secondaryTotalAFYPMin));
            if (expSecIP) base.push(formatContestConditionProgress(sc.totalIP, secondaryTotalIPMin));
            base.push(...extraMetricValues(sc));
            const phase1Bonus = sc.passed ? phaseInfo.phase1Bonus : 0;
            const phase2Bonus = sc.passed ? phaseInfo.phase2Bonus : 0;
            const hasEffectivePhaseTier = sc.passed && Boolean(phaseInfo.phase1Tier || phaseInfo.phase2Tier);
            const phaseRewardNote = hasEffectivePhaseTier
              ? ''
              : (!sc.passed ? exportSecondaryDeficit(sc) : 'Chưa đạt mức');
            base.push(
              sc.passed ? phaseRewardCell(phaseInfo.phase1Tier, phase1Bonus) : '',
              sc.passed ? phaseRewardCell(phaseInfo.phase2Tier, phase2Bonus) : '',
              phase1Bonus + phase2Bonus || '',
              getCombinedTopNote(`contract:${c.id}`) || phaseRewardNote,
            );
            return base;
          });
        } else {
          headers = ['STT', 'Nhóm', 'Mã ĐL', 'Họ tên', 'Số hợp đồng', 'Ngày hiệu lực', 'Ngày phát hành', mainColLabel, ...(useSecondaryCondition && secondaryAFYPMin > 0 && !isAFYP ? [`AFYP (≥ ${formatContestConditionValue(secondaryAFYPMin)})`] : []), ...(useSecondaryCondition && secondaryIPMin > 0 && isAFYP ? [`IP (≥ ${formatContestConditionValue(secondaryIPMin)})`] : []), ...(expSecAFYP ? [secondaryAFYPHeader] : []), ...(expSecIP ? [secondaryIPHeader] : []), ...extraMetricHeaders, ...(showRateColumn ? ['Tỷ lệ'] : []), 'Thưởng', 'Ghi chú'];
          if (showPerContractIPRewardBase && !(useSecondaryCondition && secondaryIPMin > 0 && isAFYP)) {
            headers.splice(headers.indexOf(mainColLabel) + 1, 0, 'IP');
          }
          rows = perContractDisplayContracts.map((c) => {
            const cValue = getContractValue(c);
            const { tier } = calculateBonus(cValue);
            const agentContracts = displayContracts.filter(ac => ac.agentCode === c.agentCode);
            const sc = checkSecondaryTotalCondition(agentContracts);
            const effectiveTier = sc.passed ? tier : null;
            return { c, cValue, tier, effectiveTier, sc, agentContracts };
          }).sort((a, b) => b.cValue - a.cValue).map(({ c, cValue, tier, effectiveTier, sc, agentContracts }, idx) => {
            const base: (string | number)[] = [idx + 1, c.nhom || '—', c.agentCode, c.agentName, c.contractNumber || '', formatDate(c.effectiveDate), formatDate(c.issueDate), cValue];
            if (useSecondaryCondition && secondaryAFYPMin > 0 && !isAFYP) base.push(c.afyp);
            if (useSecondaryCondition && secondaryIPMin > 0 && isAFYP) base.push(c.pdt10DT);
            if (showPerContractIPRewardBase && !(useSecondaryCondition && secondaryIPMin > 0 && isAFYP)) base.push(c.pdt10DT);
            if (expSecAFYP) base.push(formatContestConditionProgress(sc.totalAFYP, secondaryTotalAFYPMin));
            if (expSecIP) base.push(formatContestConditionProgress(sc.totalIP, secondaryTotalIPMin));
            base.push(...extraMetricValues(sc));
            if (showRateColumn) base.push(effectiveTier ? formatRate(effectiveTier) : '');
            base.push(effectiveTier ? formatBonusAmountFromContracts(effectiveTier, [c], undefined, agentContracts) : '');
            base.push(getCombinedTopNote(`contract:${c.id}`) || (effectiveTier ? '' : (tier ? exportSecondaryDeficit(sc) : 'Chưa đạt mức')));
            return base;
          });
        }
      } else {
        // Các chế độ theo tổng/lượt/Top N: mỗi TVV một dòng và một nhãn đúng chỉ tiêu.
        const isAFYP = conditionType === 'total_afyp' || (isTopNMode(conditionType) && topNValueType === 'afyp');
        const mainMetricHeader = resultMetricLabel;
        const isTopNExp = isTopNMode(conditionType);
        const showTVVStartDate = isTVVmMode(conditionType);
        const sttLabel = isTopNExp ? 'Hạng' : 'STT';
        if (usePhase2) {
          headers = [sttLabel, 'Nhóm', 'Mã ĐL', 'Họ tên', ...(showTVVStartDate ? ['Ngày bắt đầu làm việc'] : []), mainMetricHeader, ...(expSecAFYP ? [secondaryAFYPHeader] : []), ...(expSecIP ? [secondaryIPHeader] : []), ...extraMetricHeaders, 'Tổng cộng', 'Thưởng GD1', 'Thưởng GD2', 'Tổng Thưởng', 'Ghi chú'];
          const grandTotal = tvvTotalRows.reduce((sum, r) => sum + r.value, 0);
          rows = tvvTotalRows.map(({ agent, value, phaseInfo }, idx) => {
            // Check supplementary total condition for this TVV
            const agentContracts = displayContracts.filter(c => c.agentCode === agent.agentCode);
            const sc = checkSecondaryTotalCondition(agentContracts);
            const row: (string | number)[] = [idx + 1, agent.nhom || '—', agent.agentCode, agent.agentName];
            if (showTVVStartDate) {
              const date = structureStartDateByCode.get(agent.agentCode.trim().toUpperCase());
              row.push(date ? formatDate(date) : '');
            }
            row.push(value);
            if (expSecAFYP) row.push(formatContestConditionProgress(sc.totalAFYP, secondaryTotalAFYPMin));
            if (expSecIP) row.push(formatContestConditionProgress(sc.totalIP, secondaryTotalIPMin));
            row.push(...extraMetricValues(sc));
            row.push(idx === 0 ? grandTotal : '');
            const phase1Bonus = sc.passed ? phaseInfo.phase1Bonus : 0;
            const phase2Bonus = sc.passed ? phaseInfo.phase2Bonus : 0;
            const hasEffectivePhaseTier = sc.passed && Boolean(phaseInfo.phase1Tier || phaseInfo.phase2Tier);
            const phaseRewardNote = hasEffectivePhaseTier
              ? ''
              : (!sc.passed ? exportSecondaryDeficit(sc) : 'Chưa đạt mức');
            row.push(
              sc.passed ? phaseRewardCell(phaseInfo.phase1Tier, phase1Bonus) : '',
              sc.passed ? phaseRewardCell(phaseInfo.phase2Tier, phase2Bonus) : '',
              phase1Bonus + phase2Bonus || '',
              getCombinedTopNote(`tvv:${agent.agentCode}`) || phaseRewardNote,
            );
            return row;
          });
          if (tvvTotalRows.length > 1) {
            const totalColumn = headers.indexOf('Tổng cộng');
            merges.push({ s: { r: 1, c: totalColumn }, e: { r: tvvTotalRows.length, c: totalColumn } });
          }
        } else {
          headers = [sttLabel, 'Nhóm', 'Mã ĐL', 'Họ tên', ...(showTVVStartDate ? ['Ngày bắt đầu làm việc'] : []), mainMetricHeader, ...(expSecAFYP ? [secondaryAFYPHeader] : []), ...(expSecIP ? [secondaryIPHeader] : []), ...extraMetricHeaders, 'Tổng cộng', ...(showRateColumn ? ['Tỷ lệ'] : []), 'Thưởng', 'Ghi chú'];
          const grandTotal = tvvTotalRows.reduce((sum, r) => sum + r.value, 0);
          rows = tvvTotalRows.map(({ agent, value, tier }, idx) => {
            const agentContracts = displayContracts.filter(c => c.agentCode === agent.agentCode);
            const sc = checkSecondaryTotalCondition(agentContracts);
            const effectiveTier = sc.passed ? tier : null;
            const row: (string | number)[] = [idx + 1, agent.nhom || '—', agent.agentCode, agent.agentName];
            if (showTVVStartDate) {
              const date = structureStartDateByCode.get(agent.agentCode.trim().toUpperCase());
              row.push(date ? formatDate(date) : '');
            }
            row.push(value);
            if (expSecAFYP) row.push(formatContestConditionProgress(sc.totalAFYP, secondaryTotalAFYPMin));
            if (expSecIP) row.push(formatContestConditionProgress(sc.totalIP, secondaryTotalIPMin));
            row.push(...extraMetricValues(sc));
            row.push(idx === 0 ? grandTotal : '');
            if (showRateColumn) row.push(effectiveTier ? formatRate(effectiveTier) : '');
            row.push(effectiveTier
              ? formatBonusAmountFromContracts(
                  effectiveTier,
                  agentContracts,
                  isActivityRoundMode(conditionType) ? value : undefined,
                )
              : '');
            row.push(getCombinedTopNote(`tvv:${agent.agentCode}`) || (effectiveTier ? '' : (tier ? exportSecondaryDeficit(sc) : 'Chưa đạt mức')));
            return row;
          });
          if (tvvTotalRows.length > 1) {
            const totalColumn = headers.indexOf('Tổng cộng');
            merges.push({ s: { r: 1, c: totalColumn }, e: { r: tvvTotalRows.length, c: totalColumn } });
          }
        }
      }
    }
    if (conditionType === 'pass_count_contracts') {
      headers = ['STT', 'NHÓM', 'MÃ TN', 'HỌ TÊN TN', 'HỌ TÊN TVV HOẠT ĐỘNG', 'NGÀY HL', 'IP', 'AFYP', 'SL TVV HĐ', 'TIỀN THƯỞNG', 'GHI CHÚ'];
      rows = []; merges = [];
      const result = groupedData.map(g => {
        const details = getGroupTVVContractProgress(g, displayContracts, staffList, { secondaryIPMin: passCountIPMin, secondaryAFYPMin: passCountAFYPMin, tvvContractCountMin, includeTNInPassCount }, tvvStructList);
        return { g, details, count: details.filter(agent => agent.qualified).length };
      }).sort((a, b) => b.count - a.count);
      let stt = 0;
      for (const { g, details, count } of result) {
        const tier = calculateBonus(count).tier;
        const reward = tier && checkSecondaryTotalCondition(g.contracts).passed ? formatBonusAmountFromContracts(tier, g.contracts, count) : '';
        if (hideNotAchieved && !reward) continue;
        const firstRow = rows.length + 1;
        const contracts = details.flatMap(agent => agent.contracts.map((contract, index) => ({ contract, note: index === 0 ? formatTVVContractProgressNote(agent.contracts.length, agent.qualified) : '' })));
        for (const [i, detail] of (contracts.length ? contracts : [null]).entries()) {
          const c = detail?.contract;
          rows.push([i === 0 ? ++stt : '', i === 0 ? g.nhom : '', i === 0 ? g.leader?.agentCode || '' : '', i === 0 ? g.leader?.agentName || '' : '', c?.agentName || '—', c ? formatDate(c.effectiveDate) : '', c?.pdt10DT ?? '', c?.afyp ?? '', i === 0 ? count : '', i === 0 ? reward : '', detail?.note || '']);
        }
        const lastRow = rows.length;
        if (lastRow > firstRow) for (const col of [0, 1, 2, 3, 8, 9]) merges.push({ s: { r: firstRow, c: col }, e: { r: lastRow, c: col } });
      }
    }
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    // Auto-size columns
    const colWidths = headers.map((h, i) => {
      const maxLen = Math.max(h.length, ...rows.map(r => String(r[i] || '').length));
      return { wch: Math.min(maxLen + 2, 30) };
    });
    ws['!cols'] = colWidths;
    if (merges.length > 0) ws['!merges'] = merges;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kết quả thi đua');

    // Sheet 2: Chi tiết hợp đồng — thống nhất tên cột theo trang Quản Lý + cột THƯỞNG (gộp ô khi tính tổng)
    if (displayContracts.length > 0) {
      const detailHeaders = ['STT', 'Ban', 'Nhóm', 'Mã Ban/Nhóm', 'Mã ĐL', 'Tên', 'Chức vụ', 'Ngày bắt đầu làm việc', ...(includeEligibilityDateColumns ? ['Ngày hiệu lực chức vụ NTD'] : []), 'Số hợp đồng', 'Ngày hiệu lực', 'Ngày phát hành', 'PĐT + 10% ĐT', 'AFYP', 'AD', 'TÍNH LƯỢT 3 tr', 'MÃ ĐL TD', 'THƯỞNG'];
      // Build detail rows with bonus values for merging
      const needMerge = targetType === 'nhom' || targetType === 'nyd' || (targetType === 'tvv' && !isPerContractMode(conditionType));

      // Helper: compute bonus for a group of contracts (same key = same TVV / same nhóm / same NTD)
      const getBonusForGroup = (groupKey: string): string => {
        if (usePhase2 && phase2StartDate && !isTVVPassCountMode(conditionType)) {
          const entityContracts = targetType === 'nhom' ? groupedData.find(g => g.maNhom === groupKey)?.contracts
            : targetType === 'nyd' ? nydData.find(n => n.nydCode === groupKey)?.contracts
            : displayContracts.filter(c => c.agentCode === groupKey);
          if (!entityContracts) return '';
          const phase = calculateEntityPhaseOutcome(entityContracts, phaseConfig, tvvStructList, targetType === 'nyd' ? groupKey : undefined);
          return phase.phase1Tier || phase.phase2Tier ? formatCurrency(phase.phase1Bonus + phase.phase2Bonus) : '';
        }

        if (targetType === 'nhom') {
          const g = groupedData.find(g => g.maNhom === groupKey);
          if (!g) return '';
          const value = isTVVPassCountMode(conditionType) ? ((conditionType === 'pass_count_ip_afyp' || conditionType === 'pass_count_contracts') ? getGroupTVVPassCountIPAFYP(g) : getGroupTVVPassCount(g)) : isActivityRoundMode(conditionType) ? g.activityRounds : getGroupValue(g);
          const { tier } = isActivityRoundMode(conditionType) ? calculateActivityRoundBonus(value) : calculateBonus(value);
          // Check supplementary condition
          const sc = checkSecondaryTotalCondition(g.contracts || []);
          const effectiveTier = sc.passed ? tier : null;
          return effectiveTier ? formatBonusAmountFromContracts(effectiveTier, g.contracts, isTVVPassCountMode(conditionType) ? value : g.activityRounds) : '';
        }
        if (targetType === 'nyd') {
          const n = nydData.find(n => n.nydCode === groupKey);
          if (!n) return '';
          const value = getNYDContestValue(conditionType, isActivityRoundMode(conditionType) ? n.recruitCount : n.recruitFYP, n.ownFYP, n.ownActivityRounds, includeIndividualNTD);
          const { tier } = calculateBonus(value);
          const nydContracts = getNYDContributingContracts(n.contracts || displayContracts, n.nydCode, includeIndividualNTD, recruitedAgentScope, structureStartDateByCode);
          const sc = checkSecondaryTotalCondition(nydContracts);
          const effectiveTier = sc.passed ? tier : null;
          return effectiveTier ? formatBonusAmountFromContracts(effectiveTier, nydContracts, isActivityRoundMode(conditionType) ? value : n.recruitCount) : '';
        }
        // TVV total mode
        if (targetType === 'tvv' && !isPerContractMode(conditionType)) {
          const tr = tvvTotalRows.find(r => r.agent.agentCode === groupKey);
          if (!tr) return '';
          const agentContracts = displayContracts.filter(c => c.agentCode === groupKey);
          const sc = checkSecondaryTotalCondition(agentContracts);
          const effectiveTier = sc.passed ? tr.tier : null;
          return effectiveTier
            ? formatBonusAmountFromContracts(
                effectiveTier,
                agentContracts,
                isActivityRoundMode(conditionType) ? tr.value : undefined,
              )
            : '';
        }
        return '';
      };

      // Build rows: each contract gets its own row, but THƯỞNG is only shown on first row of group
      type DetailRow = { data: (string | number)[]; groupKey: string };
      const detailContracts = conditionType === 'pass_count_contracts'
        ? groupedData.flatMap(g => getGroupTVVContractProgress(g, displayContracts, staffList, { secondaryIPMin: passCountIPMin, secondaryAFYPMin: passCountAFYPMin, tvvContractCountMin, includeTNInPassCount }, tvvStructList).flatMap(agent => agent.contracts))
        : displayContracts;
      const detailEntries = targetType === 'nyd'
        ? nydData.flatMap(person => getNYDContributingContracts(person.contracts, person.nydCode, includeIndividualNTD, recruitedAgentScope, structureStartDateByCode).map(contract => ({ contract, nydCode: person.nydCode })))
        : detailContracts.map(contract => ({ contract, nydCode: '' }));
      const detailRowData: DetailRow[] = detailEntries.map(({ contract: c, nydCode }) => {
        let groupKey = '';
        let bonusValue: string | number = '';
        if (needMerge) {
          if (targetType === 'nhom') {
            groupKey = c.maNhom || '';
          } else if (targetType === 'nyd') {
            groupKey = nydCode || c.maDaiLyTD || c.recruiterCode || '';
          } else if (targetType === 'tvv' && !isPerContractMode(conditionType)) {
            groupKey = c.agentCode || '';
          }
        } else {
          // TVV per_contract: each contract has its own bonus
          const cValue = getContractValue(c);
          const { tier } = calculateBonus(cValue);
          const agentContracts = displayContracts.filter(ac => ac.agentCode === c.agentCode);
          const sc = checkSecondaryTotalCondition(agentContracts);
          const effectiveTier = sc.passed ? tier : null;
          if (usePhase2 && phase2StartDate) {
            const phase = getRowPhaseBonus(cValue, c.pdt10DT, sumContractIP(agentContracts), c.effectiveDate);
            bonusValue = sc.passed && (phase.phase1Tier || phase.phase2Tier) ? formatCurrency(phase.phase1Bonus + phase.phase2Bonus) : '';
          } else bonusValue = effectiveTier ? formatBonusAmountFromContracts(effectiveTier, [c], undefined, agentContracts) : '';
        }
        return {
          data: [
            0, // STT placeholder, will be set below
            c.ban || '',
            c.nhom || '—' || '',
            c.maNhom || '',
            c.agentCode || '',
            c.agentName || '',
            c.position || '',
            (() => {
              const startDate = isTVVmMode(conditionType)
                ? structureStartDateByCode.get(c.agentCode.trim().toUpperCase())
                : c.ngayBatDauLamViec;
              return startDate ? formatDate(startDate) : '';
            })(),
            ...(includeEligibilityDateColumns ? [recruiterEffectiveDateFor(nydCode || c.maDaiLyTD || c.recruiterCode || '')] : []),
            c.contractNumber || '',
            c.effectiveDate ? formatDate(c.effectiveDate) : '',
            c.issueDate ? formatDate(c.issueDate) : '',
            c.pdt10DT,
            c.afyp,
            c.ad || c.leaderAgentCode || '',
            c.tinhLuot3tr || '',
            c.maDaiLyTD || '',
            bonusValue,
          ],
          groupKey,
        };
      });

      // Set STT
      detailRowData.forEach((r, idx) => { r.data[0] = idx + 1; });

      // Fill THƯỞNG for first row of each group when merging
      const detailMerges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
      if (needMerge) {
        // Group rows by key, preserving order
        const groupFirstRow = new Map<string, number>();
        const groupRowCount = new Map<string, number>();
        detailRowData.forEach((r, idx) => {
          if (!groupFirstRow.has(r.groupKey)) {
            groupFirstRow.set(r.groupKey, idx);
          }
          groupRowCount.set(r.groupKey, (groupRowCount.get(r.groupKey) || 0) + 1);
        });
        // Set bonus value on first row of each group
        for (const [key, firstIdx] of groupFirstRow) {
          const bonus = getBonusForGroup(key);
          detailRowData[firstIdx].data[detailHeaders.length - 1] = bonus;
          // Create merge range for THƯỞNG column if group has > 1 row
          const count = groupRowCount.get(key) || 1;
          if (count > 1) {
            const colIdx = detailHeaders.length - 1; // THƯỞNG is last column
            detailMerges.push({
              s: { r: firstIdx + 1, c: colIdx }, // +1 for header row
              e: { r: firstIdx + count, c: colIdx },
            });
          }
        }
      }

      const detailRows: (string | number)[][] = detailRowData.map(r => r.data);
      const wsDetail = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
      const detailColWidths = detailHeaders.map((h, i) => {
        const maxLen = Math.max(h.length, ...detailRows.map(r => String(r[i] || '').length));
        return { wch: Math.min(maxLen + 2, 30) };
      });
      wsDetail['!cols'] = detailColWidths;
      if (detailMerges.length > 0) {
        wsDetail['!merges'] = detailMerges;
      }
      XLSX.utils.book_append_sheet(wb, wsDetail, 'Chi tiết HĐ');
    }

    const safeContestFileName = (contestTitle || '')
      .trim()
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, ' ')
      .replace(/[. ]+$/g, '')
      .slice(0, 120)
      .trim();
    const exportFileName = safeContestFileName
      ? `${safeContestFileName}.xlsx`
      : `ket_qua_thi_dua_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, exportFileName);
    } catch (err) {
      console.error('[handleExport] Error:', err);
      toast({ title: 'Lỗi xuất Excel', description: String(err), variant: 'destructive' });
    }
  };

  // Helper: inject a <style> tag that hides all scrollbars via CSS for image capture
  const hideScrollbarsStyleId = 'nmc-hide-scrollbars-style';
  const hideAllScrollbars = () => {
    let style = document.getElementById(hideScrollbarsStyleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = hideScrollbarsStyleId;
      style.textContent = `
        * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
        *::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
      `;
      document.head.appendChild(style);
    }
  };
  const restoreAllScrollbars = () => {
    const style = document.getElementById(hideScrollbarsStyleId);
    if (style) style.remove();
  };

  // Download at most two lightweight snapshots. Removing unused rows from a
  // detached clone is important: hiding them in the live table still makes
  // html-to-image walk every row, which can freeze the tab for large contests.
  const handleDownloadImage = async () => {
    setIsDownloadingImage(true);
    try {
      const { getFontEmbedCSS, toBlob } = await import('html-to-image');
      if (resultPage > 0) {
        setResultPage(0);
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      }
      if (!resultContentRef.current) {
        toast({ title: 'Lỗi', description: 'Không có nội dung để tải', variant: 'destructive' });
        return;
      }

      const el = resultContentRef.current;
      const tableRows = el.querySelectorAll('#result-table-container tbody > tr');
      const MAX_ROWS_PER_IMAGE = 20;
      const MAX_IMAGES_PER_DOWNLOAD = 2;
      const maxRowsThisDownload = MAX_ROWS_PER_IMAGE * MAX_IMAGES_PER_DOWNLOAD;
      const imageCount = Math.max(
        1,
        Math.min(MAX_IMAGES_PER_DOWNLOAD, Math.ceil(tableRows.length / MAX_ROWS_PER_IMAGE)),
      );

      const captureRows = async (startRow: number) => {
        const captureRoot = document.createElement('div');
        captureRoot.setAttribute('aria-hidden', 'true');
        captureRoot.style.cssText = 'position:fixed;left:0;top:0;z-index:-2147483647;pointer-events:none;background:#fff;';

        const sourcePrintContent = el.firstElementChild;
        if (!sourcePrintContent) throw new Error('Không tìm thấy nội dung kết quả');

        // The table defines the export width. Never shrink the table to fit
        // the banner: the banner must instead follow the full table width.
        const initialCaptureWidth = 1600;
        const clone = el.cloneNode(false) as HTMLDivElement;
        clone.style.setProperty('width', `${initialCaptureWidth}px`, 'important');
        clone.style.setProperty('max-width', 'none', 'important');
        clone.style.setProperty('overflow', 'visible', 'important');
        clone.style.setProperty('box-sizing', 'border-box', 'important');
        // The capture must end at the last table border, without the
        // popup's px-3 padding appearing after the Ghi chú column.
        clone.style.setProperty('padding-left', '0', 'important');
        clone.style.setProperty('padding-right', '0', 'important');
        // The popup's py-2 creates the white strip above the saved poster.
        clone.style.setProperty('padding-top', '0', 'important');
        const endRow = startRow + MAX_ROWS_PER_IMAGE;

        // Results have CSS classes scoped to the popup. A detached capture root
        // doesn't necessarily satisfy these selectors, so preserve computed colors.
        // Do not add artificial overlay/tint layers.
        const preservePopupAppearance = (source: Element, target: Element, deep = true): void => {
          const computed = window.getComputedStyle(source);
          if (target instanceof HTMLElement) {
            for (const property of [
              'background-color', 'background-image', 'color',
              'border-top-color', 'border-right-color',
              'border-bottom-color', 'border-left-color',
              'font-family', 'font-size', 'font-weight', 'font-style',
              'text-align', 'vertical-align', 'white-space',
            ]) {
              target.style.setProperty(property, computed.getPropertyValue(property), 'important');
            }
          }
          if (deep) {
            const originalChildren = Array.from(source.children);
            const clonedChildren = Array.from(target.children);
            originalChildren.forEach((child, index) => {
              if (clonedChildren[index]) preservePopupAppearance(child, clonedChildren[index]);
            });
          }
        };

        const printClone = sourcePrintContent.cloneNode(false) as HTMLElement;
        printClone.style.setProperty('width', '100%', 'important');
        printClone.style.setProperty('max-width', 'none', 'important');
        printClone.style.setProperty('overflow', 'visible', 'important');
        printClone.style.setProperty('padding-top', '0', 'important');
        printClone.style.setProperty('margin-top', '0', 'important');
        Array.from(sourcePrintContent.children).forEach(child => {
          if (child.id !== 'result-table-container') {
            const copied = child.cloneNode(true) as HTMLElement;
            preservePopupAppearance(child, copied);
            if (child === sourcePrintContent.firstElementChild) {
              copied.style.setProperty('margin-top', '0', 'important');
              copied.style.setProperty('padding-top', '0', 'important');
            }
            // The banner is secondary; preserve its 16:5 ratio but make the table
            // the full-width primary content of the exported image.
            const poster = copied.querySelector<HTMLImageElement>('img[alt="Poster"]');
            if (poster) {
              const posterFrame = poster.parentElement;
              if (posterFrame) {
                posterFrame.style.setProperty('aspect-ratio', '16 / 5', 'important');
                posterFrame.style.setProperty('width', '100%', 'important');
                posterFrame.style.setProperty('max-height', 'none', 'important');
                posterFrame.style.setProperty('overflow', 'hidden', 'important');
              }
              poster.style.setProperty('width', '100%', 'important');
              poster.style.setProperty('height', '100%', 'important');
              poster.style.setProperty('object-fit', 'fill', 'important');
              poster.style.setProperty('display', 'block', 'important');
              poster.style.setProperty('margin', '0', 'important');
            }
            printClone.appendChild(copied);
            return;
          }

          const tableContainerClone = child.cloneNode(false) as HTMLElement;
          const sourceTable = child.querySelector('table');
          if (!sourceTable) {
            const copied = child.cloneNode(true) as HTMLElement;
            preservePopupAppearance(child, copied);
            printClone.appendChild(copied);
            return;
          }

          // Restore all columns even when the popup itself scrolls horizontally.
          const sourceTableWidth = Math.max(
            sourceTable.scrollWidth,
            sourceTable.offsetWidth,
            sourceTable.getBoundingClientRect().width,
            ...Array.from(sourceTable.rows).map(row => row.scrollWidth),
          );
          const tableClone = sourceTable.cloneNode(false) as HTMLTableElement;
          Array.from(sourceTable.children).forEach(section => {
            const sectionClone = section.cloneNode(false) as HTMLElement;
            if (section.tagName === 'TBODY') {
              Array.from(section.children).slice(startRow, endRow).forEach(row => {
                const rowClone = row.cloneNode(true) as HTMLElement;
                preservePopupAppearance(row, rowClone);
                sectionClone.appendChild(rowClone);
              });
            } else {
              Array.from(section.children).forEach(row => {
                const rowClone = row.cloneNode(true) as HTMLElement;
                preservePopupAppearance(row, rowClone);
                sectionClone.appendChild(rowClone);
              });
            }
            preservePopupAppearance(section, sectionClone, false);
            tableClone.appendChild(sectionClone);
          });
          preservePopupAppearance(sourceTable, tableClone, false);
          // Export-specific layout: natural-width table, one line per cell.
          // The popup's column-count CSS zoom is deliberately disabled here.
          tableClone.style.setProperty('zoom', '1', 'important');
          tableClone.style.setProperty('transform', 'none', 'important');
          tableClone.style.setProperty('table-layout', 'auto', 'important');
          tableClone.style.setProperty('width', 'max-content', 'important');
          tableClone.style.setProperty('min-width', 'max-content', 'important');
          tableClone.style.setProperty('max-width', 'none', 'important');
          tableClone.querySelectorAll<HTMLElement>('col').forEach(col => {
            col.style.setProperty('width', 'auto', 'important');
            col.style.setProperty('min-width', '0', 'important');
          });
          // Export-only type scale. The interactive popup contains tiny
          // 8px/9px badge text; all DATA in the PNG must be equally readable.
          const exportBodyFont = '15px';
          const exportHeaderFont = '17px';
          const exportCaptionFont = '12px';
          const measureText = document.createElement('canvas').getContext('2d');
          const isCaptionNode = (node: HTMLElement): boolean =>
            node.matches('small, em, i, .italic, [data-export-caption]') ||
            node.classList.contains('text-[8px]') ||
            node.classList.contains('text-[9px]') ||
            (node.classList.contains('text-[10px]') && node.classList.contains('italic'));
          tableClone.querySelectorAll<HTMLTableCellElement>('th, td').forEach(cell => {
            const isHeader = cell.tagName === 'TH';
            cell.style.setProperty('box-sizing', 'border-box', 'important');
            cell.style.setProperty('width', 'auto', 'important');
            cell.style.setProperty('max-width', 'none', 'important');
            cell.style.setProperty('font-family', 'Arial,Helvetica,sans-serif', 'important');
            cell.style.setProperty('font-size', isHeader ? exportHeaderFont : exportBodyFont, 'important');
            cell.style.setProperty('line-height', '1.3', 'important');
            cell.style.setProperty('padding', isHeader ? '12px 10px' : '7px 9px', 'important');
            cell.style.setProperty('vertical-align', 'middle', 'important');
            cell.style.setProperty('white-space', isHeader ? 'normal' : 'nowrap', 'important');
            cell.style.setProperty('overflow-wrap', 'normal', 'important');
            cell.style.setProperty('word-break', 'keep-all', 'important');
            cell.style.setProperty('hyphens', 'none', 'important');
            cell.style.setProperty('overflow', 'visible', 'important');
            cell.style.setProperty('text-overflow', 'clip', 'important');

            cell.querySelectorAll<HTMLElement>('*').forEach(content => {
              const caption = isHeader && (isCaptionNode(content) ||
                Boolean(content.closest('small, em, i, .italic, [data-export-caption]')));
              content.style.setProperty('font-family', 'Arial,Helvetica,sans-serif', 'important');
              content.style.setProperty('font-size', caption ? exportCaptionFont
                : isHeader ? exportHeaderFont : exportBodyFont, 'important');
              content.style.setProperty('line-height', caption ? '1.35' : '1.3', 'important');
              // Preserve original cell colors and badges, never tiny text.
              content.style.setProperty('white-space', isHeader ? 'normal' : 'nowrap', 'important');
              content.style.setProperty('overflow-wrap', 'normal', 'important');
              content.style.setProperty('word-break', 'keep-all', 'important');
              content.style.setProperty('hyphens', 'none', 'important');
              content.style.setProperty('text-overflow', 'clip', 'important');
              content.style.setProperty('max-width', 'none', 'important');
              if (caption) {
                content.style.setProperty('font-style', 'italic', 'important');
                content.style.setProperty('font-weight', '400', 'important');
              }
            });

            if (isHeader) {
              // Keep complete title/caption words and enough vertical space.
              const title = cell.firstElementChild?.textContent?.trim() || cell.textContent?.trim() || '';
              const caption = Array.from(cell.children).slice(1).map(n => n.textContent || '').join(' ');
              const tokens = (title + ' ' + caption).trim().split(/\s+/).filter(Boolean);
              let longestWordWidth = 0;
              if (measureText) {
                measureText.font = '700 17px Arial';
                for (const token of tokens) {
                  longestWordWidth = Math.max(longestWordWidth, measureText.measureText(token).width);
                }
              }
              const isRewardHeading = /thưởng|thuong/i.test(title);
              const minimum = Math.ceil(Math.max(
                isRewardHeading ? 185 : 132,
                longestWordWidth + 30,
              ));
              cell.style.setProperty('min-width', minimum + 'px', 'important');
              cell.style.setProperty('height', '82px', 'important');
              cell.style.setProperty('font-weight', '700', 'important');
            } else {
              cell.style.setProperty('min-width', '0', 'important');
            }
          });
          // PNG-only column geometry and cell alignment.
          // The general header rule above uses a 132px minimum, which is
          // appropriate for labels but makes the STT column much too wide.
          const exportHeaders = Array.from(tableClone.querySelectorAll<HTMLTableCellElement>('thead tr:first-child th'));
          const normalizedHeader = (value: string): string =>
            value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
              .toLowerCase().replace(/\s+/g, ' ').trim();
          const noteColumnIndex = exportHeaders.findIndex(header =>
            /^ghi chu\b/.test(normalizedHeader(header.textContent || '')));
          const numericColumnIndexes = new Set(
            exportHeaders.flatMap((header, index) => {
              const label = normalizedHeader(header.textContent || '');
              return /^(stt\b|tong (?:ip|afyp|fyp|phi|doanh so|so hd|hop dong|thuong|cong)\b|sl\b|so luong\b|so hd\b|ty le\b|doanh so\b|so tien\b|gia tri\b|diem\b)/.test(label)
                ? [index] : [];
            }),
          );
          const exportSttWidth = '52px';
          const sttHeader = exportHeaders[0];
          if (sttHeader && normalizedHeader(sttHeader.textContent || '') === 'stt') {
            for (const property of ['width', 'min-width', 'max-width']) {
              sttHeader.style.setProperty(property, exportSttWidth, 'important');
            }
            sttHeader.style.setProperty('padding-left', '4px', 'important');
            sttHeader.style.setProperty('padding-right', '4px', 'important');
          }
          tableClone.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach(row => {
            const cells = Array.from(row.cells);
            // Separator / subtotal rows can use colspan and must be preserved.
            if (cells.length !== exportHeaders.length) return;
            cells.forEach((cell, columnIndex) => {
              const isStt = columnIndex === 0 && normalizedHeader(sttHeader?.textContent || '') === 'stt';
              if (isStt) {
                for (const property of ['width', 'min-width', 'max-width']) {
                  cell.style.setProperty(property, exportSttWidth, 'important');
                }
                cell.style.setProperty('padding-left', '4px', 'important');
                cell.style.setProperty('padding-right', '4px', 'important');
              }
              const alignment = columnIndex === noteColumnIndex
                ? 'right'
                : numericColumnIndexes.has(columnIndex) ? 'center' : null;
              if (!alignment) return;
              cell.style.setProperty('text-align', alignment, 'important');
              cell.querySelectorAll<HTMLElement>('*').forEach(content => {
                content.style.setProperty('text-align', alignment, 'important');
                if (content.classList.contains('flex') || content.classList.contains('inline-flex') || content.style.display.includes('flex')) {
                  content.style.setProperty('justify-content',
                    alignment === 'right' ? 'flex-end' : 'center', 'important');
                }
              });
            });
          });
          tableContainerClone.style.setProperty('width', 'max-content', 'important');
          tableContainerClone.style.setProperty('max-width', 'none', 'important');
          tableContainerClone.style.setProperty('overflow', 'visible', 'important');
          tableContainerClone.appendChild(tableClone);
          printClone.appendChild(tableContainerClone);
        });
        clone.appendChild(printClone);

        captureRoot.appendChild(clone);
        document.body.appendChild(captureRoot);
        try {
          // Measure after font loading: widths can grow once Vietnamese glyphs
          // resolve. The right edge must coincide with the table border.
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
          if (document.fonts) {
            await withContestImageTimeout(document.fonts.ready, 3_000, 'Font chưa sẵn sàng').catch(() => undefined);
          }
          const exportTable = clone.querySelector<HTMLTableElement>('#result-table-container table');
          if (exportTable) {
            const intrinsicWidth = Math.ceil(Math.max(
              exportTable.scrollWidth,
              exportTable.getBoundingClientRect().width,
              ...Array.from(exportTable.rows).map(row => row.scrollWidth),
            ));
            const tableBorderWidth = 2; // 1px on each side of result-table-container
            const fullImageWidth = Math.max(640, intrinsicWidth + tableBorderWidth);
            clone.style.setProperty('width', `${fullImageWidth}px`, 'important');
            printClone.style.setProperty('width', '100%', 'important');
            const exportTableContainer = clone.querySelector<HTMLElement>('#result-table-container');
            exportTableContainer?.style.setProperty('width', '100%', 'important');
            // A narrow result table expands to the image edge; wide tables
            // keep their natural size. Never leave an extra 26px at the end.
            exportTable.style.setProperty('width', `${fullImageWidth - tableBorderWidth}px`, 'important');
            exportTable.style.setProperty('min-width', `${intrinsicWidth}px`, 'important');
          }
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
          if (!contestImageFontEmbedCSS) {
            contestImageFontEmbedCSS = await withContestImageTimeout(
              getFontEmbedCSS(clone, { preferredFontFormat: 'woff2' }),
              CONTEST_IMAGE_FONT_TIMEOUT_MS,
              'Nhúng font ảnh quá thời gian',
            ).catch((error) => {
              console.warn('Contest image font embedding skipped:', error);
              return '';
            });
          }

          const exportPixelRatio = Math.min(2, Math.max(1, 8000 / clone.getBoundingClientRect().width));
          const htmlToImageOptions = {
            quality: 1,
            pixelRatio: exportPixelRatio,
            backgroundColor: '#ffffff',
            cacheBust: false,
            skipAutoScale: false,
            ...(contestImageFontEmbedCSS
              ? { fontEmbedCSS: contestImageFontEmbedCSS }
              : { skipFonts: true }),
          };

          try {
            return await withContestImageTimeout(
              toBlob(clone, htmlToImageOptions),
              CONTEST_IMAGE_RENDER_TIMEOUT_MS,
              'Tạo ảnh quá thời gian',
            );
          } catch (primaryError) {
            console.warn('html-to-image failed, using canvas fallback:', primaryError);
            const { default: html2canvas } = await import('html2canvas');
            const canvas = await withContestImageTimeout(
              html2canvas(clone, {
                scale: exportPixelRatio,
                backgroundColor: '#ffffff',
                useCORS: true,
                allowTaint: false,
                imageTimeout: 8_000,
                logging: false,
              }),
              CONTEST_IMAGE_FALLBACK_TIMEOUT_MS,
              'Tạo ảnh dự phòng quá thời gian',
            );
            return await canvasToBlob(canvas);
          }
        } finally {
          captureRoot.remove();
        }
      };

      hideAllScrollbars();
      const blobs: Blob[] = [];
      try {
        for (let imageIndex = 0; imageIndex < imageCount; imageIndex += 1) {
          const blob = await captureRows(imageIndex * MAX_ROWS_PER_IMAGE);
          if (blob) blobs.push(blob);
          // Yield between images so the browser can process input and repaint.
          if (imageIndex + 1 < imageCount) {
            await new Promise<void>(resolve => setTimeout(resolve, 100));
          }
        }
      } finally {
        restoreAllScrollbars();
      }

      if (blobs.length === 0) {
        toast({ title: 'Lỗi', description: 'Không thể tạo ảnh', variant: 'destructive' });
        return;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      for (let index = 0; index < blobs.length; index += 1) {
        const blob = blobs[index];
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = blobs.length === 1
          ? `ket_qua_thi_dua_${dateStr}.png`
          : `ket_qua_thi_dua_${index + 1}_${dateStr}.png`;
        link.href = url;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        if (index + 1 < blobs.length) {
          await new Promise<void>(resolve => setTimeout(resolve, 500));
        }
      }

      const capturedRows = Math.min(tableRows.length, maxRowsThisDownload);
      toast({
        title: 'Thành công',
        description: tableRows.length > capturedRows
          ? `Đã tải 2 ảnh, tối đa 20 dòng/ảnh (${capturedRows}/${tableRows.length} dòng đầu).`
          : blobs.length === 1
            ? `Đã tải 1 ảnh (${capturedRows} dòng).`
            : `Đã tải 2 ảnh, tối đa 20 dòng/ảnh (${capturedRows} dòng).`,
      });
    } catch (error) {
      console.error('Download image error:', error);
      toast({ title: 'Lỗi', description: 'Không thể tải ảnh', variant: 'destructive' });
    } finally {
      setIsDownloadingImage(false);
    }
  };

  // Consolidated stats computation - single useMemo for all derived values
  const stats = useMemo(() => {
    // Tổng IP/AFYP: dùng displayContracts (nguồn duy nhất) cho TẤT CẢ chế độ
    const totalFYP = displayContracts.reduce((sum, c) => sum + c.pdt10DT, 0);

    // TVV stats: theo-HĐ dùng đủ danh sách đối tượng; các chế độ tổng/lượt/Top N
    // dùng tvvTotalRows, vốn đã bao gồm TVV có kết quả 0.
    let tvvAchievedCount: number;
    let tvvTotalBonus: number;
    if (targetType === 'tvv' && !isPerContractMode(conditionType)) {
      tvvAchievedCount = tvvTotalRows.filter(r => {
        const entityContracts = displayContractsByAgent.get(r.agent.agentCode) || [];
        return r.tier && checkSecondaryTotalCondition(entityContracts).passed;
      }).length;
      tvvTotalBonus = tvvTotalRows.reduce((sum, r) => {
        const entityContracts = displayContractsByAgent.get(r.agent.agentCode) || [];
        if (!r.tier || !checkSecondaryTotalCondition(entityContracts).passed) return sum;
        const entityIP = entityContracts.reduce((total, contract) => total + contract.pdt10DT, 0);
        return sum + computeBonusFromTier(r.tier, entityIP, isActivityRoundMode(conditionType) ? r.value : undefined, entityIP);
      }, 0);
    } else {
      const contractValue = (c: Contract) => conditionType === 'per_contract_afyp' ? c.afyp : c.pdt10DT;
      tvvAchievedCount = perContractDisplayContracts.filter(c => {
        const entityContracts = displayContractsByAgent.get(c.agentCode) || [];
        return calculateBonus(contractValue(c)).tier && checkSecondaryTotalCondition(entityContracts).passed;
      }).length;
      tvvTotalBonus = perContractDisplayContracts.reduce((sum, c) => {
        const entityContracts = displayContractsByAgent.get(c.agentCode) || [];
        if (!checkSecondaryTotalCondition(entityContracts).passed) return sum;
        const { tier } = calculateBonus(contractValue(c));
        if (!tier) return sum;
        const totalIP = entityContracts.reduce((total, contract) => total + contract.pdt10DT, 0);
        return sum + computeBonusFromTier(tier, c.pdt10DT, undefined, totalIP);
      }, 0);
    }

    // Nhóm stats
    const nhomAchievedCount = groupedData.filter(g => {
      if (!checkSecondaryTotalCondition(g.contracts).passed) return false;
      if (isTVVPassCountMode(conditionType)) return calculateBonus((conditionType === 'pass_count_ip_afyp' || conditionType === 'pass_count_contracts') ? getGroupTVVPassCountIPAFYP(g) : getGroupTVVPassCount(g)).tier;
      if (isActivityRoundMode(conditionType)) return calculateActivityRoundBonus(g.activityRounds).tier;
      return calculateBonus(getGroupValue(g)).tier;
    }).length;
    const nhomTotalFYP = groupedData.reduce((sum, g) => sum + g.totalFYP, 0);
    const nhomTotalBonus = groupedData.reduce((sum, g) => {
      if (!checkSecondaryTotalCondition(g.contracts).passed) return sum;
      if (isTVVPassCountMode(conditionType)) {
        const passCount = (conditionType === 'pass_count_ip_afyp' || conditionType === 'pass_count_contracts') ? getGroupTVVPassCountIPAFYP(g) : getGroupTVVPassCount(g);
        const { tier } = calculateBonus(passCount);
        return tier ? sum + computeBonusFromContracts(tier, g.contracts, passCount) : sum;
      }
      if (isActivityRoundMode(conditionType)) return sum + getActivityRoundBonusAmount(g.activityRounds, g.totalFYP);
      const value = getGroupValue(g);
      const { tier } = calculateBonus(value);
      return tier ? sum + computeBonusFromTier(tier, g.totalFYP, undefined, g.totalFYP) : sum;
    }, 0);

    // Activity round stats
    const arAchievedCount = isActivityRoundMode(conditionType) ? groupedData.filter(g => (
      calculateActivityRoundBonus(g.activityRounds).tier && checkSecondaryTotalCondition(g.contracts).passed
    )).length : 0;
    const arNotAchievedCount = isActivityRoundMode(conditionType) ? groupedData.length - arAchievedCount : 0;
    const arTotalBonus = isActivityRoundMode(conditionType) ? groupedData.reduce((sum, g) => (
      checkSecondaryTotalCondition(g.contracts).passed
        ? sum + getActivityRoundBonusAmount(g.activityRounds, g.totalFYP)
        : sum
    ), 0) : 0;

    // NYD stats
    const nydAchievedCount = targetType === 'nyd' ? (isRecruitmentMode(conditionType)
      ? recruitmentRows.filter(row => row.totalBonus > 0).length
      : nydData.filter(n => {
      const value = getNYDContestValue(conditionType, isActivityRoundMode(conditionType) ? n.recruitCount : n.recruitFYP, n.ownFYP, n.ownActivityRounds, includeIndividualNTD);
      const entityContracts = getNYDContributingContracts(n.contracts || displayContracts, n.nydCode, includeIndividualNTD, recruitedAgentScope, structureStartDateByCode);
      return calculateBonus(value).tier && checkSecondaryTotalCondition(entityContracts).passed;
    }).length) : 0;
    const nydEntityCount = isRecruitmentMode(conditionType) ? recruitmentRows.length : nydData.length;
    const nydNotAchievedCount = targetType === 'nyd' ? nydEntityCount - nydAchievedCount : 0;
    const nydTotalBonus = targetType === 'nyd' ? (isRecruitmentMode(conditionType)
      ? recruitmentRows.reduce((sum, row) => sum + row.totalBonus, 0)
      : nydData.reduce((sum, n) => {
      const value = getNYDContestValue(conditionType, isActivityRoundMode(conditionType) ? n.recruitCount : n.recruitFYP, n.ownFYP, n.ownActivityRounds, includeIndividualNTD);
      const { tier } = calculateBonus(value);
      const entityContracts = getNYDContributingContracts(n.contracts || displayContracts, n.nydCode, includeIndividualNTD, recruitedAgentScope, structureStartDateByCode);
      if (!tier || !checkSecondaryTotalCondition(entityContracts).passed) return sum;
      const entityIP = entityContracts.reduce((total, contract) => total + contract.pdt10DT, 0);
      return sum + computeBonusFromTier(tier, entityIP, isActivityRoundMode(conditionType) ? value : n.recruitCount, entityIP);
    }, 0)) : 0;

    const tvvAgentCount = targetType === 'tvv'
      ? (isPerContractMode(conditionType) ? perContractDisplayContracts.length : tvvTotalRows.length)
      : displayContracts.length;
    const achievedCount = usePhase2 && phase2Results ? phase2Results.phaseAchievedCount : targetType === 'nyd'
      ? nydAchievedCount
      : targetType === 'nhom'
      ? (isActivityRoundMode(conditionType) ? arAchievedCount : nhomAchievedCount)
      : tvvAchievedCount;
    const notAchievedCount = usePhase2 && phase2Results ? (targetType === 'nyd' ? nydData.length : targetType === 'nhom' ? groupedData.length : tvvAgentCount) - phase2Results.phaseAchievedCount : targetType === 'nyd'
      ? nydNotAchievedCount
      : targetType === 'nhom'
      ? (isActivityRoundMode(conditionType) ? arNotAchievedCount : groupedData.length - nhomAchievedCount)
      : tvvAgentCount - tvvAchievedCount;

    const baseTotalBonus = targetType === 'nyd'
      ? nydTotalBonus
      : targetType === 'nhom'
      ? (isActivityRoundMode(conditionType) ? arTotalBonus : nhomTotalBonus)
      : tvvTotalBonus;
    const totalBonusDisplay = usePhase2 && phase2Results ? phase2Results.totalBonus : baseTotalBonus;
    const displayTotalFYP = targetType === 'nhom' ? nhomTotalFYP : totalFYP;

    // TẤT CẢ chế độ: dùng displayContracts (nguồn duy nhất)
    const totalFYPFromContracts = displayContracts.reduce((sum, c) => sum + c.pdt10DT, 0);
    const totalAFYPFromContracts = displayContracts.reduce((sum, c) => sum + c.afyp, 0);
    const totalFYPValue = totalFYPFromContracts;
    const isTotalModeType = isTotalMode(conditionType) && targetType !== 'nhom';
    const totalValue = isTotalModeType ? (conditionType === 'total_afyp' ? totalAFYPFromContracts : totalFYPValue) : 0;
    const matchedTotalTier = isTotalModeType ? calculateBonus(totalValue).tier : null;
    const totalRemaining = isTotalModeType && matchedTotalTier ? getRemainingToNextTier(totalValue) : null;
    
    return {
      totalFYP, tvvAchievedCount, tvvTotalBonus,
      nhomAchievedCount, nhomTotalFYP, nhomTotalBonus,
      arAchievedCount, arNotAchievedCount, arTotalBonus,
      nydAchievedCount, nydNotAchievedCount, nydTotalBonus,
      achievedCount, notAchievedCount,
      baseTotalBonus, totalBonusDisplay, displayTotalFYP,
      totalFYPValue, totalValue, matchedTotalTier, totalRemaining
    };
  }, [displayContracts, displayContractsByAgent, perContractDisplayContracts, groupedData, nydData, tvvTotalRows, conditionType, targetType, includeIndividualTN, includeIndividualNTD, usePhase2, phase2Results, calculateBonus, calculateActivityRoundBonus, getActivityRoundBonusAmount, getRemainingToNextTier, checkSecondaryTotalCondition, getGroupTVVPassCount, getGroupTVVPassCountIPAFYP]);

  const { totalFYP, tvvAchievedCount, tvvTotalBonus, nhomAchievedCount, nhomTotalFYP, nhomTotalBonus, arAchievedCount, arNotAchievedCount, arTotalBonus, nydAchievedCount, nydNotAchievedCount, nydTotalBonus, achievedCount, notAchievedCount, baseTotalBonus, totalBonusDisplay, displayTotalFYP, totalFYPValue, totalValue, matchedTotalTier, totalRemaining } = stats;

  const sortedTiers = useMemo(() => [...bonusTiers].sort((a, b) => a.minFYP - b.minFYP), [bonusTiers]);
  const showRateColumn = useMemo(() => hasPercentBonus(bonusTiers), [bonusTiers]);
  const showPerContractIPRewardBase = useMemo(
    () => usesPerContractIPPercentReward(conditionType, bonusTiers, usePhase2 ? bonusTiers2 : []),
    [conditionType, bonusTiers, usePhase2, bonusTiers2],
  );

  const showSecondaryRoundColumn = useSecondaryCondition && (secondaryLuotHDMin > 0 || secondaryLuotHDCMin > 0);
  // Mỗi điều kiện bổ sung có cột riêng, kể cả trùng loại với chỉ tiêu chính,
  // để bảng luôn thể hiện đầy đủ từng ngưỡng đang áp dụng.
  const showSecondaryAFYPValueColumn = useSecondaryCondition && secondaryTotalAFYPMin > 0;
  const showSecondaryIPValueColumn = useSecondaryCondition && secondaryTotalIPMin > 0;
  const showSecondaryContractCountColumn = useSecondaryCondition && secondaryContractCountMin > 0;
  // Có hiển thị cột điều kiện bổ sung per-contract (AFYP/IP tối thiểu mỗi HĐ) không?
  const showSecondaryPerContractColumn = useSecondaryCondition && (secondaryAFYPMin > 0 || secondaryIPMin > 0);
  const isAFYP = conditionType === 'per_contract_afyp' || conditionType === 'total_afyp';
  const secondaryConditionOptions = {
    useSecondaryCondition,
    secondaryTotalAFYPMin,
    secondaryTotalIPMin,
    secondaryContractCountMin,
    secondaryContractIPMin,
    secondaryLuotHDMin,
    secondaryLuotHDCMin,
  };
  const secondaryDeficitNote = (secondaryCheck: SecondaryConditionResult) => (
    formatSecondaryConditionDeficit(secondaryCheck, secondaryConditionOptions)
  );
  const renderSecondaryConditionHeadings = () => (<>
    {showSecondaryAFYPValueColumn && <TableHead className="text-yellow-100 min-w-[78px] font-bold uppercase text-center bg-amber-800/60"><div>Tổng AFYP</div><div className="text-[9px] italic text-amber-200 font-normal normal-case">(≥ {formatContestConditionValue(secondaryTotalAFYPMin)})</div></TableHead>}
    {showSecondaryIPValueColumn && <TableHead className="text-yellow-100 min-w-[78px] font-bold uppercase text-center bg-amber-800/60"><div>Tổng IP</div><div className="text-[9px] italic text-amber-200 font-normal normal-case">(≥ {formatContestConditionValue(secondaryTotalIPMin)})</div></TableHead>}
    {showSecondaryContractCountColumn && <TableHead className="text-yellow-100 min-w-[96px] font-bold uppercase text-center bg-orange-800/60"><div>SL HĐ</div><div className="text-[9px] italic text-amber-200 font-normal normal-case">(≥ {secondaryContractCountMin} HĐ · IP/HĐ ≥ {formatContestConditionValue(secondaryContractIPMin)})</div></TableHead>}
    {showSecondaryRoundColumn && secondaryLuotHDMin > 0 && <TableHead className="text-yellow-100 min-w-[74px] font-bold uppercase text-center bg-orange-800/60"><div>Lượt HĐ</div><div className="text-[9px] italic text-amber-200 font-normal normal-case">(≥ {secondaryLuotHDMin} lượt)</div></TableHead>}
    {showSecondaryRoundColumn && secondaryLuotHDCMin > 0 && <TableHead className="text-yellow-100 min-w-[74px] font-bold uppercase text-center bg-orange-800/60"><div>Lượt HĐC</div><div className="text-[9px] italic text-amber-200 font-normal normal-case">(≥ {secondaryLuotHDCMin} lượt)</div></TableHead>}
  </>);
  const renderSecondaryConditionValues = (secondaryCheck: SecondaryConditionResult) => (<>
    {showSecondaryAFYPValueColumn && <TableCell className={`text-right text-xs whitespace-nowrap ${secondaryCheck.totalAFYP >= secondaryTotalAFYPMin ? 'text-emerald-600' : 'text-red-500'}`}>{formatContestConditionProgress(secondaryCheck.totalAFYP, secondaryTotalAFYPMin)}</TableCell>}
    {showSecondaryIPValueColumn && <TableCell className={`text-right text-xs whitespace-nowrap ${secondaryCheck.totalIP >= secondaryTotalIPMin ? 'text-emerald-600' : 'text-red-500'}`}>{formatContestConditionProgress(secondaryCheck.totalIP, secondaryTotalIPMin)}</TableCell>}
    {showSecondaryContractCountColumn && <TableCell className={`text-center text-xs font-semibold whitespace-nowrap ${secondaryCheck.qualifyingContractCount >= secondaryContractCountMin ? 'text-emerald-600' : 'text-red-500'}`}>{formatContestConditionProgress(secondaryCheck.qualifyingContractCount, secondaryContractCountMin, 'contract')}</TableCell>}
    {showSecondaryRoundColumn && secondaryLuotHDMin > 0 && <TableCell className={`text-center text-xs whitespace-nowrap ${secondaryCheck.luotHD >= secondaryLuotHDMin ? 'text-emerald-600' : 'text-red-500'}`}>{formatContestConditionProgress(secondaryCheck.luotHD, secondaryLuotHDMin, 'round')}</TableCell>}
    {showSecondaryRoundColumn && secondaryLuotHDCMin > 0 && <TableCell className={`text-center text-xs whitespace-nowrap ${secondaryCheck.luotHDC >= secondaryLuotHDCMin ? 'text-emerald-600' : 'text-red-500'}`}>{formatContestConditionProgress(secondaryCheck.luotHDC, secondaryLuotHDCMin, 'round')}</TableCell>}
  </>);

  // Calculate and show results popup
  const handleCalculate = () => {
    if (!startDate && !endDate && !issueStartDate && !issueEndDate) { toast({ title: 'Thông báo', description: 'Vui lòng nhập ít nhất một khoảng thời gian' }); return; }
    if (registeredProgram) {
      if (!registeredProgram.rows.length || !registeredProgram.tiers.length) { toast({title:'Thiếu cấu hình',description:'Nạp Excel đối tượng và mức thưởng trước khi tính.'}); return; }
      try { decodeRegisteredProgram(registeredProgram); } catch(e) {toast({title:'Cấu hình không hợp lệ',description:String(e)});return;}
      setIsResultDialogOpen(true); return;
    }
    const results = handleSearch() || [];
    if (results.length === 0 && subjectCodes.length === 0) {
      setFilteredContracts([]);
      toast({ title: 'Thông báo', description: 'Không tìm thấy hợp đồng nào phù hợp' });
      return;
    }
    setResultPage(0);
    setFilteredContracts(results);
    setIsResultDialogOpen(true);
  };

  // Ref luôn trỏ tới handleCalculate mới nhất (có state mới nhất).
  // Cần cho embed-mode autocalc: setTimeout closure capture handleCalculate từ render cũ
  // → khi setTimeout fire, state đã update nhưng closure vẫn dùng handleCalculate cũ với state rỗng
  // → hiện toast "Vui lòng nhập ít nhất một khoảng thời gian" sai.
  // Ref.current được gán lại sau mỗi render → luôn trỏ tới handleCalculate có state mới.
  const handleCalculateRef = useRef(handleCalculate);
  handleCalculateRef.current = handleCalculate;

  // Neon border style like main page
  const neonBorder = 'border border-emerald-500/30 shadow-[0_0_15px_rgba(0,255,136,0.1)] neon-card';

  // ===== EMBED MODE: Auto-load contest + auto-calculate =====
  // Chạy 1 lần khi:
  //   - Đang ở embed mode (isEmbedMode && embedContestId && isAutocalc)
  //   - savedContests và contracts đã load xong (từ AppDataContext)
  //   - Chưa từng trigger autocalc (dùng ref để tránh chạy 2 lần trong StrictMode)
  const autocalcTriggered = useRef(false);
  useEffect(() => {
    if (!isEmbedMode || !embedContestId || !isAutocalc) return;
    if (autocalcTriggered.current) return;
    if (savedContests.length === 0) return; // chưa load saved contests
    if (contracts.length === 0) return;     // chưa load contracts (cần để tính kết quả)
    const contest = savedContests.find(c => c.id === embedContestId);
    if (!contest) return;
    autocalcTriggered.current = true;
    // Force expanded view in embed mode for more space
    setIsResultExpanded(true);
    // Load contest state (dates, conditions, tiers, etc.)
    handleLoadContest(embedContestId);
    // Wait for state to settle (React batches setState in handleLoadContest),
    // then trigger calculate — handleCalculateRef.current() luôn trỏ tới bản handleCalculate
    // có state MỚI NHẤT (sau khi handleLoadContest đã set startDate/endDate).
    // Trước đây dùng handleCalculate() trực tiếp → closure capture bản cũ với state rỗng
    // → toast "Vui lòng nhập ít nhất một khoảng thời gian" bị fire sai.
    setTimeout(() => {
      handleCalculateRef.current();
    }, 500);
  }, [isEmbedMode, embedContestId, isAutocalc, savedContests.length, contracts.length]);

  // Phase 2 per-row bonus calculation helper
  const getRowPhaseBonus = useCallback((metricValue: number, ipBase: number, totalIPBase: number, effectiveDate?: string): { phase1Bonus: number; phase2Bonus: number; phase1Tier: BonusTier | null; phase2Tier: BonusTier | null } => {
    if (!usePhase2 || !phase2StartDate) {
      const { tier } = calculateBonus(metricValue);
      const bonus = tier ? computeBonusFromTier(tier, ipBase, undefined, totalIPBase) : 0;
      return { phase1Bonus: bonus, phase2Bonus: 0, phase1Tier: tier, phase2Tier: null };
    }
    const p2Start = new Date(phase2StartDate);
    const isPhase1 = effectiveDate ? new Date(effectiveDate) < p2Start : true;
    if (isPhase1) {
      const { tier } = calculateBonusWithTiers(metricValue, bonusTiers);
      const bonus = tier ? computeBonusFromTier(tier, ipBase, undefined, totalIPBase) : 0;
      return { phase1Bonus: bonus, phase2Bonus: 0, phase1Tier: tier, phase2Tier: null };
    } else {
      const { tier } = calculateBonusWithTiers(metricValue, bonusTiers2);
      const bonus = tier ? computeBonusFromTier(tier, ipBase, undefined, totalIPBase) : 0;
      return { phase1Bonus: 0, phase2Bonus: bonus, phase1Tier: null, phase2Tier: tier };
    }
  }, [usePhase2, phase2StartDate, calculateBonus, calculateBonusWithTiers, bonusTiers, bonusTiers2]);

  const getGroupPhaseBonus = useCallback((group: GroupData): { phase1Bonus: number; phase2Bonus: number; phase1Tier: BonusTier | null; phase2Tier: BonusTier | null } => {
    if (!usePhase2 || !phase2StartDate) {
      if (isActivityRoundMode(conditionType)) {
        const { tier } = calculateActivityRoundBonus(group.activityRounds);
        const bonus = tier ? computeBonusFromTier(tier, group.totalFYP, group.activityRounds) : 0;
        return { phase1Bonus: bonus, phase2Bonus: 0, phase1Tier: tier, phase2Tier: null };
      } else {
        const value = conditionType === 'total_afyp' || conditionType === 'per_contract_afyp'
          ? group.totalAFYP
          : group.totalFYP;
        const { tier } = calculateBonus(value);
        const bonus = tier ? computeBonusFromTier(tier, group.totalFYP, undefined, group.totalFYP) : 0;
        return { phase1Bonus: bonus, phase2Bonus: 0, phase1Tier: tier, phase2Tier: null };
      }
    }
    return calculateEntityPhaseOutcome(group.contracts, phaseConfig, tvvStructList);
  }, [usePhase2, phase2StartDate, conditionType, calculateBonus, calculateActivityRoundBonus, phaseConfig, tvvStructList]);

  // Build NYD result rows
  const nydResultRows = useMemo(() => {
    if (targetType !== 'nyd') return [];
    return nydData.map(n => {
      const value = getNYDContestValue(conditionType, isActivityRoundMode(conditionType) ? n.recruitCount : n.recruitFYP, n.ownFYP, n.ownActivityRounds, includeIndividualNTD);
      const { tier, tierIndex } = calculateBonus(value);
      const remaining = getRemainingToNextTier(value);
      const entityContracts = getNYDContributingContracts(n.contracts || displayContracts, n.nydCode, includeIndividualNTD, recruitedAgentScope, structureStartDateByCode);
      const secondaryCheck = checkSecondaryTotalCondition(entityContracts);
      const phase = usePhase2 && phase2StartDate ? calculateEntityPhaseOutcome(entityContracts, phaseConfig, tvvStructList, n.nydCode) : null;
      const effectiveTier = phase ? phase.phase1Tier || phase.phase2Tier : secondaryCheck.passed ? tier : null;
      return { nyd: n, tier, tierIndex, remaining, value, secondaryCheck, effectiveTier };
    }).sort((a, b) => b.value - a.value);
  }, [nydData, conditionType, includeIndividualNTD, calculateBonus, getRemainingToNextTier, checkSecondaryTotalCondition, usePhase2, phase2StartDate, phaseConfig, tvvStructList, displayContracts, recruitedAgentScope, structureStartDateByCode]);

  // Prepare the expensive per-contract result once and render only one page in
  // the dialog. Excel/copy calculations continue to use the complete arrays.
  const perContractResultRows = useMemo(() => {
    if (targetType !== 'tvv' || !isPerContractMode(conditionType)) return [];
    return perContractDisplayContracts.map(contract => {
      const cValue = getContractValue(contract);
      const { tier } = calculateBonus(cValue);
      const remaining = getRemainingToNextTier(cValue);
      const agentContracts = displayContractsByAgent.get(contract.agentCode) || [];
      const phaseInfo = getRowPhaseBonus(cValue, contract.pdt10DT, sumContractIP(agentContracts), contract.effectiveDate);
      const secondaryCheck = checkSecondaryTotalCondition(agentContracts);
      const secondaryPassed = secondaryCheck.passed;
      const effectiveTier = secondaryPassed ? (usePhase2 && phase2StartDate ? phaseInfo.phase1Tier || phaseInfo.phase2Tier : tier) : null;
      return { contract, cValue, tier, remaining, phaseInfo, secondaryCheck, secondaryPassed, effectiveTier, agentContracts };
    }).sort((a, b) => b.cValue - a.cValue);
  }, [targetType, conditionType, perContractDisplayContracts, getContractValue, calculateBonus, getRemainingToNextTier, displayContractsByAgent, getRowPhaseBonus, checkSecondaryTotalCondition, usePhase2, phase2StartDate]);

  const filteredPerContractResultRows = useMemo(
    () => hideNotAchieved ? perContractResultRows.filter(row => row.effectiveTier) : perContractResultRows,
    [hideNotAchieved, perContractResultRows],
  );
  const filteredTvvTotalRows = useMemo(
    () => tvvTotalRows.filter(row => (!hideNotAchieved || (row.tier && checkSecondaryTotalCondition(displayContractsByAgent.get(row.agent.agentCode) || []).passed)) && (row.agent.nhom || row.agent.maNhom)),
    [hideNotAchieved, tvvTotalRows, checkSecondaryTotalCondition, displayContractsByAgent],
  );
  const paginatedResultTotal = targetType === 'tvv'
    ? (isPerContractMode(conditionType) ? filteredPerContractResultRows.length : filteredTvvTotalRows.length)
    : 0;
  const resultPageCount = Math.max(1, Math.ceil(paginatedResultTotal / CONTEST_RESULT_PAGE_SIZE));
  const safeResultPage = Math.min(resultPage, resultPageCount - 1);
  const resultPageStart = safeResultPage * CONTEST_RESULT_PAGE_SIZE;
  const visiblePerContractResultRows = useMemo(
    () => filteredPerContractResultRows.slice(resultPageStart, resultPageStart + CONTEST_RESULT_PAGE_SIZE),
    [filteredPerContractResultRows, resultPageStart],
  );
  const visibleTvvTotalRows = useMemo(
    () => filteredTvvTotalRows.slice(resultPageStart, resultPageStart + CONTEST_RESULT_PAGE_SIZE),
    [filteredTvvTotalRows, resultPageStart],
  );

  const renderSavedContestMenuRow = (contest: SavedContest, showStartDate = false) => (
    <div key={contest.id} className="group flex items-center gap-1 rounded-md">
      <button
        className="min-w-0 flex-1 rounded px-2 py-1.5 text-left text-xs text-white/80 transition-colors hover:bg-emerald-600 hover:text-white"
        onClick={() => { handleLoadContest(contest.id); setContestListOpen(false); }}
      >
        <span className="block truncate">{contest.title}</span>
        {showStartDate ? <span className="mt-0.5 block text-[9px] text-emerald-300/55">Bắt đầu {formatDate(contest.startDate)}</span> : null}
      </button>
      {deleteConfirmId === contest.id ? (
        <div className="flex shrink-0 items-center gap-0.5">
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-red-400 hover:bg-red-500/10 hover:text-red-300" onClick={() => handleDeleteContest(contest.id)} aria-label={`Xác nhận xóa ${contest.title}`}>
            <CheckCircle2 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-emerald-300/70 hover:bg-gray-800 hover:text-emerald-200/70" onClick={() => setDeleteConfirmId(null)} aria-label="Hủy xóa">
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="h-5 w-5 shrink-0 p-0 text-white/20 opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100" onClick={() => setDeleteConfirmId(contest.id)} aria-label={`Xóa ${contest.title}`}>
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen ${isEmbedMode ? 'embed-mode bg-white' : 'nmc-contest-skin'}`}>

      {/* Data loaded indicator - top right corner (hidden in embed mode) */}
      {!isEmbedMode && dataLoadedVisible && (
        <div className="fixed top-2 right-2 z-[999] flex items-center gap-1.5 bg-emerald-500/90 text-white px-3 py-1.5 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2 duration-300" style={{ backdropFilter: 'blur(8px)' }}>
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-bold">{dataLoadedCount} HĐ đã tải</span>
        </div>
      )}

      {/* Header (hidden in embed mode) */}
      {!isEmbedMode && (
      <header className="nmc-section-header border-b border-emerald-500/20 bg-[#0e0e18]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-3 py-2.5 flex items-center gap-2">
          <BackButton href="/" size={20} title="Trở về trang chủ" />
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center"><Trophy className="w-4 h-4 text-white" /></div>
          <h1 className="text-lg font-extrabold text-emerald-400 drop-shadow-[0_0_10px_rgba(0,255,136,0.5)] drop-shadow-[0_0_30px_rgba(0,255,136,0.2)]">Tính Thưởng Thi Đua</h1>
          {/* Data status indicator */}
          <div className="ml-auto flex items-center gap-1.5">
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
            ) : contracts.length > 0 ? (
              <div className="flex items-center gap-1" title={`${contracts.length} HĐ đã đồng bộ`}>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400">{contracts.length} HĐ</span>
              </div>
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400/40" />
            )}
            <Button variant="ghost" size="sm" onClick={handleRefreshData} disabled={isLoading} className="h-7 w-7 p-0 text-emerald-400/70 hover:text-emerald-300">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>
      )}

      {/* Main form (hidden in embed mode) */}
      {!isEmbedMode && (
      <main className="nmc-contest-content max-w-5xl mx-auto px-3 py-4 space-y-4 relative page-transition">
        {/* STEP 1: Info */}
        <Card className={`${neonBorder} bg-[#0e1424]/95`}>
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
                <CardTitle className="text-sm text-emerald-400 whitespace-nowrap">Thông tin chương trình</CardTitle>
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                <Popover open={contestListOpen} onOpenChange={setContestListOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-[160px] h-7 text-xs bg-white/5 border-emerald-500/20 text-white hover:bg-emerald-600 justify-start">
                      <BookmarkPlus className="w-3 h-3 mr-1 text-emerald-400 shrink-0" />
                      <span className="truncate">{selectedContestId ? savedContests.find(sc => sc.id === selectedContestId)?.title || 'Đã lưu...' : 'Đã lưu...'}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="max-h-[70vh] w-[320px] overflow-y-auto border-emerald-500/20 bg-[#1a1a2e] p-1.5" align="end">
                    <div className="px-2 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300/60">Dùng thường xuyên</div>
                    {activeSavedContests.length === 0 ? (
                      <div className="py-2 text-center text-xs text-emerald-300/70">Chưa có chương trình thường</div>
                    ) : activeSavedContests.map(contest => renderSavedContestMenuRow(contest))}

                    <div className="my-1.5 h-px bg-emerald-500/15" />
                    <button
                      type="button"
                      onClick={handleToggleContestArchive}
                      className="flex w-full items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-950/20 px-2.5 py-2 text-left transition-colors hover:bg-amber-900/30"
                      aria-expanded={contestArchiveOpen}
                    >
                      <FolderArchive className="h-4 w-4 shrink-0 text-amber-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-amber-200">Kho chương trình CHỐT</span>
                        <span className="block text-[9px] text-amber-200/55">Chỉ tải khi mở · nhóm theo ngày bắt đầu</span>
                      </span>
                      {contestArchiveLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-300" /> : contestArchiveOpen ? <ChevronUp className="h-3.5 w-3.5 text-amber-300" /> : <ChevronDown className="h-3.5 w-3.5 text-amber-300" />}
                    </button>

                    {contestArchiveOpen ? (
                      <div className="mt-1.5 rounded-lg border border-amber-500/15 bg-black/15 p-1.5">
                        {contestArchiveLoading ? (
                          <div className="flex items-center justify-center gap-2 py-4 text-xs text-amber-200/70"><Loader2 className="h-3.5 w-3.5 animate-spin" />Đang tải kho CHỐT...</div>
                        ) : archivedSavedContests.length === 0 ? (
                          <div className="py-4 text-center text-xs text-amber-200/60">Chưa có chương trình bắt đầu bằng CHỐT</div>
                        ) : (
                          <>
                            <div className="mb-1.5 flex items-center gap-1 overflow-x-auto pb-1">
                              {archiveYears.map(year => (
                                <button key={year} type="button" onClick={() => { setSelectedArchiveYear(year); setExpandedArchiveMonth(null); }} className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${activeArchiveYear === year ? 'bg-amber-500 text-slate-950' : 'bg-gray-800 text-amber-200/70 hover:text-amber-100'}`}>{year}</button>
                              ))}
                              <Button type="button" variant="ghost" size="sm" onClick={handleDownloadContestArchiveYear} className="ml-auto h-6 shrink-0 px-2 text-[10px] text-sky-300 hover:bg-sky-500/10 hover:text-sky-200" title={`Tải toàn bộ chương trình CHỐT năm ${activeArchiveYear ?? ''}`}>
                                <Download className="mr-1 h-3 w-3" />Tải cả năm
                              </Button>
                            </div>
                            <div className="space-y-1">
                              {archiveMonthGroups.map(group => {
                                const expanded = expandedArchiveMonth === group.key;
                                return (
                                  <div key={group.key} className="overflow-hidden rounded-md border border-white/5 bg-gray-900/45">
                                    <button type="button" onClick={() => setExpandedArchiveMonth(expanded ? null : group.key)} className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-amber-500/10" aria-expanded={expanded}>
                                      {expanded ? <ChevronUp className="h-3 w-3 text-amber-300" /> : <ChevronDown className="h-3 w-3 text-amber-300" />}
                                      <CalendarRange className="h-3 w-3 text-emerald-300" />
                                      <span className="flex-1 text-[11px] font-semibold text-white/85">{group.label}</span>
                                      <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-200">{group.contests.length}</span>
                                    </button>
                                    {expanded ? <div className="border-t border-white/5 p-1">{group.contests.map(contest => renderSavedContestMenuRow(contest, true))}</div> : null}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    ) : null}
                  </PopoverContent>
                </Popover>
                <Button variant="outline" size="sm" onClick={handleSaveContest} disabled={isSaving} className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-7 text-xs bg-transparent">{isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}Lưu</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-emerald-200">Tên chương trình thi đua</Label>
              <Input value={contestTitle} onChange={(e) => setContestTitle(e.target.value)} className="font-semibold border-gray-600 bg-gray-800 text-white h-9 text-sm w-full" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NeonDatePicker label="Hiệu lực từ" value={startDate} onChange={setStartDate} />
              <NeonDatePicker label="Hiệu lực đến" value={endDate} onChange={setEndDate} />
              <NeonDatePicker label="Phát hành từ" value={issueStartDate} onChange={setIssueStartDate} />
              <NeonDatePicker label="Phát hành đến" value={issueEndDate} onChange={setIssueEndDate} />
            </div>
            <div className="space-y-2 rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-3">
              <div>
                <Label className="text-xs font-bold text-emerald-200">Loại hình thi đua</Label>
                <p className="mt-0.5 text-[10px] text-emerald-300/55">Chọn loại trước; các phần đối tượng, điều kiện và thưởng bên dưới sẽ hiển thị tương ứng.</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                {([
                  ['sales', 'Thi đua doanh số', TrendingUp, 'emerald'],
                  ['recruitment', 'Thi đua tuyển dụng', UserPlus, 'violet'],
                  ['top', 'Thi đua xét TOP', Trophy, 'rose'],
                  ['pass_count', 'Đếm TVV đạt', UserCheck, 'indigo'],
                  ['two_phase', 'Thi đua 2 giai đoạn', Layers, 'sky'],
                ] as const).map(([kind, label, Icon, color]) => {
                  const active = !registeredProgram && contestKind === kind;
                  const activeClass = color === 'violet' ? 'border-violet-300 bg-violet-500/35 text-white' : color === 'rose' ? 'border-rose-300 bg-rose-500/35 text-white' : color === 'indigo' ? 'border-indigo-300 bg-indigo-500/35 text-white' : color === 'sky' ? 'border-sky-300 bg-sky-500/35 text-white' : 'border-emerald-300 bg-emerald-500/35 text-white';
                  return (
                    <button key={kind} type="button" onClick={() => chooseContestKind(kind)} aria-pressed={active}
                      className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-center text-[10px] font-bold leading-tight transition-all ${active ? `${activeClass} ring-1 ring-white/25` : 'border-emerald-500/20 bg-gray-900/55 text-emerald-100/65 hover:border-emerald-400/50 hover:text-emerald-100'}`}>
                      <Icon className="h-4 w-4" /><span>{label}</span>
                    </button>
                  );
                })}
                <button type="button" aria-pressed={!!registeredProgram} onClick={() => { setRegisteredProgram(current => current || defaultRegisteredProgram()); setShowConfig(true); }} className={`rounded-lg border px-2 py-2 text-xs font-bold ${registeredProgram ? 'bg-amber-600 text-white border-amber-300' : 'border-amber-500/40 text-amber-100'}`}>Mục tiêu đăng ký (Excel)</button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* STEP 2: Config - Collapsible (display toggle thay vì conditional render để tránh giật) */}
        <Card className={`${neonBorder} bg-[#0e1424]/95`}>
          <CardHeader className={!showConfig ? 'py-1.5 px-4' : 'pb-2 pt-3 px-4'}>
            <button className="flex items-center justify-between w-full" onClick={() => setShowConfig(!showConfig)}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
                <CardTitle className="text-sm text-emerald-400 whitespace-nowrap">Cấu hình thi đua & Thưởng</CardTitle>
              </div>
              {showConfig ? <ChevronUp className="w-4 h-4 text-emerald-400/60" /> : <ChevronDown className="w-4 h-4 text-emerald-400/60" />}
            </button>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3" style={{ display: showConfig ? 'block' : 'none' }}>
              {registeredProgram ? <RegisteredTargetSetup value={registeredProgram} onChange={setRegisteredProgram} leaders={leadersList} /> : <>
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-amber-200">{contestKindMeta.title}</p>
                <p className="mt-0.5 text-[10px] leading-4 text-amber-100/70">{contestKindMeta.detail}</p>
              </div>
              {/* 1. Đối tượng thi đua - luôn chọn trước điều kiện và hình thức */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-medium text-emerald-200">Đối tượng thi đua</Label>
                  <span className="text-[9px] text-emerald-300/60">Nguồn: Cấu trúc · không lấy từ doanh số</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {([
                    { key: 'allTvv', label: 'Tất cả TVV', desc: 'Trừ BanCa', count: subjectLists.allTvv.length, icon: Users },
                    { key: 'tvvm', label: 'TVVm', desc: '≤ 12 tháng', count: subjectLists.tvvm.length, icon: UserCheck },
                    { key: 'tvvCu', label: 'TVV cũ', desc: 'Trừ TVVm', count: subjectLists.tvvCu.length, icon: Users },
                    { key: 'nhom', label: 'Nhóm', desc: 'DS TB/TN', count: subjectLists.nhom.length, icon: Layers },
                    { key: 'ttn', label: 'TTN', desc: 'DS TTN', count: subjectLists.ttn.length, icon: UserPlus },
                    { key: 'leader', label: 'TB/TN', desc: 'DS TB/TN', count: subjectLists.leader.length, icon: UserCheck },
                    { key: 'ntd', label: 'NTD', desc: 'TN + TTN', count: subjectLists.ntd.length, icon: UserPlus },
                  ]).filter(option => visibleSubjectKeys.has(option.key)).map(option => {
                    const active = selectedSubjectTypes.has(option.key);
                    const Icon = option.icon;
                    return (
                      <button key={option.key} type="button" onClick={() => chooseSubjectType(option.key)}
                        className={`relative min-h-[56px] rounded-lg border px-2 py-1.5 text-left transition-all ${active ? 'border-emerald-300 bg-emerald-500/25 text-white shadow-[0_0_14px_rgba(16,185,129,.2)]' : 'border-emerald-500/20 bg-[#111b2d] text-emerald-100/80 hover:border-emerald-400/60 hover:bg-emerald-500/10'}`}>
                        <div className="flex items-center justify-between gap-1"><span className="flex items-center gap-1 font-bold text-[11px]"><Icon className="h-3.5 w-3.5" />{option.label}</span><span className="text-[9px] tabular-nums opacity-70">{option.count}</span></div>
                        <span className="block mt-0.5 text-[9px] opacity-60">{option.desc}</span>
                      </button>
                    );
                  })}
                  {targetType === 'tvv' && contestKind !== 'recruitment' && contestKind !== 'pass_count' && phongStructList.slice(0, 3).map((phong, index) => {
                    const key = `phong_${phong.maPhong}`;
                    const active = selectedSubjectTypes.has(key);
                    const label = phong.tenPhong || `Phòng ${index + 1}`;
                    const count = subjectLists.phongLists?.[key]?.length || 0;
                    return <button key={key} type="button" onClick={() => chooseSubjectType(key)} className={`relative min-h-[56px] rounded-lg border px-2 py-1.5 text-left transition-all ${active ? 'border-sky-300 bg-sky-500/25 text-white shadow-[0_0_14px_rgba(14,165,233,.2)]' : 'border-sky-500/20 bg-[#111b2d] text-sky-100/80 hover:border-sky-400/60 hover:bg-sky-500/10'}`}><div className="flex items-center justify-between gap-1"><span className="flex items-center gap-1 font-bold text-[11px]"><Users className="h-3.5 w-3.5" />{label}</span><span className="text-[9px] tabular-nums opacity-70">{count}</span></div><span className="block mt-0.5 text-[9px] opacity-60">Tất cả TVV phòng</span></button>;
                  })}
                  <button type="button" onClick={() => setIsSubjectDialogOpen(true)} className="min-h-[56px] rounded-lg border border-amber-400/35 bg-amber-500/10 px-2 py-1.5 text-left text-amber-100 transition-all hover:border-amber-300 hover:bg-amber-500/20"><div className="flex items-center gap-1 font-bold text-[11px]"><Plus className="h-3.5 w-3.5" />Khác</div><span className="block mt-0.5 text-[9px] opacity-70">Thêm mã đại lý</span></button>
                </div>
                <p className="text-[10px] text-emerald-400/50 italic">Chọn một nhóm đối tượng chính. “Khác” có thể cộng thêm mã đại lý vào nhóm đang chọn.</p>
              </div>

              {targetType === 'nyd' && !isRecruitmentMode(conditionType) && (
                <div className="space-y-2 rounded-xl border border-violet-500/30 bg-violet-500/10 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-semibold text-violet-100">Phạm vi số liệu của mỗi NTD / TTN</Label>
                    <span className="text-[9px] text-violet-300/70">Áp dụng cho chỉ tiêu chính và bổ sung</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button type="button" onClick={() => chooseRecruitedAgentScope('all')}
                      className={`rounded-lg border px-2 py-2 text-left transition-all ${recruitedAgentScope === 'all' ? 'border-violet-300 bg-violet-500/35 text-white ring-1 ring-violet-300/30' : 'border-violet-500/20 bg-gray-900/40 text-violet-200/65 hover:border-violet-400/50'}`}>
                      <span className="block text-[11px] font-bold">TVV do NTD tuyển</span>
                      <span className="block text-[9px] opacity-70">Tính tất cả TVV được tuyển bởi chính NTD đó</span>
                    </button>
                    <button type="button" onClick={() => chooseRecruitedAgentScope('tvvm')}
                      className={`rounded-lg border px-2 py-2 text-left transition-all ${recruitedAgentScope === 'tvvm' ? 'border-orange-300 bg-orange-500/35 text-white ring-1 ring-orange-300/30' : 'border-orange-500/20 bg-gray-900/40 text-orange-200/65 hover:border-orange-400/50'}`}>
                      <span className="block text-[11px] font-bold">Chỉ TVVm do NTD tuyển</span>
                      <span className="block text-[9px] opacity-70">TVV mới không quá 12 tháng, theo ngày BĐLV trong Cấu trúc</span>
                    </button>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2">
                    <Checkbox id="filterByEffectiveDateNyd" checked={filterByEffectiveDate} onCheckedChange={(v) => setFilterByEffectiveDate(!!v)} />
                    <Label htmlFor="filterByEffectiveDateNyd" className="cursor-pointer text-[11px] leading-4 text-amber-100/90">
                      Chỉ tính TVV/TVVm được tuyển từ ngày hiệu lực chức vụ gần nhất của chính NTD hoặc TTN đó
                    </Label>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border border-violet-500/20 bg-gray-900/30 p-2">
                    <Checkbox id="includeIndividualNTDScope" checked={includeIndividualNTD} onCheckedChange={(v) => setIncludeIndividualNTD(!!v)} />
                    <Label htmlFor="includeIndividualNTDScope" className="cursor-pointer text-[11px] leading-4 text-violet-100/80">
                      Cộng thêm kết quả cá nhân của NTD/TTN vào kết quả tuyển dụng
                    </Label>
                  </div>
                  <p className="text-[10px] leading-4 text-violet-200/75">
                    Đang tính <b>{getContestMetricLabel(conditionType, topNValueType, 'nyd')}</b> trên <b>{recruitedAgentScope === 'tvvm' ? 'chỉ TVVm' : 'toàn bộ TVV'}</b> do từng NTD/TTN tuyển{filterByEffectiveDate ? ', kể từ ngày hiệu lực chức vụ gần nhất' : ''}{includeIndividualNTD ? ', có cộng cá nhân NTD/TTN' : ', không cộng cá nhân NTD/TTN'}.
                  </p>
                </div>
              )}

              <Separator className="bg-emerald-500/20" />

              {/* 2. Cách xét kết quả - giữ nguyên targetType nghiệp vụ hiện có */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-emerald-200">Cách xét kết quả</Label>
                {contestKind === 'recruitment' ? (
                  <div className="flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-xs font-bold text-violet-100"><UserPlus className="h-4 w-4" /> Cá nhân người tuyển dụng (NTD)</div>
                ) : contestKind === 'pass_count' ? (
                  <div className="flex items-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-3 py-2 text-xs font-bold text-indigo-100"><Layers className="h-4 w-4" /> Nhóm kinh doanh</div>
                ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setTargetType('tvv'); if (isTVVPassCountMode(conditionType)) setConditionType('total_ip'); }}
                    disabled={false}
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer ${
                      targetType === 'tvv'
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-300/50'
                        : 'bg-emerald-500/10 text-emerald-300/60 hover:bg-emerald-500/20 hover:text-emerald-200'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>TVV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('nhom')}
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer ${
                      targetType === 'nhom'
                        ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 ring-2 ring-sky-300/50'
                        : 'bg-sky-500/20 text-sky-300/60 hover:bg-sky-500/30 hover:text-sky-200'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Nhóm</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTargetType('nyd'); if (isTVVPassCountMode(conditionType)) setConditionType('activity_round_standard'); }}
                    disabled={false}
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer ${
                      targetType === 'nyd'
                        ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30 ring-2 ring-violet-300/50'
                        : 'bg-violet-500/20 text-violet-300/60 hover:bg-violet-500/20 hover:text-violet-200'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Cá nhân NTD</span>
                  </button>
                </div>
                )}
                <p className="text-[10px] text-emerald-400/50 italic">
                  {targetType === 'tvv' ? 'Ánh xạ theo mã TVV' : targetType === 'nhom' ? 'Ánh xạ theo tên/mã nhóm' : 'Ánh xạ theo mã đại lý tuyển dụng'}
                </p>
              </div>

              <Separator className="bg-emerald-500/20" />

              {/* 3. Điều kiện thi đua */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-emerald-200">Điều kiện thi đua</Label>
                {(contestKind === 'sales' || contestKind === 'two_phase') && (<>
                {/* Theo HĐ row */}
                <div className="space-y-1.5">
                  <p className="text-[10px] text-emerald-300/70 font-medium uppercase tracking-wider">Theo Hợp đồng</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button type="button" onClick={() => setConditionType('per_contract_ip')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer w-full ${isPerContractMode(conditionType) ? 'bg-emerald-600 text-white shadow-lg brightness-110 ring-2 ring-white/30' : 'bg-emerald-600/50 text-emerald-200 hover:brightness-110 hover:text-white/90'}`}
                    ><FileText className="w-3 h-3 shrink-0" /><span>IP/HĐ</span></button>
                    <button type="button" onClick={() => setConditionType('per_contract_afyp')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer w-full ${conditionType === 'per_contract_afyp' ? 'bg-teal-600 text-white shadow-lg brightness-110 ring-2 ring-white/30' : 'bg-teal-600/50 text-emerald-200 hover:brightness-110 hover:text-white/90'}`}
                    ><FileText className="w-3 h-3 shrink-0" /><span>AFYP/HĐ</span></button>
                  </div>
                </div>
                {/* Tổng row */}
                <div className="space-y-1.5">
                  <p className="text-[10px] text-emerald-300/70 font-medium uppercase tracking-wider">Tổng</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button type="button" onClick={() => setConditionType('total_ip')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer w-full ${conditionType === 'total_ip' ? 'bg-teal-600 text-white shadow-lg brightness-110 ring-2 ring-white/30' : 'bg-teal-600/50 text-emerald-200 hover:brightness-110 hover:text-white/90'}`}
                    ><TrendingUp className="w-3 h-3 shrink-0" /><span>Tổng IP</span></button>
                    <button type="button" onClick={() => setConditionType('total_afyp')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer w-full ${conditionType === 'total_afyp' ? 'bg-cyan-600 text-white shadow-lg brightness-110 ring-2 ring-white/30' : 'bg-cyan-600/50 text-emerald-200 hover:brightness-110 hover:text-white/90'}`}
                    ><TrendingUp className="w-3 h-3 shrink-0" /><span>Tổng AFYP</span></button>
                  </div>
                </div>
                </>)}
                {/* Thi đua tuyển dụng — đếm TVVm từ Cấu trúc theo ngày bắt đầu làm việc */}
                {contestKind === 'recruitment' && <div className="space-y-1.5">
                  <p className="text-[10px] text-violet-300/70 font-medium uppercase tracking-wider">Tuyển dụng</p>
                  <button type="button" onClick={() => { setConditionType('recruitment_count'); setTargetType('nyd'); }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer w-full ${isRecruitmentMode(conditionType) ? 'bg-violet-600 text-white shadow-lg brightness-110 ring-2 ring-white/30' : 'bg-violet-600/50 text-emerald-200 hover:brightness-110 hover:text-white/90'}`}
                  ><UserPlus className="w-3 h-3 shrink-0" /><span>Thi đua tuyển dụng TVVm</span></button>
                  {isRecruitmentMode(conditionType) && (
                    <div className="space-y-2 pl-3 border-l-2 border-violet-500/30">
                      <div className="grid grid-cols-3 gap-1">
                        {([['ttn', 'TTN'], ['leader', 'TB/TN'], ['both', 'Cả hai']] as const).map(([value, label]) => (
                          <button key={value} type="button" onClick={() => setRecruitmentConfig(p => ({ ...p, subjectScope: value }))}
                            className={`rounded-lg py-1.5 text-[10px] font-bold ${recruitmentConfig.subjectScope === value ? 'bg-violet-500 text-white' : 'bg-gray-800 text-violet-200/70'}`}>{label}</button>
                        ))}
                      </div>
                      <p className="text-[9px] text-violet-200/70">Đếm TVVm có ngày bắt đầu làm việc trong thời gian thi đua, đúng mã người tuyển dụng và Ghi chú để trống.</p>
                      <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2">
                        <Checkbox id="recruitmentEffectiveDate" checked={recruitmentConfig.filterByEffectiveDate} onCheckedChange={v => setRecruitmentConfig(p => ({ ...p, filterByEffectiveDate: !!v }))} />
                        <Label htmlFor="recruitmentEffectiveDate" className="text-[10px] text-amber-200 cursor-pointer">Chỉ tính từ ngày hiệu lực chức vụ của cá nhân NTD</Label>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2">
                        <Checkbox id="recruitmentActivity" checked={recruitmentConfig.activityEnabled} onCheckedChange={v => setRecruitmentConfig(p => ({ ...p, activityEnabled: !!v }))} />
                        <Label htmlFor="recruitmentActivity" className="text-[10px] text-emerald-200 cursor-pointer">Thưởng thêm theo hoạt động của TVVm được tuyển</Label>
                      </div>
                      {recruitmentConfig.activityEnabled && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <Select value={recruitmentConfig.activityMetric} onValueChange={value => setRecruitmentConfig(p => ({ ...p, activityMetric: value as 'total_ip' | 'contract_ip' }))}>
                            <SelectTrigger className="h-7 text-[10px] bg-gray-800 border-violet-500/30 text-white"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="total_ip">Tổng IP trong kỳ</SelectItem><SelectItem value="contract_ip">IP từng HĐ</SelectItem></SelectContent>
                          </Select>
                          <Select value={recruitmentConfig.activityComparator} onValueChange={value => setRecruitmentConfig(p => ({ ...p, activityComparator: value as 'gte' | 'lte' }))}>
                            <SelectTrigger className="h-7 text-[10px] bg-gray-800 border-violet-500/30 text-white"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="gte">Từ ngưỡng trở lên</SelectItem><SelectItem value="lte">Từ ngưỡng trở xuống</SelectItem></SelectContent>
                          </Select>
                          <div><Label className="text-[9px] text-violet-300/70">Ngưỡng IP (nđ)</Label><Input type="number" value={vndToNgan(recruitmentConfig.activityThreshold) || ''} onChange={e => setRecruitmentConfig(p => ({ ...p, activityThreshold: nganToVnd(Number(e.target.value) || 0) }))} className="h-7 text-xs bg-gray-800 border-violet-500/30 text-white" /></div>
                          <div><Label className="text-[9px] text-violet-300/70">Thưởng thêm / TVVm (nđ)</Label><Input type="number" value={vndToNgan(recruitmentConfig.activityBonusAmount) || ''} onChange={e => setRecruitmentConfig(p => ({ ...p, activityBonusAmount: nganToVnd(Number(e.target.value) || 0) }))} className="h-7 text-xs bg-gray-800 border-violet-500/30 text-white" /></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>}
                {/* Lượt HĐ - with sub-options and configurable threshold */}
                {(contestKind === 'sales' || contestKind === 'two_phase') && <>
                <div className="space-y-1.5">
                  <p className="text-[10px] text-emerald-300/70 font-medium uppercase tracking-wider">Lượt hoạt động</p>
                  <button type="button" onClick={() => setConditionType(conditionType === 'activity_round_tvvm' ? 'activity_round_tvvm' : 'activity_round')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer w-full ${conditionType === 'activity_round' || conditionType === 'activity_round_tvvm' ? 'bg-amber-600 text-white shadow-lg brightness-110 ring-2 ring-white/30' : 'bg-amber-600/50 text-emerald-200 hover:brightness-110 hover:text-white/90'}`}
                  ><Users className="w-3 h-3 shrink-0" /><span>Lượt HĐ</span><span className="text-[9px] opacity-60">(TÍNH LƯỢT 3tr≥{vndToNgan(luotHDThreshold)}kđ/tháng)</span></button>
                  {(conditionType === 'activity_round' || conditionType === 'activity_round_tvvm') && (
                    <div className="space-y-1.5 pl-3 border-l-2 border-amber-500/30">
                      <div className="grid grid-cols-2 gap-1.5">
                        <button type="button" onClick={() => setConditionType('activity_round')}
                          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${conditionType === 'activity_round' ? 'bg-amber-500/80 text-white ring-1 ring-white/20' : 'bg-gray-800/50 text-emerald-300/60 hover:text-emerald-200'}`}
                        ><span>Tất cả TVV</span></button>
                        <button type="button" onClick={() => setConditionType('activity_round_tvvm')}
                          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${conditionType === 'activity_round_tvvm' ? 'bg-amber-500/80 text-white ring-1 ring-white/20' : 'bg-gray-800/50 text-emerald-300/60 hover:text-emerald-200'}`}
                        ><span>TVVm (≤12t)</span></button>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        <div className="space-y-0.5">
                          <Label className="text-[9px] text-amber-400/70">Ngưỡng IP/tháng (nđ) cho Lượt HĐ</Label>
                          <Input type="number" inputMode="decimal" placeholder="3" value={vndToNgan(luotHDThreshold) || ''} onChange={(e) => setLuotHDThreshold(nganToVnd(parseFloat(e.target.value) || 0))} className="h-6 text-xs border-amber-500/30 bg-gray-800 text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Lượt HĐ chuẩn - with sub-options and configurable threshold */}
                <div className="space-y-1.5">
                  <button type="button" onClick={() => setConditionType(conditionType === 'activity_round_standard_tvvm' ? 'activity_round_standard_tvvm' : 'activity_round_standard')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer w-full ${conditionType === 'activity_round_standard' || conditionType === 'activity_round_standard_tvvm' ? 'bg-orange-600 text-white shadow-lg brightness-110 ring-2 ring-white/30' : 'bg-orange-600/50 text-emerald-200 hover:brightness-110 hover:text-white/90'}`}
                  ><Award className="w-3 h-3 shrink-0" /><span>Lượt HĐ Chuẩn</span><span className="text-[9px] opacity-60">(TÍNH LƯỢT 3tr≥{vndToNgan(luotHDCTThreshold)}kđ/tháng)</span></button>
                  {(conditionType === 'activity_round_standard' || conditionType === 'activity_round_standard_tvvm') && (
                    <div className="space-y-1.5 pl-3 border-l-2 border-orange-500/30">
                      <div className="grid grid-cols-2 gap-1.5">
                        <button type="button" onClick={() => setConditionType('activity_round_standard')}
                          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${conditionType === 'activity_round_standard' ? 'bg-orange-500/80 text-white ring-1 ring-white/20' : 'bg-gray-800/50 text-emerald-300/60 hover:text-emerald-200'}`}
                        ><span>Tất cả TVV</span></button>
                        <button type="button" onClick={() => setConditionType('activity_round_standard_tvvm')}
                          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${conditionType === 'activity_round_standard_tvvm' ? 'bg-orange-500/80 text-white ring-1 ring-white/20' : 'bg-gray-800/50 text-emerald-300/60 hover:text-emerald-200'}`}
                        ><span>TVVm (≤12t)</span></button>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        <div className="space-y-0.5">
                          <Label className="text-[9px] text-orange-400/70">Ngưỡng IP/tháng (nđ) cho Lượt HĐC</Label>
                          <Input type="number" inputMode="decimal" placeholder="12" value={vndToNgan(luotHDCTThreshold) || ''} onChange={(e) => setLuotHDCTThreshold(nganToVnd(parseFloat(e.target.value) || 0))} className="h-6 text-xs border-orange-500/30 bg-gray-800 text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Lượt TVV90 - with configurable threshold */}
                <div className="space-y-1.5">
                  <button type="button" onClick={() => setConditionType('activity_round_tvv90')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer w-full ${conditionType === 'activity_round_tvv90' ? 'bg-rose-600 text-white shadow-lg brightness-110 ring-2 ring-white/30' : 'bg-rose-600/50 text-emerald-200 hover:brightness-110 hover:text-white/90'}`}
                  ><Users className="w-3 h-3 shrink-0" /><span>Lượt TVV90</span><span className="text-[9px] opacity-60">(≤{tvv90MaxMonths}t + TÍNH LƯỢT 3tr≥{vndToNgan(tvv90MinIP)}kđ)</span></button>
                  {conditionType === 'activity_round_tvv90' && (
                    <div className="space-y-1.5 pl-3 border-l-2 border-rose-500/30">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="space-y-0.5">
                          <Label className="text-[9px] text-rose-400/70">Thời gian tối đa (tháng)</Label>
                          <Input type="number" inputMode="numeric" placeholder="3" value={tvv90MaxMonths || ''} onChange={(e) => setTvv90MaxMonths(parseInt(e.target.value) || 3)} className="h-6 text-xs border-rose-500/30 bg-gray-800 text-white" />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[9px] text-rose-400/70">IP/tháng tối thiểu (nđ)</Label>
                          <Input type="number" inputMode="decimal" placeholder="12" value={vndToNgan(tvv90MinIP) || ''} onChange={(e) => setTvv90MinIP(nganToVnd(parseFloat(e.target.value) || 0))} className="h-6 text-xs border-rose-500/30 bg-gray-800 text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                </>}
                {/* Đếm TVV đạt CTĐK - reference another saved contest */}
                {contestKind === 'pass_count' && <>
                <div className="space-y-1.5">
                  <p className="text-[10px] text-emerald-300/70 font-medium uppercase tracking-wider">Tham chiếu chương trình</p>
                  <button type="button" onClick={() => { setConditionType('tvv_pass_count'); setTargetType('nhom'); }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer w-full ${conditionType === 'tvv_pass_count' ? 'bg-purple-600 text-white shadow-lg brightness-110 ring-2 ring-white/30' : 'bg-purple-600/50 text-emerald-200 hover:brightness-110 hover:text-white/90'}`}
                  ><BookmarkPlus className="w-3 h-3 shrink-0" /><span>Đếm TVV đạt CTĐK</span></button>
                  {conditionType === 'tvv_pass_count' && (
                    <div className="space-y-1.5 pl-3 border-l-2 border-purple-500/30">
                      <div className="space-y-1">
                        <Label className="text-[9px] text-purple-400/70">Chương trình thi đua TVV (đã lưu)</Label>
                        <Select value={referenceContestId} onValueChange={setReferenceContestId}>
                          <SelectTrigger className="h-7 text-xs border-purple-500/30 bg-gray-800 text-white">
                            <SelectValue placeholder="— Chọn chương trình —" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-purple-500/30">
                            {activeSavedContests.filter(sc => sc.targetType === 'tvv' && sc.conditionType !== 'tvv_pass_count').length === 0 ? (
                              <div className="px-3 py-2 text-xs text-gray-400">Chưa có CTĐK cho TVV</div>
                            ) : activeSavedContests.filter(sc => sc.targetType === 'tvv' && sc.conditionType !== 'tvv_pass_count').map(sc => (
                              <SelectItem key={sc.id} value={sc.id} className="text-xs text-white focus:bg-purple-500/20 focus:text-white">
                                {sc.title} ({getConditionLabel(sc.conditionType as ConditionType)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {referenceContestId && (() => {
                          const refContest = savedContests.find(sc => sc.id === referenceContestId);
                          if (!refContest) return null;
                          return (
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2 space-y-1">
                              <p className="text-[10px] text-purple-300 font-bold">📋 {refContest.title}</p>
                              <p className="text-[9px] text-purple-400/70">Điều kiện: {getConditionLabel(refContest.conditionType as ConditionType)} | Đối tượng: TVV</p>
                              <p className="text-[9px] text-purple-400/70">Thời gian: {new Date(refContest.startDate).toLocaleDateString('vi-VN')} - {new Date(refContest.endDate).toLocaleDateString('vi-VN')}</p>
                              {(() => {
                                try { const tiers = JSON.parse(refContest.bonusTiers); if (tiers.length > 0) return <p className="text-[9px] text-purple-400/70">Mức thưởng: {tiers.length} mức (từ {formatCurrency(tiers[0].bonusAmount || 0)})</p>; } catch {}
                                return null;
                              })()}
                            </div>
                          );
                        })()}
                        <p className="text-[9px] text-gray-500">Đếm số TVV trong nhóm đạt điều kiện chương trình đã chọn → xếp thưởng theo số lượng</p>
                        {/* Checkbox: Đếm cả cá nhân TN đạt CTĐK */}
                        <div className="flex items-center gap-2 p-2 rounded-lg border border-purple-500/30 bg-purple-500/10">
                          <Checkbox id="includeTNInPassCount" checked={includeTNInPassCount} onCheckedChange={(v) => setIncludeTNInPassCount(!!v)} />
                          <Label htmlFor="includeTNInPassCount" className="text-xs text-purple-200/80 cursor-pointer flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-purple-400" /> Đếm cả cá nhân TN đạt CTĐK
                          </Label>
                        </div>
                        {!includeTNInPassCount && (
                          <p className="text-[9px] text-amber-400/70 italic">⚠️ Mặc định không đếm TN (vì đã đạt ở chương trình cá nhân). Tích chọn để đếm luôn.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* Đếm TVV đạt IP+AFYP — dành cho TB/TN */}
                <div className="space-y-1.5">
                  <button type="button" onClick={() => { setConditionType('pass_count_ip_afyp'); setTargetType('nhom'); }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer w-full ${conditionType === 'pass_count_ip_afyp' ? 'bg-indigo-600 text-white shadow-lg brightness-110 ring-2 ring-white/30' : 'bg-indigo-600/50 text-emerald-200 hover:brightness-110 hover:text-white/90'}`}
                  ><Users className="w-3 h-3 shrink-0" /><span>Đếm TVV đạt IP+AFYP</span><span className="text-[9px] opacity-60">(IP≥{vndToNgan(passCountIPMin)}k · AFYP≥{vndToNgan(passCountAFYPMin)}k)</span></button>
                  {conditionType === 'pass_count_ip_afyp' && (
                    <div className="space-y-1.5 pl-3 border-l-2 border-indigo-500/30">
                      <p className="text-[9px] text-indigo-300/80 italic">Đếm số TVV trong nhóm đạt Tổng IP ≥ ngưỡng AND Tổng AFYP ≥ ngưỡng. Thưởng theo số lượng TVV đạt (Mức 1 = 1 TVV đạt, Mức 2 = 2 TVV đạt, ...). Dành cho TB/TN.</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="space-y-0.5">
                          <Label className="text-[9px] text-indigo-400/70">Tổng IP tối thiểu (nđ)</Label>
                          <Input type="number" inputMode="decimal" placeholder="6000" value={vndToNgan(passCountIPMin) || ''} onChange={(e) => setPassCountIPMin(nganToVnd(parseFloat(e.target.value) || 0))} className="h-6 text-xs border-indigo-500/30 bg-gray-800 text-white" />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[9px] text-indigo-400/70">Tổng AFYP tối thiểu (nđ)</Label>
                          <Input type="number" inputMode="decimal" placeholder="12000" value={vndToNgan(passCountAFYPMin) || ''} onChange={(e) => setPassCountAFYPMin(nganToVnd(parseFloat(e.target.value) || 0))} className="h-6 text-xs border-indigo-500/30 bg-gray-800 text-white" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10">
                        <Checkbox id="includeTNInPassCountIPAFYP" checked={includeTNInPassCount} onCheckedChange={(v) => setIncludeTNInPassCount(!!v)} />
                        <Label htmlFor="includeTNInPassCountIPAFYP" className="text-xs text-indigo-200/80 cursor-pointer flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-indigo-400" /> Đếm cả cá nhân TN
                        </Label>
                      </div>
                      <p className="text-[9px] text-amber-400/70 italic">VD: IP ≥ 6tr + AFYP ≥ 12tr → Mức 1 (1 TVV đạt) = 500k, Mức 2 (2 TVV đạt) = 1tr, Mức 3 (3 TVV đạt) = 1.5tr. Cài đặt thưởng trong "Bảng mức thưởng" bên dưới.</p>
                    </div>
                  )}
                </div>
                {/* Đếm TVV đủ số HĐ — dành cho TB/TN */}
                <div className="space-y-1.5">
                  <button type="button" onClick={() => { setConditionType('pass_count_contracts'); setTargetType('nhom'); setUsePhase2(false); }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer w-full ${conditionType === 'pass_count_contracts' ? 'bg-indigo-600 text-white shadow-lg brightness-110 ring-2 ring-white/30' : 'bg-indigo-600/50 text-emerald-200 hover:brightness-110 hover:text-white/90'}`}
                  ><Users className="w-3 h-3 shrink-0" /><span>Đếm TVV đủ số HĐ</span><span className="text-[9px] opacity-60">(IP≥{vndToNgan(passCountIPMin)}k · AFYP≥{vndToNgan(passCountAFYPMin)}k)</span></button>
                  {conditionType === 'pass_count_contracts' && (
                    <div className="space-y-1.5 pl-3 border-l-2 border-indigo-500/30">
                      <p className="text-xs text-indigo-200">Mỗi TVV được đếm một lần khi có đủ số HĐ; từng HĐ phải đồng thời đạt IP và AFYP tối thiểu.</p>
                      <Label htmlFor="tvvContractCountMin" className="text-xs text-indigo-200">Số HĐ tối thiểu / TVV</Label>
                      <Input id="tvvContractCountMin" type="number" min={1} step={1} value={tvvContractCountMin} onChange={e => setTVVContractCountMin(Math.max(1, Math.floor(Number(e.target.value) || 1)))} className="h-7 text-xs bg-gray-800 text-white" />
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="space-y-0.5">
                          <Label className="text-[9px] text-indigo-400/70">IP tối thiểu mỗi HĐ (nđ)</Label>
                          <Input type="number" inputMode="decimal" placeholder="6000" value={vndToNgan(passCountIPMin) || ''} onChange={(e) => setPassCountIPMin(nganToVnd(parseFloat(e.target.value) || 0))} className="h-6 text-xs border-indigo-500/30 bg-gray-800 text-white" />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[9px] text-indigo-400/70">AFYP tối thiểu mỗi HĐ (nđ)</Label>
                          <Input type="number" inputMode="decimal" placeholder="12000" value={vndToNgan(passCountAFYPMin) || ''} onChange={(e) => setPassCountAFYPMin(nganToVnd(parseFloat(e.target.value) || 0))} className="h-6 text-xs border-indigo-500/30 bg-gray-800 text-white" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10">
                        <Checkbox id="includeTNInContractCount" checked={includeTNInPassCount} onCheckedChange={(v) => setIncludeTNInPassCount(!!v)} />
                        <Label htmlFor="includeTNInContractCount" className="text-xs text-indigo-200/80 cursor-pointer flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-indigo-400" /> Đếm cả cá nhân TN
                        </Label>
                      </div>

                    </div>
                  )}
                </div>
                </>}
                {/* Xét Top N IP cao nhất - ranking-based reward */}
                {contestKind === 'top' && <div className="space-y-1.5">
                  <p className="text-[10px] text-emerald-300/70 font-medium uppercase tracking-wider">Xếp hạng</p>
                  <button type="button" onClick={() => { setConditionType('top_n_ip'); setTargetType('tvv'); }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer w-full ${conditionType === 'top_n_ip' ? 'bg-rose-700 text-white shadow-lg brightness-110 ring-2 ring-white/30' : 'bg-rose-700/50 text-emerald-200 hover:brightness-110 hover:text-white/90'}`}
                  ><Trophy className="w-3 h-3 shrink-0" /><span>Xét Top N IP</span><span className="text-[9px] opacity-60">(Top {topN} · IP≥{vndToNgan(topNMinIP)}kđ)</span></button>
                  {conditionType === 'top_n_ip' && (
                    <div className="space-y-1.5 pl-3 border-l-2 border-rose-500/30">
                      <p className="text-[9px] text-rose-300/80 italic">Xếp Top N TVV có tổng IP/AFYP cao nhất. TVV phải đạt chỉ tiêu tối thiểu mới được xét thưởng. Mức thưởng áp dụng theo thứ tự hạng (Mức 1 = Hạng 1, Mức 2 = Hạng 2, ...). Hạng 1 = Quán quân, Hạng 2 = Á quân.</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="space-y-0.5">
                          <Label className="text-[9px] text-rose-400/70">Chỉ tiêu xét</Label>
                          <select
                            value={topNValueType}
                            onChange={(e) => setTopNValueType(e.target.value as 'ip' | 'afyp')}
                            style={{ colorScheme: 'dark' }}
                            className="h-6 w-full text-xs border border-rose-500/30 bg-gray-800 text-white rounded px-1"
                          >
                            <option value="ip" className="bg-slate-950 text-white">IP (PĐT + 10% ĐT)</option>
                            <option value="afyp" className="bg-slate-950 text-white">AFYP</option>
                          </select>
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[9px] text-rose-400/70">Top N (số hạng được thưởng)</Label>
                          <Input type="number" inputMode="numeric" placeholder="3" value={topN || ''} onChange={(e) => setTopN(parseInt(e.target.value) || 3)} className="h-6 text-xs border-rose-500/30 bg-gray-800 text-white" />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[9px] text-rose-400/70">{topNValueType === 'afyp' ? 'AFYP tối thiểu (nđ)' : 'IP tối thiểu (nđ)'}</Label>
                          <Input type="number" inputMode="decimal" placeholder="50000" value={vndToNgan(topNMinIP) || ''} onChange={(e) => setTopNMinIP(nganToVnd(parseFloat(e.target.value) || 0))} className="h-6 text-xs border-rose-500/30 bg-gray-800 text-white" />
                        </div>
                      </div>
                      <p className="text-[9px] text-amber-400/70 italic">Ví dụ: Top 3 TVV có tổng {topNValueType === 'afyp' ? 'AFYP' : 'IP'} cao nhất, {topNValueType === 'afyp' ? 'AFYP' : 'IP'} tối thiểu 50 triệu → Hạng 1 (Quán quân) thưởng 2tr, Hạng 2 (Á quân) - Hạng 3 thưởng 1tr/TDV. Nếu chỉ 1 TVV đủ điều kiện → mặc nhiên là Quán quân. Bảng kết quả hiển thị TẤT CẢ TVV tham gia (dùng "Ẩn chưa đạt mức" để ẩn người k có doanh số).</p>
                    </div>
                  )}
                </div>}
              </div>

              {targetType === 'nhom' && (
                <div className="space-y-2 rounded-xl border border-sky-500/20 bg-sky-950/10 p-3">
                  <Label className="text-xs font-medium text-sky-200">Phạm vi tính điều kiện</Label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="flex items-center gap-2 rounded-lg border border-sky-500/30 bg-emerald-500/10 p-2">
                      <Checkbox id="includeIndividualTN" checked={includeIndividualTN} onCheckedChange={(value) => setIncludeIndividualTN(!!value)} />
                      <Label htmlFor="includeIndividualTN" className="flex cursor-pointer items-center gap-1 text-xs text-emerald-200/70">
                        <UserCheck className="h-3 w-3 text-sky-400" /> Tính cá nhân TN vào chương trình
                      </Label>
                    </div>
                    {/* Filter by effective date — chỉ tính TVV có ngày LV bằng hoặc sau ngày hiệu lực chức vụ gần nhất của NTD recruiter */}
                    <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2">
                      <Checkbox id="filterByEffectiveDate" checked={filterByEffectiveDate} onCheckedChange={(value) => setFilterByEffectiveDate(!!value)} />
                      <Label htmlFor="filterByEffectiveDate" className="flex cursor-pointer items-center gap-1 text-xs text-amber-200/90">
                        <CalendarClock className="h-3 w-3 text-amber-400" /> Chỉ tính TVV có ngày LV bằng hoặc sau ngày hiệu lực CV gần nhất
                      </Label>
                    </div>
                  </div>
                  {filterByEffectiveDate && (
                    <p className="text-[10px] italic leading-snug text-amber-300/80">Chỉ giữ TVV có ngày bắt đầu làm việc <b>bằng hoặc sau</b> ngày hiệu lực chức vụ gần nhất của NTD đã tuyển dụng họ. TVV thiếu ngày làm việc sẽ không được tính.</p>
                  )}
                </div>
              )}

              {supportsCombinedTopRanking(conditionType) && !isTopNMode(conditionType) && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Label className="text-xs font-bold text-rose-300">Kết hợp xét TOP</Label>
                      <p className="text-[10px] text-rose-200/70 mt-0.5">Chỉ xếp TOP trong số đối tượng đã đạt điều kiện chính; xếp theo đúng {conditionType.includes('afyp') ? 'AFYP' : 'IP'} của bảng này.</p>
                    </div>
                    <Checkbox checked={useTopRanking} onCheckedChange={(checked) => setUseTopRanking(Boolean(checked))} className="border-rose-400 data-[state=checked]:bg-rose-500" />
                  </div>
                  {useTopRanking && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-rose-200">Số hạng xét TOP</Label>
                          <Input type="number" min={1} max={50} value={topN || ''} onChange={(e) => setTopN(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))} className="h-7 text-xs border-rose-500/30 bg-gray-900 text-white" />
                        </div>
                        <div className="rounded-lg border border-rose-500/20 bg-black/10 px-2 py-1.5 text-[10px] text-rose-100/80 flex items-center">Thưởng TOP chỉ hiện trong cột Ghi chú; cột Thưởng vẫn là thưởng điều kiện chính.</div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-amber-400/25 bg-amber-950/10 p-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-amber-200">Điều kiện được xét TOP</Label>
                          <select
                            value={topEligibilityType}
                            onChange={(e) => setTopEligibilityType(e.target.value as 'none' | 'per_contract_ip' | 'per_contract_afyp' | 'total_ip' | 'total_afyp')}
                            style={{ colorScheme: 'dark' }}
                            className="h-8 w-full rounded-md border border-amber-400/30 bg-gray-950 px-2 text-xs text-white outline-none"
                          >
                            <option value="none" className="bg-slate-950 text-white">Không yêu cầu thêm</option>
                            <option value="per_contract_ip" className="bg-slate-950 text-white">IP</option>
                            <option value="per_contract_afyp" className="bg-slate-950 text-white">AFYP</option>
                            <option value="total_ip" className="bg-slate-950 text-white">Tổng IP</option>
                            <option value="total_afyp" className="bg-slate-950 text-white">Tổng AFYP</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-amber-200">Ngưỡng tối thiểu (≥)</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              min={0}
                              inputMode="numeric"
                              disabled={topEligibilityType === 'none'}
                              value={topEligibilityType === 'none' ? '' : (topEligibilityMin || '')}
                              onChange={(e) => setTopEligibilityMin(Math.max(0, Number(e.target.value) || 0))}
                              placeholder={topEligibilityType === 'none' ? 'Không áp dụng' : 'Nhập ngưỡng'}
                              className="h-8 pr-8 text-xs border-amber-400/30 bg-gray-950 text-white disabled:opacity-45"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-amber-300">đ</span>
                          </div>
                        </div>
                        <p className="sm:col-span-2 text-[10px] leading-4 text-amber-100/70">Chỉ đối tượng đã đạt điều kiện chính và đạt thêm ngưỡng này mới được đưa vào danh sách xét TOP. IP/AFYP là điều kiện theo từng hợp đồng; Tổng IP/Tổng AFYP là tổng của đối tượng.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {Array.from({ length: Math.max(1, topN) }, (_, index) => (
                          <div key={index} className="rounded-lg border border-rose-500/20 bg-gray-900/70 p-2">
                            <Label className="text-[10px] font-bold text-rose-300">{index === 0 ? 'Quán quân' : index === 1 ? 'Á quân' : 'TOP ' + (index + 1)}</Label>
                            <div className="relative mt-1">
                              <Input type="number" min={0} inputMode="numeric" value={topRewardAmounts[index] ?? 0} onChange={(e) => updateTopReward(index, Number(e.target.value) || 0)} className="h-7 pr-7 text-xs border-rose-500/30 bg-gray-950 text-white" />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-rose-300">đ</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Chỉ tiêu bổ sung (Secondary Condition) */}
              <Separator className="bg-emerald-500/20" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="useSecondaryCondition" checked={useSecondaryCondition} onCheckedChange={(v) => setUseSecondaryCondition(!!v)} />
                  <Label htmlFor="useSecondaryCondition" className="text-xs font-medium text-emerald-200 flex items-center gap-1 cursor-pointer">
                    <Settings2 className="w-3.5 h-3.5 text-orange-400" /> Chỉ tiêu bổ sung
                  </Label>
                </div>
                {useSecondaryCondition && (
                  <div className="space-y-2 pl-4 border-l-2 border-orange-500/30">
                    <div className="text-[10px] text-orange-400/50 font-medium uppercase tracking-wider">Chỉ tiêu hợp đồng và lượt</div>
                    <p className="text-[10px] leading-4 text-emerald-200/70">
                      Mọi chỉ tiêu được tính riêng trên cùng đối tượng đang xét (TVV, Nhóm hoặc NTD); không gộp dữ liệu giữa các đối tượng. Tổng IP và số lượt là hai điều kiện độc lập. Mỗi mã TVV chỉ tính tối đa 1 lượt trong kỳ xét, kể cả HĐ tồn.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><Label className="text-[10px] text-orange-400/70">AFYP/HĐ từ (nđ)</Label><Input type="number" placeholder="0" value={secondaryAFYPMin ? vndToNgan(secondaryAFYPMin) : ''} onChange={(e) => setSecondaryAFYPMin(nganToVnd(parseFloat(e.target.value) || 0))} className="h-7 text-xs border-orange-500/30 bg-gray-800 text-white" /></div>
                      <div className="space-y-1"><Label className="text-[10px] text-orange-400/70">IP/HĐ từ (nđ)</Label><Input type="number" placeholder="0" value={secondaryIPMin ? vndToNgan(secondaryIPMin) : ''} onChange={(e) => setSecondaryIPMin(nganToVnd(parseFloat(e.target.value) || 0))} className="h-7 text-xs border-orange-500/30 bg-gray-800 text-white" /></div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-orange-300/80">Phạm vi tính lượt bổ sung</Label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button type="button" onClick={() => chooseSecondaryRoundScope('all')} className={`rounded-lg border px-2 py-1.5 text-[10px] font-bold transition-all ${secondaryLuotHDFilter === 'all' && secondaryLuotHDCFilter === 'all' ? 'border-orange-300 bg-orange-500/60 text-white' : 'border-orange-500/20 bg-gray-800/50 text-emerald-300/70'}`}>Tất cả TVV</button>
                        <button type="button" onClick={() => chooseSecondaryRoundScope('tvvm')} className={`rounded-lg border px-2 py-1.5 text-[10px] font-bold transition-all ${secondaryLuotHDFilter === 'tvvm' && secondaryLuotHDCFilter === 'tvvm' ? 'border-orange-300 bg-orange-500/60 text-white' : 'border-orange-500/20 bg-gray-800/50 text-emerald-300/70'}`}>Chỉ TVVm (≤12 tháng)</button>
                      </div>
                      <p className="text-[9px] text-orange-200/60">Một lựa chọn dùng chung cho cả Lượt HĐ và Lượt HĐC bên dưới.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-orange-400/70">SL lượt HĐ tối thiểu</Label>
                        <Input type="number" placeholder="0" value={secondaryLuotHDMin || ''} onChange={(e) => setSecondaryLuotHDMin(parseInt(e.target.value) || 0)} className="h-7 text-xs border-orange-500/30 bg-gray-800 text-white" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-orange-400/70">SL lượt HĐC tối thiểu</Label>
                        <Input type="number" placeholder="0" value={secondaryLuotHDCMin || ''} onChange={(e) => setSecondaryLuotHDCMin(parseInt(e.target.value) || 0)} className="h-7 text-xs border-orange-500/30 bg-gray-800 text-white" />
                      </div>
                    </div>
                    {/* Đếm số HĐ có IP đạt ngưỡng — độc lập với lượt HĐ/HĐC và Tổng IP. */}
                    <div className="rounded-lg border border-orange-400/25 bg-orange-950/10 p-2 space-y-2">
                      <div className="text-[10px] font-bold text-orange-200">Đếm số lượng hợp đồng đạt IP</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-orange-200/80">Số HĐ tối thiểu</Label>
                          <Input type="number" min={0} step={1} placeholder="VD: 2" value={secondaryContractCountMin || ''} onChange={(e) => setSecondaryContractCountMin(Math.max(0, Math.floor(Number(e.target.value) || 0)))} className="h-7 text-xs border-orange-500/30 bg-gray-800 text-white" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-orange-200/80">IP mỗi HĐ từ (nđ)</Label>
                          <Input type="number" min={0} inputMode="decimal" placeholder="VD: 12000" value={secondaryContractIPMin ? vndToNgan(secondaryContractIPMin) : ''} onChange={(e) => setSecondaryContractIPMin(Math.max(0, nganToVnd(Number(e.target.value) || 0)))} className="h-7 text-xs border-orange-500/30 bg-gray-800 text-white" />
                        </div>
                      </div>
                      <p className="text-[10px] leading-4 text-orange-100/70">Chỉ đếm các HĐ có IP đạt ngưỡng; mỗi số HĐ chỉ đếm một lần. Tổng IP của điều kiện chính vẫn tính toàn bộ HĐ hợp lệ trong kỳ.</p>
                    </div>
                    {/* Điều kiện bổ sung nhận thưởng — phải đạt mới được thưởng */}
                    <div className="text-[10px] text-amber-400/60 font-medium uppercase tracking-wider mt-2">Điều kiện nhận thưởng</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><Label className="text-[10px] text-amber-400/70">Tổng AFYP từ (nđ)</Label><Input type="number" placeholder="0" value={secondaryTotalAFYPMin ? vndToNgan(secondaryTotalAFYPMin) : ''} onChange={(e) => setSecondaryTotalAFYPMin(nganToVnd(parseFloat(e.target.value) || 0))} className="h-7 text-xs border-amber-500/30 bg-gray-800 text-white" /></div>
                      <div className="space-y-1"><Label className="text-[10px] text-amber-400/70">Tổng IP từ (nđ)</Label><Input type="number" placeholder="0" value={secondaryTotalIPMin ? vndToNgan(secondaryTotalIPMin) : ''} onChange={(e) => setSecondaryTotalIPMin(nganToVnd(parseFloat(e.target.value) || 0))} className="h-7 text-xs border-amber-500/30 bg-gray-800 text-white" /></div>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-emerald-500/20" />
              <div className="space-y-2">
                <Label className="text-xs font-medium text-amber-200">Thiết lập thưởng</Label>
                {usePhase2 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 rounded-xl border border-sky-500/25 bg-sky-950/15 p-3">
                      <NeonDatePicker label="GĐ2 Hiệu lực từ" value={phase2StartDate} onChange={setPhase2StartDate} accentColor="sky" />
                      <NeonDatePicker label="GĐ2 Hiệu lực đến" value={phase2EndDate} onChange={setPhase2EndDate} accentColor="sky" />
                    </div>
                    <DualPhaseBonusTierEditor
                      phase1Tiers={bonusTiers}
                      phase2Tiers={bonusTiers2}
                      conditionType={conditionType}
                      onAdd={addDualPhaseTier}
                      onRemove={removeDualPhaseTier}
                      onMilestoneUpdate={updateDualPhaseMilestone}
                      onPhase1Update={updateBonusTier}
                      onPhase2Update={updateBonusTier2}
                    />
                  </div>
                ) : (
                  <BonusTierEditor
                    tiers={bonusTiers}
                    conditionType={conditionType}
                    onUpdate={updateBonusTier}
                    onAdd={addBonusTier}
                    onRemove={removeBonusTier}
                  />
                )}
              </div>

              {/* Tùy chọn hiển thị */}
              <Separator className="bg-emerald-500/20" />
              <div className="space-y-2">
                <Label className="text-xs font-medium text-emerald-200">Hiển thị kết quả</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Hide not achieved */}
                  <div className="flex items-center gap-2 p-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10">
                    <Checkbox id="hideNotAchieved" checked={hideNotAchieved} onCheckedChange={(v) => setHideNotAchieved(!!v)} />
                    <Label htmlFor="hideNotAchieved" className="text-xs text-emerald-200/70 cursor-pointer flex items-center gap-1">
                      <EyeOff className="w-3 h-3 text-gray-400" /> Ẩn chưa đạt mức
                    </Label>
                  </div>
                </div>
              </div>

              <Separator className="bg-emerald-500/20" />

              </>}
              {/* Poster upload inside config */}
              <div className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors">
                  <ImageIcon className="w-3.5 h-3.5" /> Ảnh poster
                  <input type="file" accept="image/*" onChange={handlePosterUpload} className="hidden" />
                </label>
                {posterUrl && <Button variant="outline" size="sm" onClick={() => setPosterUrl('')} className="text-red-400 border-emerald-500/30 bg-transparent h-7 text-xs"><X className="w-3 h-3 mr-0.5" />Xóa</Button>}
                {posterUrl && <img src={posterUrl} alt="Preview" className="h-8 rounded border border-emerald-500/30" />}
              </div>
            </CardContent>
        </Card>

        {/* Action Buttons - đối tượng đã chọn ở bước cấu hình phía trên */}
        <div className="flex items-center gap-2">
          <Button onClick={handleCalculate} className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 h-10 text-sm font-bold shadow-lg shadow-emerald-600/20 border border-emerald-500/30">
            <Trophy className="w-4 h-4 mr-1" /> Tính thi đua
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRefreshData} disabled={isLoading} className="h-10 w-10 p-0 text-emerald-400/50 hover:text-emerald-300 shrink-0" title="Tải lại dữ liệu">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>

        {/* Summary Cards - below buttons, visible when results exist */}
        {(perContractDisplayContracts.length > 0 || nydData.length > 0 || recruitmentRows.length > 0 || tvvTotalRows.length > 0 || groupedData.length > 0) && (
          <div className="space-y-2">
            {registeredProgram ? <div className="p-3 text-emerald-100">{contestTitle} · {registeredProgram.rows.length} đối tượng · {registeredProgram.metric.toUpperCase()} theo mục tiêu đăng ký (đ)</div> : <ContestPoster contestTitle={contestTitle} startDate={startDate} endDate={endDate} conditionType={conditionType} targetType={targetType} sortedTiers={sortedTiers} filteredContracts={displayContracts} groupedData={groupedData} totalFYP={displayTotalFYP} totalBonus={totalBonusDisplay} achievedCount={achievedCount} notAchievedCount={notAchievedCount} formatCurrency={formatCurrency} formatNumber={formatNumber} formatDate={formatDate} variant="gradient" />}

            {usePhase2 && phase2Results && (
              <div className="rounded-lg bg-gradient-to-r from-sky-900/40 to-cyan-900/40 border border-sky-500/20 p-3">
                <div className="flex items-center gap-2"><Layers className="w-4 h-4 text-sky-400" /><div className="flex-1"><p className="text-xs font-bold text-sky-300">Chia 2 giai đoạn</p><p className="text-[10px] text-sky-400/60">GĐ1: {phase2Results.phase1Count} HĐ | GĐ2: {phase2Results.phase2Count} HĐ</p></div><div className="text-right"><p className="text-[10px] text-sky-400/60">GĐ1: {formatCurrency(phase2Results.phase1Bonus)}</p><p className="text-[10px] text-sky-400/60">GĐ2: {formatCurrency(phase2Results.phase2Bonus)}</p><p className="text-sm font-extrabold text-sky-300">Tổng: {formatCurrency(phase2Results.totalBonus)}</p></div></div>
              </div>
            )}

            {isActivityRoundMode(conditionType) && targetType === 'nhom' && groupedData.length > 0 && (
              <div className="rounded-lg bg-gradient-to-r from-orange-900/40 to-amber-900/40 border border-orange-500/30 p-3">
                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-orange-400" /><div className="flex-1"><p className="text-xs font-bold text-orange-300">{conditionType === 'activity_round' ? 'Lượt HĐ' : conditionType === 'activity_round_standard' ? 'Lượt HĐ Chuẩn' : conditionType === 'activity_round_tvv90' ? 'Lượt TVV90' : 'Lượt HĐ'}: TÍNH LƯỢT 3tr ≥ {formatNumber(isStandardMode(conditionType) ? luotHDCTThreshold : luotHDThreshold)}/tháng = 1 lượt{conditionType === 'activity_round_tvv90' ? ` (TVV90 ≤${tvv90MaxMonths}T)` : ''}</p></div><div className="text-right"><p className="text-[10px] text-orange-400/60">Tổng thưởng</p><p className="text-base font-extrabold text-orange-400">{formatCurrency(arTotalBonus)}</p></div></div>
              </div>
            )}
            {isTotalMode(conditionType) && targetType !== 'nhom' && (
              <div className="rounded-lg bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/30 p-3">
                <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-amber-400" /><div className="flex-1"><p className="text-xs font-bold text-amber-300">{conditionType === 'total_afyp' ? 'Tổng AFYP' : 'Tổng IP'}: {formatCurrency(totalValue)}</p></div>{matchedTotalTier ? <>{showRateColumn && <div className="text-right border-r border-emerald-500/20 pr-2"><p className="text-sm font-bold text-violet-400">{formatRate(matchedTotalTier)}</p></div>}<div className="text-right"><p className="text-base font-extrabold text-amber-400">{formatBonusAmountFromContracts(matchedTotalTier, displayContracts)}</p></div></> : <div className="text-right"><p className="text-sm font-bold text-orange-400">Chưa đạt mức thấp nhất</p></div>}{totalRemaining !== null && <div className="text-right border-l border-emerald-500/20 pl-2"><p className="text-sm font-bold text-orange-400">- {formatCurrency(totalRemaining)}</p></div>}</div>
              </div>
            )}
            {targetType === 'nyd' && (nydData.length > 0 || recruitmentRows.length > 0) && (
              <div className="rounded-lg bg-gradient-to-r from-violet-900/40 to-purple-900/40 border border-violet-500/20 p-3">
                <div className="flex items-center gap-2"><UserPlus className="w-4 h-4 text-violet-400" /><div className="flex-1"><p className="text-xs font-bold text-violet-300">{getContestMetricLabel(conditionType, topNValueType, 'nyd')} (NTD)</p><p className="text-[10px] text-violet-400/60">{isActivityRoundMode(conditionType) ? `TVV có TÍNH LƯỢT 3tr ≥ ${formatNumber(isStandardMode(conditionType) ? luotHDCTThreshold : luotHDThreshold)}/tháng = 1 lượt${isStandardMode(conditionType) ? ' (Chuẩn)' : ''}${includeIndividualNTD ? ` + ${getIndividualMetricLabel(conditionType)}` : ''}` : `${getContestMetricLabel(conditionType, topNValueType, 'nyd')}${includeIndividualNTD ? ` + ${getIndividualMetricLabel(conditionType)}` : ''}`}</p></div><div className="text-right"><p className="text-[10px] text-violet-400/60">Tổng thưởng</p><p className="text-base font-extrabold text-violet-400">{formatCurrency(nydTotalBonus)}</p></div></div>
              </div>
            )}
          </div>
        )}

        {/* Do not mount the full source table while its panel is closed. */}
        <Card className={`${neonBorder} bg-[#0e1424]/95`}>
          <CardHeader className="pb-2 pt-3 px-4">
            <button className="flex items-center justify-between w-full" onClick={() => setShowSourceData(!showSourceData)}>
              <div className="flex items-center gap-2"><Database className="w-4 h-4 text-emerald-400/60" /><CardTitle className="text-sm text-emerald-200">Dữ liệu nguồn</CardTitle><Badge variant="secondary" className="text-[10px]">{contracts.length} HĐ</Badge></div>
              {showSourceData ? <ChevronUp className="w-4 h-4 text-emerald-400/60" /> : <ChevronDown className="w-4 h-4 text-emerald-400/60" />}
            </button>
          </CardHeader>
          {showSourceData && <CardContent className="px-4 pb-3">
              {contracts.length === 0 ? (
                <div className="text-center py-6 text-emerald-400/50"><Database className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm font-medium">Chưa có dữ liệu</p><p className="text-xs">Nhấn &ldquo;Nhập HD&rdquo; để tải từ Google Sheets</p></div>
              ) : (
                <div className="rounded-lg border border-emerald-500/30 overflow-x-auto max-h-48 overflow-y-auto">
                  <Table><TableHeader><TableRow className="bg-emerald-500/20 sticky top-0"><TableHead className="w-[35px] text-center text-xs text-emerald-400/60">STT</TableHead><TableHead className="text-xs text-emerald-400/60">MC NHÓM</TableHead><TableHead className="text-xs text-emerald-400/60">Mã</TableHead><TableHead className="text-xs text-emerald-400/60">Họ tên</TableHead><TableHead className="text-xs text-emerald-400/60">Ngày HL</TableHead><TableHead className="text-xs text-emerald-400/60">IP</TableHead><TableHead className="w-[30px]"></TableHead></TableRow></TableHeader>
                    <ContestSourceRows contracts={contracts} onDelete={deleteSourceContract} />
                  </Table>
                </div>
              )}
            </CardContent>}
        </Card>
      </main>
      )}

      {!isEmbedMode && <MainAppBottomNav active="contest" />}

      {/* Result Dialog Popup - White theme, only poster + detail table
          In embed mode: always open + CSS .embed-mode biến Dialog thành full-page (KHÔNG còn là popup) */}
      <Dialog open={isEmbedMode || isResultDialogOpen} onOpenChange={(open) => { if (!isEmbedMode) { setIsResultDialogOpen(open); if (!open) setIsResultExpanded(false); } }}>
        <DialogContent showCloseButton={false} className={`${isEmbedMode ? 'contest-result-embed' : `${isResultExpanded ? 'sm:max-w-5xl max-h-[95dvh]' : 'sm:max-w-xl max-h-[92dvh] sm:max-h-[76vh]'} contest-result-dialog overflow-x-hidden`} overflow-y-auto bg-white border-emerald-500/30 p-0 transition-all duration-300`}>
          <style dangerouslySetInnerHTML={{ __html: `
            .contest-result-table-wrapper {
              width: 100%;
              max-width: 100%;
              min-width: 0;
              overflow-x: hidden;
            }
            .contest-result-table-wrapper [data-slot="table-container"] {
              width: 100%;
              max-width: 100%;
              min-width: 0;
              overflow: hidden;
            }
            .contest-result-content,
            .contest-result-content > div,
            .contest-result-toolbar {
              width: 100%;
              max-width: 100%;
              min-width: 0;
            }
            .contest-result-table {
              width: max-content;
              min-width: 100%;
              table-layout: auto;
              font-size: 10px;
              transform-origin: top left;
              zoom: .76;
            }
            .contest-result-table:has(th:nth-child(9)) { zoom: .68; }
            .contest-result-table:has(th:nth-child(10)) { zoom: .61; }
            .contest-result-table:has(th:nth-child(11)) { zoom: .55; }
            .contest-result-table:has(th:nth-child(12)) { zoom: .50; }
            .contest-result-table:has(th:nth-child(13)) { zoom: .46; }
            .contest-result-table:has(th:nth-child(14)) { zoom: .42; }
            .contest-result-table th,
            .contest-result-table td {
              padding: 4px 3px !important;
              white-space: nowrap !important;
              line-height: 1.15;
            }
            .contest-result-table th:first-child,
            .contest-result-table td:first-child {
              width: 28px !important;
            }
            @media (max-width: 639px) {
              .contest-result-dialog {
                width: calc(100vw - 12px) !important;
                max-width: calc(100vw - 12px) !important;
              }
              .contest-result-toolbar {
                gap: 4px;
                padding: 6px 34px 6px 8px;
                width: 100% !important;
                max-width: 100% !important;
                overflow: hidden;
              }
              .contest-result-toolbar-title {
                flex: 1 1 auto;
                min-width: 0;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
                gap: 4px;
                font-size: 12px;
                line-height: 1.15;
              }
              .contest-result-toolbar-title svg {
                width: 14px;
                height: 14px;
              }
              .contest-result-toolbar-actions {
                gap: 2px;
              }
              .contest-result-toolbar-actions button {
                height: 26px;
                padding-left: 6px;
                padding-right: 6px;
                font-size: 10px;
              }
              .contest-result-content {
                padding: 6px;
              }
              .contest-result-table {
                font-size: 8px !important;
                zoom: .65;
              }
              .contest-result-table:has(th:nth-child(9)) { zoom: .58; }
              .contest-result-table:has(th:nth-child(10)) { zoom: .52; }
              .contest-result-table:has(th:nth-child(11)) { zoom: .47; }
              .contest-result-table:has(th:nth-child(12)) { zoom: .43; }
              .contest-result-table:has(th:nth-child(13)) { zoom: .39; }
              .contest-result-table:has(th:nth-child(14)) { zoom: .36; }
              .contest-result-table th,
              .contest-result-table td {
                padding: 3px 1px !important;
                font-size: 8px !important;
                line-height: 1.1;
              }
              .contest-result-table th *,
              .contest-result-table td * {
                font-size: inherit !important;
                line-height: inherit !important;
              }
              .contest-result-table svg {
                width: 9px !important;
                height: 9px !important;
              }
            }
          `}} />
          {/* Action bar */}
          <div className="contest-result-toolbar sticky top-0 z-10 bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between">
            <DialogTitle className="contest-result-toolbar-title text-emerald-600 text-base font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-600" />
              {isEmbedMode ? (contestTitle || 'Kết quả chi tiết') : 'Kết quả chi tiết'}
            </DialogTitle>
            <DialogDescription className="sr-only">Bảng kết quả chi tiết của chương trình thi đua đang chọn.</DialogDescription>
            <div className="contest-result-toolbar-actions flex shrink-0 items-center gap-1">
              {!isEmbedMode && (
                <Button variant="outline" size="sm" onClick={() => setIsResultExpanded(!isResultExpanded)} className="border-gray-300 text-gray-700 h-7 w-7 p-0 hover:bg-gray-100">
                  {isResultExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </Button>
              )}
              {(!isEmbedMode || showEmbedActions) && (
                <Button variant="outline" size="sm" onClick={handleDownloadImage} disabled={isDownloadingImage} className="border-gray-300 text-gray-700 h-7 text-xs hover:bg-gray-100">
                  {isDownloadingImage ? <Loader2 className="w-3 h-3 sm:mr-1 animate-spin" /> : <Camera className="w-3 h-3 sm:mr-1" />}<span className="hidden sm:inline">Tải ảnh</span>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleExport} className="border-gray-300 text-gray-700 h-7 text-xs hover:bg-gray-100"><Download className="w-3 h-3 mr-1" />XLSX</Button>
              {!isEmbedMode && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setIsResultDialogOpen(false); setIsResultExpanded(false); }}
                  aria-label="Đóng kết quả thi đua"
                  title="Đóng kết quả"
                  className="h-7 w-7 shrink-0 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>

          <div ref={resultContentRef} className={`${isEmbedMode ? '' : 'contest-result-content'} px-3 py-2`}>
            <div ref={printRef}>
              {/* Poster image - full width, 21:9 aspect ratio, no gaps */}
              {posterUrl && <div className="mb-3 w-full overflow-hidden" style={{ aspectRatio: '21/9' }}><img src={posterUrl} alt="Poster" className="w-full h-full object-fill shadow-md" /></div>}
              {!posterUrl && !registeredProgram && (
                <ContestPoster contestTitle={contestTitle} startDate={startDate} endDate={endDate} conditionType={conditionType} targetType={targetType} sortedTiers={sortedTiers} filteredContracts={displayContracts} groupedData={groupedData} totalFYP={displayTotalFYP} totalBonus={totalBonusDisplay} achievedCount={achievedCount} notAchievedCount={notAchievedCount} formatCurrency={formatCurrency} formatNumber={formatNumber} formatDate={formatDate} variant="white" />
              )}

              {/* Result Table - slightly larger */}
              <div className={`${isEmbedMode ? 'overflow-x-auto' : 'contest-result-table-wrapper'} border border-emerald-600 shadow-sm mt-3`} id="result-table-container">
                {registeredResultProps ? <RegisteredTargetResults {...registeredResultProps} /> : conditionType === 'pass_count_contracts' ? <TVVContractCountTable
                  groups={groupedData} contracts={displayContracts} staff={staffList} structure={tvvStructList}
                  config={{ secondaryIPMin: passCountIPMin, secondaryAFYPMin: passCountAFYPMin, tvvContractCountMin, includeTNInPassCount }}
                  hideNotAchieved={hideNotAchieved}
                  reward={(g, count) => { const tier = calculateBonus(count).tier; return tier && checkSecondaryTotalCondition(g.contracts).passed ? formatBonusAmountFromContracts(tier, g.contracts, count) : null; }}
                /> : (
                <Table className={isEmbedMode ? 'text-sm' : 'contest-result-table'}>
                  <TableHeader>
                    <TableRow className="bg-emerald-800 hover:bg-emerald-800 [&>th]:whitespace-nowrap">
                      <TableHead className="text-yellow-100 text-center w-[40px] font-bold uppercase">STT</TableHead>
                      {targetType === 'nyd' ? (
                        <>
                          <TableHead className="text-yellow-100 min-w-[60px] font-bold uppercase text-center whitespace-nowrap">NHÓM</TableHead>
                          <TableHead className="text-yellow-100 min-w-[55px] font-bold uppercase text-center whitespace-nowrap">Mã số</TableHead>
                          <TableHead className="text-yellow-100 min-w-[65px] font-bold uppercase text-center whitespace-nowrap">Họ tên</TableHead>
                          <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center whitespace-nowrap">Chức vụ</TableHead>
                          <TableHead className="text-yellow-100 min-w-[65px] font-bold uppercase text-center whitespace-nowrap">
                            {isRecruitmentMode(conditionType) ? 'SL TVVm tuyển' : includeIndividualNTD ? 'Tổng cộng' : getContestMetricLabel(conditionType, topNValueType, 'nyd')}
                          </TableHead>
                          {isRecruitmentMode(conditionType) && recruitmentConfig.activityEnabled && <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center">TVVm đạt HĐ</TableHead>}
                          {isRecruitmentMode(conditionType) && <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center">Thưởng chính</TableHead>}
                          {isRecruitmentMode(conditionType) && recruitmentConfig.activityEnabled && <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center">Thưởng thêm</TableHead>}
                          {renderSecondaryConditionHeadings()}
                          {showRateColumn && !usePhase2 && (
                            <TableHead className="text-yellow-100 min-w-[50px] font-bold uppercase text-center bg-violet-800 whitespace-nowrap"><Percent className="w-3 h-3 inline -mt-0.5" /> Tỷ lệ</TableHead>
                          )}
                          {usePhase2 ? (
                            <>
                              <TableHead className="text-yellow-100 min-w-[60px] font-bold uppercase text-center bg-emerald-700">
                                <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                <div className="text-[9px] font-bold text-red-500 italic">GD1: {phase2StartDate ? formatDate(startDate) : '...'} - {phase2StartDate ? formatDate(phase2StartDate) : '...'}</div>
                              </TableHead>
                              <TableHead className="text-yellow-100 min-w-[60px] font-bold uppercase text-center bg-emerald-700">
                                <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                <div className="text-[9px] font-bold text-red-500 italic">GD2: {phase2StartDate ? formatDate(phase2StartDate) : '...'} - {(phase2EndDate || endDate) ? formatDate(phase2EndDate || endDate) : '...'}</div>
                              </TableHead>
                              <TableHead className="text-yellow-100 min-w-[60px] font-bold uppercase text-center bg-amber-700">
                                <div>Tổng Thưởng</div>
                              </TableHead>
                            </>
                          ) : (
                            <TableHead className="text-yellow-100 min-w-[65px] font-bold uppercase text-center bg-emerald-700">
                              <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                            </TableHead>
                          )}
                          <TableHead className="text-yellow-100 min-w-[60px] font-bold uppercase text-center">Ghi chú</TableHead>
                        </>
                      ) : targetType === 'nhom' ? (
                        isTVVPassCountMode(conditionType) ? (
                          /* Bảng kết quả đơn giản cho TVV đạt thi đua: STT - NHÓM - MÃ TN - HỌ TÊN TN - SL TVV đạt thi đua - THƯỞNG - GHI CHÚ */
                          <>
                            <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center">NHÓM</TableHead>
                            <TableHead className="text-yellow-100 min-w-[55px] font-bold uppercase text-center">MÃ TN</TableHead>
                            <TableHead className="text-yellow-100 min-w-[100px] font-bold uppercase text-center">HỌ TÊN TN</TableHead>
                            <TableHead className="text-yellow-100 min-w-[90px] font-bold uppercase text-center">
                              <div>SL TVV ĐỦ ĐIỀU KIỆN</div>
                              <div className="text-[9px] italic font-normal normal-case text-amber-300">
                                {conditionType === 'pass_count_ip_afyp'
                                  ? `(IP≥${vndToNgan(passCountIPMin)}k + AFYP≥${vndToNgan(passCountAFYPMin)}k)`
                                  : referenceContestId
                                    ? (() => { const rc = savedContests.find(sc => sc.id === referenceContestId); return rc ? rc.title : ''; })()
                                    : '(CTĐK)'}
                              </div>
                              {!includeTNInPassCount && <div className="text-[9px] font-bold text-amber-400 italic">(KO tính TN)</div>}
                            </TableHead>
                            {renderSecondaryConditionHeadings()}
                            <TableHead className="text-yellow-100 min-w-[80px] font-bold uppercase text-center bg-emerald-700">
                              <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> THƯỞNG</div>
                            </TableHead>
                            <TableHead className="text-yellow-100 min-w-[60px] font-bold uppercase text-center">GHI CHÚ</TableHead>
                          </>
                        ) : (
                          <>
                            <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center">NHÓM</TableHead>
                            <TableHead className="text-yellow-100 min-w-[55px] font-bold uppercase text-center">Mã TN</TableHead>
                            <TableHead className="text-yellow-100 min-w-[80px] font-bold uppercase text-center">Tên Trưởng Nhóm</TableHead>
                            <TableHead className="text-yellow-100 min-w-[60px] font-bold uppercase text-center">Chức vụ</TableHead>
                            <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center">
                              {includeIndividualTN ? 'Tổng cộng' : getContestMetricLabel(conditionType, topNValueType, 'nhom')}
                              {startDate && endDate && !isActivityRoundMode(conditionType) && <div className="text-[9px] font-bold text-red-500 italic">{formatDate(startDate)} - {formatDate(endDate)}</div>}
                            </TableHead>
                            {showSecondaryPerContractColumn && (
                              <>
                                {secondaryAFYPMin > 0 && !isAFYP && <TableHead className="text-yellow-100 min-w-[78px] font-bold uppercase text-center bg-amber-800/60"><div>AFYP/HĐ</div><div className="text-[9px] italic text-amber-200 font-normal normal-case">(≥ {formatContestConditionValue(secondaryAFYPMin)})</div></TableHead>}
                                {secondaryIPMin > 0 && isAFYP && <TableHead className="text-yellow-100 min-w-[78px] font-bold uppercase text-center bg-amber-800/60"><div>IP/HĐ</div><div className="text-[9px] italic text-amber-200 font-normal normal-case">(≥ {formatContestConditionValue(secondaryIPMin)})</div></TableHead>}
                              </>
                            )}
                            {renderSecondaryConditionHeadings()}
                          {showRateColumn && !usePhase2 && (
                              <TableHead className="text-yellow-100 min-w-[50px] font-bold uppercase text-center bg-violet-800 whitespace-nowrap"><Percent className="w-3 h-3 inline -mt-0.5" /> Tỷ lệ</TableHead>
                            )}
                            {usePhase2 ? (
                              <>
                                <TableHead className="text-yellow-100 min-w-[60px] font-bold uppercase text-center bg-emerald-700">
                                  <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                  <div className="text-[9px] font-bold text-red-500 italic">GD1: {phase2StartDate ? formatDate(startDate) : '...'} - {phase2StartDate ? formatDate(phase2StartDate) : '...'}</div>
                                </TableHead>
                                <TableHead className="text-yellow-100 min-w-[60px] font-bold uppercase text-center bg-emerald-700">
                                  <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                  <div className="text-[9px] font-bold text-red-500 italic">GD2: {phase2StartDate ? formatDate(phase2StartDate) : '...'} - {(phase2EndDate || endDate) ? formatDate(phase2EndDate || endDate) : '...'}</div>
                                </TableHead>
                                <TableHead className="text-yellow-100 min-w-[60px] font-bold uppercase text-center bg-amber-700">
                                  <div>Tổng Thưởng</div>
                                </TableHead>
                              </>
                            ) : (
                              <TableHead className="text-yellow-100 min-w-[65px] font-bold uppercase text-center bg-emerald-700">
                                <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                              </TableHead>
                            )}
                            <TableHead className="text-yellow-100 min-w-[60px] font-bold uppercase text-center">Ghi chú</TableHead>
                          </>
                        )
                      ) : isPerContractMode(conditionType) ? (
                        <>
                          <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center">NHÓM</TableHead>
                          <TableHead className="text-yellow-100 min-w-[60px] font-bold uppercase text-center">Mã số</TableHead>
                          <TableHead className="text-yellow-100 min-w-[65px] font-bold uppercase text-center">Họ tên</TableHead>
                          <TableHead className="text-yellow-100 text-center w-[85px] font-bold uppercase">Ngày HL</TableHead>
                          <TableHead className="text-yellow-100 min-w-[78px] font-bold uppercase text-center"><div>{isAFYP ? 'AFYP' : 'IP'}</div>{(sortedTiers[0]?.minFYP ?? 0) > 0 && <div className="text-[9px] italic text-amber-200 font-normal normal-case">(≥ {formatContestConditionValue(sortedTiers[0].minFYP)})</div>}</TableHead>
                          {useSecondaryCondition && secondaryAFYPMin > 0 && !isAFYP && (
                            <TableHead className="text-yellow-100 min-w-[78px] font-bold uppercase text-center"><div>AFYP</div><div className="text-[9px] italic text-amber-200 font-normal normal-case">(≥ {formatContestConditionValue(secondaryAFYPMin)})</div></TableHead>
                          )}
                          {(showPerContractIPRewardBase || (useSecondaryCondition && secondaryIPMin > 0 && isAFYP)) && (
                            <TableHead className="text-yellow-100 min-w-[78px] font-bold uppercase text-center"><div>IP</div><div className="text-[9px] italic text-amber-200 font-normal normal-case">{secondaryIPMin > 0 ? `(≥ ${formatContestConditionValue(secondaryIPMin)})` : '(căn cứ thưởng)'}</div></TableHead>
                          )}
                          {renderSecondaryConditionHeadings()}
                          {showRateColumn && !usePhase2 && (
                            <TableHead className="text-yellow-100 min-w-[50px] font-bold uppercase text-center bg-violet-800 whitespace-nowrap"><Percent className="w-3 h-3 inline -mt-0.5" /> Tỷ lệ</TableHead>
                          )}
                          {usePhase2 ? (
                            <>
                              <TableHead className="text-yellow-100 min-w-[60px] font-bold uppercase text-center bg-emerald-700">
                                <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                <div className="text-[9px] font-bold text-red-500 italic">GD1</div>
                              </TableHead>
                              <TableHead className="text-yellow-100 min-w-[60px] font-bold uppercase text-center bg-emerald-700">
                                <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                <div className="text-[9px] font-bold text-red-500 italic">GD2</div>
                              </TableHead>
                              <TableHead className="text-yellow-100 min-w-[60px] font-bold uppercase text-center bg-amber-700">
                                <div>Tổng Thưởng</div>
                              </TableHead>
                            </>
                          ) : (
                            <TableHead className="text-yellow-100 min-w-[65px] font-bold uppercase text-center bg-emerald-700">
                              <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                            </TableHead>
                          )}
                          <TableHead className="text-yellow-100 min-w-[60px] font-bold uppercase text-center">Ghi chú</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center">NHÓM</TableHead>
                          <TableHead className="text-yellow-100 min-w-[60px] font-bold uppercase text-center">Mã số</TableHead>
                          <TableHead className="text-yellow-100 min-w-[65px] font-bold uppercase text-center">Họ tên</TableHead>
                          <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center">
                            <div>{conditionType === 'total_afyp' ? 'Tổng AFYP' : 'Tổng IP'}</div>
                            {startDate && endDate && <div className="text-[9px] font-bold text-red-500 italic">{formatDate(startDate)} - {formatDate(endDate)}</div>}
                          </TableHead>
                          {renderSecondaryConditionHeadings()}
                          {showRateColumn && !usePhase2 && (
                            <TableHead className="text-yellow-100 min-w-[50px] font-bold uppercase text-center bg-violet-800 whitespace-nowrap"><Percent className="w-3 h-3 inline -mt-0.5" /> Tỷ lệ</TableHead>
                          )}
                          {usePhase2 ? (
                            <>
                              <TableHead className="text-yellow-100 min-w-[60px] font-bold uppercase text-center bg-emerald-700">
                                <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                <div className="text-[9px] font-bold text-red-500 italic">GD1</div>
                              </TableHead>
                              <TableHead className="text-yellow-100 min-w-[60px] font-bold uppercase text-center bg-emerald-700">
                                <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                <div className="text-[9px] font-bold text-red-500 italic">GD2</div>
                              </TableHead>
                              <TableHead className="text-yellow-100 min-w-[60px] font-bold uppercase text-center bg-amber-700">
                                <div>Tổng Thưởng</div>
                              </TableHead>
                            </>
                          ) : (
                            <TableHead className="text-yellow-100 min-w-[65px] font-bold uppercase text-center bg-emerald-700">
                              <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                            </TableHead>
                          )}
                          <TableHead className="text-yellow-100 min-w-[60px] font-bold uppercase text-center">Ghi chú</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {targetType === 'nyd' ? (isRecruitmentMode(conditionType) ? recruitmentRows.map((row, idx) => {
                      if (hideNotAchieved && !row.tier && row.activityBonus === 0) return null;
                      return (
                        <TableRow key={row.recruiter.agentCode} className={`${row.totalBonus > 0 ? 'bg-white' : 'bg-red-50'} hover:bg-emerald-50 border-b border-gray-200`}>
                          <TableCell className="text-center text-gray-400 text-xs whitespace-nowrap">{idx + 1}</TableCell>
                          <TableCell className="text-xs text-emerald-700 font-semibold whitespace-nowrap">{row.recruiter.nhom || '—'}</TableCell>
                          <TableCell className="text-xs text-gray-600 font-mono whitespace-nowrap">{row.recruiter.agentCode}</TableCell>
                          <TableCell className="text-xs text-gray-800 whitespace-nowrap">{row.recruiter.agentName}</TableCell>
                          <TableCell className="text-xs text-gray-600 whitespace-nowrap">{row.recruiter.position || '—'}</TableCell>
                          <TableCell className="text-center text-xs font-bold text-gray-900 whitespace-nowrap">{row.recruitCount}</TableCell>
                          {recruitmentConfig.activityEnabled && <TableCell className="text-center text-xs text-violet-700 whitespace-nowrap">{row.activityQualifiedCount}</TableCell>}
                          <TableCell className="text-right text-xs text-emerald-700 whitespace-nowrap">{row.baseBonus ? formatCurrency(row.baseBonus) : '—'}</TableCell>
                          {recruitmentConfig.activityEnabled && <TableCell className="text-right text-xs text-violet-700 whitespace-nowrap">{row.activityBonus ? formatCurrency(row.activityBonus) : '—'}</TableCell>}
                          <TableCell className="text-right bg-emerald-50 text-sm font-bold text-emerald-600 whitespace-nowrap">{row.totalBonus ? formatCurrency(row.totalBonus) : '—'}</TableCell>
                          <TableCell className="text-[10px] italic text-gray-500 whitespace-nowrap">{row.recruits.map(item => item.agentName || item.agentCode).join(', ') || 'Chưa tuyển đủ'}</TableCell>
                        </TableRow>
                      );
                    }) : nydResultRows.map(({ nyd, tier, remaining, effectiveTier, secondaryCheck, value }, idx) => {
                      if (hideNotAchieved && !effectiveTier) return null;
                      if (!nyd.nhom) return null;
                      const phaseBonus = usePhase2 && phase2StartDate ? (() => {
                        const p2Start = new Date(phase2StartDate);
                        const p1Contracts = displayContracts.filter(c => new Date(c.effectiveDate) < p2Start);
                        const p2Contracts = displayContracts.filter(c => new Date(c.effectiveDate) >= p2Start);
                        const threshold = isStandardMode(conditionType) ? luotHDCTThreshold : luotHDThreshold;
                        const phase1 = calculateNYDPhaseOutcome(
                          p1Contracts, nyd.nydCode, bonusTiers, conditionType,
                          includeIndividualNTD, threshold, tvv90MaxMonths, tvv90MinIP,
                          structureStartDateByCode,
                          recruitedAgentScope,
                          displayContracts,
                        );
                        const phase2 = calculateNYDPhaseOutcome(
                          p2Contracts, nyd.nydCode, bonusTiers2, conditionType,
                          includeIndividualNTD, threshold, tvv90MaxMonths, tvv90MinIP,
                          structureStartDateByCode,
                          recruitedAgentScope,
                          displayContracts,
                        );
                        return {
                          phase1Bonus: secondaryCheck.passed ? phase1.bonus : 0,
                          phase2Bonus: secondaryCheck.passed ? phase2.bonus : 0,
                        };
                      })() : null;
                      const nydDeficitNote = tier && !secondaryCheck.passed
                        ? secondaryDeficitNote(secondaryCheck)
                        : remaining !== null
                          ? isActivityRoundMode(conditionType)
                            ? `- ${String(Math.ceil(remaining)).padStart(2, '0')} lượt`
                            : `- ${formatNumber(remaining)}`
                          : 'Chưa đạt';
                      return (
                        <TableRow key={nyd.nydCode} className={`${effectiveTier ? 'bg-white' : 'bg-red-50'} hover:bg-emerald-50 border-b border-gray-200`}>
                          <TableCell className="text-center text-gray-400 text-xs whitespace-nowrap">{idx + 1}</TableCell>
                          <TableCell className="text-xs text-emerald-700 font-semibold whitespace-nowrap">{nyd.nhom || '—'}</TableCell>
                          <TableCell className="text-xs text-gray-600 font-mono whitespace-nowrap">{nyd.nydCode}</TableCell>
                          <TableCell className="text-xs text-gray-800 whitespace-nowrap">{nyd.nydName}</TableCell>
                          <TableCell className="text-xs text-gray-600 whitespace-nowrap">{nyd.position || '—'}</TableCell>
                          <TableCell className="text-right text-xs text-gray-900 whitespace-nowrap">
                            {isActivityRoundMode(conditionType) ? `${value} Lượt` : formatNumber(value)}
                          </TableCell>
                          {renderSecondaryConditionValues(secondaryCheck)}
                            {showRateColumn && !usePhase2 && (
                            <TableCell className="text-center bg-violet-50 text-xs whitespace-nowrap">{effectiveTier ? <span className="font-bold text-violet-600">{formatRate(effectiveTier)}</span> : <span className="text-gray-400">—</span>}</TableCell>
                          )}
                          {usePhase2 && phaseBonus ? (
                            <>
                              <TableCell className="text-right bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{phaseBonus.phase1Bonus > 0 ? formatCurrency(phaseBonus.phase1Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                              <TableCell className="text-right bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{phaseBonus.phase2Bonus > 0 ? formatCurrency(phaseBonus.phase2Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                              <TableCell className="text-right bg-amber-50 text-xs font-bold text-amber-600 whitespace-nowrap">{formatCurrency(phaseBonus.phase1Bonus + phaseBonus.phase2Bonus)}</TableCell>
                            </>
                          ) : (
                            <TableCell className="text-right bg-emerald-50 whitespace-nowrap">{effectiveTier ? <span className="flex items-center justify-end gap-1">{effectiveTier.bonusType === 'gift' ? <Gift className="w-4 h-4 text-pink-500" /> : <Award className="w-4 h-4 text-amber-500" />}<span className="font-bold text-emerald-600 text-sm">{formatBonusAmountFromContracts(effectiveTier, getNYDContributingContracts(nyd.contracts || displayContracts, nyd.nydCode, includeIndividualNTD, recruitedAgentScope, structureStartDateByCode), isActivityRoundMode(conditionType) ? value : nyd.recruitCount)}</span></span> : <span className="text-gray-400 text-xs">—</span>}</TableCell>
                          )}
                          <TableCell className="whitespace-nowrap">{getCombinedTopNote(`nyd:${nyd.nydCode}`) ? <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-sm"><Crown className="w-4 h-4" />{getCombinedTopNote(`nyd:${nyd.nydCode}`)}</span> : !effectiveTier ? <span className="text-[10px] italic text-gray-400">{nydDeficitNote}</span> : null}</TableCell>
                        </TableRow>
                      );
                    })) : targetType === 'nhom' ? [...groupedData].map((g) => {
                      const groupPhase = getGroupPhaseBonus(g);
                      const tvvPassCount = conditionType === 'pass_count_ip_afyp' ? getGroupTVVPassCountIPAFYP(g) : getGroupTVVPassCount(g);
                      const tier = isTVVPassCountMode(conditionType)
                        ? calculateBonus(tvvPassCount).tier
                        : isActivityRoundMode(conditionType) ? calculateActivityRoundBonus(g.activityRounds).tier : calculateBonus(getGroupValue(g)).tier;
                      const remaining = isTVVPassCountMode(conditionType)
                        ? getRemainingToNextTier(tvvPassCount)
                        : isActivityRoundMode(conditionType) ? getRemainingToNextActivityRoundTier(g.activityRounds) : getRemainingToNextTier(g.totalFYP);
                      return { group: g, tier: usePhase2 && phase2StartDate && !isTVVPassCountMode(conditionType) ? groupPhase.phase1Tier || groupPhase.phase2Tier : tier, remaining, groupPhase, tvvPassCount };
                    }).sort((a, b) => {
                      const aValue = isTVVPassCountMode(conditionType) ? a.tvvPassCount : isActivityRoundMode(conditionType) ? a.group.activityRounds : getGroupValue(a.group);
                      const bValue = isTVVPassCountMode(conditionType) ? b.tvvPassCount : isActivityRoundMode(conditionType) ? b.group.activityRounds : getGroupValue(b.group);
                      return bValue - aValue;
                    }).map(({ group, tier, remaining, groupPhase, tvvPassCount }, idx) => {
                      if (hideNotAchieved && (!tier || !checkSecondaryTotalCondition(group.contracts || []).passed)) return null;
                      if (!group.nhom && !group.maNhom) return null;
                      // Kiểm tra điều kiện bổ sung Tổng AFYP/Tổng IP cho nhóm
                      const secondaryCheck = checkSecondaryTotalCondition(group.contracts || []);
                      const secondaryPassed = secondaryCheck.passed;
                      const effectiveTier = secondaryPassed ? tier : null;
                      // Per-contract secondary: tính số HĐ đạt AFYP/IP tối thiểu / tổng số HĐ
                      const groupContracts = group.contracts || [];
                      const totalContracts = groupContracts.length;
                      const afypPassCount = groupContracts.filter(c => c.afyp >= secondaryAFYPMin).length;
                      const ipPassCount = groupContracts.filter(c => c.pdt10DT >= secondaryIPMin).length;

                      // Bảng đơn giản cho TVV đạt thi đua: STT - NHÓM - MÃ TN - HỌ TÊN TN - SL TVV đạt thi đua - THƯỞNG - GHI CHÚ
                      if (isTVVPassCountMode(conditionType)) {
                        return (
                          <TableRow key={group.maNhom} className={`${effectiveTier ? 'bg-white' : 'bg-red-50'} hover:bg-emerald-50 border-b border-gray-200`}>
                            <TableCell className="text-center text-gray-400 text-xs whitespace-nowrap">{idx + 1}</TableCell>
                            <TableCell className="text-xs text-gray-800 whitespace-nowrap"><span className="font-semibold text-emerald-700">{group.nhom || '—'}</span></TableCell>
                            <TableCell className="text-xs text-gray-600 font-mono whitespace-nowrap">{group.leader?.agentCode || '—'}</TableCell>
                            <TableCell className="text-xs text-gray-800 whitespace-nowrap"><span className="font-medium">{group.leader?.agentName || '—'}</span></TableCell>
                            <TableCell className="text-center text-xs whitespace-nowrap">
                              <span className="text-gray-900 font-bold text-base">{tvvPassCount}</span>
                              <span className="text-gray-500 text-xs ml-1">TVV</span>
                            </TableCell>
                            {renderSecondaryConditionValues(secondaryCheck)}
                            <TableCell className="text-right bg-emerald-50 whitespace-nowrap">{effectiveTier ? <span className="flex items-center justify-end gap-1">{effectiveTier.bonusType === 'gift' ? <Gift className="w-4 h-4 text-pink-500" /> : effectiveTier.bonusType === 'money_per_tvv' ? <UserCheck className="w-4 h-4 text-indigo-500" /> : <Award className="w-4 h-4 text-amber-500" />}<span className="font-bold text-emerald-600 text-sm">{formatBonusAmountFromContracts(effectiveTier, group.contracts, tvvPassCount)}</span></span> : <span className="text-gray-400 text-xs">—</span>}</TableCell>
                            <TableCell className="whitespace-nowrap">{!effectiveTier && remaining !== null ? <span className="text-[10px] italic text-gray-400">- {remaining} TVV</span> : !effectiveTier ? <span className="text-[10px] italic text-gray-400">Chưa đạt</span> : null}</TableCell>
                          </TableRow>
                        );
                      }

                      return (
                        <TableRow key={group.maNhom} className={`${effectiveTier ? 'bg-white' : 'bg-red-50'} hover:bg-emerald-50 border-b border-gray-200`}>
                          <TableCell className="text-center text-gray-400 text-xs whitespace-nowrap">{idx + 1}</TableCell>
                          <TableCell className="text-xs text-gray-800 whitespace-nowrap"><span className="font-semibold text-emerald-700">{group.nhom || '—'}</span></TableCell>
                          <TableCell className="text-xs text-gray-600 font-mono whitespace-nowrap">{group.leader?.agentCode || '—'}</TableCell>
                          <TableCell className="text-xs text-gray-800 whitespace-nowrap"><span className="font-medium">{group.leader?.agentName || '—'}</span></TableCell>
                          <TableCell className="text-xs text-gray-600 whitespace-nowrap">{group.leader?.position || '—'}</TableCell>
                          <TableCell className="text-right text-xs whitespace-nowrap">
                            {isActivityRoundMode(conditionType)
                              ? <span className="text-gray-900">{group.activityRounds} {isStandardMode(conditionType) ? 'Lượt chuẩn' : 'Lượt'}</span>
                              : <span className="text-gray-900">{formatNumber(getGroupValue(group))}</span>
                            }
                          </TableCell>
                          {showSecondaryPerContractColumn && (
                            <>
                              {secondaryAFYPMin > 0 && !isAFYP && (
                                <TableCell className={`text-right text-xs whitespace-nowrap bg-amber-50 ${afypPassCount === totalContracts && totalContracts > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {afypPassCount === totalContracts && totalContracts > 0 ? `${afypPassCount}/${totalContracts} HĐ` : `- ${String(Math.max(0, totalContracts - afypPassCount)).padStart(2, '0')} HĐ`}
                                </TableCell>
                              )}
                              {secondaryIPMin > 0 && isAFYP && (
                                <TableCell className={`text-right text-xs whitespace-nowrap bg-amber-50 ${ipPassCount === totalContracts && totalContracts > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {ipPassCount === totalContracts && totalContracts > 0 ? `${ipPassCount}/${totalContracts} HĐ` : `- ${String(Math.max(0, totalContracts - ipPassCount)).padStart(2, '0')} HĐ`}
                                </TableCell>
                              )}
                            </>
                          )}
                          {renderSecondaryConditionValues(secondaryCheck)}
                            {showRateColumn && !usePhase2 && (
                            <TableCell className="text-center bg-violet-50 text-xs whitespace-nowrap">{effectiveTier ? <span className="font-bold text-violet-600">{formatRate(effectiveTier)}</span> : <span className="text-gray-400">—</span>}</TableCell>
                          )}
                          {usePhase2 ? (
                            <>
                              <TableCell className="text-right bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{effectiveTier && groupPhase.phase1Bonus > 0 ? formatCurrency(groupPhase.phase1Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                              <TableCell className="text-right bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{effectiveTier && groupPhase.phase2Bonus > 0 ? formatCurrency(groupPhase.phase2Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                              <TableCell className="text-right bg-amber-50 text-xs font-bold text-amber-600 whitespace-nowrap">{effectiveTier ? formatCurrency(groupPhase.phase1Bonus + groupPhase.phase2Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                            </>
                          ) : (
                            <TableCell className="text-right bg-emerald-50 whitespace-nowrap">{effectiveTier ? <span className="flex items-center justify-end gap-1">{effectiveTier.bonusType === 'gift' ? <Gift className="w-4 h-4 text-pink-500" /> : <Award className="w-4 h-4 text-amber-500" />}<span className="font-bold text-emerald-600 text-sm">{formatBonusAmountFromContracts(effectiveTier, group.contracts, group.activityRounds)}</span></span> : <span className="text-gray-400 text-xs">—</span>}</TableCell>
                          )}
                          <TableCell className="whitespace-nowrap">{getCombinedTopNote(`nhom:${group.maNhom}`) ? <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-sm"><Crown className="w-4 h-4" />{getCombinedTopNote(`nhom:${group.maNhom}`)}</span> : !effectiveTier && remaining !== null ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? secondaryDeficitNote(secondaryCheck) : isActivityRoundMode(conditionType) ? `- ${String(Math.ceil(remaining)).padStart(2, '0')} lượt` : `- ${formatNumber(remaining)}`}</span> : !effectiveTier ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? secondaryDeficitNote(secondaryCheck) : 'Chưa đạt'}</span> : null}</TableCell>
                        </TableRow>
                      );
                    }) : isPerContractMode(conditionType) ? visiblePerContractResultRows.map(({ contract, cValue, tier, remaining, phaseInfo, secondaryCheck, secondaryPassed, effectiveTier, agentContracts }, idx) => {
                      const group = resolveTvvGroup(contract.agentCode, contract.maNhom, contract.nhom);
                      return (
                        <TableRow key={contract.id} className={`${effectiveTier ? 'bg-white' : 'bg-red-50'} hover:bg-emerald-50 border-b border-gray-200`}>
                          <TableCell className="text-center text-gray-400 text-xs whitespace-nowrap">{resultPageStart + idx + 1}</TableCell>
                          <TableCell className="text-xs text-emerald-700 font-semibold whitespace-nowrap">{group.nhom}</TableCell>
                          <TableCell className="text-xs text-gray-600 font-mono whitespace-nowrap">{contract.agentCode}</TableCell>
                          <TableCell className="text-xs text-gray-800 whitespace-nowrap">{contract.agentName}</TableCell>
                          <TableCell className="text-center text-xs text-gray-600 whitespace-nowrap">{formatDate(contract.effectiveDate)}</TableCell>
                          <TableCell className="text-right text-xs text-gray-900 whitespace-nowrap">{formatNumber(cValue)}</TableCell>
                          {useSecondaryCondition && secondaryAFYPMin > 0 && !isAFYP && (
                            <TableCell className={`text-right text-xs whitespace-nowrap ${contract.afyp >= secondaryAFYPMin ? 'text-emerald-600' : 'text-red-500'}`}>{formatContestConditionProgress(contract.afyp, secondaryAFYPMin)}</TableCell>
                          )}
                          {(showPerContractIPRewardBase || (useSecondaryCondition && secondaryIPMin > 0 && isAFYP)) && (
                            <TableCell className={`text-right text-xs whitespace-nowrap ${secondaryIPMin > 0 && contract.pdt10DT < secondaryIPMin ? 'text-red-500' : 'text-gray-700'}`}>{secondaryIPMin > 0 ? formatContestConditionProgress(contract.pdt10DT, secondaryIPMin) : formatNumber(contract.pdt10DT)}</TableCell>
                          )}
                          {renderSecondaryConditionValues(secondaryCheck)}
                            {showRateColumn && !usePhase2 && (
                            <TableCell className="text-center bg-violet-50 text-xs whitespace-nowrap">{effectiveTier ? <span className="font-bold text-violet-600">{formatRate(effectiveTier)}</span> : <span className="text-gray-400">—</span>}</TableCell>
                          )}
                          {usePhase2 ? (
                            <>
                              <TableCell className="text-right bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{effectiveTier && phaseInfo.phase1Bonus > 0 ? formatCurrency(phaseInfo.phase1Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                              <TableCell className="text-right bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{effectiveTier && phaseInfo.phase2Bonus > 0 ? formatCurrency(phaseInfo.phase2Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                              <TableCell className="text-right bg-amber-50 text-xs font-bold text-amber-600 whitespace-nowrap">{effectiveTier ? formatCurrency(phaseInfo.phase1Bonus + phaseInfo.phase2Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                            </>
                          ) : (
                            <TableCell className="text-right bg-emerald-50 whitespace-nowrap">{effectiveTier ? <span className="flex items-center justify-end gap-1">{effectiveTier.bonusType === 'gift' ? <Gift className="w-4 h-4 text-pink-500" /> : <Award className="w-4 h-4 text-amber-500" />}<span className="font-bold text-emerald-600 text-sm">{formatBonusAmountFromContracts(effectiveTier, [contract], undefined, agentContracts)}</span></span> : <span className="text-gray-400 text-xs">—</span>}</TableCell>
                          )}
                          <TableCell className="whitespace-nowrap">{getCombinedTopNote(`contract:${contract.id}`) ? <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-sm"><Crown className="w-4 h-4" />{getCombinedTopNote(`contract:${contract.id}`)}</span> : !effectiveTier && remaining !== null ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? secondaryDeficitNote(secondaryCheck) : `- ${formatNumber(remaining)}`}</span> : !effectiveTier ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? secondaryDeficitNote(secondaryCheck) : 'Chưa đạt'}</span> : null}</TableCell>
                        </TableRow>
                      );
                    }) : (() => {
                      // total_ip / total_afyp / top_n_ip mode for TVV: use pre-computed tvvTotalRows (includes TVV with 0 contracts)
                      // Top N mode: hiển thị TẤT CẢ TVV (kể cả k có doanh số)
                      // Theo yêu cầu user: KHÔNG có cột HẠNG riêng — ghi 'Quán quân/Á quân/Hạng N' vào cột Ghi chú
                      const isTopNResult = isTopNMode(conditionType);
                      // Đếm số TVV đạt (qualified) để gán label Quán quân/Á quân theo thứ hạng đạt (không phải absolute rank)
                      const qualifiedRows = isTopNResult
                        ? tvvTotalRows.map((r, i) => ({ r, i, qualified: !!r.tier }))
                            .filter(x => x.qualified)
                            .sort((a, b) => b.r.value - a.r.value)
                        : [];
                      const qualifiedIdxMap = new Map<string, number>(); // agentCode → qualifier rank (0-based)
                      qualifiedRows.forEach((q, qi) => qualifiedIdxMap.set(q.r.agent.agentCode, qi));
                      return visibleTvvTotalRows.map(({ agent, value, tier, remaining, phaseInfo }, idx) => {
                        // Kiểm tra điều kiện bổ sung Tổng AFYP/Tổng IP
                        const agentContracts = displayContractsByAgent.get(agent.agentCode) || [];
                        const secondaryCheck = checkSecondaryTotalCondition(agentContracts);
                        const secondaryPassed = secondaryCheck.passed;
                        // Nếu có điều kiện bổ sung mà không đạt → không được thưởng (nhưng vẫn hiển thị)
                        const effectiveTier = secondaryPassed ? tier : null;
                        // Top N mode: tính label hạng để ghi vào cột Ghi chú (KHÔNG có cột HẠNG riêng)
                        let noteLabel: React.ReactNode = null;
                        // Detect selected Phòng để append tên phòng vào danh hiệu Top N
                        // VD: chọn Phòng 1 → "Quán quân P1", "Á quân P1", "Hạng 3 P1"
                        const selectedPhongKey = Array.from(selectedSubjectTypes).find(k => k.startsWith('phong_'));
                        const selectedPhong = selectedPhongKey ? phongStructList.find(p => `phong_${p.maPhong}` === selectedPhongKey) : null;
                        const phongSuffix = selectedPhong ? ` ${selectedPhong.tenPhong || selectedPhong.maPhong}` : '';
                        if (isTopNResult && effectiveTier) {
                          const qualifierRank = qualifiedIdxMap.get(agent.agentCode) ?? -1;
                          if (qualifierRank === 0) {
                            noteLabel = <span className="inline-flex items-center gap-1 text-amber-600 font-bold text-sm"><Crown className="w-4 h-4" />Quán quân{phongSuffix}</span>;
                          } else if (qualifierRank === 1) {
                            noteLabel = <span className="inline-flex items-center gap-1 text-slate-500 font-bold text-sm"><Medal className="w-4 h-4" />Á quân{phongSuffix}</span>;
                          } else {
                            noteLabel = <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-sm"><Trophy className="w-4 h-4" />Hạng {qualifierRank + 1}{phongSuffix}</span>;
                          }
                        } else if (isTopNResult && !effectiveTier && remaining !== null) {
                          noteLabel = <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? secondaryDeficitNote(secondaryCheck) : `- ${formatNumber(remaining)}`}</span>;
                        } else if (isTopNResult && !effectiveTier) {
                          noteLabel = <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? secondaryDeficitNote(secondaryCheck) : 'Chưa đạt'}</span>;
                        }
                        // Cột Ghi chú cho mode KHÔNG phải Top N (giữ nguyên logic cũ)
                        const nonTopNoteCell = !effectiveTier && remaining !== null
                          ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? secondaryDeficitNote(secondaryCheck) : `- ${formatNumber(remaining)}`}</span>
                          : !effectiveTier
                            ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? secondaryDeficitNote(secondaryCheck) : 'Chưa đạt'}</span>
                            : null;
                        return (
                          <TableRow key={agent.agentCode} className={`${effectiveTier ? 'bg-white' : 'bg-red-50'} hover:bg-emerald-50 border-b border-gray-200`}>
                            <TableCell className="text-center text-gray-400 text-xs whitespace-nowrap">{resultPageStart + idx + 1}</TableCell>
                            <TableCell className="text-xs text-emerald-700 font-semibold whitespace-nowrap">{agent.nhom || '—'}</TableCell>
                            <TableCell className="text-xs text-gray-600 font-mono whitespace-nowrap">{agent.agentCode}</TableCell>
                            <TableCell className="text-xs text-gray-800 whitespace-nowrap">{agent.agentName}</TableCell>
                            <TableCell className="text-right text-xs text-gray-900 whitespace-nowrap">{formatNumber(value)}</TableCell>
                            {renderSecondaryConditionValues(secondaryCheck)}
                            {showRateColumn && !usePhase2 && (
                              <TableCell className="text-center bg-violet-50 text-xs whitespace-nowrap">{effectiveTier ? <span className="font-bold text-violet-600">{formatRate(effectiveTier)}</span> : <span className="text-gray-400">—</span>}</TableCell>
                            )}
                            {usePhase2 ? (
                              <>
                                <TableCell className="text-right bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{effectiveTier && phaseInfo.phase1Bonus > 0 ? formatCurrency(phaseInfo.phase1Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                                <TableCell className="text-right bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{effectiveTier && phaseInfo.phase2Bonus > 0 ? formatCurrency(phaseInfo.phase2Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                                <TableCell className="text-right bg-amber-50 text-xs font-bold text-amber-600 whitespace-nowrap">{effectiveTier ? formatCurrency(phaseInfo.phase1Bonus + phaseInfo.phase2Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                              </>
                            ) : (
                              <TableCell className="text-right bg-emerald-50 whitespace-nowrap">{effectiveTier ? <span className="flex items-center justify-end gap-1">{effectiveTier.bonusType === 'gift' ? <Gift className="w-4 h-4 text-pink-500" /> : <Award className="w-4 h-4 text-amber-500" />}<span className="font-bold text-emerald-600 text-sm">{formatBonusAmountFromContracts(effectiveTier, agentContracts, isActivityRoundMode(conditionType) ? value : undefined)}</span></span> : <span className="text-gray-400 text-xs">—</span>}</TableCell>
                            )}
                            <TableCell className="whitespace-nowrap">{isTopNResult ? noteLabel : nonTopNoteCell}</TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
                )}
              </div>
            </div>
          </div>
          {!registeredProgram && conditionType !== 'pass_count_contracts' && paginatedResultTotal > CONTEST_RESULT_PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3 border-t border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
              <Button type="button" variant="outline" size="sm" disabled={safeResultPage === 0} onClick={() => setResultPage(current => Math.max(0, current - 1))} className="h-7 border-gray-300 px-3 text-xs text-gray-700">Trước</Button>
              <span>Hiển thị {resultPageStart + 1}–{Math.min(resultPageStart + CONTEST_RESULT_PAGE_SIZE, paginatedResultTotal)} / {paginatedResultTotal}</span>
              <Button type="button" variant="outline" size="sm" disabled={safeResultPage >= resultPageCount - 1} onClick={() => setResultPage(current => Math.min(resultPageCount - 1, current + 1))} className="h-7 border-gray-300 px-3 text-xs text-gray-700">Sau</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Subject Dialog - Nhập đối tượng thi đua (hidden in embed mode) */}
      {!isEmbedMode && (
      <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-[#1a1a2e] border-emerald-500/20">
          <DialogHeader><DialogTitle className="text-white flex items-center gap-2"><Users className="w-4 h-4 text-sky-400" /> Nhập đối tượng thi đua</DialogTitle><DialogDescription className="text-emerald-300/60">Khi có danh sách, kết quả chỉ tính cho các đối tượng này</DialogDescription></DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-1">
              <Label className="text-xs text-emerald-200/70">
                {targetType === 'tvv' ? 'Mã TVV hoặc tên TVV' : targetType === 'nyd' ? 'Mã NYD' : 'Mã nhóm'}, mỗi đối tượng 1 dòng
              </Label>
              <textarea
                value={thiDuaSubjects}
                onChange={(e) => setThiDuaSubjects(e.target.value)}
                placeholder={targetType === 'tvv' ? 'D104142435\nD104142436\n...' : targetType === 'nyd' ? 'D104142435\nD104142436\n...' : 'MC001\nMC002\n...'}
                className="w-full h-32 text-xs bg-gray-800 border border-gray-600 text-white rounded-lg p-2 font-mono resize-none focus:outline-none focus:border-sky-500/50"
              />
            </div>
            {/* Bộ chọn nhanh cũng dùng đúng một nguồn Cấu trúc như ở cấu hình. */}
            <div className="space-y-1.5">
              <Label className="text-xs text-emerald-300/70">Đổi nhóm đối tượng chính:</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { key: 'allTvv' as const, label: 'Tất cả TVV', desc: `Trừ BanCa`, count: subjectLists.allTvv.length },
                  { key: 'tvvm'  as const, label: 'TVVm',  desc: `TVV mới ≤ 12 tháng`, count: subjectLists.tvvm.length },
                  { key: 'tvvCu' as const, label: 'TVV cũ', desc: `TVV còn lại`, count: subjectLists.tvvCu.length },
                  { key: 'nhom'  as const, label: 'Nhóm',  desc: `DS TB/TN`, count: subjectLists.nhom.length },
                  { key: 'ttn'   as const, label: 'TTN',   desc: `Trưởng tổ nhóm (Cấu trúc)`, count: subjectLists.ttn.length },
                  { key: 'ntd'   as const, label: 'NTD',   desc: `TN + TTN`, count: subjectLists.ntd.length },
                ]).map(btn => {
                  const active = selectedSubjectTypes.has(btn.key);
                  return (
                    <button
                      key={btn.key}
                      type="button"
                      onClick={() => toggleSubjectType(btn.key)}
                      className={`text-left px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                        active
                          ? 'bg-sky-500/25 border-sky-400/60 text-white'
                          : 'bg-gray-800/40 border-gray-600/50 text-emerald-200/80 hover:bg-sky-500/10 hover:border-sky-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{btn.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${active ? 'bg-sky-400/30 text-sky-100' : 'bg-gray-700/50 text-emerald-300/60'}`}>{btn.count}</span>
                      </div>
                      <div className="text-[9px] mt-0.5 text-emerald-300/50 leading-tight">{btn.desc}</div>
                    </button>
                  );
                })}
                {/* Phòng buttons — tất cả TVV (mọi chức vụ) trong từng Phòng KD */}
                {phongStructList.map((p, idx) => {
                  const pKey = `phong_${p.maPhong}`;
                  const pLabel = p.tenPhong || `Phòng ${idx + 1}`;
                  const pCount = subjectLists.phongLists?.[pKey]?.length || 0;
                  const active = selectedSubjectTypes.has(pKey);
                  return (
                    <button
                      key={pKey}
                      type="button"
                      onClick={() => toggleSubjectType(pKey)}
                      className={`text-left px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                        active
                          ? 'bg-amber-500/25 border-amber-400/60 text-white'
                          : 'bg-gray-800/40 border-gray-600/50 text-emerald-200/80 hover:bg-amber-500/10 hover:border-amber-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{pLabel}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${active ? 'bg-amber-400/30 text-amber-100' : 'bg-gray-700/50 text-emerald-300/60'}`}>{pCount}</span>
                      </div>
                      <div className="text-[9px] mt-0.5 text-emerald-300/50 leading-tight">Tất cả TVV trong phòng</div>
                    </button>
                  );
                })}
              </div>
            </div>
            {thiDuaSubjects.trim() && (
              <div className="rounded-lg bg-sky-500/10 border border-sky-500/20 p-2 text-xs text-sky-300">
                <p className="font-medium">Đã nhập {subjectCodes.length} đối tượng</p>
              </div>
            )}
            {(targetType === 'tvv' ? contracts.length > 0 : targetType === 'nyd' ? ntdCandidates.length > 0 : staffList.length > 0) && (
              <div className="space-y-1">
                <Label className="text-xs text-emerald-300/70">Đối tượng có sẵn ({targetType === 'tvv' ? 'TVV' : targetType === 'nyd' ? 'NTD' : 'Nhóm'}):</Label>
                <div className="max-h-24 overflow-y-auto rounded-lg border border-gray-600/50 p-1.5">
                  <div className="flex flex-wrap gap-1">
                    {targetType === 'tvv'
                      ? [...new Set(contracts.map(c => c.agentCode))].map(code => (
                          <button key={code} onClick={() => setThiDuaSubjects(prev => prev ? prev + '\n' + code : code)} className="px-1.5 py-0.5 text-[9px] bg-gray-800/50 hover:bg-sky-500/10 border border-gray-600/50 text-emerald-200/70 hover:text-sky-400 rounded cursor-pointer transition-colors">{code}</button>
                        ))
                      : targetType === 'nyd'
                        ? ntdCandidates.map(r => (
                            <button key={r.agentCode} onClick={() => setThiDuaSubjects(prev => prev ? prev + '\n' + r.agentCode : r.agentCode)} className="px-1.5 py-0.5 text-[9px] bg-gray-800/50 hover:bg-sky-500/10 border border-gray-600/50 text-emerald-200/70 hover:text-sky-400 rounded cursor-pointer transition-colors">{r.agentCode}</button>
                          ))
                        : [...new Map(staffList.filter(s => s.maNhom && !norm(s.nhom || '').toLowerCase().includes('dso') && !(s.maNhom || '').toLowerCase().includes('dso')).map(s => [s.maNhom, { maNhom: s.maNhom, nhom: s.nhom }])).values()].map(g => (
                            <button key={g.maNhom} onClick={() => setThiDuaSubjects(prev => prev ? prev + '\n' + g.maNhom : g.maNhom)} className="px-1.5 py-0.5 text-[9px] bg-gray-800/50 hover:bg-sky-500/10 border border-gray-600/50 text-emerald-200/70 hover:text-sky-400 rounded cursor-pointer transition-colors">{g.nhom || '—'}</button>
                          ))
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setThiDuaSubjects(''); setSelectedSubjectTypes(new Set()); }} className="h-8 border-red-500/30 text-red-400 bg-transparent hover:bg-red-500/10"><Trash2 className="w-3 h-3 mr-1" /> Xóa tất cả</Button>
            <Button variant="outline" onClick={() => setIsSubjectDialogOpen(false)} className="h-8 border-emerald-500/30 bg-transparent text-emerald-200">Đóng</Button>
            <Button onClick={() => { setIsSubjectDialogOpen(false); toast({ title: 'Đã áp dụng', description: subjectCodes.length > 0 ? `Lọc theo ${subjectCodes.length} đối tượng` : 'Hiển thị tất cả' }); }} className="bg-sky-500/80 hover:bg-sky-600 h-8 border border-sky-500/30">Áp dụng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}

// Wrapper với Suspense — useSearchParams yêu cầu Suspense boundary trong Next.js App Router
export default function ThiDuaPage() {
  return (
    <Suspense fallback={<AppLoader show />}>
      <ThiDuaPageInner />
    </Suspense>
  );
}

