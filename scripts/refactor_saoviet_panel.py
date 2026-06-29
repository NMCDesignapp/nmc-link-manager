#!/usr/bin/env python3
"""
Refactor 3 sub-pages of Sao Việt:
  - renderSaoVietCaNhan (program='ca-nhan')
  - renderSaoVietTNKTM  (program='tn-ktm')
  - renderSaoVietTNTD   (program='tn-td')

For each:
  1) Compute `mergedRows` = manual data (saovietManualData[program]) if non-empty, else computed rows
  2) Insert `renderSaovietPanel(program)` UI panel at top
  3) Render `mergedRows` instead of computed rows (count + table body)
  4) Show small badge indicating data source (manual / auto-computed)

Also add a new helper `renderSaovietPanel(program)` just before renderSaoVietCaNhan.
"""

import re
from pathlib import Path

PAGE = Path('/home/z/my-project/src/app/quan-ly/page.tsx')
src = PAGE.read_text()

# ---------------------------------------------------------------------------
# 1) Insert helper `renderSaovietPanel(program)` right BEFORE renderSaoVietCaNhan
# ---------------------------------------------------------------------------
PANEL_HELPER = '''  // ---------- Helper: panel đồng bộ + upload (dùng chung cho 3 sub-page) ----------
  // program: 'ca-nhan' | 'tn-ktm' | 'tn-td'
  // UI: input link + nút đồng bộ + nút upload + nút xóa (nếu có data manual)
  const renderSaovietPanel = (program: string) => {
    const link = saovietLinks[program] || '';
    const isSyncing = !!saovietSyncing[program];
    const isUploading = !!saovietUploading[program];
    const manualCount = (saovietManualData[program] || []).length;
    return (
      <div className="p-3 border border-violet-500/30 rounded-lg" style={{ backgroundColor: 'rgba(124, 58, 237, 0.05)' }}>
        <div className="flex items-center gap-2 mb-2">
          <RefreshCw className="w-3.5 h-3.5 text-violet-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-violet-300">Đồng bộ & Upload số liệu</h4>
          {manualCount > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" /> {manualCount} dòng (từ upload/sync)
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* Left col: link input + sync button */}
          <div className="space-y-1">
            <Label className="text-[10px] text-violet-200/70">Link Google Sheets (CSV)</Label>
            <div className="flex items-center gap-1">
              <Input
                defaultValue={link}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="h-7 text-[11px] bg-white border-violet-500/30 text-gray-800 placeholder-gray-400 flex-1"
                onBlur={(e) => saveSaovietLink(program, e.target.value.trim())}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              />
              {link && (
                <a href={link} target="_blank" rel="noopener noreferrer" className="text-violet-500 hover:text-violet-700 flex-shrink-0" title="Mở link">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={isSyncing || !link}
              onClick={() => handleSaovietSync(program)}
              className="h-7 text-[11px] w-full bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-700 disabled:opacity-50"
            >
              {isSyncing
                ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Đang đồng bộ...</>
                : <><RefreshCw className="w-3 h-3 mr-1" /> Đồng bộ từ link</>}
            </Button>
          </div>
          {/* Right col: upload + clear */}
          <div className="space-y-1">
            <Label className="text-[10px] text-violet-200/70">Upload file Excel/CSV (xóa hết &amp; up lại)</Label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              id={`saoviet-upload-${program}`}
              onChange={(e) => handleSaovietUpload(program, e)}
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={isUploading}
              onClick={() => document.getElementById(`saoviet-upload-${program}`)?.click()}
              className="h-7 text-[11px] w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-700 disabled:opacity-50"
            >
              {isUploading
                ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Đang upload...</>
                : <><Upload className="w-3 h-3 mr-1" /> Chọn file upload</>}
            </Button>
            {manualCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSaovietClear(program)}
                className="h-7 text-[11px] w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600"
              >
                <Trash2 className="w-3 h-3 mr-1" /> Xóa dữ liệu thủ công
              </Button>
            )}
          </div>
        </div>
        {manualCount > 0 && (
          <p className="text-[10px] text-violet-600/80 mt-2 leading-relaxed">
            <strong>Lưu ý:</strong> Đang hiển thị <strong>{manualCount} dòng</strong> từ dữ liệu upload/sync.
            Toàn bộ dữ liệu cũ của mục này đã bị xóa khi upload. Nhấn "Xóa dữ liệu thủ công" để trở về chế độ tự tính từ Hợp đồng.
          </p>
        )}
      </div>
    );
  };

  // ---------- Sub-page: SAO VIỆT CÁ NHÂN (Section 1) ----------'''

# Find the existing comment line "// ---------- Sub-page: SAO VIỆT CÁ NHÂN (Section 1) ----------"
old_marker = '  // ---------- Sub-page: SAO VIỆT CÁ NHÂN (Section 1) ----------'
assert old_marker in src, 'Cannot find Section 1 marker'
src = src.replace(old_marker, PANEL_HELPER, 1)

