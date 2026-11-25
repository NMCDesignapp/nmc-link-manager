import { type ContestConfig, type RecruitmentContestConfig } from './contest-calculator.ts';

export type CommunicationLine = { text: string; emphasis?: boolean; tone?: 'urgent' | 'title'; url?: string };
export type ContestCommunication = { lines: CommunicationLine[]; text: string };
// Verified live KPI origin. The angiang.vercel.app domain currently serves a
// different An Giang travel site, so it must not be used for KPI deep links.
export const MAIN_APP_ORIGIN = 'https://nc-link.onrender.com';

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

export function contestProgramUrl(origin: string, contestId?: string): string {
  const base = origin || MAIN_APP_ORIGIN;
  if (contestId) return new URL(`/c/${encodeURIComponent(contestId)}`, base).toString();
  return new URL('/thi-dua-chau', base).toString();
}

export function buildContestCommunication(c: ContestConfig, settings: Record<string, string>, now = new Date(), _recruitment?: RecruitmentContestConfig, programUrl = contestProgramUrl(MAIN_APP_ORIGIN)): ContestCommunication {
  const registered = c.registeredProgram;
  const scope = registered?.scope || c.targetType;
  const audience = scope === 'nhom' ? 'Nhóm' : scope === 'nyd' ? 'Nhà tuyển dụng' : c.conditionType.includes('tvvm') ? 'Tư vấn viên mới' : c.conditionType === 'activity_round_tvv90' ? `Tư vấn viên có thâm niên tối đa ${c.tvv90MaxMonths} tháng` : 'Tư vấn viên';
  const periodStart = c.startDate || c.issueDate || '';
  const periodEnd = c.endDate || c.issueEndDate || '';
  const lines: CommunicationLine[] = [
    { text: '📣 CẬP NHẬT TIẾN ĐỘ THI ĐUA', emphasis: true, tone: 'title' },
    { text: `🏆 “${c.title || 'Chương trình thi đua'}” — ${audience}${registered || c.participants.length ? ' trong danh sách tham gia' : ''}`, emphasis: true, tone: 'title' },
    { text: `📅 Thời gian thi đua: ${date(periodStart)} – ${date(periodEnd)}.` },
    closingNotice(periodEnd, now),
  ];
  const sync = successfulSyncTime(settings, now);
  lines.push({ text: sync ? `📊 Dữ liệu thi đua được cập nhật đến: ${new Date(sync).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}.` : '📊 Chưa xác định được thời điểm đồng bộ thành công từ máy lên app.', emphasis: true });
  // Keep the real destination in the anchor, but show a clean branded label
  // in the poster and copied message instead of exposing the host.
  lines.push({ text: '🔗 Mở chi tiết chương trình thi đua', url: programUrl });
  return { lines, text: lines.map(line => line.text).join('\n\n') };
}
