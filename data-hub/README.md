# NMC Data Hub — Đồng bộ Excel tự động

Data Hub chạy trên máy quản trị và là nguồn ưu tiên cho toàn bộ dữ liệu Main App:

- Sao Việt cá nhân, TN KTM, TN tuyển dụng
- Doanh số lịch sử tháng 1–7 từ Doanhso.xlsx
- Doanh số tháng hiện tại từ Tamthu.xlsx
- Cấu trúc TVV, DS TN, DS TTN, thành viên CLB và TTN tuyển ngang

## Nguyên tắc chống ghi đè

Main App chỉ cho phép **một nguồn tự động hoạt động tại một thời điểm**.

- Khi Data Hub đang được chọn, mọi yêu cầu ghi từ Google Sheets bị máy chủ từ chối.
- Khi bật Google Sheets trên trang Quản lý, mọi yêu cầu ghi từ Data Hub bị máy chủ từ chối và tiến trình trên máy tự chuyển sang trạng thái tạm dừng.
- Khi chuyển lại Excel trên máy tính, Google Sheets tắt ngay.
- Doanh số theo tháng, Sao Việt và các danh sách cấu trúc đều được thay thế theo nguồn chuẩn, không cộng dồn dữ liệu cũ.

## Cài đặt trên máy tính

1. Cài Node.js LTS 20+.
2. Đặt thư mục Data Hub ở vị trí cố định, ví dụ C:\\NMCDataHub.
3. Chạy:

```powershell
npm install
Copy-Item data-hub.config.example.json data-hub.config.json
notepad data-hub.config.json
```

4. Sửa đúng đường dẫn file và tên sheet thực tế trong data-hub.config.json.
5. Khai báo NMC_DATA_HUB_TOKEN trong biến môi trường Windows.
6. Kiểm tra một lần bằng `npm run once`.
7. Bật nguồn Excel bằng `npm run activate`.
8. Chạy liên tục bằng `npm start` và cấu hình Windows Scheduled Task để tự khởi động cùng máy.

Mỗi 15 giây Data Hub kiểm tra checksum của file. Chỉ file thay đổi mới được gửi lên. Main App nhận heartbeat để hiển thị máy tính đang kết nối hay đang ngoại tuyến.

Không chạy đồng thời nhiều bản Data Hub trên cùng máy. Không đưa token hoặc file data-hub.config.json thật lên GitHub.
