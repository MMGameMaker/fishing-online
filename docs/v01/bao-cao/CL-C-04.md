# CL-C-04 — Màn minigame

- **Worker:** Claude (Opus 5.5)
- **Branch / PR:** chưa có; code nằm trong working tree, chưa commit
- **Ngày gửi review:** 2026-11-09 (chưa có PR)
- **Spec áp dụng:** SPEC_CHUNG v0.7, config v0-test-2026-11-09-monitoring-05

## Đã làm

- Thanh kim, vùng xanh/vàng, thanh khoảng cách, đồng hồ; bấm chuột, chạm hoặc Space xử lý cục bộ, không gửi tap.
- Kết thúc gửi một `SubmitFishingResult`, chờ settlement mới hiện cá/EXP. Mất response thì gửi lại cùng requestId, hết lượt thì tra snapshot.

## File thay đổi

- client-v0/src/online/fishing/MinigameScene.ts, submitResult.ts, submitResult.test.ts

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
| 60 fps trên máy tầm trung | Chưa chạy | Pane trình duyệt bị ẩn, không đo được khung hình thật |
| Ping giả 150 ms: thao tác không chờ ack, settlement không trùng | Đạt | `?mockPing=150`: 6 tap không gửi lệnh mạng, đúng 1 `SubmitFishingResult`; test gửi lặp chỉ 1 cá |
| Mỗi rarity khác nhau rõ về tốc độ/độ rộng | Đạt một phần | Tham số lấy từ config theo rarity; mới xem bằng mắt rarity epic |

## Lệch spec / giả định

- không có

## Cần lead quyết

- không có

## Việc còn lại

- Đo FPS và xem đủ 5 rarity trên máy thật.

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
