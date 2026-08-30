import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SpaceBackground } from '@/components/space-bg'
import { MaintenanceGate } from '@/components/maintenance-gate'
import { KpiEmbeddedSyncBridge } from '@/components/kpi-embedded-sync-bridge'
import { AppDataProvider } from '@/lib/app-data-context'

export const metadata: Metadata = {
  title: 'KPI - N.M.C',
  description: 'KPI Dashboard - Trung tam quan ly lien ket',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'KPI NMC',
  },
  icons: {
    icon: [
      { url: '/icon/kpi-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon/kpi-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icon/kpi-192.png', sizes: '192x192', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" className="dark h-full">
      <head>
        <link rel="stylesheet" href="/kpi-blackwood-theme-v3.css?v=20260825-1" />
        <link rel="stylesheet" href="https://nc-link.vercel.app/kpi-blackwood-theme-v4.css?v=20260825-2" />
        <link rel="stylesheet" href="/kpi-blackwood-theme-v5.css?v=20260826-1" />
        <link rel="stylesheet" href="https://nc-link.vercel.app/kpi-blackwood-theme-v6.css?v=20260826-2" />
        <link rel="stylesheet" href="https://nc-link.vercel.app/kpi-blackwood-theme-v7.css?v=20260826-3" />
        <link rel="stylesheet" href="https://nc-link.vercel.app/kpi-blackwood-theme-v8.css?v=20260826-4" />
        <link rel="stylesheet" href="https://nc-link.vercel.app/kpi-blackwood-theme-v9.css?v=20260826-5" />
        <link rel="stylesheet" href="https://nc-link.vercel.app/kpi-blackwood-theme-v10.css?v=20260826-6" />
        <link rel="stylesheet" href="https://nc-link.vercel.app/kpi-blackwood-theme-v11.css?v=20260826-7" />
        <link rel="stylesheet" href="/nmc-metal-loading-plate-v1.css?v=20260827-1" />
        <link rel="stylesheet" href="/kpi-embedded-sync-inline-v1.css?v=20260829-1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="h-full overflow-auto honeycomb-bg">
        <KpiEmbeddedSyncBridge />
        <SpaceBackground />
        <AppDataProvider>
          {children}
          <MaintenanceGate standalone />
        </AppDataProvider>
      </body>
    </html>
  )
}
