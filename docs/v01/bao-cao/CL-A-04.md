# CL-A-04 — Hub client

- **Worker:** Claude (Opus 5.5)
- **Branch / PR:** chưa có; code nằm trong working tree, chưa commit
- **Ngày gửi review:** 2026-11-09 (chưa có PR)
- **Spec áp dụng:** SPEC_CHUNG v0.3 (đang chờ duyệt, M0 chưa Đạt), config v0-test-2026-11-09-rental-03

## Đã làm

- `GameHub`: `invoke` tự thêm `requestId`, listener đăng ký trước `start()`, không trùng handler, phát `connectionState`.
- Nối lại theo 0, 1, 2, 5, 10 giây; sau khi nối lại gọi `JoinLake` lấy snapshot.

## File thay đổi

- client-web/src/net/GameHub.ts, signalrConnection.ts, GameHub.test.ts

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
| Test với hub giả | Đạt | `src/net/GameHub.test.ts`, 6 test |
| Tắt/bật Server dev thấy tự nối lại và nhận snapshot mới | Chưa chạy | Máy này chưa có .NET SDK/Docker. Luồng nối lại mới kiểm bằng hub giả |

## Lệch spec / giả định

- Ack `JoinLake` được đưa vào listener `LakeSnapshot`; nếu Server gửi thêm event thì áp lại, không gây sai state.

## Cần lead quyết

- không có

## Việc còn lại

- Chạy lại tiêu chí tắt/bật Server khi có Server dev.

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
