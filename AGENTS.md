# AGENTS.md — NMC Link Manager

Tài liệu này là chỉ dẫn bắt buộc cho Codex khi làm việc trong repository `NMCDesignapp/nmc-link-manager`.

## 1. Bắt đầu mỗi phiên làm việc

Trước khi sửa mã:

1. Đọc `docs/CODEX_HANDOFF.md` và `docs/CODEX_OPERATIONS.md`.
2. Chạy `git status`, xác định branch hiện tại và kiểm tra thay đổi chưa commit.
3. Đọc đúng file đang điều khiển tính năng; không suy đoán từ README cũ.
4. Xác định thay đổi có ảnh hưởng Main App, KPI trong Main App, KPI tách, Data Hub hay dữ liệu production hay không.
5. Với yêu cầu giao diện, giữ nguyên logic dữ liệu trừ khi người dùng yêu cầu thay đổi logic.

Trao đổi với người dùng bằng tiếng Việt, trực tiếp, nêu rõ phần đã sửa, phần đã kiểm tra và điều chưa thể xác minh.

## 2. Vai trò của các bản triển khai

- Repository: `NMCDesignapp/nmc-link-manager`.
- Main App production: `https://nc-link.vercel.app`.
- KPI trong Main App: `https://nc-link.vercel.app/kpi`.
- KPI tách production: `https://angiang2026.vercel.app` và `https://angiang2026-nhom.vercel.app`.
- Vercel Main App dùng project `my-project`.
- Vercel KPI tách dùng project `kpi-nc-link`, Root Directory là `kpi-app`.
- Main App là nơi quản trị và nguồn điều khiển chính.
- KPI tách là bản công khai, chỉ đọc; không được làm lộ chức năng quản trị, sidebar, API ghi hoặc luồng điều hướng nội bộ của Main App.

Khi người dùng nói “chỉnh KPI”, mặc định phải kiểm tra cả:

1. `src/app/kpi/page.tsx` của Main App.
2. `kpi-app/src/app/page.tsx` của KPI tách.

Sau khi sửa KPI nguồn, chạy:

```bash
bash scripts/sync-kpi-app.sh
bash scripts/sync-kpi-app.sh --check
```

Không sửa tay hai bản độc lập rồi để chúng lệch nhau. Các khác biệt standalone hợp lệ phải đi qua `scripts/apply-standalone-patches.js` hoặc shim riêng của `kpi-app`.

## 3. Nguồn dữ liệu và database

Production dùng Supabase PostgreSQL thông qua biến `POSTGRES_PRISMA_URL`. `DATABASE_URL` và `DIRECT_URL` chỉ là fallback. Không mặc định production đang dùng Neon dù README cũ hoặc một số comment còn nhắc Neon.

File chuẩn: `src/lib/db.ts`.

Luồng dữ liệu chính:

```text
Excel trên máy quản trị
  -> NMC Data Hub chạy local
  -> API ghi của Main App
  -> Supabase PostgreSQL
  -> API đọc / AppDataContext
  -> Main App và KPI tách
```

Google Sheets là nguồn thay thế, không phải nguồn chạy song song. Nguồn tự động hiện được điều khiển bởi Setting `nmc-sync-source` với hai giá trị:

- `data-hub`
- `google`

File chuẩn: `src/lib/sync-source.ts`.

Không tạo cơ chế cho Data Hub và Google cùng ghi một tập dữ liệu. API ghi phải kiểm tra đúng nguồn được chọn.

## 4. NMC Data Hub

Data Hub nằm trong `data-hub/` nhưng chạy trên máy quản trị. Nó:

- đọc Excel/CSV;
- tính checksum;
- chỉ gửi nguồn thay đổi;
- gửi heartbeat và kết quả đồng bộ;
- dừng ghi khi Google đang là nguồn được chọn;
- dùng header token `x-nmc-data-hub-token`.

Các nguồn mẫu trong `data-hub/data-hub.config.example.json`:

- doanh số tháng hiện tại từ `Tamthu.xlsx`;
- doanh số lịch sử từ các sheet tháng trong `Doanhso.xlsx`, bỏ tháng hiện tại;
- cấu trúc TVV, DS TN, DS TTN, thành viên CLB, TTN tuyển ngang từ workbook cấu trúc;
- Sao Việt cá nhân, TN KTM, TN tuyển dụng từ workbook Sao Việt.

Không commit:

- `data-hub.config.json` thật;
- `.nmc-data-hub-state.json`;
- token;
- file Excel khách hàng;
- đường dẫn máy cá nhân nếu không cần thiết.

Repository này là public. Tuyệt đối không đưa secret, connection string, dữ liệu khách hàng, số hợp đồng, số điện thoại hoặc thông tin nhận dạng cá nhân vào commit, issue, PR hay tài liệu.

## 5. Cơ chế làm mới giao diện

`src/lib/app-data-context.tsx` là bộ tải dữ liệu toàn cục:

- cache session khoảng 60 giây;
- tự tải lại dữ liệu nền mỗi 60 giây khi tab đang hiển thị;
- làm mới khi focus/visibility thay đổi;
- Setting mở/khóa đăng ký mục tiêu được kiểm tra nhẹ mỗi 4 giây;
- nếu `nmc-sync-source=google`, AppDataContext có thể gọi đồng bộ Sao Việt Google trước khi đọc DB;
- doanh số không được fallback về Google khi đã chuyển sang Data Hub.

