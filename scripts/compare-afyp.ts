#!/usr/bin/env node
/* Compare AFYP between KPI page and quan-ly page using live API data */
// Use built-in fetch (Node 18+)

const PROD = 'https://nc-link.vercel.app';

async function getJSON(path: string): Promise<any> {
  const res = await fetch(PROD + path);
  return await res.json();
}

(async () => {
  console.log('Fetching contracts...');
  const contracts: any[] = await getJSON('/api/contracts');
  console.log(`Total contracts: ${contracts.length}`);

  // Replicate getDoanhSoMonth
  const getDoanhSoMonth = (c: any): Date => {
    const issueD = c.issueDate ? new Date(c.issueDate) : null;
    if (issueD && !isNaN(issueD.getTime())) return issueD;
    return new Date(c.effectiveDate);
  };

  const currentYear = 2026;
  const yearContracts = contracts.filter(c => {
    const d = getDoanhSoMonth(c);
    return !isNaN(d.getTime()) && d.getFullYear() === currentYear;
  });
  console.log(`Year ${currentYear} contracts: ${yearContracts.length}`);

  // ============ QUAN-LY: totalRevenueAFYP (line 3488) ============
  // Period = year (all 12 months)
  const totalRevenueAFYP_quanLy = yearContracts.reduce((s, c) => s + (c.afyp || 0), 0);

  // ============ KPI: totalAFYP (sum of phongs, each phong sum of ADs) ============
  // Need structure to match ADs
  console.log('Fetching structure (AD, Phong)...');
  const adStruct: any[] = await getJSON('/api/structure/ad');
  const phongStruct: any[] = await getJSON('/api/structure/phong');
  console.log(`ADs: ${adStruct.length}, Phongs: ${phongStruct.length}`);

  // normKey — same as kpi page
  const normKey = (s: string): string => (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  const AD_FULL_NAME_MAP: Record<string, string> = {
    'AD Uy': 'Trương Quốc Uy',
    'AD Trí': 'Lê Quang Trọng Trí',
    'AD Có': 'Nguyễn Văn Có',
    'AD Long': 'Nguyễn Thanh Long',
    'AD Trang': 'Đàm Thị Hương Trang',
    'AD Danh': 'Đặng Công Danh',
  };
  const resolveAdName = (adKey: string): string => AD_FULL_NAME_MAP[adKey] || adKey;

  // PA/Banca detection helpers (defined BEFORE use — same as kpi page line 2509-2519)
  const isPaCode = (code: string): boolean => {
    const c = String(code || '').trim();
    return c === 'PA' || c === 'U104101014' || c.toLowerCase() === 'pa';
  };
  const isBancaCode = (code: string): boolean => {
    const c = String(code || '').trim();
    return c === 'Banca' || c === 'A473DSO000' || c === 'DSO' || c.toLowerCase() === 'banca' || c.toLowerCase() === 'dso';
  };
  const isPaOrBanca = (code: string): boolean => isPaCode(code) || isBancaCode(code);

  // For each AD, find matching contracts (same logic as kpi page line 2603-2608)
  // BUT: skip ADs whose maPhong is PA/Banca (those are handled via Banca-PA phong path)
  let kpiTotalAFYP = 0;
  const adAfyp = new Map<string, { name: string; afyp: number; count: number }>();

  // Detect PA/Banca phongs (same as kpi page line 2550)
  const paBancaPhongCodes = new Set<string>();
  phongStruct.forEach(p => {
    if (isPaOrBanca(p.maPhong) || isPaOrBanca(p.tenPhong)) paBancaPhongCodes.add(p.maPhong);
  });

  adStruct.forEach(ad => {
    // Skip ADs that belong to PA/Banca phong (handled via Banca-PA path)
    if (paBancaPhongCodes.has(ad.maPhong)) return;

    const adKey = ad.tenAD;
    const adNormKey = normKey(adKey);
    const matchName = resolveAdName(adKey);
    const matchNormKey = normKey(matchName);

    const adContracts = yearContracts.filter(c => {
      const cAdNorm = normKey(c.ad || '');
      if (!cAdNorm) return false;
      return cAdNorm === adNormKey || cAdNorm.includes(adNormKey) || adNormKey.includes(cAdNorm)
        || cAdNorm === matchNormKey || cAdNorm.includes(matchNormKey) || matchNormKey.includes(cAdNorm);
    });

    const afyp = adContracts.reduce((s: number, c: any) => s + (c.afyp || 0), 0);
    kpiTotalAFYP += afyp;
    adAfyp.set(ad.maAD, { name: adKey, afyp, count: adContracts.length });
  });

  let bancaPaAfyp = 0;
  let bancaPaCount = 0;
  const bancaPaContractIds = new Set<string>();
  const bancaPaMatchedAdValues: Record<string, { count: number; afyp: number }> = {};
  phongStruct.forEach(p => {
    if (isPaOrBanca(p.maPhong) || isPaOrBanca(p.tenPhong)) {
      const paContracts = yearContracts.filter(c => {
        if (isPaOrBanca(c.nhom || '') || isPaOrBanca(c.ban || '') || isPaOrBanca(c.maNhom || '')) return true;
        const adNorm = normKey(c.ad || '');
        if (adNorm.includes('bancapa') || adNorm.includes('banca')) return true;
        const banNorm = normKey(c.ban || '');
        if (banNorm.includes('pgb')) return true;
        const nhomNorm = normKey(c.nhom || '');
        if (nhomNorm.includes('banca') || nhomNorm.includes('dso')) return true;
        const maNhomNorm = normKey(c.maNhom || '');
        if (maNhomNorm.includes('banca') || maNhomNorm.includes('dso')) return true;
        return false;
      });
      paContracts.forEach(c => {
        if (!bancaPaContractIds.has(c.id)) {
          bancaPaContractIds.add(c.id);
          bancaPaAfyp += (c.afyp || 0);
          bancaPaCount++;
          const adKey = (c.ad || '(empty)') as string;
          if (!bancaPaMatchedAdValues[adKey]) bancaPaMatchedAdValues[adKey] = { count: 0, afyp: 0 };
          bancaPaMatchedAdValues[adKey].count++;
          bancaPaMatchedAdValues[adKey].afyp += (c.afyp || 0);
        }
      });
    }
  });

  console.log('\n========== BANCA-PA MATCHED CONTRACTS (BY c.ad) ==========');
  Object.entries(bancaPaMatchedAdValues)
    .sort((a, b) => b[1].afyp - a[1].afyp)
    .forEach(([ad, info]) => {
      console.log(`  "${ad}" → ${info.count} HĐ, ${info.afyp.toLocaleString('vi-VN')} đ`);
    });
  console.log(`TOTAL Banca-PA: ${bancaPaCount} HĐ, ${bancaPaAfyp.toLocaleString('vi-VN')} đ`);

  const kpiTotalWithBancaPa = kpiTotalAFYP + bancaPaAfyp;

  console.log('\n========== AFYP COMPARISON ==========');
  console.log(`QUAN-LY (Σ all year contracts): ${totalRevenueAFYP_quanLy.toLocaleString('vi-VN')} đ`);
  console.log(`KPI (Σ AD-matched only):        ${kpiTotalAFYP.toLocaleString('vi-VN')} đ`);
  console.log(`KPI (AD + Banca-PA):            ${kpiTotalWithBancaPa.toLocaleString('vi-VN')} đ`);
  console.log(`DIFF (quan-ly − KPI):           ${(totalRevenueAFYP_quanLy - kpiTotalWithBancaPa).toLocaleString('vi-VN')} đ`);

  // Find contracts NOT matched by any AD or Banca-PA
  const matchedIds = new Set<string>();
  adStruct.forEach(ad => {
    const adKey = ad.tenAD;
    const adNormKey = normKey(adKey);
    const matchName = resolveAdName(adKey);
    const matchNormKey = normKey(matchName);
    yearContracts.forEach(c => {
      const cAdNorm = normKey(c.ad || '');
      if (!cAdNorm) return;
      if (cAdNorm === adNormKey || cAdNorm.includes(adNormKey) || adNormKey.includes(cAdNorm)
        || cAdNorm === matchNormKey || cAdNorm.includes(matchNormKey) || matchNormKey.includes(cAdNorm)) {
        matchedIds.add(c.id);
      }
    });
  });
  // Add banca-pa ids
  bancaPaContractIds.forEach(id => matchedIds.add(id));

  const unmatched = yearContracts.filter(c => !matchedIds.has(c.id));
  const unmatchedAfyp = unmatched.reduce((s, c) => s + (c.afyp || 0), 0);

  console.log('\n========== UNMATCHED CONTRACTS ==========');
  console.log(`Count: ${unmatched.length} / ${yearContracts.length}`);
  console.log(`Total AFYP of unmatched: ${unmatchedAfyp.toLocaleString('vi-VN')} đ`);

  // Group unmatched by c.ad value
  const byAd: Record<string, { count: number; afyp: number }> = {};
  unmatched.forEach(c => {
    const adKey = (c.ad || '(empty)') as string;
    if (!byAd[adKey]) byAd[adKey] = { count: 0, afyp: 0 };
    byAd[adKey].count++;
    byAd[adKey].afyp += (c.afyp || 0);
  });

  console.log('\nUnmatched contracts grouped by c.ad value:');
  Object.entries(byAd)
    .sort((a, b) => b[1].afyp - a[1].afyp)
    .slice(0, 25)
    .forEach(([ad, info]) => {
      console.log(`  "${ad}" → ${info.count} HĐ, ${info.afyp.toLocaleString('vi-VN')} đ`);
    });

  // Show AD match table for debugging
  console.log('\n========== AD MATCH TABLE ==========');
  console.log('AD short name → resolved full name → match count/afyp:');
  adAfyp.forEach((info) => {
    console.log(`  ${info.name.padEnd(10)} → ${resolveAdName(info.name).padEnd(25)} → ${info.count} HĐ, ${info.afyp.toLocaleString('vi-VN')} đ`);
  });

  // Also check unique c.ad values in DB
  const allAdValues: Record<string, number> = {};
  yearContracts.forEach(c => {
    const ad = (c.ad || '(empty)') as string;
    allAdValues[ad] = (allAdValues[ad] || 0) + 1;
  });
  console.log('\n========== ALL UNIQUE c.ad VALUES (year 2026) ==========');
  Object.entries(allAdValues)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .forEach(([ad, count]) => {
      console.log(`  "${ad}": ${count} HĐ`);
    });
})().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
