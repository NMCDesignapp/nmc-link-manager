const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function write(path, content) {
  fs.writeFileSync(path, content, 'utf8');
}

function countOf(content, needle) {
  return content.split(needle).length - 1;
}

function replaceExact(content, needle, replacement, expected = 1, label = needle.slice(0, 80)) {
  const count = countOf(content, needle);
  if (count !== expected) {
    throw new Error(`${label}: expected ${expected} occurrence(s), found ${count}`);
  }
  return content.split(needle).join(replacement);
}

function replaceAtLeast(content, needle, replacement, min, max, label = needle.slice(0, 80)) {
  const count = countOf(content, needle);
  if (count < min || count > max) {
    throw new Error(`${label}: expected ${min}-${max} occurrence(s), found ${count}`);
  }
  return content.split(needle).join(replacement);
}

const pagePath = 'src/app/thi-dua-chau/page.tsx';
let page = read(pagePath);

page = replaceExact(
  page,
  "function norm(s: string): string { return s.normalize('NFC'); }\n\nfunction formatCurrency",
  "function norm(s: string): string { return s.normalize('NFC'); }\n\n// Nhóm PA chỉ bị đẩy xuống cuối khi các TVV cùng có kết quả 0.\nfunction isPAGroup(nhom?: string | null, maNhom?: string | null): boolean {\n  const text = norm(`${nhom || ''} ${maNhom || ''}`).toUpperCase();\n  return /(^|[\\s._\\/-])PA(?:$|[\\s._\\/-]|\\d)/.test(text);\n}\n\nfunction formatCurrency",
  1,
  'insert isPAGroup in thi-dua page',
);

page = replaceExact(
  page,
  "function formatDate(dateStr: string): string { return new Date(dateStr).toLocaleDateString('vi-VN'); }",
  "function formatDate(dateStr: string): string {\n  if (!dateStr) return '';\n  const date = new Date(dateStr);\n  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN');\n}",
  1,
  'make page formatDate safe for zero-sales placeholders',
);

// Four existing per-contract result render/export/copy paths must use the complete
// participant list rather than only contracts that exist in revenue data.
page = replaceAtLeast(
  page,
  '[...displayContracts].map((c) => {',
  'perContractDisplayContracts.map((c) => {',
  4,
  6,
  'switch per-contract result sources',
);

page = replaceExact(
  page,
  "  }, [tvvStructList, staffList, leadersList, banNhomStructList]);\n\n  // TVV total mode result rows",
  `  }, [tvvStructList, staffList, leadersList, banNhomStructList]);

  // Theo-HĐ vẫn phải hiện đủ TVV thuộc đối tượng chương trình. Dòng giữ chỗ
  // chỉ phục vụ bảng kết quả; không được đưa vào bảng chi tiết hợp đồng hay
  // làm tăng số lượng hợp đồng thực tế.
  const perContractDisplayContracts = useMemo<Contract[]>(() => {
    if (targetType !== 'tvv' || !isPerContractMode(conditionType)) return displayContracts;

    const rows = [...displayContracts];
    if (!tvvStructList.length) return rows;

    const candidates = subjectCodes.length === 0
      ? tvvStructList.filter(member => !isBancaPosition(member.chucVu))
      : tvvStructList.filter(member =>
          subjectCodes.includes(member.agentCode) || subjectCodes.includes(member.agentName)
        );

    const uniqueCandidates = new Map<string, TVVStructItem>();
    for (const member of candidates) {
      const key = norm(member.agentCode || '').toLowerCase();
      if (key && !uniqueCandidates.has(key)) uniqueCandidates.set(key, member);
    }

    const existingCodes = new Set(rows.map(row => norm(row.agentCode || '').toLowerCase()));
    for (const [key, member] of uniqueCandidates) {
      if (existingCodes.has(key)) continue;
      const group = resolveTvvGroup(member.agentCode, member.maBanNhom || '');
      if (norm(\`${'${group.nhom} ${group.maNhom}'}\`).toLowerCase().includes('dso')) continue;
      rows.push({
        id: \`zero-sales-${'${member.agentCode}'}\`,
        contractNumber: '',
        agentCode: member.agentCode,
        agentName: member.agentName || member.agentCode,
        position: member.chucVu || '',
        ban: '',
        nhom: group.nhom === '—' ? '' : group.nhom,
        maNhom: group.maNhom,
        leaderAgentCode: '',
        recruiterCode: '',
        startDate: member.ngayBatDau || null,
        effectiveDate: '',
        issueDate: '',
        fyp: 0,
        afyp: 0,
        pdt10DT: 0,
        tinhLuot3tr: 0,
        maDaiLyTD: member.maTVVTuyendung || '',
        ngayBatDauLamViec: member.ngayBatDau || null,
        ad: '',
      });
    }

    const valueOf = (row: Contract) => conditionType === 'per_contract_afyp' ? row.afyp : row.pdt10DT;
    return rows.sort((a, b) => {
      const valueDiff = valueOf(b) - valueOf(a);
      if (valueDiff !== 0) return valueDiff;
      if (valueOf(a) === 0) {
        const aPA = isPAGroup(a.nhom, a.maNhom);
        const bPA = isPAGroup(b.nhom, b.maNhom);
        if (aPA !== bPA) return aPA ? 1 : -1;
      }
      return (a.agentName || a.agentCode).localeCompare(b.agentName || b.agentCode, 'vi');
    });
  }, [displayContracts, targetType, conditionType, tvvStructList, subjectCodes, resolveTvvGroup]);

  // TVV total mode result rows`,
  1,
  'insert complete per-contract participant rows',
);

