// Migrate existing base64 posters in Setting → PosterImage table (binary) + URL in Setting.
// After migration, /api/settings response size drops from ~16.9 MB to ~50 KB.
//
// Run AFTER deploying the new /api/poster-image endpoints.
//
// Usage: node scripts/migrate-posters-to-bytea.js

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://nc-link.vercel.app';

async function fetchJson(path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, opts);
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`${path} → HTTP ${r.status}: ${txt.slice(0, 200)}`);
  }
  return r.json();
}

async function putSettings(payload) {
  const r = await fetch(`${BASE}/api/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`PUT /api/settings → HTTP ${r.status}: ${txt.slice(0, 200)}`);
  }
  return r.json();
}

async function main() {
  console.log(`=== Migration: base64 posters → PosterImage (BYTEA) ===`);
  console.log(`Target: ${BASE}`);
  console.log();

  // 1. Fetch current settings
  console.log(`Fetching /api/settings...`);
  const t0 = Date.now();
  const settings = await fetchJson('/api/settings');
  const t1 = Date.now();
  const totalSize = JSON.stringify(settings).length;
  console.log(`  Loaded in ${t1 - t0}ms, size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log();

  // 2. Find all poster keys with base64 data
  const posterKeys = Object.keys(settings).filter(k =>
    k.startsWith('saoviet-poster-') || k.startsWith('clbsv-poster-')
  );
  console.log(`=== Found ${posterKeys.length} poster entries ===`);
  posterKeys.forEach(k => {
    const v = String(settings[k] || '');
    const isDataUrl = v.startsWith('data:image/');
    const isApiUrl = v.startsWith('/api/poster-image/');
    const sizeLabel = isDataUrl ? `${(v.length / 1024 / 1024).toFixed(2)} MB base64` :
                      isApiUrl ? 'URL (already migrated)' :
                      v ? `${v.length} bytes (unknown format)` : '(empty)';
    console.log(`  ${k}: ${sizeLabel}`);
  });
  console.log();

  // 3. For each base64 poster, upload to PosterImage table
  let migrated = 0, skipped = 0, failed = 0;
  for (const key of posterKeys) {
    const value = String(settings[key] || '');
    if (!value) {
      console.log(`  [SKIP] ${key}: empty value`);
      skipped++;
      continue;
    }
    if (value.startsWith('/api/poster-image/')) {
      console.log(`  [SKIP] ${key}: already migrated`);
      skipped++;
      continue;
    }
    if (!value.startsWith('data:image/')) {
      console.log(`  [SKIP] ${key}: unknown format (not data:image/...)`);
      skipped++;
      continue;
    }

    console.log(`  [MIGRATE] ${key}: uploading ${(value.length / 1024 / 1024).toFixed(2)} MB base64...`);
    try {
      // 3a. Upload base64 → PosterImage BYTEA
      const upRes = await fetchJson('/api/poster-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, dataBase64: value }),
      });
      console.log(`    ✓ Stored as binary (${(upRes.sizeBytes / 1024).toFixed(0)} KB), URL: ${upRes.url}`);

      // 3b. Update Setting: replace base64 with short URL
      await putSettings({ [key]: upRes.url });
      console.log(`    ✓ Setting updated: base64 → "${upRes.url}"`);
      migrated++;
    } catch (e) {
      console.error(`    ✗ FAILED: ${e.message}`);
      failed++;
    }
  }

  console.log();
  console.log(`=== Migration summary ===`);
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Failed:   ${failed}`);

  // 4. Verify: fetch settings again, measure new size
  if (migrated > 0) {
    console.log();
    console.log(`=== Verifying ===`);
    const t2 = Date.now();
    const newSettings = await fetchJson('/api/settings');
    const t3 = Date.now();
    const newSize = JSON.stringify(newSettings).length;
    console.log(`  /api/settings size BEFORE: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  /api/settings size AFTER:  ${(newSize / 1024).toFixed(1)} KB`);
    console.log(`  Load time BEFORE: ${t1 - t0}ms`);
    console.log(`  Load time AFTER:  ${t3 - t2}ms`);
    console.log(`  Reduction: ${((1 - newSize / totalSize) * 100).toFixed(2)}% smaller`);
  }

  // 5. Test that poster images still load via new URL
  console.log();
  console.log(`=== Testing poster image URLs ===`);
  const finalSettings = await fetchJson('/api/settings');
  for (const key of posterKeys) {
    const v = String(finalSettings[key] || '');
    if (!v) {
      console.log(`  ${key}: (empty)`);
      continue;
    }
    if (v.startsWith('/api/poster-image/')) {
      const r = await fetch(`${BASE}${v}`);
      const ct = r.headers.get('content-type') || '';
      const cl = r.headers.get('content-length') || '?';
      const cc = r.headers.get('cache-control') || '';
      console.log(`  ${key}: HTTP ${r.status} | ${ct} | ${cl} bytes | cache: ${cc}`);
    } else {
      console.log(`  ${key}: still using old format (${v.slice(0, 30)}...)`);
    }
  }

  console.log();
  console.log(`=== DONE ===`);
}

main().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
