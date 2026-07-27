Warning: truncated output (original token count: 76197)
Total output lines: 4368

'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// useSettings removed — no CSV sync, data from Quản lý page
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/back-button';
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
  RefreshCw, CheckCircle2, CalendarClock, Crown, Medal,
} from 'lucide-react';
import { NeonDatePicker } from '@/components/neon-date-picker';

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
  bonusType: 'money' | 'gift' | 'percent' | 'money_per_round' | 'money_per_tvv' | 'percent_fyc'; bonusText: string; bonusPercent: number;
}

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
}

// MonthlyRevenueRow removed — all data now sourced from Contracts table only

interface SavedContest {
  id: string; title: string; startDate: string; endDate: string;
  issueDate: string | null; conditionType: string; targetType: string;
  bonusTiers: string; posterUrl?: string; participants?: string;
  usePhase2?: boolean; phase2StartDate?: string | null; phase2EndDate?: string | null; bonusTiers2?: string;
  useSecondaryCondition?: boolean; secondaryAFYPMin?: number; secondaryIPMin?: number;
  secondaryLuotHDMin?: number; secondaryLuotHDCMin?: number;
  secondaryLuotHDFilter?: string; secondaryLuotHDCFilter?: string;
  secondaryTotalAFYPMin?: number; secondaryTotalIPMin?: number;
  hideNotAchieved?: boolean; includeIndividualNTD?: boolean; includeIndividualTN?: boolean;
  luotHDThreshold?: number; luotHDCTThreshold?: number;
  tvv90MaxMonths?: number; tvv90MinIP?: number;
  referenceContestId?: string;
  includeTNInPassCount?: boolean;
  topN?: number;
  topNMinIP?: number;
  topNValueType?: 'ip' | 'afyp';
  filterByEffectiveDate?: boolean;
  csvContractUrl?: string; csvStaffUrl?: string; csvRecruiterUrl?: string;
  createdAt: string; updatedAt: string;
}

type ConditionType = 'per_contract_ip' | 'per_contract_afyp' | 'total_ip' | 'total_afyp' | 'activity_round' | 'activity_round_tvvm' | 'activity_round_standard' | 'activity_round_standard_tvvm' | 'activity_round_tvv90' | 'tvv_pass_count' | 'top_n_ip' | 'pass_count_ip_afyp';
type TargetType = 'tvv' | 'nhom' | 'nyd';

function isActivityRoundMode(ct: ConditionType): boolean {
  return ct === 'activity_round' || ct === 'activity_round_tvvm' || ct === 'activity_round_standard' || ct === 'activity_round_standard_tvvm' || ct === 'activity_round_tvv90';
}
function isTVVPassCountMode(ct: ConditionType): boolean {
  return ct === 'tvv_pass_count' || ct === 'pass_count_ip_afyp';
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

function isTVVm(startDate: string | null, maxMonths: number = 12): boolean {
  if (!startDate) return false;
  const start = new Date(startDate);
  const now = new Date();
  const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return diffMonths <= maxMonths;
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
  const start = new Date(startDate);
  const now = new Date();
  const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return diffMonths <= maxMonths;
}

// Helper: calculate lượt for a group of contracts based on tinhLuot3tr
// Đếm SỐ DÒNG hợp đồng có tinhLuot3tr >= threshold (không phải unique TVV)
function calculateLuot(contracts: Contract[], luotThreshold: number, conditionType: ConditionType, tvv90MaxMonths?: number, tvv90MinIP?: number, structureStartDates?: Map<string, string | null>): number {
  let count = 0;
  for (const c of contracts) {
    // Thâm niên lấy từ DS TVV Cấu trúc; dữ liệu dòng hợp đồng chỉ là fallback cũ.
    const structureStartDate = structureStartDates?.get(c.agentCode);
    if (isTVVmMode(conditionType)) {
      if (!isTVVm(structureStartDate || c.ngayBatDauLamViec || c.startDate)) continue;
    }
    if (conditionType === 'activity_round_tvv90') {
      if (!isTVV90Agent(contracts, c.agentCode, tvv90MaxMonths, tvv90MinIP, structureStartDate)) continue;
    }
    // Dùng pdt10DT (IP thực tế) so với luotThreshold — ĐỒNG BỘ với contest-calculator
    // (Trước đây dùng c.tinhLuot3tr — field cố định trong DB, không đổi theo thời gian)
    if (c.tinhLuot3tr >= luotThreshold) {
      count++;
    }
  }
  return count;
}

// CSV auto-sync removed — data is now sourced from Quản lý page only

// Chuẩn hóa Unicode NFC để so sánh tiếng Việt (NFD vs NFC, vd: "ề" vs "ề")
function norm(s: string): string { return s.normalize('NFC'); }

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}
function formatNumber(amount: number): string { return new Intl.NumberFormat('vi-VN').format(amount); }
function formatDate(dateStr: string): string { return new Date(dateStr).toLocaleDateString('vi-VN'); }
function nganToVnd(val: number): number { return val * 1_000; }
function vndToNgan(val: number): number { return val / 1_000; }

