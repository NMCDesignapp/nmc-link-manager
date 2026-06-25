#!/usr/bin/env python3
"""
KPI Tiến Độ Khu Vực v3:
1. AD name mapping: AD Uy → Trương Quốc Uy, AD Trí → Lê Quang Trọng Trí, etc.
2. Bỏ cột %KH trong bảng AD → %KH làm số nhỏ trên progress bar (cột cuối)
3. AFYP hiển thị đầy đủ (đơn vị đ), KH AFYP nhỏ mờ dưới tên AD
4. Bỏ %KH khỏi header phòng → AFYP row hiển thị đ + KH mờ dưới
5. %KH phòng làm số nhỏ trên progress bar
6. Glow effect mạnh hơn cho AD/Phòng đạt 100% KH
7. Chữ TIẾN ĐỘ KHU VỰC to lên / ngăn cách rõ
"""
import re

FILE = '/home/z/my-project/src/app/kpi/page.tsx'
with open(FILE, encoding='utf-8') as f:
    src = f.read()

# ============ STEP 1: Add AD name mapping constant ============

# Insert after MONTHS/WEEKDAY constants
old_constants = "const MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12'];\nconst WEEKDAY_NAMES = ['CN','T2','T3','T4','T5','T6','T7'];"
new_constants = """const MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const WEEKDAY_NAMES = ['CN','T2','T3','T4','T5','T6','T7'];

// AD short-name → full name mapping (DB stores short names, display full names)
const AD_FULL_NAME_MAP: Record<string, string> = {
  'AD Uy': 'Trương Quốc Uy',
  'AD Trí': 'Lê Quang Trọng Trí',
  'AD Có': 'Nguyễn Văn Có',
  'AD Long': 'Nguyễn Thanh Long',
  'AD Trang': 'Đàm Thị Hương Trang',
  'AD Danh': 'Đặng Công Danh',
};
const resolveAdName = (adKey: string): string => AD_FULL_NAME_MAP[adKey] || adKey;"""

src = src.replace(old_constants, new_constants)

# ============ STEP 2: Update dashboard useMemo to use resolveAdName ============

# In dashboard useMemo, the managerName line: replace `leader?.agentName || adKey` with `leader?.agentName || resolveAdName(adKey)`
src = src.replace(
    "const managerName = leader?.agentName || adKey;",
    "const managerName = leader?.agentName || resolveAdName(adKey);"
)

# ============ STEP 3: CSS updates ============

# 3a. Update .rg-card.glow-full — stronger glow effect
old_glow_css = ".kpi-app .rg-card.glow-full { box-shadow: 0 0 0 2px #f2d38d6b, 0 16px 36px rgba(10,30,60,.28); }"
new_glow_css = """.kpi-app .rg-card.glow-full {
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
}"""
src = src.replace(old_glow_css, new_glow_css)

# 3b. Add CSS for AD row glow + new layout (rg-ad-row-glow, rg-ad-name-cell, rg-ad-sub, rg-pct-on-prog, etc.)
# Insert before "/* AFYP + KH row */"
old_ad_table_css_end = """.kpi-app .rg-ad-empty { padding: 14px 10px; text-align: center; font-size: 10px; color: #8aa0b8; font-style: italic; }"""

