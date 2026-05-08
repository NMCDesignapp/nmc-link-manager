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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import {
  Plus, Trash2, Trophy, FileText, TrendingUp, Database,
  Download, X, Link, Loader2, Printer, Copy, Save, BookmarkPlus,
  Sparkles, Target, Award, Users, Banknote, CalendarRange, Gift,
  UserCheck, Percent, Image as ImageIcon, ChevronDown, ChevronUp, ArrowLeft,
  Camera, UserPlus, EyeOff, Filter, Layers, Settings2, Maximize2, Minimize2,
} from 'lucide-react';

interface Contract {
  id: string; contractNumber: string; agentCode: string; agentName: string;
  position: string; ban: string; nhom: string; maNhom: string;
  leaderAgentCode: string; recruiterCode: string;
  startDate: string | null; effectiveDate: string; issueDate: string;
  fyp: number; afyp: number; tinhLuot: number;
}

interface BonusTier {
  id: string; minFYP: number; maxFYP: number | null; bonusAmount: number;
  bonusType: 'money' | 'gift' | 'percent' | 'money_per_round' | 'percent_fyc'; bonusText: string; bonusPercent: number;
}

interface GroupData {
  maNhom: string; nhom: string; leaderName: string; leaderCode: string; totalFYP: number;
  contractCount: number; activityRounds: number; contracts: Contract[];
}

interface NYDData {
  nydCode: string;
  nydName: string;
  nhom: string;
  position: string;
  recruitCount: number;
  recruitFYP: number;
  ownFYP: number;
  contracts: Contract[];
}

interface StaffMember {
  id: string; agentCode: string; agentName: string;
  position: string; ban: string; nhom: string; maNhom: string;
  leaderAgentCode: string; recruiterCode: string;
  startDate: string | null;
}

interface RecruiterMember {
  id: string; nydCode: string; nydName: string;
  position: string; ban: string; nhom: string; maNhom: string;
  recruitedAgentCode: string; recruitedAgentName: string;
  recruitedStartDate: string | null;
}

interface SavedContest {
  id: string; title: string; startDate: string; endDate: string;
  issueDate: string | null; conditionType: string; targetType: string;
  bonusTiers: string; posterUrl?: string; participants?: string;
  usePhase2?: boolean; phase2StartDate?: string | null; phase2EndDate?: string | null; bonusTiers2?: string;
  useSecondaryCondition?: boolean; secondaryAFYPMin?: number; secondaryIPMin?: number;
  hideNotAchieved?: boolean; useTVVmFilter?: boolean; useTVV90Filter?: boolean; includeOwnNYD?: boolean;
  csvContractUrl?: string; csvStaffUrl?: string; csvRecruiterUrl?: string;
  createdAt: string; updatedAt: string;
}

type ConditionType = 'per_contract' | 'total_fyp' | 'activity_round' | 'activity_round_standard' | 'activity_round_tvv90' | 'nyd_activity' | 'nyd_activity_tvv90' | 'nyd_fyp';
type TargetType = 'tvv' | 'nhom' | 'nyd';

function isActivityRoundMode(ct: ConditionType): boolean {
  return ct === 'activity_round' || ct === 'activity_round_standard' || ct === 'activity_round_tvv90';
}
function isNYDMode(ct: ConditionType): boolean {
  return ct === 'nyd_activity' || ct === 'nyd_activity_tvv90' || ct === 'nyd_fyp';
}
function isNYDActivityMode(ct: ConditionType): boolean {
  return ct === 'nyd_activity' || ct === 'nyd_activity_tvv90';
}
function isTVV90Mode(ct: ConditionType): boolean {
  return ct === 'activity_round_tvv90' || ct === 'nyd_activity_tvv90';
}

function isTVVm(startDate: string | null): boolean {
  if (!startDate) return false;
  const start = new Date(startDate);
  const now = new Date();
  const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return diffMonths <= 12;
}

function isTVV90(startDate: string | null): boolean {
  if (!startDate) return false;
  const start = new Date(startDate);
  const now = new Date();
  const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return diffMonths <= 3;
}

// Helper: calculate lượt for a group of contracts based on new definition
// A TVV counts as 1 lượt per month if their total FYP in that month >= threshold
// Each TVV can count at most 1 lượt per month
function calculateLuot(contracts: Contract[], luotThreshold: number, useTVVmFilter: boolean, useTVV90Filter: boolean): number {
  // Map: agentCode -> Set of "YYYY-MM" months where they qualify
  const agentMonthSet = new Map<string, Set<string>>();
  // First, compute per-agent per-month FYP
  const agentMonthFYP = new Map<string, Map<string, number>>();
  for (const c of contracts) {
    if (!c.issueDate) continue;
    const issueMonth = new Date(c.issueDate).toISOString().slice(0, 7); // "YYYY-MM"
    if (!agentMonthFYP.has(c.agentCode)) agentMonthFYP.set(c.agentCode, new Map());
    const monthMap = agentMonthFYP.get(c.agentCode)!;
    monthMap.set(issueMonth, (monthMap.get(issueMonth) || 0) + c.fyp);
  }
  // Check which agent-month pairs qualify
  for (const [agentCode, monthMap] of agentMonthFYP) {
    // Apply TVVm filter if enabled
    if (useTVVmFilter) {
      const agentContract = contracts.find(c => c.agentCode === agentCode);
      if (agentContract && !isTVVm(agentContract.startDate)) continue;
    }
    // Apply TVV90 filter if enabled
    if (useTVV90Filter) {
      const agentContract = contracts.find(c => c.agentCode === agentCode);
      if (agentContract && !isTVV90(agentContract.startDate)) continue;
    }
    for (const [month, totalFYP] of monthMap) {
      if (totalFYP >= luotThreshold) {
        if (!agentMonthSet.has(agentCode)) agentMonthSet.set(agentCode, new Set());
        agentMonthSet.get(agentCode)!.add(month);
      }
    }
  }
  // Count total lượt = sum of qualifying months per agent
  let rounds = 0;
  for (const [, months] of agentMonthSet) {
    rounds += months.size;
  }
  return rounds;
}

const DEFAULT_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vStQqbaHb_1aP-hMzZCiVoeaSobXV5gwqw6iZBoQ0MgpsXiobO1GdCM5zoCoCxVBtxT_Nujjll_MJmC/pub?output=csv';

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
    case 'per_contract': return 'Theo HĐ';
    case 'total_fyp': return 'Tổng IP';
    case 'activity_round': return 'Lượt HĐ';
    case 'activity_round_standard': return 'Lượt HĐ Chuẩn';
    case 'activity_round_tvv90': return 'Lượt HĐ TVV90';
    case 'nyd_activity': return 'Lượt TVVm HĐ';
    case 'nyd_activity_tvv90': return 'Lượt TVV90 HĐ';
    case 'nyd_fyp': return 'FYP TVVm';
  }
}

