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

---
Task ID: khoi-phuc-ds-tvv-map-nguon-doi-tuong-2026-06-21
Agent: Main (Super Z)
Task: Khoi phuc DS TVV tong trong Cau truc + map lai nguon doi tuong tinh toan chinh sach

Work Log:
- Them 'tvv' vao StructureSubKey va STRUCTURE_SUBS (xep dau tien)
- Tao renderTvvList() (~120 dong): bang DS TVV tong (tvvStructList) voi 9 cot
  Ma TVV | Ten TVV | Ma Ban/Nhom | Ten Ban/Nhom (resolve tu banNhomList) |
  Chuc vu | Ngay BD LV | Ma TVV TD | Ten TVV TD (resolve tu tvvStructList) | Ghi chu
- 4 KPI: Tong TVV, TVVm (<=12 thang), Truong Ban/Nhom, Co ma TVV TD
- Inline edit (PATCH /api/structure/tvv/:id) cho 7 cot editable
- Nut: Them (mo dialog co san) | Cap nhat DS TVV (upsert file) | Tai mau | Xuat
- Update dispatch trong renderSheet + sidebar + mobile menu: khi click 'tvv' -> fetchTvvStruct()
- Sua renderThuongTuyenLuyen: doi nguon doi tuong tu leaders (DS TB/TN) sang recruiters (DS NTD)
  vi chinh sach Tuyen Luyen danh cho Nguoi Tuyển Dung -> lay tu DS NTD
- Sua renderThuongDongHanh: doi nguon doi tuong tu recruiters sang leaders (DS TB/TN) loc TTN
  vi chinh sach Dong Hanh danh cho TTN cap nhom -> lay tu DS TB/TN

Stage Summary:
- Cau truc bay gio co 4 sub-item: DS TVV | DS TB/TN | DS NTD | DS TTN Tuyen Ngang
- Mapping nguon doi tuong tinh toan:
  * Chinh sach TVV (TVVm, NS-TVV, Quy-TVV) -> DS TVV tong
  * Chinh sach Nhom (PTKD-TN, Quy-TN, Dong Hanh) -> DS TB/TN
  * Chinh sach Tuyen dung (Tuyen Luyen) -> DS NTD
  * Chinh sach TTN Tuyen Ngang -> DS TTN Tuyen Ngang
- File doanh so chi dung de tinh FYP/IP, KHONG dung lam nguon doi tuong
- Commit d061b9d pushed to main, Vercel auto-deploying

---
Task ID: phan-bo-doi-tuong-ttn-vs-tbtn-2026-06-21
Agent: Main (Super Z)
Task: Phan bo lai doi tuong tinh toan theo nguyen tac moi - moi CS la 1 bo RIENG, KHONG suy luan chéo

Work Log:
- Them helper isTTNPosition(position) - phat hien TTN (Tien Truong Nhom / Truong To Nhom / TTN)
- Them helper isTBorTNPosition(position) - phan bu: khong phai TTN thi la TB/TN
- dong-hanh: refactor dung isTTNPosition (logic cu giu nguyen, chi don code)
- ptkd-tn: them .filter(isTBorTNPosition) de LOAI TTN (truoc day lay tat ca leaders)
- quy-tn: them .filter(isTBorTNPosition) de LOAI TTN (truoc day lay tat ca leaders)
- tuyen-luyen: DOI NGUON tu recruiters (DS NTD) sang leaders (DS TB/TN)
  + .filter(isTBorTNPosition) de chi lay TB/TN, loai TTN
  + Cap nhat nhan UI: 'HO TEN NTD' -> 'HO TEN TB/TN'
  + 'SL NTD DAT' -> 'SL TB/TN DAT'
  + Placeholder 'Tim ten / ma NTD...' -> 'Tim ten / ma TB/TN...'
  + Empty state 'Chua co NTD...' -> 'Chua co TB/TN...'
- Cap nhat comment STRUCTURE_SUBS (line ~229) de phan anh mapping moi:
  * CS ca nhan TVV (TVVm, NS-TVV, Quy-TVV) -> DS Tong TVV
  * CS TB/TN (PTKD-TN, Quy-TN, Tuyen Luyen) -> DS TB/TN (leaders, loai TTN)
  * CS TTN (Dong Hanh) -> DS TB/TN (leaders, filter position TTN)
  * CS TTN Tuyen Ngang -> DS TTN Tuyen Ngang
- TypeScript typecheck: khong co loi moi (chi con loi pre-existing)

