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

---
Task ID: fix-kpi-desktop-dept-cards-overflow
Agent: main
Task: Giao diện desktop KPI bên phòng ban bị mất (user paste screenshot 1446x776)

Work Log:
- User paste screenshot → VLM phân tích: 4 ô phòng ban hiển thị nhưng ô thứ 4 (BANCA-PA) thấp hơn 3 ô kia + có khoảng trắng
- Inspect live bằng agent-browser (viewport 1446x776) → phát hiện 2 vấn đề:
  1. **banca-separator ăn mất 15px**: card BANCA-PA = 126px, 3 card kia = 141px (lech 15px)
  2. **Tất cả 4 card overflow:hidden clipping content**: scrollH=148-201px vs clientH=136px
     → AD table bị clip về 6-14px (gần như vô hình)
- Nguyên nhân gốc (sau khi fix #1 vẫn overflow):
  + CSS compact trong @media (min-width: 900px) bị override bởi rules LỚN HƠN trong
    @media (min-width: 1400px) (line 1363-1386 cũ) — viewport 1446px match cả 2, rule sau thắng
  + Tại viewport 1446px: head=42px, afypRow=43px, summary=90px (2 row × 45px) → AD wrap chỉ còn 6px
- Fix #1 (commit 74c5007): ẩn .banca-separator trên desktop (rg-card.is-banca đã có border-top vàng)
- Fix #2 (commit d4661a5): compact rg-card typography trong @media (min-width: 1400px) và bỏ
  overrides trong @media (min-width: 1700px) để inherit compact từ ≥1400px
- Fix #3 (commit a2456da): summary từ 2x2 (65px) → 1 row 4-col (32px), tiết kiệm 33px cho AD table

Verify live (commit a2456da) bằng agent-browser (viewport 1446x776):
- 4 cards đều 141px (equal) ✓
- 4 cards đều overflow: ok (scrollH ≤ clientH) ✓
- Summary 1 row 4-col (PTKD 1-3) / 1 row 2-col (BANCA-PA) ✓
- AD wrap heights: PTKD 1=66px, PTKD 2=38px (có afyp row), PTKD 3=66px, BANCA=0 (no AD) ✓
- BANCA popup click → mở OK (popupDisplay: flex, z-index 200) ✓
- Nav buttons: "Chi tiết nhóm" → view-detail active ✓, "Kế hoạch khung" → view-calendar active ✓
- Mobile (390x844): desktopSplit display:none, layout mobile không bị break ✓
- VLM verify screenshot: "4 ô phòng ban, cả 3 PTKD đều có bảng AD, layout cân đối" ✓

Stage Summary:
- Đã live commit a2456da: https://nc-link.vercel.app/kpi
- 4 ô phòng ban bằng nhau (141px), không overflow, AD table hiển thị đầy đủ
- BANCA-PA card: 141px (bằng 3 card kia), border-top vàng phân biệt, click → popup
- Layout desktop fit 1 màn hình (600px = calc(100vh - 230px) at viewport 776px)
- Mobile không bị ảnh hưởng (CSS chỉ trong @media min-width 900px/1400px/1700px)

QUY TẮC CỐ ĐỊNH RÚT RA:
- Khi compact CSS trong @media (min-width: 900px) mà vẫn không có hiệu lực → kiểm tra
  xem có rules tương ứng trong @media (min-width: 1400px) và (min-width: 1700px) không
  → phải compact ở TẤT CẢ breakpoints, không chỉ ≥900px

---
Task ID: fix-thi-dua-subject-source-correct
Agent: main
Task: Sửa nguồn DS 4 nút đối tượng thi đua — TVVm chỉ 4, DS TB/TN sai

Work Log:
- User phàn nàn: TVVm chỉ 4 người, DS TB/TN chưa đúng, yêu cầu DS tự cập nhật khi sửa Cấu trúc
- Nguyên nhân gốc: subjectLists đang dùng /api/staff (26 records — chỉ DS TB/TN leaders) làm nguồn cho TVVm/TVV cũ
  → /api/staff KHÔNG phải DS TVV đầy đủ → TVVm chỉ đếm được 3-4 người có startDate ≤ 12 tháng trong 26 TB/TN
  → "TVV cũ" = 0 vì cả 26 đều có position TB/TN

- User nói rõ nguồn ĐÚNG (lấy từ mục Cấu trúc trang Quản lý):
  + TVVm + TVV cũ: /api/structure/tvv (DS TVV Cấu trúc, 2032 records) — lọc TVVm theo ngayBatDau ≤ 12 tháng
  + TN: /api/leaders (DS TB/TN Cấu trúc, 29 records) — lọc isTBorTNPosition
  + TTN: /api/recruiters (DS TTN Cấu trúc, 68 records) — không đổi

- Fix (commit 24d9162):
  + Thêm interface TVVStructItem (agentCode, agentName, maBanNhom, chucVu, ngayBatDau)
  + Thêm state tvvStructList + leadersList
  + Thêm fetchTvvStruct() + fetchLeaders()
  + Sync từ appData.structureTvv + appData.leaders trong useEffect
  + handleRefreshData cũng fetch tvvStruct + leaders
  + Sửa subjectLists useMemo:
    * TVVm: tvvStructList filter isTVVm(ngayBatDau) AND !isTTN AND !isTBorTN
    * TVV cũ: tvvStructList filter !isTVVm AND !isTTN AND !isTBorTN
    * TN: leadersList unique agentCode filter isTBorTNPosition
    * TTN: recruiterList (không đổi)
    * deps: [tvvStructList, leadersList, recruiterList]

- Auto-update: tvvStructList/leadersList/recruiterList sync từ AppDataContext.
  Khi user sửa DS TVV/DS TB/TN ở trang Quản lý → context reload → dataVersion bump
  → useEffect sync lại → subjectLists re-compute → 4 nút tự hiển thị số mới.

Verify live (commit 24d9162) bằng agent-browser:
- Click "DS đối tượng" mở dialog → 4 nút hiển thị:
  + TVVm: 225 (trước 4) ✓
  + TVV cũ: 1709 (trước 0) ✓
  + TTN: 68 (không đổi) ✓
  + TN: 29 (trước 26) ✓
- Match với tính toán độc lập từ API: tvvm=225, tvvCu=1709, tn=29, ttn=68 ✓

KPI desktop đánh giá (user paste screenshot 1909x1029):
- VLM phân tích: cột phải 4 ô bằng nhau 179px, không overflow ✓
- Nhưng BANCA-PA card content ít (chỉ afyp + 2 cells: Lượt, HĐ chuẩn) — vì là phòng Banca không có AD
- Layout đã cân đối, BANCA card nhỏ hơn về content là do tính chất phòng (không có AD table)

Stage Summary:
- Đã live commit 24d9162: https://nc-link.vercel.app/thi-dua-chau
- 4 nút đối tượng thi đua hiển thị số ĐÚNG từ nguồn Cấu trúc:
  + TVVm 225 / TVV cũ 1709 / TTN 68 / TN 29
- Tự động cập nhật khi user sửa Cấu trúc (qua AppDataContext + dataVersion)
- KHÔNG fallback, KHÔNG dùng /api/staff cho TVV, KHÔNG dùng Contracts

QUY TẮC CỐ ĐỊNH RÚT RA (bổ sung):
- /api/staff chỉ chứa 26 records DS TB/TN leaders → KHÔNG dùng làm nguồn DS TVV
- DS TVV đầy đủ (2000+) chỉ có ở /api/structure/tvv
- DS TB/TN đầy đủ (29) chỉ có ở /api/leaders
- Khi user nói "DS XX mục Cấu trúc" → dùng endpoint /api/structure/XX hoặc /api/leaders (TB/TN)
  /api/recruiters (TTN), KHÔNG dùng /api/staff

---
Task ID: fix-kpi-desktop-4-o-bang-nhau-v2
Agent: main
Task: User phàn nàn 4 ô phòng ban KHÔNG bằng nhau (lần fix trước không có hiệu lực)

Work Log:
- User: "ủa nhìn tắm hình như vậy mà nói 4 ô phòng bằng nhau hả" + "tao đang nói giao diện destop trang kpi"
- Verify VLM screenshot 1440x900: PTKD 1=180px, PTKD 2=220px (cao hơn), PTKD 3=180px, BANCA=120px → KHÔNG bằng nhau
- Root cause: `grid-template-rows: repeat(4, 1fr)` bị override bởi content size
  → 1fr mặc định = minmax(auto, 1fr) → row KHÔNG shrink dưới content
  → row có nhiều AD rows (PTKD 2) grow cao hơn row ít content (BANCA)
- Fix (commit 39f0971):
  + `split-right`: đổi `repeat(4, 1fr)` → `repeat(4, minmax(0, 1fr))` → row shrink được
  + `dept-section`: thêm `height: 100%` (chain từ grid row)
  + `rg-card`: thêm `height: 100%; overflow: hidden` (fill dept-section, không grow)
  + `rg-ad-wrap`: `flex: 1 1 0; min-height: 0; overflow-y: auto` (scroll khi nhiều AD)
  + `rg-head/afyp/prog/summary/divider`: `flex: 0 0 auto` (fixed, không shrink)

Verify VLM sau deploy (commit 39f0971, screenshot kpi-after-equal.png):
- Q: "viền dưới 4 ô cách đều nhau không?" → A: "CÓ, cách đều nhau"
- Q: "ô BANCA-PA có viền dưới chạm mép dưới cột không?" → A: "CÓ"
- Q: "chiều cao 4 ô có BẰNG NHAU không?" → A: "CÓ, ~180px"

Stage Summary:
- Đã live commit 39f0971: https://nc-link.vercel.app/kpi
- 4 ô phòng ban BẰNG NHAU chiều cao ~180px (1/4 split-right mỗi ô)
- BANCA-PA có ít content (chỉ header + afyp + 2-cell summary) nhưng card vẫn fill 100%
  nhờ height: 100% + display:flex column (empty space ở dưới, không ảnh hưởng layout)
- AD table scroll bên trong rg-ad-wrap khi có nhiều AD rows
- minmax(0, 1fr) là KEY: cho phép grid row shrink dưới content size

---
Task ID: fix-sl-tvv-banca-pa + review-afyp-kh
Agent: main
Task: 1) Fix SL TVV phòng Banca-PA = 0; 2) Review cách tính AFYP + KH hàng tháng

