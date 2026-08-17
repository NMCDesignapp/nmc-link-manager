'use client';

import { useMemo, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, ChevronRight, FolderOpen, RefreshCw, Star } from 'lucide-react';
import { BackButton } from '@/components/back-button';

const CLBDuyTriTVVSection = dynamic(
  () => import('@/components/clb-sao-viet-retention-tvv').then((mod) => mod.CLBDuyTriTVVSection),
  { ssr: false, loading: () => <SectionLoading /> },
);
const CLBDuyTriTNSection = dynamic(
  () => import('@/components/clb-sao-viet-retention-tn').then((mod) => mod.CLBDuyTriTNSection),
  { ssr: false, loading: () => <SectionLoading /> },
);
const CLBDuyTriTTNSection = dynamic(
  () => import('@/components/clb-sao-viet-retention-ttn').then((mod) => mod.CLBDuyTriTTNSection),
  { ssr: false, loading: () => <SectionLoading /> },
);
const CLBGiaNhapTVVSection = dynamic(
  () => import('@/components/clb-sao-viet-entry-simple').then((mod) => mod.CLBGiaNhapTVVSection),
  { ssr: false, loading: () => <SectionLoading /> },
);
const CLBGiaNhapTNSection = dynamic(
  () => import('@/components/clb-sao-viet-entry-simple').then((mod) => mod.CLBGiaNhapTNSection),
  { ssr: false, loading: () => <SectionLoading /> },
);
const CLBGiaNhapTTNSection = dynamic(
  () => import('@/components/clb-sao-viet-entry-ttn').then((mod) => mod.CLBGiaNhapTTNSection),
  { ssr: false, loading: () => <SectionLoading /> },
);

function SectionLoading() {
  return <div className="border-t border-white/10 bg-black/10 px-4 py-5 text-center text-xs text-white/40">Đang tải kết quả...</div>;
}

function getDefaultAssessment() {
  const now = new Date();
  const nextAssessment = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { year: nextAssessment.getFullYear(), month: nextAssessment.getMonth() + 1 };
}

const SELECT_CLASS =
  'h-10 rounded-lg border border-white/10 bg-black/25 px-3 text-sm font-semibold text-white outline-none transition focus:border-amber-400/60';

type FolderProps = {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

function AssessmentFolder({ title, open, onToggle, children }: FolderProps) {
  return (
    <section className="mt-5 overflow-hidden border border-amber-300/20 bg-[#0b1511] shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between bg-[#102019] px-4 py-3 text-left transition hover:bg-[#14271f] sm:px-5"
      >
        <span className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.08em] text-amber-100 sm:text-base">
          <FolderOpen className="h-4 w-4 text-amber-300" />
          {title}
        </span>
        {open ? <ChevronDown className="h-5 w-5 text-amber-200" /> : <ChevronRight className="h-5 w-5 text-amber-200" />}
      </button>
      {open ? <div className="space-y-2 border-t border-white/10 p-2.5 sm:p-3">{children}</div> : null}
    </section>
  );
}

