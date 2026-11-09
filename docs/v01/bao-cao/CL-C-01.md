# CL-C-01 — Lõi minigame TS

- **Worker:** Claude (Opus 5.5)
- **Branch / PR:** chưa có; code nằm trong working tree, chưa commit
- **Ngày gửi review:** 2026-11-09 (chưa có PR)
- **Spec áp dụng:** SPEC_CHUNG v0.3 (đang chờ duyệt, M0 chưa Đạt), config v0-test-2026-11-09-rental-03

## Đã làm

- `mulberry32`, `needlePos`, `createState`, `applyTap`, `remainingMs`, `isLost` theo SPEC 2.7; hàm thuần, state bất biến để hoàn tác được tap bị từ chối.

## File thay đổi

- client-web/src/fishing/minigameCore.ts, minigameCore.test.ts

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
| Trước khi có vector: seed 123456789 khớp 5 số tham chiếu | Đạt | Test "khớp 5 số tham chiếu SPEC 2.7" |
| Vitest chạy toàn bộ `minigame-vectors.v0.json` | Chưa chạy | File vector do BE-B-07 tạo, chưa có |

## Lệch spec / giả định

- HP không chặn ở 0 trong core theo đúng SPEC (`hp ≤ 0` là thắng); UI tự chặn khi hiển thị.

## Cần lead quyết

- không có

## Việc còn lại

- Thêm test vector khi BE-B-07 xong.

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
