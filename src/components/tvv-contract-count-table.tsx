'use client';

import { Fragment } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getGroupTVVContractDetails, formatDate, formatNumber } from '@/lib/contest-calculator';
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
  const rows = groups.map(group => {
    const agents = getGroupTVVContractDetails(group, contracts, staff, config, structure);
    return { group, count: agents.length, contracts: agents.flatMap(agent => agent.contracts), reward: reward(group, agents.length) };
  }).filter(row => !hideNotAchieved || row.reward !== null).sort((a, b) => b.count - a.count);
  return <Table>
    <TableHeader className="sticky top-0 z-10 bg-emerald-800">
      <TableRow>{['STT', 'NHÓM', 'MÃ TN', 'HỌ TÊN TN', 'HỌ TÊN TVV HOẠT ĐỘNG', 'NGÀY HL', 'IP', 'AFYP', 'SL TVV HĐ', 'TIỀN THƯỞNG'].map(label =>
        <TableHead key={label} scope="col" className="text-center text-xs font-bold text-yellow-100 whitespace-nowrap">{label}</TableHead>)}</TableRow>
    </TableHeader>
    <TableBody>
      {loading ? <TableRow><TableCell colSpan={10} className="text-center">Đang tải dữ liệu…</TableCell></TableRow> : rows.length === 0 ? <TableRow><TableCell colSpan={10} className="text-center">Không có dữ liệu phù hợp.</TableCell></TableRow> : rows.map((row, index) => {
        const details = row.contracts.length ? row.contracts : [null];
        return <Fragment key={row.group.maNhom}>{details.map((contract, detailIndex) => <TableRow key={`${contract?.id || 'empty'}:${detailIndex}`} className="border-b border-gray-200 bg-white text-gray-800">
          {detailIndex === 0 && <>
            <TableCell rowSpan={details.length} className="text-center align-middle">{index + 1}</TableCell>
            <TableCell rowSpan={details.length} className="text-center align-middle font-semibold whitespace-nowrap">{row.group.nhom || '—'}</TableCell>
            <TableCell rowSpan={details.length} className="text-center align-middle whitespace-nowrap">{row.group.leader?.agentCode || '—'}</TableCell>
            <TableCell rowSpan={details.length} className="text-center align-middle whitespace-nowrap">{row.group.leader?.agentName || '—'}</TableCell>
          </>}
          <TableCell className="whitespace-nowrap">{contract?.agentName || '—'}</TableCell>
          <TableCell className="text-center whitespace-nowrap">{contract ? formatDate(contract.effectiveDate) : '—'}</TableCell>
          <TableCell className="text-center whitespace-nowrap">{contract ? formatNumber(contract.pdt10DT) : '—'}</TableCell>
          <TableCell className="text-center whitespace-nowrap">{contract ? formatNumber(contract.afyp) : '—'}</TableCell>
          {detailIndex === 0 && <>
            <TableCell rowSpan={details.length} className="text-center align-middle font-bold">{row.count}</TableCell>
            <TableCell rowSpan={details.length} className="text-center align-middle font-bold text-emerald-700 whitespace-nowrap">{row.reward ?? '—'}</TableCell>
          </>}
        </TableRow>)}</Fragment>;
      })}
    </TableBody>
  </Table>;
}
