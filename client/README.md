# Fishing Online — Web Client

Web client cho Playable v0.1. Cocos Creator **3.8.x** + TypeScript, 2D.

## Scene demo hiện có

`assets/Main.scene` — nhân vật chạy quanh map, camera bám theo nhân vật.

Toàn bộ object nằm thật trong scene, thấy và chỉnh được trong Hierarchy của editor:

```
Scene
└─ Canvas            (Canvas + Camera 2D, design 960x640)
   ├─ Camera
   ├─ World           <- node bị dịch chuyển để camera bám nhân vật
   │  ├─ Map          (một sprite duy nhất: map_lake.png, 1920x1440)
   │  └─ Player       <- gắn PlayerController và CharacterAnimator
   ├─ Joystick        <- gắn component VirtualJoystick, cố định góc dưới bên trái
   │  └─ Knob         (nút tròn di chuyển theo ngón tay)
   └─ HUD             (Label hướng dẫn)
```

Map là một hồ nước hình elip, có viền đá quanh hồ, nền đất rải sỏi và tảng đá, và viền đá quanh mép map. Nhân vật **không đi xuống nước được** và trượt dọc theo bờ khi đi sát vùng cấm.

### Vùng cấm quanh hồ

Hồ được **vẽ theo ô vuông 48 đơn vị**, còn va chạm lại tính theo **hình elip trơn**. Hai hình này không khớp nhau, sai lệch cỡ nửa ô tức 24 đơn vị. Vì vậy cần `lakeMargin` làm đệm, nếu không vài chỗ nhân vật sẽ dẫm lên mặt nước.

Bán kính vùng cấm bằng `lakeRadius` cộng `halfSize` cộng `lakeMargin`.

| `lakeMargin` | Chỗ dẫm lên nước | Khoảng cách tới mép nước |
| --- | --- | --- |
| 0 | còn nhiều | 2 đến 50 |
| 16 | hết | 8 đến 66 |
| 48 (đang dùng) | hết | 42 đến 100 |
| 96 | hết | 92 đến 152 |

Dưới 16 thì không bảo đảm được. Khoảng cách dao động vì mép hồ là bậc thang chứ không trơn.

Muốn nhân vật đứng **sát mép nước** chứ không phải cách một quãng, cách đúng là bỏ hẳn va chạm hình elip và sinh lưới va chạm theo ô từ `tools/gen-map.js`, vì khi đó va chạm khớp với hình vẽ theo đúng định nghĩa.

Joystick vẫn dùng sprite **built-in của Cocos** `default_radio_button_off` cho hai vòng tròn.

## Nhân vật và hoạt ảnh

Nhân vật dùng hai sheet trong `assets/arts/character/character 1/`, mỗi sheet 128x128 gồm lưới 4x4 ô 32x32. Bốn hàng là bốn hướng theo thứ tự **xuống, trái, phải, lên**, mỗi hàng 4 frame.

`tools/gen-character.js` cắt hai sheet thành 32 file sprite frame riêng trong `assets/arts/character/frames/`, đặt tên kiểu `walk_left_2.png`, và phóng to sẵn 3 lần thành 96x96 cho khớp tỉ lệ map.

```bash
node client/tools/gen-character.js
```

Hoạt ảnh do `CharacterAnimator` lo, **không dùng AnimationClip** nên không phải sinh file `.anim`. Component tự đếm thời gian và đổi `spriteFrame`. Tám mảng frame được nối sẵn trong scene và sửa được trong Inspector.

| Thuộc tính | Giá trị | Ý nghĩa |
| --- | --- | --- |
| `target` | Sprite trên Player | Sprite được đổi frame |
| `idleDown` … `walkUp` | 4 frame mỗi mảng | Tám bộ frame theo trạng thái và hướng |
| `idleFps` | 4 | Tốc độ frame khi đứng yên |
| `walkFps` | 10 | Tốc độ frame khi di chuyển |

Hướng quay chọn theo trục có độ lớn lớn hơn, nên đi chéo sẽ lấy trục trội hơn.

Hướng đổi theo **input**, không theo việc có thực sự dịch chuyển hay không. Nhờ vậy khi người chơi đẩy vào bờ hồ, nhân vật vẫn quay mặt ra nước dù đang đứng yên. Đây là hành vi cần cho game câu cá, vì người chơi phải đứng trên bờ và hướng ra hồ. Khi bị chặn, nhân vật chơi hoạt ảnh đứng yên chứ không giậm chân tại chỗ.

Đổi hướng được áp dụng ngay trong khung hình đó, không chờ nhịp đếm frame kế tiếp.

## Map và công cụ dựng map

`assets/arts/map_lake.png` được ghép từ tileset `assets/arts/FG_Abandoned_Mines.png` bằng `tools/gen-map.js`.

Map gốc là 40x30 ô tile 16px, tức 640x480, rồi phóng to sẵn 3 lần bằng thuật toán nearest neighbour thành 1920x1440. Phóng to sẵn trong ảnh giúp pixel luôn sắc nét, không phụ thuộc cấu hình lọc texture.

Dựng lại map sau khi chỉnh thông số:

```bash
node client/tools/gen-map.js
```

Các thông số chỉnh ở đầu `tools/gen-map.js`: số ô `COLS` và `ROWS`, bán kính hồ `LAKE_RX` và `LAKE_RY`, độ dày viền đá `RIM`, hệ số phóng to `SCALE`, và danh sách tile `GROUND`, `ROCK`, `WATER`.

