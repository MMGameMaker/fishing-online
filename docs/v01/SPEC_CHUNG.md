# Spec chung v0.2 — nguồn duy nhất cho mọi worker

**Trạng thái: Đề xuất 2026-11-09, chờ duyệt.** Tổng hợp từ [GAMEPLAY_SCOPE.md](../../doc/GAMEPLAY_SCOPE.md) (bản client Phaser + TS). Thay thế [contracts/v1-draft.md](../contracts/v1-draft.md) cho bản đầu khi được duyệt. Worker **không tự sửa file này**; cần đổi thì ghi vào báo cáo, lead quyết và tăng phiên bản (xem [QUY_TRINH.md](QUY_TRINH.md)).

Ký hiệu: **[Chốt]** = có trong GAMEPLAY_SCOPE. **[Đề xuất]** = mặc định để code không bị chặn, chờ GD; luôn đọc từ config để đổi không cần sửa mã.

## 1. Cấu trúc repo và quyền sửa

| Đường dẫn | Chủ | Ghi chú |
| --- | --- | --- |
| `docs/v01/` | Lead | Spec, quy trình, tiến độ. Worker chỉ thêm file trong `docs/v01/bao-cao/` và sửa dòng của mình trong `TIEN_DO.md` |
| `docs/v01/fixtures/` | Lead | Config, map, mẫu response, test vector dùng chung |
| `server/FishingOnline.Domain/` + `.Tests/` | BE-B | Thư viện C# thuần, không phụ thuộc DB/ASP.NET |
| `server/FishingOnline.Api/Modules/Identity`, `Wallet`, `Config`, `Common` | BE-A | |
| `server/FishingOnline.Api/Modules/Lake` | BE-C | Phòng, di chuyển, ghế |
| `server/FishingOnline.Api/Modules/Economy`, `Progress` | BE-D | Shop, túi, bán cá, thính, cần, lịch sử, Codex |
| `server/FishingOnline.Api/Modules/Fishing` | BE-E | Điều phối lần câu trên hub |
| `server/FishingOnline.Api/Modules/Social`, `Skin`, `Ranking` | BE-F | |
| `server/FishingOnline.Api/Modules/Admin`, `admin/` | AD | |
| `server/FishingOnline.Api/Persistence/Migrations` | Mọi nhóm BE | Quy tắc riêng ở mục 1.1 |
| `server/FishingOnline.Api/Program.cs` | BE-A | Nhóm khác đăng ký module qua `services.Add<Module>()` và `app.Map<Module>()` trong file của mình; chỉ thêm 1 dòng gọi vào Program.cs |
| `client-web/src/core`, `net`, `state`, `mock` | CL-A | Project Phaser 3 + TS + Vite mới |
| `client-web/src/scenes/lake`, `entities` | CL-B | |
| `client-web/src/fishing` | CL-C | |
| `client-web/src/ui` | CL-D | Trừ `ui/social` |
| `client-web/src/ui/social`, `ui/skin`, `ui/ranking` | CL-E | |
| `client-web/public/assets`, `art-src/` | ART | Mỗi bộ asset có `LICENSE.md` ghi nguồn |
| `qa/` | QA | Kịch bản e2e, test tải |

`client-v0/` chỉ để tham khảo logic, không sửa, không chép art.

### 1.1 Migration EF Core

- Một DbContext chung (`GameDbContext`), schema `game`. Mỗi module cấu hình entity trong `Modules/<X>/Persistence/<X>ModelConfig.cs` (IEntityTypeConfiguration), GameDbContext gọi `ApplyConfigurationsFromAssembly`.
- Mỗi PR tối đa 1 migration, tên `<Nhóm>_<MôTả>`, ví dụ `BEC_Seats`.
- Trước khi merge, rebase lên nhánh chính rồi xóa migration của mình và tạo lại để snapshot không xung đột. Reviewer kiểm tra `dotnet ef migrations list` chạy trên DB trống.

## 2. Luật và công thức

