'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/hooks/use-settings';
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
  RefreshCw, CheckCircle2, AlertCircle, Clock,
} from 'lucide-react';
import { NeonDatePicker } from '@/components/neon-date-picker';

interface Contract {
  id: string; contractNumber: string; agentCode: string; agentName: string;
  position: string; ban: string; nhom: string; maNhom: string;
  leaderAgentCode: string; recruiterCode: string;
  startDate: string | null; effectiveDate: string; issueDate: string;
  fyp: number; afyp: number;
  pdt10DT: number; tinhLuot3tr: number; maDaiLyTD: string; ngayBatDauLamViec: string | null;
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

interface MonthlyRevenueRow {
  id: string; month: string; maNhom: string; nhom: string;
  agentCode: string; agentName: string; totalFYP: number;
  totalAFYP: number; contractCount: number; activityRounds: number; note: string;
}

interface SavedContest {
  id: string; title: string; startDate: string; endDate: string;
  issueDate: string | null; conditionType: string; targetType: string;
  bonusTiers: string; posterUrl?: string; participants?: string;
  usePhase2?: boolean; phase2StartDate?: string | null; phase2EndDate?: string | null; bonusTiers2?: string;
  useSecondaryCondition?: boolean; secondaryAFYPMin?: number; secondaryIPMin?: number;
  secondaryLuotHDMin?: number; secondaryLuotHDCMin?: number;
  secondaryLuotHDFilter?: string; secondaryLuotHDCFilter?: string;
  hideNotAchieved?: boolean; includeIndividualNTD?: boolean; includeIndividualTN?: boolean;
  luotHDThreshold?: number; luotHDCTThreshold?: number;
  tvv90MaxMonths?: number; tvv90MinIP?: number;
  csvContractUrl?: string; csvStaffUrl?: string; csvRecruiterUrl?: string;
  createdAt: string; updatedAt: string;
}

type ConditionType = 'per_contract_ip' | 'per_contract_afyp' | 'total_ip' | 'total_afyp' | 'activity_round' | 'activity_round_tvvm' | 'activity_round_standard' | 'activity_round_standard_tvvm' | 'activity_round_tvv90';
type TargetType = 'tvv' | 'nhom' | 'nyd';

function isActivityRoundMode(ct: ConditionType): boolean {
  return ct === 'activity_round' || ct === 'activity_round_tvvm' || ct === 'activity_round_standard' || ct === 'activity_round_standard_tvvm' || ct === 'activity_round_tvv90';
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

const DEFAULT_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vStQqbaHb_1aP-hMzZCiVoeaSobXV5gwqw6iZBoQ0MgpsXiobO1GdCM5zoCoCxVBtxT_Nujjll_MJmC/pub?output=csv';
const DEFAULT_STAFF_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSLOfLKaDdEL8EcAb6kaI6GKt3cFaXLxnwuCgeR63rmn2pQI0wC-aZswNRCDqvt87G0981ibFjmDNG1/pub?output=csv';
const DEFAULT_NYD_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRMzanBhPmqGXv2JXxYHkuaNiWC2YhzOAemkQao1FfW_l2a5-wJnjDeFnxvohS4ydTXusXVey8J3jdA/pub?output=csv';

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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            <div className="bg-emerald-500/10 rounded-lg p-3 text-center border border-emerald-500/30 shadow-[0_0_10px_rgba(0,255,136,0.05)]"><div className="flex items-center justify-center gap-1 mb-1"><FileText className="w-4 h-4 text-emerald-300" /><span className="text-xs text-emerald-300 uppercase font-bold">{targetType === 'nhom' ? 'Nhóm' : targetType === 'nyd' ? 'NYD' : 'HĐ'}</span></div><p className="text-xl font-extrabold text-white">{hasData ? rowCount : '—'}</p></div>
            <div className="bg-emerald-500/10 rounded-lg p-3 text-center border border-emerald-500/30 shadow-[0_0_10px_rgba(0,255,136,0.05)]"><div className="flex items-center justify-center gap-1 mb-1"><Banknote className="w-4 h-4 text-amber-300" /><span className="text-xs text-amber-300 uppercase font-bold">Tổng IP</span></div><p className="text-base font-extrabold text-amber-200">{hasData ? fc(totalFYP) : '—'}</p></div>
            <div className="bg-emerald-500/10 rounded-lg p-3 text-center border border-emerald-500/30 shadow-[0_0_10px_rgba(0,255,136,0.05)]"><div className="flex items-center justify-center gap-1 mb-1"><Users className="w-4 h-4 text-sky-300" /><span className="text-xs text-sky-300 uppercase font-bold">Đạt/Chưa</span></div><p className="text-xl font-extrabold">{hasData ? <><span className="text-emerald-300">{achievedCount}</span><span className="text-white mx-0.5">/</span><span className="text-red-400">{notAchievedCount}</span></> : <span className="text-white">—</span>}</p></div>
            <div className="bg-amber-500/10 rounded-lg p-3 text-center border border-amber-500/30 shadow-[0_0_10px_rgba(255,191,0,0.05)]"><div className="flex items-center justify-center gap-1 mb-1"><Award className="w-4 h-4 text-amber-200" /><span className="text-xs text-amber-200 uppercase font-bold">Tổng Thưởng</span></div><p className="text-base font-extrabold text-white">{hasData ? fc(totalBonus) : '—'}</p></div>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          <div className="bg-emerald-500/10 rounded-lg p-3 text-center border border-emerald-500/30 shadow-[0_0_10px_rgba(0,255,136,0.05)]"><div className="flex items-center justify-center gap-1 mb-1"><FileText className="w-4 h-4 text-emerald-300" /><span className="text-xs text-emerald-300 uppercase font-bold">{targetType === 'nhom' ? 'Nhóm' : targetType === 'nyd' ? 'NYD' : 'HĐ'}</span></div><p className="text-xl font-extrabold text-white">{hasData ? rowCount : '—'}</p></div>
          <div className="bg-emerald-500/10 rounded-lg p-3 text-center border border-emerald-500/30 shadow-[0_0_10px_rgba(0,255,136,0.05)]"><div className="flex items-center justify-center gap-1 mb-1"><Banknote className="w-4 h-4 text-amber-300" /><span className="text-xs text-amber-300 uppercase font-bold">Tổng IP</span></div><p className="text-base font-extrabold text-amber-200">{hasData ? fc(totalFYP) : '—'}</p></div>
          <div className="bg-emerald-500/10 rounded-lg p-3 text-center border border-emerald-500/30 shadow-[0_0_10px_rgba(0,255,136,0.05)]"><div className="flex items-center justify-center gap-1 mb-1"><Users className="w-4 h-4 text-sky-300" /><span className="text-xs text-sky-300 uppercase font-bold">Đạt/Chưa</span></div><p className="text-xl font-extrabold">{hasData ? <><span className="text-emerald-300">{achievedCount}</span><span className="text-white mx-0.5">/</span><span className="text-red-400">{notAchievedCount}</span></> : <span className="text-white">—</span>}</p></div>
          <div className="bg-amber-500/10 rounded-lg p-3 text-center border border-amber-500/30 shadow-[0_0_10px_rgba(255,191,0,0.05)]"><div className="flex items-center justify-center gap-1 mb-1"><Award className="w-4 h-4 text-amber-200" /><span className="text-xs text-amber-200 uppercase font-bold">Tổng Thưởng</span></div><p className="text-base font-extrabold text-white">{hasData ? fc(totalBonus) : '—'}</p></div>
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
  const isAFYP = conditionType === 'per_contract_afyp' || conditionType === 'total_afyp';
  const unitLabel = isAFYP ? 'AFYP' : 'IP';
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
  const { settings } = useSettings();
  const csvUrl = settings.csv_url || DEFAULT_CSV_URL;

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [issueDate, setIssueDate] = useState('');
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
  // Options
  const [hideNotAchieved, setHideNotAchieved] = useState(false);
  const [includeIndividualNTD, setIncludeIndividualNTD] = useState(false);
  const [includeIndividualTN, setIncludeIndividualTN] = useState(false);
  // Configurable thresholds
  const [luotHDThreshold, setLuotHDThreshold] = useState(3_000_000);
  const [luotHDCTThreshold, setLuotHDCTThreshold] = useState(12_000_000);
  const [tvv90MaxMonths, setTvv90MaxMonths] = useState(3);
  const [tvv90MinIP, setTvv90MinIP] = useState(12_000_000);

  const [posterUrl, setPosterUrl] = useState<string>('');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false); // keep for reference but not used for sync button
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
  const [revenueData, setRevenueData] = useState<MonthlyRevenueRow[]>([]);
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
    catch { toast({ title: 'Lỗi', description: 'Không thể tải danh sách hợp đồng', variant: 'destructive' }); }
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

  // Fetch MonthlyRevenue data for revenue numbers
  const fetchRevenue = useCallback(async () => {
    try { const res = await fetch('/api/revenue'); if (res.ok) { const data = await res.json(); setRevenueData(data); } } catch { /* silent */ }
  }, []);
  useEffect(() => { fetchRevenue(); }, [fetchRevenue]);

