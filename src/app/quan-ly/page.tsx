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
  Merge, Split, Target, BarChart3, Building2, UserCog, Edit2,
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

interface PhongItem { id: string; maPhong: string; tenPhong: string; note: string; }
interface ADItem { id: string; maAD: string; tenAD: string; maPhong: string; note: string; }
interface BanNhomItem { id: string; maBanNhom: string; tenBanNhom: string; maAD: string; note: string; }
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
type SheetKey = 'overview' | 'leaders' | 'recruiters' | 'revenue' | 'structure' | 'spreadsheet' | 'settings';
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
  { key: 'settings', label: 'Cài đặt', icon: Settings, synced: false },
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
  const [revenueExpanded, setRevenueExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

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
    // Optimistic update
    const prevValue = onlineSettings[key];
    setOnlineSettings(prev => ({ ...prev, [key]: value }));
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
  }, [onlineSettings]);

  // syncEnabled now derived from onlineSettings
  const [syncEnabled, setSyncEnabled] = useState(true);

  // Update syncEnabled when onlineSettings loads
  useEffect(() => {
    const saved = onlineSettings['nmc-sync-enabled'];
    if (saved !== undefined && saved !== '') setSyncEnabled(saved === 'true');
  }, [onlineSettings['nmc-sync-enabled']]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const [newBanNhom, setNewBanNhom] = useState({ maBanNhom: '', tenBanNhom: '', maAD: '', note: '' });
  const [newTvv, setNewTvv] = useState({ agentCode: '', agentName: '', maBanNhom: '', chucVu: '', ngayBatDau: '', note: '' });

  // Edit state
  const [editingPhong, setEditingPhong] = useState<PhongItem | null>(null);
  const [editingAD, setEditingAD] = useState<ADItem | null>(null);
  const [editingBanNhom, setEditingBanNhom] = useState<BanNhomItem | null>(null);
  const [editingTvv, setEditingTvv] = useState<TVVStructItem | null>(null);

  // Import dialog
  const [importTier, setImportTier] = useState<string>('');
  const [importData, setImportData] = useState<string>('');

  // Data cache: track which sheets have been loaded to avoid re-fetch on tab switch
  const loadedSheets = useRef<Set<SheetKey>>(new Set());

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

  const loadSheet = useCallback((sheet: SheetKey, force = false) => {
    // Skip if already loaded and not forcing refresh
    if (!force && loadedSheets.current.has(sheet)) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const loaders: Record<SheetKey, () => Promise<void>> = {
      overview: async () => { await fetchAllData(); }, // Single request for all data
      leaders: fetchLeaders,
      recruiters: fetchRecruiters,
      revenue: async () => { await Promise.all([fetchRevenue(), fetchContracts()]); },
      structure: async () => { await Promise.all([fetchLeaders(), fetchStaff(), fetchPhong(), fetchAD(), fetchBanNhom(), fetchTvvStruct()]); },
      spreadsheet: async () => {},
      settings: async () => {},
    };
    loaders[sheet]().then(() => {
      loadedSheets.current.add(sheet);
    }).finally(() => setIsLoading(false));
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
    try { const res = await fetch('/api/structure/bannhom', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newBanNhom) }); if (res.ok) { setAddBanNhomOpen(false); setNewBanNhom({ maBanNhom: '', tenBanNhom: '', maAD: '', note: '' }); fetchBanNhom(); toast({ title: 'Đã thêm Ban/Nhóm' }); } } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
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
    try { const res = await fetch(`/api/structure/bannhom/${editingBanNhom.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ maBanNhom: editingBanNhom.maBanNhom, tenBanNhom: editingBanNhom.tenBanNhom, maAD: editingBanNhom.maAD, note: editingBanNhom.note }) }); if (res.ok) { setEditingBanNhom(null); fetchBanNhom(); toast({ title: 'Đã cập nhật' }); } } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, [editingBanNhom, fetchBanNhom]);
  const handleEditTvv = useCallback(async () => {
    if (!editingTvv) return;
    try { const res = await fetch(`/api/structure/tvv/${editingTvv.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentCode: editingTvv.agentCode, agentName: editingTvv.agentName, maBanNhom: editingTvv.maBanNhom, chucVu: editingTvv.chucVu, ngayBatDau: editingTvv.ngayBatDau || '', note: editingTvv.note }) }); if (res.ok) { setEditingTvv(null); fetchTvvStruct(); toast({ title: 'Đã cập nhật' }); } } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, [editingTvv, fetchTvvStruct]);

  const handleImportStructure = useCallback(async () => {
    if (!importData || !importTier) return;
    try {
      const lines = importData.trim().split('\n');
      const header = lines[0].split('\t');
      const rows = lines.slice(1);
      const records = rows.map(line => {
        const cols = line.split('\t');
        const record: any = {};
        header.forEach((h, i) => { record[h.trim()] = (cols[i] || '').trim(); });
        return record;
      });
      let endpoint = '';
      if (importTier === 'phong') endpoint = '/api/structure/phong';
      else if (importTier === 'ad') endpoint = '/api/structure/ad';
      else if (importTier === 'bannhom') endpoint = '/api/structure/bannhom';
      else if (importTier === 'tvv') endpoint = '/api/structure/tvv';
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(records) });
      if (res.ok) {
        fetchPhong(); fetchAD(); fetchBanNhom(); fetchTvvStruct();
        setImportData(''); setImportTier('');
        toast({ title: 'Import thành công' });
      }
    } catch (e) { console.error('Import error', e); toast({ title: 'Lỗi import', variant: 'destructive' }); }
  }, [importData, importTier, fetchPhong, fetchAD, fetchBanNhom, fetchTvvStruct]);

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
  // Helper: convert various date formats to ISO string (yyyy-mm-dd) - timezone safe
  const parseDateValue = useCallback((val: any): string | null => {
    if (!val || val === '' || val === '—') return null;
    // Already a Date object - XLSX with cellDates:true creates UTC Date objects
    if (val instanceof Date) {
      const y = val.getUTCFullYear();
      const m = String(val.getUTCMonth() + 1).padStart(2, '0');
      const d = String(val.getUTCDate()).padStart(2, '0');
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
      // Try native parse - use UTC to avoid timezone shift
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        if (y < 1900 || y > 2100) return null;
        return `${y}-${m}-${day}`;
      }
    }
    // Excel serial number (days since 1899-12-30)
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
        fetchLeaders();
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
        fetchRevenue();
      } else if (sheetName === 'contracts') {
        // Batch import - prepare all rows then send in one API call
        const contractRows = [];
        for (const r of data) {
          const row = r as any;
          const effectiveDate = parseDateValue(row['Ngày hiệu lực'] || row['effectiveDate']);
          const contractNumber = String(row['Số hợp đồng'] || row['Số HĐ'] || row['contractNumber'] || '');
          const agentName = String(row['Tên'] || row['Họ tên'] || row['agentName'] || '');
          const fyp = parseFloat(String(row['FYP'] || row['IP'] || row['fyp'] || '0').replace(/,/g, '')) || 0;

          // Skip rows without minimum required data
          if (!contractNumber && !agentName) { failCount++; continue; }

          contractRows.push({
            stt: parseInt(String(row['STT'] || row['stt'] || '0').replace(/,/g, '')) || 0,
            ban: String(row['Ban'] || row['ban'] || ''),
            maTruongBan: String(row['Mã trưởng ban'] || row['maTruongBan'] || ''),
            nhom: String(row['Nhóm'] || row['nhom'] || ''),
            maBanNhom: String(row['Mã Ban/Nhóm'] || row['maBanNhom'] || ''),
            maTruongBanNhom: String(row['Mã trưởng Ban/Nhóm'] || row['maTruongBanNhom'] || ''),
            maDL: String(row['Mã ĐL'] || row['maDL'] || ''),
            agentCode: String(row['Mã TVV'] || row['agentCode'] || row['Mã ĐL'] || ''),
            agentName: agentName || 'Chưa nhập',
            position: String(row['Chức vụ'] || row['position'] || ''),
            ngayBatDauLamViec: parseDateValue(row['Ngày bắt đầu làm việc'] || row['ngayBatDauLamViec']),
            contractNumber: contractNumber || 'HD_' + Date.now() + '_' + contractRows.length,
            effectiveDate: effectiveDate || new Date().toISOString().slice(0, 10),
            issueDate: parseDateValue(row['Ngày phát hành'] || row['Ngày cấp'] || row['issueDate']) || effectiveDate || new Date().toISOString().slice(0, 10),
            pdt10DT: parseFloat(String(row['PĐT + 10% ĐT'] || row['pdt10DT'] || '0').replace(/,/g, '')) || 0,
            fyp: fyp,
            nguonDuLieu: String(row['Nguồn dữ liệu'] || row['nguonDuLieu'] || ''),
            hopDongToChuc: String(row['Hợp đồng tổ chức'] || row['hopDongToChuc'] || ''),
            dkDongPhi: String(row['ĐK ĐÓNG PHÍ'] || row['dkDongPhi'] || ''),
            phiDongThem: parseFloat(String(row['PHÍ ĐÓNG THÊM'] || row['phiDongThem'] || '0').replace(/,/g, '')) || 0,
            afypChuaTru10DT: parseFloat(String(row['AFYP chưa trừ 10% ĐT'] || row['afypChuaTru10DT'] || '0').replace(/,/g, '')) || 0,
            afyp: parseFloat(String(row['AFYP'] || row['afyp'] || '0').replace(/,/g, '')) || 0,
            ad: String(row['AD'] || row['ad'] || ''),
            nhom2: String(row['NHÓM'] || row['nhom2'] || ''),
            ngayBatDauLamViec2: parseDateValue(row['NGÀY BẮT ĐẦU LÀM VIỆC'] || row['ngayBatDauLamViec2']),
            thangTD: parseInt(String(row['THÁNG TD'] || row['thangTD'] || '0').replace(/,/g, '')) || 0,
            namTD: parseInt(String(row['NĂM TD'] || row['namTD'] || '0').replace(/,/g, '')) || 0,
            thangHL: parseInt(String(row['THÁNG HL'] || row['thangHL'] || '0').replace(/,/g, '')) || 0,
            tinhLuot: parseFloat(String(row['Tính lượt'] || row['tinhLuot'] || '0').replace(/,/g, '')) || 0,
            tinhLuot3tr: parseFloat(String(row['TÍNH LƯỢT 3 tr'] || row['tinhLuot3tr'] || '0').replace(/,/g, '')) || 0,
            maDaiLyTD: String(row['Mã đại lý tuyển dụng'] || row['Mã NTD'] || row['maDaiLyTD'] || ''),
            danhDauTVV: String(row['ĐÁNH DẤU TVVm TUYỂN DỤNG QUÝ 1'] || row['danhDauTVV'] || ''),
            chucVu2: String(row['Chức vụ'] || row['chucVu2'] || ''),
            maNhom: String(row['Mã nhóm'] || row['maNhom'] || ''),
          });
        }
        if (contractRows.length > 0) {
          const resp = await fetch('/api/contracts', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contractRows)
          });
          if (resp.ok) { const result = await resp.json(); successCount = result.count || contractRows.length; }
          else {
            failCount = contractRows.length;
            const errData = await resp.json().catch(() => ({}));
            console.warn('[Import contracts] Batch failed:', errData.error);
          }
        }
        fetchContracts();
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
        fetchStaff();
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
        fetchRecruiters();
      }
      if (failCount > 0) {
        toast({ title: 'Import hoàn tất', description: `Thành công: ${successCount} dòng | Lỗi: ${failCount} dòng`, variant: 'destructive' });
      } else {
        toast({ title: 'Import thành công', description: `${successCount} dòng` });
      }
    } catch (err) {
      console.error('[handleImport] Error:', err);
      toast({ title: 'Lỗi import', description: String(err), variant: 'destructive' });
    }
    // Invalidate cache and reload all data after import
    loadedSheets.current.clear();
    fetchAllData();
    e.target.value = '';
  }, [fetchLeaders, fetchRevenue, fetchContracts, fetchStaff, fetchRecruiters, parseDateValue, fetchAllData]);

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

  // Computed values from Revenue data (file doanh thu năm)
  const totalRevenue = revenue.reduce((s, r) => s + r.totalFYP, 0);
  const totalRevenueAFYP = revenue.reduce((s, r) => s + r.totalAFYP, 0);
  const totalRevenueContractCount = revenue.reduce((s, r) => s + r.contractCount, 0);
  const totalActivityRounds = revenue.reduce((s, r) => s + r.activityRounds, 0);

  // Count unique TVV who achieved >= 3,000,000 in revenue (tổng lượt TVV hoạt được 3 triệu)
  const tvvRevenueMap = new Map<string, number>();
  for (const r of revenue) {
    const current = tvvRevenueMap.get(r.agentCode) || 0;
    tvvRevenueMap.set(r.agentCode, current + r.totalFYP);
  }
  const tvvAchieved3M = Array.from(tvvRevenueMap.values()).filter(v => v >= 3000000).length;

  // Năng suất = tổng số lượng HĐ / tổng số lượt TVV hoạt được 3 triệu
  const nangSuat = tvvAchieved3M > 0 ? totalRevenueContractCount / tvvAchieved3M : 0;

  // Lượt HĐ chuẩn = tổng lượt HĐ từ file doanh thu
  const luotHDChuan = totalActivityRounds;

  // Target values from settings
  const targetTongIP = parseFloat(onlineSettings['nmc-target-tong-ip'] || '0') || 0;
  const targetTongAFYP = parseFloat(onlineSettings['nmc-target-tong-afyp'] || '0') || 0;
  const targetTongSLHD = parseFloat(onlineSettings['nmc-target-tong-sl-hd'] || '0') || 0;
  const targetLuotHDChuan = parseFloat(onlineSettings['nmc-target-luot-hd-chuan'] || '0') || 0;
  const targetNangSuat = parseFloat(onlineSettings['nmc-target-nang-suat'] || '0') || 0;
  const targetTVV3M = parseFloat(onlineSettings['nmc-target-tvv-3tr'] || '0') || 0;

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
        { key: 'tinhLuot3tr', label: 'Tính lượt 3tr', type: 'number' },
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
      if (formatType === 'decimal') return nangSuat.toFixed(1);
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
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-extrabold text-emerald-400 neon-text drop-shadow-[0_0_6px_rgba(0,255,136,0.3)]">Tổng quan</h2>
      </div>
      {/* Annual Revenue Target */}
      <div className="bg-[#0e0e18]/80 backdrop-blur-md border border-amber-500/30 rounded-lg p-3">
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-amber-400" />
          <div className="flex-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Mục doanh số năm</p>
            {editingAnnualTarget ? (
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  value={annualTargetInput}
                  onChange={(e) => setAnnualTargetInput(e.target.value)}
                  placeholder="Nhập mục doanh số năm..."
                  className="h-7 text-sm bg-gray-800 border-amber-500/50 text-white flex-1"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveAnnualTarget(); if (e.key === 'Escape') setEditingAnnualTarget(false); }}
                  autoFocus
                />
                <Button onClick={handleSaveAnnualTarget} className="h-7 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs px-3">Lưu</Button>
                <Button onClick={() => setEditingAnnualTarget(false)} variant="ghost" className="h-7 text-gray-400 text-xs px-2">Hủy</Button>
              </div>
            ) : (
              <div
                className="cursor-pointer mt-1 flex items-center gap-2"
                onDoubleClick={() => { setEditingAnnualTarget(true); setAnnualTargetInput(String(annualRevenueTarget || '')); }}
                title="Nháy đúp để sửa"
              >
                <p className="text-xl font-extrabold text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">
                  {annualRevenueTarget > 0 ? formatCurrency(annualRevenueTarget) : 'Chưa đặt mục tiêu'}
                </p>
                <Edit2 className="w-3 h-3 text-amber-400/50" />
              </div>
            )}
          </div>
          {annualRevenueTarget > 0 && totalRevenue > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-gray-400">Đạt được</p>
              <p className={`text-lg font-extrabold ${(totalRevenue / annualRevenueTarget) >= 1 ? 'text-emerald-300' : (totalRevenue / annualRevenueTarget) >= 0.7 ? 'text-amber-300' : 'text-rose-300'}`}>
                {((totalRevenue / annualRevenueTarget) * 100).toFixed(1)}%
              </p>
            </div>
          )}
        </div>
        {annualRevenueTarget > 0 && (
          <div className="mt-2">
            <Progress value={Math.min((totalRevenue / annualRevenueTarget) * 100, 100)} className="h-2 bg-gray-800 [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-emerald-400" />
            <div className="flex justify-between text-[9px] text-gray-500 mt-1">
              <span>Thực tế: {formatCurrency(totalRevenue)}</span>
              <span>Mục tiêu: {formatCurrency(annualRevenueTarget)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Revenue-based Indicators from doanh thu năm */}
      <div>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3" /> Chỉ tiêu từ doanh thu năm
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <IndicatorCard label="Tổng IP" value={totalRevenue} target={targetTongIP} settingKey="nmc-target-tong-ip" formatType="currency" icon={DollarSign} />
          <IndicatorCard label="Tổng AFYP" value={totalRevenueAFYP} target={targetTongAFYP} settingKey="nmc-target-tong-afyp" formatType="currency" icon={DollarSign} />
          <IndicatorCard label="Tổng SL HĐ" value={totalRevenueContractCount} target={targetTongSLHD} settingKey="nmc-target-tong-sl-hd" formatType="number" icon={FileText} />
          <IndicatorCard label="Lượt HĐ chuẩn" value={luotHDChuan} target={targetLuotHDChuan} settingKey="nmc-target-luot-hd-chuan" formatType="number" icon={Hash} />
          <IndicatorCard label="Năng suất" value={nangSuat} target={targetNangSuat} settingKey="nmc-target-nang-suat" formatType="decimal" icon={TrendingUp} />
          <IndicatorCard label="TVV đạt 3tr" value={tvvAchieved3M} target={targetTVV3M} settingKey="nmc-target-tvv-3tr" formatType="number" icon={Users} />
        </div>
        <p className="text-[9px] text-gray-500 mt-1.5">
          Năng suất = Tổng SL HĐ / Tổng lượt TVV hoạt được 3 triệu ({formatNumber(totalRevenueContractCount)} / {formatNumber(tvvAchieved3M)} = {nangSuat.toFixed(2)}) • Nháy đúp ✏️ để đặt chỉ tiêu
        </p>
      </div>

      {/* Custom KPI for Overview */}
      <KPISettingsPopover
        sectionKey="overview"
        sectionLabel="Tổng quan"
        dataSources={overviewDataSources}
        defaultConfigs={overviewDefaultKPIs}
        onlineSettings={onlineSettings}
        saveSetting={saveSetting}
        annualTarget={annualRevenueTarget}
      />
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
        {/* Custom KPI */}
        <KPISettingsPopover sectionKey="leaders" sectionLabel="DS TB/TN" dataSources={[{ key: 'leaders', label: 'TB/TN', data: filtered, fields: leaderFields }]} onlineSettings={onlineSettings} saveSetting={saveSetting} />
        <div className="flex items-center gap-2 mb-3 mt-2 flex-wrap">
          <SettingsPopover sectionKey="leaders" sectionLabel="DS TB/TN" onlineSettings={onlineSettings} saveSetting={saveSetting} />
          <Button onClick={addLeader} className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 h-8 text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> Thêm</Button>
          <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 rounded-md text-xs font-medium cursor-pointer"><Upload className="w-3.5 h-3.5" /> Import<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleImport('leaders', e)} /></label>
          <Button onClick={() => handleDownloadTemplate('leaders')} variant="outline" className="border-violet-500/30 text-violet-300 hover:bg-violet-500/10 h-8 text-xs"><FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Tải mẫu</Button>
          <Button onClick={() => handleExport('leaders')} variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 h-8 text-xs"><Download className="w-3.5 h-3.5 mr-1" /> Xuất</Button>
        </div>
        <div className="overflow-x-auto border border-emerald-500/30">
          <Table>
            <TableHeader><TableRow className="bg-emerald-500/20 hover:bg-emerald-500/20 border-b border-emerald-500/30">
              {[{ f: 'agentCode', l: 'Mã số' }, { f: 'agentName', l: 'Họ tên' }, { f: 'position', l: 'Chức vụ' }, { f: 'ban', l: 'Ban' }, { f: 'nhom', l: 'Nhóm' }, { f: 'maNhom', l: 'Mã nhóm' }, { f: 'salary', l: 'Tiền/tháng' }, { f: 'phone', l: 'SĐT' }, { f: 'email', l: 'Email' }, { f: 'startDate', l: 'Ngày bắt đầu' }, { f: 'note', l: 'Ghi chú' }].map(col => (
                <TableHead key={col.f} className="text-white text-xs font-bold cursor-pointer hover:text-amber-300 whitespace-nowrap" onClick={() => sortData(col.f)}>{col.l} <SortIcon field={col.f} /></TableHead>
              ))}
              <TableHead className="text-white text-xs w-[40px]"></TableHead>
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
        {/* Custom KPI */}
        <KPISettingsPopover sectionKey="recruiters" sectionLabel="DS Người TD" dataSources={[{ key: 'recruiters', label: 'Người TD', data: filtered, fields: recruiterFields }]} onlineSettings={onlineSettings} saveSetting={saveSetting} />
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <SettingsPopover sectionKey="recruiters" sectionLabel="DS Người TD" onlineSettings={onlineSettings} saveSetting={saveSetting} />
          {canEdit && <><Button onClick={addRecruiter} className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 h-8 text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> Thêm</Button>
            <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 rounded-md text-xs font-medium cursor-pointer"><Upload className="w-3.5 h-3.5" /> Import<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleImport('recruiters', e)} /></label></>}
          <Button onClick={() => handleDownloadTemplate('recruiters')} variant="outline" className="border-violet-500/30 text-violet-300 hover:bg-violet-500/10 h-8 text-xs"><FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Tải mẫu</Button>
          <Button onClick={() => handleExport('recruiters')} variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 h-8 text-xs"><Download className="w-3.5 h-3.5 mr-1" /> Xuất</Button>
        </div>
        <div className="overflow-x-auto border border-emerald-500/30">
          <Table>
            <TableHeader><TableRow className="bg-emerald-500/20 hover:bg-emerald-500/20 border-b border-emerald-500/30">
              {[{ f: 'agentCode', l: 'Mã số' }, { f: 'agentName', l: 'Họ tên' }, { f: 'position', l: 'Chức vụ' }, { f: 'nhom', l: 'Nhóm' }, { f: 'startDate', l: 'Ngày bắt đầu' }].map(col => (
                <TableHead key={col.f} className="text-white text-xs font-bold cursor-pointer hover:text-amber-300 whitespace-nowrap" onClick={() => sortData(col.f)}>{col.l} <SortIcon field={col.f} /></TableHead>
              ))}
              {canEdit && <TableHead className="text-white text-xs w-[40px]"></TableHead>}
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

  // ========== RENDER: Revenue with sub-tabs ==========
  const REVENUE_COLUMNS = [
    { f: 'month', l: 'Tháng', type: 'text' as const },
    { f: 'maNhom', l: 'Mã nhóm', type: 'text' as const },
    { f: 'nhom', l: 'Nhóm', type: 'text' as const },
    { f: 'agentCode', l: 'Mã TVV', type: 'text' as const },
    { f: 'agentName', l: 'Tên TVV', type: 'text' as const },
    { f: 'totalFYP', l: 'Tổng IP', type: 'number' as const },
    { f: 'totalAFYP', l: 'Tổng AFYP', type: 'number' as const },
    { f: 'contractCount', l: 'Số HĐ', type: 'number' as const },
    { f: 'activityRounds', l: 'Lượt HĐ', type: 'number' as const },
    { f: 'note', l: 'Ghi chú', type: 'text' as const },
  ];

  const renderRevenue = () => {
    const currentYear = new Date().getFullYear();
    // Filter revenue by selected month
    const filteredRevenue = revenueSub === 'all'
      ? revenue
      : revenue.filter(r => r.month === `${currentYear}-${revenueSub}` || r.month.endsWith(`-${revenueSub}`));

    const monthLabel = MONTHS.find(m => m.key === revenueSub)?.label || '';

    if (revenueSub === 'all') {
      // ========== CẢ NĂM: Auto-aggregate from all months ==========
      // Aggregate by agentCode
      const agentAgg = new Map<string, { agentCode: string; agentName: string; maNhom: string; nhom: string; totalFYP: number; totalAFYP: number; contractCount: number; activityRounds: number }>();
      for (const r of revenue) {
        const key = r.agentCode || r.agentName;
        if (!key) continue;
        const existing = agentAgg.get(key);
        if (existing) {
          existing.totalFYP += r.totalFYP;
          existing.totalAFYP += r.totalAFYP;
          existing.contractCount += r.contractCount;
          existing.activityRounds += r.activityRounds;
        } else {
          agentAgg.set(key, { agentCode: r.agentCode, agentName: r.agentName, maNhom: r.maNhom, nhom: r.nhom, totalFYP: r.totalFYP, totalAFYP: r.totalAFYP, contractCount: r.contractCount, activityRounds: r.activityRounds });
        }
      }
      const aggregatedAgents = Array.from(agentAgg.values()).sort((a, b) => b.totalFYP - a.totalFYP);

      // Monthly breakdown summary
      const monthlyFYP = new Map<string, number>();
      const monthlyAFYP = new Map<string, number>();
      const monthlyContracts = new Map<string, number>();
      const monthlyRounds = new Map<string, number>();
      for (const r of revenue) {
        const m = r.month;
        monthlyFYP.set(m, (monthlyFYP.get(m) || 0) + r.totalFYP);
        monthlyAFYP.set(m, (monthlyAFYP.get(m) || 0) + r.totalAFYP);
        monthlyContracts.set(m, (monthlyContracts.get(m) || 0) + r.contractCount);
        monthlyRounds.set(m, (monthlyRounds.get(m) || 0) + r.activityRounds);
      }
      const sortedMonths = Array.from(monthlyFYP.keys()).sort();

      const totalAllFYP = aggregatedAgents.reduce((s, a) => s + a.totalFYP, 0);
      const totalAllAFYP = aggregatedAgents.reduce((s, a) => s + a.totalAFYP, 0);
      const totalAllContracts = aggregatedAgents.reduce((s, a) => s + a.contractCount, 0);
      const totalAllRounds = aggregatedAgents.reduce((s, a) => s + a.activityRounds, 0);

      return (
        <div>
          {/* Sub-tabs for months */}
          <div className="flex items-center gap-1 mb-3 flex-wrap">
            <SettingsPopover sectionKey={`revenue-${revenueSub}`} sectionLabel={`Doanh thu - ${monthLabel}`} onlineSettings={onlineSettings} saveSetting={saveSetting} />
            {MONTHS.map(m => (
              <button
                key={m.key}
                onClick={() => setRevenueSub(m.key)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1 ${
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

          {/* Auto-aggregate notice */}
          <div className="bg-emerald-800/60 backdrop-blur-sm border border-emerald-500/30 rounded-lg p-3 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-300 flex-shrink-0" />
            <div>
              <p className="text-emerald-200 text-xs font-bold">Tổng hợp tự động từ 12 tháng</p>
              <p className="text-emerald-300 text-[10px]">Dữ liệu chỉ đọc — được tính tự động từ bảng Doanh thu hàng tháng</p>
            </div>
          </div>

          {/* Summary KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div className="bg-amber-500/20 backdrop-blur-sm rounded-lg p-3 text-center border border-amber-500/30">
              <div className="flex items-center justify-center gap-1 mb-1"><DollarSign className="w-4 h-4 text-amber-300" /><span className="text-[10px] text-amber-300 font-bold uppercase">Tổng IP</span></div>
              <p className="text-sm font-extrabold text-white">{formatCurrency(totalAllFYP)}</p>
            </div>
            <div className="bg-amber-500/20 backdrop-blur-sm rounded-lg p-3 text-center border border-amber-500/30">
              <div className="flex items-center justify-center gap-1 mb-1"><DollarSign className="w-4 h-4 text-amber-300" /><span className="text-[10px] text-amber-300 font-bold uppercase">Tổng AFYP</span></div>
              <p className="text-sm font-extrabold text-white">{formatCurrency(totalAllAFYP)}</p>
            </div>
            <div className="bg-emerald-500/20 backdrop-blur-sm rounded-lg p-3 text-center border border-emerald-500/30">
              <div className="flex items-center justify-center gap-1 mb-1"><FileText className="w-4 h-4 text-emerald-300" /><span className="text-[10px] text-emerald-300 font-bold uppercase">Tổng Số HĐ</span></div>
              <p className="text-sm font-extrabold text-white">{formatNumber(totalAllContracts)}</p>
            </div>
            <div className="bg-emerald-500/20 backdrop-blur-sm rounded-lg p-3 text-center border border-emerald-500/30">
              <div className="flex items-center justify-center gap-1 mb-1"><Hash className="w-4 h-4 text-emerald-300" /><span className="text-[10px] text-emerald-300 font-bold uppercase">Tổng Lượt HĐ</span></div>
              <p className="text-sm font-extrabold text-white">{formatNumber(totalAllRounds)}</p>
            </div>
          </div>

          {/* Monthly breakdown cards */}
          {sortedMonths.length > 0 && (
            <div className="mb-3">
              <h3 className="text-xs font-bold text-emerald-300 mb-2 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Tổng hợp theo tháng</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
                {sortedMonths.map(m => {
                  const fyp = monthlyFYP.get(m) || 0;
                  const afyp = monthlyAFYP.get(m) || 0;
                  const cc = monthlyContracts.get(m) || 0;
                  const ar = monthlyRounds.get(m) || 0;
                  return (
                    <div key={m} className="bg-emerald-800/60 rounded-md p-2 border border-emerald-600/40 text-center">
                      <p className="text-[10px] font-bold text-emerald-300 mb-1">{m}</p>
                      <p className="text-xs font-extrabold text-amber-200">{formatCurrency(fyp)}</p>
                      <p className="text-[9px] text-gray-400">{formatNumber(cc)} HĐ • {formatNumber(ar)} lượt</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Aggregated summary table by TVV */}
          <h3 className="text-sm font-bold text-amber-300 mb-2">Bảng tổng hợp theo TVV — Cả năm ({aggregatedAgents.length} TVV)</h3>
          <div className="overflow-auto max-h-[calc(100vh-280px)] border border-emerald-500/30 rounded-lg" style={{ scrollbarWidth: 'thin', scrollbarColor: '#059669 transparent' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0 }} className="w-full">
              <thead className="sticky top-0 z-10 bg-[#0e0e18] border-b-2 border-emerald-500/50">
                <tr>
                  {[
                    { label: 'Mã TVV', align: 'left' },
                    { label: 'Tên TVV', align: 'left' },
                    { label: 'Mã nhóm', align: 'left' },
                    { label: 'Nhóm', align: 'left' },
                    { label: 'Tổng IP', align: 'right' },
                    { label: 'Tổng AFYP', align: 'right' },
                    { label: 'Tổng Số HĐ', align: 'right' },
                    { label: 'Tổng Lượt HĐ', align: 'right' },
                  ].map((h, i) => (
                    <th
                      key={i}
                      className={`px-3 py-2.5 whitespace-nowrap text-[11px] font-bold text-white ${h.align === 'right' ? 'text-right' : 'text-left'}`}
                      style={{ textShadow: '0 0 8px rgba(0,255,136,0.4)' }}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aggregatedAgents.map((a, idx) => (
                  <tr key={a.agentCode || a.agentName} className={`${idx % 2 === 0 ? 'bg-[#0e0e18]/80' : 'bg-[#12122a]/80'} hover:bg-emerald-500/10 border-b border-emerald-500/10 transition-colors`}>
                    <td className="text-xs py-2 px-3 text-emerald-300/80 whitespace-nowrap font-mono">{a.agentCode || '—'}</td>
                    <td className="text-xs py-2 px-3 text-white whitespace-nowrap font-medium">{a.agentName || '—'}</td>
                    <td className="text-xs py-2 px-3 text-white/70 whitespace-nowrap">{a.maNhom || '—'}</td>
                    <td className="text-xs py-2 px-3 text-white/70 whitespace-nowrap">{a.nhom || '—'}</td>
                    <td className="text-xs py-2 px-3 text-amber-300 text-right font-mono font-semibold">{formatNumber(a.totalFYP)}</td>
                    <td className="text-xs py-2 px-3 text-amber-300/80 text-right font-mono">{formatNumber(a.totalAFYP)}</td>
                    <td className="text-xs py-2 px-3 text-white/70 text-right font-mono">{formatNumber(a.contractCount)}</td>
                    <td className="text-xs py-2 px-3 text-white/70 text-right font-mono">{formatNumber(a.activityRounds)}</td>
                  </tr>
                ))}
                {aggregatedAgents.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-gray-500 text-sm py-6">Chưa có dữ liệu doanh thu hàng tháng</td></tr>
                )}
                {/* Totals row — sticky at bottom */}
                {aggregatedAgents.length > 0 && (
                  <tr className="sticky bottom-0 bg-emerald-500/10 font-bold border-t-2 border-emerald-500/30">
                    <td className="text-xs py-2.5 px-3 text-amber-300 font-bold" colSpan={4} style={{ textShadow: '0 0 6px rgba(251,191,36,0.3)' }}>TỔNG CỘNG</td>
                    <td className="text-xs py-2.5 px-3 text-amber-300 text-right font-mono font-bold">{formatNumber(totalAllFYP)}</td>
                    <td className="text-xs py-2.5 px-3 text-amber-300 text-right font-mono font-bold">{formatNumber(totalAllAFYP)}</td>
                    <td className="text-xs py-2.5 px-3 text-white/70 text-right font-mono font-bold">{formatNumber(totalAllContracts)}</td>
                    <td className="text-xs py-2.5 px-3 text-white/70 text-right font-mono font-bold">{formatNumber(totalAllRounds)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // ========== MONTHLY TAB: Show editable MonthlyRevenue table ==========
    const sortedRevenue = getSorted(getFiltered(filteredRevenue, ['agentCode', 'agentName', 'nhom', 'maNhom', 'month']));

    return (
      <div>
        {/* Sub-tabs for months */}
        <div className="flex items-center gap-1 mb-3 flex-wrap">
          <SettingsPopover sectionKey={`revenue-${revenueSub}`} sectionLabel={`Doanh thu - ${monthLabel}`} onlineSettings={onlineSettings} saveSetting={saveSetting} />
          {MONTHS.map(m => (
            <button
              key={m.key}
              onClick={() => setRevenueSub(m.key)}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1 ${
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

        {/* Custom KPI for Revenue */}
        <KPISettingsPopover
          sectionKey={`revenue-${revenueSub}`}
          sectionLabel={`Doanh thu - ${monthLabel}`}
          onlineSettings={onlineSettings}
          saveSetting={saveSetting}
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
          ]}
          defaultConfigs={[
            { id: 'kpi-default-fyp', label: 'Tổng IP (FYP)', dataSourceKey: 'revenue', field: 'totalFYP', calculation: 'sum', color: 'amber' },
            { id: 'kpi-default-afyp', label: 'Tổng AFYP', dataSourceKey: 'revenue', field: 'totalAFYP', calculation: 'sum', color: 'amber' },
            { id: 'kpi-default-count', label: 'Số HĐ', dataSourceKey: 'revenue', field: 'contractCount', calculation: 'sum', color: 'emerald' },
            { id: 'kpi-default-rounds', label: 'Lượt HĐ', dataSourceKey: 'revenue', field: 'activityRounds', calculation: 'sum', color: 'emerald' },
          ]}
        />

        {/* MonthlyRevenue table */}
        <h3 className="text-sm font-bold text-amber-300 mb-2">Bảng doanh thu — {monthLabel} ({sortedRevenue.length} dòng)</h3>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Button onClick={addRevenue} className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 h-7 text-xs"><Plus className="w-3 h-3 mr-1" /> Thêm dòng</Button>
          <label className="inline-flex items-center gap-1 px-2 py-1 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 rounded text-[11px] font-medium cursor-pointer"><Upload className="w-3 h-3" /> Import DS<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleImport('revenue', e)} /></label>
          <Button onClick={() => handleDownloadTemplate('revenue')} variant="outline" className="border-violet-500/30 text-violet-300 hover:bg-violet-500/10 h-7 text-xs"><FileSpreadsheet className="w-3 h-3 mr-1" /> Tải mẫu</Button>
          <Button onClick={() => handleExport('revenue')} variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 h-7 text-xs"><Download className="w-3 h-3 mr-1" /> Xuất DS</Button>
        </div>
        <div className="overflow-auto max-h-[calc(100vh-280px)] border border-emerald-500/30 rounded-lg" style={{ scrollbarWidth: 'thin', scrollbarColor: '#059669 transparent' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0 }} className="w-full">
            <thead className="sticky top-0 z-10 bg-[#0e0e18] border-b-2 border-emerald-500/50">
              <tr>
                {REVENUE_COLUMNS.map(col => (
                  <th
                    key={col.f}
                    className="px-3 py-2.5 whitespace-nowrap text-[11px] font-bold text-white cursor-pointer hover:text-amber-300 transition-colors"
                    style={{ textShadow: '0 0 8px rgba(0,255,136,0.4)' }}
                    onClick={() => sortData(col.f)}
                  >
                    {col.l} <SortIcon field={col.f} />
                  </th>
                ))}
                <th className="px-1 py-2.5 w-[36px]"></th>
              </tr>
            </thead>
            <tbody>
              {sortedRevenue.slice(0, 200).map((r, idx) => (
                <tr key={r.id} className={`${idx % 2 === 0 ? 'bg-[#0e0e18]/80' : 'bg-[#12122a]/80'} hover:bg-emerald-500/10 border-b border-emerald-500/10 transition-colors`}>
                  {REVENUE_COLUMNS.map(col => (
                    <td key={col.f} className="text-xs py-1 px-0">
                      <EditableCell
                        value={col.type === 'number' ? (r as any)[col.f] : (r as any)[col.f] || ''}
                        onSave={(v) => updateRevenue(r.id, col.f, v)}
                        type={col.type}
                        className={col.type === 'number' ? 'text-right' : ''}
                      />
                    </td>
                  ))}
                  <td className="text-xs py-1 px-1">
                    <Button variant="ghost" size="sm" onClick={() => deleteRevenue(r.id)} className="h-5 w-5 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              ))}
              {sortedRevenue.length === 0 && (
                <tr><td colSpan={REVENUE_COLUMNS.length + 1} className="text-center text-gray-500 text-sm py-6">Chưa có dữ liệu doanh thu tháng này</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ========== RENDER: Structure (4-tier cascading) ==========
  const renderStructure = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-extrabold text-emerald-400 neon-text drop-shadow-[0_0_6px_rgba(0,255,136,0.3)]">Cấu trúc tổ chức</h2>
        <SettingsPopover sectionKey="structure" sectionLabel="Cấu trúc" onlineSettings={onlineSettings} saveSetting={saveSetting} />
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-emerald-200/70 bg-emerald-800/60 backdrop-blur-sm rounded-lg p-2 border border-emerald-500/30">
        <Building2 className="w-4 h-4 text-emerald-400" />
        {selectedPhong ? (
          <>
            <button onClick={() => { setSelectedPhong(''); setSelectedAD(''); setSelectedBanNhom(''); }} className="text-emerald-400 hover:underline cursor-pointer">
              {phongList.find(p => p.id === selectedPhong)?.tenPhong || '...'}
            </button>
            {selectedAD && (
              <>
                <ChevronRight className="w-3 h-3" />
                <button onClick={() => { setSelectedAD(''); setSelectedBanNhom(''); }} className="text-amber-400 hover:underline cursor-pointer">
                  {adList.find(a => a.id === selectedAD)?.tenAD || '...'}
                </button>
                {selectedBanNhom && (
                  <>
                    <ChevronRight className="w-3 h-3" />
                    <button onClick={() => setSelectedBanNhom('')} className="text-sky-400 hover:underline cursor-pointer">
                      {banNhomList.find(b => b.id === selectedBanNhom)?.tenBanNhom || '...'}
                    </button>
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <span className="text-white/40 italic">Chọn Phòng để xem cấu trúc</span>
        )}
      </div>

      {/* 4-tier cascading panels */}
      <div className="grid grid-cols-4 gap-2" style={{ minHeight: '400px' }}>
        {/* Tier 1: Phòng */}
        <div className="bg-emerald-800/60 backdrop-blur-sm rounded-lg border border-emerald-500/30 flex flex-col">
          <div className="flex items-center justify-between p-2 border-b border-emerald-500/20">
            <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-1"><Building2 className="w-4 h-4" /> Phòng</h3>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setImportTier('phong')} className="h-6 w-6 p-0 text-emerald-400 hover:text-emerald-300"><Upload className="w-3 h-3" /></Button>
              <Button variant="ghost" size="sm" onClick={() => setAddPhongOpen(true)} className="h-6 w-6 p-0 text-emerald-400 hover:text-emerald-300"><Plus className="w-3 h-3" /></Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-1 space-y-1 max-h-96">
            {phongList.map(p => {
              const childCount = adList.filter(a => a.maPhong === p.maPhong).length;
              const isSelected = selectedPhong === p.id;
              return (
                <div key={p.id} className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-all ${isSelected ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-emerald-700/50 hover:bg-emerald-500/10 border border-transparent'}`} onClick={() => { setSelectedPhong(isSelected ? '' : p.id); setSelectedAD(''); setSelectedBanNhom(''); }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs font-bold truncate">{p.tenPhong}</p>
                    <p className="text-emerald-200/60 text-[10px]">{p.maPhong}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-emerald-300 bg-emerald-900 px-1.5 py-0.5 rounded-full">{childCount}</span>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingPhong(p); }} className="h-5 w-5 p-0 text-white/40 hover:text-amber-400"><Edit2 className="w-2.5 h-2.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeletePhong(p.id); }} className="h-5 w-5 p-0 text-white/40 hover:text-red-400"><Trash2 className="w-2.5 h-2.5" /></Button>
                  </div>
                </div>
              );
            })}
            {phongList.length === 0 && <p className="text-white/30 text-xs text-center py-4">Chưa có phòng</p>}
          </div>
        </div>

        {/* Tier 2: AD */}
        <div className="bg-emerald-800/60 backdrop-blur-sm rounded-lg border border-emerald-500/30 flex flex-col">
          <div className="flex items-center justify-between p-2 border-b border-emerald-500/20">
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-1"><UserCog className="w-4 h-4" /> AD</h3>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setImportTier('ad')} className="h-6 w-6 p-0 text-amber-400 hover:text-amber-300"><Upload className="w-3 h-3" /></Button>
              <Button variant="ghost" size="sm" onClick={() => { setNewAD(prev => ({ ...prev, maPhong: selectedPhong ? phongList.find(p => p.id === selectedPhong)?.maPhong || '' : '' })); setAddADOpen(true); }} className="h-6 w-6 p-0 text-amber-400 hover:text-amber-300"><Plus className="w-3 h-3" /></Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-1 space-y-1 max-h-96">
            {adList.filter(a => {
              if (!selectedPhong) return true;
              const phong = phongList.find(p => p.id === selectedPhong);
              return phong && a.maPhong === phong.maPhong;
            }).map(a => {
              const childCount = banNhomList.filter(b => b.maAD === a.maAD).length;
              const isSelected = selectedAD === a.id;
              return (
                <div key={a.id} className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-all ${isSelected ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-amber-700/30 hover:bg-amber-500/10 border border-transparent'}`} onClick={() => { setSelectedAD(isSelected ? '' : a.id); setSelectedBanNhom(''); }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs font-bold truncate">{a.tenAD}</p>
                    <p className="text-amber-200/60 text-[10px]">{a.maAD}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-amber-300 bg-amber-900 px-1.5 py-0.5 rounded-full">{childCount}</span>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingAD(a); }} className="h-5 w-5 p-0 text-white/40 hover:text-amber-400"><Edit2 className="w-2.5 h-2.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteAD(a.id); }} className="h-5 w-5 p-0 text-white/40 hover:text-red-400"><Trash2 className="w-2.5 h-2.5" /></Button>
                  </div>
                </div>
              );
            })}
            {adList.filter(a => {
              if (!selectedPhong) return true;
              const phong = phongList.find(p => p.id === selectedPhong);
              return phong && a.maPhong === phong.maPhong;
            }).length === 0 && <p className="text-white/30 text-xs text-center py-4">Chưa có AD</p>}
          </div>
        </div>

        {/* Tier 3: Ban/Nhóm */}
        <div className="bg-emerald-800/60 backdrop-blur-sm rounded-lg border border-emerald-500/30 flex flex-col">
          <div className="flex items-center justify-between p-2 border-b border-emerald-500/20">
            <h3 className="text-sm font-bold text-sky-300 flex items-center gap-1"><Network className="w-4 h-4" /> Ban/Nhóm</h3>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setImportTier('bannhom')} className="h-6 w-6 p-0 text-sky-400 hover:text-sky-300"><Upload className="w-3 h-3" /></Button>
              <Button variant="ghost" size="sm" onClick={() => { setNewBanNhom(prev => ({ ...prev, maAD: selectedAD ? adList.find(a => a.id === selectedAD)?.maAD || '' : '' })); setAddBanNhomOpen(true); }} className="h-6 w-6 p-0 text-sky-400 hover:text-sky-300"><Plus className="w-3 h-3" /></Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-1 space-y-1 max-h-96">
            {banNhomList.filter(b => {
              if (!selectedAD) return true;
              const ad = adList.find(a => a.id === selectedAD);
              return ad && b.maAD === ad.maAD;
            }).map(b => {
              const childCount = tvvStructList.filter(t => t.maBanNhom === b.maBanNhom).length;
              const isSelected = selectedBanNhom === b.id;
              return (
                <div key={b.id} className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-all ${isSelected ? 'bg-sky-500/20 border border-sky-500/30' : 'bg-sky-700/30 hover:bg-sky-500/10 border border-transparent'}`} onClick={() => setSelectedBanNhom(isSelected ? '' : b.id)}>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs font-bold truncate">{b.tenBanNhom}</p>
                    <p className="text-sky-200/60 text-[10px]">{b.maBanNhom}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-sky-300 bg-sky-900 px-1.5 py-0.5 rounded-full">{childCount}</span>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingBanNhom(b); }} className="h-5 w-5 p-0 text-white/40 hover:text-amber-400"><Edit2 className="w-2.5 h-2.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteBanNhom(b.id); }} className="h-5 w-5 p-0 text-white/40 hover:text-red-400"><Trash2 className="w-2.5 h-2.5" /></Button>
                  </div>
                </div>
              );
            })}
            {banNhomList.filter(b => {
              if (!selectedAD) return true;
              const ad = adList.find(a => a.id === selectedAD);
              return ad && b.maAD === ad.maAD;
            }).length === 0 && <p className="text-white/30 text-xs text-center py-4">Chưa có Ban/Nhóm</p>}
          </div>
        </div>

        {/* Tier 4: TVV */}
        <div className="bg-emerald-800/60 backdrop-blur-sm rounded-lg border border-emerald-500/30 flex flex-col">
          <div className="flex items-center justify-between p-2 border-b border-emerald-500/20">
            <h3 className="text-sm font-bold text-violet-300 flex items-center gap-1"><Users className="w-4 h-4" /> TVV</h3>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setImportTier('tvv')} className="h-6 w-6 p-0 text-violet-400 hover:text-violet-300"><Upload className="w-3 h-3" /></Button>
              <Button variant="ghost" size="sm" onClick={() => { setNewTvv(prev => ({ ...prev, maBanNhom: selectedBanNhom ? banNhomList.find(b => b.id === selectedBanNhom)?.maBanNhom || '' : '' })); setAddTvvOpen(true); }} className="h-6 w-6 p-0 text-violet-400 hover:text-violet-300"><Plus className="w-3 h-3" /></Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-1 space-y-1 max-h-96">
            {tvvStructList.filter(t => {
              if (!selectedBanNhom) return true;
              const bn = banNhomList.find(b => b.id === selectedBanNhom);
              return bn && t.maBanNhom === bn.maBanNhom;
            }).map(t => (
              <div key={t.id} className="flex items-center justify-between p-2 rounded-md bg-violet-500/10 hover:bg-violet-500/20 border border-transparent">
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-bold truncate">{t.agentName}</p>
                  <p className="text-violet-200/60 text-[10px]">{t.agentCode} {t.chucVu ? `• ${t.chucVu}` : ''}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingTvv(t); }} className="h-5 w-5 p-0 text-white/40 hover:text-amber-400"><Edit2 className="w-2.5 h-2.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteTvv(t.id); }} className="h-5 w-5 p-0 text-white/40 hover:text-red-400"><Trash2 className="w-2.5 h-2.5" /></Button>
                </div>
              </div>
            ))}
            {tvvStructList.filter(t => {
              if (!selectedBanNhom) return true;
              const bn = banNhomList.find(b => b.id === selectedBanNhom);
              return bn && t.maBanNhom === bn.maBanNhom;
            }).length === 0 && <p className="text-white/30 text-xs text-center py-4">Chưa có TVV</p>}
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
              <div><Label className="text-xs text-emerald-200/70">Ngày bắt đầu</Label><Input type="date" value={editingTvv.ngayBatDau ? editingTvv.ngayBatDau.slice(0, 10) : ''} onChange={e => setEditingTvv(t => t ? { ...t, ngayBatDau: e.target.value } : t)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
              <div><Label className="text-xs text-emerald-200/70">Ghi chú</Label><Input value={editingTvv.note} onChange={e => setEditingTvv(t => t ? { ...t, note: e.target.value } : t)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
            </div>
          )}
          <DialogFooter><Button onClick={handleEditTvv} className="bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300">Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={!!importTier} onOpenChange={(open) => { if (!open) setImportTier(''); }}>
        <DialogContent className="bg-[#0e0e18]/95 backdrop-blur-xl border-emerald-500/30">
          <DialogHeader><DialogTitle className="text-emerald-400">Import {importTier === 'phong' ? 'Phòng' : importTier === 'ad' ? 'AD' : importTier === 'bannhom' ? 'Ban/Nhóm' : 'TVV'}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <p className="text-white/50 text-xs">Dán dữ liệu từ Excel (Tab-separated). Dòng đầu tiên là header.</p>
            <textarea value={importData} onChange={e => setImportData(e.target.value)} className="w-full h-40 bg-white/5 border border-emerald-500/20 rounded-md p-2 text-white text-xs font-mono" placeholder="maPhong&#9;tenPhong&#9;note&#10;P001&#9;Phòng KD&#9;Ghi chú" />
          </div>
          <DialogFooter><Button onClick={handleImportStructure} className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300">Import</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // ========== RENDER: Settings ==========
  const renderSettings = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold text-emerald-400 neon-text drop-shadow-[0_0_6px_rgba(0,255,136,0.3)]">Cài đặt hệ thống</h2>

      {/* Sync toggle */}
      <div className={`rounded-lg p-3 border-2 ${syncEnabled ? 'bg-emerald-700/50 border-emerald-500/30' : 'bg-amber-700/50 border-amber-500/30'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {syncEnabled ? <CheckCircle2 className="w-5 h-5 text-emerald-300" /> : <AlertTriangle className="w-5 h-5 text-amber-300" />}
            <div>
              <h3 className={`text-sm font-bold ${syncEnabled ? 'text-emerald-300' : 'text-amber-300'}`}>{syncEnabled ? 'Đồng bộ tự động: BẬT' : 'Đồng bộ tự động: TẮT'}</h3>
              <p className="text-gray-300 text-xs">{syncEnabled ? 'HĐ & Nhân sự tự động từ Google Sheets (chỉ xem)' : 'Chế độ thủ công: chỉnh sửa, thêm, xóa, import'}</p>
            </div>
          </div>
          <button onClick={handleSyncToggle}>
            {syncEnabled ? <ToggleRight className="w-8 h-8 text-emerald-400 cursor-pointer" /> : <ToggleLeft className="w-8 h-8 text-amber-400 cursor-pointer" />}
          </button>
        </div>
      </div>

      {/* Per-section settings */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-emerald-300">Cài đặt theo mục</h3>
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
                    // Don't save on every keystroke, just update local state
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
      case 'spreadsheet': return <SpreadsheetSheet onlineSettings={onlineSettings} saveSetting={saveSetting} />;
      case 'settings': return renderSettings();
    }
  };

  return (
    <div className="h-screen flex flex-col fixed inset-0 z-50">
      {/* Header */}
      <header className="border-b border-emerald-500/30 bg-[#0e0e18]/80 backdrop-blur-md px-4 py-2 flex items-center gap-3 flex-shrink-0">
        <Button variant="ghost" onClick={() => router.push('/')} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-8 w-8 p-0"><ArrowLeft className="w-4 h-4" /></Button>
        <h1 className="text-lg font-extrabold text-emerald-400 drop-shadow-[0_0_10px_rgba(0,255,136,0.5)] drop-shadow-[0_0_30px_rgba(0,255,136,0.2)]">Quản Lý Dữ Liệu</h1>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setActiveSheet('settings')} className="flex items-center gap-1.5 text-xs font-bold transition-colors">
            <span className="flex items-center gap-1 text-emerald-300/70 hover:text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded-md"><Settings className="w-4 h-4" /> Cài đặt</span>
          </button>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-emerald-400" />
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tìm kiếm..." className="h-7 w-[160px] pl-7 text-xs bg-white/5 border-emerald-500/30 text-white placeholder-emerald-400/50" />
            {searchTerm && <X className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400 cursor-pointer" onClick={() => setSearchTerm('')} />}
          </div>
          <Button variant="ghost" onClick={() => loadSheet(activeSheet, true)} className="text-emerald-400/70 hover:text-emerald-300 hover:bg-emerald-500/10 h-8 w-8 p-0" title="Tải lại dữ liệu"><RefreshCw className="w-3.5 h-3.5" /></Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <nav className="w-[200px] bg-[#0e0e18]/90 backdrop-blur-md border-r border-emerald-500/30 flex-shrink-0 overflow-y-auto">
          <div className="p-2 space-y-0.5">
            {SHEETS.map((sheet, index) => {
              const isActive = activeSheet === sheet.key;
              const isExpanded = sheet.hasSub && revenueExpanded && activeSheet === 'revenue';
              return (
                <div key={sheet.key}>
                  <button
                    onClick={() => { setActiveSheet(sheet.key); setSearchTerm(''); setSortField(''); if (sheet.hasSub) setRevenueExpanded(!revenueExpanded); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors ${
                      isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 neon-glow' : 'text-emerald-300/60 hover:bg-emerald-500/10 hover:text-emerald-300'
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
        <main className="flex-1 overflow-y-auto p-4">
          {renderSheet()}
        </main>
      </div>
    </div>
  );
}
