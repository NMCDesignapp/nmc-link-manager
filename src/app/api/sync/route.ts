import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
}

function parseCSVLine(line: string): string[] {
  const columns: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { columns.push(current.trim()); current = ''; }
    else { current += char; }
  }
  columns.push(current.trim());
  return columns;
}

function parseNumber(numStr: string): number {
  if (!numStr || numStr.trim() === '') return 0;
  const cleaned = numStr.trim().replace(/\./g, '').replace(/,/g, '.');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

// POST /api/sync - Sync all 3 CSVs simultaneously
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractCsv, staffCsv, recruiterCsv } = body as {
      contractCsv?: string;
      staffCsv?: string;
      recruiterCsv?: string;
    };

    const results = { contracts: 0, staff: 0, recruiters: 0, errors: [] as string[] };

    // 1. Import Contracts
    if (contractCsv) {
      try {
        await db.contract.deleteMany();
        const lines = contractCsv.split('\n').filter(l => l.trim() !== '');
        const dataLines = lines.slice(1);
        const contracts = [];
        const seenContractNumbers = new Set<string>();
        const agentMap = new Map<string, { agentCode: string; agentName: string; position: string; ban: string; nhom: string; maNhom: string; leaderAgentCode: string; startDate: Date | null }>();

        for (const line of dataLines) {
          const columns = parseCSVLine(line);
          const contractNumber = columns[10] || '';
          const agentCode = columns[6] || '';
          const agentName = columns[7] || '';
          const position = columns[8] || '';
          const ban = columns[1] || '';
          const nhom = columns[3] || '';
          const maNhom = columns[4] || '';
          const leaderAgentCode = columns[5] || '';
          const startDateStr = columns[9] || '';
          const effectiveDateStr = columns[11] || '';
          const issueDateStr = columns[12] || '';
          const fypStr = columns[13] || '';
          const afypStr = columns[20] || '';
          const tinhLuotStr = columns[26] || '0';

          if (!contractNumber || !effectiveDateStr) continue;
          if (seenContractNumbers.has(contractNumber)) continue;
          seenContractNumbers.add(contractNumber);

          const effectiveDate = parseDate(effectiveDateStr);
          const issueDate = parseDate(issueDateStr);
          const startDate = parseDate(startDateStr);
          if (!effectiveDate) continue;

          const fyp = parseNumber(fypStr);
          const afyp = parseNumber(afypStr);
          const tinhLuot = parseNumber(tinhLuotStr);

          contracts.push({ contractNumber, agentCode, agentName, position, ban, nhom, maNhom, leaderAgentCode, recruiterCode: '', startDate, effectiveDate, issueDate: issueDate || effectiveDate, fyp, afyp, tinhLuot });

          if (agentCode && !agentMap.has(agentCode)) {
            agentMap.set(agentCode, { agentCode, agentName, position, ban, nhom, maNhom, leaderAgentCode, startDate });
          }
        }

        if (contracts.length > 0) {
          const result = await db.contract.createMany({ data: contracts, skipDuplicates: true });
          results.contracts = result.count;
        }

        // Also upsert staff from contracts
        const staffUpserts = Array.from(agentMap.values()).map(agent =>
          db.staff.upsert({
            where: { agentCode: agent.agentCode },
            update: { agentName: agent.agentName, position: agent.position, ban: agent.ban, nhom: agent.nhom, maNhom: agent.maNhom, leaderAgentCode: agent.leaderAgentCode, startDate: agent.startDate },
            create: { agentCode: agent.agentCode, agentName: agent.agentName, position: agent.position, ban: agent.ban, nhom: agent.nhom, maNhom: agent.maNhom, leaderAgentCode: agent.leaderAgentCode, startDate: agent.startDate },
          })
        );
        if (staffUpserts.length > 0) {
          const sr = await Promise.all(staffUpserts);
          results.staff = sr.length;
        }
      } catch (err) {
        results.errors.push(`HĐ: ${err instanceof Error ? err.message : 'Lỗi'}`);
      }
    }

    // 2. Import Staff CSV (supplements/overrides staff from contracts)
    if (staffCsv) {
      try {
        const lines = staffCsv.split('\n').filter(l => l.trim() !== '');
        const dataLines = lines.slice(1);
        const staffUpserts = [];

        for (const line of dataLines) {
          const columns = parseCSVLine(line);
          const agentCode = columns[1] || '';
          const agentName = columns[2] || '';
          const position = columns[3] || '';
          const ban = columns[4] || '';
          const nhom = columns[5] || '';
          const maNhom = columns[6] || '';
          const leaderAgentCode = columns[7] || '';
          const startDateStr = columns[8] || '';

          if (!agentCode || !agentName) continue;

          staffUpserts.push(
            db.staff.upsert({
              where: { agentCode },
              update: { agentName, position, ban, nhom, maNhom, leaderAgentCode, startDate: parseDate(startDateStr) },
              create: { agentCode, agentName, position, ban, nhom, maNhom, leaderAgentCode, startDate: parseDate(startDateStr) },
            })
          );
        }

        if (staffUpserts.length > 0) {
          const sr = await Promise.all(staffUpserts);
          results.staff = Math.max(results.staff, sr.length);
        }
      } catch (err) {
        results.errors.push(`NV: ${err instanceof Error ? err.message : 'Lỗi'}`);
      }
    }

    // 3. Import Recruiter CSV
    if (recruiterCsv) {
      try {
        await db.recruiter.deleteMany();
        const lines = recruiterCsv.split('\n').filter(l => l.trim() !== '');
        const dataLines = lines.slice(1);
        const recruiters = [];

        for (const line of dataLines) {
          const columns = parseCSVLine(line);
          const nydCode = columns[1] || '';
          const nydName = columns[2] || '';
          const position = columns[3] || '';
          const ban = columns[4] || '';
          const nhom = columns[5] || '';
          const maNhom = columns[6] || '';
          const recruitedAgentCode = columns[7] || '';
          const recruitedAgentName = columns[8] || '';
          const recruitedStartDateStr = columns[9] || '';

          if (!nydCode || !recruitedAgentCode) continue;

          recruiters.push({
            nydCode, nydName, position, ban, nhom, maNhom,
            recruitedAgentCode, recruitedAgentName,
            recruitedStartDate: parseDate(recruitedStartDateStr),
          });
        }

        if (recruiters.length > 0) {
          const result = await db.recruiter.createMany({ data: recruiters, skipDuplicates: true });
          results.recruiters = result.count;
        }
      } catch (err) {
        results.errors.push(`NYD: ${err instanceof Error ? err.message : 'Lỗi'}`);
      }
    }

    const message = `Đã nhập: ${results.contracts} HĐ | ${results.staff} NV | ${results.recruiters} NYD-TVV${results.errors.length > 0 ? ` | Lỗi: ${results.errors.join('; ')}` : ''}`;
    return NextResponse.json({ message, ...results });
  } catch (error) {
    console.error('Error syncing data:', error);
    return NextResponse.json(
      { error: 'Không thể đồng bộ: ' + (error instanceof Error ? error.message : 'Lỗi') },
      { status: 500 }
    );
  }
}
