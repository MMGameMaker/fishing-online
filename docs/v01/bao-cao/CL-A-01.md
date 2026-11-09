# CL-A-01 — Khởi tạo project

- **Worker:** Claude (Opus 5.5)
- **Branch / PR:** chưa có; code nằm trong working tree, chưa commit
- **Ngày gửi review:** 2026-11-09 (chưa có PR)
- **Spec áp dụng:** SPEC_CHUNG v0.7, config v0-test-2026-11-09-monitoring-05

## Đã làm

- Client đặt trong `client-v0/src/online/`, mở bằng `client-v0/fishing.html`, theo quyết định của user. Trang prototype cũ giữ nguyên.
- Thêm TypeScript strict, Vitest, ESLint, Prettier vào `client-v0`; khóa Phaser 3.90.0.
- Game logic 480×270, `pixelArt`, `roundPixels`, `Scale.FIT`; biến `VITE_API_BASE`, `VITE_USE_MOCK`.

## File thay đổi

- client-v0/package.json, package-lock.json, tsconfig.json, vite.config.js, eslint.config.js, .prettierrc.json, .env.example, fishing.html — project
- client-v0/src/online/main.ts, core/ — khởi động

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
| Chuỗi lệnh kiểm tra chạy sạch | Đạt một phần | typecheck, lint, test, build đạt; `npm ci` mới chạy --dry-run |
| Mở dev thấy scene Boot | Đạt | Mở `fishing.html?scene=boot` lúc còn ở client-web; sau khi chuyển đã mở `fishing.html` vào hồ, console không lỗi |

## Lệch spec / giả định

- Tên script là `typecheck`, `lint:online`, `test:online` để không đụng script cũ của prototype.
- Không có `.env` thì dev mặc định mock, build mặc định Server thật; bundle build không chứa mock.

## Cần lead quyết

- ESLint 9.39.5 đã bị npm đánh dấu hết hỗ trợ; có nâng lên không.
- Thư mục `client-web/` còn lại, một phần đã commit ở 004bf3d: chờ user quyết có xóa không.
- Server Express/Socket.IO cũ trong `client-v0/server` không dùng cho Fishing Online: chờ user quyết giữ hay bỏ.

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
