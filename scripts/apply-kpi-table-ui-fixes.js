const fs = require('fs');
const path = require('path');

// Patch the canonical KPI source only. Standalone receives this source through
// sync-kpi-source.js during its prebuild, so Main and standalone cannot drift.
const filePath = path.resolve(__dirname, '../src/app/kpi/page.tsx');
let source = fs.readFileSync(filePath, 'utf8');

const marker = 'nmc-kpi-table-surface-v1';
const cssAnchor = '.kpi-app .tamthu-detail-shell { max-width: 1380px; margin: 0 auto; }';

if (!source.includes(marker)) {
  if (!source.includes(cssAnchor)) {
    throw new Error('[KPI table UI] Không tìm thấy CSS anchor của bảng tạm thu.');
  }

  const cssPatch = `${cssAnchor}\n/* ${marker}: giữ nền công nghệ ở dưới, bảng luôn ở lớp nội dung. */\n.kpi-app #view-tamthu-detail,\n.kpi-app #view-target-reg-list { position: relative; z-index: 6; isolation: isolate; }\n.kpi-app .tamthu-detail-shell,\n.kpi-app .tamthu-detail-card,\n.kpi-app .tgr-list-shell,\n.kpi-app .tgr-list-table-wrap { position: relative; z-index: 7; }\n.kpi-app .tamthu-table-wrap,\n.kpi-app .tgr-list-table-wrap { isolation: isolate; background: #fff !important; }\n.kpi-app .tamthu-table,\n.kpi-app .tgr-list-table { position: relative; z-index: 1; background: #fff !important; }\n.kpi-app .tamthu-detail-title { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }\n.kpi-app .tamthu-detail-title > span { display: block; }\n.kpi-app .tamthu-detail-title > em { display: block; color: #8fd9ff; font-size: .56em; font-style: italic; font-weight: 600; line-height: 1.15; letter-spacing: .035em; text-transform: none; }`;

  source = source.replace(cssAnchor, cssPatch);
}

const oldTitle = '<span className="sub-title">Chi Tiết Tạm Thu — {tamthuMonthLabel}</span>';
const newTitle = '<span className="sub-title tamthu-detail-title"><span>Chi Tiết Tạm Thu</span><em>{tamthuMonthLabel}</em></span>';
if (source.includes(oldTitle)) source = source.replace(oldTitle, newTitle);

source = source
  .replace('.kpi-app .tgr-list-table .tgr-col-afyp { width: 17%; text-align: right; }', '.kpi-app .tgr-list-table .tgr-col-afyp { width: 17%; text-align: center; }')
  .replace('.kpi-app .tgr-list-table .tgr-col-luot { width: 7%; text-align: right; }', '.kpi-app .tgr-list-table .tgr-col-luot { width: 7%; text-align: center; }')
  .replace("style={{ height: 30, padding: '0 8px', fontSize: 11, width: 80, textAlign: 'right' }}", "style={{ height: 30, padding: '0 8px', fontSize: 11, width: 80, textAlign: 'center' }}")
  .replace("style={{ height: 30, padding: '0 8px', fontSize: 11, width: 60, textAlign: 'right' }}", "style={{ height: 30, padding: '0 8px', fontSize: 11, width: 60, textAlign: 'center' }}");

if (!source.includes('tamthu-detail-title') || !source.includes('tgr-col-afyp { width: 17%; text-align: center; }')) {
  throw new Error('[KPI table UI] Patch chưa áp dụng đầy đủ.');
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('✓ KPI table UI: nền dưới bảng, tiêu đề tạm thu và căn giữa AFYP/Lượt.');
