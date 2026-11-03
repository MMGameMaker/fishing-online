# HTTP / SignalR 0.1-draft

Chủ nguồn: Codex BE. **Đề xuất, chưa được Client/GD xác nhận**. Dùng chung S01–S13/A01–A06, không có loot/payment API. Ngoại trừ mục “Đang chạy”, tất cả route/method/event bên dưới chưa triển khai. Đây là contract outline cho từng lát; schema phase câu, config và ranking phải hoàn thiện sau đầu vào GD trước khi code/tích hợp.

## Đang chạy trong scaffold

| Endpoint | Auth | Response |
| --- | --- | --- |
| GET /health/live | Public | 200 `{ "status":"alive" }` |
| GET /health/ready | Public | 200 `{ "status":"ready", "checks":{"postgres":"ready","redis":"ready"} }`; 503 khi thiếu config/schema/migration hoặc dependency lỗi, check tương ứng là `notReady`; không trả lỗi nội bộ |
| GET /api/v1/bootstrap | Public | 200 `{ "contractVersion":"0.1-draft", "mode":"transport-only", "gameplayAvailable":false, "hubPath":"/hubs/game" }` |
| /hubs/game → Ping() | Development only, diagnostic | `{ "contractVersion":"0.1-draft", "serverTime":"ISO-8601 UTC" }` |

## Quy ước mục tiêu

- Base `/api/v1`, hub `/hubs/game`, JSON camelCase, enum string; Player/Admin bearer token. Identity lấy từ session; không nhận actorId tự khai. Player API tự giới hạn chủ sở hữu; Admin có policy phía Server.
- UUID biểu diễn string; seatId opaque string khớp map fixture, không dùng index UI. Gold/Gem truyền chuỗi số nguyên (`"100"`), cân nặng `weightGrams` nguyên; timestamp ISO-8601 UTC. Position x/y số hữu hạn, hệ tọa độ và speed limit chờ Client chốt. Count/seq/version là integer an toàn JavaScript.
- Response mục tiêu `{data,traceId}`; lỗi HTTP `{error:{code,message,retryable},traceId}`. Null phải khai báo rõ; không dùng field vắng để ngầm xóa state. Collection `{items:[],nextCursor:null}`; limit mặc định 20, max 100; cursor opaque, thứ tự ổn định gồm ID tie-break.
- Mutation cần `Idempotency-Key: UUID`; hub command có `requestId`. Scope key user + operation, hash payload; cùng key/cùng payload trả kết quả cũ, khác payload → `IDEMPOTENCY_CONFLICT`. Client timeout là chưa rõ kết quả, giữ key để tra receipt/gửi lại. Tài nguyên receipt bền vững; social dedupe retention sẽ chốt theo chính sách lưu.
- 400 VALIDATION_FAILED; 401 UNAUTHENTICATED/SESSION_EXPIRED; 403 FORBIDDEN; 404 NOT_FOUND; 409 SEAT_TAKEN/STATE_CONFLICT/IDEMPOTENCY_CONFLICT/CONFIG_CHANGED; 422 INSUFFICIENT_GOLD/NO_TICKETS/NO_BAIT/INVALID_LOADOUT/SKIN_NOT_OWNED; 429 RATE_LIMITED kèm Retry-After; 503 SERVICE_NOT_READY. Retry 5xx/timeout có backoff và giữ key. Error message không dùng làm mã điều khiển UI.

## API Player dự kiến

Tất cả cần Player trừ login; GET không thay state. Mutation dùng key như trên. Payload sau dấu → là data response, không gồm wrapper.

