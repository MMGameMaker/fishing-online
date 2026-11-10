# CL-C-03 — Quăng, chờ, cá cắn

- **Worker:** Claude (Opus 5.5)
- **Branch / PR:** chưa có; bản đầu đã commit; luồng tự câu SPEC 0.8 còn trong working tree
- **Ngày gửi review:** 2026-11-09 (chưa có PR)
- **Spec áp dụng:** SPEC_CHUNG v0.8, config v0-test-2026-11-09-monitoring-05

## Đã làm

- SPEC 0.8: có ghế và ngồi xong là tự `CastLine`; thua hoặc bị hủy chờ 2 giây rồi câu lại; `CastLine` lỗi thử lại sau 5 giây; hết ghế thì dừng.
- `CastLine` → animation quăng, phao, nhân vật chờ.
- Bite → chấm than, nhân vật rung, phao chìm, âm báo tạm, vòng đếm theo `biteDeadlineAt`; bấm → `HookFish`; quá giờ → emoji buồn.

## File thay đổi

- client-v0/src/online/fishing/FishingFlow.ts, sound.ts

## Lệnh kiểm tra đã chạy

```
cd client-v0 && npm run typecheck && npm run lint:online && npm run test:online && npm run build
typecheck: không lỗi
lint: All matched files use Prettier code style!
test: Test Files 15 passed (15), Tests 183 passed (183)
build: built in 7.61s
npm ci: chỉ chạy --dry-run đạt, vì dev server client-v0 đang giữ file trong node_modules
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| SPEC 0.8: mua ghế xong tự quăng câu | Đạt với mock | Coral Cove: `waiting` đến khoảng 20 ms sau khi có phiên ghế và ngồi xong |
| SPEC 0.8: trượt hiện icon rồi khoảng 2 giây câu lại | Đạt với mock | missed_bite: icon `:(` còn ở giây 1, câu lại sau 2036 ms, icon đã tắt |
| Lệch giữa event bite và chấm than < 50 ms | Chưa đo | Chấm than đặt ngay trong handler event, chưa đo bằng công cụ; nút cập nhật ở khung hình kế tiếp |
| missed_bite hiện emoji buồn | Đạt | Đã chạy nhánh missed_bite; emoji buồn đã thấy ở nhánh thua cùng đoạn code |

## Lệch spec / giả định

- Trong scene Coral Cove dùng hoạt ảnh cần câu, phao và dấu ! sẵn có của nhân vật; người chơi khác chưa thấy vì mock chạy riêng từng tab.

## Cần lead quyết

- không có

## Việc còn lại

- Thay âm báo tạm khi ART-06 giao.

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
