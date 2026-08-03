# Bàn giao toàn bộ ngữ cảnh cho Codex — NMC Link Manager

Cập nhật nền: 2026-08-03.

Tài liệu này chuyển giao kiến thức tích lũy về ứng dụng, kiến trúc, luồng dữ liệu, yêu cầu nghiệp vụ và cách vận hành. Mã nguồn hiện tại vẫn là nguồn chuẩn cuối cùng. Khi tài liệu và code khác nhau, phải kiểm tra code/runtime trước khi kết luận.

---

## 1. Bản chất hệ thống

Repository `NMCDesignapp/nmc-link-manager` không còn chỉ là ứng dụng quản lý link đơn giản. Nó đã phát triển thành một hệ thống gồm:

- trang quản lý liên kết và tài liệu;
- khu vực quản trị dữ liệu;
- dashboard KPI;
- thi đua/chính sách/CLB;
- đăng ký mục tiêu kinh doanh;
- dữ liệu doanh số, cơ cấu tổ chức và Sao Việt;
- các module sự kiện/danh sách khách hàng/quay số;
- một bản KPI công khai tách riêng;
- một tác nhân local tên NMC Data Hub để đồng bộ Excel trên máy tính lên cloud.

README gốc phản ánh giai đoạn đầu và còn ghi Neon. Không dùng README gốc làm nguồn duy nhất để suy luận kiến trúc hiện tại.

---

## 2. Repository và deployment

### Repository

- GitHub: `NMCDesignapp/nmc-link-manager`.
- Branch production: `main`.
- Repository hiện là public. Không được commit secret hoặc dữ liệu khách hàng.

### Main App

- Vercel project: `my-project`.
- Production: `https://nc-link.vercel.app`.
- KPI trong Main App: `https://nc-link.vercel.app/kpi`.
- Main App chứa chức năng quản trị, nguồn điều khiển cấu hình và các API ghi.

### KPI tách

- Vercel project: `kpi-nc-link`.
- Root Directory: `kpi-app`.
- Production aliases:
  - `https://angiang2026.vercel.app`
  - `https://angiang2026-nhom.vercel.app`
- Đây là bản công khai, chỉ đọc.
- Không được lộ nút quản trị, sidebar, mật khẩu quản trị, API ghi hoặc luồng nội bộ Main App.

### Quy tắc đồng bộ KPI

KPI trong Main App và KPI tách là cùng một sản phẩm, dùng chung giao diện, logic và dữ liệu. Không được coi chúng là hai phiên bản nghiệp vụ độc lập. Khác biệt hợp lệ của KPI tách chỉ nằm ở điều hướng dành cho người dùng: không có thao tác quay lại Main App và không cho truy cập các vùng/chức năng khác của Main App.

Nguồn giao diện KPI chính là:

```text
src/app/kpi/page.tsx
```

Bản standalone là:

```text
kpi-app/src/app/page.tsx
```

Sau mỗi thay đổi KPI, chạy:

```bash
bash scripts/sync-kpi-app.sh
bash scripts/sync-kpi-app.sh --check
```

Script copy source chính sang standalone rồi áp dụng các patch hợp lệ bằng `scripts/apply-standalone-patches.js`, ví dụ:

- URL quay về Main App;
- BackButton;
- các liên kết mở Main App;
- shim AppDataContext;
- một số API đọc và asset cần cho standalone.

Không duy trì hai bản bằng cách sửa tay song song.

---

## 3. Công nghệ chính

- Next.js 16, App Router.
- React 19.
- TypeScript.
- Tailwind CSS 4 và nhiều CSS nội tuyến/chuyên biệt cho KPI.
- Prisma 6.
- PostgreSQL production.
- Vercel cho hosting/deployment.
- Supabase PostgreSQL là database production hiện hành.
- Vercel Blob cho một số file/ảnh.
- XLSX/xlsx-js-style cho import/export Excel.
- PWA cho một số bề mặt ứng dụng.

Lệnh root:

```bash
npm install
npm run dev
npm run lint
npm run build
npm start
```

KPI standalone có `package.json` riêng trong `kpi-app/`.

---

