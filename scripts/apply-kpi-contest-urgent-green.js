#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targets = [
  path.join(root, 'src', 'components', 'kpi-contest-notice.tsx'),
  path.join(root, 'kpi-app', 'src', 'components', 'kpi-contest-notice.tsx'),
];
const MARKER = '/* nmc-kpi-contest-urgent-green-v2 */';
const ANCHOR = `        @media (prefers-reduced-motion: reduce) {
          .kpi-contest-notice-card { animation: none; }
        }`;
const override = `        ${MARKER}
        @keyframes kpiContestUrgentGreenSurface {
          0%, 100% {
            box-shadow: 0 0 10px rgba(34,197,94,.18), inset 0 1px 0 rgba(255,255,255,.06);
            border-color: rgba(255,92,92,.86);
          }
          50% {
            box-shadow: 0 0 24px rgba(34,197,94,.46), 0 0 0 1px rgba(74,222,128,.42), inset 0 1px 0 rgba(255,255,255,.10);
            border-color: rgba(74,222,128,.92);
          }
        }
        @keyframes kpiContestUrgentGreenDate {
          0%, 100% {
            opacity: .88;
            transform: scale(1);
            color: #a7f3c1;
            text-shadow: 0 0 5px rgba(34,197,94,.44);
          }
          50% {
            opacity: 1;
            transform: scale(1.045);
            color: #effff4;
            text-shadow: 0 0 7px #22c55e, 0 0 16px rgba(74,222,128,.96), 0 0 28px rgba(34,197,94,.68);
          }
        }
        .kpi-contest-end-today,
        .kpi-contest-modal-end-today {
          animation: kpiContestUrgentGreenSurface 1.8s ease-in-out infinite !important;
        }
        .kpi-contest-end-today strong,
        .kpi-contest-modal-end-today strong {
          display: inline-block !important;
          transform-origin: left center;
          animation: kpiContestUrgentGreenDate 1.15s ease-in-out infinite !important;
          color: #a7f3c1 !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .kpi-contest-end-today,
          .kpi-contest-modal-end-today,
          .kpi-contest-end-today strong,
          .kpi-contest-modal-end-today strong { animation: none !important; }
        }
`;

let patched = 0;
for (const filePath of targets) {
  if (!fs.existsSync(filePath)) continue;
  const original = fs.readFileSync(filePath, 'utf8');
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  let source = original.replace(/\r\n/g, '\n');
  if (!source.includes('data-kpi-contest-popup="true"')) continue;
  if (source.includes(MARKER)) continue;
  const anchorIndex = source.lastIndexOf(ANCHOR);
  if (anchorIndex < 0) throw new Error(`Không tìm thấy anchor CSS cuối thông báo tại ${filePath}`);
  source = `${source.slice(0, anchorIndex)}${override}${source.slice(anchorIndex)}`;
  fs.writeFileSync(filePath, source.replace(/\n/g, newline), 'utf8');
  patched += 1;
}

for (const filePath of targets) {
  if (!fs.existsSync(filePath)) continue;
  const source = fs.readFileSync(filePath, 'utf8');
  if (source.includes('data-kpi-contest-popup="true"') && !source.includes(MARKER)) {
    throw new Error(`Không áp dụng được hiệu ứng ngày xanh trên nền đỏ tại ${filePath}`);
  }
}

console.log(`✓ KPI contest notice: hạn còn tối đa 2 ngày phát sáng xanh liên tục trên nền đỏ (${patched} file(s) cập nhật).`);
