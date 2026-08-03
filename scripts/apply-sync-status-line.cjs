const fs = require('fs');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, content) { fs.writeFileSync(file, content, 'utf8'); }
function replaceOnce(file, before, after) {
  const content = read(file);
  const count = content.split(before).length - 1;
  if (count !== 1) throw new Error(`${file}: expected one match, found ${count}: ${before.slice(0, 120)}`);
  write(file, content.replace(before, after));
}

// API: expose the most recent sync time for the currently active source.
replaceOnce(
  'src/app/api/sync-source/route.ts',
  `  'nmc-data-hub-last-result',\n  'nmc-sync-source-updated-at',`,
  `  'nmc-data-hub-last-result',\n  'nmc-google-last-sync-at',\n  'nmc-sync-source-updated-at',`
);
replaceOnce(
  'src/app/api/sync-source/route.ts',
  `  const dataHubOnline = source === 'data-hub' && Number.isFinite(seenMs) && Date.now() - seenMs < 90_000;\n  return {`,
  `  const dataHubOnline = source === 'data-hub' && Number.isFinite(seenMs) && Date.now() - seenMs < 90_000;\n  const lastSyncAt = source === 'google'\n    ? (values['nmc-google-last-sync-at'] || '')\n    : (values['nmc-data-hub-last-sync-at'] || '');\n  return {`
);
replaceOnce(
  'src/app/api/sync-source/route.ts',
  `    lastSyncAt: values['nmc-data-hub-last-sync-at'] || '',`,
  `    lastSyncAt,`
);

// Management page: keep the latest server-reported sync time.
replaceOnce(
  'src/app/quan-ly/page.tsx',
  `  const [dataHubOnline, setDataHubOnline] = useState(false);\n  const [syncSourceSwitching, setSyncSourceSwitching] = useState(false);`,
  `  const [dataHubOnline, setDataHubOnline] = useState(false);\n  const [syncLastAt, setSyncLastAt] = useState('');\n  const [syncSourceSwitching, setSyncSourceSwitching] = useState(false);`
);
replaceOnce(
  'src/app/quan-ly/page.tsx',
  `        setDataHubOnline(status.dataHubOnline === true);\n        setSyncEnabled(true);`,
  `        setDataHubOnline(status.dataHubOnline === true);\n        setSyncLastAt(status.lastSyncAt || '');\n        setSyncEnabled(true);`
);
replaceOnce(
  'src/app/quan-ly/page.tsx',
  `          setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));`,
  `          const syncedAt = new Date();\n          setLastSyncTime(syncedAt.toLocaleTimeString('vi-VN'));\n          setSyncLastAt(syncedAt.toISOString());\n          void saveSetting('nmc-google-last-sync-at', syncedAt.toISOString());`
);
replaceOnce(
  'src/app/quan-ly/page.tsx',
  `  }, [googleSyncEnabled, onlineSettings]);`,
  `  }, [googleSyncEnabled, onlineSettings, saveSetting]);`
);
replaceOnce(
  'src/app/quan-ly/page.tsx',
  `      setSyncSource(nextSource);\n      setDataHubOnline(result.dataHubOnline === true);\n      syncedLinksRef.current = '';`,
  `      setSyncSource(nextSource);\n      setDataHubOnline(result.dataHubOnline === true);\n      setSyncLastAt(result.lastSyncAt || '');\n      syncedLinksRef.current = '';`
);

// Small status line at the top of every automatically synchronized data section.
replaceOnce(
  'src/app/quan-ly/page.tsx',
  `        <main className="flex-1 overflow-y-auto p-3 sm:p-4 relative">\n          {renderSheet()}\n        </main>`,
  `        <main className="flex-1 overflow-y-auto p-3 sm:p-4 relative">\n          {['revenue', 'structure', 'saoviet', 'leaders', 'recruiters', 'tuyen-ngang'].includes(activeSheet) && (\n            <div\n              className={\`mb-2 min-h-7 px-2.5 py-1 rounded-md border flex items-center gap-2 text-[10px] sm:text-[11px] \${\n                googleSyncEnabled || dataHubOnline\n                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'\n                  : 'border-amber-500/30 bg-amber-500/10 text-amber-200'\n              }\`}\n              title={syncLastAt ? \`Lần đồng bộ gần nhất: \${new Date(syncLastAt).toLocaleString('vi-VN')}\` : 'Chưa ghi nhận lần đồng bộ nào'}\n            >\n              <span className={\`h-2 w-2 rounded-full flex-shrink-0 \${\n                googleSyncEnabled || dataHubOnline\n                  ? 'bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,0.8)]'\n                  : 'bg-amber-400 shadow-[0_0_7px_rgba(251,191,36,0.7)]'\n              }\`} />\n              <span className="font-bold whitespace-nowrap">\n                {googleSyncEnabled\n                  ? 'Google Sheets đang bật'\n                  : dataHubOnline\n                    ? 'Excel trên máy tính đang kết nối'\n                    : 'Excel trên máy tính chưa kết nối'}\n              </span>\n              <span className="opacity-50">•</span>\n              <span className="truncate opacity-90">\n                Lần gần nhất: {syncLastAt\n                  ? new Date(syncLastAt).toLocaleString('vi-VN', { hour12: false })\n                  : 'chưa có dữ liệu'}\n              </span>\n            </div>\n          )}\n          {renderSheet()}\n        </main>`
);

for (const [file, needle] of [
  ['src/app/api/sync-source/route.ts', "nmc-google-last-sync-at"],
  ['src/app/quan-ly/page.tsx', "Excel trên máy tính chưa kết nối"],
  ['src/app/quan-ly/page.tsx', "setSyncLastAt(status.lastSyncAt || '')"],
]) {
  if (!read(file).includes(needle)) throw new Error(`${file}: missing ${needle}`);
}

console.log('Applied compact synchronization status line.');
