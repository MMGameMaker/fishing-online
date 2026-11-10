# Spec chung v0.9 — nguồn duy nhất cho mọi worker

**Trạng thái: Người dùng duyệt cơ chế và các mặc định đã nêu ngày 2026-11-09; cập nhật v0.5: Client xử lý minigame, pool thả cộng dồn, BE có thể làm tuần tự.** Tổng hợp từ [GAMEPLAY_SCOPE.md](../../doc/GAMEPLAY_SCOPE.md) (bản client Phaser + TS). Thay thế [contracts/v1-draft.md](../contracts/v1-draft.md) cho bản đầu. Worker **không tự sửa file này**; cần đổi thì ghi vào báo cáo, lead quyết và tăng phiên bản (xem [QUY_TRINH.md](QUY_TRINH.md)).

Ký hiệu: **[Chốt]** = có trong GAMEPLAY_SCOPE. **[Mặc định đã duyệt]** = đề xuất cụ thể đã được user đồng ý 2026-11-09; luôn đọc config. Chỗ chưa có giá trị/lựa chọn cụ thể vẫn ghi Cần bổ sung dữ kiện, không tự coi đã có số.

## 1. Cấu trúc repo và quyền sửa

BE-A..E là module/nhóm task, không yêu cầu worker riêng hoặc chạy song song. Một BE có thể làm tuần tự toàn bộ; thiếu đầu vào chỉ giữ task phụ thuộc chờ và tiếp tục phần đủ dữ kiện. Không tự tạo nhóm nhân sự mới.

| Đường dẫn | Chủ | Ghi chú |
| --- | --- | --- |
| `docs/v01/` | Lead | Spec, quy trình, tiến độ. Worker chỉ thêm file trong `docs/v01/bao-cao/` và sửa dòng của mình trong `TIEN_DO.md` |
| `docs/v01/fixtures/` | Lead | Config, map, mẫu response, test vector dùng chung |
| `server/FishingOnline.Domain/` + `.Tests/` | BE-B | Thư viện C# thuần, không phụ thuộc DB/ASP.NET |
| `server/FishingOnline.Api/Modules/Identity`, `Wallet`, `Config`, `Common` | BE-A | |
| `server/FishingOnline.Api/Modules/Lake` | BE-C | Phòng, di chuyển, ghế |
| `server/FishingOnline.Api/Modules/Economy`, `Progress` | BE-D | Shop, túi, bán cá, cần, lịch sử, Codex |
| `server/FishingOnline.Api/Modules/Fishing` | BE-E | Điều phối lần câu trên hub |
| `server/FishingOnline.Api/Modules/Social`, `Skin`, `Ranking` | BE-F | |
| `server/FishingOnline.Api/Modules/Admin`, `admin/` | AD | |
| `server/FishingOnline.Api/Persistence/Migrations` | Mọi nhóm BE | Quy tắc riêng ở mục 1.1 |
| `server/FishingOnline.Api/Program.cs` | BE-A | Nhóm khác đăng ký module qua `services.Add<Module>()` và `app.Map<Module>()` trong file của mình; chỉ thêm 1 dòng gọi vào Program.cs |
| `client-v0/src/online/core`, `net`, `state`, `mock` | CL-A | Phaser 3 + TS + Vite trong `client-v0`, mở bằng `fishing.html` |
| `client-v0/src/online/scenes/lake`, `entities` | CL-B | |
| `client-v0/src/online/fishing` | CL-C | |
| `client-v0/src/online/ui` | CL-D | Trừ `ui/social` |
| `client-v0/src/online/ui/social`, `ui/skin`, `ui/ranking` | CL-E | |
| `client-v0/public/online/assets`, `art-src/` | ART | Mỗi bộ asset có `LICENSE.md` ghi nguồn |
| `qa/` | QA | Kịch bản e2e, test tải |

Client Fishing Online nằm trong `client-v0/src/online/`. Gameplay chính chạy trong scene Coral Cove của `client-v0` qua `src/online/bridge/`, 20 ghế đẩu là 20 vị trí ngồi câu; `fishing.html` là trang thử riêng. Toàn bộ resource Fishing Online do dự án tự làm.

### 1.1 Migration EF Core

- Một DbContext chung (`GameDbContext`), schema `game`. Mỗi module cấu hình entity trong `Modules/<X>/Persistence/<X>ModelConfig.cs` (IEntityTypeConfiguration), GameDbContext gọi `ApplyConfigurationsFromAssembly`.
- Mỗi PR tối đa 1 migration, tên `<Nhóm>_<MôTả>`, ví dụ `BEC_Seats`.
- Trước khi merge, rebase lên nhánh chính rồi xóa migration của mình và tạo lại để snapshot không xung đột. Reviewer kiểm tra `dotnet ef migrations list` chạy trên DB trống.