### 2.1 Người chơi mới [Chốt]
- Tặng 100 Gold, sở hữu sẵn `rod_old` và đang dùng nó, level 1, EXP 0.

### 2.2 Ghế [Chốt]
- 20 ghế: `seat-01`..`seat-05` Tier 1, `seat-06`..`seat-10` Tier 2, `seat-11`..`seat-20` Tier 3.
- Trạng thái: `available` → `occupied` → `cooldown` (10 giây) → `available`.
- Mua vé: ghế `available`, người mua không giữ ghế nào, đủ Gold (Tier 1/2/3 = 120/70/40). Trừ Gold và mở phiên trong một transaction. Ai commit trước thắng; người sau nhận `SEAT_TAKEN`.
- Phiên kéo dài đúng 600.000 ms theo giờ Server. Hết giờ: kết thúc phiên, hủy lần câu dở.
- Kết thúc phiên vì bất kỳ lý do nào (`expired`, `left_seat`, `left_lake`, `disconnect_timeout`) → ghế vào `cooldown` 10.000 ms.
- Không hoàn vé.
- Khi giữ ghế và không trong lần câu: đi lại trong bán kính `roamRadius` của ghế (lấy từ map). [Đề xuất] Server chặn di chuyển ra ngoài bán kính (trả `PositionCorrected`); muốn bỏ ghế dùng `LeaveSeat`; `left_lake` xảy ra khi player rời phòng/đổi map.
- Mất kết nối: hủy lần câu dở ngay (`cancelled/disconnected`). Ghế giữ 120.000 ms. Vào lại trong thời gian này thì giữ ghế; quá hạn → `disconnect_timeout`. Đồng hồ 600.000 ms vẫn chạy.
- Hạn giờ (`expiresAt`, `disconnectedAt`, `cooldownUntil`) lưu trong DB để restart vẫn xử lý đúng.

### 2.3 Buff ghế [Chốt]
| Tier | rareLuck | largeLuck | lureTimeMs |
| --- | --- | --- | --- |
| 1 | 1 | 1 | 1000 |
| 2 | 0 | 1 | 500 |
| 3 | 0 | 0 | 0 |

### 2.4 Chỉ số tổng
- `strength = level.strength + rod.strength`; `atk = strength`.
- `normalHitZonePct = level + rod`; `weaknessHitZonePct = level + rod`.
- `rareLuck = level + rod + seat`; `largeLuck = min(7, level + rod + seat)`.
- Bảng level và cần: xem `fixtures/gameplay-config.v0.json`.

### 2.5 Level [Chốt]
- `expReq[n]` là EXP cần để lên level n từ n−1. Lưu `exp` tích lũy tổng. Level = level lớn nhất có tổng `expReq[2..n] ≤ exp`. Tối đa 10.
- [Đề xuất] Ở Lv10 EXP vẫn cộng vào tổng nhưng không lên thêm.

### 2.6 Lần câu
Trạng thái: `waiting` → `bite` → `minigame` → `success` | `failed`; mọi trạng thái chưa kết thúc có thể → `cancelled`.

| Bước | Quy tắc |
| --- | --- |
| CastLine | Đang giữ ghế, không có lần câu đang chạy, phiên còn hạn. [Đề xuất] Không kiểm tra thời gian còn lại |
| waiting | `waitMs = uniformInt(3000, 6000) − seat.lureTimeMs − (chumActive ? 1000 : 0)`. Server không gửi `waitMs` cho client |
| bite | Server chốt `speciesId`. Gửi `biteDeadlineAt = now + 3000`. Không gửi loài |
| HookFish | Đến trước `biteDeadlineAt` (dung sai 300 ms tính theo giờ nhận của Server) → `minigame`. Quá hạn → `failed/missed_bite` |
| minigame | Theo mục 2.7 |
| success | Random chiều dài (2.9), cộng EXP, tạo catch, cập nhật Codex, phát `CatchShown` cho phòng |
| failed | Không EXP. Chỉ owner nhận |
| cancelled | Lý do `session_expired`, `disconnected`, `left_seat`. Không EXP, không cá |