function formatBonus(tier: BonusTier, fyp?: number, rounds?: number): string {
  if (tier.bonusType === 'gift' && tier.bonusText) return tier.bonusText;
  if (tier.bonusType === 'percent' && tier.bonusPercent > 0) {
    const calculated = fyp ? tier.bonusPercent / 100 * fyp : 0;
    return `${tier.bonusPercent}% IP${fyp ? ` = ${formatCurrency(calculated)}` : ''}`;
  }
  if (tier.bonusType === 'percent_fyc' && tier.bonusPercent > 0) {
    const fyc = fyp ? fyp * 0.25 : 0;
    const calculated = fyc ? tier.bonusPercent / 100 * fyc : 0;
    return `${tier.bonusPercent}% FYC${fyp ? ` = ${formatCurrency(calculated)}` : ''}`;
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

// Format rate label for percent-based bonus types
function formatRate(tier: BonusTier): string {
  if (tier.bonusType === 'percent') return `${tier.bonusPercent}%`;
  if (tier.bonusType === 'percent_fyc') return `${tier.bonusPercent}%`;
  return '';
}

// Format bonus amount only (no formula) for display in table
function formatBonusAmount(tier: BonusTier, fyp?: number, rounds?: number): string {
  if (tier.bonusType === 'gift' && tier.bonusText) return tier.bonusText;
  const amount = computeBonusFromTier(tier, fyp || 0, rounds);
  return formatCurrency(amount);
}

// Check if any tier uses percent-based bonus
function hasPercentBonus(tiers: BonusTier[]): boolean {
  return tiers.some(t => t.bonusType === 'percent' || t.bonusType === 'percent_fyc');
}

function computeBonusFromTier(tier: BonusTier, fyp: number, rounds?: number): number {
  if (tier.bonusType === 'percent') return tier.bonusPercent / 100 * fyp;
  if (tier.bonusType === 'percent_fyc') return tier.bonusPercent / 100 * (fyp * 0.25);
  if (tier.bonusType === 'money_per_round') return tier.bonusAmount * (rounds || 0);
  if (tier.bonusType === 'money_per_tvv') return tier.bonusAmount * (rounds || 0); // rounds doubles as tvvCount
  return tier.bonusAmount;
}

function BonusTypeIcon({ type, className }: { type: string; className?: string }) {
  if (type === 'gift') return <Gift className={className} />;
  if (type === 'percent') return <Percent className={className} />;
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
    case 'pass_count_ip_afyp': return 'Đếm TVV đạt IP+AFYP';
    case 'top_n_ip': return 'Xét Top N IP';
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
const BonusTierEditor = React.memo(function BonusTierEditor({ tiers, conditionType, onUpdate, onAdd, onRemove, title: sectionTitle, accentColor = 'amber' }: {
  tiers: BonusTier[];
  conditionType: ConditionType;
  onUpdate: (id: string, field: keyof BonusTier, value: string | number | null) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  title?: string;
  accentColor?: string;
}) {
  const isAR = isActivityRoundMode(conditionType);
  const isPassCount = isTVVPassCountMode(conditionType);
  const isTopN = isTopNMode(conditionType);
  const isAFYP = conditionType === 'per_contract_afyp' || conditionType === 'total_afyp';
  const unitLabel = isPassCount ? 'TVV đạt' : isAFYP ? 'AFYP' : 'IP';
  const cls = accentColor === 'sky' ? {
    bg: 'bg-sky-900/30', border: 'border-sky-500/30', label: 'text-sky-400', badge: 'bg-sky-500/10',
    btn: 'text-sky-400 hover:text-sky-300', accent: 'bg-sky-600',
  } : {
    bg: 'bg-amber-900/30', border: 'border-amber-500/30', label: 'text-amber-400', badge: 'bg-amber-500/10',
    btn: 'text-amber-400 hover:text-amber-300', accent: 'bg-amber-600',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className={`text-xs font-medium ${cls.label}`}>{sectionTitle || 'Bảng mức thưởng'}</Label>
        <Button variant="ghost" size="sm" onClick={onAdd} className={`${cls.btn} h-6 text-xs`}><Plus className="w-3 h-3 mr-0.5" /> Thêm mức</Button>
      </div>
      <div className="space-y-2">
        {tiers.map((tier, index) => (
          <div key={tier.id} className={`p-2 rounded-lg ${cls.bg} border ${cls.border}`}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={`text-[10px] font-bold ${cls.label} ${cls.badge} px-1.5 py-0.5 rounded`}>{isTopN ? `Hạng ${index + 1}` : `Mức ${index + 1}`}</span>
              <div className="flex items-center gap-0.5 ml-auto overflow-x-auto scrollbar-none">
                {BONUS_TYPE_BUTTONS.map(([type, label, Icon, activeCls]) => (
                  <Button key={type} variant={tier.bonusType === type ? 'default' : 'outline'} size="sm" className={`h-5 w-5 p-0 shrink-0 ${tier.bonusType === type ? activeCls + ' hover:opacity-90' : 'border-emerald-500/20 text-emerald-300/60 bg-transparent'}`} onClick={() => onUpdate(tier.id, 'bonusType', type)} title={label}><Icon className="w-3 h-3" /></Button>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={() => onRemove(tier.id)} className="h-5 w-5 p-0 text-red-400 hover:text-red-300"><Trash2 className="w-2.5 h-2.5" /></Button>
            </div>
            <div className={`grid ${isTopN ? 'grid-cols-1' : 'grid-cols-3'} gap-1.5`}>
              {isTopN ? (
                <div>
                  <Label className="text-[9px] text-emerald-300/70">
                    {tier.bonusType === 'money' ? `Thưởng Hạng ${index + 1} (nđ)` : tier.bonusType === 'gift' ? 'Quà tặng' : tier.bonusType === 'percent' ? '% IP' : tier.bonusType === 'percent_fyc' ? '% FYC' : 'Thưởng'}
                  </Label>
                  {tier.bonusType === 'money' || tier.bonusType === 'money_per_round' || tier.bonusType === 'money_per_tvv'
                    ? <Input type="number" inputMode="decimal" placeholder="0" value={vndToNgan(tier.bonusAmount) || ''} onChange={(e) => onUpdate(tier.id, 'bonusAmount', e.target.value === '' ? 0 : nganToVnd(parseFloat(e.target.value) || 0))} className="h-7 text-xs border-gray-600 bg-gray-800 text-white" />
                    : tier.bonusType === 'percent' || tier.bonusType === 'percent_fyc'
                      ? <Input type="number" inputMode="decimal" placeholder="7" value={tier.bonusPercent || ''} onChange={(e) => onUpdate(tier.id, 'bonusPercent', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)} className="h-7 text-xs border-gray-600 bg-gray-800 text-white" />
                      : <Input type="text" placeholder="VD: iPhone 15" value={tier.bonusText} onChange={(e) => onUpdate(tier.id, 'bonusText', e.target.value)} className="h-7 text-xs border-gray-600 bg-gray-800 text-white" />}
                </div>
              ) : isAR || isPassCount ? (
                <>
                  <div><Label className="text-[9px] text-emerald-300/70">{isPassCount ? 'TVV đạt từ' : 'Lượt từ'}</Label><Input type="number" inputMode="numeric" placeholder="0" value={tier.minFYP || ''} onChange={(e) => onUpdate(tier.id, 'minFYP', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)} className="h-7 text-xs border-gray-600 bg-gray-800 text-white" /></div>
                  <div><Label className="text-[9px] text-emerald-300/70">{isPassCount ? 'TVV đạt đến' : 'Lượt đến'}</Label><Input type="number" inputMode="numeric" placeholder="∞" value={tier.maxFYP || ''} onChange={(e) => onUpdate(tier.id, 'maxFYP', e.target.value ? parseInt(e.target.value) : null)} className="h-7 text-xs border-gray-600 bg-gray-800 text-white" /></div>
                </>
              ) : (
                <>
                  <div><Label className="text-[9px] text-emerald-300/70">{unitLabel} từ (nđ)</Label><Input type="number" inputMode="decimal" placeholder="0" value={vndToNgan(tier.minFYP) || ''} onChange={(e) => onUpdate(tier.id, 'minFYP', e.target.value === '' ? 0 : nganToVnd(parseFloat(e.target.value) || 0))} className="h-7 text-xs border-gray-600 bg-gray-800 text-white" /></div>
                  <div><Label className="text-[9px] text-emerald-300/70">{unitLabel} đến (nđ)</Label><Input type="number" inputMode="decimal" placeholder="∞" value={tier.maxFYP ? vndToNgan(tier.maxFYP) : ''} onChange={(e) => onUpdate(tier.id, 'maxFYP', e.target.value ? nganToVnd(parseFloat(e.target.value)) : null)} className="h-7 text-xs border-gray-600 bg-gray-800 text-white" /></div>
                </>
              )}
              {!isTopN && (
                <div>
                  <Label className="text-[9px] text-emerald-300/70">
                    {tier.bonusType === 'money' ? 'Thưởng (nđ)' : tier.bonusType === 'money_per_round' ? '/Lượt (nđ)' : tier.bonusType === 'money_per_tvv' ? '/TVV (nđ)' : tier.bonusType === 'percent' ? '% IP' : tier.bonusType === 'percent_fyc' ? '% FYC' : 'Quà tặng'}
                  </Label>
                  {tier.bonusType === 'money' || tier.bonusType === 'money_per_round' || tier.bonusType === 'money_per_tvv'
                    ? <Input type="number" inputMode="decimal" placeholder="0" value={vndToNgan(tier.bonusAmount) || ''} onChange={(e) => onUpdate(tier.id, 'bonusAmount', e.target.value === '' ? 0 : nganToVnd(parseFloat(e.target.value) || 0))} className="h-7 text-xs border-gray-600 bg-gray-800 text-white" />
                    : tier.bonusType === 'percent' || tier.bonusType === 'percent_fyc'
                      ? <Input type="number" inputMode="decimal" placeholder="7" value={tier.bonusPercent || ''} onChange={(e) => onUpdate(tier.id, 'bonusPercent', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)} className="h-7 text-xs border-gray-600 bg-gray-800 text-white" />
                      : <Input type="text" placeholder="VD: iPhone 15" value={tier.bonusText} onChange={(e) => onUpdate(tier.id, 'bonusText', e.target.value)} className="h-7 text-xs border-gray-600 bg-gray-800 text-white" />}
                </div>
              )}
            </div>
          </div>
        ))}
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
  // Data sourced from Quản lý page — no CSV sync

  const [startDate, setStartDate] = useState(''); // Ngày hiệu lực từ
  const [endDate, setEndDate] = useState('');     // Ngày hiệu lực đến
  const [issueStartDate, setIssueStartDate] = useState(''); // Ngày phát hành từ
  const [issueEndDate, setIssueEndDate] = useState('');     // Ngày phát hành đến
  const [contestTitle, setContestTitle] = useState('CHƯƠNG TRÌNH THI ĐUA');
  const [conditionType, setConditionType] = useState<ConditionType>('per_contract_ip');
  const [targetType, setTargetType] = useState<TargetType>('tvv');
  const [bonusTiers, setBonusTiers] = useState<BonusTier[]>([]);
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
  const [passCountIPMin, setPassCountIPMin] = useState(6000000);    // 6 triệu
  const [passCountAFYPMin, setPassCountAFYPMin] = useState(12000000); // 12 triệu
  // Top N mode config (top_n_ip)
  const [topN, setTopN] = useState(3);
  const [topNMinIP, setTopNMinIP] = useState(50_000_000);
  // Top N value type: 'ip' (default) hoặc 'afyp' — cho phép user chọn chỉ tiêu xét Top N
  const [topNValueType, setTopNValueType] = useState<'ip' | 'afyp'>('ip');
  // Filter by effective date — khi true: chỉ tính TVV có ngày LV (DS TVV) sau ngày hiệu lực chức vụ gần nhất của NTD recruiter
  const [filterByEffectiveDate, setFilterByEffectiveDate] = useState(false);

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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showSourceData, setShowSourceData] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [isResultExpanded, setIsResultExpanded] = useState(false);
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

  const handlePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setPosterUrl(ev.target?.result as string); };
    reader.readAsDataURL(file);
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
    try { const res = await fetchFresh('/api/contests'); if (res.ok) { const data = await res.json(); setSavedContests(data); } } catch { /* silent */ }
  }, [fetchFresh]);

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

  // Sync từ context → local state. Chỉ chạy khi dataVersion đổi (tức là context vừa load xong).
  // QUAN TRỌNG: tvvStructList + leadersList cũng sync từ context → tự động cập nhật khi
  // user sửa DS TVV / DS TB/TN ở trang Quản lý (Cấu trúc) → reload context → dataVersion bump.
  useEffect(() => {
    if (appData.contracts && appData.contracts.length > 0) setContracts(appData.contracts);
    if (appData.contests) setSavedContests(appData.contests);
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
    let results = [...contracts];
    // Lọc theo Ngày hiệu lực (từ-đến)
    if (startDate) { const start = new Date(startDate); results = results.filter((c) => new Date(c.effectiveDate) >= start); }
    if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); results = results.filter((c) => new Date(c.effectiveDate) <= end); }
    // Lọc theo Ngày phát hành (từ-đến)
    if (issueStartDate) { const start = new Date(issueStartDate); results = results.filter((c) => new Date(c.issueDate) >= start); }
    if (issueEndDate) { const end = new Date(issueEndDate); end.setHours(23, 59, 59, 999); results = results.filter((c) => new Date(c.issueDate) <= end); }
    // Secondary condition filter
    if (useSecondaryCondition) {
      if (secondaryAFYPMin > 0) results = results.filter((c) => c.afyp >= secondaryAFYPMin);
      if (secondaryIPMin > 0) results = results.filter((c) => c.pdt10DT >= secondaryIPMin);
    }
    results.sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());
    setFilteredContracts(results);
    return results;
  }, [startDate, endDate, issueStartDate, issueEndDate, contracts, useSecondaryCondition, secondaryAFYPMin, secondaryIPMin]);

  const handleSearchRef = useRef(handleSearch);
  handleSearchRef.current = handleSearch;

  // Bonus calculation helpers - takes tiers as parameter for Phase2 support
  const calculateBonusWithTiers = useCallback((fyp: number, tiers: BonusTier[]): { tier: BonusTier | null; tierIndex: number } => {
    const sortedTiers = [...tiers].sort((a, b) => a.minFYP - b.minFYP);
    for (let i = sortedTiers.length - 1; i >= 0; i--) { const tier = sortedTiers[i]; if (fyp >= tier.minFYP) return { tier, tierIndex: i }; }
    return { tier: null, tierIndex: -1 };
  }, []);

  const calculateBonus = useCallback((fyp: number): { tier: BonusTier | null; tierIndex: number } => {
    return calculateBonusWithTiers(fyp, bonusTiers);
  }, [calculateBonusWithTiers, bonusTiers]);

  const getBonusAmountWithTiers = useCallback((fyp: number, tiers: BonusTier[], rounds?: number): number => {
    const { tier } = calculateBonusWithTiers(fyp, tiers); if (!tier) return 0;
    return computeBonusFromTier(tier, fyp, rounds);
  }, [calculateBonusWithTiers]);

  const getBonusAmount = useCallback((fyp: number, rounds?: number): number => {
    return getBonusAmountWithTiers(fyp, bonusTiers, rounds);
  }, [getBonusAmountWithTiers, bonusTiers]);

  const getRemainingToNextTier = useCallback((fyp: number): number | null => {
    const sortedTiers = [...bonusTiers].sort((a, b) => a.minFYP - b.minFYP);
    for (const tier of sortedTiers) { if (tier.minFYP > fyp) return tier.minFYP - fyp; }
    return null;
  }, [bonusTiers]);

  const calculateActivityRoundBonus = useCallback((activityRounds: number): { tier: BonusTier | null; tierIndex: number } => {
    const sortedTiers = [...bonusTiers].sort((a, b) => a.minFYP - b.minFYP);
    for (let i = sortedTiers.length - 1; i >= 0; i--) { const tier = sortedTiers[i]; if (activityRounds >= tier.minFYP) return { tier, tierIndex: i }; }
    return { tier: null, tierIndex: -1 };
  }, [bonusTiers]);

  const calculateActivityRoundBonusWithTiers = useCallback((activityRounds: number, tiers: BonusTier[]): { tier: BonusTier | null; tierIndex: number } => {
    const sortedTiers = [...tiers].sort((a, b) => a.minFYP - b.minFYP);
    for (let i = sortedTiers.length - 1; i >= 0; i--) { const tier = sortedTiers[i]; if (activityRounds >= tier.minFYP) return { tier, tierIndex: i }; }
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
      if (member.agentCode && !map.has(member.agentCode)) map.set(member.agentCode, member.ngayBatDau || null);
    }
    return map;
  }, [tvvStructList]);

  const calculateLuotWithStructure = useCallback(
    (rows: Contract[], threshold: number, type: ConditionType, maxMonths?: number, minIP?: number) =>
      calculateLuot(rows, threshold, type, maxMonths, minIP, structureStartDateByCode),
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

    return { allTvv, tvvm, tvvCu, nhom, ttn, ntd, phongLists };
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

  const chooseSubjectType = useCallback((type: string) => {
    const list = type.startsWith('phong_')
      ? (subjectLists.phongLists?.[type] || [])
      : (subjectLists as any)[type] || [];
    const nextTarget: TargetType = type === 'nhom' ? 'nhom' : type === 'ntd' ? 'nyd' : 'tvv';
    setTargetType(nextTarget);
    if (nextTarget === 'nhom') {
      setIncludeIndividualTN(false); // mặc định không tính cá nhân trưởng nhóm
    }
    if (nextTarget === 'nyd') {
      setIncludeIndividualNTD(false); // mặc định không tính cá nhân người tuyển dụng
    }
    if (conditionType === 'tvv_pass_count' && nextTarget !== 'nhom') setConditionType('total_ip');
    setSelectedSubjectTypes(new Set([type]));
    setThiDuaSubjects(Array.from(new Set(list)).join('\n'));
  }, [subjectLists, conditionType]);

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
  const displayContracts = useMemo(() => {
    // Luôn loại trừ hợp đồng thuộc nhóm DSO (không tham gia thi đua)
    const contractsNoDSO = filteredContracts.filter(c => !norm(c.nhom || '').toLowerCase().includes('dso') && !norm(c.maNhom || '').toLowerCase().includes('dso'));
    // Áp dụng filter "ngày hiệu lực chức vụ" nếu tích chọn (chỉ cho NTD và Nhóm)
    // Quy tắc: chỉ giữ HĐ của TVV có ngày bắt đầu LV (DS TVV) sau ngày hiệu lực chức vụ gần nhất của NTD recruiter
    let contractsFiltered = contractsNoDSO;
    if (filterByEffectiveDate && (targetType === 'nyd' || targetType === 'nhom')) {
      // Build map: agentCode → ngayHieuLuc (NTD recruiter)
      const ngayHieuLucMap = new Map<string, number>();
      for (const r of ntdCandidates) {
        if (r.agentCode && r.ngayHieuLuc) {
          const t = new Date(r.ngayHieuLuc).getTime();
          if (!isNaN(t)) ngayHieuLucMap.set(r.agentCode, t);
        }
      }
      // Build map: agentCode → ngayBatDau (TVV từ DS TVV — Cấu trúc)
      const ngayBatDauMap = new Map<string, number>();
      for (const t of tvvStructList) {
        if (t.agentCode && t.ngayBatDau) {
          const ts = new Date(t.ngayBatDau).getTime();
          if (!isNaN(ts)) ngayBatDauMap.set(t.agentCode, ts);
        }
      }
      contractsFiltered = contractsNoDSO.filter(c => {
        const recruiterCode = c.maDaiLyTD || '';
        if (!recruiterCode) return true;
        const ngayHieuLucTs = ngayHieuLucMap.get(recruiterCode);
        if (!ngayHieuLucTs) return true; // NTD không có ngày hiệu lực → không ràng buộc → giữ
        const ngayBatDauTs = ngayBatDauMap.get(c.agentCode || '');
    …46197 tokens truncated…talic">GD2: {phase2StartDate ? formatDate(phase2StartDate) : '...'} - {endDate ? formatDate(endDate) : '...'}</div>
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
                              {isActivityRoundMode(conditionType) ? (conditionType === 'activity_round_standard' ? 'Lượt HĐ Chuẩn' : conditionType === 'activity_round_tvv90' ? 'Lượt HĐ TVV90' : 'Lượt HĐ') : conditionType === 'total_afyp' ? 'Tổng AFYP' : 'Tổng IP'}
                              {startDate && endDate && !isActivityRoundMode(conditionType) && <div className="text-[9px] font-bold text-red-500 italic">{formatDate(startDate)} - {formatDate(endDate)}</div>}
                            </TableHead>
                            {showSecondaryPerContractColumn && (
                              <>
                                {secondaryAFYPMin > 0 && !isAFYP && <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center bg-amber-800/60"><div>AFYP/HĐ</div><div className="text-[9px] italic text-red-300 font-normal normal-case">(chỉ tiêu phụ)</div></TableHead>}
                                {secondaryIPMin > 0 && isAFYP && <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center bg-amber-800/60"><div>IP/HĐ</div><div className="text-[9px] italic text-red-300 font-normal normal-case">(chỉ tiêu phụ)</div></TableHead>}
                              </>
                            )}
                            {showSecondaryTotalColumn && (
                              <>
                                {secondaryTotalAFYPMin > 0 && <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center bg-amber-800/60"><div>Tổng AFYP</div><div className="text-[9px] italic text-red-300 font-normal normal-case">(chỉ tiêu phụ)</div></TableHead>}
                                {secondaryTotalIPMin > 0 && <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center bg-amber-800/60"><div>Tổng IP</div><div className="text-[9px] italic text-red-300 font-normal normal-case">(chỉ tiêu phụ)</div></TableHead>}
                              </>
                            )}
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
                                  <div className="text-[9px] font-bold text-red-500 italic">GD2: {phase2StartDate ? formatDate(phase2StartDate) : '...'} - {endDate ? formatDate(endDate) : '...'}</div>
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
                          <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center">{isAFYP ? 'AFYP' : 'IP'}</TableHead>
                          {useSecondaryCondition && secondaryAFYPMin > 0 && !isAFYP && (
                            <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center"><div>AFYP</div><div className="text-[9px] italic text-red-300 font-normal normal-case">(chỉ tiêu phụ)</div></TableHead>
                          )}
                          {useSecondaryCondition && secondaryIPMin > 0 && isAFYP && (
                            <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center"><div>IP</div><div className="text-[9px] italic text-red-300 font-normal normal-case">(chỉ tiêu phụ)</div></TableHead>
                          )}
                          {showSecondaryTotalColumn && (
                            <>
                              {secondaryTotalAFYPMin > 0 && <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center bg-amber-800/60"><div>Tổng AFYP</div><div className="text-[9px] italic text-red-300 font-normal normal-case">(chỉ tiêu phụ)</div></TableHead>}
                              {secondaryTotalIPMin > 0 && <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center bg-amber-800/60"><div>Tổng IP</div><div className="text-[9px] italic text-red-300 font-normal normal-case">(chỉ tiêu phụ)</div></TableHead>}
                            </>
                          )}
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
                          {showSecondaryTotalColumn && (
                            <>
                              {secondaryTotalAFYPMin > 0 && conditionType !== 'total_afyp' && <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center bg-amber-800/60"><div>Tổng AFYP</div><div className="text-[9px] italic text-red-300 font-normal normal-case">(chỉ tiêu phụ)</div></TableHead>}
                              {secondaryTotalIPMin > 0 && conditionType !== 'total_ip' && <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center bg-amber-800/60"><div>Tổng IP</div><div className="text-[9px] italic text-red-300 font-normal normal-case">(chỉ tiêu phụ)</div></TableHead>}
                            </>
                          )}
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
                    {targetType === 'nyd' ? nydResultRows.map(({ nyd, tier, value }, idx) => {
                      if (hideNotAchieved && !tier) return null;
                      if (!nyd.nhom) return null;
                      const phaseBonus = usePhase2 && phase2StartDate ? (() => {
                        const p2Start = new Date(phase2StartDate);
                        const p1Contracts = displayContracts.filter(c => new Date(c.effectiveDate) < p2Start);
                        const p2Contracts = displayContracts.filter(c => new Date(c.effectiveDate) >= p2Start);
                        const applyTVV90 = conditionType === 'activity_round_tvv90';
                        
                        // Phase 1: find recruited TVV for this NYD
                        const p1Recruited = p1Contracts.filter(c => c.maDaiLyTD === nyd.nydCode && c.agentCode !== nyd.nydCode);
                        let p1RecruitCount = 0;
                        let p1RecruitFYP = 0;
                        if (isActivityRoundMode(conditionType)) {
                          p1RecruitCount = calculateLuotWithStructure(p1Recruited, isStandardMode(conditionType) ? luotHDCTThreshold : luotHDThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
                          p1RecruitFYP = p1Recruited.reduce((s, c) => s + c.pdt10DT, 0);
                        } else {
                          const p1RecruitedMap = new Map<string, number>();
                          for (const rc of p1Recruited) { p1RecruitedMap.set(rc.agentCode, (p1RecruitedMap.get(rc.agentCode) || 0) + rc.pdt10DT); }
                          for (const [, af] of p1RecruitedMap) { if (af >= luotHDThreshold) p1RecruitCount++; p1RecruitFYP += af; }
                        }
                        const p1OwnFYP = p1Contracts.filter(c => c.agentCode === nyd.nydCode).reduce((s, c) => s + c.pdt10DT, 0);
                        const p1Value = isActivityRoundMode(conditionType) ? p1RecruitCount : (p1RecruitFYP + (includeIndividualNTD ? p1OwnFYP : 0));
                        const p1Res = calculateBonusWithTiers(p1Value, bonusTiers);
                        const p1Bonus = p1Res.tier ? computeBonusFromTier(p1Res.tier, p1Value, p1RecruitCount) : 0;

                        // Phase 2
                        const p2Recruited = p2Contracts.filter(c => c.maDaiLyTD === nyd.nydCode && c.agentCode !== nyd.nydCode);
                        let p2RecruitCount = 0;
                        let p2RecruitFYP = 0;
                        if (isActivityRoundMode(conditionType)) {
                          p2RecruitCount = calculateLuotWithStructure(p2Recruited, isStandardMode(conditionType) ? luotHDCTThreshold : luotHDThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
                          p2RecruitFYP = p2Recruited.reduce((s, c) => s + c.pdt10DT, 0);
                        } else {
                          const p2RecruitedMap = new Map<string, number>();
                          for (const rc of p2Recruited) { p2RecruitedMap.set(rc.agentCode, (p2RecruitedMap.get(rc.agentCode) || 0) + rc.pdt10DT); }
                          for (const [, af] of p2RecruitedMap) { if (af >= luotHDThreshold) p2RecruitCount++; p2RecruitFYP += af; }
                        }
                        const p2OwnFYP = p2Contracts.filter(c => c.agentCode === nyd.nydCode).reduce((s, c) => s + c.pdt10DT, 0);
                        const p2Value = isActivityRoundMode(conditionType) ? p2RecruitCount : (p2RecruitFYP + (includeIndividualNTD ? p2OwnFYP : 0));
                        const p2Res = calculateBonusWithTiers(p2Value, bonusTiers2);
                        const p2Bonus = p2Res.tier ? computeBonusFromTier(p2Res.tier, p2Value, p2RecruitCount) : 0;

                        return { phase1Bonus: p1Bonus, phase2Bonus: p2Bonus };
                      })() : null;
                      return (
                        <TableRow key={nyd.nydCode} className={`${tier ? 'bg-white' : 'bg-red-50'} hover:bg-emerald-50 border-b border-gray-200`}>
                          <TableCell className="text-center text-gray-400 text-xs whitespace-nowrap">{idx + 1}</TableCell>
                          <TableCell className="text-xs text-emerald-700 font-semibold whitespace-nowrap">{nyd.nhom || '—'}</TableCell>
                          <TableCell className="text-xs text-gray-600 font-mono whitespace-nowrap">{nyd.nydCode}</TableCell>
                          <TableCell className="text-xs text-gray-800 whitespace-nowrap">{nyd.nydName}</TableCell>
                          <TableCell className="text-xs text-gray-600 whitespace-nowrap">{nyd.position || '—'}</TableCell>
                          <TableCell className="text-right text-xs text-gray-900 whitespace-nowrap">
                            {isActivityRoundMode(conditionType) ? `${nyd.recruitCount} Lượt` : formatNumber(value)}
                          </TableCell>
                          {showSecondaryTotalColumn && (() => {
                            const nydContracts = nyd.contracts || displayContracts.filter(c => c.maDaiLyTD === nyd.nydCode);
                            const sc = checkSecondaryTotalCondition(nydContracts);
                            return (
                              <>
                                {secondaryTotalAFYPMin > 0 && (
                                  <TableCell className={`text-right text-xs whitespace-nowrap ${sc.totalAFYP >= secondaryTotalAFYPMin ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {formatNumber(sc.totalAFYP)}
                                    {sc.totalAFYP < secondaryTotalAFYPMin && <span className="text-[9px] ml-1">✗</span>}
                                  </TableCell>
                                )}
                                {secondaryTotalIPMin > 0 && (
                                  <TableCell className={`text-right text-xs whitespace-nowrap ${sc.totalIP >= secondaryTotalIPMin ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {formatNumber(sc.totalIP)}
                                    {sc.totalIP < secondaryTotalIPMin && <span className="text-[9px] ml-1">✗</span>}
                                  </TableCell>
                                )}
                              </>
                            );
                          })()}
                          {includeIndividualNTD && (
                            <TableCell className="text-right text-xs text-gray-600 whitespace-nowrap">{formatNumber(nyd.ownFYP)}</TableCell>
                          )}
                          {showRateColumn && !usePhase2 && (
                            <TableCell className="text-center bg-violet-50 text-xs whitespace-nowrap">{tier ? <span className="font-bold text-violet-600">{formatRate(tier)}</span> : <span className="text-gray-400">—</span>}</TableCell>
                          )}
                          {usePhase2 && phaseBonus ? (
                            <>
                              <TableCell className="text-right bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{phaseBonus.phase1Bonus > 0 ? formatCurrency(phaseBonus.phase1Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                              <TableCell className="text-right bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{phaseBonus.phase2Bonus > 0 ? formatCurrency(phaseBonus.phase2Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                              <TableCell className="text-right bg-amber-50 text-xs font-bold text-amber-600 whitespace-nowrap">{formatCurrency(phaseBonus.phase1Bonus + phaseBonus.phase2Bonus)}</TableCell>
                            </>
                          ) : (
                            <TableCell className="text-right bg-emerald-50 whitespace-nowrap">{tier ? <span className="flex items-center justify-end gap-1">{tier.bonusType === 'gift' ? <Gift className="w-4 h-4 text-pink-500" /> : <Award className="w-4 h-4 text-amber-500" />}<span className="font-bold text-emerald-600 text-sm">{formatBonusAmount(tier, value, nyd.recruitCount)}</span></span> : <span className="text-gray-400 text-xs">—</span>}</TableCell>
                          )}
                          <TableCell className="whitespace-nowrap">{!tier ? <span className="text-[10px] italic text-gray-400">Chưa đạt</span> : null}</TableCell>
                        </TableRow>
                      );
                    }) : targetType === 'nhom' ? [...groupedData].map((g) => {
                      const groupPhase = getGroupPhaseBonus(g);
                      const tvvPassCount = conditionType === 'pass_count_ip_afyp' ? getGroupTVVPassCountIPAFYP(g) : getGroupTVVPassCount(g);
                      const tier = isTVVPassCountMode(conditionType)
                        ? calculateBonus(tvvPassCount).tier
                        : isActivityRoundMode(conditionType) ? calculateActivityRoundBonus(g.activityRounds).tier : calculateBonus(getGroupValue(g)).tier;
                      const remaining = isTVVPassCountMode(conditionType)
                        ? getRemainingToNextTier(tvvPassCount)
                        : isActivityRoundMode(conditionType) ? getRemainingToNextActivityRoundTier(g.activityRounds) : getRemainingToNextTier(g.totalFYP);
                      return { group: g, tier, remaining, groupPhase, tvvPassCount };
                    }).sort((a, b) => {
                      const aValue = isTVVPassCountMode(conditionType) ? a.tvvPassCount : isActivityRoundMode(conditionType) ? a.group.activityRounds : a.group.totalFYP;
                      const bValue = isTVVPassCountMode(conditionType) ? b.tvvPassCount : isActivityRoundMode(conditionType) ? b.group.activityRounds : b.group.totalFYP;
                      return bValue - aValue;
                    }).map(({ group, tier, remaining, groupPhase, tvvPassCount }, idx) => {
                      if (hideNotAchieved && !tier) return null;
                      if (!group.nhom && !group.maNhom) return null;
                      // Kiểm tra điều kiện bổ sung Tổng AFYP/Tổng IP cho nhóm
                      const secondaryCheck = checkSecondaryTotalCondition(group.contracts || []);
                      const secondaryPassed = secondaryCheck.passed;
                      const effectiveTier = secondaryPassed ? tier : (secondaryTotalAFYPMin > 0 || secondaryTotalIPMin > 0 ? null : tier);
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
                            <TableCell className="text-right bg-emerald-50 whitespace-nowrap">{effectiveTier ? <span className="flex items-center justify-end gap-1">{effectiveTier.bonusType === 'gift' ? <Gift className="w-4 h-4 text-pink-500" /> : effectiveTier.bonusType === 'money_per_tvv' ? <UserCheck className="w-4 h-4 text-indigo-500" /> : <Award className="w-4 h-4 text-amber-500" />}<span className="font-bold text-emerald-600 text-sm">{formatBonusAmount(effectiveTier, 0, tvvPassCount)}</span></span> : <span className="text-gray-400 text-xs">—</span>}</TableCell>
                            <TableCell className="whitespace-nowrap">{!effectiveTier && remaining !== null ? <span className="text-[10px] italic text-gray-400">Cần thêm {remaining} TVV</span> : !effectiveTier ? <span className="text-[10px] italic text-gray-400">Chưa đạt</span> : null}</TableCell>
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
                              : <span className="text-gray-900">{formatNumber(group.totalFYP)}</span>
                            }
                          </TableCell>
                          {showSecondaryPerContractColumn && (
                            <>
                              {secondaryAFYPMin > 0 && !isAFYP && (
                                <TableCell className={`text-right text-xs whitespace-nowrap bg-amber-50 ${afypPassCount === totalContracts && totalContracts > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {afypPassCount}/{totalContracts}
                                  {afypPassCount < totalContracts && <span className="text-[9px] ml-1">✗</span>}
                                </TableCell>
                              )}
                              {secondaryIPMin > 0 && isAFYP && (
                                <TableCell className={`text-right text-xs whitespace-nowrap bg-amber-50 ${ipPassCount === totalContracts && totalContracts > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {ipPassCount}/{totalContracts}
                                  {ipPassCount < totalContracts && <span className="text-[9px] ml-1">✗</span>}
                                </TableCell>
                              )}
                            </>
                          )}
                          {showSecondaryTotalColumn && (
                            <>
                              {secondaryTotalAFYPMin > 0 && (
                                <TableCell className={`text-right text-xs whitespace-nowrap ${secondaryCheck.totalAFYP >= secondaryTotalAFYPMin ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {formatNumber(secondaryCheck.totalAFYP)}
                                  {secondaryCheck.totalAFYP < secondaryTotalAFYPMin && <span className="text-[9px] ml-1">✗</span>}
                                </TableCell>
                              )}
                              {secondaryTotalIPMin > 0 && (
                                <TableCell className={`text-right text-xs whitespace-nowrap ${secondaryCheck.totalIP >= secondaryTotalIPMin ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {formatNumber(secondaryCheck.totalIP)}
                                  {secondaryCheck.totalIP < secondaryTotalIPMin && <span className="text-[9px] ml-1">✗</span>}
                                </TableCell>
                              )}
                            </>
                          )}
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
                            <TableCell className="text-right bg-emerald-50 whitespace-nowrap">{effectiveTier ? <span className="flex items-center justify-end gap-1">{effectiveTier.bonusType === 'gift' ? <Gift className="w-4 h-4 text-pink-500" /> : <Award className="w-4 h-4 text-amber-500" />}<span className="font-bold text-emerald-600 text-sm">{formatBonusAmount(effectiveTier, group.totalFYP, group.activityRounds)}</span></span> : <span className="text-gray-400 text-xs">—</span>}</TableCell>
                          )}
                          <TableCell className="whitespace-nowrap">{!effectiveTier && remaining !== null ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? 'Chưa đạt ĐKB' : `Cần thêm ${isActivityRoundMode(conditionType) ? `${remaining} lượt` : formatNumber(remaining)}`}</span> : !effectiveTier ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? 'Chưa đạt ĐKB' : 'Chưa đạt'}</span> : null}</TableCell>
                        </TableRow>
                      );
                    }) : isPerContractMode(conditionType) ? [...displayContracts].map((c) => {
                      const cValue = getContractValue(c);
                      const { tier } = calculateBonus(cValue);
                      const remaining = getRemainingToNextTier(cValue);
                      const phaseInfo = getRowPhaseBonus(cValue, c.effectiveDate);
                      // Kiểm tra điều kiện bổ sung Tổng AFYP/Tổng IP cho TVV
                      const agentContracts = displayContracts.filter(ac => ac.agentCode === c.agentCode);
                      const secondaryCheck = checkSecondaryTotalCondition(agentContracts);
                      const secondaryPassed = secondaryCheck.passed;
                      const effectiveTier = secondaryPassed ? tier : (secondaryTotalAFYPMin > 0 || secondaryTotalIPMin > 0 ? null : tier);
                      return { contract: c, cValue, tier, remaining, phaseInfo, secondaryCheck, secondaryPassed, effectiveTier };
                    }).sort((a, b) => b.cValue - a.cValue).map(({ contract, cValue, tier, remaining, phaseInfo, secondaryCheck, secondaryPassed, effectiveTier }, idx) => {
                      if (hideNotAchieved && !tier) return null;
                      if (!contract.nhom && !contract.maNhom) return null;
                      return (
                        <TableRow key={contract.id} className={`${effectiveTier ? 'bg-white' : 'bg-red-50'} hover:bg-emerald-50 border-b border-gray-200`}>
                          <TableCell className="text-center text-gray-400 text-xs whitespace-nowrap">{idx + 1}</TableCell>
                          <TableCell className="text-xs text-emerald-700 font-semibold whitespace-nowrap">{contract.nhom || '—'}</TableCell>
                          <TableCell className="text-xs text-gray-600 font-mono whitespace-nowrap">{contract.agentCode}</TableCell>
                          <TableCell className="text-xs text-gray-800 whitespace-nowrap">{contract.agentName}</TableCell>
                          <TableCell className="text-center text-xs text-gray-600 whitespace-nowrap">{formatDate(contract.effectiveDate)}</TableCell>
                          <TableCell className="text-right text-xs text-gray-900 whitespace-nowrap">{formatNumber(cValue)}</TableCell>
                          {useSecondaryCondition && secondaryAFYPMin > 0 && !isAFYP && (
                            <TableCell className="text-right text-xs text-gray-600 whitespace-nowrap">{formatNumber(contract.afyp)}</TableCell>
                          )}
                          {useSecondaryCondition && secondaryIPMin > 0 && isAFYP && (
                            <TableCell className="text-right text-xs text-gray-600 whitespace-nowrap">{formatNumber(contract.pdt10DT)}</TableCell>
                          )}
                          {showSecondaryTotalColumn && (
                            <>
                              {secondaryTotalAFYPMin > 0 && (
                                <TableCell className={`text-right text-xs whitespace-nowrap ${secondaryCheck.totalAFYP >= secondaryTotalAFYPMin ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {formatNumber(secondaryCheck.totalAFYP)}
                                  {secondaryCheck.totalAFYP < secondaryTotalAFYPMin && <span className="text-[9px] ml-1">✗</span>}
                                </TableCell>
                              )}
                              {secondaryTotalIPMin > 0 && (
                                <TableCell className={`text-right text-xs whitespace-nowrap ${secondaryCheck.totalIP >= secondaryTotalIPMin ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {formatNumber(secondaryCheck.totalIP)}
                                  {secondaryCheck.totalIP < secondaryTotalIPMin && <span className="text-[9px] ml-1">✗</span>}
                                </TableCell>
                              )}
                            </>
                          )}
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
                            <TableCell className="text-right bg-emerald-50 whitespace-nowrap">{effectiveTier ? <span className="flex items-center justify-end gap-1">{effectiveTier.bonusType === 'gift' ? <Gift className="w-4 h-4 text-pink-500" /> : <Award className="w-4 h-4 text-amber-500" />}<span className="font-bold text-emerald-600 text-sm">{formatBonusAmount(effectiveTier, cValue)}</span></span> : <span className="text-gray-400 text-xs">—</span>}</TableCell>
                          )}
                          <TableCell className="whitespace-nowrap">{!effectiveTier && remaining !== null ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? 'Chưa đạt ĐKB' : `Cần thêm ${formatNumber(remaining)}`}</span> : !effectiveTier ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? 'Chưa đạt ĐKB' : 'Chưa đạt'}</span> : null}</TableCell>
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
                      return tvvTotalRows.map(({ agent, value, tier, remaining, phaseInfo }, idx) => {
                        if (hideNotAchieved && !tier) return null;
                        if (!agent.nhom && !agent.maNhom) return null;
                        // Kiểm tra điều kiện bổ sung Tổng AFYP/Tổng IP
                        const agentContracts = displayContracts.filter(c => c.agentCode === agent.agentCode);
                        const secondaryCheck = checkSecondaryTotalCondition(agentContracts);
                        const secondaryPassed = secondaryCheck.passed;
                        // Nếu có điều kiện bổ sung mà không đạt → không được thưởng (nhưng vẫn hiển thị)
                        const effectiveTier = secondaryPassed ? tier : (secondaryTotalAFYPMin > 0 || secondaryTotalIPMin > 0 ? null : tier);
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
                          noteLabel = <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? 'Chưa đạt ĐKB' : `Cần thêm ${formatNumber(remaining)}`}</span>;
                        } else if (isTopNResult && !effectiveTier) {
                          noteLabel = <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? 'Chưa đạt ĐKB' : 'Chưa đạt'}</span>;
                        }
                        // Cột Ghi chú cho mode KHÔNG phải Top N (giữ nguyên logic cũ)
                        const nonTopNoteCell = !effectiveTier && remaining !== null
                          ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? 'Chưa đạt ĐKB' : `Cần thêm ${formatNumber(remaining)}`}</span>
                          : !effectiveTier
                            ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? 'Chưa đạt ĐKB' : 'Chưa đạt'}</span>
                            : null;
                        return (
                          <TableRow key={agent.agentCode} className={`${effectiveTier ? 'bg-white' : 'bg-red-50'} hover:bg-emerald-50 border-b border-gray-200`}>
                            <TableCell className="text-center text-gray-400 text-xs whitespace-nowrap">{idx + 1}</TableCell>
                            <TableCell className="text-xs text-emerald-700 font-semibold whitespace-nowrap">{agent.nhom || '—'}</TableCell>
                            <TableCell className="text-xs text-gray-600 font-mono whitespace-nowrap">{agent.agentCode}</TableCell>
                            <TableCell className="text-xs text-gray-800 whitespace-nowrap">{agent.agentName}</TableCell>
                            <TableCell className="text-right text-xs text-gray-900 whitespace-nowrap">{formatNumber(value)}</TableCell>
                            {showSecondaryTotalColumn && (
                              <>
                                {secondaryTotalAFYPMin > 0 && conditionType !== 'total_afyp' && (
                                  <TableCell className={`text-right text-xs whitespace-nowrap ${secondaryCheck.totalAFYP >= secondaryTotalAFYPMin ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {formatNumber(secondaryCheck.totalAFYP)}
                                    {secondaryCheck.totalAFYP < secondaryTotalAFYPMin && <span className="text-[9px] ml-1">✗</span>}
                                  </TableCell>
                                )}
                                {secondaryTotalIPMin > 0 && conditionType !== 'total_ip' && (
                                  <TableCell className={`text-right text-xs whitespace-nowrap ${secondaryCheck.totalIP >= secondaryTotalIPMin ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {formatNumber(secondaryCheck.totalIP)}
                                    {secondaryCheck.totalIP < secondaryTotalIPMin && <span className="text-[9px] ml-1">✗</span>}
                                  </TableCell>
                                )}
                              </>
                            )}
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
                              <TableCell className="text-right bg-emerald-50 whitespace-nowrap">{effectiveTier ? <span className="flex items-center justify-end gap-1">{effectiveTier.bonusType === 'gift' ? <Gift className="w-4 h-4 text-pink-500" /> : <Award className="w-4 h-4 text-amber-500" />}<span className="font-bold text-emerald-600 text-sm">{formatBonusAmount(effectiveTier, value)}</span></span> : <span className="text-gray-400 text-xs">—</span>}</TableCell>
                            )}
                            <TableCell className="whitespace-nowrap">{isTopNResult ? noteLabel : nonTopNoteCell}</TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
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
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="text-emerald-600 text-sm">Đang tải...</div></div>}>
      <ThiDuaPageInner />
    </Suspense>
  );
}

