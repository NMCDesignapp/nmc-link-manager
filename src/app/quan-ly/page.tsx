'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft, Plus, Trash2, Download, Upload, Search, ArrowUpDown,
  LayoutDashboard, Users, DollarSign, FileText, UserCircle, Loader2,
  RefreshCw, CheckCircle2, X, FileSpreadsheet, ToggleLeft, ToggleRight,
  AlertTriangle, ChevronDown, ChevronRight, Network, Calculator,
  Calendar, TrendingUp, Hash, Settings, Link2, ExternalLink,
  Merge, Split, Target, BarChart3,
} from 'lucide-react';

// ==================== TYPES ====================
interface LeaderInfo {
  id: string; agentCode: string; agentName: string; position: string;
  ban: string; nhom: string; maNhom: string; salary: number;
  phone: string; email: string; note: string; startDate: string | null;
}

interface MonthlyRevenue {
  id: string; month: string; maNhom: string; nhom: string;
  agentCode: string; agentName: string; totalFYP: number;
  totalAFYP: number; contractCount: number; activityRounds: number; note: string;
}

interface Contract {
  id: string;
  stt: number;
  contractNumber: string;
  ban: string;
  maTruongBan: string;
  nhom: string;
  maBanNhom: string;
  maTruongBanNhom: string;
  maDL: string;
  agentCode: string;
  agentName: string;
  position: string;
  ngayBatDauLamViec: string | null;
  effectiveDate: string;
  issueDate: string;
  pdt10DT: number;
  fyp: number;
  nguonDuLieu: string;
  hopDongToChuc: string;
  dkDongPhi: string;
  phiDongThem: number;
  afypChuaTru10DT: number;
  afyp: number;
  ad: string;
  nhom2: string;
  ngayBatDauLamViec2: string | null;
  thangTD: number;
  namTD: number;
  thangHL: number;
  tinhLuot: number;
  tinhLuot3tr: number;
  maDaiLyTD: string;
  danhDauTVV: string;
  chucVu2: string;
  leaderAgentCode: string;
  recruiterCode: string;
  startDate: string | null;
  maNhom: string;
}

interface StaffMember {
  id: string; nhom: string; maNhom: string; agentCode: string;
  agentName: string; position: string; startDate: string | null;
}

interface Recruiter {
  id: string; nhom: string; agentCode: string; agentName: string;
  position: string; startDate: string | null;
}

// Merge range for spreadsheet
interface MergeRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

// KPI configuration
interface KPIConfig {
  id: string;
  label: string;
  dataSourceKey: string;
  field: string;
  calculation: 'sum' | 'average' | 'count' | 'min' | 'max';
  target?: number;
  color: 'emerald' | 'amber' | 'sky' | 'violet' | 'rose' | 'orange';
}

// KPI data source
interface KPIDataSource {
  key: string;
  label: string;
  data: Record<string, any>[];
  fields: { key: string; label: string; type: 'number' | 'string' }[];
}

const KPI_COLORS: Record<string, string> = {
  emerald: 'bg-emerald-700',
  amber: 'bg-amber-700',
  sky: 'bg-sky-700',
  violet: 'bg-violet-700',
  rose: 'bg-rose-700',
  orange: 'bg-orange-700',
};

// ==================== CONSTANTS ====================
type SheetKey = 'overview' | 'leaders' | 'recruiters' | 'revenue' | 'structure' | 'spreadsheet';
type RevenueSubKey = 'all' | '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12';

const MONTHS: { key: RevenueSubKey; label: string }[] = [
  { key: 'all', label: 'Cả năm' },
  { key: '01', label: 'Tháng 1' }, { key: '02', label: 'Tháng 2' },
  { key: '03', label: 'Tháng 3' }, { key: '04', label: 'Tháng 4' },
  { key: '05', label: 'Tháng 5' }, { key: '06', label: 'Tháng 6' },
  { key: '07', label: 'Tháng 7' }, { key: '08', label: 'Tháng 8' },
  { key: '09', label: 'Tháng 9' }, { key: '10', label: 'Tháng 10' },
  { key: '11', label: 'Tháng 11' }, { key: '12', label: 'Tháng 12' },
];

const SHEETS: { key: SheetKey; label: string; icon: React.ElementType; synced: boolean; hasSub?: boolean }[] = [
  { key: 'overview', label: 'Tổng quan', icon: LayoutDashboard, synced: false },
  { key: 'leaders', label: 'DS TB/TN', icon: Users, synced: false },
  { key: 'recruiters', label: 'DS Người TD', icon: UserCircle, synced: true },
  { key: 'revenue', label: 'Doanh thu', icon: DollarSign, synced: false, hasSub: true },
  { key: 'structure', label: 'Cấu trúc', icon: Network, synced: false },
  { key: 'spreadsheet', label: 'Trang tính', icon: Calculator, synced: false },
];

// Templates
const TEMPLATES: Record<string, { headers: string[]; sampleData: Record<string, string>[] }> = {
  leaders: {
    headers: ['Mã số', 'Họ tên', 'Chức vụ', 'Ban', 'Nhóm', 'Mã nhóm', 'Tiền/tháng', 'SĐT', 'Email', 'Ghi chú'],
    sampleData: [{ 'Mã số': 'TVV001', 'Họ tên': 'Nguyễn Văn A', 'Chức vụ': 'Trưởng nhóm', 'Ban': 'Ban A', 'Nhóm': 'Nhóm 1', 'Mã nhóm': 'NH01', 'Tiền/tháng': '5000000', 'SĐT': '0901234567', 'Email': 'a@email.com', 'Ghi chú': '' }],
  },
  revenue: {
    headers: ['Tháng', 'Mã nhóm', 'Nhóm', 'Mã TVV', 'Tên TVV', 'Tổng IP', 'Tổng AFYP', 'Số HĐ', 'Lượt HĐ', 'Ghi chú'],
    sampleData: [{ 'Tháng': '2026-06', 'Mã nhóm': 'NH01', 'Nhóm': 'Nhóm 1', 'Mã TVV': 'TVV001', 'Tên TVV': 'Nguyễn Văn A', 'Tổng IP': '15000000', 'Tổng AFYP': '20000000', 'Số HĐ': '5', 'Lượt HĐ': '8', 'Ghi chú': '' }],
  },
  contracts: {
    headers: ['STT', 'Ban', 'Mã trưởng ban', 'Nhóm', 'Mã Ban/Nhóm', 'Mã trưởng Ban/Nhóm', 'Mã ĐL', 'Tên', 'Chức vụ', 'Ngày bắt đầu làm việc', 'Số hợp đồng', 'Ngày hiệu lực', 'Ngày phát hành', 'PĐT + 10% ĐT', 'FYP', 'Nguồn dữ liệu', 'Hợp đồng tổ chức', 'ĐK ĐÓNG PHÍ', 'PHÍ ĐÓNG THÊM', 'AFYP chưa trừ 10% ĐT', 'AFYP', 'AD', 'NHÓM', 'NGÀY BẮT ĐẦU LÀM VIỆC', 'THÁNG TD', 'NĂM TD', 'THÁNG HL', 'TÍNH LƯỢT 3 tr', 'Mã đại lý tuyển dụng', 'ĐÁNH DẤU TVVm TUYỂN DỤNG QUÝ 1', 'Chức vụ'],
    sampleData: [{ 'STT': '1', 'Ban': 'Hiệp Tiến', 'Mã trưởng ban': 'D104132535', 'Nhóm': 'Nhiệt An', 'Mã Ban/Nhóm': 'U1041A3L6E', 'Mã trưởng Ban/Nhóm': 'D104132784', 'Mã ĐL': 'D104132784', 'Tên': 'Dương Thị Hồng Nga', 'Chức vụ': 'Trưởng nhóm', 'Ngày bắt đầu làm việc': '01/10/2017', 'Số hợp đồng': '10000017167449', 'Ngày hiệu lực': '01/11/2026', 'Ngày phát hành': '15/11/2026', 'PĐT + 10% ĐT': '12651118', 'FYP': '12651118', 'Nguồn dữ liệu': 'PH', 'Hợp đồng tổ chức': '', 'ĐK ĐÓNG PHÍ': 'Năm', 'PHÍ ĐÓNG THÊM': '75060', 'AFYP chưa trừ 10% ĐT': '12651118', 'AFYP': '12643612', 'AD': 'Trương Quốc Uy', 'NHÓM': 'Nhiệt An', 'NGÀY BẮT ĐẦU LÀM VIỆC': '01/10/2017', 'THÁNG TD': '10', 'NĂM TD': '2017', 'THÁNG HL': '1', 'TÍNH LƯỢT 3 tr': '12651118', 'Mã đại lý tuyển dụng': 'D104102154', 'ĐÁNH DẤU TVVm TUYỂN DỤNG QUÝ 1': '', 'Chức vụ': 'Trưởng nhóm' }],
  },
  staff: {
    headers: ['Mã số', 'Họ tên', 'Chức vụ', 'Nhóm', 'Mã nhóm', 'Ngày bắt đầu'],
    sampleData: [{ 'Mã số': 'TVV001', 'Họ tên': 'Nguyễn Văn A', 'Chức vụ': 'TVV', 'Nhóm': 'Nhóm 1', 'Mã nhóm': 'NH01', 'Ngày bắt đầu': '01/01/2026' }],
  },
  recruiters: {
    headers: ['Mã số', 'Họ tên', 'Chức vụ', 'Nhóm', 'Ngày bắt đầu'],
    sampleData: [{ 'Mã số': 'NTD001', 'Họ tên': 'Trần Thị B', 'Chức vụ': 'NTD', 'Nhóm': 'Nhóm 1', 'Ngày bắt đầu': '01/01/2026' }],
  },
};

// Contract columns matching CHI TIẾT PH.xlsx layout
const CONTRACT_COLUMNS = [
  { f: 'stt', l: 'STT', type: 'number' as const },
  { f: 'ban', l: 'Ban', type: 'text' as const },
  { f: 'maTruongBan', l: 'Mã trưởng ban', type: 'text' as const },
  { f: 'nhom', l: 'Nhóm', type: 'text' as const },
  { f: 'maBanNhom', l: 'Mã Ban/Nhóm', type: 'text' as const },
  { f: 'maTruongBanNhom', l: 'Mã trưởng Ban/Nhóm', type: 'text' as const },
  { f: 'maDL', l: 'Mã ĐL', type: 'text' as const },
  { f: 'agentName', l: 'Tên', type: 'text' as const },
  { f: 'position', l: 'Chức vụ', type: 'text' as const },
  { f: 'ngayBatDauLamViec', l: 'Ngày bắt đầu LV', type: 'date' as const },
  { f: 'contractNumber', l: 'Số hợp đồng', type: 'text' as const },
  { f: 'effectiveDate', l: 'Ngày hiệu lực', type: 'date' as const },
  { f: 'issueDate', l: 'Ngày phát hành', type: 'date' as const },
  { f: 'pdt10DT', l: 'PĐT + 10% ĐT', type: 'number' as const },
  { f: 'fyp', l: 'FYP', type: 'number' as const },
  { f: 'nguonDuLieu', l: 'Nguồn DL', type: 'text' as const },
  { f: 'hopDongToChuc', l: 'HĐ tổ chức', type: 'text' as const },
  { f: 'dkDongPhi', l: 'ĐK đóng phí', type: 'text' as const },
  { f: 'phiDongThem', l: 'Phí đóng thêm', type: 'number' as const },
  { f: 'afypChuaTru10DT', l: 'AFYP chưa trừ 10% ĐT', type: 'number' as const },
  { f: 'afyp', l: 'AFYP', type: 'number' as const },
  { f: 'ad', l: 'AD', type: 'text' as const },
  { f: 'nhom2', l: 'NHÓM', type: 'text' as const },
  { f: 'ngayBatDauLamViec2', l: 'Ngày bắt đầu LV 2', type: 'date' as const },
  { f: 'thangTD', l: 'Tháng TD', type: 'number' as const },
  { f: 'namTD', l: 'Năm TD', type: 'number' as const },
  { f: 'thangHL', l: 'Tháng HL', type: 'number' as const },
  { f: 'tinhLuot3tr', l: 'Tính lượt 3tr', type: 'number' as const },
  { f: 'maDaiLyTD', l: 'Mã ĐL tuyển dụng', type: 'text' as const },
  { f: 'danhDauTVV', l: 'Đánh dấu TVV', type: 'text' as const },
  { f: 'chucVu2', l: 'Chức vụ 2', type: 'text' as const },
];

