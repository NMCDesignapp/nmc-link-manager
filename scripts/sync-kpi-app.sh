#!/usr/bin/env bash
# sync-kpi-app.sh — Sync KPI page từ main app → standalone kpi-app
#
# CHẾ ĐỘ MỚI: KHÔNG CẦN CHỈNH SỬA CODE THỦ CÔNG
# ===============================================
# Standalone kpi-app đã có `src/lib/app-data-context.tsx` shim
# cung cấp cùng interface `useAppData()` như main app → page.tsx
# có thể copy 1:1, chỉ cần patch 3 điểm nhỏ (BackButton href,
# thi-dua-chau href, MAIN_APP_URL constant) bằng sed.
#
# CHẠY SCRIPT NÀY MỖI KHI SỬA src/app/kpi/page.tsx ở main app.
# Sau đó commit + push → Vercel auto-deploy cả 2 projects.
#
# Hoặc tích hợp vào CI/CD: chạy `bash scripts/sync-kpi-app.sh`
# trước mỗi deploy.
#
# Usage:
#   bash scripts/sync-kpi-app.sh
#   bash scripts/sync-kpi-app.sh --check   # chỉ verify, không ghi file

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KPI_APP="$ROOT/kpi-app"
CHECK_ONLY=0

if [ "$1" = "--check" ]; then
  CHECK_ONLY=1
fi

if [ ! -d "$KPI_APP" ]; then
  echo "ERROR: kpi-app/ folder not found at $KPI_APP"
  exit 1
fi

if [ ! -f "$ROOT/src/app/kpi/page.tsx" ]; then
  echo "ERROR: src/app/kpi/page.tsx not found"
  exit 1
fi

echo "=== Syncing KPI app from main source ==="
echo ""

# 1. KPI page → kpi-app/src/app/page.tsx
if [ $CHECK_ONLY -eq 0 ]; then
  echo "[1/8] Copying src/app/kpi/page.tsx → kpi-app/src/app/page.tsx"
  cp "$ROOT/src/app/kpi/page.tsx" "$KPI_APP/src/app/page.tsx"
  cp "$ROOT/src/app/kpi/template.tsx" "$KPI_APP/src/app/template.tsx"
fi

# Apply standalone patches via node script (reliable multi-line + regex)
echo "[2/8] Applying standalone patches (MAIN_APP_URL, BackButton, 3 nav hrefs)"
if [ $CHECK_ONLY -eq 0 ]; then
  node "$ROOT/scripts/apply-standalone-patches.js" "$KPI_APP/src/app/page.tsx"
else
  node "$ROOT/scripts/apply-standalone-patches.js" "$KPI_APP/src/app/page.tsx" --check
fi

# 3. AppDataContext shim (same interface as main app)
if [ $CHECK_ONLY -eq 0 ]; then
  echo "[3/8] Ensuring kpi-app/src/lib/app-data-context.tsx exists (shim — not overwritten)"
  # Không copy từ main vì main có preload layout-level; standalone shim tự fetch
  # Đảm bảo file tồn tại
  if [ ! -f "$KPI_APP/src/lib/app-data-context.tsx" ]; then
    echo "  WARNING: shim file missing — run setup-kpi-app-shim.sh first"
  fi
fi

# 4. API routes
echo "[4/8] Syncing API routes"
# quan-ly/all is a standalone read-only proxy and must not be overwritten.
for route in settings calendar structure/ad structure/phong structure/bannhom structure/tvv poster-image contests kpi-target-registrations; do
  if [ -f "$ROOT/src/app/api/$route/route.ts" ]; then
    if [ $CHECK_ONLY -eq 0 ]; then
      mkdir -p "$KPI_APP/src/app/api/$route"
      cp "$ROOT/src/app/api/$route/route.ts" "$KPI_APP/src/app/api/$route/route.ts"
    fi
  fi
done

# Poster image binary endpoint is a dynamic route and must travel with its manifest route.
if [ -f "$ROOT/src/app/api/poster-image/[key]/route.ts" ]; then
  if [ $CHECK_ONLY -eq 0 ]; then
    mkdir -p "$KPI_APP/src/app/api/poster-image/[key]"
    cp "$ROOT/src/app/api/poster-image/[key]/route.ts" "$KPI_APP/src/app/api/poster-image/[key]/route.ts"
  fi
fi

# 5. Components
echo "[5/8] Syncing components (back-button, space-bg, honeycomb-bg)"
if [ $CHECK_ONLY -eq 0 ]; then
  mkdir -p "$KPI_APP/src/components"
  cp "$ROOT/src/components/back-button.tsx" "$KPI_APP/src/components/back-button.tsx"
  # Sync background components để standalone có cùng visual identity với main app
  cp "$ROOT/src/components/space-bg.tsx" "$KPI_APP/src/components/space-bg.tsx" 2>/dev/null || true
  cp "$ROOT/src/components/honeycomb-bg.tsx" "$KPI_APP/src/components/honeycomb-bg.tsx" 2>/dev/null || true
fi

