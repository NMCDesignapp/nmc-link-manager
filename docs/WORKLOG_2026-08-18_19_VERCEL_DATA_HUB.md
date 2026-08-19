# Work log 2026-08-18 → 2026-08-19 — Vercel migration, performance, Data Hub

> Mục đích: lưu lại toàn bộ thay đổi vận hành/kỹ thuật quan trọng trong đợt chuyển tài khoản Vercel và sửa NMC Data Hub, để có thể chẩn đoán, khôi phục hoặc chuyển tài khoản lần nữa mà không phải suy luận lại từ đầu.
>
> Repository là public. **Không ghi token, password, connection string đầy đủ, file Excel nghiệp vụ hoặc dữ liệu khách hàng vào tài liệu này.**

---

## 1. Snapshot hệ thống sau đợt xử lý

### GitHub

- Repository: `NMCDesignapp/nmc-link-manager`
- Branch production: `main`

### Main App trên Vercel

- Project name: `my-project`
- Project ID tại tài khoản Vercel mới: `prj_ko6fBh8aFPn396NySm9KYkjoiKQj`
- Production domain: `https://nc-link.vercel.app`
- Function region bắt buộc: `sin1`

### KPI standalone trên Vercel

- Project name: `kpi-nc-link`
- Project ID tại tài khoản Vercel mới: `prj_OIvqhBSWlkro4OdZBrhExe3cyFce`
- Production domains:
  - `https://angiang2026.vercel.app`
  - `https://angiang2026-nhom.vercel.app`
- Function region bắt buộc: `sin1`

### Vercel team hiện tại

- Team ID: `team_p0r26hxe7VFSUDiVaId3oFfA`

> Các ID Vercel ở trên chỉ là snapshot của tài khoản hiện tại. Nếu chuyển sang tài khoản/team khác, phải lấy ID mới và cập nhật lại tài liệu.

### Database

- Supabase project: `nmc-link-manager`
- Project ref: `kvxbgmhthoqivhawkqlf`
- Region: `ap-southeast-1` — Singapore

---

## 2. Bối cảnh sự cố khi chuyển tài khoản Vercel

Ngày 2026-08-18, Main App và KPI standalone được chuyển từ một tài khoản Vercel cũ sang tài khoản mới.

Ngay sau khi chuyển:

- Main App chậm rõ rệt;
- KPI standalone cũng chậm;
- nhiều API bị timeout 60 giây;
- Prisma báo `P2024` do hết connection trong pool;
- một số transaction Sao Việt báo `P2028`;
- số request polling nền rất lớn;
- Vercel function của Main App thực tế chạy ở `iad1` (Virginia, USA) trong khi Supabase ở Singapore.

Đây là điểm quan trọng: **không được mặc định cấu hình project-level của tài khoản Vercel cũ sẽ tự mang sang tài khoản mới**. Khi migration, cần kiểm tra lại Functions region, Environment Variables, Root Directory, aliases/domains và project settings.

---

## 3. Nguyên nhân hiệu năng lớn nhất: Vercel chạy sai region

Trước khi sửa, request `/api/health` cho thấy:

- Vercel function execution ở `iad1`;
- Supabase ở `ap-southeast-1` / Singapore;
- query DB nhỏ mất khoảng 1–2 giây chỉ vì round-trip xuyên lục địa.

Đã sửa:

### Main App

`vercel.json`:

```json
{
  "regions": ["sin1"]
}
```

Commit:

- `1033e1fc5bdba8ada131c9ccbd6bd98e476cf2cc` — `perf(vercel): colocate Main App functions with Singapore database`

### KPI standalone

`kpi-app/vercel.json`:

```json
{
  "regions": ["sin1"]
}
```

Commit:

- `cf4c3eeadee07b49afe4dce9ef23b00a3e7f5047` — `perf(vercel): colocate standalone KPI with Singapore database`

Sau khi chạy tại Singapore:

- Main `/api/health` giảm từ khoảng `1262 ms` xuống khoảng `227 ms` trong phép đo kiểm tra;
- KPI proxy path có sample giảm từ khoảng `2383 ms` xuống khoảng `13 ms`;
- runtime error trong cửa sổ kiểm tra ngắn sau deploy về 0.

