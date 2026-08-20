const fs = require('fs');
const path = require('path');

// nmc-kpi-calendar-rooms-v3
// Shared KPI calendar enhancement:
// - five plan scopes below the month selector
// - every room plan is automatically visible in the Company aggregate view
// - Company plans flow into selected room views through their responsible owner(s)
// - selected scope determines where a room-created plan is saved
// - password validation is bound to the selected scope
// - master password works for all five scopes
// - passwords are compared by SHA-256 hash so plaintext values are not stored here
// - existing legacy owner labels remain visible through compatibility aliases
// This patch runs against the canonical Main KPI source; kpi-app sync copies it.

const repoRoot = path.resolve(__dirname, '..');
const filePath = path.join(repoRoot, 'src/app/kpi/page.tsx');
const MARKER = '// nmc-kpi-calendar-rooms-v3';

if (!fs.existsSync(filePath)) throw new Error(`Không tìm thấy ${filePath}`);
let source = fs.readFileSync(filePath, 'utf8');

if (source.includes(MARKER)) {
  console.log('✓ KPI Kế hoạch khung: tổng hợp Công ty + phân luồng phòng + mật khẩu theo phòng đã được áp dụng.');
  process.exit(0);
}

function replaceOnce(from, to, label) {
  if (!source.includes(from)) throw new Error(`Không tìm thấy anchor: ${label}`);
  source = source.replace(from, to);
}

// 1) Scope state — Company is the aggregate/default view.
replaceOnce(
  `  const [calMonth, setCalMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));\n  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);`,
  `  ${MARKER}\n  const [calMonth, setCalMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));\n  const [calScope, setCalScope] = useState<string>('Công ty');\n  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);`,
  'calendar state'
);

// 2) Remember which scope has been authenticated. "*" means master password.
replaceOnce(
  `  const [calAuthed, setCalAuthed] = useState(false);\n  const [calPwdOpen, setCalPwdOpen] = useState(false);`,
  `  const [calAuthed, setCalAuthed] = useState(false);\n  const [calAuthScope, setCalAuthScope] = useState<string | null>(null);\n  const [calPwdOpen, setCalPwdOpen] = useState(false);`,
  'calendar auth state'
);

// 3) Canonical five scopes + compatibility aliases + password hashes.
replaceOnce(
  `  /* Calendar edit handlers */\n  const CAL_OWNERS = ['Công ty', 'HTKD', 'PTKD', 'DVKH'];\n  const CAL_OWNER_COLORS: Record<string, string> = {\n    'Công ty': '#7c3aed', // purple\n    'HTKD':    '#0ea5e9', // sky blue\n    'PTKD':    '#16a34a', // green\n    'DVKH':    '#ea580c', // orange\n  };`,
  `  /* Calendar edit handlers */\n  const CAL_PLAN_SCOPES = ['Công ty', 'Phòng PTKD 1', 'Phòng PTKD 2', 'Phòng PTKD 3', 'Phòng HTKD'];\n  const CAL_OWNERS = CAL_PLAN_SCOPES;\n  const CAL_MASTER_PASSWORD_HASH = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';\n  const CAL_SCOPE_PASSWORD_HASHES: Record<string, string> = {\n    'Phòng PTKD 1': '987a0457f57001ca36deffb20f5f255712b3e22fce4ea15e38a88d6d354f4530',\n    'Phòng PTKD 2': 'f7ab5e7d49f38c06dba85147a7c74c79700ba4f7e4b4564a457f6f5eaf953ed6',\n    'Phòng PTKD 3': '99b1159f77be8a32029a0463617aa71935b9e02feb43ecefd9c4959431f067ad',\n    'Phòng HTKD': '5236af15d71903ad5bbdc332c7360d565c57605e2a95fe7a0e82b23ebe287111',\n  };\n  const CAL_OWNER_COLORS: Record<string, string> = {\n    'Công ty': '#7c3aed',\n    'Phòng PTKD 1': '#16a34a',\n    'Phòng PTKD 2': '#15803d',\n    'Phòng PTKD 3': '#166534',\n    'Phòng HTKD': '#0ea5e9',\n    // Legacy labels — keep old saved plans visually consistent.\n    'HTKD': '#0ea5e9',\n    'PTKD': '#16a34a',\n    'DVKH': '#ea580c',\n    'Phòng 1': '#16a34a',\n    'Phòng 2': '#15803d',\n    'Phòng 3': '#166534',\n  };`,
  'calendar owners and password hashes'
);

