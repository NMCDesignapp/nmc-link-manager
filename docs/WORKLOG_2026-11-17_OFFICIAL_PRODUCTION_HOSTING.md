# Worklog 17/11/2026 — Kiến trúc hosting production chính thức

## Quyết định vận hành

Từ ngày 17/11/2026, kiến trúc dưới đây là trạng thái production chính thức và là cơ sở bắt buộc cho mọi chỉnh sửa, kiểm tra và triển khai về sau:

| Thành phần | Nền tảng | Định danh production | Vai trò |
|---|---|---|---|
| NC-Link Main App | Vercel | project `nc-link`, team `thanhhung070826-6875`, `https://nc-link.vercel.app` | Quản trị, database/API chính, API ghi và cấu hình |
| KPI trong Main App | Vercel cùng NC-Link | `https://nc-link.vercel.app/kpi` | Bề mặt KPI nằm trong Main App |
| KPI standalone | Cloudflare Workers | Worker `kpi-nc-link`, `https://kpi-nc-link.chaunm2312.workers.dev` | Bản KPI công khai, chỉ đọc |

KPI standalone trên Cloudflare là production chính thức, không còn là thử nghiệm, preview hoặc bước chuyển tiếp. Hai alias Vercel cũ `angiang2026.vercel.app` và `angiang2026-nhom.vercel.app` không còn là đích production và không được dùng làm căn cứ cho thay đổi mới.

## Nguyên tắc cho thay đổi sau này

1. Mọi thay đổi Main App được đánh giá và triển khai trên project Vercel `nc-link`.
2. Mọi thay đổi KPI phải kiểm tra cả `src/app/kpi/page.tsx` và bản đồng bộ trong `kpi-app`, nhưng KPI standalone chỉ triển khai production lên Cloudflare Worker `kpi-nc-link`.
3. KPI Cloudflare lấy Main App chính thức tại `https://nc-link.vercel.app` qua `NEXT_PUBLIC_MAIN_APP_URL` và `NMC_MAIN_APP_URL`; không cấu hình database secret hoặc mật khẩu admin cho Worker.
4. KPI standalone luôn công khai, chỉ đọc; không lộ chức năng quản trị, sidebar, mật khẩu, token hoặc API ghi ngoài phạm vi đã duyệt.
5. Không đổi nền tảng, project, Worker, URL production hoặc mật khẩu/secret chỉ vì triển khai hay migration. Mọi thay đổi các giá trị này cần yêu cầu rõ ràng của người dùng.
6. Khi báo đã hoàn tất, phải kiểm tra riêng Main App trên Vercel và KPI standalone trên Cloudflare; không dùng trạng thái một nền tảng để suy ra nền tảng còn lại.

## Bằng chứng kiểm kê ngày 17/11/2026

- Vercel project `nc-link` và alias `nc-link.vercel.app` được xác nhận là Production Main App.
- Cloudflare project/Worker production được GitHub xác nhận là `kpi-nc-link` và có quy trình Workers Builds nối với repository.
- `kpi-app/wrangler.jsonc` đã được đồng bộ tên Worker thành `kpi-nc-link` để các lệnh Wrangler sau này không triển khai nhầm Worker lịch sử.
- `https://kpi-nc-link.chaunm2312.workers.dev/` trả HTTP 200 tại thời điểm kiểm tra.
- `https://kpi-nc-link.chaunm2312.workers.dev/api/health` trả HTTP 200 tại thời điểm kiểm tra.
- Worker lịch sử `nmc-kpi` trả HTTP 500 và không được dùng làm production hoặc căn cứ cho thay đổi mới.

## Tài liệu đã đồng bộ

- `AGENTS.md`
- `docs/CODEX_HANDOFF.md`
- `docs/CODEX_OPERATIONS.md`
- `docs/HOSTING_SPLIT_MIGRATION.md`
- `.cursor/rules/official-production-hosting.mdc`
