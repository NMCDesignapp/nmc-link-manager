#!/usr/bin/env python3
"""
Redesign KPI Tiến Độ Khu Vực v2:
1. Merge PA + Banca vào 1 phòng "Banca - PA"
2. td (tuyển dụng) tính theo tvvStructList có ngayBatDau trong period, match AD/Phong qua maBanNhom
3. Tổng công ty = tổng các phòng (đồng nhất)
4. Layout card:
   - 4 stats: Lượt HĐ / Tuyển dụng / HĐ chuẩn / Tỷ trọng IP (BỎ AFYP)
   - Bỏ dòng Tỷ trọng IP riêng, thay bằng thin separator
   - Bo góc tối tiểu (4px)
"""
import re

FILE = '/home/z/my-project/src/app/kpi/page.tsx'
with open(FILE, encoding='utf-8') as f:
    src = f.read()

# ============ STEP 1: Update CSS ============
src = src.replace(
    "  border-top: 4px solid #3a7cc8;\n  border-radius: 14px;",
    "  border-top: 4px solid #3a7cc8;\n  border-radius: 4px;"
)
src = src.replace(
    "  background: #f4f8fc;\n  border-radius: 8px; overflow: hidden;\n  border: 1px solid #d0dcee;",
    "  background: #f4f8fc;\n  border-radius: 3px; overflow: hidden;\n  border: 1px solid #d0dcee;"
)

# Add rg-divider CSS
old_summary_css = """.kpi-app .rg-sum-val.kh { color: #6a8aaa; }

/* AFYP + KH row */"""

new_summary_css = """.kpi-app .rg-sum-val.kh { color: #6a8aaa; }

/* Thin separator between summary and AD table */
.kpi-app .rg-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #b8cae0 20%, #b8cae0 80%, transparent 100%);
  margin: 0 12px;
}

/* AFYP + KH row */"""

src = src.replace(old_summary_css, new_summary_css)

# ============ STEP 2: Refactor dashboard useMemo (2-space indent) ============

old_dashboard_start = "  /* Compute dashboard data — using same logic as quan-ly page */\n  const dashboard = useMemo(() => {"
old_dashboard_end_marker = "  }, [rawData, overviewPeriod, onlineSettings, adStructList, phongStructList]);"

start_idx = src.find(old_dashboard_start)
end_idx = src.find(old_dashboard_end_marker, start_idx) + len(old_dashboard_end_marker)

if start_idx < 0 or end_idx < 0:
    print("ERROR: Cannot find dashboard useMemo block")
    exit(1)

