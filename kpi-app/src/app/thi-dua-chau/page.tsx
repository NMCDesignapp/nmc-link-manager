'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

const MAIN_APP_URL = 'https://nc-link.onrender.com';

export default function KpiContestBridgePage() {
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  useEffect(() => { setQuery(window.location.search); }, []);
  const params = useMemo(() => new URLSearchParams(query), [query]);
  const contestId = params.get('contest') || '';
  const source = `${MAIN_APP_URL}/thi-dua-chau${query}`;

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== MAIN_APP_URL) return;
      if (event.data?.type === 'nmc:contest-embedded-ready' && (!contestId || event.data.contestId === contestId)) {
        setReady(true);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [contestId]);

  return (
    <main style={{ position: 'fixed', inset: 0, background: '#edf2f4' }}>
      {!ready && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#edf2f4', color: '#315164', fontWeight: 700, fontSize: 14 }}>
          <Loader2 style={{ width: 20, height: 20, marginRight: 8, color: '#059669', animation: 'spin 1s linear infinite' }} />
          Đang tải số liệu chương trình...
          <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
        </div>
      )}
      <iframe src={source} title="Kết quả chương trình thi đua" style={{ width: '100%', height: '100%', border: 0 }} />
    </main>
  );
}
