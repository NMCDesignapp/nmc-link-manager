#!/usr/bin/env python3
"""Apply v5 changes to KPI page:
1. Label 'Lượt HĐ' → 'Lượt'
2. Summary stat colors more distinct
3. AD progress: circular SVG (no card size change)
4. Phong progress: full width + darker unfilled portion
5. Glow 100%: gold → light green + smoother animation
6. AD KH sub smaller (8px → 7px)
7. Phong AFYP/KH: trđ → đ (full)
8. Banca-PA: only AFYP + only Lượt + HĐC stats
"""
import re

PATH = '/home/z/my-project/src/app/kpi/page.tsx'

with open(PATH, 'r', encoding='utf-8') as f:
    src = f.read()

orig = src

# ============================================================
# 1. CSS: Phong progress full width + darker unfilled
# ============================================================
old_prog = '.kpi-app .rg-prog { width: 100%; height: 7px; border-radius: 99px; overflow: hidden; background: #d8e2ee; margin: 0 16px 10px; width: calc(100% - 32px); }'
new_prog = '.kpi-app .rg-prog { width: 100%; height: 8px; border-radius: 0; overflow: hidden; background: #4a6080; margin: 0 0 10px; }'
assert old_prog in src, "rg-prog CSS not found"
src = src.replace(old_prog, new_prog)

# ============================================================
# 2. CSS: Glow card 100% — change gold → light green + smoother anim
# ============================================================
old_glow_card = '''.kpi-app .rg-card.glow-full {
  box-shadow: 0 0 0 2px #f2d38d6b, 0 16px 36px rgba(10,30,60,.28), 0 0 28px #f2d38d99, 0 0 60px #f2d38d44;
  border-color: #f2d38d;
  animation: rgGlowPulse 2.4s ease-in-out infinite;
}
@keyframes rgGlowPulse {
  0%, 100% { box-shadow: 0 0 0 2px #f2d38d6b, 0 16px 36px rgba(10,30,60,.28), 0 0 24px #f2d38d99, 0 0 50px #f2d38d33; }
  50% { box-shadow: 0 0 0 3px #f2d38da8, 0 16px 36px rgba(10,30,60,.28), 0 0 36px #f2d38dcc, 0 0 72px #f2d38d55; }
}
.kpi-app .rg-card.glow-full .rg-head {
  background: linear-gradient(135deg, #d4a020 0%, #b08018 100%) !important;
  text-shadow: 0 0 12px #ffe07066;
}
.kpi-app .rg-card.is-banca.glow-full .rg-head {
  background: linear-gradient(135deg, #d4a020 0%, #b08018 100%) !important;
}'''

new_glow_card = '''.kpi-app .rg-card.glow-full {
  box-shadow: 0 0 0 2px #86efacaa, 0 16px 36px rgba(10,30,60,.28), 0 0 28px #86efac99, 0 0 60px #86efac44;
  border-color: #86efac;
  animation: rgGlowPulse 3s ease-in-out infinite;
}
@keyframes rgGlowPulse {
  0%, 100% { box-shadow: 0 0 0 2px #86efacaa, 0 16px 36px rgba(10,30,60,.28), 0 0 22px #86efac88, 0 0 48px #86efac33; }
  50% { box-shadow: 0 0 0 3px #4ade80cc, 0 16px 36px rgba(10,30,60,.28), 0 0 36px #4ade80aa, 0 0 72px #4ade8055; }
}
.kpi-app .rg-card.glow-full .rg-head {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%) !important;
  text-shadow: 0 0 12px #86efac66;
}
.kpi-app .rg-card.is-banca.glow-full .rg-head {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%) !important;
}'''
assert old_glow_card in src, "glow card CSS not found"
src = src.replace(old_glow_card, new_glow_card)