# ---------------------------------------------------------------------------
# 2) Patch renderSaoVietCaNhan — compute mergedRows + use it + insert panel
# ---------------------------------------------------------------------------
# Current signature: const renderSaoVietCaNhan = () => (
# Need to convert to: const renderSaoVietCaNhan = () => {
#   const mergedRows = (saovietManualData['ca-nhan'] || []).length > 0
#     ? (saovietManualData['ca-nhan'] || []).map(r => ({ agentCode: r.agentCode || '', agentName: r.agentName || '', nhomKD: r.nhomKD || '', fyp: r.fyp || 0 })).filter(r => r.fyp > 0).sort((a,b) => b.fyp - a.fyp)
#     : saoVietCaNhanRows;
#   return (
#     <> ... panel ... <div className="space-y-3"> ... </div> </>
#   );
# }

# Replace the header div + span count to use mergedRows
old_canhan_start = '''  const renderSaoVietCaNhan = () => (
    <div className="space-y-3">
      <div className="px-3 py-2 border border-violet-500/30 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'rgba(124, 58, 237, 0.08)' }}>
        <UserCircle className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-violet-300">Sao Việt Cá Nhân (TVV)</h3>
        <span className="ml-auto text-[11px] bg-violet-600/60 text-white px-2 py-0.5 rounded">{saoVietCaNhanRows.length} TVV</span>
      </div>'''

new_canhan_start = '''  const renderSaoVietCaNhan = () => {
    // Ưu tiên data manual (upload/sync) nếu có, ngược lại dùng data tính từ Hợp đồng
    const mergedRows = (saovietManualData['ca-nhan'] || []).length > 0
      ? (saovietManualData['ca-nhan'] || [])
          .map(r => ({ agentCode: r.agentCode || '', agentName: r.agentName || '', nhomKD: r.nhomKD || '', fyp: Number(r.fyp) || 0 }))
          .filter(r => r.fyp > 0)
          .sort((a, b) => b.fyp - a.fyp)
      : saoVietCaNhanRows;
    return (
    <>
      {renderSaovietPanel('ca-nhan')}
      <div className="space-y-3">
      <div className="px-3 py-2 border border-violet-500/30 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'rgba(124, 58, 237, 0.08)' }}>
        <UserCircle className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-violet-300">Sao Việt Cá Nhân (TVV)</h3>
        <span className="ml-auto text-[11px] bg-violet-600/60 text-white px-2 py-0.5 rounded">{mergedRows.length} TVV</span>
      </div>'''

assert old_canhan_start in src, 'Cannot find renderSaoVietCaNhan start'
src = src.replace(old_canhan_start, new_canhan_start, 1)

# Replace body iteration: saoVietCaNhanRows.map → mergedRows.map
old_canhan_body = '''            {saoVietCaNhanRows.map((r, i) => (
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
            {saoVietCaNhanRows.length === 0 && ('''
new_canhan_body = '''            {mergedRows.map((r, i) => (
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
            {mergedRows.length === 0 && ('''
assert old_canhan_body in src, 'Cannot find renderSaoVietCaNhan body'
src = src.replace(old_canhan_body, new_canhan_body, 1)

# Close renderSaoVietCaNhan: replace last `  );` with `  </>\n  );\n  };`
# Find the closing of renderSaoVietCaNhan — after the Table close `</div>\n  );\n\n  // ---------- Sub-page: SAO VIỆT TN KTM
old_canhan_end = '''          </TableBody>
        </Table>
      </div>
    </div>
  );

  // ---------- Sub-page: SAO VIỆT TN KTM (Section 2) ----------'''
new_canhan_end = '''          </TableBody>
        </Table>
      </div>
    </div>
    </>
  );
  };

  // ---------- Sub-page: SAO VIỆT TN KTM (Section 2) ----------'''
assert old_canhan_end in src, 'Cannot find renderSaoVietCaNhan end'
src = src.replace(old_canhan_end, new_canhan_end, 1)

# ---------------------------------------------------------------------------
# 3) Patch renderSaoVietTNKTM — same pattern
# ---------------------------------------------------------------------------
old_tnktm_start = '''  const renderSaoVietTNKTM = () => (
    <div className="space-y-3">
      <div className="px-3 py-2 border border-violet-500/30 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'rgba(124, 58, 237, 0.08)' }}>
        <Users className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-violet-300">Sao Việt TN KTM (TN — FYP cá nhân)</h3>
        <span className="ml-auto text-[11px] bg-violet-600/60 text-white px-2 py-0.5 rounded">{saoVietTNKTMRows.length} TN</span>
      </div>'''
