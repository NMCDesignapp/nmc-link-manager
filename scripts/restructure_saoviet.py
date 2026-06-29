#!/usr/bin/env python3
"""
Restructure the Sao Việt page to have sub-navigation similar to "Chính sách đại lý":
- Sao Việt menu item expands to show 3 sub-items (Cá Nhân, TN KTM, TN TD)
- Clicking a sub-item navigates to a dedicated page for that program (single table)
- Clicking "Số liệu Sao Việt" itself toggles the sub-list (desktop) / opens popup (mobile)
- Header h1 shows the current sub-item label when inside a Sao Việt sub-page
- Back button supports sub-navigation (returns to Sao Việt list, then to previous sheet)

Changes:
1. Add `saovietOpen` state (string | null) — null = list view, key = sub-page
2. Add `saovietExpanded` state (desktop sidebar expand/collapse)
3. Extend NavState with `saovietOpen` field
4. Update navigateTo() and handleAppBack() to handle saovietOpen
5. Define SAOVIET_ITEMS list (3 items)
6. Update header h1 to show Sao Việt sub-item label
7. Update sidebar (desktop): make Sao Việt expandable with sub-items
8. Update mobile menu: make Sao Việt button trigger sub-popup
9. Refactor renderSaoViet() to dispatch on saovietOpen (list view vs sub-page view)
"""

import re
from pathlib import Path

PAGE_PATH = Path('/home/z/my-project/src/app/quan-ly/page.tsx')
src = PAGE_PATH.read_text(encoding='utf-8')

# Track changes via simple assertions
def assert_count(pattern, expected_count, label):
    actual = len(re.findall(pattern, src))
    if actual != expected_count:
        raise SystemExit(f"ASSERT FAIL ({label}): expected {expected_count}, got {actual} for /{pattern}/")
    print(f"  ✓ {label}: {actual} match(es)")

print("Initial checks:")
assert_count(r"const \[policyExpanded, setPolicyExpanded\]", 1, "policyExpanded exists")
assert_count(r"const \[policyOpen, setPolicyOpen\]", 1, "policyOpen exists")
assert_count(r"type NavState =", 1, "NavState type def")
assert_count(r"const renderSaoViet = \(\) => \(", 1, "renderSaoViet exists")
assert_count(r"saovietOpen", 0, "saovietOpen not yet defined (should be 0)")

# ============================================================================
# STEP 1: Add saovietOpen, saovietExpanded states (after policyOpen declaration)
# ============================================================================
print("\n[1/8] Adding saovietOpen + saovietExpanded states...")
old_state = "  const [policyOpen, setPolicyOpen] = useState<string | null>('tvvm');"
new_state = """  const [policyOpen, setPolicyOpen] = useState<string | null>('tvvm');
  const [saovietOpen, setSaovietOpen] = useState<string | null>(null); // null = show list, key = sub-page
  const [saovietExpanded, setSaovietExpanded] = useState(false); // desktop sidebar expand/collapse"""
assert old_state in src, "policyOpen state declaration not found"
src = src.replace(old_state, new_state)
print("  ✓ Added saovietOpen + saovietExpanded state declarations")

# ============================================================================
# STEP 2: Extend NavState type with saovietOpen field
# ============================================================================
print("\n[2/8] Extending NavState type...")
old_navtype = "type NavState = { sheet: SheetKey; revenueSub?: RevenueSubKey; policyOpen?: string | null; structureSub?: StructureSubKey };"
new_navtype = "type NavState = { sheet: SheetKey; revenueSub?: RevenueSubKey; policyOpen?: string | null; structureSub?: StructureSubKey; saovietOpen?: string | null };"
assert old_navtype in src
src = src.replace(old_navtype, new_navtype)
print("  ✓ NavState type extended with saovietOpen")

# ============================================================================
# STEP 3: Update navigateTo() to handle saovietOpen
# ============================================================================
print("\n[3/8] Updating navigateTo() to handle saovietOpen...")
old_navigateTo = """  const navigateTo = useCallback((next: NavState) => {
    if (isNavigatingBackRef.current) {
      isNavigatingBackRef.current = false;
      return;
    }
    const current: NavState = {
      sheet: activeSheet,
      revenueSub,
      policyOpen,
      structureSub,
    };
    navHistoryRef.current.push(current);
    if (next.sheet !== activeSheet) setActiveSheet(next.sheet);
    if (next.revenueSub !== undefined && next.revenueSub !== revenueSub) setRevenueSub(next.revenueSub);
    if (next.policyOpen !== undefined && next.policyOpen !== policyOpen) setPolicyOpen(next.policyOpen);
    if (next.structureSub !== undefined && next.structureSub !== structureSub) setStructureSub(next.structureSub);
  }, [activeSheet, revenueSub, policyOpen, structureSub]);"""

