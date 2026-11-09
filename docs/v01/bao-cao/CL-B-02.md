# CL-B-02 — Scene hồ

- **Worker:** Claude (Opus 5.5)
- **Branch / PR:** chưa có; code nằm trong working tree, chưa commit
- **Ngày gửi review:** 2026-11-09 (chưa có PR)
- **Spec áp dụng:** SPEC_CHUNG v0.7, config v0-test-2026-11-09-monitoring-05

## Đã làm

- Scene hồ dựng tilemap từ `walkableRows`, camera theo nhân vật trong giới hạn map, depth = y.
- `canStand` chân 14×6, `inLakeArea`, `stepMove` trượt dọc bờ; WASD/mũi tên tạm để kiểm tra, CL-B-04 sẽ thay.

## File thay đổi

- client-v0/src/online/scenes/lake/LakeScene.ts, walkable.ts, walkable.test.ts

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
| Không đi xuyên nước/vật cản | Đạt với map placeholder | 10 test `walkable`; trên trình duyệt giữ phím D từ x=300, dừng ở x=376,8 (bờ giới hạn 377) và trượt dọc bờ. Map placeholder chưa có vật cản ngoài nước |
| Nhân vật đứng sau cây khi y nhỏ hơn | Đạt | Nhân vật y=884, cây depth 900: nhân vật được vẽ trước cây trong danh sách depth |

## Lệch spec / giả định

- Cạnh phải và cạnh dưới của chân tính nửa mở: nằm đúng ranh giới ô thì chưa chạm ô kế tiếp.
- Pane trình duyệt bị ẩn nên bài đi bộ gọi trực tiếp `update` với phím giữ, không đo được FPS thật.
- Cây là placeholder chỉ để kiểm tra sắp lớp, không phải vật cản.

## Cần lead quyết

- BE-C-01 cần cài đặt `CanStand` cùng quy tắc nửa mở để Client và Server khớp.

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
