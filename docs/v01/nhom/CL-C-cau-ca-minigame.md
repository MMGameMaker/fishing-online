# CL-C — Giao diện câu cá và minigame

Mục tiêu: người chơi quăng câu, thấy cá cắn, chơi minigame, xem kết quả, đúng thời gian Server gửi.
Đọc trước: [SPEC_CHUNG](../SPEC_CHUNG.md) mục 2.6, 2.7, 4; `fixtures/minigame-vectors.v0.json` (CL-C tạo khi triển khai); clip tham khảo `ref minigame.mp4` (chỉ cơ chế).
Phạm vi file: `client-v0/src/online/fishing/`; test vectors minigame TS trong fixtures do CL-C sở hữu, thống nhất lead khi thêm file dùng chung.
Độc lập: chạy với mock của CL-A. Bản TS của thuật toán minigame do nhóm này viết và là nguồn cho mock.

---

### CL-C-01 Lõi minigame TS
- **Độ lớn:** S. **Phụ thuộc:** CL-A-01.
- **Spec:** `src/fishing/minigameCore.ts`: `mulberry32`, `needlePos(t, passMs)`, `createState(params)`, `applyTap(state, seq, tMs)` đúng từng bước SPEC 2.7 (xử lý cục bộ, không xác minh tap với Server). Hàm thuần, không phụ thuộc Phaser.
- **Nghiệm thu:** Vitest chạy toàn bộ `minigame-vectors.v0.json`: mọi tap được chấp nhận khớp `kind`, `hp`, `remainingMs`, `greenStart`, `yellowStart` (sai số ≤ 1e-9). Trước khi có vector: test với seed 123456789 khớp 5 số tham chiếu ở SPEC 2.7.

### CL-C-02 Nút Kéo
- **Độ lớn:** S. **Phụ thuộc:** CL-A-05.
- **Spec:** không có nút bắt đầu câu. Nút tròn lớn "Kéo!" giữa màn hình chỉ hiện khi bite, kèm vòng đếm ngược 3 giây. Trong lúc đó chạm điểm bất kỳ trên màn hình đều tính là Kéo, trừ các nút HUD ghế (Gia hạn, Rời ghế) và hộp thoại đang mở.
- **Nghiệm thu:** nút chỉ hiện ở bite; chạm xa nút vẫn gửi `HookFish` đúng một lần; chạm ngoài bite không gửi lệnh.

### CL-C-03 Quăng, chờ, cá cắn
- **Độ lớn:** M. **Phụ thuộc:** CL-C-02, CL-B-03.
- **Spec:** có phiên ghế và nhân vật đã ngồi xong → tự gửi `CastLine` → animation quăng, phao trên mặt nước, nhân vật `wait`. `AttemptUpdate bite` → chấm than trên đầu, cần rung, phao chìm, âm báo, vòng đếm theo `biteDeadlineAt`. Chạm → `HookFish`. Không chạm kịp → nhận `failed/missed_bite` → emoji buồn trên đầu (chỉ mình thấy) khoảng 2 giây rồi tự `CastLine`. Tự câu dừng khi hết phiên ghế và chạy lại khi còn ghế sau reconnect; `CastLine` lỗi thì thử lại sau 5 giây.
- **Nghiệm thu:** mua ghế xong tự quăng câu, không cần bấm; độ lệch giữa lúc nhận event bite và lúc hiện chấm than < 50 ms; missed_bite hiện emoji buồn rồi khoảng 2 giây sau quăng lại.

### CL-C-04 Màn minigame
- **Độ lớn:** L. **Phụ thuộc:** CL-C-01.
- **Spec:**
  - Thanh ngang, kim chạy theo `needlePos(t)` với `t = performance.now() − mốc nhận params` (bù nửa RTT ước lượng).
  - Vùng xanh, vùng vàng nằm trong xanh; vị trí theo state của `minigameCore`.
  - Thanh "khoảng cách tới cá" = hp / fishHp; đồng hồ `remainingMs`.
  - Bấm (chuột, chạm, Space) → `applyTap` cục bộ để hiện ngay hiệu ứng (trúng: cá bị kéo lại gần, vàng: hiệu ứng mạnh + chữ "x2", trượt: thanh giờ nháy đỏ), không gửi tap. Khi kết thúc chỉ gửi SubmitFishingResult với outcome và attemptId; chờ settlement trước hiển thị cá/EXP thật.
  - Khi mất response kết quả: giữ attemptId/requestId, tra snapshot hoặc gửi lại cùng outcome; không tự cộng cá/EXP/Gold. Server đã hủy/hết hạn thì kết quả cục bộ không phát thưởng.
  - Không có nút thoát riêng trong minigame; nút Rời ghế trên HUD vẫn dùng được, rời ghế là hủy lần câu, không có cá.
- **Nghiệm thu:** chơi mượt 60 fps trên máy tầm trung; với ping giả 150 ms thao tác cục bộ không chờ ack từng tap, settlement không trùng; mỗi rarity nhìn khác nhau rõ về tốc độ/độ rộng.

### CL-C-05 Kết quả
- **Độ lớn:** M. **Phụ thuộc:** CL-C-04; icon cá (ART-04).
- **Spec:** `success` → popup: ảnh cá, tên, độ hiếm (màu theo rarity), chiều dài `lengthTenthCm/10` cm một chữ số thập phân, nhãn "Mới" hoặc "Kỷ lục", EXP nhận, "Lên cấp!" nếu levelUp. Popup ở lại tới khi chạm điểm bất kỳ trên màn hình (bỏ qua chạm trong 0,4 giây đầu để cú bấm dư của minigame không đóng nhầm); đóng xong tự `CastLine`. Lúc popup đang mở không rời ghế được vì đã câu được cá. `failed/timeout` → emoji buồn khoảng 2 giây rồi tự `CastLine`. `cancelled` → thông báo ngắn theo reason. `CatchShown` của người khác → icon cá trên đầu họ đến `shownUntil`.
- **Nghiệm thu:** chiều dài 405 hiện "40,5 cm"; popup không tự đóng, chạm mới đóng và câu tiếp ngay; người khác thấy icon 5 giây.
