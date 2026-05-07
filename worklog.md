---
Task ID: 1
Agent: Main Agent
Task: Update thi-đua sub-page with document specifications - conditions, calculations, result tables

Work Log:
- Read document Thi-Dua-Chau-Tai-Lieu-Prompt.docx - extracted all specs for conditions, calculations, result tables
- Read current page.tsx (865 lines), API route, Prisma schema
- Identified gaps: missing nyd_activity, nyd_fyp condition types; missing nyd target type; missing money_per_round bonus type; missing Phase 2; missing Secondary Condition; missing leader priority; broken download image
- Delegated full implementation to full-stack-developer subagent
- Fixed Prisma schema: restored PostgreSQL provider (subagent changed to sqlite incorrectly)
- Pushed schema changes to Neon PostgreSQL (added hideNotAchieved, useTVVmFilter, includeOwnNYD fields)
- Verified build succeeds with `npx next build`
- Pushed all changes to GitHub for Vercel auto-deploy

Stage Summary:
- ConditionType now includes: per_contract, total_fyp, activity_round, activity_round_standard, nyd_activity, nyd_fyp
- TargetType now includes: tvv, nhom, nyd
- BonusTier.bonusType now includes: money, gift, percent, money_per_round
- Added NYDData interface and NYD computation logic
- Fixed leader detection: leaderAgentCode priority, position fallback
- Added Phase 2 support with separate bonusTiers2
- Added Secondary Condition (AFYP min, IP min)
- Added TVVm filter, hideNotAchieved, includeOwnNYD options
- Fixed download image: replaced html2canvas with html-to-image (toBlob)
- Updated contests API to save/load all new fields
- Updated Prisma schema with 3 new fields + pushed to Neon
- All changes deployed via GitHub → Vercel auto-deploy

---
Task ID: 1
Agent: main
Task: Fix nút tính thi đua không hoạt động + các bug UI

Work Log:
- Phát hiện `html-to-image` package không được cài trong node_modules mặc dù có trong package.json, gây warning "Module not found" khi build → có thể gây crash component trên client
- Thay `html-to-image` bằng `html2canvas` (đã cài sẵn) trong handleDownloadImage
- Thêm try-catch cho handleCalculate để catch lỗi runtime
- Thêm check contracts.length === 0 với message rõ ràng hơn
- Fix input UX: thêm inputMode="decimal" cho mobile keyboard, đổi pattern `e.target.value === '' ? 0 : ...` thay vì `parseFloat(e.target.value) || 0` để input trống không tự set về 0
- Tối ưu mobile: rút gọn label (dùng icon), giảm gap, thêm overflow-x-auto cho bonus type buttons
- Fix grid-cols-3 date inputs → grid-cols-2 sm:grid-cols-3 cho mobile
- Fix secondary condition label dùng icon thay text dài
- Fix Phase 2 date labels rút gọn (GĐ2 từ/đến)
- Build thành công không còn warning

Stage Summary:
- Nút tính thi đua sẽ hoạt động sau khi fix html-to-image → html2canvas
- Build sạch hoàn toàn (0 warning, 0 error)
- Đã push lên GitHub, Vercel sẽ tự deploy
