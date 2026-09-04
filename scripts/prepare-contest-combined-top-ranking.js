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

// Main page currently passes a title prop into the primary BonusTierEditor.
// Keep the patch anchor synchronized with that exact production JSX.
const oldBonusAnchor = [
  '  const bonusEditorAnchor = `              <BonusTierEditor\\n                tiers={bonusTiers}\\n                conditionType={conditionType}\\n                onUpdate={updateBonusTier}\\n                onAdd={addBonusTier}\\n                onRemove={removeBonusTier}\\n              />`;',
].join('\n');
const currentBonusAnchor = [
  '  const bonusEditorAnchor = `              <BonusTierEditor\\n                tiers={bonusTiers}\\n                conditionType={conditionType}\\n                onUpdate={updateBonusTier}\\n                onAdd={addBonusTier}\\n                onRemove={removeBonusTier}\\n                title={usePhase2 ? \'Bảng mức thưởng - Giai đoạn 1\' : \'Bảng mức thưởng\'}\\n              />`;',
].join('\n');
if (source.includes(oldBonusAnchor)) {
  source = source.replace(oldBonusAnchor, currentBonusAnchor);
} else if (!source.includes(currentBonusAnchor)) {
  throw new Error('[prepare-combined-top] Expected BonusTierEditor patch anchor not found');
}

fs.writeFileSync(file, source, 'utf8');
console.log('✓ normalized combined TOP patch script');
