import * as XLSXCore from 'xlsx-js-style';

export * from 'xlsx-js-style';
export const utils = XLSXCore.utils;
export const read = XLSXCore.read;
export const write = XLSXCore.write;

// This wrapper is used only for browser-side Excel exports. It leaves every
// workbook unchanged except the Thi đua result workbook, whose two sheets are
// normalized to the business template requested by the user.

type CellValue = string | number | boolean | Date | null | undefined;
type Matrix = CellValue[][];
type MergeRange = { s: { r: number; c: number }; e: { r: number; c: number } };

type DetailRecord = {
  group: string;
  groupCode: string;
  agentCode: string;
  agentName: string;
  position: string;
  contractNumber: string;
  effectiveDate: CellValue;
  issueDate: CellValue;
  ip: number;
  afyp: number;
  recruiterCode: string;
  roundValue: number;
  raw: CellValue[];
};

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
  fill: { fgColor: { rgb: '103667' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: '8EA9C1' } },
    bottom: { style: 'thin', color: { rgb: '8EA9C1' } },
    left: { style: 'thin', color: { rgb: '8EA9C1' } },
    right: { style: 'thin', color: { rgb: '8EA9C1' } },
  },
};

const BODY_STYLE = {
  alignment: { vertical: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: 'D9E2F3' } },
    bottom: { style: 'thin', color: { rgb: 'D9E2F3' } },
    left: { style: 'thin', color: { rgb: 'D9E2F3' } },
    right: { style: 'thin', color: { rgb: 'D9E2F3' } },
  },
};

const LEADER_STYLE = {
  ...BODY_STYLE,
  font: { bold: true, color: { rgb: '103667' } },
  fill: { fgColor: { rgb: 'DDEBF7' } },
};

function text(value: CellValue): string {
  return value == null ? '' : String(value).trim();
}

function normalized(value: CellValue): string {
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function numberValue(value: CellValue): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = text(value);
  if (!raw) return 0;
  const compact = raw
    .replace(/\s/g, '')
    .replace(/[₫đ]/gi, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  const result = Number(compact);
  return Number.isFinite(result) ? result : 0;
}

function findHeader(headers: CellValue[], candidates: string[], partial = false): number {
  const values = headers.map(normalized);
  const wanted = candidates.map(normalized);
  for (const candidate of wanted) {
    const exact = values.indexOf(candidate);
    if (exact >= 0) return exact;
  }
  if (partial) {
    for (let i = 0; i < values.length; i++) {
      if (wanted.some(candidate => values[i].includes(candidate))) return i;
    }
  }
  return -1;
}

function sheetMatrix(sheet: any): Matrix {
  if (!sheet) return [];
  return XLSXCore.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: '',
    blankrows: false,
  }) as Matrix;
}

function existingSheet(workbook: any, names: string[]): any {
  for (const name of names) {
    if (workbook?.Sheets?.[name]) return workbook.Sheets[name];
  }
  return undefined;
}

function parseDetails(matrix: Matrix): DetailRecord[] {
  if (matrix.length < 2) return [];
  const headers = matrix[0] || [];
  const groupIdx = findHeader(headers, ['Nhóm']);
  const groupCodeIdx = findHeader(headers, ['Mã Ban/Nhóm']);
  const codeIdx = findHeader(headers, ['Mã ĐL', 'Mã số']);
  const nameIdx = findHeader(headers, ['Tên', 'Họ tên']);
  const positionIdx = findHeader(headers, ['Chức vụ']);
  const contractIdx = findHeader(headers, ['Số hợp đồng', 'Số HĐ']);
  const effectiveDateIdx = findHeader(headers, ['Ngày hiệu lực']);
  const issueDateIdx = findHeader(headers, ['Ngày phát hành']);
  const ipIdx = findHeader(headers, ['PĐT + 10% ĐT', 'IP']);
  const afypIdx = findHeader(headers, ['AFYP']);
  const recruiterIdx = findHeader(headers, ['MÃ ĐL TD', 'Mã NTD', 'Mã số NTD']);
  const roundIdx = findHeader(headers, ['TÍNH LƯỢT 3 tr', 'Tính lượt'], true);

  return matrix.slice(1).map(row => ({
    group: groupIdx >= 0 ? text(row[groupIdx]) : '',
    groupCode: groupCodeIdx >= 0 ? text(row[groupCodeIdx]) : '',
    agentCode: codeIdx >= 0 ? text(row[codeIdx]) : '',
    agentName: nameIdx >= 0 ? text(row[nameIdx]) : '',
    position: positionIdx >= 0 ? text(row[positionIdx]) : '',
    contractNumber: contractIdx >= 0 ? text(row[contractIdx]) : '',
    effectiveDate: effectiveDateIdx >= 0 ? row[effectiveDateIdx] : '',
    issueDate: issueDateIdx >= 0 ? row[issueDateIdx] : '',
    ip: ipIdx >= 0 ? numberValue(row[ipIdx]) : 0,
    afyp: afypIdx >= 0 ? numberValue(row[afypIdx]) : 0,
    recruiterCode: recruiterIdx >= 0 ? text(row[recruiterIdx]) : '',
    roundValue: roundIdx >= 0 ? numberValue(row[roundIdx]) : 0,
    raw: row,
  })).filter(row => row.agentCode || row.agentName || row.contractNumber);
}

