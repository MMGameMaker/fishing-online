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