Work Log - Task 1 (SL TVV):
- User: SL TVV phòng Banca-PA vẫn đang là 0, đếm tổng TVV phòng/nhóm PA + Banca từ DS TVV cấu trúc
- Root cause: paTvvCount dùng bnToAdMap.get(t.maBanNhom) nhưng:
  + maBanNhom = 'U104101014' (PA group, 1062 TVV) có maAD='' trống trong DB
  + bnToAdMap không có entry cho 'U104101014' → 1062 TVV PA không được đếm
  + Chỉ có maBanNhom='PA' mới map được (nhưng không có TVV nào dùng code này)
- Fix (commit 19828e2):
  + Bỏ qua bnToAdMap, đếm trực tiếp TVV theo maBanNhom trong tập
    {PA, U104101014, BANCA, A473DSO000, DSO}
  + paTvvCount = 1062 (PA), bancaTvvCount = 1 (Banca)
  + bancaPaTvvTotal = 1063 (hiển thị trên card Banca-PA)
  + Label đổi từ 'SL TVV PA:' → 'SL TVV:' (card là Banca-PA merged)
- Verify live (commit 19828e2):
  + agent-browser eval: BANCA-PA card innerText = "Banca - PA...SL TVV: 1063..."
  + Khớp với tính toán độc lập từ API: 1062 PA + 1 Banca = 1063 ✓

