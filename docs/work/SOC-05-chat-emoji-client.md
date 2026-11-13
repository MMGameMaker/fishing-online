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

## Web Client — Feedback 2026-11-13

- **Emoji trong khung chat:** `EmojiReceived` vừa hiện emoji trên đầu nhân vật, vừa thêm một dòng vào log chat (store `ChatEntry` có `emojiId`, `text` rỗng). Khung chat vẽ bong bóng chứa icon emoji tĩnh, có tên và giờ như tin chữ. Server không đổi.
- **Số tin chưa xem:** Khung chat đang đóng thì đếm tin mới của người khác (không tính tin của mình, không tính tin có sẵn lúc vào hồ). Số đỏ hiện ở góc dưới bên phải nút chat, quá 99 thì ghi `99+`. Mở khung chat thì về 0. Hiện/ẩn qua `motion.ts`.
- **Kiểm tra:** 241 test client đạt (có test emoji vào log), tsc/eslint/prettier sạch. Trên trình duyệt (mock): 1 tin chữ và 1 emoji của bot, cùng 1 tin của mình, khi khung đóng thì số hiện là 2. Mở khung thì số ẩn. Dòng emoji có icon trong bong bóng.

## Web Client + Server — Giao diện chat theo demo và luật chat GD (2026-11-13)

- **Giao diện** (SocialUi.ts, social.css, art người dùng thêm trong `public/new resources/ui`):
  - Khung `Panel Art.png` (9 mảnh), tiêu đề to có đường kẻ, bong bóng `Bubble - Tail Left/Right.png`, ô `Emote Slot.png`, nút `Button Emote`, `Button Send`, `Chat Button`.
  - Tin người khác: mặt thỏ theo skin trong khung ô, tên và giờ, bong bóng đuôi trái.
  - **Tin của mình (chữ và emoji): nằm bên phải, không tên, không avatar, bong bóng đuôi phải** (người dùng chốt). Giờ gửi xem được khi trỏ chuột.
  - Bảng Biểu cảm tách bên phải, lưới 5 cột.
  - Cả khung thu theo cửa sổ (tối đa 0,75 như màn 1080p); chiều cao khung chừa chỗ cho khung người chơi ở trên và nút chat ở dưới.
  - `System Message.png` đã có style `.chat-msg--system` cho tin hệ thống khoe cá; chưa dùng vì phần khoe cá chưa làm.
  - `Avatar.png` (icon người) không dùng, vì người dùng chọn mặt thỏ.
- **Luật chat theo GD 2026-11-13 (doc/GAMEPLAY_SCOPE):**
  - Server: `Social:ChatMaxLength` 100 → 160, `ChatMinIntervalMs` 1000 → 2000 (appsettings + mặc định). Test API cập nhật: 161 ký tự bị từ chối; gửi sau 1 giây vẫn bị chặn, sau 2 giây thì được.
  - Client: ô nhập và bộ đếm 160; bong bóng trên đầu 4 → 10 giây.
- **Kiểm tra:**
  - Tự động: 252 test client đạt, tsc/eslint/prettier sạch. Server API 197 test đạt.
  - Trên trình duyệt (Server thật, `?dev=ClaudeTest`): tin người khác bên trái có mặt thỏ; "Hi" và emoji của mình bên phải không tên. Gửi tin thứ hai trong vòng 2 giây thì Server từ chối ("Bạn thao tác quá nhanh…"). Bộ đếm 0/160.
- **Chưa làm (theo doc/GAMEPLAY_SCOPE, chờ người dùng):**
  - Server lưu 50 tin gần nhất cho người vào sau.
  - Khoe cá kiểu 1 (thông báo loài đầu tiên + tin hệ thống) và kiểu 2 (nút share, liên kết mở chi tiết cá).

## Web Client + Server — Thanh thông báo khoe cá và lệnh test (2026-11-13)

- **Yêu cầu:** Người dùng muốn một lệnh tạo thông báo "có người chơi vừa câu được cá" để tự test. Giao diện và hiệu ứng theo doc/GAMEPLAY_SCOPE "Khoe cá kiểu 1" và mô tả của người dùng.
- **Server:**
  - Sự kiện hub `CatchAnnounced {playerId, displayName, speciesId, speciesName, rarity, first, announcedAt}` phát cho mọi người trong hồ.
  - Lệnh test `POST /api/v1/dev/announce-catch {speciesId?, first?}` **chỉ có ở Development** (`Modules/Social/CatchAnnouncement.cs`). Server dùng tên người gọi, bỏ trống `speciesId` thì chọn loài ngẫu nhiên, loài lạ thì báo `VALIDATION_FAILED`.
  - Test API: người khác trong hồ nhận đúng sự kiện; loài lạ bị từ chối.
  - **Trigger thật (loài lần đầu được câu trên toàn hệ thống) chưa làm.**
- **Client:**
  - `ui/announce/CatchBanner.ts`: thanh xanh ở nửa trên màn hình, mở theo chiều dọc từ giữa (scaleY 0 → 1), chữ chạy phải → trái 3 lượt (doc), rồi khép về giữa (1 → 0). Nhiều thông báo thì xếp hàng, tối đa 5.
  - Câu chữ: "Chúc mừng [tên] là người đầu tiên câu được [cá]!". Tên màu vàng, cá màu theo độ hiếm. Nếu `first=false` thì ghi "đã câu được". Có test.
  - Store ghi một tin hệ thống vào khung chat (`System Message.png`, "[Hệ thống] giờ"), tính vào số tin chưa xem. Mock có route tương ứng.
- **Lệnh test:**
  - Console trình duyệt (bản dev): `__fishing.announceCatch('koi')`, bỏ trống thì loài ngẫu nhiên; `__fishing.announceCatch('koi', false)` cho câu "đã câu được".
  - Server thật: mọi tab đang ở hồ đều thấy.
- **Kiểm tra:**
  - Tự động: 254 test client đạt. Test API mới và test chat đạt (9/9 theo bộ lọc).
  - Trên trình duyệt (Server thật, `?dev=ClaudeTest`): `announceCatch('goldcarp')` hiện thanh, chữ chạy, "Golden Carp" màu xanh lam; chat có tin "[Hệ thống] …"; nút chat hiện 1 tin chưa xem.

