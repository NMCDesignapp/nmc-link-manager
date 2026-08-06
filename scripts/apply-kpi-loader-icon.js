const fs = require('fs');
const path = require('path');

const files = [
  path.resolve(__dirname, '../src/components/app-loader.tsx'),
  path.resolve(__dirname, '../kpi-app/src/components/app-loader.tsx'),
];

const logoBlock = `          <div className="nmc-kpi-loader-logo relative mx-auto mb-5 flex h-[104px] w-[104px] items-center justify-center">
            <div className="nmc-kpi-loader-logo-halo pointer-events-none absolute inset-[-18px] rounded-full" />
            <div className="nmc-kpi-loader-logo-flare pointer-events-none absolute inset-[-28px] rounded-full" />
            <div
              className="relative z-10 h-[92px] w-[92px] overflow-hidden rounded-[23px]"
              style={{ boxShadow: '0 0 0 3px rgba(255,255,255,.14), 0 0 28px rgba(95,214,255,.48), 0 0 52px rgba(78,230,169,.28)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon/kpi-192.png" alt="KPI An Giang" className="h-full w-full object-cover" />
              <span className="nmc-kpi-loader-logo-shine pointer-events-none absolute inset-y-[-20%] left-[-48%] w-[34%]" />
            </div>
          </div>`;

const loaderStyles = `<style>{\`
            @keyframes nmc-kpi-loader-spin { to { transform: rotate(360deg); } }
            @keyframes nmc-kpi-loader-logo-pulse {
              0%, 100% { transform: scale(1); filter: brightness(1); }
              50% { transform: scale(1.045); filter: brightness(1.12); }
            }
            @keyframes nmc-kpi-loader-logo-halo {
              0%, 100% { opacity: .45; transform: scale(.9); }
              50% { opacity: .9; transform: scale(1.08); }
            }
            @keyframes nmc-kpi-loader-logo-flare {
              0% { opacity: .18; transform: rotate(0deg) scale(.9); }
              50% { opacity: .62; transform: rotate(180deg) scale(1.08); }
              100% { opacity: .18; transform: rotate(360deg) scale(.9); }
            }
            @keyframes nmc-kpi-loader-logo-shine {
              0%, 18% { transform: translateX(0) rotate(18deg); opacity: 0; }
              28% { opacity: .9; }
              55%, 100% { transform: translateX(520%) rotate(18deg); opacity: 0; }
            }
            .nmc-kpi-loader-logo { animation: nmc-kpi-loader-logo-pulse 2.2s ease-in-out infinite; }
            .nmc-kpi-loader-logo-halo {
              background: radial-gradient(circle, rgba(105,225,255,.72) 0%, rgba(70,229,171,.35) 38%, transparent 72%);
              filter: blur(10px);
              animation: nmc-kpi-loader-logo-halo 1.8s ease-in-out infinite;
            }
            .nmc-kpi-loader-logo-flare {
              background: conic-gradient(from 0deg, transparent 0 17%, rgba(255,255,255,.5) 20%, transparent 24% 48%, rgba(81,220,255,.42) 52%, transparent 58% 78%, rgba(83,235,172,.38) 82%, transparent 88%);
              filter: blur(12px);
              animation: nmc-kpi-loader-logo-flare 4.6s linear infinite;
            }
            .nmc-kpi-loader-logo-shine {
              background: linear-gradient(90deg, transparent, rgba(255,255,255,.95), transparent);
              filter: blur(1.5px);
              animation: nmc-kpi-loader-logo-shine 2.4s ease-in-out infinite;
            }
          \`}</style>`;

for (const filePath of files) {
  let source = fs.readFileSync(filePath, 'utf8');

  if (!source.includes('nmc-kpi-loader-logo')) {
    source = source.replace(
      /import \{ AlertCircle, RotateCw, Trophy \} from 'lucide-react';/,
      "import { AlertCircle, RotateCw } from 'lucide-react';",
    );

    const trophyBlockPattern = /          <div(?:\n|\r\n)?\s*className="mx-auto mb-5 flex h-\[88px\] w-\[88px\] items-center justify-center rounded-full"[\s\S]*?            <Trophy size=\{43\} strokeWidth=\{2\.2\} \/>(?:\n|\r\n)?          <\/div>/;
    const compactTrophyBlockPattern = /          <div className="mx-auto mb-5 flex h-\[88px\] w-\[88px\] items-center justify-center rounded-full"[\s\S]*?<Trophy size=\{43\} strokeWidth=\{2\.2\} \/>(?:\n|\r\n)?          <\/div>/;

    if (trophyBlockPattern.test(source)) {
      source = source.replace(trophyBlockPattern, logoBlock);
    } else if (compactTrophyBlockPattern.test(source)) {
      source = source.replace(compactTrophyBlockPattern, logoBlock);
    } else {
      throw new Error(`[KPI loader] Không tìm thấy khối cúp trong ${filePath}`);
    }
  }

  const oldStyle = '<style>{`@keyframes nmc-kpi-loader-spin { to { transform: rotate(360deg); } }`}</style>';
  if (source.includes(oldStyle)) {
    source = source.replace(oldStyle, loaderStyles);
  }

  fs.writeFileSync(filePath, source, 'utf8');
  console.log(`✓ KPI loader icon: ${path.relative(process.cwd(), filePath)}`);
}

console.log('✓ KPI loader: đã dùng icon app KPI và thêm hiệu ứng lóe sáng.');
