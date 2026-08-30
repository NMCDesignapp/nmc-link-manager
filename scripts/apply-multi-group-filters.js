const fs = require('fs');
const path = require('path');

// nmc-multi-group-filter-patch-v1
// KPI standalone opens Main App /quan-ly in an iframe. The group selectors for
// Chính sách / Thi đua (Sao Việt) / CLB therefore live in Main App source.
// This build patch upgrades only those page-level group filters from a single
// string to string[] while preserving every existing business calculation.
// [] means "Tất cả nhóm"; one or more values means show the union of those groups.

const MARKER = '// nmc-multi-group-filter-v1';
const quanLyPath = path.join(process.cwd(), 'src/app/quan-ly/page.tsx');
const savedContestPath = path.join(process.cwd(), 'src/components/saved-contest-inline.tsx');

const filters = [
  ['quyTvvNhomFilter', 'setQuyTvvNhomFilter'],
  ['tvvmNhomFilter', 'setTvvmNhomFilter'],
  ['nsTvvNhomFilter', 'setNsTvvNhomFilter'],
  ['tuyenLuyenNhomFilter', 'setTuyenLuyenNhomFilter'],
  ['dongHanhNhomFilter', 'setDongHanhNhomFilter'],
  ['quyTnNhomFilter', 'setQuyTnNhomFilter'],
  ['ptkdNhomFilter', 'setPtkdNhomFilter'],
  ['saovietNhomFilter', 'setSaovietNhomFilter'],
  ['clbsvNhomFilter', 'setClbsvNhomFilter'],
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readNormalized(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  return {
    source: source.replace(/\r\n/g, '\n'),
    eol: source.includes('\r\n') ? '\r\n' : '\n',
  };
}

function selectionLabel(variable, emptyLabel) {
  return `${variable}.length === 0 ? '${emptyLabel}' : ${variable}.length === 1 ? ${variable}[0] : \`${'${'}${variable}.length} nhóm\``;
}

function toggleExpression(item) {
  return `prev => prev.includes(${item}) ? prev.filter(value => value !== ${item}) : [...prev, ${item}]`;
}

function replaceEmptyVisualState(source, variable) {
  // IMPORTANT: replace only JSX ternary expressions such as `${!filter ? ...}`.
  // Never replace every `!filter`, because valid code like
  // `!filter.includes(row.nhom)` must remain a negated includes() expression.
  return source
    .split('${!' + variable + ' ?')
    .join('${' + variable + '.length === 0 ?');
}

function patchQuanLy(source) {
  if (source.includes(MARKER)) {
    console.log('✓ Multi-group filters already applied: quan-ly/page.tsx');
    return source;
  }

  let changed = false;
  const original = source;

  // Keep a visible marker in the generated source for repeatable local dev/builds.
  const markerAnchor = "// ==================== TYPES ====================";
  if (!source.includes(markerAnchor)) throw new Error('Không tìm thấy anchor TYPES trong quan-ly/page.tsx');
  source = source.replace(markerAnchor, `${MARKER}\n${markerAnchor}`);

  // Group state: single string -> array. Other filters (revenue/settings) stay untouched.
  for (const [variable, setter] of filters) {
    const oldDecl = `const [${variable}, ${setter}] = useState<string>('');`;
    const newDecl = `const [${variable}, ${setter}] = useState<string[]>([]);`;
    if (!source.includes(oldDecl)) throw new Error(`Không tìm thấy state ${variable}`);
    source = source.replace(oldDecl, newDecl);
  }

  // Existing row filters all have the shape:
  // if (filter && row.group !== filter) return false;
  // Convert every occurrence for the selected page filters to Set-like includes semantics.
  for (const [variable] of filters) {
    const v = escapeRegExp(variable);
    const condition = new RegExp(`if \\(${v} && ([^\\n;]+?) !== ${v}\\) return false;`, 'g');
    source = source.replace(condition, (_match, field) => {
      changed = true;
      return `if (${variable}.length > 0 && !${variable}.includes(${field})) return false;`;
    });
  }

  // The common TVV-policy shell aliases whichever policy-specific group state is active.
  const aliasOld = `    const nhomFilter = isTvvPolicy ? (\n      policyOpen === 'tvvm' ? tvvmNhomFilter :\n      policyOpen === 'ns-tvv' ? nsTvvNhomFilter :\n      quyTvvNhomFilter\n    ) : '';`;
  const aliasNew = `    const nhomFilter = isTvvPolicy ? (\n      policyOpen === 'tvvm' ? tvvmNhomFilter :\n      policyOpen === 'ns-tvv' ? nsTvvNhomFilter :\n      quyTvvNhomFilter\n    ) : [];`;
  if (!source.includes(aliasOld)) throw new Error('Không tìm thấy alias nhomFilter của policy shell');
  source = source.replace(aliasOld, aliasNew);

  // Individual dropdown choices must NOT close the menu so several groups can be ticked in one pass.
  const keepOpenReplacements = [
    [
      `setNhomFilter(n); e.currentTarget.closest('.relative')?.querySelector('.absolute')?.classList.add('hidden');`,
      `setNhomFilter(${toggleExpression('n')});`,
    ],
    [
      `setSaovietNhomFilter(n); (e.currentTarget.closest('.relative')?.querySelector('.absolute') as HTMLElement)?.classList.add('hidden');`,
      `setSaovietNhomFilter(${toggleExpression('n')});`,
    ],
    [
      `setClbsvNhomFilter(n); (e.currentTarget.closest('.relative')?.querySelector('.absolute') as HTMLElement)?.classList.add('hidden');`,
      `setClbsvNhomFilter(${toggleExpression('n')});`,
    ],
  ];
  for (const [from, to] of keepOpenReplacements) source = source.split(from).join(to);

  // Policy quick chips and all reset actions.
  for (const [variable, setter] of filters) {
    const toggleNhomOld = `${setter}(${variable} === nhom ? '' : nhom)`;
    const toggleNOld = `${setter}(${variable} === n ? '' : n)`;
    source = source.split(toggleNhomOld).join(`${setter}(${toggleExpression('nhom')})`);
    source = source.split(toggleNOld).join(`${setter}(${toggleExpression('n')})`);

    // Any remaining direct group selection becomes a toggle, not a replacement.
    source = source.split(`${setter}(nhom)`).join(`${setter}(${toggleExpression('nhom')})`);
    source = source.split(`${setter}(n)`).join(`${setter}(${toggleExpression('n')})`);

    // Clearing a group filter means "all groups" -> empty array.
    source = source.split(`${setter}('')`).join(`${setter}([])`);

    // Selected visual states.
    source = source.split(`${variable} === nhom`).join(`${variable}.includes(nhom)`);
    source = source.split(`${variable} === n`).join(`${variable}.includes(n)`);
    source = replaceEmptyVisualState(source, variable);

    // Dropdown labels. Arrays are always truthy, so old `filter || label` is invalid.
    source = source.split(`${variable} || 'Tất cả nhóm'`).join(selectionLabel(variable, 'Tất cả nhóm'));
    source = source.split(`${variable} || 'Tất cả'`).join(selectionLabel(variable, 'Tất cả'));
  }

  // Same UI aliases in the shared TVV-policy shell.
  source = source.split(`setNhomFilter('')`).join(`setNhomFilter([])`);
  source = source.split(`setNhomFilter(n)`).join(`setNhomFilter(${toggleExpression('n')})`);
  source = source.split(`nhomFilter === n`).join(`nhomFilter.includes(n)`);
  source = replaceEmptyVisualState(source, 'nhomFilter');
  source = source.split(`nhomFilter || 'Tất cả nhóm'`).join(selectionLabel('nhomFilter', 'Tất cả nhóm'));
  source = source.split(`nhomFilter || 'Tất cả'`).join(selectionLabel('nhomFilter', 'Tất cả'));

  // Validation: no selected filter may remain declared as a scalar string.
  for (const [variable, setter] of filters) {
    if (source.includes(`const [${variable}, ${setter}] = useState<string>('');`)) {
      throw new Error(`State ${variable} vẫn còn kiểu single-select`);
    }
  }

  // Validate the three KPI-linked page filters specifically.
  for (const variable of ['saovietNhomFilter', 'clbsvNhomFilter']) {
    if (!source.includes(`${variable}.length > 0`) || !source.includes(`${variable}.includes(`)) {
      throw new Error(`Filter ${variable} chưa được chuyển đầy đủ sang multi-select`);
    }
  }
  if (!source.includes('nhomFilter.includes(n)')) {
    throw new Error('Policy group dropdown chưa được chuyển sang multi-select');
  }
  if (source.includes('0.includes(')) {
    throw new Error('Phát hiện phép thay thế sai: 0.includes(...)');
  }

  if (source === original) throw new Error('Multi-group patch không tạo thay đổi nào trong quan-ly/page.tsx');
  return source;
}

function patchSavedContest(source) {
  if (source.includes(MARKER)) {
    console.log('✓ Multi-group filters already applied: saved-contest-inline.tsx');
    return source;
  }

  const original = source;
  const stateOld = `  const [nhomFilter, setNhomFilter] = useState('');`;
  const stateNew = `  ${MARKER}\n  const [nhomFilter, setNhomFilter] = useState<string[]>([]);`;
  if (!source.includes(stateOld)) throw new Error('Không tìm thấy state nhomFilter trong saved-contest-inline.tsx');
  source = source.replace(stateOld, stateNew);

  const filterOld = `      if (nhomFilter && r.nhomLabel !== nhomFilter) return false;`;
  const filterNew = `      if (nhomFilter.length > 0 && !nhomFilter.includes(r.nhomLabel || '')) return false;`;
  if (!source.includes(filterOld)) throw new Error('Không tìm thấy điều kiện nhomFilter trong saved-contest-inline.tsx');
  source = source.replace(filterOld, filterNew);

  // Keep dropdown open after ticking a group.
  source = source.split(
    `setNhomFilter(n); (e.currentTarget.closest('.relative')?.querySelector('.absolute') as HTMLElement)?.classList.add('hidden');`
  ).join(`setNhomFilter(${toggleExpression('n')});`);

  source = source.split(`setNhomFilter('')`).join(`setNhomFilter([])`);
  source = source.split(`setNhomFilter(n)`).join(`setNhomFilter(${toggleExpression('n')})`);
  source = source.split(`nhomFilter === n`).join(`nhomFilter.includes(n)`);
  source = replaceEmptyVisualState(source, 'nhomFilter');
  source = source.split(`nhomFilter || 'Tất cả nhóm'`).join(selectionLabel('nhomFilter', 'Tất cả nhóm'));
  source = source.split(`nhomFilter || 'Tất cả'`).join(selectionLabel('nhomFilter', 'Tất cả'));

  if (!source.includes('nhomFilter.includes(n)') || !source.includes('nhomFilter.length > 0')) {
    throw new Error('SavedContestInline chưa được chuyển đầy đủ sang multi-select');
  }
  if (source.includes('0.includes(')) {
    throw new Error('SavedContestInline có phép thay thế sai: 0.includes(...)');
  }
  if (source === original) throw new Error('Multi-group patch không tạo thay đổi nào trong saved-contest-inline.tsx');
  return source;
}

for (const filePath of [quanLyPath, savedContestPath]) {
  if (!fs.existsSync(filePath)) throw new Error(`Không tìm thấy ${filePath}`);
}

const quanLyInput = readNormalized(quanLyPath);
const savedContestInput = readNormalized(savedContestPath);
const quanLy = patchQuanLy(quanLyInput.source);
const savedContest = patchSavedContest(savedContestInput.source);
fs.writeFileSync(quanLyPath, quanLy.replace(/\n/g, quanLyInput.eol), 'utf8');
fs.writeFileSync(savedContestPath, savedContest.replace(/\n/g, savedContestInput.eol), 'utf8');

console.log('✓ KPI linked pages: bộ lọc Nhóm đã hỗ trợ chọn nhiều nhóm (Chính sách / Thi đua / CLB Sao Việt).');
