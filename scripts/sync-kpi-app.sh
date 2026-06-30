#!/usr/bin/env bash
# sync-kpi-app.sh — Sync KPI page changes from main app to standalone kpi-app
#
# Run this BEFORE committing/deploying whenever you edit /src/app/kpi/page.tsx
# in the main app. It copies the latest KPI page + dependent files into kpi-app/.
#
# Usage:
#   bash scripts/sync-kpi-app.sh
#
# After sync, the kpi-app/ folder is ready to push to git → Vercel auto-deploys.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KPI_APP="$ROOT/kpi-app"

if [ ! -d "$KPI_APP" ]; then
  echo "ERROR: kpi-app/ folder not found at $KPI_APP"
  exit 1
fi

echo "=== Syncing KPI app from main source ==="
echo ""

# 1. KPI page → kpi-app/src/app/page.tsx
echo "[1/7] Copying src/app/kpi/page.tsx → kpi-app/src/app/page.tsx"
cp "$ROOT/src/app/kpi/page.tsx" "$KPI_APP/src/app/page.tsx"

# Re-apply standalone modifications (MAIN_APP_URL pattern)
node -e "
const fs = require('fs');
const p = '$KPI_APP/src/app/page.tsx';
let c = fs.readFileSync(p, 'utf8');

// Skip if already has MAIN_APP_URL
if (c.includes('MAIN_APP_URL')) {
  console.log('  - MAIN_APP_URL pattern already present, skipping insertion');
} else {
  const constInsert = \`
// === KPI standalone app: link back to main nc-link app ===
const MAIN_APP_URL = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MAIN_APP_URL) || '/';
const thiDuaChauHref = MAIN_APP_URL.endsWith('/') ? MAIN_APP_URL + 'thi-dua-chau' : MAIN_APP_URL + '/thi-dua-chau';
\`;
  c = c.replace(/(\\/\\* ================= CSS ================= \\*\\/)/, constInsert + '\n\$1');
  console.log('  - Inserted MAIN_APP_URL constant');
}

// Replace BackButton href='/' with MAIN_APP_URL (only if not already replaced)
if (c.includes('<BackButton href=\"/\"')) {
  c = c.replace(/<BackButton\\s+href=\"\\/\"\\s+size=\{20\}\\s+title=\"Trở về trang chủ\"/, '<BackButton href={MAIN_APP_URL} size={20} title=\"Trở về trang chính\"');
  console.log('  - Patched BackButton href');
}

// Replace /thi-dua-chau anchor (only if not already replaced)
if (c.includes('href=\"/thi-dua-chau\"')) {
  c = c.replace(/<a\\s+className=\"nav-btn nav-race\"\\s+href=\"\\/thi-dua-chau\"/, '<a className=\"nav-btn nav-race\" href={thiDuaChauHref}');
  console.log('  - Patched thi-dua-chau href');
}

fs.writeFileSync(p, c);
"

# 2. API routes
echo "[2/7] Syncing API routes"
cp "$ROOT/src/app/api/quan-ly/all/route.ts" "$KPI_APP/src/app/api/quan-ly/all/route.ts"
cp "$ROOT/src/app/api/settings/route.ts" "$KPI_APP/src/app/api/settings/route.ts"
cp "$ROOT/src/app/api/calendar/route.ts" "$KPI_APP/src/app/api/calendar/route.ts"
cp "$ROOT/src/app/api/structure/ad/route.ts" "$KPI_APP/src/app/api/structure/ad/route.ts"
cp "$ROOT/src/app/api/structure/phong/route.ts" "$KPI_APP/src/app/api/structure/phong/route.ts"
cp "$ROOT/src/app/api/structure/bannhom/route.ts" "$KPI_APP/src/app/api/structure/bannhom/route.ts"
cp "$ROOT/src/app/api/structure/tvv/route.ts" "$KPI_APP/src/app/api/structure/tvv/route.ts"

# 3. Components
echo "[3/7] Syncing components/back-button.tsx"
cp "$ROOT/src/components/back-button.tsx" "$KPI_APP/src/components/back-button.tsx"

# 4. Lib
echo "[4/7] Syncing lib/db.ts, lib/utils.ts"
cp "$ROOT/src/lib/db.ts" "$KPI_APP/src/lib/db.ts"
cp "$ROOT/src/lib/utils.ts" "$KPI_APP/src/lib/utils.ts" 2>/dev/null || true

# 5. Prisma schema
echo "[5/7] Syncing prisma/schema.prisma"
cp "$ROOT/prisma/schema.prisma" "$KPI_APP/prisma/schema.prisma"

# 6. Public assets (icons only — no posters, no large files)
echo "[6/7] Syncing public icons"
cp -r "$ROOT/public/icon/"* "$KPI_APP/public/icon/" 2>/dev/null || true
cp -r "$ROOT/public/kpi/"* "$KPI_APP/public/kpi/" 2>/dev/null || true
cp "$ROOT/public/logo.svg" "$KPI_APP/public/" 2>/dev/null || true

# 7. Verify
echo "[7/7] Verifying..."
LINES=$(wc -l < "$KPI_APP/src/app/page.tsx")
echo "  kpi-app/src/app/page.tsx: $LINES lines"
echo ""
echo "=== Sync complete ==="
echo ""
echo "Next steps:"
echo "  1. cd kpi-app && npm install && npm run build  (test locally)"
echo "  2. git add kpi-app/ && git commit -m 'sync kpi-app with main'"
echo "  3. Push to git → Vercel auto-deploys kpi-app project"