  // Auto-sync EVERY TIME page opens
  const hasAutoSynced = useRef(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  const doAutoSync = useCallback(async () => {
    if (isImporting) return;
    setSyncStatus('syncing');
    try {
      const urls = [
        settings.csv_url || csvUrl,
        settings.csv_staff_url || DEFAULT_STAFF_CSV_URL,
        settings.csv_nyd_url || DEFAULT_NYD_CSV_URL,
      ];
      const fetchPromises = urls.map(url => {
        if (!url) return Promise.resolve(null);
        return fetch(`/api/import-csv?url=${encodeURIComponent(url)}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => data?.csvData || null)
          .catch(() => null);
      });
      const [contractCsv, staffCsv, recruiterCsv] = await Promise.all(fetchPromises);
      if (!contractCsv && !staffCsv && !recruiterCsv) {
        setSyncStatus('error');
        return;
      }
      const syncRes = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractCsv, staffCsv, recruiterCsv }),
      });
      if (syncRes.ok) {
        const data = await syncRes.json();
        // AWAIT all data fetches so state is updated before setting success
        await Promise.all([fetchContracts(), fetchStaff(), fetchRecruiters(), fetchRevenue()]);
        setSyncStatus('success');
        setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
      } else {
        setSyncStatus('error');
      }
    } catch {
      setSyncStatus('error');
    }
  }, [isImporting, settings.csv_url, settings.csv_staff_url, settings.csv_nyd_url, csvUrl, fetchContracts, fetchStaff, fetchRecruiters, fetchRevenue]);

  useEffect(() => {
    if (hasAutoSynced.current) return;
    hasAutoSynced.current = true;
    const timer = setTimeout(() => { doAutoSync(); }, 800);
    return () => clearTimeout(timer);
  }, [doAutoSync]);

  // Auto re-search when sync completes and search conditions exist
  useEffect(() => {
    if (syncStatus === 'success' && (startDate || endDate)) {
      // Re-search with new data after sync - delay to ensure contracts state is settled
      const timer = setTimeout(() => {
        handleSearchRef.current();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [syncStatus, startDate, endDate]);

  const handleSearch = useCallback(() => {
    if (!startDate && !endDate) { setFilteredContracts([]); toast({ title: 'Thông báo', description: 'Vui lòng nhập ít nhất Ngày hiệu lực từ hoặc đến' }); return; }
    let results = [...contracts];
    if (startDate) { const start = new Date(startDate); results = results.filter((c) => new Date(c.effectiveDate) >= start); }
    if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); results = results.filter((c) => new Date(c.effectiveDate) <= end); }
    if (issueDate) { const issue = new Date(issueDate); results = results.filter((c) => { const cI = new Date(c.issueDate); return cI.getFullYear() === issue.getFullYear() && cI.getMonth() === issue.getMonth() && cI.getDate() === issue.getDate(); }); }
    // Secondary condition filter
    if (useSecondaryCondition) {
      if (secondaryAFYPMin > 0) results = results.filter((c) => c.afyp >= secondaryAFYPMin);
      if (secondaryIPMin > 0) results = results.filter((c) => c.pdt10DT >= secondaryIPMin);
    }
    results.sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());
    setFilteredContracts(results);
    return results;
  }, [startDate, endDate, issueDate, contracts, useSecondaryCondition, secondaryAFYPMin, secondaryIPMin]);

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

  // Filter MonthlyRevenue by contest date range (month range)
  // Lấy TOÀN BỘ doanh số từ MonthlyRevenue (cả năm) — không lọc theo ngày thi đua
  // Vì có chương trình dài hạn, doanh số phải lấy từ file doanh thu cả năm
  const filteredRevenueData = useMemo(() => {
    if (revenueData.length === 0) return [];
    // Nếu có ngày thi đua, lọc theo tháng trong khoảng thi đua
    if (startDate && endDate) {
      const startMonth = startDate.slice(0, 7); // "YYYY-MM"
      const endMonth = endDate.slice(0, 7);
      return revenueData.filter(r => r.month >= startMonth && r.month <= endMonth);
    }
    // Không có ngày → lấy tất cả doanh số cả năm
    return revenueData;
  }, [revenueData, startDate, endDate]);

  // Display revenue data with subject filter applied (for contest revenue calculations)
  const displayRevenueData = useMemo(() => {
    if (targetType === 'tvv') {
      if (subjectCodes.length === 0) return filteredRevenueData;
      return filteredRevenueData.filter(r => subjectCodes.includes(r.agentCode) || subjectCodes.includes(r.agentName));
    }
    if (targetType === 'nhom') {
      const allowedMaNhom = new Set<string>();
      if (subjectCodes.length > 0) {
        for (const code of subjectCodes) {
          const codeLower = norm(code).toLowerCase();
          const staff = staffList.find(s => norm(s.nhom || '').toLowerCase() === codeLower);
          if (staff?.maNhom) allowedMaNhom.add(staff.maNhom);
          else allowedMaNhom.add(code);
        }
      } else {
        for (const s of staffList) {
          if (s.maNhom && !norm(s.nhom || '').toLowerCase().includes('pa')) allowedMaNhom.add(s.maNhom);
        }
      }
      return filteredRevenueData.filter(r => allowedMaNhom.has(r.maNhom));
    }
    if (targetType === 'nyd') {
      if (subjectCodes.length === 0) {
        const ntdCodes = new Set(recruiterList.map(r => r.agentCode));
        return filteredRevenueData.filter(r => ntdCodes.has(r.agentCode));
      }
      return filteredRevenueData.filter(r => subjectCodes.includes(r.agentCode) || subjectCodes.includes(r.agentName));
    }
    return filteredRevenueData;
  }, [filteredRevenueData, subjectCodes, targetType, staffList, recruiterList]);

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
    // But get FYP from MonthlyRevenue
    // Mã số NTD → ánh xạ sang cột maDaiLyTD trong bảng doanh số
    const luotThreshold = isStandardMode(conditionType) ? luotHDCTThreshold : luotHDThreshold;
    // Build revenue lookup by agentCode
    const revenueByAgent = new Map<string, { totalFYP: number; totalAFYP: number; contractCount: number; activityRounds: number }>();
    for (const rv of filteredRevenueData) {
      const key = rv.agentCode || rv.agentName;
      if (!key) continue;
      const existing = revenueByAgent.get(key);
      if (existing) {
        existing.totalFYP += rv.totalFYP;
        existing.totalAFYP += rv.totalAFYP;
        existing.contractCount += rv.contractCount;
        existing.activityRounds += rv.activityRounds;
      } else {
        revenueByAgent.set(key, { totalFYP: rv.totalFYP, totalAFYP: rv.totalAFYP, contractCount: rv.contractCount, activityRounds: rv.activityRounds });
      }
    }
    for (const [nydCode, nyd] of nydMap) {
      // Find all contracts where maDaiLyTD = NTD's agentCode (TVV được tuyển bởi NTD này)
      const recruitedContracts = displayContracts.filter(c => c.maDaiLyTD === nydCode && c.agentCode !== nydCode);

      if (isActivityRoundMode(conditionType)) {
        // Lượt HĐ mode: use activityRounds from MonthlyRevenue for recruited agents
        let totalRounds = 0;
        let totalRecruitFYP = 0;
        const recruitedAgents = new Set(recruitedContracts.map(c => c.agentCode));
        for (const agentCode of recruitedAgents) {
          const rv = revenueByAgent.get(agentCode);
          if (rv) {
            totalRounds += rv.activityRounds;
            totalRecruitFYP += rv.totalFYP;
          }
        }
        nyd.recruitCount = totalRounds;
        nyd.recruitFYP = totalRecruitFYP;
      } else {
        // NTD FYP mode: get FYP from MonthlyRevenue for recruited agents
        let recruitCount = 0;
        let recruitFYP = 0;
        const recruitedAgents = new Set(recruitedContracts.map(c => c.agentCode));
        for (const agentCode of recruitedAgents) {
          const rv = revenueByAgent.get(agentCode);
          const agentFYP = rv?.totalFYP || 0;
          if (agentFYP >= luotHDThreshold) recruitCount++;
          recruitFYP += agentFYP;
        }
        nyd.recruitCount = recruitCount;
        nyd.recruitFYP = recruitFYP;
      }

      // Also add NTD's own FYP from MonthlyRevenue
      const ownRevenue = revenueByAgent.get(nydCode);
      nyd.ownFYP = ownRevenue?.totalFYP || 0;
      nyd.contracts = [...recruitedContracts, ...displayContracts.filter(c => c.agentCode === nydCode)];
    }

    return Array.from(nydMap.values());
  }, [displayContracts, filteredRevenueData, conditionType, recruiterList, subjectCodes, staffList, luotHDThreshold, luotHDCTThreshold]);

  // TVV total mode result rows - bao gồm TẤT CẢ TVV trong DS áp dụng, kể cả không có doanh thu (giá trị 0)
  // Dùng MonthlyRevenue làm nguồn doanh số thay vì HĐ
  const tvvTotalRows = useMemo(() => {
    if (targetType !== 'tvv' || isPerContractMode(conditionType)) return [];
    const isAFYP = conditionType === 'total_afyp';
    const agentMap = new Map<string, {
      agentCode: string; agentName: string; nhom: string; maNhom: string;
      totalFYP: number; totalAFYP: number; contractCount: number; activityRounds: number;
    }>();
    // Từ displayRevenueData (TVV có doanh thu)
    for (const rv of displayRevenueData) {
      const key = rv.agentCode || rv.agentName;
      if (!key) continue;
      const existing = agentMap.get(key);
      if (existing) {
        existing.totalFYP += rv.totalFYP;
        existing.totalAFYP += rv.totalAFYP;
        existing.contractCount += rv.contractCount;
        existing.activityRounds += rv.activityRounds;
      } else {
        agentMap.set(key, {
          agentCode: rv.agentCode, agentName: rv.agentName,
          nhom: rv.nhom || rv.maNhom, maNhom: rv.maNhom,
          totalFYP: rv.totalFYP, totalAFYP: rv.totalAFYP, contractCount: rv.contractCount,
          activityRounds: rv.activityRounds,
        });
      }
    }
    // Thêm TVV từ subjectCodes KHÔNG có trong displayRevenueData (không có doanh thu → giá trị 0)
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
      const value = isAFYP ? agent.totalAFYP : agent.totalFYP;
      const { tier } = calculateBonus(value);
      const remaining = getRemainingToNextTier(value);
      // Phase 2 - split revenue by month
      let phaseInfo = { phase1Bonus: 0, phase2Bonus: 0, phase1Tier: null as BonusTier | null, phase2Tier: null as BonusTier | null };
      if (usePhase2 && phase2StartDate) {
        const p2StartMonth = phase2StartDate.slice(0, 7);
        const agentRevenue = displayRevenueData.filter(rv => rv.agentCode === agent.agentCode || rv.agentName === agent.agentName);
        const p1Revenue = agentRevenue.filter(rv => rv.month < p2StartMonth);
        const p2Revenue = agentRevenue.filter(rv => rv.month >= p2StartMonth);
        const p1Value = isAFYP ? p1Revenue.reduce((s, rv) => s + rv.totalAFYP, 0) : p1Revenue.reduce((s, rv) => s + rv.totalFYP, 0);
        const p2Value = isAFYP ? p2Revenue.reduce((s, rv) => s + rv.totalAFYP, 0) : p2Revenue.reduce((s, rv) => s + rv.totalFYP, 0);
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
  }, [displayRevenueData, targetType, conditionType, subjectCodes, staffList, recruiterList, usePhase2, phase2StartDate, calculateBonus, getRemainingToNextTier, calculateBonusWithTiers, bonusTiers, bonusTiers2, computeBonusFromTier]);

  // Grouped data - CHỈ lấy nhóm từ Staff table (DS TN)
  // Bảng doanh số CHỈ dùng để tính số liệu (FYP, lượt), KHÔNG dùng để lấy thông tin nhóm
  // Thi đua nhóm: nhóm = nguồn chính, doanh số chỉ dùng tính số liệu
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

    // Step 2: Map doanh số từ MonthlyRevenue vào nhóm ĐÃ CÓ
    // Dùng mã nhóm (maNhom) để ánh xạ, hỗ trợ case-insensitive
    const mapKeyIndex = new Map<string, string>(); // lowercase → actual key
    for (const key of map.keys()) {
      mapKeyIndex.set(key.toLowerCase(), key);
    }
    // Aggregate revenue by maNhom from MonthlyRevenue data
    const revenueByNhom = new Map<string, { totalFYP: number; totalAFYP: number; contractCount: number; activityRounds: number }>();
    for (const rv of displayRevenueData) {
      if (!rv.maNhom) continue;
      const existing = revenueByNhom.get(rv.maNhom);
      if (existing) {
        existing.totalFYP += rv.totalFYP;
        existing.totalAFYP += rv.totalAFYP;
        existing.contractCount += rv.contractCount;
        existing.activityRounds += rv.activityRounds;
      } else {
        revenueByNhom.set(rv.maNhom, { totalFYP: rv.totalFYP, totalAFYP: rv.totalAFYP, contractCount: rv.contractCount, activityRounds: rv.activityRounds });
      }
    }
    // Map aggregated revenue into groups
    for (const [rvNhom, rvData] of revenueByNhom) {
      const actualKey = map.get(rvNhom) ? rvNhom : mapKeyIndex.get(rvNhom.toLowerCase());
      const g = actualKey ? map.get(actualKey) : null;
      if (g) {
        g.totalFYP += rvData.totalFYP;
        g.totalAFYP += rvData.totalAFYP;
        g.contractCount += rvData.contractCount;
        g.activityRounds += rvData.activityRounds;
      }
    }

    // Step 3: Activity rounds already populated from MonthlyRevenue (no need to recalculate)

    // Step 4: Calculate memberCount từ Staff table
    for (const g of Array.from(map.values())) {
      g.memberCount = staffList.filter(s => s.maNhom === g.maNhom).length;
    }

    return Array.from(map.values());
  }, [displayRevenueData, targetType, conditionType, staffList, recruiterList, subjectCodes]);

  // Phase 2: Split revenue by month and compute bonus
  const phase2Results = useMemo(() => {
    if (!usePhase2 || !phase2StartDate) return null;
    const p2StartMonth = phase2StartDate.slice(0, 7);
    const phase1Revenue = displayRevenueData.filter(rv => rv.month < p2StartMonth);
    const phase2Revenue = displayRevenueData.filter(rv => rv.month >= p2StartMonth);

    // Calculate Phase 1 bonus
    let phase1Bonus = 0;
    if (targetType === 'nhom') {
      if (isActivityRoundMode(conditionType)) {
        // Aggregate revenue by maNhom for phase 1
        const phase1Grouped = new Map<string, { totalFYP: number; activityRounds: number }>();
        for (const rv of phase1Revenue) {
          if (!rv.maNhom) continue;
          const existing = phase1Grouped.get(rv.maNhom);
          if (existing) {
            existing.totalFYP += rv.totalFYP;
            existing.activityRounds += rv.activityRounds;
          } else {
            phase1Grouped.set(rv.maNhom, { totalFYP: rv.totalFYP, activityRounds: rv.activityRounds });
          }
        }
        for (const [, data] of phase1Grouped) {
          const { tier } = calculateActivityRoundBonusWithTiers(data.activityRounds, bonusTiers);
          if (tier) phase1Bonus += computeBonusFromTier(tier, data.totalFYP, data.activityRounds);
        }
      } else {
        const grouped = new Map<string, number>();
        for (const rv of phase1Revenue) { grouped.set(rv.maNhom, (grouped.get(rv.maNhom) || 0) + rv.totalFYP); }
        for (const [, total] of grouped) { phase1Bonus += getBonusAmountWithTiers(total, bonusTiers); }
      }
    } else if (targetType === 'nyd') {
      // Use Recruiter table as reference for NTD list
      const revenueByAgent = new Map<string, { totalFYP: number; activityRounds: number }>();
      for (const rv of phase1Revenue) {
        const key = rv.agentCode || rv.agentName;
        if (!key) continue;
        const existing = revenueByAgent.get(key);
        if (existing) {
          existing.totalFYP += rv.totalFYP;
          existing.activityRounds += rv.activityRounds;
        } else {
          revenueByAgent.set(key, { totalFYP: rv.totalFYP, activityRounds: rv.activityRounds });
        }
      }
      for (const r of recruiterList) {
        const recruited = displayContracts.filter(c => c.maDaiLyTD === r.agentCode && c.agentCode !== r.agentCode);
        let recruitCount = 0; let recruitFYP = 0;
        if (isActivityRoundMode(conditionType)) {
          const recruitedAgents = new Set(recruited.map(c => c.agentCode));
          for (const agentCode of recruitedAgents) {
            const rv = revenueByAgent.get(agentCode);
            if (rv) { recruitCount += rv.activityRounds; recruitFYP += rv.totalFYP; }
          }
        } else {
          const recruitedAgents = new Set(recruited.map(c => c.agentCode));
          for (const agentCode of recruitedAgents) {
            const rv = revenueByAgent.get(agentCode);
            const agentFYP = rv?.totalFYP || 0;
            if (agentFYP >= luotHDThreshold) recruitCount++;
            recruitFYP += agentFYP;
          }
        }
        const ownRV = revenueByAgent.get(r.agentCode);
        const ownFYP = ownRV?.totalFYP || 0;
        const value = isActivityRoundMode(conditionType) ? recruitCount : (recruitFYP + (includeIndividualTN ? ownFYP : 0));
        const { tier } = calculateBonusWithTiers(value, bonusTiers);
        if (tier) phase1Bonus += computeBonusFromTier(tier, value, recruitCount);
      }
    } else if (isTotalMode(conditionType) && targetType === 'tvv') {
      // TVV total mode: aggregate by agentCode for phase 1
      const isAFYP = conditionType === 'total_afyp';
      const agentMap = new Map<string, { totalFYP: number; totalAFYP: number }>();
      for (const rv of phase1Revenue) {
        const key = rv.agentCode || rv.agentName;
        if (!key) continue;
        const existing = agentMap.get(key);
        if (existing) { existing.totalFYP += rv.totalFYP; existing.totalAFYP += rv.totalAFYP; }
        else { agentMap.set(key, { totalFYP: rv.totalFYP, totalAFYP: rv.totalAFYP }); }
      }
      for (const [, data] of agentMap) {
        const value = isAFYP ? data.totalAFYP : data.totalFYP;
        const { tier } = calculateBonusWithTiers(value, bonusTiers);
        if (tier) phase1Bonus += computeBonusFromTier(tier, value);
      }
    } else {
      for (const rv of phase1Revenue) { phase1Bonus += getBonusAmountWithTiers(rv.totalFYP, bonusTiers); }
    }

    // Calculate Phase 2 bonus
    let phase2Bonus = 0;
    if (targetType === 'nhom') {
      if (isActivityRoundMode(conditionType)) {
        const phase2Grouped = new Map<string, { totalFYP: number; activityRounds: number }>();
        for (const rv of phase2Revenue) {
          if (!rv.maNhom) continue;
          const existing = phase2Grouped.get(rv.maNhom);
          if (existing) {
            existing.totalFYP += rv.totalFYP;
            existing.activityRounds += rv.activityRounds;
          } else {
            phase2Grouped.set(rv.maNhom, { totalFYP: rv.totalFYP, activityRounds: rv.activityRounds });
          }
        }
        for (const [, data] of phase2Grouped) {
          const { tier } = calculateActivityRoundBonusWithTiers(data.activityRounds, bonusTiers2);
          if (tier) phase2Bonus += computeBonusFromTier(tier, data.totalFYP, data.activityRounds);
        }
      } else {
        const grouped = new Map<string, number>();
        for (const rv of phase2Revenue) { grouped.set(rv.maNhom, (grouped.get(rv.maNhom) || 0) + rv.totalFYP); }
        for (const [, total] of grouped) { phase2Bonus += getBonusAmountWithTiers(total, bonusTiers2); }
      }
    } else if (targetType === 'nyd') {
      const revenueByAgent = new Map<string, { totalFYP: number; activityRounds: number }>();
      for (const rv of phase2Revenue) {
        const key = rv.agentCode || rv.agentName;
        if (!key) continue;
        const existing = revenueByAgent.get(key);
        if (existing) {
          existing.totalFYP += rv.totalFYP;
          existing.activityRounds += rv.activityRounds;
        } else {
          revenueByAgent.set(key, { totalFYP: rv.totalFYP, activityRounds: rv.activityRounds });
        }
      }
      for (const r of recruiterList) {
        const recruited = displayContracts.filter(c => c.maDaiLyTD === r.agentCode && c.agentCode !== r.agentCode);
        let recruitCount = 0; let recruitFYP = 0;
        if (isActivityRoundMode(conditionType)) {
          const recruitedAgents = new Set(recruited.map(c => c.agentCode));
          for (const agentCode of recruitedAgents) {
            const rv = revenueByAgent.get(agentCode);
            if (rv) { recruitCount += rv.activityRounds; recruitFYP += rv.totalFYP; }
          }
        } else {
          const recruitedAgents = new Set(recruited.map(c => c.agentCode));
          for (const agentCode of recruitedAgents) {
            const rv = revenueByAgent.get(agentCode);
            const agentFYP = rv?.totalFYP || 0;
            if (agentFYP >= luotHDThreshold) recruitCount++;
            recruitFYP += agentFYP;
          }
        }
        const ownRV = revenueByAgent.get(r.agentCode);
        const ownFYP = ownRV?.totalFYP || 0;
        const value = isActivityRoundMode(conditionType) ? recruitCount : (recruitFYP + (includeIndividualTN ? ownFYP : 0));
        const { tier } = calculateBonusWithTiers(value, bonusTiers2);
        if (tier) phase2Bonus += computeBonusFromTier(tier, value, recruitCount);
      }
    } else if (isTotalMode(conditionType) && targetType === 'tvv') {
      const isAFYP = conditionType === 'total_afyp';
      const agentMap = new Map<string, { totalFYP: number; totalAFYP: number }>();
      for (const rv of phase2Revenue) {
        const key = rv.agentCode || rv.agentName;
        if (!key) continue;
        const existing = agentMap.get(key);
        if (existing) { existing.totalFYP += rv.totalFYP; existing.totalAFYP += rv.totalAFYP; }
        else { agentMap.set(key, { totalFYP: rv.totalFYP, totalAFYP: rv.totalAFYP }); }
      }
      for (const [, data] of agentMap) {
        const value = isAFYP ? data.totalAFYP : data.totalFYP;
        const { tier } = calculateBonusWithTiers(value, bonusTiers2);
        if (tier) phase2Bonus += computeBonusFromTier(tier, value);
      }
    } else {
      for (const rv of phase2Revenue) { phase2Bonus += getBonusAmountWithTiers(rv.totalFYP, bonusTiers2); }
    }

    return { phase1Bonus, phase2Bonus, totalBonus: phase1Bonus + phase2Bonus, phase1Count: phase1Revenue.length, phase2Count: phase2Revenue.length };
  }, [usePhase2, phase2StartDate, displayRevenueData, displayContracts, targetType, conditionType, bonusTiers, bonusTiers2, includeIndividualTN, recruiterList, calculateBonusWithTiers, calculateActivityRoundBonusWithTiers, getBonusAmountWithTiers, luotHDThreshold]);

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

  const getTotalFYPBonus = useCallback((): { totalFYP: number; bonus: number; tier: BonusTier | null; remaining: number | null } => {
    const totalFYP = displayRevenueData.reduce((sum, r) => sum + r.totalFYP, 0);
    const { tier } = calculateBonus(totalFYP); const remaining = getRemainingToNextTier(totalFYP);
    const bonus = tier ? computeBonusFromTier(tier, totalFYP) : 0;
    return { totalFYP, bonus, tier, remaining };
  }, [displayRevenueData, calculateBonus, getRemainingToNextTier]);

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
        title: contestTitle, startDate, endDate, issueDate: issueDate || undefined,
        conditionType, targetType, bonusTiers: JSON.stringify(bonusTiers),
        posterUrl, participants: JSON.stringify(subjectCodes),
        usePhase2, phase2StartDate: phase2StartDate || undefined, phase2EndDate: phase2EndDate || undefined,
        bonusTiers2: JSON.stringify(bonusTiers2),
        useSecondaryCondition, secondaryAFYPMin, secondaryIPMin,
        secondaryLuotHDMin, secondaryLuotHDCMin, secondaryLuotHDFilter, secondaryLuotHDCFilter,
        hideNotAchieved, includeIndividualNTD, includeIndividualTN,
        luotHDThreshold, luotHDCTThreshold, tvv90MaxMonths, tvv90MinIP,
      }) });
      if (res.ok) { const data = await res.json(); toast({ title: 'Thành công', description: data.message }); fetchSavedContests(); }
      else toast({ title: 'Lỗi', description: 'Không thể lưu', variant: 'destructive' });
    } catch { toast({ title: 'Lỗi', description: 'Không thể lưu', variant: 'destructive' }); }
    finally { setIsSaving(false); }
  };

  // Load contest with all new fields
  const handleLoadContest = (contestId: string) => {
    setSelectedContestId(contestId); const contest = savedContests.find(c => c.id === contestId); if (!contest) return;
    setContestTitle(contest.title); setStartDate(new Date(contest.startDate).toISOString().slice(0, 10)); setEndDate(new Date(contest.endDate).toISOString().slice(0, 10));
    setConditionType(contest.conditionType as ConditionType);
    setTargetType((contest.targetType || 'tvv') as TargetType);
    if (contest.issueDate) setIssueDate(new Date(contest.issueDate).toISOString().slice(0, 10)); else setIssueDate('');
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
    // Options
    setHideNotAchieved(contest.hideNotAchieved ?? false);
    setIncludeIndividualNTD(contest.includeIndividualNTD ?? false);
    setIncludeIndividualTN(contest.includeIndividualTN ?? false);
    // Thresholds
    setLuotHDThreshold(contest.luotHDThreshold ?? 3_000_000);
    setLuotHDCTThreshold(contest.luotHDCTThreshold ?? 12_000_000);
    setTvv90MaxMonths(contest.tvv90MaxMonths ?? 3);
    setTvv90MinIP(contest.tvv90MinIP ?? 12_000_000);
    setTimeout(() => handleSearchRef.current(), 100);
  };

  const handleDeleteContest = async (id: string) => {
    try { const res = await fetch(`/api/contests?id=${id}`, { method: 'DELETE' }); if (res.ok) { toast({ title: 'Thành công', description: 'Đã xóa' }); fetchSavedContests(); if (selectedContestId === id) setSelectedContestId(''); } else { const data = await res.json(); toast({ title: 'Lỗi', description: data.error || 'Không thể xóa', variant: 'destructive' }); } }
    catch { toast({ title: 'Lỗi', description: 'Không thể xóa', variant: 'destructive' }); }
    setDeleteConfirmId(null);
  };

  const handleImportFromUrl = async () => {
    setIsImporting(true);
    try {
      // Fetch all 3 CSVs simultaneously
      const urls = [
        settings.csv_url || csvUrl,                     // Contract CSV
        settings.csv_staff_url || DEFAULT_STAFF_CSV_URL, // Staff CSV (DS Nhóm)
        settings.csv_nyd_url || DEFAULT_NYD_CSV_URL,     // Recruiter CSV (DS NTD)
      ];

      const fetchPromises = urls.map(url => {
        if (!url) return Promise.resolve(null);
        return fetch(`/api/import-csv?url=${encodeURIComponent(url)}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => data?.csvData || null)
          .catch(() => null);
      });

      const [contractCsv, staffCsv, recruiterCsv] = await Promise.all(fetchPromises);

      if (!contractCsv && !staffCsv && !recruiterCsv) {
        throw new Error('Không thể tải bất kỳ CSV nào. Vui lòng kiểm tra lại các liên kết.');
      }

      // Send all to sync endpoint
      const syncRes = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractCsv, staffCsv, recruiterCsv }),
      });

