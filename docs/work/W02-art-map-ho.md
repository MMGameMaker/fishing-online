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

### Icon Bạn bè dùng friend icon.png (Claude, 2026-11-19, yêu cầu người dùng)

- Ô "Bạn bè" trong menu chính (`ui/home/HomeHud.ts`) dùng `public/new resources/ui/friend icon.png` (người dùng thêm) thay icon tạm vẽ bằng điểm ảnh. Ảnh gốc 1024x1024 (nền trong suốt) thu về 56px nên đặt lớp `home-menu__icon--smooth` (`image-rendering: auto`) để không bị răng cưa như thu bằng NEAREST. Chấm đỏ lời mời kết bạn giữ nguyên. Kiểm tra trong game: menu hiện đúng icon mới; tsc/eslint/vitest 350 sạch. Nếu người dùng đưa bản 56x56 thì bỏ `smooth: true`.

### Icon Bạn bè to hơn, chấm đỏ nằm trên viền chọn, chấm đỏ có fade (Claude, 2026-11-19, yêu cầu người dùng)

- **Icon:** hình trong `friend icon.png` chiếm ít khung nên trông nhỏ; ở lưới 3 cột (`home-menu__grid--compact`) icon này nay 60px (các icon khác giữ 46px), căn giữa ô. **Chấm đỏ:** `::after` viền cam của ô đang chọn vẽ sau nên đè lên chấm; thêm `z-index: 2` cho `.home-dot`. **Hiệu ứng:** `HomeHud.setDotShown` cho cả chấm ở nút menu và ô Bạn bè: hiện bằng `ui-in-pop` (nảy), ẩn bằng `ui-out-pop` rồi mới gỡ; chấm ẩn sẵn lúc tạo và có tập `shownDots` để không chạy lại hiệu ứng khi số lời mời đổi nhưng vẫn > 0.
- **Các ô bên cạnh:** 6 ô còn lại không đổi (icon 46px, khung, viền chọn). Kiểm tra trong game: ô Bạn bè chọn thì chấm đỏ nằm trên viền cam, icon to hơn; hiệu ứng hiện chấm chạy xong ở opacity 1. Chưa xem hiệu ứng ẩn bằng mắt, tsc/eslint/vitest 350 sạch.

### Chấm đỏ chớp chậm (Claude, 2026-11-19, yêu cầu người dùng)

- Hai chấm đỏ (nút menu và ô Bạn bè) sau khi nảy lên thì chớp chậm liên tục: `home-dot--pulse` (`friends.css`) 1,4 giây/nhịp, mờ xuống 35% và thu về 80% rồi trở lại, `ease-in-out` nên êm. `HomeHud.setDotShown` chuyển từ nảy sang chớp khi hết `ui-in-pop`, bỏ chớp trước khi chạy hiệu ứng ẩn. Kiểm tra trong game: lấy mẫu opacity 0,35–1 theo nhịp; vitest 350, tsc/eslint sạch. Nếu muốn nhẹ hơn hoặc nhanh hơn thì chỉnh `0.35`, `0.8` và `1.4s` trong `friends.css`.

### Hiệu ứng khoe cá: cá lắc, nền theo độ hiếm, vòng lan (Claude, 2026-11-19, yêu cầu người dùng)

- **Chỉ pier.html** (bong bóng đầu nhân vật, `CharacterView.ts`): (1) con cá trong bong bóng lắc ±5° quanh tâm kèm nhấp nhô 1px, `Sine.easeInOut`, lặp tới khi bong bóng ẩn (cả cá khoe bằng icon hạng lẫn cá gửi như emoji); (7) nền bong bóng theo độ hiếm (nhân màu): thường giữ kem, không phổ biến xanh lá nhạt, hiếm xanh dương nhạt, sử thi tím nhạt, huyền thoại vàng; (6) cá từ hiếm trở lên có vòng elip lan ra dưới chân nhân vật (hiếm 2 vòng xanh, sử thi 2 vòng tím to hơn, huyền thoại 3 vòng vàng to nhất), mỗi vòng 1 giây, so le 0,26 giây, mờ dần. Hằng số `RARITY_BUBBLE_TINT`, `RARITY_RIPPLE`, `FISH_WOBBLE_*`. Tween lắc lặp vô hạn nên được gỡ khi bong bóng/nhân vật huỷ (`destroyBubble`).
- **Kiểm tra:** vitest 350, tsc/eslint sạch. Trong game gọi `setHeadIcon` cá huyền thoại: tint `ffe39a`, góc cá dao động quanh -5°, 3 vòng lan vàng ở chân. Chưa xem từng hạng bằng mắt và chưa xem bong bóng trên đầu trong ảnh (khung chụp bị cắt); màu nền/độ đậm vòng cần bạn đánh giá.

### Ảnh cá vừa ô trong bảng Biểu cảm (Claude, 2026-11-19, yêu cầu người dùng)

- Ảnh cá trong ô icon cá của bảng Biểu cảm (`.emoji-panel__fish`) trước 52×40 tràn ra viền ô (ô 64px, viền 12px, lòng ô ~41px). Ở pier nay 36×28 (`pier.css`), `object-fit: contain` giữ tỉ lệ cá. Bảng Biểu cảm và 16 emoji giữ nguyên. Kiểm tra trong game bằng 4 ô cá dựng tạm (mock chưa có cá đã câu): cá nằm gọn trong lòng ô.

### Bỏ hiệu ứng khoe cá 1 + 6 + 7, thêm vệt sáng quét (Claude, 2026-11-19, yêu cầu người dùng)

- **Bỏ** hoàn toàn cá lắc, nền bong bóng theo độ hiếm và vòng lan quanh chân (mục "Hiệu ứng khoe cá: cá lắc, nền theo độ hiếm, vòng lan" ở trên không còn hiệu lực): bong bóng khoe cá về như cũ (nền kem, cá đứng yên).
- **Thêm** vệt sáng chéo quét qua con cá trong bong bóng (cùng kiểu vệt sáng của thẻ cá): `entities/fishSweep.ts` vẽ vệt bằng canvas, cắt theo hình cá, quét từ trái sang phải trong 55% của nhịp 2,4 giây rồi nghỉ, lặp; `CharacterView.showHeadBubble` tuỳ chọn `sweep`; timer và texture của vệt gỡ cùng bong bóng (kể cả khi bong bóng bị thay hoặc nhân vật huỷ). Áp dụng cho cá khoe tự động và cá gửi như emoji. Chỉ pier.html.
- **Kiểm tra:** vitest 350, tsc/eslint sạch. Trong game: bong bóng cá có vệt sáng trắng chéo nằm trong hình cá (ảnh chụp), điểm ảnh sáng của texture vệt đổi theo nhịp rồi về 0 khi bong bóng ẩn. Chưa xem chuyển động liền mạch (khung xem của công cụ chạy chậm), cần bạn xem trên máy thật; độ sáng/độ rộng vệt chỉnh ở `STRENGTH` và `band` trong `fishSweep.ts`.

### Bỏ vệt sáng, nút câu cao lên (Claude, 2026-11-19, yêu cầu người dùng)

- **Bỏ vệt sáng:** xoá vệt sáng trên con cá của bong bóng khoe cá (`entities/fishSweep.ts` và phần nối trong `CharacterView`); tắt vệt sáng của thẻ cá (bỏ `lightSweep: true` ở `LakeScene`, mã trong `CatchCard` giữ lại, bật lại bằng cờ này). Mục "Bỏ hiệu ứng khoe cá 1 + 6 + 7, thêm vệt sáng quét" ở trên không còn hiệu lực phần vệt sáng.
- **Nút câu (hình móc, SPACE) cao hơn:** ở pier mép trên nút cách chân nhân vật 40px thay vì 72px (tuỳ chọn `buttonBelowFeetPx` của `PierFishingOptions`, `FishButton` nhận tham số cùng tên). Trang khác giữ 72px. Áp dụng cho mọi ghế câu của pier. Kiểm tra: giá trị 40 đã vào nút trong game; tsc/eslint/vitest 350 sạch. Chưa xem lại vị trí nút trên từng ghế bằng mắt (cần ngồi ghế và thả cần), nếu cần cao/thấp hơn chỉnh số 40 ở `LakeScene.ts`.

### Cá trong bảng Biểu cảm nghiêng 45° và nền ô theo độ hiếm (Claude, 2026-11-19, yêu cầu người dùng)

- Chỉ pier.html. Ảnh cá nghiêng 45° (`rotate(-45deg)`, thu về 30×22 để sau khi xoay vẫn nằm trong lòng ô 41px). "Fill màu theo độ hiếm" hiểu là tô nền lòng ô (không tô lên chính ảnh cá, vì sẽ mất chi tiết): `SocialUi.renderFishSlots` đặt `data-rarity` cho ô, `pier.css` vẽ `::before` trong lòng ô với màu thường xám kem, không phổ biến xanh lá, hiếm xanh dương, sử thi tím, huyền thoại vàng (biến `--rarity-fill`). Kiểm tra trong game bằng 4 ô cá dựng tạm: ảnh xoay 45°, 4 màu nền khác nhau; tsc/eslint/vitest sạch. Nếu ý là tô màu lên chính con cá thì cần làm lại.

- **Sửa tiếp (cùng ngày):** nghiêng ngược lại cho đầu cá hướng lên trên: `rotate(45deg)` (trước `-45deg` làm đầu cá chúc xuống). Ảnh cá gốc quay đầu sang trái nên xoay theo chiều kim đồng hồ 45° là đầu lên trên bên trái. Chưa xem được rõ ở khung chụp nhỏ.

## Dời ghế câu trước nhà Marlin's và sửa hiệu ứng Gold (Claude, 2026-11-19, yêu cầu người dùng)

