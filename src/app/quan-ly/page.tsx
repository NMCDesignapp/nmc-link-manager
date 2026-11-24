import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/admin-session';
import QuanLyClientPage from './client-page';

export const dynamic = 'force-dynamic';

const VIEWER_SHEETS = new Set(['report', 'saoviet', 'clb-saoviet', 'cskk-2026']);
type QuanLySearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export default async function QuanLyPage({
  searchParams,
}: {
  searchParams: Promise<QuanLySearchParams>;
}) {
  const params = await searchParams;
  const from = firstParam(params.from);
  const sheet = firstParam(params.sheet);
  const adminCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  const isAdmin = verifyAdminSession(adminCookie);

  // Các sheet được mở từ KPI vẫn là chế độ xem; truy cập trực tiếp khu vực
  // quản lý cũ phải đi qua phiên quản trị do /api/admin/session cấp.
  const isKpiViewer = from === 'kpi' && VIEWER_SHEETS.has(sheet);
  if (!isAdmin && !isKpiViewer) redirect('/kpi');

  return <QuanLyClientPage />;
}