Nếu đổi kích thước map hoặc hồ, phải cập nhật lại các thuộc tính tương ứng của `PlayerController` trong scene, nếu không va chạm sẽ lệch với hình.

`tools/png.js` là bộ đọc ghi PNG tối giản chỉ dùng `zlib` có sẵn của Node, không cần cài thêm gói nào.

## Cách chạy

1. Mở Cocos Creator 3.8.x, chọn **Open Project**, trỏ vào thư mục `client/`.
2. Lần đầu mở, editor sẽ import và sinh `temp/`, `library/` (đã bị `.gitignore` bỏ qua).
3. Mở `assets/Main.scene`. Bạn sẽ thấy map và nhân vật ngay trong Scene view.
4. Bấm **Preview**.
5. **Bấm chuột vào khung game một lần** để canvas nhận bàn phím, rồi dùng WASD hoặc phím mũi tên.

Nếu không di chuyển được, mở Console và kiểm tra theo thứ tự:

1. Có lỗi `Script "..." attached to "Player" is missing or invalid` không? Nghĩa là component chưa bind được, xem mục Ghi chú kỹ thuật bên dưới.
2. Có dòng `[PlayerController] San sang...` không? Có nghĩa là script đã chạy, vấn đề còn lại là focus bàn phím, hãy click vào khung game rồi mới nhấn phím.

## Ghi chú kỹ thuật

Scene tham chiếu component script bằng **class id**, không phải UUID đầy đủ. Cocos sinh class id bằng cách giữ 5 ký tự hex đầu của UUID script rồi nén 27 ký tự còn lại theo nhóm 3 thành base64, ra chuỗi 23 ký tự. Lưu ý đây khác với cách nén UUID asset (giữ 2 ký tự đầu, ra chuỗi 22 ký tự).

Class id thật luôn tra được từ mã đã biên dịch:

```bash
grep -rhoE '_RF\.push\([^)]*"(PlayerController|VirtualJoystick)"[^)]*\)' client/temp/programming/
```

Giá trị trong `_RF.push` phải khớp đúng `__type__` của component trong `Main.scene`:

| Script | UUID trong `.meta` | Class id trong scene |
| --- | --- | --- |
| `PlayerController.ts` | `b1c2d3e4-5f60-4a71-8b82-9c0d1e2f3a4b` | `b1c2dPkX2BKcYuCnA0eLzpL` |
| `VirtualJoystick.ts` | `c1d2e3f4-6a70-4b81-9c92-ad0e1f2a3b4c` | `c1d2eP0anBLgZySrQ4fKjtM` |
| `CharacterAnimator.ts` | `f1a2b3c4-7c80-4d91-8e02-bf1a2c3d4e5f` | `f1a2bPEfIBNkY4CvxosPU5f` |

Nếu đổi UUID script thì phải cập nhật `__type__` trong scene theo, nếu không component sẽ thành missing script và mất hết chức năng.

## Điều khiển

Hai cách dùng được đồng thời:

- **Bàn phím:** WASD hoặc phím mũi tên. Luôn chạy tốc độ tối đa. Cần click vào khung game trước để canvas nhận phím.
- **Joystick ảo:** kéo vòng tròn ở góc dưới bên trái bằng chuột hoặc cảm ứng. Tốc độ tỉ lệ theo độ kéo, nên kéo nhẹ thì đi chậm. Không cần focus bàn phím nên dùng được trên mobile.

Camera tự bám theo nhân vật và dừng lại ở biên map.

## Thông số

Node `Player`, component `PlayerController`:

| Thuộc tính | Giá trị | Ý nghĩa |
| --- | --- | --- |
| `speed` | 520 | Tốc độ tối đa, pixel mỗi giây |
| `world` | World | Node bị dịch để camera bám nhân vật |
| `joystick` | Joystick | Component joystick; để trống nếu chỉ dùng bàn phím |
| `animator` | Player | Component hoạt ảnh nhân vật |
| `mapWidth` / `mapHeight` | 1920 / 1440 | Kích thước map, dùng để kẹp biên |
| `edgePadding` | 48 | Bề dày viền đá quanh mép map |
| `lakeRadiusX` / `lakeRadiusY` | 624 / 384 | Bán kính mặt nước; đặt 0 nếu map không có hồ |
| `lakeMargin` | 48 | Khoảng đệm giữ nhân vật cách xa mép nước, 48 là đúng một ô tile |
| `viewWidth` / `viewHeight` | 960 / 640 | Khung nhìn, dùng để kẹp camera |
| `halfSize` | 20 | Nửa bề rộng va chạm, hẹp hơn sprite 96px cho sát thân nhân vật |

Node `Joystick`, component `VirtualJoystick`:

| Thuộc tính | Giá trị | Ý nghĩa |
| --- | --- | --- |
| `knob` | Knob | Nút tròn di chuyển theo ngón tay |
| `radius` | 60 | Bán kính tối đa nút rời khỏi tâm |
| `deadZone` | 0.15 | Vùng chết ở giữa, dưới mức này coi như không di chuyển |

Design resolution 960x640 đặt trong Project Settings.

## Lưu ý

- Đây là demo kiểm tra khung chuyển động, chưa phải gameplay thật. Sprite là placeholder built-in; pixel art thật sẽ thay sau theo quy cách đã chốt.
- Nhân vật chưa có collision với `rock_*`. Hiện chỉ kẹp trong biên map.
- Điều khiển hiện chỉ có bàn phím, chưa có chạm/chuột cho thiết bị mobile.
