# CL-A — Nền tảng Client (Phaser 3 + TypeScript)

Mục tiêu: project client chạy được, có lớp mạng theo contract, kho state chung và **mock server** chạy trong trình duyệt để các nhóm Client khác làm việc không cần Server thật.
Đọc trước: [SPEC_CHUNG](../SPEC_CHUNG.md) mục 1, 3, 4, 5; `fixtures/api-samples.v0.json`, `fixtures/gameplay-config.v0.json`, `fixtures/lake-map.placeholder.json`.
Phạm vi file: `client-web/` (gốc project), `client-web/src/{core,net,state,mock}`.
Độc lập: không phụ thuộc Server.

Tham khảo được: `client-v0/src/net.js`, `world.js` (cách gửi movement), nhưng viết lại bằng TS.

---

### CL-A-01 Khởi tạo project
- **Độ lớn:** S. **Phụ thuộc:** không.
- **Spec:** `client-web/` dùng Vite + TypeScript strict + Phaser 3 (khóa phiên bản chính xác trong `package.json`, có lockfile). ESLint + Prettier. Script: `dev`, `build`, `test` (Vitest), `lint`. Pixel art: `pixelArt: true`, `roundPixels: true`, kích thước logic 480×270 scale theo cửa sổ (`Scale.FIT`). Thư mục: `src/core` (boot, config môi trường), `src/net`, `src/state`, `src/mock`, `src/scenes`, `src/entities`, `src/fishing`, `src/ui`. Biến môi trường: `VITE_API_BASE`, `VITE_USE_MOCK`.
- **Nghiệm thu:** `npm ci && npm run build && npm run lint && npm test` chạy sạch; mở `npm run dev` thấy scene Boot.

### CL-A-02 Kiểu dữ liệu contract
- **Độ lớn:** S. **Phụ thuộc:** CL-A-01.
- **Spec:** `src/net/contract.ts` định nghĩa type TS cho mọi request/response/event/mã lỗi ở SPEC mục 3-5 (`PlayerProfile`, `SeatView`, `AttemptView`, `MinigameParams`, `ErrorCode` union...). `src/core/gameplayConfig.ts` type cho config.
- **Nghiệm thu:** test parse toàn bộ `api-samples.v0.json` và `gameplay-config.v0.json` qua type guard không lỗi.

### CL-A-03 HTTP client và phiên
- **Độ lớn:** M. **Phụ thuộc:** CL-A-02.
- **Spec:** `ApiClient` bọc fetch: thêm `Authorization`, tự sinh `Idempotency-Key` cho POST/PUT và **giữ nguyên key khi retry**; timeout 10 giây; 401 → gọi refresh 1 lần rồi thử lại; lỗi trả `ApiError {code, message, retryable}`. Access token chỉ giữ trong bộ nhớ.
- **Nghiệm thu:** unit test với fetch giả: retry dùng cùng key; 401 → refresh → thành công; lỗi 422 trả đúng code.

### CL-A-04 Hub client
- **Độ lớn:** M. **Phụ thuộc:** CL-A-02.
- **Spec:** `GameHub` bọc `@microsoft/signalr`: `invoke<T>(method, args)` tự thêm `requestId`, trả `CommandAck`; đăng ký listener trước `start()`; tự kết nối lại (0, 1, 2, 5, 10 giây), sau khi nối lại gọi `JoinLake` để lấy snapshot; phát sự kiện `connectionState` cho UI.
- **Nghiệm thu:** test với hub giả; tắt/bật Server dev thấy tự nối lại và nhận snapshot mới.

### CL-A-05 Kho state
- **Độ lớn:** M. **Phụ thuộc:** CL-A-02.
- **Spec:** store đơn giản có subscribe (không cần thư viện): `session` (profile, gold), `lake` (players, seats, mySession), `attempt` (AttemptView), `inventory`, `progress`, `catalog`. Hàm reducer cho từng event SPEC mục 4. Gold luôn lấy từ Server, không tự cộng trừ.
- **Nghiệm thu:** unit test: áp chuỗi event mẫu → state đúng; `SeatChanged` cập nhật đúng ghế.

### CL-A-06 Mock server trong trình duyệt
- **Độ lớn:** L. **Phụ thuộc:** CL-A-03, CL-A-04.
- **Spec:** khi `VITE_USE_MOCK=true`, `ApiClient` và `GameHub` dùng `MockBackend` thay mạng thật. MockBackend chạy luật đơn giản theo SPEC: login trả profile 100 Gold; snapshot từ `lake-map.placeholder.json`; mua thời lượng/gia hạn trừ Gold đúng đơn giá ghế, phiên theo thời lượng đã mua/gia hạn (có nút debug tua nhanh x10); cooldown; CastLine → bite sau 3-6 giây → minigame dùng **cùng thuật toán SPEC 2.7** (import từ `src/fishing/minigameCore.ts` của CL-C khi có; tạm thời bản đơn giản) → kết quả; shop, bán cá. Có 3 bot di chuyển ngẫu nhiên và thỉnh thoảng câu được cá để thử `CatchShown`. Lỗi giả bật bằng query `?mockError=SEAT_TAKEN`.
- **Ghi rõ trong UI dev:** góc màn hình hiện chữ "MOCK".
- **Nghiệm thu:** chơi được trọn vòng với mock; mọi event mock khớp type `contract.ts`.

### CL-A-07 Màn đăng nhập
- **Độ lớn:** M. **Phụ thuộc:** CL-A-03; Firebase Web config (người dùng cung cấp).
- **Spec:** Firebase JS SDK, nút "Đăng nhập Google" → lấy ID token → `POST /auth/login`. `isNew` → màn đặt tên (`PUT /me/display-name`, hiện lỗi trùng/không hợp lệ). Xong → vào scene Lake. Mock: nút đăng nhập nhanh.
- **Nghiệm thu:** với Server thật: login, đặt tên, vào hồ; reload trang → tự refresh phiên, không phải login lại.
