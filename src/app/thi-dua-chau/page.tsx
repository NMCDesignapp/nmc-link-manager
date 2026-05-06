'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { toast } from '@/hooks/use-toast';
import {
  Plus, Trash2, Search, Trophy, FileText, TrendingUp, Database,
  Download, X, RefreshCw, Link, Loader2, Printer, Copy, Save, BookmarkPlus,
  Sparkles, Target, Award, Users, Banknote, CalendarRange, Gift,
  UserCheck, Percent, Image as ImageIcon, ChevronDown, ChevronUp, ArrowLeft,
} from 'lucide-react';

interface Contract {
  id: string; contractNumber: string; agentCode: string; agentName: string;
  position: string; ban: string; nhom: string; maNhom: string;
  effectiveDate: string; issueDate: string; fyp: number; afyp: number;
}

interface BonusTier {
  id: string; minFYP: number; maxFYP: number | null; bonusAmount: number;
  bonusType: 'money' | 'gift' | 'percent'; bonusText: string; bonusPercent: number;
}

interface GroupData {
  maNhom: string; leaderName: string; leaderCode: string; totalFYP: number;
  contractCount: number; activityRounds: number; contracts: Contract[];
}

interface SavedContest {
  id: string; title: string; startDate: string; endDate: string;
  issueDate: string | null; conditionType: string; targetType: string;
  bonusTiers: string; createdAt: string; updatedAt: string;
}

type ConditionType = 'per_contract' | 'total_fyp' | 'activity_round' | 'activity_round_standard';
type TargetType = 'tvv' | 'nhom';

function isActivityRoundMode(ct: ConditionType): boolean {
  return ct === 'activity_round' || ct === 'activity_round_standard';
}

const DEFAULT_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vStQqbaHb_1aP-hMzZCiVoeaSobXV5gwqw6iZBoQ0MgpsXiobO1GdCM5zoCoCxVBtxT_Nujjll_MJmC/pub?output=csv';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}
function formatNumber(amount: number): string { return new Intl.NumberFormat('vi-VN').format(amount); }
function formatDate(dateStr: string): string { return new Date(dateStr).toLocaleDateString('vi-VN'); }
function trieuToVnd(val: number): number { return val * 1_000_000; }
function vndToTrieu(val: number): number { return val / 1_000_000; }

function formatBonus(tier: BonusTier, fyp?: number): string {
  if (tier.bonusType === 'gift' && tier.bonusText) return tier.bonusText;
  if (tier.bonusType === 'percent' && tier.bonusPercent > 0) {
    const calculated = fyp ? tier.bonusPercent / 100 * fyp : 0;
    return `${tier.bonusPercent}% IP${fyp ? ` = ${formatCurrency(calculated)}` : ''}`;
  }
  return formatCurrency(tier.bonusAmount);
}

