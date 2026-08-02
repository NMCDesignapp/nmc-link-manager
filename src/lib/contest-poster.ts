type ContestPosterInput = {
  title?: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  targetType?: string;
};

const escapeXml = (value: string) => value.replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;',
}[char] || char));

const formatDate = (value?: Date | string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
};

const targetLabel = (targetType?: string) => {
  if (targetType === 'nhom') return 'THI ĐUA NHÓM';
  if (targetType === 'nyd') return 'THI ĐUA NGƯỜI TUYỂN DỤNG';
  return 'THI ĐUA TƯ VẤN VIÊN';
};

const titleLines = (title: string) => {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 3) return [title];
  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(' '), words.slice(midpoint).join(' ')];
};

/** A compact poster used whenever an admin has not supplied an image yet. */
export function createDefaultContestPoster(input: ContestPosterInput): string {
  const title = input.title?.trim() || 'CHƯƠNG TRÌNH THI ĐUA';
  const dates = [formatDate(input.startDate), formatDate(input.endDate)].filter(Boolean).join(' — ') || 'ĐANG CẬP NHẬT';
  const lines = titleLines(title).slice(0, 2);
  const titleMarkup = lines.map((line, index) => `<text x="600" y="${252 + index * 74}" text-anchor="middle" fill="#F8FAFC" font-family="Arial, sans-serif" font-size="${lines.length > 1 ? 48 : 56}" font-weight="800">${escapeXml(line)}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#052e2b"/><stop offset="0.55" stop-color="#0f172a"/><stop offset="1" stop-color="#064e3b"/></linearGradient>
      <radialGradient id="glow" cx="50%" cy="42%" r="60%"><stop stop-color="#34d399" stop-opacity=".35"/><stop offset="1" stop-color="#0f172a" stop-opacity="0"/></radialGradient>
      <pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M0 28h56M28 0v56" stroke="#6ee7b7" stroke-opacity=".08"/></pattern>
    </defs>
    <rect width="1200" height="675" fill="url(#bg)"/><rect width="1200" height="675" fill="url(#grid)"/><rect width="1200" height="675" fill="url(#glow)"/>
    <rect x="34" y="34" width="1132" height="607" rx="26" fill="none" stroke="#34d399" stroke-opacity=".65" stroke-width="3"/>
    <path d="M120 142h330M750 142h330" stroke="#fbbf24" stroke-opacity=".75" stroke-width="3"/>
    <circle cx="600" cy="142" r="42" fill="#fbbf24" fill-opacity=".14" stroke="#fbbf24" stroke-width="2"/>
    <text x="600" y="158" text-anchor="middle" fill="#fcd34d" font-family="Arial, sans-serif" font-size="46">★</text>
    <text x="600" y="87" text-anchor="middle" fill="#A7F3D0" font-family="Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="6">NMC • THI ĐUA</text>
    ${titleMarkup}
    <rect x="322" y="408" width="556" height="54" rx="27" fill="#10b981" fill-opacity=".18" stroke="#34d399" stroke-opacity=".7"/>
    <text x="600" y="443" text-anchor="middle" fill="#D1FAE5" font-family="Arial, sans-serif" font-size="25" font-weight="700">${escapeXml(targetLabel(input.targetType))}</text>
    <text x="600" y="540" text-anchor="middle" fill="#FDE68A" font-family="Arial, sans-serif" font-size="26" font-weight="700">${escapeXml(dates)}</text>
    <text x="600" y="588" text-anchor="middle" fill="#94A3B8" font-family="Arial, sans-serif" font-size="18" letter-spacing="2">BẢO VIỆT NHÂN THỌ AN GIANG</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
