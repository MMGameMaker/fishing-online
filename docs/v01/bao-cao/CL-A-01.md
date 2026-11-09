# CL-A-01 — Khởi tạo project

- **Worker:** Claude (Opus 5.5)
- **Branch / PR:** chưa có; code nằm trong working tree, chưa commit
- **Ngày gửi review:** 2026-11-09 (chưa có PR)
- **Spec áp dụng:** SPEC_CHUNG v0.3 (đang chờ duyệt, M0 chưa Đạt), config v0-test-2026-11-09-rental-03

## Đã làm

- Tạo `client-web/`: Vite 7.3.7, TypeScript 5.9.3 strict, Phaser 3.90.0, Vitest, ESLint, Prettier; mọi phiên bản khóa chính xác, có lockfile.
- Game logic 480×270, `pixelArt`, `roundPixels`, `Scale.FIT`; biến `VITE_API_BASE`, `VITE_USE_MOCK`.

## File thay đổi

- client-web/package.json, package-lock.json, tsconfig.json, vite.config.ts, eslint.config.js, .prettierrc.json, .env.example, index.html, README.md — project
- client-web/src/main.ts, src/core/env.ts, services.ts, BootScene.ts — khởi động

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
| `npm ci && npm run build && npm run lint && npm test` chạy sạch | Đạt | Output phía trên |
| Mở `npm run dev` thấy scene Boot | Đạt | Mở `/?scene=boot` trên pane trình duyệt, thấy chữ khởi động, console không lỗi |

## Lệch spec / giả định

- Không có `.env` thì dev mặc định mock, build mặc định Server thật (đặt trong vite.config.ts). Mock không nằm trong bundle build (grep `dist/assets` không thấy `MockBackend`).
- Phaser 3.90.0 do agent chọn; PROJECT.md chỉ yêu cầu khóa khi khởi tạo. npm `latest` hiện là Phaser 4.

## Cần lead quyết

- ESLint 9.39.5 đã bị npm đánh dấu hết hỗ trợ; có nâng lên ESLint mới hay không.

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
