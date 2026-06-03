'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft, Plus, Trash2, Download, Upload, Search, ArrowUpDown,
  LayoutDashboard, Users, DollarSign, FileText, UserCircle, Loader2,
  RefreshCw, CheckCircle2, X,
} from 'lucide-react';

// Types
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
  id: string; contractNumber: string; agentCode: string; agentName: string;
  position: string; ban: string; nhom: string; maNhom: string;
  leaderAgentCode: string; recruiterCode: string; startDate: string | null;
  effectiveDate: string; issueDate: string; fyp: number; afyp: number; tinhLuot: number;
}

interface StaffMember {
  id: string; nhom: string; maNhom: string; agentCode: string;
  agentName: string; position: string; startDate: string | null;
}

type SheetKey = 'overview' | 'leaders' | 'revenue' | 'contracts' | 'staff';

const SHEETS: { key: SheetKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { key: 'leaders', label: 'Trưởng Ban/Nhóm', icon: Users },
  { key: 'revenue', label: 'Doanh thu tháng', icon: DollarSign },
  { key: 'contracts', label: 'Hợp đồng', icon: FileText },
  { key: 'staff', label: 'Nhân sự', icon: UserCircle },
];

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}
function formatNumber(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n);
}

// Editable Cell Component
function EditableCell({ value, onSave, type = 'text', className = '' }: {
  value: string | number; onSave: (val: any) => void; type?: 'text' | 'number' | 'date'; className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setEditVal(String(value)); }, [value]);
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
        className="w-full h-full px-1 py-0.5 text-xs bg-white text-black border border-emerald-500 outline-none"
      />
    );
  }

  return (
    <div
      className={`cursor-pointer hover:bg-emerald-50 hover:outline hover:outline-1 hover:outline-emerald-300 px-1 py-0.5 min-h-[22px] ${className}`}
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

export default function QuanLyPage() {
  const router = useRouter();
  const [activeSheet, setActiveSheet] = useState<SheetKey>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Data states
  const [leaders, setLeaders] = useState<LeaderInfo[]>([]);
  const [revenue, setRevenue] = useState<MonthlyRevenue[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch functions
  const fetchLeaders = useCallback(async () => {
    try { const res = await fetch('/api/leaders'); if (res.ok) setLeaders(await res.json()); }
    catch { toast({ title: 'Lỗi', description: 'Không thể tải dữ liệu trưởng ban/nhóm', variant: 'destructive' }); }
  }, []);

  const fetchRevenue = useCallback(async () => {
    try { const res = await fetch('/api/revenue'); if (res.ok) setRevenue(await res.json()); }
    catch { toast({ title: 'Lỗi', description: 'Không thể tải dữ liệu doanh thu', variant: 'destructive' }); }
  }, []);

  const fetchContracts = useCallback(async () => {
    try { const res = await fetch('/api/contracts'); if (res.ok) setContracts(await res.json()); }
    catch { /* silent */ }
  }, []);

  const fetchStaff = useCallback(async () => {
    try { const res = await fetch('/api/staff'); if (res.ok) setStaff(await res.json()); }
    catch { /* silent */ }
  }, []);

  const loadSheet = useCallback((sheet: SheetKey) => {
    setIsLoading(true);
    const loaders: Record<SheetKey, () => Promise<void>> = {
      overview: async () => { await Promise.all([fetchLeaders(), fetchRevenue(), fetchContracts(), fetchStaff()]); },
      leaders: fetchLeaders,
      revenue: fetchRevenue,
      contracts: fetchContracts,
      staff: fetchStaff,
    };
    loaders[sheet]().finally(() => setIsLoading(false));
  }, [fetchLeaders, fetchRevenue, fetchContracts, fetchStaff]);

  useEffect(() => { loadSheet(activeSheet); }, [activeSheet, loadSheet]);

  // CRUD handlers
  const updateLeader = useCallback(async (id: string, field: string, value: any) => {
    try {
      const res = await fetch(`/api/leaders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }) });
      if (res.ok) { setLeaders(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l)); }
    } catch { toast({ title: 'Lỗi', description: 'Không thể cập nhật', variant: 'destructive' }); }
  }, []);

  const addLeader = useCallback(async () => {
    try {
      const res = await fetch('/api/leaders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentCode: 'NEW_' + Date.now(), agentName: 'Chưa nhập' }) });
      if (res.ok) { const newLeader = await res.json(); setLeaders(prev => [newLeader, ...prev]); toast({ title: 'Đã thêm', description: 'Nháy đúp ô để chỉnh sửa' }); }
    } catch { toast({ title: 'Lỗi', description: 'Không thể thêm', variant: 'destructive' }); }
  }, []);

  const deleteLeader = useCallback(async (id: string) => {
    if (!confirm('Xóa dòng này?')) return;
    try {
      const res = await fetch(`/api/leaders/${id}`, { method: 'DELETE' });
      if (res.ok) { setLeaders(prev => prev.filter(l => l.id !== id)); toast({ title: 'Đã xóa' }); }
    } catch { toast({ title: 'Lỗi', description: 'Không thể xóa', variant: 'destructive' }); }
  }, []);

  const updateRevenue = useCallback(async (id: string, field: string, value: any) => {
    try {
      const res = await fetch(`/api/revenue/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }) });
      if (res.ok) { setRevenue(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r)); }
    } catch { toast({ title: 'Lỗi', description: 'Không thể cập nhật', variant: 'destructive' }); }
  }, []);

  const addRevenue = useCallback(async () => {
    const month = new Date().toISOString().slice(0, 7);
    try {
      const res = await fetch('/api/revenue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ month, agentName: 'Chưa nhập' }) });
      if (res.ok) { const newRev = await res.json(); setRevenue(prev => [newRev, ...prev]); toast({ title: 'Đã thêm', description: 'Nháy đúp ô để chỉnh sửa' }); }
    } catch { toast({ title: 'Lỗi', description: 'Không thể thêm', variant: 'destructive' }); }
  }, []);

  const deleteRevenue = useCallback(async (id: string) => {
    if (!confirm('Xóa dòng này?')) return;
    try {
      const res = await fetch(`/api/revenue/${id}`, { method: 'DELETE' });
      if (res.ok) { setRevenue(prev => prev.filter(r => r.id !== id)); toast({ title: 'Đã xóa' }); }
    } catch { toast({ title: 'Lỗi', description: 'Không thể xóa', variant: 'destructive' }); }
  }, []);

  // Export to Excel
  const handleExport = useCallback(async (sheetName: string) => {
    try {
      const XLSX = await import('xlsx');
      let data: any[] = [];
      let filename = sheetName;

      if (sheetName === 'leaders') data = leaders.map(l => ({
        'Mã số': l.agentCode, 'Họ tên': l.agentName, 'Chức vụ': l.position,
        'Ban': l.ban, 'Nhóm': l.nhom, 'Mã nhóm': l.maNhom, 'Tiền/tháng': l.salary,
        'SĐT': l.phone, 'Email': l.email, 'Ghi chú': l.note,
      }));
      else if (sheetName === 'revenue') data = revenue.map(r => ({
        'Tháng': r.month, 'Mã nhóm': r.maNhom, 'Nhóm': r.nhom, 'Mã TVV': r.agentCode,
        'Tên TVV': r.agentName, 'Tổng IP': r.totalFYP, 'Tổng AFYP': r.totalAFYP,
        'Số HĐ': r.contractCount, 'Lượt HĐ': r.activityRounds, 'Ghi chú': r.note,
      }));
      else if (sheetName === 'contracts') data = contracts.map(c => ({
        'Số HĐ': c.contractNumber, 'Mã TVV': c.agentCode, 'Họ tên': c.agentName,
        'Chức vụ': c.position, 'Ban': c.ban, 'Nhóm': c.nhom, 'Mã nhóm': c.maNhom,
        'Ngày HL': new Date(c.effectiveDate).toLocaleDateString('vi-VN'),
        'Ngày cấp': new Date(c.issueDate).toLocaleDateString('vi-VN'),
        'IP': c.fyp, 'AFYP': c.afyp,
      }));
      else if (sheetName === 'staff') data = staff.map(s => ({
        'Mã số': s.agentCode, 'Họ tên': s.agentName, 'Chức vụ': s.position,
        'Nhóm': s.nhom, 'Mã nhóm': s.maNhom,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast({ title: 'Xuất Excel thành công' });
    } catch { toast({ title: 'Lỗi', description: 'Không thể xuất Excel', variant: 'destructive' }); }
  }, [leaders, revenue, contracts, staff]);

  // Import from Excel/CSV
  const handleImport = useCallback(async (sheetName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);

      if (sheetName === 'leaders') {
        const rows = data.map((r: any) => ({
          agentCode: String(r['Mã số'] || r['agentCode'] || ''),
          agentName: String(r['Họ tên'] || r['agentName'] || ''),
          position: String(r['Chức vụ'] || r['position'] || ''),
          ban: String(r['Ban'] || r['ban'] || ''),
          nhom: String(r['Nhóm'] || r['nhom'] || ''),
          maNhom: String(r['Mã nhóm'] || r['maNhom'] || ''),
          salary: parseFloat(r['Tiền/tháng'] || r['salary'] || 0) || 0,
          phone: String(r['SĐT'] || r['phone'] || ''),
          email: String(r['Email'] || r['email'] || ''),
          note: String(r['Ghi chú'] || r['note'] || ''),
        }));
        for (const row of rows) {
          await fetch('/api/leaders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) });
        }
        fetchLeaders();
      } else if (sheetName === 'revenue') {
        const rows = data.map((r: any) => ({
          month: String(r['Tháng'] || r['month'] || ''),
          maNhom: String(r['Mã nhóm'] || r['maNhom'] || ''),
          nhom: String(r['Nhóm'] || r['nhom'] || ''),
          agentCode: String(r['Mã TVV'] || r['agentCode'] || ''),
          agentName: String(r['Tên TVV'] || r['agentName'] || ''),
          totalFYP: parseFloat(r['Tổng IP'] || r['totalFYP'] || 0) || 0,
          totalAFYP: parseFloat(r['Tổng AFYP'] || r['totalAFYP'] || 0) || 0,
          contractCount: parseInt(r['Số HĐ'] || r['contractCount'] || 0) || 0,
          activityRounds: parseInt(r['Lượt HĐ'] || r['activityRounds'] || 0) || 0,
          note: String(r['Ghi chú'] || r['note'] || ''),
        }));
        await fetch('/api/revenue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rows) });
        fetchRevenue();
      }
      toast({ title: 'Import thành công', description: `${data.length} dòng đã được thêm` });
    } catch { toast({ title: 'Lỗi', description: 'Không thể import file', variant: 'destructive' }); }
    e.target.value = '';
  }, [fetchLeaders, fetchRevenue]);

  // Sort & filter
  const sortData = useCallback((data: any[], field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }, [sortField]);

  const getSorted = useCallback((data: any[]) => {
    if (!sortField) return data;
    return [...data].sort((a, b) => {
      const va = a[sortField], vb = b[sortField];
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }, [sortField, sortDir]);

  const getFiltered = useCallback((data: any[], fields: string[]) => {
    if (!searchTerm) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter(item => fields.some(f => String(item[f] || '').toLowerCase().includes(lower)));
  }, [searchTerm]);

  // Overview stats
  const totalLeaders = leaders.length;
  const totalStaff = staff.length;
  const totalContracts = contracts.length;
  const totalFYP = contracts.reduce((sum, c) => sum + c.fyp, 0);
  const totalRevenue = revenue.reduce((sum, r) => sum + r.totalFYP, 0);
  const totalSalary = leaders.reduce((sum, l) => sum + l.salary, 0);

  const SortIcon = ({ field }: { field: string }) => (
    <ArrowUpDown className={`w-3 h-3 inline ml-1 ${sortField === field ? 'text-amber-400' : 'text-white/40'}`} />
  );

  // Render overview
  const renderOverview = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-extrabold text-emerald-400">Tổng quan hệ thống</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Trưởng Ban/Nhóm', value: totalLeaders, icon: Users, color: 'bg-emerald-700', textColor: 'text-emerald-200' },
          { label: 'Tổng TVV', value: totalStaff, icon: UserCircle, color: 'bg-sky-700', textColor: 'text-sky-200' },
          { label: 'Tổng HĐ', value: totalContracts, icon: FileText, color: 'bg-amber-700', textColor: 'text-amber-200' },
          { label: 'Tổng IP (HĐ)', value: formatCurrency(totalFYP), icon: DollarSign, color: 'bg-violet-700', textColor: 'text-violet-200', isText: true },
          { label: 'Tổng lương TN', value: formatCurrency(totalSalary), icon: DollarSign, color: 'bg-rose-700', textColor: 'text-rose-200', isText: true },
        ].map((stat, i) => (
          <div key={i} className={`${stat.color} rounded-lg p-4 border border-white/10`}>
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
              <span className={`text-sm ${stat.textColor} font-bold`}>{stat.label}</span>
            </div>
            <p className="text-2xl font-extrabold text-white">{stat.isText ? stat.value : formatNumber(stat.value as number)}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="bg-emerald-900 rounded-lg p-4 border border-emerald-700">
          <h3 className="text-base font-bold text-emerald-300 mb-3">Doanh thu theo tháng</h3>
          {revenue.length === 0 ? (
            <p className="text-white/40 text-sm">Chưa có dữ liệu doanh thu</p>
          ) : (
            <div className="space-y-2">
              {Array.from(new Set(revenue.map(r => r.month))).sort().reverse().slice(0, 6).map(month => {
                const monthData = revenue.filter(r => r.month === month);
                const monthTotal = monthData.reduce((s, r) => s + r.totalFYP, 0);
                return (
                  <div key={month} className="flex items-center justify-between">
                    <span className="text-white text-sm font-medium">{month}</span>
                    <span className="text-amber-300 text-sm font-bold">{formatCurrency(monthTotal)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="bg-emerald-900 rounded-lg p-4 border border-emerald-700">
          <h3 className="text-base font-bold text-emerald-300 mb-3">Trưởng Ban/Nhóm</h3>
          {leaders.length === 0 ? (
            <p className="text-white/40 text-sm">Chưa có dữ liệu trưởng ban/nhóm</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {leaders.slice(0, 10).map(l => (
                <div key={l.id} className="flex items-center justify-between">
                  <span className="text-white text-sm">{l.agentName} <span className="text-white/40 text-xs">({l.position})</span></span>
                  <span className="text-amber-300 text-sm font-bold">{l.salary > 0 ? formatCurrency(l.salary) : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render leaders table
  const renderLeaders = () => {
    const filtered = getFiltered(getSorted(leaders), ['agentCode', 'agentName', 'position', 'nhom', 'ban']);
    return (
      <div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Button onClick={addLeader} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> Thêm dòng</Button>
          <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-white rounded-md text-xs font-medium cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> Import
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleImport('leaders', e)} />
          </label>
          <Button onClick={() => handleExport('leaders')} variant="outline" className="border-amber-600 text-amber-300 hover:bg-amber-700/20 h-8 text-xs"><Download className="w-3.5 h-3.5 mr-1" /> Xuất Excel</Button>
        </div>
        <div className="overflow-x-auto border border-emerald-600">
          <Table>
            <TableHeader>
              <TableRow className="bg-emerald-800 hover:bg-emerald-800">
                {[
                  { f: 'agentCode', l: 'Mã số' }, { f: 'agentName', l: 'Họ tên' }, { f: 'position', l: 'Chức vụ' },
                  { f: 'ban', l: 'Ban' }, { f: 'nhom', l: 'Nhóm' }, { f: 'maNhom', l: 'Mã nhóm' },
                  { f: 'salary', l: 'Tiền/tháng' }, { f: 'phone', l: 'SĐT' }, { f: 'email', l: 'Email' },
                  { f: 'note', l: 'Ghi chú' },
                ].map(col => (
                  <TableHead key={col.f} className="text-white text-xs font-bold cursor-pointer hover:text-amber-300 whitespace-nowrap" onClick={() => sortData(col.f)}>
                    {col.l} <SortIcon field={col.f} />
                  </TableHead>
                ))}
                <TableHead className="text-white text-xs w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
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
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={11} className="text-center text-gray-400 text-sm py-8">Chưa có dữ liệu. Nhấn "Thêm dòng" hoặc "Import" để bắt đầu.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-gray-400 mt-2">{filtered.length} dòng • Nháy đúp ô để chỉnh sửa</p>
      </div>
    );
  };

  // Render revenue table
  const renderRevenue = () => {
    const filtered = getFiltered(getSorted(revenue), ['month', 'maNhom', 'nhom', 'agentCode', 'agentName']);
    return (
      <div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Button onClick={addRevenue} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> Thêm dòng</Button>
          <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-white rounded-md text-xs font-medium cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> Import
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleImport('revenue', e)} />
          </label>
          <Button onClick={() => handleExport('revenue')} variant="outline" className="border-amber-600 text-amber-300 hover:bg-amber-700/20 h-8 text-xs"><Download className="w-3.5 h-3.5 mr-1" /> Xuất Excel</Button>
        </div>
        <div className="overflow-x-auto border border-emerald-600">
          <Table>
            <TableHeader>
              <TableRow className="bg-emerald-800 hover:bg-emerald-800">
                {[
                  { f: 'month', l: 'Tháng' }, { f: 'maNhom', l: 'Mã nhóm' }, { f: 'nhom', l: 'Nhóm' },
                  { f: 'agentCode', l: 'Mã TVV' }, { f: 'agentName', l: 'Tên TVV' },
                  { f: 'totalFYP', l: 'Tổng IP' }, { f: 'totalAFYP', l: 'Tổng AFYP' },
                  { f: 'contractCount', l: 'Số HĐ' }, { f: 'activityRounds', l: 'Lượt HĐ' }, { f: 'note', l: 'Ghi chú' },
                ].map(col => (
                  <TableHead key={col.f} className="text-white text-xs font-bold cursor-pointer hover:text-amber-300 whitespace-nowrap" onClick={() => sortData(col.f)}>
                    {col.l} <SortIcon field={col.f} />
                  </TableHead>
                ))}
                <TableHead className="text-white text-xs w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id} className="bg-white hover:bg-emerald-50 border-b border-gray-200">
                  <TableCell className="text-xs p-0"><EditableCell value={r.month} onSave={(v) => updateRevenue(r.id, 'month', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={r.maNhom} onSave={(v) => updateRevenue(r.id, 'maNhom', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={r.nhom} onSave={(v) => updateRevenue(r.id, 'nhom', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={r.agentCode} onSave={(v) => updateRevenue(r.id, 'agentCode', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={r.agentName} onSave={(v) => updateRevenue(r.id, 'agentName', v)} /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={r.totalFYP} onSave={(v) => updateRevenue(r.id, 'totalFYP', v)} type="number" className="text-right" /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={r.totalAFYP} onSave={(v) => updateRevenue(r.id, 'totalAFYP', v)} type="number" className="text-right" /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={r.contractCount} onSave={(v) => updateRevenue(r.id, 'contractCount', v)} type="number" className="text-right" /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={r.activityRounds} onSave={(v) => updateRevenue(r.id, 'activityRounds', v)} type="number" className="text-right" /></TableCell>
                  <TableCell className="text-xs p-0"><EditableCell value={r.note} onSave={(v) => updateRevenue(r.id, 'note', v)} /></TableCell>
                  <TableCell className="text-xs p-1"><Button variant="ghost" size="sm" onClick={() => deleteRevenue(r.id)} className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"><Trash2 className="w-3 h-3" /></Button></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={11} className="text-center text-gray-400 text-sm py-8">Chưa có dữ liệu. Nhấn "Thêm dòng" hoặc "Import" để bắt đầu.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-gray-400 mt-2">{filtered.length} dòng • Nháy đúp ô để chỉnh sửa</p>
      </div>
    );
  };

  // Render contracts (read-only)
  const renderContracts = () => {
    const filtered = getFiltered(getSorted(contracts), ['contractNumber', 'agentCode', 'agentName', 'nhom']);
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Button onClick={() => handleExport('contracts')} variant="outline" className="border-amber-600 text-amber-300 hover:bg-amber-700/20 h-8 text-xs"><Download className="w-3.5 h-3.5 mr-1" /> Xuất Excel</Button>
          <span className="text-xs text-gray-400 ml-2">Dữ liệu từ auto-sync Google Sheets (chỉ xem)</span>
        </div>
        <div className="overflow-x-auto border border-emerald-600">
          <Table>
            <TableHeader>
              <TableRow className="bg-emerald-800 hover:bg-emerald-800">
                {['Số HĐ', 'Mã TVV', 'Họ tên', 'Chức vụ', 'Ban', 'Nhóm', 'Mã nhóm', 'Ngày HL', 'IP', 'AFYP'].map((h, i) => (
                  <TableHead key={i} className="text-white text-xs font-bold whitespace-nowrap">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 200).map(c => (
                <TableRow key={c.id} className="bg-white hover:bg-emerald-50 border-b border-gray-200">
                  <TableCell className="text-xs">{c.contractNumber}</TableCell>
                  <TableCell className="text-xs font-mono">{c.agentCode}</TableCell>
                  <TableCell className="text-xs">{c.agentName}</TableCell>
                  <TableCell className="text-xs">{c.position}</TableCell>
                  <TableCell className="text-xs">{c.ban}</TableCell>
                  <TableCell className="text-xs">{c.nhom}</TableCell>
                  <TableCell className="text-xs font-mono">{c.maNhom}</TableCell>
                  <TableCell className="text-xs">{new Date(c.effectiveDate).toLocaleDateString('vi-VN')}</TableCell>
                  <TableCell className="text-xs text-right font-semibold text-emerald-700">{formatNumber(c.fyp)}</TableCell>
                  <TableCell className="text-xs text-right">{formatNumber(c.afyp)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-gray-400 mt-2">{filtered.length} dòng {filtered.length > 200 && '(hiển thị tối đa 200)'} • Dữ liệu chỉ xem</p>
      </div>
    );
  };

  // Render staff (read-only)
  const renderStaff = () => {
    const filtered = getFiltered(getSorted(staff), ['agentCode', 'agentName', 'nhom', 'position']);
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Button onClick={() => handleExport('staff')} variant="outline" className="border-amber-600 text-amber-300 hover:bg-amber-700/20 h-8 text-xs"><Download className="w-3.5 h-3.5 mr-1" /> Xuất Excel</Button>
          <span className="text-xs text-gray-400 ml-2">Dữ liệu từ auto-sync Google Sheets (chỉ xem)</span>
        </div>
        <div className="overflow-x-auto border border-emerald-600">
          <Table>
            <TableHeader>
              <TableRow className="bg-emerald-800 hover:bg-emerald-800">
                {['Mã số', 'Họ tên', 'Chức vụ', 'Nhóm', 'Mã nhóm', 'Ngày bắt đầu'].map((h, i) => (
                  <TableHead key={i} className="text-white text-xs font-bold whitespace-nowrap">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id} className="bg-white hover:bg-emerald-50 border-b border-gray-200">
                  <TableCell className="text-xs font-mono">{s.agentCode}</TableCell>
                  <TableCell className="text-xs">{s.agentName}</TableCell>
                  <TableCell className="text-xs">{s.position}</TableCell>
                  <TableCell className="text-xs">{s.nhom}</TableCell>
                  <TableCell className="text-xs font-mono">{s.maNhom}</TableCell>
                  <TableCell className="text-xs">{s.startDate ? new Date(s.startDate).toLocaleDateString('vi-VN') : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-gray-400 mt-2">{filtered.length} dòng • Dữ liệu chỉ xem</p>
      </div>
    );
  };

  const renderSheet = () => {
    if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /><span className="ml-3 text-emerald-300 text-sm">Đang tải...</span></div>;
    switch (activeSheet) {
      case 'overview': return renderOverview();
      case 'leaders': return renderLeaders();
      case 'revenue': return renderRevenue();
      case 'contracts': return renderContracts();
      case 'staff': return renderStaff();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0a0a1a]">
      {/* Header */}
      <header className="bg-emerald-900 border-b border-emerald-700 px-4 py-2 flex items-center gap-3 flex-shrink-0">
        <Button variant="ghost" onClick={() => router.push('/')} className="text-emerald-300 hover:text-white hover:bg-emerald-800 h-8 w-8 p-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-extrabold text-white">Quản Lý Dữ Liệu</h1>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-emerald-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm..."
              className="h-7 w-[180px] pl-7 text-xs bg-emerald-800 border-emerald-600 text-white placeholder-emerald-400"
            />
            {searchTerm && <X className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400 cursor-pointer" onClick={() => setSearchTerm('')} />}
          </div>
          <Button variant="ghost" onClick={() => loadSheet(activeSheet)} className="text-emerald-300 hover:text-white hover:bg-emerald-800 h-8 w-8 p-0">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <nav className="w-[180px] bg-emerald-900 border-r border-emerald-700 flex-shrink-0 overflow-y-auto">
          <div className="p-2 space-y-1">
            {SHEETS.map(sheet => {
              const isActive = activeSheet === sheet.key;
              return (
                <button
                  key={sheet.key}
                  onClick={() => { setActiveSheet(sheet.key); setSearchTerm(''); setSortField(''); }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold rounded-md transition-colors ${
                    isActive ? 'bg-emerald-600 text-white' : 'text-emerald-300 hover:bg-emerald-800 hover:text-white'
                  }`}
                >
                  <sheet.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{sheet.label}</span>
                </button>
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
