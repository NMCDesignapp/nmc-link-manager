'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Star,
  Table2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { BackButton } from '@/components/back-button';

type MonthRef = {
  year: number;
  month: number;
  key: string;
  label: string;
};

type RetentionRow = {
  id: string;
  ad: string;
  nhom: string;
  agentCode: string;
  agentName: string;
  chucVu: string;
  note: string;
  monthlyIP: number[];
  qualifyingMonths: number;
  passed: boolean;
  result: string;
};

type RetentionResponse = {
  assessment: { year: number; month: number; label: string };
  rule: {
    ipThreshold: number;
    requiredMonths: number;
    totalMonths: number;
    description: string;
  };
  months: MonthRef[];
  summary: { total: number; passed: number; failed: number };
  rows: RetentionRow[];
};

function getDefaultAssessment() {
  const now = new Date();
  const nextAssessment = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { year: nextAssessment.getFullYear(), month: nextAssessment.getMonth() + 1 };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatMoney(value: number) {
  return `${formatNumber(value)}đ`;
}

function assessmentLabel(month: number, year: number) {
  return `Đợt 1/${month}/${year}`;
}

const SELECT_CLASS =
  'h-10 rounded-lg border border-white/10 bg-black/25 px-3 text-sm font-semibold text-white outline-none transition focus:border-amber-400/60';

export default function CLBSaoVietPage() {
  const initial = useMemo(() => getDefaultAssessment(), []);
  const [assessmentYear, setAssessmentYear] = useState(initial.year);
  const [assessmentMonth, setAssessmentMonth] = useState(initial.month);
  const [data, setData] = useState<RetentionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [exporting, setExporting] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(
    () => Array.from({ length: 7 }, (_, index) => currentYear - 3 + index),
    [currentYear],
  );

  const loadResult = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/clb-sao-viet/duy-tri?year=${assessmentYear}&month=${assessmentMonth}`,
        { cache: 'no-store' },
      );
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || 'Không thể tính kết quả');
      setData(json);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Không thể tính kết quả');
    } finally {
      setLoading(false);
    }
  }, [assessmentMonth, assessmentYear]);

  useEffect(() => {
    loadResult();
  }, [loadResult]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi-VN');
    return (data?.rows || []).filter((row) => {
      if (statusFilter === 'passed' && !row.passed) return false;
      if (statusFilter === 'failed' && row.passed) return false;
      if (!keyword) return true;
      return [row.agentCode, row.agentName, row.nhom, row.ad, row.chucVu]
        .join(' ')
        .toLocaleLowerCase('vi-VN')
        .includes(keyword);
    });
  }, [data?.rows, search, statusFilter]);

  const handleExportExcel = useCallback(async () => {
    if (!data || data.rows.length === 0) return;
    setExporting(true);
    try {
      const XLSX = await import('xlsx-js-style');
      const monthHeaders = data.months.map((month) => `TỔNG IP T${month.month}`);
      const headers = [
        'STT',
        'AD',
        'NHÓM',
        'MÃ ĐL',
        'HỌ TÊN',
        'CHỨC VỤ',
        ...monthHeaders,
        'SỐ THÁNG IP ≥ 12 TRIỆU',
        'KẾT QUẢ',
      ];
      const rows = data.rows.map((row, index) => [
        index + 1,
        row.ad,
        row.nhom,
        row.agentCode,
        row.agentName,
        row.chucVu,
        ...row.monthlyIP,
        row.qualifyingMonths,
        row.result,
      ]);

      const aoa: (string | number)[][] = [
        ['CLB SAO VIỆT - XÉT DUY TRÌ TVV'],
        [`Đợt xét: ${data.assessment.label}`],
        [`Điều kiện: ${data.rule.description}`],
        [],
        headers,
        ...rows,
      ];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const lastCol = headers.length - 1;
      const lastRow = rows.length + 4;
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } },
      ];
      ws['!cols'] = headers.map((header, index) => {
        if (index === 0) return { wch: 7 };
        if (index === 4) return { wch: 28 };
        if (index === 5) return { wch: 20 };
        if (index >= 6 && index <= 8) return { wch: 17 };
        if (index === headers.length - 2) return { wch: 22 };
        if (index === headers.length - 1) return { wch: 18 };
        return { wch: 16 };
      });
      ws['!rows'] = [
        { hpt: 28 },
        { hpt: 22 },
        { hpt: 30 },
        { hpt: 8 },
        { hpt: 32 },
        ...rows.map(() => ({ hpt: 24 })),
      ];
      ws['!autofilter'] = {
        ref: XLSX.utils.encode_range({ s: { r: 4, c: 0 }, e: { r: lastRow, c: lastCol } }),
      };
      ws['!views'] = [{ state: 'frozen', ySplit: 5 }];

      const titleStyle = {
        font: { bold: true, color: { rgb: '7A5200' }, sz: 16 },
        fill: { fgColor: { rgb: 'FFF2CC' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
      const subStyle = {
        font: { bold: true, color: { rgb: '5B4300' }, sz: 11 },
        fill: { fgColor: { rgb: 'FFF9E6' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      };
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
        fill: { fgColor: { rgb: '7A5200' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'D6B656' } },
          bottom: { style: 'thin', color: { rgb: 'D6B656' } },
          left: { style: 'thin', color: { rgb: 'D6B656' } },
          right: { style: 'thin', color: { rgb: 'D6B656' } },
        },
      };
      const bodyBorder = {
        top: { style: 'thin', color: { rgb: 'E7D8A8' } },
        bottom: { style: 'thin', color: { rgb: 'E7D8A8' } },
        left: { style: 'thin', color: { rgb: 'E7D8A8' } },
        right: { style: 'thin', color: { rgb: 'E7D8A8' } },
      };

      for (let c = 0; c <= lastCol; c += 1) {
        const titleCell = ws[XLSX.utils.encode_cell({ r: 0, c })];
        const assessmentCell = ws[XLSX.utils.encode_cell({ r: 1, c })];
        const ruleCell = ws[XLSX.utils.encode_cell({ r: 2, c })];
        if (titleCell) titleCell.s = titleStyle;
        if (assessmentCell) assessmentCell.s = subStyle;
        if (ruleCell) ruleCell.s = subStyle;

        const headerCell = ws[XLSX.utils.encode_cell({ r: 4, c })];
        if (headerCell) headerCell.s = headerStyle;
      }

      for (let r = 5; r <= lastRow; r += 1) {
        const rowData = data.rows[r - 5];
        for (let c = 0; c <= lastCol; c += 1) {
          const cell = ws[XLSX.utils.encode_cell({ r, c })];
          if (!cell) continue;
          const isNumeric = c === 0 || (c >= 6 && c <= 9);
          const isResult = c === lastCol;
          cell.s = {
            font: isResult
              ? { bold: true, color: { rgb: rowData?.passed ? '137333' : 'C5221F' } }
              : { color: { rgb: '202124' } },
            fill: isResult
              ? { fgColor: { rgb: rowData?.passed ? 'E6F4EA' : 'FCE8E6' } }
              : undefined,
            alignment: {
              horizontal: isNumeric || isResult ? 'center' : 'left',
              vertical: 'center',
              wrapText: true,
            },
            border: bodyBorder,
          };
          if (c >= 6 && c <= 8 && typeof cell.v === 'number') cell.z = '#,##0';
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Xét duy trì - TVV');
      const fileName = `CLB_Sao_Viet_Xet_Duy_Tri_TVV_${data.assessment.label.replace(/\//g, '-')}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      alert(`Không thể xuất Excel: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExporting(false);
    }
  }, [data]);

  return (
    <main className="min-h-screen bg-[#07100d] text-white">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 15% 10%, rgba(245,158,11,0.12), transparent 34%), radial-gradient(circle at 85% 18%, rgba(0,255,136,0.08), transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.015), transparent 35%)',
        }}
      />

      <div className="relative mx-auto max-w-[1500px] px-3 py-4 sm:px-5 lg:px-8 lg:py-6">
        <header className="flex flex-col gap-4 border-b border-amber-300/15 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BackButton size={36} />
            <div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-amber-300/20 text-amber-300" />
                <h1 className="text-xl font-black tracking-[0.08em] text-amber-100 sm:text-2xl">
                  CLB SAO VIỆT
                </h1>
              </div>
              <p className="mt-1 text-xs text-white/50 sm:text-sm">
                Tính kết quả CLB, xuất Excel và chuẩn bị dữ liệu chúc mừng
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-1.5">
              <span className="text-xs font-semibold text-white/55">Năm xét</span>
              <select
                className={SELECT_CLASS}
                value={assessmentYear}
                onChange={(event) => setAssessmentYear(Number(event.target.value))}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year} className="bg-[#111915]">
                    {year}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-1.5">
              <span className="text-xs font-semibold text-white/55">Đợt xét</span>
              <select
                className={SELECT_CLASS}
                value={assessmentMonth}
                onChange={(event) => setAssessmentMonth(Number(event.target.value))}
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                  <option key={month} value={month} className="bg-[#111915]">
                    1/{month}
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={loadResult}
              disabled={loading}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 text-sm font-bold text-emerald-200 transition hover:bg-emerald-400/15 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Tính lại
            </button>
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="border border-white/10 bg-white/[0.035] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/45">Đối tượng xét</span>
              <Users className="h-5 w-5 text-amber-300" />
            </div>
            <div className="mt-3 text-3xl font-black text-white">{loading ? '—' : data?.summary.total ?? 0}</div>
            <div className="mt-1 text-xs text-white/45">Toàn bộ DS thành viên CLB Sao Việt</div>
          </div>
          <div className="border border-emerald-400/20 bg-emerald-400/[0.055] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-100/60">Đạt duy trì</span>
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
            </div>
            <div className="mt-3 text-3xl font-black text-emerald-200">{loading ? '—' : data?.summary.passed ?? 0}</div>
            <div className="mt-1 text-xs text-emerald-100/45">Có ít nhất 2/3 tháng đạt chuẩn</div>
          </div>
          <div className="border border-rose-400/20 bg-rose-400/[0.05] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-rose-100/60">Không đạt</span>
              <XCircle className="h-5 w-5 text-rose-300" />
            </div>
            <div className="mt-3 text-3xl font-black text-rose-200">{loading ? '—' : data?.summary.failed ?? 0}</div>
            <div className="mt-1 text-xs text-rose-100/45">Có dưới 2 tháng đạt chuẩn</div>
          </div>
        </section>

        {error && (
          <div className="mt-5 border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        <section className="mt-5">
          <div className="relative overflow-hidden border border-amber-300/25 bg-[#0b1511]/95 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
            <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-amber-300 via-amber-500 to-transparent" />
            <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center lg:p-6">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/10 text-lg font-black text-amber-200">
                    1
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-amber-100 sm:text-xl">Xét duy trì - TVV</h2>
                    <p className="mt-1 text-sm text-white/50">
                      {data?.assessment ? assessmentLabel(data.assessment.month, data.assessment.year) : assessmentLabel(assessmentMonth, assessmentYear)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/65">
                  <span>
                    Điều kiện: <strong className="text-white">ít nhất 2/3 tháng có Tổng IP ≥ 12 triệu</strong>
                  </span>
                  {data?.months?.length === 3 && (
                    <span>
                      Kỳ doanh số: <strong className="text-amber-100">{data.months.map((month) => month.label).join(' • ')}</strong>
                    </span>
                  )}
                </div>

                <p className="mt-3 text-xs leading-5 text-white/40">
                  IP từng tháng được tổng hợp duy nhất theo Ngày phát hành của hợp đồng.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <button
                  onClick={() => setDetailOpen(true)}
                  disabled={loading || !data}
                  className="inline-flex h-11 items-center gap-2 border border-amber-300/35 bg-amber-300/10 px-4 text-sm font-bold text-amber-100 transition hover:bg-amber-300/15 disabled:opacity-40"
                >
                  <Table2 className="h-4 w-4" />
                  Xem bảng chi tiết
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={loading || exporting || !data || data.rows.length === 0}
                  className="inline-flex h-11 items-center gap-2 border border-emerald-400/30 bg-emerald-400/10 px-4 text-sm font-bold text-emerald-100 transition hover:bg-emerald-400/15 disabled:opacity-40"
                >
                  {exporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                  Xuất Excel kết quả
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-xs text-white/35">
          Các mục xét tiếp theo và phần tạo poster chúc mừng sẽ được bổ sung theo tiêu chí anh cung cấp ở bước tiếp theo.
        </section>
      </div>

      {detailOpen && data && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-2 backdrop-blur-sm sm:p-4">
          <div className="flex h-[94vh] w-full max-w-[1700px] flex-col overflow-hidden border border-amber-300/25 bg-[#08110e] shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-amber-300/20 text-amber-300" />
                  <h3 className="font-black text-amber-100">XÉT DUY TRÌ - TVV</h3>
                </div>
                <p className="mt-1 text-xs text-white/45">
                  {assessmentLabel(data.assessment.month, data.assessment.year)} • {data.rule.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[220px] flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm tên, mã ĐL, nhóm..."
                    className="h-10 w-full rounded-lg border border-white/10 bg-black/25 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-amber-300/40 sm:w-[270px]"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'all' | 'passed' | 'failed')}
                  className={SELECT_CLASS}
                >
                  <option value="all" className="bg-[#111915]">Tất cả kết quả</option>
                  <option value="passed" className="bg-[#111915]">Đạt duy trì</option>
                  <option value="failed" className="bg-[#111915]">Không đạt</option>
                </select>
                <button
                  onClick={handleExportExcel}
                  disabled={exporting}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 text-xs font-bold text-emerald-100"
                >
                  <Download className="h-4 w-4" /> Excel
                </button>
                <button
                  onClick={() => setDetailOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/65 transition hover:bg-white/10 hover:text-white"
                  aria-label="Đóng bảng chi tiết"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="min-w-[1180px] w-full border-collapse text-sm">
                <thead className="sticky top-0 z-20 bg-[#6f4b08] text-[11px] uppercase tracking-wide text-white shadow-md">
                  <tr>
                    <th className="border border-amber-200/20 px-2 py-3 text-center">STT</th>
                    <th className="border border-amber-200/20 px-3 py-3 text-left">AD</th>
                    <th className="border border-amber-200/20 px-3 py-3 text-left">Nhóm</th>
                    <th className="border border-amber-200/20 px-3 py-3 text-center">Mã ĐL</th>
                    <th className="border border-amber-200/20 px-3 py-3 text-left">Họ tên</th>
                    <th className="border border-amber-200/20 px-3 py-3 text-left">Chức vụ</th>
                    {data.months.map((month) => (
                      <th key={month.key} className="border border-amber-200/20 px-3 py-3 text-center">
                        Tổng IP T{month.month}
                      </th>
                    ))}
                    <th className="border border-amber-200/20 px-3 py-3 text-center">Số tháng ≥ 12tr</th>
                    <th className="border border-amber-200/20 px-3 py-3 text-center">Kết quả</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => (
                    <tr key={row.id} className="odd:bg-white/[0.018] even:bg-white/[0.04] hover:bg-amber-300/[0.05]">
                      <td className="border border-white/[0.07] px-2 py-2.5 text-center text-white/55">{index + 1}</td>
                      <td className="border border-white/[0.07] px-3 py-2.5 text-white/65">{row.ad || '—'}</td>
                      <td className="border border-white/[0.07] px-3 py-2.5 text-white/65">{row.nhom || '—'}</td>
                      <td className="border border-white/[0.07] px-3 py-2.5 text-center font-mono text-xs text-amber-100/80">{row.agentCode || '—'}</td>
                      <td className="border border-white/[0.07] px-3 py-2.5 font-semibold text-white">{row.agentName || '—'}</td>
                      <td className="border border-white/[0.07] px-3 py-2.5 text-white/60">{row.chucVu || '—'}</td>
                      {row.monthlyIP.map((value, monthIndex) => (
                        <td
                          key={`${row.id}-${data.months[monthIndex]?.key || monthIndex}`}
                          className={`border border-white/[0.07] px-3 py-2.5 text-center font-semibold ${value >= data.rule.ipThreshold ? 'bg-emerald-400/[0.07] text-emerald-200' : 'text-white/70'}`}
                        >
                          {formatMoney(value)}
                        </td>
                      ))}
                      <td className="border border-white/[0.07] px-3 py-2.5 text-center text-lg font-black text-amber-100">{row.qualifyingMonths}</td>
                      <td className="border border-white/[0.07] px-3 py-2.5 text-center">
                        <span
                          className={`inline-flex min-w-[108px] items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black ${
                            row.passed
                              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                              : 'border-rose-400/30 bg-rose-400/10 text-rose-200'
                          }`}
                        >
                          {row.passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                          {row.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredRows.length === 0 && (
                <div className="flex h-40 items-center justify-center text-sm text-white/35">Không có dữ liệu phù hợp bộ lọc.</div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black/20 px-4 py-2.5 text-xs text-white/45">
              <span>Hiển thị {filteredRows.length}/{data.rows.length} thành viên</span>
              <span>
                Chuẩn tháng: <strong className="text-amber-100">IP ≥ {formatNumber(data.rule.ipThreshold)}</strong> • Chuẩn duy trì:{' '}
                <strong className="text-emerald-200">≥ {data.rule.requiredMonths}/{data.rule.totalMonths} tháng</strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