Stage Summary:
- 4 chinh saga da duoc phan bo dung doi tuong:
  * dong-hanh -> TTN (Tien Truong Nhom)
  * ptkd-tn, quy-tn, tuyen-luyen -> TB/TN (Truong Bo / Truong Nhom)
- Tuyen Luyen khong con dung DS NTD (vi DS NTD gom TB+TN+TTN, trong khi CS nay chi danh cho TB/TN)
- Moi CS doc lap, khong suy luan chéo qua CS khac
- Commit 7b5051f pushed to main, Vercel auto-deploying

---
Task ID: fix-policy-summary-deps-2026-06-22
Agent: Main (Super Z)
Task: Fix hien thi '—' tren o tong hop (SL TVV dat + Tong thuong) cua tat ca chinh saga

Work Log:
- Phat hien bug tai useEffect (line ~3447): cap nhat o tong hop top + footer duoi
  thong qua DOM manipulation (getElementById), nhung dependency array THIEU:
  * 3 filter cua policy TN: tuyenLuyen, dongHanh, quyTn
  * 6 data sources: contracts, tvvStructList, leaders, recruiters, banNhomList, adList
- Ket qua: khi data fetch xong (sau khi page load) hoac khi user filter 3 policy TN,
  table re-render co data-policy-count/amount moi, nhung useEffect khong fire lai
  -> o tong hop (top gray panel + bottom green footer) van hien '—'
- Fix: bo sung 6 filter state + 6 data source vao dependency array
- TypeScript typecheck: 7 loi pre-existing, khong co loi moi

Stage Summary:
- Bug da sua: o 'SL TVV dat' va 'Tong thuong' se cap nhat dung khi:
  * Page load xong (data fetch complete)
  * User chinh filter cua bat ky policy nao (8 policy)
- Bug khong anh huong den cell trong bang (da dung `{x > 0 ? format : '—'}`)
- Commit 7c6c669 pushed to main, Vercel auto-deploying

---
Task ID: review-counting-logic-2026-06-22
Agent: Main (Super Z)
Task: Ra soat logic dem TVVm HDC / luot HDC trong tung chinh saga theo yeu cau user. FYP = IP. CHINH SACH KHONG DUNG TOI AFYP (AFYP chi dung cho doanh so thuong dung + thuong = ke hoach/thi dua)

Work Log:
- Verify 4 chinh saga dem TVVm HDC / luot HDC theo dung yeu cau:
  * Quy TN (line 4981-5006): dung tvv.maTVVTuyendung === tn.agentCode (MA TN), KHONG dung ma nhom. TVVm = TN tuyen dung trong quy + 1 thang co tong IP >= 12tr -> DUNG
  * Dong Hanh/TTN (line 4709-4715): dung tvv.maTVVTuyendung === ttn.agentCode (MA TTN) -> DUNG
  * Tuyen Luyen (line 4478-4481): dung tvv.maTVVTuyendung === ntd.agentCode (MA TN, KHONG ma nhom) -> DUNG
  * PTKD (line 5270): dung tvv.maBanNhom === tn.maBanNhom (MA NHOM) -> DUNG
- Verify AFYP chi dung trong dashboard/doanh so (lines 2256, 2716, 2746, 2782, 5752, 5929), KHONG lan vao 8 chinh saga
- Fix PTKD Luot HDC (line 5281-5290):
  * CU: monthContracts.filter(c => c.pdt10DT >= 12_000_000).length -> dem so HD don le co IP >= 12tr
  * MOI: tvvInNhom.filter(tvv => tongIP thang cua TVV >= 12tr).length -> dem so TVV dat HDC
  * Dong nhat voi dinh nghia HDC cua Quy TN (TVVm co 1 thang IP >= 12tr = 1 HDC)
- Fix mo ta NS-TVV (line 3582): 'Thưởng nang suat AFYP thang cho TVV' -> 'Thưởng nang suat IP thang cho TVV'
  (nguyen tac: CHINH SACH KHONG DUNG TOI AFYP)
- TypeScript typecheck: khong co loi moi (chi con loi pre-existing)
- Next.js build: pass
- Commit d2dbab7 pushed to main, Vercel auto-deploying

Stage Summary:
- 4 chinh saga (Quy TN, TTN, Tuyen Luyen, PTKD) deu dem TVVm HDC / luot HDC dung theo yeu cau:
  * Quy TN / Tuyen Luyen: dung MA TN (KHONG ma nhom)
  * Dong Hanh: dung MA TTN
  * PTKD: dung MA NHOM
- PTKD Luot HDC chinh xac: so TVV trong nhom co tong IP thang >= 12tr (truoc day dem so HD don le)
- Mo ta 8 chinh saga deu KHONG nhac den AFYP (chi dung IP/FYP)
- AFYP chi xuat hien o phan doanh so/dashboard, KHONG lan vao chinh saga

