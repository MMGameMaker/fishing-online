# Fishing Online: bản Phaser

Bản port của project Cocos Creator 3.8.8 trong `client/` sang **Phaser 3.90 + TypeScript + Vite**.
Project Cocos không bị sửa gì; art được chép từ `client/assets/resources`.

## Chạy

Cần Node 18 trở lên (máy đang có Node 22).

```bash
npm install        # lần đầu
npm run dev        # mở http://localhost:5173
npm run build      # kiểm tra kiểu + đóng gói vào dist/
```

Khi sửa map / sprite sheet bên Cocos, chép lại sang đây bằng:

```bash
npm run sync-assets
```

(Lệnh này xoá rồi chép lại `public/assets/maps`, `rooms`, `sheets`, bỏ qua file `.meta`.)

## Đã port

| Bên Cocos | Bên Phaser |
|---|---|
| `GameConfig.ts` | `src/GameConfig.ts` (chép nguyên văn, Marlin ở x 2115, y 1542) |
| `RoomScene.ts` | `src/scenes/WorldScene.ts` (thế giới, camera, luồng câu cá) + `src/scenes/UIScene.ts` (HUD) |
| `world/Player.ts` | `src/world/Player.ts`: 4 lớp thân / quần / áo / tóc (frame 48x55) + cần câu, nhuộm bằng tint |
| `world/Npc.ts` | `src/world/Npc.ts` |
| `world/RoomData.ts` | `src/world/RoomData.ts` (va chạm giữ nguyên) |
| `fishing/FishingMinigame.ts` | `src/fishing/FishingMinigame.ts`: trượt một lần là thua ngay |
| `fishing/FishingPopup.ts` | `src/fishing/FishingPopup.ts` |
| `core/Sheets.ts`, `core/NodeKit.ts` | `src/core/Sheets.ts`, `src/core/Kit.ts` |
| TiledMap của Cocos | `src/world/Tmx.ts`: đọc thẳng file `.tmx` (Phaser 3 chỉ đọc Tiled JSON) và chạy hoạt ảnh tile |

Điều khiển giống bản Cocos: WASD / mũi tên hoặc chạm để đi, F / Space để câu và bấm REEL,
E / Enter để nói chuyện, B bật lớp debug, Esc đóng bảng.

Không port: `PlayerController.ts`, `CharacterAnimator.ts`, `VirtualJoystick.ts` (scene hiện tại của Cocos không dùng),
và `core/Signal.ts` (chưa có chỗ nào dùng).