page = replaceExact(
  page,
  ": (isAFYP ? agent.totalAFYP : (isActivityMode ? agent.totalFYP : agent.totalFYP));",
  ": (isAFYP ? agent.totalAFYP : (isActivityMode ? agent.activityRounds : agent.totalFYP));",
  1,
  'use activity rounds as TVV activity value',
);

page = replaceExact(
  page,
  "      const valueDiff = b.value - a.value;\n      if (valueDiff !== 0) return valueDiff;\n      const aPriority = priorityTvvCodes.has(a.agent.agentCode) ? 1 : 0;",
  "      const valueDiff = b.value - a.value;\n      if (valueDiff !== 0) return valueDiff;\n      if (a.value === 0) {\n        const aPA = isPAGroup(a.agent.nhom, a.agent.maNhom);\n        const bPA = isPAGroup(b.agent.nhom, b.agent.maNhom);\n        if (aPA !== bPA) return aPA ? 1 : -1;\n      }\n      const aPriority = priorityTvvCodes.has(a.agent.agentCode) ? 1 : 0;",
  1,
  'sort zero-sales PA TVV last in main results',
);

page = replaceExact(
  page,
  "    if (displayContracts.length === 0 && nydData.length === 0 && tvvTotalRows.length === 0 && groupedData.length === 0) return;",
  "    if (perContractDisplayContracts.length === 0 && nydData.length === 0 && tvvTotalRows.length === 0 && groupedData.length === 0) return;",
  1,
  'allow copy when only zero-sales TVV rows exist',
);

page = replaceExact(
  page,
  "    if (displayContracts.length === 0 && nydData.length === 0 && groupedData.length === 0 && tvvTotalRows.length === 0) { toast({ title: 'Thông báo', description: 'Không có dữ liệu' }); return; }",
  "    if (perContractDisplayContracts.length === 0 && nydData.length === 0 && groupedData.length === 0 && tvvTotalRows.length === 0) { toast({ title: 'Thông báo', description: 'Không có dữ liệu' }); return; }",
  1,
  'allow export when only zero-sales TVV rows exist',
);

page = replaceExact(
  page,
  "        {(displayContracts.length > 0 || nydData.length > 0) && (",
  "        {(perContractDisplayContracts.length > 0 || nydData.length > 0 || tvvTotalRows.length > 0 || groupedData.length > 0) && (",
  1,
  'show result summary for zero-sales participant lists',
);