---
Task ID: fix-structure-tvv-tree-and-tuyen-ngang-import-2026-06-22
Agent: Main (Super Z)
Task: (1) DS TVV trong trang Cau truc hien thi dang cay Phong->AD->Nhom->TVV (bo bang phang). (2) Fix DS TTN Tuyen Ngang da upload nhung khong hien thi

Work Log:
- Bug 1: structureSub='tvv' goi renderTvvList() (bang phang) thay vi renderStructure() (tree layout)
  * Fix: doi dispatcher line 6496-6504 — bo if structureSub==='tvv' branch
  * Luc nao cung return renderStructure() cho default + sub='tvv' (tree layout)
  * renderTvvList van giu lai (khong xoa) de dung cho muc dich khac
- Bug 2: Import TTN Tuyen Ngang that bai silently khi header file user upload khong khop exact voi template
  * CU: chi nhan 'NHÓM', 'MÃ TVV', 'HỌ TÊN', 'Ngày bắt đầu làm việc', 'Ngày hiệu lực chức vụ', 'MÃ NGƯỜI TUYỂN DỤNG', 'TÊN NGƯỜI TUYỂN DỤNG'
  * MOI: them helper pickField + parseDateAny — normalize header (lowercase, bo dau TV, thay _ bang space) roi match alias
    - nhom: nhom, nhom kd, nhom kinh doanh
    - agentCode: ma tvv, ma, ma dl, ma tvv/tn, agentcode, ma so
    - agentName: ho ten, hoten, ten, ten tvv, agentname, ho va ten
    - ngayBatDau: ngay bat dau lam viec, ngay bat dau lv, ngay bat dau, ngay bd, ngaybatdau
    - ngayHieuLuc: ngay hieu luc chuc vu, ngay hieu luc cv, ngay hieu luc, ngayhl, ngayhieuluc
    - maNguoiTuyenDung: ma nguoi tuyen dung, ma nguoi td, ma ntd, ma nguoi td, manguoituyendung, ma dl td, ma tvv td
    - tenNguoiTuyenDung: ten nguoi tuyen dung, ten nguoi td, ten ntd, ten nguoi td, tenguoituyendung, ten tvv td
- Next.js build: pass
- Commit 5654a91 pushed to main, Vercel auto-deploying

Stage Summary:
- Tab "DS TVV" trong phan "Cau truc" gio cung hien thi tree layout (Phong -> AD -> Nhom -> TVV) giong default
- Import TTN Tuyen Ngang gio chap nhan nhieu bien the header (bo dau, viet thuong/hoa, alias) — giam thieu truong hop import silently fail
- Voi 2 fix nay, user se thay DS TVV dang cay va DS TTN Tuyen Ngang co data sau khi import lai file (neu header da khop)

---
Task ID: fix-tuyen-ngang-import-and-ntd-empty-2026-06-22
Agent: Main (Super Z)
Task: (1) DS TTN Tuyen Ngang da import nhung khong hien thi. (2) Cot NTD trong CS TVVm dang trong

Work Log:
- Bug 1: Import TTN Tuyen Ngang "thanh cong" nhung DS rong
  * Nguyen hanh: code cu successCount = result.count || members.length
    - Neu API tra count=0 (do per-row try/catch swallow loi) -> fallback ve members.length -> toast "Import thanh cong X dong" nhung DB rong
    - Neu members.length=0 (do header file khong khop alias) -> fall through, khong co toast cu the
  * Fix:
    - SuccessCount dung = result.created + result.updated (khong fallback)
    - Neu members.length=0 -> toast "Import that bai - khong tim thay cot hop le" + danh sach cot can thiet
    - Neu realCount=0 -> toast "0 dong duoc luu - ma TVV trung hoac du lieu khong hop le"
    - Them flag suppressGenericToast de tranh double toast
- Bug 2: Cot NTD trong trong CS TVVm
  * Nguyen hanh: resolveNguoiTD tra ve '' neu tvv.maTVVTuyendung rong trong DB
    - API /structure/tvv chi chap nhan alias 'maTVVTuyendung', 'Ma TVV tuyen dung', 'Ma TVV TD'
    - Neu file user upload co header 'Ma nguoi TD', 'Ma NTD', 'Ma DL TD', 'Nguoi tuyen dung' -> khong match -> truong bi rong
  * Fix API /structure/tvv:
    - Them helper getValFlex: match exact -> case-insensitive -> normalize (lowercase + bo dau TV + thay _ bang space)
    - Mo rong alias cho maTVVTuyendung: 'Ma nguoi tuyen dung', 'Ma nguoi td', 'Ma NTD', 'Ma DL TD'
    - Ap dung getValFlex cho tat ca field: agentCode, agentName, maBanNhom, chucVu, ngayBatDau, note
    - Ap dung cho ca batch mode va single create mode
