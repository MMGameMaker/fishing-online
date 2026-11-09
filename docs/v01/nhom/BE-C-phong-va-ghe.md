# BE-C — Phòng hồ, di chuyển, ghế và vé

Mục tiêu: 20 người vào cùng hồ, đi lại, mua vé giữ ghế 10 phút đúng mọi luật ghế.
Đọc trước: [SPEC_CHUNG](../SPEC_CHUNG.md) mục 2.2, 2.3, 4, 6; `fixtures/lake-map.placeholder.json`.
Phạm vi file: `server/FishingOnline.Api/Modules/Lake/`, `GameHub.Lake.cs`, migration `BEC_*`.
Độc lập: dùng `ICurrentPlayer`, `IWallet`, `IConfigProvider`, `IIdempotency` qua interface. Khi BE-A chưa xong, dùng bản giả trong test (ví trong bộ nhớ, player cố định).

Mô hình chạy: một instance sở hữu phòng `lake-01`. Mọi lệnh thay đổi trạng thái phòng đi qua một hàng đợi tuần tự (`Channel<Func<Task>>`) để tránh tranh chấp trong RAM; DB vẫn là nguồn chân lý cho ghế/phiên.

---

### BE-C-01 Nạp map và kiểm tra vị trí
- **Độ lớn:** S. **Phụ thuộc:** không.
- **Spec:** `LakeMap` đọc JSON theo schema của fixture (đường dẫn trong config `Lake:MapPath`). `CanStand(x, y)`: hình chữ nhật chân (`feetHalfWidth`, `feetHeight`) không chạm ô `0`. `InLakeArea(x, y)` theo polygon. `Seat(seatId)`.
- **Nghiệm thu:** điểm trên nước → false; điểm spawn → true; tất cả 20 ghế đứng được.

### BE-C-02 Vào phòng, presence, snapshot
- **Độ lớn:** M. **Phụ thuộc:** BE-C-01.
- **Spec:**
  - `JoinLake`: thêm player vào group SignalR `lake-01`, vị trí = spawn (hoặc vị trí ghế nếu đang giữ ghế khi reconnect). Trả `LakeSnapshot` đúng SPEC mục 4, phát `PlayerJoined`.
  - Một player một kết nối hoạt động: kết nối mới thay kết nối cũ (đóng cũ, không phát PlayerLeft/Joined lại).
  - Presence giữ trong RAM (có thể đẩy Redis để Admin xem). Giới hạn 50 người trong phòng [Đề xuất]; vượt → `STATE_CONFLICT`.
- **Nghiệm thu:** 2 client vào, mỗi bên thấy bên kia; mở tab thứ 2 cùng tài khoản → tab 1 bị ngắt, phòng vẫn chỉ 1 avatar.

### BE-C-03 Di chuyển
- **Độ lớn:** M. **Phụ thuộc:** BE-C-02.
- **Spec:** `Move {seq, x, y, dir}`: seq tăng dần (bỏ seq cũ); quãng đường từ vị trí trước ≤ `maxSpeedPxPerSec × Δt × 1.25 + 8`; `CanStand`; nếu đang giữ ghế: khoảng cách tới ghế ≤ `roamRadius`; nếu đang trong lần câu (BE-E báo qua `IFishingState.IsBusy(playerId)`): từ chối. Sai → `PositionCorrected` cho người gửi. Đúng → `PlayerMoved` cho người khác. Giới hạn 20 lệnh/giây.
- **Nghiệm thu:** nhảy 500 px → bị kéo về; đi vào ô nước → bị kéo về; giữ ghế đi xa 100 px → bị kéo về.