## 4. Database production

File chuẩn:

```text
src/lib/db.ts
```

Thứ tự chọn connection string:

1. `POSTGRES_PRISMA_URL` — production Supabase/Vercel integration.
2. `DATABASE_URL` nếu là PostgreSQL.
3. `DIRECT_URL` nếu `DATABASE_URL` không phải PostgreSQL.
4. cuối cùng mới thử `DATABASE_URL` và báo lỗi.

Một số comment hoặc dependency vẫn nhắc Neon vì lịch sử dự án. Không được mặc định production đang dùng Neon.

Prisma có helper `withRetry()` cho lỗi kết nối tạm thời. Khi sửa database code, giữ logic retry cho các lỗi kết nối/cold-start phù hợp.

---

## 5. Sơ đồ luồng dữ liệu tổng thể

### Luồng Data Hub

```text
Excel/CSV trên máy quản trị
  -> data-hub/index.mjs
  -> checksum theo từng nguồn
  -> POST API của Main App với token
  -> validation + source guard
  -> replace/upsert trong Supabase
  -> API đọc
  -> AppDataContext
  -> Main App/KPI tách tự làm mới
```

### Luồng Google

```text
Google Sheets được cấu hình trong Settings
  -> Main App gọi API sync Google
  -> validation + source guard
  -> Supabase
  -> API đọc
  -> AppDataContext
  -> giao diện
```

### Nguyên tắc cốt lõi

Data Hub và Google không được đồng thời làm nguồn ghi tự động cho cùng hệ thống. Chỉ một nguồn active tại một thời điểm.

---

## 6. Chọn nguồn đồng bộ độc quyền

File chuẩn:

```text
src/lib/sync-source.ts
```

Setting chính:

```text
nmc-sync-source = data-hub | google
```

Nếu chưa có setting mới, code suy ra từ setting cũ `nmc-sync-enabled`:

- `true` -> Google;
- ngược lại -> Data Hub.

`setSyncSource()` đồng bộ các cờ liên quan:

- `nmc-sync-enabled`;
- `nmc-data-hub-enabled`;
- `nmc-data-hub-saoviet-enabled`;
- `nmc-data-hub-revenue-enabled`;
- `nmc-data-hub-structure-enabled`;
- timestamp và lý do đổi nguồn.

Khi thiết kế route ghi mới, route phải xác nhận nguồn caller đang được phép ghi. Không dùng một boolean cục bộ rời rạc để bỏ qua cơ chế nguồn trung tâm.

---

## 7. NMC Data Hub

### Vai trò

Data Hub là Node process chạy trên máy quản trị, không chạy trong Vercel. Source code nằm ở:

```text
data-hub/index.mjs
data-hub/package.json
data-hub/README.md
data-hub/data-hub.config.example.json
```

Nó có ba chế độ:

```bash
npm run once       # đọc và gửi toàn bộ nguồn một lần
npm run activate   # chọn Data Hub làm nguồn active
npm start          # chạy vòng lặp liên tục
```

### Cách hoạt động

- đọc config local từ `data-hub.config.json` hoặc biến `NMC_DATA_HUB_CONFIG`;
- lấy token từ config local hoặc biến môi trường `NMC_DATA_HUB_TOKEN`;
- gửi header `x-nmc-data-hub-token`;
- gửi heartbeat trước mỗi vòng;
- nếu server báo nguồn active không phải Data Hub, process tạm dừng ghi;
- tính SHA-256 checksum dữ liệu;
- chỉ gửi lại khi checksum thay đổi, trừ chế độ `--once`;
- lưu trạng thái local vào `.nmc-data-hub-state.json`;
- mặc định kiểm tra mỗi 15 giây, tối thiểu 5 giây;
- gửi kết quả từng nguồn về `/api/data-hub/status` sau mỗi vòng.

### Heartbeat

Route:

```text
POST /api/data-hub/status
```

Settings được ghi:

- `nmc-data-hub-last-seen-at`;
- `nmc-data-hub-last-sync-at`;
- `nmc-data-hub-last-result`.