| Method / path | Request → response | ID |
| --- | --- | --- |
| POST /auth/login | Provider credential theo phương án chưa chốt → accessToken, expiresAt, player; không nhận role | S02 |
| POST /auth/refresh; POST /auth/logout | Refresh/session credential theo thiết kế S02 → token mới / 204 revoke | S02 |
| GET /me | → PlayerProfile{id,displayName,selectedSkinId,inventoryVersion,walletVersion} | S02 |
| GET /rooms | → page RoomSummary{id,mapId,playerCount,capacity:20} | S03 |
| GET /rooms/{roomId}/snapshot | → RoomSnapshot (bên dưới), cần membership | S03 |
| GET /catalog | → configVersion, item/skin/emoji definitions và map version; schema chuyên biệt cần chốt | S01/S04/S13 |
| GET /me/inventory | → inventoryVersion, stacks[{itemId,quantity}], loadout{rodId,lineId,hookId,baitId}, chumEffects[] | S04 |
| GET /me/wallet | → walletVersion,gold:string,tickets:integer; Gem chỉ khi có use case duyệt | S04 |
| GET /shop | → configVersion,offers[{offerId,itemId,quantity,goldPrice:string}] | S04 |
| POST /shop/purchases | {offerId,quantity,expectedConfigVersion} → orderId,wallet,inventory | S04 |
| PUT /me/loadout | {rodId,lineId,hookId,baitId,expectedInventoryVersion} → inventory/loadout mới | S04 |
| POST /me/chum-uses | {itemId,expectedInventoryVersion} → effect và inventory mới; phạm vi/expiry theo GD | S04 |
| GET /me/attempts/{attemptId} | → AttemptSnapshot; owner only | S05/S06 |
| GET /me/commands/{requestId} | → {status:pending/completed/rejected,result,error}; 404 khi chưa thấy, không suy ra chưa commit | S04–S06 |
| GET /me/history?cursor=&limit= | → page {attemptId,outcome,catchId:null/string,speciesId:null/string,weightGrams:null/integer,endedAt,configVersion} | S08 |
| GET /me/achievements | → totalCatch,speciesCount,records[{speciesId,maxWeightGrams,catchId}] | S08 |
| GET /me/skins; PUT /me/skin | → ownedSkinIds,selectedSkinId; PUT {skinId} → selectedSkinId | S13 |
| GET /rankings/{boardId}?cursor=&limit= | → boardId,metric,periodId,updatedAt,page; entry{rank,playerId,displayName,value:string}; metric/tie chưa chốt | S12 |

Định nghĩa quantity phải >0 và giới hạn theo config; không gửi giá/cá/phần thưởng. Schema API auth là điểm mở, không hướng dẫn Client giả lập token như tích hợp thật.

## Hub mục tiêu và snapshot

Đăng ký listener trước `start()`. Tất cả method dưới đây cần Player và quyền phòng tương ứng, trả `CommandAck {requestId,status:accepted/rejected,roomRevision:null/integer,error:null/{code,message,retryable}}`. accepted chỉ nghĩa command được nhận; attempt hoàn tất qua snapshot/event, không tự cộng tiền từ ack.

| Method | Argument | Event sau xử lý |
| --- | --- | --- |
| JoinRoom | {requestId,roomId} | RoomSnapshot (caller), PlayerJoined (room) |
| LeaveRoom | {requestId,roomId} | PlayerLeft/SeatChanged; xử lý attempt chờ GD |
| GetSnapshot | {requestId,roomId} | RoomSnapshot (caller) |
| Move | {requestId,inputSeq,x,y} | PlayerMoved; xác minh membership/speed/walkable |
| TakeSeat; ReleaseSeat | {requestId,seatId}; {requestId} | SeatChanged; một player một seat |
| StartFishing | {requestId,mode:"Idle"/"Manual"} | AttemptChanged; không nhận species/reward |
| FishingInput | {requestId,attemptId,inputSeq,action,value} | AttemptChanged; action/value chờ phase GD |
| CancelFishing | {requestId,attemptId} | AttemptChanged; refund/cancel chưa chốt |
| SendChat | {requestId,text} | ChatReceived; giới hạn text/rate chốt trước S11 |
| SendEmoji | {requestId,emojiId} | EmojiReceived; allowlist |
| ShowcaseCatch | {requestId,catchId} | CatchShowcased từ dữ liệu Server; owner only |

