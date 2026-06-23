import { PrismaClient } from '@prisma/client';
const p = new PrismaClient({ datasources: { db: { url: 'file:/home/z/my-project/db/custom.db' } } });
try {
  const all = await p.tVVStruct.findMany({ select: { agentCode: true, agentName: true, maBanNhom: true, maTVVTuyendung: true } });
  console.log('Total TVV:', all.length);
  const hasNtd = all.filter(t => t.maTVVTuyendung && t.maTVVTuyendung.trim());
  console.log('Có mã NTD:', hasNtd.length);
  console.log('Trống mã NTD:', all.length - hasNtd.length);
  if (hasNtd.length > 0) {
    console.log('---Sample có mã NTD:');
    hasNtd.slice(0, 10).forEach(t => console.log(`  agentCode=${t.agentCode} | name=${t.agentName} | maBanNhom=${t.maBanNhom} | NTD=${t.maTVVTuyendung}`));
    const codeSet = new Set(all.map(t => t.agentCode));
    const matched = hasNtd.filter(t => codeSet.has(t.maTVVTuyendung.trim()));
    const unmatched = hasNtd.filter(t => !codeSet.has(t.maTVVTuyendung.trim()));
    console.log('---Mã NTD MATCH agentCode trong DS:', matched.length);
    console.log('---Mã NTD KHÔNG MATCH agentCode nào:', unmatched.length);
    if (unmatched.length > 0) {
      console.log('---Sample mã NTD không match:');
      unmatched.slice(0, 10).forEach(t => console.log(`  TVV: ${t.agentCode} | ${t.agentName} | NTD (không match): "${t.maTVVTuyendung}"`));
    }
  }
} catch (e) {
  console.error('ERR:', e.message);
}
await p.$disconnect();