new_navigateTo = """  const navigateTo = useCallback((next: NavState) => {
    if (isNavigatingBackRef.current) {
      isNavigatingBackRef.current = false;
      return;
    }
    const current: NavState = {
      sheet: activeSheet,
      revenueSub,
      policyOpen,
      structureSub,
      saovietOpen,
    };
    navHistoryRef.current.push(current);
    if (next.sheet !== activeSheet) setActiveSheet(next.sheet);
    if (next.revenueSub !== undefined && next.revenueSub !== revenueSub) setRevenueSub(next.revenueSub);
    if (next.policyOpen !== undefined && next.policyOpen !== policyOpen) setPolicyOpen(next.policyOpen);
    if (next.structureSub !== undefined && next.structureSub !== structureSub) setStructureSub(next.structureSub);
    if (next.saovietOpen !== undefined && next.saovietOpen !== saovietOpen) setSaovietOpen(next.saovietOpen);
  }, [activeSheet, revenueSub, policyOpen, structureSub, saovietOpen]);"""

assert old_navigateTo in src
src = src.replace(old_navigateTo, new_navigateTo)
print("  ✓ navigateTo() handles saovietOpen")

# ============================================================================
# STEP 4: Update handleAppBack() to handle saovietOpen
# ============================================================================
print("\n[4/8] Updating handleAppBack() to handle saovietOpen...")
old_back = """    navHistoryRef.current.pop();
    const prev = navHistoryRef.current[navHistoryRef.current.length - 1];
    isNavigatingBackRef.current = true;
    if (prev.sheet !== activeSheet) setActiveSheet(prev.sheet);
    if (prev.revenueSub !== undefined && prev.revenueSub !== revenueSub) setRevenueSub(prev.revenueSub);
    if (prev.policyOpen !== undefined && prev.policyOpen !== policyOpen) setPolicyOpen(prev.policyOpen);
    if (prev.structureSub !== undefined && prev.structureSub !== structureSub) setStructureSub(prev.structureSub);
  }, [activeSheet, revenueSub, policyOpen, structureSub, router]);"""

new_back = """    navHistoryRef.current.pop();
    const prev = navHistoryRef.current[navHistoryRef.current.length - 1];
    isNavigatingBackRef.current = true;
    if (prev.sheet !== activeSheet) setActiveSheet(prev.sheet);
    if (prev.revenueSub !== undefined && prev.revenueSub !== revenueSub) setRevenueSub(prev.revenueSub);
    if (prev.policyOpen !== undefined && prev.policyOpen !== policyOpen) setPolicyOpen(prev.policyOpen);
    if (prev.structureSub !== undefined && prev.structureSub !== structureSub) setStructureSub(prev.structureSub);
    if (prev.saovietOpen !== undefined && prev.saovietOpen !== saovietOpen) setSaovietOpen(prev.saovietOpen);
  }, [activeSheet, revenueSub, policyOpen, structureSub, saovietOpen, router]);"""

assert old_back in src
src = src.replace(old_back, new_back)
print("  ✓ handleAppBack() handles saovietOpen")

# ============================================================================
# STEP 5: Add SAOVIET_ITEMS definition (right before renderSaoViet)
# ============================================================================
print("\n[5/8] Adding SAOVIET_ITEMS definition...")
# Find the Sao Việt section start marker
sv_section_marker = "  // ========== RENDER SHEET DISPATCHER ==========\n  // ========== RENDER: Sao Việt (3 sub-sections) =========="
assert sv_section_marker in src, "Sao Việt section marker not found"

saoViet_items_block = """  // ========== RENDER SHEET DISPATCHER ==========
  // ========== RENDER: Sao Việt (3 sub-sections) ==========
  // Sao Việt menu expands to show 3 sub-programs (similar to Chính sách đại lý)
  // Click a sub-item → opens dedicated page for that single program
  // Click "Số liệu Sao Việt" itself → expands the sub-list (desktop) / opens popup (mobile)
  const SAOVIET_ITEMS = [
    { key: 'ca-nhan', label: 'Sao Việt Cá Nhân', desc: 'TVV — FYP cá nhân (5 hạng: Vàng/BạchKim/KimCương)', icon: UserCircle, color: '#7C3AED' },
    { key: 'tn-ktm',  label: 'Sao Việt TN KTM',  desc: 'TN — FYP cá nhân (5 hạng: Vàng/BạchKim/KimCương/Đặc biệt/Tối cao)', icon: Users, color: '#2563EB' },
    { key: 'tn-td',   label: 'Sao Việt TN TD',   desc: 'TN — FYP & HĐC của TVVm do TN tuyển (2 hạng: Vàng/BạchKim)', icon: UserPlus, color: '#059669' },
  ];
"""

src = src.replace(sv_section_marker, saoViet_items_block, 1)
print("  ✓ SAOVIET_ITEMS added")

# ============================================================================
# STEP 6: Replace renderSaoViet() body to support list-view + sub-page view
# ============================================================================
print("\n[6/8] Replacing renderSaoViet() with list+sub-page dispatcher...")