### BE-C-04 Bảng ghế, mua vé
- **Độ lớn:** L. **Phụ thuộc:** BE-C-01; IWallet (giả được).
- **Spec:**
  - Bảng `seats(seatId PK, number, tier)` seed 20 dòng từ map. `seat_sessions(id, seatId, playerId, startedAt, expiresAt, endedAt null, endReason null, chumActive bool, disconnectedAt null, configVersion)`. Unique partial index `(seatId) where endedAt is null` và `(playerId) where endedAt is null`. Bảng `seat_cooldowns(seatId PK, until)`.
  - `BuySeatTicket {seatId}` trong transaction: kiểm tra cooldown (`SEAT_COOLDOWN`), phiên đang mở của ghế (`SEAT_TAKEN`), của player (`ALREADY_HAS_SEAT`), `IWallet.DebitAsync(price, "seat_ticket", sessionId)`, insert session. Vi phạm unique index → map sang `SEAT_TAKEN`. Bọc `IIdempotency` theo requestId.
  - Sau commit: dịch chuyển player tới vị trí ghế, phát `SeatChanged`, `MySeatSession` cho owner, `PlayerMoved`.
- **Nghiệm thu:** 10 client cùng mua 1 ghế → 1 thành công, 9 nhận `SEAT_TAKEN`, chỉ 1 dòng ledger; mua ghế thứ 2 khi đang giữ ghế → `ALREADY_HAS_SEAT`; thiếu Gold → `INSUFFICIENT_GOLD`, ghế vẫn trống.

### BE-C-05 Kết thúc phiên và cooldown
- **Độ lớn:** M. **Phụ thuộc:** BE-C-04.
- **Spec:**
  - `ISeatSessions.EndAsync(playerId, reason)`: set `endedAt`, `endReason`; tạo cooldown `until = now + 10000`; phát `SessionEnded` (BE-E hủy lần câu), `SeatChanged` (state cooldown), `MySeatSession {ended, reason}`.
  - Lý do: `expired` (timer), `left_seat` (`LeaveSeat`), `left_lake` (rời phòng), `disconnect_timeout`.
  - Timer: `BackgroundService` quét mỗi 250 ms các phiên `expiresAt ≤ now` và cooldown hết hạn (phát `SeatChanged` available).
- **Nghiệm thu:** với đồng hồ giả (`TimeProvider`), phiên kết thúc đúng 600.000 ms; ghế available đúng 10.000 ms sau; người vừa rời mua lại trong cooldown → `SEAT_COOLDOWN`.

### BE-C-06 Mất kết nối và vào lại
- **Độ lớn:** M. **Phụ thuộc:** BE-C-05.
- **Spec:** `OnDisconnectedAsync`: nếu đang giữ ghế → set `disconnectedAt`, phát `PlayerDisconnected` (BE-E hủy lần câu `disconnected`), avatar vẫn ở ghế (đánh dấu offline trong PlayerView [Đề xuất]). Timer: `disconnectedAt + 120000 ≤ now` → `EndAsync(disconnect_timeout)`. `JoinLake` lại trong hạn → xóa `disconnectedAt`, trả snapshot có `mySession`. Không giữ ghế thì disconnect = rời phòng ngay.
- **Nghiệm thu:** ngắt 60 giây rồi vào lại → còn ghế, `expiresAt` không đổi; ngắt 125 giây → mất ghế, ghế vào cooldown.

### BE-C-07 Khôi phục sau restart
- **Độ lớn:** S. **Phụ thuộc:** BE-C-05, BE-C-06.
- **Spec:** khi khởi động: phiên mở có `disconnectedAt` hoặc mọi phiên mở (vì không còn kết nối) → coi như `disconnectedAt = thời điểm khởi động` nếu chưa có; xử lý phiên quá hạn và cooldown quá hạn ngay lần quét đầu.
- **Nghiệm thu:** tắt server khi có phiên còn 5 phút, bật lại sau 30 giây, player vào lại → còn ghế; tắt 3 phút → mất ghế.

### BE-C-08 Test tải phòng
- **Độ lớn:** S. **Phụ thuộc:** BE-C-04.
- **Spec:** script (Node hoặc .NET) mở 20 kết nối, mỗi kết nối di chuyển 10 lần/giây trong 2 phút và mua 20 ghế khác nhau.
- **Nghiệm thu:** không lỗi; p95 thời gian từ Move đến PlayerMoved ở client khác < 150 ms trên máy local; ghi số đo CPU/RAM vào báo cáo.
