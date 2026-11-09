# CL-B — Map hồ, nhân vật, di chuyển, ghế

Mục tiêu: scene hồ có 20 ghế, nhân vật đi lại mượt, thấy người khác, mua vé và giữ ghế qua UI.
Đọc trước: [SPEC_CHUNG](../SPEC_CHUNG.md) mục 2.2, 2.3, 4; `fixtures/lake-map.placeholder.json`; [W02](../../work/W02-art-map-ho.md).
Phạm vi file: `client-web/src/scenes/lake/`, `client-web/src/entities/`, `docs/v01/fixtures/lake-map.json` (map thật, khi xong).
Độc lập: chạy với mock của CL-A; dùng asset placeholder (hình khối màu) cho tới khi ART giao.

---

### CL-B-01 Map hồ thật theo schema
- **Độ lớn:** M. **Phụ thuộc:** CL-B-07 (bố cục hồ mới được duyệt), tileset có quyền dùng (ART-01).
- **Spec:** dựng map Tiled 20 ghế: ghế 1-5 Tier 1 ở vị trí đẹp nhất, 6-10 Tier 2, 11-20 Tier 3 (bỏ bố cục 10 chòi × 3). Layer: ground, water, decor, collision; object layer `seats` (thuộc tính `seatId`, `tier`, `facing`, `roamRadius`), `spawn`, `lakeArea` (polygon). Script `tools/export-lake-map` xuất `lake-map.json` đúng schema placeholder (walkableRows, seats, spawn, lakeArea, moveRules).
- **Nghiệm thu:** giao map nguồn Tiled, atlas/tileset và map JSON có version; BE-C-01 nạp file mới không lỗi; đúng 20 ghế 3 Tier, mọi ghế có đường từ spawn (BFS); collision/walkable/lakeArea khớp Client–BE; kiểm tra trong scene Phaser PC/mobile, camera/depth/đường tới Shop và preview được duyệt. Map placeholder hoặc map 30 anchor cũ không đạt task này.

### CL-B-02 Scene hồ
- **Độ lớn:** M. **Phụ thuộc:** CL-A-01.
- **Spec:** nạp tilemap (placeholder trước), camera theo nhân vật trong giới hạn map, sắp lớp theo y (depth = y), va chạm theo `walkableRows` giống thuật toán Server (`canStand` với chân 14×6).
- **Nghiệm thu:** không đi xuyên nước/vật cản; nhân vật đứng sau cây khi y nhỏ hơn.

### CL-B-03 Nhân vật và animation
- **Độ lớn:** M. **Phụ thuộc:** CL-B-02; sprite từ ART-02 (placeholder trước).
- **Spec:** lớp `CharacterView`: 4 hướng `idle`, `walk`; trạng thái câu `cast`, `wait`, `bite`, `reel`, `success`, `fail`; nhãn tên; chỗ gắn icon trên đầu (chấm than, icon cá, emoji). Đổi skin bằng `skinId` (texture key `skin_XX`), đổi cần bằng `rodId`.
- **Nghiệm thu:** trang debug hiển thị đủ 4 hướng × mọi animation cho 1 skin.

### CL-B-04 Điều khiển và đồng bộ di chuyển
- **Độ lớn:** M. **Phụ thuộc:** CL-B-02, CL-A-04.
- **Spec:** joystick ảo (mobile) + WASD/mũi tên + click để đi tới. Tự di chuyển cục bộ, gửi `Move` tối đa 10 lần/giây và khi dừng. `PositionCorrected` → đặt lại vị trí. Người khác: nội suy tới vị trí mới (100 ms trễ). Khóa điều khiển khi `attempt.phase` thuộc waiting/bite/minigame và trong 3 giây popup kết quả. Khi giữ ghế: vẽ vòng tròn phạm vi `roamRadius` mờ.
- **Nghiệm thu:** 2 tab mock/Server thật thấy nhau đi mượt; đi ra ngoài phạm vi ghế bị kéo về.

### CL-B-05 Ghế và mua vé
- **Độ lớn:** M. **Phụ thuộc:** CL-B-02, CL-A-05.
- **Spec:** mỗi ghế có số và màu theo trạng thái: available (xanh), occupied (đỏ, tên người ngồi), cooldown (xám, đếm ngược giây). Bấm ghế available khi ở gần (≤ 64 px) → popup: Tier, buff (Rare/Large Luck, Lure Time), đơn giá/block của ghế, chọn durationUnits tương ứng số phút, tổng Gold và nút thanh toán; Server xác nhận giá/version. Lỗi: `SEAT_TAKEN` → "Ghế đang được sử dụng"; `SEAT_COOLDOWN`; `INSUFFICIENT_GOLD`; `ALREADY_HAS_SEAT`. Khi có phiên: HUD đồng hồ theo expiresAt mới nhất đếm ngược theo `expiresAt` (đồng bộ `serverTime`), nút "Rời ghế" có hộp xác nhận ("Không hoàn vé"). Hết phiên → thông báo theo `reason`.
- **Gia hạn:** trong phiên có nút Gia hạn, chọn thêm thời lượng, hiển thị đơn giá/tổng tiền/xác nhận; gọi ExtendSeatSession, chỉ cập nhật Gold/expiresAt từ Server. Xử lý PRICE_CHANGED/INVALID_DURATION/SEAT_SESSION_EXPIRED; gia hạn không đổi ghế hoặc reset minigame.
- **Nghiệm thu:** mua 20 phút, gia hạn 10 phút test → đúng 30 phút; thiếu Gold không tăng thời gian; 2 tab bấm mua cùng ghế: 1 tab vào ghế, tab kia thấy thông báo; đồng hồ lệch Server ≤ 1 giây.

### CL-B-06 Mất kết nối
- **Độ lớn:** S. **Phụ thuộc:** CL-A-04, CL-B-05.
- **Spec:** khi mất kết nối: lớp phủ "Đang kết nối lại..." và thời gian còn giữ ghế (2:00 đếm ngược) nếu đang có phiên. Nối lại → áp snapshot. Quá 2 phút → thông báo mất ghế.
- **Nghiệm thu:** tắt mạng 30 giây rồi bật → vẫn ở ghế, đồng hồ lượt đúng.

### CL-B-07 Thiết kế và duyệt bố cục hồ câu mới
- **Độ lớn:** M. **Phụ thuộc:** ART-01; bố cục dùng hình khối được trước khi có asset cuối.
- **Spec:** dựng mới hồ câu cho bản đầu, không mặc định chuyển nguyên prototype cũ. Bản bố cục phải thể hiện bờ/nước/đường đi, spawn, Shop hoặc điểm tương tác Shop, ranh giới Lake, 20 ghế và phân bổ Tier (1-5 tốt nhất, 6-10 thường, 11-20 thấp nhất), hướng ngồi, roamRadius, vật cản và khoảng trống camera/UI. Shop ngoài hay trong Lake là đề xuất cần xác nhận vì rời Lake làm mất ghế. Không tự thêm map/phòng thứ hai.
- **Đầu ra:** layout nguồn + preview có chú giải và danh sách seatId; sau duyệt CL-B-01 dựng map cuối/export, CL-B-02 tích hợp scene, BE-C-01 nạp cùng fixture.
- **Nghiệm thu:** người dùng/lead duyệt bố cục; không có ghế kẹt/không tiếp cận, có đường tới tất cả ghế và Shop; kiểm tra kích thước trên PC/mobile. Chưa duyệt bố cục không gọi map thật hoàn tất.
