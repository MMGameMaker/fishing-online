# Pixadom Rebuild — Báo cáo tổng hợp dự án (chốt phiên làm việc)

Ngày chốt: 2026-11-06. Tài liệu này là bản tổng hợp đầy đủ nhất: đã làm gì, thiết kế ra sao, logic
chi tiết từng hệ thống, test ra sao, và còn thiếu gì — để bất kỳ ai (người hoặc AI) đọc lại có thể
tiếp tục ngay mà không cần dò lại toàn bộ lịch sử chat.

## 1. Tổng quan

Project game xã hội 2D phong cách cozy, sử dụng Phaser 3.

## 2. Stack & cách chạy

- **Client**: Phaser 3 (`phaser@^3.80.1`) + Vite 5, vanilla JS (không framework UI), DOM thuần cho
  các panel (chat, bag, shop, look...).
- **Server**: Node.js + Express + Socket.IO, lưu dữ liệu vào file JSON (`data/db.json`), không có
  database thật.
- **Không có đăng ký/đăng nhập thật** — chọn 1 trong các tài khoản test cố định
  (`shared/config.js` → `SEED_ACCOUNTS`: alice, bob, cleo, mochi-bot).

Lệnh:
```bash
npm install
npm run dev     # server (node --watch) + client (vite) chạy song song, cổng 5173 (client) / 3001 (server)
npm run build   # build production vào dist/
npm start       # chạy bản build qua server Express (serve dist/ + API), cổng 3001
npm test        # node --test test/server.test.js — 27 test, chạy server thật (không mock), test qua socket.io-client
```
Vào nhiều tài khoản để test multiplayer: `?user=alice`, `?user=bob`, `?user=cleo` trên URL.
`mochi` là bot tự trả lời DM, dùng để test nhắn tin một mình.

## 3. Kiến trúc & luồng dữ liệu

```
shared/config.js, shared/npcs.js, shared/farming.js   ← luật chơi + dữ liệu thuần (không phụ thuộc client/server)
        ↑ import                      ↑ import
server/app.js (createGameServer)      src/*.js (Phaser scenes + UI)
   - giữ state thật (db, online)         - render, input, gọi socket
   - validate MỌI hành động              - KHÔNG tự quyết định kết quả, luôn chờ server trả lời
   - emit sự kiện realtime qua Socket.IO
```

**Nguyên tắc cốt lõi**: server là nguồn sự thật duy nhất (authoritative). Mọi hành động có ảnh
hưởng (di chuyển, câu cá, mua đồ, trồng cây...) client chỉ *đề nghị* qua
`request(event, payload)` (Promise bọc `socket.emit(event, payload, ack)`), server validate lại
toàn bộ (khoảng cách, tiền, trạng thái...) rồi mới đổi state + trả kết quả + broadcast cho người
khác trong phòng qua `io.to(room).emit(...)`. Client không tự ý cập nhật UI trước khi có phản hồi,
trừ hiệu ứng thuần hình ảnh không ảnh hưởng luật chơi.

**Phòng (room) = đơn vị cô lập**: mỗi `player.room` là một Socket.IO room; chat, vị trí người
chơi khác, NPC... chỉ đồng bộ trong cùng phòng. Đổi phòng qua cổng dịch chuyển (`teleports[]`
trong file JSON của phòng) — xem mục 5.

## 4. Cấu trúc thư mục

