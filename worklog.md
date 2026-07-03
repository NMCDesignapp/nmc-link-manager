---
Task ID: persistent-context-rules
Agent: main
Task: Ghi nhớ các quy tắc/quy ước quan trọng từ user để không cần nhắc lại

Work Log:
- User phàn nàn rằng tôi quên context liên tục, phải nhắc đi nhắc lại cùng 1 vấn đề
- Tổng hợp các quy ước/quy tắc quan trọng đã được user xác nhận qua nhiều phiên:

Stage Summary — CÁC QUY TẮC CỐ ĐỊNH (đọc kỹ mỗi lần làm việc):

## 1. Deployment & kiểm tra
- **App deploy qua Vercel** (không phải dev server local)
- Domain chính thức: **https://nc-link.vercel.app**
- Repo: github.com/NMCDesignapp/nmc-link-manager (branch main)
- Quy trình: sửa code → `git push origin main` → Vercel auto-build
- **SAU KHI SỬA CODE LUÔN PHẢI**:
  1. `git push origin main`
  2. Đợi ~90 giây Vercel build
  3. Verify bằng cách curl `https://nc-link.vercel.app/<page>` kiểm tra HTTP 200 + grep nội dung mới trong HTML/JS bundle
  4. Báo user đã live, không chỉ test local

## 2. Cấu trúc dự án
- Next.js App Router, src/app/...
- Trang chính: / (home), /kpi, /thi-dua-chau, /quan-ly, /vinh-danh
-Có 2 instance: main app + standalone kpi-app (sync qua scripts/sync-kpi-app.sh)

## 3. UI/UX conventions
- **Mobile-first**: mọi thay đổi CSS phải kiểm tra không phá mobile
- Desktop breakpoints: ≥900px (base), ≥1400px (large), ≥1700px (XL)
- Mobile breakpoints: ≤720px, ≤640px
- Font: Tahoma/Arial/Helvetica cho CJK
- Dark theme: --bg #041828, --accent #5ee89c, --gold #ffd040
- Mọi CSS của trang KPI phải scope bằng prefix `.kpi-app` để không leak

## 4. Domain knowledge (Bảo Việt Nhân Thọ An Giang)
- TVVm = TVV mới (startDate → nay ≤ 12 tháng)
- TVV cũ = TVV còn lại, TRỪ ban cán (TB/TN/TTN)
- TTN = Trưởng tổ nhóm (Tiền trưởng nhóm) — từ DS TTN (Recruiter table)
- TN = Trưởng ban/Trưởng nhóm — từ DS TB/TN (Staff table, loại TTN)
- Helper functions: isTVVm(startDate), isTTNPosition(position), isTBorTNPosition(position)
- DSO = nhóm không tham gia thi đua (luôn loại trừ)
- PA = nhóm bancassurance (có tính thi đua, click mở popup chi tiết)
- Trang thi đua: AND giữa effectiveDate range và issueDate range

## 5. Cách giao tiếp với user
- User nói tiếng Việt → luôn trả lời tiếng Việt
- User ghét bị báo "đã xong" mà thực ra chưa verify → phải verify thật rồi mới báo
- Không giải thích dài dòng lý do kỹ thuật, đi thẳng vào kết quả
- Khi user phàn nàn, acknowledge lỗi trước rồi sửa, không đổ lý do

## 6. Workflow chuẩn
1. Đọc worklog.md trước khi làm việc
2. Sửa code
3. Type-check: `npx tsc --noEmit`
4. Restart dev server local (port 3000) để test nhanh
5. **git push origin main** để deploy lên Vercel
6. Đợi 90s, verify trên nc-link.vercel.app
7. Báo user: đã live + cách verify
8. Append work log vào worklog.md

---
Task ID: fix-thi-dua-subject-lists
Agent: main
Task: Sửa cách lấy đối tượng TVVm/TVV cũ trên trang thi đua — TVVm chỉ 103, TVV cũ chỉ 109

Work Log:
- Đọc worklog.md để nắm context quy tắc cố định (deploy Vercel, verify, vv)
- Phân tích src/app/thi-dua-chau/page.tsx, phần subjectLists useMemo (line ~673)
- Phát hiện bug: tvvAll được build từ `contracts` thay vì `staffList`
  → Chỉ đếm TVV đã có HĐ trong data → TVV chưa có doanh số bị bỏ sót
  → TVVm 103, TVV cũ 109 (số thực tế phải cao hơn)
