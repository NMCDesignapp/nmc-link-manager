import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { ErrorBoundary } from '@/components/error-boundary'
import { PwaInstallPrompt } from '@/components/pwa-install-prompt'
import { Toaster } from '@/components/ui/toaster'
import { SpaceBackground } from '@/components/space-bg'
import { EmbeddedProgramDataLoader } from '@/components/embedded-program-data-loader'
import { ProgramTableStickyHeaders } from '@/components/program-table-sticky-headers'
import { HonourSpacingFix } from '@/components/honour-spacing-fix'
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
        <link rel="stylesheet" href="/kpi-silver-loader-v7.css?v=20260826-3" />
        <link rel="stylesheet" href="/kpi-silver-loader-v8-fixes.css?v=20260826-4" />
        <link rel="stylesheet" href="/kpi-linked-shell-v9.css?v=20260826-5" />
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
        <ProgramTableStickyHeaders />
        <SpaceBackground />
        <ErrorBoundary>
          <AppDataProvider>
            {children}
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