```
server/app.js         Toàn bộ logic server: mọi socket handler, validate, lưu DB (xem mục 6)
server/index.js       Entry point, đọc PORT env, graceful shutdown
shared/config.js       Hằng số + hàm thuần dùng chung client/server: va chạm, fishing, look, XP...
shared/npcs.js         Danh sách NPC + quest
shared/farming.js      Dữ liệu nông trại (cây trồng, vị trí 14 ô đất)
src/main.js            Bootstrap: chọn tài khoản, login, preload room, khởi tạo Phaser.Game
src/world.js           Scene chính: vẽ phòng, di chuyển, đổi phòng, vòng lặp update() gọi các controller
src/player.js           Class PlayerEntity: 4 lớp sprite, animation, vẽ cần câu, bong bóng chat
src/npc.js              NPC sprite + panel hội thoại/quest
src/seats.js            Nút ngồi/đứng
src/fishing.js          Máy trạng thái câu cá phía client (điều phối UI + âm thanh)
src/reelInterface.js    Panel mini-game Reel (kéo cần)
src/farming.js          Prompt trồng/tưới/thu hoạch trên map
src/ui.js               Toàn bộ panel DOM: chat, bag, look, menu, shop, fishlog, quest log, DM, friends
src/art.js              2 icon cá vẽ bằng code (duy nhất phần "vẽ tay" còn lại, xem mục 8)
src/referenceArt.js     Nạp & đăng ký sprite thật (nhân vật/NPC/UI) + hàm ghép preview Look
src/net.js              Bọc socket.io-client: request(), isTyping()
src/style.css           Toàn bộ CSS
index.html              Khung DOM tĩnh (các panel, HUD, canvas game)
tools/build-rooms.mjs   Script build-time: bake tile phòng + copy decor từ thư mục reference (xem mục 5)
tools/validate-reference-assets.mjs  Script kiểm tra asset reference có đủ không
test/server.test.js    27 test tích hợp qua socket thật (không mock DB/logic)
public/rooms/*.json/png Dữ liệu + ảnh nền đã bake sẵn cho 8 phòng (output của build-rooms.mjs)
public/assets/          Sprite thật đang dùng (characters/npcs/ui/rooms) + public/assets/reference/
                        (toàn bộ ~1293 file gốc đã repaint, xem mục 8.3)
data/db.json            "Database" — tài khoản, tin nhắn, nông trại (tự tạo khi chạy)
docs/audit-2026-11-06.md  Báo cáo kiểm tra 4 hệ thống (câu cá/shop/skin/chat) — xem thêm chi tiết ở đó
```

## 5. Hệ thống phòng & bản đồ (Rooms)

8 phòng đang chạy: `safeArea` (Main Town), `store`, `cafe`, `nightclub`, `pvpArea`,
`apartmentLobby`, `coralCove`, `hugglehenFarms` (`shared/config.js` → `ROOM_KEYS`).

**Pipeline dựng bản đồ** (`tools/build-rooms.mjs <reference-folder>`):
1. Đọc Tiled map gốc (`tilemaps/`) của từng phòng.
2. Ghép toàn bộ layer tile **thật** thành 1 ảnh nền PNG duy nhất, đúng kích thước gốc
   (`blitTile()` tự xử lý cờ lật ngang/dọc/chéo của Tiled bằng alpha blending) → `public/rooms/<room>.png`.
3. Với từng decor (vật trang trí đặt rời): copy ảnh nguồn thật vào `public/assets/rooms/decor/`
   (de-dup theo nội dung). Nếu bản tĩnh (`-still.png`) không tải được nhưng tìm thấy spritesheet
   động cùng chủ đề ở đâu đó trong thư mục reference (`findRecoverySheet()` — khớp tên, fallback
   khớp mờ theo cụm từ), publish **nguyên sheet động** (không cắt 1 frame tĩnh) vào
   `public/assets/rooms/decor-anim/` kèm metadata `decor[].anim = {sheet, atlas, prefix, frames, w, h}`
   để client phát animation thật.
4. Xuất `public/rooms/<room>.json`: toạ độ va chạm (`blocked` — bitmap theo tile), `colliders`,
   `teleports` (cổng dịch chuyển), `seats`, `fishing` (vùng câu cá), `decor[]`.

Kết quả: **381/381 decor item ở cả 8 phòng có ảnh thật** (242 ảnh tĩnh + 139 ảnh động). Giới hạn
còn lại: ~23 biến thể cây "accordionPineRL/LR" (đối xứng trái/phải) dùng chung 1 tên ảnh tĩnh nên
đoán trái/phải có thể sai khoảng một nửa; một số tile lật chéo (diagonal flip) xử lý best-effort,
chưa soát từng tile bằng mắt.

**Va chạm** (`shared/config.js`): `canStand(room, x, y)` — kiểm tra 1 hình chữ nhật "chân"
(`FEET = { halfW: 7, h: 6 }`) không chạm tile `blocked` và không chồng collider nào. Dùng chung
client (dự đoán mượt) lẫn server (validate thật — client không được tự quyết định đứng được hay
không). `teleportAt`/`isAtExit` dùng cùng kiểu kiểm tra chồng hình chữ nhật (`feetOverlap`) với
vùng cổng dịch chuyển, có `margin` để chịu được độ trễ cập nhật vị trí.