function rewardIndex(headers: CellValue[]): number {
  const total = findHeader(headers, ['Tổng Thưởng']);
  if (total >= 0) return total;
  return findHeader(headers, ['Thưởng', 'Tiền thưởng']);
}

function metricLabelFromHeader(value: CellValue): 'TỔNG IP' | 'TỔNG AFYP' | 'TỔNG LƯỢT' {
  const label = normalized(value);
  if (label.includes('LUOT') || label.includes('SL TVV')) return 'TỔNG LƯỢT';
  if (label.includes('AFYP')) return 'TỔNG AFYP';
  return 'TỔNG IP';
}

function isDateHeader(value: CellValue): boolean {
  const label = normalized(value);
  return label.includes('NGAY HIEU LUC')
    || label.includes('NGAY PHAT HANH')
    || label.includes('NGAY BAT DAU');
}

function isCountedReward(value: CellValue): boolean {
  const raw = text(value);
  if (!raw) return false;
  if (numberValue(value) > 0) return true;

  const label = normalized(value);
  if (!label || label === '0' || label === '-' || label === '0 D' || label === '0D') return false;
  if (label.includes('KHONG DAT') || label.includes('KHONG TINH') || label === 'KHONG') return false;

  // Keep non-cash reward descriptions such as gifts or vouchers.
  return /[A-Z]/.test(label.replace(/[DĐ]/g, ''));
}

function shouldKeepResultPerson(
  reward: CellValue,
  hasRewardColumn: boolean,
  contributingRows: number,
  stt: CellValue,
): boolean {
  if (hasRewardColumn) return isCountedReward(reward) && contributingRows > 0;
  if (contributingRows > 0) return true;
  return text(stt) !== '';
}

function contractResultHeaders(): CellValue[] {
  return ['SỐ HĐ', 'NGÀY HIỆU LỰC', 'NGÀY PHÁT HÀNH', 'IP', 'AFYP'];
}

function contractResultValues(contract: string, detail?: DetailRecord): CellValue[] {
  return [
    contract || detail?.contractNumber || '',
    detail?.effectiveDate ?? '',
    detail?.issueDate ?? '',
    detail?.ip ?? '',
    detail?.afyp ?? '',
  ];
}

function styleSheet(
  headers: CellValue[],
  rows: Matrix,
  merges: MergeRange[] = [],
  leaderRows: number[] = [],
): any {
  const sheet = XLSXCore.utils.aoa_to_sheet([headers, ...rows]);
  const range = XLSXCore.utils.decode_range(sheet['!ref'] || 'A1:A1');
  const leaderSet = new Set(leaderRows);

  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const address = XLSXCore.utils.encode_cell({ r, c });
      const cell = sheet[address];
      if (!cell) continue;
      cell.s = r === 0 ? HEADER_STYLE : leaderSet.has(r) ? LEADER_STYLE : BODY_STYLE;
      if (r > 0 && isDateHeader(headers[c])) {
        cell.z = 'dd/mm/yyyy';
      } else if (r > 0 && typeof cell.v === 'number') {
        cell.z = '#,##0';
      }
    }
  }

  sheet['!rows'] = [{ hpt: 32 }, ...rows.map(() => ({ hpt: 24 }))];
  sheet['!cols'] = headers.map((header, col) => {
    const max = Math.max(
      text(header).length,
      ...rows.map(row => text(row[col]).length),
    );
    const headerNorm = normalized(header);
    const floor = headerNorm === 'STT' ? 7
      : headerNorm.includes('HO TEN') ? 24
      : headerNorm.includes('CHUC VU') ? 20
      : headerNorm.includes('THUONG') ? 20
      : headerNorm.includes('NHOM') ? 18
      : headerNorm.includes('SO HD') || headerNorm.includes('SO HOP DONG') ? 17
      : isDateHeader(header) ? 15
      : headerNorm === 'IP' || headerNorm === 'AFYP' || headerNorm.includes('TONG IP') || headerNorm.includes('TONG AFYP') ? 14
      : headerNorm.includes('MA SO') ? 14
      : 12;
    return { wch: Math.min(Math.max(max + 2, floor), 38) };
  });
  sheet['!autofilter'] = { ref: XLSXCore.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }) };
  if (merges.length) sheet['!merges'] = merges;
  sheet['!views'] = [{ state: 'frozen', ySplit: 1 }];
  return sheet;
}