# ============================================================
# 3. CSS: AD row glow — gold → light green
# ============================================================
old_ad_glow = '''.kpi-app .rg-ad-table tbody tr.rg-ad-glow {
  background: linear-gradient(90deg, #fef9e7 0%, #fff5d6 50%, #fef9e7 100%) !important;
  box-shadow: inset 0 0 0 1px #f2d38d99, inset 0 0 12px #f2d38d33;
  animation: rgAdGlowPulse 2.4s ease-in-out infinite;
}
@keyframes rgAdGlowPulse {
  0%, 100% { box-shadow: inset 0 0 0 1px #f2d38d99, inset 0 0 10px #f2d38d22; }
  50% { box-shadow: inset 0 0 0 2px #f2d38dcc, inset 0 0 16px #f2d38d44; }
}
.kpi-app .rg-ad-table tbody tr.rg-ad-glow td { color: #8a5a10 !important; font-weight: 900; }
.kpi-app .rg-ad-table tbody tr.rg-ad-glow .rg-ad-name { color: #6a4010 !important; text-shadow: 0 0 8px #f2d38d44; }
.kpi-app .rg-ad-table tbody tr.rg-ad-glow .rg-ad-sub { color: #a08040 !important; }
.kpi-app .rg-ad-table tbody tr.rg-ad-glow .rg-ad-afyp { color: #8a5a10 !important; }'''

new_ad_glow = '''.kpi-app .rg-ad-table tbody tr.rg-ad-glow {
  background: linear-gradient(90deg, #ecfdf5 0%, #d1fae5 50%, #ecfdf5 100%) !important;
  box-shadow: inset 0 0 0 1px #4ade80aa, inset 0 0 12px #4ade8033;
  animation: rgAdGlowPulse 3s ease-in-out infinite;
}
@keyframes rgAdGlowPulse {
  0%, 100% { box-shadow: inset 0 0 0 1px #4ade80aa, inset 0 0 10px #4ade8022; }
  50% { box-shadow: inset 0 0 0 2px #16a34acc, inset 0 0 18px #4ade8055; }
}
.kpi-app .rg-ad-table tbody tr.rg-ad-glow td { color: #166534 !important; font-weight: 900; }
.kpi-app .rg-ad-table tbody tr.rg-ad-glow .rg-ad-name { color: #14532d !important; text-shadow: 0 0 8px #4ade8044; }
.kpi-app .rg-ad-table tbody tr.rg-ad-glow .rg-ad-sub { color: #4a7c5a !important; }
.kpi-app .rg-ad-table tbody tr.rg-ad-glow .rg-ad-afyp { color: #166534 !important; }'''
assert old_ad_glow in src, "AD glow CSS not found"
src = src.replace(old_ad_glow, new_ad_glow)

# ============================================================
# 4. CSS: AD KH sub smaller (8px → 7px)
# ============================================================
old_ad_sub = '.kpi-app .rg-ad-sub { font-size: 8px; color: #9aa8be; font-weight: 600; white-space: nowrap; }'
new_ad_sub = '.kpi-app .rg-ad-sub { font-size: 7px; color: #9aa8be; font-weight: 600; white-space: nowrap; opacity: 0.85; }'
assert old_ad_sub in src, "AD sub CSS not found"
src = src.replace(old_ad_sub, new_ad_sub)

# ============================================================
# 5. CSS: Summary values colors more distinct (brighter + saturated)
# ============================================================
old_sum_colors = '''.kpi-app .rg-sum-val.hd { color: #1e6cb8; }
.kpi-app .rg-sum-val.td { color: #6a4ab8; }
.kpi-app .rg-sum-val.chuan { color: #1a8a9a; }
.kpi-app .rg-sum-val.ip { color: #b87818; }'''
new_sum_colors = '''.kpi-app .rg-sum-val.hd { color: #2563eb; }
.kpi-app .rg-sum-val.td { color: #9333ea; }
.kpi-app .rg-sum-val.chuan { color: #0891b2; }
.kpi-app .rg-sum-val.ip { color: #ea580c; }'''
assert old_sum_colors in src, "summary colors CSS not found"
src = src.replace(old_sum_colors, new_sum_colors)

