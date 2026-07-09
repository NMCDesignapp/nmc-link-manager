#!/usr/bin/env node
/**
 * apply-standalone-patches.js
 *
 * Áp dụng các standalone patches cho kpi-app/src/app/page.tsx
 * sau khi đã copy từ src/app/kpi/page.tsx (main app).
 *
 * Patches:
 *  1. Insert MAIN_APP_URL constant + buildMainUrl helper (nếu chưa có)
 *     — Main app source đã include constants này từ 2026-07-09 → patch thường là no-op.
 *  2. Back button fallback (STANDALONE_BACK_FALLBACK marker):
 *     router.push('/') → window.location.href = MAIN_APP_URL
 *  3. (REMOVED — 2026-07-09) 3 nút nav → buildMainUrl + target=_blank
 *     — Main app source đã统一 dùng `<button onClick={setKpiSheet}>` cho cả 2,
 *       iframe overlay src đã standalone-aware → không cần patch nav nữa.
 *  4. (REMOVED) floating "← App" button — user yêu cầu bỏ
 *  5. Default export → KPIDashboard standalone (true)
 *  6. MAIN_APP_URL fallback → 'https://nc-link.vercel.app' (nếu vẫn còn '/')
 *
 * Usage:
 *   node scripts/apply-standalone-patches.js /path/to/kpi-app/src/app/page.tsx
 *   node scripts/apply-standalone-patches.js /path/to/kpi-app/src/app/page.tsx --check
 */

const fs = require('fs');

const targetFile = process.argv[2];
const checkOnly = process.argv.includes('--check');

if (!targetFile || !fs.existsSync(targetFile)) {
  console.error('ERROR: target file not provided or not found');
  console.error('Usage: node apply-standalone-patches.js <kpi-app page.tsx> [--check]');
  process.exit(1);
}

let c = fs.readFileSync(targetFile, 'utf8');
const changed = [];

// Patch 1: Insert MAIN_APP_URL + buildMainUrl helper if missing
// (Main app source code now includes these constants → this patch is usually a no-op.)
if (!c.includes('MAIN_APP_URL')) {
  const constInsert = `
// === KPI standalone app: link back to main nc-link app ===
const MAIN_APP_URL = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MAIN_APP_URL) || '/';
const buildMainUrl = (path) => MAIN_APP_URL.endsWith('/') ? MAIN_APP_URL + path.replace(/^\\//, '') : MAIN_APP_URL + path;
`;
  c = c.replace(/(\/\* ================= CSS ================= \*\/)/, constInsert + '\n$1');
  changed.push('inserted MAIN_APP_URL + buildMainUrl helper');
} else if (!c.includes('buildMainUrl')) {
  c = c.replace(/const thiDuaChauHref = [^;]+;/, "const buildMainUrl = (path) => MAIN_APP_URL.endsWith('/') ? MAIN_APP_URL + path.replace(/^\\//, '') : MAIN_APP_URL + path;");
  changed.push('migrated thiDuaChauHref → buildMainUrl helper');
} else {
  changed.push('MAIN_APP_URL + buildMainUrl already present');
}

// Patch 2: Back button fallback — `router.push('/');  // STANDALONE_BACK_FALLBACK`
// → `window.location.href = MAIN_APP_URL;  // STANDALONE_BACK_FALLBACK`
if (c.includes("router.push('/');  // STANDALONE_BACK_FALLBACK")) {
  c = c.replace(
    /router\.push\('\/'\);\s*\/\/ STANDALONE_BACK_FALLBACK/,
    "window.location.href = MAIN_APP_URL;  // STANDALONE_BACK_FALLBACK"
  );
  changed.push('patched back button fallback → MAIN_APP_URL');
} else if (c.includes('window.location.href = MAIN_APP_URL;  // STANDALONE_BACK_FALLBACK')) {
  changed.push('back button fallback already patched');
} else {
  changed.push('STANDALONE_BACK_FALLBACK marker not found (OK if main page changed)');
}