## 2. Luật và công thức

### 2.1 Người chơi mới [Chốt]
- Tặng 100 Gold, sở hữu sẵn `rod_old` và đang dùng nó, level 1, EXP 0.

### 2.2 Vé câu cá và ghế [Chốt GD 2026-11-10; thay luật thuê ghế của 0.3–0.8]
Vé là quyền câu theo thời gian, không gắn với ghế. Bỏ Tier ghế, buff ghế (mục 2.3 cũ), giá theo ghế, cooldown ghế và lệnh gia hạn riêng.

**Vé**
- Mỗi player có tối đa một hạn vé `ticket.expiresAt`. Vé còn hiệu lực khi `serverNow < expiresAt`. Đồng hồ vé chạy theo giờ Server từ lúc mua, kể cả khi không ngồi hoặc mất kết nối. Không hoàn vé, không tự gia hạn.
- `BuyTicket {quantity, expectedPriceVersion}`: `1 ≤ quantity ≤ ticketPricing.maxUnitsPerPurchase`, ngoài khoảng → `INVALID_QUANTITY`. `addedMinutes = quantity × billingUnitMinutes`, `totalGold = quantity × unitPriceGold`. Còn vé: `expiresAt += addedMinutes` (được vượt 60 phút); hết vé hoặc chưa có: `expiresAt = serverNow + addedMinutes`.
- Atomic: khóa hàng vé, trừ Gold + ledger `ticket_purchase` + cập nhật hạn vé + receipt trong một transaction. Gửi lại cùng requestId không trừ tiền hay cộng thời gian lần hai. Client gửi `expectedPriceVersion`; giá đổi → `PRICE_CHANGED` trước khi thu tiền.
- Số test (GD 2026-11-10): 50 Gold/vé 10 phút, tối đa 6 vé mỗi lần mua. Chưa có giới hạn tổng thời gian vé còn lại (GD chưa chốt).

**Ghế**
- 20 ghế `seat-01..seat-20`, trạng thái `available` | `occupied`. Mỗi ghế một người, mỗi player ngồi tối đa 1 ghế.
- `SitDown {seatId}` (Client gửi khi user nhấn E hoặc nút Sit cạnh ghế): cần vé còn hiệu lực (`NO_TICKET`, Client mở popup mua vé), ghế trống (`SEAT_TAKEN`; ai tới trước được ngồi theo transaction/unique index), player chưa ngồi ghế khác (`ALREADY_HAS_SEAT`), player đứng cách ghế ≤ 64 px (`OUT_OF_RANGE`). Thành công: đặt player vào vị trí ghế, phát `SeatChanged`, `MySeat`.
- Đang ngồi thì không đi lại (`Move` bị kéo về). Rời ghế là `LeaveSeat`; Client gửi lệnh này khi user bấm phím di chuyển hoặc nút Rời ghế. Rời ghế không mất vé, ghế trống ngay, không cooldown.
- `LeaveSeat` bị từ chối (`STATE_CONFLICT`) khi lần câu đang ở `minigame`, tức từ lúc thu cần tới khi có kết quả. Ở `waiting`/`bite`, rời ghế hủy lần câu với lý do `left_seat`.
- Ghế kết thúc (`MySeat {seatId, ended: true, reason}`) với các lý do:
  - `left_seat`: user rời ghế.
  - `missed_bite`: cá cắn mà không thu cần kịp; nhân vật tự đứng dậy.
  - `ticket_expired`: vé hết khi đang ngồi. Đang `waiting`/`bite` thì hủy lần câu (`ticket_expired`) và đứng dậy ngay; đang `minigame` thì cho câu nốt, có kết quả rồi mới đứng dậy, không câu tiếp.
  - `disconnect_timeout`: mất kết nối quá `seatSession.disconnectGraceMs` (2 phút). Lần câu dở, kể cả minigame, bị hủy ngay khi mất kết nối (`disconnected`); kết nối lại trong hạn thì vẫn còn ghế.
  - `left_lake`: rời phòng.
- Mọi hạn và trạng thái lưu DB, không tính lại từ thời điểm restart.

### 2.4 Chỉ số tổng
- `strength = level.strength + rod.strength`; `atk = strength`.
- `normalHitZonePct = level + rod`; `weaknessHitZonePct = level + rod`.
- `rareLuck = min(6, level + rod)`; `largeLuck = min(6, level + rod)`. Ghế không cộng Luck từ 2026-11-10.
- Bảng level và cần: xem `fixtures/gameplay-config.v0.json`.

