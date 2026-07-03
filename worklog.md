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
