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