### Quy tắc migration sau này

Nếu database vẫn ở Singapore, **Main App và KPI phải tiếp tục đặt `regions: ["sin1"]`** trừ khi có quyết định kiến trúc khác và đo lại latency.

---

## 4. Prisma pool contention trên Vercel

`src/lib/db.ts` đã normalize Supabase transaction pooler nhưng trước đó ép:

- `connection_limit=1`
- `pool_timeout=30`

Trong khi `/api/quan-ly/all` chạy nhiều query song song bằng `Promise.all`, làm các request xếp hàng và dễ timeout.

Đã đổi connection limit từ 1 → 3.

Commit:

- `5617b2a7b92d3ba2eab27ac6eff20f1689498590` — `perf(db): allow concurrent queries on transaction pooler`

Không tăng pool tùy tiện lên giá trị lớn trên serverless. Nếu thay đổi, phải quan sát Supabase/Vercel connection behavior và runtime errors.

---

## 5. Giảm polling và tải nền

Trước khi tối ưu, Main App có nhiều request lặp lại với tần suất cao, nổi bật `/api/settings`, `/api/sync-source`, `/api/saoviet-data`, `/api/quan-ly/all`, các route structure và Data Hub status.

Đã thay đổi:

- Settings poll: `4s` → `20s`
- Full AppData refresh: `60s` → `180s`
- Sync status poll: `10s` → `30s`

Commits:

- `f4e2f747fe098fdf53805032a5057adb6d4b61cf` — `perf(kpi): reduce polling and background reload pressure`
- `9139e7765912bd13ce6fc745837bd6591c73102b` — `perf(sync-status): reduce live status database polling`

Nếu sau này UI có vẻ chậm cập nhật, không nên ngay lập tức đưa polling về mức cực thấp; ưu tiên event/broadcast/cache invalidation hoặc refresh có mục tiêu.

---

## 6. Environment Variables khi chuyển tài khoản Vercel

Tài khoản Vercel cũ từng có khoảng 80–90 biến môi trường; tài khoản mới có ít hơn nhiều. Số lượng biến **không tự chứng minh cấu hình thiếu**, vì nhiều integration có thể sinh biến tự động.

Các biến production cần đặc biệt kiểm tra theo code/runtime:

### Main App

- `POSTGRES_PRISMA_URL`
- `DATABASE_URL`
- `DIRECT_URL`
- `NMC_DATA_HUB_IMPORT_TOKEN` / token Data Hub theo implementation hiện hành

`NODE_ENV` do runtime cung cấp.

### KPI standalone

- `NEXT_PUBLIC_MAIN_APP_URL` là biến nên cấu hình rõ; build proxy hiện có fallback `https://nc-link.vercel.app`.

### Quy tắc

- Không copy mù toàn bộ 80–90 biến từ project cũ.
- Audit `process.env.*` trong source và các integration đang dùng.
- Không commit giá trị secret vào GitHub.
- Sau migration phải gọi `/api/health` và kiểm tra các cờ `hasDatabaseUrl`, `hasDirectUrl`, `hasPostgresPrismaUrl` nếu route còn hỗ trợ.

---

## 7. NMC Data Hub — cấu hình nguồn hiện hành

Data Hub chạy **trên máy Windows quản trị**, không chạy trên Vercel.

Config mẫu nằm ở:

```text
data-hub/data-hub.config.example.json
```

Đường dẫn local thường dùng:

```text
C:\NMCDataHub
```

File Excel thường ở:

```text
C:\NMC-Data
```

### Các nguồn chính

- Structure TVV
- Structure leaders
- Structure recruiters
- CLB members
- Tuyển ngang
- Sao Việt cá nhân
- Sao Việt TN KTM
- Sao Việt TN tuyển dụng
- Doanh số lịch sử
- Doanh số tháng hiện tại
- Tạm thu detail view

Data Hub gửi heartbeat qua:

```text
POST /api/data-hub/status
```

Main App hiển thị online dựa vào heartbeat gần nhất, không phải chỉ dựa vào dữ liệu đã có trong DB.