### 2.5 Level [Chốt]
- `expReq[n]` là EXP cần để lên level n từ n−1. Lưu `exp` tích lũy tổng. Level = level lớn nhất có tổng `expReq[2..n] ≤ exp`. Tối đa 10.
- [Mặc định đã duyệt] Ở Lv10 EXP vẫn cộng vào tổng nhưng không lên thêm.

### 2.6 Lần câu
Trạng thái: `waiting` → `bite` → `minigame` → `success` | `failed`; mọi trạng thái chưa kết thúc có thể → `cancelled`.

| Bước | Quy tắc |
| --- | --- |
| CastLine | Đang ngồi ghế (`NOT_IN_SEAT`), vé còn hiệu lực (`NO_TICKET`), không có lần câu đang chạy. Không kiểm tra thời gian vé còn lại |
| waiting | `waitMs = uniformInt(waitMinMs, waitMaxMs)` (3000–6000). Server không gửi `waitMs` cho client |
| bite | Server chốt `speciesId`. Gửi `biteDeadlineAt = now + 3000`. Không gửi loài |
| HookFish | Đến trước `biteDeadlineAt` (dung sai 300 ms tính theo giờ nhận của Server) → `minigame`. Quá hạn → `failed/missed_bite` |
| minigame | Theo mục 2.7 |
| success | Random chiều dài (2.9), cộng EXP, tạo catch, cập nhật Codex, phát `CatchShown` cho phòng |
| failed | Không EXP. Owner nhận `AttemptUpdate`. `missed_bite`: Server kết thúc ghế `missed_bite`. Thua minigame (`timeout`): phát `FailShown` cho cả phòng để người khác thấy icon buồn |
| cancelled | Lý do `ticket_expired`, `disconnected`, `left_seat`. Không EXP, không cá |

User không có lệnh hủy riêng. `LeaveSeat` ở `waiting`/`bite` hủy lần câu với lý do `left_seat`; ở `minigame` bị từ chối.

**Luồng Client [Chốt GD 2026-11-10]:**
- Ngồi xong là tự gửi `CastLine`, không có nút bắt đầu.
- Khi `bite`: chấm than trên đầu, nút có biểu tượng móc câu hiện ở góc phải màn hình kèm thanh đếm ngược 3 giây; bấm đúng nút này để gửi `HookFish`.
- `success`: popup chỉ user thấy, ở lại tới khi user tự tắt; tắt xong tự `CastLine`.
- `failed/timeout` (thua minigame): icon buồn trên đầu, người khác cũng thấy qua `FailShown`; khoảng 2 giây sau tự `CastLine`.
- `failed/missed_bite`: Server kết thúc ghế, nhân vật đứng dậy, không câu tiếp.
- Rời ghế bằng phím di chuyển hoặc nút Rời ghế, được phép mọi lúc trừ khi đang `minigame`.
- Vé hết giữa minigame: vẫn hiện kết quả, sau đó Server kết thúc ghế `ticket_expired` và Client không câu tiếp.
- Chế độ Idle có trong GAMEPLAY_SCOPE nhưng GD chưa mô tả chi tiết, chưa đưa vào spec này.

