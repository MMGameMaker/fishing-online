# CL-A-02 — Kiểu dữ liệu contract

- **Worker:** Claude (Opus 5.5)
- **Branch / PR:** chưa có; code nằm trong working tree, chưa commit
- **Ngày gửi review:** 2026-11-09 (chưa có PR)
- **Spec áp dụng:** SPEC_CHUNG v0.3 (đang chờ duyệt, M0 chưa Đạt), config v0-test-2026-11-09-rental-03

## Đã làm

- Type cho request/response/event/mã lỗi SPEC mục 3-5 và type config.
- Type guard cho toàn bộ fixture và event.

## File thay đổi

- client-web/src/net/contract.ts, contractGuards.ts, contract.test.ts
- client-web/src/core/gameplayConfig.ts

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
| Test parse toàn bộ `api-samples.v0.json` và `gameplay-config.v0.json` qua type guard không lỗi | Đạt | `src/net/contract.test.ts`, 24 test; có test đếm đủ 6 mẫu HTTP và 14 mẫu hub |

## Lệch spec / giả định

- `NETWORK_ERROR` và `TIMEOUT` là mã chỉ có ở Client, không thuộc SPEC mục 5.

## Cần lead quyết

- `api-samples` còn `configVersion: v0-test-2026-11-06`, khác config hiện tại `v0-test-2026-11-09-rental-03`.
- `items` trong inventory và `quantity` trong `/shop/buy` còn sót sau khi bỏ thính.
- Fixture chưa có mẫu `/catalog`, `/me/codex`, `/me/history`.

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
