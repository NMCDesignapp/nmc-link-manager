# Thi đua: audit tùy chọn và tính nhất quán — 2026-10-20

Phạm vi: Main App, kết quả chương trình đã lưu, KPI dùng chung chương trình, xuất Excel và sao chép. Đây là kiểm tra mã và dữ liệu tổng hợp giả lập; không phải xác nhận từng hợp đồng thật hay chứng nhận toàn bộ số tiền thưởng production.

## Các lỗi được sửa

- Bản sửa trước đó (PR #207): tắt tính cá nhân NTD/TTN nhưng HĐ cá nhân còn lọt vào nguồn chi tiết và căn cứ thưởng phần trăm.
- GĐ2 Hiệu lực đến được lưu nhưng không lọc. Nay là giới hạn trên bổ sung, giao với ngày kết thúc chung; ngày cuối tính đủ hết ngày.
- Tổng thưởng GĐ2 có thể bỏ qua điều kiện bổ sung, tính lượt Nhóm bằng IP hoặc mất tiền thưởng theo lượt.
- Đạt ở một giai đoạn có thể bị coi chưa đạt vì tổng cả kỳ vượt trần bậc thưởng. Nhận diện đạt/ẩn chưa đạt/TOP nay dùng bậc của các giai đoạn.
- Sheet Chi tiết HĐ và sao chép có thể dùng thưởng cả kỳ hoặc thiếu chặn điều kiện bổ sung trong khi bảng chính dùng hai giai đoạn.
- Lọc nhóm của bảng TVV đã lưu so sánh tên nhóm với mảng, dẫn đến lọc bằng mã thay vì tên đang chọn.
- Nguồn đối tượng giữa xem thử và chương trình lưu khác nhau: DS TN cho Nhóm; bổ sung TN vào nguồn NTD; TVV nhập tay phải thuộc Cấu trúc.
- Đếm TVV theo tổng IP+AFYP có thể áp nhầm ngưỡng tổng lên từng HĐ khi bật điều kiện bổ sung.
- Tổng thưởng TVV theo lượt không truyền số lượt cho loại thưởng tiền/lượt.

Không sửa bản ghi doanh thu, hợp đồng hay cấu hình chương trình đã lưu. Kết quả tính lại từ cấu hình và nguồn hiện có.

## Danh mục tùy chọn và bằng chứng

| Nhóm tùy chọn | Quy tắc kiểm tra | Bằng chứng / giới hạn |
|---|---|---|
| Hiệu lực từ/đến; phát hành từ/đến | Giao các khoảng, bao gồm ngày cuối; thiếu ngày PH không đạt ràng buộc PH | Runtime shared + callback tìm kiếm Main; contest-option-audit, contest-carryover |
| HĐ tồn tháng trước | Chỉ tham gia chương trình có giới hạn PH; chống trùng với nguồn thường; tách khỏi doanh thu | contest-carryover, carryover-sync, revenue-sheet-source, data-hub-carryover |
| TVV / Nhóm / NTD; danh sách đối tượng | Cấu trúc TVV, DS TN, DS tuyển dụng; DSO không tham gia | contest-option-audit, contest-ntd-contributions, contest-secondary-rounds |
| Tính cá nhân TN / NTD | Bật/tắt phải đổi cả nguồn, chỉ tiêu chính/phụ, căn cứ %, chi tiết | contest-ntd-contributions, contest-secondary-rounds, ttn-export-details |
| Toàn bộ TVV / TVVm của chính NTD | Không mượn HĐ/TVV của NTD khác; ngày LV tra từ Cấu trúc | contest-ntd-contributions, contest-secondary-rounds |
| Ngày hiệu lực chức vụ | Ngày LV bằng hoặc sau ngày chức vụ được tính; thiếu ngày LV bị loại khi có ràng buộc | contest-secondary-rounds; xem thử dùng chung filterDisplayContracts |
| IP/HĐ, AFYP/HĐ, Tổng IP, Tổng AFYP | Chỉ tiêu xét độc lập căn cứ thưởng IP | contest-secondary-rounds, contest-excel-matrix, contest-option-audit |
| Lượt HĐ, lượt chuẩn, TVVm, TVV90; ngưỡng tùy chỉnh | Lượt từ nguồn TÍNH LƯỢT; đúng tuổi nghề/ngưỡng, không lấy AFYP làm IP thưởng | contest-excel-matrix, contest-secondary-rounds, contest-option-audit |
| Điều kiện bổ sung | Mỗi ngưỡng tổng IP/AFYP, số HĐ có IP tối thiểu, lượt/lượt chuẩn phải đồng thời đạt; tắt công tắc không chặn thưởng | contest-option-audit, contest-secondary-rounds |
| Lọc IP/AFYP từng HĐ | Chỉ là ngưỡng từng HĐ ở chế độ tương ứng; không biến ngưỡng tổng TVV thành từng HĐ | contest-option-audit, contest-tvv-contract-count |
| Bậc Từ/Đến | Bao gồm hai biên, khoảng trống không tự đạt; phân biệt trần cả kỳ và từng giai đoạn | contest-secondary-rounds, contest-option-audit |
| Tiền, quà, %IP, %Tổng IP, %FYC, tiền/lượt, tiền/TVV | Ma trận TVV/Nhóm/NTD × 7 loại × bật/tắt GĐ2, kỳ vọng số tính độc lập | 42 ca contest-option-audit; kiểm tra tiền quà dùng bonusAmount, không xác minh giao quà thực tế |
| Hai giai đoạn, ngày GĐ2, hai bảng thưởng | Chia đúng mốc; thưởng GĐ1 + GĐ2; chung điều kiện phụ; không bị loại bởi trần cả kỳ | Callback thực tế phase2Results Main, shared stats, callback thưởng sheet chi tiết, ttn-export-details |
| TOP riêng IP/AFYP | Ngưỡng, số hạng, bậc theo thứ tự | computeTVVTotalRows và kiểm tra mã; không có đối soát thứ hạng HĐ thật |
| TOP bổ sung, ngưỡng đủ và tiền từng hạng | Chỉ đưa người đạt chính/phụ/đủ TOP vào pool; thưởng TOP tách riêng | contest-combined-top-ranking; callback thực tế Main/saved cho TVV/Nhóm/NTD trong GĐ2 |
| Đếm TVV đạt CT tham chiếu | Dùng kết quả điều kiện chính/phụ của từng TVV; không đếm trùng | contest-secondary-rounds |
| Đếm TVV tổng IP+AFYP | Cộng đủ HĐ mỗi TVV rồi xét đồng thời hai ngưỡng | contest-tvv-contract-count, contest-option-audit |
| Đếm TVV đủ N HĐ; tính/không TN | Mỗi HĐ đạt cả IP và AFYP, đếm HĐ riêng biệt; đủ N mới tính thưởng | contest-tvv-contract-count |
| TVV chưa đủ N HĐ | Vẫn thấy HĐ hợp lệ, không tăng SL TVV đạt/thưởng; đủ trước, còn lại giảm dần số HĐ rồi tên | contest-tvv-contract-count |
| Tuyển dụng, phạm vi TN/TTN, ngày LV/chức vụ, hoạt động cộng thêm | Nguồn tuyển dụng Cấu trúc, bỏ ghi chú x; ngưỡng tổng IP hoặc IP/HĐ và toán tử | contest-recruitment + kiểm tra mã; chưa đối soát chương trình tuyển dụng thật |
| Ẩn chưa đạt, lọc nhóm/tên | Không làm người không đạt nhận thưởng; nhận diện theo các giai đoạn; chọn nhiều nhóm bằng tên hoặc mã | contest-option-audit; kiểm tra render Main/saved; chưa có automation trình duyệt mọi tổ hợp |
| Poster/tên chương trình, nhãn, phân trang, định dạng Excel | Không thay nguồn/căn cứ thưởng; giữ số HĐ và subtotal khi mở rộng dòng | contest-excel-matrix, ttn-export-details; chưa chụp/so từng trang của mọi chương trình thật |

## Kiểm tra

```bash
node --experimental-strip-types --test tests/contest-*.test.ts tests/ttn-export-details.test.ts tests/carryover-sync.test.cjs tests/revenue-sheet-source.test.ts tests/data-hub-carryover.test.mjs tests/data-hub-revenue-rows.test.mjs
bash scripts/sync-kpi-app.sh --check
npm run build
```

`contest-option-audit.test.ts` trích AST và thực thi callback Main thực tế cho bộ lọc ngày, tổng hai giai đoạn, TOP và thưởng sheet Chi tiết HĐ; so với kết quả kỳ vọng và bộ tính saved. Không chỉ so hai bản sao công thức trong test.

Hai preview Main/KPI phải READY trước merge; sau merge kiểm tra alias production cùng SHA. Typecheck toàn repo còn lỗi có sẵn ở các module khác; không coi là toàn repo typecheck sạch.

## Việc chưa được xác nhận

Chưa đối soát toàn bộ HĐ production từng chương trình với nguồn Excel gốc; chưa xác nhận đã nhận đầy đủ dữ liệu Sheet tháng hiện tại từ Data Hub; chưa có kiểm thử giao diện tự động mọi tổ hợp. Không suy ra các nội dung này từ số ca test hay trạng thái build. Không tải hàng loạt payload hợp đồng để thay cho đối soát được giới hạn phạm vi.
