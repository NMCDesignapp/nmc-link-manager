'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft, Plus, Trash2, Download, Upload, Search, ArrowUpDown,
  LayoutDashboard, Users, DollarSign, FileText, UserCircle, Loader2,
  RefreshCw, CheckCircle2, X, FileSpreadsheet, ToggleLeft, ToggleRight,
  AlertTriangle, ChevronDown, ChevronRight, Network, Calculator,
  Calendar, TrendingUp, Hash, Settings, Link2, ExternalLink,
  Merge, Split, Target, BarChart3, Building2, UserCog, Edit2, Percent,
  Menu, ChevronLeft, UserPlus,
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

interface PhongItem { id: string; maPhong: string; tenPhong: string; note: string; }
interface ADItem { id: string; maAD: string; tenAD: string; maPhong: string; note: string; }
interface BanNhomItem { id: string; maBanNhom: string; tenBanNhom: string; maAD: string; ngayBatDau: string | null; note: string; }
interface TVVStructItem { id: string; agentCode: string; agentName: string; maBanNhom: string; chucVu: string; ngayBatDau: string | null; note: string; }

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
  emerald: 'bg-emerald-500/20',
  amber: 'bg-amber-500/20',
  sky: 'bg-sky-500/20',
  violet: 'bg-violet-500/20',
  rose: 'bg-rose-500/20',
  orange: 'bg-orange-500/20',
};

// ==================== CONSTANTS ====================
type SheetKey = 'overview' | 'leaders' | 'recruiters' | 'revenue' | 'structure' | 'spreadsheet' | 'report';
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
  { key: 'recruiters', label: 'DS Người TD', icon: UserCircle, synced: false },
  { key: 'revenue', label: 'Doanh thu', icon: DollarSign, synced: false, hasSub: true },
  { key: 'report', label: 'Báo cáo', icon: BarChart3, synced: false },
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
    headers: ['STT', 'Ban', 'Nhóm', 'Mã Ban/Nhóm', 'Mã ĐL', 'Tên', 'Chức vụ', 'Ngày bắt đầu làm việc', 'Số hợp đồng', 'Ngày hiệu lực', 'Ngày phát hành', 'PĐT + 10% ĐT', 'AFYP', 'AD', 'TÍNH LƯỢT 3 tr', 'MÃ ĐL TD'],
    sampleData: [{ 'STT': '1', 'Ban': 'Hiệp Tiến', 'Nhóm': 'Nhiệt An', 'Mã Ban/Nhóm': 'U1041A3L6E', 'Mã ĐL': 'D104132784', 'Tên': 'Dương Thị Hồng Nga', 'Chức vụ': 'Trưởng nhóm', 'Ngày bắt đầu làm việc': '01/10/2017', 'Số hợp đồng': '10000017167449', 'Ngày hiệu lực': '01/01/2026', 'Ngày phát hành': '09/01/2026', 'PĐT + 10% ĐT': '12651118', 'AFYP': '12643612', 'AD': 'Trương Quốc Uy', 'TÍNH LƯỢT 3 tr': '12651118', 'MÃ ĐL TD': 'D104102154' }],
  },
  staff: {
    headers: ['Mã số', 'Họ tên', 'Chức vụ', 'Nhóm', 'Mã nhóm', 'Ngày bắt đầu'],
    sampleData: [{ 'Mã số': 'TVV001', 'Họ tên': 'Nguyễn Văn A', 'Chức vụ': 'TVV', 'Nhóm': 'Nhóm 1', 'Mã nhóm': 'NH01', 'Ngày bắt đầu': '01/01/2026' }],
  },
  recruiters: {
    headers: ['Mã số', 'Họ tên', 'Chức vụ', 'Nhóm', 'Ngày bắt đầu'],
    sampleData: [{ 'Mã số': 'NTD001', 'Họ tên': 'Trần Thị B', 'Chức vụ': 'NTD', 'Nhóm': 'Nhóm 1', 'Ngày bắt đầu': '01/01/2026' }],
  },
  'structure-phong': {
    headers: ['Mã Phòng', 'Tên Phòng', 'Ghi chú'],
    sampleData: [{ 'Mã Phòng': 'P001', 'Tên Phòng': 'Phòng Kinh doanh', 'Ghi chú': '' }],
  },
  'structure-ad': {
    headers: ['Mã AD', 'Tên AD', 'Mã Phòng', 'Ghi chú'],
    sampleData: [{ 'Mã AD': 'AD001', 'Tên AD': 'Nguyễn Văn AD', 'Mã Phòng': 'P001', 'Ghi chú': '' }],
  },
  'structure-bannhom': {
    headers: ['Mã Ban/Nhóm', 'Tên Ban/Nhóm', 'Mã AD', 'Ghi chú'],
    sampleData: [{ 'Mã Ban/Nhóm': 'BN001', 'Tên Ban/Nhóm': 'Nhóm Hiệp Tiến', 'Mã AD': 'AD001', 'Ghi chú': '' }],
  },
  'structure-tvv': {
    headers: ['Mã TVV', 'Tên TVV', 'Mã Ban/Nhóm', 'Chức vụ', 'Ngày bắt đầu làm việc', 'Ghi chú'],
    sampleData: [{ 'Mã TVV': 'D104132784', 'Tên TVV': 'Nguyễn Văn TVV', 'Mã Ban/Nhóm': 'U104102122', 'Chức vụ': 'Trưởng nhóm', 'Ngày bắt đầu làm việc': '01/01/2026', 'Ghi chú': '' }],
  },
};

// Contract columns matching the new Tháng 1.xlsx template layout
const CONTRACT_COLUMNS = [
  { f: 'stt', l: 'STT', type: 'number' as const },
  { f: 'ban', l: 'Ban', type: 'text' as const },
  { f: 'nhom', l: 'Nhóm', type: 'text' as const },
  { f: 'maBanNhom', l: 'Mã Ban/Nhóm', type: 'text' as const },
  { f: 'maDL', l: 'Mã ĐL', type: 'text' as const },
  { f: 'agentName', l: 'Tên', type: 'text' as const },
  { f: 'position', l: 'Chức vụ', type: 'text' as const },
  { f: 'ngayBatDauLamViec', l: 'Ngày bắt đầu LV', type: 'date' as const },
  { f: 'contractNumber', l: 'Số hợp đồng', type: 'text' as const },
  { f: 'effectiveDate', l: 'Ngày hiệu lực', type: 'date' as const },
  { f: 'issueDate', l: 'Ngày phát hành', type: 'date' as const },
  { f: 'pdt10DT', l: 'PĐT + 10% ĐT', type: 'number' as const },
  { f: 'afyp', l: 'AFYP', type: 'number' as const },
  { f: 'ad', l: 'AD', type: 'text' as const },
  { f: 'tinhLuot3tr', l: 'TÍNH LƯỢT 3 tr', type: 'number' as const },
  { f: 'maDaiLyTD', l: 'MÃ ĐL TD', type: 'text' as const },
];

// ==================== HELPERS ====================
function formatCurrency(n: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}
function formatNumber(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n);
}

// Helper: convert any date value to yyyy-mm-dd for <input type="date">
function toInputDate(val: any): string {
  if (!val) return '';
  const s = String(val);
  // Already yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // ISO string: take first 10 chars
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  // dd/mm/yyyy Vietnamese format
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  // Try native parse
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return '';
}

// Helper: format date value for display (Vietnamese format)
function formatDateDisplay(val: any): string {
  if (!val) return '—';
  const d = new Date(String(val));
  if (isNaN(d.getTime())) return String(val || '—');
  return d.toLocaleDateString('vi-VN');
}

// Helper: safe format date without timezone offset issues
function safeFormatDate(val: any): string {
  if (!val) return '';
  const s = String(val);
  // If it's a date-only or ISO string like "2026-01-01" or "2026-01-01T00:00:00.000Z", parse manually
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return `${ymd[3]}/${ymd[2]}/${ymd[1]}`;
  // Otherwise use locale
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toLocaleDateString('vi-VN');
  return s;
}

// ==================== EDITABLE CELL ====================
function EditableCell({ value, onSave, type = 'text', className = '' }: {
  value: string | number; onSave: (val: any) => void; type?: 'text' | 'number' | 'date'; className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync editVal with value, converting dates properly
  useEffect(() => {
    if (type === 'date') {
      setEditVal(toInputDate(value));
    } else {
      setEditVal(String(value ?? ''));
    }
  }, [value, type]);
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
        className="w-full h-full px-1 py-0.5 text-xs bg-[#0e0e18] text-white border-2 border-emerald-500/50 outline-none"
      />
    );
  }

  return (
    <div
      className={`cursor-pointer hover:bg-emerald-500/10 hover:outline hover:outline-1 hover:outline-emerald-300 px-1 py-0.5 min-h-[22px] text-white ${className}`}
      onDoubleClick={() => setEditing(true)}
      title="Nháy đúp để sửa"
    >
      {type === 'number' && typeof value === 'number'
        ? formatNumber(value)
        : type === 'date'
          ? formatDateDisplay(value)
          : String(value || '—')}
    </div>
  );
}