new_ad_table_css_end = """.kpi-app .rg-ad-empty { padding: 14px 10px; text-align: center; font-size: 10px; color: #8aa0b8; font-style: italic; }

/* AD row glow when 100% KH */
.kpi-app .rg-ad-table tbody tr.rg-ad-glow {
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
.kpi-app .rg-ad-table tbody tr.rg-ad-glow .rg-ad-afyp { color: #8a5a10 !important; }

/* AD name cell: name + small KH under */
.kpi-app .rg-ad-name-cell { display: flex; flex-direction: column; gap: 0; line-height: 1.2; }
.kpi-app .rg-ad-name { font-weight: 900; color: #1a3a5e; }
.kpi-app .rg-ad-sub { font-size: 8px; color: #9aa8be; font-weight: 600; white-space: nowrap; }
.kpi-app .rg-ad-afyp { color: #1a4a7a; font-weight: 900; white-space: nowrap; }
.kpi-app .rg-ad-afyp-unit { font-size: 0.7em; color: #6a8aaa; font-weight: 700; margin-left: 2px; }

/* %KH on progress bar (overlay) */
.kpi-app .rg-ad-prog-cell { position: relative; min-width: 60px; }
.kpi-app .rg-ad-prog-wrap { position: relative; width: 100%; min-width: 50px; }
.kpi-app .rg-ad-pct-on-prog {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  font-size: 9px; font-weight: 900; color: #1a4a7a;
  text-shadow: 0 0 4px #fff, 0 0 4px #fff, 0 0 4px #fff;
  white-space: nowrap; z-index: 2; pointer-events: none;
}
.kpi-app .rg-ad-pct-on-prog.green { color: #0f5132; }
.kpi-app .rg-ad-pct-on-prog.gold { color: #6a4010; }
.kpi-app .rg-ad-pct-on-prog.red { color: #6a1010; }

/* %KH on phong progress bar */
.kpi-app .rg-prog-wrap { position: relative; width: 100%; margin: 0 16px 10px; width: calc(100% - 32px); }
.kpi-app .rg-prog-pct-on-bar {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  font-size: 9px; font-weight: 900; color: #1a4a7a;
  text-shadow: 0 0 4px #fff, 0 0 4px #fff, 0 0 4px #fff;
  white-space: nowrap; z-index: 2;
}

/* Region divider: TIẾN ĐỘ KHU VỰC to + rõ hơn */
.kpi-app .region-divider { display: flex; align-items: center; gap: 14px; margin: 32px 0 18px !important; padding: 0 4px; }
.kpi-app .region-divider::before, .kpi-app .region-divider::after { content: ''; flex: 1; height: 2px; background: linear-gradient(90deg, transparent, #3a7cc8, transparent); }
.kpi-app .region-divider-title {
  font-size: 16px !important; font-weight: 900; text-transform: uppercase; letter-spacing: .15em;
  color: #1a4a7a; white-space: nowrap;
  text-shadow: 0 1px 0 #ffffff, 0 2px 8px #3a7cc833;
  padding: 4px 14px; border-radius: 4px;
  background: linear-gradient(135deg, #e8f0fa 0%, #d4e2f4 100%);
  border: 1px solid #b8cae0;
  box-shadow: 0 2px 8px rgba(10,30,60,.1);
}"""

src = src.replace(old_ad_table_css_end, new_ad_table_css_end)

# 3c. On desktop, region-divider is hidden. Need to show it (or use section-divider for desktop)
# Let's update desktop to show region-divider too
src = src.replace(
    "  .kpi-app .region-divider { display: none; }",
    "  .kpi-app .region-divider { display: flex !important; margin: 24px 0 14px; }"
)
src = src.replace(
    "  .kpi-app .region-divider { display: none !important; }",
    "  .kpi-app .region-divider { display: flex !important; margin: 24px 0 14px; }"
)

# ============ STEP 4: Update mobile rg-card render ============

# Mobile phong card
old_mobile_card = """                    <div className={`rg-card ${pCls} anim-in${glowClsStr}`} key={pi} style={{ animationDelay: `${pi * 60}ms` }}>
                      {/* Header: tên phòng + % */}
                      <div className="rg-head">
                        <div className="rg-head-left">
                          <Clipboard size={14} style={{ color: '#fff', flexShrink: 0 }} />
                          <span className="rg-head-name">{phong.ten}</span>
                        </div>
                        {!phong.noAds && <span className="rg-head-pct"><AnimPct value={pPct} /></span>}
                      </div>
                      {/* AFYP + KH row (only for phong with KH) */}
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
                      )}"""

