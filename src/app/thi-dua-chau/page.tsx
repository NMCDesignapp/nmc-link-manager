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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}
function formatNumber(amount: number): string { return new Intl.NumberFormat('vi-VN').format(amount); }
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN');
}
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
  // Filter by effective date — khi true: chỉ tính TVV có ngày LV (DS TVV) bằng hoặc sau ngày hiệu lực chức vụ gần nhất của NTD recruiter
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
    // Quy tắc: chỉ giữ HĐ của TVV có ngày bắt đầu LV (DS TVV) bằng hoặc sau ngày hiệu lực chức vụ gần nhất của NTD recruiter
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
        if (!ngayBatDauTs) return false; // TVV không có ngày LV → bỏ qua (theo yêu cầu user)
        return ngayBatDauTs >= ngayHieuLucTs;
      });
    }
    if (targetType === 'tvv') {
      if (subjectCodes.length === 0) {
        // FIX (user request): Khi KHÔNG có DS đối tượng → dùng DS TVV từ Cấu trúc
        // Quản lý (tvvStructList) làm nguồn DS đối tượng. Chỉ giữ lại HĐ của TVV có
        // trong Cấu trúc — không lấy DS TVV từ file doanh số (Contracts).
        // Nếu tvvStructList rỗng (chưa load Cấu trúc) → fallback cũ (tất cả HĐ).
        if (tvvStructList && tvvStructList.length > 0) {
          const structCodes = new Set<string>();
          for (const t of tvvStructList) {
            if (t.agentCode) structCodes.add(t.agentCode);
          }
          return contractsFiltered.filter(c => structCodes.has(c.agentCode));
        }
        return contractsFiltered;
      }
      // Mã nhập tay chỉ lọc trong DS TVV Cấu trúc, không được tạo người từ file doanh số.
      const selectedTvvCodes = new Set<string>();
      for (const member of tvvStructList) {
        if (subjectCodes.includes(member.agentCode) || subjectCodes.includes(member.agentName)) selectedTvvCodes.add(member.agentCode);
      }
      return contractsFiltered.filter(c => selectedTvvCodes.has(c.agentCode));
    }
    if (targetType === 'nhom') {
      // Nhóm: xác định tập mã nhóm hợp lệ từ Staff table (loại DSO)
      // PA vẫn được tính thi đua bình thường
      const allowedMaNhom = new Set<string>();
      if (subjectCodes.length > 0) {
        // Có nhập đối tượng → tìm mã nhóm từ tên nhóm nhập vào
        for (const code of subjectCodes) {
          const codeLower = norm(code).toLowerCase();
          // Bỏ nhóm DSO (không tham gia thi đua)
          if (codeLower.includes('dso')) continue;
          const leader = leadersList.find(l => norm(l.nhom || '').toLowerCase() === codeLower);
          if (leader?.maNhom) {
            allowedMaNhom.add(leader.maNhom);
          } else {
            allowedMaNhom.add(code);
          }
        }
      } else {
        // Không nhập đối tượng → lấy tất cả nhóm từ DS TB/TN trong Cấu trúc.
        for (const leader of leadersList) {
          const nhomLower = norm(leader.nhom || '').toLowerCase();
          if (leader.maNhom && !nhomLower.includes('dso') && !leader.maNhom.toLowerCase().includes('dso')) {
            allowedMaNhom.add(leader.maNhom);
          }
        }
      }
      return contractsFiltered.filter(c => allowedMaNhom.has(c.maNhom) && !norm(c.nhom || '').toLowerCase().includes('dso'));
    }
    if (targetType === 'nyd') {
      // NTD: xác định tập mã NTD từ Recruiter table
      // Bỏ NTD thuộc nhóm DSO
      const ntdNoDSO = ntdCandidates;
      if (subjectCodes.length > 0) {
        const selectedNydCodes = new Set(ntdNoDSO.filter(r => subjectCodes.includes(r.agentCode) || subjectCodes.includes(r.agentName)).map(r => r.agentCode));
        return contractsFiltered.filter(c => selectedNydCodes.has(c.agentCode) || (c.maDaiLyTD && selectedNydCodes.has(c.maDaiLyTD)));
      }
      // Không nhập đối tượng → lấy HĐ liên quan đến NTD trong Recruiter table (trừ DSO)
      const ntdCodes = new Set(ntdNoDSO.map(r => r.agentCode));
      return contractsFiltered.filter(c => ntdCodes.has(c.agentCode) || ntdCodes.has(c.maDaiLyTD));
    }
    return contractsFiltered;
  }, [filteredContracts, subjectCodes, targetType, leadersList, ntdCandidates, filterByEffectiveDate, tvvStructList]);

  // filteredRevenueData & displayRevenueData removed — all data now sourced from Contracts table only

  // NYD data computation - use Recruiter table as primary reference
  const nydData: NYDData[] = useMemo(() => {
    if (targetType !== 'nyd') return [];
    const nydMap = new Map<string, NYDData>();

    // Step 1: Load NTD from Recruiter table
    // Nếu có DS đối tượng → chỉ lấy NTD trong DS, ngược lại lấy tất cả
    if (subjectCodes.length > 0) {
      for (const r of ntdCandidates) {
        if (subjectCodes.includes(r.agentCode) || subjectCodes.includes(r.agentName)) {
          nydMap.set(r.agentCode, {
            nydCode: r.agentCode,
            nydName: r.agentName,
            nhom: r.nhom,
            position: r.position || '',
            startDate: r.startDate,
            recruitCount: 0,
            recruitFYP: 0,
            ownFYP: 0,
            contracts: [],
          });
        }
      }
      // Không tạo NTD từ mã tự nhập không thuộc DS TTN/Cấu trúc.
    } else {
      // Không có DS đối tượng → lấy tất cả NTD
      for (const r of ntdCandidates) {
        nydMap.set(r.agentCode, {
          nydCode: r.agentCode,
          nydName: r.agentName,
          nhom: r.nhom,
          position: r.position || '',
          startDate: r.startDate,
          recruitCount: 0,
          recruitFYP: 0,
          ownFYP: 0,
          contracts: [],
        });
      }
    }

    // Step 2: Calculate recruit data using maDaiLyTD from contracts for mapping
    // Mã số NTD → ánh xạ sang cột maDaiLyTD trong bảng doanh số
    const luotThreshold = isStandardMode(conditionType) ? luotHDCTThreshold : luotHDThreshold;
    const isAFYP = conditionType === 'total_afyp';
    // Build FYP lookup by agentCode — dùng Contracts (nguồn duy nhất) cho TẤT CẢ chế độ
    const agentFYPLookup = new Map<string, { totalFYP: number; totalAFYP: number; activityRounds: number }>();
    for (const c of displayContracts) {
      const key = c.agentCode;
      if (!key) continue;
      const existing = agentFYPLookup.get(key);
      if (existing) {
        existing.totalFYP += c.pdt10DT;
        existing.totalAFYP += c.afyp;
      } else {
        agentFYPLookup.set(key, { totalFYP: c.pdt10DT, totalAFYP: c.afyp, activityRounds: 0 });
      }
    }
    // Tính activityRounds từ Contracts cho từng agent
    const agentContractsMap = new Map<string, Contract[]>();
    for (const c of displayContracts) {
      const key = c.agentCode;
      if (!key) continue;
      if (!agentContractsMap.has(key)) agentContractsMap.set(key, []);
      agentContractsMap.get(key)!.push(c);
    }
    for (const [key, cList] of agentContractsMap) {
      const data = agentFYPLookup.get(key);
      if (data) data.activityRounds = calculateLuotWithStructure(cList, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
    }
    for (const [nydCode, nyd] of nydMap) {
      // Find all contracts where maDaiLyTD = NTD's agentCode (TVV được tuyển bởi NTD này)
      const recruitedContracts = displayContracts.filter(c => c.maDaiLyTD === nydCode && c.agentCode !== nydCode);

      if (isActivityRoundMode(conditionType)) {
        // Lượt HĐ mode: use activityRounds for recruited agents
        let totalRounds = 0;
        let totalRecruitFYP = 0;
        let recruitedAgents = new Set(recruitedContracts.map(c => c.agentCode));
        // Lọc TVVm nếu chế độ TVVm (chỉ đếm lượt của TVV mới)
        if (isTVVmMode(conditionType)) {
          recruitedAgents = new Set(
            [...recruitedAgents].filter(agentCode => {
              return isTVVm(structureStartDateByCode.get(agentCode) || null);
            })
          );
        }
        // Lọc TVV90 nếu chế độ TVV90
        if (conditionType === 'activity_round_tvv90') {
          recruitedAgents = new Set(
            [...recruitedAgents].filter(agentCode => {
              return isTVV90Agent(recruitedContracts, agentCode, tvv90MaxMonths, tvv90MinIP, structureStartDateByCode.get(agentCode));
            })
          );
        }
        for (const agentCode of recruitedAgents) {
          const rv = agentFYPLookup.get(agentCode);
          if (rv) {
            totalRounds += rv.activityRounds;
            totalRecruitFYP += rv.totalFYP;
          }
        }
        nyd.recruitCount = totalRounds;
        nyd.recruitFYP = totalRecruitFYP;
      } else {
        // NTD FYP mode: get FYP from agentFYPLookup (Contracts cho total_ip/total_afyp)
        let recruitCount = 0;
        let recruitFYP = 0;
        const recruitedAgents = new Set(recruitedContracts.map(c => c.agentCode));
        for (const agentCode of recruitedAgents) {
          const rv = agentFYPLookup.get(agentCode);
          const agentFYP = rv ? (isAFYP ? rv.totalAFYP : rv.totalFYP) : 0;
          if (agentFYP >= luotHDThreshold) recruitCount++;
          recruitFYP += agentFYP;
        }
        nyd.recruitCount = recruitCount;
        nyd.recruitFYP = recruitFYP;
      }

      // Also add NTD's own FYP from agentFYPLookup
      const ownRevenue = agentFYPLookup.get(nydCode);
      nyd.ownFYP = ownRevenue ? (isAFYP ? ownRevenue.totalAFYP : ownRevenue.totalFYP) : 0;
      nyd.contracts = [...recruitedContracts, ...displayContracts.filter(c => c.agentCode === nydCode)];
    }

    return Array.from(nydMap.values());
  }, [displayContracts, conditionType, ntdCandidates, subjectCodes, staffList, luotHDThreshold, luotHDCTThreshold, tvv90MaxMonths, tvv90MinIP, structureStartDateByCode, calculateLuotWithStructure]);

  // Nhóm hiển thị luôn lấy theo Cấu trúc. Dữ liệu hợp đồng chỉ là nguồn doanh
  // số nên có thể thiếu tên/mã nhóm, nhưng không được làm trống cột Nhóm.
  const resolveTvvGroup = useMemo(() => {
    const normalizeKey = (value: string) => norm(value || '').toLowerCase();
    const groupNameByCode = new Map<string, string>();
    const groupByAgentCode = new Map<string, { maNhom: string; nhom: string }>();

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
    const addMember = (member: { agentCode?: string; maBanNhom?: string; maNhom?: string; nhom?: string }) => {
      const agentCode = normalizeKey(member.agentCode || '');
      if (!agentCode) return;
      const maNhom = member.maBanNhom || member.maNhom || '';
      const nhom = groupNameByCode.get(normalizeKey(maNhom)) || member.nhom || '';
      if (maNhom || nhom) groupByAgentCode.set(agentCode, { maNhom, nhom });
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
    const isAFYP = conditionType === 'total_afyp';
    const isActivityMode = isActivityRoundMode(conditionType);
    const isTopN = isTopNMode(conditionType);
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
        if ((!existing.maNhom || existing.nhom === '—') && group.maNhom) {
          existing.maNhom = group.maNhom;
          existing.nhom = group.nhom;
        }
      } else {
        agentMap.set(key, {
          agentCode: c.agentCode, agentName: c.agentName,
          nhom: group.nhom, maNhom: group.maNhom,
          totalFYP: c.pdt10DT, totalAFYP: c.afyp, contractCount: 1,
          activityRounds: 0,
        });
      }
    }
    // Tính activityRounds từ Contracts cho từng agent
    for (const [key, agent] of agentMap) {
      const agentContracts = displayContracts.filter(c => c.agentCode === key);
      agent.activityRounds = calculateLuotWithStructure(agentContracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
    }
    // Thêm TVV từ subjectCodes KHÔNG có trong dữ liệu (không có doanh thu → giá trị 0)
    if (subjectCodes.length > 0) {
      for (const code of subjectCodes) {
        const codeLower = norm(code).toLowerCase();
        const found = Array.from(agentMap.keys()).some(k => norm(k).toLowerCase() === codeLower);
        if (!found) {
          const info = tvvStructList.find(t => t.agentCode.toLowerCase() === codeLower || norm(t.agentName || '').toLowerCase() === codeLower);
          const group = resolveTvvGroup(info?.agentCode || code, info?.maBanNhom || '');
          agentMap.set(code, {
            agentCode: info?.agentCode || code,
            agentName: info?.agentName || code,
            nhom: group.nhom,
            maNhom: group.maNhom,
            totalFYP: 0, totalAFYP: 0, contractCount: 0, activityRounds: 0,
          });
        }
      }
    } else if (isTopN && tvvStructList && tvvStructList.length > 0) {
      // Top N mode + KHÔNG có DS đối tượng → thêm TẤT CẢ TVV từ DS TVV (Cấu trúc) để hiển thị hết
      // Yêu cầu user: bảng kết quả phải hiển thị hết danh sách đối tượng tham gia thi đua,
      // không chỉ những người có doanh số. User dùng "Ẩn chưa đạt mức" để ẩn người k có doanh số.
      for (const t of tvvStructList) {
        if (!t.agentCode) continue;
        const codeLower = t.agentCode.toLowerCase();
        const found = Array.from(agentMap.keys()).some(k => norm(k).toLowerCase() === codeLower);
        if (!found) {
          const group = resolveTvvGroup(t.agentCode, t.maBanNhom || '');
          agentMap.set(t.agentCode, {
            agentCode: t.agentCode,
            agentName: t.agentName || t.agentCode,
            nhom: group.nhom,
            maNhom: group.maNhom,
            totalFYP: 0, totalAFYP: 0, contractCount: 0, activityRounds: 0,
          });
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
        const found = Array.from(agentMap.keys()).some(k => norm(k).toLowerCase() === codeLower);
        if (!found) {
          const group = resolveTvvGroup(t.agentCode, t.maBanNhom || '');
          agentMap.set(t.agentCode, {
            agentCode: t.agentCode,
            agentName: t.agentName || t.agentCode,
            nhom: group.nhom,
            maNhom: group.maNhom,
            totalFYP: 0, totalAFYP: 0, contractCount: 0, activityRounds: 0,
          });
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
        const agentContracts = displayContracts.filter(c => c.agentCode === agent.agentCode);
        const p1Contracts = agentContracts.filter(c => new Date(c.effectiveDate) < p2Start);
        const p2Contracts = agentContracts.filter(c => new Date(c.effectiveDate) >= p2Start);
        const p1Value = isAFYP
          ? p1Contracts.reduce((s, c) => s + c.afyp, 0)
          : p1Contracts.reduce((s, c) => s + c.pdt10DT, 0);
        const p2Value = isAFYP
          ? p2Contracts.reduce((s, c) => s + c.afyp, 0)
          : p2Contracts.reduce((s, c) => s + c.pdt10DT, 0);
        const p1Res = calculateBonusWithTiers(p1Value, bonusTiers);
        const p2Res = calculateBonusWithTiers(p2Value, bonusTiers2);
        phaseInfo = {
          phase1Bonus: p1Res.tier ? computeBonusFromTier(p1Res.tier, p1Value) : 0,
          phase2Bonus: p2Res.tier ? computeBonusFromTier(p2Res.tier, p2Value) : 0,
          phase1Tier: p1Res.tier, phase2Tier: p2Res.tier,
        };
      }
      return { agent, value, tier, remaining, phaseInfo };
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
  }, [displayContracts, targetType, conditionType, subjectCodes, staffList, recruiterList, usePhase2, phase2StartDate, calculateBonus, getRemainingToNextTier, calculateBonusWithTiers, bonusTiers, bonusTiers2, computeBonusFromTier, luotHDThreshold, luotHDCTThreshold, tvv90MaxMonths, tvv90MinIP, topN, topNMinIP, topNValueType, tvvStructList, phongStructList, adStructList, banNhomStructList, resolveTvvGroup]);

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

  // Phase 2: Split contracts by date and compute bonus — dùng Contracts (nguồn duy nhất) cho TẤT CẢ chế độ
  const phase2Results = useMemo(() => {
    if (!usePhase2 || !phase2StartDate) return null;
    const p2Start = new Date(phase2StartDate);

    const isAFYP = conditionType === 'total_afyp';
    const luotThreshold = isStandardMode(conditionType) ? luotHDCTThreshold : luotHDThreshold;

    // TẤT CẢ chế độ: dùng Contracts (nguồn duy nhất), chia theo effectiveDate
    const excludedGroupLeaderCodes = new Set(
      targetType === 'nhom' && !includeIndividualTN
        ? leadersList.map(l => l.agentCode).filter(Boolean)
        : []
    );
    const phase1Contracts = displayContracts.filter(c =>
      new Date(c.effectiveDate) < p2Start && !excludedGroupLeaderCodes.has(c.agentCode)
    );
    const phase2Contracts = displayContracts.filter(c =>
      new Date(c.effectiveDate) >= p2Start && !excludedGroupLeaderCodes.has(c.agentCode)
    );

    // Calculate Phase 1 and Phase 2 bonus
    let phase1Bonus = 0;
    let phase2Bonus = 0;

    if (targetType === 'nhom') {
      if (isActivityRoundMode(conditionType)) {
        // Gộp HĐ theo nhóm + tính lượt
        const phase1ByNhom = new Map<string, { totalFYP: number; totalAFYP: number; activityRounds: number }>();
        for (const c of phase1Contracts) {
          if (!c.maNhom) continue;
          const existing = phase1ByNhom.get(c.maNhom);
          if (existing) { existing.totalFYP += c.pdt10DT; existing.totalAFYP += c.afyp; }
          else { phase1ByNhom.set(c.maNhom, { totalFYP: c.pdt10DT, totalAFYP: c.afyp, activityRounds: 0 }); }
        }
        for (const [nhom, data] of phase1ByNhom) {
          const groupContracts = phase1Contracts.filter(c => c.maNhom === nhom);
          data.activityRounds = calculateLuotWithStructure(groupContracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
          const { tier } = calculateActivityRoundBonusWithTiers(data.activityRounds, bonusTiers);
          if (tier) phase1Bonus += computeBonusFromTier(tier, data.totalFYP, data.activityRounds);
        }
        const phase2ByNhom = new Map<string, { totalFYP: number; totalAFYP: number; activityRounds: number }>();
        for (const c of phase2Contracts) {
          if (!c.maNhom) continue;
          const existing = phase2ByNhom.get(c.maNhom);
          if (existing) { existing.totalFYP += c.pdt10DT; existing.totalAFYP += c.afyp; }
          else { phase2ByNhom.set(c.maNhom, { totalFYP: c.pdt10DT, totalAFYP: c.afyp, activityRounds: 0 }); }
        }
        for (const [nhom, data] of phase2ByNhom) {
          const groupContracts = phase2Contracts.filter(c => c.maNhom === nhom);
          data.activityRounds = calculateLuotWithStructure(groupContracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
          const { tier } = calculateActivityRoundBonusWithTiers(data.activityRounds, bonusTiers2);
          if (tier) phase2Bonus += computeBonusFromTier(tier, data.totalFYP, data.activityRounds);
        }
      } else {
        // total_ip / total_afyp cho nhóm: gộp HĐ theo nhóm
        const phase1ByNhom = new Map<string, { totalFYP: number; totalAFYP: number }>();
        for (const c of phase1Contracts) {
          if (!c.maNhom) continue;
          const existing = phase1ByNhom.get(c.maNhom);
          if (existing) { existing.totalFYP += c.pdt10DT; existing.totalAFYP += c.afyp; }
          else { phase1ByNhom.set(c.maNhom, { totalFYP: c.pdt10DT, totalAFYP: c.afyp }); }
        }
        for (const [, data] of phase1ByNhom) {
          const value = isAFYP ? data.totalAFYP : data.totalFYP;
          phase1Bonus += getBonusAmountWithTiers(value, bonusTiers);
        }
        const phase2ByNhom = new Map<string, { totalFYP: number; totalAFYP: number }>();
        for (const c of phase2Contracts) {
          if (!c.maNhom) continue;
          const existing = phase2ByNhom.get(c.maNhom);
          if (existing) { existing.totalFYP += c.pdt10DT; existing.totalAFYP += c.afyp; }
          else { phase2ByNhom.set(c.maNhom, { totalFYP: c.pdt10DT, totalAFYP: c.afyp }); }
        }
        for (const [, data] of phase2ByNhom) {
          const value = isAFYP ? data.totalAFYP : data.totalFYP;
          phase2Bonus += getBonusAmountWithTiers(value, bonusTiers2);
        }
      }
    } else if (targetType === 'nyd') {
      // NYD Phase 1: tính từ Contracts
      const agentFYPLookupP1 = new Map<string, { totalFYP: number; totalAFYP: number }>();
      for (const c of phase1Contracts) {
        const key = c.agentCode;
        if (!key) continue;
        const existing = agentFYPLookupP1.get(key);
        if (existing) { existing.totalFYP += c.pdt10DT; existing.totalAFYP += c.afyp; }
        else { agentFYPLookupP1.set(key, { totalFYP: c.pdt10DT, totalAFYP: c.afyp }); }
      }
      for (const r of ntdCandidates) {
        const recruited = phase1Contracts.filter(c => c.maDaiLyTD === r.agentCode && c.agentCode !== r.agentCode);
        const recruitedAgents = new Set(recruited.map(c => c.agentCode));
        if (isActivityRoundMode(conditionType)) {
          let filteredAgents = recruitedAgents;
          if (isTVVmMode(conditionType)) { filteredAgents = new Set([...filteredAgents].filter(agentCode => isTVVm(structureStartDateByCode.get(agentCode) || null))); }
        if (conditionType === 'activity_round_tvv90') { filteredAgents = new Set([...filteredAgents].filter(agentCode => isTVV90Agent(recruited, agentCode, tvv90MaxMonths, tvv90MinIP, structureStartDateByCode.get(agentCode)))); }
          let recruitCount = 0;
          for (const agentCode of filteredAgents) {
            const agentContracts = phase1Contracts.filter(c => c.agentCode === agentCode);
            recruitCount += calculateLuotWithStructure(agentContracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
          }
          const { tier } = calculateBonusWithTiers(recruitCount, bonusTiers);
          if (tier) phase1Bonus += computeBonusFromTier(tier, recruitCount, recruitCount);
        } else {
          let recruitFYP = 0;
          for (const agentCode of recruitedAgents) {
            const rv = agentFYPLookupP1.get(agentCode);
            recruitFYP += rv ? (isAFYP ? rv.totalAFYP : rv.totalFYP) : 0;
          }
          const ownRV = agentFYPLookupP1.get(r.agentCode);
          const ownFYP = ownRV ? (isAFYP ? ownRV.totalAFYP : ownRV.totalFYP) : 0;
          const value = recruitFYP + (includeIndividualNTD ? ownFYP : 0);
          const { tier } = calculateBonusWithTiers(value, bonusTiers);
          if (tier) phase1Bonus += computeBonusFromTier(tier, value);
        }
      }
      // NYD Phase 2
      const agentFYPLookupP2 = new Map<string, { totalFYP: number; totalAFYP: number }>();
      for (const c of phase2Contracts) {
        const key = c.agentCode;
        if (!key) continue;
        const existing = agentFYPLookupP2.get(key);
        if (existing) { existing.totalFYP += c.pdt10DT; existing.totalAFYP += c.afyp; }
        else { agentFYPLookupP2.set(key, { totalFYP: c.pdt10DT, totalAFYP: c.afyp }); }
      }
      for (const r of ntdCandidates) {
        const recruited = phase2Contracts.filter(c => c.maDaiLyTD === r.agentCode && c.agentCode !== r.agentCode);
        const recruitedAgents = new Set(recruited.map(c => c.agentCode));
        if (isActivityRoundMode(conditionType)) {
          let filteredAgents = recruitedAgents;
          if (isTVVmMode(conditionType)) { filteredAgents = new Set([...filteredAgents].filter(agentCode => isTVVm(structureStartDateByCode.get(agentCode) || null))); }
        if (conditionType === 'activity_round_tvv90') { filteredAgents = new Set([...filteredAgents].filter(agentCode => isTVV90Agent(recruited, agentCode, tvv90MaxMonths, tvv90MinIP, structureStartDateByCode.get(agentCode)))); }
          let recruitCount = 0;
          for (const agentCode of filteredAgents) {
            const agentContracts = phase2Contracts.filter(c => c.agentCode === agentCode);
            recruitCount += calculateLuotWithStructure(agentContracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
          }
          const { tier } = calculateBonusWithTiers(recruitCount, bonusTiers2);
          if (tier) phase2Bonus += computeBonusFromTier(tier, recruitCount, recruitCount);
        } else {
          let recruitFYP = 0;
          for (const agentCode of recruitedAgents) {
            const rv = agentFYPLookupP2.get(agentCode);
            recruitFYP += rv ? (isAFYP ? rv.totalAFYP : rv.totalFYP) : 0;
          }
          const ownRV = agentFYPLookupP2.get(r.agentCode);
          const ownFYP = ownRV ? (isAFYP ? ownRV.totalAFYP : ownRV.totalFYP) : 0;
          const value = recruitFYP + (includeIndividualNTD ? ownFYP : 0);
          const { tier } = calculateBonusWithTiers(value, bonusTiers2);
          if (tier) phase2Bonus += computeBonusFromTier(tier, value);
        }
      }
    } else {
      // TVV total mode: aggregate by agentCode from Contracts
      if (isActivityRoundMode(conditionType)) {
        const phase1AgentMap = new Map<string, { totalFYP: number; totalAFYP: number }>();
        for (const c of phase1Contracts) {
          const key = c.agentCode;
          if (!key) continue;
          const existing = phase1AgentMap.get(key);
          if (existing) { existing.totalFYP += c.pdt10DT; existing.totalAFYP += c.afyp; }
          else { phase1AgentMap.set(key, { totalFYP: c.pdt10DT, totalAFYP: c.afyp }); }
        }
        for (const [agentCode, data] of phase1AgentMap) {
          const agentContracts = phase1Contracts.filter(c => c.agentCode === agentCode);
          const rounds = calculateLuotWithStructure(agentContracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
          const { tier } = calculateActivityRoundBonusWithTiers(rounds, bonusTiers);
          if (tier) phase1Bonus += computeBonusFromTier(tier, data.totalFYP, rounds);
        }
        const phase2AgentMap = new Map<string, { totalFYP: number; totalAFYP: number }>();
        for (const c of phase2Contracts) {
          const key = c.agentCode;
          if (!key) continue;
          const existing = phase2AgentMap.get(key);
          if (existing) { existing.totalFYP += c.pdt10DT; existing.totalAFYP += c.afyp; }
          else { phase2AgentMap.set(key, { totalFYP: c.pdt10DT, totalAFYP: c.afyp }); }
        }
        for (const [agentCode, data] of phase2AgentMap) {
          const agentContracts = phase2Contracts.filter(c => c.agentCode === agentCode);
          const rounds = calculateLuotWithStructure(agentContracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
          const { tier } = calculateActivityRoundBonusWithTiers(rounds, bonusTiers2);
          if (tier) phase2Bonus += computeBonusFromTier(tier, data.totalFYP, rounds);
        }
      } else {
        const phase1AgentMap = new Map<string, { totalFYP: number; totalAFYP: number }>();
        for (const c of phase1Contracts) {
          const key = c.agentCode;
          if (!key) continue;
          const existing = phase1AgentMap.get(key);
          if (existing) { existing.totalFYP += c.pdt10DT; existing.totalAFYP += c.afyp; }
          else { phase1AgentMap.set(key, { totalFYP: c.pdt10DT, totalAFYP: c.afyp }); }
        }
        for (const [, data] of phase1AgentMap) {
          const value = isAFYP ? data.totalAFYP : data.totalFYP;
          const { tier } = calculateBonusWithTiers(value, bonusTiers);
          if (tier) phase1Bonus += computeBonusFromTier(tier, value);
        }
        const phase2AgentMap = new Map<string, { totalFYP: number; totalAFYP: number }>();
        for (const c of phase2Contracts) {
          const key = c.agentCode;
          if (!key) continue;
          const existing = phase2AgentMap.get(key);
          if (existing) { existing.totalFYP += c.pdt10DT; existing.totalAFYP += c.afyp; }
          else { phase2AgentMap.set(key, { totalFYP: c.pdt10DT, totalAFYP: c.afyp }); }
        }
        for (const [, data] of phase2AgentMap) {
          const value = isAFYP ? data.totalAFYP : data.totalFYP;
          const { tier } = calculateBonusWithTiers(value, bonusTiers2);
          if (tier) phase2Bonus += computeBonusFromTier(tier, value);
        }
      }
    }

    const phase1Count = phase1Contracts.length;
    const phase2Count = phase2Contracts.length;
    return { phase1Bonus, phase2Bonus, totalBonus: phase1Bonus + phase2Bonus, phase1Count, phase2Count };
  }, [usePhase2, phase2StartDate, displayContracts, targetType, conditionType, bonusTiers, bonusTiers2, includeIndividualTN, includeIndividualNTD, leadersList, ntdCandidates, staffList, calculateBonusWithTiers, calculateActivityRoundBonusWithTiers, getBonusAmountWithTiers, luotHDThreshold, luotHDCTThreshold, tvv90MaxMonths, tvv90MinIP]);

  // Helper: get the value for comparison based on condition type
  const getContractValue = useCallback((c: Contract): number => {
    if (conditionType === 'per_contract_afyp') return c.afyp;
    return c.pdt10DT;
  }, [conditionType]);

  const getEntityValue = useCallback((contracts: Contract[]): number => {
    if (conditionType === 'total_afyp') return contracts.reduce((sum, c) => sum + c.afyp, 0);
    return contracts.reduce((sum, c) => sum + c.pdt10DT, 0);
  }, [conditionType]);

  const getGroupValue = useCallback((g: GroupData): number => {
    if (conditionType === 'total_afyp') return g.totalAFYP;
    return g.totalFYP;
  }, [conditionType]);

  // Helper: kiểm tra 1 TVV có đạt điều kiện của chương trình tham chiếu không
  // Dùng cho conditionType = 'tvv_pass_count'
  // Lọc HĐ theo ngày của CHƯƠNG TRÌNH THAM CHIẾU (không dùng displayContracts)
  // TVV đạt = đạt bất kỳ mức thưởng nào trong chương trình tham chiếu
  // Logic giống hệt cách tính kết quả trên trang thi đua TVV
  const checkTVVPassContest = useCallback((agentCode: string): boolean => {
    if (!referenceContestId) return false;
    const refContest = savedContests.find(sc => sc.id === referenceContestId);
    if (!refContest) return false;

    const refCondition = refContest.conditionType as ConditionType;
    const refTiers: BonusTier[] = (() => { try { return JSON.parse(refContest.bonusTiers); } catch { return []; } })();
    if (refTiers.length === 0) return false;

    // Lọc HĐ theo ngày của CHƯƠNG TRÌNH THAM CHIẾU (dùng contracts gốc, không dùng displayContracts)
    let agentContracts = contracts.filter(c => c.agentCode === agentCode);
    // Lọc theo ngày hiệu lực của chương trình tham chiếu
    if (refContest.startDate) {
      const start = new Date(refContest.startDate);
      agentContracts = agentContracts.filter(c => new Date(c.effectiveDate) >= start);
    }
    if (refContest.endDate) {
      const end = new Date(refContest.endDate);
      end.setHours(23, 59, 59, 999);
      agentContracts = agentContracts.filter(c => new Date(c.effectiveDate) <= end);
    }
    // Lọc theo ngày phát hành nếu chương trình tham chiếu có cài
    if (refContest.issueDate) {
      const issueStart = new Date(refContest.issueDate);
      agentContracts = agentContracts.filter(c => new Date(c.issueDate) >= issueStart);
    }

    // Tính giá trị cho TVV theo điều kiện của CTĐK tham chiếu
    const isAFYP = refCondition === 'total_afyp' || refCondition === 'per_contract_afyp';
    const isPerContract = isPerContractMode(refCondition);
    const isActivity = isActivityRoundMode(refCondition);
    const refLuotThreshold = isStandardMode(refCondition)
      ? (refContest.luotHDCTThreshold ?? 12_000_000)
      : (refContest.luotHDThreshold ?? 3_000_000);

    // TVV đạt = calculateBonusWithTiers tìm được tier (đạt bất kỳ mức thưởng nào)
    // Giống hệt logic tính kết quả trên trang thi đua TVV
    let passed = false;

    if (isPerContract) {
      // Per-contract: TVV đạt nếu có ít nhất 1 HĐ đạt mức thưởng
      passed = agentContracts.some(c => {
        const value = refCondition === 'per_contract_afyp' ? c.afyp : c.pdt10DT;
        const { tier } = calculateBonusWithTiers(value, refTiers);
        return tier !== null;
      });
    } else if (isActivity) {
      // Activity round: tính lượt rồi check tier
      const luot = calculateLuotWithStructure(agentContracts, refLuotThreshold, refCondition, refContest.tvv90MaxMonths ?? 3, refContest.tvv90MinIP ?? 12_000_000);
      const { tier } = calculateBonusWithTiers(luot, refTiers);
      passed = tier !== null;
    } else {
      // Total mode: tính tổng IP/AFYP rồi check tier
      const value = isAFYP
        ? agentContracts.reduce((s, c) => s + c.afyp, 0)
        : agentContracts.reduce((s, c) => s + c.pdt10DT, 0);
      const { tier } = calculateBonusWithTiers(value, refTiers);
      passed = tier !== null;
    }

    // Kiểm tra điều kiện bổ sung (Tổng AFYP/Tổng IP tối thiểu) của chương trình tham chiếu
    if (passed && refContest.useSecondaryCondition) {
      const totalAFYP = agentContracts.reduce((s, c) => s + c.afyp, 0);
      const totalIP = agentContracts.reduce((s, c) => s + c.pdt10DT, 0);
      if ((refContest.secondaryTotalAFYPMin ?? 0) > 0 && totalAFYP < (refContest.secondaryTotalAFYPMin ?? 0)) passed = false;
      if ((refContest.secondaryTotalIPMin ?? 0) > 0 && totalIP < (refContest.secondaryTotalIPMin ?? 0)) passed = false;
    }

    return passed;
  }, [referenceContestId, savedContests, contracts, calculateBonusWithTiers, calculateLuot]);

  // Đếm số TVV đạt CTĐK trong mỗi nhóm (cho tvv_pass_count mode)
  const getGroupTVVPassCount = useCallback((g: GroupData): number => {
    if (conditionType !== 'tvv_pass_count' || !referenceContestId) return 0;
    // Xác định agentCode của Trưởng Nhóm để loại trừ nếu cần
    const tnAgentCode = g.leader?.agentCode || '';
    // Lấy danh sách unique TVV trong nhóm (từ contracts + staffList)
    const agentCodes = new Set<string>();
    // Lấy từ tất cả HĐ gốc (contracts) thuộc nhóm — dùng contracts gốc để không bỏ sót TVV
    const groupAllContracts = contracts.filter(c => c.maNhom === g.maNhom || (c.maNhom && c.maNhom.toLowerCase() === g.maNhom.toLowerCase()));
    for (const c of groupAllContracts) { if (c.agentCode) agentCodes.add(c.agentCode); }
    // Thêm TVV từ staffList trong nhóm (không có HĐ vẫn tính, nhưng sẽ không đạt)
    const groupStaff = staffList.filter(s => s.maNhom === g.maNhom || (s.maNhom && s.maNhom.toLowerCase() === g.maNhom.toLowerCase()));
    for (const s of groupStaff) agentCodes.add(s.agentCode);

    let count = 0;
    for (const code of agentCodes) {
      // Mặc định: không đếm cá nhân TN (vì họ đã đạt ở chương trình cá nhân kìa)
      // Chỉ đếm TN khi includeTNInPassCount = true
      if (!includeTNInPassCount && tnAgentCode && code === tnAgentCode) continue;
      if (checkTVVPassContest(code)) count++;
    }
    return count;
  }, [conditionType, referenceContestId, contracts, staffList, checkTVVPassContest, includeTNInPassCount]);

  // Đếm số TVV đạt IP+AFYP trong mỗi nhóm (cho pass_count_ip_afyp mode)
  // Điều kiện: TVV có tổng IP (pdt10DT) >= passCountIPMin AND tổng AFYP >= passCountAFYPMin
  const getGroupTVVPassCountIPAFYP = useCallback((g: GroupData): number => {
    if (conditionType !== 'pass_count_ip_afyp') return 0;
    const tnAgentCode = g.leader?.agentCode || '';
    // Lấy danh sách unique TVV trong nhóm
    const agentCodes = new Set<string>();
    const groupContracts = displayContracts.filter(c => c.maNhom === g.maNhom || (c.maNhom && c.maNhom.toLowerCase() === g.maNhom.toLowerCase()));
    for (const c of groupContracts) { if (c.agentCode) agentCodes.add(c.agentCode); }
    // Thêm TVV từ staffList trong nhóm
    const groupStaff = staffList.filter(s => s.maNhom === g.maNhom || (s.maNhom && s.maNhom.toLowerCase() === g.maNhom.toLowerCase()));
    for (const s of groupStaff) agentCodes.add(s.agentCode);

    let count = 0;
    for (const code of agentCodes) {
      if (!includeTNInPassCount && tnAgentCode && code === tnAgentCode) continue;
      // Tính tổng IP + AFYP của TVV này trong displayContracts
      const tvvContracts = displayContracts.filter(c => c.agentCode === code);
      const totalIP = tvvContracts.reduce((s, c) => s + c.pdt10DT, 0);
      const totalAFYP = tvvContracts.reduce((s, c) => s + c.afyp, 0);
      if (totalIP >= passCountIPMin && totalAFYP >= passCountAFYPMin) count++;
    }
    return count;
  }, [conditionType, displayContracts, staffList, includeTNInPassCount, passCountIPMin, passCountAFYPMin]);

  // Helper: kiểm tra điều kiện bổ sung Tổng AFYP / Tổng IP cho 1 entity (TVV/nhóm/NTD)
  // Trả về { passed, totalAFYP, totalIP } — passed=true nếu đạt tất cả điều kiện
  const checkSecondaryTotalCondition = useCallback((contracts: Contract[]): { passed: boolean; totalAFYP: number; totalIP: number } => {
    const totalAFYP = contracts.reduce((sum, c) => sum + c.afyp, 0);
    const totalIP = contracts.reduce((sum, c) => sum + c.pdt10DT, 0);
    if (!useSecondaryCondition) return { passed: true, totalAFYP, totalIP };
    let passed = true;
    if (secondaryTotalAFYPMin > 0 && totalAFYP < secondaryTotalAFYPMin) passed = false;
    if (secondaryTotalIPMin > 0 && totalIP < secondaryTotalIPMin) passed = false;
    return { passed, totalAFYP, totalIP };
  }, [useSecondaryCondition, secondaryTotalAFYPMin, secondaryTotalIPMin]);

  const getTotalFYPBonus = useCallback((): { totalFYP: number; bonus: number; tier: BonusTier | null; remaining: number | null } => {
    const totalFYP = displayContracts.reduce((sum, c) => sum + c.pdt10DT, 0);
    const { tier } = calculateBonus(totalFYP); const remaining = getRemainingToNextTier(totalFYP);
    const bonus = tier ? computeBonusFromTier(tier, totalFYP) : 0;
    return { totalFYP, bonus, tier, remaining };
  }, [displayContracts, calculateBonus, getRemainingToNextTier]);

  const addBonusTier = () => setBonusTiers([...bonusTiers, { id: crypto.randomUUID(), minFYP: 0, maxFYP: null, bonusAmount: 0, bonusType: 'money', bonusText: '', bonusPercent: 0 }]);
  const removeBonusTier = (id: string) => { setBonusTiers(bonusTiers.filter((t) => t.id !== id)); };
  const updateBonusTier = (id: string, field: keyof BonusTier, value: string | number | null) => setBonusTiers(bonusTiers.map((t) => (t.id === id ? { ...t, [field]: value } : t)));

  const addBonusTier2 = () => setBonusTiers2([...bonusTiers2, { id: crypto.randomUUID(), minFYP: 0, maxFYP: null, bonusAmount: 0, bonusType: 'money', bonusText: '', bonusPercent: 0 }]);
  const removeBonusTier2 = (id: string) => { setBonusTiers2(bonusTiers2.filter((t) => t.id !== id)); };
  const updateBonusTier2 = (id: string, field: keyof BonusTier, value: string | number | null) => setBonusTiers2(bonusTiers2.map((t) => (t.id === id ? { ...t, [field]: value } : t)));

  // Save contest with all new fields
  const handleSaveContest = async () => {
    if (!contestTitle) { toast({ title: 'Lỗi', description: 'Nhập tên chương trình' }); return; }
    setIsSaving(true);
    try {
      const res = await fetch('/api/contests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        title: contestTitle, startDate, endDate, issueDate: issueStartDate || undefined,
        conditionType, targetType: (conditionType === 'tvv_pass_count' || conditionType === 'pass_count_ip_afyp') ? 'nhom' : targetType, bonusTiers: JSON.stringify(bonusTiers),
        posterUrl, participants: JSON.stringify(subjectCodes),
        usePhase2, phase2StartDate: phase2StartDate || undefined, phase2EndDate: phase2EndDate || undefined,
        bonusTiers2: JSON.stringify(bonusTiers2),
        useSecondaryCondition,
        secondaryLuotHDMin, secondaryLuotHDCMin, secondaryLuotHDFilter, secondaryLuotHDCFilter,
        secondaryTotalAFYPMin, secondaryTotalIPMin,
        hideNotAchieved, includeIndividualNTD, includeIndividualTN,
        luotHDThreshold, luotHDCTThreshold, tvv90MaxMonths, tvv90MinIP,
        referenceContestId: referenceContestId || undefined,
        includeTNInPassCount,
        topN, topNMinIP, topNValueType,
        filterByEffectiveDate,
        secondaryIPMin: conditionType === 'pass_count_ip_afyp' ? passCountIPMin : secondaryIPMin,
        secondaryAFYPMin: conditionType === 'pass_count_ip_afyp' ? passCountAFYPMin : secondaryAFYPMin,
      }) });
      if (res.ok) { const data = await res.json(); toast({ title: 'Thành công', description: data.message }); fetchSavedContests(); reloadAppData(); }
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

  // Load contest with all new fields
  const handleLoadContest = (contestId: string) => {
    setSelectedContestId(contestId); const contest = savedContests.find(c => c.id === contestId); if (!contest) return;
    setContestTitle(contest.title); setStartDate(new Date(contest.startDate).toISOString().slice(0, 10)); setEndDate(new Date(contest.endDate).toISOString().slice(0, 10));
    setConditionType(contest.conditionType as ConditionType);
    // tvv_pass_count chỉ dành cho nhóm → tự động set targetType = 'nhom'
    setTargetType((contest.conditionType === 'tvv_pass_count' || contest.conditionType === 'pass_count_ip_afyp' ? 'nhom' : (contest.targetType || 'tvv')) as TargetType);
    if (contest.issueDate) setIssueStartDate(new Date(contest.issueDate).toISOString().slice(0, 10)); else setIssueStartDate('');
    setIssueEndDate(''); // issueEndDate not stored in contest yet
    try { const tiers = JSON.parse(contest.bonusTiers); if (Array.isArray(tiers)) setBonusTiers(tiers); } catch { /* ignore */ }
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
    try { const tiers2 = JSON.parse(contest.bonusTiers2 || '[]'); if (Array.isArray(tiers2)) setBonusTiers2(tiers2); } catch { /* ignore */ }
    // Secondary condition
    setUseSecondaryCondition(contest.useSecondaryCondition ?? false);
    setSecondaryAFYPMin(contest.secondaryAFYPMin ?? 0);
    setSecondaryIPMin(contest.secondaryIPMin ?? 0);
    setSecondaryLuotHDMin(contest.secondaryLuotHDMin ?? 0);
    setSecondaryLuotHDCMin(contest.secondaryLuotHDCMin ?? 0);
    setSecondaryLuotHDFilter((contest.secondaryLuotHDFilter as 'all' | 'tvvm') ?? 'all');
    setSecondaryLuotHDCFilter((contest.secondaryLuotHDCFilter as 'all' | 'tvvm') ?? 'all');
    setSecondaryTotalAFYPMin(contest.secondaryTotalAFYPMin ?? 0);
    setSecondaryTotalIPMin(contest.secondaryTotalIPMin ?? 0);
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
    // Filter by effective date
    setFilterByEffectiveDate(contest.filterByEffectiveDate ?? false);
    // pass_count_ip_afyp: load IP min + AFYP min (reuse secondaryIPMin + secondaryAFYPMin)
    setPassCountIPMin(contest.secondaryIPMin || 6000000);
    setPassCountAFYPMin(contest.secondaryAFYPMin || 12000000);
    setTimeout(() => handleSearchRef.current(), 100);
  };

  const handleDeleteContest = async (id: string) => {
    try { const res = await fetch(`/api/contests?id=${encodeURIComponent(id)}`, { method: 'DELETE', cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }); if (res.ok) { setSavedContests(prev => prev.filter(contest => contest.id !== id)); if (selectedContestId === id) setSelectedContestId(''); await Promise.all([fetchSavedContests(), reloadAppData()]); window.dispatchEvent(new Event('nmc-contests-updated')); toast({ title: 'Thành công', description: 'Đã xóa' }); } else { const data = await res.json(); toast({ title: 'Lỗi', description: data.error || 'Không thể xóa', variant: 'destructive' }); } }
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
    if (perContractDisplayContracts.length === 0 && nydData.length === 0 && tvvTotalRows.length === 0 && groupedData.length === 0) return;
    const sTiers = [...bonusTiers].sort((a, b) => a.minFYP - b.minFYP);
    let text = `🏆 ${contestTitle}\n📅 Từ ${startDate ? formatDate(startDate) : '...'} đến ${endDate ? formatDate(endDate) : '...'}\n🎯 ${getTargetLabel(targetType)}\n━━━━━━━━━━━━━━━━━━━━\n📊 Mức thưởng:\n`;
    sTiers.forEach((t, i) => { text += `  Mức ${i + 1}: ${isActivityRoundMode(conditionType) ? `${t.minFYP}${t.maxFYP ? ` - ${t.maxFYP}` : ' ↑'} lượt` : `${formatCurrency(t.minFYP)}${t.maxFYP ? ` - ${formatCurrency(t.maxFYP)}` : ' ↑'}`} → ${formatBonus(t)}\n`; });
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    if (targetType === 'nyd') {
      nydData.map(n => {
        const value = isActivityRoundMode(conditionType) ? n.recruitCount : (n.recruitFYP + (includeIndividualNTD ? n.ownFYP : 0));
        const { tier } = calculateBonus(value);
        return { nyd: n, tier, value };
      }).sort((a, b) => b.value - a.value).forEach(({ nyd: n, tier, value }, idx) => {
        const displayVal = isActivityRoundMode(conditionType) ? `${n.recruitCount} Lượt` : formatNumber(value);
        text += `${idx + 1}. ${n.nhom || '—'} | ${n.nydCode} | ${n.nydName} | ${n.position || '—'} | ${displayVal}${includeIndividualNTD ? ` | IP cá nhân: ${formatNumber(n.ownFYP)}` : ''} | ${tier ? `Thưởng: ${formatBonus(tier, value, n.recruitCount)}` : 'Chưa đạt'}\n`;
      });
    } else if (targetType === 'nhom') {
      [...groupedData].map((g) => {
        const groupPhase = getGroupPhaseBonus(g);
        const tvvPassCount = conditionType === 'pass_count_ip_afyp' ? getGroupTVVPassCountIPAFYP(g) : getGroupTVVPassCount(g);
        const tier = isTVVPassCountMode(conditionType) ? calculateBonus(tvvPassCount).tier : isActivityRoundMode(conditionType) ? calculateActivityRoundBonus(g.activityRounds).tier : calculateBonus(getGroupValue(g)).tier;
        return { group: g, tier, groupPhase, tvvPassCount };
      }).sort((a, b) => {
        const aValue = isTVVPassCountMode(conditionType) ? a.tvvPassCount : isActivityRoundMode(conditionType) ? a.group.activityRounds : a.group.totalFYP;
        const bValue = isTVVPassCountMode(conditionType) ? b.tvvPassCount : isActivityRoundMode(conditionType) ? b.group.activityRounds : b.group.totalFYP;
        return bValue - aValue;
      }).forEach(({ group: g, tier, groupPhase, tvvPassCount }, idx) => {
        if (isTVVPassCountMode(conditionType)) {
          // Bảng đơn giản cho TVV đạt thi đua
          const bonusLabel = tier ? `Thưởng: ${formatBonus(tier, 0, tvvPassCount)}` : 'Chưa đạt';
          text += `${idx + 1}. ${g.nhom || '—'} | ${g.leader?.agentCode || '—'} | ${g.leader?.agentName || '—'} | ${tvvPassCount} TVV đạt${!includeTNInPassCount ? ' (KO tính TN)' : ''} | ${bonusLabel}\n`;
        } else {
          const valueLabel = isActivityRoundMode(conditionType) ? `${g.activityRounds} ${isStandardMode(conditionType) ? 'Lượt chuẩn' : 'Lượt'}` : `IP: ${formatNumber(g.totalFYP)}`;
          const leaderLabel = g.leader ? `${g.leader.agentCode} ${g.leader.agentName} (${g.leader.position || 'TN'})` : '';
          if (usePhase2 && phase2StartDate) {
            text += `${idx + 1}. ${g.nhom || '—'} | ${leaderLabel} | ${valueLabel} | GD1: ${formatCurrency(groupPhase.phase1Bonus)} | GD2: ${formatCurrency(groupPhase.phase2Bonus)} | Tổng: ${formatCurrency(groupPhase.phase1Bonus + groupPhase.phase2Bonus)}\n`;
          } else {
            text += `${idx + 1}. ${g.nhom || '—'} | ${leaderLabel} | ${valueLabel} | ${tier ? `Thưởng: ${formatBonus(tier, g.totalFYP, g.activityRounds)}` : 'Chưa đạt'}\n`;
          }
        }
      });
    } else if (isPerContractMode(conditionType)) {
      const mainColLabel = isAFYP ? 'AFYP' : 'IP';
      perContractDisplayContracts.map((c) => {
        const cValue = getContractValue(c);
        const tier = calculateBonus(cValue).tier;
        const phaseInfo = getRowPhaseBonus(cValue, c.effectiveDate);
        return { contract: c, cValue, tier, phaseInfo };
      }).sort((a, b) => b.cValue - a.cValue).forEach(({ contract: c, cValue, tier, phaseInfo }, idx) => {
        if (usePhase2 && phase2StartDate) {
          text += `${idx + 1}. ${c.agentCode} | ${c.agentName} | ${formatDate(c.effectiveDate)} | ${mainColLabel}: ${formatNumber(cValue)} | GD1: ${formatCurrency(phaseInfo.phase1Bonus)} | GD2: ${formatCurrency(phaseInfo.phase2Bonus)} | Tổng: ${formatCurrency(phaseInfo.phase1Bonus + phaseInfo.phase2Bonus)}\n`;
        } else {
          text += `${idx + 1}. ${c.nhom || '—'} | ${c.agentCode} | ${c.agentName} | ${formatDate(c.effectiveDate)} | ${mainColLabel}: ${formatNumber(cValue)} | ${tier ? `Thưởng: ${formatBonus(tier, cValue)}` : 'Chưa đạt'}\n`;
        }
      });
    } else {
      // total_ip / total_afyp mode: use tvvTotalRows (includes TVV with 0 contracts)
      const isAFYP = conditionType === 'total_afyp';
      tvvTotalRows.forEach(({ agent, value, tier }, idx) => {
        const valueLabel = isAFYP ? `AFYP: ${formatNumber(value)}` : `IP: ${formatNumber(value)}`;
        text += `${idx + 1}. ${agent.nhom || '—'} | ${agent.agentCode} | ${agent.agentName} | ${valueLabel} | ${tier ? `Thưởng: ${formatBonus(tier, value)}` : 'Chưa đạt'}\n`;
      });
    }
    navigator.clipboard.writeText(text).then(() => toast({ title: 'Đã sao chép!', description: 'Dán vào Zalo/Telegram' })).catch(() => toast({ title: 'Lỗi', description: 'Không thể sao chép', variant: 'destructive' }));
  };

  const handleExport = async () => {
    try {
    if (perContractDisplayContracts.length === 0 && nydData.length === 0 && groupedData.length === 0 && tvvTotalRows.length === 0) { toast({ title: 'Thông báo', description: 'Không có dữ liệu' }); return; }
    let headers: string[];
    let rows: (string | number)[][];
    let merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];

    // Supplementary total column flags
    const expSecAFYP = showSecondaryTotalColumn && secondaryTotalAFYPMin > 0;
    const expSecIP = showSecondaryTotalColumn && secondaryTotalIPMin > 0;

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

    if (targetType === 'nyd') {
      // NTD: mở rộng mỗi NTD thành nhiều dòng, mỗi dòng = 1 HĐ của TVV đóng góp
      headers = ['STT', 'Nhóm', 'Mã ĐL', 'Họ tên NTD', 'Chức vụ', isActivityRoundMode(conditionType) ? getConditionLabel(conditionType) : 'Tổng IP', ...(includeIndividualNTD ? ['IP cá nhân'] : []), ...(expSecAFYP ? ['Tổng AFYP'] : []), ...(expSecIP ? ['Tổng IP'] : []), 'Họ tên TVV', 'Số hợp đồng', 'Ngày hiệu lực', 'Ngày phát hành', 'IP', 'AFYP', 'Tổng cộng', 'Ngày BĐLV', ...(showRateColumn ? ['Tỷ lệ'] : []), 'Thưởng', 'Ghi chú'];
      rows = [];
      merges = [];
      let currentRow = 1; // row 0 = header
      const sortedNYD = [...nydData].sort((a, b) => {
        const aVal = isActivityRoundMode(conditionType) ? a.recruitCount : (a.recruitFYP + (includeIndividualNTD ? a.ownFYP : 0));
        const bVal = isActivityRoundMode(conditionType) ? b.recruitCount : (b.recruitFYP + (includeIndividualNTD ? b.ownFYP : 0));
        return bVal - aVal;
      });
      sortedNYD.forEach((n, nIdx) => {
        const value = isActivityRoundMode(conditionType) ? n.recruitCount : (n.recruitFYP + (includeIndividualNTD ? n.ownFYP : 0));
        const { tier } = calculateBonus(value);
        // Check supplementary total condition
        const nydContracts = n.contracts || displayContracts.filter(c => c.maDaiLyTD === n.nydCode);
        const sc = checkSecondaryTotalCondition(nydContracts);
        const effectiveTier = sc.passed ? tier : (expSecAFYP || expSecIP ? null : tier);
        const startRow = currentRow;
        const contracts = n.contracts || [];
        if (contracts.length === 0) {
          // NTD không có HĐ, vẫn ghi 1 dòng
          const row: (string | number)[] = [nIdx + 1, n.nhom || '', n.nydCode, n.nydName, n.position || '', isActivityRoundMode(conditionType) ? n.recruitCount : value];
          if (includeIndividualNTD) row.push(n.ownFYP);
          if (expSecAFYP) row.push(sc.totalAFYP);
          if (expSecIP) row.push(sc.totalIP);
          row.push('', '', '', '', '', '', value, n.startDate ? formatDate(n.startDate) : '');
          if (showRateColumn) row.push(effectiveTier ? formatRate(effectiveTier) : '');
          row.push(effectiveTier ? formatBonusAmount(effectiveTier, value, n.recruitCount) : '', effectiveTier ? '' : (tier ? 'Chưa đạt ĐKB' : 'Chưa đạt mức'));
          rows.push(row);
          currentRow++;
        } else {
          const sortedContracts = [...contracts].sort((a, b) => b.pdt10DT - a.pdt10DT);
          sortedContracts.forEach((c, cIdx) => {
            const row: (string | number)[] = [
              cIdx === 0 ? nIdx + 1 : '',
              n.nhom || '',
              cIdx === 0 ? n.nydCode : '',
              cIdx === 0 ? n.nydName : '',
              cIdx === 0 ? (n.position || '') : '',
              cIdx === 0 ? (isActivityRoundMode(conditionType) ? n.recruitCount : value) : '',
            ];
            if (includeIndividualNTD) row.push(cIdx === 0 ? n.ownFYP : '');
            if (expSecAFYP) row.push(cIdx === 0 ? sc.totalAFYP : '');
            if (expSecIP) row.push(cIdx === 0 ? sc.totalIP : '');
            row.push(
              c.agentName || '',
              c.contractNumber || '',
              c.effectiveDate ? formatDate(c.effectiveDate) : '',
              c.issueDate ? formatDate(c.issueDate) : '',
              c.pdt10DT,
              c.afyp,
              cIdx === 0 ? value : '',
              c.ngayBatDauLamViec ? formatDate(c.ngayBatDauLamViec) : '',
            );
            if (showRateColumn) row.push(cIdx === 0 ? (effectiveTier ? formatRate(effectiveTier) : '') : '');
            row.push(cIdx === 0 ? (effectiveTier ? formatBonusAmount(effectiveTier, value, n.recruitCount) : '') : '');
            row.push(cIdx === 0 ? (effectiveTier ? '' : (tier ? 'Chưa đạt ĐKB' : 'Chưa đạt mức')) : '');
            rows.push(row);
            currentRow++;
          });
          // Merge cells for NTD-level columns
          if (sortedContracts.length > 1) {
            const endRow = currentRow - 1;
            const secOffset = (expSecAFYP ? 1 : 0) + (expSecIP ? 1 : 0);
            // STT col 0
            merges.push({ s: { r: startRow, c: 0 }, e: { r: endRow, c: 0 } });
            // Nhóm col 1
            merges.push({ s: { r: startRow, c: 1 }, e: { r: endRow, c: 1 } });
            // Mã ĐL col 2
            merges.push({ s: { r: startRow, c: 2 }, e: { r: endRow, c: 2 } });
            // Họ tên NTD col 3
            merges.push({ s: { r: startRow, c: 3 }, e: { r: endRow, c: 3 } });
            // Chức vụ col 4
            merges.push({ s: { r: startRow, c: 4 }, e: { r: endRow, c: 4 } });
            // Điều kiện col 5
            merges.push({ s: { r: startRow, c: 5 }, e: { r: endRow, c: 5 } });
            let mergeOffset = 0;
            if (includeIndividualNTD) { merges.push({ s: { r: startRow, c: 6 }, e: { r: endRow, c: 6 } }); mergeOffset = 1; }
            // Supplementary cols (6 + mergeOffset ... 6 + mergeOffset + secOffset - 1)
            for (let ci = 0; ci < secOffset; ci++) {
              merges.push({ s: { r: startRow, c: 6 + mergeOffset + ci }, e: { r: endRow, c: 6 + mergeOffset + ci } });
            }
            // Tổng cộng col (12 + mergeOffset + secOffset)
            const tongCol = 12 + mergeOffset + secOffset;
            merges.push({ s: { r: startRow, c: tongCol }, e: { r: endRow, c: tongCol } });
            // Ngày BĐLV col (13 + mergeOffset + secOffset)
            merges.push({ s: { r: startRow, c: 13 + mergeOffset + secOffset }, e: { r: endRow, c: 13 + mergeOffset + secOffset } });
            if (showRateColumn) {
              const rateCol = 14 + mergeOffset + secOffset;
              merges.push({ s: { r: startRow, c: rateCol }, e: { r: endRow, c: rateCol } });
              const thuongCol = 15 + mergeOffset + secOffset;
              merges.push({ s: { r: startRow, c: thuongCol }, e: { r: endRow, c: thuongCol } });
              const ghichuCol = 16 + mergeOffset + secOffset;
              merges.push({ s: { r: startRow, c: ghichuCol }, e: { r: endRow, c: ghichuCol } });
            } else {
              const thuongCol = 14 + mergeOffset + secOffset;
              merges.push({ s: { r: startRow, c: thuongCol }, e: { r: endRow, c: thuongCol } });
              const ghichuCol = 15 + mergeOffset + secOffset;
              merges.push({ s: { r: startRow, c: ghichuCol }, e: { r: endRow, c: ghichuCol } });
            }
          }
        }
      });
    } else if (targetType === 'nhom') {
      // NHÓM
      if (isTVVPassCountMode(conditionType)) {
        // Bảng đơn giản cho TVV đạt thi đua: STT - NHÓM - MÃ TN - HỌ TÊN TN - SL TVV đạt thi đua - THƯỞNG - GHI CHÚ
        const refContestLabel = referenceContestId ? (() => { const rc = savedContests.find(sc => sc.id === referenceContestId); return rc ? ` (${rc.title})` : ''; })() : '';
        const passCountCondLabel = conditionType === 'pass_count_ip_afyp'
          ? ` (IP≥${vndToNgan(passCountIPMin)}k + AFYP≥${vndToNgan(passCountAFYPMin)}k)`
          : refContestLabel || ' (CTĐK)';
        headers = ['STT', 'Nhóm', 'Mã TN', 'Họ tên TN', `SL TVV đủ điều kiện${passCountCondLabel}${!includeTNInPassCount ? ' (KO tính TN)' : ''}`, 'Thưởng', 'Ghi chú'];
        rows = [];
        const sortedGroups = [...groupedData].map((g) => {
          const tvvPassCount = conditionType === 'pass_count_ip_afyp' ? getGroupTVVPassCountIPAFYP(g) : getGroupTVVPassCount(g);
          const tier = calculateBonus(tvvPassCount).tier;
          return { g, tier, tvvPassCount };
        }).sort((a, b) => b.tvvPassCount - a.tvvPassCount);
        sortedGroups.forEach(({ g, tier, tvvPassCount }, gIdx) => {
          const sc = checkSecondaryTotalCondition(g.contracts || []);
          const effectiveTier = sc.passed ? tier : (secondaryTotalAFYPMin > 0 || secondaryTotalIPMin > 0 ? null : tier);
          const remaining = getRemainingToNextTier(tvvPassCount);
          const row: (string | number)[] = [
            gIdx + 1,
            g.nhom || '—',
            g.leader?.agentCode || '',
            g.leader?.agentName || '',
            tvvPassCount,
            effectiveTier ? formatBonusAmount(effectiveTier, 0, tvvPassCount) : '',
            !effectiveTier && remaining !== null ? `Cần thêm ${remaining} TVV` : !effectiveTier ? 'Chưa đạt' : '',
          ];
          rows.push(row);
        });
        merges = [];
      } else {
        // NHÓM: mở rộng mỗi nhóm thành nhiều dòng, mỗi dòng = 1 HĐ của TVV đóng góp
        const condHeader = isActivityRoundMode(conditionType) ? (conditionType === 'activity_round_standard' ? 'Lượt HĐ Chuẩn' : conditionType === 'activity_round_tvv90' ? 'Lượt HĐ TVV90' : 'Lượt HĐ') : conditionType === 'total_afyp' ? 'Tổng AFYP' : 'Tổng IP';
        if (usePhase2) {
          headers = ['STT', 'Nhóm', 'Mã TTN', 'Tên TTN', 'Chức vụ', condHeader, ...(expSecAFYP ? ['Tổng AFYP'] : []), ...(expSecIP ? ['Tổng IP'] : []), 'Họ tên TVV', 'Số hợp đồng', 'Ngày hiệu lực', 'Ngày phát hành', 'IP', 'AFYP', 'Tổng cộng', 'Thưởng GD1', 'Thưởng GD2', 'Tổng Thưởng', 'Ghi chú'];
        } else {
          headers = ['STT', 'Nhóm', 'Mã TTN', 'Tên TTN', 'Chức vụ', condHeader, ...(expSecAFYP ? ['Tổng AFYP'] : []), ...(expSecIP ? ['Tổng IP'] : []), 'Họ tên TVV', 'Số hợp đồng', 'Ngày hiệu lực', 'Ngày phát hành', 'IP', 'AFYP', 'Tổng cộng', ...(showRateColumn ? ['Tỷ lệ'] : []), 'Thưởng', 'Ghi chú'];
        }
        const secOffset = (expSecAFYP ? 1 : 0) + (expSecIP ? 1 : 0);
        rows = [];
        merges = [];
        let currentRow = 1;
        const sortedGroups = [...groupedData].map((g) => {
          const groupPhase = getGroupPhaseBonus(g);
          const tier = isActivityRoundMode(conditionType) ? calculateActivityRoundBonus(g.activityRounds).tier : calculateBonus(getGroupValue(g)).tier;
          return { g, tier, groupPhase };
        }).sort((a, b) => {
          const aValue = isActivityRoundMode(conditionType) ? a.g.activityRounds : a.g.totalFYP;
          const bValue = isActivityRoundMode(conditionType) ? b.g.activityRounds : b.g.totalFYP;
          return bValue - aValue;
        });
        sortedGroups.forEach(({ g, tier, groupPhase }, gIdx) => {
          const startRow = currentRow;
          const contracts = [...(g.contracts || [])].sort((a, b) => b.pdt10DT - a.pdt10DT);
          const condValue = isActivityRoundMode(conditionType) ? `${g.activityRounds} ${isStandardMode(conditionType) ? 'Lượt chuẩn' : 'Lượt'}` : g.totalFYP;
          // Check supplementary total condition
          const sc = checkSecondaryTotalCondition(g.contracts || []);
          const effectiveTier = sc.passed ? tier : (expSecAFYP || expSecIP ? null : tier);
          if (contracts.length === 0) {
            const row: (string | number)[] = [gIdx + 1, g.nhom || '—', g.leader?.agentCode || '', g.leader?.agentName || '', g.leader?.position || '', condValue];
            if (expSecAFYP) row.push(sc.totalAFYP);
            if (expSecIP) row.push(sc.totalIP);
            row.push('', '', '', '', '', g.totalFYP);
            if (usePhase2) {
              row.push(groupPhase.phase1Bonus || '', groupPhase.phase2Bonus || '', groupPhase.phase1Bonus + groupPhase.phase2Bonus || '', effectiveTier ? '' : (tier ? 'Chưa đạt ĐKB' : 'Chưa đạt mức'));
            } else {
              if (showRateColumn) row.push(effectiveTier ? formatRate(effectiveTier) : '');
              row.push(effectiveTier ? formatBonusAmount(effectiveTier, g.totalFYP, g.activityRounds) : '', effectiveTier ? '' : (tier ? 'Chưa đạt ĐKB' : 'Chưa đạt mức'));
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
                cIdx === 0 ? condValue : '',
              ];
              if (expSecAFYP) row.push(cIdx === 0 ? sc.totalAFYP : '');
              if (expSecIP) row.push(cIdx === 0 ? sc.totalIP : '');
              row.push(
                c.agentName || '',
                c.contractNumber || '',
                c.effectiveDate ? formatDate(c.effectiveDate) : '',
                c.issueDate ? formatDate(c.issueDate) : '',
                c.pdt10DT,
                c.afyp,
                cIdx === 0 ? g.totalFYP : '',
              );
              if (usePhase2) {
                row.push(
                  cIdx === 0 ? (groupPhase.phase1Bonus || '') : '',
                  cIdx === 0 ? (groupPhase.phase2Bonus || '') : '',
                  cIdx === 0 ? (groupPhase.phase1Bonus + groupPhase.phase2Bonus || '') : '',
                  cIdx === 0 ? (effectiveTier ? '' : (tier ? 'Chưa đạt ĐKB' : 'Chưa đạt mức')) : '',
                );
              } else {
                if (showRateColumn) row.push(cIdx === 0 ? (effectiveTier ? formatRate(effectiveTier) : '') : '');
                row.push(cIdx === 0 ? (effectiveTier ? formatBonusAmount(effectiveTier, g.totalFYP, g.activityRounds) : '') : '');
                row.push(cIdx === 0 ? (effectiveTier ? '' : (tier ? 'Chưa đạt ĐKB' : 'Chưa đạt mức')) : '');
              }
              rows.push(row);
              currentRow++;
            });
            // Merge cells cho nhóm
            if (contracts.length > 1) {
              const endRow = currentRow - 1;
              // STT, Nhóm, Mã TTN, Tên TTN, Chức vụ, condHeader
              for (let c = 0; c <= 5; c++) {
                merges.push({ s: { r: startRow, c }, e: { r: endRow, c } });
              }
              // Supplementary cols
              for (let ci = 0; ci < secOffset; ci++) {
                merges.push({ s: { r: startRow, c: 6 + ci }, e: { r: endRow, c: 6 + ci } });
              }
              // Tổng cộng col (12 + secOffset)
              merges.push({ s: { r: startRow, c: 12 + secOffset }, e: { r: endRow, c: 12 + secOffset } });
              if (usePhase2) {
                for (let c = 13 + secOffset; c <= 16 + secOffset; c++) {
                  merges.push({ s: { r: startRow, c }, e: { r: endRow, c } });
                }
              } else {
                if (showRateColumn) {
                  for (let c = 13 + secOffset; c <= 15 + secOffset; c++) {
                    merges.push({ s: { r: startRow, c }, e: { r: endRow, c } });
                  }
                } else {
                  for (let c = 13 + secOffset; c <= 14 + secOffset; c++) {
                    merges.push({ s: { r: startRow, c }, e: { r: endRow, c } });
                  }
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
          headers = ['STT', 'Nhóm', 'Mã ĐL', 'Họ tên', 'Số hợp đồng', 'Ngày hiệu lực', 'Ngày phát hành', mainColLabel, ...(useSecondaryCondition && secondaryAFYPMin > 0 && !isAFYP ? ['AFYP'] : []), ...(useSecondaryCondition && secondaryIPMin > 0 && isAFYP ? ['IP'] : []), ...(expSecAFYP ? ['Tổng AFYP'] : []), ...(expSecIP ? ['Tổng IP'] : []), 'Thưởng GD1', 'Thưởng GD2', 'Tổng Thưởng', 'Ghi chú'];
          rows = perContractDisplayContracts.map((c) => {
            const cValue = getContractValue(c);
            const { tier } = calculateBonus(cValue);
            const phaseInfo = getRowPhaseBonus(cValue, c.effectiveDate);
            // Check supplementary total for this TVV's contracts
            const agentContracts = displayContracts.filter(ac => ac.agentCode === c.agentCode);
            const sc = checkSecondaryTotalCondition(agentContracts);
            const effectiveTier = sc.passed ? tier : (expSecAFYP || expSecIP ? null : tier);
            return { c, cValue, tier, effectiveTier, phaseInfo, sc };
          }).sort((a, b) => b.cValue - a.cValue).map(({ c, cValue, tier, effectiveTier, phaseInfo, sc }, idx) => {
            const base: (string | number)[] = [idx + 1, c.nhom || '—', c.agentCode, c.agentName, c.contractNumber || '', formatDate(c.effectiveDate), formatDate(c.issueDate), cValue];
            if (useSecondaryCondition && secondaryAFYPMin > 0 && !isAFYP) base.push(c.afyp);
            if (useSecondaryCondition && secondaryIPMin > 0 && isAFYP) base.push(c.pdt10DT);
            if (expSecAFYP) base.push(sc.totalAFYP);
            if (expSecIP) base.push(sc.totalIP);
            base.push(phaseInfo.phase1Bonus || '', phaseInfo.phase2Bonus || '', phaseInfo.phase1Bonus + phaseInfo.phase2Bonus || '', effectiveTier ? '' : (tier ? 'Chưa đạt ĐKB' : 'Chưa đạt mức'));
            return base;
          });
        } else {
          headers = ['STT', 'Nhóm', 'Mã ĐL', 'Họ tên', 'Số hợp đồng', 'Ngày hiệu lực', 'Ngày phát hành', mainColLabel, ...(useSecondaryCondition && secondaryAFYPMin > 0 && !isAFYP ? ['AFYP'] : []), ...(useSecondaryCondition && secondaryIPMin > 0 && isAFYP ? ['IP'] : []), ...(expSecAFYP ? ['Tổng AFYP'] : []), ...(expSecIP ? ['Tổng IP'] : []), ...(showRateColumn ? ['Tỷ lệ'] : []), 'Thưởng', 'Ghi chú'];
          rows = perContractDisplayContracts.map((c) => {
            const cValue = getContractValue(c);
            const { tier } = calculateBonus(cValue);
            const agentContracts = displayContracts.filter(ac => ac.agentCode === c.agentCode);
            const sc = checkSecondaryTotalCondition(agentContracts);
            const effectiveTier = sc.passed ? tier : (expSecAFYP || expSecIP ? null : tier);
            return { c, cValue, tier, effectiveTier, sc };
          }).sort((a, b) => b.cValue - a.cValue).map(({ c, cValue, tier, effectiveTier, sc }, idx) => {
            const base: (string | number)[] = [idx + 1, c.nhom || '—', c.agentCode, c.agentName, c.contractNumber || '', formatDate(c.effectiveDate), formatDate(c.issueDate), cValue];
            if (useSecondaryCondition && secondaryAFYPMin > 0 && !isAFYP) base.push(c.afyp);
            if (useSecondaryCondition && secondaryIPMin > 0 && isAFYP) base.push(c.pdt10DT);
            if (expSecAFYP) base.push(sc.totalAFYP);
            if (expSecIP) base.push(sc.totalIP);
            if (showRateColumn) base.push(effectiveTier ? formatRate(effectiveTier) : '');
            base.push(effectiveTier ? formatBonusAmount(effectiveTier, cValue) : '');
            base.push(effectiveTier ? '' : (tier ? 'Chưa đạt ĐKB' : 'Chưa đạt mức'));
            return base;
          });
        }
      } else {
        // total_ip / total_afyp / top_n_ip: thêm cột Tổng (gộp ô tất cả dòng)
        const isAFYP = conditionType === 'total_afyp';
        const isTopNExp = isTopNMode(conditionType);
        const sttLabel = isTopNExp ? 'Hạng' : 'STT';
        if (usePhase2) {
          headers = [sttLabel, 'Nhóm', 'Mã ĐL', 'Họ tên', isAFYP ? 'Tổng AFYP' : 'Tổng IP', ...(expSecAFYP && !isAFYP ? ['Tổng AFYP'] : []), ...(expSecIP && conditionType !== 'total_ip' ? ['Tổng IP'] : []), 'Tổng', 'Thưởng GD1', 'Thưởng GD2', 'Tổng Thưởng', 'Ghi chú'];
          const grandTotal = tvvTotalRows.reduce((sum, r) => sum + r.value, 0);
          const secOffset = (expSecAFYP && !isAFYP ? 1 : 0) + (expSecIP && conditionType !== 'total_ip' ? 1 : 0);
          rows = tvvTotalRows.map(({ agent, value, tier, phaseInfo }, idx) => {
            // Check supplementary total condition for this TVV
            const agentContracts = displayContracts.filter(c => c.agentCode === agent.agentCode);
            const sc = checkSecondaryTotalCondition(agentContracts);
            const effectiveTier = sc.passed ? tier : (expSecAFYP || expSecIP ? null : tier);
            const row: (string | number)[] = [idx + 1, agent.nhom || '—', agent.agentCode, agent.agentName, value];
            if (expSecAFYP && !isAFYP) row.push(sc.totalAFYP);
            if (expSecIP && conditionType !== 'total_ip') row.push(sc.totalIP);
            row.push(idx === 0 ? grandTotal : '');
            row.push(phaseInfo.phase1Bonus || '', phaseInfo.phase2Bonus || '', phaseInfo.phase1Bonus + phaseInfo.phase2Bonus || '', effectiveTier ? '' : (tier ? 'Chưa đạt ĐKB' : 'Chưa đạt mức'));
            return row;
          });
          if (tvvTotalRows.length > 1) {
            merges.push({ s: { r: 1, c: 5 + secOffset }, e: { r: tvvTotalRows.length, c: 5 + secOffset } });
          }
        } else {
          headers = [sttLabel, 'Nhóm', 'Mã ĐL', 'Họ tên', isAFYP ? 'Tổng AFYP' : 'Tổng IP', ...(expSecAFYP && !isAFYP ? ['Tổng AFYP'] : []), ...(expSecIP && conditionType !== 'total_ip' ? ['Tổng IP'] : []), 'Tổng', ...(showRateColumn ? ['Tỷ lệ'] : []), 'Thưởng', 'Ghi chú'];
          const grandTotal = tvvTotalRows.reduce((sum, r) => sum + r.value, 0);
          const secOffset = (expSecAFYP && !isAFYP ? 1 : 0) + (expSecIP && conditionType !== 'total_ip' ? 1 : 0);
          rows = tvvTotalRows.map(({ agent, value, tier }, idx) => {
            const agentContracts = displayContracts.filter(c => c.agentCode === agent.agentCode);
            const sc = checkSecondaryTotalCondition(agentContracts);
            const effectiveTier = sc.passed ? tier : (expSecAFYP || expSecIP ? null : tier);
            const row: (string | number)[] = [idx + 1, agent.nhom || '—', agent.agentCode, agent.agentName, value];
            if (expSecAFYP && !isAFYP) row.push(sc.totalAFYP);
            if (expSecIP && conditionType !== 'total_ip') row.push(sc.totalIP);
            row.push(idx === 0 ? grandTotal : '');
            if (showRateColumn) row.push(effectiveTier ? formatRate(effectiveTier) : '');
            row.push(effectiveTier ? formatBonusAmount(effectiveTier, value) : '');
            row.push(effectiveTier ? '' : (tier ? 'Chưa đạt ĐKB' : 'Chưa đạt mức'));
            return row;
          });
          if (tvvTotalRows.length > 1) {
            merges.push({ s: { r: 1, c: 5 + secOffset }, e: { r: tvvTotalRows.length, c: 5 + secOffset } });
          }
        }
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
      const needMerge = targetType === 'nhom' || targetType === 'nyd' || (targetType === 'tvv' && isTotalMode(conditionType));

      // Helper: compute bonus for a group of contracts (same key = same TVV / same nhóm / same NTD)
      const getBonusForGroup = (groupKey: string): string => {
        if (targetType === 'nhom') {
          const g = groupedData.find(g => g.maNhom === groupKey);
          if (!g) return '';
          const value = isActivityRoundMode(conditionType) ? g.activityRounds : g.totalFYP;
          const { tier } = isActivityRoundMode(conditionType) ? calculateActivityRoundBonus(value) : calculateBonus(value);
          // Check supplementary condition
          const sc = checkSecondaryTotalCondition(g.contracts || []);
          const effectiveTier = sc.passed ? tier : (expSecAFYP || expSecIP ? null : tier);
          return effectiveTier ? formatBonusAmount(effectiveTier, g.totalFYP, g.activityRounds) : '';
        }
        if (targetType === 'nyd') {
          const n = nydData.find(n => n.nydCode === groupKey);
          if (!n) return '';
          const value = isActivityRoundMode(conditionType) ? n.recruitCount : (n.recruitFYP + (includeIndividualNTD ? n.ownFYP : 0));
          const { tier } = calculateBonus(value);
          const nydContracts = n.contracts || displayContracts.filter(c => c.maDaiLyTD === n.nydCode);
          const sc = checkSecondaryTotalCondition(nydContracts);
          const effectiveTier = sc.passed ? tier : (expSecAFYP || expSecIP ? null : tier);
          return effectiveTier ? formatBonusAmount(effectiveTier, value, n.recruitCount) : '';
        }
        // TVV total mode
        if (targetType === 'tvv' && isTotalMode(conditionType)) {
          const tr = tvvTotalRows.find(r => r.agent.agentCode === groupKey);
          if (!tr) return '';
          const agentContracts = displayContracts.filter(c => c.agentCode === groupKey);
          const sc = checkSecondaryTotalCondition(agentContracts);
          const effectiveTier = sc.passed ? tr.tier : (expSecAFYP || expSecIP ? null : tr.tier);
          return effectiveTier ? formatBonusAmount(effectiveTier, tr.value) : '';
        }
        return '';
      };

      // Build rows: each contract gets its own row, but THƯỞNG is only shown on first row of group
      type DetailRow = { data: (string | number)[]; groupKey: string };
      const detailRowData: DetailRow[] = displayContracts.map((c) => {
        let groupKey = '';
        let bonusValue: string | number = '';
        if (needMerge) {
          if (targetType === 'nhom') {
            groupKey = c.maNhom || '';
          } else if (targetType === 'nyd') {
            groupKey = c.maDaiLyTD || c.recruiterCode || '';
          } else if (targetType === 'tvv' && isTotalMode(conditionType)) {
            groupKey = c.agentCode || '';
          }
        } else {
          // TVV per_contract: each contract has its own bonus
          const cValue = getContractValue(c);
          const { tier } = calculateBonus(cValue);
          const agentContracts = displayContracts.filter(ac => ac.agentCode === c.agentCode);
          const sc = checkSecondaryTotalCondition(agentContracts);
          const effectiveTier = sc.passed ? tier : (expSecAFYP || expSecIP ? null : tier);
          bonusValue = effectiveTier ? formatBonusAmount(effectiveTier, cValue) : '';
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
            c.ngayBatDauLamViec ? formatDate(c.ngayBatDauLamViec) : '',
            ...(includeEligibilityDateColumns ? [recruiterEffectiveDateFor(c.maDaiLyTD || c.recruiterCode || '')] : []),
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
      const { toBlob } = await import('html-to-image');
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
        captureRoot.style.cssText = 'position:fixed;left:-100000px;top:0;pointer-events:none;background:#fff;';

        const sourcePrintContent = el.firstElementChild;
        if (!sourcePrintContent) throw new Error('Không tìm thấy nội dung kết quả');

        // Build the table clone from its shell instead of cloneNode(true) on
        // the whole result. This keeps even the cloning step bounded to 20 rows.
        const clone = el.cloneNode(false) as HTMLDivElement;
        clone.style.width = 'fit-content';
        clone.style.overflow = 'hidden';
        const endRow = startRow + MAX_ROWS_PER_IMAGE;

        const printClone = sourcePrintContent.cloneNode(false) as HTMLElement;
        Array.from(sourcePrintContent.children).forEach((child) => {
          if (child.id !== 'result-table-container') {
            printClone.appendChild(child.cloneNode(true));
            return;
          }

          const tableContainerClone = child.cloneNode(false) as HTMLElement;
          const sourceTable = child.querySelector('table');
          if (!sourceTable) {
            printClone.appendChild(child.cloneNode(true));
            return;
          }

          const tableClone = sourceTable.cloneNode(false) as HTMLTableElement;
          Array.from(sourceTable.children).forEach((section) => {
            if (section.tagName !== 'TBODY') {
              tableClone.appendChild(section.cloneNode(true));
              return;
            }

            const bodyClone = section.cloneNode(false) as HTMLTableSectionElement;
            Array.from(section.children)
              .slice(startRow, endRow)
              .forEach(row => bodyClone.appendChild(row.cloneNode(true)));
            tableClone.appendChild(bodyClone);
          });
          tableContainerClone.appendChild(tableClone);
          printClone.appendChild(tableContainerClone);
        });
        clone.appendChild(printClone);

        captureRoot.appendChild(clone);
        document.body.appendChild(captureRoot);
        try {
          // Give the clone one paint frame so fonts, images and table width settle.
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
          return await toBlob(clone, {
            quality: 1,
            pixelRatio: 2,
            backgroundColor: '#ffffff',
          });
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
      blobs.forEach((blob, index) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = blobs.length === 1
          ? `ket_qua_thi_dua_${dateStr}.png`
          : `ket_qua_thi_dua_${index + 1}_${dateStr}.png`;
        link.href = url;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      });

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

  // Share image function - capture result as image and share via Web Share API
  const handleShareImage = async () => {
    setIsDownloadingImage(true);
    try {
      const { toBlob } = await import('html-to-image');
      if (!resultContentRef.current) {
        toast({ title: 'Lỗi', description: 'Không có nội dung để chia sẻ', variant: 'destructive' });
        return;
      }
      // Temporarily set width to fit-content for tight capture (no white side borders)
      const el = resultContentRef.current;
      const origWidth = el.style.width;
      const origOverflow = el.style.overflow;
      el.style.width = 'fit-content';
      el.style.overflow = 'hidden';
      hideAllScrollbars();
      const blob = await toBlob(el, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: '#ffffff',
      });
      el.style.width = origWidth;
      el.style.overflow = origOverflow;
      restoreAllScrollbars();
      if (!blob) {
        toast({ title: 'Lỗi', description: 'Không thể tạo ảnh', variant: 'destructive' });
        return;
      }
      const file = new File([blob], `ket_qua_thi_dua_${new Date().toISOString().slice(0, 10)}.png`, { type: 'image/png' });

      // Try Web Share API first (mobile-friendly)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: contestTitle || 'Kết quả thi đua',
          text: `${contestTitle} — Từ ${startDate ? formatDate(startDate) : '...'} đến ${endDate ? formatDate(endDate) : '...'}`,
          files: [file],
        });
        toast({ title: 'Thành công', description: 'Đã chia sẻ ảnh' });
      } else {
        // Fallback: download the image
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `ket_qua_thi_dua_${new Date().toISOString().slice(0, 10)}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: 'Thành công', description: 'Đã tải ảnh xuống (trình duyệt không hỗ trợ chia sẻ)' });
      }
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return; // User cancelled share
      console.error('Share image error:', error);
      toast({ title: 'Lỗi', description: 'Không thể chia sẻ ảnh', variant: 'destructive' });
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
      tvvAchievedCount = tvvTotalRows.filter(r => r.tier).length;
      tvvTotalBonus = tvvTotalRows.reduce((sum, r) => {
        if (!r.tier) return sum;
        return sum + computeBonusFromTier(r.tier, r.value, isActivityRoundMode(conditionType) ? r.value : undefined);
      }, 0);
    } else {
      const contractValue = (c: Contract) => conditionType === 'per_contract_afyp' ? c.afyp : c.pdt10DT;
      tvvAchievedCount = perContractDisplayContracts.filter(c => calculateBonus(contractValue(c)).tier).length;
      tvvTotalBonus = perContractDisplayContracts.reduce((sum, c) => sum + getBonusAmount(contractValue(c)), 0);
    }

    // Nhóm stats
    const nhomAchievedCount = groupedData.filter(g => {
      if (isTVVPassCountMode(conditionType)) return calculateBonus(conditionType === 'pass_count_ip_afyp' ? getGroupTVVPassCountIPAFYP(g) : getGroupTVVPassCount(g)).tier;
      if (isActivityRoundMode(conditionType)) return calculateActivityRoundBonus(g.activityRounds).tier;
      return calculateBonus(getGroupValue(g)).tier;
    }).length;
    const nhomTotalFYP = groupedData.reduce((sum, g) => sum + g.totalFYP, 0);
    const nhomTotalBonus = groupedData.reduce((sum, g) => {
      if (isTVVPassCountMode(conditionType)) {
        const passCount = conditionType === 'pass_count_ip_afyp' ? getGroupTVVPassCountIPAFYP(g) : getGroupTVVPassCount(g);
        return sum + getBonusAmount(passCount, passCount);
      }
      if (isActivityRoundMode(conditionType)) return sum + getActivityRoundBonusAmount(g.activityRounds, g.totalFYP);
      return sum + getBonusAmount(g.totalFYP);
    }, 0);

    // Activity round stats
    const arAchievedCount = isActivityRoundMode(conditionType) ? groupedData.filter(g => calculateActivityRoundBonus(g.activityRounds).tier).length : 0;
    const arNotAchievedCount = isActivityRoundMode(conditionType) ? groupedData.length - arAchievedCount : 0;
    const arTotalBonus = isActivityRoundMode(conditionType) ? groupedData.reduce((sum, g) => sum + getActivityRoundBonusAmount(g.activityRounds, g.totalFYP), 0) : 0;

    // NYD stats
    const nydAchievedCount = targetType === 'nyd' ? nydData.filter(n => {
      const value = isActivityRoundMode(conditionType) ? n.recruitCount : (n.recruitFYP + (includeIndividualNTD ? n.ownFYP : 0));
      return calculateBonus(value).tier;
    }).length : 0;
    const nydNotAchievedCount = targetType === 'nyd' ? nydData.length - nydAchievedCount : 0;
    const nydTotalBonus = targetType === 'nyd' ? nydData.reduce((sum, n) => {
      const value = isActivityRoundMode(conditionType) ? n.recruitCount : (n.recruitFYP + (includeIndividualNTD ? n.ownFYP : 0));
      const { tier } = calculateBonus(value);
      if (!tier) return sum;
      return sum + computeBonusFromTier(tier, value, n.recruitCount);
    }, 0) : 0;

    const tvvAgentCount = targetType === 'tvv'
      ? (isPerContractMode(conditionType) ? perContractDisplayContracts.length : tvvTotalRows.length)
      : displayContracts.length;
    const achievedCount = targetType === 'nyd'
      ? nydAchievedCount
      : targetType === 'nhom'
      ? (isActivityRoundMode(conditionType) ? arAchievedCount : nhomAchievedCount)
      : tvvAchievedCount;
    const notAchievedCount = targetType === 'nyd'
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
  }, [displayContracts, perContractDisplayContracts, groupedData, nydData, tvvTotalRows, conditionType, targetType, includeIndividualTN, includeIndividualNTD, usePhase2, phase2Results, calculateBonus, getBonusAmount, calculateActivityRoundBonus, getActivityRoundBonusAmount, getRemainingToNextTier, computeBonusFromTier]);

  const { totalFYP, tvvAchievedCount, tvvTotalBonus, nhomAchievedCount, nhomTotalFYP, nhomTotalBonus, arAchievedCount, arNotAchievedCount, arTotalBonus, nydAchievedCount, nydNotAchievedCount, nydTotalBonus, achievedCount, notAchievedCount, baseTotalBonus, totalBonusDisplay, displayTotalFYP, totalFYPValue, totalValue, matchedTotalTier, totalRemaining } = stats;

  const sortedTiers = useMemo(() => [...bonusTiers].sort((a, b) => a.minFYP - b.minFYP), [bonusTiers]);
  const showRateColumn = useMemo(() => hasPercentBonus(bonusTiers), [bonusTiers]);

  // Có hiển thị cột điều kiện bổ sung Tổng AFYP/Tổng IP trong bảng kết quả không?
  const showSecondaryTotalColumn = useSecondaryCondition && (secondaryTotalAFYPMin > 0 || secondaryTotalIPMin > 0);
  // Có hiển thị cột điều kiện bổ sung per-contract (AFYP/IP tối thiểu mỗi HĐ) không?
  const showSecondaryPerContractColumn = useSecondaryCondition && (secondaryAFYPMin > 0 || secondaryIPMin > 0);
  const isAFYP = conditionType === 'per_contract_afyp' || conditionType === 'total_afyp';

  // Calculate and show results popup
  const handleCalculate = () => {
    if (!startDate && !endDate && !issueStartDate && !issueEndDate) { toast({ title: 'Thông báo', description: 'Vui lòng nhập ít nhất một khoảng thời gian' }); return; }
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
    if (results.length === 0 && subjectCodes.length === 0) {
      setFilteredContracts([]);
      toast({ title: 'Thông báo', description: 'Không tìm thấy hợp đồng nào phù hợp' });
      return;
    }
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
  const getRowPhaseBonus = useCallback((fyp: number, effectiveDate?: string): { phase1Bonus: number; phase2Bonus: number; phase1Tier: BonusTier | null; phase2Tier: BonusTier | null } => {
    if (!usePhase2 || !phase2StartDate) {
      const { tier } = calculateBonus(fyp);
      const bonus = tier ? computeBonusFromTier(tier, fyp) : 0;
      return { phase1Bonus: bonus, phase2Bonus: 0, phase1Tier: tier, phase2Tier: null };
    }
    const p2Start = new Date(phase2StartDate);
    const isPhase1 = effectiveDate ? new Date(effectiveDate) < p2Start : true;
    if (isPhase1) {
      const { tier } = calculateBonusWithTiers(fyp, bonusTiers);
      const bonus = tier ? computeBonusFromTier(tier, fyp) : 0;
      return { phase1Bonus: bonus, phase2Bonus: 0, phase1Tier: tier, phase2Tier: null };
    } else {
      const { tier } = calculateBonusWithTiers(fyp, bonusTiers2);
      const bonus = tier ? computeBonusFromTier(tier, fyp) : 0;
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
        const { tier } = calculateBonus(group.totalFYP);
        const bonus = tier ? computeBonusFromTier(tier, group.totalFYP) : 0;
        return { phase1Bonus: bonus, phase2Bonus: 0, phase1Tier: tier, phase2Tier: null };
      }
    }
    const p2Start = new Date(phase2StartDate);
    const phase1Contracts = group.contracts.filter(c => new Date(c.effectiveDate) < p2Start);
    const phase2Contracts = group.contracts.filter(c => new Date(c.effectiveDate) >= p2Start);

    let phase1Bonus = 0;
    let phase2Bonus = 0;
    let phase1Tier: BonusTier | null = null;
    let phase2Tier: BonusTier | null = null;

    if (isActivityRoundMode(conditionType)) {
      const luotThreshold = isStandardMode(conditionType) ? luotHDCTThreshold : luotHDThreshold;
      const applyTVV90 = conditionType === 'activity_round_tvv90';
      const p1Rounds = calculateLuotWithStructure(phase1Contracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
      const p1FYP = phase1Contracts.reduce((s, c) => s + c.pdt10DT, 0);
      const p1Res = calculateActivityRoundBonusWithTiers(p1Rounds, bonusTiers);
      phase1Tier = p1Res.tier;
      if (p1Res.tier) phase1Bonus = computeBonusFromTier(p1Res.tier, p1FYP, p1Rounds);

      const p2Rounds = calculateLuotWithStructure(phase2Contracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
      const p2FYP = phase2Contracts.reduce((s, c) => s + c.pdt10DT, 0);
      const p2Res = calculateActivityRoundBonusWithTiers(p2Rounds, bonusTiers2);
      phase2Tier = p2Res.tier;
      if (p2Res.tier) phase2Bonus = computeBonusFromTier(p2Res.tier, p2FYP, p2Rounds);
    } else {
      const p1Total = phase1Contracts.reduce((s, c) => s + c.pdt10DT, 0);
      const p1Res = calculateBonusWithTiers(p1Total, bonusTiers);
      phase1Tier = p1Res.tier;
      if (p1Res.tier) phase1Bonus = computeBonusFromTier(p1Res.tier, p1Total);

      const p2Total = phase2Contracts.reduce((s, c) => s + c.pdt10DT, 0);
      const p2Res = calculateBonusWithTiers(p2Total, bonusTiers2);
      phase2Tier = p2Res.tier;
      if (p2Res.tier) phase2Bonus = computeBonusFromTier(p2Res.tier, p2Total);
    }

    return { phase1Bonus, phase2Bonus, phase1Tier, phase2Tier };
  }, [usePhase2, phase2StartDate, conditionType, calculateBonus, calculateBonusWithTiers, calculateActivityRoundBonus, calculateActivityRoundBonusWithTiers, bonusTiers, bonusTiers2, isTVVmMode(conditionType), conditionType === 'activity_round_tvv90', luotHDThreshold, luotHDCTThreshold, tvv90MaxMonths, tvv90MinIP]);

  // Build NYD result rows
  const nydResultRows = useMemo(() => {
    if (targetType !== 'nyd') return [];
    return nydData.map(n => {
      const value = isActivityRoundMode(conditionType) ? n.recruitCount : (n.recruitFYP + (includeIndividualNTD ? n.ownFYP : 0));
      const { tier, tierIndex } = calculateBonus(value);
      return { nyd: n, tier, tierIndex, value };
    }).sort((a, b) => b.value - a.value);
  }, [nydData, conditionType, includeIndividualNTD, calculateBonus]);

  return (
    <div className={`min-h-screen ${isEmbedMode ? 'embed-mode bg-white' : ''}`}>

      {/* Data loaded indicator - top right corner (hidden in embed mode) */}
      {!isEmbedMode && dataLoadedVisible && (
        <div className="fixed top-2 right-2 z-[999] flex items-center gap-1.5 bg-emerald-500/90 text-white px-3 py-1.5 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2 duration-300" style={{ backdropFilter: 'blur(8px)' }}>
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-bold">{dataLoadedCount} HĐ đã tải</span>
        </div>
      )}

      {/* Header (hidden in embed mode) */}
      {!isEmbedMode && (
      <header className="border-b border-emerald-500/20 bg-[#0e0e18]/80 backdrop-blur-md sticky top-0 z-50">
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
      <main className="max-w-5xl mx-auto px-3 py-4 space-y-4 relative page-transition">
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
                  <PopoverContent className="w-[220px] p-1 bg-[#1a1a2e] border-emerald-500/20" align="end">
                    {savedContests.length === 0 ? (
                      <div className="text-xs text-emerald-300/70 text-center py-2">Chưa có chương trình nào</div>
                    ) : savedContests.map((sc) => (
                      <div key={sc.id} className="flex items-center gap-1 group">
                        <button
                          className="flex-1 text-left text-xs text-white/80 hover:text-white hover:bg-emerald-600 rounded px-2 py-1.5 truncate transition-colors"
                          onClick={() => { handleLoadContest(sc.id); setContestListOpen(false); }}
                        >
                          {sc.title}
                        </button>
                        {deleteConfirmId === sc.id ? (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleDeleteContest(sc.id)}>
                              <CheckCircle2 className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-emerald-300/70 hover:text-emerald-200/70 hover:bg-gray-800" onClick={() => setDeleteConfirmId(null)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-white/20 hover:text-red-400 hover:bg-red-500/10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setDeleteConfirmId(sc.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
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
                    { key: 'ntd', label: 'NTD', desc: 'TN + TTN', count: subjectLists.ntd.length, icon: UserPlus },
                  ]).map(option => {
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
                  {phongStructList.slice(0, 3).map((phong, index) => {
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

              <Separator className="bg-emerald-500/20" />

              {/* 2. Hình thức thi đua - quyết định cách tổng hợp kết quả */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-emerald-200">Hình thức thi đua</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setTargetType('tvv'); if (conditionType === 'tvv_pass_count') setConditionType('total_ip'); }}
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
                    onClick={() => { setTargetType('nyd'); if (conditionType === 'tvv_pass_count') setConditionType('activity_round_standard'); }}
                    disabled={false}
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer ${
                      targetType === 'nyd'
                        ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30 ring-2 ring-violet-300/50'
                        : 'bg-violet-500/20 text-violet-300/60 hover:bg-violet-500/20 hover:text-violet-200'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>NTD</span>
                  </button>
                </div>
                <p className="text-[10px] text-emerald-400/50 italic">
                  {targetType === 'tvv' ? 'Ánh xạ theo mã TVV' : targetType === 'nhom' ? 'Ánh xạ theo tên/mã nhóm' : 'Ánh xạ theo mã đại lý tuyển dụng'}
                </p>
              </div>

              <Separator className="bg-emerald-500/20" />

              {/* 3. Điều kiện thi đua */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-emerald-200">Điều kiện thi đua</Label>
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
                {/* Lượt HĐ - with sub-options and configurable threshold */}
                <div className="space-y-1.5">
                  <p className="text-[10px] text-emerald-300/70 font-medium uppercase tracking-wider">Lượt hoạt động</p>
                  <button type="button" onClick={() => setConditionType(conditionType === 'activity_round_tvvm' ? 'activity_round_tvvm' : 'activity_round')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer w-full ${conditionType === 'activity_round' || conditionType === 'activity_round_tvvm' ? 'bg-amber-600 text-white shadow-lg brightness-110 ring-2 ring-white/30' : 'bg-amber-600/50 text-emerald-200 hover:brightness-110 hover:text-white/90'}`}
                  ><Users className="w-3 h-3 shrink-0" /><span>Lượt HĐ</span><span className="text-[9px] opacity-60">(IP≥{vndToNgan(luotHDThreshold)}kđ/tháng)</span></button>
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
                  ><Award className="w-3 h-3 shrink-0" /><span>Lượt HĐ Chuẩn</span><span className="text-[9px] opacity-60">(IP≥{vndToNgan(luotHDCTThreshold)}kđ/tháng)</span></button>
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
                  ><Users className="w-3 h-3 shrink-0" /><span>Lượt TVV90</span><span className="text-[9px] opacity-60">(≤{tvv90MaxMonths}t + IP≥{vndToNgan(tvv90MinIP)}kđ)</span></button>
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
                {/* Đếm TVV đạt CTĐK - reference another saved contest */}
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
                            {savedContests.filter(sc => sc.targetType === 'tvv' && sc.conditionType !== 'tvv_pass_count').length === 0 ? (
                              <div className="px-3 py-2 text-xs text-gray-400">Chưa có CTĐK cho TVV</div>
                            ) : savedContests.filter(sc => sc.targetType === 'tvv' && sc.conditionType !== 'tvv_pass_count').map(sc => (
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
                {/* Xét Top N IP cao nhất - ranking-based reward */}
                <div className="space-y-1.5">
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
                            className="h-6 w-full text-xs border border-rose-500/30 bg-gray-800 text-white rounded px-1"
                          >
                            <option value="ip">IP (PĐT + 10% ĐT)</option>
                            <option value="afyp">AFYP</option>
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
                </div>
              </div>

              <Separator className="bg-emerald-500/20" />

              {/* Bonus Tiers - Phase 1 */}
              <BonusTierEditor
                tiers={bonusTiers}
                conditionType={conditionType}
                onUpdate={updateBonusTier}
                onAdd={addBonusTier}
                onRemove={removeBonusTier}
                title={usePhase2 ? 'Bảng mức thưởng - Giai đoạn 1' : 'Bảng mức thưởng'}
              />

              {/* Phase 2 Section */}
              <Separator className="bg-emerald-500/20" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="usePhase2" checked={usePhase2} onCheckedChange={(v) => setUsePhase2(!!v)} />
                  <Label htmlFor="usePhase2" className="text-xs font-medium text-emerald-200 flex items-center gap-1 cursor-pointer">
                    <Layers className="w-3.5 h-3.5 text-sky-400" /> Chia 2 giai đoạn
                  </Label>
                </div>
                {usePhase2 && (
                  <div className="space-y-2 pl-4 border-l-2 border-sky-500/20">
                    <div className="grid grid-cols-2 gap-2">
                      <NeonDatePicker label="GĐ2 Hiệu lực từ" value={phase2StartDate} onChange={setPhase2StartDate} accentColor="sky" />
                      <NeonDatePicker label="GĐ2 Hiệu lực đến" value={phase2EndDate} onChange={setPhase2EndDate} accentColor="sky" />
                    </div>
                    <BonusTierEditor
                      tiers={bonusTiers2}
                      conditionType={conditionType}
                      onUpdate={updateBonusTier2}
                      onAdd={addBonusTier2}
                      onRemove={removeBonusTier2}
                      title="Bảng mức thưởng - Giai đoạn 2"
                      accentColor="sky"
                    />
                  </div>
                )}
              </div>

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
                    {/* Lọc theo hợp đồng — chỉ giữ lại HĐ đạt điều kiện */}
                    <div className="text-[10px] text-orange-400/50 font-medium uppercase tracking-wider">Lọc hợp đồng</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><Label className="text-[10px] text-orange-400/70">AFYP/HĐ từ (nđ)</Label><Input type="number" placeholder="0" value={secondaryAFYPMin ? vndToNgan(secondaryAFYPMin) : ''} onChange={(e) => setSecondaryAFYPMin(nganToVnd(parseFloat(e.target.value) || 0))} className="h-7 text-xs border-orange-500/30 bg-gray-800 text-white" /></div>
                      <div className="space-y-1"><Label className="text-[10px] text-orange-400/70">IP/HĐ từ (nđ)</Label><Input type="number" placeholder="0" value={secondaryIPMin ? vndToNgan(secondaryIPMin) : ''} onChange={(e) => setSecondaryIPMin(nganToVnd(parseFloat(e.target.value) || 0))} className="h-7 text-xs border-orange-500/30 bg-gray-800 text-white" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-orange-400/70">Lượt HĐ từ</Label>
                        <Input type="number" placeholder="0" value={secondaryLuotHDMin || ''} onChange={(e) => setSecondaryLuotHDMin(parseInt(e.target.value) || 0)} className="h-7 text-xs border-orange-500/30 bg-gray-800 text-white" />
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setSecondaryLuotHDFilter('all')} className={`text-[9px] px-2 py-0.5 rounded-full ${secondaryLuotHDFilter === 'all' ? 'bg-orange-500/60 text-white' : 'bg-gray-800/50 text-emerald-300/70'}`}>Tất cả</button>
                          <button type="button" onClick={() => setSecondaryLuotHDFilter('tvvm')} className={`text-[9px] px-2 py-0.5 rounded-full ${secondaryLuotHDFilter === 'tvvm' ? 'bg-orange-500/60 text-white' : 'bg-gray-800/50 text-emerald-300/70'}`}>TVVm</button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-orange-400/70">Lượt HĐC từ</Label>
                        <Input type="number" placeholder="0" value={secondaryLuotHDCMin || ''} onChange={(e) => setSecondaryLuotHDCMin(parseInt(e.target.value) || 0)} className="h-7 text-xs border-orange-500/30 bg-gray-800 text-white" />
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setSecondaryLuotHDCFilter('all')} className={`text-[9px] px-2 py-0.5 rounded-full ${secondaryLuotHDCFilter === 'all' ? 'bg-orange-500/60 text-white' : 'bg-gray-800/50 text-emerald-300/70'}`}>Tất cả</button>
                          <button type="button" onClick={() => setSecondaryLuotHDCFilter('tvvm')} className={`text-[9px] px-2 py-0.5 rounded-full ${secondaryLuotHDCFilter === 'tvvm' ? 'bg-orange-500/60 text-white' : 'bg-gray-800/50 text-emerald-300/70'}`}>TVVm</button>
                        </div>
                      </div>
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

              {/* Tùy chọn */}
              <Separator className="bg-emerald-500/20" />
              <div className="space-y-2">
                <Label className="text-xs font-medium text-emerald-200">Tùy chọn</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Hide not achieved */}
                  <div className="flex items-center gap-2 p-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10">
                    <Checkbox id="hideNotAchieved" checked={hideNotAchieved} onCheckedChange={(v) => setHideNotAchieved(!!v)} />
                    <Label htmlFor="hideNotAchieved" className="text-xs text-emerald-200/70 cursor-pointer flex items-center gap-1">
                      <EyeOff className="w-3 h-3 text-gray-400" /> Ẩn chưa đạt mức
                    </Label>
                  </div>
                  {/* Include Individual NTD - for nhóm and NTD targets */}
                  {targetType === 'nyd' && (
                    <div className="flex items-center gap-2 p-2 rounded-lg border border-violet-500/30 bg-emerald-500/10">
                      <Checkbox id="includeIndividualNTD" checked={includeIndividualNTD} onCheckedChange={(v) => setIncludeIndividualNTD(!!v)} />
                      <Label htmlFor="includeIndividualNTD" className="text-xs text-emerald-200/70 cursor-pointer flex items-center gap-1">
                        <UserPlus className="w-3 h-3 text-violet-400" /> Tính cá nhân NTD vào chương trình
                      </Label>
                    </div>
                  )}
                  {/* Include Individual TN - for nhóm and NTD targets */}
                  {targetType === 'nhom' && (
                    <div className="flex items-center gap-2 p-2 rounded-lg border border-sky-500/30 bg-emerald-500/10">
                      <Checkbox id="includeIndividualTN" checked={includeIndividualTN} onCheckedChange={(v) => setIncludeIndividualTN(!!v)} />
                      <Label htmlFor="includeIndividualTN" className="text-xs text-emerald-200/70 cursor-pointer flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-sky-400" /> Tính cá nhân TN vào chương trình
                      </Label>
                    </div>
                  )}
                  {/* Filter by effective date — chỉ tính TVV có ngày LV bằng hoặc sau ngày hiệu lực chức vụ gần nhất của NTD recruiter */}
                  {(targetType === 'nhom' || targetType === 'nyd') && (
                    <div className="flex items-center gap-2 p-2 rounded-lg border border-amber-500/40 bg-amber-500/10">
                      <Checkbox id="filterByEffectiveDate" checked={filterByEffectiveDate} onCheckedChange={(v) => setFilterByEffectiveDate(!!v)} />
                      <Label htmlFor="filterByEffectiveDate" className="text-xs text-amber-200/90 cursor-pointer flex items-center gap-1">
                        <CalendarClock className="w-3 h-3 text-amber-400" /> Chỉ tính TVV có ngày LV bằng hoặc sau ngày hiệu lực CV gần nhất
                      </Label>
                    </div>
                  )}
                </div>
                {filterByEffectiveDate && (targetType === 'nhom' || targetType === 'nyd') && (
                  <p className="text-[10px] text-amber-300/80 italic leading-snug">
                    Khi tích: chỉ giữ HĐ của TVV có <b>ngày bắt đầu LV</b> (lấy từ DS TVV — Cấu trúc) <b>bằng hoặc sau</b> ngày hiệu lực chức vụ gần nhất của NTD đã tuyển dụng họ (lấy từ DS TTN — Cấu trúc). TVV không có ngày LV sẽ bị bỏ qua. Độc lập với điều kiện "Tính cá nhân NTD/TN".
                  </p>
                )}
              </div>

              <Separator className="bg-emerald-500/20" />

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
        {(perContractDisplayContracts.length > 0 || nydData.length > 0 || tvvTotalRows.length > 0 || groupedData.length > 0) && (
          <div className="space-y-2">
            <ContestPoster contestTitle={contestTitle} startDate={startDate} endDate={endDate} conditionType={conditionType} targetType={targetType} sortedTiers={sortedTiers} filteredContracts={displayContracts} groupedData={groupedData} totalFYP={displayTotalFYP} totalBonus={totalBonusDisplay} achievedCount={achievedCount} notAchievedCount={notAchievedCount} formatCurrency={formatCurrency} formatNumber={formatNumber} formatDate={formatDate} variant="gradient" />

            {usePhase2 && phase2Results && (
              <div className="rounded-lg bg-gradient-to-r from-sky-900/40 to-cyan-900/40 border border-sky-500/20 p-3">
                <div className="flex items-center gap-2"><Layers className="w-4 h-4 text-sky-400" /><div className="flex-1"><p className="text-xs font-bold text-sky-300">Chia 2 giai đoạn</p><p className="text-[10px] text-sky-400/60">GĐ1: {phase2Results.phase1Count} HĐ | GĐ2: {phase2Results.phase2Count} HĐ</p></div><div className="text-right"><p className="text-[10px] text-sky-400/60">GĐ1: {formatCurrency(phase2Results.phase1Bonus)}</p><p className="text-[10px] text-sky-400/60">GĐ2: {formatCurrency(phase2Results.phase2Bonus)}</p><p className="text-sm font-extrabold text-sky-300">Tổng: {formatCurrency(phase2Results.totalBonus)}</p></div></div>
              </div>
            )}

            {isActivityRoundMode(conditionType) && targetType === 'nhom' && groupedData.length > 0 && (
              <div className="rounded-lg bg-gradient-to-r from-orange-900/40 to-amber-900/40 border border-orange-500/30 p-3">
                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-orange-400" /><div className="flex-1"><p className="text-xs font-bold text-orange-300">{conditionType === 'activity_round' ? 'Lượt HĐ' : conditionType === 'activity_round_standard' ? 'Lượt HĐ Chuẩn' : conditionType === 'activity_round_tvv90' ? 'Lượt TVV90' : 'Lượt HĐ'}: IP ≥ {formatNumber(isStandardMode(conditionType) ? luotHDCTThreshold : luotHDThreshold)}/tháng = 1 lượt{conditionType === 'activity_round_tvv90' ? ` (TVV90 ≤${tvv90MaxMonths}T)` : ''}</p></div><div className="text-right"><p className="text-[10px] text-orange-400/60">Tổng thưởng</p><p className="text-base font-extrabold text-orange-400">{formatCurrency(arTotalBonus)}</p></div></div>
              </div>
            )}
            {isTotalMode(conditionType) && targetType !== 'nhom' && (
              <div className="rounded-lg bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/30 p-3">
                <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-amber-400" /><div className="flex-1"><p className="text-xs font-bold text-amber-300">{conditionType === 'total_afyp' ? 'Tổng AFYP' : 'Tổng IP'}: {formatCurrency(totalValue)}</p></div>{matchedTotalTier ? <>{showRateColumn && <div className="text-right border-r border-emerald-500/20 pr-2"><p className="text-sm font-bold text-violet-400">{formatRate(matchedTotalTier)}</p></div>}<div className="text-right"><p className="text-base font-extrabold text-amber-400">{formatBonusAmount(matchedTotalTier, totalValue)}</p></div></> : <div className="text-right"><p className="text-sm font-bold text-orange-400">Chưa đạt mức thấp nhất</p></div>}{totalRemaining !== null && <div className="text-right border-l border-emerald-500/20 pl-2"><p className="text-[10px] text-orange-400/60">Cần thêm</p><p className="text-sm font-bold text-orange-400">{formatCurrency(totalRemaining)}</p></div>}</div>
              </div>
            )}
            {targetType === 'nyd' && nydData.length > 0 && (
              <div className="rounded-lg bg-gradient-to-r from-violet-900/40 to-purple-900/40 border border-violet-500/20 p-3">
                <div className="flex items-center gap-2"><UserPlus className="w-4 h-4 text-violet-400" /><div className="flex-1"><p className="text-xs font-bold text-violet-300">{isActivityRoundMode(conditionType) ? getConditionLabel(conditionType) : conditionType === 'total_afyp' ? 'Tổng AFYP' : 'Tổng IP'} (NTD)</p><p className="text-[10px] text-violet-400/60">{isActivityRoundMode(conditionType) ? `TVV có IP ≥ ${formatNumber(isStandardMode(conditionType) ? luotHDCTThreshold : luotHDThreshold)}/tháng = 1 lượt${isStandardMode(conditionType) ? ' (Chuẩn)' : ''}` : `Tổng FYP${includeIndividualNTD ? ' + IP cá nhân' : ''}`}</p></div><div className="text-right"><p className="text-[10px] text-violet-400/60">Tổng thưởng</p><p className="text-base font-extrabold text-violet-400">{formatCurrency(nydTotalBonus)}</p></div></div>
              </div>
            )}
          </div>
        )}

        {/* Source Data - collapsible (display toggle thay vì conditional render để tránh giật) */}
        <Card className={`${neonBorder} bg-[#0e1424]/95`}>
          <CardHeader className="pb-2 pt-3 px-4">
            <button className="flex items-center justify-between w-full" onClick={() => setShowSourceData(!showSourceData)}>
              <div className="flex items-center gap-2"><Database className="w-4 h-4 text-emerald-400/60" /><CardTitle className="text-sm text-emerald-200">Dữ liệu nguồn</CardTitle><Badge variant="secondary" className="text-[10px]">{contracts.length} HĐ</Badge></div>
              {showSourceData ? <ChevronUp className="w-4 h-4 text-emerald-400/60" /> : <ChevronDown className="w-4 h-4 text-emerald-400/60" />}
            </button>
          </CardHeader>
          <CardContent className="px-4 pb-3" style={{ display: showSourceData ? 'block' : 'none' }}>
              {contracts.length === 0 ? (
                <div className="text-center py-6 text-emerald-400/50"><Database className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm font-medium">Chưa có dữ liệu</p><p className="text-xs">Nhấn &ldquo;Nhập HD&rdquo; để tải từ Google Sheets</p></div>
              ) : (
                <div className="rounded-lg border border-emerald-500/30 overflow-x-auto max-h-48 overflow-y-auto">
                  <Table><TableHeader><TableRow className="bg-emerald-500/20 sticky top-0"><TableHead className="w-[35px] text-center text-xs text-emerald-400/60">STT</TableHead><TableHead className="text-xs text-emerald-400/60">MC NHÓM</TableHead><TableHead className="text-xs text-emerald-400/60">Mã</TableHead><TableHead className="text-xs text-emerald-400/60">Họ tên</TableHead><TableHead className="text-xs text-emerald-400/60">Ngày HL</TableHead><TableHead className="text-xs text-emerald-400/60">IP</TableHead><TableHead className="w-[30px]"></TableHead></TableRow></TableHeader>
                    <TableBody>{contracts.map((c, idx) => (
                      <TableRow key={c.id} className="hover:bg-emerald-500/10 border-emerald-500/20"><TableCell className="text-center text-emerald-400/50 text-xs">{idx + 1}</TableCell><TableCell className="font-mono text-[10px] text-emerald-400 whitespace-nowrap">{c.maNhom}</TableCell><TableCell className="font-mono text-[10px] text-emerald-300/60 whitespace-nowrap">{c.agentCode}</TableCell><TableCell className="text-xs text-emerald-200 whitespace-nowrap">{c.agentName}</TableCell><TableCell className="text-[10px] text-emerald-300/70 whitespace-nowrap">{formatDate(c.effectiveDate)}</TableCell><TableCell className="font-semibold text-emerald-400 text-xs whitespace-nowrap">{formatNumber(c.pdt10DT)}</TableCell><TableCell><Button variant="ghost" size="sm" onClick={async () => { try { const res = await fetch(`/api/contracts?id=${c.id}`, { method: 'DELETE' }); if (res.ok) { toast({ title: 'Thành công', description: 'Đã xóa' }); fetchContracts(); setFilteredContracts((prev) => prev.filter((fc) => fc.id !== c.id)); } } catch { toast({ title: 'Lỗi', description: 'Không thể xóa', variant: 'destructive' }); } }} className="h-5 w-5 p-0 text-red-400 hover:text-red-300"><Trash2 className="w-3 h-3" /></Button></TableCell></TableRow>
                    ))}</TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
        </Card>
      </main>
      )}

      {/* Result Dialog Popup - White theme, only poster + detail table
          In embed mode: always open + CSS .embed-mode biến Dialog thành full-page (KHÔNG còn là popup) */}
      <Dialog open={isEmbedMode || isResultDialogOpen} onOpenChange={(open) => { if (!isEmbedMode) { setIsResultDialogOpen(open); if (!open) setIsResultExpanded(false); } }}>
        <DialogContent showCloseButton={!isEmbedMode} className={`${isEmbedMode ? '' : isResultExpanded ? 'sm:max-w-5xl max-h-[95vh]' : 'sm:max-w-2xl max-h-[67vh]'} overflow-y-auto bg-white border-emerald-500/30 p-0 transition-all duration-300`}>
          {/* Action bar */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between">
            <DialogTitle className="text-emerald-600 text-base font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-600" />
              {isEmbedMode ? (contestTitle || 'Kết quả chi tiết') : 'Kết quả chi tiết'}
            </DialogTitle>
            <div className="flex items-center gap-1">
              {!isEmbedMode && (
                <Button variant="outline" size="sm" onClick={() => setIsResultExpanded(!isResultExpanded)} className="border-gray-300 text-gray-700 h-7 w-7 p-0 hover:bg-gray-100">
                  {isResultExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </Button>
              )}
              {!isEmbedMode && (
                <Button variant="outline" size="sm" onClick={handleShareImage} disabled={isDownloadingImage} className="border-gray-300 text-gray-700 h-7 text-xs hover:bg-gray-100">
                  {isDownloadingImage ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ImageIcon className="w-3 h-3 mr-1" />}Chia sẻ ảnh
                </Button>
              )}
              {!isEmbedMode && (
                <Button variant="outline" size="sm" onClick={handleDownloadImage} disabled={isDownloadingImage} className="border-gray-300 text-gray-700 h-7 text-xs hover:bg-gray-100">
                  {isDownloadingImage ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Camera className="w-3 h-3 mr-1" />}Tải ảnh
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleExport} className="border-gray-300 text-gray-700 h-7 text-xs hover:bg-gray-100"><Download className="w-3 h-3 mr-1" />XLSX</Button>
            </div>
          </div>

          <div ref={resultContentRef} className="px-3 py-2">
            <div ref={printRef}>
              {/* Poster image - full width, 21:9 aspect ratio, no gaps */}
              {posterUrl && <div className="mb-3 w-full overflow-hidden" style={{ aspectRatio: '21/9' }}><img src={posterUrl} alt="Poster" className="w-full h-full object-fill shadow-md" /></div>}
              {!posterUrl && (
                <ContestPoster contestTitle={contestTitle} startDate={startDate} endDate={endDate} conditionType={conditionType} targetType={targetType} sortedTiers={sortedTiers} filteredContracts={displayContracts} groupedData={groupedData} totalFYP={displayTotalFYP} totalBonus={totalBonusDisplay} achievedCount={achievedCount} notAchievedCount={notAchievedCount} formatCurrency={formatCurrency} formatNumber={formatNumber} formatDate={formatDate} variant="white" />
              )}

              {/* Result Table - slightly larger */}
              <div className="overflow-x-auto border border-emerald-600 shadow-sm mt-3" id="result-table-container">
                <Table className="text-sm">
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
                            {isActivityRoundMode(conditionType) ? getConditionLabel(conditionType) : conditionType === 'total_afyp' ? 'Tổng AFYP' : 'Tổng IP'}
                          </TableHead>
                          {showSecondaryTotalColumn && (
                            <>
                              {secondaryTotalAFYPMin > 0 && <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center bg-amber-800/60"><div>Tổng AFYP</div><div className="text-[9px] italic text-red-300 font-normal normal-case">(chỉ tiêu phụ)</div></TableHead>}
                              {secondaryTotalIPMin > 0 && <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center bg-amber-800/60"><div>Tổng IP</div><div className="text-[9px] italic text-red-300 font-normal normal-case">(chỉ tiêu phụ)</div></TableHead>}
                            </>
                          )}
                          {includeIndividualNTD && (
                            <TableHead className="text-yellow-100 min-w-[65px] font-bold uppercase text-center whitespace-nowrap">IP cá nhân</TableHead>
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
                    }) : isPerContractMode(conditionType) ? perContractDisplayContracts.map((c) => {
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
                      const group = resolveTvvGroup(contract.agentCode, contract.maNhom, contract.nhom);
                      return (
                        <TableRow key={contract.id} className={`${effectiveTier ? 'bg-white' : 'bg-red-50'} hover:bg-emerald-50 border-b border-gray-200`}>
                          <TableCell className="text-center text-gray-400 text-xs whitespace-nowrap">{idx + 1}</TableCell>
                          <TableCell className="text-xs text-emerald-700 font-semibold whitespace-nowrap">{group.nhom}</TableCell>
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