# Find the entire current renderSaoViet function block
# It starts at "  const renderSaoViet = () => (" and ends at "  );\n\n  const renderSheet = () => {"
sv_start = src.find("  const renderSaoViet = () => (")
assert sv_start > 0, "renderSaoViet function start not found"
sv_end_marker = "  );\n\n  const renderSheet = () => {"
sv_end = src.find(sv_end_marker, sv_start)
assert sv_end > 0, "renderSaoViet function end not found"

# Extract the current body (just to verify we still have the right block)
current_sv_body = src[sv_start:sv_end + len("  );")]
assert "SV1_THRESHOLDS" in current_sv_body, "Current renderSaoViet doesn't contain SV1_THRESHOLDS"
assert "SV3_RANKS" in current_sv_body, "Current renderSaoViet doesn't contain SV3_RANKS"
print(f"  Found current renderSaoViet: {len(current_sv_body)} chars")

# Build the new renderSaoViet structure:
# - Constants (SV1_THRESHOLDS, SV2_THRESHOLDS, SV3_RANKS, period filter, row builders) stay the same
# - But the final return is split into two: renderSaoVietList() and renderSaoVietSubPage(key)
# - renderSaoViet() dispatches based on saovietOpen

# Strategy: keep all the constants and row computations, but replace the return JSX
# We'll wrap them as inner functions of renderSaoViet

# Find where the "return (" of the renderSaoViet function is (after the constants)
# Look for the first occurrence of "const renderSaoViet = () => (" then the next "  return (" after that
# Actually, the constants come BEFORE the render helpers and return statement.
# Let me find the start of the render helpers section instead.

# Actually, the cleanest approach: keep ALL existing constants + helper functions,
# but change the FINAL "return (" to dispatch on saovietOpen.
# The current render is:
#   const renderSaoViet = () => (
#     <div className="space-y-4">
#       ... 3 sections ...
#     </div>
#   );
# We need to transform it into:
#   const renderSaoViet = () => {
#     if (saovietOpen === 'ca-nhan') return <Section1JSX/>;
#     if (saovietOpen === 'tn-ktm')  return <Section2JSX/>;
#     if (saovietOpen === 'tn-td')   return <Section3JSX/>;
#     return <ListViewJSX/>;
#   };

# The current code starts with arrow-return `() => (` so the JSX is one expression.
# We need to convert it to `() => {` with conditional returns.

# The simpler approach: split the existing single return into 4 helper render functions
# and replace the main renderSaoViet with a dispatcher.

# But for minimal disruption, let's just transform:
# 1. The opening: "  const renderSaoViet = () => (\n    <div className=\"space-y-4\">"  →
#    "  const renderSaoVietList = () => (\n    <div className=\"space-y-4\">"
# 2. The closing: "    </div>\n  );"  →
#    "    </div>\n  );\n\n  const renderSaoViet = () => {\n    if (saovietOpen === 'ca-nhan') return renderSaoVietCaNhan();\n    if (saovietOpen === 'tn-ktm')  return renderSaoVietTNKTM();\n    if (saovietOpen === 'tn-td')   return renderSaoVietTNTD();\n    return renderSaoVietList();\n  };"

# But we also need to extract Section 1/2/3 JSX into their own functions.
# This is getting complex. Let me use a different approach:
# Replace the entire renderSaoViet function with a new version that:
#   - Defines all the constants inside the function (same as current)
#   - Defines 4 inner render helpers (renderList, renderCaNhan, renderTNKTM, renderTNTD)
#   - Returns the appropriate one based on saovietOpen

# For minimal risk, let me KEEP the existing constants & row data,
# but inject a dispatcher at the top of renderSaoViet that conditionally returns
# one of the 4 render helpers.

# Actually, the simplest correct fix:
# Transform the single JSX expression `() => ( <div>...</div> )` into a block body
# that conditionally returns. We do this by:
# 1. Replace the list-view JSX (everything inside the original return)
# 2. Add 3 new render helpers for the sub-pages

# I'll do this in a single replacement: replace the whole renderSaoViet function block.

