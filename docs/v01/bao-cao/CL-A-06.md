# CL-A-06 — Mock server trong trình duyệt

- **Worker:** Claude (Opus 5.5)
- **Branch / PR:** chưa có; code nằm trong working tree, chưa commit
- **Ngày gửi review:** 2026-11-09 (chưa có PR)
- **Spec áp dụng:** SPEC_CHUNG v0.7, config v0-test-2026-11-09-monitoring-05

## Đã làm

- `MockBackend` thay fetch và hub: login, snapshot, mua/gia hạn/rời ghế, cooldown, câu cá, `SubmitFishingResult` settle một lần mỗi attempt, shop, bán cá, Codex, lịch sử.
- 3 bot, chữ MOCK ở góc, nút tua ghế x10, `?mockError=SEAT_TAKEN`, `?mockPing=150`.

## File thay đổi

- client-v0/src/online/mock/MockBackend.ts, MockBackend.test.ts, rules.ts, createMock.ts, devOverlay.ts

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
| Chơi được trọn vòng với mock | Đạt | Mua ghế → câu → thắng → popup → túi có cá, EXP tăng, bằng giao diện trên `fishing.html`; bán cá mới qua test vì chưa có UI Shop (CL-D-03) |
| Mọi event mock khớp type | Đạt | Mỗi test kiểm qua `EVENT_GUARDS`, `badEvents` rỗng |

## Lệch spec / giả định

- Client báo `failed` được mock ghi lý do `timeout`; SPEC chưa quy định reason cho trường hợp này.
- Sau khi mua ghế, mock đưa nhân vật về ghế và gửi `PositionCorrected`; SPEC chưa quy định.
- Mock không có mất kết nối và không đồng bộ giữa 2 tab. Mock không phải tích hợp thật.

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
