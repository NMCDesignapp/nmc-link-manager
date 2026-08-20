const fs = require('fs');
const path = require('path');

// nmc-kpi-calendar-rooms-v1
// Shared KPI calendar enhancement:
// - five plan scopes below the month selector
// - new entries inherit the currently selected scope
// - existing legacy owner labels remain visible through compatibility aliases
// This patch runs against the canonical Main KPI source; kpi-app sync copies it.

const repoRoot = path.resolve(__dirname, '..');
const filePath = path.join(repoRoot, 'src/app/kpi/page.tsx');
const MARKER = '// nmc-kpi-calendar-rooms-v1';

if (!fs.existsSync(filePath)) throw new Error(`Không tìm thấy ${filePath}`);
let source = fs.readFileSync(filePath, 'utf8');

if (source.includes(MARKER)) {
  console.log('✓ KPI Kế hoạch khung: 5 phòng đã được áp dụng.');
  process.exit(0);
}

function replaceOnce(from, to, label) {
  if (!source.includes(from)) throw new Error(`Không tìm thấy anchor: ${label}`);
  source = source.replace(from, to);
}

// 1) Scope state — company is the safe/default view for existing plans.
replaceOnce(
  `  const [calMonth, setCalMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));\n  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);`,
  `  ${MARKER}\n  const [calMonth, setCalMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));\n  const [calScope, setCalScope] = useState<string>('Công ty');\n  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);`,
  'calendar state'
);

// 2) Canonical five scopes + compatibility aliases for older data.
replaceOnce(
  `  /* Calendar edit handlers */\n  const CAL_OWNERS = ['Công ty', 'HTKD', 'PTKD', 'DVKH'];\n  const CAL_OWNER_COLORS: Record<string, string> = {\n    'Công ty': '#7c3aed', // purple\n    'HTKD':    '#0ea5e9', // sky blue\n    'PTKD':    '#16a34a', // green\n    'DVKH':    '#ea580c', // orange\n  };`,
  `  /* Calendar edit handlers */\n  const CAL_PLAN_SCOPES = ['Công ty', 'Phòng PTKD 1', 'Phòng PTKD 2', 'Phòng PTKD 3', 'Phòng HTKD'];\n  const CAL_OWNERS = CAL_PLAN_SCOPES;\n  const CAL_OWNER_COLORS: Record<string, string> = {\n    'Công ty': '#7c3aed',\n    'Phòng PTKD 1': '#16a34a',\n    'Phòng PTKD 2': '#15803d',\n    'Phòng PTKD 3': '#166534',\n    'Phòng HTKD': '#0ea5e9',\n    // Legacy labels — keep old saved plans visually consistent.\n    'HTKD': '#0ea5e9',\n    'PTKD': '#16a34a',\n    'DVKH': '#ea580c',\n    'Phòng 1': '#16a34a',\n    'Phòng 2': '#15803d',\n    'Phòng 3': '#166534',\n  };`,
  'calendar owners'
);

// 3) Scope matcher. Custom/legacy plans without a room assignment stay in Công ty
// so no historical item disappears after this UI change.
replaceOnce(
  `  const parseOwners = (owner: string | undefined | null): string[] => {\n    if (!owner) return [];\n    return owner.split(',').map(s => s.trim()).filter(Boolean);\n  };`,
  `  const parseOwners = (owner: string | undefined | null): string[] => {\n    if (!owner) return [];\n    return owner.split(',').map(s => s.trim()).filter(Boolean);\n  };\n\n  const eventMatchesCalScope = (ev: CalendarEvent, scope: string): boolean => {\n    const owners = parseOwners(ev.owner);\n    const aliases: Record<string, string[]> = {\n      'Công ty': ['Công ty'],\n      'Phòng PTKD 1': ['Phòng PTKD 1', 'Phòng 1'],\n      'Phòng PTKD 2': ['Phòng PTKD 2', 'Phòng 2'],\n      'Phòng PTKD 3': ['Phòng PTKD 3', 'Phòng 3'],\n      'Phòng HTKD': ['Phòng HTKD', 'HTKD'],\n    };\n    const selectedAliases = aliases[scope] || [scope];\n    if (owners.some(owner => selectedAliases.includes(owner))) return true;\n\n    if (scope === 'Công ty') {\n      if (owners.length === 0) return true;\n      const assignedToRoom = ['Phòng PTKD 1', 'Phòng 1', 'Phòng PTKD 2', 'Phòng 2', 'Phòng PTKD 3', 'Phòng 3', 'Phòng HTKD', 'HTKD']\n        .some(alias => owners.includes(alias));\n      return !assignedToRoom;\n    }\n    return false;\n  };`,
  'parseOwners'
);

