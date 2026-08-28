import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { ErrorBoundary } from '@/components/error-boundary'
import { PwaInstallPrompt } from '@/components/pwa-install-prompt'
import { Toaster } from '@/components/ui/toaster'
import { SpaceBackground } from '@/components/space-bg'
import { EmbeddedProgramDataLoader } from '@/components/embedded-program-data-loader'
import { ProgramTableStickyHeaders } from '@/components/program-table-sticky-headers'
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

const deferredKpiStyles = [
  '/kpi-ui-overrides.css',
  '/kpi-cyber-room-v4.css?v=20260807-2053',
  '/kpi-loader-fix-v1.css?v=20260808-1017',
  '/kpi-performance-v1.css?v=20260807-2110',
  '/kpi-blackwood-theme-v3.css?v=20260825-1',
  '/kpi-blackwood-theme-v4.css?v=20260825-2',
  '/kpi-blackwood-theme-v5.css?v=20260826-1',
  '/kpi-blackwood-theme-v6.css?v=20260826-2',
  '/kpi-blackwood-theme-v7.css?v=20260826-3',
  '/kpi-blackwood-theme-v8.css?v=20260826-4',
  '/kpi-blackwood-theme-v9.css?v=20260826-5',
  '/kpi-blackwood-theme-v10.css?v=20260826-6',
  '/kpi-blackwood-theme-v11.css?v=20260826-7',
]

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" className="dark h-full">
      <head>
        <link rel="apple-touch-icon" href="/icon/nc-link-180.png" />
        <link rel="stylesheet" href="/main-management-soft-ui-v1.css?v=20260827-2" />
        <link rel="stylesheet" href="/main-home-panels-soft-ui-v1.css?v=20260827-1" />
        <link rel="stylesheet" href="/clb-sao-viet-soft-ui-v1.css?v=20260827-1" />
        <link rel="stylesheet" href="/nmc-metal-loading-plate-v1.css?v=20260827-1" />
        <link rel="stylesheet" href="/nmc-main-metal-system-v2.css?v=20260828-1" />
        <link rel="stylesheet" href="/nmc-compact-internal-loaders-v1.css?v=20260828-1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var p = new URLSearchParams(window.location.search);
                  var path = window.location.pathname;
                  var isFrame = window.self !== window.top;
                  var isLinkedRoute = path === '/quan-ly' || path === '/thi-dua-chau' || path === '/clb-sao-viet';
                  var isKpiQuanLyFrame = path === '/quan-ly' && isFrame;
                  var embedded = p.get('from') === 'kpi' || (isLinkedRoute && sessionStorage.getItem('kpi_embed') === '1') || isKpiQuanLyFrame;
                  if (embedded) {
                    document.documentElement.setAttribute('data-kpi-embed', '1');
                  } else {
                    document.documentElement.removeAttribute('data-kpi-embed');
                  }

                  var needsKpiStyles = path === '/kpi' || path.indexOf('/kpi/') === 0 || embedded;
                  if (!needsKpiStyles) {
                    document.documentElement.setAttribute('data-kpi-styles-ready', '1');
                    return;
                  }

                  document.documentElement.setAttribute('data-kpi-styles-ready', '0');
                  var styles = ${JSON.stringify(deferredKpiStyles)};
                  var remaining = styles.length;
                  var markReady = function() {
                    remaining -= 1;
                    if (remaining > 0) return;
                    document.documentElement.setAttribute('data-kpi-styles-ready', '1');
                    window.dispatchEvent(new Event('nmc:kpi-styles-ready'));
                  };
                  styles.forEach(function(href) {
                    var link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = href;
                    link.media = 'print';
                    link.onload = function() { link.media = 'all'; markReady(); };
                    link.onerror = markReady;
                    document.head.appendChild(link);
                  });
                } catch(e) {
                  document.documentElement.setAttribute('data-kpi-styles-ready', '1');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="h-full overflow-auto honeycomb-bg">
        <ProgramTableStickyHeaders />
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

                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful');
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