new_render_block = '''  const renderSaoVietList = () => (
    <div className="space-y-3">
      {/* Header card — Sao Việt period info */}
      <div className="p-4 border border-violet-500/30 rounded-lg" style={{ backgroundColor: 'rgba(124, 58, 237, 0.08)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-5 h-5 text-violet-400" />
          <h2 className="text-lg font-extrabold text-violet-300">Số liệu Sao Việt Năm 2026</h2>
        </div>
        <p className="text-sm text-violet-200/70">
          Kỳ tính thưởng: <span className="font-bold text-violet-200">01/12/2025 - 30/11/2026</span>
          <br />
          Bao gồm 3 chương trình thưởng. Chọn 1 chương trình bên dưới (hoặc từ menu bên trái) để xem chi tiết.
        </p>
      </div>
      {/* 3 program cards — click to open detail page */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SAOVIET_ITEMS.map(item => {
          const Icon = item.icon;
          const count = item.key === 'ca-nhan' ? saoVietCaNhanRows.length
                     : item.key === 'tn-ktm'  ? saoVietTNKTMRows.length
                     :                          saoVietTNTDRows.length;
          return (
            <button
              key={item.key}
              onClick={() => navigateTo({ sheet: 'saoviet', saovietOpen: item.key })}
              className="text-left p-4 border-2 rounded-lg transition-all hover:scale-[1.02] active:scale-100"
              style={{
                borderColor: `${item.color}66`,
                backgroundColor: `${item.color}11`,
                boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-10 h-10 flex items-center justify-center rounded-md flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold truncate" style={{ color: item.color }}>{item.label}</h3>
                  <p className="text-[10px] text-gray-400 truncate">{item.desc}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: `${item.color}33` }}>
                <span className="text-[10px] uppercase tracking-wider text-gray-500">Số lượng</span>
                <span className="text-lg font-black" style={{ color: item.color }}>{count}</span>
              </div>
            </button>
          );
        })}
      </div>
      {/* Footer note */}
      <div className="p-3 border border-violet-500/20 rounded-lg bg-violet-500/5">
        <p className="text-[11px] text-violet-200/80 leading-relaxed">
          <strong className="text-violet-300">Ghi chú:</strong> FYP được tính theo tháng hiệu lực hợp đồng (effectiveDate) trong kỳ 01/12/2025 - 30/11/2026.
          Nhấn vào 1 chương trình để xem chi tiết bảng xếp hạng và điều kiện đạt hạng.
        </p>
      </div>
    </div>
  );

  // ---------- Sub-page: SAO VIỆT CÁ NHÂN (Section 1) ----------
  const renderSaoVietCaNhan = () => (
    <div className="space-y-3">
      <div className="px-3 py-2 border border-violet-500/30 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'rgba(124, 58, 237, 0.08)' }}>
        <UserCircle className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-violet-300">Sao Việt Cá Nhân (TVV)</h3>
        <span className="ml-auto text-[11px] bg-violet-600/60 text-white px-2 py-0.5 rounded">{saoVietCaNhanRows.length} TVV</span>
      </div>
      <div className="overflow-x-auto bg-white border border-violet-500/20 rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-violet-700 hover:bg-violet-700 border-b border-violet-600">
              <TableHead className="text-yellow-100 text-[10px] font-bold uppercase text-center w-[40px]">STT</TableHead>
              <TableHead className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap">NHÓM KD</TableHead>
              <TableHead className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap">MÃ SỐ ĐẠI LÝ</TableHead>
              <TableHead className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap">HỌ TÊN TVV</TableHead>
              <TableHead className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap text-right">TỔNG FYP<br /><span className="font-normal text-[9px]">01/12/25 - 30/11/26</span></TableHead>
              {SV1_THRESHOLDS.map(t => (
                <TableHead
                  key={t.key}
                  className="text-[10px] font-bold uppercase text-center whitespace-nowrap p-1"
                  style={{ backgroundColor: t.bg, color: t.fg }}
                >
                  <div className="leading-tight">
                    <div>{t.label}</div>
                    <div className="font-normal text-[9px]">{t.sub.split('\\n')[0]}</div>
                    <div className="font-normal text-[9px]">{t.sub.split('\\n')[1]}</div>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {saoVietCaNhanRows.map((r, i) => (
              <TableRow key={`sv1-${r.agentCode}-${i}`} className="bg-white hover:bg-violet-50 border-b border-gray-200">
                <TableCell className="text-xs text-center p-1 text-gray-600">{i + 1}</TableCell>
                <TableCell className="text-xs p-1 text-gray-800 whitespace-nowrap">{r.nhomKD || '—'}</TableCell>
                <TableCell className="text-xs p-1 text-gray-800 whitespace-nowrap font-mono">{r.agentCode}</TableCell>
                <TableCell className="text-xs p-1 text-gray-900 font-medium whitespace-nowrap">{r.agentName}</TableCell>
                <TableCell className="text-xs p-1 text-right font-bold text-violet-700 whitespace-nowrap">{formatCurrency(r.fyp)}</TableCell>
                {SV1_THRESHOLDS.map(t => (
                  <React.Fragment key={`sv1-${r.agentCode}-${t.key}`}>
                    {renderSaoVietRankCell(r.fyp, t)}
                  </React.Fragment>
                ))}
              </TableRow>
            ))}
            {saoVietCaNhanRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-gray-500 text-sm py-8">
                  Chưa có dữ liệu TVV đạt FYP &gt; 0 trong kỳ 01/12/2025 - 30/11/2026
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  // ---------- Sub-page: SAO VIỆT TN KTM (Section 2) ----------
  const renderSaoVietTNKTM = () => (
    <div className="space-y-3">
      <div className="px-3 py-2 border border-violet-500/30 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'rgba(124, 58, 237, 0.08)' }}>
        <Users className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-violet-300">Sao Việt TN KTM (TN — FYP cá nhân)</h3>
        <span className="ml-auto text-[11px] bg-violet-600/60 text-white px-2 py-0.5 rounded">{saoVietTNKTMRows.length} TN</span>
      </div>
      <div className="overflow-x-auto bg-white border border-violet-500/20 rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-violet-700 hover:bg-violet-700 border-b border-violet-600">
              <TableHead className="text-yellow-100 text-[10px] font-bold uppercase text-center w-[40px]">STT</TableHead>
              <TableHead className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap">NHÓM KD</TableHead>
              <TableHead className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap">MS ĐẠI LÝ</TableHead>
              <TableHead className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap">HỌ TÊN TN</TableHead>
              <TableHead className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap text-right">TỔNG FYP<br /><span className="font-normal text-[9px]">01/12/25 - 30/11/26</span></TableHead>
              {SV2_THRESHOLDS.map(t => (
                <TableHead
                  key={t.key}
                  className="text-[10px] font-bold uppercase text-center whitespace-nowrap p-1"
                  style={{ backgroundColor: t.bg, color: t.fg }}
                >
                  <div className="leading-tight">
                    <div>{t.label}</div>
                    <div className="font-normal text-[9px]">{t.sub.split('\\n')[0]}</div>
                    <div className="font-normal text-[9px]">{t.sub.split('\\n')[1]}</div>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {saoVietTNKTMRows.map((r, i) => (
              <TableRow key={`sv2-${r.agentCode}-${i}`} className="bg-white hover:bg-violet-50 border-b border-gray-200">
                <TableCell className="text-xs text-center p-1 text-gray-600">{i + 1}</TableCell>
                <TableCell className="text-xs p-1 text-gray-800 whitespace-nowrap">{r.nhomKD || '—'}</TableCell>
                <TableCell className="text-xs p-1 text-gray-800 whitespace-nowrap font-mono">{r.agentCode}</TableCell>
                <TableCell className="text-xs p-1 text-gray-900 font-medium whitespace-nowrap">{r.agentName}</TableCell>
                <TableCell className="text-xs p-1 text-right font-bold text-violet-700 whitespace-nowrap">{formatCurrency(r.fyp)}</TableCell>
                {SV2_THRESHOLDS.map(t => (
                  <React.Fragment key={`sv2-${r.agentCode}-${t.key}`}>
                    {renderSaoVietRankCell(r.fyp, t)}
                  </React.Fragment>
                ))}
              </TableRow>
            ))}
            {saoVietTNKTMRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-gray-500 text-sm py-8">
                  Chưa có dữ liệu TN đạt FYP cá nhân &gt; 0 trong kỳ 01/12/2025 - 30/11/2026
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  // ---------- Sub-page: SAO VIỆT TN TD (Section 3) ----------
  const renderSaoVietTNTD = () => (
    <div className="space-y-3">
      <div className="px-3 py-2 border border-violet-500/30 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'rgba(124, 58, 237, 0.08)' }}>
        <UserPlus className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-violet-300">Sao Việt TN TD (TN — FYP &amp; HĐC của TVVm do TN tuyển)</h3>
        <span className="ml-auto text-[11px] bg-violet-600/60 text-white px-2 py-0.5 rounded">{saoVietTNTDRows.length} TN</span>
      </div>
      <div className="overflow-x-auto bg-white border border-violet-500/20 rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-violet-700 hover:bg-violet-700 border-b border-violet-600">
              <TableHead rowSpan={2} className="text-yellow-100 text-[10px] font-bold uppercase text-center align-middle w-[40px]">STT</TableHead>
              <TableHead rowSpan={2} className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap align-middle">NHÓM KD</TableHead>
              <TableHead rowSpan={2} className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap align-middle">MS ĐẠI LÝ</TableHead>
              <TableHead rowSpan={2} className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap align-middle">HỌ TÊN TN</TableHead>
              <TableHead rowSpan={2} className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap text-right align-middle">
                TỔNG FYP TVVm<br /><span className="font-normal text-[9px]">01/12/25 - 30/11/26</span>
              </TableHead>
              <TableHead rowSpan={2} className="text-yellow-100 text-[10px] font-bold uppercase whitespace-nowrap text-center align-middle">
                SL TVVm HĐC<br /><span className="font-normal text-[9px]">01/12/25 - 30/11/26</span>
              </TableHead>
              {SV3_RANKS.map(rk => (
                <TableHead
                  key={rk.key}
                  colSpan={2}
                  className="text-[10px] font-bold uppercase text-center align-middle p-1"
                  style={{ backgroundColor: rk.bg, color: rk.fg }}
                >
                  {rk.label}
                </TableHead>
              ))}
            </TableRow>
            <TableRow className="bg-violet-700 hover:bg-violet-700 border-b border-violet-600">
              {SV3_RANKS.flatMap(rk => [
                <TableHead
                  key={`${rk.key}-fyp`}
                  className="text-[9px] font-semibold text-center p-1 whitespace-nowrap"
                  style={{ backgroundColor: rk.bg, color: rk.fg }}
                >
                  {rk.subFypLabel}
                </TableHead>,
                <TableHead
                  key={`${rk.key}-hdc`}
                  className="text-[9px] font-semibold text-center p-1 whitespace-nowrap"
                  style={{ backgroundColor: rk.bg, color: rk.fg }}
                >
                  {rk.subHdcLabel}
                </TableHead>,
              ])}
            </TableRow>
          </TableHeader>
          <TableBody>
            {saoVietTNTDRows.map((r, i) => (
              <TableRow key={`sv3-${r.agentCode}-${i}`} className="bg-white hover:bg-violet-50 border-b border-gray-200">
                <TableCell className="text-xs text-center p-1 text-gray-600">{i + 1}</TableCell>
                <TableCell className="text-xs p-1 text-gray-800 whitespace-nowrap">{r.nhomKD || '—'}</TableCell>
                <TableCell className="text-xs p-1 text-gray-800 whitespace-nowrap font-mono">{r.agentCode}</TableCell>
                <TableCell className="text-xs p-1 text-gray-900 font-medium whitespace-nowrap">{r.agentName}</TableCell>
                <TableCell className="text-xs p-1 text-right font-bold text-violet-700 whitespace-nowrap">{formatCurrency(r.fypTVVm)}</TableCell>
                <TableCell className="text-xs p-1 text-center font-bold text-violet-700">{r.slTvvmHDC}<span className="text-[9px] text-gray-400 font-normal"> / {r.tvvmCount} TVVm</span></TableCell>
                {SV3_RANKS.flatMap(rk => [
                  renderSaoVietRankSubCell(r.fypTVVm >= rk.minFyp, rk.bg, rk.fg),
                  renderSaoVietRankSubCell(r.slTvvmHDC >= rk.minHdc, rk.bg, rk.fg),
                ])}
              </TableRow>
            ))}
            {saoVietTNTDRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-gray-500 text-sm py-8">
                  Chưa có dữ liệu TN có TVVm hoạt động trong kỳ 01/12/2025 - 30/11/2026
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Footer legend */}
      <div className="p-3 border border-violet-500/20 rounded-lg bg-violet-500/5">
        <p className="text-[11px] text-violet-200/80 leading-relaxed">
          <strong className="text-violet-300">Điều kiện đạt hạng:</strong> Mỗi hạng yêu cầu ĐỒNG THỜI cả 2 điều kiện (FYP TVVm ≥ mốc AND SL TVVm HĐC ≥ mốc).
          Ô ✓ = đạt điều kiện đó. Ô — = chưa đạt.
        </p>
      </div>
    </div>
  );

  const renderSaoViet = () => {
    if (saovietOpen === 'ca-nhan') return renderSaoVietCaNhan();
    if (saovietOpen === 'tn-ktm')  return renderSaoVietTNKTM();
    if (saovietOpen === 'tn-td')   return renderSaoVietTNTD();
    return renderSaoVietList();
  };'''

