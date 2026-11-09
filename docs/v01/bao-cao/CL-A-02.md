# CL-A-02 — Kiểu dữ liệu contract

- **Worker:** Claude (Opus 5.5)
- **Branch / PR:** chưa có; code nằm trong working tree, chưa commit
- **Ngày gửi review:** 2026-11-09 (chưa có PR)
- **Spec áp dụng:** SPEC_CHUNG v0.7, config v0-test-2026-11-09-monitoring-05

## Đã làm

- Type cho request/response/event/mã lỗi SPEC mục 3-5 và config, theo SPEC 0.5: `SubmitFishingResult`, `RESULT_EXPIRED`, `deadlineAt`, `state: null`; bỏ `MinigameTap`, `TAP_REJECTED`.
- Type guard cho toàn bộ fixture và event.

## File thay đổi

- client-v0/src/online/net/contract.ts, contractGuards.ts, contract.test.ts
- client-v0/src/online/core/gameplayConfig.ts

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
| Parse toàn bộ fixture qua type guard không lỗi | Đạt | `contract.test.ts`, kiểm đủ 6 mẫu HTTP và 14 mẫu hub |

## Lệch spec / giả định

- `NETWORK_ERROR`, `TIMEOUT` là mã chỉ có ở Client.
- `/catalog` theo BE-A-05 là toàn bộ config trừ `spawn`, rộng hơn danh sách ở SPEC mục 3.

## Cần lead quyết

- `api-samples` còn `configVersion` cũ so với config.
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
