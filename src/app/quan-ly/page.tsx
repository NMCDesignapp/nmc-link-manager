'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/back-button';
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
  Menu, ChevronLeft, UserPlus, BookOpen, Award, UserCheck, Trophy, Gift,
  Crown, Medal,
  FileDown, Star, Image as ImageIcon,
} from 'lucide-react';
import { scrapePolicyTable, downloadPolicyExcel, type ContractDetailRow } from './policy-excel-export';
import { downloadVinhDanhExcel } from './vinh-danh-excel-export';
import { useAppData } from '@/lib/app-data-context';

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

// DS TTN Tuyển Ngang — Trưởng Tổ Nhóm tuyển ngang cấp
interface TuyenNgangItem {
  id: string; nhom: string; agentCode: string; agentName: string;
  ngayBatDau: string | null; ngayHieuLuc: string | null;
  maNguoiTuyenDung: string; tenNguoiTuyenDung: string;
}

// DS Thành viên CLB — dùng localStorage (không cần backend)
interface CLBMemberItem {
  id: string; ad: string; nhom: string; agentCode: string; agentName: string;
  chucVu: string; note: string;
}

// DS Chờ xét gia nhập — dùng localStorage
interface PendingMemberItem {
  id: string; ad: string; nhom: string; agentCode: string; agentName: string;
  chucVu: string; ipT2: number; ipT1: number; ipT0: number; note: string;
}

interface PhongItem { id: string; maPhong: string; tenPhong: string; note: string; }
interface ADItem { id: string; maAD: string; tenAD: string; maPhong: string; note: string; }
interface BanNhomItem { id: string; maBanNhom: string; tenBanNhom: string; maAD: string; ngayBatDau: string | null; note: string; }
interface TVVStructItem { id: string; agentCode: string; agentName: string; maBanNhom: string; chucVu: string; ngayBatDau: string | null; maTVVTuyendung: string; note: string; }

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
type SheetKey = 'overview' | 'leaders' | 'recruiters' | 'tuyen-ngang' | 'revenue' | 'report' | 'structure' | 'kehoach' | 'saoviet' | 'clb-saoviet' | 'vinh-danh';
type RevenueSubKey = 'all' | '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12';
// Sub-sheets within "Cấu trúc" section: leaders (DS TB/TN), recruiters (DS TTN), tuyen-ngang (DS TTN Tuyển Ngang)
type StructureSubKey = 'leaders' | 'recruiters' | 'tuyen-ngang' | 'tvv' | 'clb-members' | 'pending-members';
// Sub-sheets within "Tôn vinh" section: 4 bảng Top 5 trong 6 tháng đầu năm
type VinhDanhSubKey = 'top5-tvv' | 'top5-tvvm' | 'top5-nhom' | 'nhom-hoan-thanh-kh';

// ── Design system: Tỷ lệ thưởng (used by Quý TVV, NS TVV, and future policy tables) ──
// Gradient yellow/cream background (light → warmer) for tier header cells and body cells
// Per user spec: lightyellow, lemonchiffon, lightgoldenrodyellow, papayawhip, moccasin, + peachpuff
const TIER_GRADIENT_BG = ['#FFFFE0', '#FFFACD', '#FAFAD2', '#FFEFD5', '#FFE4B5', '#FFDAB9'];
// Strong red for the percentage NUMBER itself — high contrast on yellow, draws the eye
const TIER_RATE_COLOR = '#B91C1C'; // red-700
// Body tier cell text color (ĐẠT/deficit) — dark red for unachieved
const TIER_BODY_TEXT_COLOR = '#9F1239'; // rose-800
// Border color for tier cells — soft warm beige
const TIER_BORDER = '#FFE4B5'; // moccasin
// Header tier label background (the "≥24, ≥60..." row) — solid warm brown for contrast
const TIER_HEADER_BG = '#B45309'; // amber-700
// Top "TỶ LỆ THƯỞNG" merged header background — darker brown
const TIER_GROUP_HEADER_BG = '#92400E'; // amber-800

// ── Special Phòng config ──
// PA và Banca là 2 phòng đặc biệt:
// - Không có AD (phòng xuống trực tiếp TVV)
// - TVV trong phòng Banca KHÔNG được tính trong các chương trình thi đua / chính sách thưởng
// - Khi tính doanh số, gom PA + Banca thành 1 mục "Banca - PA" (chỉ hiển thị, không kế hoạch)
//
// MÃ NHÓM THỰC TẾ trên app:
//   - Nhóm PA    = 'U104101014'
//   - Nhóm Banca = 'A473DSO000' (DSO = Digital Sales Office / Banca)
// Code phải nhận diện cả 2 dạng: mã nhóm thực tế (U104101014 / A473DSO000) VÀ alias cũ ('PA' / 'Banca')
// để tương thích với dữ liệu cũ còn dùng alias.
const MA_NHOM_PA = 'U104101014';
const MA_NHOM_BANCA = 'A473DSO000';
const ALIAS_PA = new Set(['PA', MA_NHOM_PA]);
const ALIAS_BANCA = new Set(['Banca', MA_NHOM_BANCA, 'DSO']); // DSO thường là alias của Banca

// Phòng không có AD layer: PA + Banca (nhận diện qua mã phòng hoặc mã nhóm)
const isPaOrBancaCode = (code: string): boolean => {
  if (!code) return false;
  const c = String(code).trim();
  if (!c) return false;
  if (ALIAS_PA.has(c) || ALIAS_BANCA.has(c)) return true;
  const lower = c.toLowerCase();
  return lower === 'pa' || lower === 'banca' || lower === 'dso'
    || c === MA_NHOM_PA || c === MA_NHOM_BANCA;
};
const isBancaCode = (code: string): boolean => {
  if (!code) return false;
  const c = String(code).trim();
  if (!c) return false;
  if (ALIAS_BANCA.has(c)) return true;
  const lower = c.toLowerCase();
  return lower === 'banca' || lower === 'dso' || c === MA_NHOM_BANCA;
};
const isPaCode = (code: string): boolean => {
  if (!code) return false;
  const c = String(code).trim();
  if (!c) return false;
  if (ALIAS_PA.has(c)) return true;
  const lower = c.toLowerCase();
  return lower === 'pa' || c === MA_NHOM_PA;
};

// Helper: so khớp 2 mã nhóm — chấp nhận alias (PA==U104101014, Banca==A473DSO000)
// Dùng cho mọi chỗ filter TVV theo maBanNhom (tránh mismatch alias cũ vs mã mới)
const matchMaBanNhom = (codeA: string, codeB: string): boolean => {
  const a = String(codeA || '').trim();
  const b = String(codeB || '').trim();
  if (!a || !b) return false;
  if (a === b) return true;
  // Cả 2 là alias của PA?
  if (ALIAS_PA.has(a) && ALIAS_PA.has(b)) return true;
  // Cả 2 là alias của Banca?
  if (ALIAS_BANCA.has(a) && ALIAS_BANCA.has(b)) return true;
  // Case-insensitive fallback
  return a.toLowerCase() === b.toLowerCase();
};
const SPECIAL_PHONG_NO_AD = (maPhong: string): boolean => isPaOrBancaCode(maPhong);
const PHONG_EXCLUDED_FROM_REWARDS = (maPhong: string): boolean => isBancaCode(maPhong);
// Sort order: các phòng đặc biệt luôn xuống cuối
const PHONG_SORT_PRIORITY = (maPhong: string): number => SPECIAL_PHONG_NO_AD(maPhong) ? 1 : 0;

// Helper: kiểm tra TVV có thuộc phòng bị loại trừ khỏi thưởng (Banca) không
// Cần truyền: agentCode của TVV + toàn bộ danh sách BanNhom, AD, Phong
// Logic: TVV → maBanNhom → BanNhom.maAD → AD.maPhong → Phong.maPhong
// Với PA/Banca (không có AD): TVV có thể thuộc BanNhom có maBanNhom hoặc maAD = 'PA'/'Banca'/'U104101014'/'A473DSO000'
function isTVVExcludedFromRewards(
  agentCode: string,
  maBanNhom: string,
  banNhomList: Array<{ maBanNhom: string; maAD: string }>,
  adList: Array<{ maAD: string; maPhong: string }>,
): boolean {
  if (!agentCode && !maBanNhom) return false;
  // Trường hợp PA/Banca không có AD — TVV thuộc BanNhom có maBanNhom hoặc maAD = 'Banca'/'PA'/'A473DSO000'/'U104101014'
  if (isBancaCode(maBanNhom)) return true;
  // Tìm BanNhom record
  const bn = banNhomList.find(b => b.maBanNhom === maBanNhom);
  if (bn) {
    // Nếu maAD trực tiếp là mã phòng bị loại (Banca)
    if (isBancaCode(bn.maAD)) return true;
    // Nếu có AD thật → tìm AD.maPhong
    const ad = adList.find(a => a.maAD === bn.maAD);
    if (ad && isBancaCode(ad.maPhong)) return true;
  }
  return false;
}

// Helper: kiểm tra chức vụ TTN (Tiền Trưởng Nhóm)
// Position có thể là "Tiền trưởng nhóm" / "Trưởng tổ nhóm" / "TTN" (viết tắt)
// Dùng cho CS Đồng Hành — dành RIÊNG cho TTN
function isTTNPosition(position: string | null | undefined): boolean {
  const pos = (position || '').toLowerCase().trim();
  if (!pos) return false;
  return pos.includes('tiền trưởng nhóm')
      || pos.includes('trưởng tổ nhóm')
      || pos === 'ttn'
      || pos.includes('ttn ')
      || pos.includes(' ttn');
}

// Helper: kiểm tra chức vụ TB/TN (Trưởng Bộ / Trưởng Nhóm)
// Dùng cho CS PTKD-TN, Quý-TN, Tuyển Luyện — dành cho TB/TN (KHÔNG gồm TTN)
// Nguyên tắc: leaders là DS TB/TN; nếu position có dấu hiệu TTN → loại ra (để cho CS Đồng Hành)
function isTBorTNPosition(position: string | null | undefined): boolean {
  return !isTTNPosition(position);
}

// Helper: kiểm tra chức vụ TB hoặc TN cho CLB Sao Việt (TN TUYỂN DỤNG / TN KTM)
// User spec: chỉ những người có chức vụ "Trưởng ban (TB)" hoặc "Trưởng nhóm (TN)" mới vào 2 chương trình này
// TTN (Tiền trưởng nhóm) KHÔNG được tính
function isCLBMemberTBorTN(position: string | null | undefined): boolean {
  const p = (position || '').toLowerCase().trim();
  if (!p) return false;
  // Loại TTN trước
  if (p.includes('tiền trưởng nhóm') || p.includes('trưởng tổ nhóm')) return false;
  if (p === 'ttn' || p.includes('ttn ') || p.includes(' ttn')) return false;
  // Match text
  if (p.includes('trưởng ban') || p.includes('trưởng nhóm')) return true;
  // Match token TB / TN (chia theo whitespace, dấu câu)
  const tokens = p.split(/[\s,;/|\\-]+/).filter(Boolean);
  return tokens.includes('tb') || tokens.includes('tn');
}

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
  { key: 'revenue', label: 'Doanh thu', icon: DollarSign, synced: false, hasSub: true },
  { key: 'kehoach', label: 'Kế hoạch', icon: Target, synced: false },
  { key: 'report', label: 'Chính sách đại lý', icon: BookOpen, synced: false, hasSub: true },
  { key: 'structure', label: 'Cấu trúc', icon: Network, synced: false, hasSub: true },
];

// Sub-items for "Tôn vinh" — 4 bảng Top 5 trong 6 tháng đầu năm (H1)
//   1. top5-tvv:        Top 5 TVV có tổng IP cao nhất H1
//   2. top5-tvvm:       Top 5 TVVm (TVV mới) có tổng IP cao nhất H1
//                      (TVVm đã lọt Top 5 ở mục 1 thì chỉ hiển thị ở 1 chỗ — lấy hạng cao hơn)
//   3. top5-nhom:       Top 5 Nhóm có tổng IP cao nhất H1
//   4. nhom-hoan-thanh-kh: Các nhóm KD hoàn thành KH 6 tháng (theo AFYP)
const VINH_DANH_SUBS: { key: VinhDanhSubKey; label: string; icon: React.ElementType }[] = [
  { key: 'top5-tvv',         label: 'Top 5 TVV (IP H1)',          icon: Trophy },
  { key: 'top5-tvvm',        label: 'Top 5 TVVm (IP H1)',         icon: Award },
  { key: 'top5-nhom',        label: 'Top 5 Nhóm (IP H1)',         icon: Crown },
  { key: 'nhom-hoan-thanh-kh', label: 'Nhóm hoàn thành KH H1',    icon: Medal },
];

// Sub-items for "Cấu trúc" — DS TVV (tổng), DS TB/TN, DS TTN, DS TTN Tuyển Ngang
// NGUYÊN TẮC PHÂN BỔ ĐỐI TƯỢNG (mỗi CS là 1 bộ RIÊNG, cố định — không suy luận chéo):
//   - CS cá nhân TVV (TVVm, NS-TVV, Quý-TVV)            → DS Tổng TVV (tvvStructList)
//   - CS TB/TN (PTKD-TN, Quý-TN, Tuyển Luyện)            → DS TB/TN (leaders, loại TTN)
//   - CS TTN (Đồng Hành)                                  → DS TTN (recruiters)
//   - CS TTN Tuyển ngang                                  → DS TTN Tuyển Ngang
const STRUCTURE_SUBS: { key: StructureSubKey; label: string; icon: React.ElementType }[] = [
  { key: 'tvv', label: 'DS TVV', icon: Users },
  { key: 'leaders', label: 'DS TB/TN', icon: Users },
  { key: 'recruiters', label: 'DS TTN', icon: UserCircle },
  { key: 'tuyen-ngang', label: 'DS TTN Tuyển Ngang', icon: Merge },
  { key: 'clb-members', label: 'DS Thành viên CLB', icon: UserCheck },
  { key: 'pending-members', label: 'DS Chờ xét gia nhập', icon: UserPlus },
];

// Mobile menu button colors (solid) — only top-level sheets need a color
const SHEET_MOBILE_COLORS: Partial<Record<SheetKey, string>> = {
  overview: '#059669',
  revenue: '#0891B2',
  kehoach: '#DC2626',
  report: '#2563EB',
  structure: '#0D9488',
  saoviet: '#7C3AED',
  'clb-saoviet': '#1E3A8A', // navy-900 — distinguish from saoviet (violet)
  'vinh-danh': '#B45309',    // amber-700 — màu vàng đồng cho Tôn vinh
};

// Templates
const TEMPLATES: Record<string, { headers: string[]; sampleData: Record<string, string>[] }> = {
  leaders: {
    headers: ['Mã số', 'Họ tên', 'Chức vụ', 'Ban', 'Nhóm', 'Mã nhóm', 'Tiền/tháng', 'SĐT', 'Email', 'Ngày bắt đầu', 'Ghi chú'],
    sampleData: [
      { 'Mã số': 'D104132784', 'Họ tên': 'Nguyễn Văn A', 'Chức vụ': 'Trưởng nhóm', 'Ban': 'Hiệp Tiến', 'Nhóm': 'Nhiệt An', 'Mã nhóm': 'U1041A3L6E', 'Tiền/tháng': '5000000', 'SĐT': '0901234567', 'Email': 'a@email.com', 'Ngày bắt đầu': '01/01/2026', 'Ghi chú': '' },
      { 'Mã số': 'D104132785', 'Họ tên': 'Trần Thị B', 'Chức vụ': 'Trưởng ban', 'Ban': 'Hiệp Tiến', 'Nhóm': 'Hùng Cường', 'Mã nhóm': 'U1041A3L6F', 'Tiền/tháng': '7000000', 'SĐT': '0907654321', 'Email': 'b@email.com', 'Ngày bắt đầu': '15/02/2026', 'Ghi chú': '' },
    ],
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
    sampleData: [
      { 'Mã số': 'D104102154', 'Họ tên': 'Trần Thị B', 'Chức vụ': 'Trưởng nhóm', 'Nhóm': 'Nhiệt An', 'Ngày bắt đầu': '01/01/2026' },
      { 'Mã số': 'D104102155', 'Họ tên': 'Lê Văn C', 'Chức vụ': 'Trưởng ban', 'Nhóm': 'Hùng Cường', 'Ngày bắt đầu': '15/02/2026' },
    ],
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
  // QUAN TRỌNG: cột 'Mã TVV TD' phải khớp CHÍNH XÁC với getVal() trong /api/structure/tvv/route.ts
  // API chấp nhận: 'maTVVTuyendung' | 'Mã TVV tuyển dụng' | 'Mã TVV TD' (case-sensitive)
  'structure-tvv': {
    headers: ['Mã TVV', 'Tên TVV', 'Mã Ban/Nhóm', 'Chức vụ', 'Ngày bắt đầu làm việc', 'Mã TVV TD', 'Ghi chú'],
    sampleData: [
      { 'Mã TVV': 'D104132784', 'Tên TVV': 'Nguyễn Văn A', 'Mã Ban/Nhóm': 'U104102122', 'Chức vụ': 'Trưởng nhóm', 'Ngày bắt đầu làm việc': '01/01/2026', 'Mã TVV TD': 'D104102154', 'Ghi chú': '' },
      { 'Mã TVV': 'D104132785', 'Tên TVV': 'Trần Thị B', 'Mã Ban/Nhóm': 'U104102122', 'Chức vụ': 'TVV', 'Ngày bắt đầu làm việc': '15/02/2026', 'Mã TVV TD': 'D104132784', 'Ghi chú': '' },
    ],
  },
  'tuyen-ngang': {
    headers: ['STT', 'NHÓM', 'MÃ TVV', 'HỌ TÊN', 'Ngày bắt đầu làm việc', 'Ngày hiệu lực chức vụ', 'MÃ NGƯỜI TUYỂN DỤNG', 'TÊN NGƯỜI TUYỂN DỤNG'],
    sampleData: [
      { 'STT': '1', 'NHÓM': 'Nhóm Hiệp Tiến', 'MÃ TVV': 'D104132784', 'HỌ TÊN': 'Nguyễn Văn A', 'Ngày bắt đầu làm việc': '01/01/2026', 'Ngày hiệu lực chức vụ': '15/01/2026', 'MÃ NGƯỜI TUYỂN DỤNG': 'D104102154', 'TÊN NGƯỜI TUYỂN DỤNG': 'Trần Thị B' },
      { 'STT': '2', 'NHÓM': 'Nhóm Nhiệt An', 'MÃ TVV': 'D104132785', 'HỌ TÊN': 'Lê Văn C', 'Ngày bắt đầu làm việc': '15/02/2026', 'Ngày hiệu lực chức vụ': '01/03/2026', 'MÃ NGƯỜI TUYỂN DỤNG': 'D104102154', 'TÊN NGƯỜI TUYỂN DỤNG': 'Trần Thị B' },
    ],
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
// Trả về Invalid Date nếu cả 2 đều trống (các nơi gọi dùng !isNaN(d.getTime()) để filter)
function getDoanhSoMonth(c: { issueDate: string | null; effectiveDate: string | null }): Date {
  const issueD = c.issueDate ? new Date(c.issueDate) : null;
  if (issueD && !isNaN(issueD.getTime())) return issueD;
  if (c.effectiveDate) {
    const effD = new Date(c.effectiveDate);
    if (!isNaN(effD.getTime())) return effD;
  }
  return new Date(NaN);
}

// Helper: resolve NHÓM name for a TVV/TTN/TB-TN.
//
// NGUYÊN TẮC (theo user):
//   - Nguồn tên nhóm = DS TB/TN (leaders.nhom field), KHÔNG dùng banNhomList
//     vì DS Nhóm có thể có tenBanNhom chứa mã (data lỗi).
//   - Chỉ hiển thị nhóm nếu tên đó CÓ trong DS TB/TN, HOẶC là nhóm PA (với điều kiện allowPA).
//   - Mã nhóm KHÔNG hiển thị, chỉ dùng để tính.
//   - Trống nếu không resolve được → trả ''.
//
// Lookup strategy (theo thứ tự):
//   1. Nếu agentCode là leader → dùng leader.nhom của chính họ (nếu là tên, không phải mã)
//   2. Nếu có maBanNhom → tìm leader có maNhom trùng → dùng leader.nhom
//   3. Nếu có candidateNhomName (vd TTN.nhom) → validate tên đó có trong DS TB/TN không
//   4. PA special case: nếu mã là PA và options.allowPA=true → trả 'PA'
//
// options:
//   - allowPA: true cho chương trình TVV/TTN, false cho chương trình dành cho nhóm (TB/TN)
//   - candidateNhomName: tên nhóm ứng viên (vd từ TTN.nhom) — sẽ validate trong DS TB/TN
function resolveNhomName(
  agentCode: string,
  maBanNhom: string,
  _banNhomList: Array<{ maBanNhom: string; tenBanNhom: string }>,
  _contracts: Array<{ agentCode: string; nhom: string }>,
  leaders: Array<{ agentCode: string; nhom: string; maNhom?: string }>,
  options: { allowPA?: boolean; candidateNhomName?: string } = {},
): string {
  // Heuristic: phân biệt TÊN nhóm vs MÃ nhóm
  // Trả TRUE nếu s trông giống MÃ (loại bỏ, không hiển thị):
  //   - All-UPPERCASE, không dấu tiếng Việt, không space, không chữ thường
  //     (vd PA, DSO, U104106078, A473DSO000, KD1)
  // Trả FALSE nếu s là TÊN nhóm hợp lệ:
  //   - Có dấu tiếng Việt (vd Chợ Mới 1, An Phú 2, São Việt)
  //   - Có space (vd "KD 1", "Group A")
  //   - Có chữ thường (vd "kd1", "Group")
  const isLikelyNhomCode = (s: string): boolean => {
    const t = (s || '').trim();
    if (!t) return false;
    if (/[\u00C0-\u024F\u1E00-\u1EFF]/.test(t)) return false;  // Có dấu TV → TÊN
    if (/\s/.test(t)) return false;                            // Có space → TÊN
    if (/[a-z]/.test(t)) return false;                         // Có chữ thường → TÊN
    return true;                                                // All-UPPER không dấu không space → MÃ
  };

  // 1. Nếu agentCode là leader → dùng leader.nhom của chính họ
  if (agentCode) {
    const self = leaders.find(l => l.agentCode === agentCode);
    if (self?.nhom && !isLikelyNhomCode(self.nhom)) {
      return self.nhom;
    }
  }

  // 2. Nếu có maBanNhom → tìm leader có maNhom trùng
  if (maBanNhom && maBanNhom.trim()) {
    const code = maBanNhom.trim().toLowerCase();
    const matchedLeader = leaders.find(l =>
      l.maNhom && l.maNhom.trim().toLowerCase() === code &&
      l.nhom && !isLikelyNhomCode(l.nhom)
    );
    if (matchedLeader) return matchedLeader.nhom;
  }

  // 3. Nếu có candidateNhomName (vd TTN.nhom) → validate trong DS TB/TN
  if (options.candidateNhomName && options.candidateNhomName.trim()) {
    const candidate = options.candidateNhomName.trim();
    if (!isLikelyNhomCode(candidate)) {
      // Check if any leader has the same nhom name
      const leaderWithSameName = leaders.find(l =>
        (l.nhom || '').trim() === candidate
      );
      if (leaderWithSameName) return candidate;
    }
  }

  // 4. PA special case (chỉ cho chương trình TVV/TTN — allowPA=true)
  if (options.allowPA) {
    if (isPaCode(maBanNhom) || isPaCode(options.candidateNhomName || '')) {
      return 'PA';
    }
  }

  return '';
}

// Helper: resolve Người Tuyển Dụng name for a TVV.
// NGUYÊN TẮC (theo user):
//   Bước 1+2: Lấy mã số TVV (tvvAgentCode) → lookup trong DS Tổng TVV
//            → ra mã đại lý tuyển dụng (maTVVTuyendung) — ẩn mã, KHÔNG hiển thị
//   Bước 3:   Dùng mã NTD vừa tìm được → lookup lại trong DS Tổng TVV
//            → ra agentName (tên người TD) — hiển thị
//   Không tìm thấy ở bước nào → TRỐNG (không fallback, không trả mã)
//   Lookup ROBUST: trim + case-insensitive
function resolveNguoiTD(
  tvvAgentCode: string | null | undefined,
  tvvStructList: Array<{ agentCode: string; agentName: string; maTVVTuyendung?: string | null }>,
): string {
  if (!tvvAgentCode || !tvvAgentCode.trim()) return '';
  const tvvCode = tvvAgentCode.trim().toLowerCase();
  // Bước 1+2: tìm dòng TVV trong DS TVV → lấy mã NTD
  const tvvRow = tvvStructList.find(t => (t.agentCode || '').trim().toLowerCase() === tvvCode);
  if (!tvvRow) {
    if (typeof window !== 'undefined' && (window as any).__debugNTD) {
      console.warn('[resolveNguoiTD] Bước 1: Không tìm thấy TVV trong DS TVV:', tvvAgentCode);
    }
    return '';
  }
  const maNTD = (tvvRow.maTVVTuyendung || '').trim();
  if (!maNTD) {
    if (typeof window !== 'undefined' && (window as any).__debugNTD) {
      console.warn('[resolveNguoiTD] Bước 2: TVV có mặt trong DS nhưng maTVVTuyendung trống:', tvvAgentCode);
    }
    return '';
  }
  // Bước 3: tìm dòng NTD trong DS TVV → lấy tên
  const ntdCode = maNTD.toLowerCase();
  const ntdRow = tvvStructList.find(t => (t.agentCode || '').trim().toLowerCase() === ntdCode);
  if (!ntdRow) {
    if (typeof window !== 'undefined' && (window as any).__debugNTD) {
      console.warn('[resolveNguoiTD] Bước 3: Có mã NTD nhưng không tìm trong DS TVV:', maNTD, '(của TVV:', tvvAgentCode, ')');
    }
    return '';
  }
  return ntdRow.agentName || '';
}

function formatCurrency(n: number): string {
  // Hiển thị đầy đủ đơn vị "đ" (không dùng "₫") — theo yêu cầu user
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' đ';
}
function formatNumber(n: number): string {
  // Luôn làm tròn thành số nguyên (theo yêu cầu: bảng chính sách không hiển thị thập phân)
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0, roundingMode: 'halfEven' }).format(Math.round(n));
}

// CheckBadge — dấu tích trong vòng tròn xanh lá, chữ ✓ trắng ở giữa
// Dùng chung cho 3 trang: Chính sách, Sao Việt, CLB Sao Việt
// Nguyên tắc (theo yêu cầu user):
//   - Hình tròn, nền xanh lá (#22C55E), dấu tích trắng ở giữa
//   - Kích thước cân đối (mặc định 16px) — không làm thay đổi chiều cao dòng
//   - Dùng inline-flex + flexShrink:0 để không bị co ép khi trong cell hẹp
//   - fontSize bằng ~62% size để ✓ cân đối trong vòng tròn
export function CheckBadge({ size = 16 }: { size?: number }) {
  const fontSize = Math.max(9, Math.round(size * 0.62));
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: '#22C55E',
        color: '#FFFFFF',
        fontSize: `${fontSize}px`,
        fontWeight: 900,
        lineHeight: 1,
        flexShrink: 0,
        boxShadow: '0 1px 2px rgba(34,197,94,0.35)',
      }}
      aria-label="Đạt"
    >
      ✓
    </span>
  );
}

// Render nội dung ô TIỀN THƯỞNG / TỔNG TIỀN THƯỞNG — đồng nhất tất cả chính sách
// Thiết kế: nền trắng (cell), chữ XANH LÁ in đậm to hơn 1 chút (13px), icon 💰 trong chip vàng nhạt (chỉ icon có nền vàng, không tô hết ô)
export function renderThuongCellContent(amount: number, fontSize: string = '13px', fontWeight: number = 800) {
  if (!amount || amount <= 0) {
    return <span style={{ color: '#9CA3AF', fontWeight: 400 }}>—</span>;
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#047857', fontSize, fontWeight, whiteSpace: 'nowrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', backgroundColor: '#FEF3C7', borderRadius: '3px', fontSize: '10px', lineHeight: 1, flexShrink: 0 }}>💰</span>
      {formatCurrency(amount)}
    </span>
  );
}

// Smart currency formatting — LUÔN hiển thị đầy đủ đơn vị đ (đồng) trên mọi viewport
// Theo yêu cầu user: hiển thị rút gọn "X tỷ" khó đọc, không thấy giá trị chính xác.
function formatSmartCurrency(amount: number): string {
  if (amount === 0) return '0 đ';
  return formatCurrency(amount);
}

// Compact currency for KPI cards - always shows trđ/tỷ/ngàn on ALL screen sizes
// trđ always shows 3 decimal places with Vietnamese comma separator (e.g. 1,350 trđ)
function formatKpiCurrency(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} tỷ`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} trđ`;
  if (amount >= 1_000) return `${(amount / 1_000).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} ngàn`;
  if (amount === 0) return '0 trđ';
  return `${amount.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} đ`;
}

// Format tổng tiền thưởng cho ô tổng hợp trong chính sách đại lý
// - Mobile: giá trị theo trđ (KHÔNG hiển thị chữ "trđ"), số nhỏ vừa ô, không tràn
//   Vd: 15.500.000 → "15,5"; 350.000.000 → "350"; 1.500.000.000 → "1.500"
// - Desktop: full format có dấu chấm hàng nghìn (vd "100.000.000"), không kèm đơn vị
function formatPolicyAmountForBox(amount: number): string {
  if (!amount || amount === 0) return '—';
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  if (isMobile) {
    const trVal = amount / 1_000_000;
    if (trVal >= 1000) return Math.round(trVal).toLocaleString('vi-VN');
    if (trVal >= 100) return Math.round(trVal).toString();
    if (trVal >= 10) return Math.round(trVal).toString();
    return Math.round(trVal).toString();
  }
  return Math.round(amount).toLocaleString('vi-VN');
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
  if (!val) return '';
  const d = new Date(String(val));
  if (isNaN(d.getTime())) return String(val || '');
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

// ==================== IMAGE COMPRESSION HELPER ====================
// Nén ảnh trước khi lưu: resize về max 1200px, JPEG quality 0.82
// Tránh data URL quá lớn làm chậm load settings JSON
async function compressImage(file: File, maxSize = 1200, quality = 0.82): Promise<string> {
  // Nếu là PNG/WebP và nhỏ (<300KB) → giữ nguyên
  if (file.size < 300 * 1024 && (file.type === 'image/png' || file.type === 'image/webp')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Không đọc được file'));
      reader.readAsDataURL(file);
    });
  }
  // Các trường hợp khác: vẽ lên canvas, resize, xuất JPEG
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Không đọc được file'));
    reader.readAsDataURL(file);
  });
  const img = new Image();
  img.src = dataUrl;
  await new Promise((resolve, reject) => {
    img.onload = () => resolve(null);
    img.onerror = () => reject(new Error('Không load được ảnh'));
  });
  let { width, height } = img;
  if (width > maxSize || height > maxSize) {
    if (width >= height) {
      height = Math.round(height * maxSize / width);
      width = maxSize;
    } else {
      width = Math.round(width * maxSize / height);
      height = maxSize;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl; // fallback
  ctx.drawImage(img, 0, 0, width, height);
  // PNG with transparency → giữ PNG; else JPEG
  if (file.type === 'image/png' && /-transparent/i.test(file.type) === false) {
    // Try JPEG first (smaller); if image has alpha, fallback PNG
    return canvas.toDataURL('image/jpeg', quality);
  }
  return canvas.toDataURL('image/jpeg', quality);
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
      <PopoverContent className="bg-[#1a2332]/95 backdrop-blur-xl border-emerald-500/30 w-80 p-3" align="end" sideOffset={4}>
        <div className="space-y-1">
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
    if (Math.abs(val) >= 1_000_000_000) return `${Math.round(val / 1_000_000_000)} tỷ`;
    if (Math.abs(val) >= 1_000_000) return `${Math.round(val / 1_000_000)} triệu`;
    if (Math.abs(val) >= 1_000) return formatNumber(Math.round(val));
    return Math.round(val).toString();
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
                      <span className={`font-bold ${pct && pct >= 100 ? 'text-emerald-300' : pct && pct >= 70 ? 'text-amber-300' : 'text-rose-300'}`}>{Math.round(pct ?? 0)}%</span>
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
        <PopoverContent className="bg-[#1a2332]/95 backdrop-blur-xl border-emerald-500/30 w-96 p-3 max-h-[500px] overflow-y-auto" align="start" sideOffset={4}>
          <div className="space-y-1">
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
      <div className="flex-1 overflow-auto border border-gray-600 bg-[#1a2332]/80">
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
                        className={`border border-gray-600 px-1 py-0 text-[11px] cursor-cell min-w-[80px] bg-[#1a2332]/40 ${
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
                            className="w-full h-full px-0 py-0 text-[11px] bg-[#1a2332] text-white border-none outline-none"
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

// ============= TÔN VINH — Reusable Table Component =============
// Bảng Top 5 dùng chung cho 4 mục Tôn vinh.
// - Tiêu đề gradient xanh lục (đồng bộ với Chính sách), body tối
// - Hạng 1-3 có huy hiệu Vàng/Bạc/Đồng
// - Cell IP/AFYP/KH format số + align phải
interface VinhDanhColumn {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'right' | 'center';
}
interface VinhDanhRow {
  rank: number;
  [key: string]: any;
}
function VinhDanhTable({
  title,
  subtitle,
  columns,
  rows,
  rankColors,
  emptyText,
}: {
  title: string;
  subtitle?: string;
  columns: VinhDanhColumn[];
  rows: VinhDanhRow[];
  rankColors: string[]; // gold/silver/bronze colors for ranks 1, 2, 3 (empty = no badge)
  emptyText: string;
}) {
  const fmtNum = (n: number) => {
    if (typeof n !== 'number' || isNaN(n)) return '—';
    return n.toLocaleString('vi-VN');
  };
  const fmtPct = (n: number) => {
    if (typeof n !== 'number' || isNaN(n)) return '—';
    return `${n.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  };
  const renderCell = (col: VinhDanhColumn, row: VinhDanhRow) => {
    const v = row[col.key];
    if (col.key === 'rank') {
      const color = rankColors[row.rank - 1];
      if (color) {
        return (
          <span
            className="inline-flex items-center justify-center w-7 h-7 rounded-full font-extrabold text-[11px]"
            style={{
              background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
              color: '#1a2332',
              boxShadow: `0 0 8px ${color}88`,
              border: `1.5px solid ${color}`,
            }}
          >
            {row.rank}
          </span>
        );
      }
      return <span className="font-bold text-emerald-200/70">{row.rank}</span>;
    }
    if (col.key === 'ip' || col.key === 'afypH1' || col.key === 'khH1') {
      return <span className="font-bold text-emerald-300">{fmtNum(v)}</span>;
    }
    if (col.key === 'pct') {
      const isOver100 = typeof v === 'number' && v >= 100;
      return <span className={`font-bold ${isOver100 ? 'text-emerald-300' : 'text-amber-300'}`}>{fmtPct(v)}</span>;
    }
    return <span>{v ?? '—'}</span>;
  };
  return (
    <div className="bg-[#1a2332]/80 border border-emerald-500/30 rounded-lg overflow-hidden">
      {/* Title bar */}
      <div
        className="px-3 py-2"
        style={{
          background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
          borderBottom: '2px solid #34d399',
        }}
      >
        <h3 className="text-sm font-extrabold text-emerald-100 tracking-wide uppercase">{title}</h3>
        {subtitle && <p className="text-[10px] text-emerald-200/80 mt-0.5 italic">{subtitle}</p>}
      </div>
      {/* Table */}
      {rows.length === 0 ? (
        <div className="py-8 text-center text-emerald-200/50 text-xs italic">{emptyText}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-emerald-500/10 border-b border-emerald-500/20">
                {columns.map(col => (
                  <th
                    key={col.key}
                    className="px-2.5 py-1.5 text-emerald-300 font-bold uppercase tracking-wide text-[10px] whitespace-nowrap"
                    style={{
                      textAlign: col.align || 'left',
                      width: col.width,
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-emerald-500/10 hover:bg-emerald-500/5 transition-colors"
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className="px-2.5 py-2 text-emerald-100/90"
                      style={{ textAlign: col.align || 'left' }}
                    >
                      {renderCell(col, row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==================== MAIN PAGE ====================
export default function QuanLyPage() {
  const router = useRouter();
  // Lazy init from URL ?sheet=xxx — tránh render 'overview' trước rồi mới switch (causing flash)
  const [activeSheet, setActiveSheet] = useState<SheetKey>(() => {
    if (typeof window === 'undefined') return 'overview';
    try {
      const params = new URLSearchParams(window.location.search);
      const sheetParam = params.get('sheet');
      const validSheets: SheetKey[] = ['overview', 'leaders', 'recruiters', 'tuyen-ngang', 'revenue', 'report', 'structure', 'kehoach', 'saoviet', 'clb-saoviet', 'vinh-danh'];
      if (sheetParam && validSheets.includes(sheetParam as SheetKey)) {
        // Clear ?sheet= from URL so internal nav doesn't keep re-applying it
        const url = new URL(window.location.href);
        url.searchParams.delete('sheet');
        window.history.replaceState({}, '', url.toString());
        return sheetParam as SheetKey;
      }
    } catch {}
    return 'overview';
  });
  const [revenueSub, setRevenueSub] = useState<RevenueSubKey>('all');
  const [revenueNhomFilter, setRevenueNhomFilter] = useState<string>('');
  const [revenueExpanded, setRevenueExpanded] = useState(false);
  const [policyExpanded, setPolicyExpanded] = useState(false);
  const [structureExpanded, setStructureExpanded] = useState(false);
  const [structureSub, setStructureSub] = useState<StructureSubKey>('leaders');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuPopup, setMobileMenuPopup] = useState<SheetKey | null>(null); // mobile: which sheet popup is open
  const [mobilePolicyPopupOpen, setMobilePolicyPopupOpen] = useState(false); // mobile: policy sub-item popup
  const [mobileRevenuePopupOpen, setMobileRevenuePopupOpen] = useState(false); // mobile: revenue month popup
  const [overviewPeriod, setOverviewPeriod] = useState<string>('year');
  // ===== MOUNTED GUARD =====
  // Tránh flash bug: SSR render 'overview' trước rồi client hydrate mới switch sang sheet từ URL.
  // Khi chưa mounted → render skeleton loading, sau khi mounted mới render nội dung đúng.
  const [mounted, setMounted] = useState(false);
  // policyOpen declared here (used by navigateTo/handleAppBack below)
  const [policyOpen, setPolicyOpen] = useState<string | null>(null);
  const [saovietOpen, setSaovietOpen] = useState<string | null>(null); // null = show list, key = sub-page
  const [saovietExpanded, setSaovietExpanded] = useState(false); // desktop sidebar expand/collapse
  // CLB Sao Việt — same navigation pattern as Sao Việt (overview + 3 detail sub-pages)
  const [clbsvOpen, setClbsvOpen] = useState<string | null>(null); // null = show list, key = sub-page
  const [clbsvExpanded, setClbsvExpanded] = useState(false); // desktop sidebar expand/collapse
  const [clbsvNhomFilter, setClbsvNhomFilter] = useState<string>('');
  const [clbsvNameFilter, setClbsvNameFilter] = useState<string>('');

  // ===== TÔN VINH — 4 bảng Top 5 (H1) =====
  const [vinhdanhSub, setVinhDanhSub] = useState<VinhDanhSubKey>('top5-tvv');
  const [vinhdanhExpanded, setVinhDanhExpanded] = useState(false); // desktop sidebar expand/collapse

  // ===== ADMIN AUTH (read from sessionStorage set by KPI page) =====
  // Khi chưa admin: ẩn BackButton + nút Cài đặt, chỉ hiện nút "Về trang KPI".
  // Khi đã admin (đăng nhập từ KPI page): hiện lại BackButton + Cài đặt.
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    setMounted(true);
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('kpi_admin_authed') === '1') {
        setIsAdmin(true);
      }
    } catch {}
    // ===== ?sheet=xxx URL param =====
    // Lazy init useState ở trên KHÔNG chạy lại khi hydrate từ static prerender,
    // nên ta phải đọc URL param trong useEffect và setActiveSheet thủ công.
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const sheetParam = params.get('sheet');
        const validSheets: SheetKey[] = ['overview', 'leaders', 'recruiters', 'tuyen-ngang', 'revenue', 'report', 'structure', 'kehoach', 'saoviet', 'clb-saoviet', 'vinh-danh'];
        if (sheetParam && validSheets.includes(sheetParam as SheetKey) && sheetParam !== activeSheet) {
          // Clear ?sheet= from URL so internal nav doesn't keep re-applying it
          const url = new URL(window.location.href);
          url.searchParams.delete('sheet');
          window.history.replaceState({}, '', url.toString());
          setActiveSheet(sheetParam as SheetKey);
        }
      }
    } catch {}
  }, []);

  // ===== Lắng nghe thay đổi sessionStorage từ trang khác (khi user đăng nhập/đăng xuất ở /) =====
  // sessionStorage không trigger storage event trong cùng tab, nhưng khi điều hướng trang mới,
  // useEffect mount lại sẽ đọc lại giá trị mới nhất. Vẫn thêm poll để bắt thay đổi khi mở nhiều tab.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'kpi_admin_authed') {
        setIsAdmin(e.newValue === '1');
      }
    };
    window.addEventListener('storage', onStorage);
    const poll = setInterval(() => {
      try {
        const v = sessionStorage.getItem('kpi_admin_authed') === '1';
        setIsAdmin(prev => prev !== v ? v : prev);
      } catch {}
    }, 1000);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(poll); };
  }, []);

  // Helper: navigate back to KPI main page
  const goToKpiMain = useCallback(() => {
    router.push('/kpi');
  }, [router]);

  // Helper: NON-ADMIN back button behaviour.
  //  - Đang ở sub-page (policyOpen / saovietOpen / clbsvOpen đang mở) → trở về TỔNG QUAN của cùng section.
  //  - Đang ở overview của 3 trang CHÍNH SÁCH / SAO VIỆT / CLB SAO VIỆT → trở về /kpi
  //    (vì 3 trang này + KPI sẽ được deploy riêng sang địa chỉ khác, public cho TVV).
  //  - Đang ở overview / sheets khác (overview, leaders, recruiters, tuyen-ngang, revenue,
  //    structure, kehoach, vinh-danh) → trở về trang chính ứng dụng '/' (admin-only pages).
  const nonAdminBack = useCallback(() => {
    // Sub-page đang mở → reset sub về null (giữ nguyên sheet)
    if (activeSheet === 'report' && policyOpen) { setPolicyOpen(null); return; }
    if (activeSheet === 'saoviet' && saovietOpen) { setSaovietOpen(null); return; }
    if (activeSheet === 'clb-saoviet' && clbsvOpen) { setClbsvOpen(null); return; }
    if (activeSheet === 'structure' && structureSub !== 'leaders') { setStructureSub('leaders'); return; }
    if (activeSheet === 'revenue' && revenueSub !== 'all') { setRevenueSub('all'); return; }
    // 3 trang CHÍNH SÁCH / SAO VIỆT / CLB SAO VIỆT ở mức tổng quan → về /kpi
    if (activeSheet === 'report' || activeSheet === 'saoviet' || activeSheet === 'clb-saoviet') {
      router.push('/kpi');
      return;
    }
    // Tất cả sheet còn lại (overview + các sheet admin-only khác) → về trang chính ứng dụng
    router.push('/');
  }, [activeSheet, policyOpen, saovietOpen, clbsvOpen, structureSub, revenueSub, router]);

  // ========== INTERNAL NAV HISTORY (Back button support) ==========
  // Lưu lịch sử điều hướng nội bộ: mỗi lần đổi sheet/sub/policy sẽ push vào stack.
  // Back button sẽ pop stack để trở về TRẠNG THÁI TRƯỚC (không phải trang chủ).
  type NavState = { sheet: SheetKey; revenueSub?: RevenueSubKey; policyOpen?: string | null; structureSub?: StructureSubKey; saovietOpen?: string | null; clbsvOpen?: string | null; vinhdanhSub?: VinhDanhSubKey };
  const navHistoryRef = useRef<NavState[]>([{ sheet: 'overview' }]);
  const isNavigatingBackRef = useRef(false); // flag: đang pop stack → không push lại

  // Wrapper: navigate tới state mới → push state cũ vào history
  const navigateTo = useCallback((next: NavState) => {
    if (isNavigatingBackRef.current) {
      isNavigatingBackRef.current = false;
      return;
    }
    const current: NavState = {
      sheet: activeSheet,
      revenueSub,
      policyOpen,
      structureSub,
      saovietOpen,
      clbsvOpen,
      vinhdanhSub,
    };
    navHistoryRef.current.push(current);
    if (next.sheet !== activeSheet) setActiveSheet(next.sheet);
    if (next.revenueSub !== undefined && next.revenueSub !== revenueSub) setRevenueSub(next.revenueSub);
    if (next.policyOpen !== undefined && next.policyOpen !== policyOpen) setPolicyOpen(next.policyOpen);
    if (next.structureSub !== undefined && next.structureSub !== structureSub) setStructureSub(next.structureSub);
    if (next.saovietOpen !== undefined && next.saovietOpen !== saovietOpen) setSaovietOpen(next.saovietOpen);
    if (next.clbsvOpen !== undefined && next.clbsvOpen !== clbsvOpen) setClbsvOpen(next.clbsvOpen);
    if (next.vinhdanhSub !== undefined && next.vinhdanhSub !== vinhdanhSub) setVinhDanhSub(next.vinhdanhSub);
  }, [activeSheet, revenueSub, policyOpen, structureSub, saovietOpen, clbsvOpen, vinhdanhSub]);

  // Back button handler (admin mode — uses nav history stack):
  // - Nếu history còn > 1: pop về state trước đó
  // - Nếu history rỗng (length <= 1):
  //   • Đang ở 3 trang CHÍNH SÁCH / SAO VIỆT / CLB SAO VIỆT (ở mức tổng quan) → về /kpi
  //     (3 trang này + KPI sẽ được deploy riêng sang địa chỉ khác, public cho TVV).
  //   • Đang ở overview / sheets admin-only khác → về trang chính ứng dụng '/'
  //   • Đang ở sheet con (revenue/policy/structure có sub) → reset sub trước
  const handleAppBack = useCallback(() => {
    if (navHistoryRef.current.length <= 1) {
      // Sub-page đang mở → reset sub về null (giữ nguyên sheet)
      if (activeSheet === 'report' && policyOpen) { setPolicyOpen(null); return; }
      if (activeSheet === 'saoviet' && saovietOpen) { setSaovietOpen(null); return; }
      if (activeSheet === 'clb-saoviet' && clbsvOpen) { setClbsvOpen(null); return; }
      if (activeSheet === 'structure' && structureSub !== 'leaders') { setStructureSub('leaders'); return; }
      if (activeSheet === 'revenue' && revenueSub !== 'all') { setRevenueSub('all'); return; }
      // 3 trang CHÍNH SÁCH / SAO VIỆT / CLB SAO VIỆT ở mức tổng quan → về /kpi
      if (activeSheet === 'report' || activeSheet === 'saoviet' || activeSheet === 'clb-saoviet') {
        router.push('/kpi');
        return;
      }
      // Tất cả sheet còn lại (overview + các sheet admin-only khác) → về trang chính ứng dụng
      if (activeSheet === 'overview') {
        router.push('/');
      } else {
        // Đang ở sheet con (revenue/structure/kehoach/vinh-danh/leaders/recruiters/tuyen-ngang) → về overview trước
        setActiveSheet('overview');
      }
      return;
    }
    navHistoryRef.current.pop();
    const prev = navHistoryRef.current[navHistoryRef.current.length - 1];
    isNavigatingBackRef.current = true;
    if (prev.sheet !== activeSheet) setActiveSheet(prev.sheet);
    if (prev.revenueSub !== undefined && prev.revenueSub !== revenueSub) setRevenueSub(prev.revenueSub);
    if (prev.policyOpen !== undefined && prev.policyOpen !== policyOpen) setPolicyOpen(prev.policyOpen);
    if (prev.structureSub !== undefined && prev.structureSub !== structureSub) setStructureSub(prev.structureSub);
    if (prev.saovietOpen !== undefined && prev.saovietOpen !== saovietOpen) setSaovietOpen(prev.saovietOpen);
    if (prev.clbsvOpen !== undefined && prev.clbsvOpen !== clbsvOpen) setClbsvOpen(prev.clbsvOpen);
    if (prev.vinhdanhSub !== undefined && prev.vinhdanhSub !== vinhdanhSub) setVinhDanhSub(prev.vinhdanhSub);
  }, [activeSheet, revenueSub, policyOpen, structureSub, saovietOpen, clbsvOpen, vinhdanhSub, router]);


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
  const [tuyenNgangList, setTuyenNgangList] = useState<TuyenNgangItem[]>([]);
  // CLB Members + Pending Members — DB-backed (đồng bộ đa thiết bị)
  const [clbMembers, setClbMembers] = useState<CLBMemberItem[]>([]);
  const [pendingMembers, setPendingMembers] = useState<PendingMemberItem[]>([]);
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
  const [newTvv, setNewTvv] = useState({ agentCode: '', agentName: '', maBanNhom: '', chucVu: '', ngayBatDau: '', maTVVTuyendung: '', note: '' });

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

  // ===== TÔN VINH — Tính toán 4 bảng Top 5 (6 tháng đầu năm = H1) =====
  // Nguyên tắc:
  //   - IP = sum of contract.fyp trong H1 (theo getDoanhSoMonth = issueDate, fallback effectiveDate)
  //   - AFYP = sum of contract.afyp trong H1 (cho mục "Nhóm hoàn thành KH")
  //   - TVVm = TVV có ngayBatDau ≤ 12 tháng (cùng định nghĩa isTVVm trong chính sách)
  //   - Loại trừ TVV/nhóm thuộc phòng Banca (PHONG_EXCLUDED_FROM_REWARDS)
  //   - Top 5 TVVm: nếu TVVm đã lọt Top 5 TVV chung (mục 1) thì KHÔNG hiển thị lại ở mục 2
  //     (chỉ hiển thị 1 chỗ, lấy hạng cao hơn)
  //   - "Hoàn thành KH 6 tháng" = nhóm có AFYP H1 >= KH năm × (tổng ratio tháng 1-6 / 100)
  //     KHÔNG fallback — nếu ratio = 0 thì KH H1 = 0
  const VINH_DANH_H1_MONTHS = ['01', '02', '03', '04', '05', '06'];

  const vinhDanhData = useMemo(() => {
    const curYear = new Date().getFullYear();
    // H1 = tháng 1-6 của năm hiện tại
    const h1Start = new Date(curYear, 0, 1);
    const h1End = new Date(curYear, 5, 30, 23, 59, 59);

    // ===== Filter contracts in H1 (theo tháng phát hành, fallback hiệu lực) =====
    const h1Contracts = contracts.filter(c => {
      const d = getDoanhSoMonth(c);
      if (isNaN(d.getTime())) return false;
      return d >= h1Start && d <= h1End;
    });

    // ===== Build lookup: maBanNhom → AD/Phong (to exclude Banca) =====
    const bnToAd = new Map<string, string>();
    const bnToPhong = new Map<string, string>();
    banNhomList.forEach(bn => {
      bnToAd.set(bn.maBanNhom, bn.maAD);
      const ad = adList.find(a => a.maAD === bn.maAD);
      if (ad) {
        bnToPhong.set(bn.maBanNhom, ad.maPhong);
      }
    });
    // Helper: check if a contract's nhóm is Banca (excluded from rewards)
    const isContractExcluded = (c: Contract): boolean => {
      // 1. Check via maBanNhom → AD → Phong
      const maPhong = bnToPhong.get(c.maBanNhom) || bnToPhong.get(c.maNhom);
      if (maPhong && PHONG_EXCLUDED_FROM_REWARDS(maPhong)) return true;
      // 2. Check alias trực tiếp trên maBanNhom / maNhom (PA/Banca alias)
      if (isBancaCode(c.maBanNhom) || isBancaCode(c.maNhom)) return true;
      return false;
    };

    // ===== Helper: resolve TenNhóm for display =====
    // Ưu tiên: leader.nhom (DS TB/TN), fallback banNhom.tenBanNhom, fallback contract.nhom
    const maNhomToTen = new Map<string, string>();
    leaders.forEach(ld => {
      if (ld.maNhom && ld.nhom && !/^[A-Z0-9]{6,}$/.test(ld.nhom)) {
        maNhomToTen.set(ld.maNhom, ld.nhom);
      }
    });
    banNhomList.forEach(bn => {
      if (!maNhomToTen.has(bn.maBanNhom) && bn.tenBanNhom) {
        maNhomToTen.set(bn.maBanNhom, bn.tenBanNhom);
      }
    });
    const resolveTenNhom = (maBanNhom: string, fallback: string): string => {
      return maNhomToTen.get(maBanNhom) || fallback || maBanNhom;
    };

    // ===== 1. IP per TVV (agentCode) trong H1 =====
    const ipByTvv = new Map<string, { agentCode: string; agentName: string; maBanNhom: string; tenNhom: string; ip: number }>();
    h1Contracts.forEach(c => {
      if (isContractExcluded(c)) return;
      const key = c.agentCode || c.maDL;
      if (!key) return;
      const cur = ipByTvv.get(key);
      const tenNhom = resolveTenNhom(c.maBanNhom, c.nhom);
      if (cur) {
        cur.ip += c.fyp || 0;
      } else {
        ipByTvv.set(key, {
          agentCode: key,
          agentName: c.agentName || '',
          maBanNhom: c.maBanNhom || c.maNhom || '',
          tenNhom,
          ip: c.fyp || 0,
        });
      }
    });

    // ===== 2. TVVm lookup (từ tvvStructList — đã có ngayBatDau) =====
    const tvvStructMap = new Map<string, TVVStructItem>();
    tvvStructList.forEach(t => {
      if (t.agentCode) tvvStructMap.set(t.agentCode, t);
    });
    // Helper check TVVm (≤12 tháng từ startDate)
    const checkIsTVVm = (startDate: string | null, maxMonths: number = 12): boolean => {
      if (!startDate) return false;
      const start = new Date(startDate);
      if (isNaN(start.getTime())) return false;
      const now = new Date();
      const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      return diffMonths < maxMonths;
    };
    // Map: agentCode → isTVVm
    const tvvmSet = new Set<string>();
    tvvStructList.forEach(t => {
      if (checkIsTVVm(t.ngayBatDau)) tvvmSet.add(t.agentCode);
    });

    // ===== Sort Top 5 TVV (tất cả) theo IP giảm dần =====
    const top5TvvAll = Array.from(ipByTvv.values())
      .filter(t => t.ip > 0)
      .sort((a, b) => b.ip - a.ip)
      .slice(0, 5);

    // ===== Top 5 TVVm: TVVm có IP > 0, KHÔNG trùng với top5TvvAll =====
    // (nếu đã lọt Top 5 TVV chung thì chỉ hiển thị ở mục 1, lấy hạng cao hơn)
    const tvvInTop5All = new Set(top5TvvAll.map(t => t.agentCode));
    const top5TvvM = Array.from(ipByTvv.values())
      .filter(t => t.ip > 0 && tvvmSet.has(t.agentCode) && !tvvInTop5All.has(t.agentCode))
      .sort((a, b) => b.ip - a.ip)
      .slice(0, 5);

    // ===== 3. IP per Nhóm (maBanNhom) trong H1 =====
    const ipByNhom = new Map<string, { maBanNhom: string; tenNhom: string; ip: number; truongNhomMaSo?: string; truongNhomHoTen?: string }>();
    h1Contracts.forEach(c => {
      if (isContractExcluded(c)) return;
      const maBN = c.maBanNhom || c.maNhom;
      if (!maBN) return;
      const cur = ipByNhom.get(maBN);
      const tenNhom = resolveTenNhom(maBN, c.nhom);
      if (cur) {
        cur.ip += c.fyp || 0;
      } else {
        ipByNhom.set(maBN, { maBanNhom: maBN, tenNhom, ip: c.fyp || 0 });
      }
    });
    // Gắn thông tin Trưởng Nhóm/Ban (TB/TN) cho mỗi nhóm — lookup từ leaders
    ipByNhom.forEach(n => {
      const ld = leaders.find(l => l.maNhom === n.maBanNhom && isTBorTNPosition(l.position));
      if (ld) {
        n.truongNhomMaSo = ld.agentCode;
        n.truongNhomHoTen = ld.agentName;
      }
    });
    const top5Nhom = Array.from(ipByNhom.values())
      .filter(n => n.ip > 0)
      .sort((a, b) => b.ip - a.ip)
      .slice(0, 5);

    // ===== 4. AFYP per Nhóm + KH H1 =====
    // KH H1 = (KH năm của nhóm) × (tổng ratio tháng 1-6 / 100)
    // KHÔNG fallback — nếu ratio = 0 thì KH H1 = 0 (user chưa set ratio → 0)
    const afypByNhom = new Map<string, number>();
    h1Contracts.forEach(c => {
      if (isContractExcluded(c)) return;
      const maBN = c.maBanNhom || c.maNhom;
      if (!maBN) return;
      afypByNhom.set(maBN, (afypByNhom.get(maBN) || 0) + (c.afyp || 0));
    });
    // Total ratio tháng 1-6 từ settings
    const h1Ratio = VINH_DANH_H1_MONTHS.reduce((s, m) => s + (parseFloat(onlineSettings[`nmc-kh-ratio-${m}`] || '0') || 0), 0);
    const h1RatioPct = h1Ratio > 0 ? h1Ratio / 100 : 0; // KHÔNG fallback 50%

    const nhomHoanThanhKH = banNhomList
      .map(bn => {
        const khYear = parseFloat(onlineSettings[`nmc-kh-nhom-${bn.maBanNhom}`] || '0') || 0;
        const khH1 = khYear * h1RatioPct;
        const afypH1 = afypByNhom.get(bn.maBanNhom) || 0;
        // Loại nhóm Banca
        const maPhong = bnToPhong.get(bn.maBanNhom);
        const isExcluded = (maPhong && PHONG_EXCLUDED_FROM_REWARDS(maPhong)) || isBancaCode(bn.maBanNhom);
        return {
          maBanNhom: bn.maBanNhom,
          tenNhom: resolveTenNhom(bn.maBanNhom, bn.tenBanNhom),
          afypH1,
          khH1,
          pct: khH1 > 0 ? (afypH1 / khH1) * 100 : 0,
          hoanThanh: khH1 > 0 && afypH1 >= khH1,
          isExcluded,
        };
      })
      .filter(n => !n.isExcluded && n.khH1 > 0) // chỉ xét nhóm có KH > 0
      .sort((a, b) => b.pct - a.pct); // xếp theo % hoàn thành giảm dần

    return {
      top5Tvv: top5TvvAll,
      top5TvvM,
      top5Nhom,
      nhomHoanThanhKH: nhomHoanThanhKH.filter(n => n.hoanThanh),
      // Toàn bộ nhóm có KH (để hiển thị cả những nhóm chưa đạt — bonus info)
      allNhomWithKH: nhomHoanThanhKH,
      h1RatioPct,
    };
  }, [contracts, banNhomList, adList, leaders, tvvStructList, onlineSettings]);


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
  const fetchTuyenNgang = useCallback(async () => {
    try { const r = await fetch('/api/tuyen-ngang'); if (r.ok) setTuyenNgangList(await r.json()); } catch {}
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

  // ========== CLB Members + Pending Members: DB-backed (đồng bộ đa thiết bị) ==========
  // Migration: nếu có data cũ trong localStorage → push lên DB 1 lần rồi xóa localStorage
  // Sau đó load từ API mỗi lần vào trang
  const fetchClbMembers = useCallback(async () => {
    try {
      const r = await fetch('/api/clb-members');
      if (r.ok) setClbMembers(await r.json());
    } catch {}
  }, []);
  const fetchPendingMembers = useCallback(async () => {
    try {
      const r = await fetch('/api/pending-members');
      if (r.ok) setPendingMembers(await r.json());
    } catch {}
  }, []);

  // One-time migration: localStorage → DB (chạy 1 lần khi chưa có data trong DB)
  // CRITICAL: Chỉ xóa localStorage sau khi DB write THÀNH CÔNG + verify bằng re-fetch.
  // Nếu POST fail (server error, DB schema chưa apply, network issue) → GIỮ localStorage để retry lần sau.
  useEffect(() => {
    (async () => {
      try {
        const clbRaw = localStorage.getItem('nmc-clb-members-v1');
        const pendingRaw = localStorage.getItem('nmc-pending-members-v1');
        const clbLocal: CLBMemberItem[] = clbRaw ? JSON.parse(clbRaw) : [];
        const pendingLocal: PendingMemberItem[] = pendingRaw ? JSON.parse(pendingRaw) : [];

        // Fetch existing DB rows
        const [clbRes, pendingRes] = await Promise.all([
          fetch('/api/clb-members'),
          fetch('/api/pending-members'),
        ]);
        const clbDb: CLBMemberItem[] = clbRes.ok ? await clbRes.json() : [];
        const pendingDb: PendingMemberItem[] = pendingRes.ok ? await pendingRes.json() : [];

        // Migrate CLB: chỉ nếu DB rỗng + localStorage có data
        if (clbDb.length === 0 && clbLocal.length > 0) {
          try {
            const r = await fetch('/api/clb-members', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(clbLocal),
            });
            if (!r.ok) throw new Error(`POST /api/clb-members failed: ${r.status}`);
            // Verify: re-fetch để confirm DB đã có data
            const verify = await fetch('/api/clb-members');
            const verifyRows: CLBMemberItem[] = verify.ok ? await verify.json() : [];
            if (verifyRows.length >= clbLocal.length) {
              localStorage.removeItem('nmc-clb-members-v1');
              console.log('[CLB migration] OK: migrated', clbLocal.length, 'rows to DB, localStorage cleared');
            } else {
              console.warn('[CLB migration] Verify failed: expected', clbLocal.length, 'got', verifyRows.length, '— giữ localStorage để retry');
            }
          } catch (e) {
            console.error('[CLB migration] FAILED — giữ localStorage để retry lần sau:', e);
          }
        } else if (clbLocal.length > 0 && clbDb.length > 0) {
          // DB đã có data → xóa localStorage (không cần migrate nữa)
          localStorage.removeItem('nmc-clb-members-v1');
          console.log('[CLB migration] DB đã có data, localStorage cleared');
        }

        // Migrate Pending: tương tự
        if (pendingDb.length === 0 && pendingLocal.length > 0) {
          try {
            const r = await fetch('/api/pending-members', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(pendingLocal),
            });
            if (!r.ok) throw new Error(`POST /api/pending-members failed: ${r.status}`);
            const verify = await fetch('/api/pending-members');
            const verifyRows: PendingMemberItem[] = verify.ok ? await verify.json() : [];
            if (verifyRows.length >= pendingLocal.length) {
              localStorage.removeItem('nmc-pending-members-v1');
              console.log('[Pending migration] OK: migrated', pendingLocal.length, 'rows to DB, localStorage cleared');
            } else {
              console.warn('[Pending migration] Verify failed: expected', pendingLocal.length, 'got', verifyRows.length, '— giữ localStorage để retry');
            }
          } catch (e) {
            console.error('[Pending migration] FAILED — giữ localStorage để retry lần sau:', e);
          }
        } else if (pendingLocal.length > 0 && pendingDb.length > 0) {
          localStorage.removeItem('nmc-pending-members-v1');
          console.log('[Pending migration] DB đã có data, localStorage cleared');
        }

        // Re-fetch để set state với data mới nhất từ DB
        await Promise.all([fetchClbMembers(), fetchPendingMembers()]);
      } catch (e) {
        console.error('[CLB/Pending migration]', e);
        // Fallback: thử fetch bình thường
        await Promise.all([fetchClbMembers(), fetchPendingMembers()]);
      }
    })();
  }, [fetchClbMembers, fetchPendingMembers]);

  // CRUD: CLB Members — gọi API, update state optimistic
  const addClbMember = useCallback(async () => {
    try {
      const r = await fetch('/api/clb-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad: '', nhom: '', agentCode: '', agentName: '', chucVu: '', note: '' }),
      });
      if (r.ok) { const n: CLBMemberItem = await r.json(); setClbMembers(prev => [n, ...prev]); toast({ title: 'Đã thêm' }); }
    } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, []);
  const updateClbMember = useCallback(async (id: string, field: keyof CLBMemberItem, value: any) => {
    // Optimistic update
    setClbMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    try {
      const r = await fetch(`/api/clb-members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!r.ok) {
        // Revert: re-fetch
        await fetchClbMembers();
        toast({ title: 'Lỗi lưu', variant: 'destructive' });
      }
    } catch {
      await fetchClbMembers();
      toast({ title: 'Lỗi mạng', variant: 'destructive' });
    }
  }, [fetchClbMembers]);
  const deleteClbMember = useCallback(async (id: string) => {
    if (!confirm('Xóa dòng này?')) return;
    setClbMembers(prev => prev.filter(m => m.id !== id));
    try {
      await fetch(`/api/clb-members/${id}`, { method: 'DELETE' });
      toast({ title: 'Đã xóa' });
    } catch {
      await fetchClbMembers();
      toast({ title: 'Lỗi mạng', variant: 'destructive' });
    }
  }, [fetchClbMembers]);

  // CRUD: Pending Members — tương tự
  const addPendingMember = useCallback(async () => {
    try {
      const r = await fetch('/api/pending-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad: '', nhom: '', agentCode: '', agentName: '', chucVu: '', ipT2: 0, ipT1: 0, ipT0: 0, note: '' }),
      });
      if (r.ok) { const n: PendingMemberItem = await r.json(); setPendingMembers(prev => [n, ...prev]); toast({ title: 'Đã thêm' }); }
    } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, []);
  const updatePendingMember = useCallback(async (id: string, field: keyof PendingMemberItem, value: any) => {
    setPendingMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    try {
      const r = await fetch(`/api/pending-members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!r.ok) {
        await fetchPendingMembers();
        toast({ title: 'Lỗi lưu', variant: 'destructive' });
      }
    } catch {
      await fetchPendingMembers();
      toast({ title: 'Lỗi mạng', variant: 'destructive' });
    }
  }, [fetchPendingMembers]);
  const deletePendingMember = useCallback(async (id: string) => {
    if (!confirm('Xóa dòng này?')) return;
    setPendingMembers(prev => prev.filter(m => m.id !== id));
    try {
      await fetch(`/api/pending-members/${id}`, { method: 'DELETE' });
      toast({ title: 'Đã xóa' });
    } catch {
      await fetchPendingMembers();
      toast({ title: 'Lỗi mạng', variant: 'destructive' });
    }
  }, [fetchPendingMembers]);

  // Autofill AD/Nhóm/Họ tên TVV từ MÃ TVV — lookup tvvStructList → banNhomList → adList
  const autofillFromAgentCode = useCallback((agentCode: string): { ad: string; nhom: string; agentName: string } | null => {
    const code = (agentCode || '').trim();
    if (!code) return null;
    const tvv = tvvStructList.find(t => (t.agentCode || '').trim().toLowerCase() === code.toLowerCase());
    if (!tvv) return null;
    const banNhom = banNhomList.find(b => b.maBanNhom === tvv.maBanNhom);
    const ad = banNhom ? (adList.find(a => a.maAD === banNhom.maAD)?.tenAD || '') : '';
    return {
      ad,
      nhom: banNhom?.tenBanNhom || '',
      agentName: tvv.agentName || '',
    };
  }, [tvvStructList, banNhomList, adList]);

  // Excel import for CLB Members + Pending Members — parse xlsx/csv, append vào DB
  const handleImportCLBorPending = useCallback(async (which: 'clb-members' | 'pending-members', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: true });
      if (!data.length) { toast({ title: 'File trống', variant: 'destructive' }); e.target.value = ''; return; }

      const parseNum = (v: any) => typeof v === 'number' ? v : parseFloat(String(v || '0').replace(/,/g, '')) || 0;
      const strVal = (v: any) => String(v ?? '').trim();

      if (which === 'clb-members') {
        const rows = data.map((r: any) => {
          const agentCode = strVal(r['MÃ TVV'] || r['Mã TVV'] || r['agentCode'] || r['MÃ SỐ'] || r['Mã số']);
          const auto = agentCode ? autofillFromAgentCode(agentCode) : null;
          return {
            ad: strVal(r['AD'] || r['ad'] || (auto?.ad ?? '')),
            nhom: strVal(r['NHÓM'] || r['Nhóm'] || r['nhom'] || (auto?.nhom ?? '')),
            agentCode,
            agentName: strVal(r['HỌ TÊN TVV'] || r['Họ tên TVV'] || r['agentName'] || (auto?.agentName ?? '')),
            chucVu: strVal(r['CHỨC VỤ'] || r['Chức vụ'] || r['chucVu'] || r['POSITION'] || ''),
            note: strVal(r['GHI CHÚ'] || r['Ghi chú'] || r['note'] || ''),
          };
        }).filter(r => r.agentCode || r.agentName);
        if (!rows.length) { toast({ title: 'Không có dòng hợp lệ', variant: 'destructive' }); e.target.value = ''; return; }
        const r = await fetch('/api/clb-members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rows),
        });
        if (r.ok) {
          await fetchClbMembers();
          toast({ title: `Đã import ${rows.length} dòng vào DS Thành viên CLB` });
        } else {
          toast({ title: 'Lỗi import', variant: 'destructive' });
        }
      } else {
        const rows = data.map((r: any) => {
          const agentCode = strVal(r['MÃ TVV'] || r['Mã TVV'] || r['agentCode'] || r['MÃ SỐ'] || r['Mã số']);
          const auto = agentCode ? autofillFromAgentCode(agentCode) : null;
          return {
            ad: strVal(r['AD'] || r['ad'] || (auto?.ad ?? '')),
            nhom: strVal(r['NHÓM'] || r['Nhóm'] || r['nhom'] || (auto?.nhom ?? '')),
            agentCode,
            agentName: strVal(r['HỌ TÊN TVV'] || r['Họ tên TVV'] || r['agentName'] || (auto?.agentName ?? '')),
            chucVu: strVal(r['CHỨC VỤ'] || r['Chức vụ'] || r['chucVu'] || r['POSITION'] || ''),
            ipT2: parseNum(r['IP(T-2)'] || r['IP T-2'] || r['ipT2']),
            ipT1: parseNum(r['IP(T-1)'] || r['IP T-1'] || r['ipT1']),
            ipT0: parseNum(r['IP(T)'] || r['IP T'] || r['ipT0']),
            note: strVal(r['GHI CHÚ'] || r['Ghi chú'] || r['note'] || ''),
          };
        }).filter(r => r.agentCode || r.agentName);
        if (!rows.length) { toast({ title: 'Không có dòng hợp lệ', variant: 'destructive' }); e.target.value = ''; return; }
        const r = await fetch('/api/pending-members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rows),
        });
        if (r.ok) {
          await fetchPendingMembers();
          toast({ title: `Đã import ${rows.length} dòng vào DS Chờ xét gia nhập` });
        } else {
          toast({ title: 'Lỗi import', variant: 'destructive' });
        }
      }
    } catch (err) {
      console.error('[Import CLB/Pending]', err);
      toast({ title: 'Lỗi import', variant: 'destructive' });
    }
    e.target.value = '';
  }, [autofillFromAgentCode, fetchClbMembers, fetchPendingMembers]);

  // Excel export for CLB Members + Pending Members
  // QUAN TRỌNG: với pending-members, 3 cột IP phải tự tính từ Hợp đồng theo tháng Phát hành
  // (đồng nhất với renderPendingMembers) — không dùng giá trị DB cũ (có thể đã stale)
  const handleExportCLBorPending = useCallback(async (which: 'clb-members' | 'pending-members') => {
    try {
      const XLSX = await import('xlsx');
      const list = which === 'clb-members' ? clbMembers : pendingMembers;
      // Compute T-2/T-1/T relative to current month (year wrap aware) — same logic as renderPendingMembers
      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = now.getMonth() + 1;
      const offsetMonth = (offset: number) => {
        const d = new Date(curYear, curMonth - 1 + offset, 1);
        return { year: d.getFullYear(), month: d.getMonth() + 1, label: `T${d.getMonth() + 1}` };
      };
      const t2 = offsetMonth(-2);
      const t1 = offsetMonth(-1);
      const t0 = offsetMonth(0);
      // Build IP map: agentCode (lowercase) → { t2, t1, t0 }
      const ipMap: Record<string, { t2: number; t1: number; t0: number }> = {};
      for (const c of contracts) {
        const d = getDoanhSoMonth(c);
        if (isNaN(d.getTime())) continue;
        const cy = d.getFullYear();
        const cm = d.getMonth() + 1;
        const code = (c.agentCode || '').trim().toLowerCase();
        if (!code) continue;
        if (!ipMap[code]) ipMap[code] = { t2: 0, t1: 0, t0: 0 };
        const fyp = c.fyp || 0;
        if (cy === t2.year && cm === t2.month) ipMap[code].t2 += fyp;
        else if (cy === t1.year && cm === t1.month) ipMap[code].t1 += fyp;
        else if (cy === t0.year && cm === t0.month) ipMap[code].t0 += fyp;
      }
      const rows = which === 'clb-members'
        ? (list as CLBMemberItem[]).map((r, i) => ({ STT: i + 1, AD: r.ad, NHÓM: r.nhom, 'MÃ TVV': r.agentCode, 'HỌ TÊN TVV': r.agentName, 'CHỨC VỤ': r.chucVu, 'GHI CHÚ': r.note }))
        : (list as PendingMemberItem[]).map((r, i) => {
          const key = (r.agentCode || '').trim().toLowerCase();
          const ip = ipMap[key] || { t2: 0, t1: 0, t0: 0 };
          const total = ip.t2 + ip.t1 + ip.t0;
          return { STT: i + 1, AD: r.ad, NHÓM: r.nhom, 'MÃ TVV': r.agentCode, 'HỌ TÊN TVV': r.agentName, 'CHỨC VỤ': r.chucVu, [`IP ${t2.label}`]: ip.t2, [`IP ${t1.label}`]: ip.t1, [`IP ${t0.label}`]: ip.t0, 'TỔNG CỘNG': total, 'GHI CHÚ': r.note };
        });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, which === 'clb-members' ? 'DS CLB' : 'DS Chờ');
      XLSX.writeFile(wb, `${which === 'clb-members' ? 'DS_ThanhVien_CLB' : 'DS_Cho_Xet_Gia_Nhap'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('[Export CLB/Pending]', err);
      toast({ title: 'Lỗi xuất file', variant: 'destructive' });
    }
  }, [clbMembers, pendingMembers, contracts]);

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

  // ===== AppDataContext: đọc dữ liệu đã preload khi app mở (lần đầu) =====
  // Khi dataVersion tăng (tức là context vừa load xong), sync vào local state.
  // Sheet-specific fetch vẫn giữ nguyên để dùng sau CRUD / đổi sheet.
  const { data: appData, dataVersion: appDataVersion, isReloading: appDataReloading } = useAppData();
  const lastSyncedVersion = useRef<number>(-1);
  useEffect(() => {
    if (appDataVersion <= lastSyncedVersion.current) return;
    lastSyncedVersion.current = appDataVersion;
    // Chỉ sync khi context có dữ liệu thực
    const hasData = appData.contracts?.length || appData.leaders?.length || appData.revenue?.length || appData.staff?.length || appData.recruiters?.length;
    if (!hasData) return;
    // Ưu tiên quanLyAll (đã gộp), fallback về từng mảng riêng
    if (appData.quanLyAll) {
      setLeaders(appData.quanLyAll.leaders || appData.leaders || []);
      setRevenue(appData.quanLyAll.revenue || appData.revenue || []);
      setContracts(appData.quanLyAll.contracts || appData.contracts || []);
      setStaff(appData.quanLyAll.staff || appData.staff || []);
      setRecruiters(appData.recruiters || []);
      if (appData.quanLyAll.tvvStruct) setTvvStructList(appData.quanLyAll.tvvStruct);
    } else {
      setLeaders(appData.leaders || []);
      setRevenue(appData.revenue || []);
      setContracts(appData.contracts || []);
      setStaff(appData.staff || []);
      setRecruiters(appData.recruiters || []);
    }
    if (appData.tuyenNgang) setTuyenNgangList(appData.tuyenNgang);
    if (appData.structurePhong) setPhongList(appData.structurePhong);
    if (appData.structureAd) setAdList(appData.structureAd);
    if (appData.structureBanNhom) setBanNhomList(appData.structureBanNhom);
    if (appData.structureTvv) setTvvStructList(appData.structureTvv);
    if (appData.clbMembers) setClbMembers(appData.clbMembers);
    if (appData.pendingMembers) setPendingMembers(appData.pendingMembers);
    if (appData.settings) setOnlineSettings(appData.settings);
  }, [appData, appDataVersion]);

  const loadSheet = useCallback((sheet: SheetKey, _force = false) => {
    setIsLoading(true);
    const loaders: Record<SheetKey, () => Promise<void>> = {
      overview: async () => { await Promise.all([fetchAllData(), fetchTvvStruct(), fetchPhong(), fetchAD(), fetchBanNhom()]); }, // Fetch all data + structure for Kế hoạch targets
      leaders: fetchLeaders,
      'tuyen-ngang': fetchTuyenNgang,
      recruiters: fetchRecruiters,
      revenue: async () => { await Promise.all([fetchRevenue(), fetchContracts()]); },
      kehoach: async () => { await Promise.all([fetchAllData(), fetchPhong(), fetchAD(), fetchBanNhom(), fetchTuyenNgang()]); },
      report: async () => { await Promise.all([fetchAllData(), fetchPhong(), fetchAD(), fetchBanNhom(), fetchTuyenNgang(), fetchRecruiters()]); },
      structure: async () => { await Promise.all([fetchLeaders(), fetchStaff(), fetchPhong(), fetchAD(), fetchBanNhom(), fetchTvvStruct(), fetchRecruiters(), fetchTuyenNgang()]); },
      saoviet: async () => { /* No data to load — placeholder page */ },
      'clb-saoviet': async () => { /* Criteria shown statically — no data to load */ },
      'vinh-danh': async () => { await Promise.all([fetchContracts(), fetchLeaders(), fetchTvvStruct(), fetchPhong(), fetchAD(), fetchBanNhom()]); },
    };
    loaders[sheet]().finally(() => setIsLoading(false));
  }, [fetchAllData, fetchLeaders, fetchRevenue, fetchContracts, fetchStaff, fetchRecruiters, fetchTuyenNgang, fetchPhong, fetchAD, fetchBanNhom, fetchTvvStruct]);

  // Skip initial loadSheet — context đã preload dữ liệu toàn app.
  // Chỉ gọi loadSheet khi user chủ động đổi sheet (để load sheet-specific data nếu cần).
  const skipInitialLoadSheet = useRef(true);
  useEffect(() => {
    if (skipInitialLoadSheet.current) {
      skipInitialLoadSheet.current = false;
      return;
    }
    loadSheet(activeSheet);
  }, [activeSheet, loadSheet]);

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

  // ========== Bulk delete: xóa toàn bộ HĐ của 1 tháng cụ thể (Revenue page) ==========
  // Gọi /api/contracts/delete-by-range với fromMonth = toMonth = tháng đang chọn
  // Backend xóa theo issueDate (Ngày PH), fallback effectiveDate (Ngày HL) — khớp getDoanhSoMonth
  const handleDeleteRevenueMonth = useCallback(async (monthKey: RevenueSubKey) => {
    if (monthKey === 'all') return; // không cho xóa "Cả năm"
    const currentY = new Date().getFullYear();
    const monthStr = `${currentY}-${monthKey}`; // vd: "2026-06"
    const monthLabel = `Tháng ${parseInt(monthKey, 10)}`;
    const ok = confirm(
      `⚠️ XÓA TOÀN BỘ DỮ LIỆU THÁNG\n\n` +
      `Bạn đang chọn xóa tất cả hợp đồng của ${monthLabel}/${currentY}.\n` +
      `Hành động này KHÔNG thể hoàn tác.\n\n` +
      `Nhấn OK để xác nhận xóa.`
    );
    if (!ok) return;
    try {
      const r = await fetch('/api/contracts/delete-by-range', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromMonth: monthStr, toMonth: monthStr }),
      });
      if (r.ok) {
        const data = await r.json();
        // Cập nhật state: loại bỏ các HĐ có doanh số tháng = monthKey
        setContracts(prev => prev.filter(c => {
          const d = getDoanhSoMonth(c);
          if (isNaN(d.getTime())) return true; // giữ lại HĐ không có ngày (sẽ xử lý riêng)
          return !(d.getFullYear() === currentY && String(d.getMonth() + 1).padStart(2, '0') === monthKey);
        }));
        toast({ title: `Đã xóa ${data.deletedCount ?? 0} hợp đồng của ${monthLabel}/${currentY}` });
      } else {
        const err = await r.json().catch(() => ({}));
        toast({ title: 'Lỗi khi xóa', description: err.error || 'Không xác định', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Lỗi mạng', description: 'Không thể kết nối server', variant: 'destructive' });
    }
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

  // ========== CRUD: Tuyen Ngang (DS TTN Tuyển Ngang) ==========
  const updateTuyenNgang = useCallback(async (id: string, field: string, value: any) => {
    try { const r = await fetch(`/api/tuyen-ngang/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }) }); if (r.ok) setTuyenNgangList(p => p.map(tn => tn.id === id ? { ...tn, [field]: value } : tn)); } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, []);
  const addTuyenNgang = useCallback(async () => {
    try { const r = await fetch('/api/tuyen-ngang', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentCode: 'TN_' + Date.now(), agentName: 'Chưa nhập' }) }); if (r.ok) { const n = await r.json(); setTuyenNgangList(p => [n, ...p]); toast({ title: 'Đã thêm' }); } } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
  }, []);
  const deleteTuyenNgang = useCallback(async (id: string) => {
    if (!confirm('Xóa?')) return; try { const r = await fetch(`/api/tuyen-ngang/${id}`, { method: 'DELETE' }); if (r.ok) { setTuyenNgangList(p => p.filter(tn => tn.id !== id)); toast({ title: 'Đã xóa' }); } } catch {}
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
    try { const res = await fetch('/api/structure/tvv', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTvv) }); if (res.ok) { setAddTvvOpen(false); setNewTvv({ agentCode: '', agentName: '', maBanNhom: '', chucVu: '', ngayBatDau: '', maTVVTuyendung: '', note: '' }); fetchTvvStruct(); toast({ title: 'Đã thêm TVV' }); } } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
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
    try { const res = await fetch(`/api/structure/tvv/${editingTvv.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentCode: editingTvv.agentCode, agentName: editingTvv.agentName, maBanNhom: editingTvv.maBanNhom, chucVu: editingTvv.chucVu, ngayBatDau: editingTvv.ngayBatDau || '', maTVVTuyendung: editingTvv.maTVVTuyendung || '', note: editingTvv.note }) }); if (res.ok) { setEditingTvv(null); fetchTvvStruct(); toast({ title: 'Đã cập nhật' }); } } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
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
      // Lấy TẤT CẢ dòng mẫu (nếu có), nếu không có thì tạo 1 dòng rỗng
      const XLSX = await import('xlsx');
      const data = template.sampleData.length > 0
        ? template.sampleData
        : [Object.fromEntries(template.headers.map(h => [h, '']))];
      const ws = XLSX.utils.json_to_sheet(data, { header: template.headers });
      ws['!cols'] = template.headers.map(h => ({ wch: Math.max(h.length * 2, 14) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `Mau_${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast({ title: 'Đang tải mẫu...', description: `Mẫu ${sheetName} (${data.length} dòng mẫu)` });
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
      else if (sheetName === 'tuyen-ngang') data = tuyenNgangList.map((t, i) => ({ 'STT': i + 1, 'NHÓM': t.nhom, 'MÃ TVV': t.agentCode, 'HỌ TÊN': t.agentName, 'Ngày bắt đầu làm việc': t.ngayBatDau ? new Date(t.ngayBatDau).toLocaleDateString('vi-VN') : '', 'Ngày hiệu lực chức vụ': t.ngayHieuLuc ? new Date(t.ngayHieuLuc).toLocaleDateString('vi-VN') : '', 'MÃ NGƯỜI TUYỂN DỤNG': t.maNguoiTuyenDung, 'TÊN NGƯỜI TUYỂN DỤNG': t.tenNguoiTuyenDung }));
      else if (sheetName === 'structure-tvv') data = tvvStructList.map(t => ({ 'Mã TVV': t.agentCode, 'Tên TVV': t.agentName, 'Mã Ban/Nhóm': t.maBanNhom, 'Chức vụ': t.chucVu, 'Ngày bắt đầu làm việc': t.ngayBatDau ? new Date(t.ngayBatDau).toLocaleDateString('vi-VN') : '', 'Mã TVV TD': t.maTVVTuyendung, 'Ghi chú': t.note }));

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
  }, [leaders, revenue, contracts, staff, recruiters, tuyenNgangList, tvvStructList]);

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
      let suppressGenericToast = false;

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
            effectiveDate: effectiveDate || null,
            issueDate: parseDateValue(row['Ngày phát hành'] || row['Ngày cấp'] || row['Ngày PH'] || row['issueDate']) || null,
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
      } else if (sheetName === 'tuyen-ngang') {
        // Columns (chuẩn): STT, NHÓM, MÃ TVV, HỌ TÊN, Ngày bắt đầu LV, Ngày hiệu lực CV, MÃ NGƯỜI TD, TÊN NGƯỜI TD
        // CHẤP NHẬN nhiều biến thể header (viết thường/hoa, có/không dấu, alias)
        // để tránh trường hợp file user upload không khớp header chuẩn → import silently fail
        const normalizeKey = (k: string): string => k.trim().toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // bỏ dấu tiếng Việt
          .replace(/[\s_]+/g, ' ').trim();
        const pickField = (r: any, aliases: string[]): string => {
          // Pass 1: exact match
          for (const k of Object.keys(r)) {
            const norm = normalizeKey(k);
            for (const alias of aliases) {
              if (norm === alias) return String(r[k] ?? '');
            }
          }
          // Pass 2: fuzzy match — alias included in key, or key included in alias (chỉ cho alias dài >=4)
          for (const k of Object.keys(r)) {
            const norm = normalizeKey(k);
            for (const alias of aliases) {
              if (alias.length >= 4 && (norm.includes(alias) || alias.includes(norm))) {
                return String(r[k] ?? '');
              }
            }
          }
          return '';
        };
        const parseDateAny = (r: any, aliases: string[]): string => {
          for (const k of Object.keys(r)) {
            const norm = normalizeKey(k);
            for (const alias of aliases) {
              if (norm === alias && r[k] != null && String(r[k]).trim()) {
                return parseDateValue(r[k]) || '';
              }
            }
          }
          // Fallback fuzzy
          for (const k of Object.keys(r)) {
            const norm = normalizeKey(k);
            for (const alias of aliases) {
              if (alias.length >= 4 && (norm.includes(alias) || alias.includes(norm)) && r[k] != null && String(r[k]).trim()) {
                return parseDateValue(r[k]) || '';
              }
            }
          }
          return '';
        };
        const members = data.map((r: any) => ({
          nhom: pickField(r, ['nhom', 'nhom kd', 'nhom kinh doanh', 'nhóm kd']),
          agentCode: pickField(r, ['ma tvv', 'ma tvv/tn', 'ma tvv ttn', 'ma tvv/ttn', 'ma dl', 'ma dai ly', 'ma so', 'ma', 'agentcode', 'mã tvv', 'mã số']),
          agentName: pickField(r, ['ho ten', 'hoten', 'ho va ten', 'ten tvv', 'ten ttn', 'ten', 'agentname', 'họ tên', 'tên']),
          ngayBatDau: parseDateAny(r, ['ngay bat dau lam viec', 'ngay bat dau lv', 'ngay bat dau', 'ngay bd', 'ngaybatdau', 'ngày bắt đầu làm việc', 'ngày bắt đầu lv', 'ngày bắt đầu']),
          ngayHieuLuc: parseDateAny(r, ['ngay hieu luc chuc vu', 'ngay hieu luc cv', 'ngay hieu luc', 'ngayhl', 'ngayhieuluc', 'ngày hiệu lực chức vụ', 'ngày hiệu lực cv', 'ngày hiệu lực']),
          maNguoiTuyenDung: pickField(r, ['ma nguoi tuyen dung', 'ma nguoi td', 'ma ntd', 'manguoituyendung', 'ma dl td', 'ma tvv td', 'ma nguoi td', 'mã người tuyển dụng', 'mã người td', 'mã ntd']),
          tenNguoiTuyenDung: pickField(r, ['ten nguoi tuyen dung', 'ten nguoi td', 'ten ntd', 'tenguoituyendung', 'ten tvv td', 'ten người td', 'tên người tuyển dụng', 'tên người td', 'tên ntd']),
        })).filter(m => m.agentCode || m.agentName);
        if (members.length === 0) {
          failCount = data.length;
          suppressGenericToast = true;
          // Log keys để debug
          const sampleKeys = data[0] ? Object.keys(data[0]).join(', ') : '(empty)';
          toast({ title: 'Import thất bại', description: `Không tìm thấy cột hợp lệ. Header thực tế: ${sampleKeys}. Đảm bảo file có các cột: MÃ TVV, HỌ TÊN.`, variant: 'destructive' });
        } else {
          const r = await fetch('/api/tuyen-ngang', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ members }) });
          const result = await r.json().catch(() => ({}));
          if (r.ok) {
            const realCount = (result.created || 0) + (result.updated || 0);
            const errored = result.errored || 0;
            const dups = result.duplicatesSkipped || 0;
            if (realCount === 0 && errored === 0) {
              failCount = members.length;
              suppressGenericToast = true;
              toast({ title: 'Import thất bại', description: `0 dòng được lưu. Có thể header file không khớp.`, variant: 'destructive' });
            } else if (realCount === 0 && errored > 0) {
              failCount = members.length;
              suppressGenericToast = true;
              toast({ title: 'Import thất bại', description: `Tất cả ${errored} dòng lỗi. ${(result.errors || []).join(' | ')}`, variant: 'destructive' });
            } else {
              successCount = realCount;
              const errInfo = errored > 0 ? ` | ${errored} lỗi` : '';
              const dupInfo = dups > 0 ? ` | ${dups} trùng bị bỏ qua` : '';
              toast({ title: 'Import thành công', description: `${result.created || 0} mới + ${result.updated || 0} cập nhật${errInfo}${dupInfo}` });
              await fetchTuyenNgang();
            }
          } else {
            failCount = members.length;
            suppressGenericToast = true;
            toast({ title: 'Lỗi import TTN Tuyển Ngang', description: result.error || 'Kiểm tra lại dữ liệu', variant: 'destructive' });
          }
        }
      }
      if (failCount > 0 && !suppressGenericToast) {
        toast({ title: 'Import hoàn tất', description: `Thành công: ${successCount} dòng | Lỗi: ${failCount} dòng`, variant: 'destructive' });
      } else if (sheetName !== 'contracts' && !suppressGenericToast) {
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
  }, [parseDateValue, fetchAllData, fetchTuyenNgang]);

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
  // NTD (Người Tuyển Dụng) = TB + TN + TTN → gộp DS TB/TN (leaders) + DS TTN (recruiters), dedupe by agentCode
  const totalNTD = new Set([
    ...leaders.map(l => l.agentCode),
    ...recruiters.map(r => r.agentCode),
  ].filter(Boolean)).size;

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

  // NTD hoạt động: count unique maDaiLyTD that exist in DS TB/TN + DS TTN (NTD = TB+TN+TTN)
  const ntdCodes = new Set([
    ...leaders.map(l => l.agentCode),
    ...recruiters.map(r => r.agentCode),
  ].filter(Boolean));
  const activeNTDCount = new Set<string>();
  for (const c of periodContracts) {
    if (c.maDaiLyTD && ntdCodes.has(c.maDaiLyTD)) activeNTDCount.add(c.maDaiLyTD);
  }

  // Target values — ALL plans come from KẾ HOẠCH section only
  // AFYP plan: calculated from KẾ HOẠCH — AD = sum of 12 monthly values (nmc-kh-ad-${maAD}-t01..t12)
  const adPlansForTarget = new Map<string, number>();
  adList.forEach(ad => {
    let sum = 0;
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, '0');
      sum += parseFloat(onlineSettings[`nmc-kh-ad-${ad.maAD}-t${mm}`] || '0') || 0;
    }
    adPlansForTarget.set(ad.maAD, sum);
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
    // NTD tổng = TB + TN + TTN (gộp leaders + recruiters, dedupe by agentCode)
    {
      key: 'ntd-all', label: 'NTD (tất cả)', data: Array.from(new Map([
        ...leaders.map(l => [l.agentCode, l] as const),
        ...recruiters.map(r => [r.agentCode, r] as const),
      ].filter(([k]) => k))).map(([, v]) => v),
      fields: [
        { key: 'agentCode', label: 'Mã số (count)', type: 'string' },
      ],
    },
  ];

  const overviewDefaultKPIs: KPIConfig[] = [
    { id: 'ov-tb-tn', label: 'Trưởng Ban/Nhóm', dataSourceKey: 'leaders', field: 'salary', calculation: 'count', color: 'emerald' },
    { id: 'ov-tvv', label: 'Tổng TVV', dataSourceKey: 'tvvStruct', field: 'agentCode', calculation: 'count', color: 'sky' },
    { id: 'ov-ntd', label: 'NTD', dataSourceKey: 'ntd-all', field: 'agentCode', calculation: 'count', color: 'violet' },
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
      if (formatType === 'decimal') return String(Math.round(value));
      return formatNumber(value);
    };
    const formatTarget = () => {
      if (formatType === 'currency') return formatCurrency(target);
      if (formatType === 'decimal') return String(Math.round(target));
      return formatNumber(target);
    };

    return (
      <div className="rounded-none p-3 sm:p-4 relative overflow-hidden" style={{ backgroundColor: '#1E293B', boxShadow: '0 8px 24px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3), inset 0 -1px 0 rgba(255,255,255,0.05)' }}>
        {pct !== undefined && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 text-sm sm:text-lg font-black" style={{ color: pct >= 100 ? '#86EFAC' : pct >= 70 ? '#FDE68A' : '#FCA5A5' }}>
            {Math.round(pct)}%
          </div>
        )}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-none" style={{ backgroundColor: '#0F172A', boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.2)' }}>
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
    <div className="space-y-3 relative min-h-full">
      {/* ===== PHẦN 1: MOBILE MENU — 4 nút/hàng × 2 hàng = 8 ô (7 sheet + 1 Cài đặt), style đồng nhất PHẦN 2 & 3 ===== */}
      <div className="md:hidden">
        <div className="p-3 border border-white/10 space-y-3" style={{ backgroundColor: '#374151', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}>
          <p className="text-[10px] text-emerald-400/70 font-bold uppercase tracking-wider">Menu</p>
          <div className="grid grid-cols-4 gap-1.5">
            {SHEETS.map(sheet => {
              const color = SHEET_MOBILE_COLORS[sheet.key];
              const isActive = activeSheet === sheet.key;
              const Icon = sheet.icon;
              return (
                <div key={sheet.key} className="relative">
                  <button
                    onClick={() => {
                      if (sheet.key === 'report') {
                        // Chính sách — navigate directly to overview (no popup)
                        navigateTo({ sheet: 'report', policyOpen: null });
                        setSearchTerm('');
                        setSortField('');
                        setMobileMenuPopup(null);
                      } else if (sheet.hasSub) {
                        setMobileMenuPopup(mobileMenuPopup === sheet.key ? null : sheet.key);
                      } else {
                        navigateTo({ sheet: sheet.key });
                        setSearchTerm('');
                        setSortField('');
                        setMobileMenuPopup(null);
                      }
                    }}
                    className="w-full flex flex-col items-center justify-center gap-1 px-0.5 py-1 text-[11px] font-bold text-white transition-all aspect-square active:scale-90 active:brightness-75 active:shadow-inner"
                    style={{
                      backgroundColor: color,
                      borderRadius: 0,
                      boxShadow: isActive ? `0 0 0 2px #fff, 0 3px 6px rgba(0,0,0,0.4)` : '0 3px 6px rgba(0,0,0,0.4)',
                      opacity: isActive && (sheet.key === 'report' || !sheet.hasSub) ? 1 : 0.95,
                      minHeight: '52px',
                    }}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate w-full text-center leading-tight text-[11px]">{sheet.label}</span>
                    {sheet.hasSub && sheet.key !== 'report' && (
                      <ChevronDown className={`w-2.5 h-2.5 flex-shrink-0 transition-transform ${mobileMenuPopup === sheet.key ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                  {/* Popup sub-items (for revenue/report) — FIXED overlay centered, narrow on mobile, no rounded corners, divider lines between items */}
                  {sheet.hasSub && mobileMenuPopup === sheet.key && (
                    <>
                      <div className="fixed inset-0 z-[400] bg-black/40" onClick={() => setMobileMenuPopup(null)} />
                      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[500] bg-[#1a2332] border-2 border-emerald-500/60 max-h-[60vh] w-[72vw] max-w-[280px] overflow-y-auto shadow-2xl" style={{ borderRadius: 0 }}>
                        <div className="sticky top-0 bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1.5 border-b-2 border-emerald-500/60 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Icon className="w-3 h-3" /> Chọn {sheet.label}
                          </span>
                          <button onClick={() => setMobileMenuPopup(null)} className="text-white/70 hover:text-white active:scale-90 transition-transform">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {(sheet.key === 'revenue'
                          ? MONTHS.map(m => ({ key: m.key, label: m.label, Icon: m.key === 'all' ? TrendingUp : Calendar }))
                          : sheet.key === 'report'
                          ? POLICY_ITEMS.map(p => ({ key: p.key, label: p.label, Icon: p.icon }))
                          : STRUCTURE_SUBS.map(s => ({ key: s.key, label: s.label, Icon: s.icon }))
                        ).map(s => {
                          const subActive = (sheet.key === 'revenue' && revenueSub === s.key) || (sheet.key === 'report' && policyOpen === s.key) || (sheet.key === 'structure' && structureSub === s.key);
                          return (
                            <button
                              key={s.key}
                              onClick={() => {
                                if (sheet.key === 'revenue') {
                                  navigateTo({ sheet: 'revenue', revenueSub: s.key as RevenueSubKey });
                                } else if (sheet.key === 'report') {
                                  navigateTo({ sheet: 'report', policyOpen: s.key });
                                } else if (sheet.key === 'structure') {
                                  navigateTo({ sheet: 'structure', structureSub: s.key as StructureSubKey });
                                  if (s.key === 'tvv') fetchTvvStruct();
                                  else if (s.key === 'leaders') fetchLeaders();
                                  else if (s.key === 'recruiters') fetchRecruiters();
                                  else if (s.key === 'tuyen-ngang') fetchTuyenNgang();
                                  else if (s.key === 'clb-members' || s.key === 'pending-members') {
                                    // CLB/Pending DS dùng localStorage + autofill từ DS TVV/BanNhom/AD
                                    fetchTvvStruct();
                                    fetchBanNhom();
                                    fetchAD();
                                  }
                                }
                                setMobileMenuPopup(null);
                              }}
                              className={`w-full flex items-center gap-2 px-2.5 py-2 text-[11px] font-bold text-left hover:bg-emerald-500/20 active:scale-95 active:bg-emerald-500/30 transition-all border-b border-emerald-900/40 last:border-b-0 ${subActive ? 'text-emerald-300 bg-emerald-500/10' : 'text-emerald-100/80'}`}
                            >
                              <s.Icon className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate flex-1">{s.label}</span>
                              {subActive && <span className="text-emerald-400">●</span>}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {/* Số liệu Sao Việt button — placed before Cài đặt. Direct navigation to overview (no popup) */}
            <div className="relative">
              <button
                onClick={() => {
                  navigateTo({ sheet: 'saoviet', saovietOpen: null });
                  setSearchTerm('');
                  setSortField('');
                }}
                className="w-full flex flex-col items-center justify-center gap-1 px-0.5 py-1 text-[11px] font-bold text-white transition-all aspect-square active:scale-90 active:brightness-75 active:shadow-inner"
                style={{
                  backgroundColor: SHEET_MOBILE_COLORS.saoviet,
                  borderRadius: 0,
                  boxShadow: activeSheet === 'saoviet' ? `0 0 0 2px #fff, 0 3px 6px rgba(0,0,0,0.4)` : '0 3px 6px rgba(0,0,0,0.4)',
                  opacity: activeSheet === 'saoviet' ? 1 : 0.95,
                  minHeight: '52px',
                }}
                title="Sao Việt Toàn Chặng"
              >
                <Star className="w-5 h-5 flex-shrink-0" />
                <span className="truncate w-full text-center leading-tight text-[10px]">SV Toàn Chặng</span>
              </button>
            </div>
            {/* CLB Sao Việt button — same style as Sao Việt, pink color */}
            <div className="relative">
              <button
                onClick={() => {
                  navigateTo({ sheet: 'clb-saoviet', clbsvOpen: null });
                  setSearchTerm('');
                  setSortField('');
                }}
                className="w-full flex flex-col items-center justify-center gap-1 px-0.5 py-1 text-[11px] font-bold text-white transition-all aspect-square active:scale-90 active:brightness-75 active:shadow-inner"
                style={{
                  backgroundColor: SHEET_MOBILE_COLORS['clb-saoviet'],
                  borderRadius: 0,
                  boxShadow: activeSheet === 'clb-saoviet' ? `0 0 0 2px #fff, 0 3px 6px rgba(0,0,0,0.4)` : '0 3px 6px rgba(0,0,0,0.4)',
                  opacity: activeSheet === 'clb-saoviet' ? 1 : 0.95,
                  minHeight: '52px',
                }}
                title="CLB Sao Việt"
              >
                <Award className="w-5 h-5 flex-shrink-0" />
                <span className="truncate w-full text-center leading-tight text-[11px]">CLB SV</span>
              </button>
            </div>
            {/* Tôn vinh button — direct navigation to default sub-page (top5-tvv) */}
            <div className="relative">
              <button
                onClick={() => {
                  navigateTo({ sheet: 'vinh-danh', vinhdanhSub: 'top5-tvv' });
                  setSearchTerm('');
                  setSortField('');
                }}
                className="w-full flex flex-col items-center justify-center gap-1 px-0.5 py-1 text-[11px] font-bold text-white transition-all aspect-square active:scale-90 active:brightness-75 active:shadow-inner"
                style={{
                  backgroundColor: SHEET_MOBILE_COLORS['vinh-danh'],
                  borderRadius: 0,
                  boxShadow: activeSheet === 'vinh-danh' ? `0 0 0 2px #fff, 0 3px 6px rgba(0,0,0,0.4)` : '0 3px 6px rgba(0,0,0,0.4)',
                  opacity: activeSheet === 'vinh-danh' ? 1 : 0.95,
                  minHeight: '52px',
                }}
                title="Tôn vinh"
              >
                <Trophy className="w-5 h-5 flex-shrink-0" />
                <span className="truncate w-full text-center leading-tight text-[11px]">Tôn vinh</span>
              </button>
            </div>
            {/* 8th cell — Cài đặt button to balance the 4×2 grid (same size as other buttons).
                Khi chưa admin: ẩn nút Cài đặt, thay bằng cell trống (giữ layout 4×2). */}
            {isAdmin ? (
              <button
                onClick={() => setSettingsDialogOpen(true)}
                className="w-full flex flex-col items-center justify-center gap-1 px-0.5 py-1 text-[11px] font-bold text-white transition-all aspect-square active:scale-90 active:brightness-75 active:shadow-inner"
                style={{
                  backgroundColor: '#475569',
                  borderRadius: 0,
                  boxShadow: '0 3px 6px rgba(0,0,0,0.4)',
                  opacity: 0.95,
                  minHeight: '52px',
                }}
                title="Cài đặt hệ thống"
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
                <span className="truncate w-full text-center leading-tight text-[11px]">Cài đặt</span>
              </button>
            ) : (
              <div
                className="w-full aspect-square"
                style={{ backgroundColor: 'transparent', minHeight: '52px' }}
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      </div>

      {/* ===== PHẦN 2: Tổng quan năm — bọc trong div có nền xám tối + viền + đổ bóng (bằng 2 phần trên/dưới) ===== */}
      <div className="p-3 border border-white/10 space-y-3" style={{ backgroundColor: '#374151', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}>
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
            <PopoverContent className="bg-[#1a2332]/98 backdrop-blur-xl border-amber-500/30 w-72 p-3" align="end" sideOffset={4}>
              <div className="space-y-1">
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
          {/* Bỏ dòng "Đồng bộ lúc {time}" — đã có ở header trên cùng */}
        </div>
      </div>

      {/* 12 KPI cards — 3 cột/hàng (mobile) × 4 hàng, 6 cột/hàng (desktop) × 2 hàng — MỞ RỘNG + CHỮ TO */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
        {[
          { label: 'TỔNG AFYP', unit: 'trđ', value: formatKpiCurrency(totalRevenueAFYP), rawVal: totalRevenueAFYP, target: targetTongAFYP, targetFmt: formatKpiCurrency(targetTongAFYP), bg: '#2563EB', hasKH: true },
          { label: 'TỔNG IP', unit: 'trđ', value: formatKpiCurrency(totalRevenue), rawVal: totalRevenue, target: 0, targetFmt: '', bg: '#059669', hasKH: false },
          { label: 'TỶ TRỌNG IP', unit: '%', value: Math.round(ipAfypRatio) + '%', rawVal: ipAfypRatio, target: 0, targetFmt: '', bg: '#0891B2', hasKH: false },
          { label: 'LƯỢT HĐ', unit: 'lượt', value: formatNumber(luotHoatDong), rawVal: luotHoatDong, target: 0, targetFmt: '', bg: '#7C3AED', hasKH: false },
          { label: 'LƯỢT HĐ CHUẨN', unit: 'lượt', value: formatNumber(luotHDChuan), rawVal: luotHDChuan, target: 0, targetFmt: '', bg: '#DC2626', hasKH: false },
          { label: 'SL HĐ', unit: 'HĐ', value: formatNumber(totalRevenueContractCount), rawVal: totalRevenueContractCount, target: 0, targetFmt: '', bg: '#D97706', hasKH: false },
          { label: 'NĂNG SUẤT', unit: 'HĐ/lượt', value: nangSuat.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rawVal: nangSuat, target: 0, targetFmt: '', bg: '#0284C7', hasKH: false },
          { label: 'ĐL HĐ', unit: 'trđ', value: formatKpiCurrency(doLonHD), rawVal: doLonHD, target: 0, targetFmt: '', bg: '#059669', hasKH: false },
          { label: 'SL TB/TN', unit: 'người', value: formatNumber(totalStaff), rawVal: totalStaff, target: 0, targetFmt: '', bg: '#7C3AED', hasKH: false },
          { label: 'SL NTD', unit: 'người', value: formatNumber(totalNTD), rawVal: totalNTD, target: 0, targetFmt: '', bg: '#CA8A04', hasKH: false },
          { label: 'SL TUYỂN DỤNG', unit: 'người', value: formatNumber(slTuyenDungNam), rawVal: slTuyenDungNam, target: 0, targetFmt: '', bg: '#0D9488', hasKH: false },
          { label: 'TỔNG SỐ TVV', unit: 'người', value: formatNumber(tvvStructList.length), rawVal: tvvStructList.length, target: 0, targetFmt: '', bg: '#475569', hasKH: false },
        ].map((kpi, i) => {
          const pct = kpi.target > 0 ? (kpi.rawVal / kpi.target) * 100 : 0;
          return (
            <div key={i} className="rounded-none overflow-hidden" style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.1)' }}>
              <div className="px-2 py-1 sm:px-2.5 sm:py-1.5 flex items-center justify-between gap-1" style={{ backgroundColor: kpi.bg }}>
                <p className="text-white text-[8px] sm:text-[10px] font-bold leading-tight uppercase tracking-wider whitespace-nowrap truncate">
                  {kpi.label}{!kpi.hasKH && <span className="text-white/60 text-[6px] sm:text-[8px] font-normal italic"> ({kpi.unit})</span>}
                </p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {kpi.hasKH && kpi.target > 0 && (
                    <span className="text-white/50 text-[6px] sm:text-[7px] font-semibold">{kpi.targetFmt}</span>
                  )}
                  {kpi.target > 0 && (
                    <span className="text-[9px] sm:text-xs font-black" style={{ color: pct >= 100 ? '#86EFAC' : pct >= 70 ? '#FDE68A' : '#FCA5A5' }}>
                      {Math.round(pct)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-white px-2 py-1 sm:px-2.5 sm:py-1.5 text-center">
                <p className="text-base sm:text-xl font-black leading-tight" style={{ color: kpi.bg }}>{kpi.value}</p>
              </div>
            </div>
          );
        })}
      </div>
      </div>{/* end PHẦN 2: Tổng quan năm */}

      {/* PHẦN 3: Kế hoạch AFYP từng tháng — list view: T1-T12 cột trái, KH (amber) | TH (sky) 2 cột phải, gọn hơn PHẦN 2 */}
      <div className="p-2 sm:p-3 border border-white/10 space-y-2" style={{ backgroundColor: '#374151', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 flex items-center justify-center rounded-none" style={{ backgroundColor: '#0F172A', boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.2)' }}>
            <Calendar className="w-3 h-3 text-emerald-400" />
          </div>
          <h3 className="text-[11px] sm:text-sm font-bold text-white/80 uppercase tracking-wider">Kế hoạch AFYP từng tháng</h3>
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
            <div className="p-2 rounded border border-amber-500/30 bg-amber-500/5 flex items-center justify-between flex-wrap gap-2">
              <span className="text-[10px] text-amber-300 font-bold">{getPeriodLabel(overviewPeriod)}:</span>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-white/60">KH: <span className="text-amber-400 font-bold">{formatSmartCurrency(aggPlan)}</span></span>
                <span className="text-white/60">TH: <span className="text-sky-400 font-bold">{formatSmartCurrency(aggActual)}</span></span>
                <span className={`font-black ${aggPct >= 100 ? 'text-emerald-400' : aggPct >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>{Math.round(aggPct)}%</span>
              </div>
            </div>
          );
        })()}
        {/* Legend — KH amber, TH sky */}
        <div className="flex items-center gap-3 text-[9px] sm:text-[10px] font-bold px-1">
          <span className="flex items-center gap-1 text-amber-400"><span className="w-2.5 h-2.5 bg-amber-500 inline-block"></span> Kế hoạch</span>
          <span className="flex items-center gap-1 text-sky-400"><span className="w-2.5 h-2.5 bg-sky-500 inline-block"></span> Thực hiện</span>
          <span className="text-white/30 ml-auto">Tổng KH năm: {formatSmartCurrency(targetTongAFYP)}</span>
        </div>
        {/* 12 dòng — mỗi dòng: [T1] [KH amber] [TH sky] — gọn, số to */}
        <div className="space-y-0.5">
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
              <div key={i} className={`grid grid-cols-[28px_1fr_1fr_auto] gap-1 items-center px-1 py-0.5 ${isInPeriod && overviewPeriod !== 'year' ? 'ring-1 ring-amber-400/60' : ''}`} style={{ backgroundColor: isCurrent ? '#0F766E' : isInPeriod && overviewPeriod !== 'year' ? '#1a2744' : '#0F172A', boxShadow: isCurrent ? '0 0 6px rgba(15,118,110,0.4)' : 'inset 0 -1px 0 rgba(255,255,255,0.04)' }}>
                {/* T1-T12 — cột trái, cố định 28px */}
                <span className={`text-[11px] sm:text-sm font-black text-center ${isCurrent ? 'text-white' : isInPeriod && overviewPeriod !== 'year' ? 'text-amber-300' : 'text-gray-400'}`}>T{i + 1}</span>
                {/* Kế hoạch — màu AMBER (#F59E0B) — full VND "đ" theo yêu cầu user */}
                <span className="text-[10px] sm:text-xs font-black text-amber-400 text-right pr-1 whitespace-nowrap">
                  {monthlyPlan > 0 ? formatSmartCurrency(monthlyPlan) : '—'}
                </span>
                {/* Thực hiện — màu SKY (#0EA5E9) — full VND "đ" theo yêu cầu user */}
                <span className={`text-[10px] sm:text-xs font-black text-right pr-1 whitespace-nowrap ${actualAFYP === 0 ? 'text-gray-600' : pct >= 100 ? 'text-sky-300' : 'text-sky-400'}`}>
                  {actualAFYP > 0 ? formatSmartCurrency(actualAFYP) : '—'}
                </span>
                {/* % đạt — cột phải */}
                <span className={`text-[9px] sm:text-[10px] font-black text-right w-9 ${monthlyPlan > 0 ? (pct >= 100 ? 'text-emerald-400' : pct >= 70 ? 'text-amber-400' : 'text-rose-400') : 'text-gray-600'}`}>
                  {monthlyPlan > 0 ? `${Math.round(pct)}%` : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly AFYP Progress Chart — 2-column: Kế hoạch vs Thực hiện (chỉ desktop, ẩn trên mobile) */}
      <div className="hidden md:block">
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
          <div className="rounded-none p-3 sm:p-5" style={{ backgroundColor: '#1E293B', boxShadow: '0 8px 24px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 flex items-center justify-center rounded-none" style={{ backgroundColor: '#0F172A', boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.2)' }}>
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
                          title={`T${d.index + 1} TH: ${formatCurrency(d.afyp)} | ${d.count} HĐ${d.target > 0 ? ` | ${Math.round(pct)}%` : ''}`}
                        ></div>
                      </div>
                      <p className={`text-[10px] mt-1 font-black ${isCurrent ? 'text-emerald-400' : isInPeriod && overviewPeriod !== 'year' ? 'text-amber-300' : 'text-white/40'}`}>T{d.index + 1}</p>
                      {d.afyp > 0 && (
                        <p className={`text-[9px] font-black ${reached ? 'text-emerald-400' : 'text-sky-400'}`}>
                          {d.afyp >= 1_000_000 ? `${Math.round(d.afyp / 1_000_000)}tr` : formatNumber(Math.round(d.afyp))}
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
    </div>
  );

  // ========== RENDER: Kế hoạch ==========
  const renderKeHoach = () => {
    // Monthly ratio from settings (tỷ lệ % từng tháng)
    const monthlyRatios = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, '0');
      return parseFloat(onlineSettings[`nmc-kh-ratio-${m}`] || '0') || 0;
    });

    // ===== AD plan: 12 monthly values per AD =====
    // Storage keys: nmc-kh-ad-${maAD}-t01 ... nmc-kh-ad-${maAD}-t12
    // AD annual = sum of 12 months. Phong = sum of ADs. Công ty = sum of Phòng.
    const readAdMonthlyPlan = (maAD: string, month: number): number => {
      const mm = String(month).padStart(2, '0');
      return parseFloat(onlineSettings[`nmc-kh-ad-${maAD}-t${mm}`] || '0') || 0;
    };
    const readAdAnnualPlan = (maAD: string): number => {
      let sum = 0;
      for (let m = 1; m <= 12; m++) sum += readAdMonthlyPlan(maAD, m);
      return sum;
    };

    // AFYP plan per AD (annual = sum of 12 months)
    const adPlans = new Map<string, number>();
    adList.forEach(ad => {
      adPlans.set(ad.maAD, readAdAnnualPlan(ad.maAD));
    });

    // AFYP plan per AD per month (for monthly breakdown)
    const adMonthlyPlans = new Map<string, number[]>();
    adList.forEach(ad => {
      adMonthlyPlans.set(ad.maAD, Array.from({ length: 12 }, (_, i) => readAdMonthlyPlan(ad.maAD, i + 1)));
    });

    // AFYP plan per Nhóm (from settings — unchanged, annual scalar)
    const nhomPlans = new Map<string, number>();
    banNhomList.forEach(bn => {
      const val = parseFloat(onlineSettings[`nmc-kh-nhom-${bn.maBanNhom}`] || '0') || 0;
      nhomPlans.set(bn.maBanNhom, val);
    });

    // Auto-calculate: Phòng = sum of its ADs (annual)
    const phongPlans = new Map<string, number>();
    phongList.forEach(p => {
      const sum = adList.filter(ad => ad.maPhong === p.maPhong).reduce((s, ad) => s + (adPlans.get(ad.maAD) || 0), 0);
      phongPlans.set(p.maPhong, sum);
    });

    // Auto-calculate: Công ty = sum of all Phòng (annual)
    const congTyPlan = phongList.reduce((s, p) => s + (phongPlans.get(p.maPhong) || 0), 0);

    // Auto-calculate: Công ty per month = sum of all ADs' value for that month
    const congTyMonthlyPlans = Array.from({ length: 12 }, (_, i) => {
      return adList.reduce((s, ad) => s + (adMonthlyPlans.get(ad.maAD)?.[i] || 0), 0);
    });

    // Total annual ratio check
    const totalRatio = monthlyRatios.reduce((s, r) => s + r, 0);

    const saveRatio = (m: string, val: string) => {
      saveSetting(`nmc-kh-ratio-${m}`, val);
      setKhEditRatio(null);
    };

    const saveADPlanMonth = (maAD: string, month: number, val: number) => {
      const mm = String(month).padStart(2, '0');
      saveSetting(`nmc-kh-ad-${maAD}-t${mm}`, String(val));
    };

    const saveNhomPlan = (maBanNhom: string, val: number) => {
      saveSetting(`nmc-kh-nhom-${maBanNhom}`, String(val));
    };

    // Helper: format plan value — hiển thị đầy đủ đơn vị đ (theo yêu cầu user)
    const fmtPlan = (val: number) => {
      if (val <= 0) return '—';
      return formatCurrency(val);
    };

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-emerald-400 neon-text drop-shadow-[0_0_6px_rgba(0,255,136,0.3)]">Kế hoạch AFYP năm {currentYear}</h2>
          <Popover open={khSettingsOpen} onOpenChange={setKhSettingsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="h-8 px-3 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/30">
                <Settings className="w-3.5 h-3.5 mr-1" /> Cài đặt KH
              </Button>
            </PopoverTrigger>
            <PopoverContent className="bg-[#1a2332]/98 backdrop-blur-xl border-amber-500/30 w-[95vw] max-w-[800px] p-4 max-h-[85vh] overflow-y-auto" align="end" sideOffset={4}>
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
                    Tổng tỷ lệ: {Math.round(totalRatio)}% {Math.abs(totalRatio - 100) < 0.1 ? '✓' : '(nên = 100%)'}
                  </p>
                </div>

                {/* AD plans — 12 monthly inputs per AD */}
                <div>
                  <p className="text-[10px] text-gray-400 mb-1">Kế hoạch AFYP — AD (12 tháng/năm; Tổng năm = Σ 12 tháng; Phòng = Σ AD)</p>
                  {phongList.map(p => {
                    const adsOfPhong = adList.filter(ad => ad.maPhong === p.maPhong);
                    const phongTotal = phongPlans.get(p.maPhong) || 0;
                    return (
                      <div key={p.maPhong} className="mb-3">
                        <div className="flex items-center justify-between bg-amber-500/10 px-2 py-1 rounded-t border-b border-amber-500/20">
                          <span className="text-[10px] text-amber-300 font-bold">{p.tenPhong}</span>
                          <span className="text-[10px] text-amber-200 font-bold">Σ năm: {phongTotal > 0 ? formatSmartCurrency(phongTotal) : '—'}</span>
                        </div>
                        {adsOfPhong.map(ad => {
                          const monthly = adMonthlyPlans.get(ad.maAD) || Array.from({ length: 12 }, () => 0);
                          const annual = adPlans.get(ad.maAD) || 0;
                          return (
                            <div key={ad.maAD} className="px-2 py-1 border-b border-gray-800 hover:bg-gray-800/50">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-sky-300 font-bold flex-1 truncate">├ {ad.tenAD}</span>
                                <span className="text-[9px] text-amber-400 font-bold ml-2 whitespace-nowrap">Σ: {annual > 0 ? formatSmartCurrency(annual) : '—'}</span>
                              </div>
                              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                                {monthly.map((val, i) => (
                                  <div key={i} className="text-center">
                                    <p className="text-[8px] text-gray-500 font-bold mb-0.5">T{i + 1}</p>
                                    <input
                                      type="number"
                                      value={val || ''}
                                      onChange={e => saveADPlanMonth(ad.maAD, i + 1, parseFloat(e.target.value) || 0)}
                                      placeholder="—"
                                      className="w-full h-6 text-[9px] text-right bg-gray-800 border border-gray-700 text-amber-300 rounded px-0.5 hover:border-amber-500/50 focus:border-amber-400 outline-none"
                                    />
                                  </div>
                                ))}
                              </div>
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
                  AD: nhập KH 12 tháng trực tiếp • Phòng = Σ AD • Công ty = Σ Phòng • Nhóm: KH năm × tỷ lệ tháng
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Minimap: Công ty — KH năm tổng */}
        <div className="rounded-sm p-2.5 sm:p-3" style={{ backgroundColor: '#1E293B', boxShadow: '0 8px 24px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3)' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 flex items-center justify-center rounded-sm" style={{ backgroundColor: '#0F172A', boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.2)' }}>
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Công ty — Kế hoạch năm</p>
              <p className="text-amber-400 text-base sm:text-lg font-black">{congTyPlan > 0 ? formatSmartCurrency(congTyPlan) : '—'}</p>
            </div>
          </div>
          {congTyPlan > 0 && (
            <p className="text-[8px] text-white/30 mt-0.5">Phân bổ theo 12 tháng bên dưới</p>
          )}
        </div>

        {/* Minimap: 12 tháng — chỉ KH tháng */}
        <div className="rounded-sm p-2.5 sm:p-3" style={{ backgroundColor: '#1E293B', boxShadow: '0 8px 24px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 flex items-center justify-center rounded-sm" style={{ backgroundColor: '#0F172A', boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.2)' }}>
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <h3 className="text-[10px] sm:text-xs font-bold text-white/80 uppercase tracking-wider">KH AFYP từng tháng</h3>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1 sm:gap-1.5">
            {Array.from({ length: 12 }, (_, i) => {
              const m = String(i + 1).padStart(2, '0');
              const ratio = monthlyRatios[i] || 0;
              // Monthly KH at company level = Σ all ADs' value for that month
              // (AD uses 12 monthly inputs directly; ratio only applies to Nhóm annual → monthly)
              const monthlyPlan = congTyMonthlyPlans[i] || 0;
              const isCurrent = i + 1 === new Date().getMonth() + 1;
              return (
                <div key={i} className="rounded-sm p-1 sm:p-1.5 text-center" style={{ backgroundColor: isCurrent ? '#0F766E' : '#0F172A', boxShadow: isCurrent ? '0 0 8px rgba(15,118,110,0.4)' : 'none' }}>
                  <p className={`text-[9px] sm:text-[10px] font-bold mb-0.5 ${isCurrent ? 'text-white' : 'text-gray-400'}`}>T{i + 1}</p>
                  <p className="text-[7px] sm:text-[8px] text-gray-500">{ratio > 0 ? `${ratio}%` : '—'}</p>
                  <p className="text-[8px] sm:text-[9px] text-amber-400 font-bold mt-0.5">{monthlyPlan > 0 ? fmtPlan(monthlyPlan) : '—'}</p>
                </div>
              );
            })}
          </div>
          <p className="text-[8px] sm:text-[9px] text-white/30 mt-1.5">KH tháng (công ty) = Σ KH tháng của tất cả AD | Tổng KH năm: {formatSmartCurrency(congTyPlan)}</p>
        </div>

        {/* Minimap: Phòng → AD → Nhóm hierarchy — chỉ KH */}
        {phongList.map(p => {
          const adsOfPhong = adList.filter(ad => ad.maPhong === p.maPhong);
          const phongPlan = phongPlans.get(p.maPhong) || 0;
          return (
            <div key={p.maPhong} className="rounded-sm overflow-hidden" style={{ backgroundColor: '#1E293B', boxShadow: '0 8px 24px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3)' }}>
              {/* Phòng header */}
              <div className="px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center justify-between" style={{ backgroundColor: '#0F172A', boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.2)' }}>
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] sm:text-xs font-bold text-amber-300">{p.tenPhong}</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-amber-400 text-xs sm:text-sm font-black">{phongPlan > 0 ? formatSmartCurrency(phongPlan) : '—'}</span>
                  <span className="text-[8px] text-gray-500 font-semibold">KH năm</span>
                </div>
              </div>
              {/* AD rows */}
              {adsOfPhong.map(ad => {
                const nhomsOfAD = banNhomList.filter(bn => bn.maAD === ad.maAD);
                const adPlan = adPlans.get(ad.maAD) || 0;
                return (
                  <div key={ad.maAD}>
                    <div className="px-2.5 py-1 sm:px-3 flex items-center justify-between border-t border-gray-800/50 hover:bg-gray-800/30">
                      <span className="text-[9px] sm:text-[10px] text-sky-300 font-bold">AD: {ad.tenAD}</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-amber-400/90 text-[9px] sm:text-[10px] font-bold">{adPlan > 0 ? formatSmartCurrency(adPlan) : '—'}</span>
                        <span className="text-[7px] text-gray-600">KH năm</span>
                      </div>
                    </div>
                    {/* Nhóm mini rows */}
                    {nhomsOfAD.map(bn => {
                      const bnPlan = nhomPlans.get(bn.maBanNhom) || 0;
                      return (
                        <div key={bn.maBanNhom} className="px-2.5 py-0.5 sm:px-5 flex items-center justify-between border-t border-gray-800/20 hover:bg-gray-800/20">
                          <span className="text-[8px] sm:text-[9px] text-gray-400 truncate max-w-[50%]">├ {bn.tenBanNhom}</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-amber-400/70 text-[8px] sm:text-[9px] font-bold">{bnPlan > 0 ? formatSmartCurrency(bnPlan) : '—'}</span>
                            <span className="text-[6px] text-gray-600">KH</span>
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
            { label: 'Tổng TTN', value: formatNumber(kpiTotalNTD), bg: '#7C3AED', badge: '#6D28D9', icon: UserCircle },
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

  // ========== RENDER: Tuyen Ngang (DS TTN Tuyển Ngang) ==========
  // Columns: STT - NHÓM - MÃ TVV - HỌ TÊN - Ngày bắt đầu làm việc - Ngày hiệu lực chức vụ - MÃ NGƯỜI TUYỂN DỤNG - TÊN NGƯỜI TUYỂN DỤNG
  const renderTuyenNgang = () => {
    const filtered = getFiltered(getSorted(tuyenNgangList), ['agentCode', 'agentName', 'nhom', 'maNguoiTuyenDung', 'tenNguoiTuyenDung']);
    return (
      <div>
        {/* KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {[
            { label: 'Tổng TTN', value: formatNumber(filtered.length), bg: '#0D9488', badge: '#0F766E', icon: Merge },
            { label: 'Có người TD', value: formatNumber(filtered.filter(t => t.maNguoiTuyenDung).length), bg: '#059669', badge: '#047857', icon: CheckCircle2 },
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
          <Button onClick={addTuyenNgang} className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 h-8 text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> Thêm</Button>
          <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 rounded-md text-xs font-medium cursor-pointer"><Upload className="w-3.5 h-3.5" /> Import<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleImport('tuyen-ngang', e)} /></label>
          <Button onClick={() => handleDownloadTemplate('tuyen-ngang')} variant="outline" className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 h-8 text-xs"><FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Tải mẫu</Button>
          <Button onClick={() => handleExport('tuyen-ngang')} variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 h-8 text-xs"><Download className="w-3.5 h-3.5 mr-1" /> Xuất</Button>
        </div>
        <div className="overflow-auto border border-emerald-600" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <Table>
            <TableHeader className="sticky top-0 z-10"><TableRow className="bg-emerald-800 hover:bg-emerald-800 border-b border-emerald-700">
              <TableHead className="text-yellow-100 text-xs font-bold uppercase whitespace-nowrap w-[40px]">STT</TableHead>
              {[
                { f: 'nhom', l: 'Nhóm' },
                { f: 'agentCode', l: 'Mã TVV' },
                { f: 'agentName', l: 'Họ tên' },
                { f: 'ngayBatDau', l: 'Ngày bắt đầu LV' },
                { f: 'ngayHieuLuc', l: 'Ngày hiệu lực CV' },
                { f: 'maNguoiTuyenDung', l: 'Mã người TD' },
                { f: 'tenNguoiTuyenDung', l: 'Tên người TD' },
              ].map(col => (
                <TableHead key={col.f} className="text-yellow-100 text-xs font-bold uppercase cursor-pointer hover:text-amber-300 whitespace-nowrap" onClick={() => sortData(col.f)}>{col.l} <SortIcon field={col.f} /></TableHead>
              ))}
              <TableHead className="text-yellow-100 text-xs uppercase w-[40px]"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((t, idx) => (
                <TableRow key={t.id} className="bg-white hover:bg-emerald-50 border-b border-gray-200">
                  <TableCell className="text-xs text-gray-500 text-center">{idx + 1}</TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={t.nhom} onSave={(v) => updateTuyenNgang(t.id, 'nhom', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={t.agentCode} onSave={(v) => updateTuyenNgang(t.id, 'agentCode', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={t.agentName} onSave={(v) => updateTuyenNgang(t.id, 'agentName', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={t.ngayBatDau || ''} onSave={(v) => updateTuyenNgang(t.id, 'ngayBatDau', v)} type="date" /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={t.ngayHieuLuc || ''} onSave={(v) => updateTuyenNgang(t.id, 'ngayHieuLuc', v)} type="date" /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={t.maNguoiTuyenDung} onSave={(v) => updateTuyenNgang(t.id, 'maNguoiTuyenDung', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={t.tenNguoiTuyenDung} onSave={(v) => updateTuyenNgang(t.id, 'tenNguoiTuyenDung', v)} /></TableCell>
                  <TableCell className="text-xs p-1"><Button variant="ghost" size="sm" onClick={() => deleteTuyenNgang(t.id)} className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 className="w-3 h-3" /></Button></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-gray-500 text-sm py-8">Chưa có dữ liệu</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-gray-500 mt-2">{filtered.length} dòng • Nháy đúp ô để sửa</p>
      </div>
    );
  };

  // ========== RENDER: DS TVV (Tổng) ==========
  // Danh sách TVV tổng của công ty — bao gồm tất cả chức vụ (TVV, TB, TN, TTN)
  // Đây là nguồn đối tượng CHÍNH cho các chính sách TVV (TVVm, NS-TVV, Quý-TVV)
  // Columns: Mã TVV - Tên TVV - Mã Ban/Nhóm - Tên Ban/Nhóm - Chức vụ - Ngày bắt đầu LV - Mã TVV Tuyển dụng - Tên TVV Tuyển dụng - Ghi chú
  const renderTvvList = () => {
    const filtered = getFiltered(getSorted(tvvStructList), ['agentCode', 'agentName', 'maBanNhom', 'chucVu', 'maTVVTuyendung', 'note']);
    // Resolve tên Ban/Nhóm + tên TVV Tuyển dụng từ mã
    const resolveTenBanNhom = (maBanNhom: string) => {
      if (!maBanNhom) return '';
      return banNhomList.find(b => b.maBanNhom === maBanNhom)?.tenBanNhom || '';
    };
    const resolveTenTVVTuyendung = (maTD: string) => {
      if (!maTD || !maTD.trim()) return '';
      const td = tvvStructList.find(t => t.agentCode === maTD.trim());
      return td?.agentName || maTD.trim();
    };

    // Update inline cell — gọi PATCH /api/structure/tvv/:id
    const updateTvvInline = async (id: string, field: keyof TVVStructItem, value: string) => {
      try {
        const res = await fetch(`/api/structure/tvv/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value }),
        });
        if (res.ok) {
          setTvvStructList(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
        }
      } catch { /* silent */ }
    };

    return (
      <div>
        {/* KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {[
            { label: 'Tổng TVV', value: formatNumber(filtered.length), bg: '#0D9488', badge: '#0F766E', icon: Users },
            { label: 'TVVm (≤12 tháng)', value: formatNumber(filtered.filter(t => isTVVm(t.ngayBatDau)).length), bg: '#059669', badge: '#047857', icon: TrendingUp },
            { label: 'Trưởng Ban/Nhóm', value: formatNumber(filtered.filter(t => {
              const cv = (t.chucVu || '').toLowerCase();
              return cv.includes('trưởng ban') || cv.includes('trưởng nhóm') || cv.includes('tiền trưởng') || cv.includes('trưởng tổ');
            }).length), bg: '#7C3AED', badge: '#6D28D9', icon: UserCog },
            { label: 'Có mã TVV TD', value: formatNumber(filtered.filter(t => t.maTVVTuyendung && t.maTVVTuyendung.trim()).length), bg: '#2563EB', badge: '#1D4ED8', icon: UserCircle },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div key={i} className="rounded-none p-3 sm:p-4" style={{ backgroundColor: kpi.bg, boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 flex items-center justify-center rounded-none" style={{ backgroundColor: kpi.badge }}><Icon className="w-4 h-4 text-white" /></div>
                  <p className="text-white/80 text-[10px] sm:text-xs font-bold leading-tight uppercase tracking-wider">{kpi.label}</p>
                </div>
                <p className="text-white text-xl sm:text-2xl font-black truncate leading-tight">{kpi.value}</p>
              </div>
            );
          })
          }
        </div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Button onClick={() => setAddTvvOpen(true)} className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 h-8 text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> Thêm</Button>
          {/* Upsert TVV từ file Excel */}
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            id="tvv-list-upsert-input"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpsertTvvFile(f); e.target.value = ''; }}
          />
          <label htmlFor="tvv-list-upsert-input" className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 rounded-md text-xs font-medium cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> Cập nhật DS TVV
          </label>
          <Button onClick={() => handleDownloadTemplate('structure-tvv')} variant="outline" className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 h-8 text-xs"><FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Tải mẫu</Button>
          <Button onClick={() => handleExport('structure-tvv')} variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 h-8 text-xs"><Download className="w-3.5 h-3.5 mr-1" /> Xuất</Button>
        </div>
        <div className="overflow-auto border border-emerald-600" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <Table>
            <TableHeader className="sticky top-0 z-10"><TableRow className="bg-emerald-800 hover:bg-emerald-800 border-b border-emerald-700">
              {[
                { f: 'agentCode', l: 'Mã TVV' },
                { f: 'agentName', l: 'Họ tên' },
                { f: 'maBanNhom', l: 'Mã Ban/Nhóm' },
                { f: '_tenBanNhom', l: 'Tên Ban/Nhóm' },
                { f: 'chucVu', l: 'Chức vụ' },
                { f: 'ngayBatDau', l: 'Ngày bắt đầu LV' },
                { f: 'maTVVTuyendung', l: 'Mã TVV TD' },
                { f: '_tenTVVTuyendung', l: 'Tên TVV TD' },
                { f: 'note', l: 'Ghi chú' },
              ].map(col => (
                <TableHead key={col.f} className="text-yellow-100 text-xs font-bold uppercase cursor-pointer hover:text-amber-300 whitespace-nowrap" onClick={() => sortData(col.f)}>{col.l} <SortIcon field={col.f} /></TableHead>
              ))}
              <TableHead className="text-yellow-100 text-xs uppercase w-[80px]"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(t => (
                <TableRow key={t.id} className="bg-white hover:bg-emerald-50 border-b border-gray-200">
                  <TableCell className="text-xs p-0"><EditableCell value={t.agentCode} onSave={(v) => updateTvvInline(t.id, 'agentCode', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={t.agentName} onSave={(v) => updateTvvInline(t.id, 'agentName', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={t.maBanNhom} onSave={(v) => updateTvvInline(t.id, 'maBanNhom', v)} /></TableCell>
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap p-2">{resolveTenBanNhom(t.maBanNhom) || '—'}</TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={t.chucVu} onSave={(v) => updateTvvInline(t.id, 'chucVu', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={t.ngayBatDau || ''} onSave={(v) => updateTvvInline(t.id, 'ngayBatDau', v)} type="date" /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={t.maTVVTuyendung || ''} onSave={(v) => updateTvvInline(t.id, 'maTVVTuyendung', v)} /></TableCell>
                  <TableCell className="text-xs text-violet-700 whitespace-nowrap p-2">{resolveTenTVVTuyendung(t.maTVVTuyendung) || '—'}</TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={t.note} onSave={(v) => updateTvvInline(t.id, 'note', v)} /></TableCell>
                  <TableCell className="text-xs p-1 flex items-center gap-0.5">
                    <Button variant="ghost" size="sm" onClick={() => setEditingTvv(t)} className="h-6 w-6 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"><Edit2 className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteTvv(t.id)} className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 className="w-3 h-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-gray-500 text-sm py-8">Chưa có dữ liệu</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-gray-500 mt-2">{filtered.length} dòng • Nháy đúp ô để sửa • Đây là nguồn đối tượng cho các chính sách TVV</p>
      </div>
    );
  };

  // ========== RENDER: DS Thành viên CLB ==========
  // Bảng 7 cột: STT - AD - NHÓM - MÃ TVV - HỌ TÊN TVV - CHỨC VỤ - GHI CHÚ
  // Dữ liệu lưu DB (đồng bộ đa thiết bị) — bảng ClbMember
  // Khi nhập MÃ TVV → tự động điền AD/Nhóm/HỌ TÊN TVV từ DS TVV tổng
  const renderCLBMembers = () => {
    const filtered = getFiltered(clbMembers, ['ad', 'nhom', 'agentCode', 'agentName', 'chucVu', 'note']);
    // Khi thay MÃ TVV → autofill AD/Nhóm/HỌ TÊN TVV, rồi PATCH tất cả field về DB
    const handleAgentCodeChange = async (id: string, newCode: string) => {
      const auto = autofillFromAgentCode(newCode);
      if (auto) {
        const patch = {
          agentCode: newCode,
          ad: auto.ad || '',
          nhom: auto.nhom || '',
          agentName: auto.agentName || '',
        };
        // Optimistic update
        setClbMembers(prev => prev.map(m => m.id === id ? {
          ...m, ...patch,
          ad: patch.ad || m.ad,
          nhom: patch.nhom || m.nhom,
          agentName: patch.agentName || m.agentName,
        } : m));
        try {
          const r = await fetch(`/api/clb-members/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
          });
          if (!r.ok) { await fetchClbMembers(); toast({ title: 'Lỗi lưu', variant: 'destructive' }); }
        } catch { await fetchClbMembers(); toast({ title: 'Lỗi mạng', variant: 'destructive' }); }
      } else {
        updateClbMember(id, 'agentCode', newCode);
      }
    };
    return (
      <div>
        {/* Title với số thứ tự in đậm vàng */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-amber-400 font-black text-base">01.</span>
          <h2 className="text-sm font-bold text-emerald-300 uppercase tracking-wider">Danh sách Thành viên CLB</h2>
        </div>
        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {[
            { label: 'Tổng thành viên', value: formatNumber(filtered.length), bg: '#0D9488', badge: '#0F766E', icon: UserCheck },
            { label: 'Có mã TVV', value: formatNumber(filtered.filter(m => m.agentCode).length), bg: '#059669', badge: '#047857', icon: CheckCircle2 },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div key={i} className="rounded-none p-3 sm:p-4" style={{ backgroundColor: kpi.bg, boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 flex items-center justify-center rounded-none" style={{ backgroundColor: kpi.badge }}><Icon className="w-4 h-4 text-white" /></div>
                  <p className="text-white/80 text-[10px] sm:text-xs font-bold leading-tight uppercase tracking-wider">{kpi.label}</p>
                </div>
                <p className="text-white text-xl sm:text-2xl font-black truncate leading-tight">{kpi.value}</p>
              </div>
            );
          })
          }
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Button onClick={addClbMember} className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 h-8 text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> Thêm</Button>
          <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 rounded-md text-xs font-medium cursor-pointer"><Upload className="w-3.5 h-3.5" /> Import Excel<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleImportCLBorPending('clb-members', e)} /></label>
          <Button onClick={() => handleExportCLBorPending('clb-members')} variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 h-8 text-xs"><Download className="w-3.5 h-3.5 mr-1" /> Xuất</Button>
        </div>
        {/* Bảng 7 cột */}
        <div className="overflow-auto border border-emerald-600" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <Table>
            <TableHeader className="sticky top-0 z-10"><TableRow className="bg-emerald-800 hover:bg-emerald-800 border-b border-emerald-700">
              <TableHead className="text-yellow-100 text-xs font-bold uppercase whitespace-nowrap w-[40px]">STT</TableHead>
              <TableHead className="text-yellow-100 text-xs font-bold uppercase whitespace-nowrap">AD</TableHead>
              <TableHead className="text-yellow-100 text-xs font-bold uppercase whitespace-nowrap">NHÓM</TableHead>
              <TableHead className="text-yellow-100 text-xs font-bold uppercase whitespace-nowrap">MÃ TVV</TableHead>
              <TableHead className="text-yellow-100 text-xs font-bold uppercase whitespace-nowrap">HỌ TÊN TVV</TableHead>
              <TableHead className="text-yellow-100 text-xs font-bold uppercase whitespace-nowrap">CHỨC VỤ</TableHead>
              <TableHead className="text-yellow-100 text-xs font-bold uppercase whitespace-nowrap">GHI CHÚ</TableHead>
              <TableHead className="text-yellow-100 text-xs uppercase w-[40px]"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((m, idx) => (
                <TableRow key={m.id} className="bg-white hover:bg-emerald-50 border-b border-gray-200">
                  <TableCell className="text-xs text-gray-500 text-center">{idx + 1}</TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={m.ad} onSave={(v) => updateClbMember(m.id, 'ad', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={m.nhom} onSave={(v) => updateClbMember(m.id, 'nhom', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={m.agentCode} onSave={(v) => handleAgentCodeChange(m.id, v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={m.agentName} onSave={(v) => updateClbMember(m.id, 'agentName', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={m.chucVu} onSave={(v) => updateClbMember(m.id, 'chucVu', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={m.note} onSave={(v) => updateClbMember(m.id, 'note', v)} /></TableCell>
                  <TableCell className="text-xs p-1"><Button variant="ghost" size="sm" onClick={() => deleteClbMember(m.id)} className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 className="w-3 h-3" /></Button></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-gray-500 text-sm py-8">Chưa có dữ liệu. Nhấn "Thêm" hoặc Import Excel để bắt đầu.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-gray-500 mt-2">{filtered.length} dòng • Nháy đúp ô để sửa • Nhập MÃ TVV để auto-điền AD/Nhóm/Họ tên</p>
      </div>
    );
  };

  // ========== RENDER: DS Chờ xét gia nhập ==========
  // Bảng 11 cột: STT - AD - NHÓM - MÃ TVV - HỌ TÊN TVV - CHỨC VỤ - IP(T-2) - IP(T-1) - IP(T) - TỔNG CỘNG - GHI CHÚ
  // TỔNG CỘNG = ipT2 + ipT1 + ipT0 (auto-tính)
  // Có dòng tổng cuối bảng (nền vàng) tính tổng các cột IP
  //
  // QUAN TRỌNG (theo yêu cầu user):
  //   - "T" = tháng hiện tại (new Date().getMonth()+1)
  //   - 3 cột IP tự tính từ data Hợp đồng trên app, không nhập tay
  //   - IP(T-2) = tổng FYP các HĐ có doanhSoMonth = T-2, cùng agentCode
  //   - IP(T-1) = tổng FYP các HĐ có doanhSoMonth = T-1, cùng agentCode
  //   - IP(T)   = tổng FYP các HĐ có doanhSoMonth = T,   cùng agentCode
  //   - Tiêu đề 3 cột động theo tháng: "IP T4" / "IP T5" / "IP T6" (vd tháng 6)
  //   - Khi sang tháng mới → tự động tính lại + đổi tiêu đề
  const renderPendingMembers = () => {
    const filtered = getFiltered(pendingMembers, ['ad', 'nhom', 'agentCode', 'agentName', 'chucVu', 'note']);

    // Compute T-2, T-1, T months based on current date (handle year wrap)
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1; // 1-12
    const offsetMonth = (offset: number): { year: number; month: number; label: string } => {
      const d = new Date(curYear, curMonth - 1 + offset, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1, label: `T${d.getMonth() + 1}` };
    };
    const t2 = offsetMonth(-2);
    const t1 = offsetMonth(-1);
    const t0 = offsetMonth(0);

    // Build IP map: agentCode (lowercase) → { t2, t1, t0 } sums of FYP from contracts
    const ipMap: Record<string, { t2: number; t1: number; t0: number }> = {};
    for (const c of contracts) {
      const d = getDoanhSoMonth(c);
      if (isNaN(d.getTime())) continue;
      const cy = d.getFullYear();
      const cm = d.getMonth() + 1;
      const code = (c.agentCode || '').trim().toLowerCase();
      if (!code) continue;
      if (!ipMap[code]) ipMap[code] = { t2: 0, t1: 0, t0: 0 };
      const fyp = c.fyp || 0;
      if (cy === t2.year && cm === t2.month) ipMap[code].t2 += fyp;
      else if (cy === t1.year && cm === t1.month) ipMap[code].t1 += fyp;
      else if (cy === t0.year && cm === t0.month) ipMap[code].t0 += fyp;
    }

    // For each pending member, get computed IP (fallback 0 if agentCode empty or no contracts)
    const computed = filtered.map(m => {
      const key = (m.agentCode || '').trim().toLowerCase();
      const ip = ipMap[key] || { t2: 0, t1: 0, t0: 0 };
      return { ...m, ipT2: ip.t2, ipT1: ip.t1, ipT0: ip.t0 };
    });

    const totalT2 = computed.reduce((s, m) => s + m.ipT2, 0);
    const totalT1 = computed.reduce((s, m) => s + m.ipT1, 0);
    const totalT0 = computed.reduce((s, m) => s + m.ipT0, 0);
    const totalAll = totalT2 + totalT1 + totalT0;

    // Khi thay MÃ TVV → autofill AD/Nhóm/HỌ TÊN TVV, rồi PATCH về DB
    const handleAgentCodeChange = async (id: string, newCode: string) => {
      const auto = autofillFromAgentCode(newCode);
      if (auto) {
        const patch = {
          agentCode: newCode,
          ad: auto.ad || '',
          nhom: auto.nhom || '',
          agentName: auto.agentName || '',
        };
        setPendingMembers(prev => prev.map(m => m.id === id ? {
          ...m, ...patch,
          ad: patch.ad || m.ad,
          nhom: patch.nhom || m.nhom,
          agentName: patch.agentName || m.agentName,
        } : m));
        try {
          const r = await fetch(`/api/pending-members/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
          });
          if (!r.ok) { await fetchPendingMembers(); toast({ title: 'Lỗi lưu', variant: 'destructive' }); }
        } catch { await fetchPendingMembers(); toast({ title: 'Lỗi mạng', variant: 'destructive' }); }
      } else {
        updatePendingMember(id, 'agentCode', newCode);
      }
    };
    return (
      <div>
        {/* Title với số thứ tự in đậm vàng */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-amber-400 font-black text-base">02.</span>
          <h2 className="text-sm font-bold text-emerald-300 uppercase tracking-wider">Danh sách Chờ xét gia nhập</h2>
        </div>
        {/* KPI cards — labels động theo tháng */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {[
            { label: 'Tổng chờ xét', value: formatNumber(filtered.length), bg: '#0D9488', badge: '#0F766E', icon: UserPlus },
            { label: `IP ${t2.label} tổng`, value: formatNumber(totalT2), bg: '#7C3AED', badge: '#6D28D9', icon: TrendingUp },
            { label: `IP ${t1.label} tổng`, value: formatNumber(totalT1), bg: '#2563EB', badge: '#1D4ED8', icon: TrendingUp },
            { label: `IP ${t0.label} tổng`, value: formatNumber(totalT0), bg: '#DC2626', badge: '#B91C1C', icon: TrendingUp },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div key={i} className="rounded-none p-3 sm:p-4" style={{ backgroundColor: kpi.bg, boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 flex items-center justify-center rounded-none" style={{ backgroundColor: kpi.badge }}><Icon className="w-4 h-4 text-white" /></div>
                  <p className="text-white/80 text-[10px] sm:text-xs font-bold leading-tight uppercase tracking-wider">{kpi.label}</p>
                </div>
                <p className="text-white text-xl sm:text-2xl font-black truncate leading-tight">{kpi.value}</p>
              </div>
            );
          })
          }
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Button onClick={addPendingMember} className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 h-8 text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> Thêm</Button>
          <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 rounded-md text-xs font-medium cursor-pointer"><Upload className="w-3.5 h-3.5" /> Import Excel<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleImportCLBorPending('pending-members', e)} /></label>
          <Button onClick={() => handleExportCLBorPending('pending-members')} variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 h-8 text-xs"><Download className="w-3.5 h-3.5 mr-1" /> Xuất</Button>
        </div>
        {/* Bảng 11 cột — tiêu đề 3 cột IP động theo tháng */}
        <div className="overflow-auto border border-emerald-600" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <Table>
            <TableHeader className="sticky top-0 z-10"><TableRow className="bg-emerald-800 hover:bg-emerald-800 border-b border-emerald-700">
              <TableHead className="text-yellow-100 text-xs font-bold uppercase whitespace-nowrap w-[40px]">STT</TableHead>
              <TableHead className="text-yellow-100 text-xs font-bold uppercase whitespace-nowrap">AD</TableHead>
              <TableHead className="text-yellow-100 text-xs font-bold uppercase whitespace-nowrap">NHÓM</TableHead>
              <TableHead className="text-yellow-100 text-xs font-bold uppercase whitespace-nowrap">MÃ TVV</TableHead>
              <TableHead className="text-yellow-100 text-xs font-bold uppercase whitespace-nowrap">HỌ TÊN TVV</TableHead>
              <TableHead className="text-yellow-100 text-xs font-bold uppercase whitespace-nowrap">CHỨC VỤ</TableHead>
              <TableHead className="text-yellow-100 text-xs font-bold uppercase whitespace-nowrap text-right">IP {t2.label}</TableHead>
              <TableHead className="text-yellow-100 text-xs font-bold uppercase whitespace-nowrap text-right">IP {t1.label}</TableHead>
              <TableHead className="text-yellow-100 text-xs font-bold uppercase whitespace-nowrap text-right">IP {t0.label}</TableHead>
              <TableHead className="text-yellow-100 text-xs font-bold uppercase whitespace-nowrap text-right">TỔNG CỘNG</TableHead>
              <TableHead className="text-yellow-100 text-xs font-bold uppercase whitespace-nowrap">GHI CHÚ</TableHead>
              <TableHead className="text-yellow-100 text-xs uppercase w-[40px]"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {computed.map((m, idx) => {
                const rowTotal = (m.ipT2 || 0) + (m.ipT1 || 0) + (m.ipT0 || 0);
                return (
                  <TableRow key={m.id} className="bg-white hover:bg-emerald-50 border-b border-gray-200">
                    <TableCell className="text-xs text-gray-500 text-center">{idx + 1}</TableCell>
                    <TableCell className="text-xs p-0"><EditableCell value={m.ad} onSave={(v) => updatePendingMember(m.id, 'ad', v)} /></TableCell>
                    <TableCell className="text-xs p-0"><EditableCell value={m.nhom} onSave={(v) => updatePendingMember(m.id, 'nhom', v)} /></TableCell>
                    <TableCell className="text-xs p-0"><EditableCell value={m.agentCode} onSave={(v) => handleAgentCodeChange(m.id, v)} /></TableCell>
                    <TableCell className="text-xs p-0"><EditableCell value={m.agentName} onSave={(v) => updatePendingMember(m.id, 'agentName', v)} /></TableCell>
                    <TableCell className="text-xs p-0"><EditableCell value={m.chucVu} onSave={(v) => updatePendingMember(m.id, 'chucVu', v)} /></TableCell>
                    {/* 3 ô IP — read-only, tự tính từ contracts theo tháng */}
                    <TableCell className="text-xs p-1 text-right text-gray-800">{m.ipT2 > 0 ? formatNumber(m.ipT2) : <span className="text-gray-400 italic">0</span>}</TableCell>
                    <TableCell className="text-xs p-1 text-right text-gray-800">{m.ipT1 > 0 ? formatNumber(m.ipT1) : <span className="text-gray-400 italic">0</span>}</TableCell>
                    <TableCell className="text-xs p-1 text-right text-gray-800">{m.ipT0 > 0 ? formatNumber(m.ipT0) : <span className="text-gray-400 italic">0</span>}</TableCell>
                    <TableCell className="text-xs p-1 text-right font-bold text-amber-700 bg-amber-50">{formatNumber(rowTotal)}</TableCell>
                    <TableCell className="text-xs p-0"><EditableCell value={m.note} onSave={(v) => updatePendingMember(m.id, 'note', v)} /></TableCell>
                    <TableCell className="text-xs p-1"><Button variant="ghost" size="sm" onClick={() => deletePendingMember(m.id)} className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 className="w-3 h-3" /></Button></TableCell>
                  </TableRow>
                );
              })}
              {/* Bottom total row — nền vàng */}
              {computed.length > 0 && (
                <TableRow className="bg-amber-100 border-t-2 border-amber-400 font-bold">
                  <TableCell colSpan={6} className="text-xs text-right text-amber-900 uppercase">TỔNG CỘNG ({computed.length} dòng):</TableCell>
                  <TableCell className="text-xs text-right text-amber-900 font-black">{formatNumber(totalT2)}</TableCell>
                  <TableCell className="text-xs text-right text-amber-900 font-black">{formatNumber(totalT1)}</TableCell>
                  <TableCell className="text-xs text-right text-amber-900 font-black">{formatNumber(totalT0)}</TableCell>
                  <TableCell className="text-xs text-right text-amber-900 font-black">{formatNumber(totalAll)}</TableCell>
                  <TableCell colSpan={2} className="text-xs text-amber-900"></TableCell>
                </TableRow>
              )}
              {computed.length === 0 && <TableRow><TableCell colSpan={12} className="text-center text-gray-500 text-sm py-8">Chưa có dữ liệu. Nhấn "Thêm" hoặc Import Excel để bắt đầu.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {filtered.length} dòng • 3 cột IP tự tính từ Hợp đồng trên app — tháng tính theo <span className="font-bold text-gray-700">Ngày Phát hành</span> (nếu trống thì lấy theo Ngày Hiệu lực) — kỳ {t2.label}/{t2.year}, {t1.label}/{t1.year}, {t0.label}/{t0.year} • TỔNG CỘNG = IP {t2.label} + IP {t1.label} + IP {t0.label}
        </p>
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
  // (policyOpen state đã khai báo ở trên cùng — dùng chung cho navigateTo/back button)

  // Thưởng Quý TVV filters
  const [quyTvvNhomFilter, setQuyTvvNhomFilter] = useState<string>('');
  const [quyTvvNameFilter, setQuyTvvNameFilter] = useState<string>('');
  // Thưởng TVVm filters
  const [tvvmNhomFilter, setTvvmNhomFilter] = useState<string>('');
  const [tvvmNameFilter, setTvvmNameFilter] = useState<string>('');
  // Thưởng NS tháng TVV filters
  const [nsTvvNhomFilter, setNsTvvNhomFilter] = useState<string>('');
  const [nsTvvNameFilter, setNsTvvNameFilter] = useState<string>('');
  // Thưởng Tuyển Luyện filters
  const [tuyenLuyenNhomFilter, setTuyenLuyenNhomFilter] = useState<string>('');
  const [tuyenLuyenNameFilter, setTuyenLuyenNameFilter] = useState<string>('');
  // Thưởng Đồng Hành filters
  const [dongHanhNhomFilter, setDongHanhNhomFilter] = useState<string>('');
  const [dongHanhNameFilter, setDongHanhNameFilter] = useState<string>('');
  // Thưởng Quý TN filters
  const [quyTnNhomFilter, setQuyTnNhomFilter] = useState<string>('');
  const [quyTnNameFilter, setQuyTnNameFilter] = useState<string>('');
  // Thưởng PTKD TN filters
  const [ptkdNhomFilter, setPtkdNhomFilter] = useState<string>('');
  const [ptkdNameFilter, setPtkdNameFilter] = useState<string>('');
  // Policy image link — per policy item, persisted via Settings API
  const [policyImageLinks, setPolicyImageLinks] = useState<Record<string, string>>({});
  const [policyImageInput, setPolicyImageInput] = useState('');

  // ---------- SAO VIỆT — manual data + sync link per program ----------
  // program: 'ca-nhan' | 'tn-ktm' | 'tn-td'
  // saovietLinks: Google Sheets URL per program (persisted via Settings API key `saoviet-link-${program}`)
  // saovietManualData: rows uploaded/synced from DB — when present, overrides computed data from contracts
  const SAOVIET_PROGRAMS = ['ca-nhan', 'tn-ktm', 'tn-td'] as const;
  type SaoVietProgram = typeof SAOVIET_PROGRAMS[number];
  const [saovietLinks, setSaovietLinks] = useState<Record<string, string>>({});
  // Shared Google Sheets link — 1 spreadsheet with 3 tabs named 'ca-nhan' | 'tn-ktm' | 'tn-td'
  // (saved via Settings API key 'saoviet-link-shared')
  const [saovietSharedLink, setSaovietSharedLink] = useState<string>('');
  const [saovietSyncingAll, setSaovietSyncingAll] = useState<boolean>(false);
  const [saovietManualData, setSaovietManualData] = useState<Record<string, any[]>>({
    'ca-nhan': [], 'tn-ktm': [], 'tn-td': [],
  });
  const [saovietSyncing, setSaovietSyncing] = useState<Record<string, boolean>>({});
  const [saovietUploading, setSaovietUploading] = useState<Record<string, boolean>>({});
  // Posters: each program has one 16:9 image (URL stored in Settings, file in /public/posters)
  const [saovietPosters, setSaovietPosters] = useState<Record<string, string>>({});
  const [saovietPosterUploading, setSaovietPosterUploading] = useState<Record<string, boolean>>({});
  // CLB Sao Việt posters — same pattern as saovietPosters
  const [clbsvPosters, setClbsvPosters] = useState<Record<string, string>>({});
  const [clbsvPosterUploading, setClbsvPosterUploading] = useState<Record<string, boolean>>({});
  // Filters for Sao Việt detail pages (shared, applies to whichever detail page is open)
  const [saovietNhomFilter, setSaovietNhomFilter] = useState<string>('');
  const [saovietNameFilter, setSaovietNameFilter] = useState<string>('');
  // Settings modal toggle (overview page only) — contains all sync/upload panels
  const [saovietSettingsOpen, setSaovietSettingsOpen] = useState<boolean>(false);
  // CLB Sao Việt settings modal — quản lý poster cho 3 chương trình CLBSV (ngoài detail tables)
  const [clbsvSettingsOpen, setClbsvSettingsOpen] = useState<boolean>(false);

  // Update summary boxes (top) + footer (bottom) khi policy/filter thay đổi
  // Mỗi render function thêm data-policy-count + data-policy-amount vào div ngoài cùng của bảng
  useEffect(() => {
    if (activeSheet !== 'report' || !policyOpen) return;
    // Delay để đợi bảng render xong
    const timer = setTimeout(() => {
      const tableContainer = document.querySelector(`[data-policy-table="${policyOpen}"]`);
      // Tìm element có data-policy-count (div ngoài cùng của mỗi bảng)
      const dataEl = tableContainer?.querySelector('[data-policy-count]') as HTMLElement | null;
      const count = dataEl?.getAttribute('data-policy-count') || '0';
      const amount = dataEl?.getAttribute('data-policy-amount') || '0';
      // Format amount bằng formatPolicyAmountForBox:
      // - Mobile: chỉ số trđ (vd "15,5") — KHÔNG hiển thị "trđ" → vừa ô không tràn
      // - Desktop: full format "100.000.000"
      const amountNum = parseFloat(amount) || 0;
      const amountFmt = amountNum > 0 ? formatPolicyAmountForBox(amountNum) : '—';

      // Update 2 ô tổng hợp ở trên (mobile + desktop)
      const countEl = document.getElementById(`policy-count-${policyOpen}`);
      if (countEl) countEl.textContent = count === '0' ? '—' : count;
      const totalEl = document.getElementById(`policy-total-${policyOpen}`);
      if (totalEl) totalEl.textContent = amountFmt;

      // Update footer
      const fixedCountEl = document.getElementById('policy-fixed-count');
      if (fixedCountEl) fixedCountEl.textContent = count === '0' ? '—' : `${count} dòng`;
      const fixedAmountEl = document.getElementById('policy-fixed-amount');
      if (fixedAmountEl) fixedAmountEl.textContent = amountFmt;
    }, 100);
    return () => clearTimeout(timer);
  }, [
    activeSheet,
    policyOpen,
    // Filter state của TẤT CẢ policy (TVV + TN) — trước đây thiếu 3 TN policy
    tvvmNhomFilter, tvvmNameFilter,
    nsTvvNhomFilter, nsTvvNameFilter,
    quyTvvNhomFilter, quyTvvNameFilter,
    ptkdNhomFilter, ptkdNameFilter,
    tuyenLuyenNhomFilter, tuyenLuyenNameFilter,
    dongHanhNhomFilter, dongHanhNameFilter,
    quyTnNhomFilter, quyTnNameFilter,
    // Data sources — khi fetch xong, bảng re-render với data-policy-count mới,
    // useEffect phải fire lại để đọc giá trị mới và update ô tổng hợp + footer
    contracts, tvvStructList, leaders, recruiters, banNhomList, adList,
  ]);

  // Load policy image links from onlineSettings (đã preload qua AppDataContext — tránh fetch lại /api/settings nhiều lần)
  useEffect(() => {
    if (!onlineSettings) return;
    const links: Record<string, string> = {};
    for (const [key, value] of Object.entries(onlineSettings)) {
      if (key.startsWith('policy-image-') && value) {
        links[key.replace('policy-image-', '')] = String(value);
      }
    }
    setPolicyImageLinks(links);
  }, [onlineSettings]);

  // ---------- SAO VIỆT + CLB SAO VIỆT: derive links/posters from onlineSettings (no extra fetch) ----------
  useEffect(() => {
    if (!onlineSettings) return;
    const links: Record<string, string> = {};
    const posters: Record<string, string> = {};
    const clbsvPostersMap: Record<string, string> = {};
    let sharedLink = '';
    for (const [key, value] of Object.entries(onlineSettings)) {
      if (key === 'saoviet-link-shared' && value) {
        sharedLink = String(value);
      } else if (key.startsWith('saoviet-link-') && value) {
        links[key.replace('saoviet-link-', '')] = String(value);
      }
      if (key.startsWith('saoviet-poster-') && value) {
        posters[key.replace('saoviet-poster-', '')] = String(value);
      }
      if (key.startsWith('clbsv-poster-') && value) {
        clbsvPostersMap[key.replace('clbsv-poster-', '')] = String(value);
      }
    }
    setSaovietLinks(links);
    setSaovietSharedLink(sharedLink);
    setSaovietPosters(posters);
    setClbsvPosters(clbsvPostersMap);
  }, [onlineSettings]);

  // ---------- SAO VIỆT: load manual data per program (DB-backed, không nằm trong settings) ----------
  useEffect(() => {
    Promise.all(SAOVIET_PROGRAMS.map(p =>
      fetch(`/api/saoviet-data?program=${p}`).then(r => r.ok ? r.json() : []).then(rows => [p, rows] as const)
    ))
      .then(entries => {
        const next: Record<string, any[]> = { 'ca-nhan': [], 'tn-ktm': [], 'tn-td': [] };
        for (const [p, rows] of entries) next[p] = Array.isArray(rows) ? rows : [];
        setSaovietManualData(next);
      })
      .catch(() => {});
  }, []);

  // ---------- SAO VIỆT: save link via Settings API ----------
  const saveSaovietLink = useCallback(async (program: string, link: string) => {
    setSaovietLinks(prev => {
      const next = { ...prev };
      if (link) next[program] = link; else delete next[program];
      return next;
    });
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [`saoviet-link-${program}`]: link }),
      });
    } catch {
      toast({ title: 'Lỗi lưu link', variant: 'destructive' });
    }
  }, []);

  // ---------- SAO VIỆT: save SHARED link via Settings API ----------
  // 1 spreadsheet with 3 tabs (ca-nhan | tn-ktm | tn-td) — syncs all 3 programs at once
  const saveSaovietSharedLink = useCallback(async (link: string) => {
    setSaovietSharedLink(link);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'saoviet-link-shared': link }),
      });
    } catch {
      toast({ title: 'Lỗi lưu link', variant: 'destructive' });
    }
  }, []);

  // ---------- SAO VIỆT: SYNC ALL 3 programs from 1 shared link ----------
  // Spreadsheet must have 3 tabs named exactly: ca-nhan, tn-ktm, tn-td
  // Each tab's data starts from NHÓM column (no STT — app auto-counts)
  //   ca-nhan / tn-ktm tabs:  NHÓM | MÃ SỐ | HỌ TÊN | FYP
  //   tn-td tab:               NHÓM | MÃ SỐ | HỌ TÊN | FYP TVVm | SL TVVm HĐC | TVVm COUNT
  const handleSaovietSyncAll = useCallback(async () => {
    const link = saovietSharedLink.trim();
    if (!link) {
      toast({ title: 'Chưa có link', description: 'Vui lòng nhập link Google Sheets trước', variant: 'destructive' });
      return;
    }
    setSaovietSyncingAll(true);
    try {
      const r = await fetch('/api/saoviet-data/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.results) {
        const res = data.results;
        const successCount = SAOVIET_PROGRAMS.filter(p => !res[p]?.error).length;
        const totalRows = SAOVIET_PROGRAMS.reduce((s, p) => s + (res[p]?.count || 0), 0);
        const failedPrograms = SAOVIET_PROGRAMS.filter(p => res[p]?.error);
        if (successCount === 3) {
          toast({
            title: 'Đồng bộ tất cả thành công',
            description: `3/3 chương trình — ${totalRows} dòng tổng cộng`,
          });
        } else if (successCount > 0) {
          toast({
            title: `Đồng bộ ${successCount}/3 chương trình`,
            description: `${totalRows} dòng — Lỗi: ${failedPrograms.map(p => `${p} (${res[p]?.error})`).join(', ')}`,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Đồng bộ thất bại',
            description: failedPrograms.map(p => `${p}: ${res[p]?.error}`).join('; '),
            variant: 'destructive',
          });
        }
        // Reload all 3 programs' data
        const freshData = await Promise.all(
          SAOVIET_PROGRAMS.map(p =>
            fetch(`/api/saoviet-data?program=${p}`).then(r => r.ok ? r.json() : []).then(rows => [p, rows] as const)
          )
        );
        const next: Record<string, any[]> = { 'ca-nhan': [], 'tn-ktm': [], 'tn-td': [] };
        for (const [p, rows] of freshData) next[p] = Array.isArray(rows) ? rows : [];
        setSaovietManualData(next);
      } else {
        toast({ title: 'Lỗi đồng bộ', description: data.error || `HTTP ${r.status}`, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Lỗi đồng bộ', description: String(e), variant: 'destructive' });
    } finally {
      setSaovietSyncingAll(false);
    }
  }, [saovietSharedLink]);

  // ---------- SAO VIỆT: sync from Google Sheets link ----------
  const handleSaovietSync = useCallback(async (program: string) => {
    const link = saovietLinks[program] || '';
    if (!link) { toast({ title: 'Chưa có link', description: 'Vui lòng nhập link Google Sheets trước', variant: 'destructive' }); return; }
    setSaovietSyncing(prev => ({ ...prev, [program]: true }));
    try {
      const r = await fetch('/api/saoviet-data/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program, link }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        toast({ title: 'Đồng bộ thành công', description: `${data.count || 0} dòng mới (đã xóa ${data.deleted || 0} dòng cũ)` });
        // Reload rows for this program
        const fresh = await fetch(`/api/saoviet-data?program=${program}`).then(r => r.ok ? r.json() : []);
        setSaovietManualData(prev => ({ ...prev, [program]: Array.isArray(fresh) ? fresh : [] }));
      } else {
        toast({ title: 'Lỗi đồng bộ', description: data.error || `HTTP ${r.status}`, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Lỗi đồng bộ', description: String(e), variant: 'destructive' });
    } finally {
      setSaovietSyncing(prev => ({ ...prev, [program]: false }));
    }
  }, [saovietLinks]);

  // ---------- SAO VIỆT: upload file (xlsx/csv) — nguyên tắc: xóa hết, insert mới ----------
  const handleSaovietUpload = useCallback(async (program: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaovietUploading(prev => ({ ...prev, [program]: true }));
    try {
      let rowsIn: any[] = [];
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        // Simple CSV parse
        const lines = text.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim() !== '');
        if (lines.length < 2) { toast({ title: 'File CSV trống', variant: 'destructive' }); e.target.value = ''; return; }
        const parseLine = (line: string) => {
          const out: string[] = []; let cur = ''; let inQ = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQ) {
              if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
              else if (ch === '"') inQ = false;
              else cur += ch;
            } else {
              if (ch === '"') inQ = true;
              else if (ch === ',') { out.push(cur); cur = ''; }
              else cur += ch;
            }
          }
          out.push(cur); return out;
        };
        const header = parseLine(lines[0]).map(h => h.trim());
        for (let i = 1; i < lines.length; i++) {
          const cells = parseLine(lines[i]);
          const obj: any = {};
          header.forEach((h, idx) => { obj[h] = cells[idx] ?? ''; });
          rowsIn.push(obj);
        }
      } else {
        const XLSX = await import('xlsx');
        const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
        rowsIn = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: true });
      }
      if (rowsIn.length === 0) {
        // Empty file → still clear existing data
        const r = await fetch('/api/saoviet-data', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ program, rows: [] }),
        });
        if (r.ok) {
          toast({ title: 'Đã xóa dữ liệu', description: 'File rỗng — toàn bộ dữ liệu cũ đã được xóa' });
          setSaovietManualData(prev => ({ ...prev, [program]: [] }));
        }
        e.target.value = '';
        return;
      }
      const r = await fetch('/api/saoviet-data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program, rows: rowsIn }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        toast({ title: 'Upload thành công', description: `${data.count || 0} dòng mới (đã xóa ${data.deleted || 0} dòng cũ)` });
        // Reload rows for this program
        const fresh = await fetch(`/api/saoviet-data?program=${program}`).then(r => r.ok ? r.json() : []);
        setSaovietManualData(prev => ({ ...prev, [program]: Array.isArray(fresh) ? fresh : [] }));
      } else {
        toast({ title: 'Lỗi upload', description: data.error || `HTTP ${r.status}`, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Lỗi upload', description: String(err), variant: 'destructive' });
    } finally {
      setSaovietUploading(prev => ({ ...prev, [program]: false }));
      e.target.value = '';
    }
  }, []);

  // ---------- SAO VIỆT: clear manual data ----------
  const handleSaovietClear = useCallback(async (program: string) => {
    if (!confirm(`Xóa toàn bộ dữ liệu đã upload/sync của mục này?\nSau khi xóa, trang sẽ tự động tính lại từ Hợp đồng/Nhân sự.`)) return;
    try {
      const r = await fetch(`/api/saoviet-data?program=${program}`, { method: 'DELETE' });
      if (r.ok) {
        toast({ title: 'Đã xóa', description: 'Dữ liệu thủ công đã được xóa' });
        setSaovietManualData(prev => ({ ...prev, [program]: [] }));
      } else {
        const d = await r.json().catch(() => ({}));
        toast({ title: 'Lỗi xóa', description: d.error || `HTTP ${r.status}`, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Lỗi xóa', description: String(e), variant: 'destructive' });
    }
  }, []);

  // ---------- SAO VIỆT: upload poster (file → compress → BYTEA in Postgres → URL in Setting) ----------
  // TRƯỚC: lưu base64 trong Setting → /api/settings trả về 16.9 MB (chậm).
  // SAU: lưu binary trong bảng PosterImage, Setting chỉ lưu URL ngắn
  //      "/api/poster-image/saoviet-poster-{program}" → /api/settings chỉ ~50 KB.
  // Ảnh được serve với Cache-Control: public, max-age=31536000, immutable → browser cache.
  const handleSaovietPosterUpload = useCallback(async (program: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset input để có thể chọn lại cùng file
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'File không hợp lệ', description: 'Vui lòng chọn file ảnh (PNG/JPG/WebP)', variant: 'destructive' });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: 'File quá lớn', description: 'Kích thước tối đa 8MB', variant: 'destructive' });
      return;
    }
    setSaovietPosterUploading(prev => ({ ...prev, [program]: true }));
    try {
      // 1) Compress image → base64 data URL
      const dataUrl: string = await compressImage(file);
      // 2) Upload binary to PosterImage table (returns URL)
      const settingKey = `saoviet-poster-${program}`;
      const upRes = await fetch('/api/poster-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: settingKey, dataBase64: dataUrl }),
      });
      if (!upRes.ok) {
        const errData = await upRes.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${upRes.status}`);
      }
      const upData = await upRes.json();
      const posterUrl: string = upData.url; // "/api/poster-image/saoviet-poster-ca-nhan"
      // 3) Save URL (short string) to Settings
      const r = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [settingKey]: posterUrl }),
      });
      if (r.ok) {
        setSaovietPosters(prev => ({ ...prev, [program]: posterUrl }));
        toast({ title: 'Đã lưu poster' });
      } else {
        throw new Error(`HTTP ${r.status}`);
      }
    } catch (err) {
      toast({ title: 'Lỗi upload poster', description: String(err), variant: 'destructive' });
    } finally {
      setSaovietPosterUploading(prev => ({ ...prev, [program]: false }));
    }
  }, []);

  // ---------- SAO VIỆT: delete poster (clear Setting + delete binary) ----------
  const handleSaovietPosterDelete = useCallback(async (program: string) => {
    if (!confirm('Xóa poster của chương trình này?')) return;
    const settingKey = `saoviet-poster-${program}`;
    try {
      // 1) Delete binary from PosterImage table (best-effort, non-fatal)
      await fetch(`/api/poster-image?key=${encodeURIComponent(settingKey)}`, { method: 'DELETE' });
      // 2) Clear Setting value
      const r = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [settingKey]: '' }),
      });
      if (r.ok) {
        setSaovietPosters(prev => {
          const next = { ...prev };
          delete next[program];
          return next;
        });
        toast({ title: 'Đã xóa poster' });
      } else {
        toast({ title: 'Lỗi xóa poster', description: `HTTP ${r.status}`, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Lỗi xóa poster', description: String(e), variant: 'destructive' });
    }
  }, []);

  // ---------- CLB SAO VIỆT: upload poster (same pattern as saoviet) ----------
  const handleClbsvPosterUpload = useCallback(async (program: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'File không hợp lệ', description: 'Vui lòng chọn file ảnh (PNG/JPG/WebP)', variant: 'destructive' });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: 'File quá lớn', description: 'Kích thước tối đa 8MB', variant: 'destructive' });
      return;
    }
    setClbsvPosterUploading(prev => ({ ...prev, [program]: true }));
    try {
      const dataUrl: string = await compressImage(file);
      const settingKey = `clbsv-poster-${program}`;
      const upRes = await fetch('/api/poster-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: settingKey, dataBase64: dataUrl }),
      });
      if (!upRes.ok) {
        const errData = await upRes.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${upRes.status}`);
      }
      const upData = await upRes.json();
      const posterUrl: string = upData.url;
      const r = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [settingKey]: posterUrl }),
      });
      if (r.ok) {
        setClbsvPosters(prev => ({ ...prev, [program]: posterUrl }));
        toast({ title: 'Đã lưu poster CLB Sao Việt' });
      } else {
        throw new Error(`HTTP ${r.status}`);
      }
    } catch (err) {
      toast({ title: 'Lỗi upload poster', description: String(err), variant: 'destructive' });
    } finally {
      setClbsvPosterUploading(prev => ({ ...prev, [program]: false }));
    }
  }, []);

  // ---------- CLB SAO VIỆT: delete poster ----------
  const handleClbsvPosterDelete = useCallback(async (program: string) => {
    if (!confirm('Xóa poster của chương trình này?')) return;
    const settingKey = `clbsv-poster-${program}`;
    try {
      await fetch(`/api/poster-image?key=${encodeURIComponent(settingKey)}`, { method: 'DELETE' });
      const r = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [settingKey]: '' }),
      });
      if (r.ok) {
        setClbsvPosters(prev => {
          const next = { ...prev };
          delete next[program];
          return next;
        });
        toast({ title: 'Đã xóa poster' });
      } else {
        toast({ title: 'Lỗi xóa poster', description: `HTTP ${r.status}`, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Lỗi xóa poster', description: String(e), variant: 'destructive' });
    }
  }, []);

  // ========================================================================
  // EXCEL EXPORT — Tải file Excel cho chính sách đang mở
  // Sheet 1 "Chính sách": scrape DOM table, giữ nguyên styles (màu, font, border)
  // Sheet 2 "Hợp đồng chi tiết": danh sách HĐ được dùng để tính toán
  // ========================================================================
  const buildContractDetailRows = useCallback((policyKey: string): ContractDetailRow[] => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const currentQuarter = Math.ceil(currentMonth / 3);
    const quarterStartMonth = (currentQuarter - 1) * 3 + 1;
    const quarterEndMonth = currentQuarter * 3;

    // Helper: format date dd/MM/yyyy
    const fmtDate = (d: string | null): string => {
      if (!d) return '';
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return '';
      return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
    };

    // Helper: format TXX/YYYY from a date
    const fmtThangDS = (d: Date): string => `T${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    // Helper: resolve người TD name from agentCode via 2-step lookup
    const resolveNguoiTDName = (agentCode: string): string => {
      return resolveNguoiTD(agentCode, tvvStructList);
    };

    // Helper: resolve nhóm name (use existing helper, allowPA=true default)
    const resolveNhomForRow = (agentCode: string, maBanNhom: string, candidateNhomName?: string, allowPA: boolean = true): string => {
      return resolveNhomName(agentCode, maBanNhom, banNhomList, contracts, leaders, { allowPA, candidateNhomName });
    };

    // Helper: check if a TVV is excluded from rewards (Banca)
    const isExcluded = (agentCode: string, maBanNhom: string): boolean => {
      return isTVVExcludedFromRewards(agentCode, maBanNhom, banNhomList, adList);
    };

    // Helper: build row from contract
    const makeRow = (
      c: Contract,
      stt: number,
      tvvInfo: { agentCode: string; agentName: string; maBanNhom: string },
      nguoiTDName: string,
      ghiChu: string,
    ): ContractDetailRow => {
      const d = getDoanhSoMonth(c);
      const nhomName = resolveNhomForRow(tvvInfo.agentCode, tvvInfo.maBanNhom, undefined, true);
      return {
        stt,
        nhom: nhomName,
        maTVV: tvvInfo.agentCode,
        hoTenTVV: tvvInfo.agentName,
        soHD: c.contractNumber || '',
        ngayPH: fmtDate(c.issueDate),
        thangDS: isNaN(d.getTime()) ? '' : fmtThangDS(d),
        pdt10DT: c.pdt10DT,
        afyp: c.afyp,
        nguoiTD: nguoiTDName,
        ghiChu,
      };
    };

    // Deduplicate contracts by ID (a contract can appear in both month + chang — keep both notes)
    const seen = new Map<string, ContractDetailRow>();

    const addRow = (c: Contract, tvvInfo: { agentCode: string; agentName: string; maBanNhom: string }, nguoiTDName: string, ghiChu: string) => {
      const key = `${c.id}__${ghiChu}`;
      if (!seen.has(key)) {
        seen.set(key, makeRow(c, seen.size + 1, tvvInfo, nguoiTDName, ghiChu));
      }
    };

    switch (policyKey) {
      // ─── TVVm: TVV ≤12 tháng, có nhóm, không Ban Ca ───
      // Tính IP tháng + IP chặng
      case 'tvvm': {
        const tvvmList = tvvStructList.filter(tvv => {
          if (!isTVVm(tvv.ngayBatDau)) return false;
          if (!tvv.maBanNhom || tvv.maBanNhom.trim() === '') return false;
          const nhomName = (banNhomList.find(bn => bn.maBanNhom === tvv.maBanNhom)?.tenBanNhom || '').toLowerCase();
          if (nhomName.includes('ban ca') || nhomName.includes('banca')) return false;
          if (isExcluded(tvv.agentCode, tvv.maBanNhom)) return false;
          return true;
        });
        tvvmList.forEach(tvv => {
          const changInfo = getChangInfo(tvv.ngayBatDau);
          const nguoiTD = resolveNguoiTDName(tvv.agentCode);
          const tvvInfo = { agentCode: tvv.agentCode, agentName: tvv.agentName, maBanNhom: tvv.maBanNhom };
          // IP tháng
          contracts.forEach(c => {
            if (c.agentCode !== tvv.agentCode) return;
            const d = getDoanhSoMonth(c);
            if (isNaN(d.getTime())) return;
            if (d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth) {
              addRow(c, tvvInfo, nguoiTD, `Tháng IP ${currentMonth}/${currentYear}`);
            }
          });
          // IP chặng
          if (tvv.ngayBatDau && changInfo.chang > 0) {
            const rs = changInfo.rangeStart;
            const re = changInfo.rangeEnd;
            const reEnd = new Date(re.getFullYear(), re.getMonth(), re.getDate(), 23, 59, 59);
            contracts.forEach(c => {
              if (c.agentCode !== tvv.agentCode) return;
              const d = getDoanhSoMonth(c);
              if (isNaN(d.getTime())) return;
              if (d >= rs && d <= reEnd) {
                addRow(c, tvvInfo, nguoiTD, `${changInfo.label} (${changInfo.monthRange})`);
              }
            });
          }
        });
        break;
      }

      // ─── NS TVV: TVV trong tvvStructList, IP tháng ───
      case 'ns-tvv': {
        tvvStructList.forEach(tvv => {
          if (isExcluded(tvv.agentCode, tvv.maBanNhom)) return;
          const nguoiTD = resolveNguoiTDName(tvv.agentCode);
          const tvvInfo = { agentCode: tvv.agentCode, agentName: tvv.agentName, maBanNhom: tvv.maBanNhom };
          contracts.forEach(c => {
            if (c.agentCode !== tvv.agentCode) return;
            const d = getDoanhSoMonth(c);
            if (isNaN(d.getTime())) return;
            if (d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth) {
              addRow(c, tvvInfo, nguoiTD, `NS Tháng ${currentMonth}/${currentYear}`);
            }
          });
        });
        break;
      }

      // ─── Quý TVV: TVV trong tvvStructList, IP quý ───
      case 'quy-tvv': {
        tvvStructList.forEach(tvv => {
          if (isExcluded(tvv.agentCode, tvv.maBanNhom)) return;
          const nguoiTD = resolveNguoiTDName(tvv.agentCode);
          const tvvInfo = { agentCode: tvv.agentCode, agentName: tvv.agentName, maBanNhom: tvv.maBanNhom };
          contracts.forEach(c => {
            if (c.agentCode !== tvv.agentCode) return;
            const d = getDoanhSoMonth(c);
            if (isNaN(d.getTime())) return;
            if (d.getFullYear() !== currentYear) return;
            const m = d.getMonth() + 1;
            if (m >= quarterStartMonth && m <= quarterEndMonth) {
              addRow(c, tvvInfo, nguoiTD, `Quý ${currentQuarter} (${currentYear})`);
            }
          });
        });
        break;
      }

      // ─── Tuyển Luyện: TVVm do TB/TN tuyển (maTVVTuyendung), IP tháng + IP chặng ───
      case 'tuyen-luyen': {
        const ntdCandidates = leaders
          .filter(l => isTBorTNPosition(l.position))
          .filter(l => !isExcluded(l.agentCode, l.maNhom || ''));
        ntdCandidates.forEach(ntd => {
          const ntdCode = (ntd.agentCode || '').trim();
          const recruitedTVVs = tvvStructList.filter(tvv => {
            const r = (tvv.maTVVTuyendung || '').trim();
            return r && r === ntdCode && isTVVm(tvv.ngayBatDau);
          });
          recruitedTVVs.forEach(tvv => {
            const changInfo = getChangInfo(tvv.ngayBatDau);
            const tvvInfo = { agentCode: tvv.agentCode, agentName: tvv.agentName, maBanNhom: tvv.maBanNhom };
            // IP tháng
            contracts.forEach(c => {
              if (c.agentCode !== tvv.agentCode) return;
              const d = getDoanhSoMonth(c);
              if (isNaN(d.getTime())) return;
              if (d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth) {
                addRow(c, tvvInfo, ntd.agentName, `TL Tháng ${currentMonth}/${currentYear} • NTD: ${ntd.agentName}`);
              }
            });
            // IP chặng
            if (tvv.ngayBatDau && changInfo.chang > 0) {
              const rs = changInfo.rangeStart;
              const re = changInfo.rangeEnd;
              const reEnd = new Date(re.getFullYear(), re.getMonth(), re.getDate(), 23, 59, 59);
              contracts.forEach(c => {
                if (c.agentCode !== tvv.agentCode) return;
                const d = getDoanhSoMonth(c);
                if (isNaN(d.getTime())) return;
                if (d >= rs && d <= reEnd) {
                  addRow(c, tvvInfo, ntd.agentName, `${changInfo.label} • NTD: ${ntd.agentName}`);
                }
              });
            }
          });
        });
        break;
      }

      // ─── Đồng Hành: TVVm do TTN tuyển (maTVVTuyendung), IP tháng + IP chặng ───
      case 'dong-hanh': {
        const ttnList = recruiters.filter(l => !isExcluded(l.agentCode, l.nhom || ''));
        ttnList.forEach(ttn => {
          const ttnCode = (ttn.agentCode || '').trim();
          const tvvmInNhom = tvvStructList.filter(tvv => {
            if (tvv.agentCode === ttn.agentCode) return false;
            if (!isTVVm(tvv.ngayBatDau)) return false;
            const r = (tvv.maTVVTuyendung || '').trim();
            return r && r === ttnCode;
          });
          tvvmInNhom.forEach(tvv => {
            const changInfo = getChangInfo(tvv.ngayBatDau);
            const tvvInfo = { agentCode: tvv.agentCode, agentName: tvv.agentName, maBanNhom: tvv.maBanNhom };
            // IP tháng
            contracts.forEach(c => {
              if (c.agentCode !== tvv.agentCode) return;
              const d = getDoanhSoMonth(c);
              if (isNaN(d.getTime())) return;
              if (d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth) {
                addRow(c, tvvInfo, ttn.agentName, `ĐH Tháng ${currentMonth}/${currentYear} • TTN: ${ttn.agentName}`);
              }
            });
            // IP chặng
            if (tvv.ngayBatDau && changInfo.chang > 0) {
              const rs = changInfo.rangeStart;
              const re = changInfo.rangeEnd;
              const reEnd = new Date(re.getFullYear(), re.getMonth(), re.getDate(), 23, 59, 59);
              contracts.forEach(c => {
                if (c.agentCode !== tvv.agentCode) return;
                const d = getDoanhSoMonth(c);
                if (isNaN(d.getTime())) return;
                if (d >= rs && d <= reEnd) {
                  addRow(c, tvvInfo, ttn.agentName, `${changInfo.label} • TTN: ${ttn.agentName}`);
                }
              });
            }
          });
        });
        break;
      }

      // ─── PTKD TN: TVV trong nhóm của TN, IP tháng ───
      case 'ptkd-tn': {
        const tnList = leaders
          .filter(l => isTBorTNPosition(l.position))
          .filter(l => !isExcluded(l.agentCode, l.maNhom || ''));
        tnList.forEach(tn => {
          const tvvInNhom = tvvStructList.filter(tvv => matchMaBanNhom(tvv.maBanNhom, tn.maNhom || ''));
          tvvInNhom.forEach(tvv => {
            const nguoiTD = resolveNguoiTDName(tvv.agentCode);
            const tvvInfo = { agentCode: tvv.agentCode, agentName: tvv.agentName, maBanNhom: tvv.maBanNhom };
            contracts.forEach(c => {
              if (c.agentCode !== tvv.agentCode) return;
              const d = getDoanhSoMonth(c);
              if (isNaN(d.getTime())) return;
              if (d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth) {
                addRow(c, tvvInfo, nguoiTD, `PTKD Tháng ${currentMonth}/${currentYear} • Nhóm: ${tn.nhom || tn.agentName}`);
              }
            });
          });
        });
        break;
      }

      // ─── Quý TN: TVV trong nhóm của TN, IP quý ───
      case 'quy-tn': {
        const tnList = leaders
          .filter(l => isTBorTNPosition(l.position))
          .filter(l => !isExcluded(l.agentCode, l.maNhom || ''));
        tnList.forEach(tn => {
          const tvvInNhom = tvvStructList.filter(tvv => matchMaBanNhom(tvv.maBanNhom, tn.maNhom || ''));
          tvvInNhom.forEach(tvv => {
            const nguoiTD = resolveNguoiTDName(tvv.agentCode);
            const tvvInfo = { agentCode: tvv.agentCode, agentName: tvv.agentName, maBanNhom: tvv.maBanNhom };
            contracts.forEach(c => {
              if (c.agentCode !== tvv.agentCode) return;
              const d = getDoanhSoMonth(c);
              if (isNaN(d.getTime())) return;
              if (d.getFullYear() !== currentYear) return;
              const m = d.getMonth() + 1;
              if (m >= quarterStartMonth && m <= quarterEndMonth) {
                addRow(c, tvvInfo, nguoiTD, `Quý ${currentQuarter} (${currentYear}) • Nhóm: ${tn.nhom || tn.agentName}`);
              }
            });
          });
        });
        break;
      }

      // ─── TTN Tuyển Ngang: TVV do TTN tuyển (maTVVTuyendung), IP tháng ───
      case 'tuyen-ngang': {
        tuyenNgangList.forEach(tn => {
          const tnCode = (tn.agentCode || '').trim();
          const recruitedTVVs = tvvStructList.filter(tvv => {
            const r = (tvv.maTVVTuyendung || '').trim();
            return r && r === tnCode;
          });
          recruitedTVVs.forEach(tvv => {
            const tvvInfo = { agentCode: tvv.agentCode, agentName: tvv.agentName, maBanNhom: tvv.maBanNhom };
            // IP tháng
            contracts.forEach(c => {
              if (c.agentCode !== tvv.agentCode) return;
              const d = getDoanhSoMonth(c);
              if (isNaN(d.getTime())) return;
              if (d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth) {
                addRow(c, tvvInfo, tn.agentName, `TTN Tuyển ngang Tháng ${currentMonth}/${currentYear} • TTN: ${tn.agentName}`);
              }
            });
            // Lũy kế YTD (các tháng từ đầu năm đến hiện tại)
            contracts.forEach(c => {
              if (c.agentCode !== tvv.agentCode) return;
              const d = getDoanhSoMonth(c);
              if (isNaN(d.getTime())) return;
              if (d.getFullYear() !== currentYear) return;
              const m = d.getMonth() + 1;
              if (m < currentMonth) {
                addRow(c, tvvInfo, tn.agentName, `Lũy kế YTD T${m}/${currentYear} • TTN: ${tn.agentName}`);
              }
            });
          });
        });
        break;
      }

      default:
        return [];
    }

    return Array.from(seen.values());
  }, [contracts, tvvStructList, leaders, recruiters, tuyenNgangList, banNhomList, adList]);

  const handleDownloadPolicyExcel = useCallback(() => {
    if (!policyOpen) {
      toast({ title: 'Chưa chọn chính sách', description: 'Vui lòng chọn một chính sách để tải Excel', variant: 'destructive' });
      return;
    }
    const item = POLICY_ITEMS.find(i => i.key === policyOpen);
    if (!item) return;

    // Find table element via data-policy-table attribute
    const container = document.querySelector(`[data-policy-table="${policyOpen}"]`);
    const tableEl = container?.querySelector('table') as HTMLTableElement | null;
    if (!tableEl) {
      toast({ title: 'Không tìm thấy bảng', description: 'Bảng chính sách chưa được render', variant: 'destructive' });
      return;
    }

    try {
      // Sheet 1: scrape DOM table
      const scrape = scrapePolicyTable(tableEl);

      // Sheet 2: build contract detail rows
      const contractRows = buildContractDetailRows(policyOpen);

      // Trigger download
      const now = new Date();
      const monthLabel = `T${now.getMonth() + 1}-${now.getFullYear()}`;
      downloadPolicyExcel(item.label, scrape, contractRows, { monthLabel, policyKey: policyOpen });

      toast({
        title: 'Đã tải file Excel',
        description: `${item.label} • ${contractRows.length} hợp đồng chi tiết`,
      });
    } catch (err) {
      console.error('[Excel Export] Error:', err);
      toast({ title: 'Lỗi tạo file Excel', description: String(err), variant: 'destructive' });
    }
  }, [policyOpen, buildContractDetailRows]);

  // ===== Tôn vinh Excel export: tải 4 bảng Top 5 (H1) về 1 file Excel 4 sheet =====
  const handleDownloadVinhDanhExcel = useCallback(() => {
    try {
      downloadVinhDanhExcel({
        top5Tvv: vinhDanhData.top5Tvv,
        top5TvvM: vinhDanhData.top5TvvM,
        top5Nhom: vinhDanhData.top5Nhom,
        nhomHoanThanhKH: vinhDanhData.nhomHoanThanhKH,
        h1RatioPct: vinhDanhData.h1RatioPct,
        year: new Date().getFullYear(),
      });
      toast({
        title: 'Đã tải file Excel Tôn vinh',
        description: `4 sheet: Top 5 TVV • Top 5 TVVm • Top 5 Nhóm • Nhóm hoàn thành KH H1`,
      });
    } catch (err) {
      console.error('[VinhDanh Excel Export] Error:', err);
      toast({ title: 'Lỗi tạo file Excel', description: String(err), variant: 'destructive' });
    }
  }, [vinhDanhData]);

  // Save policy image link to Settings API (uses PUT method to match /api/settings route)
  const savePolicyImage = useCallback(async (policyKey: string, link: string) => {
    try {
      const r = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [`policy-image-${policyKey}`]: link }),
      });
      if (!r.ok) {
        toast({ title: 'Lỗi lưu ảnh', description: `Máy chủ trả về lỗi ${r.status}`, variant: 'destructive' });
        return;
      }
      setPolicyImageLinks(prev => {
        const next = { ...prev };
        if (link) next[policyKey] = link;
        else delete next[policyKey];
        return next;
      });
    } catch (e) {
      console.error('Failed to save policy image:', e);
      toast({ title: 'Lỗi lưu ảnh', description: 'Không thể kết nối máy chủ', variant: 'destructive' });
    }
  }, []);

  const POLICY_ITEMS = [
    { key: 'tvvm', label: 'Thưởng TVVm', desc: 'Thưởng duy trì hoạt động TVV tháng', icon: UserPlus, color: '#7C3AED' },
    { key: 'ns-tvv', label: 'Thưởng Năng suất tháng TVV', desc: 'Thưởng năng suất IP tháng cho TVV', icon: TrendingUp, color: '#2563EB' },
    { key: 'quy-tvv', label: 'Thưởng Quý TVV', desc: 'Thưởng kết quả kinh doanh quý cho TVV', icon: Award, color: '#059669' },
    { key: 'tuyen-luyen', label: 'Thưởng Tuyển luyện', desc: 'Thưởng tuyển dụng và huấn luyện TVV mới', icon: UserCheck, color: '#D97706' },
    { key: 'dong-hanh', label: 'Thưởng Đồng hành', desc: 'Thưởng đồng hành phát triển nhóm', icon: Users, color: '#0891B2' },
    { key: 'ptkd-tn', label: 'Thưởng Phát triển kinh doanh TN', desc: 'Thưởng phát triển kinh doanh cho Trưởng nhóm', icon: Target, color: '#DC2626' },
    { key: 'quy-tn', label: 'Thưởng Quý TN', desc: 'Thưởng kết quả kinh doanh quý cho Trưởng nhóm', icon: Trophy, color: '#0D9488' },
    { key: 'tuyen-ngang', label: 'Thưởng chính sách TTN tuyển ngang', desc: 'Thưởng tuyển dụng ngang cấp cho TTN', icon: Merge, color: '#7C3AED' },
  ];

  // ========== TVVm Table Data ==========
  // isTVVm: TVV mới — có thời gian làm việc ≤ 12 tháng (giống định nghĩa trang thi đua)
  const isTVVm = (startDate: string | null, maxMonths: number = 12): boolean => {
    if (!startDate) return false;
    const start = new Date(startDate);
    const now = new Date();
    // Tháng bắt đầu = tháng 1, nên relativeMonth = diffMonths + 1
    // TVVm khi relativeMonth ≤ 12, tức là diffMonths < 12
    const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    return diffMonths < maxMonths;
  };

  // Tính chặng xét thưởng dựa trên tháng bắt đầu làm việc
  // Tháng bắt đầu = tháng thứ 1, tháng 1-3 = Chặng 1, tháng 4-6 = Chặng 2, v.v.
  const getChangInfo = (startDate: string | null): { chang: number; label: string; monthRange: string; relativeMonth: number; rangeStart: Date; rangeEnd: Date } => {
    if (!startDate) return { chang: 0, label: '—', monthRange: '', relativeMonth: 0, rangeStart: new Date(), rangeEnd: new Date() };
    const start = new Date(startDate);
    const now = new Date();
    // Tháng tương đối: tháng bắt đầu = 1
    const relativeMonth = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
    const chang = Math.min(Math.ceil(relativeMonth / 3), 4);
    const changLabels = ['', 'Chặng 1', 'Chặng 2', 'Chặng 3', 'Chặng 4'];
    // Tính range 3 tháng của chặng hiện tại
    // Chặng 1: relative month 1-3 → absolute month = start + 0..2
    // Chặng 2: relative month 4-6 → absolute month = start + 3..5
    const changStartRel = (chang - 1) * 3 + 1; // relative month đầu chặng
    const changEndRel = chang * 3;              // relative month cuối chặng
    const rangeStart = new Date(start.getFullYear(), start.getMonth() + (changStartRel - 1), 1);
    const rangeEnd = new Date(start.getFullYear(), start.getMonth() + changEndRel, 0); // last day of end month
    const monthRange = `T${rangeStart.getMonth() + 1}/${String(rangeStart.getFullYear()).slice(2)} - T${rangeEnd.getMonth() + 1}/${String(rangeEnd.getFullYear()).slice(2)}`;
    return { chang, label: changLabels[chang], monthRange, relativeMonth, rangeStart, rangeEnd };
  };

  const renderTvvMTable = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Filter chỉ TVVm (≤ 12 tháng theo định nghĩa trang thi đua)
    // Bỏ Ban Ca và TVV không có nhóm
    const tvvmList = tvvStructList.filter(tvv => {
      if (!isTVVm(tvv.ngayBatDau)) return false;
      if (!tvv.maBanNhom || tvv.maBanNhom.trim() === '') return false; // bỏ nhóm trống
      const nhomName = (banNhomList.find(bn => bn.maBanNhom === tvv.maBanNhom)?.tenBanNhom || '').toLowerCase();
      if (nhomName.includes('ban ca') || nhomName.includes('banca')) return false; // bỏ Ban Ca
      // Bỏ TVV thuộc phòng Banca (không tính thưởng)
      if (isTVVExcludedFromRewards(tvv.agentCode, tvv.maBanNhom, banNhomList, adList)) return false;
      return true;
    });

    // Build TVVm rows
    const tvvmRows = tvvmList.map((tvv) => {
      const changInfo = getChangInfo(tvv.ngayBatDau);

      // Calculate Tổng IP tháng hiện tại for this TVV
      const monthContracts = contracts.filter(c => {
        if (c.agentCode !== tvv.agentCode) return false;
        const d = getDoanhSoMonth(c);
        return !isNaN(d.getTime()) && d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth;
      });
      const tongIPThang = monthContracts.reduce((s, c) => s + c.pdt10DT, 0);

      // Calculate Tổng IP chặng = tổng IP của 3 tháng trong chặng hiện tại
      // VD: TVV bắt đầu 1/2, chặng 2 → tháng 4-6 của TVV = T5,T6,T7 → tổng IP T5+T6+T7
      let tongIPChang = 0;
      if (tvv.ngayBatDau && changInfo.chang > 0) {
        const rs = changInfo.rangeStart;
        const re = changInfo.rangeEnd;
        const reEnd = new Date(re.getFullYear(), re.getMonth(), re.getDate(), 23, 59, 59);
        const changContractsList = contracts.filter(c => {
          if (c.agentCode !== tvv.agentCode) return false;
          const d = getDoanhSoMonth(c);
          return !isNaN(d.getTime()) && d >= rs && d <= reEnd;
        });
        tongIPChang = changContractsList.reduce((s, c) => s + c.pdt10DT, 0);
      }

      // Get nhóm name — TVVm = chương trình TVV → allowPA=true
      const nhomName = resolveNhomName(tvv.agentCode, tvv.maBanNhom, banNhomList, contracts, leaders, { allowPA: true });

      // Get recruiter name — 2-step lookup trong DS Tổng TVV
      // (1) lấy agentCode của TVVm đó → lookup ra maTVVTuyendung (ẩn mã)
      // (2) dùng mã NTD đó → lookup lại ra agentName (hiển thị)
      const nguoiTD = resolveNguoiTD(tvv.agentCode, tvvStructList);

      return {
        stt: 0 as number,
        nhom: nhomName,
        maTVV: tvv.agentCode,
        hoTen: tvv.agentName,
        ngayBatDau: tvv.ngayBatDau,
        changXetThuong: changInfo.label,
        changMonthRange: changInfo.monthRange,
        chang: changInfo.chang,
        relativeMonth: changInfo.relativeMonth,
        tongIPThang,
        thuongThang: tongIPThang >= 12_000_000 ? 1_000_000 : 0,
        tongIPChang,
        thuongChang: (() => {
          if (changInfo.chang === 1) {
            if (tongIPChang >= 100_000_000) return 6_000_000; // 3tr chặng + 3tr xuất phát nhanh
            if (tongIPChang >= 50_000_000) return 3_000_000;
            return 0;
          } else if (changInfo.chang >= 2 && changInfo.chang <= 4) {
            return tongIPChang >= 100_000_000 ? 3_000_000 : 0;
          }
          return 0;
        })(),
        tenNguoiTD: nguoiTD,
      };
    });

    // Sắp xếp: theo chặng 1→4 asc, rồi theo ngày bắt đầu LV asc (ai làm trước đứng trước)
    tvvmRows.sort((a, b) => {
      if (a.chang !== b.chang) return a.chang - b.chang;
      const aDate = a.ngayBatDau ? new Date(a.ngayBatDau).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.ngayBatDau ? new Date(b.ngayBatDau).getTime() : Number.MAX_SAFE_INTEGER;
      return aDate - bDate;
    });

    // Gán STT sau khi sort
    tvvmRows.forEach((row, idx) => { row.stt = idx + 1; });

    // Thống kê theo chặng
    const changStats = [1, 2, 3, 4].map(c => ({
      chang: c,
      count: tvvmRows.filter(r => r.chang === c).length,
      ipChang: tvvmRows.filter(r => r.chang === c).reduce((s, r) => s + r.tongIPChang, 0),
    }));

    // Apply filters (TVVm)
    const filteredTvvmRows = tvvmRows.filter(row => {
      if (tvvmNhomFilter && row.nhom !== tvvmNhomFilter) return false;
      if (tvvmNameFilter && !row.hoTen.toLowerCase().includes(tvvmNameFilter.toLowerCase()) && !row.maTVV.toLowerCase().includes(tvvmNameFilter.toLowerCase())) return false;
      return true;
    });
    // Re-assign STT after filter
    filteredTvvmRows.forEach((row, idx) => { row.stt = idx + 1; });

    // Compute summary stats from filtered rows
    const tvvmDatThuongCount = filteredTvvmRows.filter(r => r.thuongThang > 0 || r.thuongChang > 0).length;
    const totalThuongThang = filteredTvvmRows.reduce((s, r) => s + r.thuongThang, 0);
    const totalThuongChang = filteredTvvmRows.reduce((s, r) => s + r.thuongChang, 0);
    const totalTienThuongAll = totalThuongThang + totalThuongChang;

    // Unique NHÓM list for filter
    const uniqueTvvmNhomList = Array.from(new Set(tvvmRows.map(r => r.nhom).filter(Boolean))).sort();

    // Chặng color cho separator
    const changBgColors: Record<number, string> = {
      1: '#DBEAFE', 2: '#FEF3C7', 3: '#D1FAE5', 4: '#E0E7FF',
    };
    const changTextColors: Record<number, string> = {
      1: '#1E40AF', 2: '#92400E', 3: '#065F46', 4: '#3730A3',
    };
    const changLabels: Record<number, string> = {
      1: 'CHẠNG 1 (Tháng 1-3)', 2: 'CHẠNG 2 (Tháng 4-6)', 3: 'CHẠNG 3 (Tháng 7-9)', 4: 'CHẠNG 4 (Tháng 10-12)',
    };

    // Common style constants — reused across all policy tables
    const HEADER_BG = '#065F46';  // emerald-800 (đậm)
    const HEADER_TEXT = '#FFFFFF';
    const TOTAL_BG = '#065F46';   // same emerald-800 for total row
    const THUONG_BG = '#FEF3C7';  // amber-100 (vàng nhạt)
    const THUONG_TEXT = '#047857'; // emerald-700 (xanh lá đậm)
    const THUONG_FONT = '12px';   // +1 so với body font (11px)

    return (
      <div className="space-y-1" data-policy-count={tvvmDatThuongCount} data-policy-amount={totalTienThuongAll}>
        {/* Single summary card — gộp 4 ô thành 1 */}
        <div className="hidden bg-white border shadow-lg px-4 py-2.5" style={{ borderColor: '#059669', borderRadius: 0 }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Thưởng TVVm — Tháng {currentMonth}/{currentYear}</p>
            </div>
            <div className="flex items-center gap-5 flex-wrap">
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">SL TVV ĐẠT</p>
                <p className="text-sm font-black text-emerald-700">{tvvmDatThuongCount}<span className="text-[9px] font-normal text-gray-400"> / {filteredTvvmRows.length}</span></p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">THƯỞNG THÁNG</p>
                <p className="text-sm font-black text-emerald-700">{formatSmartCurrency(totalThuongThang)}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">THƯỞNG CHẶNG</p>
                <p className="text-sm font-black text-emerald-700">{formatSmartCurrency(totalThuongChang)}</p>
              </div>
              <div className="text-center px-3 py-1 bg-amber-100 border border-amber-300">
                <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700">💰 TỔNG TIỀN THƯỞNG</p>
                <p className="text-base font-black text-emerald-700">{formatSmartCurrency(totalTienThuongAll)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters — top right of table */}
        <div className="hidden flex items-center justify-end gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border shadow-sm px-2 py-1" style={{ borderColor: '#A7F3D0', borderRadius: 0 }}>
            <Search className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <input
              type="text"
              placeholder="Tìm tên / mã TVV..."
              value={tvvmNameFilter}
              onChange={e => setTvvmNameFilter(e.target.value)}
              className="text-[11px] bg-transparent outline-none w-[130px] text-gray-700 placeholder:text-gray-400"
            />
            {tvvmNameFilter && (
              <button onClick={() => setTvvmNameFilter('')} className="text-gray-400 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setTvvmNhomFilter('')}
              className={`px-2 py-1 text-[10px] font-bold transition-colors whitespace-nowrap flex-shrink-0 ${
                !tvvmNhomFilter
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              }`}
              style={{ borderRadius: 0 }}
            >
              Tất cả
            </button>
            {uniqueTvvmNhomList.map(nhom => (
              <button
                key={nhom}
                onClick={() => setTvvmNhomFilter(tvvmNhomFilter === nhom ? '' : nhom)}
                className={`px-2 py-1 text-[10px] font-bold transition-colors whitespace-nowrap flex-shrink-0 ${
                  tvvmNhomFilter === nhom
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                }`}
                style={{ borderRadius: 0 }}
              >
                {nhom}
              </button>
            ))}
          </div>
        </div>

        {/* Result Table — green dark header + green dark total (consistent with Quý TVV) */}
        <div className="bg-white border shadow-xl h-full" style={{ borderColor: '#A7F3D0', borderRadius: 0 }}>
          <table className="w-full text-xs bg-white h-full" style={{ borderRadius: 0 }}>
            <thead className="sticky top-0 z-10">
              <tr style={{ backgroundColor: HEADER_BG }}>
                <th className="text-white text-center w-[32px] font-bold uppercase text-[11px] h-8 px-1 align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>STT</th>
                <th className="text-white min-w-[80px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>NHÓM</th>
                <th className="text-white min-w-[55px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>MÃ TVV</th>
                <th className="text-white min-w-[100px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>HỌ TÊN TVV</th>
                <th className="text-white min-w-[80px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>NGÀY BĐ LV</th>
                <th className="text-white min-w-[90px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>CHẶNG XÉT THƯỞNG</th>
                <th className="text-white min-w-[75px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>TỔNG IP<br/><span className="text-[9px] italic font-normal normal-case">(tháng {currentMonth})</span></th>
                <th className="text-white min-w-[80px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>THƯỞNG THÁNG</th>
                <th className="text-white min-w-[75px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>TỔNG IP CHẶNG</th>
                <th className="text-white min-w-[80px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>THƯỞNG CHẶNG<br/><span className="text-[9px] italic font-normal normal-case" style={{ color: '#FCA5A5' }}>(TVV nhận 1 lần/chặng)</span></th>
                <th className="text-white min-w-[100px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>NGƯỜI TUYỂN DỤNG</th>
              </tr>
            </thead>
            <tbody>
              {filteredTvvmRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center text-gray-400 py-8 italic text-xs bg-white p-2 align-middle whitespace-nowrap">Chưa có TVVm (TVV mới ≤ 12 tháng). Vui lòng nhập cấu trúc TVV trước.</td>
                </tr>
              ) : filteredTvvmRows.map((row, idx) => {
                // Chặng separator row
                const prevRow = idx > 0 ? filteredTvvmRows[idx - 1] : null;
                const showChangHeader = !prevRow || prevRow.chang !== row.chang;
                return (
                  <React.Fragment key={row.maTVV}>
                    {showChangHeader && (
                      <tr style={{ backgroundColor: changBgColors[row.chang] }}>
                        <td colSpan={11} className="py-0.5 px-3 text-[9px] font-black uppercase tracking-wider p-2 align-middle whitespace-nowrap" style={{ color: changTextColors[row.chang], borderRadius: 0, borderColor: '#B4D4F0', lineHeight: '1.3' }}>
                          {changLabels[row.chang]} — {changStats.find(cs => cs.chang === row.chang)?.count || 0} TVVm
                          <span className="ml-1 font-normal normal-case text-[8px]" style={{ color: changTextColors[row.chang] + '99' }}>({row.changMonthRange})</span>
                        </td>
                      </tr>
                    )}
                    <tr className="bg-white hover:bg-emerald-50 transition-colors border-b border-gray-300" style={{ borderRadius: 0 }}>
                      <td className="text-center text-gray-400 text-[11px] p-2 align-middle whitespace-nowrap" style={{ borderColor: '#D1FAE5' }}>{row.stt}</td>
                      <td className="text-[11px] text-gray-700 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.nhom || '—'}</td>
                      <td className="font-mono text-[11px] text-gray-500 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.maTVV}</td>
                      <td className="text-[11px] text-gray-800 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.hoTen}</td>
                      <td className="text-[11px] text-gray-500 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.ngayBatDau ? safeFormatDate(row.ngayBatDau) : '—'}</td>
                      <td className="text-[11px] text-center whitespace-nowrap p-2 align-middle" style={{ backgroundColor: changBgColors[row.chang] + '80', borderColor: '#D1FAE5' }}>
                        <span className="font-bold" style={{ color: changTextColors[row.chang] }}>{row.changXetThuong}</span>
                        <span className="text-gray-400 ml-1 text-[9px]">T{row.relativeMonth}</span>
                      </td>
                      <td className="text-[11px] font-bold text-right whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5', backgroundColor: '#FFF3E0', color: '#B45309' }}>{row.tongIPThang > 0 ? formatNumber(row.tongIPThang) : '—'}</td>
                      {/* THƯỜNG THÁNG — nền trắng, icon chip vàng, chữ xanh đậm to hơn 1 chút */}
                      <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5', backgroundColor: '#FFFFFF', color: '#047857', fontSize: '13px', fontWeight: 800 }}>
                        {renderThuongCellContent(row.thuongThang)}
                      </td>
                      <td className="text-[11px] font-bold text-right whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5', backgroundColor: '#E8F5E9', color: '#2E7D32' }}>{row.tongIPChang > 0 ? formatNumber(row.tongIPChang) : '—'}</td>
                      {/* THƯỞNG CHẶNG — nền trắng, icon chip vàng, chữ xanh đậm to hơn 1 chút */}
                      <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5', backgroundColor: '#FFFFFF', color: '#047857', fontSize: '13px', fontWeight: 800 }}>
                        {renderThuongCellContent(row.thuongChang)}
                      </td>
                      <td className="text-[11px] text-gray-500 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.tenNguoiTD || '—'}</td>
                    </tr>
                  </React.Fragment>
                );
              })}
              {/* Total row đã chuyển xuống footer cố định — không render ở đây nữa */}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ========== THƯỞNG QUÝ TVV ==========
  const renderThuongQuyTVV = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const currentQuarter = Math.ceil(currentMonth / 3); // 1-4

    // Determine quarter month range
    const quarterStartMonth = (currentQuarter - 1) * 3 + 1;
    const quarterEndMonth = currentQuarter * 3;
    const quarterLabel = `Quý ${currentQuarter} (T${quarterStartMonth}-T${quarterEndMonth})`;

    // Tier thresholds and rates
    const TIERS = [
      { label: 'FYP ≥ 24tr', rate: 8, minFYP: 24_000_000 },
      { label: 'FYP ≥ 60tr', rate: 10, minFYP: 60_000_000 },
      { label: 'FYP ≥ 90tr', rate: 13, minFYP: 90_000_000 },
      { label: 'FYP ≥ 150tr', rate: 15, minFYP: 150_000_000 },
      { label: 'FYP ≥ 250tr', rate: 18, minFYP: 250_000_000 },
      { label: 'FYP ≥ 350tr', rate: 20, minFYP: 350_000_000 },
    ];

    // Build TVV list — chỉ TVV có nhóm, bỏ TVV thuộc phòng Banca
    const tvvList = tvvStructList.filter(tvv => {
      if (!tvv.maBanNhom || tvv.maBanNhom.trim() === '') return false;
      if (isTVVExcludedFromRewards(tvv.agentCode, tvv.maBanNhom, banNhomList, adList)) return false;
      return true;
    });

    // Calculate FYP per TVV for current quarter
    const tvvRows = tvvList.map((tvv) => {
      // Tổng FYP Quý = sum of pdt10DT for contracts in the quarter months
      const quarterContracts = contracts.filter(c => {
        if (c.agentCode !== tvv.agentCode) return false;
        const d = getDoanhSoMonth(c);
        if (isNaN(d.getTime())) return false;
        if (d.getFullYear() !== currentYear) return false;
        const m = d.getMonth() + 1;
        return m >= quarterStartMonth && m <= quarterEndMonth;
      });
      const tongFYPQuy = quarterContracts.reduce((s, c) => s + c.pdt10DT, 0);
      const fyc = tongFYPQuy * 0.25; // FYC dự kiến 25%

      // Determine tier — find the highest tier the TVV qualifies for
      let achievedTier = -1;
      for (let i = TIERS.length - 1; i >= 0; i--) {
        if (tongFYPQuy >= TIERS[i].minFYP) {
          achievedTier = i;
          break;
        }
      }

      // Calculate bonus per tier column — show FYC * rate for achieved tier, dash for others
      const tierBonuses = TIERS.map((tier, idx) => {
        if (idx === achievedTier) return fyc * (tier.rate / 100);
        return 0;
      });

      // Tiền thưởng = FYC * tỷ lệ tầng đạt được
      const tienThuong = achievedTier >= 0 ? fyc * (TIERS[achievedTier].rate / 100) : 0;

      // Số lần đạt TQ = đếm số quý (từ Q1 đến quý hiện tại) TVV đạt FYP ≥ 24tr
      let soLanDatTQ = 0;
      for (let q = 1; q <= currentQuarter; q++) {
        const qStart = (q - 1) * 3 + 1;
        const qEnd = q * 3;
        const qContracts = contracts.filter(c => {
          if (c.agentCode !== tvv.agentCode) return false;
          const d = getDoanhSoMonth(c);
          if (isNaN(d.getTime())) return false;
          if (d.getFullYear() !== currentYear) return false;
          const m = d.getMonth() + 1;
          return m >= qStart && m <= qEnd;
        });
        const qFYP = qContracts.reduce((s, c) => s + c.pdt10DT, 0);
        if (qFYP >= TIERS[0].minFYP) soLanDatTQ++;
      }

      // Quý TVV = chương trình TVV → allowPA=true
      const nhomName = resolveNhomName(tvv.agentCode, tvv.maBanNhom, banNhomList, contracts, leaders, { allowPA: true });

      return {
        stt: 0 as number,
        nhom: nhomName,
        maTVV: tvv.agentCode,
        hoTen: tvv.agentName,
        tongFYPQuy,
        fyc,
        achievedTier,
        tierBonuses,
        tienThuong,
        soLanDatTQ,
      };
    });

    // Sort: theo TỔNG FYP giảm dần
    tvvRows.sort((a, b) => b.tongFYPQuy - a.tongFYPQuy);

    // Unique NHÓM list for filter
    const uniqueNhomList = Array.from(new Set(tvvRows.map(r => r.nhom).filter(Boolean))).sort();

    // Apply NHÓM filter
    const filteredRows = tvvRows.filter(row => {
      if (quyTvvNhomFilter && row.nhom !== quyTvvNhomFilter) return false;
      if (quyTvvNameFilter && !row.hoTen.toLowerCase().includes(quyTvvNameFilter.toLowerCase()) && !row.maTVV.toLowerCase().includes(quyTvvNameFilter.toLowerCase())) return false;
      return true;
    });

    // Assign STT after filter
    filteredRows.forEach((row, idx) => { row.stt = idx + 1; });

    // Totals (from filtered rows)
    const totalFYPQuy = filteredRows.reduce((s, r) => s + r.tongFYPQuy, 0);
    const totalFYC = filteredRows.reduce((s, r) => s + r.fyc, 0);
    const totalTienThuong = filteredRows.reduce((s, r) => s + r.tienThuong, 0);
    const totalSoLanDatTQ = filteredRows.reduce((s, r) => s + r.soLanDatTQ, 0);

    // Count TVV đạt thưởng (achievedTier >= 0)
    const tvvDatThuong = filteredRows.filter(r => r.achievedTier >= 0).length;

    return (
      <div className="space-y-1" data-policy-count={tvvDatThuong} data-policy-amount={totalTienThuong}>
        {/* Single summary card — gộp 2 ô thành 1, đồng nhất TVVm */}
        <div className="hidden bg-white border shadow-lg px-4 py-2.5" style={{ borderColor: '#059669', borderRadius: 0 }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Thưởng Quý TVV — {quarterLabel}</p>
            </div>
            <div className="flex items-center gap-5 flex-wrap">
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">SL TVV ĐẠT</p>
                <p className="text-sm font-black text-emerald-700">{tvvDatThuong}<span className="text-[9px] font-normal text-gray-400"> / {filteredRows.length}</span></p>
              </div>
              <div className="text-center px-3 py-1 bg-amber-100 border border-amber-300">
                <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700">💰 TỔNG TIỀN THƯỞNG</p>
                <p className="text-base font-black text-emerald-700">{formatSmartCurrency(totalTienThuong)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters — top right of table */}
        <div className="hidden flex items-center justify-end gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border shadow-sm px-2 py-1" style={{ borderColor: '#A7F3D0', borderRadius: 0 }}>
            <Search className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <input
              type="text"
              placeholder="Tìm tên / mã TVV..."
              value={quyTvvNameFilter}
              onChange={e => setQuyTvvNameFilter(e.target.value)}
              className="text-[11px] bg-transparent outline-none w-[130px] text-gray-700 placeholder:text-gray-400"
            />
            {quyTvvNameFilter && (
              <button onClick={() => setQuyTvvNameFilter('')} className="text-gray-400 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setQuyTvvNhomFilter('')}
              className={`px-2 py-1 text-[10px] font-bold transition-colors whitespace-nowrap flex-shrink-0 ${
                !quyTvvNhomFilter
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              }`}
              style={{ borderRadius: 0 }}
            >
              Tất cả
            </button>
            {uniqueNhomList.map(nhom => (
              <button
                key={nhom}
                onClick={() => setQuyTvvNhomFilter(quyTvvNhomFilter === nhom ? '' : nhom)}
                className={`px-2 py-1 text-[10px] font-bold transition-colors whitespace-nowrap flex-shrink-0 ${
                  quyTvvNhomFilter === nhom
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                }`}
                style={{ borderRadius: 0 }}
              >
                {nhom}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border shadow-xl h-full" style={{ borderColor: '#A7F3D0', borderRadius: 0 }}>
          <table className="w-full text-xs bg-white h-full" style={{ borderRadius: 0 }}>
            <thead className="sticky top-0 z-10">
              {/* Row 1: Main headers — PHÂN TẦNG merged label */}
              <tr style={{ backgroundColor: '#065F46' }}>
                <th rowSpan={3} className="text-white text-center w-[32px] font-bold uppercase text-[11px] h-8 px-1 align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>STT</th>
                <th rowSpan={3} className="text-white min-w-[80px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>NHÓM</th>
                <th rowSpan={3} className="text-white min-w-[55px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>MÃ TVV</th>
                <th rowSpan={3} className="text-white min-w-[100px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>HỌ TÊN TVV</th>
                <th rowSpan={3} className="text-white min-w-[75px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#2563EB', backgroundColor: '#1D4ED8' }}>TỔNG FYP<br/><span className="text-[9px] italic font-normal normal-case">Quý {currentQuarter}</span></th>
                <th rowSpan={3} className="text-white min-w-[70px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#7C3AED', backgroundColor: '#6D28D9' }}>FYC<br/><span className="text-[9px] italic font-normal normal-case">(Dự kiến 25%)</span></th>
                <th colSpan={6} className="text-white font-bold uppercase text-[12px] px-2 text-center align-middle whitespace-nowrap" style={{ backgroundColor: TIER_GROUP_HEADER_BG, borderColor: TIER_GROUP_HEADER_BG, height: '26px', lineHeight: '1' }}>TỶ LỆ THƯỞNG</th>
                <th rowSpan={3} className="text-white min-w-[80px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>TIỀN<br/>THƯỞNG</th>
                <th rowSpan={3} className="text-white min-w-[60px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>SỐ LẦN<br/>ĐẠT TQ</th>
              </tr>
              {/* Row 2: FYP thresholds — solid teal header, white text */}
              <tr style={{ backgroundColor: TIER_HEADER_BG }}>
                {TIERS.map((tier, idx) => (
                  <th key={idx} className="text-white italic font-normal text-[11px] px-1 text-center align-middle whitespace-nowrap" style={{ borderColor: TIER_GROUP_HEADER_BG, height: '18px', lineHeight: '1' }}>
                    {tier.label.replace('FYP ≥ ', '≥').replace('tr', '')}
                  </th>
                ))}
              </tr>
              {/* Row 3: Percentage rates — teal gradient bg, italic red numbers */}
              <tr>
                {TIERS.map((tier, idx) => (
                  <th key={idx} className="italic font-normal text-[13px] px-1 text-center align-middle whitespace-nowrap" style={{ borderColor: TIER_BORDER, height: '20px', lineHeight: '1', backgroundColor: TIER_GRADIENT_BG[idx], color: TIER_RATE_COLOR, textShadow: '0 0 1px rgba(255,255,255,0.5)' }}>
                    {tier.rate}%
                  </th>
                ))}
              </tr>
              {/* Row 4: Full-width separator line — runs across all 14 columns */}
              <tr>
                <th colSpan={14} style={{ height: '3px', padding: 0, margin: 0, backgroundColor: TIER_GROUP_HEADER_BG, borderBottom: 'none' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center text-gray-400 py-8 italic text-xs bg-white p-2 align-middle">{tvvRows.length === 0 ? 'Chưa có TVV. Vui lòng nhập cấu trúc TVV trước.' : 'Không tìm thấy TVV phù hợp bộ lọc.'}</td>
                </tr>
              ) : filteredRows.map((row, idx) => {
                return (
                  <tr key={row.maTVV} className="bg-white hover:bg-emerald-50 transition-colors border-b border-gray-300" style={{ borderRadius: 0 }}>
                    <td className="text-center text-gray-400 text-[11px] p-2 align-middle whitespace-nowrap" style={{ borderColor: '#D1FAE5' }}>{row.stt}</td>
                    <td className="text-[11px] text-gray-700 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.nhom || '—'}</td>
                    <td className="font-mono text-[11px] text-gray-500 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.maTVV}</td>
                    <td className="text-[11px] text-gray-800 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.hoTen}</td>
                    <td className="text-[11px] font-bold text-right whitespace-nowrap p-2 align-middle" style={{ borderColor: '#BFDBFE', backgroundColor: '#DBEAFE', color: '#1E40AF' }}>{row.tongFYPQuy > 0 ? formatNumber(row.tongFYPQuy) : '—'}</td>
                    <td className="text-[11px] font-bold text-right whitespace-nowrap p-2 align-middle" style={{ borderColor: '#DDD6FE', backgroundColor: '#EDE9FE', color: '#5B21B6' }}>{row.fyc > 0 ? formatNumber(row.fyc) : '—'}</td>
                    {TIERS.map((tier, tIdx) => {
                      const isAchieved = tIdx <= row.achievedTier && row.achievedTier >= 0;
                      const deficit = row.tongFYPQuy < tier.minFYP ? tier.minFYP - row.tongFYPQuy : 0;
                      // Body gradient — same yellow gradient as header
                      // Achieved → soft green (signal success)
                      const achievedGreen = ['#F0FDF4', '#DCFCE7', '#BBF7D0', '#A7F3D0', '#86EFAC', '#6EE7B7'];
                      return (
                        <td key={tIdx} className="text-[10px] italic text-center whitespace-nowrap p-1 align-middle" style={{
                          borderColor: isAchieved ? '#A7F3D0' : TIER_BORDER,
                          backgroundColor: isAchieved ? achievedGreen[tIdx] : TIER_GRADIENT_BG[tIdx],
                          color: isAchieved ? '#047857' : TIER_BODY_TEXT_COLOR,
                          fontWeight: isAchieved ? 800 : 700,
                        }}>
                          {isAchieved ? (
                            <span className="font-bold italic text-[10px]">ĐẠT</span>
                          ) : (
                            <span className="text-[11px] font-bold" style={{ color: '#C2723B' }}>{deficit > 0 ? `−${Math.round(deficit / 1_000_000)}` : '—'}</span>
                          )}
                        </td>
                      );
                    })}
                    {/* TIỀN THƯỞNG — nền trắng, icon chip vàng, chữ xanh đậm to hơn 1 chút */}
                    <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5', backgroundColor: '#FFFFFF', color: '#047857', fontSize: '13px', fontWeight: 800 }}>
                      {renderThuongCellContent(row.tienThuong)}
                    </td>
                    <td className="text-[11px] font-bold text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5', backgroundColor: '#ECFDF5', color: '#065F46' }}>{row.soLanDatTQ > 0 ? row.soLanDatTQ : '—'}</td>
                  </tr>
                );
              })}
              {/* Total row đã chuyển xuống footer cố định — không render ở đây nữa */}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ========== THƯỞNG NĂNG SUẤT THÁNG TVV ==========
  const renderThuongNSThangTVV = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    // NS tier thresholds + rates (monthly)
    // Điều kiện cần: IP tháng liền trước >= 3tr đ. Khi đạt ĐK, xét tier theo IP tháng hiện tại.
    const NS_TIERS = [
      { label: 'IP ≥ 12tr', rate: 10, minIP: 12_000_000 },
      { label: 'IP ≥ 24tr', rate: 15, minIP: 24_000_000 },
      { label: 'IP ≥ 50tr', rate: 18, minIP: 50_000_000 },
    ];
    // Điều kiện cần: IP tháng liền trước phải >= 3.000.000đ
    const NS_DIEU_KIEN_THANG_TRUOC = 3_000_000;

    // Build TVV list — chỉ TVV có nhóm, bỏ TVV thuộc phòng Banca
    const tvvList = tvvStructList.filter(tvv => {
      if (!tvv.maBanNhom || tvv.maBanNhom.trim() === '') return false;
      if (isTVVExcludedFromRewards(tvv.agentCode, tvv.maBanNhom, banNhomList, adList)) return false;
      return true;
    });

    // Calculate IP per TVV for current month + previous month
    const tvvRows = tvvList.map((tvv) => {
      // Tổng IP tháng hiện tại
      const currentMonthContracts = contracts.filter(c => {
        if (c.agentCode !== tvv.agentCode) return false;
        const d = getDoanhSoMonth(c);
        if (isNaN(d.getTime())) return false;
        return d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth;
      });
      const tongIPThangHienTai = currentMonthContracts.reduce((s, c) => s + c.pdt10DT, 0);

      // Tổng IP tháng liền trước
      const prevMonthContracts = contracts.filter(c => {
        if (c.agentCode !== tvv.agentCode) return false;
        const d = getDoanhSoMonth(c);
        if (isNaN(d.getTime())) return false;
        return d.getFullYear() === prevMonthYear && (d.getMonth() + 1) === prevMonth;
      });
      const tongIPThangTruoc = prevMonthContracts.reduce((s, c) => s + c.pdt10DT, 0);

      // FYC = IP tháng hiện tại × 25% (giả định TLHH)
      const fyc = tongIPThangHienTai * 0.25;

      // Điều kiện cần: IP tháng liền trước phải >= 3tr đ
      // Nếu không đạt ĐK → không được xét thưởng (TL=0, TIỀN THƯỞNG=0)
      const datDieuKienThangTruoc = tongIPThangTruoc >= NS_DIEU_KIEN_THANG_TRUOC;

      // Determine tier — find highest tier the TVV qualifies for (based on current month IP)
      // Chỉ xét tier nếu đã đạt điều kiện tháng trước
      let achievedTier = -1;
      if (datDieuKienThangTruoc) {
        for (let i = NS_TIERS.length - 1; i >= 0; i--) {
          if (tongIPThangHienTai >= NS_TIERS[i].minIP) {
            achievedTier = i;
            break;
          }
        }
      }

      // TL THƯỞNG = rate của tier đạt được (or 0)
      const tlThuong = achievedTier >= 0 ? NS_TIERS[achievedTier].rate : 0;

      // TIỀN THƯỞNG = FYC × TL%
      const tienThuong = achievedTier >= 0 ? fyc * (NS_TIERS[achievedTier].rate / 100) : 0;

      // NS Tháng TVV = chương trình TVV → allowPA=true
      const nhomName = resolveNhomName(tvv.agentCode, tvv.maBanNhom, banNhomList, contracts, leaders, { allowPA: true });

      return {
        stt: 0 as number,
        nhom: nhomName,
        maTVV: tvv.agentCode,
        hoTen: tvv.agentName,
        tongIPThangTruoc,
        tongIPThangHienTai,
        fyc,
        datDieuKienThangTruoc,
        achievedTier,
        tlThuong,
        tienThuong,
      };
    });

    // Sort: theo TỔNG IP tháng hiện tại giảm dần
    tvvRows.sort((a, b) => b.tongIPThangHienTai - a.tongIPThangHienTai);

    // Unique NHÓM list for filter
    const uniqueNhomList = Array.from(new Set(tvvRows.map(r => r.nhom).filter(Boolean))).sort();

    // Apply filters
    const filteredRows = tvvRows.filter(row => {
      if (nsTvvNhomFilter && row.nhom !== nsTvvNhomFilter) return false;
      if (nsTvvNameFilter && !row.hoTen.toLowerCase().includes(nsTvvNameFilter.toLowerCase()) && !row.maTVV.toLowerCase().includes(nsTvvNameFilter.toLowerCase())) return false;
      return true;
    });

    // Assign STT after filter
    filteredRows.forEach((row, idx) => { row.stt = idx + 1; });

    // Totals
    const totalIPThangTruoc = filteredRows.reduce((s, r) => s + r.tongIPThangTruoc, 0);
    const totalIPThangHienTai = filteredRows.reduce((s, r) => s + r.tongIPThangHienTai, 0);
    const totalFYC = filteredRows.reduce((s, r) => s + r.fyc, 0);
    const totalTienThuong = filteredRows.reduce((s, r) => s + r.tienThuong, 0);
    const tvvDatThuong = filteredRows.filter(r => r.achievedTier >= 0).length;

    // Style constants for cột TIỀN THƯỞNG (đồng nhất TVVm + Quý TVV)
    const THUONG_BG = '#FEF3C7';      // amber-100
    const THUONG_TEXT = '#047857';    // emerald-700
    const THUONG_FONT = '12px';       // +1 so với body 11px
    const HEADER_BG = '#065F46';      // emerald-800
    const TOTAL_BG = '#065F46';       // same emerald-800

    return (
      <div className="space-y-1" data-policy-count={tvvDatThuong} data-policy-amount={totalTienThuong}>
        {/* Single summary card — đồng nhất TVVm + Quý TVV */}
        <div className="hidden bg-white border shadow-lg px-4 py-2.5" style={{ borderColor: '#059669', borderRadius: 0 }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Thưởng NS Tháng TVV — Tháng {currentMonth}/{currentYear}</p>
            </div>
            <div className="flex items-center gap-5 flex-wrap">
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">SL TVV ĐẠT</p>
                <p className="text-sm font-black text-emerald-700">{tvvDatThuong}<span className="text-[9px] font-normal text-gray-400"> / {filteredRows.length}</span></p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">TỔNG FYC</p>
                <p className="text-sm font-black text-emerald-700">{formatSmartCurrency(totalFYC)}</p>
              </div>
              <div className="text-center px-3 py-1 bg-amber-100 border border-amber-300">
                <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700">💰 TỔNG TIỀN THƯỞNG</p>
                <p className="text-base font-black text-emerald-700">{formatSmartCurrency(totalTienThuong)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters — top right of table */}
        <div className="hidden flex items-center justify-end gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border shadow-sm px-2 py-1" style={{ borderColor: '#A7F3D0', borderRadius: 0 }}>
            <Search className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <input
              type="text"
              placeholder="Tìm tên / mã TVV..."
              value={nsTvvNameFilter}
              onChange={e => setNsTvvNameFilter(e.target.value)}
              className="text-[11px] bg-transparent outline-none w-[130px] text-gray-700 placeholder:text-gray-400"
            />
            {nsTvvNameFilter && (
              <button onClick={() => setNsTvvNameFilter('')} className="text-gray-400 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setNsTvvNhomFilter('')}
              className={`px-2 py-1 text-[10px] font-bold transition-colors whitespace-nowrap flex-shrink-0 ${
                !nsTvvNhomFilter
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              }`}
              style={{ borderRadius: 0 }}
            >
              Tất cả
            </button>
            {uniqueNhomList.map(nhom => (
              <button
                key={nhom}
                onClick={() => setNsTvvNhomFilter(nsTvvNhomFilter === nhom ? '' : nhom)}
                className={`px-2 py-1 text-[10px] font-bold transition-colors whitespace-nowrap flex-shrink-0 ${
                  nsTvvNhomFilter === nhom
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                }`}
                style={{ borderRadius: 0 }}
              >
                {nhom}
              </button>
            ))}
          </div>
        </div>

        {/* Result Table */}
        <div className="bg-white border shadow-xl h-full" style={{ borderColor: '#A7F3D0', borderRadius: 0 }}>
          <table className="w-full text-xs bg-white h-full" style={{ borderRadius: 0 }}>
            <thead className="sticky top-0 z-10">
              <tr style={{ backgroundColor: HEADER_BG }}>
                <th className="text-white text-center w-[32px] font-bold uppercase text-[11px] h-8 px-1 align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>STT</th>
                <th className="text-white min-w-[80px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>NHÓM</th>
                <th className="text-white min-w-[55px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>MÃ SỐ TVV</th>
                <th className="text-white min-w-[100px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>HỌ TÊN TVV</th>
                {/* TỔNG IP T5 (tháng liền trước) — DARK TEAL header (#0F766E, white text), body lightest blue tint */}
                <th className="text-white min-w-[100px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#0F766E', backgroundColor: '#0F766E' }}>
                  TỔNG IP T{prevMonth}
                  <br/>
                  <span className="text-[9px] italic font-normal normal-case" style={{ color: '#A7F3D0' }}>(ĐK ≥ 3 trđ)</span>
                </th>
                {/* TỔNG IP T6 (tháng hiện tại) — DARK NAVY header (#1E3A8A, white text), body lightest violet tint */}
                <th className="text-white min-w-[100px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#1E3A8A', backgroundColor: '#1E3A8A' }}>
                  TỔNG IP T{currentMonth}
                </th>
                <th className="text-white min-w-[90px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#7C3AED', backgroundColor: '#6D28D9' }}>
                  FYC
                  <br/>
                  <span className="text-[10px] italic font-normal normal-case text-amber-200">(Giả định TLHH là 25%)</span>
                </th>
                <th className="text-white min-w-[70px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: TIER_GROUP_HEADER_BG, backgroundColor: TIER_GROUP_HEADER_BG }}>TL THƯỞNG</th>
                <th className="text-white min-w-[90px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>TIỀN THƯỞNG</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-gray-400 py-8 italic text-xs bg-white p-2 align-middle">{tvvRows.length === 0 ? 'Chưa có TVV. Vui lòng nhập cấu trúc TVV trước.' : 'Không tìm thấy TVV phù hợp bộ lọc.'}</td>
                </tr>
              ) : filteredRows.map((row) => (
                <tr key={row.maTVV} className="bg-white hover:bg-emerald-50 transition-colors border-b border-gray-300" style={{ borderRadius: 0 }}>
                  <td className="text-center text-gray-400 text-[11px] p-2 align-middle whitespace-nowrap" style={{ borderColor: '#D1FAE5' }}>{row.stt}</td>
                  <td className="text-[11px] text-gray-700 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.nhom || '—'}</td>
                  <td className="font-mono text-[11px] text-gray-500 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.maTVV}</td>
                  <td className="text-[11px] text-gray-800 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.hoTen}</td>
                  {/* T5 — body bg #F0F7FF (very light blue), text #1E40AF (blue-800) */}
                  <td className="text-[11px] font-bold text-right whitespace-nowrap p-2 align-middle" style={{ borderColor: '#BFDBFE', backgroundColor: '#F0F7FF', color: '#1E40AF' }}>{row.tongIPThangTruoc > 0 ? formatNumber(row.tongIPThangTruoc) : '—'}</td>
                  {/* T6 — body bg #F5F3FF (very light violet), text #5B21B6 (violet-800) */}
                  <td className="text-[11px] font-bold text-right whitespace-nowrap p-2 align-middle" style={{ borderColor: '#DDD6FE', backgroundColor: '#F5F3FF', color: '#5B21B6' }}>{row.tongIPThangHienTai > 0 ? formatNumber(row.tongIPThangHienTai) : '—'}</td>
                  <td className="text-[11px] font-bold text-right whitespace-nowrap p-2 align-middle" style={{ borderColor: '#DDD6FE', backgroundColor: '#EDE9FE', color: '#5B21B6' }}>{row.fyc > 0 ? formatNumber(row.fyc) : '—'}</td>
                  {/* TL THƯỞNG — yellow gradient bg + bold red % number (đồng nhất Quý TVV tier rate) */}
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: TIER_BORDER, backgroundColor: row.achievedTier >= 0 ? TIER_GRADIENT_BG[row.achievedTier] : '#F9FAFB', color: TIER_RATE_COLOR, fontSize: '13px', fontWeight: 900 }}>
                    {row.tlThuong > 0 ? `${row.tlThuong}%` : <span style={{ color: '#9CA3AF', fontWeight: 400 }}>—</span>}
                  </td>
                  {/* TIỀN THƯỞNG — nền trắng, icon chip vàng, chữ xanh đậm to hơn 1 chút */}
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5', backgroundColor: '#FFFFFF', color: '#047857', fontSize: '13px', fontWeight: 800 }}>
                    {renderThuongCellContent(row.tienThuong)}
                  </td>
                </tr>
              ))}
              {/* Total row đã chuyển xuống footer cố định — không render ở đây nữa */}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ========== THƯỞNG TUYỂN LUYỆN ==========
  // CS Tuyển Luyện dành cho TB/TN (Trưởng Bộ / Trưởng Nhóm) — KHÔNG dành cho TTN.
  // Đối tượng = DS TB/TN (leaders), loại TTN (vì TTN chỉ dành cho CS Đồng Hành).
  // HĐC = TVV được tuyển dụng có ít nhất 1 contract trong tháng hiện tại.
  // Tiers:
  //   1 TVVm HĐC  → 100% thưởng TVVm
  //   2   TVVm HĐC → 125%
  //   ≥3  TVVm HĐC → 150%
  const renderThuongTuyenLuyen = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    // Theo ảnh chính sách: Thưởng Tuyển Luyện = Tỷ lệ × Tổng thưởng TVVm tại tháng
    // ≥3 TVVm HĐC: 150% | 2: 125% | 1: 100%

    // Build TB/TN rows: dùng DS TB/TN (leaders) làm nguồn đối tượng, LOẠI TTN
    // NGUYÊN TẮC: CS Tuyển Luyện dành cho TB/TN → đối tượng = leaders có position TB/TN
    // Bỏ TVV thuộc phòng Banca (không tính thưởng)
    const ntdCandidates = leaders
      .filter(l => isTBorTNPosition(l.position))  // chỉ TB/TN, loại TTN
      .filter(l => !isTVVExcludedFromRewards(l.agentCode, l.maNhom || '', banNhomList, adList))
      .map(l => ({
        agentCode: l.agentCode,
        agentName: l.agentName,
        maBanNhom: l.maNhom || '',
        nhomName: l.nhom || '',
      }));

    // Build rows: for each TB/TN candidate, count TVVm (≤12 tháng) they recruited that have HĐC in current month
    const ntdRows = ntdCandidates.map((ntd) => {
      // NGUYÊN TẮC: xác định TVVm do TB/TN nào tuyển DUY NHẤT qua mã người tuyển dụng
      // (tvv.maTVVTuyendung === ntd.agentCode). Nếu maTVVTuyendung trống → không có người tuyển → bỏ qua.
      // KHÔNG fallback qua contracts.maDaiLyTD.
      const ntdCode = (ntd.agentCode || '').trim();
      const recruitedTVVs = tvvStructList.filter(tvv => {
        const recruiter = (tvv.maTVVTuyendung || '').trim();
        return recruiter && recruiter === ntdCode;
      });

      // Count TVVm (≤12 tháng, tính tròn tháng) with HĐC (at least 1 contract in current month)
      const tvvmHDCList = recruitedTVVs.filter(tvv => {
        if (!isTVVm(tvv.ngayBatDau)) return false;
        return contracts.some(c => {
          if (c.agentCode !== tvv.agentCode) return false;
          const d = getDoanhSoMonth(c);
          if (isNaN(d.getTime())) return false;
          return d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth;
        });
      });
      const tvvmHDCCount = tvvmHDCList.length;

      // Tính Tổng thưởng TVVm tại tháng (thưởng tháng + thưởng chặng)
      let tongThuongTVVm = 0;
      tvvmHDCList.forEach(tvv => {
        const changInfo = getChangInfo(tvv.ngayBatDau);
        // IP tháng hiện tại
        const monthContracts = contracts.filter(c => {
          if (c.agentCode !== tvv.agentCode) return false;
          const d = getDoanhSoMonth(c);
          if (isNaN(d.getTime())) return false;
          return d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth;
        });
        const tongIPThang = monthContracts.reduce((s, c) => s + c.pdt10DT, 0);
        const thuongThang = tongIPThang >= 12_000_000 ? 1_000_000 : 0;

        // IP chặng
        let tongIPChang = 0;
        if (tvv.ngayBatDau && changInfo.chang > 0) {
          const rs = changInfo.rangeStart;
          const re = changInfo.rangeEnd;
          const reEnd = new Date(re.getFullYear(), re.getMonth(), re.getDate(), 23, 59, 59);
          const changContracts = contracts.filter(c => {
            if (c.agentCode !== tvv.agentCode) return false;
            const d = getDoanhSoMonth(c);
            return !isNaN(d.getTime()) && d >= rs && d <= reEnd;
          });
          tongIPChang = changContracts.reduce((s, c) => s + c.pdt10DT, 0);
        }
        let thuongChang = 0;
        if (changInfo.chang === 1) {
          if (tongIPChang >= 100_000_000) thuongChang = 6_000_000;
          else if (tongIPChang >= 50_000_000) thuongChang = 3_000_000;
        } else if (changInfo.chang >= 2 && changInfo.chang <= 4) {
          if (tongIPChang >= 100_000_000) thuongChang = 3_000_000;
        }
        tongThuongTVVm += thuongThang + thuongChang;
      });

      // Tỷ lệ thưởng theo ảnh: ≥3: 150%, 2: 125%, 1: 100%
      let tlThuong = 0;
      if (tvvmHDCCount >= 3) tlThuong = 150;
      else if (tvvmHDCCount === 2) tlThuong = 125;
      else if (tvvmHDCCount === 1) tlThuong = 100;

      // TIỀN THƯỞNG = Tỷ lệ × Tổng thưởng TVVm
      const tienThuong = Math.round(tongThuongTVVm * (tlThuong / 100));

      // Tuyển Luyện = chương trình dành cho TB/TN → allowPA=false (chỉ DS TB/TN)
      // Bỏ fallback ntd.nhomName — chỉ hiển thị nhóm có trong DS TB/TN
      const nhomName = resolveNhomName(ntd.agentCode, ntd.maBanNhom, banNhomList, contracts, leaders, { allowPA: false });

      return {
        stt: 0 as number,
        nhom: nhomName,
        maNTD: ntd.agentCode,
        hoTen: ntd.agentName,
        tongThuongTVVm,
        slTVVmHDC: tvvmHDCCount,
        tlThuong,
        tienThuong,
      };
    });

    // Sort: SL TVVm HĐC desc, then TIỀN THƯỞNG desc
    ntdRows.sort((a, b) => {
      if (b.slTVVmHDC !== a.slTVVmHDC) return b.slTVVmHDC - a.slTVVmHDC;
      return b.tienThuong - a.tienThuong;
    });

    // Filter — chỉ filter theo NHÓM và search, KHÔNG filter theo slTVVmHDC
    // NGUYÊN TẮC: hiển thị TẤT CẢ đối tượng NTD từ cấu trúc
    // File doanh số chỉ để tính toán, không filter đối tượng
    const filteredRows = ntdRows.filter(row => {
      if (tuyenLuyenNhomFilter && row.nhom !== tuyenLuyenNhomFilter) return false;
      if (tuyenLuyenNameFilter && !row.hoTen.toLowerCase().includes(tuyenLuyenNameFilter.toLowerCase()) && !row.maNTD.toLowerCase().includes(tuyenLuyenNameFilter.toLowerCase())) return false;
      return true;
    });
    filteredRows.forEach((row, idx) => { row.stt = idx + 1; });

    const totalTienThuong = filteredRows.reduce((s, r) => s + r.tienThuong, 0);
    const totalSLTVVHDC = filteredRows.reduce((s, r) => s + r.slTVVmHDC, 0);
    const ntdDatThuongCount = filteredRows.filter(r => r.tienThuong > 0).length;
    const uniqueNhomList = Array.from(new Set(ntdRows.map(r => r.nhom).filter(Boolean))).sort();

    const THUONG_BG = '#FEF3C7';
    const THUONG_TEXT = '#047857';
    const THUONG_FONT = '12px';
    const HEADER_BG = '#065F46';
    const TOTAL_BG = '#065F46';

    return (
      <div className="space-y-1" data-policy-count={ntdDatThuongCount} data-policy-amount={totalTienThuong}>
        {/* Summary card */}
        <div className="hidden bg-white border shadow-lg px-4 py-2.5" style={{ borderColor: '#059669', borderRadius: 0 }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Thưởng Tuyển Luyện — Tháng {currentMonth}/{currentYear}</p>
            </div>
            <div className="flex items-center gap-5 flex-wrap">
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">SL TB/TN ĐẠT</p>
                <p className="text-sm font-black text-emerald-700">{filteredRows.length}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">TỔNG SL TVVm HĐC</p>
                <p className="text-sm font-black text-emerald-700">{totalSLTVVHDC}</p>
              </div>
              <div className="text-center px-3 py-1 bg-amber-100 border border-amber-300">
                <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700">💰 TỔNG TIỀN THƯỞNG</p>
                <p className="text-base font-black text-emerald-700">{formatSmartCurrency(totalTienThuong)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tier hint */}
        <div className="hidden text-[10px] text-gray-500 italic">
          TL: 1 TVVm = 100% • 2 TVVm = 125% • ≥3 TVVm = 150% • TIỀN THƯỞNG = Tỷ lệ × Tổng thưởng TVVm
        </div>

        {/* Filters */}
        <div className="hidden flex items-center justify-end gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border shadow-sm px-2 py-1" style={{ borderColor: '#A7F3D0', borderRadius: 0 }}>
            <Search className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <input type="text" placeholder="Tìm tên / mã TB/TN..." value={tuyenLuyenNameFilter} onChange={e => setTuyenLuyenNameFilter(e.target.value)} className="text-[11px] bg-transparent outline-none w-[130px] text-gray-700 placeholder:text-gray-400" />
            {tuyenLuyenNameFilter && <button onClick={() => setTuyenLuyenNameFilter('')} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>}
          </div>
          <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <button onClick={() => setTuyenLuyenNhomFilter('')} className={`px-2 py-1 text-[10px] font-bold whitespace-nowrap flex-shrink-0 ${!tuyenLuyenNhomFilter ? 'bg-emerald-700 text-white' : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`} style={{ borderRadius: 0 }}>Tất cả</button>
            {uniqueNhomList.map(nhom => (
              <button key={nhom} onClick={() => setTuyenLuyenNhomFilter(tuyenLuyenNhomFilter === nhom ? '' : nhom)} className={`px-2 py-1 text-[10px] font-bold whitespace-nowrap flex-shrink-0 ${tuyenLuyenNhomFilter === nhom ? 'bg-emerald-700 text-white' : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`} style={{ borderRadius: 0 }}>{nhom}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border shadow-xl h-full" style={{ borderColor: '#A7F3D0', borderRadius: 0 }}>
          <table className="w-full text-xs bg-white h-full" style={{ borderRadius: 0 }}>
            <thead className="sticky top-0 z-10">
              <tr style={{ backgroundColor: HEADER_BG }}>
                <th className="text-white text-center w-[32px] font-bold uppercase text-[11px] h-8 px-1 align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>STT</th>
                <th className="text-white min-w-[80px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>NHÓM</th>
                <th className="text-white min-w-[70px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>MÃ SỐ TVV</th>
                <th className="text-white min-w-[120px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>HỌ TÊN TB/TN</th>
                <th className="text-white min-w-[110px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#7C3AED', backgroundColor: '#6D28D9' }}>TỔNG THƯỞNG TVVm<br/><span className="text-[10px] italic font-normal normal-case">Tháng {currentMonth}</span></th>
                <th className="text-white min-w-[110px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: TIER_GROUP_HEADER_BG, backgroundColor: TIER_GROUP_HEADER_BG }}>SL TVVm HĐC<br/><span className="text-[10px] italic font-normal normal-case">Tháng {currentMonth}</span></th>
                <th className="text-white min-w-[80px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: TIER_GROUP_HEADER_BG, backgroundColor: TIER_GROUP_HEADER_BG }}>TL THƯỞNG</th>
                <th className="text-white min-w-[110px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>TIỀN THƯỞNG</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-gray-400 py-8 italic text-xs bg-white p-2 align-middle">Chưa có TB/TN nào đạt HĐC trong tháng {currentMonth}.</td></tr>
              ) : filteredRows.map((row) => (
                <tr key={row.maNTD} className="bg-white hover:bg-emerald-50 transition-colors border-b border-gray-300" style={{ borderRadius: 0 }}>
                  <td className="text-center text-gray-400 text-[11px] p-2 align-middle whitespace-nowrap" style={{ borderColor: '#D1FAE5' }}>{row.stt}</td>
                  <td className="text-[11px] text-gray-700 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.nhom || '—'}</td>
                  <td className="font-mono text-[11px] text-gray-500 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.maNTD}</td>
                  <td className="text-[11px] text-gray-800 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.hoTen}</td>
                  <td className="text-[11px] font-bold text-right whitespace-nowrap p-2 align-middle" style={{ borderColor: '#DDD6FE', backgroundColor: '#EDE9FE', color: '#5B21B6' }}>{row.tongThuongTVVm > 0 ? formatCurrency(row.tongThuongTVVm) : '—'}</td>
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: TIER_BORDER, backgroundColor: TIER_GRADIENT_BG[Math.min(row.slTVVmHDC - 1, 5)] || '#FFDAB9', color: TIER_RATE_COLOR, fontSize: '13px', fontWeight: 900 }}>{row.slTVVmHDC}</td>
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: TIER_BORDER, backgroundColor: TIER_GRADIENT_BG[0], color: TIER_RATE_COLOR, fontSize: '13px', fontWeight: 900 }}>
                    {row.tlThuong > 0 ? `${row.tlThuong}%` : <span style={{ color: '#9CA3AF', fontWeight: 400 }}>—</span>}
                  </td>
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5', backgroundColor: '#FFFFFF', color: '#047857', fontSize: '13px', fontWeight: 800 }}>
                    {renderThuongCellContent(row.tienThuong)}
                  </td>
                </tr>
              ))}
              {/* Total row đã chuyển xuống footer cố định — không render ở đây nữa */}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ========== THƯỞNG ĐỒNG HÀNH ==========
  // TTN (Trưởng Tổ Nhóm) được thưởng dựa trên FYP TVVm + SL TVVm HĐC trong tháng.
  // THƯỞNG ĐỒNG HÀNH = SL TVVm HĐC × 500.000đ (placeholder, user can adjust)
  // THƯỞNG VƯỢT TRỘI = if FYP TVVm ≥ 100tr → 2tr bonus (placeholder)
  const renderThuongDongHanh = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    // Theo ảnh chính sách Thưởng Đồng Hành:
    // (1) Thưởng ĐỒNG HÀNH = % × Tổng thưởng TVVm tại tháng
    //     ≥3 TVVm HĐC: 200% | 2 TVVm HĐC: 100% | 1: 0%
    // (2) Thưởng VƯỢT TRỘI = số tiền cố định theo FYP TVVm + SL TVVm HĐC
    //     FYP ≥ 45tr + ≥3: 5tr | FYP ≥ 45tr + 2: 3tr
    //     FYP ≥ 35tr + ≥3: 3tr | FYP ≥ 35tr + 2: 3tr
    const VT_FYP_45M = 45_000_000;
    const VT_FYP_35M = 35_000_000;
    const VT_BONUS_5M = 5_000_000;
    const VT_BONUS_3M = 3_000_000;

    // Identify TTNs — DS TTN (recruiters) là nguồn đối tượng CHÍNH.
    // NGUYÊN TẮC: CS Đồng Hành dành RIÊNG cho TTN (Tiền Trưởng Nhóm)
    // → đối tượng = recruiters (DS TTN đã được user quản lý nội bộ),
    //   loại TVV thuộc phòng Banca (không tính thưởng)
    //   (trước đây filter leaders theo position TTN — dễ bị thiếu do DS TB/TN
    //    không có TTN, hoặc position không khớp keyword. DS TTN là nguồn chân chính.)
    const ttnList = recruiters
      .filter(l => !isTVVExcludedFromRewards(l.agentCode, l.nhom || '', banNhomList, adList))
      .map(l => ({
        agentCode: l.agentCode,
        agentName: l.agentName,
        nhomName: l.nhom || '',
        ngayBatDau: l.startDate,
      }));

    const ttnRows = ttnList.map((ttn) => {
      // NGUYÊN TẮC: xác định TVVm do TTN nào tuyển DUY NHẤT qua mã người tuyển dụng
      // (tvv.maTVVTuyendung === ttn.agentCode). Nếu maTVVTuyendung trống → không có người tuyển → bỏ qua.
      // KHÔNG dùng maBanNhom / nhomName / contracts.maDaiLyTD làm fallback.
      const ttnCode = (ttn.agentCode || '').trim();
      const tvvmInNhom = tvvStructList.filter(tvv => {
        if (tvv.agentCode === ttn.agentCode) return false;
        if (!isTVVm(tvv.ngayBatDau)) return false;
        const recruiter = (tvv.maTVVTuyendung || '').trim();
        if (!recruiter) return false;            // không có mã người TD → không tính
        return recruiter === ttnCode;
      });

      // Sum FYP of TVVm contracts in current month
      let fypTVVm = 0;
      const tvvmHDCCount = tvvmInNhom.filter(tvv => {
        const tvvContracts = contracts.filter(c => {
          if (c.agentCode !== tvv.agentCode) return false;
          const d = getDoanhSoMonth(c);
          if (isNaN(d.getTime())) return false;
          return d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth;
        });
        fypTVVm += tvvContracts.reduce((s, c) => s + c.pdt10DT, 0);
        return tvvContracts.length > 0;
      }).length;

      // Tính Tổng thưởng TVVm tại tháng (thưởng tháng + thưởng chặng của tất cả TVVm trong nhóm)
      let tongThuongTVVm = 0;
      tvvmInNhom.forEach(tvv => {
        const changInfo = getChangInfo(tvv.ngayBatDau);
        // IP tháng hiện tại
        const monthContracts = contracts.filter(c => {
          if (c.agentCode !== tvv.agentCode) return false;
          const d = getDoanhSoMonth(c);
          if (isNaN(d.getTime())) return false;
          return d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth;
        });
        const tongIPThang = monthContracts.reduce((s, c) => s + c.pdt10DT, 0);
        // Thưởng tháng: IP ≥ 12tr → 1tr
        const thuongThang = tongIPThang >= 12_000_000 ? 1_000_000 : 0;

        // IP chặng
        let tongIPChang = 0;
        if (tvv.ngayBatDau && changInfo.chang > 0) {
          const rs = changInfo.rangeStart;
          const re = changInfo.rangeEnd;
          const reEnd = new Date(re.getFullYear(), re.getMonth(), re.getDate(), 23, 59, 59);
          const changContracts = contracts.filter(c => {
            if (c.agentCode !== tvv.agentCode) return false;
            const d = getDoanhSoMonth(c);
            return !isNaN(d.getTime()) && d >= rs && d <= reEnd;
          });
          tongIPChang = changContracts.reduce((s, c) => s + c.pdt10DT, 0);
        }
        // Thưởng chặng
        let thuongChang = 0;
        if (changInfo.chang === 1) {
          if (tongIPChang >= 100_000_000) thuongChang = 6_000_000;
          else if (tongIPChang >= 50_000_000) thuongChang = 3_000_000;
        } else if (changInfo.chang >= 2 && changInfo.chang <= 4) {
          if (tongIPChang >= 100_000_000) thuongChang = 3_000_000;
        }
        tongThuongTVVm += thuongThang + thuongChang;
      });

      // (1) Thưởng ĐỒNG HÀNH = % × Tổng thưởng TVVm
      let dhMultiplier = 0;
      if (tvvmHDCCount >= 3) dhMultiplier = 2.0;  // 200%
      else if (tvvmHDCCount === 2) dhMultiplier = 1.0;  // 100%
      const thuongDongHanh = Math.round(tongThuongTVVm * dhMultiplier);

      // (2) Thưởng VƯỢT TRỘI = cố định theo FYP TVVm + SL TVVm HĐC
      let thuongVuotTroi = 0;
      if (fypTVVm >= VT_FYP_45M && tvvmHDCCount >= 3) thuongVuotTroi = VT_BONUS_5M;
      else if (fypTVVm >= VT_FYP_45M && tvvmHDCCount === 2) thuongVuotTroi = VT_BONUS_3M;
      else if (fypTVVm >= VT_FYP_35M && tvvmHDCCount >= 2) thuongVuotTroi = VT_BONUS_3M;

      const tongTienThuong = thuongDongHanh + thuongVuotTroi;

      // Đồng Hành = chương trình TTN → allowPA=true
      // TTN không có maBanNhom → truyền candidateNhomName = ttn.nhomName để validate trong DS TB/TN
      const nhomName = resolveNhomName(ttn.agentCode, '', banNhomList, contracts, leaders, { allowPA: true, candidateNhomName: ttn.nhomName });

      return {
        stt: 0 as number,
        nhom: nhomName,
        maTTN: ttn.agentCode,
        hoTen: ttn.agentName,
        fypTVVm,
        tongThuongTVVm,
        slTVVmHDC: tvvmHDCCount,
        thuongDongHanh,
        thuongVuotTroi,
        tongTienThuong,
      };
    });

    // Sort: FYP TVVm desc, then SL TVVm HĐC desc
    ttnRows.sort((a, b) => {
      if (b.fypTVVm !== a.fypTVVm) return b.fypTVVm - a.fypTVVm;
      return b.slTVVmHDC - a.slTVVmHDC;
    });

    const filteredRows = ttnRows.filter(row => {
      // NGUYÊN TẮC: hiển thị TẤT CẢ đối tượng TTN (trưởng nhóm từ cấu trúc)
      // File doanh số chỉ để tính toán, không filter đối tượng
      if (dongHanhNhomFilter && row.nhom !== dongHanhNhomFilter) return false;
      if (dongHanhNameFilter && !row.hoTen.toLowerCase().includes(dongHanhNameFilter.toLowerCase()) && !row.maTTN.toLowerCase().includes(dongHanhNameFilter.toLowerCase())) return false;
      return true;
    });
    filteredRows.forEach((row, idx) => { row.stt = idx + 1; });

    const totalFypTVVm = filteredRows.reduce((s, r) => s + r.fypTVVm, 0);
    const totalSLTVVmHDC = filteredRows.reduce((s, r) => s + r.slTVVmHDC, 0);
    const totalThuongDongHanh = filteredRows.reduce((s, r) => s + r.thuongDongHanh, 0);
    const totalThuongVuotTroi = filteredRows.reduce((s, r) => s + r.thuongVuotTroi, 0);
    const totalTienThuong = filteredRows.reduce((s, r) => s + r.tongTienThuong, 0);
    const ttnDatThuongCount = filteredRows.filter(r => r.tongTienThuong > 0).length;
    const uniqueNhomList = Array.from(new Set(ttnRows.map(r => r.nhom).filter(Boolean))).sort();

    const THUONG_BG = '#FEF3C7';
    const THUONG_TEXT = '#047857';
    const THUONG_FONT = '12px';
    const HEADER_BG = '#065F46';
    const TOTAL_BG = '#065F46';

    return (
      <div className="space-y-1" data-policy-count={ttnDatThuongCount} data-policy-amount={totalTienThuong}>
        <div className="hidden bg-white border shadow-lg px-4 py-2.5" style={{ borderColor: '#059669', borderRadius: 0 }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Thưởng Đồng Hành — Tháng {currentMonth}/{currentYear}</p>
            </div>
            <div className="flex items-center gap-5 flex-wrap">
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">SL TTN</p>
                <p className="text-sm font-black text-emerald-700">{filteredRows.length}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">TỔNG FYP TVVm</p>
                <p className="text-sm font-black text-emerald-700">{formatSmartCurrency(totalFypTVVm)}</p>
              </div>
              <div className="text-center px-3 py-1 bg-amber-100 border border-amber-300">
                <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700">💰 TỔNG TIỀN THƯỞNG</p>
                <p className="text-base font-black text-emerald-700">{formatSmartCurrency(totalTienThuong)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden text-[10px] text-gray-500 italic">
          Đồng Hành: ≥3 TVVm HĐC = 200% thưởng TVVm • 2 TVVm = 100% • Vượt Trội: FYP ≥ 45tr → 5tr/3tr • FYP ≥ 35tr → 3tr
        </div>

        <div className="hidden flex items-center justify-end gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border shadow-sm px-2 py-1" style={{ borderColor: '#A7F3D0', borderRadius: 0 }}>
            <Search className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <input type="text" placeholder="Tìm tên / mã TTN..." value={dongHanhNameFilter} onChange={e => setDongHanhNameFilter(e.target.value)} className="text-[11px] bg-transparent outline-none w-[130px] text-gray-700 placeholder:text-gray-400" />
            {dongHanhNameFilter && <button onClick={() => setDongHanhNameFilter('')} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>}
          </div>
          <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <button onClick={() => setDongHanhNhomFilter('')} className={`px-2 py-1 text-[10px] font-bold whitespace-nowrap flex-shrink-0 ${!dongHanhNhomFilter ? 'bg-emerald-700 text-white' : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`} style={{ borderRadius: 0 }}>Tất cả</button>
            {uniqueNhomList.map(nhom => (
              <button key={nhom} onClick={() => setDongHanhNhomFilter(dongHanhNhomFilter === nhom ? '' : nhom)} className={`px-2 py-1 text-[10px] font-bold whitespace-nowrap flex-shrink-0 ${dongHanhNhomFilter === nhom ? 'bg-emerald-700 text-white' : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`} style={{ borderRadius: 0 }}>{nhom}</button>
            ))}
          </div>
        </div>

        <div className="bg-white border shadow-xl h-full" style={{ borderColor: '#A7F3D0', borderRadius: 0 }}>
          <table className="w-full text-xs bg-white h-full" style={{ borderRadius: 0 }}>
            <thead className="sticky top-0 z-10">
              <tr style={{ backgroundColor: HEADER_BG }}>
                <th className="text-white text-center w-[32px] font-bold uppercase text-[11px] h-8 px-1 align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>STT</th>
                <th className="text-white min-w-[80px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>NHÓM</th>
                <th className="text-white min-w-[70px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>MÃ SỐ TVV</th>
                <th className="text-white min-w-[120px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>HỌ TÊN TTN</th>
                <th className="text-white min-w-[100px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#2563EB', backgroundColor: '#1D4ED8' }}>FYP TVVm<br/><span className="text-[10px] italic font-normal normal-case">Tháng {currentMonth}</span></th>
                <th className="text-white min-w-[110px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#7C3AED', backgroundColor: '#6D28D9' }}>TỔNG THƯỞNG TVVm<br/><span className="text-[10px] italic font-normal normal-case">Tháng {currentMonth}</span></th>
                <th className="text-white min-w-[100px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: TIER_GROUP_HEADER_BG, backgroundColor: TIER_GROUP_HEADER_BG }}>SL TVVm HĐC<br/><span className="text-[10px] italic font-normal normal-case">Tháng {currentMonth}</span></th>
                <th className="text-white min-w-[90px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>THƯỞNG ĐỒNG HÀNH</th>
                <th className="text-white min-w-[90px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>THƯỞNG VƯỢT TRỘI</th>
                <th className="text-white min-w-[110px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>TỔNG TIỀN THƯỞNG</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr><td colSpan={10} className="text-center text-gray-400 py-8 italic text-xs bg-white p-2 align-middle">Chưa có TTN nào đạt điều kiện trong tháng {currentMonth}.</td></tr>
              ) : filteredRows.map((row) => (
                <tr key={row.maTTN} className="bg-white hover:bg-emerald-50 transition-colors border-b border-gray-300" style={{ borderRadius: 0 }}>
                  <td className="text-center text-gray-400 text-[11px] p-2 align-middle whitespace-nowrap" style={{ borderColor: '#D1FAE5' }}>{row.stt}</td>
                  <td className="text-[11px] text-gray-700 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.nhom || '—'}</td>
                  <td className="font-mono text-[11px] text-gray-500 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.maTTN}</td>
                  <td className="text-[11px] text-gray-800 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.hoTen}</td>
                  <td className="text-[11px] font-bold text-right whitespace-nowrap p-2 align-middle" style={{ borderColor: '#BFDBFE', backgroundColor: '#DBEAFE', color: '#1E40AF' }}>{row.fypTVVm > 0 ? formatNumber(row.fypTVVm) : '—'}</td>
                  <td className="text-[11px] font-bold text-right whitespace-nowrap p-2 align-middle" style={{ borderColor: '#DDD6FE', backgroundColor: '#EDE9FE', color: '#5B21B6' }}>{row.tongThuongTVVm > 0 ? formatCurrency(row.tongThuongTVVm) : '—'}</td>
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: TIER_BORDER, backgroundColor: TIER_GRADIENT_BG[Math.min(row.slTVVmHDC, 5)] || '#FFDAB9', color: TIER_RATE_COLOR, fontSize: '13px', fontWeight: 900 }}>{row.slTVVmHDC}</td>
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5', backgroundColor: '#FFFFFF', color: '#047857', fontSize: '13px', fontWeight: 800 }}>
                    {renderThuongCellContent(row.thuongDongHanh)}
                  </td>
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5', backgroundColor: '#FFFFFF', color: '#047857', fontSize: '13px', fontWeight: 800 }}>
                    {renderThuongCellContent(row.thuongVuotTroi)}
                  </td>
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5', backgroundColor: '#FFFFFF', color: '#047857', fontSize: '14px', fontWeight: 900 }}>
                    {renderThuongCellContent(row.tongTienThuong, '14px', 900)}
                  </td>
                </tr>
              ))}
              {/* Total row đã chuyển xuống footer cố định — không render ở đây nữa */}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ========== THƯỞNG QUÝ TN ==========
  // TN (Trưởng Nhóm) được thưởng quý dựa trên FYP quý + TVVm HĐC.
  // Tiers (highest wins, evaluated top-down):
  //   FYP ≥ 600tr + TVVm HĐC ≥ 1 → 22%
  //   FYP ≥ 450tr + TVVm HĐC ≥ 1 → 18%
  //   FYP ≥ 270tr + TVVm HĐC ≥ 1 → 14%
  //   FYP ≥ 150tr + TVVm HĐC ≥ 1 → 9%
  //   FYP ≥ 150tr (no TVVm)      → 4%
  const renderThuongQuyTN = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const currentQuarter = Math.ceil(currentMonth / 3);
    const quarterStartMonth = (currentQuarter - 1) * 3 + 1;
    const quarterEndMonth = currentQuarter * 3;
    const quarterLabel = `Quý ${currentQuarter} (T${quarterStartMonth}-T${quarterEndMonth})`;

    const TN_TIERS = [
      { label: 'FYP ≥ 150tr', rate: 4, minFYP: 150_000_000, needsTVVm: false },
      { label: 'FYP ≥ 150tr + TVVm', rate: 9, minFYP: 150_000_000, needsTVVm: true },
      { label: 'FYP ≥ 270tr + TVVm', rate: 14, minFYP: 270_000_000, needsTVVm: true },
      { label: 'FYP ≥ 450tr + TVVm', rate: 18, minFYP: 450_000_000, needsTVVm: true },
      { label: 'FYP ≥ 600tr + TVVm', rate: 22, minFYP: 600_000_000, needsTVVm: true },
    ];

    // Identify TNs — DS TB/TN (leaders), LOẠI TTN (vì Đồng Hành dành riêng cho TTN)
    // NGUYÊN TẮC: CS Quý TN dành cho TB/TN → đối tượng = leaders có position TB/TN
    // LeaderInfo có sẵn field 'nhom' (tên nhóm) và 'maNhom' → dùng luôn, không cần lookup
    // Bỏ TN thuộc phòng Banca (không tính thưởng)
    const tnList = leaders
      .filter(l => isTBorTNPosition(l.position))  // chỉ TB/TN, loại TTN
      .filter(l => !isTVVExcludedFromRewards(l.agentCode, l.maNhom || '', banNhomList, adList))
      .map(l => ({
        agentCode: l.agentCode,
        agentName: l.agentName,
        position: l.position || '',
        maBanNhom: l.maNhom || '',  // DS TB/TN dùng field maNhom → map sang maBanNhom
        nhomName: l.nhom || '',      // DS TB/TN đã có sẵn tên nhóm
      }));

    const tnRows = tnList.map((tn) => {
      // Find all TVVs in TN's nhóm (for FYP sum) — match alias để tránh mismatch PA/U104101014
      const tvvInNhom = tvvStructList.filter(tvv => matchMaBanNhom(tvv.maBanNhom, tn.maBanNhom));

      // Sum FYP of all TVVs in nhóm for current quarter
      const quarterContracts = contracts.filter(c => {
        if (!tvvInNhom.some(t => t.agentCode === c.agentCode)) return false;
        const d = getDoanhSoMonth(c);
        if (isNaN(d.getTime())) return false;
        if (d.getFullYear() !== currentYear) return false;
        const m = d.getMonth() + 1;
        return m >= quarterStartMonth && m <= quarterEndMonth;
      });
      const tongFYPQuy = quarterContracts.reduce((s, c) => s + c.pdt10DT, 0);

      // Count TVVm HĐC recruited by THIS TN WITHIN current quarter
      // Criteria:
      //   1. TVVm must be recruited by TN (via maTVVTuyendung OR maDaiLyTD in contracts)
      //   2. TVVm's ngayBatDau must fall within current quarter (Q start month → Q end month)
      //   3. TVVm must have at least 1 month in quarter with total IP >= 12tr
      const TVVM_HDC_IP_THRESHOLD = 12_000_000;
      const qStartDate = new Date(currentYear, quarterStartMonth - 1, 1);
      const qEndDate = new Date(currentYear, quarterEndMonth, 0, 23, 59, 59); // last day of Q end month
      const tvvmHDCByTN = tvvStructList.filter(tvv => {
        if (!isTVVm(tvv.ngayBatDau)) return false;
        // (1) Recruited by this TN — DUY NHẤT qua mã người tuyển dụng (maTVVTuyendung)
        // Không fallback qua contracts.maDaiLyTD.
        const tnCode = (tn.agentCode || '').trim();
        const recruiter = (tvv.maTVVTuyendung || '').trim();
        const isRecruitedByTN = recruiter && recruiter === tnCode;
        if (!isRecruitedByTN) return false;
        // (2) TVVm started within current quarter
        if (!tvv.ngayBatDau) return false;
        const startDate = new Date(tvv.ngayBatDau);
        if (isNaN(startDate.getTime())) return false;
        if (startDate < qStartDate || startDate > qEndDate) return false;
        // (3) At least 1 month in quarter with total IP >= 12tr
        for (let m = quarterStartMonth; m <= quarterEndMonth; m++) {
          const monthContracts = contracts.filter(c => {
            if (c.agentCode !== tvv.agentCode) return false;
            const d = getDoanhSoMonth(c);
            if (isNaN(d.getTime())) return false;
            return d.getFullYear() === currentYear && (d.getMonth() + 1) === m;
          });
          const monthIP = monthContracts.reduce((s, c) => s + c.pdt10DT, 0);
          if (monthIP >= TVVM_HDC_IP_THRESHOLD) return true;
        }
        return false;
      });
      const tvvmHDCCount = tvvmHDCByTN.length;
      const hasTVVmHDC = tvvmHDCCount >= 1;

      // Determine tier — find highest qualifying tier (descending order)
      // Logic mới:
      // - Nếu KHÔNG đủ ĐK TVVm → chỉ được xét tier 'FYP ≥ 150tr' (4%, needsTVVm=false)
      // - Nếu ĐỦ ĐK TVVm → xét đủ 5 tiers (4/9/14/18/22%)
      let achievedTier = -1;
      for (let i = TN_TIERS.length - 1; i >= 0; i--) {
        const t = TN_TIERS[i];
        if (tongFYPQuy < t.minFYP) continue;
        // Nếu tier cần TVVm mà TN không có TVVm HĐC → skip
        if (t.needsTVVm && !hasTVVmHDC) continue;
        // Nếu TN không đủ ĐK TVVm → chỉ được chọn tier không cần TVVm (4%)
        if (!hasTVVmHDC && t.needsTVVm) continue;
        achievedTier = i;
        break;
      }

      // FYC = FYP × 25% (giả định TLHH)
      const fyc = tongFYPQuy * 0.25;
      const tlThuong = achievedTier >= 0 ? TN_TIERS[achievedTier].rate : 0;
      const tienThuong = achievedTier >= 0 ? fyc * (TN_TIERS[achievedTier].rate / 100) : 0;

      // Quý TN = chương trình dành cho nhóm (TN) → allowPA=false
      // Truyền candidateNhomName = tn.nhomName để validate trong DS TB/TN
      const nhomName = resolveNhomName(tn.agentCode, tn.maBanNhom, banNhomList, contracts, leaders, { allowPA: false, candidateNhomName: tn.nhomName });

      return {
        stt: 0 as number,
        nhom: nhomName,
        maTN: tn.agentCode,
        hoTen: tn.agentName,
        tongFYPQuy,
        tvvmHDC: tvvmHDCCount,
        hasTVVmHDC,
        achievedTier,
        tlThuong,
        tienThuong,
      };
    });

    // Sort: TỔNG FYP QUÝ desc, then TVVm HĐC desc
    tnRows.sort((a, b) => {
      if (b.tongFYPQuy !== a.tongFYPQuy) return b.tongFYPQuy - a.tongFYPQuy;
      return b.tvvmHDC - a.tvvmHDC;
    });

    const filteredRows = tnRows.filter(row => {
      // NGUYÊN TẮC: hiển thị TẤT CẢ đối tượng TN từ DS TB/TN
      // File doanh số chỉ để tính toán (FYP, tiền thưởng), KHÔNG dùng để filter đối tượng
      // Chỉ filter theo NHÓM và search — không filter theo FYP/IP/SLTVVm
      if (quyTnNhomFilter && row.nhom !== quyTnNhomFilter) return false;
      if (quyTnNameFilter && !row.hoTen.toLowerCase().includes(quyTnNameFilter.toLowerCase()) && !row.maTN.toLowerCase().includes(quyTnNameFilter.toLowerCase())) return false;
      return true;
    });
    filteredRows.forEach((row, idx) => { row.stt = idx + 1; });

    const totalFYPQuy = filteredRows.reduce((s, r) => s + r.tongFYPQuy, 0);
    const totalTVVmHDC = filteredRows.reduce((s, r) => s + r.tvvmHDC, 0);
    const totalTienThuong = filteredRows.reduce((s, r) => s + r.tienThuong, 0);
    const tnDatThuong = filteredRows.filter(r => r.achievedTier >= 0).length;
    const uniqueNhomList = Array.from(new Set(tnRows.map(r => r.nhom).filter(Boolean))).sort();

    const THUONG_BG = '#FEF3C7';
    const THUONG_TEXT = '#047857';
    const THUONG_FONT = '12px';
    const HEADER_BG = '#065F46';
    const TOTAL_BG = '#065F46';

    return (
      <div className="space-y-1" data-policy-count={tnDatThuong} data-policy-amount={totalTienThuong}>
        <div className="hidden bg-white border shadow-lg px-4 py-2.5" style={{ borderColor: '#059669', borderRadius: 0 }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Thưởng Quý TN — {quarterLabel}</p>
            </div>
            <div className="flex items-center gap-5 flex-wrap">
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">SL TN ĐẠT</p>
                <p className="text-sm font-black text-emerald-700">{tnDatThuong}<span className="text-[9px] font-normal text-gray-400"> / {filteredRows.length}</span></p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">TỔNG FYP QUÝ</p>
                <p className="text-sm font-black text-emerald-700">{formatSmartCurrency(totalFYPQuy)}</p>
              </div>
              <div className="text-center px-3 py-1 bg-amber-100 border border-amber-300">
                <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700">💰 TỔNG TIỀN THƯỞNG</p>
                <p className="text-base font-black text-emerald-700">{formatSmartCurrency(totalTienThuong)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden flex items-center justify-end gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border shadow-sm px-2 py-1" style={{ borderColor: '#A7F3D0', borderRadius: 0 }}>
            <Search className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <input type="text" placeholder="Tìm tên / mã TN..." value={quyTnNameFilter} onChange={e => setQuyTnNameFilter(e.target.value)} className="text-[11px] bg-transparent outline-none w-[130px] text-gray-700 placeholder:text-gray-400" />
            {quyTnNameFilter && <button onClick={() => setQuyTnNameFilter('')} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>}
          </div>
          <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <button onClick={() => setQuyTnNhomFilter('')} className={`px-2 py-1 text-[10px] font-bold whitespace-nowrap flex-shrink-0 ${!quyTnNhomFilter ? 'bg-emerald-700 text-white' : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`} style={{ borderRadius: 0 }}>Tất cả</button>
            {uniqueNhomList.map(nhom => (
              <button key={nhom} onClick={() => setQuyTnNhomFilter(quyTnNhomFilter === nhom ? '' : nhom)} className={`px-2 py-1 text-[10px] font-bold whitespace-nowrap flex-shrink-0 ${quyTnNhomFilter === nhom ? 'bg-emerald-700 text-white' : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`} style={{ borderRadius: 0 }}>{nhom}</button>
            ))}
          </div>
        </div>

        <div className="bg-white border shadow-xl h-full" style={{ borderColor: '#A7F3D0', borderRadius: 0 }}>
          <table className="w-full text-xs bg-white h-full" style={{ borderRadius: 0 }}>
            <thead className="sticky top-0 z-10">
              {/* Row 1: Main headers */}
              <tr style={{ backgroundColor: HEADER_BG }}>
                <th rowSpan={3} className="text-white text-center w-[32px] font-bold uppercase text-[11px] h-8 px-1 align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>STT</th>
                <th rowSpan={3} className="text-white min-w-[80px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>NHÓM</th>
                <th rowSpan={3} className="text-white min-w-[70px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>MÃ SỐ</th>
                <th rowSpan={3} className="text-white min-w-[120px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>HỌ TÊN TN</th>
                <th rowSpan={3} className="text-white min-w-[100px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#2563EB', backgroundColor: '#1D4ED8' }}>TỔNG FYP<br/><span className="text-[10px] italic font-normal normal-case">Quý {currentQuarter}</span></th>
                <th rowSpan={3} className="text-white min-w-[70px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#0F766E', backgroundColor: '#0F766E' }}>TVVm HĐC<br/><span className="text-[10px] italic font-normal normal-case">Quý {currentQuarter}</span></th>
                <th colSpan={5} className="text-white font-bold uppercase text-[12px] px-2 text-center align-middle whitespace-nowrap" style={{ backgroundColor: TIER_GROUP_HEADER_BG, borderColor: TIER_GROUP_HEADER_BG, height: '26px', lineHeight: '1' }}>TỶ LỆ THƯỞNG</th>
                <th rowSpan={3} className="text-white min-w-[100px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>TIỀN THƯỞNG</th>
              </tr>
              {/* Row 2: FYP thresholds (compact) */}
              <tr style={{ backgroundColor: TIER_HEADER_BG }}>
                {TN_TIERS.map((tier, idx) => (
                  <th key={idx} className="text-white italic font-normal text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ borderColor: TIER_GROUP_HEADER_BG, height: '18px', lineHeight: '1' }}>
                    {tier.label.replace('FYP ≥ ', '≥').replace('tr', '').replace(' + TVVm', '+TVVm')}
                  </th>
                ))}
              </tr>
              {/* Row 3: Percentage rates — yellow gradient bg + italic red number */}
              <tr>
                {TN_TIERS.map((tier, idx) => (
                  <th key={idx} className="italic font-normal text-[12px] px-1 text-center align-middle whitespace-nowrap" style={{ borderColor: TIER_BORDER, height: '20px', lineHeight: '1', backgroundColor: TIER_GRADIENT_BG[idx], color: TIER_RATE_COLOR, textShadow: '0 0 1px rgba(255,255,255,0.5)' }}>
                    {tier.rate}%
                  </th>
                ))}
              </tr>
              {/* Row 4: Full-width separator */}
              <tr>
                <th colSpan={12} style={{ height: '3px', padding: 0, margin: 0, backgroundColor: TIER_GROUP_HEADER_BG, borderBottom: 'none' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr><td colSpan={12} className="text-center text-gray-400 py-8 italic text-xs bg-white p-2 align-middle">Chưa có TN nào đạt FYP trong quý {currentQuarter}.</td></tr>
              ) : filteredRows.map((row) => (
                <tr key={row.maTN} className="bg-white hover:bg-emerald-50 transition-colors border-b border-gray-300" style={{ borderRadius: 0 }}>
                  <td className="text-center text-gray-400 text-[11px] p-2 align-middle whitespace-nowrap" style={{ borderColor: '#D1FAE5' }}>{row.stt}</td>
                  <td className="text-[11px] text-gray-700 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.nhom || '—'}</td>
                  <td className="font-mono text-[11px] text-gray-500 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.maTN}</td>
                  <td className="text-[11px] text-gray-800 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.hoTen}</td>
                  <td className="text-[11px] font-bold text-right whitespace-nowrap p-2 align-middle" style={{ borderColor: '#BFDBFE', backgroundColor: '#DBEAFE', color: '#1E40AF' }}>{row.tongFYPQuy > 0 ? formatNumber(row.tongFYPQuy) : '—'}</td>
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>
                    {row.hasTVVmHDC ? (
                      <CheckBadge size={16} />
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#EF4444', color: '#FFFFFF', fontSize: '11px', fontWeight: 900, lineHeight: 1 }}>✗</span>
                    )}
                  </td>
                  {/* 5 tier columns — ĐẠT if idx === achievedTier, else show checkmark or deficit */}
                  {TN_TIERS.map((tier, tIdx) => {
                    const isAchieved = tIdx === row.achievedTier;
                    // Show ĐẠT for the highest achieved tier; for lower tiers also show ĐẠT (cascade down)
                    const isCascadeAchieved = row.achievedTier >= 0 && tIdx <= row.achievedTier && (
                      // For tiers needing TVVm: only show ĐẠT if TN actually has TVVm OR if tier doesn't need TVVm
                      !tier.needsTVVm || row.tvvmHDC >= 1
                    );
                    const deficit = row.tongFYPQuy < tier.minFYP ? tier.minFYP - row.tongFYPQuy : 0;
                    const achievedGreen = ['#F0FDF4', '#DCFCE7', '#BBF7D0', '#A7F3D0', '#86EFAC', '#6EE7B7'];
                    return (
                      <td key={tIdx} className="text-[10px] italic text-center whitespace-nowrap p-1 align-middle" style={{
                        borderColor: isCascadeAchieved ? '#A7F3D0' : TIER_BORDER,
                        backgroundColor: isCascadeAchieved ? achievedGreen[tIdx] : TIER_GRADIENT_BG[tIdx],
                        color: isCascadeAchieved ? '#047857' : TIER_BODY_TEXT_COLOR,
                        fontWeight: isCascadeAchieved ? 800 : 700,
                      }}>
                        {isCascadeAchieved ? (
                          <span className="font-bold italic text-[10px]">ĐẠT</span>
                        ) : (
                          <span className="text-[11px] font-bold" style={{ color: '#C2723B' }}>{deficit > 0 ? `−${Math.round(deficit / 1_000_000)}` : (tier.needsTVVm && row.tvvmHDC < 1 ? 'thiếu TVVm' : '—')}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5', backgroundColor: '#FFFFFF', color: '#047857', fontSize: '13px', fontWeight: 800 }}>
                    {renderThuongCellContent(row.tienThuong)}
                  </td>
                </tr>
              ))}
              {/* Total row đã chuyển xuống footer cố định — không render ở đây nữa */}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ========== THƯỞNG PTKD (Phát triển kinh doanh) TN ==========
  // TN (Trưởng Nhóm) được thưởng theo ma trận: Tổng FYP nhóm × Lượt HĐ nhóm tháng hiện tại
  // Ma trận tỷ lệ:
  //   FYP \ Lượt HĐ | ≥5    | 3-4   | 2     | <2
  //   ≥ 400tr        | 30%   | 28%   | 26%   | 10%
  //   ≥ 200tr        | 26%   | 22%   | 20%   | 10%
  //   ≥ 100tr        | 22%   | 20%   | 18%   | 10%
  //   ≥ 50tr         | 20%   | 18%   | 14%   | 10%
  //   < 50tr         | 16%   | 14%   | 10%   | 10%
  // FYC = FYP × 25% (giả định TLHH)
  // TIỀN THƯỞNG = FYC × TL%
  const renderThuongPTKD = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Ma trận tỷ lệ: [FYP_threshold_index][LuotHĐ_bucket_index]
    // Bucket: 0=≥5, 1=3-4, 2=2, 3=<2
    const PTKD_RATES: Record<string, number[]> = {
      '400': [30, 28, 26, 10],
      '200': [26, 22, 20, 10],
      '100': [22, 20, 18, 10],
      '50':  [20, 18, 14, 10],
      '0':   [16, 14, 10, 10],
    };
    const FYP_THRESHOLDS = [400_000_000, 200_000_000, 100_000_000, 50_000_000, 0];

    // Tìm tier FYP (chọn threshold đầu tiên mà FYP ≥ threshold, theo thứ tự giảm dần)
    function getFypTierIndex(fyp: number): number {
      for (let i = 0; i < FYP_THRESHOLDS.length; i++) {
        if (fyp >= FYP_THRESHOLDS[i]) return i;
      }
      return FYP_THRESHOLDS.length - 1; // fallback < 50tr
    }
    // Tìm bucket lượt HĐ
    function getLuotHDBucket(luotHD: number): number {
      if (luotHD >= 5) return 0;       // ≥5
      if (luotHD >= 3) return 1;       // 3-4
      if (luotHD >= 2) return 2;       // 2
      return 3;                        // <2
    }
    function getRate(fyp: number, luotHD: number): number {
      const fypIdx = getFypTierIndex(fyp);
      const bucket = getLuotHDBucket(luotHD);
      const key = FYP_THRESHOLDS[fypIdx] === 400_000_000 ? '400'
        : FYP_THRESHOLDS[fypIdx] === 200_000_000 ? '200'
        : FYP_THRESHOLDS[fypIdx] === 100_000_000 ? '100'
        : FYP_THRESHOLDS[fypIdx] === 50_000_000 ? '50'
        : '0';
      return PTKD_RATES[key][bucket];
    }

    // Đối tượng TN: DS TB/TN (leaders), LOẠI TTN (vì Đồng Hành dành riêng cho TTN)
    // NGUYÊN TẮC: đối tượng từ DS TB/TN, không từ file doanh số
    // Bỏ TN thuộc phòng Banca
    const tnList = leaders
      .filter(l => isTBorTNPosition(l.position))  // chỉ TB/TN, loại TTN
      .filter(l => !isTVVExcludedFromRewards(l.agentCode, l.maNhom || '', banNhomList, adList))
      .map(l => ({
        agentCode: l.agentCode,
        agentName: l.agentName,
        maBanNhom: l.maNhom || '',
        nhomName: l.nhom || '',
      }));

    const tnRows = tnList.map((tn) => {
      // Tìm tất cả TVV trong cùng nhóm — match alias để tránh mismatch PA/U104101014
      const tvvInNhom = tvvStructList.filter(tvv => matchMaBanNhom(tvv.maBanNhom, tn.maBanNhom));

      // Tổng FYP nhóm tháng hiện tại = tổng pdt10DT của contracts trong tháng
      const monthContracts = contracts.filter(c => {
        if (!tvvInNhom.some(t => t.agentCode === c.agentCode)) return false;
        const d = getDoanhSoMonth(c);
        if (isNaN(d.getTime())) return false;
        return d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth;
      });
      const tongFYPNhom = monthContracts.reduce((s, c) => s + c.pdt10DT, 0);

      // LƯỢT HĐC (Lượt Hoạt Động Chuẩn) = số TVV trong nhóm có TỔNG IP THÁNG ≥ 12.000.000đ
      // (mỗi TVV đạt ngưỡng IP tháng = 1 lượt HĐC — đồng nhất với định nghĩa HĐC của Quý TN)
      // NGUYÊN TẮC: PTKD dùng MÃ NHÓM để đếm tất cả lượt HĐC của nhóm
      const HDC_IP_THRESHOLD = 12_000_000;
      const luotHDCNhom = tvvInNhom.filter(tvv => {
        const tvvMonthIP = monthContracts
          .filter(c => c.agentCode === tvv.agentCode)
          .reduce((s, c) => s + c.pdt10DT, 0);
        return tvvMonthIP >= HDC_IP_THRESHOLD;
      }).length;

      // FYC = FYP × 25%
      const fyc = tongFYPNhom * 0.25;

      // TL THƯỞNG = lookup từ ma trận
      const tlThuong = getRate(tongFYPNhom, luotHDCNhom);

      // TIỀN THƯỞNG = FYC × TL%
      const tienThuong = fyc * (tlThuong / 100);

      return {
        stt: 0 as number,
        // PTKD TN = chương trình dành cho nhóm (TN) → allowPA=false
        nhom: resolveNhomName(tn.agentCode, tn.maBanNhom, banNhomList, contracts, leaders, { allowPA: false, candidateNhomName: tn.nhomName }),
        maTN: tn.agentCode,
        hoTen: tn.agentName,
        tongFYPNhom,
        luotHDCNhom,
        fyc,
        tlThuong,
        tienThuong,
      };
    });

    // Sort: TỔNG FYP nhóm desc, then LƯỢT HĐC desc
    tnRows.sort((a, b) => {
      if (b.tongFYPNhom !== a.tongFYPNhom) return b.tongFYPNhom - a.tongFYPNhom;
      return b.luotHDCNhom - a.luotHDCNhom;
    });

    const filteredRows = tnRows.filter(row => {
      // NGUYÊN TẮC: hiển thị TẤT CẢ đối tượng TN từ DS TB/TN
      if (ptkdNhomFilter && row.nhom !== ptkdNhomFilter) return false;
      if (ptkdNameFilter && !row.hoTen.toLowerCase().includes(ptkdNameFilter.toLowerCase()) && !row.maTN.toLowerCase().includes(ptkdNameFilter.toLowerCase())) return false;
      return true;
    });
    filteredRows.forEach((row, idx) => { row.stt = idx + 1; });

    const totalFYP = filteredRows.reduce((s, r) => s + r.tongFYPNhom, 0);
    const totalLuotHD = filteredRows.reduce((s, r) => s + r.luotHDCNhom, 0);
    const totalFYC = filteredRows.reduce((s, r) => s + r.fyc, 0);
    const totalTienThuong = filteredRows.reduce((s, r) => s + r.tienThuong, 0);
    const ptkdDatThuongCount = filteredRows.filter(r => r.tienThuong > 0).length;

    const THUONG_BG = '#FEF3C7';
    const THUONG_TEXT = '#047857';
    const THUONG_FONT = '12px';
    const HEADER_BG = '#065F46';
    const TOTAL_BG = '#065F46';

    return (
      <div className="space-y-1" data-policy-count={ptkdDatThuongCount} data-policy-amount={totalTienThuong}>
        {/* Summary card — chỉ: Tổng TN đạt thưởng + Tổng tiền thưởng */}
        <div className="hidden bg-white border shadow-lg px-4 py-2.5" style={{ borderColor: '#059669', borderRadius: 0 }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Thưởng PTKD TN — Tháng {currentMonth}/{currentYear}</p>
            </div>
            <div className="flex items-center gap-5 flex-wrap">
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">TN ĐẠT THƯỞNG</p>
                <p className="text-sm font-black text-emerald-700">{filteredRows.filter(r => r.tienThuong > 0).length}<span className="text-[9px] font-normal text-gray-400"> / {filteredRows.length}</span></p>
              </div>
              <div className="text-center px-3 py-1 bg-amber-100 border border-amber-300">
                <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700">💰 TỔNG TIỀN THƯỞNG</p>
                <p className="text-base font-black text-emerald-700">{formatSmartCurrency(totalTienThuong)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tier matrix hint */}
        <div className="hidden text-[10px] text-gray-500 italic">
          Ma trận TL: FYP ≥ 400tr (30/28/26/10%) • ≥ 200tr (26/22/20/10%) • ≥ 100tr (22/20/18/10%) • ≥ 50tr (20/18/14/10%) • &lt; 50tr (16/14/10/10%) — theo lượt HĐ: ≥5, 3-4, 2, &lt;2
        </div>

        {/* Filters */}
        <div className="hidden flex items-center justify-end gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border shadow-sm px-2 py-1" style={{ borderColor: '#A7F3D0', borderRadius: 0 }}>
            <Search className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <input type="text" placeholder="Tìm tên / mã TN..." value={ptkdNameFilter} onChange={e => setPtkdNameFilter(e.target.value)} className="text-[11px] bg-transparent outline-none w-[130px] text-gray-700 placeholder:text-gray-400" />
            {ptkdNameFilter && <button onClick={() => setPtkdNameFilter('')} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>}
          </div>
          <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <button onClick={() => setPtkdNhomFilter('')} className={`px-2 py-1 text-[10px] font-bold whitespace-nowrap flex-shrink-0 ${!ptkdNhomFilter ? 'bg-emerald-700 text-white' : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`} style={{ borderRadius: 0 }}>Tất cả</button>
            {Array.from(new Set(tnRows.map(r => r.nhom).filter(Boolean))).sort().map(nhom => (
              <button key={nhom} onClick={() => setPtkdNhomFilter(ptkdNhomFilter === nhom ? '' : nhom)} className={`px-2 py-1 text-[10px] font-bold whitespace-nowrap flex-shrink-0 ${ptkdNhomFilter === nhom ? 'bg-emerald-700 text-white' : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`} style={{ borderRadius: 0 }}>{nhom}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border shadow-xl h-full" style={{ borderColor: '#A7F3D0', borderRadius: 0 }}>
          <table className="w-full text-xs bg-white h-full" style={{ borderRadius: 0 }}>
            <thead className="sticky top-0 z-10">
              <tr style={{ backgroundColor: HEADER_BG }}>
                <th className="text-white text-center w-[32px] font-bold uppercase text-[11px] h-8 px-1 align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>STT</th>
                <th className="text-white min-w-[80px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>NHÓM</th>
                <th className="text-white min-w-[80px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>MÃ SỐ</th>
                <th className="text-white min-w-[110px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>HỌ TÊN TN</th>
                <th className="text-white min-w-[100px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#2563EB', backgroundColor: '#1D4ED8' }}>TỔNG FYP NHÓM<br/><span className="text-[11px] italic font-normal normal-case">Tháng {currentMonth}</span></th>
                <th className="text-white min-w-[100px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: TIER_GROUP_HEADER_BG, backgroundColor: TIER_GROUP_HEADER_BG }}>LƯỢT HĐC<br/><span className="text-[11px] italic font-normal normal-case">Tháng {currentMonth}</span></th>
                <th className="text-white min-w-[100px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#7C3AED', backgroundColor: '#6D28D9' }}>
                  FYC
                  <br/>
                  <span className="text-[11px] italic font-normal normal-case text-amber-200">(TLHH 25%)</span>
                </th>
                <th className="text-white min-w-[90px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: TIER_GROUP_HEADER_BG, backgroundColor: TIER_GROUP_HEADER_BG }}>TL THƯỞNG</th>
                <th className="text-white min-w-[110px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>TIỀN THƯỞNG</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-gray-400 py-8 italic text-xs bg-white p-2 align-middle">Chưa có TN nào.</td></tr>
              ) : filteredRows.map((row) => (
                <tr key={row.maTN} className="bg-white hover:bg-emerald-50 transition-colors border-b border-gray-300" style={{ borderRadius: 0 }}>
                  <td className="text-center text-gray-400 text-[11px] p-2 align-middle whitespace-nowrap" style={{ borderColor: '#D1FAE5' }}>{row.stt}</td>
                  <td className="text-[11px] text-gray-700 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.nhom || '—'}</td>
                  <td className="font-mono text-[11px] text-gray-500 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.maTN}</td>
                  <td className="text-[11px] text-gray-800 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.hoTen}</td>
                  <td className="text-[11px] font-bold text-right whitespace-nowrap p-2 align-middle" style={{ borderColor: '#BFDBFE', backgroundColor: '#DBEAFE', color: '#1E40AF' }}>{row.tongFYPNhom > 0 ? formatNumber(row.tongFYPNhom) : '—'}</td>
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: TIER_BORDER, backgroundColor: TIER_GRADIENT_BG[Math.min(Math.floor(row.luotHDCNhom / 2), 5)] || '#FFDAB9', color: TIER_RATE_COLOR, fontSize: '12px', fontWeight: 900 }}>{row.luotHDCNhom}</td>
                  <td className="text-[11px] font-bold text-right whitespace-nowrap p-2 align-middle" style={{ borderColor: '#DDD6FE', backgroundColor: '#EDE9FE', color: '#5B21B6' }}>{row.fyc > 0 ? formatNumber(row.fyc) : '—'}</td>
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: TIER_BORDER, backgroundColor: TIER_GRADIENT_BG[0], color: TIER_RATE_COLOR, fontSize: '12px', fontWeight: 900 }}>
                    {row.tlThuong > 0 ? `${row.tlThuong}%` : <span style={{ color: '#9CA3AF', fontWeight: 400 }}>—</span>}
                  </td>
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5', backgroundColor: '#FFFFFF', color: '#047857', fontSize: '13px', fontWeight: 800 }}>
                    {renderThuongCellContent(row.tienThuong)}
                  </td>
                </tr>
              ))}
              {/* Total row đã chuyển xuống footer cố định — không render ở đây nữa */}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ========== THƯỞNG TTN TUYỂN NGANG ==========
  // Đối tượng: TẤT CẢ TTN Tuyển Ngang từ DS TTN Tuyển Ngang (state tuyenNgangList)
  // Sắp xếp: theo THÁNG LÀM VIỆC từ nhỏ đến lớn
  // Lọc: chỉ hiển thị TTN có relMonth từ 1 đến 6 (relMonth > 6 tự động loại)
  //
  // Bảng CHỈ TIÊU THEO THÁNG (relMonth 1-6):
  //   Tháng 1: Quy mô 2, TVVm HĐC 1, FYP 25tr, Thưởng 8tr
  //   Tháng 2: Quy mô 3, TVVm HĐC 2, FYP 35tr, Thưởng 8tr
  //   Tháng 3: Quy mô 4, TVVm HĐC 2, FYP 45tr, Thưởng 8tr
  //   Tháng 4: Quy mô 5, TVVm HĐC 2, FYP 45tr, Thưởng 5tr
  //   Tháng 5: Quy mô 6, TVVm HĐC 3, FYP 50tr, Thưởng 5tr
  //   Tháng 6: Quy mô 6, TVVm HĐC 3, FYP 50tr, Thưởng 5tr
  //
  // Bảng THƯỜNG BẮT KỲP:
  //   BẮT KỲP 3 THÁNG (cuối tháng 3): Quy mô 4, TVVm HĐC 2, FYP 100tr → Thưởng 24tr
  //   BẮT KỊP 6 THÁNG (cuối tháng 6): Quy mô 6, TVVm HĐC 3, FYP 250tr → Thưởng 39tr
  //   Trừ đi tổng thưởng tháng đã nhận trong khoảng tương ứng
  //
  // THỰC HIỆN THÁNG:
  //   - Quy mô: số TVV do TTN tuyển có ngayBatDau <= cuối tháng đó (cumulative theo tháng)
  //             KHÔNG tính cá nhân TTN
  //   - TVVm HĐC: TVVm (≤12 tháng) trong team có IP tháng ≥ 12tr → 1 lượt.
  //               Tính luôn cá nhân TTN nếu TTN là TVVm + IP tháng ≥ 12tr
  //   - FYP: tổng IP tháng của TVVm do TTN tuyển + TTN nếu là TVVm
  //   - IP tính theo NGÀY PHÁT HÀNH (getDoanhSoMonth)
  //
  // THỰC HIỆN LŨY KẾ (6 tháng đầu từ ngayHieuLuc):
  //   - Quy mô: teamTVVs.length (cumulative — không đổi)
  //   - TVVm HĐC: số TVVm đạt HĐC (IP tháng ≥ 12tr) trong ÍT NHẤT 1 tháng của 6 tháng đầu
  //   - FYP: tổng IP 6 tháng đầu của TVVm team + TTN nếu là TVVm
  //
  // THƯỞNG THÁNG: spec.thuong nếu đạt cả 3 chỉ tiêu tháng
  // THƯỜNG BẮT KỲP:
  //   - relMonth >= 6: nếu đạt cum6 → 39tr - tổng thưởng tháng 1-6 - thưởng bắt kịp 3 (nếu đạt)
  //   - relMonth 3-5: nếu đạt cum3 → 24tr - tổng thưởng tháng 1-3
  //   - relMonth < 3: —
  const renderThuongTuyenNgang = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const HEADER_BG = '#065F46';
    const SUB_HEADER_BG = '#047857';
    const HDC_IP_THRESHOLD = 12_000_000;

    // Spec table theo tháng làm việc (1-6)
    const SPEC_TABLE = [
      { quymo: 2, tvvmHdc: 1, fyp: 25_000_000, thuong: 8_000_000 },
      { quymo: 3, tvvmHdc: 2, fyp: 35_000_000, thuong: 8_000_000 },
      { quymo: 4, tvvmHdc: 2, fyp: 45_000_000, thuong: 8_000_000 },
      { quymo: 5, tvvmHdc: 2, fyp: 45_000_000, thuong: 5_000_000 },
      { quymo: 6, tvvmHdc: 3, fyp: 50_000_000, thuong: 5_000_000 },
      { quymo: 6, tvvmHdc: 3, fyp: 50_000_000, thuong: 5_000_000 },
    ];
    const getSpec = (relMonth: number) => {
      if (relMonth < 1 || relMonth > SPEC_TABLE.length) return null;
      return SPEC_TABLE[relMonth - 1];
    };

    // Spec THƯỞNG BẮT KỲP
    const CATCHUP_3 = { quymo: 4, tvvmHdc: 2, fyp: 100_000_000, thuong: 24_000_000 };
    const CATCHUP_6 = { quymo: 6, tvvmHdc: 3, fyp: 250_000_000, thuong: 39_000_000 };

    // Tính tháng làm việc (relativeMonth) từ ngayHieuLuc — tròn tháng
    const calcRelMonth = (ngayHieuLuc: string | null): number => {
      if (!ngayHieuLuc) return 0;
      const start = new Date(ngayHieuLuc);
      if (isNaN(start.getTime())) return 0;
      const now = new Date();
      return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
    };

    // Helper: tính stats cho 1 tháng cụ thể (relMonth N)
    const getMonthStats = (
      tn: TuyenNgangItem,
      hieuLucDate: Date | null,
      teamTVVs: TVVStructItem[],
      relMonthN: number
    ): { quymo: number; tvvmHdc: number; fyp: number } => {
      if (!hieuLucDate || relMonthN < 1) return { quymo: 0, tvvmHdc: 0, fyp: 0 };
      const targetDate = new Date(hieuLucDate.getFullYear(), hieuLucDate.getMonth() + relMonthN - 1, 1);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth() + 1;

      // Quy mô tháng N: số TVV do TTN tuyển có ngayBatDau <= cuối tháng N
      const endOfTargetMonth = new Date(hieuLucDate.getFullYear(), hieuLucDate.getMonth() + relMonthN, 0);
      const quymo = teamTVVs.filter(tvv => {
        if (!tvv.ngayBatDau) return false;
        const bd = new Date(tvv.ngayBatDau);
        return !isNaN(bd.getTime()) && bd <= endOfTargetMonth;
      }).length;

      // Hợp đồng tháng target của team + TTN
      const tnCode = tn.agentCode;
      const teamCodes = new Set(teamTVVs.map(t => t.agentCode));
      const monthContracts = contracts.filter(c => {
        if (!teamCodes.has(c.agentCode) && c.agentCode !== tnCode) return false;
        const d = getDoanhSoMonth(c);
        return !isNaN(d.getTime()) && d.getFullYear() === targetYear && (d.getMonth() + 1) === targetMonth;
      });

      // TVVm HĐC tháng N
      let tvvmHdc = teamTVVs.filter(tvv => {
        if (!isTVVm(tvv.ngayBatDau)) return false;
        const ip = monthContracts
          .filter(c => c.agentCode === tvv.agentCode)
          .reduce((s, c) => s + c.pdt10DT, 0);
        return ip >= HDC_IP_THRESHOLD;
      }).length;
      const tnIsTVVm = isTVVm(tn.ngayBatDau);
      const tnMonthIP = monthContracts
        .filter(c => c.agentCode === tnCode)
        .reduce((s, c) => s + c.pdt10DT, 0);
      if (tnIsTVVm && tnMonthIP >= HDC_IP_THRESHOLD) tvvmHdc += 1;

      // FYP tháng N = tổng IP của TVVm trong team + TTN nếu là TVVm
      const tvvmTeamCodes = new Set(
        teamTVVs.filter(tvv => isTVVm(tvv.ngayBatDau)).map(tvv => tvv.agentCode)
      );
      let fyp = monthContracts
        .filter(c => tvvmTeamCodes.has(c.agentCode))
        .reduce((s, c) => s + c.pdt10DT, 0);
      if (tnIsTVVm) fyp += tnMonthIP;

      return { quymo, tvvmHdc, fyp };
    };

    // Helper: tính CUMULATIVE cho N tháng đầu
    const getCumStats = (
      tn: TuyenNgangItem,
      hieuLucDate: Date | null,
      teamTVVs: TVVStructItem[],
      numMonths: number
    ): { quymo: number; tvvmHdc: number; fyp: number } => {
      if (!hieuLucDate) return { quymo: 0, tvvmHdc: 0, fyp: 0 };
      // Quy mô cumulative = teamTVVs.length (theo định nghĩa)
      const quymo = teamTVVs.length;

      // Window: từ tháng 1 đến tháng numMonths
      const startMonthIdx = hieuLucDate.getMonth();
      const startYear = hieuLucDate.getFullYear();
      const tnCode = tn.agentCode;
      const teamCodes = new Set(teamTVVs.map(t => t.agentCode));
      const tnIsTVVm = isTVVm(tn.ngayBatDau);

      // Hợp đồng trong window
      const windowContracts = contracts.filter(c => {
        if (!teamCodes.has(c.agentCode) && c.agentCode !== tnCode) return false;
        const d = getDoanhSoMonth(c);
        if (isNaN(d.getTime())) return false;
        const mIdx = d.getFullYear() * 12 + d.getMonth();
        const startIdx = startYear * 12 + startMonthIdx;
        return mIdx >= startIdx && mIdx < startIdx + numMonths;
      });

      // TVVm HĐC cumulative = số TVVm có ÍT NHẤT 1 tháng trong window đạt HĐC
      let tvvmHdc = teamTVVs.filter(tvv => {
        if (!isTVVm(tvv.ngayBatDau)) return false;
        for (let m = 0; m < numMonths; m++) {
          const targetDate = new Date(startYear, startMonthIdx + m, 1);
          const ip = windowContracts
            .filter(c => c.agentCode === tvv.agentCode)
            .filter(c => {
              const d = getDoanhSoMonth(c);
              return d.getFullYear() === targetDate.getFullYear() && d.getMonth() === targetDate.getMonth();
            })
            .reduce((s, c) => s + c.pdt10DT, 0);
          if (ip >= HDC_IP_THRESHOLD) return true;
        }
        return false;
      }).length;
      // TTN nếu là TVVm
      if (tnIsTVVm) {
        for (let m = 0; m < numMonths; m++) {
          const targetDate = new Date(startYear, startMonthIdx + m, 1);
          const ip = windowContracts
            .filter(c => c.agentCode === tnCode)
            .filter(c => {
              const d = getDoanhSoMonth(c);
              return d.getFullYear() === targetDate.getFullYear() && d.getMonth() === targetDate.getMonth();
            })
            .reduce((s, c) => s + c.pdt10DT, 0);
          if (ip >= HDC_IP_THRESHOLD) { tvvmHdc += 1; break; }
        }
      }

      // FYP cumulative = tổng IP trong window của TVVm team + TTN nếu là TVVm
      const tvvmTeamCodes = new Set(
        teamTVVs.filter(tvv => isTVVm(tvv.ngayBatDau)).map(tvv => tvv.agentCode)
      );
      let fyp = windowContracts
        .filter(c => tvvmTeamCodes.has(c.agentCode))
        .reduce((s, c) => s + c.pdt10DT, 0);
      if (tnIsTVVm) {
        fyp += windowContracts
          .filter(c => c.agentCode === tnCode)
          .reduce((s, c) => s + c.pdt10DT, 0);
      }

      return { quymo, tvvmHdc, fyp };
    };

    // Build rows + lọc TTN có relMonth 1-6
    const allRows = tuyenNgangList.map((tn, idx) => {
      const nhomName = resolveNhomName(
        tn.agentCode, '', banNhomList, contracts, leaders,
        { allowPA: true, candidateNhomName: tn.nhom }
      );
      const hieuLucDate = tn.ngayHieuLuc ? new Date(tn.ngayHieuLuc) : null;
      const ngayHieuLucStr = hieuLucDate && !isNaN(hieuLucDate.getTime())
        ? hieuLucDate.toLocaleDateString('vi-VN') : '';
      const relMonth = calcRelMonth(tn.ngayHieuLuc);
      const tnCodeLower = (tn.agentCode || '').trim().toLowerCase();
      const teamTVVs = tvvStructList.filter(tvv =>
        (tvv.maTVVTuyendung || '').trim().toLowerCase() === tnCodeLower
      );

      // CHỈ TIÊU
      const spec = getSpec(relMonth);
      const ctQuymo = spec?.quymo ?? 0;
      const ctTvvmHdc = spec?.tvvmHdc ?? 0;
      const ctFyp = spec?.fyp ?? 0;
      const thuongIfDat = spec?.thuong ?? 0;

      // THỰC HIỆN THÁNG (của relMonth hiện tại)
      const thStats = getMonthStats(tn, hieuLucDate, teamTVVs, relMonth);
      const dat = spec != null && thStats.quymo >= ctQuymo && thStats.tvvmHdc >= ctTvvmHdc && thStats.fyp >= ctFyp;
      const tienThuongThang = dat ? thuongIfDat : 0;

      // THỰC HIỆN LŨY KẾ (6 tháng đầu)
      const lkStats = getCumStats(tn, hieuLucDate, teamTVVs, 6);

      // Tính tổng THƯỜNG THÁNG đã nhận (cho từng tháng 1..relMonth)
      const tinhThuongThangAt = (relMonthN: number): number => {
        const sp = getSpec(relMonthN);
        if (!sp) return 0;
        const stats = getMonthStats(tn, hieuLucDate, teamTVVs, relMonthN);
        if (stats.quymo >= sp.quymo && stats.tvvmHdc >= sp.tvvmHdc && stats.fyp >= sp.fyp) {
          return sp.thuong;
        }
        return 0;
      };

      // THƯỜNG BẮT KỲP
      let tienThuongBatKip = 0;
      let batKipLabel = '';
      if (relMonth >= 6) {
        // Xét bắt kịp 6 tháng
        const cum6 = getCumStats(tn, hieuLucDate, teamTVVs, 6);
        const dat6 = cum6.quymo >= CATCHUP_6.quymo && cum6.tvvmHdc >= CATCHUP_6.tvvmHdc && cum6.fyp >= CATCHUP_6.fyp;
        if (dat6) {
          // Tổng thưởng tháng đã nhận (1-6)
          let tongThuongThang = 0;
          for (let m = 1; m <= 6; m++) tongThuongThang += tinhThuongThangAt(m);
          // Thưởng bắt kịp 3 tháng (nếu đạt)
          const cum3 = getCumStats(tn, hieuLucDate, teamTVVs, 3);
          const dat3 = cum3.quymo >= CATCHUP_3.quymo && cum3.tvvmHdc >= CATCHUP_3.tvvmHdc && cum3.fyp >= CATCHUP_3.fyp;
          const thuongBatKip3 = dat3 ? CATCHUP_3.thuong : 0;
          tienThuongBatKip = CATCHUP_6.thuong - tongThuongThang - thuongBatKip3;
          batKipLabel = 'BK6';
        }
      } else if (relMonth >= 3) {
        // Xét bắt kịp 3 tháng
        const cum3 = getCumStats(tn, hieuLucDate, teamTVVs, 3);
        const dat3 = cum3.quymo >= CATCHUP_3.quymo && cum3.tvvmHdc >= CATCHUP_3.tvvmHdc && cum3.fyp >= CATCHUP_3.fyp;
        if (dat3) {
          let tongThuongThang = 0;
          for (let m = 1; m <= 3; m++) tongThuongThang += tinhThuongThangAt(m);
          tienThuongBatKip = CATCHUP_3.thuong - tongThuongThang;
          batKipLabel = 'BK3';
        }
      }

      return {
        idx,
        stt: 0,
        nhom: nhomName,
        maTN: tn.agentCode,
        hoTen: tn.agentName,
        ngayHieuLuc: ngayHieuLucStr,
        relMonth,
        // CHỈ TIÊU
        ctQuymo, ctTvvmHdc, ctFyp,
        // THỰC HIỆN THÁNG
        thQuymo: thStats.quymo,
        thTvvmHDC: thStats.tvvmHdc,
        thTongFYP: thStats.fyp,
        // THƯỞNG THÁNG
        dat, tienThuongThang, thuongIfDat,
        // THỰC HIỆN LŨY KẾ
        lkQuymo: lkStats.quymo,
        lkTvvmHDC: lkStats.tvvmHdc,
        lkFYP: lkStats.fyp,
        // THƯỜNG BẮT KỲP
        tienThuongBatKip, batKipLabel,
      };
    });

    // Lọc: chỉ giữ TTN có relMonth 1-6
    const tnRows = allRows
      .filter(r => r.relMonth >= 1 && r.relMonth <= 6)
      .sort((a, b) => a.relMonth - b.relMonth)
      .map((r, i) => ({ ...r, stt: i + 1 }));

    // Tổng cộng
    const totalQuymo = tnRows.reduce((s, r) => s + r.thQuymo, 0);
    const totalTvvmHDC = tnRows.reduce((s, r) => s + r.thTvvmHDC, 0);
    const totalTongFYP = tnRows.reduce((s, r) => s + r.thTongFYP, 0);
    const totalThuongThang = tnRows.reduce((s, r) => s + r.tienThuongThang, 0);
    const totalLkQuymo = tnRows.reduce((s, r) => s + r.lkQuymo, 0);
    const totalLkTvvmHDC = tnRows.reduce((s, r) => s + r.lkTvvmHDC, 0);
    const totalLkFYP = tnRows.reduce((s, r) => s + r.lkFYP, 0);
    const totalThuongBatKip = tnRows.reduce((s, r) => s + Math.max(0, r.tienThuongBatKip), 0);
    const datThuongCount = tnRows.filter(r => r.tienThuongThang > 0 || r.tienThuongBatKip > 0).length;
    const excludedCount = allRows.length - tnRows.length;

    return (
      <div className="space-y-1" data-policy-count={datThuongCount} data-policy-amount={totalThuongThang + totalThuongBatKip}>
        {/* Table */}
        <div className="bg-white border shadow-xl h-full" style={{ borderColor: '#A7F3D0', borderRadius: 0 }}>
          <table className="w-full text-xs bg-white h-full" style={{ borderRadius: 0, borderCollapse: 'collapse' }}>
            <thead className="sticky top-0 z-10">
              {/* Row 1: Main headers */}
              <tr style={{ backgroundColor: HEADER_BG }}>
                <th rowSpan={2} className="text-white text-center w-[32px] font-bold uppercase text-[11px] h-8 px-1 align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>STT</th>
                <th rowSpan={2} className="text-white min-w-[80px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>NHÓM KD</th>
                <th rowSpan={2} className="text-white min-w-[70px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>MÃ SỐ</th>
                <th rowSpan={2} className="text-white min-w-[120px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>HỌ TÊN TVV</th>
                <th rowSpan={2} className="text-white min-w-[90px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>NGÀY HIỆU LỰC<br/><span className="text-[10px] italic font-normal normal-case">CHỨC VỤ</span></th>
                <th rowSpan={2} className="text-white min-w-[60px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>THÁNG LÀM<br/>VIỆC</th>
                <th colSpan={3} className="text-white font-bold uppercase text-[12px] px-2 text-center align-middle whitespace-nowrap" style={{ backgroundColor: '#0F766E', borderColor: '#0F766E', height: '22px' }}>CHỈ TIÊU</th>
                <th colSpan={3} className="text-white font-bold uppercase text-[12px] px-2 text-center align-middle whitespace-nowrap" style={{ backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' }}>THỰC HIỆN THÁNG</th>
                <th rowSpan={2} className="text-white min-w-[90px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>THƯỞNG<br/>THÁNG</th>
                <th colSpan={3} className="text-white font-bold uppercase text-[12px] px-2 text-center align-middle whitespace-nowrap" style={{ backgroundColor: '#7C3AED', borderColor: '#7C3AED' }}>THỰC HIỆN LŨY KẾ</th>
                <th rowSpan={2} className="text-white min-w-[100px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>THƯỞNG<br/>BẮT KỲP</th>
              </tr>
              {/* Row 2: Sub-headers */}
              <tr>
                <th className="text-white italic font-normal text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: SUB_HEADER_BG, borderColor: '#047857', height: '18px' }}>Quy mô</th>
                <th className="text-white italic font-normal text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: SUB_HEADER_BG, borderColor: '#047857' }}>TVVm HĐC</th>
                <th className="text-white italic font-normal text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: SUB_HEADER_BG, borderColor: '#047857' }}>Tổng FYP</th>
                <th className="text-white italic font-normal text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: '#1E40AF', borderColor: '#1E40AF' }}>Quy mô</th>
                <th className="text-white italic font-normal text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: '#1E40AF', borderColor: '#1E40AF' }}>TVVm HĐC</th>
                <th className="text-white italic font-normal text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: '#1E40AF', borderColor: '#1E40AF' }}>Tổng FYP</th>
                <th className="text-white italic font-normal text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: '#6D28D9', borderColor: '#6D28D9' }}>Quy mô</th>
                <th className="text-white italic font-normal text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: '#6D28D9', borderColor: '#6D28D9' }}>TVVm HĐC</th>
                <th className="text-white italic font-normal text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: '#6D28D9', borderColor: '#6D28D9' }}>Tổng FYP</th>
              </tr>
            </thead>
            <tbody>
              {tnRows.length === 0 ? (
                <tr>
                  <td colSpan={17} className="text-center text-gray-400 py-12 italic text-xs bg-white p-2 align-middle">
                    Chưa có TTN Tuyển Ngang nào trong DS (hoặc tất cả đều có tháng làm việc &gt; 6). Vào <b>Cấu trúc → DS TTN Tuyển Ngang</b> để thêm đối tượng.
                  </td>
                </tr>
              ) : tnRows.map((row) => (
                <tr key={row.maTN} className="bg-white hover:bg-emerald-50 transition-colors border-b border-gray-300" style={{ borderRadius: 0 }}>
                  <td className="text-center text-gray-400 text-[11px] p-2 align-middle whitespace-nowrap" style={{ borderColor: '#D1FAE5' }}>{row.stt}</td>
                  <td className="text-[11px] text-gray-700 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.nhom || '—'}</td>
                  <td className="font-mono text-[11px] text-gray-500 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.maTN}</td>
                  <td className="text-[11px] text-gray-800 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.hoTen}</td>
                  <td className="text-[11px] text-gray-600 text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.ngayHieuLuc || '—'}</td>
                  <td className="text-[11px] text-gray-800 text-center font-bold whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5', backgroundColor: '#F0FDFA' }}>{row.relMonth}</td>
                  {/* CHỈ TIÊU */}
                  <td className="text-center text-[11px] text-gray-700 p-2 align-middle" style={{ borderColor: '#99F6E4', backgroundColor: '#F0FDFA' }}>{row.ctQuymo || '—'}</td>
                  <td className="text-center text-[11px] text-gray-700 p-2 align-middle" style={{ borderColor: '#99F6E4', backgroundColor: '#F0FDFA' }}>{row.ctTvvmHdc || '—'}</td>
                  <td className="text-right text-[11px] text-gray-700 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#99F6E4', backgroundColor: '#F0FDFA' }}>{row.ctFyp > 0 ? formatNumber(row.ctFyp) : '—'}</td>
                  {/* THỰC HIỆN THÁNG */}
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#BFDBFE', backgroundColor: '#DBEAFE', color: '#1E40AF', fontSize: '12px', fontWeight: 800 }}>{row.thQuymo || '—'}</td>
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#BFDBFE', backgroundColor: '#DBEAFE', color: '#1E40AF', fontSize: '12px', fontWeight: 800 }}>{row.thTvvmHDC || '—'}</td>
                  <td className="text-right whitespace-nowrap p-2 align-middle" style={{ borderColor: '#BFDBFE', backgroundColor: '#DBEAFE', color: '#1E40AF', fontSize: '11px', fontWeight: 800 }}>{row.thTongFYP > 0 ? formatNumber(row.thTongFYP) : '—'}</td>
                  {/* THƯỞNG THÁNG */}
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5', backgroundColor: row.dat ? '#FEF3C7' : '#FFFFFF', color: row.dat ? '#047857' : '#9CA3AF', fontSize: '12px', fontWeight: 800 }}>
                    {row.dat ? formatNumber(row.tienThuongThang) : '—'}
                  </td>
                  {/* THỰC HIỆN LŨY KẾ */}
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#DDD6FE', backgroundColor: '#EDE9FE', color: '#5B21B6', fontSize: '12px', fontWeight: 800 }}>{row.lkQuymo || '—'}</td>
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#DDD6FE', backgroundColor: '#EDE9FE', color: '#5B21B6', fontSize: '12px', fontWeight: 800 }}>{row.lkTvvmHDC || '—'}</td>
                  <td className="text-right whitespace-nowrap p-2 align-middle" style={{ borderColor: '#DDD6FE', backgroundColor: '#EDE9FE', color: '#5B21B6', fontSize: '11px', fontWeight: 800 }}>{row.lkFYP > 0 ? formatCurrency(row.lkFYP) : '—'}</td>
                  {/* THƯỞNG BẮT KỲP */}
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5', backgroundColor: row.tienThuongBatKip > 0 ? '#FEF3C7' : '#FFFFFF', color: row.tienThuongBatKip > 0 ? '#047857' : '#9CA3AF', fontSize: '12px', fontWeight: 800 }}>
                    {row.tienThuongBatKip > 0 ? <>{formatNumber(row.tienThuongBatKip)}<div style={{ fontSize: '9px', fontWeight: 600, color: '#7C3AED' }}>{row.batKipLabel}</div></> : (row.batKipLabel ? <span style={{ color: '#9CA3AF' }}>—</span> : '—')}
                  </td>
                </tr>
              ))}
              {/* Total row */}
              {tnRows.length > 0 && (
                <tr style={{ backgroundColor: '#065F46' }}>
                  <td colSpan={6} className="text-white text-[11px] font-bold uppercase text-right p-2 align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>TỔNG CỘNG ({tnRows.length} TTN{excludedCount > 0 ? `, loại ${excludedCount} TTN &gt;T6` : ''})</td>
                  {/* CHỈ TIÊU tổng */}
                  <td className="text-white text-center text-[11px] p-2 align-middle" style={{ borderColor: '#0F766E', backgroundColor: '#0F766E' }}>—</td>
                  <td className="text-white text-center text-[11px] p-2 align-middle" style={{ borderColor: '#0F766E', backgroundColor: '#0F766E' }}>—</td>
                  <td className="text-white text-center text-[11px] p-2 align-middle" style={{ borderColor: '#0F766E', backgroundColor: '#0F766E' }}>—</td>
                  {/* THỰC HIỆN THÁNG tổng */}
                  <td className="text-white text-center text-[12px] font-black p-2 align-middle" style={{ borderColor: '#1E40AF', backgroundColor: '#1E40AF' }}>{totalQuymo}</td>
                  <td className="text-white text-center text-[12px] font-black p-2 align-middle" style={{ borderColor: '#1E40AF', backgroundColor: '#1E40AF' }}>{totalTvvmHDC}</td>
                  <td className="text-white text-right text-[11px] font-black p-2 align-middle" style={{ borderColor: '#1E40AF', backgroundColor: '#1E40AF' }}>{totalTongFYP > 0 ? formatNumber(totalTongFYP) : '—'}</td>
                  {/* THƯỞNG THÁNG tổng */}
                  <td className="text-white text-center text-[12px] font-black p-2 align-middle" style={{ borderColor: '#047857', backgroundColor: '#FEF3C7', color: '#047857' }}>{totalThuongThang > 0 ? formatNumber(totalThuongThang) : '—'}</td>
                  {/* THỰC HIỆN LŨY KẾ tổng */}
                  <td className="text-white text-center text-[12px] font-black p-2 align-middle" style={{ borderColor: '#6D28D9', backgroundColor: '#6D28D9' }}>{totalLkQuymo}</td>
                  <td className="text-white text-center text-[12px] font-black p-2 align-middle" style={{ borderColor: '#6D28D9', backgroundColor: '#6D28D9' }}>{totalLkTvvmHDC}</td>
                  <td className="text-white text-right text-[11px] font-black p-2 align-middle" style={{ borderColor: '#6D28D9', backgroundColor: '#6D28D9' }}>{totalLkFYP > 0 ? formatCurrency(totalLkFYP) : '—'}</td>
                  {/* THƯỞNG BẮT KỲP tổng */}
                  <td className="text-white text-center text-[12px] font-black p-2 align-middle" style={{ borderColor: '#047857', backgroundColor: '#FEF3C7', color: '#047857' }}>{totalThuongBatKip > 0 ? formatNumber(totalThuongBatKip) : '—'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };



  const renderPolicyContent = (key: string) => {
    switch (key) {
      case 'tvvm': return renderTvvMTable();
      case 'ns-tvv': return renderThuongNSThangTVV();
      case 'quy-tvv': return renderThuongQuyTVV();
      case 'tuyen-luyen': return renderThuongTuyenLuyen();
      case 'dong-hanh': return renderThuongDongHanh();
      case 'ptkd-tn': return renderThuongPTKD();
      case 'quy-tn': return renderThuongQuyTN();
      case 'tuyen-ngang': return renderThuongTuyenNgang();
      default: return (
        <div className="text-center py-12 text-gray-300 text-xs italic">
          Nội dung chính sách sẽ được cấu hình tại đây.
        </div>
      );
    }
  };

  const renderPolicy = () => {
    if (!policyOpen) {
      // Tổng hợp chính sách — grid 2 cột, mỗi ô 1 chương trình (ảnh 16:9 + tên) — SELECTION ONLY
      return (
        <div>
          {/* Top bar: title */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm sm:text-base font-extrabold text-emerald-300 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> TỔNG QUAN CHÍNH SÁCH
            </h2>
            <span className="text-[11px] text-emerald-200/60 italic">{POLICY_ITEMS.length} chính sách</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {POLICY_ITEMS.map(item => {
              const currentImage = policyImageLinks[item.key] || '';
              const IIcon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => navigateTo({ sheet: 'report', policyOpen: item.key })}
                  className="group relative rounded-lg overflow-hidden border-2 shadow-lg flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl active:scale-95 active:translate-y-0"
                  style={{
                    borderColor: `${item.color}AA`,
                    backgroundColor: '#0e1424',
                  }}
                >
                  {/* Decorative top glow strip for elevated feel */}
                  <span
                    className="absolute top-0 left-0 right-0 h-[3px] z-10 opacity-70 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"
                    style={{ background: `linear-gradient(90deg, transparent, ${item.color}, transparent)` }}
                  />
                  {/* Top: 16:9 image — click anywhere opens detail */}
                  <div
                    className="relative w-full bg-black/40 flex items-center justify-center overflow-hidden"
                    style={{ aspectRatio: '16 / 9' }}
                  >
                    {currentImage ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={currentImage}
                          alt={item.label}
                          className="w-full h-full object-cover pointer-events-none transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* Subtle dark gradient at bottom for text legibility */}
                        <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                      </>
                    ) : (
                      // Empty — placeholder icon (no upload button — manage in Settings dialog)
                      <div className="flex flex-col items-center justify-center gap-1 px-3 py-3 text-center">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-dashed transition-transform duration-300 group-hover:scale-110"
                          style={{ borderColor: `${item.color}66`, backgroundColor: `${item.color}11` }}
                        >
                          <IIcon className="w-5 h-5" style={{ color: item.color }} />
                        </div>
                        <span className="text-[10px] font-semibold" style={{ color: item.color }}>
                          {item.label}
                        </span>
                        <span className="text-[8px] text-gray-500 italic">Chưa có ảnh</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom: program name + desc */}
                  <div
                    className="text-left px-2.5 py-2 border-t flex-1 flex flex-col gap-0.5 transition-colors"
                    style={{ borderColor: `${item.color}33` }}
                  >
                    <div className="flex items-center gap-1.5">
                      <IIcon className="w-3 h-3 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" style={{ color: item.color }} />
                      <h3 className="text-[11px] font-extrabold truncate leading-tight transition-colors" style={{ color: item.color }}>
                        {item.label}
                      </h3>
                      <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0 text-gray-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white/80" />
                    </div>
                    <p className="text-[10px] text-gray-400 leading-tight line-clamp-1">
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          {/* Footer note — image management moved to Settings dialog */}
          <div className="mt-3 p-2.5 border-2 rounded-xl" style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <p className="text-[11px] text-emerald-200/70 leading-relaxed">
              <strong className="text-emerald-300">Ghi chú:</strong> Bấm vào 1 chính sách để xem chi tiết. Quản lý ảnh chính sách ở mục <strong>Cài đặt</strong> (biểu tượng bánh răng trên header).
            </p>
          </div>
        </div>
      );
    }
    const item = POLICY_ITEMS.find(i => i.key === policyOpen);
    if (!item) return null;
    const imageLink = policyImageLinks[policyOpen] || '';

    // Get summary + filter data for this policy
    // TN policies (tuyen-luyen, dong-hanh, ptkd-tn, quy-tn, tuyen-ngang) — no filter
    const isTnPolicy = ['tuyen-luyen', 'dong-hanh', 'ptkd-tn', 'quy-tn', 'tuyen-ngang'].includes(policyOpen);
    // TVV policies (tvvm, ns-tvv, quy-tvv) — have filter
    const isTvvPolicy = ['tvvm', 'ns-tvv', 'quy-tvv'].includes(policyOpen);

    // Determine filter state + nhom list based on policy
    const nameFilter = isTvvPolicy ? (
      policyOpen === 'tvvm' ? tvvmNameFilter :
      policyOpen === 'ns-tvv' ? nsTvvNameFilter :
      quyTvvNameFilter
    ) : '';
    const setNameFilter = isTvvPolicy ? (
      policyOpen === 'tvvm' ? setTvvmNameFilter :
      policyOpen === 'ns-tvv' ? setNsTvvNameFilter :
      setQuyTvvNameFilter
    ) : () => {};
    const nhomFilter = isTvvPolicy ? (
      policyOpen === 'tvvm' ? tvvmNhomFilter :
      policyOpen === 'ns-tvv' ? nsTvvNhomFilter :
      quyTvvNhomFilter
    ) : '';
    const setNhomFilter = isTvvPolicy ? (
      policyOpen === 'tvvm' ? setTvvmNhomFilter :
      policyOpen === 'ns-tvv' ? setNsTvvNhomFilter :
      setQuyTvvNhomFilter
    ) : () => {};

    // Get unique nhom list from tvvStructList (all policies use same source)
    const uniqueNhomList = Array.from(new Set(
      tvvStructList
        .filter(t => t.maBanNhom && !isTVVExcludedFromRewards(t.agentCode, t.maBanNhom, banNhomList, adList))
        // TTN Tuyển Ngang = chương trình TTN → allowPA=true
        .map(t => resolveNhomName(t.agentCode, t.maBanNhom, banNhomList, [], leaders, { allowPA: true }))
        .filter(Boolean)
    )).sort();

    // Summary stats — we need to compute from the policy's data
    // For simplicity, we'll pass a placeholder that gets filled by policyContent
    // The actual counts will be computed inside each renderXxx function
    // Here we just render the container

    return (
      <div className="flex flex-col h-full p-2 relative" style={{ backgroundColor: '#0F172A', boxShadow: '0 6px 24px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,255,136,0.10)' }}>
        {/* ====== MOBILE LAYOUT: poster -> compact filters -> table -> footer ====== */}
        <div className="md:hidden flex flex-col flex-1 min-h-0 relative" style={{ backgroundColor: '#0F172A' }}>
          {/* Poster — full width 16:9 + program name overlay */}
          <div className="relative flex-shrink-0 w-full" style={{ aspectRatio: '16 / 9', backgroundColor: '#0F1729' }}>
            {imageLink ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageLink} alt={item.label} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 text-[10px] text-center p-3 gap-1">
                <BookOpen className="w-8 h-8 text-emerald-300/70" />
                <span className="italic">Chưa có ảnh</span>
                <span className="text-[8px] text-gray-500">Quản lý trong Cài đặt</span>
              </div>
            )}
            {/* Bottom gradient + program name overlay */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent flex items-end px-2 pb-1">
              <span className="text-white text-[10px] font-black uppercase tracking-wider truncate">{item.label}</span>
            </div>
          </div>

          {/* Compact filter row — 2 cols, mỏng (chỉ TVV policy có filter) */}
          {isTvvPolicy && (
            <div className="flex flex-shrink-0 items-center gap-1 px-1 py-1 border-b" style={{ backgroundColor: '#D1FAE5', borderColor: '#10B981' }}>
              {/* Nhóm dropdown */}
              <div className="relative z-[200] flex-1 min-w-0">
                <button
                  onClick={(e) => {
                    const dd = e.currentTarget.nextElementSibling as HTMLElement;
                    if (dd) dd.classList.toggle('hidden');
                  }}
                  className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #065F46', color: '#374151' }}
                >
                  <span className="truncate flex items-center gap-1">
                    <span className="text-emerald-700/70 text-[8px] uppercase tracking-wider">Nhóm</span>
                    <span className="truncate">{nhomFilter || 'Tất cả'}</span>
                  </span>
                  <ChevronDown className="w-3 h-3 flex-shrink-0" />
                </button>
                <div className="hidden absolute top-full left-0 right-0 mt-0.5 z-[300] bg-[#1a2332] border border-emerald-500/40 max-h-[120px] overflow-y-auto rounded-[2px] shadow-2xl">
                  <button
                    onClick={(e) => { setNhomFilter(''); e.currentTarget.closest('.relative')?.querySelector('.absolute')?.classList.add('hidden'); }}
                    className={`w-full text-left px-2 py-1 text-[10px] hover:bg-emerald-500/20 ${!nhomFilter ? 'text-emerald-300 font-bold' : 'text-emerald-200/70'}`}
                  >Tất cả nhóm</button>
                  {uniqueNhomList.map(n => (
                    <button
                      key={n}
                      onClick={(e) => { setNhomFilter(n); e.currentTarget.closest('.relative')?.querySelector('.absolute')?.classList.add('hidden'); }}
                      className={`w-full text-left px-2 py-1 text-[10px] hover:bg-emerald-500/20 ${nhomFilter === n ? 'text-emerald-300 font-bold' : 'text-emerald-200/70'}`}
                    >{n}</button>
                  ))}
                </div>
              </div>
              {/* Search tên */}
              <div className="relative z-[200] flex-1 min-w-0">
                <div className="flex items-center gap-1 px-2 py-1" style={{ backgroundColor: '#FFFFFF', border: '1px solid #065F46' }}>
                  <Search className="w-3 h-3 text-emerald-700 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Tìm tên TVV..."
                    value={nameFilter}
                    onChange={e => setNameFilter(e.target.value)}
                    className="text-[10px] bg-transparent outline-none flex-1 min-w-0 text-gray-800 placeholder:text-gray-500"
                  />
                  {nameFilter && <button onClick={() => setNameFilter('')} className="text-gray-500 hover:text-red-600 flex-shrink-0"><X className="w-3 h-3" /></button>}
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div
            className="flex-1 min-h-0 overflow-y-auto border bg-white policy-detail-table-wrapper"
            style={{ borderColor: '#9CA3AF', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}
            data-policy-table={policyOpen}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              const row = target.closest('tr');
              if (!row) return;
              if (row.closest('thead')) return;
              if (row.cells.length < 2) return;
              const wrapper = e.currentTarget;
              wrapper.querySelectorAll('tr.policy-row-highlighted').forEach(r => {
                if (r !== row) r.classList.remove('policy-row-highlighted');
              });
              row.classList.toggle('policy-row-highlighted');
            }}
          >
            <style dangerouslySetInnerHTML={{ __html: `
              @media (max-width: 767px) {
                .policy-detail-table-wrapper table { font-size: 9px !important; }
                .policy-detail-table-wrapper th,
                .policy-detail-table-wrapper td {
                  padding: 3px !important;
                  min-width: auto !important;
                  width: auto !important;
                  font-size: 9px !important;
                }
                .policy-detail-table-wrapper th span,
                .policy-detail-table-wrapper td span,
                .policy-detail-table-wrapper th br + span,
                .policy-detail-table-wrapper td br + span {
                  font-size: 8px !important;
                }
                .policy-detail-table-wrapper td[style*="13px"],
                .policy-detail-table-wrapper td[style*="13px"] span {
                  font-size: 10px !important;
                }
                .policy-detail-table-wrapper th.w-\\[32px\\] { width: 20px !important; min-width: 20px !important; }
              }
              .policy-detail-table-wrapper tr.policy-row-highlighted > td {
                background-color: #FEF3C7 !important;
                color: #92400E !important;
                font-weight: 700 !important;
              }
            `}} />
            {renderPolicyContent(policyOpen)}
          </div>

          {/* Footer FIXED */}
          <div className="flex-shrink-0 flex items-center justify-between px-3 text-white" style={{ height: '32px', backgroundColor: '#047857', borderTop: '2px solid #065F46' }}>
            <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-emerald-300">TỔNG:</span>
              <span id="policy-fixed-count" className="text-white">—</span>
            </span>
            <span className="text-[11px] font-bold flex items-center gap-1.5">
              <span className="text-amber-300 uppercase">Tổng thưởng:</span>
              <span id="policy-fixed-amount" className="text-amber-200 font-black">—</span>
            </span>
          </div>
        </div>

        {/* ====== DESKTOP LAYOUT (existing): 160px banner (image + summary cards + filters) -> table -> footer ====== */}
        <div className="hidden md:flex flex-col h-full" style={{ backgroundColor: '#0F172A' }}>
          {/* Top: ảnh trái + tổng hợp/filter phải — MÀU BẠC ĐẶC (#C0C0C0), ô bọc đổ bóng, không dùng rgba */}
          <div className="flex flex-shrink-0 border mb-1.5" style={{ height: '160px', backgroundColor: '#C0C0C0', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}>
            {/* Left: Image */}
            <div className="w-1/2 overflow-hidden flex-shrink-0" style={{ backgroundColor: '#0F1729' }}>
              {imageLink ? (
                <img src={imageLink} alt={item.label} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 text-[10px] text-center p-3 gap-1">
                  <Settings className="w-5 h-5 text-gray-500" />
                  <span>Chưa có ảnh</span>
                </div>
              )}
            </div>
            {/* Right: nền BẠC ĐẶC + ô bọc đổ bóng + viền */}
            <div className="w-1/2 flex flex-col gap-1 p-1.5 overflow-visible relative z-[200] border-l-2" style={{ backgroundColor: '#D1D5DB', boxShadow: 'inset 2px 0 6px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.15)', borderColor: '#9CA3AF' }}>
              {/* 2 ô tổng hợp */}
              <div className={`gap-1 ${isTvvPolicy ? 'flex flex-shrink-0' : 'flex flex-1 flex-col'}`}>
                <div className={`px-1 py-1 text-center ${isTvvPolicy ? 'flex-1' : 'flex-1 flex flex-col justify-center'}`} style={{ backgroundColor: '#059669', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', border: '1px solid #047857' }}>
                  <p className="text-[8px] font-bold uppercase text-white leading-tight">SL TVV đạt</p>
                  <p className="text-[14px] sm:text-[16px] font-black text-white leading-tight break-all" id={`policy-count-${policyOpen}`}>—</p>
                </div>
                <div className={`px-1 py-1 text-center ${isTvvPolicy ? 'flex-1' : 'flex-1 flex flex-col justify-center'}`} style={{ backgroundColor: '#D97706', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', border: '1px solid #B45309' }}>
                  <p className="text-[8px] font-bold uppercase text-white leading-tight">Tổng thưởng</p>
                  <p className="text-[12px] sm:text-[16px] font-black text-white leading-tight truncate" id={`policy-total-${policyOpen}`}>—</p>
                </div>
              </div>
              {/* Mobile: nút switch chính sách — popup FIXED overlay */}
              <div className="relative flex-shrink-0 z-[200] md:hidden">
                <button
                  onClick={() => setMobilePolicyPopupOpen(!mobilePolicyPopupOpen)}
                  className="w-full flex items-center justify-between px-1.5 py-1 text-[9px] text-white font-bold transition-all active:scale-95 active:brightness-75"
                  style={{ backgroundColor: '#047857', border: '1px solid #065F46', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                >
                  <span className="truncate flex items-center gap-1">
                    <BookOpen className="w-3 h-3 flex-shrink-0" />
                    {item.label}
                  </span>
                  <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${mobilePolicyPopupOpen ? 'rotate-180' : ''}`} />
                </button>
                {mobilePolicyPopupOpen && (
                  <>
                    <div className="fixed inset-0 z-[400] bg-black/40" onClick={() => setMobilePolicyPopupOpen(false)} />
                    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[500] bg-[#1a2332] border-2 border-emerald-500/60 max-h-[60vh] w-[72vw] max-w-[280px] overflow-y-auto shadow-2xl" style={{ borderRadius: 0 }}>
                      <div className="sticky top-0 bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1.5 border-b-2 border-emerald-500/60 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="w-3 h-3" /> Chọn chính sách
                        </span>
                        <button onClick={() => setMobilePolicyPopupOpen(false)} className="text-white/70 hover:text-white active:scale-90 transition-transform">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {POLICY_ITEMS.map(p => {
                        const subActive = policyOpen === p.key;
                        const PIcon = p.icon;
                        return (
                          <button
                            key={p.key}
                            onClick={() => { navigateTo({ sheet: 'report', policyOpen: p.key }); setMobilePolicyPopupOpen(false); }}
                            className={`w-full flex items-center gap-2 px-2.5 py-2 text-[11px] font-bold text-left hover:bg-emerald-500/20 active:scale-95 active:bg-emerald-500/30 transition-all border-b border-emerald-900/40 last:border-b-0 ${subActive ? 'text-emerald-300 bg-emerald-500/10' : 'text-emerald-100/80'}`}
                          >
                            <PIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: p.color }} />
                            <span className="truncate flex-1">{p.label}</span>
                            {subActive && <span className="text-emerald-400">●</span>}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              {/* TVV policies: bộ lọc nhóm + tìm tên */}
              {isTvvPolicy && (
                <>
                  <div className="relative flex-1 min-h-0 z-[200]">
                    <button
                      onClick={(e) => {
                        const dd = e.currentTarget.nextElementSibling as HTMLElement;
                        if (dd) dd.classList.toggle('hidden');
                      }}
                      className="w-full flex items-center justify-between px-1.5 py-1 text-[9px] font-bold"
                      style={{ backgroundColor: '#F9FAFB', border: '1px solid #6B7280', color: '#374151', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                    >
                      <span className="truncate">{nhomFilter || 'Tất cả nhóm'}</span>
                      <ChevronDown className="w-3 h-3 flex-shrink-0" />
                    </button>
                    <div className="hidden absolute top-full left-0 right-0 mt-0.5 z-[300] bg-[#1a2332] border border-emerald-500/40 max-h-[120px] overflow-y-auto rounded-[2px] shadow-2xl">
                      <button onClick={(e) => { setNhomFilter(''); e.currentTarget.closest('.relative')?.querySelector('.absolute')?.classList.add('hidden'); }} className={`w-full text-left px-2 py-0.5 text-[9px] hover:bg-emerald-500/20 ${!nhomFilter ? 'text-emerald-300 font-bold' : 'text-emerald-200/70'}`}>Tất cả nhóm</button>
                      {uniqueNhomList.map(n => (
                        <button key={n} onClick={(e) => { setNhomFilter(n); e.currentTarget.closest('.relative')?.querySelector('.absolute')?.classList.add('hidden'); }} className={`w-full text-left px-2 py-0.5 text-[9px] hover:bg-emerald-500/20 ${nhomFilter === n ? 'text-emerald-300 font-bold' : 'text-emerald-200/70'}`}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-1.5 py-1 flex-1 min-h-0" style={{ backgroundColor: '#F9FAFB', border: '1px solid #6B7280', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                    <Search className="w-2.5 h-2.5 text-gray-600 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Tìm tên TVV..."
                      value={nameFilter}
                      onChange={e => setNameFilter(e.target.value)}
                      className="text-[9px] bg-transparent outline-none flex-1 min-w-0 text-gray-800 placeholder:text-gray-500"
                    />
                    {nameFilter && <button onClick={() => setNameFilter('')} className="text-gray-500 hover:text-red-600 flex-shrink-0"><X className="w-2.5 h-2.5" /></button>}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Middle: bảng chi tiết */}
          <div
            className="flex-1 min-h-0 overflow-y-auto border bg-white policy-detail-table-wrapper"
            style={{ borderColor: '#9CA3AF', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}
            data-policy-table={policyOpen}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              const row = target.closest('tr');
              if (!row) return;
              if (row.closest('thead')) return;
              if (row.cells.length < 2) return;
              const wrapper = e.currentTarget;
              wrapper.querySelectorAll('tr.policy-row-highlighted').forEach(r => {
                if (r !== row) r.classList.remove('policy-row-highlighted');
              });
              row.classList.toggle('policy-row-highlighted');
            }}
          >
            <style dangerouslySetInnerHTML={{ __html: `
              @media (max-width: 767px) {
                .policy-detail-table-wrapper table { font-size: 9px !important; }
                .policy-detail-table-wrapper th,
                .policy-detail-table-wrapper td {
                  padding: 3px !important;
                  min-width: auto !important;
                  width: auto !important;
                  font-size: 9px !important;
                }
                .policy-detail-table-wrapper th span,
                .policy-detail-table-wrapper td span,
                .policy-detail-table-wrapper th br + span,
                .policy-detail-table-wrapper td br + span {
                  font-size: 8px !important;
                }
                .policy-detail-table-wrapper td[style*="13px"],
                .policy-detail-table-wrapper td[style*="13px"] span {
                  font-size: 10px !important;
                }
                .policy-detail-table-wrapper th.w-\\[32px\\] { width: 20px !important; min-width: 20px !important; }
              }
              .policy-detail-table-wrapper tr.policy-row-highlighted > td {
                background-color: #FEF3C7 !important;
                color: #92400E !important;
                font-weight: 700 !important;
              }
            `}} />
            {renderPolicyContent(policyOpen)}
          </div>

          {/* Footer FIXED */}
          <div className="flex-shrink-0 flex items-center justify-between px-3 text-white" style={{ height: '32px', backgroundColor: '#047857', borderTop: '2px solid #065F46' }}>
            <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-emerald-300">TỔNG:</span>
              <span id="policy-fixed-count" className="text-white">—</span>
            </span>
            <span className="text-[11px] font-bold flex items-center gap-1.5">
              <span className="text-amber-300 uppercase">Tổng thưởng:</span>
              <span id="policy-fixed-amount" className="text-amber-200 font-black">—</span>
            </span>
          </div>
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

    // NTD count: count unique maDaiLyTD that exist in DS TB/TN + DS TTN (NTD = TB+TN+TTN)
    const ntdCodes = new Set([
      ...leaders.map(l => l.agentCode),
      ...recruiters.map(r => r.agentCode),
    ].filter(Boolean));
    const activeNTD = new Set<string>();
    for (const c of sortedContracts) {
      if (c.maDaiLyTD && ntdCodes.has(c.maDaiLyTD)) activeNTD.add(c.maDaiLyTD);
    }

    return (
      <div>
        {/* Mobile: nút popup chọn tháng — thay thế month sub-tabs */}
        <div className="relative mb-3 md:hidden">
          <button
            onClick={() => setMobileRevenuePopupOpen(!mobileRevenuePopupOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold bg-[#0891B2] border border-cyan-300 text-white hover:bg-cyan-700 rounded-sm"
          >
            <span className="truncate flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />
              {revenueSub === 'all' ? 'Cả năm' : `Tháng ${revenueSub.replace('0', '')}`}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${mobileRevenuePopupOpen ? 'rotate-180' : ''}`} />
          </button>
          {mobileRevenuePopupOpen && (
            <>
              <div className="fixed inset-0 z-[400] bg-black/40" onClick={() => setMobileRevenuePopupOpen(false)} />
              <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[500] bg-[#1a2332] border border-cyan-500/50 max-h-[60vh] w-[90vw] max-w-[320px] overflow-y-auto rounded-md shadow-2xl">
                <div className="sticky top-0 bg-[#0891B2] text-white text-[11px] font-bold px-2.5 py-1.5 border-b border-cyan-500/50 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-3 h-3" /> Chọn tháng
                  </span>
                  <button onClick={() => setMobileRevenuePopupOpen(false)} className="text-white/70 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {MONTHS.map(m => {
                  const subActive = revenueSub === m.key;
                  const MIcon = m.key === 'all' ? TrendingUp : Calendar;
                  return (
                    <button
                      key={m.key}
                      onClick={() => { navigateTo({ sheet: 'revenue', revenueSub: m.key }); setSettingsNhomFilter(''); setMobileRevenuePopupOpen(false); }}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 text-[11px] font-bold text-left hover:bg-cyan-500/20 ${subActive ? 'text-cyan-300 bg-cyan-500/10' : 'text-emerald-100/80'}`}
                    >
                      <MIcon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate flex-1">{m.label}</span>
                      {subActive && <span className="text-cyan-400">●</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Month sub-tabs — desktop only */}
        <div className="hidden md:flex md:items-center md:gap-1 md:mb-3 md:flex-wrap">
          {MONTHS.map(m => (
            <button
              key={m.key}
              onClick={() => { navigateTo({ sheet: 'revenue', revenueSub: m.key }); setSettingsNhomFilter(''); }}
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
              { label: 'IP/AFYP', value: String(Math.round(ipAfypMonth)) + '%', bg: '#0891B2' },
              { label: 'Năng suất', value: String(Math.round(nangSuatMonth)), bg: '#0284C7' },
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
          {revenueSub !== 'all' && (
            <Button
              onClick={() => handleDeleteRevenueMonth(revenueSub)}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 h-7 text-xs rounded-[2px]"
              title={`Xóa toàn bộ hợp đồng của ${monthLabel}`}
            >
              <Trash2 className="w-3 h-3 mr-1" /> Xóa dữ liệu tháng
            </Button>
          )}
        </div>

        {/* ===== Mobile card view (hidden on md+) ===== */}
        <div className="md:hidden space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#059669 transparent' }}>
          {sortedContracts.length === 0 && (
            <div className="text-center text-gray-500 text-sm py-6">Chưa có dữ liệu hợp đồng tháng này</div>
          )}
          {sortedContracts.slice(0, 200).map((c, idx) => (
            <div key={c.id} className="bg-[#1a2332]/80 border border-emerald-500/20 rounded-lg p-2.5 space-y-1.5">
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
          IP + 10% PĐT: {formatKpiCurrency(tongIP)} • AFYP: {formatKpiCurrency(tongAFYP)} • Lượt HĐ: TÍNH LƯỢT ≥ 3tr ({luotHoatDong}) • Lượt chuẩn: ≥ 12tr ({luotChuan}) • IP/AFYP = {String(Math.round(ipAfypMonth))}% • Năng suất: {String(Math.round(nangSuatMonth))} • ĐLHĐ: {formatKpiCurrency(dlhdMonth)}
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
    // Only count ADs that belong to an existing Phong (avoids counting orphans
    // from test data or corrupted imports)
    const phongCodes = new Set(phongList.map(p => p.maPhong));
    const totalADCount = adList.filter(a => phongCodes.has(a.maPhong)).length;
    const totalPhong = phongList.length;
    // Detect orphan ADs (for warning display)
    const orphanADs = adList.filter(a => !phongCodes.has(a.maPhong));

    return (
      <>
      <div className="space-y-3 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-extrabold text-emerald-400 neon-text drop-shadow-[0_0_6px_rgba(0,255,136,0.3)]">Cấu trúc tổ chức</h2>
          <div className="flex items-center gap-1">
            <div className="relative group">
              <Button variant="ghost" size="sm" className="h-7 text-[10px] text-emerald-400 hover:text-emerald-300"><Upload className="w-3 h-3 mr-1" /> Import</Button>
              <div className="absolute right-0 top-full mt-1 bg-[#1a2332]/95 border border-emerald-500/30 rounded-md p-1.5 space-y-0.5 min-w-[160px] z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
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
              <div className="absolute right-0 top-full mt-1 bg-[#1a2332]/95 border border-emerald-500/30 rounded-md p-1.5 space-y-0.5 min-w-[160px] z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
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
          {orphanADs.length > 0 && (
            <span className="text-[9px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full" title={`AD không thuộc phòng nào: ${orphanADs.map(a => a.maAD).join(', ')}`}>
              ⚠ {orphanADs.length} AD không phòng
            </span>
          )}
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
          ) : [...phongList].map((p, idx) => ({ ...p, _origIdx: idx }))
            .sort((a, b) => {
              // Special phong (PA, Banca) xuống cuối, các phòng khác theo thứ tự tạo
              const pa = PHONG_SORT_PRIORITY(a.maPhong);
              const pb = PHONG_SORT_PRIORITY(b.maPhong);
              if (pa !== pb) return pa - pb;
              // Cùng priority → giữ thứ tự gốc (stable sort)
              return (a._origIdx ?? 0) - (b._origIdx ?? 0);
            })
            .map(p => {
            const pADs = adList.filter(a => a.maPhong === p.maPhong);
            const pBanNhoms = banNhomList.filter(b => pADs.some(a => a.maAD === b.maAD));
            const pTVVs = tvvStructList.filter(t => pBanNhoms.some(b => matchMaBanNhom(b.maBanNhom, t.maBanNhom)));
            return (
              <div key={p.id} className="rounded-none overflow-hidden" style={{ backgroundColor: '#1E293B', boxShadow: '0 8px 24px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3)' }}>
                {/* PHÒNG header — dark strip like Kế hoạch */}
                <div className="px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between" style={{ backgroundColor: '#0F172A', boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.2)' }}>
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
                            const bnTVVs = tvvStructList.filter(t => matchMaBanNhom(b.maBanNhom, t.maBanNhom))
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
                                    <div className="ml-3 mt-0.5 overflow-x-auto">
                                      {/* Header row — column labels */}
                                      <div className="flex items-center gap-2 px-2 py-0.5 text-[8px] font-bold uppercase text-gray-400 bg-gray-100 border-b border-gray-200 sticky top-0">
                                        <span className="w-4 text-center flex-shrink-0">#</span>
                                        <span className="min-w-[80px] flex-1">HỌ TÊN</span>
                                        <span className="w-[70px] flex-shrink-0 hidden sm:inline">MÃ TVV</span>
                                        <span className="w-[60px] flex-shrink-0 hidden sm:inline">NGÀY BĐ</span>
                                        <span className="w-[70px] flex-shrink-0 hidden md:inline">CHỨC VỤ</span>
                                        <span className="w-[70px] flex-shrink-0 hidden lg:inline">MÃ TVV TD</span>
                                        <span className="w-[28px] flex-shrink-0"></span>
                                      </div>
                                      {bnTVVs.map((t, idx) => (
                                        <div
                                          key={t.id}
                                          className="flex items-center gap-2 px-2 py-1 hover:bg-emerald-50 transition-colors border-b border-gray-100 group"
                                          style={{
                                            transitionDelay: isExpanded ? `${idx * 20}ms` : '0ms',
                                            transform: isExpanded ? 'translateY(0)' : 'translateY(-2px)',
                                            opacity: isExpanded ? 1 : 0,
                                          }}
                                        >
                                          <span className="text-gray-400 text-[10px] w-4 text-center flex-shrink-0">{idx + 1}</span>
                                          <span className="text-gray-800 text-[11px] font-bold truncate min-w-[80px] flex-1">{t.agentName}</span>
                                          <span className="text-gray-500 text-[10px] font-mono w-[70px] flex-shrink-0 truncate hidden sm:inline">{t.agentCode}</span>
                                          <span className="text-gray-500 text-[10px] w-[60px] flex-shrink-0 hidden sm:inline">{t.ngayBatDau ? safeFormatDate(t.ngayBatDau) : '—'}</span>
                                          <span className="text-emerald-700 text-[10px] font-semibold w-[70px] flex-shrink-0 truncate hidden md:inline">{t.chucVu || '—'}</span>
                                          <span className="text-violet-600 text-[10px] font-mono w-[70px] flex-shrink-0 truncate hidden lg:inline">{t.maTVVTuyendung || '—'}</span>
                                          <div className="flex items-center gap-0.5 w-[28px] flex-shrink-0 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingTvv(t); }} className="h-4 w-4 p-0 text-gray-300 hover:text-emerald-500"><Edit2 className="w-2.5 h-2.5" /></Button>
                                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteTvv(t.id); }} className="h-4 w-4 p-0 text-gray-300 hover:text-red-500"><Trash2 className="w-2.5 h-2.5" /></Button>
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
        <DialogContent className="bg-[#1a2332]/95 backdrop-blur-xl border-emerald-500/30">
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
        <DialogContent className="bg-[#1a2332]/95 backdrop-blur-xl border-emerald-500/30">
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
        <DialogContent className="bg-[#1a2332]/95 backdrop-blur-xl border-emerald-500/30">
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
        <DialogContent className="bg-[#1a2332]/95 backdrop-blur-xl border-emerald-500/30">
          <DialogHeader><DialogTitle className="text-violet-400">Thêm TVV</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div><Label className="text-xs text-emerald-200/70">Mã TVV</Label><Input value={newTvv.agentCode} onChange={e => setNewTvv(p => ({ ...p, agentCode: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" /></div>
            <div><Label className="text-xs text-emerald-200/70">Tên TVV</Label><Input value={newTvv.agentName} onChange={e => setNewTvv(p => ({ ...p, agentName: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" /></div>
            <div><Label className="text-xs text-emerald-200/70">Mã Ban/Nhóm</Label><Input value={newTvv.maBanNhom} onChange={e => setNewTvv(p => ({ ...p, maBanNhom: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" placeholder="VD: BN001" /></div>
            <div><Label className="text-xs text-emerald-200/70">Chức vụ</Label><Input value={newTvv.chucVu} onChange={e => setNewTvv(p => ({ ...p, chucVu: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" /></div>
            <div><Label className="text-xs text-emerald-200/70">Ngày bắt đầu</Label><Input type="date" value={newTvv.ngayBatDau} onChange={e => setNewTvv(p => ({ ...p, ngayBatDau: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" /></div>
            <div><Label className="text-xs text-emerald-200/70">Mã TVV tuyển dụng</Label><Input value={newTvv.maTVVTuyendung} onChange={e => setNewTvv(p => ({ ...p, maTVVTuyendung: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" placeholder="Mã TVV đã tuyển dụng mình" /></div>
            <div><Label className="text-xs text-emerald-200/70">Ghi chú</Label><Input value={newTvv.note} onChange={e => setNewTvv(p => ({ ...p, note: e.target.value }))} className="bg-white/5 border-emerald-500/20 text-white" /></div>
          </div>
          <DialogFooter><Button onClick={handleAddTvv} className="bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300">Thêm</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Phong Dialog */}
      <Dialog open={!!editingPhong} onOpenChange={(open) => { if (!open) setEditingPhong(null); }}>
        <DialogContent className="bg-[#1a2332]/95 backdrop-blur-xl border-emerald-500/30">
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
        <DialogContent className="bg-[#1a2332]/95 backdrop-blur-xl border-emerald-500/30">
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
        <DialogContent className="bg-[#1a2332]/95 backdrop-blur-xl border-emerald-500/30">
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
        <DialogContent className="bg-[#1a2332]/95 backdrop-blur-xl border-emerald-500/30">
          <DialogHeader><DialogTitle className="text-violet-400">Sửa TVV</DialogTitle></DialogHeader>
          {editingTvv && (
            <div className="space-y-2">
              <div><Label className="text-xs text-emerald-200/70">Mã TVV</Label><Input value={editingTvv.agentCode} onChange={e => setEditingTvv(t => t ? { ...t, agentCode: e.target.value } : t)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
              <div><Label className="text-xs text-emerald-200/70">Tên TVV</Label><Input value={editingTvv.agentName} onChange={e => setEditingTvv(t => t ? { ...t, agentName: e.target.value } : t)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
              <div><Label className="text-xs text-emerald-200/70">Mã Ban/Nhóm</Label><Input value={editingTvv.maBanNhom} onChange={e => setEditingTvv(t => t ? { ...t, maBanNhom: e.target.value } : t)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
              <div><Label className="text-xs text-emerald-200/70">Chức vụ</Label><Input value={editingTvv.chucVu} onChange={e => setEditingTvv(t => t ? { ...t, chucVu: e.target.value } : t)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
              <div><Label className="text-xs text-emerald-200/70">Ngày bắt đầu</Label><Input type="date" value={editingTvv.ngayBatDau ? toInputDate(editingTvv.ngayBatDau) : ''} onChange={e => setEditingTvv(t => t ? { ...t, ngayBatDau: e.target.value } : t)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
              <div><Label className="text-xs text-emerald-200/70">Mã TVV tuyển dụng</Label><Input value={editingTvv.maTVVTuyendung || ''} onChange={e => setEditingTvv(t => t ? { ...t, maTVVTuyendung: e.target.value } : t)} className="bg-white/5 border-emerald-500/20 text-white" placeholder="Mã TVV đã tuyển dụng mình" /></div>
              <div><Label className="text-xs text-emerald-200/70">Ghi chú</Label><Input value={editingTvv.note} onChange={e => setEditingTvv(t => t ? { ...t, note: e.target.value } : t)} className="bg-white/5 border-emerald-500/20 text-white" /></div>
            </div>
          )}
          <DialogFooter><Button onClick={handleEditTvv} className="bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300">Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={!!importTier} onOpenChange={(open) => { if (!open) { setImportTier(''); setImportFile(null); setImportPreview([]); setImportData(''); } }}>
        <DialogContent className="bg-[#1a2332]/95 backdrop-blur-xl border-emerald-500/30 max-w-lg">
          <DialogHeader><DialogTitle className="text-emerald-400">Import {importTier === 'phong' ? 'Phòng' : importTier === 'ad' ? 'AD' : importTier === 'bannhom' ? 'Ban/Nhóm' : 'TVV'}</DialogTitle></DialogHeader>
          <div className="space-y-1">
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
                  <p className="text-emerald-200/50 text-[10px]">{Math.round(importFile.size / 1024)} KB — Nhấn để đổi file</p>
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
                : 'agentCode\tagentName\tmaBanNhom\tchucVu\tngayBatDau\tmaTVVTuyendung\tnote\nTV001\tTrần B\tBN001\tTVV\t2024-01-01\tTV099\tGhi chú'
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
  // ========== RENDER: Sao Việt (3 sub-sections) ==========
  // Sao Việt menu expands to show 3 sub-programs (similar to Chính sách đại lý)
  // Click a sub-item → opens dedicated page for that single program
  // Click "Số liệu Sao Việt" itself → expands the sub-list (desktop) / opens popup (mobile)
  const SAOVIET_ITEMS = [
    { key: 'ca-nhan', label: 'Sao Việt Cá Nhân', desc: 'TVV — FYP cá nhân (3 hạng: Vàng/BạchKim/KimCương)', icon: UserCircle, color: '#7C3AED' },
    { key: 'tn-ktm',  label: 'Sao Việt TN KTM',  desc: 'TN — FYP cá nhân (3 hạng: Vàng/BạchKim/KimCương)', icon: Users, color: '#2563EB' },
    { key: 'tn-td',   label: 'Sao Việt TN TD',   desc: 'TN — FYP & HĐC của TVVm do TN tuyển (2 hạng: Vàng/BạchKim)', icon: UserPlus, color: '#059669' },
  ];
  // Lightsalmon (#FFA07A) là màu tiêu đề chung cho các bảng Sao Việt (theo yêu cầu)
  // Phần nền nội dung (rank cells) luôn nhạt hơn màu chữ — bg=#xxx light, fg=#xxx dark
  const SV_HEADER_BG = '#FFA07A';   // lightsalmon — màu tiêu đề bảng
  const SV_HEADER_FG = '#1E3A8A';   // navy-900 — chữ xanh dương đậm trên nền lightsalmon (theo yêu cầu user: đổi từ brown sang blue)
  const SV_HEADER_BORDER = '#FB923C'; // orange-400 — viền nhẹ

  // Helper: convert rank header bg (đậm) sang rank body bg (siêu mờ — alpha 8%)
  // Nguyên tắc: header đậm, body nhạt tối đa → contrast rõ ràng, dễ phân biệt
  // Tránh tình trạng header tier và body cell cùng 1 màu (đã xảy ra nhiều lần)
  const svRankBodyBg = (headerBg: string): string => {
    const hex = headerBg.replace('#', '');
    if (hex.length !== 6) return '#FFFFFF';
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.08)`; // 8% alpha — siêu mờ
  };


  // Period: 01/12/2025 - 30/11/2026 (Sao Việt year — fixed)
  // Section 1: SAO VIỆT CÁ NHÂN — TVV-based, 5 rank tiers (Vàng, BạchKim, BạchKim, KimCương, KimCương)
  // Section 2: SAO VIỆT TN KTM — TN-based (individual FYP), 5 rank tiers
  // Section 3: SAO VIỆT TN TD — TN-based (team TVVm FYP + HĐC count), 2 ranks (Vàng, BạchKim) with sub-cols
  const SAO_VIET_START = new Date(2025, 11, 1);  // Dec 1, 2025
  const SAO_VIET_END = new Date(2026, 10, 30);   // Nov 30, 2026

  // Filter contracts within Sao Việt period (by doanh so month = effective/issue date)
  const saoVietContracts = contracts.filter(c => {
    const d = getDoanhSoMonth(c);
    return !isNaN(d.getTime()) && d >= SAO_VIET_START && d <= SAO_VIET_END;
  });

  // ---------- Section 1: SAO VIỆT CÁ NHÂN ----------
  // Data source: tvvStructList — each TVV's personal FYP in Sao Việt period
  // Rank thresholds (cumulative, each tier gives vouchers independently):
  //   Vàng:       FYP ≥ 550tr  → 01 vé
  //   Bạch kim 1: FYP ≥ 900tr  → 01 vé
  //   Bạch kim 2: FYP ≥ 1400tr → 02 vé
  //   Kim cương 1: FYP ≥ 1600tr → 01 vé
  //   Kim cương 2: FYP ≥ 3000tr → 02 vé
  // Color spec (user 2026-06-30):
  //   Vàng      header=gold (255,215,0)  body=light yellow (255,255,224)
  //   Bạch Kim  header=dark gray (169,169,169)  body=gainsboro (220,220,220)
  //   Kim Cương header=deep sky blue (0,191,255)  body=light cyan (224,255,255)
  // fg: màu chữ header —统一 đổi thành xanh dương đậm (navy-900) cho 3 hạng (Vàng/Bạch Kim/Kim Cương)
  // theo yêu cầu user: trắng trên xám khó nhìn → đổi hết thành xanh dương cho đồng bộ
  const SV_RANK_FG = '#1E3A8A'; // navy-900 — đọc tốt trên nền vàng/xám/sky blue
  const SV1_THRESHOLDS = [
    { key: 'vang',      label: 'Hạng vàng',       sub: 'FYP ≥ 550tr\n01 vé',      min: 550_000_000,    vouchers: 1, bg: '#FFD700', fg: SV_RANK_FG, bodyBg: '#FFFFE0' },
    { key: 'bachkim1',  label: 'Hạng bạch kim',   sub: 'FYP ≥ 900tr\n01 vé',      min: 900_000_000,    vouchers: 1, bg: '#A9A9A9', fg: SV_RANK_FG, bodyBg: '#DCDCDC' },
    { key: 'bachkim2',  label: 'Hạng bạch kim',   sub: 'FYP ≥ 1400tr\n02 vé',     min: 1_400_000_000,  vouchers: 2, bg: '#A9A9A9', fg: SV_RANK_FG, bodyBg: '#DCDCDC' },
    { key: 'kimcuong1', label: 'Hạng kim cương',  sub: 'FYP ≥ 1600tr\n01 vé',     min: 1_600_000_000,  vouchers: 1, bg: '#00BFFF', fg: SV_RANK_FG, bodyBg: '#E0FFFF' },
    { key: 'kimcuong2', label: 'Hạng kim cương',  sub: 'FYP ≥ 3000tr\n02 vé',     min: 3_000_000_000,  vouchers: 2, bg: '#00BFFF', fg: SV_RANK_FG, bodyBg: '#E0FFFF' },
  ];
  const saoVietCaNhanRows = tvvStructList.map(tvv => {
    const fyp = saoVietContracts
      .filter(c => (c.agentCode || '').trim().toLowerCase() === (tvv.agentCode || '').trim().toLowerCase())
      .reduce((s, c) => s + (c.fyp || 0), 0);
    const nhomKD = resolveNhomName(tvv.agentCode, tvv.maBanNhom, banNhomList, contracts, leaders, { allowPA: true });
    return {
      agentCode: tvv.agentCode || '',
      agentName: tvv.agentName || '',
      nhomKD,
      fyp,
    };
  }).filter(r => r.fyp > 0)
    .sort((a, b) => b.fyp - a.fyp);

  // ---------- Section 2: SAO VIỆT TN KTM ----------
  // Data source: leaders (DS TB/TN) — each TN's personal FYP in Sao Việt period
  // 3 rank categories (Vàng / Bạch kim / Kim cương) — each rank has its own color
  // 5 tier entries (1 Vàng + 2 Bạch kim + 2 Kim cương):
  //   Vàng:         FYP ≥ 1,6 tỷ  → 01 vé
  //   Bạch kim 1:   FYP ≥ 3,5 tỷ  → 01 vé
  //   Bạch kim 2:   FYP ≥ 5,5 tỷ  → 02 vé
  //   Kim cương 1:  FYP ≥ 7,0 tỷ  → 01 vé
  //   Kim cương 2:  FYP ≥ 13 tỷ   → 02 vé
  const SV2_THRESHOLDS = [
    { key: 'vang',      label: 'Hạng vàng',      sub: 'FYP ≥ 1,6 tỷ\n01 vé',  min: 1_600_000_000,  vouchers: 1, bg: '#FFD700', fg: SV_RANK_FG, bodyBg: '#FFFFE0' },
    { key: 'bachkim1',  label: 'Hạng bạch kim',  sub: 'FYP ≥ 3,5 tỷ\n01 vé',  min: 3_500_000_000,  vouchers: 1, bg: '#A9A9A9', fg: SV_RANK_FG, bodyBg: '#DCDCDC' },
    { key: 'bachkim2',  label: 'Hạng bạch kim',  sub: 'FYP ≥ 5,5 tỷ\n02 vé',  min: 5_500_000_000,  vouchers: 2, bg: '#A9A9A9', fg: SV_RANK_FG, bodyBg: '#DCDCDC' },
    { key: 'kimcuong1', label: 'Hạng kim cương', sub: 'FYP ≥ 7,0 tỷ\n01 vé',  min: 7_000_000_000,  vouchers: 1, bg: '#00BFFF', fg: SV_RANK_FG, bodyBg: '#E0FFFF' },
    { key: 'kimcuong2', label: 'Hạng kim cương', sub: 'FYP ≥ 13 tỷ\n02 vé',   min: 13_000_000_000, vouchers: 2, bg: '#00BFFF', fg: SV_RANK_FG, bodyBg: '#E0FFFF' },
  ];
  const saoVietTNKTMRows = leaders
    .filter(l => isTBorTNPosition(l.position))
    .map(tn => {
      const fyp = saoVietContracts
        .filter(c => (c.agentCode || '').trim().toLowerCase() === (tn.agentCode || '').trim().toLowerCase())
        .reduce((s, c) => s + (c.fyp || 0), 0);
      return {
        agentCode: tn.agentCode || '',
        agentName: tn.agentName || '',
        nhomKD: tn.nhom || '',
        fyp,
      };
    }).filter(r => r.fyp > 0)
      .sort((a, b) => b.fyp - a.fyp);

  // ---------- Section 3: SAO VIỆT TN TD ----------
  // Data source: leaders (DS TB/TN) — each TN's team TVVm performance
  // TVVm = TVV newly recruited by this TN (tvvStructList.maTVVTuyendung == TN.agentCode)
  // Metrics:
  //   TỔNG FYP TVVm = sum of all contracts in period where contract.agentCode ∈ TVVm list
  //   SL TVVm HĐC   = count of TVVm with at least 1 contract in period having tinhLuot3tr >= 12,000,000
  // Ranks (require BOTH sub-conditions):
  //   Hạng vàng:     FYP TVVm ≥ 500 Trđ  AND  TVVm HĐC ≥ 08 TVV
  //   Hạng bạch kim: FYP TVVm ≥ 1200 Trđ AND  TVVm HĐC ≥ 12 TVV
  const SV3_RANKS = [
    {
      key: 'vang', label: 'HẠNG VÀNG', bg: '#FFD700', fg: SV_RANK_FG, bodyBg: '#FFFFE0',
      subFypLabel: 'FYP TVVm ≥ 500 Trđ',
      subHdcLabel: 'TVVm HĐC ≥ 08 TVV',
      minFyp: 500_000_000,
      minHdc: 8,
    },
    {
      key: 'bachkim', label: 'HẠNG BẠCH KIM', bg: '#A9A9A9', fg: SV_RANK_FG, bodyBg: '#DCDCDC',
      subFypLabel: 'FYP TVVm ≥ 1200 Trđ',
      subHdcLabel: 'TVVm HĐC ≥ 12 TVV',
      minFyp: 1_200_000_000,
      minHdc: 12,
    },
  ];
  const saoVietTNTDRows = leaders
    .filter(l => isTBorTNPosition(l.position))
    .map(tn => {
      const tnCode = (tn.agentCode || '').trim().toLowerCase();
      // TVVm recruited by this TN
      const tvvmList = tvvStructList.filter(t =>
        (t.maTVVTuyendung || '').trim().toLowerCase() === tnCode
      );
      const tvvmCodes = new Set(tvvmList.map(t => (t.agentCode || '').trim().toLowerCase()));
      // Contracts of these TVVm in Sao Việt period
      const tvvmContracts = saoVietContracts.filter(c =>
        tvvmCodes.has((c.agentCode || '').trim().toLowerCase())
      );
      const fypTVVm = tvvmContracts.reduce((s, c) => s + (c.fyp || 0), 0);
      // SL TVVm HĐC = unique TVVm with at least 1 contract having tinhLuot3tr >= 12,000,000
      const hdcTvvmCodes = new Set(
        tvvmContracts.filter(c => (c.tinhLuot3tr || 0) >= 12_000_000)
          .map(c => (c.agentCode || '').trim().toLowerCase())
      );
      const slTvvmHDC = hdcTvvmCodes.size;
      return {
        agentCode: tn.agentCode || '',
        agentName: tn.agentName || '',
        nhomKD: tn.nhom || '',
        fypTVVm,
        slTvvmHDC,
        tvvmCount: tvvmList.length,
      };
    }).filter(r => r.fypTVVm > 0 || r.slTvvmHDC > 0)
      .sort((a, b) => b.fypTVVm - a.fypTVVm);

  // ---------- Render helper: rank cell (sections 1 & 2) ----------
  // Nếu FYP đạt chỉ tiêu → hiển thị ✓ + số vé (xanh, đậm)
  // Nếu chưa đạt → hiển thị số tiền CÒN THIẾU để đạt hạng này (ví dụ "-30 tr" hoặc "-1.2 tỷ")
  // Nguyên tắc giống mốc tỷ lệ thưởng Quý TN: luôn hiển thị tiến độ, không để "—" trống
  const formatDeficit = (deficit: number): string => {
    // deficit ở đơn vị VND, trả về chuỗi gọn: "-30 tr" hoặc "-1.2 tỷ"
    const trieu = deficit / 1_000_000;
    if (trieu >= 1000) return `-${(trieu / 1000).toFixed(1)} tỷ`;
    return `-${Math.round(trieu)} tr`;
  };
  const renderSaoVietRankCell = (fyp: number, threshold: { min: number; vouchers: number; bg: string; fg: string; bodyBg: string }) => {
    const achieved = fyp >= threshold.min;
    if (achieved) {
      return (
        <TableCell
          className="text-xs text-center p-1 whitespace-nowrap font-bold"
          style={{ backgroundColor: threshold.bodyBg, color: '#047857' }}
        >
          <span className="inline-flex items-center gap-1 justify-center">
            <CheckBadge size={14} />
            <span className="font-black">{threshold.vouchers} vé</span>
          </span>
        </TableCell>
      );
    }
    const deficit = Math.max(0, threshold.min - fyp);
    // Số âm (deficit): in nghiêng, KHÔNG in đậm, nền light yellow/gainsboro/light cyan
    return (
      <TableCell
        className="text-xs text-center p-1 whitespace-nowrap italic font-normal"
        style={{ backgroundColor: threshold.bodyBg, color: '#1E3A8A' }}
      >
        {formatDeficit(deficit)}
      </TableCell>
    );
  };

  // ---------- Render helper: rank sub-cell (section 3 — TN TD: FYP + HĐC) ----------
  // achieved=true → ✓ (xanh), chưa đạt → hiển thị deficit ("‑30 tr" cho FYP, "‑3" cho HĐC)
  // Body cell dùng màu bodyBg cố định theo hạng (light yellow / gainsboro / light cyan)
  const renderSaoVietRankSubCell = (achieved: boolean, bodyBg: string, deficitStr?: string) => {
    if (achieved) {
      return (
        <TableCell
          className="text-xs text-center p-1"
          style={{ backgroundColor: bodyBg }}
        >
          <CheckBadge size={14} />
        </TableCell>
      );
    }
    // Số âm (deficit): in nghiêng, KHÔNG in đậm, nền light yellow/gainsboro/light cyan
    return (
      <TableCell
        className="text-xs text-center p-1 italic font-normal"
        style={{ backgroundColor: bodyBg, color: '#1E3A8A' }}
      >
        {deficitStr || '—'}
      </TableCell>
    );
  };

  const renderSaoVietList = () => (
    <div>
      {/* Top bar: title + Settings button (mở modal chứa all sync/upload + poster management) */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm sm:text-base font-extrabold text-amber-300 flex items-center gap-2">
          <Star className="w-4 h-4" /> TỔNG QUAN SAO VIỆT
        </h2>
        {isAdmin && (
          <button
            onClick={() => setSaovietSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md text-white transition-all hover:brightness-110 active:scale-95"
            style={{ backgroundColor: '#D97706', border: '1px solid #B45309', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
          >
            <Settings className="w-3.5 h-3.5" />
            Cài đặt dữ liệu
          </button>
        )}
      </div>

      {/* 3 program cards — SELECTION ONLY (poster 16:9 + name + period). Upload/delete moved to settings modal */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {SAOVIET_ITEMS.map(item => {
          const posterUrl = saovietPosters[item.key] || '';
          const IIcon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => navigateTo({ sheet: 'saoviet', saovietOpen: item.key })}
              className="group relative rounded-lg overflow-hidden border-2 shadow-lg flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl active:scale-95 active:translate-y-0"
              style={{
                borderColor: `${item.color}AA`,
                backgroundColor: '#0e1424',
              }}
            >
              {/* Decorative top glow strip for elevated feel */}
              <span
                className="absolute top-0 left-0 right-0 h-[3px] z-10 opacity-70 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"
                style={{ background: `linear-gradient(90deg, transparent, ${item.color}, transparent)` }}
              />
              {/* Top: 16:9 poster — click anywhere opens detail */}
              <div
                className="relative w-full bg-black/40 flex items-center justify-center overflow-hidden"
                style={{ aspectRatio: '16 / 9' }}
              >
                {posterUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={posterUrl}
                      alt={item.label}
                      className="w-full h-full object-cover pointer-events-none transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Subtle dark gradient at bottom for text legibility */}
                    <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                  </>
                ) : (
                  // Empty poster — placeholder icon (no upload button — manage in Settings)
                  <div className="flex flex-col items-center justify-center gap-1 px-3 py-3 text-center">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-dashed transition-transform duration-300 group-hover:scale-110"
                      style={{ borderColor: `${item.color}66`, backgroundColor: `${item.color}11` }}
                    >
                      <IIcon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    <span className="text-[10px] font-semibold" style={{ color: item.color }}>
                      {item.label}
                    </span>
                    <span className="text-[8px] text-gray-500 italic">Chưa có poster</span>
                  </div>
                )}
              </div>

              {/* Bottom: program name + period */}
              <div
                className="text-left px-2.5 py-2 border-t flex-1 flex flex-col gap-0.5 transition-colors"
                style={{ borderColor: `${item.color}33` }}
              >
                <div className="flex items-center gap-1.5">
                  <IIcon className="w-3 h-3 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" style={{ color: item.color }} />
                  <h3 className="text-[11px] font-extrabold truncate leading-tight transition-colors" style={{ color: item.color }}>
                    {item.label}
                  </h3>
                  <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0 text-gray-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white/80" />
                </div>
                <p className="text-[10px] text-gray-300 font-semibold leading-tight">
                  01/12/2025 — 30/11/2026
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ---------- Helper: panel upload riêng từng chương trình (dùng chung cho 3 sub-page) ----------
  // program: 'ca-nhan' | 'tn-ktm' | 'tn-td'
  // UI: chỉ có nút upload file + nút xóa dữ liệu (sync qua link chung ở trên)
  const renderSaovietPanel = (program: string) => {
    const isUploading = !!saovietUploading[program];
    const manualCount = (saovietManualData[program] || []).length;
    return (
      <div className="p-3 border border-orange-500/30 rounded-lg" style={{ backgroundColor: 'rgba(234, 88, 12, 0.05)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Upload className="w-3.5 h-3.5 text-orange-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-orange-300">Upload file (Excel/CSV)</h4>
          {manualCount > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded border border-orange-500/30">
              <CheckCircle2 className="w-3 h-3" /> {manualCount} dòng
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] text-orange-200/70 leading-relaxed">
            Upload file Excel/CSV riêng cho chương trình này (xóa hết &amp; up lại). Khuyến nghị dùng <strong>Đồng bộ tất cả</strong> ở trên.
          </p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            id={`saoviet-upload-${program}`}
            onChange={(e) => handleSaovietUpload(program, e)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={isUploading}
              onClick={() => document.getElementById(`saoviet-upload-${program}`)?.click()}
              className="h-7 text-[11px] w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-700 disabled:opacity-50"
            >
              {isUploading
                ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Đang upload...</>
                : <><Upload className="w-3 h-3 mr-1" /> Chọn file</>}
            </Button>
            {manualCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSaovietClear(program)}
                className="h-7 text-[11px] w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600"
              >
                <Trash2 className="w-3 h-3 mr-1" /> Xóa dữ liệu
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ---------- Helper: shell chi tiết Sao Việt (giống layout Chính sách, màu VÀNG CAM) ----------
  // program: 'ca-nhan' | 'tn-ktm' | 'tn-td'
  // Bố cục: [Top: poster + filter nhóm + search tên] / [Middle: bảng cuộn] / [Bottom: footer tổng]
  // Sync/upload settings đã được chuyển ra modal Cài đặt ở Tổng quan
  const renderSaovietDetailShell = (
    program: string,
    uniqueNhomList: string[],
    filteredCount: number,
    totalValue: number,
    countLabel: string,
    totalLabel: string,
    tableJsx: React.ReactNode,
  ) => {
    const item = SAOVIET_ITEMS.find(i => i.key === program);
    if (!item) return null;
    const posterUrl = saovietPosters[program] || '';

    // Shared compact filter row JSX
    const filterRowJsx = (
      <>
        {/* Nhóm KD dropdown */}
        <div className="relative z-[200] flex-1 min-w-0">
          <button
            onClick={(e) => {
              const dd = e.currentTarget.nextElementSibling as HTMLElement;
              if (dd) dd.classList.toggle('hidden');
            }}
            className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #92400E', color: '#374151' }}
          >
            <span className="truncate flex items-center gap-1">
              <span className="text-amber-700/70 text-[8px] uppercase tracking-wider">Nhóm</span>
              <span className="truncate">{saovietNhomFilter || 'Tất cả'}</span>
            </span>
            <ChevronDown className="w-3 h-3 flex-shrink-0" />
          </button>
          <div className="hidden absolute top-full left-0 right-0 mt-0.5 z-[300] bg-[#1a2332] border border-amber-500/40 max-h-[120px] overflow-y-auto rounded-[2px] shadow-2xl">
            <button
              onClick={(e) => { setSaovietNhomFilter(''); (e.currentTarget.closest('.relative')?.querySelector('.absolute') as HTMLElement)?.classList.add('hidden'); }}
              className={`w-full text-left px-2 py-1 text-[10px] hover:bg-amber-500/20 ${!saovietNhomFilter ? 'text-amber-300 font-bold' : 'text-amber-200/70'}`}
            >Tất cả nhóm</button>
            {uniqueNhomList.map(n => (
              <button
                key={n}
                onClick={(e) => { setSaovietNhomFilter(n); (e.currentTarget.closest('.relative')?.querySelector('.absolute') as HTMLElement)?.classList.add('hidden'); }}
                className={`w-full text-left px-2 py-1 text-[10px] hover:bg-amber-500/20 ${saovietNhomFilter === n ? 'text-amber-300 font-bold' : 'text-amber-200/70'}`}
              >{n}</button>
            ))}
          </div>
        </div>
        {/* Tên / Mã search */}
        <div className="relative z-[200] flex-1 min-w-0">
          <div className="flex items-center gap-1 px-2 py-1" style={{ backgroundColor: '#FFFFFF', border: '1px solid #92400E' }}>
            <Search className="w-3 h-3 text-amber-700 flex-shrink-0" />
            <input
              type="text"
              placeholder="Tìm tên / mã..."
              value={saovietNameFilter}
              onChange={e => setSaovietNameFilter(e.target.value)}
              className="text-[10px] bg-transparent outline-none flex-1 min-w-0 text-gray-800 placeholder:text-gray-500"
            />
            {saovietNameFilter && (
              <button onClick={() => setSaovietNameFilter('')} className="text-gray-500 hover:text-red-600 flex-shrink-0">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </>
    );

    // Shared table block
    const tableBlock = (
      <div
        className="flex-1 min-h-0 overflow-y-auto border bg-white saoviet-detail-table-wrapper"
        style={{ borderColor: '#9CA3AF', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}
        data-saoviet-table={program}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          const row = target.closest('tr');
          if (!row) return;
          if (row.closest('thead')) return;
          if (row.cells.length < 2) return;
          const wrapper = e.currentTarget;
          wrapper.querySelectorAll('tr.sv-row-highlighted').forEach(r => {
            if (r !== row) r.classList.remove('sv-row-highlighted');
          });
          row.classList.toggle('sv-row-highlighted');
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @media (max-width: 767px) {
            .saoviet-detail-table-wrapper table { font-size: 9px !important; }
            .saoviet-detail-table-wrapper th,
            .saoviet-detail-table-wrapper td {
              padding: 3px !important;
              min-width: auto !important;
              width: auto !important;
              font-size: 9px !important;
            }
            .saoviet-detail-table-wrapper th span,
            .saoviet-detail-table-wrapper td span,
            .saoviet-detail-table-wrapper th br + span,
            .saoviet-detail-table-wrapper td br + span {
              font-size: 8px !important;
            }
            .saoviet-detail-table-wrapper td[style*="13px"],
            .saoviet-detail-table-wrapper td[style*="13px"] span {
              font-size: 10px !important;
            }
            .saoviet-detail-table-wrapper th.w-\\[32px\\] { width: 20px !important; min-width: 20px !important; }
          }
          .saoviet-detail-table-wrapper tr.sv-row-highlighted > td {
            background-color: #FED7AA !important;
            color: #7C2D12 !important;
            font-weight: 700 !important;
          }
        `}} />
        {tableJsx}
      </div>
    );

    // Shared footer
    const footerBlock = (
      <div className="flex-shrink-0 flex items-center justify-between px-3 text-white" style={{ height: '32px', backgroundColor: '#D97706', borderTop: '2px solid #B45309' }}>
        <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
          <span className="text-amber-200">TỔNG:</span>
          <span className="text-white">{filteredCount}</span>
        </span>
        <span className="text-[11px] font-bold flex items-center gap-1.5">
          <span className="text-amber-200 uppercase">{totalLabel}:</span>
          <span className="text-white font-black">{formatCurrency(totalValue)}</span>
        </span>
      </div>
    );

    return (
      <div className="flex flex-col h-full gap-2">
        <div className="flex-1 min-h-0 flex flex-col relative" style={{ backgroundColor: '#0F172A', boxShadow: '0 6px 24px rgba(0,0,0,0.55), 0 0 0 1px rgba(245, 158, 11, 0.10)' }}>
          {/* ====== MOBILE LAYOUT: poster -> compact filters -> table -> footer ====== */}
          <div className="md:hidden flex flex-col flex-1 min-h-0">
            {/* Poster — full width 16:9 + program name overlay */}
            <div className="relative flex-shrink-0 w-full" style={{ aspectRatio: '16 / 9', backgroundColor: '#0F1729' }}>
              {posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={posterUrl} alt={item.label} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 text-[10px] text-center p-3 gap-1">
                  <Star className="w-8 h-8 text-amber-300/70" />
                  <span className="italic">Chưa có ảnh</span>
                  <span className="text-[8px] text-gray-500">Quản lý trong Cài đặt</span>
                </div>
              )}
              {/* Bottom gradient + program name overlay */}
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent flex items-end px-2 pb-1">
                <span className="text-white text-[10px] font-black uppercase tracking-wider truncate">{item.label}</span>
              </div>
            </div>

            {/* Compact filter row — 2 cols, mỏng, không label */}
            <div className="flex flex-shrink-0 items-center gap-1 px-1 py-1 border-b" style={{ backgroundColor: '#FED7AA', borderColor: '#D97706' }}>
              {filterRowJsx}
            </div>

            {/* Table */}
            {tableBlock}
            {/* Footer */}
            {footerBlock}
          </div>

          {/* ====== DESKTOP LAYOUT: 160px banner (poster trái + filter phải) -> table -> footer ====== */}
          <div className="hidden md:flex flex-col flex-1 min-h-0">
            <div className="flex flex-shrink-0 border mb-1.5" style={{ height: '160px', backgroundColor: '#C0C0C0', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}>
              {/* Left: poster */}
              <div className="w-1/2 overflow-hidden flex-shrink-0" style={{ backgroundColor: '#0F1729' }}>
                {posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={posterUrl} alt={item.label} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 text-[10px] text-center p-3 gap-1">
                    <Settings className="w-5 h-5 text-gray-500" />
                    <span>Chưa có ảnh</span>
                  </div>
                )}
              </div>
              {/* Right: filter nhóm + search tên TVV */}
              <div className="w-1/2 flex flex-col justify-center gap-1.5 p-2 overflow-visible relative z-[200] border-l-2" style={{ backgroundColor: '#D1D5DB', boxShadow: 'inset 2px 0 6px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.15)', borderColor: '#9CA3AF' }}>
                <div className="relative z-[200]">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-700 mb-0.5">Nhóm KD</span>
                  <button
                    onClick={(e) => {
                      const dd = e.currentTarget.nextElementSibling as HTMLElement;
                      if (dd) dd.classList.toggle('hidden');
                    }}
                    className="w-full flex items-center justify-between px-1.5 py-1 text-[9px] font-bold"
                    style={{ backgroundColor: '#F9FAFB', border: '1px solid #6B7280', color: '#374151', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                  >
                    <span className="truncate">{saovietNhomFilter || 'Tất cả nhóm'}</span>
                    <ChevronDown className="w-3 h-3 flex-shrink-0" />
                  </button>
                  <div className="hidden absolute top-full left-0 right-0 mt-0.5 z-[300] bg-[#1a2332] border border-amber-500/40 max-h-[120px] overflow-y-auto rounded-[2px] shadow-2xl">
                    <button
                      onClick={(e) => { setSaovietNhomFilter(''); (e.currentTarget.closest('.relative')?.querySelector('.absolute') as HTMLElement)?.classList.add('hidden'); }}
                      className={`w-full text-left px-2 py-0.5 text-[9px] hover:bg-amber-500/20 ${!saovietNhomFilter ? 'text-amber-300 font-bold' : 'text-amber-200/70'}`}
                    >Tất cả nhóm</button>
                    {uniqueNhomList.map(n => (
                      <button
                        key={n}
                        onClick={(e) => { setSaovietNhomFilter(n); (e.currentTarget.closest('.relative')?.querySelector('.absolute') as HTMLElement)?.classList.add('hidden'); }}
                        className={`w-full text-left px-2 py-0.5 text-[9px] hover:bg-amber-500/20 ${saovietNhomFilter === n ? 'text-amber-300 font-bold' : 'text-amber-200/70'}`}
                      >{n}</button>
                    ))}
                  </div>
                </div>
                <div className="relative z-[200]">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-700 mb-0.5">Tên / Mã</span>
                  <div className="flex items-center gap-1 px-1.5 py-1" style={{ backgroundColor: '#F9FAFB', border: '1px solid #6B7280', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                    <Search className="w-2.5 h-2.5 text-gray-600 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Tìm tên / mã..."
                      value={saovietNameFilter}
                      onChange={e => setSaovietNameFilter(e.target.value)}
                      className="text-[9px] bg-transparent outline-none flex-1 min-w-0 text-gray-800 placeholder:text-gray-500"
                    />
                    {saovietNameFilter && (
                      <button onClick={() => setSaovietNameFilter('')} className="text-gray-500 hover:text-red-600 flex-shrink-0">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            {tableBlock}
            {/* Footer */}
            {footerBlock}
          </div>
        </div>
      </div>
    );
  };

  // ---------- Sub-page: SAO VIỆT CÁ NHÂN (Section 1) ----------
  const renderSaoVietCaNhan = () => {
    // CHỈ dùng data đã upload/sync (từ DB) — KHÔNG còn fallback về data tính từ Hợp đồng
    // (theo yêu cầu: user sẽ up/sync qua link; app lưu vào DB chung để dùng kể cả khi mất kết nối Google)
    const allRows = (saovietManualData['ca-nhan'] || [])
      .map(r => ({ agentCode: r.agentCode || '', agentName: r.agentName || '', nhomKD: r.nhomKD || '', fyp: Number(r.fyp) || 0 }))
      .filter(r => r.fyp > 0)
      .sort((a, b) => b.fyp - a.fyp);
    // Apply filter nhóm + search name
    const q = saovietNameFilter.trim().toLowerCase();
    const filteredRows = allRows.filter(r => {
      if (saovietNhomFilter && r.nhomKD !== saovietNhomFilter) return false;
      if (q && !((r.agentName || '').toLowerCase().includes(q) || (r.agentCode || '').toLowerCase().includes(q))) return false;
      return true;
    });
    const totalFyp = filteredRows.reduce((s, r) => s + r.fyp, 0);
    const uniqueNhomList = Array.from(new Set(allRows.map(r => r.nhomKD).filter(Boolean))).sort();

    const tableJsx = (
      <Table>
        <TableHeader className="sticky top-0 z-10">
          <TableRow className="border-b" style={{ backgroundColor: SV_HEADER_BG, borderColor: SV_HEADER_BORDER }}>
            <TableHead className="text-[10px] font-bold uppercase text-center align-middle w-[40px]" style={{ color: SV_HEADER_FG, backgroundColor: SV_HEADER_BG }}>STT</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: SV_HEADER_FG, backgroundColor: SV_HEADER_BG }}>NHÓM KD</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: SV_HEADER_FG, backgroundColor: SV_HEADER_BG }}>MÃ SỐ ĐẠI LÝ</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: SV_HEADER_FG, backgroundColor: SV_HEADER_BG }}>HỌ TÊN TVV</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: SV_HEADER_FG, backgroundColor: SV_HEADER_BG }}>TỔNG FYP<br /><span className="italic font-normal text-[9px]">01/12/25 - 30/11/26</span></TableHead>
            {SV1_THRESHOLDS.map(t => (
              <TableHead
                key={t.key}
                className="text-[10px] font-bold uppercase text-center align-middle whitespace-nowrap p-1 sv-rank-col"
                style={{ backgroundColor: t.bg, color: t.fg, width: '115px', minWidth: '115px' }}
              >
                <div className="leading-tight">
                  <div>{t.label}</div>
                  <div className="italic font-normal text-[9px]">{t.sub.split('\n')[0]}</div>
                  <div className="italic font-normal text-[9px]">{t.sub.split('\n')[1]}</div>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5 + SV1_THRESHOLDS.length} className="text-center text-gray-400 py-10 italic text-xs bg-white">
                Chưa có dữ liệu. Vui lòng đồng bộ từ link Google Sheets hoặc upload file Excel/CSV trong mục « Cài đặt dữ liệu ».
              </TableCell>
            </TableRow>
          ) : filteredRows.map((r, i) => (
            <TableRow key={`sv1-${r.agentCode}-${i}`} className="bg-white hover:bg-amber-50 border-b border-gray-200 cursor-pointer">
              <TableCell className="text-xs text-center p-1 text-gray-600">{i + 1}</TableCell>
              <TableCell className="text-xs p-1 text-gray-800 whitespace-nowrap">{r.nhomKD || '—'}</TableCell>
              <TableCell className="text-xs p-1 text-gray-800 whitespace-nowrap font-mono">{r.agentCode}</TableCell>
              <TableCell className="text-xs p-1 text-gray-900 font-medium whitespace-nowrap">{r.agentName}</TableCell>
              <TableCell className="text-xs p-1 text-right font-bold text-amber-700 whitespace-nowrap">{formatCurrency(r.fyp)}</TableCell>
              {SV1_THRESHOLDS.map(t => (
                <React.Fragment key={`sv1-${r.agentCode}-${t.key}`}>
                  {renderSaoVietRankCell(r.fyp, t)}
                </React.Fragment>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );

    return renderSaovietDetailShell('ca-nhan', uniqueNhomList, filteredRows.length, totalFyp, 'SL TVV đạt', 'Tổng FYP', tableJsx);
  };

  // ---------- Sub-page: SAO VIỆT TN KTM (Section 2) ----------
  const renderSaoVietTNKTM = () => {
    // CHỈ dùng data đã upload/sync (từ DB) — KHÔNG còn fallback về data tính từ Hợp đồng
    const allRows = (saovietManualData['tn-ktm'] || [])
      .map(r => ({ agentCode: r.agentCode || '', agentName: r.agentName || '', nhomKD: r.nhomKD || '', fyp: Number(r.fyp) || 0 }))
      .filter(r => r.fyp > 0)
      .sort((a, b) => b.fyp - a.fyp);
    // Apply filter nhóm + search name
    const q = saovietNameFilter.trim().toLowerCase();
    const filteredRows = allRows.filter(r => {
      if (saovietNhomFilter && r.nhomKD !== saovietNhomFilter) return false;
      if (q && !((r.agentName || '').toLowerCase().includes(q) || (r.agentCode || '').toLowerCase().includes(q))) return false;
      return true;
    });
    const totalFyp = filteredRows.reduce((s, r) => s + r.fyp, 0);
    const uniqueNhomList = Array.from(new Set(allRows.map(r => r.nhomKD).filter(Boolean))).sort();

    const tableJsx = (
      <Table>
        <TableHeader className="sticky top-0 z-10">
          <TableRow className="border-b" style={{ backgroundColor: SV_HEADER_BG, borderColor: SV_HEADER_BORDER }}>
            <TableHead className="text-[10px] font-bold uppercase text-center align-middle w-[40px]" style={{ color: SV_HEADER_FG, backgroundColor: SV_HEADER_BG }}>STT</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: SV_HEADER_FG, backgroundColor: SV_HEADER_BG }}>NHÓM KD</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: SV_HEADER_FG, backgroundColor: SV_HEADER_BG }}>MS ĐẠI LÝ</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: SV_HEADER_FG, backgroundColor: SV_HEADER_BG }}>HỌ TÊN TN</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: SV_HEADER_FG, backgroundColor: SV_HEADER_BG }}>TỔNG FYP<br /><span className="italic font-normal text-[9px]">01/12/25 - 30/11/26</span></TableHead>
            {SV2_THRESHOLDS.map(t => (
              <TableHead
                key={t.key}
                className="text-[10px] font-bold uppercase text-center align-middle whitespace-nowrap p-1 sv-rank-col"
                style={{ backgroundColor: t.bg, color: t.fg, width: '115px', minWidth: '115px' }}
              >
                <div className="leading-tight">
                  <div>{t.label}</div>
                  <div className="italic font-normal text-[9px]">{t.sub.split('\n')[0]}</div>
                  <div className="italic font-normal text-[9px]">{t.sub.split('\n')[1]}</div>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5 + SV2_THRESHOLDS.length} className="text-center text-gray-400 py-10 italic text-xs bg-white">
                Chưa có dữ liệu. Vui lòng đồng bộ từ link Google Sheets hoặc upload file Excel/CSV trong mục « Cài đặt dữ liệu ».
              </TableCell>
            </TableRow>
          ) : filteredRows.map((r, i) => (
            <TableRow key={`sv2-${r.agentCode}-${i}`} className="bg-white hover:bg-amber-50 border-b border-gray-200 cursor-pointer">
              <TableCell className="text-xs text-center p-1 text-gray-600">{i + 1}</TableCell>
              <TableCell className="text-xs p-1 text-gray-800 whitespace-nowrap">{r.nhomKD || '—'}</TableCell>
              <TableCell className="text-xs p-1 text-gray-800 whitespace-nowrap font-mono">{r.agentCode}</TableCell>
              <TableCell className="text-xs p-1 text-gray-900 font-medium whitespace-nowrap">{r.agentName}</TableCell>
              <TableCell className="text-xs p-1 text-right font-bold text-amber-700 whitespace-nowrap">{formatCurrency(r.fyp)}</TableCell>
              {SV2_THRESHOLDS.map(t => (
                <React.Fragment key={`sv2-${r.agentCode}-${t.key}`}>
                  {renderSaoVietRankCell(r.fyp, t)}
                </React.Fragment>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );

    return renderSaovietDetailShell('tn-ktm', uniqueNhomList, filteredRows.length, totalFyp, 'SL TN đạt', 'Tổng FYP', tableJsx);
  };

  // ---------- Sub-page: SAO VIỆT TN TD (Section 3) ----------
  const renderSaoVietTNTD = () => {
    // CHỈ dùng data đã upload/sync (từ DB) — KHÔNG còn fallback về data tính từ Hợp đồng
    const allRows = (saovietManualData['tn-td'] || [])
      .map(r => ({
        agentCode: r.agentCode || '',
        agentName: r.agentName || '',
        nhomKD: r.nhomKD || '',
        fypTVVm: Number(r.fypTVVm) || 0,
        slTvvmHDC: Number(r.slTvvmHDC) || 0,
        tvvmCount: Number(r.tvvmCount) || 0,
      }))
      .filter(r => r.fypTVVm > 0 || r.slTvvmHDC > 0)
      .sort((a, b) => b.fypTVVm - a.fypTVVm);
    // Apply filter nhóm + search name
    const q = saovietNameFilter.trim().toLowerCase();
    const filteredRows = allRows.filter(r => {
      if (saovietNhomFilter && r.nhomKD !== saovietNhomFilter) return false;
      if (q && !((r.agentName || '').toLowerCase().includes(q) || (r.agentCode || '').toLowerCase().includes(q))) return false;
      return true;
    });
    const totalFypTVVm = filteredRows.reduce((s, r) => s + r.fypTVVm, 0);
    const uniqueNhomList = Array.from(new Set(allRows.map(r => r.nhomKD).filter(Boolean))).sort();
    // Tổng số cột = 6 cột chính + (2 cột sub × số rank) — dùng cho empty state colSpan
    const totalCols = 6 + SV3_RANKS.length * 2;

    const tableJsx = (
      <Table>
        <TableHeader className="sticky top-0 z-10">
          {/* Single-row header — gọn hơn (trước đây 2 row với rowSpan=2 gây dày) */}
          <TableRow className="border-b" style={{ backgroundColor: SV_HEADER_BG, borderColor: SV_HEADER_BORDER }}>
            <TableHead className="text-[10px] font-bold uppercase text-center align-middle w-[40px]" style={{ color: SV_HEADER_FG, backgroundColor: SV_HEADER_BG }}>STT</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap align-middle" style={{ color: SV_HEADER_FG, backgroundColor: SV_HEADER_BG }}>NHÓM KD</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap align-middle" style={{ color: SV_HEADER_FG, backgroundColor: SV_HEADER_BG }}>MS ĐẠI LÝ</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap align-middle" style={{ color: SV_HEADER_FG, backgroundColor: SV_HEADER_BG }}>HỌ TÊN TN</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: SV_HEADER_FG, backgroundColor: SV_HEADER_BG }}>
              TỔNG FYP TVVm<br /><span className="italic font-normal text-[9px]">01/12/25 - 30/11/26</span>
            </TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: SV_HEADER_FG, backgroundColor: SV_HEADER_BG }}>
              SL TVVm HĐC<br /><span className="italic font-normal text-[9px]">01/12/25 - 30/11/26</span>
            </TableHead>
            {SV3_RANKS.flatMap(rk => [
              <TableHead
                key={`${rk.key}-fyp`}
                className="text-[9px] font-bold text-center align-middle p-1 whitespace-nowrap sv-rank-subcol"
                style={{ backgroundColor: rk.bg, color: rk.fg, width: '58px', minWidth: '58px' }}
              >
                <div className="leading-tight">
                  <div className="text-[10px] font-bold uppercase">{rk.label}</div>
                  <div className="italic font-normal text-[9px]">{rk.subFypLabel}</div>
                </div>
              </TableHead>,
              <TableHead
                key={`${rk.key}-hdc`}
                className="text-[9px] font-bold text-center align-middle p-1 whitespace-nowrap sv-rank-subcol"
                style={{ backgroundColor: rk.bg, color: rk.fg, width: '58px', minWidth: '58px' }}
              >
                <div className="leading-tight">
                  <div className="text-[10px] font-bold uppercase opacity-0 select-none">{rk.label}</div>
                  <div className="italic font-normal text-[9px]">{rk.subHdcLabel}</div>
                </div>
              </TableHead>,
            ])}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={totalCols} className="text-center text-gray-400 py-10 italic text-xs bg-white">
                Chưa có dữ liệu. Vui lòng đồng bộ từ link Google Sheets hoặc upload file Excel/CSV trong mục « Cài đặt dữ liệu ».
              </TableCell>
            </TableRow>
          ) : filteredRows.map((r, i) => (
            <TableRow key={`sv3-${r.agentCode}-${i}`} className="bg-white hover:bg-amber-50 border-b border-gray-200 cursor-pointer">
              <TableCell className="text-xs text-center p-1 text-gray-600">{i + 1}</TableCell>
              <TableCell className="text-xs p-1 text-gray-800 whitespace-nowrap">{r.nhomKD || '—'}</TableCell>
              <TableCell className="text-xs p-1 text-gray-800 whitespace-nowrap font-mono">{r.agentCode}</TableCell>
              <TableCell className="text-xs p-1 text-gray-900 font-medium whitespace-nowrap">{r.agentName}</TableCell>
              <TableCell className="text-xs p-1 text-right font-bold text-amber-700 whitespace-nowrap">{formatCurrency(r.fypTVVm)}</TableCell>
              <TableCell className="text-xs p-1 text-center font-bold text-amber-700">{r.slTvvmHDC}</TableCell>
              {SV3_RANKS.flatMap(rk => {
                const fypDeficit = Math.max(0, rk.minFyp - r.fypTVVm);
                const hdcDeficit = Math.max(0, rk.minHdc - r.slTvvmHDC);
                return [
                  renderSaoVietRankSubCell(r.fypTVVm >= rk.minFyp, rk.bodyBg, formatDeficit(fypDeficit)),
                  renderSaoVietRankSubCell(r.slTvvmHDC >= rk.minHdc, rk.bodyBg, `-${hdcDeficit}`),
                ];
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );

    return renderSaovietDetailShell('tn-td', uniqueNhomList, filteredRows.length, totalFypTVVm, 'SL TN đạt', 'Tổng FYP TVVm', tableJsx);
  };

  const renderSaoViet = () => {
    if (saovietOpen === 'ca-nhan') return renderSaoVietCaNhan();
    if (saovietOpen === 'tn-ktm')  return renderSaoVietTNKTM();
    if (saovietOpen === 'tn-td')   return renderSaoVietTNTD();
    return renderSaoVietList();
  };

  // ========== RENDER: CLB SAO VIỆT (3 sub-sections — same structure as Sao Việt, BLUE/NAVY theme) ==========
  // CLB Sao Việt — xét danh hiệu theo THÁNG (mỗi tháng có 1 chỉ tiêu riêng, tự động cập nhật theo tháng hiện tại)
  // 3 chương trình con:
  //   1. CÁ NHÂN — FYP cá nhân (TVV), 3 hạng: Vàng / Bạch Kim / Kim Cương
  //   2. TN TUYỂN DỤNG — FYP TVVm + SL TVVm HĐC (TN tuyển dụng), 2 hạng: Vàng / Bạch Kim (mỗi hạng có 2 sub-cols)
  //   3. TN KTM — FYP cá nhân (TN Kinh tế Mới), 3 hạng: Vàng / Bạch Kim / Kim Cương
  // Dữ liệu chỉ tiêu lấy từ slide CTTV 2026 — tháng 6 đến tháng 12 (7 tháng).
  // "Từng tháng sẽ tự động cập nhật" — app hiển thị chỉ tiêu của THÁNG HIỆN TẠI dựa trên new Date().getMonth()+1.
  const CLBSV_ITEMS = [
    { key: 'ca-nhan',     label: 'XÉT DANH HIỆU CLB - CÁ NHÂN',     desc: 'FYP cá nhân TVV — 3 hạng: Vàng / Bạch Kim / Kim Cương',   icon: UserCircle, color: '#2563EB' },
    { key: 'tn-td',       label: 'XÉT DANH HIỆU - TN TUYỂN DỤNG',   desc: 'FYP TVVm + SL TVVm HĐC — 2 hạng: Vàng / Bạch Kim',         icon: UserPlus,   color: '#1D4ED8' },
    { key: 'tn-ktm',      label: 'XÉT DANH HIỆU CLB - TN KTM',       desc: 'FYP cá nhân TN KTM — 3 hạng: Vàng / Bạch Kim / Kim Cương', icon: Users,      color: '#1E3A8A' },
  ] as const;
  type CLBSVProgram = typeof CLBSV_ITEMS[number]['key'];

  // Header colors — blue/navy theme (distinct from saoviet's lightsalmon)
  const CLBSV_HEADER_BG = '#DBEAFE';     // blue-100 — light blue header
  const CLBSV_HEADER_FG = '#1E3A8A';     // navy-900 — dark navy text
  const CLBSV_HEADER_BORDER = '#3B82F6'; // blue-500 — border

  // ---------- CLBSV threshold tables (from slide CTTV 2026, months 6-12) ----------
  // Index 0=June, 1=July, 2=Aug, 3=Sep, 4=Oct, 5=Nov, 6=Dec
  // CÁ NHÂN — FYP lũy kế (triệu VND) — slide 1
  // Color spec (user 2026-06-30):
  //   Vàng      header=gold (255,215,0)  body=light yellow (255,255,224)
  //   Bạch Kim  header=dark gray (169,169,169)  body=gainsboro (220,220,220)
  //   Kim Cương header=deep sky blue (0,191,255)  body=light cyan (224,255,255)
  // CLBSV: cùng màu chữ xanh dương navy-900 cho 3 hạng (đồng bộ với SV Toàn Chặng)
  const CLBSV_RANK_FG = '#1E3A8A';
  const CLBSV_CA_NHAN_THRESHOLDS = {
    vang:      { label: 'HẠNG VÀNG',      sub: 'FYP >=', values: [300, 350, 400, 450, 500, 550, 600],    bg: '#FFD700', fg: CLBSV_RANK_FG, bodyBg: '#FFFFE0' },
    bachkim:   { label: 'HẠNG BẠCH KIM',  sub: 'FYP >=', values: [500, 580, 660, 740, 820, 900, 980],    bg: '#A9A9A9', fg: CLBSV_RANK_FG, bodyBg: '#DCDCDC' },
    kimcuong:  { label: 'HẠNG KIM CƯƠNG', sub: 'FYP >=', values: [825, 970, 1115, 1260, 1405, 1550, 1695], bg: '#00BFFF', fg: CLBSV_RANK_FG, bodyBg: '#E0FFFF' },
  };
  // TN TUYỂN DỤNG — FYP TVVm (triệu VND) + SL TVVm HĐC (số lượng) — slide 2
  // Mỗi hạng có 2 sub-cols: FYP TVVm + TVVm HĐC
  const CLBSV_TN_TD_THRESHOLDS = {
    vang: {
      label: 'HẠNG VÀNG',
      fypLabel: 'FYP TVVm >=',
      hdcLabel: 'TVVm HĐC >=',
      fypValues:  [250, 300, 350, 400, 450, 500, 550],
      hdcValues:  [5, 6, 7, 7, 8, 8, 9],
      bg: '#FFD700', fg: CLBSV_RANK_FG, bodyBg: '#FFFFE0',
    },
    bachkim: {
      label: 'HẠNG BẠCH KIM',
      fypLabel: 'FYP TVVm >=',
      hdcLabel: 'TVVm HĐC >=',
      fypValues:  [600, 700, 800, 900, 1000, 1100, 1200],
      hdcValues:  [7, 8, 9, 10, 11, 12, 13],
      bg: '#A9A9A9', fg: CLBSV_RANK_FG, bodyBg: '#DCDCDC',
    },
  };
  // TN KTM — FYP lũy kế (triệu VND) — slide 3
  const CLBSV_TN_KTM_THRESHOLDS = {
    vang:      { label: 'HẠNG VÀNG',      sub: 'FYP >=', values: [875, 1020, 1165, 1310, 1455, 1600, 1745],   bg: '#FFD700', fg: CLBSV_RANK_FG, bodyBg: '#FFFFE0' },
    bachkim:   { label: 'HẠNG BẠCH KIM',  sub: 'FYP >=', values: [1900, 2220, 2540, 2860, 3180, 3500, 3820],   bg: '#A9A9A9', fg: CLBSV_RANK_FG, bodyBg: '#DCDCDC' },
    kimcuong:  { label: 'HẠNG KIM CƯƠNG', sub: 'FYP >=', values: [2850, 3350, 3850, 4350, 4850, 5350, 5850],   bg: '#00BFFF', fg: CLBSV_RANK_FG, bodyBg: '#E0FFFF' },
  };

  // Lấy index tháng hiện tại (0=June ... 6=Dec). Nếu ngoài khoảng → clamping.
  // Quy ước: tháng 1-5 → June value; tháng 13+ → Dec value.
  const clbsvCurrentMonthIdx = (() => {
    const m = new Date().getMonth() + 1; // 1-12
    if (m <= 6) return 0;  // Jan-Jun → June threshold (clamping early months)
    if (m >= 12) return 6; // Dec → Dec threshold
    return m - 6;          // Jul=1, Aug=2, ..., Nov=5
  })();
  const CLBSV_MONTH_LABELS = ['Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  const clbsvCurrentMonthLabel = CLBSV_MONTH_LABELS[clbsvCurrentMonthIdx];

  // ========== CLB SAO VIỆT: Lookup maps từ các section Sao Việt Toàn Chặng ==========
  // User yêu cầu (2026-07-01):
  //   • CÁ NHÂN: FYP Tháng = tổng IP tháng HIỆN TẠI từ contracts (auto-switch month).
  //              FYP Lũy Kế = lookup từ saovietManualData['ca-nhan'] theo agentCode (cùng nguồn SV TOÀN CHẶNG).
  //              Điều kiện cần: FYP Tháng >= 12 triệu mới được xét hạng.
  //                - Nếu FYP Tháng < 12tr và FYP Lũy Kế >= threshold → "thiếu IP tháng" in nghiêng, chữ đỏ.
  //                - Nếu FYP Tháng < 12tr và FYP Lũy Kế < threshold → vẫn hiện deficit (chưa đạt hạng).
  //   • TN TUYỂN DỤNG: FYP TVVm + SL TVVm HĐC = lookup từ saovietManualData['tn-td'] theo agentCode.
  //   • TN KTM: FYP Lũy Kế = lookup từ saovietManualData['tn-ktm'] theo agentCode.
  const CLBSV_FYP_THANG_MIN = 12_000_000; // 12 triệu — điều kiện cần để được xét hạng

  // Map agentCode (lowercase) → fyp lũy kế từ SV CÁ NHÂN (saovietManualData — cùng nguồn với SV TOÀN CHẶNG)
  // QUAN TRỌNG: phải dùng saovietManualData (data đã upload/sync) — KHÔNG dùng saoVietCaNhanRows
  // (tính từ contracts) vì 2 nguồn này khác nhau → CLB và SV TOÀN CHẶNG sẽ lệch số.
  const svCaNhanFypMap = new Map<string, number>();
  (saovietManualData['ca-nhan'] || []).forEach((r: any) => {
    const ac = (r.agentCode || '').trim().toLowerCase();
    if (ac) svCaNhanFypMap.set(ac, Number(r.fyp) || 0);
  });

  // Map agentCode (lowercase) → fyp lũy kế từ SV TN KTM (saovietManualData)
  const svTNKTMFypMap = new Map<string, number>();
  (saovietManualData['tn-ktm'] || []).forEach((r: any) => {
    const ac = (r.agentCode || '').trim().toLowerCase();
    if (ac) svTNKTMFypMap.set(ac, Number(r.fyp) || 0);
  });

  // Map agentCode (lowercase) → { fypTVVm, slTvvmHDC } từ SV TN TD (saovietManualData)
  const svTNTDMap = new Map<string, { fypTVVm: number; slTvvmHDC: number }>();
  (saovietManualData['tn-td'] || []).forEach((r: any) => {
    const ac = (r.agentCode || '').trim().toLowerCase();
    if (ac) svTNTDMap.set(ac, {
      fypTVVm: Number(r.fypTVVm) || 0,
      slTvvmHDC: Number(r.slTvvmHDC) || 0,
    });
  });

  // Contracts trong THÁNG HIỆN TẠI (dùng getDoanhSoMonth — issueDate, fallback effectiveDate)
  const clbsvNow = new Date();
  const clbsvCurMonth = clbsvNow.getMonth();       // 0-11
  const clbsvCurYear = clbsvNow.getFullYear();
  const clbsvCurrentMonthContracts = contracts.filter(c => {
    const d = getDoanhSoMonth(c);
    return !isNaN(d.getTime()) && d.getMonth() === clbsvCurMonth && d.getFullYear() === clbsvCurYear;
  });

  // Helper: FYP tháng hiện tại của 1 agentCode (từ contracts tháng hiện tại)
  const getClbsvFypThang = (agentCode: string): number => {
    const ac = (agentCode || '').trim().toLowerCase();
    if (!ac) return 0;
    return clbsvCurrentMonthContracts
      .filter(c => (c.agentCode || '').trim().toLowerCase() === ac)
      .reduce((s, c) => s + (c.fyp || 0), 0);
  };

  // Helper: FYP lũy kế từ SV Cá Nhân (cho CLB CÁ NHÂN)
  const getClbsvFypLuyKeCaNhan = (agentCode: string): number => {
    const ac = (agentCode || '').trim().toLowerCase();
    return svCaNhanFypMap.get(ac) || 0;
  };

  // Helper: FYP lũy kế từ SV TN KTM (cho CLB TN KTM)
  const getClbsvFypLuyKeTNKTM = (agentCode: string): number => {
    const ac = (agentCode || '').trim().toLowerCase();
    return svTNKTMFypMap.get(ac) || 0;
  };

  // Helper: data lũy kế từ SV TN TD (cho CLB TN TUYỂN DỤNG)
  const getClbsvTNTDData = (agentCode: string): { fypTVVm: number; slTvvmHDC: number } => {
    const ac = (agentCode || '').trim().toLowerCase();
    return svTNTDMap.get(ac) || { fypTVVm: 0, slTvvmHDC: 0 };
  };

  // Helper: kiểm tra điều kiện cần (FYP tháng >= 12tr)
  const isClbsvEligibleForRank = (agentCode: string): boolean => {
    return getClbsvFypThang(agentCode) >= CLBSV_FYP_THANG_MIN;
  };

  // Helper: format FYP cell (triệu VND) — gọn, dễ đọc
  const formatFypShort = (vnd: number): string => {
    if (!vnd) return '0';
    const trieu = vnd / 1_000_000;
    if (trieu >= 1000) return `${(trieu / 1000).toFixed(2)} tỷ`;
    return `${trieu.toFixed(1)} tr`;
  };

  // Helper: convert rank header bg (đậm) sang rank body bg (siêu mờ — alpha 8%)
  // Nguyên tắc: header đậm, body nhạt tối đa → contrast rõ ràng, dễ phân biệt
  const clbsvRankBodyBg = (headerBg: string): string => {
    // Strip leading # và parse RGB
    const hex = headerBg.replace('#', '');
    if (hex.length !== 6) return '#FFFFFF';
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.08)`; // 8% alpha — siêu mờ
  };


  // ---------- Helper: shell chi tiết CLB Sao Việt (giống renderSaovietDetailShell, BLUE/NAVY theme) ----------
  // Layout (mobile-first):
  //   - Mobile: poster (full width 16:9) -> compact filter row (2 cols) -> table (scroll) -> fixed bottom footer
  //   - Desktop: title bar -> 2-col filter bar -> table -> footer
  const renderClbsvDetailShell = (
    program: string,
    uniqueNhomList: string[],
    filteredCount: number,
    totalValue: number,
    countLabel: string,
    totalLabel: string,
    tableJsx: React.ReactNode,
  ) => {
    const item = CLBSV_ITEMS.find(i => i.key === program);
    if (!item) return null;
    const posterUrl = clbsvPosters[program] || '';
    const isUploading = !!clbsvPosterUploading[program];

    // Shared compact filter row JSX (mobile + desktop use same filters, different container styling)
    const filterRowJsx = (
      <>
        {/* Nhóm KD dropdown */}
        <div className="relative z-[200] flex-1 min-w-0">
          <button
            onClick={(e) => {
              const dd = e.currentTarget.nextElementSibling as HTMLElement;
              if (dd) dd.classList.toggle('hidden');
            }}
            className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #1E3A8A', color: '#1E3A8A' }}
          >
            <span className="truncate flex items-center gap-1">
              <span className="text-blue-700/70 text-[8px] uppercase tracking-wider">Nhóm</span>
              <span className="truncate">{clbsvNhomFilter || 'Tất cả'}</span>
            </span>
            <ChevronDown className="w-3 h-3 flex-shrink-0" />
          </button>
          <div className="hidden absolute top-full left-0 right-0 mt-0.5 z-[300] bg-white border border-blue-400 max-h-[140px] overflow-y-auto rounded shadow-2xl">
            <button
              onClick={(e) => { setClbsvNhomFilter(''); (e.currentTarget.closest('.relative')?.querySelector('.absolute') as HTMLElement)?.classList.add('hidden'); }}
              className={`w-full text-left px-2 py-1 text-[10px] hover:bg-blue-100 ${!clbsvNhomFilter ? 'text-blue-700 font-bold' : 'text-gray-700'}`}
            >Tất cả nhóm</button>
            {uniqueNhomList.map(n => (
              <button
                key={n}
                onClick={(e) => { setClbsvNhomFilter(n); (e.currentTarget.closest('.relative')?.querySelector('.absolute') as HTMLElement)?.classList.add('hidden'); }}
                className={`w-full text-left px-2 py-1 text-[10px] hover:bg-blue-100 ${clbsvNhomFilter === n ? 'text-blue-700 font-bold' : 'text-gray-700'}`}
              >{n}</button>
            ))}
          </div>
        </div>
        {/* Tên / Mã search */}
        <div className="relative z-[200] flex-1 min-w-0">
          <div className="flex items-center gap-1 px-2 py-1" style={{ backgroundColor: '#FFFFFF', border: '1px solid #1E3A8A' }}>
            <Search className="w-3 h-3 text-blue-700 flex-shrink-0" />
            <input
              type="text"
              placeholder="Tìm tên / mã..."
              value={clbsvNameFilter}
              onChange={e => setClbsvNameFilter(e.target.value)}
              className="text-[10px] bg-transparent outline-none flex-1 min-w-0 text-gray-800 placeholder:text-gray-400"
            />
            {clbsvNameFilter && (
              <button onClick={() => setClbsvNameFilter('')} className="text-gray-500 hover:text-red-600 flex-shrink-0">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </>
    );

    // Shared table block (mobile + desktop)
    const tableBlock = (
      <div
        className="flex-1 min-h-0 overflow-x-auto overflow-y-auto border bg-white clbsv-detail-table-wrapper"
        style={{ borderColor: '#3B82F6' }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @media (max-width: 767px) {
            .clbsv-detail-table-wrapper table { font-size: 9px !important; }
            .clbsv-detail-table-wrapper th,
            .clbsv-detail-table-wrapper td {
              padding: 3px !important;
              font-size: 9px !important;
            }
          }
          .clbsv-detail-table-wrapper tr.clbsv-row-highlighted > td {
            background-color: #DBEAFE !important;
            color: #1E3A8A !important;
            font-weight: 700 !important;
          }
        `}} />
        {tableJsx}
      </div>
    );

    // Shared footer
    const footerBlock = (
      <div className="flex-shrink-0 flex items-center justify-between px-3 text-white" style={{ height: '32px', backgroundColor: '#1E3A8A', borderTop: '2px solid #1E40AF' }}>
        <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
          <span className="text-amber-300">TỔNG:</span>
          <span className="text-white">{filteredCount}</span>
        </span>
        <span className="text-[11px] font-bold flex items-center gap-1.5">
          <span className="text-amber-300 uppercase">{totalLabel}:</span>
          <span className="text-white font-black">{formatCurrency(totalValue)}</span>
        </span>
      </div>
    );

    return (
      <div className="flex flex-col h-full gap-2">
        <div className="flex-1 min-h-0 flex flex-col relative" style={{ backgroundColor: '#0F172A', boxShadow: '0 6px 24px rgba(0,0,0,0.55), 0 0 0 1px rgba(30, 58, 138, 0.18)' }}>
          {/* ====== MOBILE LAYOUT: poster -> compact filters -> table -> footer ====== */}
          <div className="md:hidden flex flex-col flex-1 min-h-0">
            {/* Poster — full width 16:9, chỉ hiển thị (quản lý trong Cài đặt) */}
            <div className="relative flex-shrink-0 w-full" style={{ aspectRatio: '16 / 9', backgroundColor: '#0F1729' }}>
              {posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={posterUrl} alt={item.label} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 text-[10px] text-center p-3 gap-1">
                  <Award className="w-8 h-8 text-amber-300/70" />
                  <span className="italic">Chưa có poster</span>
                  <span className="text-[8px] text-white/40">Quản lý trong Cài đặt</span>
                </div>
              )}
              {/* Bottom gradient + program name overlay */}
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent flex items-end px-2 pb-1">
                <span className="text-white text-[10px] font-black uppercase tracking-wider truncate">{item.label}</span>
              </div>
            </div>

            {/* Compact filter row — 2 cols, mỏng, không label */}
            <div className="flex flex-shrink-0 items-center gap-1 px-1 py-1 border-b" style={{ backgroundColor: '#BFDBFE', borderColor: '#1E40AF' }}>
              {filterRowJsx}
            </div>

            {/* Table */}
            {tableBlock}
            {/* Footer */}
            {footerBlock}
          </div>

          {/* ====== DESKTOP LAYOUT: title bar -> 2-col filter bar -> table -> footer ====== */}
          <div className="hidden md:flex flex-col flex-1 min-h-0">
            {/* Top bar: title + "Chỉ tiêu tháng hiện tại" badge */}
            <div className="flex flex-shrink-0 items-center justify-between px-3 py-2 border-b-2" style={{ backgroundColor: '#1E3A8A', borderColor: '#1E40AF' }}>
              <div className="flex items-center gap-2 text-white">
                <Award className="w-4 h-4 flex-shrink-0" />
                <h2 className="text-sm font-extrabold uppercase tracking-wider truncate">{item.label}</h2>
              </div>
              <div className="flex items-center gap-2 text-white text-[11px]">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-bold">Chỉ tiêu tháng hiện tại</span>
              </div>
            </div>

            {/* Filter bar: nhóm + tên (BLUE theme) */}
            <div className="flex flex-shrink-0 items-center gap-2 px-2 py-1.5 border-b" style={{ backgroundColor: '#BFDBFE', borderColor: '#1E40AF' }}>
              {filterRowJsx}
            </div>

            {/* Table */}
            {tableBlock}
            {/* Footer */}
            {footerBlock}
          </div>
        </div>
      </div>
    );
  };

  // ---------- Sub-page: CLB SAO VIỆT CÁ NHÂN ----------
  // Đối tượng: TẤT CẢ thành viên trong DS Thành viên CLB (clbMembers)
  // FYP tháng + FYP lũy kế + rank cells: để trống (—) — user sẽ hướng dẫn tính sau
  // Rank cells hiển thị DEFICIT so với threshold tháng hiện tại (giống SV Toàn Chặng)
  const renderCLBSVCaNhan = () => {
    const ranks = [
      CLBSV_CA_NHAN_THRESHOLDS.vang,
      CLBSV_CA_NHAN_THRESHOLDS.bachkim,
      CLBSV_CA_NHAN_THRESHOLDS.kimcuong,
    ];
    // Source: tất cả thành viên CLB
    const sourceMembers = clbMembers;
    const uniqueNhomList = Array.from(new Set(sourceMembers.map(m => m.nhom).filter(Boolean))).sort();
    // Apply user filters (nhóm + tên/mã)
    const filteredMembers = sourceMembers.filter(m => {
      if (clbsvNhomFilter && m.nhom !== clbsvNhomFilter) return false;
      if (clbsvNameFilter) {
        const q = clbsvNameFilter.toLowerCase().trim();
        if (!String(m.agentCode || '').toLowerCase().includes(q) &&
            !String(m.agentName || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
    // Sắp xếp theo Tổng FYP Lũy Kế từ CAO xuống THẤP (theo yêu cầu user)
    const sortedMembers = [...filteredMembers].sort((a, b) =>
      getClbsvFypLuyKeCaNhan(b.agentCode) - getClbsvFypLuyKeCaNhan(a.agentCode)
    );
    // Cols: STT + NHÓM + MÃ SỐ + HỌ TÊN TVV + FYP THÁNG + FYP LŨY KẾ + 3 rank = 7 + 3 = 10
    const totalCols = 7 + ranks.length;
    // Note: FYP THÁNG và FYP LŨY KẾ chưa có data → hiển thị "—"
    // Rank cells: hiển thị deficit so với threshold tháng hiện tại (FYP=0 → deficit = full threshold)

    const tableJsx = (
      <Table>
        <TableHeader className="sticky top-0 z-10">
          <TableRow className="border-b" style={{ backgroundColor: CLBSV_HEADER_BG, borderColor: CLBSV_HEADER_BORDER }}>
            <TableHead className="text-[10px] font-bold uppercase text-center align-middle w-[40px]" style={{ color: CLBSV_HEADER_FG, backgroundColor: CLBSV_HEADER_BG }}>STT</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: CLBSV_HEADER_FG, backgroundColor: CLBSV_HEADER_BG }}>NHÓM</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: CLBSV_HEADER_FG, backgroundColor: CLBSV_HEADER_BG }}>MÃ SỐ</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: CLBSV_HEADER_FG, backgroundColor: CLBSV_HEADER_BG }}>HỌ TÊN TVV</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: CLBSV_HEADER_FG, backgroundColor: CLBSV_HEADER_BG }}>
              TỔNG FYP THÁNG<br /><span className="italic font-normal text-[9px]">{clbsvCurrentMonthLabel}</span>
            </TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: CLBSV_HEADER_FG, backgroundColor: CLBSV_HEADER_BG }}>
              TỔNG FYP LŨY KẾ<br /><span className="italic font-normal text-[9px]">01/12/25 - nay</span>
            </TableHead>
            {ranks.map(rk => (
              <TableHead
                key={rk.label}
                className="text-[10px] font-bold uppercase text-center align-middle whitespace-nowrap p-1 clbsv-rank-col"
                style={{ backgroundColor: rk.bg, color: rk.fg, width: '115px', minWidth: '115px' }}
              >
                <div className="leading-tight">
                  <div className="font-black">{rk.label}</div>
                  <div className="italic font-bold text-[10px] mt-0.5">
                    {rk.sub} {rk.values[clbsvCurrentMonthIdx]} trđ
                  </div>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMembers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={totalCols} className="text-center text-gray-400 py-12 italic text-xs bg-white">
                Chưa có đối tượng. Vui lòng thêm thành viên vào DS Thành viên CLB (Cấu trúc → DS Thành viên CLB).
              </TableCell>
            </TableRow>
          ) : sortedMembers.map((m, idx) => {
            // FYP Tháng = tổng IP tháng hiện tại từ contracts (auto-switch tháng)
            // FYP Lũy Kế = lookup từ saovietManualData['ca-nhan'] theo agentCode
            const fypThang = getClbsvFypThang(m.agentCode);
            const fypLuyKe = getClbsvFypLuyKeCaNhan(m.agentCode);
            const eligible = isClbsvEligibleForRank(m.agentCode); // FYP Tháng >= 12tr
            return (
              <TableRow key={m.id} className="bg-white hover:bg-blue-50 border-b border-gray-200">
                <TableCell className="text-[10px] text-gray-500 text-center align-middle">{idx + 1}</TableCell>
                <TableCell className="text-[10px] text-gray-700 align-middle whitespace-nowrap">{m.nhom || '—'}</TableCell>
                <TableCell className="text-[10px] text-gray-700 align-middle whitespace-nowrap font-mono">{m.agentCode || '—'}</TableCell>
                <TableCell className="text-[10px] text-gray-900 font-bold align-middle whitespace-nowrap">{m.agentName || '—'}</TableCell>
                <TableCell className="text-[10px] text-center align-middle whitespace-nowrap" style={{ color: eligible ? '#047857' : '#DC2626', fontWeight: 700 }}>
                  {formatFypShort(fypThang)}
                </TableCell>
                <TableCell className="text-[10px] text-center align-middle whitespace-nowrap font-bold text-gray-900">
                  {formatCurrency(fypLuyKe)}
                </TableCell>
                {ranks.map(rk => {
                  const thresholdVal = rk.values[clbsvCurrentMonthIdx] * 1_000_000; // trđ → VND
                  const wouldAchieve = fypLuyKe >= thresholdVal;
                  // Điều kiện cần: FYP Tháng >= 12tr mới được xét hạng
                  // - Nếu chưa đủ 12tr → "thiếu IP tháng" (in nghiêng, chữ đỏ)
                  // - Nếu đủ 12tr + đạt threshold → ✓
                  // - Nếu đủ 12tr + chưa đạt → deficit
                  if (!eligible) {
                    return (
                      <TableCell key={rk.label} className="text-[10px] text-center italic align-middle" style={{ backgroundColor: rk.bodyBg, color: '#DC2626', fontWeight: 600 }}>
                        thiếu IP tháng
                      </TableCell>
                    );
                  }
                  if (wouldAchieve) {
                    return (
                      <TableCell key={rk.label} className="text-[10px] text-center align-middle" style={{ backgroundColor: rk.bodyBg }}>
                        <CheckBadge size={13} />
                      </TableCell>
                    );
                  }
                  const deficit = Math.max(0, thresholdVal - fypLuyKe);
                  // Số âm (deficit): in nghiêng, KHÔNG in đậm, nền light yellow/gainsboro/light cyan
                  return (
                    <TableCell key={rk.label} className="text-[10px] text-center italic font-normal align-middle" style={{ backgroundColor: rk.bodyBg, color: '#1E3A8A' }}>{formatDeficit(deficit)}</TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );

    const totalFypLuyKe = filteredMembers.reduce((s, m) => s + getClbsvFypLuyKeCaNhan(m.agentCode), 0);
    return renderClbsvDetailShell('ca-nhan', uniqueNhomList, filteredMembers.length, totalFypLuyKe, 'SL TVV đạt', 'Tổng FYP LK', tableJsx);
  };

  // ---------- Sub-page: CLB SAO VIỆT TN TUYỂN DỤNG ----------
  // Đối tượng: thành viên CLB có chức vụ TB (Trưởng ban) hoặc TN (Trưởng nhóm)
  // Header 2 tầng: tầng trên gộp ô 2 cột "HẠNG VÀNG" / "HẠNG BẠCH KIM"
  //                tầng dưới là 2 cột con: FYP TVVm + TVVm HĐC
  // Below each tier label: hiển thị chỉ tiêu tháng hiện tại ("FYP TVVm >= X trđ" / "TVVm HĐC >= Y")
  // Rank cells hiển thị DEFICIT khi chưa đạt, ✓ khi đạt
  const renderCLBSVTNTuyenDung = () => {
    const ranks = [CLBSV_TN_TD_THRESHOLDS.vang, CLBSV_TN_TD_THRESHOLDS.bachkim];
    // Source: chỉ TB / TN
    const sourceMembers = clbMembers.filter(m => isCLBMemberTBorTN(m.chucVu));
    const uniqueNhomList = Array.from(new Set(sourceMembers.map(m => m.nhom).filter(Boolean))).sort();
    // Apply user filters
    const filteredMembers = sourceMembers.filter(m => {
      if (clbsvNhomFilter && m.nhom !== clbsvNhomFilter) return false;
      if (clbsvNameFilter) {
        const q = clbsvNameFilter.toLowerCase().trim();
        if (!String(m.agentCode || '').toLowerCase().includes(q) &&
            !String(m.agentName || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
    // Sắp xếp theo Tổng FYP TVVm Lũy Kế từ CAO xuống THẤP (theo yêu cầu user)
    const sortedMembers = [...filteredMembers].sort((a, b) =>
      getClbsvTNTDData(b.agentCode).fypTVVm - getClbsvTNTDData(a.agentCode).fypTVVm
    );
    // Cols: STT + NHÓM + MÃ SỐ + HỌ TÊN TVV + FYP TVVm LŨY KẾ + SL TVVm HĐC LŨY KẾ + (2 sub × 2 ranks) = 6 + 4 = 10
    // (Đã bỏ FYP TVVm THÁNG + SL TVVm HĐC THÁNG theo yêu cầu user)
    const totalCols = 6 + ranks.length * 2;

    const tableJsx = (
      <Table>
        <TableHeader className="sticky top-0 z-10">
          {/* Row 1: STT | NHÓM | MÃ SỐ | HỌ TÊN TVV | FYP TVVm LK | SL TVVm HĐC LK | HẠNG VÀNG (colSpan=2) | HẠNG BẠCH KIM (colSpan=2)
              Tier-1 header ép mỏng tối đa (py-0, text-[8px], gộp 3 dòng → 2 dòng) theo yêu cầu user */}
          <TableRow className="border-b" style={{ backgroundColor: CLBSV_HEADER_BG, borderColor: CLBSV_HEADER_BORDER }}>
            <TableHead rowSpan={2} className="text-[10px] font-bold uppercase text-center align-middle w-[40px] py-0" style={{ color: CLBSV_HEADER_FG, backgroundColor: CLBSV_HEADER_BG }}>STT</TableHead>
            <TableHead rowSpan={2} className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle py-0" style={{ color: CLBSV_HEADER_FG, backgroundColor: CLBSV_HEADER_BG }}>NHÓM</TableHead>
            <TableHead rowSpan={2} className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle py-0" style={{ color: CLBSV_HEADER_FG, backgroundColor: CLBSV_HEADER_BG }}>MÃ SỐ</TableHead>
            <TableHead rowSpan={2} className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle py-0" style={{ color: CLBSV_HEADER_FG, backgroundColor: CLBSV_HEADER_BG }}>HỌ TÊN TVV</TableHead>
            <TableHead rowSpan={2} className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle py-0" style={{ color: CLBSV_HEADER_FG, backgroundColor: CLBSV_HEADER_BG }}>
              <div className="leading-[1.1]">
                <div>FYP TVVm LK</div>
                <div className="italic font-normal text-[8px] opacity-80">01/12/25 - nay</div>
              </div>
            </TableHead>
            <TableHead rowSpan={2} className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle py-0" style={{ color: CLBSV_HEADER_FG, backgroundColor: CLBSV_HEADER_BG }}>
              <div className="leading-[1.1]">
                <div>SL TVVm HĐC LK</div>
                <div className="italic font-normal text-[8px] opacity-80">01/12/25 - nay</div>
              </div>
            </TableHead>
            {ranks.map(rk => (
              <TableHead
                key={rk.label}
                colSpan={2}
                className="text-[8px] font-black uppercase text-center align-middle whitespace-nowrap py-0 px-1 border-l-2 border-white clbsv-rank-colspan leading-[1]"
                style={{ backgroundColor: rk.bg, color: rk.fg }}
              >
                <div className="font-black text-[8px] leading-[1]">{rk.label}</div>
              </TableHead>
            ))}
          </TableRow>
          {/* Row 2: sub-cols FYP TVVm + TVVm HĐC for each rank — hiển thị chỉ tiêu tháng hiện tại
              Cả tier-1 và tier-2 đều dùng rk.bg (gold/dark gray/deep sky blue) — cùng màu tiêu đề cột */}
          <TableRow className="border-b" style={{ backgroundColor: CLBSV_HEADER_BG, borderColor: CLBSV_HEADER_BORDER }}>
            {ranks.flatMap(rk => [
              <TableHead
                key={`${rk.label}-fyp`}
                className="text-[9px] font-bold text-center align-middle py-0 px-1 whitespace-nowrap clbsv-rank-subcol"
                style={{ backgroundColor: rk.bg, color: rk.fg, width: '58px', minWidth: '58px' }}
              >
                <div className="leading-tight">
                  <div className="italic font-bold text-[9px]">{rk.fypLabel}</div>
                  <div className="font-black text-[10px]">{rk.fypValues[clbsvCurrentMonthIdx]} trđ</div>
                </div>
              </TableHead>,
              <TableHead
                key={`${rk.label}-hdc`}
                className="text-[9px] font-bold text-center align-middle py-0 px-1 whitespace-nowrap clbsv-rank-subcol"
                style={{ backgroundColor: rk.bg, color: rk.fg, width: '58px', minWidth: '58px' }}
              >
                <div className="leading-tight">
                  <div className="italic font-bold text-[9px]">{rk.hdcLabel}</div>
                  <div className="font-black text-[10px]">{rk.hdcValues[clbsvCurrentMonthIdx]} TVV</div>
                </div>
              </TableHead>,
            ])}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMembers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={totalCols} className="text-center text-gray-400 py-12 italic text-xs bg-white">
                Chưa có đối tượng. Cần thêm thành viên có chức vụ TB (Trưởng ban) hoặc TN (Trưởng nhóm) vào DS Thành viên CLB.
              </TableCell>
            </TableRow>
          ) : sortedMembers.map((m, idx) => {
            // Ánh xạ từ saovietManualData['tn-td'] (Sao Việt TN Tuyển Dụng) theo agentCode
            // Lưu ý: TN TUYỂN DỤNG KHÔNG áp điều kiện FYP tháng >= 12tr (chỉ CÁ NHÂN mới có)
            const tntdData = getClbsvTNTDData(m.agentCode);
            const fypTvvmLuyKe = tntdData.fypTVVm;
            const slHdcLuyKe = tntdData.slTvvmHDC;
            return (
              <TableRow key={m.id} className="bg-white hover:bg-blue-50 border-b border-gray-200">
                <TableCell className="text-[10px] text-gray-500 text-center align-middle">{idx + 1}</TableCell>
                <TableCell className="text-[10px] text-gray-700 align-middle whitespace-nowrap">{m.nhom || '—'}</TableCell>
                <TableCell className="text-[10px] text-gray-700 align-middle whitespace-nowrap font-mono">{m.agentCode || '—'}</TableCell>
                <TableCell className="text-[10px] text-gray-900 font-bold align-middle whitespace-nowrap">
                  {m.agentName || '—'}
                </TableCell>
                <TableCell className="text-[10px] text-center align-middle whitespace-nowrap font-bold text-gray-900">
                  {formatCurrency(fypTvvmLuyKe)}
                </TableCell>
                <TableCell className="text-[10px] text-center align-middle whitespace-nowrap font-bold text-gray-900">
                  {slHdcLuyKe}
                </TableCell>
                {ranks.flatMap(rk => {
                  const fypThreshold = rk.fypValues[clbsvCurrentMonthIdx] * 1_000_000;
                  const hdcThreshold = rk.hdcValues[clbsvCurrentMonthIdx];
                  const fypAchieved = fypTvvmLuyKe >= fypThreshold;
                  const hdcAchieved = slHdcLuyKe >= hdcThreshold;
                  const fypDeficit = Math.max(0, fypThreshold - fypTvvmLuyKe);
                  const hdcDeficit = Math.max(0, hdcThreshold - slHdcLuyKe);
                  return [
                    <TableCell key={`${rk.label}-fyp-${m.id}`} className="text-[10px] text-center align-middle" style={{ backgroundColor: rk.bodyBg, color: fypAchieved ? '#047857' : '#1E3A8A' }}>
                      {fypAchieved ? <CheckBadge size={13} /> : <span className="italic font-normal">{formatDeficit(fypDeficit)}</span>}
                    </TableCell>,
                    <TableCell key={`${rk.label}-hdc-${m.id}`} className="text-[10px] text-center align-middle" style={{ backgroundColor: rk.bodyBg, color: hdcAchieved ? '#047857' : '#1E3A8A' }}>
                      {hdcAchieved ? <CheckBadge size={13} /> : <span className="italic font-normal">-{hdcDeficit}</span>}
                    </TableCell>,
                  ];
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );

    const totalFypTVVm = filteredMembers.reduce((s, m) => s + getClbsvTNTDData(m.agentCode).fypTVVm, 0);
    return renderClbsvDetailShell('tn-td', uniqueNhomList, filteredMembers.length, totalFypTVVm, 'SL TN đạt', 'Tổng FYP TVVm', tableJsx);
  };

  // ---------- Sub-page: CLB SAO VIỆT TN KTM ----------
  // Đối tượng: thành viên CLB có chức vụ TB (Trưởng ban) hoặc TN (Trưởng nhóm)
  // Tương tự CÁ NHÂN — 3 hạng: Vàng / Bạch Kim / Kim Cương
  // Rank cells hiển thị DEFICIT khi chưa đạt, ✓ khi đạt
  const renderCLBSVTNKTM = () => {
    const ranks = [
      CLBSV_TN_KTM_THRESHOLDS.vang,
      CLBSV_TN_KTM_THRESHOLDS.bachkim,
      CLBSV_TN_KTM_THRESHOLDS.kimcuong,
    ];
    // Source: chỉ TB / TN
    const sourceMembers = clbMembers.filter(m => isCLBMemberTBorTN(m.chucVu));
    const uniqueNhomList = Array.from(new Set(sourceMembers.map(m => m.nhom).filter(Boolean))).sort();
    // Apply user filters
    const filteredMembers = sourceMembers.filter(m => {
      if (clbsvNhomFilter && m.nhom !== clbsvNhomFilter) return false;
      if (clbsvNameFilter) {
        const q = clbsvNameFilter.toLowerCase().trim();
        if (!String(m.agentCode || '').toLowerCase().includes(q) &&
            !String(m.agentName || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
    // Sắp xếp theo Tổng FYP Lũy Kế từ CAO xuống THẤP (theo yêu cầu user)
    const sortedMembers = [...filteredMembers].sort((a, b) =>
      getClbsvFypLuyKeTNKTM(b.agentCode) - getClbsvFypLuyKeTNKTM(a.agentCode)
    );
    // Cols: STT + NHÓM + MÃ SỐ + HỌ TÊN TN + FYP LŨY KẾ + 3 rank = 5 + 3 = 8
    // (Đã bỏ TỔNG FYP THÁNG theo yêu cầu user)
    const totalCols = 5 + ranks.length;

    const tableJsx = (
      <Table>
        <TableHeader className="sticky top-0 z-10">
          <TableRow className="border-b" style={{ backgroundColor: CLBSV_HEADER_BG, borderColor: CLBSV_HEADER_BORDER }}>
            <TableHead className="text-[10px] font-bold uppercase text-center align-middle w-[40px]" style={{ color: CLBSV_HEADER_FG, backgroundColor: CLBSV_HEADER_BG }}>STT</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: CLBSV_HEADER_FG, backgroundColor: CLBSV_HEADER_BG }}>NHÓM</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: CLBSV_HEADER_FG, backgroundColor: CLBSV_HEADER_BG }}>MÃ SỐ</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: CLBSV_HEADER_FG, backgroundColor: CLBSV_HEADER_BG }}>HỌ TÊN TN</TableHead>
            <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle" style={{ color: CLBSV_HEADER_FG, backgroundColor: CLBSV_HEADER_BG }}>
              TỔNG FYP LŨY KẾ<br /><span className="italic font-normal text-[9px]">01/12/25 - nay</span>
            </TableHead>
            {ranks.map(rk => (
              <TableHead
                key={rk.label}
                className="text-[10px] font-bold uppercase text-center align-middle whitespace-nowrap p-1 clbsv-rank-col"
                style={{ backgroundColor: rk.bg, color: rk.fg, width: '115px', minWidth: '115px' }}
              >
                <div className="leading-tight">
                  <div className="font-black">{rk.label}</div>
                  <div className="italic font-bold text-[10px] mt-0.5">
                    {rk.sub} {rk.values[clbsvCurrentMonthIdx]} trđ
                  </div>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMembers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={totalCols} className="text-center text-gray-400 py-12 italic text-xs bg-white">
                Chưa có đối tượng. Cần thêm thành viên có chức vụ TB (Trưởng ban) hoặc TN (Trưởng nhóm) vào DS Thành viên CLB.
              </TableCell>
            </TableRow>
          ) : sortedMembers.map((m, idx) => {
            // Ánh xạ từ saovietManualData['tn-ktm'] (Sao Việt TN KTM) theo agentCode
            // Lưu ý: TN KTM KHÔNG áp điều kiện FYP tháng >= 12tr (chỉ CÁ NHÂN mới có)
            const fypLuyKe = getClbsvFypLuyKeTNKTM(m.agentCode);
            return (
              <TableRow key={m.id} className="bg-white hover:bg-blue-50 border-b border-gray-200">
                <TableCell className="text-[10px] text-gray-500 text-center align-middle">{idx + 1}</TableCell>
                <TableCell className="text-[10px] text-gray-700 align-middle whitespace-nowrap">{m.nhom || '—'}</TableCell>
                <TableCell className="text-[10px] text-gray-700 align-middle whitespace-nowrap font-mono">{m.agentCode || '—'}</TableCell>
                <TableCell className="text-[10px] text-gray-900 font-bold align-middle whitespace-nowrap">
                  {m.agentName || '—'}
                </TableCell>
                <TableCell className="text-[10px] text-center align-middle whitespace-nowrap font-bold text-gray-900">
                  {formatCurrency(fypLuyKe)}
                </TableCell>
                {ranks.map(rk => {
                  const thresholdVal = rk.values[clbsvCurrentMonthIdx] * 1_000_000;
                  const wouldAchieve = fypLuyKe >= thresholdVal;
                  if (wouldAchieve) {
                    return (
                      <TableCell key={rk.label} className="text-[10px] text-center align-middle" style={{ backgroundColor: rk.bodyBg }}>
                        <CheckBadge size={13} />
                      </TableCell>
                    );
                  }
                  const deficit = Math.max(0, thresholdVal - fypLuyKe);
                  // Số âm (deficit): in nghiêng, KHÔNG in đậm, nền light yellow/gainsboro/light cyan
                  return (
                    <TableCell key={rk.label} className="text-[10px] text-center italic font-normal align-middle" style={{ backgroundColor: rk.bodyBg, color: '#1E3A8A' }}>{formatDeficit(deficit)}</TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );

    const totalFypLuyKe = filteredMembers.reduce((s, m) => s + getClbsvFypLuyKeTNKTM(m.agentCode), 0);
    return renderClbsvDetailShell('tn-ktm', uniqueNhomList, filteredMembers.length, totalFypLuyKe, 'SL TN đạt', 'Tổng FYP LK', tableJsx);
  };

  // ---------- CLB Sao Việt overview (list of 3 program cards) ----------
  const renderCLBSaoVietList = () => (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-300" /> TỔNG QUAN CLB SAO VIỆT
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-amber-200/80 italic hidden sm:inline">
            Chỉ tiêu tự động cập nhật theo tháng hiện tại
          </span>
          {isAdmin && (
            <button
              onClick={() => setClbsvSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md text-white transition-all hover:brightness-110 active:scale-95"
              style={{ backgroundColor: '#1E3A8A', border: '1px solid #1E40AF', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
            >
              <Settings className="w-3.5 h-3.5" />
              Cài đặt dữ liệu
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CLBSV_ITEMS.map(item => {
          const IIcon = item.icon;
          const posterUrl = clbsvPosters[item.key] || '';
          return (
            <button
              key={item.key}
              onClick={() => navigateTo({ sheet: 'clb-saoviet', clbsvOpen: item.key })}
              className="group relative rounded-lg overflow-hidden border-2 shadow-lg flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl active:scale-95 active:translate-y-0"
              style={{
                borderColor: `${item.color}AA`,
                backgroundColor: '#0e1424',
              }}
            >
              <span
                className="absolute top-0 left-0 right-0 h-[3px] z-10 opacity-70 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"
                style={{ background: `linear-gradient(90deg, transparent, ${item.color}, transparent)` }}
              />
              {/* Poster — hiển thị ảnh nếu có, fallback gradient + icon */}
              <div
                className="relative w-full flex items-center justify-center overflow-hidden"
                style={{ aspectRatio: '16 / 9', background: posterUrl ? '#000' : `linear-gradient(135deg, ${item.color}55, ${item.color}22)` }}
              >
                {posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={posterUrl} alt={item.label} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <IIcon className="w-10 h-10 transition-transform duration-500 group-hover:scale-110 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
                )}
                <span className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
              </div>
              {/* Bottom: label + description */}
              <div className="px-2.5 py-2 text-left flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <IIcon className="w-3 h-3 flex-shrink-0 text-amber-300" />
                  <h3 className="text-[11px] font-extrabold uppercase tracking-wider truncate text-white">{item.label}</h3>
                  <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0 text-gray-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white/80" />
                </div>
                <p className="text-[10px] text-gray-300 leading-snug">{item.desc}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[9px] text-amber-200/70 italic">Chỉ tiêu tháng hiện tại</span>
                  <span className="text-[9px] font-bold flex items-center gap-1 text-amber-300">
                    Xem chi tiết <ChevronRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderCLBSaoViet = () => {
    if (clbsvOpen === 'ca-nhan') return renderCLBSVCaNhan();
    if (clbsvOpen === 'tn-td')   return renderCLBSVTNTuyenDung();
    if (clbsvOpen === 'tn-ktm')  return renderCLBSVTNKTM();
    return renderCLBSaoVietList();
  };

  // ============= TÔN VINH — 4 bảng Top 5 (H1) =============
  // Render header chung + switch theo vinhdanhSub
  const renderVinhDanh = () => {
    const cur = VINH_DANH_SUBS.find(s => s.key === vinhdanhSub) || VINH_DANH_SUBS[0];
    const Icon = cur.icon;
    return (
      <div className="space-y-3">
        {/* Sub-tabs — xanh lục đồng bộ với Chính sách */}
        <div className="flex flex-wrap gap-1.5">
          {VINH_DANH_SUBS.map(s => {
            const SIcon = s.icon;
            const active = vinhdanhSub === s.key;
            return (
              <button
                key={s.key}
                onClick={() => navigateTo({ sheet: 'vinh-danh', vinhdanhSub: s.key })}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold border transition-colors ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'text-emerald-300/60 border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-300'
                }`}
              >
                <SIcon className="w-3.5 h-3.5" />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Current sub-page header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-base font-extrabold text-emerald-300 flex items-center gap-2 drop-shadow-[0_0_6px_rgba(16,185,129,0.3)]">
            <Icon className="w-5 h-5" /> {cur.label}
          </h2>
          <span className="text-[10px] text-emerald-200/70 italic">
            Kỳ tính: 6 tháng đầu năm {new Date().getFullYear()} (T01 – T06)
          </span>
        </div>

        {/* Content */}
        {/* Nguyên tắc cột Tôn vinh (áp dụng cho mọi bảng mới tạo từ nay):
            - Bảng cấp TVV (Top 5 TVV, Top 5 TVVm): 4 cột đầu LUÔN là STT - NHÓM - MÃ TVV - HỌ TÊN TVV, sau đó mới đến cột số liệu.
            - Bảng cấp Nhóm (Top 5 Nhóm, Nhóm HTKH): 2 cột đầu là STT - NHÓM, sau đó mới đến cột số liệu.
            - KHÔNG bao giờ hiển thị MÃ NHÓM (maBanNhom) trên bảng — mã nhóm chỉ để tính toán/lookup. */}
        {vinhdanhSub === 'top5-tvv' && (
          <VinhDanhTable
            title="TOP 5 TVV — TỔNG IP CAO NHẤT 6 THÁNG ĐẦU NĂM"
            columns={[
              { key: 'rank', label: 'STT', width: '50px' },
              { key: 'tenNhom', label: 'Nhóm' },
              { key: 'agentCode', label: 'Mã TVV' },
              { key: 'agentName', label: 'Họ tên TVV' },
              { key: 'ip', label: 'Tổng IP (đ)', align: 'right' },
            ]}
            rows={vinhDanhData.top5Tvv.map((t, i) => ({
              rank: i + 1,
              tenNhom: t.tenNhom,
              agentCode: t.agentCode,
              agentName: t.agentName,
              ip: t.ip,
            }))}
            rankColors={['#FFD700', '#C0C0C0', '#CD7F32', '#9CA3AF', '#9CA3AF']}
            emptyText="Chưa có dữ liệu IP trong 6 tháng đầu năm"
          />
        )}

        {vinhdanhSub === 'top5-tvvm' && (
          <VinhDanhTable
            title="TOP 5 TVVm (TVV MỚI) — TỔNG IP CAO NHẤT 6 THÁNG ĐẦU NĂM"
            subtitle="Lưu ý: TVVm đã lọt Top 5 TVV chung (mục 1) sẽ KHÔNG hiển thị ở đây — chỉ lấy hạng cao hơn."
            columns={[
              { key: 'rank', label: 'STT', width: '50px' },
              { key: 'tenNhom', label: 'Nhóm' },
              { key: 'agentCode', label: 'Mã TVV' },
              { key: 'agentName', label: 'Họ tên TVVm' },
              { key: 'ip', label: 'Tổng IP (đ)', align: 'right' },
            ]}
            rows={vinhDanhData.top5TvvM.map((t, i) => ({
              rank: i + 1,
              tenNhom: t.tenNhom,
              agentCode: t.agentCode,
              agentName: t.agentName,
              ip: t.ip,
            }))}
            rankColors={['#FFD700', '#C0C0C0', '#CD7F32', '#9CA3AF', '#9CA3AF']}
            emptyText="Chưa có TVVm nào có IP trong 6 tháng đầu năm (sau khi loại trừ các TVVm đã lọt Top 5 TVV chung)"
          />
        )}

        {vinhdanhSub === 'top5-nhom' && (
          <VinhDanhTable
            title="TOP 5 NHÓM — TỔNG IP CAO NHẤT 6 THÁNG ĐẦU NĂM"
            columns={[
              { key: 'rank', label: 'STT', width: '50px' },
              { key: 'tenNhom', label: 'Nhóm' },
              { key: 'truongNhomMaSo', label: 'Mã Trưởng Nhóm/Ban' },
              { key: 'truongNhomHoTen', label: 'Họ Tên Trưởng Nhóm/Ban' },
              { key: 'ip', label: 'Tổng IP (đ)', align: 'right' },
            ]}
            rows={vinhDanhData.top5Nhom.map((n, i) => ({
              rank: i + 1,
              tenNhom: n.tenNhom,
              truongNhomMaSo: n.truongNhomMaSo || '—',
              truongNhomHoTen: n.truongNhomHoTen || '—',
              ip: n.ip,
            }))}
            rankColors={['#FFD700', '#C0C0C0', '#CD7F32', '#9CA3AF', '#9CA3AF']}
            emptyText="Chưa có dữ liệu IP theo nhóm trong 6 tháng đầu năm"
          />
        )}

        {vinhdanhSub === 'nhom-hoan-thanh-kh' && (
          <VinhDanhTable
            title="NHÓM KINH DOANH HOÀN THÀNH KẾ HOẠCH 6 THÁNG ĐẦU NĂM"
            subtitle={`Tính theo AFYP H1 ≥ KH H1 (KH H1 = KH năm × ${(vinhDanhData.h1RatioPct * 100).toFixed(1)}% tỷ lệ tháng T01-T06). Chỉ hiển thị các nhóm đã đạt.`}
            columns={[
              { key: 'rank', label: 'STT', width: '50px' },
              { key: 'tenNhom', label: 'Nhóm' },
              { key: 'afypH1', label: 'AFYP H1 (đ)', align: 'right' },
              { key: 'khH1', label: 'KH H1 (đ)', align: 'right' },
              { key: 'pct', label: '% HT', align: 'right' },
            ]}
            rows={vinhDanhData.nhomHoanThanhKH.map((n, i) => ({
              rank: i + 1,
              tenNhom: n.tenNhom,
              afypH1: n.afypH1,
              khH1: n.khH1,
              pct: n.pct,
            }))}
            rankColors={[]}
            emptyText="Chưa có nhóm nào hoàn thành kế hoạch H1 (hoặc chưa thiết lập KH cho nhóm)"
          />
        )}
      </div>
    );
  };

  const renderSheet = () => {
    if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /><span className="ml-3 text-emerald-300 text-sm">Đang tải...</span></div>;
    // Mounted guard: khi chưa mounted (SSR hoặc hydration đầu tiên) → render skeleton
    // tránh flash bug hiện overview rồi mới switch sang sheet từ URL (?sheet=xxx)
    if (!mounted) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /><span className="ml-3 text-emerald-300 text-sm">Đang tải...</span></div>;
    switch (activeSheet) {
      case 'overview': return renderOverview();
      case 'leaders': return renderLeaders();
      case 'recruiters': return renderRecruiters();
      case 'tuyen-ngang': return renderTuyenNgang();
      case 'revenue': return renderRevenue();
      case 'kehoach': return renderKeHoach();
      case 'report': return renderPolicy();
      case 'saoviet': return renderSaoViet();
      case 'clb-saoviet': return renderCLBSaoViet();
      case 'vinh-danh': return renderVinhDanh();
      case 'structure': {
        // Sub-dispatch within "Cấu trúc" section
        // NGUYÊN TẮC: DS TVV (sub='tvv') cũng hiển thị dạng cây Phòng → AD → Nhóm → TVV
        // (đồng nhất với default tree view, KHÔNG còn bảng phẳng)
        if (structureSub === 'leaders') return renderLeaders();
        if (structureSub === 'recruiters') return renderRecruiters();
        if (structureSub === 'tuyen-ngang') return renderTuyenNgang();
        if (structureSub === 'clb-members') return renderCLBMembers();
        if (structureSub === 'pending-members') return renderPendingMembers();
        return renderStructure();
      }
    }
  };

  return (
    <div className="h-screen flex flex-col fixed inset-0 z-50" style={{ backgroundColor: 'transparent' }}>
      {/* Sync success indicator - top right corner */}
      {syncSuccessVisible && (
        <div className="fixed top-2 right-2 z-[999] flex items-center gap-1.5 bg-emerald-500/90 text-white px-3 py-1.5 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2 duration-300" style={{ backdropFilter: 'blur(8px)' }}>
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-bold">{syncSuccessCount} HĐ đã đồng bộ</span>
        </div>
      )}
      {/* Header */}
      <header className="border-b border-emerald-700/50 backdrop-blur-md px-2 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 flex-shrink-0" style={{ backgroundColor: 'rgba(26, 35, 50, 0.85)' }}>
        {/* Conditional back-button rendering:
            - Khi CHƯA phải admin: ẩn BackButton + Cài đặt.
              • Đang ở sub-page (policyOpen / saovietOpen / clbsvOpen đang mở) → bấm "Trở về" để về TỔNG QUAN của cùng section.
              • Đang ở overview của 3 trang CHÍNH SÁCH / SAO VIỆT / CLB SAO VIỆT → bấm "Trở về" để về trang KPI.
              • Đang ở overview / sheets khác → bấm "Trở về" để về trang chính ứng dụng.
            - Khi đã là admin (đăng nhập từ KPI page): hiện BackButton (handleAppBack) như cũ. */}
        {!isAdmin ? (
          <Button
            variant="ghost"
            onClick={nonAdminBack}
            className="text-emerald-400/90 hover:text-emerald-300 hover:bg-emerald-500/10 h-8 gap-1.5 px-2.5 text-xs font-bold flex-shrink-0"
            title={((activeSheet === 'report' && policyOpen) || (activeSheet === 'saoviet' && saovietOpen) || (activeSheet === 'clb-saoviet' && clbsvOpen)) ? 'Trở về tổng quan' : (activeSheet === 'report' || activeSheet === 'saoviet' || activeSheet === 'clb-saoviet') ? 'Trở về trang KPI' : 'Trở về trang chính'}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Trở về</span>
          </Button>
        ) : (
          <BackButton onClick={handleAppBack} size={20} title="Trở về thao tác trước" />
        )}
        <h1 className="text-sm sm:text-lg font-extrabold text-emerald-400 drop-shadow-[0_0_10px_rgba(0,255,136,0.5)] drop-shadow-[0_0_30px_rgba(0,255,136,0.2)] flex-1 text-center md:text-left truncate">{activeSheet === 'report' && policyOpen ? (POLICY_ITEMS.find(i => i.key === policyOpen)?.label || 'Chính Sách Đại Lý') : activeSheet === 'saoviet' && saovietOpen ? (SAOVIET_ITEMS.find(i => i.key === saovietOpen)?.label || 'SV Toàn Chặng') : activeSheet === 'saoviet' ? 'SAO VIỆT TOÀN CHẶNG' : activeSheet === 'clb-saoviet' && clbsvOpen ? (CLBSV_ITEMS.find(i => i.key === clbsvOpen)?.label || 'CLB Sao Việt') : activeSheet === 'clb-saoviet' ? 'CLB SAO VIỆT' : activeSheet === 'vinh-danh' ? (VINH_DANH_SUBS.find(s => s.key === vinhdanhSub)?.label || 'TÔN VINH') : activeSheet === 'revenue' ? 'Doanh Thu' : activeSheet === 'structure' ? (STRUCTURE_SUBS.find(s => s.key === structureSub)?.label || 'Cấu trúc') : activeSheet === 'report' ? 'CHÍNH SÁCH ĐẠI LÝ' : 'Quản Lý Dữ Liệu'}</h1>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Nút Cài đặt đã được chuyển vào menu mobile (PHẦN 1) và sidebar — bỏ ở header để tránh trùng */}
          <Button variant="ghost" onClick={() => loadSheet(activeSheet, true)} className="text-emerald-400/70 hover:text-emerald-300 hover:bg-emerald-500/10 h-8 w-8 p-0" title="Tải lại dữ liệu"><RefreshCw className="w-3.5 h-3.5" /></Button>
          {/* Tải Excel — chỉ hiện khi đang xem chính sách (activeSheet='report' && policyOpen) */}
          {activeSheet === 'report' && policyOpen && (
            <Button variant="ghost" onClick={handleDownloadPolicyExcel} className="text-emerald-400/70 hover:text-emerald-300 hover:bg-emerald-500/10 h-8 w-8 p-0" title="Tải file Excel chính sách"><FileDown className="w-4 h-4" /></Button>
          )}
          {/* Tải Excel — Tôn vinh: tải toàn bộ 4 bảng Top 5 (H1) về 1 file Excel */}
          {activeSheet === 'vinh-danh' && (
            <Button variant="ghost" onClick={handleDownloadVinhDanhExcel} className="text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10 h-8 w-8 p-0" title="Tải file Excel Tôn vinh"><FileDown className="w-4 h-4" /></Button>
          )}
          {/* Desktop: nút Cài đặt — chỉ hiện khi đã là admin (đăng nhập từ KPI page). Khi chưa admin, ẩn đi. */}
          {isAdmin && (
            <Button variant="ghost" onClick={() => setSettingsDialogOpen(true)} className="hidden md:inline-flex text-emerald-400/70 hover:text-emerald-300 hover:bg-emerald-500/10 h-8 w-8 p-0" title="Cài đặt"><Settings className="w-4 h-4" /></Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Mobile overlay */}
        {sidebarOpen && <div className="fixed top-[44px] md:top-auto inset-x-0 bottom-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
        {/* Sidebar */}
        <nav className={`fixed md:static top-[44px] md:top-auto bottom-0 md:bottom-auto left-0 z-50 md:z-auto w-[220px] backdrop-blur-md border-r border-emerald-500/30 flex-shrink-0 overflow-y-auto transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`} style={{ backgroundColor: 'rgba(26, 35, 50, 0.9)' }}>
          {/* Mobile close button */}
          <div className="flex items-center justify-between p-2 border-b border-emerald-500/20 md:hidden">
            <span className="text-xs font-bold text-emerald-300">Menu</span>
            <Button variant="ghost" onClick={() => setSidebarOpen(false)} className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300"><ChevronLeft className="w-4 h-4" /></Button>
          </div>
          <div className="p-2 space-y-0.5">
            {SHEETS.map((sheet, index) => {
              const isActive = activeSheet === sheet.key;
              // Each hasSub sheet gets its own expanded flag
              const isExpanded = sheet.hasSub && (
                (sheet.key === 'revenue' && revenueExpanded) ||
                (sheet.key === 'report' && policyExpanded) ||
                (sheet.key === 'structure' && structureExpanded)
              );
              const handleSubToggle = () => {
                if (sheet.key === 'revenue') setRevenueExpanded(!revenueExpanded);
                else if (sheet.key === 'report') setPolicyExpanded(!policyExpanded);
                else if (sheet.key === 'structure') setStructureExpanded(!structureExpanded);
              };
              // Build sub-items list + click handler based on sheet
              const subItems: { key: string; label: string; Icon: React.ComponentType<{ className?: string }> }[] =
                sheet.key === 'revenue'
                  ? MONTHS.map(m => ({ key: m.key, label: m.label, Icon: m.key === 'all' ? TrendingUp : Calendar }))
                  : sheet.key === 'report'
                  ? POLICY_ITEMS.map(p => ({ key: p.key, label: p.label, Icon: p.icon }))
                  : sheet.key === 'structure'
                  ? STRUCTURE_SUBS.map(s => ({ key: s.key, label: s.label, Icon: s.icon }))
                  : [];
              const activeSubKey: string | null =
                sheet.key === 'revenue' ? revenueSub
                : sheet.key === 'report' ? policyOpen
                : sheet.key === 'structure' ? structureSub
                : null;
              const handleSubClick = (subKey: string) => {
                if (sheet.key === 'revenue') {
                  navigateTo({ sheet: 'revenue', revenueSub: subKey as RevenueSubKey });
                } else if (sheet.key === 'report') {
                  navigateTo({ sheet: 'report', policyOpen: subKey });
                } else if (sheet.key === 'structure') {
                  navigateTo({ sheet: 'structure', structureSub: subKey as StructureSubKey });
                  // Load sub-data on demand
                  if (subKey === 'tvv') fetchTvvStruct();
                  else if (subKey === 'leaders') fetchLeaders();
                  else if (subKey === 'recruiters') fetchRecruiters();
                  else if (subKey === 'tuyen-ngang') fetchTuyenNgang();
                  else if (subKey === 'clb-members' || subKey === 'pending-members') {
                    // CLB/Pending DS dùng localStorage + autofill từ DS TVV/BanNhom/AD
                    fetchTvvStruct();
                    fetchBanNhom();
                    fetchAD();
                  }
                }
                setSidebarOpen(false);
              };
              return (
                <div key={sheet.key}>
                  <button
                    onClick={() => {
                      if (sheet.key === 'report') {
                        // Chính sách — navigate directly to overview (no expand)
                        navigateTo({ sheet: 'report', policyOpen: null });
                        setSearchTerm('');
                        setSortField('');
                        setSidebarOpen(false);
                      } else {
                        navigateTo({ sheet: sheet.key });
                        setSearchTerm('');
                        setSortField('');
                        if (sheet.hasSub) {
                          handleSubToggle();
                          // On mobile: don't close sidebar if expanding sub-items
                          // Only close sidebar when a sub-item is selected
                        } else {
                          setSidebarOpen(false);
                        }
                      }
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors ${
                      isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 neon-glow' : 'text-emerald-300/60 hover:bg-emerald-500/10 hover:text-emerald-300'
                    }`}
                  >
                    <sheet.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate flex-1 text-left">{sheet.label}</span>
                    {hasSectionLink(sheet.key) && <Link2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                    {sheet.hasSub && sheet.key !== 'report' && (isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-emerald-300" /> : <ChevronRight className="w-3.5 h-3.5 text-emerald-300" />)}
                  </button>
                  {/* Sub-items (revenue months OR structure items — NOT policy) */}
                  {sheet.hasSub && sheet.key !== 'report' && isExpanded && subItems.length > 0 && (
                    <div className="ml-6 mt-0.5 space-y-0.5">
                      {subItems.map(s => {
                        const subActive = activeSubKey === s.key;
                        return (
                          <button
                            key={s.key}
                            onClick={() => handleSubClick(s.key)}
                            className={`w-full flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold rounded transition-colors ${
                              subActive ? 'bg-emerald-500/20 text-emerald-300' : 'text-emerald-300/60 hover:bg-emerald-500/10 hover:text-emerald-300'
                            }`}
                          >
                            <s.Icon className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate flex-1 text-left">{s.label}</span>
                            {hasSectionLink(`${sheet.key}-${s.key}`) && <Link2 className="w-2.5 h-2.5 text-emerald-400" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {/* SAO VIỆT TOÀN CHẶNG — sidebar item, direct navigation to overview (no expand) */}
            <div>
              <button
                onClick={() => {
                  navigateTo({ sheet: 'saoviet', saovietOpen: null });
                  setSearchTerm('');
                  setSortField('');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors ${
                  activeSheet === 'saoviet' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40' : 'text-violet-300/70 hover:bg-violet-500/10 hover:text-violet-300'
                }`}
                title="Sao Việt Toàn Chặng"
              >
                <Star className="w-4 h-4 flex-shrink-0" />
                <span className="truncate flex-1 text-left">SV Toàn Chặng</span>
              </button>
            </div>
            {/* CLB Sao Việt — sidebar item, direct navigation to overview */}
            <div>
              <button
                onClick={() => {
                  navigateTo({ sheet: 'clb-saoviet', clbsvOpen: null });
                  setSearchTerm('');
                  setSortField('');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors ${
                  activeSheet === 'clb-saoviet' ? 'bg-blue-500/20 text-white border border-blue-500/40' : 'text-white/70 hover:bg-blue-500/10 hover:text-white'
                }`}
                title="CLB Sao Việt"
              >
                <Award className="w-4 h-4 flex-shrink-0" />
                <span className="truncate flex-1 text-left">CLB Sao Việt</span>
              </button>
            </div>
            {/* TÔN VINH — sidebar item with 4 sub-pages */}
            <div>
              <button
                onClick={() => {
                  setVinhDanhExpanded(!vinhdanhExpanded);
                  navigateTo({ sheet: 'vinh-danh', vinhdanhSub: vinhdanhSub || 'top5-tvv' });
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors ${
                  activeSheet === 'vinh-danh' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-amber-300/70 hover:bg-amber-500/10 hover:text-amber-300'
                }`}
                title="Tôn vinh"
              >
                <Trophy className="w-4 h-4 flex-shrink-0" />
                <span className="truncate flex-1 text-left">Tôn vinh</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${vinhdanhExpanded ? 'rotate-180' : ''}`} />
              </button>
              {/* Sub-items */}
              {vinhdanhExpanded && (
                <div className="ml-6 mt-0.5 space-y-0.5">
                  {VINH_DANH_SUBS.map(s => {
                    const SIcon = s.icon;
                    const subActive = activeSheet === 'vinh-danh' && vinhdanhSub === s.key;
                    return (
                      <button
                        key={s.key}
                        onClick={() => {
                          navigateTo({ sheet: 'vinh-danh', vinhdanhSub: s.key });
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold rounded transition-colors ${
                          subActive ? 'bg-amber-500/20 text-amber-300' : 'text-amber-300/60 hover:bg-amber-500/10 hover:text-amber-300'
                        }`}
                      >
                        <SIcon className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate flex-1 text-left">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 relative">
          {renderSheet()}
        </main>
      </div>

      {/* Mobile: backdrop đóng popup khi click ra ngoài */}
      {(mobileMenuPopup || mobilePolicyPopupOpen || mobileRevenuePopupOpen) && (
        <div
          className="fixed inset-0 z-[150] md:hidden"
          onClick={() => { setMobileMenuPopup(null); setMobilePolicyPopupOpen(false); setMobileRevenuePopupOpen(false); }}
        />
      )}

      {/* ========== Sao Việt Settings Modal ========== */}
      {saovietSettingsOpen && (
        <div className="fixed inset-0 z-[700] bg-black/70 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-[#1a2332] border-2 border-amber-500/50 rounded-lg w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden" style={{ boxShadow: '0 12px 50px rgba(0,0,0,0.7)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-amber-500/40" style={{ backgroundColor: '#D97706' }}>
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <Settings className="w-4 h-4" /> CÀI ĐẶT DỮ LIỆU SAO VIỆT
              </h3>
              <button
                onClick={() => setSaovietSettingsOpen(false)}
                className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded transition-colors"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Body — shared link section + 3 panels (per program) */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
              <p className="text-[11px] text-amber-200/70 leading-relaxed">
                Quản lý nguồn dữ liệu và ảnh poster cho 3 chương trình Sao Việt.
              </p>

              {/* ===== SHARED LINK SECTION — 1 spreadsheet, 3 tabs ===== */}
              <div className="p-3 border-2 border-orange-500/40 rounded-lg" style={{ backgroundColor: 'rgba(234, 88, 12, 0.08)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className={`w-4 h-4 text-orange-400 ${saovietSyncingAll ? 'animate-spin' : ''}`} />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-orange-300">Đồng bộ tất cả 3 chương trình</h4>
                </div>
                <p className="text-[10px] text-orange-200/70 leading-relaxed mb-2">
                  Dán <strong>1 link Google Sheets</strong> có <strong>3 tab</strong> đặt tên đúng: <code className="px-1 bg-orange-500/20 rounded">ca-nhan</code> · <code className="px-1 bg-orange-500/20 rounded">tn-ktm</code> · <code className="px-1 bg-orange-500/20 rounded">tn-td</code>.
                  Dữ liệu mỗi tab bắt đầu từ cột <strong>NHÓM</strong> (không cần cột STT — app tự đếm).
                  Tiêu đề bảng giữ nguyên như trên app.
                </p>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-orange-200/70">Link Google Sheets (chung cho 3 chương trình)</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      defaultValue={saovietSharedLink}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="h-8 text-[11px] bg-white border-orange-500/30 text-gray-800 placeholder-gray-400 flex-1"
                      onBlur={(e) => saveSaovietSharedLink(e.target.value.trim())}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    />
                    {saovietSharedLink && (
                      <a href={saovietSharedLink} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-700 flex-shrink-0 p-1" title="Mở link">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={saovietSyncingAll || !saovietSharedLink}
                    onClick={handleSaovietSyncAll}
                    className="h-8 text-[11px] w-full bg-orange-500 hover:bg-orange-600 border border-orange-600 text-white disabled:opacity-50 font-bold"
                  >
                    {saovietSyncingAll
                      ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Đang đồng bộ 3 chương trình...</>
                      : <><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Đồng bộ tất cả từ link</>}
                  </Button>
                  {/* Per-program sync status */}
                  <div className="grid grid-cols-3 gap-1.5 mt-2">
                    {SAOVIET_ITEMS.map(item => {
                      const count = (saovietManualData[item.key] || []).length;
                      return (
                        <div key={item.key} className="px-2 py-1 rounded text-center border" style={{ borderColor: `${item.color}44`, backgroundColor: `${item.color}11` }}>
                          <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: item.color }}>{item.label.replace('Sao Việt ', '')}</div>
                          <div className="text-[14px] font-black" style={{ color: count > 0 ? item.color : '#9CA3AF' }}>
                            {count > 0 ? count : '—'}
                          </div>
                          <div className="text-[8px] text-gray-400">dòng</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-2 py-1">
                <div className="flex-1 h-px bg-orange-500/20" />
                <span className="text-[10px] text-orange-300/60 italic">hoặc upload file riêng từng chương trình</span>
                <div className="flex-1 h-px bg-orange-500/20" />
              </div>

              {SAOVIET_ITEMS.map(item => {
                const IIcon = item.icon;
                const posterUrl = saovietPosters[item.key] || '';
                const isUploading = !!saovietPosterUploading[item.key];
                return (
                  <div key={item.key} className="space-y-2">
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={{ backgroundColor: `${item.color}22`, borderLeft: `3px solid ${item.color}` }}>
                      <IIcon className="w-3.5 h-3.5" style={{ color: item.color }} />
                      <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: item.color }}>{item.label}</h4>
                    </div>
                    {renderSaovietPanel(item.key)}
                    {/* Poster management section */}
                    <div className="p-2.5 border border-orange-500/20 rounded-md" style={{ backgroundColor: 'rgba(234, 88, 12, 0.04)' }}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <ImageIcon className="w-3 h-3 text-orange-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-300">Poster 16:9</span>
                      </div>
                      <div className="flex items-start gap-3">
                        {/* Preview thumbnail */}
                        <div className="w-24 h-14 rounded overflow-hidden border flex-shrink-0 bg-black/40 flex items-center justify-center" style={{ borderColor: `${item.color}44` }}>
                          {posterUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={posterUrl} alt="Poster" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-gray-600" />
                          )}
                        </div>
                        {/* Actions */}
                        <div className="flex-1 flex flex-col gap-1.5">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id={`saoviet-settings-poster-${item.key}`}
                            onChange={(e) => handleSaovietPosterUpload(item.key, e)}
                            disabled={isUploading}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById(`saoviet-settings-poster-${item.key}`)?.click()}
                            disabled={isUploading}
                            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-md text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                            style={{ backgroundColor: item.color, border: `1px solid ${item.color}` }}
                          >
                            {isUploading ? (
                              <><Loader2 className="w-3 h-3 animate-spin" /> Đang tải...</>
                            ) : (
                              <><Upload className="w-3 h-3" /> {posterUrl ? 'Đổi ảnh' : 'Tải poster lên'}</>
                            )}
                          </button>
                          {posterUrl && (
                            <button
                              type="button"
                              onClick={() => handleSaovietPosterDelete(item.key)}
                              disabled={isUploading}
                              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-md text-red-300 transition-all hover:bg-red-500/20 active:scale-95 disabled:opacity-50 border border-red-500/30"
                            >
                              <Trash2 className="w-3 h-3" /> Xóa poster
                            </button>
                          )}
                          <p className="text-[9px] text-gray-500 leading-tight">PNG / JPG / WebP — tỷ lệ 16:9, tối đa 8MB</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-amber-500/30" style={{ backgroundColor: 'rgba(217, 119, 6, 0.08)' }}>
              <button
                onClick={() => setSaovietSettingsOpen(false)}
                className="px-4 py-1.5 text-xs font-bold rounded-md text-white transition-all hover:brightness-110 active:scale-95"
                style={{ backgroundColor: '#D97706', border: '1px solid #B45309' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== CLB SAO VIỆT Settings Modal — quản lý poster 3 chương trình ========== */}
      {/* Tách riêng khỏi detail tables — detail chỉ xem, cài đặt ở đây */}
      {clbsvSettingsOpen && (
        <div className="fixed inset-0 z-[700] bg-black/70 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-[#1a2332] border-2 border-blue-500/50 rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden" style={{ boxShadow: '0 12px 50px rgba(0,0,0,0.7)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-blue-500/40" style={{ backgroundColor: '#1E3A8A' }}>
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <Settings className="w-4 h-4" /> CÀI ĐẶT DỮ LIỆU CLB SAO VIỆT
              </h3>
              <button
                onClick={() => setClbsvSettingsOpen(false)}
                className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded transition-colors"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Body — poster management per program */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
              <p className="text-[11px] text-blue-200/70 leading-relaxed">
                Quản lý ảnh poster 16:9 cho 3 chương trình CLB Sao Việt. Đối tượng được lấy tự động từ <strong>DS Thành viên CLB</strong> (Cấu trúc → DS Thành viên CLB).
              </p>

              {CLBSV_ITEMS.map(item => {
                const IIcon = item.icon;
                const posterUrl = clbsvPosters[item.key] || '';
                const isUploading = !!clbsvPosterUploading[item.key];
                return (
                  <div key={item.key} className="p-3 border border-blue-500/30 rounded-md" style={{ backgroundColor: 'rgba(30, 58, 138, 0.10)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <IIcon className="w-3.5 h-3.5" style={{ color: item.color }} />
                      <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: item.color }}>{item.label}</h4>
                    </div>
                    <div className="flex items-start gap-3">
                      {/* Preview thumbnail */}
                      <div className="w-24 h-14 rounded overflow-hidden border flex-shrink-0 bg-black/40 flex items-center justify-center" style={{ borderColor: `${item.color}44` }}>
                        {posterUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={posterUrl} alt="Poster" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                      {/* Actions */}
                      <div className="flex-1 flex flex-col gap-1.5">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id={`clbsv-settings-poster-${item.key}`}
                          onChange={(e) => handleClbsvPosterUpload(item.key, e)}
                          disabled={isUploading}
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById(`clbsv-settings-poster-${item.key}`)?.click()}
                          disabled={isUploading}
                          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-md text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                          style={{ backgroundColor: item.color, border: `1px solid ${item.color}` }}
                        >
                          {isUploading ? (
                            <><Loader2 className="w-3 h-3 animate-spin" /> Đang tải...</>
                          ) : (
                            <><Upload className="w-3 h-3" /> {posterUrl ? 'Đổi ảnh' : 'Tải poster lên'}</>
                          )}
                        </button>
                        {posterUrl && (
                          <button
                            type="button"
                            onClick={() => handleClbsvPosterDelete(item.key)}
                            disabled={isUploading}
                            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-md text-red-300 transition-all hover:bg-red-500/20 active:scale-95 disabled:opacity-50 border border-red-500/30"
                          >
                            <Trash2 className="w-3 h-3" /> Xóa poster
                          </button>
                        )}
                        <p className="text-[9px] text-gray-500 leading-tight">PNG / JPG / WebP — tỷ lệ 16:9, tối đa 8MB</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-blue-500/30" style={{ backgroundColor: 'rgba(30, 58, 138, 0.12)' }}>
              <button
                onClick={() => setClbsvSettingsOpen(false)}
                className="px-4 py-1.5 text-xs font-bold rounded-md text-white transition-all hover:brightness-110 active:scale-95"
                style={{ backgroundColor: '#1E3A8A', border: '1px solid #1E40AF' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== Settings Dialog ========== */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="bg-[#1a2332]/95 backdrop-blur-xl border-emerald-500/30 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-emerald-400 flex items-center gap-2">
              <Settings className="w-5 h-5" /> Cài đặt hệ thống
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            {/* Section 1: Kế hoạch Năm */}
            <div className="space-y-1">
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
                          <span className={`text-[10px] font-bold ${pctColorMap[item.color]}`}>{Math.round(pct)}%</span>
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
            </div>

            {/* Section 2: Đồng bộ & Nguồn dữ liệu */}
            <div className="space-y-1">
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
                  { key: 'recruiters', label: 'DS TTN' },
                  { key: 'revenue', label: 'Doanh thu' },
                  { key: 'structure', label: 'Cấu trúc' },
                  ...MONTHS.map(m => ({ key: `revenue-${m.key}`, label: `Doanh thu - ${m.label}` })),
                ].map(section => {
                  const link = onlineSettings[`nmc-link-${section.key}`] || '';
                  const sync = onlineSettings[`nmc-sync-${section.key}`];
                  const syncOn = sync === undefined || sync === '' || sync === 'true';
                  return (
                    <div key={section.key} className="bg-emerald-800/60 rounded-md p-2.5 border border-emerald-600/50 shadow-md">
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

            {/* Section 3: Ảnh chính sách — chỉ hiện khi đang ở trang chính sách */}
            {activeSheet === 'report' && policyOpen && (() => {
              const item = POLICY_ITEMS.find(i => i.key === policyOpen);
              if (!item) return null;
              const currentImage = policyImageLinks[policyOpen] || '';
              return (
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-amber-400" /> Ảnh chính sách: {item.label}
                  </h3>
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 space-y-2">
                    {/* Preview */}
                    {currentImage && (
                      <div className="rounded-md overflow-hidden border border-amber-500/30" style={{ height: '100px' }}>
                        <img src={currentImage} alt="Preview" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      </div>
                    )}
                    {/* Upload */}
                    <div>
                      <Label className="text-xs text-emerald-200/70">Tải ảnh lên trực tiếp</Label>
                      <input type="file" accept="image/*" className="hidden" id="settings-policy-image-upload" onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        // Nén ảnh trước khi lưu
                        compressImage(file).then(dataUrl => {
                          setPolicyImageInput(dataUrl);
                          // Auto-save on upload
                          savePolicyImage(policyOpen, dataUrl);
                        }).catch(err => {
                          toast({ title: 'Lỗi xử lý ảnh', description: String(err), variant: 'destructive' });
                        });
                      }} />
                      <Button variant="ghost" onClick={() => document.getElementById('settings-policy-image-upload')?.click()} className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs w-full">
                        <Upload className="w-3 h-3 mr-1" /> Chọn file ảnh
                      </Button>
                    </div>
                    {/* URL paste */}
                    <div>
                      <Label className="text-xs text-emerald-200/70">Hoặc dán link ảnh (URL)</Label>
                      <Input
                        defaultValue={currentImage}
                        placeholder="https://example.com/image.jpg"
                        className="bg-white/5 border-emerald-500/20 text-white h-8 text-xs"
                        onBlur={(e) => { savePolicyImage(policyOpen, e.target.value); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
                      />
                    </div>
                    {/* Delete */}
                    {currentImage && (
                      <Button variant="ghost" onClick={() => { savePolicyImage(policyOpen, ''); }} className="text-red-300 hover:text-red-200 text-xs w-full border border-red-500/30">
                        <Trash2 className="w-3 h-3 mr-1" /> Xóa ảnh hiện tại
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button onClick={() => setSettingsDialogOpen(false)} className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300">Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Policy Image settings đã được gộp vào dialog Cài đặt hệ thống ở trên */}

    </div>
  );
}
