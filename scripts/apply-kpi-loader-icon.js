const fs = require('fs');
const path = require('path');

// Main App build already invokes this script. Apply the canonical KPI table UI
// patch here as well so Vercel Main and standalone builds use the same source.
require('./apply-kpi-table-ui-fixes.js');

const targets = [
  {
    filePath: path.resolve(__dirname, '../src/components/app-loader.tsx'),
    imageSrc: '/kpi-tech-logo.webp',
    label: 'Main App',
  },
  {
    filePath: path.resolve(__dirname, '../kpi-app/src/components/app-loader.tsx'),
    imageSrc: '/kpi-tech-logo.webp',
    label: 'KPI tách',
  },
];

const marker = 'nmc-kpi-loader-icon-safe';

const loaderStyles = `<style>{\`
            @keyframes nmc-kpi-loader-spin { to { transform: rotate(360deg); } }
            @keyframes nmc-kpi-loader-logo-pulse {
              0%, 100% { transform: scale(1); filter: brightness(1); }
              50% { transform: scale(1.035); filter: brightness(1.1); }
            }
            @keyframes nmc-kpi-loader-logo-halo {
              0%, 100% { opacity: .4; transform: scale(.94); }
              50% { opacity: .82; transform: scale(1.06); }
            }
            @keyframes nmc-kpi-loader-logo-shine {
              0%, 20% { transform: translateX(0) rotate(18deg); opacity: 0; }
              32% { opacity: .86; }
              58%, 100% { transform: translateX(520%) rotate(18deg); opacity: 0; }
            }
            .nmc-kpi-loader-logo-safe { animation: nmc-kpi-loader-logo-pulse 2.2s ease-in-out infinite; }
            .nmc-kpi-loader-logo-safe-halo {
              background: radial-gradient(circle, rgba(105,225,255,.64) 0%, rgba(70,229,171,.3) 42%, transparent 72%);
              filter: blur(9px);
              animation: nmc-kpi-loader-logo-halo 1.9s ease-in-out infinite;
            }
            .nmc-kpi-loader-logo-safe-shine {
              background: linear-gradient(90deg, transparent, rgba(255,255,255,.92), transparent);
              filter: blur(1px);
              animation: nmc-kpi-loader-logo-shine 2.6s ease-in-out infinite;
            }
          \`}</style>`;

for (const target of targets) {
  let source = fs.readFileSync(target.filePath, 'utf8');

  if (!source.includes(marker)) {
    const trophyBlockPattern = /          <div(?:\r?\n)?\s*className="mx-auto mb-5 flex h-\[88px\] w-\[88px\] items-center justify-center rounded-full"[\s\S]*?            <Trophy size=\{43\} strokeWidth=\{2\.2\} \/>(?:\r?\n)?          <\/div>/;
    const compactTrophyBlockPattern = /          <div className="mx-auto mb-5 flex h-\[88px\] w-\[88px\] items-center justify-center rounded-full"[\s\S]*?<Trophy size=\{43\} strokeWidth=\{2\.2\} \/>(?:\r?\n)?          <\/div>/;

    const logoBlock = `          {/* ${marker} */}
          <div className="nmc-kpi-loader-logo-safe relative mx-auto mb-5 flex h-[104px] w-[104px] items-center justify-center">
            <div className="nmc-kpi-loader-logo-safe-halo pointer-events-none absolute inset-[-17px] rounded-full" />
            <div
              className="relative z-10 h-[92px] w-[92px] overflow-hidden rounded-[23px]"
              style={{ boxShadow: '0 0 0 3px rgba(255,255,255,.14), 0 0 28px rgba(95,214,255,.42), 0 0 48px rgba(78,230,169,.22)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="${target.imageSrc}" alt="KPI An Giang" className="block h-full w-full object-cover" />
              <span className="nmc-kpi-loader-logo-safe-shine pointer-events-none absolute inset-y-[-20%] left-[-48%] w-[34%]" />
            </div>
          </div>`;

    if (trophyBlockPattern.test(source)) {
      source = source.replace(trophyBlockPattern, logoBlock);
    } else if (compactTrophyBlockPattern.test(source)) {
      source = source.replace(compactTrophyBlockPattern, logoBlock);
    } else {
      throw new Error(`[KPI loader] Không tìm thấy khối biểu tượng cũ trong ${target.filePath}`);
    }
  }

  const oldStyle = '<style>{`@keyframes nmc-kpi-loader-spin { to { transform: rotate(360deg); } }`}</style>';
  if (source.includes(oldStyle)) {
    source = source.replace(oldStyle, loaderStyles);
  }

  fs.writeFileSync(target.filePath, source, 'utf8');
  console.log(`✓ KPI loader an toàn: ${target.label}`);
}

// Khi /quan-ly được mở bên trong iframe KPI, popup ngang ở parent là loader duy nhất
// cho bước vào Thi đua / Chính sách / CLB Sao Việt. Hai spinner nội bộ của /quan-ly
// (mounted guard + data-sheet guard) chỉ tạo thêm lớp loading chồng và tốn animation.
// Gắn class ổn định cho đúng hai guard này; template /quan-ly sẽ ẩn chúng CHỈ ở KPI embed.
const linkedPagePath = path.resolve(__dirname, '../src/app/quan-ly/page.tsx');
if (fs.existsSync(linkedPagePath)) {
  let linkedSource = fs.readFileSync(linkedPagePath, 'utf8');
  const internalLoaderClass = 'nmc-kpi-embedded-internal-loader';

  if (!linkedSource.includes(`${internalLoaderClass} flex items-center justify-center py-20`)) {
    linkedSource = linkedSource.replaceAll(
      'className="flex items-center justify-center py-20"',
      `className="${internalLoaderClass} flex items-center justify-center py-20"`,
    );
  }

  if (!linkedSource.includes(`${internalLoaderClass} h-screen flex flex-col fixed inset-0 z-50`)) {
    linkedSource = linkedSource.replace(
      'className="h-screen flex flex-col fixed inset-0 z-50 items-center justify-center"',
      `className="${internalLoaderClass} h-screen flex flex-col fixed inset-0 z-50 items-center justify-center"`,
    );
  }

  fs.writeFileSync(linkedPagePath, linkedSource, 'utf8');
  console.log('✓ KPI linked pages: đã đánh dấu 2 loader nội bộ để ẩn khi embed.');
}

console.log('✓ Đã đồng bộ icon tải KPI cho Main App và KPI tách.');
