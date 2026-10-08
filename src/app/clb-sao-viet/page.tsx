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
const CLBPostAssessmentMembers = dynamic(
  () => import('@/components/clb-sao-viet-post-assessment').then((mod) => mod.CLBPostAssessmentMembers),
  { ssr: false, loading: () => <SectionLoading /> },
);
// nmc-clb-title-assessment-v1
const CLBTitleAssessmentSection = dynamic(
  () => import('@/components/clb-sao-viet-title-assessment').then((mod) => mod.CLBTitleAssessmentSection),
  { ssr: false, loading: () => <SectionLoading /> },
);
// nmc-clb-top-ip-v1
const CLBTopIPSection = dynamic(
  () => import('@/components/clb-sao-viet-top-ip').then((mod) => mod.CLBTopIPSection),
  { ssr: false, loading: () => <SectionLoading /> },
);

function SectionLoading() {
  return <div className="border-t border-[#aeb9b2] bg-[#f5f1e8] px-4 py-4 text-center text-xs text-[#b8c6c0]">Đang tải kết quả...</div>;
}

function getDefaultAssessment() {
  const now = new Date();
  const nextAssessment = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { year: nextAssessment.getFullYear(), month: nextAssessment.getMonth() + 1 };
}

const SELECT_CLASS =
  'h-10 rounded-lg border border-[#2f4a3f] bg-[#102019] px-3 text-sm font-semibold text-white outline-none transition focus:border-[#d3a62c]';