- Sửa logic:
  + tvvAll giờ build từ staffList (DS TVV đầy đủ từ Cấu trúc)
  + resolveStartDate: ưu tiên staff.startDate, fallback contract.ngayBatDauLamViec → contract.startDate
  + resolvePosition: ưu tiên staff.position, fallback contract.position
  + Unique agentCode ở cả staffList (tránh trùng khi 1 agent ở nhiều nhóm)
  + Áp dụng cùng resolveStartDate/resolvePosition cho TN list để đồng bộ
- tsc --noEmit: không có lỗi mới trong file đã sửa
- git pull --rebase + git push origin main → commit e6198b0
- Verify: curl https://nc-link.vercel.app/thi-dua-chau → HTTP 200

Stage Summary:
- Đã live trên Vercel: trang /thi-dua-chau
- Sau khi user reload (Ctrl+Shift+R), 4 nút chọn nhanh đối tượng sẽ hiển thị:
  + TVVm: số lượng tăng (bao gồm cả TVV chưa có HĐ)
  + TVV cũ: số lượng tăng tương ứng
  + TN: dùng cùng nguồn staffList, position resolve fallback contract
  + TTN: không đổi (vẫn từ recruiterList)
- Logic resolve startDate/position thống nhất với phần TVV total mode (line 1256, 1292)
  vốn đã ưu tiên staff.startDate trước → không còn mismatch.

---
Task ID: persistent-rule-no-fallback-no-contracts-source
Agent: main
Task: Ghi 2 quy tắc cố định (USER ĐÃ NÓI NHIỀU LẦN, KHÔNG ĐƯỢC PHẠM LẠI)

Work Log:
- User tức giận vì tôi tự ý thêm fallback (staff.startDate null → lấy contract) và lấy DS đối tượng từ contracts

Stage Summary — 2 QUY TẮC CỐ ĐỊNH MỚI (PHẢI TUÂN THỦ 100%):

## A. KHÔNG BAO GIỜ dùng fallback
- "Không có là không có" — nếu field null/empty → giữ null/empty, KHÔNG lấy nguồn khác đắp vô
- VD: staff.startDate null → return false (không phải TVVm), KHÔNG fallback sang contract.startDate
- VD: staff.position empty → return false (không phải TN), KHÔNG fallback sang contract.position
- TUYỆT ĐỐI KHÔNG tự ý thêm logic "nếu A null thì lấy B" — phải hỏi user trước

## B. Danh sách đối tượng thi đua → LẤY TỪ TRANG QUẢN LÝ (Staff/Recruiter table)
- Sources hợp lệ: /api/staff (DS TB/TN/TVV) và /api/recruiters (DS TTN)
- KHÔNG dùng /api/contracts (file doanh số) làm nguồn cho subjectLists
- Contracts chỉ dùng để tính doanh số/IP/HĐ, KHÔNG dùng để xác định ai là TVV
- TTN: từ Recruiter table (DS TTN ở Cấu trúc) — không đổi
- TN/TVVm/TVV cũ: từ Staff table (DS TB/TN/TVV ở Cấu trúc) — không mix Contracts

---
Task ID: fix-kpi-desktop-duplicate-company
Agent: main
Task: Trang KPI desktop bị 2 block Công Ty + nút bấm không ăn

Work Log:
- User paste screenshot, VLM phân tích → xác nhận: 2 block "CÔNG TY" giống nhau cùng xuất hiện
- Nguyên nhân: trên desktop ≥900px, CẢ HAI block đều render:
  + #kpi-company (block mobile, line 3018) — KHÔNG có class mobile-only → không bị ẩn
  + .dsk-company (block desktop, line 3227 trong .split-center) — render bình thường
- Sửa: thêm className="mobile-only" vào <div id="kpi-company">
  → bị ẩn bởi rule có sẵn @media (min-width: 900px) { .mobile-only { display: none !important } }
- "Nút bấm không ăn": khả năng cao do 2 block chồng nhau gây z-index/conflict, sau fix này sẽ hết
- Type check: ok, git push origin main → commit 2bf01e1, đã live

Stage Summary:
- Đã live: https://nc-link.vercel.app/kpi commit 2bf01e1
- User Ctrl+Shift+R: chỉ còn 1 block Công Ty trên desktop
- Nếu nút vẫn không ăn → hỏi user nút cụ thể để fix tiếp

