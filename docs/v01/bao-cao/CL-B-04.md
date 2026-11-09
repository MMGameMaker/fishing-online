# CL-B-04 — Điều khiển và đồng bộ di chuyển

- **Worker:** Claude (Opus 5.5)
- **Branch / PR:** chưa có; code nằm trong working tree, chưa commit
- **Ngày gửi review:** 2026-11-09 (chưa có PR)
- **Spec áp dụng:** SPEC_CHUNG v0.7, config v0-test-2026-11-09-monitoring-05

## Đã làm

- WASD/mũi tên, bấm để đi tới, joystick ảo trên thiết bị cảm ứng.
- Gửi `Move` tối đa 10 lần/giây và khi dừng; `PositionCorrected` đặt lại vị trí; người khác nội suy 100 ms; khóa khi đang câu và 3 giây popup; vòng tròn `roamRadius` khi giữ ghế.

## File thay đổi

- client-v0/src/online/scenes/lake/LakeScene.ts, movement.ts, movement.test.ts, Joystick.ts

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
| 2 tab thấy nhau đi mượt | Chưa chạy | Mock chạy riêng từng tab; mới thấy 3 bot, nội suy kiểm bằng test |
| Đi ra ngoài phạm vi ghế bị kéo về | Đạt với mock | Test MockBackend; luồng `PositionCorrected` đã chạy trên trình duyệt khi mua ghế |

## Lệch spec / giả định

- Joystick thử bằng màn hình giả lập cảm ứng, chưa thử trên điện thoại thật.

## Cần lead quyết

- không có

## Việc còn lại

- Thử 2 tab khi có Server thật.

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