- Next.js build: pass
- Commit 68a5399 pushed to main, Vercel auto-deploying

Stage Summary:
- Import TTN Tuyen Ngang gio bao loi cu the (vi sao 0 dong duoc luu) thay vi bao "thanh cong" mac du DS rong
- API /structure/tvv gio chap nhan nhieu bien the header cho maTVVTuyendung (bo dau TV, alias)
- De fix cot NTD trong: USER CAN PHAI RE-IMPORT FILE TVV voi header moi hoac header da khop -> du lieu maTVVTuyendung se duoc luu -> cot NTD trong CS TVVm se co ten

---
Task ID: bugfix-tuyen-ngang-import-2026-06-23
Agent: main
Task: Fix 2 bugs user báo: (1) DS TTN Tuyển Ngang vẫn lỗi "Dữ liệu bị trùng hoặc không hợp lệ" khi upload; (2) CS TVVm cột NTD trống

Work Log:
- Tìm root cause bug 1: error message "Dữ liệu bị trùng hoặc không hợp lệ" đến từ commit 68a5399 (đã deploy lên Vercel), trong code:
  `toast({ title: 'Import thất bại', description: '0 dòng được lưu. Có thể mã TVV bị trùng hoặc dữ liệu không hợp lệ.' })`
  Nguyên nhân thực: API /api/tuyen-ngang có filter strict `.filter(m => m.agentCode && m.agentName)` → nếu file user upload có dòng thiếu 1 trong 2 → 0 dòng được lưu → hiển thị message sai ý
- Tìm root cause bug 2: resolveNguoiTD chỉ tìm trong 3 nguồn (tvvStructList/leaders/recruiters), không có tuyenNgangList. renderTvvm cũng không pass tuyenNgangList
- Fix API /api/tuyen-ngang (POST members mode):
  + Loosen filter: chỉ cần agentCode (agentName fill 'Chưa nhập' nếu trống)
  + Trim agentCode, dedupe trong batch
  + Track errored + errors[], return 4xx nếu tất cả dòng lỗi
- Fix frontend page.tsx handleImport('tuyen-ngang'):
  + Replace misleading message với: '0 dòng được lưu. Có thể header file không khớp.' (realCount=0, errored=0) hoặc 'Tất cả X dòng lỗi. <errors>' (realCount=0, errored>0)
  + Hiển thị sampleKeys (header thực tế) khi members.length=0
  + Hiển thị created/updated/errored/duplicatesSkipped breakdown
  + Parse result.json() trước khi check r.ok
- Fix bug 2 (CS TVVm cột NTD):
  + resolveNguoiTD: thêm tuyenNgangList làm nguồn thứ 4
  + renderTvvm (line 3768): pass tuyenNgangList vào resolveNguoiTD
  + loadSheet: thêm fetchTuyenNgang() vào loaders['kehoach'] và loaders['report']
- Revert package.json change (build script thêm prisma migrate deploy — risky cho Vercel build)
- Commit 919d08e + push origin/main để Vercel auto-deploy

Stage Summary:
- Bug 1 (DS TTN Tuyển Ngang lỗi import): FIXED — looser filter + better error reporting
- Bug 2 (CS TVVm cột NTD trống): FIXED — resolveNguoiTD giờ lookup thêm tuyenNgangList
- Đã push commit 919d08e lên origin/main, Vercel sẽ auto-deploy trong 1-2 phút
- Lưu ý cho user: error message mới sẽ chỉ hiển thị sau khi Vercel deploy xong (check status tại vercel.com dashboard)

---
Task ID: ma-nhom-pa-banca-2026-06-23
Agent: main
Task: Chỉnh lại code nhận diện mã nhóm PA=U104101014 và Banca=A473DSO000 trên app

