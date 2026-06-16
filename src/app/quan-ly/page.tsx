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
  Menu, ChevronLeft, UserPlus, BookOpen,
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
type SheetKey = 'overview' | 'leaders' | 'recruiters' | 'revenue' | 'report' | 'structure' | 'kehoach';
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
  { key: 'kehoach', label: 'Kế hoạch', icon: Target, synced: false },
  { key: 'report', label: 'Chính sách đại lý', icon: BookOpen, synced: false },
  { key: 'structure', label: 'Cấu trúc', icon: Network, synced: false },
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
// Helper: lấy tháng doanh số từ issueDate (Ngày PH), fallback effectiveDate (Ngày HL)
function getDoanhSoMonth(c: { issueDate: string | null; effectiveDate: string }): Date {
  const issueD = c.issueDate ? new Date(c.issueDate) : null;
  if (issueD && !isNaN(issueD.getTime())) return issueD;
  return new Date(c.effectiveDate);
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}
function formatNumber(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n);
}

// Smart currency formatting: mobile shows trđ/tỷ, desktop shows full đ
function formatSmartCurrency(amount: number): string {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  if (isMobile) {
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')} tỷ`;
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2).replace(/\.?0+$/, '')} trđ`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(1).replace(/\.?0+$/, '')} ngàn`;
    return `${amount} đ`;
  }
  return formatCurrency(amount);
}

