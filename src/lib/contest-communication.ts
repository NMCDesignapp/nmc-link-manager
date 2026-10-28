import { getConditionLabel, type BonusTier, type ContestConfig, type RecruitmentContestConfig } from './contest-calculator.ts';

export type CommunicationLine = { text: string; emphasis?: boolean; tone?: 'urgent' | 'title' };
export type ContestCommunication = { lines: CommunicationLine[]; text: string };
const number = (n: number) => n.toLocaleString('vi-VN');
const money = (n: number) => `${number(n)} đ`;
const day = (value: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
const date = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'Chưa xác định' : d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Bangkok' });
};

export function closingNotice(endDate: string, now: Date): CommunicationLine {
  const end = endDate.slice(0, 10);
  const delta = (Date.parse(end) - Date.parse(day(now))) / 86400000;
  if (!Number.isFinite(delta)) return { text: '⏰ Chưa xác định ngày kết thúc.', emphasis: true };
  if (delta < 0) return { text: `🏁 Chương trình đã kết thúc ngày ${date(endDate)}.`, emphasis: true };
  if (delta === 0) return { text: '🚨 HÔM NAY LÀ NGÀY CUỐI! Cùng tăng tốc trước khi chốt chương trình thi đua!', emphasis: true, tone: 'urgent' };
  if (delta === 1) return { text: '🔥 CHỈ CÒN HÔM NAY VÀ NGÀY MAI! Cùng tăng tốc trước khi chốt chương trình thi đua!', emphasis: true, tone: 'urgent' };
  if (delta === 2) return { text: `🔥 CHỈ CÒN 2 NGÀY NỮA! Chương trình kết thúc ngày ${date(endDate)}.`, emphasis: true, tone: 'urgent' };
  return { text: `⏰ Chương trình kết thúc ngày ${date(endDate)}.`, emphasis: true };
}

export function successfulSyncTime(settings: Record<string, string>, now = new Date()): string | null {
  // This is the server acknowledgement of a complete successful local sync,
  // never the browser refresh time, heartbeat, file mtime or export time.
  if (settings['nmc-sync-source'] !== 'data-hub') return null;
  const value = settings['nmc-data-hub-last-sync-at'];
  const time = Date.parse(value || '');
  return Number.isFinite(time) && time <= now.getTime() ? new Date(time).toISOString() : null;
}

function reward(t: BonusTier): string {
  switch (t.bonusType) {
    case 'gift': return t.bonusText || 'Quà tặng theo thể lệ';
    case 'percent': return `${number(t.bonusPercent)}% × IP đủ điều kiện`;
    case 'percent_total_ip': return `${number(t.bonusPercent)}% × tổng IP đủ điều kiện`;
    case 'percent_fyc': return `${number(t.bonusPercent)}% × FYC (FYC = 25% IP)`;
    case 'money_per_round': return `${money(t.bonusAmount)}/lượt đủ điều kiện`;
    case 'money_per_tvv': return `${money(t.bonusAmount)}/TVV đủ điều kiện`;
    default: return money(t.bonusAmount);
  }
}

