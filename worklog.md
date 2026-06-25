---
Task ID: tuyen-ngang-spec-driven
Agent: main
Task: Refactor Thưởng TTN Tuyển Ngang — spec-driven layout, đồng bộ với PTKD TN, áp dụng bảng chỉ tiêu 6 tháng

Work Log:
- Trích xuất bảng chỉ tiêu từ ảnh (VLM): Quy mô 2/3/4/5/6/6, TVVm HĐC 1/2/2/2/3/3, FYP 25/35/45/45/50/50 trđ, Thưởng 8/8/8/5/5/5 trđ
- Phân tích code hiện tại (lines 6016-6262)
- Viết script /home/z/my-project/scripts/rewrite_tuyen_ngang.py để thay thế toàn bộ hàm renderThuongTuyenNgang
- Bỏ summary card trên + footnote dưới (đồng bộ với PTKD TN)
- Bỏ cột CHỨC VỤ, THỰC HIỆN LŨY KẾ (3 cột), THƯỞNG BẮT KỲP (1 cột)
- THÁNG LÀM VIỆC: đổi từ "T01/2026" sang relativeMonth (số nguyên 1,2,3...) tính từ ngayHieuLuc (tròn tháng)
- CHỈ TIÊU: lookup từ SPEC_TABLE dựa trên relMonth (cap tại tháng 6)
- THỰC HIỆN Quy mô: teamTVVs.length (lũy kế TVV do TTN tuyển, không tính TTN)
- THỰC HIỆN TVVm HĐC: TVVm trong team có IP tháng ≥ 12tr + 1 cho TTN nếu TTN là TVVm và IP ≥ 12tr
- THỰC HIỆN FYP: tổng IP tháng của TVVm trong team + IP của TTN nếu TTN là TVVm
- THƯỞNG: spec.thuong nếu đạt cả 3 chỉ tiêu (Quy mô + TVVm HĐC + FYP)
- Tổng cộng: totalQuymo, totalTvvmHDC, totalTongFYP, totalTienThuong
- TypeScript check: no new errors from changes
- Build: success
- Commit: 00f0611
- Push: success (main → 00f0611)

Stage Summary:
- Đã rewrite hoàn toàn renderThuongTuyenNgang theo spec table 6 tháng
- Bảng giờ chỉ có 13 cột: STT | NHÓM KD | MÃ SỐ | HỌ TÊN TVV | NGÀY HIỆU LỰC | THÁNG LÀM VIỆC | CHỈ TIÊU (3) | THỰC HIỆN THÁNG (3) | THƯỞNG
- Layout đồng bộ với PTKD TN (không summary card, không footnote)
- Logic TVVm HĐC và FYP đã bao gồm cá nhân TTN (nếu TTN là TVVm)
- Quy mô KHÔNG tính TTN, chỉ tính TVV do TTN tuyển (maTVVTuyendung)
- Sẵn sàng verify trên production: https://my-project-nmchau022023-4326s-projects.vercel.app/quan-ly

---
Task ID: tuyen-ngang-v2-catchup
Agent: main
Task: Refactor Thưởng TTN Tuyển Ngang — sort by relMonth, filter >6, add LŨY KẾ + THƯỜNG BẮT KỲP

Work Log:
- OCR ảnh spec THƯỜNG BẮT KỲP (3 lần để verify): 
  - BẮT KỲP 3 THÁNG: Quy mô 4, TVVm HĐC 2, FYP 100tr, Thưởng 24tr
  - BẮT KỊP 6 THÁNG: Quy mô 6, TVVm HĐC 3, FYP 250tr, Thưởng 39tr
- Viết script /home/z/my-project/scripts/refactor_tuyen_ngang_v2.py
- Sắp xếp DS theo THÁNG LÀM VIỆC asc
- Auto-exclude TTN có relMonth > 6 (hiển thị "loại N TTN >T6" trong tổng cộng)
- Đổi tên cột THƯỞNG → THƯỞNG THÁNG
- Thêm 3 cột THỰC HIỆN LŨY KẾ (Quy mô/TVVm HĐC/FYP) với màu tím
  - Quy mô: teamTVVs.length (cumulative)
  - TVVm HĐC: unique count of TVVm với ≥1 tháng HĐC trong 6 tháng đầu
  - FYP: tổng IP 6 tháng của TVVm team + TTN (nếu là TVVm)
