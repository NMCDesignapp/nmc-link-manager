const fs = require('fs');
const file = 'scripts/apply-exclusive-sync-source.cjs';
let content = fs.readFileSync(file, 'utf8');
const before = `['src/app/quan-ly/page.tsx', "Google Sheets đã tắt vì Data Hub"]`;
const after = `['src/app/quan-ly/page.tsx', "source: 'google-sync'"]`;
if (!content.includes(before)) throw new Error('Old verification marker not found');
content = content.replace(before, after);
fs.writeFileSync(file, content, 'utf8');
console.log('Exclusive sync verification marker updated.');
