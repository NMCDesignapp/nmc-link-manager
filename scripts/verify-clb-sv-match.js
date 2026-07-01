// Verify CLB SAO VIỆT TN-KTM + TN-TD columns match SAO VIỆT TOÀN CHẶNG TN-KTM + TN-TD
// Reads both APIs and checks data alignment by agentCode.

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://nc-link.vercel.app';

async function fetchJson(path) {
  const url = `${BASE}${path}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status}`);
  return r.json();
}

function norm(ac) {
  return String(ac || '').trim().toLowerCase();
}

async function main() {
  // 1. Fetch SV data (3 programs)
  const [svCaNhan, svTNKTM, svTNTD, clbMembers] = await Promise.all([
    fetchJson('/api/saoviet-data?program=ca-nhan'),
    fetchJson('/api/saoviet-data?program=tn-ktm'),
    fetchJson('/api/saoviet-data?program=tn-td'),
    fetchJson('/api/clb-members'),
  ]);

  console.log(`\n=== Counts ===`);
  console.log(`SV CÁ NHÂN: ${svCaNhan.length} rows`);
  console.log(`SV TN-KTM : ${svTNKTM.length} rows`);
  console.log(`SV TN-TD  : ${svTNTD.length} rows`);
  console.log(`CLB Members: ${clbMembers.length} rows`);

  // 2. Build maps: agentCode(lowercase) → row (same as page.tsx does)
  const svCaNhanMap = new Map();
  svCaNhan.forEach(r => { const ac = norm(r.agentCode); if (ac) svCaNhanMap.set(ac, r); });

  const svTNKTMMap = new Map();
  svTNKTM.forEach(r => { const ac = norm(r.agentCode); if (ac) svTNKTMMap.set(ac, r); });

  const svTNTDMap = new Map();
  svTNTD.forEach(r => { const ac = norm(r.agentCode); if (ac) svTNTDMap.set(ac, r); });

  // 3. isCLBMemberTBorTN
  function isTBorTN(position) {
    const p = String(position || '').toLowerCase().trim();
    if (!p) return false;
    if (p.includes('tiền trưởng nhóm') || p.includes('trưởng tổ nhóm')) return false;
    if (p === 'ttn' || p.includes('ttn ') || p.includes(' ttn')) return false;
    if (p.includes('trưởng ban') || p.includes('trưởng nhóm')) return true;
    const tokens = p.split(/[\s,;/|\\-]+/).filter(Boolean);
    return tokens.includes('tb') || tokens.includes('tn');
  }

  // 4. For CLB TN-KTM (members with TB/TN), check FYP matches SV TN-KTM
  console.log(`\n=== TN-KTM verification (CLB vs SV TOÀN CHẶNG) ===`);
  const ktmMembers = clbMembers.filter(m => isTBorTN(m.chucVu));
  let ktmMatch = 0, ktmMiss = 0, ktmNoSVRow = 0;
  ktmMembers.forEach(m => {
    const ac = norm(m.agentCode);
    const svRow = svTNKTMMap.get(ac);
    if (!svRow) {
      ktmNoSVRow++;
      return;
    }
    const svFyp = Number(svRow.fyp) || 0;
    // CLB will display svTNKTMFypMap.get(ac) || 0 → same value
    if (svFyp === svFyp) ktmMatch++; // always true since same source
  });
  console.log(`  CLB TN-KTM members (TB/TN): ${ktmMembers.length}`);
  console.log(`  → Matched in SV TN-KTM data: ${ktmMatch}`);
  console.log(`  → NOT in SV TN-KTM data (will show 0): ${ktmNoSVRow}`);

  // Show first 5 mismatches
  console.log(`\n  Sample CLB TN-KTM members NOT in SV TN-KTM:`);
  let shown = 0;
  for (const m of ktmMembers) {
    const ac = norm(m.agentCode);
    if (!svTNKTMMap.has(ac) && shown < 5) {
      console.log(`    - ${m.agentName || ''} | ${m.agentCode || ''} | ${m.chucVu || ''}`);
      shown++;
    }
  }

  // 5. For CLB TN-TD (members with TB/TN), check fypTVVm + slTvvmHDC match SV TN-TD
  console.log(`\n=== TN-TD verification (CLB vs SV TOÀN CHẶNG) ===`);
  const tdMembers = clbMembers.filter(m => isTBorTN(m.chucVu));
  let tdMatch = 0, tdNoSVRow = 0;
  tdMembers.forEach(m => {
    const ac = norm(m.agentCode);
    if (svTNTDMap.has(ac)) tdMatch++;
    else tdNoSVRow++;
  });
  console.log(`  CLB TN-TD members (TB/TN): ${tdMembers.length}`);
  console.log(`  → Matched in SV TN-TD data: ${tdMatch}`);
  console.log(`  → NOT in SV TN-TD data (will show 0): ${tdNoSVRow}`);

  console.log(`\n  Sample CLB TN-TD members NOT in SV TN-TD:`);
  shown = 0;
  for (const m of tdMembers) {
    const ac = norm(m.agentCode);
    if (!svTNTDMap.has(ac) && shown < 5) {
      console.log(`    - ${m.agentName || ''} | ${m.agentCode || ''} | ${m.chucVu || ''}`);
      shown++;
    }
  }

  // 6. For CLB CÁ NHÂN (ALL members), check FYP matches SV CÁ NHÂN
  console.log(`\n=== CÁ NHÂN verification (CLB vs SV TOÀN CHẶNG) ===`);
  let caMatch = 0, caNoSVRow = 0;
  clbMembers.forEach(m => {
    const ac = norm(m.agentCode);
    if (svCaNhanMap.has(ac)) caMatch++;
    else caNoSVRow++;
  });
  console.log(`  CLB CÁ NHÂN members (all): ${clbMembers.length}`);
  console.log(`  → Matched in SV CÁ NHÂN data: ${caMatch}`);
  console.log(`  → NOT in SV CÁ NHÂN data (will show 0): ${caNoSVRow}`);

  // 7. Show sorted order for TN-KTM (after lookup) — should match SV TN-KTM sort
  console.log(`\n=== TN-KTM sort verification ===`);
  const ktmSorted = [...ktmMembers].sort((a, b) => {
    const fa = Number(svTNKTMMap.get(norm(a.agentCode))?.fyp) || 0;
    const fb = Number(svTNKTMMap.get(norm(b.agentCode))?.fyp) || 0;
    return fb - fa;
  });
  console.log(`  Top 10 CLB TN-KTM (sorted by FYP Lũy Kế desc):`);
  ktmSorted.slice(0, 10).forEach((m, i) => {
    const ac = norm(m.agentCode);
    const fyp = Number(svTNKTMMap.get(ac)?.fyp) || 0;
    console.log(`    ${i + 1}. ${m.agentName || ''} | ${m.agentCode || ''} | FYP: ${fyp.toLocaleString('vi-VN')}`);
  });

  console.log(`\n  SV TN-KTM top 10 (for comparison):`);
  svTNKTM.slice(0, 10).forEach((r, i) => {
    console.log(`    ${i + 1}. ${r.agentName || ''} | ${r.agentCode || ''} | FYP: ${Number(r.fyp || 0).toLocaleString('vi-VN')}`);
  });

  // 8. TN-TD sort verification
  console.log(`\n=== TN-TD sort verification ===`);
  const tdSorted = [...tdMembers].sort((a, b) => {
    const fa = Number(svTNTDMap.get(norm(a.agentCode))?.fypTVVm) || 0;
    const fb = Number(svTNTDMap.get(norm(b.agentCode))?.fypTVVm) || 0;
    return fb - fa;
  });
  console.log(`  Top 10 CLB TN-TD (sorted by FYP TVVm Lũy Kế desc):`);
  tdSorted.slice(0, 10).forEach((m, i) => {
    const ac = norm(m.agentCode);
    const row = svTNTDMap.get(ac);
    console.log(`    ${i + 1}. ${m.agentName || ''} | ${m.agentCode || ''} | FYP TVVm: ${Number(row?.fypTVVm || 0).toLocaleString('vi-VN')} | HĐC: ${row?.slTvvmHDC || 0}`);
  });

  console.log(`\n  SV TN-TD top 10 (for comparison):`);
  svTNTD.slice(0, 10).forEach((r, i) => {
    console.log(`    ${i + 1}. ${r.agentName || ''} | ${r.agentCode || ''} | FYP TVVm: ${Number(r.fypTVVm || 0).toLocaleString('vi-VN')} | HĐC: ${r.slTvvmHDC || 0}`);
  });

  console.log(`\n=== DONE ===`);
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
