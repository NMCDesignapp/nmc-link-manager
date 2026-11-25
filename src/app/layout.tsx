import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { ErrorBoundary } from '@/components/error-boundary'
import { PwaInstallPrompt } from '@/components/pwa-install-prompt'
import { Toaster } from '@/components/ui/toaster'
import { SpaceBackground } from '@/components/space-bg'
import { EmbeddedProgramDataLoader } from '@/components/embedded-program-data-loader'
import { ProgramTableNativeSticky } from '@/components/program-table-native-sticky'
import { ProgramTableViewportHeader } from '@/components/program-table-viewport-header'
import { KpiEmbeddedFilterBar } from '@/components/kpi-embedded-filter-bar'
import { KpiEmbeddedSyncBridge } from '@/components/kpi-embedded-sync-bridge'
import { HonourSpacingFix } from '@/components/honour-spacing-fix'
import { MaintenanceGate } from '@/components/maintenance-gate'
import { AppDataProvider } from '@/lib/app-data-context'
import '@fontsource/roboto-condensed/latin-ext-400.css'
import '@fontsource/roboto-condensed/latin-ext-700.css'
import '@fontsource/roboto-condensed/latin-ext-900.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'KPI AN GIANG - Design by NC',
  description: 'KPI AN GIANG - Design by NC',
  generator: 'v0.app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'KPI AN GIANG - Design by NC',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon/kpi-an-giang-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon/kpi-an-giang-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icon/kpi-an-giang-512.png', sizes: '512x512', type: 'image/png' }],
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
        <link rel="apple-touch-icon" href="/icon/kpi-an-giang-512.png" />
        <link rel="stylesheet" href="/main-management-soft-ui-v1.css?v=20260827-2" />
        <link rel="stylesheet" href="/main-management-metal-v2.css?v=20260831-2" />
        <link rel="stylesheet" href="/main-home-panels-soft-ui-v1.css?v=20260827-1" />
        <link rel="stylesheet" href="/clb-sao-viet-soft-ui-v1.css?v=20260827-1" />
        <link rel="stylesheet" href="/nmc-main-metal-system-v2.css?v=20260831-3" />
        <link rel="stylesheet" href="/main-management-mobile-fixes-v1.css?v=20260903-1" />
        <link rel="stylesheet" href="/kpi-embedded-detail-tables-v1.css?v=20260829-5" />
        <link rel="stylesheet" href="/kpi-embedded-fullbleed-v1.css?v=20260830-1" />
        <link rel="stylesheet" href="/kpi-table-zebra-soft-v1.css?v=20260829-1" />
        <link rel="stylesheet" href="/kpi-embedded-sync-inline-v1.css?v=20260829-1" />
        <link rel="stylesheet" href="/kpi-native-sticky-v1.css?v=20260904-1" />
        <link rel="stylesheet" href="/kpi-mobile-scroll-polish-v1.css?v=20260831-5" />
        <link rel="stylesheet" href="/kpi-scroll-stability-v2.css?v=20260904-1" />
        <link rel="stylesheet" href="/kpi-embedded-compact-v2.css?v=20260830-1" />
        <link rel="stylesheet" href="/kpi-loader-scope-v14.css?v=20261124-final" />
        <link rel="stylesheet" href="/kpi-detail-metal-v15.css?v=20260906-1" />
        <link rel="stylesheet" href="/kpi-calendar-navy-light-v17.css?v=20260906-1" />
        <link rel="stylesheet" href="/kpi-layout-polish-v18.css?v=20260907-1" />
        <link rel="stylesheet" href="/kpi-detail-align-v19.css?v=20260907-2" />
        <link rel="stylesheet" href="/kpi-detail-navy-v20.css?v=20260907-1" />
        <link rel="stylesheet" href="/kpi-detail-column-themes-v21.css?v=20260909-4" />
        <link rel="stylesheet" href="/kpi-detail-tier-fix-v22.css?v=20260909-4" />
        <link rel="stylesheet" href="/kpi-fixed-program-tables-v23.css?v=20260909-2" />
        <link rel="stylesheet" href="/kpi-table-global-polish-v24.css?v=20260909-2" />
        <link rel="stylesheet" href="/kpi-rank-column-contrast-v25.css?v=20260909-1" />
        <link rel="stylesheet" href="/kpi-rank-header-structure-v26.css?v=20260909-1" />
        <link rel="stylesheet" href="/kpi-table-runtime-v27.css?v=20261102-2" />
        <script src="/kpi-table-runtime-v27.js?v=20260928-1" defer></script>
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
