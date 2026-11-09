# CL-A-05 — Kho state

- **Worker:** Claude (Opus 5.5)
- **Branch / PR:** chưa có; code nằm trong working tree, chưa commit
- **Ngày gửi review:** 2026-11-09 (chưa có PR)
- **Spec áp dụng:** SPEC_CHUNG v0.3 (đang chờ duyệt, M0 chưa Đạt), config v0-test-2026-11-09-rental-03

## Đã làm

- Store có `subscribe`/`select`, reducer thuần cho mọi event SPEC mục 4 và phản hồi HTTP.
- Gold chỉ lấy từ giá trị Server gửi.

## File thay đổi

- client-web/src/state/store.ts, bindHub.ts, store.test.ts

## Lệnh kiểm tra đã chạy

```
cd client-web && npm ci && npm run lint && npm test && npm run build
npm ci: added 173 packages
lint: All matched files use Prettier code style!
test: Test Files 8 passed (8), Tests 123 passed (123)
build: built in 4.08s
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| Áp chuỗi event mẫu → state đúng | Đạt | Test "áp chuỗi event mẫu của một lần câu" |
| `SeatChanged` cập nhật đúng ghế | Đạt | Test "SeatChanged chỉ cập nhật đúng ghế" |

## Lệch spec / giả định

- không có

## Cần lead quyết

- không có

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