Không kết luận Data Hub online chỉ vì database có dữ liệu mới. Cần kiểm tra heartbeat gần thời điểm hiện tại hoặc kiểm tra process trên máy.

### File không được commit

- `data-hub/data-hub.config.json` thật;
- `.nmc-data-hub-state.json`;
- token;
- Excel chứa dữ liệu nghiệp vụ;
- log có dữ liệu khách hàng.

---

## 8. Nguồn Data Hub theo config mẫu

Tên file và sheet thực tế trên máy có thể khác. Config mẫu hiện mô tả:

| ID | Kind | Nguồn | Phạm vi ghi |
|---|---|---|---|
| `revenue-current` | `revenue` | `Tamthu.xlsx`, sheet `4` | thay tháng hiện tại |
| `revenue-history` | `revenue-history` | `Doanhso.xlsx`, các sheet tháng | thay các tháng lịch sử, bỏ tháng hiện tại |
| `structure-tvv` | `structure` / `tvv` | workbook cấu trúc, sheet DS TVV | mirror toàn bộ TVV |
| `structure-leaders` | `structure` / `leaders` | sheet DS TN | mirror danh sách trưởng nhóm/lãnh đạo |
| `structure-recruiters` | `structure` / `recruiters` | sheet DS TTN | mirror danh sách tuyển dụng |
| `structure-clb-members` | `structure` / `clb-members` | sheet thành viên CLB | mirror CLB |
| `structure-tuyen-ngang` | `structure` / `tuyen-ngang` | sheet TTN tuyển ngang | mirror tuyển ngang |
| `saoviet-ca-nhan` | `saoviet` / `ca-nhan` | workbook Sao Việt, sheet TVV | thay chương trình cá nhân |
| `saoviet-tn-ktm` | `saoviet` / `tn-ktm` | sheet Nhom | thay chương trình TN KTM |
| `saoviet-tn-td` | `saoviet` / `tn-td` | sheet NhomTD | thay chương trình TN tuyển dụng |

### Doanh số tháng hiện tại

Data Hub gửi:

```json
{
  "source": "nmc-data-hub",
  "replaceCurrentRevenueMonth": true
}
```

Route `/api/sync` phải xác định tháng hiện tại theo timezone nghiệp vụ, validate dữ liệu, tránh nguồn rỗng xóa dữ liệu đúng và thay đúng phạm vi.

### Doanh số lịch sử

Data Hub đọc các sheet tên số tháng từ 1 đến 12, bỏ sheet tháng hiện tại vì tháng hiện tại thuộc Tamthu. Nó gửi danh sách tháng cần thay bằng `replaceHistoricalRevenueMonths`.

### Cấu trúc

Route `/api/structure/sync` nhận `collection`:

- `tvv`;
- `leaders`;
- `recruiters`;
- `clb-members`;
- `tuyen-ngang`.

Đây là mirror/replace, không phải append. Nguồn rỗng không được xóa toàn bộ dữ liệu trừ khi có cơ chế rõ ràng và được người dùng yêu cầu.

### Sao Việt

Các program hợp lệ:

- `ca-nhan`;
- `tn-ktm`;
- `tn-td`.

Các chương trình được thay theo nguồn chuẩn, không cộng dồn bản cũ.

---

## 9. AppDataContext và làm mới dữ liệu

File:

```text
src/lib/app-data-context.tsx
```

Nó preload:

- leaders;
- revenue;
- contracts;
- staff;
- recruiters;
- tuyen-ngang;
- cấu trúc phòng/AD/ban nhóm/TVV;
- CLB members;
- pending members;
- dữ liệu quản lý tổng hợp;
- settings;
- contests.

### Endpoint đọc lớn

`/api/quan-ly/all` là nguồn đọc chung cho các bảng lớn như contracts/revenue/staff/leaders, tránh fetch trùng.

### Cache và refresh

- session cache key: `nmc-app-data-v3`;
- TTL khoảng 60 giây;
- app tải một lần khi mount;
- tự refresh nền mỗi 60 giây khi tab visible;
- refresh khi focus hoặc visibility change;
- nếu refresh lỗi, giữ dữ liệu đang hiển thị;
- Setting đăng ký mục tiêu được kiểm tra riêng mỗi 4 giây và qua BroadcastChannel/storage event.

