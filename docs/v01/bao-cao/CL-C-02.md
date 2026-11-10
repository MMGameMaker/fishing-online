# CL-C-02 — Nút Kéo

- **Worker:** Claude (Opus 5.5)
- **Branch / PR:** chưa có; bản đầu đã commit; luồng tự câu SPEC 0.8 còn trong working tree
- **Ngày gửi review:** 2026-11-09 (chưa có PR)
- **Spec áp dụng:** SPEC_CHUNG v0.8, config v0-test-2026-11-09-monitoring-05

## Đã làm

- SPEC 0.8: bỏ nút Câu và các trạng thái khóa; nút "Kéo!" giữa màn hình chỉ hiện khi cá cắn, lớp chạm phủ kín canvas, các nút HUD ghế vẫn bấm được.
- Nút tròn góc phải dưới, chỉ hiện khi giữ ghế: Câu → khóa khi chờ → Kéo! kèm vòng đếm 3 giây → ẩn khi minigame → khóa trong popup.

## File thay đổi

- client-v0/src/online/fishing/FishButton.ts, fishButtonState.ts, fishButtonState.test.ts, fishing.css

## Lệnh kiểm tra đã chạy

```
cd client-v0 && npm run typecheck && npm run lint:online && npm run test:online && npm run build
typecheck: không lỗi
lint: All matched files use Prettier code style!
test: Test Files 15 passed (15), Tests 183 passed (183)
build: built in 7.61s
npm ci: chỉ chạy --dry-run đạt, vì dev server client-v0 đang giữ file trong node_modules
```

## Nghiệm thu

| Tiêu chí (chép từ task) | Kết quả | Bằng chứng |
| --- | --- | --- |
| SPEC 0.8: nút chỉ hiện ở bite, chạm xa nút vẫn Kéo, chỉ gửi 1 lệnh | Đạt với mock | Coral Cove: nút ở tâm canvas, điểm xa nút thuộc lớp chạm, 2 lần chạm liền chỉ sang minigame một lần; `fishButtonState.test.ts` |

## Lệch spec / giả định

- không có

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
