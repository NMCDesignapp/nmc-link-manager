// Execute the actual page calculation, not a separately maintained copy of its rules.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadKpiDashboard(relativePage) {
  const source = fs.readFileSync(path.resolve(__dirname, '../..', relativePage), 'utf8');
  const ast = ts.createSourceFile(relativePage, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const helpers = [];
  let dashboard;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && ['num', 'normKey', 'getDoanhSoMonth', 'getPeriodMonths'].includes(node.name?.text)) {
      helpers.push(node.getText(ast));
    }
    if (ts.isVariableDeclaration(node)) {
      const name = node.name.getText(ast);
      if (['AD_FULL_NAME_MAP', 'resolveAdName'].includes(name)) helpers.push(`const ${node.getText(ast)};`);
      if (name === 'dashboard') dashboard = node.initializer.arguments[0].getText(ast);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (!dashboard || helpers.length !== 6) throw new Error('KPI calculation extraction failed; update the test harness');
  const code = ts.transpileModule(`${helpers.join('\n')}\nreturn (${dashboard})();`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function('rawData', 'phongStructList', 'adStructList', 'banNhomStructList', 'tvvStructList', 'overviewPeriod', 'CUR_YEAR', 'onlineSettings', code);
}

module.exports = { loadKpiDashboard };