// ==================== HELPERS ====================
function formatCurrency(n: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}
function formatNumber(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n);
}

// ==================== EDITABLE CELL ====================
function EditableCell({ value, onSave, type = 'text', className = '' }: {
  value: string | number; onSave: (val: any) => void; type?: 'text' | 'number' | 'date'; className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(String(value ?? ''));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setEditVal(String(value ?? '')); }, [value]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const handleSave = useCallback(() => {
    const finalVal = type === 'number' ? (parseFloat(editVal) || 0) : editVal;
    if (finalVal !== value) onSave(finalVal);
    setEditing(false);
  }, [editVal, value, type, onSave]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
        value={editVal}
        onChange={(e) => setEditVal(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
        className="w-full h-full px-1 py-0.5 text-xs bg-white text-black border-2 border-emerald-500 outline-none"
      />
    );
  }

  return (
    <div
      className={`cursor-pointer hover:bg-emerald-50 hover:outline hover:outline-1 hover:outline-emerald-300 px-1 py-0.5 min-h-[22px] text-gray-900 ${className}`}
      onDoubleClick={() => setEditing(true)}
      title="Nháy đúp để sửa"
    >
      {type === 'number' && typeof value === 'number'
        ? formatNumber(value)
        : type === 'date' && value
          ? new Date(String(value)).toLocaleDateString('vi-VN')
          : String(value || '—')}
    </div>
  );
}

// ==================== SETTINGS POPOVER ====================
function SettingsPopover({ sectionKey, sectionLabel }: { sectionKey: string; sectionLabel: string }) {
  const [link, setLink] = useState('');
  const [syncOn, setSyncOn] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const savedLink = localStorage.getItem(`nmc-link-${sectionKey}`) || '';
      const savedSync = localStorage.getItem(`nmc-sync-${sectionKey}`);
      setLink(savedLink);
      if (savedSync !== null) setSyncOn(savedSync === 'true');
    } catch {}
  }, [sectionKey, open]);

  const handleSave = useCallback(() => {
    try {
      localStorage.setItem(`nmc-link-${sectionKey}`, link);
      localStorage.setItem(`nmc-sync-${sectionKey}`, String(syncOn));
      toast({ title: 'Đã lưu cài đặt', description: `${sectionLabel}: ${link ? 'Đã thiết lập link' : 'Chưa có link'} • Đồng bộ: ${syncOn ? 'BẬT' : 'TẮT'}` });
    } catch {
      toast({ title: 'Lỗi lưu cài đặt', variant: 'destructive' });
    }
    setOpen(false);
  }, [link, syncOn, sectionKey, sectionLabel]);

  const hasLink = !!(localStorage.getItem(`nmc-link-${sectionKey}`));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={`h-8 px-2 text-xs ${hasLink ? 'text-emerald-300 hover:text-emerald-200' : 'text-gray-400 hover:text-gray-200'} hover:bg-emerald-800`}
          title="Cài đặt"
        >
          <Settings className="w-3.5 h-3.5" />
          {hasLink && <Link2 className="w-3 h-3 ml-1 text-emerald-400" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="bg-gray-900 border-emerald-700 w-80 p-3" align="end" sideOffset={4}>
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" /> Cài đặt: {sectionLabel}
          </h4>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Link nguồn (Google Sheets URL)</label>
            <div className="flex items-center gap-1">
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="h-7 text-xs bg-gray-800 border-gray-600 text-white placeholder-gray-500"
              />
              {link && (
                <a href={link} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 flex-shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Đồng bộ tự động</span>
            <button onClick={() => setSyncOn(!syncOn)} className="flex items-center">
              {syncOn
                ? <ToggleRight className="w-8 h-8 text-emerald-400 cursor-pointer" />
                : <ToggleLeft className="w-8 h-8 text-amber-400 cursor-pointer" />}
            </button>
          </div>
          <Button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs">
            Lưu cài đặt
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ==================== KPI SETTINGS POPOVER ====================
function KPISettingsPopover({ sectionKey, sectionLabel, dataSources, defaultConfigs }: {
  sectionKey: string; sectionLabel: string;
  dataSources: KPIDataSource[];
  defaultConfigs?: KPIConfig[];
}) {
  const [configs, setConfigs] = useState<KPIConfig[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`nmc-kpi-${sectionKey}`);
      if (saved) {
        setConfigs(JSON.parse(saved));
      } else if (defaultConfigs && defaultConfigs.length > 0) {
        setConfigs(defaultConfigs);
        localStorage.setItem(`nmc-kpi-${sectionKey}`, JSON.stringify(defaultConfigs));
      }
    } catch {}
  }, [sectionKey, open, defaultConfigs]);

  const saveConfigs = useCallback((newConfigs: KPIConfig[]) => {
    setConfigs(newConfigs);
    try {
      localStorage.setItem(`nmc-kpi-${sectionKey}`, JSON.stringify(newConfigs));
    } catch {}
  }, [sectionKey]);

  const firstSourceKey = dataSources[0]?.key || '';
  const firstFieldKey = dataSources[0]?.fields[0]?.key || '';

  const addConfig = useCallback(() => {
    const newConfig: KPIConfig = {
      id: `kpi-${Date.now()}`,
      label: 'KPI mới',
      dataSourceKey: firstSourceKey,
      field: firstFieldKey,
      calculation: 'sum',
      target: undefined,
      color: 'emerald',
    };
    saveConfigs([...configs, newConfig]);
  }, [configs, saveConfigs, firstSourceKey, firstFieldKey]);

  const updateConfig = useCallback((id: string, updates: Partial<KPIConfig>) => {
    saveConfigs(configs.map(c => c.id === id ? { ...c, ...updates } : c));
  }, [configs, saveConfigs]);

  const removeConfig = useCallback((id: string) => {
    saveConfigs(configs.filter(c => c.id !== id));
  }, [configs, saveConfigs]);

  // Calculate KPI values from the correct data source
  const calculateKPI = useCallback((config: KPIConfig): number => {
    const ds = dataSources.find(d => d.key === config.dataSourceKey);
    if (!ds) return 0;
    const values = ds.data
      .map(item => parseFloat(item[config.field]) || 0)
      .filter(v => !isNaN(v));

    if (values.length === 0) return 0;
    switch (config.calculation) {
      case 'sum': return values.reduce((a, b) => a + b, 0);
      case 'average': return values.reduce((a, b) => a + b, 0) / values.length;
      case 'count': return values.length;
      case 'min': return Math.min(...values);
      case 'max': return Math.max(...values);
      default: return 0;
    }
  }, [dataSources]);

  const formatKPIValue = (val: number): string => {
    if (Math.abs(val) >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} tỷ`;
    if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)} triệu`;
    if (Math.abs(val) >= 1_000) return formatNumber(Math.round(val));
    return val.toFixed(val % 1 === 0 ? 0 : 1);
  };

  // Get fields for a specific data source
  const getFieldsForSource = useCallback((sourceKey: string) => {
    const ds = dataSources.find(d => d.key === sourceKey);
    return ds ? ds.fields.filter(f => f.type === 'number') : [];
  }, [dataSources]);

  return (
    <div className="space-y-2">
      {/* KPI cards */}
      {configs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {configs.map(config => {
            const actual = calculateKPI(config);
            const pct = config.target ? Math.min((actual / config.target) * 100, 100) : undefined;
            const ds = dataSources.find(d => d.key === config.dataSourceKey);
            const fieldLabel = ds?.fields.find(f => f.key === config.field)?.label || config.field;
            const calcLabel = { sum: 'Tổng', average: 'TB', count: 'SL', min: 'Min', max: 'Max' }[config.calculation];
            const colorClass = KPI_COLORS[config.color] || 'bg-emerald-700';
            return (
              <div key={config.id} className={`${colorClass} rounded-lg p-2.5 border border-white/10`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white/60 text-[9px] font-bold">{config.label || fieldLabel}</p>
                  <span className="text-white/40 text-[8px]">{calcLabel} {fieldLabel}</span>
                </div>
                <p className="text-white text-sm font-extrabold truncate">{formatKPIValue(actual)}</p>
                {config.target && config.target > 0 && (
                  <div className="mt-1">
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-white/50">Mục tiêu: {formatKPIValue(config.target)}</span>
                      <span className={`font-bold ${pct && pct >= 100 ? 'text-emerald-300' : pct && pct >= 70 ? 'text-amber-300' : 'text-rose-300'}`}>{pct?.toFixed(0)}%</span>
                    </div>
                    <Progress value={pct || 0} className="h-1.5 mt-0.5 bg-emerald-900 [&>div]:bg-emerald-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Settings popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="h-7 px-2 text-[10px] text-gray-400 hover:text-gray-200 hover:bg-emerald-800"
            title="Cài đặt KPI"
          >
            <BarChart3 className="w-3 h-3" />
            <span className="ml-1">KPI</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="bg-gray-900 border-emerald-700 w-96 p-3 max-h-[500px] overflow-y-auto" align="start" sideOffset={4}>
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> KPI: {sectionLabel}
            </h4>
            <p className="text-[10px] text-gray-400">Tự động tính toán từ dữ liệu bảng. Thêm chỉ số KPI và đặt mục tiêu.</p>

            {configs.map(config => {
              const currentFields = getFieldsForSource(config.dataSourceKey);
              return (
                <div key={config.id} className="bg-gray-800 rounded-md p-2 space-y-1.5 border border-gray-700">
                  <div className="flex items-center gap-1">
                    <Input
                      value={config.label}
                      onChange={(e) => updateConfig(config.id, { label: e.target.value })}
                      className="h-6 text-xs bg-gray-700 border-gray-600 text-white flex-1"
                      placeholder="Tên KPI"
                    />
                    <Button variant="ghost" size="sm" onClick={() => removeConfig(config.id)} className="h-6 w-6 p-0 text-red-400 hover:text-red-300">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <select
                      value={config.dataSourceKey}
                      onChange={(e) => {
                        const newSourceKey = e.target.value;
                        const newFields = getFieldsForSource(newSourceKey);
                        updateConfig(config.id, { dataSourceKey: newSourceKey, field: newFields[0]?.key || '' });
                      }}
                      className="h-6 text-[10px] bg-gray-700 border border-gray-600 text-white rounded px-1"
                    >
                      {dataSources.map(ds => (
                        <option key={ds.key} value={ds.key}>{ds.label}</option>
                      ))}
                    </select>
                    <select
                      value={config.field}
                      onChange={(e) => updateConfig(config.id, { field: e.target.value })}
                      className="h-6 text-[10px] bg-gray-700 border border-gray-600 text-white rounded px-1"
                    >
                      {currentFields.map(f => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </select>
                    <select
                      value={config.calculation}
                      onChange={(e) => updateConfig(config.id, { calculation: e.target.value as KPIConfig['calculation'] })}
                      className="h-6 text-[10px] bg-gray-700 border border-gray-600 text-white rounded px-1"
                    >
                      <option value="sum">Tổng</option>
                      <option value="average">TB</option>
                      <option value="count">SL</option>
                      <option value="min">Min</option>
                      <option value="max">Max</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    <Input
                      type="number"
                      value={config.target || ''}
                      onChange={(e) => updateConfig(config.id, { target: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="h-6 text-xs bg-gray-700 border-gray-600 text-white flex-1"
                      placeholder="Mục tiêu (để trống = không có)"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400">Màu:</span>
                    {(['emerald', 'amber', 'sky', 'violet', 'rose', 'orange'] as const).map(c => (
                      <button
                        key={c}
                        onClick={() => updateConfig(config.id, { color: c })}
                        className={`w-5 h-5 rounded-full ${KPI_COLORS[c]} border-2 ${config.color === c ? 'border-white' : 'border-transparent'} hover:border-white/50 transition-colors`}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            <Button onClick={addConfig} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white h-7 text-xs">
              <Plus className="w-3 h-3 mr-1" /> Thêm chỉ số KPI
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ==================== SPREADSHEET COMPONENT ====================
const SPREADSHEET_ROWS = 50;
const SPREADSHEET_COLS = 26;
const COL_LABELS = Array.from({ length: SPREADSHEET_COLS }, (_, i) => String.fromCharCode(65 + i));

type CellValue = string;
type CellMap = Record<string, CellValue>;

function evaluateFormula(formula: string, cells: CellMap): string {
  if (!formula.startsWith('=')) return formula;
  const expr = formula.slice(1).trim().toUpperCase();

  // SUM function
  const sumMatch = expr.match(/^SUM\(([A-Z]\d+):([A-Z]\d+)\)$/);
  if (sumMatch) {
    const startCol = sumMatch[1][0], startRow = parseInt(sumMatch[1].slice(1));
    const endCol = sumMatch[2][0], endRow = parseInt(sumMatch[2].slice(1));
    let total = 0;
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol.charCodeAt(0); c <= endCol.charCodeAt(0); c++) {
        const val = parseFloat(cells[String.fromCharCode(c) + r] || '0');
        if (!isNaN(val)) total += val;
      }
    }
    return String(total);
  }

  // AVERAGE function
  const avgMatch = expr.match(/^AVERAGE\(([A-Z]\d+):([A-Z]\d+)\)$/);
  if (avgMatch) {
    const startCol = avgMatch[1][0], startRow = parseInt(avgMatch[1].slice(1));
    const endCol = avgMatch[2][0], endRow = parseInt(avgMatch[2].slice(1));
    let total = 0, count = 0;
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol.charCodeAt(0); c <= endCol.charCodeAt(0); c++) {
        const val = parseFloat(cells[String.fromCharCode(c) + r] || '0');
        if (!isNaN(val) && cells[String.fromCharCode(c) + r]) { total += val; count++; }
      }
    }
    return count > 0 ? String(Math.round((total / count) * 100) / 100) : '0';
  }

  // COUNT function
  const countMatch = expr.match(/^COUNT\(([A-Z]\d+):([A-Z]\d+)\)$/);
  if (countMatch) {
    const startCol = countMatch[1][0], startRow = parseInt(countMatch[1].slice(1));
    const endCol = countMatch[2][0], endRow = parseInt(countMatch[2].slice(1));
    let count = 0;
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol.charCodeAt(0); c <= endCol.charCodeAt(0); c++) {
        if (cells[String.fromCharCode(c) + r]) count++;
      }
    }
    return String(count);
  }

  // MAX function
  const maxMatch = expr.match(/^MAX\(([A-Z]\d+):([A-Z]\d+)\)$/);
  if (maxMatch) {
    const startCol = maxMatch[1][0], startRow = parseInt(maxMatch[1].slice(1));
    const endCol = maxMatch[2][0], endRow = parseInt(maxMatch[2].slice(1));
    let max = -Infinity;
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol.charCodeAt(0); c <= endCol.charCodeAt(0); c++) {
        const val = parseFloat(cells[String.fromCharCode(c) + r] || '0');
        if (!isNaN(val) && cells[String.fromCharCode(c) + r]) max = Math.max(max, val);
      }
    }
    return max === -Infinity ? '0' : String(max);
  }

  // MIN function
  const minMatch = expr.match(/^MIN\(([A-Z]\d+):([A-Z]\d+)\)$/);
  if (minMatch) {
    const startCol = minMatch[1][0], startRow = parseInt(minMatch[1].slice(1));
    const endCol = minMatch[2][0], endRow = parseInt(minMatch[2].slice(1));
    let min = Infinity;
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol.charCodeAt(0); c <= endCol.charCodeAt(0); c++) {
        const val = parseFloat(cells[String.fromCharCode(c) + r] || '0');
        if (!isNaN(val) && cells[String.fromCharCode(c) + r]) min = Math.min(min, val);
      }
    }
    return min === Infinity ? '0' : String(min);
  }

  // Cell reference math: =A1+B1, =A1*2, =A1+B1*C1
  try {
    const resolved = expr.replace(/([A-Z])(\d+)/g, (match) => {
      const v = parseFloat(cells[match] || '0');
      return isNaN(v) ? '0' : String(v);
    });
    // Safe eval for simple math
    const result = Function('"use strict"; return (' + resolved + ')')();
    if (typeof result === 'number' && isFinite(result)) return String(Math.round(result * 100) / 100);
    return formula;
  } catch {
    return formula;
  }
}

function SpreadsheetSheet() {
  const [cells, setCells] = useState<CellMap>({});
  const [merges, setMerges] = useState<MergeRange[]>([]);
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load cells and merges from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nmc-spreadsheet');
      if (saved) setCells(JSON.parse(saved));
      const savedMerges = localStorage.getItem('nmc-spreadsheet-merges');
      if (savedMerges) setMerges(JSON.parse(savedMerges));
    } catch {}
  }, []);

  // Save cells to localStorage
  useEffect(() => {
    try { localStorage.setItem('nmc-spreadsheet', JSON.stringify(cells)); } catch {}
  }, [cells]);

  // Save merges to localStorage
  useEffect(() => {
    try { localStorage.setItem('nmc-spreadsheet-merges', JSON.stringify(merges)); } catch {}
  }, [merges]);

  useEffect(() => {
    if (editingCell && inputRef.current) inputRef.current.focus();
  }, [editingCell]);

  // Parse cellId to {col, row} (0-indexed)
  const parseCellId = useCallback((cellId: string) => {
    const col = cellId.charCodeAt(0) - 65;
    const row = parseInt(cellId.slice(1)) - 1;
    return { col, row };
  }, []);

  // Check if a cell is the top-left of a merge
  const getCellMerge = useCallback((cellId: string): MergeRange | null => {
    const { col, row } = parseCellId(cellId);
    return merges.find(m => m.startRow === row && m.startCol === col) || null;
  }, [merges, parseCellId]);

  // Check if a cell is hidden by a merge
  const isCellHidden = useCallback((cellId: string): boolean => {
    const { col, row } = parseCellId(cellId);
    return merges.some(m =>
      row >= m.startRow && row <= m.endRow &&
      col >= m.startCol && col <= m.endCol &&
      !(row === m.startRow && col === m.startCol)
    );
  }, [merges, parseCellId]);

  // Get rowSpan/colSpan for a cell
  const getCellSpan = useCallback((cellId: string): { rowSpan?: number; colSpan?: number } => {
    const merge = getCellMerge(cellId);
    if (!merge) return {};
    return {
      rowSpan: merge.endRow - merge.startRow + 1,
      colSpan: merge.endCol - merge.startCol + 1,
    };
  }, [getCellMerge]);

  // Check if a cell is in the selection range
  const isCellSelected = useCallback((cellId: string): boolean => {
    if (!selectionStart) return false;
    const end = selectionEnd || selectionStart;
    const { col: sc, row: sr } = parseCellId(selectionStart);
    const { col: ec, row: er } = parseCellId(end);
    const { col, row } = parseCellId(cellId);
    const minCol = Math.min(sc, ec), maxCol = Math.max(sc, ec);
    const minRow = Math.min(sr, er), maxRow = Math.max(sr, er);
    return col >= minCol && col <= maxCol && row >= minRow && row <= maxRow;
  }, [selectionStart, selectionEnd, parseCellId]);

  // Merge selected cells
  const handleMergeCells = useCallback(() => {
    if (!selectionStart || !selectionEnd) {
      toast({ title: 'Chọn vùng ô trước', description: 'Click ô đầu → Shift+Click ô cuối', variant: 'destructive' });
      return;
    }
    const { col: sc, row: sr } = parseCellId(selectionStart);
    const { col: ec, row: er } = parseCellId(selectionEnd);
    const newMerge: MergeRange = {
      startRow: Math.min(sr, er),
      startCol: Math.min(sc, ec),
      endRow: Math.max(sr, er),
      endCol: Math.max(sc, ec),
    };
    // Check if already merged
    const overlaps = merges.some(m =>
      m.startRow <= newMerge.endRow && m.endRow >= newMerge.startRow &&
      m.startCol <= newMerge.endCol && m.endCol >= newMerge.startCol
    );
    if (overlaps) {
      toast({ title: 'Vùng đã được gộp', description: 'Tách ô trước khi gộp lại', variant: 'destructive' });
      return;
    }
    setMerges(prev => [...prev, newMerge]);
    setSelectionStart(null);
    setSelectionEnd(null);
    toast({ title: 'Đã gộp ô', description: `${String.fromCharCode(65 + newMerge.startCol)}${newMerge.startRow + 1}:${String.fromCharCode(65 + newMerge.endCol)}${newMerge.endRow + 1}` });
  }, [selectionStart, selectionEnd, merges, parseCellId]);

  // Unmerge cells
  const handleUnmergeCells = useCallback(() => {
    if (!activeCell) return;
    const merge = getCellMerge(activeCell);
    if (!merge) {
      toast({ title: 'Ô này không phải ô gộp', variant: 'destructive' });
      return;
    }
    setMerges(prev => prev.filter(m => m !== merge));
    toast({ title: 'Đã tách ô' });
  }, [activeCell, getCellMerge]);

  const getDisplayValue = (cellId: string) => {
    const raw = cells[cellId] || '';
    if (raw.startsWith('=')) return evaluateFormula(raw, cells);
    return raw;
  };

  const handleCellSave = () => {
    if (!editingCell) return;
    setCells(prev => ({ ...prev, [editingCell]: editVal }));
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { handleCellSave(); }
    else if (e.key === 'Escape') { setEditingCell(null); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      handleCellSave();
      if (activeCell) {
        const col = activeCell[0].charCodeAt(0);
        const row = activeCell.slice(1);
        const nextCol = String.fromCharCode(col + 1);
        if (col < 65 + SPREADSHEET_COLS - 1) setActiveCell(nextCol + row);
      }
    }
  };

  const clearSheet = () => {
    if (confirm('Xóa toàn bộ trang tính?')) { setCells({}); setMerges([]); }
  };

  const activeCellValue = editingCell ? editVal : (activeCell ? (cells[activeCell] || '') : '');

  return (
    <div className="flex flex-col h-full">
      {/* Formula bar */}
      <div className="flex items-center gap-2 mb-2 bg-gray-800 p-2 rounded-md">
        <span className="text-gray-300 text-xs font-mono min-w-[40px] text-center">{activeCell || '—'}</span>
        <span className="text-gray-500 text-xs">fx</span>
        <input
          ref={inputRef}
          value={editingCell ? editVal : activeCellValue}
          onChange={(e) => { if (editingCell) setEditVal(e.target.value); }}
          onFocus={() => { if (activeCell && !editingCell) { setEditingCell(activeCell); setEditVal(cells[activeCell] || ''); } }}
          onBlur={handleCellSave}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-gray-700 text-white text-xs px-2 py-1 border border-gray-600 outline-none focus:border-emerald-500"
          placeholder="Nhập giá trị hoặc công thức (vd: =SUM(A1:A10))"
        />
        <Button onClick={clearSheet} variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-7 text-xs px-2">Xóa hết</Button>
      </div>

      {/* Quick functions toolbar */}
      <div className="flex items-center gap-1 mb-2 flex-wrap">
        {[
          { label: 'SUM', fn: 'SUM(A1:A10)' },
          { label: 'AVG', fn: 'AVERAGE(A1:A10)' },
          { label: 'COUNT', fn: 'COUNT(A1:A10)' },
          { label: 'MAX', fn: 'MAX(A1:A10)' },
          { label: 'MIN', fn: 'MIN(A1:A10)' },
        ].map(f => (
          <button
            key={f.label}
            onClick={() => { if (activeCell) { setEditingCell(activeCell); setEditVal('=' + f.fn); } }}
            className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold rounded"
          >
            {f.label}
          </button>
        ))}
        <div className="border-l border-gray-600 h-4 mx-1" />
        <button
          onClick={handleMergeCells}
          className="px-2 py-0.5 bg-violet-700 hover:bg-violet-600 text-white text-[10px] font-bold rounded flex items-center gap-1"
          title="Gộp các ô đã chọn (Click → Shift+Click)"
        >
          <Merge className="w-3 h-3" /> Gộp ô
        </button>
        <button
          onClick={handleUnmergeCells}
          className="px-2 py-0.5 bg-amber-700 hover:bg-amber-600 text-white text-[10px] font-bold rounded flex items-center gap-1"
          title="Tách ô gộp tại ô đang chọn"
        >
          <Split className="w-3 h-3" /> Tách ô
        </button>
        <span className="text-gray-400 text-[10px] ml-2">Chọn ô → nhấn nút hàm → sửa range → Enter • Click+Shift để chọn vùng gộp</span>
      </div>

      {/* Selection info */}
      {selectionStart && selectionEnd && (
        <div className="mb-2 px-2 py-1 bg-violet-900/40 border border-violet-600 rounded text-[10px] text-violet-200">
          Đã chọn: {selectionStart}:{selectionEnd} — Nhấn "Gộp ô" để gộp
        </div>
      )}

      {/* Spreadsheet grid */}
      <div className="flex-1 overflow-auto border border-gray-600 bg-white">
        <table className="border-collapse w-max">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="bg-gray-700 text-gray-300 text-[10px] font-bold w-[40px] min-w-[40px] border border-gray-600 sticky left-0 z-20">#</th>
              {COL_LABELS.map(col => (
                <th key={col} className="bg-gray-700 text-gray-300 text-[10px] font-bold min-w-[80px] border border-gray-600 px-1 py-0.5">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: SPREADSHEET_ROWS }, (_, rowIdx) => {
              const rowNum = rowIdx + 1;
              return (
                <tr key={rowNum}>
                  <td className="bg-gray-100 text-gray-500 text-[10px] text-center border border-gray-300 font-mono sticky left-0">{rowNum}</td>
                  {COL_LABELS.map(col => {
                    const cellId = col + rowNum;
                    // Skip hidden cells (part of a merge but not top-left)
                    if (isCellHidden(cellId)) return null;

                    const isActive = activeCell === cellId;
                    const isEditing = editingCell === cellId;
                    const display = getDisplayValue(cellId);
                    const isFormula = (cells[cellId] || '').startsWith('=');
                    const isSelected = isCellSelected(cellId);
                    const isMerged = !!getCellMerge(cellId);
                    const span = getCellSpan(cellId);

                    return (
                      <td
                        key={cellId}
                        rowSpan={span.rowSpan}
                        colSpan={span.colSpan}
                        className={`border border-gray-300 px-1 py-0 text-[11px] cursor-cell min-w-[80px] ${
                          isActive ? 'outline outline-2 outline-emerald-500 bg-emerald-50' : ''
                        } ${isSelected && !isActive ? 'bg-violet-100 outline outline-1 outline-violet-400' : ''
                        } ${!isActive && !isSelected ? 'hover:bg-gray-50' : ''
                        } ${isFormula ? 'text-blue-800 font-medium' : 'text-gray-900'
                        } ${isMerged ? 'bg-emerald-50 border-emerald-400' : ''}`}
                        onClick={(e) => {
                          if (e.shiftKey && selectionStart) {
                            setSelectionEnd(cellId);
                          } else {
                            setSelectionStart(cellId);
                            setSelectionEnd(null);
                          }
                          setActiveCell(cellId);
                          setEditingCell(null);
                        }}
                        onDoubleClick={() => { setActiveCell(cellId); setEditingCell(cellId); setEditVal(cells[cellId] || ''); }}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            value={editVal}
                            onChange={(e) => setEditVal(e.target.value)}
                            onBlur={handleCellSave}
                            onKeyDown={handleKeyDown}
                            className="w-full h-full px-0 py-0 text-[11px] bg-white text-black border-none outline-none"
                          />
                        ) : (
                          <span className="block truncate">{display}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="text-gray-400 text-[10px] mt-1">Nháy đúp để sửa ô • Dùng = để nhập công thức • Click+Shift để chọn vùng • Gộp/Tách ô • Dữ liệu lưu trong trình duyệt</div>
    </div>
  );
}

// ==================== MAIN PAGE ====================
export default function QuanLyPage() {
  const router = useRouter();
  const [activeSheet, setActiveSheet] = useState<SheetKey>('overview');
  const [revenueSub, setRevenueSub] = useState<RevenueSubKey>('all');
  const [revenueExpanded, setRevenueExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [syncEnabled, setSyncEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      try { const s = localStorage.getItem('nmc-sync-enabled'); return s !== null ? s === 'true' : true; } catch { return true; }
    }
    return true;
  });

  // Data
  const [leaders, setLeaders] = useState<LeaderInfo[]>([]);
  const [revenue, setRevenue] = useState<MonthlyRevenue[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Per-section settings state
  const [sectionLinks, setSectionLinks] = useState<Record<string, string>>({});
  const [sectionSyncs, setSectionSyncs] = useState<Record<string, boolean>>({});
  const [settingsVersion, setSettingsVersion] = useState(0);

  // Persist sync preference
  useEffect(() => {
    try { localStorage.setItem('nmc-sync-enabled', String(syncEnabled)); } catch {}
  }, [syncEnabled]);

  // Load section links & syncs from localStorage
  useEffect(() => {
    try {
      const links: Record<string, string> = {};
      const syncs: Record<string, boolean> = {};
      const allKeys = ['leaders', 'recruiters', 'revenue', 'structure', 'spreadsheet',
        'revenue-01', 'revenue-02', 'revenue-03', 'revenue-04', 'revenue-05', 'revenue-06',
        'revenue-07', 'revenue-08', 'revenue-09', 'revenue-10', 'revenue-11', 'revenue-12', 'revenue-all'];
      allKeys.forEach(key => {
        const l = localStorage.getItem(`nmc-link-${key}`);
        if (l) links[key] = l;
        const s = localStorage.getItem(`nmc-sync-${key}`);
        if (s !== null) syncs[key] = s === 'true';
      });
      setSectionLinks(links);
      setSectionSyncs(syncs);
    } catch {}
  }, [settingsVersion]);

  const refreshSettings = useCallback(() => setSettingsVersion(v => v + 1), []);
  const hasSectionLink = useCallback((key: string) => !!sectionLinks[key], [sectionLinks]);
  const getSectionSync = useCallback((key: string) => sectionSyncs[key] !== false, [sectionSyncs]);

  // Fetch
  const fetchLeaders = useCallback(async () => {
    try { const r = await fetch('/api/leaders'); if (r.ok) setLeaders(await r.json()); } catch {}
  }, []);
  const fetchRevenue = useCallback(async () => {
    try { const r = await fetch('/api/revenue'); if (r.ok) setRevenue(await r.json()); } catch {}
  }, []);
  const fetchContracts = useCallback(async () => {
    try { const r = await fetch('/api/contracts'); if (r.ok) setContracts(await r.json()); } catch {}
  }, []);
  const fetchStaff = useCallback(async () => {
    try { const r = await fetch('/api/staff'); if (r.ok) setStaff(await r.json()); } catch {}
  }, []);
  const fetchRecruiters = useCallback(async () => {
    try { const r = await fetch('/api/recruiters'); if (r.ok) setRecruiters(await r.json()); } catch {}
  }, []);

  const loadSheet = useCallback((sheet: SheetKey) => {
    setIsLoading(true);
    const loaders: Record<SheetKey, () => Promise<void>> = {
      overview: async () => { await Promise.all([fetchLeaders(), fetchRevenue(), fetchContracts(), fetchStaff(), fetchRecruiters()]); },
      leaders: fetchLeaders,
      recruiters: fetchRecruiters,
      revenue: async () => { await Promise.all([fetchRevenue(), fetchContracts()]); },
      structure: async () => { await Promise.all([fetchLeaders(), fetchStaff()]); },
      spreadsheet: async () => {},
    };
    loaders[sheet]().finally(() => setIsLoading(false));
  }, [fetchLeaders, fetchRevenue, fetchContracts, fetchStaff, fetchRecruiters]);

  useEffect(() => { loadSheet(activeSheet); }, [activeSheet, loadSheet]);

  // ========== CRUD: Leaders ==========
  const updateLeader = useCallback(async (id: string, field: string, value: any) => {
    try { const r = await fetch(`/api/leaders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }) }); if (r.ok) setLeaders(p => p.map(l => l.id === id ? { ...l, [field]: value } : l)); } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, []);
  const addLeader = useCallback(async () => {
    try { const r = await fetch('/api/leaders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentCode: 'NEW_' + Date.now(), agentName: 'Chưa nhập' }) }); if (r.ok) { const n = await r.json(); setLeaders(p => [n, ...p]); toast({ title: 'Đã thêm' }); } } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, []);
  const deleteLeader = useCallback(async (id: string) => {
    if (!confirm('Xóa?')) return; try { const r = await fetch(`/api/leaders/${id}`, { method: 'DELETE' }); if (r.ok) { setLeaders(p => p.filter(l => l.id !== id)); toast({ title: 'Đã xóa' }); } } catch {}
  }, []);

  // ========== CRUD: Revenue ==========
  const updateRevenue = useCallback(async (id: string, field: string, value: any) => {
    try { const r = await fetch(`/api/revenue/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }) }); if (r.ok) setRevenue(p => p.map(rv => rv.id === id ? { ...rv, [field]: value } : rv)); } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, []);
  const addRevenue = useCallback(async () => {
    const month = new Date().toISOString().slice(0, 7);
    try { const r = await fetch('/api/revenue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ month, agentName: 'Chưa nhập' }) }); if (r.ok) { const n = await r.json(); setRevenue(p => [n, ...p]); toast({ title: 'Đã thêm' }); } } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, []);
  const deleteRevenue = useCallback(async (id: string) => {
    if (!confirm('Xóa?')) return; try { const r = await fetch(`/api/revenue/${id}`, { method: 'DELETE' }); if (r.ok) { setRevenue(p => p.filter(rv => rv.id !== id)); toast({ title: 'Đã xóa' }); } } catch {}
  }, []);

  // ========== CRUD: Contracts ==========
  const updateContract = useCallback(async (id: string, field: string, value: any) => {
    try { const r = await fetch(`/api/contracts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }) }); if (r.ok) setContracts(p => p.map(c => c.id === id ? { ...c, [field]: value } : c)); } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, []);
  const addContract = useCallback(async () => {
    try {
      const now = new Date().toISOString().slice(0, 10);
      const r = await fetch('/api/contracts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stt: 0, contractNumber: 'HD_' + Date.now(), agentCode: '', agentName: 'Chưa nhập',
          position: '', ban: '', maTruongBan: '', nhom: '', maBanNhom: '',
          maTruongBanNhom: '', maDL: '', maNhom: '', leaderAgentCode: '',
          ngayBatDauLamViec: null, effectiveDate: now, issueDate: now,
          pdt10DT: 0, fyp: 0, nguonDuLieu: '', hopDongToChuc: '', dkDongPhi: '',
          phiDongThem: 0, afypChuaTru10DT: 0, afyp: 0, ad: '', nhom2: '',
          ngayBatDauLamViec2: null, thangTD: 0, namTD: 0, thangHL: 0,
          tinhLuot: 0, tinhLuot3tr: 0, maDaiLyTD: '', danhDauTVV: '',
          chucVu2: '', recruiterCode: '', startDate: null,
        })
      });
      if (r.ok) { const n = await r.json(); setContracts(p => [n, ...p]); toast({ title: 'Đã thêm' }); }
    } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, []);
  const deleteContract = useCallback(async (id: string) => {
    if (!confirm('Xóa?')) return; try { const r = await fetch(`/api/contracts/${id}`, { method: 'DELETE' }); if (r.ok) { setContracts(p => p.filter(c => c.id !== id)); toast({ title: 'Đã xóa' }); } } catch {}
  }, []);

  // ========== CRUD: Staff ==========
  const updateStaffMember = useCallback(async (id: string, field: string, value: any) => {
    try { const r = await fetch(`/api/staff/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }) }); if (r.ok) setStaff(p => p.map(s => s.id === id ? { ...s, [field]: value } : s)); } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, []);
  const addStaffMember = useCallback(async () => {
    try { const r = await fetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentCode: 'NEW_' + Date.now(), agentName: 'Chưa nhập' }) }); if (r.ok) { const n = await r.json(); setStaff(p => [n, ...p]); toast({ title: 'Đã thêm' }); } } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, []);
  const deleteStaffMember = useCallback(async (id: string) => {
    if (!confirm('Xóa?')) return; try { const r = await fetch(`/api/staff/${id}`, { method: 'DELETE' }); if (r.ok) { setStaff(p => p.filter(s => s.id !== id)); toast({ title: 'Đã xóa' }); } } catch {}
  }, []);

  // ========== CRUD: Recruiters ==========
  const updateRecruiter = useCallback(async (id: string, field: string, value: any) => {
    try { const r = await fetch(`/api/recruiters/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }) }); if (r.ok) setRecruiters(p => p.map(rc => rc.id === id ? { ...rc, [field]: value } : rc)); } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, []);
  const addRecruiter = useCallback(async () => {
    try { const r = await fetch('/api/recruiters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentCode: 'NTD_' + Date.now(), agentName: 'Chưa nhập' }) }); if (r.ok) { const n = await r.json(); setRecruiters(p => [n, ...p]); toast({ title: 'Đã thêm' }); } } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, []);
  const deleteRecruiter = useCallback(async (id: string) => {
    if (!confirm('Xóa?')) return; try { const r = await fetch(`/api/recruiters/${id}`, { method: 'DELETE' }); if (r.ok) { setRecruiters(p => p.filter(rc => rc.id !== id)); toast({ title: 'Đã xóa' }); } } catch {}
  }, []);

  // ========== Download Template (server-side) ==========
  const handleDownloadTemplate = useCallback((sheetName: string) => {
    try {
      const template = TEMPLATES[sheetName];
      if (!template) { toast({ title: 'Lỗi', description: 'Không có mẫu', variant: 'destructive' }); return; }
      window.open(`/api/quan-ly/template?type=${sheetName}`, '_blank');
      toast({ title: 'Đang tải mẫu...', description: `Mẫu ${sheetName}` });
    } catch (err) {
      console.error('[handleDownloadTemplate] Error:', err);
      toast({ title: 'Lỗi tải mẫu', description: String(err), variant: 'destructive' });
    }
  }, []);

  // ========== Export (server-side) ==========
  const handleExport = useCallback(async (sheetName: string) => {
    try {
      let data: any[] = [];
      if (sheetName === 'leaders') data = leaders.map(l => ({ 'Mã số': l.agentCode, 'Họ tên': l.agentName, 'Chức vụ': l.position, 'Ban': l.ban, 'Nhóm': l.nhom, 'Mã nhóm': l.maNhom, 'Tiền/tháng': l.salary, 'SĐT': l.phone, 'Email': l.email, 'Ghi chú': l.note }));
      else if (sheetName === 'revenue') data = revenue.map(r => ({ 'Tháng': r.month, 'Mã nhóm': r.maNhom, 'Nhóm': r.nhom, 'Mã TVV': r.agentCode, 'Tên TVV': r.agentName, 'Tổng IP': r.totalFYP, 'Tổng AFYP': r.totalAFYP, 'Số HĐ': r.contractCount, 'Lượt HĐ': r.activityRounds, 'Ghi chú': r.note }));
      else if (sheetName === 'contracts') data = contracts.map(c => ({ 'STT': c.stt, 'Ban': c.ban, 'Mã trưởng ban': c.maTruongBan, 'Nhóm': c.nhom, 'Mã Ban/Nhóm': c.maBanNhom, 'Mã trưởng Ban/Nhóm': c.maTruongBanNhom, 'Mã ĐL': c.maDL, 'Tên': c.agentName, 'Chức vụ': c.position, 'Ngày bắt đầu làm việc': c.ngayBatDauLamViec ? new Date(c.ngayBatDauLamViec).toLocaleDateString('vi-VN') : '', 'Số hợp đồng': c.contractNumber, 'Ngày hiệu lực': new Date(c.effectiveDate).toLocaleDateString('vi-VN'), 'Ngày phát hành': new Date(c.issueDate).toLocaleDateString('vi-VN'), 'PĐT + 10% ĐT': c.pdt10DT, 'FYP': c.fyp, 'Nguồn dữ liệu': c.nguonDuLieu, 'Hợp đồng tổ chức': c.hopDongToChuc, 'ĐK ĐÓNG PHÍ': c.dkDongPhi, 'PHÍ ĐÓNG THÊM': c.phiDongThem, 'AFYP chưa trừ 10% ĐT': c.afypChuaTru10DT, 'AFYP': c.afyp, 'AD': c.ad, 'NHÓM': c.nhom2, 'NGÀY BẮT ĐẦU LÀM VIỆC': c.ngayBatDauLamViec2 ? new Date(c.ngayBatDauLamViec2).toLocaleDateString('vi-VN') : '', 'THÁNG TD': c.thangTD, 'NĂM TD': c.namTD, 'THÁNG HL': c.thangHL, 'TÍNH LƯỢT 3 tr': c.tinhLuot3tr, 'Mã đại lý tuyển dụng': c.maDaiLyTD, 'ĐÁNH DẤU TVVm TUYỂN DỤNG QUÝ 1': c.danhDauTVV, 'Chức vụ': c.chucVu2 }));
      else if (sheetName === 'staff') data = staff.map(s => ({ 'Mã số': s.agentCode, 'Họ tên': s.agentName, 'Chức vụ': s.position, 'Nhóm': s.nhom, 'Mã nhóm': s.maNhom, 'Ngày bắt đầu': s.startDate ? new Date(s.startDate).toLocaleDateString('vi-VN') : '' }));
      else if (sheetName === 'recruiters') data = recruiters.map(r => ({ 'Mã số': r.agentCode, 'Họ tên': r.agentName, 'Chức vụ': r.position, 'Nhóm': r.nhom, 'Ngày bắt đầu': r.startDate ? new Date(r.startDate).toLocaleDateString('vi-VN') : '' }));

      if (data.length === 0) { toast({ title: 'Không có dữ liệu', variant: 'destructive' }); return; }

      const res = await fetch('/api/quan-ly/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetName, data }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errData.error || 'Export failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Xuất Excel thành công' });
    } catch (err) {
      console.error('[handleExport] Error:', err);
      toast({ title: 'Lỗi xuất Excel', description: String(err), variant: 'destructive' });
    }
  }, [leaders, revenue, contracts, staff, recruiters]);

  // ========== Import ==========
  const handleImport = useCallback(async (sheetName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(await file.arrayBuffer());
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      if (!data.length) { toast({ title: 'File trống', variant: 'destructive' }); e.target.value = ''; return; }

      if (sheetName === 'leaders') {
        const rows = data.map((r: any) => ({ agentCode: String(r['Mã số'] || r['agentCode'] || ''), agentName: String(r['Họ tên'] || r['agentName'] || ''), position: String(r['Chức vụ'] || r['position'] || ''), ban: String(r['Ban'] || r['ban'] || ''), nhom: String(r['Nhóm'] || r['nhom'] || ''), maNhom: String(r['Mã nhóm'] || r['maNhom'] || ''), salary: parseFloat(r['Tiền/tháng'] || r['salary'] || 0) || 0, phone: String(r['SĐT'] || r['phone'] || ''), email: String(r['Email'] || r['email'] || ''), note: String(r['Ghi chú'] || r['note'] || '') })).filter(r => r.agentCode || r.agentName);
        for (const row of rows) await fetch('/api/leaders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) });
        fetchLeaders();
      } else if (sheetName === 'revenue') {
        const rows = data.map((r: any) => ({ month: String(r['Tháng'] || r['month'] || ''), maNhom: String(r['Mã nhóm'] || r['maNhom'] || ''), nhom: String(r['Nhóm'] || r['nhom'] || ''), agentCode: String(r['Mã TVV'] || r['agentCode'] || ''), agentName: String(r['Tên TVV'] || r['agentName'] || ''), totalFYP: parseFloat(r['Tổng IP'] || r['totalFYP'] || 0) || 0, totalAFYP: parseFloat(r['Tổng AFYP'] || r['totalAFYP'] || 0) || 0, contractCount: parseInt(r['Số HĐ'] || r['contractCount'] || 0) || 0, activityRounds: parseInt(r['Lượt HĐ'] || r['activityRounds'] || 0) || 0, note: String(r['Ghi chú'] || r['note'] || '') }));
        await fetch('/api/revenue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rows) });
        fetchRevenue();
      } else if (sheetName === 'contracts') {
        for (const r of data) {
          const row = r as any;
          await fetch('/api/contracts', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stt: parseInt(row['STT'] || row['stt'] || 0) || 0,
              ban: String(row['Ban'] || row['ban'] || ''),
              maTruongBan: String(row['Mã trưởng ban'] || row['maTruongBan'] || ''),
              nhom: String(row['Nhóm'] || row['nhom'] || ''),
              maBanNhom: String(row['Mã Ban/Nhóm'] || row['maBanNhom'] || ''),
              maTruongBanNhom: String(row['Mã trưởng Ban/Nhóm'] || row['maTruongBanNhom'] || ''),
              maDL: String(row['Mã ĐL'] || row['maDL'] || ''),
              agentCode: String(row['Mã TVV'] || row['agentCode'] || row['Mã ĐL'] || ''),
              agentName: String(row['Tên'] || row['Họ tên'] || row['agentName'] || ''),
              position: String(row['Chức vụ'] || row['position'] || ''),
              ngayBatDauLamViec: row['Ngày bắt đầu làm việc'] || row['ngayBatDauLamViec'] || null,
              contractNumber: String(row['Số hợp đồng'] || row['Số HĐ'] || row['contractNumber'] || 'HD_' + Date.now()),
              effectiveDate: row['Ngày hiệu lực'] || row['effectiveDate'] || new Date().toISOString().slice(0, 10),
              issueDate: row['Ngày phát hành'] || row['Ngày cấp'] || row['issueDate'] || null,
              pdt10DT: parseFloat(row['PĐT + 10% ĐT'] || row['pdt10DT'] || 0) || 0,
              fyp: parseFloat(row['FYP'] || row['IP'] || row['fyp'] || 0) || 0,
              nguonDuLieu: String(row['Nguồn dữ liệu'] || row['nguonDuLieu'] || ''),
              hopDongToChuc: String(row['Hợp đồng tổ chức'] || row['hopDongToChuc'] || ''),
              dkDongPhi: String(row['ĐK ĐÓNG PHÍ'] || row['dkDongPhi'] || ''),
              phiDongThem: parseFloat(row['PHÍ ĐÓNG THÊM'] || row['phiDongThem'] || 0) || 0,
              afypChuaTru10DT: parseFloat(row['AFYP chưa trừ 10% ĐT'] || row['afypChuaTru10DT'] || 0) || 0,
              afyp: parseFloat(row['AFYP'] || row['afyp'] || 0) || 0,
              ad: String(row['AD'] || row['ad'] || ''),
              nhom2: String(row['NHÓM'] || row['nhom2'] || ''),
              ngayBatDauLamViec2: row['NGÀY BẮT ĐẦU LÀM VIỆC'] || row['ngayBatDauLamViec2'] || null,
              thangTD: parseInt(row['THÁNG TD'] || row['thangTD'] || 0) || 0,
              namTD: parseInt(row['NĂM TD'] || row['namTD'] || 0) || 0,
              thangHL: parseInt(row['THÁNG HL'] || row['thangHL'] || 0) || 0,
              tinhLuot: parseFloat(row['Tính lượt'] || row['tinhLuot'] || 0) || 0,
              tinhLuot3tr: parseFloat(row['TÍNH LƯỢT 3 tr'] || row['tinhLuot3tr'] || 0) || 0,
              maDaiLyTD: String(row['Mã đại lý tuyển dụng'] || row['Mã NTD'] || row['maDaiLyTD'] || ''),
              danhDauTVV: String(row['ĐÁNH DẤU TVVm TUYỂN DỤNG QUÝ 1'] || row['danhDauTVV'] || ''),
              chucVu2: String(row['Chức vụ'] || row['chucVu2'] || ''),
              maNhom: String(row['Mã nhóm'] || row['maNhom'] || ''),
            })
          });
        }
        fetchContracts();
      } else if (sheetName === 'staff') {
        const members = data.map((r: any) => ({ agentCode: String(r['Mã số'] || r['agentCode'] || ''), agentName: String(r['Họ tên'] || r['agentName'] || ''), position: String(r['Chức vụ'] || r['position'] || ''), nhom: String(r['Nhóm'] || r['nhom'] || ''), maNhom: String(r['Mã nhóm'] || r['maNhom'] || ''), startDate: r['Ngày bắt đầu'] || r['startDate'] || null })).filter(m => m.agentCode || m.agentName);
        if (members.length) await fetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ members }) });
        fetchStaff();
      } else if (sheetName === 'recruiters') {
        const members = data.map((r: any) => ({ nhom: String(r['Nhóm'] || r['nhom'] || ''), agentCode: String(r['Mã số'] || r['agentCode'] || ''), agentName: String(r['Họ tên'] || r['agentName'] || ''), position: String(r['Chức vụ'] || r['position'] || ''), startDate: r['Ngày bắt đầu'] || r['startDate'] || null })).filter(m => m.agentCode || m.agentName);
        if (members.length) await fetch('/api/recruiters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ members }) });
        fetchRecruiters();
      }
      toast({ title: 'Import thành công', description: `${data.length} dòng` });
    } catch { toast({ title: 'Lỗi import', variant: 'destructive' }); }
    e.target.value = '';
  }, [fetchLeaders, fetchRevenue, fetchContracts, fetchStaff, fetchRecruiters]);

  // Sort & filter
  const sortData = useCallback((field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }, [sortField]);
  const getSorted = useCallback((data: any[]) => {
    if (!sortField) return data;
    return [...data].sort((a, b) => { const va = a[sortField], vb = b[sortField]; if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va; return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va)); });
  }, [sortField, sortDir]);
  const getFiltered = useCallback((data: any[], fields: string[]) => {
    if (!searchTerm) return data; const l = searchTerm.toLowerCase(); return data.filter(item => fields.some(f => String(item[f] || '').toLowerCase().includes(l)));
  }, [searchTerm]);

  const SortIcon = ({ field }: { field: string }) => (
    <ArrowUpDown className={`w-3 h-3 inline ml-1 ${sortField === field ? 'text-amber-400' : 'text-emerald-300/40'}`} />
  );

  const handleSyncToggle = useCallback(() => {
    if (syncEnabled) { if (!confirm('Tắt đồng bộ?\nBảng Hợp đồng & Nhân sự sẽ chuyển sang chế độ thủ công.')) return; setSyncEnabled(false); toast({ title: 'Đã tắt đồng bộ', description: 'Có thể chỉnh sửa HĐ & Nhân sự' }); }
    else { setSyncEnabled(true); toast({ title: 'Đã bật đồng bộ', description: 'Tự động cập nhật từ Google Sheets' }); }
  }, [syncEnabled]);

  // ========== RENDER: Overview ==========
  const totalLeaders = leaders.length;
  const totalStaff = staff.length;
  const totalContracts = contracts.length;
  const totalFYP = contracts.reduce((s, c) => s + c.fyp, 0);
  const totalSalary = leaders.reduce((s, l) => s + l.salary, 0);
  const totalRecruiters = recruiters.length;
  const totalRevenue = revenue.reduce((s, r) => s + r.totalFYP, 0);

  const renderOverview = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-extrabold text-emerald-400">Tổng quan hệ thống</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[
          { label: 'Trưởng Ban/Nhóm', value: totalLeaders, icon: Users, color: 'bg-emerald-700' },
          { label: 'Tổng TVV', value: totalStaff, icon: UserCircle, color: 'bg-sky-700' },
          { label: 'Người TD', value: totalRecruiters, icon: UserCircle, color: 'bg-violet-700' },
          { label: 'Tổng HĐ', value: totalContracts, icon: FileText, color: 'bg-amber-700' },
          { label: 'Tổng IP (HĐ)', value: formatCurrency(totalFYP), isText: true, icon: DollarSign, color: 'bg-rose-700' },
          { label: 'Tổng DT', value: formatCurrency(totalRevenue), isText: true, icon: TrendingUp, color: 'bg-emerald-700' },
          { label: 'Tổng lương TN', value: formatCurrency(totalSalary), isText: true, icon: DollarSign, color: 'bg-sky-700' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.color} rounded-lg p-4 border border-white/10`}>
            <div className="flex items-center gap-2 mb-2"><stat.icon className="w-5 h-5 text-white/70" /><span className="text-sm text-white/80 font-bold">{stat.label}</span></div>
            <p className="text-2xl font-extrabold text-white">{stat.isText ? stat.value : formatNumber(stat.value as number)}</p>
          </div>
        ))}
      </div>
      {/* Sync Status */}
      <div className={`rounded-lg p-4 border ${syncEnabled ? 'bg-emerald-900 border-emerald-700' : 'bg-amber-900 border-amber-700'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {syncEnabled ? <CheckCircle2 className="w-6 h-6 text-emerald-300" /> : <AlertTriangle className="w-6 h-6 text-amber-300" />}
            <div>
              <h3 className={`text-base font-bold ${syncEnabled ? 'text-emerald-300' : 'text-amber-300'}`}>{syncEnabled ? 'Đồng bộ tự động: BẬT' : 'Đồng bộ tự động: TẮT'}</h3>
              <p className="text-white/50 text-sm">{syncEnabled ? 'HĐ & Nhân sự tự động từ Google Sheets (chỉ xem)' : 'Chế độ thủ công: chỉnh sửa, thêm, xóa, import'}</p>
            </div>
          </div>
          <button onClick={handleSyncToggle}>
            {syncEnabled ? <ToggleRight className="w-10 h-10 text-emerald-400 cursor-pointer" /> : <ToggleLeft className="w-10 h-10 text-amber-400 cursor-pointer" />}
          </button>
        </div>
      </div>
    </div>
  );

  // ========== RENDER: Leaders ==========
  const renderLeaders = () => {
    const filtered = getFiltered(getSorted(leaders), ['agentCode', 'agentName', 'position', 'nhom', 'ban']);
    const kpiTotalTB = filtered.length;
    const kpiTotalSalary = filtered.reduce((s, l) => s + l.salary, 0);
    const leaderFields: { key: string; label: string; type: 'number' | 'string' }[] = [
      { key: 'salary', label: 'Tiền/tháng', type: 'number' },
    ];
    return (
      <div>
        {/* KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {[
            { label: 'Tổng TB/TN', value: formatNumber(kpiTotalTB), color: 'bg-emerald-700', icon: Users },
            { label: 'Tổng lương', value: formatCurrency(kpiTotalSalary), color: 'bg-sky-700', icon: DollarSign },
          ].map((kpi, i) => (
            <div key={i} className={`${kpi.color} rounded-lg p-3 border border-white/10`}>
              <div className="flex items-center gap-1.5 mb-1"><kpi.icon className="w-3.5 h-3.5 text-white/60" /><p className="text-white/60 text-[10px] font-bold">{kpi.label}</p></div>
              <p className="text-white text-sm font-extrabold truncate">{kpi.value}</p>
            </div>
          ))}
        </div>
        {/* Custom KPI */}
        <KPISettingsPopover sectionKey="leaders" sectionLabel="DS TB/TN" dataSources={[{ key: 'leaders', label: 'TB/TN', data: filtered, fields: leaderFields }]} />
        <div className="flex items-center gap-2 mb-3 mt-2 flex-wrap">
          <SettingsPopover sectionKey="leaders" sectionLabel="DS TB/TN" />
          <Button onClick={addLeader} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> Thêm</Button>
          <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-white rounded-md text-xs font-medium cursor-pointer"><Upload className="w-3.5 h-3.5" /> Import<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleImport('leaders', e)} /></label>
          <Button onClick={() => handleDownloadTemplate('leaders')} variant="outline" className="border-violet-600 text-violet-300 hover:bg-violet-700/20 h-8 text-xs"><FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Tải mẫu</Button>
          <Button onClick={() => handleExport('leaders')} variant="outline" className="border-amber-600 text-amber-300 hover:bg-amber-700/20 h-8 text-xs"><Download className="w-3.5 h-3.5 mr-1" /> Xuất</Button>
        </div>
        <div className="overflow-x-auto border border-emerald-600">
          <Table>
            <TableHeader><TableRow className="bg-emerald-800 hover:bg-emerald-800">
              {[{ f: 'agentCode', l: 'Mã số' }, { f: 'agentName', l: 'Họ tên' }, { f: 'position', l: 'Chức vụ' }, { f: 'ban', l: 'Ban' }, { f: 'nhom', l: 'Nhóm' }, { f: 'maNhom', l: 'Mã nhóm' }, { f: 'salary', l: 'Tiền/tháng' }, { f: 'phone', l: 'SĐT' }, { f: 'email', l: 'Email' }, { f: 'note', l: 'Ghi chú' }].map(col => (
                <TableHead key={col.f} className="text-white text-xs font-bold cursor-pointer hover:text-amber-300 whitespace-nowrap" onClick={() => sortData(col.f)}>{col.l} <SortIcon field={col.f} /></TableHead>
              ))}
              <TableHead className="text-white text-xs w-[40px]"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(l => (
                <TableRow key={l.id} className="bg-white hover:bg-emerald-50 border-b border-gray-200">
                  <TableCell className="text-xs p-0"><EditableCell value={l.agentCode} onSave={(v) => updateLeader(l.id, 'agentCode', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={l.agentName} onSave={(v) => updateLeader(l.id, 'agentName', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={l.position} onSave={(v) => updateLeader(l.id, 'position', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={l.ban} onSave={(v) => updateLeader(l.id, 'ban', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={l.nhom} onSave={(v) => updateLeader(l.id, 'nhom', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={l.maNhom} onSave={(v) => updateLeader(l.id, 'maNhom', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={l.salary} onSave={(v) => updateLeader(l.id, 'salary', v)} type="number" className="text-right" /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={l.phone} onSave={(v) => updateLeader(l.id, 'phone', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={l.email} onSave={(v) => updateLeader(l.id, 'email', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={l.note} onSave={(v) => updateLeader(l.id, 'note', v)} /></TableCell>
                  <TableCell className="text-xs p-1"><Button variant="ghost" size="sm" onClick={() => deleteLeader(l.id)} className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"><Trash2 className="w-3 h-3" /></Button></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-gray-500 text-sm py-8">Chưa có dữ liệu</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-gray-500 mt-2">{filtered.length} dòng • Nháy đúp ô để sửa</p>
      </div>
    );
  };

  // ========== RENDER: Recruiters ==========
  const renderRecruiters = () => {
    const filtered = getFiltered(getSorted(recruiters), ['agentCode', 'agentName', 'nhom', 'position']);
    const canEdit = !syncEnabled;
    const kpiTotalNTD = filtered.length;
    const kpiActive = filtered.filter(r => !r.startDate || r.startDate === '').length;
    const recruiterFields: { key: string; label: string; type: 'number' | 'string' }[] = [];
    return (
      <div>
        {/* KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {[
            { label: 'Tổng NTD', value: formatNumber(kpiTotalNTD), color: 'bg-violet-700', icon: UserCircle },
            { label: 'Đang hoạt động', value: formatNumber(kpiActive), color: 'bg-emerald-700', icon: CheckCircle2 },
          ].map((kpi, i) => (
            <div key={i} className={`${kpi.color} rounded-lg p-3 border border-white/10`}>
              <div className="flex items-center gap-1.5 mb-1"><kpi.icon className="w-3.5 h-3.5 text-white/60" /><p className="text-white/60 text-[10px] font-bold">{kpi.label}</p></div>
              <p className="text-white text-sm font-extrabold truncate">{kpi.value}</p>
            </div>
          ))}
        </div>
        {/* Custom KPI */}
        <KPISettingsPopover sectionKey="recruiters" sectionLabel="DS Người TD" dataSources={[{ key: 'recruiters', label: 'Người TD', data: filtered, fields: recruiterFields }]} />
        <div className={`rounded-md px-3 py-2 mb-3 mt-2 flex items-center gap-2 ${canEdit ? 'bg-amber-800 border border-amber-600' : 'bg-emerald-800 border border-emerald-600'}`}>
          {canEdit ? <><AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0" /><span className="text-amber-200 text-xs font-bold">Chế độ thủ công</span><span className="text-amber-200/60 text-xs">— Có thể chỉnh sửa</span></>
            : <><CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" /><span className="text-emerald-200 text-xs font-bold">Đồng bộ tự động</span><span className="text-emerald-200/60 text-xs">— Chỉ xem</span></>}
          <button onClick={handleSyncToggle} className="ml-auto flex-shrink-0">{syncEnabled ? <ToggleRight className="w-8 h-8 text-emerald-400 cursor-pointer" /> : <ToggleLeft className="w-8 h-8 text-amber-400 cursor-pointer" />}</button>
        </div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <SettingsPopover sectionKey="recruiters" sectionLabel="DS Người TD" />
          {canEdit && <><Button onClick={addRecruiter} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> Thêm</Button>
            <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-white rounded-md text-xs font-medium cursor-pointer"><Upload className="w-3.5 h-3.5" /> Import<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleImport('recruiters', e)} /></label></>}
          <Button onClick={() => handleDownloadTemplate('recruiters')} variant="outline" className="border-violet-600 text-violet-300 hover:bg-violet-700/20 h-8 text-xs"><FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Tải mẫu</Button>
          <Button onClick={() => handleExport('recruiters')} variant="outline" className="border-amber-600 text-amber-300 hover:bg-amber-700/20 h-8 text-xs"><Download className="w-3.5 h-3.5 mr-1" /> Xuất</Button>
        </div>
        <div className="overflow-x-auto border border-emerald-600">
          <Table>
            <TableHeader><TableRow className="bg-emerald-800 hover:bg-emerald-800">
              {[{ f: 'agentCode', l: 'Mã số' }, { f: 'agentName', l: 'Họ tên' }, { f: 'position', l: 'Chức vụ' }, { f: 'nhom', l: 'Nhóm' }, { f: 'startDate', l: 'Ngày bắt đầu' }].map(col => (
                <TableHead key={col.f} className="text-white text-xs font-bold cursor-pointer hover:text-amber-300 whitespace-nowrap" onClick={() => sortData(col.f)}>{col.l} <SortIcon field={col.f} /></TableHead>
              ))}
              {canEdit && <TableHead className="text-white text-xs w-[40px]"></TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id} className="bg-white hover:bg-emerald-50 border-b border-gray-200">
                  {canEdit ? (<>
                    <TableCell className="text-xs p-0"><EditableCell value={r.agentCode} onSave={(v) => updateRecruiter(r.id, 'agentCode', v)} /></TableCell>
                    <TableCell className="text-xs p-0"><EditableCell value={r.agentName} onSave={(v) => updateRecruiter(r.id, 'agentName', v)} /></TableCell>
                    <TableCell className="text-xs p-0"><EditableCell value={r.position} onSave={(v) => updateRecruiter(r.id, 'position', v)} /></TableCell>
                    <TableCell className="text-xs p-0"><EditableCell value={r.nhom} onSave={(v) => updateRecruiter(r.id, 'nhom', v)} /></TableCell>
                    <TableCell className="text-xs p-0"><EditableCell value={r.startDate ? new Date(r.startDate).toLocaleDateString('vi-VN') : ''} onSave={(v) => updateRecruiter(r.id, 'startDate', v)} type="date" /></TableCell>
                    <TableCell className="text-xs p-1"><Button variant="ghost" size="sm" onClick={() => deleteRecruiter(r.id)} className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"><Trash2 className="w-3 h-3" /></Button></TableCell>
                  </>) : (<>
                    <TableCell className="text-xs text-gray-900 font-mono">{r.agentCode}</TableCell>
                    <TableCell className="text-xs text-gray-900">{r.agentName}</TableCell>
                    <TableCell className="text-xs text-gray-900">{r.position}</TableCell>
                    <TableCell className="text-xs text-gray-900">{r.nhom}</TableCell>
                    <TableCell className="text-xs text-gray-900">{r.startDate ? new Date(r.startDate).toLocaleDateString('vi-VN') : '—'}</TableCell>
                  </>)}
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={canEdit ? 6 : 5} className="text-center text-gray-500 text-sm py-8">Chưa có dữ liệu</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-gray-500 mt-2">{filtered.length} dòng</p>
      </div>
    );
  };

  // ========== RENDER: Revenue with sub-tabs ==========
  const renderRevenue = () => {
    const currentYear = new Date().getFullYear();
    // Filter revenue by selected month
    const filteredRevenue = revenueSub === 'all'
      ? revenue
      : revenue.filter(r => r.month === `${currentYear}-${revenueSub}` || r.month.endsWith(`-${revenueSub}`));

    // Filter contracts by month
    const filteredContracts = revenueSub === 'all'
      ? contracts
      : contracts.filter(c => {
          const d = new Date(c.effectiveDate);
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          return mm === revenueSub;
        });

    const monthLabel = MONTHS.find(m => m.key === revenueSub)?.label || '';

    const sortedContracts = getSorted(getFiltered(filteredContracts, ['contractNumber', 'agentCode', 'agentName', 'nhom']));

    return (
      <div>
        {/* Sub-tabs for months */}
        <div className="flex items-center gap-1 mb-3 flex-wrap">
          <SettingsPopover sectionKey={`revenue-${revenueSub}`} sectionLabel={`Doanh thu - ${monthLabel}`} />
          {MONTHS.map(m => (
            <button
              key={m.key}
              onClick={() => setRevenueSub(m.key)}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1 ${
                revenueSub === m.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-900 text-emerald-300 hover:bg-emerald-700 hover:text-white'
              }`}
            >
              {m.key === 'all' ? m.label : `T${m.key.replace('0', '')}`}
              {hasSectionLink(`revenue-${m.key}`) && <Link2 className="w-2.5 h-2.5" />}
            </button>
          ))}
        </div>

        {/* Custom KPI for Revenue */}
        <KPISettingsPopover
          sectionKey={`revenue-${revenueSub}`}
          sectionLabel={`Doanh thu - ${monthLabel}`}
          dataSources={[
            {
              key: 'revenue',
              label: 'Doanh số',
              data: filteredRevenue,
              fields: [
                { key: 'totalFYP', label: 'Tổng IP', type: 'number' },
                { key: 'totalAFYP', label: 'Tổng AFYP', type: 'number' },
                { key: 'contractCount', label: 'Số HĐ', type: 'number' },
                { key: 'activityRounds', label: 'Lượt HĐ', type: 'number' },
              ],
            },
            {
              key: 'contracts',
              label: 'Hợp đồng',
              data: filteredContracts,
              fields: [
                { key: 'fyp', label: 'FYP', type: 'number' },
                { key: 'afyp', label: 'AFYP', type: 'number' },
                { key: 'pdt10DT', label: 'PĐT + 10% ĐT', type: 'number' },
                { key: 'phiDongThem', label: 'Phí đóng thêm', type: 'number' },
                { key: 'afypChuaTru10DT', label: 'AFYP chưa trừ 10% ĐT', type: 'number' },
                { key: 'tinhLuot3tr', label: 'Tính lượt 3tr', type: 'number' },
                { key: 'stt', label: 'STT', type: 'number' },
              ],
            },
          ]}
          defaultConfigs={[
            { id: 'kpi-default-fyp', label: 'Tổng IP (FYP)', dataSourceKey: 'contracts', field: 'fyp', calculation: 'sum', color: 'amber' },
            { id: 'kpi-default-afyp', label: 'Tổng AFYP', dataSourceKey: 'contracts', field: 'afyp', calculation: 'sum', color: 'amber' },
            { id: 'kpi-default-pdt', label: 'Tổng PĐT + 10% ĐT', dataSourceKey: 'contracts', field: 'pdt10DT', calculation: 'sum', color: 'sky' },
            { id: 'kpi-default-phidongthem', label: 'Tổng Phí đóng thêm', dataSourceKey: 'contracts', field: 'phiDongThem', calculation: 'sum', color: 'sky' },
            { id: 'kpi-default-afypchutru', label: 'Tổng AFYP chưa trừ 10% ĐT', dataSourceKey: 'contracts', field: 'afypChuaTru10DT', calculation: 'sum', color: 'violet' },
            { id: 'kpi-default-tinhluot', label: 'Tổng Tính lượt 3tr', dataSourceKey: 'contracts', field: 'tinhLuot3tr', calculation: 'sum', color: 'violet' },
            { id: 'kpi-default-count', label: 'Số HĐ', dataSourceKey: 'contracts', field: 'stt', calculation: 'count', color: 'emerald' },
          ]}
        />

        {/* Detail table */}
        <h3 className="text-sm font-bold text-amber-300 mb-2">Bảng chi tiết — {monthLabel} ({sortedContracts.length} HĐ)</h3>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {!syncEnabled && <><Button onClick={addContract} className="bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs"><Plus className="w-3 h-3 mr-1" /> Thêm HĐ</Button>
            <label className="inline-flex items-center gap-1 px-2 py-1 bg-sky-700 hover:bg-sky-600 text-white rounded text-[11px] font-medium cursor-pointer"><Upload className="w-3 h-3" /> Import HĐ<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleImport('contracts', e)} /></label></>}
          <Button onClick={() => handleDownloadTemplate('contracts')} variant="outline" className="border-violet-600 text-violet-300 hover:bg-violet-700/20 h-7 text-xs"><FileSpreadsheet className="w-3 h-3 mr-1" /> Tải mẫu HĐ</Button>
          <Button onClick={() => handleExport('contracts')} variant="outline" className="border-amber-600 text-amber-300 hover:bg-amber-700/20 h-7 text-xs"><Download className="w-3 h-3 mr-1" /> Xuất HĐ</Button>
        </div>
        <div className="overflow-x-auto border border-amber-600">
          <Table>
            <TableHeader>
              <TableRow className="bg-amber-800 hover:bg-amber-800">
                {CONTRACT_COLUMNS.map(col => (
                  <TableHead key={col.f} className="text-white text-[10px] font-bold whitespace-nowrap cursor-pointer hover:text-amber-300" onClick={() => sortData(col.f)}>
                    {col.l} <SortIcon field={col.f} />
                  </TableHead>
                ))}
                {!syncEnabled && <TableHead className="text-white text-xs w-[36px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedContracts.slice(0, 200).map(c => (
                <TableRow key={c.id} className="bg-white hover:bg-amber-50 border-b border-gray-200">
                  {CONTRACT_COLUMNS.map(col => (
                    <TableCell key={col.f} className="text-xs p-0">
                      {!syncEnabled ? (
                        <EditableCell
                          value={col.type === 'number' ? (c as any)[col.f] : (c as any)[col.f] || ''}
                          onSave={(v) => updateContract(c.id, col.f, v)}
                          type={col.type}
                          className={col.type === 'number' ? 'text-right' : ''}
                        />
                      ) : (
                        <span className="px-1 py-0.5 block text-gray-900 text-xs">
                          {col.type === 'number' && typeof (c as any)[col.f] === 'number'
                            ? formatNumber((c as any)[col.f])
                            : col.type === 'date' && (c as any)[col.f]
                              ? new Date(String((c as any)[col.f])).toLocaleDateString('vi-VN')
                              : String((c as any)[col.f] || '—')}
                        </span>
                      )}
                    </TableCell>
                  ))}
                  {!syncEnabled && (
                    <TableCell className="text-xs p-1">
                      <Button variant="ghost" size="sm" onClick={() => deleteContract(c.id)} className="h-5 w-5 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {sortedContracts.length === 0 && <TableRow><TableCell colSpan={CONTRACT_COLUMNS.length + (syncEnabled ? 0 : 1)} className="text-center text-gray-500 text-sm py-6">Chưa có HĐ</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  // ========== RENDER: Structure (placeholder) ==========
  const renderStructure = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-extrabold text-emerald-400">Cấu trúc tổ chức</h2>
        <SettingsPopover sectionKey="structure" sectionLabel="Cấu trúc" />
      </div>
      <div className="bg-amber-900 border border-amber-600 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-amber-300" /><span className="text-amber-200 font-bold">Đang xây dựng</span></div>
        <p className="text-amber-200/70 text-sm">Mục này sẽ chứa sơ đồ ban nhóm, nhân viên quản lý, ánh xạ NV-Nhóm, và chỉ số được giao. Đây là nền tảng để trích xuất số liệu theo nhóm hoặc theo nhân viên.</p>
      </div>

      {/* Show current structure from leaders */}
      <div className="bg-emerald-900 rounded-lg p-4 border border-emerald-700">
        <h3 className="text-base font-bold text-emerald-300 mb-3">Sơ đồ Trưởng Ban/Nhóm hiện tại</h3>
        {leaders.length === 0 ? <p className="text-white/40 text-sm">Chưa có dữ liệu</p> : (
          <div className="space-y-1">
            {/* Group by ban */}
            {Array.from(new Set(leaders.map(l => l.ban || '(Chưa phân ban)'))).map(ban => {
              const banLeaders = leaders.filter(l => (l.ban || '(Chưa phân ban)') === ban);
              return (
                <div key={ban} className="bg-emerald-800 rounded-md p-3 mb-2">
                  <h4 className="text-emerald-200 font-bold text-sm mb-2">{ban}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {banLeaders.map(l => (
                      <div key={l.id} className="bg-emerald-700 rounded-md p-2 border border-emerald-600">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-300" />
                          <div>
                            <p className="text-white text-xs font-bold">{l.agentName}</p>
                            <p className="text-emerald-300/60 text-[10px]">{l.position} • {l.nhom || '(Chưa có nhóm)'} • {l.maNhom}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Staff count by group */}
      <div className="bg-emerald-900 rounded-lg p-4 border border-emerald-700">
        <h3 className="text-base font-bold text-emerald-300 mb-3">Nhân sự theo Nhóm</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Array.from(new Set(staff.map(s => s.nhom || '(Chưa phân)'))).sort().map(nhom => {
            const count = staff.filter(s => (s.nhom || '(Chưa phân)') === nhom).length;
            const maNhom = staff.find(s => s.nhom === nhom)?.maNhom || '';
            return (
              <div key={nhom} className="bg-emerald-800 rounded-md p-2 flex items-center justify-between">
                <div><p className="text-white text-xs font-bold">{nhom}</p><p className="text-emerald-300/50 text-[10px]">{maNhom}</p></div>
                <span className="text-emerald-200 font-extrabold text-sm">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ========== RENDER SHEET DISPATCHER ==========
  const renderSheet = () => {
    if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /><span className="ml-3 text-emerald-300 text-sm">Đang tải...</span></div>;
    switch (activeSheet) {
      case 'overview': return renderOverview();
      case 'leaders': return renderLeaders();
      case 'recruiters': return renderRecruiters();
      case 'revenue': return renderRevenue();
      case 'structure': return renderStructure();
      case 'spreadsheet': return <SpreadsheetSheet />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0a0a1a]">
      {/* Header */}
      <header className="bg-emerald-900 border-b border-emerald-700 px-4 py-2 flex items-center gap-3 flex-shrink-0">
        <Button variant="ghost" onClick={() => router.push('/')} className="text-emerald-300 hover:text-white hover:bg-emerald-800 h-8 w-8 p-0"><ArrowLeft className="w-4 h-4" /></Button>
        <h1 className="text-lg font-extrabold text-white">Quản Lý Dữ Liệu</h1>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleSyncToggle} className="flex items-center gap-1.5 text-xs font-bold transition-colors">
            {syncEnabled ? <span className="flex items-center gap-1 text-emerald-300 hover:text-emerald-200 bg-emerald-800 px-2 py-1 rounded-md"><ToggleRight className="w-4 h-4" /> Auto</span>
              : <span className="flex items-center gap-1 text-amber-300 hover:text-amber-200 bg-amber-800 px-2 py-1 rounded-md"><ToggleLeft className="w-4 h-4" /> Thủ công</span>}
          </button>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-emerald-400" />
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tìm kiếm..." className="h-7 w-[160px] pl-7 text-xs bg-emerald-800 border-emerald-600 text-white placeholder-emerald-400" />
            {searchTerm && <X className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400 cursor-pointer" onClick={() => setSearchTerm('')} />}
          </div>
          <Button variant="ghost" onClick={() => loadSheet(activeSheet)} className="text-emerald-300 hover:text-white hover:bg-emerald-800 h-8 w-8 p-0"><RefreshCw className="w-3.5 h-3.5" /></Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <nav className="w-[200px] bg-emerald-900 border-r border-emerald-700 flex-shrink-0 overflow-y-auto">
          <div className="p-2 space-y-0.5">
            {SHEETS.map(sheet => {
              const isActive = activeSheet === sheet.key;
              const isExpanded = sheet.hasSub && revenueExpanded && activeSheet === 'revenue';
              return (
                <div key={sheet.key}>
                  <button
                    onClick={() => { setActiveSheet(sheet.key); setSearchTerm(''); setSortField(''); if (sheet.hasSub) setRevenueExpanded(!revenueExpanded); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors ${
                      isActive ? 'bg-emerald-600 text-white' : 'text-emerald-300 hover:bg-emerald-800 hover:text-white'
                    }`}
                  >
                    <sheet.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate flex-1 text-left">{sheet.label}</span>
                    {hasSectionLink(sheet.key) && <Link2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                    {sheet.synced && syncEnabled && <RefreshCw className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                    {sheet.synced && !syncEnabled && <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                    {sheet.hasSub && (revenueExpanded && activeSheet === 'revenue' ? <ChevronDown className="w-3.5 h-3.5 text-emerald-300" /> : <ChevronRight className="w-3.5 h-3.5 text-emerald-300" />)}
                  </button>
                  {/* Revenue sub-items */}
                  {sheet.hasSub && isExpanded && (
                    <div className="ml-6 mt-0.5 space-y-0.5">
                      {MONTHS.map(m => (
                        <button
                          key={m.key}
                          onClick={() => { setActiveSheet('revenue'); setRevenueSub(m.key); }}
                          className={`w-full flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold rounded transition-colors ${
                            revenueSub === m.key ? 'bg-emerald-500 text-white' : 'text-emerald-300/70 hover:bg-emerald-700 hover:text-white'
                          }`}
                        >
                          {m.key === 'all' ? <TrendingUp className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                          <span>{m.label}</span>
                          {hasSectionLink(`revenue-${m.key}`) && <Link2 className="w-2.5 h-2.5 text-emerald-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* File menu */}
          <div className="p-2 mt-4 border-t border-emerald-700">
            <div className="text-emerald-400 text-xs font-bold mb-2 px-2">MENU FILE</div>
            {SHEETS.filter(s => s.key !== 'overview' && s.key !== 'spreadsheet').map(sheet => (
              <div key={sheet.key} className="px-2 py-1 text-emerald-300/50 text-[11px] flex items-center gap-1.5">
                <sheet.icon className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{sheet.label}</span>
                {sheet.synced && <span className="text-[9px] text-amber-400/50">{syncEnabled ? 'sync' : 'edit'}</span>}
              </div>
            ))}
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4">
          {renderSheet()}
        </main>
      </div>
    </div>
  );
}
