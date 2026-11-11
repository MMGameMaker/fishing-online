# Feedback bản thử gameplay câu cá

Bản thử: commit `5a76e0b` trên `main` (SPEC_CHUNG v0.10, luật vé GD 2026-11-10).

Cách ghi: mỗi feedback một dòng. Ghi chỗ gặp (Coral Cove hay fishing.html), việc đang làm, điều thấy được và điều muốn có. Chỉ sửa code khi người dùng bảo.

Mức độ: **Cao** (chặn chơi, sai luật), **Vừa** (khó chịu, lệch GD), **Thấp** (giao diện, câu chữ).

## Vé và ghế

| # | Chỗ gặp | Hiện tại | Mong muốn | Mức độ | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 1 | Đến gần ghế, muốn vào câu | Nhấn **E** cạnh ghế trống để ngồi (theo GAMEPLAY_SCOPE GD 2026-11-10) | Khi đã hiện icon chọn ghế thì ấn **F** hoặc click vào icon để ngồi. Khác luật đã chốt "nhấn E", cần cập nhật GAMEPLAY_SCOPE/SPEC khi sửa | | Đã sửa 2026-11-11: F hoặc bấm icon Sit/số ghế để ngồi (`world.js`, `LakeScene.ts`); đã thử F trên fishing.html (mock). Coral Cove chưa thử trình duyệt (cần đăng nhập Google). GAMEPLAY_SCOPE, SPEC 0.11 đã cập nhật |

## Câu cá và minigame

| # | Chỗ gặp | Hiện tại | Mong muốn | Mức độ | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 1 | Cá cắn câu, icon móc câu để thu cần | Nút móc câu 96 px ở góc phải dưới màn hình, chỉ bấm chuột/chạm vào nút (theo GAMEPLAY_SCOPE GD 2026-11-10) | Icon to hơn, đặt gần giữa màn hình; thu cần bằng phím **Space** hoặc click vào icon. Khác luật đã chốt "nút ở góc phải", cần cập nhật GAMEPLAY_SCOPE/SPEC khi sửa | | Đã sửa 2026-11-11: nút tròn 136 px gần giữa màn hình (ngay dưới nhân vật), có chữ SPACE; Space hoặc bấm nút để thu cần (`FishButton.ts`). Đã thử trên fishing.html (mock) |
| 2 | Bấm thu cần, vào minigame | Minigame hiện ngay khi Server trả kết quả thu cần (`startMinigame` trong `FishingFlow.ts`), không có khoảng chờ | Chờ 2 giây rồi minigame mới xuất hiện. Hạn minigame do Server tính từ lúc thu cần, nên khi sửa phải để Server cộng thêm 2 giây (hoặc tính hạn từ lúc minigame hiện), tránh mất 2 giây chơi | | Đã sửa 2026-11-11: config mới `minigame.introMs` = 2000; Server tính `startedAt = lúc thu cần + 2 giây`, hạn lùi theo (migration `BEE_MinigameIntro`); Client chờ 2 giây theo giờ thật rồi mới hiện. Đã thử trên fishing.html: minigame hiện sau ~2,04 giây; test Server và Client đạt |
| 3 | Giao diện minigame | Khung 400x96 ở phần trên màn hình: chữ "Khoảng cách tới cá" + thanh HP mỏng, số giây dạng chữ, thanh đo thẳng có vùng xanh/vàng và kim, dòng hướng dẫn ở dưới (`MinigameScene.ts`) | Dựng lại theo ảnh mẫu [feedback/minigame-ui.png](feedback/minigame-ui.png), xem chi tiết ở mục "Ảnh mẫu minigame" bên dưới | | Đã sửa 2026-11-11 (`MinigameScene.ts`): đồng hồ tròn, thanh khoảng cách có chấm trắng + con cá + số cm còn lại (= HP, cá tiến lại gần khi trúng), thanh đo bo tròn có kim hai đầu nhọn. Đã chụp trên fishing.html (mock); chờ người dùng xem lại |
| 4 | Bấm thu cần, chờ minigame sau lần sửa #2 | Minigame hiện sau 2 giây (`minigame.introMs` = 2000) | Đổi khoảng chờ thành 0,75 giây (`introMs` = 750); Server, fixture và migration config đã lưu cũng phải đổi theo | | Đã sửa 2026-11-11: `minigame.introMs` = 750 ở fixture, migration `BEE_MinigameIntro` và mặc định Client. Đã thử trên fishing.html (mock): minigame hiện sau ~0,79 giây; test Server (Domain 156, Api 196) và Client (190) đạt |
| 5 | Kim trắng trong minigame | `needlePassMs` theo độ hiếm: 900 / 800 / 700 / 600 / 550 ms | Giảm 20% (kim nhanh hơn) | | Đã sửa 2026-11-11: 720 / 640 / 560 / 480 / 440 ms trong `gameplay-config.v0.json` và mẫu `minigame-vectors.v0.json`, bảng độ khó trong GAMEPLAY_SCOPE. Test Server (Domain 156, Api 196) và Client (190) đạt. Server thật đã có config trong DB thì cần publish bản mới qua Admin mới có hiệu lực |
| 6 | Cá cắn câu: nút kéo và dấu ! | Nút móc câu nhấp nhẹ (phóng 6%, 0,6 giây/nhịp); dấu ! đứng yên | Nút kéo nhấp mạnh và dày hơn; dấu ! lắc trái phải | | Đã sửa 2026-11-11: nút phóng tới 125%, 0,36 giây/nhịp (`fishing.css`); dấu ! lắc ±3 px ở fishing.html (`CharacterView.ts`) và Coral Cove (`player.js`). Đã thử trên fishing.html (mock): dấu ! dịch -2,8..3 px, nút chạy hiệu ứng mới. Coral Cove chưa thử trình duyệt |

