#!/usr/bin/env python3
"""Replace renderThuongTuyenNgang function in page.tsx with new spec-driven version."""

import re
from pathlib import Path

PAGE = Path('/home/z/my-project/src/app/quan-ly/page.tsx')
src = PAGE.read_text(encoding='utf-8')

# Match the entire renderThuongTuyenNgang function (from `const renderThuongTuyenNgang = () => {`
# to the closing `};` right before `const renderPolicyContent`)
pattern = re.compile(
    r'  // ========== THƯỞNG TTN TUYỂN NGANG ==========\n.*?  const renderThuongTuyenNgang = \(\) => \{.*?\n  \};\n',
    re.DOTALL
)

NEW_FUNC = '''  // ========== THƯỞNG TTN TUYỂN NGANG ==========
  // Đối tượng: TẤT CẢ TTN Tuyển Ngang từ DS TTN Tuyển Ngang (state tuyenNgangList)
  // NGUYÊN TẮC AUTO-UPDATE: bảng tự cập nhật khi DS thêm/xóa/sửa — qua state tuyenNgangList
  //
  // Bảng chỉ tiêu (theo tháng làm việc 1-6, tính tròn tháng từ ngayHieuLuc):
  //   Tháng 1: Quy mô 2, TVVm HĐC 1, FYP 25tr, Thưởng 8tr
  //   Tháng 2: Quy mô 3, TVVm HĐC 2, FYP 35tr, Thưởng 8tr
  //   Tháng 3: Quy mô 4, TVVm HĐC 2, FYP 45tr, Thưởng 8tr
  //   Tháng 4: Quy mô 5, TVVm HĐC 2, FYP 45tr, Thưởng 5tr
  //   Tháng 5: Quy mô 6, TVVm HĐC 3, FYP 50tr, Thưởng 5tr
  //   Tháng 6: Quy mô 6, TVVm HĐC 3, FYP 50tr, Thưởng 5tr
  //   Từ tháng 7 trở đi: dùng giá trị tháng 6
  //
  // THỰC HIỆN THÁNG:
  //   - Quy mô: số TVV do TTN tuyển (maTVVTuyendung = agentCode TTN), cộng dồn lũy kế.
  //             KHÔNG tính cá nhân TTN.
  //   - TVVm HĐC: TVVm (≤12 tháng) do TTN tuyển có tổng IP tháng ≥ 12tr → 1 lượt.
  //               TVV được tuyển những tháng trước vẫn được tính nếu còn là TVVm.
  //               Tính luôn cá nhân TTN nếu TTN là TVVm và có IP tháng ≥ 12tr.
  //   - FYP: tổng IP trong tháng của tất cả TVVm do TTN tuyển.
  //          Tính luôn IP của cá nhân TTN nếu TTN là TVVm.
  //   - IP tính theo NGÀY PHÁT HÀNH (getDoanhSoMonth).
  //
  // THƯỞNG: nếu đạt cả 3 chỉ tiêu (Quy mô, TVVm HĐC, FYP) → thưởng theo spec table.
  const renderThuongTuyenNgang = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const HEADER_BG = '#065F46';
    const SUB_HEADER_BG = '#047857';
    const HDC_IP_THRESHOLD = 12_000_000;

    // Spec table theo tháng làm việc (1-6). Từ tháng 7 trở đi dùng giá trị tháng 6.
    const SPEC_TABLE = [
      { quymo: 2, tvvmHdc: 1, fyp: 25_000_000, thuong: 8_000_000 }, // tháng 1
      { quymo: 3, tvvmHdc: 2, fyp: 35_000_000, thuong: 8_000_000 }, // tháng 2
      { quymo: 4, tvvmHdc: 2, fyp: 45_000_000, thuong: 8_000_000 }, // tháng 3
      { quymo: 5, tvvmHdc: 2, fyp: 45_000_000, thuong: 5_000_000 }, // tháng 4
      { quymo: 6, tvvmHdc: 3, fyp: 50_000_000, thuong: 5_000_000 }, // tháng 5
      { quymo: 6, tvvmHdc: 3, fyp: 50_000_000, thuong: 5_000_000 }, // tháng 6
    ];
    const getSpec = (relMonth: number) => {
      if (relMonth < 1) return null;
      if (relMonth > SPEC_TABLE.length) return SPEC_TABLE[SPEC_TABLE.length - 1];
      return SPEC_TABLE[relMonth - 1];
    };

    // Tính tháng làm việc (relativeMonth) từ ngayHieuLuc — tròn tháng
    // Ví dụ: ngayHieuLuc 6/6/2026, now 6/2026 → relMonth = 1
    //        ngayHieuLuc 1/3/2026, now 6/2026 → relMonth = 4
    const calcRelMonth = (ngayHieuLuc: string | null): number => {
      if (!ngayHieuLuc) return 0;
      const start = new Date(ngayHieuLuc);
      if (isNaN(start.getTime())) return 0;
      const now = new Date();
      return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
    };

    // Build rows từ tuyenNgangList
    const tnRows = tuyenNgangList.map((tn, idx) => {
      // NHÓM — validate qua resolveNhomName (chỉ hiển thị nhóm có trong DS TB/TN hoặc là PA)
      const nhomName = resolveNhomName(
        tn.agentCode, '', banNhomList, contracts, leaders,
        { allowPA: true, candidateNhomName: tn.nhom }
      );

      // NGÀY HIỆU LỰC CHỨC VỤ
      const hieuLucDate = tn.ngayHieuLuc ? new Date(tn.ngayHieuLuc) : null;
      const ngayHieuLucStr = hieuLucDate && !isNaN(hieuLucDate.getTime())
        ? hieuLucDate.toLocaleDateString('vi-VN')
        : '';

      // THÁNG LÀM VIỆC — relativeMonth (tròn tháng) từ ngayHieuLuc
      const relMonth = calcRelMonth(tn.ngayHieuLuc);
      const thangLamViec = relMonth > 0 ? relMonth : '';

      // CHỈ TIÊU — lookup từ spec table
      const spec = getSpec(relMonth);
      const ctQuymo = spec?.quymo ?? 0;
      const ctTvvmHdc = spec?.tvvmHdc ?? 0;
      const ctFyp = spec?.fyp ?? 0;
      const thuongIfDat = spec?.thuong ?? 0;

      // Team TVV: TVV trong DS Tổng TVV có maTVVTuyendung trùng agentCode của TTN
      const tnCodeLower = (tn.agentCode || '').trim().toLowerCase();
      const teamTVVs = tvvStructList.filter(tvv =>
        (tvv.maTVVTuyendung || '').trim().toLowerCase() === tnCodeLower
      );

      // QUY MÔ THỰC HIỆN — cumulative (lũy kế) số TVV do TTN tuyển, KHÔNG tính TTN
      const thQuymo = teamTVVs.length;

      // Hợp đồng tháng hiện tại của team TVV (theo ngày phát hành)
      const teamCodes = new Set(teamTVVs.map(t => t.agentCode));
      const monthContracts = contracts.filter(c => {
        if (!teamCodes.has(c.agentCode)) return false;
        const d = getDoanhSoMonth(c);
        return !isNaN(d.getTime()) && d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth;
      });

      // Hợp đồng tháng hiện tại của chính TTN (để tính TVVm HĐC + FYP cho cá nhân TTN)
      const tnMonthContracts = contracts.filter(c => {
        if (c.agentCode !== tn.agentCode) return false;
        const d = getDoanhSoMonth(c);
        return !isNaN(d.getTime()) && d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth;
      });
      const tnMonthIP = tnMonthContracts.reduce((s, c) => s + c.pdt10DT, 0);
      const tnIsTVVm = isTVVm(tn.ngayBatDau);

      // TVVm HĐC — TVVm trong team có IP tháng ≥ 12tr, +1 cho TTN nếu TTN là TVVm + IP ≥ 12tr
      let thTvvmHDC = teamTVVs.filter(tvv => {
        if (!isTVVm(tvv.ngayBatDau)) return false;
        const tvvIP = monthContracts
          .filter(c => c.agentCode === tvv.agentCode)
          .reduce((s, c) => s + c.pdt10DT, 0);
        return tvvIP >= HDC_IP_THRESHOLD;
      }).length;
      if (tnIsTVVm && tnMonthIP >= HDC_IP_THRESHOLD) thTvvmHDC += 1;

      // FYP — tổng IP tháng của TVVm do TTN tuyển, + IP của TTN nếu TTN là TVVm
      const tvvmTeamCodes = new Set(
        teamTVVs.filter(tvv => isTVVm(tvv.ngayBatDau)).map(tvv => tvv.agentCode)
      );
      let thTongFYP = monthContracts
        .filter(c => tvvmTeamCodes.has(c.agentCode))
        .reduce((s, c) => s + c.pdt10DT, 0);
      if (tnIsTVVm) thTongFYP += tnMonthIP;

      // THƯỞNG — đạt nếu cả 3 chỉ tiêu đều thoả
      const datQuymo = thQuymo >= ctQuymo;
      const datTvvmHdc = thTvvmHDC >= ctTvvmHdc;
      const datFyp = thTongFYP >= ctFyp;
      const dat = spec != null && datQuymo && datTvvmHdc && datFyp;
      const tienThuong = dat ? thuongIfDat : 0;

      return {
        stt: idx + 1,
        nhom: nhomName,
        maTN: tn.agentCode,
        hoTen: tn.agentName,
        ngayHieuLuc: ngayHieuLucStr,
        thangLamViec,
        // CHỈ TIÊU
        ctQuymo,
        ctTvvmHdc,
        ctFyp,
        // THỰC HIỆN THÁNG
        thQuymo,
        thTvvmHDC,
        thTongFYP,
        // THƯỞNG
        dat,
        tienThuong,
        thuongIfDat,
      };
    });

    // Tổng cộng các cột số (THỰC HIỆN THÁNG + THƯỞNG)
    const totalQuymo = tnRows.reduce((s, r) => s + r.thQuymo, 0);
    const totalTvvmHDC = tnRows.reduce((s, r) => s + r.thTvvmHDC, 0);
    const totalTongFYP = tnRows.reduce((s, r) => s + r.thTongFYP, 0);
    const totalTienThuong = tnRows.reduce((s, r) => s + r.tienThuong, 0);
    const datThuongCount = tnRows.filter(r => r.dat).length;

    return (
      <div className="space-y-1" data-policy-count={datThuongCount} data-policy-amount={totalTienThuong}>
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
                <th rowSpan={2} className="text-white min-w-[70px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>THÁNG LÀM<br/>VIỆC</th>
                {/* CHỈ TIÊU — 3 sub-columns */}
                <th colSpan={3} className="text-white font-bold uppercase text-[12px] px-2 text-center align-middle whitespace-nowrap" style={{ backgroundColor: '#0F766E', borderColor: '#0F766E', height: '22px' }}>CHỈ TIÊU</th>
                {/* THỰC HIỆN THÁNG — 3 sub-columns */}
                <th colSpan={3} className="text-white font-bold uppercase text-[12px] px-2 text-center align-middle whitespace-nowrap" style={{ backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' }}>THỰC HIỆN THÁNG</th>
                <th rowSpan={2} className="text-white min-w-[100px] font-bold uppercase text-[11px] h-8 px-2 text-center align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>THƯỞNG</th>
              </tr>
              {/* Row 2: Sub-headers */}
              <tr>
                {/* CHỈ TIÊU subs */}
                <th className="text-white font-bold text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: SUB_HEADER_BG, borderColor: '#047857', height: '18px' }}>Quy mô</th>
                <th className="text-white font-bold text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: SUB_HEADER_BG, borderColor: '#047857' }}>TVVm HĐC</th>
                <th className="text-white font-bold text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: SUB_HEADER_BG, borderColor: '#047857' }}>Tổng FYP</th>
                {/* THỰC HIỆN THÁNG subs */}
                <th className="text-white font-bold text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: '#1E40AF', borderColor: '#1E40AF' }}>Quy mô</th>
                <th className="text-white font-bold text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: '#1E40AF', borderColor: '#1E40AF' }}>TVVm HĐC</th>
                <th className="text-white font-bold text-[10px] px-1 text-center align-middle whitespace-nowrap" style={{ backgroundColor: '#1E40AF', borderColor: '#1E40AF' }}>Tổng FYP</th>
              </tr>
            </thead>
            <tbody>
              {tnRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center text-gray-400 py-12 italic text-xs bg-white p-2 align-middle">
                    Chưa có TTN Tuyển Ngang nào trong DS. Vào <b>Cấu trúc → DS TTN Tuyển Ngang</b> để thêm đối tượng — bảng này sẽ tự cập nhật.
                  </td>
                </tr>
              ) : tnRows.map((row) => (
                <tr key={row.maTN} className="bg-white hover:bg-emerald-50 transition-colors border-b border-gray-300" style={{ borderRadius: 0 }}>
                  <td className="text-center text-gray-400 text-[11px] p-2 align-middle whitespace-nowrap" style={{ borderColor: '#D1FAE5' }}>{row.stt}</td>
                  <td className="text-[11px] text-gray-700 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.nhom || '—'}</td>
                  <td className="font-mono text-[11px] text-gray-500 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.maTN}</td>
                  <td className="text-[11px] text-gray-800 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.hoTen}</td>
                  <td className="text-[11px] text-gray-600 text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5' }}>{row.ngayHieuLuc || '—'}</td>
                  <td className="text-[11px] text-gray-800 text-center font-bold whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5', backgroundColor: '#F0FDFA' }}>{row.thangLamViec || '—'}</td>
                  {/* CHỈ TIÊU — from spec table */}
                  <td className="text-center text-[11px] text-gray-700 p-2 align-middle" style={{ borderColor: '#99F6E4', backgroundColor: '#F0FDFA' }}>{row.ctQuymo || '—'}</td>
                  <td className="text-center text-[11px] text-gray-700 p-2 align-middle" style={{ borderColor: '#99F6E4', backgroundColor: '#F0FDFA' }}>{row.ctTvvmHdc || '—'}</td>
                  <td className="text-right text-[11px] text-gray-700 whitespace-nowrap p-2 align-middle" style={{ borderColor: '#99F6E4', backgroundColor: '#F0FDFA' }}>{row.ctFyp > 0 ? formatNumber(row.ctFyp) : '—'}</td>
                  {/* THỰC HIỆN THÁNG — computed */}
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#BFDBFE', backgroundColor: '#DBEAFE', color: '#1E40AF', fontSize: '12px', fontWeight: 800 }}>{row.thQuymo || '—'}</td>
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#BFDBFE', backgroundColor: '#DBEAFE', color: '#1E40AF', fontSize: '12px', fontWeight: 800 }}>{row.thTvvmHDC || '—'}</td>
                  <td className="text-right whitespace-nowrap p-2 align-middle" style={{ borderColor: '#BFDBFE', backgroundColor: '#DBEAFE', color: '#1E40AF', fontSize: '11px', fontWeight: 800 }}>{row.thTongFYP > 0 ? formatNumber(row.thTongFYP) : '—'}</td>
                  {/* THƯỞNG */}
                  <td className="text-center whitespace-nowrap p-2 align-middle" style={{ borderColor: '#D1FAE5', backgroundColor: row.dat ? '#FEF3C7' : '#FFFFFF', color: row.dat ? '#047857' : '#9CA3AF', fontSize: '13px', fontWeight: 800 }}>
                    {row.dat ? formatNumber(row.tienThuong) : '—'}
                  </td>
                </tr>
              ))}
              {/* Total row */}
              {tnRows.length > 0 && (
                <tr style={{ backgroundColor: '#065F46' }}>
                  <td colSpan={6} className="text-white text-[11px] font-bold uppercase text-right p-2 align-middle whitespace-nowrap" style={{ borderColor: '#047857' }}>TỔNG CỘNG ({tnRows.length} TTN)</td>
                  {/* CHỈ TIÊU tổng — để trống (mỗi TTN có spec khác nhau) */}
                  <td className="text-white text-center text-[11px] p-2 align-middle" style={{ borderColor: '#0F766E', backgroundColor: '#0F766E' }}>—</td>
                  <td className="text-white text-center text-[11px] p-2 align-middle" style={{ borderColor: '#0F766E', backgroundColor: '#0F766E' }}>—</td>
                  <td className="text-white text-center text-[11px] p-2 align-middle" style={{ borderColor: '#0F766E', backgroundColor: '#0F766E' }}>—</td>
                  {/* THỰC HIỆN THÁNG tổng */}
                  <td className="text-white text-center text-[12px] font-black p-2 align-middle" style={{ borderColor: '#1E40AF', backgroundColor: '#1E40AF' }}>{totalQuymo}</td>
                  <td className="text-white text-center text-[12px] font-black p-2 align-middle" style={{ borderColor: '#1E40AF', backgroundColor: '#1E40AF' }}>{totalTvvmHDC}</td>
                  <td className="text-white text-right text-[11px] font-black p-2 align-middle" style={{ borderColor: '#1E40AF', backgroundColor: '#1E40AF' }}>{totalTongFYP > 0 ? formatNumber(totalTongFYP) : '—'}</td>
                  {/* THƯỞNG tổng */}
                  <td className="text-white text-center text-[12px] font-black p-2 align-middle" style={{ borderColor: '#047857', backgroundColor: '#FEF3C7', color: '#047857' }}>{totalTienThuong > 0 ? formatNumber(totalTienThuong) : '—'}</td>
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