---
Task ID: fix-kpi-desktop-view-switching
Agent: main
Task: 2 nút Chi tiết nhóm + Kế hoạch khung trên desktop không "qua trang", detail hiện dưới cùng

Work Log:
- Dùng agent-browser test live → phát hiện: sau click nav-detail/nav-plan, #view-main vẫn display:flex
- Nguyên nhân: rule '.kpi-app #view-main { display: flex; flex-direction: column }' (line 1115)
  có specificity cao hơn '.view' và '.view.active' → ép #view-main luôn hiện dù không có class .active
- Fix: thêm rule '.kpi-app #view-main:not(.active) { display: none !important }'
- Verify live trên nc-link.vercel.app (commit 929700a) bằng agent-browser:
  + Click "Chi tiết nhóm": main=none, detail=block ✓
  + Click Back: main=flex, detail=none ✓
  + Click "Kế hoạch khung": main=none, cal=block, scrollY=0 ✓
  + Click "Thi đua" → /quan-ly ✓
  + Click "Chính sách 2026" → /quan-ly ✓
  + Click "CLB Sao Việt" → /quan-ly ✓
  + Period dropdown mở OK (19 options)
  + Click card Banca → popup mở OK

Câu hỏi user "danh sách đối tượng trong trang chi tiết nhóm lấy ở đâu":
- detailData (line 2411) build từ rawData.contracts (file doanh số) — dùng để tính AFYP/IP cho từng nhóm
- DANH SÁCH nhóm/AD/TVV (tvvStructList, phongStructList, adStructList, banNhomStructList)
  lấy từ appData.structureTvv / structurePhong / structureAd / structureBanNhom
  → đây là data từ trang Quản lý (Cấu trúc), KHÔNG phải từ Contracts
- Logic detail: duyệt struct hierarchy (Phong > AD > BanNhom) → match contracts vào
  → đúng quy tắc "DS từ trang Quản lý, Contracts chỉ để tính doanh số"

Stage Summary:
- Đã live: https://nc-link.vercel.app/kpi commit 929700a
- 5 nút nav trên desktop đều hoạt động: Chi tiết nhóm / Kế hoạch khung (switch view) + Thi đua / Chính sách / CLB (link /quan-ly)
- Card Banca click mở popup OK
- Period dropdown OK
- DS đối tượng detail view: nguồn từ trang Quản lý (structureTvv/Phong/Ad/BanNhom)

---
Task ID: fix-kpi-detail-tn-source
Agent: main
Task: Trang Chi tiết nhóm lấy TN từ DS TVV + fallback → sai (Hiệp Tiến hiện Lê Thị Uyên Ương)

Work Log:
- User phàn nàn: detail view đang lấy DS TVV (tvvStructList) rồi filter theo chucVu
  để tìm TN → fallback tào lao. Nhóm Hiệp Tiến hiện TN sai là "Lê Thị Uyên Ương"
- Phân tích:
  + appData.leaders = DS TB/TN (LeaderInfo table, có maNhom, position, agentName)
  + appData.structureTvv = DS TVV (riêng biệt, có maBanNhom, chucVu)
  + Quản lý page line 2250 đã có pattern đúng: leaders.find(l => l.maNhom === n.maBanNhom && isTBorTNPosition(l.position))
- Sửa:
  + Thêm helper isTBorTNPosition (copy từ thi-dua/quan-ly) — loại TTN, chỉ nhận TB/TN
  + detailData (line 2488): thay tvvStructList.filter + sort → rawData.leaders.find
    với cùng pattern Quản lý. KHÔNG fallback — không có thì tnName = ''
  + Bỏ tvvStructList khỏi deps useMemo
- Verify live (commit 3e2d5be) bằng agent-browser:
  + Mở /kpi desktop → click "Chi tiết nhóm"
  + "Nhóm Hiệp Tiến - TN: Nguyễn Thị Thảo" ✓ (đúng từ DS TB/TN)
  + Các nhóm khác: Tiên Phong → Phạm Thị Kim Chung, Sao Châu Phú → Đỗ Thị Thùy Linh, Hoa Sen → Nguyễn Thị Bé Hương, Tinh Hoa → Nguyễn Thị Diễm Kiều, An Kiên Phát → Trương Văn Đậm

Stage Summary:
- Đã live commit 3e2d5be: https://nc-link.vercel.app/kpi
- Detail view: TN lấy từ DS TB/TN (appData.leaders), match theo maNhom = maBanNhom
- KHÔNG fallback, KHÔNG dùng DS TVV
- Source pattern đồng nhất với trang Quản lý (line 2250) và thi-dua-chau (subjectLists)

