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
// Main app code (XUẤT HIỆN 2 LẦN: mobile nav-grid + desktop dsk-nav):
//   <a className="nav-btn nav-race" href="/quan-ly?sheet=saoviet">
//   <a className="nav-btn nav-policy" href="/quan-ly?sheet=report">
//   <a className="nav-btn nav-clb" href="/quan-ly?sheet=clb-saoviet">
// Standalone: href={buildMainUrl('/quan-ly?sheet=...')} target="_blank" rel="noopener noreferrer"
// QUAN TRỌNG: phải thay ALL occurrences (có 2 bộ: mobile + desktop) — dùng /g flag.
// Trước đây chỉ thay occurrence đầu → desktop nav vẫn dùng relative URL → trang trắng khi click.
//
// QUAN TRỌNG (2026-07): Main app đã thêm `&from=kpi` vào URL để đánh dấu embed mode.
// Standalone CŨNG CẦN `&from=kpi` vì 3 nút mở sang MAIN APP's /quan-ly (tab mới),
// và main app's /quan-ly chỉ ẩn sidebar khi URL có `from=kpi`.
// Nếu standalone KHÔNG thêm `&from=kpi` → sidebar vẫn hiện → user thấy menu admin.
//
// Cấu trúc navReplacements: [cssClass, srcPath, destPath]
//   srcPath  = path KHÔNG có &from=kpi (để match main app code, có thể có hoặc không có suffix)
//   destPath = path CÓ &from=kpi (để buildMainUrl generate URL đầy đủ cho standalone)
const navReplacements = [
  ['nav-race', '/quan-ly?sheet=saoviet', '/quan-ly?sheet=saoviet&from=kpi'],
  ['nav-policy', '/quan-ly?sheet=report', '/quan-ly?sheet=report&from=kpi'],
  ['nav-clb', '/quan-ly?sheet=clb-saoviet', '/quan-ly?sheet=clb-saoviet&from=kpi'],
];
let navPatched = 0;
for (const [cls, srcPath, destPath] of navReplacements) {
  // Match cả pattern cũ (không &from=kpi) và pattern mới (có &from=kpi) trên main app
  // Ví dụ: <a className="nav-btn nav-race" href="/quan-ly?sheet=saoviet&from=kpi">
  //      hoặc: <a className="nav-btn nav-race" href="/quan-ly?sheet=saoviet">
  const srcEsc = srcPath.replace(/\?/g, '\\?').replace(/\//g, '\\/');
  const oldPattern = new RegExp('<a\\s+className="nav-btn ' + cls + '"\\s+href="' + srcEsc + '(&from=kpi)?"', 'g');
  const newStr = '<a className="nav-btn ' + cls + '" href={buildMainUrl(\'' + destPath + '\')} target="_blank" rel="noopener noreferrer"';
  const beforeLen = c.length;
  c = c.replace(oldPattern, newStr);
  const matches = beforeLen !== c.length ? 1 : 0; // simple check — real count via match
  // Match destPath (có &from=kpi) để verify patch đã apply
  const destEsc = destPath.replace(/\?/g, '\\?').replace(/\//g, '\\/').replace(/&/g, '\\&');
  const matchCount = (c.match(new RegExp('buildMainUrl\\(\'' + destEsc + '\'\\)', 'g')) || []).length;
  if (matchCount >= 2) {
    navPatched += matchCount;
  } else if (matchCount === 1) {
    navPatched += 1;
  } else {
    changed.push(cls + ' nav pattern not found (OK if main page changed)');
  }
}
if (navPatched > 0) changed.push('patched ' + navPatched + ' nav hrefs → MAIN_APP_URL target=_blank with &from=kpi (mobile + desktop)');

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

// Patch 5: Default export → KPIDashboard standalone (KHÔNG phải standalone={false})
// Standalone kpi-app là KPI tách (end-user) → standalone=true:
//   - Ẩn nút back về main app (user không được về)
//   - Ẩn admin features (sync, admin auth)
//   - 3 nút THI ĐUA / CHÍNH SÁCH / CLB mở sang MAIN_APP_URL (đã patch ở Patch 3)
// Main app default export: `export default function KPIPage() { return <KPIDashboard standalone={false} />; }`
// Standalone: `export default function KPIPage() { return <KPIDashboard standalone />; }`
// Phải match cả pattern cũ (standalone={false}) và pattern mới (standalone) để idempotent.
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
// Main app env có thể không set NEXT_PUBLIC_MAIN_APP_URL → fallback '/' sẽ break
// standalone (vì standalone không có route /quan-ly).
// Hardcode fallback production URL để 3 nút luôn hoạt động.
if (c.includes("|| '/';")) {
  c = c.replace(
    /const MAIN_APP_URL = \(typeof process !== 'undefined' && process\.env\.NEXT_PUBLIC_MAIN_APP_URL\) \|\| '\/';/,
    "const MAIN_APP_URL = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MAIN_APP_URL) || 'https://nc-link.vercel.app';"
  );
  changed.push('patched MAIN_APP_URL fallback → https://nc-link.vercel.app');
} else if (c.includes("|| 'https://nc-link.vercel.app';")) {
  changed.push('MAIN_APP_URL fallback already patched');
}

if (!checkOnly) {
  fs.writeFileSync(targetFile, c);
}
console.log('  → ' + changed.join('; '));
