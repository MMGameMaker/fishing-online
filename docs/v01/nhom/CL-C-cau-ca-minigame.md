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

### CL-C-02 Nút móc câu
- **Độ lớn:** S. **Phụ thuộc:** CL-A-05.
- **Spec (SPEC 0.9):** không có nút bắt đầu câu. Nút tròn có biểu tượng móc câu ở góc phải dưới màn hình, chỉ hiện khi bite, kèm thanh đếm ngược 3 giây theo `biteDeadlineAt`. Phải bấm đúng nút để gửi `HookFish`; chạm chỗ khác không tính.
- **Nghiệm thu:** nút chỉ hiện ở bite; bấm nút gửi `HookFish` đúng một lần; chạm ngoài nút hoặc ngoài bite không gửi lệnh.

### CL-C-03 Quăng, chờ, cá cắn
- **Độ lớn:** M. **Phụ thuộc:** CL-C-02, CL-B-03.
- **Spec (SPEC 0.9):** đang ngồi ghế và nhân vật đã ngồi xong → tự gửi `CastLine` → animation quăng, phao trên mặt nước, nhân vật `wait`. `AttemptUpdate bite` → chấm than trên đầu, cần rung, phao chìm, âm báo, thanh đếm theo `biteDeadlineAt`. Bấm nút móc câu → `HookFish`. Không bấm kịp → `failed/missed_bite`, Server kết thúc ghế (`MySeat` ended `missed_bite`), nhân vật đứng dậy, không câu tiếp, không hiện icon buồn. Tự câu dừng khi không còn ghế; `CastLine` lỗi thì thử lại sau 5 giây.
- **Nghiệm thu:** ngồi xong tự quăng câu, không cần bấm; độ lệch giữa lúc nhận event bite và lúc hiện chấm than < 50 ms; missed_bite thì nhân vật đứng dậy và có thông báo.

### CL-C-04 Màn minigame
- **Độ lớn:** L. **Phụ thuộc:** CL-C-01.
- **Spec:**
  - Thanh ngang, kim chạy theo `needlePos(t)` với `t = performance.now() − mốc nhận params` (bù nửa RTT ước lượng).
  - Vùng xanh, vùng vàng nằm trong xanh; vị trí theo state của `minigameCore`.
  - Thanh "khoảng cách tới cá" = hp / fishHp; đồng hồ `remainingMs`.
  - Bấm (chuột, chạm, Space) → `applyTap` cục bộ để hiện ngay hiệu ứng (trúng: cá bị kéo lại gần, vàng: hiệu ứng mạnh + chữ "x2", trượt: thanh giờ nháy đỏ), không gửi tap. Khi kết thúc chỉ gửi SubmitFishingResult với outcome và attemptId; chờ settlement trước hiển thị cá/EXP thật.
  - Khi mất response kết quả: giữ attemptId/requestId, tra snapshot hoặc gửi lại cùng outcome; không tự cộng cá/EXP/Gold. Server đã hủy/hết hạn thì kết quả cục bộ không phát thưởng.
  - Không có nút thoát trong minigame. Từ lúc thu cần tới khi có kết quả không rời ghế được: phím di chuyển và nút Rời ghế không có tác dụng, Server cũng từ chối `LeaveSeat` (`STATE_CONFLICT`). Vé hết giữa minigame vẫn câu nốt.
- **Nghiệm thu:** chơi mượt 60 fps trên máy tầm trung; với ping giả 150 ms thao tác cục bộ không chờ ack từng tap, settlement không trùng; mỗi rarity nhìn khác nhau rõ về tốc độ/độ rộng.

### CL-C-05 Kết quả
- **Độ lớn:** M. **Phụ thuộc:** CL-C-04; icon cá (ART-04).
- **Spec:** `success` → popup: ảnh cá, tên, độ hiếm (màu theo rarity), chiều dài `lengthTenthCm/10` cm một chữ số thập phân, nhãn "Mới" hoặc "Kỷ lục", EXP nhận, "Lên cấp!" nếu levelUp. Popup chỉ user thấy, ở lại tới khi user tự tắt (chạm điểm bất kỳ, bỏ qua chạm trong 0,4 giây đầu để cú bấm dư của minigame không đóng nhầm); đóng xong tự `CastLine`. `failed/timeout` (thua minigame) → icon buồn trên đầu khoảng 2 giây rồi tự `CastLine`; người khác cũng thấy qua event `FailShown` (icon buồn trên đầu người đó tới `shownUntil`). `cancelled` → thông báo ngắn theo reason. `CatchShown` của người khác → icon cá trên đầu họ đến `shownUntil`.
- **Nghiệm thu:** chiều dài 405 hiện "40,5 cm"; popup không tự đóng, chạm mới đóng và câu tiếp ngay; người khác thấy icon cá 5 giây và icon buồn 2 giây.
