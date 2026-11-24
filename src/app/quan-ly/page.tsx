import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/admin-session';
import ClientPage from './client-page';

export const dynamic = 'force-dynamic';

const KPI_READ_ONLY_SHEETS = ['report', 'saoviet', 'clb-saoviet', 'cskk-2026'];

export default async function QuanLyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sheet = typeof params.sheet === 'string' ? params.sheet : '';
  const isKpiReadOnly = params.from === 'kpi' && KPI_READ_ONLY_SHEETS.includes(sheet);

  if (!isKpiReadOnly) {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!verifyAdminSession(token)) redirect('/');
  }

  return <ClientPage />;
}
