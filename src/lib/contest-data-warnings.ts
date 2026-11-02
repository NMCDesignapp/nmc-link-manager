export type ContestWarningSeverity = 'error' | 'warning';

export type ContestDataWarning = {
  code: string;
  severity: ContestWarningSeverity;
  title: string;
  detail: string;
  count: number;
  samples: string[];
};

type WarningContract = {
  contractNumber?: unknown;
  agentCode?: unknown;
  agentName?: unknown;
  maNhom?: unknown;
  effectiveDate?: unknown;
  issueDate?: unknown;
  pdt10DT?: unknown;
  fyp?: unknown;
  afyp?: unknown;
};

const text = (value: unknown) => String(value ?? '').trim();
const sampleLabel = (row: WarningContract, index: number) =>
  [text(row.contractNumber), text(row.agentCode), text(row.agentName)].filter(Boolean).join(' · ') || `Dòng ${index + 1}`;

export function findContestDataWarnings(rows: WarningContract[]): ContestDataWarning[] {
  const warnings: ContestDataWarning[] = [];
  const collect = (code: string, severity: ContestWarningSeverity, title: string, detail: string, matches: Array<{ row: WarningContract; index: number }>) => {
    if (!matches.length) return;
    warnings.push({ code, severity, title, detail, count: matches.length, samples: matches.slice(0, 5).map(({ row, index }) => sampleLabel(row, index)) });
  };
  const indexed = rows.map((row, index) => ({ row, index }));

  collect('missing-agent-code', 'error', 'Thiếu mã đại lý', 'Không thể xác định chính xác người hoặc nhóm nhận kết quả.', indexed.filter(({ row }) => !text(row.agentCode)));
  collect('missing-contract-number', 'warning', 'Thiếu số hợp đồng', 'Cần kiểm tra để tránh đếm trùng hoặc không truy được hợp đồng.', indexed.filter(({ row }) => !text(row.contractNumber)));
  collect('missing-agent-name', 'warning', 'Thiếu họ tên', 'Mã có dữ liệu nhưng thiếu tên hiển thị.', indexed.filter(({ row }) => !text(row.agentName)));
  collect('missing-group', 'warning', 'Thiếu mã nhóm', 'Kết quả theo nhóm có thể không phân bổ đúng.', indexed.filter(({ row }) => !text(row.maNhom)));

  const byContract = new Map<string, Array<{ row: WarningContract; index: number }>>();
  for (const item of indexed) {
    const key = text(item.row.contractNumber).toUpperCase();
    if (!key) continue;
    const group = byContract.get(key) || [];
    group.push(item);
    byContract.set(key, group);
  }
  collect('duplicate-contract', 'error', 'Trùng số hợp đồng', 'Một số hợp đồng xuất hiện nhiều hơn một lần trong tập đang xét.', [...byContract.values()].filter(group => group.length > 1).flat());
  collect('missing-date', 'warning', 'Thiếu ngày hợp đồng', 'Cả ngày hiệu lực và ngày phát hành đều trống.', indexed.filter(({ row }) => !text(row.effectiveDate) && !text(row.issueDate)));
  collect('negative-value', 'error', 'Giá trị doanh số âm', 'IP, FYP hoặc AFYP có giá trị âm và cần được đối soát.', indexed.filter(({ row }) => [row.pdt10DT, row.fyp, row.afyp].some(value => Number(value) < 0)));
  return warnings;
}
