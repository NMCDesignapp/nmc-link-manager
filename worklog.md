# Work Log: Redesign Quản Lý Page Overview & Monthly Sections

## Date: 2026-03-05

## Changes Made

### 1. Added `formatSmartCurrency` helper function
- Location: Lines ~227-236 (after `formatNumber`)
- Mobile (< 768px): Shows currency in trđ/tỷ/ngàn units (e.g., "1.35 trđ")
- Desktop (>= 768px): Shows full format using `formatCurrency` (e.g., "1.350.000 ₫")
- Applied to all currency values in overview cards and monthly section

### 2. Fixed SL TB/TN card data source
- Changed from `totalLeaders` (leaders.length) to `totalStaff` (staff.length)
- Staff is the DS TB/TN from quản lý, which is the correct source

### 3. Fixed SL Tuyển dụng calculation
- Changed from counting `tvvStructList` entries with `ngayBatDau` in current year
- Now counts from `yearContracts` where `ngayBatDauLamViec` is in current year
- Uses contract data instead of TVV structure data

### 4. Redesigned Overview Cards (Tổng quan)
- Solid bright/metallic gradient backgrounds instead of semi-transparent:
  - AFYP: `from-amber-100 to-amber-50`
  - IP: `from-emerald-100 to-emerald-50`
  - Tỷ trọng: `from-cyan-100 to-cyan-50`
  - Lượt HĐ: `from-violet-100 to-violet-50`
  - Lượt HĐ chuẩn: `from-rose-100 to-rose-50`
  - SL HĐ: `from-amber-100 to-amber-50`
  - Năng suất: `from-sky-100 to-sky-50`
  - ĐLHĐ: `from-emerald-100 to-emerald-50`
  - SL TB/TN: `from-violet-100 to-violet-50`
  - SL NTD: `from-orange-100 to-orange-50`
  - SL Tuyển dụng: `from-teal-100 to-teal-50`
- Centered content (`text-center`)
- Removed border-radius (`rounded-[2px]` max)
- Added shadow (`shadow-md`)
- Dark text colors for readability (`text-gray-900`, `text-gray-700`)
- Added % completion in TOP-RIGHT corner of card (large font `text-lg font-bold`)
- Percentage hidden when no target is set
- Fixed progress bar styling (bg-gray-200 track, emerald-600 fill)

### 5. Redesigned Monthly Plan Cards (12 ô nhỏ)
- Same design style as overview: solid bright colors, centered, no rounded corners
- White background container with `bg-white` and `shadow-md`
- Amber gradient for month cells: `from-amber-50 to-white`
- Added % completion prominently in each cell (top-right, `text-xs font-bold`)
- Made value text larger (`text-sm font-bold`)
- Current month highlighted with `ring-2 ring-amber-400`

### 6. Redesigned Chart (Biểu đồ)
- White background (`bg-white`) with `shadow-md` and `border border-gray-200`
- 2-column approach: Plan (Kế hoạch) as outline bar + Actual (Thực hiện) as filled bar
- Plan bars: `border-2 border-amber-400` (outline style)
- Actual bars: `bg-emerald-500` (reached), `bg-sky-500` (not reached)
- Legend with "Kế hoạch" and "Thực hiện" labels
- Grid lines with axis labels using `formatSmartCurrency`
- Professional look with clean axis labels

### 7. Redesigned Monthly File Section (Doanh số)
- Removed "SL TD" indicator card
- Removed "NTD HĐ" indicator card
- Remaining indicators use same style as overview (solid bright gradients, centered, `rounded-[2px]`, `shadow-md`)
- New layout: Indicators take 1/3 width on desktop (`lg:w-1/3`), table takes 2/3 (`lg:w-2/3`)
- On mobile: Indicators show as 2-column grid, table below
- Month sub-tab buttons redesigned to match light theme
- Select dropdown and buttons updated to light theme styling

### 8. Removed "Tính doanh thu" functionality
- Removed the "Tính doanh thu" button entirely from the revenue section
- The button called `/api/revenue/sync-from-contracts` - this API endpoint still exists but is no longer accessible from the UI

## Build Status
- Build: ✅ Successful
- Lint: ✅ No errors
- Git: ✅ Committed and pushed to main

---
Task ID: layout-balance-2026-06-19
Agent: Main (Super Z)
Task: Cân chỉnh 3 phần giao diện trang /quan-ly trên mobile + fix bug lưu ảnh chính sách

Work Log:
- PHẦN 1 (Mobile menu): đổi grid-cols-3 → grid-cols-4, thêm nút "Cài đặt" thứ 8 → lưới 4×2 cân đối, tất cả nút cùng kích thước aspect-square minHeight 44px
- PHẦN 2 (12 KPI cards): gộp 2 lưới (5+7) thành 1 lưới 12 ô, grid-cols-3 (mobile) × 4 hàng, grid-cols-6 (desktop) × 2 hàng, padding/font nhỏ lại
- PHẦN 3 (12 ô tháng): grid-cols-4 → grid-cols-3 (mobile) × 4 hàng, padding p-1, progress bar h-0.5, font nhỏ lại
- Đồng nhất style 3 phần: cùng p-3 + space-y-3 + border-white/10 + boxShadow '0 4px 14px rgba(0,0,0,0.4)' + backgroundColor #374151
- BUG FIX: savePolicyImage dùng method 'POST' nhưng /api/settings chỉ chấp nhận 'PUT' → ảnh chính sách KHÔNG BAO GIỜ được lưu server, mất khi refresh/đổi máy. Đổi sang PUT với body { [`policy-image-${key}`]: link } + check r.ok + toast lỗi
- Build OK, deploy Vercel qua git push origin main

Stage Summary:
- 3 phần trên mobile giờ cân đối: menu 8 ô (4×2), KPI 12 ô (3×4), tháng 12 ô (3×4)
- Ảnh chính sách giờ lưu server qua /api/settings (PUT), load lại từ fetch('/api/settings') khi mount — khi sang máy khác vẫn thấy ảnh
- File: src/app/quan-ly/page.tsx (53 insertions, 61 deletions)
- Commit: 0e8a0c2 pushed to main, Vercel auto-deploying

---
Task ID: tinh-chinh-lan-2-2026-06-19
Agent: Main (Super Z)
Task: Tinh chinh lan 2 trang /quan-ly overview

Work Log:
- PHẦN 2 (12 KPI): gap 1.5→2 (mobile), padding py-1→py-2, font 10px→sm; bo dong "Dong bo luc {time}" (da co o header)
- PHẦN 3 (12 thang): doi grid 3×4 → LIST view
  - Moi dong: [T1 28px] [KH amber] [TH sky] [% dat]
  - KH mau amber #F59E0B nhat quan
  - TH mau sky #0EA5E9 nhat quan
  - So to len (11px mobile / sm desktop)
  - Padding p-2/space-y-2 (nho hon PHẦN 2)
  - Them legend KH/TH
  - Bo progress bar, thay bang cot % dat ben phai
- Header: bo nut Cai dat tren mobile (hidden md:inline-flex) — giu cho desktop vi sidebar desktop khong co nut Cai dat
- Back button: doi href="/" → onClick history.back() — tro ve thao tac truoc (khong phai ve trang chu). Co fallback window.location.href='/' neu history empty

Stage Summary:
- PHẦN 2 to ra, PHẦN 3 nho lai → can doi hon
- 12 thang gio la list view doc, T1-T12 o cot trai, KH/TH 2 mau rieng biet de phan biet
- Back button hanh dong dung y nguoi dung
- Commit 81ba986 pushed to main, Vercel auto-deploying