Work Log - Task 2 (Review AFYP + KH):
- Phân tích code KPI page (line 2207-2445) và quan-ly page (line 3468-3537):

  A. AFYP calculation:
  - periodContracts = yearContracts (getDoanhSoMonth = issueDate, fallback effectiveDate)
    ∩ periodMonths (theo overviewPeriod: month/q/h/y)
  - afyp = Σ c.afyp cho contracts match AD (theo tenAD normalized)
  - Logic KHỚP với quan-ly: same getDoanhSoMonth, same periodMonths, same afyp field

  B. Độ lớn HĐ (doLonHD):
  - doLonHD = totalAFYP / totalLhd
  - totalAFYP = Σ afyp từ contracts match AD (per Phong)
  - totalLhd = count contracts có tinhLuot3tr >= 3,000,000 (per Phong)
  - Logic KHỚP với quan-ly (line 3508): totalRevenueAFYP / luotHoatDong

  C. KH hàng tháng:
  - AD: readAdMonthlyPlan(maAD, m) = onlineSettings[`nmc-kh-ad-${maAD}-t${mm}`]
  - Period KH cho AD = Σ monthly values cho các tháng trong period (KHÔNG dùng ratio)
  - Period KH cho Nhóm (popup) = annual × ratio (nmc-kh-ratio-${mm})
  - Logic KHỚP với quan-ly (line 3531-3537)

  D. VẤN ĐỀ PHÁT HIỆN (cần user quyết):
  1. KH stored annual ≠ Σ 12 monthly values (cho 6 AD PTKD):
     - AD Trí: annual=1.6B, monthly_sum=1.503B (diff -97M)
     - AD Long: annual=5.1B, monthly_sum=4.791B (diff -309M)
     - AD Có: annual=7.2B, monthly_sum=6.764B (diff -436M)
     - AD Trang: annual=5.8B, monthly_sum=5.449B (diff -351M)
     - AD Uy: annual=12.3B, monthly_sum=11.557B (diff -743M)
     - AD Danh: annual=6.0B, monthly_sum=5.636B (diff -364M)
     → Tổng chênh: ~2.3 tỷ VND (annual cao hơn monthly_sum)
     → KPI page hiển thị monthly_sum (thấp hơn)
     → Nguyên nhân có thể: user set annual trước, sau đó chỉnh monthly nhưng chưa sync
     → Tương tự cho Nhóm: annual stored vs (Σ ratio × annual)

  2. PA + Banca: KH = 0 (không có monthly values trong settings)
     → Card Banca-PA không hiển thị %KH, không có progress bar
     → Có thể user chưa set KH cho PA/Banca (vì là phòng đặc biệt)

  3. Ratio values có leading zeros: '08.50', '09.00', '010.50'
     → parseFloat xử lý OK (08.5=8.5, 010.5=10.5)
     → Nhưng format không chuẩn, nên clean về '8.5', '9', '10.5'

