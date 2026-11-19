# W02 — Art và map hồ

- **Trạng thái chung:** Đang làm. Đã kiểm tra lát công cụ và map mẫu.
- **Nguồn yêu cầu:** [W02 trong Phân rã công việc Playable v0.1](https://app.notion.com/p/40d5f439904b8116956dca7b922a1067) và yêu cầu Isometric Tilemap Converter.
- **Phạm vi lượt này:** CLI, fixture đảo, xuất PNG/TMX/TSX và kiểm tra import/render Cocos. Map hồ 20 ghế và các hạng mục Art khác của W02 vẫn mở.
- **Người sửa phần chung:** Codex, phạm vi converter và bàn giao W02.

## Web Client (kiêm Art/asset 2D)

- **Agent / trạng thái:** Codex. Pipeline terrain chạy được và có hướng dẫn cho asset cần redraw.
- **Đầu ra:** [CLI và hướng dẫn](../../tools/isometric-converter/README.md), [report](../../tools/isometric-converter/example/output/island/report.json), [ảnh Web Desktop](../../tools/isometric-converter/example/output/island/cocos-3.8.8-web.png). Đảo tạo bằng mã cho smoke test. Sheet cây dự án được dùng để kiểm tra luồng review, giữ nguyên file nguồn RGB và lưới 8 × 1.
- **Kiểm tra:** 4 bài test đạt, fixture có 16 tile và 220 cặp cạnh đạt. Cocos Creator 3.8.8 import và build Web Desktop. Kiểm tra layer Terrain, GID và điểm Interaction trong runtime. Canh pha pixel ngang tại viewport thử để bỏ lỗ một pixel.
- **Tiếp theo:** Chọn tileset terrain trong nguồn resource hợp lệ của dự án cho map thật. Kiểm tra zoom, viewport, collision, depth sorting, walkable và 20 seat ID khi scene hồ và fixture map sẵn sàng.

## Các vai trò khác

GD, Server và Admin Tool chưa tham gia lát công cụ. Fixture đảo chạy độc lập, chưa tích hợp contract Client–Server.

## Web Client — Prototype hồ câu

- **Phạm vi:** Hồ liền mặt nước, đường đất vòng bờ, lối vào và bốn cầu gỗ. Asset và preview nằm trong [prototype hồ câu](../../tools/isometric-converter/example/lake/README.md).
- **Nguồn:** Farming Game World của ElvGames. Dùng swatch cỏ từ Grounds và màu đất/gỗ từ Grasslands Spring. Bờ, nước, đường và hình cầu dựng bằng mã.
- **Kiểm tra:** TMX isometric 52 × 48, 1.052 ô atlas RGBA, đủ 20 anchor đi được từ Spawn theo lưới thử. Đã xem preview. Chưa chạy map hồ mới trong Cocos.
- **Tiếp theo:** Kiểm tra map trong Cocos và thống nhất seat ID, walkability với fixture chung khi tích hợp.

- **Chỉnh hình ảnh:** Kéo dài cầu chính, thu ngắn ba cầu phụ, thêm cạnh gỗ và bóng. Bờ, đường đất và màu nước đã chỉnh lại. Xuất lại preview và TMX, đủ 20 anchor đi được từ Spawn. Chưa chạy bản sửa trong Cocos.

- **Bộ tile rời:** [Lake kit](../../tools/isometric-converter/example/lake-kit/output/gallery.png) có 38 tile 48 × 24, TSX Wang và PNG riêng. Dùng mẫu cỏ/nước/đất từ Farming Game World (ElvGames), tự dựng chuyển tiếp và mô-đun cầu. Kiểm tra 256 cặp cạnh tương thích. Kit chưa được áp vào map hồ hiện có.

- **Chiều sâu map hồ:** Thêm vách đất lộ ở bờ hướng camera, mặt bên ván, cọc và bóng cầu. Đã xem preview và tạo lại TMX với 20 anchor đi được. Phần chiều cao hiện nằm trong atlas riêng của map hồ. Chưa chạy bản này trong Cocos.

- **Bố cục hồ mới:** Mở rộng hồ, thay cầu bằng 10 chòi gỗ có mái, 3 chỗ mỗi chòi. Xuất TMX và layout với 30 anchor, có hutId và đường đi từ Spawn theo lưới thử. Chưa kiểm tra trong Cocos hay tích hợp sức chứa phòng với Server.

## Web Client — Thử palette Fan-tasy và ghép hồ top-down

- **Phạm vi Codex:** Atlas nước và map mẫu riêng tại [fan-tasy-lake](../art/fan-tasy-lake/). Nguồn là Tileset_Water và Tileset_Ground do người dùng cung cấp từ The Fan-tasy Tileset (Free) 1.5.9.
- **Đầu ra:** [Atlas nước](../art/fan-tasy-lake/Tileset_Water_Refined.png) 384 × 208, lưới 16 × 16, giữ metadata animation và Wang từ TSX nguồn. Chỉ thay hai màu nước đục từ #87C7DF / #70B4DA sang #56B4CB / #3796BA. [Map Tiled](../art/fan-tasy-lake/Lake.tmx) 18 × 26 ô và [preview](../art/fan-tasy-lake/Lake_Preview.png) ghép từ các tile nước và cỏ nguyên ô.
- **Kiểm tra:** Đối chiếu toàn bộ pixel RGBA của atlas với phép đổi palette, 44.452 pixel đổi màu. 892 cặp ô liền kề khớp Wang. Toàn bộ pixel preview khớp dữ liệu TMX ở khung đầu và đã xem ảnh xuất.
- **Tiếp theo:** Kiểm tra animation và hiển thị map trong Tiled/Cocos khi đưa mẫu vào scene.

### Bản 64 × 64

- **Đầu ra:** [Map Tiled](../art/fan-tasy-lake-64/Lake.tmx), [atlas nước](../art/fan-tasy-lake-64/Tileset_Water_Refined.png) và [preview](../art/fan-tasy-lake-64/Lake_Preview.png). Hai atlas phóng nearest-neighbor 4×, giữ ID và frame gốc. TMX, TSX và tọa độ hình va chạm trong TSX cùng chuyển sang đơn vị pixel mới.
- **Bờ hồ:** Tăng từ 14 lên 42 ô góc lồi/lõm lấy từ atlas để bo hai đầu và tạo hai đoạn lõm dọc bờ. Dáng hồ vẫn theo chiều dọc.
- **Kiểm tra:** Đối chiếu mọi pixel RGBA của hai atlas với bản trước, kiểm tra 892 cặp ô liền kề theo Wang và xem preview. Còn kiểm tra animation và hiển thị trong Cocos.

- **Biến thể bờ:** Cập nhật TMX và preview 64 × 64 tại chỗ bằng 31 ô thuộc 13 biến thể cạnh/góc sẵn có của Fan-tasy. Mỗi ô thay thế có cùng Wang ID với ô trước. Đã xem preview, bờ dài có thêm đoạn lồi/lõm nhẹ và các góc bo đa dạng hơn. Kiểm tra animation trong engine vẫn mở.

## Web Client — Map bến cá (fishing pier) xem trước

- **Phạm vi Claude:** [PierScene](../../client-v0/src/online/scenes/pier/PierScene.ts) và trang `client-v0/pier.html`. Chưa nối LakeScene, walkable, seat hay Server.
- **Nguồn:** Dựng lại theo ảnh map gốc `public/new resources/art/ac50186c-…png` (1088 × 800) do người dùng cung cấp. Bản bố cục tự sắp trước đó đã bị thay thế.
- **Cách dựng:** Đối chiếu điểm ảnh từng ô 16px với 1.149 ô nền của atlas fishing-pier, rồi dò vị trí sprite (atlas fishing-pier và main-town) bằng template matching, có xử lý vật bị che và tràn mép. Đồng thời giải ô nền + 171 ô bóng dưới mép cầu. Bóng map trong ảnh gốc có alpha hiệu dụng 144/255, khác 102/255 trong atlas, nên scene tạo texture bóng riêng. Kết quả nằm trong [fishingPierMap.json](../../client-v0/src/online/scenes/pier/fishingPierMap.json): 68 × 50 ô nền, 171 ô bóng, 325 object (bờ nước, cây có animation, hải đăng, tiệm cá, tàu lớn, thuyền, thùng, cọc, bàn ghế, máy bán nước, biển chỉ đường, bóng object). Ghép thử bằng script lệch 1,5% điểm ảnh so với ảnh gốc, chủ yếu ở viền bóng và máy hồng.
- **Thiếu asset:** Máy bán nước màu hồng cạnh máy cam không có trong atlas, art hay gif. Theo quyết định của người dùng, tạm đặt máy cam vào chỗ đó.
- **Kiểm tra:** 5 test map pier đạt, typecheck/eslint/prettier sạch. Đã chạy trên trình duyệt, không có lỗi tải tài nguyên. FPS animation (cây, tàu, bờ) là giá trị tự chọn.
- **Animation nước:** Ảnh gốc là một khung tĩnh, gợn nước trong game gốc do WaterAnimationManager sinh lúc chạy. Đã thêm `pillarRiverFlow` ở 31 chân cọc dưới cầu (dò theo màu chân cọc trên ảnh gốc). Thêm 18 gợn sóng (`riverFlowLong/Short`, `riverLine`, `riverCurve`) hiện ngẫu nhiên trên 526 ô nước trống (không bóng, không bị thuyền che), chạy một lượt rồi chuyển chỗ. Số lượng, nhịp và FPS là giá trị tự chọn. 8 test pier đạt, đã xem trên trình duyệt.
- **Tiếp theo:** Khi có sprite máy hồng thì thay vào. Nếu dùng làm map câu thật cần thống nhất walkable/seat với Server.

## Web Client — Khu fishing-cabin xem trước

- **Phạm vi Claude:** [CabinScene](../../client-v0/src/online/scenes/cabin/CabinScene.ts) và trang `client-v0/cabin.html`, gồm 3 map: cabin lớn, cabin vừa, sân sau. Bấm cửa để đi giữa phòng và sân sau. Chưa nối LakeScene, walkable hay Server. Camera xem trước dùng chung với pier ở `scenes/preview/previewCamera.ts`.
- **Phòng lg/md:** Ghép lại nguyên bản từ `embedded-metadata-0.json` (sàn, tường trước) và atlas `sheet-room-fishing-cabin-0`. Vị trí tường trước, vách giữa, cửa, cửa sổ và chim dò bằng so khớp điểm ảnh với sàn (tường/vách khớp 100%). Va chạm trong `maps/fishing-cabin-{lg,md}.json` trùng khớp tường khi bật lớp kiểm tra (phím C). Có animation cửa sổ và chim ở bệ cửa sổ.
- **Sân sau:** Tự dựng vì atlas `fishing-cabin-yard` chỉ có 163 ô 16 × 16, không có vị trí ghép. Bố cục bám theo va chạm của `fishing-cabin-backyard.json`. Nền cỏ/lối cát lọc theo màu góc ô. Ao 3 × 3 dùng ô bờ có animation của atlas fishing-pier, phần cát được làm trong suốt lúc chạy. Vách sau nhà và cọc rào cắt từ khúc gỗ của tường trước phòng lg, vì không có art vách ngoài riêng.
- **Kiểm tra:** 7 test cabin + 4 test pier đạt, typecheck/eslint/prettier sạch. Đã chạy cả 3 map trên trình duyệt, tài nguyên tải đủ, cửa chuyển map hai chiều, animation chim/cửa sổ chạy (bước vòng lặp thủ công vì pane bị ẩn).
- **Tiếp theo:** Người dùng duyệt sân sau. FPS animation là giá trị tự chọn. Nếu có art vách ngoài/hàng rào thật của sân sau thì thay phần cắt từ phòng lg.

## Web Client — Nhân vật thỏ tạm từ atlas cosmetics (ART-02)

- **Phạm vi Claude:** Thay sprite vẽ tạm bằng thỏ ghép từ `public/new resources/anim/atlases/sheet-cosmetics-*` theo yêu cầu người dùng, giữ nguyên điều khiển và luồng câu cá hiện có. Script [bake_characters.py](../../client-v0/tools/bake_characters.py) xuất `public/assets/characters/skin_01..05` (thỏ brown, cream, dark, tan, vienna-blue) và `public/assets/rods/<rodId>` cho 5 cần trong gameplay-config. Định dạng Phaser JSON Hash, frame `<anim>_<dir>_<i>` theo ART-02, pivot chân ghi trong `anchor`; số frame/tốc độ và `headTop` nằm trong JSON.
- **Mã:** [characterArt.ts](../../client-v0/src/online/entities/characterArt.ts) nạp art trong BootScene. `placeholderArt` đọc số frame/tốc độ từ JSON, id chưa có art vẫn dùng sprite vẽ tạm. `CharacterView` dùng pivot của frame và đặt nhãn tên/icon theo `headTop`.
- **Tạm thời:** Map skin/cần ↔ asset do Claude chọn, chờ GD chốt. Atlas không có tư thế thân cho cast/wait/bite/reel/success/fail: thân đứng yên, lớp cần chạy animation quăng 20 frame gốc. bite rung ±1px, reel nhún 1px, success/fail thu dây ngược. Không cầm cần khi idle/walk. Vị trí cần so với thân suy ra từ gốc trên-trái chung của atlas và bóng `general/bunny_shadow`, chưa có tài liệu xác nhận.
- **Kiểm tra:** 206 test client đạt, typecheck/eslint sạch. Trên `fishing.html` (mock): trang `?scene=char-debug` đủ 4 hướng × 8 animation. Đi bằng phím chạy `walk` 10 frame rồi về `idle`. Ngồi ghế, mua vé mock, tự quăng, cá cắn, bấm nút sang `reel` và mở minigame. Bot cũng hiện là thỏ.
- **Tiếp theo:** GD chốt danh sách skin/cần và có cần tư thế câu riêng cho thân hay không. Nếu có art pose thật thì chỉ cần thay bảng ANIMS trong script và chạy lại.

## Web Client — Chơi trên map pier (pier.html)

- **Yêu cầu người dùng:** Trên `pier.html`, thỏ đi bằng WASD/mũi tên trên bãi cát và cầu, không xuống nước, camera theo nhân vật. Câu cá thì phải ngồi lên ghế có sẵn trên map.
- **Cách làm:** `pier.html` chạy đúng game của `fishing.html` (BootScene → LakeScene, FishingFlow, SeatUi/vé, Minigame, bot mock) với map chơi riêng. Thêm điểm cắm hình nền [mapArt.ts](../../client-v0/src/online/scenes/lake/mapArt.ts): không có art thì LakeScene vẫn vẽ hồ placeholder như cũ. [PierArt.ts](../../client-v0/src/online/scenes/pier/PierArt.ts) vẽ map pier (thay PierScene xem trước). Canvas phủ kín cửa sổ, camera phóng để thấy khoảng 300px map. Đã bỏ phím F toàn màn hình vì F là phím ngồi ghế.
- **Map chơi được** (`lake` trong fishingPierMap.json, schema LakeMap): lưới 136 × 100 ô 8px. Sửa theo phản hồi người dùng (đi xuyên vật, lấn xuống nước). Ô có nước (trừ vài điểm bọt sóng) là chặn. Mọi vật thể chặn gần trọn hình, chừa 20% mép trên: ghế đẩu, ghế băng, bàn, thùng, máy bán nước, thùng rác, cọc, đệm. Cây chỉ chặn gốc, hải đăng/tiệm chặn phần chân. Có 22 ghế câu = ghế đẩu/ghế băng có sẵn giáp nước, hướng quay ra nước. Ghế là vật cản nên rời ghế thì LakeScene đặt nhân vật sang chỗ đứng được gần nhất (`nearestStandable`, ≤ 24px). Spawn ở bãi cát.
- **Ngồi ghế:** Thêm animation `sit` (ART-02) và `CharacterView.setSeated`. Khi đang giữ ghế, `idle` hiển thị tư thế ngồi. Art thỏ bake lại: cast/wait/bite/reel/success/fail dùng thân `sit_down/side/up`. Người chơi khác ngồi theo `PlayerView.seatId`.
- **Kiểm tra:** 213 test client đạt (có test mọi ghế/bàn/thùng/máy bán nước và mọi ô nước đều không đứng được), typecheck/eslint/prettier sạch. Trên trình duyệt (mock, chạy cả cổng 5173 của người dùng): đi thẳng vào ghế băng, chồng thùng, ghế đẩu, bàn picnic, mép sông đều dừng ngay trước vật/mép nước. Rời ghế băng `seat-12` thì được đặt ra chỗ trống và đi tiếp. đi trên cát/cầu, bị chặn ở mép nước. F cạnh ghế đẩu `seat-13`, mua vé mock, thỏ ngồi, quăng, chờ, cá cắn, kéo, mở minigame ở chế độ toàn cửa sổ. Rời ghế, thỏ đứng dậy rồi đi tiếp được. `fishing.html` vẫn dùng hồ cũ.
- **Giới hạn:** Server thật chưa có map pier (ghế, vùng đi kiểm tra phía Server). `pier.html` chỉ đúng ở chế độ mock cho tới khi BE nhận map này. Dữ liệu vùng đi/ghế sinh bằng script dò ảnh trong thư mục tạm của phiên, chưa đưa vào `tools/`.

## Web Client — Sửa chồng thùng, nền hải đăng và tên Google (pier.html)

- **Chồng thùng:** Thùng đỉnh trước đây được cộng +40 độ sâu nên vẽ đè lên nhân vật đứng phía trước. Nay lấy độ sâu ngay trên đáy các thùng nó đè lên (trường `d` trong fishingPierMap.json), có test.
- **Nền dưới hải đăng:** 750 ô nền bị vật/bóng vật che kín đã chọn nhầm ô (lộ dải tím ở mép tháp). Nay lấy theo ô hàng xóm khớp chắc chắn. Ghép thử vẫn lệch 1,6% so với ảnh gốc, chỗ tháp đã hết lỗi màu.
- **Tên người chơi:** Theo quyết định người dùng 2026-11-12, `pier.html` đăng nhập Google thật dù dữ liệu là mock (`setBootOptions({ googleInMock: true })`), rồi đổi tên qua `PUT /me/display-name` theo tên tài khoản Google. Tên được chuẩn hoá theo luật 3–16 ký tự của Server (`core/googleName.ts`, có test). Server thật chỉ đổi khi người chơi còn tên mặc định `FisherXXXXXXXX`. Tên của mình chữ vàng (#ffd84a), người khác chữ trắng. Màn đăng nhập canh giữa, chữ to theo canvas, bấm vào đâu cũng mở popup. Lỗi đổi tên (trùng, sai luật) thì giữ tên cũ.
- **Kiểm tra:** 221 test client đạt, typecheck/eslint sạch. Trên trình duyệt: màn "Bấm để đăng nhập Google" hiện đúng. Vào hồ bằng mock và gọi đúng API đổi tên với tên giả lập: tên chữ vàng, bot chữ trắng, thỏ đứng trước chồng thùng được vẽ đè cả chồng, bóng hải đăng sạch. **Chưa kiểm tra bằng popup Google thật** (Claude không đăng nhập tài khoản thay người dùng).

## Web Client + Server — Kiểm tra multiplayer BE với map pier (2026-11-12)

- **Kết quả kiểm tra BE thật** (bản riêng cổng 5081, DB tạm `fishing_pier_check` đã xoá, `Auth:DevBypass`, `Lake:SeatCount=22`, `Lake:MapId=fishing-pier`): 2 người chơi giả lập SignalR. JoinLake trả `mapId=fishing-pier`, 22 ghế. B vào thì A nhận PlayerJoined. A Move tới (612, 486) trên cầu giữa thì B nhận PlayerMoved đúng toạ độ. A BuyTicket rồi SitDown `seat-22` thì B nhận SeatChanged occupied. LeaveSeat đạt. BE không giữ map nên nhận mọi toạ độ của map pier.
- **Lỗi tìm thấy và đã sửa ở client:** LakeScene không gửi vị trí khi JoinLake, nên BE đặt người mới ở (0, 0). Người cũ giữ vị trí lần trước, có thể của map khác. Trên pier, nhân vật xuất phát ở góc không đứng được và bị kẹt. Nay `startPosition` (walkable.ts, có test): (0, 0)/chưa có thì về spawn, không đứng được thì lấy chỗ đứng được gần nhất (≤ 32px), không có thì về spawn, rồi gửi Move báo BE. LakeScene gán `positionProvider` để nối lại thì JoinLake gửi vị trí đang đứng. 225 test client đạt.
- **Còn thiếu / rủi ro:**
  - BE mặc định `Lake:SeatCount=20`. Chạy pier phải đặt `Lake__SeatCount=22`, nếu không `seat-21`/`seat-22` bị từ chối.
  - BE chỉ có **một phòng hồ**: người chơi `fishing.html` (map hồ) và `pier.html` (map pier) chung phòng và chung `seat-xx`. Họ thấy nhau ở toạ độ của map kia, và ghế cùng số trên hai map chặn nhau. Muốn hai map chạy song song cần BE tách phòng theo mapId.
  - BE không kiểm tra vùng đi được (theo thiết kế hiện tại). Va chạm chỉ ở client.
  - Chưa chạy trình duyệt với BE thật vì cần người dùng đăng nhập Google. Luồng client giống mock đã kiểm tra.

## Web Client — Chỉ ghế đẩu câu được, phím gợi ý F (pier.html)

- **Quyết định người dùng 2026-11-12:** Chỉ ghế đẩu là ghế câu. Ghế băng chỉ trang trí, vẫn chặn đường. Map pier còn **16 ghế** (`seat-01..16`), không vượt 20 ghế mặc định của Server, nên chạy BE thật không cần `Lake__SeatCount` nữa.
- **Phím gợi ý F:** [SeatPrompt.ts](../../client-v0/src/online/scenes/lake/SeatPrompt.ts) vẽ keycap "F" bên trái đầu nhân vật, ngang tai, dưới nhãn tên. Chỉ hiện khi đang đứng (chưa giữ ghế), không bận câu và có ghế trống trong tầm 64px. Hiện có easing nảy (`Back.easeOut` 220ms), ẩn thu nhỏ + mờ (`Sine.easeIn`, 160ms = `MOTION_OUT_MS`). Chạm vào phím (điện thoại) cũng ngồi. Phím F ngồi vào ghế trống gần nhất (`nearestSeat` trong seatLogic.ts, có test).
- **Kiểm tra:** 230 test client đạt (có test mọi ghế câu nằm trên ghế đẩu, số ghế ≤ 20), typecheck/eslint sạch. Trên trình duyệt (mock): đứng cạnh ghế đẩu `seat-11` thì phím F nảy lên. Đi xa thì ẩn, quay lại thì hiện. Bấm F mở hộp mua vé để ngồi.

## Web Client + Server — Feedback ghế, minigame và cần câu (2026-11-12)

- **Ghế pier:** Bỏ ô màu đánh dấu ghế (`LakeMapArt.drawsSeats`, SeatMarkers `hidden`). Ghế đẩu ngồi được gần nhất có viền trắng 1px, hiện/ẩn mờ dần 140ms (`PierArt.highlightSeat`).
- **Luật vùng minigame (người dùng chọn "Đổi chỗ ngẫu nhiên hẳn"):** Sau **mọi** tap, vùng xanh nhảy sang vị trí ngẫu nhiên mới trên thanh, vùng vàng ngẫu nhiên trong xanh, tiêu đúng 2 số RNG. Đổi ở `minigameCore.ts`, `minigame-vectors.v0.json` (sinh lại), `ClientMinigameModel.cs` (Sim). `shiftMin/shiftMax` không còn dùng. SPEC_CHUNG đã ghi chú.
- **FX minigame** ([MinigameScene.ts](../../client-v0/src/online/fishing/MinigameScene.ts)):
  - Trúng xanh: chữ `-Xcm` (quãng bị trừ) bay lên trên cá; thỏ giật cần (`CharacterView.tugRod`); lóe sáng nhẹ ở phao.
  - Trúng vàng: thêm chữ "Điểm yếu!", lóe sáng to hơn, rung nhẹ màn minigame và màn hồ.
  - Trượt: thanh đo nháy đỏ 2 lần và rung ngang, chữ "Trượt" bay lên.
  - Cá trên thanh đường đi lắc qua lại và nhấp nhô. Nền nước thanh đường đi có 2 lớp gợn sóng chạy, tô theo ô 4×4.
  - Còn ≤ 3 giây thì đồng hồ nháy đỏ.
  - Màu cá theo độ hiếm: epic tím, legendary vàng (thay màu thân kem, giữ viền).
- **Contract (Server + Client):** `MinigameParams` thêm `rarity` (chữ thường) để Client biết độ hiếm khi đang kéo. Server đã chọn loài lúc HookFish nên không lộ thêm gì. Test Domain/API đã cập nhật. Client cũ bỏ qua trường này. Mock cũng gửi.
- **Kết quả câu:** Thắng: thẻ cá kèm pháo hoa giấy (`fishing/confetti.ts`, Web Animations, tự gỡ). Thua: emoji động "sad" trên đầu thay chữ ":(", thiếu sheet emoji thì vẫn hiện ":(".
- **Cần câu trên tay:** Khung cần trong atlas (28×110, 64×72) khác khung thân 48×64. Trước đây đặt trùng góc trái trên nên tay cầm rơi xuống cạnh chân. `bake_characters.py` dời cần khi ngồi câu (`SIT_ROD_OFFSET`: xuống (6,−8), ngang (11,−9), lên (10,−10)). Khung bake nới thành 120×140, chân ở (60,76) để cần không bị cắt (avatar chat `SocialUi` FACE cập nhật theo). JSON cần ghi `bobber` theo hướng: FX lóe sáng đặt đúng phao vẽ trong art, và FishingFlow không vẽ thêm phao tròn đỏ trùng.
- **Kiểm tra:** 240 test client đạt. tsc/eslint/prettier sạch. Server Domain 156 và API 196 test đạt. Trên trình duyệt với Server thật local (`?dev=Anh`): ngồi `seat-03`, cần nằm trong tay, dây tới phao dưới nước. HookFish nhận `rarity: "uncommon"`. Tap điểm yếu thấy "Điểm yếu!", "−22cm", lóe sáng ở phao, vùng đổi chỗ. Tap trượt thấy "Trượt" và thanh đỏ. Thắng 3 tap ra thẻ cá và 56 mảnh pháo giấy. Icon buồn là sprite `emote:sad`. Màu cá epic/legendary kiểm tra bằng texture.
- **Chưa kiểm chứng:** Khung trình duyệt của Claude bị ẩn nên animation chỉ xem từng khung chụp, chưa xem chuyển động liên tục (rung, sóng, pháo giấy). Cần người dùng xem lại cảm giác. Chưa thấy cá epic/legendary thật trong ván.

## Web Client — Feedback 2026-11-13 (pier)

- **Lỗi nước dưới hiên tiệm Marlin:** 4 dòng nước chân cọc đặt trên cát hoặc mép bờ trong ảnh gốc: (816,220), (774,221) dưới hiên tiệm, (459,120) mép bờ, (349,745) dưới thuyền. Đã xoá khỏi `pillarFlows` (31 → 27) và thêm test. Đã so toàn map với ảnh gốc theo khối 8px: bóng tím nhạt cạnh biển chữ A là có trong ảnh gốc, giữ nguyên.
- **Tầm tương tác ghế:** `NEAR_SEAT_PX` 64 → 24px. Phải đứng sát ghế đẩu mới hiện phím F/ngồi được. Test vẫn xác nhận mọi ghế đều có chỗ đứng trong tầm.
- **Thông báo:** Không báo khi người chơi tự rời ghế (`left_seat`) hoặc rời hồ (`left_lake`). Vẫn báo khi mất ghế ngoài ý muốn: hết vé, mất kết nối, không thu cần.
- **Dấu ! khi cá cắn:** Bỏ lắc trái phải, đổi sang hiện rõ rồi mờ đi liên tục (280ms, alpha 0,15 ↔ 1).
- **Cần câu nhìn ngang:** Theo người dùng, đưa cần ra xa người, cuộn dây ở tay như tư thế nhìn xuống. `SIT_ROD_OFFSET['right']` (11,−9) → (16,−7), hướng trái lật theo. Đã bake lại; phao ngang cách chân 46px.
- **Kiểm tra:** 241 test client đạt, tsc/eslint/prettier sạch. Trên trình duyệt (mock, bỏ qua đăng nhập Google chỉ trong phiên kiểm tra): dưới hiên tiệm không còn vệt nước. Ghế `seat-03` nhận ở 8/16px, không nhận ở 24px trở lên (lệch dọc 4px). Rời ghế không có toast. Dấu ! đứng yên và đổi độ mờ. Thỏ ngồi nhìn trái cầm cuộn dây trước người, dây xuống nước.

## Web Client — UI home cho pier.html (2026-11-13)

- **Phạm vi (người dùng duyệt):** Chỉ làm trên `pier.html`. Có khung người chơi, ô vé + popup "Vé câu cá", khung Gold, menu. Không làm thanh thông báo "Chúc mừng…", nút lưỡi câu giữa màn và nút túi đồ x3. `fishing.html` giữ HUD cũ.
- **Cách làm:** [HomeHud.ts](../../client-v0/src/online/ui/home/HomeHud.ts) và home.css dùng ảnh trong `public/new resources/ui` (User Card, Ticket Timer, Icon Ticket, Ticket Info, Button, Menu Panel, Icon Button, 6 icon). Ảnh vẽ cho màn 1920×1080 nên cả cụm thu theo cửa sổ (`--hud-scale`, tối thiểu 0,4). `preview.ts` bật bằng `enableHomeHud(game)`. Khi bật, SeatUi không dựng dải Gold/vé/Rời ghế cũ (người chơi đi là tự rời ghế như trước).
- **Khung người chơi:** Tên, thanh EXP, "EXP x/y", "Lv. n" lấy từ hồ sơ thật (`session.profile`) và bảng level trong catalog (`levelProgress.ts`, có test, EXP tích luỹ theo SPEC). Câu được cá thì tải lại `GET /me` để EXP/level đúng số Server.
- **Vé:** Ô vé luôn hiện icon. Số thời gian chỉ hiện khi vé còn hạn, đếm lùi theo giờ Server. Bấm ô vé luôn mở popup "Vé câu cá" ("Hiệu lực trong: mm:ss", hết vé ghi "Chưa có vé"). "Mua thêm" mở hộp mua vé cũ (TicketDialog). Bấm ra ngoài thì popup đóng.
- **Gold và menu:** Gold dùng định dạng chung của game (`135.000`). Chưa có ảnh khung Gold nên vẽ khung gỗ bằng CSS cùng kiểu hộp mua vé. Nút ☰ mở MENU với 6 ô theo thứ tự người dùng chốt: Cửa hàng, Hồ sơ, Bảng xếp hạng, Túi đồ, Tắt popup (icon nhà), Cài đặt. Trỏ/chọn ô thì viền cam và tên ô hiện ở trên. Ô nhà đóng menu; 4 ô còn lại báo "Sắp ra mắt". Esc, nút X, chạm nền mờ cũng đóng menu. Mọi popup hiện/ẩn qua `motion.ts`.
- **Kiểm tra:** 245 test client đạt, tsc/eslint/prettier sạch. Trên trình duyệt (mock, 1024×768, bỏ qua đăng nhập Google chỉ trong phiên kiểm tra): khung người chơi hiện đúng tên/EXP 25/100/Lv. 3 với dữ liệu thử. Ô vé đếm lùi 14:29 → 14:11. Popup vé mở/đóng được. "Mua thêm" mở hộp mua vé. Menu đủ 6 ô, ô Hồ sơ báo "Sắp ra mắt", ô nhà đóng menu.
- **Chưa kiểm:** Màn điện thoại hẹp (dưới ~420px) có thể làm khung người chơi + ô vé chạm khung Gold. Chưa có ảnh riêng cho khung Gold.

## Web Client + Server — Cửa hàng trên pier.html (2026-11-13)

- **Yêu cầu và quyết định của người dùng:**
  - Popup "CỬA HÀNG" mở từ ô Cửa hàng trong menu ☰, có 3 tab: Bán cá, Trang bị, Nạp Gold. Bố cục theo 4 ảnh mẫu và ảnh popup bán.
  - Giá cá và giá cần lấy theo Server.
  - Gộp cá cùng loài + cùng kích thước vào một ô; số ở góc là số lượng.
  - Cần đã có thì hiện "Đã có" và không bấm được.
  - Nạp Gold bấm là cộng Gold (chưa có cổng thanh toán).
  - Bán luôn, không hỏi lại.
  - Màu độ hiếm cho chữ và nền ô cá: Thường xám, Khá xanh lục, Hiếm xanh lam, Sử thi tím, Huyền thoại vàng.
- **Bán cá** ([ShopPopup.ts](../../client-v0/src/online/ui/shop/ShopPopup.ts), [shopModel.ts](../../client-v0/src/online/ui/shop/shopModel.ts) có test):
  - Túi cá lấy từ `GET /me/inventory`.
  - Bấm một ô khi chưa vào chế độ chọn: mở popup chi tiết (`Sell_Popup.png`) gồm tên, độ hiếm có màu, kích thước, số con, mô tả, thanh kéo số lượng (−/+, MIN/−10/+10/MAX, dùng lại ảnh thanh kéo của hộp mua vé) và nút Bán. Bán đúng số con đã chọn.
  - Bấm "Chọn cá": vào chế độ chọn nhiều. Bấm ô thì ✓ và cộng tiền (chọn ô là chọn cả các con trong ô), bấm lại thì bỏ và trừ tiền. Có "Chọn tất cả", X để huỷ và bỏ chọn hết, V để bán ngay.
  - Gọi `POST /shop/sell-fish`. Chọn cả túi thì gửi `all`, còn lại gửi theo lô 200 id.
- **Mô tả cá:** Server chưa có mô tả nên tạm viết 1 câu cho mỗi loài ở `ui/shop/fishInfo.ts`. GD sửa tại đây.
- **Trang bị:** 5 thẻ cần theo thứ tự catalog (rẻ → đắt), giá Server (300/300/800/2.000), `POST /shop/buy`. Cần mặc định và cần đã mua hiện "Đã có", không bấm được. Chưa có nút trang bị cần (người dùng chưa yêu cầu).
- **Đổi hình 5 cần** (`tools/bake_characters.py`, đã bake lại; người dùng chọn 2026-11-13):
  - `rod_old` = fishingRod
  - `rod_steel_awl` = pier/swamp
  - `rod_high_performer` = swampFishingRod
  - `rod_bliss` = teal/arctic
  - `rod_giant_caster` = lava/volcano

  Bake thêm icon cửa hàng `public/assets/rods/<rodId>-icon.png`. Phao đo một lần cho mọi cần (nước bắn đỏ của cần lava làm lệch phép đo). Cần lava/teal có màu nước bắn quanh phao theo dòng gốc của nó (dung nham/xanh ngọc) dù map pier là nước xanh.
- **Nạp Gold:** 3 gói 1.000/5.000/10.000 Gold, nhãn giá 10.000đ/40.000đ/70.000đ chỉ để hiển thị. Bấm gọi `POST /dev/topup`. Server thêm endpoint này **chỉ ở Development** (`Modules/Wallet/DevTopUp.cs`, idempotent, sổ cái lý do `dev_topup`); bản chạy thật không có. Mock có route tương ứng. Đã ghi vào bảng API của SPEC_CHUNG.
- **Art dùng:** `Shop_Window`, `Sell_Popup`, `Slot - State Empty`, `Card Art`, `Small`, `Tab - State Default`, `Icon Sell/Equipment/Gold`; `mini game/Coin Small`, `Button Close`, `Slider`, `Amount Bar`. Khung ô và nút dùng border-image 9 mảnh nên viền giữ nét khi đổi cỡ.
  - `Tab - State Active.png` là dải xanh thiếu cạnh dưới, khác ảnh mẫu, nên tab đang chọn dùng khung nâu `Tab - State Default.png` cho giống ảnh mẫu.
  - Nút V (bán) và nút "Bán" chưa có ảnh nên vẽ màu cam bằng CSS.
- **Kiểm tra:**
  - Tự động: 252 test client đạt, tsc/eslint/prettier sạch. Server: Domain 156 test đạt; API 197 test đạt, có test mới cho nạp Gold (cộng đúng gói, gửi lại cùng key chỉ cộng 1 lần, gói lạ bị từ chối).
  - Trên trình duyệt (mock, 1024×768, bỏ qua đăng nhập Google chỉ trong phiên kiểm tra), câu 3 con: Koi, Trout, Minnow.
    - Lưới hiện đúng màu nền (tím, xanh lục, xám) và giá Server (50, 10, 5).
    - Popup Koi bán được: +50 Gold, có thông báo.
    - Chế độ chọn: 1 ▸ 10; bỏ chọn ▸ 0; Chọn tất cả ▸ 2 ▸ 15 với 2 dấu ✓; bấm V thì bán hết, túi trống.
    - Mua cần thiếu Gold báo "Bạn không đủ Gold.". Nạp 1.000 rồi mua Steel Awl (−300): thẻ chuyển "Đã có".
- **Server thật (2026-11-13, sau đó):** API chạy cổng 5080 có `Auth__DevBypass`. Client chuyển `VITE_USE_MOCK=false` trong `.env.local` để người dùng tự test. Mở `pier.html?dev=Anh`: túi cá thật (2 con) hiện trong cửa hàng; nạp gói 1.000 thì Server cộng 50 → 1.050 Gold.
- **Chưa kiểm:**
  - Bán cá và mua cần với Server thật trên trình duyệt (để người dùng tự test).
  - Chưa thử túi có nhiều cá (cuộn lưới) và màn điện thoại hẹp.

## Web Client — Popup Túi đồ trên pier.html (2026-11-13)

- **Yêu cầu (người dùng, 2 ảnh mẫu):** Popup mở từ ô Túi đồ trong menu ☰, có 2 tab. Tab Đồ câu hiện các cần đang sở hữu; tab Túi cá hiện cá đang có. Bấm "Chọn cá" thì sang tab Bán cá của cửa hàng.
- **Cách làm** ([InventoryPopup.ts](../../client-v0/src/online/ui/inventory/InventoryPopup.ts), inventory.css; nền mờ, ô cá, nút nhỏ dùng chung style với shop.css):
  - Khung sổ tay `Notebook.png`. Tab đang chọn dùng `Tab - State Active.png` (dải xanh có chữ), tab còn lại dùng `Tab - State Default.png` (chỉ icon).
  - **Đồ câu, bên trái** (`Panel Art.png`): thỏ theo skin đang dùng (cắt từ sheet đã bake) và 5 chỉ số tổng lấy từ `GET /me/progress`, gồm Sức mạnh, Vùng trúng thường, Vùng điểm yếu, May mắn cá hiếm, May mắn cá lớn, mỗi dòng có icon riêng.
  - **Đồ câu, bên phải:** thẻ `Rod_Card.png` cho mỗi cần đang sở hữu (lấy từ `/me/inventory`), gồm icon cần, tên và 5 chỉ số của cần khớp đúng 5 hàng vẽ sẵn trên thẻ. Cần đang dùng có nhãn "Đang dùng" (`Equipped Tag.png`).
  - **Bấm thẻ cần khác để trang bị:** gọi `PUT /me/equipped-rod`, Server đã có sẵn; đang câu thì Server từ chối và client hiện "Bạn đang trong một lần câu.". Phần này người dùng chưa yêu cầu rõ, mình thêm vì Server đã hỗ trợ.
  - **Nút "Mua cần câu"** (`Primary M.png`): mở cửa hàng ở tab Trang bị.
  - **Túi cá** (`Well Art.png`): lưới 4 cột, ô cá giống cửa hàng (gộp cùng loài + cùng kích thước, nền theo độ hiếm, số lượng, kích thước, giá Server). Nút "Chọn cá" đóng Túi đồ và mở cửa hàng ở tab Bán cá, đã ở sẵn chế độ chọn nhiều (`ShopPopup.open('sell', { selecting: true })`).
- **Kiểm tra** (Server thật, `?dev=ClaudeTest` là người chơi thử riêng):
  - Tự động: 252 test client đạt, tsc/eslint/prettier sạch.
  - Đồ câu: nạp 1.000, mua Bliss, mở Túi đồ thì thấy 2 thẻ, Old Fishing Rod "Đang dùng", chỉ số tổng Sức mạnh 11. Bấm Bliss: toast "Đã trang bị Bliss.", nhãn chuyển sang Bliss, Sức mạnh thành 14 (Server tính lại). "Mua cần câu" mở cửa hàng ở tab Trang bị.
  - Túi cá (xem trên `?dev=Anh`, không bán gì): 2 ô Carp 17,0cm và 13,3cm. "Chọn cá" mở cửa hàng ở tab Bán cá, đang ở chế độ chọn, chưa chọn con nào.
- **Còn thiếu:**
  - Đổi cần xong, người chơi khác chưa thấy cần mới cho tới khi mình vào lại hồ, vì Server chưa phát sự kiện báo đổi cần như `SkinChanged`.
  - Chưa có test API cho trường hợp đổi cần thành công.
  - Đang ngồi ghế thì hầu như không đổi được cần vì luôn đang trong một lần câu.
  - Chưa kiểm màn điện thoại hẹp.

## Web Client + Server — Tốc độ đi, ảnh cá theo loài, đổi cần hiện ngay (2026-11-13)

- **Tốc độ đi** (người dùng: đi nhanh, trông như trôi):
  - Pier `moveRules.maxSpeedPxPerSec` 160 → **90** (fishingPierMap.json).
  - Animation đi bộ 14 → **12 fps** (`bake_characters.py`, đã bake lại).
  - Map hồ cũ của `fishing.html` và fixture Server giữ 160. Server không kiểm tốc độ.
- **Ảnh cá theo loài** (thay icon cá chung trong popup câu được cá, ô cá và popup bán của cửa hàng, ô cá túi đồ):
  - `tools/export_fish_art.py` xuất `public/assets/fish/<speciesId>.png` từ atlas `sheet-fish-*`.
  - 6 loài khớp tên: Minnow, Yellow Perch, Bass, Golden Goldfish (goldcarp), Puffer Fish, Koi Carp.
  - 3 loài không có ảnh cùng tên. Người dùng nói "làm" mà chưa chọn, nên tạm dùng: **carp = Bluegills, trout = Arctic Char, moonfin = Marlin**. Đổi trong bảng `FISH` của script rồi chạy lại.
  - Người dùng đổi minnow sang **fish/Anchovy** (2026-11-13, sau đó). Máy đó không có Python nên `minnow.png` (18×9) xuất bằng PowerShell tương đương script; bảng `FISH` đã sửa, chạy script cũng ra cùng kết quả. Chưa xem trong game.
  - Client: `ui/fishArt.ts` (`fishImage`, tải sẵn khi vào hồ), ảnh vừa khung theo tỉ lệ.
  - Popup câu được cá: loài chưa có ảnh thì quay về hình cá vẽ tay tô màu như cũ (giữ cho Coral Cove).
  - Icon cá trên thanh minigame giữ nguyên.
- **Dùng cần nào thì câu bằng cần đó:**
  - Server: `PUT /me/equipped-rod` thành công thì cập nhật cần của người đó trong hồ và phát hub **`RodChanged {playerId, rodId}`** cho cả hồ.
  - Client: nhân vật đổi cần ngay, cả của mình lẫn người khác; hồ sơ và túi đồ cũng cập nhật. Mock phát sự kiện tương tự.
  - Test API mới: mua Bliss, đổi cần, túi đồ ghi đúng, người khác nhận `RodChanged`. Thêm test store.
- **Kiểm tra:**
  - Tự động: 254 test client (thêm test store), tsc/eslint/prettier sạch. Server API 199 test đạt.
  - Trên trình duyệt (Server thật, `?dev=ClaudeTest`):
    - Tốc độ 90 và walk 12 fps đã nạp.
    - Đổi cần qua API: nhân vật chuyển Bliss → Old ngay không cần tải lại, rồi đổi lại Bliss và ngồi `seat-05` câu được Trout. Thẻ cá hiện ảnh Trout (Arctic Char), ô cá ở cửa hàng và popup bán cũng hiện ảnh đó.
- **Chưa kiểm:** cảm giác tốc độ đi mới (người dùng xem); ảnh 8 loài còn lại mới xem qua bảng ghép, chưa thấy trong popup thật.

## Web Client + Server — Popup Sổ tay cá (2026-11-13)

- **Yêu cầu (người dùng, ảnh mẫu):**
  - Bấm icon nhà trong menu ☰ thì mở "Sổ tay cá". Ô này trước là "Tắt popup", nay đổi thành "Sổ tay cá".
  - Hiện đủ mọi loài cá. Loài đã câu điền thông tin; loài chưa câu phủ đen và không điền "Nhỏ nhất/Lớn nhất đã câu".
- **Client** ([CodexPopup.ts](../../client-v0/src/online/ui/codex/CodexPopup.ts), codex.css; ảnh `Codex Panel.png` người dùng thêm):
  - Bên trái: ảnh cá và 6 dòng Tên, Độ hiếm (màu theo độ hiếm), Nơi sống, Kích thước (min–max theo catalog), Nhỏ nhất đã câu, Lớn nhất đã câu.
  - Bên phải: lưới 6 cột (24 ô, nhiều loài hơn thì cuộn). Ô đang chọn viền cam; loài chưa câu là bóng đen (`brightness(0)`).
  - Dữ liệu lấy từ `GET /me/codex`; `codexRows` có test.
  - "Nơi sống" đang lấy `mapId` của hồ (pier là `fishing-pier`) vì chưa có tên hồ hiển thị.
- **Server:**
  - `GET /me/codex` thêm `smallestLengthTenthCm`: con nhỏ nhất từng câu theo loài, tính cả cá đã bán; loài chưa câu thì null.
  - Test API mới: câu 3 Perch 9,5/16,0/12,0cm, bán con 9,5 thì vẫn ra nhỏ nhất 95, lớn nhất 160, tổng 3.
  - Mock cập nhật tương ứng; contract client có `smallestLengthTenthCm?`.
- **Kiểm tra:**
  - Tự động: 257 test client, tsc/eslint/prettier sạch. Server API 200 test đạt.
  - Trên trình duyệt (mock, vì `.env.local` đang `VITE_USE_MOCK=true`; bỏ qua đăng nhập Google chỉ trong phiên kiểm tra): câu 3 con Perch, Trout, Moonfin rồi mở sổ tay. Thấy 3 ô ảnh thật và 6 bóng đen; Perch hiện đủ 6 dòng (nhỏ nhất = lớn nhất 14,1cm). Chọn một bóng đen thì 2 dòng "đã câu" để trống.
- **Lưu ý môi trường:** Cổng 5173 đang có thêm server Node cũ (`server/index.js`) nghe ở 0.0.0.0. Vào `http://localhost:5173` có thể trúng server đó (trang cũ, tiêu đề "xem trước"); Vite của client đang nghe ở `[::1]:5173`.


### Responsive khung chơi (2026-11-14)

- **Client** ([pier.html](../../client-v0/pier.html), [components.ts](../../client-v0/src/online/ui/kit/components.ts), `env.ts`):
  - Khung chơi giữ tỉ lệ 16:9, to nhất có thể giữa cửa sổ; phần thừa nền đen.
  - Toàn bộ UI DOM dựng theo màn thiết kế 1920×1080 (`UI_DESIGN_WIDTH/HEIGHT`) và `ui-root` scale một lần theo canvas. Các popup (cửa hàng, túi đồ, sổ tay, vé), chat, HUD, banner khoe cá, thẻ nhận cá không còn tự tính scale theo `window.innerWidth/Height`. Joystick quy đổi toạ độ chuột theo scale; minigame và màn khởi động tự co khi kéo cửa sổ.
- **Kiểm tra:** tsc, 257 test, eslint/prettier đạt. Trên trình duyệt (mock) ở 1200×500, 600×800, 1100×650: khung đúng 16:9, cửa hàng/popup vé/chat/HUD co đúng, slider vé kéo đúng.
- **Minigame (kiểm 2026-11-14, mock):** vào được minigame, khung nằm giữa, chữ rõ; kéo cửa sổ 1100×650 → 700×800 khi đang chạy thì khung co theo; chạm trúng giảm khoảng cách 85 → 74cm; hết giờ thì đóng và camera hồ bình thường; thẻ cá hiện đúng và co theo khi kéo cửa sổ (kết quả thắng gọi `finish('success')` của scene, không canh vùng xanh bằng tay).
- **Sau merge với origin/main (2026-11-14):** gộp `SocialUi.fit()` (giữ cách chừa đáy theo vị trí thật của khung, tính trong màn 1920×1080); `SlideToast` bám khung chơi qua `trackCanvasFrame` (trước đó bám cửa sổ nên hiện trong dải đen khi cửa sổ cao hơn 16:9); gỡ media query `width < 640px` ở `social.css` và `pier.css` (UI luôn dựng ở 1920 px nên query làm bảng emoji vọt ra ngoài khung khi cửa sổ hẹp). tsc, 259 test, lint, build client đạt.
- **Lỗi "thu nhỏ rồi phóng to, canvas vẫn bé" (2026-11-14):** `preview.ts` gọi `game.scale.refresh()` ngay trong sự kiện `resize`; ở chế độ RESIZE, `refresh()` dùng `parentSize` đã lưu (chậm một nhịp) rồi mới cập nhật `parentSize`, nên `step()` của Phaser thấy "không đổi" và không sửa lại. Đã thay bằng `ResizeObserver` trên `#game` gọi `getParentBounds()` rồi `refresh()`. Đo 420×300 → 1500×850: canvas Phaser khớp `#game` ở cả hai cỡ. Pane trình duyệt của agent không render khi ẩn nên chưa quan sát được trên Chrome thật; cần người dùng thử lại bằng tay (thu nhỏ, bấm phóng to/F11).
- **Tắt joystick ảo trên pier.html (2026-11-14, người dùng yêu cầu):** `LakeScene` chỉ tạo `Joystick` khi Phaser báo có cảm ứng và không phải trang pier (`isHomeHudEnabled`). Phaser coi là cảm ứng nếu `ontouchstart` hoặc `navigator.maxTouchPoints ≥ 1`, nên máy tính có màn hình cảm ứng hoặc driver bút/cảm ứng vẫn bị hiện joystick. Kiểm với giả lập mobile (`touch = true`): không còn `.joystick`. Trang khác (fishing.html) giữ nguyên; pier.html không còn cách di chuyển bằng cảm ứng ngoài bàn phím.
- **Chưa kiểm:** `fishing.html` và `index.html` (cơ chế co giãn khác), màn cảm ứng thật, minigame với Server thật.

## Web Client — Feedback 2026-11-14 (chỉ pier.html)

Người dùng gửi feedback 1–9 (không có số 6), nói "làm" sau khi gửi hết. Quy tắc: chỉ sửa pier.html. Code dùng chung chỉ bật qua cờ của pier (`isHomeHudEnabled`, `body.page-pier`, tham số truyền từ pier).

- **FB1 — tab "Trang bị" của cửa hàng bị méo:**
  - Không có asset riêng cho tab đang chọn. `Tab - State Default.png` không có cạnh dưới (tab mở xuống panel) nên đứng riêng bị méo.
  - Đổi sang khung `Small.png`, cắt 9 mảnh đúng viền 16/12px.
- **FB2 — nút mua cần cùng hàng với "Đã có":**
  - Dòng tên cần cố định 2 dòng, nút ghim đáy thẻ.
  - Khung ảnh cần 136 → 120px để 2 hàng thẻ vừa khung, không cuộn.
- **FB3 — bỏ dòng gợi ý phím, hạ nút và khung chat:**
  - `pier.html` bỏ `#hint`; style riêng `scenes/pier/pier.css` (body `page-pier`): nút chat cách đáy 16px, khung chat 84px.
  - `SocialUi.fit()` tính chiều cao theo vị trí thật của khung nên khung chat không còn sát khung người chơi.
- **FB4 — căn đều lưới emoji:**
  - Lưới 5 × 64px, gap 12, căn giữa (trước 5×68 + 4×14 = 396px tràn lòng khung 368px).
  - Emoji cắt sát phần có hình (`loadTrimmedEmoteFrames`, chỉ pier qua `trimEmotes`) nên icon nằm chính giữa ô.
  - Đo trên trình duyệt: lề trái/phải 21px bằng nhau, khoảng cách các ô bằng nhau, 16 icon lệch 0.
- **FB5 — Túi đồ, nút "Mua cần câu" và "Chọn cá" bị sát đáy:**
  - Thẻ cần thu 90% (`zoom`), nút cách đáy trang 52px; ô túi cá 600 → 560px.
- **FB7 — bong bóng chat/emoji trên đầu theo demo:**
  - `entities/HeadBubble.ts` ghép bong bóng từ `Head Bubble.png` (người dùng thêm): góc và đuôi giữa đáy giữ nguyên, cạnh kéo giãn, hiển thị ×0,25 cho khớp pixel nhân vật.
  - Chat và emoji (emoji gửi trong chat) đều hiện trong bong bóng. **Ẩn tên khi đang có bong bóng** (người dùng chọn), hết bong bóng thì tên hiện lại. Có hiệu ứng nảy lên và mờ dần.
  - Chỉ pier nạp ảnh này; trang khác giữ bong bóng chữ cũ.
- **FB8 — mọi đồng xu dùng `Coin Art.png`** (`ui/coinArt.ts`):
  - Đã đổi: khung Gold (HomeHud), cửa hàng (đầu khung, giá cá/cần/gói nạp, tổng tiền, popup bán), Túi đồ.
  - Popup mua vé: `coinSrc` truyền từ SeatUi khi ở pier.
  - Thẻ câu được cá: xoá đồng xu vẽ sẵn trong `Catch Fish.png` rồi đặt ảnh mới. Người dùng chọn "thay luôn"; FishingFlow nhận tham số mới, chỉ LakeScene của pier truyền.
- **FB9 — phím F khi đứng gần ghế dùng `Sit Prompt F.png`:**
  - Hiển thị ×0,25 (~12×15px), giữ hiệu ứng và vị trí cũ. Trang khác giữ keycap vẽ bằng code.
- **Kiểm tra:**
  - Tự động: 257 test client đạt, tsc/eslint/prettier sạch.
  - Trên trình duyệt (mock, `http://[::1]:5173/pier.html`, khung trình duyệt của Claude bị ẩn nên chạy vòng lặp game bằng tay):
    - Không còn `#hint`; nút chat cách đáy 16px.
    - HUD, cửa hàng, popup vé, thẻ cá đều dùng Coin Art.
    - Phím F dùng texture mới.
    - Chat "Hi" và emoji hiện trong bong bóng mới, tên ẩn.
    - Lưới emoji đều; Túi đồ có nút cách đáy và khoảng hở phía trên.
    - Thẻ cần không cuộn, 4 nút hàng đầu cùng độ cao.
- **Lưu ý:**
  - Lần tải đầu trong khung trình duyệt ẩn đôi khi báo lỗi WebGL "Framebuffer Incomplete Attachment". Lỗi đó do khung ẩn, có cả trước các thay đổi này; tải lại là chạy.
  - Cổng 5173 vẫn có server Node cũ ở 0.0.0.0.

## Web Client — Feedback đợt 2 ngày 2026-11-14 (pier.html)

- **Ghế băng dọc có vệt nước:**
  - Nguyên nhân không phải ảnh ghế mà là **ô nền dưới ghế chọn sai** khi dựng lại map: ghế che kín ô trong ảnh gốc nên lúc đó đoán nhầm sang ô có nước.
  - Ô (36,13) dưới ghế trên cầu đổi sang ô ván khớp ảnh gốc (sai số 74,7 → 0). 4 ô dưới ghế trên cát (27,21), (28,20), (28,21), (28,22) đổi sang ô cát trơn. Ở đó nước lộ qua bóng mờ của ghế, còn ảnh gốc là cát.
  - Đo lại trên trình duyệt: không còn điểm ảnh nước ở cả 2 ghế.
- **Túi đồ, tab Đồ câu:**
  - Tên cần dài xuống 2 dòng trong thẻ ("Old Fishing / Rod").
  - Chỉ số từng cần có dấu + (+1, +0%, +10%…); chỉ số tổng bên trái giữ nguyên.
  - Ô debug "MOCK / Thời gian ghế" ẩn bằng `pier.css` (chỉ trang này).
- **Thông báo kiểu mới** (`ui/toast/SlideToast.ts`, toast.css):
  - Nền `Well Art.png` (9 mảnh), giữa phía dưới màn hình (người dùng chọn cách a), z-index 1000 nên nằm trên mọi popup.
  - Trượt lên (ease OutQuad), giữ 1,5 giây, trượt xuống (ease OutQuad). Có thông báo mới thì cái đang hiện trượt xuống ngay, xong mới trượt cái mới lên; mỗi lúc chỉ một cái.
  - Cắm vào `showToast` qua `setToastRenderer`, chỉ `preview.ts` của pier đăng ký; trang khác giữ toast cũ.
- **Pháo giấy:**
  - Bắn từ hai góc dưới, bay chéo lên giữa (`burstSideConfetti`).
  - Khoảng 0,6 giây sau mới hiện popup cá (người dùng chọn cách a); giấy rơi phía sau thẻ.
- **Bong bóng chat/emoji và icon trên đầu:**
  - Bong bóng nằm ngay trên tên, **không ẩn tên nữa** (đổi theo người dùng).
  - Dấu "!" khi cá cắn, emoji buồn, icon cá dời lên trên tên (cách mép trên tên ~4px).
  - Chỉ áp ở trang có ảnh Head Bubble (pier).
- **Tạm bỏ qua minigame (pier):**
  - Bấm icon lưỡi câu hoặc Space khi cá cắn: nhân vật kéo cần 0,35 giây rồi gửi "câu được" (100%). Server nhận kết quả ngay khi lần câu sang pha minigame.
  - Code minigame giữ nguyên; tắt `skipMinigame` trong `PierFishingOptions` (LakeScene) là dùng lại. FishingFlow gom tuỳ chọn riêng của pier vào `PierFishingOptions {catchCardCoin, sideConfetti, skipMinigame}`.
- **Ngồi ghế không có bóng:**
  - `bake_characters.py` không vẽ bóng cho các tư thế ngồi (sit, cast, wait, bite, reel, success, fail).
  - Người dùng chọn cách b nên áp cho mọi trang dùng chung ảnh nhân vật, gồm cả `fishing.html`.
- **Kiểm tra:**
  - Tự động: 257 test client đạt, tsc/eslint/prettier sạch.
  - Trên trình duyệt (mock, `[::1]:5173/pier.html`):
    - Ô MOCK ẩn.
    - Ngồi `seat-05`: dấu "!" cách tên 4px. Bấm thu cần thì không mở minigame, câu được ngay; pháo bắt đầu từ hai góc đáy (x≈0 và x≈1019), popup hiện sau ~0,6 giây.
    - Thông báo mới dùng nền Well Art, nằm trên menu, mỗi lúc một cái.
    - Tên cần 2 dòng, chỉ số có dấu +, bong bóng ngay trên tên.
    - Ô nền dưới 2 ghế không còn nước.
- **Chưa kiểm được:** chuyển động mượt của thông báo trượt và pháo giấy, vì khung trình duyệt của Claude bị ẩn nên trình duyệt chỉ vẽ lại vài giây một lần.


## Bot câu cá (pier.html, 2026-11-14)
- Bot mock đổi tên người Việt/nước ngoài (`mock/botFishing.ts`, `BOT_NAMES`), skin khác nhau; chỉ bật ở pier qua `createServices(map, { fishingBots: true })` → `createMock` → `MockBackend.fishingBots`. Các trang khác giữ bot cũ.
- Hành vi: đi dạo 8–20s → ngồi ghế trống → 2–4 lượt câu (12–25s/lượt, 60% câu được). Câu được: `CatchShown` + `CatchAnnounced` (thanh thông báo + tin hệ thống trong chat, "người đầu tiên" theo loài). Trượt: `FailShown` (emoji buồn). Hết lượt thì đứng dậy ra chỗ đứng được gần ghế.
- Sửa `state/store.ts`: `SeatChanged` cập nhật cả `players[].seatId` (người chơi khác ngồi/đứng dậy hiển thị đúng; áp dụng cả Server thật).
- Kiểm tra: tsc, eslint, vitest 259 xanh (thêm `botFishing.test.ts`); trên trình duyệt mock thấy bot ngồi ghế, banner + chat hệ thống khi câu được, FailShown khi trượt. Là mock, chưa phải tích hợp thật.

## Server phát khoe cá khi câu thật (2026-11-14)
- `FishingService`: khi lần câu thành công, server phát `CatchAnnounced` cho cả hồ (cùng lúc `CatchShown`): tên người chơi, loài, độ hiếm, `first`. `first` = chưa có dòng `species_records` nào của loài đó trên toàn hệ thống (xét trước khi ghi lần câu này). Khoe mọi loài, mọi độ hiếm (khớp mock).
- Lệnh dev `/api/v1/dev/announce-catch` giữ nguyên để test.
- Test: `FishingTests.Success_AnnouncesToEveryone_FirstOnlyForSpeciesNobodyCaught`; toàn bộ 201 test API qua.
- Kiểm chứng thật: API local + 2 tab `?dev=Watcher` / `?dev=Zen`; Zen mua vé, ngồi, câu, nộp thắng → cả hai tab hiện banner "Chúc mừng Zen đã câu được Minnow!" và tin hệ thống trong chat (`first=false` vì DB dev đã có minnow).

## Đổi tên cá ở BE theo ảnh đã chọn (2026-11-14)
Tên hiển thị khớp bảng `FISH` trong `tools/export_fish_art.py`: minnow→Anchovy, perch→Yellow Perch, carp→Bluegills, trout→Arctic Char, bass giữ Bass, goldcarp→Golden Goldfish, puffer→Puffer Fish, koi→Koi Carp, moonfin→Marlin. `speciesId` không đổi.
- Sửa `docs/v01/fixtures/gameplay-config.v0.json` (nguồn seed Server, mock và test) và bảng trong `doc/GAMEPLAY_SCOPE.md`.
- Server chỉ nạp fixture khi bảng `config_versions` trống, nên DB dev đang chạy đã được cập nhật tên trực tiếp bằng SQL (version `v0-test-2026-11-10-ticket-01`). DB ở máy khác cần cập nhật tương tự hoặc xuất bản phiên bản config mới trong Admin.
- Test: Domain 156, API 201, client 259 qua (sửa 2 test client so tên cũ).

## Light sweep cho cá trong popup (pier.html, 2026-11-14)
- Vệt sáng trắng chéo quét từ trái sang phải qua con cá trong popup câu được cá, nghỉ một nhịp rồi **lặp liên tục** tới khi tắt popup (2,4 giây/lượt). **Chỉ trên con cá**: lớp phủ `.catch-card__sweep` cùng khung ảnh cá, cắt bằng `mask` theo ảnh cá (GD chọn 2026-11-14).
- Bật bằng cờ `lightSweep` trong `PierFishingOptions` (LakeScene chỉ truyền ở pier); `CatchCardData.lightSweep` mặc định tắt nên trang khác không đổi. Code: `fishing/CatchCard.ts`, `fishing/fishing.css`.
- Kiểm tra: tsc, eslint, vitest 259 qua; mock trên trình duyệt: lớp phủ có mask `trout.png`, ảnh cắt mốc 700ms thấy vệt sáng nằm trong hình cá.
- Feedback 1 (font/màu tên nhân vật), 2 (chữ "Bấm F hoặc Space" trong popup và sửa doc GD) vẫn chờ "làm"; feedback 3 (tự thả emoji) đã huỷ theo GD.

## Feedback 1 và 2 ngày 2026-11-14 (làm theo lệnh "làm đi")
- **Tên trên đầu nhân vật (1.1–1.3):** pier dùng Courier New đậm, độ phân giải ×4 như tên ở khung người chơi và bong bóng chat (`CharacterView`, chỉ khi `hasHeadBubble`). Màu vàng cho bản thân, trắng cho người khác và bot (đã đúng từ trước, giữ nguyên); giữ nền xanh đậm. Áp dụng cho tất cả nhân vật.
- **Popup cá (2.1–2.3):** dòng "Bấm F hoặc Space để tiếp tục" nằm trong thẻ, dải trống dưới hàng Giá, căn giữa (`CatchCardData.hint`). F hoặc Space đóng popup bằng listener bắt ở pha capture: chặn phím nên không ngồi/đứng dậy hay quăng cần thêm; bỏ qua phím giữ (repeat) và 0,4 giây đầu. Bỏ chạm ra ngoài để đóng. Bật bằng cờ `closePopupByKey` (chỉ pier); trang khác giữ luật cũ.
- **2.2 doc GD:** sửa `doc/GAMEPLAY_SCOPE.md` (luật đóng popup) và thêm dòng ở `docs/work/S01-cap-nhat-scope-ke-hoach-v1.md`.
- **2.4 chưa làm:** cảm ứng/điện thoại, đợi GD báo khi đưa lên điện thoại (hiện máy cảm ứng không đóng được popup này trên pier).
- Kiểm tra: tsc, eslint, vitest 259 qua; mock trên trình duyệt: dòng gợi ý nằm trong thẻ, chạm ra ngoài không đóng, F đóng popup.

## Căn lại popup cá theo ảnh Catch Fish.png mới (pier.html, 2026-11-14)
- Người dùng thay `public/mini game/Catch Fish.png` (vẫn 536×684): các hàng dịch lên ~30px và hàng Giá không còn đồng xu vẽ sẵn, nên chữ mẫu cũ còn sót và chữ code viết lệch hàng.
- Sửa `fishing/CatchCard.ts`: `ROWS` theo số đo ảnh mới (lòng hàng 276–332, 337–400, 405–468, 473–536, 541–604; tâm 304/368/436/504/572), `ROW_X1` 515, dòng gợi ý F/Space ở tâm dải trống `HINT_CENTER_Y` 630 (y 609–651). Khung tranh cá giữ nguyên (32,36, 472×228).
- Ảnh mới áp dụng cho mọi trang dùng thẻ này; trang khác không còn đồng xu vẽ sẵn ở hàng Giá nếu không truyền `coinSrc`.
- Kiểm tra: tsc, eslint, vitest 259 qua; mock trên trình duyệt: không còn chữ mẫu sót, chữ thẳng hàng, dòng gợi ý nằm gọn trong khung.


## Web Client — Popup Tài khoản (pier.html, 2026-11-16)

- **Phạm vi:** `client-v0/src/online/ui/profile/` (ProfilePopup, profileModel, profileArt, profile.css, test), nối ô "Hồ sơ" trong `HomeHud.ts`, `CharacterView.setName` + `LakeScene.bindStore` (tên trên đầu đổi theo hồ sơ), mock `mock/achievements.ts` + route trong `MockBackend.ts`, kiểu mới trong `net/contract.ts`.
- **Đầu ra:** khung `ui/Infomation/Frame.png` (hiện ×1.5): avatar + UID tạm (suy từ playerId), ô tên → tab đổi tên (**3–16 ký tự**, người dùng chọn giữ luật hiện hành thay vì 18; đổi xong cập nhật khung home và tên trên đầu), ô danh hiệu → tab chọn 6 danh hiệu (Bậc thầy câu cá + 5 tên tạm: Tay câu mới nổi, Thợ săn cá hiếm, Vua hồ câu, Bạn của biển cả, Huyền thoại cần câu; chờ GD duyệt tên), ô lời nhắn → tab nhập tối đa 100 ký tự, 3 ô cá khoe để trống dấu +, cột Thành tựu 8 thành tựu theo GAMEPLAY_SCOPE: đạt mốc chưa nhận thì thẻ phủ đỏ nhấp nháy + chấm đỏ, bấm nhận 100 Gold một level mỗi lần rồi hiện lại theo số đếm thật, đủ 5 level thì thanh đầy + dấu ✓.
- **Contract dự thảo (chỉ mock, Server thật chưa có):** `PlayerProfile.titleId?/bio?`; `PUT /me/title {titleId}`, `PUT /me/bio {bio}`, `GET /me/achievements` → `{achievements:[{id,name,counter,thresholds[5],claimedLevels,rewardGold}]}`, `POST /me/achievements/claim {achievementId}` → `{achievement,goldAdded,gold}`; `POST /dev/achievement-progress` chỉ để thử. BE cần quyết định chung khi làm thật (đếm ở server, ledger, idempotency).
- **Art:** avatar thỏ và 8 icon thành tựu là placeholder pixel tự tạo (`profileArt.ts`), chưa phải art thật. Mock chưa đếm thời gian ngồi câu (Người bền bỉ) và chưa đếm "người tiên phong" từ server thật.
- **Kiểm tra:** `tsc`, `vitest` (267 test), eslint sạch; chạy `pier.html` bằng mock: mở từ menu, đổi tên (khung home + tên đầu nhân vật cập nhật), đổi danh hiệu, lưu lời nhắn, nhận thưởng (Gold 100→200, 14/50 ở Lv.2), thành tựu đủ level hiện ✓. Chưa thử với Server thật, chưa kiểm màn hẹp.
- **Tiếp theo:** người dùng đã duyệt giao diện popup Tài khoản (2026-11-16); còn ô cá khoe; GD chốt tên danh hiệu và câu hỏi mở về thành tựu.

### Bổ sung 2026-11-16: ô cá khoe và Server thật (người dùng yêu cầu "làm tất cả việc còn lại")

- **Server (`server/FishingOnline.Api/Modules/Profile/ProfileModule.cs`, migration `PRO_ProfileAchievements`):** `players.TitleId/Bio`, bảng `achievement_claims` (khóa chính player+thành tựu+level chặn nhận trùng) và `showcase_slots`. `PlayerProfileView` thêm `titleId` (mặc định `master`) và `bio`; fixture `docs/v01/fixtures/api-samples.v0.json` cập nhật theo (hai mẫu player).
- **Contract (Server và mock giống nhau):** `PUT /me/title {titleId}` (6 id: master, rookie, hunter, lake_king, sea_friend, legend); `PUT /me/bio {bio}` (≤100 ký tự); `GET/PUT /me/showcase` (3 ô, `{slot, speciesId|null}`, hiện con dài nhất của loài đã mở khóa, một loài một ô); `GET /me/achievements`; `POST /me/achievements/claim {achievementId}` có `Idempotency-Key`, mỗi lần nhận một level, cộng 100 Gold qua ví với ledger `grant_achievement` ref `<id>:<level>`.
- **Đếm thành tựu ở Server (suy ra từ dữ liệu có sẵn, không bộ đếm riêng):** cá từ `catches`, loài từ `species_records`, Gold bán cá từ ledger `sell_fish`, thời gian ngồi từ `seat_sessions` (phút, **tính cả Idle** vì GD chưa chốt), người tiên phong = loài mà lần đầu của người này sớm nhất toàn hệ thống, cá khủng = chiều dài ≥ tối đa của loài (GD chưa chốt nghĩa "kích thước tối đa").
- **Client:** 3 ô cá khoe bấm chọn loài từ Sổ tay (`/me/codex`), hiện ảnh + chiều dài, có nút Gỡ cá. Client đã gọi đúng các route trên nên chạy được với Server thật (`run-real.bat`), chưa thử trên trình duyệt với Server thật.
- **Kiểm tra:** `dotnet test server`: 203/205 qua; `Me_MatchesSampleShape` đã sửa theo fixture và qua; `Disconnect125s_LosesSeat_SeatFreeAtOnce` fail khi chạy cả bộ nhưng qua khi chạy riêng (không thuộc phạm vi này, có vẻ phụ thuộc thời gian). 4 test mới ở `AccountScreenTests.cs` qua. Client: `tsc`, vitest 267, eslint sạch; trên mock đã thử hộp "Chọn cá khoe" khi chưa có cá; chưa thử chọn cá thật trên trình duyệt (cần câu được cá).
- **Còn mở:** tên 5 danh hiệu chờ GD; GD chốt Idle/cá khủng/tiên phong; chưa có UID riêng ở Server (UID hiện suy từ playerId).

## Web Client — Feedback 2026-11-16 (pier.html) — CHỜ LỆNH "làm"

Người dùng gửi 6 feedback; quy tắc: ghi lại, người dùng giải thích, Claude hỏi lại, **chưa làm cho tới khi có lệnh**. Nguyên văn ý:

1. UI Login, loading theo design.
2. Icon chat to lên 50%.
3. Các popup UI chính khi hiện lên phải chặn input vào map (chuột và bàn phím), chỉ tương tác với popup đang mở: UI mua vé, cửa hàng (bán cá, trang bị), Sổ tay cá, popup thông tin cá câu được.
4. UI bán cá, chọn cá: chọn 1 cá xong scroll bị reset về đầu; phần trang bị cũng phải kiểm tra. Chỉ reset về đầu khi mới mở.
5. Bỏ UI nạp Gold.
6. Floating toast nhìn chưa thu hút.

Làm rõ (người dùng trả lời 2026-11-16):

1. Khi vào `https://desktop-oohtpvv.tail21ba23.ts.net/` cũng phải có màn login như khi mở `http://localhost:5173/`. Còn cần xác nhận hiện tượng đang gặp ở URL ts.net.
2. Chỉ phóng to icon chat 50% ở HUD và trong khung chat (không đổi ô bấm/vị trí).
3. Popup mở thì nhân vật đứng yên, chặn toàn bộ chuột và phím vào map.
4. Chỉ reset scroll khi mở popup (đúng ý).
5. Chỉ ẩn UI nạp Gold ở client; giữ route dev ở Server.
6. Toast: làm theo đề xuất (icon theo loại thành công/lỗi/Gold, hiệu ứng nảy khi hiện).

Trạng thái: đã làm theo lệnh "làm đi" (2026-11-16), xem mục dưới.

### Đã làm (pier.html, 2026-11-16)

- **1. Login/loading theo design:** `ui/boot/BootScreens.ts` + `boot.css` (logo, thẻ "Đăng nhập" + nút Google, màn tải có thanh tiến độ và mẹo; cùng kiểu `index.html`, dùng ảnh `public/login/`). Bật qua `BootOptions.screens` chỉ ở `pier.html`; `BootScene` dùng nó thay chữ Phaser (đăng nhập Google, đăng nhập dev, báo lỗi quay về màn đăng nhập để bấm thử lại). URL ts.net chuyển `/` sang `pier.html` (Caddyfile) nên giờ cũng có màn này; cần build lại `dist` khi chạy playtest. Mẹo trong màn tải là chữ tạm tự viết, GD duyệt.
- **2. Icon +50% (đã sửa lại cùng ngày):** ban đầu hiểu nhầm là nút chat; ý người dùng là **emoji trên đầu nhân vật** (trong bong bóng). Đã trả nút chat và hai nút trong khung chat về cỡ cũ; emoji trên đầu ×1.5 (`HEAD_EMOTE_SCALE` trong `CharacterView.ts`, bong bóng ôm theo icon, chỉ trang có bong bóng như pier).
- **3b. Menu cũng chặn input:** panel menu HomeHud có `aria-modal`; `isModalOpen` bỏ qua lớp có `hidden`.
- **3. Chặn input khi popup mở:** `ui/kit/modal.ts` (`isModalOpen`: có lớp `aria-modal="true"` chưa đóng); `LakeScene` mỗi khung kiểm tra (cộng thẻ cá câu được): nhân vật đứng yên, tắt phím Phaser, chặn bấm ghế; `FishButton` bỏ phím Space khi có popup. Áp cho mua vé, cửa hàng, túi đồ, Sổ tay, Tài khoản, Bảng xếp hạng, hộp thoại xác nhận, thẻ cá. Chuột đã bị lớp phủ popup chặn.
- **4. Scroll:** `ui/kit/scroll.ts` (`snapshotScroll`); Cửa hàng và Túi đồ giữ vị trí cuộn khi dựng lại, chỉ về đầu khi mới mở hoặc đổi tab.
- **5. Nạp Gold:** ẩn tab "Nạp Gold" ở client (`TABS` trong `ShopPopup.ts`); mã tab, mock và route dev `/dev/topup` giữ nguyên.
- **6. Toast:** chữ 22px, icon tròn theo loại (✓ xanh, ! đỏ, đồng xu cho thông báo có "Gold"), nảy nhẹ khi hiện (`SlideToast.ts`, `toast.css`).
- **Kiểm tra:** tsc, eslint, prettier sạch; vitest 267 qua. Trên trình duyệt (mock, `googleInMock` tắt tạm rồi bật lại): màn đăng nhập và màn tải hiển thị đúng; đang mở cửa hàng, giữ phím D nhân vật không nhúc nhích (đóng thì đi 45px); tab Nạp Gold biến mất; cuộn cửa hàng 150 giữ nguyên sau khi kho đổi, về 0 khi đổi tab; toast có icon đồng xu; nút chat 81×86.
- **Chưa kiểm:** đăng nhập Google thật trên ts.net (cần build lại và thử), danh sách cá thật cuộn trong tab Bán cá, thẻ cá câu được chặn phím trên máy thật, hoạt ảnh toast mượt (khung trình duyệt bị ẩn).

## Server — Bot giữ hồ không vắng (yêu cầu 2026-11-16)

Yêu cầu: Server kiểm tra 3 phút một lần; tổng người trong hồ (cả bot) dưới 10 thì cho 1 bot vào (Admin chỉnh được config); bot đi lại trên map, thi thoảng câu cá như người chơi thật và được tính vào bảng xếp hạng; cá của bot và của người thật được đánh dấu cho Admin, không lộ trong gói gửi Client. GD/người dùng chốt thêm: config ở bảng riêng, bot rời khi dư người, Server tự cấp Gold cho bot mua vé.

- **Cách chạy (`server/FishingOnline.Api/Modules/Bots/`):** `BotDirector` (BackgroundService) gọi `BotManager.CheckOnceAsync` theo `CheckIntervalSeconds` (đọc lại cài đặt mỗi lần, lần đầu sau 15 giây khởi động). Tổng người = `LakeRoom.Count` (cả bot). Dưới `MinTotalPlayers` và bot < `MaxBots` thì thêm 1 bot; trên ngưỡng thì cho 1 bot rời; `Enabled=false` thì cho hết bot rời. Bot nghỉ được dùng lại (giữ tên, điểm bảng xếp hạng), chưa có thì tạo mới (tên Việt/nước ngoài, skin_01..05, Gold và cần mặc định như người mới).
- **Hành vi (`BotAgent`):** có mặt trong phòng, phát `PlayerJoined`/`PlayerMoved`/`PlayerLeft` như người thật; đi dạo trên chỗ đứng được (dùng bản sao map pier `pier-map.json` + luật va chạm giống `walkable.ts`), 70% vòng thì đi câu: mua vé nếu sắp hết (Gold thiếu thì Server cấp, ledger `bot_grant`), tới ghế trống, `SitDown`, 2–5 lượt `Cast → chờ cá cắn → Hook → Submit` qua đúng `FishingService`/`SeatSessions` mà Hub gọi, rồi đứng dậy. Cá lấy từ hồ thật, có EXP, khoe cá và bảng xếp hạng như người thật. Tỉ lệ báo thắng minigame = `SuccessRatePct` (mặc định 60).
- **Đánh dấu cho Admin, không lộ Client:** cột `players.IsBot`, `catches.IsBot` (migration `BOT_BotsAndMarks`, chưa áp vào DB local của người dùng: chạy `run-local`/`dotnet ef database update`); Admin thấy `isBot` ở `/admin/players` (tìm kiếm + chi tiết), `/admin/players/{id}/catches`, `botPlayerIds` ở `/admin/lake`. Không thêm trường nào vào `PlayerView`, `RankingView`, `InventoryView`, `CatchShown/CatchAnnounced`, `/me`; có test kiểm tên trường của gói và tìm "isBot" trong phản hồi.
- **Config Admin chỉnh (bảng `bot_settings`, không cần publish config gameplay):** `GET/PUT /api/v1/admin/bots/settings` (quyền `config.read`/`config.write`, có audit `bots.settings`): `enabled`, `checkIntervalSeconds` (10–3600, mặc định 180), `successRatePct` (0–100, mặc định 60). (Đã thay: `minTotalPlayers`/`maxBots` cũ được BOT-02 đổi thành bảng mốc `tiers`, xem `docs/work/BOT-02-bot-ket-ban-chat.md`.) `GET /api/v1/admin/bots` (quyền `player.read`) liệt kê bot, đang ở hồ hay không, số cá. Cần Admin Tool làm màn hình gọi các API này (chưa làm).
- **Kiểm tra:** `dotnet test server`: Domain 156/156; Api 218/219, 7 test mới ở `BotTests.cs` qua (ngưỡng thêm/bớt, MaxBots và tắt, dùng lại bot, gói không có cờ bot, cá đánh dấu và Admin thấy, API cài đặt + quyền + audit, một bot thật chạy 90 giây tối đa trên đồng hồ thật: mua vé, câu được cá, đánh dấu IsBot). Test còn fail là `SeatTests.Disconnect125s_LosesSeat_SeatFreeAtOnce` (đã flaky từ trước, qua khi chạy riêng). Chưa chạy bot trên Server dev với Client thật trong trình duyệt.
- **Cần GD/người dùng quyết:** (1) `pier-map.json` là bản sao map pier: map đổi thì phải cập nhật (và `Lake:MapId`/`SeatCount` phải khớp pier); (2) bot hiện không bán cá nên túi cá bot đầy dần, không ảnh hưởng người thật; (3) bot vào bảng xếp hạng tuần chiếm hạng 1–50 và hiển thị thưởng như người thật; thưởng chưa tự cộng nên chưa có tiền chi cho bot, nhưng khi làm trả thưởng tự động phải loại bot; (4) Idle: bot câu hết lượt thì đứng dậy đi dạo nên không ngồi treo.

## Map pier 30 ghế (yêu cầu 2026-11-16)

Yêu cầu: bỏ thùng gỗ và ghế dài ở khu cầu phía dưới (hình 1) rồi thêm 8 ghế câu; ở mũi cầu phía trên (hình 2) bỏ ghế dài và thêm 6 ghế; Server chạy 30 ghế.

- **Khu 1 (cầu dưới, y≈416–520):** bỏ chồng thùng gỗ (4 `boxClosed`) và 2 ghế dài ngang; thêm 5 ghế hàng trên quay lên (x 584, 616, 648, 680, 744; y 434) và 3 ghế hàng dưới quay xuống (x 552, 696, 744; y 514). Ghế cũ `seat-05..08` giữ nguyên.
- **Khu 2 (mũi cầu, x≈568–696, y≈184–300):** bỏ ghế dài đứng và 2 ghế dài ngang (cọc gỗ giữa mũi cầu giữ lại); thêm 2 ghế mép trái quay trái (x 584; y 208, 240), 3 ghế mép dưới quay xuống (x 600, 632, 664; y 292), 1 ghế mép phải quay phải (688, 240).
- **Dữ liệu:** `client-v0/src/online/scenes/pier/fishingPierMap.json`: bỏ 28 object (đủ lớp bóng), thêm 14 ghế đẩu (+ bóng) và 14 dòng `lake.seats` (`seat-17..30`; ghế đẩu nằm ở `(x-7, y-17)` so với điểm ngồi), sửa lưới đi được (trả đường đi chỗ thùng/ghế dài, chặn chân ghế đẩu mới), `mapVersion` `pier-2`. Bản sao cho bot `server/FishingOnline.Api/Modules/Bots/pier-map.json` sinh lại từ file này.
- **Server:** số ghế do `Lake:SeatCount`; `tools/run-local.ps1` và `tools/run-playtest.ps1` đặt `Lake__SeatCount=30`, `Lake__MapVersion=pier-2`. Mặc định Server vẫn 20 ghế và `lake-01` (chạy tay phải tự đặt). Đã cập nhật `docs/be/DEPLOY_PLAYTEST.md`, `server/README.md`, `docs/HANDOFF.md`.
- **Kiểm tra:** tsc, eslint, prettier sạch; vitest 267 qua (test ghế đổi 16→30: mỗi ghế có chỗ đứng khi rời, phao rơi xuống nước, ghế nằm trên ghế đẩu, không đứng được giữa vật cản); BotTests 7/7 với map mới; trên trình duyệt (mock) hai khu hiển thị đúng, ghế đẩu thẳng hàng.
- **Chưa kiểm:** ngồi thật từng ghế mới trên Server thật (cần `run-real.bat`), màn hẹp. Ghế mép trái khu 2 đặt cách mép sàn khoảng 16 px; muốn sát mép hơn thì chỉnh toạ độ trong JSON.

### Làm lại bố cục ghế và sửa bot đi giật (người dùng chê "chán", bot "teleport", 2026-11-16)

- **Bố cục mới (14 ghế `seat-17..30`):** ghế sát mép sàn, chia cụm thay vì hai hàng đều tăm tắp. Khu 1: hàng trên quay lên gồm cụm 4 ghế (x 520, 552, 584, 616) | biển câu cá ở giữa (`fishing-objects/fishingSign` có sẵn trong atlas, đặt (624, 372), chặn chân) | cụm 3 ghế (680, 712, 744), tất cả y 434; hàng dưới quay xuống quanh cặp ghế cũ 600/648 (x 552, 696, 744; y 514). Khu 2 (mũi cầu): đối xứng quanh cọc gỗ, 2 ghế bên trái (x 584; y 214, 254), 2 ghế bên phải (x 676; y 240, 276), 2 ghế phía dưới (x 596 và 660; y 288); **thụt vào trong sàn** khoảng 16 px cách mép (lần đầu đặt sát mép, ghế dưới thò ra mặt nước nên người dùng chê, sửa lại 2026-11-16).
- **Sửa tiếp (2026-11-16):** bỏ biển câu cá ở giữa mép trên khu 1 theo yêu cầu; hàng ghế trên xếp đều như hàng dưới: 7 ghế cách nhau 40 px (x 512, 552, 592, 632, 672, 712, 752; y 434), trong đó 552 và 712 là ghế cũ. Hàng dưới giữ cách nhau 48 px.
- **Sửa lần 3 (người dùng chọn "5 ghế thẳng cột hàng dưới", 2 ghế bù tao tự chọn):** hàng trên cầu dưới còn 5 ghế cùng cột với hàng dưới (x 552, 600, 648, 696, 744), dời xuống y 447 cho nằm hẳn trên sàn (mép trên lởm chởm tới y≈431; ở y 447 phao cột 744 vẫn rơi xuống nước cạnh góc cầu). Ghế cũ `seat-05` dời tới (552, 447), `seat-06` từ (712, 434) tới (696, 447). 2 ghế bù đặt ở cầu dài phía dưới, lấp hai khoảng trống của hàng ghế có sẵn: (448, 738) và (584, 738), quay xuống. Trả lại sàn một dải chặn sót từ chân thùng gỗ (x 592–615, y 448–455); mép trên y 416–423 vẫn không đứng được như map gốc. Tổng vẫn 30 ghế.
- **Sửa lần 4 (mép trên cầu dưới):** xoá các cọc gỗ mảnh lòi trên mặt nước phía trên cầu (ô nền 119/471 ở cột 38–39, hàng 24–26); làm mép trên đoạn giữa (cột 34–44, x 544–719) phẳng như mép dưới: hàng 24–25 (y 384–415) thành nước (ô 289, thêm vào `openWater`), hàng 26–27 (y 416–447) thay ô đầu ván lởm chởm bằng ô sàn đầy của hàng 28 cùng cột. Hai khối cầu hai đầu (trái/phải) giữ nguyên.
- **Sửa lần 5 ("đừng thẳng, nhấp nhô 1 tí", "đẩy hàng trên lên gần mép"):** hàng 26 dùng lại ô đầu ván gốc của map cho mép hơi lởm chởm, bỏ các khe sâu (cột 37, 39, 40, 41 lấy ô đầu ván gốc ở hàng 27 của chính cột đẩy lên hàng 26; hàng 27 lấp sàn đầy; ô 388 ở hàng 27 cột 42 có lỗ nước nên cũng lấp). Hàng ghế trên dời lên y 441 (ghế đẩu y 424–439), sát mép như hàng dưới.
- **Sửa lần 6 (mũi cầu, người dùng chọn "sát mép như cầu dưới"):** 6 ghế cách mép sàn đều khoảng 8 px: trái (577; y 214, 254), phải (682; y 240, 276), dưới (596, 280) ở phần mép trái y≈286 và (660, 287) ở phần mép phải y≈293.
### Vào game ở điểm ngẫu nhiên (pier.html, 2026-11-16)

- Mỗi lần vào game (LakeScene tạo nhân vật) nhân vật xuất hiện ở một điểm ngẫu nhiên đứng được trên map, trừ nước và vùng không đi được. `walkable.ts`: `reachablePoints` (BFS các ô 8 px đứng được và đi tới được từ spawn, cache theo map, loại cả ô "đi được" bị cô lập như nóc thùng) và `randomSpawn`. Đang giữ ghế (vào lại khi còn ghế) thì vẫn đặt vào ghế. Vị trí mới gửi Move ngay nên người khác/Server thấy đúng chỗ. Chỉ pier (cờ `isHomeHudEnabled`); trang khác giữ luật cũ (vị trí lần trước hoặc spawn). Nối lại sau rớt mạng không đổi chỗ (chỉ khi tạo scene). Bot Server vẫn xuất hiện quanh spawn.
- Kiểm tra: test mới trong `walkable.test.ts` và `pierMap.test.ts` (điểm luôn đứng được, không rơi vào ô cô lập, map pier có hơn 2000 ô đi tới được); trên trình duyệt hai lần tải trang ra (964, 295) và (52, 239), đều trên đất.

### (tiếp mục Làm lại bố cục ghế) Lỗi nước mũi cầu

- **Lỗi nước giữa sàn mũi cầu:** dải xanh nhỏ (x≈586–591, y≈252–266) lộ ra khi bỏ ghế dài, do ô nền cột 36 hàng 16 của `ground` có phần nước; đã thay bằng ô sàn liền kề (cột 37). Ghế mép phải không đặt ở y 214 vì chỗ đó nối sang cầu chính.
- **Bot đi như dịch chuyển, cả hai nơi:** (1) bot **mock** (client) trước đi bước ngẫu nhiên 16 px mỗi 0,6 giây rồi **nhảy thẳng lên ghế** khi hết giờ dạo; nay đi bước 5,5 px mỗi 100 ms (55 px/giây, đúng nhịp Move của người thật và nội suy 100 ms của Client), chọn điểm đi dạo đứng được, nghỉ 0,8–3 giây rồi đi tiếp, và **đi bộ tới chỗ đứng cạnh ghế** rồi mới ngồi (`mock/botWalk.ts`, trạng thái `toSeat` trong `botFishing.ts`, `MockBackend.moveBots`). (2) bot **Server** (C#) trước gửi bước 9,5 px mỗi 150 ms nên cứ đi rồi khựng mỗi bước; nay 100 ms/bước, tốc độ 45–63 px/giây, và đứng dậy cũng đi bộ ra chỗ đứng thay vì nhảy.
- **Còn lại có thể thấy một cú nhảy nhỏ** (vài px) lúc bot/người chơi vào ghế: người thật cũng bị đặt thẳng vào điểm ngồi (Client tự làm), bot theo đúng cách đó. Bot mock khi đứng dậy vẫn dịch tới chỗ đứng gần ghế bằng một bước (chưa đi bộ).
- **Kiểm tra:** tsc, eslint, prettier sạch; vitest 270 qua (thêm `botWalk.test.ts`, test ghế pier 30 vẫn đạt); `dotnet build` sạch. Trên trình duyệt (mock): hai khu hiển thị đúng bố cục mới, biển ở giữa mép trên khu 1; một bot đi liên tục bước ngắn (trung bình ~2 px mỗi lần lấy mẫu, không còn nhảy 16 px). Bot Server chưa chạy lại trên trình duyệt với Server thật; chỉ đổi nhịp/tốc độ và test `BotTests` kiểm tra lại.

## Web Client — Feedback câu cá (pier.html, 2026-11-16)

Người dùng gửi 5 điểm và bảo "hãy sửa đi". Đã làm, chưa commit.

- **Dấu ! khi cá cắn màu đỏ** (`#ff3b30`, trước vàng), vẫn nhấp nháy mờ/rõ. Đổi chung mọi trang (`CharacterView.BITE_COLOR`).
- **Vòng vàng chạy quanh viền nút móc câu** thay thanh dưới nút: SVG tròn ôm ngoài viền ảnh Button Hook, đầy khi cá vừa cắn, ngắn dần theo thời gian còn lại (cùng số `biteProgress` cũ), bắt đầu từ đỉnh theo chiều kim đồng hồ; có vệt nền tối mờ. `FishButton.ts`, `fishing.css`. Áp chung mọi trang dùng nút này.
- **Chữ SPACE đè lên nút**, cỡ 24px (trước 12px nằm dưới nút), chữ trắng viền đen, nằm phần dưới mặt nút để không che lưỡi câu.
- **Cá cắn/kéo cá chỉ tay và cần rung**: art thỏ có tay vẽ chung lớp cần, nên thân giữ tư thế ngồi đứng yên (animation `sit`) trong `bite` và `reel`, lớp cần (có tay) vẫn rung như cũ. Không cần bake lại art.
- **Câu thất bại: mặt buồn + emoji buồn**:
  - Atlas không có biểu cảm buồn cho thỏ. Vẽ thêm vài điểm ảnh lên mặt thỏ khi ngồi: lông mày xệ, miệng mếu, giọt nước mắt xanh. Nhìn xuống và nhìn ngang có; quay lưng không thấy mặt nên chỉ có emoji. Điểm ảnh đo trên frame ngồi của skin thỏ; sprite vẽ tạm không có.
  - Emoji buồn trên pier hiện trong bong bóng trên đầu, cùng cỡ emoji chat (to hơn icon nhỏ cũ). Trang khác giữ icon nhỏ.
  - Pier bỏ minigame nên thất bại duy nhất là **trượt cá** (không thu cần kịp). Trước đây trượt cá không buồn (feedback 2026-11-11); nay trên pier trượt cá cũng có mặt buồn và emoji buồn khoảng 2 giây rồi tự câu lại (cờ `sadOnMissedBite`). Trang khác giữ quy tắc cũ.
  - Người chơi khác thấy mặt buồn khi Server báo họ thua (icon buồn sẵn có). Server chưa báo trượt cá của người khác nên họ không thấy mình buồn khi trượt cá.
- **Kiểm tra:**
  - tsc, eslint, prettier sạch; vitest 281 qua.
  - Trên trình duyệt (mock, tạm tắt Google lúc thử rồi bật lại): khi cá cắn thấy vòng vàng quanh nút, chữ SPACE to trên nút, dấu ! đỏ. Trượt cá thì thấy mặt buồn và emoji buồn trong bong bóng (nhìn xuống và nhìn ngang). Khi cá cắn hoặc kéo cá, thân chạy `sit`, cần chạy `bite`/`reel`.
  - Chưa xem trên Server thật.
- **Cần người dùng xem:** dáng mặt buồn tự vẽ (pixel); vị trí, cỡ chữ SPACE và độ dày vòng vàng.

## Skin trang phục + tab "Ngoại hình" (2026-11-16, người dùng yêu cầu)
- **Yêu cầu đã duyệt:** chọn ngẫu nhiên 5 bộ trang phục, thêm tab bán trong cửa hàng giá 300 Gold, dựng khung "Ngoại hình" theo art `public/new resources/ui/Skin`. Skin_01–05 (5 màu thỏ) giữ miễn phí; 5 bộ mới là skin_06–10, thân thỏ brown. Lối mở khung Ngoại hình: bấm avatar trong popup Hồ sơ.
- **5 bộ (bốc ngẫu nhiên từ 102 outfit trong atlas):** skin_06 `queen-dress` (Váy nữ hoàng), skin_07 `bunny-onesie-blue` (Onesie thỏ xanh), skin_08 `yellow-raincoat-purple` (Áo mưa tím), skin_09 `swimsuit-pink` (Đồ bơi hồng), skin_10 `santa-outfit` (Ông già Noel). Đổi bộ: sửa `OUTFIT_SKINS` trong `client-v0/tools/bake_outfit_skins.mjs` rồi chạy lại; tên hiển thị ở `Social.Skins` trong `server/FishingOnline.Api/appsettings.json` và `mock/skinCatalog.ts`.
- **Art:** `tools/bake_outfit_skins.mjs` (Node, vì máy không có Python) ghép thân + lớp outfit cùng khung 120×140, cùng animation như `bake_characters.py`; `--check` ghép lại skin_01 và so với file Python đã bake: khớp từng byte. `headTop` tính trên frame đã mặc đồ (onesie có mũ cao hơn: 48).
- **Server (C#):** bảng `skins_owned` (migration `SKIN_SkinsOwned`), `SkinOption.Unlock` "free"|"shop", `POST /shop/buy` mua skin qua offer `offer_skin_06..10` (cùng luồng mua cần, ledger `buy_skin`), `inventory.skins`, `GET /skins` thêm `owned`, `PUT /me/skin` chặn skin chưa mua (`SKIN_NOT_OWNED`), mua lại → `SKIN_ALREADY_OWNED`. Giá nằm trong `docs/v01/fixtures/gameplay-config.v0.json` (`shopOffers`).
- **Client:** tab "Ngoại hình" trong `ShopPopup` (5 thẻ, "Đã có" khi đã mua), `ui/skin/SkinPopup.ts` + `skin.css` (khung Appearance Panel, thẻ Skin 1/Skin 5, nút Mặc, thanh cuộn chạy theo nội dung), `ui/skin/skinArt.ts` dùng chung, `LakeScene` đổi skin nhân vật mình khi nhận `SkinChanged`, mock có `/skins`, `PUT /me/skin`, mua skin.
- **Kiểm tra:** server `dotnet test` 222/223 qua (1 test `Disconnect125s` timeout khi chạy cả bộ, chạy riêng qua; 2 test mua skin mới qua); client tsc, eslint, prettier sạch, vitest 284 qua; trên trình duyệt (trang thử tạm với mock, đã xoá): tab Ngoại hình hiện 5 thẻ, mua trừ Gold rồi "Đã có", khung Ngoại hình mặc được skin đã mua, skin chưa mua mờ + "Chưa sở hữu", thanh cuộn khớp, Esc chỉ đóng khung Ngoại hình.
- **Chưa làm / chưa kiểm:** chưa chạy với Server thật trong trình duyệt (chỉ test API Server và mock riêng); chưa xem sprite skin mới khi đi/ngồi câu trong hồ; avatar trong Hồ sơ vẫn là art tạm, chưa đổi theo skin; không có nút mua trực tiếp trong khung Ngoại hình (mua ở cửa hàng). Admin chưa hiển thị skin đã mua.

## Web Client — Thành tựu: chỉ chấm đỏ nhấp nháy (2026-11-16)
- **Feedback:** thẻ thành tựu đạt mốc chưa nhận không phủ đỏ nhấp nháy cả thẻ nữa, chỉ chấm đỏ góc thẻ nhấp nháy.
- **Đã sửa:** `ui/profile/profile.css` bỏ lớp phủ `.profile__card--claim::after` và keyframes `profile-claim`; chấm `profile__dot` giữ nhịp mờ/rõ 1 s; thẻ vẫn bấm được để nhận.
- **Kiểm tra:** prettier sạch; dev server phục vụ CSS mới (không còn lớp phủ). Chưa mở popup Hồ sơ trong game để nhìn tận mắt.
- **Bổ sung 2026-11-17:** chấm đỏ fade in/out hẳn (opacity 0 ↔ 1, chu kỳ 1.2 s) thay cho 0.35 ↔ 1; bỏ ngoại lệ `prefers-reduced-motion` để máy tắt hiệu ứng Windows vẫn thấy nhấp nháy. Kiểm tra trên trình duyệt: animation `profile-dot` cho opacity 0 → 0.5 → 1 → 0.5.

## Web Client — Ẩn thanh cuộn khung Trò chuyện (2026-11-17)
- **Feedback:** xoá thanh cuộn bên phải danh sách tin nhắn.
- **Đã sửa:** `social/social.css` `.chat-panel__log`: `scrollbar-width: none` + ẩn `::-webkit-scrollbar`, bỏ padding phải 4px dành cho thanh cuộn; vẫn cuộn bằng chuột/vuốt. Áp dụng mọi trang có khung chat.
- **Kiểm tra:** prettier sạch; trên trình duyệt danh sách vẫn `overflow-y: auto`, thanh cuộn rộng 0px. Chưa mở khung chat trong game để nhìn tận mắt.

## Web Client — Cần câu vừa ô trong Cửa hàng (2026-11-17)
- **Feedback:** ảnh cần ở tab Trang bị lòi ra ngoài ô, cho cần bé lại.
- **Đã sửa:** `ui/shop/shop.css` `.shop-card__rod` cao 92px (trước tới 128px), rộng tối đa 44px, vẫn xoay nghiêng 18°.
- **Kiểm tra:** prettier sạch; trên trình duyệt đo 5 cần (old, steel_awl, high_performer, bliss, giant_caster): khung sau khi xoay ~62×99px, nằm gọn trong lòng ô 120×120. Chưa mở cửa hàng trong game để nhìn tận mắt.

## Web Client — Màn Đăng nhập, Main Menu, Đăng xuất (pier.html, 2026-11-17)
- **Yêu cầu đã chốt với người dùng:** dựng màn Đăng nhập theo art `public/new resources/ui/Login`; đã đăng nhập Google từ lần trước thì chỉ hiện Main Menu (logo, nút CHƠI, nút Đăng xuất góc trên phải); nút Đăng xuất chỉ ở Main Menu; bấm Đăng xuất thì thoát cả Google lẫn phiên Server, hiện khung Đăng nhập và ẩn nút Đăng xuất. Không làm nút Facebook, không hiện chữ "v0.1". Nền giữ `public/login/background.png`. Chỉ pier.html.
- **Đã làm:**
  - `ui/boot/BootScreens.ts` + `boot.css`: khung Sign In Panel (640×388), tiêu đề "Đăng nhập", gạch ngang có viên cam, nút ảnh Google.png, dòng giới thiệu (lỗi đăng nhập thế chỗ dòng này); Main Menu với Button Play.png và Button Logout.png; màn chặn điện thoại cũng dùng khung mới. Kích thước theo màn thiết kế 1920×1080 (`--s`, tối thiểu 0.42px).
  - `core/BootScene.ts`: có màn thiết kế + dùng Google thì: còn nhớ đăng nhập → `showMenu` (CHƠI → màn tải → vào hồ), chưa → khung Đăng nhập (bấm Google → vào thẳng hồ). Đăng xuất: `POST /auth/logout` (thu hồi cookie refresh, lỗi thì bỏ qua) rồi `signOutGoogle()` (thêm vào `src/firebaseAuth.js`).
- **Kiểm tra:** tsc, eslint, prettier sạch; vitest 291 qua. Trình duyệt 1280×720: khung Đăng nhập và Main Menu khớp ảnh thiết kế; bấm Đăng xuất (gọi từ Main Menu dựng thử) → hiện khung Đăng nhập, nút Đăng xuất ẩn, không lỗi console; giả lập điện thoại vẫn ra màn chặn.
- **Chưa kiểm:** chưa đăng nhập Google thật trong trình duyệt thử (agent không nhập mật khẩu), nên chưa xem luồng thật: đăng nhập → tải lại trang ra Main Menu → CHƠI vào hồ → Đăng xuất. Chưa thử với Server thật.

## Feedback 2026-11-17 chiều: thanh cuộn Bán cá, trang phục trên Server thật, nút móc câu
- **Web Client — bỏ thanh cuộn tab Bán cá:** `ui/shop/shop.css` `.shop-sell__grid` `scrollbar-width: none` + ẩn `::-webkit-scrollbar`, vẫn cuộn bằng chuột/vuốt. Prettier sạch, vitest 291 qua; chưa mở cửa hàng trong game để nhìn.
- **Server — tab Ngoại hình trống với Server thật (người dùng duyệt cách sửa "đổi phiên bản + Server tự nạp"):**
  - Nguyên nhân: `ConfigBootstrapper` chỉ nạp fixture khi bảng `config_versions` trống; 5 offer `offer_skin_06..10` được thêm vào fixture mà không đổi `configVersion`, nên DB đã chạy vẫn dùng bản cũ không có trang phục.
  - Sửa: `Modules/Config/ConfigModule.cs` — khởi động mà `configVersion` của fixture chưa có trong DB thì thêm version đó và bật nó (tắt version đang bật, khóa `for update`, cùng cách Admin xuất bản). Fixture cùng version thì giữ nguyên version Admin đang bật. Đổi `configVersion` thành `v0-test-2026-11-17-skins-01` trong `gameplay-config.v0.json`, `minigame-vectors.v0.json`, `api-samples.v0.json` và các test Server dùng chuỗi này.
  - Tác động: từ nay mỗi lần đổi `configVersion` trong fixture, lần khởi động sau sẽ thay version Admin đang bật bằng fixture.
  - Kiểm tra: thêm `ConfigBootstrapTests` (2 test: version mới được bật và có `offer_skin_06`; cùng version giữ bản Admin). `dotnet test` 233/234 qua, test lỗi là `SeatTests.Disconnect125s` (đã biết hay timeout khi chạy cả bộ), chạy riêng qua.
  - Cần làm trên máy chạy Server: khởi động lại API bằng `tools/run-local.ps1 -Mode real` (áp cả migration `SKIN_SkinsOwned`, `BOT_BotsAndMarks` nếu chưa áp; Server không tự migrate). Chưa xem tab Ngoại hình với Server thật.
- **Nút móc câu:** người dùng chỉ cần nút dùng art mới của `public/mini game/Button Hook.png` (file duy nhất được thay, 2191 byte). Code vốn trỏ đúng file; thêm `?v=20261117` vào đường dẫn ảnh trong `fishing/FishButton.ts` để trình duyệt không dùng ảnh cũ đã cache. Kiểm tra: tsc, prettier sạch, vitest fishing 52 qua; dev server trả đúng ảnh mới 2191 byte. Đổi art lần sau thì đổi số `?v=`.

## Server thật không câu được cá (kiểm tra 2026-11-17, chưa sửa)
- Hồ `fishing-pier` hết cá: tồn đầu 898 (14/11), bị câu hết lúc 15:56 ngày 17/11 (bot 811, người 87); hồ `lake-01` còn 898. Từ đó lần câu chỉ "chờ" mãi. Không liên quan việc đổi `configVersion` (bản mới nạp lúc 16:04; so JSON hai bản: chỉ khác `shopOffers`, tên hiển thị cá, `configVersion`).
- Hướng sửa (bot không trừ quần thể / thả thêm cá / báo "hồ hết cá" cho người chơi): người dùng sẽ bàn với GD sau.
- **Cập nhật 2026-11-17 (người dùng báo bot câu đã không trừ tổng cá):** theo yêu cầu, thả lại cá cho hồ `fishing-pier` trên DB local thật (Postgres cổng 55432) bằng SQL làm giống `StockInTransactionAsync`: cộng lại đúng tồn đầu từng loài (bass 100, carp 200, goldcarp 40, koi 15, minnow 200, moonfin 3, perch 200, puffer 40, trout 100 = 898) và ghi 9 dòng `lake_fish_movements` kind `stock` cùng một batch. Kiểm tra sau khi chạy: tổng 898, reserved 0. Không đi qua Admin nên không có bản ghi đợt thả trong Admin.

## Web Client — Camera giật khi di chuyển (2026-11-17)
- **Nguyên nhân:** `LakeScene` bám nhân vật bằng `startFollow(..., roundPixels=true)`. Zoom pier là số lẻ (vd 2.4 ở 1280×720) nên Phaser không làm tròn khi vẽ, nhưng vẫn làm tròn scroll camera về nguyên px map: camera chạy 1-2-1-2 px trong khi nhân vật đi 1.5 px/khung, nhân vật lắc 0.5 px map (~1.2 px màn hình) mỗi khung.
- **Sửa:** `startFollow(this.me.container, false)` (dùng cho mọi trang có LakeScene).
- **Kiểm tra:** đo trên trình duyệt (mock, 1280×720, tạm tắt Google rồi bật lại): vị trí nhân vật trên màn hình trước đổi 1536 ↔ 1537.2 xen kẽ từng khung, sau cố định 1536; chụp lúc đang đi không thấy hở đường kẻ giữa các ô. tsc, eslint, prettier sạch, vitest 291 qua. Chưa thử trên Server thật và màn hình độ phân giải khác.

## Web Client — Hình cá vừa câu trên đầu người khác (2026-11-17)
- **Feedback:** câu xong thì trên đầu bot và người chơi thật (Server thật) phải hiện icon con cá câu được; trước đây chỉ là chấm elip tô màu độ hiếm (xám = thường).
- **Đã sửa:** `entities/CharacterView.ts` — `HeadIcon` loại `fish` thêm `speciesId`; hiện ảnh `public/assets/fish/<speciesId>.png` (nạp texture lần đầu khi cần, trong lúc nạp hiện chấm màu cũ), thu vào khung tối đa 32×18 px map; pier.html đặt trong bong bóng trên đầu như emoji, trang khác đặt ở chỗ icon cũ. `LakeScene.syncCatches` truyền `speciesId` từ `CatchShown`. Server đã gửi `speciesId` trong `CatchShown` cho cả người thật lẫn bot (bot đi qua `FishingService.SubmitResultAsync`), không cần sửa Server.
- **Kiểm tra:** tsc, eslint, prettier sạch; vitest 291 qua. Trình duyệt (mock, tạm tắt Google rồi bật lại): giả `CatchShown` cho 3 bot (moonfin, minnow, puffer) → bong bóng hiện đúng hình cá (minnow 32×16); koi chưa nạp sẵn vẫn hiện sau khi tải; hết `shownUntil` thì bong bóng tắt. Chưa xem với Server thật. Nhân vật của mình vẫn không hiện cá trên đầu (đã có popup nhận cá).
- **Cập nhật:** đã thấy hình cá trên đầu bot khi chơi trên Server thật (17/11).

## Review game feel pier.html trên Server thật (2026-11-17)
- Tài liệu review gửi người dùng: https://claude.ai/artifact/V1saJgq9KE4ursR9zrWQST (tóm tắt, vòng chơi, UI/kinh tế, xã hội, so sánh thị trường, 10 đề xuất ưu tiên). Là đề xuất, chưa phải quyết định đã chốt.
- Cách chơi: thêm cấu hình `client-v0-real` (Vite với `VITE_USE_MOCK=false`, cổng 5173) vào `.claude/launch.json`; người dùng đăng nhập Google trong trình duyệt app; agent bán 14 cá (70 Gold), mua 1 vé, câu 3 con trên tài khoản test.
- Lỗi nhỏ thấy được: thẻ cá ghi "Nơi sống: fishing-pier"; tên cá dài bị cắt trong tab Bán cá; spawn ngẫu nhiên có lúc ở mép trên map (y=15) hoặc sau hải đăng; ghế sát mép map thì nút móc câu ở giữa màn hình, xa nhân vật; popup vé có nút -10/+10 trong khi tối đa 6 vé (chưa sửa). Dải banner "trống" là lúc chữ đang chạy giữa hai lượt, đúng hiệu ứng đã chốt, không sửa.

## Web Client — Sửa mục 1–2 của review (2026-11-17)
- **Thẻ cá:** "Nơi sống" hiện tên hồ (`fishing-pier` → "Bến cá", `lake-01` → "Hồ câu", map khác giữ mã) — `LakeScene` truyền `habitat` cho `FishingFlow`. Tên hiển thị là đề xuất, GD đổi được trong `LAKE_NAMES`.
- **Tên cá dài trong tab Bán cá:** `.shop-fish` có `min-width: 0`, `.shop-fish__name` xuống tối đa 2 dòng thay vì cắt.
- **Chỗ xuất hiện ngẫu nhiên:** `randomSpawn` chừa lề 80px quanh mép map và nhận thêm điều kiện; pier loại chỗ bị vật thể vẽ đè (`isHiddenBehindObject` trong `pierMap.ts`, qua `LakeMapArt.isHidden`). Không còn chỗ hợp thì dùng lại mọi chỗ đi được như cũ.
- **Nút móc câu:** `LakeScene.anchorFishButton` đặt nút dưới chân nhân vật theo toạ độ màn hình mỗi khung (`FishButton.setAnchor`); camera ở giữa thì vị trí như cũ. Coral Cove không gọi nên giữ CSS cũ.
- **Kiểm tra:** tsc, eslint, prettier sạch; vitest 292 qua (thêm test spawn không sát mép, không khuất). Trên Server thật (pier.html, tài khoản người dùng): Main Menu → CHƠI vào hồ, nhân vật xuất hiện chỗ thoáng; đặt nhân vật ở y=100 (sát mép trên) thì nút nằm ngay dưới chân; `habitat()` trả "Bến cá"; ô cá dựng thử với tên dài xuống 2 dòng, không tràn. Chưa nhìn thẻ cá thật với dòng "Bến cá" (vé hết giờ).

## Web Client — 5 effect câu cá, chặn thuyền, khói tàu (pier.html, 2026-11-17)
- **5 effect (theo mục "Gợi ý effect và FX" trong review, người dùng duyệt):** `fishing/fishingFx.ts` + cờ `PierFishingOptions.fishingFx` (chỉ pier).
  - Phao rơi xuống: tõm nước (giọt 1–2px + vòng gợn) và tiếng `castImpact`; trong lúc chờ cứ 1,3 giây một vòng gợn nhỏ quanh phao.
  - Cá cắn: bắn nước mạnh + 2 vòng gợn, thêm tiếng `castImpact` cạnh tiếng báo cũ. Phao vẽ sẵn trong art cần nên không tách ra cho chìm được; effect nước thay vào.
  - Móc trúng (pha `minigame`): khựng hình 70ms (dừng tween, animation, đồng hồ scene; không dùng `scene.pause()` vì lệnh đó chỉ có hiệu lực ở khung sau) rồi rung màn nhẹ.
  - Câu được: cá đúng loài bay từ phao lên đỉnh đầu (`CharacterView.catchPoint`), lắc mình, giữ ~0,65 giây rồi mờ; thẻ cá vẫn hiện sau pháo giấy như cũ. Ảnh cá dùng chung `entities/fishTexture.ts` với hình cá trên đầu.
  - Gold tăng (bán cá, nhận thưởng…): `ui/home/goldFx.ts` — 8 đồng xu bung ra giữa màn hình rồi bay vào ô Gold, số đếm lên, đồng xu trong ô nảy; Gold giảm thì đổi số ngay.
- **Chặn thuyền:** lưới đi được bỏ các ô có điểm ảnh màu của thân tàu (`fishing-objects/boat`) và 3 thuyền nhỏ (`smallRaft`) — 334 ô, tính từ atlas (script tạm trong scratchpad). Sửa cả `fishingPierMap.json` và bản sao cho bot `server/.../Bots/pier-map.json`. Spawn ngẫu nhiên tự loại vì thành ô không đi được. Không có ghế nào trên thuyền. **Server cần khởi động lại** để bot dùng map mới.
- **Khói tàu:** map có 2 object chồng nhau là cả con tàu: `big-boat` (có khói, animation) và `fishing-objects/boat` (tĩnh, vẽ đè lên nên che chân khói). Thêm `"d": 744` cho `big-boat` để vẽ trên bản tĩnh.
- **Kiểm tra:** tsc, eslint, prettier sạch; vitest 292 qua; `dotnet test --filter Bot` 16 qua. Trên Server thật: bán 7 cá → 8 đồng xu bay, Gold đếm 20 → 105; ngồi ghế, phao rơi có tõm nước; không đứng được trên 3 thuyền và thân tàu; khói nằm trên miệng ống khói. Cá cắn/móc/cá bay chỉ thử bằng cách gọi thẳng effect tại phao, vì hồ `fishing-pier` lại hết cá (2 giờ qua bot câu 890 con, người 8 con — bot vẫn đang trừ tồn trên Server đang chạy).

## Web Client — Chặn điện thoại (pier.html, 2026-11-17)
- **Yêu cầu:** mở web trên điện thoại thì không vào game, không cho đăng nhập, hiện popup báo ứng dụng không tương thích với điện thoại.
- **Đã làm:** `core/device.ts` `isPhone()` (ưu tiên `navigator.userAgentData.mobile`, rồi UA iPhone/iPod/Windows Phone/Android…Mobile/Mobi); `preview.ts` gặp điện thoại thì chỉ hiện `BootScreens.showBlocked()` rồi dừng: không tạo Phaser, không gọi services, không có nút Google. Popup dùng nền và thẻ của màn đăng nhập: "Thông báo", 📵, "Ứng dụng này không tương thích với điện thoại.", "Vui lòng truy cập bằng máy tính để chơi Fishing Online."
- **Phạm vi:** chỉ pier.html (trang có màn đăng nhập mới). Máy tính bảng (Android không có "Mobile", iPad báo là Mac) vẫn vào được. Chặn ở client, Server không chặn.
- **Kiểm tra:** tsc, eslint, prettier sạch; `device.test.ts` 2 test qua. Trình duyệt giả lập Pixel 8 (375×812): hiện popup, không có canvas; máy tính 1280×800: vẫn ra màn đăng nhập bình thường. Chưa thử trên điện thoại thật.
## Web Client — Điện thoại vào pier.html: tự xoay + toàn màn hình (2026-11-19, yêu cầu người dùng)
- **Yêu cầu (thay mục "Chặn điện thoại" 2026-11-17):** điện thoại vào được game. Vào bằng máy đang dọc thì game tự xoay sang phải; người chơi xoay máy sang ngang (trái hay phải) thì game về thẳng, không còn xoay. Bấm CHƠI hoặc nút Google thì vào toàn màn hình. Bỏ lời nhắc "xoay ngang điện thoại" làm trước đó.
- **Xoay:** `scenes/pier/mobileFrame.ts` (`startMobileFrame`): màn cảm ứng + `innerHeight > innerWidth` thì xoay cả `body` `rotate(90deg)` (đỉnh game về cạnh phải màn hình); mọi lớp `position: fixed` gắn trên body xoay theo. Ngang (OS tự đặt lại trang, cả hai hướng ngang) thì bỏ xoay. Máy tính để cửa sổ dọc (chuột) không xoay. Gắn vào `resize`, `orientationchange`, `visualViewport`, `fullscreenchange`.
- **Vá cho khung đã xoay:** Phaser (`getParentBounds`, `updateBounds`, `transformPointer`) và UI dùng `core/viewFrame.ts` (`localRect`, `localPoint`, `toLocal`, `frameSize`): `trackCanvasFrame`, Joystick, thanh kéo ShopPopup/TicketDialog/SettingsPopup, goldFx. Khi không xoay các hàm trả đúng giá trị gốc nên trang khác không đổi. `pier.html`/`boot.css` dùng `--fw/--fh` (px thật của khung) thay vw/vh.
- **Toàn màn hình:** `core/fullscreen.ts` (`enterMobileFullscreen`): chỉ thiết bị cảm ứng; xin cho cả `documentElement` ngay trong lần bấm CHƠI/Google (`BootScreens` tham số `onGesture`), rồi khoá ngang `screen.orientation.lock('landscape')` (Android Chrome; khoá được thì không cần xoay CSS). Nút Google: mở popup đăng nhập trước rồi mới xin toàn màn hình. `armFullscreenRetry`: nếu popup làm mất quyền/thoát toàn màn hình thì lần chạm kế tiếp bật lại, một lần. iPhone Safari không có Fullscreen API: bỏ qua (cần PWA, chưa làm).
- **Kiểm tra:** tsc, eslint, vitest 345 qua (thêm `viewFrame.test.ts`). Trình duyệt giả lập Pixel 8 375×812: body `rotate(90deg)`, canvas 667×375 đúng khung, màn đăng nhập xoay đúng (đỉnh về bên phải), nút Google bấm trúng đúng chỗ (`elementFromPoint`), không lỗi console. **Chưa kiểm:** chạm vào map/joystick/thanh kéo trong hồ khi đang xoay (phải đăng nhập Google để vào hồ), cỡ canvas khi vào toàn màn hình thật, popup Google có làm mất toàn màn hình không, bàn phím ảo. Cần thử trên điện thoại thật.
- **Rủi ro biết trước:** nếu Chrome tính `requestFullscreen` và `window.open` cùng dùng một lần chạm thì nút Google có thể chưa vào toàn màn hình ngay (đã có lần chạm thứ hai bù).

## Sửa pier và bot (2026-11-16, feedback)
- **Nhà Marlin's:** khối mái + tường gỗ (cột 90–107, hàng 3–18 của lưới 8 px) chặn hẳn; hiên trước cửa chỉ chặn tới vạch đỏ (hàng 19–24, tới y=200); từ hàng 25 trở xuống đi qua được (feedback 2026-11-16, lần chỉnh cuối). Bảng menu và các ô khác không đổi.
- **Dock giữa (ảnh 2):** bỏ 11 ô chặn thừa trên ván không có vật nào (cạnh ghế đẩu, trên đầu thùng) và mở thêm hàng 35 cột 81–83 để ghế 28 có chỗ đứng tới được (trước đó nằm trong túi kín).
- **Bot ngồi ghế:** Client mock (`findRoute` trong `botWalk.ts`) và Server (`BotMap.FindRoute`) tìm đường vòng qua vật cản tới chỗ đứng cạnh ghế; không có đường hoặc kẹt thì bỏ ghế, không dịch chuyển lên ghế như trước. Map pier của bot ở `server/.../Bots/pier-map.json` phải sửa cùng `fishingPierMap.json`.
- **UI:** ô Sổ tay trong menu dùng `Icon So tay.png`; con cá thanh loading lật ngang.
- **Kiểm tra:** vitest 288 qua (thêm test đường đi, kể cả mọi ghế pier tới được từ spawn); Server test bot qua. Chưa xem trực tiếp trong game.

## Bot: chống đứng yên và không trùng vị trí (2026-11-17, yêu cầu)
- **Nguyên nhân kẹt tìm được (chưa chứng minh là cái đã gặp trên server thật):** map có vùng đi lại chính 8017 ô lưới 8 px và 4 cù lao tách rời (một cù lao 149 ô quanh (872,624), ba ô nhỏ); bot lọt vào đó thì không có đường ra, vòng đời chỉ còn dạo vô ích và bỏ lượt ngồi. Ngoài ra bot đi dạo theo đường thẳng nên hay đụng nước/vật cản và đứng gần như tại chỗ. Server cũ chạy 17 giờ không có log để kết luận thêm; đã bật lại với log Debug để theo dõi.
- **Server (`Modules/Bots`):** `BotMap` tính vùng chính từ spawn (`IsInMainArea`); `RandomStandable` và mọi điểm bot chọn chỉ lấy trong vùng này. Bot đi dạo bằng `FindRoute` (đường vòng) thay vì đường thẳng. **Watchdog:** `BotAgent.StalledFor` + `BotManager.RestartStalledAsync` (mỗi nhịp của `BotDirector`) khởi động lại vòng đời bot không có tiến triển quá 150 giây, đưa bot về vùng chính nếu đang ở cù lao.
- **Không trùng vị trí:** điểm dừng cuối (đích đi dạo, chỗ đứng cạnh ghế, chỗ đứng sau khi rời ghế) phải cách mọi người trong phòng và chỗ bot khác đã đặt (`BotSpots`) ít nhất `MinSpotGap` = 24 px. Đang nghỉ mà có người đi tới đứng chồng lên thì bot đi sang chỗ khác ngay; tới nơi mà chỗ vừa bị chiếm thì chọn chỗ khác. Ghế vẫn do SeatSessions bảo đảm duy nhất.
- **Bị chặn giữa đường (yêu cầu 2026-11-17):** bot chưa tới đích mà vị trí đổi chưa tới 2 px trong 0,5 giây (kể cả khi vẫn "bước" lắc sát vật cản) thì bỏ điểm đó, random điểm khác rồi đi tiếp, tối đa 4 lần mỗi chặng, không nghỉ giữa các lần chọn lại (Server `MoveToAsync`/`RoamAsync`). Đang đi tới ghế mà bị chặn thì bỏ ghế, quay về dạo. Mock: 5 nhịp 100 ms liên tiếp không đổi vị trí (`BOT_STUCK_TICKS`), trước đây là 30 nhịp.
- **Lỗi hai người chồng một ghế (2026-11-17, server thật):** nguyên nhân là bot "ngồi ma". Khi Server kết thúc phiên ngồi của bot (hết vé, bị watchdog khởi động lại, lỗi giữa chừng), vị trí bot vẫn nằm ở toạ độ ghế; DB báo ghế trống nên người thật hoặc bot khác ngồi vào đúng chỗ đó. Đã sửa: `BotAgent.LeaveSeatSpotAsync` đưa bot ra chỗ trống gần ghế (đi bộ, bị chặn thì đặt thẳng) trong mọi đường thoát, và kiểm tra phiên còn sống trước mỗi lượt câu; bot không chọn ghế có người đứng sát vị trí ghế và kiểm lại ngay trước khi ngồi. `SeatSessions.SitDownAsync` thêm chốt theo phòng (ghế đã có người ngồi trong phòng thì `SEAT_TAKEN`) ngoài chỉ mục duy nhất của DB. Không đổi contract. Người thật vẫn đi bộ lên được vị trí ghế đang có bot ngồi (Server không kiểm đi lại), nhưng không ngồi được.
- **Client mock:** cùng luật qua `tooClose`/`SPOT_GAP` và tham số `accept` của `pickWanderTarget`; bot mock tránh vị trí người chơi và bot khác (chưa có vùng chính/watchdog vì mock bot có tự thoát khi kẹt 3 giây).
- **Kiểm tra:** vitest 291 qua, tsc/eslint sạch; Server 13 test bot qua (thêm vùng chính, `BotSpots`, watchdog khởi động lại, bot tránh người đứng đè). Chưa xem trực tiếp trong game.

## Ghế ngồi chơi và ghế dài câu cá (2026-11-18, yêu cầu người dùng)
- **Yêu cầu đã chốt với người dùng:**
  - Ghế quanh bàn ngồi được: đứng gần bấm F để ngồi, bấm F lần nữa hoặc phím di chuyển để đứng. Chỉ để ngồi chơi và chat; tác dụng khác người dùng bổ sung sau.
  - Ghế dài 2 chỗ: người đầu vào nửa gần mình hơn, người sau vào nửa còn lại. Chỗ đã có người thì người khác không ngồi được.
  - Ghế đẩu quanh bàn đi xuyên qua được.
  - 4 ghế dài cạnh nước đi xuyên qua được, mỗi ghế 2 chỗ câu.
  - Bot thỉnh thoảng ngồi một ghế trống ngẫu nhiên.
- **Map (`fishingPierMap.json`, `mapVersion` `pier-3`; bản sao bot `server/.../Bots/pier-map.json` sinh lại từ file này):**
  - `lake.seats` 30 → **38**: `seat-31..38` trên 4 ghế dài cạnh nước. Ghế ngang A (494,38) và B (854,549) nhìn xuống; ghế dọc (432,320) quay phải và (768,288) quay trái ra nước.
  - Mục mới `lake.restSeats` có **28** chỗ (`rest-01..28`): 20 ghế đẩu quanh 5 bàn nhỏ (quay vào bàn) và 2 bàn picnic × 2 băng × 2 chỗ.
  - Trường `bench` gom 2 chỗ của cùng ghế dài. Trường `depth` dùng cho ghế dọc, để người ngồi nửa trên không bị ghế che.
  - Mở 145 ô lưới đi được dưới 20 ghế đẩu quanh bàn và 4 ghế dài cạnh nước. Ghế đẩu câu cá và băng ghế picnic vẫn chặn.
- **Contract (Client + Server cùng sửa, Claude chịu trách nhiệm):**
  - `PlayerView.restSeatId?: string | null` (Server cũ không gửi = không ngồi).
  - Lệnh hub `SitRest { restSeatId, x, y, dir }` và `StandRest {}`. Chỗ đã có người thì `SEAT_TAKEN`; đang ngồi ghế câu thì `ALREADY_HAS_SEAT`; chỗ không có thì `VALIDATION_FAILED`.
  - Server phát `PlayerJoined` cho cả phòng (kể cả người ngồi) khi ngồi hoặc đứng.
- **Server:**
  - Giữ chỗ trong RAM (`RoomPlayer.RestSeatId`, kiểm tra trong hàng đợi phòng nên ngồi tranh chỉ một người được).
  - Tự trả chỗ khi: rời phòng, vào lại hồ, `Move` lệch quá 2 px khỏi chỗ ngồi, hoặc ngồi ghế câu.
  - Cấu hình mới `Lake:RestSeatCount` (mặc định 0). `run-local.ps1`/`run-playtest.ps1`: `SeatCount` 38, `RestSeatCount` 28, `MapVersion` pier-3.
  - Bot: sau mỗi lượt dạo có 30% đi ngồi chơi một chỗ trống ngẫu nhiên trong 15–40 giây (`BotAgent.RestSessionAsync`). Không chiếm suất câu; khi được bảo dừng hoặc khởi động lại thì đứng dậy.
- **Client:**
  - `LakeScene`: F chọn chỗ trống gần nhất giữa ghế câu và chỗ ngồi chơi. Ghế dài tính tầm từ nửa gần nhất (`seatLogic.seatReach`), nên đứng cạnh nửa đã có người vẫn ngồi được nửa còn lại.
  - Viền trắng có thêm trên ghế dài và băng ghế picnic (`PierArt`). Người khác ngồi chơi hiện tư thế ngồi.
  - Mock: `SitRest`/`StandRest`; bot mock 30% đi ngồi chơi 15–40 giây.
- **Kiểm tra:**
  - Client: tsc, eslint, prettier sạch; vitest 332 qua (thêm test map, ghế đôi, mock).
  - Server: build sạch; 9 test `RestSeatTests`, test bot chạy lâu (không bao giờ 2 người một chỗ, bot có ngồi), test map bot 28/38 chỗ.
  - Mock `pier.html?dev=…`: ngồi ghế đẩu và băng picnic, F đứng dậy, chỗ bot đã ngồi báo "Ghế đã có người", bot mock tự ngồi chơi; người ngồi câu ở 4 ghế dài có phao rơi xuống nước.
  - Server thật (khởi động lại bằng `run-local.ps1 -Mode real`, 2026-11-18): snapshot trả `pier-3`, 38 ghế câu và có `restSeatId`. Người chơi bấm F ngồi `rest-01`, F lần nữa đứng dậy. Trong khoảng 2 phút, bot Server ngồi 19 lượt trên 17 chỗ, có lúc 6 bot ngồi cùng lúc, không lần nào 2 người trùng một chỗ. Chưa thử ngồi câu ở ghế dài trên Server thật.
- **Lưu ý:** ghế B có phao rơi sát ống khói thuyền lớn, vẫn trên mặt nước. Người thật vẫn đi bộ lên được chỗ đang có người ngồi (Server không kiểm tra đi lại), nhưng không ngồi được.- 2026-11-18: Server chỉ nạp lại fixture khi `configVersion` đổi (DB giữ bản cũ nên thẻ cá vẫn hiện tên Anh). Đã đổi configVersion thành `v0-test-2026-11-18-fishnames-01` (fixtures + test Server). Server cần khởi động lại để nạp tên cá mới; version này thay luôn version Admin đang bật.
- 2026-11-18 (Client): sửa chớp icon cá/buồn trên đầu người khác (`LakeScene.isFreshIcon`: store giữ mục đã hết hạn nên bị duyệt lại mỗi khi có người câu); Sổ tay cá "Nơi sống" dùng `core/lakeNames.ts` → Hồ Tây; thẻ người chơi, ô Gold và thanh thông báo câu cá chặn bấm xuyên xuống map (`pointer-events: auto`). Vitest 332/332; chưa thử trên trình duyệt.


### Ghế băng cạnh máy bán nước ngồi được (Claude, 2026-11-18, yêu cầu người dùng)

- **Map:** ghế băng `frontBench` tại (56, 80), cạnh 2 máy bán nước và 2 thùng rác, chưa có chỗ ngồi nào. Thêm 2 chỗ ngồi chơi `rest-29` (68, 114) và `rest-30` (93, 114), quay xuống, `bench: bench-rest-a`, cùng cách đặt như ghế câu `seat-31/32` ở ghế băng cạnh nước. `lake.restSeats` còn **30** chỗ, `mapVersion` `pier-4`. Sửa `fishingPierMap.json` và bản sao bot `server/.../Bots/pier-map.json` (bot cũng ngồi được).
- **Cấu hình:** `Lake:RestSeatCount` 28 → 30 và `MapVersion` `pier-4` trong `tools/run-local.ps1` và `tools/run-playtest.ps1`. Chạy tay phải tự đặt hai giá trị này.
- **Kiểm tra:** `pierMap.test.ts` cập nhật (30 chỗ, cho phép hướng `down`), vitest 332 qua. Trên Server thật (`RestSeatCount=30`, `pier-4`): đứng ở (80, 128), hiện phím F, bấm F thì ngồi `rest-29`, thỏ ngồi trên ghế băng.


### Dời ghế câu, xoá cột gỗ (Claude, 2026-11-19, yêu cầu người dùng)

- Người dùng dời hình ghế seat-01, 02, 03, 25, 26, 28, 29, 30 trong `fishingPierMap.json`; Claude căn lại bóng ghế, `by` (= y + 15), chỗ ngồi (x + 7, y + 17) và ô va chạm `walkableRows` (bỏ ô ở chỗ cũ, chặn ô ở chỗ mới). Hàng ghế dưới (seat-26, 29, 28) cùng y = 260. Xoá cột gỗ `woodenDockPillar` (611, 254) cùng bóng và ô va chạm của nó.
- Kiểm tra: vitest 343/343 (gồm `pierMap.test.ts`, `botWalk.test.ts`). Chưa xem bằng mắt. Server thật đọc map bot từ file này khi khởi động nên phải chạy lại Server.
- Lưu ý khi sửa file này bằng editor: sửa rồi lưu từ bản đã mở trước đó sẽ ghi đè thay đổi của người khác (cột gỗ từng bị khôi phục như vậy); tải lại file trước khi sửa.
- 2026-11-19 (tiếp): căn lại seat-10, seat-11 theo hình ghế mới; xoá `smallRaft` (386, 585) cùng bóng; sửa nền ao phía dưới-trái map: bỏ mảng cát giữa ao (ground hàng 36–39, cột 24–29) để ao là một khối nước liền, nối bờ viền phía trên. vitest 343/343. Nền ao chỉ kiểm bằng ảnh dựng lại từ atlas (không phải màn hình game); chưa xem trong game.

### Canvas theo độ phân giải thật của màn hình cảm ứng (Claude, 2026-11-19, yêu cầu người dùng)

- **Nguyên nhân hình mờ/vỡ trên điện thoại:** Phaser 3.90 (`Scale.RESIZE`) không biết `devicePixelRatio`, canvas chỉ có đúng số pixel CSS rồi bị trình duyệt phóng 2-3 lần (kèm `pixelArt` nên ra khối).
- **Sửa (chỉ pier.html, chỉ thiết bị cảm ứng):** `scenes/pier/mobileFrame.ts` vá `scale.getParentBounds` để cỡ game = cỡ CSS x tỉ lệ pixel (tối đa 3, tối đa 3,5 triệu pixel); `pier.html` thêm `#game canvas { width/height: 100% !important }` để canvas thu về đúng khung. Camera tự phóng theo cỡ canvas, toạ độ chạm đã nhân `displayScale` nên không đổi code scene. Máy tính (không cảm ứng) giữ tỉ lệ 1.
- **Kiểm tra:** tsc, eslint, prettier sạch. Giả lập 375x812 với dpr giả 2,6: canvas 1734x975 trong khung CSS 667x375, vào được hồ, chạm đúng vị trí (đã so toạ độ). Chưa xem trên điện thoại thật; độ nét chỉ đo bằng số, ảnh chụp giả lập bị thu nhỏ. Zoom camera vẫn là số lẻ (chưa làm tròn).

### Toàn màn hình chỉ khi vào hồ, chạm lại thì bật lại (Claude, 2026-11-19, yêu cầu người dùng)

- **Đổi so với mục "tự xoay + toàn màn hình" ở trên:** bấm CHƠI/Google không còn xin toàn màn hình. Màn đăng nhập và menu ở chế độ thường. `BootScreens` báo `onGameVisible(true)` khi màn phủ tắt (đã vào hồ) và `(false)` khi quay về đăng nhập/menu/tải; `core/fullscreen.ts` `setFullscreenGuard`: bật thì thử vào toàn màn hình ngay, rồi mỗi lần chạm (`pointerup`) hoặc bấm phím trên trang mà chưa toàn màn hình thì xin lại; tắt thì ngừng. Bỏ `armFullscreenRetry`/`onGesture`. Chỉ thiết bị cảm ứng.
- **Xoay:** không có chế độ dọc. Máy đang dọc thì game xoay sang phải (CSS), máy ngang trái hay phải thì game thẳng; khi đã toàn màn hình thì còn khoá `landscape` (Android Chrome). Phần này đã có từ trước, không đổi code.
- **Kiểm tra:** tsc, eslint, prettier sạch. Giả lập 375x812 (giả `requestFullscreen` để đếm): ở menu 0 lần, vào hồ 1 lần, chạm trong game thêm 1 lần. Chưa thử toàn màn hình thật và khoá hướng trên điện thoại. Lưu ý: vào hồ sau khi tải xong thường đã quá vài giây kể từ lần chạm CHƠI nên lần tự bật đầu có thể bị trình duyệt từ chối; lần chạm đầu tiên trong game sẽ bật.

### Ghế bot sai sau khi build lại, xoá hộp trước nhà Marlin (Claude, 2026-11-19, yêu cầu người dùng)

- **Nguyên nhân ghế sai:** bản sao map cho bot `server/FishingOnline.Api/Modules/Bots/pier-map.json` (nhúng vào Server khi build) cũ hơn `fishingPierMap.json`: 29/38 ghế câu lệch vị trí hoặc hướng (seat-13, 14, 16, 19, 22, 30... ở chỗ khác hẳn) và 30 dòng lưới đi được lệch, vì các lần sửa ghế/collider gần đây (`fix seat pos`, `fix collider`) chỉ sửa file Client. Chạy local bằng Client mock dùng file Client nên đúng; khi build lại Server thì bot ngồi theo bản cũ.
- **Sửa:** sinh lại `pier-map.json` từ `lake` của `fishingPierMap.json` (cùng bộ khoá cũ, bỏ `number`); thêm 2 test trong `pierMap.test.ts` so khớp lưới đi được, spawn, luật di chuyển, chỗ ngồi chơi và từng ghế câu giữa hai file để không lệch lại. **Server phải build/khởi động lại** để bot dùng map mới.
- **Rà ghế phía Client:** 38 ghế câu và ghế đẩu: mỗi ghế đều có ghế đẩu + bóng đúng vị trí (ghế đẩu = điểm ngồi trừ (7, 17)), đáy `by` = y + 15, ô va chạm chân ghế đã chặn. Không phải sửa gì.
- **Xoá hộp:** bỏ `boxOpen` (689, 150) và bóng của nó trong `fishingPierMap.json`, mở 24 ô va chạm 8px (cột 86-89, hàng 19-24). Đã dựng lớp đỏ hiển thị va chạm trong game: hộp biến mất, không còn ô chặn ở chỗ đó, nhà Marlin và ghế đẩu bên cạnh vẫn chặn như cũ.
- **Kiểm tra:** vitest 345 + 2 test mới qua, tsc/eslint/prettier sạch, test Server của bot/chỗ ngồi chơi qua (19 chạy, 34 bỏ qua vì cần DB). Chưa chạy Server thật để xem bot ngồi.

### Viền tên mảnh hơn, va chạm ghế dài, tương tác chỉ bằng F (Claude, 2026-11-19, yêu cầu người dùng)

- **Viền tên/biệt hiệu:** `CharacterView.ts` viền tên 3 → 1,5, biệt hiệu 2 → 1 (hằng `NAME_STROKE_PX`, `TITLE_STROKE_PX`).
- **Va chạm 4 ghế dài có chỗ câu** (`frontBench` (494,38) và (854,549), `rightBench`, `leftBench`): chặn các ô thân ghế trong `walkableRows` (cùng cách ghế băng cạnh máy bán nước: bỏ 8px trên cùng của hình), và chặn thêm 4 ô nhỏ bên phải ghế phải (một ô đứng được bị cô lập, đứng dậy sẽ dịch người chơi vào đó). Ghế đẩu quanh bàn vẫn đi xuyên qua. Sửa test `pierMap.test.ts` (trước đây quy định 4 ghế dài đi xuyên qua được, yêu cầu 2026-11-18, nay đổi theo feedback này). Bản sao bot ở Server sinh lại, test so khớp giữa hai file vẫn qua. **Server cần build lại.**
- **Tương tác (chỉ pier.html):** bỏ chạm/bấm chuột vào ghế (`SeatMarkers` tham số `clickable`) và vào người/bot (xoá `enablePointer`, rê chuột hiện viền). Đứng gần ghế trống hoặc người/bot (tầm 28px, `nearestPlayer` trong `seatLogic.ts`) thì hiện viền trắng và phím F ở đầu nhân vật; cái nào gần hơn thì là mục tiêu. Bấm F: ghế thì ngồi, người/bot thì mở popup thông tin người chơi. Chạm vào phím F (điện thoại) vẫn như bấm F. Trang khác (fishing.html…) giữ nguyên.
- **Kiểm tra:** vitest 350 qua (thêm test `nearestPlayer`, `ghế dài chặn đường đi`), tsc/eslint/prettier sạch. Trong game: đứng cạnh bot thì viền trắng + phím F hiện, F mở popup; trên màn chỉ còn một vật chạm được là phím F; lớp đỏ va chạm phủ thân ghế dài. Chưa thử bằng bàn phím thật hay trên điện thoại, chưa xem hai ghế dài dọc cạnh sông bằng mắt (chỉ qua test).

### Popup thông tin người chơi dùng Notebook.png, rà hiệu ứng popup (Claude, 2026-11-19, yêu cầu người dùng)

- **Nền:** `ui/friends/PlayerInfoPopup.ts` thêm lớp `player-info__panel--notebook` (khung `Notebook.png` 1392x804 thu về 928x536, `friends.css`). Phần giấy rộng x 15..863, y 18..497 nên nội dung nằm gọn trong lề padding (gáy lò xo ở mép phải để trống). Bố cục xếp dọc, mỗi khối trải hết bề ngang (sửa theo feedback cùng ngày): avatar to 144px + tên, level, thanh kinh nghiệm và danh hiệu kéo dài hết bề ngang; lời nhắn là một khối dài và thấp (tối đa 100 ký tự nên 2 dòng); chữ "Khoe cá" (đổi từ "Cá khoe") + 3 ô cá ở dưới; hàng nút/trạng thái kết bạn ở đáy. Nút đóng dời ra góc trên phải khung. Popup Bạn bè (`FriendsPopup`) vẫn dùng khung cũ, chưa đổi.
- **Rà ease:** mọi popup chính (Cửa hàng, Túi đồ, Sổ tay, Xếp hạng, Cá trong ngày, Tài khoản, Cài đặt, Skin, Bạn bè, Thông tin người chơi, vé, kết quả câu cá) đã có hiệu ứng vào/ra. Bổ sung cho các chỗ còn thiếu: `confirmDialog` (kit) hiện/ẩn có fade + pop; toast mặc định (kit) vào có pop và ra có fade; menu chính của HomeHud thêm pop cho bảng (trước chỉ mờ nền); ô vé của HomeHud hiện/ẩn mờ dần; các màn của `BootScreens` (đăng nhập, menu, tải) đổi cho nhau bằng fade.
- **Kiểm tra:** vitest 350, tsc, eslint, prettier sạch. Trong game ở khung 1280x720: bấm F cạnh bot mở popup, mọi chữ và nút nằm trong phần giấy kể cả tên dài, lời nhắn dài và hàng "Muốn kết bạn với bạn / Đồng ý / Từ chối"; đóng có hiệu ứng thu nhỏ. Chưa xem trên điện thoại thật; chưa xem trực tiếp từng hiệu ứng mới (menu, ô vé, màn đăng nhập), chỉ kiểm lớp CSS gắn đúng và không lỗi console.

### Joystick trái + nút hành động phải trên điện thoại (Claude, 2026-11-19, yêu cầu người dùng)

- **Chỉ pier.html và chỉ máy cảm ứng** (`pointer: coarse`): joystick ở góc trái dưới (to 240px trên lớp UI 1920, `pier.css`; tầm kéo tính theo cỡ đế trong `Joystick.ts`) thay phím di chuyển; nút hành động mới `scenes/lake/ActionButton.ts` ở góc phải dưới thay phím F: ảnh phím F + chữ "Ngồi" (ghế câu hoặc chỗ chơi trống), "Thông tin" (người/bot gần) hoặc "Đứng dậy" (đang ngồi chơi); hiện/ẩn mờ dần có nảy, ẩn khi có popup. Bấm nút gọi cùng hàm `interact()` với phím F. Trên điện thoại không còn phím F nhỏ cạnh đầu nhân vật; viền trắng quanh mục tiêu vẫn có. Máy tính giữ nguyên phím F cạnh đầu nhân vật, không có joystick; trang khác (fishing.html) giữ nguyên.
- **Kiểm tra:** vitest 350, tsc, eslint, prettier sạch. Giả lập 375x812 (xoay sang phải): joystick và nút ở đúng góc game; kéo joystick lên/xuống/trái/phải ra đúng hướng đi của game dù đang xoay; đứng cạnh bot thì nút hiện "Thông tin" và bấm mở popup. Chưa thử cảm ứng đa điểm thật (vừa kéo joystick vừa bấm nút) và chưa thử trên điện thoại thật; cỡ nút (84px trên màn 667px) là ước lượng, cần chỉnh theo cảm giác ngón tay.

### Chữ trong canvas mịn như chữ thanh thông báo (Claude, 2026-11-19, yêu cầu người dùng)

- **Đã kiểm tra:** chữ thanh thông báo (DOM) và chữ tên/biệt hiệu trên đầu nhân vật (Phaser) đều là Courier New đậm; khác nhau ở cách vẽ: chữ canvas bị lọc NEAREST do `pixelArt: true` nên vỡ khối. Toàn bộ chữ DOM khác (popup, HUD, menu) vốn đã dùng `--ui-font` = Courier New nên không cần đổi.
- **Sửa (chỉ pier.html):** `entities/smoothText.ts` chuyển texture chữ sang lọc tuyến tính khi trang có bong bóng đầu nhân vật; áp dụng cho tên, biệt hiệu, lời chat trên đầu, icon chữ (!), và chữ trong minigame (`MinigameScene`: khoảng cách, hiệu ứng, chữ bay). Icon chữ ở pier đổi sang Courier New độ phân giải 4. Chữ đã vẽ ở độ phân giải cao nên không mờ. Trang khác giữ nguyên.
- **Kiểm tra:** vitest 350, tsc, eslint sạch; trong game texture chữ của nhân vật có `scaleMode` tuyến tính. Độ mịn chưa so mắt được ở khung nhỏ của trình duyệt này; cần xem trên máy thật.

### Viền biệt hiệu không đều (Claude, 2026-11-19, yêu cầu người dùng)

- **Nguyên nhân:** (1) chữ tên/biệt hiệu vẽ cố định ở độ phân giải 4 rồi bị camera thu nhỏ 3–4 lần (zoom ~1,2 trên máy tính) mà không có mipmap, nên viền chữ nhỏ (biệt hiệu 6px, viền 1px) bị lấy mẫu thưa, chỗ dày chỗ mỏng; (2) lần sửa lọc mịn trước (`smoothText`) không giữ được: mỗi lần Phaser vẽ lại chữ nó tải lại texture với bộ lọc NEAREST (do `pixelArt`) và xoá bộ lọc tuyến tính đã đặt (đo bằng `gl.getTexParameter`: vẫn NEAREST).
- **Sửa (chỉ pier.html):** `smoothText.ts` bọc `Text.updateText` để chữ đánh dấu `smooth` đặt lại bộ lọc tuyến tính sau mỗi lần vẽ; thêm `textResolution(scene)` (zoom camera làm tròn lên, 1–8) và `CharacterView.syncTextResolution()` gọi mỗi khung từ `LakeScene.update`: tên, biệt hiệu, lời chat, icon chữ vẽ gần đúng cỡ hiển thị (đổi cỡ cửa sổ/xoay máy thì vẽ lại, nhấp nháy biệt hiệu dựng lại theo).
- **Kiểm tra:** vitest 350, tsc, eslint sạch; đo GL: bộ lọc tuyến tính (9729) cho cả tên và biệt hiệu, độ phân giải chữ = 2 ở zoom 1,15. Độ đều của viền chưa so được bằng mắt (ảnh chụp của công cụ bị thu nhỏ); cần xem trên máy thật. Độ dày viền giữ 1,5 (tên) và 1 (biệt hiệu), chỉnh được ở `NAME_STROKE_PX`/`TITLE_STROKE_PX`.

### Pháo giấy nổ từ giữa màn hình phủ cả màn (Claude, 2026-11-19, yêu cầu người dùng)

- **Đổi:** khi câu được cá ở pier, pháo giấy không còn bắn từ hai góc dưới (feedback 2026-11-14) mà nổ từ giữa màn hình, bung ra mọi hướng theo hình elip bằng khung màn hình (tới tận mép và góc) rồi rơi xuống. `fishing/confetti.ts`: `burstSideConfetti` → `burstScreenConfetti` (120 mảnh, mảnh 8–14px trên lớp UI 1920), `SIDE_CONFETTI_PEAK_MS` → `SCREEN_CONFETTI_PEAK_MS`; tuỳ chọn `sideConfetti` của `FishingFlow` đổi thành `screenConfetti`. Vẫn nằm dưới thẻ cá và popup cá hiện sau 0,6 giây như cũ. Pháo giữa popup (`burstConfetti`, trang khác) giữ nguyên.
- **Kiểm tra:** tsc/eslint/vitest 350 sạch. Gọi trực tiếp hàm trong game ở khung 1280x720 và dừng hoạt ảnh ở 0,7 giây: mảnh giấy phủ khắp màn hình. Chưa xem cả chuỗi từ lúc câu được cá thật (chỉ gọi hàm), chưa thử trên điện thoại.
