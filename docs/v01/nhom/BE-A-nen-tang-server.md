# BE-A — Nền tảng Server

Mục tiêu: các module khác có sẵn đăng nhập, ví Gold, chống xử lý trùng, config và khung module để cắm vào.
Đọc trước: [SPEC_CHUNG](../SPEC_CHUNG.md) mục 1, 3, 5, 6; [ACCOUNT_AUTH](../../be/ACCOUNT_AUTH.md).
Phạm vi file: `server/FishingOnline.Api/Modules/{Identity,Wallet,Config,Common}`, `Program.cs`, migration `BEA_*`, test trong `server/FishingOnline.Api.Tests/` (tạo mới nếu chưa có).
Độc lập với: mọi nhóm khác. Nhóm khác chỉ cần interface ở SPEC_CHUNG mục 6.

---

### BE-A-01 Khung module, envelope, lỗi, project test
- **Độ lớn:** M. **Phụ thuộc:** không.
- **Spec:**
  - Tạo `Modules/Common`: `ApiResult` trả `{data, traceId}`; middleware bắt `GameException(code, httpStatus, retryable)` → `{error:{code,message,retryable}, traceId}`. `traceId` = `Activity.Current.TraceId`.
  - Bảng ánh xạ mã lỗi → HTTP: 400 VALIDATION_FAILED; 401 UNAUTHENTICATED/SESSION_EXPIRED; 404 FISH_NOT_FOUND; 409 SEAT_TAKEN, SEAT_COOLDOWN, ALREADY_HAS_SEAT, ATTEMPT_ACTIVE, IDEMPOTENCY_CONFLICT, ROD_ALREADY_OWNED; 422 INSUFFICIENT_GOLD, ROD_NOT_OWNED, NOT_IN_SEAT; 429 RATE_LIMITED.
  - Hub: `CommandAck` helper; ngoại lệ `GameException` trong hub method → ack `ok=false`.
  - Quy ước module: mỗi module có `XModule.cs` với `AddX(IServiceCollection)` và `MapX(WebApplication)`. `GameDbContext` gọi `ApplyConfigurationsFromAssembly`.
  - Hub chính `GameHub` ở `/hubs/game` dạng partial class; mỗi module thêm file `GameHub.<Module>.cs`. Thay DiagnosticHub (giữ Ping cho Development).
  - Tạo `server/FishingOnline.Api.Tests` (xUnit + `WebApplicationFactory` + Testcontainers PostgreSQL hoặc DB thử theo cách của IntegrationChecks).
- **Nghiệm thu:** endpoint thử ném `GameException("SEAT_TAKEN")` trả 409 đúng JSON; hub method thử trả ack lỗi; `dotnet test` chạy được trên máy sạch có Docker.

### BE-A-02 Đăng nhập Firebase và phiên
- **Độ lớn:** L. **Phụ thuộc:** BE-A-01; Firebase project dev (người dùng tạo, secret ngoài repo).
- **Spec:**
  - `POST /auth/login {firebaseIdToken}`: xác minh bằng Firebase Admin SDK (hoặc JWKS của Google: issuer `https://securetoken.google.com/<projectId>`, audience `<projectId>`). Bảng `accounts(accountId, firebaseProjectId, firebaseUid, playerId, provider, status, authVersion, createdAt)` unique(projectId,uid).
  - Lần đầu: tạo `players` + `accounts` + ví (BE-A-03) + gọi `INewPlayerGrant` (BE-D triển khai cấp cần mặc định; BE-A cấp 100 Gold qua ledger `grant_new_player`) trong **một transaction**. `isNew=true`.
  - Phát access token JWT ký HS256/RS256 của server, sống 10 phút Player (config, mặc định M0 đã duyệt theo ACCOUNT_AUTH), claim `sub=accountId`, `playerId`, `sid`, `authVersion`, `aud=player`. Refresh token: chuỗi ngẫu nhiên 32 byte, lưu hash trong `sessions`, gửi cookie `HttpOnly; Secure; SameSite=Lax`, sống 7 ngày hoặc30 ngày Remember me, xoay vòng mỗi lần refresh; kiểm tra session/revocation theo ACCOUNT_AUTH.
  - `POST /auth/refresh`, `POST /auth/logout` (revoke session).
  - Hub: đọc token từ query `access_token`. `ICurrentPlayer` lấy từ claim.
  - Môi trường Development có cờ `Auth:DevBypass` cho test tự động: header `X-Dev-Player: <uuid>`; **tắt mặc định**, không bao giờ bật ngoài Development.