### 2.7 Minigame do Client xử lý [Chốt 2026-11-09]
- Client chạy toàn bộ kim/vùng xanh-vàng/HP/thời gian/đánh trúng và quyết định thắng/thua; chỉ gửi `SubmitFishingResult {requestId, attemptId, outcome:"success"|"failed"}` một lần kết thúc. Không gửi từng tap; Server không replay hay kiểm chứng độ chính xác minigame.
- HookFish hợp lệ được Server chuyển attempt sang minigame; lưu minigameStartedAt/deadlineAt theo duration của rarity + resultGraceMs cấu hình (mặc định test 1500 ms). Client nhận `MinigameParams {seed:uint32,durationMs,needlePassMs,greenWidth,yellowWidth,shiftMin,shiftMax,missPenaltyMs,fishHp,atk,startedAt,deadlineAt}` và stats snapshot; không được tự tạo attempt, chọn loài, chiều dài, số lượng, EXP hoặc Gold.
- Kết quả chỉ được nhận cho owner, attempt ở minigame và chưa quá deadline. Vé hết giữa minigame không làm mất kết quả. Không bắt buộc thời gian minigame tối thiểu; khai thắng ngay sau Hook có thể được chấp nhận, đây là rủi ro đã chấp nhận, không phải lỗi anti-cheat cần bổ sung.
- Tối đa 1 attempt chưa kết thúc/player bằng constraint DB; Server vẫn quản waiting 3–6 giây và bite/hook. Không cho spam Cast tạo nhiều attempt hoặc gửi result trước Hook.
- Khóa hàng attempt; unique catches.attemptId và movement catch theo attemptId. Một transaction: catch duy nhất + random chiều dài Server + EXP/Codex + giảm remaining/reserved + attempt terminal + receipt. Callback/broadcast sau commit. Không chỉ dedupe bằng requestId vì attacker có thể đổi ID.
- Gửi lặp outcome giống nhau sau commit trả kết quả đã ghi, không thưởng lại; outcome khác sau terminal trả STATE_CONFLICT. Terminal failed/cancelled/timeout không chuyển lại success. Query receipt có thể trả state đã ghi dù session ghế về sau hết hạn; chỉ cấp thưởng lần đầu mới kiểm tra điều kiện đang hiệu lực.
- Hết deadline, mất mạng, hoặc vé hết khi chưa thu cần → kết thúc/hủy theo luật, giải phóng reservation, không có catch. Race result/timeout/expiry/stocking phải resolve dưới transaction/lock; restart không thưởng lại.
- Chấp nhận 100% win rate, bot và farm nhanh qua nhiều lượt hợp lệ; hồ hữu hạn có thể cạn nhanh, EXP/kinh tế/ranking chịu tác động. Không chấp nhận nhiều cá/1 attempt, giả attempt/loài/chiều dài/EXP/Gold, tài nguyên âm hoặc replay reward.
- Công thức HP/ATK, vùng xanh/vàng, RNG/kim và miss penalty ở GAMEPLAY_SCOPE vẫn là luật của Client. CL-C sở hữu lõi TypeScript và unit test, không còn yêu cầu engine C# tính từng tap hay C#/TS cho cùng kết quả mạng.

### 2.7.1 Cảnh báo nghi vấn gian lận BE [User yêu cầu 2026-11-09]
- Rủi ro Client fake win/farm đã được user chấp nhận. BE ghi tín hiệu nghi vấn để tra cứu, không kết luận gian lận chắc chắn và không tự reject kết quả hợp lệ/ban/trừ thưởng vì cảnh báo. Các kiểm tra ownership/state/deadline/unique settlement vẫn bắt buộc, không bị tắt.
- Thu thập theo đồng hồ Server: minigameStartedAt/resultReceivedAt/duration, outcome, attempt/player/session/lake/configVersion, counter hợp lệ/không hợp lệ. Không yêu cầu gửi lại từng tap hoặc tin elapsedMs Client; không token/password/raw body/IP fingerprint trong log.
- Rule cấu hình, mặc định ban đầu để test: win_rate_high = ít nhất50 outcome kết thúc success/failed trong rolling30phút và winRate>=95%; fast_success = ít nhất5 lần success nhận trong<=1000ms sau Hook trong rolling10phút; invalid_result_burst = ít nhất10 lần sai owner/attempt giả/phase sai/terminal outcome conflict trong5phút. Chỉ tính attempt duy nhất; callback retry hợp lệ/idempotent không tính là gian lận, cancelled/disconnect không đưa vào mẫu win rate.
- Trường cảnh báo: signalId,playerId,ruleCode,ruleVersion,severity,windowStart/windowEnd,sampleCount,observedValue,threshold,representativeAttemptIds (giới hạn10),firstSeenAt,lastSeenAt,occurrences,status(open/reviewed/dismissed),reviewedBy/reviewedAt/reviewNote. Ban đầu severity informational cho win rate/nhanh, warning cho invalid burst; không dùng nhãn cheater.
- Một cảnh báo/player/rule/window bucket, lần sau cập nhật occurrences/lastSeen, không spam một dòng/mỗi retry. Dữ liệu gốc rolling phải rõ timestamp; bucket chỉ dedupe alert, không thay rolling evaluation. Rule version đi kèm threshold để đọc lại được sau đổi config.
- Event sau settlement commit qua outbox rồi xử lý thống kê; lỗi anomaly worker không rollback/thưởng lại hoặc làm client nhận lỗi giả sau reward commit. Dedupe theo eventId/attemptId; invalid requests ghi kênh riêng có giới hạn, không ghi raw token/payload. Redis phục vụ counter/cache; record cảnh báo bền vững PostgreSQL, phục hồi không nhân cảnh báo/thưởng.
- Xuất structured logs và truy vấn nội bộ theo player/rule/time; Admin dùng tab tra cứu player hiện có nếu triển khai, quyền player.read/audit phù hợp và review có audit. Không tự gửi email/Slack/webhook hoặc thêm dashboard riêng. Ban đầu retention30 ngày cấu hình được, sample ID giới hạn để tránh tăng dữ liệu vô hạn.
- Kiểm tra: 50/50 success tạo cảnh báo nhưng mỗi attempt vẫn chỉ1 cá; 4 fast success chưa cảnh báo, lần5 có; retry100 lần cùng attempt không tăng sample; fake attempt burst có signal và vẫn bị từ chối theo validation; đổi config không mất ruleVersion; worker restart không nhân signal, worker lỗi không cấp thưởng lại.