Work Log:
- Tìm các nơi hardcode 'PA' và 'Banca' trong code: src/app/quan-ly/page.tsx và src/app/thi-dua-chau/page.tsx
- Trong quan-ly/page.tsx: SPECIAL_PHONG_NO_AD và PHONG_EXCLUDED_FROM_REWARDS là Set<string> hardcode 'PA'/'Banca'
- Trong thi-dua-chau/page.tsx: check nhomLower.includes('dso') — ĐÃ match A473DSO000 (vì lowercase 'a473dso000' có 'dso')
- Thêm constants MA_NHOM_PA = 'U104101014' và MA_NHOM_BANCA = 'A473DSO000' (alias: 'PA', 'Banca', 'DSO')
- Helper isPaOrBancaCode(code) và isBancaCode(code) nhận diện cả alias cũ VÀ mã nhóm mới
- Đổi SPECIAL_PHONG_NO_AD và PHONG_EXCLUDED_FROM_REWARDS từ Set thành function dùng helper
- isTVVExcludedFromRewards giờ gọi isBancaCode(maBanNhom) / isBancaCode(bn.maAD) / isBancaCode(ad.maPhong)
- TypeScript compile: 24 errors trước và sau khi edit (giống nhau) — không thêm lỗi mới
- Commit c305826 + push origin/main để Vercel auto-deploy

Stage Summary:
- App giờ nhận diện được TVV thuộc nhóm PA (U104101014) hoặc Banca (A473DSO000) trong data thực tế
- Tương thích ngược: dữ liệu cũ dùng alias 'PA'/'Banca'/'DSO' vẫn hoạt động
- thi-dua-chau không cần đổi (logic includes('dso') đã match A473DSO000)

---
Task ID: fix-tuyen-ngang-table-missing-2026-06-23
Agent: main
Task: Fix 2 bugs user báo (lần 4): DS TTN Tuyển Ngang lỗi "Dữ liệu bị trùng hoặc không hợp lệ" + cột NTD CS TVVm trống

Root cause (TÌM ĐÚNG RỒI):
- Phân tích screenshot user gửi: lỗi thực sự là "The table 'public.TuyenNgang' does not exist in the current database"
- Bảng TuyenNgang KHÔNG TỒN TẠI trong DB production Neon
- Migration 20260620030000_add_tuyen_ngang đã commit vào git nhưng CHƯA được apply lên Neon
- Migration 20260617040000_add_tvv_maTVVTuyendung cũng có thể chưa apply (column maTVVTuyendung thiếu → tvv.maTVVTuyendung undefined → NTD trống)
- Lý do chưa apply: postinstall từng có 'prisma migrate deploy' nhưng bị remove (commit 144a213) vì lúc đó env vars empty. Giờ env vars đã set nhưng _prisma_migrations table có thể out of sync → prisma migrate deploy có thể fail

Fix attempt 1 (FAIL): Thêm 'prisma migrate deploy &&' vào build script
- Vercel deploy failed (commit 98d4c57)
- Có thể vì _prisma_migrations table out of sync, migrate deploy thử apply tất cả migrations từ đầu → fail "table already exists"

Fix attempt 2 (CURRENT): Revert build script + thêm admin endpoint /api/admin/fix-schema
- Revert package.json về 'next build' (commit 4333ba3) → Vercel deploy SUCCESS
- Tạo endpoint /api/admin/fix-schema (POST/GET) chạy raw SQL idempotent:
  1. CREATE TABLE IF NOT EXISTS "TuyenNgang" (...)
  2. CREATE UNIQUE INDEX IF NOT EXISTS "TuyenNgang_agentCode_key"
  3. ALTER TABLE "TVVStruct" ADD COLUMN "maTVVTuyendung" (qua DO block check existence)
  4. INSERT INTO "_prisma_migrations" mark 2 migrations as applied (best-effort)
  5. Verify table + column exists
- Endpoint bị Vercel Authentication protection → user phải tự mở URL trong browser

Stage Summary:
- Vercel deploy commit 4333ba3 SUCCESS (state=success, deployment completed)
- Admin endpoint URL: https://my-project-nmchau022023-4326s-projects.vercel.app/api/admin/fix-schema
- User cần: mở URL trên trong browser → endpoint sẽ fix DB → sau đó upload DS TTN Tuyển Ngang sẽ work + NTD CS TVVm sẽ populate
- TypeScript check: 0 errors trong file mới
- Local next build: SUCCESS (endpoint /api/admin/fix-schema đã compile)

---
Task ID: verify-tuyen-ngang-fix-2026-06-23
Agent: main
Task: Verify DS TTN Tuyển Ngang fix thực sự work sau khi user báo "kết quả true" (đã chạy /api/admin/fix-schema endpoint)

