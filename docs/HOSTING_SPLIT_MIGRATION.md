# Tách nền tảng NC-Link và KPI

## Kiến trúc đích

- **NC-Link Main App:** Google Cloud Run, build từ `Dockerfile` ở thư mục gốc.
- **KPI standalone:** Cloudflare Workers, build từ thư mục `kpi-app` bằng OpenNext.
- Hai trang dùng chung một kho GitHub nhưng triển khai độc lập. KPI không giữ thông tin kết nối cơ sở dữ liệu; API được chuyển tiếp đến NC-Link.

## Biến môi trường

### NC-Link / Cloud Run

Giữ nguyên các biến production hiện tại, tối thiểu gồm:

- `POSTGRES_PRISMA_URL`
- `DATABASE_URL` hoặc `DIRECT_URL` nếu môi trường hiện tại có dùng
- `NMC_DATA_HUB_IMPORT_TOKEN`
- `NMC_ADMIN_PASSWORD`
- `NMC_ADMIN_SESSION_SECRET`
- Các biến Blob/Object Storage đang dùng cho poster và tệp

Không ghi giá trị bí mật vào GitHub.

### KPI / Cloudflare Workers

- `NEXT_PUBLIC_MAIN_APP_URL`: URL HTTPS chính thức của NC-Link trên Cloud Run. Biến này phải có ngay lúc build.
- `NMC_MAIN_APP_URL`: cùng URL trên, dùng bởi API proxy phía server.

KPI không được cấu hình `POSTGRES_PRISMA_URL` hoặc các bí mật của Main App.

## Kiểm tra trước khi triển khai

```bash
bash scripts/sync-kpi-app.sh --check
NEXT_OUTPUT_STANDALONE=1 npm run build

cd kpi-app
npm run cf:build
npx wrangler deploy --dry-run
```

## Kiểm tra sau khi triển khai

1. NC-Link: `/`, `/kpi`, `/quan-ly` và `/api/health` phản hồi đúng.
2. KPI: trang chính mở được, dữ liệu đọc từ NC-Link và các trang Chính sách/Thi đua/CLB tải đúng.
3. Thử ghi Kế hoạch khung và đăng ký mục tiêu; các API ghi khác từ KPI phải bị từ chối.
4. Chỉ chuyển tên miền/alias sau khi cả hai bản đã qua kiểm tra trực tiếp.