# Replace the entire current renderSaoViet block
src = src[:sv_start] + new_render_block + src[sv_end + len("  );"):]
print(f"  ✓ renderSaoViet replaced with dispatcher + 4 sub-render functions")

# ============================================================================
# STEP 7: Update header h1 to show Sao Việt sub-item label
# ============================================================================
print("\n[7/8] Updating header h1 to show Sao Việt sub-item label...")
old_h1 = "{activeSheet === 'report' && policyOpen ? (POLICY_ITEMS.find(i => i.key === policyOpen)?.label || 'Quản Lý Dữ Liệu') : activeSheet === 'revenue' ? 'Doanh Thu' : activeSheet === 'structure' ? (STRUCTURE_SUBS.find(s => s.key === structureSub)?.label || 'Cấu trúc') : 'Quản Lý Dữ Liệu'}"
new_h1 = "{activeSheet === 'report' && policyOpen ? (POLICY_ITEMS.find(i => i.key === policyOpen)?.label || 'Quản Lý Dữ Liệu') : activeSheet === 'saoviet' && saovietOpen ? (SAOVIET_ITEMS.find(i => i.key === saovietOpen)?.label || 'Số liệu Sao Việt') : activeSheet === 'revenue' ? 'Doanh Thu' : activeSheet === 'structure' ? (STRUCTURE_SUBS.find(s => s.key === structureSub)?.label || 'Cấu trúc') : 'Quản Lý Dữ Liệu'}"
assert old_h1 in src, "h1 header expression not found"
src = src.replace(old_h1, new_h1)
print("  ✓ Header h1 now shows Sao Việt sub-item label when applicable")