Stage Summary:
- SL TVV Banca-PA: 0 → 1063 (commit 19828e2, đã live)
- AFYP + KH calculation logic KHỚP với quan-ly (cùng nguồn data, cùng formulas)
- Phát hiện 3 vấn đề data (KH annual ≠ monthly_sum, PA/Banca chưa có KH, ratio leading zeros)
  → KHÔNG fix code mà báo user quyết (vì có thể là data issue, không phải code issue)

---
Task ID: fix-quan-ly-ke-hoach-don-vi-d
Agent: main
Task: Hiển thị trang Kế hoạch (quan-ly) ra đơn vị đ, xem KH tháng 7

Work Log:
- User paste screenshot trang Kế hoạch trên mobile, phàn nàn hiển thị "X tỷ" khó đọc
- VLM phân tích screenshot: giá trị hiển thị ở đơn vị "tỷ" (36 tỷ, 2 tỷ, 12 tỷ...) — không thấy giá trị chính xác
- Root cause: `formatSmartCurrency` rút gọn mobile (window.innerWidth < 768) → "X tỷ" / "Y trđ"
  + `fmtPlan` (KH tháng minimap) cũng rút gọn tương tự
  + `formatCurrency` dùng Intl.NumberFormat với currency VND → hiện ký hiệu "₫" (không phải "đ")

- Fix (commit 372cda0):
  + `formatCurrency`: bỏ Intl currency format, tự ghép " đ" vào cuối số
    → "36.000.000.000 đ" thay vì "36.000.000.000 ₫"
  + `formatSmartCurrency`: bỏ rút gọn mobile, luôn trả về `formatCurrency(amount)`
    → hiển thị đầy đủ đ trên mọi viewport
  + `fmtPlan`: bỏ rút gọn (X tỷ/Y trđ), luôn trả về `formatCurrency(val)`

- Verify KH tháng 7 từ API settings (live data):
  + AD Trí (L1006290346): 121.000.000 đ
  + AD Long (L1404181481): 544.000.000 đ
  + AD Có (L1404181482): 385.000.000 đ
  + AD Trang (L1905096997): 438.000.000 đ
  + AD Uy (L2404058202): 929.000.000 đ
  + AD Danh (L2503288327): 453.000.000 đ
  + PA + Banca: chưa set (0 đ)
  + TOTAL KH tháng 7 = 2.870.000.000 đ (2 tỷ 870 triệu) — = 8.5% × 33.8B (6 AD annual)

