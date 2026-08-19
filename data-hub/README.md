# NMC Data Hub — Đồng bộ Excel tự động

Data Hub chạy trên máy quản trị và là nguồn ưu tiên cho toàn bộ dữ liệu Main App:

- Sao Việt cá nhân, TN KTM, TN tuyển dụng
- Doanh số lịch sử từ Doanhso.xlsx
- Doanh số tháng hiện tại từ Tamthu.xlsx
- Cấu trúc TVV, DS TN, DS TTN, thành viên CLB và TTN tuyển ngang

## Work log / tài liệu phục hồi

Đợt chuyển tài khoản Vercel, tối ưu hiệu năng, sửa Excel/Data Hub và thiết lập chạy ẩn nền ngày 2026-08-18 → 2026-08-19 được ghi đầy đủ tại:

```text
docs/WORKLOG_2026-08-18_19_VERCEL_DATA_HUB.md
```

Nếu cần chuyển Vercel account/team, Data Hub mất kết nối, Sao Việt mất dòng đầu hoặc Tamthu báo sai số dòng, đọc work log này trước khi thay đổi dữ liệu production.

## Nguyên tắc chống ghi đè

Main App chỉ cho phép **một nguồn tự động hoạt động tại một thời điểm**.

- Khi Data Hub đang được chọn, mọi yêu cầu ghi từ Google Sheets bị máy chủ từ chối.
- Khi bật Google Sheets trên trang Quản lý, mọi yêu cầu ghi từ Data Hub bị máy chủ từ chối và tiến trình trên máy tự chuyển sang trạng thái tạm dừng.
- Khi chuyển lại Excel trên máy tính, Google Sheets tắt ngay.
- Doanh số theo tháng, Sao Việt và các danh sách cấu trúc đều được thay thế theo nguồn chuẩn, không cộng dồn dữ liệu cũ.

## Cài đặt trên máy tính

1. Cài Node.js LTS 20+.
2. Đặt thư mục Data Hub ở vị trí cố định, ví dụ `C:\NMCDataHub`.
3. Chạy:

```powershell
npm install
Copy-Item data-hub.config.example.json data-hub.config.json
notepad data-hub.config.json
```

4. Sửa đúng đường dẫn file và tên sheet thực tế trong `data-hub.config.json`.
5. Khai báo `NMC_DATA_HUB_TOKEN` trong biến môi trường Windows.
6. Kiểm tra một lần bằng `npm run once`.
7. Bật nguồn Excel bằng `npm run activate`.
8. Khuyến nghị chạy `REPAIR-NMC-DATA-HUB.cmd` để cài launcher ẩn nền + watchdog + Startup.

Mỗi 15 giây Data Hub kiểm tra checksum của file. Chỉ file thay đổi mới được gửi lên. Main App nhận heartbeat để hiển thị máy tính đang kết nối hay đang ngoại tuyến.

## Chạy ẩn nền và tự khởi động lại

Các file vận hành hiện hành:

```text
DATA-HUB-WATCHDOG.ps1
RUN-DATA-HUB-HIDDEN.vbs
RESTART-DATA-HUB.cmd
REPAIR-NMC-DATA-HUB.cmd
```

Mô hình chuẩn:

```text
Windows Startup
  -> RUN-DATA-HUB-HIDDEN.vbs
  -> DATA-HUB-WATCHDOG.ps1
  -> node index.mjs
```

- Không cần giữ cửa sổ CMD mở.
- Nếu `node index.mjs` thoát/crash, watchdog tự chạy lại sau vài giây.
- Nếu nghi Data Hub bị tắt, chạy `C:\NMCDataHub\RESTART-DATA-HUB.cmd`.
- Log local thường ở `C:\NMCDataHub\data-hub.log` và `C:\NMCDataHub\data-hub-supervisor.log`.

## Sao Việt — mapping nguồn bắt buộc

Workbook `83An Giang_SaoViet2026TT.xlsx` chỉ dùng 3 sheet sau:

- `TVV` → Sao Việt Cá Nhân (`ca-nhan`)
- `Nhom` → Sao Việt Nhóm KTM (`tn-ktm`)
- `NhomTD` → Sao Việt Nhóm Tuyển Dụng (`tn-td`)

Dữ liệu bắt đầu từ **dòng Excel số 6 và phải bao gồm dòng 6**. Không dùng fixed CSV row slicing vì Data Hub có thể compact các hàng Excel rỗng trước khi gửi.

## Lưu ý bảo mật

Không chạy đồng thời nhiều bản Data Hub trên cùng máy. Không đưa token, connection string, file `data-hub.config.json` thật, file Excel nghiệp vụ hoặc log chứa dữ liệu khách hàng lên GitHub.
