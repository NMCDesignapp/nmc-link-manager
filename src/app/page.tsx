'use client'

import HomeCommandCenter from '@/components/home-command-center'
import './home-soft-ui.css'
import './home-mobile-polish-v2.css'

// Home-only visual shell. KPI and CLB Sao Việt routes do not inherit this skin.
export default function Home() {
  return (
    <div className="nmc-home-skin">
      <HomeCommandCenter />
    </div>
  )
}