      if (!syncRes.ok) {
        const errData = await syncRes.json();
        throw new Error(errData.error || 'Không thể nhập');
      }

      const data = await syncRes.json();
      // AWAIT all data fetches so state is updated before proceeding
      await Promise.all([fetchContracts(), fetchStaff(), fetchRecruiters(), fetchRevenue()]);
      toast({ title: 'Đồng bộ thành công', description: data.message });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
      toast({ title: 'Lỗi nhập', description: msg, variant: 'destructive' });
    } finally { setIsImporting(false); }
  };

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
        const tier = isActivityRoundMode(conditionType) ? calculateActivityRoundBonus(g.activityRounds).tier : calculateBonus(getGroupValue(g)).tier;
        return { group: g, tier, groupPhase };
      }).sort((a, b) => {
        const aValue = isActivityRoundMode(conditionType) ? a.group.activityRounds : a.group.totalFYP;
        const bValue = isActivityRoundMode(conditionType) ? b.group.activityRounds : b.group.totalFYP;
        return bValue - aValue;
      }).forEach(({ group: g, tier, groupPhase }, idx) => {
        const valueLabel = isActivityRoundMode(conditionType) ? `${g.activityRounds} Lượt` : `IP: ${formatNumber(g.totalFYP)}`;
        // Format leader info: Trưởng nhóm (hoặc Trưởng ban với vai trò TN)
        const leaderLabel = g.leader ? `${g.leader.agentCode} ${g.leader.agentName} (${g.leader.position || 'TN'})` : '';
        if (usePhase2 && phase2StartDate) {
          text += `${idx + 1}. ${g.nhom || g.maNhom} | ${leaderLabel} | ${valueLabel} | GD1: ${formatCurrency(groupPhase.phase1Bonus)} | GD2: ${formatCurrency(groupPhase.phase2Bonus)} | Tổng: ${formatCurrency(groupPhase.phase1Bonus + groupPhase.phase2Bonus)}\n`;
        } else {
          text += `${idx + 1}. ${g.nhom || g.maNhom} | ${leaderLabel} | ${valueLabel} | ${tier ? `Thưởng: ${formatBonus(tier, g.totalFYP, g.activityRounds)}` : 'Chưa đạt'}\n`;
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
    if (displayContracts.length === 0 && nydData.length === 0 && groupedData.length === 0 && tvvTotalRows.length === 0) { toast({ title: 'Thông báo', description: 'Không có dữ liệu' }); return; }
    let headers: string[];
    let rows: (string | number)[][];

    if (targetType === 'nyd') {
      headers = ['STT', 'Nhóm', 'Mã số', 'Họ tên', 'Chức vụ', isActivityRoundMode(conditionType) ? getConditionLabel(conditionType) : 'Tổng IP', ...(includeIndividualTN ? ['IP cá nhân'] : []), ...(showRateColumn ? ['Tỷ lệ'] : []), 'Thưởng', 'Ghi chú'];
      rows = nydData.map(n => {
        const value = isActivityRoundMode(conditionType) ? n.recruitCount : (n.recruitFYP + (includeIndividualTN ? n.ownFYP : 0));
        const { tier } = calculateBonus(value);
        const base: (string | number)[] = [n.nhom || '', n.nydCode, n.nydName, n.position || '', isActivityRoundMode(conditionType) ? n.recruitCount : value];
        if (includeIndividualTN) base.push(n.ownFYP);
        if (showRateColumn) base.push(tier ? formatRate(tier) : '');
        base.push(tier ? formatBonusAmount(tier, value, n.recruitCount) : '');
        base.push(tier ? '' : 'Chưa đạt mức');
        return base;
      }).map((r, idx) => [idx + 1, ...r]);
    } else if (targetType === 'nhom') {
      const condHeader = isActivityRoundMode(conditionType) ? (conditionType === 'activity_round_standard' ? 'Lượt HĐ Chuẩn' : conditionType === 'activity_round_tvv90' ? 'Lượt HĐ TVV90' : 'Lượt HĐ') : conditionType === 'total_afyp' ? 'Tổng AFYP' : 'Tổng IP';
      if (usePhase2) {
        headers = ['STT', 'Nhóm', 'Mã TN', 'Tên TN', 'Chức vụ', condHeader, 'Thưởng GD1', 'Thưởng GD2', 'Tổng Thưởng', 'Ghi chú'];
        rows = [...groupedData].map((g) => {
          const groupPhase = getGroupPhaseBonus(g);
          const tier = isActivityRoundMode(conditionType) ? calculateActivityRoundBonus(g.activityRounds).tier : calculateBonus(getGroupValue(g)).tier;
          return { g, tier, groupPhase };
        }).sort((a, b) => {
          const aValue = isActivityRoundMode(conditionType) ? a.g.activityRounds : a.g.totalFYP;
          const bValue = isActivityRoundMode(conditionType) ? b.g.activityRounds : b.g.totalFYP;
          return bValue - aValue;
        }).map(({ g, tier, groupPhase }, idx) => {
          const row: (string | number)[] = [idx + 1, g.nhom || g.maNhom, g.leader?.agentCode || '', g.leader?.agentName || '', g.leader?.position || '', isActivityRoundMode(conditionType) ? `${g.activityRounds} Lượt` : g.totalFYP];
          row.push(groupPhase.phase1Bonus || '', groupPhase.phase2Bonus || '', groupPhase.phase1Bonus + groupPhase.phase2Bonus || '', tier ? '' : 'Chưa đạt mức');
          return row;
        });
      } else {
        headers = ['STT', 'Nhóm', 'Mã TN', 'Tên TN', 'Chức vụ', condHeader, ...(showRateColumn ? ['Tỷ lệ'] : []), 'Thưởng', 'Ghi chú'];
        rows = [...groupedData].map((g) => { const { tier } = isActivityRoundMode(conditionType) ? calculateActivityRoundBonus(g.activityRounds) : calculateBonus(g.totalFYP); return { g, tier }; }).sort((a, b) => {
          const aValue = isActivityRoundMode(conditionType) ? a.g.activityRounds : a.g.totalFYP;
          const bValue = isActivityRoundMode(conditionType) ? b.g.activityRounds : b.g.totalFYP;
          return bValue - aValue;
        }).map(({ g, tier }, idx) => {
          const row: (string | number)[] = [idx + 1, g.nhom || g.maNhom, g.leader?.agentCode || '', g.leader?.agentName || '', g.leader?.position || '', isActivityRoundMode(conditionType) ? `${g.activityRounds} Lượt` : g.totalFYP];
          if (showRateColumn) row.push(tier ? formatRate(tier) : '');
          row.push(tier ? formatBonusAmount(tier, g.totalFYP, g.activityRounds) : '');
          row.push(tier ? '' : 'Chưa đạt mức');
          return row;
        });
      }
    } else {
      // TVV per-contract or total_fyp
      if (isPerContractMode(conditionType)) {
        if (usePhase2) {
          headers = ['STT', 'Nhóm', 'Mã số', 'Họ tên', 'Ngày HL', 'IP', ...(useSecondaryCondition && secondaryAFYPMin > 0 ? ['AFYP'] : []), 'Thưởng GD1', 'Thưởng GD2', 'Tổng Thưởng', 'Ghi chú'];
          rows = [...displayContracts].map((c) => {
            const { tier } = calculateBonus(c.pdt10DT);
            const phaseInfo = getRowPhaseBonus(c.pdt10DT, c.effectiveDate);
            return { c, tier, phaseInfo };
          }).sort((a, b) => b.c.pdt10DT - a.c.pdt10DT).map(({ c, tier, phaseInfo }, idx) => {
            const base: (string | number)[] = [idx + 1, c.nhom || c.maNhom, c.agentCode, c.agentName, formatDate(c.effectiveDate), c.pdt10DT];
            if (useSecondaryCondition && secondaryAFYPMin > 0) base.push(c.afyp);
            base.push(phaseInfo.phase1Bonus || '', phaseInfo.phase2Bonus || '', phaseInfo.phase1Bonus + phaseInfo.phase2Bonus || '', tier ? '' : 'Chưa đạt mức');
            return base;
          });
        } else {
          headers = ['STT', 'Nhóm', 'Mã số', 'Họ tên', 'Ngày HL', 'IP', ...(useSecondaryCondition && secondaryAFYPMin > 0 ? ['AFYP'] : []), ...(showRateColumn ? ['Tỷ lệ'] : []), 'Thưởng', 'Ghi chú'];
          rows = [...displayContracts].map((c) => { const { tier } = calculateBonus(c.pdt10DT); return { c, tier }; }).sort((a, b) => b.c.pdt10DT - a.c.pdt10DT).map(({ c, tier }, idx) => {
            const base: (string | number)[] = [idx + 1, c.nhom || c.maNhom, c.agentCode, c.agentName, formatDate(c.effectiveDate), c.pdt10DT];
            if (useSecondaryCondition && secondaryAFYPMin > 0) base.push(c.afyp);
            if (showRateColumn) base.push(tier ? formatRate(tier) : '');
            base.push(tier ? formatBonusAmount(tier, c.pdt10DT) : '');
            base.push(tier ? '' : 'Chưa đạt mức');
            return base;
          });
        }
      } else {
        // total_ip / total_afyp mode for TVV: use tvvTotalRows (includes TVV with 0 contracts)
        const isAFYP = conditionType === 'total_afyp';
        if (usePhase2) {
          headers = ['STT', 'Nhóm', 'Mã số', 'Họ tên', isAFYP ? 'Tổng AFYP' : 'Tổng IP', 'Thưởng GD1', 'Thưởng GD2', 'Tổng Thưởng', 'Ghi chú'];
          rows = tvvTotalRows.map(({ agent, value, tier, phaseInfo }, idx) =>
            [idx + 1, agent.nhom || agent.maNhom, agent.agentCode, agent.agentName, value, phaseInfo.phase1Bonus || '', phaseInfo.phase2Bonus || '', phaseInfo.phase1Bonus + phaseInfo.phase2Bonus || '', tier ? '' : 'Chưa đạt mức']
          );
        } else {
          headers = ['STT', 'Nhóm', 'Mã số', 'Họ tên', isAFYP ? 'Tổng AFYP' : 'Tổng IP', ...(showRateColumn ? ['Tỷ lệ'] : []), 'Thưởng', 'Ghi chú'];
          rows = tvvTotalRows.map(({ agent, value, tier }, idx) => {
            const row: (string | number)[] = [idx + 1, agent.nhom || agent.maNhom, agent.agentCode, agent.agentName, value];
            if (showRateColumn) row.push(tier ? formatRate(tier) : '');
            row.push(tier ? formatBonusAmount(tier, value) : '');
            row.push(tier ? '' : 'Chưa đạt mức');
            return row;
          });
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
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kết quả thi đua');

    // Sheet 2: Chi tiết hợp đồng — tất cả HĐ được tính vào thi đua
    if (displayContracts.length > 0) {
      const detailHeaders = ['STT', 'Nhóm', 'Mã nhóm', 'Mã TVV', 'Tên TVV', 'Chức vụ', 'Số HĐ', 'Ngày hiệu lực', 'Ngày cấp', 'IP', 'AFYP', 'Mã NTD', 'Bàn'];
      const detailRows: (string | number)[][] = displayContracts.map((c, idx) => [
        idx + 1,
        c.nhom || c.maNhom || '',
        c.maNhom || '',
        c.agentCode || '',
        c.agentName || '',
        c.position || '',
        c.contractNumber || '',
        c.effectiveDate ? formatDate(c.effectiveDate) : '',
        c.issueDate ? formatDate(c.issueDate) : '',
        c.pdt10DT,
        c.afyp,
        c.recruiterCode || '',
        c.ban || '',
      ]);
      const wsDetail = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
      const detailColWidths = detailHeaders.map((h, i) => {
        const maxLen = Math.max(h.length, ...detailRows.map(r => String(r[i] || '').length));
        return { wch: Math.min(maxLen + 2, 30) };
      });
      wsDetail['!cols'] = detailColWidths;
      XLSX.utils.book_append_sheet(wb, wsDetail, 'Chi tiết HĐ');
    }

    XLSX.writeFile(wb, `ket_qua_thi_dua_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
      // Temporarily set width to fit-content for tight capture (no white side borders)
      const el = resultContentRef.current;
      const origWidth = el.style.width;
      const origOverflow = el.style.overflow;
      el.style.width = 'fit-content';
      el.style.overflow = 'hidden';
      const blob = await toBlob(el, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      el.style.width = origWidth;
      el.style.overflow = origOverflow;
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
      const blob = await toBlob(el, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      el.style.width = origWidth;
      el.style.overflow = origOverflow;
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
    const totalFYP = displayRevenueData.reduce((sum, r) => sum + r.totalFYP, 0);
    
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
      if (isActivityRoundMode(conditionType)) return calculateActivityRoundBonus(g.activityRounds).tier;
      return calculateBonus(getGroupValue(g)).tier;
    }).length;
    const nhomTotalFYP = groupedData.reduce((sum, g) => sum + g.totalFYP, 0);
    const nhomTotalBonus = groupedData.reduce((sum, g) => {
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
    
    // total_fyp mode
    const totalFYPValue = displayRevenueData.reduce((sum, r) => sum + r.totalFYP, 0);
    const isTotalModeType = isTotalMode(conditionType) && targetType !== 'nhom';
    const totalValue = isTotalModeType ? (conditionType === 'total_afyp' ? displayRevenueData.reduce((sum, r) => sum + r.totalAFYP, 0) : totalFYPValue) : 0;
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
  }, [displayRevenueData, displayContracts, groupedData, nydData, tvvTotalRows, conditionType, targetType, includeIndividualTN, usePhase2, phase2Results, calculateBonus, getBonusAmount, calculateActivityRoundBonus, getActivityRoundBonusAmount, getRemainingToNextTier, computeBonusFromTier]);

  const { totalFYP, tvvAchievedCount, tvvTotalBonus, nhomAchievedCount, nhomTotalFYP, nhomTotalBonus, arAchievedCount, arNotAchievedCount, arTotalBonus, nydAchievedCount, nydNotAchievedCount, nydTotalBonus, achievedCount, notAchievedCount, baseTotalBonus, totalBonusDisplay, displayTotalFYP, totalFYPValue, totalValue, matchedTotalTier, totalRemaining } = stats;

  const sortedTiers = useMemo(() => [...bonusTiers].sort((a, b) => a.minFYP - b.minFYP), [bonusTiers]);
  const showRateColumn = useMemo(() => hasPercentBonus(bonusTiers), [bonusTiers]);

  // Calculate and show results popup
  const handleCalculate = () => {
    if (!startDate && !endDate) { toast({ title: 'Thông báo', description: 'Vui lòng nhập ít nhất Ngày hiệu lực từ hoặc đến' }); return; }
    let results = [...contracts];
    if (startDate) { const start = new Date(startDate); results = results.filter((c) => new Date(c.effectiveDate) >= start); }
    if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); results = results.filter((c) => new Date(c.effectiveDate) <= end); }
    if (issueDate) { const issue = new Date(issueDate); results = results.filter((c) => { const cI = new Date(c.issueDate); return cI.getFullYear() === issue.getFullYear() && cI.getMonth() === issue.getMonth() && cI.getDate() === issue.getDate(); }); }
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
    if (results.length > 0) {
      toast({ title: 'Thành công', description: `Tìm thấy ${results.length} hợp đồng` });
    } else {
      toast({ title: 'Thông báo', description: 'Không có hợp đồng, hiển thị danh sách đối tượng với giá trị 0' });
    }
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
          {/* Sync status icon */}
          <div className="ml-auto flex items-center gap-1.5">
            {syncStatus === 'syncing' && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400/70">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span className="hidden sm:inline">Đồng bộ...</span>
              </span>
            )}
            {syncStatus === 'success' && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400" title={`Đồng bộ lúc ${lastSyncTime}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{lastSyncTime}</span>
              </span>
            )}
            {syncStatus === 'error' && (
              <span className="flex items-center gap-1 text-[10px] text-red-400" title="Lỗi đồng bộ">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lỗi</span>
              </span>
            )}
            {syncStatus === 'idle' && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400/50" title="Chưa đồng bộ">
                <Clock className="w-3.5 h-3.5" />
              </span>
            )}
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
            <div className="grid grid-cols-3 gap-2">
              <NeonDatePicker label="Hiệu lực từ" value={startDate} onChange={setStartDate} />
              <NeonDatePicker label="Hiệu lực đến" value={endDate} onChange={setEndDate} />
              <NeonDatePicker label="Ngày phát hành" value={issueDate} onChange={setIssueDate} />
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
                    onClick={() => setTargetType('tvv')}
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
                    onClick={() => setTargetType('nyd')}
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

        {/* Action Buttons - Same Row, equal width */}
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/20 h-10 text-[11px] bg-transparent" onClick={handleImportFromUrl} disabled={isImporting}>
            {isImporting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1" />} Đồng bộ
          </Button>
          <Button variant="outline" className="border-sky-500/30 text-sky-400 hover:bg-sky-500/10 h-10 text-[11px] bg-transparent" onClick={() => setIsSubjectDialogOpen(true)}>
            <Users className="w-3.5 h-3.5 mr-1" /> DS đối tượng
            {subjectCodes.length > 0 && <Badge className="ml-1 bg-sky-500 text-white text-[9px] h-4 px-1">{subjectCodes.length}</Badge>}
          </Button>
          <Button onClick={handleCalculate} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 h-10 text-sm font-bold shadow-lg shadow-emerald-600/20 border border-emerald-500/30">
            <Trophy className="w-4 h-4 mr-1" /> Tính thi đua
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
                <div className="flex items-center gap-2"><UserPlus className="w-4 h-4 text-violet-400" /><div className="flex-1"><p className="text-xs font-bold text-violet-300">{isActivityRoundMode(conditionType) ? getConditionLabel(conditionType) : conditionType === 'total_afyp' ? 'Tổng AFYP' : 'Tổng IP'} (NTD)</p><p className="text-[10px] text-violet-400/60">{isActivityRoundMode(conditionType) ? `TVV có IP ≥ ${formatNumber(luotHDThreshold)}/tháng = 1 lượt` : `Tổng FYP${includeIndividualTN ? ' + IP cá nhân' : ''}`}</p></div><div className="text-right"><p className="text-[10px] text-violet-400/60">Tổng thưởng</p><p className="text-base font-extrabold text-violet-400">{formatCurrency(nydTotalBonus)}</p></div></div>
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

              {/* Result Table */}
              <div className="overflow-x-auto border border-gray-200 shadow-sm mt-3">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-emerald-50 hover:bg-emerald-50 [&>th]:whitespace-nowrap">
                      <TableHead className="text-emerald-700 text-center w-[40px] font-bold uppercase">STT</TableHead>
                      {targetType === 'nyd' ? (
                        <>
                          <TableHead className="text-emerald-700 min-w-[60px] font-bold uppercase text-center whitespace-nowrap">NHÓM</TableHead>
                          <TableHead className="text-emerald-700 min-w-[55px] font-bold uppercase text-center whitespace-nowrap">Mã số</TableHead>
                          <TableHead className="text-emerald-700 min-w-[65px] font-bold uppercase text-center whitespace-nowrap">Họ tên</TableHead>
                          <TableHead className="text-emerald-700 min-w-[70px] font-bold uppercase text-center whitespace-nowrap">Chức vụ</TableHead>
                          <TableHead className="text-emerald-700 min-w-[65px] font-bold uppercase text-center whitespace-nowrap">
                            {isActivityRoundMode(conditionType) ? getConditionLabel(conditionType) : conditionType === 'total_afyp' ? 'Tổng AFYP' : 'Tổng IP'}
                          </TableHead>
                          {includeIndividualTN && (
                            <TableHead className="text-emerald-700 min-w-[65px] font-bold uppercase text-center whitespace-nowrap">IP cá nhân</TableHead>
                          )}
                          {showRateColumn && !usePhase2 && (
                            <TableHead className="text-emerald-700 min-w-[50px] font-bold uppercase text-center bg-violet-50 whitespace-nowrap"><Percent className="w-3 h-3 inline -mt-0.5" /> Tỷ lệ</TableHead>
                          )}
                          {usePhase2 ? (
                            <>
                              <TableHead className="text-emerald-700 min-w-[60px] font-bold uppercase text-center bg-emerald-50">
                                <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                <div className="text-[9px] font-normal text-emerald-600/50 italic">GD1: {phase2StartDate ? formatDate(startDate) : '...'} - {phase2StartDate ? formatDate(phase2StartDate) : '...'}</div>
                              </TableHead>
                              <TableHead className="text-emerald-700 min-w-[60px] font-bold uppercase text-center bg-emerald-50">
                                <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                <div className="text-[9px] font-normal text-emerald-600/50 italic">GD2: {phase2StartDate ? formatDate(phase2StartDate) : '...'} - {endDate ? formatDate(endDate) : '...'}</div>
                              </TableHead>
                              <TableHead className="text-emerald-700 min-w-[60px] font-bold uppercase text-center bg-amber-50">
                                <div>Tổng Thưởng</div>
                              </TableHead>
                            </>
                          ) : (
                            <TableHead className="text-emerald-700 min-w-[65px] font-bold uppercase text-center bg-emerald-50">
                              <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                            </TableHead>
                          )}
                          <TableHead className="text-emerald-700 min-w-[60px] font-bold uppercase text-center">Ghi chú</TableHead>
                        </>
                      ) : targetType === 'nhom' ? (
                        <>
                          <TableHead className="text-emerald-700 min-w-[70px] font-bold uppercase text-center">NHÓM</TableHead>
                          <TableHead className="text-emerald-700 min-w-[55px] font-bold uppercase text-center">Mã TN</TableHead>
                          <TableHead className="text-emerald-700 min-w-[80px] font-bold uppercase text-center">Tên Trưởng Nhóm</TableHead>
                          <TableHead className="text-emerald-700 min-w-[60px] font-bold uppercase text-center">Chức vụ</TableHead>
                          <TableHead className="text-emerald-700 min-w-[70px] font-bold uppercase text-center">
                            {isActivityRoundMode(conditionType) ? (conditionType === 'activity_round_standard' ? 'Lượt HĐ Chuẩn' : conditionType === 'activity_round_tvv90' ? 'Lượt HĐ TVV90' : 'Lượt HĐ') : conditionType === 'total_afyp' ? 'Tổng AFYP' : 'Tổng IP'}
                            {startDate && endDate && !isActivityRoundMode(conditionType) && <div className="text-[9px] font-normal text-emerald-600/50 italic">{formatDate(startDate)} - {formatDate(endDate)}</div>}
                          </TableHead>

                          {showRateColumn && !usePhase2 && (
                            <TableHead className="text-emerald-700 min-w-[50px] font-bold uppercase text-center bg-violet-50 whitespace-nowrap"><Percent className="w-3 h-3 inline -mt-0.5" /> Tỷ lệ</TableHead>
                          )}
                          {usePhase2 ? (
                            <>
                              <TableHead className="text-emerald-700 min-w-[60px] font-bold uppercase text-center bg-emerald-50">
                                <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                <div className="text-[9px] font-normal text-emerald-600/50 italic">GD1: {phase2StartDate ? formatDate(startDate) : '...'} - {phase2StartDate ? formatDate(phase2StartDate) : '...'}</div>
                              </TableHead>
                              <TableHead className="text-emerald-700 min-w-[60px] font-bold uppercase text-center bg-emerald-50">
                                <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                <div className="text-[9px] font-normal text-emerald-600/50 italic">GD2: {phase2StartDate ? formatDate(phase2StartDate) : '...'} - {endDate ? formatDate(endDate) : '...'}</div>
                              </TableHead>
                              <TableHead className="text-emerald-700 min-w-[60px] font-bold uppercase text-center bg-amber-50">
                                <div>Tổng Thưởng</div>
                              </TableHead>
                            </>
                          ) : (
                            <TableHead className="text-emerald-700 min-w-[65px] font-bold uppercase text-center bg-emerald-50">
                              <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                            </TableHead>
                          )}
                          <TableHead className="text-emerald-700 min-w-[60px] font-bold uppercase text-center">Ghi chú</TableHead>
                        </>
                      ) : isPerContractMode(conditionType) ? (
                        <>
                          <TableHead className="text-emerald-700 min-w-[70px] font-bold uppercase text-center">NHÓM</TableHead>
                          <TableHead className="text-emerald-700 min-w-[60px] font-bold uppercase text-center">Mã số</TableHead>
                          <TableHead className="text-emerald-700 min-w-[65px] font-bold uppercase text-center">Họ tên</TableHead>
                          <TableHead className="text-emerald-700 text-center w-[85px] font-bold uppercase">Ngày HL</TableHead>
                          <TableHead className="text-emerald-700 min-w-[70px] font-bold uppercase text-center">IP</TableHead>
                          {useSecondaryCondition && secondaryAFYPMin > 0 && (
                            <TableHead className="text-emerald-700 min-w-[70px] font-bold uppercase text-center">AFYP</TableHead>
                          )}
                          {showRateColumn && !usePhase2 && (
                            <TableHead className="text-emerald-700 min-w-[50px] font-bold uppercase text-center bg-violet-50 whitespace-nowrap"><Percent className="w-3 h-3 inline -mt-0.5" /> Tỷ lệ</TableHead>
                          )}
                          {usePhase2 ? (
                            <>
                              <TableHead className="text-emerald-700 min-w-[60px] font-bold uppercase text-center bg-emerald-50">
                                <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                <div className="text-[9px] font-normal text-emerald-600/50 italic">GD1</div>
                              </TableHead>
                              <TableHead className="text-emerald-700 min-w-[60px] font-bold uppercase text-center bg-emerald-50">
                                <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                <div className="text-[9px] font-normal text-emerald-600/50 italic">GD2</div>
                              </TableHead>
                              <TableHead className="text-emerald-700 min-w-[60px] font-bold uppercase text-center bg-amber-50">
                                <div>Tổng Thưởng</div>
                              </TableHead>
                            </>
                          ) : (
                            <TableHead className="text-emerald-700 min-w-[65px] font-bold uppercase text-center bg-emerald-50">
                              <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                            </TableHead>
                          )}
                          <TableHead className="text-emerald-700 min-w-[60px] font-bold uppercase text-center">Ghi chú</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="text-emerald-700 min-w-[70px] font-bold uppercase text-center">NHÓM</TableHead>
                          <TableHead className="text-emerald-700 min-w-[60px] font-bold uppercase text-center">Mã số</TableHead>
                          <TableHead className="text-emerald-700 min-w-[65px] font-bold uppercase text-center">Họ tên</TableHead>
                          <TableHead className="text-emerald-700 min-w-[70px] font-bold uppercase text-center">
                            <div>{conditionType === 'total_afyp' ? 'Tổng AFYP' : 'Tổng IP'}</div>
                            {startDate && endDate && <div className="text-[9px] font-normal text-emerald-600/50 italic">{formatDate(startDate)} - {formatDate(endDate)}</div>}
                          </TableHead>
                          {showRateColumn && !usePhase2 && (
                            <TableHead className="text-emerald-700 min-w-[50px] font-bold uppercase text-center bg-violet-50 whitespace-nowrap"><Percent className="w-3 h-3 inline -mt-0.5" /> Tỷ lệ</TableHead>
                          )}
                          {usePhase2 ? (
                            <>
                              <TableHead className="text-emerald-700 min-w-[60px] font-bold uppercase text-center bg-emerald-50">
                                <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                <div className="text-[9px] font-normal text-emerald-600/50 italic">GD1</div>
                              </TableHead>
                              <TableHead className="text-emerald-700 min-w-[60px] font-bold uppercase text-center bg-emerald-50">
                                <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                <div className="text-[9px] font-normal text-emerald-600/50 italic">GD2</div>
                              </TableHead>
                              <TableHead className="text-emerald-700 min-w-[60px] font-bold uppercase text-center bg-amber-50">
                                <div>Tổng Thưởng</div>
                              </TableHead>
                            </>
                          ) : (
                            <TableHead className="text-emerald-700 min-w-[65px] font-bold uppercase text-center bg-emerald-50">
                              <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                            </TableHead>
                          )}
                          <TableHead className="text-emerald-700 min-w-[60px] font-bold uppercase text-center">Ghi chú</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {targetType === 'nyd' ? nydResultRows.map(({ nyd, tier, value }, idx) => {
                      if (hideNotAchieved && !tier) return null;
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
                        <TableRow key={nyd.nydCode} className={`${tier ? 'bg-white' : 'bg-red-50'} hover:bg-gray-50 border-b border-gray-100`}>
                          <TableCell className="text-center text-gray-400 text-xs whitespace-nowrap">{idx + 1}</TableCell>
                          <TableCell className="text-xs text-gray-800 whitespace-nowrap">{nyd.nhom || '—'}</TableCell>
                          <TableCell className="text-xs text-gray-800 font-mono whitespace-nowrap">{nyd.nydCode}</TableCell>
                          <TableCell className="text-xs text-gray-800 whitespace-nowrap">{nyd.nydName}</TableCell>
                          <TableCell className="text-xs text-gray-800 whitespace-nowrap">{nyd.position || '—'}</TableCell>
                          <TableCell className="text-right text-xs text-violet-600 whitespace-nowrap">
                            {isActivityRoundMode(conditionType) ? `${nyd.recruitCount} Lượt` : formatNumber(value)}
                          </TableCell>
                          {includeIndividualTN && (
                            <TableCell className="text-right text-xs text-gray-600 whitespace-nowrap">{formatNumber(nyd.ownFYP)}</TableCell>
                          )}
                          {showRateColumn && !usePhase2 && (
                            <TableCell className="text-center bg-violet-50 text-xs whitespace-nowrap">{tier ? <span className="font-bold text-violet-400">{formatRate(tier)}</span> : <span className="text-gray-400">—</span>}</TableCell>
                          )}
                          {usePhase2 && phaseBonus ? (
                            <>
                              <TableCell className="text-right bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{phaseBonus.phase1Bonus > 0 ? formatCurrency(phaseBonus.phase1Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                              <TableCell className="text-right bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{phaseBonus.phase2Bonus > 0 ? formatCurrency(phaseBonus.phase2Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                              <TableCell className="text-right bg-amber-50 text-xs font-bold text-amber-600 whitespace-nowrap">{formatCurrency(phaseBonus.phase1Bonus + phaseBonus.phase2Bonus)}</TableCell>
                            </>
                          ) : (
                            <TableCell className="text-right bg-emerald-50 whitespace-nowrap">{tier ? <span className="flex items-center justify-end gap-1">{tier.bonusType === 'gift' ? <Gift className="w-4 h-4 text-pink-500" /> : <Award className="w-4 h-4 text-amber-500" />}<span className="font-bold text-emerald-400 text-sm">{formatBonusAmount(tier, value, nyd.recruitCount)}</span></span> : <span className="text-gray-400 text-xs">—</span>}</TableCell>
                          )}
                          <TableCell className="whitespace-nowrap">{!tier ? <span className="text-[10px] italic text-gray-400">Chưa đạt</span> : null}</TableCell>
                        </TableRow>
                      );
                    }) : targetType === 'nhom' ? [...groupedData].map((g) => {
                      const groupPhase = getGroupPhaseBonus(g);
                      const tier = isActivityRoundMode(conditionType) ? calculateActivityRoundBonus(g.activityRounds).tier : calculateBonus(getGroupValue(g)).tier;
                      const remaining = isActivityRoundMode(conditionType) ? getRemainingToNextActivityRoundTier(g.activityRounds) : getRemainingToNextTier(g.totalFYP);
                      return { group: g, tier, remaining, groupPhase };
                    }).sort((a, b) => {
                      const aValue = isActivityRoundMode(conditionType) ? a.group.activityRounds : a.group.totalFYP;
                      const bValue = isActivityRoundMode(conditionType) ? b.group.activityRounds : b.group.totalFYP;
                      return bValue - aValue;
                    }).map(({ group, tier, remaining, groupPhase }, idx) => {
                      if (hideNotAchieved && !tier) return null;
                      return (
                        <TableRow key={group.maNhom} className={`${tier ? 'bg-white' : 'bg-red-50'} hover:bg-gray-50 border-b border-gray-100`}>
                          <TableCell className="text-center text-gray-400 text-xs whitespace-nowrap">{idx + 1}</TableCell>
                          <TableCell className="text-xs text-gray-800 whitespace-nowrap"><span className="font-semibold text-emerald-400">{group.nhom || group.maNhom}</span></TableCell>
                          <TableCell className="text-xs text-gray-800 font-mono whitespace-nowrap">{group.leader?.agentCode || '—'}</TableCell>
                          <TableCell className="text-xs text-gray-800 whitespace-nowrap"><span className="font-medium">{group.leader?.agentName || '—'}</span></TableCell>
                          <TableCell className="text-xs text-gray-800 whitespace-nowrap">{group.leader?.position || '—'}</TableCell>
                          <TableCell className="text-right text-xs whitespace-nowrap">
                            {isActivityRoundMode(conditionType)
                              ? <span className="text-orange-400">{group.activityRounds} Lượt</span>
                              : <span className="text-white">{formatNumber(group.totalFYP)}</span>
                            }
                          </TableCell>

                          {showRateColumn && !usePhase2 && (
                            <TableCell className="text-center bg-violet-50 text-xs whitespace-nowrap">{tier ? <span className="font-bold text-violet-400">{formatRate(tier)}</span> : <span className="text-gray-400">—</span>}</TableCell>
                          )}
                          {usePhase2 ? (
                            <>
                              <TableCell className="text-right bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{groupPhase.phase1Bonus > 0 ? formatCurrency(groupPhase.phase1Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                              <TableCell className="text-right bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{groupPhase.phase2Bonus > 0 ? formatCurrency(groupPhase.phase2Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                              <TableCell className="text-right bg-amber-50 text-xs font-bold text-amber-600 whitespace-nowrap">{formatCurrency(groupPhase.phase1Bonus + groupPhase.phase2Bonus)}</TableCell>
                            </>
                          ) : (
                            <TableCell className="text-right bg-emerald-50 whitespace-nowrap">{tier ? <span className="flex items-center justify-end gap-1">{tier.bonusType === 'gift' ? <Gift className="w-4 h-4 text-pink-500" /> : <Award className="w-4 h-4 text-amber-500" />}<span className="font-bold text-emerald-400 text-sm">{formatBonusAmount(tier, group.totalFYP, group.activityRounds)}</span></span> : <span className="text-gray-400 text-xs">—</span>}</TableCell>
                          )}
                          <TableCell className="whitespace-nowrap">{!tier && remaining !== null ? <span className="text-[10px] italic text-gray-400">Cần thêm {isActivityRoundMode(conditionType) ? `${remaining} lượt` : formatNumber(remaining)}</span> : !tier ? <span className="text-[10px] italic text-gray-400">Chưa đạt</span> : null}</TableCell>
                        </TableRow>
                      );
                    }) : isPerContractMode(conditionType) ? [...displayContracts].map((c) => {
                      const { tier } = calculateBonus(c.pdt10DT);
                      const remaining = getRemainingToNextTier(c.pdt10DT);
                      const phaseInfo = getRowPhaseBonus(c.pdt10DT, c.effectiveDate);
                      return { contract: c, tier, remaining, phaseInfo };
                    }).sort((a, b) => b.contract.pdt10DT - a.contract.pdt10DT).map(({ contract, tier, remaining, phaseInfo }, idx) => {
                      if (hideNotAchieved && !tier) return null;
                      return (
                        <TableRow key={contract.id} className={`${tier ? 'bg-white' : 'bg-red-50'} hover:bg-gray-50 border-b border-gray-100`}>
                          <TableCell className="text-center text-gray-400 text-xs whitespace-nowrap">{idx + 1}</TableCell>
                          <TableCell className="text-xs text-gray-800 whitespace-nowrap">{contract.nhom || contract.maNhom}</TableCell>
                          <TableCell className="text-xs text-gray-800 font-mono whitespace-nowrap">{contract.agentCode}</TableCell>
                          <TableCell className="text-xs text-gray-800 whitespace-nowrap">{contract.agentName}</TableCell>
                          <TableCell className="text-center text-xs text-emerald-300/50 whitespace-nowrap">{formatDate(contract.effectiveDate)}</TableCell>
                          <TableCell className="text-right text-xs text-white whitespace-nowrap">{formatNumber(contract.pdt10DT)}</TableCell>
                          {useSecondaryCondition && secondaryAFYPMin > 0 && (
                            <TableCell className="text-right text-xs text-gray-600 whitespace-nowrap">{formatNumber(contract.afyp)}</TableCell>
                          )}
                          {showRateColumn && !usePhase2 && (
                            <TableCell className="text-center bg-violet-50 text-xs whitespace-nowrap">{tier ? <span className="font-bold text-violet-400">{formatRate(tier)}</span> : <span className="text-gray-400">—</span>}</TableCell>
                          )}
                          {usePhase2 ? (
                            <>
                              <TableCell className="text-right bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{phaseInfo.phase1Bonus > 0 ? formatCurrency(phaseInfo.phase1Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                              <TableCell className="text-right bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{phaseInfo.phase2Bonus > 0 ? formatCurrency(phaseInfo.phase2Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                              <TableCell className="text-right bg-amber-50 text-xs font-bold text-amber-600 whitespace-nowrap">{formatCurrency(phaseInfo.phase1Bonus + phaseInfo.phase2Bonus)}</TableCell>
                            </>
                          ) : (
                            <TableCell className="text-right bg-emerald-50 whitespace-nowrap">{tier ? <span className="flex items-center justify-end gap-1">{tier.bonusType === 'gift' ? <Gift className="w-4 h-4 text-pink-500" /> : <Award className="w-4 h-4 text-amber-500" />}<span className="font-bold text-emerald-400 text-sm">{formatBonusAmount(tier, contract.pdt10DT)}</span></span> : <span className="text-gray-400 text-xs">—</span>}</TableCell>
                          )}
                          <TableCell className="whitespace-nowrap">{!tier && remaining !== null ? <span className="text-[10px] italic text-gray-400">Cần thêm {formatNumber(remaining)}</span> : !tier ? <span className="text-[10px] italic text-gray-400">Chưa đạt</span> : null}</TableCell>
                        </TableRow>
                      );
                    }) : (() => {
                      // total_ip / total_afyp mode for TVV: use pre-computed tvvTotalRows (includes TVV with 0 contracts)
                      return tvvTotalRows.map(({ agent, value, tier, remaining, phaseInfo }, idx) => {
                        if (hideNotAchieved && !tier) return null;
                        return (
                          <TableRow key={agent.agentCode} className={`${tier ? 'bg-white' : 'bg-red-50'} hover:bg-gray-50 border-b border-gray-100`}>
                            <TableCell className="text-center text-gray-400 text-xs whitespace-nowrap">{idx + 1}</TableCell>
                            <TableCell className="text-xs text-gray-800 whitespace-nowrap">{agent.nhom || agent.maNhom}</TableCell>
                            <TableCell className="text-xs text-gray-800 font-mono whitespace-nowrap">{agent.agentCode}</TableCell>
                            <TableCell className="text-xs text-gray-800 whitespace-nowrap">{agent.agentName}</TableCell>
                            <TableCell className="text-right text-xs text-white whitespace-nowrap">{formatNumber(value)}</TableCell>
                            {showRateColumn && !usePhase2 && (
                              <TableCell className="text-center bg-violet-50 text-xs whitespace-nowrap">{tier ? <span className="font-bold text-violet-400">{formatRate(tier)}</span> : <span className="text-gray-400">—</span>}</TableCell>
                            )}
                            {usePhase2 ? (
                              <>
                                <TableCell className="text-right bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{phaseInfo.phase1Bonus > 0 ? formatCurrency(phaseInfo.phase1Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                                <TableCell className="text-right bg-emerald-50 text-xs font-semibold text-emerald-600 whitespace-nowrap">{phaseInfo.phase2Bonus > 0 ? formatCurrency(phaseInfo.phase2Bonus) : <span className="text-gray-400">—</span>}</TableCell>
                                <TableCell className="text-right bg-amber-50 text-xs font-bold text-amber-600 whitespace-nowrap">{formatCurrency(phaseInfo.phase1Bonus + phaseInfo.phase2Bonus)}</TableCell>
                              </>
                            ) : (
                              <TableCell className="text-right bg-emerald-50 whitespace-nowrap">{tier ? <span className="flex items-center justify-end gap-1">{tier.bonusType === 'gift' ? <Gift className="w-4 h-4 text-pink-500" /> : <Award className="w-4 h-4 text-amber-500" />}<span className="font-bold text-emerald-400 text-sm">{formatBonusAmount(tier, value)}</span></span> : <span className="text-gray-400 text-xs">—</span>}</TableCell>
                            )}
                            <TableCell className="whitespace-nowrap">{!tier && remaining !== null ? <span className="text-[10px] italic text-gray-400">Cần thêm {formatNumber(remaining)}</span> : !tier ? <span className="text-[10px] italic text-gray-400">Chưa đạt</span> : null}</TableCell>
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