// Dọn dẹp legacy: BackButton href={MAIN_APP_URL} từ layout cũ (nếu có)
if (c.includes('<BackButton href={MAIN_APP_URL}')) {
  changed.push('legacy <BackButton href={MAIN_APP_URL}> still present (harmless)');
}

// Patch 3 (REMOVED — 2026-07-09):
// Trước đây main app source dùng `<a href="/quan-ly?sheet=xxx&from=kpi">` cho standalone
// và `<button onClick={setKpiSheet}>` cho admin. Patch 3 thay `<a>` → `<a href={buildMainUrl} target=_blank>`.
// Nay main app source đã统一: cả standalone và admin đều dùng `<button onClick={setKpiSheet}>`.
// Iframe overlay src đã standalone-aware (buildMainUrl cho standalone, relative cho admin).
// → Không cần patch 3 nút nav nữa.

// Patch 4 (REMOVED): floating '← App' button — user yêu cầu bỏ.

// Dọn dẹp: nếu standalone page.tsx cũ vẫn còn floating button/CSS → strip ra
if (c.includes('kpi-standalone-back-btn')) {
  c = c.replace(/\s*<a\s+href=\{MAIN_APP_URL\}\s+className="kpi-standalone-back-btn"[^>]*>[^<]*<\/a>\n?/g, '');
  c = c.replace(/\.kpi-standalone-back-btn\s*\{[^}]*\}\s*/g, '');
  c = c.replace(/\.kpi-standalone-back-btn:hover\s*\{[^}]*\}\s*/g, '');
  changed.push('stripped legacy floating back button + CSS');
}

// Patch 5: Default export → KPIDashboard standalone (KHÔNG phải standalone={false})
// Standalone kpi-app là KPI tách (end-user) → standalone=true:
//   - Ẩn nút back về main app (user không được về)
//   - Ẩn admin features (sync, admin auth)
//   - 3 nút THI ĐUA / CHÍNH SÁCH / CLB mở iframe overlay với buildMainUrl (end-user mode)
if (c.match(/export default function KPIPage\(\)\s*\{\s*return <KPIDashboard\s+standalone(?:=\{false\})?\s*\/?>\s*;\s*\}/)) {
  c = c.replace(
    /export default function KPIPage\(\)\s*\{\s*return <KPIDashboard\s+standalone(?:=\{false\})?\s*\/?>\s*;\s*\}/,
    'export default function KPIPage() {\n  return <KPIDashboard standalone />;\n}'
  );
  changed.push('patched default export → KPIDashboard standalone (true)');
} else if (c.match(/export default function KPIPage\(\)\s*\{\s*return <KPIDashboard\s+standalone\s*\/?>\s*;\s*\}/)) {
  changed.push('default export already patched → KPIDashboard standalone');
} else {
  changed.push('default export pattern not found (OK if main page changed)');
}

// Patch 6: MAIN_APP_URL fallback — đảm bảo luôn có URL tuyệt đối (không phải '/')
// Main app source đã hardcode 'https://nc-link.vercel.app' → patch thường là no-op.
// Nếu fallback vẫn là '/' (legacy), replace bằng production URL.
if (c.includes("|| '/';")) {
  c = c.replace(
    /const MAIN_APP_URL = \(typeof process !== 'undefined' && process\.env\.NEXT_PUBLIC_MAIN_APP_URL\) \|\| '\/';/,
    "const MAIN_APP_URL = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MAIN_APP_URL) || 'https://nc-link.vercel.app';"
  );
  changed.push('patched MAIN_APP_URL fallback → https://nc-link.vercel.app');
} else if (c.includes("|| 'https://nc-link.vercel.app';")) {
  changed.push('MAIN_APP_URL fallback already production URL');
}

if (!checkOnly) {
  fs.writeFileSync(targetFile, c);
}
console.log('  → ' + changed.join('; '));