---

## 8. Lỗi Tamthu Sheet 4 báo 3499 dòng nhưng server nhận 55

### Triệu chứng

Data Hub báo:

```text
revenue-current-month: Sheet 4 có 3499 dòng nhưng máy chủ nhận 55
```

### Thực tế

File `Tamthu.xlsx`, Sheet `4` chỉ có:

- 56 dòng thật gồm header;
- 55 dòng dữ liệu.

Nhưng workbook giữ `used range`/formatting/row metadata xuống khoảng dòng 3500. `sheet_to_csv()` trực tiếp biến các dòng format rỗng này thành CSV có dấu phân cách, khiến bộ đếm tưởng có hàng nghìn dòng.

Server lọc dòng rỗng nên nhận đúng 55.

### Fix

Data Hub giờ compact worksheet, chỉ giữ những hàng có giá trị thật trước khi xuất CSV.

Commit:

- `94e8fbf17c8140ed7e62550fcedea034b12f07a8` — `fix(data-hub): ignore formatted blank Excel rows`

### Lưu ý

Không cần xóa hàng/format trong Excel để “chữa” lỗi này. Logic đọc file phải chịu được used-range thừa.

---

## 9. Sao Việt — mapping sheet và bắt đầu từ dòng Excel số 6

Workbook:

```text
83An Giang_SaoViet2026TT.xlsx
```

Chỉ dùng đúng 3 sheet:

| Sheet | Program | Màn hình |
|---|---|---|
| `TVV` | `ca-nhan` | Sao Việt Cá Nhân |
| `Nhom` | `tn-ktm` | Sao Việt Nhóm KTM |
| `NhomTD` | `tn-td` | Sao Việt Nhóm Tuyển Dụng |

### Quy tắc nghiệp vụ

**Dữ liệu bắt đầu từ dòng Excel số 6 và phải bao gồm dòng 6.**

Trong file được kiểm tra ngày 2026-08-19:

- `TVV` dòng 6: Nguyễn Thị Thảo — `D104132535`
- `Nhom` dòng 6: Dương Thanh Ny — `D104134807`
- `NhomTD` dòng 6: Nguyễn Thị Lê Giào — `D104142435`

### Nguyên nhân mất dòng 6 trước đây

Data Hub compact các hàng rỗng trước khi gửi CSV. Nếu row 1 rỗng thì Excel row 6 có thể trở thành CSV row 5. API cũ lại `rowsRaw.slice(5)`, làm mất bản ghi đầu tiên.

### Fix

API không còn cắt cố định theo số dòng CSV. Với Data Hub, nó nhận diện dòng dữ liệu thật theo các cột nguồn D/E và loại header/title theo nội dung.

Commit:

- `3ebef56c8d74b465a0250280e314af63efd37d73` — `fix(saoviet): include Excel row 6 in Data Hub imports`

Sau khi fix và đồng bộ đúng, số lượng kiểm tra:

- Sao Việt Cá Nhân: `294`
- Sao Việt Nhóm KTM: `31`
- Sao Việt Nhóm Tuyển Dụng: `28`

Nếu sau này số lượng giảm đúng 1 ở cả ba nguồn, kiểm tra ngay logic row-6/header filtering trước tiên.

---

## 10. Data Hub bị mất kết nối dù server vẫn khỏe

Ngày 2026-08-19, Data Hub chuyển offline.

Kiểm tra production cho thấy:

- `source = data-hub`
- `dataHubEnabled = true`
- `dataHubOnline = false`
- heartbeat cuối dừng hẳn tại `2026-08-19T02:15:46.736Z` (09:15:46 giờ Việt Nam)
- Vercel không có runtime error tương ứng
- trước thời điểm đó `/api/data-hub/status` trả 200 liên tục.

Kết luận: **process Data Hub trên Windows đã ngừng**, server không chủ động ngắt.

Đây là cách phân biệt quan trọng:

- Nếu heartbeat POST vẫn tới nhưng lỗi HTTP → điều tra server/token/API.
- Nếu heartbeat dừng hoàn toàn → điều tra process/Windows/launcher/network local.

