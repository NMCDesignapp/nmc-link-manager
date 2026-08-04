import type { ReactNode } from 'react';
import { CompactSyncStatus } from './sync-status-compact';

export default function QuanLyTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      <CompactSyncStatus />
      {children}
    </>
  );
}