Event mục tiêu `{eventId,type,roomId,roomRevision,occurredAt,payload}`. Snapshot là dữ liệu đầy đủ ở revision R; event phòng áp dụng tuần tự R+1, bỏ event trùng/cũ, gap thì dừng áp delta và lấy snapshot. Event riêng người chơi có stream/version riêng, không tạo gap giả cho phòng; wallet/inventory dùng version của chúng. Một command có thể phát nhiều stream; không giả định event đến trước/sau HTTP response.

`RoomSnapshot {roomId,mapId,mapVersion,configVersion,roomRevision,players:[{playerId,displayName,skinId,x,y,seatId:null/string}],seats:[{seatId,occupantPlayerId:null/string}],myAttempt:null/AttemptSnapshot}`. Fixture 20 seat ID chờ map Client, không tự khóa tọa độ.

`AttemptSnapshot {attemptId,mode,phase,configVersion,version,deadlineAt:null/string,outcome:null/string,catch:null/{catchId,speciesId,weightGrams,rarity}}`. Enum phase/outcome và cadence Idle chờ GD; không tự lặp StartFishing khi nhận result.

Payload tối thiểu: PlayerJoined = player snapshot; PlayerLeft = {playerId}; PlayerMoved = {playerId,x,y,inputSeq}; SeatChanged = {seatId,occupantPlayerId}; SkinChanged = {playerId,skinId}; AttemptChanged = AttemptSnapshot (chỉ owner nhận chi tiết); ChatReceived = {messageId,playerId,text}; EmojiReceived = {playerId,emojiId}; CatchShowcased = {messageId,playerId,catchId,speciesId,weightGrams}. Server không đưa số dư/token người khác vào room broadcast.

## Admin API mục tiêu

Auth chung S02 nhưng policy riêng, không tin quyền từ React. Mọi mutation key + audit actor/server time/before/after/version.

| Method / path | Quyền | Request / response |
| --- | --- | --- |
| GET /admin/config/versions; GET /admin/config/drafts/{id} | config.read | Metadata/page và draft version |
| POST /admin/config/drafts | config.write | {baseVersion} → draftId,revision |
| PUT /admin/config/drafts/{id} | config.write | {expectedRevision,document} → revision; document schema chờ GD |
| POST /admin/config/drafts/{id}/validate | config.write | {expectedRevision} → valid,errors[{path,code,message}] |
| POST /admin/config/drafts/{id}/publish | config.publish | {expectedRevision,expectedActiveVersion} → configVersion; validate lại trong publish |
| GET /admin/players/{id}; /inventory; /wallet; /history; /ledger | player.read | Detail hoặc page; không endpoint chỉnh tiền |
| GET /admin/rooms; GET /admin/rooms/{id} | room.read | Page/snapshot vận hành |
| GET /admin/audit?cursor=&limit= | audit.read | Page audit records |
| GET /admin/social/events; GET /admin/rankings/{id} | social.read/ranking.read | Tra cứu evidence/catch/projected score; mức mute/report chờ A06 |

Rollback config tạo version publish mới từ version cũ, không sửa lịch sử; attempt đang chạy vẫn giữ config đã pin. Validate map đủ 20 seat, reference cá/item/skin, weight min/max, nonnegative probability, compatibility và thính; không coi config draft là luật được GD duyệt.

## Fixture review tối thiểu

```json
{"data":{"items":[],"nextCursor":null},"traceId":"fixture-empty"}
```
```json
{"error":{"code":"SEAT_TAKEN","message":"Seat is occupied","retryable":false},"traceId":"fixture-seat-conflict"}
```
```json
{"requestId":"00000000-0000-4000-8000-000000000001","status":"rejected","roomRevision":12,"error":{"code":"NO_TICKETS","message":"No tickets available","retryable":false}}
```

Trước tích hợp mỗi lát bổ sung schema máy đọc được + fixture login/20 seats/success/retry/reconnect theo quyết định đã chốt. Hiện chưa có OpenAPI gameplay hay fixture map đã được hai bên xác nhận. Thay đổi draft cần BE cập nhật nguồn này và Client/Admin cập nhật adapter/mock; không gọi draft là API đã chạy.
