const fs = require('fs');

const file = 'scripts/apply-contest-combined-top-ranking.js';
let source = fs.readFileSync(file, 'utf8');
const bad = ": `TOP ${index + 1}`}</Label>";
const good = ": 'TOP ' + (index + 1)}</Label>";

if (source.includes(bad)) {
  source = source.replace(bad, good);
  fs.writeFileSync(file, source, 'utf8');
  console.log('✓ normalized nested TOP label template in combined TOP patch script');
} else if (!source.includes(good)) {
  throw new Error('[prepare-combined-top] Expected TOP label template not found');
}
