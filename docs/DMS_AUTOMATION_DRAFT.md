# DMS tự động – BẢN NHÁP KHÔNG TRIỂN KHAI

Data Hub đọc trực tiếp trong G:\NMC-Data:
- NEW_BC02.xlsx (đúng tên cố định).
- APM01 Agent_<ngày tháng>.xlsx (chọn file có thời gian sửa đổi mới nhất).

APM01 tự phân loại thành structure-tvv, leaders, recruiters. BC02 tạo Sheet2 và lọc TRỪ HỦY = 0 để tạo Sheet4. Chỉ xuất các cột thực sự cần cho KPI. File APM01/BC02 gốc không gửi lên máy chủ.

Các API đồng bộ hiện tại có cơ chế replace dữ liệu thật, nên KHÔNG dùng cấu hình nguồn mới trên Data Hub đang chạy. Giữ nguyên Doanhso, DS CLB, tuyen-ngang và Sao Việt.

## Chạy kiểm tra trên bản sao cấu hình

- Tạo bản sao data-hub.config.json đang dùng; không commit file chứa token.
- Thay 5 nguồn tương ứng theo data-hub/dms-shadow-sources.example.json.
- Trỏ NMC_DATA_HUB_CONFIG tới file bản sao này.
- Chạy node index.mjs --dms-shadow từ thư mục data-hub.

Cờ --dms-shadow chỉ đọc file và in thống kê tổng hợp, hoàn toàn không gọi API ghi và không thay đổi DB. KHÔNG chạy --once, start, activate với cấu hình thử nghiệm.

## Còn phải nghiệm thu trước khi hợp nhất

1. APM01 nguyên gốc DMS khác workbook cấu trúc cũ ở cột helper mã nhóm/AD/Ghi chú.
2. NEW_BC02 có thể chứa nhiều tháng do lịch DMS Look Back 1. Không tự lọc theo ngày nếu chưa được xác nhận.
3. Đối chiếu toàn bộ mã TVV, số hợp đồng, IP, AFYP, ghi chú và nhóm với dữ liệu NC-Link đang chạy.
4. Chạy kiểm thử trên Windows; kiểm tra rollback và việc đồng bộ KPI Main/standalone.
5. Không merge main, không cập nhật API hoặc Supabase production trước khi được đồng ý.

Repository public: không đưa token, dữ liệu cá nhân, hợp đồng hoặc file Excel nghiệp vụ lên GitHub.
