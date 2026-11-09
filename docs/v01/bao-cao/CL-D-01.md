# CL-D-01 — UI kit

- **Worker:** Claude (Opus 5.5)
- **Branch / PR:** chưa có; code nằm trong working tree, chưa commit
- **Ngày gửi review:** 2026-11-09 (chưa có PR)
- **Spec áp dụng:** SPEC_CHUNG v0.7, config v0-test-2026-11-09-monitoring-05

## Đã làm

- Panel, Button, Tabs, Toast, ConfirmDialog, GoldLabel, bảng màu rarity, bảng lỗi tiếng Việt, trang demo `?scene=ui-demo`.
- Chọn **DOM overlay** phủ đúng canvas, co giãn cùng `Scale.FIT`, vì cần vùng chạm 44 px và hiển thị rõ dấu tiếng Việt.

## File thay đổi

- client-v0/src/online/ui/kit/components.ts, kit.css, errorText.ts, format.ts, UiDemoScene.ts, kit.test.ts

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
| Trang demo hiển thị mọi thành phần | Đạt | Xem ở 1024 px và 375 px; overlay khớp canvas, dialog và toast hoạt động, console không lỗi |
| Mỗi mã lỗi có câu tiếng Việt | Đạt | Kiểu `Record<ErrorCode,…>` và test cho đủ 22 mã |
| Vùng chạm ≥ 44 px CSS | Đạt | Đo trên 1024 px và 375 px: cao nhỏ nhất 44 px |
| Phông pixel | Không đạt | Chưa có phông pixel có dấu tiếng Việt và quyền dùng; tạm dùng monospace qua biến `--ui-font` |

## Lệch spec / giả định

- không có

## Cần lead quyết

- Chọn phông pixel có dấu tiếng Việt và xác nhận quyền dùng (ART).

## Việc còn lại

- Thay `--ui-font` khi có phông.

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
