const fs = require('fs');
const path = require('path');

// nmc-kpi-calendar-rooms-v4
// Shared KPI calendar enhancement:
// - five plan scopes below the month selector
// - every room plan is automatically visible in the Company aggregate view
// - Company plans flow into selected room views through their responsible room(s)
// - room calendars use room-specific staff responsibility options
// - Company aggregate shows room level only; room views show staff detail only
// - selected scope determines where a room-created plan is saved
// - password validation is bound to the selected scope; master works everywhere
// - passwords are compared by SHA-256 hash so plaintext values are not stored here
// - legacy owner labels remain visible through compatibility aliases
// This patch runs against the canonical Main KPI source; kpi-app sync copies it.

const repoRoot = path.resolve(__dirname, '..');
const filePath = path.join(repoRoot, 'src/app/kpi/page.tsx');
const MARKER = '// nmc-kpi-calendar-rooms-v4';

if (!fs.existsSync(filePath)) throw new Error(`Không tìm thấy ${filePath}`);
let source = fs.readFileSync(filePath, 'utf8');

if (source.includes(MARKER)) {
  console.log('✓ KPI Kế hoạch khung: tổng hợp Công ty + chi tiết phụ trách theo từng phòng đã được áp dụng.');
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

// 3) Canonical scopes, room-specific staff responsibility options, compatibility aliases and password hashes.
replaceOnce(
  `  /* Calendar edit handlers */\n  const CAL_OWNERS = ['Công ty', 'HTKD', 'PTKD', 'DVKH'];\n  const CAL_OWNER_COLORS: Record<string, string> = {\n    'Công ty': '#7c3aed', // purple\n    'HTKD':    '#0ea5e9', // sky blue\n    'PTKD':    '#16a34a', // green\n    'DVKH':    '#ea580c', // orange\n  };`,
  `  /* Calendar edit handlers */\n  const CAL_PLAN_SCOPES = ['Công ty', 'Phòng PTKD 1', 'Phòng PTKD 2', 'Phòng PTKD 3', 'Phòng HTKD'];\n  const CAL_ROOM_SCOPES = CAL_PLAN_SCOPES.filter(scope => scope !== 'Công ty');\n  const CAL_RESPONSIBLE_OPTIONS: Record<string, string[]> = {\n    'Phòng PTKD 1': ['AD Trí', 'AD Uy'],\n    'Phòng PTKD 2': ['AD Có', 'AD Long'],\n    'Phòng PTKD 3': ['AD Trang', 'AD Danh'],\n    'Phòng HTKD': ['A Châu', 'A Kỳ', 'A Hoan', 'C Hoa', 'C Huệ', 'Cả Phòng'],\n  };\n  const CAL_ALL_DETAIL_OWNERS = Object.values(CAL_RESPONSIBLE_OPTIONS).flat();\n  const CAL_DETAIL_TO_ROOM = Object.entries(CAL_RESPONSIBLE_OPTIONS).reduce<Record<string, string>>((acc, [room, people]) => {\n    people.forEach(person => { acc[person] = room; });\n    return acc;\n  }, {});\n  const CAL_MASTER_PASSWORD_HASH = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';\n  const CAL_SCOPE_PASSWORD_HASHES: Record<string, string> = {\n    'Phòng PTKD 1': '987a0457f57001ca36deffb20f5f255712b3e22fce4ea15e38a88d6d354f4530',\n    'Phòng PTKD 2': 'f7ab5e7d49f38c06dba85147a7c74c79700ba4f7e4b4564a457f6f5eaf953ed6',\n    'Phòng PTKD 3': '99b1159f77be8a32029a0463617aa71935b9e02feb43ecefd9c4959431f067ad',\n    'Phòng HTKD': '5236af15d71903ad5bbdc332c7360d565c57605e2a95fe7a0e82b23ebe287111',\n  };\n  const CAL_OWNER_COLORS: Record<string, string> = {\n    'Công ty': '#7c3aed',\n    'Phòng PTKD 1': '#16a34a',\n    'Phòng PTKD 2': '#15803d',\n    'Phòng PTKD 3': '#166534',\n    'Phòng HTKD': '#0ea5e9',\n    'AD Trí': '#16a34a', 'AD Uy': '#16a34a',\n    'AD Có': '#15803d', 'AD Long': '#15803d',\n    'AD Trang': '#166534', 'AD Danh': '#166534',\n    'A Châu': '#0ea5e9', 'A Kỳ': '#0ea5e9', 'A Hoan': '#0ea5e9', 'C Hoa': '#0ea5e9', 'C Huệ': '#0ea5e9', 'Cả Phòng': '#0ea5e9',\n    // Legacy labels — keep old saved plans visually consistent.\n    'HTKD': '#0ea5e9',\n    'PTKD': '#16a34a',\n    'DVKH': '#ea580c',\n    'Phòng 1': '#16a34a',\n    'Phòng 2': '#15803d',\n    'Phòng 3': '#166534',\n    'Chưa phân công': '#64748b',\n  };`,
  'calendar owners, staff details and password hashes'
);

// 4) Validate against the ROOM THAT IS CURRENTLY SELECTED.
// A password belonging to another room must fail. Master works everywhere.
replaceOnce(
  `  const submitCalPwd = () => {\n    if (calPwdInput === '123456') {\n      setCalAuthed(true); setCalPwdOpen(false); setCalPwdInput(''); setCalPwdError(false);`,
  `  const sha256Hex = async (value: string): Promise<string> => {\n    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));\n    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');\n  };\n\n  const submitCalPwd = async () => {\n    const enteredHash = await sha256Hex(calPwdInput);\n    const isMaster = enteredHash === CAL_MASTER_PASSWORD_HASH;\n    const expectedRoomHash = CAL_SCOPE_PASSWORD_HASHES[calScope];\n    const isSelectedRoomPassword = Boolean(expectedRoomHash && enteredHash === expectedRoomHash);\n    if (isMaster || isSelectedRoomPassword) {\n      setCalAuthed(true); setCalAuthScope(isMaster ? '*' : calScope); setCalPwdOpen(false); setCalPwdInput(''); setCalPwdError(false);`,
  'calendar password validation'
);

// 5) Scope matching + view-specific responsible labels.
// Company is the aggregate view and only shows the responsible ROOM.
// A room view only shows the room's staff detail; Company-created room plans with
// no staff assignment show "Chưa phân công" until the room assigns somebody.
replaceOnce(
  `  const parseOwners = (owner: string | undefined | null): string[] => {\n    if (!owner) return [];\n    return owner.split(',').map(s => s.trim()).filter(Boolean);\n  };`,
  `  const parseOwners = (owner: string | undefined | null): string[] => {\n    if (!owner) return [];\n    return owner.split(',').map(s => s.trim()).filter(Boolean);\n  };\n\n  const roomAliases: Record<string, string[]> = {\n    'Phòng PTKD 1': ['Phòng PTKD 1', 'Phòng 1'],\n    'Phòng PTKD 2': ['Phòng PTKD 2', 'Phòng 2'],\n    'Phòng PTKD 3': ['Phòng PTKD 3', 'Phòng 3'],\n    'Phòng HTKD': ['Phòng HTKD', 'HTKD'],\n  };\n\n  const eventHasRoomOwner = (ev: CalendarEvent, room: string): boolean => {\n    const owners = parseOwners(ev.owner);\n    const aliases = roomAliases[room] || [room];\n    if (owners.some(owner => aliases.includes(owner))) return true;\n    if (owners.some(owner => CAL_DETAIL_TO_ROOM[owner] === room)) return true;\n    // Legacy generic PTKD predates the three-way room split; keep it visible in all PTKD room views.\n    if (room.startsWith('Phòng PTKD ') && owners.includes('PTKD')) return true;\n    return false;\n  };\n\n  const getEditableOwnersForScope = (ev: CalendarEvent, scope: string): string[] => {\n    const owners = parseOwners(ev.owner);\n    if (scope === 'Công ty') {\n      const explicitRooms = CAL_ROOM_SCOPES.filter(room => eventHasRoomOwner(ev, room));\n      return explicitRooms;\n    }\n    const allowed = CAL_RESPONSIBLE_OPTIONS[scope] || [];\n    return owners.filter(owner => allowed.includes(owner));\n  };\n\n  const getCalOwnerOptions = (scope: string): string[] => {\n    return scope === 'Công ty' ? CAL_ROOM_SCOPES : (CAL_RESPONSIBLE_OPTIONS[scope] || []);\n  };\n\n  const getDisplayOwnersForScope = (ev: CalendarEvent, scope: string): string[] => {\n    const owners = parseOwners(ev.owner);\n    if (scope === 'Công ty') {\n      // Preserve one legacy generic PTKD label rather than falsely assigning it to all three new rooms.\n      const hasSpecificPTKDRoom = ['Phòng PTKD 1', 'Phòng 1', 'Phòng PTKD 2', 'Phòng 2', 'Phòng PTKD 3', 'Phòng 3']\n        .some(alias => owners.includes(alias));\n      const rooms = CAL_ROOM_SCOPES.filter(room => {\n        if (room.startsWith('Phòng PTKD ') && owners.includes('PTKD') && !hasSpecificPTKDRoom) return false;\n        return eventHasRoomOwner(ev, room);\n      });\n      if (owners.includes('PTKD') && !hasSpecificPTKDRoom) rooms.unshift('PTKD');\n      return rooms.length > 0 ? Array.from(new Set(rooms)) : ['Công ty'];\n    }\n    const details = (CAL_RESPONSIBLE_OPTIONS[scope] || []).filter(person => owners.includes(person));\n    return details.length > 0 ? details : ['Chưa phân công'];\n  };\n\n  const eventMatchesCalScope = (ev: CalendarEvent, scope: string): boolean => {\n    if (scope === 'Công ty') return true;\n    return eventHasRoomOwner(ev, scope);\n  };`,
  'parseOwners and calendar scope helpers'
);

// 6) When an existing entry is opened, edit only responsibility options relevant to
// the CURRENT view: rooms in Company, staff in room views.
replaceOnce(
  `        const owners = parseOwners(ev.owner);\n        setCalEditForm({`,
  `        const owners = getEditableOwnersForScope(ev, calScope);\n        setCalEditForm({`,
  'pending calendar edit owners'
);
replaceOnce(
  `      const owners = parseOwners(ev.owner);\n      setCalEditForm({`,
  `      const owners = getEditableOwnersForScope(ev, calScope);\n      setCalEditForm({`,
  'direct calendar edit owners'
);

// 7) New entries begin without a responsibility selection. Company can choose one
// or more rooms; each room must choose one or more of its own staff options.
replaceOnce(
  `  const openCalEditForNew = () => {\n    setCalEditForm({ id: null, date: \`${'${'}CUR_YEAR}-${'${'}calMonth}-01\`, title: '', owners: [], ownerCustom: '' });`,
  `  const openCalEditForNew = () => {\n    setCalEditForm({ id: null, date: \`${'${'}CUR_YEAR}-${'${'}calMonth}-01\`, title: '', owners: [], ownerCustom: '' });`,
  'openCalEditForNew'
);

// 8) Save routing with preservation of other room assignments on existing events.
// - room-created plan => [room, selected staff...] ; Company sees room only.
// - Company-created plan => [selected room(s)] ; room sees "Chưa phân công" until assigned.
// - editing from one room preserves other room assignments and their staff details.
replaceOnce(
  `    // Gộp owners chọn sẵn + custom text (nếu có nhập)\n    const finalOwners = [...calEditForm.owners];\n    const customText = calEditForm.ownerCustom.trim();\n    if (customText && !finalOwners.includes(customText)) {\n      finalOwners.push(customText);\n    }\n    // Join bằng ", " để hiển thị dạng "Công ty, HTKD"\n    const owner = finalOwners.join(', ');`,
  `    const finalOwners = [...calEditForm.owners];\n    const originalEvent = calEditForm.id ? calendarEvents.find(e => e.id === calEditForm.id) : undefined;\n    const originalOwners = parseOwners(originalEvent?.owner);\n    let owner: string;\n\n    if (calScope === 'Công ty') {\n      const selectedRooms = finalOwners.filter(o => CAL_ROOM_SCOPES.includes(o));\n      if (selectedRooms.length === 0) {\n        owner = 'Công ty';\n      } else {\n        // Preserve existing staff detail only for rooms that remain selected.\n        const preservedDetails = originalOwners.filter(detail => {\n          const detailRoom = CAL_DETAIL_TO_ROOM[detail];\n          return Boolean(detailRoom && selectedRooms.includes(detailRoom));\n        });\n        owner = Array.from(new Set([...selectedRooms, ...preservedDetails])).join(', ');\n      }\n    } else {\n      const allowedDetails = CAL_RESPONSIBLE_OPTIONS[calScope] || [];\n      const selectedDetails = finalOwners.filter(o => allowedDetails.includes(o));\n      if (selectedDetails.length === 0) {\n        setCalEditError('Vui lòng chọn đối tượng phụ trách của phòng.');\n        return;\n      }\n\n      const currentAliases = new Set([...(roomAliases[calScope] || [calScope]), ...allowedDetails]);\n      const preservedOtherOwners = originalOwners.filter(o => {\n        if (currentAliases.has(o)) return false;\n        if (calScope.startsWith('Phòng PTKD ') && o === 'PTKD') return false;\n        return true;\n      });\n      owner = Array.from(new Set([...preservedOtherOwners, calScope, ...selectedDetails])).join(', ');\n    }`,
  'calendar save owner routing'
);

// 9) Filter each day by selected plan scope.
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

// 10) Five room buttons directly under the month selector. Switching rooms keeps
// master auth active; room auth is active only when returning to that same room.
replaceOnce(
  `          <div className="cal-filter">\n            {MONTHS.map(m => (\n              <button key={m} className={\`cal-fbtn ${'${'}calMonth === m ? 'on' : ''}\`} onClick={() => setCalMonth(m)}>T{parseInt(m)}</button>\n            ))}\n          </div>\n          <div className="cal-wrap">`,
  `          <div className="cal-filter">\n            {MONTHS.map(m => (\n              <button key={m} className={\`cal-fbtn ${'${'}calMonth === m ? 'on' : ''}\`} onClick={() => setCalMonth(m)}>T{parseInt(m)}</button>\n            ))}\n          </div>\n          <div className="cal-scope-filter" aria-label="Chọn phòng kế hoạch">\n            {CAL_PLAN_SCOPES.map(scope => (\n              <button\n                key={scope}\n                type="button"\n                className={\`cal-scope-btn ${'${'}calScope === scope ? 'on' : ''}\`}\n                onClick={() => {\n                  setCalScope(scope);\n                  setCalAuthed(calAuthScope === '*' || calAuthScope === scope);\n                }}\n              >\n                {scope}\n              </button>\n            ))}\n          </div>\n          <div className="cal-wrap">`,
  'calendar scope buttons'
);

// 11) Responsibility choices are dynamic: Company sees rooms; each room sees only
// its own staff list. The free-text custom owner input is hidden to keep the list controlled.
replaceOnce(
  `                    {CAL_OWNERS.map(o => {`,
  `                    {getCalOwnerOptions(calScope).map(o => {`,
  'calendar dynamic owner options'
);
replaceOnce(
  `.kpi-app .cal-owner-opt.on {`,
  `.kpi-app .cal-owner-custom { display: none !important; }\n.kpi-app .cal-owner-opt.on {`,
  'hide calendar custom owner input'
);

// 12) Render responsible labels by view: room names only in Company; staff only in room view.
replaceOnce(
  `                        // Multi-select: split owner string by ", " → render each as separate tag on its own line\n                        const ownerList = (e.owner || '').split(',').map(s => s.trim()).filter(Boolean);`,
  `                        // Company aggregate shows room level only; room views show staff detail only.\n                        const ownerList = getDisplayOwnersForScope(e, calScope);`,
  'calendar owner display'
);

// 13) Password dialog says exactly which room is being unlocked.
replaceOnce(
  `                <p className="cal-modal-hint">Nhập mật khẩu để mở khóa cài đặt lịch:</p>`,
  `                <p className="cal-modal-hint">Nhập mật khẩu của <strong>{calScope}</strong> để nhập/sửa kế hoạch:</p>`,
  'calendar password hint'
);

// 14) Room selector styling — separate from month grid, responsive without changing
// existing calendar table layout.
replaceOnce(
  `.kpi-app .cal-fbtn.on { background: #008080; color: #003b3b; border-color: #008080; box-shadow: 0 0 10px #0080804d; font-weight: 900; }\n.kpi-app .cal-wrap {`,
  `.kpi-app .cal-fbtn.on { background: #008080; color: #003b3b; border-color: #008080; box-shadow: 0 0 10px #0080804d; font-weight: 900; }\n.kpi-app .cal-scope-filter { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 5px; margin: 8px auto 0; max-width: 820px; }\n.kpi-app .cal-scope-btn { min-height: 30px; padding: 5px 6px; border-radius: 7px; border: 1px solid #31566f; background: #0c2638; color: #b8cfdf; font-size: 9px; font-weight: 800; line-height: 1.15; text-align: center; transition: all .18s ease; }\n.kpi-app .cal-scope-btn:hover { background: #12384f; border-color: #4b7897; color: #effaff; }\n.kpi-app .cal-scope-btn.on { background: linear-gradient(135deg, #0b6d69, #0b8078); border-color: #5ed6c9; color: #f2fffd; box-shadow: 0 4px 14px #0080803d, inset 0 1px 0 #ffffff20; }\n.kpi-app .cal-wrap {`,
  'calendar scope CSS'
);

// Mobile: keep all five scope controls visible and compact.
replaceOnce(
  `  .kpi-app .cal-filter { grid-template-columns: repeat(6, 1fr); gap: 2px; }\n  .kpi-app .cal-fbtn { padding: 3px 1px; border-radius: 5px; min-height: 20px; font-size: 7px; }`,
  `  .kpi-app .cal-filter { grid-template-columns: repeat(6, 1fr); gap: 2px; }\n  .kpi-app .cal-fbtn { padding: 3px 1px; border-radius: 5px; min-height: 20px; font-size: 7px; }\n  .kpi-app .cal-scope-filter { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 3px; margin-top: 6px; }\n  .kpi-app .cal-scope-btn { min-height: 32px; padding: 4px 2px; font-size: 7px; border-radius: 5px; }`,
  'calendar mobile scope CSS'
);

fs.writeFileSync(filePath, source, 'utf8');
console.log('✓ KPI Kế hoạch khung: Công ty chỉ hiện cấp phòng; lịch phòng hiện đúng cán bộ phụ trách theo danh sách riêng.');