## Kết quả, túi đồ, shop

| # | Chỗ gặp | Hiện tại | Mong muốn | Mức độ | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 1 | Popup nhận cá khi câu được | Popup chỉ có ô vuông màu theo độ hiếm thay cho hình cá (`openPopup` trong `FishingFlow.ts`); hình cá chỉ xuất hiện sau khi bấm nhận/đóng popup | Hình (icon) con cá phải hiện ngay trong popup nhận cá, không đợi bấm nhận rồi mới xuất hiện | | Đã sửa 2026-11-11: popup hiện hình cá pixel ngay khi mở (Coral Cove dùng màu từng loài, fishing.html dùng màu độ hiếm). Hình cá vẫn là art tạm. Đã thử trên fishing.html (mock) |
| 2 | Câu được cá trong Coral Cove | Hình cá to hiện trên đầu nhân vật của mình sau khi câu được (`showCatch` gọi từ `CoralCoveOnline.ts`) | Tắt hình cá trên đầu nhân vật | | Đã sửa 2026-11-11: bỏ lời gọi `showCatch` khi câu được; hình cá chỉ còn trong popup. Phần người chơi khác thấy cá trên đầu mình (`CatchShown`, theo GD) vẫn giữ ở fishing.html. Chưa thử trình duyệt Coral Cove |

## Giao diện, âm thanh, hình ảnh

| # | Chỗ gặp | Hiện tại | Mong muốn | Mức độ | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 1 | Camera khi đi lại trên map | Camera bám theo nhân vật, zoom vừa khung 1024x716 theo cửa sổ (`cameraZoom` trong `world.js`) | Đẩy camera xuống (zoom xa hơn) để nhìn thấy màn chơi rộng hơn. Cần chốt mức zoom khi sửa | | Đã sửa 2026-11-11: Coral Cove thấy rộng hơn 25% (khoảng 1280x895, `ROOM_VIEW_SCALE` trong `world.js`) theo lựa chọn của người dùng. Chưa thử trình duyệt (cần đăng nhập Google) |
| 2 | Camera Coral Cove sau lần sửa #1 | Coral Cove thấy rộng hơn khung chuẩn 25% (khoảng 1280x895) | Zoom gần camera lại 50%: người dùng chốt 2026-11-11 là phóng to 50% so với hiện tại, tức thấy khoảng 853x597 (nhỏ hơn khung chuẩn 1024x716) | | Đã sửa 2026-11-11: `ROOM_VIEW_SCALE.coralCove` = 1,25 / 1,5 trong `world.js`. Chưa thử trình duyệt (Coral Cove cần đăng nhập Google) |
| 3 | Camera Coral Cove sau lần sửa #2 | Thấy khoảng 853x597 | Zoom gần thêm 20% | | Đã sửa 2026-11-11: `ROOM_VIEW_SCALE.coralCove` = 1,25 / 1,5 / 1,2 ≈ 0,69, thấy khoảng 711x497 (`world.js`). Chưa thử trình duyệt (Coral Cove cần đăng nhập Google) |

## Khác

| # | Chỗ gặp | Hiện tại | Mong muốn | Mức độ | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 1 | Coral Cove (`world.js`) và fishing.html (`LakeScene.ts`) | Click chuột lên map thì nhân vật tự đi tới điểm đó | Bỏ di chuyển nhân vật bằng chuột | | Đã sửa 2026-11-11: bỏ click để đi ở cả hai nơi; bấm số ghế khi ở xa chỉ nhắc "Hãy đi tới gần ghế để ngồi". Đã thử trên fishing.html (bấm map, nhân vật đứng yên). Coral Cove chưa thử trình duyệt |

## Ảnh mẫu minigame (feedback Câu cá #3)

![Ảnh mẫu minigame](feedback/minigame-ui.png)

Mô tả theo ảnh:

- Cả cụm nằm ở nửa dưới, giữa màn hình; phần trên để trống cho thấy map.
- Bên trái: vòng tròn đếm giờ, viền xanh lá với phần xám là thời gian đã trôi, số giây còn lại ở giữa (ví dụ 11).
- Hàng trên: thanh khoảng cách màu xám có các chấm trắng, biểu tượng con cá ở đầu bên phải, số "85cm" phía trên góc phải. Người dùng chốt 2026-11-11: chấm trắng và số cm là khoảng cách còn lại tới cá (HP).
- Hàng dưới: thanh đo bo tròn hai đầu, vùng xanh dương với vùng vàng nằm trong, kim trắng dạng vạch đứng có hai đầu nhọn chạy qua lại.
- Không còn chữ "Khoảng cách tới cá" và dòng hướng dẫn như bản hiện tại.

## Ghi chú tự do

-
