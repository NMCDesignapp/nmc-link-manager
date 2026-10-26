'use client';
import { useCallback, useEffect, useState } from 'react';
import { targetCode } from '@/lib/contest-registered-targets';

export type ContestApprovals = Record<string, boolean>;

export async function fetchContestApprovals(contestId?: string): Promise<ContestApprovals> {
  if (!contestId) return {};
  const response = await fetch(`/api/contest-approvals?contestId=${encodeURIComponent(contestId)}`, { cache: 'no-store' });
  if (!response.ok) throw Error('Không tải được điều kiện Sao Việt/nâng hạng.');
  const data = await response.json();
  return data.approvals || {};
}

export function useContestApprovals(contestId?: string) {
  const [approvals, setApprovals] = useState<ContestApprovals>({});
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(Boolean(contestId));
  const [savingCode, setSavingCode] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!contestId) { setApprovals({}); setLoading(false); return; }
    setLoading(true);
    try {
      const [next, auth] = await Promise.all([
        fetchContestApprovals(contestId),
        fetch('/api/admin/session', { cache: 'no-store', credentials: 'same-origin' })
          .then(r => r.ok ? r.json() : {authenticated:false})
          .catch(() => ({authenticated:false})),
      ]);
      setApprovals(next);
      setAdmin(auth.authenticated === true);
      setError('');
    } catch (e) { setError((e as Error).message); setApprovals({}); }
    finally { setLoading(false); }
  }, [contestId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const setApproved = useCallback(async (code: string, approved: boolean) => {
    if (!contestId || !admin) return;
    const normalized = targetCode(code);
    setSavingCode(normalized); setError('');
    try {
      const response = await fetch('/api/contest-approvals', {
        method: 'PUT', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contestId, code: normalized, approved }),
      });
      if (!response.ok) throw Error('Lưu duyệt không thành công. Kiểm tra lại quyền admin.');
      const data = await response.json();
      setApprovals(data.approvals || {});
    } catch (e) { setError((e as Error).message); }
    finally { setSavingCode(''); }
  }, [contestId, admin]);

  return { approvals, admin, loading, savingCode, error, setApproved, refresh };
}
