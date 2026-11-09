# CL-B-03 — Nhân vật và animation

- **Worker:** Claude (Opus 5.5)
- **Branch / PR:** chưa có; code nằm trong working tree, chưa commit
- **Ngày gửi review:** 2026-11-09 (chưa có PR)
- **Spec áp dụng:** SPEC_CHUNG v0.7, config v0-test-2026-11-09-monitoring-05

## Đã làm

- `CharacterView`: 4 hướng, 8 animation, nhãn tên, chỗ gắn icon trên đầu, đổi skin và cần.
- Art tạm vẽ bằng canvas, tên khung `<anim>_<dir>_<i>` theo ART-02 để thay được bằng atlas thật.

## File thay đổi

- client-v0/src/online/entities/CharacterView.ts, placeholderArt.ts, CharacterDebugScene.ts

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
| Trang debug hiển thị đủ 4 hướng × mọi animation cho 1 skin | Đạt với art tạm | `?scene=char-debug`: 32 view, 32 animation đang chạy |

## Lệch spec / giả định

- Chưa có animation `sit` vì CL-B-03 không liệt kê.

## Cần lead quyết

- không có

## Việc còn lại

- Thay art thật khi ART-02 giao.

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
