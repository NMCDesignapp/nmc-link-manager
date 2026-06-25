#!/usr/bin/env python3
"""Refactor renderThuongTuyenNgang: sort by relMonth, filter >6, add LŨY KẾ + THƯỞNG BẮT KỲP."""

import re
from pathlib import Path

PAGE = Path('/home/z/my-project/src/app/quan-ly/page.tsx')
src = PAGE.read_text(encoding='utf-8')

pattern = re.compile(
    r'  // ========== THƯỞNG TTN TUYỂN NGANG ==========\n.*?  const renderThuongTuyenNgang = \(\) => \{.*?\n  \};\n',
    re.DOTALL
)

NEW_FUNC = '''  // ========== THƯỞNG TTN TUYỂN NGANG ==========
  // Đối tượng: TẤT CẢ TTN Tuyển Ngang từ DS TTN Tuyển Ngang (state tuyenNgangList)
  // Sắp xếp: theo THÁNG LÀM VIỆC từ nhỏ đến lớn
  // Lọc: chỉ hiển thị TTN có relMonth từ 1 đến 6 (relMonth > 6 tự động loại)
  //
  // Bảng CHỈ TIÊU THEO THÁNG (relMonth 1-6):
  //   Tháng 1: Quy mô 2, TVVm HĐC 1, FYP 25tr, Thưởng 8tr
  //   Tháng 2: Quy mô 3, TVVm HĐC 2, FYP 35tr, Thưởng 8tr
  //   Tháng 3: Quy mô 4, TVVm HĐC 2, FYP 45tr, Thưởng 8tr
  //   Tháng 4: Quy mô 5, TVVm HĐC 2, FYP 45tr, Thưởng 5tr
  //   Tháng 5: Quy mô 6, TVVm HĐC 3, FYP 50tr, Thưởng 5tr
  //   Tháng 6: Quy mô 6, TVVm HĐC 3, FYP 50tr, Thưởng 5tr
  //
  // Bảng THƯỜNG BẮT KỲP:
  //   BẮT KỲP 3 THÁNG (cuối tháng 3): Quy mô 4, TVVm HĐC 2, FYP 100tr → Thưởng 24tr
  //   BẮT KỊP 6 THÁNG (cuối tháng 6): Quy mô 6, TVVm HĐC 3, FYP 250tr → Thưởng 39tr
  //   Trừ đi tổng thưởng tháng đã nhận trong khoảng tương ứng
  //
  // THỰC HIỆN THÁNG:
  //   - Quy mô: số TVV do TTN tuyển có ngayBatDau <= cuối tháng đó (cumulative theo tháng)
  //             KHÔNG tính cá nhân TTN
  //   - TVVm HĐC: TVVm (≤12 tháng) trong team có IP tháng ≥ 12tr → 1 lượt.
  //               Tính luôn cá nhân TTN nếu TTN là TVVm + IP tháng ≥ 12tr
  //   - FYP: tổng IP tháng của TVVm do TTN tuyển + TTN nếu là TVVm
  //   - IP tính theo NGÀY PHÁT HÀNH (getDoanhSoMonth)
  //
  // THỰC HIỆN LŨY KẾ (6 tháng đầu từ ngayHieuLuc):
  //   - Quy mô: teamTVVs.length (cumulative — không đổi)
  //   - TVVm HĐC: số TVVm đạt HĐC (IP tháng ≥ 12tr) trong ÍT NHẤT 1 tháng của 6 tháng đầu
  //   - FYP: tổng IP 6 tháng đầu của TVVm team + TTN nếu là TVVm
  //
  // THƯỞNG THÁNG: spec.thuong nếu đạt cả 3 chỉ tiêu tháng
  // THƯỜNG BẮT KỲP:
  //   - relMonth >= 6: nếu đạt cum6 → 39tr - tổng thưởng tháng 1-6 - thưởng bắt kịp 3 (nếu đạt)
  //   - relMonth 3-5: nếu đạt cum3 → 24tr - tổng thưởng tháng 1-3
  //   - relMonth < 3: —
  const renderThuongTuyenNgang = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const HEADER_BG = '#065F46';
    const SUB_HEADER_BG = '#047857';
    const HDC_IP_THRESHOLD = 12_000_000;

    // Spec table theo tháng làm việc (1-6)
    const SPEC_TABLE = [
      { quymo: 2, tvvmHdc: 1, fyp: 25_000_000, thuong: 8_000_000 },
      { quymo: 3, tvvmHdc: 2, fyp: 35_000_000, thuong: 8_000_000 },
      { quymo: 4, tvvmHdc: 2, fyp: 45_000_000, thuong: 8_000_000 },
      { quymo: 5, tvvmHdc: 2, fyp: 45_000_000, thuong: 5_000_000 },
      { quymo: 6, tvvmHdc: 3, fyp: 50_000_000, thuong: 5_000_000 },
      { quymo: 6, tvvmHdc: 3, fyp: 50_000_000, thuong: 5_000_000 },
    ];
    const getSpec = (relMonth: number) => {
      if (relMonth < 1 || relMonth > SPEC_TABLE.length) return null;
      return SPEC_TABLE[relMonth - 1];
    };

    // Spec THƯỞNG BẮT KỲP
    const CATCHUP_3 = { quymo: 4, tvvmHdc: 2, fyp: 100_000_000, thuong: 24_000_000 };
    const CATCHUP_6 = { quymo: 6, tvvmHdc: 3, fyp: 250_000_000, thuong: 39_000_000 };

    // Tính tháng làm việc (relativeMonth) từ ngayHieuLuc — tròn tháng
    const calcRelMonth = (ngayHieuLuc: string | null): number => {
      if (!ngayHieuLuc) return 0;
      const start = new Date(ngayHieuLuc);
      if (isNaN(start.getTime())) return 0;
      const now = new Date();
      return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
    };

    // Helper: tính stats cho 1 tháng cụ thể (relMonth N)
    const getMonthStats = (
      tn: TuyenNgangItem,
      hieuLucDate: Date | null,
      teamTVVs: TVVStructItem[],
      relMonthN: number
    ): { quymo: number; tvvmHdc: number; fyp: number } => {
      if (!hieuLucDate || relMonthN < 1) return { quymo: 0, tvvmHdc: 0, fyp: 0 };
      const targetDate = new Date(hieuLucDate.getFullYear(), hieuLucDate.getMonth() + relMonthN - 1, 1);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth() + 1;

      // Quy mô tháng N: số TVV do TTN tuyển có ngayBatDau <= cuối tháng N
      const endOfTargetMonth = new Date(hieuLucDate.getFullYear(), hieuLucDate.getMonth() + relMonthN, 0);
      const quymo = teamTVVs.filter(tvv => {
        if (!tvv.ngayBatDau) return false;
        const bd = new Date(tvv.ngayBatDau);
        return !isNaN(bd.getTime()) && bd <= endOfTargetMonth;
      }).length;

      // Hợp đồng tháng target của team + TTN
      const tnCode = tn.agentCode;
      const teamCodes = new Set(teamTVVs.map(t => t.agentCode));
      const monthContracts = contracts.filter(c => {
        if (!teamCodes.has(c.agentCode) && c.agentCode !== tnCode) return false;
        const d = getDoanhSoMonth(c);
        return !isNaN(d.getTime()) && d.getFullYear() === targetYear && (d.getMonth() + 1) === targetMonth;
      });

      // TVVm HĐC tháng N
      let tvvmHdc = teamTVVs.filter(tvv => {
        if (!isTVVm(tvv.ngayBatDau)) return false;
        const ip = monthContracts
          .filter(c => c.agentCode === tvv.agentCode)
          .reduce((s, c) => s + c.pdt10DT, 0);
        return ip >= HDC_IP_THRESHOLD;
      }).length;
      const tnIsTVVm = isTVVm(tn.ngayBatDau);
      const tnMonthIP = monthContracts
        .filter(c => c.agentCode === tnCode)
        .reduce((s, c) => s + c.pdt10DT, 0);
      if (tnIsTVVm && tnMonthIP >= HDC_IP_THRESHOLD) tvvmHdc += 1;

      // FYP tháng N = tổng IP của TVVm trong team + TTN nếu là TVVm
      const tvvmTeamCodes = new Set(
        teamTVVs.filter(tvv => isTVVm(tvv.ngayBatDau)).map(tvv => tvv.agentCode)
      );
      let fyp = monthContracts
        .filter(c => tvvmTeamCodes.has(c.agentCode))
        .reduce((s, c) => s + c.pdt10DT, 0);
      if (tnIsTVVm) fyp += tnMonthIP;

      return { quymo, tvvmHdc, fyp };
    };

    // Helper: tính CUMULATIVE cho N tháng đầu
    const getCumStats = (
      tn: TuyenNgangItem,
      hieuLucDate: Date | null,
      teamTVVs: TVVStructItem[],
      numMonths: number
    ): { quymo: number; tvvmHdc: number; fyp: number } => {
      if (!hieuLucDate) return { quymo: 0, tvvmHdc: 0, fyp: 0 };
      // Quy mô cumulative = teamTVVs.length (theo định nghĩa)
      const quymo = teamTVVs.length;

      // Window: từ tháng 1 đến tháng numMonths
      const startMonthIdx = hieuLucDate.getMonth();
      const startYear = hieuLucDate.getFullYear();
      const tnCode = tn.agentCode;
      const teamCodes = new Set(teamTVVs.map(t => t.agentCode));
      const tnIsTVVm = isTVVm(tn.ngayBatDau);

      // Hợp đồng trong window
      const windowContracts = contracts.filter(c => {
        if (!teamCodes.has(c.agentCode) && c.agentCode !== tnCode) return false;
        const d = getDoanhSoMonth(c);
        if (isNaN(d.getTime())) return false;
        const mIdx = d.getFullYear() * 12 + d.getMonth();
        const startIdx = startYear * 12 + startMonthIdx;
        return mIdx >= startIdx && mIdx < startIdx + numMonths;
      });

      // TVVm HĐC cumulative = số TVVm có ÍT NHẤT 1 tháng trong window đạt HĐC
      let tvvmHdc = teamTVVs.filter(tvv => {
        if (!isTVVm(tvv.ngayBatDau)) return false;
        for (let m = 0; m < numMonths; m++) {
          const targetDate = new Date(startYear, startMonthIdx + m, 1);
          const ip = windowContracts
            .filter(c => c.agentCode === tvv.agentCode)
            .filter(c => {
              const d = getDoanhSoMonth(c);
              return d.getFullYear() === targetDate.getFullYear() && d.getMonth() === targetDate.getMonth();
            })
            .reduce((s, c) => s + c.pdt10DT, 0);
          if (ip >= HDC_IP_THRESHOLD) return true;
        }
        return false;
      }).length;
      // TTN nếu là TVVm
      if (tnIsTVVm) {
        for (let m = 0; m < numMonths; m++) {
          const targetDate = new Date(startYear, startMonthIdx + m, 1);
          const ip = windowContracts
            .filter(c => c.agentCode === tnCode)
            .filter(c => {
              const d = getDoanhSoMonth(c);
              return d.getFullYear() === targetDate.getFullYear() && d.getMonth() === targetDate.getMonth();
            })
            .reduce((s, c) => s + c.pdt10DT, 0);
          if (ip >= HDC_IP_THRESHOLD) { tvvmHdc += 1; break; }
        }
      }

      // FYP cumulative = tổng IP trong window của TVVm team + TTN nếu là TVVm
      const tvvmTeamCodes = new Set(
        teamTVVs.filter(tvv => isTVVm(tvv.ngayBatDau)).map(tvv => tvv.agentCode)
      );
      let fyp = windowContracts
        .filter(c => tvvmTeamCodes.has(c.agentCode))
        .reduce((s, c) => s + c.pdt10DT, 0);
      if (tnIsTVVm) {
        fyp += windowContracts
          .filter(c => c.agentCode === tnCode)
          .reduce((s, c) => s + c.pdt10DT, 0);
      }

      return { quymo, tvvmHdc, fyp };
    };

    // Build rows + lọc TTN có relMonth 1-6
    const allRows = tuyenNgangList.map((tn, idx) => {
      const nhomName = resolveNhomName(
        tn.agentCode, '', banNhomList, contracts, leaders,
        { allowPA: true, candidateNhomName: tn.nhom }
      );
      const hieuLucDate = tn.ngayHieuLuc ? new Date(tn.ngayHieuLuc) : null;
      const ngayHieuLucStr = hieuLucDate && !isNaN(hieuLucDate.getTime())
        ? hieuLucDate.toLocaleDateString('vi-VN') : '';
      const relMonth = calcRelMonth(tn.ngayHieuLuc);
      const tnCodeLower = (tn.agentCode || '').trim().toLowerCase();
      const teamTVVs = tvvStructList.filter(tvv =>
        (tvv.maTVVTuyendung || '').trim().toLowerCase() === tnCodeLower
      );

      // CHỈ TIÊU
      const spec = getSpec(relMonth);
      const ctQuymo = spec?.quymo ?? 0;
      const ctTvvmHdc = spec?.tvvmHdc ?? 0;
      const ctFyp = spec?.fyp ?? 0;
      const thuongIfDat = spec?.thuong ?? 0;

      // THỰC HIỆN THÁNG (của relMonth hiện tại)
      const thStats = getMonthStats(tn, hieuLucDate, teamTVVs, relMonth);
      const dat = spec != null && thStats.quymo >= ctQuymo && thStats.tvvmHdc >= ctTvvmHdc && thStats.fyp >= ctFyp;
      const tienThuongThang = dat ? thuongIfDat : 0;

      // THỰC HIỆN LŨY KẾ (6 tháng đầu)
      const lkStats = getCumStats(tn, hieuLucDate, teamTVVs, 6);

      // Tính tổng THƯỜNG THÁNG đã nhận (cho từng tháng 1..relMonth)
      const tinhThuongThangAt = (relMonthN: number): number => {
        const sp = getSpec(relMonthN);
        if (!sp) return 0;
        const stats = getMonthStats(tn, hieuLucDate, teamTVVs, relMonthN);
        if (stats.quymo >= sp.quymo && stats.tvvmHdc >= sp.tvvmHdc && stats.fyp >= sp.fyp) {
          return sp.thuong;
        }
        return 0;
      };

      // THƯỜNG BẮT KỲP
      let tienThuongBatKip = 0;
      let batKipLabel = '';
      if (relMonth >= 6) {
        // Xét bắt kịp 6 tháng
        const cum6 = getCumStats(tn, hieuLucDate, teamTVVs, 6);
        const dat6 = cum6.quymo >= CATCHUP_6.quymo && cum6.tvvmHdc >= CATCHUP_6.tvvmHdc && cum6.fyp >= CATCHUP_6.fyp;
        if (dat6) {
          // Tổng thưởng tháng đã nhận (1-6)
          let tongThuongThang = 0;
          for (let m = 1; m <= 6; m++) tongThuongThang += tinhThuongThangAt(m);
          // Thưởng bắt kịp 3 tháng (nếu đạt)
          const cum3 = getCumStats(tn, hieuLucDate, teamTVVs, 3);
          const dat3 = cum3.quymo >= CATCHUP_3.quymo && cum3.tvvmHdc >= CATCHUP_3.tvvmHdc && cum3.fyp >= CATCHUP_3.fyp;
          const thuongBatKip3 = dat3 ? CATCHUP_3.thuong : 0;
          tienThuongBatKip = CATCHUP_6.thuong - tongThuongThang - thuongBatKip3;
          batKipLabel = 'BK6';
        }
      } else if (relMonth >= 3) {
        // Xét bắt kịp 3 tháng
        const cum3 = getCumStats(tn, hieuLucDate, teamTVVs, 3);
        const dat3 = cum3.quymo >= CATCHUP_3.quymo && cum3.tvvmHdc >= CATCHUP_3.tvvmHdc && cum3.fyp >= CATCHUP_3.fyp;
        if (dat3) {
          let tongThuongThang = 0;
          for (let m = 1; m <= 3; m++) tongThuongThang += tinhThuongThangAt(m);
          tienThuongBatKip = CATCHUP_3.thuong - tongThuongThang;
          batKipLabel = 'BK3';
        }
      }

      return {
        idx,
        stt: 0,
        nhom: nhomName,
        maTN: tn.agentCode,
        hoTen: tn.agentName,
        ngayHieuLuc: ngayHieuLucStr,
        relMonth,
        // CHỈ TIÊU
        ctQuymo, ctTvvmHdc, ctFyp,
        // THỰC HIỆN THÁNG
        thQuymo: thStats.quymo,
        thTvvmHDC: thStats.tvvmHdc,
        thTongFYP: thStats.fyp,
        // THƯỞNG THÁNG
        dat, tienThuongThang, thuongIfDat,
        // THỰC HIỆN LŨY KẾ
        lkQuymo: lkStats.quymo,
        lkTvvmHDC: lkStats.tvvmHdc,
        lkFYP: lkStats.fyp,
        // THƯỜNG BẮT KỲP
        tienThuongBatKip, batKipLabel,
      };
    });

    // Lọc: chỉ giữ TTN có relMonth 1-6
    const tnRows = allRows
      .filter(r => r.relMonth >= 1 && r.relMonth <= 6)
      .sort((a, b) => a.relMonth - b.relMonth)
      .map((r, i) => ({ ...r, stt: i + 1 }));

    // Tổng cộng
    const totalQuymo = tnRows.reduce((s, r) => s + r.thQuymo, 0);
    const totalTvvmHDC = tnRows.reduce((s, r) => s + r.thTvvmHDC, 0);
    const totalTongFYP = tnRows.reduce((s, r) => s + r.thTongFYP, 0);
    const totalThuongThang = tnRows.reduce((s, r) => s + r.tienThuongThang, 0);
    const totalLkQuymo = tnRows.reduce((s, r) => s + r.lkQuymo, 0);
    const totalLkTvvmHDC = tnRows.reduce((s, r) => s + r.lkTvvmHDC, 0);
    const totalLkFYP = tnRows.reduce((s, r) => s + r.lkFYP, 0);
    const totalThuongBatKip = tnRows.reduce((s, r) => s + Math.max(0, r.tienThuongBatKip), 0);
    const datThuongCount = tnRows.filter(r => r.tienThuongThang > 0 || r.tienThuongBatKip > 0).length;
    const excludedCount = allRows.length - tnRows.length;

    return (
      <div className="space-y-1" data-policy-count={datThuongCount} data-policy-amount={totalThuongThang + totalThuongBatKip}>
        {/* Table */}
        <div className="bg-white border shadow-xl h-full" style={{ borderColor: '#A7F3D0', borderRadius: 0 }}>
          <table className="w-full text-xs bg-white h-full" style={{ borderRadius: 0, borderCollapse: 'collapse' }}>
            <thead className="sticky top-0 z-10">
              {/* Row 1: Main headers */}
              <tr style={{ backgroundColor: HEADER_BG }}>
                <th rowSpan={2} className="text-white text-center w-[32px] font-bold uppercase text-[11px] h-8 px-1 align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>STT</th>
                <th rowSpan={2} className="text-white min-w-[80px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>NHÓM KD</th>
                <th rowSpan={2} className="text-white min-w-[70px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>MÃ SỐ</th>
                <th rowSpan={2} className="text-white min-w-[120px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>HỌ TÊN TVV</th>
                <th rowSpan={2} className="text-white min-w-[90px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>NGÀY HIỆU LỰC<br/><span className="text-[10px] font-normal normal-case">CHỨC VỤ</span></th>
                <th rowSpan={2} className="text-white min-w-[60px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>THÁNG LÀM<br/>VIỆC</th>
                <th colSpan={3} className="text-white font-bold uppercase text-[12px] px-2 text-center align-middle whitespace-nowrap" style={{ backgroundColor: '#0F766E', borderColor: '#0F766E', height: '22px' }}>CHỈ TIÊU</th>
                <th colSpan={3} className="text-white font-bold uppercase text-[12px] px-2 text-center align-middle whitespace-nowrap" style={{ backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' }}>THỰC HIỆN THÁNG</th>
                <th rowSpan={2} className="text-white min-w-[90px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>THƯỞNG<br/>THÁNG</th>
                <th colSpan={3} className="text-white font-bold uppercase text-[12px] px-2 text-center align-middle whitespace-nowrap" style={{ backgroundColor: '#7C3AED', borderColor: '#7C3AED' }}>THỰC HIỆN LŨY KẾ</th>
                <th rowSpan={2} className="text-white min-w-[100px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>THƯỞNG<br/>BẮT KỲP</th>
              </tr>
              {/* Row 2: Sub-headers */}
              <tr>
                <th className="text-white font-bold text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: SUB_HEADER_BG, borderColor: '#047857', height: '18px' }}>Quy mô</th>
                <th className="text-white font-bold text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: SUB_HEADER_BG, borderColor: '#047857' }}>TVVm HĐC</th>
                <th className="text-white font-bold text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: SUB_HEADER_BG, borderColor: '#047857' }}>Tổng FYP</th>
                <th className="text-white font-bold text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: '#1E40AF', borderColor: '#1E40AF' }}>Quy mô</th>
                <th className="text-white font-bold text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: '#1E40AF', borderColor: '#1E40AF' }}>TVVm HĐC</th>
                <th className="text-white font-bold text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: '#1E40AF', borderColor: '#1E40AF' }}>Tổng FYP</th>
                <th className="text-white font-bold text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: '#6D28D9', borderColor: '#6D28D9' }}>Quy mô</th>
                <th className="text-white font-bold text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: '#6D28D9', borderColor: '#6D28D9' }}>TVVm HĐC</th>
                <th className="text-white font-bold text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: '#6D28D9', borderColor: '#6D28D9' }}>Tổng FYP</th>
              </tr>
            </thead>
            <tbody>
              {tnRows.length === 0 ? (
                <tr>
                  <td colSpan={17} className="text-center text-gray-400 py-12 italic text-xs bg-white p-2 align-middle">
                    Chưa có TTN Tuyển Ngang nào trong DS (hoặc tất cả đều có tháng làm việc &gt; 6). Vào <b>Cấu trúc → DS TTN Tuyển Ngang</b> để thêm đối tượng.
                  </td>
                </tr>
              ) : tnRows.map((row) => (
                <tr key={row.maTN} className="bg-white hover:bg-emerald-50 transition-colors border-b border-gray-300" style={{ borderRadius: 0 }}>
                  <td className="text-center text-gray-400 text-[11px] p-2 align-middle whitespace-nowrap" style={{ borderColor: '#D1FAE5' }}>{row.stt}</td>
                  <td className="text-[11px] text-gray-700 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.nhom || '—'}</td>
                  <td className="font-mono text-[11px] text-gray-500 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.maTN}</td>
                  <td className="text-[11px] text-gray-800 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.hoTen}</td>
                  <td className="text-[11px] text-gray-600 text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.ngayHieuLuc || '—'}</td>
                  <td className="text-[11px] text-gray-800 text-center font-bold whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5', backgroundColor: '#F0FDFA' }}>{row.relMonth}</td>
                  {/* CHỈ TIÊU */}
                  <td className="text-center text-[11px] text-gray-700 p-2 align-middle" style={{ borderColor: '#99F6E4', backgroundColor: '#F0FDFA' }}>{row.ctQuymo || '—'}</td>
                  <td className="text-center text-[11px] text-gray-700 p-2 align-middle" style={{ borderColor: '#99F6E4', backgroundColor: '#F0FDFA' }}>{row.ctTvvmHdc || '—'}</td>
                  <td className="text-right text-[11px] text-gray-700 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#99F6E4', backgroundColor: '#F0FDFA' }}>{row.ctFyp > 0 ? formatNumber(row.ctFyp) : '—'}</td>
                  {/* THỰC HIỆN THÁNG */}
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#BFDBFE', backgroundColor: '#DBEAFE', color: '#1E40AF', fontSize: '12px', fontWeight: 800 }}>{row.thQuymo || '—'}</td>
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#BFDBFE', backgroundColor: '#DBEAFE', color: '#1E40AF', fontSize: '12px', fontWeight: 800 }}>{row.thTvvmHDC || '—'}</td>
                  <td className="text-right whitespace-nowrap p-2 align-middle" style={{ borderColor: '#BFDBFE', backgroundColor: '#DBEAFE', color: '#1E40AF', fontSize: '11px', fontWeight: 800 }}>{row.thTongFYP > 0 ? formatNumber(row.thTongFYP) : '—'}</td>
                  {/* THƯỞNG THÁNG */}
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5', backgroundColor: row.dat ? '#FEF3C7' : '#FFFFFF', color: row.dat ? '#047857' : '#9CA3AF', fontSize: '12px', fontWeight: 800 }}>
                    {row.dat ? formatNumber(row.tienThuongThang) : '—'}
                  </td>
                  {/* THỰC HIỆN LŨY KẾ */}
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#DDD6FE', backgroundColor: '#EDE9FE', color: '#5B21B6', fontSize: '12px', fontWeight: 800 }}>{row.lkQuymo || '—'}</td>
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#DDD6FE', backgroundColor: '#EDE9FE', color: '#5B21B6', fontSize: '12px', fontWeight: 800 }}>{row.lkTvvmHDC || '—'}</td>
                  <td className="text-right whitespace-nowrap p-2 align-middle" style={{ borderColor: '#DDD6FE', backgroundColor: '#EDE9FE', color: '#5B21B6', fontSize: '11px', fontWeight: 800 }}>{row.lkFYP > 0 ? formatNumber(row.lkFYP) : '—'}</td>
                  {/* THƯỞNG BẮT KỲP */}
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5', backgroundColor: row.tienThuongBatKip > 0 ? '#FEF3C7' : '#FFFFFF', color: row.tienThuongBatKip > 0 ? '#047857' : '#9CA3AF', fontSize: '12px', fontWeight: 800 }}>
                    {row.tienThuongBatKip > 0 ? <>{formatNumber(row.tienThuongBatKip)}<div style={{ fontSize: '9px', fontWeight: 600, color: '#7C3AED' }}>{row.batKipLabel}</div></> : (row.batKipLabel ? <span style={{ color: '#9CA3AF' }}>—</span> : '—')}
                  </td>
                </tr>
              ))}
              {/* Total row */}
              {tnRows.length > 0 && (
                <tr style={{ backgroundColor: '#065F46' }}>
                  <td colSpan={6} className="text-white text-[11px] font-bold uppercase text-right p-2 align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>TỔNG CỘNG ({tnRows.length} TTN{excludedCount > 0 ? `, loại ${excludedCount} TTN &gt;T6` : ''})</td>
                  {/* CHỈ TIÊU tổng */}
                  <td className="text-white text-center text-[11px] p-2 align-middle" style={{ borderColor: '#0F766E', backgroundColor: '#0F766E' }}>—</td>
                  <td className="text-white text-center text-[11px] p-2 align-middle" style={{ borderColor: '#0F766E', backgroundColor: '#0F766E' }}>—</td>
                  <td className="text-white text-center text-[11px] p-2 align-middle" style={{ borderColor: '#0F766E', backgroundColor: '#0F766E' }}>—</td>
                  {/* THỰC HIỆN THÁNG tổng */}
                  <td className="text-white text-center text-[12px] font-black p-2 align-middle" style={{ borderColor: '#1E40AF', backgroundColor: '#1E40AF' }}>{totalQuymo}</td>
                  <td className="text-white text-center text-[12px] font-black p-2 align-middle" style={{ borderColor: '#1E40AF', backgroundColor: '#1E40AF' }}>{totalTvvmHDC}</td>
                  <td className="text-white text-right text-[11px] font-black p-2 align-middle" style={{ borderColor: '#1E40AF', backgroundColor: '#1E40AF' }}>{totalTongFYP > 0 ? formatNumber(totalTongFYP) : '—'}</td>
                  {/* THƯỞNG THÁNG tổng */}
                  <td className="text-white text-center text-[12px] font-black p-2 align-middle" style={{ borderColor: '#047857', backgroundColor: '#FEF3C7', color: '#047857' }}>{totalThuongThang > 0 ? formatNumber(totalThuongThang) : '—'}</td>
                  {/* THỰC HIỆN LŨY KẾ tổng */}
                  <td className="text-white text-center text-[12px] font-black p-2 align-middle" style={{ borderColor: '#6D28D9', backgroundColor: '#6D28D9' }}>{totalLkQuymo}</td>
                  <td className="text-white text-center text-[12px] font-black p-2 align-middle" style={{ borderColor: '#6D28D9', backgroundColor: '#6D28D9' }}>{totalLkTvvmHDC}</td>
                  <td className="text-white text-right text-[11px] font-black p-2 align-middle" style={{ borderColor: '#6D28D9', backgroundColor: '#6D28D9' }}>{totalLkFYP > 0 ? formatNumber(totalLkFYP) : '—'}</td>
                  {/* THƯỞNG BẮT KỲP tổng */}
                  <td className="text-white text-center text-[12px] font-black p-2 align-middle" style={{ borderColor: '#047857', backgroundColor: '#FEF3C7', color: '#047857' }}>{totalThuongBatKip > 0 ? formatNumber(totalThuongBatKip) : '—'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
'''

new_src, n = pattern.subn(NEW_FUNC + '\n', src, count=1)
if n != 1:
    raise SystemExit(f'ERROR: pattern matched {n} times (expected 1)')

PAGE.write_text(new_src, encoding='utf-8')
print(f'OK: replaced renderThuongTuyenNgang. File size: {len(new_src)} bytes')