function getTargetLabel(tt: TargetType): string {
  switch (tt) {
    case 'tvv': return 'TVV';
    case 'nhom': return 'Nhóm';
    case 'nyd': return 'NYD';
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
      <div className="rounded-2xl border border-emerald-200 bg-white overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-emerald-700 tracking-wide leading-tight break-words">{contestTitle || 'CHƯƠNG TRÌNH THI ĐUA'}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <div className="flex items-center gap-1 text-emerald-600 text-xs"><CalendarRange className="w-3 h-3" /><span>{startDate ? fd(startDate) : '...'} — {endDate ? fd(endDate) : '...'}</span></div>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><Target className="w-3 h-3" />{conditionLabel}</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                  {targetType === 'tvv' ? <Users className="w-3 h-3" /> : targetType === 'nyd' ? <UserPlus className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                  {' '}{targetLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-none">
            {sortedTiers.map((tier, i) => (
              <div key={tier.id} className={`flex-shrink-0 rounded-lg px-2.5 py-1.5 bg-gradient-to-br ${tierColors[i % tierColors.length]} text-white min-w-[70px] shadow-md`}>
                <div className="flex items-center gap-1 mb-0.5"><BonusTypeIcon type={tier.bonusType} className="w-3 h-3 opacity-80" /><span className="text-[9px] font-bold uppercase opacity-90">Mức {i + 1}</span></div>
                <div className="text-[10px] font-semibold leading-tight">{isActivityRoundMode(conditionType) || isNYDMode(conditionType) ? `${tier.minFYP}${tier.maxFYP ? ` - ${tier.maxFYP}` : ' ↑'} lượt` : `${fc(tier.minFYP)}${tier.maxFYP ? ` - ${fc(tier.maxFYP)}` : ' ↑'}`}</div>
                <div className="text-xs font-extrabold mt-0.5 truncate" title={formatBonus(tier)}>{formatBonus(tier)}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100"><div className="flex items-center justify-center gap-1 mb-0.5"><FileText className="w-3 h-3 text-emerald-600" /><span className="text-[9px] text-emerald-600 uppercase">{targetType === 'nhom' ? 'Nhóm' : targetType === 'nyd' ? 'NYD' : 'HĐ'}</span></div><p className="text-lg font-extrabold text-gray-800">{hasData ? rowCount : '—'}</p></div>
            <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100"><div className="flex items-center justify-center gap-1 mb-0.5"><Banknote className="w-3 h-3 text-amber-600" /><span className="text-[9px] text-amber-600 uppercase">Tổng IP</span></div><p className="text-sm font-extrabold text-amber-700">{hasData ? fc(totalFYP) : '—'}</p></div>
            <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100"><div className="flex items-center justify-center gap-1 mb-0.5"><Users className="w-3 h-3 text-sky-600" /><span className="text-[9px] text-sky-600 uppercase">Đạt/Chưa</span></div><p className="text-lg font-extrabold">{hasData ? <><span className="text-emerald-600">{achievedCount}</span><span className="text-gray-300 mx-0.5">/</span><span className="text-red-500">{notAchievedCount}</span></> : <span className="text-gray-300">—</span>}</p></div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-2 text-center border border-amber-200"><div className="flex items-center justify-center gap-1 mb-0.5"><Award className="w-3 h-3 text-amber-600" /><span className="text-[9px] text-amber-600 uppercase">Tổng Thưởng</span></div><p className="text-sm font-extrabold text-amber-700">{hasData ? fc(totalBonus) : '—'}</p></div>
          </div>
          {hasData && (<div className="space-y-1"><div className="flex items-center justify-between text-xs"><span className="text-emerald-600 font-medium">Tỷ lệ đạt</span><span className="text-gray-800 font-bold">{achievementPercent}%</span></div><div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-amber-400 rounded-full transition-all duration-700" style={{ width: `${achievementPercent}%` }} /><div className="absolute inset-0 flex items-center justify-center"><span className="text-[8px] font-bold text-gray-600 drop-shadow-sm">{achievedCount}/{rowCount}</span></div></div></div>)}
        </div>
      </div>
    );
  }

  // Original gradient variant
  return (
    <div className={`relative overflow-hidden rounded-2xl ${isPreview ? 'border-2 border-emerald-500/40' : ''}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-900" />
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 40%)' }} />
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-amber-400/20 to-transparent rounded-bl-full" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-teal-300/15 to-transparent rounded-tr-full" />
      <div className="relative z-10 p-4 sm:p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg flex-shrink-0">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold text-white tracking-wide leading-tight break-words">{contestTitle || 'CHƯƠNG TRÌNH THI ĐUA'}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <div className="flex items-center gap-1 text-emerald-200 text-xs"><CalendarRange className="w-3 h-3" /><span>{startDate ? fd(startDate) : '...'} — {endDate ? fd(endDate) : '...'}</span></div>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-emerald-100"><Target className="w-3 h-3" />{conditionLabel}</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-sky-100">
                {targetType === 'tvv' ? <Users className="w-3 h-3" /> : targetType === 'nyd' ? <UserPlus className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                {' '}{targetLabel}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-none">
          {sortedTiers.map((tier, i) => (
            <div key={tier.id} className={`flex-shrink-0 rounded-lg px-2.5 py-1.5 bg-gradient-to-br ${tierColors[i % tierColors.length]} text-white min-w-[70px] shadow-md`}>
              <div className="flex items-center gap-1 mb-0.5"><BonusTypeIcon type={tier.bonusType} className="w-3 h-3 opacity-80" /><span className="text-[9px] font-bold uppercase opacity-90">Mức {i + 1}</span></div>
              <div className="text-[10px] font-semibold leading-tight">{isActivityRoundMode(conditionType) || isNYDMode(conditionType) ? `${tier.minFYP}${tier.maxFYP ? ` - ${tier.maxFYP}` : ' ↑'} lượt` : `${fc(tier.minFYP)}${tier.maxFYP ? ` - ${fc(tier.maxFYP)}` : ' ↑'}`}</div>
              <div className="text-xs font-extrabold mt-0.5 truncate" title={formatBonus(tier)}>{formatBonus(tier)}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center border border-white/10"><div className="flex items-center justify-center gap-1 mb-0.5"><FileText className="w-3 h-3 text-emerald-300" /><span className="text-[9px] text-emerald-300 uppercase">{targetType === 'nhom' ? 'Nhóm' : targetType === 'nyd' ? 'NYD' : 'HĐ'}</span></div><p className="text-lg font-extrabold text-white">{hasData ? rowCount : '—'}</p></div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center border border-white/10"><div className="flex items-center justify-center gap-1 mb-0.5"><Banknote className="w-3 h-3 text-amber-300" /><span className="text-[9px] text-amber-300 uppercase">Tổng IP</span></div><p className="text-sm font-extrabold text-amber-200">{hasData ? fc(totalFYP) : '—'}</p></div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center border border-white/10"><div className="flex items-center justify-center gap-1 mb-0.5"><Users className="w-3 h-3 text-sky-300" /><span className="text-[9px] text-sky-300 uppercase">Đạt/Chưa</span></div><p className="text-lg font-extrabold">{hasData ? <><span className="text-emerald-300">{achievedCount}</span><span className="text-white/40 mx-0.5">/</span><span className="text-red-300">{notAchievedCount}</span></> : <span className="text-white/40">—</span>}</p></div>
          <div className="bg-gradient-to-br from-amber-500/30 to-orange-500/20 backdrop-blur-sm rounded-lg p-2 text-center border border-amber-400/30"><div className="flex items-center justify-center gap-1 mb-0.5"><Award className="w-3 h-3 text-amber-200" /><span className="text-[9px] text-amber-200 uppercase">Tổng Thưởng</span></div><p className="text-sm font-extrabold text-amber-100">{hasData ? fc(totalBonus) : '—'}</p></div>
        </div>
        {hasData && (<div className="space-y-1"><div className="flex items-center justify-between text-xs"><span className="text-emerald-200 font-medium">Tỷ lệ đạt</span><span className="text-white font-bold">{achievementPercent}%</span></div><div className="relative h-2.5 bg-white/10 rounded-full overflow-hidden"><div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-amber-400 rounded-full transition-all duration-700" style={{ width: `${achievementPercent}%` }} /><div className="absolute inset-0 flex items-center justify-center"><span className="text-[8px] font-bold text-white drop-shadow-sm">{achievedCount}/{rowCount}</span></div></div></div>)}
        {!hasData && isPreview && (<div className="text-center py-1"><p className="text-emerald-200/60 text-xs italic">Nhấn &ldquo;Tính kết quả&rdquo; để xem</p></div>)}
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
  const isAR = isActivityRoundMode(conditionType) || isNYDMode(conditionType);
  const cls = accentColor === 'sky' ? {
    bg: 'bg-sky-500/5', border: 'border-sky-500/10', label: 'text-sky-400', badge: 'bg-sky-500/10',
    btn: 'text-sky-400 hover:text-sky-300', accent: 'bg-sky-600',
  } : {
    bg: 'bg-amber-500/5', border: 'border-amber-500/10', label: 'text-amber-400', badge: 'bg-amber-500/10',
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
                  <Button key={type} variant={tier.bonusType === type ? 'default' : 'outline'} size="sm" className={`h-5 w-5 p-0 shrink-0 ${tier.bonusType === type ? activeCls + ' hover:opacity-90' : 'border-white/10 text-white/50 bg-transparent'}`} onClick={() => onUpdate(tier.id, 'bonusType', type)} title={label}><Icon className="w-3 h-3" /></Button>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={() => onRemove(tier.id)} className="h-5 w-5 p-0 text-red-400 hover:text-red-600"><Trash2 className="w-2.5 h-2.5" /></Button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {isAR ? (
                <>
                  <div><Label className="text-[9px] text-white/40">Lượt từ</Label><Input type="number" inputMode="numeric" placeholder="0" value={tier.minFYP || ''} onChange={(e) => onUpdate(tier.id, 'minFYP', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)} className="h-7 text-xs border-emerald-500/20 bg-white/5 text-white" /></div>
                  <div><Label className="text-[9px] text-white/40">Lượt đến</Label><Input type="number" inputMode="numeric" placeholder="∞" value={tier.maxFYP || ''} onChange={(e) => onUpdate(tier.id, 'maxFYP', e.target.value ? parseInt(e.target.value) : null)} className="h-7 text-xs border-emerald-500/20 bg-white/5 text-white" /></div>
                </>
              ) : (
                <>
                  <div><Label className="text-[9px] text-white/40">IP từ (nđ)</Label><Input type="number" inputMode="decimal" placeholder="0" value={vndToNgan(tier.minFYP) || ''} onChange={(e) => onUpdate(tier.id, 'minFYP', e.target.value === '' ? 0 : nganToVnd(parseFloat(e.target.value) || 0))} className="h-7 text-xs border-emerald-500/20 bg-white/5 text-white" /></div>
                  <div><Label className="text-[9px] text-white/40">IP đến (nđ)</Label><Input type="number" inputMode="decimal" placeholder="∞" value={tier.maxFYP ? vndToNgan(tier.maxFYP) : ''} onChange={(e) => onUpdate(tier.id, 'maxFYP', e.target.value ? nganToVnd(parseFloat(e.target.value)) : null)} className="h-7 text-xs border-emerald-500/20 bg-white/5 text-white" /></div>
                </>
              )}
              <div>
                <Label className="text-[9px] text-white/40">
                  {tier.bonusType === 'money' ? 'Thưởng (nđ)' : tier.bonusType === 'money_per_round' ? '/Lượt (nđ)' : tier.bonusType === 'percent' ? '% IP' : tier.bonusType === 'percent_fyc' ? '% FYC' : 'Quà tặng'}
                </Label>
                {tier.bonusType === 'money' || tier.bonusType === 'money_per_round'
                  ? <Input type="number" inputMode="decimal" placeholder="0" value={vndToNgan(tier.bonusAmount) || ''} onChange={(e) => onUpdate(tier.id, 'bonusAmount', e.target.value === '' ? 0 : nganToVnd(parseFloat(e.target.value) || 0))} className="h-7 text-xs border-emerald-500/20 bg-white/5 text-white" />
                  : tier.bonusType === 'percent' || tier.bonusType === 'percent_fyc'
                    ? <Input type="number" inputMode="decimal" placeholder="7" value={tier.bonusPercent || ''} onChange={(e) => onUpdate(tier.id, 'bonusPercent', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)} className="h-7 text-xs border-emerald-500/20 bg-white/5 text-white" />
                    : <Input type="text" placeholder="VD: iPhone 15" value={tier.bonusText} onChange={(e) => onUpdate(tier.id, 'bonusText', e.target.value)} className="h-7 text-xs border-emerald-500/20 bg-white/5 text-white" />}
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
  const [conditionType, setConditionType] = useState<ConditionType>('per_contract');
  const [targetType, setTargetType] = useState<TargetType>('tvv');
  const [bonusTiers, setBonusTiers] = useState<BonusTier[]>([
    { id: crypto.randomUUID(), minFYP: 0, maxFYP: 20000000, bonusAmount: 500000, bonusType: 'money', bonusText: '', bonusPercent: 0 },
    { id: crypto.randomUUID(), minFYP: 20000000, maxFYP: 50000000, bonusAmount: 1500000, bonusType: 'money', bonusText: '', bonusPercent: 0 },
    { id: crypto.randomUUID(), minFYP: 50000000, maxFYP: 100000000, bonusAmount: 3000000, bonusType: 'money', bonusText: '', bonusPercent: 0 },
    { id: crypto.randomUUID(), minFYP: 100000000, maxFYP: null, bonusAmount: 5000000, bonusType: 'money', bonusText: '', bonusPercent: 0 },
  ]);
  // Phase 2
  const [usePhase2, setUsePhase2] = useState(false);
  const [phase2StartDate, setPhase2StartDate] = useState('');
  const [phase2EndDate, setPhase2EndDate] = useState('');
  const [bonusTiers2, setBonusTiers2] = useState<BonusTier[]>([
    { id: crypto.randomUUID(), minFYP: 0, maxFYP: 20000000, bonusAmount: 500000, bonusType: 'money', bonusText: '', bonusPercent: 0 },
  ]);
  // Secondary Condition
  const [useSecondaryCondition, setUseSecondaryCondition] = useState(false);
  const [secondaryAFYPMin, setSecondaryAFYPMin] = useState(0);
  const [secondaryIPMin, setSecondaryIPMin] = useState(0);
  // New options
  const [useTVVmFilter, setUseTVVmFilter] = useState(false);
  const [useTVV90Filter, setUseTVV90Filter] = useState(false);
  const [hideNotAchieved, setHideNotAchieved] = useState(false);
  const [includeOwnNYD, setIncludeOwnNYD] = useState(false);

  const [posterUrl, setPosterUrl] = useState<string>('');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false); // keep for reference but not used for sync button
  const [savedContests, setSavedContests] = useState<SavedContest[]>([]);
  const [selectedContestId, setSelectedContestId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSourceData, setShowSourceData] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [isResultExpanded, setIsResultExpanded] = useState(false);
  const [thiDuaSubjects, setThiDuaSubjects] = useState<string>('');
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [recruiterList, setRecruiterList] = useState<RecruiterMember[]>([]);
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

  const handleSearch = useCallback(() => {
    if (!startDate && !endDate) { setFilteredContracts([]); toast({ title: 'Thông báo', description: 'Vui lòng nhập ít nhất Ngày hiệu lực từ hoặc đến' }); return; }
    let results = [...contracts];
    if (startDate) { const start = new Date(startDate); results = results.filter((c) => new Date(c.effectiveDate) >= start); }
    if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); results = results.filter((c) => new Date(c.effectiveDate) <= end); }
    if (issueDate) { const issue = new Date(issueDate); results = results.filter((c) => { const cI = new Date(c.issueDate); return cI.getFullYear() === issue.getFullYear() && cI.getMonth() === issue.getMonth() && cI.getDate() === issue.getDate(); }); }
    // Secondary condition filter
    if (useSecondaryCondition) {
      if (secondaryAFYPMin > 0) results = results.filter((c) => c.afyp >= secondaryAFYPMin);
      if (secondaryIPMin > 0) results = results.filter((c) => c.fyp >= secondaryIPMin);
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

  // Subject filter
  const subjectCodes = useMemo(() => thiDuaSubjects.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean), [thiDuaSubjects]);

  // Display contracts with subject filter applied
  const displayContracts = useMemo(() => {
    if (subjectCodes.length === 0) return filteredContracts;
    return filteredContracts.filter(c => {
      if (targetType === 'tvv') return subjectCodes.includes(c.agentCode) || subjectCodes.includes(c.agentName);
      if (targetType === 'nyd') return subjectCodes.includes(c.agentCode) || subjectCodes.includes(c.agentName) ||
        (c.recruiterCode && subjectCodes.includes(c.recruiterCode));
      return subjectCodes.includes(c.maNhom);
    });
  }, [filteredContracts, subjectCodes, targetType]);

  // NYD data computation - use Recruiter table as primary reference
  const nydData: NYDData[] = useMemo(() => {
    if (!isNYDMode(conditionType)) return [];
    const nydPositions = ['trưởng ban', 'trưởng nhóm', 'tiền trưởng nhóm'];
    const nydMap = new Map<string, NYDData>();

    // Step 1: If recruiter list exists, use it as primary source for NYD info
    if (recruiterList.length > 0) {
      // Group recruiters by NYD code to build NYD map
      const nydGroups = new Map<string, { nydName: string; position: string; nhom: string; recruitedAgents: string[] }>();
      for (const r of recruiterList) {
        if (!nydGroups.has(r.nydCode)) {
          nydGroups.set(r.nydCode, { nydName: r.nydName, position: r.position, nhom: r.nhom, recruitedAgents: [] });
        }
        nydGroups.get(r.nydCode)!.recruitedAgents.push(r.recruitedAgentCode);
      }
      for (const [nydCode, info] of nydGroups) {
        nydMap.set(nydCode, {
          nydCode, nydName: info.nydName, nhom: info.nhom,
          position: info.position, recruitCount: 0, recruitFYP: 0, ownFYP: 0, contracts: []
        });
      }
    } else if (staffList.length > 0) {
      // Fallback: add NYDs from staff list
      for (const s of staffList) {
        if (s.position && nydPositions.some(p => s.position.toLowerCase().includes(p))) {
          nydMap.set(s.agentCode, {
            nydCode: s.agentCode, nydName: s.agentName, nhom: s.nhom,
            position: s.position || '', recruitCount: 0, recruitFYP: 0, ownFYP: 0, contracts: []
          });
        }
      }
    }

    // Step 2: Add NYD contracts data (own FYP)
    const nydContracts = displayContracts.filter(c =>
      c.position && nydPositions.some(p => c.position.toLowerCase().includes(p))
    );
    for (const c of nydContracts) {
      if (!nydMap.has(c.agentCode)) {
        nydMap.set(c.agentCode, { nydCode: c.agentCode, nydName: c.agentName, nhom: c.nhom, position: c.position || '', recruitCount: 0, recruitFYP: 0, ownFYP: 0, contracts: [] });
      }
      const nyd = nydMap.get(c.agentCode)!;
      nyd.ownFYP += c.fyp;
      nyd.contracts.push(c);
    }

    // Step 3: Calculate recruit data
    const luotThreshold = 3_000_000;
    for (const [nydCode, nyd] of nydMap) {
      if (isNYDActivityMode(conditionType)) {
        // NYD activity mode: count lượt using new per-month calculation
        // Find all recruited agents for this NYD
        let recruitedAgentCodes: string[] = [];
        if (recruiterList.length > 0) {
          const recruitedByNyd = recruiterList.filter(r => r.nydCode === nydCode);
          recruitedAgentCodes = recruitedByNyd.map(r => r.recruitedAgentCode);
        } else {
          // Fallback: use recruiterCode from contracts
          const recruitedContracts = displayContracts.filter(c => c.recruiterCode === nydCode && c.agentCode !== nydCode);
          recruitedAgentCodes = [...new Set(recruitedContracts.map(c => c.agentCode))];
        }
        // Get all contracts for recruited agents
        const recruitedContracts = displayContracts.filter(c => recruitedAgentCodes.includes(c.agentCode));
        // Apply TVV90 filter if in TVV90 mode or if TVV90 filter is on
        const applyTVV90 = isTVV90Mode(conditionType) || useTVV90Filter;
        const applyTVVm = useTVVmFilter;
        nyd.recruitCount = calculateLuot(recruitedContracts, luotThreshold, applyTVVm, applyTVV90);
        nyd.recruitFYP = recruitedContracts.reduce((sum, c) => sum + c.fyp, 0);
      } else {
        // NYD FYP mode: count by total FYP
        if (recruiterList.length > 0) {
          const recruitedByNyd = recruiterList.filter(r => r.nydCode === nydCode);
          const agentFYPMap = new Map<string, number>();
          for (const r of recruitedByNyd) {
            const agentContracts = displayContracts.filter(c => c.agentCode === r.recruitedAgentCode);
            const totalFYP = agentContracts.reduce((sum, c) => sum + c.fyp, 0);
            agentFYPMap.set(r.recruitedAgentCode, totalFYP);
          }
          let recruitCount = 0;
          let recruitFYP = 0;
          for (const [, agentFYP] of agentFYPMap) {
            if (agentFYP >= 3_000_000) recruitCount++;
            recruitFYP += agentFYP;
          }
          nyd.recruitCount = recruitCount;
          nyd.recruitFYP = recruitFYP;
        } else {
          const recruitedContracts = displayContracts.filter(c => c.recruiterCode === nydCode && c.agentCode !== nydCode);
          const agentFYPMap = new Map<string, number>();
          for (const rc of recruitedContracts) {
            agentFYPMap.set(rc.agentCode, (agentFYPMap.get(rc.agentCode) || 0) + rc.fyp);
          }
          let recruitCount = 0;
          let recruitFYP = 0;
          for (const [, agentFYP] of agentFYPMap) {
            if (agentFYP >= 3_000_000) recruitCount++;
            recruitFYP += agentFYP;
          }
          nyd.recruitCount = recruitCount;
          nyd.recruitFYP = recruitFYP;
        }
      }
    }
    return Array.from(nydMap.values());
  }, [displayContracts, conditionType, staffList, recruiterList, useTVVmFilter, useTVV90Filter]);

  // Grouped data - use Staff table as reference for group membership
  const groupedData: GroupData[] = useMemo(() => {
    if (targetType !== 'nhom') return [];
    const map = new Map<string, GroupData>();

    // Step 1: If staff list exists, use it as the primary source for groups
    if (staffList.length > 0) {
      // Build group map from staff data (captures ALL groups, even with no contracts)
      const uniqueGroups = new Map<string, { nhom: string; leaderAgentCode: string; ban: string }>();
      for (const s of staffList) {
        if (s.maNhom && !uniqueGroups.has(s.maNhom)) {
          uniqueGroups.set(s.maNhom, { nhom: s.nhom, leaderAgentCode: s.leaderAgentCode, ban: s.ban });
        }
      }
      for (const [maNhom, info] of uniqueGroups) {
        map.set(maNhom, { maNhom, nhom: info.nhom, leaderName: '', leaderCode: '', totalFYP: 0, contractCount: 0, activityRounds: 0, contracts: [] });
      }
      // Set leader info from staff data
      for (const [maNhom, g] of map) {
        const groupInfo = uniqueGroups.get(maNhom);
        if (groupInfo?.leaderAgentCode) {
          // Find leader name from staff list
          const leaderStaff = staffList.find(s => s.agentCode === groupInfo.leaderAgentCode);
          g.leaderCode = groupInfo.leaderAgentCode;
          g.leaderName = leaderStaff?.agentName || contracts.find(c => c.agentCode === groupInfo.leaderAgentCode)?.agentName || '';
        }
        // Fallback: find leader by position from staff list
        if (!g.leaderName) {
          const leaderByPosition = staffList.find(s =>
            s.maNhom === maNhom && s.position && (
              s.position.toLowerCase().includes('trưởng nhóm') ||
              s.position.toLowerCase().includes('trưởng ban') ||
              s.position.toLowerCase().includes('tiền trưởng nhóm')
            )
          );
          if (leaderByPosition) {
            g.leaderName = leaderByPosition.agentName;
            g.leaderCode = leaderByPosition.agentCode;
          }
        }
      }
    }

    // Step 2: Add contracts data to the groups
    for (const c of displayContracts) {
      const key = c.maNhom;
      if (!map.has(key)) {
        // Group not in staff list, create from contract data (backward compatible)
        map.set(key, { maNhom: key, nhom: c.nhom, leaderName: '', leaderCode: '', totalFYP: 0, contractCount: 0, activityRounds: 0, contracts: [] });
      }
      const g = map.get(key)!;
      g.totalFYP += c.fyp;
      g.contractCount += 1;
      g.contracts.push(c);
    }

    // Step 3: For groups not from staff list, try to detect leader from contracts
    if (staffList.length === 0) {
      for (const g of Array.from(map.values())) {
        const leaderContract = g.contracts.find(c => c.leaderAgentCode);
        if (leaderContract?.leaderAgentCode) {
          const leaderFromAll = contracts.find(c => c.agentCode === leaderContract.leaderAgentCode);
          g.leaderCode = leaderContract.leaderAgentCode;
          g.leaderName = leaderFromAll?.agentName || '';
        }
        if (!g.leaderName) {
          const leaderByPosition = g.contracts.find(c => c.position && (c.position.toLowerCase().includes('trưởng nhóm') || c.position.toLowerCase().includes('trưởng ban')));
          if (leaderByPosition) {
            g.leaderName = leaderByPosition.agentName;
            g.leaderCode = leaderByPosition.agentCode;
          }
        }
      }
    }

    // Step 4: Calculate activity rounds using new per-month lượt definition
    if (isActivityRoundMode(conditionType)) {
      const luotThreshold = conditionType === 'activity_round_standard' ? 12_000_000 : 3_000_000;
      const applyTVV90 = isTVV90Mode(conditionType) || useTVV90Filter;
      for (const g of Array.from(map.values())) {
        g.activityRounds = calculateLuot(g.contracts, luotThreshold, useTVVmFilter, applyTVV90);
      }
    }
    return Array.from(map.values());
  }, [displayContracts, targetType, conditionType, contracts, staffList, useTVVmFilter, useTVV90Filter]);

  // Phase 2: Split contracts and compute bonus
  const phase2Results = useMemo(() => {
    if (!usePhase2 || !phase2StartDate) return null;
    const p2Start = new Date(phase2StartDate);
    const phase1Contracts = displayContracts.filter(c => new Date(c.effectiveDate) < p2Start);
    const phase2Contracts = displayContracts.filter(c => new Date(c.effectiveDate) >= p2Start);
    const applyTVV90 = isTVV90Mode(conditionType) || useTVV90Filter;

    // Calculate Phase 1 bonus
    let phase1Bonus = 0;
    if (targetType === 'nhom') {
      if (isActivityRoundMode(conditionType)) {
        const phase1Grouped = new Map<string, GroupData>();
        for (const c of phase1Contracts) {
          const key = c.maNhom;
          if (!phase1Grouped.has(key)) phase1Grouped.set(key, { maNhom: key, nhom: c.nhom, leaderName: '', leaderCode: '', totalFYP: 0, contractCount: 0, activityRounds: 0, contracts: [] });
          const g = phase1Grouped.get(key)!; g.totalFYP += c.fyp; g.contractCount += 1; g.contracts.push(c);
        }
        const luotThreshold = conditionType === 'activity_round_standard' ? 12_000_000 : 3_000_000;
        for (const g of phase1Grouped.values()) {
          const rounds = calculateLuot(g.contracts, luotThreshold, useTVVmFilter, applyTVV90);
          const { tier } = calculateActivityRoundBonusWithTiers(rounds, bonusTiers);
          if (tier) phase1Bonus += computeBonusFromTier(tier, g.totalFYP, rounds);
        }
      } else {
        const grouped = new Map<string, number>();
        for (const c of phase1Contracts) { grouped.set(c.maNhom, (grouped.get(c.maNhom) || 0) + c.fyp); }
        for (const [, total] of grouped) { phase1Bonus += getBonusAmountWithTiers(total, bonusTiers); }
      }
    } else if (isNYDMode(conditionType)) {
      const nydPositions = ['trưởng ban', 'trưởng nhóm', 'tiền trưởng nhóm'];
      const phase1NYDContracts = phase1Contracts.filter(c => c.position && nydPositions.some(p => c.position.toLowerCase().includes(p)));
      const nydMap = new Map<string, { ownFYP: number; agentFYPMap: Map<string, number> }>();
      for (const c of phase1NYDContracts) {
        if (!nydMap.has(c.agentCode)) nydMap.set(c.agentCode, { ownFYP: 0, agentFYPMap: new Map() });
        nydMap.get(c.agentCode)!.ownFYP += c.fyp;
      }
      for (const [nydCode, data] of nydMap) {
        const recruited = phase1Contracts.filter(c => c.recruiterCode === nydCode && c.agentCode !== nydCode);
        for (const rc of recruited) { data.agentFYPMap.set(rc.agentCode, (data.agentFYPMap.get(rc.agentCode) || 0) + rc.fyp); }
        let recruitCount = 0; let recruitFYP = 0;
        if (isNYDActivityMode(conditionType)) {
          // Use new lượt calculation
          const recruitedContracts = phase1Contracts.filter(c => c.recruiterCode === nydCode && c.agentCode !== nydCode);
          recruitCount = calculateLuot(recruitedContracts, 3_000_000, useTVVmFilter, applyTVV90);
          recruitFYP = recruitedContracts.reduce((s, c) => s + c.fyp, 0);
        } else {
          for (const [, af] of data.agentFYPMap) { if (af >= 3_000_000) recruitCount++; recruitFYP += af; }
        }
        const value = isNYDActivityMode(conditionType) ? recruitCount : (recruitFYP + (includeOwnNYD ? data.ownFYP : 0));
        const { tier } = calculateBonusWithTiers(value, bonusTiers);
        if (tier) phase1Bonus += computeBonusFromTier(tier, value, recruitCount);
      }
    } else {
      for (const c of phase1Contracts) { phase1Bonus += getBonusAmountWithTiers(c.fyp, bonusTiers); }
    }

    // Calculate Phase 2 bonus
    let phase2Bonus = 0;
    if (targetType === 'nhom') {
      if (isActivityRoundMode(conditionType)) {
        const phase2Grouped = new Map<string, GroupData>();
        for (const c of phase2Contracts) {
          const key = c.maNhom;
          if (!phase2Grouped.has(key)) phase2Grouped.set(key, { maNhom: key, nhom: c.nhom, leaderName: '', leaderCode: '', totalFYP: 0, contractCount: 0, activityRounds: 0, contracts: [] });
          const g = phase2Grouped.get(key)!; g.totalFYP += c.fyp; g.contractCount += 1; g.contracts.push(c);
        }
        const luotThreshold = conditionType === 'activity_round_standard' ? 12_000_000 : 3_000_000;
        for (const g of phase2Grouped.values()) {
          const rounds = calculateLuot(g.contracts, luotThreshold, useTVVmFilter, applyTVV90);
          const { tier } = calculateActivityRoundBonusWithTiers(rounds, bonusTiers2);
          if (tier) phase2Bonus += computeBonusFromTier(tier, g.totalFYP, rounds);
        }
      } else {
        const grouped = new Map<string, number>();
        for (const c of phase2Contracts) { grouped.set(c.maNhom, (grouped.get(c.maNhom) || 0) + c.fyp); }
        for (const [, total] of grouped) { phase2Bonus += getBonusAmountWithTiers(total, bonusTiers2); }
      }
    } else if (isNYDMode(conditionType)) {
      const nydPositions = ['trưởng ban', 'trưởng nhóm', 'tiền trưởng nhóm'];
      const phase2NYDContracts = phase2Contracts.filter(c => c.position && nydPositions.some(p => c.position.toLowerCase().includes(p)));
      const nydMap = new Map<string, { ownFYP: number; agentFYPMap: Map<string, number> }>();
      for (const c of phase2NYDContracts) {
        if (!nydMap.has(c.agentCode)) nydMap.set(c.agentCode, { ownFYP: 0, agentFYPMap: new Map() });
        nydMap.get(c.agentCode)!.ownFYP += c.fyp;
      }
      for (const [nydCode, data] of nydMap) {
        const recruited = phase2Contracts.filter(c => c.recruiterCode === nydCode && c.agentCode !== nydCode);
        for (const rc of recruited) { data.agentFYPMap.set(rc.agentCode, (data.agentFYPMap.get(rc.agentCode) || 0) + rc.fyp); }
        let recruitCount = 0; let recruitFYP = 0;
        if (isNYDActivityMode(conditionType)) {
          recruitCount = calculateLuot(recruited, 3_000_000, useTVVmFilter, applyTVV90);
          recruitFYP = recruited.reduce((s, c) => s + c.fyp, 0);
        } else {
          for (const [, af] of data.agentFYPMap) { if (af >= 3_000_000) recruitCount++; recruitFYP += af; }
        }
        const value = isNYDActivityMode(conditionType) ? recruitCount : (recruitFYP + (includeOwnNYD ? data.ownFYP : 0));
        const { tier } = calculateBonusWithTiers(value, bonusTiers2);
        if (tier) phase2Bonus += computeBonusFromTier(tier, value, recruitCount);
      }
    } else {
      for (const c of phase2Contracts) { phase2Bonus += getBonusAmountWithTiers(c.fyp, bonusTiers2); }
    }

    return { phase1Bonus, phase2Bonus, totalBonus: phase1Bonus + phase2Bonus, phase1Count: phase1Contracts.length, phase2Count: phase2Contracts.length };
  }, [usePhase2, phase2StartDate, displayContracts, targetType, conditionType, bonusTiers, bonusTiers2, includeOwnNYD, useTVVmFilter, useTVV90Filter, calculateBonusWithTiers, calculateActivityRoundBonusWithTiers, getBonusAmountWithTiers]);

  const getTotalFYPBonus = useCallback((): { totalFYP: number; bonus: number; tier: BonusTier | null; remaining: number | null } => {
    const totalFYP = displayContracts.reduce((sum, c) => sum + c.fyp, 0);
    const { tier } = calculateBonus(totalFYP); const remaining = getRemainingToNextTier(totalFYP);
    const bonus = tier ? computeBonusFromTier(tier, totalFYP) : 0;
    return { totalFYP, bonus, tier, remaining };
  }, [displayContracts, calculateBonus, getRemainingToNextTier]);

  const addBonusTier = () => setBonusTiers([...bonusTiers, { id: crypto.randomUUID(), minFYP: 0, maxFYP: null, bonusAmount: 0, bonusType: 'money', bonusText: '', bonusPercent: 0 }]);
  const removeBonusTier = (id: string) => { if (bonusTiers.length <= 1) { toast({ title: 'Thông báo', description: 'Phải có ít nhất một mức thưởng' }); return; } setBonusTiers(bonusTiers.filter((t) => t.id !== id)); };
  const updateBonusTier = (id: string, field: keyof BonusTier, value: string | number | null) => setBonusTiers(bonusTiers.map((t) => (t.id === id ? { ...t, [field]: value } : t)));

  const addBonusTier2 = () => setBonusTiers2([...bonusTiers2, { id: crypto.randomUUID(), minFYP: 0, maxFYP: null, bonusAmount: 0, bonusType: 'money', bonusText: '', bonusPercent: 0 }]);
  const removeBonusTier2 = (id: string) => { if (bonusTiers2.length <= 1) { toast({ title: 'Thông báo', description: 'Phải có ít nhất một mức thưởng' }); return; } setBonusTiers2(bonusTiers2.filter((t) => t.id !== id)); };
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
        hideNotAchieved, useTVVmFilter, useTVV90Filter, includeOwnNYD,
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
    // Auto-set target type based on condition type
    if (isNYDMode(contest.conditionType as ConditionType)) {
      setTargetType('nyd');
    } else if (isActivityRoundMode(contest.conditionType as ConditionType)) {
      setTargetType('nhom');
    } else {
      setTargetType((contest.targetType || 'tvv') as TargetType);
    }
    if (contest.issueDate) setIssueDate(new Date(contest.issueDate).toISOString().slice(0, 10)); else setIssueDate('');
    try { const tiers = JSON.parse(contest.bonusTiers); if (Array.isArray(tiers)) setBonusTiers(tiers); } catch { /* ignore */ }
    if (contest.posterUrl) setPosterUrl(contest.posterUrl); else setPosterUrl('');
    try { const parts = JSON.parse(contest.participants || '[]'); if (Array.isArray(parts) && parts.length > 0) setThiDuaSubjects(parts.join('\n')); else setThiDuaSubjects(''); } catch { setThiDuaSubjects(''); }
    // Phase 2
    setUsePhase2(contest.usePhase2 ?? false);
    setPhase2StartDate(contest.phase2StartDate ? new Date(contest.phase2StartDate).toISOString().slice(0, 10) : '');
    setPhase2EndDate(contest.phase2EndDate ? new Date(contest.phase2EndDate).toISOString().slice(0, 10) : '');
    try { const tiers2 = JSON.parse(contest.bonusTiers2 || '[]'); if (Array.isArray(tiers2) && tiers2.length > 0) setBonusTiers2(tiers2); } catch { /* ignore */ }
    // Secondary condition
    setUseSecondaryCondition(contest.useSecondaryCondition ?? false);
    setSecondaryAFYPMin(contest.secondaryAFYPMin ?? 0);
    setSecondaryIPMin(contest.secondaryIPMin ?? 0);
    // New options
    setHideNotAchieved(contest.hideNotAchieved ?? false);
    setUseTVVmFilter(contest.useTVVmFilter ?? false);
    setUseTVV90Filter(contest.useTVV90Filter ?? false);
    setIncludeOwnNYD(contest.includeOwnNYD ?? false);
    setTimeout(() => handleSearchRef.current(), 100);
  };

  const handleDeleteContest = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try { const res = await fetch(`/api/contests?id=${id}`, { method: 'DELETE' }); if (res.ok) { toast({ title: 'Thành công', description: 'Đã xóa' }); fetchSavedContests(); if (selectedContestId === id) setSelectedContestId(''); } }
    catch { toast({ title: 'Lỗi', description: 'Không thể xóa', variant: 'destructive' }); }
  };

  const handleImportFromUrl = async () => {
    setIsImporting(true);
    try {
      // Fetch all 3 CSVs simultaneously
      const urls = [
        settings.csv_url || csvUrl,      // Contract CSV
        settings.csv_staff_url || '',     // Staff CSV
        settings.csv_nyd_url || '',       // Recruiter CSV
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
      toast({ title: 'Đồng bộ thành công', description: data.message });
      fetchContracts(); fetchStaff(); fetchRecruiters();
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
    if (displayContracts.length === 0 && nydData.length === 0) return;
    const sTiers = [...bonusTiers].sort((a, b) => a.minFYP - b.minFYP);
    let text = `🏆 ${contestTitle}\n📅 Từ ${startDate ? formatDate(startDate) : '...'} đến ${endDate ? formatDate(endDate) : '...'}\n🎯 ${getTargetLabel(targetType)}\n━━━━━━━━━━━━━━━━━━━━\n📊 Mức thưởng:\n`;
    sTiers.forEach((t, i) => { text += `  Mức ${i + 1}: ${isActivityRoundMode(conditionType) || isNYDMode(conditionType) ? `${t.minFYP}${t.maxFYP ? ` - ${t.maxFYP}` : ' ↑'} lượt` : `${formatCurrency(t.minFYP)}${t.maxFYP ? ` - ${formatCurrency(t.maxFYP)}` : ' ↑'}`} → ${formatBonus(t)}\n`; });
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    if (isNYDMode(conditionType)) {
      nydData.map(n => {
        const value = isNYDActivityMode(conditionType) ? n.recruitCount : (n.recruitFYP + (includeOwnNYD ? n.ownFYP : 0));
        const { tier } = calculateBonus(value);
        return { nyd: n, tier, value };
      }).sort((a, b) => (b.tier?.bonusAmount || 0) - (a.tier?.bonusAmount || 0)).forEach(({ nyd: n, tier, value }, idx) => {
        const displayVal = isNYDActivityMode(conditionType) ? `${n.recruitCount} ${conditionType === 'nyd_activity_tvv90' ? 'TVV90' : 'TVVm'} HĐ` : formatNumber(value);
        text += `${idx + 1}. ${n.nhom || '—'} | ${n.nydCode} | ${n.nydName} | ${n.position || '—'} | ${displayVal}${includeOwnNYD ? ` | IP cá nhân: ${formatNumber(n.ownFYP)}` : ''} | ${tier ? `Thưởng: ${formatBonus(tier, value, n.recruitCount)}` : 'Chưa đạt'}\n`;
      });
    } else if (targetType === 'nhom') {
      [...groupedData].map((g) => {
        const groupPhase = getGroupPhaseBonus(g);
        const tier = isActivityRoundMode(conditionType) ? calculateActivityRoundBonus(g.activityRounds).tier : calculateBonus(g.totalFYP).tier;
        return { group: g, tier, groupPhase };
      }).sort((a, b) => ((b.groupPhase.phase1Bonus + b.groupPhase.phase2Bonus) - (a.groupPhase.phase1Bonus + a.groupPhase.phase2Bonus))).forEach(({ group: g, tier, groupPhase }, idx) => {
        const valueLabel = isActivityRoundMode(conditionType) ? `${g.activityRounds} lượt` : `IP: ${formatNumber(g.totalFYP)}`;
        if (usePhase2 && phase2StartDate) {
          text += `${idx + 1}. ${g.nhom || g.maNhom} | ${g.leaderCode || ''} | ${g.leaderName || ''} | ${valueLabel} | GD1: ${formatCurrency(groupPhase.phase1Bonus)} | GD2: ${formatCurrency(groupPhase.phase2Bonus)} | Tổng: ${formatCurrency(groupPhase.phase1Bonus + groupPhase.phase2Bonus)}\n`;
        } else {
          text += `${idx + 1}. ${g.nhom || g.maNhom} | ${g.leaderCode || ''} | ${g.leaderName || ''} | ${valueLabel} | ${tier ? `Thưởng: ${formatBonus(tier, g.totalFYP, g.activityRounds)}` : 'Chưa đạt'}\n`;
        }
      });
    } else {
      [...displayContracts].map((c) => {
        const tier = conditionType === 'per_contract' ? calculateBonus(c.fyp).tier : null;
        const phaseInfo = getRowPhaseBonus(c.fyp, c.effectiveDate);
        return { contract: c, tier, phaseInfo };
      }).sort((a, b) => ((b.phaseInfo.phase1Bonus + b.phaseInfo.phase2Bonus) - (a.phaseInfo.phase1Bonus + a.phaseInfo.phase2Bonus))).forEach(({ contract: c, tier, phaseInfo }, idx) => {
        const contractInfo = conditionType === 'per_contract' ? ` | ${formatDate(c.effectiveDate)}` : '';
        if (usePhase2 && phase2StartDate) {
          text += `${idx + 1}. ${c.agentCode} | ${c.agentName}${contractInfo} | IP: ${formatNumber(c.fyp)} | GD1: ${formatCurrency(phaseInfo.phase1Bonus)} | GD2: ${formatCurrency(phaseInfo.phase2Bonus)} | Tổng: ${formatCurrency(phaseInfo.phase1Bonus + phaseInfo.phase2Bonus)}\n`;
        } else {
          text += `${idx + 1}. ${c.nhom || c.maNhom} | ${c.agentCode} | ${c.agentName}${contractInfo} | IP: ${formatNumber(c.fyp)} | ${tier ? `Thưởng: ${formatBonus(tier, c.fyp)}` : 'Chưa đạt'}\n`;
        }
      });
    }
    navigator.clipboard.writeText(text).then(() => toast({ title: 'Đã sao chép!', description: 'Dán vào Zalo/Telegram' })).catch(() => toast({ title: 'Lỗi', description: 'Không thể sao chép', variant: 'destructive' }));
  };

  const handleExport = () => {
    if (displayContracts.length === 0 && nydData.length === 0) { toast({ title: 'Thông báo', description: 'Không có dữ liệu' }); return; }
    let headers: string[];
    let rows: (string | number)[][];

    if (isNYDMode(conditionType)) {
      headers = ['STT', 'Nhóm', 'Mã số', 'Họ tên', 'Chức vụ', isNYDActivityMode(conditionType) ? (conditionType === 'nyd_activity_tvv90' ? 'Lượt TVV90 HĐ' : 'Lượt TVVm HĐ') : 'FYP TVVm', ...(includeOwnNYD ? ['IP cá nhân'] : []), 'Thưởng', 'Ghi chú'];
      rows = nydData.map(n => {
        const value = isNYDActivityMode(conditionType) ? n.recruitCount : (n.recruitFYP + (includeOwnNYD ? n.ownFYP : 0));
        const { tier } = calculateBonus(value);
        const base = [n.nhom || '', n.nydCode, n.nydName, n.position || '', isNYDActivityMode(conditionType) ? n.recruitCount : value];
        if (includeOwnNYD) base.push(n.ownFYP);
        base.push(tier ? formatBonus(tier, value, n.recruitCount) : '');
        base.push(tier ? '' : 'Chưa đạt mức');
        return base;
      }).map((r, idx) => [idx + 1, ...r]);
    } else if (targetType === 'nhom') {
      const condHeader = isActivityRoundMode(conditionType) ? (conditionType === 'activity_round_standard' ? 'Lượt HĐ Chuẩn' : conditionType === 'activity_round_tvv90' ? 'Lượt HĐ TVV90' : 'Lượt HĐ') : 'Tổng IP';
      if (usePhase2) {
        headers = ['STT', 'Nhóm', 'Mã TN', 'Tên TN', condHeader, 'Thưởng GD1', 'Thưởng GD2', 'Tổng Thưởng', 'Ghi chú'];
        rows = [...groupedData].map((g) => {
          const groupPhase = getGroupPhaseBonus(g);
          const tier = isActivityRoundMode(conditionType) ? calculateActivityRoundBonus(g.activityRounds).tier : calculateBonus(g.totalFYP).tier;
          return { g, tier, groupPhase };
        }).sort((a, b) => ((b.groupPhase.phase1Bonus + b.groupPhase.phase2Bonus) - (a.groupPhase.phase1Bonus + a.groupPhase.phase2Bonus))).map(({ g, tier, groupPhase }, idx) =>
          [idx + 1, g.nhom || g.maNhom, g.leaderCode || '', g.leaderName || '', isActivityRoundMode(conditionType) ? `${g.activityRounds} lượt` : g.totalFYP, groupPhase.phase1Bonus || '', groupPhase.phase2Bonus || '', groupPhase.phase1Bonus + groupPhase.phase2Bonus || '', tier ? '' : 'Chưa đạt mức']
        );
      } else {
        headers = ['STT', 'Nhóm', 'Mã TN', 'Tên TN', condHeader, 'Thưởng', 'Ghi chú'];
        rows = [...groupedData].map((g) => { const { tier } = isActivityRoundMode(conditionType) ? calculateActivityRoundBonus(g.activityRounds) : calculateBonus(g.totalFYP); return { g, tier }; }).sort((a, b) => (b.tier?.bonusAmount || 0) - (a.tier?.bonusAmount || 0)).map(({ g, tier }, idx) => [idx + 1, g.nhom || g.maNhom, g.leaderCode || '', g.leaderName || '', isActivityRoundMode(conditionType) ? `${g.activityRounds} lượt` : g.totalFYP, tier ? formatBonus(tier, g.totalFYP, g.activityRounds) : '', tier ? '' : 'Chưa đạt mức']);
      }
    } else {
      // TVV per-contract or total_fyp
      if (conditionType === 'per_contract') {
        if (usePhase2) {
          headers = ['STT', 'Nhóm', 'Mã số', 'Họ tên', 'Ngày HL', 'IP', ...(useSecondaryCondition && secondaryAFYPMin > 0 ? ['AFYP'] : []), 'Thưởng GD1', 'Thưởng GD2', 'Tổng Thưởng', 'Ghi chú'];
          rows = [...displayContracts].map((c) => {
            const { tier } = calculateBonus(c.fyp);
            const phaseInfo = getRowPhaseBonus(c.fyp, c.effectiveDate);
            return { c, tier, phaseInfo };
          }).sort((a, b) => ((b.phaseInfo.phase1Bonus + b.phaseInfo.phase2Bonus) - (a.phaseInfo.phase1Bonus + a.phaseInfo.phase2Bonus))).map(({ c, tier, phaseInfo }, idx) => {
            const base: (string | number)[] = [idx + 1, c.nhom || c.maNhom, c.agentCode, c.agentName, formatDate(c.effectiveDate), c.fyp];
            if (useSecondaryCondition && secondaryAFYPMin > 0) base.push(c.afyp);
            base.push(phaseInfo.phase1Bonus || '', phaseInfo.phase2Bonus || '', phaseInfo.phase1Bonus + phaseInfo.phase2Bonus || '', tier ? '' : 'Chưa đạt mức');
            return base;
          });
        } else {
          headers = ['STT', 'Nhóm', 'Mã số', 'Họ tên', 'Ngày HL', 'IP', ...(useSecondaryCondition && secondaryAFYPMin > 0 ? ['AFYP'] : []), 'Thưởng', 'Ghi chú'];
          rows = [...displayContracts].map((c) => { const { tier } = calculateBonus(c.fyp); return { c, tier }; }).sort((a, b) => (b.tier?.bonusAmount || 0) - (a.tier?.bonusAmount || 0)).map(({ c, tier }, idx) => {
            const base: (string | number)[] = [idx + 1, c.nhom || c.maNhom, c.agentCode, c.agentName, formatDate(c.effectiveDate), c.fyp];
            if (useSecondaryCondition && secondaryAFYPMin > 0) base.push(c.afyp);
            base.push(tier ? formatBonus(tier, c.fyp) : '', tier ? '' : 'Chưa đạt mức');
            return base;
          });
        }
      } else {
        if (usePhase2) {
          headers = ['STT', 'Nhóm', 'Mã số', 'Họ tên', 'Tổng IP', 'Thưởng GD1', 'Thưởng GD2', 'Tổng Thưởng', 'Ghi chú'];
          rows = [...displayContracts].map((c) => {
            const { tier } = calculateBonus(c.fyp);
            const phaseInfo = getRowPhaseBonus(c.fyp, c.effectiveDate);
            return { c, tier, phaseInfo };
          }).sort((a, b) => ((b.phaseInfo.phase1Bonus + b.phaseInfo.phase2Bonus) - (a.phaseInfo.phase1Bonus + a.phaseInfo.phase2Bonus))).map(({ c, tier, phaseInfo }, idx) =>
            [idx + 1, c.nhom || c.maNhom, c.agentCode, c.agentName, c.fyp, phaseInfo.phase1Bonus || '', phaseInfo.phase2Bonus || '', phaseInfo.phase1Bonus + phaseInfo.phase2Bonus || '', tier ? '' : 'Chưa đạt mức']
          );
        } else {
          headers = ['STT', 'Nhóm', 'Mã số', 'Họ tên', 'Tổng IP', 'Thưởng', 'Ghi chú'];
          rows = [...displayContracts].map((c) => { const { tier } = calculateBonus(c.fyp); return { c, tier }; }).sort((a, b) => (b.tier?.bonusAmount || 0) - (a.tier?.bonusAmount || 0)).map(({ c, tier }, idx) => [idx + 1, c.nhom || c.maNhom, c.agentCode, c.agentName, c.fyp, tier ? formatBonus(tier, c.fyp) : '', tier ? '' : 'Chưa đạt mức']);
        }
      }
    }
    const csvContent = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = `ket_qua_thi_dua_${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
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
      const blob = await toBlob(resultContentRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
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

  // Consolidated stats computation - single useMemo for all derived values
  const stats = useMemo(() => {
    const totalFYP = displayContracts.reduce((sum, c) => sum + c.fyp, 0);
    
    // TVV stats
    const tvvAchievedCount = displayContracts.filter(c => calculateBonus(c.fyp).tier).length;
    const tvvTotalBonus = displayContracts.reduce((sum, c) => sum + getBonusAmount(c.fyp), 0);
    
    // Nhóm stats
    const nhomAchievedCount = groupedData.filter(g => {
      if (isActivityRoundMode(conditionType)) return calculateActivityRoundBonus(g.activityRounds).tier;
      return calculateBonus(g.totalFYP).tier;
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
    const nydAchievedCount = isNYDMode(conditionType) ? nydData.filter(n => {
      const value = isNYDActivityMode(conditionType) ? n.recruitCount : (n.recruitFYP + (includeOwnNYD ? n.ownFYP : 0));
      return calculateBonus(value).tier;
    }).length : 0;
    const nydNotAchievedCount = isNYDMode(conditionType) ? nydData.length - nydAchievedCount : 0;
    const nydTotalBonus = isNYDMode(conditionType) ? nydData.reduce((sum, n) => {
      const value = isNYDActivityMode(conditionType) ? n.recruitCount : (n.recruitFYP + (includeOwnNYD ? n.ownFYP : 0));
      const { tier } = calculateBonus(value);
      if (!tier) return sum;
      return sum + computeBonusFromTier(tier, value, n.recruitCount);
    }, 0) : 0;
    
    const achievedCount = isNYDMode(conditionType) ? nydAchievedCount : isActivityRoundMode(conditionType) ? arAchievedCount : targetType === 'nhom' ? nhomAchievedCount : tvvAchievedCount;
    const notAchievedCount = isNYDMode(conditionType) ? nydNotAchievedCount : isActivityRoundMode(conditionType) ? arNotAchievedCount : targetType === 'nhom' ? groupedData.length - nhomAchievedCount : displayContracts.length - tvvAchievedCount;
    
    const baseTotalBonus = isNYDMode(conditionType) ? nydTotalBonus : isActivityRoundMode(conditionType) ? arTotalBonus : targetType === 'nhom' ? nhomTotalBonus : tvvTotalBonus;
    const totalBonusDisplay = usePhase2 && phase2Results ? phase2Results.totalBonus : baseTotalBonus;
    const displayTotalFYP = targetType === 'nhom' ? nhomTotalFYP : totalFYP;
    
    // total_fyp mode
    const totalFYPValue = displayContracts.reduce((sum, c) => sum + c.fyp, 0);
    const matchedTotalTier = conditionType === 'total_fyp' && targetType !== 'nhom' ? calculateBonus(totalFYPValue).tier : null;
    const totalRemaining = conditionType === 'total_fyp' && matchedTotalTier ? getRemainingToNextTier(totalFYPValue) : null;
    
    return {
      totalFYP, tvvAchievedCount, tvvTotalBonus,
      nhomAchievedCount, nhomTotalFYP, nhomTotalBonus,
      arAchievedCount, arNotAchievedCount, arTotalBonus,
      nydAchievedCount, nydNotAchievedCount, nydTotalBonus,
      achievedCount, notAchievedCount,
      baseTotalBonus, totalBonusDisplay, displayTotalFYP,
      totalFYPValue, matchedTotalTier, totalRemaining
    };
  }, [displayContracts, groupedData, nydData, conditionType, targetType, includeOwnNYD, usePhase2, phase2Results, calculateBonus, getBonusAmount, calculateActivityRoundBonus, getActivityRoundBonusAmount, getRemainingToNextTier]);

  const { totalFYP, tvvAchievedCount, tvvTotalBonus, nhomAchievedCount, nhomTotalFYP, nhomTotalBonus, arAchievedCount, arNotAchievedCount, arTotalBonus, nydAchievedCount, nydNotAchievedCount, nydTotalBonus, achievedCount, notAchievedCount, baseTotalBonus, totalBonusDisplay, displayTotalFYP, totalFYPValue, matchedTotalTier, totalRemaining } = stats;

  const sortedTiers = useMemo(() => [...bonusTiers].sort((a, b) => a.minFYP - b.minFYP), [bonusTiers]);

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
      if (secondaryIPMin > 0) results = results.filter((c) => c.fyp >= secondaryIPMin);
    }
    results.sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());
    if (results.length === 0) {
      setFilteredContracts([]);
      toast({ title: 'Thông báo', description: 'Không tìm thấy hợp đồng nào phù hợp' });
      return;
    }
    setFilteredContracts(results);
    setIsResultDialogOpen(true);
    toast({ title: 'Thành công', description: `Tìm thấy ${results.length} hợp đồng` });
  };

  // Neon border style like main page
  const neonBorder = 'border border-emerald-500/30 shadow-[0_0_15px_rgba(0,255,136,0.1)]';

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
      const luotThreshold = conditionType === 'activity_round_standard' ? 12_000_000 : 3_000_000;
      const applyTVV90 = isTVV90Mode(conditionType) || useTVV90Filter;
      const p1Rounds = calculateLuot(phase1Contracts, luotThreshold, useTVVmFilter, applyTVV90);
      const p1FYP = phase1Contracts.reduce((s, c) => s + c.fyp, 0);
      const p1Res = calculateActivityRoundBonusWithTiers(p1Rounds, bonusTiers);
      phase1Tier = p1Res.tier;
      if (p1Res.tier) phase1Bonus = computeBonusFromTier(p1Res.tier, p1FYP, p1Rounds);

      const p2Rounds = calculateLuot(phase2Contracts, luotThreshold, useTVVmFilter, applyTVV90);
      const p2FYP = phase2Contracts.reduce((s, c) => s + c.fyp, 0);
      const p2Res = calculateActivityRoundBonusWithTiers(p2Rounds, bonusTiers2);
      phase2Tier = p2Res.tier;
      if (p2Res.tier) phase2Bonus = computeBonusFromTier(p2Res.tier, p2FYP, p2Rounds);
    } else {
      const p1Total = phase1Contracts.reduce((s, c) => s + c.fyp, 0);
      const p1Res = calculateBonusWithTiers(p1Total, bonusTiers);
      phase1Tier = p1Res.tier;
      if (p1Res.tier) phase1Bonus = computeBonusFromTier(p1Res.tier, p1Total);

      const p2Total = phase2Contracts.reduce((s, c) => s + c.fyp, 0);
      const p2Res = calculateBonusWithTiers(p2Total, bonusTiers2);
      phase2Tier = p2Res.tier;
      if (p2Res.tier) phase2Bonus = computeBonusFromTier(p2Res.tier, p2Total);
    }

    return { phase1Bonus, phase2Bonus, phase1Tier, phase2Tier };
  }, [usePhase2, phase2StartDate, conditionType, calculateBonus, calculateBonusWithTiers, calculateActivityRoundBonus, calculateActivityRoundBonusWithTiers, bonusTiers, bonusTiers2, useTVVmFilter, useTVV90Filter]);

  // Build NYD result rows
  const nydResultRows = useMemo(() => {
    if (!isNYDMode(conditionType)) return [];
    return nydData.map(n => {
      const value = isNYDActivityMode(conditionType) ? n.recruitCount : (n.recruitFYP + (includeOwnNYD ? n.ownFYP : 0));
      const { tier, tierIndex } = calculateBonus(value);
      return { nyd: n, tier, tierIndex, value };
    }).sort((a, b) => (b.tier?.bonusAmount || 0) - (a.tier?.bonusAmount || 0));
  }, [nydData, conditionType, includeOwnNYD, calculateBonus]);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Grid background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(0,255,136,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      {/* Header */}
      <header className="border-b border-emerald-500/20 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-3 py-2.5 flex items-center gap-2">
          <button
            onClick={() => router.push('/')}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center"><Trophy className="w-4 h-4 text-white" /></div>
          <h1 className="text-lg font-extrabold text-emerald-400 drop-shadow-[0_0_10px_rgba(0,255,136,0.5)] drop-shadow-[0_0_30px_rgba(0,255,136,0.2)]">Tính Thưởng Thi Đua</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 py-4 space-y-4 relative">
        {/* STEP 1: Info */}
        <Card className={`${neonBorder} bg-white/5 backdrop-blur-sm`}>
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
                <CardTitle className="text-sm text-emerald-400 whitespace-nowrap drop-shadow-[0_0_6px_rgba(0,255,136,0.3)]">Thông tin chương trình</CardTitle>
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                <Select value={selectedContestId} onValueChange={handleLoadContest}>
                  <SelectTrigger className="w-[160px] h-7 text-xs bg-white/5 border-emerald-500/20 text-white"><BookmarkPlus className="w-3 h-3 mr-1 text-emerald-400" /><SelectValue placeholder="Đã lưu..." /></SelectTrigger>
                  <SelectContent>{savedContests.length === 0 ? <SelectItem value="_none" disabled>Chưa có</SelectItem> : savedContests.map((sc) => (<SelectItem key={sc.id} value={sc.id}><div className="flex items-center gap-2"><span className="truncate">{sc.title}</span><Button variant="ghost" size="sm" className="h-4 w-4 p-0 text-red-400 hover:text-red-600" onClick={(e) => handleDeleteContest(sc.id, e)}><Trash2 className="w-2.5 h-2.5" /></Button></div></SelectItem>))}</SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={handleSaveContest} disabled={isSaving} className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-7 text-xs bg-transparent">{isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}Lưu</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-white/70">Tên chương trình thi đua</Label>
              <Input value={contestTitle} onChange={(e) => setContestTitle(e.target.value)} className="font-semibold border-emerald-500/20 bg-white/5 text-white h-9 text-sm w-full" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1"><Label className="text-xs text-white/50">Hiệu lực từ</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-xs border-emerald-500/20 bg-white/5 text-white" /></div>
              <div className="space-y-1"><Label className="text-xs text-white/50">Hiệu lực đến</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 text-xs border-emerald-500/20 bg-white/5 text-white" /></div>
              <div className="space-y-1"><Label className="text-xs text-white/50">Ngày phát hành</Label><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="h-8 text-xs border-emerald-500/20 bg-white/5 text-white" /></div>
            </div>
          </CardContent>
        </Card>

        {/* STEP 2: Config - Collapsible */}
        <Card className={`${neonBorder} bg-white/5 backdrop-blur-sm` + (!showConfig ? ' py-0' : '')}>
          <CardHeader className={!showConfig ? 'py-1.5 px-4' : 'pb-2 pt-3 px-4'}>
            <button className="flex items-center justify-between w-full" onClick={() => setShowConfig(!showConfig)}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
                <CardTitle className="text-sm text-emerald-400 whitespace-nowrap">Cấu hình thi đua & Thưởng</CardTitle>
              </div>
              {showConfig ? <ChevronUp className="w-4 h-4 text-emerald-400/60" /> : <ChevronDown className="w-4 h-4 text-emerald-400/60" />}
            </button>
          </CardHeader>
          {showConfig && (
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Target */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-white/70">Đối tượng</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => { if (!isActivityRoundMode(conditionType)) setTargetType('tvv'); }}
                      disabled={isActivityRoundMode(conditionType)}
                      className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl font-bold text-xs transition-all duration-200 ${
                        targetType === 'tvv'
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-300/50'
                          : 'bg-emerald-500/20 text-emerald-300/60 hover:bg-emerald-500/30 hover:text-emerald-200'
                      } ${isActivityRoundMode(conditionType) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <Users className="w-4 h-4" />
                      <span>TVV</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (!isNYDMode(conditionType)) setTargetType('nhom'); }}
                      disabled={isNYDMode(conditionType)}
                      className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl font-bold text-xs transition-all duration-200 ${
                        targetType === 'nhom'
                          ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 ring-2 ring-sky-300/50'
                          : 'bg-sky-500/20 text-sky-300/60 hover:bg-sky-500/30 hover:text-sky-200'
                      } ${isNYDMode(conditionType) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Nhóm</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (isNYDMode(conditionType)) setTargetType('nyd'); }}
                      disabled={!isNYDMode(conditionType)}
                      className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl font-bold text-xs transition-all duration-200 ${
                        targetType === 'nyd'
                          ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30 ring-2 ring-violet-300/50'
                          : 'bg-violet-500/20 text-violet-300/60 hover:bg-violet-500/30 hover:text-violet-200'
                      } ${!isNYDMode(conditionType) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>NYD</span>
                    </button>
                  </div>
                </div>
                {/* Condition */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-white/70">Điều kiện</Label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {([
                      { value: 'per_contract' as ConditionType, label: 'Theo HĐ', icon: FileText, selectedCls: 'bg-emerald-600 text-white shadow-lg brightness-110 ring-2 ring-white/30', unselectedCls: 'bg-emerald-600/50 text-white/70 hover:brightness-110 hover:text-white/90' },
                      { value: 'total_fyp' as ConditionType, label: 'Tổng IP', icon: TrendingUp, selectedCls: 'bg-teal-600 text-white shadow-lg brightness-110 ring-2 ring-white/30', unselectedCls: 'bg-teal-600/50 text-white/70 hover:brightness-110 hover:text-white/90' },
                      { value: 'activity_round' as ConditionType, label: 'Lượt HĐ', icon: Users, selectedCls: 'bg-amber-600 text-white shadow-lg brightness-110 ring-2 ring-white/30', unselectedCls: 'bg-amber-600/50 text-white/70 hover:brightness-110 hover:text-white/90' },
                      { value: 'activity_round_standard' as ConditionType, label: 'Lượt Chuẩn', icon: Award, selectedCls: 'bg-orange-600 text-white shadow-lg brightness-110 ring-2 ring-white/30', unselectedCls: 'bg-orange-600/50 text-white/70 hover:brightness-110 hover:text-white/90' },
                      { value: 'activity_round_tvv90' as ConditionType, label: 'Lượt TVV90', icon: Users, selectedCls: 'bg-rose-600 text-white shadow-lg brightness-110 ring-2 ring-white/30', unselectedCls: 'bg-rose-600/50 text-white/70 hover:brightness-110 hover:text-white/90' },
                      { value: 'nyd_activity' as ConditionType, label: 'NTD - TVVm', icon: UserPlus, selectedCls: 'bg-violet-600 text-white shadow-lg brightness-110 ring-2 ring-white/30', unselectedCls: 'bg-violet-600/50 text-white/70 hover:brightness-110 hover:text-white/90' },
                      { value: 'nyd_activity_tvv90' as ConditionType, label: 'NTD - TVV90', icon: UserPlus, selectedCls: 'bg-fuchsia-600 text-white shadow-lg brightness-110 ring-2 ring-white/30', unselectedCls: 'bg-fuchsia-600/50 text-white/70 hover:brightness-110 hover:text-white/90' },
                      { value: 'nyd_fyp' as ConditionType, label: 'NTD - FYP', icon: UserPlus, selectedCls: 'bg-purple-600 text-white shadow-lg brightness-110 ring-2 ring-white/30', unselectedCls: 'bg-purple-600/50 text-white/70 hover:brightness-110 hover:text-white/90' },
                    ]).map(({ value, label, icon: Icon, selectedCls, unselectedCls }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setConditionType(value);
                          if (isActivityRoundMode(value)) setTargetType('nhom');
                          if (isNYDMode(value)) setTargetType('nyd');
                        }}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer w-full ${
                          conditionType === value ? selectedCls : unselectedCls
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
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
                  <Label htmlFor="usePhase2" className="text-xs font-medium text-white/70 flex items-center gap-1 cursor-pointer">
                    <Layers className="w-3.5 h-3.5 text-sky-400" /> Chia 2 giai đoạn
                  </Label>
                </div>
                {usePhase2 && (
                  <div className="space-y-2 pl-4 border-l-2 border-sky-500/20">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><Label className="text-[10px] text-sky-400/70">GĐ2 Hiệu lực từ</Label><Input type="date" value={phase2StartDate} onChange={(e) => setPhase2StartDate(e.target.value)} className="h-7 text-xs border-sky-500/20 bg-white/5 text-white" /></div>
                      <div className="space-y-1"><Label className="text-[10px] text-sky-400/70">GĐ2 Hiệu lực đến</Label><Input type="date" value={phase2EndDate} onChange={(e) => setPhase2EndDate(e.target.value)} className="h-7 text-xs border-sky-500/20 bg-white/5 text-white" /></div>
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

              {/* Secondary Condition */}
              <Separator className="bg-emerald-500/20" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="useSecondaryCondition" checked={useSecondaryCondition} onCheckedChange={(v) => setUseSecondaryCondition(!!v)} />
                  <Label htmlFor="useSecondaryCondition" className="text-xs font-medium text-white/70 flex items-center gap-1 cursor-pointer">
                    <Settings2 className="w-3.5 h-3.5 text-orange-400" /> Điều kiện phụ
                  </Label>
                </div>
                {useSecondaryCondition && (
                  <div className="grid grid-cols-2 gap-2 pl-4 border-l-2 border-orange-500/20">
                    <div className="space-y-1"><Label className="text-[10px] text-orange-400/70">AFYP tối thiểu (nđ)</Label><Input type="number" placeholder="0" value={secondaryAFYPMin ? vndToNgan(secondaryAFYPMin) : ''} onChange={(e) => setSecondaryAFYPMin(nganToVnd(parseFloat(e.target.value) || 0))} className="h-7 text-xs border-orange-500/20 bg-white/5 text-white" /></div>
                    <div className="space-y-1"><Label className="text-[10px] text-orange-400/70">IP tối thiểu (nđ)</Label><Input type="number" placeholder="0" value={secondaryIPMin ? vndToNgan(secondaryIPMin) : ''} onChange={(e) => setSecondaryIPMin(nganToVnd(parseFloat(e.target.value) || 0))} className="h-7 text-xs border-orange-500/20 bg-white/5 text-white" /></div>
                  </div>
                )}
              </div>

              {/* Options */}
              <Separator className="bg-emerald-500/20" />
              <div className="space-y-2">
                <Label className="text-xs font-medium text-white/70">Tùy chọn</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* TVVm Filter - visible in activity_round mode and NYD activity mode */}
                  {(isActivityRoundMode(conditionType) || isNYDActivityMode(conditionType)) && (
                    <div className="flex items-center gap-2 p-2 rounded-lg border border-emerald-500/10 bg-white/[0.02]">
                      <Checkbox id="useTVVmFilter" checked={useTVVmFilter} onCheckedChange={(v) => setUseTVVmFilter(!!v)} />
                      <Label htmlFor="useTVVmFilter" className="text-xs text-white/60 cursor-pointer flex items-center gap-1">
                        <Filter className="w-3 h-3 text-emerald-400" /> Chỉ tính TVVm (≤12 tháng)
                      </Label>
                    </div>
                  )}
                  {/* TVV90 Filter - visible in activity_round mode and NYD activity mode */}
                  {(isActivityRoundMode(conditionType) || isNYDActivityMode(conditionType)) && !isTVV90Mode(conditionType) && (
                    <div className="flex items-center gap-2 p-2 rounded-lg border border-rose-500/10 bg-white/[0.02]">
                      <Checkbox id="useTVV90Filter" checked={useTVV90Filter} onCheckedChange={(v) => setUseTVV90Filter(!!v)} />
                      <Label htmlFor="useTVV90Filter" className="text-xs text-white/60 cursor-pointer flex items-center gap-1">
                        <Filter className="w-3 h-3 text-rose-400" /> Chỉ tính TVV90 (≤3 tháng)
                      </Label>
                    </div>
                  )}
                  {/* Hide not achieved */}
                  <div className="flex items-center gap-2 p-2 rounded-lg border border-emerald-500/10 bg-white/[0.02]">
                    <Checkbox id="hideNotAchieved" checked={hideNotAchieved} onCheckedChange={(v) => setHideNotAchieved(!!v)} />
                    <Label htmlFor="hideNotAchieved" className="text-xs text-white/60 cursor-pointer flex items-center gap-1">
                      <EyeOff className="w-3 h-3 text-gray-400" /> Ẩn chưa đạt mức
                    </Label>
                  </div>
                  {/* includeOwnNYD - only visible in NYD mode */}
                  {isNYDMode(conditionType) && conditionType === 'nyd_fyp' && (
                    <div className="flex items-center gap-2 p-2 rounded-lg border border-violet-500/10 bg-white/[0.02]">
                      <Checkbox id="includeOwnNYD" checked={includeOwnNYD} onCheckedChange={(v) => setIncludeOwnNYD(!!v)} />
                      <Label htmlFor="includeOwnNYD" className="text-xs text-white/60 cursor-pointer flex items-center gap-1">
                        <UserPlus className="w-3 h-3 text-violet-400" /> Cộng IP của NYD
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
                {posterUrl && <Button variant="outline" size="sm" onClick={() => setPosterUrl('')} className="text-red-400 border-emerald-500/20 bg-transparent h-7 text-xs"><X className="w-3 h-3 mr-0.5" />Xóa</Button>}
                {posterUrl && <img src={posterUrl} alt="Preview" className="h-8 rounded border border-emerald-500/20" />}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Action Buttons - Same Row, equal width */}
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-10 text-[11px] bg-transparent" onClick={handleImportFromUrl} disabled={isImporting}>
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
              <div className="rounded-lg bg-gradient-to-r from-orange-900/40 to-amber-900/40 border border-orange-500/20 p-3">
                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-orange-400" /><div className="flex-1"><p className="text-xs font-bold text-orange-300">{conditionType === 'activity_round' ? 'Lượt HĐ' : conditionType === 'activity_round_standard' ? 'Lượt HĐ Chuẩn' : 'Lượt HĐ TVV90'}: IP ≥ {conditionType === 'activity_round_standard' ? '12' : '3'} triệu = 1 lượt{isTVV90Mode(conditionType) || useTVV90Filter ? ' (TVV90 ≤3T)' : ''}</p></div><div className="text-right"><p className="text-[10px] text-orange-400/60">Tổng thưởng</p><p className="text-base font-extrabold text-orange-400">{formatCurrency(arTotalBonus)}</p></div></div>
              </div>
            )}
            {conditionType === 'total_fyp' && matchedTotalTier && (
              <div className="rounded-lg bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/20 p-3">
                <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-amber-400" /><div className="flex-1"><p className="text-xs font-bold text-amber-300">Tổng IP: {formatCurrency(totalFYPValue)}</p></div><div className="text-right"><p className="text-base font-extrabold text-amber-400">{formatBonus(matchedTotalTier, totalFYPValue)}</p></div>{totalRemaining !== null && <div className="text-right border-l border-white/10 pl-2"><p className="text-[10px] text-orange-400/60">Cần thêm</p><p className="text-sm font-bold text-orange-400">{formatCurrency(totalRemaining)}</p></div>}</div>
              </div>
            )}
            {isNYDMode(conditionType) && nydData.length > 0 && (
              <div className="rounded-lg bg-gradient-to-r from-violet-900/40 to-purple-900/40 border border-violet-500/20 p-3">
                <div className="flex items-center gap-2"><UserPlus className="w-4 h-4 text-violet-400" /><div className="flex-1"><p className="text-xs font-bold text-violet-300">{isNYDActivityMode(conditionType) ? (conditionType === 'nyd_activity_tvv90' ? 'Lượt TVV90 HĐ' : 'Lượt TVVm HĐ') : 'FYP TVVm'} (NYD)</p><p className="text-[10px] text-violet-400/60">{isNYDActivityMode(conditionType) ? 'TVV có IP ≥ 3tr/tháng = 1 lượt' : `Tổng FYP TVVm${includeOwnNYD ? ' + IP NYD' : ''}`}</p></div><div className="text-right"><p className="text-[10px] text-violet-400/60">Tổng thưởng</p><p className="text-base font-extrabold text-violet-400">{formatCurrency(nydTotalBonus)}</p></div></div>
              </div>
            )}
          </div>
        )}

        {/* Source Data - collapsible */}
        <Card className={`${neonBorder} bg-white/5 backdrop-blur-sm`}>
          <CardHeader className="pb-2 pt-3 px-4">
            <button className="flex items-center justify-between w-full" onClick={() => setShowSourceData(!showSourceData)}>
              <div className="flex items-center gap-2"><Database className="w-4 h-4 text-emerald-400/60" /><CardTitle className="text-sm text-white/70">Dữ liệu nguồn</CardTitle><Badge variant="secondary" className="text-[10px]">{contracts.length} HĐ</Badge></div>
              {showSourceData ? <ChevronUp className="w-4 h-4 text-emerald-400/60" /> : <ChevronDown className="w-4 h-4 text-emerald-400/60" />}
            </button>
          </CardHeader>
          {showSourceData && (
            <CardContent className="px-4 pb-3">
              {contracts.length === 0 ? (
                <div className="text-center py-6 text-white/30"><Database className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm font-medium">Chưa có dữ liệu</p><p className="text-xs">Nhấn &ldquo;Nhập HD&rdquo; để tải từ Google Sheets</p></div>
              ) : (
                <div className="rounded-lg border border-emerald-500/20 overflow-x-auto max-h-48 overflow-y-auto">
                  <Table><TableHeader><TableRow className="bg-white/5 sticky top-0"><TableHead className="w-[35px] text-center text-xs text-emerald-400/60">STT</TableHead><TableHead className="text-xs text-emerald-400/60">MC NHÓM</TableHead><TableHead className="text-xs text-emerald-400/60">Mã</TableHead><TableHead className="text-xs text-emerald-400/60">Họ tên</TableHead><TableHead className="text-xs text-emerald-400/60">Ngày HL</TableHead><TableHead className="text-xs text-emerald-400/60">IP</TableHead><TableHead className="w-[30px]"></TableHead></TableRow></TableHeader>
                    <TableBody>{contracts.map((c, idx) => (
                      <TableRow key={c.id} className="hover:bg-white/5 border-white/5"><TableCell className="text-center text-white/30 text-xs">{idx + 1}</TableCell><TableCell className="font-mono text-[10px] text-emerald-400 whitespace-nowrap">{c.maNhom}</TableCell><TableCell className="font-mono text-[10px] text-white/50 whitespace-nowrap">{c.agentCode}</TableCell><TableCell className="text-xs text-white/70 whitespace-nowrap">{c.agentName}</TableCell><TableCell className="text-[10px] text-white/40 whitespace-nowrap">{formatDate(c.effectiveDate)}</TableCell><TableCell className="font-semibold text-emerald-400 text-xs whitespace-nowrap">{formatNumber(c.fyp)}</TableCell><TableCell><Button variant="ghost" size="sm" onClick={async () => { try { const res = await fetch(`/api/contracts?id=${c.id}`, { method: 'DELETE' }); if (res.ok) { toast({ title: 'Thành công', description: 'Đã xóa' }); fetchContracts(); setFilteredContracts((prev) => prev.filter((fc) => fc.id !== c.id)); } } catch { toast({ title: 'Lỗi', description: 'Không thể xóa', variant: 'destructive' }); } }} className="h-5 w-5 p-0 text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></Button></TableCell></TableRow>
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
        <DialogContent className={`${isResultExpanded ? 'sm:max-w-5xl max-h-[95vh]' : 'sm:max-w-2xl max-h-[67vh]'} overflow-y-auto bg-white border-emerald-200 p-0 transition-all duration-300`}>
          {/* Action bar */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-emerald-100 px-3 py-2 flex items-center justify-between">
            <DialogTitle className="text-emerald-700 text-sm font-bold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-600" />
              Kết quả chi tiết
            </DialogTitle>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setIsResultExpanded(!isResultExpanded)} className="border-emerald-200 text-emerald-600 h-7 w-7 p-0 hover:bg-emerald-50">
                {isResultExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadImage} disabled={isDownloadingImage} className="border-emerald-200 text-emerald-600 h-7 text-xs hover:bg-emerald-50">
                {isDownloadingImage ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Camera className="w-3 h-3 mr-1" />}Tải ảnh
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyText} className="border-emerald-200 text-emerald-600 h-7 text-xs hover:bg-emerald-50"><Copy className="w-3 h-3 mr-1" />Copy</Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="border-emerald-200 text-emerald-600 h-7 text-xs hover:bg-emerald-50"><Printer className="w-3 h-3 mr-1" />In</Button>
              <Button variant="outline" size="sm" onClick={handleExport} className="border-gray-200 text-gray-600 h-7 text-xs hover:bg-gray-50"><Download className="w-3 h-3 mr-1" />CSV</Button>
            </div>
          </div>

          <div ref={resultContentRef} className="px-3 pb-3">
            <div ref={printRef}>
              {/* Poster image - full width, no gaps */}
              {posterUrl && <div className="mb-3"><img src={posterUrl} alt="Poster" className="w-full rounded-lg shadow-md" /></div>}
              {!posterUrl && (
                <ContestPoster contestTitle={contestTitle} startDate={startDate} endDate={endDate} conditionType={conditionType} targetType={targetType} sortedTiers={sortedTiers} filteredContracts={displayContracts} groupedData={groupedData} totalFYP={displayTotalFYP} totalBonus={totalBonusDisplay} achievedCount={achievedCount} notAchievedCount={notAchievedCount} formatCurrency={formatCurrency} formatNumber={formatNumber} formatDate={formatDate} variant="white" />
              )}

              {/* Result Table */}
              <div className="overflow-x-auto rounded-lg border border-emerald-200 shadow-sm mt-3 -mx-1 px-1">
                <Table className="text-[11px]">
                  <TableHeader>
                    <TableRow className="bg-emerald-700 hover:bg-emerald-700">
                      <TableHead className="text-white text-center w-[40px] font-bold">STT</TableHead>
                      {isNYDMode(conditionType) ? (
                        <>
                          <TableHead className="text-white min-w-[60px] font-bold text-center">NHÓM</TableHead>
                          <TableHead className="text-white min-w-[55px] font-bold text-center">Mã số</TableHead>
                          <TableHead className="text-white min-w-[65px] font-bold text-center">Họ tên</TableHead>
                          <TableHead className="text-white min-w-[70px] font-bold text-center">Chức vụ</TableHead>
                          <TableHead className="text-white min-w-[65px] font-bold text-center">
                            <div>{isNYDActivityMode(conditionType) ? (conditionType === 'nyd_activity_tvv90' ? 'Lượt TVV90 HĐ' : 'Lượt TVVm HĐ') : 'FYP TVVm'}</div>
                          </TableHead>
                          {includeOwnNYD && (
                            <TableHead className="text-white min-w-[65px] font-bold text-center">IP cá nhân</TableHead>
                          )}
                          {usePhase2 ? (
                            <>
                              <TableHead className="text-white min-w-[60px] font-bold text-center bg-emerald-600/30">
                                <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                <div className="text-[9px] font-normal text-white/60 italic">GD1: {phase2StartDate ? formatDate(startDate) : '...'} - {phase2StartDate ? formatDate(phase2StartDate) : '...'}</div>
                              </TableHead>
                              <TableHead className="text-white min-w-[60px] font-bold text-center bg-emerald-600/30">
                                <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                <div className="text-[9px] font-normal text-white/60 italic">GD2: {phase2StartDate ? formatDate(phase2StartDate) : '...'} - {endDate ? formatDate(endDate) : '...'}</div>
                              </TableHead>
                              <TableHead className="text-white min-w-[60px] font-bold text-center bg-amber-600/30">
                                <div>Tổng Thưởng</div>
                              </TableHead>
                            </>
                          ) : (
                            <TableHead className="text-white min-w-[65px] font-bold text-center bg-emerald-600/30">
                              <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                            </TableHead>
                          )}
                          <TableHead className="text-white min-w-[60px] font-bold text-center">Ghi chú</TableHead>
                        </>
                      ) : targetType === 'nhom' ? (
                        <>
                          <TableHead className="text-white min-w-[70px] font-bold text-center">NHÓM</TableHead>
                          <TableHead className="text-white min-w-[60px] font-bold text-center">Mã TN</TableHead>
                          <TableHead className="text-white min-w-[65px] font-bold text-center">Tên TN</TableHead>
                          <TableHead className="text-white min-w-[70px] font-bold text-center">
                            {isActivityRoundMode(conditionType) ? (conditionType === 'activity_round_standard' ? 'Lượt HĐ Chuẩn' : conditionType === 'activity_round_tvv90' ? 'Lượt HĐ TVV90' : 'Lượt HĐ') : 'Tổng IP'}
                            {startDate && endDate && !isActivityRoundMode(conditionType) && <div className="text-[9px] font-normal text-white/60 italic">{formatDate(startDate)} - {formatDate(endDate)}</div>}
                          </TableHead>
                          {usePhase2 ? (
                            <>
                              <TableHead className="text-white min-w-[60px] font-bold text-center bg-emerald-600/30">
                                <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                <div className="text-[9px] font-normal text-white/60 italic">GD1: {phase2StartDate ? formatDate(startDate) : '...'} - {phase2StartDate ? formatDate(phase2StartDate) : '...'}</div>
                              </TableHead>
                              <TableHead className="text-white min-w-[60px] font-bold text-center bg-emerald-600/30">
                                <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                <div className="text-[9px] font-normal text-white/60 italic">GD2: {phase2StartDate ? formatDate(phase2StartDate) : '...'} - {endDate ? formatDate(endDate) : '...'}</div>
                              </TableHead>
                              <TableHead className="text-white min-w-[60px] font-bold text-center bg-amber-600/30">
                                <div>Tổng Thưởng</div>
                              </TableHead>
                            </>
                          ) : (
                            <TableHead className="text-white min-w-[65px] font-bold text-center bg-emerald-600/30">
                              <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                            </TableHead>
                          )}
                          <TableHead className="text-white min-w-[60px] font-bold text-center">Ghi chú</TableHead>
                        </>
                      ) : conditionType === 'per_contract' ? (
                        <>
                          <TableHead className="text-white min-w-[70px] font-bold text-center">NHÓM</TableHead>
                          <TableHead className="text-white min-w-[60px] font-bold text-center">Mã số</TableHead>
                          <TableHead className="text-white min-w-[65px] font-bold text-center">Họ tên</TableHead>
                          <TableHead className="text-white text-center w-[85px] font-bold">Ngày HL</TableHead>
                          <TableHead className="text-white min-w-[70px] font-bold text-center">IP</TableHead>
                          {useSecondaryCondition && secondaryAFYPMin > 0 && (
                            <TableHead className="text-white min-w-[70px] font-bold text-center">AFYP</TableHead>
                          )}
                          {usePhase2 ? (
                            <>
                              <TableHead className="text-white min-w-[60px] font-bold text-center bg-emerald-600/30">
                                <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                <div className="text-[9px] font-normal text-white/60 italic">GD1</div>
                              </TableHead>
                              <TableHead className="text-white min-w-[60px] font-bold text-center bg-emerald-600/30">
                                <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                <div className="text-[9px] font-normal text-white/60 italic">GD2</div>
                              </TableHead>
                              <TableHead className="text-white min-w-[60px] font-bold text-center bg-amber-600/30">
                                <div>Tổng Thưởng</div>
                              </TableHead>
                            </>
                          ) : (
                            <TableHead className="text-white min-w-[65px] font-bold text-center bg-emerald-600/30">
                              <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                            </TableHead>
                          )}
                          <TableHead className="text-white min-w-[60px] font-bold text-center">Ghi chú</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="text-white min-w-[70px] font-bold text-center">NHÓM</TableHead>
                          <TableHead className="text-white min-w-[60px] font-bold text-center">Mã số</TableHead>
                          <TableHead className="text-white min-w-[65px] font-bold text-center">Họ tên</TableHead>
                          <TableHead className="text-white min-w-[70px] font-bold text-center">
                            <div>Tổng IP</div>
                            {startDate && endDate && <div className="text-[9px] font-normal text-white/60 italic">{formatDate(startDate)} - {formatDate(endDate)}</div>}
                          </TableHead>
                          {usePhase2 ? (
                            <>
                              <TableHead className="text-white min-w-[60px] font-bold text-center bg-emerald-600/30">
                                <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                <div className="text-[9px] font-normal text-white/60 italic">GD1</div>
                              </TableHead>
                              <TableHead className="text-white min-w-[60px] font-bold text-center bg-emerald-600/30">
                                <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                                <div className="text-[9px] font-normal text-white/60 italic">GD2</div>
                              </TableHead>
                              <TableHead className="text-white min-w-[60px] font-bold text-center bg-amber-600/30">
                                <div>Tổng Thưởng</div>
                              </TableHead>
                            </>
                          ) : (
                            <TableHead className="text-white min-w-[65px] font-bold text-center bg-emerald-600/30">
                              <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                            </TableHead>
                          )}
                          <TableHead className="text-white min-w-[60px] font-bold text-center">Ghi chú</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isNYDMode(conditionType) ? nydResultRows.map(({ nyd, tier, value }, idx) => {
                      if (hideNotAchieved && !tier) return null;
                      const phaseBonus = usePhase2 && phase2StartDate ? (() => {
                        const p2Start = new Date(phase2StartDate);
                        const p1Contracts = displayContracts.filter(c => new Date(c.effectiveDate) < p2Start);
                        const p2Contracts = displayContracts.filter(c => new Date(c.effectiveDate) >= p2Start);
                        const applyTVV90 = isTVV90Mode(conditionType) || useTVV90Filter;
                        
                        // Phase 1: find recruited TVV for this NYD
                        const p1Recruited = p1Contracts.filter(c => c.recruiterCode === nyd.nydCode && c.agentCode !== nyd.nydCode);
                        let p1RecruitCount = 0;
                        let p1RecruitFYP = 0;
                        if (isNYDActivityMode(conditionType)) {
                          p1RecruitCount = calculateLuot(p1Recruited, 3_000_000, useTVVmFilter, applyTVV90);
                          p1RecruitFYP = p1Recruited.reduce((s, c) => s + c.fyp, 0);
                        } else {
                          const p1RecruitedMap = new Map<string, number>();
                          for (const rc of p1Recruited) { p1RecruitedMap.set(rc.agentCode, (p1RecruitedMap.get(rc.agentCode) || 0) + rc.fyp); }
                          for (const [, af] of p1RecruitedMap) { if (af >= 3_000_000) p1RecruitCount++; p1RecruitFYP += af; }
                        }
                        const p1OwnFYP = p1Contracts.filter(c => c.agentCode === nyd.nydCode).reduce((s, c) => s + c.fyp, 0);
                        const p1Value = isNYDActivityMode(conditionType) ? p1RecruitCount : (p1RecruitFYP + (includeOwnNYD ? p1OwnFYP : 0));
                        const p1Res = calculateBonusWithTiers(p1Value, bonusTiers);
                        const p1Bonus = p1Res.tier ? computeBonusFromTier(p1Res.tier, p1Value, p1RecruitCount) : 0;

                        // Phase 2
                        const p2Recruited = p2Contracts.filter(c => c.recruiterCode === nyd.nydCode && c.agentCode !== nyd.nydCode);
                        let p2RecruitCount = 0;
                        let p2RecruitFYP = 0;
                        if (isNYDActivityMode(conditionType)) {
                          p2RecruitCount = calculateLuot(p2Recruited, 3_000_000, useTVVmFilter, applyTVV90);
                          p2RecruitFYP = p2Recruited.reduce((s, c) => s + c.fyp, 0);
                        } else {
                          const p2RecruitedMap = new Map<string, number>();
                          for (const rc of p2Recruited) { p2RecruitedMap.set(rc.agentCode, (p2RecruitedMap.get(rc.agentCode) || 0) + rc.fyp); }
                          for (const [, af] of p2RecruitedMap) { if (af >= 3_000_000) p2RecruitCount++; p2RecruitFYP += af; }
                        }
                        const p2OwnFYP = p2Contracts.filter(c => c.agentCode === nyd.nydCode).reduce((s, c) => s + c.fyp, 0);
                        const p2Value = isNYDActivityMode(conditionType) ? p2RecruitCount : (p2RecruitFYP + (includeOwnNYD ? p2OwnFYP : 0));
                        const p2Res = calculateBonusWithTiers(p2Value, bonusTiers2);
                        const p2Bonus = p2Res.tier ? computeBonusFromTier(p2Res.tier, p2Value, p2RecruitCount) : 0;

                        return { phase1Bonus: p1Bonus, phase2Bonus: p2Bonus };
                      })() : null;
                      return (
                        <TableRow key={nyd.nydCode} className={`${tier ? 'bg-white' : 'bg-red-50/50'} hover:bg-emerald-50/50 border-b border-gray-100`}>
                          <TableCell className="text-center text-gray-500 text-xs">{idx + 1}</TableCell>
                          <TableCell className="text-xs text-gray-700">{nyd.nhom || '—'}</TableCell>
                          <TableCell className="text-xs text-gray-700 font-mono">{nyd.nydCode}</TableCell>
                          <TableCell className="text-xs text-gray-700">{nyd.nydName}</TableCell>
                          <TableCell className="text-xs text-gray-700">{nyd.position || '—'}</TableCell>
                          <TableCell className="text-right text-xs text-violet-600">
                            {isNYDActivityMode(conditionType) ? `${nyd.recruitCount} ${conditionType === 'nyd_activity_tvv90' ? 'TVV90' : 'TVVm'} lượt` : formatNumber(value)}
                          </TableCell>
                          {includeOwnNYD && (
                            <TableCell className="text-right text-xs text-gray-600">{formatNumber(nyd.ownFYP)}</TableCell>
                          )}
                          {usePhase2 && phaseBonus ? (
                            <>
                              <TableCell className="text-right bg-emerald-50/80 text-xs font-semibold text-emerald-600">{phaseBonus.phase1Bonus > 0 ? formatCurrency(phaseBonus.phase1Bonus) : <span className="text-gray-300">—</span>}</TableCell>
                              <TableCell className="text-right bg-emerald-50/80 text-xs font-semibold text-emerald-600">{phaseBonus.phase2Bonus > 0 ? formatCurrency(phaseBonus.phase2Bonus) : <span className="text-gray-300">—</span>}</TableCell>
                              <TableCell className="text-right bg-amber-50/80 text-xs font-bold text-amber-700">{formatCurrency(phaseBonus.phase1Bonus + phaseBonus.phase2Bonus)}</TableCell>
                            </>
                          ) : (
                            <TableCell className="text-right bg-emerald-50/80 text-xs">{tier ? <span className="flex items-center justify-end gap-1"><BonusTypeIcon type={tier.bonusType} className="w-3.5 h-3.5 text-emerald-500" /><span className="font-bold text-emerald-700">{formatBonus(tier, value, nyd.recruitCount)}</span></span> : <span className="text-gray-300">—</span>}</TableCell>
                          )}
                          <TableCell>{!tier ? <span className="text-[10px] italic text-gray-400">Chưa đạt</span> : null}</TableCell>
                        </TableRow>
                      );
                    }) : targetType === 'nhom' ? [...groupedData].map((g) => {
                      const groupPhase = getGroupPhaseBonus(g);
                      const tier = isActivityRoundMode(conditionType) ? calculateActivityRoundBonus(g.activityRounds).tier : calculateBonus(g.totalFYP).tier;
                      const remaining = isActivityRoundMode(conditionType) ? getRemainingToNextActivityRoundTier(g.activityRounds) : getRemainingToNextTier(g.totalFYP);
                      return { group: g, tier, remaining, groupPhase };
                    }).sort((a, b) => {
                      const aTotal = a.groupPhase.phase1Bonus + a.groupPhase.phase2Bonus;
                      const bTotal = b.groupPhase.phase1Bonus + b.groupPhase.phase2Bonus;
                      return bTotal - aTotal;
                    }).map(({ group, tier, remaining, groupPhase }, idx) => {
                      if (hideNotAchieved && !tier) return null;
                      return (
                        <TableRow key={group.maNhom} className={`${tier ? 'bg-white' : 'bg-red-50/50'} hover:bg-emerald-50/50 border-b border-gray-100`}>
                          <TableCell className="text-center text-gray-500 text-xs">{idx + 1}</TableCell>
                          <TableCell className="text-xs text-gray-700"><span className="font-semibold text-emerald-700">{group.nhom || group.maNhom}</span></TableCell>
                          <TableCell className="text-xs text-gray-700 font-mono">{group.leaderCode || '—'}</TableCell>
                          <TableCell className="text-xs text-gray-700"><span className="font-medium">{group.leaderName || '—'}</span></TableCell>
                          <TableCell className="text-right text-xs">
                            {isActivityRoundMode(conditionType)
                              ? <span className="text-orange-600">{group.activityRounds} lượt</span>
                              : <span className="text-gray-700">{formatNumber(group.totalFYP)}</span>
                            }
                          </TableCell>
                          {usePhase2 ? (
                            <>
                              <TableCell className="text-right bg-emerald-50/80 text-xs font-semibold text-emerald-600">{groupPhase.phase1Bonus > 0 ? formatCurrency(groupPhase.phase1Bonus) : <span className="text-gray-300">—</span>}</TableCell>
                              <TableCell className="text-right bg-emerald-50/80 text-xs font-semibold text-emerald-600">{groupPhase.phase2Bonus > 0 ? formatCurrency(groupPhase.phase2Bonus) : <span className="text-gray-300">—</span>}</TableCell>
                              <TableCell className="text-right bg-amber-50/80 text-xs font-bold text-amber-700">{formatCurrency(groupPhase.phase1Bonus + groupPhase.phase2Bonus)}</TableCell>
                            </>
                          ) : (
                            <TableCell className="text-right bg-emerald-50/80 text-xs">{tier ? <span className="flex items-center justify-end gap-1"><BonusTypeIcon type={tier.bonusType} className="w-3.5 h-3.5 text-emerald-500" /><span className="font-bold text-emerald-700">{formatBonus(tier, group.totalFYP, group.activityRounds)}</span></span> : <span className="text-gray-300">—</span>}</TableCell>
                          )}
                          <TableCell>{!tier && remaining !== null ? <span className="text-[10px] italic text-gray-400">Cần thêm {isActivityRoundMode(conditionType) ? `${remaining} lượt` : formatNumber(remaining)}</span> : !tier ? <span className="text-[10px] italic text-gray-400">Chưa đạt</span> : null}</TableCell>
                        </TableRow>
                      );
                    }) : conditionType === 'per_contract' ? [...displayContracts].map((c) => {
                      const { tier } = calculateBonus(c.fyp);
                      const remaining = getRemainingToNextTier(c.fyp);
                      const phaseInfo = getRowPhaseBonus(c.fyp, c.effectiveDate);
                      return { contract: c, tier, remaining, phaseInfo };
                    }).sort((a, b) => {
                      const aTotal = a.phaseInfo.phase1Bonus + a.phaseInfo.phase2Bonus;
                      const bTotal = b.phaseInfo.phase1Bonus + b.phaseInfo.phase2Bonus;
                      return bTotal - aTotal;
                    }).map(({ contract, tier, remaining, phaseInfo }, idx) => {
                      if (hideNotAchieved && !tier) return null;
                      return (
                        <TableRow key={contract.id} className={`${tier ? 'bg-white' : 'bg-red-50/50'} hover:bg-emerald-50/50 border-b border-gray-100`}>
                          <TableCell className="text-center text-gray-500 text-xs">{idx + 1}</TableCell>
                          <TableCell className="text-xs text-gray-700">{contract.nhom || contract.maNhom}</TableCell>
                          <TableCell className="text-xs text-gray-700 font-mono">{contract.agentCode}</TableCell>
                          <TableCell className="text-xs text-gray-700">{contract.agentName}</TableCell>
                          <TableCell className="text-center text-xs text-gray-500">{formatDate(contract.effectiveDate)}</TableCell>
                          <TableCell className="text-right text-xs text-gray-700">{formatNumber(contract.fyp)}</TableCell>
                          {useSecondaryCondition && secondaryAFYPMin > 0 && (
                            <TableCell className="text-right text-xs text-gray-600">{formatNumber(contract.afyp)}</TableCell>
                          )}
                          {usePhase2 ? (
                            <>
                              <TableCell className="text-right bg-emerald-50/80 text-xs font-semibold text-emerald-600">{phaseInfo.phase1Bonus > 0 ? formatCurrency(phaseInfo.phase1Bonus) : <span className="text-gray-300">—</span>}</TableCell>
                              <TableCell className="text-right bg-emerald-50/80 text-xs font-semibold text-emerald-600">{phaseInfo.phase2Bonus > 0 ? formatCurrency(phaseInfo.phase2Bonus) : <span className="text-gray-300">—</span>}</TableCell>
                              <TableCell className="text-right bg-amber-50/80 text-xs font-bold text-amber-700">{formatCurrency(phaseInfo.phase1Bonus + phaseInfo.phase2Bonus)}</TableCell>
                            </>
                          ) : (
                            <TableCell className="text-right bg-emerald-50/80 text-xs">{tier ? <span className="flex items-center justify-end gap-1"><BonusTypeIcon type={tier.bonusType} className="w-3.5 h-3.5 text-emerald-500" /><span className="font-bold text-emerald-700">{formatBonus(tier, contract.fyp)}</span></span> : <span className="text-gray-300">—</span>}</TableCell>
                          )}
                          <TableCell>{!tier && remaining !== null ? <span className="text-[10px] italic text-gray-400">Cần thêm {formatNumber(remaining)}</span> : !tier ? <span className="text-[10px] italic text-gray-400">Chưa đạt</span> : null}</TableCell>
                        </TableRow>
                      );
                    }) : [...displayContracts].map((c) => {
                      const { tier } = calculateBonus(c.fyp);
                      const remaining = getRemainingToNextTier(c.fyp);
                      const phaseInfo = getRowPhaseBonus(c.fyp, c.effectiveDate);
                      return { contract: c, tier, remaining, phaseInfo };
                    }).sort((a, b) => {
                      const aTotal = a.phaseInfo.phase1Bonus + a.phaseInfo.phase2Bonus;
                      const bTotal = b.phaseInfo.phase1Bonus + b.phaseInfo.phase2Bonus;
                      return bTotal - aTotal;
                    }).map(({ contract, tier, remaining, phaseInfo }, idx) => {
                      if (hideNotAchieved && !tier) return null;
                      return (
                        <TableRow key={contract.id} className={`${tier ? 'bg-white' : 'bg-red-50/50'} hover:bg-emerald-50/50 border-b border-gray-100`}>
                          <TableCell className="text-center text-gray-500 text-xs">{idx + 1}</TableCell>
                          <TableCell className="text-xs text-gray-700">{contract.nhom || contract.maNhom}</TableCell>
                          <TableCell className="text-xs text-gray-700 font-mono">{contract.agentCode}</TableCell>
                          <TableCell className="text-xs text-gray-700">{contract.agentName}</TableCell>
                          <TableCell className="text-right text-xs text-gray-700">{formatNumber(contract.fyp)}</TableCell>
                          {usePhase2 ? (
                            <>
                              <TableCell className="text-right bg-emerald-50/80 text-xs font-semibold text-emerald-600">{phaseInfo.phase1Bonus > 0 ? formatCurrency(phaseInfo.phase1Bonus) : <span className="text-gray-300">—</span>}</TableCell>
                              <TableCell className="text-right bg-emerald-50/80 text-xs font-semibold text-emerald-600">{phaseInfo.phase2Bonus > 0 ? formatCurrency(phaseInfo.phase2Bonus) : <span className="text-gray-300">—</span>}</TableCell>
                              <TableCell className="text-right bg-amber-50/80 text-xs font-bold text-amber-700">{formatCurrency(phaseInfo.phase1Bonus + phaseInfo.phase2Bonus)}</TableCell>
                            </>
                          ) : (
                            <TableCell className="text-right bg-emerald-50/80 text-xs">{tier ? <span className="flex items-center justify-end gap-1"><BonusTypeIcon type={tier.bonusType} className="w-3.5 h-3.5 text-emerald-500" /><span className="font-bold text-emerald-700">{formatBonus(tier, contract.fyp)}</span></span> : <span className="text-gray-300">—</span>}</TableCell>
                          )}
                          <TableCell>{!tier && remaining !== null ? <span className="text-[10px] italic text-gray-400">Cần thêm {formatNumber(remaining)}</span> : !tier ? <span className="text-[10px] italic text-gray-400">Chưa đạt</span> : null}</TableCell>
                        </TableRow>
                      );
                    })}
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
          <DialogHeader><DialogTitle className="text-white flex items-center gap-2"><Users className="w-4 h-4 text-sky-400" /> Nhập đối tượng thi đua</DialogTitle><DialogDescription className="text-white/50">Khi có danh sách, kết quả chỉ tính cho các đối tượng này</DialogDescription></DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-1">
              <Label className="text-xs text-white/60">
                {targetType === 'tvv' ? 'Mã TVV hoặc tên TVV' : targetType === 'nyd' ? 'Mã NYD' : 'Mã nhóm'}, mỗi đối tượng 1 dòng
              </Label>
              <textarea
                value={thiDuaSubjects}
                onChange={(e) => setThiDuaSubjects(e.target.value)}
                placeholder={targetType === 'tvv' ? 'D104142435\nD104142436\n...' : targetType === 'nyd' ? 'D104142435\nD104142436\n...' : 'MC001\nMC002\n...'}
                className="w-full h-32 text-xs bg-white/5 border border-emerald-500/20 text-white rounded-lg p-2 font-mono resize-none focus:outline-none focus:border-sky-500/50"
              />
            </div>
            {thiDuaSubjects.trim() && (
              <div className="rounded-lg bg-sky-500/10 border border-sky-500/20 p-2 text-xs text-sky-300">
                <p className="font-medium">Đã nhập {subjectCodes.length} đối tượng</p>
              </div>
            )}
            {contracts.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-white/40">Đối tượng có sẵn ({targetType === 'tvv' ? 'TVV' : targetType === 'nyd' ? 'NYD' : 'Nhóm'}):</Label>
                <div className="max-h-24 overflow-y-auto rounded-lg border border-emerald-500/20 p-1.5">
                  <div className="flex flex-wrap gap-1">
                    {targetType === 'tvv'
                      ? [...new Set(contracts.map(c => c.agentCode))].map(code => (
                          <button key={code} onClick={() => setThiDuaSubjects(prev => prev ? prev + '\n' + code : code)} className="px-1.5 py-0.5 text-[9px] bg-white/5 hover:bg-sky-500/10 border border-emerald-500/20 text-white/60 hover:text-sky-400 rounded cursor-pointer transition-colors">{code}</button>
                        ))
                      : targetType === 'nyd'
                        ? [...new Set(contracts.filter(c => c.position && ['trưởng ban', 'trưởng nhóm', 'tiền trưởng nhóm'].some(p => c.position.toLowerCase().includes(p))).map(c => c.agentCode))].map(code => (
                            <button key={code} onClick={() => setThiDuaSubjects(prev => prev ? prev + '\n' + code : code)} className="px-1.5 py-0.5 text-[9px] bg-white/5 hover:bg-sky-500/10 border border-emerald-500/20 text-white/60 hover:text-sky-400 rounded cursor-pointer transition-colors">{code}</button>
                          ))
                        : [...new Set(contracts.map(c => c.maNhom))].map(nhom => (
                            <button key={nhom} onClick={() => setThiDuaSubjects(prev => prev ? prev + '\n' + nhom : nhom)} className="px-1.5 py-0.5 text-[9px] bg-white/5 hover:bg-sky-500/10 border border-emerald-500/20 text-white/60 hover:text-sky-400 rounded cursor-pointer transition-colors">{nhom}</button>
                          ))
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setThiDuaSubjects(''); }} className="h-8 border-red-500/30 text-red-400 bg-transparent hover:bg-red-500/10"><Trash2 className="w-3 h-3 mr-1" /> Xóa tất cả</Button>
            <Button variant="outline" onClick={() => setIsSubjectDialogOpen(false)} className="h-8 border-emerald-500/20 bg-transparent text-white/70">Đóng</Button>
            <Button onClick={() => { setIsSubjectDialogOpen(false); toast({ title: 'Đã áp dụng', description: subjectCodes.length > 0 ? `Lọc theo ${subjectCodes.length} đối tượng` : 'Hiển thị tất cả' }); }} className="bg-sky-600 hover:bg-sky-700 h-8">Áp dụng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