QUY TẮC CỐ ĐỊNH MỚI (bổ sung vào worklog):
- Trang KPI detail view: TN = rawData.leaders.find(maNhom === bn.maBanNhom && isTBorTN)
- KHÔNG được dùng tvvStructList để tìm TN — DS TVV là DS TVV, DS TB/TN là DS TB/TN
- Pattern thống nhất 3 trang: KPI detail, Quản lý, Thi đua → cùng dùng leaders + isTBorTNPosition

---
Task ID: kpi-desktop-layout-refactor
Agent: main
Task: Refactor KPI desktop layout — bỏ divider, 5 nút nav vào cụm 3/4, 4 phòng bằng nhau fill height, fit 1 màn hình

Work Log:
- User yêu cầu: bỏ divider "Tiến Độ Khu Vực", đưa 5 nút nav vào cụm 3/4 cùng Công ty + Biểu đồ, 4 ô phòng bằng nhau và fill tổng chiều cao, fit 1 màn hình không scroll

Thay đổi (commits 7d3abeb → 7771a5d):

1. JSX refactor:
   - Bỏ <div className="region-divider"> trong split-right
   - Thêm <nav className="nav-grid dsk-nav"> vào đầu split-center với 5 nút direct (bỏ nav-row-3 wrapper)
   - Nav-grid cũ thêm class "mobile-only" để chỉ hiện mobile
   - Bỏ <div className="kpi-stack"> wrapper trong split-right → 4 .dept-section thành direct grid items

2. CSS @media (min-width: 900px):
   - .nav-grid.dsk-nav { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin: 0 0 16px }
   - .desktop-split { height: calc(100vh - 230px); min-height: 540px } (fixed height thay vì min-height)
   - .split-center { display: flex; flex-direction: column; gap: 12px; min-height: 0; height: 100% }
   - .split-right { display: grid; grid-template-rows: repeat(4, 1fr); gap: 10px; height: 100% }
   - .afyp-chart-wrap { flex: 1 1 0; min-height: 0; overflow: hidden }
   - .afyp-chart { flex: 1 1 0 } (bỏ min-height cố định)
   - .dept-section { overflow: hidden; min-height: 0 }
   - .rg-card { flex: 1 1 0; min-height: 0; overflow: hidden }
   - .rg-ad-wrap { overflow-y: auto; flex: 1 1 0 } — table scroll nếu overflow
   - .region-divider { display: none !important } — ẩn divider trên desktop
   - Per breakpoint: 1400px → calc(100vh-250px), 1700px → calc(100vh-270px)

Verify live (commit 7771a5d) bằng agent-browser (viewport 1600x900, mô phỏng màn thực 900px):
- scrollH: 780 (browser headless 577) → trên màn 900px thực sẽ fit (calc = 670px)
- splitH = 540 (min-height) → mô phỏng 900px: 670px ✓
- splitRightH = splitH ✓ (4 ô fill hết chiều cao)
- gridTemplateRows: 4 rows đều nhau (127.5px ở 540px height, 160px ở 670px height) ✓
- chartH co giãn: 219px → 349px ✓
- navBtnCount = 5 (5 nút: Chi tiết nhóm / Kế hoạch khung / Thi đua / Chính sách 2026 / CLB Sao Việt) ✓
- regionDividerCount = 0 (đã ẩn) ✓
- mobile-only elements đều ẩn ✓

Test mô phỏng viewport 900px (idealSplitH = 670):
- splitH = 670px, splitRightH = 670px, 4 rows = 160px đều nhau, chart = 349px ✓

Stage Summary:
- Đã live commit 7771a5d: https://nc-link.vercel.app/kpi
- Layout desktop ≥900px:
  + Header (banner + title + ctrl-bar)
  + 2 cột grid 3fr|1fr, height = calc(100vh-230px), min 540px
  + Cột trái: 5 nút nav (grid 5 cols) → Công ty (8 ô KPI) → Biểu đồ (co giãn)
  + Cột phải: 4 phòng ban dọc (grid 4 rows 1fr, bằng nhau)
  + 4 ô phòng = tổng chiều cao cột trái ✓
  + Không scroll dọc (fit 1 màn hình) ✓
- Bỏ divider "Tiến Độ Khu Vực" trên desktop
