# DMS tự động – BẢN NHÁP KHÔNG TRIỂN KHAI

Data Hub đọc trực tiếp trong G:\NMC-Data:
- NEW_BC02.xlsx (đúng tên cố định).
- APM01 Agents_<ngày tháng>.xlsx (chọn file có thời gian sửa đổi mới nhất trong các tệp khớp đúng tiền tố `APM01 Agents_`).

APM01 tự phân loại thành structure-tvv, leaders, recruiters. BC02 tạo Sheet2 và lọc TRỪ HỦY = 0 để tạo Sheet4. Chỉ xuất các cột thực sự cần cho KPI. File APM01/BC02 gốc không gửi lên máy chủ.

Các API đồng bộ hiện tại có cơ chế replace dữ liệu thật, nên KHÔNG dùng cấu hình nguồn mới trên Data Hub đang chạy.

**Chốt chặn ghi bổ sung:** code Data Hub mặc định từ chối tất cả nguồn DMS trong đường chạy `start`/`--once`, kể cả khi đã thêm nguồn vào cấu hình. Chỉ có thể ghi khi đồng thời đặt `enableDmsWrites: true` ở mức cấu hình và `enableWrite: true` tại từng nguồn DMS. KHÔNG bật hai cờ này trong giai đoạn đối chiếu; chế độ `--dms-shadow` không cần chúng và vẫn tuyệt đối không gửi API. Giữ nguyên Doanhso, DS CLB, tuyen-ngang và Sao Việt.

## Chạy kiểm tra trên bản sao cấu hình

- Tạo bản sao data-hub.config.json đang dùng; không commit file chứa token.
- Thay 5 nguồn tương ứng theo data-hub/dms-shadow-sources.example.json.
- Trỏ NMC_DATA_HUB_CONFIG tới file bản sao này.
- Chạy node index.mjs --dms-shadow từ thư mục data-hub.

Cờ --dms-shadow chỉ đọc file và in thống kê tổng hợp, hoàn toàn không gọi API ghi và không thay đổi DB. KHÔNG chạy --once, start, activate với cấu hình thử nghiệm.

## ĐÁNH DẤU 2003 (nhập thủ công trên DS TVV)

- Giao diện: Quản lý → Cấu trúc → DS TVV → **Nhập ĐÁNH DẤU 2003**.
- Excel 2 cột, cột A **Mã TVV**, cột B **Ghi chú** (cũng nhận tiêu đề **ĐÁNH DẤU 2003**); đối chiếu theo Mã TVV, kiểm tra số bản ghi và xác nhận trước khi ghi.
- Mã TVV không có trong danh sách hiện tại không được tự tạo. Mã TVV không có trong file Excel giữ nguyên giá trị đang lưu. Ô ghi chú trống ở mã có trong file là thao tác xóa dấu của đúng mã.
- Dấu được lưu bền trong PostgreSQL, khóa **Mã TVV**; API /api/structure/tvv gộp dấu vào từng bản ghi TVV khi đọc. Cấu trúc bảng nhân sự và APM01 không bị thay đổi.
- Cột trên bảng và trong file xuất DS TVV có tên chính thức **ĐÁNH DẤU 2003**. API nhập DS TVV vẫn hiểu cột **Ghi chú** cũ để tương thích.
- Các nguồn DMS và cập nhật DS TVV hàng loạt không được xóa phần đánh dấu nhập thủ công. Chỉ nút nhập hai cột hoặc chỉnh sửa trực tiếp mới quản lý phần này.
- API nhập được bảo vệ bằng phiên admin đã ký và Origin cùng trang. Không đưa Excel có mã nhân sự lên repository công khai.

## Còn phải nghiệm thu trước khi hợp nhất

1. APM01 nguyên gốc DMS khác workbook cấu trúc cũ ở cột helper mã nhóm/AD/Ghi chú.
2. NEW_BC02 có thể chứa nhiều tháng do lịch DMS Look Back 1. Không tự lọc theo ngày nếu chưa được xác nhận.
3. Đối chiếu toàn bộ mã TVV, số hợp đồng, IP, AFYP, ghi chú và nhóm với dữ liệu NC-Link đang chạy.
4. Chạy kiểm thử trên Windows; kiểm tra rollback và việc đồng bộ KPI Main/standalone.
5. Không merge main, không cập nhật API hoặc Supabase production trước khi được đồng ý.

Repository public: không đưa token, dữ liệu cá nhân, hợp đồng hoặc file Excel nghiệp vụ lên GitHub.
