#!/usr/bin/env python3
"""Redesign KPI region section (mobile + desktop) with cleaner table-style + lighter phong card."""

import re
from pathlib import Path

PAGE = Path('/home/z/my-project/src/app/kpi/page.tsx')
src = PAGE.read_text(encoding='utf-8')

# ==================== 1. ADD NEW CSS ====================
# Insert new CSS block after line 206 (.dept-section { ... })
NEW_CSS = '''
/* === REDESIGN: Region card (sáng hơn, nổi khối) === */
.kpi-app .rg-wrap { display: flex; flex-direction: column; gap: 14px; margin-top: 8px; }
.kpi-app .rg-card {
  background: linear-gradient(180deg, #f4f8fc 0%, #e2ecf6 100%);
  border: 1px solid #b8cae0;
  border-top: 4px solid #3a7cc8;
  border-radius: 14px;
  box-shadow: 0 10px 28px rgba(10,30,60,.22), 0 2px 6px rgba(10,30,60,.12);
  overflow: hidden;
  animation: cardSlideIn .4s ease-out both;
  transition: transform .2s, box-shadow .2s;
}
.kpi-app .rg-card:hover { transform: translateY(-2px); box-shadow: 0 16px 36px rgba(10,30,60,.28), 0 4px 8px rgba(10,30,60,.14); }
.kpi-app .rg-card.is-banca { border-top-color: #b89838; }
.kpi-app .rg-card.is-pa { border-top-color: #6a88a8; }
.kpi-app .rg-card.glow-full { box-shadow: 0 0 0 2px #f2d38d6b, 0 16px 36px rgba(10,30,60,.28); }

/* Phong header (inside rg-card) */
.kpi-app .rg-head {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #3a7cc8 0%, #2a6ab8 100%);
  color: #fff;
}
.kpi-app .rg-card.is-banca .rg-head { background: linear-gradient(135deg, #c89828 0%, #a87818 100%); }
.kpi-app .rg-card.is-pa .rg-head { background: linear-gradient(135deg, #6a88a8 0%, #4a6890 100%); }
.kpi-app .rg-head-left { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; }
.kpi-app .rg-head-name { font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: .05em; line-height: 1.2; }
.kpi-app .rg-head-pct { font-size: 18px; font-weight: 900; line-height: 1; white-space: nowrap; }

/* Phong summary row (4 stats) */
.kpi-app .rg-summary {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px;
  background: #c0d4e8;
  border-bottom: 1px solid #c0d4e8;
}
.kpi-app .rg-sum-cell {
  background: #e8f0fa;
  padding: 10px 4px 8px;
  text-align: center;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 56px;
}
.kpi-app .rg-sum-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: #5a78a0; line-height: 1.2; margin-bottom: 4px; white-space: nowrap; }
.kpi-app .rg-sum-val { font-size: 17px; font-weight: 900; line-height: 1.1; white-space: nowrap; }
.kpi-app .rg-sum-val.hd { color: #1e6cb8; }
.kpi-app .rg-sum-val.td { color: #6a4ab8; }
.kpi-app .rg-sum-val.chuan { color: #1a8a9a; }
.kpi-app .rg-sum-val.ip { color: #b87818; }
.kpi-app .rg-sum-val.afyp { color: #1a4a7a; }
.kpi-app .rg-sum-val.kh { color: #6a8aaa; }

/* AFYP + KH row */
.kpi-app .rg-afyp-row {
  display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #e0e8f0;
}
.kpi-app .rg-afyp { font-size: 1.45rem; font-weight: 900; color: #1a4a7a; line-height: 1.1; }
.kpi-app .rg-afyp-unit { font-size: .55em; font-weight: 700; color: #5a78a0; margin-left: 3px; }
.kpi-app .rg-kh { font-size: 11px; color: #6a8aaa; font-weight: 700; }
.kpi-app .rg-prog { width: 100%; height: 7px; border-radius: 99px; overflow: hidden; background: #d8e2ee; margin: 0 16px 10px; width: calc(100% - 32px); }
.kpi-app .rg-prog-fill { height: 100%; border-radius: inherit; transition: width 1s cubic-bezier(.22,1,.36,1); }

/* AD Table (compact, ngay hàng) */
.kpi-app .rg-ad-wrap {
  background: #fff;
  padding: 0 6px 8px;
}
.kpi-app .rg-ad-table {
  width: 100%; border-collapse: collapse; font-size: 11px;
  background: #f4f8fc;
  border-radius: 8px; overflow: hidden;
  border: 1px solid #d0dcee;
}
.kpi-app .rg-ad-table thead th {
  background: #1a3a5e;
  color: #c0d8ee;
  font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em;
  padding: 7px 4px; text-align: center; white-space: nowrap;
}
.kpi-app .rg-ad-table thead th:first-child { text-align: left; padding-left: 10px; }
.kpi-app .rg-ad-table tbody tr { transition: background .15s; }
.kpi-app .rg-ad-table tbody tr:hover { background: #e8f0fa; }
.kpi-app .rg-ad-table tbody td {
  padding: 8px 4px; text-align: center; border-top: 1px solid #e0e8f0;
  font-weight: 700; color: #2a4a6a; white-space: nowrap;
}
.kpi-app .rg-ad-table tbody td:first-child { text-align: left; padding-left: 10px; }
.kpi-app .rg-ad-name { font-weight: 900; color: #1a3a5e; }
.kpi-app .rg-ad-pct { font-weight: 900; }
.kpi-app .rg-ad-pct.green { color: #16a34a; }
.kpi-app .rg-ad-pct.gold { color: #d97706; }
.kpi-app .rg-ad-pct.red { color: #dc2626; }
.kpi-app .rg-ad-mini-prog { width: 44px; height: 5px; border-radius: 99px; background: #e0e8f0; display: inline-block; vertical-align: middle; overflow: hidden; }
.kpi-app .rg-ad-mini-prog-fill { height: 100%; border-radius: inherit; transition: width .8s cubic-bezier(.22,1,.36,1); }
.kpi-app .rg-ad-empty { padding: 14px 10px; text-align: center; font-size: 10px; color: #8aa0b8; font-style: italic; }

/* Mobile compact: smaller fonts/padding */
@media (max-width: 640px) {
  .kpi-app .rg-head { padding: 10px 12px; }
  .kpi-app .rg-head-name { font-size: 11px; }
  .kpi-app .rg-head-pct { font-size: 15px; }
  .kpi-app .rg-afyp { font-size: 1.2rem; }
  .kpi-app .rg-sum-val { font-size: 14px; }
  .kpi-app .rg-sum-label { font-size: 8px; }
  .kpi-app .rg-ad-table thead th { font-size: 8px; padding: 5px 2px; }
  .kpi-app .rg-ad-table tbody td { font-size: 10px; padding: 6px 2px; }
  .kpi-app .rg-ad-mini-prog { width: 36px; }
}

/* Desktop: hide mobile-only region, use rg-wrap */
@media (min-width: 900px) {
  .kpi-app .mob-region-wrap { display: none !important; }
  .kpi-app .rg-wrap { display: flex; flex-direction: column; gap: 12px; }
  .kpi-app .rg-card { max-width: none; }
}

'''