page = replaceExact(
  page,
  `    // TVV stats - use tvvTotalRows for total mode (includes TVV with 0 revenue)
    let tvvAchievedCount: number;
    let tvvTotalBonus: number;
    if (isTotalMode(conditionType) && targetType === 'tvv') {
      tvvAchievedCount = tvvTotalRows.filter(r => r.tier).length;
      tvvTotalBonus = tvvTotalRows.reduce((sum, r) => sum + (r.tier ? computeBonusFromTier(r.tier, r.value) : 0), 0);
    } else {
      // Per-contract mode: still use displayContracts for per-HD stats
      tvvAchievedCount = displayContracts.filter(c => calculateBonus(c.pdt10DT).tier).length;
      tvvTotalBonus = displayContracts.reduce((sum, c) => sum + getBonusAmount(c.pdt10DT), 0);
    }`,
  `    // TVV stats: theo-HĐ dùng đủ danh sách đối tượng; các chế độ tổng/lượt/Top N
    // dùng tvvTotalRows, vốn đã bao gồm TVV có kết quả 0.
    let tvvAchievedCount: number;
    let tvvTotalBonus: number;
    if (targetType === 'tvv' && !isPerContractMode(conditionType)) {
      tvvAchievedCount = tvvTotalRows.filter(r => r.tier).length;
      tvvTotalBonus = tvvTotalRows.reduce((sum, r) => {
        if (!r.tier) return sum;
        return sum + computeBonusFromTier(r.tier, r.value, isActivityRoundMode(conditionType) ? r.value : undefined);
      }, 0);
    } else {
      const contractValue = (c: Contract) => conditionType === 'per_contract_afyp' ? c.afyp : c.pdt10DT;
      tvvAchievedCount = perContractDisplayContracts.filter(c => calculateBonus(contractValue(c)).tier).length;
      tvvTotalBonus = perContractDisplayContracts.reduce((sum, c) => sum + getBonusAmount(contractValue(c)), 0);
    }`,
  1,
  'fix TVV stats for all contest modes',
);

page = replaceExact(
  page,
  `    // For TVV total mode, count from tvvTotalRows (includes TVV with 0 revenue)
    const tvvAgentCount = isTotalMode(conditionType) && targetType === 'tvv'
      ? tvvTotalRows.length
      : displayContracts.length;
    const achievedCount = targetType === 'nyd' ? nydAchievedCount : isActivityRoundMode(conditionType) ? arAchievedCount : targetType === 'nhom' ? nhomAchievedCount : tvvAchievedCount;
    const notAchievedCount = targetType === 'nyd' ? nydNotAchievedCount : isActivityRoundMode(conditionType) ? arNotAchievedCount : targetType === 'nhom' ? groupedData.length - nhomAchievedCount : tvvAgentCount - tvvAchievedCount;

    const baseTotalBonus = targetType === 'nyd' ? nydTotalBonus : isActivityRoundMode(conditionType) ? arTotalBonus : targetType === 'nhom' ? nhomTotalBonus : tvvTotalBonus;`,
  `    const tvvAgentCount = targetType === 'tvv'
      ? (isPerContractMode(conditionType) ? perContractDisplayContracts.length : tvvTotalRows.length)
      : displayContracts.length;
    const achievedCount = targetType === 'nyd'
      ? nydAchievedCount
      : targetType === 'nhom'
      ? (isActivityRoundMode(conditionType) ? arAchievedCount : nhomAchievedCount)
      : tvvAchievedCount;
    const notAchievedCount = targetType === 'nyd'
      ? nydNotAchievedCount
      : targetType === 'nhom'
      ? (isActivityRoundMode(conditionType) ? arNotAchievedCount : groupedData.length - nhomAchievedCount)
      : tvvAgentCount - tvvAchievedCount;

    const baseTotalBonus = targetType === 'nyd'
      ? nydTotalBonus
      : targetType === 'nhom'
      ? (isActivityRoundMode(conditionType) ? arTotalBonus : nhomTotalBonus)
      : tvvTotalBonus;`,
  1,
  'select stats by target before condition mode',
);

