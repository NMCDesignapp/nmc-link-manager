const fs = require('fs');
const path = require('path');

const KPI_LINKED_MIN_VISIBLE_MS = 3000;

// Patch both sources because standalone prebuild first syncs the Main KPI page into
// kpi-app/src/app/page.tsx, then this script runs. Main production builds use
// src/app/kpi/page.tsx directly.
const kpiPagePaths = [
  path.resolve(__dirname, '../src/app/kpi/page.tsx'),
  path.resolve(__dirname, '../kpi-app/src/app/page.tsx'),
];

for (const kpiPagePath of kpiPagePaths) {
  if (!fs.existsSync(kpiPagePath)) continue;

  let source = fs.readFileSync(kpiPagePath, 'utf8');

  // Main App must pass from=kpi just like the standalone KPI so /quan-ly knows it
  // is embedded and can suppress its own initial loading layers.
  const oldMainIframe = ': `/quan-ly?sheet=${kpiSheet}&admin=1`';
  const newMainIframe = ': `/quan-ly?sheet=${kpiSheet}&admin=1&from=kpi`';
  if (source.includes(oldMainIframe)) {
    source = source.replace(oldMainIframe, newMainIframe);
  } else if (!source.includes(newMainIframe)) {
    throw new Error(`[KPI linked loader] Không tìm thấy URL iframe trong ${kpiPagePath}`);
  }

  // Keep the linked iframe completely invisible while the category popup is active.
  // The progress bar reaches 100% at ~2.6s; we keep the popup for at least 3.0s,
  // and also wait for the iframe onLoad event. Therefore the user never sees any
  // child-page startup state underneath the parent popup.
  const loadingStateLine = '  const [kpiEmbedLoading, setKpiEmbedLoading] = useState(false);';
  const refMarker = 'kpiEmbedStartedAtRef';
  if (!source.includes(refMarker)) {
    if (!source.includes(loadingStateLine)) {
      throw new Error(`[KPI linked loader] Không tìm thấy state kpiEmbedLoading trong ${kpiPagePath}`);
    }
    source = source.replace(
      loadingStateLine,
      `${loadingStateLine}\n  const kpiEmbedStartedAtRef = useRef(0);\n  const kpiEmbedReadyTimerRef = useRef<number | null>(null);`,
    );
  }

  const openLoadingLine = '    setKpiEmbedLoading(true);';
  const startedAtLine = '    kpiEmbedStartedAtRef.current = Date.now();';
  if (!source.includes(startedAtLine)) {
    if (!source.includes(openLoadingLine)) {
      throw new Error(`[KPI linked loader] Không tìm thấy điểm bắt đầu loader trong ${kpiPagePath}`);
    }
    source = source.replace(
      openLoadingLine,
      `${openLoadingLine}\n${startedAtLine}\n    if (kpiEmbedReadyTimerRef.current !== null && typeof window !== 'undefined') {\n      window.clearTimeout(kpiEmbedReadyTimerRef.current);\n      kpiEmbedReadyTimerRef.current = null;\n    }`,
    );
  }

  const oldOnLoad = '              onLoad={() => setKpiEmbedLoading(false)}';
  const readyHandlerMarker = 'KPI_LINKED_MIN_VISIBLE_MS';
  if (source.includes(oldOnLoad)) {
    source = source.replace(
      oldOnLoad,
      `              onLoad={() => {\n                const elapsed = Date.now() - kpiEmbedStartedAtRef.current;\n                const KPI_LINKED_MIN_VISIBLE_MS = ${KPI_LINKED_MIN_VISIBLE_MS};\n                const remaining = Math.max(0, KPI_LINKED_MIN_VISIBLE_MS - elapsed);\n                if (kpiEmbedReadyTimerRef.current !== null) {\n                  window.clearTimeout(kpiEmbedReadyTimerRef.current);\n                }\n                kpiEmbedReadyTimerRef.current = window.setTimeout(() => {\n                  kpiEmbedReadyTimerRef.current = null;\n                  setKpiEmbedLoading(false);\n                }, remaining);\n              }}\n              style={{\n                visibility: kpiEmbedLoading ? 'hidden' : 'visible',\n                opacity: kpiEmbedLoading ? 0 : 1,\n                pointerEvents: kpiEmbedLoading ? 'none' : 'auto',\n                transition: 'opacity .16s ease-out',\n              }}`,
    );
  } else if (!source.includes(readyHandlerMarker)) {
    throw new Error(`[KPI linked loader] Không tìm thấy onLoad iframe trong ${kpiPagePath}`);
  }

  fs.writeFileSync(kpiPagePath, source, 'utf8');
  console.log(`✓ KPI linked pages: popup đủ 100% rồi mới hiện iframe (${path.relative(path.resolve(__dirname, '..'), kpiPagePath)}).`);
}

// Level 2 loader is intentionally kept for individual program clicks. The
// EmbeddedProgramDataLoader itself now ignores the initial category entry and
// only arms after a real user interaction outside an already-open detail table.
// This gives feedback for the white-table gap without reintroducing the second
// spinner underneath the parent category popup.
const embeddedLoaderPaths = [
  path.resolve(__dirname, '../src/components/embedded-program-data-loader.tsx'),
  path.resolve(__dirname, '../kpi-app/src/components/embedded-program-data-loader.tsx'),
];

for (const embeddedLoaderPath of embeddedLoaderPaths) {
  if (!fs.existsSync(embeddedLoaderPath)) continue;
  const source = fs.readFileSync(embeddedLoaderPath, 'utf8');
  if (!source.includes('interactionArmed') || !source.includes('detailEligibleForLoader')) {
    throw new Error(`[KPI linked loader] Loader chi tiết chưa có cơ chế chỉ kích hoạt sau click: ${embeddedLoaderPath}`);
  }
  if (source.includes('nmc-kpi-parent-loader-only')) {
    throw new Error(`[KPI linked loader] Phát hiện rule cũ đang tắt toàn bộ loader chi tiết: ${embeddedLoaderPath}`);
  }
  console.log(`✓ KPI linked pages: giữ spinner + “Đang tải dữ liệu...” cho từng chương trình (${path.relative(path.resolve(__dirname, '..'), embeddedLoaderPath)}).`);
}

console.log('✓ KPI linked pages: popup ngang cho cấp trang; spinner đơn cho cấp chương trình.');
