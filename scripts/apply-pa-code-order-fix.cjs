const fs = require('fs');

const files = [
  'src/app/thi-dua-chau/page.tsx',
  'src/lib/contest-calculator.ts',
];

const before = `function isPAGroup(nhom?: string | null, maNhom?: string | null): boolean {\n  const text = norm(\`${'${nhom || \'\'} ${maNhom || \'\'}'}\`).toUpperCase();\n  return /(^|[\\s._\\/-])PA(?:$|[\\s._\\/-]|\\d)/.test(text);\n}`;

const after = `function isPAGroup(nhom?: string | null, maNhom?: string | null): boolean {\n  const values = [nhom, maNhom]\n    .map(value => norm(value || '').toUpperCase().trim())\n    .filter(Boolean);\n  return values.some(value =>\n    value === 'U104101014' ||\n    /(^|[\\s._\\/-])PA(?:$|[\\s._\\/-]|\\d)/.test(value)\n  );\n}`;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const count = content.split(before).length - 1;
  if (count !== 1) throw new Error(`${file}: expected one isPAGroup definition, found ${count}`);
  const updated = content.replace(before, after);
  if (!updated.includes("value === 'U104101014'")) throw new Error(`${file}: PA code marker missing`);
  fs.writeFileSync(file, updated, 'utf8');
}

console.log('PA code ordering patch applied.');