# ============================================================
# 6. CSS: Add circular AD progress styles (replace mini-prog)
# ============================================================
# Add new CSS for circular SVG after the existing mini-prog CSS
old_mini_prog = '''.kpi-app .rg-ad-mini-prog { width: 44px; height: 5px; border-radius: 99px; background: #e0e8f0; display: inline-block; vertical-align: middle; overflow: hidden; }
.kpi-app .rg-ad-mini-prog-fill { height: 100%; border-radius: inherit; transition: width .8s cubic-bezier(.22,1,.36,1); }
.kpi-app .rg-ad-empty { padding: 14px 10px; text-align: center; font-size: 10px; color: #8aa0b8; font-style: italic; }'''

new_mini_prog = '''.kpi-app .rg-ad-mini-prog { width: 44px; height: 5px; border-radius: 99px; background: #e0e8f0; display: inline-block; vertical-align: middle; overflow: hidden; }
.kpi-app .rg-ad-mini-prog-fill { height: 100%; border-radius: inherit; transition: width .8s cubic-bezier(.22,1,.36,1); }
.kpi-app .rg-ad-empty { padding: 14px 10px; text-align: center; font-size: 10px; color: #8aa0b8; font-style: italic; }

/* Circular progress for AD row */
.kpi-app .rg-ad-circle { display: inline-block; vertical-align: middle; }
.kpi-app .rg-ad-circle-bg { fill: none; stroke: #e0e8f0; stroke-width: 3; }
.kpi-app .rg-ad-circle-fg { fill: none; stroke-width: 3; stroke-linecap: round; transition: stroke-dashoffset 1s cubic-bezier(.22,1,.36,1), stroke 0.4s ease; }
.kpi-app .rg-ad-circle-text { font-size: 9px; font-weight: 900; fill: #1a4a7a; text-anchor: middle; dominant-baseline: central; }
.kpi-app .rg-ad-circle-text.green { fill: #166534; }
.kpi-app .rg-ad-circle-text.gold { fill: #b45309; }
.kpi-app .rg-ad-circle-text.red { fill: #b91c1c; }'''
assert old_mini_prog in src, "mini-prog CSS not found"
src = src.replace(old_mini_prog, new_mini_prog)

# ============================================================
# 7. JSX: Change "Lượt HĐ" → "Lượt" in summary cells (4 occurrences: 2 mobile + 2 desktop)
# ============================================================
src = src.replace(
    '<div className="rg-sum-label">Lượt HĐ</div>',
    '<div className="rg-sum-label">Lượt</div>'
)

# ============================================================
# 8. JSX: Phong AFYP/KH change from trđ to đ (full value)
# ============================================================
# Mobile: pAfypTrd → phong.afyp, pKhTrd → phong.kh
src = src.replace(
    '<span className="rg-afyp"><AnimNum value={pAfypTrd} /><span className="rg-afyp-unit">trđ</span></span>',
    '<span className="rg-afyp"><AnimNum value={phong.afyp} /><span className="rg-afyp-unit">đ</span></span>'
)
src = src.replace(
    '<span className="rg-kh">KH: {fmt(pKhTrd)} trđ</span>',
    '<span className="rg-kh">KH: {fmt(phong.kh)} đ</span>'
)
# Desktop: afypTrd → phong.afyp, khTrd → phong.kh
src = src.replace(
    '<span className="rg-afyp"><AnimNum value={afypTrd} /><span className="rg-afyp-unit">trđ</span></span>',
    '<span className="rg-afyp"><AnimNum value={phong.afyp} /><span className="rg-afyp-unit">đ</span></span>'
)
src = src.replace(
    '<span className="rg-kh">KH: {fmt(khTrd)} trđ</span>',
    '<span className="rg-kh">KH: {fmt(phong.kh)} đ</span>'
)

# ============================================================
# 9. JSX: AD progress replace mini-prog with circular SVG
# ============================================================
# Common SVG template (used in both mobile + desktop AD rows)
# Original block (mobile):
old_ad_prog_mobile = '''<td className="rg-ad-prog-cell">
                                      <div className="rg-ad-prog-wrap">
                                        <span className="rg-ad-mini-prog"><span className="rg-ad-mini-prog-fill" style={{ width: `${aCp}%`, background: `linear-gradient(90deg,${aProgStart},${aProgEnd})` }} /></span>
                                        <span className={`rg-ad-pct-on-prog ${aPctCls}`}>{Math.round(aPct)}%</span>
                                      </div>
                                    </td>'''

