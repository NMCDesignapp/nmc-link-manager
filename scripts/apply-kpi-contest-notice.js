#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const mainPage = path.join(root, 'src', 'app', 'kpi', 'page.tsx');
const componentSource = path.join(root, 'src', 'components', 'kpi-contest-notice.tsx');
const standaloneComponent = path.join(root, 'kpi-app', 'src', 'components', 'kpi-contest-notice.tsx');
const MARKER = "import { KpiContestNotice } from '@/components/kpi-contest-notice';";
const STANDALONE_LOCK = 'nmc-kpi-standalone-contest-notice-v2';

if (!fs.existsSync(mainPage)) throw new Error(`Không tìm thấy ${mainPage}`);
if (!fs.existsSync(componentSource)) throw new Error(`Không tìm thấy ${componentSource}`);

// Keep a committed standalone component when it carries the explicit lock marker.
// This avoids prebuild overwriting the production-safe standalone popup implementation.
const standaloneLocked = fs.existsSync(standaloneComponent)
  && fs.readFileSync(standaloneComponent, 'utf8').includes(STANDALONE_LOCK);
if (!standaloneLocked) {
  fs.mkdirSync(path.dirname(standaloneComponent), { recursive: true });
  fs.copyFileSync(componentSource, standaloneComponent);
}

const original = fs.readFileSync(mainPage, 'utf8');
const newline = original.includes('\r\n') ? '\r\n' : '\n';
let source = original.replace(/\r\n/g, '\n');
if (source.includes(MARKER)) {
  console.log(`✓ KPI contest notice: Main đã có carousel; standalone ${standaloneLocked ? 'giữ component đã khóa' : 'đã đồng bộ từ Main'}.`);
  process.exit(0);
}

const importAnchor = "import { AppLoader } from '@/components/app-loader';\n";
if (!source.includes(importAnchor)) throw new Error('Không tìm thấy import AppLoader để gắn KpiContestNotice.');
source = source.replace(importAnchor, `${importAnchor}${MARKER}\n`);

const mobileAnchor = `                  Tiến Độ Khu Vực\n                </span>\n              </div>\n\n              {/* Mobile Region - Redesign as table-style cards (collapsible)`;
if (!source.includes(mobileAnchor)) throw new Error('Không tìm thấy vị trí Tiến Độ Khu Vực mobile.');
source = source.replace(
  mobileAnchor,
  `                  Tiến Độ Khu Vực\n                </span>\n              </div>\n              <div className="mobile-only">\n                <KpiContestNotice />\n              </div>\n\n              {/* Mobile Region - Redesign as table-style cards (collapsible)`,
);

const desktopAnchor = `                    DS Đã Đăng Ký\n                  </button>\n                </div>\n                {/* Desktop: only split-right (cards) is collapsible.`;
if (!source.includes(desktopAnchor)) throw new Error('Không tìm thấy vị trí dưới Tiến Độ Khu Vực desktop.');
source = source.replace(
  desktopAnchor,
  `                    DS Đã Đăng Ký\n                  </button>\n                </div>\n                <KpiContestNotice />\n                {/* Desktop: only split-right (cards) is collapsible.`,
);

fs.writeFileSync(mainPage, source.replace(/\n/g, newline), 'utf8');
console.log('✓ KPI contest notice: poster trái + thông tin phải + nhấn mạnh ngày kết thúc; tự luân phiên nhẹ ở client.');