**Đổi phòng**: client gửi `useTeleport {index}` → server kiểm tra `isAtExit` đúng cổng, tính điểm
đến gần nhất đứng được (`nearestStandable`, quét vòng tròn bán kính tăng dần tới 90px) để tránh
bị kẹt ở biên tile, trả về dữ liệu phòng mới + người chơi + NPC trong phòng đó.

## 6. Chi tiết logic từng hệ thống

### 6.1 Di chuyển
Client tính vector di chuyển từ phím WASD/mũi tên hoặc điểm click (`movementVector()` trong
`world.js`), áp dụng cục bộ cho mượt (dead-reckoning), đồng thời gửi `playerMovement {x,y,dir,moving}`
tối đa mỗi 70ms (`SEND_MS`) hoặc ngay khi dừng/đến cổng. **Server validate lại toàn bộ** bằng
`canStand` — nếu sai, gửi `positionCorrect` để kéo client về đúng vị trí server đang giữ (chống
cheat/đi xuyên tường). Người chơi khác thấy chuyển động qua `playerMoved` (nội suy tuyến tính phía
client, `REMOTE_SPEED = 220` trong `player.js`).

### 6.2 Nhân vật & tuỳ biến ngoại hình (skin)
4 lớp sprite riêng ghép trong 1 `Phaser.Container`: thân (theo tông da), quần, áo, tóc — mỗi lớp
là ảnh 48×55px lấy từ atlas thật (`public/assets/characters/`). Tên frame theo quy ước
`player-<hướng>-<n>[-<phần>-<style>]` (hướng: down/left/right/up; `<n>` 0-3 là frame đi bộ/idle,
có pose `sit-*` và `swipe-*` riêng cho ngồi và quăng cần).

- **FOOT_ORIGIN_Y** (`player.js`): ảnh thân có 7px khoảng trong suốt dưới chân trong khung 55px
  cao (đo bằng quét alpha pixel) → origin.y = `(55-7)/55` thay vì 1, nếu không nhân vật sẽ "lơ
  lửng" trên mặt đất. Áp dụng cho cả 4 lớp vì chúng dùng chung 1 canvas.
- **Tint màu thông minh**: không phải style nào cũng tint được — đo độ bão hoà màu trung bình từng
  style thật (`HAIR_TINTABLE`/`TOPS_TINTABLE`/`BOTTOMS_TINTABLE` trong `shared/config.js`); style
  gần như xám/phẳng (sat ~0) mới tint theo màu chọn, style đã có màu sẵn (sat > ~0.1) giữ nguyên để
  khỏi bị nhuộm sai.
- **Đang bật**: 3 tông da, 8 kiểu tóc × 8 màu, 8 kiểu áo × 10 màu, 2 kiểu quần × 10 màu
  (`LOOK_LIMITS` trong `shared/config.js`). Atlas gốc có tới 148 kiểu tóc/22 kiểu áo nếu muốn mở
  rộng — chỉ cần sửa `HAIR_STYLES`/`TOPS` (đã copy sẵn toàn bộ sheet vào project).
- **Panel Change Look** (`src/ui.js` `initLook` + `src/referenceArt.js` `drawCharacterPreview`):
  preview ghép **đúng asset thật** (sửa trong phiên làm việc gần nhất — trước đó dùng hình vẽ
  placeholder 16×24 bằng code, đã xoá). Có Rotate (xem 3 hướng), Randomize, Save (gọi
  `changeLook`, server validate range từng field bằng `validateLook`).
- Đổi look hiện **miễn phí, không giới hạn** — chưa gắn với shop/coin.

### 6.3 NPC & Quest
4 NPC map sang nhân vật gốc đã repaint (`NPC_SPRITES` trong `referenceArt.js`): Gus→Gizmo,
Mira→Marigold, **Reed→Marlin** (đặt đúng trong ô cửa sổ chòi bán cá ở Coral Cove, khớp ảnh gốc —
toạ độ đo bằng phân tích pixel trực tiếp trên file hut, xem mục 9), Theo→Daisy. Render bằng
`Sprite` + animation thật (toàn bộ 14-20 frame mỗi nhân vật, không chỉ frame tĩnh).