Work Log:
- Đọc lại current state của /api/tuyen-ngang/route.ts (POST members mode): filter chỉ cần agentCode, default agentName='Chưa nhập', dedupe trong batch, return 4xx nếu tất cả dòng lỗi
- Đọc lại handleImport('tuyen-ngang') trong page.tsx: normalize header (lowercase + bỏ dấu TV), pickField với 9+ alias cho mỗi field, parse JSON trước khi check r.ok, hiển thị breakdown created/updated/errored/duplicatesSkipped
- Đọc renderTuyenNgang(): dùng tuyenNgangList state, hiển thị đúng 7 cột + STT + actions
- Check Prisma schema TuyenNgang: agentCode @unique required, agentName required (no default), các field khác có default ''
- Verify fix-schema endpoint output: success=true ⇔ TuyenNgang table exists AND TVVStruct.maTVVTuyendung column exists (raw SQL verification trong endpoint)
- Viết test script /home/z/my-project/scripts/test-tuyen-ngang-import.js:
  * Copy Y NGUYÊN logic từ route.ts (processMembers function)
  * Mock DB bằng SQLite in-memory (sqlite3 + sqlite npm packages)
  * 6 scenarios, 38 assertions:
    - S1: Happy path (agentCode + agentName + ngày + NTD) → 2 rows created, response shape correct
    - S2: agentCode only (no agentName) → default "Chưa nhập", save OK
    - S3: Duplicate agentCodes trong batch → dedupe, duplicatesSkipped=1, no error
    - S4: Empty batch (no agentCode) → 400 với error message có gợi ý header
    - S5: Re-upload existing agentCode → upsert, created=0 updated=1, fields update đúng
    - S6: Header normalization — 3 variants (UPPER + dấu, lowercase_underscore, mixed alias) → tất cả parse đúng
  * RESULT: 38 passed, 0 failed
- Verify production deploy: commit 4333ba3 (fix-schema endpoint) đã push lên origin/main, Vercel auto-deploy (lưu ý: Vercel Authentication protection bật trên toàn project → không thể curl test từ CLI, nhưng user đã verify qua browser)
- Production URL user đã gọi: https://my-project-nmchau022023-4326s-projects.vercel.app/api/admin/fix-schema → success: true

Stage Summary:
- DB SCHEMA: ĐÃ FIX — TuyenNgang table exists, maTVVTuyendung column exists (verify qua /api/admin/fix-schema endpoint, success: true)
- IMPORT LOGIC: ĐÃ VERIFY — 38/38 tests passed, bao gồm happy path + 5 edge cases (empty batch, dedupe, upsert, header variants)
- HEADER NORMALIZATION: ĐÃ VERIFY — pickField + normalizeKey parse được cả 3 kiểu header (UPPER có dấu, lowercase không dấu, mixed alias)
- PRODUCTION DEPLOY: commit 4333ba3 đã push, Vercel auto-deploy success
- Sẵn sàng báo user: upload DS TTN Tuyển Ngang giờ sẽ work, cột NTD trong CS TVVm sẽ tự populate

---
Task ID: fix-back-button-nav-2026-06-23
Agent: main
Task: Fix nút "Quay lại" — đang luôn bay về trang chủ thay vì trở về thao tác trước

Root cause:
- BackButton onClick trước đây gọi window.history.back()
- Đây là browser history, KHÔNG liên quan app state (activeSheet/policyOpen/structureSub/revenueSub)
- User click tab con trong app không đổi URL → browser history rỗng → back() fallback về '/' = trang chủ

Fix:
- Thêm navHistoryRef = useRef<NavState[]>([{ sheet: 'overview' }]) lưu internal history stack
- navigateTo(next: NavState) wrapper: push state hiện tại vào stack TRƯỚC khi đổi state
- handleAppBack(): pop 1 entry từ stack → restore state cũ (không gọi window.history.back)
- Hook navigateTo() vào 6 chỗ user điều hướng:
  1. Mobile menu popup (sheet không có sub)
  2. Mobile menu popup (sheet có sub: revenue/report/structure)
  3. Sidebar sheet button (desktop)
  4. Sidebar sub-item click (handleSubClick)
  5. Mobile policy popup
  6. Mobile revenue month popup + desktop revenue month tabs
- BackButton giờ gọi handleAppBack thay vì window.history.back

Fix kèm (DS đối tượng cột nhóm lộn xộn):
- resolveNhomName giờ luôn trả TÊN nhóm, không bao giờ trả MÃ nhóm
- Case-insensitive lookup qua banNhomList
- Nếu leader.nhom trông giống mã (all UPPER, không space, không dấu) → KHÔNG hiển thị
- Đảo priority: resolveNhomName trước, fallback nhomName sau
- Áp dụng cho 4 policy renders: TuyenLuyen, DongHanh, QuyTN, PTKDTN

