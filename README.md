# KPI An Giang — NMC Link Manager

Ứng dụng quản lý và theo dõi số liệu kinh doanh, KPI, thi đua và các nghiệp vụ liên quan.

## Production

- URL duy nhất: https://nc-link.onrender.com
- Hosting: Render Web Service `angiang2026`
- Source: repository root, branch `main`
- Build: Dockerfile `./Dockerfile` (Node.js 22, Next.js standalone)
- Deploy: Render tự động triển khai khi có commit mới trên `main`
- KPI: nằm trong cùng ứng dụng tại `/kpi`

Không có deployment production riêng trên Vercel, Cloudflare Workers hoặc Netlify. Không tạo thêm bản ứng dụng KPI độc lập.

## Chạy local

```bash
npm ci
npm run dev
```

Mở http://localhost:3000.

## Kiểm tra trước khi phát hành

```bash
npm run lint
npm run build
```

## Cấu trúc chính

- `src/app`: trang và API routes của ứng dụng.
- `src/components`: thành phần giao diện dùng chung.
- `src/lib`: nghiệp vụ, dữ liệu và tích hợp.
- `public`: tài nguyên tĩnh.
- `prisma`: schema cơ sở dữ liệu.
- `data-hub`: công cụ đồng bộ dữ liệu chạy riêng trên máy quản trị; không phải web service thứ hai.

## Lưu ý an toàn

Không commit secrets, connection strings, token, file Excel nghiệp vụ hoặc dữ liệu nhận dạng cá nhân. Không thay đổi database production hoặc biến môi trường Render khi chưa xác minh tác động và phương án khôi phục.