# ============================================================================
# STEP 8a: Update desktop sidebar — make Sao Việt expandable
# ============================================================================
print("\n[8a/8] Updating desktop sidebar — make Sao Việt expandable...")

# Replace the standalone Sao Việt sidebar button with an expandable section
old_sidebar_sv = """            {/* Số liệu Sao Việt — sidebar item, placed before Cài đặt area */}
            <button
              onClick={() => {
                navigateTo({ sheet: 'saoviet' });
                setSearchTerm('');
                setSortField('');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors ${
                activeSheet === 'saoviet' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40' : 'text-violet-300/70 hover:bg-violet-500/10 hover:text-violet-300'
              }`}
              title="Số liệu Sao Việt"
            >
              <Star className="w-4 h-4 flex-shrink-0" />
              <span className="truncate flex-1 text-left">Số liệu Sao Việt</span>
            </button>"""

new_sidebar_sv = """            {/* Số liệu Sao Việt — sidebar item with expandable sub-items, placed before Cài đặt area */}
            <div>
              <button
                onClick={() => {
                  if (saovietOpen) {
                    // Already on a sub-page — toggle expand
                    setSaovietExpanded(!saovietExpanded);
                  } else {
                    // Not on sub-page — go to list view + expand
                    navigateTo({ sheet: 'saoviet', saovietOpen: null });
                    setSaovietExpanded(true);
                  }
                  setSearchTerm('');
                  setSortField('');
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-colors ${
                  activeSheet === 'saoviet' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40' : 'text-violet-300/70 hover:bg-violet-500/10 hover:text-violet-300'
                }`}
                title="Số liệu Sao Việt"
              >
                <Star className="w-4 h-4 flex-shrink-0" />
                <span className="truncate flex-1 text-left">Số liệu Sao Việt</span>
                {saovietExpanded ? <ChevronDown className="w-3.5 h-3.5 text-violet-300" /> : <ChevronRight className="w-3.5 h-3.5 text-violet-300" />}
              </button>
              {saovietExpanded && (
                <div className="ml-6 mt-0.5 space-y-0.5">
                  {SAOVIET_ITEMS.map(s => {
                    const subActive = saovietOpen === s.key;
                    return (
                      <button
                        key={s.key}
                        onClick={() => {
                          navigateTo({ sheet: 'saoviet', saovietOpen: s.key });
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold rounded transition-colors ${
                          subActive ? 'bg-violet-500/20 text-violet-300' : 'text-violet-300/60 hover:bg-violet-500/10 hover:text-violet-300'
                        }`}
                      >
                        <s.icon className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate flex-1 text-left">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>"""

