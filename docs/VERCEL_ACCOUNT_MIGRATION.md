# Chuyển Vercel account/team và giữ database hiện tại

Quy trình nền nằm ở [worklog lần chuyển 18–19/08/2026, mục 14](WORKLOG_2026-08-18_19_VERCEL_DATA_HUB.md#14-checklist-khi-chuyển-vercel-accountteam-lần-nữa). Đọc mã hiện tại và kiểm tra cấu hình live trước khi thao tác.

## Cấu hình import từ GitHub

| Thiết lập | Main App | KPI standalone |
|---|---|---|
| Repository | NMCDesignapp/nmc-link-manager | Cùng repository |
| Production branch | main | main |
| Root Directory | Gốc repo | kpi-app |
| Framework | Next.js | Next.js |
| Node.js | 24.x | 24.x |
| Build | npm run build | npm run build |
| Install | npm install | npm install |
| Include source files outside Root Directory | Bật | Bắt buộc bật vì prebuild dùng ../scripts |
| Function region | sin1 | sin1 |

Import chỉ sau khi xác nhận đúng tài khoản/team đích. Không tái sử dụng projectId, teamId hay gitCredentialId của tài khoản cũ.

## Database và môi trường

- Giữ Supabase project hiện có; không tạo database rỗng và không chạy restore/create-tables để thử kết nối.
- Main ưu tiên `POSTGRES_PRISMA_URL`. Prisma schema còn dùng `POSTGRES_URL_NON_POOLING`; `DATABASE_URL` và `DIRECT_URL` là fallback theo mã hiện tại.
- Lấy thông tin kết nối từ Supabase integration hoặc nguồn bí mật đã xác minh. Vercel biến loại Sensitive không trả lại giá trị; bản kiểm kê tên biến không phải bản sao mật khẩu.
- Main cần `NMC_DATA_HUB_IMPORT_TOKEN` khớp token Data Hub trên máy quản trị.
- Đặt `NEXT_PUBLIC_MAIN_APP_URL` thành origin HTTPS của Main đã xác minh trên cả Main và KPI trước build. KPI dùng biến này cho API, nội dung nhúng và các CSS dùng chung. Nếu đổi biến, build lại.
- KPI production hiện dùng API proxy tới Main; không cấp secret database hoặc token nhập dữ liệu cho KPI.
- Không chạy nguyên trạng `scripts/update_vercel_env.py` hoặc `scripts/redeploy_vercel.py`: hai script lịch sử dùng ID project cũ; script env còn theo cấu hình Neon cũ.

## Domain và dữ liệu

- Kiểm kê các alias cũ trước khi chuyển. Không mặc định tài khoản mới có thể nhận ngay các tên `*.vercel.app` đang thuộc project cũ.
- Nếu giữ được domain Main, Data Hub có thể giữ URL hiện tại. Nếu đổi domain, cập nhật appUrl trong config local sau khi Main mới đã kiểm tra database và token.
- Theo worklog, cần backup và đường khôi phục đã kiểm tra. Kiểm tra manifest, không chỉ nhìn tên thư mục backup. Backup qua các API ứng dụng không tương đương bản dump toàn bộ PostgreSQL.
- Giữ nguyên nguồn `data-hub` hoặc `google` đang active; không đổi nguồn để thử giao diện.

## Kiểm tra và chuyển hoạt động

1. Build Main và KPI từ đúng SHA GitHub; kiểm tra đồng bộ KPI.
2. Xác nhận deployment READY và SHA, không chỉ HTTP 200.
3. Kiểm tra Main `/api/health`, database, `/api/sync-source`, dữ liệu quản lý và Thi đua.
4. Kiểm tra KPI desktop/mobile, các CSS và API đều dùng Main mới, không lộ chức năng quản trị.
5. Chuyển alias hoặc cập nhật URL local theo phương án đã chốt.
6. Khi Main mới sẵn sàng, khởi động lại Data Hub nếu cần; kiểm tra heartbeat mới và kết quả từng nguồn. Không chạy force-sync để thử.
7. Theo dõi lỗi runtime sau traffic thật; giữ cấu hình cũ để quay lại nếu cần.

Tài liệu chính thức: [Vercel project transfer](https://vercel.com/docs/projects/transferring-projects), [Supabase Vercel integration](https://supabase.com/docs/guides/integrations/vercel-marketplace). Project transfer và import mới từ GitHub là hai thao tác khác nhau; chọn theo quyền và trạng thái tài khoản thực tế.