### Google trong AppDataContext

`syncPrimaryGoogleSources()` chỉ chạy khi:

```text
settings['nmc-sync-source'] === 'google'
```

Trong kiến trúc hiện tại:

- doanh số/tạm thu không fallback Google;
- Sao Việt Google có thể sync nếu Data Hub Sao Việt không được bật và link tồn tại.

Một số comment cũ trong file còn nói “doanh số tháng 7”; phải đọc logic thực, không tin tuyệt đối comment lịch sử.

### Điểm cần phân biệt

Giao diện tự refresh từ Supabase mỗi 60 giây không có nghĩa Excel local tự đồng bộ. Excel chỉ lên Supabase khi Data Hub đang chạy, source đang là Data Hub, token/config đúng và source được định nghĩa.

---

## 10. API và file trọng yếu

### Đồng bộ và nguồn

- `src/lib/sync-source.ts`
- `src/lib/data-hub-auth.ts`
- `src/app/api/sync-source/route.ts`
- `src/app/api/data-hub/activate/route.ts`
- `src/app/api/data-hub/status/route.ts`
- `src/app/api/sync/route.ts`
- `src/app/api/saoviet-data/sync/route.ts`
- `src/app/api/saoviet-data/sync-all/route.ts`
- `src/app/api/structure/sync/route.ts`

### Dữ liệu và context

- `src/lib/db.ts`
- `prisma/schema.prisma`
- `src/lib/app-data-context.tsx`
- `src/app/api/quan-ly/all/route.ts`
- `src/app/api/settings/route.ts`

### KPI

- `src/app/kpi/page.tsx`
- `src/app/kpi/template.tsx`
- `kpi-app/src/app/page.tsx`
- `kpi-app/src/lib/app-data-context.tsx`
- `scripts/sync-kpi-app.sh`
- `scripts/apply-standalone-patches.js`
- `.github/workflows/sync-kpi-app.yml`

### Thi đua

- `src/app/thi-dua-chau/page.tsx`
- `src/lib/contest-calculator.ts`
- `src/components/saved-contest-inline.tsx`

---

## 11. Yêu cầu sản phẩm đã được xác lập

### 11.1 KPI

- KPI trong Main App và KPI tách là một sản phẩm; mọi thay đổi giao diện, logic và dữ liệu phải được thực hiện từ cùng nguồn rồi đồng bộ.
- KPI tách chỉ khác về điều hướng: không có thao tác quay lại hoặc đi vào các vùng khác của Main App.
- Khi người dùng yêu cầu sửa KPI, phải sửa/kiểm tra cả Main App và standalone.
- Standalone chỉ đọc.
- Không được xuất hiện chức năng admin của Main App trên standalone.
- Giao diện desktop không bị phá khi sửa mobile.
- Mobile không cuộn ngang.
- Các khối cố định không được che phần nội dung đầu tiên.
- Băng rol thông báo phải dễ đọc.
- Bản cập nhật ngày 2026-08-03:
  - nền băng thông báo vàng rõ hơn;
  - chỉ mobile: phần từ tiêu đề đến hết băng thông báo được ghim ở đầu khi cuộn;
  - trang chi tiết không bị áp dụng ghim này.

### 11.2 Thi đua

Kết quả hiện cần tuân thủ:

- luôn liệt kê toàn bộ TVV đủ điều kiện, kể cả không có hợp đồng hoặc kết quả bằng 0;
- chỉ ẩn nhóm chưa đạt khi người dùng bật “ẩn TVV chưa đạt”;
- với kết quả 0, PA phải nằm sau non-PA;
- logic placeholder 0 phải dùng cấu trúc TVV đủ điều kiện, không chỉ dùng TVV có hợp đồng;
- saved contest cũng phải nhận cấu trúc TVV;
- mã PA thực tế có trường hợp `U104101014`.

Khi chỉnh sorting, không chỉ nhìn doanh số; phải giữ các tie-breaker nghiệp vụ.

### 11.3 Danh sách khách hàng và quay số sự kiện

