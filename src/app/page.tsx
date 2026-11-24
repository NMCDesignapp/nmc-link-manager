'use client'

import { KPIDashboard } from '@/app/kpi/page'

// NC Link opens directly into the KPI experience. Management navigation is exposed
// from the KPI admin unlock flow, rather than as the ordinary landing screen.
export default function Home() {
  return <KPIDashboard standalone={false} />
}
