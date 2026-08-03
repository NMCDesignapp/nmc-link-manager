const fs = require('fs');

const file = 'scripts/apply-exclusive-sync-source.cjs';
let content = fs.readFileSync(file, 'utf8');
const startMarker = "replaceOnce(\n  'src/app/quan-ly/page.tsx',\n  `  const handleSyncToggle";
const endMarker = "\nreplaceOnce(\n  'src/app/quan-ly/page.tsx',\n  `{syncEnabled ? <CheckCircle2";
const start = content.indexOf(startMarker);
const end = content.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error('Could not locate handleSyncToggle patch block');

const replacement = [
  "replaceRegexOnce(",
  "  'src/app/quan-ly/page.tsx',",
  "  /  const handleSyncToggle = useCallback\\(\\(\\) => \\{[\\s\\S]*?\\n  \\}, \\[syncEnabled\\]\\);/ ,",
  "  [",
  "    \"  const handleSyncToggle = useCallback(async () => {\" ,",
  "    \"    const nextSource = googleSyncEnabled ? 'data-hub' : 'google';\" ,",
  "    \"    const message = nextSource === 'google'\" ,",
  "    \"      ? 'Bật đồng bộ Google Sheets?\\\\nData Hub trên máy tính sẽ bị tắt ngay để tránh ghi đè và dư dữ liệu.'\" ,",
  "    \"      : 'Chuyển về đồng bộ Excel trên máy tính?\\\\nGoogle Sheets sẽ bị tắt ngay để tránh ghi đè và dư dữ liệu.';\" ,",
  "    \"    if (!confirm(message)) return;\" ,",
  "    \"    setSyncSourceSwitching(true);\" ,",
  "    \"    try {\" ,",
  "    \"      const response = await fetch('/api/sync-source', {\" ,",
  "    \"        method: 'POST',\" ,",
  "    \"        headers: { 'Content-Type': 'application/json' },\" ,",
  "    \"        body: JSON.stringify({ source: nextSource }),\" ,",
  "    \"      });\" ,",
  "    \"      const result = await response.json().catch(() => ({}));\" ,",
  "    \"      if (!response.ok) throw new Error(result?.error || 'Không đổi được nguồn đồng bộ');\" ,",
  "    \"      setSyncSource(nextSource);\" ,",
  "    \"      setDataHubOnline(result.dataHubOnline === true);\" ,",
  "    \"      syncedLinksRef.current = '';\" ,",
  "    \"      toast({\" ,",
  "    \"        title: nextSource === 'google' ? 'Google Sheets đã bật' : 'Excel trên máy tính đã bật',\" ,",
  "    \"        description: nextSource === 'google'\" ,",
  "    \"          ? 'Data Hub đã tắt. Google Sheets là nguồn duy nhất được phép ghi dữ liệu.'\" ,",
  "    \"          : 'Google Sheets đã tắt. Data Hub là nguồn duy nhất được phép ghi dữ liệu.',\" ,",
  "    \"      });\" ,",
  "    \"    } catch (error) {\" ,",
  "    \"      toast({ title: 'Không đổi được nguồn đồng bộ', description: error instanceof Error ? error.message : 'Lỗi không xác định', variant: 'destructive' });\" ,",
  "    \"    } finally {\" ,",
  "    \"      setSyncSourceSwitching(false);\" ,",
  "    \"    }\" ,",
  "    \"  }, [googleSyncEnabled]);\"",
  "  ].join('\\n')",
  ");",
].join('\n');

content = content.slice(0, start) + replacement + content.slice(end);
fs.writeFileSync(file, content, 'utf8');
console.log('Updated patcher to use a whitespace-tolerant sync toggle replacement.');
