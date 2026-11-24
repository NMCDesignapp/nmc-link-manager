import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/admin-session';
import HomeCommandCenter from '@/components/home-command-center';

export const dynamic = 'force-dynamic';

export default async function NcLinkPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!verifyAdminSession(token)) redirect('/');
  return <HomeCommandCenter />;
}