# 6. Lib + globals.css + layout
echo "[6/8] Syncing lib/db.ts, lib/utils.ts, globals.css, layout.tsx"
if [ $CHECK_ONLY -eq 0 ]; then
  mkdir -p "$KPI_APP/src/lib"
  cp "$ROOT/src/lib/db.ts" "$KPI_APP/src/lib/db.ts"
  cp "$ROOT/src/lib/utils.ts" "$KPI_APP/src/lib/utils.ts" 2>/dev/null || true
  cp "$ROOT/src/lib/contest-poster.ts" "$KPI_APP/src/lib/contest-poster.ts" 2>/dev/null || true
  # Sync globals.css (honeycomb-bg + animations)
  cp "$ROOT/src/app/globals.css" "$KPI_APP/src/app/globals.css"
fi

# 6b. Layout — overwrite với standalone layout template (đã được viết tay cẩn thận)
# Layout này giống main app nhưng bỏ: ErrorBoundary, PwaInstallPrompt, Toaster, Analytics, Service Worker
# vì standalone kpi-app không có các components/UI đó
echo "[6b/8] Overwriting kpi-app/src/app/layout.tsx với standalone template"
if [ $CHECK_ONLY -eq 0 ]; then
  cat > "$KPI_APP/src/app/layout.tsx" << 'LAYOUT_EOF'
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
        <link rel="stylesheet" href="/kpi-blackwood-theme-v12.css?v=20260831-2" />
        <link rel="stylesheet" href="/nmc-metal-loading-plate-v1.css?v=20260827-1" />
        <link rel="stylesheet" href="/kpi-embedded-sync-inline-v1.css?v=20260829-1" />
        <link rel="stylesheet" href="/kpi-embedded-compact-v2.css?v=20260830-1" />
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
LAYOUT_EOF
  echo "  → layout.tsx overwritten với standalone template"
fi

# 7. Prisma schema (only the tables kpi-app needs — main schema has PosterImage table etc)
# Skip — kpi-app keeps its own schema subset

# 8. Shared public assets — standalone PWA icons stay project-specific.
echo "[7/8] Syncing shared KPI assets"
if [ $CHECK_ONLY -eq 0 ]; then
  mkdir -p "$KPI_APP/public/icon" "$KPI_APP/public/kpi"
  cp -r "$ROOT/public/kpi/"* "$KPI_APP/public/kpi/" 2>/dev/null || true
  cp "$ROOT/public/logo.svg" "$KPI_APP/public/" 2>/dev/null || true
fi

# Verify
echo "[8/8] Verifying..."
LINES=$(wc -l < "$KPI_APP/src/app/page.tsx")
MAIN_LINES=$(wc -l < "$ROOT/src/app/kpi/page.tsx")
echo "  src/app/kpi/page.tsx       : $MAIN_LINES lines"
echo "  kpi-app/src/app/page.tsx   : $LINES lines"
echo ""

# Diff check (excluding standalone patches)
# Standalone patches: MAIN_APP_URL constant, buildMainUrl helper, STANDALONE_BACK_FALLBACK line,
#                    3 nav hrefs (target=_blank + rel=noopener)
EXPECTED_PAGE=$(mktemp)
NORMALIZED_EXPECTED_PAGE=$(mktemp)
NORMALIZED_STANDALONE_PAGE=$(mktemp)
trap 'rm -f "$EXPECTED_PAGE" "$NORMALIZED_EXPECTED_PAGE" "$NORMALIZED_STANDALONE_PAGE"' EXIT
cp "$ROOT/src/app/kpi/page.tsx" "$EXPECTED_PAGE"
node "$ROOT/scripts/apply-standalone-patches.js" "$EXPECTED_PAGE" >/dev/null
sed 's/\r$//' "$EXPECTED_PAGE" > "$NORMALIZED_EXPECTED_PAGE"
sed 's/\r$//' "$KPI_APP/src/app/page.tsx" > "$NORMALIZED_STANDALONE_PAGE"
DIFF_COUNT=$(diff "$NORMALIZED_EXPECTED_PAGE" "$NORMALIZED_STANDALONE_PAGE" | wc -l)
if [ $DIFF_COUNT -ne 0 ]; then
  echo "ERROR: kpi-app/src/app/page.tsx differs from Main source + standalone patch"
  diff -u "$NORMALIZED_EXPECTED_PAGE" "$NORMALIZED_STANDALONE_PAGE" || true
  exit 1
fi

if ! diff -q "$ROOT/src/app/kpi/template.tsx" "$KPI_APP/src/app/template.tsx" >/dev/null; then
  echo "ERROR: kpi-app/src/app/template.tsx differs from Main KPI template"
  diff -u "$ROOT/src/app/kpi/template.tsx" "$KPI_APP/src/app/template.tsx" || true
  exit 1
fi
echo "  OK: KPI template is synced (including notice banner position)"
echo "  Diff (sau khi bỏ standalone patches): $DIFF_COUNT lines"
if [ $DIFF_COUNT -eq 0 ]; then
  echo "  ✅ SYNCED — kpi-app/src/app/page.tsx ≡ src/app/kpi/page.tsx"
else
  echo "  ⚠️  Vẫn còn $DIFF_COUNT dòng khác biệt (có thể là standalone patches)"
fi

echo ""
echo "=== Sync complete ==="
echo ""
echo "Next steps:"
echo "  1. Test build:    cd kpi-app && npm install && npm run build"
echo "  2. Commit:        git add kpi-app/ && git commit -m 'sync kpi-app with main'"
echo "  3. Push:          git push → Vercel auto-deploys cả 2 projects"
