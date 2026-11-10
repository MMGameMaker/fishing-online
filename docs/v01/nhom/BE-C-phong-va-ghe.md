# BE-C — Phòng hồ, di chuyển, ghế và vé

Mục tiêu: 20 người vào cùng hồ, đi lại, mua vé câu theo thời gian và ngồi ghế đúng luật SPEC 0.9 (vé không gắn ghế).
Đọc trước: [SPEC_CHUNG](../SPEC_CHUNG.md) mục 2.2, 4, 6; `fixtures/lake-map.placeholder.json`.
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
- **Spec:** `Move {seq, x, y, dir}`: seq tăng dần (bỏ seq cũ); quãng đường từ vị trí trước ≤ `maxSpeedPxPerSec × Δt × 1.25 + 8`; `CanStand`; đang ngồi ghế thì mọi Move bị kéo về (SPEC 0.9, muốn đi phải `LeaveSeat`); nếu đang trong lần câu (BE-E báo qua `IFishingState.IsBusy(playerId)`): từ chối. Sai → `PositionCorrected` cho người gửi. Đúng → `PlayerMoved` cho người khác. Giới hạn 20 lệnh/giây.
- **Nghiệm thu:** nhảy 500 px → bị kéo về; đi vào ô nước → bị kéo về; đang ngồi đi 6 px → bị kéo về.

### BE-C-04 Vé và ngồi ghế (viết lại theo SPEC 0.9)
- **Độ lớn:** L. **Phụ thuộc:** BE-C-01; IWallet (giả được).
- **Spec:**
  - Bảng `seats(seatId PK, number)` seed 20 dòng từ map. `tickets(playerId PK, expiresAt, purchasedMinutes, ticketVersion, priceVersion)`, `ticket_purchases` (biên nhận). `seat_sessions(id, seatId, playerId, startedAt, endedAt null, endReason null, disconnectedAt null, configVersion)` là một lần ngồi, không có hạn riêng. Unique partial index `(seatId) where endedAt is null` và `(playerId) where endedAt is null`.
  - `BuyTicket {quantity, expectedPriceVersion}` trong transaction: `1 ≤ quantity ≤ maxUnitsPerPurchase` (`INVALID_QUANTITY`), đúng priceVersion (`PRICE_CHANGED`), khóa hàng vé, `IWallet.DebitAsync(total, "ticket_purchase", purchaseId)`, còn vé thì cộng nối hạn, hết vé thì tính từ now, ghi receipt. Bọc `IIdempotency` theo requestId. Sau commit phát `MyTicket`.
  - `SitDown {seatId}`: đứng cách ghế ≤ 64 px (`OUT_OF_RANGE`), vé còn hạn (`NO_TICKET`), ghế trống (`SEAT_TAKEN`), chưa ngồi ghế khác (`ALREADY_HAS_SEAT`; gửi lại đúng ghế đang ngồi thì trả ghế đó). Vi phạm unique index → `SEAT_TAKEN`/`ALREADY_HAS_SEAT`. Sau commit: đặt player vào vị trí ghế, phát `SeatChanged`, `MySeat`, `PositionCorrected`, `PlayerMoved`.
- **Nghiệm thu:** 10 client cùng ngồi 1 ghế → 1 thành công, 9 `SEAT_TAKEN`; mua 6 vé rồi mua thêm 1 khi còn 55 phút → còn 65 phút; thiếu Gold → `INSUFFICIENT_GOLD`, không có vé; retry cùng requestId chỉ trừ tiền một lần; không vé → `NO_TICKET`.

### BE-C-05 Rời ghế, hết vé (viết lại theo SPEC 0.9)
- **Độ lớn:** M. **Phụ thuộc:** BE-C-04.
- **Spec:**
  - `ISeatSessions.EndAsync(playerId, reason)`: set `endedAt`, `endReason`; phát `SessionEnded` (BE-E hủy lần câu), `SeatChanged` (available ngay, không cooldown), `MySeat {seatId, ended, reason}`.
  - Lý do: `left_seat` (`LeaveSeat`, bị từ chối `STATE_CONFLICT` khi đang minigame), `missed_bite` (BE-E gọi khi cá sổng), `ticket_expired`, `disconnect_timeout`, `left_lake`.
  - Timer: `BackgroundService` quét mỗi 250 ms: vé hết hạn với người đang ngồi mà không ở minigame → `ticket_expired`; người đang minigame thì đợi có kết quả rồi lượt quét sau mới kết thúc.
- **Nghiệm thu:** với đồng hồ giả, vé hết đúng hạn thì người đang ngồi đứng dậy; rời ghế xong ngồi lại ngay được, vé vẫn còn; vé hết giữa minigame vẫn ghi cá rồi mới đứng dậy.

### BE-C-06 Mất kết nối và vào lại
- **Độ lớn:** M. **Phụ thuộc:** BE-C-05.
- **Spec:** `OnDisconnectedAsync`: nếu đang giữ ghế → set `disconnectedAt`, phát `PlayerDisconnected` (BE-E hủy lần câu `disconnected`), avatar vẫn ở ghế (đánh dấu offline trong PlayerView [Đề xuất]). Timer: `disconnectedAt + 120000 ≤ now` → `EndAsync(disconnect_timeout)`. `JoinLake` lại trong hạn → xóa `disconnectedAt`, trả snapshot có `mySession`. Không giữ ghế thì disconnect = rời phòng ngay.
- **Nghiệm thu:** ngắt 60 giây rồi vào lại → còn ghế, hạn vé không đổi; ngắt 125 giây → mất ghế, ghế trống ngay.

### BE-C-07 Khôi phục sau restart
- **Độ lớn:** S. **Phụ thuộc:** BE-C-05, BE-C-06.
- **Spec:** khi khởi động: phiên mở có `disconnectedAt` hoặc mọi phiên mở (vì không còn kết nối) → coi như `disconnectedAt = thời điểm khởi động` nếu chưa có; xử lý ghế quá hạn mất kết nối và vé đã hết ngay lần quét đầu.
- **Nghiệm thu:** tắt server khi có phiên còn 5 phút, bật lại sau 30 giây, player vào lại → còn ghế; tắt 3 phút → mất ghế.

### BE-C-08 Test tải phòng
- **Độ lớn:** S. **Phụ thuộc:** BE-C-04.
- **Spec:** script (Node hoặc .NET) mở 20 kết nối, mỗi kết nối di chuyển 10 lần/giây trong 2 phút và mua 20 ghế khác nhau.
- **Nghiệm thu:** không lỗi; p95 thời gian từ Move đến PlayerMoved ở client khác < 150 ms trên máy local; ghi số đo CPU/RAM vào báo cáo.


### BE-C-09 Gia hạn thời lượng giữ ghế
- **Loại khỏi v0.1 theo SPEC 0.9 (GD 2026-11-10):** không còn lệnh gia hạn riêng; mua thêm vé khi còn hạn đã cộng nối hạn (BE-C-04). Giữ ID để tra lịch sử, không giao code.
