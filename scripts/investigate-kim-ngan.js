// Investigate discrepancy: Nguyễn Thị Kim Ngân
// User reports source link shows 596,067,508 FYP / 13 HĐC
// Our DB shows 611,096,849 FYP / 14 HĐC
// Find: (a) row in DB, (b) is there a duplicate? (c) sum of related rows?

const BASE = 'https://nc-link.vercel.app';

async function fetchJson(path) {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status}`);
  return r.json();
}

async function main() {
  const [svTNTD, clbMembers] = await Promise.all([
    fetchJson('/api/saoviet-data?program=tn-td'),
    fetchJson('/api/clb-members'),
  ]);

  // 1. Find all rows matching "Kim Ngân" / "Nguyễn Thị Kim Ngân" / agentCode D1041A3I8E
  console.log('=== SV TN-TD rows matching Kim Ngân ===');
  const matches = svTNTD.filter(r => {
    const name = String(r.agentName || '').toLowerCase();
    const ac = String(r.agentCode || '').toLowerCase();
    return name.includes('kim ngân') || name.includes('kim ngan') || ac === 'd1041a3i8e';
  });
  matches.forEach((r, i) => {
    console.log(`  ${i + 1}. id=${r.id} | agentCode=${r.agentCode} | name=${r.agentName}`);
    console.log(`     fypTVVm=${r.fypTVVm} | slTvvmHDC=${r.slTvvmHDC} | tvvmCount=${r.tvvmCount}`);
    console.log(`     nhomKD=${r.nhomKD} | fyp=${r.fyp}`);
    console.log(`     createdAt=${r.createdAt} | updatedAt=${r.updatedAt}`);
  });
  console.log(`  Total matches: ${matches.length}`);

  // 2. Sum of all matches
  const sumFyp = matches.reduce((s, r) => s + (Number(r.fypTVVm) || 0), 0);
  const sumHdc = matches.reduce((s, r) => s + (Number(r.slTvvmHDC) || 0), 0);
  console.log(`\n  Sum FYP TVVm (all matches): ${sumFyp.toLocaleString('vi-VN')}`);
  console.log(`  Sum HĐC    (all matches): ${sumHdc}`);

  // 3. Check duplicate agentCodes in the whole TN-TD dataset
  console.log(`\n=== Duplicate agentCodes in SV TN-TD ===`);
  const acMap = new Map();
  svTNTD.forEach(r => {
    const ac = String(r.agentCode || '').trim().toLowerCase();
    if (!ac) return;
    if (!acMap.has(ac)) acMap.set(ac, []);
    acMap.get(ac).push(r);
  });
  let dupCount = 0;
  acMap.forEach((rows, ac) => {
    if (rows.length > 1) {
      dupCount++;
      console.log(`  ${ac} (${rows[0].agentName}): ${rows.length} rows`);
      rows.forEach(r => {
        console.log(`    fypTVVm=${r.fypTVVm} | HĐC=${r.slTvvmHDC}`);
      });
    }
  });
  console.log(`  Total duplicate agentCodes: ${dupCount}`);

  // 4. Find CLB member row for Kim Ngân
  console.log(`\n=== CLB member row for Kim Ngân ===`);
  const clbMatch = clbMembers.find(m => {
    const name = String(m.agentName || '').toLowerCase();
    const ac = String(m.agentCode || '').toLowerCase();
    return name.includes('kim ngân') || name.includes('kim ngan') || ac === 'd1041a3i8e';
  });
  if (clbMatch) {
    console.log(`  id=${clbMatch.id} | agentCode=${clbMatch.agentCode} | name=${clbMatch.agentName}`);
    console.log(`  nhom=${clbMatch.nhom} | chucVu=${clbMatch.chucVu}`);
  } else {
    console.log('  NOT FOUND');
  }

  // 5. Show total count
  console.log(`\n=== Summary ===`);
  console.log(`  SV TN-TD total rows: ${svTNTD.length}`);
  console.log(`  Unique agentCodes: ${acMap.size}`);
  console.log(`  Duplicates: ${dupCount}`);

  // 6. Compare actual numbers
  console.log(`\n=== Discrepancy analysis ===`);
  console.log(`  Source link (user):  596,067,508 FYP / 13 HĐC`);
  console.log(`  DB has:              611,096,849 FYP / 14 HĐC`);
  console.log(`  Diff:               +${611096849 - 596067508} FYP / +${14 - 13} HĐC`);
  // Maybe it's the sum of 2 rows?
  if (matches.length >= 2) {
    console.log(`\n  → Possibly: DB contains 2 rows that should be 1 — summing to (${sumFyp.toLocaleString('vi-VN')} / ${sumHdc})`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
