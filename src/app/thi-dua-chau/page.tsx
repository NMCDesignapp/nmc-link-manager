'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
// useSettings removed — no CSV sync, data from Quản lý page
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import {
  Plus, Trash2, Trophy, FileText, TrendingUp, Database,
  Download, X, Link, Loader2, Printer, Copy, Save, BookmarkPlus,
  Sparkles, Target, Award, Users, Banknote, CalendarRange, Gift,
  UserCheck, Percent, Image as ImageIcon, ChevronDown, ChevronUp, ArrowLeft,
  Camera, UserPlus, EyeOff, Filter, Layers, Settings2, Maximize2, Minimize2,
  RefreshCw, CheckCircle2,
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
  bonusType: 'money' | 'gift' | 'percent' | 'money_per_round' | 'percent_fyc'; bonusText: string; bonusPercent: number;
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
  csvContractUrl?: string; csvStaffUrl?: string; csvRecruiterUrl?: string;
  createdAt: string; updatedAt: string;
}

type ConditionType = 'per_contract_ip' | 'per_contract_afyp' | 'total_ip' | 'total_afyp' | 'activity_round' | 'activity_round_tvvm' | 'activity_round_standard' | 'activity_round_standard_tvvm' | 'activity_round_tvv90' | 'tvv_pass_count';
type TargetType = 'tvv' | 'nhom' | 'nyd';