// 4) Validate against the ROOM THAT IS CURRENTLY SELECTED.
// A password belonging to another room must fail. Master works everywhere.
replaceOnce(
  `  const submitCalPwd = () => {\n    if (calPwdInput === '123456') {\n      setCalAuthed(true); setCalPwdOpen(false); setCalPwdInput(''); setCalPwdError(false);`,
  `  const sha256Hex = async (value: string): Promise<string> => {\n    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));\n    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');\n  };\n\n  const submitCalPwd = async () => {\n    const enteredHash = await sha256Hex(calPwdInput);\n    const isMaster = enteredHash === CAL_MASTER_PASSWORD_HASH;\n    const expectedRoomHash = CAL_SCOPE_PASSWORD_HASHES[calScope];\n    const isSelectedRoomPassword = Boolean(expectedRoomHash && enteredHash === expectedRoomHash);\n    if (isMaster || isSelectedRoomPassword) {\n      setCalAuthed(true); setCalAuthScope(isMaster ? '*' : calScope); setCalPwdOpen(false); setCalPwdInput(''); setCalPwdError(false);`,
  'calendar password validation'
);

// 5) Company is an aggregate view: EVERY calendar entry is shown there.
// Room views show entries whose responsible owner matches that room. Old generic
// PTKD entries predate room separation, so they remain visible in all three PTKD
// views until an editor reclassifies them.
replaceOnce(
  `  const parseOwners = (owner: string | undefined | null): string[] => {\n    if (!owner) return [];\n    return owner.split(',').map(s => s.trim()).filter(Boolean);\n  };`,
  `  const parseOwners = (owner: string | undefined | null): string[] => {\n    if (!owner) return [];\n    return owner.split(',').map(s => s.trim()).filter(Boolean);\n  };\n\n  const eventMatchesCalScope = (ev: CalendarEvent, scope: string): boolean => {\n    // Công ty là lịch tổng hợp: kế hoạch do bất kỳ phòng nào tạo cũng lên đây.\n    if (scope === 'Công ty') return true;\n\n    const owners = parseOwners(ev.owner);\n    const aliases: Record<string, string[]> = {\n      'Phòng PTKD 1': ['Phòng PTKD 1', 'Phòng 1', 'PTKD'],\n      'Phòng PTKD 2': ['Phòng PTKD 2', 'Phòng 2', 'PTKD'],\n      'Phòng PTKD 3': ['Phòng PTKD 3', 'Phòng 3', 'PTKD'],\n      'Phòng HTKD': ['Phòng HTKD', 'HTKD'],\n    };\n    const selectedAliases = aliases[scope] || [scope];\n    return owners.some(owner => selectedAliases.includes(owner));\n  };`,
  'parseOwners'
);

// 6) New room plan starts with that room as responsible owner. Company starts
// blank so the user can choose one or more responsible rooms; no choice means
// a Company-only plan.
replaceOnce(
  `  const openCalEditForNew = () => {\n    setCalEditForm({ id: null, date: \`${'${'}CUR_YEAR}-${'${'}calMonth}-01\`, title: '', owners: [], ownerCustom: '' });`,
  `  const openCalEditForNew = () => {\n    setCalEditForm({ id: null, date: \`${'${'}CUR_YEAR}-${'${'}calMonth}-01\`, title: '', owners: calScope === 'Công ty' ? [] : [calScope], ownerCustom: '' });`,
  'openCalEditForNew'
);

// 7) Save routing:
// - room-created plan => responsible owner is exactly that room; Company sees it
//   automatically because Company is the aggregate view.
// - Company-created plan => selected responsible owner(s) determine which room
//   view(s) also show the plan. If none selected, it stays Company-only.
// - existing entries preserve the existing editor behavior.
replaceOnce(
  `    // Join bằng ", " để hiển thị dạng "Công ty, HTKD"\n    const owner = finalOwners.join(', ');`,
  `    let owner: string;\n    if (calEditForm.id) {\n      owner = finalOwners.join(', ');\n    } else if (calScope === 'Công ty') {\n      owner = finalOwners.length > 0 ? finalOwners.join(', ') : 'Công ty';\n    } else {\n      owner = calScope;\n    }`,
  'calendar save owner routing'
);