### 2.8 Spawn loài [Chốt 2026-11-09; số test]
- L = min(6, tổng rareLuck level + cần). Tỷ lệ theo basis point: common 6050 - 190L; uncommon 2500 + 50L; rare 1000 + 80L; epic 400 + 50L; legendary 50 + 10L. Tổng luôn 10000.
- Tại bite random rarity, rồi chọn đều loài trong rarity theo GAMEPLAY_SCOPE. Không bỏ qua Rare Luck; không dùng công thức 60/25/10/4/1 cũ.
- Khi quần thể loài/rarity cạn: không tự spawn vô hạn hoặc tự renormalize; reservation bite đã duyệt; luật fallback cạn cá chưa có lựa chọn cụ thể ở BE-E-08.

### 2.9 Chiều dài [Chốt]
- Đơn vị lưu: số nguyên 0,1 cm (`lengthTenthCm`). Config lưu `minTenthCm`, `maxTenthCm`.
- Xác suất bậc tính bằng basis point (1/10.000): Thường `7000 − 200L`, Lớn `2500 + 150L`, Rất lớn `490 + 50L`, Tối đa `10`. `L = largeLuck`.
- Vị trí: Thường `[0, 0.6)`, Lớn `[0.6, 0.9)`, Rất lớn `[0.9, 0.999]`, Tối đa `= 1`. Random đều.
- `lengthTenthCm = round(min + (max − min) × pos)` (làm tròn nửa lên).
- `isNew` = lần đầu bắt loài này. `isRecord` = không phải lần đầu và dài hơn kỷ lục cũ.

### 2.10 Vật phẩm đã bỏ
Thính đã bỏ khỏi v0.1 ngày 2026-11-09. Không có UseChum, chumActive, số lượng/item/effect/offer tương ứng. BE-D-05 giữ ID với trạng thái Loại khỏi v0.1, không giao code.

### 2.11 Shop và bán cá [Chốt + Đề xuất]
- Bán: `rod_steel_awl` 300, `rod_high_performer` 300, `rod_bliss` 800, `rod_giant_caster` 2000. Cần đã có → `ROD_ALREADY_OWNED`.
- Bán cá theo `catchId` hoặc `all: true`; giá theo loài. Cá đã bán không còn trong túi; Codex/kỷ lục không đổi.
- [Mặc định đã duyệt] Đổi cần chỉ khi không trong lần câu; túi chưa giới hạn.

### 2.12 Quần thể hữu hạn, thả cộng dồn [Chốt 2026-11-09]
- Admin được thả tiếp nhiều đợt vào cùng hồ/loài. Mỗi đợt cộng thêm quantity vào remaining hiện tại, không thay bằng số mới/reset hồ, không ghi đè cá đang reserved; loài mới trong catalog tạo số tồn tương ứng.
- Ví dụ còn 30 perch, thả thêm 100 → remaining 130; nếu 5 đang reserved thì available 125. Bắt thành công 1 → remaining129, reserved4. Failed/cancel trả reservation, không giảm remaining.
- `remaining >= reserved >= 0`; giữ 1 cá ở bite đã được user đồng ý theo đề xuất còn lại. Thắng giảm remaining/reserved đúng1, thua/hủy giải phóng; reservation bền vững theo attempt.
- Thả: atomic batch completion + increment tồn + movement, unique execution batchId/lineId. Retry cùng batch không cộng lại; batch mới có chủ ý được cộng tiếp dù nội dung giống nhau. Không dedupe theo loài/số lượng làm mất đợt mới.
- Catch/result và thả cùng lúc phải khóa/update DB đúng thứ tự, không lost update. Publish config, login hoặc restart không reset pool. Tồn = tổng ban đầu + tổng thả - tổng bắt, theo hồ/loài; reservation không trừ twice.
- AD-06/07, BE-E-08 và QA-04 chịu phần triển khai. Cần bổ sung dữ kiện chưa có lựa chọn cụ thể: initial stock, hành vi rarity/loài hết cá, hồ trống có cho thuê/cast không, hiển thị tồn cho Player. Không tự coi RNG vô hạn/renormalize là fallback đã duyệt.