assert old_sidebar_sv in src, "Sao Việt sidebar button not found"
src = src.replace(old_sidebar_sv, new_sidebar_sv)
print("  ✓ Desktop sidebar: Sao Việt is now expandable with 3 sub-items")

# ============================================================================
# STEP 8b: Update mobile menu — make Sao Việt trigger sub-popup
# ============================================================================
print("\n[8b/8] Updating mobile menu — make Sao Việt trigger sub-popup...")

# Currently the mobile Sao Việt button just navigates to sheet:'saoviet'.
# We need it to navigate to list view + open the sub-popup (similar to POLICY/REVENUE/STRUCTURE).
# Easier: make the mobile Sao Việt button toggle a popup with the 3 sub-items.
# We'll reuse the mobileMenuPopup pattern but with key 'saoviet'.

# First find the mobile Sao Việt button block
old_mobile_sv = """            {/* Số liệu Sao Việt button — placed before Cài đặt */}
            <button
              onClick={() => {
                navigateTo({ sheet: 'saoviet' });
                setSearchTerm('');
                setSortField('');
                setMobileMenuPopup(null);
              }}
              className="w-full flex flex-col items-center justify-center gap-1 px-0.5 py-1 text-[11px] font-bold text-white transition-all aspect-square active:scale-90 active:brightness-75 active:shadow-inner"
              style={{
                backgroundColor: SHEET_MOBILE_COLORS.saoviet,
                borderRadius: 0,
                boxShadow: activeSheet === 'saoviet' ? `0 0 0 2px #fff, 0 3px 6px rgba(0,0,0,0.4)` : '0 3px 6px rgba(0,0,0,0.4)',
                opacity: activeSheet === 'saoviet' ? 1 : 0.95,
                minHeight: '52px',
              }}
              title="Số liệu Sao Việt"
            >
              <Star className="w-5 h-5 flex-shrink-0" />
              <span className="truncate w-full text-center leading-tight text-[11px]">Sao Việt</span>
            </button>"""