new_tnktm_start = '''  const renderSaoVietTNKTM = () => {
    const mergedRows = (saovietManualData['tn-ktm'] || []).length > 0
      ? (saovietManualData['tn-ktm'] || [])
          .map(r => ({ agentCode: r.agentCode || '', agentName: r.agentName || '', nhomKD: r.nhomKD || '', fyp: Number(r.fyp) || 0 }))
          .filter(r => r.fyp > 0)
          .sort((a, b) => b.fyp - a.fyp)
      : saoVietTNKTMRows;
    return (
    <>
      {renderSaovietPanel('tn-ktm')}
      <div className="space-y-3">
      <div className="px-3 py-2 border border-violet-500/30 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'rgba(124, 58, 237, 0.08)' }}>
        <Users className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-violet-300">Sao Việt TN KTM (TN — FYP cá nhân)</h3>
        <span className="ml-auto text-[11px] bg-violet-600/60 text-white px-2 py-0.5 rounded">{mergedRows.length} TN</span>
      </div>'''
assert old_tnktm_start in src, 'Cannot find renderSaoVietTNKTM start'
src = src.replace(old_tnktm_start, new_tnktm_start, 1)

old_tnktm_body = '''            {saoVietTNKTMRows.map((r, i) => (
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
            {saoVietTNKTMRows.length === 0 && ('''
new_tnktm_body = '''            {mergedRows.map((r, i) => (
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
            {mergedRows.length === 0 && ('''
assert old_tnktm_body in src, 'Cannot find renderSaoVietTNKTM body'
src = src.replace(old_tnktm_body, new_tnktm_body, 1)

old_tnktm_end = '''          </TableBody>
        </Table>
      </div>
    </div>
  );

  // ---------- Sub-page: SAO VIỆT TN TD (Section 3) ----------'''
new_tnktm_end = '''          </TableBody>
        </Table>
      </div>
    </div>
    </>
  );
  };

  // ---------- Sub-page: SAO VIỆT TN TD (Section 3) ----------'''
assert old_tnktm_end in src, 'Cannot find renderSaoVietTNKTM end'
src = src.replace(old_tnktm_end, new_tnktm_end, 1)

# ---------------------------------------------------------------------------
# 4) Patch renderSaoVietTNTD — same pattern but tn-td has different fields
# ---------------------------------------------------------------------------
old_tntd_start = '''  const renderSaoVietTNTD = () => (
    <div className="space-y-3">
      <div className="px-3 py-2 border border-violet-500/30 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'rgba(124, 58, 237, 0.08)' }}>
        <UserPlus className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-violet-300">Sao Việt TN TD (TN — FYP &amp; HĐC của TVVm do TN tuyển)</h3>
        <span className="ml-auto text-[11px] bg-violet-600/60 text-white px-2 py-0.5 rounded">{saoVietTNTDRows.length} TN</span>
      </div>'''
new_tntd_start = '''  const renderSaoVietTNTD = () => {
    const mergedRows = (saovietManualData['tn-td'] || []).length > 0
      ? (saovietManualData['tn-td'] || [])
          .map(r => ({
            agentCode: r.agentCode || '',
            agentName: r.agentName || '',
            nhomKD: r.nhomKD || '',
            fypTVVm: Number(r.fypTVVm) || 0,
            slTvvmHDC: Number(r.slTvvmHDC) || 0,
            tvvmCount: Number(r.tvvmCount) || 0,
          }))
          .filter(r => r.fypTVVm > 0 || r.slTvvmHDC > 0)
          .sort((a, b) => b.fypTVVm - a.fypTVVm)
      : saoVietTNTDRows;
    return (
    <>
      {renderSaovietPanel('tn-td')}
      <div className="space-y-3">
      <div className="px-3 py-2 border border-violet-500/30 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'rgba(124, 58, 237, 0.08)' }}>
        <UserPlus className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-violet-300">Sao Việt TN TD (TN — FYP &amp; HĐC của TVVm do TN tuyển)</h3>
        <span className="ml-auto text-[11px] bg-violet-600/60 text-white px-2 py-0.5 rounded">{mergedRows.length} TN</span>
      </div>'''
assert old_tntd_start in src, 'Cannot find renderSaoVietTNTD start'
src = src.replace(old_tntd_start, new_tntd_start, 1)

old_tntd_body = '''            {saoVietTNTDRows.map((r, i) => (
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
            {saoVietTNTDRows.length === 0 && ('''
new_tntd_body = '''            {mergedRows.map((r, i) => (
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
            {mergedRows.length === 0 && ('''
assert old_tntd_body in src, 'Cannot find renderSaoVietTNTD body'
src = src.replace(old_tntd_body, new_tntd_body, 1)

old_tntd_end = '''          </TableBody>
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

  const renderSaoViet = () => {'''
new_tntd_end = '''          </TableBody>
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
    </>
  );
  };

  const renderSaoViet = () => {'''
assert old_tntd_end in src, 'Cannot find renderSaoVietTNTD end'
src = src.replace(old_tntd_end, new_tntd_end, 1)

# Write back
PAGE.write_text(src)
print('OK — patched 3 sub-pages + added renderSaovietPanel helper')
print(f'New file size: {len(src)} chars, {src.count(chr(10))} lines')
