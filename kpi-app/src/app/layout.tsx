import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SpaceBackground } from '@/components/space-bg'
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="h-full overflow-auto honeycomb-bg">
        <SpaceBackground />
        <AppDataProvider>{children}</AppDataProvider>
      </body>
    </html>
  )
}
