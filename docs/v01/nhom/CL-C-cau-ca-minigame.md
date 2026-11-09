# CL-C — Giao diện câu cá và minigame

Mục tiêu: người chơi quăng câu, thấy cá cắn, chơi minigame, xem kết quả, đúng thời gian Server gửi.
Đọc trước: [SPEC_CHUNG](../SPEC_CHUNG.md) mục 2.6, 2.7, 4; `fixtures/minigame-vectors.v0.json` (khi BE-B-07 xong); clip tham khảo `ref minigame.mp4` (chỉ cơ chế).
Phạm vi file: `client-web/src/fishing/`.
Độc lập: chạy với mock của CL-A. Bản TS của thuật toán minigame do nhóm này viết và là nguồn cho mock.

---

### CL-C-01 Lõi minigame TS
- **Độ lớn:** S. **Phụ thuộc:** CL-A-01.
- **Spec:** `src/fishing/minigameCore.ts`: `mulberry32`, `needlePos(t, passMs)`, `createState(params)`, `applyTap(state, seq, tMs)` đúng từng bước SPEC 2.7 (phía client không có `serverElapsed`, chỉ kiểm tra seq, khoảng cách 80 ms, remaining > 0). Hàm thuần, không phụ thuộc Phaser.
- **Nghiệm thu:** Vitest chạy toàn bộ `minigame-vectors.v0.json`: mọi tap được chấp nhận khớp `kind`, `hp`, `remainingMs`, `greenStart`, `yellowStart` (sai số ≤ 1e-9). Trước khi có vector: test với seed 123456789 khớp 5 số tham chiếu ở SPEC 2.7.

### CL-C-02 Nút câu và quăng thính
- **Độ lớn:** S. **Phụ thuộc:** CL-A-05.
- **Spec:** nút tròn lớn góc phải dưới, chỉ hiện khi đang giữ ghế. Trạng thái nút: "Câu" (sẵn sàng) → khóa khi waiting → "Kéo!" kèm vòng đếm ngược 3 giây khi bite → ẩn khi minigame (minigame có vùng bấm riêng) → khóa trong 3 giây popup. Nút nhỏ "Thính (n)" cạnh nút câu: gọi `UseChum`; khi `chumActive` hiện biểu tượng sáng, nút khóa.
- **Nghiệm thu:** mọi trạng thái hiển thị đúng theo chuỗi event mẫu; bấm khi khóa không gửi lệnh.

### CL-C-03 Quăng, chờ, cá cắn
- **Độ lớn:** M. **Phụ thuộc:** CL-C-02, CL-B-03.
- **Spec:** bấm "Câu" → `CastLine` → animation quăng, phao trên mặt nước, nhân vật `wait`. `AttemptUpdate bite` → chấm than trên đầu, cần rung, phao chìm, âm báo, vòng đếm theo `biteDeadlineAt`. Bấm → `HookFish`. Không bấm kịp → nhận `failed/missed_bite` → emoji buồn trên đầu (chỉ mình thấy) rồi về sẵn sàng.
- **Nghiệm thu:** độ lệch giữa lúc nhận event bite và lúc hiện chấm than < 50 ms; missed_bite hiện emoji buồn.

### CL-C-04 Màn minigame
- **Độ lớn:** L. **Phụ thuộc:** CL-C-01.
- **Spec:**
  - Thanh ngang, kim chạy theo `needlePos(t)` với `t = performance.now() − mốc nhận params` (bù nửa RTT ước lượng).
  - Vùng xanh, vùng vàng nằm trong xanh; vị trí theo state của `minigameCore`.
  - Thanh "khoảng cách tới cá" = hp / fishHp; đồng hồ `remainingMs`.
  - Bấm (chuột, chạm, Space) → `applyTap` cục bộ để hiện ngay hiệu ứng (trúng: cá bị kéo lại gần, vàng: hiệu ứng mạnh + chữ "x2", trượt: thanh giờ nháy đỏ), đồng thời gửi `MinigameTap {seq, tMs}`.
  - Ack từ Server khác dự đoán → lấy theo Server (hp, remainingMs); tap bị `TAP_REJECTED` → hoàn tác hiệu ứng tap đó.
  - Không có nút thoát.
- **Nghiệm thu:** chơi mượt 60 fps trên máy tầm trung; với ping giả 150 ms kết quả cuối khớp Server; mỗi rarity nhìn khác nhau rõ về tốc độ/độ rộng.

### CL-C-05 Kết quả
- **Độ lớn:** M. **Phụ thuộc:** CL-C-04; icon cá (ART-04).
- **Spec:** `success` → popup 3 giây: ảnh cá, tên, độ hiếm (màu theo rarity), chiều dài `lengthTenthCm/10` cm một chữ số thập phân, nhãn "Mới" hoặc "Kỷ lục", EXP nhận, "Lên cấp!" nếu levelUp. Tự đóng sau 3 giây rồi về sẵn sàng. `failed/timeout` → emoji buồn. `cancelled` → thông báo ngắn theo reason. `CatchShown` của người khác → icon cá trên đầu họ đến `shownUntil`.
- **Nghiệm thu:** chiều dài 405 hiện "40,5 cm"; popup tự đóng đúng 3 giây; người khác thấy icon 5 giây.
