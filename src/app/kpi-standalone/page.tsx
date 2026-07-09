'use client';

/* ================= ROUTE /kpi-standalone (KPI tách — end-user version) =================
   Đây là trang KPI TÁCH RIÊNG dành cho END-USER xem.
   Khác với KPI0 (/kpi — admin):
     - KHÔNG có nút back về main app (`/`) → user không thể quay về main app
     - KHÔNG có admin features (sync button, admin auth)
     - Iframe overlay KHÔNG có nút "Mở tab mới" (user không được mở /quan-ly trực tiếp)
   Logic conditional rendering nằm trong KPIDashboard component (file /kpi/page.tsx),
   dựa trên prop `standalone`.
*/
import { KPIDashboard } from '../kpi/page';

export default function KPIStandalonePage() {
  return <KPIDashboard standalone />;
}
