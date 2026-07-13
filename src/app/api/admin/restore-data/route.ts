import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// POST /api/admin/restore-data
// Restore toàn bộ data từ backup JSON (commit d61a8bf ngày 12/07/2026) vào DB hiện tại.
// Backup files nằm trong /backups/20260712_195857/ (checkout từ branch db-backups).
//
// Cách dùng:
//   curl -X POST https://nc-link.vercel.app/api/admin/restore-data
//
// Logic:
//   1. Đọc tất cả file JSON trong backups/20260712_195857/
//   2. Cho mỗi table, delete all rows hiện tại + insert rows từ backup
//   3. Trả về summary (table → rows restored)
//
// Idempotent: chạy nhiều lần không sao — mỗi lần delete all rồi insert lại.

interface RestoreResult {
  table: string;
  deleted: number;
  inserted: number;
  error?: string;
}

export async function POST(req: NextRequest) {
  const results: RestoreResult[] = [];
  const backupDir = join(process.cwd(), 'backups', '20260712_195857');

  try {
    // Check backup dir exists
    let files: string[];
    try {
      files = readdirSync(backupDir).filter(f => f.endsWith('.json') && f !== '_summary.json');
    } catch (err) {
      return NextResponse.json({
        error: 'Backup directory not found',
        details: `Expected: ${backupDir}. Make sure backup files are committed to main branch.`,
      }, { status: 500 });
    }

    console.log(`[restore-data] Found ${files.length} backup files`);

    // Helper: parse JSON file safely
    const readJson = (filename: string): any[] => {
      try {
        const content = readFileSync(join(backupDir, filename), 'utf-8');
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : (parsed.data || []);
      } catch (err) {
        console.warn(`[restore-data] Cannot read ${filename}:`, err);
        return [];
      }
    };

    // Helper: delete all + insert for a table
    const restoreTable = async (table: string, filename: string, insertFn: (rows: any[]) => Promise<number>) => {
      const rows = readJson(filename);
      try {
        // Delete all existing rows
        // @ts-expect-error - dynamic table access
        await db[table].deleteMany({});
        // Insert rows from backup
        const inserted = await insertFn(rows);
        results.push({ table, deleted: rows.length, inserted });
        console.log(`[restore-data] ${table}: deleted all, inserted ${inserted} rows`);
      } catch (err: any) {
        console.error(`[restore-data] Error restoring ${table}:`, err?.message);
        results.push({ table, deleted: 0, inserted: 0, error: err?.message || String(err) });
      }
    };

    // Restore each table (order: independent tables first, then dependent)
    await restoreTable('aD', 'AD.json', async (rows) => {
      if (rows.length === 0) return 0;
      await db.aD.createMany({ data: rows.map((r: any) => ({
        id: r.id, maAD: r.maAD, tenAD: r.tenAD, maPhong: r.maPhong || '', note: r.note || '',
      })) });
      return rows.length;
    });

    await restoreTable('banNhom', 'BanNhom.json', async (rows) => {
      if (rows.length === 0) return 0;
      await db.banNhom.createMany({ data: rows.map((r: any) => ({
        id: r.id, maBanNhom: r.maBanNhom, tenBanNhom: r.tenBanNhom, maAD: r.maAD || '', note: r.note || '',
      })) });
      return rows.length;
    });

    await restoreTable('phong', 'Phong.json', async (rows) => {
      if (rows.length === 0) return 0;
      await db.phong.createMany({ data: rows.map((r: any) => ({
        id: r.id, maPhong: r.maPhong, tenPhong: r.tenPhong, note: r.note || '',
      })) });
      return rows.length;
    });

    await restoreTable('leaderInfo', 'LeaderInfo.json', async (rows) => {
      if (rows.length === 0) return 0;
      await db.leaderInfo.createMany({ data: rows.map((r: any) => ({
        id: r.id, agentCode: r.agentCode, agentName: r.agentName, position: r.position || '',
        ban: r.ban || '', nhom: r.nhom || '', maNhom: r.maNhom || '', salary: r.salary || 0,
        phone: r.phone || '', email: r.email || '', note: r.note || '',
        startDate: r.startDate ? new Date(r.startDate) : null,
      })) });
      return rows.length;
    });

    await restoreTable('staff', 'Staff.json', async (rows) => {
      if (rows.length === 0) return 0;
      await db.staff.createMany({ data: rows.map((r: any) => ({
        id: r.id, nhom: r.nhom || '', maNhom: r.maNhom || '', agentCode: r.agentCode,
        agentName: r.agentName, position: r.position || '',
        startDate: r.startDate ? new Date(r.startDate) : null,
      })) });
      return rows.length;
    });

    await restoreTable('recruiter', 'Recruiter.json', async (rows) => {
      if (rows.length === 0) return 0;
      await db.recruiter.createMany({ data: rows.map((r: any) => ({
        id: r.id, nhom: r.nhom || '', agentCode: r.agentCode, agentName: r.agentName,
        position: r.position || '',
        startDate: r.startDate ? new Date(r.startDate) : null,
        ngayHieuLuc: r.ngayHieuLuc ? new Date(r.ngayHieuLuc) : null,
      })) });
      return rows.length;
    });

    await restoreTable('tuyenNgang', 'TuyenNgang.json', async (rows) => {
      if (rows.length === 0) return 0;
      await db.tuyenNgang.createMany({ data: rows.map((r: any) => ({
        id: r.id, nhom: r.nhom || '', agentCode: r.agentCode, agentName: r.agentName,
        ngayBatDau: r.ngayBatDau ? new Date(r.ngayBatDau) : null,
        ngayHieuLuc: r.ngayHieuLuc ? new Date(r.ngayHieuLuc) : null,
        maNguoiTuyenDung: r.maNguoiTuyenDung || '', tenNguoiTuyenDung: r.tenNguoiTuyenDung || '',
      })) });
      return rows.length;
    });

    await restoreTable('tVVStruct', 'TVVStruct.json', async (rows) => {
      if (rows.length === 0) return 0;
      await db.tVVStruct.createMany({ data: rows.map((r: any) => ({
        id: r.id, agentCode: r.agentCode, agentName: r.agentName, maBanNhom: r.maBanNhom || '',
        chucVu: r.chucVu || '',
        ngayBatDau: r.ngayBatDau ? new Date(r.ngayBatDau) : null,
        maTVVTuyendung: r.maTVVTuyendung || '', note: r.note || '',
      })) });
      return rows.length;
    });

    await restoreTable('contract', 'Contract.json', async (rows) => {
      if (rows.length === 0) return 0;
      // Contracts có nhiều fields — insert batch 100 rows để tránh memory issues
      const batchSize = 100;
      let totalInserted = 0;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        await db.contract.createMany({ data: batch.map((r: any) => ({
          id: r.id, stt: r.stt || 0, contractNumber: r.contractNumber,
          agentCode: r.agentCode, agentName: r.agentName, position: r.position || '',
          ban: r.ban || '', maTruongBan: r.maTruongBan || '', nhom: r.nhom || '',
          maBanNhom: r.maBanNhom || '', maTruongBanNhom: r.maTruongBanNhom || '',
          maDL: r.maDL || '', maNhom: r.maNhom || '', leaderAgentCode: r.leaderAgentCode || '',
          ngayBatDauLamViec: r.ngayBatDauLamViec ? new Date(r.ngayBatDauLamViec) : null,
          effectiveDate: r.effectiveDate ? new Date(r.effectiveDate) : null,
          issueDate: r.issueDate ? new Date(r.issueDate) : null,
          pdt10DT: r.pdt10DT || 0, fyp: r.fyp || 0, nguonDuLieu: r.nguonDuLieu || '',
          hopDongToChuc: r.hopDongToChuc || '', dkDongPhi: r.dkDongPhi || '',
          phiDongThem: r.phiDongThem || 0, afypChuaTru10DT: r.afypChuaTru10DT || 0,
          afyp: r.afyp || 0, ad: r.ad || '', nhom2: r.nhom2 || '',
          ngayBatDauLamViec2: r.ngayBatDauLamViec2 ? new Date(r.ngayBatDauLamViec2) : null,
          thangTD: r.thangTD || 0, namTD: r.namTD || 0, thangHL: r.thangHL || 0,
          tinhLuot: r.tinhLuot || 0, tinhLuot3tr: r.tinhLuot3tr || 0,
          maDaiLyTD: r.maDaiLyTD || '', danhDauTVV: r.danhDauTVV || '',
          chucVu2: r.chucVu2 || '', recruiterCode: r.recruiterCode || '',
          startDate: r.startDate ? new Date(r.startDate) : null,
        })) });
        totalInserted += batch.length;
      }
      return totalInserted;
    });

    await restoreTable('monthlyRevenue', 'MonthlyRevenue.json', async (rows) => {
      if (rows.length === 0) return 0;
      const batchSize = 100;
      let totalInserted = 0;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        await db.monthlyRevenue.createMany({ data: batch.map((r: any) => ({
          id: r.id, month: r.month, maNhom: r.maNhom || '', nhom: r.nhom || '',
          agentCode: r.agentCode || '', agentName: r.agentName || '',
          totalFYP: r.totalFYP || 0, totalAFYP: r.totalAFYP || 0,
          contractCount: r.contractCount || 0, activityRounds: r.activityRounds || 0,
          note: r.note || '',
        })) });
        totalInserted += batch.length;
      }
      return totalInserted;
    });

    await restoreTable('saoVietData', 'SaoVietData.json', async (rows) => {
      if (rows.length === 0) return 0;
      const batchSize = 100;
      let totalInserted = 0;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        await db.saoVietData.createMany({ data: batch.map((r: any) => ({
          id: r.id, program: r.program, agentCode: r.agentCode || '', agentName: r.agentName || '',
          nhomKD: r.nhomKD || '', fyp: r.fyp || 0, fypTVVm: r.fypTVVm || 0,
          slTvvmHDC: r.slTvvmHDC || 0, tvvmCount: r.tvvmCount || 0,
        })) });
        totalInserted += batch.length;
      }
      return totalInserted;
    });

    await restoreTable('contest', 'Contest.json', async (rows) => {
      if (rows.length === 0) return 0;
      for (const r of rows) {
        await db.contest.create({ data: {
          id: r.id, title: r.title,
          startDate: r.startDate ? new Date(r.startDate) : new Date(),
          endDate: r.endDate ? new Date(r.endDate) : new Date(),
          issueDate: r.issueDate ? new Date(r.issueDate) : null,
          conditionType: r.conditionType || 'per_contract_ip',
          targetType: r.targetType || 'tvv',
          bonusTiers: r.bonusTiers || '[]',
          posterUrl: r.posterUrl || '',
          participants: r.participants || '[]',
          usePhase2: r.usePhase2 ?? false,
          phase2StartDate: r.phase2StartDate ? new Date(r.phase2StartDate) : null,
          phase2EndDate: r.phase2EndDate ? new Date(r.phase2EndDate) : null,
          bonusTiers2: r.bonusTiers2 || '[]',
          useSecondaryCondition: r.useSecondaryCondition ?? false,
          secondaryAFYPMin: r.secondaryAFYPMin ?? 0,
          secondaryIPMin: r.secondaryIPMin ?? 0,
          secondaryLuotHDMin: r.secondaryLuotHDMin ?? 0,
          secondaryLuotHDCMin: r.secondaryLuotHDCMin ?? 0,
          secondaryLuotHDFilter: r.secondaryLuotHDFilter || 'all',
          secondaryLuotHDCFilter: r.secondaryLuotHDCFilter || 'all',
          secondaryTotalAFYPMin: r.secondaryTotalAFYPMin ?? 0,
          secondaryTotalIPMin: r.secondaryTotalIPMin ?? 0,
          hideNotAchieved: r.hideNotAchieved ?? false,
          includeIndividualNTD: r.includeIndividualNTD ?? false,
          includeIndividualTN: r.includeIndividualTN ?? false,
          luotHDThreshold: r.luotHDThreshold ?? 3000000,
          luotHDCTThreshold: r.luotHDCTThreshold ?? 12000000,
          tvv90MaxMonths: r.tvv90MaxMonths ?? 3,
          tvv90MinIP: r.tvv90MinIP ?? 12000000,
          referenceContestId: r.referenceContestId || '',
          includeTNInPassCount: r.includeTNInPassCount ?? false,
          topN: r.topN ?? 3,
          topNMinIP: r.topNMinIP ?? 50000000,
          topNValueType: r.topNValueType || 'ip',
          filterByEffectiveDate: r.filterByEffectiveDate ?? false,
        } });
      }
      return rows.length;
    });

    await restoreTable('calendarEvent', 'CalendarEvent.json', async (rows) => {
      if (rows.length === 0) return 0;
      await db.calendarEvent.createMany({ data: rows.map((r: any) => ({
        id: r.id, title: r.title, date: r.date, color: r.color || '#00ff88',
        owner: r.owner || '',
      })) });
      return rows.length;
    });

    await restoreTable('clbMember', 'ClbMember.json', async (rows) => {
      if (rows.length === 0) return 0;
      await db.clbMember.createMany({ data: rows.map((r: any) => ({
        id: r.id, ad: r.ad || '', nhom: r.nhom || '', agentCode: r.agentCode || '',
        agentName: r.agentName || '', chucVu: r.chucVu || '', note: r.note || '',
      })) });
      return rows.length;
    });

    await restoreTable('pendingMember', 'PendingMember.json', async (rows) => {
      if (rows.length === 0) return 0;
      await db.pendingMember.createMany({ data: rows.map((r: any) => ({
        id: r.id, ad: r.ad || '', nhom: r.nhom || '', agentCode: r.agentCode || '',
        agentName: r.agentName || '', chucVu: r.chucVu || '',
        ipT2: r.ipT2 || 0, ipT1: r.ipT1 || 0, ipT0: r.ipT0 || 0, note: r.note || '',
      })) });
      return rows.length;
    });

    await restoreTable('setting', 'Setting.json', async (rows) => {
      if (rows.length === 0) return 0;
      await db.setting.createMany({ data: rows.map((r: any) => ({
        id: r.id, key: r.key, value: r.value,
      })) });
      return rows.length;
    });

    await restoreTable('link', 'Link.json', async (rows) => {
      if (rows.length === 0) return 0;
      await db.link.createMany({ data: rows.map((r: any) => ({
        id: r.id, title: r.title, url: r.url, description: r.description,
        icon: r.icon || 'globe', category: r.category || 'General',
        color: r.color || '#3b82f6', link_type: r.link_type || 'web',
        file_url: r.file_url, file_name: r.file_name, file_type: r.file_type,
        thumbnail: r.thumbnail, is_favorite: r.is_favorite ?? false,
        click_count: r.click_count || 0,
        created_at: r.created_at ? new Date(r.created_at) : new Date(),
        updated_at: r.updated_at ? new Date(r.updated_at) : new Date(),
      })) });
      return rows.length;
    });

    await restoreTable('category', 'Category.json', async (rows) => {
      if (rows.length === 0) return 0;
      await db.category.createMany({ data: rows.map((r: any) => ({
        id: r.id, name: r.name, icon: r.icon, color: r.color || '#3b82f6',
        sort_order: r.sort_order || 0,
        created_at: r.created_at ? new Date(r.created_at) : new Date(),
      })) });
      return rows.length;
    });

    // PosterImage: skip (binary data, không restore qua JSON)
    results.push({ table: 'posterImage', deleted: 0, inserted: 0, error: 'Skipped (binary data — re-upload posters manually)' });

    const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0);
    const totalErrors = results.filter(r => r.error && !r.error.includes('Skipped')).length;

    return NextResponse.json({
      success: totalErrors === 0,
      message: totalErrors === 0
        ? `Restore thành công! Tổng ${totalInserted} rows từ ${results.length} tables.`
        : `Restore hoàn tất với ${totalErrors} lỗi. Tổng ${totalInserted} rows restored.`,
      totalInserted,
      backupDate: '2026-07-12',
      results,
    });

  } catch (error: any) {
    console.error('[restore-data] Fatal error:', error);
    return NextResponse.json({
      error: 'Restore failed',
      details: error?.message || String(error),
      results,
    }, { status: 500 });
  }
}

// GET — info endpoint (không restore, chỉ show backup available)
export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to restore data from backup (2026-07-12)',
    backupPath: '/backups/20260712_195857/',
    usage: 'curl -X POST https://nc-link.vercel.app/api/admin/restore-data',
    warning: 'This will DELETE all existing data and replace with backup data!',
  });
}
