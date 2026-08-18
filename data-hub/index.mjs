import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const AGENT_VERSION = '2.1.1-20260818';
const root = path.dirname(fileURLToPath(import.meta.url));
const configPath = process.env.NMC_DATA_HUB_CONFIG || path.join(root, 'data-hub.config.json');
const statePath = path.join(root, '.nmc-data-hub-state.json');
const activateOnly = process.argv.includes('--activate');
const diagnoseOnly = process.argv.includes('--diagnose');
const once = process.argv.includes('--once') || activateOnly || diagnoseOnly;
const force = process.argv.includes('--force') || process.argv.includes('--once');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { return fallback; }
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeSource(source) {
  const normalized = { ...source };
  if (!normalized.kind && normalized.id === 'tamthu-detail-view') normalized.kind = 'tamthu-detail';
  if (normalized.kind === 'tamthu-detail-view') normalized.kind = 'tamthu-detail';
  return normalized;
}

function readWorkbook(file) {
  try {
    return XLSX.readFile(file, { raw: false, cellDates: false });
  } catch (error) {
    throw new Error(`Không đọc được file ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function compactWorksheetValues(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, blankrows: false })
    .filter(row => row.some(cell => String(cell ?? '').trim() !== ''));
}

function csvFromWorkbook(file, sheetName) {
  const workbook = readWorkbook(file);
  const name = sheetName || workbook.SheetNames[0];
  const sheet = workbook.Sheets[name];
  if (!sheet) throw new Error(`Không tìm thấy sheet "${name}" trong ${file}. Có: ${workbook.SheetNames.join(', ')}`);

  // Excel có thể giữ used-range tới hàng nghìn dòng chỉ vì định dạng cũ.
  // Nếu sheet_to_csv trực tiếp, các hàng trống vẫn thành CSV có dấu phẩy và
  // bị bộ đếm hiểu nhầm là dữ liệu. Chỉ xuất các hàng thực sự có giá trị.
  const values = compactWorksheetValues(sheet);
  if (values.length === 0) return '';
  return XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(values), { FS: ',', RS: '\n', forceQuotes: true });
}

function bangkokYearMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit',
  }).formatToParts(new Date());
  return `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}`;
}

function historicalRevenueFromWorkbook(file) {
  const workbook = readWorkbook(file);
  const currentMonth = bangkokYearMonth();
  const year = currentMonth.slice(0, 4);
  let header = '';
  const rows = [];
  const months = [];

  for (const name of workbook.SheetNames) {
    if (!/^(?:[1-9]|1[0-2])$/.test(name)) continue;
    const month = `${year}-${name.padStart(2, '0')}`;
    if (month === currentMonth) continue;
    const values = compactWorksheetValues(workbook.Sheets[name]);
    if (values.length < 2) continue;
    const csv = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(values), { FS: ',', RS: '\n', forceQuotes: true });
    const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
    if (!header) header = lines[0];
    rows.push(...lines.slice(1));
    months.push(month);
  }

  return { csv: header ? [header, ...rows].join('\n') : '', months };
}

function rowsFromWorkbook(file, sheetName) {
  const workbook = readWorkbook(file);
  const name = sheetName || workbook.SheetNames[0];
  const sheet = workbook.Sheets[name];
  if (!sheet) throw new Error(`Không tìm thấy sheet "${name}" trong ${file}. Có: ${workbook.SheetNames.join(', ')}`);
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
}

async function inputFromSource(source) {
  if (!source?.file) throw new Error(`Nguồn "${source?.id || 'không tên'}" chưa khai báo file.`);
  try {
    await fs.access(source.file);
  } catch {
    throw new Error(`Không tìm thấy file: ${source.file}`);
  }

  if (source.kind === 'revenue-history') return historicalRevenueFromWorkbook(source.file);
  if (source.kind === 'structure' || source.kind === 'tamthu-detail') return rowsFromWorkbook(source.file, source.sheet);

  const extension = path.extname(source.file).toLowerCase();
  if (extension === '.csv') return fs.readFile(source.file, 'utf8');
  if (extension === '.xlsx' || extension === '.xls' || extension === '.xlsm') return csvFromWorkbook(source.file, source.sheet);
  throw new Error(`Định dạng chưa hỗ trợ: ${extension}. Hãy dùng CSV hoặc Excel.`);
}

function hasData(input, source) {
  if (source.kind === 'structure' || source.kind === 'tamthu-detail') return Array.isArray(input) && input.length > 0;
  const csv = source.kind === 'revenue-history' ? input?.csv : input;
  if (typeof csv !== 'string') return false;
  const rows = csv.split(/\r?\n/).filter(line => line.trim() !== '');
  const minimum = (source.kind === 'revenue' || source.kind === 'revenue-history') ? 2 : 1;
  return rows.length >= minimum;
}

function csvDataRowCount(csv) {
  if (typeof csv !== 'string') return 0;
  const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
  return Math.max(0, lines.length - 1);
}

function getToken(config) {
  return config.token || process.env[config.tokenEnv || 'NMC_DATA_HUB_TOKEN'];
}

async function postJson(config, endpoint, body, options = {}) {
  const token = getToken(config);
  if (!token) throw new Error(`Chưa có khóa kết nối. Thiết lập ${config.tokenEnv || 'NMC_DATA_HUB_TOKEN'} trên Windows.`);

  const attempts = Math.max(1, Number(options.attempts) || 3);
  const timeoutMs = Math.max(5_000, Number(options.timeoutMs) || 120_000);
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(new URL(endpoint, config.appUrl), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-nmc-data-hub-token': token,
          'x-nmc-data-hub-version': AGENT_VERSION,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) return payload;

      const message = payload?.error || payload?.details || `Máy chủ trả lỗi HTTP ${response.status}`;
      const retryable = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;
      if (!retryable || attempt === attempts) throw new Error(message);
      lastError = new Error(message);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === attempts) throw lastError;
    } finally {
      clearTimeout(timer);
    }
    await sleep(1200 * attempt);
  }

  throw lastError || new Error('Không kết nối được Main App.');
}

function validateRevenuePayload(source, input, payload) {
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    throw new Error(`Máy chủ báo lỗi đồng bộ doanh số: ${payload.errors.join('; ')}`);
  }

  if (source.replaceCurrentMonth === true) {
    const expectedMonth = bangkokYearMonth();
    const expectedRows = csvDataRowCount(input);
    const importedRows = Number(payload?.contracts ?? 0);
    if (payload?.currentMonth !== expectedMonth) {
      throw new Error(`Máy chủ xác nhận sai tháng hiện tại: cần ${expectedMonth}, nhận ${payload?.currentMonth || 'trống'}.`);
    }
    if (importedRows !== expectedRows) {
      throw new Error(`Sheet ${source.sheet || ''} có ${expectedRows} dòng nhưng máy chủ nhận ${importedRows}; sẽ tự thử lại.`);
    }
  }
}

async function importOne(config, rawSource, state, forceImport) {
  const source = normalizeSource(rawSource);
  const rawInput = await inputFromSource(source);
  const historyInput = source.kind === 'revenue-history' ? rawInput : null;
  const input = historyInput ? historyInput.csv : rawInput;

  if (!source.allowEmpty && !hasData(rawInput, source)) {
    throw new Error(`Nguồn "${source.id}" không có dữ liệu hợp lệ; không công bố bản rỗng.`);
  }

  const checksumPayload = historyInput ? JSON.stringify(historyInput) : (typeof input === 'string' ? input : JSON.stringify(input));
  const checksum = sha256(checksumPayload);
  if (!forceImport && state.sources?.[source.id]?.checksum === checksum) {
    return { id: source.id, changed: false, ok: true, count: state.sources[source.id].count ?? null };
  }

  let payload;
  if (source.kind === 'revenue') {
    payload = await postJson(config, '/api/sync', {
      source: 'nmc-data-hub', contractCsv: input, staffCsv: '', recruiterCsv: '',
      replaceCurrentRevenueMonth: source.replaceCurrentMonth === true,
    });
    validateRevenuePayload(source, input, payload);
  } else if (source.kind === 'revenue-history') {
    payload = await postJson(config, '/api/sync', {
      source: 'nmc-data-hub', contractCsv: input, staffCsv: '', recruiterCsv: '',
      replaceHistoricalRevenueMonths: historyInput.months,
    });
    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      throw new Error(`Máy chủ báo lỗi đồng bộ doanh số lịch sử: ${payload.errors.join('; ')}`);
    }
  } else if (source.kind === 'saoviet') {
    payload = await postJson(config, '/api/saoviet-data/sync', { source: 'nmc-data-hub', program: source.program, csv: input });
  } else if (source.kind === 'structure') {
    payload = await postJson(config, '/api/structure/sync', { source: 'nmc-data-hub', collection: source.collection, rows: input });
  } else if (source.kind === 'tamthu-detail') {
    payload = await postJson(config, '/api/tamthu-detail', { source: 'nmc-data-hub', rows: input });
  } else {
    throw new Error(`Nguồn "${source.id}" có kind không hợp lệ: ${source.kind}`);
  }

  state.sources ||= {};
  state.sources[source.id] = {
    checksum,
    syncedAt: new Date().toISOString(),
    count: payload.count ?? payload.contracts ?? null,
    sourceFile: source.file,
    agentVersion: AGENT_VERSION,
  };
  console.log(`✓ ${source.id}: đã đồng bộ`, payload.count ?? payload.contracts ?? '');
  return { id: source.id, changed: true, ok: true, count: payload.count ?? payload.contracts ?? null };
}

async function heartbeat(config, phase = 'heartbeat', results = undefined) {
  return postJson(config, '/api/data-hub/status', {
    phase,
    ...(results ? { results } : {}),
    agentVersion: AGENT_VERSION,
    machine: os.hostname(),
  }, { attempts: 2, timeoutMs: 30_000 });
}

async function activate(config) {
  const result = await postJson(config, '/api/data-hub/activate', {
    enabled: true,
    source: config.activationSource || 'all',
    agentVersion: AGENT_VERSION,
  });
  if (!result.enabled) throw new Error('Main App chưa bật Data Hub.');
  console.log('✓ Data Hub đã được bật trên Main App.');
  return result;
}

async function diagnose(config) {
  console.log(`NMC Data Hub v${AGENT_VERSION}`);
  console.log('Máy:', os.hostname());
  console.log('Cấu hình:', configPath);
  console.log('Main App:', config.appUrl);
  if (!getToken(config)) throw new Error(`Thiếu ${config.tokenEnv || 'NMC_DATA_HUB_TOKEN'}.`);

  const status = await heartbeat(config);
  console.log(`✓ Xác thực Main App thành công. Nguồn hiện tại: ${status.source}`);

  let failed = 0;
  for (const rawSource of config.sources) {
    const source = normalizeSource(rawSource);
    try {
      const input = await inputFromSource(source);
      if (!source.allowEmpty && !hasData(input, source)) throw new Error('không có dữ liệu hợp lệ');
      let count;
      if (source.kind === 'structure' || source.kind === 'tamthu-detail') count = Array.isArray(input) ? input.length : 0;
      else if (source.kind === 'revenue-history') count = csvDataRowCount(input.csv);
      else count = csvDataRowCount(input);
      console.log(`✓ ${source.id}: đọc được ${count} dòng — ${source.file}${source.sheet ? ` [${source.sheet}]` : ''}`);
    } catch (error) {
      failed++;
      console.error(`✗ ${source.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failed) throw new Error(`Chẩn đoán có ${failed} nguồn lỗi.`);
  console.log('✓ Toàn bộ nguồn Excel đã sẵn sàng.');
}

async function run(config, forceImport = false) {
  const sourceStatus = await heartbeat(config);
  if (!sourceStatus.enabled || sourceStatus.source !== 'data-hub') {
    console.log('⏸ Data Hub tạm dừng vì Google Sheets đang là nguồn đồng bộ.');
    return [{ id: 'data-hub', ok: true, changed: false, skipped: true, reason: 'google-active' }];
  }

  const state = await readJson(statePath, { sources: {} });
  const results = [];
  for (const rawSource of config.sources) {
    const source = normalizeSource(rawSource);
    try {
      results.push(await importOne(config, source, state, forceImport));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`✗ ${source.id}: ${message}`);
      results.push({ id: source.id, ok: false, error: message });
    }
  }

  await fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf8');
  await heartbeat(config, 'sync-complete', results);
  return results;
}

