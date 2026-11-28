# Hướng dẫn chuyển app sang Render service/domain khác

Tài liệu này áp dụng cho repo `NMCDesignapp/nmc-link-manager`. Mục tiêu là tạo
Render Web Service mới nhưng vẫn giữ database, dữ liệu, link nội bộ và Data Hub.

> Không commit mật khẩu, token hoặc connection string. Nhập secret trong Render
> Dashboard.

## 1. Cấu hình service

- Repository: `NMCDesignapp/nmc-link-manager`.
- Branch: `main`.
- Runtime: **Docker**.
- Dockerfile: `./Dockerfile`, context là thư mục gốc repo.
- Port: `8080` (đã đặt trong `Dockerfile`).
- Health check: `/api/health`.
- Region: nên chọn cùng region với database; service hiện tại dùng Singapore.
- Bật Auto-Deploy nếu muốn commit mới trên `main` tự deploy.
- `data-hub/` chạy trên máy quản trị, không tạo thành Render web service thứ hai.

Repo có `render.yaml` làm mẫu Blueprint. Trước khi dùng Blueprint, đổi `name`
thành tên service mới và kiểm tra database/env; không Apply nếu chưa chắc chắn
service đang dùng đúng database production.

## 2. Biến môi trường phải sao chép

Nhập tại Render → **Environment**, lấy giá trị từ service cũ một cách an toàn:

| Biến | Mục đích |
|---|---|
| `POSTGRES_PRISMA_URL` | Kết nối PostgreSQL chính; app ưu tiên biến này |
| `POSTGRES_URL_NON_POOLING` | Kết nối direct/non-pooling cho Prisma/migration khi cần |
| `NMC_ADMIN_PASSWORD` | Mật khẩu quản trị |
| `NMC_ADMIN_SESSION_SECRET` | Ký session; nên giữ nguyên khi chuyển service |
| `NMC_DATA_HUB_IMPORT_TOKEN` | Token để Data Hub gọi API import |
| `NEXT_PUBLIC_MAIN_APP_URL` | URL public/canonical mới |

`src/lib/db.ts` ưu tiên `POSTGRES_PRISMA_URL`, sau đó fallback sang
`DATABASE_URL`/`DIRECT_URL`. Nếu muốn giữ dữ liệu cũ, không tạo connection string
trỏ sang database mới.

## 3. Các file phải chỉnh khi đổi domain

### `src/app/kpi/page.tsx`

Tìm hằng số `MAIN_APP_URL` và đổi sang domain mới. Hàm `buildMainUrl()` dùng giá
trị này để mở `/quan-ly` từ KPI.

```ts
const MAIN_APP_URL = 'https://domain-moi.onrender.com';
```

### `src/lib/contest-communication.ts`

Đổi `MAIN_APP_ORIGIN`. Giá trị này tạo URL chương trình thi đua và link chia sẻ:

```ts
export const MAIN_APP_ORIGIN = 'https://domain-moi.onrender.com';
```

### `scripts/apply-render-origin-fix.js`

Đổi hằng số `CANONICAL` sang domain mới. Script này chạy trong build và có thể
ghi URL canonical vào `src/app/kpi/page.tsx`; nếu bỏ qua bước này, build có thể
đưa URL cũ quay lại.

### Rà soát toàn repo

```powershell
rg -n "onrender.com|vercel.app|NEXT_PUBLIC_BASE_URL|NEXT_PUBLIC_MAIN_APP_URL" src scripts render.yaml README.md
```

Kiểm tra đặc biệt `scripts/migrate-posters-to-bytea.js`,
`scripts/verify-clb-sv-match.js` và các file trong `src/lib/`. Chỉ đổi URL dùng
cho link public, không đổi URL dịch vụ bên ngoài.

### `README.md`

Cập nhật URL production và tên Render service để người vận hành sau này không
nhầm service cũ với service mới.

## 4. Database/Prisma

1. Xác nhận `POSTGRES_PRISMA_URL` của service mới trỏ đúng database cũ.
2. Không dùng `prisma db push`, reset database hoặc xóa migration trên production.
3. Schema nằm ở `prisma/schema.prisma`; migration nằm ở `prisma/migrations/`.
4. Sau deploy kiểm tra `https://domain-moi/api/health` và log Render.
5. Migration mới của Chi tiết Tạm thu là
   `prisma/migrations/20261128090000_add_tamthu_detail_month/migration.sql`.

Endpoint `/api/tamthu-detail` có lớp tương thích tự bảo đảm cột tháng tồn tại,
nhưng migration vẫn phải được quản lý trong quy trình database chuẩn.

## 5. Chuyển custom domain không gián đoạn

1. Tạo service mới nhưng chưa đổi DNS.
2. Deploy thử bằng URL `*.onrender.com` mới.
3. Đổi các URL canonical ở mục 3 rồi deploy lại.
4. Thêm custom domain vào service mới và cấu hình DNS theo hướng dẫn Render.
5. Chờ HTTPS/TLS hoạt động.
6. Kiểm tra ẩn danh rồi mới tắt service cũ.

Render không tự redirect domain cũ sang service mới chỉ vì tạo service mới. Nếu
cần giữ link cũ, phải giữ service/proxy cũ để trả redirect 301/308 hoặc cấu hình
redirect tại lớp proxy đang quản lý domain cũ.

## 6. URL cần kiểm tra sau chuyển

- `/`, `/kpi`, `/quan-ly`, `/thi-dua-chau`.
- `/api/health`.
- `/c/<id>` và các link chương trình thi đua đã tạo.
- iframe KPI mở `/quan-ly?sheet=...&from=kpi`.
- Data Hub trên máy quản trị gọi đúng domain/token mới.

## 7. Kiểm tra trước khi deploy

```powershell
npm ci
npm run lint
npm run build
git diff --check
git remote -v
git status
```

Không commit `.env`, `.env.local`, secret, connection string, file Excel nghiệp
vụ hoặc dữ liệu cá nhân.

## 8. Kiểm tra sau deploy

- Deploy đạt trạng thái **Live**, không có lỗi build/runtime 500.
- `/api/health` báo database OK.
- KPI mở được và dữ liệu tổng quan đúng.
- Chính sách đổi tháng đúng kỳ và file Excel đúng tháng chọn.
- Chi tiết Tạm thu hiển thị tháng hiện tại, tháng `PH` lịch sử và HĐ tồn.
- Data Hub đồng bộ thử thành công.

## 9. Rollback

Không xóa database. Nếu service mới lỗi, giữ hoặc trỏ domain về service cũ,
rollback deploy về commit ổn định, giữ nguyên `NMC_ADMIN_SESSION_SECRET`, và ghi
lại commit/deploy gây lỗi trước khi sửa tiếp.

## 10. Checklist nhanh

- [ ] Docker, Dockerfile `./Dockerfile`, port `8080`.
- [ ] Health check `/api/health`.
- [ ] Dùng đúng database cũ.
- [ ] Sao chép đủ env và không lộ secret.
- [ ] Đổi `MAIN_APP_URL`.
- [ ] Đổi `MAIN_APP_ORIGIN`.
- [ ] Đổi `CANONICAL` trong `apply-render-origin-fix.js`.
- [ ] Rà soát fallback URL bằng `rg`.
- [ ] Test URL Render mới trước khi đổi DNS.
- [ ] Cập nhật custom domain và kiểm tra link/Data Hub.
