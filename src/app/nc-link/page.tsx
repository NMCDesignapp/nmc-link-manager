import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import HomeCommandCenter from '@/components/home-command-center';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/admin-session';

export const dynamic = 'force-dynamic';

export default async function LegacyNcLinkPage() {
  const adminCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;

  // The legacy management interface is restricted to a valid server-issued Admin session.
  if (!verifyAdminSession(adminCookie)) redirect('/kpi');

  return <HomeCommandCenter />;
}