new_dashboard_block = '''  /* Compute dashboard data — using same logic as quan-ly page */
  const dashboard = useMemo(() => {
    if (!rawData) return null;
    const { contracts, staff, revenue } = rawData;

    const currentYear = new Date().getFullYear();
    // Filter contracts for current year using getDoanhSoMonth (same as quan-ly)
    const yearContracts = contracts.filter(c => {
      const d = getDoanhSoMonth(c);
      return !isNaN(d.getTime()) && d.getFullYear() === currentYear;
    });

    // Apply period filter
    const periodMonths = getPeriodMonths(overviewPeriod);
    const periodContracts = yearContracts.filter(c => {
      const d = getDoanhSoMonth(c);
      return periodMonths.includes(d.getMonth() + 1);
    });

    // ========== KH (Kế hoạch) AFYP — from online settings, same keys as quan-ly ==========
    const adPlans = new Map<string, number>();
    adStructList.forEach(ad => {
      const val = parseFloat(onlineSettings[`nmc-kh-ad-${ad.maAD}`] || '0') || 0;
      adPlans.set(ad.maAD, val);
    });
    const targetTongAFYP = adStructList.reduce((s, ad) => s + (adPlans.get(ad.maAD) || 0), 0);

    // Helper: tính period KH cho 1 annual KH (dùng monthly ratios)
    const calcPeriodKh = (annualKh: number): number => {
      if (annualKh <= 0) return 0;
      let k = 0;
      periodMonths.forEach(m => {
        const mm = String(m).padStart(2, '0');
        const ratio = parseFloat(onlineSettings[`nmc-kh-ratio-${mm}`] || '0') || 0;
        if (ratio > 0) k += annualKh * ratio / 100;
      });
      return k;
    };

    // ========== Build lookups: BanNhom → AD, AD → Phong ==========
    const phongNameMap = new Map<string, string>();
    phongStructList.forEach(p => phongNameMap.set(p.maPhong, p.tenPhong));

    const adToPhongMap = new Map<string, { maPhong: string; tenPhong: string; tenAD: string }>();
    adStructList.forEach(ad => {
      const pName = phongNameMap.get(ad.maPhong) || '';
      adToPhongMap.set(ad.maAD, { maPhong: ad.maPhong, tenPhong: pName, tenAD: ad.tenAD });
    });

    const bnToAdMap = new Map<string, { maAD: string; tenAD: string; maPhong: string; tenPhong: string }>();
    banNhomStructList.forEach(bn => {
      const adInfo = adToPhongMap.get(bn.maAD);
      if (adInfo) {
        bnToAdMap.set(bn.maBanNhom, { maAD: bn.maAD, tenAD: adInfo.tenAD, maPhong: adInfo.maPhong, tenPhong: adInfo.tenPhong });
      }
    });

    // ========== TVV tuyển dụng trong period — theo AD/Phong ==========
    const tvvInPeriodByAD = new Map<string, number>();
    const tvvInPeriodByPhong = new Map<string, number>();
    let tvvInPeriodTotal = 0;

    tvvStructList.forEach(t => {
      if (!t.ngayBatDau) return;
      const d = new Date(t.ngayBatDau);
      if (isNaN(d.getTime())) return;
      if (d.getFullYear() !== currentYear) return;
      if (!periodMonths.includes(d.getMonth() + 1)) return;

      const adInfo = bnToAdMap.get(t.maBanNhom);
      if (!adInfo) return;

      tvvInPeriodTotal++;
      tvvInPeriodByAD.set(adInfo.maAD, (tvvInPeriodByAD.get(adInfo.maAD) || 0) + 1);
      tvvInPeriodByPhong.set(adInfo.maPhong, (tvvInPeriodByPhong.get(adInfo.maPhong) || 0) + 1);
    });

    // ========== PA / Banca detection helpers ==========
    const isPaCode = (code: string): boolean => {
      if (!code) return false;
      const c = String(code).trim();
      return c === 'PA' || c === 'U104101014' || c.toLowerCase() === 'pa';
    };
    const isBancaCode = (code: string): boolean => {
      if (!code) return false;
      const c = String(code).trim();
      return c === 'Banca' || c === 'A473DSO000' || c === 'DSO' || c.toLowerCase() === 'banca' || c.toLowerCase() === 'dso';
    };
    const isPaOrBanca = (code: string): boolean => isPaCode(code) || isBancaCode(code);

    // ========== Per-Phong and per-AD data ==========
    const phongs: PhongData[] = [];
    let bancaPaPhong: PhongData | null = null;
    let bancaPaIpSum = 0;
    const bancaPaContractIds = new Set<string>();

    for (const phongStruct of phongStructList) {
      const pName = phongStruct.tenPhong;

      // PA or Banca → merge into Banca - PA
      if (isPaOrBanca(phongStruct.maPhong) || isPaOrBanca(pName)) {
        if (!bancaPaPhong) {
          bancaPaPhong = { ten: 'Banca - PA', afyp: 0, kh: 0, lhd: 0, td: 0, hdChuan: 0, tyTrong: 0, ads: [], noAds: true };
        }
        // Match contracts by nhom / ban / maNhom containing PA / Banca / DSO
        const paContracts = periodContracts.filter(c => {
          if (isPaOrBanca(c.nhom || '') || isPaOrBanca(c.ban || '') || isPaOrBanca(c.maNhom || '')) return true;
          const nhomNorm = normKey(c.nhom || '');
          const banNorm = normKey(c.ban || '');
          const maNhomNorm = normKey(c.maNhom || '');
          return nhomNorm.includes('PA') || nhomNorm.includes('BANCA') || nhomNorm.includes('DSO')
            || banNorm.includes('PA') || banNorm.includes('BANCA') || banNorm.includes('DSO')
            || maNhomNorm.includes('PA') || maNhomNorm.includes('BANCA') || maNhomNorm.includes('DSO');
        });

        // Add only contracts not already counted
        const newContracts = paContracts.filter(c => !bancaPaContractIds.has(c.id));
        newContracts.forEach(c => bancaPaContractIds.add(c.id));

        if (bancaPaPhong) {
          bancaPaPhong.afyp += newContracts.reduce((s, c) => s + num(c.afyp), 0);
          bancaPaIpSum += newContracts.reduce((s, c) => s + num(c.pdt10DT), 0);
          bancaPaPhong.lhd += newContracts.filter(c => num(c.tinhLuot3tr) >= 3000000).length;
          bancaPaPhong.hdChuan += newContracts.filter(c => num(c.tinhLuot3tr) >= 12000000).length;
          bancaPaPhong.td += tvvInPeriodByPhong.get(phongStruct.maPhong) || 0;
          bancaPaPhong.tyTrong = bancaPaPhong.afyp > 0 ? (bancaPaIpSum / bancaPaPhong.afyp * 100) : 0;
        }
        continue;
      }

      // Regular phong with ADs
      const p: PhongData = { ten: pName, afyp: 0, kh: 0, lhd: 0, td: 0, hdChuan: 0, tyTrong: 0, ads: [], noAds: false };
      let pIpSum = 0;

      const phongADs = adStructList.filter(a => a.maPhong === phongStruct.maPhong);

      phongADs.forEach(adStruct => {
        const adKey = adStruct.tenAD;
        const adNormKey = normKey(adKey);

        // Find AD manager name from leaders
        const leader = rawData.leaders.find(l => normKey(l.agentName).includes(adNormKey) || adNormKey.includes(normKey(l.agentName)));
        const managerName = leader?.agentName || adKey;

        // Find contracts for this AD — match by normalized ad name
        const adContracts = periodContracts.filter(c => {
          const cAdNorm = normKey(c.ad || '');
          if (!cAdNorm) return false;
          return cAdNorm === adNormKey || cAdNorm.includes(adNormKey) || adNormKey.includes(cAdNorm);
        });

        const afyp = adContracts.reduce((s, c) => s + num(c.afyp), 0);
        const ip = adContracts.reduce((s, c) => s + num(c.pdt10DT), 0);
        const lhd = adContracts.filter(c => num(c.tinhLuot3tr) >= 3000000).length;
        const td = tvvInPeriodByAD.get(adStruct.maAD) || 0;
        const hdChuan = adContracts.filter(c => num(c.tinhLuot3tr) >= 12000000).length;
        const tyTrong = afyp > 0 ? (ip / afyp * 100) : 0;

        const adKh = adPlans.get(adStruct.maAD) || 0;
        const adPeriodKh = calcPeriodKh(adKh);

        const d: ADData = { ten: managerName, managerKey: adKey, afyp, kh: adPeriodKh, lhd, td, hdChuan, tyTrong };
        p.ads.push(d);
        p.afyp += afyp; p.kh += adPeriodKh; p.lhd += lhd; p.td += td; p.hdChuan += hdChuan;
        pIpSum += ip;
      });

      p.tyTrong = p.afyp > 0 ? (pIpSum / p.afyp * 100) : 0;
      phongs.push(p);
    }

    if (bancaPaPhong) {
      phongs.push(bancaPaPhong);
    }

    // ========== Company total = SUM OF ALL PHONGS (ensure consistency) ==========
    const totalAFYP = phongs.reduce((s, p) => s + p.afyp, 0);
    const totalKH = phongs.reduce((s, p) => s + p.kh, 0);
    const totalLhd = phongs.reduce((s, p) => s + p.lhd, 0);
    const totalTd = phongs.reduce((s, p) => s + p.td, 0);
    const totalHdChuan = phongs.reduce((s, p) => s + p.hdChuan, 0);

    const totalIP = periodContracts.reduce((s, c) => s + num(c.pdt10DT), 0);
    const slHD = periodContracts.length;
    const ipAfypRatio = totalAFYP > 0 ? (totalIP / totalAFYP) * 100 : 0;

    const total: TotalData = {
      afyp: totalAFYP,
      kh: totalKH,
      lhd: totalLhd,
      td: totalTd,
      hdChuan: totalHdChuan,
      tyTrong: ipAfypRatio,
      totalIP,
      slHD,
      nangSuat: totalLhd > 0 ? slHD / totalLhd : 0,
      doLonHD: totalLhd > 0 ? totalAFYP / totalLhd : 0,
    };

    return { total, phongs, periodContracts };
  }, [rawData, overviewPeriod, onlineSettings, adStructList, phongStructList, banNhomStructList, tvvStructList]);'''

