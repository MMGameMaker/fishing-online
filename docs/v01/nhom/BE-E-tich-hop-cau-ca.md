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
- **Nghiệm thu:** với `TimeProvider` giả: Tier 3 chuyển bite sau 3-6 giây; Tier 1 1-4 giây; không giữ ghế → `NOT_IN_SEAT`.

### BE-E-03 HookFish và minigame
- **Độ lớn:** M. **Phụ thuộc:** BE-E-02; BE-B-06.
- **Spec:** `HookFish {attemptId}` → `minigame`: seed = 32 bit ngẫu nhiên an toàn, params từ rarity + `IProgress` stats, `startedAt = now`; gửi `AttemptUpdate` có `minigame`. `MinigameTap {attemptId, seq, tMs}`: `serverElapsed = now − startedAt`; gọi engine; ack trả `{result, hp, remainingMs}`, từ chối → ack lỗi `TAP_REJECTED`. Giới hạn 15 tap/giây.
- **Nghiệm thu:** HookFish sau hạn → `BITE_EXPIRED` và attempt `failed/missed_bite`; chạy kịch bản từ `minigame-vectors.v0.json` qua hub → kết quả từng tap khớp vector.

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
- **Spec:** test tích hợp chạy Server thật + PostgreSQL: login dev → JoinLake → BuySeatTicket  → CastLine → chờ bite → HookFish → tap theo vector thắng → kiểm tra túi có cá, EXP tăng, ledger đúng → bán cá → Gold tăng.
- **Nghiệm thu:** chạy được bằng `dotnet test --filter Category=E2E`.

### BE-E-08 Quần thể cá hữu hạn và tích hợp lượt câu
- **Độ lớn:** L. **Phụ thuộc:** BE-E-04/05/06, BE-B-04, BE-D-06, AD-06; contract chung do lead thống nhất. API/persistence tồn cá thuộc module Fishing, AD chỉ gọi service để thả; không hai nhóm cùng sửa entity tồn.
- **Đã chốt 2026-11-09:** cá hữu hạn theo hồ/loài; thả thêm tăng tồn; bắt thành công giảm đúng 1 con. Spawn rarity đã duyệt vẫn là đầu vào, không tự thay bằng số lượng tồn.
- **Đề xuất dữ liệu:** `lake_fish_populations(lakeId,speciesId,remaining,reserved,version)` và movement append-only, unique nguồn batch/catch. Invariant remaining >= reserved >= 0; available = remaining - reserved. Bắt thành công phải ghi catch + EXP/Codex + movement giảm tồn + attempt success cùng transaction, unique attemptId chống giảm/thưởng lặp.
- **Đề xuất cần GD duyệt:** giữ chỗ 1 cá ở thời điểm bite (remaining chưa giảm, reserved tăng), thắng giảm cả remaining/reserved, thua/mất mạng/hết vé trả reserved; reservation bền vững theo attempt và giải phóng khi recovery/hủy. Đây là phương án ngăn 2 user cùng nhận con cá cuối, chưa phải luật được chốt.
- **Điểm cần chốt trước code:** chọn rarity/loài khi loài đã hết; rarity hết cá xử lý thế nào; hồ trống có cho mua vé/cast không; tồn khởi đầu; có hiển thị số cá cho Player không; số cá áp cho lake instance nào. Không tự renormalize tỷ lệ spawn hoặc tạo cá vô hạn để fallback. Snapshot/config phải nêu version dùng, không đổi loài đã chốt giữa attempt khi có đợt thả mới.
- **Nghiệm thu:** hồ có 1 cá, 2 attempt cạnh tranh không thể tạo 2 catch; thành công giảm 1, thất bại/hủy không giảm remaining; retry/restart không giảm trùng hoặc giữ reservation vĩnh viễn; đợt thả đang chạy đồng thời catch không mất cập nhật; đối chiếu tổng thả - tổng bắt = remaining; test điều kiện hồ/loài hết cá theo luật được duyệt.