new_ad_prog_mobile = '''<td className="rg-ad-prog-cell">
                                      <svg width="32" height="32" viewBox="0 0 32 32" className="rg-ad-circle">
                                        <circle cx="16" cy="16" r="13" className="rg-ad-circle-bg" />
                                        <circle cx="16" cy="16" r="13" className="rg-ad-circle-fg"
                                          stroke={progressColor(aPct)}
                                          strokeDasharray={2 * Math.PI * 13}
                                          strokeDashoffset={2 * Math.PI * 13 - (Math.min(aPct, 100) / 100) * 2 * Math.PI * 13}
                                          transform="rotate(-90 16 16)" />
                                        <text x="16" y="16" className={`rg-ad-circle-text ${aPctCls}`}>{Math.round(aPct)}%</text>
                                      </svg>
                                    </td>'''
assert old_ad_prog_mobile in src, "AD prog mobile JSX not found"
src = src.replace(old_ad_prog_mobile, new_ad_prog_mobile)

# Desktop version (similar but with different indentation)
old_ad_prog_desktop = '''<td className="rg-ad-prog-cell">
                                            <div className="rg-ad-prog-wrap">
                                              <span className="rg-ad-mini-prog"><span className="rg-ad-mini-prog-fill" style={{ width: `${aCp}%`, background: `linear-gradient(90deg,${aProgStart},${aProgEnd})` }} /></span>
                                              <span className={`rg-ad-pct-on-prog ${aPctCls}`}>{Math.round(aPct)}%</span>
                                            </div>
                                          </td>'''

new_ad_prog_desktop = '''<td className="rg-ad-prog-cell">
                                            <svg width="34" height="34" viewBox="0 0 32 32" className="rg-ad-circle">
                                              <circle cx="16" cy="16" r="13" className="rg-ad-circle-bg" />
                                              <circle cx="16" cy="16" r="13" className="rg-ad-circle-fg"
                                                stroke={progressColor(aPct)}
                                                strokeDasharray={2 * Math.PI * 13}
                                                strokeDashoffset={2 * Math.PI * 13 - (Math.min(aPct, 100) / 100) * 2 * Math.PI * 13}
                                                transform="rotate(-90 16 16)" />
                                              <text x="16" y="16" className={`rg-ad-circle-text ${aPctCls}`}>{Math.round(aPct)}%</text>
                                            </svg>
                                          </td>'''
assert old_ad_prog_desktop in src, "AD prog desktop JSX not found"
src = src.replace(old_ad_prog_desktop, new_ad_prog_desktop)

# ============================================================
# 10. JSX: Banca-PA summary — only show Lượt + HĐC when noAds
# ============================================================
# Mobile summary block:
old_summary_mobile = '''<div className="rg-summary">
                        <div className="rg-sum-cell">
                          <div className="rg-sum-label">Lượt</div>
                          <div className="rg-sum-val hd"><AnimNum value={phong.lhd} /></div>
                        </div>
                        <div className="rg-sum-cell">
                          <div className="rg-sum-label">Tuyển dụng</div>
                          <div className="rg-sum-val td"><AnimNum value={phong.td} /></div>
                        </div>
                        <div className="rg-sum-cell">
                          <div className="rg-sum-label">HĐ chuẩn</div>
                          <div className="rg-sum-val chuan"><AnimNum value={phong.hdChuan} /></div>
                        </div>
                        <div className="rg-sum-cell">
                          <div className="rg-sum-label">Tỷ trọng IP</div>
                          <div className="rg-sum-val ip">{fmtTyTrong(phong.tyTrong)}</div>
                        </div>
                      </div>'''

