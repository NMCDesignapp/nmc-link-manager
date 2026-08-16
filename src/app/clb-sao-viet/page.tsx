'use client';

import { useMemo, useState } from 'react';
import { RefreshCw, Star } from 'lucide-react';
import { BackButton } from '@/components/back-button';
import { CLBDuyTriTVVSection } from '@/components/clb-sao-viet-retention-tvv';
import { CLBDuyTriTNSection } from '@/components/clb-sao-viet-retention-tn';

function getDefaultAssessment() {
  const now = new Date();
  const nextAssessment = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { year: nextAssessment.getFullYear(), month: nextAssessment.getMonth() + 1 };
}

const SELECT_CLASS =
  'h-10 rounded-lg border border-white/10 bg-black/25 px-3 text-sm font-semibold text-white outline-none transition focus:border-amber-400/60';

export default function CLBSaoVietPage() {
  const initial = useMemo(() => getDefaultAssessment(), []);
  const [assessmentYear, setAssessmentYear] = useState(initial.year);
  const [assessmentMonth, setAssessmentMonth] = useState(initial.month);
  const [refreshToken, setRefreshToken] = useState(0);

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(
    () => Array.from({ length: 7 }, (_, index) => currentYear - 3 + index),
    [currentYear],
  );

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
              onClick={() => setRefreshToken((value) => value + 1)}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 text-sm font-bold text-emerald-200 transition hover:bg-emerald-400/15"
            >
              <RefreshCw className="h-4 w-4" />
              Tính lại tất cả
            </button>
          </div>
        </header>

        <div className="mt-4 border border-amber-300/15 bg-amber-300/[0.035] px-4 py-3 text-xs leading-5 text-white/50">
          <strong className="text-amber-100">Kỳ xét dùng chung:</strong>{' '}
          tất cả các mục bên dưới đều sử dụng cùng Đợt 1/{assessmentMonth}/{assessmentYear} đã chọn phía trên.
        </div>

        <CLBDuyTriTVVSection year={assessmentYear} month={assessmentMonth} refreshToken={refreshToken} />
        <CLBDuyTriTNSection year={assessmentYear} month={assessmentMonth} refreshToken={refreshToken} />

        <section className="mt-5 border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-xs text-white/35">
          Các mục xét tiếp theo và phần tạo poster chúc mừng sẽ được bổ sung theo tiêu chí anh cung cấp ở bước tiếp theo.
        </section>
      </div>
    </main>
  );
}
