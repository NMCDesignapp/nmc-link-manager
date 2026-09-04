const fs = require('fs');

const FILE = 'src/app/thi-dua-chau/page.tsx';
const MARKER = '// nmc-ntd-standard-export-all-contracts-v1';

const OLD_EXPANSION = `        const contributionDetails = showTVVmContributions
          ? expandActivityExportDetails(countedContracts, contracts)
          : null;`;

const NEW_EXPANSION = `        ${MARKER}
        // Với Lượt HĐ Chuẩn của NTD: dùng HĐ đạt ngưỡng chỉ để xác định TVV đủ điều kiện,
        // sau đó xuất toàn bộ HĐ trong kỳ của đúng TVV đó. Không thay đổi số lượt/kết quả.
        const contributionDetails = (showTVVmContributions || conditionType === 'activity_round_standard')
          ? expandActivityExportDetails(countedContracts, contracts)
          : null;`;

const OLD_TVVM_COLUMNS = `            if (contributionDetails) {
              const detail = contributionDetails[cIdx];
              row.push(c.agentCode, detail.totalIP, detail.rounds);
            }`;

const NEW_TVVM_COLUMNS = `            if (showTVVmContributions && contributionDetails) {
              const detail = contributionDetails[cIdx];
              row.push(c.agentCode, detail.totalIP, detail.rounds);
            }`;

function applyPatch() {
  const originalSource = fs.readFileSync(FILE, 'utf8');
  const eol = originalSource.includes('\r\n') ? '\r\n' : '\n';
  let source = originalSource.replace(/\r\n/g, '\n');

  if (source.includes(MARKER)) {
    if (!source.includes("const contributionDetails = (showTVVmContributions || conditionType === 'activity_round_standard')")) {
      throw new Error('[NTD standard export] Có marker nhưng thiếu điều kiện mở rộng HĐ chuẩn.');
    }
    if (!source.includes('if (showTVVmContributions && contributionDetails) {')) {
      throw new Error('[NTD standard export] Có marker nhưng cột TVVm chưa được bảo vệ đúng điều kiện.');
    }
    console.log(`✓ NTD standard export already expands all qualifying TVV contracts: ${FILE}`);
    return false;
  }

  if (!source.includes(OLD_EXPANSION)) {
    throw new Error(`[NTD standard export] Không tìm thấy block contributionDetails cần sửa trong ${FILE}`);
  }
  if (!source.includes(OLD_TVVM_COLUMNS)) {
    throw new Error(`[NTD standard export] Không tìm thấy block cột TVVm cần sửa trong ${FILE}`);
  }

  source = source.replace(OLD_EXPANSION, NEW_EXPANSION);
  source = source.replace(OLD_TVVM_COLUMNS, NEW_TVVM_COLUMNS);
  fs.writeFileSync(FILE, source.replace(/\n/g, eol), 'utf8');

  console.log(`✓ NTD standard export now includes all contracts of qualifying TVVs: ${FILE}`);
  return true;
}

applyPatch();