## 3. Contract HTTP (base `/api/v1`)

Quy ước giữ từ 0.1-draft: JSON camelCase; Gold là chuỗi số nguyên (`"100"`); thời gian ISO-8601 UTC; thành công `{ "data": ..., "traceId": "..." }`; lỗi `{ "error": { "code", "message", "retryable" }, "traceId" }`. Mọi request thay đổi tài nguyên gửi header `Idempotency-Key: <uuid>`; cùng key cùng payload trả kết quả cũ; khác payload → 409 `IDEMPOTENCY_CONFLICT`.

| Method / path | Request | Response `data` | Nhóm |
| --- | --- | --- | --- |
| POST /auth/login | `{ firebaseIdToken }` | `{ accessToken, expiresAt, isNew, player: PlayerProfile }` | BE-A |
| POST /auth/refresh | cookie refresh | `{ accessToken, expiresAt }` | BE-A |
| POST /auth/logout | — | 204 | BE-A |
| GET /me | — | `PlayerProfile` | BE-A |
| PUT /me/display-name | `{ displayName }` (3-16 ký tự) | `PlayerProfile` | BE-A |
| GET /catalog | — | Toàn bộ config trừ `spawn`, gồm `levels, rods, fish, seatSession, fishing, minigame, lengthTiers, shopOffers, ticketPricing` | BE-A |
| GET /me/progress | — | `{ level, exp, expToNext, stats: Stats, breakdown: { level: Stats, rod: Stats } }` | BE-D |
| GET /me/inventory | — | `{ inventoryVersion, gold, equippedRodId, rods: [rodId], items: [{ itemId, quantity }], fish: [{ catchId, speciesId, lengthTenthCm, caughtAt }] }` | BE-D |
| PUT /me/equipped-rod | `{ rodId }` | `{ equippedRodId }` | BE-D |
| POST /shop/buy | `{ offerId, quantity }` | `{ gold, inventory }` | BE-D |
| POST /shop/sell-fish | `{ catchIds: [] }` hoặc `{ all: true }` | `{ soldCount, goldEarned, gold }` | BE-D |
| GET /me/codex | — | `{ species: [{ speciesId, discovered, totalCaught, bestLengthTenthCm, firstCaughtAt }] }` | BE-D |
| GET /me/history?cursor=&limit= | — | `{ items: [{ attemptId, outcome, reason, speciesId, lengthTenthCm, endedAt }], nextCursor }` | BE-D |
| GET /skins, PUT /me/skin | `{ skinId }` | — | BE-F |
| GET /rankings/{boardId} | — | chờ GD | BE-F |

`PlayerProfile = { playerId, displayName, level, exp, gold, selectedSkinId, equippedRodId }`.
`Stats = { strength, normalHitZonePct, weaknessHitZonePct, rareLuck, largeLuck }`.

## 4. Contract SignalR hub `/hubs/game`

Kết nối kèm `access_token`. Mọi method nhận object có `requestId` (uuid) và trả `CommandAck = { requestId, ok, error: null | { code, message }, data: null | object }`. Ack `ok` chỉ nghĩa lệnh được nhận; thay đổi state đến qua event.

| Method | Tham số | Ack data | Nhóm |
| --- | --- | --- | --- |
| JoinLake | `{ requestId }` | `LakeSnapshot` | BE-C |
| Move | `{ requestId, seq, x, y, dir }` | null | BE-C |
| BuyTicket | `{ requestId, quantity, expectedPriceVersion }` | `{ ticket: MyTicket, gold, chargedGold }` | BE-C |
| SitDown | `{ requestId, seatId }` | `{ seat: MySeat }` | BE-C |
| LeaveSeat | `{ requestId }` | null | BE-C |
| CastLine | `{ requestId }` | `{ attemptId }` | BE-E |
| HookFish | `{ requestId, attemptId }` | null | BE-E |
| SubmitFishingResult | `{ requestId, attemptId, outcome: "success"\|"failed" }` | `{ attempt: AttemptView }` | BE-E |
| SendChat | `{ requestId, text }` | null | BE-F |
| SendEmoji | `{ requestId, emojiId }` | null | BE-F |