- Thêm cột THƯỜNG BẮT KỲP với logic:
  - relMonth >= 6: nếu cum6 đạt → 39tr - tổng thưởng tháng 1-6 - BK3 (nếu đạt)
  - relMonth 3-5: nếu cum3 đạt → 24tr - tổng thưởng tháng 1-3
  - relMonth < 3: —
  - Label BK3/BK6 hiển thị dưới giá trị tiền
- Build + commit fb8601c + push
- Verify trên production: cấu trúc bảng 17 cột đúng, sort theo relMonth asc, TTN >T6 bị loại

Stage Summary:
- Bảng Thưởng TTN Tuyển ngang giờ có 17 cột:
  STT | NHÓM KD | MÃ SỐ | HỌ TÊN TVV | NGÀY HL | THÁNG LV |
  CHỈ TIÊU (3) | THỰC HIỆN THÁNG (3) | THƯỞNG THÁNG |
  THỰC HIỆN LŨY KẾ (3) | THƯỜNG BẮT KỲP
- DS sắp xếp theo THÁNG LÀM VIỆC từ nhỏ đến lớn
- TTN có relMonth > 6 tự động bị loại khỏi DS
- Logic THƯỜNG BẮT KỲP đầy đủ: BK3 (xét khi relMonth >= 3) + BK6 (xét khi relMonth >= 6)
- Spec catchup đã OCR chính xác từ ảnh:
  - BK3: Q4/TVVm2/FYP100tr/Thưởng24tr
  - BK6: Q6/TVVm3/FYP250tr/Thưởng39tr
- Production URL: https://my-project-nmchau022023-4326s-projects.vercel.app/quan-ly

---
Task ID: fix-back-button
Agent: main
Task: Fix nút "Trở về" từ trang quản lý không về được màn hình chính ứng dụng

Work Log:
- Đọc code: handleAppBack dùng navHistoryRef, fallback khi length <= 1 chỉ setActiveSheet('overview') (vẫn ở trang quản lý)
- Vấn đề: khi user vào /quan-ly trực tiếp (không qua trang chủ), history chỉ có [overview] → bấm back vẫn ở overview
- Fix: 
  - Nếu history rỗng + activeSheet='overview' → router.push('/') về trang chủ
  - Nếu history rỗng + activeSheet != overview → về overview trước (2 bước)
- Thêm router vào dependency của useCallback
- Build + commit 6cd09ce + push
- Verify trên production:
  - Mở /quan-ly → bấm "Trở về thao tác trước"
  - URL chuyển: /quan-ly → /
  - Page title vẫn "N.M.C - Trung tam quan ly lien ket"
  - Snapshot: thấy 4 nút Thi Đua / Vinh Danh / Quản Lý / KPI → đã về trang chủ OK

Stage Summary:
- Đã fix nút Back: từ /quan-ly bấm "Trở về thao tác trước" → / (trang chủ)
- Logic:
  - History còn > 1 → pop về state nội bộ trước đó
  - History rỗng + ở overview → router.push('/')
  - History rỗng + ở sheet con (revenue/policy/structure) → về overview, bấm lại mới về trang chủ

---
Task ID: round-decimals-and-kpi-redesign
Agent: main
Task: Rà soát bỏ số thập phân trong trang chính sách + redesign bảng Tiến độ Khung Vựa (KPI page)

Work Log:
A. Round decimals trong trang chính sách (quan-ly/page.tsx):
- Viết script /home/z/my-project/scripts/round_decimals_policy.py
- Thay toàn bộ .toFixed(N) bằng Math.round()
- Năng suất, Tỷ trọng IP, % KH, % progress, aggPct, monthlyPlan, actualAFYP, deficit, totalRatio, file size → integer
- formatKpiCurrency: bỏ 3 decimal places → integer
- formatSmartCurrency (mobile): bỏ thập phân
- formatPolicyAmountForBox: round integer
- fmtBig helper: round integer
- Còn 5 chỗ toFixed(0) cho % trong JSX title attributes - đã replace hết

