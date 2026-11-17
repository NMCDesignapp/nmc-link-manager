# Kiến trúc production NC-Link và KPI

## Trạng thái chính thức từ 17/11/2026

- **NC-Link Main App:** Vercel project `nc-link`, URL `https://nc-link.vercel.app`.
- **KPI standalone:** Cloudflare Worker `kpi-nc-link`, URL `https://kpi-nc-link.chaunm2312.workers.dev`, build từ thư mục `kpi-app` bằng OpenNext.
- Hai trang dùng chung một kho GitHub nhưng triển khai độc lập. KPI không giữ thông tin kết nối cơ sở dữ liệu; API được chuyển tiếp đến NC-Link.
- Đây là kiến trúc production chính thức, không phải thử nghiệm hay kế hoạch chuyển đổi.
- Không dùng lại hai alias KPI Vercel cũ làm đích production.

## Biến môi trường

### NC-Link / Vercel

Giữ nguyên các biến production hiện tại, tối thiểu gồm:

- `POSTGRES_PRISMA_URL`
- `DATABASE_URL` hoặc `DIRECT_URL` nếu môi trường hiện tại có dùng
- `NMC_DATA_HUB_IMPORT_TOKEN`
- `NMC_ADMIN_PASSWORD`
- `NMC_ADMIN_SESSION_SECRET`
- Các biến Blob/Object Storage đang dùng cho poster và tệp

Không ghi giá trị bí mật vào GitHub.

### KPI / Cloudflare Workers

- `NEXT_PUBLIC_MAIN_APP_URL`: `https://nc-link.vercel.app`. Biến này phải có ngay lúc build.
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

1. NC-Link trên Vercel: `/`, `/kpi`, `/quan-ly` và `/api/health` phản hồi đúng.
2. KPI trên Cloudflare: trang chính mở được, dữ liệu đọc từ NC-Link và các trang Chính sách/Thi đua/CLB tải đúng.
3. Thử ghi Kế hoạch khung và đăng ký mục tiêu; các API ghi khác từ KPI phải bị từ chối.
4. Không chuyển KPI về Vercel hoặc đổi Worker/URL production nếu chưa có yêu cầu mới rõ ràng của người dùng.