type ItemProps = {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

function AssessmentItem({ title, open, onToggle, children }: ItemProps) {
  return (
    <div className="overflow-hidden border border-white/10 bg-[#0e1915]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-white/[0.035]"
      >
        <span className="text-sm font-bold text-white/85">{title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-emerald-300" /> : <ChevronRight className="h-4 w-4 text-white/45" />}
      </button>
      {open ? <div className="border-t border-white/10 px-3 pb-3 sm:px-4">{children}</div> : null}
    </div>
  );
}

export default function CLBSaoVietPage() {
  const initial = useMemo(() => getDefaultAssessment(), []);
  const [assessmentYear, setAssessmentYear] = useState(initial.year);
  const [assessmentMonth, setAssessmentMonth] = useState(initial.month);
  const [refreshToken, setRefreshToken] = useState(0);
  const [retentionFolderOpen, setRetentionFolderOpen] = useState(true);
  const [entryFolderOpen, setEntryFolderOpen] = useState(true);
  const [openItem, setOpenItem] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(
    () => Array.from({ length: 7 }, (_, index) => currentYear - 3 + index),
    [currentYear],
  );

  const toggleItem = (key: string) => {
    setOpenItem((current) => (current === key ? null : key));
  };

  const sharedProps = { year: assessmentYear, month: assessmentMonth, refreshToken };

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
                <h1 className="text-xl font-black tracking-[0.08em] text-amber-100 sm:text-2xl">CLB SAO VIỆT</h1>
              </div>
              <p className="mt-1 text-xs text-white/50 sm:text-sm">Tính kết quả CLB, xuất Excel và chuẩn bị dữ liệu chúc mừng</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-1.5">
              <span className="text-xs font-semibold text-white/55">Năm xét</span>
              <select className={SELECT_CLASS} value={assessmentYear} onChange={(event) => setAssessmentYear(Number(event.target.value))}>
                {yearOptions.map((year) => <option key={year} value={year} className="bg-[#111915]">{year}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-1.5">
              <span className="text-xs font-semibold text-white/55">Đợt xét</span>
              <select className={SELECT_CLASS} value={assessmentMonth} onChange={(event) => setAssessmentMonth(Number(event.target.value))}>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month} className="bg-[#111915]">1/{month}</option>)}
              </select>
            </label>
            <button onClick={() => setRefreshToken((value) => value + 1)} className="inline-flex h-11 items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 text-sm font-bold text-emerald-200 transition hover:bg-emerald-400/15">
              <RefreshCw className="h-4 w-4" /> Tính lại tất cả
            </button>
          </div>
        </header>

        <div className="mt-4 border border-amber-300/15 bg-amber-300/[0.035] px-4 py-3 text-xs leading-5 text-white/50">
          <strong className="text-amber-100">Kỳ xét dùng chung:</strong>{' '}
          tất cả mục Xét duy trì và Xét gia nhập đều sử dụng Đợt 1/{assessmentMonth}/{assessmentYear} đã chọn phía trên và lấy 3 tháng liền trước.
        </div>

        <AssessmentFolder title="Xét duy trì" open={retentionFolderOpen} onToggle={() => setRetentionFolderOpen((value) => !value)}>
          <AssessmentItem title="Xét duy trì - TVV" open={openItem === 'retention-tvv'} onToggle={() => toggleItem('retention-tvv')}>
            {openItem === 'retention-tvv' ? <CLBDuyTriTVVSection {...sharedProps} /> : null}
          </AssessmentItem>
          <AssessmentItem title="Xét duy trì - TN" open={openItem === 'retention-tn'} onToggle={() => toggleItem('retention-tn')}>
            {openItem === 'retention-tn' ? <CLBDuyTriTNSection {...sharedProps} /> : null}
          </AssessmentItem>
          <AssessmentItem title="Xét duy trì - TTN" open={openItem === 'retention-ttn'} onToggle={() => toggleItem('retention-ttn')}>
            {openItem === 'retention-ttn' ? <CLBDuyTriTTNSection {...sharedProps} /> : null}
          </AssessmentItem>
        </AssessmentFolder>

        <AssessmentFolder title="Xét gia nhập" open={entryFolderOpen} onToggle={() => setEntryFolderOpen((value) => !value)}>
          <AssessmentItem title="Xét gia nhập - TVV" open={openItem === 'entry-tvv'} onToggle={() => toggleItem('entry-tvv')}>
            {openItem === 'entry-tvv' ? <CLBGiaNhapTVVSection {...sharedProps} /> : null}
          </AssessmentItem>
          <AssessmentItem title="Xét gia nhập - TN" open={openItem === 'entry-tn'} onToggle={() => toggleItem('entry-tn')}>
            {openItem === 'entry-tn' ? <CLBGiaNhapTNSection {...sharedProps} /> : null}
          </AssessmentItem>
          <AssessmentItem title="Xét gia nhập - TTN" open={openItem === 'entry-ttn'} onToggle={() => toggleItem('entry-ttn')}>
            {openItem === 'entry-ttn' ? <CLBGiaNhapTTNSection {...sharedProps} /> : null}
          </AssessmentItem>
        </AssessmentFolder>

        <section className="mt-5 border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-xs text-white/35">
          Phần tạo poster chúc mừng sẽ được nối vào kết quả từng mục sau khi hoàn tất các tiêu chí xét.
        </section>
      </div>
    </main>
  );
}
