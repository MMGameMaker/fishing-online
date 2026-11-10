# BE-E — Tích hợp lần câu trên Server

Mục tiêu: nối thư viện luật (BE-B) với ghế (BE-C) và kinh tế (BE-D) thành vòng câu chạy thật qua hub.
Đọc trước: [SPEC_CHUNG](../SPEC_CHUNG.md) mục 2.6, 2.7, 4, 6.
Phạm vi file: `server/FishingOnline.Api/Modules/Fishing/`, `GameHub.Fishing.cs`, migration `BEE_*`.
Phụ thuộc: đây là nhóm tích hợp. Bắt đầu được ngay với bản giả của `ISeatSessions`, `IProgress`, `ICatchRecorder`; cổng hoàn thành cần BE-B-08, BE-C-05, BE-D-06 đã Xong.

---

### BE-E-01 Bảng lần câu và IFishingState
- **Độ lớn:** S. **Phụ thuộc:** không.
- **Spec:** bảng `fishing_attempts(attemptId PK, playerId, sessionId, phase, reason null, speciesId null, rarity null, seed bigint null, configVersion, snapshotJson, startedAt, endedAt null, lengthTenthCm null)`. Unique partial index `(playerId) where endedAt is null`. Triển khai `IFishingState.IsBusy(playerId)` (BE-C, BE-D dùng).
- **Nghiệm thu:** chèn lần câu thứ 2 đang mở cho cùng player bị DB chặn.

### BE-E-02 CastLine và vòng thời gian
- **Độ lớn:** M. **Phụ thuộc:** BE-E-01; BE-B-08 (hoặc bản giả).
- **Spec:**
  - `CastLine`: lấy phiên ghế (`NOT_IN_SEAT`), không có lần câu mở (`ATTEMPT_ACTIVE`), pin `configVersion` của phiên, `waitMs` từ `FishingRules`. Lưu attempt `waiting`, trả `{attemptId}`, phát `AttemptUpdate` cho owner và `PlayerView.fishing = true` cho phòng.
  - `FishingTicker` (BackgroundService, 50 ms) gọi `attempt.Tick(now)` cho các attempt đang mở trong RAM; mỗi chuyển trạng thái: lưu `snapshotJson` + phase, phát `AttemptUpdate`.
  - Ở bước bite: chọn loài bằng `SpawnPicker` với `rareLuck` từ `IProgress`.
- **Nghiệm thu:** với `TimeProvider` giả: mọi ghế chuyển bite sau 3-6 giây (SPEC 0.9 bỏ Lure Time ghế); không ngồi ghế → `NOT_IN_SEAT`; vé hết → `NO_TICKET`.

### BE-E-03 HookFish và nhận kết quả Client
- **Độ lớn:** M. **Phụ thuộc:** BE-E-02, BE-B-06.
- **Spec:** Hook hợp lệ → minigame, lưu startedAt/deadlineAt/params/stats và gửi owner. Client chỉ gọi SubmitFishingResult{requestId,attemptId,outcome}; Server không nhận/tính từng tap. Khóa attempt, kiểm tra owner/state/deadline/seat; một active attempt/player. Repeat cùng outcome trả terminal result cũ; outcome trái sau terminal → STATE_CONFLICT. Payload chỉ outcome, không fish count/reward.
- **Nghiệm thu:** 100 request result song song, kể cả đổi requestId chỉ 1 catch/EXP/debit pool; result trước Hook/sai owner/attempt giả/đã cancelled/failed/quá hạn không được thưởng. Client fake success hợp lệ được chấp nhận theo quyết định user. Không có MinigameTap/latency replay validation.

### BE-E-04 Kết thúc lần câu và trả thưởng
- **Độ lớn:** M. **Phụ thuộc:** BE-E-03; BE-D-06 (hoặc giả).
- **Spec:** thắng → một transaction: `ICatchRecorder.RecordAsync` + update attempt `success` với chiều dài (`LengthRoller`, `largeLuck` từ stats lúc hook). Sau commit: `AttemptUpdate` có `result`; `CatchShown` cho phòng với `shownUntil = now + 5000`; `PlayerView.fishing = false`. Thua → `failed` + reason, chỉ owner nhận.
- **Nghiệm thu:** cùng attempt không bao giờ có 2 dòng catch (thử gọi kết thúc 2 lần song song); người khác trong phòng nhận `CatchShown`, không nhận `AttemptUpdate`.

### BE-E-05 Hủy theo luật
- **Độ lớn:** S. **Phụ thuộc:** BE-E-02.
- **Spec:** nghe `ISeatSessions.SessionEnded` → `Cancel(session_expired | left_seat)`; `PlayerDisconnected` → `Cancel(disconnected)`. Không có lệnh hủy từ client.
- **Nghiệm thu:** phiên hết hạn giữa minigame → attempt `cancelled/session_expired`, không có catch; ngắt kết nối giữa waiting → `cancelled/disconnected`.

