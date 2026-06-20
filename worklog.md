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

---
Task ID: chinh-sach-redesign-2026-06-19
Agent: Main (Super Z)
Task: Redesign chinh sach tables - top section silver bg, remove total rows, fix summary numbers bug

Work Log:
- renderPolicy container redesign:
  - Right panel bg: rgba(255,255,255,0.16) → solid silver #D1D5DB
  - 2 summary boxes: solid colors #059669 + #D97706 with 1px solid border + shadow
  - Container bg: solid #0F172A (was rgba)
  - Footer: flex-shrink-0 (was absolute bottom-2) — no overlap, fixed at bottom of flex container
  - TVV policies: filter + search using flex-1 (equal heights)
  - TN policies: 2 info boxes balanced (same height as TVV filter+search)
- useEffect fix:
  - OLD: copy textContent from #policy-total-${key} (which was NEVER updated by render functions — bug!)
  - NEW: read data-policy-count + data-policy-amount from each table outer div
  - Update BOTH #policy-count-${key} + #policy-total-${key} (top boxes) AND #policy-fixed-count + #policy-fixed-amount (footer)
- 8 policy tables updated:
  - Added data-policy-count + data-policy-amount to outer div
  - Removed policy-total-row block (footer handles totals)
  - Standardized header font: text-[13px] h-9 / text-[14px] h-10 → text-[11px] h-8 (TVVm standard)
  - Standardized body font: text-[12px] → text-[11px]
  - Added border-b border-gray-300 to all data rows (solid dividers between rows)
- Cleaned up 7 broken HTML spots (orphaned </td> <td> </tr> from non-greedy regex match)

Stage Summary:
- Top section: silver solid bg + balanced layout (TVV: filter+search, TN: 2 info boxes)
- Tables: all 8 use text-[11px] h-8 header (TVVm standard), border-b solid dividers, NO total row
- Footer: flex-shrink-0 fixed at bottom (no overlap)
- Summary numbers bug FIXED: data-policy-count + data-policy-amount attributes drive both top boxes AND footer
- Build OK, commit e32f3c8 pushed to main, Vercel auto-deploying

---
Task ID: tinh-chinh-lan-3-2026-06-19
Agent: Main (Super Z)
Task: Fix bug số tổng hợp mobile, bỏ info boxes TN, xóa gap đen table-footer, to chữ menu + KPI

Work Log:
- BUG FIX: useEffect cập nhật 2 ô tổng hợp — textContent đang set raw number ("15000000") → mobile không hiển thị được do box quá hẹp. Đổi sang formatSmartCurrency(amountNum) → "15 trđ" gọn hiển thị tốt trên mobile
- Summary boxes: thêm break-all + text-[14px] mobile (sm:text-[16px]) → số hiện rõ trên panel hẹp
- BỎ 2 info boxes cho TN policy ("Áp dụng cho Trưởng nhóm/NTD" + item.desc) — user không biết là gì. Khi TN policy: 2 ô tổng hợp chuyển sang flex-1 flex-col, stack dọc fill đầy chiều cao panel phải (160px)
- XÓA GAP ĐEN giữa table và footer: container bỏ gap-1.5, chỉ giữ mb-1.5 giữa top section và table. Footer bỏ boxShadow '0 -4px 12px ...' (shadow này chính là gap đen nhìn thấy). Footer nối liền table qua borderTop 2px solid #065F46
- Right panel mobile: w-1/3 → w-2/5 (rộng hơn cho 2 ô tổng hợp)
- PHẦN 1 mobile menu: label text-[9px] → text-[11px], icon w-4 → w-5, gap-0.5 → gap-1, minHeight 44 → 52px (chữ to hơn, dễ đọc)
- PHẦN 2 KPI: value text-sm sm:text-lg → text-base sm:text-xl (số to hơn). Padding py-2 sm:py-3 → py-1 sm:py-1.5 (giảm padding bù lại → kích thước ô không đổi)

Stage Summary:
- Số tổng hợp giờ hiển thị đúng trên mobile (formatSmartCurrency "15 trđ" thay vì "15000000")
- TN policy: gọn hơn, 2 ô tổng hợp to dọc fill panel
- Bảng - footer: liền mạch không gap đen
- Menu mobile: chữ to dễ đọc
- KPI: số to hơn, ô giữ nguyên kích thước
- Commit c531877 pushed to main, Vercel auto-deploying

---
Task ID: tinh-chinh-lan-4-2026-06-19
Agent: Main (Super Z)
Task: Format tổng thưởng mobile theo trđ + SL TVV đạt chỉ đếm TVV có thưởng > 0

Work Log:
- THÊM helper formatPolicyAmountForBox(amount):
  - Mobile: trả về số dạng trđ KHÔNG kèm chữ "trđ" — vd 15.500.000 → "15,5"; 350.000.000 → "350"; 1.500.000.000 → "1.500"
  - Desktop: trả về full format "100.000.000" (vi-VN thousands separator, không kèm đơn vị)