new_mobile_card = """                    <div className={`rg-card ${pCls} anim-in${glowClsStr}`} key={pi} style={{ animationDelay: `${pi * 60}ms` }}>
                      {/* Header: tên phòng (bỏ %KH — sẽ hiện trên progress bar) */}
                      <div className="rg-head">
                        <div className="rg-head-left">
                          <Clipboard size={14} style={{ color: '#fff', flexShrink: 0 }} />
                          <span className="rg-head-name">{phong.ten}</span>
                        </div>
                      </div>
                      {/* AFYP (đầy đủ đ) + KH mờ dưới + progress bar có % nhỏ */}
                      {!phong.noAds && (
                        <>
                          <div className="rg-afyp-row">
                            <div>
                              <span className="rg-afyp"><AnimNum value={phong.afyp} /><span className="rg-afyp-unit">đ</span></span>
                              <div style={{ fontSize: 9, color: '#9aa8be', fontWeight: 600, marginTop: 2 }}>KH: {fmt(phong.kh)}đ</div>
                            </div>
                          </div>
                          <div className="rg-prog-wrap">
                            <div className="rg-prog"><div className="rg-prog-fill" style={{ width: `${pCp}%`, background: `linear-gradient(90deg,${pProgStart},${pProgEnd})` }} /></div>
                            <span className={`rg-prog-pct-on-bar ${pctClass(pPct)}`}>{Math.round(pPct)}%</span>
                          </div>
                        </>
                      )}"""

src = src.replace(old_mobile_card, new_mobile_card)

# Mobile AD table - remove %KH column, restructure
old_mobile_ad_table = """                          <table className="rg-ad-table">
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
                          </table>"""

new_mobile_ad_table = """                          <table className="rg-ad-table">
                            <thead>
                              <tr>
                                <th>AD</th>
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
                                const aGlow = aPct >= 100 ? 'rg-ad-glow' : '';
                                return (
                                  <tr key={ai} className={aGlow}>
                                    <td>
                                      <div className="rg-ad-name-cell">
                                        <span className="rg-ad-name">{ad.ten}</span>
                                        {ad.kh > 0 && <span className="rg-ad-sub">KH: {fmt(ad.kh)}đ</span>}
                                      </div>
                                    </td>
                                    <td><span className="rg-ad-afyp">{fmt(ad.afyp)}<span className="rg-ad-afyp-unit">đ</span></span></td>
                                    <td>{ad.lhd}</td>
                                    <td>{ad.td}</td>
                                    <td>{ad.hdChuan}</td>
                                    <td style={{ color: '#b87818', fontWeight: 900 }}>{Math.round(ad.tyTrong)}%</td>
                                    <td className="rg-ad-prog-cell">
                                      <div className="rg-ad-prog-wrap">
                                        <span className="rg-ad-mini-prog"><span className="rg-ad-mini-prog-fill" style={{ width: `${aCp}%`, background: `linear-gradient(90deg,${aProgStart},${aProgEnd})` }} /></span>
                                        <span className={`rg-ad-pct-on-prog ${aPctCls}`}>{Math.round(aPct)}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>"""

src = src.replace(old_mobile_ad_table, new_mobile_ad_table)

# ============ STEP 5: Update desktop rg-card render ============

old_desktop_card = """                          <div className={`rg-card ${phong.noAds ? 'is-banca ' : ''}anim-in${glowCls(pPct)}`} style={{ animationDelay: `${pi * 60}ms` }}>
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
                            )}"""