Mỗi NPC gắn 1 quest 1-chặng (`shared/npcs.js` → `QUESTS`):
| Quest | NPC | Điều kiện | Thưởng |
|---|---|---|---|
| Settle In | Gus | Nói chuyện (`talk`, sẵn sàng ngay khi nhận) | 15 coin |
| A New Look | Mira | Đổi look (`changeLook`) | 20 coin |
| Catch of the Day | Reed | Câu được 1 con cá (`catchFish`) | 25 coin |
| Break the Ice | Theo | Gửi 1 tin chat (`sendChat`) | 10 coin |

Server theo dõi trạng thái quest per-account (`new → in_progress → ready → completed`), hàm
`advanceQuests(player, requirementType)` quét mọi quest khớp loại điều kiện mỗi khi hành động liên
quan xảy ra (gửi chat, đổi look, câu được cá...) và đẩy lên `ready`, bắn socket event `questStatus`
để client hiện dấu `!` vàng trên đầu NPC ngay lập tức.

### 6.4 Câu cá (Fishing) — máy trạng thái đầy đủ
**Phase** (giữ ở server, `player.fishing.phase`): `cast → bob → hooked → reel → (caught | fail)`.

1. Đứng đúng mép bến câu (`fishingZoneAt`) → bấm nút cá/F → `startFishing`.
2. `cast` (2000ms, 16 frame@8fps) → tự chuyển `bob` → chờ ngẫu nhiên 2-6s (`biteMin/biteMax`) →
   chuyển `hooked`, bắn `fishBite` (âm thanh), có 1625ms để pull trước khi cá chạy mất
   (`fishEscaped`).
3. Pull lúc `bob` → thua ngay (`pulledEarly`). Pull lúc `hooked` → `pullLine`: server chọn cá ngẫu
   nhiên theo trọng số (`pickFish`, 10 loài, `FISH` trong `shared/config.js`, trọng số = độ hiếm
   ngược), lăn vùng xanh đầu tiên (`rollZone`, độ rộng theo cấp cần + tốc độ theo tốc độ loài cá),
   chuyển `reel`, có 12s tổng (`zoneTimeMs`) để hoàn thành 3 lượt trúng (`hitsNeeded`).
4. Mini-game Reel (`reelInterface.js`): marker chạy qua lại trong thanh 278px, bấm đúng lúc marker
   nằm trong vùng xanh (`isInZone`) → `logReel`. Server validate: khoảng cách tối thiểu giữa 2 lần
   bấm (`minReelGap`), đúng vùng mới tính trúng, trúng đủ 3 lần (mỗi lần lăn lại vùng mới, hẹp dần
   theo độ khó loài cá) → bắt được cá, cộng vào túi (`account.inventory`) + sổ loài
   (`account.fishLog`) + XP (`awardXP`, dựa trên `fish.value`).
5. **Cấp cần câu** (`ROD_PRICES = [0,150,350,650,1000]`, 5 cấp): cấp cao hơn **nới rộng** vùng
   xanh (`REEL.zoneWidths = [66,86,106,126,146]`, dễ hơn — đã sửa từ bug ban đầu bị ngược chiều).
6. Huỷ câu khi: pull sớm, hết giờ, rời tab trình duyệt (`visibilitychange` → `cancelFishing`).

Vị trí tay cầm cần/dây câu theo từng hướng (`HAND` trong `player.js`) đo bằng cách so khác biệt
pixel giữa pose idle và pose "swipe" (quăng cần) trong ảnh thật, theo cả 4 hướng.

**Đã sửa trong phiên làm việc**: nút REEL không bấm được khi camera cuộn ra khỏi (0,0) — do con
UI tương tác bên trong 1 Container `setScrollFactor(0)` không tự kế thừa scrollFactor cho việc dò
va chạm con trỏ (chỉ kế thừa khi render) → phải gọi `.setScrollFactor(0)` trực tiếp trên chính nút
đó (`reelInterface.js`).

### 6.5 Shop
Chỉ bán **cần câu**, qua Menu → "Tinkerbean — Rod Shop" (popup DOM, chưa có NPC/gian hàng đứng
trong map). Mua tuần tự từng cấp (`level !== rodLevel + 1` bị từ chối), kiểm tra đủ coin. Chưa có
shop quần áo/nội thất nào khác.

