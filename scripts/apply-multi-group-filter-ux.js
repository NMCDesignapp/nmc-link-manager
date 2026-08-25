const fs = require('fs');
const path = require('path');

// nmc-multi-group-filter-ux-build-v1
// Runs AFTER apply-multi-group-filters.js. It only improves interaction/UI:
// - click/tap outside an opened group dropdown => close it
// - selected group option shows a trailing check mark
// Business filtering/calculation logic is intentionally untouched.

const UX_MARKER = '// nmc-multi-group-filter-ux-v1';
const MULTI_MARKER = '// nmc-multi-group-filter-v1';
const quanLyPath = path.join(process.cwd(), 'src/app/quan-ly/page.tsx');
const savedContestPath = path.join(process.cwd(), 'src/components/saved-contest-inline.tsx');

const FILTER_VARIABLES = [
  'nhomFilter',
  'saovietNhomFilter',
  'clbsvNhomFilter',
  'quyTvvNhomFilter',
  'tvvmNhomFilter',
  'nsTvvNhomFilter',
  'tuyenLuyenNhomFilter',
  'dongHanhNhomFilter',
  'quyTnNhomFilter',
  'ptkdNhomFilter',
];

function patchDropdownMenus(source) {
  let patchedMenus = 0;
  let checkmarkOptions = 0;

  // Group dropdowns in these pages are simple absolute DIVs containing buttons.
  // Limit the patch to menus that contain "Tất cả nhóm" AND a known multi-select
  // variable, so unrelated absolute menus/popovers remain completely untouched.
  const menuRegex = /<div className="hidden absolute([^\"]*)">([\s\S]*?)<\/div>/g;

  source = source.replace(menuRegex, (full, classTail, originalBody) => {
    if (!originalBody.includes('Tất cả nhóm')) return full;

    const variable = FILTER_VARIABLES.find((name) =>
      originalBody.includes(`${name}.includes(n)`)
    );
    if (!variable) return full;

    let body = originalBody;

    // Make room for the trailing check mark while preserving each theme/color.
    body = body.replace(
      /w-full text-left/g,
      'w-full flex items-center justify-between gap-2 text-left'
    );

    // Accessibility: each group option behaves like a toggle in a multi-select list.
    body = body.replace(
      /<button(\s+key=\{n\})/g,
      `<button$1 aria-pressed={${variable}.includes(n)}`
    );

    // Only group-name options get a check mark. "Tất cả nhóm" stays visually clean.
    const beforeChecks = body;
    body = body.replace(
      />\{n\}<\/button>/g,
      `><span className="flex-1 truncate">{n}</span>{${variable}.includes(n) && <span aria-hidden="true" className="ml-2 flex-shrink-0 text-[11px] font-black leading-none">✓</span>}</button>`
    );
    if (body !== beforeChecks) {
      checkmarkOptions += (beforeChecks.match(/>\{n\}<\/button>/g) || []).length;
    }

    patchedMenus += 1;
    return `<div data-nmc-multi-group-menu="1" aria-multiselectable="true" className="hidden absolute${classTail}">${body}</div>`;
  });

  return { source, patchedMenus, checkmarkOptions };
}