| Event | Gửi cho | Payload |
| --- | --- | --- |
| LakeSnapshot | caller | `{ mapId, mapVersion, configVersion, serverTime, players: [PlayerView], seats: [SeatView], myTicket: MyTicket \| null, mySeat: MySeat \| null, myAttempt: AttemptView \| null }` |
| PlayerJoined / PlayerLeft | phòng | `PlayerView` / `{ playerId }` |
| PlayerMoved | phòng trừ người gửi | `{ playerId, x, y, dir, seq }` |
| PositionCorrected | người gửi | `{ x, y, seq }` |
| SeatChanged | phòng | `SeatView` |
| MyTicket | owner | `MyTicket` sau mỗi lần mua |
| MySeat | owner | `MySeat` hoặc `{ seatId, ended: true, reason }` |
| AttemptUpdate | owner | `AttemptView` |
| CatchShown | phòng | `{ playerId, speciesId, rarity, shownUntil }` |
| FailShown | phòng | `{ playerId, shownUntil }`, `shownUntil = now + fishing.failShownMs` |
| SkinChanged | phòng | `{ playerId, skinId }` |
| ChatReceived / EmojiReceived | phòng | `{ messageId, playerId, text }` / `{ playerId, emojiId }` |

- `PlayerView = { playerId, displayName, skinId, rodId, x, y, dir, seatId | null, fishing: bool }`
- `SeatView = { seatId, state: "available"|"occupied", occupantPlayerId | null }`
- `MyTicket = { expiresAt, purchasedMinutes, ticketVersion, priceVersion }`; `purchasedMinutes` là tổng phút đã mua từ trước tới nay
- `MySeat = { seatId, sessionId, sitAt }`
- `ticketPricing` trong catalog: `{ billingUnitMinutes, unitPriceGold, maxUnitsPerPurchase, priceVersion, status }`
- `AttemptView = { attemptId, phase, reason | null, biteDeadlineAt | null, minigame: MinigameParams & { startedAt, deadlineAt } | null, state: null, result: { speciesId, rarity, lengthTenthCm, isNew, isRecord, expGained, level, levelUp } | null }`

## 5. Mã lỗi

| Code | Khi nào |
| --- | --- |
| UNAUTHENTICATED, SESSION_EXPIRED | Token thiếu/sai/hết hạn |
| VALIDATION_FAILED | Tham số sai kiểu, ngoài khoảng |
| IDEMPOTENCY_CONFLICT | Cùng key khác payload |
| RATE_LIMITED | Gửi quá nhanh |
| SEAT_TAKEN | Ghế đang có người (UI: "ghế đang được sử dụng") |
| ALREADY_HAS_SEAT | Player đã giữ ghế khác |
| NOT_IN_SEAT | Lệnh cần đang ngồi ghế |
| NO_TICKET | Không có vé hoặc vé đã hết (409) |
| OUT_OF_RANGE | Đứng quá xa ghế khi `SitDown` |
| INSUFFICIENT_GOLD | Thiếu Gold |
| ATTEMPT_ACTIVE | Đã có lần câu đang chạy |
| NO_ACTIVE_ATTEMPT | attemptId không phải lần câu đang chạy |
| BITE_EXPIRED | HookFish quá hạn |
| RESULT_EXPIRED | Kết quả gửi sau deadline attempt; không thưởng |
| ROD_NOT_OWNED, ROD_ALREADY_OWNED | Cần chưa có / đã có |
| FISH_NOT_FOUND | catchId không thuộc user hoặc đã bán |
| INVALID_QUANTITY, PRICE_CHANGED | Số vé ngoài khoảng cho phép (400), đơn giá đổi (409) |
| STATE_CONFLICT | Trạng thái không cho phép (tên trùng, phòng đầy, sửa đồng thời, rời ghế khi đang minigame) |

## 6. Interface giữa các module Server

Để giữ module độc lập dù BE làm tuần tự hay song song tùy chọn, code theo interface sau; nhóm chủ triển khai thật, nhóm khác dùng bản giả trong test.