### 6.6 Chat & tin nhắn riêng
- **Chat theo phòng**: lưu 50 tin gần nhất/phòng (`chatHistory[room]`), giới hạn 120 ký tự
  (`LIMITS.chatLen`), chống spam 6 tin/8 giây (`allowed()` — cửa sổ trượt theo bucket). Hiện bong
  bóng nổi trên đầu người gửi, tự ẩn sau 5s.
- **DM**: danh sách liên hệ kèm trạng thái online + tin nhắn gần nhất + số chưa đọc
  (`contactsFor`), giới hạn 300 ký tự, chống spam 10 tin/10 giây. Tài khoản `mochi` (bot) tự trả
  lời sau ~1.2s bằng 1 trong 4 câu cố định (`BOT_REPLIES`) để test một mình.
- **Không có** hệ thống emoji/biểu cảm riêng (đã xác nhận với người yêu cầu — không làm trong
  phiên này). "Biểu cảm" duy nhất hiện có là Dance (phím X, đồng bộ multiplayer qua
  `playerDanced`, tự tắt khi di chuyển).

### 6.7 Ghế ngồi & nhảy
`seats[]` định nghĩa trong file phòng (toạ độ thật trong map). Bấm nút "Sit" khi trong tầm
(`SEAT_REACH = 36`) → server khoá `player.sitting = index`, khoá luôn di chuyển/câu cá/nhảy cho
tới khi đứng dậy. Đứng dậy ưu tiên điểm thoát ghế đã định sẵn (`seat.exitX/Y`), nếu ghế không có
thì tìm điểm đứng được gần nhất (`nearestStandable`) để không bao giờ bị kẹt trên ghế.

### 6.8 Nông trại (Hugglehen Farms) — hệ thống mock đơn giản hoá
Theo yêu cầu "làm full logic game với mock server", nông trại là **state dùng chung** (không theo
từng người chơi) — 14 ô đất cố định (`shared/farming.js` → `PLOTS`, chọn vị trí bằng kỹ thuật quét
điểm đứng được tương tự lúc đặt NPC, không khớp pixel-chính-xác với tile "PLOT" vẽ sẵn trong map).

- Trồng (`plantCrop`): tốn 5 coin (`SEED_COST`), **chọn ngẫu nhiên 1 trong 3 loại cây** (không có
  menu chọn — đơn giản hoá có chủ đích): Carrot (20s, 10 coin), Sunflower (35s, 18 coin), Pumpkin
  (60s, 35 coin).
- Tưới (`waterPlot`): bắt đầu đếm giờ lớn.
- Thu hoạch (`harvestPlot`): **ai cũng thu hoạch được** khi ô đã `ready` (không khoá riêng người
  trồng) — cộng coin + XP + vào `account.crops`.
- Client (`src/farming.js` `FarmController`): hiện 1 prompt tương tác trên ô đất gần nhất trong
  tầm 50px (`FARM_REACH`), đổi chữ theo trạng thái (`Plant a seed (5c)` / `Water` /
  `Harvest <tên cây>`).

### 6.9 Bạn bè & XP/Level
Bạn bè: danh sách add/remove đơn giản, không có lời mời kết bạn/nhóm/chặn. XP (`pixels`) cộng từ
giá trị cá bán + thưởng quest + giá trị cây thu hoạch; `levelForPixels = floor(pixels/100)+1`
(`XP_PER_LEVEL = 100`). Lên cấp bắn `levelUp` cho đúng socket người chơi đó, hiện toast.

## 7. Bảo mật & giới hạn tính toàn vẹn (đã cố ý chấp nhận cho scope local-test)
- **Không có xác thực thật** — ai mở server cũng chọn được bất kỳ tài khoản nào.
- Server validate vị trí (`canStand`) mỗi lần di chuyển nhưng không giới hạn **tốc độ** di chuyển.
- Marker Reel chạy phía client; server chỉ kiểm tra vị trí báo cáo khi bấm, không chạy song song
  logic marker ở server — tin tưởng timestamp/zone phía client trong giới hạn hợp lý.

## 8. Asset — thiết kế & nguồn gốc