// 8) Filter each day by the selected plan scope.
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

// 9) Five room buttons directly under the month selector. Switching rooms keeps
// master auth active; room auth is active only when returning to that same room.
replaceOnce(
  `          <div className="cal-filter">\n            {MONTHS.map(m => (\n              <button key={m} className={\`cal-fbtn ${'${'}calMonth === m ? 'on' : ''}\`} onClick={() => setCalMonth(m)}>T{parseInt(m)}</button>\n            ))}\n          </div>\n          <div className="cal-wrap">`,
  `          <div className="cal-filter">\n            {MONTHS.map(m => (\n              <button key={m} className={\`cal-fbtn ${'${'}calMonth === m ? 'on' : ''}\`} onClick={() => setCalMonth(m)}>T{parseInt(m)}</button>\n            ))}\n          </div>\n          <div className="cal-scope-filter" aria-label="Chọn phòng kế hoạch">\n            {CAL_PLAN_SCOPES.map(scope => (\n              <button\n                key={scope}\n                type="button"\n                className={\`cal-scope-btn ${'${'}calScope === scope ? 'on' : ''}\`}\n                onClick={() => {\n                  setCalScope(scope);\n                  setCalAuthed(calAuthScope === '*' || calAuthScope === scope);\n                }}\n              >\n                {scope}\n              </button>\n            ))}\n          </div>\n          <div className="cal-wrap">`,
  'calendar scope buttons'
);

// 10) Password dialog says exactly which room is being unlocked.
replaceOnce(
  `                <p className="cal-modal-hint">Nhập mật khẩu để mở khóa cài đặt lịch:</p>`,
  `                <p className="cal-modal-hint">Nhập mật khẩu của <strong>{calScope}</strong> để nhập/sửa kế hoạch:</p>`,
  'calendar password hint'
);

// 11) Room selector styling — separate from month grid, responsive without changing
// the existing calendar table layout.
replaceOnce(
  `.kpi-app .cal-fbtn.on { background: #008080; color: #003b3b; border-color: #008080; box-shadow: 0 0 10px #0080804d; font-weight: 900; }\n.kpi-app .cal-wrap {`,
  `.kpi-app .cal-fbtn.on { background: #008080; color: #003b3b; border-color: #008080; box-shadow: 0 0 10px #0080804d; font-weight: 900; }\n.kpi-app .cal-scope-filter { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 5px; margin: 8px auto 0; max-width: 820px; }\n.kpi-app .cal-scope-btn { min-height: 30px; padding: 5px 6px; border-radius: 7px; border: 1px solid #31566f; background: #0c2638; color: #b8cfdf; font-size: 9px; font-weight: 800; line-height: 1.15; text-align: center; transition: all .18s ease; }\n.kpi-app .cal-scope-btn:hover { background: #12384f; border-color: #4b7897; color: #effaff; }\n.kpi-app .cal-scope-btn.on { background: linear-gradient(135deg, #0b6d69, #0b8078); border-color: #5ed6c9; color: #f2fffd; box-shadow: 0 4px 14px #0080803d, inset 0 1px 0 #ffffff20; }\n.kpi-app .cal-wrap {`,
  'calendar scope CSS'
);

// Mobile: keep all five controls visible and compact.
replaceOnce(
  `  .kpi-app .cal-filter { grid-template-columns: repeat(6, 1fr); gap: 2px; }\n  .kpi-app .cal-fbtn { padding: 3px 1px; border-radius: 5px; min-height: 20px; font-size: 7px; }`,
  `  .kpi-app .cal-filter { grid-template-columns: repeat(6, 1fr); gap: 2px; }\n  .kpi-app .cal-fbtn { padding: 3px 1px; border-radius: 5px; min-height: 20px; font-size: 7px; }\n  .kpi-app .cal-scope-filter { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 3px; margin-top: 6px; }\n  .kpi-app .cal-scope-btn { min-height: 32px; padding: 4px 2px; font-size: 7px; border-radius: 5px; }`,
  'calendar mobile scope CSS'
);

fs.writeFileSync(filePath, source, 'utf8');
console.log('✓ KPI Kế hoạch khung: phòng → Công ty tự tổng hợp; Công ty → phòng theo đối tượng phụ trách; mật khẩu vẫn theo phòng.');
