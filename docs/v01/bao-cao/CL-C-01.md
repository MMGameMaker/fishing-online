# CL-C-01 — Lõi minigame TS

- **Worker:** Claude (Opus 5.5)
- **Branch / PR:** chưa có; code nằm trong working tree, chưa commit
- **Ngày gửi review:** 2026-11-09 (chưa có PR)
- **Spec áp dụng:** SPEC_CHUNG v0.7, config v0-test-2026-11-09-monitoring-05

## Đã làm

- `mulberry32`, `needlePos`, `createState`, `applyTap`, `remainingMs`, `isLost` theo luật GAMEPLAY_SCOPE; hàm thuần.
- Bộ test vector do CL-C sở hữu theo SPEC 0.5: 15 ca, 5 rarity, gồm tap trúng, trượt và bị từ chối.

## File thay đổi

- client-v0/src/online/fishing/minigameCore.ts, minigameCore.test.ts, minigameVectors.test.ts, minigame-vectors.v0.json

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
| Seed 123456789 khớp 5 số tham chiếu | Đạt | Test mulberry32 |
| Vitest chạy toàn bộ `minigame-vectors.v0.json`, sai số ≤ 1e-9 | Đạt | `minigameVectors.test.ts`. Vector sinh từ chính lõi TS nên là test hồi quy, không phải đối chiếu độc lập |

## Lệch spec / giả định

- Giữ khoảng cách tối thiểu 80 ms giữa hai tap ở Client dù config mới đã bỏ khối `tapValidation`.
- Vector đặt cạnh code trong `src/online/fishing/` vì chưa bên nào khác dùng.

## Cần lead quyết

- Xác nhận vị trí file vector và có giữ giới hạn 80 ms không.

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
