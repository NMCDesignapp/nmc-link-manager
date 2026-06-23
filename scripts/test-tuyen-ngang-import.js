/**
 * TEST SCRIPT: DS TTN Tuyển Ngang import flow
 *
 * Mục đích: Verify logic import của /api/tuyen-ngang (POST members mode)
 * chạy đúng với 5 scenarios. Logic copy Y NGUYÊN từ route.ts để đảm bảo
 * test phản ánh chính xác hành vi production.
 *
 * Chạy: node /home/z/my-project/scripts/test-tuyen-ngang-import.js
 */

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// ==================== LOGIC COPY TỪ route.ts (POST members mode) ====================
// Nguồn: /home/z/my-project/src/app/api/tuyen-ngang/route.ts (lines 144-214)

// Helper: safe date parse - ensures date string is treated as UTC midnight
function safeDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00Z');
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmy) return new Date(Date.UTC(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1])));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

async function processMembers(members, db) {
  // Loosen filter: chỉ cần agentCode (agentName sẽ được fill mặc định nếu trống)
  const data = members
    .filter((m) => m && m.agentCode && String(m.agentCode).trim())
    .map((m) => ({
      nhom: m.nhom || '',
      agentCode: String(m.agentCode).trim(),
      agentName: (m.agentName && String(m.agentName).trim()) || 'Chưa nhập',
      ngayBatDau: safeDate(m.ngayBatDau),
      ngayHieuLuc: safeDate(m.ngayHieuLuc),
      maNguoiTuyenDung: m.maNguoiTuyenDung || '',
      tenNguoiTuyenDung: m.tenNguoiTuyenDung || '',
    }));

  // Detect duplicate agentCodes within the same upload batch
  const seenCodes = new Set();
  const dedupedData = data.filter((d) => {
    if (seenCodes.has(d.agentCode)) return false;
    seenCodes.add(d.agentCode);
    return true;
  });

  if (dedupedData.length === 0) {
    return {
      status: 400,
      body: {
        error: `Không có dữ liệu hợp lệ (gốc: ${members.length} dòng, sau lọc: 0). Có thể header file không khớp — đảm bảo có cột MÃ TVV / HỌ TÊN.`,
        received: members.length,
      },
    };
  }

  let created = 0;
  let updated = 0;
  let errored = 0;
  const errors = [];
  for (const item of dedupedData) {
    try {
      const existing = await db.tuyenNgang.findUnique({ where: { agentCode: item.agentCode } });
      if (existing) {
        await db.tuyenNgang.update({ where: { agentCode: item.agentCode }, data: item });
        updated++;
      } else {
        await db.tuyenNgang.create({ data: item });
        created++;
      }
    } catch (e) {
      errored++;
      if (errors.length < 3) errors.push(`${item.agentCode}: ${e?.message || String(e)}`);
    }
  }

  // Nếu mọi dòng đều lỗi → trả 4xx để frontend hiển thị lỗi thực
  if (created + updated === 0 && errored > 0) {
    return {
      status: 500,
      body: {
        error: `Tất cả ${errored} dòng đều lỗi. Lỗi mẫu: ${errors.join(' | ')}`,
        created,
        updated,
        errored,
        errors,
      },
    };
  }

  return {
    status: 200,
    body: {
      message: `Đã nhập ${created} mới, cập nhật ${updated} TTN Tuyển Ngang`,
      count: created + updated,
      created,
      updated,
      errored,
      errors,
      duplicatesSkipped: data.length - dedupedData.length,
    },
  };
}

// ==================== MOCK DB (SQLite in-memory) ====================