Các yêu cầu lịch sử quan trọng:

- desktop là một khung cố định, không cuộn ngang;
- header cố định;
- cột tên khách hàng/TVV phải đủ rộng, hạn chế wrap ngoài Quà tặng/Ghi chú;
- mobile ẩn logo/tên chương trình khi được yêu cầu và giữ các summary box cố định;
- remote header cố định khi cuộn;
- remote cập nhật tức thời;
- popup ảnh có hai ảnh điều khiển độc lập;
- danh sách và danh sách người thắng auto-scroll mượt;
- vòng quay bắt đầu/dừng mượt và dừng chính xác giữa tên người thắng;
- zoom trình duyệt 100% phải căn đúng;
- không để giao diện tạo cảm giác kết quả được sắp đặt;
- export Excel phải đúng mẫu nghiệp vụ người dùng đã cung cấp;
- kết quả quay và lịch sử không nhất thiết phải backup lâu dài, nhưng danh sách đăng ký theo sự kiện cần lưu và tải lại được.

### 11.4 Tính minh bạch nguồn dữ liệu

Khi người dùng hỏi dữ liệu lấy từ đâu:

- trả lời theo từng dataset;
- phân biệt source-of-truth với nơi giao diện đọc;
- phân biệt sync file -> DB với refresh DB -> UI;
- nêu nguồn active, heartbeat, last sync và lỗi gần nhất nếu có;
- không khẳng định process Windows đang chạy nếu chưa kiểm tra máy hoặc heartbeat;
- không dùng timestamp dữ liệu để thay cho bằng chứng heartbeat.

---

## 12. Audit lịch sử dữ liệu ngày 2026-08-03

Phần này là ảnh chụp lịch sử trước khi cơ chế nguồn độc quyền/heartbeat được hoàn thiện. Không coi đây là trạng thái hiện tại nếu chưa kiểm tra lại.

### Sao Việt

Ở thời điểm audit cũ:

- Google shared sheet đang cung cấp ba chương trình;
- `ca-nhan`: 278 dòng;
- `tn-ktm`: 30 dòng;
- `tn-td`: 30 dòng;
- sync được kích hoạt bởi AppDataProvider khi app mở/visible, chưa phải cron server.

Kiến trúc mới đã có `nmc-sync-source`; cần kiểm tra source active trước khi áp dụng kết luận cũ.

### Doanh số lịch sử tháng 1–7/2026

Audit cũ ghi nhận 927 dòng tổng cộng, các tháng được import theo batch có cùng timestamp. Mẫu này phù hợp mạnh với full replace từ Data Hub/Doanhso, nhưng schema không có cột audit source ở từng row nên không thể chứng minh tuyệt đối sau khi ghi.

### Tháng 8/2026

Audit cũ chỉ thấy một hợp đồng và trạng thái tự động chưa được xác nhận. Không dùng thông tin này làm trạng thái hiện tại.

### Cấu trúc

Audit cũ ghi nhận snapshot:

- TVVStruct: 1.226;
- LeaderInfo: 29;
- Recruiter: 57;
- ClbMember: 59;
- TuyenNgang: 24.

Đây chỉ là số liệu lịch sử. Luôn query production trước khi báo hiện tại.

---

## 13. Các mâu thuẫn/tồn đọng đã biết

1. README gốc nói Neon nhưng runtime hiện ưu tiên Supabase.
2. Một số comment vẫn nhắc doanh số tháng 7 hoặc Neon; logic hiện tại đã thay đổi.
3. Config Data Hub thật nằm ngoài GitHub; cloud không tự biết đường dẫn local hoặc Windows process nếu heartbeat không hoạt động.
4. `data-hub.config.example.json` chỉ là mẫu. Không mặc định sheet/path thật giống mẫu.
5. Main App và KPI tách có thể lệch nếu ai đó sửa KPI mà không chạy script sync.
6. Vercel deploy thành công không chứng minh luồng dữ liệu local đang chạy.
7. Build pass không chứng minh giao diện mobile đúng; cần kiểm tra trực quan.
8. Dữ liệu mirror có thể xóa phạm vi lớn nếu input sai; validation nguồn rỗng là bắt buộc.
9. Repo public, trong lịch sử có thể có file tool-results/log không nên dùng làm nguồn chuẩn.