Phân biệt rõ:

- “giao diện tự làm mới từ DB” không đồng nghĩa “file Excel đang tự đồng bộ lên DB”;
- việc đồng bộ Excel cần Data Hub local đang chạy, được cấu hình đúng và gửi heartbeat.

## 6. Quy tắc thay đổi dữ liệu

Trước mọi thao tác có thể xóa/thay thế dữ liệu production:

1. Đọc route API thực tế.
2. Xác nhận nguồn đang active.
3. Kiểm tra dữ liệu đầu vào không rỗng và không lỗi header.
4. Hiểu phạm vi xóa: tháng hiện tại, các tháng lịch sử hay toàn bộ collection.
5. Không chạy lệnh phá hủy chỉ để “thử”.
6. Không thay đổi schema production nếu chưa có kế hoạch migration và rollback.

Data Hub dùng kiểu mirror/replace cho nhiều nguồn. Không chuyển thành cộng dồn nếu chưa hiểu nghiệp vụ.

## 7. Yêu cầu nghiệp vụ quan trọng

### KPI

- Main App và KPI tách phải đồng bộ về giao diện và logic.
- KPI tách luôn giữ chế độ công khai, chỉ đọc.
- Mobile phải ưu tiên bố cục cố định, không tràn ngang, không che nội dung.
- Phần tiêu đề + chọn kỳ + băng thông báo trên màn hình chính mobile hiện được ghim khi cuộn.
- Nền băng thông báo hiện dùng vàng rõ hơn; không làm nhạt lại nếu không có yêu cầu mới.
- Khi sửa responsive, kiểm tra desktop và mobile; không dùng thay đổi toàn cục để chữa riêng mobile.

### Thi đua

- Kết quả phải có toàn bộ TVV đủ điều kiện, kể cả chưa có doanh số/0 doanh số, trừ khi bật “ẩn TVV chưa đạt”.
- TVV PA có kết quả 0 phải xếp sau TVV không phải PA có kết quả 0.
- Mã cấu trúc PA thực tế đã có trường hợp `U104101014`; đừng suy đoán PA chỉ từ nhãn hiển thị.
- Logic hiện tại nằm chủ yếu trong `src/app/thi-dua-chau/page.tsx`, `src/lib/contest-calculator.ts` và `src/components/saved-contest-inline.tsx`.

### Quay số và sự kiện

Khi chạm vào module quay số/danh sách sự kiện:

- vòng quay phải dừng đúng tâm tên người thắng, không dừng giữa hai tên;
- chuyển động phải mượt, tăng tốc/giảm tốc tự nhiên;
- giao diện ở zoom 100% phải căn giữa;
- danh sách cuộn tự động không giật;
- không tạo hành vi khiến người xem nghi ngờ kết quả được sắp đặt;
- remote phải cập nhật tức thời;
- thay đổi export Excel phải giữ đúng mẫu nghiệp vụ.

### Dữ liệu và trạng thái nguồn

Người dùng cần biết rõ dữ liệu đến từ đâu và có tự động hay không. Khi báo trạng thái:

- không khẳng định Data Hub local đang chạy nếu chưa có heartbeat hoặc bằng chứng trên máy;
- nêu rõ timestamp và nguồn kiểm tra;
- trạng thái DB mới không chứng minh file Excel local đang được theo dõi;
- thay đổi file trên máy không có tác dụng nếu Data Hub không chạy hoặc nguồn Google đang active.

## 8. Quy trình sửa mã

Ưu tiên quy trình:

```text
main mới nhất
  -> feature/docs branch
  -> thay đổi tối thiểu
  -> lint/build/test
  -> đồng bộ kpi-app nếu liên quan
  -> xem diff
  -> PR
  -> merge main
  -> kiểm tra cả hai deployment production
```

Không force-push `main`. Không ghi đè thay đổi chưa rõ nguồn gốc. Không sửa file generated/build artifact nếu source tương ứng tồn tại.

Lệnh kiểm tra cơ bản:

```bash
npm install
npm run lint
npm run build

bash scripts/sync-kpi-app.sh --check
cd kpi-app
npm install
npm run build
```

Với thay đổi nhỏ chỉ CSS/template, vẫn phải kiểm tra build của project bị ảnh hưởng.

## 9. Khi tài liệu và mã không khớp

Thứ tự tin cậy:

1. Mã trên branch/commit đang làm việc.
2. Schema và route API hiện tại.
3. `docs/CODEX_HANDOFF.md`.
4. `data-hub/README.md`.
5. README gốc và comment lịch sử.

Nếu thấy mâu thuẫn, không tự “sửa cho hợp lý”. Ghi lại mâu thuẫn, kiểm tra runtime/production rồi cập nhật tài liệu cùng commit.

## 10. Hoàn tất một nhiệm vụ

Báo cáo phải có:

- file đã sửa;
- logic đã thay đổi;
- lệnh kiểm tra đã chạy và kết quả;
- Main App/KPI tách có bị ảnh hưởng không;
- deployment nào đã xác minh;
- điều gì chưa thể xác minh trên máy local hoặc production.

Không nói đã deploy, đã đồng bộ, đã active hoặc đã sửa dữ liệu nếu chưa có bằng chứng trực tiếp.