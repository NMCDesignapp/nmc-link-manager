import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const GROUP_ENTRY_IP_THRESHOLD = 150_000_000;

type MonthRef = { year: number; month: number; key: string; label: string };

function normalizeCode(value: unknown): string {
  return String(value || '').trim().toUpperCase();
}

function normalizeText(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi-VN')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLeaderRole(value: unknown): boolean {
  const role = normalizeText(value);
  return role === 'truong ban' || role === 'truong nhom';
}

function previousThreeMonths(year: number, month: number): MonthRef[] {
  const result: MonthRef[] = [];
  for (let offset = 3; offset >= 1; offset -= 1) {
    const date = new Date(Date.UTC(year, month - 1 - offset, 1));
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    result.push({ year: y, month: m, key: `${y}-${String(m).padStart(2, '0')}`, label: `T${m}/${y}` });
  }
  return result;
}

function monthStart(ref: MonthRef): Date {
  return new Date(Date.UTC(ref.year, ref.month - 1, 1));
}

function nextMonthStart(ref: MonthRef): Date {
  return new Date(Date.UTC(ref.year, ref.month, 1));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get('year'));
    const month = Number(searchParams.get('month'));
    if (!Number.isInteger(year) || year < 2020 || year > 2100) {
      return NextResponse.json({ error: 'Năm xét không hợp lệ' }, { status: 400 });
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Đợt xét không hợp lệ' }, { status: 400 });
    }

    const months = previousThreeMonths(year, month);
    const windowStart = monthStart(months[0]);
    const assessmentStart = new Date(Date.UTC(year, month - 1, 1));

    const [leaders, clbMembers, tvvStruct, banNhomRows, adRows, staffRows, contracts] = await Promise.all([
      db.leaderInfo.findMany({
        select: { id: true, agentCode: true, agentName: true, position: true, ban: true, nhom: true, maNhom: true },
      }),
      db.clbMember.findMany({ select: { agentCode: true } }),
      db.tVVStruct.findMany({ select: { agentCode: true, maBanNhom: true } }),
      db.banNhom.findMany({ select: { maBanNhom: true, tenBanNhom: true, maAD: true } }),
      db.aD.findMany({ select: { maAD: true, tenAD: true } }),
      db.staff.findMany({ select: { agentCode: true, nhom: true, maNhom: true } }),
      db.contract.findMany({
        where: { issueDate: { gte: windowStart, lt: assessmentStart } },
        select: { agentCode: true, pdt10DT: true, issueDate: true },
      }),
    ]);

    const clbCodes = new Set(clbMembers.map((m) => normalizeCode(m.agentCode)).filter(Boolean));
    const banNhomByCode = new Map(banNhomRows.map((row) => [String(row.maBanNhom || '').trim(), row]));
    const banNhomByName = new Map(banNhomRows.map((row) => [normalizeText(row.tenBanNhom), row]));
    const adByCode = new Map(adRows.map((row) => [String(row.maAD || '').trim(), row.tenAD || row.maAD || '']));

    const tvvByGroup = new Map<string, Set<string>>();
    for (const tvv of tvvStruct) {
      const groupCode = String(tvv.maBanNhom || '').trim();
      const code = normalizeCode(tvv.agentCode);
      if (!groupCode || !code) continue;
      const set = tvvByGroup.get(groupCode) || new Set<string>();
      set.add(code);
      tvvByGroup.set(groupCode, set);
    }

    const staffByGroupName = new Map<string, Set<string>>();
    for (const staff of staffRows) {
      const groupName = normalizeText(staff.nhom);
      const code = normalizeCode(staff.agentCode);
      if (!groupName || !code) continue;
      const set = staffByGroupName.get(groupName) || new Set<string>();
      set.add(code);
      staffByGroupName.set(groupName, set);
    }

    const contractsByAgent = new Map<string, typeof contracts>();
    for (const contract of contracts) {
      const code = normalizeCode(contract.agentCode);
      if (!code || !contract.issueDate) continue;
      const list = contractsByAgent.get(code) || [];
      list.push(contract);
      contractsByAgent.set(code, list);
    }

    const sumAgentIP = (agentCode: string, start: Date, endExclusive: Date): number =>
      (contractsByAgent.get(agentCode) || []).reduce((sum, contract) => {
        if (!contract.issueDate) return sum;
        const date = new Date(contract.issueDate);
        if (date < start || date >= endExclusive) return sum;
        return sum + Number(contract.pdt10DT || 0);
      }, 0);

    const rows = leaders
      .filter((leader) => isLeaderRole(leader.position))
      .filter((leader) => {
        const code = normalizeCode(leader.agentCode);
        return Boolean(code) && !clbCodes.has(code);
      })
      .map((leader) => {
        const code = normalizeCode(leader.agentCode);
        const groupNameKey = normalizeText(leader.nhom);
        const groupCode = String(leader.maNhom || banNhomByName.get(groupNameKey)?.maBanNhom || '').trim();
        const groupInfo = banNhomByCode.get(groupCode) || banNhomByName.get(groupNameKey);
        const groupAgentCodes = new Set<string>();
        if (groupCode && tvvByGroup.has(groupCode)) {
          for (const agentCode of tvvByGroup.get(groupCode) || []) groupAgentCodes.add(agentCode);
        }
        if (groupAgentCodes.size === 0 && groupNameKey && staffByGroupName.has(groupNameKey)) {
          for (const agentCode of staffByGroupName.get(groupNameKey) || []) groupAgentCodes.add(agentCode);
        }
        // Gia nhập TN: doanh số nhóm luôn bao gồm cả cá nhân TB/TN.
        groupAgentCodes.add(code);

        const monthlyGroupIP = months.map((ref) => {
          const start = monthStart(ref);
          const endExclusive = nextMonthStart(ref);
          let total = 0;
          for (const agentCode of groupAgentCodes) total += sumAgentIP(agentCode, start, endExclusive);
          return total;
        });
        const totalGroupIP = monthlyGroupIP.reduce((sum, value) => sum + value, 0);
        const passed = totalGroupIP >= GROUP_ENTRY_IP_THRESHOLD;
        return {
          id: leader.id,
          ad: groupInfo ? (adByCode.get(String(groupInfo.maAD || '').trim()) || groupInfo.maAD || '') : leader.ban || '',
          nhom: leader.nhom || groupInfo?.tenBanNhom || '',
          maNhom: groupCode,
          agentCode: leader.agentCode || '',
          agentName: leader.agentName || '',
          chucVu: leader.position || '',
          monthlyGroupIP,
          totalGroupIP,
          passed,
          result: passed ? 'Đạt gia nhập TN' : 'Chưa đạt',
        };
      })
      .sort((a, b) => String(a.agentName).localeCompare(String(b.agentName), 'vi', { sensitivity: 'base' }));

    const passed = rows.filter((row) => row.passed).length;
    return NextResponse.json({
      assessment: { year, month, label: `1/${month}/${year}` },
      months,
      rule: {
        groupIpThreshold: GROUP_ENTRY_IP_THRESHOLD,
        description: 'Gia nhập TN khi Tổng IP nhóm 3 tháng liền trước từ 150.000.000 trở lên, bao gồm IP cá nhân TB/TN; doanh số tính theo Ngày phát hành',
      },
      summary: { total: rows.length, passed, failed: rows.length - passed },
      rows,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('GET /api/clb-sao-viet/gia-nhap-tn error:', error);
    return NextResponse.json({ error: 'Không thể tính kết quả gia nhập TN' }, { status: 500 });
  }
}
