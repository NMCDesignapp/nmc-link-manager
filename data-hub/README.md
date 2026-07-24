# NMC Data Hub — Giai đoạn 1

Dịch vụ này chạy trên máy quản trị và **chủ động đẩy** 4 nguồn dữ liệu chuẩn hóa vào Main App:

- Doanh số tháng 7
- Sao Việt Cá nhân
- Sao Việt TN KTM
- Sao Việt TN TD

Không mở cổng mạng, không cần Cloudflare Tunnel. Máy chỉ tạo kết nối HTTPS đi ra `https://nc-link.vercel.app`.

## Cài lần đầu

1. Cài Node.js LTS 20+ nếu máy chưa có.
2. Tải thư mục `data-hub` này về một vị trí cố định, ví dụ `C:\\NMCDataHub`.
3. Mở PowerShell tại thư mục đó và chạy:

```powershell
npm install
Copy-Item data-hub.config.example.json data-hub.config.json
notepad data-hub.config.json
```

4. Trong `data-hub.config.json`, đặt đúng đường dẫn file và tên sheet thực tế.
5. Đặt token bằng PowerShell (chỉ làm một lần, sau đó mở lại PowerShell):

```powershell
[Environment]::SetEnvironmentVariable('NMC_DATA_HUB_TOKEN', 'TOKEN_DO_QUAN_TRI_VIEN_CUNG_CAP', 'User')
```

6. Mở PowerShell mới và chạy kiểm tra lần đầu:

```powershell
npm run once
```

Lệnh này phải báo `✓` cho cả 4 nguồn. Chưa tự bật chuyển đổi Google Sheets.

## Bật nguồn Data Hub

Sau khi đối chiếu số liệu trên Main App với file nguồn, chạy:

```powershell
npm run activate
```

Từ thời điểm đó Main App và KPI không còn tự tải hai link Google. Chỉ dữ liệu do Data Hub công bố mới được dùng.

## Chạy liên tục và tự đồng bộ

```powershell
npm start
```

Mỗi 15 giây Data Hub kiểm tra thay đổi file. Dữ liệu chỉ được gửi khi nội dung file thay đổi và chỉ ghi nhận là thành công sau khi Main App trả kết quả thành công.

Để chạy tự khởi động cùng Windows, sau khi kiểm thử xong hãy tạo Scheduled Task chạy lệnh `npm start` trong thư mục này. Không chạy nhiều hơn một bản Data Hub cùng lúc.

## Quy tắc dữ liệu

- File doanh số phải có hàng tiêu đề giống file đã dùng trên Google Sheets.
- Các sheet Sao Việt có thể có hoặc không có hàng tiêu đề; dữ liệu được giữ nguyên theo cấu trúc hiện có của app.
- Nguồn không có dữ liệu không bị tự thay bằng dữ liệu cũ. Với nguồn doanh số, Data Hub chặn việc gửi file thiếu hàng tiêu đề; với Sao Việt, file/sheet rỗng được công bố là rỗng nếu `allowEmpty: true`.
- Token không được đưa vào GitHub, email hoặc ảnh chụp màn hình.