page = replaceExact(
  page,
  "  }, [displayContracts, groupedData, nydData, tvvTotalRows, conditionType, targetType, includeIndividualTN, includeIndividualNTD, usePhase2, phase2Results, calculateBonus, getBonusAmount, calculateActivityRoundBonus, getActivityRoundBonusAmount, getRemainingToNextTier, computeBonusFromTier]);",
  "  }, [displayContracts, perContractDisplayContracts, groupedData, nydData, tvvTotalRows, conditionType, targetType, includeIndividualTN, includeIndividualNTD, usePhase2, phase2Results, calculateBonus, getBonusAmount, calculateActivityRoundBonus, getActivityRoundBonusAmount, getRemainingToNextTier, computeBonusFromTier]);",
  1,
  'add per-contract rows to stats dependencies',
);

write(pagePath, page);

const calcPath = 'src/lib/contest-calculator.ts';
let calc = read(calcPath);

calc = replaceExact(
  calc,
  "export function norm(s: string): string {\n  return s.normalize('NFC');\n}\n\n// ===== Bonus computation =====",
  "export function norm(s: string): string {\n  return s.normalize('NFC');\n}\n\nfunction isPAGroup(nhom?: string | null, maNhom?: string | null): boolean {\n  const text = norm(`${nhom || ''} ${maNhom || ''}`).toUpperCase();\n  return /(^|[\\s._\\/-])PA(?:$|[\\s._\\/-]|\\d)/.test(text);\n}\n\n// ===== Bonus computation =====",
  1,
  'insert isPAGroup in shared calculator',
);

calc = replaceExact(
  calc,
  "export function formatDate(dateStr: string): string {\n  return new Date(dateStr).toLocaleDateString('vi-VN');\n}",
  "export function formatDate(dateStr: string): string {\n  if (!dateStr) return '';\n  const date = new Date(dateStr);\n  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN');\n}",
  1,
  'make calculator formatDate safe',
);

calc = replaceExact(
  calc,
  `        const staff = staffList.find(
          (s) =>
            s.agentCode.toLowerCase() === codeLower ||
            norm(s.agentName || '').toLowerCase() === codeLower
        );
        const recruiter = !staff
          ? recruiterList.find(
              (r) =>
                r.agentCode.toLowerCase() === codeLower ||
                norm(r.agentName || '').toLowerCase() === codeLower
            )
          : null;
        const info = staff || recruiter;
        agentMap.set(code, {
          agentCode: info?.agentCode || code,
          agentName: info?.agentName || code,
          nhom: info?.nhom || '',
          maNhom: (info as StaffMember)?.maNhom || '',`,
  `        const structMember = tvvStructList?.find(
          (t) =>
            t.agentCode.toLowerCase() === codeLower ||
            norm(t.agentName || '').toLowerCase() === codeLower
        );
        const staff = staffList.find(
          (s) =>
            s.agentCode.toLowerCase() === codeLower ||
            norm(s.agentName || '').toLowerCase() === codeLower
        );
        const recruiter = !staff
          ? recruiterList.find(
              (r) =>
                r.agentCode.toLowerCase() === codeLower ||
                norm(r.agentName || '').toLowerCase() === codeLower
            )
          : null;
        const info = structMember || staff || recruiter;
        const resolvedCode = info?.agentCode || code;
        agentMap.set(resolvedCode, {
          agentCode: resolvedCode,
          agentName: info?.agentName || code,
          nhom: (info as StaffMember | RecruiterMember)?.nhom || '',
          maNhom: structMember?.maBanNhom || (info as StaffMember)?.maNhom || '',`,
  1,
  'resolve selected zero-sales TVV from structure',
);

calc = replaceExact(
  calc,
  "      const valueDiff = b.value - a.value;\n      if (valueDiff !== 0) return valueDiff;\n      const aPriority = priorityAgentCodes?.has(a.agent.agentCode) ? 1 : 0;",
  "      const valueDiff = b.value - a.value;\n      if (valueDiff !== 0) return valueDiff;\n      if (a.value === 0) {\n        const aPA = isPAGroup(a.agent.nhom, a.agent.maNhom);\n        const bPA = isPAGroup(b.agent.nhom, b.agent.maNhom);\n        if (aPA !== bPA) return aPA ? 1 : -1;\n      }\n      const aPriority = priorityAgentCodes?.has(a.agent.agentCode) ? 1 : 0;",
  1,
  'sort zero-sales PA TVV last in shared total rows',
);

