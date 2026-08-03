const fs = require('fs');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, content) { fs.writeFileSync(file, content, 'utf8'); }
function replaceOnce(file, before, after) {
  const content = read(file);
  const count = content.split(before).length - 1;
  if (count !== 1) throw new Error(`${file}: expected exactly one match, found ${count}\n${before.slice(0, 180)}`);
  write(file, content.replace(before, after));
}
function replaceRegexOnce(file, regex, replacement) {
  const content = read(file);
  const matches = [...content.matchAll(new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`))];
  if (matches.length !== 1) throw new Error(`${file}: expected exactly one regex match, found ${matches.length}: ${regex}`);
  write(file, content.replace(regex, replacement));
}

// Main app only calls Google endpoints while Google is the selected source.
replaceOnce(
  'src/lib/app-data-context.tsx',
  "const syncPrimaryGoogleSources = async (settings: Record<string, string> | null): Promise<void> => {\n  if (!settings) return",
  "const syncPrimaryGoogleSources = async (settings: Record<string, string> | null): Promise<void> => {\n  if (!settings || settings['nmc-sync-source'] !== 'google') return"
);

// Sao Viet single-program endpoint: enforce active source.
replaceOnce(
  'src/app/api/saoviet-data/sync/route.ts',
  "import { db, withRetry } from '@/lib/db';",
  "import { db, withRetry } from '@/lib/db';\nimport { getSyncSource } from '@/lib/sync-source';"
);
replaceOnce(
  'src/app/api/saoviet-data/sync/route.ts',
  `    if (fromDataHub && !isAuthorizedDataHubRequest(req)) {\n      return NextResponse.json({ error: 'Không được phép ghi dữ liệu Data Hub' }, { status: 401 });\n    }`,
  `    if (fromDataHub && !isAuthorizedDataHubRequest(req)) {\n      return NextResponse.json({ error: 'Không được phép ghi dữ liệu Data Hub' }, { status: 401 });\n    }\n    const activeSource = await getSyncSource();\n    if (fromDataHub && activeSource !== 'data-hub') {\n      return NextResponse.json({ error: 'Data Hub đã tắt vì Google Sheets đang là nguồn đồng bộ' }, { status: 409 });\n    }\n    if (!fromDataHub && activeSource !== 'google') {\n      return NextResponse.json({ error: 'Google Sheets đã tắt vì Data Hub trên máy tính đang là nguồn đồng bộ' }, { status: 409 });\n    }`
);

// Sao Viet all-program endpoint: Google-only.
replaceOnce(
  'src/app/api/saoviet-data/sync-all/route.ts',
  "import { db, withRetry } from '@/lib/db';",
  "import { db, withRetry } from '@/lib/db';\nimport { getSyncSource } from '@/lib/sync-source';"
);
replaceOnce(
  'src/app/api/saoviet-data/sync-all/route.ts',
  `    const body = await req.json();\n    const link = normalizeGoogleSheetLink(String(body?.link || ''));`,
  `    const body = await req.json();\n    if (await getSyncSource() !== 'google') {\n      return NextResponse.json({ error: 'Google Sheets đã tắt vì Data Hub trên máy tính đang là nguồn đồng bộ' }, { status: 409 });\n    }\n    const link = normalizeGoogleSheetLink(String(body?.link || ''));`
);

// KPI standalone must not bypass the same source lock.
for (const file of [
  'kpi-app/src/app/api/saoviet-data/sync/route.ts',
  'kpi-app/src/app/api/saoviet-data/sync-all/route.ts',
]) {
  replaceOnce(file, "import { db, withRetry } from '@/lib/db';", "import { db, withRetry } from '@/lib/db';\nimport { getSyncSource } from '@/lib/sync-source';");
  replaceOnce(
    file,
    `    const body = await req.json();`,
    `    const body = await req.json();\n    if (await getSyncSource() !== 'google') {\n      return NextResponse.json({ error: 'Google Sheets đã tắt vì Data Hub trên máy tính đang là nguồn đồng bộ' }, { status: 409 });\n    }`
  );
}

// Structure mirror is Data Hub-only and full-replacement.
replaceOnce(
  'src/app/api/structure/sync/route.ts',
  "import { NextRequest, NextResponse } from 'next/server';",
  "import { NextRequest, NextResponse } from 'next/server';\nimport { getSyncSource } from '@/lib/sync-source';"
);
replaceOnce(
  'src/app/api/structure/sync/route.ts',
  `    if (!isDataHubImport(body) || !isAuthorizedDataHubRequest(request)) {\n      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });\n    }`,
  `    if (!isDataHubImport(body) || !isAuthorizedDataHubRequest(request)) {\n      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });\n    }\n    if (await getSyncSource() !== 'data-hub') {\n      return NextResponse.json({ error: 'Data Hub đã tắt vì Google Sheets đang là nguồn đồng bộ' }, { status: 409 });\n    }`
);

// Revenue/staff/recruiter API: identify source, enforce exclusivity, and make Google month imports authoritative.
replaceOnce(
  'src/app/api/sync/route.ts',
  "import { isAuthorizedDataHubRequest, isDataHubImport } from '@/lib/data-hub-auth';",
  "import { isAuthorizedDataHubRequest, isDataHubImport, isGoogleSyncImport } from '@/lib/data-hub-auth';\nimport { getSyncSource } from '@/lib/sync-source';"
);
replaceOnce(
  'src/app/api/sync/route.ts',
  `    const body = await request.json();\n    if (isDataHubImport(body) && !isAuthorizedDataHubRequest(request)) {\n      return NextResponse.json({ error: 'Không được phép ghi dữ liệu Data Hub' }, { status: 401 });\n    }`,
  `    const body = await request.json();\n    const fromDataHub = isDataHubImport(body);\n    const fromGoogleSync = isGoogleSyncImport(body);\n    if (fromDataHub && !isAuthorizedDataHubRequest(request)) {\n      return NextResponse.json({ error: 'Không được phép ghi dữ liệu Data Hub' }, { status: 401 });\n    }\n    const activeSource = await getSyncSource();\n    if (fromDataHub && activeSource !== 'data-hub') {\n      return NextResponse.json({ error: 'Data Hub đã tắt vì Google Sheets đang là nguồn đồng bộ' }, { status: 409 });\n    }\n    if (fromGoogleSync && activeSource !== 'google') {\n      return NextResponse.json({ error: 'Google Sheets đã tắt vì Data Hub trên máy tính đang là nguồn đồng bộ' }, { status: 409 });\n    }`
);
replaceOnce(
  'src/app/api/sync/route.ts',
  `    const { contractCsv, staffCsv, recruiterCsv, replaceCurrentRevenueMonth, replaceHistoricalRevenueMonths } = body as {\n      contractCsv?: string;\n      staffCsv?: string;\n      recruiterCsv?: string;\n      replaceCurrentRevenueMonth?: boolean;\n      replaceHistoricalRevenueMonths?: string[];\n    };\n    const replaceDataHubCurrentRevenueMonth = isDataHubImport(body) && replaceCurrentRevenueMonth === true;\n    const historicalRevenueMonths = isDataHubImport(body) && Array.isArray(replaceHistoricalRevenueMonths)\n      ? replaceHistoricalRevenueMonths.filter((month): month is string => typeof month === 'string' && /^\\d{4}-(0[1-9]|1[0-2])$/.test(month))\n      : [];`,
  `    const { contractCsv, staffCsv, recruiterCsv, replaceCurrentRevenueMonth, replaceHistoricalRevenueMonths, replaceRevenueMonths } = body as {\n      contractCsv?: string;\n      staffCsv?: string;\n      recruiterCsv?: string;\n      replaceCurrentRevenueMonth?: boolean;\n      replaceHistoricalRevenueMonths?: string[];\n      replaceRevenueMonths?: string[];\n    };\n    const validMonth = (month: unknown): month is string => typeof month === 'string' && /^\\d{4}-(0[1-9]|1[0-2])$/.test(month);\n    const replaceDataHubCurrentRevenueMonth = fromDataHub && replaceCurrentRevenueMonth === true;\n    const historicalRevenueMonths = fromDataHub && Array.isArray(replaceHistoricalRevenueMonths)\n      ? replaceHistoricalRevenueMonths.filter(validMonth)\n      : [];\n    const googleRevenueMonths = fromGoogleSync && Array.isArray(replaceRevenueMonths)\n      ? replaceRevenueMonths.filter(validMonth)\n      : [];\n    const replacementRevenueMonths = historicalRevenueMonths.length > 0 ? historicalRevenueMonths : googleRevenueMonths;`
);
replaceOnce(
  'src/app/api/sync/route.ts',
  `        const authoritativeReplacement = replaceDataHubCurrentRevenueMonth || historicalRevenueMonths.length > 0;`,
  `        const authoritativeReplacement = replaceDataHubCurrentRevenueMonth || replacementRevenueMonths.length > 0;`
);
replaceOnce(
  'src/app/api/sync/route.ts',
  `        if (historicalRevenueMonths.length > 0) {\n          const requestedMonths = [...new Set(historicalRevenueMonths)];`,
  `        if (replacementRevenueMonths.length > 0) {\n          const requestedMonths = [...new Set(replacementRevenueMonths)];`
);
replaceOnce(
  'src/app/api/sync/route.ts',
  `          if (requestedSet.has(activeMonth)) throw new Error(\`Không được thay thế tháng hiện tại \${activeMonth} từ Doanhso.\`);`,
  `          if (fromDataHub && requestedSet.has(activeMonth)) throw new Error(\`Không được thay thế tháng hiện tại \${activeMonth} từ Doanhso.\`);`
);
replaceOnce(
  'src/app/api/sync/route.ts',
  `          if (importRows.length === 0) throw new Error('Doanhso không có HĐ hợp lệ cho các tháng cần cập nhật; dữ liệu app không bị xóa.');`,
  `          if (importRows.length === 0) throw new Error('Nguồn đồng bộ không có HĐ hợp lệ cho các tháng cần cập nhật; dữ liệu app không bị xóa.');`
);
replaceOnce(
  'src/app/api/sync/route.ts',
  `          if (duplicates.size > 0) throw new Error(\`Số HĐ trùng trong Doanhso: \${[...duplicates].slice(0, 10).join(', ')}. Không cập nhật dữ liệu.\`);`,
  `          if (duplicates.size > 0) throw new Error(\`Số HĐ trùng trong nguồn đồng bộ: \${[...duplicates].slice(0, 10).join(', ')}. Không cập nhật dữ liệu.\`);`
);
replaceOnce(
  'src/app/api/sync/route.ts',
  `        let upserted = 0;\n        for (const row of records) {\n          const nhom = getVal(row, 'Nhóm', 'nhom');`,
  `        const validRecords = records.filter(row =>\n          !!getVal(row, 'Mã số', 'Mã TN', 'Mã trưởng nhóm', 'agentCode') &&\n          !!getVal(row, 'Họ tên', 'Họ tên TN', 'agentName')\n        );\n        if (fromGoogleSync && validRecords.length === 0) {\n          throw new Error('Google Sheets không có dòng nhân sự hợp lệ; dữ liệu cũ không bị xóa.');\n        }\n        if (fromGoogleSync) await db.staff.deleteMany({});\n\n        let upserted = 0;\n        for (const row of validRecords) {\n          const nhom = getVal(row, 'Nhóm', 'nhom');`
);
replaceOnce(
  'src/app/api/sync/route.ts',
  `        let synced = 0;\n        if (recruitersData.length > 0) {\n          try {`,
  `        let synced = 0;\n        if (recruitersData.length > 0) {\n          if (fromGoogleSync) await db.recruiter.deleteMany({});\n          try {`
);

// Main management UI: Google toggle switches the exclusive source; automatic mode stays read-only for both sources.
replaceOnce(
  'src/app/quan-ly/page.tsx',
  `  // syncEnabled now derived from onlineSettings\n  const [syncEnabled, setSyncEnabled] = useState(true);\n\n  // Update syncEnabled when onlineSettings loads\n  useEffect(() => {\n    const saved = onlineSettings['nmc-sync-enabled'];\n    if (saved !== undefined && saved !== '') setSyncEnabled(saved === 'true');\n  }, [onlineSettings['nmc-sync-enabled']]); // eslint-disable-line react-hooks/exhaustive-deps`,
  `  // Chỉ một nguồn tự động được hoạt động: Data Hub trên máy tính hoặc Google Sheets.\n  // syncEnabled giữ true để dữ liệu nguồn tự động luôn ở chế độ chỉ xem.\n  const [syncEnabled, setSyncEnabled] = useState(true);\n  const [syncSource, setSyncSource] = useState<'data-hub' | 'google'>('data-hub');\n  const [dataHubOnline, setDataHubOnline] = useState(false);\n  const [syncSourceSwitching, setSyncSourceSwitching] = useState(false);\n  const googleSyncEnabled = syncSource === 'google';\n\n  useEffect(() => {\n    const savedSource = onlineSettings['nmc-sync-source'];\n    if (savedSource === 'google' || savedSource === 'data-hub') {\n      setSyncSource(savedSource);\n    } else if (onlineSettings['nmc-sync-enabled'] !== undefined) {\n      setSyncSource(onlineSettings['nmc-sync-enabled'] === 'true' ? 'google' : 'data-hub');\n    }\n    setSyncEnabled(true);\n  }, [onlineSettings['nmc-sync-source'], onlineSettings['nmc-sync-enabled']]); // eslint-disable-line react-hooks/exhaustive-deps\n\n  useEffect(() => {\n    let mounted = true;\n    const refreshSyncSource = async () => {\n      try {\n        const response = await fetch('/api/sync-source', { cache: 'no-store' });\n        if (!response.ok) return;\n        const status = await response.json();\n        if (!mounted) return;\n        if (status.source === 'google' || status.source === 'data-hub') setSyncSource(status.source);\n        setDataHubOnline(status.dataHubOnline === true);\n        setSyncEnabled(true);\n      } catch {\n        // Giữ trạng thái đang hiển thị nếu mạng tạm thời gián đoạn.\n      }\n    };\n    void refreshSyncSource();\n    const intervalId = window.setInterval(refreshSyncSource, 10_000);\n    return () => { mounted = false; window.clearInterval(intervalId); };\n  }, []);`
);
replaceOnce(
  'src/app/quan-ly/page.tsx',
  `  // Persist sync preference online\n  useEffect(() => {\n    // Only save after initial load (skip the default true)\n    if (onlineSettings['nmc-sync-enabled'] !== undefined || syncEnabled !== true) {\n      saveSetting('nmc-sync-enabled', String(syncEnabled));\n    }\n  }, [syncEnabled]); // eslint-disable-line react-hooks/exhaustive-deps\n\n`,
  ``
);
replaceOnce(
  'src/app/quan-ly/page.tsx',
  `  const autoSyncFromLinks = useCallback(async () => {\n    if (!syncEnabled) return;`,
  `  const autoSyncFromLinks = useCallback(async () => {\n    if (!googleSyncEnabled) return;`
);
replaceOnce(
  'src/app/quan-ly/page.tsx',
  `    let syncedCount = 0;\n    const syncErrors: string[] = [];`,
  `    let syncedCount = 0;\n    const syncErrors: string[] = [];\n    const syncedRevenueMonths: string[] = [];`
);
replaceRegexOnce(
  'src/app/quan-ly/page.tsx',
  /(contractCsvData \+= \(contractCsvData \? '\\n' : ''\) \+ dataOnly;\n\s*syncedCount\+\+;)/,
  `$1\n            const monthNumber = key.replace('revenue-', '');\n            syncedRevenueMonths.push(\`${'${new Date().getFullYear()}'}-\${monthNumber}\`);`
);
replaceOnce(
  'src/app/quan-ly/page.tsx',
  `          body: JSON.stringify({ contractCsv, staffCsv, recruiterCsv }),`,
  `          body: JSON.stringify({\n            source: 'google-sync',\n            contractCsv, staffCsv, recruiterCsv,\n            replaceRevenueMonths: [...new Set(syncedRevenueMonths)],\n          }),`
);
replaceRegexOnce(
  'src/app/quan-ly/page.tsx',
  /(const autoSyncFromLinks = useCallback\(async \(\) => \{[\s\S]*?\n  \}, \[)([^\]]*)(\]\);)/,
  (match, start, dependencies, end) => `${start}${dependencies.replace(/\bsyncEnabled\b/g, 'googleSyncEnabled')}${end}`
);
replaceOnce(
  'src/app/quan-ly/page.tsx',
  `    if (Object.keys(onlineSettings).length > 0 && syncEnabled && fingerprint !== syncedLinksRef.current) {`,
  `    if (Object.keys(onlineSettings).length > 0 && googleSyncEnabled && fingerprint !== syncedLinksRef.current) {`
);
replaceOnce(
  'src/app/quan-ly/page.tsx',
  `  }, [syncEnabled, onlineSettings, autoSyncFromLinks]);`,
  `  }, [googleSyncEnabled, onlineSettings, autoSyncFromLinks]);`
);
replaceOnce(
  'src/app/quan-ly/page.tsx',
  `  const handleSyncToggle = useCallback(() => {\n    if (syncEnabled) { if (!confirm('Tắt đồng bộ?\\\nBảng Hợp đồng & Nhân sự sẽ chuyển sang chế độ thủ công.')) return; setSyncEnabled(false); toast({ title: 'Đã tắt đồng bộ', description: 'Có thể chỉnh sửa HĐ & Nhân sự' }); }\n    else { setSyncEnabled(true); toast({ title: 'Đã bật đồng bộ', description: 'Tự động cập nhật từ Google Sheets' }); }\n  }, [syncEnabled]);`,
  `  const handleSyncToggle = useCallback(async () => {\n    const nextSource = googleSyncEnabled ? 'data-hub' : 'google';\n    const message = nextSource === 'google'\n      ? 'Bật đồng bộ Google Sheets?\\nData Hub trên máy tính sẽ bị tắt ngay để tránh ghi đè và dư dữ liệu.'\n      : 'Chuyển về đồng bộ Excel trên máy tính?\\nGoogle Sheets sẽ bị tắt ngay để tránh ghi đè và dư dữ liệu.';\n    if (!confirm(message)) return;\n    setSyncSourceSwitching(true);\n    try {\n      const response = await fetch('/api/sync-source', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify({ source: nextSource }),\n      });\n      const result = await response.json().catch(() => ({}));\n      if (!response.ok) throw new Error(result?.error || 'Không đổi được nguồn đồng bộ');\n      setSyncSource(nextSource);\n      setDataHubOnline(result.dataHubOnline === true);\n      syncedLinksRef.current = '';\n      toast({\n        title: nextSource === 'google' ? 'Google Sheets đã bật' : 'Excel trên máy tính đã bật',\n        description: nextSource === 'google'\n          ? 'Data Hub đã tắt. Google Sheets là nguồn duy nhất được phép ghi dữ liệu.'\n          : 'Google Sheets đã tắt. Data Hub là nguồn duy nhất được phép ghi dữ liệu.',\n      });\n    } catch (error) {\n      toast({ title: 'Không đổi được nguồn đồng bộ', description: error instanceof Error ? error.message : 'Lỗi không xác định', variant: 'destructive' });\n    } finally {\n      setSyncSourceSwitching(false);\n    }\n  }, [googleSyncEnabled]);`
);
replaceOnce(
  'src/app/quan-ly/page.tsx',
  `{syncEnabled ? <CheckCircle2 className=\"w-5 h-5 text-emerald-300\" /> : <AlertTriangle className=\"w-5 h-5 text-amber-300\" />}`,
  `{googleSyncEnabled ? <CheckCircle2 className=\"w-5 h-5 text-emerald-300\" /> : <Database className=\"w-5 h-5 text-sky-300\" />}`
);
replaceOnce(
  'src/app/quan-ly/page.tsx',
  `<h3 className={\`text-sm font-bold \${syncEnabled ? 'text-emerald-300' : 'text-amber-300'}\`}>{syncEnabled ? 'Đồng bộ tự động: BẬT' : 'Đồng bộ tự động: TẮT'}</h3>`,
  `<h3 className={\`text-sm font-bold \${googleSyncEnabled ? 'text-emerald-300' : 'text-sky-300'}\`}>{googleSyncEnabled ? 'Google Sheets: BẬT' : 'Excel trên máy tính: BẬT'}</h3>`
);
replaceOnce(
  'src/app/quan-ly/page.tsx',
  `<p className=\"text-gray-300 text-xs\">{syncEnabled ? 'HĐ & Nhân sự tự động từ Google Sheets (chỉ xem)' : 'Chế độ thủ công: chỉnh sửa, thêm, xóa, import'}{lastSyncTime ? \` — Cập nhật \${lastSyncTime}\` : ''}</p>`,
  `<p className=\"text-gray-300 text-xs\">{googleSyncEnabled\n                        ? 'Excel trên máy tính: TẮT — Google Sheets là nguồn duy nhất'\n                        : \`Google Sheets: TẮT — Data Hub \${dataHubOnline ? 'đang kết nối' : 'đang chờ kết nối từ máy tính'}\`}\n                        {lastSyncTime ? \` — Cập nhật \${lastSyncTime}\` : ''}</p>`
);
replaceOnce(
  'src/app/quan-ly/page.tsx',
  `{syncEnabled && (\n                      <Button variant=\"ghost\" size=\"sm\" onClick={() => { syncedLinksRef.current = ''; autoSyncFromLinks(); }} className=\"h-7 text-[10px] text-emerald-400 hover:text-emerald-300\" title=\"Đồng bộ ngay\">`,
  `{googleSyncEnabled && (\n                      <Button variant=\"ghost\" size=\"sm\" onClick={() => { syncedLinksRef.current = ''; autoSyncFromLinks(); }} className=\"h-7 text-[10px] text-emerald-400 hover:text-emerald-300\" title=\"Đồng bộ Google ngay\">`
);
replaceOnce(
  'src/app/quan-ly/page.tsx',
  `<button onClick={handleSyncToggle}>\n                      {syncEnabled ? <ToggleRight className=\"w-8 h-8 text-emerald-400 cursor-pointer\" /> : <ToggleLeft className=\"w-8 h-8 text-amber-400 cursor-pointer\" />}\n                    </button>`,
  `<button onClick={handleSyncToggle} disabled={syncSourceSwitching} title={googleSyncEnabled ? 'Tắt Google và chuyển về Excel trên máy tính' : 'Bật Google và tắt Data Hub trên máy tính'}>\n                      {googleSyncEnabled ? <ToggleRight className=\"w-8 h-8 text-emerald-400 cursor-pointer\" /> : <ToggleLeft className=\"w-8 h-8 text-sky-400 cursor-pointer\" />}\n                    </button>`
);

// Data Hub agent checks the active source before reading files and reports heartbeat/status.
replaceOnce(
  'data-hub/index.mjs',
  `async function activate(config) {\n  const result = await postJson(config, '/api/data-hub/activate', { enabled: true, source: config.activationSource || 'saoviet' });`,
  `async function activate(config) {\n  const result = await postJson(config, '/api/data-hub/activate', { enabled: true, source: config.activationSource || 'all' });`
);
replaceOnce(
  'data-hub/index.mjs',
  `  if (activateOnly) return activate(config);\n  const state = await readJson(statePath, { sources: {} });`,
  `  if (activateOnly) return activate(config);\n\n  const sourceStatus = await postJson(config, '/api/data-hub/status', { phase: 'heartbeat' });\n  if (!sourceStatus.enabled || sourceStatus.source !== 'data-hub') {\n    console.log('⏸ Data Hub tạm dừng vì Google Sheets đang là nguồn đồng bộ.');\n    return [{ id: 'data-hub', ok: true, changed: false, skipped: true, reason: 'google-active' }];\n  }\n\n  const state = await readJson(statePath, { sources: {} });`
);
replaceOnce(
  'data-hub/index.mjs',
  `  await fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf8');\n\n  if (config.activateAfterAllSourcesSynced && results.length && results.every(result => result.ok)) {`,
  `  await fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf8');\n  await postJson(config, '/api/data-hub/status', { phase: 'sync-complete', results });\n\n  if (config.activateAfterAllSourcesSynced && results.length && results.every(result => result.ok)) {`
);
replaceOnce(
  'data-hub/index.mjs',
  `  console.log('NMC Data Hub — nguồn dữ liệu giai đoạn 1');`,
  `  console.log('NMC Data Hub — đồng bộ Excel độc quyền với Main App');`
);

// Update the example config to cover every authoritative Excel source.
write('data-hub/data-hub.config.example.json', JSON.stringify({
  appUrl: 'https://nc-link.vercel.app',
  tokenEnv: 'NMC_DATA_HUB_TOKEN',
  watchIntervalSeconds: 15,
  activationSource: 'all',
  activateAfterAllSourcesSynced: true,
  sources: [
    { id: 'revenue-current', kind: 'revenue', file: 'C:\\NMC-Data\\Tamthu.xlsx', sheet: '4', replaceCurrentMonth: true, allowEmpty: false },
    { id: 'revenue-history', kind: 'revenue-history', file: 'C:\\NMC-Data\\Doanhso.xlsx', allowEmpty: false },
    { id: 'structure-tvv', kind: 'structure', collection: 'tvv', file: 'C:\\NMC-Data\\CauTruc.xlsx', sheet: 'DS TVV', allowEmpty: false },
    { id: 'structure-leaders', kind: 'structure', collection: 'leaders', file: 'C:\\NMC-Data\\CauTruc.xlsx', sheet: 'DS TN', allowEmpty: false },
    { id: 'structure-recruiters', kind: 'structure', collection: 'recruiters', file: 'C:\\NMC-Data\\CauTruc.xlsx', sheet: 'DS TTN', allowEmpty: false },
    { id: 'structure-clb-members', kind: 'structure', collection: 'clb-members', file: 'C:\\NMC-Data\\CauTruc.xlsx', sheet: 'DS Thành viên CLB', allowEmpty: false },
    { id: 'structure-tuyen-ngang', kind: 'structure', collection: 'tuyen-ngang', file: 'C:\\NMC-Data\\CauTruc.xlsx', sheet: 'DS TTN tuyển ngang', allowEmpty: false },
    { id: 'saoviet-ca-nhan', kind: 'saoviet', program: 'ca-nhan', file: 'C:\\NMC-Data\\83An Giang_SaoViet2026TT.xlsx', sheet: 'TVV', allowEmpty: true },
    { id: 'saoviet-tn-ktm', kind: 'saoviet', program: 'tn-ktm', file: 'C:\\NMC-Data\\83An Giang_SaoViet2026TT.xlsx', sheet: 'Nhom', allowEmpty: true },
    { id: 'saoviet-tn-td', kind: 'saoviet', program: 'tn-td', file: 'C:\\NMC-Data\\83An Giang_SaoViet2026TT.xlsx', sheet: 'NhomTD', allowEmpty: true },
  ],
}, null, 2) + '\n');

const readme = read('data-hub/README.md');
const marker = '# NMC Data Hub — Giai đoạn 1';
if (!readme.includes(marker)) throw new Error('README marker not found');
write('data-hub/README.md', `# NMC Data Hub — Đồng bộ Excel tự động\n\nData Hub chạy trên máy quản trị và là nguồn ưu tiên cho toàn bộ dữ liệu Main App:\n\n- Sao Việt cá nhân, TN KTM, TN tuyển dụng\n- Doanh số lịch sử tháng 1–7 từ Doanhso.xlsx\n- Doanh số tháng hiện tại từ Tamthu.xlsx\n- Cấu trúc TVV, DS TN, DS TTN, thành viên CLB và TTN tuyển ngang\n\n## Nguyên tắc chống ghi đè\n\nMain App chỉ cho phép **một nguồn tự động hoạt động tại một thời điểm**.\n\n- Khi Data Hub đang được chọn, mọi yêu cầu ghi từ Google Sheets bị máy chủ từ chối.\n- Khi bật Google Sheets trên trang Quản lý, mọi yêu cầu ghi từ Data Hub bị máy chủ từ chối và tiến trình trên máy tự chuyển sang trạng thái tạm dừng.\n- Khi chuyển lại Excel trên máy tính, Google Sheets tắt ngay.\n- Doanh số theo tháng, Sao Việt và các danh sách cấu trúc đều được thay thế theo nguồn chuẩn, không cộng dồn dữ liệu cũ.\n\n## Cài đặt trên máy tính\n\n1. Cài Node.js LTS 20+.\n2. Đặt thư mục Data Hub ở vị trí cố định, ví dụ C:\\\\NMCDataHub.\n3. Chạy:\n\n\`\`\`powershell\nnpm install\nCopy-Item data-hub.config.example.json data-hub.config.json\nnotepad data-hub.config.json\n\`\`\`\n\n4. Sửa đúng đường dẫn file và tên sheet thực tế trong data-hub.config.json.\n5. Khai báo NMC_DATA_HUB_TOKEN trong biến môi trường Windows.\n6. Kiểm tra một lần bằng \`npm run once\`.\n7. Bật nguồn Excel bằng \`npm run activate\`.\n8. Chạy liên tục bằng \`npm start\` và cấu hình Windows Scheduled Task để tự khởi động cùng máy.\n\nMỗi 15 giây Data Hub kiểm tra checksum của file. Chỉ file thay đổi mới được gửi lên. Main App nhận heartbeat để hiển thị máy tính đang kết nối hay đang ngoại tuyến.\n\nKhông chạy đồng thời nhiều bản Data Hub trên cùng máy. Không đưa token hoặc file data-hub.config.json thật lên GitHub.\n`);

// Sanity checks before committing.
const checks = [
  ['src/app/api/sync/route.ts', "fromGoogleSync"],
  ['src/app/api/sync/route.ts', "replacementRevenueMonths"],
  ['src/app/quan-ly/page.tsx', "Google Sheets đã tắt vì Data Hub"],
  ['src/app/quan-ly/page.tsx', "source: 'google-sync'"],
  ['src/lib/app-data-context.tsx', "settings['nmc-sync-source'] !== 'google'"],
  ['data-hub/index.mjs', "/api/data-hub/status"],
  ['kpi-app/src/app/api/saoviet-data/sync-all/route.ts', "getSyncSource"],
];
for (const [file, needle] of checks) {
  if (!read(file).includes(needle)) throw new Error(`${file}: verification failed for ${needle}`);
}
console.log('Exclusive sync source patch applied successfully.');