async function makeMockDb() {
  const sqlite = await open({
    filename: ':memory:',
    driver: sqlite3.Database,
  });
  await sqlite.exec(`
    CREATE TABLE tuyen_ngang (
      id TEXT PRIMARY KEY,
      nhom TEXT DEFAULT '',
      agentCode TEXT UNIQUE,
      agentName TEXT,
      ngayBatDau TEXT,
      ngayHieuLuc TEXT,
      maNguoiTuyenDung TEXT DEFAULT '',
      tenNguoiTuyenDung TEXT DEFAULT '',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return {
    tuyenNgang: {
      async findUnique({ where }) {
        const row = await sqlite.get('SELECT * FROM tuyen_ngang WHERE agentCode = ?', where.agentCode);
        return row || null;
      },
      async create({ data }) {
        const id = 'test-' + Math.random().toString(36).slice(2);
        await sqlite.run(
          `INSERT INTO tuyen_ngang (id, nhom, agentCode, agentName, ngayBatDau, ngayHieuLuc, maNguoiTuyenDung, tenNguoiTuyenDung)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          id, data.nhom, data.agentCode, data.agentName,
          data.ngayBatDau ? data.ngayBatDau.toISOString() : null,
          data.ngayHieuLuc ? data.ngayHieuLuc.toISOString() : null,
          data.maNguoiTuyenDung, data.tenNguoiTuyenDung
        );
        return { id, ...data };
      },
      async update({ where, data }) {
        await sqlite.run(
          `UPDATE tuyen_ngang SET nhom=?, agentName=?, ngayBatDau=?, ngayHieuLuc=?, maNguoiTuyenDung=?, tenNguoiTuyenDung=?, updatedAt=CURRENT_TIMESTAMP WHERE agentCode=?`,
          data.nhom, data.agentName,
          data.ngayBatDau ? data.ngayBatDau.toISOString() : null,
          data.ngayHieuLuc ? data.ngayHieuLuc.toISOString() : null,
          data.maNguoiTuyenDung, data.tenNguoiTuyenDung,
          where.agentCode
        );
        return { ...data };
      },
      async findMany() {
        return sqlite.all('SELECT * FROM tuyen_ngang ORDER BY nhom, agentName');
      },
      async deleteMany() {
        return sqlite.run('DELETE FROM tuyen_ngang');
      },
    },
    _sqlite: sqlite,
  };
}

// ==================== TEST SCENARIOS ====================

let passCount = 0;
let failCount = 0;

function assert(cond, msg) {
  if (cond) {
    passCount++;
    console.log(`  ✅ ${msg}`);
  } else {
    failCount++;
    console.log(`  ❌ ${msg}`);
  }
}

async function scenario1_happyPath() {
  console.log('\n[Scenario 1] Happy path: file có cả agentCode + agentName');
  const db = await makeMockDb();
  const members = [
    { nhom: 'Nhom A', agentCode: 'TVV001', agentName: 'Nguyễn Văn A', ngayBatDau: '2024-01-15', ngayHieuLuc: '2024-02-01', maNguoiTuyenDung: 'NTD01', tenNguoiTuyenDung: 'Trần B' },
    { nhom: 'Nhom B', agentCode: 'TVV002', agentName: 'Lê Thị C', ngayBatDau: '15/03/2024', maNguoiTuyenDung: 'NTD02' },
  ];
  const result = await processMembers(members, db);
  assert(result.status === 200, `Status = 200 (got ${result.status})`);
  assert(result.body.created === 2, `created = 2 (got ${result.body.created})`);
  assert(result.body.updated === 0, `updated = 0`);
  assert(result.body.errored === 0, `errored = 0`);
  assert(result.body.duplicatesSkipped === 0, `duplicatesSkipped = 0`);
  assert(result.body.count === 2, `count = 2`);

  const rows = await db.tuyenNgang.findMany();
  assert(rows.length === 2, `DB có 2 rows (got ${rows.length})`);
  const names = rows.map(r => r.agentName || r.agentname).filter(Boolean);
  assert(names.includes('Nguyễn Văn A'), `agentName saved correctly (got names: ${JSON.stringify(names)})`);
  await db._sqlite.close();
}

async function scenario2_agentCodeOnly() {
  console.log('\n[Scenario 2] File có agentCode nhưng thiếu agentName → default "Chưa nhập"');
  const db = await makeMockDb();
  const members = [
    { nhom: 'Nhom X', agentCode: 'TVV100', ngayBatDau: '2024-01-01' }, // no agentName
  ];
  const result = await processMembers(members, db);
  assert(result.status === 200, `Status = 200 (got ${result.status})`);
  assert(result.body.created === 1, `created = 1 (got ${result.body.created})`);

  const rows = await db.tuyenNgang.findMany();
  assert(rows.length === 1, 'DB có 1 row');
  const savedName = rows[0].agentName || rows[0].agentname;
  assert(savedName === 'Chưa nhập', `agentName = "Chưa nhập" (got "${savedName}")`);
  await db._sqlite.close();
}