function detailByContract(details: DetailRecord[]): Map<string, DetailRecord> {
  const map = new Map<string, DetailRecord>();
  for (const detail of details) {
    if (detail.contractNumber && !map.has(normalized(detail.contractNumber))) {
      map.set(normalized(detail.contractNumber), detail);
    }
  }
  return map;
}

function detailByAgent(details: DetailRecord[]): Map<string, DetailRecord> {
  const map = new Map<string, DetailRecord>();
  for (const detail of details) {
    if (detail.agentCode && !map.has(normalized(detail.agentCode))) {
      map.set(normalized(detail.agentCode), detail);
    }
  }
  return map;
}

function buildTVVResult(matrix: Matrix, details: DetailRecord[]) {
  const headers = matrix[0] || [];
  const sourceRows = matrix.slice(1);
  const sttIdx = findHeader(headers, ['STT']);
  const groupIdx = findHeader(headers, ['Nhóm']);
  const codeIdx = findHeader(headers, ['Mã ĐL', 'Mã số']);
  const nameIdx = findHeader(headers, ['Họ tên']);
  const positionIdx = findHeader(headers, ['Chức vụ']);
  const contractIdx = findHeader(headers, ['Số hợp đồng', 'Số HĐ']);
  const effectiveDateIdx = findHeader(headers, ['Ngày hiệu lực']);
  const issueDateIdx = findHeader(headers, ['Ngày phát hành']);
  const ipIdx = findHeader(headers, ['PĐT + 10% ĐT', 'IP']);
  const afypIdx = findHeader(headers, ['AFYP']);
  const rewardIdx = rewardIndex(headers);
  const perContract = contractIdx >= 0;
  const metricIdx = perContract ? -1 : Math.max(nameIdx + 1, 0);
  const metricHeader = metricLabelFromHeader(
    headers[metricIdx] || headers.find(header => normalized(header).includes('LUOT')),
  );
  const contractMap = detailByContract(details);

  const byAgent = new Map<string, DetailRecord[]>();
  const byName = new Map<string, DetailRecord[]>();
  for (const detail of details) {
    const codeKey = normalized(detail.agentCode);
    if (codeKey) {
      const list = byAgent.get(codeKey) || [];
      list.push(detail);
      byAgent.set(codeKey, list);
    }
    const nameKey = normalized(detail.agentName);
    if (nameKey) {
      const list = byName.get(nameKey) || [];
      list.push(detail);
      byName.set(nameKey, list);
    }
  }

  const outputHeaders: CellValue[] = [
    'STT', 'NHÓM', 'MÃ SỐ', 'HỌ TÊN', 'CHỨC VỤ',
    ...contractResultHeaders(),
    ...(!perContract ? [metricHeader] : []),
    'TIỀN THƯỞNG',
  ];
  const outputRows: Matrix = [];
  const merges: MergeRange[] = [];

  if (perContract) {
    let currentGroup = '';
    let currentCode = '';
    let currentName = '';
    let currentPosition = '';

    for (const row of sourceRows) {
      const rowCode = codeIdx >= 0 ? text(row[codeIdx]) : '';
      const rowName = nameIdx >= 0 ? text(row[nameIdx]) : '';
      const rowGroup = groupIdx >= 0 ? text(row[groupIdx]) : '';
      const rowPosition = positionIdx >= 0 ? text(row[positionIdx]) : '';

      if (rowCode || rowName) {
        currentCode = rowCode || currentCode;
        currentName = rowName || currentName;
        currentGroup = rowGroup || currentGroup;
        currentPosition = rowPosition || currentPosition;
      }

      const contract = text(row[contractIdx]);
      if (!contract && !currentCode && !currentName) continue;

      const detail = contractMap.get(normalized(contract));
      const group = rowGroup || currentGroup || detail?.group || '';
      const code = rowCode || currentCode || detail?.agentCode || '';
      const name = rowName || currentName || detail?.agentName || '';
      const position = rowPosition || currentPosition || detail?.position || '';
      const contractValues: CellValue[] = [
        contract || detail?.contractNumber || '',
        detail?.effectiveDate ?? (effectiveDateIdx >= 0 ? row[effectiveDateIdx] : ''),
        detail?.issueDate ?? (issueDateIdx >= 0 ? row[issueDateIdx] : ''),
        detail?.ip ?? (ipIdx >= 0 ? row[ipIdx] : ''),
        detail?.afyp ?? (afypIdx >= 0 ? row[afypIdx] : ''),
      ];

      outputRows.push([
        outputRows.length + 1,
        group,
        code,
        name,
        position,
        ...contractValues,
        rewardIdx >= 0 ? row[rewardIdx] : '',
      ]);
    }

    return { headers: outputHeaders, rows: outputRows, merges, leaderRows: [] as number[] };
  }

  let resultIndex = 0;
  for (const row of sourceRows) {
    const code = codeIdx >= 0 ? text(row[codeIdx]) : '';
    const name = nameIdx >= 0 ? text(row[nameIdx]) : '';
    if (!code && !name) continue;

    const codeKey = normalized(code);
    const nameKey = normalized(name);
    const personDetails = (codeKey ? byAgent.get(codeKey) : undefined)
      || (nameKey ? byName.get(nameKey) : undefined)
      || [];
    const contracts: Array<DetailRecord | undefined> = personDetails.length
      ? personDetails.filter(detail => Boolean(detail.contractNumber))
      : [undefined];
    if (!contracts.length) contracts.push(undefined);

    resultIndex += 1;
    const start = outputRows.length + 1;
    contracts.forEach((detail, contractIndex) => {
      outputRows.push([
        contractIndex === 0 ? resultIndex : '',
        contractIndex === 0 ? (groupIdx >= 0 ? text(row[groupIdx]) : detail?.group || '') : '',
        contractIndex === 0 ? code : '',
        contractIndex === 0 ? name : '',
        contractIndex === 0 ? (positionIdx >= 0 ? text(row[positionIdx]) : detail?.position || '') : '',
        ...contractResultValues(detail?.contractNumber || '', detail),
        contractIndex === 0 && metricIdx >= 0 ? row[metricIdx] : '',
        contractIndex === 0 && rewardIdx >= 0 ? row[rewardIdx] : '',
      ]);
    });

    const end = outputRows.length;
    if (end > start) {
      const metricCol = outputHeaders.length - 2;
      const rewardCol = outputHeaders.length - 1;
      for (const col of [0, 1, 2, 3, 4, metricCol, rewardCol]) {
        merges.push({ s: { r: start, c: col }, e: { r: end, c: col } });
      }
    }
  }

  return { headers: outputHeaders, rows: outputRows, merges, leaderRows: [] as number[] };
}

