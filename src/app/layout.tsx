import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { ErrorBoundary } from '@/components/error-boundary'
import { PwaInstallPrompt } from '@/components/pwa-install-prompt'
import { Toaster } from '@/components/ui/toaster'
import { SpaceBackground } from '@/components/space-bg'
import { AppDataProvider } from '@/lib/app-data-context'
import './globals.css'
import './kpi-honour-board.css'

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
      { url: '/icon/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
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
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/*
          Early inline script — chạy NGAY khi HTML parse, trước khi React hydrate.
          Nếu URL có ?from=kpi (iframe từ KPI app) hoặc sessionStorage có kpi_embed=1
          → set data-kpi-embed="1" trên <html>.
          CSS (xem globals.css) sẽ ẩn sidebar nav ngay từ initial render,
          tránh flash/sidebar hiện thoáng qua trước khi useEffect chạy.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var p = new URLSearchParams(window.location.search);
                  if (p.get('from') === 'kpi' || sessionStorage.getItem('kpi_embed') === '1') {
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
        <SpaceBackground />
        <ErrorBoundary>
          <AppDataProvider>
            {children}
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
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful');
                      // Nếu có SW mới đang chờ activate → force skipWaiting + reload
                      if (registration.waiting) {
                        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                      }
                      // Lắng nghe SW mới install → reload 1 lần để dùng bản mới
                      registration.addEventListener('updatefound', function() {
                        var newWorker = registration.installing;
                        if (!newWorker) return;
                        newWorker.addEventListener('statechange', function() {
                          // 'installed' + controller tồn tại = có bản mới → reload
                          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            window.location.reload();
                          }
                        });
                      });
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                  // Khi controller đổi (SW mới đã take over) → reload 1 lần
                  var refreshing = false;
                  navigator.serviceWorker.addEventListener('controllerchange', function() {
                    if (refreshing) return;
                    refreshing = true;
                    window.location.reload();
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
