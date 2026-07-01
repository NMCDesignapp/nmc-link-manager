// Fetch the source Google Sheet CSV directly and check Kim Ngân's row
// to determine if (a) stale DB data, (b) parsing bug, or (c) other issue

async function main() {
  // 1. Get the shared link from settings
  const settingsResp = await fetch('https://nc-link.vercel.app/api/settings');
  const settings = await settingsResp.json();
  console.log('=== All settings keys ===');
  console.log(Object.keys(settings));

  // Find saoviet-link-shared
  const sharedLink = settings['saoviet-link-shared'] || settings['saovietSharedLink'];
  console.log('\n=== Shared link ===');
  console.log(sharedLink);

  if (!sharedLink) {
    console.log('No shared link found — checking all settings for "saoviet" keys:');
    Object.entries(settings).forEach(([k, v]) => {
      if (k.toLowerCase().includes('saoviet') || k.toLowerCase().includes('sao-viet')) {
        console.log(`  ${k} = ${v}`);
      }
    });
    return;
  }

  // 2. Extract spreadsheet ID
  const m = String(sharedLink).match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (!m) { console.log('Cannot extract spreadsheet ID'); return; }
  const spreadsheetId = m[1];
  console.log(`\nSpreadsheet ID: ${spreadsheetId}`);

  // 3. Try fetching htmlembed to discover gids
  const htmlembedUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlembed`;
  console.log(`\n=== Fetching ${htmlembedUrl} ===`);
  const htmlResp = await fetch(htmlembedUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  console.log(`Status: ${htmlResp.status}`);
  const html = await htmlResp.text();
  console.log(`Length: ${html.length} chars`);

  // Find all gids
  const found = {};
  const re = /name:\s*"([^"]+)"[^}]*?gid:\s*"(-?\d+)"/g;
  let match;
  while ((match = re.exec(html)) !== null) {
    found[match[1].trim().toLowerCase()] = match[2];
  }
  console.log(`\nDiscovered gids:`, found);

  // Try default gids as fallback
  const defaultGids = {
    'ca-nhan': '681352635',
    'tn-ktm': '1078354882',
    'tn-td': '1521644652',
  };

  // 4. Fetch tn-td CSV
  const tnTdGid = found['tn-td'] || found['tn td'] || defaultGids['tn-td'];
  console.log(`\n=== Fetching tn-td CSV (gid=${tnTdGid}) ===`);
  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${tnTdGid}`;
  const csvResp = await fetch(csvUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  console.log(`Status: ${csvResp.status}`);
  const csv = await csvResp.text();
  console.log(`Length: ${csv.length} chars`);
  console.log(`\nFirst 500 chars:\n${csv.slice(0, 500)}`);

  // Parse CSV manually
  function parseLine(line) {
    const out = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') { inQ = false; }
        else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ',') { out.push(cur); cur = ''; }
        else cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  const lines = csv.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim() !== '');
  console.log(`\nTotal rows in CSV: ${lines.length}`);

  // Find Kim Ngân rows
  console.log(`\n=== Rows containing "Kim Ngân" or "D1041A3I8E" ===`);
  lines.forEach((line, i) => {
    if (line.toLowerCase().includes('kim ngân') || line.toLowerCase().includes('kim ngan') || line.toLowerCase().includes('d1041a3i8e')) {
      const cells = parseLine(line);
      console.log(`Row ${i + 1}: ${cells.length} cells`);
      cells.forEach((c, j) => console.log(`  col${j}: "${c}"`));
    }
  });

  // Also show header row (if any)
  console.log(`\n=== First row (header?) ===`);
  if (lines.length > 0) {
    const cells = parseLine(lines[0]);
    cells.forEach((c, j) => console.log(`  col${j}: "${c}"`));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
