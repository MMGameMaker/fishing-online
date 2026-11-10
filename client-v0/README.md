# Fishing Online


See [ASSETS.md](ASSETS.md) for file locations, sprite dimensions, frame layouts and runtime mappings.

Stack: Phaser 3 + Vite (client), Node.js + Express + Socket.IO (server), JSON file storage in `data/db.json`.

`data/db.json` is a local runtime save (account progress, messages and farm state), not a required seed file. When it is absent, the mock server initializes test accounts from `shared/config.js` and creates the save directory/file when saving or shutting down. Git ignores only this save and its temporary write file; keep shared configuration, room data and any seed/fixture files in version control. Existing local saves are preserved.

## Fishing Online

Client Fishing Online nằm trong `src/online/`. Vào phòng **Coral Cove**: đứng cạnh ghế đẩu trống, nhấn E (hoặc bấm Sit) để ngồi; chưa có vé thì mở hộp mua vé trước. Ngồi xong nhân vật tự câu; cá cắn thì nút móc câu hiện ở góc phải dưới, bấm nút để vào minigame. Trượt cá thì tự đứng dậy; bấm phím di chuyển để rời ghế (trừ lúc đang minigame). Ghế, Gold và cá ở đây đang chạy bằng **mock** trong trình duyệt (có chữ MOCK), chưa nối Server thật, nên tách khỏi coins và Bag của prototype. `fishing.html` là trang thử riêng bằng art tạm.

| Địa chỉ | Nội dung |
| --- | --- |
| `/fishing.html` | Vào hồ: WASD/mũi tên/bấm chuột để đi, đứng cạnh ghế xanh nhấn E hoặc bấm ghế để ngồi (chưa có vé thì mua trước), ngồi xong tự câu |
| `/fishing.html?scene=ui-demo` | Trang demo UI kit |
| `/fishing.html?scene=char-debug` | 4 hướng × mọi animation của một skin |
| `/fishing.html?mockError=SEAT_TAKEN` | Mock trả lỗi giả |
| `/fishing.html?mockPing=150` | Mock giả độ trễ mạng |

Kiểm tra: `npm run typecheck`, `npm run lint:online`, `npm run test:online`, `npm run build`.

## Run

```bash
npm install
npm run dev
```

Open <http://localhost:5173/> and pick a test account; there is no registration or password. Walk into doors to move between the 8 rooms. Open a second tab with another account to test multiplayer:

- <http://localhost:5173/?user=bob>
- <http://localhost:5173/?user=cleo>

`Mochi (bot)` is a contact that auto-replies, so messaging can be tested alone.

Production-style run: `npm run build`, then `npm start`, and open <http://localhost:3001/>.

## Controls

| Key | Action |
|---|---|
| WASD, arrows or click | Move |
| Enter | Chat |
| C | Change look |
| B | Bag and selling fish |
| Q | Quest log |
| M | Direct messages |
| Menu → Friends / Shop / Fish logbook | Friends list, rod shop (Tinkerbean), caught-species log |
| Click a cushion, or the Sit prompt | Sit down; click Stand up (or X) to leave the seat |
| X | Dance in place, when not sitting (stops as soon as you move) |
| Click an NPC | Talk to them; a `!` marker over their head means a quest is offered or ready to turn in |
| Fish button or F | Cast, when standing on a fishing edge of the dock |
| Click, Space or F | Pull the line once the fish bites (pulling early loses the cast) |
| REEL button or Space | Stop the marker on the green zone, 3 times |
| Click the prompt near a farm plot (Hugglehen Farms) | Plant a seed, water it, or harvest once ready |
| Esc | Close panels |

## Layout

- `public/rooms/*.json` + `public/rooms/*.png`: generated room data (blocked tiles, colliders, exits, seats, fishing edges, decor positions) and a real baked background image per room, composited from the original tile art. Decor with downloaded source art gets a real sprite (`decor[].image`); decor whose source wasn't downloaded falls back to a flat averaged color. Rebuild both with `node tools/build-rooms.mjs <reference-folder>`.
- `shared/config.js`: movement rules, look options, fish table and reel settings, used by both sides.
- `shared/npcs.js`: the NPC roster and their quests (original names and dialogue, not the source game's).
- `shared/farming.js`: crop table and the 14 fixed plot positions for Hugglehen Farms (a mock/simplified farming system — see Known limits).
- `server/app.js`: accounts, chat, direct messages, fishing, seats, dancing, NPC conversations, quests, farming and persistence.
- `src/`: Phaser world (`world.js`, `player.js`), seat prompts (`seats.js`), NPC sprites and the quest dialog (`npc.js`), generated art for fish icons and room tiles (`art.js`), real sprite loading (`referenceArt.js`), panels incl. the main menu and quest log (`ui.js`), fishing flow (`fishing.js`) and the reel panel (`reelInterface.js`).
- `public/assets/`: the real character/NPC/button sprite sheets the client loads (`referenceArt.js`), copied in from the reference project.
- `test/server.test.js`: socket-level tests, run with `npm test`.
- [ASSETS.md](ASSETS.md): what each file under `public/assets/` is, its exact pixel/frame layout, and where it came from.

## Known limits

- No real authentication: anyone reaching the server can pick an account. Keep it local.
- The server validates walkable tiles but not movement speed.
- The reel marker runs on the client; the server checks the reported position against the zone.
- Bite delay, reel time and marker speeds are estimates, because the original keeps them on its server.
- `public/rooms/` contains the room layouts and tile art used by the project. Source and frame mappings are documented in ASSETS.md.
- Some decor (the images that weren't captured in the download — see ASSETS.md §5) still renders as a flat colored box instead of real art.
- Seats don't track occupancy, so more than one player can appear to sit in the same spot.
- Four NPCs with one quest each (look, fish, chat, talk), not the full quest-chain system. Quest rewards are coins only.
- Levels (`shared/config.js` `levelForPixels`) use pixels earned from fish value and quest coins; there's no separate pixel/currency split like the original, and no badges.
- The rod shop is a Menu button, not an in-world Tinkerbean NPC/room yet — buying levels 1-5 widens the reel zone (see `REEL.zoneWidths`).
- Friends are a plain add/remove list with online status — no friend requests, groups, or blocking.
- Storage is a single JSON file (`data/db.json`), fine for local testing only.
- Farming (Hugglehen Farms) is a mock, simplified system: plots are shared (not per-player), planting always picks a random crop (no choice menu), and the 14 plot positions are an approximation placed in the room's open walkable area, not a pixel-exact match to the baked "PLOT" tile art.
- Not built yet: groups, a real currency/shop beyond rod levels, apartments, trading, Battlezone combat.