calc = replaceExact(
  calc,
  "export function computeTVVPerContractRows(\n  displayContracts: Contract[],\n  config: ContestConfig\n): TVVPerContractRow[] {",
  "export function computeTVVPerContractRows(\n  displayContracts: Contract[],\n  config: ContestConfig,\n  tvvStructList?: TVVStructMember[]\n): TVVPerContractRow[] {",
  1,
  'extend per-contract calculator input',
);

calc = replaceExact(
  calc,
  "  return [...displayContracts]\n    .map((c) => {",
  `  const contractsForRows = [...displayContracts];
  if (tvvStructList && tvvStructList.length > 0) {
    const participants = config.participants;
    const candidates = participants.length === 0
      ? tvvStructList
      : tvvStructList.filter((member) =>
          participants.includes(member.agentCode) || participants.includes(member.agentName)
        );
    const existingCodes = new Set(contractsForRows.map((row) => norm(row.agentCode || '').toLowerCase()));
    const uniqueCandidates = new Map<string, TVVStructMember>();
    for (const member of candidates) {
      const key = norm(member.agentCode || '').toLowerCase();
      if (key && !uniqueCandidates.has(key)) uniqueCandidates.set(key, member);
    }
    for (const [key, member] of uniqueCandidates) {
      if (existingCodes.has(key)) continue;
      contractsForRows.push({
        id: \`zero-sales-${'${member.agentCode}'}\`,
        contractNumber: '',
        agentCode: member.agentCode,
        agentName: member.agentName || member.agentCode,
        position: member.chucVu || '',
        ban: '',
        nhom: '',
        maNhom: member.maBanNhom || '',
        leaderAgentCode: '',
        recruiterCode: '',
        startDate: member.ngayBatDau || null,
        effectiveDate: '',
        issueDate: '',
        fyp: 0,
        afyp: 0,
        pdt10DT: 0,
        tinhLuot3tr: 0,
        maDaiLyTD: member.maTVVTuyendung || '',
        ngayBatDauLamViec: member.ngayBatDau || null,
        ad: '',
      });
    }
  }

  return contractsForRows
    .map((c) => {`,
  1,
  'add zero-sales rows to shared per-contract calculator',
);

calc = replaceExact(
  calc,
  "    .sort((a, b) => b.cValue - a.cValue);",
  "    .sort((a, b) => {\n      const valueDiff = b.cValue - a.cValue;\n      if (valueDiff !== 0) return valueDiff;\n      if (a.cValue === 0) {\n        const aPA = isPAGroup(a.contract.nhom, a.contract.maNhom);\n        const bPA = isPAGroup(b.contract.nhom, b.contract.maNhom);\n        if (aPA !== bPA) return aPA ? 1 : -1;\n      }\n      return (a.contract.agentName || a.contract.agentCode).localeCompare(b.contract.agentName || b.contract.agentCode, 'vi');\n    });",
  1,
  'sort shared per-contract zero rows',
);

write(calcPath, calc);

const inlinePath = 'src/components/saved-contest-inline.tsx';
let inline = read(inlinePath);
inline = replaceExact(
  inline,
  "    () => computeTVVPerContractRows(displayContracts, config),\n    [displayContracts, config]",
  "    () => computeTVVPerContractRows(displayContracts, config, tvvStructList),\n    [displayContracts, config, tvvStructList]",
  1,
  'pass TVV structure to saved contest per-contract rows',
);
write(inlinePath, inline);

// Static safety checks before the workflow commits anything.
const finalPage = read(pagePath);
const finalCalc = read(calcPath);
if (!finalPage.includes('const perContractDisplayContracts = useMemo<Contract[]>')) throw new Error('missing per-contract participant list');
if (finalPage.includes('isActivityMode ? agent.totalFYP : agent.totalFYP')) throw new Error('activity-round value bug still present');
if (!finalCalc.includes('tvvStructList?: TVVStructMember[]')) throw new Error('shared calculator signature not updated');
if (!finalCalc.includes('const structMember = tvvStructList?.find')) throw new Error('selected TVV structure lookup not added');

console.log('Thi đua result display patch applied successfully.');