async function scenario3_dedupeInBatch() {
  console.log('\n[Scenario 3] File có 2 dòng trùng agentCode trong cùng batch → dedupe');
  const db = await makeMockDb();
  const members = [
    { agentCode: 'TVV200', agentName: 'Trùng 1' },
    { agentCode: 'TVV200', agentName: 'Trùng 2' }, // duplicate
    { agentCode: 'TVV201', agentName: 'Khác' },
  ];
  const result = await processMembers(members, db);
  assert(result.status === 200, `Status = 200`);
  assert(result.body.created === 2, `created = 2 (got ${result.body.created})`);
  assert(result.body.duplicatesSkipped === 1, `duplicatesSkipped = 1 (got ${result.body.duplicatesSkipped})`);

  const rows = await db.tuyenNgang.findMany();
  assert(rows.length === 2, `DB có 2 rows (got ${rows.length})`);
  await db._sqlite.close();
}

async function scenario4_emptyBatch() {
  console.log('\n[Scenario 4] File rỗng hoặc header không khớp → 0 dòng hợp lệ');
  const db = await makeMockDb();
  // Simulate header mismatch: agentCode empty in all rows
  const members = [
    { nhom: 'X', agentName: 'No code 1' }, // missing agentCode → filtered out
    { nhom: 'Y', agentName: 'No code 2' },
  ];
  const result = await processMembers(members, db);
  assert(result.status === 400, `Status = 400 (got ${result.status})`);
  assert(!!result.body.error, `Có error message`);
  assert(result.body.error.includes('Không có dữ liệu hợp lệ'), `Error message có gợi ý header`);
  assert(result.body.received === 2, `received = 2 (got ${result.body.received})`);

  const rows = await db.tuyenNgang.findMany();
  assert(rows.length === 0, `DB rỗng (got ${rows.length} rows)`);
  await db._sqlite.close();
}

async function scenario5_upsertExistingRow() {
  console.log('\n[Scenario 5] Upload lại file đã có → upsert (update thay vì create)');
  const db = await makeMockDb();
  // First upload
  await processMembers([{ agentCode: 'TVV300', agentName: 'Original', maNguoiTuyenDung: 'NTD_OLD' }], db);
  // Second upload — same agentCode, update name + NTD
  const result = await processMembers([{ agentCode: 'TVV300', agentName: 'Updated', maNguoiTuyenDung: 'NTD_NEW' }], db);

  assert(result.status === 200, `Status = 200`);
  assert(result.body.created === 0, `created = 0 (got ${result.body.created})`);
  assert(result.body.updated === 1, `updated = 1 (got ${result.body.updated})`);

  const rows = await db.tuyenNgang.findMany();
  assert(rows.length === 1, `DB vẫn 1 row (got ${rows.length})`);
  const savedName = rows[0].agentName || rows[0].agentname;
  const savedNTD = rows[0].maNguoiTuyenDung || rows[0].manguoituyendung;
  assert(savedName === 'Updated', `agentName đã update (got "${savedName}")`);
  assert(savedNTD === 'NTD_NEW', `maNguoiTuyenDung đã update (got "${savedNTD}")`);
  await db._sqlite.close();
}

// ==================== FRONTEND PARSING SIMULATION ====================
// Simulate normalizeKey + pickField từ handleImport('tuyen-ngang')

function normalizeKey(k) {
  return k.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_]+/g, ' ').trim();
}

function pickField(r, aliases) {
  for (const k of Object.keys(r)) {
    const norm = normalizeKey(k);
    for (const alias of aliases) {
      if (norm === alias) return String(r[k] ?? '');
    }
  }
  for (const k of Object.keys(r)) {
    const norm = normalizeKey(k);
    for (const alias of aliases) {
      if (alias.length >= 4 && (norm.includes(alias) || alias.includes(norm))) {
        return String(r[k] ?? '');
      }
    }
  }
  return '';
}

