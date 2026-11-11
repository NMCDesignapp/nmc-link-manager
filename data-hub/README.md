# NMC Data Hub — Đồng bộ Excel tự động

Data Hub chạy trên máy quản trị và là nguồn ưu tiên cho toàn bộ dữ liệu Main App:

- Sao Việt cá nhân, TN KTM, TN tuyển dụng
- Doanh số lịch sử từ `NEW_KPI04_<năm>.xlsx`: chỉ nhận HĐ có **IP > 0**, mỗi HĐ được phân vào tháng theo **Ngày phát hành**, từ tháng 1 đến tháng liền trước tháng hiện tại.
- Riêng tháng hiện tại, `NEW_BC02.xlsx` theo phép biến đổi `bc02-sheet4` là nguồn doanh số DUY NHẤT.
- `HĐ tồn tháng trước` chỉ nhận HĐ KPI04 có IP > 0, Ngày phát hành trong tháng hiện tại và Ngày hiệu lực đúng tháng T-1; không đi vào doanh thu/KPI.
- BC02 giữ đủ mọi hàng Excel có dữ liệu theo quy tắc riêng; KPI04 loại HĐ có IP <= 0 vì đây là HĐ đã hủy.
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

Mỗi 15 giây Data Hub kiểm tra checksum của file. File thay đổi sẽ được gửi lên. Khi nâng cấp quy tắc sheet-tháng v2, Data Hub tự đồng bộ lại hai nguồn doanh số một lần dù file không đổi, sau khi bản Data Hub local được cập nhật bằng `REPAIR-NMC-DATA-HUB.cmd`. Main App nhận heartbeat để hiển thị máy tính đang kết nối hay đang ngoại tuyến.

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

## HĐ tồn tháng trước — KPI04 v2.5.0

Nguồn `revenue-history` đọc `NEW_KPI04_<năm>.xlsx`, chỉ nhận HĐ có IP > 0, phân theo Ngày phát hành và tạo doanh thu lịch sử từ tháng 1 đến tháng liền trước tháng hiện tại. Nguồn carryover cùng file cũng chỉ nhận IP > 0, rồi giữ HĐ có Ngày phát hành trong tháng hiện tại và Ngày hiệu lực đúng tháng T-1 (kể cả qua ranh giới tháng 1/năm trước). Nguồn này tuyệt đối không cập nhật doanh thu/KPI; chỉ chương trình Thi đua có cài Ngày phát hành mới sử dụng.

KPI04 bổ sung Chức vụ, Ngày bắt đầu, AD và Mã ĐL tuyển dụng bằng APM01/Cautruc có đối chiếu; `TÍNH LƯỢT 3 tr` được tính lại theo tổng IP của từng TVV trong từng tháng. Với lịch sử phát hành tháng 1–10/2026, `Doanhso.xlsx` chỉ được dùng để bổ sung AD còn thiếu bằng phép ghép chính xác Số hợp đồng; không lấy hợp đồng, IP, AFYP, tháng hoặc mã tuyển dụng từ file này. Từ lịch sử tháng 11/2026 trở đi, AD thiếu vẫn để trống chờ xác nhận. Metadata lịch sử không có trong APM01 hiện tại được giữ từ HĐ đã lưu cùng Số hợp đồng, không suy đoán. File thiếu cột, sai ngày, trùng Số hợp đồng hoặc sai năm sẽ dừng an toàn.


## DMS APM01 / NEW_BC02 — kiểm tra trước đồng bộ

- Mã nguồn có mô-đun `dms-auto-source.mjs`; **chỉ cập nhật GitHub/Vercel không tự cập nhật tiến trình Data Hub đang chạy trên Windows**. Phải cập nhật mã Data Hub local và giữ nguyên cấu hình/token/state.
- `--dms-shadow` kiểm tra các nguồn có `dmsTransform` mà **không gọi API ghi**. Hãy tạo **bản sao** `data-hub.config.json` để cấu hình đường dẫn DMS từ `dms-shadow-sources.example.json`, không dùng trực tiếp mẫu JSON rời này làm config đầy đủ.
- DMS chỉ được ghi nếu **đồng thời** bật `enableDmsWrites: true` tại cấu hình gốc và `enableWrite: true` trên từng nguồn. Không bật khi chưa có báo cáo đối chiếu, sao lưu và nghiệm thu.
- `bc02-sheet2` (Tamthu Sheet 2): lấy **toàn bộ hợp đồng trong BC02**, kể cả các trạng thái bị hủy/từ chối/trì hoãn; không lọc theo tháng hoặc ngày thu/hiệu lực/phát hành.
- `bc02-sheet4` (Tamthu Sheet 4): xuất phát từ toàn bộ BC02, **chỉ loại đúng 4 trạng thái** `Từ chối`, `YCBH hết hiệu lực`, `Hết hiệu lực`, `Trì hoãn` (không phân biệt chữ hoa/thường). Sau lọc, tính lại `TÍNH LƯỢT 3 tr` theo tổng PĐT + 10% ĐT của từng mã TVV; không tự thêm điều kiện tháng/ngày. Mọi hợp đồng còn lại thuộc snapshot **tháng hiện tại** của NC-Link theo cấu hình nguồn Tamthu, bất kể ngày ghi trên từng dòng.
- Phạm vi kỳ của BC02 đã được người vận hành thiết lập ngay khi tải báo cáo DMS; Data Hub **không được thay đổi phạm vi đó**. Nếu số liệu khác mẫu, dừng để đối chiếu file nguồn trước khi mở ghi.
- Đối chiếu tối thiểu: tổng số dòng, IP, AFYP, mã TVV, ngày thu, 4 trạng thái TRỪ HỦY; phân biệt `Tamthu` hiện hành với dữ liệu `Doanhso` lịch sử. Cần đối chiếu số liệu thực tế trên Main App trước khi cho phép thay snapshot.
- Nếu Excel mới chỉ được tải xuống máy nhưng Data Hub local chưa chạy hoặc nguồn active là Google, NC-Link **chưa có dữ liệu mới**. Xác nhận heartbeat, last-sync và kết quả từng nguồn trước khi kết luận đã tự động.