---

## 14. Cách Codex tiếp quản trên máy tính

Khi mở repository local lần đầu, Codex nên:

1. đọc `AGENTS.md`;
2. đọc tài liệu này;
3. chạy `git status` và `git log -5 --oneline`;
4. xác minh remote/branch;
5. chạy `npm install` nếu dependencies chưa có;
6. chạy `npm run lint` và `npm run build`;
7. chạy `bash scripts/sync-kpi-app.sh --check`;
8. build `kpi-app`;
9. kiểm tra file `data-hub/data-hub.config.json` có tồn tại local nhưng không bị track;
10. kiểm tra process Data Hub và Windows Scheduled Task nếu nhiệm vụ liên quan đồng bộ;
11. kiểm tra source active/heartbeat trước khi thay dữ liệu;
12. chỉ sau đó mới sửa mã.

---

## 15. Quy trình thay đổi an toàn

### Thay đổi giao diện

- tìm CSS/component đúng phạm vi;
- ưu tiên selector cụ thể;
- tránh `!important` mới nếu có thể;
- nếu buộc dùng, ghi rõ lý do;
- test breakpoint mobile và desktop;
- kiểm tra sticky/fixed với overflow ancestors;
- kiểm tra safe area và viewport;
- xác minh không che modal/dropdown.

### Thay đổi logic dữ liệu

- vẽ phạm vi đọc/ghi;
- xác định source guard;
- validate input;
- kiểm tra transaction;
- giữ idempotency;
- xem xét duplicate/null contract number;
- kiểm tra timezone tháng hiện tại;
- không trộn issueDate/effectiveDate tùy tiện;
- thử với dữ liệu rỗng, trùng và lỗi header.

### Thay đổi KPI

- sửa source main;
- chạy sync standalone;
- xem diff;
- build cả hai;
- kiểm tra Main App và standalone;
- giữ link standalone quay về Main App đúng cách.

### Thay đổi Data Hub

- không ghi token vào code;
- duy trì pause khi Google active;
- duy trì heartbeat kể cả không có file thay đổi;
- checksum phải ổn định;
- không xóa DB khi nguồn đọc lỗi hoặc rỗng;
- báo lỗi theo source;
- kiểm tra `--once`, `--activate` và vòng lặp.

---

## 16. Tiêu chuẩn hoàn tất

Một thay đổi chỉ được xem là hoàn tất khi có bằng chứng phù hợp:

- diff đúng phạm vi;
- lint/build/test pass hoặc nêu rõ lỗi có sẵn;
- KPI sync check pass nếu liên quan;
- deployment Vercel READY nếu đã merge production;
- URL production trả 200;
- giao diện trực quan đã kiểm tra nếu là CSS/layout;
- source/heartbeat đã kiểm tra nếu là dữ liệu;
- không có secret hoặc file local bị commit;
- báo cáo cho người dùng bằng tiếng Việt, nêu chính xác điều đã làm và chưa làm.

---

## 17. Hướng phát triển hợp lý tiếp theo

Các bước nâng độ tin cậy được ưu tiên:

1. trang “Trạng thái dữ liệu” hiển thị source active, Data Hub online/offline, last seen, last sync, kết quả từng nguồn và số dòng;
2. audit metadata theo dataset/source thay vì chỉ settings chung;
3. cảnh báo stale data;
4. health endpoint dành cho Data Hub;
5. test tự động cho replace current month/history/structure;
6. CI bắt buộc `sync-kpi-app.sh --check`;
7. loại bỏ comment/README cũ về Neon và doanh số tháng 7;
8. làm sạch file tool-results/log khỏi repository nếu không còn cần;
9. tài liệu migration/rollback database;
10. smoke test tự động cho Main App và KPI tách sau deploy.

Không tự triển khai các bước này trong một nhiệm vụ khác nếu chưa có phạm vi rõ ràng, nhưng dùng chúng để đánh giá kiến trúc và rủi ro.
