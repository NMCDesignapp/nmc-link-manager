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
fi

# Apply standalone patches via node (reliable multi-line + regex)
echo "[2/8] Applying standalone patches (MAIN_APP_URL, BackButton, thi-dua-chau)"
node -e "
const fs = require('fs');
const p = '$KPI_APP/src/app/page.tsx';
let c = fs.readFileSync(p, 'utf8');
let changed = [];

// Patch 1: Insert MAIN_APP_URL constant if missing
if (!c.includes('MAIN_APP_URL')) {
  const constInsert = \`
// === KPI standalone app: link back to main nc-link app ===
const MAIN_APP_URL = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MAIN_APP_URL) || '/';
const thiDuaChauHref = MAIN_APP_URL.endsWith('/') ? MAIN_APP_URL + 'thi-dua-chau' : MAIN_APP_URL + '/thi-dua-chau';
\`;
  c = c.replace(/(\\/\\* ================= CSS ================= \\*\\/)/, constInsert + '\n\$1');
  changed.push('inserted MAIN_APP_URL constant');
} else {
  changed.push('MAIN_APP_URL already present');
}

// Patch 2: BackButton href='/' → href={MAIN_APP_URL}
if (c.includes('<BackButton href=\"/\"')) {
  c = c.replace(/<BackButton\\s+href=\"\\/\"\\s+size=\\{20\\}\\s+title=\"Trở về trang chủ\"/, '<BackButton href={MAIN_APP_URL} size={20} title=\"Trở về trang chính\"');
  changed.push('patched BackButton href');
} else if (c.includes('<BackButton href={MAIN_APP_URL}')) {
  changed.push('BackButton already patched');
} else {
  changed.push('BackButton pattern not found (OK if main page changed)');
}

// Patch 3: <a href="/thi-dua-chau" → href={thiDuaChauHref}
if (c.includes('href=\"/thi-dua-chau\"')) {
  c = c.replace(/<a\\s+className=\"nav-btn nav-race\"\\s+href=\"\\/thi-dua-chau\"/, '<a className=\"nav-btn nav-race\" href={thiDuaChauHref}');
  changed.push('patched thi-dua-chau href');
} else if (c.includes('href={thiDuaChauHref}')) {
  changed.push('thi-dua-chau already patched');
} else {
  changed.push('thi-dua-chau pattern not found (OK if main page changed)');
}

// Patch 4: Inject floating '← Về app chính' button if missing
// Inject ngay SAU thẻ mở <div className="kpi-app"> để tránh break JSX root
if (!c.includes('kpi-standalone-back-btn')) {
  const btnJsx = \`<a href={MAIN_APP_URL} className=\"kpi-standalone-back-btn\" title=\"Về app chính\" aria-label=\"Về app chính\">← App</a>\`;
  // Tìm thẻ mở <div ... className="kpi-app" ...> và inject button ngay sau dấu '>' đóng thẻ
  const match = c.match(/<div[^>]*className=\"kpi-app\"[^>]*>/);
  if (match) {
    const closeTag = match[0];
    c = c.replace(closeTag, closeTag + '\n        ' + btnJsx);
    changed.push('injected floating back button');
  } else {
    changed.push('kpi-app container not found — skipping back button injection');
  }

  // Thêm CSS cho back button (chỉ thêm 1 lần)
  const btnCss = \`
.kpi-standalone-back-btn { position: fixed; top: 8px; left: 8px; z-index: 9999; background: rgba(8, 145, 178, 0.9); color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-decoration: none; box-shadow: 0 2px 8px rgba(0,0,0,0.3); backdrop-filter: blur(8px); transition: all 0.2s; }
.kpi-standalone-back-btn:hover { background: rgba(8, 145, 178, 1); transform: translateY(-1px); }
\`;
  if (!c.includes('kpi-standalone-back-btn { position: fixed')) {
    // Insert trước /* ===== LAYOUT ===== */ block
    c = c.replace(/(\\/\\* ================= LAYOUT ================= \\*\\/)/, btnCss + '\\n\$1');
    changed.push('added back-button CSS');
  }
} else {
  changed.push('floating back button already present');
}

if ($CHECK_ONLY === 0) {
  fs.writeFileSync(p, c);
}
console.log('  → ' + changed.join('; '));
"

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
for route in quan-ly/all settings calendar structure/ad structure/phong structure/bannhom structure/tvv; do
  if [ -f "$ROOT/src/app/api/$route/route.ts" ]; then
    if [ $CHECK_ONLY -eq 0 ]; then
      mkdir -p "$KPI_APP/src/app/api/$route"
      cp "$ROOT/src/app/api/$route/route.ts" "$KPI_APP/src/app/api/$route/route.ts"
    fi
  fi
done

# 5. Components
echo "[5/8] Syncing components/back-button.tsx"
if [ $CHECK_ONLY -eq 0 ]; then
  mkdir -p "$KPI_APP/src/components"
  cp "$ROOT/src/components/back-button.tsx" "$KPI_APP/src/components/back-button.tsx"
fi

# 6. Lib
echo "[6/8] Syncing lib/db.ts, lib/utils.ts"
if [ $CHECK_ONLY -eq 0 ]; then
  mkdir -p "$KPI_APP/src/lib"
  cp "$ROOT/src/lib/db.ts" "$KPI_APP/src/lib/db.ts"
  cp "$ROOT/src/lib/utils.ts" "$KPI_APP/src/lib/utils.ts" 2>/dev/null || true
fi

# 7. Prisma schema (only the tables kpi-app needs — main schema has PosterImage table etc)
# Skip — kpi-app keeps its own schema subset

# 8. Public assets (icons only — no posters, no large files)
echo "[7/8] Syncing public icons"
if [ $CHECK_ONLY -eq 0 ]; then
  mkdir -p "$KPI_APP/public/icon" "$KPI_APP/public/kpi"
  cp -r "$ROOT/public/icon/"* "$KPI_APP/public/icon/" 2>/dev/null || true
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
DIFF_COUNT=$(diff <(grep -v "MAIN_APP_URL\|thiDuaChauHref\|Trở về trang chính" "$ROOT/src/app/kpi/page.tsx") <(grep -v "MAIN_APP_URL\|thiDuaChauHref\|Trở về trang chính" "$KPI_APP/src/app/page.tsx") | wc -l)
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
