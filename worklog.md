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

---
Task ID: 1
Agent: main
Task: Fix "Tính thi đua" button not responding + fix pending issues

Work Log:
- Identified root cause: `Toaster` component was missing from layout.tsx, making toast notifications invisible
- Added `Toaster` import and component to `src/app/layout.tsx`
- Improved `handleCalculate` function with better error messages and `variant: 'destructive'` for error toasts
- Removed debug console.log statements from handleCalculate
- Added `overflow-x-hidden` to main container to prevent mobile overflow
- Optimized Condition radio buttons for mobile: added icons, reduced padding, smaller text
- Optimized Target radio buttons for mobile: shortened labels (TVV, Nhóm, NYD), smaller icons
- Verified build succeeds

Stage Summary:
- Key fix: Toaster added to layout so toast messages are now visible
- Button was working but feedback (toast) was invisible, making it appear unresponsive
- Mobile UI optimized with icons and compact labels
- All builds pass successfully
---
Task ID: 1-6
Agent: Main
Task: Add Staff reference table for thi đua calculation - fix missing TN with no sales

Work Log:
- Added Staff model to Prisma schema with fields: agentCode (unique), agentName, position, ban, nhom, maNhom, leaderAgentCode, recruiterCode, startDate
- Ran prisma db push to create Staff table in Neon DB
- Created /api/staff route (GET, POST bulk/single, DELETE all)
- Created /api/staff/[id] route (GET, PATCH, DELETE single)
- Modified /api/seed route to also extract unique agents and upsert to Staff table during CSV import
- Modified thi-dua page groupedData useMemo to use Staff as primary source for groups
  - Groups with no contracts now appear (0 FYP, 0 contracts) as long as they exist in Staff table
  - Leader info populated from Staff table (more reliable than inferring from contracts)
  - Backward compatible: if no staff data, falls back to contract-based group detection
- Modified nydData useMemo similarly to include NYDs from Staff table even without contracts
- Added StaffMember interface and staffList state to thi-dua page
- Added fetchStaff() call on mount and after sync
- Updated settings panel with new "Nhân sự" section:
  - Quick Actions: 4 buttons now (Thêm link, QL link, Nhân sự, Thống kê)
  - Staff management: add/edit/delete staff members
  - Staff list grouped by maNhom, expandable with leader info
  - Clear all staff option
- Added postinstall script for prisma generate on Vercel
- Created tag v1.2

Stage Summary:
- Staff model added to DB, migrated to Neon
- API routes for Staff CRUD created
- Thi đua calculation now uses Staff as reference table for group membership
- Groups/TNs with no sales still appear in thi đua results
- Settings panel has full staff management UI
- Pushed to GitHub, tag v1.2 created
