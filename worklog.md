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
