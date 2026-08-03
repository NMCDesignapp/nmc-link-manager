const fs = require('fs');

const file = 'src/app/kpi/page.tsx';
let source = fs.readFileSync(file, 'utf8');

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly 1 match, found ${count}`);
  source = source.replace(before, after);
}

function replaceRegexOnce(regex, replacement, label) {
  const matches = source.match(new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`));
  const count = matches ? matches.length : 0;
  if (count !== 1) throw new Error(`${label}: expected exactly 1 match, found ${count}`);
  source = source.replace(regex, replacement);
}

// 1) Tạm thu: cache ngắn, chống gọi trùng và tải nền sau khi KPI đã sẵn sàng.
replaceOnce(
  `  const [tamthuDetailRows, setTamthuDetailRows] = useState<TamthuDetailRow[]>([]);\n  const [tamthuDetailLoading, setTamthuDetailLoading] = useState(false);`,
  `  const [tamthuDetailRows, setTamthuDetailRows] = useState<TamthuDetailRow[]>([]);\n  const [tamthuDetailLoading, setTamthuDetailLoading] = useState(false);\n  const tamthuDetailRowsRef = useRef<TamthuDetailRow[]>([]);\n  const tamthuDetailFetchedAtRef = useRef(0);\n  const tamthuDetailRequestRef = useRef<Promise<TamthuDetailRow[]> | null>(null);`,
  'add tamthu cache refs'
);

replaceOnce(
`  // Sheet2 của Tamthu.xlsx là nguồn RIÊNG, chỉ dùng để xem bảng chi tiết tạm thu.\n  // Không trộn vào rawData nên không ảnh hưởng bất kỳ phép tính KPI/thi đua nào.\n  const fetchTamthuDetail = useCallback(async () => {\n    setTamthuDetailLoading(true);\n    try {\n      const response = await fetch('/api/tamthu-detail', { cache: 'no-store' });\n      const data = await response.json();\n      if (!response.ok || !Array.isArray(data?.rows)) throw new Error('load failed');\n      setTamthuDetailRows(data.rows);\n    } catch {\n      setTamthuDetailRows([]);\n    } finally {\n      setTamthuDetailLoading(false);\n    }\n  }, []);\n\n  useEffect(() => {\n    if (view === 'tamthu-detail') fetchTamthuDetail();\n  }, [view, fetchTamthuDetail]);`,
`  // Sheet2 của Tamthu.xlsx là nguồn RIÊNG, chỉ dùng để xem bảng chi tiết tạm thu.\n  // Không trộn vào rawData nên không ảnh hưởng bất kỳ phép tính KPI/thi đua nào.\n  // Dữ liệu được tải nền một lần và giữ cache 90 giây để mở bảng gần như tức thì.\n  const fetchTamthuDetail = useCallback(async (force = false): Promise<TamthuDetailRow[]> => {\n    const cacheFresh = !force\n      && tamthuDetailRowsRef.current.length > 0\n      && Date.now() - tamthuDetailFetchedAtRef.current < 90_000;\n    if (cacheFresh) return tamthuDetailRowsRef.current;\n    if (!force && tamthuDetailRequestRef.current) return tamthuDetailRequestRef.current;\n\n    if (force || tamthuDetailRowsRef.current.length === 0) setTamthuDetailLoading(true);\n    const request = (async () => {\n      try {\n        const response = await fetch('/api/tamthu-detail', { cache: 'no-store' });\n        const data = await response.json();\n        if (!response.ok || !Array.isArray(data?.rows)) throw new Error('load failed');\n        const rows = data.rows as TamthuDetailRow[];\n        tamthuDetailRowsRef.current = rows;\n        tamthuDetailFetchedAtRef.current = Date.now();\n        setTamthuDetailRows(rows);\n        return rows;\n      } catch {\n        // Nếu làm mới tạm thời thất bại, giữ dữ liệu cũ thay vì làm trắng bảng.\n        if (tamthuDetailRowsRef.current.length === 0) setTamthuDetailRows([]);\n        return tamthuDetailRowsRef.current;\n      } finally {\n        setTamthuDetailLoading(false);\n      }\n    })();\n\n    tamthuDetailRequestRef.current = request;\n    try {\n      return await request;\n    } finally {\n      if (tamthuDetailRequestRef.current === request) tamthuDetailRequestRef.current = null;\n    }\n  }, []);\n\n  useEffect(() => {\n    if (view === 'tamthu-detail') void fetchTamthuDetail(false);\n  }, [view, fetchTamthuDetail]);\n\n  // Prefetch sau khi dữ liệu KPI chính hoàn tất để người dùng mở Chi tiết tạm thu không phải chờ.\n  useEffect(() => {\n    if (appDataLoading || tamthuDetailRowsRef.current.length > 0) return;\n    const timer = window.setTimeout(() => { void fetchTamthuDetail(false); }, 350);\n    return () => window.clearTimeout(timer);\n  }, [appDataLoading, fetchTamthuDetail]);`,
  'replace tamthu loader'
);