User không có lệnh hủy.

### 2.7 Minigame — thuật toán xác định (Client và Server phải cho cùng kết quả)

Đầu vào `MinigameParams`: `seed` (uint32), `durationMs`, `needlePassMs`, `greenWidth`, `yellowWidth`, `shiftMin`, `shiftMax`, `missPenaltyMs`, `fishHp`, `atk`. Mọi độ rộng/vị trí là số thực 0..1 theo chiều dài thanh.

**RNG mulberry32** (dùng phép toán uint32, kết quả double):
```
state = seed
next():
  state = (state + 0x6D2B79F5) mod 2^32
  t = state
  t = imul(t ^ (t >>> 15), t | 1)
  t ^= t + imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
```
(`imul` = nhân 32-bit lấy 32 bit thấp; C# dùng `uint` và `unchecked`.)

Giá trị tham chiếu: seed `123456789` cho 5 số đầu `0.2577907438389957, 0.9707721115555614, 0.7853280142880976, 0.20616457983851433, 0.30307188746519387`.

**Độ rộng:** `greenWidth = min(1, rarity.greenBasePct/100 × (1 + normalHitZonePct/100))`; `yellowWidth = min(greenWidth, rarity.yellowBasePct/100 × (1 + weaknessHitZonePct/100))`. Server tính rồi gửi sẵn.

**Kim:** `p(t) = phase ≤ 1 ? phase : 2 − phase`, với `phase = (t mod (2 × needlePassMs)) / needlePassMs`. t = 0 kim ở mép trái, chạy sang phải.

**Khởi tạo vùng:** `greenStart = next() × (1 − greenWidth)`; `yellowStart = greenStart + next() × (greenWidth − yellowWidth)`.

**Xử lý tap thứ k tại thời điểm tMs:**
1. `p = p(tMs)`.
2. Nếu `yellowStart ≤ p ≤ yellowStart + yellowWidth` → `weak`, `hp −= 2 × atk`. Ngược lại nếu `greenStart ≤ p ≤ greenStart + greenWidth` → `normal`, `hp −= atk`. Ngược lại → `miss`, `penaltyMs += missPenaltyMs`.
3. Dịch vùng (mọi loại tap): `shift = shiftMin + next() × (shiftMax − shiftMin)`; `dir = next() < 0.5 ? −1 : 1`; `greenStart = clamp(greenStart + dir × shift, 0, 1 − greenWidth)`; `yellowStart = greenStart + next() × (greenWidth − yellowWidth)`.
4. `hp ≤ 0` → thắng.

**Thời gian:** `remainingMs(t) = durationMs − t − penaltyMs`. Thua khi `remainingMs ≤ 0` và hp > 0.

**Xác thực tap của Server [Đề xuất, chờ GD]:** `serverElapsed = now − minigameStartedAt` (mốc Server gửi params). Nhận tap khi: `seq` = seq trước + 1; `tMs ≥ tMsTrước + 80`; `tMs ≤ serverElapsed + 300`; `tMs ≥ serverElapsed − 1500`; `remainingMs(tMs) > 0`. Tap không hợp lệ → `TAP_REJECTED`, không đổi state, không tiêu RNG. Server tự kết thúc `failed/timeout` khi `serverElapsed > durationMs − penaltyMs + 1500` mà hp > 0.

Bộ test vector: `fixtures/minigame-vectors.v0.json` (BE-B sinh và commit; CL-C dùng để kiểm tra bản TS).

### 2.8 Spawn loài [Đề xuất, chờ GD]
- Chọn rarity theo `spawn.rarityWeights` (60/25/10/4/1), rồi chọn đều trong rarity đó.
- `rareLuck` chưa tác động; config có `spawn.rareLuckMode = "none"`.

### 2.9 Chiều dài [Chốt]
- Đơn vị lưu: số nguyên 0,1 cm (`lengthTenthCm`). Config lưu `minTenthCm`, `maxTenthCm`.
- Xác suất bậc tính bằng basis point (1/10.000): Thường `7000 − 200L`, Lớn `2500 + 150L`, Rất lớn `490 + 50L`, Tối đa `10`. `L = largeLuck`.
- Vị trí: Thường `[0, 0.6)`, Lớn `[0.6, 0.9)`, Rất lớn `[0.9, 0.999]`, Tối đa `= 1`. Random đều.
- `lengthTenthCm = round(min + (max − min) × pos)` (làm tròn nửa lên).
- `isNew` = lần đầu bắt loài này. `isRecord` = không phải lần đầu và dài hơn kỷ lục cũ.

### 2.10 Thính [Chốt]
- Item `chum_basic`, giá 30 Gold, xếp chồng trong túi.
- `UseChum` chỉ khi đang giữ ghế. Đang có hiệu lực → `CHUM_ACTIVE`, không trừ. Hiệu lực tới khi phiên kết thúc. [Đề xuất] Dùng được cả khi đang trong lần câu, tác động từ lần quăng sau.

### 2.11 Shop và bán cá [Chốt + Đề xuất]
- Bán: `rod_steel_awl` 300, `rod_high_performer` 300, `rod_bliss` 800, `rod_giant_caster` 2000, `chum_basic` 30. Cần đã có → `ROD_ALREADY_OWNED`.
- Bán cá theo `catchId` hoặc `all: true`; giá theo loài. Cá đã bán không còn trong túi; Codex/kỷ lục không đổi.
- [Đề xuất] Đổi cần chỉ khi không trong lần câu; túi chưa giới hạn.

## 3. Contract HTTP (base `/api/v1`)

Quy ước giữ từ 0.1-draft: JSON camelCase; Gold là chuỗi số nguyên (`"100"`); thời gian ISO-8601 UTC; thành công `{ "data": ..., "traceId": "..." }`; lỗi `{ "error": { "code", "message", "retryable" }, "traceId" }`. Mọi request thay đổi tài nguyên gửi header `Idempotency-Key: <uuid>`; cùng key cùng payload trả kết quả cũ; khác payload → 409 `IDEMPOTENCY_CONFLICT`.

| Method / path | Request | Response `data` | Nhóm |
| --- | --- | --- | --- |
| POST /auth/login | `{ firebaseIdToken }` | `{ accessToken, expiresAt, isNew, player: PlayerProfile }` | BE-A |
| POST /auth/refresh | cookie refresh | `{ accessToken, expiresAt }` | BE-A |
| POST /auth/logout | — | 204 | BE-A |
| GET /me | — | `PlayerProfile` | BE-A |
| PUT /me/display-name | `{ displayName }` (3-16 ký tự) | `PlayerProfile` | BE-A |
| GET /catalog | — | `{ configVersion, levels, rods, fish (không có spawn), seatTiers, chum, minigame, shopOffers }` | BE-A |
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
| BuySeatTicket | `{ requestId, seatId }` | `{ session: MySeatSession, gold }` | BE-C |
| LeaveSeat | `{ requestId }` | null | BE-C |
| UseChum | `{ requestId }` | `{ chumActive: true, chumQuantity }` | BE-D (gọi qua BE-C session) |
| CastLine | `{ requestId }` | `{ attemptId }` | BE-E |
| HookFish | `{ requestId, attemptId }` | null | BE-E |
| MinigameTap | `{ requestId, attemptId, seq, tMs }` | `{ result: "normal"\|"weak"\|"miss", hp, remainingMs }` | BE-E |
| SendChat | `{ requestId, text }` | null | BE-F |
| SendEmoji | `{ requestId, emojiId }` | null | BE-F |

| Event | Gửi cho | Payload |
| --- | --- | --- |
| LakeSnapshot | caller | `{ mapId, mapVersion, configVersion, serverTime, players: [PlayerView], seats: [SeatView], mySession: MySeatSession \| null, myAttempt: AttemptView \| null }` |
| PlayerJoined / PlayerLeft | phòng | `PlayerView` / `{ playerId }` |
| PlayerMoved | phòng trừ người gửi | `{ playerId, x, y, dir, seq }` |
| PositionCorrected | người gửi | `{ x, y, seq }` |
| SeatChanged | phòng | `SeatView` |
| MySeatSession | owner | `MySeatSession` hoặc `{ seatId, ended: true, reason }` |
| AttemptUpdate | owner | `AttemptView` |
| CatchShown | phòng | `{ playerId, speciesId, rarity, shownUntil }` |
| SkinChanged | phòng | `{ playerId, skinId }` |
| ChatReceived / EmojiReceived | phòng | `{ messageId, playerId, text }` / `{ playerId, emojiId }` |

- `PlayerView = { playerId, displayName, skinId, rodId, x, y, dir, seatId | null, fishing: bool }`
- `SeatView = { seatId, tier, state: "available"|"occupied"|"cooldown", occupantPlayerId | null, expiresAt | null, cooldownUntil | null }`
- `MySeatSession = { seatId, tier, startedAt, expiresAt, chumActive }`
- `AttemptView = { attemptId, phase, reason | null, biteDeadlineAt | null, minigame: MinigameParams & { startedAt } | null, state: { hp, remainingMs, tapSeq } | null, result: { speciesId, rarity, lengthTenthCm, isNew, isRecord, expGained, level, levelUp } | null }`

## 5. Mã lỗi

| Code | Khi nào |
| --- | --- |
| UNAUTHENTICATED, SESSION_EXPIRED | Token thiếu/sai/hết hạn |
| VALIDATION_FAILED | Tham số sai kiểu, ngoài khoảng |
| IDEMPOTENCY_CONFLICT | Cùng key khác payload |
| RATE_LIMITED | Gửi quá nhanh |
| SEAT_TAKEN | Ghế đang có người (UI: "ghế đang được sử dụng") |
| SEAT_COOLDOWN | Ghế đang cooldown |
| ALREADY_HAS_SEAT | Player đã giữ ghế khác |
| NOT_IN_SEAT | Lệnh cần giữ ghế |
| OUT_OF_RANGE | Di chuyển ra ngoài phạm vi cho phép |
| INSUFFICIENT_GOLD | Thiếu Gold |
| ATTEMPT_ACTIVE | Đã có lần câu đang chạy |
| NO_ACTIVE_ATTEMPT | attemptId không phải lần câu đang chạy |
| BITE_EXPIRED | HookFish quá hạn |
| TAP_REJECTED | Tap không qua xác thực |
| CHUM_ACTIVE, NO_CHUM | Thính đang có hiệu lực / hết thính |
| ROD_NOT_OWNED, ROD_ALREADY_OWNED | Cần chưa có / đã có |
| FISH_NOT_FOUND | catchId không thuộc user hoặc đã bán |
| STATE_CONFLICT | Trạng thái không cho phép (tên trùng, phòng đầy, sửa đồng thời) |

## 6. Interface giữa các module Server

Để các nhóm BE làm song song, mỗi nhóm code theo interface sau; nhóm chủ triển khai thật, nhóm khác dùng bản giả trong test.

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
  Task<SeatSessionInfo?> GetActiveAsync(Guid playerId, CancellationToken ct); // seatId, tier, expiresAt, chumActive
  Task SetChumActiveAsync(Guid playerId, CancellationToken ct);
  event Func<SeatSessionEnded, Task> SessionEnded; // BE-E hủy lần câu khi nhận
  event Func<Guid, Task> PlayerDisconnected;
}

// BE-E
public interface IFishingState { bool IsBusy(Guid playerId); } // đang có lần câu chưa kết thúc

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
| `fixtures/minigame-vectors.v0.json` | Chuỗi tap → kết quả, sinh từ bản C# | BE-B |

## 8. Lịch sử thay đổi

| Phiên bản | Ngày | Mục | Nội dung | Nhóm bị ảnh hưởng |
| --- | --- | --- | --- | --- |
| 0.2 | 2026-11-09 | Toàn bộ | Bản đầu, tổng hợp từ GAMEPLAY_SCOPE (Phaser + TS) | Tất cả |