async function scenario6_headerNormalization() {
  console.log('\n[Scenario 6] Header normalization: file dùng header khác alias vẫn parse được');
  const db = await makeMockDb();

  // Sample data với các header khác nhau — giống thật user có thể upload
  const dataVariants = [
    // Variant 1: Uppercase, có dấu
    { 'STT': 1, 'NHÓM': 'PA', 'MÃ TVV': 'TVV-A', 'HỌ TÊN': 'User A', 'Ngày bắt đầu LV': '2024-01-01', 'Ngày hiệu lực CV': '2024-02-01', 'MÃ NGƯỜI TD': 'NTD1', 'TÊN NGƯỜI TD': 'Nguyễn NTD' },
    // Variant 2: Lowercase, không dấu, underscore
    { 'stt': 2, 'nhom': 'Banca', 'ma_tvv': 'TVV-B', 'ho_ten': 'User B', 'ngay_bat_dau_lv': '2024-03-01', 'ngay_hieu_luc_cv': '2024-04-01', 'ma_nguoi_td': 'NTD2', 'ten_nguoi_td': 'Trần NTD' },
    // Variant 3: Mixed, alias khác (mã số thay vì mã tvv)
    { 'STT': 3, 'Nhóm': 'PA', 'Mã số': 'TVV-C', 'Họ tên': 'User C', 'Ngày bắt đầu': '2024-05-01', 'Ngày hiệu lực': '2024-06-01', 'Mã NTD': 'NTD3', 'Tên NTD': 'Lê NTD' },
  ];

  const members = dataVariants.map((r) => ({
    nhom: pickField(r, ['nhom', 'nhom kd', 'nhom kinh doanh', 'nhóm kd']),
    agentCode: pickField(r, ['ma tvv', 'ma tvv/tn', 'ma tvv ttn', 'ma tvv/ttn', 'ma dl', 'ma dai ly', 'ma so', 'ma', 'agentcode', 'mã tvv', 'mã số']),
    agentName: pickField(r, ['ho ten', 'hoten', 'ho va ten', 'ten tvv', 'ten ttn', 'ten', 'agentname', 'họ tên', 'tên']),
    ngayBatDau: '', // skip for this test
    ngayHieuLuc: '',
    maNguoiTuyenDung: pickField(r, ['ma nguoi tuyen dung', 'ma nguoi td', 'ma ntd', 'manguoituyendung', 'ma dl td', 'ma tvv td', 'ma nguoi td', 'mã người tuyển dụng', 'mã người td', 'mã ntd']),
    tenNguoiTuyenDung: pickField(r, ['ten nguoi tuyen dung', 'ten nguoi td', 'ten ntd', 'tenguoituyendung', 'ten tvv td', 'ten người td', 'tên người tuyển dụng', 'tên người td', 'tên ntd']),
  })).filter((m) => m.agentCode || m.agentName);

  assert(members.length === 3, `Parsed 3 members (got ${members.length})`);
  assert(members[0].agentCode === 'TVV-A', `Variant 1 agentCode = TVV-A (got "${members[0].agentCode}")`);
  assert(members[1].agentCode === 'TVV-B', `Variant 2 agentCode = TVV-B (got "${members[1].agentCode}")`);
  assert(members[2].agentCode === 'TVV-C', `Variant 3 agentCode = TVV-C (got "${members[2].agentCode}")`);
  assert(members[0].nhom === 'PA', `Variant 1 nhom = PA (got "${members[0].nhom}")`);
  assert(members[1].nhom === 'Banca', `Variant 2 nhom = Banca (got "${members[1].nhom}")`);
  assert(members[0].maNguoiTuyenDung === 'NTD1', `Variant 1 NTD = NTD1 (got "${members[0].maNguoiTuyenDung}")`);
  assert(members[0].tenNguoiTuyenDung === 'Nguyễn NTD', `Variant 1 Tên NTD = Nguyễn NTD (got "${members[0].tenNguoiTuyenDung}")`);

  // Run through API
  const result = await processMembers(members, db);
  assert(result.status === 200, `Status = 200 (got ${result.status})`);
  assert(result.body.created === 3, `created = 3 (got ${result.body.created})`);

  const rows = await db.tuyenNgang.findMany();
  assert(rows.length === 3, `DB có 3 rows`);
  await db._sqlite.close();
}

// ==================== RUN ALL ====================

(async () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('TEST: DS TTN Tuyển Ngang Import Flow');
  console.log('Logic source: /home/z/my-project/src/app/api/tuyen-ngang/route.ts');
  console.log('═══════════════════════════════════════════════════════');

  try {
    await scenario1_happyPath();
    await scenario2_agentCodeOnly();
    await scenario3_dedupeInBatch();
    await scenario4_emptyBatch();
    await scenario5_upsertExistingRow();
    await scenario6_headerNormalization();
  } catch (e) {
    console.error('\n💥 UNCAUGHT ERROR:', e);
    failCount++;
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`RESULT: ${passCount} passed, ${failCount} failed`);
  console.log('═══════════════════════════════════════════════════════');
  process.exit(failCount > 0 ? 1 : 0);
})();