// Không tải lại toàn bộ Data Hub khi chỉ mở bảng tạm thu.
const navBefore = `setView('tamthu-detail'); fetchData(); window.scrollTo({ top: 0, behavior: 'auto' });`;
const navCount = source.split(navBefore).length - 1;
if (navCount < 1) throw new Error(`tamthu nav: expected at least 1 match, found ${navCount}`);
source = source.split(navBefore).join(`setView('tamthu-detail'); window.scrollTo({ top: 0, behavior: 'auto' });`);

replaceOnce(
  `              onClick={() => { fetchData(); fetchTamthuDetail(); }}\n              title="Làm mới dữ liệu"`,
  `              onClick={() => { void fetchTamthuDetail(true); }}\n              title="Làm mới dữ liệu tạm thu"`,
  'tamthu refresh button'
);
replaceOnce(
  `<RotateCw size={15} className={syncing ? 'spin' : ''} />`,
  `<RotateCw size={15} className={tamthuDetailLoading ? 'spin' : ''} />`,
  'tamthu refresh spinner'
);

// 2) Danh sách đăng ký mục tiêu: tiêu đề phải là tháng hiện tại, đúng với API đang tải.
replaceRegexOnce(
  /\{\(\(\) => \{\n\s*const nextMonth = new Date\(NOW\.getFullYear\(\), NOW\.getMonth\(\) \+ 1, 1\);\n\s*return `Đăng ký mục tiêu tháng \$\{nextMonth\.getMonth\(\) \+ 1\}\/\$\{nextMonth\.getFullYear\(\)\}`;\n\s*\}\)\(\)\}/,
  `{\`Đăng ký mục tiêu tháng \${NOW.getMonth() + 1}/\${NOW.getFullYear()}\`}`,
  'current target registration month'
);

// 3) Dời băng thông báo vào cùng hàng với bộ lọc tháng.
replaceRegexOnce(
  /\n\s*\{\/\* ===== NOTIFICATION BANNER[\s\S]*?\*\/\}\n\s*\{noticeEnabled && noticeContent && \([\s\S]*?\n\s*\)\}\n\s*<header>/,
  `\n          <header>`,
  'remove old top notice banner'
);

replaceOnce(
  `<div className="ctrl-bar">`,
  `<div className={\`ctrl-bar\${noticeEnabled && noticeContent ? ' has-notice' : ''}\`}>`,
  'notice-aware control row'
);

replaceOnce(
`              </div>\n              {!standalone && adminAuthed ? (\n                <button className={\`sync-status \${syncing ? 'syncing' : ''}\`} onClick={fetchData} title="Đồng bộ" aria-label="Đồng bộ dữ liệu">`,
`              </div>\n              {noticeEnabled && noticeContent && (\n                <div className="kpi-notice-banner" role="marquee" aria-live="polite" aria-label="Thông báo KPI">\n                  <span\n                    className="kpi-notice-marquee"\n                    dangerouslySetInnerHTML={{ __html: noticeContent }}\n                  />\n                </div>\n              )}\n              {!standalone && adminAuthed ? (\n                <button className={\`sync-status ctrl-sync-slot \${syncing ? 'syncing' : ''}\`} onClick={fetchData} title="Đồng bộ" aria-label="Đồng bộ dữ liệu">`,
  'insert notice after month filter'
);

replaceOnce(
  `              ) : <div style={{ width: 36, height: 36, flexShrink: 0 }} />}`,
  `              ) : <div className="ctrl-sync-slot ctrl-sync-placeholder" />}`,
  'sync placeholder class'
);