// ==================== SETTINGS POPOVER ====================
function SettingsPopover({ sectionKey, sectionLabel, onlineSettings, saveSetting }: { sectionKey: string; sectionLabel: string; onlineSettings: Record<string, string>; saveSetting: (key: string, value: string) => Promise<void> }) {
  const [link, setLink] = useState('');
  const [syncOn, setSyncOn] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const savedLink = onlineSettings[`nmc-link-${sectionKey}`] || '';
    const savedSync = onlineSettings[`nmc-sync-${sectionKey}`];
    setLink(savedLink);
    if (savedSync !== undefined && savedSync !== '') setSyncOn(savedSync === 'true');
  }, [sectionKey, open, onlineSettings]);

  const handleSave = useCallback(() => {
    saveSetting(`nmc-link-${sectionKey}`, link);
    saveSetting(`nmc-sync-${sectionKey}`, String(syncOn));
    toast({ title: 'Đã lưu cài đặt', description: `${sectionLabel}: ${link ? 'Đã thiết lập link' : 'Chưa có link'} • Đồng bộ: ${syncOn ? 'BẬT' : 'TẮT'}` });
    setOpen(false);
  }, [link, syncOn, sectionKey, sectionLabel, saveSetting]);

  const hasLink = !!(onlineSettings[`nmc-link-${sectionKey}`]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={`h-8 px-2 text-xs ${hasLink ? 'text-emerald-300 hover:text-emerald-200' : 'text-gray-400 hover:text-gray-200'} hover:bg-emerald-500/10`}
          title="Cài đặt"
        >
          <Settings className="w-3.5 h-3.5" />
          {hasLink && <Link2 className="w-3 h-3 ml-1 text-emerald-400" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="bg-[#0e0e18]/95 backdrop-blur-xl border-emerald-500/30 w-80 p-3" align="end" sideOffset={4}>
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
          <Button onClick={handleSave} className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 h-7 text-xs">
            Lưu cài đặt
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ==================== KPI SETTINGS POPOVER ====================
function KPISettingsPopover({ sectionKey, sectionLabel, dataSources, defaultConfigs, onlineSettings, saveSetting, annualTarget }: {
  sectionKey: string; sectionLabel: string;
  dataSources: KPIDataSource[];
  defaultConfigs?: KPIConfig[];
  onlineSettings: Record<string, string>;
  saveSetting: (key: string, value: string) => Promise<void>;
  annualTarget?: number; // Shared annual revenue target for all KPIs in this section
}) {
  const [configs, setConfigs] = useState<KPIConfig[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = onlineSettings[`nmc-kpi-${sectionKey}`];
    if (saved) {
      try { setConfigs(JSON.parse(saved)); } catch { setConfigs([]); }
    } else if (defaultConfigs && defaultConfigs.length > 0) {
      setConfigs(defaultConfigs);
      saveSetting(`nmc-kpi-${sectionKey}`, JSON.stringify(defaultConfigs));
    }
  }, [sectionKey, open, defaultConfigs, onlineSettings, saveSetting]);

  const saveConfigs = useCallback((newConfigs: KPIConfig[]) => {
    setConfigs(newConfigs);
    saveSetting(`nmc-kpi-${sectionKey}`, JSON.stringify(newConfigs));
  }, [sectionKey, saveSetting]);

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

    // For 'count' calculation, count items that have a non-empty value for the field
    if (config.calculation === 'count') {
      return ds.data.filter(item => {
        const val = item[config.field];
        return val !== undefined && val !== null && val !== '';
      }).length;
    }

    // For other calculations, parse numeric values
    const values = ds.data
      .map(item => parseFloat(item[config.field]) || 0)
      .filter(v => !isNaN(v));

    if (values.length === 0) return 0;
    switch (config.calculation) {
      case 'sum': return values.reduce((a, b) => a + b, 0);
      case 'average': return values.reduce((a, b) => a + b, 0) / values.length;
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

  // Get fields for a specific data source (include string fields for 'count' calculation)
  const getFieldsForSource = useCallback((sourceKey: string) => {
    const ds = dataSources.find(d => d.key === sourceKey);
    return ds ? ds.fields : [];
  }, [dataSources]);

  return (
    <div className="space-y-2">
      {/* KPI cards */}
      {configs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {configs.map(config => {
            const actual = calculateKPI(config);
            // Use annualTarget as fallback target if provided, otherwise use per-KPI target
            const effectiveTarget = (annualTarget && annualTarget > 0) ? annualTarget : (config.target && config.target > 0 ? config.target : undefined);
            const pct = effectiveTarget ? Math.min((actual / effectiveTarget) * 100, 100) : undefined;
            const ds = dataSources.find(d => d.key === config.dataSourceKey);
            const fieldLabel = ds?.fields.find(f => f.key === config.field)?.label || config.field;
            const calcLabel = { sum: 'Tổng', average: 'TB', count: 'SL', min: 'Min', max: 'Max' }[config.calculation];
            const colorClass = KPI_COLORS[config.color] || 'bg-emerald-500/20';
            return (
              <div key={config.id} className={`${colorClass} rounded-lg p-2.5 border border-emerald-500/30 backdrop-blur-sm`} style={{ boxShadow: `0 0 12px rgba(0, 255, 136, 0.1)` }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-emerald-100 text-[9px] font-bold">{config.label || fieldLabel}</p>
                  <span className="text-gray-300 text-[8px]">{calcLabel} {fieldLabel}</span>
                </div>
                <p className="text-white text-sm font-extrabold truncate">{formatKPIValue(actual)}</p>
                {effectiveTarget && effectiveTarget > 0 && (
                  <div className="mt-1">
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-gray-300">Mục tiêu: {formatKPIValue(effectiveTarget)}{(annualTarget && annualTarget > 0) ? ' (năm)' : ''}</span>
                      <span className={`font-bold ${pct && pct >= 100 ? 'text-emerald-300' : pct && pct >= 70 ? 'text-amber-300' : 'text-rose-300'}`}>{pct?.toFixed(0)}%</span>
                    </div>
                    <Progress value={pct || 0} className="h-1.5 mt-0.5 bg-emerald-800 [&>div]:bg-emerald-400" />
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
            className="h-7 px-2 text-[10px] text-gray-400 hover:text-gray-200 hover:bg-emerald-500/10"
            title="Cài đặt KPI"
          >
            <BarChart3 className="w-3 h-3" />
            <span className="ml-1">KPI</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="bg-[#0e0e18]/95 backdrop-blur-xl border-emerald-500/30 w-96 p-3 max-h-[500px] overflow-y-auto" align="start" sideOffset={4}>
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
                        className={`w-5 h-5 rounded-full ${KPI_COLORS[c]} border-2 ${config.color === c ? 'border-white' : 'border-transparent'} hover:border-white transition-colors`}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            <Button onClick={addConfig} className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 h-7 text-xs">
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

function SpreadsheetSheet({ onlineSettings, saveSetting }: { onlineSettings: Record<string, string>; saveSetting: (key: string, value: string) => Promise<void> }) {
  const [cells, setCells] = useState<CellMap>({});
  const [merges, setMerges] = useState<MergeRange[]>([]);
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  // Load cells and merges from parent's onlineSettings (no extra API call)
  useEffect(() => {
    if (initializedRef.current) return;
    const cellsData = onlineSettings['nmc-spreadsheet-cells'];
    const mergesData = onlineSettings['nmc-spreadsheet-merges'];
    if (cellsData) { try { setCells(JSON.parse(cellsData)); } catch {} }
    if (mergesData) { try { setMerges(JSON.parse(mergesData)); } catch {} }
    if (Object.keys(onlineSettings).length > 0) initializedRef.current = true;
  }, [onlineSettings]);

  // Save cells to online API (debounced)
  const saveCellsTimeout = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (Object.keys(cells).length === 0 || !initializedRef.current) return;
    if (saveCellsTimeout.current) clearTimeout(saveCellsTimeout.current);
    saveCellsTimeout.current = setTimeout(() => {
      saveSetting('nmc-spreadsheet-cells', JSON.stringify(cells));
    }, 1000);
  }, [cells, saveSetting]);

  // Save merges to online API (debounced)
  const saveMergesTimeout = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (merges.length === 0 || !initializedRef.current) return;
    if (saveMergesTimeout.current) clearTimeout(saveMergesTimeout.current);
    saveMergesTimeout.current = setTimeout(() => {
      saveSetting('nmc-spreadsheet-merges', JSON.stringify(merges));
    }, 1000);
  }, [merges, saveSetting]);

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
    if (confirm('Xóa toàn bộ trang tính?')) {
      setCells({});
      setMerges([]);
      // Also clear online
      saveSetting('nmc-spreadsheet-cells', '');
      saveSetting('nmc-spreadsheet-merges', '[]');
    }
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
        <Button onClick={clearSheet} variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-800 h-7 text-xs px-2">Xóa hết</Button>
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
            className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold rounded"
          >
            {f.label}
          </button>
        ))}
        <div className="border-l border-gray-600 h-4 mx-1" />
        <button
          onClick={handleMergeCells}
          className="px-2 py-0.5 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300 text-[10px] font-bold rounded flex items-center gap-1"
          title="Gộp các ô đã chọn (Click → Shift+Click)"
        >
          <Merge className="w-3 h-3" /> Gộp ô
        </button>
        <button
          onClick={handleUnmergeCells}
          className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-[10px] font-bold rounded flex items-center gap-1"
          title="Tách ô gộp tại ô đang chọn"
        >
          <Split className="w-3 h-3" /> Tách ô
        </button>
        <span className="text-gray-400 text-[10px] ml-2">Chọn ô → nhấn nút hàm → sửa range → Enter • Click+Shift để chọn vùng gộp</span>
      </div>

      {/* Selection info */}
      {selectionStart && selectionEnd && (
        <div className="mb-2 px-2 py-1 bg-violet-800/50 border border-violet-500/30 rounded text-[10px] text-violet-200">
          Đã chọn: {selectionStart}:{selectionEnd} — Nhấn "Gộp ô" để gộp
        </div>
      )}

      {/* Spreadsheet grid */}
      <div className="flex-1 overflow-auto border border-gray-600 bg-[#0e0e18]/80">
        <table className="border-collapse w-max">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="bg-gray-800 text-gray-300 text-[10px] font-bold w-[40px] min-w-[40px] border border-gray-600 sticky left-0 z-20">#</th>
              {COL_LABELS.map(col => (
                <th key={col} className="bg-gray-800 text-gray-300 text-[10px] font-bold min-w-[80px] border border-gray-600 px-1 py-0.5">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: SPREADSHEET_ROWS }, (_, rowIdx) => {
              const rowNum = rowIdx + 1;
              return (
                <tr key={rowNum}>
                  <td className="bg-gray-800/80 text-gray-400 text-[10px] text-center border border-gray-600 font-mono sticky left-0">{rowNum}</td>
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
                        className={`border border-gray-600 px-1 py-0 text-[11px] cursor-cell min-w-[80px] bg-[#0e0e18]/40 ${
                          isActive ? 'outline outline-2 outline-emerald-500 bg-emerald-500/10' : ''
                        } ${isSelected && !isActive ? 'bg-violet-500/10 outline outline-1 outline-violet-400' : ''
                        } ${!isActive && !isSelected ? 'hover:bg-emerald-500/5' : ''
                        } ${isFormula ? 'text-sky-300 font-medium' : 'text-gray-200'
                        } ${isMerged ? 'bg-emerald-500/10 border-emerald-400' : ''}`}
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
                            className="w-full h-full px-0 py-0 text-[11px] bg-[#0e0e18] text-white border-none outline-none"
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
  const [revenueNhomFilter, setRevenueNhomFilter] = useState<string>('');
  const [revenueExpanded, setRevenueExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Online settings state (fetched from API instead of localStorage)
  const [onlineSettings, setOnlineSettings] = useState<Record<string, string>>({});

  // Fetch all settings from API on mount
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : {})
      .then(data => setOnlineSettings(data))
      .catch(() => {
        // Server unavailable - no localStorage fallback
        setOnlineSettings({});
      });
  }, []);

  const saveSetting = useCallback(async (key: string, value: string) => {
    // Optimistic update using functional state to avoid dependency on onlineSettings
    let prevValue = '';
    setOnlineSettings(prev => {
      prevValue = prev[key];
      return { ...prev, [key]: value };
    });
    try {
      const r = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      if (!r.ok) {
        // Revert on server error
        setOnlineSettings(prev => ({ ...prev, [key]: prevValue }));
        toast({ title: 'Lỗi lưu cài đặt', description: `Máy chủ trả về lỗi ${r.status}`, variant: 'destructive' });
      }
    } catch {
      // Revert on network error
      setOnlineSettings(prev => ({ ...prev, [key]: prevValue }));
      toast({ title: 'Lỗi lưu online', description: 'Không thể kết nối máy chủ', variant: 'destructive' });
    }
  }, []); // STABLE - no dependency on onlineSettings

  // syncEnabled now derived from onlineSettings
  const [syncEnabled, setSyncEnabled] = useState(true);

  // Update syncEnabled when onlineSettings loads
  useEffect(() => {
    const saved = onlineSettings['nmc-sync-enabled'];
    if (saved !== undefined && saved !== '') setSyncEnabled(saved === 'true');
  }, [onlineSettings['nmc-sync-enabled']]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ref to fetchAllData to avoid circular dependency issues
  const fetchAllDataRef = useRef<() => Promise<void>>(async () => {});

  // Auto-sync: khi settings load xong và syncEnabled, tự động fetch CSV từ Google Sheets links
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const autoSyncFromLinks = useCallback(async () => {
    if (!syncEnabled) return;
    const monthKeys = ['revenue-01','revenue-02','revenue-03','revenue-04','revenue-05','revenue-06',
      'revenue-07','revenue-08','revenue-09','revenue-10','revenue-11','revenue-12'];
    // Thu thập CSV từ các link đã lưu
    let contractCsvData = ''; // data rows only (no header)
    let contractHeader = '';  // header row from first revenue link
    let staffCsv = '';
    let recruiterCsv = '';
    let syncedCount = 0;
    const syncErrors: string[] = [];
    for (const key of ['leaders', 'recruiters', ...monthKeys]) {
      const link = onlineSettings[`nmc-link-${key}`];
      const autoOn = onlineSettings[`nmc-sync-${key}`];
      if (!link || autoOn === 'false') continue;
      try {
        const r = await fetch(`/api/import-csv?url=${encodeURIComponent(link)}`);
        if (!r.ok) {
          syncErrors.push(`${key}: HTTP ${r.status}`);
          continue;
        }
        const data = await r.json();
        if (!data.csvData) {
          syncErrors.push(`${key}: CSV trống`);
          continue;
        }
        if (key === 'leaders') { staffCsv = data.csvData; syncedCount++; }
        else if (key === 'recruiters') { recruiterCsv = data.csvData; syncedCount++; }
        else if (key.startsWith('revenue-')) {
          const lines = data.csvData.split('\n');
          // Save header from first revenue link
          if (!contractHeader && lines.length > 0) {
            contractHeader = lines[0];
          }
          // Append data rows (skip header) — avoid duplicate headers when merging
          const dataOnly = lines.slice(1).join('\n');
          if (dataOnly.trim()) {
            contractCsvData += (contractCsvData ? '\n' : '') + dataOnly;
            syncedCount++;
          }
        }
      } catch (e) {
        syncErrors.push(`${key}: lỗi kết nối`);
      }
    }
    // Combine header + data for contractCsv
    const contractCsv = contractHeader ? contractHeader + '\n' + contractCsvData : '';
    // Gọi sync API nếu có dữ liệu
    if (contractCsv || staffCsv || recruiterCsv) {
      try {
        const r = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractCsv, staffCsv, recruiterCsv }),
        });
        if (r.ok) {
          const result = await r.json();
          console.log('[Auto-sync] Đã đồng bộ:', result);
          setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
          // Backfill: fix existing contracts with missing tinhLuot3tr/maBanNhom/maDL
          try {
            const bf = await fetch('/api/backfill', { method: 'POST' });
            if (bf.ok) { const bfr = await bf.json(); console.log('[Backfill]', bfr.message); }
          } catch { /* silent */ }
          // Refresh UI data after sync
          await fetchAllDataRef.current();
          const errMsg = syncErrors.length > 0 ? ` | Lỗi: ${syncErrors.join(', ')}` : '';
          toast({ title: 'Đồng bộ thành công', description: result.message + errMsg });
        }
      } catch { /* silent */ }
    } else if (syncedCount === 0) {
      console.log('[Auto-sync] Không có link nào để đồng bộ');
      if (syncErrors.length > 0) {
        toast({ title: 'Lỗi đồng bộ', description: syncErrors.join('; '), variant: 'destructive' });
      }
    }
  }, [syncEnabled, onlineSettings]);

  // Track which links have been synced to avoid re-syncing on every render
  const syncedLinksRef = useRef<string>('');
  useEffect(() => {
    // Build a fingerprint of all current links to detect changes
    const linkKeys = ['leaders', 'recruiters', 
      'revenue-01','revenue-02','revenue-03','revenue-04','revenue-05','revenue-06',
      'revenue-07','revenue-08','revenue-09','revenue-10','revenue-11','revenue-12'];
    const fingerprint = linkKeys.map(k => `${k}:${onlineSettings[`nmc-link-${k}`] || ''}`).join('|');
    
    if (Object.keys(onlineSettings).length > 0 && syncEnabled && fingerprint !== syncedLinksRef.current) {
      syncedLinksRef.current = fingerprint;
      autoSyncFromLinks();
    }
  }, [syncEnabled, onlineSettings, autoSyncFromLinks]);

  // Persist sync preference online
  useEffect(() => {
    // Only save after initial load (skip the default true)
    if (onlineSettings['nmc-sync-enabled'] !== undefined || syncEnabled !== true) {
      saveSetting('nmc-sync-enabled', String(syncEnabled));
    }
  }, [syncEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Data
  const [leaders, setLeaders] = useState<LeaderInfo[]>([]);
  const [revenue, setRevenue] = useState<MonthlyRevenue[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Structure state
  const [phongList, setPhongList] = useState<PhongItem[]>([]);
  const [adList, setAdList] = useState<ADItem[]>([]);
  const [banNhomList, setBanNhomList] = useState<BanNhomItem[]>([]);
  const [tvvStructList, setTvvStructList] = useState<TVVStructItem[]>([]);
  const [selectedPhong, setSelectedPhong] = useState<string>('');
  const [selectedAD, setSelectedAD] = useState<string>('');
  const [selectedBanNhom, setSelectedBanNhom] = useState<string>('');

  // Add dialog state per tier
  const [addPhongOpen, setAddPhongOpen] = useState(false);
  const [addADOpen, setAddADOpen] = useState(false);
  const [addBanNhomOpen, setAddBanNhomOpen] = useState(false);
  const [addTvvOpen, setAddTvvOpen] = useState(false);
  const [newPhong, setNewPhong] = useState({ maPhong: '', tenPhong: '', note: '' });
  const [newAD, setNewAD] = useState({ maAD: '', tenAD: '', maPhong: '', note: '' });
  const [newBanNhom, setNewBanNhom] = useState({ maBanNhom: '', tenBanNhom: '', maAD: '', ngayBatDau: '', note: '' });
  const [newTvv, setNewTvv] = useState({ agentCode: '', agentName: '', maBanNhom: '', chucVu: '', ngayBatDau: '', note: '' });

  // Edit state
  const [editingPhong, setEditingPhong] = useState<PhongItem | null>(null);
  const [editingAD, setEditingAD] = useState<ADItem | null>(null);
  const [editingBanNhom, setEditingBanNhom] = useState<BanNhomItem | null>(null);
  const [editingTvv, setEditingTvv] = useState<TVVStructItem | null>(null);

  // Import dialog
  const [importTier, setImportTier] = useState<string>('');
  const [importData, setImportData] = useState<string>('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Array<Record<string, string>>>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [settingsNhomFilter, setSettingsNhomFilter] = useState<string>('');

  // Report state
  const [reportSubject, setReportSubject] = useState<'phong' | 'ad' | 'nhom' | 'ntd'>('nhom');
  const [reportColumn, setReportColumn] = useState<string>('pdt10DT');
  const [reportColumn2, setReportColumn2] = useState<string>('');
  const [reportTVVm, setReportTVVm] = useState<boolean>(false);
  const [reportTVVm2, setReportTVVm2] = useState<boolean>(false);
  const [reportTarget, setReportTarget] = useState<string>('');
  const [reportMonthFrom, setReportMonthFrom] = useState<string>('');
  const [reportMonthTo, setReportMonthTo] = useState<string>('');
  const [reportTitle, setReportTitle] = useState<string>('');
  const [reportNote, setReportNote] = useState<string>('');
  // Report conditions: multiple filter rows
  const [reportConditions, setReportConditions] = useState<Array<{ column: string; operator: string; value: string }>>([]);
  const [reportIncludeNTDOwn, setReportIncludeNTDOwn] = useState<boolean>(true);
  const [reportRowNotes, setReportRowNotes] = useState<Record<string, string>>({});
  const [reportPopupOpen, setReportPopupOpen] = useState(false);
  const reportPopupRef = useRef<HTMLDivElement>(null);
  // Accordion expand state for structure tree
  const [expandedPhongs, setExpandedPhongs] = useState<Set<string>>(new Set());
  const [expandedADs, setExpandedADs] = useState<Set<string>>(new Set());
  const [expandedBanNhoms, setExpandedBanNhoms] = useState<Set<string>>(new Set());

  // Data cache removed - always fetch fresh data to prevent stale data / missing records

  // Per-section settings state (derived from onlineSettings) - use useMemo for efficiency
  const sectionLinks = useMemo(() => {
    const links: Record<string, string> = {};
    const allKeys = ['leaders', 'recruiters', 'revenue', 'structure', 'spreadsheet',
      'revenue-01', 'revenue-02', 'revenue-03', 'revenue-04', 'revenue-05', 'revenue-06',
      'revenue-07', 'revenue-08', 'revenue-09', 'revenue-10', 'revenue-11', 'revenue-12', 'revenue-all'];
    allKeys.forEach(key => {
      const l = onlineSettings[`nmc-link-${key}`];
      if (l) links[key] = l;
    });
    return links;
  }, [onlineSettings]);

  const sectionSyncs = useMemo(() => {
    const syncs: Record<string, boolean> = {};
    const allKeys = ['leaders', 'recruiters', 'revenue', 'structure', 'spreadsheet',
      'revenue-01', 'revenue-02', 'revenue-03', 'revenue-04', 'revenue-05', 'revenue-06',
      'revenue-07', 'revenue-08', 'revenue-09', 'revenue-10', 'revenue-11', 'revenue-12', 'revenue-all'];
    allKeys.forEach(key => {
      const s = onlineSettings[`nmc-sync-${key}`];
      if (s !== undefined && s !== '') syncs[key] = s === 'true';
    });
    return syncs;
  }, [onlineSettings]);

  const hasSectionLink = useCallback((key: string) => !!sectionLinks[key], [sectionLinks]);
  const getSectionSync = useCallback((key: string) => sectionSyncs[key] !== false, [sectionSyncs]);

  // Fetch individual (for refresh or single-tab loads after initial load)
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

  // Fetch structure data
  const fetchPhong = useCallback(async () => {
    try { const res = await fetch('/api/structure/phong'); if (res.ok) { const data = await res.json(); setPhongList(data); } } catch {}
  }, []);
  const fetchAD = useCallback(async () => {
    try { const res = await fetch('/api/structure/ad'); if (res.ok) { const data = await res.json(); setAdList(data); } } catch {}
  }, []);
  const fetchBanNhom = useCallback(async () => {
    try { const res = await fetch('/api/structure/bannhom'); if (res.ok) { const data = await res.json(); setBanNhomList(data); } } catch {}
  }, []);
  const fetchTvvStruct = useCallback(async () => {
    try { const res = await fetch('/api/structure/tvv'); if (res.ok) { const data = await res.json(); setTvvStructList(data); } } catch {}
  }, []);

  // Fetch all data in one request (for initial page load)
  const fetchAllData = useCallback(async () => {
    try {
      const r = await fetch('/api/quan-ly/all');
      if (r.ok) {
        const data = await r.json();
        setLeaders(data.leaders || []);
        setRevenue(data.revenue || []);
        setContracts(data.contracts || []);
        setStaff(data.staff || []);
        setRecruiters(data.recruiters || []);
      }
    } catch {}
  }, []);

  // Keep ref in sync so auto-sync can call it
  fetchAllDataRef.current = fetchAllData;

  const loadSheet = useCallback((sheet: SheetKey, _force = false) => {
    setIsLoading(true);
    const loaders: Record<SheetKey, () => Promise<void>> = {
      overview: async () => { await fetchAllData(); }, // Single request for all data
      leaders: fetchLeaders,
      recruiters: fetchRecruiters,
      revenue: async () => { await Promise.all([fetchRevenue(), fetchContracts()]); },
      report: async () => { await Promise.all([fetchAllData(), fetchPhong(), fetchAD(), fetchBanNhom()]); },
      structure: async () => { await Promise.all([fetchLeaders(), fetchStaff(), fetchPhong(), fetchAD(), fetchBanNhom(), fetchTvvStruct()]); },
      spreadsheet: async () => {},
    };
    loaders[sheet]().finally(() => setIsLoading(false));
  }, [fetchAllData, fetchLeaders, fetchRevenue, fetchContracts, fetchStaff, fetchRecruiters, fetchPhong, fetchAD, fetchBanNhom, fetchTvvStruct]);

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
          tinhLuot3tr: 0, maDaiLyTD: '', danhDauTVV: '',
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

  // ========== CRUD: Structure (4-tier) ==========
  const handleAddPhong = useCallback(async () => {
    if (!newPhong.maPhong || !newPhong.tenPhong) return;
    try { const res = await fetch('/api/structure/phong', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPhong) }); if (res.ok) { setAddPhongOpen(false); setNewPhong({ maPhong: '', tenPhong: '', note: '' }); fetchPhong(); toast({ title: 'Đã thêm Phòng' }); } } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, [newPhong, fetchPhong]);
  const handleAddAD = useCallback(async () => {
    if (!newAD.maAD || !newAD.tenAD) return;
    try { const res = await fetch('/api/structure/ad', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newAD) }); if (res.ok) { setAddADOpen(false); setNewAD({ maAD: '', tenAD: '', maPhong: '', note: '' }); fetchAD(); toast({ title: 'Đã thêm AD' }); } } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, [newAD, fetchAD]);
  const handleAddBanNhom = useCallback(async () => {
    if (!newBanNhom.maBanNhom || !newBanNhom.tenBanNhom) return;
    try { const res = await fetch('/api/structure/bannhom', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newBanNhom) }); if (res.ok) { setAddBanNhomOpen(false); setNewBanNhom({ maBanNhom: '', tenBanNhom: '', maAD: '', ngayBatDau: '', note: '' }); fetchBanNhom(); toast({ title: 'Đã thêm Ban/Nhóm' }); } } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, [newBanNhom, fetchBanNhom]);
  const handleAddTvv = useCallback(async () => {
    if (!newTvv.agentCode || !newTvv.agentName) return;
    try { const res = await fetch('/api/structure/tvv', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTvv) }); if (res.ok) { setAddTvvOpen(false); setNewTvv({ agentCode: '', agentName: '', maBanNhom: '', chucVu: '', ngayBatDau: '', note: '' }); fetchTvvStruct(); toast({ title: 'Đã thêm TVV' }); } } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, [newTvv, fetchTvvStruct]);

  const handleDeletePhong = useCallback(async (id: string) => {
    if (!confirm('Xóa Phòng này?')) return;
    try { const res = await fetch(`/api/structure/phong/${id}`, { method: 'DELETE' }); if (res.ok) { fetchPhong(); toast({ title: 'Đã xóa' }); } } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, [fetchPhong]);
  const handleDeleteAD = useCallback(async (id: string) => {
    if (!confirm('Xóa AD này?')) return;
    try { const res = await fetch(`/api/structure/ad/${id}`, { method: 'DELETE' }); if (res.ok) { fetchAD(); toast({ title: 'Đã xóa' }); } } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, [fetchAD]);
  const handleDeleteBanNhom = useCallback(async (id: string) => {
    if (!confirm('Xóa Ban/Nhóm này?')) return;
    try { const res = await fetch(`/api/structure/bannhom/${id}`, { method: 'DELETE' }); if (res.ok) { fetchBanNhom(); toast({ title: 'Đã xóa' }); } } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, [fetchBanNhom]);
  const handleDeleteTvv = useCallback(async (id: string) => {
    if (!confirm('Xóa TVV này?')) return;
    try { const res = await fetch(`/api/structure/tvv/${id}`, { method: 'DELETE' }); if (res.ok) { fetchTvvStruct(); toast({ title: 'Đã xóa' }); } } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, [fetchTvvStruct]);

  const handleEditPhong = useCallback(async () => {
    if (!editingPhong) return;
    try { const res = await fetch(`/api/structure/phong/${editingPhong.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ maPhong: editingPhong.maPhong, tenPhong: editingPhong.tenPhong, note: editingPhong.note }) }); if (res.ok) { setEditingPhong(null); fetchPhong(); toast({ title: 'Đã cập nhật' }); } } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, [editingPhong, fetchPhong]);
  const handleEditAD = useCallback(async () => {
    if (!editingAD) return;
    try { const res = await fetch(`/api/structure/ad/${editingAD.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ maAD: editingAD.maAD, tenAD: editingAD.tenAD, maPhong: editingAD.maPhong, note: editingAD.note }) }); if (res.ok) { setEditingAD(null); fetchAD(); toast({ title: 'Đã cập nhật' }); } } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, [editingAD, fetchAD]);
  const handleEditBanNhom = useCallback(async () => {
    if (!editingBanNhom) return;
    try { const res = await fetch(`/api/structure/bannhom/${editingBanNhom.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ maBanNhom: editingBanNhom.maBanNhom, tenBanNhom: editingBanNhom.tenBanNhom, maAD: editingBanNhom.maAD, ngayBatDau: editingBanNhom.ngayBatDau, note: editingBanNhom.note }) }); if (res.ok) { setEditingBanNhom(null); fetchBanNhom(); toast({ title: 'Đã cập nhật' }); } } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, [editingBanNhom, fetchBanNhom]);
  const handleEditTvv = useCallback(async () => {
    if (!editingTvv) return;
    try { const res = await fetch(`/api/structure/tvv/${editingTvv.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentCode: editingTvv.agentCode, agentName: editingTvv.agentName, maBanNhom: editingTvv.maBanNhom, chucVu: editingTvv.chucVu, ngayBatDau: editingTvv.ngayBatDau || '', note: editingTvv.note }) }); if (res.ok) { setEditingTvv(null); fetchTvvStruct(); toast({ title: 'Đã cập nhật' }); } } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, [editingTvv, fetchTvvStruct]);

  const handleImportFile = useCallback(async (file: File) => {
    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
      // Convert all values to string
      const records = jsonData.map(row => {
        const obj: Record<string, string> = {};
        Object.entries(row).forEach(([k, v]) => { obj[k] = String(v ?? ''); });
        return obj;
      });
      setImportPreview(records);
      setImportFile(file);
    } catch (e) {
      console.error('File parse error', e);
      toast({ title: 'Lỗi đọc file', description: 'File không hợp lệ. Dùng file .xlsx hoặc .csv', variant: 'destructive' });
    }
  }, []);

  const handleImportStructure = useCallback(async () => {
    let records: Array<Record<string, string>> = [];
    // If file was uploaded, use parsed preview data
    if (importPreview.length > 0) {
      records = importPreview;
    } else if (importData) {
      // Fallback: paste tab-separated data
      const lines = importData.trim().split('\n');
      const header = lines[0].split('\t');
      const rows = lines.slice(1);
      records = rows.map(line => {
        const cols = line.split('\t');
        const record: Record<string, string> = {};
        header.forEach((h, i) => { record[h.trim()] = (cols[i] || '').trim(); });
        return record;
      });
    } else {
      return;
    }
    if (!importTier || records.length === 0) return;
    setImportLoading(true);
    try {
      let endpoint = '';
      if (importTier === 'phong') endpoint = '/api/structure/phong';
      else if (importTier === 'ad') endpoint = '/api/structure/ad';
      else if (importTier === 'bannhom') endpoint = '/api/structure/bannhom';
      else if (importTier === 'tvv') endpoint = '/api/structure/tvv';
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(records) });
      if (res.ok) {
        fetchPhong(); fetchAD(); fetchBanNhom(); fetchTvvStruct();
        setImportData(''); setImportTier(''); setImportFile(null); setImportPreview([]);
        toast({ title: 'Import thành công', description: `Đã import ${records.length} bản ghi` });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Lỗi import', description: err.error || 'Kiểm tra lại dữ liệu', variant: 'destructive' });
      }
    } catch (e) { console.error('Import error', e); toast({ title: 'Lỗi import', variant: 'destructive' }); }
    finally { setImportLoading(false); }
  }, [importData, importTier, importPreview, fetchPhong, fetchAD, fetchBanNhom, fetchTvvStruct]);

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
      if (sheetName === 'leaders') data = leaders.map(l => ({ 'Mã số': l.agentCode, 'Họ tên': l.agentName, 'Chức vụ': l.position, 'Ban': l.ban, 'Nhóm': l.nhom, 'Mã nhóm': l.maNhom, 'Tiền/tháng': l.salary, 'SĐT': l.phone, 'Email': l.email, 'Ngày bắt đầu': l.startDate ? new Date(l.startDate).toLocaleDateString('vi-VN') : '', 'Ghi chú': l.note }));
      else if (sheetName === 'revenue') data = revenue.map(r => ({ 'Tháng': r.month, 'Mã nhóm': r.maNhom, 'Nhóm': r.nhom, 'Mã TVV': r.agentCode, 'Tên TVV': r.agentName, 'Tổng IP': r.totalFYP, 'Tổng AFYP': r.totalAFYP, 'Số HĐ': r.contractCount, 'Lượt HĐ': r.activityRounds, 'Ghi chú': r.note }));
      else if (sheetName === 'contracts') data = contracts.map((c, idx) => ({ 'STT': idx + 1, 'Ban': c.ban, 'Nhóm': c.nhom, 'Mã Ban/Nhóm': c.maNhom || c.maBanNhom, 'Mã ĐL': c.agentCode || c.maDL, 'Tên': c.agentName, 'Chức vụ': c.position, 'Ngày bắt đầu làm việc': c.ngayBatDauLamViec ? new Date(c.ngayBatDauLamViec).toLocaleDateString('vi-VN') : '', 'Số hợp đồng': c.contractNumber, 'Ngày hiệu lực': new Date(c.effectiveDate).toLocaleDateString('vi-VN'), 'Ngày phát hành': new Date(c.issueDate).toLocaleDateString('vi-VN'), 'PĐT + 10% ĐT': c.pdt10DT, 'AFYP': c.afyp, 'AD': c.ad, 'TÍNH LƯỢT 3 tr': c.tinhLuot3tr, 'MÃ ĐL TD': c.maDaiLyTD }));
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
  // Helper: convert various date formats to ISO string (yyyy-mm-dd) - timezone safe
  // CRITICAL FIX: XLSX cellDates:true creates Date in LOCAL timezone (UTC+7),
  // but previous code used getUTC* methods → dates shifted back 1 day
  // (e.g. May 1 local = April 30 17:00 UTC → getUTCDate returns 30 = April!)
  // Fix: use LOCAL get* methods for XLSX Date objects, UTC for everything else
  const parseDateValue = useCallback((val: any): string | null => {
    if (!val || val === '' || val === '—') return null;
    // Already a Date object - XLSX with cellDates:true creates LOCAL timezone Date objects
    // MUST use getFullYear/getMonth/getDate (NOT getUTC*) because XLSX creates dates in local tz
    // Example: 01/05/2026 in Excel → new Date(2026,4,1) → local midnight → getUTCDate()=30 (wrong!)
    if (val instanceof Date) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      // Validate: reasonable year range
      if (y < 1900 || y > 2100) return null;
      return `${y}-${m}-${d}`;
    }
    // String date formats
    if (typeof val === 'string') {
      // yyyy-mm-dd
      if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
      // dd/mm/yyyy (Vietnamese format)
      const dmy = val.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
      if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
      // Try native parse - use local methods since non-ISO strings create local tz Dates
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        if (y < 1900 || y > 2100) return null;
        return `${y}-${m}-${day}`;
      }
    }
    // Excel serial number (days since 1899-12-30)
    // Serial numbers are timezone-neutral, use UTC conversion
    if (typeof val === 'number' && val > 1000) {
      const d = new Date((val - 25569) * 86400 * 1000);
      if (!isNaN(d.getTime())) {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        if (y < 1900 || y > 2100) return null;
        return `${y}-${m}-${day}`;
      }
    }
    return null;
  }, []);

  const handleImport = useCallback(async (sheetName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: true });
      if (!data.length) { toast({ title: 'File trống', variant: 'destructive' }); e.target.value = ''; return; }

      let successCount = 0;
      let failCount = 0;

      if (sheetName === 'leaders') {
        const rows = data.map((r: any) => ({ agentCode: String(r['Mã số'] || r['agentCode'] || ''), agentName: String(r['Họ tên'] || r['agentName'] || ''), position: String(r['Chức vụ'] || r['position'] || ''), ban: String(r['Ban'] || r['ban'] || ''), nhom: String(r['Nhóm'] || r['nhom'] || ''), maNhom: String(r['Mã nhóm'] || r['maNhom'] || ''), salary: parseFloat(String(r['Tiền/tháng'] || r['salary'] || '0').replace(/,/g, '')) || 0, phone: String(r['SĐT'] || r['phone'] || ''), email: String(r['Email'] || r['email'] || ''), note: String(r['Ghi chú'] || r['note'] || ''), startDate: parseDateValue(r['Ngày bắt đầu'] || r['startDate']) })).filter(r => r.agentCode || r.agentName);
        // Batch import - send all rows in one API call
        const r = await fetch('/api/leaders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rows) });
        if (r.ok) { const result = await r.json(); successCount = result.count || rows.length; } else {
          failCount = rows.length;
          const errData = await r.json().catch(() => ({}));
          toast({ title: 'Lỗi import TB/TN', description: errData.error || 'Kiểm tra lại dữ liệu', variant: 'destructive' });
        }
      } else if (sheetName === 'revenue') {
        const rows = data.map((r: any) => {
          // With raw:true, numbers come as numbers. Handle both types.
          const parseNum = (v: any) => typeof v === 'number' ? v : parseFloat(String(v || '0').replace(/,/g, '')) || 0;
          const parseIntVal = (v: any) => typeof v === 'number' ? Math.round(v) : parseInt(String(v || '0').replace(/,/g, '')) || 0;
          return {
            month: String(r['Tháng'] || r['Month'] || r['month'] || ''),
            maNhom: String(r['Mã nhóm'] || r['maNhom'] || ''),
            nhom: String(r['Nhóm'] || r['nhom'] || ''),
            agentCode: String(r['Mã TVV'] || r['agentCode'] || ''),
            agentName: String(r['Tên TVV'] || r['agentName'] || ''),
            totalFYP: parseNum(r['Tổng IP'] || r['totalFYP']),
            totalAFYP: parseNum(r['Tổng AFYP'] || r['totalAFYP']),
            contractCount: parseIntVal(r['Số HĐ'] || r['contractCount']),
            activityRounds: parseIntVal(r['Lượt HĐ'] || r['activityRounds']),
            note: String(r['Ghi chú'] || r['note'] || ''),
          };
        }).filter(r => r.month || r.agentCode || r.agentName);
        if (rows.length === 0) { toast({ title: 'Không có dữ liệu hợp lệ', description: 'Kiểm tra lại cột Tháng, Mã TVV, Tên TVV', variant: 'destructive' }); }
        else {
          const r = await fetch('/api/revenue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ members: rows }) });
          if (r.ok) { const result = await r.json(); successCount = result.count || rows.length; }
          else {
            failCount = rows.length;
            const errData = await r.json().catch(() => ({}));
            console.warn('[Import revenue] Failed:', errData.error);
            toast({ title: 'Lỗi import doanh số', description: errData.error || 'Kiểm tra lại dữ liệu', variant: 'destructive' });
          }
        }
      } else if (sheetName === 'contracts') {
        // Batch import - prepare all rows then send in one API call
        const contractRows = [];
        for (const r of data) {
          const row = r as any;
          const effectiveDate = parseDateValue(row['Ngày hiệu lực'] || row['Ngày hl'] || row['effectiveDate']);
          const contractNumber = String(row['Số hợp đồng'] || row['Số HĐ'] || row['contractNumber'] || '').trim();
          const agentName = String(row['Tên'] || row['Họ tên'] || row['Tên TVV'] || row['agentName'] || '').trim();
          const fyp = parseFloat(String(row['FYP'] || row['IP'] || row['PĐT + 10% ĐT'] || row['fyp'] || row['pdt10DT'] || '0').replace(/,/g, '')) || 0;

          // Skip rows without minimum required data
          if (!contractNumber && !agentName) { failCount++; continue; }

          contractRows.push({
            stt: parseInt(String(row['STT'] || row['stt'] || '0').replace(/,/g, '')) || 0,
            ban: String(row['Ban'] || row['ban'] || '').trim(),
            maTruongBan: String(row['Mã trưởng ban'] || row['maTruongBan'] || '').trim(),
            nhom: String(row['Nhóm'] || row['nhom'] || '').trim(),
            maBanNhom: String(row['Mã Ban/Nhóm'] || row['Mã ban/nhóm'] || row['maBanNhom'] || '').trim(),
            maTruongBanNhom: String(row['Mã trưởng Ban/Nhóm'] || row['maTruongBanNhom'] || '').trim(),
            maDL: String(row['Mã ĐL'] || row['Mã đại lý'] || row['maDL'] || '').trim(),
            agentCode: String(row['Mã TVV'] || row['agentCode'] || row['Mã ĐL'] || row['Mã đại lý'] || '').trim(),
            agentName: agentName || 'Chưa nhập',
            position: String(row['Chức vụ'] || row['position'] || '').trim(),
            ngayBatDauLamViec: parseDateValue(row['Ngày bắt đầu làm việc'] || row['Ngày bắt đầu LV'] || row['Ngày BĐLV'] || row['ngayBatDauLamViec']),
            contractNumber: contractNumber || 'HD_' + Date.now() + '_' + contractRows.length,
            effectiveDate: effectiveDate || new Date().toISOString().slice(0, 10),
            issueDate: parseDateValue(row['Ngày phát hành'] || row['Ngày cấp'] || row['Ngày PH'] || row['issueDate']) || effectiveDate || new Date().toISOString().slice(0, 10),
            pdt10DT: parseFloat(String(row['PĐT + 10% ĐT'] || row['PĐT+10%ĐT'] || row['IP+10%PĐT'] || row['pdt10DT'] || '0').replace(/,/g, '')) || 0,
            fyp: fyp || parseFloat(String(row['PĐT + 10% ĐT'] || row['pdt10DT'] || '0').replace(/,/g, '')) || 0,
            nguonDuLieu: String(row['Nguồn dữ liệu'] || row['nguonDuLieu'] || '').trim(),
            hopDongToChuc: String(row['Hợp đồng tổ chức'] || row['hopDongToChuc'] || '').trim(),
            dkDongPhi: String(row['ĐK ĐÓNG PHÍ'] || row['dkDongPhi'] || '').trim(),
            phiDongThem: parseFloat(String(row['PHÍ ĐÓNG THÊM'] || row['phiDongThem'] || '0').replace(/,/g, '')) || 0,
            afypChuaTru10DT: parseFloat(String(row['AFYP chưa trừ 10% ĐT'] || row['afypChuaTru10DT'] || '0').replace(/,/g, '')) || 0,
            afyp: parseFloat(String(row['AFYP'] || row['afyp'] || '0').replace(/,/g, '')) || 0,
            ad: String(row['AD'] || row['ad'] || '').trim(),
            nhom2: String(row['NHÓM'] || row['nhom2'] || '').trim(),
            ngayBatDauLamViec2: parseDateValue(row['NGÀY BẮT ĐẦU LÀM VIỆC'] || row['ngayBatDauLamViec2']),
            thangTD: parseInt(String(row['THÁNG TD'] || row['thangTD'] || '0').replace(/,/g, '')) || 0,
            namTD: parseInt(String(row['NĂM TD'] || row['namTD'] || '0').replace(/,/g, '')) || 0,
            thangHL: parseInt(String(row['THÁNG HL'] || row['thangHL'] || '0').replace(/,/g, '')) || 0,
            tinhLuot3tr: parseFloat(String(row['TÍNH LƯỢT 3 tr'] || row['TÍNH LƯỢT 3TR'] || row['TÍNH LƯỢT 3tr'] || row['Tính lượt 3tr'] || row['Tính lượt 3 tr'] || row['tinhLuot3tr'] || '0').replace(/,/g, '')) || 0,
            maDaiLyTD: String(row['MÃ ĐL TD'] || row['Mã đại lý tuyển dụng'] || row['Mã NTD'] || row['MÃ ĐLTD'] || row['maDaiLyTD'] || '').trim(),
            danhDauTVV: String(row['ĐÁNH DẤU TVVm TUYỂN DỤNG QUÝ 1'] || row['danhDauTVV'] || '').trim(),
            chucVu2: String(row['Chức vụ'] || row['chucVu2'] || '').trim(),
            maNhom: String(row['Mã nhóm'] || row['maNhom'] || row['Mã Ban/Nhóm'] || '').trim(),
          });
        }
        if (contractRows.length > 0) {
          // Upsert mode: chỉ cập nhật HĐ theo số HĐ, không xóa HĐ cũ
          console.log(`[Import contracts] ${contractRows.length} rows (upsert mode)`);
          const resp = await fetch('/api/contracts', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contracts: contractRows })
          });
          if (resp.ok) { 
            const result = await resp.json(); 
            successCount = result.count || contractRows.length;
            const updatedInfo = result.updated > 0 ? ` | Cập nhật ${result.updated} HĐ` : '';
            const errorInfo = result.errors > 0 ? ` | ${result.errors} lỗi` : '';
            toast({ title: 'Import thành công', description: `${result.count} HĐ mới${updatedInfo}${errorInfo}` });
            // Auto-sync revenue from contracts after successful import
            try {
              const syncRes = await fetch('/api/revenue/sync-from-contracts', { method: 'POST' });
              if (syncRes.ok) {
                const syncData = await syncRes.json();
                console.log('[Auto-sync revenue]', syncData.message);
              }
            } catch { /* silent - revenue sync is optional */ }
          }
          else {
            failCount = contractRows.length;
            const errData = await resp.json().catch(() => ({}));
            console.warn('[Import contracts] Batch failed:', errData.error);
            toast({ title: 'Lỗi import HĐ', description: errData.error || 'Kiểm tra lại dữ liệu', variant: 'destructive' });
          }
        }
      } else if (sheetName === 'staff') {
        const members = data.map((r: any) => ({ agentCode: String(r['Mã số'] || r['agentCode'] || ''), agentName: String(r['Họ tên'] || r['agentName'] || ''), position: String(r['Chức vụ'] || r['position'] || ''), nhom: String(r['Nhóm'] || r['nhom'] || ''), maNhom: String(r['Mã nhóm'] || r['maNhom'] || ''), startDate: parseDateValue(r['Ngày bắt đầu'] || r['startDate']) })).filter(m => m.agentCode || m.agentName);
        if (members.length) {
          const r = await fetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ members }) });
          if (r.ok) { const result = await r.json(); successCount = result.count || members.length; } else {
            failCount = members.length;
            const errData = await r.json().catch(() => ({}));
            toast({ title: 'Lỗi import nhân sự', description: errData.error || 'Kiểm tra lại dữ liệu', variant: 'destructive' });
          }
        }
      } else if (sheetName === 'recruiters') {
        const members = data.map((r: any) => ({ nhom: String(r['Nhóm'] || r['nhom'] || ''), agentCode: String(r['Mã số'] || r['agentCode'] || ''), agentName: String(r['Họ tên'] || r['agentName'] || ''), position: String(r['Chức vụ'] || r['position'] || ''), startDate: parseDateValue(r['Ngày bắt đầu'] || r['startDate']) })).filter(m => m.agentCode || m.agentName);
        if (members.length) {
          const r = await fetch('/api/recruiters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ members }) });
          if (r.ok) { const result = await r.json(); successCount = result.count || members.length; } else {
            failCount = members.length;
            const errData = await r.json().catch(() => ({}));
            toast({ title: 'Lỗi import người TD', description: errData.error || 'Kiểm tra lại dữ liệu', variant: 'destructive' });
          }
        }
      }
      if (failCount > 0) {
        toast({ title: 'Import hoàn tất', description: `Thành công: ${successCount} dòng | Lỗi: ${failCount} dòng`, variant: 'destructive' });
      } else if (sheetName !== 'contracts') {
        // Contracts already shows its own toast with replace info
        toast({ title: 'Import thành công', description: `${successCount} dòng` });
      }
    } catch (err) {
      console.error('[handleImport] Error:', err);
      toast({ title: 'Lỗi import', description: String(err), variant: 'destructive' });
    }
    // Reload all data after import (await to prevent race conditions)
    await fetchAllData();
    e.target.value = '';
  }, [parseDateValue, fetchAllData]);

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
    <ArrowUpDown className={`w-3 h-3 inline ml-1 ${sortField === field ? 'text-amber-400' : 'text-emerald-200'}`} />
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

  // Computed values from Contract data (file doanh thu năm)
  // Use current year contracts for all calculations
  const currentYear = new Date().getFullYear();
  const yearContracts = contracts.filter(c => {
    const d = new Date(c.effectiveDate);
    return !isNaN(d.getTime()) && d.getFullYear() === currentYear;
  });

  const totalRevenue = yearContracts.reduce((s, c) => s + c.pdt10DT, 0); // IP + 10% PĐT
  const totalRevenueAFYP = yearContracts.reduce((s, c) => s + c.afyp, 0);
  const totalRevenueContractCount = yearContracts.length; // Số lượng HĐ = số dòng

  // Lượt HĐ = đếm số dòng hợp đồng có tinhLuot3tr >= 3,000,000
  const luotHoatDong = yearContracts.filter(c => c.tinhLuot3tr >= 3000000).length;
  // Lượt HĐ chuẩn = đếm số dòng hợp đồng có tinhLuot3tr >= 12,000,000
  const luotHDChuan = yearContracts.filter(c => c.tinhLuot3tr >= 12000000).length;

  // TVV đạt 3tr
  const tvvAchieved3M = luotHoatDong;
  const tvvAchieved12M = luotHDChuan;

  // IP/AFYP (%) = (IP + 10% PĐT) / AFYP * 100
  const ipAfypRatio = totalRevenueAFYP > 0 ? (totalRevenue / totalRevenueAFYP) * 100 : 0;

  // Độ lớn hợp đồng (ĐLHĐ) = Tổng AFYP / Lượt HĐ (số TVV có tinhLuot3tr >= 3tr)
  const doLonHD = luotHoatDong > 0 ? totalRevenueAFYP / luotHoatDong : 0;

  // Năng suất = SL hợp đồng / Lượt HĐ (số TVV có tinhLuot3tr >= 3tr)
  const nangSuat = luotHoatDong > 0 ? totalRevenueContractCount / luotHoatDong : 0;

  // SL tuyển dụng = đếm TVV có ngày bắt đầu làm việc trong năm hiện tại (từ cấu trúc)
  const slTuyenDungNam = tvvStructList.filter(t => {
    if (!t.ngayBatDau) return false;
    const d = new Date(t.ngayBatDau);
    return !isNaN(d.getTime()) && d.getFullYear() === currentYear;
  }).length;

  // NTD hoạt động: count unique maDaiLyTD that exist in recruiters
  const ntdCodes = new Set(recruiters.map(r => r.agentCode));
  const activeNTDCount = new Set<string>();
  for (const c of yearContracts) {
    if (c.maDaiLyTD && ntdCodes.has(c.maDaiLyTD)) activeNTDCount.add(c.maDaiLyTD);
  }

  // Target values from settings
  const targetTongIP = parseFloat(onlineSettings['nmc-target-tong-ip'] || '0') || 0;
  const targetTongAFYP = parseFloat(onlineSettings['nmc-target-tong-afyp'] || '0') || 0;
  const targetTongSLHD = parseFloat(onlineSettings['nmc-target-tong-sl-hd'] || '0') || 0;
  const targetLuotHD = parseFloat(onlineSettings['nmc-target-luot-hd'] || '0') || 0;
  const targetLuotHDChuan = parseFloat(onlineSettings['nmc-target-luot-hd-chuan'] || '0') || 0;
  const targetNangSuat = parseFloat(onlineSettings['nmc-target-nang-suat'] || '0') || 0;
  const targetDLHD = parseFloat(onlineSettings['nmc-target-dlhd'] || '0') || 0;
  const targetSLTBTN = parseFloat(onlineSettings['nmc-target-sl-tb-tn'] || '0') || 0;
  const targetSLNTD = parseFloat(onlineSettings['nmc-target-sl-ntd'] || '0') || 0;
  const targetSLTuyenDung = parseFloat(onlineSettings['nmc-target-sl-tuyen-dung'] || '0') || 0;

  // Edit state for indicator targets
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [targetInput, setTargetInput] = useState('');

  const handleSaveTarget = useCallback((key: string) => {
    const val = parseFloat(targetInput) || 0;
    saveSetting(key, String(val));
    setEditingTarget(null);
    toast({ title: 'Đã lưu chỉ tiêu', description: `Mục tiêu: ${val > 0 ? formatNumber(val) : 'Chưa đặt'}` });
  }, [targetInput, saveSetting]);

  // Overview KPI data sources
  const overviewDataSources: KPIDataSource[] = [
    {
      key: 'leaders', label: 'TB/TN', data: leaders,
      fields: [
        { key: 'salary', label: 'Tiền/tháng', type: 'number' },
        { key: 'agentCode', label: 'Mã số (count)', type: 'string' },
      ],
    },
    {
      key: 'staff', label: 'TVV', data: staff,
      fields: [
        { key: 'agentCode', label: 'Mã số (count)', type: 'string' },
      ],
    },
    {
      key: 'contracts', label: 'Hợp đồng', data: contracts,
      fields: [
        { key: 'fyp', label: 'FYP', type: 'number' },
        { key: 'afyp', label: 'AFYP', type: 'number' },
        { key: 'pdt10DT', label: 'PĐT + 10% ĐT', type: 'number' },
        { key: 'phiDongThem', label: 'Phí đóng thêm', type: 'number' },
        { key: 'tinhLuot3tr', label: 'Lượt HĐ (≥3tr)', type: 'number' },
        { key: 'stt', label: 'STT', type: 'number' },
      ],
    },
    {
      key: 'revenue', label: 'Doanh số', data: revenue,
      fields: [
        { key: 'totalFYP', label: 'Tổng IP', type: 'number' },
        { key: 'totalAFYP', label: 'Tổng AFYP', type: 'number' },
        { key: 'contractCount', label: 'Số HĐ', type: 'number' },
        { key: 'activityRounds', label: 'Lượt HĐ', type: 'number' },
      ],
    },
    {
      key: 'recruiters', label: 'NTD', data: recruiters,
      fields: [
        { key: 'agentCode', label: 'Mã số (count)', type: 'string' },
      ],
    },
  ];

  const overviewDefaultKPIs: KPIConfig[] = [
    { id: 'ov-tb-tn', label: 'Trưởng Ban/Nhóm', dataSourceKey: 'leaders', field: 'salary', calculation: 'count', color: 'emerald' },
    { id: 'ov-tvv', label: 'Tổng TVV', dataSourceKey: 'staff', field: 'agentCode', calculation: 'count', color: 'sky' },
    { id: 'ov-ntd', label: 'Người TD', dataSourceKey: 'recruiters', field: 'agentCode', calculation: 'count', color: 'violet' },
    { id: 'ov-hd', label: 'Tổng HĐ', dataSourceKey: 'revenue', field: 'contractCount', calculation: 'sum', color: 'amber' },
    { id: 'ov-dt', label: 'Tổng DT', dataSourceKey: 'revenue', field: 'totalFYP', calculation: 'sum', color: 'emerald' },
    { id: 'ov-luong', label: 'Tổng lương TN', dataSourceKey: 'leaders', field: 'salary', calculation: 'sum', color: 'sky' },
  ];

  // Annual revenue target (Mục doanh số năm) — shared across all overview KPIs
  const annualRevenueTarget = parseFloat(onlineSettings['nmc-annual-revenue-target'] || '0') || 0;
  const [editingAnnualTarget, setEditingAnnualTarget] = useState(false);
  const [annualTargetInput, setAnnualTargetInput] = useState('');

  const handleSaveAnnualTarget = useCallback(() => {
    const val = parseFloat(annualTargetInput) || 0;
    saveSetting('nmc-annual-revenue-target', String(val));
    setEditingAnnualTarget(false);
    toast({ title: 'Đã lưu mục doanh số năm', description: formatCurrency(val) });
  }, [annualTargetInput, saveSetting]);

  // Indicator card component for revenue-based KPIs
  const IndicatorCard = ({ label, value, target, settingKey, formatType, icon }: {
    label: string; value: number; target: number; settingKey: string;
    formatType: 'currency' | 'number' | 'decimal'; icon: React.ElementType;
  }) => {
    const Icon = icon;
    const isEditing = editingTarget === settingKey;
    const pct = target > 0 ? Math.min((value / target) * 100, 100) : undefined;
    const formatVal = () => {
      if (formatType === 'currency') return formatCurrency(value);
      if (formatType === 'decimal') return value.toFixed(1);
      return formatNumber(value);
    };
    const formatTarget = () => {
      if (formatType === 'currency') return formatCurrency(target);
      if (formatType === 'decimal') return target.toFixed(1);
      return formatNumber(target);
    };

    return (
      <div className="bg-[#0e0e18]/80 backdrop-blur-md border border-emerald-500/30 rounded-lg p-3" style={{ boxShadow: '0 0 12px rgba(0, 255, 136, 0.1)' }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-white/80" />
            <p className="text-white/80 text-[10px] font-bold">{label}</p>
          </div>
          <button
            className="text-amber-400/60 hover:text-amber-300 text-[9px]"
            onDoubleClick={() => { setEditingTarget(settingKey); setTargetInput(String(target || '')); }}
            title="Nháy đúp để sửa chỉ tiêu"
          >
            <Edit2 className="w-2.5 h-2.5" />
          </button>
        </div>
        <p className="text-white text-sm font-extrabold truncate">{formatVal()}</p>
        {isEditing ? (
          <div className="flex items-center gap-1 mt-1">
            <Input
              type="number"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder="Chỉ tiêu..."
              className="h-5 text-[10px] bg-gray-800 border-amber-500/50 text-white flex-1"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTarget(settingKey); if (e.key === 'Escape') setEditingTarget(null); }}
              autoFocus
            />
            <Button onClick={() => handleSaveTarget(settingKey)} className="h-5 bg-amber-500/20 text-amber-300 text-[9px] px-1.5 py-0">Lưu</Button>
          </div>
        ) : target > 0 ? (
          <div className="mt-1">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-gray-300">CT: {formatTarget()}</span>
              <span className={`font-bold ${pct && pct >= 100 ? 'text-emerald-300' : pct && pct >= 70 ? 'text-amber-300' : 'text-rose-300'}`}>{pct?.toFixed(0)}%</span>
            </div>
            <Progress value={pct || 0} className="h-1.5 mt-0.5 bg-emerald-800 [&>div]:bg-emerald-400" />
          </div>
        ) : (
          <p className="text-[9px] text-gray-500 mt-1">Nháy đúp ✏️ để đặt chỉ tiêu</p>
        )}
      </div>
    );
  };

  const renderOverview = () => (
    <div className="space-y-4">
      {/* Header with sync status */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-emerald-400 neon-text drop-shadow-[0_0_6px_rgba(0,255,136,0.3)]">Tổng quan năm {currentYear}</h2>
        {lastSyncTime && (
          <span className="text-[10px] text-emerald-400/60 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Đồng bộ lúc {lastSyncTime}
          </span>
        )}
      </div>

      {/* Row 1: Core Revenue KPIs - 5 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'TỔNG AFYP', value: formatCurrency(totalRevenueAFYP), target: targetTongAFYP, targetFmt: formatCurrency(targetTongAFYP), color: 'bg-sky-500/20 border-sky-500/30', icon: DollarSign },
          { label: 'TỔNG IP', value: formatCurrency(totalRevenue), target: targetTongIP, targetFmt: formatCurrency(targetTongIP), color: 'bg-emerald-500/20 border-emerald-500/30', icon: DollarSign },
          { label: 'TỶ TRONG IP', value: ipAfypRatio.toFixed(1) + '%', color: 'bg-cyan-500/20 border-cyan-500/30', icon: Percent },
          { label: 'LƯỢT HĐ', value: formatNumber(luotHoatDong), target: targetLuotHD, targetFmt: formatNumber(targetLuotHD), color: 'bg-violet-500/20 border-violet-500/30', icon: Hash },
          { label: 'LƯỢT HĐ CHUẨN', value: formatNumber(luotHDChuan), target: targetLuotHDChuan, targetFmt: formatNumber(targetLuotHDChuan), color: 'bg-rose-500/20 border-rose-500/30', icon: CheckCircle2 },
        ].map((kpi, i) => {
          const pct = kpi.target > 0 ? Math.min((parseFloat(String(kpi.value).replace(/[^\d.-]/g, '')) || 0) / kpi.target * 100, 100) : 0;
          return (
            <div key={i} className={`${kpi.color} border rounded-lg p-3 backdrop-blur-sm`} style={{ boxShadow: '0 0 12px rgba(0, 255, 136, 0.1)' }}>
              <div className="flex items-center gap-1.5 mb-1.5"><kpi.icon className="w-4 h-4 text-white/80" /><p className="text-white/80 text-[10px] font-bold leading-tight">{kpi.label}</p></div>
              <p className="text-white text-base font-extrabold truncate">{kpi.value}</p>
              {kpi.target > 0 ? (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-gray-300">CT: {kpi.targetFmt}</span>
                    <span className={`font-bold ${pct >= 100 ? 'text-emerald-300' : pct >= 70 ? 'text-amber-300' : 'text-rose-300'}`}>{pct.toFixed(0)}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5 mt-0.5 bg-gray-800 [&>div]:bg-emerald-400" />
                </div>
              ) : (
                <div className="mt-2 h-[22px]"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Row 2: Secondary KPIs - 6 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'SL HĐ', value: formatNumber(totalRevenueContractCount), target: targetTongSLHD, targetFmt: formatNumber(targetTongSLHD), color: 'bg-amber-500/20 border-amber-500/30', icon: FileText },
          { label: 'NĂNG SUẤT', value: nangSuat.toFixed(2), target: targetNangSuat, targetFmt: targetNangSuat.toFixed(1), color: 'bg-sky-500/20 border-sky-500/30', icon: TrendingUp },
          { label: 'ĐLHĐ', value: formatCurrency(doLonHD), target: targetDLHD, targetFmt: formatCurrency(targetDLHD), color: 'bg-emerald-500/20 border-emerald-500/30', icon: BarChart3 },
          { label: 'SL TB/TN', value: formatNumber(totalLeaders), target: targetSLTBTN, targetFmt: formatNumber(targetSLTBTN), color: 'bg-violet-500/20 border-violet-500/30', icon: Users },
          { label: 'SL NTD', value: formatNumber(totalRecruiters), target: targetSLNTD, targetFmt: formatNumber(targetSLNTD), color: 'bg-amber-500/20 border-amber-500/30', icon: UserCircle },
          { label: 'SL TUYỂN DỤNG', value: formatNumber(slTuyenDungNam), target: targetSLTuyenDung, targetFmt: formatNumber(targetSLTuyenDung), color: 'bg-emerald-500/20 border-emerald-500/30', icon: UserPlus },
        ].map((kpi, i) => {
          const pct = kpi.target > 0 ? Math.min((parseFloat(String(kpi.value).replace(/[^\d.-]/g, '')) || 0) / kpi.target * 100, 100) : 0;
          return (
            <div key={i} className={`${kpi.color} border rounded-lg p-3 backdrop-blur-sm`} style={{ boxShadow: '0 0 12px rgba(0, 255, 136, 0.1)' }}>
              <div className="flex items-center gap-1.5 mb-1.5"><kpi.icon className="w-4 h-4 text-white/80" /><p className="text-white/80 text-[10px] font-bold leading-tight">{kpi.label}</p></div>
              <p className="text-white text-base font-extrabold truncate">{kpi.value}</p>
              {kpi.target > 0 ? (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-gray-300">CT: {kpi.targetFmt}</span>
                    <span className={`font-bold ${pct >= 100 ? 'text-emerald-300' : pct >= 70 ? 'text-amber-300' : 'text-rose-300'}`}>{pct.toFixed(0)}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5 mt-0.5 bg-gray-800 [&>div]:bg-emerald-400" />
                </div>
              ) : (
                <div className="mt-2 h-[22px]"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Monthly Plan Targets Overview (Kế hoạch AFYP từng tháng) */}
      <div className="bg-[#0e0e18]/80 backdrop-blur-md border border-emerald-500/30 rounded-lg p-3">
        <h3 className="text-xs font-bold text-emerald-300 mb-2 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" /> Kế hoạch AFYP từng tháng
        </h3>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
          {Array.from({ length: 12 }, (_, i) => {
            const m = String(i + 1).padStart(2, '0');
            const target = parseFloat(onlineSettings[`nmc-target-afyp-month-${m}`] || '0') || 0;
            const mc = yearContracts.filter(c => {
              const d = new Date(c.effectiveDate);
              return !isNaN(d.getTime()) && d.getFullYear() === currentYear && String(d.getMonth() + 1).padStart(2, '0') === m;
            });
            const actualAFYP = mc.reduce((s, c) => s + c.afyp, 0);
            const pct = target > 0 ? Math.min((actualAFYP / target) * 100, 100) : 0;
            const isCurrent = i + 1 === new Date().getMonth() + 1;
            return (
              <div key={i} className={`bg-gray-800/60 border rounded-md p-1.5 text-center ${isCurrent ? 'border-emerald-500/50 ring-1 ring-emerald-400/30' : 'border-emerald-500/20'}`}>
                <p className={`text-[9px] font-bold mb-0.5 ${isCurrent ? 'text-emerald-300' : 'text-gray-400'}`}>T{i + 1}</p>
                <p className="text-[8px] text-amber-300 font-bold">{target > 0 ? (target >= 1_000_000 ? `${(target / 1_000_000).toFixed(0)}tr` : formatNumber(target)) : '—'}</p>
                <p className={`text-[8px] font-bold ${pct >= 100 ? 'text-emerald-300' : pct >= 70 ? 'text-amber-300' : actualAFYP > 0 ? 'text-sky-300' : 'text-gray-600'}`}>
                  {actualAFYP > 0 ? (actualAFYP >= 1_000_000 ? `${(actualAFYP / 1_000_000).toFixed(1)}tr` : formatNumber(Math.round(actualAFYP))) : '—'}
                </p>
                {target > 0 && <Progress value={pct} className="h-0.5 mt-0.5 bg-gray-700 [&>div]:bg-emerald-400" />}
                {pct >= 100 && <p className="text-[7px] text-emerald-300 font-bold">✓</p>}
              </div>
            );
          })}
        </div>
        <p className="text-[8px] text-gray-500 mt-1">Nháy ✏️ ở cài đặt để sửa KH. Tổng KH: {formatCurrency(Array.from({length: 12}, (_, i) => parseFloat(onlineSettings[`nmc-target-afyp-month-${String(i+1).padStart(2,'0')}`] || '0') || 0).reduce((s, t) => s + t, 0))}</p>
      </div>

      {/* Monthly AFYP Progress Chart */}
      {(() => {
        const monthlyTarget = targetTongAFYP > 0 ? targetTongAFYP / 12 : 0;
        const monthlyData = Array.from({ length: 12 }, (_, i) => {
          const m = String(i + 1).padStart(2, '0');
          const mc = yearContracts.filter(c => {
            const d = new Date(c.effectiveDate);
            return !isNaN(d.getTime()) && d.getFullYear() === currentYear && String(d.getMonth() + 1).padStart(2, '0') === m;
          });
          return { month: m, index: i, afyp: mc.reduce((s, c) => s + c.afyp, 0), ip: mc.reduce((s, c) => s + c.pdt10DT, 0), count: mc.length };
        });
        const maxAfyp = Math.max(...monthlyData.map(d => d.afyp), ...Array.from({length: 12}, (_, i) => parseFloat(onlineSettings[`nmc-target-afyp-month-${String(i+1).padStart(2,'0')}`] || '0') || 0).filter(v => v > 0), monthlyTarget || 1);
        return (
          <div className="bg-[#0e0e18]/80 backdrop-blur-md border border-emerald-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4" /> Tiến độ AFYP hàng tháng
              </h3>
              {monthlyTarget > 0 && (
                <span className="text-[10px] text-gray-400">Mục tiêu/tháng: {formatCurrency(Math.round(monthlyTarget))}</span>
              )}
            </div>
            <div className="flex items-end gap-1.5 h-[180px]">
              {monthlyData.map(d => {
                const barHeight = maxAfyp > 0 ? (d.afyp / maxAfyp) * 100 : 0;
                const specificTarget = parseFloat(onlineSettings[`nmc-target-afyp-month-${d.month}`] || '0') || monthlyTarget;
                const targetLine = specificTarget > 0 ? (specificTarget / maxAfyp) * 100 : 0;
                const isComplete = d.afyp > 0;
                const reached = specificTarget > 0 && d.afyp >= specificTarget;
                const currentMonth = new Date().getMonth() + 1;
                const isCurrent = d.index + 1 === currentMonth;
                return (
                  <div key={d.month} className="flex-1 flex flex-col items-center relative" style={{ height: '100%' }}>
                    {specificTarget > 0 && (
                      <div className="absolute w-full border-t border-dashed border-amber-400/60 z-10" style={{ bottom: `${targetLine}%` }} title={`CT: ${formatCurrency(Math.round(specificTarget))}`}></div>
                    )}
                    <div className="flex-1 w-full flex items-end justify-center">
                      <div
                        className={`w-full max-w-[32px] rounded-t-sm transition-all ${reached ? 'bg-emerald-500/70' : isComplete ? 'bg-sky-500/60' : 'bg-gray-700/30'} ${isCurrent ? 'ring-1 ring-emerald-400/50' : ''}`}
                        style={{ height: `${Math.max(barHeight, 1)}%` }}
                        title={`T${d.index + 1}: AFYP ${formatCurrency(d.afyp)} | IP ${formatCurrency(d.ip)} | ${d.count} HĐ${specificTarget > 0 ? ` | CT: ${formatCurrency(Math.round(specificTarget))}` : ''}`}
                      ></div>
                    </div>
                    <p className={`text-[9px] mt-1 font-bold ${isCurrent ? 'text-emerald-300' : 'text-gray-400'}`}>T{d.index + 1}</p>
                    {isComplete && (
                      <p className={`text-[8px] font-bold ${reached ? 'text-emerald-300' : 'text-sky-300'}`}>
                        {d.afyp >= 1_000_000 ? `${(d.afyp / 1_000_000).toFixed(1)}tr` : formatNumber(Math.round(d.afyp))}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-2 text-[9px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-sky-500/60 rounded-sm inline-block"></span> AFYP</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-emerald-500/70 rounded-sm inline-block"></span> Đạt CT</span>
              {monthlyTarget > 0 && <span className="flex items-center gap-1"><span className="w-4 border-t border-dashed border-amber-400/60 inline-block"></span> Mục tiêu</span>}
            </div>
          </div>
        );
      })()}
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
            { label: 'Tổng TB/TN', value: formatNumber(kpiTotalTB), color: 'bg-emerald-500/20 border border-emerald-500/30', icon: Users },
            { label: 'Tổng lương', value: formatCurrency(kpiTotalSalary), color: 'bg-sky-500/20 border border-sky-500/30', icon: DollarSign },
          ].map((kpi, i) => (
            <div key={i} className={`${kpi.color} rounded-lg p-3 backdrop-blur-sm`} style={{ boxShadow: '0 0 12px rgba(0, 255, 136, 0.1)' }}>
              <div className="flex items-center gap-1.5 mb-1"><kpi.icon className="w-3.5 h-3.5 text-white/80" /><p className="text-white/80 text-[10px] font-bold">{kpi.label}</p></div>
              <p className="text-white text-sm font-extrabold truncate">{kpi.value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Button onClick={addLeader} className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 h-8 text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> Thêm</Button>
          <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 rounded-md text-xs font-medium cursor-pointer"><Upload className="w-3.5 h-3.5" /> Import<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleImport('leaders', e)} /></label>
          <Button onClick={() => handleDownloadTemplate('leaders')} variant="outline" className="border-violet-500/30 text-violet-300 hover:bg-violet-500/10 h-8 text-xs"><FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Tải mẫu</Button>
          <Button onClick={() => handleExport('leaders')} variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 h-8 text-xs"><Download className="w-3.5 h-3.5 mr-1" /> Xuất</Button>
        </div>
        <div className="overflow-x-auto border border-emerald-500/30">
          <Table>
            <TableHeader><TableRow className="bg-emerald-600 hover:bg-emerald-600 border-b border-emerald-500/30">
              {[{ f: 'agentCode', l: 'Mã số' }, { f: 'agentName', l: 'Họ tên' }, { f: 'position', l: 'Chức vụ' }, { f: 'ban', l: 'Ban' }, { f: 'nhom', l: 'Nhóm' }, { f: 'maNhom', l: 'Mã nhóm' }, { f: 'salary', l: 'Tiền/tháng' }, { f: 'phone', l: 'SĐT' }, { f: 'email', l: 'Email' }, { f: 'startDate', l: 'Ngày bắt đầu' }, { f: 'note', l: 'Ghi chú' }].map(col => (
                <TableHead key={col.f} className="text-white text-xs font-bold uppercase cursor-pointer hover:text-amber-300 whitespace-nowrap" onClick={() => sortData(col.f)}>{col.l} <SortIcon field={col.f} /></TableHead>
              ))}
              <TableHead className="text-white text-xs uppercase w-[40px]"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(l => (
                <TableRow key={l.id} className="bg-[#0e0e18]/60 hover:bg-emerald-500/10 border-b border-emerald-500/20">
                  <TableCell className="text-xs p-0"><EditableCell value={l.agentCode} onSave={(v) => updateLeader(l.id, 'agentCode', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={l.agentName} onSave={(v) => updateLeader(l.id, 'agentName', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={l.position} onSave={(v) => updateLeader(l.id, 'position', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={l.ban} onSave={(v) => updateLeader(l.id, 'ban', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={l.nhom} onSave={(v) => updateLeader(l.id, 'nhom', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={l.maNhom} onSave={(v) => updateLeader(l.id, 'maNhom', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={l.salary} onSave={(v) => updateLeader(l.id, 'salary', v)} type="number" className="text-right" /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={l.phone} onSave={(v) => updateLeader(l.id, 'phone', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={l.email} onSave={(v) => updateLeader(l.id, 'email', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={l.startDate || ''} onSave={(v) => updateLeader(l.id, 'startDate', v)} type="date" /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={l.note} onSave={(v) => updateLeader(l.id, 'note', v)} /></TableCell>
                  <TableCell className="text-xs p-1"><Button variant="ghost" size="sm" onClick={() => deleteLeader(l.id)} className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 className="w-3 h-3" /></Button></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={12} className="text-center text-gray-500 text-sm py-8">Chưa có dữ liệu</TableCell></TableRow>}
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
            { label: 'Tổng NTD', value: formatNumber(kpiTotalNTD), color: 'bg-violet-500/20 border border-violet-500/30', icon: UserCircle },
            { label: 'Đang hoạt động', value: formatNumber(kpiActive), color: 'bg-emerald-500/20 border border-emerald-500/30', icon: CheckCircle2 },
          ].map((kpi, i) => (
            <div key={i} className={`${kpi.color} rounded-lg p-3 backdrop-blur-sm`} style={{ boxShadow: '0 0 12px rgba(0, 255, 136, 0.1)' }}>
              <div className="flex items-center gap-1.5 mb-1"><kpi.icon className="w-3.5 h-3.5 text-white/80" /><p className="text-white/80 text-[10px] font-bold">{kpi.label}</p></div>
              <p className="text-white text-sm font-extrabold truncate">{kpi.value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {canEdit && <><Button onClick={addRecruiter} className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 h-8 text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> Thêm</Button>
            <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 rounded-md text-xs font-medium cursor-pointer"><Upload className="w-3.5 h-3.5" /> Import<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleImport('recruiters', e)} /></label></>}
          <Button onClick={() => handleDownloadTemplate('recruiters')} variant="outline" className="border-violet-500/30 text-violet-300 hover:bg-violet-500/10 h-8 text-xs"><FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Tải mẫu</Button>
          <Button onClick={() => handleExport('recruiters')} variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 h-8 text-xs"><Download className="w-3.5 h-3.5 mr-1" /> Xuất</Button>
        </div>
        <div className="overflow-x-auto border border-emerald-500/30">
          <Table>
            <TableHeader><TableRow className="bg-emerald-600 hover:bg-emerald-600 border-b border-emerald-500/30">
              {[{ f: 'agentCode', l: 'Mã số' }, { f: 'agentName', l: 'Họ tên' }, { f: 'position', l: 'Chức vụ' }, { f: 'nhom', l: 'Nhóm' }, { f: 'startDate', l: 'Ngày bắt đầu' }].map(col => (
                <TableHead key={col.f} className="text-white text-xs font-bold uppercase cursor-pointer hover:text-amber-300 whitespace-nowrap" onClick={() => sortData(col.f)}>{col.l} <SortIcon field={col.f} /></TableHead>
              ))}
              {canEdit && <TableHead className="text-white text-xs uppercase w-[40px]"></TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id} className="bg-[#0e0e18]/60 hover:bg-emerald-500/10 border-b border-emerald-500/20">
                  {canEdit ? (<>
                    <TableCell className="text-xs p-0"><EditableCell value={r.agentCode} onSave={(v) => updateRecruiter(r.id, 'agentCode', v)} /></TableCell>
                    <TableCell className="text-xs p-0"><EditableCell value={r.agentName} onSave={(v) => updateRecruiter(r.id, 'agentName', v)} /></TableCell>
                    <TableCell className="text-xs p-0"><EditableCell value={r.position} onSave={(v) => updateRecruiter(r.id, 'position', v)} /></TableCell>
                    <TableCell className="text-xs p-0"><EditableCell value={r.nhom} onSave={(v) => updateRecruiter(r.id, 'nhom', v)} /></TableCell>
                    <TableCell className="text-xs p-0"><EditableCell value={r.startDate || ''} onSave={(v) => updateRecruiter(r.id, 'startDate', v)} type="date" /></TableCell>
                    <TableCell className="text-xs p-1"><Button variant="ghost" size="sm" onClick={() => deleteRecruiter(r.id)} className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 className="w-3 h-3" /></Button></TableCell>
                  </>) : (<>
                    <TableCell className="text-xs text-emerald-300/80 font-mono">{r.agentCode}</TableCell>
                    <TableCell className="text-xs text-white">{r.agentName}</TableCell>
                    <TableCell className="text-xs text-white/70">{r.position}</TableCell>
                    <TableCell className="text-xs text-white/70">{r.nhom}</TableCell>
                    <TableCell className="text-xs text-white/70">{r.startDate ? new Date(r.startDate).toLocaleDateString('vi-VN') : '—'}</TableCell>
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

  // ========== RENDER: Revenue with sub-tabs (Contract-based, matching Excel template) ==========
  // Columns matching the uploaded "Tháng 1.xlsx" template
  // Revenue table columns matching the new template (Tháng 1.xlsx format)
  const CONTRACT_TABLE_COLUMNS = [
    { f: 'ban', l: 'Ban', type: 'text' as const },
    { f: 'nhom', l: 'Nhóm', type: 'text' as const },
    { f: 'maNhom', l: 'Mã nhóm', type: 'text' as const },
    { f: 'agentCode', l: 'Mã ĐL', type: 'text' as const },
    { f: 'agentName', l: 'Tên', type: 'text' as const },
    { f: 'position', l: 'Chức vụ', type: 'text' as const },
    { f: 'ngayBatDauLamViec', l: 'Ngày bắt đầu LV', type: 'date' as const },
    { f: 'contractNumber', l: 'Số hợp đồng', type: 'text' as const },
    { f: 'effectiveDate', l: 'Ngày hiệu lực', type: 'date' as const },
    { f: 'issueDate', l: 'Ngày phát hành', type: 'date' as const },
    { f: 'pdt10DT', l: 'PĐT + 10% ĐT', type: 'number' as const },
    { f: 'afyp', l: 'AFYP', type: 'number' as const },
    { f: 'ad', l: 'AD', type: 'text' as const },
    { f: 'tinhLuot3tr', l: 'TÍNH LƯỢT 3 tr', type: 'number' as const },
    { f: 'maDaiLyTD', l: 'MÃ ĐL TD', type: 'text' as const },
  ];

  // ========== RENDER: Report ==========
  const renderReport = () => {
    // Available columns for calculation — chỉ tiêu theo quy tắc
    const calcColumns = [
      { key: 'pdt10DT', label: 'Tổng IP', type: 'sum_field' as const },
      { key: 'afyp', label: 'Tổng AFYP', type: 'sum_field' as const },
      { key: '_luotHoatDong', label: 'Lượt HĐ', type: 'count_condition' as const },
      { key: '_luotHoatDongChuan', label: 'Lượt HĐ chuẩn', type: 'count_condition' as const },
      { key: '_soLuotHD', label: 'Số lượt HĐ', type: 'count_rows' as const },
      { key: '_slTuyenDung', label: 'SL tuyển dụng', type: 'count_condition' as const },
    ];

    // Available columns for conditions (includes date & text fields)
    const conditionColumns = [
      { key: 'pdt10DT', label: 'IP (PĐT + 10% ĐT)', type: 'number' as const },
      { key: 'afyp', label: 'AFYP', type: 'number' as const },
      { key: 'fyp', label: 'FYP', type: 'number' as const },
      { key: 'tinhLuot3tr', label: 'TÍNH LƯỢT 3 tr', type: 'number' as const },
      { key: 'phiDongThem', label: 'Phí đóng thêm', type: 'number' as const },
      { key: 'ngayBatDauLamViec', label: 'Ngày bắt đầu làm việc', type: 'date' as const },
      { key: 'ngayBatDauLamViec2', label: 'Ngày BĐLV 2', type: 'date' as const },
      { key: 'effectiveDate', label: 'Ngày hiệu lực', type: 'date' as const },
      { key: 'issueDate', label: 'Ngày phát hành', type: 'date' as const },
      { key: 'thangTD', label: 'Tháng TD', type: 'number' as const },
      { key: 'namTD', label: 'Năm TD', type: 'number' as const },
      { key: 'thangHL', label: 'Tháng HL', type: 'number' as const },
      { key: 'agentCode', label: 'Mã TVV', type: 'text' as const },
      { key: 'agentName', label: 'Tên TVV', type: 'text' as const },
      { key: 'nhom', label: 'Nhóm', type: 'text' as const },
      { key: 'ad', label: 'AD', type: 'text' as const },
      { key: 'ban', label: 'Phòng/Ban', type: 'text' as const },
      { key: 'maNhom', label: 'Mã nhóm', type: 'text' as const },
      { key: 'position', label: 'Chức vụ', type: 'text' as const },
      { key: 'dkDongPhi', label: 'ĐK đóng phí', type: 'text' as const },
      { key: 'hopDongToChuc', label: 'HĐ tổ chức', type: 'text' as const },
      { key: 'maDaiLyTD', label: 'Mã ĐL TD (NTD)', type: 'text' as const },
    ];

    // Helper: evaluate a condition on a contract item
    const evaluateCondition = (item: any, cond: { column: string; operator: string; value: string }): boolean => {
      if (!cond.column || !cond.operator || !cond.value) return true;
      const colDef = conditionColumns.find(c => c.key === cond.column);
      if (!colDef) return true;

      const rawVal = item[cond.column];

      if (colDef.type === 'number') {
        const numVal = parseFloat(String(rawVal || 0)) || 0;
        const numCond = parseFloat(cond.value) || 0;
        switch (cond.operator) {
          case '>=': return numVal >= numCond;
          case '<=': return numVal <= numCond;
          case '>': return numVal > numCond;
          case '<': return numVal < numCond;
          case '=': return numVal === numCond;
          case '!=': return numVal !== numCond;
          default: return true;
        }
      } else if (colDef.type === 'date') {
        const dateVal = rawVal ? new Date(rawVal) : null;
        if (!dateVal || isNaN(dateVal.getTime())) return false;
        // For date conditions, value is in months (số tháng)
        const monthsNum = parseFloat(cond.value) || 0;
        const now = new Date();
        const diffMs = now.getTime() - dateVal.getTime();
        const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);
        switch (cond.operator) {
          case '>=': return diffMonths >= monthsNum;
          case '<=': return diffMonths <= monthsNum;
          case '>': return diffMonths > monthsNum;
          case '<': return diffMonths < monthsNum;
          case '=': return Math.abs(diffMonths - monthsNum) < 1;
          case '!=': return Math.abs(diffMonths - monthsNum) >= 1;
          default: return true;
        }
      } else {
        // text
        const strVal = String(rawVal || '').toLowerCase();
        const strCond = cond.value.toLowerCase();
        switch (cond.operator) {
          case '=': return strVal === strCond;
          case '!=': return strVal !== strCond;
          case 'contains': return strVal.includes(strCond);
          case 'not_contains': return !strVal.includes(strCond);
          case 'starts': return strVal.startsWith(strCond);
          default: return true;
        }
      }
    };

    // Filter contracts by date range (use issueDate for revenue grouping)
    const currentYear = new Date().getFullYear();
    let filteredData = contracts.filter(c => {
      const d = new Date(c.issueDate || c.effectiveDate);
      if (isNaN(d.getTime())) return false;
      if (d.getFullYear() !== currentYear) return false;
      if (reportMonthFrom) { const m = String(d.getMonth() + 1).padStart(2, '0'); if (m < reportMonthFrom) return false; }
      if (reportMonthTo) { const m = String(d.getMonth() + 1).padStart(2, '0'); if (m > reportMonthTo) return false; }
      return true;
    });

    // Apply conditions
    if (reportConditions.length > 0) {
      filteredData = filteredData.filter(c =>
        reportConditions.every(cond => evaluateCondition(c, cond))
      );
    }

    // Also use revenue data for revenue-based columns
    const isRevenueColumn = ['totalFYP', 'totalAFYP', 'contractCount', 'activityRounds'].includes(reportColumn);

    // Group by subject — use structure lists as the base (like thi-đua page)
    // Build mapping: contract → which AD / BanNhom it belongs to
    const grouped = new Map<string, { key: string; label: string; items: any[]; extra1: string; extra2: string; extra3?: string }>();

    if (reportSubject === 'nhom') {
      // Use banNhomList from structure as the base list
      for (const bn of banNhomList) {
        // Find parent AD for this bannhom
        const parentAD = adList.find(a => a.maAD === bn.maAD);
        grouped.set(bn.maBanNhom, {
          key: bn.maBanNhom,
          label: bn.tenBanNhom,
          items: [],
          extra1: '', // will fill with TN name
          extra2: parentAD?.tenAD || '',
          extra3: '', // will fill with TN agent code
        });
        // Look up Trưởng Nhóm from leaders or TVVStruct
        const tnLeader = leaders.find(l => l.maNhom === bn.maBanNhom || l.nhom === bn.tenBanNhom);
        if (tnLeader) {
          grouped.get(bn.maBanNhom)!.extra1 = tnLeader.agentName;
          (grouped.get(bn.maBanNhom) as any).extra3 = tnLeader.agentCode;
        } else {
          const tnTVV = tvvStructList.find(t => t.maBanNhom === bn.maBanNhom && (t.chucVu?.toLowerCase().includes('trưởng') || t.chucVu?.toLowerCase().includes('tn')));
          if (tnTVV) {
            grouped.get(bn.maBanNhom)!.extra1 = tnTVV.agentName;
            (grouped.get(bn.maBanNhom) as any).extra3 = tnTVV.agentCode;
          }
        }
      }
      // Map contracts to their nhóm using maBanNhom or nhom/maNhom
      for (const c of filteredData) {
        // Try maBanNhom first, then maNhom, then nhom name match
        let matchedKey = c.maBanNhom && grouped.has(c.maBanNhom) ? c.maBanNhom
          : c.maNhom && grouped.has(c.maNhom) ? c.maNhom
          : '';
        if (!matchedKey) {
          // Try matching by tên nhóm
          const found = banNhomList.find(bn => bn.tenBanNhom === c.nhom);
          if (found) matchedKey = found.maBanNhom;
        }
        if (matchedKey && grouped.has(matchedKey)) {
          grouped.get(matchedKey)!.items.push(c);
        } else {
          // Unmatched — put in a catch-all group
          const catchKey = '__unmatched__';
          if (!grouped.has(catchKey)) grouped.set(catchKey, { key: catchKey, label: c.nhom || '(Chưa phân nhóm)', items: [], extra1: '', extra2: '' });
          grouped.get(catchKey)!.items.push(c);
        }
      }
    } else if (reportSubject === 'ad') {
      // Use adList from structure as the base list
      for (const ad of adList) {
        // Find parent Phong for this AD
        const parentPhong = phongList.find(p => p.maPhong === ad.maPhong);
        grouped.set(ad.maAD, {
          key: ad.maAD,
          label: ad.tenAD,
          items: [],
          extra1: parentPhong?.tenPhong || '',
          extra2: '',
        });
      }
      // Map contracts to their AD
      // Build a mapping: maBanNhom → maAD (from structure)
      const bnToAD = new Map<string, string>();
      for (const bn of banNhomList) {
        if (bn.maAD) bnToAD.set(bn.maBanNhom, bn.maAD);
      }
      for (const c of filteredData) {
        // Try to find AD via maBanNhom → structure mapping
        let matchedADKey = '';
        if (c.maBanNhom && bnToAD.has(c.maBanNhom)) {
          matchedADKey = bnToAD.get(c.maBanNhom)!;
        }
        // Fallback: try matching by ad name against adList
        if (!matchedADKey && c.ad) {
          const found = adList.find(a => a.tenAD === c.ad);
          if (found) matchedADKey = found.maAD;
        }
        if (matchedADKey && grouped.has(matchedADKey)) {
          grouped.get(matchedADKey)!.items.push(c);
        } else {
          // Unmatched
          const catchKey = '__unmatched__';
          if (!grouped.has(catchKey)) grouped.set(catchKey, { key: catchKey, label: c.ad || '(Chưa có AD)', items: [], extra1: '', extra2: '' });
          grouped.get(catchKey)!.items.push(c);
        }
      }
    } else if (reportSubject === 'ntd') {
      // ntd — group by maDaiLyTD (Người tuyển dụng)
      // Build NTD groups from contracts' maDaiLyTD field
      const ntdSet = new Map<string, string>(); // code → name
      for (const c of filteredData) {
        const ntdCode = c.maDaiLyTD;
        if (!ntdCode) continue;
        if (!ntdSet.has(ntdCode)) {
          // Try to find name from recruiters list
          const rec = recruiters.find(r => r.agentCode === ntdCode);
          ntdSet.set(ntdCode, rec?.agentName || ntdCode);
        }
      }
      for (const [code, name] of ntdSet) {
        grouped.set(code, { key: code, label: name, items: [], extra1: '', extra2: '' });
      }
      for (const c of filteredData) {
        const ntdCode = c.maDaiLyTD;
        if (!ntdCode) {
          // Contracts without NTD go to unmatched
          const catchKey = '__unmatched__';
          if (!grouped.has(catchKey)) grouped.set(catchKey, { key: catchKey, label: '(Chưa có NTD)', items: [], extra1: '', extra2: '' });
          grouped.get(catchKey)!.items.push(c);
          continue;
        }
        // Skip NTD's own contracts if toggle is off
        if (!reportIncludeNTDOwn && c.agentCode === ntdCode) continue;
        if (grouped.has(ntdCode)) {
          grouped.get(ntdCode)!.items.push(c);
        }
      }
    } else if (reportSubject === 'phong') {
      // phong - use phongList from structure
      for (const p of phongList) {
        grouped.set(p.maPhong, {
          key: p.maPhong,
          label: p.tenPhong,
          items: [],
          extra1: '',
          extra2: '',
        });
      }
      // Map contracts to their phòng
      const adToPhong = new Map<string, string>();
      for (const ad of adList) {
        if (ad.maPhong) adToPhong.set(ad.maAD, ad.maPhong);
      }
      const bnToAD = new Map<string, string>();
      for (const bn of banNhomList) {
        if (bn.maAD) bnToAD.set(bn.maBanNhom, bn.maAD);
      }
      for (const c of filteredData) {
        let matchedPhongKey = '';
        // Try: maBanNhom → AD → Phong
        if (c.maBanNhom && bnToAD.has(c.maBanNhom)) {
          const adKey = bnToAD.get(c.maBanNhom)!;
          if (adToPhong.has(adKey)) matchedPhongKey = adToPhong.get(adKey)!;
        }
        // Fallback: ban name match
        if (!matchedPhongKey && c.ban) {
          const found = phongList.find(p => p.tenPhong === c.ban);
          if (found) matchedPhongKey = found.maPhong;
        }
        if (matchedPhongKey && grouped.has(matchedPhongKey)) {
          grouped.get(matchedPhongKey)!.items.push(c);
        } else {
          const catchKey = '__unmatched__';
          if (!grouped.has(catchKey)) grouped.set(catchKey, { key: catchKey, label: c.ban || '(Chưa có phòng)', items: [], extra1: '', extra2: '' });
          grouped.get(catchKey)!.items.push(c);
        }
      }
    }

    // Use revenue data if needed
    if (isRevenueColumn && revenue.length > 0) {
      const revFiltered = revenue.filter(r => {
        if (reportMonthFrom && r.month < `${currentYear}-${reportMonthFrom}`) return false;
        if (reportMonthTo && r.month > `${currentYear}-${reportMonthTo}`) return false;
        return r.month.startsWith(String(currentYear));
      });
      // Keep structure-based groups, map revenue into them
      for (const r of revFiltered) {
        let matchedKey = '';
        if (reportSubject === 'nhom') {
          matchedKey = r.maNhom && grouped.has(r.maNhom) ? r.maNhom : '';
          if (!matchedKey) {
            const found = banNhomList.find(bn => bn.tenBanNhom === r.nhom);
            if (found) matchedKey = found.maBanNhom;
          }
        } else if (reportSubject === 'ad') {
          // revenue doesn't have maAD, try to find via maNhom → bannhom → AD
          if (r.maNhom) {
            const bn = banNhomList.find(b => b.maBanNhom === r.maNhom);
            if (bn && bn.maAD && grouped.has(bn.maAD)) matchedKey = bn.maAD;
          }
        } else {
          // phong — revenue doesn't directly map to phong
        }
        if (matchedKey && grouped.has(matchedKey)) {
          grouped.get(matchedKey)!.items.push(r);
        }
      }
    }

    // Calculate values
    const colLabel = calcColumns.find(c => c.key === reportColumn)?.label || reportColumn;

    // Helper: check if a TVV is "mới" (≤12 months) based on ngayBatDauLamViec
    const isTVVm = (item: any): boolean => {
      const sd = item.ngayBatDauLamViec;
      if (!sd) return true; // no start date = new TVV, ≤12 months
      const diff = (Date.now() - new Date(sd).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      return diff <= 12;
    };

    // Helper: compute a metric for a group of contracts
    const computeMetric = (items: any[], metric: string, tvvmOnly: boolean): number => {
      // Filter by TVVm if checkbox is checked
      const filtered = tvvmOnly ? items.filter(isTVVm) : items;

      if (metric === 'pdt10DT') {
        return filtered.reduce((s: number, item: any) => s + (parseFloat(String(item.pdt10DT || 0)) || 0), 0);
      } else if (metric === 'afyp') {
        return filtered.reduce((s: number, item: any) => s + (parseFloat(String(item.afyp || 0)) || 0), 0);
      } else if (metric === '_luotHoatDong') {
        // Đếm số dòng hợp đồng có giá trị >= 3 triệu tại cột TÍNH LƯỢT 3tr
        return filtered.filter((item: any) => (parseFloat(String(item.tinhLuot3tr || 0)) || 0) >= 3000000).length;
      } else if (metric === '_luotHoatDongChuan') {
        // Đếm số dòng hợp đồng có giá trị >= 12 triệu tại cột TÍNH LƯỢT 3tr
        return filtered.filter((item: any) => (parseFloat(String(item.tinhLuot3tr || 0)) || 0) >= 12000000).length;
      } else if (metric === '_soLuotHD') {
        // Đếm số dòng có dữ liệu
        return filtered.length;
      } else if (metric === '_slTuyenDung') {
        // SL tuyển dụng: đếm TVV trong nhóm/đối tượng có ngày bắt đầu làm việc trong khoảng thời gian
        // Lấy danh sách agentCode từ items (contracts)
        const agentCodes = new Set(filtered.map((item: any) => item.agentCode).filter(Boolean));
        // Đếm từ tvvStructList những TVV thuộc nhóm này và có ngày bắt đầu trong khoảng
        return tvvStructList.filter(t => {
          if (!agentCodes.has(t.agentCode) && !items.some((item: any) => item.maBanNhom === t.maBanNhom)) return false;
          if (!t.ngayBatDau) return false;
          const d = new Date(t.ngayBatDau);
          if (isNaN(d.getTime())) return false;
          if (d.getFullYear() !== currentYear) return false;
          if (reportMonthFrom) { const m = String(d.getMonth() + 1).padStart(2, '0'); if (m < reportMonthFrom) return false; }
          if (reportMonthTo) { const m = String(d.getMonth() + 1).padStart(2, '0'); if (m > reportMonthTo) return false; }
          return true;
        }).length;
      }
      return 0;
    };

    // Helper: check if metric is a count type (not currency)
    const isCountMetric = (key: string) => ['_luotHoatDong', '_luotHoatDongChuan', '_soLuotHD', '_slTuyenDung'].includes(key);

    const results = Array.from(grouped.entries()).map(([key, group]) => {
      const value = computeMetric(group.items, reportColumn, reportTVVm);

      // Optional 2nd column
      let value2: number | null = null;
      if (reportColumn2) {
        value2 = computeMetric(group.items, reportColumn2, reportTVVm2);
      }

      const target = parseFloat(reportTarget) || 0;
      const pct = target > 0 ? (value / target) * 100 : 0;
      return { key, label: group.label, value, value2, target, pct, extra1: group.extra1, extra2: group.extra2, extra3: (group as any).extra3 || '', hasData: group.items.length > 0 };
    })
    // Chỉ hiện những đối tượng có trong cấu trúc (không hiện dòng ngoài đối tượng)
    .filter(r => r.key !== '__unmatched__' && r.hasData)
    .sort((a, b) => b.value - a.value);

    const totalValue = results.reduce((s, r) => s + r.value, 0);
    const totalTarget = parseFloat(reportTarget) || 0;
    const totalPct = totalTarget > 0 ? (totalValue / totalTarget) * 100 : 0;
    const col2Label = (calcColumns.find(c => c.key === reportColumn2)?.label || '') + (reportTVVm2 && reportColumn2 ? ' TVVm' : '');
    const col1DisplayLabel = colLabel + (reportTVVm ? ' TVVm' : '');

    const subjectLabel = reportSubject === 'nhom' ? 'Nhóm' : reportSubject === 'ad' ? 'AD' : reportSubject === 'ntd' ? 'NTD' : 'Phòng';
    const title = reportTitle || `${col1DisplayLabel}${reportColumn2 ? ` / ${col2Label}` : ''} theo ${subjectLabel}${reportSubject === 'ntd' && !reportIncludeNTDOwn ? ' (không tính HĐ cá nhân)' : ''}`;

    // Build condition description for display
    const condDescParts = reportConditions.filter(c => c.column && c.operator && c.value).map(c => {
      const colName = conditionColumns.find(cc => cc.key === c.column)?.label || c.column;
      const opLabel = { '>=': '≥', '<=': '≤', '>': '>', '<': '<', '=': '=', '!=': '≠', 'contains': 'chứa', 'not_contains': 'không chứa', 'starts': 'bắt đầu bằng' }[c.operator] || c.operator;
      const colType = conditionColumns.find(cc => cc.key === c.column)?.type;
      const valLabel = colType === 'date' ? `${c.value} tháng` : c.value;
      return `${colName} ${opLabel} ${valLabel}`;
    });
    const condDesc = condDescParts.length > 0 ? condDescParts.join(' ∧ ') : '';

    return (
      <div className="space-y-4">
        {/* Config panel */}
        <div className="bg-[#0e0e18]/80 backdrop-blur-md border border-emerald-500/30 rounded-lg p-4">
          <h3 className="text-sm font-bold text-emerald-300 mb-3 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" /> Cấu hình báo cáo
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Đối tượng */}
            <div>
              <label className="text-[10px] font-bold text-white/70 mb-1 block">Đối tượng</label>
              <select value={reportSubject} onChange={e => setReportSubject(e.target.value as any)} className="w-full h-8 text-xs bg-gray-800 border border-emerald-500/30 text-white rounded px-2">
                <option value="phong">Phòng</option>
                <option value="ad">AD</option>
                <option value="nhom">Nhóm</option>
                <option value="ntd">Người TD</option>
              </select>
            </div>
            {/* NTD toggle */}
            {reportSubject === 'ntd' && (
              <div>
                <label className="text-[10px] font-bold text-white/70 mb-1 block">NTD tính cả HĐ cá nhân?</label>
                <button
                  onClick={() => setReportIncludeNTDOwn(!reportIncludeNTDOwn)}
                  className="w-full h-8 text-xs bg-gray-800 border border-emerald-500/30 text-white rounded px-2 flex items-center gap-1.5"
                >
                  {reportIncludeNTDOwn ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-amber-400" />}
                  {reportIncludeNTDOwn ? 'Có' : 'Không'}
                </button>
              </div>
            )}
            {/* 2. Cột tính chính */}
            <div>
              <label className="text-[10px] font-bold text-white/70 mb-1 block">Cột tính</label>
              <select value={reportColumn} onChange={e => setReportColumn(e.target.value)} className="w-full h-8 text-xs bg-gray-800 border border-emerald-500/30 text-white rounded px-2">
                {calcColumns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
              <button
                onClick={() => setReportTVVm(!reportTVVm)}
                className="mt-1 flex items-center gap-1 text-[10px] font-medium"
              >
                {reportTVVm ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-gray-500" />}
                <span className={reportTVVm ? 'text-emerald-300' : 'text-white/40'}>Chỉ TVVm (≤12 tháng)</span>
              </button>
            </div>
            {/* 3. Cột thứ 2 */}
            <div>
              <label className="text-[10px] font-bold text-white/70 mb-1 block">Cột thứ 2 (tuỳ chọn)</label>
              <select value={reportColumn2} onChange={e => setReportColumn2(e.target.value)} className="w-full h-8 text-xs bg-gray-800 border border-emerald-500/30 text-white rounded px-2">
                <option value="">— Không —</option>
                {calcColumns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
              {reportColumn2 && (
                <button
                  onClick={() => setReportTVVm2(!reportTVVm2)}
                  className="mt-1 flex items-center gap-1 text-[10px] font-medium"
                >
                  {reportTVVm2 ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-gray-500" />}
                  <span className={reportTVVm2 ? 'text-emerald-300' : 'text-white/40'}>Chỉ TVVm (≤12 tháng)</span>
                </button>
              )}
            </div>
            {/* 5. Kế hoạch */}
            <div>
              <label className="text-[10px] font-bold text-white/70 mb-1 block">Kế hoạch (CT)</label>
              <input type="text" value={reportTarget} onChange={e => setReportTarget(e.target.value)} placeholder="Nhập số..." className="w-full h-8 text-xs bg-gray-800 border border-emerald-500/30 text-white rounded px-2" />
            </div>
            {/* 6. Thời gian */}
            <div className="flex gap-1">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-white/70 mb-1 block">Từ tháng</label>
                <select value={reportMonthFrom} onChange={e => setReportMonthFrom(e.target.value)} className="w-full h-8 text-xs bg-gray-800 border border-emerald-500/30 text-white rounded px-2">
                  <option value="">T1</option><option value="01">T1</option><option value="02">T2</option><option value="03">T3</option><option value="04">T4</option><option value="05">T5</option><option value="06">T6</option><option value="07">T7</option><option value="08">T8</option><option value="09">T9</option><option value="10">T10</option><option value="11">T11</option><option value="12">T12</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-white/70 mb-1 block">Đến</label>
                <select value={reportMonthTo} onChange={e => setReportMonthTo(e.target.value)} className="w-full h-8 text-xs bg-gray-800 border border-emerald-500/30 text-white rounded px-2">
                  <option value="">T12</option><option value="01">T1</option><option value="02">T2</option><option value="03">T3</option><option value="04">T4</option><option value="05">T5</option><option value="06">T6</option><option value="07">T7</option><option value="08">T8</option><option value="09">T9</option><option value="10">T10</option><option value="11">T11</option><option value="12">T12</option>
                </select>
              </div>
            </div>
          </div>

          {/* Row 2: Conditions */}
          <div className="mt-3 border border-amber-500/20 rounded-lg p-3 bg-amber-500/5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                <Target className="w-3 h-3" /> Điều kiện lọc
              </label>
              <button
                onClick={() => setReportConditions(prev => [...prev, { column: '', operator: '>=', value: '' }])}
                className="text-[10px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20"
              >
                <Plus className="w-3 h-3" /> Thêm điều kiện
              </button>
            </div>
            {reportConditions.length === 0 && (
              <p className="text-[10px] text-white/30 italic">Chưa có điều kiện. Nhấn "Thêm điều kiện" để lọc dữ liệu (VD: Ngày BĐLV ≥ 3 tháng, IP &gt; 3.000.000...)</p>
            )}
            <div className="space-y-1.5">
              {reportConditions.map((cond, idx) => {
                const colDef = conditionColumns.find(c => c.key === cond.column);
                const colType = colDef?.type || 'number';
                const isDate = colType === 'date';
                const isText = colType === 'text';
                return (
                  <div key={idx} className="flex items-center gap-1.5">
                    <select
                      value={cond.column}
                      onChange={e => {
                        const newCol = e.target.value;
                        const newType = conditionColumns.find(c => c.key === newCol)?.type || 'number';
                        setReportConditions(prev => prev.map((c, i) => i === idx ? { ...c, column: newCol, operator: newType === 'text' ? 'contains' : '>=' } : c));
                      }}
                      className="h-7 text-[10px] bg-gray-800 border border-amber-500/30 text-white rounded px-1.5 flex-shrink-0 w-[160px]"
                    >
                      <option value="">— Chọn cột —</option>
                      {conditionColumns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                    <select
                      value={cond.operator}
                      onChange={e => setReportConditions(prev => prev.map((c, i) => i === idx ? { ...c, operator: e.target.value } : c))}
                      className="h-7 text-[10px] bg-gray-800 border border-amber-500/30 text-white rounded px-1.5 w-[60px]"
                    >
                      {isText ? (
                        <>
                          <option value="=">=</option>
                          <option value="!=">≠</option>
                          <option value="contains">Chứa</option>
                          <option value="not_contains">Không chứa</option>
                          <option value="starts">Bắt đầu</option>
                        </>
                      ) : (
                        <>
                          <option value=">=">≥</option>
                          <option value="<=">≤</option>
                          <option value=">">&gt;</option>
                          <option value="<">&lt;</option>
                          <option value="=">=</option>
                          <option value="!=">≠</option>
                        </>
                      )}
                    </select>
                    <input
                      type={isText ? 'text' : 'number'}
                      value={cond.value}
                      onChange={e => setReportConditions(prev => prev.map((c, i) => i === idx ? { ...c, value: e.target.value } : c))}
                      placeholder={isDate ? 'Số tháng...' : isText ? 'Nội dung...' : 'Giá trị...'}
                      className="h-7 text-[10px] bg-gray-800 border border-amber-500/30 text-white rounded px-2 flex-1 min-w-[80px]"
                    />
                    {isDate && <span className="text-[9px] text-amber-300/60 shrink-0">tháng</span>}
                    <button
                      onClick={() => setReportConditions(prev => prev.filter((_, i) => i !== idx))}
                      className="h-7 w-7 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 3: Title + Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="text-[10px] font-bold text-white/70 mb-1 block">Tiêu đề báo cáo</label>
              <input type="text" value={reportTitle} onChange={e => setReportTitle(e.target.value)} placeholder={title} className="w-full h-8 text-xs bg-gray-800 border border-emerald-500/30 text-white rounded px-2" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-white/70 mb-1 block">Ghi chú</label>
              <input type="text" value={reportNote} onChange={e => setReportNote(e.target.value)} placeholder="Nội dung ghi chú..." className="w-full h-8 text-xs bg-gray-800 border border-emerald-500/30 text-white rounded px-2" />
            </div>
          </div>
        </div>

        {/* Report result - light theme table */}
        <div className="bg-[#0e0e18]/80 backdrop-blur-md border border-emerald-500/30 rounded-lg p-4" id="report-content">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-emerald-300 neon-text">{title}</h3>
              {reportNote && <p className="text-[10px] text-white/50 mt-0.5">{reportNote}</p>}
              <p className="text-[10px] text-white/40 mt-0.5">
                Năm {currentYear}{reportMonthFrom || reportMonthTo ? ` | Tháng ${reportMonthFrom || '01'} - ${reportMonthTo || '12'}` : ''} | {results.length} đối tượng | {filteredData.length} HĐ
              </p>
              {condDesc && <p className="text-[10px] text-amber-300/60 mt-0.5">Điều kiện: {condDesc}</p>}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setReportPopupOpen(true)} variant="outline" className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 h-7 text-xs"><BarChart3 className="w-3 h-3 mr-1" /> Xem popup</Button>
              <Button onClick={() => {
                const el = document.getElementById('report-content');
                if (!el) return;
                import('html-to-image').then(mod => {
                  mod.toPng(el, { backgroundColor: '#0e0e18', pixelRatio: 2 }).then((dataUrl: string) => {
                    const a = document.createElement('a'); a.href = dataUrl; a.download = `bao-cao-${Date.now()}.png`; a.click();
                  });
                }).catch(() => toast({ title: 'Lỗi xuất ảnh', variant: 'destructive' }));
              }} variant="outline" className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 h-7 text-xs"><Download className="w-3 h-3 mr-1" /> Tải ảnh</Button>
            </div>
          </div>

          {/* Total bar */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-xs font-bold">TỔNG CỘNG</span>
              <div className="flex items-center gap-4">
                <span className="text-emerald-300 text-sm font-extrabold">{isCountMetric(reportColumn) ? formatNumber(totalValue) : formatCurrency(totalValue)}</span>
                {reportColumn2 && <span className="text-sky-300 text-sm font-extrabold">{isCountMetric(reportColumn2) ? formatNumber(results.reduce((s, r) => s + (r.value2 || 0), 0)) : formatCurrency(results.reduce((s, r) => s + (r.value2 || 0), 0))}</span>}
                {totalTarget > 0 && (
                  <span className={`text-sm font-extrabold ${totalPct >= 100 ? 'text-emerald-300' : totalPct >= 70 ? 'text-amber-300' : 'text-rose-300'}`}>
                    {totalPct.toFixed(1)}% / {formatCurrency(totalTarget)}
                  </span>
                )}
              </div>
            </div>
            {totalTarget > 0 && <Progress value={Math.min(totalPct, 100)} className="h-2 mt-2 bg-gray-800 [&>div]:bg-emerald-400" />}
          </div>

          {/* Results table - LIGHT THEME */}
          <div className="overflow-auto max-h-[calc(100vh-520px)] bg-white rounded-lg border border-green-200" style={{ scrollbarWidth: 'thin', scrollbarColor: '#059669 transparent' }}>
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-emerald-600 border-b border-emerald-700">
                <tr className="[&>th]:whitespace-nowrap">
                  <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">STT</th>
                  {reportSubject === 'ad' && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">Mã AD</th>}
                  {reportSubject === 'ad' && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">Phòng KD</th>}
                  {reportSubject === 'ad' && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">AD</th>}
                  {reportSubject === 'nhom' && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">AD</th>}
                  {reportSubject === 'nhom' && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">Tên nhóm</th>}
                  {reportSubject === 'nhom' && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">Mã ĐL TN</th>}
                  {reportSubject === 'nhom' && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">Tên TN</th>}
                  {reportSubject === 'phong' && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">Mã phòng</th>}
                  {reportSubject === 'phong' && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">Phòng</th>}
                  {reportSubject === 'ntd' && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">Mã NTD</th>}
                  {reportSubject === 'ntd' && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">Người TD</th>}
                  <th className="px-3 py-2 text-right text-[10px] text-white font-bold uppercase border border-emerald-700">{col1DisplayLabel}</th>
                  {reportColumn2 && <th className="px-3 py-2 text-right text-[10px] text-white font-bold uppercase border border-emerald-700">{col2Label}</th>}
                  {totalTarget > 0 && <th className="px-3 py-2 text-right text-[10px] text-white font-bold uppercase border border-emerald-700">Kế hoạch</th>}
                  {totalTarget > 0 && <th className="px-3 py-2 text-right text-[10px] text-white font-bold uppercase border border-emerald-700">Tỷ lệ</th>}
                  {totalTarget > 0 && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700 w-[120px]">Tiến độ</th>}
                  <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700 w-[120px]">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={r.key} className="border-b border-green-200 hover:bg-green-50/50">
                    <td className="px-3 py-2 text-[11px] text-gray-800 border border-green-200 whitespace-nowrap">{i + 1}</td>
                    {reportSubject === 'ad' && <td className="px-3 py-2 text-[11px] text-gray-600 font-mono border border-green-200 whitespace-nowrap">{r.key}</td>}
                    {reportSubject === 'ad' && <td className="px-3 py-2 text-[11px] text-gray-800 font-medium border border-green-200 whitespace-nowrap">{r.extra1}</td>}
                    {reportSubject === 'ad' && <td className="px-3 py-2 text-[11px] text-gray-900 font-bold border border-green-200 whitespace-nowrap">{r.label}</td>}
                    {reportSubject === 'nhom' && <td className="px-3 py-2 text-[11px] text-gray-800 font-medium border border-green-200 whitespace-nowrap">{r.extra2}</td>}
                    {reportSubject === 'nhom' && <td className="px-3 py-2 text-[11px] text-gray-900 font-bold border border-green-200 whitespace-nowrap">{r.label}</td>}
                    {reportSubject === 'nhom' && <td className="px-3 py-2 text-[11px] text-gray-600 font-mono border border-green-200 whitespace-nowrap">{r.extra3 || '—'}</td>}
                    {reportSubject === 'nhom' && <td className="px-3 py-2 text-[11px] text-gray-800 font-medium border border-green-200 whitespace-nowrap">{r.extra1 || '—'}</td>}
                    {reportSubject === 'phong' && <td className="px-3 py-2 text-[11px] text-gray-600 font-mono border border-green-200 whitespace-nowrap">{r.key}</td>}
                    {reportSubject === 'phong' && <td className="px-3 py-2 text-[11px] text-gray-900 font-bold border border-green-200 whitespace-nowrap">{r.label}</td>}
                    {reportSubject === 'ntd' && <td className="px-3 py-2 text-[11px] text-gray-600 font-mono border border-green-200 whitespace-nowrap">{r.key}</td>}
                    {reportSubject === 'ntd' && <td className="px-3 py-2 text-[11px] text-gray-900 font-bold border border-green-200 whitespace-nowrap">{r.label}</td>}
                    <td className="px-3 py-2 text-[11px] text-green-700 font-extrabold text-right border border-green-200 whitespace-nowrap">{isCountMetric(reportColumn) ? formatNumber(r.value) : formatCurrency(r.value)}</td>
                    {reportColumn2 && <td className="px-3 py-2 text-[11px] text-blue-700 font-extrabold text-right border border-green-200 whitespace-nowrap">{isCountMetric(reportColumn2) ? formatNumber(r.value2 || 0) : formatCurrency(r.value2 || 0)}</td>}
                    {totalTarget > 0 && <td className="px-3 py-2 text-[11px] text-gray-700 text-right border border-green-200 whitespace-nowrap">{formatCurrency(r.target)}</td>}
                    {totalTarget > 0 && <td className={`px-3 py-2 text-[11px] font-bold text-right border border-green-200 whitespace-nowrap ${r.pct >= 100 ? 'text-green-700' : r.pct >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>{r.pct.toFixed(1)}%</td>}
                    {totalTarget > 0 && <td className="px-3 py-2 border border-green-200 whitespace-nowrap"><Progress value={Math.min(r.pct, 100)} className="h-1.5 bg-gray-200 [&>div]:bg-green-600" /></td>}
                    <td className="px-1 py-1 border border-green-200 whitespace-nowrap">
                      <input
                        type="text"
                        value={reportRowNotes[r.key] || ''}
                        onChange={e => setReportRowNotes(prev => ({ ...prev, [r.key]: e.target.value }))}
                        className="w-full h-6 text-[10px] bg-white border border-green-200 rounded px-1.5 text-gray-800 focus:outline-none focus:border-green-400"
                        placeholder="Ghi chú..."
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========== Report Popup Dialog ========== */}
        <Dialog open={reportPopupOpen} onOpenChange={setReportPopupOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-[#1a1a2e] border-emerald-500/30 p-0">
            {/* Action bar */}
            <div className="sticky top-0 z-10 bg-[#1a1a2e] border-b border-emerald-500/20 px-3 py-2 flex items-center justify-between">
              <DialogTitle className="text-emerald-400 text-sm font-bold">Báo cáo - Popup</DialogTitle>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={async () => {
                  try {
                    const XLSX = await import('xlsx');
                    const headers: string[] = ['STT'];
                    if (reportSubject === 'ad') headers.push('Mã AD', 'Phòng KD', 'AD');
                    if (reportSubject === 'nhom') headers.push('AD', 'Tên nhóm', 'Mã ĐL TN', 'Tên TN');
                    if (reportSubject === 'phong') headers.push('Mã phòng', 'Phòng');
                    if (reportSubject === 'ntd') headers.push('Mã NTD', 'Người TD');
                    headers.push(col1DisplayLabel);
                    if (reportColumn2) headers.push(col2Label);
                    if (totalTarget > 0) headers.push('Kế hoạch', 'Tỷ lệ');
                    headers.push('Ghi chú');
                    const rows = results.map((r, i) => {
                      const row: (string | number)[] = [i + 1];
                      if (reportSubject === 'ad') { row.push(r.key, r.extra1 || '', r.label); }
                      if (reportSubject === 'nhom') { row.push(r.extra2 || '', r.label, r.extra3 || '', r.extra1 || ''); }
                      if (reportSubject === 'phong') { row.push(r.key, r.label); }
                      if (reportSubject === 'ntd') { row.push(r.key, r.label); }
                      row.push(isCountMetric(reportColumn) ? formatNumber(r.value) : formatCurrency(r.value));
                      if (reportColumn2) row.push(isCountMetric(reportColumn2) ? formatNumber(r.value2 || 0) : formatCurrency(r.value2 || 0));
                      if (totalTarget > 0) { row.push(formatCurrency(r.target), r.pct.toFixed(1) + '%'); }
                      row.push(reportRowNotes[r.key] || '');
                      return row;
                    });
                    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
                    const colWidths = headers.map((h, ci) => {
                      const maxLen = Math.max(h.length, ...rows.map(r => String(r[ci] || '').length));
                      return { wch: Math.min(maxLen + 2, 30) };
                    });
                    ws['!cols'] = colWidths;
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo');
                    XLSX.writeFile(wb, `bao-cao-${Date.now()}.xlsx`);
                  } catch { toast({ title: 'Lỗi xuất Excel', variant: 'destructive' }); }
                }} className="border-emerald-500/30 text-emerald-400 h-7 text-xs hover:bg-emerald-500/10"><FileSpreadsheet className="w-3 h-3 mr-1" />XLSX</Button>
                <Button variant="outline" size="sm" onClick={async () => {
                  const el = reportPopupRef.current;
                  if (!el) return;
                  try {
                    const { toPng } = await import('html-to-image');
                    const dataUrl = await toPng(el, { backgroundColor: '#ffffff', pixelRatio: 2 });
                    const a = document.createElement('a'); a.href = dataUrl; a.download = `bao-cao-${Date.now()}.png`; a.click();
                  } catch { toast({ title: 'Lỗi xuất ảnh', variant: 'destructive' }); }
                }} className="border-emerald-500/30 text-emerald-400 h-7 text-xs hover:bg-emerald-500/10"><Download className="w-3 h-3 mr-1" />Tải ảnh</Button>
              </div>
            </div>

            <div ref={reportPopupRef} className="px-3 py-2 bg-white">
              {/* Report header in popup */}
              <div className="mb-3">
                <h3 className="text-base font-extrabold text-green-700">{title}</h3>
                {reportNote && <p className="text-[10px] text-gray-500 mt-0.5">{reportNote}</p>}
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Năm {currentYear}{reportMonthFrom || reportMonthTo ? ` | Tháng ${reportMonthFrom || '01'} - ${reportMonthTo || '12'}` : ''} | {results.length} đối tượng | {filteredData.length} HĐ
                </p>
              </div>

              {/* Total bar in popup */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 text-xs font-bold">TỔNG CỘNG</span>
                  <div className="flex items-center gap-4">
                    <span className="text-green-700 text-sm font-extrabold">{isCountMetric(reportColumn) ? formatNumber(totalValue) : formatCurrency(totalValue)}</span>
                    {reportColumn2 && <span className="text-blue-700 text-sm font-extrabold">{isCountMetric(reportColumn2) ? formatNumber(results.reduce((s, r) => s + (r.value2 || 0), 0)) : formatCurrency(results.reduce((s, r) => s + (r.value2 || 0), 0))}</span>}
                    {totalTarget > 0 && (
                      <span className={`text-sm font-extrabold ${totalPct >= 100 ? 'text-green-700' : totalPct >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {totalPct.toFixed(1)}% / {formatCurrency(totalTarget)}
                      </span>
                    )}
                  </div>
                </div>
                {totalTarget > 0 && <Progress value={Math.min(totalPct, 100)} className="h-2 mt-2 bg-gray-200 [&>div]:bg-green-600" />}
              </div>

              {/* Table in popup - light theme */}
              <div className="overflow-auto border border-green-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-emerald-600 border-b border-emerald-700">
                    <tr className="[&>th]:whitespace-nowrap">
                      <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">STT</th>
                      {reportSubject === 'ad' && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">Mã AD</th>}
                      {reportSubject === 'ad' && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">Phòng KD</th>}
                      {reportSubject === 'ad' && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">AD</th>}
                      {reportSubject === 'nhom' && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">AD</th>}
                      {reportSubject === 'nhom' && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">Tên nhóm</th>}
                      {reportSubject === 'nhom' && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">Mã ĐL TN</th>}
                      {reportSubject === 'nhom' && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">Tên TN</th>}
                      {reportSubject === 'phong' && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">Mã phòng</th>}
                      {reportSubject === 'phong' && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">Phòng</th>}
                      {reportSubject === 'ntd' && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">Mã NTD</th>}
                      {reportSubject === 'ntd' && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">Người TD</th>}
                      <th className="px-3 py-2 text-right text-[10px] text-white font-bold uppercase border border-emerald-700">{col1DisplayLabel}</th>
                      {reportColumn2 && <th className="px-3 py-2 text-right text-[10px] text-white font-bold uppercase border border-emerald-700">{col2Label}</th>}
                      {totalTarget > 0 && <th className="px-3 py-2 text-right text-[10px] text-white font-bold uppercase border border-emerald-700">Kế hoạch</th>}
                      {totalTarget > 0 && <th className="px-3 py-2 text-right text-[10px] text-white font-bold uppercase border border-emerald-700">Tỷ lệ</th>}
                      {totalTarget > 0 && <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700 w-[120px]">Tiến độ</th>}
                      <th className="px-3 py-2 text-left text-[10px] text-white font-bold uppercase border border-emerald-700">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={r.key} className="border-b border-green-200 hover:bg-green-50/50">
                        <td className="px-3 py-2 text-[11px] text-gray-800 border border-green-200 whitespace-nowrap">{i + 1}</td>
                        {reportSubject === 'ad' && <td className="px-3 py-2 text-[11px] text-gray-600 font-mono border border-green-200 whitespace-nowrap">{r.key}</td>}
                        {reportSubject === 'ad' && <td className="px-3 py-2 text-[11px] text-gray-800 font-medium border border-green-200 whitespace-nowrap">{r.extra1}</td>}
                        {reportSubject === 'ad' && <td className="px-3 py-2 text-[11px] text-gray-900 font-bold border border-green-200 whitespace-nowrap">{r.label}</td>}
                        {reportSubject === 'nhom' && <td className="px-3 py-2 text-[11px] text-gray-800 font-medium border border-green-200 whitespace-nowrap">{r.extra2}</td>}
                        {reportSubject === 'nhom' && <td className="px-3 py-2 text-[11px] text-gray-900 font-bold border border-green-200 whitespace-nowrap">{r.label}</td>}
                        {reportSubject === 'nhom' && <td className="px-3 py-2 text-[11px] text-gray-600 font-mono border border-green-200 whitespace-nowrap">{r.extra3 || '—'}</td>}
                        {reportSubject === 'nhom' && <td className="px-3 py-2 text-[11px] text-gray-800 font-medium border border-green-200 whitespace-nowrap">{r.extra1 || '—'}</td>}
                        {reportSubject === 'phong' && <td className="px-3 py-2 text-[11px] text-gray-600 font-mono border border-green-200 whitespace-nowrap">{r.key}</td>}
                        {reportSubject === 'phong' && <td className="px-3 py-2 text-[11px] text-gray-900 font-bold border border-green-200 whitespace-nowrap">{r.label}</td>}
                        {reportSubject === 'ntd' && <td className="px-3 py-2 text-[11px] text-gray-600 font-mono border border-green-200 whitespace-nowrap">{r.key}</td>}
                        {reportSubject === 'ntd' && <td className="px-3 py-2 text-[11px] text-gray-900 font-bold border border-green-200 whitespace-nowrap">{r.label}</td>}
                        <td className="px-3 py-2 text-[11px] text-green-700 font-extrabold text-right border border-green-200 whitespace-nowrap">{isCountMetric(reportColumn) ? formatNumber(r.value) : formatCurrency(r.value)}</td>
                        {reportColumn2 && <td className="px-3 py-2 text-[11px] text-blue-700 font-extrabold text-right border border-green-200 whitespace-nowrap">{isCountMetric(reportColumn2) ? formatNumber(r.value2 || 0) : formatCurrency(r.value2 || 0)}</td>}
                        {totalTarget > 0 && <td className="px-3 py-2 text-[11px] text-gray-700 text-right border border-green-200 whitespace-nowrap">{formatCurrency(r.target)}</td>}
                        {totalTarget > 0 && <td className={`px-3 py-2 text-[11px] font-bold text-right border border-green-200 whitespace-nowrap ${r.pct >= 100 ? 'text-green-700' : r.pct >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>{r.pct.toFixed(1)}%</td>}
                        {totalTarget > 0 && <td className="px-3 py-2 border border-green-200 whitespace-nowrap"><Progress value={Math.min(r.pct, 100)} className="h-1.5 bg-gray-200 [&>div]:bg-green-600" /></td>}
                        <td className="px-3 py-2 text-[11px] text-gray-800 border border-green-200 whitespace-nowrap">{reportRowNotes[r.key] || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  const renderRevenue = () => {
    const currentYear = new Date().getFullYear();
    const monthLabel = MONTHS.find(m => m.key === revenueSub)?.label || '';

    // Filter contracts by selected month (based on effectiveDate)
    const monthFilteredContracts = revenueSub === 'all'
      ? contracts.filter(c => {
          const d = new Date(c.effectiveDate);
          return !isNaN(d.getTime()) && d.getFullYear() === currentYear;
        })
      : contracts.filter(c => {
          const d = new Date(c.effectiveDate);
          if (isNaN(d.getTime())) return false;
          const m = String(d.getMonth() + 1).padStart(2, '0');
          return d.getFullYear() === currentYear && m === revenueSub;
        });

    // Get unique Nhóm values for the filter
    const uniqueNhoms = Array.from(new Set(monthFilteredContracts.map(c => c.nhom).filter(Boolean))).sort();

    // Apply Nhóm filter
    const nhomFilteredContracts = settingsNhomFilter
      ? monthFilteredContracts.filter(c => c.nhom === settingsNhomFilter)
      : monthFilteredContracts;

    const sortedContracts = getFiltered(getSorted(nhomFilteredContracts), ['agentCode', 'agentName', 'nhom', 'ban', 'contractNumber', 'maDaiLyTD', 'maNhom']);

    // Calculate KPIs from contracts (TÍNH LƯỢT 3tr column)
    const soLuongHD = sortedContracts.length;
    const tongIP = sortedContracts.reduce((s, c) => s + c.pdt10DT, 0);
    const tongAFYP = sortedContracts.reduce((s, c) => s + c.afyp, 0);
    const luotHoatDong = sortedContracts.filter(c => c.tinhLuot3tr >= 3000000).length;
    const luotChuan = sortedContracts.filter(c => c.tinhLuot3tr >= 12000000).length;
    // SL tuyển dụng trong tháng/năm (từ cấu trúc TVV)
    const slTuyenDungPeriod = revenueSub === 'all'
      ? tvvStructList.filter(t => {
          if (!t.ngayBatDau) return false;
          const d = new Date(t.ngayBatDau);
          return !isNaN(d.getTime()) && d.getFullYear() === currentYear;
        }).length
      : tvvStructList.filter(t => {
          if (!t.ngayBatDau) return false;
          const d = new Date(t.ngayBatDau);
          if (isNaN(d.getTime())) return false;
          return d.getFullYear() === currentYear && String(d.getMonth() + 1).padStart(2, '0') === revenueSub;
        }).length;
    // TVV đạt 3tr = same as luotHoatDong (unique TVV count)
    const tvvDat3tr = luotHoatDong;
    const tvvDat12tr = luotChuan;
    // Năng suất = Tổng SL HĐ / Tổng TVV hoạt được 3 triệu
    const nangSuatMonth = tvvDat3tr > 0 ? soLuongHD / tvvDat3tr : 0;
    // IP/AFYP (%) = (IP + 10% PĐT) / AFYP * 100
    const ipAfypMonth = tongAFYP > 0 ? (tongIP / tongAFYP) * 100 : 0;
    // ĐLHĐ = Tổng AFYP / Lượt HĐ (số TVV có tinhLuot3tr >= 3tr)
    const dlhdMonth = luotHoatDong > 0 ? tongAFYP / luotHoatDong : 0;

    // NTD count: count unique maDaiLyTD that exist in recruiters
    const ntdCodes = new Set(recruiters.map(r => r.agentCode));
    const activeNTD = new Set<string>();
    for (const c of sortedContracts) {
      if (c.maDaiLyTD && ntdCodes.has(c.maDaiLyTD)) activeNTD.add(c.maDaiLyTD);
    }

    return (
      <div>
        {/* Month sub-tabs — horizontally scrollable on mobile */}
        <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1 md:flex-wrap" style={{ scrollbarWidth: 'none' }}>
          {MONTHS.map(m => (
            <button
              key={m.key}
              onClick={() => { setRevenueSub(m.key); setSettingsNhomFilter(''); }}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${
                revenueSub === m.key
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                  : 'bg-emerald-800/60 text-emerald-300/70 hover:bg-emerald-500/10 hover:text-emerald-300 border border-transparent'
              }`}
            >
              {m.key === 'all' ? m.label : `T${m.key.replace('0', '')}`}
              {hasSectionLink(`revenue-${m.key}`) && <Link2 className="w-2.5 h-2.5" />}
            </button>
          ))}
        </div>

        {/* Compact KPI strip — grid on mobile, flex on desktop */}
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:flex gap-1.5 sm:gap-1.5 mb-3">
          {[
            { label: 'SL HĐ', value: formatNumber(soLuongHD), color: 'bg-amber-500/20 border-amber-500/30' },
            { label: 'IP + 10% PĐT', value: formatCurrency(tongIP), color: 'bg-emerald-500/20 border-emerald-500/30' },
            { label: 'AFYP', value: formatCurrency(tongAFYP), color: 'bg-sky-500/20 border-sky-500/30' },
            { label: 'Lượt HĐ', value: formatNumber(luotHoatDong), color: 'bg-violet-500/20 border-violet-500/30' },
            { label: 'Lượt chuẩn', value: formatNumber(luotChuan), color: 'bg-rose-500/20 border-rose-500/30' },
            { label: 'IP/AFYP', value: ipAfypMonth.toFixed(1) + '%', color: 'bg-emerald-500/20 border-emerald-500/30' },
            { label: 'Năng suất', value: nangSuatMonth.toFixed(2), color: 'bg-sky-500/20 border-sky-500/30' },
            { label: 'ĐLHĐ', value: formatCurrency(dlhdMonth), color: 'bg-emerald-500/20 border-emerald-500/30' },
            { label: 'NTD HĐ', value: formatNumber(activeNTD.size), color: 'bg-violet-500/20 border-violet-500/30' },
            { label: 'SL TD', value: formatNumber(slTuyenDungPeriod), color: 'bg-emerald-500/20 border-emerald-500/30' },
          ].map((kpi, i) => (
            <div key={i} className={`${kpi.color} border rounded-md px-2 sm:px-2.5 py-1.5 backdrop-blur-sm`} style={{ boxShadow: '0 0 8px rgba(0, 255, 136, 0.08)' }}>
              <p className="text-white/70 text-[8px] sm:text-[8px] font-bold leading-tight">{kpi.label}</p>
              <p className="text-white text-[11px] sm:text-[11px] font-extrabold truncate">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Nhóm filter + table header */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h3 className="text-xs sm:text-sm font-bold text-amber-300">
            {revenueSub === 'all' ? `Tổng hợp năm ${currentYear}` : monthLabel} — {sortedContracts.length} HĐ
          </h3>
          {uniqueNhoms.length > 0 && (
            <select
              value={settingsNhomFilter}
              onChange={(e) => setSettingsNhomFilter(e.target.value)}
              className="h-7 text-[10px] bg-gray-800 border border-emerald-500/30 text-white rounded px-2"
            >
              <option value="">Tất cả Nhóm</option>
              {uniqueNhoms.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          )}
          <label className="inline-flex items-center gap-1 px-2 py-1 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 rounded text-[11px] font-medium cursor-pointer"><Upload className="w-3 h-3" /> Import HĐ<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleImport('contracts', e)} /></label>
          <Button onClick={async () => {
            if (!confirm('Tính lại doanh thu từ tất cả HĐ?\nSẽ xóa doanh thu cũ và tính lại từ đầu.')) return;
            try {
              const r = await fetch('/api/revenue/sync-from-contracts', { method: 'POST' });
              if (r.ok) { const data = await r.json(); toast({ title: 'Đã tính doanh thu', description: data.message }); await fetchAllData(); }
              else { const err = await r.json().catch(() => ({})); toast({ title: 'Lỗi', description: err.error || 'Không thể tính doanh thu', variant: 'destructive' }); }
            } catch { toast({ title: 'Lỗi', description: 'Không thể kết nối', variant: 'destructive' }); }
          }} variant="outline" className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 h-7 text-xs"><Calculator className="w-3 h-3 mr-1" /> Tính doanh thu</Button>
          <Button onClick={() => handleDownloadTemplate('contracts')} variant="outline" className="border-violet-500/30 text-violet-300 hover:bg-violet-500/10 h-7 text-xs"><FileSpreadsheet className="w-3 h-3 mr-1" /> Tải mẫu</Button>
          <Button onClick={() => handleExport('contracts')} variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 h-7 text-xs"><Download className="w-3 h-3 mr-1" /> Xuất</Button>
        </div>

        {/* ===== Mobile card view (hidden on md+) ===== */}
        <div className="md:hidden space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#059669 transparent' }}>
          {sortedContracts.length === 0 && (
            <div className="text-center text-gray-500 text-sm py-6">Chưa có dữ liệu hợp đồng tháng này</div>
          )}
          {sortedContracts.slice(0, 200).map((c, idx) => (
            <div key={c.id} className="bg-[#0e0e18]/80 border border-emerald-500/20 rounded-lg p-2.5 space-y-1.5">
              {/* Header row: name + position */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-bold truncate">{c.agentName || '—'}</p>
                  <p className="text-emerald-300/60 text-[10px]">{c.position || '—'} • {c.nhom || '—'}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteContract(c.id)} className="h-5 w-5 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-shrink-0">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              {/* Key info grid */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                <div><span className="text-white/50">Mã ĐL:</span> <span className="text-white/90 font-mono">{c.agentCode || '—'}</span></div>
                <div><span className="text-white/50">Số HĐ:</span> <span className="text-white/90 font-mono">{c.contractNumber || '—'}</span></div>
                <div><span className="text-white/50">Ngày HL:</span> <span className="text-white/70">{formatDateDisplay(c.effectiveDate)}</span></div>
                <div><span className="text-white/50">Ngày PH:</span> <span className="text-white/70">{formatDateDisplay(c.issueDate)}</span></div>
                <div><span className="text-white/50">PĐT+10%:</span> <span className="text-amber-300 font-mono">{c.pdt10DT > 0 ? formatNumber(c.pdt10DT) : '—'}</span></div>
                <div><span className="text-white/50">AFYP:</span> <span className="text-amber-300 font-mono">{c.afyp > 0 ? formatNumber(c.afyp) : '—'}</span></div>
                <div><span className="text-white/50">Tính lượt 3 tr:</span> <span className={`font-mono ${c.tinhLuot3tr >= 3000000 ? 'text-emerald-300' : 'text-gray-500'}`}>{c.tinhLuot3tr > 0 ? formatNumber(c.tinhLuot3tr) : '—'}</span></div>
                <div><span className="text-white/50">Mã ĐL TD:</span> <span className="text-white/70 font-mono">{c.maDaiLyTD || '—'}</span></div>
              </div>
            </div>
          ))}
          {/* Mobile totals */}
          {sortedContracts.length > 0 && (
            <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-lg p-2.5 space-y-1">
              <p className="text-amber-300 text-xs font-bold">TỔNG CỘNG ({soLuongHD} HĐ)</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                <div><span className="text-white/50">IP + 10% PĐT:</span> <span className="text-amber-300 font-mono font-bold">{formatNumber(tongIP)}</span></div>
                <div><span className="text-white/50">AFYP:</span> <span className="text-amber-300 font-mono font-bold">{formatNumber(tongAFYP)}</span></div>
                <div><span className="text-white/50">Lượt HĐ (≥3tr):</span> <span className="text-violet-300 font-mono font-bold">{luotHoatDong}</span></div>
                <div><span className="text-white/50">Lượt chuẩn (≥12tr):</span> <span className="text-violet-300 font-mono font-bold">{luotChuan}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* ===== Desktop table view (hidden below md) ===== */}
        <div className="hidden md:block overflow-auto max-h-[calc(100vh-320px)] border border-emerald-500/30 rounded-lg" style={{ scrollbarWidth: 'thin', scrollbarColor: '#059669 transparent' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0 }} className="w-full min-w-[1400px]">
            <thead className="sticky top-0 z-10 bg-[#0e0e18] border-b-2 border-emerald-500/50">
              <tr>
                {/* STT column - auto-numbered */}
                <th className="px-2 py-2 text-[10px] font-bold text-white text-center whitespace-nowrap w-[40px]" style={{ textShadow: '0 0 8px rgba(0,255,136,0.4)' }}>STT</th>
                {CONTRACT_TABLE_COLUMNS.map(col => (
                  <th
                    key={col.f}
                    className="px-2 py-2 whitespace-nowrap text-[10px] font-bold text-white cursor-pointer hover:text-amber-300 transition-colors"
                    style={{ textShadow: '0 0 8px rgba(0,255,136,0.4)' }}
                    onClick={() => sortData(col.f)}
                  >
                    {col.l} <SortIcon field={col.f} />
                  </th>
                ))}
                <th className="px-1 py-2 w-[36px]"></th>
              </tr>
            </thead>
            <tbody>
              {sortedContracts.slice(0, 500).map((c, idx) => (
                <tr key={c.id} className={`${idx % 2 === 0 ? 'bg-[#0e0e18]/80' : 'bg-[#12122a]/80'} hover:bg-emerald-500/10 border-b border-emerald-500/10 transition-colors`}>
                  {/* Auto STT */}
                  <td className="text-[10px] py-1 px-2 text-gray-400 text-center">{idx + 1}</td>
                  {CONTRACT_TABLE_COLUMNS.map(col => (
                    <td key={col.f} className="text-[10px] py-1 px-1">
                      {col.type === 'number' ? (
                        <span className={`block px-1 text-right font-mono ${(c as any)[col.f] > 0 ? 'text-amber-300' : 'text-gray-600'}`}>
                          {(c as any)[col.f] > 0 ? formatNumber((c as any)[col.f]) : '—'}
                        </span>
                      ) : col.type === 'date' ? (
                        <span className="block px-1 text-white/70 whitespace-nowrap">{formatDateDisplay((c as any)[col.f])}</span>
                      ) : (
                        <span className="block px-1 text-white/90 whitespace-nowrap truncate max-w-[120px]" title={String((c as any)[col.f] || '')}>{String((c as any)[col.f] || '—')}</span>
                      )}
                    </td>
                  ))}
                  <td className="text-[10px] py-1 px-1">
                    <Button variant="ghost" size="sm" onClick={() => deleteContract(c.id)} className="h-5 w-5 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              ))}
              {sortedContracts.length === 0 && (
                <tr><td colSpan={CONTRACT_TABLE_COLUMNS.length + 2} className="text-center text-gray-500 text-sm py-6">Chưa có dữ liệu hợp đồng tháng này</td></tr>
              )}
              {/* Totals row - sticky bottom */}
              {sortedContracts.length > 0 && (
                <tr className="sticky bottom-0 bg-emerald-500/10 font-bold border-t-2 border-emerald-500/30">
                  <td className="text-[10px] py-2 px-2 text-amber-300 font-bold text-center" colSpan={1}>Σ</td>
                  <td className="text-[10px] py-2 px-2 text-amber-300 font-bold" colSpan={10}>TỔNG CỘNG ({soLuongHD} HĐ)</td>
                  {/* IP + 10% PĐT total */}
                  <td className="text-[10px] py-2 px-1 text-amber-300 text-right font-mono font-bold">{formatNumber(tongIP)}</td>
                  {/* AFYP total */}
                  <td className="text-[10px] py-2 px-1 text-amber-300 text-right font-mono font-bold">{formatNumber(tongAFYP)}</td>
                  {/* AD */}
                  <td className="text-[10px] py-2 px-2 text-gray-400"></td>
                  {/* TÍNH LƯỢT 3tr summary */}
                  <td className="text-[10px] py-2 px-1 text-violet-300 text-right font-mono font-bold" title={`HD: ${luotHoatDong} | Chuẩn: ${luotChuan}`}>
                    {luotHoatDong}/{luotChuan}
                  </td>
                  {/* MÃ ĐL TD */}
                  <td className="text-[10px] py-2 px-2 text-gray-400"></td>
                  {/* Delete */}
                  <td className="text-[10px] py-2 px-1"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer summary */}
        <p className="text-[9px] text-gray-500 mt-1.5 hidden md:block">
          IP + 10% PĐT: {formatCurrency(tongIP)} • AFYP: {formatCurrency(tongAFYP)} • Lượt HĐ: TÍNH LƯỢT ≥ 3tr ({luotHoatDong}) • Lượt chuẩn: ≥ 12tr ({luotChuan}) • IP/AFYP = {ipAfypMonth.toFixed(1)}% • Năng suất: {nangSuatMonth.toFixed(2)} • ĐLHĐ: {formatCurrency(dlhdMonth)} • NTD: {activeNTD.size}
        </p>
      </div>
    );
  };

  // ========== RENDER: Structure (3-column: Phòng → AD → Nhóm/TVV) ==========
  const renderStructure = () => {
    const filteredADs = selectedPhong ? adList.filter(a => a.maPhong === selectedPhong) : [];
    const filteredBanNhoms = selectedAD ? banNhomList.filter(b => b.maAD === selectedAD) : [];
    const selectedPhongItem = phongList.find(p => p.maPhong === selectedPhong);
    const selectedADItem = adList.find(a => a.maAD === selectedAD);

    return (
      <>
      <div className="space-y-3 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-extrabold text-emerald-400 neon-text drop-shadow-[0_0_6px_rgba(0,255,136,0.3)]">Cấu trúc tổ chức</h2>
          <div className="flex items-center gap-1">
            <div className="relative group">
              <Button variant="ghost" size="sm" className="h-7 text-[10px] text-emerald-400 hover:text-emerald-300"><Upload className="w-3 h-3 mr-1" /> Import</Button>
              <div className="absolute right-0 top-full mt-1 bg-[#0e0e18]/95 border border-emerald-500/30 rounded-md p-1.5 space-y-0.5 min-w-[160px] z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                {[
                  { tier: 'phong', label: 'Import Phòng' },
                  { tier: 'ad', label: 'Import AD' },
                  { tier: 'bannhom', label: 'Import Ban/Nhóm' },
                  { tier: 'tvv', label: 'Import TVV' },
                ].map(t => (
                  <button key={t.tier} onClick={() => setImportTier(t.tier)} className="w-full text-left text-[10px] text-emerald-300 hover:bg-emerald-500/10 px-2 py-1 rounded">{t.label}</button>
                ))}
              </div>
            </div>
            <div className="relative group">
              <Button variant="ghost" size="sm" className="h-7 text-[10px] text-violet-300 hover:text-violet-200"><FileSpreadsheet className="w-3 h-3 mr-1" /> Tải mẫu</Button>
              <div className="absolute right-0 top-full mt-1 bg-[#0e0e18]/95 border border-emerald-500/30 rounded-md p-1.5 space-y-0.5 min-w-[160px] z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                {[
                  { key: 'structure-phong', label: 'Mẫu Phòng' },
                  { key: 'structure-ad', label: 'Mẫu AD' },
                  { key: 'structure-bannhom', label: 'Mẫu Ban/Nhóm' },
                  { key: 'structure-tvv', label: 'Mẫu TVV' },
                ].map(t => (
                  <button key={t.key} onClick={() => handleDownloadTemplate(t.key)} className="w-full text-left text-[10px] text-emerald-300 hover:bg-emerald-500/10 px-2 py-1 rounded">{t.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className="flex-1 min-h-0 flex gap-2 overflow-hidden">
          {/* Column 1: PHÒNG */}
          <div className="w-1/3 min-w-[180px] flex flex-col border border-emerald-500/30 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-2 bg-emerald-500/15 border-b border-emerald-500/20 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 text-[11px] font-bold uppercase">Phòng ({phongList.length})</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setAddPhongOpen(true)} className="h-5 w-5 p-0 text-emerald-400 hover:text-emerald-300"><Plus className="w-3 h-3" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {phongList.length === 0 && (
                <div className="p-3 text-center">
                  <p className="text-white/30 text-[10px] italic">Chưa có Phòng</p>
                  <Button variant="ghost" size="sm" onClick={() => setAddPhongOpen(true)} className="text-emerald-400 hover:text-emerald-300 mt-1 text-[10px] h-5"><Plus className="w-3 h-3 mr-0.5" /> Thêm</Button>
                </div>
              )}
              {phongList.map(p => {
                const pADs = adList.filter(a => a.maPhong === p.maPhong);
                const isSelected = selectedPhong === p.maPhong;
                return (
                  <div key={p.id}
                    className={`flex items-center gap-2 px-2.5 py-2 cursor-pointer border-b border-emerald-500/10 transition-colors ${isSelected ? 'bg-emerald-500/25 border-l-2 border-l-emerald-400' : 'hover:bg-emerald-500/10 border-l-2 border-l-transparent'}`}
                    onClick={() => {
                      setSelectedPhong(prev => prev === p.maPhong ? '' : p.maPhong);
                      setSelectedAD('');
                      setSelectedBanNhom('');
                    }}
                  >
                    <Building2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-[11px] font-bold truncate">{p.tenPhong}</p>
                      <p className="text-emerald-200/50 text-[9px]">{p.maPhong} • {pADs.length} AD</p>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingPhong(p); }} className="h-4 w-4 p-0 text-white/30 hover:text-amber-400"><Edit2 className="w-2 h-2" /></Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeletePhong(p.id); }} className="h-4 w-4 p-0 text-white/30 hover:text-red-400"><Trash2 className="w-2 h-2" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: AD */}
          <div className="w-1/3 min-w-[180px] flex flex-col border border-amber-500/30 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-2 bg-amber-500/15 border-b border-amber-500/20 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <UserCog className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300 text-[11px] font-bold uppercase">AD {selectedPhongItem ? `(${filteredADs.length})` : ''}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { if (selectedPhong) { setNewAD(prev => ({ ...prev, maPhong: selectedPhong })); setAddADOpen(true); } }} className="h-5 w-5 p-0 text-amber-400 hover:text-amber-300"><Plus className="w-3 h-3" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {!selectedPhong ? (
                <div className="p-3 text-center">
                  <p className="text-white/30 text-[10px] italic">Chọn Phòng bên trái</p>
                </div>
              ) : filteredADs.length === 0 ? (
                <div className="p-3 text-center">
                  <p className="text-white/30 text-[10px] italic">Chưa có AD</p>
                  <Button variant="ghost" size="sm" onClick={() => { setNewAD(prev => ({ ...prev, maPhong: selectedPhong })); setAddADOpen(true); }} className="text-amber-400 hover:text-amber-300 mt-1 text-[10px] h-5"><Plus className="w-3 h-3 mr-0.5" /> Thêm</Button>
                </div>
              ) : filteredADs.map(a => {
                const aBNs = banNhomList.filter(b => b.maAD === a.maAD);
                const isSelected = selectedAD === a.maAD;
                return (
                  <div key={a.id}
                    className={`flex items-center gap-2 px-2.5 py-2 cursor-pointer border-b border-amber-500/10 transition-colors ${isSelected ? 'bg-amber-500/25 border-l-2 border-l-amber-400' : 'hover:bg-amber-500/10 border-l-2 border-l-transparent'}`}
                    onClick={() => {
                      setSelectedAD(prev => prev === a.maAD ? '' : a.maAD);
                      setSelectedBanNhom('');
                    }}
                  >
                    <UserCog className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-[11px] font-bold truncate">{a.tenAD}</p>
                      <p className="text-amber-200/50 text-[9px]">{a.maAD} • {aBNs.length} nhóm</p>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingAD(a); }} className="h-4 w-4 p-0 text-white/30 hover:text-amber-400"><Edit2 className="w-2 h-2" /></Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteAD(a.id); }} className="h-4 w-4 p-0 text-white/30 hover:text-red-400"><Trash2 className="w-2 h-2" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 3: NHÓM + TVV (collapsible) */}
          <div className="w-1/3 min-w-[220px] flex flex-col border border-sky-500/30 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-2 bg-sky-500/15 border-b border-sky-500/20 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-sky-300 text-[11px] font-bold uppercase">Nhóm {selectedADItem ? `(${filteredBanNhoms.length})` : ''}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { if (selectedAD) { setNewBanNhom(prev => ({ ...prev, maAD: selectedAD })); setAddBanNhomOpen(true); } }} className="h-5 w-5 p-0 text-sky-400 hover:text-sky-300"><Plus className="w-3 h-3" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {!selectedAD ? (
                <div className="p-3 text-center">
                  <p className="text-white/30 text-[10px] italic">Chọn AD bên trái</p>
                </div>
              ) : filteredBanNhoms.length === 0 ? (
                <div className="p-3 text-center">
                  <p className="text-white/30 text-[10px] italic">Chưa có Nhóm</p>
                  <Button variant="ghost" size="sm" onClick={() => { setNewBanNhom(prev => ({ ...prev, maAD: selectedAD })); setAddBanNhomOpen(true); }} className="text-sky-400 hover:text-sky-300 mt-1 text-[10px] h-5"><Plus className="w-3 h-3 mr-0.5" /> Thêm</Button>
                </div>
              ) : filteredBanNhoms.map(b => {
                const isExpanded = expandedBanNhoms.has(b.id);
                const bnTVVs = tvvStructList.filter(t => t.maBanNhom === b.maBanNhom);
                const tdCount = bnTVVs.filter(t => {
                  if (!t.ngayBatDau) return false;
                  const d = new Date(t.ngayBatDau);
                  return !isNaN(d.getTime()) && d.getFullYear() === new Date().getFullYear();
                }).length;
                return (
                  <div key={b.id} className="border-b border-sky-500/10">
                    {/* Nhóm header row */}
                    <div
                      className={`flex items-center gap-2 px-2.5 py-2 cursor-pointer transition-colors ${isExpanded ? 'bg-sky-500/20' : 'hover:bg-sky-500/10'}`}
                      onClick={() => {
                        setExpandedBanNhoms(prev => {
                          const next = new Set(prev);
                          if (next.has(b.id)) next.delete(b.id); else next.add(b.id);
                          return next;
                        });
                      }}
                    >
                      {isExpanded ? <ChevronDown className="w-3 h-3 text-sky-400 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-sky-400 flex-shrink-0" />}
                      <Network className="w-3 h-3 text-sky-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-[11px] font-bold truncate">{b.tenBanNhom}</p>
                        <p className="text-sky-200/50 text-[9px]">{b.maBanNhom}{b.ngayBatDau ? ` • BĐ: ${safeFormatDate(b.ngayBatDau)}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-[9px] text-sky-300 bg-sky-900/80 px-1.5 py-0.5 rounded-full whitespace-nowrap">{bnTVVs.length} TVV</span>
                        {tdCount > 0 && <span className="text-[9px] text-emerald-300 bg-emerald-900/80 px-1.5 py-0.5 rounded-full whitespace-nowrap">{tdCount} TD</span>}
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setNewTvv(prev => ({ ...prev, maBanNhom: b.maBanNhom })); setAddTvvOpen(true); }} className="h-4 w-4 p-0 text-violet-400 hover:text-violet-300"><Plus className="w-2 h-2" /></Button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingBanNhom(b); }} className="h-4 w-4 p-0 text-white/30 hover:text-amber-400"><Edit2 className="w-2 h-2" /></Button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteBanNhom(b.id); }} className="h-4 w-4 p-0 text-white/30 hover:text-red-400"><Trash2 className="w-2 h-2" /></Button>
                      </div>
                    </div>

                    {/* TVV list (collapsed by default) */}
                    {isExpanded && bnTVVs.length > 0 && (
                      <div className="bg-violet-500/5 border-t border-sky-500/10">
                        {bnTVVs.map(t => (
                          <div key={t.id} className="flex items-center justify-between px-3 py-1.5 hover:bg-violet-500/10 transition-colors border-b border-violet-500/5">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <Users className="w-2.5 h-2.5 text-violet-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-white text-[10px] font-semibold truncate">{t.agentName}</p>
                                <p className="text-violet-200/50 text-[8px]">{t.agentCode}{t.chucVu ? ` • ${t.chucVu}` : ''}{t.ngayBatDau ? ` • ${safeFormatDate(t.ngayBatDau)}` : ''}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingTvv(t); }} className="h-4 w-4 p-0 text-white/30 hover:text-amber-400"><Edit2 className="w-2 h-2" /></Button>
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteTvv(t.id); }} className="h-4 w-4 p-0 text-white/30 hover:text-red-400"><Trash2 className="w-2 h-2" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {isExpanded && bnTVVs.length === 0 && (
                      <div className="px-3 py-2 bg-violet-500/5 border-t border-sky-500/10">
                        <p className="text-white/30 text-[10px] italic">Chưa có TVV</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add Phong Dialog */}
      <Dialog open={addPhongOpen} onOpenChange={setAddPhongOpen}>
        <DialogContent className="bg-[#0e0e18]/95 backdrop-blur-xl border-emerald-500/30">
          <DialogHeader><DialogTitle className="text-emerald-400">Thêm Phòng</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div><Label className="text-xs text-emerald-200/70">Mã Phòng</Label><Input value={newPhong.maPhong} onChange={e => setNewPhong(p => ({ ...p, maPhong: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" /></div>
            <div><Label className="text-xs text-emerald-200/70">Tên Phòng</Label><Input value={newPhong.tenPhong} onChange={e => setNewPhong(p => ({ ...p, tenPhong: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" /></div>
            <div><Label className="text-xs text-emerald-200/70">Ghi chú</Label><Input value={newPhong.note} onChange={e => setNewPhong(p => ({ ...p, note: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" /></div>
          </div>
          <DialogFooter><Button onClick={handleAddPhong} className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300">Thêm</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add AD Dialog */}
      <Dialog open={addADOpen} onOpenChange={setAddADOpen}>
        <DialogContent className="bg-[#0e0e18]/95 backdrop-blur-xl border-emerald-500/30">
          <DialogHeader><DialogTitle className="text-amber-400">Thêm AD</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div><Label className="text-xs text-emerald-200/70">Mã AD</Label><Input value={newAD.maAD} onChange={e => setNewAD(p => ({ ...p, maAD: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" /></div>
            <div><Label className="text-xs text-emerald-200/70">Tên AD</Label><Input value={newAD.tenAD} onChange={e => setNewAD(p => ({ ...p, tenAD: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" /></div>
            <div><Label className="text-xs text-emerald-200/70">Mã Phòng</Label><Input value={newAD.maPhong} onChange={e => setNewAD(p => ({ ...p, maPhong: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" placeholder="VD: P001" /></div>
            <div><Label className="text-xs text-emerald-200/70">Ghi chú</Label><Input value={newAD.note} onChange={e => setNewAD(p => ({ ...p, note: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" /></div>
          </div>
          <DialogFooter><Button onClick={handleAddAD} className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300">Thêm</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add BanNhom Dialog */}
      <Dialog open={addBanNhomOpen} onOpenChange={setAddBanNhomOpen}>
        <DialogContent className="bg-[#0e0e18]/95 backdrop-blur-xl border-emerald-500/30">
          <DialogHeader><DialogTitle className="text-sky-400">Thêm Ban/Nhóm</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div><Label className="text-xs text-emerald-200/70">Mã Ban/Nhóm</Label><Input value={newBanNhom.maBanNhom} onChange={e => setNewBanNhom(p => ({ ...p, maBanNhom: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" /></div>
            <div><Label className="text-xs text-emerald-200/70">Tên Ban/Nhóm</Label><Input value={newBanNhom.tenBanNhom} onChange={e => setNewBanNhom(p => ({ ...p, tenBanNhom: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" /></div>
            <div><Label className="text-xs text-emerald-200/70">Mã AD</Label><Input value={newBanNhom.maAD} onChange={e => setNewBanNhom(p => ({ ...p, maAD: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" placeholder="VD: AD001" /></div>
            <div><Label className="text-xs text-emerald-200/70">Ngày bắt đầu</Label><Input type="date" value={newBanNhom.ngayBatDau} onChange={e => setNewBanNhom(p => ({ ...p, ngayBatDau: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" /></div>
            <div><Label className="text-xs text-emerald-200/70">Ghi chú</Label><Input value={newBanNhom.note} onChange={e => setNewBanNhom(p => ({ ...p, note: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" /></div>
          </div>
          <DialogFooter><Button onClick={handleAddBanNhom} className="bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300">Thêm</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add TVV Dialog */}
      <Dialog open={addTvvOpen} onOpenChange={setAddTvvOpen}>
        <DialogContent className="bg-[#0e0e18]/95 backdrop-blur-xl border-emerald-500/30">
          <DialogHeader><DialogTitle className="text-violet-400">Thêm TVV</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div><Label className="text-xs text-emerald-200/70">Mã TVV</Label><Input value={newTvv.agentCode} onChange={e => setNewTvv(p => ({ ...p, agentCode: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" /></div>
            <div><Label className="text-xs text-emerald-200/70">Tên TVV</Label><Input value={newTvv.agentName} onChange={e => setNewTvv(p => ({ ...p, agentName: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" /></div>
            <div><Label className="text-xs text-emerald-200/70">Mã Ban/Nhóm</Label><Input value={newTvv.maBanNhom} onChange={e => setNewTvv(p => ({ ...p, maBanNhom: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" placeholder="VD: BN001" /></div>
            <div><Label className="text-xs text-emerald-200/70">Chức vụ</Label><Input value={newTvv.chucVu} onChange={e => setNewTvv(p => ({ ...p, chucVu: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" /></div>
            <div><Label className="text-xs text-emerald-200/70">Ngày bắt đầu</Label><Input type="date" value={newTvv.ngayBatDau} onChange={e => setNewTvv(p => ({ ...p, ngayBatDau: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" /></div>
            <div><Label className="text-xs text-emerald-200/70">Ghi chú</Label><Input value={newTvv.note} onChange={e => setNewTvv(p => ({ ...p, note: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" /></div>
          </div>
          <DialogFooter><Button onClick={handleAddTvv} className="bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300">Thêm</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Phong Dialog */}
      <Dialog open={!!editingPhong} onOpenChange={(open) => { if (!open) setEditingPhong(null); }}>
        <DialogContent className="bg-[#0e0e18]/95 backdrop-blur-xl border-emerald-500/30">
          <DialogHeader><DialogTitle className="text-emerald-400">Sửa Phòng</DialogTitle></DialogHeader>
          {editingPhong && (
            <div className="space-y-2">
              <div><Label className="text-xs text-emerald-200/70">Mã Phòng</Label><Input value={editingPhong.maPhong} onChange={e => setEditingPhong(p => p ? { ...p, maPhong: e.target.value } : p)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
              <div><Label className="text-xs text-emerald-200/70">Tên Phòng</Label><Input value={editingPhong.tenPhong} onChange={e => setEditingPhong(p => p ? { ...p, tenPhong: e.target.value } : p)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
              <div><Label className="text-xs text-emerald-200/70">Ghi chú</Label><Input value={editingPhong.note} onChange={e => setEditingPhong(p => p ? { ...p, note: e.target.value } : p)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
            </div>
          )}
          <DialogFooter><Button onClick={handleEditPhong} className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300">Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit AD Dialog */}
      <Dialog open={!!editingAD} onOpenChange={(open) => { if (!open) setEditingAD(null); }}>
        <DialogContent className="bg-[#0e0e18]/95 backdrop-blur-xl border-emerald-500/30">
          <DialogHeader><DialogTitle className="text-amber-400">Sửa AD</DialogTitle></DialogHeader>
          {editingAD && (
            <div className="space-y-2">
              <div><Label className="text-xs text-emerald-200/70">Mã AD</Label><Input value={editingAD.maAD} onChange={e => setEditingAD(a => a ? { ...a, maAD: e.target.value } : a)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
              <div><Label className="text-xs text-emerald-200/70">Tên AD</Label><Input value={editingAD.tenAD} onChange={e => setEditingAD(a => a ? { ...a, tenAD: e.target.value } : a)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
              <div><Label className="text-xs text-emerald-200/70">Mã Phòng</Label><Input value={editingAD.maPhong} onChange={e => setEditingAD(a => a ? { ...a, maPhong: e.target.value } : a)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
              <div><Label className="text-xs text-emerald-200/70">Ghi chú</Label><Input value={editingAD.note} onChange={e => setEditingAD(a => a ? { ...a, note: e.target.value } : a)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
            </div>
          )}
          <DialogFooter><Button onClick={handleEditAD} className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300">Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit BanNhom Dialog */}
      <Dialog open={!!editingBanNhom} onOpenChange={(open) => { if (!open) setEditingBanNhom(null); }}>
        <DialogContent className="bg-[#0e0e18]/95 backdrop-blur-xl border-emerald-500/30">
          <DialogHeader><DialogTitle className="text-sky-400">Sửa Ban/Nhóm</DialogTitle></DialogHeader>
          {editingBanNhom && (
            <div className="space-y-2">
              <div><Label className="text-xs text-emerald-200/70">Mã Ban/Nhóm</Label><Input value={editingBanNhom.maBanNhom} onChange={e => setEditingBanNhom(b => b ? { ...b, maBanNhom: e.target.value } : b)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
              <div><Label className="text-xs text-emerald-200/70">Tên Ban/Nhóm</Label><Input value={editingBanNhom.tenBanNhom} onChange={e => setEditingBanNhom(b => b ? { ...b, tenBanNhom: e.target.value } : b)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
              <div><Label className="text-xs text-emerald-200/70">Mã AD</Label><Input value={editingBanNhom.maAD} onChange={e => setEditingBanNhom(b => b ? { ...b, maAD: e.target.value } : b)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
              <div><Label className="text-xs text-emerald-200/70">Ngày bắt đầu</Label><Input type="date" value={editingBanNhom.ngayBatDau ? toInputDate(editingBanNhom.ngayBatDau) : ''} onChange={e => setEditingBanNhom(b => b ? { ...b, ngayBatDau: e.target.value } : b)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
              <div><Label className="text-xs text-emerald-200/70">Ghi chú</Label><Input value={editingBanNhom.note} onChange={e => setEditingBanNhom(b => b ? { ...b, note: e.target.value } : b)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
            </div>
          )}
          <DialogFooter><Button onClick={handleEditBanNhom} className="bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300">Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit TVV Dialog */}
      <Dialog open={!!editingTvv} onOpenChange={(open) => { if (!open) setEditingTvv(null); }}>
        <DialogContent className="bg-[#0e0e18]/95 backdrop-blur-xl border-emerald-500/30">
          <DialogHeader><DialogTitle className="text-violet-400">Sửa TVV</DialogTitle></DialogHeader>
          {editingTvv && (
            <div className="space-y-2">
              <div><Label className="text-xs text-emerald-200/70">Mã TVV</Label><Input value={editingTvv.agentCode} onChange={e => setEditingTvv(t => t ? { ...t, agentCode: e.target.value } : t)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
              <div><Label className="text-xs text-emerald-200/70">Tên TVV</Label><Input value={editingTvv.agentName} onChange={e => setEditingTvv(t => t ? { ...t, agentName: e.target.value } : t)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
              <div><Label className="text-xs text-emerald-200/70">Mã Ban/Nhóm</Label><Input value={editingTvv.maBanNhom} onChange={e => setEditingTvv(t => t ? { ...t, maBanNhom: e.target.value } : t)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
              <div><Label className="text-xs text-emerald-200/70">Chức vụ</Label><Input value={editingTvv.chucVu} onChange={e => setEditingTvv(t => t ? { ...t, chucVu: e.target.value } : t)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
              <div><Label className="text-xs text-emerald-200/70">Ngày bắt đầu</Label><Input type="date" value={editingTvv.ngayBatDau ? toInputDate(editingTvv.ngayBatDau) : ''} onChange={e => setEditingTvv(t => t ? { ...t, ngayBatDau: e.target.value } : t)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
              <div><Label className="text-xs text-emerald-200/70">Ghi chú</Label><Input value={editingTvv.note} onChange={e => setEditingTvv(t => t ? { ...t, note: e.target.value } : t)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
            </div>
          )}
          <DialogFooter><Button onClick={handleEditTvv} className="bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300">Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={!!importTier} onOpenChange={(open) => { if (!open) { setImportTier(''); setImportFile(null); setImportPreview([]); setImportData(''); } }}>
        <DialogContent className="bg-[#0e0e18]/95 backdrop-blur-xl border-emerald-500/30 max-w-lg">
          <DialogHeader><DialogTitle className="text-emerald-400">Import {importTier === 'phong' ? 'Phòng' : importTier === 'ad' ? 'AD' : importTier === 'bannhom' ? 'Ban/Nhóm' : 'TVV'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {/* File upload zone */}
            <div
              className="border-2 border-dashed border-emerald-500/30 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-400/60 hover:bg-emerald-500/5 transition-all"
              onClick={() => { const inp = document.getElementById('import-file-input'); if (inp) inp.click(); }}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={e => {
                e.preventDefault(); e.stopPropagation();
                const file = e.dataTransfer.files[0];
                if (file) handleImportFile(file);
              }}
            >
              <input id="import-file-input" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) handleImportFile(file); }} />
              {importFile ? (
                <div className="space-y-1">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-emerald-300 text-xs font-bold">{importFile.name}</p>
                  <p className="text-emerald-200/50 text-[10px]">{(importFile.size / 1024).toFixed(1)} KB — Nhấn để đổi file</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-8 h-8 text-emerald-400/50 mx-auto" />
                  <p className="text-emerald-300 text-xs font-bold">Kéo thả file hoặc nhấn chọn</p>
                  <p className="text-emerald-200/50 text-[10px]">Hỗ trợ .xlsx, .xls, .csv</p>
                </div>
              )}
            </div>

            {/* Preview table */}
            {importPreview.length > 0 && (
              <div className="space-y-1">
                <p className="text-emerald-300 text-[10px] font-bold">Xem trước ({importPreview.length} bản ghi)</p>
                <div className="max-h-40 overflow-auto border border-emerald-500/20 rounded-md">
                  <table className="w-full text-[10px]">
                    <thead className="bg-emerald-500/10 sticky top-0">
                      <tr>
                        {Object.keys(importPreview[0]).map(k => <th key={k} className="px-2 py-1 text-left text-emerald-300 whitespace-nowrap">{k}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t border-emerald-500/10">
                          {Object.values(row).map((v, j) => <td key={j} className="px-2 py-1 text-white/80 whitespace-nowrap">{v}</td>)}
                        </tr>
                      ))}
                      {importPreview.length > 5 && (
                        <tr className="border-t border-emerald-500/10">
                          <td colSpan={Object.keys(importPreview[0]).length} className="px-2 py-1 text-emerald-400/60 text-center">... còn {importPreview.length - 5} bản ghi</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Fallback: paste data */}
            <details className="group">
              <summary className="text-white/40 text-[10px] cursor-pointer hover:text-white/60">Hoặc dán dữ liệu từ Excel (Tab-separated)</summary>
              <textarea value={importData} onChange={e => { setImportData(e.target.value); setImportFile(null); setImportPreview([]); }} className="w-full h-28 bg-white/5 border border-emerald-500/20 rounded-md p-2 text-white text-xs font-mono mt-2" placeholder={
                importTier === 'phong' ? 'maPhong\ttenPhong\tnote\nP001\tPhòng KD\tGhi chú'
                : importTier === 'ad' ? 'maAD\ttenAD\tmaPhong\tnote\nAD001\tNguyễn Văn A\tP001\tGhi chú'
                : importTier === 'bannhom' ? 'maBanNhom\ttenBanNhom\tmaAD\tnote\nBN001\tBan 1\tAD001\tGhi chú'
                : 'agentCode\tagentName\tmaBanNhom\tchucVu\tngayBatDau\tnote\nTV001\tTrần B\tBN001\tTVV\t2024-01-01\tGhi chú'
              } />
            </details>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setImportTier(''); setImportFile(null); setImportPreview([]); setImportData(''); }} className="text-white/50">Huỷ</Button>
            <Button onClick={handleImportStructure} disabled={importLoading || (importPreview.length === 0 && !importData)} className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 disabled:opacity-50">
              {importLoading ? 'Đang import...' : `Import${importPreview.length > 0 ? ` (${importPreview.length} bản ghi)` : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
    );
  };

  // ========== RENDER SHEET DISPATCHER ==========
  const renderSheet = () => {
    if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /><span className="ml-3 text-emerald-300 text-sm">Đang tải...</span></div>;
    switch (activeSheet) {
      case 'overview': return renderOverview();
      case 'leaders': return renderLeaders();
      case 'recruiters': return renderRecruiters();
      case 'revenue': return renderRevenue();
      case 'report': return renderReport();
      case 'structure': return renderStructure();
      case 'spreadsheet': return <SpreadsheetSheet onlineSettings={onlineSettings} saveSetting={saveSetting} />;
    }
  };

  return (
    <div className="h-screen flex flex-col fixed inset-0 z-50 bg-[#0e0e18]/80">
      {/* Header */}
      <header className="border-b border-emerald-500/30 bg-[#0e0e18]/80 backdrop-blur-md px-2 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Mobile hamburger */}
        <Button variant="ghost" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-8 w-8 p-0 md:hidden"><Menu className="w-5 h-5" /></Button>
        <Button variant="ghost" onClick={() => router.push('/')} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-8 w-8 p-0"><ArrowLeft className="w-4 h-4" /></Button>
        <h1 className="text-sm sm:text-lg font-extrabold text-emerald-400 drop-shadow-[0_0_10px_rgba(0,255,136,0.5)] drop-shadow-[0_0_30px_rgba(0,255,136,0.2)] truncate">Quản Lý Dữ Liệu</h1>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" onClick={() => setSettingsDialogOpen(true)} className="text-emerald-400/70 hover:text-emerald-300 hover:bg-emerald-500/10 h-8 w-8 p-0" title="Cài đặt"><Settings className="w-4 h-4" /></Button>
          <div className="relative hidden sm:block">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-emerald-400" />
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tìm kiếm..." className="h-7 w-[160px] pl-7 text-xs bg-white/5 border-emerald-500/30 text-white placeholder-emerald-400/50" />
            {searchTerm && <X className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400 cursor-pointer" onClick={() => setSearchTerm('')} />}
          </div>
          <div className="relative sm:hidden">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-emerald-400" />
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tìm..." className="h-7 w-[80px] pl-7 text-xs bg-white/5 border-emerald-500/30 text-white placeholder-emerald-400/50" />
            {searchTerm && <X className="w-3 h-3 absolute right-1 top-1/2 -translate-y-1/2 text-emerald-400 cursor-pointer" onClick={() => setSearchTerm('')} />}
          </div>
          <Button variant="ghost" onClick={() => loadSheet(activeSheet, true)} className="text-emerald-400/70 hover:text-emerald-300 hover:bg-emerald-500/10 h-8 w-8 p-0" title="Tải lại dữ liệu"><RefreshCw className="w-3.5 h-3.5" /></Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Mobile overlay */}
        {sidebarOpen && <div className="fixed top-[44px] md:top-auto inset-x-0 bottom-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
        {/* Sidebar */}
        <nav className={`fixed md:static top-[44px] md:top-auto bottom-0 md:bottom-auto left-0 z-50 md:z-auto w-[220px] bg-[#0e0e18]/95 md:bg-[#0e0e18]/90 backdrop-blur-md border-r border-emerald-500/30 flex-shrink-0 overflow-y-auto transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          {/* Mobile close button */}
          <div className="flex items-center justify-between p-2 border-b border-emerald-500/20 md:hidden">
            <span className="text-xs font-bold text-emerald-300">Menu</span>
            <Button variant="ghost" onClick={() => setSidebarOpen(false)} className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300"><ChevronLeft className="w-4 h-4" /></Button>
          </div>
          <div className="p-2 space-y-0.5">
            {SHEETS.map((sheet, index) => {
              const isActive = activeSheet === sheet.key;
              const isExpanded = sheet.hasSub && revenueExpanded && activeSheet === 'revenue';
              return (
                <div key={sheet.key}>
                  <button
                    onClick={() => { setActiveSheet(sheet.key); setSearchTerm(''); setSortField(''); if (sheet.hasSub) setRevenueExpanded(!revenueExpanded); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors ${
                      isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 neon-glow' : 'text-emerald-300/60 hover:bg-emerald-500/10 hover:text-emerald-300'
                    }`}
                  >
                    <sheet.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate flex-1 text-left">{sheet.label}</span>
                    {hasSectionLink(sheet.key) && <Link2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                    {sheet.hasSub && (revenueExpanded && activeSheet === 'revenue' ? <ChevronDown className="w-3.5 h-3.5 text-emerald-300" /> : <ChevronRight className="w-3.5 h-3.5 text-emerald-300" />)}
                  </button>
                  {/* Revenue sub-items */}
                  {sheet.hasSub && isExpanded && (
                    <div className="ml-6 mt-0.5 space-y-0.5">
                      {MONTHS.map(m => (
                        <button
                          key={m.key}
                          onClick={() => { setActiveSheet('revenue'); setRevenueSub(m.key); setSidebarOpen(false); }}
                          className={`w-full flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold rounded transition-colors ${
                            revenueSub === m.key ? 'bg-emerald-500/20 text-emerald-300' : 'text-emerald-300/60 hover:bg-emerald-500/10 hover:text-emerald-300'
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

        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-2 sm:p-4">
          {renderSheet()}
        </main>
      </div>

      {/* ========== Settings Dialog ========== */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="bg-[#0e0e18]/95 backdrop-blur-xl border-emerald-500/30 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-emerald-400 flex items-center gap-2">
              <Settings className="w-5 h-5" /> Cài đặt hệ thống
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            {/* Section 1: Chỉ tiêu (Targets) */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-400" /> Chỉ tiêu
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Tổng IP', key: 'nmc-target-tong-ip', val: targetTongIP, fmt: (v: number) => formatCurrency(v) },
                  { label: 'Tổng AFYP', key: 'nmc-target-tong-afyp', val: targetTongAFYP, fmt: (v: number) => formatCurrency(v) },
                  { label: 'SL HĐ', key: 'nmc-target-tong-sl-hd', val: targetTongSLHD, fmt: (v: number) => formatNumber(v) },
                  { label: 'Lượt HĐ', key: 'nmc-target-luot-hd', val: targetLuotHD, fmt: (v: number) => formatNumber(v) },
                  { label: 'Lượt HĐ chuẩn', key: 'nmc-target-luot-hd-chuan', val: targetLuotHDChuan, fmt: (v: number) => formatNumber(v) },
                  { label: 'Năng suất', key: 'nmc-target-nang-suat', val: targetNangSuat, fmt: (v: number) => v.toFixed(1) },
                  { label: 'ĐLHĐ', key: 'nmc-target-dlhd', val: targetDLHD, fmt: (v: number) => formatCurrency(v) },
                  { label: 'SL TB/TN', key: 'nmc-target-sl-tb-tn', val: targetSLTBTN, fmt: (v: number) => formatNumber(v) },
                  { label: 'SL NTD', key: 'nmc-target-sl-ntd', val: targetSLNTD, fmt: (v: number) => formatNumber(v) },
                  { label: 'SL Tuyển dụng', key: 'nmc-target-sl-tuyen-dung', val: targetSLTuyenDung, fmt: (v: number) => formatNumber(v) },
                ].map(item => (
                  <div key={item.key} className="flex items-center gap-2">
                    <Label className="text-[10px] text-gray-400 w-24 shrink-0">{item.label}</Label>
                    <Input
                      type="number"
                      defaultValue={item.val || ''}
                      placeholder="Chỉ tiêu..."
                      className="h-7 text-[10px] bg-gray-800 border-emerald-500/30 text-white flex-1"
                      onBlur={(e) => { const v = parseFloat(e.target.value) || 0; saveSetting(item.key, String(v)); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { const v = parseFloat((e.target as HTMLInputElement).value) || 0; saveSetting(item.key, String(v)); } }}
                    />
                    <span className="text-[9px] text-gray-500 w-20 text-right truncate">{item.val > 0 ? item.fmt(item.val) : '—'}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-emerald-500/20 pt-2">
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-gray-400 w-24 shrink-0">Mục DS năm</Label>
                  <Input
                    type="number"
                    defaultValue={annualRevenueTarget || ''}
                    placeholder="Mục doanh số..."
                    className="h-9 text-sm bg-gray-800 border-amber-500/30 text-white flex-1 min-w-[140px]"
                    onBlur={(e) => { const v = parseFloat(e.target.value) || 0; saveSetting('nmc-annual-revenue-target', String(v)); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { const v = parseFloat((e.target as HTMLInputElement).value) || 0; saveSetting('nmc-annual-revenue-target', String(v)); } }}
                  />
                  <span className="text-[9px] text-gray-500 w-20 text-right truncate">{annualRevenueTarget > 0 ? formatCurrency(annualRevenueTarget) : '—'}</span>
                </div>
              </div>
              {/* Kế hoạch từng tháng */}
              <div className="border-t border-emerald-500/20 pt-2 mt-2">
                <h4 className="text-[10px] font-bold text-amber-300 mb-2 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Kế hoạch từng tháng
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {Array.from({length: 12}, (_, i) => {
                    const m = String(i + 1).padStart(2, '0');
                    const keys = {
                      ip: `nmc-target-ip-month-${m}`,
                      afyp: `nmc-target-afyp-month-${m}`,
                      luotHD: `nmc-target-luot-hd-month-${m}`,
                      slHD: `nmc-target-sl-hd-month-${m}`,
                      tyTrong: `nmc-target-ty-trong-month-${m}`,
                      slTD: `nmc-target-sl-td-month-${m}`,
                    };
                    const vals = {
                      ip: parseFloat(onlineSettings[keys.ip] || '0') || 0,
                      afyp: parseFloat(onlineSettings[keys.afyp] || '0') || 0,
                      luotHD: parseFloat(onlineSettings[keys.luotHD] || '0') || 0,
                      slHD: parseFloat(onlineSettings[keys.slHD] || '0') || 0,
                      tyTrong: parseFloat(onlineSettings[keys.tyTrong] || '0') || 0,
                      slTD: parseFloat(onlineSettings[keys.slTD] || '0') || 0,
                    };
                    return (
                      <div key={m} className="bg-gray-800 rounded-md p-2 border border-emerald-500/20 space-y-1">
                        <p className="text-[10px] font-bold text-emerald-300">Tháng {i + 1}</p>
                        {[
                          { label: 'IP', key: keys.ip, val: vals.ip },
                          { label: 'AFYP', key: keys.afyp, val: vals.afyp },
                          { label: 'Lượt HĐ', key: keys.luotHD, val: vals.luotHD },
                          { label: 'SL HĐ', key: keys.slHD, val: vals.slHD },
                          { label: 'Tỷ trọng%', key: keys.tyTrong, val: vals.tyTrong },
                          { label: 'SL TD', key: keys.slTD, val: vals.slTD },
                        ].map(item => (
                          <div key={item.key} className="flex items-center gap-1">
                            <Label className="text-[8px] text-gray-400 w-14 shrink-0">{item.label}</Label>
                            <Input
                              type="number"
                              defaultValue={item.val || ''}
                              placeholder="0"
                              className="h-5 text-[9px] bg-gray-700 border-gray-600 text-white flex-1 px-1"
                              onBlur={(e: any) => { const v = parseFloat(e.target.value) || 0; saveSetting(item.key, String(v)); }}
                              onKeyDown={(e: any) => { if (e.key === 'Enter') { const v = parseFloat(e.target.value) || 0; saveSetting(item.key, String(v)); } }}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section 2: Đồng bộ & Nguồn dữ liệu */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4" /> Đồng bộ & Nguồn dữ liệu
              </h3>
              {/* Sync toggle */}
              <div className={`rounded-lg p-3 border-2 ${syncEnabled ? 'bg-emerald-700/50 border-emerald-500/30' : 'bg-amber-700/50 border-amber-500/30'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {syncEnabled ? <CheckCircle2 className="w-5 h-5 text-emerald-300" /> : <AlertTriangle className="w-5 h-5 text-amber-300" />}
                    <div>
                      <h3 className={`text-sm font-bold ${syncEnabled ? 'text-emerald-300' : 'text-amber-300'}`}>{syncEnabled ? 'Đồng bộ tự động: BẬT' : 'Đồng bộ tự động: TẮT'}</h3>
                      <p className="text-gray-300 text-xs">{syncEnabled ? 'HĐ & Nhân sự tự động từ Google Sheets (chỉ xem)' : 'Chế độ thủ công: chỉnh sửa, thêm, xóa, import'}{lastSyncTime ? ` — Cập nhật ${lastSyncTime}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {syncEnabled && (
                      <Button variant="ghost" size="sm" onClick={() => { syncedLinksRef.current = ''; autoSyncFromLinks(); }} className="h-7 text-[10px] text-emerald-400 hover:text-emerald-300" title="Đồng bộ ngay">
                        <RefreshCw className="w-3 h-3 mr-1" /> Sync
                      </Button>
                    )}
                    <button onClick={handleSyncToggle}>
                      {syncEnabled ? <ToggleRight className="w-8 h-8 text-emerald-400 cursor-pointer" /> : <ToggleLeft className="w-8 h-8 text-amber-400 cursor-pointer" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Per-section settings */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#059669 transparent' }}>
                {[
                  { key: 'leaders', label: 'DS Trưởng Ban/Nhóm' },
                  { key: 'recruiters', label: 'DS Người TD' },
                  { key: 'revenue', label: 'Doanh thu' },
                  { key: 'structure', label: 'Cấu trúc' },
                  { key: 'spreadsheet', label: 'Trang tính' },
                  ...MONTHS.map(m => ({ key: `revenue-${m.key}`, label: `Doanh thu - ${m.label}` })),
                ].map(section => {
                  const link = onlineSettings[`nmc-link-${section.key}`] || '';
                  const sync = onlineSettings[`nmc-sync-${section.key}`];
                  const syncOn = sync === undefined || sync === '' || sync === 'true';
                  return (
                    <div key={section.key} className="bg-emerald-800/60 rounded-md p-2.5 border border-emerald-600/50">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-white text-xs font-bold">{section.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold ${syncOn ? 'text-emerald-300' : 'text-amber-300'}`}>
                            {syncOn ? 'Auto' : 'Thủ công'}
                          </span>
                          <button
                            onClick={() => saveSetting(`nmc-sync-${section.key}`, String(!syncOn))}
                            className="flex items-center"
                          >
                            {syncOn
                              ? <ToggleRight className="w-6 h-6 text-emerald-400 cursor-pointer" />
                              : <ToggleLeft className="w-6 h-6 text-amber-400 cursor-pointer" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          value={link}
                          onChange={(e) => {
                            setOnlineSettings(prev => ({ ...prev, [`nmc-link-${section.key}`]: e.target.value }));
                          }}
                          onBlur={() => saveSetting(`nmc-link-${section.key}`, link)}
                          placeholder="Google Sheets URL..."
                          className="h-6 text-[10px] bg-gray-800 border-gray-600 text-white placeholder-gray-500 flex-1"
                        />
                        {link && (
                          <a href={link} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 flex-shrink-0">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setSettingsDialogOpen(false)} className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300">Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
