import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const root = path.dirname(fileURLToPath(import.meta.url));
const configPath = process.env.NMC_DATA_HUB_CONFIG || path.join(root, 'data-hub.config.json');
const statePath = path.join(root, '.nmc-data-hub-state.json');
const activateOnly = process.argv.includes('--activate');
const once = process.argv.includes('--once') || activateOnly;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { return fallback; }
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function csvFromWorkbook(file, sheetName) {
  const workbook = XLSX.readFile(file, { raw: false, cellDates: false });
  const name = sheetName || workbook.SheetNames[0];
  const sheet = workbook.Sheets[name];
  if (!sheet) throw new Error(`Không tìm thấy sheet "${name}" trong ${file}`);
  return XLSX.utils.sheet_to_csv(sheet, { FS: ',', RS: '\n', forceQuotes: true });
}

function rowsFromWorkbook(file, sheetName) {
  const workbook = XLSX.readFile(file, { raw: false, cellDates: false });
  const name = sheetName || workbook.SheetNames[0];
  const sheet = workbook.Sheets[name];
  if (!sheet) throw new Error(`Không tìm thấy sheet "${name}" trong ${file}`);
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
}

async function csvFromSource(source) {
  const extension = path.extname(source.file).toLowerCase();
  if (extension === '.csv') return fs.readFile(source.file, 'utf8');
  if (extension === '.xlsx' || extension === '.xls' || extension === '.xlsm') {
    return csvFromWorkbook(source.file, source.sheet);
  }
  throw new Error(`Định dạng chưa hỗ trợ: ${extension}. Hãy dùng CSV hoặc Excel.`);
}

function hasData(csv, source) {
  if (source.kind === 'structure') return Array.isArray(csv) && csv.length > 0;
  const rows = csv.split(/\r?\n/).filter(line => line.trim() !== '');
  const minimum = source.kind === 'revenue' ? 2 : 1;
  return rows.length >= minimum;
}

async function postJson(config, endpoint, body) {
  const token = config.token || process.env[config.tokenEnv || 'NMC_DATA_HUB_TOKEN'];
  if (!token) throw new Error(`Chưa có khóa kết nối. Thêm token trong cấu hình cục bộ hoặc biến môi trường ${config.tokenEnv || 'NMC_DATA_HUB_TOKEN'}`);

  const response = await fetch(new URL(endpoint, config.appUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-nmc-data-hub-token': token,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `Máy chủ trả lỗi HTTP ${response.status}`);
  return payload;
}

async function importOne(config, source, state, force) {
  const input = source.kind === 'structure'
    ? rowsFromWorkbook(source.file, source.sheet)
    : await csvFromSource(source);
  if (!source.allowEmpty && !hasData(input, source)) {
    throw new Error(`Nguồn "${source.id}" không có dữ liệu hợp lệ; không công bố bản rỗng.`);
  }

  const checksum = sha256(typeof input === 'string' ? input : JSON.stringify(input));
  if (!force && state.sources?.[source.id]?.checksum === checksum) {
    return { id: source.id, changed: false, ok: true, count: state.sources[source.id].count ?? null };
  }

  let payload;
  if (source.kind === 'revenue') {
    payload = await postJson(config, '/api/sync', {
      source: 'nmc-data-hub',
      contractCsv: input,
      staffCsv: '',
      recruiterCsv: '',
      replaceRevenueMonths: source.replaceMonths === true,
    });
  } else if (source.kind === 'saoviet') {
    payload = await postJson(config, '/api/saoviet-data/sync', {
      source: 'nmc-data-hub',
      program: source.program,
      csv: input,
    });
  } else if (source.kind === 'structure') {
    payload = await postJson(config, '/api/structure/sync', {
      source: 'nmc-data-hub',
      collection: source.collection,
      rows: input,
    });
  } else {
    throw new Error(`Nguồn "${source.id}" có kind không hợp lệ: ${source.kind}`);
  }

  state.sources ||= {};
  state.sources[source.id] = {
    checksum,
    syncedAt: new Date().toISOString(),
    count: payload.count ?? payload.contracts ?? null,
    sourceFile: source.file,
  };
  console.log(`✓ ${source.id}: đã đồng bộ`, payload.count ?? payload.contracts ?? '');
  return { id: source.id, changed: true, ok: true, count: payload.count ?? payload.contracts ?? null };
}

async function activate(config) {
  const result = await postJson(config, '/api/data-hub/activate', { enabled: true, source: config.activationSource || 'saoviet' });
  console.log(result.enabled ? '✓ Data Hub đã được bật trên Main App.' : 'Data Hub chưa được bật.');
}

async function run(force = false) {
  const config = await readJson(configPath, null);
  if (!config?.appUrl || !Array.isArray(config.sources) || config.sources.length === 0) {
    throw new Error(`Thiếu hoặc sai cấu hình: ${configPath}`);
  }

  if (activateOnly) return activate(config);
  const state = await readJson(statePath, { sources: {} });
  const results = [];
  for (const source of config.sources) {
    try {
      results.push(await importOne(config, source, state, force));
    } catch (error) {
      console.error(`✗ ${source.id}:`, error.message);
      results.push({ id: source.id, ok: false, error: error.message });
    }
  }
  await fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf8');

  if (config.activateAfterAllSourcesSynced && results.length && results.every(result => result.ok)) {
    await activate(config);
  }
  return results;
}

async function main() {
  console.log('NMC Data Hub — nguồn dữ liệu giai đoạn 1');
  console.log('Cấu hình:', configPath);
  if (once) {
    const results = await run(true);
    if (results?.some(result => !result.ok)) process.exitCode = 1;
    return;
  }

  for (;;) {
    try { await run(false); }
    catch (error) { console.error('Lỗi Data Hub:', error.message); }
    const config = await readJson(configPath, {});
    const seconds = Math.max(5, Number(config.watchIntervalSeconds) || 15);
    await sleep(seconds * 1000);
  }
}

main().catch(error => {
  console.error('Không thể khởi động Data Hub:', error.message);
  process.exitCode = 1;
});