// Append final overrides at the end of the CSS template so older responsive rules cannot override them.
const cssStart = source.indexOf('const CSS = `');
if (cssStart < 0) throw new Error('CSS template start not found');
const cssEnd = source.indexOf('\n`;', cssStart);
if (cssEnd < 0) throw new Error('CSS template end not found');
const cssOverride = `\n\n/* ============= KPI CONTROL ROW + SOFT NOTICE BAND (2026-08-03) ============= */\n.kpi-app .ctrl-sync-placeholder { width: 36px; height: 36px; flex: 0 0 36px; }\n.kpi-app .ctrl-bar.has-notice {\n  width: calc(50vw + 50%);\n  max-width: none;\n  padding-right: 0;\n  overflow: visible;\n}\n.kpi-app .ctrl-bar.has-notice .ctrl-select-wrap {\n  position: relative !important;\n  z-index: 36;\n  flex: 0 0 auto;\n}\n.kpi-app .ctrl-bar.has-notice .ctrl-select-popup {\n  left: 0 !important;\n  right: auto !important;\n  width: min(420px, calc(100vw - 24px)) !important;\n  max-width: calc(100vw - 24px) !important;\n}\n.kpi-app .ctrl-bar.has-notice .kpi-notice-banner {\n  position: relative;\n  flex: 1 1 auto;\n  min-width: 0;\n  width: auto;\n  height: 36px;\n  margin: 0;\n  padding-right: 52px;\n  overflow: hidden;\n  border: 1px solid rgba(212, 168, 67, .34);\n  border-right: 0;\n  border-radius: 10px 0 0 10px;\n  background: rgba(255, 244, 190, .68);\n  -webkit-backdrop-filter: blur(10px) saturate(115%);\n  backdrop-filter: blur(10px) saturate(115%);\n  box-shadow: inset 0 1px 0 rgba(255,255,255,.58), 0 5px 16px rgba(181,139,31,.14);\n  display: flex;\n  align-items: center;\n}\n.kpi-app .ctrl-bar.has-notice .kpi-notice-marquee {\n  display: inline-block;\n  min-width: max-content;\n  padding-left: 100%;\n  white-space: nowrap;\n  color: #36552c;\n  font-size: 12px;\n  font-weight: 800;\n  letter-spacing: .015em;\n  text-shadow: 0 1px 0 rgba(255,255,255,.5);\n  animation: kpiNoticeControlScroll 20s linear infinite;\n  will-change: transform;\n}\n@keyframes kpiNoticeControlScroll {\n  from { transform: translateX(0); }\n  to { transform: translateX(-100%); }\n}\n.kpi-app .ctrl-bar.has-notice .kpi-notice-banner:hover .kpi-notice-marquee { animation-play-state: paused; }\n.kpi-app .ctrl-bar.has-notice .ctrl-sync-slot {\n  position: absolute;\n  right: 8px;\n  top: 50%;\n  z-index: 38;\n  transform: translateY(-50%);\n}\n@media (max-width: 720px) {\n  .kpi-app .ctrl-bar.has-notice { gap: 6px; }\n  .kpi-app .ctrl-bar.has-notice .ctrl-hint { display: none; }\n  .kpi-app .ctrl-bar.has-notice .kpi-notice-banner { height: 34px; padding-right: 46px; border-radius: 8px 0 0 8px; }\n  .kpi-app .ctrl-bar.has-notice .kpi-notice-marquee { font-size: 11px; animation-duration: 18s; }\n  .kpi-app .ctrl-bar.has-notice .ctrl-sync-slot { right: 5px; }\n}\n`;
source = source.slice(0, cssEnd) + cssOverride + source.slice(cssEnd);

fs.writeFileSync(file, source, 'utf8');

const checks = [
  'tamthuDetailFetchedAtRef',
  'void fetchTamthuDetail(true)',
  "Đăng ký mục tiêu tháng ${NOW.getMonth() + 1}/${NOW.getFullYear()}",
  'ctrl-bar${noticeEnabled && noticeContent',
  'kpiNoticeControlScroll',
  'background: rgba(255, 244, 190, .68)',
];
for (const marker of checks) {
  if (!source.includes(marker)) throw new Error(`missing verification marker: ${marker}`);
}
if (source.includes('setView(\'tamthu-detail\'); fetchData();')) throw new Error('whole-app refresh still attached to tamthu navigation');
if (source.includes('const nextMonth = new Date(NOW.getFullYear(), NOW.getMonth() + 1, 1);')) throw new Error('next-month heading still present');

console.log(`Applied KPI speed/month/banner patch. Removed ${navCount} whole-app refresh call(s) from tamthu navigation.`);
