# CL-C-02 — Nút câu

- **Worker:** Claude (Opus 5.5)
- **Branch / PR:** chưa có; code nằm trong working tree, chưa commit
- **Ngày gửi review:** 2026-11-09 (chưa có PR)
- **Spec áp dụng:** SPEC_CHUNG v0.7, config v0-test-2026-11-09-monitoring-05

## Đã làm

- Nút tròn góc phải dưới, chỉ hiện khi giữ ghế: Câu → khóa khi chờ → Kéo! kèm vòng đếm 3 giây → ẩn khi minigame → khóa trong popup.

## File thay đổi

- client-v0/src/online/fishing/FishButton.ts, fishButtonState.ts, fishButtonState.test.ts, fishing.css

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
| Mọi trạng thái đúng theo chuỗi event mẫu | Đạt | `fishButtonState.test.ts` và chơi thử |
| Bấm khi khóa không gửi lệnh | Đạt | `canPress` false khi chờ; khi chơi thử lần bấm lúc khóa không tạo lệnh |

## Lệch spec / giả định

- Trong scene Coral Cove, nút câu là DOM ở góc phải dưới, thay nút câu cũ phía trên đầu nhân vật.

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
