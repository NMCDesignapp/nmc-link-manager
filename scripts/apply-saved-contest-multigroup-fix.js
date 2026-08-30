const fs = require('fs');
const path = require('path');

// nmc-saved-contest-multigroup-filter-fix-v1
// Runs AFTER apply-multi-group-filters.js and BEFORE the UX patch.
// The base patch changes nhomFilter from string -> string[], but SavedContestInline
// has several target-specific filters (TVV / Nhóm / NTD) that still use the old
// scalar condition: `if (nhomFilter && field !== nhomFilter) return false;`.
// Because [] is truthy in JavaScript, that old condition removes every row while
// the UI says "Tất cả nhóm". Convert ALL remaining scalar conditions to array
// semantics so saved contests keep their data with 0/1/many selected groups.

const filePath = path.join(process.cwd(), 'src/components/saved-contest-inline.tsx');
const BASE_MARKER = '// nmc-multi-group-filter-v1';
const FIX_MARKER = '// nmc-saved-contest-multigroup-filter-fix-v1';

if (!fs.existsSync(filePath)) throw new Error(`Không tìm thấy ${filePath}`);
const originalSource = fs.readFileSync(filePath, 'utf8');
const eol = originalSource.includes('\r\n') ? '\r\n' : '\n';
let source = originalSource.replace(/\r\n/g, '\n');

if (!source.includes(BASE_MARKER)) {
  throw new Error('Base multi-group patch chưa chạy trước SavedContest fix');
}

if (source.includes(FIX_MARKER)) {
  console.log('✓ SavedContest multi-group data fix already applied.');
  process.exit(0);
}

// Keep the exact BASE_MARKER + state sequence intact because the following UX
// patch deliberately validates that anchor before adding click-outside/checkmarks.
const anchor = `  ${BASE_MARKER}\n  const [nhomFilter, setNhomFilter] = useState<string[]>([]);`;
if (!source.includes(anchor)) {
  throw new Error('Không tìm thấy state nhomFilter dạng array trong SavedContestInline');
}
source = source.replace(anchor, `${anchor}\n  ${FIX_MARKER}`);

let replaced = 0;
const oldScalarCondition = /if \(nhomFilter && ([^\n;]+?) !== nhomFilter\) return false;/g;
source = source.replace(oldScalarCondition, (_match, field) => {
  replaced += 1;
  return `if (nhomFilter.length > 0 && !nhomFilter.includes(${field} || '')) return false;`;
});

// The base patch already converts applyLocalFilter's r.nhomLabel condition.
// This fix is specifically for the target-specific render filters that were left.
if (replaced < 2) {
  throw new Error(`SavedContest multi-group fix chỉ sửa ${replaced} điều kiện; kỳ vọng ít nhất 2 điều kiện target-specific`);
}

if (/if \(nhomFilter && [^\n;]+? !== nhomFilter\) return false;/.test(source)) {
  throw new Error('Vẫn còn điều kiện nhomFilter scalar trong SavedContestInline');
}

if (!source.includes("nhomFilter.length > 0 && !nhomFilter.includes(")) {
  throw new Error('Không tạo được điều kiện multi-group an toàn cho SavedContestInline');
}

fs.writeFileSync(filePath, source.replace(/\n/g, eol), 'utf8');
console.log(`✓ SavedContest data restored: converted ${replaced} remaining scalar group filter(s) to multi-select semantics.`);