src = src[:start_idx] + new_dashboard_block + src[end_idx:]

# ============ STEP 3: Replace mobile rg-card render ============

old_mobile_card_start = "              {/* Mobile Region - Redesign as table-style cards */}\n              <div className=\"rg-wrap\">"
old_mobile_card_end = "              </div>\n\n              {/* Desktop Split Layout */}"

m_start = src.find(old_mobile_card_start)
m_end = src.find(old_mobile_card_end, m_start)
if m_start < 0 or m_end < 0:
    print("ERROR: Cannot find mobile rg-card block")
    exit(1)

new_mobile_block = '''              {/* Mobile Region - Redesign as table-style cards */}
              <div className="rg-wrap">
                {dashboard.phongs.map((phong, pi) => {
                  const pPct = phong.kh ? (phong.afyp / phong.kh * 100) : 0;
                  const pCp = Math.min(pPct, 100);
                  const pProgStart = progressColor(Math.max(pPct - 24, 0));
                  const pProgEnd = progressColor(pPct);
                  const pAfypTrd = Math.round(phong.afyp / 1000000);
                  const pKhTrd = Math.round(phong.kh / 1000000);
                  const pCls = phong.noAds ? 'is-banca' : '';
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
                      )}
                      {/* Summary 4 stats: Lượt HĐ / Tuyển dụng / HĐ chuẩn / Tỷ trọng IP (BỎ AFYP — đã có ở dòng trên) */}
                      <div className="rg-summary">
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
                        <div className="rg-sum-cell">
                          <div className="rg-sum-label">Tỷ trọng IP</div>
                          <div className="rg-sum-val ip">{fmtTyTrong(phong.tyTrong)}</div>
                        </div>
                      </div>
                      {/* Thin separator (thay cho dòng Tỷ trọng IP riêng) */}
                      <div className="rg-divider" />
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

src = src[:m_start] + new_mobile_block + src[m_end + len(old_mobile_card_end):]

# ============ STEP 4: Replace desktop rg-card render ============

old_desktop_card_start = "                          {/* Desktop Phong Card - Redesign as lighter floating card */}\n                          <div className={`rg-card ${phong.noAds ? 'is-banca ' : (phong.ten && phong.ten.toUpperCase().includes('PA') ? 'is-pa ' : '')}anim-in${glowCls(pPct)}`} style={{ animationDelay: `${pi * 60}ms` }}>"

old_desktop_card_end = "                          </div>\n\n                        {/* AD Cards (Mobile) - HIDDEN, replaced by rg-ad-table inside rg-card */}"

d_start = src.find(old_desktop_card_start)
d_end = src.find(old_desktop_card_end, d_start)
if d_start < 0 or d_end < 0:
    print("ERROR: Cannot find desktop rg-card block")
    exit(1)

new_desktop_block = '''                          {/* Desktop Phong Card - Redesign as lighter floating card */}
                          <div className={`rg-card ${phong.noAds ? 'is-banca ' : ''}anim-in${glowCls(pPct)}`} style={{ animationDelay: `${pi * 60}ms` }}>
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
                            {/* Summary 4 stats: Lượt HĐ / Tuyển dụng / HĐ chuẩn / Tỷ trọng IP (BỎ AFYP) */}
                            <div className="rg-summary">
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
                              <div className="rg-sum-cell">
                                <div className="rg-sum-label">Tỷ trọng IP</div>
                                <div className="rg-sum-val ip">{fmtTyTrong(phong.tyTrong)}</div>
                              </div>
                            </div>
                            {/* Thin separator */}
                            <div className="rg-divider" />
                            {/* AD Table */}
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

                        {/* AD Cards (Mobile) - HIDDEN, replaced by rg-ad-table inside rg-card */}'''

src = src[:d_start] + new_desktop_block + src[d_end + len(old_desktop_card_end):]

# ============ WRITE OUTPUT ============
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(src)

print("OK: kpi/page.tsx updated with v2 redesign")