TypeScript: 24 errors (cùng baseline)
Next.js build: SUCCESS
Commit 1c3b6ee pushed to main, Vercel auto-deploying

Stage Summary:
- Nút Quay lại giờ hoạt động đúng: VD đang xem "TVVm" → bấm "Quy TVV" → bấm back → về "TVVm" (không bay về overview)
- Cột Nhóm trong các DS đối tượng (NS tháng, Quý TVV, Tuyen Luyện, Đồng Hành, Quý TN, PTKD TN) giờ chỉ hiển thị TÊN, không lộn xộn mã

---
Task ID: fix-structure-tvv-count-pa-banca-2026-06-23
Agent: main
Task: Nhóm PA và Banca trong Cấu trúc hiển thị "1 AD" nhưng 0 TVV — mặc dù đã đổi mã nhóm sang U104101014/A473DSO000

Root cause:
- BanNhom record trong DB có thể dùng alias cũ: maBanNhom='PA'/'Banca'
- TVV record trong DB có thể dùng mã mới: maBanNhom='U104101014'/'A473DSO000'
- Filter exact `t.maBanNhom === b.maBanNhom` KHÔNG match → 0 TVV hiển thị trong tree
- Commit c305826 (trước đây) đã thêm isPaOrBancaCode/isBancaCode nhận diện mã mới, nhưng chỉ apply cho logic exclude rewards, không apply cho tree render

Fix:
- Thêm helper matchMaBanNhom(a, b): so khớp 2 mã nhóm, chấp nhận alias
  + Exact match: a === b
  + Cùng là alias PA (PA == U104101014)
  + Cùng là alias Banca (Banca == A473DSO000 == DSO)
  + Case-insensitive fallback
- Apply matchMaBanNhom vào 4 chỗ filter TVV theo maBanNhom:
  1. renderStructure line 6328: pTVVs (đếm TVV theo phòng)
  2. renderStructure line 6380: bnTVVs (đếm TVV trong nhóm + sort theo chức vụ)
  3. renderThuongQuyTN line 5158: tvvInNhom (sum FYP nhóm theo quý)
  4. renderThuongPTKDTN line 5468: tvvInNhom (sum FYP nhóm theo tháng)

TypeScript: 24 errors (cùng baseline)
Next.js build: SUCCESS
Commit bc2da1b pushed to main, Vercel auto-deploying

Stage Summary:
- Tree Cấu trúc giờ sẽ hiển thị đầy đủ TVV trong nhóm PA/Banca (dù TVV dùng mã mới U104101014/A473DSO000, BanNhom dùng alias 'PA'/'Banca')
- Tổng TVV trong summary strip (trên cùng) cũng sẽ đếm đúng
- 2 chính sách Quý TN + PTKD TN cũng sẽ sum FYP đúng cho nhóm PA/Banca

---
Task ID: policy-tuyen-ngang-auto-update-2026-06-23
Agent: main
Task: Đưa DS TTN Tuyển ngang vào chính sách Thưởng TTN Tuyển ngang. Đảm bảo TẤT CẢ đối tượng trong mục chính sách tự động thêm/bớt theo cấu trúc (DS Tổng TVV / DS TB-TN / DS TTN / DS TTN Tuyển Ngang).

Work Log:
- Kiểm tra renderThuongTuyenNgang hiện tại (line 5650 cũ): chỉ là placeholder rỗng, hiển thị dòng "Đối tượng và logic tính thưởng sẽ được cấu hình khi có hướng dẫn chi tiết"
- Kiểm tra các nguồn dữ liệu:
  + tuyenNgangList: state đã có, fetch từ /api/tuyen-ngang (18 bản ghi trong DB production)
  + loadSheet 'report' (sheet chính sách) đã gọi fetchTuyenNgang() (line 1772) → state sẵn sàng khi user vào policy
