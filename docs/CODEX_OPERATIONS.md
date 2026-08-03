# Codex trên máy tính — hướng dẫn tiếp quản NMC Link Manager

Tài liệu này hướng dẫn sử dụng Codex local với repository `NMCDesignapp/nmc-link-manager` sau khi clone/pull về máy.

## 1. Chuẩn bị thư mục dự án

Mở PowerShell hoặc terminal tại thư mục chứa dự án:

```powershell
git clone https://github.com/NMCDesignapp/nmc-link-manager.git
cd nmc-link-manager
git checkout main
git pull --ff-only
```

Nếu dự án đã có sẵn:

```powershell
cd <thu-muc-du-an>
git status
git checkout main
git pull --ff-only
```

Không chạy `git reset --hard` khi còn file chưa commit hoặc chưa biết nguồn gốc.

## 2. Mở bằng Codex

Có thể dùng Codex trong ứng dụng desktop/IDE hoặc CLI. Điểm quan trọng là phải mở đúng root Git của repository, nơi có `AGENTS.md`.

Prompt đầu tiên nên dùng:

```text
Đọc AGENTS.md, docs/CODEX_HANDOFF.md và docs/CODEX_OPERATIONS.md. Sau đó kiểm tra git status, cấu trúc repository, các lệnh build và tóm tắt lại kiến trúc Main App, KPI tách, Supabase và NMC Data Hub. Chưa sửa mã cho đến khi hoàn tất kiểm tra.
```

Codex đọc `AGENTS.md` khi bắt đầu phiên. Sau khi tài liệu này thay đổi, nên mở phiên Codex mới để chắc chắn instruction chain được nạp lại.

## 3. Cài dependencies và baseline

Tại root:

```powershell
npm install
npm run lint
npm run build
```

Kiểm tra KPI tách:

```powershell
cd kpi-app
npm install
npm run build
cd ..
```

Kiểm tra đồng bộ source KPI:

### Git Bash/WSL

```bash
bash scripts/sync-kpi-app.sh --check
```

### PowerShell khi không có Bash

Dùng Git Bash đi kèm Git for Windows hoặc WSL. Không tự chuyển script thành PowerShell rồi dùng như nguồn chính nếu chưa so sánh đầy đủ hành vi.

## 4. Quy trình giao nhiệm vụ cho Codex

Một prompt tốt phải có:

- mục tiêu cụ thể;
- trang/domain bị ảnh hưởng;
- desktop/mobile;
- điều không được thay đổi;
- tiêu chí kiểm tra;
- có deploy production hay chỉ tạo PR.

Ví dụ sửa KPI mobile:

```text
Ở KPI Main App và KPI tách, chỉnh [mô tả]. Chỉ áp dụng mobile tối đa 720px. Không thay đổi logic dữ liệu hoặc desktop. Sửa source main trước, chạy script sync standalone, build cả hai project, xem diff và báo lại file/kiểm tra. Không merge main trước khi kiểm tra xong.
```

Ví dụ kiểm tra luồng dữ liệu:

```text
Không sửa mã. Kiểm tra source active, heartbeat Data Hub, last sync từng nguồn và route ghi. Phân biệt dữ liệu trong Supabase với trạng thái process Windows. Báo rõ điều xác minh được và chưa xác minh được.
```

Ví dụ sửa Thi đua:

```text
Giữ quy tắc luôn hiển thị toàn bộ TVV đủ điều kiện kể cả 0 doanh số, trừ khi bật ẩn TVV chưa đạt. PA kết quả 0 đứng sau non-PA kết quả 0. Kiểm tra cả current contest và saved contest, chạy build và đưa test case cụ thể.
```

## 5. Branch và PR

Mỗi nhiệm vụ nên bắt đầu từ `main` mới nhất:

```powershell
git checkout main
git pull --ff-only
git checkout -b feature/<ten-ngan>
```

Sau khi Codex sửa:

```powershell
git status
git diff --stat
git diff
npm run lint
npm run build
```

Nếu liên quan KPI:

```bash
bash scripts/sync-kpi-app.sh
bash scripts/sync-kpi-app.sh --check
```

Sau đó:

```powershell
git add <cac-file-dung-pham-vi>
git commit -m "<mo-ta-ngan>"
git push -u origin feature/<ten-ngan>
```

Tạo PR vào `main`, xem preview/build, rồi mới merge.

## 6. Kiểm tra deployment

Sau khi merge `main`, cả hai Vercel project có thể được kích hoạt:

- Main App `my-project`;
- KPI tách `kpi-nc-link` với Root Directory `kpi-app`.

Kiểm tra:

1. deployment trạng thái READY;
2. `https://nc-link.vercel.app` trả HTTP 200;
3. `https://nc-link.vercel.app/kpi` mở được;
4. `https://angiang2026.vercel.app` mở được;
5. tính năng vừa sửa hoạt động ở breakpoint yêu cầu;
6. không có lỗi console/network quan trọng;
7. standalone không lộ admin.

Không chỉ nhìn trạng thái deployment. CSS/responsive cần kiểm tra trực quan.