function patchQuanLy(source) {
  if (!source.includes(MULTI_MARKER)) {
    throw new Error('Multi-group filter base patch chưa chạy trước UX patch: quan-ly/page.tsx');
  }
  if (source.includes(UX_MARKER)) {
    console.log('✓ Multi-group dropdown UX already applied: quan-ly/page.tsx');
    return source;
  }

  const stateAnchor = `  const [clbsvNameFilter, setClbsvNameFilter] = useState<string>('');`;
  if (!source.includes(stateAnchor)) {
    throw new Error('Không tìm thấy anchor clbsvNameFilter để cài click-outside handler');
  }

  const outsideHandler = `${stateAnchor}\n\n  ${UX_MARKER}\n  useEffect(() => {\n    const closeMultiGroupMenus = () => {\n      document.querySelectorAll<HTMLElement>('[data-nmc-multi-group-menu="1"]').forEach((menu) => {\n        menu.classList.add('hidden');\n      });\n    };\n\n    const handlePointerDown = (event: PointerEvent) => {\n      const target = event.target as Node | null;\n      if (!target) return;\n      document.querySelectorAll<HTMLElement>('[data-nmc-multi-group-menu="1"]').forEach((menu) => {\n        const root = menu.parentElement;\n        if (root && !root.contains(target)) menu.classList.add('hidden');\n      });\n    };\n\n    document.addEventListener('pointerdown', handlePointerDown);\n    // KPI tách hiển thị /quan-ly trong iframe. Nếu người dùng bấm ra vùng header\n    // của iframe cha, window con mất focus; đóng menu luôn để hành vi vẫn tự nhiên.\n    window.addEventListener('blur', closeMultiGroupMenus);\n    return () => {\n      document.removeEventListener('pointerdown', handlePointerDown);\n      window.removeEventListener('blur', closeMultiGroupMenus);\n    };\n  }, []);`;

  source = source.replace(stateAnchor, outsideHandler);

  const result = patchDropdownMenus(source);
  source = result.source;

  if (result.patchedMenus < 3) {
    throw new Error(`Chỉ tìm thấy ${result.patchedMenus} group dropdown(s) trong quan-ly; kỳ vọng ít nhất 3`);
  }
  if (result.checkmarkOptions < 3) {
    throw new Error(`Chỉ gắn dấu tích cho ${result.checkmarkOptions} option(s) trong quan-ly; patch có thể bị lệch anchor`);
  }
  if (!source.includes('data-nmc-multi-group-menu="1"')) {
    throw new Error('Không gắn được marker menu đa nhóm trong quan-ly');
  }
  if (!source.includes('window.addEventListener(\'blur\', closeMultiGroupMenus)')) {
    throw new Error('Click-outside/iframe blur handler chưa được cài trong quan-ly');
  }

  console.log(`✓ Multi-group UX: quan-ly ${result.patchedMenus} dropdown(s), ${result.checkmarkOptions} option checkmark(s).`);
  return source;
}

function patchSavedContest(source) {
  if (!source.includes(MULTI_MARKER)) {
    throw new Error('Multi-group filter base patch chưa chạy trước UX patch: saved-contest-inline.tsx');
  }
  if (source.includes(UX_MARKER)) {
    console.log('✓ Multi-group dropdown UX already applied: saved-contest-inline.tsx');
    return source;
  }

  // The parent /quan-ly page owns the single document-level outside-click listener.
  // Saved contests only need to mark their menu and render selected checkmarks.
  const markerAnchor = `  ${MULTI_MARKER}\n  const [nhomFilter, setNhomFilter] = useState<string[]>([]);`;
  if (!source.includes(markerAnchor)) {
    throw new Error('Không tìm thấy state multi-group trong saved-contest-inline.tsx');
  }
  source = source.replace(markerAnchor, `  ${MULTI_MARKER}\n  ${UX_MARKER}\n  const [nhomFilter, setNhomFilter] = useState<string[]>([]);`);

  const result = patchDropdownMenus(source);
  source = result.source;

  if (result.patchedMenus < 1 || result.checkmarkOptions < 1) {
    throw new Error('Không patch được dropdown/dấu tích của SavedContestInline');
  }

  console.log(`✓ Multi-group UX: SavedContestInline ${result.patchedMenus} dropdown(s), ${result.checkmarkOptions} option checkmark(s).`);
  return source;
}

for (const filePath of [quanLyPath, savedContestPath]) {
  if (!fs.existsSync(filePath)) throw new Error(`Không tìm thấy ${filePath}`);
}

const quanLyOriginal = fs.readFileSync(quanLyPath, 'utf8');
const savedContestOriginal = fs.readFileSync(savedContestPath, 'utf8');
const quanLyNewline = quanLyOriginal.includes('\r\n') ? '\r\n' : '\n';
const savedContestNewline = savedContestOriginal.includes('\r\n') ? '\r\n' : '\n';
const quanLy = patchQuanLy(quanLyOriginal.replace(/\r\n/g, '\n'));
const savedContest = patchSavedContest(savedContestOriginal.replace(/\r\n/g, '\n'));

fs.writeFileSync(quanLyPath, quanLy.replace(/\n/g, quanLyNewline), 'utf8');
fs.writeFileSync(savedContestPath, savedContest.replace(/\n/g, savedContestNewline), 'utf8');

console.log('✓ KPI linked pages: dropdown đa nhóm tự đóng khi bấm ra ngoài + có dấu ✓ cho nhóm đã chọn.');