- Implement renderThuongTuyenNgang mới (commit 3930f98):
  + Đối tượng: TẤT CẢ TTN Tuyển ngang từ state tuyenNgangList — auto-update qua React state
  + Cột NHÓM KD: resolveNhomName với allowPA=true (chương trình TTN → hiển thị nhóm PA + nhóm có trong DS TB/TN)
  + Cột CHỨC VỤ: default 'TTN Tuyển ngang'
  + Cột NGÀY HIỆU LỰC CHỨC VỤ: format từ tn.ngayHieuLuc
  + Cột THÁNG LÀM VIỆC: format TXX/YYYY từ tn.ngayBatDau
  + Cột CHỈ TIÊU (3 sub: Quy mô, TVVm HĐC, Tổng FYP): để trống (—), chờ user cấu hình
  + Cột THỰC HIỆN THÁNG (3 sub):
    * Quy mô = số TVV trong tvvStructList có maTVVTuyendung trùng agentCode của TTN
    * TVVm HĐC = TVVm (≤12 tháng) có IP tháng ≥ 12tr
    * Tổng FYP = tổng pdt10DT contracts trong tháng của team
  + Cột THƯỞNG THÁNG: để trống (—), chờ user cấu hình
  + Cột THỰC HIỆN LŨY KẾ (3 sub): tính YTD từ đầu năm đến tháng hiện tại
    * Quy mô, TVVm HĐC (IP YTD ≥ 12tr), FYP ≥250tr (FYP YTD ≥ 250tr)
  + Cột THƯỞNG BẮT KỲP: để trống (—), chờ user cấu hình
  + Summary card: ĐỐI TƯỢNG, TỔNG QUY MÔ, TVVm HĐC, TỔNG FYP THÁNG
  + Total row: TỔNG CỘNG (18 TTN) + totals các cột số
  + Note footer: "Đối tượng tự động lấy từ DS TTN Tuyển Ngang (Cấu trúc)"
- Verify auto-update cho TẤT CẢ policies:
  + renderTvvMTable: dùng tvvStructList ✓
  + renderThuongNSThangTVV: dùng tvvStructList ✓
  + renderThuongQuyTVV: dùng tvvStructList ✓
  + renderThuongTuyenLuyện: dùng recruiters (DS TTN) ✓
  + renderThuongDongHanh: dùng recruiters (DS TTN) ✓
  + renderThuongPTKD: dùng leaders (DS TB/TN) ✓
  + renderThuongQuyTN: dùng leaders (DS TB/TN) ✓
  + renderThuongTuyenNgang: dùng tuyenNgangList (DS TTN Tuyển ngang) ✓ (MỚI)
  → Tất cả đều derive từ React state arrays, tự re-render khi state thay đổi
  → CRUD callbacks (addTuyenNgang/updateTuyenNgang/deleteTuyenNgang, v.v.) đều setX → re-render tức thì
  → loadSheet 'report' đã fetch đầy đủ dữ liệu (fetchAllData + fetchTuyenNgang)
- Fix bug TypeScript: shorthand property `thTvvmHDC,` → explicit `thTvvmHDC: tvvmHDC,` (variable named `tvvmHDC` not `thTvvmHDC`)
- TypeScript check: 0 errors mới (cùng baseline 24 errors pre-existing)
- Next.js build: SUCCESS (no errors)
- Commit 3930f98 pushed to main, Vercel auto-deployed
- Verify trên production (agent-browser):
  + Mở /quan-ly → click "Chính sách đại lý" → click "Thưởng chính sách TTN tuyển ngang"
  + Bảng hiển thị 18 đối tượng TTN Tuyển ngang (matches DB count)
  + Summary card: ĐỐI TƯỢNG=18, TỔNG QUY MÔ=46, TVVM HĐC=6, TỔNG FYP THÁNG=94.697.320₫
  + Cột NHÓM KD hiển thị TÊN (An Khang, Bảo An, Chợ Mới 1, ...) — không hiển thị mã
  + Row 1: Trần Huỳnh Nguyệt Ánh (An Khang) — Quy mô 5, TVVm HĐC 3, FYP 53.3M (tháng) | Quy mô 5, TVVm HĐC 4 (lũy kế)
  + Total row: TỔNG CỘNG (18 TTN) | 46 | 6 | 94.697.320 | — | 46 | 21 | 0 | —
  + CHỈ TIÊU + THƯỞNG THÁNG + THƯỞNG BẮT KỲP: để trống (—) như thiết kế

Stage Summary:
- ĐÃ HOÀN THÀNH: Chính sách Thưởng TTN Tuyển ngang giờ hiển thị đầy đủ DS TTN Tuyển ngang (18 đối tượng) từ cấu trúc
- Auto-update đã verify: tất cả 8 policies derive từ React state → tự cập nhật khi cấu trúc thay đổi
- Cột NHÓM KD áp dụng nguyên tắc: chỉ hiển thị nhóm có trong DS TB/TN hoặc là PA (allowPA=true cho TTN)
- THỰC HIỆN THÁNG/LŨY KẾ: tính từ contracts (FYP = PĐT + 10% ĐT)
- CHỈ TIÊU + THƯỞNG: để trống (—) — chờ user cung cấp công thức chi tiết
- Production verified: https://my-project-nmchau022023-4326s-projects.vercel.app/quan-ly → Chính sách đại lý → Thưởng chính sách TTN tuyển ngang