### BE-E-06 Khôi phục sau restart
- **Độ lớn:** S. **Phụ thuộc:** BE-E-04.
- **Spec:** khởi động: mọi attempt mở → `cancelled/disconnected` (vì kết nối đã mất). Không cấp thưởng cho attempt chưa `success`.
- **Nghiệm thu:** tắt server giữa minigame, bật lại → attempt bị hủy, không có catch, player câu lại được.

### BE-E-07 Test end-to-end Server
- **Độ lớn:** M. **Phụ thuộc:** BE-E-01 đến BE-E-06, BE-C, BE-D xong.
- **Spec:** test tích hợp chạy Server thật + PostgreSQL: login dev → JoinLake → BuyTicket → SitDown → CastLine → chờ bite → HookFish → gửi success từ Client sau Hook → kiểm tra túi có cá, EXP tăng, ledger đúng → bán cá → Gold tăng.
- **Nghiệm thu:** chạy được bằng `dotnet test --filter Category=E2E`.

### BE-E-08 Quần thể cá hữu hạn và tích hợp lượt câu
- **Độ lớn:** L. **Phụ thuộc:** BE-E-04/05/06, BE-B-04, BE-D-06, AD-06; contract chung do lead thống nhất. API/persistence tồn cá thuộc module Fishing, AD chỉ gọi service để thả; không hai nhóm cùng sửa entity tồn.
- **Đã chốt 2026-11-09:** cá hữu hạn theo hồ/loài; thả tiếp cộng dồn remaining, không ghi đè/reset pool; bắt thành công giảm đúng 1 con. Spawn rarity đã duyệt vẫn là đầu vào, không tự thay bằng số lượng tồn.
- **Dữ liệu theo mặc định đã duyệt:** `lake_fish_populations(lakeId,speciesId,remaining,reserved,version)` và movement append-only, unique nguồn batch/catch. Invariant remaining >= reserved >= 0; available = remaining - reserved. Bắt thành công phải ghi catch + EXP/Codex + movement giảm tồn + attempt success cùng transaction, unique attemptId chống giảm/thưởng lặp.
- **Đã duyệt 2026-11-09:** giữ chỗ 1 cá ở thời điểm bite (remaining chưa giảm, reserved tăng), thắng giảm cả remaining/reserved, thua/mất mạng/hết vé trả reserved; reservation bền vững theo attempt và giải phóng khi recovery/hủy. Đây là phương án ngăn 2 user cùng nhận con cá cuối, đã được user đồng ý qua các đề xuất M0 còn lại.
- **Điểm cần chốt trước code:** chọn rarity/loài khi loài đã hết; rarity hết cá xử lý thế nào; hồ trống có cho mua vé/cast không; tồn khởi đầu; có hiển thị số cá cho Player không; số cá áp cho lake instance nào. Không tự renormalize tỷ lệ spawn hoặc tạo cá vô hạn để fallback. Snapshot/config phải nêu version dùng, không đổi loài đã chốt giữa attempt khi có đợt thả mới.
- **Nghiệm thu:** hồ có 1 cá, 2 attempt cạnh tranh không thể tạo 2 catch; thành công giảm 1, thất bại/hủy không giảm remaining; retry/restart không giảm trùng hoặc giữ reservation vĩnh viễn; đợt thả đang chạy đồng thời catch không mất cập nhật; đối chiếu tổng thả - tổng bắt = remaining; test điều kiện hồ/loài hết cá theo luật được duyệt.

- **Bổ sung cộng dồn:** còn30/thả100 →130; reserved không thay khi thả; 2 batch mới giống nhau đều cộng, cùng batch retry chỉ cộng1; cạnh tranh thả/catch không lost update. Không reset pool sau login/restart/publish.


### BE-E-09 Cảnh báo nghi vấn gian lận — chỉ quan sát
- **Độ lớn:** M. **Phụ thuộc:** BE-E-03/04, BE-A-05 config; không chặn triển khai vòng câu trước.
- **Phạm vi:** module Fishing/monitoring; record `player_security_signals` và consumer outbox riêng; không sửa Client để gửi tap. Chủ nguồn rule: SPEC0.5 mục2.7.1.
- **Spec:** rule win rate/fast success/invalid result burst theo config và timestamp Server; dedupe attempt/event; record evidence có giới hạn/ruleVersion, structured log và query theo player. Hợp lệ repeat do retry/network không bị tính gian lận. User chấp nhận fake success: chỉ đánh dấu nghi vấn, không auto-ban/reject hợp lệ/trừ tiền/thu hồi cá.
- **Nghiệm thu:**50/50 success tạo1 signal/win-rate window nhưng vẫn nhận đúng1 cá/attempt;5 success<=1s tạo fast signal; invalid burst ghi warning và validation vẫn chặn; retry100 lần cùng outcome không tăng mẫu; lỗi consumer/restart không reward/signal trùng; không log token/payload nhạy cảm. Thống kê không nằm trong critical transaction settlement, dùng committed outbox để không mất record sau crash.
