# CL-A-03 — HTTP client và phiên

- **Worker:** Claude (Opus 5.5)
- **Branch / PR:** chưa có; code nằm trong working tree, chưa commit
- **Ngày gửi review:** 2026-11-09 (chưa có PR)
- **Spec áp dụng:** SPEC_CHUNG v0.7, config v0-test-2026-11-09-monitoring-05

## Đã làm

- `ApiClient`: Authorization, Idempotency-Key cho POST/PUT giữ nguyên qua retry, timeout 10 giây, 401 → refresh một lần, lỗi `ApiError`.
- Access token chỉ giữ trong bộ nhớ; nhiều request cùng 401 chỉ refresh một lần.

## File thay đổi

- client-v0/src/online/net/ApiClient.ts, ApiClient.test.ts

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
| Retry dùng cùng key | Đạt | Test "retry giữ nguyên Idempotency-Key" |
| 401 → refresh → thành công | Đạt | Test "401 → refresh → thử lại thành công" |
| Lỗi 422 trả đúng code | Đạt | Test "lỗi 422 trả đúng code" |

## Lệch spec / giả định

- Retry tối đa 2 lần cho lỗi mạng/timeout/lỗi `retryable`; SPEC không nêu số lần.
- Chỉ kiểm tra với fetch giả và mock, chưa gọi Server thật.

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