# Insert after line 206 (.dept-section line)
src = src.replace(
    ".kpi-app .dept-section { display: flex; flex-direction: column; gap: 0; }\n",
    ".kpi-app .dept-section { display: flex; flex-direction: column; gap: 0; }\n" + NEW_CSS
)

# ==================== 2. REPLACE MOBILE REGION BLOCK ====================
# Match from {/* Mobile Region - Circular Progress */} to closing </div> before {/* Desktop Split Layout */}
mobile_pattern = re.compile(
    r'              \{/\* Mobile Region - Circular Progress \*/\}\n.*?              </div>\n\n              \{/\* Desktop Split Layout \*/\}',
    re.DOTALL
)

NEW_MOBILE = '''              {/* Mobile Region - Redesign as table-style cards */}
              <div className="rg-wrap">
                {dashboard.phongs.map((phong, pi) => {
                  const pPct = phong.kh ? (phong.afyp / phong.kh * 100) : 0;
                  const pCp = Math.min(pPct, 100);
                  const pProgStart = progressColor(Math.max(pPct - 24, 0));
                  const pProgEnd = progressColor(pPct);
                  const pAfypTrd = Math.round(phong.afyp / 1000000);
                  const pKhTrd = Math.round(phong.kh / 1000000);
                  const pCls = phong.noAds ? 'is-banca' : (phong.ten && phong.ten.toUpperCase().includes('PA') ? 'is-pa' : '');
                  const glowClsStr = glowCls(pPct);
                  return (
                    <div className={`rg-card ${pCls} anim-in${glowClsStr}`} key={pi} style={{ animationDelay: `${pi * 60}ms` }}>
                      {/* Header: tên phòng + % */}
                      <div className="rg-head">
                        <div className="rg-head-left">
                          <Clipboard size={14} style={{ color: '#fff', flexShrink: 0 }} />
                          <span className="rg-head-name">{phong.ten}</span>
                        </div>
                        {!phong.noAds && <span className="rg-head-pct"><AnimPct value={pPct} /></span>}
                      </div>
                      {/* AFYP + KH row */}
                      {!phong.noAds && (
                        <>
                          <div className="rg-afyp-row">
                            <div>
                              <span className="rg-afyp"><AnimNum value={phong.afyp} /><span className="rg-afyp-unit">đ</span></span>
                            </div>
                            <span className="rg-kh">KH: {fmt(pKhTrd)} trđ</span>
                          </div>
                          <div className="rg-prog"><div className="rg-prog-fill" style={{ width: `${pCp}%`, background: `linear-gradient(90deg,${pProgStart},${pProgEnd})` }} /></div>
                        </>
                      )}
                      {/* Summary 4 stats: AFYP / Lượt HĐ / Tuyển dụng / HĐ chuẩn (or Tỷ trọng IP for noAds) */}
                      <div className="rg-summary">
                        <div className="rg-sum-cell">
                          <div className="rg-sum-label">AFYP (trđ)</div>
                          <div className="rg-sum-val afyp">{fmt(pAfypTrd)}</div>
                        </div>
                        <div className="rg-sum-cell">
                          <div className="rg-sum-label">Lượt HĐ</div>
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
                      </div>
                      {/* Tỷ trọng IP row (small) */}
                      <div style={{ background: '#fff', padding: '6px 16px 8px', borderBottom: '1px solid #e0e8f0', fontSize: 10, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6a8aaa', fontWeight: 700 }}>TỶ TRỌNG IP</span>
                        <span style={{ color: '#b87818', fontWeight: 900 }}>{fmtTyTrong(phong.tyTrong)}</span>
                      </div>
                      {/* AD Table */}
                      {!phong.noAds && phong.ads.length > 0 && (
                        <div className="rg-ad-wrap" style={{ paddingTop: 8 }}>
                          <table className="rg-ad-table">
                            <thead>
                              <tr>
                                <th>AD</th>
                                <th>% KH</th>
                                <th>AFYP</th>
                                <th>LƯỢT HĐ</th>
                                <th>TD</th>
                                <th>HĐC</th>
                                <th>IP%</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {phong.ads.map((ad, ai) => {
                                const aPct = ad.kh ? (ad.afyp / ad.kh * 100) : 0;
                                const aCp = Math.min(aPct, 100);
                                const aPctCls = pctClass(aPct);
                                const aProgStart = progressColor(Math.max(aPct - 24, 0));
                                const aProgEnd = progressColor(aPct);
                                const aAfypTrd = Math.round(ad.afyp / 1000000);
                                return (
                                  <tr key={ai}>
                                    <td><span className="rg-ad-name">{ad.ten}</span></td>
                                    <td><span className={`rg-ad-pct ${aPctCls}`}>{Math.round(aPct)}%</span></td>
                                    <td style={{ color: '#1a4a7a', fontWeight: 900 }}>{aAfypTrd}tr</td>
                                    <td>{ad.lhd}</td>
                                    <td>{ad.td}</td>
                                    <td>{ad.hdChuan}</td>
                                    <td style={{ color: '#b87818', fontWeight: 900 }}>{Math.round(ad.tyTrong)}%</td>
                                    <td><span className="rg-ad-mini-prog"><span className="rg-ad-mini-prog-fill" style={{ width: `${aCp}%`, background: `linear-gradient(90deg,${aProgStart},${aProgEnd})` }} /></span></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Split Layout */}'''