- **Không làm:** Facebook, Admin login.
- **Nghiệm thu:** token Firebase sai → 401; hai lần login cùng UID → cùng playerId, chỉ 1 lần tặng Gold; refresh token cũ sau xoay vòng → 401; logout xong refresh → 401; hub không token bị từ chối.

### BE-A-03 Ví Gold và ledger
- **Độ lớn:** M. **Phụ thuộc:** BE-A-01.
- **Spec:**
  - Bảng `wallets(playerId PK, gold bigint check ≥ 0, version int)`, `ledger_entries(id, playerId, delta bigint, balanceAfter, reason, refId, createdAt)` chỉ thêm.
  - Triển khai `IWallet` (SPEC mục 6). Debit khóa hàng (`SELECT ... FOR UPDATE`), thiếu → `InsufficientGoldException` → mã `INSUFFICIENT_GOLD`.
  - `reason` thuộc tập: `grant_new_player`, `seat_purchase`, `seat_extension`, `buy_rod`, `sell_fish`, `admin_adjust` (để dành).
  - Caller tự mở transaction; IWallet dùng chung DbContext.
- **Nghiệm thu:** 50 debit song song 10 Gold trên ví 100 → đúng 10 thành công, số dư 0, không âm; tổng `delta` của ledger = số dư; rollback của caller thì ledger cũng không còn.

### BE-A-04 Idempotency
- **Độ lớn:** S. **Phụ thuộc:** BE-A-01.
- **Spec:** bảng `idempotency_receipts(playerId, operation, key, payloadHash, statusCode, responseJson, createdAt)` unique `(playerId, operation, key)`. Filter HTTP đọc header `Idempotency-Key` cho route có attribute `[Idempotent("op")]`; thiếu header → 400. Hub dùng `requestId` làm key qua `IIdempotency.RunAsync`. Receipt ghi trong cùng transaction với nghiệp vụ. Giữ 7 ngày (job dọn).
- **Nghiệm thu:** gửi 2 lần cùng key cùng body → response giống hệt, chỉ 1 dòng ledger; cùng key khác body → 409 `IDEMPOTENCY_CONFLICT`; 2 request cùng key song song → 1 thực thi.

### BE-A-05 Config gameplay
- **Độ lớn:** M. **Phụ thuộc:** BE-A-01, BE-B-01 (record `GameplayConfig`; việc S, làm sớm).
- **Spec:**
  - Dùng record `GameplayConfig` của BE-B-01, ánh xạ đúng `docs/v01/fixtures/gameplay-config.v0.json`. Validator: 10 level, tổng expReq 1850, đúng 1 cần mặc định, 9 loài có min ≤ max, tổng bp bậc chiều dài với L = 0..7 luôn = 10000, rarity trong minigame đủ 5, ghế đủ 20 số.
  - Bảng `config_versions(version PK, json, publishedAt, publishedBy, isActive)`. Khi khởi động: nếu bảng trống, nạp file fixture làm version đầu.
  - `IConfigProvider.Current` cache trong bộ nhớ; `Get(version)` cho lần câu đã pin.
  - `GET /catalog`: trả config bỏ khối `spawn`.
- **Nghiệm thu:** config sai (ví dụ thiếu loài) bị từ chối với danh sách lỗi; `/catalog` không chứa `spawn`; test so khớp số với fixture.

### BE-A-06 Hồ sơ người chơi
- **Độ lớn:** S. **Phụ thuộc:** BE-A-02, BE-A-03.
- **Spec:** mở rộng `players`: `level int default 1`, `exp int default 0`, `selectedSkinId`, `equippedRodId`. `GET /me` trả `PlayerProfile`. `PUT /me/display-name` 3-16 ký tự, chữ/số/khoảng trắng/gạch dưới, không trùng (so không phân biệt hoa thường).
- **Nghiệm thu:** tên 2 ký tự → 400; tên trùng → 409 `STATE_CONFLICT`; `/me` khớp mẫu `api-samples.v0.json`.