type FolderProps = {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

function AssessmentFolder({ title, open, onToggle, children }: FolderProps) {
  return (
    <section className="nmc-clb-folder mt-5 overflow-hidden border border-[#8c7730] bg-[#1e2a22] shadow-[0_5px_0_#020805]">
      <button
        type="button"
        onClick={onToggle}
        className="nmc-clb-folder-head flex w-full items-center justify-between bg-[#102019] px-4 py-3 text-left transition hover:bg-[#14271f] sm:px-5"
      >
        <span className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.08em] text-amber-100 sm:text-base">
          <FolderOpen className="h-4 w-4 text-amber-300" />
          {title}
        </span>
        {open ? <ChevronDown className="h-5 w-5 text-amber-200" /> : <ChevronRight className="h-5 w-5 text-amber-200" />}
      </button>
      {open ? <div className="nmc-clb-folder-body space-y-2 border-t border-[#87948b] bg-[#dce2de] p-2.5 sm:p-3">{children}</div> : null}
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
    <div className="nmc-clb-item overflow-hidden border border-[#6d8594] bg-[#284b61] shadow-[0_2px_0_#020805]">
      <button
        type="button"
        onClick={onToggle}
        className="nmc-clb-item-head flex w-full items-center justify-between bg-[#2e566d] px-4 py-3 text-left transition hover:bg-[#39677f]"
      >
        <span className="text-sm font-bold text-[#e6ebe8]">{title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-emerald-300" /> : <ChevronRight className="h-4 w-4 text-[#edf4f0]" />}
      </button>
      {open ? <div className="nmc-clb-item-body border-t border-[#2f4a3f] px-3 pb-3 sm:px-4">{children}</div> : null}
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
  const [membersFolderOpen, setMembersFolderOpen] = useState(false);
  const [titleFolderOpen, setTitleFolderOpen] = useState(false);
  const [topIpFolderOpen, setTopIpFolderOpen] = useState(false);
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
    <main className="nmc-clb-soft-skin min-h-screen bg-[#07100d] text-white">
<div className="relative mx-auto max-w-[1500px] px-3 py-4 sm:px-5 lg:px-8 lg:py-6">
        <header className="nmc-clb-header flex flex-col gap-4 border border-[#365b72] bg-[#102a3d] px-3 py-3 shadow-[0_5px_0_#020805] sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-4">
          <div className="flex items-center gap-3">
            <BackButton size={36} />
            <div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-[#f2bd3f] text-amber-300" />
                <h1 className="text-xl font-black tracking-[0.08em] text-amber-100 sm:text-2xl">CLB SAO VIỆT</h1>
              </div>
              <p className="mt-1 text-xs text-[#ded7c2] sm:text-sm">Tính kết quả CLB, xuất Excel và chuẩn bị dữ liệu chúc mừng</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-[#627888] bg-[#20394b] px-3 py-1.5 shadow-[0_2px_0_#020805]">
              <span className="text-xs font-semibold text-[#b9c7c0]">Năm xét</span>
              <select className={SELECT_CLASS} value={assessmentYear} onChange={(event) => setAssessmentYear(Number(event.target.value))}>
                {yearOptions.map((year) => <option key={year} value={year} className="bg-[#111915]">{year}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-[#627888] bg-[#20394b] px-3 py-1.5 shadow-[0_2px_0_#020805]">
              <span className="text-xs font-semibold text-[#b9c7c0]">Đợt xét</span>
              <select className={SELECT_CLASS} value={assessmentMonth} onChange={(event) => setAssessmentMonth(Number(event.target.value))}>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month} className="bg-[#111915]">1/{month}</option>)}
              </select>
            </label>
            <button onClick={() => setRefreshToken((value) => value + 1)} className="inline-flex h-11 items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 text-sm font-bold text-emerald-200 transition hover:bg-emerald-400/15">
              <RefreshCw className="h-4 w-4" /> Tính lại tất cả
            </button>
          </div>
        </header>

        <div className="nmc-clb-period-note mt-4 border border-[#a1842b] bg-[#403413] px-4 py-3 text-xs leading-5 text-[#d3d8d5] shadow-[0_4px_0_#020805]">
          <strong className="text-amber-100">Kỳ xét dùng chung:</strong>{' '}
          Xét duy trì, Xét gia nhập và DS thành viên sau đợt xét dùng Đợt 1/{assessmentMonth}/{assessmentYear} và 3 tháng liền trước. Xét danh hiệu dùng đúng bộ chỉ tiêu của Đợt 1/{assessmentMonth}/{assessmentYear} đã chọn. Xét Top IP chỉ lấy doanh số đúng 1 tháng liền trước theo Ngày PH.
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

        <AssessmentFolder
          title={`DS thành viên CLB Sao Việt sau đợt xét ngày 1/${assessmentMonth}/${assessmentYear}`}
          open={membersFolderOpen}
          onToggle={() => setMembersFolderOpen((value) => !value)}
        >
          {membersFolderOpen ? <CLBPostAssessmentMembers {...sharedProps} /> : null}
        </AssessmentFolder>

        <AssessmentFolder
          title="Xét danh hiệu CLB"
          open={titleFolderOpen}
          onToggle={() => setTitleFolderOpen((value) => !value)}
        >
          <AssessmentItem title="Xét danh hiệu - TVV" open={openItem === 'title-tvv'} onToggle={() => toggleItem('title-tvv')}>
            {openItem === 'title-tvv' ? <CLBTitleAssessmentSection {...sharedProps} program="tvv" /> : null}
          </AssessmentItem>
          <AssessmentItem title="Xét danh hiệu - TN KTM" open={openItem === 'title-tn-ktm'} onToggle={() => toggleItem('title-tn-ktm')}>
            {openItem === 'title-tn-ktm' ? <CLBTitleAssessmentSection {...sharedProps} program="tnKtm" /> : null}
          </AssessmentItem>
          <AssessmentItem title="Xét danh hiệu - TN TD" open={openItem === 'title-tn-td'} onToggle={() => toggleItem('title-tn-td')}>
            {openItem === 'title-tn-td' ? <CLBTitleAssessmentSection {...sharedProps} program="tnTd" /> : null}
          </AssessmentItem>
        </AssessmentFolder>

        <AssessmentFolder
          title="Xét Top IP"
          open={topIpFolderOpen}
          onToggle={() => setTopIpFolderOpen((value) => !value)}
        >
          {topIpFolderOpen ? <CLBTopIPSection {...sharedProps} /> : null}
        </AssessmentFolder>

        <section className="nmc-clb-footer mt-5 border border-[#81958a] bg-[#d8e2dc] p-4 text-center text-xs text-[#40564b] shadow-[0_3px_0_#020805]">
          Phần tạo poster chúc mừng sẽ được nối vào kết quả từng mục sau khi hoàn tất các tiêu chí xét.
        </section>
      </div>
    </main>
  );
}

// nmc-clb-solid-compact-v2