## 7. Kiểm tra Data Hub local trên Windows

Data Hub không nằm trong Vercel. Khi nhiệm vụ liên quan đồng bộ Excel, Codex trên máy có thể kiểm tra local.

### Kiểm tra config

```powershell
Test-Path .\data-hub\data-hub.config.json
git status --short -- .\data-hub\data-hub.config.json
```

File thật phải tồn tại local nếu máy này chạy Data Hub, nhưng không được xuất hiện là file tracked/commit.

### Kiểm tra Node process

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -match 'node' -and $_.CommandLine -match 'data-hub' } |
  Select-Object ProcessId, Name, CommandLine
```

Process tồn tại vẫn chưa đủ; phải đối chiếu heartbeat trên Main App.

### Kiểm tra Scheduled Task

```powershell
Get-ScheduledTask |
  Where-Object { $_.TaskName -match 'NMC|Data Hub|DataHub' } |
  Select-Object TaskName, State, TaskPath
```

### Chạy thử một lần

```powershell
cd data-hub
npm install
npm run once
```

Lệnh `once` có thể ghi dữ liệu thật nếu source active là Data Hub. Chỉ chạy khi đã kiểm tra config, token, file nguồn và phạm vi replace.

### Bật Data Hub làm nguồn

```powershell
npm run activate
```

Lệnh này thay đổi source active trên Main App. Không chạy chỉ để kiểm tra giao diện.

### Chạy liên tục

```powershell
npm start
```

Giữ terminal mở hoặc dùng Scheduled Task. Không chạy nhiều process Data Hub cùng lúc.

## 8. Kiểm tra file Excel trước khi sync

Trước `once` hoặc `start`:

- đường dẫn file tồn tại;
- workbook mở được;
- sheet đúng tên;
- header không đổi;
- nguồn cần dữ liệu không rỗng;
- tháng hiện tại đúng timezone nghiệp vụ;
- Doanhso không chứa tháng hiện tại trong phần history;
- Tamthu chỉ sở hữu tháng hiện tại;
- không có file tạm `~$...xlsx` được trỏ nhầm;
- Excel đã lưu xong trước khi Data Hub đọc.

## 9. Kiểm tra nguồn active và heartbeat

Codex phải đọc route/settings hiện tại hoặc dùng màn hình trạng thái dữ liệu nếu đã có. Các key quan trọng:

```text
nmc-sync-source
nmc-data-hub-last-seen-at
nmc-data-hub-last-sync-at
nmc-data-hub-last-result
nmc-sync-source-updated-at
nmc-sync-source-reason
```

Cách diễn giải:

- `nmc-sync-source=data-hub` chỉ cho biết server cho phép Data Hub ghi;
- `last-seen-at` gần hiện tại mới cho thấy process đang liên lạc;
- `last-sync-at` cho biết vòng sync-complete gần nhất;
- `last-result` cho biết source nào thay đổi/lỗi/skipped;
- dữ liệu row mới không thay thế heartbeat.

## 10. Khi Codex không được phép tự hành động

Codex phải dừng và báo trước khi:

- xóa/thay toàn bộ một collection production mà chưa xác minh input;
- đổi source Google/Data Hub chỉ để thử;
- commit token hoặc `.env`;
- force-push main;
- sửa schema production mà không có migration/rollback;
- chạy import trên file Excel chưa xác minh;
- kết luận process local đang chạy chỉ từ dữ liệu cloud;
- merge khi build chưa pass;
- deploy một bản KPI mà bỏ bản còn lại.

## 11. Prompt khôi phục ngữ cảnh nhanh

Dùng prompt sau trong phiên mới:

```text
Tiếp quản dự án NMC Link Manager. Đọc AGENTS.md và toàn bộ docs/CODEX_*.md trước. Mã hiện tại là nguồn chuẩn. Main App nc-link.vercel.app là bản quản trị; KPI tách trong kpi-app là công khai chỉ đọc. Production DB là Supabase qua POSTGRES_PRISMA_URL. Data Hub và Google là hai nguồn độc quyền qua nmc-sync-source. Mọi sửa KPI phải sync bằng scripts/sync-kpi-app.sh và build cả hai. Kiểm tra git status trước, không sửa hoặc deploy khi chưa báo kế hoạch.
```

## 12. Cập nhật kiến thức sau mỗi nhiệm vụ lớn

Nếu kiến trúc, nguồn dữ liệu hoặc quy tắc nghiệp vụ thay đổi:

1. cập nhật code;
2. cập nhật `AGENTS.md` nếu là rule dài hạn;
3. cập nhật `docs/CODEX_HANDOFF.md` nếu là kiến trúc/nghiệp vụ;
4. cập nhật tài liệu Data Hub nếu liên quan local sync;
5. đưa tài liệu trong cùng PR để Codex phiên sau không dùng ngữ cảnh cũ.

Không ghi timestamp/live count vào phần kiến trúc cố định nếu chúng sẽ nhanh chóng lỗi thời; đặt chúng trong mục audit có ngày rõ ràng.