- Verify live sau deploy (commit 372cda0):
  + agent-browser eval: T7 context = "3.420.000.000 đ | T7 | 8.5% | 2.870.000.000 đ | T8..."
    → KH tháng 7 hiển thị "2.870.000.000 đ" ✓
  + Tổng KH công ty năm = 35.700.000.000 đ (7 số 0, hiển thị đầy đủ) ✓
  + Đơn vị: " đ" (chữ đ) thay vì "₫" ✓
  + Không còn rút gọn "X tỷ" trên mobile ✓

Stage Summary:
- Trang Kế hoạch (quan-ly) đã hiển thị đầy đủ đơn vị "đ" trên mọi viewport
- KH tháng 7 = 2.870.000.000 đ (2 tỷ 870 triệu)
- KH năm công ty = 35.700.000.000 đ (35 tỷ 700 triệu)
- PA + Banca chưa set KH tháng → hiển thị "—" (cần user set nếu muốn)

---
Task ID: fix-kpi-calendar-date-picker
Agent: main
Task: Sửa lỗi input[type=date] native ở form "Nhập kế hoạch khung" (trang KPI) — chọn ngày nào cũng tự nhảy về tháng 01

Work Log:
- User báo: ở form "Nhập kế hoạch" trang KPI, khi bấm vào ô ngày → picker native hiện ra → chọn ngày nào cũng tự nhảy về tháng 01
- Root cause: <input type="date"> native của trình duyệt. Trên iOS Safari / một số Android, khi chọn ngày từ picker native, value truyền về bị parse sai → auto về tháng 01
- Code gốc (line ~3838-3843 trong src/app/kpi/page.tsx):
    <input type="date" value={calEditForm.date} onChange={e => setCalEditForm(s => ({...s, date: e.target.value}))} />

Fix (commit 446cd6a):
- Tạo component CalDatePicker riêng (light theme, trắng/teal #008080 — match với .cal-field-input):
  + Trigger button hiển thị ngày dạng DD/MM/YYYY (vi-VN)
  + Popup render qua createPortal → document.body (tránh overflow/transform issue)
  + Lưới 7 cột (CN-T7), navigate tháng (‹ / ›), highlight today (rgba teal) + selected (solid teal)
  + Quick actions: "Hôm nay" (chọn ngày hiện tại) + "Xóa ngày" (clear value)
  + Đóng popup khi click ngoài hoặc click backdrop
- Thay <input type="date"> bằng <CalDatePicker value={calEditForm.date} onChange={...} />
- Thêm import { createPortal } from 'react-dom' (lúc đầu thiếu)
- Fix stale closure bug ở nút "Hôm nay": setViewMonth là async, handleDaySelect dùng viewMonth từ closure (stale) → sai tháng. Fix bằng cách thêm yOverride/mOverride params cho handleDaySelect, truyền today.getFullYear()/getMonth() trực tiếp

Verify local (commit 446cd6a):
- agent-browser eval: không còn input[type=date], có button "01/07/2026" ✓
- Mở popup → hiển thị "Tháng 7 2026", 31 ngày ✓
- Click day 15 → button hiện "15/07/2026", popup đóng ✓
- Navigate sang T8 → "Tháng 8 2026", click day 20 → "20/08/2026" ✓
- Click "Hôm nay" → "06/07/2026" (đúng, không bị stale closure) ✓
- Click "Xóa ngày" → "Chọn ngày..." (empty) ✓

Verify production (commit 446cd6a, sau Vercel auto-deploy ~95s):
- Mở form "Nhập kế hoạch" trên https://nc-link.vercel.app/kpi
- hasNativeDateInput: false, hasCustomPicker: true, customPickerText: "01/07/2026" ✓
- Navigate T7→T8, click day 20 → "20/08/2026" ✓ (không bị nhảy về tháng 01 nữa)

Stage Summary:
- Bug native <input type="date"> → auto về tháng 01: FIXED
- Custom CalDatePicker kiểm soát hoàn toàn giá trị YYYY-MM-DD, không phụ thuộc trình duyệt
- Style match với form trắng/teal hiện có
- Hỗ trợ: navigate tháng, "Hôm nay", "Xóa ngày", click ngoài để đóng
- Đã live trên production: https://nc-link.vercel.app/kpi
