'use client'

import HomeCommandCenter from '@/components/home-command-center'
import { MainSplashGate } from '@/components/main-splash-gate'
import './home-soft-ui.css'
import './home-mobile-polish-v2.css'

// Home-only visual shell. KPI routes keep their own visual system.
export default function Home() {
  return (
    <div className="nmc-home-skin">
      <MainSplashGate />
      <HomeCommandCenter />
    </div>
  )
}