- **Dời ghế:** ghế đẩu câu cá `seat-30` (ghế đẩu ở (725,195) trên cầu trước cửa nhà Marlin's) dời sang bờ cỏ trái hồ. Ghế đẩu và bóng ở (436,152), điểm ngồi (443,169), quay phải ra nước, phao rơi ở (489,175) trên mặt nước.
  - Chỗ cũ mở lại chân ghế (cột 90–92, hàng 25–26), vạch hiên nhà giữ nguyên. Chỗ mới chặn chân ghế (cột 54–56, hàng 19–20) như các ghế đẩu câu khác.
  - Sửa cả `fishingPierMap.json` và bản sao cho bot `server/.../Bots/pier-map.json`. Số ghế vẫn 38, `mapVersion` giữ `pier-4`.
- **Hiệu ứng Gold:** đồng xu bay vào ô Gold chỉ chạy khi Gold tăng. Lỗi là `HomeHud` để mốc so sánh `shownGold = 0` lúc mở game, nên lần trừ tiền đầu tiên (vd. mua vé 50 → 30) bị coi là tăng từ 0 lên 30. Nay lấy mốc từ Gold đang hiện.
- **Kiểm tra:**
  - Client: tsc/eslint/prettier sạch, vitest 350 qua (test map: mọi ghế có chỗ đứng, phao rơi xuống nước, đi tới được từ spawn).
  - Server: test bản đồ bot qua. Test này trước đó vẫn đếm 28 chỗ ngồi chơi, nay sửa thành 30 cho khớp `pier-4` (người khác đã thêm `rest-29/30`). Server thật đã khởi động lại để bot dùng map mới.
  - Ảnh dựng lại từ map mới (nền + vật thể từ atlas) khớp ảnh người dùng: ghế nằm trên bờ cỏ trái hồ, chỗ cũ trước nhà trống. Chưa ngồi thử ghế mới bằng nhân vật trong game.
  - **Sự cố playtest (Claude gây ra):** lúc khởi động lại Server bằng `run-local.ps1`, Claude đã tắt nhầm API playtest Production (chạy từ 13:20 qua `run-playtest.ps1`, cổng 5080 dùng chung) và thay bằng API dev. API dev không nhận tên miền Tailscale (`AllowedHosts`), nên link public báo "Không đăng nhập được". Đã chạy lại `run-playtest.ps1 -PublicHost desktop-oohtpvv.tail21ba23.ts.net -SkipInfra` (dùng Postgres portable cổng 55432 + Redis 6379): build lại client, publish API, bật Caddy và Funnel. Đăng nhập qua link public đã vào lại được hồ. **Lưu ý:** máy này đang chạy playtest, nên đừng dùng `run-local.ps1 -Mode real`: nó tranh cổng 5080 với playtest.
- **Mở hiên trước nhà Marlin's (cùng ngày, người dùng khoanh trên ảnh):** chỉ mở phần ván hiên trước nửa trái nhà, giữa chỗ ghế cũ và cửa: cột 90–96, hàng 22–24, x 720–775, y 176–199, 21 ô. Phần trước cửa và nửa phải vẫn chặn như cũ. Hình nhà (`fishing-objects/fishShop`, đáy y=202) thêm `"d": 176` (chân tường gỗ), để người đứng trên hiên vẽ đè lên nhà chứ không bị che. Đã sửa cả bản map của bot. vitest 350 qua. Đã chạy lại `run-playtest.ps1` và chụp lại lưới chặn để kiểm tra. Lần chạy đầu bằng công cụ chạy nền của agent thì API và Caddy tắt theo khi lệnh kết thúc (link báo 502). Đã chạy lại bằng `Start-Process` tách riêng: API (dotnet) và Caddy chạy từ 16:05, tiến trình cha đã thoát mà vẫn sống, link public ready. Chưa đi thử bằng nhân vật trên hiên.


## Popup Bạn bè: sửa nút không bấm được, bỏ thanh cuộn, nút hết bè, nền Card Art (Claude, 2026-11-19, yêu cầu người dùng)

- **Nút Nhắn tin / Đổi cá / Xem / Xoá không bấm được trên Server thật:** nguyên nhân ở client, không ở Server. `FriendsPopup` vẽ lại cả danh sách mỗi khi `lake.players` đổi tham chiếu. Server thật gửi vị trí người và bot liên tục nên nút bị thay mới giữa lúc nhấn và nhả chuột, click không kích hoạt. Bản mock không có người di chuyển nên không lỗi. Nay chỉ vẽ lại khi tập bạn bè đang ở hồ thay đổi (selector trả chuỗi id).
- **Thanh cuộn (khoanh cam):** ẩn (`scrollbar-width: none` và `::-webkit-scrollbar`), vẫn cuộn được bằng lăn chuột / vuốt.
- **Nút Đồng ý / Từ chối (khoanh vàng) bị bè:** ảnh nút (Primary M 400x102, Small 232x68) bị kéo vào ô 84x46. Nay vẽ bằng border-image 9 mảnh, góc và viền giữ tỉ lệ. Áp cho mọi nút `.friends__btn` (cả Nhắn tin, Đổi cá, Xem, Xoá).
- **Nền popup:** `Card Art.png` (304x372) bằng border-image 9 mảnh thay `Secondary L.png`. Chỉ popup Bạn bè; popup thông tin người chơi vẫn dùng Notebook.
- **Kiểm tra:** tsc, prettier, vitest (ui + mock) qua. Trên mock: Xem, Đổi cá mở được; sau sửa danh sách không vẽ lại trong 8 giây. Chưa thử trên Server thật có bot di chuyển, chưa thử Nhắn tin / Xoá bằng chuột thật, chưa xem hàng lời mời ở màn hình thật.


## Hồ hết cá: chặn mua vé, thông báo chạy mỗi 5 giây (Claude, 2026-11-19, yêu cầu người dùng)

- **Contract mới (Server + Client, chỉ cộng thêm, Client cũ/Server cũ vẫn chạy):** `LakeSnapshot.lakeEmpty` (bool, tuỳ chọn, thiếu = còn cá) và sự kiện hub `LakeStockChanged { empty }`.
- **Server:** `Modules/Fishing/LakeStock.cs`. Hết cá = đã có dòng quần thể và mọi loài `Remaining <= 0` (chưa gieo thì không tính hết). `FishingBackground` đo mỗi 2 giây, đổi trạng thái thì phát `LakeStockChanged` cho cả hồ, nên bắt được cả đợt thả của Admin. `LakeCommands.JoinAsync` điền `lakeEmpty` vào snapshot. `dotnet build` qua. **Chưa chạy test Server và chưa build lại/khởi động lại Server đang chạy**: Server thật chưa có phần này tới khi build lại.
- **Client (chỉ pier.html):** `SeatUi.openBuyTicket` khi hết cá thì hiện toast "Hồ đã hết cá rồi! Các chiến hữu quay lại sau nhé!" và không mở popup mua vé. Thanh thông báo đỏ khi hết cá bỏ tin người câu trúng, chạy dòng "Cá đã trốn sạch rồi! ..." một lượt rồi nghỉ 5 giây (`CatchBanner.setNotice`), có cá lại thì gỡ. Tin khoe cá vẫn vào chat như cũ.
- **Mock:** `MockBackend.setLakeEmpty(bool)`, `?mockEmpty=1`, và `__mockBackend.setLakeEmpty(true)` trong console khi dev.
- **Kiểm tra:** tsc, eslint, vitest 350 qua. Trên mock: bật hết cá thì thanh chạy dòng mới, bấm "Mua thêm" ra toast và không mở popup; tắt hết cá thì popup mở lại. Chưa thử trên Server thật; chưa đo thời gian chạy một lượt dòng chữ trên thanh.


## Vé tối đa 10, +10/-10 nhảy theo bội số 10, hiệu ứng nhấn mọi nút (Claude, 2026-11-19, yêu cầu người dùng)

- **Quyết định đã duyệt (người dùng):** vé tối đa mỗi lần mua nâng từ 6 lên 10. Sửa `ticketPricing.maxUnitsPerPurchase` = 10 trong `docs/v01/fixtures/gameplay-config.v0.json`, `MAX_UI_DURATION_UNITS` = 10 (client), `configVersion` đổi thành `v0-test-2026-11-19-ticket10-01` ở fixture, `minigame-vectors`, `api-samples` và các test Server dùng chuỗi này (Server chỉ nạp lại fixture khi `configVersion` đổi). `priceVersion` giữ nguyên. Cập nhật `SPEC_CHUNG.md` mục vé, test `GameplayConfigJsonTests` (10) và `LakeTests` (số lượng 11 bị từ chối).
- **Server cần khởi động lại** để nạp config mới; version này thay luôn version Admin đang bật (như lần đổi tên cá 2026-11-18).
- **Popup vé:** `+10` nhảy tới bội số 10 kế tiếp (1 → 10 → 20…, kẹp ở tối đa), `-10` về bội số 10 phía dưới (20 → 10, 10 → 1 là tối thiểu).
- **Hiệu ứng nhấn:** `pier.css` thêm quy tắc chung cho mọi `button` và `[role=button]` trên pier.html: đè thì thu về 0.93 (`scale`, 0.06s), nhả thì nảy lại (0.14s). Dùng thuộc tính `scale` riêng và `:where()` (độ ưu tiên 0) nên không đụng `transform` của nút và không đè transition nút đã có.
- **Kiểm tra:** tsc, vitest client 350, test Domain 156 qua; test Api build qua nhưng chưa chạy (cần DB). Trên mock: +10 từ 1 ra 10, -10 về 1, MAX 10, MIN 1. Chưa nhìn bằng mắt hiệu ứng nhấn, chưa thử trên Server thật.

## NPC gấu trúc mở Sổ tay cá (Claude, 2026-11-20, yêu cầu người dùng)

- **Yêu cầu:** con gấu trúc (thân `bear-panda` trong atlas cosmetics, một trong 5 con GD để dành) đứng ở chân trái hải đăng, có va chạm; đứng gần bấm F thì mở Sổ tay cá.
- **Map:** `lake.npcs` mới trong `fishingPierMap.json` (`codex-panda`, skin `npc_panda`, tên "Gấu Trúc", chân (262, 334), nhìn xuống, `action: "codex"`). Chặn 3×2 ô đi dưới chân (cột 31–33, hàng 40–41) ở map client và bản copy bot `server/.../Bots/pier-map.json` (bot không đi xuyên). `mapVersion` giữ `pier-4`. File map client được ghi lại bằng `JSON.stringify(…, 2)` nên có thể lệch định dạng với lần sửa trước của người khác (nội dung không đổi ngoài 2 chỗ trên).
- **Art:** `tools/bake_outfit_skins.mjs` thêm `NPC_SKINS` và cờ `--only=<id>`; bake `public/assets/characters/npc_panda.{png,json}`; `BAKED_NPC_SKINS` trong `characterArt.ts`.
- **Client:** `LakeScene` dựng NPC (chỉ pier.html), mục tiêu F mới `npc` (tầm 32px, so với ghế/người cái nào gần hơn), viền trắng khi là mục tiêu, nút hành động điện thoại ghi "Sổ tay cá"; `HomeHud.openCodex()`. NPC không đi qua Server.
- **Dev:** `pier.html?mockLogin` (chỉ bản dev + mock) bỏ qua Google để kiểm tra trong trình duyệt của app.
- **Kiểm tra:** tsc/eslint sạch, vitest 353 (thêm test NPC chặn chân và đứng cạnh được), test Bot của Server 44/44. Trên mock: gấu trúc đứng đúng chân trái hải đăng, không đứng chồng lên được, bấm F mở Sổ tay (hiện đủ 20 loài theo config mới). Chưa deploy (người dùng tự deploy).
- **Thêm cáo bán cá (cùng ngày):** NPC `sell-fox` (skin `npc_fox` bake từ thân `fox-red`, tên "Cáo") đứng ở đầu cầu gỗ cạnh thùng hàng phía trên thuyền nhỏ, chân (772, 541), chặn cột 95–97 hàng 66–67. Bấm F mở Cửa hàng ở tab Bán cá (`NpcAction` `sellFish`, `HomeHud.openSellFish()`); nút hành động điện thoại ghi "Bán cá". Test map kiểm cả 2 NPC (chặn chân, có chỗ đứng trong 24px). Đã thử trên mock: F cạnh cáo mở đúng tab Bán cá. Vitest 353, test Bot Server qua.
- **Cáo ngồi phiến đá, tên xanh dương (người dùng duyệt ảnh thử, cùng ngày):** phiến đá `evernite-cathedral/Assets/Stone-Slab-1` (37×22) xuất ra `public/assets/props/stone-slab.png` bằng `tools/export_props.mjs` mới. NPC có thêm `sit`, `nameColor`, `prop` (ảnh + góc trên-trái); cáo: điểm ngồi giữ (772, 541), đá ở (753, 523), vẽ ngay dưới cáo (depth y − 0.5), tên `#5ab8ff`. `CharacterView` thêm tuỳ chọn `nameColor` và `showRod: false` (NPC không cầm cần). Collider mở rộng theo đá: cột 94–98, hàng 66–67 (client + bot Server). Vitest 353; xem trên mock: cáo ngồi mép trước đá như ảnh duyệt, đứng trước đá bấm F được. Tên NPC ngồi vẫn đặt theo đỉnh đầu lúc đứng nên cách đầu hơi xa (giống người chơi ngồi ghế).
- **Cáo nhún liên tục (cùng ngày):** `CharacterView.startBob()` (NPC `bob: true`) nhún như thở: mỗi nhịp hạ nhanh (260–380ms, Sine out) rồi lên chậm (520–760ms, Sine in-out), sâu 0,3–0,55px (≈1px màn hình), nghỉ ngẫu nhiên 0,1–0,7s, ~1/4 số lần nhún đôi; người dùng lần lượt bỏ kiểu 3 nhịp rồi nghỉ, kiểu đều đều, và bảo nhẹ lại có easing. Chỉ thân và viền nhún, tên và phiến đá đứng yên.
- **Bỏ nhún, đổi chỗ 2 NPC (cùng ngày, người dùng yêu cầu):** gỡ toàn bộ code nhún (`startBob`, cờ `bob`). Cáo mang phiến đá ra chân trái hải đăng: điểm ngồi (252, 344), đá ở (233, 326), chặn cột 29–33 hàng 41–43. Gấu trúc đứng ở đầu cầu gỗ: chân (772, 541), chặn cột 95–97 hàng 66–67. Trả lại các ô cũ không còn dùng (hàng 40 cột 31, hàng 41 cột 31–33; cột 94 và 98 hàng 66–67). Client + bot Server. Vitest 353; xem trên mock: cáo ngồi đá cạnh hải đăng, gấu trúc đứng đầu cầu.
- **Dời cáo lên và sang phải (cùng ngày):** điểm ngồi (260, 338), phiến đá (241, 320), chặn cột 30–34 hàng 40–42 (trừ chân tháp vẫn chặn); trả ô chặn cũ. Client + bot Server, test map qua.
- **Cáo đứng sát cửa tiệm Marlin's (cùng ngày, người dùng yêu cầu):** bỏ phiến đá và tư thế ngồi; chân (791, 202) ngay trước cửa, chặn cột 97–99 hàng 24–25. Trả hết ô chặn của phiến đá ở chân hải đăng (lưới quanh hải đăng về như trước khi có NPC). Code `sit`/`prop`, ảnh `assets/props/stone-slab.png` và `tools/export_props.mjs` còn giữ nhưng không NPC nào dùng. Client + bot Server; xem trên mock: cáo đứng giữa cửa, đứng trước cáo bấm F được.
- **Dọn đồ kê (cùng ngày, người dùng đồng ý xoá):** xoá `public/assets/props/stone-slab.png`, `tools/export_props.mjs`, trường `sit`/`prop` của NPC và phần vẽ đồ kê trong `LakeScene`. Giữ `nameColor` (tên Cáo xanh dương) và `showRod: false`.
- **Cáo sát cửa hơn (cùng ngày):** chân (795, 196), lên 6px và sang phải 4px, đứng trong khung cửa; ô dưới chân (hàng 23–24, cột 98–100) vốn là va chạm của tiệm; trả hàng 25 cột 97–99 cho đi lại. Người chơi đứng ngay trước cửa bấm F được.
- **Hạ tên NPC (cùng ngày):** trường mới `nameOffsetY` trong `lake.npcs` (CharacterView `nameLowerPx`) hạ tên, biệt hiệu, bong bóng và icon trên đầu xuống N px. Cáo `nameOffsetY: 4`. Người dùng tự dời cáo tới (793, 189) (trong vùng va chạm sẵn của tiệm).


## Thẻ cá đóng bằng chạm bất kỳ đâu (Claude, 2026-11-21, yêu cầu người dùng)

- Pier: thẻ "câu được cá" đóng bằng chạm/bấm chuột vào bất kỳ đâu, kể cả lên thẻ (sau 400ms chống bấm nhầm như cũ). F và Space không còn đóng thẻ (thay quyết định 2026-11-14), nhưng vẫn bị chặn khi thẻ mở để không ngồi/đứng dậy hay quăng cần. Ghi chú trong thẻ đổi thành "Chạm vào bất kỳ đâu để đóng". Tùy chọn `closePopupByKey` đổi tên thành `closePopupAnywhere` (`FishingFlow`, `LakeScene`). Trang khác giữ "Chạm ra ngoài để đóng".
- **Kiểm tra:** vitest 350 qua. Giả lập điện thoại 375x812 (`pier.html?mockLogin`, mock): dựng lần câu thành công giả, thẻ hiện, hint đúng, F/Space không đóng, chạm giữa thẻ thì đóng. Chưa thử trên điện thoại thật, chưa thử qua Server thật.


## Biển OPEN hình cá thành đèn neon Hồng Kông (Claude, 2026-11-21, yêu cầu người dùng)

- Biển nằm sẵn trong ảnh nhà Marlin's (`fishing-objects/fishShop`), không có sprite riêng. `scenes/pier/NeonSign.ts` đọc điểm ảnh vùng biển từ atlas (canvas) rồi dựng các lớp chồng đúng lên ảnh gốc: viền ống đèn xanh lơ (cộng sáng), thân cá (xanh lơ rất nhẹ), và 5 chữ/cụm chữ hồng vẽ đè (blend thường, vì cộng hồng lên chữ kem ra trắng). Mỗi lớp có quầng sáng mờ (blur, lọc tuyến tính, cộng sáng). `PierArt.createObjects` gọi khi gặp vật thể này; chỉ pier.html.
- Chuyển động (Sine, không giật): quầng sáng thở 1.9s; từng chữ chập chờn riêng 2–4 nhịp rồi nghỉ 1.8–7s; thỉnh thoảng (9–20s) cả biển sụt sáng rồi bật lại. Độ sáng mỗi khung = gốc × hệ số thở × chập chờn × sụt sáng (tween chỉ đổi hệ số, không tranh nhau `alpha`).
- **Kiểm tra:** tsc, eslint, prettier, vitest qua. Phóng camera 6x xem biển: chữ OPEN hồng trên thân cá viền xanh lơ. Đo 12 giây ở 60 khung/giây: các chữ dao động 0.12–1, viền sụt xuống 0.16 lúc sụt sáng. Chưa xem trên điện thoại thật; màu và độ sáng là ước lượng của tôi, chưa có ảnh tham chiếu.


## Biển neon: bỏ hoạ tiết dưới chữ N, chữ to hơn (Claude, 2026-11-21, yêu cầu người dùng)

- Thứ nằm dưới chữ N không phải chữ mà là hoạ tiết đuôi cá (thanh ngang + hai ô vuông). Nay che bằng màu thân cá (lớp tĩnh `neon-sign-cover`, cùng che chữ gốc) rồi vẽ lại bốn chữ O-P-E-N phóng 1.25 lần quanh tâm, dàn đều lại trên thân cá (`LETTER_TARGET_Y`). Chữ phóng dùng lọc tuyến tính nên cạnh vẫn mịn. Chữ tắt thì để lộ màu thân cá (bóng neon tối), không còn chữ kem gốc.
- **Kiểm tra:** tsc, eslint, prettier, vitest qua; xem camera 6x: chỉ còn OPEN hồng, không còn hoạ tiết dưới N. Chưa xem trên điện thoại thật.


## Biển neon: chữ hết mờ, vẽ theo lưới điểm ảnh (Claude, 2026-11-21, yêu cầu người dùng)

- **Lỗi:** bản trước phóng chữ 1.25 lần với lọc mịn nên chữ mờ và lệch lưới điểm ảnh so với phần còn lại. **Sửa:** bỏ phóng; bốn chữ O-P-E-N vẽ tay bằng điểm ảnh nguyên (7 cột x 6 hàng, nét đậm 2px, cách nhau 2 hàng, cột 178..184, hàng 113..142; `GLYPHS` trong `NeonSign.ts`), đặt đúng lưới ảnh gốc, lọc NEAREST như sprite khác. Vẫn che chữ gốc và hoạ tiết dưới N bằng màu thân cá. Quầng sáng và chập chờn giữ nguyên.
- **Kiểm tra:** tsc, eslint, prettier, vitest qua; camera 14x: chữ sắc, thẳng hàng, không mờ. Chưa xem trên điện thoại thật.


## Biển neon: bỏ bóng chữ xanh, thu chữ hồng nhỏ lại (Claude, 2026-11-21, yêu cầu người dùng)

- **Bóng chữ xanh nhạt có hai nguyên nhân:** (1) lớp che chỉ phủ điểm ảnh gần trắng nên các tông kem/tím nhạt của chữ gốc vẫn lộ; nay che kín cả vùng trong thân cá (cột 177..185, hàng 112..142). (2) Chữ đang chập chờn còn 12% hồng nên lộ bóng; nay tắt hẳn (alpha 0, quầng 0.15).
- **Chữ hồng nhỏ lại:** 7 cột x 5 hàng (trước 6 hàng), cách nhau 2 hàng, hàng 115..140.
- **Kiểm tra:** tsc, eslint, prettier, vitest qua; camera 14x lúc mọi chữ sáng: chỉ còn OPEN hồng, không còn bóng chữ xanh. Chưa xem trên điện thoại thật.


## Gỡ biển neon OPEN (Claude, 2026-11-21, yêu cầu người dùng)

- Người dùng bảo xoá phần neon. Đã xoá `scenes/pier/NeonSign.ts` và chỗ gọi trong `PierArt.createObjects` (cùng hằng `NEON_SIGN_FRAME`); biển OPEN trở lại đúng ảnh gốc của nhà Marlin's. Các mục "Biển OPEN... neon" phía trên chỉ còn là lịch sử, không còn trong mã.
- **Kiểm tra:** tsc, eslint, prettier, vitest qua; không còn chỗ nào nhắc `NeonSign`.
- 2026-11-21 (Client, map): thêm bảng tin `main-objects/news-board` (+ bóng) tại (171, 275) cạnh biển Marlin, bỏ cây sáng `lightTree` ở (119, 251) (cả bóng). Collider bảng: 2 hàng ô y 336–351, x 168–287; trả lại các ô thân cây cũ. Sửa cả `fishingPierMap.json` và bản sao bot `Bots/pier-map.json` (cùng `walkableRows`), `mapVersion` vẫn `pier-4`. Vitest 353 qua; test Bot của Server bị Skipped (cần môi trường), chưa xem trên trình duyệt.


## Phím F đặt ở góc trên bên phải vật được chọn (Claude, 2026-11-21, yêu cầu người dùng)

- Trước: phím F cạnh đầu nhân vật mình (bên trái). Nay đi theo vật đang được chọn (cùng vật có viền trắng): `SeatPrompt.update(anchor | null)` nhận điểm đáy-giữa của phím, `LakeScene.promptAnchor` tính theo loại mục tiêu. **Ghế** (câu/ngồi chơi): lệch (+15, -17) so với điểm ngồi (điểm ngồi nằm dưới chân ghế đẩu khoảng 9px), tức góc trên bên phải ghế. **Người/bot và NPC**: bên phải đầu (+20, headY +14), dưới nhãn tên. Không còn đặt theo đầu nhân vật mình. Điện thoại vẫn dùng nút hành động góc phải thay phím này.
- **Kiểm tra:** tsc, eslint, prettier, vitest qua. Trên mock: đứng cạnh ghế seat-01 thì phím nằm góc trên bên phải ghế; đứng cạnh NPC cáo thì phím bên phải đầu. Chưa thử ghế ngồi chơi (băng ghế) và người/bot di chuyển bằng mắt, chưa thử điện thoại thật.
- **Chỉnh tiếp (cùng ngày):** phím F ở ghế cao thêm 6px, lệch dọc từ -17 thành -23 (`SEAT_PROMPT_DY`). Người/bot và NPC giữ nguyên. Chưa xem lại bằng mắt sau chỉnh này.
- **Chỉnh tiếp (cùng ngày, người/bot/NPC):** phím F lệch (+26, headY -2) thay vì (+20, headY +14), tức bên phải và ngang đầu (cao hơn ~16px), cạnh nhãn tên chứ không còn dưới nhãn. Xem trên mock với bot Hà My: phím nằm ngay bên phải nhãn tên. Chưa thử tên/danh hiệu rất dài, chưa thử điện thoại thật.
- 2026-11-21 (Client, map, sửa lại bảng tin): bảng dời sang (140, 255), đáy ngang chân ngọn hải đăng (by 327), nằm bên trái tháp. Xoá 5 ô nền còn vẽ sẵn gốc rễ cây cũ (`ground[19][9]`, `[19][11]`, `[20][10]`, `[20][11]`, `[21][11]` → ô cỏ 2). Bóng đổ riêng nghiêng phải, ra phía sau: ảnh `public/assets/props/news-board-shadow.png` (sinh từ silhouette bảng, nén dọc 0,55 và nghiêng 0,45) + `PierObject.image` mới trong `pierMap.ts`/`PierArt.ts`. Collider: 2 hàng ô y 312–327, x 136–255 (liền với collider tháp), bỏ dải cũ ở y 336–351. Cập nhật cả `Bots/pier-map.json`. Vitest 353 qua; chưa xem trên trình duyệt thật.
- **Chỉnh tiếp (cùng ngày, người/bot/NPC):** phím F căn giữa theo dòng tên và nằm bên phải khối tên/biệt hiệu (cách mép chữ rộng nhất 10px tính tới tâm phím), thay vì lệch cố định theo đầu. `CharacterView.nameAnchor` trả tâm dọc dòng tên và nửa bề rộng khối tên; `LakeScene.promptAnchor` dùng hằng `PERSON_PROMPT_GAP` và `PROMPT_KEY_H`. Xem trên mock với bot Võ Thành: phím ngang tên, sát bên phải. Chưa thử tên rất dài (phím có thể ra sát mép màn), chưa thử điện thoại thật.
- 2026-11-21 (Client, map, lần 3): xoá cây sáng `lightTree` ở (2, 228) (object + bóng) cùng 3 ô nền còn gốc cây (`ground[18][4]`, `[19][3]`, `[19][4]` → ô cỏ 2); biển Marlin `fishingSign` đổi x 93 → 40 (giữ y 303), collider chân biển chuyển sang cột 7–8; bảng tin dời sang x 115 (bóng theo), collider cột 14–28, chừa 3 cột (24px, x 232–255) làm lối đi giữa bảng và tháp. Đã sửa cả `Bots/pier-map.json`. Vitest 353 qua; chưa xem trên trình duyệt thật.
- **Chỉnh tiếp (cùng ngày):** phím F không bám theo người/bot đang đi nữa. `LakeScene.stablePromptAnchor` tính vị trí một lần khi mục tiêu vào tầm rồi giữ nguyên chỗ đó; chỉ tính lại khi mục tiêu đổi (`sameTarget`: người theo id, NPC, ghế theo đối tượng) hoặc mất tầm rồi vào lại. Trên mock: bot đi qua 15 vị trí trong 9 giây mà phím chỉ đổi chỗ 1 lần (lúc mục tiêu đổi khi tôi dịch chuyển nhân vật liên tục để thử). Chưa thử điện thoại thật.
- 2026-11-21 (Client, map, lần 4): ngọn hải đăng (+ bóng) dời sang phải 8px (x 246 → 254). Collider tháp nới ra cả hai bên: cột 32–42 (x 256–343) ở y 296–327 cho khớp thân tháp (x 260–343), trước chỉ 256–327 nên nhân vật đứng chồng lên mép tháp. Sửa lỗi collider chân bảng tin thiếu 1 cột bên phải (cột 14–28, x 112–231, trước chỉ tới 223). Lối đi giữa bảng và tháp vẫn 24px (cột 29–31). Cập nhật cả `Bots/pier-map.json`. Vitest 353 qua; chưa xem trên trình duyệt thật.
- 2026-11-21 (Client, map, lần 5): xoá 2 dấu "(" xám vẽ sẵn ở mép trái tháp (ô nền ô `ground[17][15]` và `[18][15]`, chỉ số 107 → 2). Bóng bảng tin bớt nghiêng (độ nghiêng 0,45 → 0,25), ảnh `news-board-shadow.png` 136×40. Vitest 353 qua; chưa xem trên trình duyệt thật.
- **Hoàn lại và làm mượt (cùng ngày, người dùng thấy bản giữ yên vị trí không ổn):** bỏ `stablePromptAnchor`/`sameTarget`; phím F lại đi theo người/bot như trước. Để mượt hơn, `SeatPrompt` giữ vị trí số thực và trượt về điểm đích theo hàm mũ (`FOLLOW_TAU_MS` = 110ms, dùng `game.loop.delta` nên không phụ thuộc tốc độ khung). Mới hiện, hoặc đích xa hơn 60px (đổi sang mục tiêu khác chỗ) thì đặt thẳng, không trượt ngang cả màn. Không còn làm tròn về số nguyên mỗi khung. **Kiểm tra:** tsc, eslint, prettier, vitest qua. **Chưa đo được độ mượt:** preview chạy ~5 khung/giây lúc thử nên số đo vô nghĩa, và không có bot nào đang đi trong mock. Cần người dùng xem bằng mắt; nếu còn giật thì chỉnh `FOLLOW_TAU_MS` (lớn hơn = mượt/trễ hơn).
- **Phím F là con của vật thể được chọn (cùng ngày, theo yêu cầu người dùng):** thay cho việc cập nhật vị trí mỗi khung (kể cả bản trượt mượt `FOLLOW_TAU_MS`, đã bỏ). `SeatPrompt.update(token, place)`: chỉ khi mục tiêu đổi mới sinh phím mới (`place()` mới được gọi), phím cũ mờ đi rồi huỷ. Người/bot/NPC: phím thêm vào `view.container` ở toạ độ cục bộ do `CharacterView.promptLocal(gap, keyH)` tính (bên phải khối tên, căn giữa dòng tên), nên đi cùng nhân vật do Phaser tự nhân ma trận, không có mã cập nhật. Ghế: đặt ở toạ độ thế giới một lần (ghế đứng yên). Người rời hồ thì container bị huỷ kéo theo phím. Mục tiêu so theo tham chiếu: ghế theo đối tượng ghế, người/NPC theo `CharacterView`.
- **Kiểm tra:** tsc, eslint, prettier, vitest qua. Trên mock: phím là con của container bot; dời container 30,10 thì phím dời đúng 30,10; đổi sang bot khác thì phím mới là con container mới, phím cũ bị huỷ; ghế seat-01 phím đúng (602,49). Hạn chế: phím chung container nên vẽ theo độ sâu của nhân vật đó (người đứng thấp hơn trên màn hình có thể che phím, trước đó phím luôn nằm trên cùng); nếu biệt hiệu hiện muộn thì phím lệch cho tới lần đổi mục tiêu kế. Chưa thử điện thoại thật.
- 2026-11-21 (Client, NPC): thay gấu trúc `codex-panda` bằng tượng bạch tuộc `IgnisOctopusStatue` (npc `codex-octopus`, skin `npc_octopus`, cùng vị trí (772, 541) và collider cũ, `action` vẫn `codex`), tên "Bách Khoa Toàn Cá" cùng màu xanh `#5ab8ff` với Cáo. Cáo đổi tên "Tiệm Tạp Hóa Cần Thủ". Skin `npc_octopus.json/png` (`public/assets/characters/`) dựng tay: 120×180, mọi frame cùng một ảnh tĩnh, chân tại y=140, `headTop` 80; không do `tools/bake_outfit_skins.mjs` sinh. `npc_panda.*` vẫn nằm trong thư mục nhưng không còn nạp (bỏ khỏi `BAKED_NPC_SKINS`). Vitest 353 qua; chưa xem trên trình duyệt thật.
- 2026-11-21 (Client, NPC lần 2): tên hai NPC cao lên 5px (`nameOffsetY` 7 → 2); Cáo hiện 2 dòng "Tiệm Tạp Hóa" / "Cần Thủ" (tên có `\n`, nhãn tên canh giữa); thêm bóng nghiêng phải cho tượng bạch tuộc (`public/assets/props/octopus-statue-shadow.png`, object `custom/octopus-statue-shadow` tại (748, 497), cùng cách làm bóng bảng tin). Vitest 353 qua; chưa xem trên trình duyệt thật.
- 2026-11-21 (Client, bục xếp hạng): xoá chồng 3 thùng `boxClosed` (+ bóng) ở (375–453, 501–583) và các ô collider của chúng. Thêm bục nhận giải `gokart-map-objects/podium` làm NPC tĩnh `rank-podium` (skin `npc_podium` dựng tay như `npc_octopus`) ở (414, 541), cùng y chân với tượng "Bách Khoa Toàn Cá"; tên "Ai Là Trùm Hồ?" cùng màu `#5ab8ff`; bấm F mở Bảng xếp hạng (`NpcAction` mới `leaderboard`, `HomeHud.openLeaderboard()`). Bóng nghiêng phải `podium-shadow.png` tại (379, 522); collider 2 hàng ô y 528–543, x 376–455. Test `chồng thùng` không còn bắt buộc có chồng thùng; `pierMap.test` thêm NPC thứ 3. Vitest 353 qua; chưa xem trên trình duyệt thật.
- 2026-11-21 (Client, NPC): màu tên "Bách Khoa Toàn Cá" và bục xếp hạng đổi `#5ab8ff` → `#7DE2D1` (Cáo vẫn `#5ab8ff`); bục đổi tên "Ai Là Trùm Hồ?" → "Hội Quán Cao Thủ".
- 2026-11-21 (Client, NPC): thử màu tên "Bách Khoa Toàn Cá" và "Hội Quán Cao Thủ" = `#FF9F80` (trước `#7DE2D1`); Cáo vẫn `#5ab8ff`.
- 2026-11-21 (Client, NPC): màu tên "Bách Khoa Toàn Cá" và "Hội Quán Cao Thủ" chốt `#C8A2FF`; Cáo vẫn `#5ab8ff`.
- 2026-11-21 (Client, map): thêm bóng nghiêng phải, đổ ra sau cho cả 37 cây (`lightTree`, `darkTree`): ảnh `public/assets/props/tree-light-shadow.png`, `tree-dark-shadow.png` (sinh từ silhouette cây, nén dọc 0,55, nghiêng 0,25, đáy ở chân thân), mỗi cây một object `custom/tree-*-shadow` layer 0.5. 11 cây gần mép nước dùng bản đã cắt phần rơi trên nước (`tree-*-shadow-<x>_<y>.png`). Bóng thân nhỏ có sẵn trong atlas vẫn giữ. Vitest 353 qua; chưa xem trên trình duyệt thật.
- 2026-11-21 (Client, BXH cá ngày): hàng chip hình cá thay bằng thanh chọn loài kiểu xổ xuống (`DailyFishPopup.ts`, `leaderboard.css`): thanh `Infomation/Secondary L.png` hiện hình + tên loài đang chọn (mặc định loài đầu tiên của danh mục), bấm xổ bảng `Panel Art.png` liệt kê mọi loài (hình + tên, cuộn được, loài đang chọn tô cam, mở/đóng có fade, Esc đóng bảng trước, bấm ra ngoài đóng bảng). Ảnh dùng border-image nên co giãn không méo viền. Kiểm tra bằng trang tĩnh dựng lại CSS; chưa thử trong popup thật (cần đăng nhập). Vitest 353 qua.
- 2026-11-21 (Client, BXH cá ngày lần 2): thanh chọn loài hẹp lại 540 → 400px; tab, tiêu đề cột, danh sách và dòng "..." đẩy xuống 14px (tab y 204, tiêu đề 254, danh sách 286..652, "..." 652), dòng của mình giữ y 692 nên khoảng trống phía trên dòng đó gọn hơn.
- 2026-11-21 (Client, BXH cá ngày lần 3): thanh chọn loài và hai tab "Dài nhất"/"Câu sớm nhất" gộp thành một hàng `.rank__bar` (y 148, canh giữa), cùng cao 68px (tab 64px + 4px bóng đáy của thanh). Tab không còn hàng riêng ở y 204; tiêu đề cột (y 254), danh sách (286..652), "..." (652), dòng của mình (692) giữ nguyên. Đã kiểm tra bằng trang tĩnh dựng lại CSS; chưa thử trong popup thật.
- 2026-11-21 (Client, Bảng xếp hạng tuần + BXH cá ngày): đồng hồ và nút đóng cùng cao 76px, cùng top 31; tiêu đề căn giữa (hộp y 20..118, tâm 69) giữa mép trong phía trên và đường kẻ; dòng "..." thay bằng mũi tên xuống (tam giác 24×16, `.rank__gap-arrow`) canh giữa khoảng trống giữa thẻ cuối danh sách và thẻ của mình (tuần: tâm y 667; ngày: danh sách đúng 4 thẻ 286..664, tâm y 678). Đã đo bằng trang tĩnh dựng lại CSS (tâm các phần đầu khung đều y 69); chưa thử popup thật.
- 2026-11-21 (Client, BXH cá ngày lần 4): sửa bảng xổ chọn loài bị cắt nửa dòng ở đáy (khung cao 396px = 6,6 dòng): `max-height` 404px = đúng 6 dòng (6×60 + viền 44), thêm `scroll-snap` theo dòng và làm tròn `scrollTop` khi mở theo bội 60. Dựng thử popup thật (`DailyFishPopup`) với dịch vụ giả trên trang tạm: đầu khung đúng (đồng hồ, nút đóng top 31 cao 76; tiêu đề hộp y 20..118), mũi tên giữa thẻ 4 và thẻ của mình, bảng xổ cuộn tới đáy vẫn đủ 6 dòng.
- 2026-11-21 (Client, BXH): BXH cá ngày đẩy tiêu đề cột và danh sách lên 12px (tiêu đề cột y 242, danh sách y 274..652, mũi tên top 664 tâm y 672). Mũi tên báo còn dòng bên dưới (cả BXH tuần và cá ngày) mờ dần khi kéo tới đáy danh sách và hiện lại khi kéo lên: lớp `.rank__gap--off` (opacity, transition 260ms cubic-bezier(0.4,0,0.2,1)), hàm `updateScrollHint` ở `LeaderboardPopup.ts`; BXH tuần còn trang kế thì mũi tên vẫn hiện. Kiểm tra trên popup thật dựng với dữ liệu giả: lớp bật/tắt đúng theo cuộn (đo độ mờ không chính xác vì trang chạy nền).
- 2026-11-21 (Client, gộp BXH): popup Bảng xếp hạng gộp hai bảng, hai tab "Bảng xếp hạng tuần" (mặc định khi mở) và "Bảng xếp hạng cá" thay tiêu đề, nền `Tab - State Default/Active.png` cắt 9 mảnh như popup Bạn bè, không icon (`.rank__boards`, `.rank__board-tab`). Tách `rankKit.ts` (phần chung + giao diện `RankView`), `WeeklyBoardView.ts` (bảng tuần), `DailyFishView` trong `DailyFishPopup.ts` (cá ngày, giữ các hàm thuần `dailyCountdown` v.v. cho test); `LeaderboardPopup.ts` giữ khung, đồng hồ, tab, nút đóng; chuyển tab mờ dần, tải lại dữ liệu mỗi lần vào tab; Esc đóng bảng chọn loài trước. Xoá `DailyFishPopup` khỏi `HomeHud` và bỏ phím tắt B. Thanh chọn loài ngắn lại 400 → 320px, hai tab tiêu chí sát nhau hơn (khoảng 8px). Selector `.rank--daily` đổi thành `.rank__view--daily`, bỏ `.rank__title`. Kiểm tra trên popup thật dựng với dịch vụ giả: mở ra tab tuần, chuyển tab gọi đúng API cá ngày, đồng hồ theo từng tab. tsc/eslint sạch, vitest 353 qua.
- 2026-11-21 (Client, BXH sửa lần 2): hai tab chuyển bảng chuyển lên TRÊN khung kiểu popup Túi đồ: hàng tab 76px (`.rank__boards`, left 56) rồi thân khung `.rank__body` (812px), panel cao 888px (`PANEL_H` = 812 + `TAB_ROW_H`); tab chưa chọn khung nhỏ 112×68 (Tab - State Default), tab đang chọn dải xanh 272×80 chữ trắng (Tab - State Active); nhãn "BXH Tuần" / "BXH Ngày" (hiện chữ hoa, không icon). Trả lại tiêu đề "BẢNG XẾP HẠNG" ở vùng đầu khung. Thanh chọn loài rộng 376px để vừa tên dài nhất "Cá Bống Tượng" (13 ký tự) không bị cắt. Kiểm tra trên popup thật dựng với dịch vụ giả; tsc/eslint sạch, vitest 353 qua.
- 2026-11-21 (Client, BXH): tab "BXH Ngày" chưa chọn to ra 112×68 → 160×72 để chữ không sát viền.
- 2026-11-21 (Client, map): bỏ bục xếp hạng (NPC `rank-podium`, skin `npc_podium`, bóng `podium-shadow.png`, collider y 528–543 x 376–455; xoá các file ảnh/skin). Bảng tin cạnh ngọn hải đăng thành NPC `rank-board` (skin `npc_board` dựng tay từ `main-objects/news-board`, chân tại (173, 327) = chân bảng cũ): bấm F mở Bảng xếp hạng, tên "Hội Quán Cao Thủ" màu `#C8A2FF`. Bỏ object `main-objects/news-board` (NPC vẽ thay), giữ nguyên bóng riêng và collider chân bảng. Cập nhật `Bots/pier-map.json`. Vitest 353 qua; chưa xem trên trình duyệt thật.
- 2026-11-21 (Client, map): tượng bạch tuộc dời từ (772, 541) ra giữa hồ (chân (616, 406)), không còn là NPC: bỏ NPC `codex-octopus` (hết bấm F mở Sổ tay cá, hết tên "Bách Khoa Toàn Cá"), xoá skin `npc_octopus.*`, vẽ như object tĩnh `custom/octopus-statue` (`public/assets/props/octopus-statue.png`, layer 1, by 406) cùng bóng nghiêng (dời theo, y 362). Trả lại 6 ô collider cũ ở chân tượng cũ thành đi được; chỗ mới là mặt nước nên không cần collider. Test `pierMap.test` bỏ NPC thứ nhất khỏi danh sách; test spawn nâng timeout lên 30s vì đã chậm hơn 5s khi thêm bóng cây. Sổ tay cá vẫn mở được từ menu. Vitest 353 qua; chưa xem trên trình duyệt thật.
- 2026-11-21 (Client, map): hoàn lại tượng bạch tuộc như cũ: NPC `codex-octopus` (skin `npc_octopus` dựng lại từ ảnh tượng) tại (772, 541), bấm F mở Sổ tay cá, tên "Bách Khoa Toàn Cá" `#C8A2FF` hạ 2px, collider 6 ô chân tượng, bóng nghiêng tại (748, 497); bỏ object tĩnh giữa hồ. Cập nhật `Bots/pier-map.json`, `BAKED_NPC_SKINS`, danh sách NPC trong `pierMap.test`. Vitest 353 qua; chưa xem trên trình duyệt thật.
- 2026-11-21 (Client, hiệu ứng chữ tên NPC): thêm `entities/NpcNameFx.ts`, bật bằng trường `nameFx` của NPC trong `fishingPierMap.json` (`LakeNpc.nameFx`). Mỗi chữ cái là một Text riêng (nhãn gốc chỉ ẩn, giữ kích thước cho phím F/icon): chữ lơ lửng chậm (±1,2px, 6s), mỗi 4,8s một đợt sóng chạy qua từng chữ (nảy 2,4px, lệch 70ms/chữ); đứng cách chân NPC ≤ 64px thì phồng +10% kèm cú nhún và sóng dồn (1,9s). Hạt theo chủ đề tối đa 6 cái: bong bóng (Bách Khoa Toàn Cá), xu lật (Tiệm Tạp Hóa/Cần Thủ), sao nháy (Hội Quán Cao Thủ). Hội Quán Cao Thủ treo trên thanh gỗ hai sợi xích, đung đưa ±2° (±3,4° khi đứng gần). Chỉ cập nhật khi NPC trong màn hình (lề 40px). Kiểm tra bằng trang Phaser tạm (canvas) với 3 nhãn thật: chữ, sóng, hạt, biển treo chạy đúng; chưa xem trong game thật (cần đăng nhập). tsc/eslint sạch, vitest 353 qua.
- 2026-11-21 (Client, hiệu ứng tên NPC, sửa lần 2): chữ tên NPC đứng yên (bỏ sóng chữ, lơ lửng, nhún khi đứng gần), bỏ thanh gỗ/xích và đung đưa của "Hội Quán Cao Thủ" (nhãn gốc hiện lại, không ẩn/tách chữ); `NpcNameFx` chỉ còn hạt: bong bóng, sao nháy, và đồng xu dùng đúng `Coin Art.png` (lật bay lên, hiện 9px, nạp texture `npc-fx-coin` lúc tạo NPC) cho "Tiệm Tạp Hóa / Cần Thủ"; đứng gần sinh hạt dày gấp đôi. `nameFx.hanging` bỏ khỏi map/`LakeNpc`. Thử bằng trang Phaser tạm: xu Coin Art bay đúng, chữ yên. tsc/eslint sạch, vitest 353 qua.
- 2026-11-21 (Client, tên NPC, sửa lần 3): hạt của "Bách Khoa Toàn Cá" đổi từ bong bóng (nhìn như chấm lạc) sang CÁ bơi ngang qua phía trên chữ: ảnh cá thật của game (17 loài dáng cá bơi, bỏ Mực/Tôm Hùm/Cá Đuối), rộng 18px, bơi từ mép này sang mép kia trong 2,8s với đường lượn nhẹ, hiện/mờ dần ở hai đầu, tối đa 3 con, 2,2s một con (đứng gần dày gấp đôi); ảnh nạp dần theo lần chọn loài (qua `loadFishTexture`, theo bảng `FISH_ART_FILES`) và lọc tuyến tính. `nameFx.particle` của NPC này là `fish` (bỏ `bubble`). Thử trên trang Phaser tạm với ảnh cá thật: cá bơi đúng phía trên chữ. tsc/eslint sạch, vitest 353 qua.
- 2026-11-21 (Client): tạm tắt hạt quanh tên NPC (`NPC_NAME_FX_ENABLED = false` trong `LakeScene.ts`, dữ liệu `nameFx` và `NpcNameFx` giữ nguyên để bật lại). Bong bóng emoji trên đầu nhỏ lại: ôm theo hình (cạnh trong 21px + viền 3px mỗi cạnh, trước là cả khung 39×0,9 = 35px nên bong bóng 41px còn emoji chỉ ~17px), `EMOTE_BUBBLE_INNER_PX` trong `CharacterView.ts`. Vitest 353 qua; chưa xem trên trình duyệt thật.
- 2026-11-21 (Client, NPC Cáo): Cáo ở cửa hàng chào khi người chơi bước vào vùng bấm F (cách chân ≤ 32px): random 1 trong 8 câu (`greetings` của NPC `sell-fox` trong `fishingPierMap.json`, `LakeNpc.greetings`), hiện bong bóng 6 giây (`CharacterView.say(text, durationMs)`), không lặp lại câu vừa nói. Vào ra liên tục thì không nói liên tục: chỉ nói lại khi đã đủ 10 giây kể từ lần ra cuối cùng (`scenes/lake/npcGreeting.ts`, hàm thuần `stepGreeting` + 5 test). Vitest 358 qua; chưa xem trên trình duyệt thật.
- 2026-11-21 (Client, NPC Cáo): đổi lời chào sang 11 câu mới xưng "Đại vương" (`greetings` của `sell-fox`).
- 2026-11-21 (Client, NPC Cáo): mua hàng thành công ở Cửa hàng (mua cần hoặc skin qua POST /shop/buy) thì Cáo nói ngẫu nhiên 1 trong 12 câu cảm ơn (`purchaseLines` của `sell-fox`, `LakeNpc.purchaseLines`), hiện 6 giây, không lặp liền câu vừa nói. Móc từ `ShopPopup.buyOffer` → `HomeHudOptions.onShopPurchase` → `LakeScene.npcReactToPurchase`. Không nói khi bán cá, nạp Gold hay mua vé. Tách `pickLineIndex` dùng chung với lời chào (`npcGreeting.ts`) + test. Vitest 359 qua; chưa xem trên trình duyệt thật.
- 2026-11-21 (Client, NPC Cáo): đóng Cửa hàng mà không mua cũng không bán gì trong lần mở đó thì Cáo nói ngẫu nhiên 1 trong 12 câu tiếc (`noPurchaseLines` của `sell-fox`, `LakeNpc.noPurchaseLines`), hiện 6 giây, không lặp liền câu vừa nói. `ShopPopup` theo dõi `traded` (mua hoặc bán thành công) và gọi `onClose(traded)` khi đóng → `HomeHudOptions.onShopClose` → `LakeScene.npcReactToLeavingEmptyHanded`. Đã mua thì chỉ nói câu cảm ơn lúc mua, không thêm câu tiếc khi đóng; bán cá xong đóng cũng không nói câu tiếc. Vitest 359 qua; chưa xem trên trình duyệt thật.
- 2026-11-21 (Client): bấm vào thẻ người chơi (ảnh đại diện, tên, EXP, cấp) ở góc trên trái mở hồ sơ (Tài khoản) như ô "Hồ sơ" trong menu; `HomeHud.buildCard`: role button, tabIndex 0, Enter/Space cũng mở; `home.css`: con trỏ bàn tay, sáng nhẹ khi rê chuột, nhún 2px khi bấm. Vitest 359 qua; chưa xem trên trình duyệt thật.

### 2026-11-21 — Bỏ thanh trượt số lượng (slider)
- Gỡ thanh trượt chọn số lượng ở popup Vé câu cá (`TicketDialog.ts`) và popup bán cá trong Shop (`ShopPopup.ts`) cùng CSS `.ticket-dialog__slider/knob`, `.shop-slider/knob`. Vẫn chọn số lượng bằng nút −/+ và 4 ô Ít nhất / Bớt 10 / Thêm 10 / Nhiều nhất.
- Giữ nguyên thanh âm lượng trong Cài đặt (bỏ sẽ mất điều khiển âm thanh) — chờ Zen xác nhận có bỏ không. Thanh cuộn (scrollbar) của danh sách không đụng.
- Kiểm tra: tsc, eslint sạch; vitest 359 pass. Chưa xem trực quan vị trí nút −/+ sau khi bỏ thanh (khoảng trống giữa hai nút).

- Ẩn thanh cuộn danh sách Thành tựu trong popup Tài khoản (`profile.css` `.profile__ach`, vẫn cuộn được bằng chuột/chạm).

### 2026-11-21 — Cáo nói khi nhận cá bán
- Thêm `sellLines` (15 câu) cho NPC `sell-fox` trong `fishingPierMap.json`; ShopPopup gọi `onSell` sau mỗi lần bán cá thành công -> HomeHud `onShopSell` -> LakeScene `npcReactToSell` (random, không lặp liền câu). Kiểm tra: tsc/eslint/vitest. Chưa thử trong game.

### 2026-11-21 — Hộp Đổi danh hiệu
- Nền hộp đổi bằng `Rank/Leaderboard Panel.png` (9-slice, tiêu đề nằm trong phần đầu có đường kẻ), class `profile-dialog__box--panel` (`ProfilePopup.openDialog` thêm tham số `boxClass`, chỉ áp cho Đổi danh hiệu); ẩn thanh cuộn danh sách danh hiệu. Đã xem bằng trang preview tạm (đã xoá); chưa xem trong game thật.

### 2026-11-21 — Popup Vé câu cá
- Tiêu đề 40→52px, mô tả 21→28px (rộng 500px); hàng giá (số vé + xu + tổng) đưa lên cùng hàng với nút −/+ (top 430, giữa hai nút) và to hơn (28px, xu 36px). Chưa xem trong game.

### 2026-11-21 — Lightsweep vé câu cá + xu của Cáo
- Ảnh vé (TicketDialog) có ánh sáng quét ngang lặp 3,2s: lớp `.ticket-dialog__art-sheen` dùng chính ảnh vé làm mặt nạ (chỉ sáng trong hình vé). Đã xem bằng trang tạm (đã xoá). Gỡ hẳn code Slider.png không còn dùng.
- Cáo: mua hoặc bán thành công thì `spawnCoinBurst` (NpcNameFx.ts) bắn chùm 9 đồng xu Coin Art quanh tên, tung vòng cung, lật rồi mờ dần; hiệu ứng nền quanh tên vẫn tắt. Chưa xem trong game (tween chỉ kiểm tra tsc/eslint).

### 2026-11-21 — Cáo nói/bắn xu sau khi đóng popup
- Mua/bán ở Cửa hàng chỉ ghi nhớ (`pendingShopReaction` ở LakeScene); đóng popup mới nói câu cảm ơn + bắn xu (xu to 13px, 12 đồng, bay lâu hơn để dễ thấy). Đóng mà không giao dịch vẫn nói câu tiếc. Chưa xem trong game.

### 2026-11-21 — Xu bay vào ô Gold khi bán cá; xu của Cáo chỉ khi mua
- Hiệu ứng xu bay vào ô Gold (goldFx.ts) vốn có sẵn nhưng bị tắt khi trình duyệt/Windows bật "giảm chuyển động" (kiểm tra thấy `prefers-reduced-motion: reduce` -> bỏ qua hiệu ứng). Đã bỏ điều kiện đó nên bán cá luôn có xu bay + số đếm lên.
- Chùm xu quanh tên Cáo (`spawnCoinBurst`) chỉ còn khi MUA đồ; bán cá chỉ có câu nói + xu bay vào ô Gold.
- Kiểm tra: gọi `playGoldGain` trực tiếp trong trình duyệt (8 xu bay); chưa thử bán thật trong game.

### 2026-11-21 — Xu bay về ô Gold của Cửa hàng khi bán cá
- Cửa hàng đang mở: bán cá thì xu bay về ô Gold ở đầu popup (ShopPopup.renderGold gọi `playGoldGain`), ô Gold ngoài HUD chỉ đổi số. Xu thu dần về đúng cỡ biểu tượng ở đích (`endScale = cỡ icon / 34`, áp cho cả HUD). Chưa xem trong game.

### 2026-11-21 — Công cụ chọn cá cho mock (`?mockFish=1`)
- `pier.html?mockFish=1` hiện bảng "Chọn cá" bên trái dưới thẻ người chơi (đặt theo canvas, `devOverlay.ts` `mountFishPicker`, CSS `.mock-fish` ở kit.css). Chọn loài nào thì mỗi lần cá cắn của người chơi (MockBackend.toBite) chỉ ra loài đó; "Ngẫu nhiên" trả lại xác suất thường. Chỉ cá của người chơi, bot vẫn ngẫu nhiên. Chỉ có ở mock, không đụng Server thật. Kiểm tra tsc/eslint/vitest; chưa xem hiển thị (bản preview của tôi đòi đăng nhập).

### 2026-11-21 — Collider cho 20 ghế đẩu quanh bàn
- Đổi quyết định 2026-11-18 (ghế đẩu quanh bàn đi xuyên qua được) theo yêu cầu của Zen: 20 ghế đẩu ngồi chơi cạnh bàn giờ chặn đường như ghế đẩu câu (80 ô 8px đặt về 0 trong `walkableRows`; bản sao bot `Bots/pier-map.json` cập nhật khớp). Vẫn bấm F để ngồi, rời ghế bước ra chỗ đứng gần nhất.
- Test `pierMap.test.ts`: "đi xuyên qua ghế đẩu" đổi thành "ghế đẩu quanh bàn chặn đường đi". vitest 359 pass (gồm test chỗ đứng gần ghế, spawn, bản sao bot). Chưa thử trong game.

- Popup bán cá (Shop): hàng giá (số lượng + xu + tổng) đưa lên cùng hàng với nút −/+ (top 476, giữa hai nút), chữ 26px. Chưa xem trong game.

### 2026-11-21 — Nút bắt cá trên mobile
- Điện thoại (cảm ứng, pier.html): nút móc câu (SPACE) cố định ở góc phải dưới, đúng chỗ nút hành động F, thay vì bám chân nhân vật. Khi cá cắn thì nút F/Ngồi/Đứng dậy ẩn đi nhường chỗ, hết cắn thì F hiện lại. `FishButton.setDocked`, class `.fish-button--docked` (fishing.css), `FishingFlow.setButtonDocked/isButtonShown`, `LakeScene.updateActionButton`. Máy tính không đổi. Chưa thử trên điện thoại.
- Nút móc câu trên mobile to 240px (bằng joystick), tâm ngang tâm joystick; vòng đếm ngược và chữ SPACE to theo.

### 2026-11-21 — Popup bán cá: glow + cá 3D
- Quầng sáng sau cá đậm hơn (lõi trắng, màu theo độ hiếm), thở 2,6s + drop-shadow phát sáng quanh cá. Cá chuyển động 3D thử nghiệm: lớp `.shop-sell-dialog__fish-spin` (perspective 700px) lắc quanh trục dọc ±22° và lơ lửng, chu kỳ 5,2s; rê chuột lên vùng cá thì ảnh nghiêng theo con trỏ (ShopPopup, pointermove). Đã xem tĩnh bằng trang tạm (đã xoá); chưa xem chuyển động trong game.
- Bỏ nghiêng theo chuột; cá lắc quanh trục NGANG (rotateX ±32°, 5,2s). Thêm 9 bóng nước nổi lên sau cá (vòng tròn mờ viền sáng như hạt bong bóng buổi sáng, CSS `.shop-sell-dialog__bubble`). Chưa xem chuyển động trong game.
- Cá bơi: lên xuống ±12px, ngóc/chúi đầu ±5°, xoay trục dọc ±20°, chu kỳ 3,6s (thay trục ngang). Bóng nước đặt trên con cá (z-index, thêm sau cá trong DOM). Chưa xem chuyển động trong game.
- Cá bơi có easing sine in-out (cubic-bezier .45,0,.55,1) cho từng đoạn và scale 0,92 → 1,08 theo nhịp (to lên khi trôi lên). Chưa xem trong game.

- Cá trong popup bán cá cử động từng bộ phận (`ui/shop/swimFish.ts`): ảnh cá cắt thành mảnh canvas theo khung bao phần có màu (ảnh quay đầu trái): đuôi vẫy ±9° quanh khớp thân, mang phập phồng (dịch 3px, scaleX 1,06), hàm dưới đóng mở theo nhịp nói (há to/nhỏ xen kẽ, 2,6s). Bóng/quầng sáng đặt ở lớp ngoài để không lộ đường nối. Đã xem 4 loài (cá bống tượng, koi, mập, chép) bằng trang tạm (đã xoá), thấy đuôi vẫy; chưa xem trong game. Tỉ lệ cắt là chung cho mọi loài nên có thể lệch ở vài loài (mực, tôm hùm, cá đuối dáng khác).

### 2026-11-21 — Thu thập vị trí bộ phận cá (CHƯA làm, chờ Zen bảo "làm")
- **Cá Bò (`cowfish`, `CaBo.png`)**: Zen khoanh 4 bộ phận cần cử động, tỉ lệ ước lượng theo khung bao con cá (x từ mũi trái → đuôi phải, y từ đỉnh → đáy): vây lưng ~ (0,69; 0,30), vây ngực (giữa thân) ~ (0,37; 0,64), vây hậu môn (dưới) ~ (0,69; 0,82), đuôi ~ (0,80..1,00; 0,62). Tỉ lệ chung hiện tại của `swimFish.ts` (đuôi từ 0,76, mang 0,24..0,36, hàm dưới) không khớp loài này (vây nằm ở thân, không có "mang" riêng).
- **Cá Bống Tượng (`goby`, `CaBongTuong.png`)**: Zen khoanh 2 bộ phận: vây ngực (giữa thân, sau mang) ~ (0,37; 0,61) và đuôi ~ (0,82..1,00; 0,62) theo khung bao con cá. Chưa làm.
- **Cá Chép (`bass` → `CaChep.png`, theo tôi đoán từ hình; cần Zen xác nhận đúng loài)**: Zen khoanh 3 bộ phận: đuôi ~ (0,82..1,00; 0,53), vây bụng trước (nhỏ, dưới đầu) ~ (0,21; 0,82), vây bụng giữa (dưới thân) ~ (0,52; 0,91) theo khung bao con cá. Chưa làm.
- **Cá Chim (`pomfret` → `CaChim.png`)**: Zen khoanh 2 bộ phận: vây ngực (dẹt, giữa thân dưới) ~ (0,36; 0,61) và đuôi chẻ ~ (0,77..1,00; 0,64) theo khung bao con cá. Chưa làm.
- **Cá Chình (`eel` → `CaChinh.png`)**: Zen khoanh 1 bộ phận: vây ngực nhỏ sau mang, gần đầu, ~ (0,42; 0,84) theo khung bao. Lưu ý con này **quay đầu sang PHẢI** (đầu ở góc dưới phải, thân cuộn), khác giả định "quay đầu sang trái" của `swimFish.ts` → cần cấu hình hướng riêng cho loài này. Chưa làm.
- **Cá Trắm (`trout` → `TramCo.png`, đoán từ hình cá dài màu xanh lá; cần Zen xác nhận)**: Zen khoanh 2 bộ phận: vây ngực (sát đầu, dưới thân) ~ (0,20; 0,70) và đuôi ~ (0,79..1,00; 0,50) theo khung bao. Chưa làm.
- **Cá Chuồn (`flyingfish` → `CaChuon.png`)**: Zen khoanh 3 bộ phận: vây lưng/cánh trên ~ (0,29; 0,14), cánh ngực lớn ~ (0,46; 0,34) và đuôi ~ (0,76..1,00; 0,76) theo khung bao. Đuôi nằm thấp hơn thân (cá ngóc đầu chéo), nên khớp đuôi không ở giữa chiều cao như bản chung. Chưa làm.
- **Cá Mòi hoặc Cá Cơm (`perch` → `CaMoi.png` / `minnow` → `CaCom.png`; hình giống cá mòi nhưng cần Zen xác nhận)**: Zen chỉ khoanh đuôi chẻ ~ (0,78..1,00; 0,50) theo khung bao. Chưa làm.
- **Cá Đá (`stonefish` → `CaDa.png`)**: Zen khoanh 2 bộ phận: đuôi (nằm cao, góc trên phải) ~ (0,78..1,00; 0,21) và vây ngực lớn (dưới bụng, hình quạt) ~ (0,53; 0,82) theo khung bao. Đuôi ở phía trên chứ không giữa chiều cao. Chưa làm.
- **Cá Đuối (`stingray` → `CaDuoi.png`)**: Zen khoanh 1 bộ phận: đuôi roi dài ở góc trên phải, vùng ~ x 0,62..0,92, y 0,00..0,27 theo khung bao; khớp ở gốc đuôi ~ (0,62; 0,27), đuôi nên uốn/quất như roi. Cá dẹt, đầu quay trái-chéo, tỉ lệ chung không dùng được. Chưa làm.
- **Cá Koi (`koi` → `CaKoi.png`)**: Zen khoanh 2 bộ phận: đuôi ~ (0,76..1,00; 0,39) và vây bụng/ngực trước (dưới thân) ~ (0,41; 0,83) theo khung bao. Chưa làm.
- **Cá Mập (`shark` → `CaMap.png`)**: Zen khoanh 2 bộ phận: đuôi (dọc, góc phải) ~ (0,80..1,00; 0,25..0,90) với khớp ~ (0,80; 0,55) và vây ngực (dưới bụng, chĩa xuống) ~ (0,37..0,62; 0,63..0,95) theo khung bao (x 5..505, y 5..395 ước lượng từ hình). Chưa làm.
- **Cá Mòi (`perch` → `CaMoi.png`, đoán: lưng xanh, hàng chấm đen ở sườn; cần Zen xác nhận)**: Zen khoanh 2 bộ phận: vây ngực (dưới bụng, gần đầu) ~ (0,29; 0,62) và đuôi chẻ ~ (0,87..1,00; 0,50) theo khung bao. Nếu đúng thì con "cá mòi hoặc cá cơm" ở mục trước nhiều khả năng là **Cá Cơm** (`minnow` → `CaCom.png`). Chưa làm.
- **Cá Rô Phi (`carp` → `CaRoPhi.png`)**: Zen khoanh 2 bộ phận: vây ngực (giữa thân, dưới) ~ (0,49; 0,62) và đuôi ~ (0,81..1,00; 0,57) theo khung bao. Chưa làm.
- **Cá Tầm (`sturgeon` → `CaTam.png`)**: Zen khoanh 2 bộ phận: vây ngực (dưới bụng, sau đầu) ~ (0,36; 0,87) và đuôi (thùy trên dài hơn) ~ (0,83..1,00; 0,45) theo khung bao. Chưa làm.
- **Cá Thu (`puffer` → `CaThu.png`, đoán từ hình cá tím xanh có chấm trắng; cần Zen xác nhận)**: Zen khoanh 2 bộ phận: vây ngực nhỏ (sau mang) ~ (0,30; 0,61) và đuôi ~ (0,83..1,00; 0,50) theo khung bao. Chưa làm.
- **Cá Tra (`pangasius` → `CaTra.png`)**: Zen khoanh 3 bộ phận: vây lưng (trên, sau đầu) ~ (0,42; 0,08), vây ngực (giữa thân) ~ (0,42; 0,54) và đuôi lớn ~ (0,82..1,00; 0,59) theo khung bao. Chưa làm.
- **Mực (`moonfin` → `Muc.png`)**: Zen khoanh 3 đầu xúc tu để cho uốn lượn: xúc tu trên-trái ~ (0,19; 0,29), xúc tu dưới-trái ~ (0,09; 0,65), xúc tu phải ~ (0,94; 0,56) theo khung bao (con mực quay đầu chéo, thân ở góc trên phải). Cử động kiểu uốn/lắc đầu xúc tu, không phải vẫy đuôi. Chưa làm.
- **Tôm Hùm (`lobster` → `TomHum.png`)**: Zen khoanh 3 bộ phận: càng trái (gọng dưới của kìm) ~ (0,15; 0,47), gọng trên của càng lớn phía dưới ~ (0,47; 0,68) và đuôi quạt ở góc trên phải ~ (0,94; 0,27) theo khung bao. Cử động: kìm đóng/mở, đuôi quạt vẫy. Chưa làm.

### 2026-11-21 — Cá cử động từng bộ phận theo hình Zen khoanh (đã làm) + mắt long lanh
- `ui/shop/swimFish.ts` viết lại: bảng `PARTS` theo mã loài (đuôi vẫy ±9°, vây phẩy ±6°, xúc tu mực uốn ±10°, kìm tôm hùm đóng/mở 9°, đuôi roi cá đuối ±12°), vị trí lấy từ các hình Zen khoanh (ghi ở mục "Thu thập vị trí bộ phận cá" phía trên). Đuôi được khoét khỏi thân để không bóng đôi; vây/xúc tu/kìm chỉ chồng lên thân (xoay vài độ nên bóng đôi rất nhẹ, riêng kìm tôm hùm và xúc tu mực có thể thấy rõ hơn). **Bỏ cử động miệng** theo yêu cầu.
- Mắt long lanh: sao 4 cánh trắng nhấp nháy + chấm nhỏ trên đồng tử (`.swim-fish__eye`), toạ độ mắt ghi tay trong bảng `EYES` cho cả 20 loài (dò tự động không chính xác nên bỏ).
- Xác nhận loài theo ảnh `fish-sheet`: Cá Chuối = `goldcarp` (cá lóc xanh), Cá Cơm = `minnow` (cá bạc sọc xanh), Cá Mòi = `perch` (lưng xanh, hàng chấm đen), Cá Trắm = `trout` (bạc xanh lục), Cá Rô Phi = `carp`, Cá Chép = `bass`, Cá Thu = `puffer`. Cá Chình quay đầu phải nên chỉ có vây ngực.
- Đã xem 20 loài (ảnh tĩnh, có đánh dấu mắt) bằng trang tạm (đã xoá); xem lại nhịp vẫy từng bộ phận trong game chưa.

- Mock `?mockFish=1`: thêm nút xanh "Có tất cả cá" dưới bảng "Chọn cá" -> `MockBackend.grantAllFish()` cho túi mỗi loài 1 con (20 loài, cập nhật cả sổ cá). Đã thử: túi có 20 con / 20 loài. Mở lại Cửa hàng/Túi đồ để thấy (popup tải lại túi khi mở).

- Zen bỏ hết vẫy đuôi (lỗi nhiều): xoá mọi bộ phận loại đuôi trong `swimFish.ts` (cả đuôi roi cá đuối, đuôi quạt tôm hùm). Còn: vây phẩy, xúc tu mực uốn, kìm tôm hùm đóng mở, mắt long lanh. Cá đuối nay chỉ có ánh mắt. Chưa xem trong game.
- Giảm biên độ cử động để hết bóng đôi ở mép bộ phận (vây chồng lên thân): vây 6°→3,5°, xúc tu 10°→5°, kìm 9°→4°. Đã xem tôm hùm: hết chồng hình rõ rệt; các loài khác chưa xem lại trong game.
- Zen bỏ nốt cử động vây: `swimFish.ts` chỉ còn xúc tu mực (3) và kìm tôm hùm (2) cử động; mọi loài còn lại chỉ có mắt long lanh + cá bơi lên xuống/xoay cả con. Chưa xem lại trong game.
- Zen bỏ nốt xúc tu mực và kìm tôm hùm: `swimFish.ts` viết lại gọn, KHÔNG còn cắt mảnh/cử động bộ phận nào; chỉ còn ảnh cá + mắt long lanh (bảng `EYES`), cá vẫn bơi lên xuống/xoay cả con và có quầng sáng + bóng nước. CSS mảnh canvas đã xoá. Đã xem Cá Bò trong game mock (không còn canvas, ảnh vừa khung).
- Cá 3D nhẹ nhàng hơn: lên xuống ±5px (trước ±12), ngả ±2°, xoay trục dọc ±9° (trước ±20°), scale 0,97↔1,03, chu kỳ 5s (trước 3,6s). Chưa xem trong game.
- Popup bán cá: cỡ cá theo diện tích cố định (~56.000px², giới hạn 380x230) thay vì vừa khung, để các loài to bằng nhau; diện tích phần cá thực tế 45-56 nghìn px² (trừ Cá Cơm ~36 nghìn vì quá dài, Cá Đuối ~38 nghìn vì ảnh có nhiều khoảng trống). Chưa xem trong game.
- Đuôi vẫy SANG TRÁI-PHẢI (theo yêu cầu): đuôi tách thành canvas riêng (bảng `TAILS` ở swimFish.ts, 16 loài; cắt hết chiều cao từ chỗ đuôi bắt đầu để không sót mép) và co giãn ngang quanh gốc đuôi, scaleX 1,02 <-> 0,68, 0,85s (`.swim-fish__tail`). Không có ở Mực, Tôm Hùm, Cá Đuối, Cá Chình. Vây/miệng vẫn đứng yên. Đã xem 9 loài bằng trang tạm (đuôi co lại sạch, không bóng đôi); chưa xem chuyển động trong game.

### 2026-11-21 — Chậm anim đi của người và bot (pier)
- `CharacterView.applyAnimation`: trên pier (`hasHeadBubble`) anim `walk` chạy với `timeScale` 0,7 (12 → ~8,4 khung/giây) cho thân và cần, để chân không guồng nhanh hơn tốc độ di chuyển (90px/s); trang khác không đổi. Chỉnh hằng `WALK_ANIM_TIME_SCALE` nếu vẫn nhanh/chậm. Chưa xem trong game.

### 2026-11-23 — Nút Facebook ở màn đăng nhập
- `BootScreens.ts`: thêm nút `Login/Facebook (later).png` dưới nút Google, **chưa bấm được** (`disabled`, tooltip "Sắp ra mắt"; chưa có luồng đăng nhập Facebook, cần BE + Firebase provider). `boot.css`: hai nút thu còn 480/576 và gap 12 để vừa khung Sign In Panel 640x388. Đã xem trên trang đăng nhập (pier.html).

### 2026-11-23 — Kiểm trang phục (mũ/áo/quần/bộ liền) dùng được cho NPC và thỏ
- Kết quả và danh sách: `docs/work/W02-trang-phuc-npc-tho.md`. Chưa sửa code/art; chỉ khảo sát. Thỏ (6 thân) dùng được toàn bộ; npc_panda: mũ 134/315, áo 165/165, quần 87/87, bộ liền 82/102; npc_fox: mũ 17/315 (chỉ mũ trùm cả đầu), áo 165/165, quần 87/87, bộ liền 96/102.
- Bổ sung 20 thân bot vào `docs/work/W02-trang-phuc-npc-tho.md`: áo/quần dùng được cho mọi thân; bộ liền dùng chung 68/102; mũ phải chọn theo loài (shiba, chuột, vịt gần như không có; mèo 180, gấu 134, rùa 44). Chưa xem bằng mắt từng món.
- Bổ sung mục "Dùng chung cho TẤT CẢ" vào W02-trang-phuc-npc-tho.md: áo 165/165, quần 87/87, bộ liền 68/102, mũ 0/315.
- Đã chọn 40 mũ dùng chung cho thỏ + NPC + bot (xem W02-trang-phuc-npc-tho.md): phụ kiện nhỏ (tai nghe, nơ, sừng quỷ, trứng ốp la, khăn bịt đầu, nón lưỡi trai/nón nồi, vòng hoa, mũ y tá...), đã xem mắt trên 9 thân, 3 hướng.
- Đã ghi danh sách đầy đủ tên mũ (40), áo (165), quần (87), bộ liền (68) dùng chung vào phần TỔNG HỢP cuối W02-trang-phuc-npc-tho.md.
- Xem bằng mắt xong (áo 165/165 ổn; quần 86/87, loại turtle-floaty; bộ liền 55 thường + 9 hóa trang, loại 4: mermaid x3 và big-ears-forg-costume; mũ 40/40). Danh sách CHỐT ở cuối W02-trang-phuc-npc-tho.md.
- Đã chốt ghi chú đầu/cuối W02-trang-phuc-npc-tho.md: trỏ tới danh sách CHỐT, sửa số quần 86 và bộ liền 55+9, thêm "Việc tiếp theo".

### 2026-11-25 — Panel "Chọn nhân vật" khi vào game
- **Luồng:** đăng nhập xong (`BootScene.login`), trước khi vào hồ, hiện panel **Chọn nhân vật** (`ui/boot/CharacterSelect.ts`, dựng trong `BootScreens.chooseCharacter`, CSS `.pick__*` ở `boot.css`). Hai tab **Thỏ** (skin_01-10, thỏ đốm đỏ) và **Bạn thú** (19 skin bot); ô xem trước bên trái; skin shop chưa mua hiện mờ và không chọn được; bấm **VÀO HỒ** thì lưu (`PUT /me/skin`, chỉ khi đổi) rồi vào hồ. Lỗi tải `/skins` thì bỏ qua panel. Chỉ pier.html (có `screens`); đăng nhập dev (?dev=) bỏ qua panel.
- **Server (BE):** `appsettings.json` `Social.Skins` thêm 20 skin `skin_bot_*` miễn phí (tên tiếng Việt) và đổi tên `Skin 1..5` -> `Thỏ 1..5` (mock `skinCatalog.ts` khớp). Bot vẫn random trong `BotManager.Skins`. Người chơi giờ chọn được cả skin bạn thú; skin cũ giữ nguyên.
- **Kiểm tra:** tsc/eslint/vitest 359 pass; chạy thật trên mock (`?mockLogin`): chọn Mèo tuxedo -> vào hồ thì nhân vật là mèo tuxedo, `selectedSkinId` đúng. Test Server cần Postgres nên bị bỏ qua (chưa chạy thật); chỉ kiểm JSON hợp lệ và build.
- **Chưa làm / lưu ý:** avatar trên HUD góc trái vẫn là icon thỏ cố định (chưa theo skin); không có nút mở lại panel trong game (đổi skin trong game vẫn dùng popup Ngoại hình, nay có cả bạn thú); `red_spotted_bunny` xếp vào tab Thỏ.
- Sửa panel Chọn nhân vật theo yêu cầu: bỏ tab Thỏ/Bạn thú, chỉ còn MỘT lưới (Thỏ 1-5, rồi bạn thú, rồi skin shop đã mua); skin shop chưa mua không hiện nữa. Đã xem trên mock: 25 thẻ, không còn tab.

### 2026-11-25 — Cửa hàng bán mũ, áo, quần (300 Gold/món) và mặc lên nhân vật
- **Danh mục:** 291 món = 40 mũ (chọn tay) + 165 áo + 86 quần, đúng danh sách CHỐT trong `docs/work/W02-trang-phuc-npc-tho.md`; tên tiếng Việt viết tay trong `client-v0/tools/make_wardrobe_items.py` -> `client-v0/tools/wardrobe-items.json` (bản sao Server: `server/FishingOnline.Api/Modules/Wardrobe/wardrobe-items.json`, có test so khớp). Id dạng `hat_cap`, `top_hoodie`, `legs_cargo-pants`. Chưa gồm bộ liền (outfit).
- **Art:** `client-v0/tools/bake_wardrobe.mjs` bake mỗi món một sheet lớp trong suốt 120×140 cùng animation với thân (`public/assets/wardrobe/<id>.png|json`, tổng ~4,2 MB PNG + ~10 MB JSON, nạp lười từng món) và `_thumbs.png|json` (ảnh xem thử chung cho Cửa hàng).
- **Server (BE):** module `Modules/Wardrobe/WardrobeModule.cs`: `GET /api/v1/wardrobe`, `POST /api/v1/wardrobe/buy {itemId}` (trừ 300 Gold, `LedgerReasons.BuyWardrobe`), `PUT /api/v1/me/outfit {hatId,topId,legsId}` (null = cởi; phải đã mua và đúng loại); bảng `wardrobe_owned` + cột `HatId/TopId/LegsId` ở `players` (migration `20261125021101_WARDROBE_Outfit`, **chưa chạy lên DB thật**: chạy `server/migrate-local.ps1`); `PlayerView.outfit` và event `OutfitChanged` phát cả hồ; lỗi mới `WARDROBE_ALREADY_OWNED` (409), `WARDROBE_NOT_OWNED` (422).
- **Client:** `CharacterView` vẽ 3 lớp (quần, áo, mũ) chồng lên thân, chạy cùng animation/tốc độ (`entities/wardrobeArt.ts` nạp lười); tab **Trang phục** trong Cửa hàng (`ui/shop/wardrobeShop.ts`: nhóm Mũ/Áo/Quần, xem thử trên nhân vật đang chọn, Mua/Mặc/Cởi); mock backend có đủ 3 route + event; test mock mới (`MockBackend.wardrobe.test.ts`).
- **Kiểm tra:** vitest 364 pass, tsc/eslint sạch; Server: build ok, test danh mục 2/2 pass (test cần Postgres bị bỏ qua nên Server **chưa chạy thật**); trên mock trong trình duyệt: mua 3 món, mặc mũ + áo + quần, nhân vật hiện đủ 3 lớp, animation layer khớp thân (đi, ngồi).
- **Chưa làm / lưu ý:** bot và NPC chưa mặc đồ; nhãn tên có thể hơi đè lên mũ cao (chưa nâng nhãn theo mũ); viền trắng khi trỏ vào nhân vật chỉ viền thân; bộ liền chưa bán; Admin chưa xem được đồ của người chơi.
- Đã chạy migration lên DB dev portable (127.0.0.1:55432, fishing_online): áp dụng TRADE_FishTrades (còn chờ) và WARDROBE_Outfit; bảng wardrobe_owned và cột HatId/TopId/LegsId đã có. Postgres portable đang chạy nền (tắt bằng stop-all.bat hoặc pg_ctl stop).

### 2026-11-25 — Panel Chọn nhân vật chỉ hiện lần đầu
- **Cờ lưu theo tài khoản:** Server thêm `players.CharacterChosen` (migration `PLAYER_CharacterChosen`, đã chạy lên DB dev): người chơi mới = false, bot = true; người chơi cũ đã đổi skin khác `skin_01` và bot được đặt true. `PUT /me/skin` đặt true; `PlayerProfileView.characterChosen` trả khi đăng nhập.
- **Client:** `BootScene.chooseCharacter` chỉ hiện panel khi `profile.characterChosen === false` (Server cũ không gửi = không hiện); bấm VÀO HỒ luôn gọi `PUT /me/skin` (kể cả giữ Thỏ 1) để lưu "đã chọn"; sau đó không hỏi nữa, nhân vật đã chọn lưu theo tài khoản. Mock nhớ qua `localStorage` (`mock.character`) để thử tải lại trang.
- **Kiểm tra:** vitest 364+2 pass; trên mock: lần đầu hiện panel, chọn Mèo đen, tải lại thì vào thẳng game với Mèo đen (không hiện panel). Server mới build và áp migration, chưa chạy API thật.
- Muốn thử lại panel trong mock: xoá khoá `mock.character` trong localStorage của trang.

### 2026-11-25 — Cửa hàng: bỏ chữ "Mua", bỏ tab Ngoại hình, thêm ô Nguyên bộ
- **Cửa hàng:** nút trong tab Trang phục chỉ hiện giá (xu + số), bỏ chữ "Mua"; bỏ tab **Ngoại hình** (skin thỏ mặc đồ 300 Gold) khỏi Cửa hàng (mã tab giữ lại trong code, không có nút mở); thêm nhóm **Nguyên bộ (64)** cạnh Mũ/Áo/Quần, 300 Gold/bộ.
- **Nguyên bộ = 64 bộ liền (outfit)** gồm 55 dùng thường + 9 hóa trang trùm đầu (ếch, ma, áo choàng), bỏ mermaid x3 và big-ears-forg-costume (xem danh sách CHỐT). Id `set_<tên>`, tên tiếng Việt trong `tools/make_wardrobe_items.py`; danh mục nay 355 món; bake lại `public/assets/wardrobe` (355 sheet + `_thumbs`, tổng ~6 MB PNG).
- **Luật:** nguyên bộ thay cả áo và quần nên không mặc cùng áo/quần lẻ: mặc bộ thì tự cởi áo, quần; mặc áo hoặc quần thì tự cởi bộ (Client làm, Server và mock cũng từ chối tổ hợp sai bằng VALIDATION_FAILED). Mũ mặc kèm nguyên bộ được.
- **Server (BE):** `OutfitView.SetId`, cột `players.SetId` (migration `WARDROBE_SetId`, đã chạy lên DB dev), `SetOutfitRequest.SetId`, `OutfitChanged.setId`. **CharacterView** thêm lớp `set` (vẽ giữa áo và mũ).
- **Kiểm tra:** vitest 367 pass, tsc/eslint sạch, test danh mục Server 2/2 pass; trên mock: tab Trang phục có 4 nhóm, mua và mặc "Váy mùa thu" thì áo lẻ tự cởi, lớp set hiện. Server chưa chạy API thật.
- Ẩn thanh cuộn lưới thẻ trong Cửa hàng (`.shop-cards`, tab Trang bị/Trang phục), vẫn cuộn bằng chuột/vuốt, giống lưới bán cá.
- Tab Trang phục: chừa dải đệm 18px dưới hàng nút Mũ/Áo/Quần/Nguyên bộ và làm mờ dần mép trên lưới (mask 26px) để thẻ trượt lên không bị cắt cụt sát nút.
- Mock `?mockFish=1`: thêm nút xanh dương **Chọn nhân vật** dưới nút "Có tất cả cá": quên nhân vật đã lưu (`MockBackend.forgetCharacter`) rồi tải lại trang để hiện lại panel Chọn nhân vật. Đã thử: chọn Shiba kem, bấm nút, panel hiện lại.
- Tab Trang phục (Zen chọn kiểu "Ghim hàng nút nền đặc"): hàng nút Mũ/Áo/Quần/Nguyên bộ nằm trên dải nền đặc #f2d69c có đường kẻ dưới #c18a47, lưới thẻ cuộn bị che gọn dưới dải và cắt sạch ngang đường kẻ; bỏ lớp mờ dần (mask) cũ. Đã xem khi cuộn.
- Mock `?mockFish=1`: thêm nút vàng **+3000 vàng** (cộng Gold để thử mua đồ, cập nhật HUD luôn). Đã thử: 100 -> 3100.

- 2026-11-25 (Web Client): Cửa hàng tab "Trang phục": chữ tab 25px vừa ô; nút Mặc→"Trang bị", Cởi→"Tháo", toast "Đã trang bị/Đã tháo". Kiểm tra: tsc/eslint sạch, vitest 367 pass, thử trên mock (mua → Trang bị → Tháo).

- 2026-11-25 (Web Client): Cửa hàng: tab "Trang bị" đổi tên "Cần câu"; cần đã mua có nút Trang bị (PUT /me/equipped-rod, cần đang cầm ghi "Đang dùng"); nút thẻ cần/trang phục nowrap 24px để "Trang bị" không rớt dòng. Thử trên mock: mua cần → Trang bị → đổi sang cần mới.
