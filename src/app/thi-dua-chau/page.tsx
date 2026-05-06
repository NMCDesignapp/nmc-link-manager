'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  Camera, UserPlus, EyeOff, Filter, Layers, Settings2,
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
  bonusType: 'money' | 'gift' | 'percent' | 'money_per_round'; bonusText: string; bonusPercent: number;
}

interface GroupData {
  maNhom: string; leaderName: string; leaderCode: string; totalFYP: number;
  contractCount: number; activityRounds: number; contracts: Contract[];
}

interface NYDData {
  nydCode: string;
  nydName: string;
  recruitCount: number;
  recruitFYP: number;
  ownFYP: number;
  contracts: Contract[];
}

interface SavedContest {
  id: string; title: string; startDate: string; endDate: string;
  issueDate: string | null; conditionType: string; targetType: string;
  bonusTiers: string; posterUrl?: string; participants?: string;
  usePhase2?: boolean; phase2StartDate?: string | null; phase2EndDate?: string | null; bonusTiers2?: string;
  useSecondaryCondition?: boolean; secondaryAFYPMin?: number; secondaryIPMin?: number;
  hideNotAchieved?: boolean; useTVVmFilter?: boolean; includeOwnNYD?: boolean;
  createdAt: string; updatedAt: string;
}

type ConditionType = 'per_contract' | 'total_fyp' | 'activity_round' | 'activity_round_standard' | 'nyd_activity' | 'nyd_fyp';
type TargetType = 'tvv' | 'nhom' | 'nyd';

function isActivityRoundMode(ct: ConditionType): boolean {
  return ct === 'activity_round' || ct === 'activity_round_standard';
}
function isNYDMode(ct: ConditionType): boolean {
  return ct === 'nyd_activity' || ct === 'nyd_fyp';
}

function isTVVm(startDate: string | null): boolean {
  if (!startDate) return false;
  const start = new Date(startDate);
  const now = new Date();
  const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return diffMonths <= 12;
}

const DEFAULT_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vStQqbaHb_1aP-hMzZCiVoeaSobXV5gwqw6iZBoQ0MgpsXiobO1GdCM5zoCoCxVBtxT_Nujjll_MJmC/pub?output=csv';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}
function formatNumber(amount: number): string { return new Intl.NumberFormat('vi-VN').format(amount); }
function formatDate(dateStr: string): string { return new Date(dateStr).toLocaleDateString('vi-VN'); }
function trieuToVnd(val: number): number { return val * 1_000_000; }
function vndToTrieu(val: number): number { return val / 1_000_000; }

function formatBonus(tier: BonusTier, fyp?: number, rounds?: number): string {
  if (tier.bonusType === 'gift' && tier.bonusText) return tier.bonusText;
  if (tier.bonusType === 'percent' && tier.bonusPercent > 0) {
    const calculated = fyp ? tier.bonusPercent / 100 * fyp : 0;
    return `${tier.bonusPercent}% IP${fyp ? ` = ${formatCurrency(calculated)}` : ''}`;
  }
  if (tier.bonusType === 'money_per_round') {
    const calculated = rounds ? tier.bonusAmount * rounds : 0;
    return rounds ? `${formatCurrency(tier.bonusAmount)}/lượt × ${rounds} = ${formatCurrency(calculated)}` : `${formatCurrency(tier.bonusAmount)}/lượt`;
  }
  return formatCurrency(tier.bonusAmount);
}

function BonusTypeIcon({ type, className }: { type: string; className?: string }) {
  if (type === 'gift') return <Gift className={className} />;
  if (type === 'percent') return <Percent className={className} />;
  if (type === 'money_per_round') return <Layers className={className} />;
  return <Sparkles className={className} />;
}