### 8.1 Thành phần art
Art hiển thị gồm nhân vật, 4 NPC, nút UI, tile và decor của 8 phòng.
Icon cá nhỏ trong túi/sổ cá được vẽ bằng hàm `drawFishIcon` trong `src/art.js` (16×8px);
HUD/chat có các icon SVG như ngôi sao level, đồng xu và nút gửi.

### 8.2 Cơ chế nạp sprite atlas thật
`src/referenceArt.js`: atlas JSON kiểu TexturePacker — **frame được đăng ký theo field `filename`
của chính nó**, không theo key số thứ tự trong file (`registerFrames()` tự gọi
`texture.add(frame.filename, 0, x, y, w, h)` thay vì dùng loader atlas có sẵn của Phaser) — lý do:
đã kiểm chứng file gốc đặt key số không khớp tên frame thật.

### 8.3 Toàn bộ thư mục reference đã nằm trong project
`D:\Zen-Workplace\pixadom-reference\` (thư mục riêng ngoài project ban đầu) đã được **copy
nguyên vẹn, byte-for-byte, toàn bộ gốc** vào `public/assets/reference/` — **1293 file, ~29MB**
(đối chiếu số file + hash MD5 khớp 100% trên cả thư mục gốc, không chỉ phần `assets/`): gồm
`assets/{fonts,graphics,rooms,spritesheets,tilemaps}` (dồn thẳng 1 cấp, không lồng thêm thư mục
`assets/`), cộng thêm `images/` (icon menu, favicon, ảnh share/badge), `interfaces/`, và `maps/`
(Tiled map gốc — thư mục thật `tools/build-rooms.mjs` đọc, khác với `assets/tilemaps/` nhỏ hơn).
Project **không còn phụ thuộc** gì vào đường dẫn ngoài khi chạy/build — `grep` toàn bộ `src/`,
`server/`, `shared/`, `index.html` xác nhận không có tham chiếu nào tới `pixadom-reference` (chỉ 2
script trong `tools/` còn nhận path đó làm tham số, dùng khi muốn build lại — xem lưu ý ở mục 12.3
về cấu trúc thư mục bị dồn 1 cấp). Phần lớn (NPC Fergus/Barnaby/Helga, nội thất apartment 531
file, icon menu, quest markers...) **chưa được gắn vào gameplay** — là nguyên liệu thô nằm sẵn
trong `public/assets/reference/` để dùng khi làm thêm tính năng.

## 9. Các bug đã gặp & cách sửa (đáng nhớ lại nếu đụng vùng tương tự)

| Bug | Nguyên nhân | Cách sửa |
|---|---|---|
| Nhân vật lơ lửng trên mặt đất | Ảnh thân có 7px trong suốt dưới chân trong khung 55px | `FOOT_ORIGIN_Y = (55-7)/55` áp cho cả 4 lớp (`player.js`) |
| Cần câu/dây câu sai vị trí theo hướng | Hằng số `HAND` đo theo art placeholder cũ (16×24), chưa đo lại cho art thật (48×55) | Đo lại bằng diff pixel pose idle vs pose swipe từng hướng |
| NPC Reed lệch khỏi map (coralCove) | Toạ độ cũ nằm ngoài vùng tile vẽ thật dù collision cho phép đứng | Đo lại bằng crop ảnh baked thật quanh điểm đó |
| NPC đứng tĩnh không animation | Render bằng `Image` 1 frame thay vì `Sprite` + `anims` | Đổi sang `Sprite`, tạo animation từ toàn bộ frame có sẵn (`npcFrameCount`) |
| Decor thiếu ảnh bị thay bằng 1 frame tĩnh cắt từ sheet động | Hiểu sai yêu cầu ban đầu | Sửa `build-rooms.mjs` publish nguyên sheet động + metadata, client phát animation thật |
| Cấp cần câu cao hơn lại khó hơn | `zoneWidths` để giảm dần theo cấp (ngược ý đồ) | Đổi thành tăng dần |
| Nút REEL không bấm được khi camera cuộn | Con interactive trong Container `scrollFactor(0)` không tự kế thừa scrollFactor cho dò va chạm con trỏ | Gọi `.setScrollFactor(0)` trực tiếp trên nút |
| Reed đứng lệch mép bến, lộ khoảng trống | Đặt theo ước lượng ban đầu, chưa đo pixel chính xác | Đo chính xác bằng quét cột pixel tìm biên bậu cửa sổ chòi cá, rồi tinh chỉnh thêm theo phản hồi trực quan |
| Preview bảng Change Look không giống nhân vật thật | Dùng hàm vẽ placeholder cũ `composeCharacter` (code vẽ hình chữ nhật) còn sót lại | Viết `drawCharacterPreview` ghép đúng frame thật từ texture đã nạp, tint đúng logic, xoá code chết trong `art.js` |

## 10. Trạng thái test
`npm test` → **27/27 pass** (tính đến lúc chốt). Bao phủ: tính nhất quán dữ liệu phòng, mọi cổng
dịch chuyển đi được và tới đúng chỗ, chat giới hạn phạm vi phòng, tài khoản không tồn tại/bot không
login được, look đổi được + validate, DM gửi/nhận + unread + bot tự trả lời, câu cá (trúng/trượt
vùng, pull sớm, hết giờ, rời tab), va chạm nước, ngồi/đứng (kể cả ghế không có điểm thoát), nhảy
(tự tắt khi di chuyển kể cả người đang nhảy), NPC ngoài tầm, quest (catch/talk), nâng cấp cần
(đúng chiều dễ dần), bán cá, sổ cá, shop, bạn bè.
**Chưa có test riêng cho farming** (được verify thủ công qua script kết nối socket thật + thao tác
trực tiếp trong trình duyệt, xem log phiên làm việc — nên cân nhắc thêm vào `test/server.test.js`
nếu tiếp tục).

## 11. Việc CHƯA làm (tổng hợp, ưu tiên nếu tiếp tục)

Hệ thống lớn hoàn toàn chưa đụng tới:
- **Apartments** (nội thất 531 item đã có sẵn trong `public/assets/reference/rooms/private/`,
  chưa có phòng/room data, chưa có hệ thống đặt đồ).
- **Trading** (trao đổi vật phẩm giữa người chơi).
- **Battlezone** (combat) — có khu vực `pvpArea` dựng map nhưng chưa có logic chiến đấu.

Thiếu/hẹp trong các hệ thống đã làm (chi tiết xem thêm `docs/audit-2026-11-06.md`):
- Shop chỉ bán cần câu, chưa bán trang phục/nội thất; đổi look hiện miễn phí.
- Không có hệ thống emoji/biểu cảm (khách hàng đã xác nhận **không làm** trong phiên này).
- Menu icon, quest marker, name tag vẫn là chữ/hình phẳng, chưa dùng sprite thật (file đã có sẵn
  trong `public/assets/reference/graphics/`).
- Fergus, Barnaby, Helga (3 NPC gốc còn lại) chưa map vào game.
- Nhóm bạn bè, lời mời kết bạn, chặn — chưa có.
- Farming: trồng ngẫu nhiên (không chọn được loại cây), ô đất dùng chung không theo người chơi.

## 12. Gợi ý khi tiếp tục dự án
1. Đọc lại tài liệu này + `README.md` (mục "Known limits") + `ASSETS.md` (bản đồ asset chi tiết
   từng phần, kể cả phần chưa gắn) + `docs/audit-2026-11-06.md` trước khi sửa gì.
2. Muốn thêm NPC/vật phẩm mới: file nguồn đã nằm sẵn trong `public/assets/reference/...` — không
   cần đụng tới thư mục `pixadom-reference` ngoài project nữa.
3. Rebuild lại map khi sửa tile/decor: `node tools/build-rooms.mjs <đường-dẫn-thư-mục-reference-cũ>`
   — trỏ vào `D:\Zen-Workplace\pixadom-reference\` gốc (cấu trúc thư mục đúng như script cần:
   `maps/` + `assets/...` lồng nhau). **Không trỏ vào `public/assets/reference/`** để chạy lại
   script này — khi copy vào project, phần `assets/*` đã bị dồn thẳng 1 cấp (không còn thư mục
   con `assets/` lồng bên trong `reference/`) nên đường dẫn sẽ lệch, script sẽ không tìm thấy file.
4. Luôn chạy `npm test` + `npm run build` sau khi sửa trước khi coi là xong.