function buildNTDResult(matrix: Matrix, details: DetailRecord[]) {
  const headers = matrix[0] || [];
  const sourceRows = matrix.slice(1);
  const sttIdx = findHeader(headers, ['STT']);
  const groupIdx = findHeader(headers, ['Nhóm']);
  const codeIdx = findHeader(headers, ['Mã ĐL', 'Mã số NTD']);
  const nameIdx = findHeader(headers, ['Họ tên NTD']);
  const tvvIdx = findHeader(headers, ['Họ tên TVV', 'TVV']);
  const contractIdx = findHeader(headers, ['Số hợp đồng', 'Số HĐ']);
  const rewardIdx = rewardIndex(headers);
  const conditionIdx = 5;
  const conditionLabel = normalized(headers[conditionIdx]);
  const includeContract = contractIdx >= 0 && (conditionLabel.includes('LUOT') || conditionLabel.includes('/HD'));
  const contractMap = detailByContract(details);

  type Item = { tvv: string; contract: string; key: string; detail?: DetailRecord };
  type Group = { stt: CellValue; nhom: string; code: string; name: string; reward: CellValue; items: Item[] };
  const groups: Group[] = [];
  let current: Group | null = null;

  for (const row of sourceRows) {
    const code = codeIdx >= 0 ? text(row[codeIdx]) : '';
    const ntdName = nameIdx >= 0 ? text(row[nameIdx]) : '';
    if (code || ntdName || !current) {
      current = {
        stt: sttIdx >= 0 ? row[sttIdx] : groups.length + 1,
        nhom: groupIdx >= 0 ? text(row[groupIdx]) : '',
        code,
        name: ntdName,
        reward: rewardIdx >= 0 ? row[rewardIdx] : '',
        items: [],
      };
      groups.push(current);
    }
    if (!current) continue;
    if (!current.nhom && groupIdx >= 0) current.nhom = text(row[groupIdx]);
    if (!current.reward && rewardIdx >= 0) current.reward = row[rewardIdx];
    const tvv = tvvIdx >= 0 ? text(row[tvvIdx]) : '';
    const contract = contractIdx >= 0 ? text(row[contractIdx]) : '';
    if (tvv || contract) {
      const detail = contractMap.get(normalized(contract));
      current.items.push({
        tvv: tvv || detail?.agentName || '',
        contract,
        key: detail?.agentCode || tvv || contract,
        detail,
      });
    }
  }

  const outputHeaders: CellValue[] = [
    'STT', 'NHÓM', 'MÃ SỐ NTD', 'HỌ TÊN NTD', 'TVV',
    ...(includeContract ? contractResultHeaders() : []),
    'THƯỞNG',
  ];
  const outputRows: Matrix = [];
  const merges: MergeRange[] = [];
  let resultIndex = 0;

  for (const group of groups) {
    let items = group.items;
    if (includeContract) {
      // The result sheet only contains the contracts actually counted in the
      // contest. Every contract must also exist in the detail sheet produced by
      // the selected effective-date / issue-date filters.
      items = items.filter(item => Boolean(item.contract && item.detail));
    } else {
      const seen = new Set<string>();
      items = items.filter(item => {
        const key = normalized(item.key);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    if (!shouldKeepResultPerson(group.reward, rewardIdx >= 0, items.length, group.stt)) continue;

    resultIndex += 1;
    const start = outputRows.length + 1;
    items.forEach((item, itemIndex) => {
      outputRows.push([
        itemIndex === 0 ? resultIndex : '',
        itemIndex === 0 ? group.nhom : '',
        itemIndex === 0 ? group.code : '',
        itemIndex === 0 ? group.name : '',
        item.tvv,
        ...(includeContract ? contractResultValues(item.contract, item.detail) : []),
        itemIndex === 0 ? group.reward : '',
      ]);
    });
    const end = outputRows.length;
    if (end > start) {
      for (const col of [0, 1, 2, 3, outputHeaders.length - 1]) {
        merges.push({ s: { r: start, c: col }, e: { r: end, c: col } });
      }
    }
  }

  return { headers: outputHeaders, rows: outputRows, merges, leaderRows: [] as number[] };
}

function parsePassThreshold(header: CellValue, label: 'IP' | 'AFYP'): number | null {
  const source = normalized(header).replace(/,/g, '.');
  const match = source.match(new RegExp(`${label}[^0-9]*([0-9.]+)K`));
  if (!match) return null;
  const value = Number(match[1].replace(/\./g, ''));
  return Number.isFinite(value) ? value * 1_000 : null;
}

function aggregateAgents(details: DetailRecord[]) {
  const map = new Map<string, DetailRecord & { totalIP: number; totalAFYP: number; contracts: DetailRecord[] }>();
  for (const detail of details) {
    const key = normalized(detail.agentCode || detail.agentName);
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.totalIP += detail.ip;
      existing.totalAFYP += detail.afyp;
      existing.contracts.push(detail);
    } else {
      map.set(key, { ...detail, totalIP: detail.ip, totalAFYP: detail.afyp, contracts: [detail] });
    }
  }
  return Array.from(map.values());
}

function buildGroupResult(matrix: Matrix, details: DetailRecord[]) {
  const headers = matrix[0] || [];
  const sourceRows = matrix.slice(1);
  const sttIdx = findHeader(headers, ['STT']);
  const groupIdx = findHeader(headers, ['Nhóm']);
  const leaderCodeIdx = findHeader(headers, ['Mã TTN', 'Mã TN']);
  const leaderNameIdx = findHeader(headers, ['Tên TTN', 'Họ tên TN']);
  const positionIdx = findHeader(headers, ['Chức vụ']);
  const tvvIdx = findHeader(headers, ['Họ tên TVV']);
  const contractIdx = findHeader(headers, ['Số hợp đồng', 'Số HĐ']);
  const rewardIdx = rewardIndex(headers);
  const passMetricIdx = headers.findIndex(h => normalized(h).includes('SL TVV'));
  const metricIdx = passMetricIdx >= 0 ? passMetricIdx : Math.max(positionIdx + 1, 5);
  const metricHeaderSource = headers[metricIdx] || '';
  const metricHeader = metricLabelFromHeader(metricHeaderSource);
  const activityMode = normalized(metricHeaderSource).includes('LUOT') && passMetricIdx < 0;
  const passMode = passMetricIdx >= 0;
  const includeContract = activityMode && contractIdx >= 0;
  const contractMap = detailByContract(details);

  type Child = { tvv: string; contract: string; detail?: DetailRecord };
  type Group = {
    stt: CellValue;
    nhom: string;
    code: string;
    name: string;
    position: string;
    metric: CellValue;
    reward: CellValue;
    children: Child[];
  };

  const groups: Group[] = [];
  let current: Group | null = null;
  for (const row of sourceRows) {
    const code = leaderCodeIdx >= 0 ? text(row[leaderCodeIdx]) : '';
    const leaderName = leaderNameIdx >= 0 ? text(row[leaderNameIdx]) : '';
    if (code || leaderName || !current) {
      current = {
        stt: sttIdx >= 0 ? row[sttIdx] : groups.length + 1,
        nhom: groupIdx >= 0 ? text(row[groupIdx]) : '',
        code,
        name: leaderName,
        position: positionIdx >= 0 ? text(row[positionIdx]) : 'Trưởng nhóm',
        metric: metricIdx >= 0 ? row[metricIdx] : '',
        reward: rewardIdx >= 0 ? row[rewardIdx] : '',
        children: [],
      };
      groups.push(current);
    }
    if (!current) continue;
    const tvv = tvvIdx >= 0 ? text(row[tvvIdx]) : '';
    const contract = contractIdx >= 0 ? text(row[contractIdx]) : '';
    if (tvv || contract) {
      current.children.push({ tvv, contract, detail: contractMap.get(normalized(contract)) });
    }
  }

  const outputHeaders: CellValue[] = [
    'STT', 'NHÓM', 'MÃ SỐ', 'HỌ TÊN', 'CHỨC VỤ',
    ...(includeContract ? contractResultHeaders() : []),
    metricHeader,
    'TIỀN THƯỞNG',
  ];
  const outputRows: Matrix = [];
  const merges: MergeRange[] = [];
  const leaderRows: number[] = [];
  let resultIndex = 0;

  for (const group of groups) {
    const normalizedGroup = normalized(group.nhom);
    let groupDetails = group.children
      .map(child => child.detail)
      .filter((detail): detail is DetailRecord => Boolean(detail));
    if (!groupDetails.length) {
      groupDetails = details.filter(detail => normalized(detail.group) === normalizedGroup);
    }

    let childRows: Array<{ detail: DetailRecord; metric: CellValue; contract: string }> = [];
    if (passMode) {
      const ipMin = parsePassThreshold(metricHeaderSource, 'IP');
      const afypMin = parsePassThreshold(metricHeaderSource, 'AFYP');
      if (ipMin != null || afypMin != null) {
        childRows = aggregateAgents(groupDetails)
          .filter(agent => (ipMin == null || agent.totalIP >= ipMin) && (afypMin == null || agent.totalAFYP >= afypMin))
          .map(agent => ({ detail: agent, metric: 1, contract: '' }));
      }
    } else if (activityMode) {
      const expectedRounds = Math.max(0, Math.round(numberValue(group.metric)));
      const candidates = groupDetails
        .filter(detail => Boolean(detail.contractNumber))
        .slice()
        .sort((a, b) => (b.roundValue || b.ip) - (a.roundValue || a.ip));
      const selected = expectedRounds > 0 ? candidates.slice(0, expectedRounds) : candidates;
      childRows = selected.map(detail => ({ detail, metric: 1, contract: detail.contractNumber }));
    } else {
      const isAFYP = metricHeader === 'TỔNG AFYP';
      childRows = aggregateAgents(groupDetails)
        .sort((a, b) => (isAFYP ? b.totalAFYP - a.totalAFYP : b.totalIP - a.totalIP))
        .map(agent => ({
          detail: agent,
          metric: isAFYP ? agent.totalAFYP : agent.totalIP,
          contract: '',
        }));
    }

    if (!shouldKeepResultPerson(group.reward, rewardIdx >= 0, childRows.length, group.stt)) continue;

    resultIndex += 1;
    const start = outputRows.length + 1;
    leaderRows.push(start);
    outputRows.push([
      resultIndex,
      group.nhom,
      group.code,
      group.name,
      group.position || 'Trưởng nhóm',
      ...(includeContract ? ['', '', '', '', ''] : []),
      group.metric,
      group.reward,
    ]);

    for (const child of childRows) {
      outputRows.push([
        '', '',
        child.detail.agentCode,
        child.detail.agentName,
        child.detail.position,
        ...(includeContract ? contractResultValues(child.contract, child.detail) : []),
        child.metric,
        '',
      ]);
    }

    const end = outputRows.length;
    if (end > start) {
      merges.push({ s: { r: start, c: 0 }, e: { r: end, c: 0 } });
      merges.push({ s: { r: start, c: 1 }, e: { r: end, c: 1 } });
      merges.push({ s: { r: start, c: outputHeaders.length - 1 }, e: { r: end, c: outputHeaders.length - 1 } });
    }
  }

  return { headers: outputHeaders, rows: outputRows, merges, leaderRows };
}

function normalizeContestWorkbook(workbook: any): void {
  const resultSheet = existingSheet(workbook, ['Kết quả thi đua', 'Kết quả']);
  const detailSheet = existingSheet(workbook, ['Chi tiết HĐ', 'Chi tiết']);
  const resultMatrix = sheetMatrix(resultSheet);
  const detailMatrix = sheetMatrix(detailSheet);
  if (!resultMatrix.length) return;

  const details = parseDetails(detailMatrix);
  const headers = resultMatrix[0] || [];
  const isNTD = findHeader(headers, ['Họ tên NTD']) >= 0;
  const isGroup = findHeader(headers, ['Mã TTN', 'Mã TN']) >= 0;

  const result = isNTD
    ? buildNTDResult(resultMatrix, details)
    : isGroup
      ? buildGroupResult(resultMatrix, details)
      : buildTVVResult(resultMatrix, details);

  const normalizedResultSheet = styleSheet(result.headers, result.rows, result.merges, result.leaderRows);

  const defaultDetailHeaders: CellValue[] = [
    'STT', 'BAN', 'NHÓM', 'MÃ BAN/NHÓM', 'MÃ ĐL', 'TÊN', 'CHỨC VỤ',
    'NGÀY BẮT ĐẦU LÀM VIỆC', 'SỐ HỢP ĐỒNG', 'NGÀY HIỆU LỰC', 'NGÀY PHÁT HÀNH',
    'PĐT + 10% ĐT', 'AFYP', 'AD', 'TÍNH LƯỢT 3 TR', 'MÃ ĐL TD', 'THƯỞNG',
  ];
  const detailHeaders = detailMatrix.length ? detailMatrix[0] : defaultDetailHeaders;
  // Keep every contract from the original detail sheet. That original sheet is
  // already restricted by the user's effective-date and issue-date filters;
  // no contest eligibility filtering is applied here.
  const detailRows = detailMatrix.length ? detailMatrix.slice(1) : [];
  const normalizedDetailSheet = styleSheet(detailHeaders, detailRows);

  workbook.Sheets = {
    Kết_quả: normalizedResultSheet,
    Chi_tiết: normalizedDetailSheet,
  };
  workbook.SheetNames = ['Kết_quả', 'Chi_tiết'];
}

export function writeFile(workbook: any, filename: string, options?: any): any {
  if (/^ket_qua_thi_dua_/i.test(filename || '')) {
    try {
      normalizeContestWorkbook(workbook);
    } catch (error) {
      // Never block the user's download. If template normalization fails,
      // preserve the workbook produced by the page and still save it.
      console.error('[contest-excel-template] Không thể chuẩn hóa file:', error);
    }
  }
  return XLSXCore.writeFile(workbook, filename, options);
}

export default XLSXCore;