function getConditionLabel(ct: ConditionType): string {
  switch (ct) {
    case 'per_contract': return 'Theo HĐ';
    case 'total_fyp': return 'Tổng IP';
    case 'activity_round': return 'Lượt HĐ';
    case 'activity_round_standard': return 'Lượt HĐ Chuẩn';
    case 'nyd_activity': return 'Lượt TVVm HĐ';
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

// ContestPoster Component - supports white & gradient variants
function ContestPoster({ contestTitle, startDate, endDate, conditionType, targetType, sortedTiers, filteredContracts, groupedData, totalFYP, totalBonus, achievedCount, notAchievedCount, formatCurrency: fc, formatNumber: fn, formatDate: fd, isPreview = false, variant = 'gradient' }: {
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
  const tierColors = ['from-amber-400 to-orange-500','from-emerald-400 to-teal-500','from-sky-400 to-cyan-500','from-violet-400 to-purple-500','from-rose-400 to-pink-500','from-lime-400 to-green-500'];
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
              <div key={tier.id} className={`flex-shrink-0 rounded-lg px-2.5 py-1.5 bg-gradient-to-br ${tierColors[i % tierColors.length]} text-white min-w-[100px] shadow-md`}>
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
            <div key={tier.id} className={`flex-shrink-0 rounded-lg px-2.5 py-1.5 bg-gradient-to-br ${tierColors[i % tierColors.length]} text-white min-w-[100px] shadow-md`}>
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
}

// Bonus tier editor component
function BonusTierEditor({ tiers, conditionType, onUpdate, onAdd, onRemove, title: sectionTitle, accentColor = 'amber' }: {
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
              <div className="flex items-center gap-0.5 ml-auto">
                {([['money', 'Tiền', Banknote, 'bg-emerald-600'], ['gift', 'Quà', Gift, 'bg-pink-600'], ['percent', '% IP', Percent, 'bg-violet-600'], ['money_per_round', '/Lượt', Layers, 'bg-teal-600']] as const).map(([type, label, Icon, activeCls]) => (
                  <Button key={type} variant={tier.bonusType === type ? 'default' : 'outline'} size="sm" className={`h-5 px-1.5 text-[9px] ${tier.bonusType === type ? activeCls + ' hover:opacity-90' : 'border-white/10 text-white/50 bg-transparent'}`} onClick={() => onUpdate(tier.id, 'bonusType', type)}><Icon className="w-2.5 h-2.5 mr-0.5" />{label}</Button>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={() => onRemove(tier.id)} className="h-5 w-5 p-0 text-red-400 hover:text-red-600"><Trash2 className="w-2.5 h-2.5" /></Button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {isAR ? (
                <>
                  <div><Label className="text-[9px] text-white/40">Lượt từ</Label><Input type="number" placeholder="0" value={tier.minFYP || ''} onChange={(e) => onUpdate(tier.id, 'minFYP', parseInt(e.target.value) || 0)} className="h-7 text-xs border-emerald-500/20 bg-white/5 text-white" /></div>
                  <div><Label className="text-[9px] text-white/40">Lượt đến</Label><Input type="number" placeholder="∞" value={tier.maxFYP || ''} onChange={(e) => onUpdate(tier.id, 'maxFYP', e.target.value ? parseInt(e.target.value) : null)} className="h-7 text-xs border-emerald-500/20 bg-white/5 text-white" /></div>
                </>
              ) : (
                <>
                  <div><Label className="text-[9px] text-white/40">IP từ (tr)</Label><Input type="number" placeholder="0" value={vndToTrieu(tier.minFYP) || ''} onChange={(e) => onUpdate(tier.id, 'minFYP', trieuToVnd(parseFloat(e.target.value) || 0))} className="h-7 text-xs border-emerald-500/20 bg-white/5 text-white" /></div>
                  <div><Label className="text-[9px] text-white/40">IP đến (tr)</Label><Input type="number" placeholder="∞" value={tier.maxFYP ? vndToTrieu(tier.maxFYP) : ''} onChange={(e) => onUpdate(tier.id, 'maxFYP', e.target.value ? trieuToVnd(parseFloat(e.target.value)) : null)} className="h-7 text-xs border-emerald-500/20 bg-white/5 text-white" /></div>
                </>
              )}
              <div>
                <Label className="text-[9px] text-white/40">
                  {tier.bonusType === 'money' ? 'Thưởng (tr)' : tier.bonusType === 'money_per_round' ? '/Lượt (tr)' : tier.bonusType === 'percent' ? '% IP' : 'Quà tặng'}
                </Label>
                {tier.bonusType === 'money' || tier.bonusType === 'money_per_round'
                  ? <Input type="number" placeholder="0" value={vndToTrieu(tier.bonusAmount) || ''} onChange={(e) => onUpdate(tier.id, 'bonusAmount', trieuToVnd(parseFloat(e.target.value) || 0))} className="h-7 text-xs border-emerald-500/20 bg-white/5 text-white" />
                  : tier.bonusType === 'percent'
                    ? <Input type="number" placeholder="7" value={tier.bonusPercent || ''} onChange={(e) => onUpdate(tier.id, 'bonusPercent', parseFloat(e.target.value) || 0)} className="h-7 text-xs border-emerald-500/20 bg-white/5 text-white" />
                    : <Input type="text" placeholder="VD: iPhone 15" value={tier.bonusText} onChange={(e) => onUpdate(tier.id, 'bonusText', e.target.value)} className="h-7 text-xs border-emerald-500/20 bg-white/5 text-white" />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ThiDuaPage() {
  const router = useRouter();

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
  const [hideNotAchieved, setHideNotAchieved] = useState(false);
  const [includeOwnNYD, setIncludeOwnNYD] = useState(false);

  const [posterUrl, setPosterUrl] = useState<string>('');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [csvUrl, setCsvUrl] = useState(DEFAULT_CSV_URL);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [savedContests, setSavedContests] = useState<SavedContest[]>([]);
  const [selectedContestId, setSelectedContestId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSourceData, setShowSourceData] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [thiDuaSubjects, setThiDuaSubjects] = useState<string>('');
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
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
    return tier.bonusType === 'percent' ? tier.bonusPercent / 100 * fyp : tier.bonusAmount;
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
    if (tier.bonusType === 'percent' && groupTotalFYP) return tier.bonusPercent / 100 * groupTotalFYP;
    if (tier.bonusType === 'money_per_round') return tier.bonusAmount * activityRounds;
    return tier.bonusAmount;
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
      if (targetType === 'nyd') return true; // NYD filter is handled separately
      return subjectCodes.includes(c.maNhom);
    });
  }, [filteredContracts, subjectCodes, targetType]);

  // NYD data computation
  const nydData: NYDData[] = useMemo(() => {
    if (!isNYDMode(conditionType)) return [];
    // Find all NYD contracts (positions containing trưởng ban, trưởng nhóm, tiền trưởng nhóm)
    const nydPositions = ['trưởng ban', 'trưởng nhóm', 'tiền trưởng nhóm'];
    const nydContracts = displayContracts.filter(c =>
      c.position && nydPositions.some(p => c.position.toLowerCase().includes(p))
    );
    // Group by agentCode
    const nydMap = new Map<string, NYDData>();
    for (const c of nydContracts) {
      if (!nydMap.has(c.agentCode)) {
        nydMap.set(c.agentCode, { nydCode: c.agentCode, nydName: c.agentName, recruitCount: 0, recruitFYP: 0, ownFYP: 0, contracts: [] });
      }
      const nyd = nydMap.get(c.agentCode)!;
      nyd.ownFYP += c.fyp;
      nyd.contracts.push(c);
    }
    // For each NYD, find TVVm they recruited (recruiterCode = nydCode)
    for (const [nydCode, nyd] of nydMap) {
      const recruitedContracts = displayContracts.filter(c => c.recruiterCode === nydCode && c.agentCode !== nydCode);
      // nyd_activity: count TVVm with fyp >= 3,000,000
      // Group by agentCode, sum their FYP
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
    return Array.from(nydMap.values());
  }, [displayContracts, conditionType]);

  // Grouped data from display contracts
  const groupedData: GroupData[] = useMemo(() => {
    if (targetType !== 'nhom') return [];
    const map = new Map<string, GroupData>();
    for (const c of displayContracts) {
      const key = c.maNhom;
      if (!map.has(key)) map.set(key, { maNhom: key, leaderName: '', leaderCode: '', totalFYP: 0, contractCount: 0, activityRounds: 0, contracts: [] });
      const g = map.get(key)!; g.totalFYP += c.fyp; g.contractCount += 1; g.contracts.push(c);
    }
    // Fix leader detection - Priority 1: leaderAgentCode, Priority 2: position-based
    for (const g of Array.from(map.values())) {
      // Step 1: Try leaderAgentCode
      const leaderContract = g.contracts.find(c => c.leaderAgentCode);
      if (leaderContract?.leaderAgentCode) {
        // Find leader name from ALL contracts (not just this group)
        const leaderFromAll = contracts.find(c => c.agentCode === leaderContract.leaderAgentCode);
        g.leaderCode = leaderContract.leaderAgentCode;
        g.leaderName = leaderFromAll?.agentName || leaderContract.leaderAgentCode;
      }
      // Step 2: Fallback to position-based
      if (!g.leaderName) {
        const leaderByPosition = g.contracts.find(c => c.position && (c.position.toLowerCase().includes('trưởng nhóm') || c.position.toLowerCase().includes('trưởng ban')));
        if (leaderByPosition) {
          g.leaderName = leaderByPosition.agentName;
          g.leaderCode = leaderByPosition.agentCode;
        }
      }
    }
    if (isActivityRoundMode(conditionType)) {
      const luotThreshold = conditionType === 'activity_round_standard' ? 12_000_000 : 3_000_000;
      for (const g of Array.from(map.values())) {
        const agentTinhLuotMap = new Map<string, number>();
        for (const c of g.contracts) {
          const currentMax = agentTinhLuotMap.get(c.agentCode) || 0;
          agentTinhLuotMap.set(c.agentCode, Math.max(currentMax, c.tinhLuot || 0));
        }
        let rounds = 0;
        for (const [agentCode, maxTinhLuot] of agentTinhLuotMap) {
          if (maxTinhLuot >= luotThreshold) {
            // If TVVm filter is on, only count TVVm
            if (useTVVmFilter) {
              const agentContracts = g.contracts.filter(c => c.agentCode === agentCode);
              if (agentContracts.some(ac => isTVVm(ac.startDate))) rounds++;
            } else {
              rounds++;
            }
          }
        }
        g.activityRounds = rounds;
      }
    }
    return Array.from(map.values());
  }, [displayContracts, targetType, conditionType, contracts, useTVVmFilter]);

  // Phase 2: Split contracts and compute bonus
  const phase2Results = useMemo(() => {
    if (!usePhase2 || !phase2StartDate) return null;
    const p2Start = new Date(phase2StartDate);
    const phase1Contracts = displayContracts.filter(c => new Date(c.effectiveDate) < p2Start);
    const phase2Contracts = displayContracts.filter(c => new Date(c.effectiveDate) >= p2Start);

    // Calculate Phase 1 bonus
    let phase1Bonus = 0;
    if (targetType === 'nhom') {
      if (isActivityRoundMode(conditionType)) {
        // For simplicity, use phase 1 contracts grouped
        const phase1Grouped = new Map<string, GroupData>();
        for (const c of phase1Contracts) {
          const key = c.maNhom;
          if (!phase1Grouped.has(key)) phase1Grouped.set(key, { maNhom: key, leaderName: '', leaderCode: '', totalFYP: 0, contractCount: 0, activityRounds: 0, contracts: [] });
          const g = phase1Grouped.get(key)!; g.totalFYP += c.fyp; g.contractCount += 1; g.contracts.push(c);
        }
        const luotThreshold = conditionType === 'activity_round_standard' ? 12_000_000 : 3_000_000;
        for (const g of phase1Grouped.values()) {
          const agentMap = new Map<string, number>();
          for (const c of g.contracts) { agentMap.set(c.agentCode, Math.max(agentMap.get(c.agentCode) || 0, c.tinhLuot || 0)); }
          let rounds = 0;
          for (const [, maxT] of agentMap) { if (maxT >= luotThreshold) rounds++; }
          const { tier } = calculateActivityRoundBonusWithTiers(rounds, bonusTiers);
          if (tier) phase1Bonus += tier.bonusType === 'percent' ? tier.bonusPercent / 100 * g.totalFYP : tier.bonusType === 'money_per_round' ? tier.bonusAmount * rounds : tier.bonusAmount;
        }
      } else {
        const grouped = new Map<string, number>();
        for (const c of phase1Contracts) { grouped.set(c.maNhom, (grouped.get(c.maNhom) || 0) + c.fyp); }
        for (const [, total] of grouped) { phase1Bonus += getBonusAmountWithTiers(total, bonusTiers); }
      }
    } else if (isNYDMode(conditionType)) {
      // NYD Phase 1 - simplified: use phase 1 nyd data
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
        for (const [, af] of data.agentFYPMap) { if (af >= 3_000_000) recruitCount++; recruitFYP += af; }
        const value = conditionType === 'nyd_activity' ? recruitCount : (recruitFYP + (includeOwnNYD ? data.ownFYP : 0));
        const { tier } = calculateBonusWithTiers(value, bonusTiers);
        if (tier) phase1Bonus += tier.bonusType === 'percent' ? tier.bonusPercent / 100 * value : tier.bonusType === 'money_per_round' ? tier.bonusAmount * recruitCount : tier.bonusAmount;
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
          if (!phase2Grouped.has(key)) phase2Grouped.set(key, { maNhom: key, leaderName: '', leaderCode: '', totalFYP: 0, contractCount: 0, activityRounds: 0, contracts: [] });
          const g = phase2Grouped.get(key)!; g.totalFYP += c.fyp; g.contractCount += 1; g.contracts.push(c);
        }
        const luotThreshold = conditionType === 'activity_round_standard' ? 12_000_000 : 3_000_000;
        for (const g of phase2Grouped.values()) {
          const agentMap = new Map<string, number>();
          for (const c of g.contracts) { agentMap.set(c.agentCode, Math.max(agentMap.get(c.agentCode) || 0, c.tinhLuot || 0)); }
          let rounds = 0;
          for (const [, maxT] of agentMap) { if (maxT >= luotThreshold) rounds++; }
          const { tier } = calculateActivityRoundBonusWithTiers(rounds, bonusTiers2);
          if (tier) phase2Bonus += tier.bonusType === 'percent' ? tier.bonusPercent / 100 * g.totalFYP : tier.bonusType === 'money_per_round' ? tier.bonusAmount * rounds : tier.bonusAmount;
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
        for (const [, af] of data.agentFYPMap) { if (af >= 3_000_000) recruitCount++; recruitFYP += af; }
        const value = conditionType === 'nyd_activity' ? recruitCount : (recruitFYP + (includeOwnNYD ? data.ownFYP : 0));
        const { tier } = calculateBonusWithTiers(value, bonusTiers2);
        if (tier) phase2Bonus += tier.bonusType === 'percent' ? tier.bonusPercent / 100 * value : tier.bonusType === 'money_per_round' ? tier.bonusAmount * recruitCount : tier.bonusAmount;
      }
    } else {
      for (const c of phase2Contracts) { phase2Bonus += getBonusAmountWithTiers(c.fyp, bonusTiers2); }
    }

    return { phase1Bonus, phase2Bonus, totalBonus: phase1Bonus + phase2Bonus, phase1Count: phase1Contracts.length, phase2Count: phase2Contracts.length };
  }, [usePhase2, phase2StartDate, displayContracts, targetType, conditionType, bonusTiers, bonusTiers2, includeOwnNYD, calculateBonusWithTiers, calculateActivityRoundBonusWithTiers, getBonusAmountWithTiers]);

  const getTotalFYPBonus = useCallback((): { totalFYP: number; bonus: number; tier: BonusTier | null; remaining: number | null } => {
    const totalFYP = displayContracts.reduce((sum, c) => sum + c.fyp, 0);
    const { tier } = calculateBonus(totalFYP); const remaining = getRemainingToNextTier(totalFYP);
    const bonus = tier ? (tier.bonusType === 'percent' ? tier.bonusPercent / 100 * totalFYP : tier.bonusAmount) : 0;
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
        hideNotAchieved, useTVVmFilter, includeOwnNYD,
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
      const fetchRes = await fetch(`/api/import-csv?url=${encodeURIComponent(csvUrl)}`); if (!fetchRes.ok) { const errData = await fetchRes.json(); throw new Error(errData.error || 'Không thể tải CSV'); }
      const { csvData } = await fetchRes.json();
      const importRes = await fetch('/api/seed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csvData }) });
      if (!importRes.ok) { const errData = await importRes.json(); throw new Error(errData.error || 'Không thể nhập'); }
      const data = await importRes.json(); toast({ title: 'Thành công', description: data.message }); setIsImportDialogOpen(false); fetchContracts();
    } catch (err: unknown) { const msg = err instanceof Error ? err.message : 'Lỗi không xác định'; toast({ title: 'Lỗi nhập', description: msg, variant: 'destructive' }); }
    finally { setIsImporting(false); }
  };

  const handlePrint = () => {
    if (!printRef.current) return; const printWindow = window.open('', '_blank'); if (!printWindow) return;
    const styles = `<style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',Arial,sans-serif;padding:20px;background:white;color:#1a1a1a}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#064e3b;color:white;padding:8px 6px;text-align:center;font-weight:700;font-size:11px}td{padding:6px;border-bottom:1px solid #e5e7eb;font-size:12px;white-space:nowrap}tr:nth-child(even){background:#f9fafb}.bonus-col{background:#fffbeb;font-weight:700;color:#b45309}</style>`;
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
        const value = conditionType === 'nyd_activity' ? n.recruitCount : (n.recruitFYP + (includeOwnNYD ? n.ownFYP : 0));
        const { tier } = calculateBonus(value);
        return { nyd: n, tier, value };
      }).sort((a, b) => (b.tier?.bonusAmount || 0) - (a.tier?.bonusAmount || 0)).forEach(({ nyd: n, tier, value }, idx) => {
        const displayVal = conditionType === 'nyd_activity' ? `${n.recruitCount} TVVm HĐ` : formatNumber(value);
        text += `${idx + 1}. ${n.nydCode} | ${n.nydName} | ${displayVal} | ${tier ? `Thưởng: ${formatBonus(tier, value, n.recruitCount)}` : 'Chưa đạt'}\n`;
      });
    } else if (targetType === 'nhom' && isActivityRoundMode(conditionType)) {
      [...groupedData].map((g) => ({ group: g, tier: calculateActivityRoundBonus(g.activityRounds).tier })).sort((a, b) => (b.tier?.bonusAmount || 0) - (a.tier?.bonusAmount || 0)).forEach(({ group: g, tier }, idx) => { text += `${idx + 1}. ${g.maNhom} | ${g.leaderName || g.maNhom} | ${g.activityRounds} lượt | ${tier ? `Thưởng: ${formatBonus(tier, g.totalFYP, g.activityRounds)}` : 'Chưa đạt'}\n`; });
    } else if (targetType === 'nhom') {
      [...groupedData].map((g) => ({ group: g, tier: calculateBonus(g.totalFYP).tier })).sort((a, b) => (b.tier?.bonusAmount || 0) - (a.tier?.bonusAmount || 0)).forEach(({ group: g, tier }, idx) => { text += `${idx + 1}. ${g.maNhom} | ${g.leaderName || g.maNhom} | IP: ${formatNumber(g.totalFYP)} | ${tier ? `Thưởng: ${formatBonus(tier, g.totalFYP)}` : 'Chưa đạt'}\n`; });
    } else {
      [...displayContracts].map((c) => ({ contract: c, tier: conditionType === 'per_contract' ? calculateBonus(c.fyp).tier : null })).sort((a, b) => (b.tier?.bonusAmount || 0) - (a.tier?.bonusAmount || 0)).forEach(({ contract: c, tier }, idx) => { text += `${idx + 1}. ${c.maNhom} | ${c.agentName} | IP: ${formatNumber(c.fyp)} | ${tier ? `Thưởng: ${formatBonus(tier, c.fyp)}` : 'Chưa đạt'}\n`; });
    }
    navigator.clipboard.writeText(text).then(() => toast({ title: 'Đã sao chép!', description: 'Dán vào Zalo/Telegram' })).catch(() => toast({ title: 'Lỗi', description: 'Không thể sao chép', variant: 'destructive' }));
  };

  const handleExport = () => {
    if (displayContracts.length === 0 && nydData.length === 0) { toast({ title: 'Thông báo', description: 'Không có dữ liệu' }); return; }
    let headers: string[];
    let rows: (string | number)[][];

    if (isNYDMode(conditionType)) {
      headers = ['STT', 'Mã NYD', 'Tên NYD', conditionType === 'nyd_activity' ? 'Lượt TVVm HĐ' : 'FYP TVVm', 'Thưởng', 'Ghi chú'];
      rows = nydData.map(n => {
        const value = conditionType === 'nyd_activity' ? n.recruitCount : (n.recruitFYP + (includeOwnNYD ? n.ownFYP : 0));
        const { tier } = calculateBonus(value);
        return [n.nydCode, n.nydName, conditionType === 'nyd_activity' ? n.recruitCount : value, tier ? formatBonus(tier, value, n.recruitCount) : '', tier ? '' : 'Chưa đạt mức'];
      }).map((r, idx) => [idx + 1, ...r]);
    } else {
      headers = ['STT', 'Nhóm', targetType === 'nhom' ? 'Trưởng nhóm' : 'Mã số', targetType === 'nhom' ? 'Số HĐ' : 'Họ tên', isActivityRoundMode(conditionType) && targetType === 'nhom' ? 'Lượt HĐ' : 'IP / Tổng', 'Thưởng', 'Ghi chú'];
      rows = (targetType === 'nhom' ? [...groupedData].map((g) => { const { tier } = isActivityRoundMode(conditionType) ? calculateActivityRoundBonus(g.activityRounds) : calculateBonus(g.totalFYP); return { g, tier }; }).sort((a, b) => (b.tier?.bonusAmount || 0) - (a.tier?.bonusAmount || 0)).map(({ g, tier }, idx) => [idx + 1, g.maNhom, g.leaderName || g.maNhom, isActivityRoundMode(conditionType) ? `${g.activityRounds} lượt` : g.contractCount, g.totalFYP, tier ? formatBonus(tier, g.totalFYP, g.activityRounds) : '', tier ? '' : 'Chưa đạt mức']) : [...displayContracts].map((c) => { const { tier } = calculateBonus(c.fyp); return { c, tier }; }).sort((a, b) => (b.tier?.bonusAmount || 0) - (a.tier?.bonusAmount || 0)).map(({ c, tier }, idx) => [idx + 1, c.maNhom, c.agentCode, c.agentName, c.fyp, tier ? formatBonus(tier, c.fyp) : '', tier ? '' : 'Chưa đạt mức']));
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

  // Computed values
  const totalFYP = displayContracts.reduce((sum, c) => sum + c.fyp, 0);
  const tvvAchievedCount = displayContracts.filter((c) => calculateBonus(c.fyp).tier !== null).length;
  const tvvTotalBonus = displayContracts.reduce((sum, c) => sum + getBonusAmount(c.fyp), 0);
  const nhomAchievedCount = groupedData.filter((g) => calculateBonus(g.totalFYP).tier !== null).length;
  const nhomTotalFYP = groupedData.reduce((s, g) => s + g.totalFYP, 0);
  const nhomTotalBonus = groupedData.reduce((s, g) => s + getBonusAmount(g.totalFYP), 0);
  const arAchievedCount = isActivityRoundMode(conditionType) ? groupedData.filter((g) => calculateActivityRoundBonus(g.activityRounds).tier !== null).length : 0;
  const arNotAchievedCount = isActivityRoundMode(conditionType) ? groupedData.length - arAchievedCount : 0;
  const arTotalBonus = isActivityRoundMode(conditionType) ? groupedData.reduce((s, g) => s + getActivityRoundBonusAmount(g.activityRounds, g.totalFYP), 0) : 0;

  // NYD computed
  const nydAchievedCount = isNYDMode(conditionType) ? nydData.filter(n => {
    const value = conditionType === 'nyd_activity' ? n.recruitCount : (n.recruitFYP + (includeOwnNYD ? n.ownFYP : 0));
    return calculateBonus(value).tier !== null;
  }).length : 0;
  const nydNotAchievedCount = isNYDMode(conditionType) ? nydData.length - nydAchievedCount : 0;
  const nydTotalBonus = isNYDMode(conditionType) ? nydData.reduce((s, n) => {
    const value = conditionType === 'nyd_activity' ? n.recruitCount : (n.recruitFYP + (includeOwnNYD ? n.ownFYP : 0));
    const { tier } = calculateBonus(value);
    if (!tier) return s;
    if (tier.bonusType === 'percent') return s + tier.bonusPercent / 100 * value;
    if (tier.bonusType === 'money_per_round') return s + tier.bonusAmount * n.recruitCount;
    return s + tier.bonusAmount;
  }, 0) : 0;

  const achievedCount = isNYDMode(conditionType) ? nydAchievedCount : isActivityRoundMode(conditionType) ? arAchievedCount : targetType === 'nhom' ? nhomAchievedCount : tvvAchievedCount;
  const notAchievedCount = isNYDMode(conditionType) ? nydNotAchievedCount : isActivityRoundMode(conditionType) ? arNotAchievedCount : targetType === 'nhom' ? groupedData.length - nhomAchievedCount : displayContracts.length - tvvAchievedCount;

  // Total bonus with Phase2 support
  const baseTotalBonus = isNYDMode(conditionType) ? nydTotalBonus : isActivityRoundMode(conditionType) ? arTotalBonus : targetType === 'nhom' ? nhomTotalBonus : (conditionType === 'total_fyp' ? getTotalFYPBonus().bonus : tvvTotalBonus);
  const totalBonusDisplay = usePhase2 && phase2Results ? phase2Results.totalBonus : baseTotalBonus;
  const displayTotalFYP = targetType === 'nhom' ? nhomTotalFYP : totalFYP;
  const { totalFYP: totalFYPValue, tier: matchedTotalTier, remaining: totalRemaining } = getTotalFYPBonus();
  const sortedTiers = [...bonusTiers].sort((a, b) => a.minFYP - b.minFYP);

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

  // Build NYD result rows
  const nydResultRows = useMemo(() => {
    if (!isNYDMode(conditionType)) return [];
    return nydData.map(n => {
      const value = conditionType === 'nyd_activity' ? n.recruitCount : (n.recruitFYP + (includeOwnNYD ? n.ownFYP : 0));
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
        <div className="max-w-5xl mx-auto px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/')}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center"><Trophy className="w-4 h-4 text-white" /></div>
            <div><h1 className="text-base font-bold text-white">Tính Thưởng Thi Đua</h1><p className="text-[10px] text-white/40">Quản lý & tính thưởng IP</p></div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-8 text-xs bg-transparent" onClick={() => setIsImportDialogOpen(true)}>
              <Link className="w-3.5 h-3.5 mr-1" /> Nhập HD
            </Button>
            <Button variant="outline" size="sm" className="border-sky-500/30 text-sky-400 hover:bg-sky-500/10 h-8 text-xs bg-transparent" onClick={() => setIsSubjectDialogOpen(true)}>
              <Users className="w-3.5 h-3.5 mr-1" /> Đối tượng thi đua
              {subjectCodes.length > 0 && <Badge className="ml-1 bg-sky-500 text-white text-[9px] h-4 px-1">{subjectCodes.length}</Badge>}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 py-4 space-y-4 relative">
        {/* STEP 1: Info */}
        <Card className={`${neonBorder} bg-white/5 backdrop-blur-sm`}>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">1</div>
                <CardTitle className="text-sm text-emerald-400">Thông tin chương trình</CardTitle>
              </div>
              <div className="flex items-center gap-1.5">
                <Select value={selectedContestId} onValueChange={handleLoadContest}>
                  <SelectTrigger className="w-[180px] h-7 text-xs bg-white/5 border-emerald-500/20 text-white"><BookmarkPlus className="w-3 h-3 mr-1 text-emerald-400" /><SelectValue placeholder="Chương trình đã lưu..." /></SelectTrigger>
                  <SelectContent>{savedContests.length === 0 ? <SelectItem value="_none" disabled>Chưa có</SelectItem> : savedContests.map((sc) => (<SelectItem key={sc.id} value={sc.id}><div className="flex items-center gap-2"><span className="truncate">{sc.title}</span><Button variant="ghost" size="sm" className="h-4 w-4 p-0 text-red-400 hover:text-red-600" onClick={(e) => handleDeleteContest(sc.id, e)}><Trash2 className="w-2.5 h-2.5" /></Button></div></SelectItem>))}</SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={handleSaveContest} disabled={isSaving} className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-7 text-xs bg-transparent">{isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}Lưu</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-white/70">Tên chương trình thi đua</Label>
              <Input value={contestTitle} onChange={(e) => setContestTitle(e.target.value)} className="font-semibold border-emerald-500/20 bg-white/5 text-white h-9 text-sm" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1"><Label className="text-xs text-white/50">Hiệu lực từ</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-xs border-emerald-500/20 bg-white/5 text-white" /></div>
              <div className="space-y-1"><Label className="text-xs text-white/50">Hiệu lực đến</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 text-xs border-emerald-500/20 bg-white/5 text-white" /></div>
              <div className="space-y-1"><Label className="text-xs text-white/50">Ngày phát hành</Label><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="h-8 text-xs border-emerald-500/20 bg-white/5 text-white" /></div>
            </div>
          </CardContent>
        </Card>

        {/* STEP 2: Config - Collapsible */}
        <Card className={`${neonBorder} bg-white/5 backdrop-blur-sm`}>
          <CardHeader className="pb-2 pt-3 px-4">
            <button className="flex items-center justify-between w-full" onClick={() => setShowConfig(!showConfig)}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold">2</div>
                <CardTitle className="text-sm text-emerald-400">Cấu hình thi đua & Thưởng</CardTitle>
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
                  <RadioGroup value={targetType} onValueChange={(v) => setTargetType(v as TargetType)} className="space-y-1.5">
                    <div className={`flex items-center space-x-2 rounded-lg border border-emerald-500/20 p-2 cursor-pointer hover:bg-white/5 ${isActivityRoundMode(conditionType) ? 'opacity-50 pointer-events-none' : ''}`}>
                      <RadioGroupItem value="tvv" id="tvv" disabled={isActivityRoundMode(conditionType)} />
                      <Label htmlFor="tvv" className="cursor-pointer flex-1"><div className="text-xs font-medium flex items-center gap-1 text-white/80"><Users className="w-3.5 h-3.5 text-emerald-400" /> TVV (cá nhân)</div></Label>
                    </div>
                    <div className={`flex items-center space-x-2 rounded-lg border border-emerald-500/20 p-2 cursor-pointer hover:bg-white/5 ${isNYDMode(conditionType) ? 'opacity-50 pointer-events-none' : ''}`}>
                      <RadioGroupItem value="nhom" id="nhom" disabled={isNYDMode(conditionType)} />
                      <Label htmlFor="nhom" className="cursor-pointer flex-1"><div className="text-xs font-medium flex items-center gap-1 text-white/80"><UserCheck className="w-3.5 h-3.5 text-sky-400" /> Theo nhóm (MC NHÓM)</div></Label>
                    </div>
                    <div className={`flex items-center space-x-2 rounded-lg border border-emerald-500/20 p-2 cursor-pointer hover:bg-white/5 ${!isNYDMode(conditionType) ? 'opacity-50 pointer-events-none' : ''}`}>
                      <RadioGroupItem value="nyd" id="nyd" disabled={!isNYDMode(conditionType)} />
                      <Label htmlFor="nyd" className="cursor-pointer flex-1"><div className="text-xs font-medium flex items-center gap-1 text-white/80"><UserPlus className="w-3.5 h-3.5 text-violet-400" /> Người Tuyển Dụng (NYD)</div></Label>
                    </div>
                  </RadioGroup>
                </div>
                {/* Condition */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-white/70">Điều kiện</Label>
                  <RadioGroup value={conditionType} onValueChange={(v) => { setConditionType(v as ConditionType); if (isActivityRoundMode(v as ConditionType)) setTargetType('nhom'); if (isNYDMode(v as ConditionType)) setTargetType('nyd'); }} className="space-y-1.5">
                    <div className="flex items-center space-x-2 rounded-lg border border-emerald-500/20 p-2 cursor-pointer hover:bg-white/5"><RadioGroupItem value="per_contract" id="pc" /><Label htmlFor="pc" className="cursor-pointer flex-1"><div className="text-xs font-medium text-white/80">Theo HĐ (IP/HĐ)</div></Label></div>
                    <div className="flex items-center space-x-2 rounded-lg border border-emerald-500/20 p-2 cursor-pointer hover:bg-white/5"><RadioGroupItem value="total_fyp" id="tf" /><Label htmlFor="tf" className="cursor-pointer flex-1"><div className="text-xs font-medium text-white/80">Tổng IP</div></Label></div>
                    <div className="flex items-center space-x-2 rounded-lg border border-emerald-500/20 p-2 cursor-pointer hover:bg-white/5"><RadioGroupItem value="activity_round" id="ar" /><Label htmlFor="ar" className="cursor-pointer flex-1"><div className="text-xs font-medium text-white/80">Lượt HĐ (IP ≥ 3tr)</div></Label></div>
                    <div className="flex items-center space-x-2 rounded-lg border border-emerald-500/20 p-2 cursor-pointer hover:bg-white/5"><RadioGroupItem value="activity_round_standard" id="ars" /><Label htmlFor="ars" className="cursor-pointer flex-1"><div className="text-xs font-medium text-white/80">Lượt HĐ Chuẩn (IP ≥ 12tr)</div></Label></div>
                    <div className="flex items-center space-x-2 rounded-lg border border-violet-500/20 p-2 cursor-pointer hover:bg-violet-500/5"><RadioGroupItem value="nyd_activity" id="nya" /><Label htmlFor="nya" className="cursor-pointer flex-1"><div className="text-xs font-medium text-white/80 flex items-center gap-1"><UserPlus className="w-3 h-3 text-violet-400" /> NYD - Lượt TVVm HĐ</div></Label></div>
                    <div className="flex items-center space-x-2 rounded-lg border border-violet-500/20 p-2 cursor-pointer hover:bg-violet-500/5"><RadioGroupItem value="nyd_fyp" id="nyf" /><Label htmlFor="nyf" className="cursor-pointer flex-1"><div className="text-xs font-medium text-white/80 flex items-center gap-1"><UserPlus className="w-3 h-3 text-violet-400" /> NYD - FYP TVVm</div></Label></div>
                  </RadioGroup>
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
                    <div className="space-y-1"><Label className="text-[10px] text-orange-400/70">AFYP tối thiểu (tr)</Label><Input type="number" placeholder="0" value={secondaryAFYPMin ? vndToTrieu(secondaryAFYPMin) : ''} onChange={(e) => setSecondaryAFYPMin(trieuToVnd(parseFloat(e.target.value) || 0))} className="h-7 text-xs border-orange-500/20 bg-white/5 text-white" /></div>
                    <div className="space-y-1"><Label className="text-[10px] text-orange-400/70">IP tối thiểu (tr)</Label><Input type="number" placeholder="0" value={secondaryIPMin ? vndToTrieu(secondaryIPMin) : ''} onChange={(e) => setSecondaryIPMin(trieuToVnd(parseFloat(e.target.value) || 0))} className="h-7 text-xs border-orange-500/20 bg-white/5 text-white" /></div>
                  </div>
                )}
              </div>

              {/* Options */}
              <Separator className="bg-emerald-500/20" />
              <div className="space-y-2">
                <Label className="text-xs font-medium text-white/70">Tùy chọn</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* TVVm Filter - only visible in activity_round mode */}
                  {isActivityRoundMode(conditionType) && (
                    <div className="flex items-center gap-2 p-2 rounded-lg border border-emerald-500/10 bg-white/[0.02]">
                      <Checkbox id="useTVVmFilter" checked={useTVVmFilter} onCheckedChange={(v) => setUseTVVmFilter(!!v)} />
                      <Label htmlFor="useTVVmFilter" className="text-xs text-white/60 cursor-pointer flex items-center gap-1">
                        <Filter className="w-3 h-3 text-emerald-400" /> Chỉ tính TVVm (≤12 tháng)
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

        {/* Calculate Button - Centered */}
        <div className="flex items-center justify-center">
          <Button onClick={handleCalculate} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 h-11 px-8 text-sm font-bold shadow-lg shadow-emerald-600/20 border border-emerald-500/30">
            <Trophy className="w-4 h-4 mr-2" /> Tính kết quả thi đua
          </Button>
        </div>

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
                  <Table><TableHeader><TableRow className="bg-white/5 sticky top-0"><TableHead className="w-[35px] text-center text-xs text-emerald-400/60">STT</TableHead><TableHead className="text-xs text-emerald-400/60">Nhóm</TableHead><TableHead className="text-xs text-emerald-400/60">Mã</TableHead><TableHead className="text-xs text-emerald-400/60">Họ tên</TableHead><TableHead className="text-xs text-emerald-400/60">Ngày HL</TableHead><TableHead className="text-xs text-emerald-400/60">IP</TableHead><TableHead className="w-[30px]"></TableHead></TableRow></TableHeader>
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

      {/* Result Dialog Popup - White theme */}
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto bg-white border-emerald-200">
          <DialogHeader className="pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-emerald-700 text-lg font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-emerald-600" />
                Kết quả thi đua
              </DialogTitle>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={handleDownloadImage} disabled={isDownloadingImage} className="border-emerald-200 text-emerald-600 h-7 text-xs hover:bg-emerald-50">
                  {isDownloadingImage ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Camera className="w-3 h-3 mr-1" />}Tải ảnh
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopyText} className="border-emerald-200 text-emerald-600 h-7 text-xs hover:bg-emerald-50"><Copy className="w-3 h-3 mr-1" />Copy</Button>
                <Button variant="outline" size="sm" onClick={handlePrint} className="border-emerald-200 text-emerald-600 h-7 text-xs hover:bg-emerald-50"><Printer className="w-3 h-3 mr-1" />In</Button>
                <Button variant="outline" size="sm" onClick={handleExport} className="border-gray-200 text-gray-600 h-7 text-xs hover:bg-gray-50"><Download className="w-3 h-3 mr-1" />CSV</Button>
              </div>
            </div>
            {subjectCodes.length > 0 && (
              <div className="mt-1 flex items-center gap-1 text-xs text-sky-600">
                <Users className="w-3 h-3" />
                <span>Lọc theo {subjectCodes.length} đối tượng thi đua</span>
              </div>
            )}
          </DialogHeader>

          <div ref={resultContentRef} className="space-y-4">
            <div ref={printRef}>
              {/* White Poster */}
              <ContestPoster contestTitle={contestTitle} startDate={startDate} endDate={endDate} conditionType={conditionType} targetType={targetType} sortedTiers={sortedTiers} filteredContracts={displayContracts} groupedData={groupedData} totalFYP={displayTotalFYP} totalBonus={totalBonusDisplay} achievedCount={achievedCount} notAchievedCount={notAchievedCount} formatCurrency={formatCurrency} formatNumber={formatNumber} formatDate={formatDate} variant="white" />

              {posterUrl && <div className="flex justify-center mt-3"><img src={posterUrl} alt="Poster" className="max-h-56 rounded-xl shadow-md" /></div>}

              {/* Phase 2 info */}
              {usePhase2 && phase2Results && (
                <div className="mt-3 rounded-lg bg-gradient-to-r from-sky-50 to-cyan-50 border border-sky-200 p-3">
                  <div className="flex items-center gap-2"><Layers className="w-4 h-4 text-sky-500" /><div className="flex-1"><p className="text-xs font-bold text-sky-700">Chia 2 giai đoạn</p><p className="text-[10px] text-sky-500">GĐ1: {phase2Results.phase1Count} HĐ | GĐ2: {phase2Results.phase2Count} HĐ</p></div><div className="text-right"><p className="text-[10px] text-sky-500">GĐ1: {formatCurrency(phase2Results.phase1Bonus)}</p><p className="text-[10px] text-sky-500">GĐ2: {formatCurrency(phase2Results.phase2Bonus)}</p><p className="text-sm font-extrabold text-sky-700">Tổng: {formatCurrency(phase2Results.totalBonus)}</p></div></div>
                </div>
              )}

              {isActivityRoundMode(conditionType) && targetType === 'nhom' && groupedData.length > 0 && (
                <div className="mt-3 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 p-3">
                  <div className="flex items-center gap-2"><Users className="w-4 h-4 text-orange-500" /><div className="flex-1"><p className="text-xs font-bold text-orange-700">{conditionType === 'activity_round' ? 'Lượt HĐ' : 'Lượt HĐ Chuẩn'}: IP ≥ {conditionType === 'activity_round' ? '3' : '12'} triệu = 1 lượt</p></div><div className="text-right"><p className="text-[10px] text-orange-500">Tổng thưởng</p><p className="text-base font-extrabold text-orange-600">{formatCurrency(arTotalBonus)}</p></div></div>
                </div>
              )}
              {conditionType === 'total_fyp' && matchedTotalTier && (
                <div className="mt-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-3">
                  <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-amber-500" /><div className="flex-1"><p className="text-xs font-bold text-amber-700">Tổng IP: {formatCurrency(totalFYPValue)}</p></div><div className="text-right"><p className="text-base font-extrabold text-amber-600">{formatBonus(matchedTotalTier, totalFYPValue)}</p></div>{totalRemaining !== null && <div className="text-right border-l border-gray-200 pl-2"><p className="text-[10px] text-orange-500">Cần thêm</p><p className="text-sm font-bold text-orange-600">{formatCurrency(totalRemaining)}</p></div>}</div>
                </div>
              )}

              {/* NYD info */}
              {isNYDMode(conditionType) && nydData.length > 0 && (
                <div className="mt-3 rounded-lg bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 p-3">
                  <div className="flex items-center gap-2"><UserPlus className="w-4 h-4 text-violet-500" /><div className="flex-1"><p className="text-xs font-bold text-violet-700">{conditionType === 'nyd_activity' ? 'Lượt TVVm HĐ' : 'FYP TVVm'} (NYD)</p><p className="text-[10px] text-violet-500">{conditionType === 'nyd_activity' ? 'TVVm có IP ≥ 3tr = 1 lượt' : `Tổng FYP TVVm${includeOwnNYD ? ' + IP NYD' : ''}`}</p></div><div className="text-right"><p className="text-[10px] text-violet-500">Tổng thưởng</p><p className="text-base font-extrabold text-violet-600">{formatCurrency(nydTotalBonus)}</p></div></div>
                </div>
              )}

              {/* Result Table */}
              <div className="overflow-x-auto rounded-lg border border-emerald-200 shadow-sm mt-3">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-emerald-700 hover:bg-emerald-700">
                      <TableHead className="text-white text-center w-[40px] font-bold">STT</TableHead>
                      {isNYDMode(conditionType) ? (
                        <>
                          <TableHead className="text-white min-w-[80px] font-bold text-center">Mã NYD</TableHead>
                          <TableHead className="text-white min-w-[130px] font-bold text-center">Tên NYD</TableHead>
                          <TableHead className="text-white text-right min-w-[100px] font-bold text-center">{conditionType === 'nyd_activity' ? 'Lượt TVVm HĐ' : 'FYP TVVm'}</TableHead>
                          <TableHead className="text-white text-right min-w-[120px] font-bold text-center bg-amber-600/30">
                            <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                          </TableHead>
                          <TableHead className="text-white min-w-[110px] font-bold text-center">Ghi chú</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="text-white min-w-[80px] font-bold text-center">Nhóm</TableHead>
                          {targetType === 'nhom' ? (
                            <>
                              <TableHead className="text-white min-w-[130px] font-bold text-center">Trưởng nhóm</TableHead>
                              <TableHead className="text-white text-center w-[60px] font-bold">HĐ</TableHead>
                            </>
                          ) : (
                            <>
                              <TableHead className="text-white min-w-[75px] font-bold text-center">Mã số</TableHead>
                              <TableHead className="text-white min-w-[130px] font-bold text-center">Họ tên</TableHead>
                              <TableHead className="text-white text-center w-[85px] font-bold">Ngày HL</TableHead>
                            </>
                          )}
                          <TableHead className="text-white text-right min-w-[100px] font-bold text-center">{isActivityRoundMode(conditionType) && targetType === 'nhom' ? 'Lượt HĐ' : 'IP / Tổng'}</TableHead>
                          <TableHead className="text-white text-right min-w-[120px] font-bold text-center bg-amber-600/30">
                            <div className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Thưởng</div>
                          </TableHead>
                          <TableHead className="text-white min-w-[110px] font-bold text-center">Ghi chú</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isNYDMode(conditionType) ? nydResultRows.map(({ nyd, tier, value }, idx) => {
                      if (hideNotAchieved && !tier) return null;
                      return (
                        <TableRow key={nyd.nydCode} className={`${tier ? 'bg-white' : 'bg-red-50/50'} hover:bg-emerald-50/50 border-b border-gray-100`}>
                          <TableCell className="text-center text-gray-500 text-xs">{idx + 1}</TableCell>
                          <TableCell className="text-xs text-gray-700 font-mono">{nyd.nydCode}</TableCell>
                          <TableCell className="text-xs text-gray-700">{nyd.nydName}</TableCell>
                          <TableCell className="text-right text-xs text-violet-600">
                            {conditionType === 'nyd_activity' ? `${nyd.recruitCount} lượt` : formatNumber(value)}
                          </TableCell>
                          <TableCell className="text-right bg-amber-50/80 text-xs">{tier ? <span className="flex items-center justify-end gap-1"><BonusTypeIcon type={tier.bonusType} className="w-3.5 h-3.5 text-amber-500" /><span className="font-bold text-amber-700">{formatBonus(tier, value, nyd.recruitCount)}</span></span> : <span className="text-gray-300">—</span>}</TableCell>
                          <TableCell>{!tier ? <span className="text-[10px] italic text-gray-400">Chưa đạt</span> : null}</TableCell>
                        </TableRow>
                      );
                    }) : targetType === 'nhom' && isActivityRoundMode(conditionType) ? [...groupedData].map((g) => ({ group: g, tier: calculateActivityRoundBonus(g.activityRounds).tier, remaining: getRemainingToNextActivityRoundTier(g.activityRounds) })).sort((a, b) => (b.tier?.bonusAmount || 0) - (a.tier?.bonusAmount || 0)).map(({ group, tier, remaining }, idx) => {
                      if (hideNotAchieved && !tier) return null;
                      return (
                        <TableRow key={group.maNhom} className={`${tier ? 'bg-white' : 'bg-red-50/50'} hover:bg-emerald-50/50 border-b border-gray-100`}>
                          <TableCell className="text-center text-gray-500 text-xs">{idx + 1}</TableCell>
                          <TableCell className="text-xs text-gray-700">{group.maNhom}</TableCell>
                          <TableCell className="text-xs text-gray-700">{group.leaderName || group.maNhom}</TableCell>
                          <TableCell className="text-center"><Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-600">{group.contractCount}</Badge></TableCell>
                          <TableCell className="text-right text-xs text-orange-600">{group.activityRounds} lượt</TableCell>
                          <TableCell className="text-right bg-amber-50/80 text-xs">{tier ? <span className="flex items-center justify-end gap-1"><BonusTypeIcon type={tier.bonusType} className="w-3.5 h-3.5 text-amber-500" /><span className="font-bold text-amber-700">{formatBonus(tier, group.totalFYP, group.activityRounds)}</span></span> : <span className="text-gray-300">—</span>}</TableCell>
                          <TableCell>{!tier && remaining !== null ? <span className="text-[10px] italic text-gray-400">Cần thêm {remaining} lượt</span> : !tier ? <span className="text-[10px] italic text-gray-400">Chưa đạt</span> : null}</TableCell>
                        </TableRow>
                      );
                    }) : targetType === 'nhom' ? [...groupedData].map((g) => ({ group: g, tier: calculateBonus(g.totalFYP).tier, remaining: getRemainingToNextTier(g.totalFYP) })).sort((a, b) => (b.tier?.bonusAmount || 0) - (a.tier?.bonusAmount || 0)).map(({ group, tier, remaining }, idx) => {
                      if (hideNotAchieved && !tier) return null;
                      return (
                        <TableRow key={group.maNhom} className={`${tier ? 'bg-white' : 'bg-red-50/50'} hover:bg-emerald-50/50 border-b border-gray-100`}>
                          <TableCell className="text-center text-gray-500 text-xs">{idx + 1}</TableCell>
                          <TableCell className="text-xs text-gray-700">{group.maNhom}</TableCell>
                          <TableCell className="text-xs text-gray-700">{group.leaderName || group.maNhom}</TableCell>
                          <TableCell className="text-center"><Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-600">{group.contractCount}</Badge></TableCell>
                          <TableCell className="text-right text-xs text-gray-700">{formatNumber(group.totalFYP)}</TableCell>
                          <TableCell className="text-right bg-amber-50/80 text-xs">{tier ? <span className="flex items-center justify-end gap-1"><BonusTypeIcon type={tier.bonusType} className="w-3.5 h-3.5 text-amber-500" /><span className="font-bold text-amber-700">{formatBonus(tier, group.totalFYP)}</span></span> : <span className="text-gray-300">—</span>}</TableCell>
                          <TableCell>{!tier && remaining !== null ? <span className="text-[10px] italic text-gray-400">Cần thêm {formatNumber(remaining)}</span> : !tier ? <span className="text-[10px] italic text-gray-400">Chưa đạt</span> : null}</TableCell>
                        </TableRow>
                      );
                    }) : [...displayContracts].map((c) => ({ contract: c, tier: conditionType === 'per_contract' ? calculateBonus(c.fyp).tier : null, remaining: conditionType === 'per_contract' ? getRemainingToNextTier(c.fyp) : null })).sort((a, b) => (b.tier?.bonusAmount || 0) - (a.tier?.bonusAmount || 0)).map(({ contract, tier, remaining }, idx) => {
                      if (hideNotAchieved && !tier) return null;
                      return (
                        <TableRow key={contract.id} className={`${tier ? 'bg-white' : 'bg-red-50/50'} hover:bg-emerald-50/50 border-b border-gray-100`}>
                          <TableCell className="text-center text-gray-500 text-xs">{idx + 1}</TableCell>
                          <TableCell className="text-xs text-gray-700">{contract.maNhom}</TableCell>
                          <TableCell className="text-xs text-gray-700">{contract.agentCode}</TableCell>
                          <TableCell className="text-xs text-gray-700">{contract.agentName}</TableCell>
                          <TableCell className="text-center text-xs text-gray-500">{formatDate(contract.effectiveDate)}</TableCell>
                          <TableCell className="text-right text-xs text-gray-700">{formatNumber(contract.fyp)}</TableCell>
                          <TableCell className="text-right bg-amber-50/80 text-xs">{tier ? <span className="flex items-center justify-end gap-1"><BonusTypeIcon type={tier.bonusType} className="w-3.5 h-3.5 text-amber-500" /><span className="font-bold text-amber-700">{formatBonus(tier, contract.fyp)}</span></span> : <span className="text-gray-300">—</span>}</TableCell>
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

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-[#1a1a2e] border-emerald-500/20">
          <DialogHeader><DialogTitle className="text-white">Nhập dữ liệu từ Google Sheets</DialogTitle><DialogDescription className="text-white/50">Dán liên kết CSV để nhập dữ liệu hợp đồng</DialogDescription></DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-1"><Label className="text-xs text-white/60">Liên kết CSV</Label><Input value={csvUrl} onChange={(e) => setCsvUrl(e.target.value)} className="font-mono text-xs h-8 bg-white/5 border-emerald-500/20 text-white" /></div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-xs text-amber-300"><p className="font-medium mb-1">Cột sử dụng:</p><ul className="space-y-0.5 ml-3 list-disc"><li><b>Ngày hiệu lực</b> → Ngày bắt đầu thi đua</li><li><b>PĐT + 10% ĐT</b> → IP</li></ul></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsImportDialogOpen(false)} className="h-8 border-emerald-500/20 bg-transparent text-white/70">Hủy</Button><Button onClick={handleImportFromUrl} disabled={isImporting} className="bg-emerald-600 hover:bg-emerald-700 h-8">{isImporting ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Đang nhập...</> : <><Download className="w-3 h-3 mr-1" /> Nhập dữ liệu</>}</Button></DialogFooter>
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
