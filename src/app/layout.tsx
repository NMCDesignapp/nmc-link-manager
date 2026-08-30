import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { ErrorBoundary } from '@/components/error-boundary'
import { PwaInstallPrompt } from '@/components/pwa-install-prompt'
import { Toaster } from '@/components/ui/toaster'
import { SpaceBackground } from '@/components/space-bg'
import { EmbeddedProgramDataLoader } from '@/components/embedded-program-data-loader'
import { ProgramTableNativeSticky } from '@/components/program-table-native-sticky'
import { ProgramTableViewportHeader } from '@/components/program-table-viewport-header'
import { KpiTableAxisLock } from '@/components/kpi-table-axis-lock'
import { KpiEmbeddedFilterBar } from '@/components/kpi-embedded-filter-bar'
import { KpiEmbeddedSyncBridge } from '@/components/kpi-embedded-sync-bridge'
import { HonourSpacingFix } from '@/components/honour-spacing-fix'
import { MaintenanceGate } from '@/components/maintenance-gate'
import { AppDataProvider } from '@/lib/app-data-context'
import './globals.css'

export const metadata: Metadata = {
  title: 'N.M.C - Trung tam quan ly lien ket',
  description: 'Ung dung quan ly va tong hop tat ca lien ket web cua ban',
  generator: 'v0.app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NMC Links',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon/nc-link-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon/nc-link-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icon/nc-link-180.png', sizes: '180x180', type: 'image/png' }],
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
        <link rel="apple-touch-icon" href="/icon/nc-link-180.png" />
        <link rel="stylesheet" href="/kpi-ui-overrides.css" />
        <link rel="stylesheet" href="/kpi-cyber-room-v4.css?v=20260807-2053" />
        <link rel="stylesheet" href="/kpi-loader-fix-v1.css?v=20260808-1017" />
        <link rel="stylesheet" href="/kpi-performance-v1.css?v=20260807-2110" />
        <link rel="stylesheet" href="/kpi-blackwood-theme-v3.css?v=20260825-1" />
        <link rel="stylesheet" href="/kpi-blackwood-theme-v4.css?v=20260825-2" />
        <link rel="stylesheet" href="/kpi-blackwood-theme-v5.css?v=20260826-1" />
        <link rel="stylesheet" href="/kpi-blackwood-theme-v6.css?v=20260826-2" />
        <link rel="stylesheet" href="/kpi-blackwood-theme-v7.css?v=20260826-3" />
        <link rel="stylesheet" href="/kpi-blackwood-theme-v8.css?v=20260826-4" />
        <link rel="stylesheet" href="/kpi-blackwood-theme-v9.css?v=20260826-5" />
        <link rel="stylesheet" href="/kpi-blackwood-theme-v10.css?v=20260826-6" />
        <link rel="stylesheet" href="/kpi-blackwood-theme-v11.css?v=20260826-7" />
        <link rel="stylesheet" href="/main-management-soft-ui-v1.css?v=20260827-2" />
        <link rel="stylesheet" href="/main-management-metal-v2.css?v=20260828-1" />
        <link rel="stylesheet" href="/main-home-panels-soft-ui-v1.css?v=20260827-1" />
        <link rel="stylesheet" href="/clb-sao-viet-soft-ui-v1.css?v=20260827-1" />
        <link rel="stylesheet" href="/nmc-metal-loading-plate-v1.css?v=20260827-1" />
        <link rel="stylesheet" href="/nmc-main-metal-system-v2.css?v=20260830-1" />
        <link rel="stylesheet" href="/kpi-embedded-detail-tables-v1.css?v=20260829-5" />
        <link rel="stylesheet" href="/kpi-embedded-fullbleed-v1.css?v=20260830-1" />
        <link rel="stylesheet" href="/kpi-table-zebra-soft-v1.css?v=20260829-1" />
        <link rel="stylesheet" href="/kpi-embedded-sync-inline-v1.css?v=20260829-1" />
        <link rel="stylesheet" href="/kpi-native-sticky-v1.css?v=20260830-2" />
        <link rel="stylesheet" href="/kpi-mobile-scroll-polish-v1.css?v=20260830-2" />
        <link rel="stylesheet" href="/kpi-embedded-compact-v2.css?v=20260830-1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var p = new URLSearchParams(window.location.search);
                  var isKpiQuanLyFrame = window.location.pathname === '/quan-ly' && window.self !== window.top;
                  if (p.get('from') === 'kpi' || sessionStorage.getItem('kpi_embed') === '1' || isKpiQuanLyFrame) {
                    document.documentElement.setAttribute('data-kpi-embed', '1');
                  } else {
                    document.documentElement.removeAttribute('data-kpi-embed');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="h-full overflow-auto honeycomb-bg">
        <ProgramTableNativeSticky />
        <ProgramTableViewportHeader />
        <KpiTableAxisLock />
        <KpiEmbeddedFilterBar />
        <KpiEmbeddedSyncBridge />
        <SpaceBackground />
        <ErrorBoundary>
          <AppDataProvider>
            {children}
            <MaintenanceGate />
            <HonourSpacingFix />
            <EmbeddedProgramDataLoader />
            <PwaInstallPrompt />
            <Toaster />
          </AppDataProvider>
        </ErrorBoundary>
        {process.env.NODE_ENV === 'production' && <Analytics />}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  var refreshing = false;
                  navigator.serviceWorker.addEventListener('controllerchange', function() {
                    if (refreshing) return;
                    refreshing = true;
                    window.location.reload();
                  });

                  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(
                    function(registration) {
                      console.log('ServiceWorker registration successful');
                      registration.update().catch(function() {});
                      if (registration.waiting) {
                        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                      }
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
