#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src', 'components', 'kpi-contest-notice.tsx');
const standalonePath = path.join(root, 'kpi-app', 'src', 'components', 'kpi-contest-notice.tsx');
const pagePath = path.join(root, 'src', 'app', 'kpi', 'page.tsx');
const UI_MARKER = '/* nmc-kpi-region-notice-polish-v1 */';

if (!fs.existsSync(sourcePath)) throw new Error(`Không tìm thấy ${sourcePath}`);
if (!fs.existsSync(pagePath)) throw new Error(`Không tìm thấy ${pagePath}`);

let source = fs.readFileSync(sourcePath, 'utf8');
source = source.replace('const ROTATE_MS = 7_500;', 'const ROTATE_MS = 5_000;');
source = source.replace(
  'animation: kpiContestNoticeIn .5s cubic-bezier(.22,1,.36,1);',
  'animation: kpiContestNoticeIn .96s cubic-bezier(.16,1,.3,1); will-change: opacity, transform;',
);
source = source.replace(
  'from { opacity: 0; transform: translateX(10px); }\n          to { opacity: 1; transform: translateX(0); }',
  'from { opacity: 0; transform: translateX(8px) scale(.997); }\n          45% { opacity: .72; }\n          to { opacity: 1; transform: translateX(0) scale(1); }',
);
source = source.replace('margin: 10px 0 16px;', 'margin: 18px 0 16px;');
source = source.replace(
  '          padding: 5px;\n          border: 1px solid rgba(230, 189, 85, .5);',
  '          padding: 0;\n          border: 1px solid rgba(230, 189, 85, .5);',
);
source = source.replace('          object-fit: contain;', '          object-fit: cover;');

if (!source.includes('const ROTATE_MS = 5_000;')) {
  throw new Error('Không áp dụng được chu kỳ 5 giây cho thông báo thi đua.');
}
if (!source.includes('animation: kpiContestNoticeIn .96s')) {
  throw new Error('Không áp dụng được chuyển cảnh chậm/mượt cho thông báo thi đua.');
}
if (!source.includes('margin: 18px 0 16px;')) {
  throw new Error('Không cân được khoảng cách giữa Tiến độ khu vực và ô thông báo.');
}
if (!source.includes('object-fit: cover;')) {
  throw new Error('Không kéo poster phủ đầy khung thông báo.');
}
if (!source.includes('padding: 0;\n          border: 1px solid rgba(230, 189, 85, .5);')) {
  throw new Error('Không bỏ được khoảng đệm bên trong khung poster.');
}

fs.writeFileSync(sourcePath, source, 'utf8');
fs.mkdirSync(path.dirname(standalonePath), { recursive: true });
fs.writeFileSync(standalonePath, source, 'utf8');

let page = fs.readFileSync(pagePath, 'utf8');
if (!page.includes(UI_MARKER)) {
  const anchor = `.kpi-app .target-reg-actions .target-reg-btn { flex: 1 1 0; }\n`;
  if (!page.includes(anchor)) {
    throw new Error('Không tìm thấy CSS chiều rộng KPI để gắn thiết kế Tiến độ khu vực.');
  }

  const polish = `${UI_MARKER}\n/* Cân nhịp dọc với nav 6 nút và đưa mũi tên vào một badge gọn trong thanh. */\n.kpi-app .region-divider.is-collapse-btn {\n  margin-top: 18px !important;\n  margin-bottom: 0 !important;\n}\n.kpi-app .region-divider.is-collapse-btn .region-divider-title {\n  position: relative;\n  min-height: 48px;\n  padding: 0 54px !important;\n  border-radius: 12px !important;\n  border: 1px solid rgba(88, 192, 224, .72) !important;\n  background: linear-gradient(180deg, #15516f 0%, #103f5a 52%, #0c354d 100%) !important;\n  box-shadow: 0 9px 20px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.10), inset 0 -1px 0 rgba(0,0,0,.22) !important;\n  color: #e9f9ff !important;\n  text-shadow: 0 1px 5px rgba(0,0,0,.42) !important;\n}\n.kpi-app .region-divider.is-collapse-btn:hover .region-divider-title {\n  background: linear-gradient(180deg, #1a5c7a 0%, #124963 52%, #0e3b53 100%) !important;\n  border-color: rgba(112, 211, 238, .86) !important;\n}\n.kpi-app .region-divider.is-collapse-btn .region-divider-title .collapse-icon {\n  position: absolute !important;\n  left: 12px !important;\n  top: 50% !important;\n  width: 30px !important;\n  height: 30px !important;\n  padding: 0 !important;\n  transform: translateY(-50%) !important;\n  border: 1px solid rgba(244, 198, 82, .52) !important;\n  border-radius: 8px !important;\n  background: linear-gradient(145deg, rgba(242, 190, 64, .14), rgba(242, 190, 64, .05)) !important;\n  box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 3px 9px rgba(0,0,0,.18) !important;\n}\n.kpi-app .region-divider.is-collapse-btn .region-divider-title .collapse-icon::after {\n  content: '';\n  position: absolute;\n  left: 50%;\n  top: 50%;\n  width: 8px;\n  height: 8px;\n  border: solid #ffd66f;\n  border-width: 0 2px 2px 0;\n  transform: translate(-50%, -62%) rotate(45deg);\n  transition: transform .28s ease;\n  filter: drop-shadow(0 0 4px rgba(255,214,111,.22));\n}\n.kpi-app .region-divider.is-collapse-btn.collapsed .region-divider-title .collapse-icon {\n  transform: translateY(-50%) !important;\n}\n.kpi-app .region-divider.is-collapse-btn.collapsed .region-divider-title .collapse-icon::after {\n  transform: translate(-60%, -50%) rotate(-45deg);\n}\n@media (max-width: 899px) {\n  .kpi-app .region-divider.is-collapse-btn .region-divider-title {\n    min-height: 46px;\n    padding-left: 50px !important;\n    padding-right: 50px !important;\n  }\n  .kpi-app .region-divider.is-collapse-btn .region-divider-title .collapse-icon {\n    left: 10px !important;\n    width: 28px !important;\n    height: 28px !important;\n  }\n}\n`;

  page = page.replace(anchor, `${anchor}${polish}`);
  fs.writeFileSync(pagePath, page, 'utf8');
}

console.log('✓ KPI polish: chu kỳ 5 giây; chuyển cảnh 0.96s; khoảng cách 18px; poster phủ đầy khung; thanh Tiến độ khu vực dùng badge mũi tên gọn.');