async function loadConfig() {
  const config = await readJson(configPath, null);
  if (!config?.appUrl || !Array.isArray(config.sources) || config.sources.length === 0) {
    throw new Error(`Thiếu hoặc sai cấu hình: ${configPath}`);
  }
  config.sources = config.sources.map(normalizeSource);
  return config;
}

async function main() {
  console.log(`NMC Data Hub v${AGENT_VERSION} — đồng bộ Excel với Main App`);
  const config = await loadConfig();

  if (activateOnly) return activate(config);
  if (diagnoseOnly) return diagnose(config);

  if (once) {
    const results = await run(config, force);
    if (results?.some(result => !result.ok)) process.exitCode = 1;
    return;
  }

  let stopped = false;
  const heartbeatLoop = (async () => {
    while (!stopped) {
      try { await heartbeat(config); }
      catch (error) { console.error('Heartbeat lỗi:', error instanceof Error ? error.message : String(error)); }
      await sleep(20_000);
    }
  })();

  try {
    for (;;) {
      try { await run(config, false); }
      catch (error) { console.error('Lỗi Data Hub:', error instanceof Error ? error.message : String(error)); }
      const seconds = Math.max(5, Number(config.watchIntervalSeconds) || 15);
      await sleep(seconds * 1000);
    }
  } finally {
    stopped = true;
    await heartbeatLoop.catch(() => {});
  }
}

main().catch(error => {
  console.error('Không thể khởi động Data Hub:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