- useEffect: dùng formatPolicyAmountForBox thay formatSmartCurrency → mobile giờ hiện "15,5" vừa ô, không tràn
- Ô Tổng thưởng box: text-[14px] → text-[12px] mobile (desktop vẫn 16px), thêm class truncate để chấm nếu dài
- 8 chính sách — data-policy-count chỉ đếm TVV/NTD có thưởng > 0 (trước đây đếm filteredRows.length = tất cả):
  - tvvm: tvvmDatThuongCount (thuongThang > 0 OR thuongChang > 0) — đã có sẵn
  - ns-tvv: tvvDatThuong (achievedTier >= 0) — đã có sẵn
  - quy-tvv: tvvDatThuong — đã có sẵn
  - tuyen-luyen: ntdDatThuongCount = filteredRows.filter(r => r.tienThuong > 0).length — THÊM MỚI
  - dong-hanh: ttnDatThuongCount = filteredRows.filter(r => r.tongTienThuong > 0).length — THÊM MỚI
  - quy-tn: tnDatThuong — đã có sẵn
  - ptkd-tn: ptkdDatThuongCount = filteredRows.filter(r => r.tienThuong > 0).length — THÊM MỚI
  - tuyen-ngang: 0 (bảng chưa có data, trước đây reference filteredRows undefined → hardcode 0)

Stage Summary:
- Mobile: ô Tổng thưởng giờ hiện số trđ ngắn (vd "15,5") → vừa ô, không tràn
- Desktop: ô Tổng thưởng hiện full format "100.000.000"
- SL TVV đạt giờ đếm ĐÚNG: chỉ TVV/NTD có tiền thưởng > 0, không phải tổng số dòng
- Commit 8e506a9 pushed to main, Vercel auto-deploying

---
Task ID: tinh-chinh-lan-5-2026-06-19
Agent: Main (Super Z)
Task: Ô tiền thưởng thiết kế mới (nền trắng + chip vàng chỉ icon) + NS-TVV T5/T6 khác màu nhẹ

Work Log:
- THÊM helper renderThuongCellContent(amount, fontSize='13px', fontWeight=800):
  - Render nội dung ô TIỀN THƯỞNG / TỔNG TIỀN THƯỞNG đồng nhất
  - Chip 18×18 bg #FEF3C7 (vàng nhạt) chỉ quanh icon 💰, không quanh số tiền
  - Số tiền: chữ XANH LÁ #047857 in đậm, to hơn body 1 chút (13px vs 11px)
  - Trả về '—' xám nếu amount = 0
- 10 ô tiền thưởng trên 7 bảng cập nhật:
  - TVVm: THƯỞNG THÁNG + THƯỞNG CHẶNG (td bg white, fontSize 13px)
  - Quý TVV: TIỀN THƯỞNG
  - NS-TVV: TIỀN THƯỞNG
  - Tuyên Luyện: TIỀN THƯỞNG
  - Đồng Hành: THƯỞNG ĐỒNG HÀNH + THƯỞNG VƯỢT TRỘI + TỔNG TIỀN THƯỞNG (TỔNG dùng fontSize 14px fontWeight 900)
  - Quý TN: TIỀN THƯỞNG
  - PTKD: TIỀN THƯỞNG (td bg THUONG_BG vàng → white)
- NS-TVV header TỔNG IP 2 cột:
  - Đổi 'TỔNG IP<br/><span>Tháng 5</span>' → 'TỔNG IP T5' (T5 cùng dòng với TỔNG IP, viết tắt)
  - '(ĐK ≥ 3 trđ)' giữ ở dòng 2 (chỉ cột T5)
  - 2 cột KHÁC MÀU nhẹ nhất:
    - T5 (tháng liền trước): header bg #DBEAFE (blue-100) text #1E3A8A, body bg #F0F7FF text #1E40AF
    - T6 (tháng hiện tại): header bg #E0E7FF (violet-100) text #4338CA, body bg #F5F3FF text #5B21B6

Stage Summary:
- Tất cả ô TIỀN THƯỞNG / TỔNG TIỀN THƯỞNG: nền trắng, chữ xanh đậm to hơn 1 chút, icon 💰 trong chip vàng nhỏ (chỉ icon có nền vàng)
- NS-TVV: 2 cột TỔNG IP khác màu rõ (T5 xanh dương nhạt, T6 tím nhạt) — cùng dòng header "TỔNG IP T5" / "TỔNG IP T6"
- Commit 7c07226 pushed to main, Vercel auto-deploying

---
Task ID: fix-ma-tuyen-dung-2026-06-20
Agent: Main (Super Z)
Task: Fix logic xac dinh nguoi tuyen DUY NHAT qua maTVVTuyendung (bo fallback)

Work Log:
- resolveNguoiTD: bo Priority 2/3 (contracts.maDaiLyTD, recruiters lookup) -> chi dung maTVVTuyendung. Neu trong -> tra rong.
- dong-hanh (renderThuongDongHanh): bo matching theo maBanNhom + nhomName fallback. Chi dung tvv.maTVVTuyendung === ttn.agentCode (trim ca 2 ben). Neu maTVVTuyendung trong -> bo qua TVV do.
- tuyen-luyen (renderThuongTuyenLuyen): bo fallback contracts.some(c => c.maDaiLyTD === ntd.agentCode). Chi dung tvv.maTVVTuyendung === ntd.agentCode.
- quy-tn (renderThuongQuyTN): bo fallback contracts.maDaiLyTD trong tvvmHDCByTN. Chi dung tvv.maTVVTuyendung === tn.agentCode. (Phan tong FYP quy van giu matching theo maBanNhom vi do la nhom membership, khong phai recruiter.)
- ptkd-tn: khong doi (chi dung maBanNhom cho nhom membership, khong tinh recruiter).
- tuyen-ngang: khong doi (placeholder chua co logic).

Stage Summary:
- 3 chinh sach recruiter (dong-hanh, tuyen-luyen, quy-tn) + helper resolveNguoiTD deu ap dung nguyen tac: maTVVTuyendung la duy nhat. Trong -> khong co nguoi tuyen.
- Commit 7e6741e pushed to main, Vercel auto-deploying.