new_mobile_sv = """            {/* Số liệu Sao Việt button — placed before Cài đặt. Has sub-popup like other sheets */}
            <div className="relative">
              <button
                onClick={() => {
                  if (!activeSheet || activeSheet !== 'saoviet') {
                    navigateTo({ sheet: 'saoviet', saovietOpen: null });
                  }
                  setMobileMenuPopup(mobileMenuPopup === ('saoviet' as SheetKey) ? null : ('saoviet' as SheetKey));
                  setSearchTerm('');
                  setSortField('');
                }}
                className="w-full flex flex-col items-center justify-center gap-1 px-0.5 py-1 text-[11px] font-bold text-white transition-all aspect-square active:scale-90 active:brightness-75 active:shadow-inner"
                style={{
                  backgroundColor: SHEET_MOBILE_COLORS.saoviet,
                  borderRadius: 0,
                  boxShadow: activeSheet === 'saoviet' ? `0 0 0 2px #fff, 0 3px 6px rgba(0,0,0,0.4)` : '0 3px 6px rgba(0,0,0,0.4)',
                  opacity: activeSheet === 'saoviet' ? 1 : 0.95,
                  minHeight: '52px',
                }}
                title="Số liệu Sao Việt"
              >
                <Star className="w-5 h-5 flex-shrink-0" />
                <span className="truncate w-full text-center leading-tight text-[11px]">Sao Việt</span>
                <ChevronDown className={`w-2.5 h-2.5 flex-shrink-0 transition-transform ${mobileMenuPopup === ('saoviet' as SheetKey) ? 'rotate-180' : ''}`} />
              </button>
              {/* Popup sub-items — FIXED overlay centered, narrow on mobile, mirrors POLICY popup styling */}
              {mobileMenuPopup === ('saoviet' as SheetKey) && (
                <>
                  <div className="fixed inset-0 z-[400] bg-black/40" onClick={() => setMobileMenuPopup(null)} />
                  <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[500] bg-[#1a2332] border-2 border-violet-500/60 max-h-[60vh] w-[72vw] max-w-[280px] overflow-y-auto shadow-2xl" style={{ borderRadius: 0 }}>
                    <div className="sticky top-0 bg-violet-700 text-white text-[11px] font-bold px-2.5 py-1.5 border-b-2 border-violet-500/60 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Star className="w-3 h-3" /> Chọn chương trình
                      </span>
                      <button onClick={() => setMobileMenuPopup(null)} className="text-white/70 hover:text-white active:scale-90 transition-transform">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* "Tất cả" / List view option */}
                    <button
                      onClick={() => {
                        navigateTo({ sheet: 'saoviet', saovietOpen: null });
                        setMobileMenuPopup(null);
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 text-[11px] font-bold text-left hover:bg-violet-500/20 active:scale-95 active:bg-violet-500/30 transition-all border-b border-violet-900/40 ${!saovietOpen && activeSheet === 'saoviet' ? 'text-violet-300 bg-violet-500/10' : 'text-violet-100/80'}`}
                    >
                      <Star className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate flex-1">Tổng quan Sao Việt</span>
                      {!saovietOpen && activeSheet === 'saoviet' && <span className="text-violet-400">●</span>}
                    </button>
                    {SAOVIET_ITEMS.map(s => {
                      const subActive = activeSheet === 'saoviet' && saovietOpen === s.key;
                      return (
                        <button
                          key={s.key}
                          onClick={() => {
                            navigateTo({ sheet: 'saoviet', saovietOpen: s.key });
                            setMobileMenuPopup(null);
                          }}
                          className={`w-full flex items-center gap-2 px-2.5 py-2 text-[11px] font-bold text-left hover:bg-violet-500/20 active:scale-95 active:bg-violet-500/30 transition-all border-b border-violet-900/40 last:border-b-0 ${subActive ? 'text-violet-300 bg-violet-500/10' : 'text-violet-100/80'}`}
                        >
                          <s.icon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate flex-1">{s.label}</span>
                          {subActive && <span className="text-violet-400">●</span>}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>"""

assert old_mobile_sv in src, "Sao Việt mobile menu button not found"
src = src.replace(old_mobile_sv, new_mobile_sv)
print("  ✓ Mobile menu: Sao Việt button now opens sub-popup with 4 options (overview + 3 programs)")

# ============================================================================
# Final checks + write
# ============================================================================
print("\nFinal validation:")
# saovietOpen is referenced many times — just check > 10 (not exact)
actual = len(re.findall(r"saovietOpen", src))
assert actual >= 10, f"saovietOpen should appear >=10 times, got {actual}"
print(f"  ✓ saovietOpen references: {actual} (>= 10 OK)")
assert_count(r"saovietExpanded", 4, "saovietExpanded references")  # state + setter call + toggle (3) + 1 in sidebar
assert_count(r"SAOVIET_ITEMS", 5, "SAOVIET_ITEMS references")  # 1 def + 3 in list view (map) + 1 in mobile popup
assert_count(r"renderSaoVietList", 2, "renderSaoVietList defined + called")
assert_count(r"renderSaoVietCaNhan", 2, "renderSaoVietCaNhan defined + called")
assert_count(r"renderSaoVietTNKTM", 2, "renderSaoVietTNKTM defined + called")
assert_count(r"renderSaoVietTNTD", 2, "renderSaoVietTNTD defined + called")
assert_count(r"const renderSaoViet = \(\) => \{", 1, "renderSaoViet is now block body")
assert_count(r"'use client';", 1, "Single 'use client' (file not duplicated)")

PAGE_PATH.write_text(src, encoding='utf-8')
print(f"\n✅ Wrote updated {PAGE_PATH}")
print(f"   File size: {len(src)} chars, {src.count(chr(10))+1} lines")
