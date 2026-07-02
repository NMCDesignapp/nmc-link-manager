#!/usr/bin/env node
/**
 * apply-standalone-patches.js
 *
 * Áp dụng các standalone patches cho kpi-app/src/app/page.tsx
 * sau khi đã copy từ src/app/kpi/page.tsx (main app).
 *
 * Patches:
 *  1. Insert MAIN_APP_URL constant + buildMainUrl helper
 *  2. Back button fallback (STANDALONE_BACK_FALLBACK marker):
 *     router.push('/') → window.location.href = MAIN_APP_URL
 *  3. 3 nút nav (Thi đua / Chính sách / CLB) → mở sang MAIN_APP_URL (target=_blank)
 *  4. (REMOVED — user yêu cầu bỏ) floating "← App" button
 *  5. Dọn dẹp legacy floating button + CSS nếu có từ lần sync trước
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
if (!c.includes('MAIN_APP_URL')) {
  const constInsert = `
// === KPI standalone app: link back to main nc-link app ===
const MAIN_APP_URL = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MAIN_APP_URL) || '/';
const buildMainUrl = (path) => MAIN_APP_URL.endsWith('/') ? MAIN_APP_URL + path.replace(/^\\//, '') : MAIN_APP_URL + path;
`;
  c = c.replace(/(\/\* ================= CSS ================= \*\/)/, constInsert + '\n$1');
  changed.push('inserted MAIN_APP_URL + buildMainUrl helper');
} else if (!c.includes('buildMainUrl')) {
  // Migrate layout cũ: thay thiDuaChauHref bằng buildMainUrl helper
  c = c.replace(/const thiDuaChauHref = [^;]+;/, "const buildMainUrl = (path) => MAIN_APP_URL.endsWith('/') ? MAIN_APP_URL + path.replace(/^\\//, '') : MAIN_APP_URL + path;");
  changed.push('migrated thiDuaChauHref → buildMainUrl helper');
} else {
  changed.push('MAIN_APP_URL + buildMainUrl already present');
}

// Patch 2: Back button fallback — `router.push('/');  // STANDALONE_BACK_FALLBACK`
// → `window.location.href = MAIN_APP_URL;  // STANDALONE_BACK_FALLBACK`
// (Standalone không có trang '/' — phải mở MAIN_APP_URL)
if (c.includes("router.push('/');  // STANDALONE_BACK_FALLBACK")) {
  c = c.replace(
    /router\.push\('\/\'\);\s*\/\/ STANDALONE_BACK_FALLBACK/,
    "window.location.href = MAIN_APP_URL;  // STANDALONE_BACK_FALLBACK"
  );
  changed.push('patched back button fallback → MAIN_APP_URL');
} else if (c.includes('window.location.href = MAIN_APP_URL;  // STANDALONE_BACK_FALLBACK')) {
  changed.push('back button fallback already patched');
} else {
  changed.push('STANDALONE_BACK_FALLBACK marker not found (OK if main page changed)');
}

// Dọn dẹp legacy: BackButton href={MAIN_APP_URL} từ layout cũ (nếu có) — không còn dùng nữa
if (c.includes('<BackButton href={MAIN_APP_URL}')) {
  // Legacy — không sửa nữa vì main app không còn pattern này.
  // (chỉ log để biết)
  changed.push('legacy <BackButton href={MAIN_APP_URL}> still present (harmless)');
}

// Patch 3: 3 nút nav → mở sang MAIN_APP_URL (target=_blank)
// Main app code:
//   <a className="nav-btn nav-race" href="/quan-ly?sheet=saoviet">
//   <a className="nav-btn nav-policy" href="/quan-ly?sheet=report">
//   <a className="nav-btn nav-clb" href="/quan-ly?sheet=clb-saoviet">
// Standalone: href={buildMainUrl('/quan-ly?sheet=...')} target="_blank" rel="noopener noreferrer"
const navReplacements = [
  ['nav-race', '/quan-ly?sheet=saoviet'],
  ['nav-policy', '/quan-ly?sheet=report'],
  ['nav-clb', '/quan-ly?sheet=clb-saoviet'],
];
let navPatched = 0;
for (const [cls, path] of navReplacements) {
  const pathEsc = path.replace(/\?/g, '\\?');
  const oldPattern = new RegExp('<a\\s+className="nav-btn ' + cls + '"\\s+href="' + pathEsc + '"');
  const newStr = '<a className="nav-btn ' + cls + '" href={buildMainUrl(\'' + path + '\')} target="_blank" rel="noopener noreferrer"';
  if (oldPattern.test(c)) {
    c = c.replace(oldPattern, newStr);
    navPatched++;
  } else if (c.includes("buildMainUrl('" + path + "')")) {
    // already patched — OK
  } else {
    changed.push(cls + ' nav pattern not found (OK if main page changed)');
  }
}
if (navPatched > 0) changed.push('patched ' + navPatched + ' nav hrefs → MAIN_APP_URL target=_blank');

// Patch 4 (REMOVED): floating '← App' button — user yêu cầu bỏ.
// Không inject thêm nút floating hay CSS đi kèm.

// Dọn dẹp: nếu standalone page.tsx cũ vẫn còn floating button/CSS → strip ra
if (c.includes('kpi-standalone-back-btn')) {
  // Xoá thẻ <a ... className="kpi-standalone-back-btn" ...>← App</a>
  c = c.replace(/\s*<a\s+href=\{MAIN_APP_URL\}\s+className="kpi-standalone-back-btn"[^>]*>[^<]*<\/a>\n?/g, '');
  // Xoá block CSS .kpi-standalone-back-btn { ... } và :hover { ... }
  c = c.replace(/\.kpi-standalone-back-btn\s*\{[^}]*\}\s*/g, '');
  c = c.replace(/\.kpi-standalone-back-btn:hover\s*\{[^}]*\}\s*/g, '');
  changed.push('stripped legacy floating back button + CSS');
}

if (!checkOnly) {
  fs.writeFileSync(targetFile, c);
}
console.log('  → ' + changed.join('; '));