new_desktop_card = """                          <div className={`rg-card ${phong.noAds ? 'is-banca ' : ''}anim-in${glowCls(pPct)}`} style={{ animationDelay: `${pi * 60}ms` }}>
                            {/* Header (bỏ %KH) */}
                            <div className="rg-head">
                              <div className="rg-head-left">
                                <Clipboard size={15} style={{ color: '#fff', flexShrink: 0 }} />
                                <span className="rg-head-name">{phong.ten}</span>
                              </div>
                            </div>
                            {/* AFYP (đầy đủ đ) + KH mờ dưới + progress có % nhỏ */}
                            {!phong.noAds && (
                              <>
                                <div className="rg-afyp-row">
                                  <div>
                                    <span className="rg-afyp"><AnimNum value={phong.afyp} /><span className="rg-afyp-unit">đ</span></span>
                                    <div style={{ fontSize: 10, color: '#9aa8be', fontWeight: 600, marginTop: 2 }}>KH: {fmt(phong.kh)}đ</div>
                                  </div>
                                </div>
                                <div className="rg-prog-wrap">
                                  <div className="rg-prog"><div className="rg-prog-fill" style={{ width: `${pCp}%`, background: `linear-gradient(90deg,${progStart},${progEnd})` }} /></div>
                                  <span className={`rg-prog-pct-on-bar ${pctClass(pPct)}`}>{Math.round(pPct)}%</span>
                                </div>
                              </>
                            )}"""

src = src.replace(old_desktop_card, new_desktop_card)

# Desktop AD table - remove %KH and KH columns, restructure
old_desktop_ad_table = """                                <table className="rg-ad-table">
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
                                </table>"""

new_desktop_ad_table = """                                <table className="rg-ad-table">
                                  <thead>
                                    <tr>
                                      <th>AD</th>
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
                                      const aGlow = aPct >= 100 ? 'rg-ad-glow anim-in' : 'anim-in';
                                      return (
                                        <tr key={ai} className={aGlow} style={{ animationDelay: `${(pi * 60) + (ai * 30)}ms` }}>
                                          <td>
                                            <div className="rg-ad-name-cell">
                                              <span className="rg-ad-name">{ad.ten}</span>
                                              {ad.kh > 0 && <span className="rg-ad-sub">KH: {fmt(ad.kh)}đ</span>}
                                            </div>
                                          </td>
                                          <td><span className="rg-ad-afyp">{fmt(ad.afyp)}<span className="rg-ad-afyp-unit">đ</span></span></td>
                                          <td>{ad.lhd}</td>
                                          <td>{ad.td}</td>
                                          <td>{ad.hdChuan}</td>
                                          <td style={{ color: '#b87818', fontWeight: 900 }}>{Math.round(ad.tyTrong)}%</td>
                                          <td className="rg-ad-prog-cell">
                                            <div className="rg-ad-prog-wrap">
                                              <span className="rg-ad-mini-prog"><span className="rg-ad-mini-prog-fill" style={{ width: `${aCp}%`, background: `linear-gradient(90deg,${aProgStart},${aProgEnd})` }} /></span>
                                              <span className={`rg-ad-pct-on-prog ${aPctCls}`}>{Math.round(aPct)}%</span>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>"""

src = src.replace(old_desktop_ad_table, new_desktop_ad_table)

# ============ STEP 6: Update region divider text on desktop split-right ============

# Currently on desktop split-right there's a "Chi tiết các phòng" section-divider that's visible
# Make it consistent with mobile by replacing it
src = src.replace(
    '                  <div className="section-divider">Chi tiết các phòng</div>',
    '                  <div className="region-divider" style={{ display: "flex" }}><span className="region-divider-title">Tiến Độ Khu Vực</span></div>'
)

# ============ WRITE OUTPUT ============
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(src)

print("OK: kpi/page.tsx updated with v3 redesign")
print("  - AD name mapping (AD Uy → Trương Quốc Uy, etc.)")
print("  - Removed %KH column from AD table")
print("  - %KH shown as small number on progress bar")
print("  - AFYP shows full đ (with unit)")
print("  - KH AFYP small + dim below AD name")
print("  - Removed %KH from phong header")
print("  - %KH phong shown on progress bar")
print("  - Glow effect for AD/phong at 100% KH (pulse animation)")
print("  - TIẾN ĐỘ KHU VỰC divider larger + clearer (mobile + desktop)")
