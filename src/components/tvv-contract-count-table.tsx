'use client';

import { Fragment, useId } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getGroupTVVContractProgress, formatTVVContractProgressNote, formatDate, formatNumber } from '@/lib/contest-calculator';
import type { Contract, GroupData, StaffMember, TVVStructMember, ContestConfig } from '@/lib/contest-calculator';

type Props = {
  groups: GroupData[];
  contracts: Contract[];
  staff: StaffMember[];
  structure: TVVStructMember[];
  config: Pick<ContestConfig, 'secondaryIPMin' | 'secondaryAFYPMin' | 'tvvContractCountMin' | 'includeTNInPassCount'>;
  reward: (group: GroupData, count: number) => string | null;
  hideNotAchieved?: boolean;
  loading?: boolean;
};

/** Shared by live results and saved programs. Merge only within the same group. */
export function TVVContractCountTable({ groups, contracts, staff, structure, config, reward, hideNotAchieved, loading }: Props) {
  const tableId = `tvv-contract-table-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const rows = groups.map(group => {
    const agents = getGroupTVVContractProgress(group, contracts, staff, config, structure);
    const count = agents.filter(agent => agent.qualified).length;
    const details = agents.flatMap(agent => agent.contracts.map((contract, index) => ({ contract, qualified: agent.qualified, contractCount: agent.contracts.length, firstOfAgent: index === 0 })));
    return { group, count, details, reward: reward(group, count) };
  }).filter(row => !hideNotAchieved || row.reward !== null).sort((a, b) => b.count - a.count);
  return <>
    <style>{`
      /* Override the shared per-row zebra theme only for this merged-group table. */
      #${tableId} > tbody > tr,
      #${tableId} > tbody > tr > td {
        background: #ffffff !important;
        background-image: none !important;
      }
      #${tableId} [data-tvv-progress-note] > span {
        color: #dc2626 !important; font-size: 15px !important; font-style: italic !important; font-weight: 700 !important;
      }
      #${tableId} > tbody > tr[data-tvv-group-start='1'] > td {
        border-top: 2px solid #64748b !important;
      }
    `}</style>
  <Table id={tableId} data-nmc-tvv-contract-table="1">
    <TableHeader className="sticky top-0 z-10 bg-emerald-800">
      <TableRow>{['STT', 'NHÓM', 'MÃ TN', 'HỌ TÊN TN', 'HỌ TÊN TVV HOẠT ĐỘNG', 'NGÀY HL', 'IP', 'AFYP', 'SL TVV HĐ', 'TIỀN THƯỞNG', 'GHI CHÚ'].map(label =>
        <TableHead key={label} scope="col" className="text-center text-xs font-bold text-yellow-100 whitespace-nowrap">{label}</TableHead>)}</TableRow>
    </TableHeader>
    <TableBody>
      {loading ? <TableRow><TableCell colSpan={11} className="text-center">Đang tải dữ liệu…</TableCell></TableRow> : rows.length === 0 ? <TableRow><TableCell colSpan={11} className="text-center">Không có dữ liệu phù hợp.</TableCell></TableRow> : rows.map((row, index) => {
        const details = row.details.length ? row.details : [null];
        return <Fragment key={row.group.maNhom}>{details.map((detail, detailIndex) => {
          const contract = detail?.contract;
          // Inline widths survive detached PNG capture; the scoped rule keeps
          // global KPI border colors from weakening the group divider on screen.
          const cellStyle = detailIndex === 0 ? { borderTop: '2px solid #64748b' } : undefined;
          return <TableRow key={`${contract?.id || 'empty'}:${detailIndex}`} data-tvv-group-start={detailIndex === 0 ? '1' : undefined} className="border-b border-gray-200 bg-white text-gray-800">
          {detailIndex === 0 && <>
            <TableCell rowSpan={details.length} style={cellStyle} className="text-center align-middle">{index + 1}</TableCell>
            <TableCell rowSpan={details.length} style={cellStyle} className="text-center align-middle font-semibold whitespace-nowrap">{row.group.nhom || '—'}</TableCell>
            <TableCell rowSpan={details.length} style={cellStyle} className="text-center align-middle whitespace-nowrap">{row.group.leader?.agentCode || '—'}</TableCell>
            <TableCell rowSpan={details.length} style={cellStyle} className="text-center align-middle whitespace-nowrap">{row.group.leader?.agentName || '—'}</TableCell>
          </>}
          <TableCell style={cellStyle} className="whitespace-nowrap">
            {contract?.agentName || '—'}
          </TableCell>
          <TableCell style={cellStyle} className="text-center whitespace-nowrap">{contract ? formatDate(contract.effectiveDate) : '—'}</TableCell>
          <TableCell style={cellStyle} className="text-center whitespace-nowrap">{contract ? formatNumber(contract.pdt10DT) : '—'}</TableCell>
          <TableCell style={cellStyle} className="text-center whitespace-nowrap">{contract ? formatNumber(contract.afyp) : '—'}</TableCell>
          {detailIndex === 0 && <>
            <TableCell rowSpan={details.length} style={cellStyle} className="text-center align-middle font-bold">{row.count}</TableCell>
            <TableCell rowSpan={details.length} style={cellStyle} className="text-center align-middle font-bold text-emerald-700 whitespace-nowrap">{row.reward ?? '—'}</TableCell>
          </>}
          <TableCell style={cellStyle} className="text-center whitespace-nowrap" data-tvv-progress-note="1">
            {detail?.firstOfAgent && !detail.qualified && <span>{formatTVVContractProgressNote(detail.contractCount, detail.qualified)}</span>}
          </TableCell>
        </TableRow>; })}</Fragment>;
      })}
    </TableBody>
  </Table></>;
}
