export type TitleAssessmentProgram = 'tvv' | 'tnKtm' | 'tnTd';

export type TitleAssessmentRowMetrics = {
  rank: string;
  fypThang?: number;
  fypLuyKe?: number;
  fypTVVm?: number;
  slTvvmHDC?: number;
};

export type TitleTier = {
  rank: 'Vàng' | 'Bạch Kim' | 'Kim Cương';
  requirements: string[];
  fyp?: number;
  monthlyFyp?: number;
  hdc?: number;
  colors: { header: string; body: string; text: string };
};

const COLORS = {
  'Vàng': { header: '#B7791F', body: '#FFFBEB', text: '#78350F' },
  'Bạch Kim': { header: '#4B5563', body: '#F3F4F6', text: '#1F2937' },
  'Kim Cương': { header: '#0E7490', body: '#ECFEFF', text: '#155E75' },
} as const;

export function getTitleThresholdPeriod(year: number, month: number) {
  const thresholdMonth = Math.min(12, Math.max(6, month));
  return {
    year,
    month: thresholdMonth,
    thresholdIndex: thresholdMonth - 6,
    label: '1/' + thresholdMonth + '/' + year,
  };
}

export function compactAmount(value: number): string {
  if (value >= 1_000_000_000) {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value / 1_000_000_000) + ' tỷ';
  }
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value / 1_000_000) + ' triệu';
}

export function buildTitleTiers(program: TitleAssessmentProgram, thresholds: any): TitleTier[] {
  if (program === 'tnTd') {
    return (['Vàng', 'Bạch Kim'] as const).map((rank) => {
      const value = rank === 'Vàng' ? thresholds.vang : thresholds.bachkim;
      return {
        rank,
        requirements: ['FYP TVVm ≥ ' + compactAmount(value.fyp), 'TVVm HĐC ≥ ' + value.hdc],
        fyp: value.fyp,
        hdc: value.hdc,
        colors: COLORS[rank],
      };
    });
  }
  const monthlyFyp = program === 'tvv' ? Number(thresholds.monthlyFypMin || 0) : undefined;
  return (['Vàng', 'Bạch Kim', 'Kim Cương'] as const).map((rank) => {
    const key = rank === 'Vàng' ? 'vang' : rank === 'Bạch Kim' ? 'bachkim' : 'kimcuong';
    const fyp = Number(thresholds[key] || 0);
    return {
      rank,
      requirements: [
        'FYP lũy kế ≥ ' + compactAmount(fyp),
        ...(monthlyFyp ? ['FYP tháng ≥ ' + compactAmount(monthlyFyp)] : []),
      ],
      fyp,
      monthlyFyp,
      colors: COLORS[rank],
    };
  });
}

export function getTitleTierStatus(
  program: TitleAssessmentProgram,
  row: TitleAssessmentRowMetrics,
  tier: TitleTier,
): { kind: 'achieved' | 'surpassed' | 'missing'; label: string; details: string[] } {
  const details: string[] = [];
  if (program === 'tnTd') {
    const missingFyp = Math.max(0, Number(tier.fyp || 0) - Number(row.fypTVVm || 0));
    const missingHdc = Math.max(0, Number(tier.hdc || 0) - Number(row.slTvvmHDC || 0));
    if (missingFyp > 0) details.push('Thiếu FYP ' + compactAmount(missingFyp));
    if (missingHdc > 0) details.push('Thiếu ' + missingHdc + ' TVVm HĐC');
  } else {
    const missingFyp = Math.max(0, Number(tier.fyp || 0) - Number(row.fypLuyKe || 0));
    if (missingFyp > 0) details.push('Thiếu FYP ' + compactAmount(missingFyp));
    if (program === 'tvv') {
      const missingMonthly = Math.max(0, Number(tier.monthlyFyp || 0) - Number(row.fypThang || 0));
      if (missingMonthly > 0) details.push('Thiếu FYP tháng ' + compactAmount(missingMonthly));
    }
  }
  if (details.length) return { kind: 'missing', label: details.join(' • '), details };
  if (row.rank === tier.rank) return { kind: 'achieved', label: 'ĐẠT', details: [] };
  return { kind: 'surpassed', label: 'ĐÃ VƯỢT', details: [] };
}