```csharp
// BE-A
public interface ICurrentPlayer { Guid PlayerId { get; } }
public interface IConfigProvider { GameplayConfig Current { get; } GameplayConfig Get(string version); }
public interface IWallet {
  // Chạy trong transaction của caller (DbContext dùng chung). Ném InsufficientGoldException.
  Task<long> DebitAsync(Guid playerId, long amount, string reason, string refId, CancellationToken ct);
  Task<long> CreditAsync(Guid playerId, long amount, string reason, string refId, CancellationToken ct);
  Task<long> GetBalanceAsync(Guid playerId, CancellationToken ct);
}
public interface INewPlayerGrant { Task GrantAsync(Guid playerId, CancellationToken ct); } // BE-D triển khai: cấp rod_old
public interface IIdempotency { Task<T> RunAsync<T>(Guid playerId, string op, Guid key, string payloadHash, Func<Task<T>> action); }

// BE-C
public interface ISeatSessions {
  Task<SeatSessionInfo?> GetActiveAsync(Guid playerId, CancellationToken ct); // chỉ trả khi đang ngồi: sessionId, seatId, ticketExpiresAt
  Task<bool> EndAsync(Guid playerId, string reason, CancellationToken ct);
  event Func<SeatSessionEnded, Task> SessionEnded; // BE-E hủy lần câu khi nhận
  event Func<Guid, Task> PlayerDisconnected;
}

// BE-E hủy lần câu khi nhận
  event Func<Guid, Task> PlayerDisconnected;
}

// BE-E
public interface IFishingState { bool IsBusy(Guid playerId); bool IsInMinigame(Guid playerId); } // đang câu / đang minigame

// BE-D
public interface IProgress { Task<PlayerStats> GetStatsAsync(Guid playerId, CancellationToken ct); }
public interface ICatchRecorder { Task<CatchRecordResult> RecordAsync(Guid playerId, Guid attemptId, string speciesId, int lengthTenthCm, int exp, CancellationToken ct); } // trả isNew, isRecord, level, levelUp

// BE-B (thuần, không I/O). Record GameplayConfig định nghĩa trong FishingOnline.Domain, BE-A dùng lại.
// FishingRules.WaitMs, SpawnPicker.Pick, LengthRoller.Roll, MinigameEngine, LevelTable, StatCalculator
```

## 7. Fixture dùng chung

| File | Nội dung | Chủ |
| --- | --- | --- |
| `fixtures/gameplay-config.v0.json` | Toàn bộ số liệu tạm của GAMEPLAY_SCOPE | Lead |
| `fixtures/lake-map.placeholder.json` | Map tạm: 20 ghế, vùng đi được, spawn. CL-B thay bằng map thật, giữ nguyên schema và seatId | Lead → CL-B |
| `fixtures/api-samples.v0.json` | Mẫu response/event cho mock client | Lead |
| `fixtures/minigame-vectors.v0.json` | Test vector cho lõi TS Client (không dùng xác thực Server) | CL-C |

## 8. Lịch sử thay đổi

| Phiên bản | Ngày | Mục | Nội dung | Nhóm bị ảnh hưởng |
| --- | --- | --- | --- | --- |
| 0.2 | 2026-11-09 | Toàn bộ | Bản đầu, tổng hợp từ GAMEPLAY_SCOPE (Phaser + TS) | Tất cả |
| 0.3 | 2026-11-09 | 2.2, 2.10, API/fixture | User bỏ thính, mua ghế theo thời lượng/đơn giá/gia hạn; đồng bộ spawn đã chốt và nguồn scope; DTO/config test là đề xuất | BE-A/C/D/E, CL-A/B/C/D, AD, ART, QA |

| 0.4 | 2026-11-09 | 2.7/2.12/contract/kế hoạch | User chốt Client báo kết quả, một catch/attempt, pool thả cộng dồn; đồng ý mặc định còn lại, BE tuần tự được | BE/Client/AD/QA |

Nguồn phân tích replay/business rules: [OWASP Business Logic Security](https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html). Các giá trị ownership/price/reward và state tài nguyên giữ phía Server; user chấp nhận riêng rủi ro Client báo kết quả minigame.

| 0.5 | 2026-11-09 | 2.7.1 | User chấp nhận rủi ro Client outcome, thêm cảnh báo BE chỉ quan sát; threshold test cấu hình được, không auto-ban | BE-E, AD, QA |

| 0.6 | 2026-11-09 | 1 | User chốt đặt client trong `client-v0` thay cho `client-web`; chỉ đổi đường dẫn, không đổi luật/contract | CL-A/B/C/D, SOC, ART, QA |

| 0.7 | 2026-11-09 | 1 | User chốt gameplay chạy trong scene Coral Cove và resource do dự án tự làm; không đổi luật/contract | CL-B/C, ART, QA |

| 0.8 | 2026-11-09 | 2.6 | User chốt tự câu sau khi ngồi, nút Kéo giữa màn hình và chạm bất kỳ, popup chạm mới đóng, thua chờ 2 giây, chưa câu được cá vẫn rời ghế được; không đổi contract | CL-B/C, QA |

| 0.9 | 2026-11-10 | 2.2, 2.4, 2.6, 2.8, 3, 4, 5, 6 | Theo GAMEPLAY_SCOPE GD 2026-11-10: vé theo thời gian tách khỏi ghế (`BuyTicket`, `SitDown`), bỏ Tier/buff/cooldown/gia hạn ghế, Luck tối đa 6; nút móc câu góc phải, trượt cá thì tự đứng dậy, không rời ghế khi đang minigame; thêm event `FailShown`. Đổi contract | BE-A/B/C/E, CL-A/B/C, AD, QA |