src, n = mobile_pattern.subn(NEW_MOBILE, src, count=1)
if n != 1:
    raise SystemExit(f'ERROR: mobile pattern matched {n} times')
print(f'Mobile region replaced: {n}')

# ==================== 3. REPLACE DESKTOP REGION BLOCK ====================
# Match from {/* Desktop Phong Card */} through end of dsk-ad-wrap
desktop_pattern = re.compile(
    r'                          \{/\* Desktop Phong Card \*/\}\n.*?                          </div>\n\n                          \{/\* AD Cards \(Mobile\) \*/\}',
    re.DOTALL
)

NEW_DESKTOP_PHONG = '''                          {/* Desktop Phong Card - Redesign as lighter floating card */}
                          <div className={`rg-card ${phong.noAds ? 'is-banca ' : (phong.ten && phong.ten.toUpperCase().includes('PA') ? 'is-pa ' : '')}anim-in${glowCls(pPct)}`} style={{ animationDelay: `${pi * 60}ms` }}>
                            {/* Header */}
                            <div className="rg-head">
                              <div className="rg-head-left">
                                <Clipboard size={15} style={{ color: '#fff', flexShrink: 0 }} />
                                <span className="rg-head-name">{phong.ten}</span>
                              </div>
                              {!phong.noAds && <span className="rg-head-pct"><AnimPct value={pPct} /></span>}
                            </div>
                            {/* AFYP + KH row */}
                            {!phong.noAds && (
                              <>
                                <div className="rg-afyp-row">
                                  <div>
                                    <span className="rg-afyp"><AnimNum value={afypTrd} /><span className="rg-afyp-unit">trđ</span></span>
                                  </div>
                                  <span className="rg-kh">KH: {fmt(khTrd)} trđ</span>
                                </div>
                                <div className="rg-prog"><div className="rg-prog-fill" style={{ width: `${pCp}%`, background: `linear-gradient(90deg,${progStart},${progEnd})` }} /></div>
                              </>
                            )}
                            {/* Summary 4 stats */}
                            <div className="rg-summary">
                              <div className="rg-sum-cell">
                                <div className="rg-sum-label">AFYP (trđ)</div>
                                <div className="rg-sum-val afyp"><AnimNum value={afypTrd} /></div>
                              </div>
                              <div className="rg-sum-cell">
                                <div className="rg-sum-label">Lượt HĐ</div>
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
                            </div>
                            {/* Tỷ trọng IP row */}
                            <div style={{ background: '#fff', padding: '8px 16px 10px', borderBottom: '1px solid #e0e8f0', fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#6a8aaa', fontWeight: 700 }}>TỶ TRỌNG IP</span>
                              <span style={{ color: '#b87818', fontWeight: 900 }}>{fmtTyTrong(phong.tyTrong)}</span>
                            </div>
                            {/* AD Table - moved inside rg-card */}
                            {!phong.noAds && phong.ads.length > 0 && (
                              <div className="rg-ad-wrap" style={{ padding: '10px 12px 12px' }}>
                                <table className="rg-ad-table">
                                  <thead>
                                    <tr>
                                      <th>AD</th>
                                      <th>% KH</th>
                                      <th>AFYP</th>
                                      <th>KH</th>
                                      <th>LƯỢT HĐ</th>
                                      <th>TD</th>
                                      <th>HĐC</th>
                                      <th>IP%</th>
                                      <th></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {phong.ads.map((ad, ai) => {
                                      const aPct = ad.kh ? (ad.afyp / ad.kh * 100) : 0;
                                      const aCp = Math.min(aPct, 100);
                                      const aPctCls = pctClass(aPct);
                                      const aProgStart = progressColor(Math.max(aPct - 24, 0));
                                      const aProgEnd = progressColor(aPct);
                                      const aAfypTrd = Math.round(ad.afyp / 1000000);
                                      const aKhTrd = Math.round(ad.kh / 1000000);
                                      return (
                                        <tr key={ai} className="anim-in" style={{ animationDelay: `${(pi * 60) + (ai * 30)}ms` }}>
                                          <td><span className="rg-ad-name">{ad.ten}</span></td>
                                          <td><span className={`rg-ad-pct ${aPctCls}`}>{Math.round(aPct)}%</span></td>
                                          <td style={{ color: '#1a4a7a', fontWeight: 900 }}>{aAfypTrd}tr</td>
                                          <td style={{ color: '#6a8aaa' }}>{aKhTrd ? `${aKhTrd}tr` : '--'}</td>
                                          <td>{ad.lhd}</td>
                                          <td>{ad.td}</td>
                                          <td>{ad.hdChuan}</td>
                                          <td style={{ color: '#b87818', fontWeight: 900 }}>{Math.round(ad.tyTrong)}%</td>
                                          <td><span className="rg-ad-mini-prog"><span className="rg-ad-mini-prog-fill" style={{ width: `${aCp}%`, background: `linear-gradient(90deg,${aProgStart},${aProgEnd})` }} /></span></td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                        </div>

                        {/* AD Cards (Mobile) */}'''

