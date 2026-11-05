# Chuẩn bị KPI tách trên Google Cloud Run — CHƯA TRIỂN KHAI

Ngày kiểm tra: 05/11/2026. Repository: `NMCDesignapp/nmc-link-manager`.
Đây là tài liệu chuẩn bị **bản thử nghiệm riêng**, chưa chuyển production,
chưa thay đổi NC-Link, Supabase, Data Hub hoặc Vercel.

## 1. Giới hạn quan trọng đã xác minh từ mã nguồn

- `kpi-app/` là Next.js 16, React 19 và Prisma 6, có thể đóng gói Node.js trên Cloud Run.
- `kpi-app/package.json` chạy `prebuild`, trong đó có
  `scripts/sync-kpi-source.js` và `scripts/prepare-kpi-standalone-api.js`.
- Script `prepare-kpi-standalone-api.js` **xóa các route API của KPI tách khi build**
  và sinh API catch-all: mọi GET/HEAD được proxy tới `https://nc-link.vercel.app/api/...`.
  Một số thao tác ghi cho `calendar` và `kpi-target-registrations` vẫn proxy
  về Main App. Vì vậy KPI standalone hiện tại **CHƯA độc lập về dữ liệu**
  dù được đặt trên hosting độc lập.
- Chuyển hosting mà chưa sửa luồng API không giải quyết việc NC-Link bị pause/khóa.
- Production database của Main là Supabase PostgreSQL (xem `AGENTS.md`,
  `src/lib/db.ts`); không mặc định là Neon chỉ vì README cũ.
- **Chưa có phép đo, benchmark hay build Cloud Run thành công** trong lần chuẩn bị này.

## 2. Phạm vi staging / điều không làm

- Không tự động deploy khi merge/push; không tạo CI trigger có phí.
- Không chạm `src/app/kpi/page.tsx`, công thức thưởng/thi đua, dữ liệu hoặc schema.
- Không đưa bất kỳ URL Postgres thật, mật khẩu, token hay dữ liệu nhân viên lên Git.
- Không bật public ingress cho KPI có dữ liệu nghiệp vụ khi chưa rà soát truy cập.
- Không chạy seed, migrate, `prisma db push` lên cơ sở dữ liệu production.
- Vẫn giữ các đường dẫn KPI trên Vercel đến khi có kiểm thử và duyệt chuyển.

## 3. Đóng gói

Dockerfile đặt ở repository root để build KPI nhưng vẫn có nguồn Main cần
cho script đồng bộ. `.dockerignore` và `.gcloudignore` loại secrets, cache,
node_modules và file cấu hình nội bộ khỏi image/source upload.

Từ root repository (máy có Docker):

```bash
docker build -t nmc-kpi-cloudrun:test .
docker run --rm -p 8080:8080 nmc-kpi-cloudrun:test
```

Bản build chỉ có thể được coi là đạt khi Docker build thành công và kiểm tra
root, API, giao diện desktop/mobile, log và khả năng đọc dữ liệu.
Nếu build cần biến môi trường, không sử dụng credential production trong Docker build.

## 4. Khi chủ tài khoản Google Cloud quyết định chạy staging

**Không chạy các lệnh dưới đây trước khi có phương án kiểm soát chi phí,
phân quyền và được chủ tài khoản chấp thuận.** Cloud Run dù có free tier
vẫn yêu cầu billing và các dịch vụ Cloud Build/Artifact Registry, mạng
có thể phát sinh chi phí riêng.

1. Tạo Google Cloud project riêng chỉ cho KPI; gắn billing, bật cảnh báo
   ngân sách và xem khả năng thiết lập spend cap dành riêng cho Cloud Run.
   Spend cap chỉ bao phủ Cloud Run và sử dụng **gross costs** (không trừ
   credits/discount); không bảo đảm toàn project có tổng hóa đơn = 0.
2. Bật Cloud Run, Cloud Build, Artifact Registry với quyền tối thiểu cần thiết.
3. Trong Cloud Shell, clone repo và checkout branch đã duyệt.
4. Thử staging **private** (region và giới hạn có thể điều chỉnh sau benchmark):

```bash
gcloud config set project YOUR_GCP_PROJECT_ID
gcloud run deploy nmc-kpi-staging \
  --source . \
  --region asia-southeast1 \
  --cpu 1 \
  --memory 1Gi \
  --concurrency 10 \
  --min-instances 0 \
  --max-instances 1 \
  --cpu-throttling \
  --timeout 120 \
  --no-allow-unauthenticated
```

5. Kiểm tra qua phiên xác thực của chủ dự án:

```bash
gcloud run services proxy nmc-kpi-staging --region asia-southeast1 --port 8080
```

Khi proxy chạy trong một terminal, truy cập `http://localhost:8080/`
ở trình duyệt/terminal khác. Chưa được cấp quyền public trong giai đoạn này.

## 5. Việc phải hoàn tất TRƯỚC khi xem là KPI độc lập

1. Thiết kế API GET có thể đọc dữ liệu từ **cùng PostgreSQL đang phục vụ NC-Link**
   ngay cả khi website NC-Link không truy cập được; ưu tiên credential database
   **chỉ đọc** và không expose dữ liệu nhạy cảm nếu cần public.
2. Tách những API có thao tác ghi có chủ đích (`calendar`,
   `kpi-target-registrations`) về Main hoặc cơ chế kiểm soát xác thực;
   không sao chép toàn bộ API ghi lên KPI public.
3. Xác nhận cập nhật Data Hub từ Excel vẫn đi qua Main và Supabase; nếu
   NC-Link down, bản KPI độc lập chỉ đọc được **dữ liệu đã đồng bộ trước đó**.
4. So sánh số liệu `Doanhso` (sheet theo tháng), `Tamthu` (sheet 4),
   AFYP, kết quả Sao Việt, CLB, chính sách, thi đua và 6 mục điều hướng.
5. So sánh dữ liệu trên KPI Main/Vercel/KPI Cloud Run tại cùng timestamp;
   kiểm tra đồng bộ, lỗi database, bộ nhớ, thời gian tải, desktop/mobile.
6. Kiểm tra hành vi khi cố tình chặn truy cập `nc-link.vercel.app`.
   Nếu KPI Cloud Run cũng mất dữ liệu, **không** chuyển URL.
7. Đánh giá tuân thủ bảo mật dữ liệu nhân sự, khách hàng và các quyền xem.
8. Theo dõi usage và chi phí; rollback bằng cách giữ nguyên URL Vercel
   (không cắt ngay sau thử nghiệm).

## 6. Tài liệu nhà cung cấp

- https://docs.cloud.google.com/run/docs/deploying-source-code
- https://docs.cloud.google.com/run/docs/configuring/max-instances
- https://docs.cloud.google.com/run/docs/configuring/billing-settings
- https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps
- https://cloud.google.com/run/pricing