---

## 11. Data Hub chạy ẩn nền + watchdog

Để tránh người dùng đóng nhầm cửa sổ CMD, Data Hub đã chuyển sang mô hình chạy ẩn nền.

Các file hỗ trợ trong `data-hub/`:

```text
DATA-HUB-WATCHDOG.ps1
RUN-DATA-HUB-HIDDEN.vbs
RESTART-DATA-HUB.cmd
REPAIR-NMC-DATA-HUB.cmd
```

### Mô hình

```text
Windows Startup
  -> RUN-DATA-HUB-HIDDEN.vbs
  -> PowerShell hidden
  -> DATA-HUB-WATCHDOG.ps1
  -> node index.mjs
```

Nếu `node index.mjs` thoát/crash:

- watchdog ghi log;
- chờ khoảng 5 giây;
- tự chạy lại.

Không cần giữ cửa sổ CMD mở.

### Log local

Thông thường:

```text
C:\NMCDataHub\data-hub.log
C:\NMCDataHub\data-hub-supervisor.log
```

Không commit log thật lên repo nếu có dữ liệu nghiệp vụ.

### Khởi động lại thủ công

Dùng:

```text
C:\NMCDataHub\RESTART-DATA-HUB.cmd
```

Lệnh này phải:

1. dừng process `node index.mjs`/watchdog cũ nếu còn treo;
2. bật lại hidden launcher;
3. chờ heartbeat;
4. kiểm tra `/api/sync-source` và xác nhận `dataHubOnline=true`.

### Repair đầy đủ

`REPAIR-NMC-DATA-HUB.cmd` dùng khi cần:

- tải lại source Data Hub mới nhất;
- npm install;
- diagnose token/file/sheet;
- activate Data Hub;
- force sync;
- cài lại hidden launcher/Startup.

Commit cập nhật chế độ chạy nền:

- `5c0c1e32ca90bd3019d4218ce267e81076d87741`
- `be2255c8f885a8a096a0d8392ec518cd02e572fa`
- `953ad5e141243a450fe9c9b158d26e53f50be0cb`
- `00e94e5cc6951dae3e250f0c7ac2dd319398a191`
- `0cbb5f22da8f188646d5ca4f56abe4bca3c5538d`

Các commit trên tạo watchdog/hidden launcher/restart command và cập nhật repair flow.

---

## 12. Data Hub agent version và các commit nền tảng

Một số commit quan trọng trước/sau đợt này:

- `c8d0b715a56acd76e4ca025f5cde79c0336de4bd` — verify current-month revenue sync before caching checksum
- `bd8509beb557f5fb1d10ad1c75b7776358f07b66` — reduce runtime pool contention
- `a2f15c200c730987863e2c4d6a2b6f7d69823d73` — sync Tamthu detail snapshot
- `beffee47424097a5456150a9b2015bbd01fb4ebd` — remove runtime schema DDL from revenue import
- `7e0ebb56a0c3a844885ecbf546b7ff24173b1bd6` — cap Vercel pool clients and allow queued queries
- `69ab6021f39a0c63bd17e78ff8806da1f009b02f` — cache active sync source briefly
- `f64f7c00548101bd2fd45fdb517293a24100dc7c` — rebuild local Excel bridge and add one-click repair
- `2faf4b5336d018c01363021279711bb50165b67e` — show Data Hub connection from heartbeat
- `5617b2a7b92d3ba2eab27ac6eff20f1689498590` — allow concurrent DB queries
- `f4e2f747fe098fdf53805032a5057adb6d4b61cf` — reduce polling/background reload pressure
- `1033e1fc5bdba8ada131c9ccbd6bd98e476cf2cc` — Main App functions to Singapore
- `cf4c3eeadee07b49afe4dce9ef23b00a3e7f5047` — KPI functions to Singapore
- `9139e7765912bd13ce6fc745837bd6591c73102b` — sync status poll 10s → 30s
- `94e8fbf17c8140ed7e62550fcedea034b12f07a8` — ignore formatted blank Excel rows
- `3ebef56c8d74b465a0250280e314af63efd37d73` — keep Sao Việt Excel row 6
- `0cbb5f22da8f188646d5ca4f56abe4bca3c5538d` — hidden/background Data Hub repair flow

