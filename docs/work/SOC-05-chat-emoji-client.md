# SOC-05 — Chat và emoji: Client

- **Trạng thái chung:** Chờ tích hợp. Client và BE local đã chạy được, người dùng chưa duyệt giao diện.
- **Nguồn yêu cầu:** [SOC-05 trong SOC-social-skin-ranking](../v01/nhom/SOC-social-skin-ranking.md). Ảnh mẫu khung "Trò chuyện" + "Biểu cảm" người dùng gửi 2026-11-12.
- **Phạm vi / tiêu chí hoàn thành:** Khung chat thu gọn góc trái dưới, Enter để gõ, chặn phím di chuyển khi gõ. Bong bóng chat trên đầu 4 giây, bảng emoji, emoji trên đầu 3 giây. Nghiệm thu: 2 tab chat qua lại, gõ "w" không làm nhân vật đi.
- **Người/agent sửa phần chung và contract:** Claude (contract `ChatReceived`, DevBypass, danh sách emoji).

## GD

- **Agent / trạng thái:** Không áp dụng lượt này. Số emoji đổi từ 8 [Đề xuất] lên 16 theo ảnh mẫu người dùng gửi (bảng 16 ô).

## Web Client (kiêm Art/asset 2D)

- **Agent / trạng thái:** Claude, đã làm.
- **Phạm vi:** [SocialUi.ts](../../client-v0/src/online/social/SocialUi.ts), [social.css](../../client-v0/src/online/social/social.css), [emojis.ts](../../client-v0/src/online/social/emojis.ts), [chatFormat.ts](../../client-v0/src/online/social/chatFormat.ts), CharacterView (bong bóng `say`, emoji động, `clearEmote`), LakeScene (`createSocial`, Enter, tắt phím game khi gõ).
- **Đầu ra:**
  - Khung "Trò chuyện" theo ảnh mẫu: nền kem, viền nâu, nút X `public/mini game/Button Close.png`. Mỗi tin có mặt thỏ cắt từ skin đã bake, tên, giờ HH:MM:SS, bong bóng tin. Có ô "Nhập tin nhắn...", nút biểu cảm, nút gửi cam, bộ đếm `n/100`.
  - Bảng "Biểu cảm" lưới 5 cột, 16 emoji. Art từ `public/assets/reference/spritesheets/emotes-spritesheet`: `<art>Static` cho icon, `<art>Animated0..12` cho emoji động trên đầu.
  - Mở/đóng qua `ui/kit/motion.ts`. Bong bóng và emoji trên đầu nảy lên (Back.easeOut), ẩn bằng thu nhỏ/mờ.
  - Nút mở chat ở góc trái dưới, Enter mở và đặt con trỏ vào ô nhập, Esc đóng. Đang gõ thì tắt bàn phím game và capture.
  - **Đăng nhập dev** ([devLogin.ts](../../client-v0/src/online/core/devLogin.ts)): `pier.html?dev=Tên`, chỉ bản dev, tên 3–16 ký tự. Vào bằng người chơi test qua `Auth:DevBypass`, player id cố định theo tên.
  - Lúc vào hồ, vị trí Server trả (0, 0) hoặc không đứng được thì về spawn/chỗ đứng gần nhất (`startPosition`).
- **Kiểm tra / tiếp theo:** 237 test client đạt, typecheck/eslint/prettier sạch. Chưa duyệt giao diện với người dùng.

## Server (BE)

- **Agent / trạng thái:** Claude, đã sửa nhỏ.
- **Phạm vi:** `Modules/Identity/IdentityModule.cs`: DevBypass nhận thêm query `dev_player` trên `/hubs/game`, vì WebSocket trình duyệt không gửi header. Vẫn chỉ Development + `Auth:DevBypass`. `appsettings.json`: `Social:Emojis` 8 → 16 (`emoji_01..16`).
- **Kiểm tra / tiếp theo:** Build 0 cảnh báo. 27 test Social/Auth/Identity đạt.
- **CORS (2026-11-12):** Mở client ở `localhost:5176` (Vite tự đổi cổng khi 5173 bận) thì Server chặn vì `ClientOrigins` chỉ có 7456/5173/5174. Sửa `Program.cs`: Development cho phép mọi cổng `http://localhost`/`127.0.0.1`, môi trường khác vẫn chỉ theo `ClientOrigins`. Kiểm tra preflight: 5173/5176/5199 được phép, origin lạ bị chặn. Hai tab `localhost:5176/pier.html?dev=Anh|Binh` chat qua lại đạt. Test Foundation/HttpEnvelope/Auth đạt.

## Admin Tool

- **Agent / trạng thái:** Không áp dụng.

## Contract Web Client/Admin ↔ Server

- **Phiên bản / trạng thái:** Theo SOC-03/SOC-04. Client nhận thêm `displayName`, `sentAt` của `ChatReceived` (tuỳ chọn, mock cũ có thể thiếu).
- **Thay đổi / tác động:** Danh sách emoji 16 id. Client map cố định `emoji_01..16` → art (`smiley`…`claps`). Đổi danh sách phía Server thì sửa `EMOJIS` trong emojis.ts.

## Trao đổi cần xử lý

- **Claude → người dùng / số tin giữ trong khung:** Spec ghi 50 tin gần nhất, store hiện giữ 100 (`CHAT_LOG_LIMIT`). Chờ trả lời nếu cần đổi về 50.

## Kiểm tra tích hợp

- **Người/agent thực hiện:** Claude, 2026-11-12.
- **Kịch bản / kết quả / bằng chứng:** BE thật local (`start-api-portable.ps1`, cổng 5080, `Auth__DevBypass=true`), client `VITE_USE_MOCK=false`. Hai tab `pier.html?dev=Anh` và `?dev=Binh`: hai bên thấy nhau. Tab Anh mở chat, gõ "Xin chào Binh! wasd f", Enter: tin hiện trong khung với tên/giờ của Server, thỏ không di chuyển khi gõ. Tab Binh nhận tin và bong bóng trên đầu Anh. Anh chọn emoji trái tim: tab Binh thấy emoji động trên đầu Anh, tự ẩn sau 3 giây.
- **Đối chiếu tiêu chí GD / việc còn lại:** Đạt nghiệm thu SOC-05. Còn chờ người dùng duyệt giao diện. Chưa thử đăng nhập Google thật với 2 tài khoản.
