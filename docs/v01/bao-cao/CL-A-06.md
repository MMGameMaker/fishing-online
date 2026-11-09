# CL-A-06 — Mock server trong trình duyệt

- **Worker:** Claude (Opus 5.5)
- **Branch / PR:** chưa có; code nằm trong working tree, chưa commit
- **Ngày gửi review:** 2026-11-09 (chưa có PR)
- **Spec áp dụng:** SPEC_CHUNG v0.3 (đang chờ duyệt, M0 chưa Đạt), config v0-test-2026-11-09-rental-03

## Đã làm

- `MockBackend` thay fetch và kết nối hub: login, snapshot, mua/gia hạn/rời ghế, cooldown, câu cá, minigame dùng chung `minigameCore`, shop, bán cá, Codex, lịch sử.
- 3 bot, chữ MOCK ở góc màn hình, nút tua thời gian ghế x10, lỗi giả `?mockError=SEAT_TAKEN`.

## File thay đổi

- client-web/src/mock/MockBackend.ts, MockBackend.test.ts, rules.ts, createMock.ts, devOverlay.ts

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
| Chơi được trọn vòng với mock | Đạt một phần | Test "chơi trọn vòng" gọi đúng API/hub: mua ghế → câu thắng → túi, EXP, Codex → bán cá. Chưa có UI mua ghế/câu cá (CL-B-05, CL-C-02..04) |
| Mọi event mock khớp type `contract.ts` | Đạt | Mỗi test kiểm event qua `EVENT_GUARDS`, `badEvents` rỗng |

## Lệch spec / giả định

- Sau khi mua ghế, mock đưa nhân vật về vị trí ghế và gửi `PositionCorrected`; SPEC chưa quy định.
- Snapshot có cả người chơi hiện tại trong `players`.
- Nút x10 chỉ tăng tốc phiên ghế và cooldown, minigame giữ tốc độ thật.
- Mock không có mất kết nối/grace 2 phút và không đồng bộ giữa 2 tab.
- Mock không phải tích hợp thật.

## Cần lead quyết

- không có

## Việc còn lại

- Chơi trọn vòng bằng UI khi có CL-B-05 và CL-C-02..05.

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