B. Redesign KPI Tiến độ Khu Vực (kpi/page.tsx):
- Viết script /home/z/my-project/scripts/redesign_kpi_region.py
- Thêm CSS mới .rg-card: 
  - Background: linear-gradient(180deg, #f4f8fc 0%, #e2ecf6 100%) - SÁNG HƠN
  - Border-top: 4px solid màu phòng (xanh dương/banca-vàng/pa-xám)
  - Box-shadow: 0 10px 28px - hiệu ứng NỔI KHỐI
  - Hover: translateY(-2px) + shadow sâu hơn
- Cấu trúc card mới:
  - rg-head: header gradient xanh + tên phòng + % KH
  - rg-afyp-row: AFYP big number + KH
  - rg-prog: progress bar
  - rg-summary: grid 4 cột (AFYP/Lượt HĐ/Tuyển dụng/HĐ chuẩn)
  - Tỷ trọng IP row
  - rg-ad-table: bảng AD compact ngay hàng (8 cột)
- Áp dụng cho cả mobile và desktop (cùng component)
- Hide Mobile Phong Card cũ (kpi-card kpi-phong) bằng {false && (...)}
- Hide AD Cards (Mobile) ad-grid bằng {false && (...)}
- Hide AD Table (Desktop) dsk-ad-wrap bằng {false && (...)}
- Round decimals trong KPI: tyTrong, nangSuat, doLonHD, AFYP, KH

C. Build + commit 613eda2 + push + verify production:
- Desktop: thẻ phòng sáng hơn (gradient white-blue), shadow nổi khối, bảng AD ngay hàng trong card
- Mobile: bảng AD gọn trong card, header xanh, summary 4 stats, tỷ trọng IP row riêng

Stage Summary:
- Trang chính sách: toàn bộ số thập phân đã làm tròn thành số nguyên
- Trang KPI Tiến Độ Khu Vực:
  - Thẻ phòng sáng (gradient white-blue) thay vì nền tối
  - Hiệu ứng nổi khối (box-shadow 0 10px 28px) + hover translateY(-2px)
  - Bố cục ngay hàng: header → AFYP+KH → progress → 4 summary stats → Tỷ trọng IP → AD table
  - Bảng AD compact ngay hàng với 8 cột (AD/% KH/AFYP/Lượt HĐ/TD/HĐC/IP%/prog)
  - Áp dụng đồng nhất cho cả mobile và desktop

---
Task ID: format-number-integer-fix
Agent: main
Task: Fix formatNumber/fmt mặc định Intl.NumberFormat('vi-VN') giữ 3 chữ số thập phân — làm tròn thành số nguyên

Work Log:
- Phát hiện trên production: Bảng Thưởng Năng suất tháng TVV vẫn còn 23 cell có thập phân (vd: 41.886.587,5 | 15.245.535,75)
- Nguyên nhân: Intl.NumberFormat('vi-VN') mặc định maximumFractionDigits=3, không tự làm tròn
- Fix formatNumber (quan-ly/page.tsx line 523):
    new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0, roundingMode: 'halfEven' }).format(Math.round(n))
- Fix fmt (kpi/page.tsx line 606): cùng pattern
- Build + commit ea6ad1a + push
- Verify production: kiểm tra tất cả 7 trang chính sách (TVVm, NS TVV, Quý TVV, TL, Đồng hành, PTKD TN, Quý TN, TTN Tuyển ngang) → 0 cell có thập phân

Stage Summary:
- Toàn bộ số trong bảng chi tiết trang chính sách giờ là SỐ NGUYÊN
- formatNumber và fmt dùng maximumFractionDigits:0 + Math.round → không bao giờ hiển thị thập phân
- Áp dụng đồng nhất cho cả 2 trang /quan-ly và /kpi
