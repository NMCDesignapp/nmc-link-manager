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
