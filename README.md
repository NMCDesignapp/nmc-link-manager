# N.M.C - Link Management App

Ứng dụng quản lý và tổng hợp liên kết với giao diện neon/cyberpunk.

## Tính năng

- Quản lý liên kết web (thêm, sửa, xóa)
- Upload file (hình ảnh, video, tài liệu)
- Phân loại theo danh mục
- Đánh dấu yêu thích
- Thống kê & phân tích
- Xuất dữ liệu JSON/CSV
- Xem trước trang web trong iframe
- Giao diện neon/cyberpunk với hiệu ứng đẹp mắt
- PWA support
- Cài đặt tùy chỉnh (màu neon, tốc độ hiệu ứng, v.v.)

## Công nghệ

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: Prisma ORM (SQLite local / PostgreSQL on Vercel)
- **File Upload**: Vercel Blob
- **Analytics**: Vercel Analytics

## Chạy local

```bash
# Install dependencies
npm install

# Push database schema
npx prisma db push

# Run development server
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) để xem kết quả.

## Deploy lên Vercel

### Bước 1: Tạo Neon Database

1. Truy cập [neon.tech](https://neon.tech) và tạo tài khoản miễn phí
2. Tạo một project mới
3. Copy chuỗi kết nối `DATABASE_URL` (có dạng `postgresql://...`)

### Bước 2: Cập nhật Prisma Schema cho PostgreSQL

Thay đổi provider trong `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Bước 3: Push schema lên Neon

```bash
npx prisma db push
```

### Bước 4: Deploy lên Vercel

1. Push code lên GitHub
2. Import project trên [vercel.com](https://vercel.com)
3. Thêm environment variables:
   - `DATABASE_URL` = chuỗi kết nối Neon PostgreSQL
   - `BLOB_READ_WRITE_TOKEN` = Vercel Blob token (tùy chọn, cho upload file)
4. Deploy!

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Chuỗi kết nối database | Yes |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token cho upload file | No |

## License

MIT