export function buildContestCommunication(c: ContestConfig, settings: Record<string, string>, now = new Date(), recruitment?: RecruitmentContestConfig): ContestCommunication {
  const registered = c.registeredProgram;
  const scope = registered?.scope || c.targetType;
  const audience = scope === 'nhom' ? 'Nhóm' : scope === 'nyd' ? 'Nhà tuyển dụng' : 'Tư vấn viên';
  const lines: CommunicationLine[] = [
    { text: '📣 CẬP NHẬT TIẾN ĐỘ THI ĐUA', emphasis: true, tone: 'title' },
    { text: `🏆 “${c.title || 'Chương trình thi đua'}” — ${audience}`, emphasis: true, tone: 'title' },
    { text: `📅 Thời gian thi đua: ${date(c.startDate)} – ${date(c.endDate)}.` },
    closingNotice(c.endDate, now),
    { text: '🎁 NỘI DUNG VÀ CƠ CHẾ THƯỞNG', emphasis: true },
  ];
  const add = (text: string) => lines.push({ text });
  if (registered) {
    add(`Xét tỷ lệ hoàn thành mục tiêu ${registered.metric.toUpperCase()} đăng ký theo từng phân loại.`);
    for (const t of [...registered.tiers].sort((a,b) => (a.classification || 1) - (b.classification || 1) || a.minPercent - b.minPercent)) {
      const value = t.type === 'gift' ? t.text : t.type === 'money' ? money(t.amount) : `${number(t.amount)}% × ${t.type === 'percent_ip' ? 'IP' : 'AFYP'} đủ điều kiện`;
      add(`• Loại ${t.classification || 1}: đạt từ ${number(t.minPercent)}% mục tiêu → ${value}.`);
    }
    add('Điều kiện nhận thưởng: đạt ít nhất 100% mục tiêu và đã được xác nhận đạt điều kiện Sao Việt; nhận mức cao nhất đạt được trong phân loại.');
    if (registered.minIP > 0) add(`• IP/HĐ tối thiểu: ${money(registered.minIP)}.`);
    if (registered.minAFYP > 0) add(`• AFYP/HĐ tối thiểu: ${money(registered.minAFYP)}.`);
  } else {
    add(`Xét thưởng theo ${c.conditionType === 'top_n_ip' ? `TOP ${c.topNValueType === 'afyp' ? 'AFYP' : 'IP'}` : getConditionLabel(c.conditionType)}.`);
    const tiers = (items: BonusTier[]) => {
      for (const t of [...items].sort((a,b) => a.minFYP - b.minFYP)) {
        const unit = /^(per_contract|total)_/.test(c.conditionType) ? ' đ' : '';
        add(`• ${number(t.minFYP)}${unit}${t.maxFYP == null ? ' trở lên' : ` đến ${number(t.maxFYP)}${unit}`} → ${reward(t)}.`);
      }
    };
    if (c.conditionType === 'top_n_ip') {
      add(`Xét TOP ${c.topN || 0} theo ${c.topNValueType === 'afyp' ? 'AFYP' : 'IP'}, tối thiểu ${money(c.topNMinIP || 0)}.`);
      const ordered = c.bonusTiers.length ? c.bonusTiers : Array.from({ length: c.topN || 0 }, (_, i) => ({ id: String(i), minFYP: 0, maxFYP: null, bonusType: 'money' as const, bonusAmount: i === 0 ? 1000000 : i === 1 ? 500000 : 300000, bonusText: '', bonusPercent: 0 }));
      ordered.slice(0, c.topN).forEach((t, i) => add(`• Hạng ${i + 1}: ${reward(t)}.`));
    } else {
      if (c.usePhase2) add(`Giai đoạn 1: ${date(c.startDate)} đến trước ${date(c.phase2StartDate || '')}.`);
      tiers(c.bonusTiers);
      if (c.usePhase2) {
        add(`Giai đoạn 2: ${date(c.phase2StartDate || '')} – ${date(c.phase2EndDate || c.endDate)}.`);
        tiers(c.bonusTiers2);
      }
      add('Áp dụng mức thưởng phù hợp với kết quả và các điều kiện của chương trình.');
    }
    if (c.issueDate || c.issueEndDate) add(`• Ngày phát hành HĐ: ${c.issueDate ? date(c.issueDate) : 'không giới hạn đầu kỳ'} – ${c.issueEndDate ? date(c.issueEndDate) : 'không giới hạn cuối kỳ'}.`);
    if (c.conditionType.startsWith('activity_round')) {
      add(`• Mỗi TVV tính tối đa 1 lượt hoạt động trong kỳ; IP/HĐ tối thiểu ${money(c.conditionType.includes('standard') ? c.luotHDCTThreshold : c.conditionType === 'activity_round_tvv90' ? c.tvv90MinIP : c.luotHDThreshold)}.`);
      if (c.conditionType === 'activity_round_tvv90') add(`• Thâm niên TVV tối đa ${c.tvv90MaxMonths} tháng.`);
    }
    if (c.conditionType === 'tvv_pass_count') add('• Đếm TVV đạt chương trình điều kiện đã liên kết.');
    if (c.conditionType === 'pass_count_contracts') add(`• Mỗi TVV phải đạt tối thiểu ${c.tvvContractCountMin || 0} HĐ đủ điều kiện.`);
    if (c.conditionType === 'pass_count_contracts' || c.conditionType === 'pass_count_ip_afyp') {
      add(`• Ngưỡng xét: IP ${money(c.secondaryIPMin || 0)}, AFYP ${money(c.secondaryAFYPMin || 0)} theo cấu hình chương trình.`);
    }
    if (c.useSecondaryCondition) {
      const fields = [['secondaryIPMin','IP/HĐ'],['secondaryAFYPMin','AFYP/HĐ'],['secondaryTotalIPMin','Tổng IP'],['secondaryTotalAFYPMin','Tổng AFYP'],['secondaryContractCountMin','Số HĐ'],['secondaryContractIPMin','IP tối thiểu của HĐ xét đếm'],['secondaryLuotHDMin','Lượt HĐ'],['secondaryLuotHDCMin','Lượt HĐ chuẩn']] as const;
      for (const [key, label] of fields) if ((c[key] || 0) > 0) add(`• Điều kiện bổ sung: ${label} ≥ ${number(c[key]!)}${label.includes('IP') || label.includes('AFYP') ? ' đ' : ''}.`);
    }
    if (c.conditionType === 'recruitment_count' && recruitment) {
      add(`• Đối tượng tuyển dụng: ${recruitment.subjectScope === 'ttn' ? 'TTN' : recruitment.subjectScope === 'leader' ? 'Trưởng nhóm/Trưởng ban' : 'TTN và Trưởng nhóm/Trưởng ban'}.`);
      if (recruitment.activityEnabled) add(`• Thưởng hoạt động thêm ${money(recruitment.activityBonusAmount)}/TVV đạt ${recruitment.activityMetric === 'total_ip' ? 'tổng IP' : 'IP/HĐ'} ${recruitment.activityComparator === 'gte' ? '≥' : '≤'} ${money(recruitment.activityThreshold)}.`);
    }
    if (c.useTopRanking) {
      add(`🥇 Thưởng TOP bổ sung (cộng với thưởng chính): TOP ${c.topN || 0}.`);
      c.topRewardAmounts.slice(0, c.topN).forEach((amount,i) => add(`• TOP ${i+1}: ${money(amount)}.`));
      if (c.topEligibilityType && c.topEligibilityType !== 'none') add(`• Điều kiện vào TOP: ${getConditionLabel(c.topEligibilityType)} ≥ ${money(c.topEligibilityMin || 0)}.`);
    }
  }
  const sync = successfulSyncTime(settings, now);
  lines.push({ text: sync ? `📊 Dữ liệu thi đua được cập nhật đến: ${new Date(sync).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}.` : '📊 Chưa xác định được thời điểm đồng bộ thành công từ máy lên app.', emphasis: true });
  add('💐 Cảm ơn Anh/Chị đã nỗ lực và đồng hành. Cùng chinh phục mục tiêu thi đua!');
  return { lines, text: lines.map(line => line.text).join('\n\n') };
}