// ContestPoster Component
function ContestPoster({ contestTitle, startDate, endDate, conditionType, targetType, sortedTiers, filteredContracts, groupedData, totalFYP, totalBonus, achievedCount, notAchievedCount, formatCurrency: fc, formatNumber: fn, formatDate: fd, isPreview = false }: {
  contestTitle: string; startDate: string; endDate: string; conditionType: ConditionType;
  targetType: TargetType; sortedTiers: BonusTier[]; filteredContracts: Contract[];
  groupedData: GroupData[]; totalFYP: number; totalBonus: number;
  achievedCount: number; notAchievedCount: number;
  formatCurrency: (n: number) => string; formatNumber: (n: number) => string;
  formatDate: (d: string) => string; isPreview?: boolean;
}) {
  const rowCount = targetType === 'nhom' ? groupedData.length : filteredContracts.length;
  const hasData = rowCount > 0;
  const achievementPercent = hasData ? Math.round((achievedCount / rowCount) * 100) : 0;
  const tierColors = ['from-amber-400 to-orange-500','from-emerald-400 to-teal-500','from-sky-400 to-cyan-500','from-violet-400 to-purple-500','from-rose-400 to-pink-500','from-lime-400 to-green-500'];

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
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-emerald-100"><Target className="w-3 h-3" />{conditionType === 'per_contract' ? 'Theo HĐ' : conditionType === 'total_fyp' ? 'Tổng IP' : conditionType === 'activity_round' ? 'Lượt HĐ' : 'Lượt HĐ Chuẩn'}</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-sky-100">{targetType === 'tvv' ? <><Users className="w-3 h-3" /> TVV</> : <><UserCheck className="w-3 h-3" /> Nhóm</>}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-none">
          {sortedTiers.map((tier, i) => (
            <div key={tier.id} className={`flex-shrink-0 rounded-lg px-2.5 py-1.5 bg-gradient-to-br ${tierColors[i % tierColors.length]} text-white min-w-[100px] shadow-md`}>
              <div className="flex items-center gap-1 mb-0.5">{tier.bonusType === 'gift' ? <Gift className="w-3 h-3 opacity-80" /> : tier.bonusType === 'percent' ? <Percent className="w-3 h-3 opacity-80" /> : <Sparkles className="w-3 h-3 opacity-80" />}<span className="text-[9px] font-bold uppercase opacity-90">Mức {i + 1}</span></div>
              <div className="text-[10px] font-semibold leading-tight">{isActivityRoundMode(conditionType) ? `${tier.minFYP}${tier.maxFYP ? ` - ${tier.maxFYP}` : ' ↑'} lượt` : `${fc(tier.minFYP)}${tier.maxFYP ? ` - ${fc(tier.maxFYP)}` : ' ↑'}`}</div>
              <div className="text-xs font-extrabold mt-0.5 truncate" title={formatBonus(tier)}>{formatBonus(tier)}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center border border-white/10"><div className="flex items-center justify-center gap-1 mb-0.5"><FileText className="w-3 h-3 text-emerald-300" /><span className="text-[9px] text-emerald-300 uppercase">{targetType === 'nhom' ? 'Nhóm' : 'HĐ'}</span></div><p className="text-lg font-extrabold text-white">{hasData ? rowCount : '—'}</p></div>
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
  const [posterUrl, setPosterUrl] = useState<string>('');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [csvUrl, setCsvUrl] = useState(DEFAULT_CSV_URL);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newContract, setNewContract] = useState({ contractNumber: '', agentCode: '', agentName: '', position: '', ban: '', nhom: '', maNhom: '', effectiveDate: '', issueDate: '', fyp: '', afyp: '' });
  const [savedContests, setSavedContests] = useState<SavedContest[]>([]);
  const [selectedContestId, setSelectedContestId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSourceData, setShowSourceData] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

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
    results.sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());
    setFilteredContracts(results);
    if (results.length === 0) toast({ title: 'Thông báo', description: 'Không tìm thấy hợp đồng nào phù hợp' });
    else toast({ title: 'Thành công', description: `Tìm thấy ${results.length} hợp đồng` });
  }, [startDate, endDate, issueDate, contracts]);

  const handleSearchRef = useRef(handleSearch);
  handleSearchRef.current = handleSearch;

  const calculateBonus = useCallback((fyp: number): { tier: BonusTier | null; tierIndex: number } => {
    const sortedTiers = [...bonusTiers].sort((a, b) => a.minFYP - b.minFYP);
    for (let i = sortedTiers.length - 1; i >= 0; i--) { const tier = sortedTiers[i]; if (fyp >= tier.minFYP) return { tier, tierIndex: i }; }
    return { tier: null, tierIndex: -1 };
  }, [bonusTiers]);

  const getBonusAmount = useCallback((fyp: number): number => {
    const { tier } = calculateBonus(fyp); if (!tier) return 0;
    return tier.bonusType === 'percent' ? tier.bonusPercent / 100 * fyp : tier.bonusAmount;
  }, [calculateBonus]);

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

  const getActivityRoundBonusAmount = useCallback((activityRounds: number, groupTotalFYP?: number): number => {
    const { tier } = calculateActivityRoundBonus(activityRounds); if (!tier) return 0;
    return tier.bonusType === 'percent' && groupTotalFYP ? tier.bonusPercent / 100 * groupTotalFYP : tier.bonusAmount;
  }, [calculateActivityRoundBonus]);

  const getRemainingToNextActivityRoundTier = useCallback((activityRounds: number): number | null => {
    const sortedTiers = [...bonusTiers].sort((a, b) => a.minFYP - b.minFYP);
    for (const tier of sortedTiers) { if (tier.minFYP > activityRounds) return tier.minFYP - activityRounds; }
    return null;
  }, [bonusTiers]);

  const groupedData: GroupData[] = (() => {
    if (targetType !== 'nhom') return [];
    const map = new Map<string, GroupData>();
    for (const c of filteredContracts) {
      const key = c.maNhom;
      if (!map.has(key)) map.set(key, { maNhom: key, leaderName: '', leaderCode: '', totalFYP: 0, contractCount: 0, activityRounds: 0, contracts: [] });
      const g = map.get(key)!; g.totalFYP += c.fyp; g.contractCount += 1; g.contracts.push(c);
      if (c.position && c.position.toLowerCase().includes('trưởng nhóm')) { g.leaderName = c.agentName; g.leaderCode = c.agentCode; }
    }
    if (isActivityRoundMode(conditionType)) {
      const ipThreshold = conditionType === 'activity_round_standard' ? 12_000_000 : 3_000_000;
      for (const g of Array.from(map.values())) {
        const agentIPMap = new Map<string, number>();
        for (const c of g.contracts) { agentIPMap.set(c.agentCode, (agentIPMap.get(c.agentCode) || 0) + c.fyp); }
        let rounds = 0; for (const [, totalIP] of agentIPMap) { if (totalIP >= ipThreshold) rounds++; }
        g.activityRounds = rounds;
      }
    }
    return Array.from(map.values());
  })();

  const getTotalFYPBonus = useCallback((): { totalFYP: number; bonus: number; tier: BonusTier | null; remaining: number | null } => {
    const totalFYP = filteredContracts.reduce((sum, c) => sum + c.fyp, 0);
    const { tier } = calculateBonus(totalFYP); const remaining = getRemainingToNextTier(totalFYP);
    const bonus = tier ? (tier.bonusType === 'percent' ? tier.bonusPercent / 100 * totalFYP : tier.bonusAmount) : 0;
    return { totalFYP, bonus, tier, remaining };
  }, [filteredContracts, calculateBonus, getRemainingToNextTier]);

  const addBonusTier = () => setBonusTiers([...bonusTiers, { id: crypto.randomUUID(), minFYP: 0, maxFYP: null, bonusAmount: 0, bonusType: 'money', bonusText: '', bonusPercent: 0 }]);
  const removeBonusTier = (id: string) => { if (bonusTiers.length <= 1) { toast({ title: 'Thông báo', description: 'Phải có ít nhất một mức thưởng' }); return; } setBonusTiers(bonusTiers.filter((t) => t.id !== id)); };
  const updateBonusTier = (id: string, field: keyof BonusTier, value: string | number | null) => setBonusTiers(bonusTiers.map((t) => (t.id === id ? { ...t, [field]: value } : t)));

  const handleSaveContest = async () => {
    if (!contestTitle) { toast({ title: 'Lỗi', description: 'Nhập tên chương trình' }); return; }
    setIsSaving(true);
    try {
      const res = await fetch('/api/contests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: contestTitle, startDate, endDate, issueDate: issueDate || undefined, conditionType, targetType, bonusTiers: JSON.stringify(bonusTiers) }) });
      if (res.ok) { const data = await res.json(); toast({ title: 'Thành công', description: data.message }); fetchSavedContests(); }
      else toast({ title: 'Lỗi', description: 'Không thể lưu', variant: 'destructive' });
    } catch { toast({ title: 'Lỗi', description: 'Không thể lưu', variant: 'destructive' }); }
    finally { setIsSaving(false); }
  };

  const handleLoadContest = (contestId: string) => {
    setSelectedContestId(contestId); const contest = savedContests.find(c => c.id === contestId); if (!contest) return;
    setContestTitle(contest.title); setStartDate(new Date(contest.startDate).toISOString().slice(0, 10)); setEndDate(new Date(contest.endDate).toISOString().slice(0, 10));
    setConditionType(contest.conditionType as ConditionType); setTargetType(isActivityRoundMode(contest.conditionType as ConditionType) ? 'nhom' : (contest.targetType || 'tvv') as TargetType);
    if (contest.issueDate) setIssueDate(new Date(contest.issueDate).toISOString().slice(0, 10)); else setIssueDate('');
    try { const tiers = JSON.parse(contest.bonusTiers); if (Array.isArray(tiers)) setBonusTiers(tiers); } catch { /* ignore */ }
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

  const handleCreateContract = async () => {
    try {
      const res = await fetch('/api/contracts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newContract, fyp: parseFloat(newContract.fyp) || 0, afyp: parseFloat(newContract.afyp) || 0, effectiveDate: newContract.effectiveDate, issueDate: newContract.issueDate || newContract.effectiveDate }) });
      if (res.ok) { toast({ title: 'Thành công', description: 'Đã tạo hợp đồng mới' }); setIsAddDialogOpen(false); setNewContract({ contractNumber: '', agentCode: '', agentName: '', position: '', ban: '', nhom: '', maNhom: '', effectiveDate: '', issueDate: '', fyp: '', afyp: '' }); fetchContracts(); }
      else { const data = await res.json(); toast({ title: 'Lỗi', description: data.error || 'Không thể tạo', variant: 'destructive' }); }
    } catch { toast({ title: 'Lỗi', description: 'Không thể kết nối', variant: 'destructive' }); }
  };

  const handleDeleteContract = async (id: string) => {
    try { const res = await fetch(`/api/contracts?id=${id}`, { method: 'DELETE' }); if (res.ok) { toast({ title: 'Thành công', description: 'Đã xóa' }); fetchContracts(); setFilteredContracts((prev) => prev.filter((c) => c.id !== id)); } }
    catch { toast({ title: 'Lỗi', description: 'Không thể xóa', variant: 'destructive' }); }
  };

  const handlePrint = () => {
    if (!printRef.current) return; const printWindow = window.open('', '_blank'); if (!printWindow) return;
    const styles = `<style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',Arial,sans-serif;padding:20px;background:white;color:#1a1a1a}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#064e3b;color:white;padding:8px 6px;text-align:left;font-weight:600;font-size:10px}td{padding:7px 6px;border-bottom:1px solid #e5e7eb;white-space:nowrap}tr:nth-child(even){background:#f9fafb}@media print{body{padding:10px}}</style>`;
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">${styles}</head><body>${printRef.current.innerHTML}</body></html>`);
    printWindow.document.close(); setTimeout(() => { printWindow.print(); }, 500);
  };

  const handleCopyText = () => {
    if (filteredContracts.length === 0) return;
    const sortedTiers = [...bonusTiers].sort((a, b) => a.minFYP - b.minFYP);
    let text = `🏆 ${contestTitle}\n📅 Từ ${startDate ? formatDate(startDate) : '...'} đến ${endDate ? formatDate(endDate) : '...'}\n🎯 ${targetType === 'tvv' ? 'TVV' : 'Nhóm'}\n━━━━━━━━━━━━━━━━━━━━\n📊 Mức thưởng:\n`;
    sortedTiers.forEach((t, i) => { text += `  Mức ${i + 1}: ${isActivityRoundMode(conditionType) ? `${t.minFYP}${t.maxFYP ? ` - ${t.maxFYP}` : ' ↑'} lượt` : `${formatCurrency(t.minFYP)}${t.maxFYP ? ` - ${formatCurrency(t.maxFYP)}` : ' ↑'}`} → ${formatBonus(t)}\n`; });
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    if (targetType === 'nhom' && isActivityRoundMode(conditionType)) {
      [...groupedData].map((g) => ({ group: g, tier: calculateActivityRoundBonus(g.activityRounds).tier })).sort((a, b) => (b.tier?.bonusAmount || 0) - (a.tier?.bonusAmount || 0)).forEach(({ group: g, tier }, idx) => { text += `${idx + 1}. ${g.maNhom} | ${g.leaderName || g.maNhom} | ${g.activityRounds} lượt | ${tier ? `Thưởng: ${formatBonus(tier, g.totalFYP)}` : 'Chưa đạt'}\n`; });
    } else if (targetType === 'nhom') {
      [...groupedData].map((g) => ({ group: g, tier: calculateBonus(g.totalFYP).tier })).sort((a, b) => (b.tier?.bonusAmount || 0) - (a.tier?.bonusAmount || 0)).forEach(({ group: g, tier }, idx) => { text += `${idx + 1}. ${g.maNhom} | ${g.leaderName || g.maNhom} | IP: ${formatNumber(g.totalFYP)} | ${tier ? `Thưởng: ${formatBonus(tier, g.totalFYP)}` : 'Chưa đạt'}\n`; });
    } else {
      [...filteredContracts].map((c) => ({ contract: c, tier: conditionType === 'per_contract' ? calculateBonus(c.fyp).tier : null })).sort((a, b) => (b.tier?.bonusAmount || 0) - (a.tier?.bonusAmount || 0)).forEach(({ contract: c, tier }, idx) => { text += `${idx + 1}. ${c.maNhom} | ${c.agentName} | IP: ${formatNumber(c.fyp)} | ${tier ? `Thưởng: ${formatBonus(tier, c.fyp)}` : 'Chưa đạt'}\n`; });
    }
    navigator.clipboard.writeText(text).then(() => toast({ title: 'Đã sao chép!', description: 'Dán vào Zalo/Telegram' })).catch(() => toast({ title: 'Lỗi', description: 'Không thể sao chép', variant: 'destructive' }));
  };

  const handleExport = () => {
    if (filteredContracts.length === 0) { toast({ title: 'Thông báo', description: 'Không có dữ liệu' }); return; }
    const headers = ['STT', 'Nhóm', targetType === 'nhom' ? 'Trưởng nhóm' : 'Mã số', targetType === 'nhom' ? 'Số HĐ' : 'Họ tên', isActivityRoundMode(conditionType) && targetType === 'nhom' ? 'Lượt HĐ' : 'IP / Tổng', 'Thưởng', 'Ghi chú'];
    const rows = (targetType === 'nhom' ? [...groupedData].map((g) => { const { tier } = isActivityRoundMode(conditionType) ? calculateActivityRoundBonus(g.activityRounds) : calculateBonus(g.totalFYP); return { g, tier }; }).sort((a, b) => (b.tier?.bonusAmount || 0) - (a.tier?.bonusAmount || 0)).map(({ g, tier }, idx) => [idx + 1, g.maNhom, g.leaderName || g.maNhom, isActivityRoundMode(conditionType) ? `${g.activityRounds} lượt` : g.contractCount, g.totalFYP, tier ? formatBonus(tier, g.totalFYP) : '', tier ? '' : 'Chưa đạt mức']) : [...filteredContracts].map((c) => { const { tier } = calculateBonus(c.fyp); return { c, tier }; }).sort((a, b) => (b.tier?.bonusAmount || 0) - (a.tier?.bonusAmount || 0)).map(({ c, tier }, idx) => [idx + 1, c.maNhom, c.agentCode, c.agentName, c.fyp, tier ? formatBonus(tier, c.fyp) : '', tier ? '' : 'Chưa đạt mức']));
    const csvContent = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = `ket_qua_thi_dua_${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  };

  // Computed values
  const totalFYP = filteredContracts.reduce((sum, c) => sum + c.fyp, 0);
  const tvvAchievedCount = filteredContracts.filter((c) => calculateBonus(c.fyp).tier !== null).length;
  const tvvTotalBonus = filteredContracts.reduce((sum, c) => sum + getBonusAmount(c.fyp), 0);
  const nhomAchievedCount = groupedData.filter((g) => calculateBonus(g.totalFYP).tier !== null).length;
  const nhomTotalFYP = groupedData.reduce((s, g) => s + g.totalFYP, 0);
  const nhomTotalBonus = groupedData.reduce((s, g) => s + getBonusAmount(g.totalFYP), 0);
  const arAchievedCount = isActivityRoundMode(conditionType) ? groupedData.filter((g) => calculateActivityRoundBonus(g.activityRounds).tier !== null).length : 0;
  const arNotAchievedCount = isActivityRoundMode(conditionType) ? groupedData.length - arAchievedCount : 0;
  const arTotalBonus = isActivityRoundMode(conditionType) ? groupedData.reduce((s, g) => s + getActivityRoundBonusAmount(g.activityRounds, g.totalFYP), 0) : 0;
  const achievedCount = isActivityRoundMode(conditionType) ? arAchievedCount : targetType === 'nhom' ? nhomAchievedCount : tvvAchievedCount;
  const notAchievedCount = isActivityRoundMode(conditionType) ? arNotAchievedCount : targetType === 'nhom' ? groupedData.length - nhomAchievedCount : filteredContracts.length - tvvAchievedCount;
  const totalBonusDisplay = isActivityRoundMode(conditionType) ? arTotalBonus : targetType === 'nhom' ? nhomTotalBonus : (conditionType === 'total_fyp' ? getTotalFYPBonus().bonus : tvvTotalBonus);
  const displayTotalFYP = targetType === 'nhom' ? nhomTotalFYP : totalFYP;
  const { totalFYP: totalFYPValue, tier: matchedTotalTier, remaining: totalRemaining } = getTotalFYPBonus();
  const sortedTiers = [...bonusTiers].sort((a, b) => a.minFYP - b.minFYP);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Grid background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(0,255,136,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/')}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center"><Trophy className="w-4 h-4 text-white" /></div>
            <div><h1 className="text-base font-bold text-white">Tính Thưởng Thi Đua</h1><p className="text-[10px] text-white/40">Quản lý & tính thưởng IP</p></div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-8 text-xs bg-transparent" onClick={() => setIsImportDialogOpen(true)}>
              <Link className="w-3.5 h-3.5 mr-1" /> Nhập Google Sheets
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Thêm HĐ
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 py-4 space-y-4 relative">
        {/* STEP 1: Info */}
        <Card className="border-white/10 shadow-sm bg-white/5 backdrop-blur-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">1</div>
                <CardTitle className="text-sm text-white">Thông tin chương trình</CardTitle>
              </div>
              <div className="flex items-center gap-1.5">
                <Select value={selectedContestId} onValueChange={handleLoadContest}>
                  <SelectTrigger className="w-[180px] h-7 text-xs bg-white/5 border-white/10 text-white"><BookmarkPlus className="w-3 h-3 mr-1 text-emerald-400" /><SelectValue placeholder="Chương trình đã lưu..." /></SelectTrigger>
                  <SelectContent>{savedContests.length === 0 ? <SelectItem value="_none" disabled>Chưa có</SelectItem> : savedContests.map((sc) => (<SelectItem key={sc.id} value={sc.id}><div className="flex items-center gap-2"><span className="truncate">{sc.title}</span><Button variant="ghost" size="sm" className="h-4 w-4 p-0 text-red-400 hover:text-red-600" onClick={(e) => handleDeleteContest(sc.id, e)}><Trash2 className="w-2.5 h-2.5" /></Button></div></SelectItem>))}</SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={handleSaveContest} disabled={isSaving} className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-7 text-xs bg-transparent">{isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}Lưu</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-white/70">Tên chương trình thi đua</Label>
              <Input value={contestTitle} onChange={(e) => setContestTitle(e.target.value)} className="font-semibold border-white/10 bg-white/5 text-white h-9 text-sm" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1"><Label className="text-xs text-white/50">Hiệu lực từ</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-xs border-white/10 bg-white/5 text-white" /></div>
              <div className="space-y-1"><Label className="text-xs text-white/50">Hiệu lực đến</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 text-xs border-white/10 bg-white/5 text-white" /></div>
              <div className="space-y-1"><Label className="text-xs text-white/50">Ngày phát hành</Label><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="h-8 text-xs border-white/10 bg-white/5 text-white" /></div>
            </div>
          </CardContent>
        </Card>

        {/* STEP 2: Config */}
        <Card className="border-white/10 shadow-sm bg-white/5 backdrop-blur-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold">2</div>
              <CardTitle className="text-sm text-white">Cấu hình thi đua & Thưởng</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Target */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-white/70">Đối tượng</Label>
                <RadioGroup value={targetType} onValueChange={(v) => setTargetType(v as TargetType)} className="space-y-1.5">
                  <div className={`flex items-center space-x-2 rounded-lg border border-white/10 p-2 cursor-pointer hover:bg-white/5 ${isActivityRoundMode(conditionType) ? 'opacity-50 pointer-events-none' : ''}`}>
                    <RadioGroupItem value="tvv" id="tvv" disabled={isActivityRoundMode(conditionType)} />
                    <Label htmlFor="tvv" className="cursor-pointer flex-1"><div className="text-xs font-medium flex items-center gap-1 text-white/80"><Users className="w-3.5 h-3.5 text-emerald-400" /> TVV (cá nhân)</div></Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-lg border border-white/10 p-2 cursor-pointer hover:bg-white/5">
                    <RadioGroupItem value="nhom" id="nhom" />
                    <Label htmlFor="nhom" className="cursor-pointer flex-1"><div className="text-xs font-medium flex items-center gap-1 text-white/80"><UserCheck className="w-3.5 h-3.5 text-sky-400" /> Theo nhóm (MC NHÓM)</div></Label>
                  </div>
                </RadioGroup>
              </div>
              {/* Condition */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-white/70">Điều kiện</Label>
                <RadioGroup value={conditionType} onValueChange={(v) => { setConditionType(v as ConditionType); if (isActivityRoundMode(v as ConditionType)) setTargetType('nhom'); }} className="space-y-1.5">
                  <div className="flex items-center space-x-2 rounded-lg border border-white/10 p-2 cursor-pointer hover:bg-white/5"><RadioGroupItem value="per_contract" id="pc" /><Label htmlFor="pc" className="cursor-pointer flex-1"><div className="text-xs font-medium text-white/80">Theo HĐ (IP/HĐ)</div></Label></div>
                  <div className="flex items-center space-x-2 rounded-lg border border-white/10 p-2 cursor-pointer hover:bg-white/5"><RadioGroupItem value="total_fyp" id="tf" /><Label htmlFor="tf" className="cursor-pointer flex-1"><div className="text-xs font-medium text-white/80">Tổng IP</div></Label></div>
                  <div className="flex items-center space-x-2 rounded-lg border border-white/10 p-2 cursor-pointer hover:bg-white/5"><RadioGroupItem value="activity_round" id="ar" /><Label htmlFor="ar" className="cursor-pointer flex-1"><div className="text-xs font-medium text-white/80">Lượt HĐ (IP ≥ 3tr)</div></Label></div>
                  <div className="flex items-center space-x-2 rounded-lg border border-white/10 p-2 cursor-pointer hover:bg-white/5"><RadioGroupItem value="activity_round_standard" id="ars" /><Label htmlFor="ars" className="cursor-pointer flex-1"><div className="text-xs font-medium text-white/80">Lượt HĐ Chuẩn (IP ≥ 12tr)</div></Label></div>
                </RadioGroup>
              </div>
            </div>

            <Separator className="bg-white/10" />

            {/* Bonus Tiers */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-white/70">Bảng mức thưởng</Label>
                <Button variant="ghost" size="sm" onClick={addBonusTier} className="text-amber-400 hover:text-amber-300 h-6 text-xs"><Plus className="w-3 h-3 mr-0.5" /> Thêm mức</Button>
              </div>
              <div className="space-y-2">
                {bonusTiers.map((tier, index) => (
                  <div key={tier.id} className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Mức {index + 1}</span>
                      <div className="flex items-center gap-0.5 ml-auto">
                        {([['money', 'Tiền', Banknote, 'bg-emerald-600'], ['gift', 'Quà', Gift, 'bg-pink-600'], ['percent', '% IP', Percent, 'bg-violet-600']] as const).map(([type, label, Icon, activeCls]) => (
                          <Button key={type} variant={tier.bonusType === type ? 'default' : 'outline'} size="sm" className={`h-5 px-1.5 text-[9px] ${tier.bonusType === type ? activeCls + ' hover:opacity-90' : 'border-white/10 text-white/50 bg-transparent'}`} onClick={() => updateBonusTier(tier.id, 'bonusType', type)}><Icon className="w-2.5 h-2.5 mr-0.5" />{label}</Button>
                        ))}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeBonusTier(tier.id)} className="h-5 w-5 p-0 text-red-400 hover:text-red-600"><Trash2 className="w-2.5 h-2.5" /></Button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {isActivityRoundMode(conditionType) ? (
                        <>
                          <div><Label className="text-[9px] text-white/40">Lượt từ</Label><Input type="number" placeholder="0" value={tier.minFYP || ''} onChange={(e) => updateBonusTier(tier.id, 'minFYP', parseInt(e.target.value) || 0)} className="h-7 text-xs border-white/10 bg-white/5 text-white" /></div>
                          <div><Label className="text-[9px] text-white/40">Lượt đến</Label><Input type="number" placeholder="∞" value={tier.maxFYP || ''} onChange={(e) => updateBonusTier(tier.id, 'maxFYP', e.target.value ? parseInt(e.target.value) : null)} className="h-7 text-xs border-white/10 bg-white/5 text-white" /></div>
                        </>
                      ) : (
                        <>
                          <div><Label className="text-[9px] text-white/40">IP từ (tr)</Label><Input type="number" placeholder="0" value={vndToTrieu(tier.minFYP) || ''} onChange={(e) => updateBonusTier(tier.id, 'minFYP', trieuToVnd(parseFloat(e.target.value) || 0))} className="h-7 text-xs border-white/10 bg-white/5 text-white" /></div>
                          <div><Label className="text-[9px] text-white/40">IP đến (tr)</Label><Input type="number" placeholder="∞" value={tier.maxFYP ? vndToTrieu(tier.maxFYP) : ''} onChange={(e) => updateBonusTier(tier.id, 'maxFYP', e.target.value ? trieuToVnd(parseFloat(e.target.value)) : null)} className="h-7 text-xs border-white/10 bg-white/5 text-white" /></div>
                        </>
                      )}
                      <div>
                        <Label className="text-[9px] text-white/40">{tier.bonusType === 'money' ? 'Thưởng (tr)' : tier.bonusType === 'percent' ? '% IP' : 'Quà tặng'}</Label>
                        {tier.bonusType === 'money' ? <Input type="number" placeholder="0" value={vndToTrieu(tier.bonusAmount) || ''} onChange={(e) => updateBonusTier(tier.id, 'bonusAmount', trieuToVnd(parseFloat(e.target.value) || 0))} className="h-7 text-xs border-white/10 bg-white/5 text-white" />
                        : tier.bonusType === 'percent' ? <Input type="number" placeholder="7" value={tier.bonusPercent || ''} onChange={(e) => updateBonusTier(tier.id, 'bonusPercent', parseFloat(e.target.value) || 0)} className="h-7 text-xs border-white/10 bg-white/5 text-white" />
                        : <Input type="text" placeholder="VD: iPhone 15" value={tier.bonusText} onChange={(e) => updateBonusTier(tier.id, 'bonusText', e.target.value)} className="h-7 text-xs border-white/10 bg-white/5 text-white" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-white/10" />

            {/* Poster + Action */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors">
                  <ImageIcon className="w-3.5 h-3.5" /> Ảnh poster
                  <input type="file" accept="image/*" onChange={handlePosterUpload} className="hidden" />
                </label>
                {posterUrl && <Button variant="outline" size="sm" onClick={() => setPosterUrl('')} className="text-red-400 border-white/10 bg-transparent h-7 text-xs"><X className="w-3 h-3 mr-0.5" />Xóa</Button>}
                {posterUrl && <img src={posterUrl} alt="Preview" className="h-8 rounded border border-white/10" />}
              </div>
              <div className="flex gap-2 sm:ml-auto">
                <Button onClick={handleSearch} className="bg-emerald-600 hover:bg-emerald-700 h-9 text-sm"><Search className="w-4 h-4 mr-1.5" /> Tính kết quả thi đua</Button>
                <Button variant="outline" onClick={() => { setStartDate(''); setEndDate(''); setIssueDate(''); setFilteredContracts([]); setSelectedContestId(''); }} className="h-9 border-white/10 bg-transparent text-white/70 hover:text-white"><X className="w-4 h-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Poster */}
        <ContestPoster contestTitle={contestTitle} startDate={startDate} endDate={endDate} conditionType={conditionType} targetType={targetType} sortedTiers={sortedTiers} filteredContracts={filteredContracts} groupedData={groupedData} totalFYP={displayTotalFYP} totalBonus={totalBonusDisplay} achievedCount={achievedCount} notAchievedCount={notAchievedCount} formatCurrency={formatCurrency} formatNumber={formatNumber} formatDate={formatDate} isPreview />

        {/* Results */}
        {filteredContracts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 justify-end">
              <Button variant="outline" size="sm" onClick={handleCopyText} className="border-teal-500/30 text-teal-400 h-7 text-xs bg-transparent hover:bg-teal-500/10"><Copy className="w-3 h-3 mr-1" />Copy</Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="border-emerald-500/30 text-emerald-400 h-7 text-xs bg-transparent hover:bg-emerald-500/10"><Printer className="w-3 h-3 mr-1" />In PDF</Button>
              <Button variant="outline" size="sm" onClick={handleExport} className="border-white/10 text-white/70 h-7 text-xs bg-transparent hover:bg-white/5"><Download className="w-3 h-3 mr-1" />CSV</Button>
            </div>

            <div ref={printRef}>
              <Card className="border-2 border-emerald-500/30 shadow-lg overflow-hidden bg-white/5 backdrop-blur-sm">
                <ContestPoster contestTitle={contestTitle} startDate={startDate} endDate={endDate} conditionType={conditionType} targetType={targetType} sortedTiers={sortedTiers} filteredContracts={filteredContracts} groupedData={groupedData} totalFYP={displayTotalFYP} totalBonus={totalBonusDisplay} achievedCount={achievedCount} notAchievedCount={notAchievedCount} formatCurrency={formatCurrency} formatNumber={formatNumber} formatDate={formatDate} />

                {isActivityRoundMode(conditionType) && targetType === 'nhom' && groupedData.length > 0 && (
                  <div className="mx-3 mt-2 rounded-lg bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 p-2">
                    <div className="flex items-center gap-2"><Users className="w-4 h-4 text-orange-400" /><div className="flex-1"><p className="text-xs font-bold text-orange-300">{conditionType === 'activity_round' ? 'Lượt HĐ' : 'Lượt HĐ Chuẩn'}: IP ≥ {conditionType === 'activity_round' ? '3' : '12'} triệu = 1 lượt</p></div><div className="text-right"><p className="text-[10px] text-orange-400">Tổng thưởng</p><p className="text-base font-extrabold text-orange-300">{formatCurrency(arTotalBonus)}</p></div></div>
                  </div>
                )}
                {conditionType === 'total_fyp' && matchedTotalTier && (
                  <div className="mx-3 mt-2 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-2">
                    <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-amber-400" /><div className="flex-1"><p className="text-xs font-bold text-amber-300">Tổng IP: {formatCurrency(totalFYPValue)}</p></div><div className="text-right"><p className="text-base font-extrabold text-amber-300">{formatBonus(matchedTotalTier, totalFYPValue)}</p></div>{totalRemaining !== null && <div className="text-right border-l border-white/10 pl-2"><p className="text-[10px] text-orange-400">Cần thêm</p><p className="text-sm font-bold text-orange-300">{formatCurrency(totalRemaining)}</p></div>}</div>
                  </div>
                )}

                {posterUrl && <div className="mb-2 flex justify-center"><img src={posterUrl} alt="Poster" className="max-h-48 rounded-xl shadow-lg" /></div>}

                <div className="text-center mb-2"><h2 className="text-base font-extrabold text-emerald-400">{contestTitle || 'CHƯƠNG TRÌNH THI ĐUA'}</h2><p className="text-xs text-white/40">Từ {startDate ? formatDate(startDate) : '...'} đến {endDate ? formatDate(endDate) : '...'}</p></div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow className="bg-gray-800/80 hover:bg-gray-800/80"><TableHead className="text-center text-gray-200 w-[40px]">STT</TableHead><TableHead className="text-gray-200 min-w-[80px]">Nhóm</TableHead>{targetType === 'nhom' ? <><TableHead className="text-gray-200 min-w-[130px]">Trưởng nhóm</TableHead><TableHead className="text-gray-200 text-center w-[60px]">HĐ</TableHead></> : <><TableHead className="text-gray-200 min-w-[75px]">Mã số</TableHead><TableHead className="text-gray-200 min-w-[130px]">Họ tên</TableHead><TableHead className="text-gray-200 text-center w-[85px]">Ngày HL</TableHead></>}<TableHead className="text-gray-200 text-right min-w-[100px]">{isActivityRoundMode(conditionType) && targetType === 'nhom' ? 'Lượt HĐ' : 'IP / Tổng'}</TableHead><TableHead className="text-gray-200 text-right min-w-[100px]">Thưởng</TableHead><TableHead className="text-gray-200 min-w-[110px]">Ghi chú</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {targetType === 'nhom' && isActivityRoundMode(conditionType) ? [...groupedData].map((g) => ({ group: g, tier: calculateActivityRoundBonus(g.activityRounds).tier, remaining: getRemainingToNextActivityRoundTier(g.activityRounds) })).sort((a, b) => (b.tier?.bonusAmount || 0) - (a.tier?.bonusAmount || 0)).map(({ group, tier, remaining }, idx) => (
                        <TableRow key={group.maNhom} className={`${tier ? 'bg-white/5' : 'bg-red-500/5'} hover:bg-emerald-500/10`}>
                          <TableCell className="text-center text-white/40">{idx + 1}</TableCell>
                          <TableCell><span className="font-mono text-xs text-emerald-400 font-semibold">{group.maNhom}</span></TableCell>
                          <TableCell><span className="font-medium text-sm text-white/80">{group.leaderName || group.maNhom}</span></TableCell>
                          <TableCell className="text-center"><Badge variant="secondary" className="text-[10px]">{group.contractCount}</Badge></TableCell>
                          <TableCell className="text-right"><span className="font-bold text-orange-400">{group.activityRounds} lượt</span></TableCell>
                          <TableCell className="text-right">{tier ? <span className={`font-bold ${tier.bonusType === 'gift' ? 'text-pink-400' : tier.bonusType === 'percent' ? 'text-violet-400' : 'text-emerald-400'}`}>{formatBonus(tier, group.totalFYP)}</span> : <span className="text-white/20">—</span>}</TableCell>
                          <TableCell>{!tier && remaining !== null ? <span className="text-[10px] italic text-white/30">Cần thêm {remaining} lượt</span> : !tier ? <span className="text-[10px] italic text-white/30">Chưa đạt</span> : null}</TableCell>
                        </TableRow>
                      )) : targetType === 'nhom' ? [...groupedData].map((g) => ({ group: g, tier: calculateBonus(g.totalFYP).tier, remaining: getRemainingToNextTier(g.totalFYP) })).sort((a, b) => (b.tier?.bonusAmount || 0) - (a.tier?.bonusAmount || 0)).map(({ group, tier, remaining }, idx) => (
                        <TableRow key={group.maNhom} className={`${tier ? 'bg-white/5' : 'bg-red-500/5'} hover:bg-emerald-500/10`}>
                          <TableCell className="text-center text-white/40">{idx + 1}</TableCell>
                          <TableCell><span className="font-mono text-xs text-emerald-400 font-semibold">{group.maNhom}</span></TableCell>
                          <TableCell><span className="font-medium text-sm text-white/80">{group.leaderName || group.maNhom}</span></TableCell>
                          <TableCell className="text-center"><Badge variant="secondary" className="text-[10px]">{group.contractCount}</Badge></TableCell>
                          <TableCell className="text-right"><span className="font-bold text-emerald-400">{formatNumber(group.totalFYP)}</span></TableCell>
                          <TableCell className="text-right">{tier ? <span className={`font-bold ${tier.bonusType === 'gift' ? 'text-pink-400' : tier.bonusType === 'percent' ? 'text-violet-400' : 'text-emerald-400'}`}>{formatBonus(tier, group.totalFYP)}</span> : <span className="text-white/20">—</span>}</TableCell>
                          <TableCell>{!tier && remaining !== null ? <span className="text-[10px] italic text-white/30">Cần thêm {formatNumber(remaining)}</span> : !tier ? <span className="text-[10px] italic text-white/30">Chưa đạt</span> : null}</TableCell>
                        </TableRow>
                      )) : [...filteredContracts].map((c) => ({ contract: c, tier: conditionType === 'per_contract' ? calculateBonus(c.fyp).tier : null, remaining: conditionType === 'per_contract' ? getRemainingToNextTier(c.fyp) : null })).sort((a, b) => (b.tier?.bonusAmount || 0) - (a.tier?.bonusAmount || 0)).map(({ contract, tier, remaining }, idx) => (
                        <TableRow key={contract.id} className={`${tier ? 'bg-white/5' : 'bg-red-500/5'} hover:bg-emerald-500/10`}>
                          <TableCell className="text-center text-white/40">{idx + 1}</TableCell>
                          <TableCell><span className="font-mono text-xs text-emerald-400 font-semibold">{contract.maNhom}</span></TableCell>
                          <TableCell className="font-mono text-xs text-white/50">{contract.agentCode}</TableCell>
                          <TableCell><span className="font-medium text-sm text-white/80">{contract.agentName}</span></TableCell>
                          <TableCell className="text-center"><span className="text-xs text-white/40">{formatDate(contract.effectiveDate)}</span></TableCell>
                          <TableCell className="text-right"><span className="font-bold text-emerald-400">{formatNumber(contract.fyp)}</span></TableCell>
                          <TableCell className="text-right">{tier ? <span className={`font-bold ${tier.bonusType === 'gift' ? 'text-pink-400' : tier.bonusType === 'percent' ? 'text-violet-400' : 'text-emerald-400'}`}>{formatBonus(tier, contract.fyp)}</span> : <span className="text-white/20">—</span>}</TableCell>
                          <TableCell>{!tier && remaining !== null ? <span className="text-[10px] italic text-white/30">Cần thêm {formatNumber(remaining)}</span> : !tier ? <span className="text-[10px] italic text-white/30">Chưa đạt</span> : null}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Empty */}
        {filteredContracts.length === 0 && (
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm"><CardContent className="py-10 text-center"><Trophy className="w-12 h-12 mx-auto mb-3 text-emerald-500/20" /><p className="text-sm font-medium text-white/40">Thiết lập thi đua & nhấn &ldquo;Tính kết quả&rdquo;</p></CardContent></Card>
        )}

        {/* Source Data - collapsible */}
        <Card className="border-white/10 shadow-sm bg-white/5 backdrop-blur-sm">
          <CardHeader className="pb-2 pt-3 px-4">
            <button className="flex items-center justify-between w-full" onClick={() => setShowSourceData(!showSourceData)}>
              <div className="flex items-center gap-2"><Database className="w-4 h-4 text-white/50" /><CardTitle className="text-sm text-white/70">Dữ liệu nguồn</CardTitle><Badge variant="secondary" className="text-[10px]">{contracts.length} HĐ</Badge></div>
              {showSourceData ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
            </button>
          </CardHeader>
          {showSourceData && (
            <CardContent className="px-4 pb-3">
              {contracts.length === 0 ? (
                <div className="text-center py-6 text-white/30"><Database className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm font-medium">Chưa có dữ liệu</p><p className="text-xs">Nhấn &ldquo;Nhập Google Sheets&rdquo; để tải</p></div>
              ) : (
                <div className="rounded-lg border border-white/10 overflow-x-auto max-h-48 overflow-y-auto">
                  <Table><TableHeader><TableRow className="bg-white/5 sticky top-0"><TableHead className="w-[35px] text-center text-xs text-white/50">STT</TableHead><TableHead className="text-xs text-white/50">Nhóm</TableHead><TableHead className="text-xs text-white/50">Mã</TableHead><TableHead className="text-xs text-white/50">Họ tên</TableHead><TableHead className="text-xs text-white/50">Ngày HL</TableHead><TableHead className="text-xs text-white/50">IP</TableHead><TableHead className="w-[30px]"></TableHead></TableRow></TableHeader>
                    <TableBody>{contracts.map((c, idx) => (
                      <TableRow key={c.id} className="hover:bg-white/5 border-white/5"><TableCell className="text-center text-white/30 text-xs">{idx + 1}</TableCell><TableCell className="font-mono text-[10px] text-emerald-400 whitespace-nowrap">{c.maNhom}</TableCell><TableCell className="font-mono text-[10px] text-white/50 whitespace-nowrap">{c.agentCode}</TableCell><TableCell className="text-xs text-white/70 whitespace-nowrap">{c.agentName}</TableCell><TableCell className="text-[10px] text-white/40 whitespace-nowrap">{formatDate(c.effectiveDate)}</TableCell><TableCell className="font-semibold text-emerald-400 text-xs whitespace-nowrap">{formatNumber(c.fyp)}</TableCell><TableCell><Button variant="ghost" size="sm" onClick={() => handleDeleteContract(c.id)} className="h-5 w-5 p-0 text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></Button></TableCell></TableRow>
                    ))}</TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </main>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-[#1a1a2e] border-white/10">
          <DialogHeader><DialogTitle className="text-white">Nhập dữ liệu từ Google Sheets</DialogTitle><DialogDescription className="text-white/50">Dán liên kết CSV để nhập dữ liệu hợp đồng</DialogDescription></DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-1"><Label className="text-xs text-white/60">Liên kết CSV</Label><Input value={csvUrl} onChange={(e) => setCsvUrl(e.target.value)} className="font-mono text-xs h-8 bg-white/5 border-white/10 text-white" /></div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-xs text-amber-300"><p className="font-medium mb-1">Cột sử dụng:</p><ul className="space-y-0.5 ml-3 list-disc"><li><b>Ngày hiệu lực</b> → Ngày bắt đầu thi đua</li><li><b>PĐT + 10% ĐT</b> → IP</li></ul></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsImportDialogOpen(false)} className="h-8 border-white/10 bg-transparent text-white/70">Hủy</Button><Button onClick={handleImportFromUrl} disabled={isImporting} className="bg-emerald-600 hover:bg-emerald-700 h-8">{isImporting ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Đang nhập...</> : <><RefreshCw className="w-3 h-3 mr-1" /> Nhập dữ liệu</>}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contract Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-2xl bg-[#1a1a2e] border-white/10">
          <DialogHeader><DialogTitle className="text-white">Thêm hợp đồng mới</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label className="text-xs text-white/60">Số HĐ</Label><Input placeholder="10000017624818" value={newContract.contractNumber} onChange={(e) => setNewContract({ ...newContract, contractNumber: e.target.value })} className="h-8 text-xs bg-white/5 border-white/10 text-white" /></div><div className="space-y-1"><Label className="text-xs text-white/60">Mã đại lý</Label><Input placeholder="D104142435" value={newContract.agentCode} onChange={(e) => setNewContract({ ...newContract, agentCode: e.target.value })} className="h-8 text-xs bg-white/5 border-white/10 text-white" /></div></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label className="text-xs text-white/60">Tên TVV</Label><Input placeholder="Nguyễn Văn A" value={newContract.agentName} onChange={(e) => setNewContract({ ...newContract, agentName: e.target.value })} className="h-8 text-xs bg-white/5 border-white/10 text-white" /></div><div className="space-y-1"><Label className="text-xs text-white/60">Chức vụ</Label><Select value={newContract.position} onValueChange={(v) => setNewContract({ ...newContract, position: v })}><SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-white"><SelectValue placeholder="Chọn" /></SelectTrigger><SelectContent><SelectItem value="Tư vấn tài chính">TVV</SelectItem><SelectItem value="Trưởng nhóm">Trưởng nhóm</SelectItem><SelectItem value="Tiền trưởng nhóm">Tiền trưởng nhóm</SelectItem></SelectContent></Select></div></div>
            <div className="grid grid-cols-3 gap-3"><div className="space-y-1"><Label className="text-xs text-white/60">Ban</Label><Input value={newContract.ban} onChange={(e) => setNewContract({ ...newContract, ban: e.target.value })} className="h-8 text-xs bg-white/5 border-white/10 text-white" /></div><div className="space-y-1"><Label className="text-xs text-white/60">Nhóm</Label><Input value={newContract.nhom} onChange={(e) => setNewContract({ ...newContract, nhom: e.target.value })} className="h-8 text-xs bg-white/5 border-white/10 text-white" /></div><div className="space-y-1"><Label className="text-xs text-white/60">Mã nhóm</Label><Input value={newContract.maNhom} onChange={(e) => setNewContract({ ...newContract, maNhom: e.target.value })} className="h-8 text-xs bg-white/5 border-white/10 text-white" /></div></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label className="text-xs text-white/60">Ngày hiệu lực</Label><Input type="date" value={newContract.effectiveDate} onChange={(e) => setNewContract({ ...newContract, effectiveDate: e.target.value })} className="h-8 text-xs bg-white/5 border-white/10 text-white" /></div><div className="space-y-1"><Label className="text-xs text-white/60">Ngày phát hành</Label><Input type="date" value={newContract.issueDate} onChange={(e) => setNewContract({ ...newContract, issueDate: e.target.value })} className="h-8 text-xs bg-white/5 border-white/10 text-white" /></div></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label className="text-xs text-white/60">IP (VNĐ)</Label><Input type="number" value={newContract.fyp} onChange={(e) => setNewContract({ ...newContract, fyp: e.target.value })} className="h-8 text-xs bg-white/5 border-white/10 text-white" /></div><div className="space-y-1"><Label className="text-xs text-white/60">AFYP (VNĐ)</Label><Input type="number" value={newContract.afyp} onChange={(e) => setNewContract({ ...newContract, afyp: e.target.value })} className="h-8 text-xs bg-white/5 border-white/10 text-white" /></div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="h-8 border-white/10 bg-transparent text-white/70">Hủy</Button><Button onClick={handleCreateContract} className="bg-emerald-600 hover:bg-emerald-700 h-8">Tạo hợp đồng</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