src, n = desktop_pattern.subn(NEW_DESKTOP_PHONG, src, count=1)
if n != 1:
    raise SystemExit(f'ERROR: desktop phong pattern matched {n} times')
print(f'Desktop phong replaced: {n}')

# ==================== 4. HIDE OLD AD GRID + AD TABLE on desktop (now inside rg-card) ====================
# Find the section: {/* AD Cards (Mobile) */} ... {/* AD Table (Desktop) */} ... </div>\n}\)\}
# Hide the old desktop AD table since it's now inside rg-card
src = src.replace(
    "                          {/* AD Cards (Mobile) */}\n                          {!phong.noAds && (\n                            <div className=\"ad-grid\">",
    "                          {/* AD Cards (Mobile) - HIDDEN, replaced by rg-ad-table inside rg-card */}\n                          {!phong.noAds && false && (\n                            <div className=\"ad-grid\">"
)

src = src.replace(
    "                          {/* AD Table (Desktop) */}\n                          {!phong.noAds && (\n                            <div className=\"dsk-ad-wrap\">",
    "                          {/* AD Table (Desktop) - HIDDEN, replaced by rg-ad-table inside rg-card */}\n                          {!phong.noAds && false && (\n                            <div className=\"dsk-ad-wrap\">"
)

# ==================== 5. ROUND decimals in KPI page ====================
# fmtBig: 1e9 toFixed(2) → Math.round
src = re.sub(r"\(v/1e9\)\.toFixed\(2\)", "Math.round(v/1e9)", src)
src = re.sub(r"\(v/1e9\)\.toFixed\(1\)", "Math.round(v/1e9)", src)
# fmtKpiCurrency
src = re.sub(r"\(amount / 1_000_000_000\)\.toFixed\(3\)\.replace\('\.', ','\)", "Math.round(amount / 1_000_000_000)", src)
src = re.sub(r"\(amount / 1_000_000\)\.toFixed\(3\)\.replace\('\.', ','\)", "Math.round(amount / 1_000_000)", src)
src = re.sub(r"\(amount / 1_000\)\.toFixed\(3\)\.replace\('\.', ','\)", "Math.round(amount / 1_000)", src)
# 0 case
src = src.replace("return '0,000 trđ';", "return '0 trđ';")
# toFixed(1) for tyTrong/nangSuat/doLonHD display - use Math.round
src = re.sub(r"dashboard\.total\.tyTrong\.toFixed\(1\)", "Math.round(dashboard.total.tyTrong)", src)
src = re.sub(r"dashboard\.total\.nangSuat\.toFixed\(2\)", "Math.round(dashboard.total.nangSuat)", src)
src = re.sub(r"\(dashboard\.total\.doLonHD / 1000000\)\.toFixed\(1\)", "Math.round(dashboard.total.doLonHD / 1000000)", src)
src = re.sub(r"phong\.tyTrong\.toFixed\(1\)", "Math.round(phong.tyTrong)", src)
src = re.sub(r"aPct\.toFixed\(0\)", "Math.round(aPct)", src)
src = re.sub(r"pPct\.toFixed\(0\)", "Math.round(pPct)", src)

PAGE.write_text(src, encoding='utf-8')
print(f'OK: kpi/page.tsx updated. Size: {len(src)}')
