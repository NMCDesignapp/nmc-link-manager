const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const count = await prisma.tuyenNgang.count();
    console.log('TuyenNgang count:', count);
    if (count > 0) {
      const rows = await prisma.tuyenNgang.findMany({ take: 3 });
      console.log('First 3 rows:', JSON.stringify(rows, null, 2));
    }
    const tvvCount = await prisma.tVVStruct.count();
    const leadersCount = await prisma.leader.count();
    const recruitersCount = await prisma.recruiter.count();
    console.log(`TVV: ${tvvCount}, Leaders: ${leadersCount}, Recruiters: ${recruitersCount}`);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
