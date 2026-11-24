# Worklog production hiện tại — NC Link Manager

## Trạng thái vận hành chuẩn

- Repository: `NMCDesignapp/nmc-link-manager`
- Nhánh production: `main`
- Ứng dụng production duy nhất: Render Web Service `angiang2026`
- URL ứng dụng: `https://nc-link.onrender.com`
- Render tự deploy từ `main`.
- Database, API, dashboard KPI, Thi đua, Chính sách, CLB Sao Việt và Quản lý nằm trong cùng ứng dụng Render.

## Phạm vi giao diện KPI

- `/` và `/kpi` mở dashboard KPI trong cùng ứng dụng Render.
- `/quan-ly` là trang quản lý được mở từ các nút trong KPI.
- Kế hoạch khung vẫn là phần người dùng nhập và chỉnh sửa; không khóa, không thay đổi luồng nhập liệu.
- Không có KPI tách riêng trong kiến trúc production hiện tại.
- Popup loading đầu app dùng `src/components/app-loader.tsx`.
- Popup chờ khi mở Thi đua/Chính sách/CLB dùng loader React trong `src/app/kpi/page.tsx` và CSS hiện hành `public/kpi-loader-scope-v14.css`.
- Không giữ component popup cũ `kpi-entry-gate` hoặc các stylesheet cũ dùng giao diện bạc/ECG.

## Quản trị

- Đăng nhập quản trị dùng session HttpOnly qua `/api/admin/session`.
- Mật khẩu production được cấu hình bằng biến môi trường Render, không ghi vào Git.
- Không hard-code mật khẩu trong source.

## Nền tảng duy nhất

- Không có Vercel redirect, Cloudflare Worker hoặc Netlify trong kiến trúc production.
- Không tạo bản ứng dụng hoặc KPI standalone.

## Quy tắc triển khai

1. Chỉnh sửa source của ứng dụng Render trong repository này.
2. Kiểm tra build trước khi push.
3. Push `main` để Render tự deploy; không tạo service Render thứ hai.
4. Sau deploy kiểm tra `https://nc-link.onrender.com/api/health` và các luồng popup liên quan.
5. Không suy luận production từ worklog cũ; source code và trạng thái Render hiện tại là nguồn chuẩn.

## Lịch sử thay đổi gần nhất

- `0316d15`: xóa stylesheet loader cũ khỏi layout và xóa hai file theme loader cũ.
- `a6b9dae`: xóa rule CSS cũ làm popup trang con bị `display:none`.
- `ac0e05b`: xóa component popup KPI entry cũ.
- `af498c0`: giữ popup đầu app đến khi dữ liệu KPI sẵn sàng.