// 4) New plan starts in the selected room rather than being unassigned.
replaceOnce(
  `  const openCalEditForNew = () => {\n    setCalEditForm({ id: null, date: \`${'${'}CUR_YEAR}-${'${'}calMonth}-01\`, title: '', owners: [], ownerCustom: '' });`,
  `  const openCalEditForNew = () => {\n    setCalEditForm({ id: null, date: \`${'${'}CUR_YEAR}-${'${'}calMonth}-01\`, title: '', owners: [calScope], ownerCustom: '' });`,
  'openCalEditForNew'
);

// 5) Filter each day by the selected plan scope.
replaceOnce(
  `      const dayEvents = calendarEvents.filter(e => e.date === dateStr);`,
  `      const dayEvents = calendarEvents.filter(e => e.date === dateStr && eventMatchesCalScope(e, calScope));`,
  'calendar day filter'
);
replaceOnce(
  `  }, [calMonth, CUR_YEAR, calendarEvents, NOW, CUR_MONTH]);`,
  `  }, [calMonth, calScope, CUR_YEAR, calendarEvents, NOW, CUR_MONTH]);`,
  'calendar memo dependencies'
);

// 6) Five room buttons directly under the month selector.
replaceOnce(
  `          <div className="cal-filter">\n            {MONTHS.map(m => (\n              <button key={m} className={\`cal-fbtn ${'${'}calMonth === m ? 'on' : ''}\`} onClick={() => setCalMonth(m)}>T{parseInt(m)}</button>\n            ))}\n          </div>\n          <div className="cal-wrap">`,
  `          <div className="cal-filter">\n            {MONTHS.map(m => (\n              <button key={m} className={\`cal-fbtn ${'${'}calMonth === m ? 'on' : ''}\`} onClick={() => setCalMonth(m)}>T{parseInt(m)}</button>\n            ))}\n          </div>\n          <div className="cal-scope-filter" aria-label="Chọn phòng kế hoạch">\n            {CAL_PLAN_SCOPES.map(scope => (\n              <button\n                key={scope}\n                type="button"\n                className={\`cal-scope-btn ${'${'}calScope === scope ? 'on' : ''}\`}\n                onClick={() => setCalScope(scope)}\n              >\n                {scope}\n              </button>\n            ))}\n          </div>\n          <div className="cal-wrap">`,
  'calendar scope buttons'
);

// 7) Room selector styling — separate from month grid, responsive without changing
// the existing calendar table layout.
replaceOnce(
  `.kpi-app .cal-fbtn.on { background: #008080; color: #003b3b; border-color: #008080; box-shadow: 0 0 10px #0080804d; font-weight: 900; }\n.kpi-app .cal-wrap {`,
  `.kpi-app .cal-fbtn.on { background: #008080; color: #003b3b; border-color: #008080; box-shadow: 0 0 10px #0080804d; font-weight: 900; }\n.kpi-app .cal-scope-filter { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 5px; margin: 8px auto 0; max-width: 820px; }\n.kpi-app .cal-scope-btn { min-height: 30px; padding: 5px 6px; border-radius: 7px; border: 1px solid #31566f; background: #0c2638; color: #b8cfdf; font-size: 9px; font-weight: 800; line-height: 1.15; text-align: center; transition: all .18s ease; }\n.kpi-app .cal-scope-btn:hover { background: #12384f; border-color: #4b7897; color: #effaff; }\n.kpi-app .cal-scope-btn.on { background: linear-gradient(135deg, #0b6d69, #0b8078); border-color: #5ed6c9; color: #f2fffd; box-shadow: 0 4px 14px #0080803d, inset 0 1px 0 #ffffff20; }\n.kpi-app .cal-wrap {`,
  'calendar scope CSS'
);

// Mobile: allow labels to wrap while keeping all five controls visible and compact.
replaceOnce(
  `  .kpi-app .cal-filter { grid-template-columns: repeat(6, 1fr); gap: 2px; }\n  .kpi-app .cal-fbtn { padding: 3px 1px; border-radius: 5px; min-height: 20px; font-size: 7px; }`,
  `  .kpi-app .cal-filter { grid-template-columns: repeat(6, 1fr); gap: 2px; }\n  .kpi-app .cal-fbtn { padding: 3px 1px; border-radius: 5px; min-height: 20px; font-size: 7px; }\n  .kpi-app .cal-scope-filter { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 3px; margin-top: 6px; }\n  .kpi-app .cal-scope-btn { min-height: 32px; padding: 4px 2px; font-size: 7px; border-radius: 5px; }`,
  'calendar mobile scope CSS'
);

fs.writeFileSync(filePath, source, 'utf8');
console.log('✓ KPI Kế hoạch khung: thêm 5 phòng Công ty / PTKD 1-3 / HTKD và lọc kế hoạch theo phòng.');