new_summary_mobile = '''<div className={`rg-summary${phong.noAds ? ' rg-summary-2col' : ''}`}>
                        <div className="rg-sum-cell">
                          <div className="rg-sum-label">Lượt</div>
                          <div className="rg-sum-val hd"><AnimNum value={phong.lhd} /></div>
                        </div>
                        {!phong.noAds && (
                        <div className="rg-sum-cell">
                          <div className="rg-sum-label">Tuyển dụng</div>
                          <div className="rg-sum-val td"><AnimNum value={phong.td} /></div>
                        </div>
                        )}
                        <div className="rg-sum-cell">
                          <div className="rg-sum-label">HĐ chuẩn</div>
                          <div className="rg-sum-val chuan"><AnimNum value={phong.hdChuan} /></div>
                        </div>
                        {!phong.noAds && (
                        <div className="rg-sum-cell">
                          <div className="rg-sum-label">Tỷ trọng IP</div>
                          <div className="rg-sum-val ip">{fmtTyTrong(phong.tyTrong)}</div>
                        </div>
                        )}
                      </div>'''
assert old_summary_mobile in src, "summary mobile JSX not found"
src = src.replace(old_summary_mobile, new_summary_mobile)

# Desktop summary block:
old_summary_desktop = '''<div className="rg-summary">
                              <div className="rg-sum-cell">
                                <div className="rg-sum-label">Lượt</div>
                                <div className="rg-sum-val hd"><AnimNum value={phong.lhd} /></div>
                              </div>
                              <div className="rg-sum-cell">
                                <div className="rg-sum-label">Tuyển dụng</div>
                                <div className="rg-sum-val td"><AnimNum value={phong.td} /></div>
                              </div>
                              <div className="rg-sum-cell">
                                <div className="rg-sum-label">HĐ chuẩn</div>
                                <div className="rg-sum-val chuan"><AnimNum value={phong.hdChuan} /></div>
                              </div>
                              <div className="rg-sum-cell">
                                <div className="rg-sum-label">Tỷ trọng IP</div>
                                <div className="rg-sum-val ip">{fmtTyTrong(phong.tyTrong)}</div>
                              </div>
                            </div>'''

new_summary_desktop = '''<div className={`rg-summary${phong.noAds ? ' rg-summary-2col' : ''}`}>
                              <div className="rg-sum-cell">
                                <div className="rg-sum-label">Lượt</div>
                                <div className="rg-sum-val hd"><AnimNum value={phong.lhd} /></div>
                              </div>
                              {!phong.noAds && (
                              <div className="rg-sum-cell">
                                <div className="rg-sum-label">Tuyển dụng</div>
                                <div className="rg-sum-val td"><AnimNum value={phong.td} /></div>
                              </div>
                              )}
                              <div className="rg-sum-cell">
                                <div className="rg-sum-label">HĐ chuẩn</div>
                                <div className="rg-sum-val chuan"><AnimNum value={phong.hdChuan} /></div>
                              </div>
                              {!phong.noAds && (
                              <div className="rg-sum-cell">
                                <div className="rg-sum-label">Tỷ trọng IP</div>
                                <div className="rg-sum-val ip">{fmtTyTrong(phong.tyTrong)}</div>
                              </div>
                              )}
                            </div>'''
assert old_summary_desktop in src, "summary desktop JSX not found"
src = src.replace(old_summary_desktop, new_summary_desktop)

# Add CSS for 2-col summary
old_sep_css = '''/* Thin separator between summary and AD table */
.kpi-app .rg-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #b8cae0 20%, #b8cae0 80%, transparent 100%);
  margin: 0 12px;
}'''

new_sep_css = '''/* Thin separator between summary and AD table */
.kpi-app .rg-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #b8cae0 20%, #b8cae0 80%, transparent 100%);
  margin: 0 12px;
}

/* Banca-PA summary: only 2 columns (Lượt + HĐC) */
.kpi-app .rg-summary.rg-summary-2col {
  grid-template-columns: repeat(2, 1fr);
}'''
assert old_sep_css in src, "separator CSS not found"
src = src.replace(old_sep_css, new_sep_css)

# ============================================================
# Write changes
# ============================================================
if src != orig:
    with open(PATH, 'w', encoding='utf-8') as f:
        f.write(src)
    print(f"OK — changes applied to {PATH}")
else:
    print("WARN — no changes made")
