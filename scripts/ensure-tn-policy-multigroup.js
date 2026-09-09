const fs = require('fs');
const path = require('path');

// NMC 2026-09-09
// Hard guarantee for TN-oriented policy tables that still regress to single-select:
// - Thưởng Tuyển luyện
// - Thưởng Đồng hành
// - Thưởng Phát triển kinh doanh TN
// - Thưởng Quý TN
//
// The general multi-group migration runs through other build patches, but these
// legacy chip filters can be regenerated as scalar state by older source transforms.
// This script runs LAST in dev/build and is deliberately idempotent.

const filePath = path.join(process.cwd(), 'src/app/quan-ly/page.tsx');
const targets = [
  { variable: 'tuyenLuyenNhomFilter', setter: 'setTuyenLuyenNhomFilter' },
  { variable: 'dongHanhNhomFilter', setter: 'setDongHanhNhomFilter' },
  { variable: 'ptkdNhomFilter', setter: 'setPtkdNhomFilter' },
  { variable: 'quyTnNhomFilter', setter: 'setQuyTnNhomFilter' },
];

let source = fs.readFileSync(filePath, 'utf8');
const eol = source.includes('\r\n') ? '\r\n' : '\n';
source = source.replace(/\r\n/g, '\n');
let changes = 0;

const replaceAll = (from, to) => {
  if (!source.includes(from)) return;
  const before = source;
  source = source.split(from).join(to);
  if (source !== before) changes += 1;
};

for (const { variable, setter } of targets) {
  // State: scalar -> array. Leave already-migrated declarations untouched.
  replaceAll(
    `const [${variable}, ${setter}] = useState<string>('');`,
    `const [${variable}, ${setter}] = useState<string[]>([]);`
  );

  // Row predicate: selected groups are a UNION, empty array means all groups.
  replaceAll(
    `if (${variable} && row.nhom !== ${variable}) return false;`,
    `if (${variable}.length > 0 && !${variable}.includes(row.nhom)) return false;`
  );

  // Reset to all groups.
  replaceAll(`${setter}('')`, `${setter}([])`);

  // Legacy chip toggle -> additive multi-select toggle.
  replaceAll(
    `${setter}(${variable} === nhom ? '' : nhom)`,
    `${setter}(prev => prev.includes(nhom) ? prev.filter(value => value !== nhom) : [...prev, nhom])`
  );

  // A few historical variants used `n` rather than `nhom`.
  replaceAll(
    `${setter}(${variable} === n ? '' : n)`,
    `${setter}(prev => prev.includes(n) ? prev.filter(value => value !== n) : [...prev, n])`
  );

  // Selected visual state for horizontal chips/dropdowns.
  replaceAll(`${variable} === nhom`, `${variable}.includes(nhom)`);
  replaceAll(`${variable} === n`, `${variable}.includes(n)`);
  replaceAll(`\${!${variable} ?`, `\${${variable}.length === 0 ?`);

  // Defensive validation: all TN filters must finish as arrays and predicates
  // must use includes semantics. Fail the build instead of silently shipping a regression.
  const arrayDecl = `const [${variable}, ${setter}] = useState<string[]>([]);`;
  if (!source.includes(arrayDecl)) {
    throw new Error(`[TN multi-group] ${variable} is not an array state after patching`);
  }
  if (!source.includes(`${variable}.length > 0 && !${variable}.includes(row.nhom)`)) {
    throw new Error(`[TN multi-group] ${variable} row predicate is still single-select`);
  }
  if (source.includes(`${setter}(${variable}.includes(nhom) ? '' : nhom)`)) {
    throw new Error(`[TN multi-group] ${variable} still has scalar chip toggle semantics`);
  }
}

fs.writeFileSync(filePath, source.replace(/\n/g, eol), 'utf8');
console.log(`✓ TN policy multi-group guarantee: Tuyển luyện + Đồng hành + PTKD TN + Quý TN (${changes} transform group(s)).`);
