// Trigger re-sync from Google Sheets source to update DB
const BASE = 'https://nc-link.vercel.app';

async function main() {
  // 1. Get shared link from settings
  const settingsResp = await fetch(`${BASE}/api/settings`);
  const settings = await settingsResp.json();
  const rawLink = settings['saoviet-link-shared'] || '';
  // The setting may have multiple URLs concatenated — extract the first /d/<id>/ form
  const m = String(rawLink).match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (!m) { console.log('Cannot extract spreadsheet ID from:', rawLink); return; }
  const spreadsheetId = m[1];
  const cleanLink = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  console.log('Using clean link:', cleanLink);

  // 2. Call sync-all API
  console.log('\nTriggering sync-all...');
  const syncResp = await fetch(`${BASE}/api/saoviet-data/sync-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ link: cleanLink }),
  });
  const syncData = await syncResp.json();
  console.log('Status:', syncResp.status);
  console.log('Result:', JSON.stringify(syncData, null, 2));

  // 3. Verify Kim Ngân's data after sync
  console.log('\n=== Verifying Kim Ngân after sync ===');
  const tnTdResp = await fetch(`${BASE}/api/saoviet-data?program=tn-td`);
  const tnTdRows = await tnTdResp.json();
  const kimNgan = tnTdRows.find(r => String(r.agentCode || '').toLowerCase() === 'd1041a3i8e');
  if (kimNgan) {
    console.log(`  Name: ${kimNgan.agentName}`);
    console.log(`  AgentCode: ${kimNgan.agentCode}`);
    console.log(`  FYP TVVm: ${kimNgan.fypTVVm.toLocaleString('vi-VN')}`);
    console.log(`  HĐC: ${kimNgan.slTvvmHDC}`);
    console.log(`  Expected: 596.067.508 / 13`);
    console.log(`  Match: ${kimNgan.fypTVVm === 596067508 && kimNgan.slTvvmHDC === 13 ? 'YES ✓' : 'NO ✗'}`);
  } else {
    console.log('  NOT FOUND');
  }

  // 4. Show top 5 to verify sort order
  console.log('\n=== Top 5 TN-TD after sync (sorted by FYP TVVm desc) ===');
  tnTdRows
    .filter(r => (Number(r.fypTVVm) || 0) > 0)
    .sort((a, b) => (Number(b.fypTVVm) || 0) - (Number(a.fypTVVm) || 0))
    .slice(0, 5)
    .forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.agentName} | ${r.agentCode} | FYP: ${Number(r.fypTVVm).toLocaleString('vi-VN')} | HĐC: ${r.slTvvmHDC}`);
    });
}

main().catch(e => { console.error(e); process.exit(1); });