---

## 13. Checklist khi Data Hub báo offline

Thực hiện theo thứ tự này, không đoán:

1. Mở `https://nc-link.vercel.app/api/sync-source` hoặc kiểm tra route qua công cụ quản trị.
2. Xác nhận:
   - `source === "data-hub"`
   - `dataHubEnabled === true`
   - xem `lastSeenAt`.
3. Nếu `lastSeenAt` còn cập nhật mà online false → kiểm tra threshold/clock/status logic.
4. Nếu `lastSeenAt` đứng yên hoàn toàn → process local không heartbeat.
5. Kiểm tra Vercel runtime logs cho `/api/data-hub/status`:
   - có POST gần đây hay không;
   - HTTP status là gì.
6. Nếu không có POST → chạy `C:\NMCDataHub\RESTART-DATA-HUB.cmd`.
7. Nếu vẫn không online → đọc:
   - `data-hub.log`
   - `data-hub-supervisor.log`
8. Chạy `node index.mjs --diagnose` nếu cần xác định token/file/sheet nào lỗi.
9. Không xóa DB/table/business rows để “reset” Data Hub.

---

## 14. Checklist khi chuyển Vercel account/team lần nữa

### Trước khi chuyển

- Ghi lại project names, production domains, root directory.
- Ghi lại **tên** Environment Variables; không lưu secret trong repo.
- Ghi lại Vercel Functions region.
- Ghi lại domain aliases.
- Kiểm tra Supabase region.
- Có backup database và xác nhận restore path.

### Sau khi tạo project ở tài khoản mới

1. Kết nối đúng repo + branch `main`.
2. Main root = repo root.
3. KPI root = `kpi-app`.
4. Cấu hình env vars thực sự cần.
5. Đặt Functions region `sin1` cho cả Main/KPI nếu Supabase vẫn ở Singapore.
6. Gắn production domains/aliases.
7. Deploy và chờ `READY`.
8. Gọi `/api/health` Main.
9. Kiểm tra DB connectivity/latency.
10. Gọi `/api/sync-source`.
11. Nếu Data Hub local vẫn trỏ về `https://nc-link.vercel.app` và domain giữ nguyên thì không cần đổi config URL; nếu domain đổi thì cập nhật local config.
12. Chạy `RESTART-DATA-HUB.cmd` hoặc repair để tạo heartbeat sang deployment mới.
13. Kiểm tra số lượng Sao Việt và doanh số hiện tại.
14. Kiểm tra Vercel runtime errors ít nhất vài phút sau khi có traffic thật.

---

## 15. Trạng thái xác nhận cuối đợt xử lý

Tại lần kiểm tra cuối ngày 2026-08-19:

- Data Hub online: `true`
- Data Hub source active: `data-hub`
- Sao Việt Cá Nhân: `294`
- Sao Việt Nhóm KTM: `31`
- Sao Việt Nhóm Tuyển Dụng: `28`
- revenue current month: `62` tại snapshot cuối (số này thay đổi theo file Tamthu nên không dùng làm hằng số nghiệp vụ)
- Main App production chạy tại `sin1`
- Data Hub đã chuyển sang mô hình hidden background + watchdog.

---

## 16. Nguyên tắc cho người xử lý tiếp theo

- Code/runtime là nguồn chuẩn cuối cùng nếu tài liệu cũ mâu thuẫn.
- Không nói “đã active” khi deployment chưa `READY` hoặc production chưa được xác minh.
- Không sửa/xóa dữ liệu nghiệp vụ để giải quyết lỗi bridge nếu chưa chứng minh dữ liệu DB sai.
- Với Excel, phân biệt **dòng Excel thật** với dòng CSV sau compact/filter.
- Với Data Hub offline, phân biệt lỗi server với process local bằng heartbeat/log trước.
- Với Vercel migration, kiểm tra **region** trước khi đổ lỗi cho database/application code.
- Không đưa secret/token/connection string đầy đủ vào issue, commit, chat log public hoặc tài liệu repo.
