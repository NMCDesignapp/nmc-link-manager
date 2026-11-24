import { redirect } from 'next/navigation';

// Retire the standalone KPI entry point; KPI is now part of the single NC Link app.
export default function KPIStandalonePage() {
  redirect('/');
}
