const fs = require('fs');

const file = 'scripts/apply-contest-combined-top-ranking.js';
let source = fs.readFileSync(file, 'utf8');

const badTopLabel = ": `TOP ${index + 1}`}</Label>";
const goodTopLabel = ": 'TOP ' + (index + 1)}</Label>";
if (source.includes(badTopLabel)) {
  source = source.replace(badTopLabel, goodTopLabel);
} else if (!source.includes(goodTopLabel)) {
  throw new Error('[prepare-combined-top] Expected TOP label template not found');
}

const badNtdBlock = [
  '  source = replaceAllExact(',
  '    source,',
  '    "rewardNote,\\n            );",',
  '    "getCombinedTopNote(`nyd:${n.nydCode}`) || rewardNote,\\n            );",',
  "    'NTD Excel combined TOP note',",
  '  );',
].join('\n');
const goodNtdBlock = [
  '  source = replaceOnce(',
  '    source,',
  '    "          row.push(rewardNote);",',
  '    "          row.push(getCombinedTopNote(`nyd:${n.nydCode}`) || rewardNote);",',
  "    'NTD Excel combined TOP note',",
  '  );',
].join('\n');
if (source.includes(badNtdBlock)) {
  source = source.replace(badNtdBlock, goodNtdBlock);
} else if (!source.includes(goodNtdBlock)) {
  throw new Error('[prepare-combined-top] Expected NTD Excel patch block not found');
}

fs.writeFileSync(file, source, 'utf8');
console.log('✓ normalized combined TOP patch script');