// Compact currency for KPI cards - always shows trđ/tỷ/ngàn on ALL screen sizes
// trđ always shows 3 decimal places with Vietnamese comma separator (e.g. 1,350 trđ)
function formatKpiCurrency(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(3).replace('.', ',')} tỷ`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(3).replace('.', ',')} trđ`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(3).replace('.', ',')} ngàn`;
  if (amount === 0) return '0,000 trđ';
  return `${amount} đ`;
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
        className="w-full h-full px-1 py-0.5 text-xs bg-white text-gray-800 border-2 border-emerald-400 outline-none"
      />
    );
  }

  return (
    <div
      className={`cursor-pointer hover:bg-emerald-50 hover:outline hover:outline-1 hover:outline-emerald-400 px-1 py-0.5 min-h-[22px] text-gray-800 ${className}`}
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
  const [overviewPeriod, setOverviewPeriod] = useState<string>('year');

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
  const [syncSuccessCount, setSyncSuccessCount] = useState<number>(0);
  const [syncSuccessVisible, setSyncSuccessVisible] = useState<boolean>(false);
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
          // Show sync success indicator instead of toast
          const totalSynced = result.count || syncedCount;
          setSyncSuccessCount(totalSynced);
          setSyncSuccessVisible(true);
          setTimeout(() => setSyncSuccessVisible(false), 4000);
          if (syncErrors.length > 0) {
            toast({ title: 'Lỗi đồng bộ một phần', description: syncErrors.join('; '), variant: 'destructive' });
          }
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
    const allKeys = ['leaders', 'recruiters', 'revenue', 'structure',
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
    const allKeys = ['leaders', 'recruiters', 'revenue', 'structure',
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
        if (data.tvvStruct) setTvvStructList(data.tvvStruct);
      }
    } catch {}
  }, []);

  // Keep ref in sync so auto-sync can call it
  fetchAllDataRef.current = fetchAllData;

  const loadSheet = useCallback((sheet: SheetKey, _force = false) => {
    setIsLoading(true);
    const loaders: Record<SheetKey, () => Promise<void>> = {
      overview: async () => { await Promise.all([fetchAllData(), fetchTvvStruct(), fetchPhong(), fetchAD(), fetchBanNhom()]); }, // Fetch all data + structure for Kế hoạch targets
      leaders: fetchLeaders,
      recruiters: fetchRecruiters,
      revenue: async () => { await Promise.all([fetchRevenue(), fetchContracts()]); },
      kehoach: async () => { await Promise.all([fetchAllData(), fetchPhong(), fetchAD(), fetchBanNhom()]); },
      report: async () => { await Promise.all([fetchAllData(), fetchPhong(), fetchAD(), fetchBanNhom()]); },
      structure: async () => { await Promise.all([fetchLeaders(), fetchStaff(), fetchPhong(), fetchAD(), fetchBanNhom(), fetchTvvStruct()]); },
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

  // Upsert TVV from uploaded file — bấm nút → chọn file → upsert thông minh
  const [isReplacingTvv, setIsReplacingTvv] = useState(false);

  const handleUpsertTvvFile = useCallback(async (file: File) => {
    setIsReplacingTvv(true);
    try {
      // Đọc file Excel/CSV
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
      const dateColumns = ['Ngày bắt đầu', 'Ngày bắt đầu làm việc', 'ngayBatDau'];
      const records = jsonData.map(row => {
        const obj: Record<string, string> = {};
        Object.entries(row).forEach(([k, v]) => {
          if (dateColumns.some(dc => k.includes(dc))) {
            obj[k] = normalizeDateValue(v);
          } else {
            obj[k] = String(v ?? '');
          }
        });
        return obj;
      });

      if (records.length === 0) {
        toast({ title: 'Lỗi', description: 'File trống hoặc không có dữ liệu hợp lệ', variant: 'destructive' });
        return;
      }

      // Gửi lên API với upsert=true
      const res = await fetch('/api/structure/tvv?upsert=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(records),
      });

      if (res.ok) {
        const result = await res.json();
        fetchTvvStruct();
        const detail = [];
        if (result.created > 0) detail.push(`thêm mới ${result.created}`);
        if (result.updated > 0) detail.push(`cập nhật ${result.updated}`);
        if (result.skipped > 0) detail.push(`giữ nguyên ${result.skipped}`);
        if (result.deleted > 0) detail.push(`xoá ${result.deleted}`);
        toast({ title: 'Cập nhật DS TVV thành công', description: detail.join(', ') || result.message });
      } else {
        const err = await res.json();
        toast({ title: 'Lỗi', description: err.error || 'Không thể cập nhật', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể đọc file hoặc cập nhật DS TVV', variant: 'destructive' });
    }
    finally { setIsReplacingTvv(false); }
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

  // Helper: chuyển Excel serial number thành chuỗi ngày YYYY-MM-DD
  const excelSerialToDate = (serial: number): string => {
    // Excel epoch = 1/1/1900, nhưng Excel có bug treating 1900 as leap year → cần trừ 1 nếu serial >= 60
    const epoch = new Date(1899, 11, 30); // 30/12/1899
    const date = new Date(epoch.getTime() + serial * 86400000);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Helper: chuẩn hoá giá trị ngày từ Excel — xử lý serial number, Date object, string
  const normalizeDateValue = (v: any): string => {
    if (v === null || v === undefined || v === '') return '';
    // Excel serial number (number từ 1 đến ~100000)
    if (typeof v === 'number' && v > 0 && v < 200000 && Number.isInteger(v) && v > 1000) {
      return excelSerialToDate(v);
    }
    // Date object
    if (v instanceof Date) {
      const y = v.getFullYear();
      const m = String(v.getMonth() + 1).padStart(2, '0');
      const d = String(v.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return String(v);
  };

  const handleImportFile = useCallback(async (file: File) => {
    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
      // Convert values, đặc biệt xử lý cột ngày
      const dateColumns = ['Ngày bắt đầu', 'Ngày bắt đầu làm việc', 'ngayBatDau'];
      const records = jsonData.map(row => {
        const obj: Record<string, string> = {};
        Object.entries(row).forEach(([k, v]) => {
          if (dateColumns.some(dc => k.includes(dc))) {
            obj[k] = normalizeDateValue(v);
          } else {
            obj[k] = String(v ?? '');
          }
        });
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

  // ========== Download Template (client-side) ==========
  const handleDownloadTemplate = useCallback(async (sheetName: string) => {
    try {
      const template = TEMPLATES[sheetName];
      if (!template) { toast({ title: 'Lỗi', description: 'Không có mẫu', variant: 'destructive' }); return; }
      // Client-side XLSX generation — avoids server binary response issues
      const XLSX = await import('xlsx');
      const data = [template.sampleData.length > 0 ? template.sampleData[0] : Object.fromEntries(template.headers.map(h => [h, '']))];
      const ws = XLSX.utils.json_to_sheet(data, { header: template.headers });
      ws['!cols'] = template.headers.map(h => ({ wch: Math.max(h.length * 2, 12) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `Mau_${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast({ title: 'Đang tải mẫu...', description: `Mẫu ${sheetName}` });
    } catch (err) {
      console.error('[handleDownloadTemplate] Error:', err);
      toast({ title: 'Lỗi tải mẫu', description: String(err), variant: 'destructive' });
    }
  }, []);

  // ========== Export (client-side) ==========
  const handleExport = useCallback(async (sheetName: string) => {
    try {
      let data: any[] = [];
      if (sheetName === 'leaders') data = leaders.map(l => ({ 'Mã số': l.agentCode, 'Họ tên': l.agentName, 'Chức vụ': l.position, 'Ban': l.ban, 'Nhóm': l.nhom, 'Mã nhóm': l.maNhom, 'Tiền/tháng': l.salary, 'SĐT': l.phone, 'Email': l.email, 'Ngày bắt đầu': l.startDate ? new Date(l.startDate).toLocaleDateString('vi-VN') : '', 'Ghi chú': l.note }));
      else if (sheetName === 'revenue') data = revenue.map(r => ({ 'Tháng': r.month, 'Mã nhóm': r.maNhom, 'Nhóm': r.nhom, 'Mã TVV': r.agentCode, 'Tên TVV': r.agentName, 'Tổng IP': r.totalFYP, 'Tổng AFYP': r.totalAFYP, 'Số HĐ': r.contractCount, 'Lượt HĐ': r.activityRounds, 'Ghi chú': r.note }));
      else if (sheetName === 'contracts') data = contracts.map((c, idx) => ({ 'STT': idx + 1, 'Ban': c.ban, 'Nhóm': c.nhom, 'Mã Ban/Nhóm': c.maNhom || c.maBanNhom, 'Mã ĐL': c.agentCode || c.maDL, 'Tên': c.agentName, 'Chức vụ': c.position, 'Ngày bắt đầu làm việc': c.ngayBatDauLamViec ? new Date(c.ngayBatDauLamViec).toLocaleDateString('vi-VN') : '', 'Số hợp đồng': c.contractNumber, 'Ngày hiệu lực': new Date(c.effectiveDate).toLocaleDateString('vi-VN'), 'Ngày phát hành': new Date(c.issueDate).toLocaleDateString('vi-VN'), 'PĐT + 10% ĐT': c.pdt10DT, 'AFYP': c.afyp, 'AD': c.ad, 'TÍNH LƯỢT 3 tr': c.tinhLuot3tr, 'MÃ ĐL TD': c.maDaiLyTD }));
      else if (sheetName === 'staff') data = staff.map(s => ({ 'Mã số': s.agentCode, 'Họ tên': s.agentName, 'Chức vụ': s.position, 'Nhóm': s.nhom, 'Mã nhóm': s.maNhom, 'Ngày bắt đầu': s.startDate ? new Date(s.startDate).toLocaleDateString('vi-VN') : '' }));
      else if (sheetName === 'recruiters') data = recruiters.map(r => ({ 'Mã số': r.agentCode, 'Họ tên': r.agentName, 'Chức vụ': r.position, 'Nhóm': r.nhom, 'Ngày bắt đầu': r.startDate ? new Date(r.startDate).toLocaleDateString('vi-VN') : '' }));

      if (data.length === 0) { toast({ title: 'Không có dữ liệu', variant: 'destructive' }); return; }

      // Client-side XLSX generation — avoids server body size limits and binary response issues
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(data);
      const headers = Object.keys(data[0]);
      ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length * 2, 12) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
  const totalStaff = leaders.length; // SL TB/TN = đếm tại file DS TB/TN (LeaderInfo table)
  const totalContracts = contracts.length;
  const totalFYP = contracts.reduce((s, c) => s + c.fyp, 0);
  const totalSalary = leaders.reduce((s, l) => s + l.salary, 0);
  const totalRecruiters = recruiters.length;

  // Computed values from Contract data (file doanh thu năm)
  // Use current year contracts for all calculations
  const currentYear = new Date().getFullYear();
  const yearContracts = contracts.filter(c => {
    const d = getDoanhSoMonth(c);
    return !isNaN(d.getTime()) && d.getFullYear() === currentYear;
  });

  // Period-to-months mapping for overview time period filter
  const getPeriodMonths = (period: string): number[] => {
    if (period.startsWith('month-')) return [parseInt(period.split('-')[1])];
    if (period === 'q1') return [1,2,3];
    if (period === 'q2') return [4,5,6];
    if (period === 'q3') return [7,8,9];
    if (period === 'q4') return [10,11,12];
    if (period === 'h1') return [1,2,3,4,5,6];
    if (period === 'year') return [1,2,3,4,5,6,7,8,9,10,11,12];
    return [1,2,3,4,5,6,7,8,9,10,11,12];
  };

  // Filter contracts by selected overview period
  const periodMonths = getPeriodMonths(overviewPeriod);
  const periodContracts = yearContracts.filter(c => {
    const d = getDoanhSoMonth(c);
    return periodMonths.includes(d.getMonth() + 1);
  });

  const totalRevenue = periodContracts.reduce((s, c) => s + c.pdt10DT, 0); // IP + 10% PĐT
  const totalRevenueAFYP = periodContracts.reduce((s, c) => s + c.afyp, 0);
  const totalRevenueContractCount = periodContracts.length; // Số lượng HĐ = số dòng

  // Lượt HĐ = đếm số dòng hợp đồng có tinhLuot3tr >= 3,000,000
  const luotHoatDong = periodContracts.filter(c => c.tinhLuot3tr >= 3000000).length;
  // Lượt HĐ chuẩn = đếm số dòng hợp đồng có tinhLuot3tr >= 12,000,000
  const luotHDChuan = periodContracts.filter(c => c.tinhLuot3tr >= 12000000).length;

  // TVV đạt 3tr
  const tvvAchieved3M = luotHoatDong;
  const tvvAchieved12M = luotHDChuan;

  // IP/AFYP (%) = (IP + 10% PĐT) / AFYP * 100
  const ipAfypRatio = totalRevenueAFYP > 0 ? (totalRevenue / totalRevenueAFYP) * 100 : 0;

  // Độ lớn hợp đồng (ĐLHĐ) = Tổng AFYP / Lượt HĐ (số TVV có tinhLuot3tr >= 3tr)
  const doLonHD = luotHoatDong > 0 ? totalRevenueAFYP / luotHoatDong : 0;

  // Năng suất = SL hợp đồng / Lượt HĐ (số TVV có tinhLuot3tr >= 3tr)
  const nangSuat = luotHoatDong > 0 ? totalRevenueContractCount / luotHoatDong : 0;

  // SL tuyển dụng = đếm unique agentCode từ cấu trúc TVV có ngày bắt đầu trong năm hiện tại
  const slTuyenDungNam = tvvStructList.filter(t => {
    if (!t.ngayBatDau) return false;
    const d = new Date(t.ngayBatDau);
    return !isNaN(d.getTime()) && d.getFullYear() === currentYear;
  }).length;

  // NTD hoạt động: count unique maDaiLyTD that exist in recruiters
  const ntdCodes = new Set(recruiters.map(r => r.agentCode));
  const activeNTDCount = new Set<string>();
  for (const c of periodContracts) {
    if (c.maDaiLyTD && ntdCodes.has(c.maDaiLyTD)) activeNTDCount.add(c.maDaiLyTD);
  }

  // Target values — ALL plans come from KẾ HOẠCH section only
  // AFYP plan: calculated from KẾ HOẠCH (sum of all Phòng = sum of all AD plans)
  const adPlansForTarget = new Map<string, number>();
  adList.forEach(ad => {
    const val = parseFloat(onlineSettings[`nmc-kh-ad-${ad.maAD}`] || '0') || 0;
    adPlansForTarget.set(ad.maAD, val);
  });
  const targetTongAFYP = adList.reduce((s, ad) => s + (adPlansForTarget.get(ad.maAD) || 0), 0);

  // Other indicators: display only, no plan from KẾ HOẠCH
  const targetTongIP = 0; // IP has no plan
  const targetTongSLHD = 0;
  const targetLuotHD = 0;
  const targetLuotHDChuan = 0;
  const targetNangSuat = 0;
  const targetDLHD = 0;
  const targetSLTBTN = 0;
  const targetSLNTD = 0;
  const targetSLTuyenDung = 0;

  // Edit state for indicator targets
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [targetInput, setTargetInput] = useState('');

  // KẾ HOẠCH settings state
  const [khSettingsOpen, setKhSettingsOpen] = useState(false);
  const [khEditRatio, setKhEditRatio] = useState<string | null>(null);
  const [khEditRatioVal, setKhEditRatioVal] = useState('');

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
      key: 'tvvStruct', label: 'TVV', data: tvvStructList,
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
    { id: 'ov-tvv', label: 'Tổng TVV', dataSourceKey: 'tvvStruct', field: 'agentCode', calculation: 'count', color: 'sky' },
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

  // Indicator card component for revenue-based KPIs — metallic solid design
  const IndicatorCard = ({ label, value, target, settingKey, formatType, icon }: {
    label: string; value: number; target: number; settingKey: string;
    formatType: 'currency' | 'number' | 'decimal'; icon: React.ElementType;
  }) => {
    const Icon = icon;
    const isEditing = editingTarget === settingKey;
    const pct = target > 0 ? (value / target) * 100 : undefined;
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
      <div className="rounded-none p-3 sm:p-4 relative overflow-hidden" style={{ backgroundColor: '#1E293B', boxShadow: '0 4px 14px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)' }}>
        {pct !== undefined && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 text-sm sm:text-lg font-black" style={{ color: pct >= 100 ? '#86EFAC' : pct >= 70 ? '#FDE68A' : '#FCA5A5' }}>
            {pct.toFixed(0)}%
          </div>
        )}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-none" style={{ backgroundColor: '#0F172A' }}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
          </div>
          <p className="text-white/80 text-[10px] sm:text-xs font-bold leading-tight uppercase tracking-wider">{label}</p>
        </div>
        <p className="text-white text-xl sm:text-2xl font-black truncate leading-tight">{formatVal()}</p>
        {isEditing ? (
          <div className="flex items-center gap-1 mt-2">
            <Input type="number" value={targetInput} onChange={(e) => setTargetInput(e.target.value)} placeholder="Chỉ tiêu..." className="h-7 text-xs bg-gray-800 border-amber-500/50 text-white flex-1" onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTarget(settingKey); if (e.key === 'Escape') setEditingTarget(null); }} autoFocus />
            <Button onClick={() => handleSaveTarget(settingKey)} className="h-7 bg-amber-500 text-white text-[10px] px-2 py-0 rounded-none hover:bg-amber-600">Lưu</Button>
          </div>
        ) : target > 0 ? (
          <div className="mt-2">
            <p className="text-white/50 text-[9px] sm:text-[10px] font-semibold">KH: {formatTarget()}</p>
            <div className="w-full h-1.5 sm:h-2 mt-1 rounded-none" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
              <div className="h-full rounded-none transition-all duration-500" style={{ width: `${Math.min(pct || 0, 100)}%`, backgroundColor: pct && pct >= 100 ? '#86EFAC' : pct >= 70 ? '#FDE68A' : '#FCA5A5' }} />
            </div>
          </div>
        ) : (
          <p className="text-white/30 text-[9px] sm:text-[10px] mt-2">Nháy đúp ✏️ để đặt chỉ tiêu</p>
        )}
        <button className="absolute top-1 left-2 text-white/20 hover:text-white/60" onDoubleClick={() => { setEditingTarget(settingKey); setTargetInput(String(target || '')); }} title="Nháy đúp để sửa chỉ tiêu">
          <Edit2 className="w-2.5 h-2.5" />
        </button>
      </div>
    );
  };

  // Period label helper for overview filter display
  const getPeriodLabel = (period: string): string => {
    if (period.startsWith('month-')) return `Tháng ${period.split('-')[1]}`;
    if (period === 'q1') return 'Quý 1';
    if (period === 'q2') return 'Quý 2';
    if (period === 'q3') return 'Quý 3';
    if (period === 'q4') return 'Quý 4';
    if (period === 'h1') return '6 tháng đầu';
    if (period === 'year') return 'Cả năm';
    return 'Cả năm';
  };

  const renderOverview = () => (
    <div className="space-y-3">
      {/* Header with sync status and period filter */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-extrabold text-emerald-400 neon-text drop-shadow-[0_0_6px_rgba(0,255,136,0.3)]">Tổng quan năm {currentYear}</h2>
        <div className="flex items-center gap-2">
          {/* Time Period Filter Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="h-7 px-2.5 text-[10px] sm:text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/30 gap-1">
                <Calendar className="w-3 h-3" />
                {getPeriodLabel(overviewPeriod)}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="bg-[#0e0e18]/98 backdrop-blur-xl border-amber-500/30 w-72 p-3" align="end" sideOffset={4}>
              <div className="space-y-3">
                {/* Tháng group */}
                <div>
                  <p className="text-[10px] text-gray-400 font-bold mb-1.5 uppercase tracking-wider">Tháng</p>
                  <div className="grid grid-cols-4 gap-1">
                    {Array.from({ length: 12 }, (_, i) => {
                      const key = `month-${i + 1}`;
                      const isActive = overviewPeriod === key;
                      return (
                        <button key={key} onClick={() => setOverviewPeriod(key)}
                          className={`px-1.5 py-1 text-[10px] font-bold rounded transition-all ${isActive ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' : 'text-gray-300 hover:bg-white/10 border border-transparent'}`}>
                          T{i + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Quý group */}
                <div>
                  <p className="text-[10px] text-gray-400 font-bold mb-1.5 uppercase tracking-wider">Quý</p>
                  <div className="grid grid-cols-4 gap-1">
                    {(['q1', 'q2', 'q3', 'q4'] as const).map(q => {
                      const isActive = overviewPeriod === q;
                      const label = q.replace('q', 'Q');
                      return (
                        <button key={q} onClick={() => setOverviewPeriod(q)}
                          className={`px-1.5 py-1 text-[10px] font-bold rounded transition-all ${isActive ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50' : 'text-gray-300 hover:bg-white/10 border border-transparent'}`}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Khác group */}
                <div>
                  <p className="text-[10px] text-gray-400 font-bold mb-1.5 uppercase tracking-wider">Khác</p>
                  <div className="grid grid-cols-2 gap-1">
                    <button onClick={() => setOverviewPeriod('h1')}
                      className={`px-1.5 py-1 text-[10px] font-bold rounded transition-all ${overviewPeriod === 'h1' ? 'bg-sky-500/30 text-sky-300 border border-sky-500/50' : 'text-gray-300 hover:bg-white/10 border border-transparent'}`}>
                      6 tháng đầu
                    </button>
                    <button onClick={() => setOverviewPeriod('year')}
                      className={`px-1.5 py-1 text-[10px] font-bold rounded transition-all ${overviewPeriod === 'year' ? 'bg-sky-500/30 text-sky-300 border border-sky-500/50' : 'text-gray-300 hover:bg-white/10 border border-transparent'}`}>
                      Cả năm
                    </button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {lastSyncTime && (
            <span className="text-[10px] text-emerald-400/60 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Đồng bộ lúc {lastSyncTime}
            </span>
          )}
        </div>
      </div>

      {/* Row 1: Core Revenue KPIs */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: 'TỔNG AFYP', unit: 'trđ', value: formatKpiCurrency(totalRevenueAFYP), rawVal: totalRevenueAFYP, target: targetTongAFYP, targetFmt: formatKpiCurrency(targetTongAFYP), bg: '#2563EB', hasKH: true },
          { label: 'TỔNG IP', unit: 'trđ', value: formatKpiCurrency(totalRevenue), rawVal: totalRevenue, target: targetTongIP, targetFmt: formatKpiCurrency(targetTongIP), bg: '#059669', hasKH: true },
          { label: 'TỶ TRỌNG IP', unit: '%', value: ipAfypRatio.toFixed(1) + '%', rawVal: ipAfypRatio, target: 0, targetFmt: '', bg: '#0891B2', hasKH: false },
          { label: 'LƯỢT HĐ', unit: 'lượt', value: formatNumber(luotHoatDong), rawVal: luotHoatDong, target: targetLuotHD, targetFmt: formatNumber(targetLuotHD), bg: '#7C3AED', hasKH: true },
          { label: 'LƯỢT HĐ CHUẨN', unit: 'lượt', value: formatNumber(luotHDChuan), rawVal: luotHDChuan, target: targetLuotHDChuan, targetFmt: formatNumber(targetLuotHDChuan), bg: '#DC2626', hasKH: true },
        ].map((kpi, i) => {
          const pct = kpi.target > 0 ? (kpi.rawVal / kpi.target) * 100 : 0;
          return (
            <div key={i} className="rounded-none overflow-hidden" style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.1)' }}>
              <div className="px-2 py-1 sm:px-2.5 sm:py-1.5 flex items-center justify-between gap-1" style={{ backgroundColor: kpi.bg }}>
                <p className="text-white text-[8px] sm:text-[10px] font-bold leading-tight uppercase tracking-wider whitespace-nowrap">
                  {kpi.label}{!kpi.hasKH && <span className="text-white/60 text-[6px] sm:text-[8px] font-normal italic"> ({kpi.unit})</span>}
                </p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {kpi.hasKH && kpi.target > 0 && (
                    <span className="text-white/50 text-[6px] sm:text-[7px] font-semibold">{kpi.targetFmt}</span>
                  )}
                  {kpi.target > 0 && (
                    <span className="text-[9px] sm:text-xs font-black" style={{ color: pct >= 100 ? '#86EFAC' : pct >= 70 ? '#FDE68A' : '#FCA5A5' }}>
                      {pct.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-white px-1.5 py-1.5 sm:px-3 sm:py-3 text-center">
                <p className="text-xs sm:text-lg font-black leading-tight" style={{ color: kpi.bg }}>{kpi.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 2: Secondary KPIs */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'SL HĐ', unit: 'HĐ', value: formatNumber(totalRevenueContractCount), rawVal: totalRevenueContractCount, target: targetTongSLHD, targetFmt: formatNumber(targetTongSLHD), bg: '#D97706', hasKH: true },
          { label: 'NĂNG SUẤT', unit: 'HĐ/lượt', value: nangSuat.toFixed(2), rawVal: nangSuat, target: targetNangSuat, targetFmt: targetNangSuat.toFixed(1), bg: '#0284C7', hasKH: true },
          { label: 'ĐL HĐ', unit: 'trđ', value: formatKpiCurrency(doLonHD), rawVal: doLonHD, target: targetDLHD, targetFmt: formatKpiCurrency(targetDLHD), bg: '#059669', hasKH: true },
          { label: 'SL TB/TN', unit: 'người', value: formatNumber(totalStaff), rawVal: totalStaff, target: targetSLTBTN, targetFmt: formatNumber(targetSLTBTN), bg: '#7C3AED', hasKH: true },
          { label: 'SL NTD', unit: 'người', value: formatNumber(totalRecruiters), rawVal: totalRecruiters, target: targetSLNTD, targetFmt: formatNumber(targetSLNTD), bg: '#CA8A04', hasKH: true },
          { label: 'SL TUYỂN DỤNG', unit: 'người', value: formatNumber(slTuyenDungNam), rawVal: slTuyenDungNam, target: targetSLTuyenDung, targetFmt: formatNumber(targetSLTuyenDung), bg: '#0D9488', hasKH: true },
        ].map((kpi, i) => {
          const pct = kpi.target > 0 ? (kpi.rawVal / kpi.target) * 100 : 0;
          return (
            <div key={i} className="rounded-none overflow-hidden" style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.1)' }}>
              <div className="px-2 py-1 sm:px-2.5 sm:py-1.5 flex items-center justify-between gap-1" style={{ backgroundColor: kpi.bg }}>
                <p className="text-white text-[8px] sm:text-[10px] font-bold leading-tight uppercase tracking-wider whitespace-nowrap">
                  {kpi.label}{!kpi.hasKH && <span className="text-white/60 text-[6px] sm:text-[8px] font-normal italic"> ({kpi.unit})</span>}
                </p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {kpi.hasKH && kpi.target > 0 && (
                    <span className="text-white/50 text-[6px] sm:text-[7px] font-semibold">{kpi.targetFmt}</span>
                  )}
                  {kpi.target > 0 && (
                    <span className="text-[9px] sm:text-xs font-black" style={{ color: pct >= 100 ? '#86EFAC' : pct >= 70 ? '#FDE68A' : '#FCA5A5' }}>
                      {pct.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-white px-1.5 py-1.5 sm:px-3 sm:py-3 text-center">
                <p className="text-xs sm:text-lg font-black leading-tight" style={{ color: kpi.bg }}>{kpi.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly Plan from KẾ HOẠCH (read-only summary) */}
      <div className="rounded-none p-3 sm:p-4" style={{ backgroundColor: '#1E293B', boxShadow: '0 4px 14px rgba(0,0,0,0.3)' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 flex items-center justify-center rounded-none" style={{ backgroundColor: '#0F172A' }}>
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-xs sm:text-sm font-bold text-white/80 uppercase tracking-wider">Kế hoạch AFYP từng tháng</h3>
          <span className="text-[9px] text-amber-400/60 ml-auto">Nguồn: KẾ HOẠCH</span>
        </div>
        {/* Aggregated summary for selected period */}
        {overviewPeriod !== 'year' && (() => {
          const selectedPeriodMonths = getPeriodMonths(overviewPeriod);
          let aggPlan = 0, aggActual = 0;
          selectedPeriodMonths.forEach(mi => {
            const mm = String(mi).padStart(2, '0');
            const ratio = parseFloat(onlineSettings[`nmc-kh-ratio-${mm}`] || '0') || 0;
            const mp = targetTongAFYP > 0 && ratio > 0 ? targetTongAFYP * ratio / 100 : 0;
            aggPlan += mp;
            const mcc = yearContracts.filter(c => { const d = getDoanhSoMonth(c); return !isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() + 1 === mi; });
            aggActual += mcc.reduce((s, c) => s + c.afyp, 0);
          });
          const aggPct = aggPlan > 0 ? (aggActual / aggPlan) * 100 : 0;
          return (
            <div className="mb-3 p-2 rounded border border-amber-500/30 bg-amber-500/5 flex items-center justify-between flex-wrap gap-2">
              <span className="text-[10px] text-amber-300 font-bold">{getPeriodLabel(overviewPeriod)}:</span>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-white/60">KH: <span className="text-amber-400 font-bold">{formatSmartCurrency(aggPlan)}</span></span>
                <span className="text-white/60">TH: <span className="text-emerald-400 font-bold">{formatSmartCurrency(aggActual)}</span></span>
                <span className={`font-black ${aggPct >= 100 ? 'text-emerald-400' : aggPct >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>{aggPct.toFixed(1)}%</span>
              </div>
            </div>
          );
        })()}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 sm:gap-2">
          {Array.from({ length: 12 }, (_, i) => {
            const m = String(i + 1).padStart(2, '0');
            const ratio = parseFloat(onlineSettings[`nmc-kh-ratio-${m}`] || '0') || 0;
            const monthlyPlan = targetTongAFYP > 0 && ratio > 0 ? targetTongAFYP * ratio / 100 : 0;
            const mc = yearContracts.filter(c => {
              const d = getDoanhSoMonth(c);
              return !isNaN(d.getTime()) && d.getFullYear() === currentYear && String(d.getMonth() + 1).padStart(2, '0') === m;
            });
            const actualAFYP = mc.reduce((s, c) => s + c.afyp, 0);
            const pct = monthlyPlan > 0 ? (actualAFYP / monthlyPlan) * 100 : 0;
            const isCurrent = i + 1 === new Date().getMonth() + 1;
            const isInPeriod = periodMonths.includes(i + 1);
            return (
              <div key={i} className={`rounded-none p-1.5 sm:p-2 text-center relative ${isInPeriod && overviewPeriod !== 'year' ? 'ring-1 ring-amber-400/60' : ''}`} style={{ backgroundColor: isCurrent ? '#0F766E' : isInPeriod && overviewPeriod !== 'year' ? '#1a2744' : '#0F172A', boxShadow: isCurrent ? '0 0 8px rgba(15,118,110,0.4)' : 'none' }}>
                {monthlyPlan > 0 && (
                  <span className={`absolute top-0.5 right-1 text-[9px] sm:text-[10px] font-black ${pct >= 100 ? 'text-emerald-400' : pct >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>{pct.toFixed(0)}%</span>
                )}
                <p className={`text-[10px] sm:text-xs font-bold mb-0.5 ${isCurrent ? 'text-white' : isInPeriod && overviewPeriod !== 'year' ? 'text-amber-300' : 'text-gray-400'}`}>T{i + 1}</p>
                <p className="text-[9px] sm:text-[10px] text-amber-400 font-bold">{monthlyPlan > 0 ? (monthlyPlan >= 1_000_000 ? `${(monthlyPlan / 1_000_000).toFixed(0)}tr` : formatNumber(Math.round(monthlyPlan))) : '—'}</p>
                <p className={`text-[10px] sm:text-xs font-black ${pct >= 100 ? 'text-emerald-400' : pct >= 70 ? 'text-amber-400' : actualAFYP > 0 ? 'text-sky-400' : 'text-gray-600'}`}>
                  {actualAFYP > 0 ? (actualAFYP >= 1_000_000 ? `${(actualAFYP / 1_000_000).toFixed(1)}tr` : formatNumber(Math.round(actualAFYP))) : '—'}
                </p>
                {monthlyPlan > 0 && (
                  <div className="w-full h-1 mt-1 rounded-none" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                    <div className="h-full rounded-none transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct >= 100 ? '#86EFAC' : pct >= 70 ? '#FDE68A' : '#FCA5A5' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[9px] sm:text-[10px] text-white/30 mt-2">Tổng KH năm: {formatSmartCurrency(targetTongAFYP)}</p>
      </div>

      {/* Monthly AFYP Progress Chart — 2-column: Kế hoạch vs Thực hiện */}
      {(() => {
        const monthlyData = Array.from({ length: 12 }, (_, i) => {
          const m = String(i + 1).padStart(2, '0');
          const mc = yearContracts.filter(c => {
            const d = getDoanhSoMonth(c);
            return !isNaN(d.getTime()) && d.getFullYear() === currentYear && String(d.getMonth() + 1).padStart(2, '0') === m;
          });
          const target = (() => { const ratio = parseFloat(onlineSettings[`nmc-kh-ratio-${m}`] || '0') || 0; return targetTongAFYP > 0 && ratio > 0 ? targetTongAFYP * ratio / 100 : 0; })();
          return { month: m, index: i, afyp: mc.reduce((s, c) => s + c.afyp, 0), ip: mc.reduce((s, c) => s + c.pdt10DT, 0), count: mc.length, target };
        });
        const maxAfyp = Math.max(...monthlyData.map(d => Math.max(d.afyp, d.target)), 1);
        const currentMonth = new Date().getMonth() + 1;
        return (
          <div className="rounded-none p-3 sm:p-5" style={{ backgroundColor: '#1E293B', boxShadow: '0 4px 14px rgba(0,0,0,0.3)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 flex items-center justify-center rounded-none" style={{ backgroundColor: '#0F172A' }}>
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white/80 uppercase tracking-wider">Tiến độ AFYP hàng tháng</h3>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-white/40 font-semibold">
                <span className="flex items-center gap-1"><span className="w-3 h-3 border-2 border-amber-500 inline-block"></span> Kế hoạch</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 inline-block"></span> Thực hiện</span>
              </div>
            </div>
            {/* Grid lines */}
            <div className="relative">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[0, 25, 50, 75, 100].map(pct => (
                  <div key={pct} className="border-t border-white/5 relative">
                    <span className="absolute -left-1 -top-2 text-[8px] text-white/20 font-medium">{formatSmartCurrency(Math.round(maxAfyp * pct / 100))}</span>
                  </div>
                ))}
              </div>
              {/* Chart bars */}
              <div className="flex items-end gap-2 h-[200px] ml-10">
                {monthlyData.map(d => {
                  const planHeight = d.target > 0 ? (d.target / maxAfyp) * 100 : 0;
                  const actualHeight = d.afyp > 0 ? (d.afyp / maxAfyp) * 100 : 0;
                  const reached = d.target > 0 && d.afyp >= d.target;
                  const isCurrent = d.index + 1 === currentMonth;
                  const isInPeriod = periodMonths.includes(d.index + 1);
                  const pct = d.target > 0 ? (d.afyp / d.target) * 100 : 0;
                  return (
                    <div key={d.month} className={`flex-1 flex flex-col items-center relative ${!isInPeriod && overviewPeriod !== 'year' ? 'opacity-30' : ''}`} style={{ height: '100%' }}>
                      <div className="flex-1 w-full flex items-end justify-center gap-[2px]">
                        {/* Plan bar (outline) */}
                        <div
                          className={`w-2/5 border-2 ${isInPeriod || overviewPeriod === 'year' ? 'border-amber-500/60' : 'border-amber-500/30'} ${isCurrent ? 'border-amber-400' : ''}`}
                          style={{ height: `${Math.max(planHeight, 1)}%` }}
                          title={`T${d.index + 1} KH: ${formatCurrency(d.target)}`}
                        ></div>
                        {/* Actual bar (filled) */}
                        <div
                          className={`w-2/5 transition-all ${reached ? 'bg-emerald-500' : d.afyp > 0 ? 'bg-sky-500' : 'bg-white/10'} ${isCurrent ? 'ring-1 ring-emerald-400/50' : ''}`}
                          style={{ height: `${Math.max(actualHeight, 1)}%` }}
                          title={`T${d.index + 1} TH: ${formatCurrency(d.afyp)} | ${d.count} HĐ${d.target > 0 ? ` | ${pct.toFixed(0)}%` : ''}`}
                        ></div>
                      </div>
                      <p className={`text-[10px] mt-1 font-black ${isCurrent ? 'text-emerald-400' : isInPeriod && overviewPeriod !== 'year' ? 'text-amber-300' : 'text-white/40'}`}>T{d.index + 1}</p>
                      {d.afyp > 0 && (
                        <p className={`text-[9px] font-black ${reached ? 'text-emerald-400' : 'text-sky-400'}`}>
                          {d.afyp >= 1_000_000 ? `${(d.afyp / 1_000_000).toFixed(1)}tr` : formatNumber(Math.round(d.afyp))}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );

  // ========== RENDER: Kế hoạch ==========
  const renderKeHoach = () => {
    // Monthly ratio from settings (tỷ lệ % từng tháng)
    const monthlyRatios = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, '0');
      return parseFloat(onlineSettings[`nmc-kh-ratio-${m}`] || '0') || 0;
    });

    // AFYP plan per AD (from settings)
    const adPlans = new Map<string, number>();
    adList.forEach(ad => {
      const val = parseFloat(onlineSettings[`nmc-kh-ad-${ad.maAD}`] || '0') || 0;
      adPlans.set(ad.maAD, val);
    });

    // AFYP plan per Nhóm (from settings)
    const nhomPlans = new Map<string, number>();
    banNhomList.forEach(bn => {
      const val = parseFloat(onlineSettings[`nmc-kh-nhom-${bn.maBanNhom}`] || '0') || 0;
      nhomPlans.set(bn.maBanNhom, val);
    });

    // Auto-calculate: Phòng = sum of its ADs
    const phongPlans = new Map<string, number>();
    phongList.forEach(p => {
      const sum = adList.filter(ad => ad.maPhong === p.maPhong).reduce((s, ad) => s + (adPlans.get(ad.maAD) || 0), 0);
      phongPlans.set(p.maPhong, sum);
    });

    // Auto-calculate: Công ty = sum of all Phòng
    const congTyPlan = phongList.reduce((s, p) => s + (phongPlans.get(p.maPhong) || 0), 0);

    // Total annual ratio check
    const totalRatio = monthlyRatios.reduce((s, r) => s + r, 0);

    const saveRatio = (m: string, val: string) => {
      saveSetting(`nmc-kh-ratio-${m}`, val);
      setKhEditRatio(null);
    };

    const saveADPlan = (maAD: string, val: number) => {
      saveSetting(`nmc-kh-ad-${maAD}`, String(val));
    };

    const saveNhomPlan = (maBanNhom: string, val: number) => {
      saveSetting(`nmc-kh-nhom-${maBanNhom}`, String(val));
    };

    // Helper: format plan value for minimap display
    const fmtPlan = (val: number) => {
      if (val <= 0) return '—';
      if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')} tỷ`;
      if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2).replace(/\.?0+$/, '')} trđ`;
      return formatNumber(Math.round(val));
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-emerald-400 neon-text drop-shadow-[0_0_6px_rgba(0,255,136,0.3)]">Kế hoạch AFYP năm {currentYear}</h2>
          <Popover open={khSettingsOpen} onOpenChange={setKhSettingsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="h-8 px-3 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/30">
                <Settings className="w-3.5 h-3.5 mr-1" /> Cài đặt KH
              </Button>
            </PopoverTrigger>
            <PopoverContent className="bg-[#0e0e18]/98 backdrop-blur-xl border-amber-500/30 w-[95vw] max-w-[800px] p-4 max-h-[85vh] overflow-y-auto" align="end" sideOffset={4}>
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                  <Target className="w-4 h-4" /> Cài đặt Kế hoạch AFYP
                </h4>

                {/* 12 monthly ratio boxes */}
                <div>
                  <p className="text-[10px] text-gray-400 mb-2">Tỷ lệ phân bổ theo tháng (%) — Tổng sẽ = 100%</p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                    {monthlyRatios.map((ratio, i) => {
                      const m = String(i + 1).padStart(2, '0');
                      const isEditing = khEditRatio === m;
                      return (
                        <div key={i} className="text-center">
                          <p className="text-[9px] text-gray-500 font-bold mb-0.5">T{i + 1}</p>
                          {isEditing ? (
                            <input
                              type="number"
                              value={khEditRatioVal}
                              onChange={e => setKhEditRatioVal(e.target.value)}
                              onBlur={() => saveRatio(m, khEditRatioVal)}
                              onKeyDown={e => { if (e.key === 'Enter') saveRatio(m, khEditRatioVal); if (e.key === 'Escape') setKhEditRatio(null); }}
                              className="w-full h-8 text-xs text-center bg-gray-700 border border-amber-500/50 text-white rounded px-1"
                              autoFocus
                            />
                          ) : (
                            <div
                              className="h-8 flex items-center justify-center bg-gray-800 border border-gray-700 rounded cursor-pointer hover:border-amber-500/50"
                              onClick={() => { setKhEditRatio(m); setKhEditRatioVal(String(ratio)); }}
                            >
                              <span className={`text-xs font-bold ${ratio > 0 ? 'text-amber-400' : 'text-gray-600'}`}>{ratio > 0 ? `${ratio}%` : '—'}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className={`text-[9px] mt-1 font-bold ${Math.abs(totalRatio - 100) < 0.1 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    Tổng tỷ lệ: {totalRatio.toFixed(1)}% {Math.abs(totalRatio - 100) < 0.1 ? '✓' : '(nên = 100%)'}
                  </p>
                </div>

                {/* AD plans */}
                <div>
                  <p className="text-[10px] text-gray-400 mb-1">Kế hoạch năm — AD (Phòng tự tính = tổng AD)</p>
                  {phongList.map(p => {
                    const adsOfPhong = adList.filter(ad => ad.maPhong === p.maPhong);
                    const phongTotal = phongPlans.get(p.maPhong) || 0;
                    return (
                      <div key={p.maPhong} className="mb-3">
                        <div className="flex items-center justify-between bg-amber-500/10 px-2 py-1 rounded-t border-b border-amber-500/20">
                          <span className="text-[10px] text-amber-300 font-bold">{p.tenPhong}</span>
                          <span className="text-[10px] text-amber-200 font-bold">{phongTotal > 0 ? formatSmartCurrency(phongTotal) : '—'}</span>
                        </div>
                        {adsOfPhong.map(ad => {
                          const plan = adPlans.get(ad.maAD) || 0;
                          return (
                            <div key={ad.maAD} className="flex items-center gap-2 px-2 py-1 border-b border-gray-800 hover:bg-gray-800/50">
                              <span className="text-[10px] text-gray-300 flex-1 truncate">├ {ad.tenAD}</span>
                              <input
                                type="number"
                                value={plan || ''}
                                onChange={e => saveADPlan(ad.maAD, parseFloat(e.target.value) || 0)}
                                placeholder="KH năm..."
                                className="w-28 h-6 text-[10px] text-right bg-gray-800 border border-gray-700 text-white rounded px-1.5 hover:border-amber-500/50 focus:border-amber-400 outline-none"
                              />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* Nhóm plans */}
                <div>
                  <p className="text-[10px] text-gray-400 mb-1">Kế hoạch năm — Nhóm</p>
                  {phongList.map(p => {
                    const adsOfPhong = adList.filter(ad => ad.maPhong === p.maPhong);
                    if (adsOfPhong.length === 0) return null;
                    return adsOfPhong.map(ad => {
                      const nhomsOfAD = banNhomList.filter(bn => bn.maAD === ad.maAD);
                      if (nhomsOfAD.length === 0) return null;
                      return (
                        <div key={ad.maAD} className="mb-2">
                          <div className="text-[9px] text-sky-300 font-bold px-2 py-0.5 bg-sky-500/10 rounded-t">AD: {ad.tenAD}</div>
                          {nhomsOfAD.map(bn => {
                            const plan = nhomPlans.get(bn.maBanNhom) || 0;
                            return (
                              <div key={bn.maBanNhom} className="flex items-center gap-2 px-2 py-0.5 border-b border-gray-800/50 hover:bg-gray-800/30">
                                <span className="text-[10px] text-gray-400 flex-1 truncate">├ {bn.tenBanNhom}</span>
                                <input
                                  type="number"
                                  value={plan || ''}
                                  onChange={e => saveNhomPlan(bn.maBanNhom, parseFloat(e.target.value) || 0)}
                                  placeholder="KH năm..."
                                  className="w-28 h-6 text-[10px] text-right bg-gray-800 border border-gray-700 text-white rounded px-1.5 hover:border-amber-500/50 focus:border-amber-400 outline-none"
                                />
                              </div>
                            );
                          })}
                        </div>
                      );
                    });
                  })}
                </div>

                <div className="text-[9px] text-gray-500 pt-2 border-t border-gray-800">
                  Phòng = tổng AD trong phòng • Công ty = tổng các phòng • KH tháng = KH năm × tỷ lệ tháng
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Minimap: Công ty — KH năm tổng */}
        <div className="rounded-none p-3 sm:p-4" style={{ backgroundColor: '#1E293B', boxShadow: '0 4px 14px rgba(0,0,0,0.3)' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 flex items-center justify-center rounded-none" style={{ backgroundColor: '#0F172A' }}>
              <Building2 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Công ty — Kế hoạch năm</p>
              <p className="text-amber-400 text-xl sm:text-2xl font-black">{congTyPlan > 0 ? formatSmartCurrency(congTyPlan) : '—'}</p>
            </div>
          </div>
          {congTyPlan > 0 && (
            <p className="text-[9px] text-white/30 mt-1">Phân bổ theo 12 tháng bên dưới</p>
          )}
        </div>

        {/* Minimap: 12 tháng — chỉ KH tháng */}
        <div className="rounded-none p-3 sm:p-4" style={{ backgroundColor: '#1E293B', boxShadow: '0 4px 14px rgba(0,0,0,0.3)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-none" style={{ backgroundColor: '#0F172A' }}>
              <Calendar className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-white/80 uppercase tracking-wider">KH AFYP từng tháng</h3>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 sm:gap-2">
            {Array.from({ length: 12 }, (_, i) => {
              const m = String(i + 1).padStart(2, '0');
              const ratio = monthlyRatios[i] || 0;
              const monthlyPlan = congTyPlan > 0 && ratio > 0 ? congTyPlan * ratio / 100 : 0;
              const isCurrent = i + 1 === new Date().getMonth() + 1;
              return (
                <div key={i} className="rounded-none p-1.5 sm:p-2 text-center" style={{ backgroundColor: isCurrent ? '#0F766E' : '#0F172A', boxShadow: isCurrent ? '0 0 8px rgba(15,118,110,0.4)' : 'none' }}>
                  <p className={`text-[10px] sm:text-xs font-bold mb-0.5 ${isCurrent ? 'text-white' : 'text-gray-400'}`}>T{i + 1}</p>
                  <p className="text-[8px] sm:text-[9px] text-gray-500">{ratio > 0 ? `${ratio}%` : '—'}</p>
                  <p className="text-[9px] sm:text-[10px] text-amber-400 font-bold mt-0.5">{monthlyPlan > 0 ? fmtPlan(monthlyPlan) : '—'}</p>
                </div>
              );
            })}
          </div>
          <p className="text-[9px] sm:text-[10px] text-white/30 mt-2">KH tháng = KH năm × tỷ lệ tháng | Tổng KH năm: {formatSmartCurrency(congTyPlan)}</p>
        </div>

        {/* Minimap: Phòng → AD → Nhóm hierarchy — chỉ KH */}
        {phongList.map(p => {
          const adsOfPhong = adList.filter(ad => ad.maPhong === p.maPhong);
          const phongPlan = phongPlans.get(p.maPhong) || 0;
          return (
            <div key={p.maPhong} className="rounded-none overflow-hidden" style={{ backgroundColor: '#1E293B', boxShadow: '0 4px 14px rgba(0,0,0,0.3)' }}>
              {/* Phòng header */}
              <div className="px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between" style={{ backgroundColor: '#0F172A' }}>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span className="text-xs sm:text-sm font-bold text-amber-300">{p.tenPhong}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-amber-400 text-sm sm:text-lg font-black">{phongPlan > 0 ? formatSmartCurrency(phongPlan) : '—'}</span>
                  <span className="text-[9px] text-gray-500 font-semibold">KH năm</span>
                </div>
              </div>
              {/* AD rows */}
              {adsOfPhong.map(ad => {
                const nhomsOfAD = banNhomList.filter(bn => bn.maAD === ad.maAD);
                const adPlan = adPlans.get(ad.maAD) || 0;
                return (
                  <div key={ad.maAD}>
                    <div className="px-3 py-1.5 sm:px-4 flex items-center justify-between border-t border-gray-800/50 hover:bg-gray-800/30">
                      <span className="text-[10px] sm:text-xs text-sky-300 font-bold">AD: {ad.tenAD}</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-amber-400/90 text-[10px] sm:text-xs font-bold">{adPlan > 0 ? formatSmartCurrency(adPlan) : '—'}</span>
                        <span className="text-[8px] text-gray-600">KH năm</span>
                      </div>
                    </div>
                    {/* Nhóm mini rows */}
                    {nhomsOfAD.map(bn => {
                      const bnPlan = nhomPlans.get(bn.maBanNhom) || 0;
                      return (
                        <div key={bn.maBanNhom} className="px-3 py-1 sm:px-6 flex items-center justify-between border-t border-gray-800/20 hover:bg-gray-800/20">
                          <span className="text-[9px] sm:text-[10px] text-gray-400 truncate max-w-[50%]">├ {bn.tenBanNhom}</span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-amber-400/70 text-[9px] sm:text-[10px] font-bold">{bnPlan > 0 ? formatSmartCurrency(bnPlan) : '—'}</span>
                            <span className="text-[7px] text-gray-600">KH</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

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
            { label: 'Tổng TB/TN', value: formatNumber(kpiTotalTB), bg: '#059669', badge: '#047857', icon: Users },
            { label: 'Tổng lương', value: formatCurrency(kpiTotalSalary), bg: '#2563EB', badge: '#1D4ED8', icon: DollarSign },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
            <div key={i} className="rounded-none p-3 sm:p-4" style={{ backgroundColor: kpi.bg, boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 flex items-center justify-center rounded-none" style={{ backgroundColor: kpi.badge }}><Icon className="w-4 h-4 text-white" /></div>
                <p className="text-white/80 text-[10px] sm:text-xs font-bold leading-tight uppercase tracking-wider">{kpi.label}</p>
              </div>
              <p className="text-white text-xl sm:text-2xl font-black truncate leading-tight">{kpi.value}</p>
            </div>);
          })
          }
        </div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Button onClick={addLeader} className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 h-8 text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> Thêm</Button>
          <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 rounded-md text-xs font-medium cursor-pointer"><Upload className="w-3.5 h-3.5" /> Import<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleImport('leaders', e)} /></label>
          <Button onClick={() => handleDownloadTemplate('leaders')} variant="outline" className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 h-8 text-xs"><FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Tải mẫu</Button>
          <Button onClick={() => handleExport('leaders')} variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 h-8 text-xs"><Download className="w-3.5 h-3.5 mr-1" /> Xuất</Button>
        </div>
        <div className="overflow-x-auto border border-emerald-600">
          <Table>
            <TableHeader><TableRow className="bg-emerald-800 hover:bg-emerald-800 border-b border-emerald-700">
              {[{ f: 'agentCode', l: 'Mã số' }, { f: 'agentName', l: 'Họ tên' }, { f: 'position', l: 'Chức vụ' }, { f: 'ban', l: 'Ban' }, { f: 'nhom', l: 'Nhóm' }, { f: 'maNhom', l: 'Mã nhóm' }, { f: 'salary', l: 'Tiền/tháng' }, { f: 'phone', l: 'SĐT' }, { f: 'email', l: 'Email' }, { f: 'startDate', l: 'Ngày bắt đầu' }, { f: 'note', l: 'Ghi chú' }].map(col => (
                <TableHead key={col.f} className="text-yellow-100 text-xs font-bold uppercase cursor-pointer hover:text-amber-300 whitespace-nowrap" onClick={() => sortData(col.f)}>{col.l} <SortIcon field={col.f} /></TableHead>
              ))}
              <TableHead className="text-yellow-100 text-xs uppercase w-[40px]"></TableHead>
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
    // Recruiters are always editable (not tied to sync)
    const kpiTotalNTD = filtered.length;
    const kpiActive = filtered.filter(r => !r.startDate || r.startDate === '').length;
    return (
      <div>
        {/* KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {[
            { label: 'Tổng NTD', value: formatNumber(kpiTotalNTD), bg: '#7C3AED', badge: '#6D28D9', icon: UserCircle },
            { label: 'Đang hoạt động', value: formatNumber(kpiActive), bg: '#059669', badge: '#047857', icon: CheckCircle2 },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
            <div key={i} className="rounded-none p-3 sm:p-4" style={{ backgroundColor: kpi.bg, boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 flex items-center justify-center rounded-none" style={{ backgroundColor: kpi.badge }}><Icon className="w-4 h-4 text-white" /></div>
                <p className="text-white/80 text-[10px] sm:text-xs font-bold leading-tight uppercase tracking-wider">{kpi.label}</p>
              </div>
              <p className="text-white text-xl sm:text-2xl font-black truncate leading-tight">{kpi.value}</p>
            </div>);
          })
          }
        </div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Button onClick={addRecruiter} className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 h-8 text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> Thêm</Button>
          <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 rounded-md text-xs font-medium cursor-pointer"><Upload className="w-3.5 h-3.5" /> Import<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleImport('recruiters', e)} /></label>
          <Button onClick={() => handleDownloadTemplate('recruiters')} variant="outline" className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 h-8 text-xs"><FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Tải mẫu</Button>
          <Button onClick={() => handleExport('recruiters')} variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 h-8 text-xs"><Download className="w-3.5 h-3.5 mr-1" /> Xuất</Button>
        </div>
        <div className="overflow-x-auto border border-emerald-600">
          <Table>
            <TableHeader><TableRow className="bg-emerald-800 hover:bg-emerald-800 border-b border-emerald-700">
              {[{ f: 'agentCode', l: 'Mã số' }, { f: 'agentName', l: 'Họ tên' }, { f: 'position', l: 'Chức vụ' }, { f: 'nhom', l: 'Nhóm' }, { f: 'startDate', l: 'Ngày bắt đầu' }].map(col => (
                <TableHead key={col.f} className="text-yellow-100 text-xs font-bold uppercase cursor-pointer hover:text-amber-300 whitespace-nowrap" onClick={() => sortData(col.f)}>{col.l} <SortIcon field={col.f} /></TableHead>
              ))}
              <TableHead className="text-yellow-100 text-xs uppercase w-[40px]"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id} className="bg-white hover:bg-emerald-50 border-b border-gray-200">
                  <TableCell className="text-xs p-0"><EditableCell value={r.agentCode} onSave={(v) => updateRecruiter(r.id, 'agentCode', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={r.agentName} onSave={(v) => updateRecruiter(r.id, 'agentName', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={r.position} onSave={(v) => updateRecruiter(r.id, 'position', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={r.nhom} onSave={(v) => updateRecruiter(r.id, 'nhom', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={r.startDate || ''} onSave={(v) => updateRecruiter(r.id, 'startDate', v)} type="date" /></TableCell>
                  <TableCell className="text-xs p-1"><Button variant="ghost" size="sm" onClick={() => deleteRecruiter(r.id)} className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 className="w-3 h-3" /></Button></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-gray-500 text-sm py-8">Chưa có dữ liệu</TableCell></TableRow>}
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

  // ========== RENDER: Chính sách đại lý ==========
  const renderPolicy = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-violet-400 drop-shadow-[0_0_6px_rgba(139,92,246,0.3)]">Chính sách đại lý</h2>
        </div>
        <div className="text-center py-10 text-white/30 text-sm italic">
          Chưa có mục chính sách nào. Vui lòng tạo mới.
        </div>
      </div>
    );
  };

  const renderRevenue = () => {
    const currentYear = new Date().getFullYear();
    const monthLabel = MONTHS.find(m => m.key === revenueSub)?.label || '';

    // Filter contracts by selected month (based on Ngày PH, fallback Ngày HL)
    const monthFilteredContracts = revenueSub === 'all'
      ? contracts.filter(c => {
          const d = getDoanhSoMonth(c);
          return !isNaN(d.getTime()) && d.getFullYear() === currentYear;
        })
      : contracts.filter(c => {
          const d = getDoanhSoMonth(c);
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
              className={`px-2.5 py-1 rounded-[2px] text-xs font-bold transition-colors flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${
                revenueSub === m.key
                  ? 'bg-amber-100 border border-amber-300 text-amber-800 shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-amber-50 shadow-sm'
              }`}
            >
              {m.key === 'all' ? m.label : `T${m.key.replace('0', '')}`}
              {hasSectionLink(`revenue-${m.key}`) && <Link2 className="w-2.5 h-2.5" />}
            </button>
          ))}
        </div>

        {/* Layout: Indicators (1/3) + Table (2/3) */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* KPI Indicator strip — left side on desktop, full width on mobile */}
          <div className="lg:w-1/3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
            {[
              { label: 'SL HĐ', value: formatNumber(soLuongHD), bg: '#D97706' },
              { label: 'IP + 10% PĐT', value: formatKpiCurrency(tongIP), bg: '#059669' },
              { label: 'AFYP', value: formatKpiCurrency(tongAFYP), bg: '#2563EB' },
              { label: 'Lượt HĐ', value: formatNumber(luotHoatDong), bg: '#7C3AED' },
              { label: 'Lượt chuẩn', value: formatNumber(luotChuan), bg: '#DC2626' },
              { label: 'IP/AFYP', value: ipAfypMonth.toFixed(1) + '%', bg: '#0891B2' },
              { label: 'Năng suất', value: nangSuatMonth.toFixed(2), bg: '#0284C7' },
              { label: 'ĐLHĐ', value: formatKpiCurrency(dlhdMonth), bg: '#059669' },
            ].map((kpi, i) => (
              <div key={i} className="rounded-none overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                {/* Colored header strip */}
                <div className="px-2 py-1" style={{ backgroundColor: kpi.bg }}>
                  <p className="text-white text-[8px] sm:text-[9px] font-bold leading-tight uppercase tracking-wider text-center">
                    {kpi.label}
                  </p>
                </div>
                {/* White body with large number */}
                <div className="bg-white px-1.5 py-2 sm:px-2 sm:py-2.5 text-center">
                  <p className="text-sm sm:text-lg font-black leading-tight" style={{ color: kpi.bg }}>{kpi.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Table section — right side on desktop, full width on mobile */}
          <div className="lg:w-2/3">
            {/* Nhóm filter + table header */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-gray-700">
                {revenueSub === 'all' ? `Tổng hợp năm ${currentYear}` : monthLabel} — {sortedContracts.length} HĐ
              </h3>
          {uniqueNhoms.length > 0 && (
            <select
              value={settingsNhomFilter}
              onChange={(e) => setSettingsNhomFilter(e.target.value)}
              className="h-7 text-[10px] bg-white border border-gray-300 text-gray-700 rounded-[2px] px-2"
            >
              <option value="">Tất cả Nhóm</option>
              {uniqueNhoms.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          )}
          <label className="inline-flex items-center gap-1 px-2 py-1 bg-sky-100 hover:bg-sky-200 border border-sky-300 text-sky-800 rounded-[2px] text-[11px] font-medium cursor-pointer shadow-sm"><Upload className="w-3 h-3" /> Import HĐ<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleImport('contracts', e)} /></label>
          <Button onClick={() => handleDownloadTemplate('contracts')} variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 h-7 text-xs rounded-[2px]"><FileSpreadsheet className="w-3 h-3 mr-1" /> Tải mẫu</Button>
          <Button onClick={() => handleExport('contracts')} variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 h-7 text-xs rounded-[2px]"><Download className="w-3 h-3 mr-1" /> Xuất</Button>
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
        <div className="hidden md:block overflow-auto max-h-[calc(100vh-320px)] border border-emerald-600 rounded-lg" style={{ scrollbarWidth: 'thin', scrollbarColor: '#059669 transparent' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0 }} className="w-full min-w-[1400px]">
            <thead className="sticky top-0 z-10 bg-emerald-800 border-b-2 border-emerald-700">
              <tr>
                {/* STT column - auto-numbered */}
                <th className="px-2 py-2 text-[10px] font-bold text-yellow-100 text-center whitespace-nowrap w-[40px]">STT</th>
                {CONTRACT_TABLE_COLUMNS.map(col => (
                  <th
                    key={col.f}
                    className="px-2 py-2 whitespace-nowrap text-[10px] font-bold text-yellow-100 cursor-pointer hover:text-amber-300 transition-colors"
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
                <tr key={c.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-emerald-50 border-b border-gray-200 transition-colors`}>
                  {/* Auto STT */}
                  <td className="text-[10px] py-1 px-2 text-gray-400 text-center">{idx + 1}</td>
                  {CONTRACT_TABLE_COLUMNS.map(col => (
                    <td key={col.f} className="text-[10px] py-1 px-1">
                      {col.type === 'number' ? (
                        <span className={`block px-1 text-right font-mono ${(c as any)[col.f] > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                          {(c as any)[col.f] > 0 ? formatNumber((c as any)[col.f]) : '—'}
                        </span>
                      ) : col.type === 'date' ? (
                        <span className="block px-1 text-gray-600 whitespace-nowrap">{formatDateDisplay((c as any)[col.f])}</span>
                      ) : (
                        <span className="block px-1 text-gray-800 whitespace-nowrap truncate max-w-[120px]" title={String((c as any)[col.f] || '')}>{String((c as any)[col.f] || '—')}</span>
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
                <tr className="sticky bottom-0 bg-emerald-100 font-bold border-t-2 border-emerald-500/30">
                  <td className="text-[10px] py-2 px-2 text-emerald-800 font-bold text-center" colSpan={1}>Σ</td>
                  <td className="text-[10px] py-2 px-2 text-emerald-800 font-bold" colSpan={10}>TỔNG CỘNG ({soLuongHD} HĐ)</td>
                  {/* IP + 10% PĐT total */}
                  <td className="text-[10px] py-2 px-1 text-emerald-800 text-right font-mono font-bold">{formatNumber(tongIP)}</td>
                  {/* AFYP total */}
                  <td className="text-[10px] py-2 px-1 text-emerald-800 text-right font-mono font-bold">{formatNumber(tongAFYP)}</td>
                  {/* AD */}
                  <td className="text-[10px] py-2 px-2 text-gray-400"></td>
                  {/* TÍNH LƯỢT 3tr summary */}
                  <td className="text-[10px] py-2 px-1 text-violet-600 text-right font-mono font-bold" title={`HD: ${luotHoatDong} | Chuẩn: ${luotChuan}`}>
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
          IP + 10% PĐT: {formatKpiCurrency(tongIP)} • AFYP: {formatKpiCurrency(tongAFYP)} • Lượt HĐ: TÍNH LƯỢT ≥ 3tr ({luotHoatDong}) • Lượt chuẩn: ≥ 12tr ({luotChuan}) • IP/AFYP = {ipAfypMonth.toFixed(1)}% • Năng suất: {nangSuatMonth.toFixed(2)} • ĐLHĐ: {formatKpiCurrency(dlhdMonth)}
        </p>
      </div>
          </div>
        </div>
    );
  };

  // ========== RENDER: Structure (3-column: Phòng → AD → Nhóm/TVV) ==========
  const renderStructure = () => {
    const totalTVV = tvvStructList.length;
    const totalBN = banNhomList.length;
    const totalADCount = adList.length;
    const totalPhong = phongList.length;

    return (
      <>
      <div className="space-y-3 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-extrabold text-emerald-400 neon-text drop-shadow-[0_0_6px_rgba(0,255,136,0.3)]">Cấu trúc tổ chức</h2>
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
              <Button variant="ghost" size="sm" className="h-7 text-[10px] text-emerald-300 hover:text-emerald-200"><FileSpreadsheet className="w-3 h-3 mr-1" /> Tải mẫu</Button>
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

        {/* Summary strip — green theme */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-emerald-300 bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full">{totalPhong} Phòng</span>
          <span className="text-[10px] text-emerald-300 bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full">{totalADCount} AD</span>
          <span className="text-[10px] text-emerald-300 bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full">{totalBN} Nhóm</span>
          <span className="text-[10px] text-emerald-300 bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full">{totalTVV} TVV</span>
          <div className="ml-auto">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              id="tvv-upsert-file-input"
              onChange={e => { const file = e.target.files?.[0]; if (file) handleUpsertTvvFile(file); e.target.value = ''; }}
            />
            <Button variant="ghost" size="sm" disabled={isReplacingTvv} onClick={() => document.getElementById('tvv-upsert-file-input')?.click()} className="h-6 text-[10px] text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-500/50 bg-amber-500/10">
              {isReplacingTvv ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Đang cập nhật...</> : <><Upload className="w-3 h-3 mr-1" /> Cập nhật DS TVV</>}
            </Button>
          </div>
        </div>

        {/* Tree Layout — Kế hoạch-style cards with silver/gray content bg */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin space-y-2">
          {phongList.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-white/30 text-xs italic">Chưa có cấu trúc. Thêm Phòng hoặc Import để bắt đầu.</p>
              <Button variant="ghost" size="sm" onClick={() => setAddPhongOpen(true)} className="text-emerald-400 hover:text-emerald-300 mt-2 text-[10px] h-6"><Plus className="w-3 h-3 mr-1" /> Thêm Phòng</Button>
            </div>
          ) : phongList.map(p => {
            const pADs = adList.filter(a => a.maPhong === p.maPhong);
            return (
              <div key={p.id} className="rounded-none overflow-hidden" style={{ backgroundColor: '#1E293B', boxShadow: '0 4px 14px rgba(0,0,0,0.3)' }}>
                {/* PHÒNG header — dark strip like Kế hoạch */}
                <div className="px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between" style={{ backgroundColor: '#0F172A' }}>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs sm:text-sm font-bold text-emerald-300">{p.tenPhong}</span>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <span className="text-[9px] text-gray-500 mr-2">{p.maPhong} • {pADs.length} AD</span>
                    <Button variant="ghost" size="sm" onClick={() => { setNewAD(prev => ({ ...prev, maPhong: p.maPhong })); setAddADOpen(true); }} className="h-5 w-5 p-0 text-white/70 hover:text-white" title="Thêm AD"><Plus className="w-2.5 h-2.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingPhong(p)} className="h-5 w-5 p-0 text-white/30 hover:text-emerald-400"><Edit2 className="w-2.5 h-2.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeletePhong(p.id)} className="h-5 w-5 p-0 text-white/30 hover:text-red-400"><Trash2 className="w-2.5 h-2.5" /></Button>
                  </div>
                </div>

                {/* AD list — silver/gray background */}
                <div className="px-3 py-2 space-y-1.5" style={{ backgroundColor: '#e5e7eb' }}>
                  {pADs.length === 0 && (
                    <div className="px-2 py-1.5">
                      <p className="text-gray-500 text-[9px] italic">Chưa có AD</p>
                    </div>
                  )}
                  {pADs.map(a => {
                    const aBNs = banNhomList.filter(b => b.maAD === a.maAD);
                    return (
                      <div key={a.id} className="rounded-none overflow-hidden" style={{ backgroundColor: '#ecfdf5', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                        {/* AD header — dark green accent */}
                        <div className="px-3 py-1.5 flex items-center justify-between" style={{ backgroundColor: '#059669' }}>
                          <div className="flex items-center gap-2">
                            <UserCog className="w-3.5 h-3.5 text-white flex-shrink-0" />
                            <span className="text-[11px] font-bold text-white truncate">{a.tenAD}</span>
                            <span className="text-[9px] text-white/70">{a.maAD} • {aBNs.length} nhóm</span>
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <Button variant="ghost" size="sm" onClick={() => { setNewBanNhom(prev => ({ ...prev, maAD: a.maAD })); setAddBanNhomOpen(true); }} className="h-4 w-4 p-0 text-white/70 hover:text-white" title="Thêm Nhóm"><Plus className="w-2 h-2" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingAD(a)} className="h-4 w-4 p-0 text-white/50 hover:text-white"><Edit2 className="w-2 h-2" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteAD(a.id)} className="h-4 w-4 p-0 text-white/50 hover:text-red-300"><Trash2 className="w-2 h-2" /></Button>
                          </div>
                        </div>

                        {/* Nhóm list — white background */}
                        <div className="px-2 py-1.5 space-y-1">
                          {aBNs.length === 0 && (
                            <div className="px-2 py-1">
                              <p className="text-gray-400 text-[9px] italic">Chưa có Nhóm</p>
                            </div>
                          )}
                          {aBNs.map(b => {
                            const isExpanded = expandedBanNhoms.has(b.id);
                            const chucVuOrder: Record<string, number> = { 'Trưởng Ban': 1, 'Trưởng nhóm': 2, 'Tiền trưởng nhóm': 3, 'TVV': 4 };
                            const bnTVVs = tvvStructList.filter(t => t.maBanNhom === b.maBanNhom)
                              .sort((a, b) => (chucVuOrder[a.chucVu] ?? 99) - (chucVuOrder[b.chucVu] ?? 99));
                            const tdCount = bnTVVs.filter(t => {
                              if (!t.ngayBatDau) return false;
                              const d = new Date(t.ngayBatDau);
                              return !isNaN(d.getTime()) && d.getFullYear() === new Date().getFullYear();
                            }).length;
                            return (
                              <div key={b.id}>
                                {/* Nhóm header row — click to toggle TVV */}
                                <div
                                  className={`flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer transition-all duration-200 border ${isExpanded ? 'bg-emerald-100 border-emerald-500' : 'bg-white border-gray-200 hover:bg-emerald-50/50'}`}
                                  onClick={() => {
                                    setExpandedBanNhoms(prev => {
                                      const next = new Set(prev);
                                      if (next.has(b.id)) next.delete(b.id); else next.add(b.id);
                                      return next;
                                    });
                                  }}
                                >
                                  <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                                    <ChevronDown className="w-3 h-3 text-emerald-500" />
                                  </div>
                                  <Network className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-gray-800 text-[11px] font-bold truncate">{b.tenBanNhom}</p>
                                    <p className="text-gray-400 text-[9px]">{b.maBanNhom}{b.ngayBatDau ? ` • BĐ: ${safeFormatDate(b.ngayBatDau)}` : ''}</p>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <span className="text-[9px] text-white bg-emerald-700 px-1.5 py-0.5 rounded-full whitespace-nowrap font-semibold">{bnTVVs.length} TVV</span>
                                    {tdCount > 0 && <span className="text-[9px] text-emerald-800 bg-emerald-200 px-1.5 py-0.5 rounded-full whitespace-nowrap font-semibold">{tdCount} TD</span>}
                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setNewTvv(prev => ({ ...prev, maBanNhom: b.maBanNhom })); setAddTvvOpen(true); }} className="h-4 w-4 p-0 text-emerald-400 hover:text-emerald-600" title="Thêm TVV"><Plus className="w-2 h-2" /></Button>
                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingBanNhom(b); }} className="h-4 w-4 p-0 text-gray-300 hover:text-emerald-500"><Edit2 className="w-2 h-2" /></Button>
                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteBanNhom(b.id); }} className="h-4 w-4 p-0 text-gray-300 hover:text-red-500"><Trash2 className="w-2 h-2" /></Button>
                                  </div>
                                </div>

                                {/* TVV list — animated slide-down */}
                                <div className={`overflow-hidden transition-all duration-300 ease-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                  {bnTVVs.length > 0 ? (
                                    <div className="ml-5 mt-0.5 space-y-0">
                                      {bnTVVs.map((t, idx) => (
                                        <div
                                          key={t.id}
                                          className="flex items-center gap-2 px-2.5 py-1 hover:bg-emerald-100 transition-all duration-200 rounded-sm group"
                                          style={{
                                            transitionDelay: isExpanded ? `${idx * 30}ms` : '0ms',
                                            transform: isExpanded ? 'translateY(0)' : 'translateY(-4px)',
                                            opacity: isExpanded ? 1 : 0,
                                          }}
                                        >
                                          <span className="text-gray-400 text-[9px] w-4 text-right flex-shrink-0">{idx + 1}</span>
                                          <span className="text-gray-700 text-[10px] font-medium truncate flex-1 min-w-0">{t.agentName}</span>
                                          {t.chucVu && <span className="text-emerald-700 text-[9px] flex-shrink-0 font-semibold">{t.chucVu}</span>}
                                          {t.ngayBatDau && <span className="text-gray-400 text-[9px] flex-shrink-0">{safeFormatDate(t.ngayBatDau)}</span>}
                                          <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingTvv(t); }} className="h-4 w-4 p-0 text-gray-300 hover:text-emerald-500"><Edit2 className="w-2 h-2" /></Button>
                                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteTvv(t.id); }} className="h-4 w-4 p-0 text-gray-300 hover:text-red-500"><Trash2 className="w-2 h-2" /></Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="ml-5 mt-0.5 px-3 py-2">
                                      <p className="text-gray-400 text-[10px] italic">Chưa có TVV</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
          <DialogHeader><DialogTitle className="text-emerald-400">Thêm AD</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div><Label className="text-xs text-emerald-200/70">Mã AD</Label><Input value={newAD.maAD} onChange={e => setNewAD(p => ({ ...p, maAD: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" /></div>
            <div><Label className="text-xs text-emerald-200/70">Tên AD</Label><Input value={newAD.tenAD} onChange={e => setNewAD(p => ({ ...p, tenAD: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" /></div>
            <div><Label className="text-xs text-emerald-200/70">Mã Phòng</Label><Input value={newAD.maPhong} onChange={e => setNewAD(p => ({ ...p, maPhong: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" placeholder="VD: P001" /></div>
            <div><Label className="text-xs text-emerald-200/70">Ghi chú</Label><Input value={newAD.note} onChange={e => setNewAD(p => ({ ...p, note: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" /></div>
          </div>
          <DialogFooter><Button onClick={handleAddAD} className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300">Thêm</Button></DialogFooter>
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
      case 'kehoach': return renderKeHoach();
      case 'report': return renderPolicy();
      case 'structure': return renderStructure();
    }
  };

  return (
    <div className="h-screen flex flex-col fixed inset-0 z-50 bg-[#0e0e18]/80">
      {/* Sync success indicator - top right corner */}
      {syncSuccessVisible && (
        <div className="fixed top-2 right-2 z-[999] flex items-center gap-1.5 bg-emerald-500/90 text-white px-3 py-1.5 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2 duration-300" style={{ backdropFilter: 'blur(8px)' }}>
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-bold">{syncSuccessCount} HĐ đã đồng bộ</span>
        </div>
      )}
      {/* Header */}
      <header className="border-b border-emerald-700 bg-[#0e0e18]/80 backdrop-blur-md px-2 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 flex-shrink-0">
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
            {/* Section 1: Kế hoạch Năm */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-400" /> Kế hoạch Năm
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'AFYP', key: 'nmc-target-tong-afyp', val: targetTongAFYP, fmt: (v: number) => formatCurrency(v), actual: totalRevenueAFYP, color: 'sky' },
                  { label: 'Lượt HĐ', key: 'nmc-target-luot-hd', val: targetLuotHD, fmt: (v: number) => formatNumber(v), actual: luotHoatDong, color: 'violet' },
                  { label: 'Lượt HĐ chuẩn', key: 'nmc-target-luot-hd-chuan', val: targetLuotHDChuan, fmt: (v: number) => formatNumber(v), actual: luotHDChuan, color: 'rose' },
                ].map(item => {
                  const pct = item.val > 0 ? (item.actual / item.val) * 100 : 0;
                  const colorMap: Record<string, string> = {
                    sky: 'border-sky-500/30 bg-sky-500/10',
                    violet: 'border-violet-500/30 bg-violet-500/10',
                    rose: 'border-rose-500/30 bg-rose-500/10',
                  };
                  const inputColorMap: Record<string, string> = {
                    sky: 'border-sky-500/30 focus:border-sky-400',
                    violet: 'border-violet-500/30 focus:border-violet-400',
                    rose: 'border-rose-500/30 focus:border-rose-400',
                  };
                  const pctColorMap: Record<string, string> = {
                    sky: 'text-sky-400',
                    violet: 'text-violet-400',
                    rose: 'text-rose-400',
                  };
                  return (
                    <div key={item.key} className={`rounded-lg p-3 border ${colorMap[item.color]} space-y-2`}>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-white">{item.label}</Label>
                        {item.val > 0 && (
                          <span className={`text-[10px] font-bold ${pctColorMap[item.color]}`}>{pct.toFixed(1)}%</span>
                        )}
                      </div>
                      <Input
                        type="number"
                        defaultValue={item.val || ''}
                        placeholder="Nhập kế hoạch..."
                        className={`h-9 text-sm bg-white/5 ${inputColorMap[item.color]} text-white`}
                        onBlur={(e) => { const v = parseFloat(e.target.value) || 0; saveSetting(item.key, String(v)); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { const v = parseFloat((e.target as HTMLInputElement).value) || 0; saveSetting(item.key, String(v)); } }}
                      />
                      {item.val > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px]">
                            <span className="text-white/50">Thực tế: {item.fmt(item.actual)}</span>
                            <span className="text-white/50">KH: {item.fmt(item.val)}</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Kế hoạch từng tháng */}
              <div className="border-t border-emerald-500/20 pt-3 mt-2">
                <h4 className="text-xs font-bold text-amber-300 mb-3 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Kế hoạch từng tháng
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {Array.from({length: 12}, (_, i) => {
                    const m = String(i + 1).padStart(2, '0');
                    const keys = {
                      afyp: `nmc-target-afyp-month-${m}`,
                      luotHD: `nmc-target-luot-hd-month-${m}`,
                      luotHDChuan: `nmc-target-luot-hd-chuan-month-${m}`,
                    };
                    const vals = {
                      afyp: parseFloat(onlineSettings[keys.afyp] || '0') || 0,
                      luotHD: parseFloat(onlineSettings[keys.luotHD] || '0') || 0,
                      luotHDChuan: parseFloat(onlineSettings[keys.luotHDChuan] || '0') || 0,
                    };
                    // Calculate actual AFYP for this month
                    const monthActualAFYP = yearContracts.filter(c => { const d = getDoanhSoMonth(c); return !isNaN(d.getTime()) && d.getMonth() + 1 === i + 1; }).reduce((s, c) => s + c.afyp, 0);
                    const afypPct = vals.afyp > 0 ? (monthActualAFYP / vals.afyp) * 100 : 0;
                    return (
                      <div key={m} className="bg-white/5 rounded-lg p-2.5 border border-emerald-500/20 space-y-2">
                        <p className="text-[10px] font-bold text-emerald-300">Tháng {i + 1}</p>
                        {/* AFYP with % */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-[8px] text-sky-300/70">AFYP</Label>
                            {vals.afyp > 0 && <span className="text-[8px] font-bold text-sky-400">{afypPct.toFixed(0)}%</span>}
                          </div>
                          <Input
                            type="number"
                            defaultValue={vals.afyp || ''}
                            placeholder="0"
                            className="h-7 text-[10px] bg-white/5 border-sky-500/20 text-white px-2"
                            onBlur={(e: any) => { const v = parseFloat(e.target.value) || 0; saveSetting(keys.afyp, String(v)); }}
                            onKeyDown={(e: any) => { if (e.key === 'Enter') { const v = parseFloat(e.target.value) || 0; saveSetting(keys.afyp, String(v)); } }}
                          />
                          {vals.afyp > 0 && (
                            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-1">
                              <div className={`h-full rounded-full ${afypPct >= 100 ? 'bg-emerald-400' : afypPct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${Math.min(afypPct, 100)}%` }} />
                            </div>
                          )}
                        </div>
                        {/* Lượt HĐ */}
                        <div>
                          <Label className="text-[8px] text-violet-300/70 mb-1 block">Lượt HĐ</Label>
                          <Input
                            type="number"
                            defaultValue={vals.luotHD || ''}
                            placeholder="0"
                            className="h-7 text-[10px] bg-white/5 border-violet-500/20 text-white px-2"
                            onBlur={(e: any) => { const v = parseFloat(e.target.value) || 0; saveSetting(keys.luotHD, String(v)); }}
                            onKeyDown={(e: any) => { if (e.key === 'Enter') { const v = parseFloat(e.target.value) || 0; saveSetting(keys.luotHD, String(v)); } }}
                          />
                        </div>
                        {/* Lượt HĐ chuẩn */}
                        <div>
                          <Label className="text-[8px] text-rose-300/70 mb-1 block">Lượt HĐ chuẩn</Label>
                          <Input
                            type="number"
                            defaultValue={vals.luotHDChuan || ''}
                            placeholder="0"
                            className="h-7 text-[10px] bg-white/5 border-rose-500/20 text-white px-2"
                            onBlur={(e: any) => { const v = parseFloat(e.target.value) || 0; saveSetting(keys.luotHDChuan, String(v)); }}
                            onKeyDown={(e: any) => { if (e.key === 'Enter') { const v = parseFloat(e.target.value) || 0; saveSetting(keys.luotHDChuan, String(v)); } }}
                          />
                        </div>
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
