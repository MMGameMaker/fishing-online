# CL-B-05 — Ghế và mua vé

- **Worker:** Claude (Opus 5.5)
- **Branch / PR:** chưa có; code nằm trong working tree, chưa commit
- **Ngày gửi review:** 2026-11-09 (chưa có PR)
- **Spec áp dụng:** SPEC_CHUNG v0.7, config v0-test-2026-11-09-monitoring-05

## Đã làm

- Ghế đổi màu theo trạng thái, đếm ngược cooldown, tên người ngồi.
- Bấm ghế ở gần mở popup, ở xa tự đi tới; chọn thời lượng, tổng Gold, thanh toán. HUD đồng hồ, Gia hạn, Rời ghế có xác nhận, thông báo khi hết phiên.

## File thay đổi

- client-v0/src/online/scenes/lake/SeatMarkers.ts, SeatUi.ts, seatLogic.ts, seatLogic.test.ts, lake.css

## Lệnh kiểm tra đã chạy

```
cd client-v0 && npm run typecheck && npm run lint:online && npm run test:online && npm run build
typecheck: không lỗi
lint: All matched files use Prettier code style!
test: Test Files 15 passed (15), Tests 182 passed (182)
build: built in 7.25s
npm ci: chỉ chạy --dry-run đạt, vì dev server client-v0 đang giữ file trong node_modules
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| Mua 20 phút, gia hạn 10 phút được 30 phút | Đạt với mock | Test "mua 2 block rồi gia hạn 1 block"; trên giao diện đã mua và gia hạn +10 phút |
| Thiếu Gold không tăng thời gian | Đạt với mock | Test MockBackend |
| 2 tab mua cùng ghế | Chưa chạy | Cần Server thật |
| Đồng hồ lệch Server ≤ 1 giây | Chưa chạy | Cần Server thật |

## Lệch spec / giả định

- Trong scene Coral Cove, 20 ghế đẩu là 20 ghế thuê; thuê xong nhân vật ngồi yên trên ghế bằng hoạt ảnh của scene, không đi lại trong `roamRadius` như GAMEPLAY_SCOPE.
- Tối đa 6 block trên giao diện vì min/max chưa chốt; Server vẫn là nơi kiểm tra.
- Khóa nút Rời ghế khi đang câu vì người chơi không có lệnh hủy.
- Bảng lỗi HTTP mock chưa tính bước kiểm tra ở gần ghế phía Server.

## Cần lead quyết

- Chốt min/max thời lượng và bảng giá cuối.

## Việc còn lại

- không có

---

## Review (reviewer điền)

- **Reviewer:** <tên>  **Ngày:** <yyyy-mm-dd>

| # | Kết quả | Ghi chú |
| --- | --- | --- |
| R1 Phạm vi | | |
| R2 Build/lint | | |
| R3 Test | | |
| R4 Nghiệm thu | | |
| R5 Contract | | |
| R6 Không hard-code | | |
| R7 Server quyết định | | |
| R8 Migration | | |
| R9 Báo cáo trung thực | | |
| R10 Lệch spec | | |

**Kết luận:** Đạt / Làm lại. <danh sách lỗi nếu Làm lại>