function isActivityRoundMode(ct: ConditionType): boolean {
  return ct === 'activity_round' || ct === 'activity_round_tvvm' || ct === 'activity_round_standard' || ct === 'activity_round_standard_tvvm' || ct === 'activity_round_tvv90';
}
function isTVVPassCountMode(ct: ConditionType): boolean {
  return ct === 'tvv_pass_count';
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

function isTVVm(startDate: string | null, maxMonths: number = 12): boolean {
  if (!startDate) return false;
  const start = new Date(startDate);
  const now = new Date();
  const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return diffMonths <= maxMonths;
}

// TVV90: TVV có thời gian làm việc không quá N tháng
function isTVV90Agent(contracts: Contract[], agentCode: string, maxMonths: number = 3, _minIP?: number): boolean {
  const agentContract = contracts.find(c => c.agentCode === agentCode);
  if (!agentContract) return false;
  const startDate = agentContract.ngayBatDauLamViec || agentContract.startDate;
  if (!startDate) return false;
  const start = new Date(startDate);
  const now = new Date();
  const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return diffMonths <= maxMonths;
}

// Helper: calculate lượt for a group of contracts based on tinhLuot3tr
// Đếm SỐ DÒNG hợp đồng có tinhLuot3tr >= threshold (không phải unique TVV)
function calculateLuot(contracts: Contract[], luotThreshold: number, conditionType: ConditionType, tvv90MaxMonths?: number, tvv90MinIP?: number): number {
  let count = 0;
  for (const c of contracts) {
    // Apply TVVm filter if condition is tvvm mode
    if (isTVVmMode(conditionType)) {
      if (!isTVVm(c.ngayBatDauLamViec || c.startDate)) continue;
    }
    // Apply TVV90 filter if condition is tvv90 mode
    if (conditionType === 'activity_round_tvv90') {
      if (!isTVV90Agent(contracts, c.agentCode, tvv90MaxMonths, tvv90MinIP)) continue;
    }
    // Đếm số dòng hợp đồng có tinhLuot3tr >= threshold
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
  return tier.bonusAmount;
}

function BonusTypeIcon({ type, className }: { type: string; className?: string }) {
  if (type === 'gift') return <Gift className={className} />;
  if (type === 'percent') return <Percent className={className} />;
  if (type === 'percent_fyc') return <Percent className={className} />;
  if (type === 'money_per_round') return <Layers className={className} />;
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
              <span className={`text-[10px] font-bold ${cls.label} ${cls.badge} px-1.5 py-0.5 rounded`}>Mức {index + 1}</span>
              <div className="flex items-center gap-0.5 ml-auto overflow-x-auto scrollbar-none">
                {BONUS_TYPE_BUTTONS.map(([type, label, Icon, activeCls]) => (
                  <Button key={type} variant={tier.bonusType === type ? 'default' : 'outline'} size="sm" className={`h-5 w-5 p-0 shrink-0 ${tier.bonusType === type ? activeCls + ' hover:opacity-90' : 'border-emerald-500/20 text-emerald-300/60 bg-transparent'}`} onClick={() => onUpdate(tier.id, 'bonusType', type)} title={label}><Icon className="w-3 h-3" /></Button>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={() => onRemove(tier.id)} className="h-5 w-5 p-0 text-red-400 hover:text-red-300"><Trash2 className="w-2.5 h-2.5" /></Button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {isAR ? (
                <>
                  <div><Label className="text-[9px] text-emerald-300/70">Lượt từ</Label><Input type="number" inputMode="numeric" placeholder="0" value={tier.minFYP || ''} onChange={(e) => onUpdate(tier.id, 'minFYP', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)} className="h-7 text-xs border-gray-600 bg-gray-800 text-white" /></div>
                  <div><Label className="text-[9px] text-emerald-300/70">Lượt đến</Label><Input type="number" inputMode="numeric" placeholder="∞" value={tier.maxFYP || ''} onChange={(e) => onUpdate(tier.id, 'maxFYP', e.target.value ? parseInt(e.target.value) : null)} className="h-7 text-xs border-gray-600 bg-gray-800 text-white" /></div>
                </>
              ) : (
                <>
                  <div><Label className="text-[9px] text-emerald-300/70">{unitLabel} từ (nđ)</Label><Input type="number" inputMode="decimal" placeholder="0" value={vndToNgan(tier.minFYP) || ''} onChange={(e) => onUpdate(tier.id, 'minFYP', e.target.value === '' ? 0 : nganToVnd(parseFloat(e.target.value) || 0))} className="h-7 text-xs border-gray-600 bg-gray-800 text-white" /></div>
                  <div><Label className="text-[9px] text-emerald-300/70">{unitLabel} đến (nđ)</Label><Input type="number" inputMode="decimal" placeholder="∞" value={tier.maxFYP ? vndToNgan(tier.maxFYP) : ''} onChange={(e) => onUpdate(tier.id, 'maxFYP', e.target.value ? nganToVnd(parseFloat(e.target.value)) : null)} className="h-7 text-xs border-gray-600 bg-gray-800 text-white" /></div>
                </>
              )}
              <div>
                <Label className="text-[9px] text-emerald-300/70">
                  {tier.bonusType === 'money' ? 'Thưởng (nđ)' : tier.bonusType === 'money_per_round' ? '/Lượt (nđ)' : tier.bonusType === 'percent' ? '% IP' : tier.bonusType === 'percent_fyc' ? '% FYC' : 'Quà tặng'}
                </Label>
                {tier.bonusType === 'money' || tier.bonusType === 'money_per_round'
                  ? <Input type="number" inputMode="decimal" placeholder="0" value={vndToNgan(tier.bonusAmount) || ''} onChange={(e) => onUpdate(tier.id, 'bonusAmount', e.target.value === '' ? 0 : nganToVnd(parseFloat(e.target.value) || 0))} className="h-7 text-xs border-gray-600 bg-gray-800 text-white" />
                  : tier.bonusType === 'percent' || tier.bonusType === 'percent_fyc'
                    ? <Input type="number" inputMode="decimal" placeholder="7" value={tier.bonusPercent || ''} onChange={(e) => onUpdate(tier.id, 'bonusPercent', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)} className="h-7 text-xs border-gray-600 bg-gray-800 text-white" />
                    : <Input type="text" placeholder="VD: iPhone 15" value={tier.bonusText} onChange={(e) => onUpdate(tier.id, 'bonusText', e.target.value)} className="h-7 text-xs border-gray-600 bg-gray-800 text-white" />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default function ThiDuaPage() {
  const router = useRouter();
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
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [recruiterList, setRecruiterList] = useState<RecruiterMember[]>([]);
  // revenueData removed — all data now sourced from Contracts table only
  const printRef = useRef<HTMLDivElement>(null);
  const resultContentRef = useRef<HTMLDivElement>(null);

  const handlePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setPosterUrl(ev.target?.result as string); };
    reader.readAsDataURL(file);
  };

  const fetchContracts = useCallback(async () => {
    setIsLoading(true);
    try { const res = await fetch('/api/contracts'); if (res.ok) { const data = await res.json(); setContracts(data); } }
    catch { /* silent - status shown by green check / spinner */ }
    finally { setIsLoading(false); }
  }, []);
  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  const fetchSavedContests = useCallback(async () => {
    try { const res = await fetch('/api/contests'); if (res.ok) { const data = await res.json(); setSavedContests(data); } } catch { /* silent */ }
  }, []);
  useEffect(() => { fetchSavedContests(); }, [fetchSavedContests]);

  // Fetch staff list for group membership reference
  const fetchStaff = useCallback(async () => {
    try { const res = await fetch('/api/staff'); if (res.ok) { const data = await res.json(); setStaffList(data); } } catch { /* silent */ }
  }, []);
  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  // Fetch recruiter list for NYD reference
  const fetchRecruiters = useCallback(async () => {
    try { const res = await fetch('/api/recruiters'); if (res.ok) { const data = await res.json(); setRecruiterList(data); } } catch { /* silent */ }
  }, []);
  useEffect(() => { fetchRecruiters(); }, [fetchRecruiters]);

  // fetchRevenue removed — all data now sourced from Contracts table only

  // Data is loaded directly from DB (populated by Quản lý page) — no CSV sync needed
  // Refresh all data from DB
  const handleRefreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchContracts(), fetchStaff(), fetchRecruiters()]);
      // Show success indicator
      const contractRes = await fetch('/api/contracts');
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
  }, [fetchContracts, fetchStaff, fetchRecruiters, contracts.length]);

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

  const getBonusAmountWithTiers = useCallback((fyp: number, tiers: BonusTier[]): number => {
    const { tier } = calculateBonusWithTiers(fyp, tiers); if (!tier) return 0;
    return computeBonusFromTier(tier, fyp);
  }, [calculateBonusWithTiers]);

  const getBonusAmount = useCallback((fyp: number): number => {
    return getBonusAmountWithTiers(fyp, bonusTiers);
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

  // Subject filter - loại bỏ trùng lặp
  const subjectCodes = useMemo(() => {
    const raw = thiDuaSubjects.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    return [...new Set(raw)];
  }, [thiDuaSubjects]);

  // Display contracts with subject filter applied
  // LOGIC: Dùng DS nguồn (Staff/Recruiter) làm chuẩn, ánh xạ HĐ vào
  const displayContracts = useMemo(() => {
    if (targetType === 'tvv') {
      if (subjectCodes.length === 0) return filteredContracts;
      return filteredContracts.filter(c => subjectCodes.includes(c.agentCode) || subjectCodes.includes(c.agentName));
    }
    if (targetType === 'nhom') {
      // Nhóm: xác định tập mã nhóm hợp lệ từ Staff table (loại PA)
      // Sau đó lọc HĐ theo mã nhóm
      const allowedMaNhom = new Set<string>();
      if (subjectCodes.length > 0) {
        // Có nhập đối tượng → tìm mã nhóm từ tên nhóm nhập vào
        for (const code of subjectCodes) {
          const codeLower = norm(code).toLowerCase();
          const staff = staffList.find(s => norm(s.nhom || '').toLowerCase() === codeLower);
          if (staff?.maNhom) {
            allowedMaNhom.add(staff.maNhom);
          } else {
            allowedMaNhom.add(code);
          }
        }
      } else {
        // Không nhập đối tượng → lấy tất cả nhóm từ Staff table (trừ PA)
        for (const s of staffList) {
          if (s.maNhom && !norm(s.nhom || '').toLowerCase().includes('pa')) {
            allowedMaNhom.add(s.maNhom);
          }
        }
      }
      return filteredContracts.filter(c => allowedMaNhom.has(c.maNhom));
    }
    if (targetType === 'nyd') {
      // NTD: xác định tập mã NTD từ Recruiter table
      if (subjectCodes.length > 0) {
        return filteredContracts.filter(c => subjectCodes.includes(c.agentCode) || subjectCodes.includes(c.agentName) ||
          (c.maDaiLyTD && subjectCodes.includes(c.maDaiLyTD)));
      }
      // Không nhập đối tượng → lấy HĐ liên quan đến NTD trong Recruiter table
      const ntdCodes = new Set(recruiterList.map(r => r.agentCode));
      return filteredContracts.filter(c => ntdCodes.has(c.agentCode) || ntdCodes.has(c.maDaiLyTD));
    }
    return filteredContracts;
  }, [filteredContracts, subjectCodes, targetType, staffList, recruiterList]);

  // filteredRevenueData & displayRevenueData removed — all data now sourced from Contracts table only

  // NYD data computation - use Recruiter table as primary reference
  const nydData: NYDData[] = useMemo(() => {
    if (targetType !== 'nyd') return [];
    const nydMap = new Map<string, NYDData>();

    // Step 1: Load NTD from Recruiter table
    // Nếu có DS đối tượng → chỉ lấy NTD trong DS, ngược lại lấy tất cả
    if (subjectCodes.length > 0) {
      for (const r of recruiterList) {
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
      // Thêm NTD từ subjectCodes KHÔNG có trong recruiterList (để hiện đầy đủ DS)
      for (const code of subjectCodes) {
        const codeLower = norm(code).toLowerCase();
        const found = Array.from(nydMap.keys()).some(k => norm(k).toLowerCase() === codeLower);
        if (!found) {
          // Tìm thông tin từ staffList nếu có
          const staff = staffList.find(s => s.agentCode.toLowerCase() === codeLower || norm(s.agentName || '').toLowerCase() === codeLower);
          nydMap.set(code, {
            nydCode: staff?.agentCode || code,
            nydName: staff?.agentName || code,
            nhom: staff?.nhom || '',
            position: staff?.position || '',
            startDate: staff?.startDate || null,
            recruitCount: 0,
            recruitFYP: 0,
            ownFYP: 0,
            contracts: [],
          });
        }
      }
    } else {
      // Không có DS đối tượng → lấy tất cả NTD
      for (const r of recruiterList) {
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
      if (data) data.activityRounds = calculateLuot(cList, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
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
              const staff = staffList.find(s => s.agentCode === agentCode);
              if (staff?.startDate) return isTVVm(staff.startDate);
              const contract = recruitedContracts.find(c => c.agentCode === agentCode);
              if (contract) return isTVVm(contract.ngayBatDauLamViec || contract.startDate);
              return false;
            })
          );
        }
        // Lọc TVV90 nếu chế độ TVV90
        if (conditionType === 'activity_round_tvv90') {
          recruitedAgents = new Set(
            [...recruitedAgents].filter(agentCode => {
              const contract = recruitedContracts.find(c => c.agentCode === agentCode);
              return contract ? isTVV90Agent(recruitedContracts, agentCode, tvv90MaxMonths, tvv90MinIP) : false;
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
  }, [displayContracts, conditionType, recruiterList, subjectCodes, staffList, luotHDThreshold, luotHDCTThreshold, tvv90MaxMonths, tvv90MinIP]);

  // TVV total mode result rows - bao gồm TẤT CẢ TVV trong DS áp dụng, kể cả không có doanh thu (giá trị 0)
  // Dùng Contracts (bảng HĐ) làm nguồn duy nhất cho TẤT CẢ chế độ
  const tvvTotalRows = useMemo(() => {
    if (targetType !== 'tvv' || isPerContractMode(conditionType)) return [];
    const isAFYP = conditionType === 'total_afyp';
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
      if (existing) {
        existing.totalFYP += c.pdt10DT;
        existing.totalAFYP += c.afyp;
        existing.contractCount += 1;
      } else {
        agentMap.set(key, {
          agentCode: c.agentCode, agentName: c.agentName,
          nhom: c.nhom || c.maNhom || '', maNhom: c.maNhom || '',
          totalFYP: c.pdt10DT, totalAFYP: c.afyp, contractCount: 1,
          activityRounds: 0,
        });
      }
    }
    // Tính activityRounds từ Contracts cho từng agent
    for (const [key, agent] of agentMap) {
      const agentContracts = displayContracts.filter(c => c.agentCode === key);
      agent.activityRounds = calculateLuot(agentContracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
    }
    // Thêm TVV từ subjectCodes KHÔNG có trong dữ liệu (không có doanh thu → giá trị 0)
    if (subjectCodes.length > 0) {
      for (const code of subjectCodes) {
        const codeLower = norm(code).toLowerCase();
        const found = Array.from(agentMap.keys()).some(k => norm(k).toLowerCase() === codeLower);
        if (!found) {
          const staff = staffList.find(s => s.agentCode.toLowerCase() === codeLower || norm(s.agentName || '').toLowerCase() === codeLower);
          const recruiter = !staff ? recruiterList.find(r => r.agentCode.toLowerCase() === codeLower || norm(r.agentName || '').toLowerCase() === codeLower) : null;
          const info = staff || recruiter;
          agentMap.set(code, {
            agentCode: info?.agentCode || code,
            agentName: info?.agentName || code,
            nhom: info?.nhom || '',
            maNhom: (info as StaffMember)?.maNhom || '',
            totalFYP: 0, totalAFYP: 0, contractCount: 0, activityRounds: 0,
          });
        }
      }
    }
    return Array.from(agentMap.values()).map(agent => {
      const value = isAFYP ? agent.totalAFYP : (isActivityMode ? agent.totalFYP : agent.totalFYP);
      const { tier } = calculateBonus(value);
      const remaining = getRemainingToNextTier(value);
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
    }).sort((a, b) => b.value - a.value);
  }, [displayContracts, targetType, conditionType, subjectCodes, staffList, recruiterList, usePhase2, phase2StartDate, calculateBonus, getRemainingToNextTier, calculateBonusWithTiers, bonusTiers, bonusTiers2, computeBonusFromTier, luotHDThreshold, luotHDCTThreshold, tvv90MaxMonths, tvv90MinIP]);

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

    // Xác định tập mã nhóm hợp lệ
    // 1. Nếu có nhập đối tượng → chỉ lấy nhóm trong DS
    // 2. Nếu không nhập → lấy tất cả nhóm từ Staff table (trừ PA)
    const allowedMaNhom = new Set<string>();

    if (subjectCodes.length > 0) {
      // Có nhập đối tượng → tìm mã nhóm từ tên nhóm nhập vào
      for (const code of subjectCodes) {
        const codeLower = norm(code).toLowerCase();
        const staff = staffList.find(s => norm(s.nhom || '').toLowerCase() === codeLower);
        if (staff?.maNhom) {
          allowedMaNhom.add(staff.maNhom);
        } else {
          // Không tìm thấy → vẫn thêm (nhóm chưa có trong staffList)
          allowedMaNhom.add(code);
        }
      }
    } else {
      // Không nhập → lấy tất cả nhóm từ Staff table (trừ PA)
      for (const s of staffList) {
        if (s.maNhom && !norm(s.nhom || '').toLowerCase().includes('pa')) {
          allowedMaNhom.add(s.maNhom);
        }
      }
    }

    // Step 1: Build groups từ Staff table (nguồn chính)
    for (const s of staffList) {
      if (!s.maNhom) continue;
      if (map.has(s.maNhom)) continue;
      // Loại bỏ nhóm PA
      if (norm(s.nhom || '').toLowerCase().includes('pa')) continue;
      // Nếu có DS đối tượng → chỉ thêm nhóm trong DS
      if (allowedMaNhom.size > 0 && !allowedMaNhom.has(s.maNhom)) continue;

      map.set(s.maNhom, { maNhom: s.maNhom, nhom: s.nhom, leader: null, totalFYP: 0, totalAFYP: 0, contractCount: 0, activityRounds: 0, contracts: [], memberCount: 0 });
    }

    // Thêm nhóm trong DS đối tượng nhưng chưa có trong Staff table (nhóm mới, giá trị 0)
    if (subjectCodes.length > 0) {
      for (const maNhom of allowedMaNhom) {
        if (!map.has(maNhom)) {
          // Tìm tên nhóm từ staffList
          const staff = staffList.find(s => s.maNhom === maNhom);
          const nhomName = staff?.nhom || maNhom;
          map.set(maNhom, { maNhom, nhom: nhomName, leader: null, totalFYP: 0, totalAFYP: 0, contractCount: 0, activityRounds: 0, contracts: [], memberCount: 0 });
        }
      }
    }

    // Tìm Trưởng nhóm tham dự thi đua
    // Ưu tiên: Trưởng ban > Trưởng nhóm (TB tham dự với vai trò TN)
    // Fallback sang Recruiter table nếu Staff table không có
    for (const [maNhom, g] of map) {
      const groupStaff = staffList.filter(s => s.maNhom === maNhom);

      // Ưu tiên Trưởng ban (họ tham dự thi đua với vai trò Trưởng nhóm)
      const truongBan = groupStaff.find(s => {
        const pos = norm(s.position || '').toLowerCase().trim();
        return pos === 'trưởng ban';
      });
      if (truongBan) {
        g.leader = { agentCode: truongBan.agentCode, agentName: truongBan.agentName, position: truongBan.position };
        continue;
      }

      // Nếu không có Trưởng ban → lấy Trưởng nhóm
      const truongNhom = groupStaff.find(s => {
        const pos = norm(s.position || '').toLowerCase().trim();
        return pos === 'trưởng nhóm';
      });
      if (truongNhom) {
        g.leader = { agentCode: truongNhom.agentCode, agentName: truongNhom.agentName, position: truongNhom.position };
        continue;
      }

      // Fallback: Tìm trong Recruiter table theo mã nhóm hoặc tên nhóm
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
    const luotThreshold = isStandardMode(conditionType) ? luotHDCTThreshold : luotHDThreshold;
    const contractByNhom = new Map<string, { totalFYP: number; totalAFYP: number; contractCount: number }>();
    for (const c of displayContracts) {
      if (!c.maNhom) continue;
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
    for (const [maNhom, g] of map) {
      const groupContracts = displayContracts.filter(c => c.maNhom === maNhom || (c.maNhom && c.maNhom.toLowerCase() === maNhom.toLowerCase()));
      g.contracts = groupContracts;
      g.activityRounds = calculateLuot(groupContracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
    }

    // Step 4: Calculate memberCount từ Staff table
    for (const g of Array.from(map.values())) {
      g.memberCount = staffList.filter(s => s.maNhom === g.maNhom).length;
    }

    return Array.from(map.values());
  }, [displayContracts, targetType, conditionType, staffList, recruiterList, subjectCodes, luotHDThreshold, luotHDCTThreshold, tvv90MaxMonths, tvv90MinIP]);

  // Phase 2: Split contracts by date and compute bonus — dùng Contracts (nguồn duy nhất) cho TẤT CẢ chế độ
  const phase2Results = useMemo(() => {
    if (!usePhase2 || !phase2StartDate) return null;
    const p2Start = new Date(phase2StartDate);

    const isAFYP = conditionType === 'total_afyp';
    const luotThreshold = isStandardMode(conditionType) ? luotHDCTThreshold : luotHDThreshold;

    // TẤT CẢ chế độ: dùng Contracts (nguồn duy nhất), chia theo effectiveDate
    const phase1Contracts = displayContracts.filter(c => new Date(c.effectiveDate) < p2Start);
    const phase2Contracts = displayContracts.filter(c => new Date(c.effectiveDate) >= p2Start);

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
          data.activityRounds = calculateLuot(groupContracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
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
          data.activityRounds = calculateLuot(groupContracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
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
      for (const r of recruiterList) {
        const recruited = phase1Contracts.filter(c => c.maDaiLyTD === r.agentCode && c.agentCode !== r.agentCode);
        const recruitedAgents = new Set(recruited.map(c => c.agentCode));
        if (isActivityRoundMode(conditionType)) {
          let filteredAgents = recruitedAgents;
          if (isTVVmMode(conditionType)) { filteredAgents = new Set([...filteredAgents].filter(agentCode => { const staff = staffList.find(s => s.agentCode === agentCode); if (staff?.startDate) return isTVVm(staff.startDate); const contract = recruited.find(c => c.agentCode === agentCode); if (contract) return isTVVm(contract.ngayBatDauLamViec || contract.startDate); return false; })); }
          if (conditionType === 'activity_round_tvv90') { filteredAgents = new Set([...filteredAgents].filter(agentCode => isTVV90Agent(recruited, agentCode, tvv90MaxMonths, tvv90MinIP))); }
          let recruitCount = 0;
          for (const agentCode of filteredAgents) {
            const agentContracts = phase1Contracts.filter(c => c.agentCode === agentCode);
            recruitCount += calculateLuot(agentContracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
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
          const value = recruitFYP + (includeIndividualTN ? ownFYP : 0);
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
      for (const r of recruiterList) {
        const recruited = phase2Contracts.filter(c => c.maDaiLyTD === r.agentCode && c.agentCode !== r.agentCode);
        const recruitedAgents = new Set(recruited.map(c => c.agentCode));
        if (isActivityRoundMode(conditionType)) {
          let filteredAgents = recruitedAgents;
          if (isTVVmMode(conditionType)) { filteredAgents = new Set([...filteredAgents].filter(agentCode => { const staff = staffList.find(s => s.agentCode === agentCode); if (staff?.startDate) return isTVVm(staff.startDate); const contract = recruited.find(c => c.agentCode === agentCode); if (contract) return isTVVm(contract.ngayBatDauLamViec || contract.startDate); return false; })); }
          if (conditionType === 'activity_round_tvv90') { filteredAgents = new Set([...filteredAgents].filter(agentCode => isTVV90Agent(recruited, agentCode, tvv90MaxMonths, tvv90MinIP))); }
          let recruitCount = 0;
          for (const agentCode of filteredAgents) {
            const agentContracts = phase2Contracts.filter(c => c.agentCode === agentCode);
            recruitCount += calculateLuot(agentContracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
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
          const value = recruitFYP + (includeIndividualTN ? ownFYP : 0);
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
          const rounds = calculateLuot(agentContracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
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
          const rounds = calculateLuot(agentContracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
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
  }, [usePhase2, phase2StartDate, displayContracts, targetType, conditionType, bonusTiers, bonusTiers2, includeIndividualTN, recruiterList, staffList, calculateBonusWithTiers, calculateActivityRoundBonusWithTiers, getBonusAmountWithTiers, luotHDThreshold, luotHDCTThreshold, tvv90MaxMonths, tvv90MinIP]);

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
    if (!referenceContestId) {
      console.log('[checkTVVPassContest] No referenceContestId');
      return false;
    }
    const refContest = savedContests.find(sc => sc.id === referenceContestId);
    if (!refContest) {
      console.log('[checkTVVPassContest] Ref contest not found:', referenceContestId);
      return false;
    }

    const refCondition = refContest.conditionType as ConditionType;
    const refTiers: BonusTier[] = (() => { try { return JSON.parse(refContest.bonusTiers); } catch { return []; } })();
    if (refTiers.length === 0) {
      console.log('[checkTVVPassContest] No tiers in ref contest:', refContest.title);
      return false;
    }

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
      const luot = calculateLuot(agentContracts, refLuotThreshold, refCondition, refContest.tvv90MaxMonths ?? 3, refContest.tvv90MinIP ?? 12_000_000);
      const { tier } = calculateBonusWithTiers(luot, refTiers);
      passed = tier !== null;
    } else {
      // Total mode: tính tổng IP/AFYP rồi check tier
      const value = isAFYP
        ? agentContracts.reduce((s, c) => s + c.afyp, 0)
        : agentContracts.reduce((s, c) => s + c.pdt10DT, 0);
      const { tier } = calculateBonusWithTiers(value, refTiers);
      console.log(`[checkTVVPassContest] ${agentCode}: ${refCondition}=${value}, tier=${tier ? 'YES' : 'NO'}, contracts=${agentContracts.length}`);
      passed = tier !== null;
    }

    // Kiểm tra điều kiện bổ sung (Tổng AFYP/Tổng IP tối thiểu) của chương trình tham chiếu
    if (passed && refContest.useSecondaryCondition) {
      const totalAFYP = agentContracts.reduce((s, c) => s + c.afyp, 0);
      const totalIP = agentContracts.reduce((s, c) => s + c.pdt10DT, 0);
      if ((refContest.secondaryTotalAFYPMin ?? 0) > 0 && totalAFYP < (refContest.secondaryTotalAFYPMin ?? 0)) passed = false;
      if ((refContest.secondaryTotalIPMin ?? 0) > 0 && totalIP < (refContest.secondaryTotalIPMin ?? 0)) passed = false;
    }

    console.log(`[checkTVVPassContest] ${agentCode}: passed=${passed}, refContest="${refContest.title}", refCondition=${refCondition}`);
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
    const passedTVVs: string[] = [];
    for (const code of agentCodes) {
      // Mặc định: không đếm cá nhân TN (vì họ đã đạt ở chương trình cá nhân kìa)
      // Chỉ đếm TN khi includeTNInPassCount = true
      if (!includeTNInPassCount && tnAgentCode && code === tnAgentCode) continue;
      if (checkTVVPassContest(code)) { count++; passedTVVs.push(code); }
    }
    console.log(`[getGroupTVVPassCount] ${g.nhom || g.maNhom}: ${count}/${agentCodes.size} TVV đạt (TN=${tnAgentCode}, excludeTN=${!includeTNInPassCount}), passed=[${passedTVVs.join(',')}]`);
    return count;
  }, [conditionType, referenceContestId, contracts, staffList, checkTVVPassContest, includeTNInPassCount]);

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
        conditionType, targetType, bonusTiers: JSON.stringify(bonusTiers),
        posterUrl, participants: JSON.stringify(subjectCodes),
        usePhase2, phase2StartDate: phase2StartDate || undefined, phase2EndDate: phase2EndDate || undefined,
        bonusTiers2: JSON.stringify(bonusTiers2),
        useSecondaryCondition, secondaryAFYPMin, secondaryIPMin,
        secondaryLuotHDMin, secondaryLuotHDCMin, secondaryLuotHDFilter, secondaryLuotHDCFilter,
        secondaryTotalAFYPMin, secondaryTotalIPMin,
        hideNotAchieved, includeIndividualNTD, includeIndividualTN,
        luotHDThreshold, luotHDCTThreshold, tvv90MaxMonths, tvv90MinIP,
        referenceContestId: referenceContestId || undefined,
        includeTNInPassCount,
      }) });
      if (res.ok) { const data = await res.json(); toast({ title: 'Thành công', description: data.message }); fetchSavedContests(); }
      else {
        let errMsg = 'Không thể lưu';
        try { const errData = await res.json(); errMsg = errData.error || errData.details || errMsg; } catch {}
        toast({ title: 'Lỗi lưu', description: errMsg, variant: 'destructive' });
      }
    } catch (err) { toast({ title: 'Lỗi lưu', description: String(err), variant: 'destructive' }); }
    finally { setIsSaving(false); }
  };

  // Load contest with all new fields
  const handleLoadContest = (contestId: string) => {
    setSelectedContestId(contestId); const contest = savedContests.find(c => c.id === contestId); if (!contest) return;
    setContestTitle(contest.title); setStartDate(new Date(contest.startDate).toISOString().slice(0, 10)); setEndDate(new Date(contest.endDate).toISOString().slice(0, 10));
    setConditionType(contest.conditionType as ConditionType);
    // tvv_pass_count chỉ dành cho nhóm → tự động set targetType = 'nhom'
    setTargetType((contest.conditionType === 'tvv_pass_count' ? 'nhom' : (contest.targetType || 'tvv')) as TargetType);
    if (contest.issueDate) setIssueStartDate(new Date(contest.issueDate).toISOString().slice(0, 10)); else setIssueStartDate('');
    setIssueEndDate(''); // issueEndDate not stored in contest yet
    try { const tiers = JSON.parse(contest.bonusTiers); if (Array.isArray(tiers)) setBonusTiers(tiers); } catch { /* ignore */ }
    if (contest.posterUrl) setPosterUrl(contest.posterUrl); else setPosterUrl('');
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
    setTimeout(() => handleSearchRef.current(), 100);
  };

  const handleDeleteContest = async (id: string) => {
    try { const res = await fetch(`/api/contests?id=${id}`, { method: 'DELETE' }); if (res.ok) { toast({ title: 'Thành công', description: 'Đã xóa' }); fetchSavedContests(); if (selectedContestId === id) setSelectedContestId(''); } else { const data = await res.json(); toast({ title: 'Lỗi', description: data.error || 'Không thể xóa', variant: 'destructive' }); } }
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
    if (displayContracts.length === 0 && nydData.length === 0 && tvvTotalRows.length === 0 && groupedData.length === 0) return;
    const sTiers = [...bonusTiers].sort((a, b) => a.minFYP - b.minFYP);
    let text = `🏆 ${contestTitle}\n📅 Từ ${startDate ? formatDate(startDate) : '...'} đến ${endDate ? formatDate(endDate) : '...'}\n🎯 ${getTargetLabel(targetType)}\n━━━━━━━━━━━━━━━━━━━━\n📊 Mức thưởng:\n`;
    sTiers.forEach((t, i) => { text += `  Mức ${i + 1}: ${isActivityRoundMode(conditionType) ? `${t.minFYP}${t.maxFYP ? ` - ${t.maxFYP}` : ' ↑'} lượt` : `${formatCurrency(t.minFYP)}${t.maxFYP ? ` - ${formatCurrency(t.maxFYP)}` : ' ↑'}`} → ${formatBonus(t)}\n`; });
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    if (targetType === 'nyd') {
      nydData.map(n => {
        const value = isActivityRoundMode(conditionType) ? n.recruitCount : (n.recruitFYP + (includeIndividualTN ? n.ownFYP : 0));
        const { tier } = calculateBonus(value);
        return { nyd: n, tier, value };
      }).sort((a, b) => b.value - a.value).forEach(({ nyd: n, tier, value }, idx) => {
        const displayVal = isActivityRoundMode(conditionType) ? `${n.recruitCount} Lượt` : formatNumber(value);
        text += `${idx + 1}. ${n.nhom || '—'} | ${n.nydCode} | ${n.nydName} | ${n.position || '—'} | ${displayVal}${includeIndividualTN ? ` | IP cá nhân: ${formatNumber(n.ownFYP)}` : ''} | ${tier ? `Thưởng: ${formatBonus(tier, value, n.recruitCount)}` : 'Chưa đạt'}\n`;
      });
    } else if (targetType === 'nhom') {
      [...groupedData].map((g) => {
        const groupPhase = getGroupPhaseBonus(g);
        const tvvPassCount = getGroupTVVPassCount(g);
        const tier = isTVVPassCountMode(conditionType) ? calculateBonus(tvvPassCount).tier : isActivityRoundMode(conditionType) ? calculateActivityRoundBonus(g.activityRounds).tier : calculateBonus(getGroupValue(g)).tier;
        return { group: g, tier, groupPhase, tvvPassCount };
      }).sort((a, b) => {
        const aValue = isTVVPassCountMode(conditionType) ? a.tvvPassCount : isActivityRoundMode(conditionType) ? a.group.activityRounds : a.group.totalFYP;
        const bValue = isTVVPassCountMode(conditionType) ? b.tvvPassCount : isActivityRoundMode(conditionType) ? b.group.activityRounds : b.group.totalFYP;
        return bValue - aValue;
      }).forEach(({ group: g, tier, groupPhase, tvvPassCount }, idx) => {
        if (isTVVPassCountMode(conditionType)) {
          // Bảng đơn giản cho TVV đạt thi đua
          const bonusLabel = tier ? `Thưởng: ${formatBonus(tier, tvvPassCount)}` : 'Chưa đạt';
          text += `${idx + 1}. ${g.nhom || g.maNhom} | ${g.leader?.agentCode || '—'} | ${g.leader?.agentName || '—'} | ${tvvPassCount} TVV đạt${!includeTNInPassCount ? ' (KO tính TN)' : ''} | ${bonusLabel}\n`;
        } else {
          const valueLabel = isActivityRoundMode(conditionType) ? `${g.activityRounds} ${isStandardMode(conditionType) ? 'Lượt chuẩn' : 'Lượt'}` : `IP: ${formatNumber(g.totalFYP)}`;
          const leaderLabel = g.leader ? `${g.leader.agentCode} ${g.leader.agentName} (${g.leader.position || 'TN'})` : '';
          if (usePhase2 && phase2StartDate) {
            text += `${idx + 1}. ${g.nhom || g.maNhom} | ${leaderLabel} | ${valueLabel} | GD1: ${formatCurrency(groupPhase.phase1Bonus)} | GD2: ${formatCurrency(groupPhase.phase2Bonus)} | Tổng: ${formatCurrency(groupPhase.phase1Bonus + groupPhase.phase2Bonus)}\n`;
          } else {
            text += `${idx + 1}. ${g.nhom || g.maNhom} | ${leaderLabel} | ${valueLabel} | ${tier ? `Thưởng: ${formatBonus(tier, g.totalFYP, g.activityRounds)}` : 'Chưa đạt'}\n`;
          }
        }
      });
    } else if (isPerContractMode(conditionType)) {
      [...displayContracts].map((c) => {
        const tier = calculateBonus(getContractValue(c)).tier;
        const phaseInfo = getRowPhaseBonus(c.pdt10DT, c.effectiveDate);
        return { contract: c, tier, phaseInfo };
      }).sort((a, b) => b.contract.pdt10DT - a.contract.pdt10DT).forEach(({ contract: c, tier, phaseInfo }, idx) => {
        if (usePhase2 && phase2StartDate) {
          text += `${idx + 1}. ${c.agentCode} | ${c.agentName} | ${formatDate(c.effectiveDate)} | IP: ${formatNumber(c.pdt10DT)} | GD1: ${formatCurrency(phaseInfo.phase1Bonus)} | GD2: ${formatCurrency(phaseInfo.phase2Bonus)} | Tổng: ${formatCurrency(phaseInfo.phase1Bonus + phaseInfo.phase2Bonus)}\n`;
        } else {
          text += `${idx + 1}. ${c.nhom || c.maNhom} | ${c.agentCode} | ${c.agentName} | ${formatDate(c.effectiveDate)} | IP: ${formatNumber(c.pdt10DT)} | ${tier ? `Thưởng: ${formatBonus(tier, c.pdt10DT)}` : 'Chưa đạt'}\n`;
        }
      });
    } else {
      // total_ip / total_afyp mode: use tvvTotalRows (includes TVV with 0 contracts)
      const isAFYP = conditionType === 'total_afyp';
      tvvTotalRows.forEach(({ agent, value, tier }, idx) => {
        const valueLabel = isAFYP ? `AFYP: ${formatNumber(value)}` : `IP: ${formatNumber(value)}`;
        text += `${idx + 1}. ${agent.nhom || agent.maNhom} | ${agent.agentCode} | ${agent.agentName} | ${valueLabel} | ${tier ? `Thưởng: ${formatBonus(tier, value)}` : 'Chưa đạt'}\n`;
      });
    }
    navigator.clipboard.writeText(text).then(() => toast({ title: 'Đã sao chép!', description: 'Dán vào Zalo/Telegram' })).catch(() => toast({ title: 'Lỗi', description: 'Không thể sao chép', variant: 'destructive' }));
  };

  const handleExport = async () => {
    try {
    if (displayContracts.length === 0 && nydData.length === 0 && groupedData.length === 0 && tvvTotalRows.length === 0) { toast({ title: 'Thông báo', description: 'Không có dữ liệu' }); return; }
    let headers: string[];
    let rows: (string | number)[][];
    let merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];

    // Supplementary total column flags
    const expSecAFYP = showSecondaryTotalColumn && secondaryTotalAFYPMin > 0;
    const expSecIP = showSecondaryTotalColumn && secondaryTotalIPMin > 0;

    if (targetType === 'nyd') {
      // NTD: mở rộng mỗi NTD thành nhiều dòng, mỗi dòng = 1 HĐ của TVV đóng góp
      headers = ['STT', 'Nhóm', 'Mã ĐL', 'Họ tên NTD', 'Chức vụ', isActivityRoundMode(conditionType) ? getConditionLabel(conditionType) : 'Tổng IP', ...(includeIndividualTN ? ['IP cá nhân'] : []), ...(expSecAFYP ? ['Tổng AFYP'] : []), ...(expSecIP ? ['Tổng IP'] : []), 'Họ tên TVV', 'Số hợp đồng', 'Ngày hiệu lực', 'Ngày phát hành', 'IP', 'AFYP', 'Tổng cộng', 'Ngày BĐLV', ...(showRateColumn ? ['Tỷ lệ'] : []), 'Thưởng', 'Ghi chú'];
      rows = [];
      merges = [];
      let currentRow = 1; // row 0 = header
      const sortedNYD = [...nydData].sort((a, b) => {
        const aVal = isActivityRoundMode(conditionType) ? a.recruitCount : (a.recruitFYP + (includeIndividualTN ? a.ownFYP : 0));
        const bVal = isActivityRoundMode(conditionType) ? b.recruitCount : (b.recruitFYP + (includeIndividualTN ? b.ownFYP : 0));
        return bVal - aVal;
      });
      sortedNYD.forEach((n, nIdx) => {
        const value = isActivityRoundMode(conditionType) ? n.recruitCount : (n.recruitFYP + (includeIndividualTN ? n.ownFYP : 0));
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
          if (includeIndividualTN) row.push(n.ownFYP);
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
            if (includeIndividualTN) row.push(cIdx === 0 ? n.ownFYP : '');
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
            if (includeIndividualTN) { merges.push({ s: { r: startRow, c: 6 }, e: { r: endRow, c: 6 } }); mergeOffset = 1; }
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
        headers = ['STT', 'Nhóm', 'Mã TN', 'Họ tên TN', `SL TVV đạt thi đua${!includeTNInPassCount ? ' (KO tính TN)' : ''}${refContestLabel}`, 'Thưởng', 'Ghi chú'];
        rows = [];
        const sortedGroups = [...groupedData].map((g) => {
          const tvvPassCount = getGroupTVVPassCount(g);
          const tier = calculateBonus(tvvPassCount).tier;
          return { g, tier, tvvPassCount };
        }).sort((a, b) => b.tvvPassCount - a.tvvPassCount);
        sortedGroups.forEach(({ g, tier, tvvPassCount }, gIdx) => {
          const sc = checkSecondaryTotalCondition(g.contracts || []);
          const effectiveTier = sc.passed ? tier : (secondaryTotalAFYPMin > 0 || secondaryTotalIPMin > 0 ? null : tier);
          const remaining = getRemainingToNextTier(tvvPassCount);
          const row: (string | number)[] = [
            gIdx + 1,
            g.nhom || g.maNhom,
            g.leader?.agentCode || '',
            g.leader?.agentName || '',
            tvvPassCount,
            effectiveTier ? formatBonusAmount(effectiveTier, tvvPassCount) : '',
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
            const row: (string | number)[] = [gIdx + 1, g.nhom || g.maNhom, g.leader?.agentCode || '', g.leader?.agentName || '', g.leader?.position || '', condValue];
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
                cIdx === 0 ? (g.nhom || g.maNhom) : '',
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
        if (usePhase2) {
          headers = ['STT', 'Nhóm', 'Mã ĐL', 'Họ tên', 'Số hợp đồng', 'Ngày hiệu lực', 'Ngày phát hành', 'IP', ...(useSecondaryCondition && secondaryAFYPMin > 0 ? ['AFYP'] : []), ...(expSecAFYP ? ['Tổng AFYP'] : []), ...(expSecIP ? ['Tổng IP'] : []), 'Thưởng GD1', 'Thưởng GD2', 'Tổng Thưởng', 'Ghi chú'];
          rows = [...displayContracts].map((c) => {
            const { tier } = calculateBonus(c.pdt10DT);
            const phaseInfo = getRowPhaseBonus(c.pdt10DT, c.effectiveDate);
            // Check supplementary total for this TVV's contracts
            const agentContracts = displayContracts.filter(ac => ac.agentCode === c.agentCode);
            const sc = checkSecondaryTotalCondition(agentContracts);
            const effectiveTier = sc.passed ? tier : (expSecAFYP || expSecIP ? null : tier);
            return { c, tier, effectiveTier, phaseInfo, sc };
          }).sort((a, b) => b.c.pdt10DT - a.c.pdt10DT).map(({ c, tier, effectiveTier, phaseInfo, sc }, idx) => {
            const base: (string | number)[] = [idx + 1, c.nhom || c.maNhom, c.agentCode, c.agentName, c.contractNumber || '', formatDate(c.effectiveDate), formatDate(c.issueDate), c.pdt10DT];
            if (useSecondaryCondition && secondaryAFYPMin > 0) base.push(c.afyp);
            if (expSecAFYP) base.push(sc.totalAFYP);
            if (expSecIP) base.push(sc.totalIP);
            base.push(phaseInfo.phase1Bonus || '', phaseInfo.phase2Bonus || '', phaseInfo.phase1Bonus + phaseInfo.phase2Bonus || '', effectiveTier ? '' : (tier ? 'Chưa đạt ĐKB' : 'Chưa đạt mức'));
            return base;
          });
        } else {
          headers = ['STT', 'Nhóm', 'Mã ĐL', 'Họ tên', 'Số hợp đồng', 'Ngày hiệu lực', 'Ngày phát hành', 'IP', ...(useSecondaryCondition && secondaryAFYPMin > 0 ? ['AFYP'] : []), ...(expSecAFYP ? ['Tổng AFYP'] : []), ...(expSecIP ? ['Tổng IP'] : []), ...(showRateColumn ? ['Tỷ lệ'] : []), 'Thưởng', 'Ghi chú'];
          rows = [...displayContracts].map((c) => {
            const { tier } = calculateBonus(c.pdt10DT);
            const agentContracts = displayContracts.filter(ac => ac.agentCode === c.agentCode);
            const sc = checkSecondaryTotalCondition(agentContracts);
            const effectiveTier = sc.passed ? tier : (expSecAFYP || expSecIP ? null : tier);
            return { c, tier, effectiveTier, sc };
          }).sort((a, b) => b.c.pdt10DT - a.c.pdt10DT).map(({ c, tier, effectiveTier, sc }, idx) => {
            const base: (string | number)[] = [idx + 1, c.nhom || c.maNhom, c.agentCode, c.agentName, c.contractNumber || '', formatDate(c.effectiveDate), formatDate(c.issueDate), c.pdt10DT];
            if (useSecondaryCondition && secondaryAFYPMin > 0) base.push(c.afyp);
            if (expSecAFYP) base.push(sc.totalAFYP);
            if (expSecIP) base.push(sc.totalIP);
            if (showRateColumn) base.push(effectiveTier ? formatRate(effectiveTier) : '');
            base.push(effectiveTier ? formatBonusAmount(effectiveTier, c.pdt10DT) : '');
            base.push(effectiveTier ? '' : (tier ? 'Chưa đạt ĐKB' : 'Chưa đạt mức'));
            return base;
          });
        }
      } else {
        // total_ip / total_afyp: thêm cột Tổng (gộp ô tất cả dòng)
        const isAFYP = conditionType === 'total_afyp';
        if (usePhase2) {
          headers = ['STT', 'Nhóm', 'Mã ĐL', 'Họ tên', isAFYP ? 'Tổng AFYP' : 'Tổng IP', ...(expSecAFYP && !isAFYP ? ['Tổng AFYP'] : []), ...(expSecIP && conditionType !== 'total_ip' ? ['Tổng IP'] : []), 'Tổng', 'Thưởng GD1', 'Thưởng GD2', 'Tổng Thưởng', 'Ghi chú'];
          const grandTotal = tvvTotalRows.reduce((sum, r) => sum + r.value, 0);
          const secOffset = (expSecAFYP && !isAFYP ? 1 : 0) + (expSecIP && conditionType !== 'total_ip' ? 1 : 0);
          rows = tvvTotalRows.map(({ agent, value, tier, phaseInfo }, idx) => {
            // Check supplementary total condition for this TVV
            const agentContracts = displayContracts.filter(c => c.agentCode === agent.agentCode);
            const sc = checkSecondaryTotalCondition(agentContracts);
            const effectiveTier = sc.passed ? tier : (expSecAFYP || expSecIP ? null : tier);
            const row: (string | number)[] = [idx + 1, agent.nhom || agent.maNhom, agent.agentCode, agent.agentName, value];
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
          headers = ['STT', 'Nhóm', 'Mã ĐL', 'Họ tên', isAFYP ? 'Tổng AFYP' : 'Tổng IP', ...(expSecAFYP && !isAFYP ? ['Tổng AFYP'] : []), ...(expSecIP && conditionType !== 'total_ip' ? ['Tổng IP'] : []), 'Tổng', ...(showRateColumn ? ['Tỷ lệ'] : []), 'Thưởng', 'Ghi chú'];
          const grandTotal = tvvTotalRows.reduce((sum, r) => sum + r.value, 0);
          const secOffset = (expSecAFYP && !isAFYP ? 1 : 0) + (expSecIP && conditionType !== 'total_ip' ? 1 : 0);
          rows = tvvTotalRows.map(({ agent, value, tier }, idx) => {
            const agentContracts = displayContracts.filter(c => c.agentCode === agent.agentCode);
            const sc = checkSecondaryTotalCondition(agentContracts);
            const effectiveTier = sc.passed ? tier : (expSecAFYP || expSecIP ? null : tier);
            const row: (string | number)[] = [idx + 1, agent.nhom || agent.maNhom, agent.agentCode, agent.agentName, value];
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
      const detailHeaders = ['STT', 'Ban', 'Nhóm', 'Mã Ban/Nhóm', 'Mã ĐL', 'Tên', 'Chức vụ', 'Ngày bắt đầu làm việc', 'Số hợp đồng', 'Ngày hiệu lực', 'Ngày phát hành', 'PĐT + 10% ĐT', 'AFYP', 'AD', 'TÍNH LƯỢT 3 tr', 'MÃ ĐL TD', 'THƯỞNG'];
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
          const value = isActivityRoundMode(conditionType) ? n.recruitCount : (n.recruitFYP + (includeIndividualTN ? n.ownFYP : 0));
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
          const { tier } = calculateBonus(c.pdt10DT);
          const agentContracts = displayContracts.filter(ac => ac.agentCode === c.agentCode);
          const sc = checkSecondaryTotalCondition(agentContracts);
          const effectiveTier = sc.passed ? tier : (expSecAFYP || expSecIP ? null : tier);
          bonusValue = effectiveTier ? formatBonusAmount(effectiveTier, c.pdt10DT) : '';
        }
        return {
          data: [
            0, // STT placeholder, will be set below
            c.ban || '',
            c.nhom || c.maNhom || '',
            c.maNhom || '',
            c.agentCode || '',
            c.agentName || '',
            c.position || '',
            c.ngayBatDauLamViec ? formatDate(c.ngayBatDauLamViec) : '',
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

    XLSX.writeFile(wb, `ket_qua_thi_dua_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

  // Download image function - using html-to-image
  const handleDownloadImage = async () => {
    setIsDownloadingImage(true);
    try {
      const { toBlob } = await import('html-to-image');
      if (!resultContentRef.current) {
        toast({ title: 'Lỗi', description: 'Không có nội dung để tải', variant: 'destructive' });
        return;
      }

      const el = resultContentRef.current;
      const origWidth = el.style.width;
      const origOverflow = el.style.overflow;

      // Count result rows to determine if splitting is needed
      const tableRows = el.querySelectorAll('tbody tr');
      const MAX_ROWS_PER_IMAGE = 20;
      const needsSplit = tableRows.length > MAX_ROWS_PER_IMAGE;

      if (!needsSplit) {
        // Single image — no split needed
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
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `ket_qua_thi_dua_${new Date().toISOString().slice(0, 10)}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: 'Thành công', description: 'Đã tải ảnh xuống' });
      } else {
        // Split into 2 images
        const dateStr = new Date().toISOString().slice(0, 10);

        // === IMAGE 1: Poster + first half of rows ===
        el.style.width = 'fit-content';
        el.style.overflow = 'hidden';

        // Hide rows after MAX_ROWS_PER_IMAGE
        const allRows = Array.from(tableRows) as HTMLTableRowElement[];
        const hiddenRows2: HTMLTableRowElement[] = [];
        allRows.forEach((row, idx) => {
          if (idx >= MAX_ROWS_PER_IMAGE) {
            row.style.display = 'none';
            hiddenRows2.push(row);
          }
        });

        hideAllScrollbars();
        const blob1 = await toBlob(el, {
          quality: 1,
          pixelRatio: 3,
          backgroundColor: '#ffffff',
        });

        // Restore hidden rows
        hiddenRows2.forEach(row => { row.style.display = ''; });

        // === IMAGE 2: Poster + title + second half of rows ===
        const hiddenRows1: HTMLTableRowElement[] = [];
        allRows.forEach((row, idx) => {
          if (idx < MAX_ROWS_PER_IMAGE) {
            row.style.display = 'none';
            hiddenRows1.push(row);
          }
        });

        const blob2 = await toBlob(el, {
          quality: 1,
          pixelRatio: 3,
          backgroundColor: '#ffffff',
        });

        // Restore all rows
        hiddenRows1.forEach(row => { row.style.display = ''; });
        el.style.width = origWidth;
        el.style.overflow = origOverflow;
        restoreAllScrollbars();

        // Download both images
        if (blob1) {
          const url1 = URL.createObjectURL(blob1);
          const link1 = document.createElement('a');
          link1.download = `ket_qua_thi_dua_1_${dateStr}.png`;
          link1.href = url1;
          link1.click();
          URL.revokeObjectURL(url1);
        }
        if (blob2) {
          // Slight delay to avoid browser blocking second download
          await new Promise(r => setTimeout(r, 500));
          const url2 = URL.createObjectURL(blob2);
          const link2 = document.createElement('a');
          link2.download = `ket_qua_thi_dua_2_${dateStr}.png`;
          link2.href = url2;
          link2.click();
          URL.revokeObjectURL(url2);
        }

        if (!blob1 && !blob2) {
          toast({ title: 'Lỗi', description: 'Không thể tạo ảnh', variant: 'destructive' });
          return;
        }
        toast({ title: 'Thành công', description: `Đã tải 2 ảnh (${allRows.length} dòng kết quả)` });
      }
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

    // TVV stats - use tvvTotalRows for total mode (includes TVV with 0 revenue)
    let tvvAchievedCount: number;
    let tvvTotalBonus: number;
    if (isTotalMode(conditionType) && targetType === 'tvv') {
      tvvAchievedCount = tvvTotalRows.filter(r => r.tier).length;
      tvvTotalBonus = tvvTotalRows.reduce((sum, r) => sum + (r.tier ? computeBonusFromTier(r.tier, r.value) : 0), 0);
    } else {
      // Per-contract mode: still use displayContracts for per-HD stats
      tvvAchievedCount = displayContracts.filter(c => calculateBonus(c.pdt10DT).tier).length;
      tvvTotalBonus = displayContracts.reduce((sum, c) => sum + getBonusAmount(c.pdt10DT), 0);
    }

    // Nhóm stats
    const nhomAchievedCount = groupedData.filter(g => {
      if (isTVVPassCountMode(conditionType)) return calculateBonus(getGroupTVVPassCount(g)).tier;
      if (isActivityRoundMode(conditionType)) return calculateActivityRoundBonus(g.activityRounds).tier;
      return calculateBonus(getGroupValue(g)).tier;
    }).length;
    const nhomTotalFYP = groupedData.reduce((sum, g) => sum + g.totalFYP, 0);
    const nhomTotalBonus = groupedData.reduce((sum, g) => {
      if (isTVVPassCountMode(conditionType)) {
        const passCount = getGroupTVVPassCount(g);
        return sum + getBonusAmount(passCount);
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
      const value = isActivityRoundMode(conditionType) ? n.recruitCount : (n.recruitFYP + (includeIndividualTN ? n.ownFYP : 0));
      return calculateBonus(value).tier;
    }).length : 0;
    const nydNotAchievedCount = targetType === 'nyd' ? nydData.length - nydAchievedCount : 0;
    const nydTotalBonus = targetType === 'nyd' ? nydData.reduce((sum, n) => {
      const value = isActivityRoundMode(conditionType) ? n.recruitCount : (n.recruitFYP + (includeIndividualTN ? n.ownFYP : 0));
      const { tier } = calculateBonus(value);
      if (!tier) return sum;
      return sum + computeBonusFromTier(tier, value, n.recruitCount);
    }, 0) : 0;

    // For TVV total mode, count from tvvTotalRows (includes TVV with 0 revenue)
    const tvvAgentCount = isTotalMode(conditionType) && targetType === 'tvv'
      ? tvvTotalRows.length
      : displayContracts.length;
    const achievedCount = targetType === 'nyd' ? nydAchievedCount : isActivityRoundMode(conditionType) ? arAchievedCount : targetType === 'nhom' ? nhomAchievedCount : tvvAchievedCount;
    const notAchievedCount = targetType === 'nyd' ? nydNotAchievedCount : isActivityRoundMode(conditionType) ? arNotAchievedCount : targetType === 'nhom' ? groupedData.length - nhomAchievedCount : tvvAgentCount - tvvAchievedCount;

    const baseTotalBonus = targetType === 'nyd' ? nydTotalBonus : isActivityRoundMode(conditionType) ? arTotalBonus : targetType === 'nhom' ? nhomTotalBonus : tvvTotalBonus;
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
  }, [displayContracts, groupedData, nydData, tvvTotalRows, conditionType, targetType, includeIndividualTN, usePhase2, phase2Results, calculateBonus, getBonusAmount, calculateActivityRoundBonus, getActivityRoundBonusAmount, getRemainingToNextTier, computeBonusFromTier]);

  const { totalFYP, tvvAchievedCount, tvvTotalBonus, nhomAchievedCount, nhomTotalFYP, nhomTotalBonus, arAchievedCount, arNotAchievedCount, arTotalBonus, nydAchievedCount, nydNotAchievedCount, nydTotalBonus, achievedCount, notAchievedCount, baseTotalBonus, totalBonusDisplay, displayTotalFYP, totalFYPValue, totalValue, matchedTotalTier, totalRemaining } = stats;

  const sortedTiers = useMemo(() => [...bonusTiers].sort((a, b) => a.minFYP - b.minFYP), [bonusTiers]);
  const showRateColumn = useMemo(() => hasPercentBonus(bonusTiers), [bonusTiers]);

  // Có hiển thị cột điều kiện bổ sung Tổng AFYP/Tổng IP trong bảng kết quả không?
  const showSecondaryTotalColumn = useSecondaryCondition && (secondaryTotalAFYPMin > 0 || secondaryTotalIPMin > 0);

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

  // Neon border style like main page
  const neonBorder = 'border border-emerald-500/30 shadow-[0_0_15px_rgba(0,255,136,0.1)] neon-card';

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
      const p1Rounds = calculateLuot(phase1Contracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
      const p1FYP = phase1Contracts.reduce((s, c) => s + c.pdt10DT, 0);
      const p1Res = calculateActivityRoundBonusWithTiers(p1Rounds, bonusTiers);
      phase1Tier = p1Res.tier;
      if (p1Res.tier) phase1Bonus = computeBonusFromTier(p1Res.tier, p1FYP, p1Rounds);

      const p2Rounds = calculateLuot(phase2Contracts, luotThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
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
      const value = isActivityRoundMode(conditionType) ? n.recruitCount : (n.recruitFYP + (includeIndividualTN ? n.ownFYP : 0));
      const { tier, tierIndex } = calculateBonus(value);
      return { nyd: n, tier, tierIndex, value };
    }).sort((a, b) => b.value - a.value);
  }, [nydData, conditionType, includeIndividualTN, calculateBonus]);

  return (
    <div className="min-h-screen">

      {/* Data loaded indicator - top right corner */}
      {dataLoadedVisible && (
        <div className="fixed top-2 right-2 z-[999] flex items-center gap-1.5 bg-emerald-500/90 text-white px-3 py-1.5 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2 duration-300" style={{ backdropFilter: 'blur(8px)' }}>
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-bold">{dataLoadedCount} HĐ đã tải</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-emerald-500/20 bg-[#0e0e18]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-3 py-2.5 flex items-center gap-2">
          <button
            onClick={() => router.push('/')}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
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

      <main className="max-w-5xl mx-auto px-3 py-4 space-y-4 relative page-transition">
        {/* STEP 1: Info */}
        <Card className={`${neonBorder} bg-white/5 backdrop-blur-sm`}>
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
                <CardTitle className="text-sm text-emerald-400 neon-text whitespace-nowrap">Thông tin chương trình</CardTitle>
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

        {/* STEP 2: Config - Collapsible */}
        <Card className={`${neonBorder} bg-white/5 backdrop-blur-sm` + (!showConfig ? ' py-0' : '')}>
          <CardHeader className={!showConfig ? 'py-1.5 px-4' : 'pb-2 pt-3 px-4'}>
            <button className="flex items-center justify-between w-full" onClick={() => setShowConfig(!showConfig)}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
                <CardTitle className="text-sm text-emerald-400 neon-text whitespace-nowrap">Cấu hình thi đua & Thưởng</CardTitle>
              </div>
              {showConfig ? <ChevronUp className="w-4 h-4 text-emerald-400/60" /> : <ChevronDown className="w-4 h-4 text-emerald-400/60" />}
            </button>
          </CardHeader>
          {showConfig && (
            <CardContent className="px-4 pb-4 space-y-3">
              {/* 1. Đối tượng thi đua - Chọn TRƯỚC điều kiện */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-emerald-200">Đối tượng thi đua</Label>
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

              {/* 2. Điều kiện thi đua */}
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
                  {(targetType === 'nhom' || targetType === 'nyd') && (
                    <div className="flex items-center gap-2 p-2 rounded-lg border border-violet-500/30 bg-emerald-500/10">
                      <Checkbox id="includeIndividualNTD" checked={includeIndividualNTD} onCheckedChange={(v) => setIncludeIndividualNTD(!!v)} />
                      <Label htmlFor="includeIndividualNTD" className="text-xs text-emerald-200/70 cursor-pointer flex items-center gap-1">
                        <UserPlus className="w-3 h-3 text-violet-400" /> Tính cá nhân NTD vào chương trình
                      </Label>
                    </div>
                  )}
                  {/* Include Individual TN - for nhóm and NTD targets */}
                  {(targetType === 'nhom' || targetType === 'nyd') && (
                    <div className="flex items-center gap-2 p-2 rounded-lg border border-sky-500/30 bg-emerald-500/10">
                      <Checkbox id="includeIndividualTN" checked={includeIndividualTN} onCheckedChange={(v) => setIncludeIndividualTN(!!v)} />
                      <Label htmlFor="includeIndividualTN" className="text-xs text-emerald-200/70 cursor-pointer flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-sky-400" /> Tính cá nhân TN vào chương trình
                      </Label>
                    </div>
                  )}
                </div>
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
          )}
        </Card>

        {/* Action Buttons - Tính thi đua prominent, refresh small */}
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-sky-500/30 text-sky-400 hover:bg-sky-500/10 h-10 text-[11px] bg-transparent" onClick={() => setIsSubjectDialogOpen(true)}>
            <Users className="w-3.5 h-3.5 mr-1" /> DS đối tượng
            {subjectCodes.length > 0 && <Badge className="ml-1 bg-sky-500 text-white text-[9px] h-4 px-1">{subjectCodes.length}</Badge>}
          </Button>
          <Button onClick={handleCalculate} className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 h-10 text-sm font-bold shadow-lg shadow-emerald-600/20 border border-emerald-500/30">
            <Trophy className="w-4 h-4 mr-1" /> Tính thi đua
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRefreshData} disabled={isLoading} className="h-10 w-10 p-0 text-emerald-400/50 hover:text-emerald-300 shrink-0" title="Tải lại dữ liệu">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>

        {/* Summary Cards - below buttons, visible when results exist */}
        {(displayContracts.length > 0 || nydData.length > 0) && (
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
                <div className="flex items-center gap-2"><UserPlus className="w-4 h-4 text-violet-400" /><div className="flex-1"><p className="text-xs font-bold text-violet-300">{isActivityRoundMode(conditionType) ? getConditionLabel(conditionType) : conditionType === 'total_afyp' ? 'Tổng AFYP' : 'Tổng IP'} (NTD)</p><p className="text-[10px] text-violet-400/60">{isActivityRoundMode(conditionType) ? `TVV có IP ≥ ${formatNumber(isStandardMode(conditionType) ? luotHDCTThreshold : luotHDThreshold)}/tháng = 1 lượt${isStandardMode(conditionType) ? ' (Chuẩn)' : ''}` : `Tổng FYP${includeIndividualTN ? ' + IP cá nhân' : ''}`}</p></div><div className="text-right"><p className="text-[10px] text-violet-400/60">Tổng thưởng</p><p className="text-base font-extrabold text-violet-400">{formatCurrency(nydTotalBonus)}</p></div></div>
              </div>
            )}
          </div>
        )}

        {/* Source Data - collapsible */}
        <Card className={`${neonBorder} bg-white/5 backdrop-blur-sm`}>
          <CardHeader className="pb-2 pt-3 px-4">
            <button className="flex items-center justify-between w-full" onClick={() => setShowSourceData(!showSourceData)}>
              <div className="flex items-center gap-2"><Database className="w-4 h-4 text-emerald-400/60" /><CardTitle className="text-sm text-emerald-200">Dữ liệu nguồn</CardTitle><Badge variant="secondary" className="text-[10px]">{contracts.length} HĐ</Badge></div>
              {showSourceData ? <ChevronUp className="w-4 h-4 text-emerald-400/60" /> : <ChevronDown className="w-4 h-4 text-emerald-400/60" />}
            </button>
          </CardHeader>
          {showSourceData && (
            <CardContent className="px-4 pb-3">
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
          )}
        </Card>
      </main>

      {/* Result Dialog Popup - White theme, only poster + detail table */}
      <Dialog open={isResultDialogOpen} onOpenChange={(open) => { setIsResultDialogOpen(open); if (!open) setIsResultExpanded(false); }}>
        <DialogContent className={`${isResultExpanded ? 'sm:max-w-5xl max-h-[95vh]' : 'sm:max-w-2xl max-h-[67vh]'} overflow-y-auto bg-white border-emerald-500/30 p-0 transition-all duration-300`}>
          {/* Action bar */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between">
            <DialogTitle className="text-emerald-600 text-base font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-600" />
              Kết quả chi tiết
            </DialogTitle>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setIsResultExpanded(!isResultExpanded)} className="border-gray-300 text-gray-700 h-7 w-7 p-0 hover:bg-gray-100">
                {isResultExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </Button>
              <Button variant="outline" size="sm" onClick={handleShareImage} disabled={isDownloadingImage} className="border-gray-300 text-gray-700 h-7 text-xs hover:bg-gray-100">
                {isDownloadingImage ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ImageIcon className="w-3 h-3 mr-1" />}Chia sẻ ảnh
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadImage} disabled={isDownloadingImage} className="border-gray-300 text-gray-700 h-7 text-xs hover:bg-gray-100">
                {isDownloadingImage ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Camera className="w-3 h-3 mr-1" />}Tải ảnh
              </Button>
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
                              {secondaryTotalAFYPMin > 0 && <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center bg-amber-800/60">Tổng AFYP</TableHead>}
                              {secondaryTotalIPMin > 0 && <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center bg-amber-800/60">Tổng IP</TableHead>}
                            </>
                          )}
                          {includeIndividualTN && (
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
                              <div>SL TVV ĐẠT THI ĐUA</div>
                              {!includeTNInPassCount && <div className="text-[9px] font-bold text-amber-400 italic">(KO tính TN)</div>}
                              {referenceContestId && (() => { const rc = savedContests.find(sc => sc.id === referenceContestId); return rc ? <div className="text-[9px] font-bold text-purple-400 italic">{rc.title}</div> : null; })()}
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
                            {showSecondaryTotalColumn && (
                              <>
                                {secondaryTotalAFYPMin > 0 && <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center bg-amber-800/60">Tổng AFYP</TableHead>}
                                {secondaryTotalIPMin > 0 && <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center bg-amber-800/60">Tổng IP</TableHead>}
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
                          <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center">IP</TableHead>
                          {useSecondaryCondition && secondaryAFYPMin > 0 && (
                            <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center">AFYP</TableHead>
                          )}
                          {showSecondaryTotalColumn && (
                            <>
                              {secondaryTotalAFYPMin > 0 && <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center bg-amber-800/60">Tổng AFYP</TableHead>}
                              {secondaryTotalIPMin > 0 && <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center bg-amber-800/60">Tổng IP</TableHead>}
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
                              {secondaryTotalAFYPMin > 0 && conditionType !== 'total_afyp' && <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center bg-amber-800/60">Tổng AFYP</TableHead>}
                              {secondaryTotalIPMin > 0 && conditionType !== 'total_ip' && <TableHead className="text-yellow-100 min-w-[70px] font-bold uppercase text-center bg-amber-800/60">Tổng IP</TableHead>}
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
                          p1RecruitCount = calculateLuot(p1Recruited, isStandardMode(conditionType) ? luotHDCTThreshold : luotHDThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
                          p1RecruitFYP = p1Recruited.reduce((s, c) => s + c.pdt10DT, 0);
                        } else {
                          const p1RecruitedMap = new Map<string, number>();
                          for (const rc of p1Recruited) { p1RecruitedMap.set(rc.agentCode, (p1RecruitedMap.get(rc.agentCode) || 0) + rc.pdt10DT); }
                          for (const [, af] of p1RecruitedMap) { if (af >= luotHDThreshold) p1RecruitCount++; p1RecruitFYP += af; }
                        }
                        const p1OwnFYP = p1Contracts.filter(c => c.agentCode === nyd.nydCode).reduce((s, c) => s + c.pdt10DT, 0);
                        const p1Value = isActivityRoundMode(conditionType) ? p1RecruitCount : (p1RecruitFYP + (includeIndividualTN ? p1OwnFYP : 0));
                        const p1Res = calculateBonusWithTiers(p1Value, bonusTiers);
                        const p1Bonus = p1Res.tier ? computeBonusFromTier(p1Res.tier, p1Value, p1RecruitCount) : 0;

                        // Phase 2
                        const p2Recruited = p2Contracts.filter(c => c.maDaiLyTD === nyd.nydCode && c.agentCode !== nyd.nydCode);
                        let p2RecruitCount = 0;
                        let p2RecruitFYP = 0;
                        if (isActivityRoundMode(conditionType)) {
                          p2RecruitCount = calculateLuot(p2Recruited, isStandardMode(conditionType) ? luotHDCTThreshold : luotHDThreshold, conditionType, tvv90MaxMonths, tvv90MinIP);
                          p2RecruitFYP = p2Recruited.reduce((s, c) => s + c.pdt10DT, 0);
                        } else {
                          const p2RecruitedMap = new Map<string, number>();
                          for (const rc of p2Recruited) { p2RecruitedMap.set(rc.agentCode, (p2RecruitedMap.get(rc.agentCode) || 0) + rc.pdt10DT); }
                          for (const [, af] of p2RecruitedMap) { if (af >= luotHDThreshold) p2RecruitCount++; p2RecruitFYP += af; }
                        }
                        const p2OwnFYP = p2Contracts.filter(c => c.agentCode === nyd.nydCode).reduce((s, c) => s + c.pdt10DT, 0);
                        const p2Value = isActivityRoundMode(conditionType) ? p2RecruitCount : (p2RecruitFYP + (includeIndividualTN ? p2OwnFYP : 0));
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
                          {includeIndividualTN && (
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
                      const tvvPassCount = getGroupTVVPassCount(g);
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

                      // Bảng đơn giản cho TVV đạt thi đua: STT - NHÓM - MÃ TN - HỌ TÊN TN - SL TVV đạt thi đua - THƯỞNG - GHI CHÚ
                      if (isTVVPassCountMode(conditionType)) {
                        return (
                          <TableRow key={group.maNhom} className={`${effectiveTier ? 'bg-white' : 'bg-red-50'} hover:bg-emerald-50 border-b border-gray-200`}>
                            <TableCell className="text-center text-gray-400 text-xs whitespace-nowrap">{idx + 1}</TableCell>
                            <TableCell className="text-xs text-gray-800 whitespace-nowrap"><span className="font-semibold text-emerald-700">{group.nhom || group.maNhom}</span></TableCell>
                            <TableCell className="text-xs text-gray-600 font-mono whitespace-nowrap">{group.leader?.agentCode || '—'}</TableCell>
                            <TableCell className="text-xs text-gray-800 whitespace-nowrap"><span className="font-medium">{group.leader?.agentName || '—'}</span></TableCell>
                            <TableCell className="text-center text-xs whitespace-nowrap">
                              <span className="text-gray-900 font-bold text-base">{tvvPassCount}</span>
                              <span className="text-gray-500 text-xs ml-1">TVV</span>
                            </TableCell>
                            <TableCell className="text-right bg-emerald-50 whitespace-nowrap">{effectiveTier ? <span className="flex items-center justify-end gap-1">{effectiveTier.bonusType === 'gift' ? <Gift className="w-4 h-4 text-pink-500" /> : <Award className="w-4 h-4 text-amber-500" />}<span className="font-bold text-emerald-600 text-sm">{formatBonusAmount(effectiveTier, tvvPassCount)}</span></span> : <span className="text-gray-400 text-xs">—</span>}</TableCell>
                            <TableCell className="whitespace-nowrap">{!effectiveTier && remaining !== null ? <span className="text-[10px] italic text-gray-400">Cần thêm {remaining} TVV</span> : !effectiveTier ? <span className="text-[10px] italic text-gray-400">Chưa đạt</span> : null}</TableCell>
                          </TableRow>
                        );
                      }

                      return (
                        <TableRow key={group.maNhom} className={`${effectiveTier ? 'bg-white' : 'bg-red-50'} hover:bg-emerald-50 border-b border-gray-200`}>
                          <TableCell className="text-center text-gray-400 text-xs whitespace-nowrap">{idx + 1}</TableCell>
                          <TableCell className="text-xs text-gray-800 whitespace-nowrap"><span className="font-semibold text-emerald-700">{group.nhom || group.maNhom}</span></TableCell>
                          <TableCell className="text-xs text-gray-600 font-mono whitespace-nowrap">{group.leader?.agentCode || '—'}</TableCell>
                          <TableCell className="text-xs text-gray-800 whitespace-nowrap"><span className="font-medium">{group.leader?.agentName || '—'}</span></TableCell>
                          <TableCell className="text-xs text-gray-600 whitespace-nowrap">{group.leader?.position || '—'}</TableCell>
                          <TableCell className="text-right text-xs whitespace-nowrap">
                            {isActivityRoundMode(conditionType)
                              ? <span className="text-gray-900">{group.activityRounds} {isStandardMode(conditionType) ? 'Lượt chuẩn' : 'Lượt'}</span>
                              : <span className="text-gray-900">{formatNumber(group.totalFYP)}</span>
                            }
                          </TableCell>
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
                      const { tier } = calculateBonus(c.pdt10DT);
                      const remaining = getRemainingToNextTier(c.pdt10DT);
                      const phaseInfo = getRowPhaseBonus(c.pdt10DT, c.effectiveDate);
                      // Kiểm tra điều kiện bổ sung Tổng AFYP/Tổng IP cho TVV
                      const agentContracts = displayContracts.filter(ac => ac.agentCode === c.agentCode);
                      const secondaryCheck = checkSecondaryTotalCondition(agentContracts);
                      const secondaryPassed = secondaryCheck.passed;
                      const effectiveTier = secondaryPassed ? tier : (secondaryTotalAFYPMin > 0 || secondaryTotalIPMin > 0 ? null : tier);
                      return { contract: c, tier, remaining, phaseInfo, secondaryCheck, secondaryPassed, effectiveTier };
                    }).sort((a, b) => b.contract.pdt10DT - a.contract.pdt10DT).map(({ contract, tier, remaining, phaseInfo, secondaryCheck, secondaryPassed, effectiveTier }, idx) => {
                      if (hideNotAchieved && !tier) return null;
                      if (!contract.nhom && !contract.maNhom) return null;
                      return (
                        <TableRow key={contract.id} className={`${effectiveTier ? 'bg-white' : 'bg-red-50'} hover:bg-emerald-50 border-b border-gray-200`}>
                          <TableCell className="text-center text-gray-400 text-xs whitespace-nowrap">{idx + 1}</TableCell>
                          <TableCell className="text-xs text-emerald-700 font-semibold whitespace-nowrap">{contract.nhom || contract.maNhom}</TableCell>
                          <TableCell className="text-xs text-gray-600 font-mono whitespace-nowrap">{contract.agentCode}</TableCell>
                          <TableCell className="text-xs text-gray-800 whitespace-nowrap">{contract.agentName}</TableCell>
                          <TableCell className="text-center text-xs text-gray-600 whitespace-nowrap">{formatDate(contract.effectiveDate)}</TableCell>
                          <TableCell className="text-right text-xs text-gray-900 whitespace-nowrap">{formatNumber(contract.pdt10DT)}</TableCell>
                          {useSecondaryCondition && secondaryAFYPMin > 0 && (
                            <TableCell className="text-right text-xs text-gray-600 whitespace-nowrap">{formatNumber(contract.afyp)}</TableCell>
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
                            <TableCell className="text-right bg-emerald-50 whitespace-nowrap">{effectiveTier ? <span className="flex items-center justify-end gap-1">{effectiveTier.bonusType === 'gift' ? <Gift className="w-4 h-4 text-pink-500" /> : <Award className="w-4 h-4 text-amber-500" />}<span className="font-bold text-emerald-600 text-sm">{formatBonusAmount(effectiveTier, contract.pdt10DT)}</span></span> : <span className="text-gray-400 text-xs">—</span>}</TableCell>
                          )}
                          <TableCell className="whitespace-nowrap">{!effectiveTier && remaining !== null ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? 'Chưa đạt ĐKB' : `Cần thêm ${formatNumber(remaining)}`}</span> : !effectiveTier ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? 'Chưa đạt ĐKB' : 'Chưa đạt'}</span> : null}</TableCell>
                        </TableRow>
                      );
                    }) : (() => {
                      // total_ip / total_afyp mode for TVV: use pre-computed tvvTotalRows (includes TVV with 0 contracts)
                      return tvvTotalRows.map(({ agent, value, tier, remaining, phaseInfo }, idx) => {
                        if (hideNotAchieved && !tier) return null;
                        if (!agent.nhom && !agent.maNhom) return null;
                        // Kiểm tra điều kiện bổ sung Tổng AFYP/Tổng IP
                        const agentContracts = displayContracts.filter(c => c.agentCode === agent.agentCode);
                        const secondaryCheck = checkSecondaryTotalCondition(agentContracts);
                        const secondaryPassed = secondaryCheck.passed;
                        // Nếu có điều kiện bổ sung mà không đạt → không được thưởng (nhưng vẫn hiển thị)
                        const effectiveTier = secondaryPassed ? tier : (secondaryTotalAFYPMin > 0 || secondaryTotalIPMin > 0 ? null : tier);
                        return (
                          <TableRow key={agent.agentCode} className={`${effectiveTier ? 'bg-white' : 'bg-red-50'} hover:bg-emerald-50 border-b border-gray-200`}>
                            <TableCell className="text-center text-gray-400 text-xs whitespace-nowrap">{idx + 1}</TableCell>
                            <TableCell className="text-xs text-emerald-700 font-semibold whitespace-nowrap">{agent.nhom || agent.maNhom}</TableCell>
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
                            <TableCell className="whitespace-nowrap">{!effectiveTier && remaining !== null ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? 'Chưa đạt ĐKB' : `Cần thêm ${formatNumber(remaining)}`}</span> : !effectiveTier ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? 'Chưa đạt ĐKB' : 'Chưa đạt'}</span> : null}</TableCell>
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

      {/* Subject Dialog - Nhập đối tượng thi đua */}
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
            {thiDuaSubjects.trim() && (
              <div className="rounded-lg bg-sky-500/10 border border-sky-500/20 p-2 text-xs text-sky-300">
                <p className="font-medium">Đã nhập {subjectCodes.length} đối tượng</p>
              </div>
            )}
            {(targetType === 'tvv' ? contracts.length > 0 : targetType === 'nyd' ? recruiterList.length > 0 : staffList.length > 0) && (
              <div className="space-y-1">
                <Label className="text-xs text-emerald-300/70">Đối tượng có sẵn ({targetType === 'tvv' ? 'TVV' : targetType === 'nyd' ? 'NTD' : 'Nhóm'}):</Label>
                <div className="max-h-24 overflow-y-auto rounded-lg border border-gray-600/50 p-1.5">
                  <div className="flex flex-wrap gap-1">
                    {targetType === 'tvv'
                      ? [...new Set(contracts.map(c => c.agentCode))].map(code => (
                          <button key={code} onClick={() => setThiDuaSubjects(prev => prev ? prev + '\n' + code : code)} className="px-1.5 py-0.5 text-[9px] bg-gray-800/50 hover:bg-sky-500/10 border border-gray-600/50 text-emerald-200/70 hover:text-sky-400 rounded cursor-pointer transition-colors">{code}</button>
                        ))
                      : targetType === 'nyd'
                        ? recruiterList.map(r => (
                            <button key={r.agentCode} onClick={() => setThiDuaSubjects(prev => prev ? prev + '\n' + r.agentCode : r.agentCode)} className="px-1.5 py-0.5 text-[9px] bg-gray-800/50 hover:bg-sky-500/10 border border-gray-600/50 text-emerald-200/70 hover:text-sky-400 rounded cursor-pointer transition-colors">{r.agentCode}</button>
                          ))
                        : [...new Map(staffList.filter(s => s.maNhom).map(s => [s.maNhom, { maNhom: s.maNhom, nhom: s.nhom }])).values()].map(g => (
                            <button key={g.maNhom} onClick={() => setThiDuaSubjects(prev => prev ? prev + '\n' + g.maNhom : g.maNhom)} className="px-1.5 py-0.5 text-[9px] bg-gray-800/50 hover:bg-sky-500/10 border border-gray-600/50 text-emerald-200/70 hover:text-sky-400 rounded cursor-pointer transition-colors">{g.nhom || g.maNhom}</button>
                          ))
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setThiDuaSubjects(''); }} className="h-8 border-red-500/30 text-red-400 bg-transparent hover:bg-red-500/10"><Trash2 className="w-3 h-3 mr-1" /> Xóa tất cả</Button>
            <Button variant="outline" onClick={() => setIsSubjectDialogOpen(false)} className="h-8 border-emerald-500/30 bg-transparent text-emerald-200">Đóng</Button>
            <Button onClick={() => { setIsSubjectDialogOpen(false); toast({ title: 'Đã áp dụng', description: subjectCodes.length > 0 ? `Lọc theo ${subjectCodes.length} đối tượng` : 'Hiển thị tất cả' }); }} className="bg-sky-500/80 hover:bg-sky-600 h-8 border border-sky-500/30">Áp dụng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
